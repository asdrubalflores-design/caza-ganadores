// ===================================================================
// CONEXION CON MERCADO LIBRE (el "apreton de manos" / OAuth)
// -------------------------------------------------------------------
// Maneja:
//   1) Guardar tus llaves (App ID + Client Secret)
//   2) Construir el enlace donde TU das permiso una sola vez
//   3) Cambiar el "codigo" que devuelve M.Libre por un token de acceso
//   4) Renovar el token solo cada 6 horas (la app no te molesta mas)
//
// Todo se guarda LOCAL, en la carpeta /config, en tu computadora.
// ===================================================================

import { readFile, writeFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, "..", "..", "config");
const ARCHIVO_CRED = join(CONFIG_DIR, "credenciales.json");
const ARCHIVO_TOKENS = join(CONFIG_DIR, "ml-tokens.json");

// Mexico: dominio de autorizacion y de tokens.
const URL_AUTORIZACION = "https://auth.mercadolibre.com.mx/authorization";
const URL_TOKEN = "https://api.mercadolibre.com/oauth/token";
const REDIRECT_POR_DEFECTO = "https://localhost:3000/callback";

// --- utilidades para leer/escribir archivos JSON sin reventar ---
async function leerJSON(ruta) {
  try {
    return JSON.parse(await readFile(ruta, "utf-8"));
  } catch {
    return null;
  }
}
async function escribirJSON(ruta, datos) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(ruta, JSON.stringify(datos, null, 2), "utf-8");
}

// ---------------------------------------------------------------
// 1) CREDENCIALES (tus llaves)
// ---------------------------------------------------------------
export async function leerCredenciales() {
  const c = await leerJSON(ARCHIVO_CRED);
  if (!c) return null;
  return {
    appId: c.appId || c.mercadolibre?.appId || "",
    clientSecret: c.clientSecret || c.mercadolibre?.clientSecret || "",
    redirectUri: c.redirectUri || c.mercadolibre?.redirectUri || REDIRECT_POR_DEFECTO,
  };
}

export async function guardarCredenciales({ appId, clientSecret, redirectUri }) {
  const cred = {
    appId: String(appId || "").trim(),
    clientSecret: String(clientSecret || "").trim(),
    redirectUri: String(redirectUri || REDIRECT_POR_DEFECTO).trim(),
  };
  await escribirJSON(ARCHIVO_CRED, cred);
  return cred;
}

// ---------------------------------------------------------------
// 2) ENLACE DE PERMISO (donde TU autorizas una sola vez)
// ---------------------------------------------------------------
export async function urlPermiso() {
  const cred = await leerCredenciales();
  if (!cred || !cred.appId) {
    throw new Error("Faltan las llaves (App ID). Guardalas primero.");
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cred.appId,
    redirect_uri: cred.redirectUri,
  });
  return `${URL_AUTORIZACION}?${params.toString()}`;
}

// ---------------------------------------------------------------
// 3) CONECTAR: cambiar el "codigo" por un token
//    Acepta el codigo solo, o la URL completa pegada del navegador.
// ---------------------------------------------------------------
function extraerCodigo(textoPegado) {
  const t = String(textoPegado || "").trim();
  const m = t.match(/code=([^&\s]+)/); // viene dentro de una URL
  if (m) return decodeURIComponent(m[1]);
  return t; // o el usuario pego solo el codigo
}

export async function conectarConCodigo(textoPegado) {
  const cred = await leerCredenciales();
  if (!cred || !cred.appId || !cred.clientSecret) {
    throw new Error("Faltan las llaves (App ID o Client Secret).");
  }
  const code = extraerCodigo(textoPegado);
  if (!code) throw new Error("No encontre el codigo en lo que pegaste.");

  const cuerpo = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cred.appId,
    client_secret: cred.clientSecret,
    code,
    redirect_uri: cred.redirectUri,
  });

  const res = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: cuerpo.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Mercado Libre rechazo la conexion: ${data.message || data.error || res.status}`);
  }
  await guardarTokens(data);
  return { ok: true, userId: data.user_id };
}

// ---------------------------------------------------------------
// 4) TOKENS: guardar y renovar solos
// ---------------------------------------------------------------
async function guardarTokens(data) {
  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user_id,
    // expira en 6h; restamos 5 min de margen de seguridad
    expires_at: Date.now() + (data.expires_in - 300) * 1000,
  };
  await escribirJSON(ARCHIVO_TOKENS, tokens);
  return tokens;
}

async function refrescar() {
  const cred = await leerCredenciales();
  const tokens = await leerJSON(ARCHIVO_TOKENS);
  if (!tokens?.refresh_token) throw new Error("No hay refresh_token; vuelve a conectar.");

  const cuerpo = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: cred.appId,
    client_secret: cred.clientSecret,
    refresh_token: tokens.refresh_token,
  });
  const res = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: cuerpo.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`No se pudo renovar el token: ${data.message || res.status}`);
  return guardarTokens(data);
}

/**
 * Devuelve un access_token valido, renovando si ya expiro.
 * Devuelve null si todavia no hay conexion.
 */
export async function getTokenValido() {
  let tokens = await leerJSON(ARCHIVO_TOKENS);
  if (!tokens?.access_token) return null;
  if (Date.now() >= tokens.expires_at) {
    tokens = await refrescar();
  }
  return tokens.access_token;
}

// ---------------------------------------------------------------
// ESTADO: para que la pantalla sepa como vamos
// ---------------------------------------------------------------
export async function estadoConexion() {
  const cred = await leerCredenciales();
  const tokens = await leerJSON(ARCHIVO_TOKENS);
  return {
    tieneCredenciales: !!(cred && cred.appId && cred.clientSecret),
    conectado: !!tokens?.access_token,
    userId: tokens?.user_id || null,
    redirectUri: cred?.redirectUri || REDIRECT_POR_DEFECTO,
    appIdParcial: cred?.appId ? cred.appId.slice(0, 4) + "…" : null,
  };
}
