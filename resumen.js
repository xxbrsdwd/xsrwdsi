/* =====================================================
   Resumen - EMPRESA/RAUDA por separado (inventario vivo) + Rauda histórica
   ===================================================== */

function showToast(msg, type="info", ms=1500) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `alert alert-${type}`;
  toast.classList.remove("d-none");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.classList.add("d-none"), ms);
}

function toNum(x){ const n = Number(x); return isNaN(n) ? 0 : n; }
async function fetchJSON(path){ try{ const r=await fetch(path,{cache:"no-store"}); if(r.ok) return r.json(); }catch{} return []; }
function sumar(arr, campo){ return arr.reduce((a,b)=> a + toNum(b[campo]), 0); }

async function cargarInventarioPreferLocal(claveLS, rutaJSON){
  try{
    const local = JSON.parse(localStorage.getItem(claveLS) || "[]");
    if (Array.isArray(local) && local.length) return local;
  }catch{}
  return await fetchJSON(rutaJSON);
}

async function cargarResumen(){
  // Ventas
  const ventasDia  = await fetchJSON("data/VENTAS_EMPRESA.json");
  const enviosMoto = await fetchJSON("data/ENVIOS_MOTO.json");
  const enviosCaex = await fetchJSON("data/ENVIOS_CAEX.json");
  const rauda      = await fetchJSON("data/VENTAS_RAUDA.json");

  // Inventarios vivos (preferir localStorage)
  const invEmpresa = await cargarInventarioPreferLocal("INVENTARIO_JSON", "data/INVENTARIO.json");
  const invRauda   = await cargarInventarioPreferLocal("INVENTARIO_RAUDA_JSON", "data/INVENTARIO_RAUDA.json");

  // 1) Cantidad de ventas realizadas
  const cantVentas = ventasDia.length + enviosMoto.length + enviosCaex.length + rauda.length;

  // 2) Invertidos (inventario vivo)
  const invertidoEmpresaVivo = invEmpresa.reduce((acc,p)=> acc + toNum(p.costo)*toNum(p.cantidad), 0);
  const invertidoRaudaVivo   = invRauda.reduce((acc,p)=> acc + toNum(p.costo)*toNum(p.cantidad), 0);
  const invertidoVivoGlobal  = invertidoEmpresaVivo + invertidoRaudaVivo;

  // Rauda histórica (aparte): suma de “Inversión LPS” declarada en cada registro Rauda
  const inversionRaudaHistorica = rauda.reduce((acc,r)=>{
    const inv = r["Inversión LPS"] ?? r["Costo Inversión"] ?? r["Inversion LPS"] ?? 0;
    return acc + toNum(inv);
  }, 0);

  // 3) Envíos de moto: suma de costos de envío
  const totalCostosEnvioMoto = enviosMoto.reduce((acc,r)=> acc + toNum(r["Costo Envío"] ?? r["Costo Envio"]), 0);

  // 4) Ganancias (y desglose)
  const gDia   = sumar(ventasDia,  "Ganancia LPS");
  const gMoto  = sumar(enviosMoto, "Ganancia LPS");
  const gCaex  = sumar(enviosCaex, "Ganancia LPS");
  const gRauda = sumar(rauda,      "Ganancia LPS");
  const gTotal = gDia + gMoto + gCaex + gRauda;

  // Pintar indicadores
  const totalesList = document.getElementById("totalesList");
  totalesList.innerHTML = `
    <li class="list-group-item">🧾 <b>Cantidad de ventas realizadas:</b> ${cantVentas}
      <span class="text-muted">(Día: ${ventasDia.length}, Moto: ${enviosMoto.length}, Caex: ${enviosCaex.length}, Rauda: ${rauda.length})</span>
    </li>
    <li class="list-group-item">📦 <b>Total invertido EMPRESA (inventario vivo):</b> L ${invertidoEmpresaVivo.toFixed(2)}</li>
    <li class="list-group-item">🧳 <b>Total invertido RAUDA (inventario vivo):</b> L ${invertidoRaudaVivo.toFixed(2)}</li>
    <li class="list-group-item">➕ <b>Invertido vivo (EMPRESA + RAUDA):</b> L ${invertidoVivoGlobal.toFixed(2)}</li>
    <li class="list-group-item">🧮 <b>Inversión Rauda (histórica, aparte):</b> L ${inversionRaudaHistorica.toFixed(2)}</li>
    <li class="list-group-item">🏍️ <b>Envíos de moto (suma costos de envío):</b> L ${totalCostosEnvioMoto.toFixed(2)}</li>
    <li class="list-group-item list-group-item-primary"><b>Ganancias totales:</b> L ${gTotal.toFixed(2)}</li>
    <li class="list-group-item">— —</li>
    <li class="list-group-item">💰 <b>Ganancia Ventas del Día:</b> L ${gDia.toFixed(2)}</li>
    <li class="list-group-item">🏍️ <b>Ganancia Envíos Moto:</b> L ${gMoto.toFixed(2)}</li>
    <li class="list-group-item">📦 <b>Ganancia Envíos Caex:</b> L ${gCaex.toFixed(2)}</li>
    <li class="list-group-item">🛍️ <b>Ganancia Rauda:</b> L ${gRauda.toFixed(2)}</li>
  `;

  // Tabla detallada (igual)
  const detalle = [
    ...ventasDia.map(v=>({...v, Tipo:"Ventas del Día"})),
    ...enviosMoto.map(v=>({...v, Tipo:"Envíos Moto"})),
    ...enviosCaex.map(v=>({...v, Tipo:"Envíos Caex"})),
    ...rauda.map(v=>({...v, Tipo:"Rauda"}))
  ];
  const tabla = document.getElementById("tablaDetalle");
  if(!detalle.length){
    tabla.innerHTML="<tr><td class='text-muted'>Sin registros</td></tr>";
  } else {
    const campos = Object.keys(detalle[0]);
    tabla.innerHTML = `
      <thead><tr>${campos.map(c=>`<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${detalle.map(d=>`<tr>${campos.map(c=>`<td>${d[c]}</td>`).join("")}</tr>`).join("")}</tbody>
    `;
  }

  showToast("Resumen actualizado ✅","success");
}

window.addEventListener("DOMContentLoaded", ()=>{
  cargarResumen();
  const btn = document.getElementById("btnActualizar");
  if(btn) btn.addEventListener("click", cargarResumen);
});
