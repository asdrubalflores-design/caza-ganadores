// ===================================================================
// CONECTOR 3: BIBLIOTECA DE ANUNCIOS DE META  (mide COMPETENCIA en ads)
// -------------------------------------------------------------------
// Responde: "Cuantos anuncios activos hay de este producto en Mexico?"
//   - 0 anuncios    -> nadie lo valida (riesgo: quiza no vende)
//   - pocos         -> punto dulce: SI vende y aun hay espacio
//   - muchos        -> saturado: dificil y caro competir
//
// FUNCIONA EN 2 MODOS automaticamente:
//   - SIN cache  -> datos de ejemplo (mock)
//   - CON cache  -> dato REAL leido de la Biblioteca de Anuncios, que se
//                   llena "poco a poco" desde la pantalla de Conexiones.
// El conteo real lo hace src/sources/metaReal.js (con navegador).
// ===================================================================

import { sampleProducts } from "../data/sampleProducts.js";
import { leerCacheMeta } from "./metaReal.js";

const indiceMock = new Map(sampleProducts.map((p) => [p.nombre, p.anunciantesMeta]));

/**
 * Cuenta cuantos anuncios activos hay de un producto en Meta (Mexico).
 * Lee del cache real si existe; si no, usa el ejemplo.
 * @param {string} nombre - nombre / frase del producto
 * @returns {Promise<number>} numero de anuncios activos
 */
export async function contarAnunciantesMeta(nombre) {
  const cache = await leerCacheMeta();
  const hit = cache[String(nombre).toLowerCase()];
  if (hit && typeof hit.total === "number") {
    return hit.total; // dato REAL desde la Biblioteca de Anuncios
  }
  // --- MODO EJEMPLO (mock) ---
  return indiceMock.get(nombre) ?? 0;
}
