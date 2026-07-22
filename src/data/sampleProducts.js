// ===================================================================
// DATOS DE EJEMPLO (mock)
// -------------------------------------------------------------------
// Estos productos son inventados solo para ver la app funcionando.
// Mas adelante, cada "fuente" (Mercado Libre, Dropi, Meta, Marketplace)
// reemplazara estos numeros con datos REALES.
//
// Cada producto trae lo que necesita el cerebro para decidir:
//   - demandaML        : senal de demanda en Mercado Libre (ventas/mes aprox)
//   - visitasML        : visitas al producto en Mercado Libre
//   - precioML         : precio promedio de venta en Mercado Libre (MXN)
//   - enDropi          : true si Dropi YA lo tiene (= mas saturado)
//   - precioDropi      : costo en Dropi si existe (MXN), o null
//   - anunciantesMeta  : cuantas tiendas lo anuncian en la Biblioteca de Meta
//   - vendedoresMarket : cuantos lo venden en Facebook Marketplace en Mexico
// ===================================================================

export const sampleProducts = [
  {
    id: "p1",
    nombre: "Lampara de luna 3D recargable",
    categoria: "Hogar / Decoracion",
    imagen: "https://placehold.co/80x80/4f46e5/ffffff?text=Luna",
    demandaML: 1850,
    visitasML: 42000,
    precioML: 399,
    enDropi: false,
    precioDropi: null,
    anunciantesMeta: 3,
    vendedoresMarket: 8,
  },
  {
    id: "p2",
    nombre: "Masajeador cervical electrico",
    categoria: "Salud / Bienestar",
    imagen: "https://placehold.co/80x80/059669/ffffff?text=Masaje",
    demandaML: 2400,
    visitasML: 67000,
    precioML: 549,
    enDropi: false,
    precioDropi: null,
    anunciantesMeta: 5,
    vendedoresMarket: 12,
  },
  {
    id: "p3",
    nombre: "Organizador plegable de zapatos",
    categoria: "Hogar / Organizacion",
    imagen: "https://placehold.co/80x80/d97706/ffffff?text=Orden",
    demandaML: 720,
    visitasML: 15500,
    precioML: 229,
    enDropi: false,
    precioDropi: null,
    anunciantesMeta: 1,
    vendedoresMarket: 4,
  },
  {
    id: "p4",
    nombre: "Audifonos inalambricos TWS Pro",
    categoria: "Electronica / Audio",
    imagen: "https://placehold.co/80x80/dc2626/ffffff?text=Audio",
    demandaML: 5200,
    visitasML: 130000,
    precioML: 299,
    enDropi: true,
    precioDropi: 145,
    anunciantesMeta: 40,
    vendedoresMarket: 90,
  },
  {
    id: "p5",
    nombre: "Mini proyector portatil HD",
    categoria: "Electronica / Video",
    imagen: "https://placehold.co/80x80/7c3aed/ffffff?text=Proyec",
    demandaML: 1600,
    visitasML: 51000,
    precioML: 899,
    enDropi: false,
    precioDropi: null,
    anunciantesMeta: 9,
    vendedoresMarket: 18,
  },
  {
    id: "p6",
    nombre: "Cepillo alisador de cabello ceramico",
    categoria: "Belleza / Cuidado",
    imagen: "https://placehold.co/80x80/db2777/ffffff?text=Cepillo",
    demandaML: 3100,
    visitasML: 88000,
    precioML: 459,
    enDropi: true,
    precioDropi: 210,
    anunciantesMeta: 28,
    vendedoresMarket: 55,
  },
  {
    id: "p7",
    nombre: "Bascula inteligente Bluetooth",
    categoria: "Salud / Fitness",
    imagen: "https://placehold.co/80x80/0891b2/ffffff?text=Bascula",
    demandaML: 980,
    visitasML: 24000,
    precioML: 349,
    enDropi: false,
    precioDropi: null,
    anunciantesMeta: 2,
    vendedoresMarket: 6,
  },
  {
    id: "p8",
    nombre: "Cargador magnetico 3 en 1",
    categoria: "Electronica / Accesorios",
    imagen: "https://placehold.co/80x80/2563eb/ffffff?text=Carga",
    demandaML: 1350,
    visitasML: 38000,
    precioML: 379,
    enDropi: false,
    precioDropi: null,
    anunciantesMeta: 6,
    vendedoresMarket: 14,
  },
];
