// ===================================================================
// CONECTOR 2: DROPI MEXICO  (mide la SATURACION del catalogo)
// -------------------------------------------------------------------
// Responde la pregunta: "Dropi YA tiene este producto?"
// Si SI lo tiene  -> mas dropshippers lo venden -> mas saturado / mas
//                    devoluciones -> normalmente lo queremos EVITAR.
//
// ESTADO ACTUAL: datos de ejemplo (mock).
// PROXIMO PASO : leer el catalogo de Dropi. Como Dropi pide clave +
//                Google Authenticator (codigo de 2 pasos), el plan es
//                que el usuario abra sesion una vez y la app reutilice
//                esa sesion para leer el catalogo.
// ===================================================================

import { sampleProducts } from "../data/sampleProducts.js";

// Indice rapido por nombre para el mock.
const catalogoDropi = new Map(
  sampleProducts.map((p) => [p.nombre, { enDropi: p.enDropi, precioDropi: p.precioDropi }])
);

/**
 * Revisa si un producto esta en el catalogo de Dropi Mexico.
 * @param {string} nombre - nombre del producto a buscar
 * @returns {Promise<{enDropi: boolean, precioDropi: number|null}>}
 */
export async function revisarDropi(nombre) {
  // --- MOCK ---
  const hit = catalogoDropi.get(nombre);
  return hit ?? { enDropi: false, precioDropi: null };

  // --- REAL (futuro), boceto:
  // Buscar el nombre en el catalogo descargado de Dropi y devolver
  // si existe y a que precio mayoreo.
}
