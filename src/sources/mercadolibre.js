// ===================================================================
// CONECTOR 1: MERCADO LIBRE  (mide la DEMANDA)
// -------------------------------------------------------------------
// Responde la pregunta: "Que productos esta comprando la gente?"
//
// FUNCIONA EN 2 MODOS automaticamente:
//   - SIN conexion  -> datos de ejemplo (mock), para ver la app
//   - CON conexion  -> datos REALES desde el API de Mercado Libre MX
// El cambio es automatico en cuanto guardes tus llaves y des permiso.
// ===================================================================

import { sampleProducts } from "../data/sampleProducts.js";
import { getTokenValido } from "../auth/mercadolibreAuth.js";

const API_BUSQUEDA = "https://api.mercadolibre.com/sites/MLM/search"; // MLM = Mexico

/**
 * Descubre productos con demanda en Mercado Libre Mexico.
 * @param {string} query - palabra clave o categoria a explorar
 * @returns {Promise<Array>} lista de productos con senales de demanda
 */
export async function descubrirDemanda(query = "") {
  const token = await getTokenValido();

  // --- MODO REAL: si ya hay conexion y el usuario busco algo ---
  if (token && query) {
    try {
      return await buscarReal(query, token);
    } catch (err) {
      console.error("Fallo la busqueda real en Mercado Libre, uso ejemplo:", err.message);
      // si algo falla, no dejamos al usuario sin pantalla
    }
  }

  // --- MODO EJEMPLO (mock) ---
  return sampleProducts.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    imagen: p.imagen,
    demandaML: p.demandaML,
    visitasML: p.visitasML,
    precioML: p.precioML,
    fuente: "ejemplo",
  }));
}

/**
 * Llama al API real de Mercado Libre y transforma la respuesta a
 * nuestro formato de producto.
 */
async function buscarReal(query, token) {
  const url = `${API_BUSQUEDA}?q=${encodeURIComponent(query)}&limit=20`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`API respondio ${res.status}`);
  const data = await res.json();

  return (data.results || []).map((r) => ({
    id: r.id,
    nombre: r.title,
    categoria: r.category_id || "Mercado Libre",
    imagen: (r.thumbnail || "").replace("http://", "https://"),
    // "vendidos" es la mejor senal de demanda disponible (puede venir 0).
    demandaML: r.sold_quantity || 0,
    visitasML: null, // (las visitas requieren otro endpoint; se anade luego)
    precioML: r.price,
    permalink: r.permalink,
    fuente: "real",
  }));
}
