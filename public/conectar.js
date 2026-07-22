// ====== Lógica de la pantalla de Conexiones ======
const $ = (id) => document.getElementById(id);

function mostrarMsg(el, texto, tipo) {
  el.textContent = texto;
  el.className = "msg " + tipo;
}

// Refresca el estado visual de Mercado Libre.
async function refrescarEstado() {
  try {
    const r = await (await fetch("/api/ml/estado")).json();
    const pill = $("estadoML");

    if (r.conectado) {
      pill.textContent = "✅ Conectado";
      pill.className = "estado-pill on";
    } else if (r.tieneCredenciales) {
      pill.textContent = "Llaves listas · falta permiso";
      pill.className = "estado-pill wait";
    } else {
      pill.textContent = "Desconectado";
      pill.className = "estado-pill off";
    }

    // Habilita los botones según el avance.
    $("btnAbrirPermiso").disabled = !r.tieneCredenciales;
    $("btnConectar").disabled = !r.tieneCredenciales;
    $("notaPermiso").style.display = r.tieneCredenciales ? "block" : "none";

    if (r.appIdParcial) $("appId").placeholder = "Guardado: " + r.appIdParcial;
  } catch (e) {
    console.error(e);
  }
}

// Paso 1: guardar llaves
$("btnGuardarLlaves").addEventListener("click", async () => {
  const appId = $("appId").value.trim();
  const clientSecret = $("clientSecret").value.trim();
  if (!appId || !clientSecret) {
    return mostrarMsg($("msgML"), "Escribe el App ID y el Client Secret.", "err");
  }
  try {
    const r = await (
      await fetch("/api/ml/credenciales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, clientSecret }),
      })
    ).json();
    if (!r.ok) throw new Error(r.error || "Error");
    mostrarMsg($("msgML"), "✅ Llaves guardadas. Ahora da permiso (Paso 2).", "ok");
    $("clientSecret").value = ""; // por seguridad, limpiamos la secreta de la vista
    refrescarEstado();
  } catch (e) {
    mostrarMsg($("msgML"), "No se pudo guardar: " + e.message, "err");
  }
});

// Paso 2: abrir el enlace de permiso en una pestaña nueva
$("btnAbrirPermiso").addEventListener("click", async () => {
  try {
    const r = await (await fetch("/api/ml/url-permiso")).json();
    if (!r.ok) throw new Error(r.error || "Error");
    window.open(r.url, "_blank");
  } catch (e) {
    mostrarMsg($("msgML"), "No se pudo abrir el permiso: " + e.message, "err");
  }
});

// Paso 3: conectar con el código/URL pegado
$("btnConectar").addEventListener("click", async () => {
  const texto = $("codigoPegado").value.trim();
  if (!texto) return mostrarMsg($("msgML"), "Pega la dirección o el código primero.", "err");
  try {
    const r = await (
      await fetch("/api/ml/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      })
    ).json();
    if (!r.ok) throw new Error(r.error || "Error");
    mostrarMsg($("msgML"), "🎉 ¡Conectado con Mercado Libre! Ya puedes buscar con datos reales.", "ok");
    $("codigoPegado").value = "";
    refrescarEstado();
  } catch (e) {
    mostrarMsg($("msgML"), "No se pudo conectar: " + e.message, "err");
  }
});

// ================= META AD LIBRARY =================
let sondeoMeta = null;

async function refrescarMeta() {
  try {
    const r = await (await fetch("/api/meta/estado")).json();
    const p = r.progreso || {};
    const pill = $("estadoMeta");
    const wrap = $("barraMetaWrap");
    const barra = $("barraMeta");

    if (p.corriendo) {
      wrap.style.display = "block";
      const pct = p.total ? Math.round((p.hecho / p.total) * 100) : 0;
      barra.style.width = pct + "%";
      pill.textContent = `Trabajando… ${p.hecho}/${p.total}`;
      pill.className = "estado-pill wait";
      $("btnActualizarMeta").disabled = true;
      const u = p.ultimo;
      if (u && u.termino) {
        mostrarMsg(
          $("msgMeta"),
          `🔎 "${u.termino}": ${u.total ?? "—"} anuncios${u.aviso ? " ⚠️ " + u.aviso : ""}`,
          "ok"
        );
      }
    } else {
      $("btnActualizarMeta").disabled = false;
      if (r.enCache > 0) {
        pill.textContent = `✅ ${r.enCache} productos con datos`;
        pill.className = "estado-pill on";
        barra.style.width = "100%";
      }
      if (p.terminadoEn) {
        mostrarMsg($("msgMeta"), "🎉 Listo. El tablero ya usa datos reales de Meta.", "ok");
        if (sondeoMeta) {
          clearInterval(sondeoMeta);
          sondeoMeta = null;
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

$("btnActualizarMeta").addEventListener("click", async () => {
  try {
    await fetch("/api/meta/actualizar", { method: "POST" });
    mostrarMsg($("msgMeta"), "🤖 Iniciado. Revisando productos uno por uno…", "ok");
    $("barraMetaWrap").style.display = "block";
    if (!sondeoMeta) sondeoMeta = setInterval(refrescarMeta, 3000);
    refrescarMeta();
  } catch (e) {
    mostrarMsg($("msgMeta"), "No se pudo iniciar: " + e.message, "err");
  }
});

refrescarEstado();
refrescarMeta();
