// ===================================================================
// SERVIDOR: enciende la app y conecta el cerebro con la pantalla.
// -------------------------------------------------------------------
// Usa SOLO lo que Node.js ya trae incluido (sin instalar nada).
// Esto evita el problema de Google Drive con node_modules.
//
// Al ejecutar `npm start`, abre un sitio local en tu navegador
// donde veras el tablero de productos ganadores.
// ===================================================================

import { createServer } from "http";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join, extname, normalize } from "path";
import { buscarGanadores, CONFIG } from "./src/engine/crossReference.js";
import {
  estadoConexion,
  guardarCredenciales,
  urlPermiso,
  conectarConCodigo,
} from "./src/auth/mercadolibreAuth.js";
import { actualizarMeta, leerCacheMeta } from "./src/sources/metaReal.js";
import { sampleProducts } from "./src/data/sampleProducts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const PORT = 3000;

// Estado del trabajo "Actualizar Meta" (corre en segundo plano, despacio).
const progresoMeta = { corriendo: false, hecho: 0, total: 0, ultimo: null, terminadoEn: null };

function lanzarActualizacionMeta() {
  if (progresoMeta.corriendo) return;
  const terminos = sampleProducts.map((p) => p.nombre);
  progresoMeta.corriendo = true;
  progresoMeta.hecho = 0;
  progresoMeta.total = terminos.length;
  progresoMeta.terminadoEn = null;
  actualizarMeta(terminos, ({ i, n, termino, resultado }) => {
    progresoMeta.hecho = i;
    progresoMeta.total = n;
    progresoMeta.ultimo = { termino, total: resultado.total, aviso: resultado.aviso };
  })
    .then(() => {
      progresoMeta.corriendo = false;
      progresoMeta.terminadoEn = new Date().toISOString();
    })
    .catch((e) => {
      progresoMeta.corriendo = false;
      progresoMeta.ultimo = { error: String(e.message || e) };
    });
}

// Lee el cuerpo (body) de una peticion POST y lo devuelve como objeto.
function leerBody(req) {
  return new Promise((resolve) => {
    let datos = "";
    req.on("data", (c) => (datos += c));
    req.on("end", () => {
      try {
        resolve(datos ? JSON.parse(datos) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function responderJSON(res, codigo, objeto) {
  res.writeHead(codigo, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(objeto));
}

// Tipos de archivo que sabemos servir.
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // ---- API: la pantalla pide los productos ganadores ----
    if (url.pathname === "/api/ganadores") {
      const query = url.searchParams.get("q") || "";
      const productos = await buscarGanadores(query);
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ ok: true, total: productos.length, config: CONFIG, productos }));
      return;
    }

    // ---- API: estado de la conexion con Mercado Libre ----
    if (url.pathname === "/api/ml/estado") {
      return responderJSON(res, 200, { ok: true, ...(await estadoConexion()) });
    }

    // ---- API: guardar las llaves (App ID + Client Secret) ----
    if (url.pathname === "/api/ml/credenciales" && req.method === "POST") {
      const body = await leerBody(req);
      const cred = await guardarCredenciales(body);
      return responderJSON(res, 200, { ok: true, appIdParcial: cred.appId.slice(0, 4) + "…" });
    }

    // ---- API: obtener el enlace de permiso ----
    if (url.pathname === "/api/ml/url-permiso") {
      try {
        return responderJSON(res, 200, { ok: true, url: await urlPermiso() });
      } catch (e) {
        return responderJSON(res, 400, { ok: false, error: String(e.message) });
      }
    }

    // ---- API: conectar con el codigo/URL que pego el usuario ----
    if (url.pathname === "/api/ml/conectar" && req.method === "POST") {
      const body = await leerBody(req);
      try {
        const r = await conectarConCodigo(body.texto);
        return responderJSON(res, 200, { ok: true, userId: r.userId });
      } catch (e) {
        return responderJSON(res, 400, { ok: false, error: String(e.message) });
      }
    }

    // ---- API: iniciar la actualizacion de Meta (segundo plano, despacio) ----
    if (url.pathname === "/api/meta/actualizar" && req.method === "POST") {
      lanzarActualizacionMeta();
      return responderJSON(res, 200, { ok: true, iniciado: true });
    }

    // ---- API: progreso + resumen del cache de Meta ----
    if (url.pathname === "/api/meta/estado") {
      const cache = await leerCacheMeta();
      const enCache = Object.keys(cache).length;
      return responderJSON(res, 200, { ok: true, progreso: progresoMeta, enCache });
    }

    // ---- Archivos de la pantalla (carpeta /public) ----
    let ruta = url.pathname === "/" ? "/index.html" : url.pathname;
    // Seguridad basica: no dejar salir de /public
    const archivo = normalize(join(PUBLIC_DIR, ruta));
    if (!archivo.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end("Prohibido");
      return;
    }

    const contenido = await readFile(archivo);
    const tipo = MIME[extname(archivo).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": tipo });
    res.end(contenido);
  } catch (err) {
    if (err.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("No encontrado");
    } else {
      console.error("Error en el servidor:", err);
      res.writeHead(500, { "Content-Type": MIME[".json"] });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
  }
});

server.listen(PORT, () => {
  console.log("");
  console.log("  ====================================================");
  console.log("   🏆  CAZA-GANADORES esta corriendo");
  console.log(`   👉  Abre en tu navegador:  http://localhost:${PORT}`);
  console.log("   (para detenerlo: presiona Ctrl + C en esta ventana)");
  console.log("  ====================================================");
  console.log("");
});
