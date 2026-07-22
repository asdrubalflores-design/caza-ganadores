// ===================================================================
// CONECTOR REAL: BIBLIOTECA DE ANUNCIOS DE META (Filtro 3)
// -------------------------------------------------------------------
// Abre un navegador automatico (Playwright), entra a la Biblioteca de
// Anuncios PUBLICA de Meta filtrada por Mexico, busca la FRASE EXACTA
// de un producto y cuenta cuantos anuncios activos hay.
//
// IMPORTANTE — Meta limita las consultas automaticas seguidas. Por eso:
//   • Se consulta DESPACIO, un termino a la vez, con pausas.
//   • Los resultados se GUARDAN en cache (config/cache-meta.json) para
//     no volver a molestar a Meta y que el tablero lea al instante.
//   • Si Meta bloquea, se reintenta y, si no, se avisa sin romper nada.
// ===================================================================

import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, "..", "..", "config");
const ARCHIVO_CACHE = join(CONFIG_DIR, "cache-meta.json");

// URL de la Biblioteca de Anuncios para Mexico (MX), frase exacta.
function urlBiblioteca(termino) {
  const p = new URLSearchParams({
    active_status: "all",
    ad_type: "all",
    country: "MX",
    q: termino,
    search_type: "keyword_exact_phrase",
    media_type: "all",
  });
  return `https://www.facebook.com/ads/library/?${p.toString()}`;
}

// Cierra el aviso de cookies (en español o inglés).
async function cerrarCookies(page) {
  const textos = [
    "Permitir todas las cookies",
    "Allow all cookies",
    "Rechazar cookies opcionales",
    "Decline optional cookies",
  ];
  for (const t of textos) {
    try {
      const btn = page.getByRole("button", { name: t });
      if (await btn.first().isVisible({ timeout: 1200 })) {
        await btn.first().click({ timeout: 2000 });
        return;
      }
    } catch {
      /* seguir */
    }
  }
}

// Extrae el numero de "X resultados" del texto de la pagina.
function extraerTotal(texto) {
  const m = texto.match(/([\d.,]+)\s*(resultados?|results?)\b/i);
  if (m) return parseInt(m[1].replace(/[.,]/g, ""), 10);
  if (/no hay anuncios|no se encontraron|0 resultados|0 results/i.test(texto)) return 0;
  return null;
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Consulta UNA vez la Biblioteca de Anuncios (sin cache).
 * @returns {Promise<{ok, total, anunciantes, muestra, aviso?}>}
 */
export async function consultarMeta(termino, opciones = {}) {
  const navegador = await chromium.launch({
    headless: opciones.visible ? false : true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  try {
    const contexto = await navegador.newContext({
      locale: "es-MX",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 900 },
    });
    const page = await contexto.newPage();

    let total = null;
    let texto = "";
    // Hasta 2 intentos: a veces Meta tarda o sirve el cascaron vacio.
    for (let intento = 1; intento <= 2 && total === null; intento++) {
      await page.goto(urlBiblioteca(termino), { waitUntil: "domcontentloaded", timeout: 45000 });
      if (intento === 1) await cerrarCookies(page);

      // Esperar a que aparezca el conteo (numero + "resultados").
      try {
        await page.waitForFunction(
          () => /[\d.,]+\s*resultados?\b|no hay anuncios|no se encontraron/i.test(document.body.innerText || ""),
          { timeout: 22000 }
        );
      } catch {
        // empujar la carga con un scroll y esperar otro poco
        await page.mouse.wheel(0, 1200).catch(() => {});
        await pausa(4000);
      }
      texto = await page.evaluate(() => document.body.innerText || "");
      total = extraerTotal(texto);
      if (total === null && intento === 1) await pausa(3000); // respiro antes de reintentar
    }

    // Anunciantes (aproximacion): nombres de paginas en los enlaces de los anuncios.
    const nombres = await page.evaluate(() => {
      const set = new Set();
      document.querySelectorAll('a[href*="facebook.com/"]').forEach((a) => {
        const t = (a.textContent || "").trim();
        if (t && t.length > 1 && t.length < 60 && !/biblioteca|informe|condiciones|privacidad|cookies/i.test(t))
          set.add(t);
      });
      return Array.from(set).slice(0, 20);
    });

    const bloqueado = total === null;
    return {
      ok: true,
      termino,
      total,
      anunciantes: nombres.length,
      muestra: nombres.slice(0, 6),
      aviso: bloqueado ? "Meta no cargo los resultados (posible limite temporal). Reintenta mas tarde." : null,
    };
  } catch (err) {
    return { ok: false, termino, total: null, error: String(err.message || err) };
  } finally {
    await navegador.close();
  }
}

// ---------------------------------------------------------------
// CACHE en disco
// ---------------------------------------------------------------
export async function leerCacheMeta() {
  try {
    return JSON.parse(await readFile(ARCHIVO_CACHE, "utf-8"));
  } catch {
    return {};
  }
}
async function guardarCacheMeta(cache) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(ARCHIVO_CACHE, JSON.stringify(cache, null, 2), "utf-8");
}

/**
 * Consulta varios terminos DESPACIO (con pausas) y guarda en cache.
 * Pensado para correr en segundo plano. Llama onProgress por cada uno.
 */
export async function actualizarMeta(terminos, onProgress = () => {}) {
  const cache = await leerCacheMeta();
  for (let i = 0; i < terminos.length; i++) {
    const termino = terminos[i];
    const r = await consultarMeta(termino);
    cache[termino.toLowerCase()] = {
      total: r.total,
      anunciantes: r.anunciantes,
      muestra: r.muestra || [],
      aviso: r.aviso || null,
      actualizado: new Date().toISOString(),
    };
    await guardarCacheMeta(cache);
    onProgress({ i: i + 1, n: terminos.length, termino, resultado: cache[termino.toLowerCase()] });
    // Pausa entre consultas para no provocar el limite de Meta (8-14s).
    if (i < terminos.length - 1) await pausa(8000 + Math.floor(Math.random() * 6000));
  }
  return cache;
}

// --- Prueba directa: node src/sources/metaReal.js "frase exacta" ---
const ejecutadoDirecto = process.argv[1] && process.argv[1].endsWith("metaReal.js");
if (ejecutadoDirecto) {
  const termino = process.argv.slice(2).join(" ") || "masajeador cervical";
  console.log(`Consultando Biblioteca de Anuncios (MX): "${termino}"...`);
  consultarMeta(termino).then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  });
}
