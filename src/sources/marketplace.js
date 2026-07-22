// ===================================================================
// CONECTOR 4: FACEBOOK MARKETPLACE  (mide cuantos lo VENDEN)
// -------------------------------------------------------------------
// Responde la pregunta: "Cuantas personas venden esto en Marketplace MX?"
//   - pocos vendedores  -> poca competencia organica -> mejor
//   - muchos vendedores -> mercado lleno
//
// ESTADO ACTUAL: datos de ejemplo (mock).
// PROXIMO PASO : Facebook Marketplace NO tiene API oficial, asi que se
//                leera la pagina con sesion iniciada, filtrando por
//                ubicacion en Mexico y la palabra clave del producto.
// ===================================================================

import { sampleProducts } from "../data/sampleProducts.js";

const indiceMarket = new Map(sampleProducts.map((p) => [p.nombre, p.vendedoresMarket]));

/**
 * Cuenta cuantos vendedores ofrecen un producto en Marketplace (Mexico).
 * @param {string} nombre - nombre del producto
 * @returns {Promise<number>} numero de vendedores
 */
export async function contarVendedoresMarket(nombre) {
  // --- MOCK ---
  return indiceMarket.get(nombre) ?? 0;

  // --- REAL (futuro), boceto:
  // Navegar Marketplace con sesion, buscar el termino, contar
  // publicaciones de vendedores distintos en Mexico.
}
