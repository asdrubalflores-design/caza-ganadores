// ===================================================================
// EL CEREBRO: cruza las 4 fuentes y decide quien es GANADOR
// -------------------------------------------------------------------
// Tomamos cada producto que tiene demanda (Mercado Libre) y le
// preguntamos a las otras 3 fuentes que tan saturado esta. Con eso
// calculamos un PUNTAJE (0 a 100) y le ponemos un color de semaforo.
//
//   PUNTO DULCE  =  mucha demanda  +  poca saturacion
//
//   🟢 GANADOR     : vale la pena probarlo ya
//   🟡 PROMETEDOR  : interesante, vigilar / validar mas
//   🔴 SATURADO    : evitar (lleno de competencia o ya en Dropi)
// ===================================================================

import { descubrirDemanda } from "../sources/mercadolibre.js";
import { revisarDropi } from "../sources/dropi.js";
import { contarAnunciantesMeta } from "../sources/meta.js";
import { contarVendedoresMarket } from "../sources/marketplace.js";

// --- Parametros que puedes ajustar para afinar el "olfato" ---
const CONFIG = {
  demandaMax: 3000, // demanda (ventas/mes) que consideramos "tope" para normalizar
  metaSaturado: 20, // a partir de tantos anunciantes lo tratamos como saturado
  marketSaturado: 40, // a partir de tantos vendedores lo tratamos como saturado
  umbralGanador: 65, // puntaje minimo para 🟢
  umbralPrometedor: 40, // puntaje minimo para 🟡 (debajo de esto = 🔴)
};

// Convierte un numero a una escala 0..1 con tope.
function normalizar(valor, tope) {
  if (!valor || valor <= 0) return 0;
  return Math.min(valor / tope, 1);
}

/**
 * Calcula el puntaje (0-100) y el semaforo de un producto ya enriquecido.
 */
function evaluar(p) {
  // 1) DEMANDA: mientras mas, mejor (0..1)
  const demanda = normalizar(p.demandaML, CONFIG.demandaMax);

  // 2) SATURACION: mientras mas, peor (0..1 cada una)
  const satDropi = p.enDropi ? 1 : 0; // estar en Dropi pesa fuerte
  const satMeta = normalizar(p.anunciantesMeta, CONFIG.metaSaturado);
  const satMarket = normalizar(p.vendedoresMarket, CONFIG.marketSaturado);

  // Saturacion combinada (promedio ponderado): Dropi pesa la mitad.
  const saturacion = satDropi * 0.5 + satMeta * 0.25 + satMarket * 0.25;

  // 3) VALIDACION: tener 0 anunciantes es sospechoso (quiza no vende).
  //    Un poquito de anuncios (1-10) es buena senal -> bono pequeno.
  const validacion = p.anunciantesMeta >= 1 && p.anunciantesMeta <= 10 ? 0.1 : 0;

  // Puntaje final 0..100
  let puntaje = (demanda * (1 - saturacion) + validacion) * 100;
  puntaje = Math.max(0, Math.min(100, Math.round(puntaje)));

  // Semaforo
  let semaforo, etiqueta;
  if (p.enDropi) {
    // Si ya esta en Dropi, lo marcamos rojo aunque tenga demanda.
    semaforo = "rojo";
    etiqueta = "Saturado (ya en Dropi)";
  } else if (puntaje >= CONFIG.umbralGanador) {
    semaforo = "verde";
    etiqueta = "Ganador";
  } else if (puntaje >= CONFIG.umbralPrometedor) {
    semaforo = "amarillo";
    etiqueta = "Prometedor";
  } else {
    semaforo = "rojo";
    etiqueta = "Saturado";
  }

  return { ...p, puntaje, semaforo, etiqueta };
}

/**
 * Proceso completo del embudo: descubre, enriquece, evalua y ordena.
 * @param {string} query - palabra clave / categoria a explorar (opcional)
 * @returns {Promise<Array>} productos evaluados, ordenados por puntaje
 */
export async function buscarGanadores(query = "") {
  // FILTRO 1 — Demanda (Mercado Libre)
  const base = await descubrirDemanda(query);

  // FILTROS 2, 3 y 4 — enriquecer cada producto con las otras fuentes.
  // Lo hacemos en paralelo por producto para que sea rapido.
  const enriquecidos = await Promise.all(
    base.map(async (p) => {
      const [dropi, anunciantesMeta, vendedoresMarket] = await Promise.all([
        revisarDropi(p.nombre),
        contarAnunciantesMeta(p.nombre),
        contarVendedoresMarket(p.nombre),
      ]);
      return {
        ...p,
        enDropi: dropi.enDropi,
        precioDropi: dropi.precioDropi,
        anunciantesMeta,
        vendedoresMarket,
      };
    })
  );

  // Evaluar (puntaje + semaforo) y ordenar de mejor a peor.
  return enriquecidos.map(evaluar).sort((a, b) => b.puntaje - a.puntaje);
}

export { CONFIG };
