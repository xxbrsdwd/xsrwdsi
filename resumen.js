/* =====================================================
   Resumen - Invertido basado en inventario restante
   ===================================================== */

function showToast(msg, type="info", ms=1500) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `alert alert-${type}`;
  toast.classList.remove("d-none");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.classList.add("d-none"), ms);
}
function toNum(x){ const n=Number(x); return isNaN(n)?0:n; }
async function fetchJSON(path){ try{const r=await fetch(path,{cache:"no-store"}); if(r.ok) return r.json();}catch{} return []; }
function sumar(arr,campo){ return arr.reduce((a,b)=> a + toNum(b[campo]), 0); }
function loadLocalArr(k){ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):[]; }catch{ return []; } }

async function cargarInventarioPreferLocal(){
  try{
    const local = JSON.parse(localStorage.getItem("INVENTARIO_JSON")||"[]");
    if(Array.isArray(local) && local.length) return local;
  }catch{}
  return await fetchJSON("data/INVENTARIO.json");
}

async function cargarResumen(){
  // Ventas
  const ventasDia  = await fetchJSON("data/VENTAS_EMPRESA.json");
  const enviosMoto = await fetchJSON("data/ENVIOS_MOTO.json");
  const enviosCaex = await fetchJSON("data/ENVIOS_CAEX.json");
  const rauda      = await fetchJSON("data/VENTAS_RAUDA.json");

  // Inventario restante (preferir local)
  const inventario = await cargarInventarioPreferLocal();

  // 1) Cantidad de ventas realizadas
  const cantVentas = ventasDia.length + enviosMoto.length + enviosCaex.length + rauda.length;

  // 2) Total invertido en productos (INVENTARIO vivo)
  const invertidoInventario = inventario.reduce((acc,p)=> acc + toNum(p.costo)*toNum(p.cantidad), 0);

  // 3) Envíos de moto (suma de costos de envío)
  const totalCostosEnvioMoto = enviosMoto.reduce((acc,r)=> acc + toNum(r["Costo Envío"] ?? r["Costo Envio"]), 0);

  // 4) Ganancias totales (desglose)
  const gDia  = sumar(ventasDia, "Ganancia LPS");
  const gMoto = sumar(enviosMoto, "Ganancia LPS");
  const gCaex = sumar(enviosCaex, "Ganancia LPS");
  const gRauda= sumar(rauda, "Ganancia LPS");
  const gTotal= gDia+gMoto+gCaex+gRauda;

  // Pintar indicadores
  const totalesList = document.getElementById("totalesList");
  totalesList.innerHTML = `
    <li class="list-group-item">🧾 <b>Cantidad de ventas realizadas:</b> ${cantVentas}
      <span class="text-muted">(Día: ${ventasDia.length}, Moto: ${enviosMoto.length}, Caex: ${enviosCaex.length}, Rauda: ${rauda.length})</span>
    </li>
    <li class="list-group-item">📦 <b>Total invertido en productos (inventario vivo):</b> L ${invertidoInventario.toFixed(2)}</li>
    <li class="list-group-item">🏍️ <b>Envíos de moto (suma costos envío):</b> L ${totalCostosEnvioMoto.toFixed(2)}</li>
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
  }else{
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
