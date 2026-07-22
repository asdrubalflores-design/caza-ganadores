// ====== Lógica de la pantalla ======
// Pide los productos al servidor y pinta la tabla con el semáforo.

const $ = (id) => document.getElementById(id);

const DEMANDA_TOPE = 3000; // para dibujar las barras (igual que el cerebro)

// Clasifica un número en bajo/medio/alto para colorear las métricas.
function nivel(valor, medio, alto) {
  if (valor >= alto) return "alto";
  if (valor >= medio) return "medio";
  return "bajo";
}

function emojiSemaforo(s) {
  return s === "verde" ? "🟢" : s === "amarillo" ? "🟡" : "🔴";
}

function filaProducto(p) {
  const anchoBarra = Math.min(100, Math.round((p.demandaML / DEMANDA_TOPE) * 100));
  const nivelMeta = nivel(p.anunciantesMeta, 11, 21);
  const nivelMarket = nivel(p.vendedoresMarket, 15, 40);

  const dropiPill = p.enDropi
    ? `<span class="pill si">✅ Sí (saturado)</span>`
    : `<span class="pill no">❌ No</span>`;

  return `
    <tr>
      <td>
        <div class="prod">
          <img src="${p.imagen}" alt="" />
          <div class="pinfo">
            <b>${p.nombre}</b>
            <small>${p.categoria}</small>
          </div>
        </div>
      </td>
      <td>
        <span class="demanda-num">${p.demandaML.toLocaleString("es-MX")}/mes</span>
        <div class="barra"><span style="width:${anchoBarra}%"></span></div>
      </td>
      <td>${dropiPill}</td>
      <td><span class="metric ${nivelMeta}">${p.anunciantesMeta}</span></td>
      <td><span class="metric ${nivelMarket}">${p.vendedoresMarket}</span></td>
      <td><span class="puntaje">${p.puntaje}</span></td>
      <td><span class="veredicto ${p.semaforo}">${emojiSemaforo(p.semaforo)} ${p.etiqueta}</span></td>
    </tr>`;
}

async function cargar(query = "") {
  $("filas").innerHTML = `<tr><td colspan="7" class="cargando">Analizando productos… ⏳</td></tr>`;
  try {
    const res = await fetch(`/api/ganadores?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error desconocido");

    const productos = data.productos;
    $("filas").innerHTML = productos.map(filaProducto).join("");

    // Contadores del resumen
    const verdes = productos.filter((p) => p.semaforo === "verde").length;
    const amarillos = productos.filter((p) => p.semaforo === "amarillo").length;
    const rojos = productos.filter((p) => p.semaforo === "rojo").length;
    $("cVerde").textContent = verdes;
    $("cAmarillo").textContent = amarillos;
    $("cRojo").textContent = rojos;
    $("cTotal").textContent = productos.length;
  } catch (err) {
    $("filas").innerHTML = `<tr><td colspan="7" class="cargando">😕 No se pudo cargar: ${err.message}</td></tr>`;
  }
}

// Eventos
$("btnBuscar").addEventListener("click", () => cargar($("q").value.trim()));
$("q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") cargar($("q").value.trim());
});

// Carga inicial
cargar();
