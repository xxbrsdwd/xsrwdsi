/* =====================================================
   Módulo Resumen - Sistema Brayan Raudales (indicadores extra)
   ===================================================== */

function showToast(msg, type="info", ms=1500) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `alert alert-${type}`;
  toast.classList.remove("d-none");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.classList.add("d-none"), ms);
}

async function fetchJSON(path){
  try{
    const r = await fetch(path, {cache:"no-store"});
    if(r.ok) return r.json();
  }catch{}
  return [];
}

function toNum(x){ const n = Number(x); return isNaN(n)?0:n; }
function sumar(arr, campo){ return arr.reduce((a,b)=> a + toNum(b[campo]), 0); }

async function cargarResumen(){
  // Datos de ventas
  const ventasDia = await fetchJSON("data/VENTAS_EMPRESA.json");   // Ventas del Día (EMPRESA)
  const enviosMoto = await fetchJSON("data/ENVIOS_MOTO.json");     // Envíos Moto (EMPRESA)
  const enviosCaex = await fetchJSON("data/ENVIOS_CAEX.json");     // Envíos Caex (EMPRESA)
  const rauda = await fetchJSON("data/VENTAS_RAUDA.json");         // RAUDA

  // Inventario para calcular inversión (costo*cantidad)
  const inventario = await fetchJSON("data/INVENTARIO.json");

  // 1) Cantidad de ventas realizadas
  const cantVentas = ventasDia.length + enviosMoto.length + enviosCaex.length + rauda.length;

  // 2) Total invertido en productos
  const invertidoInventario = inventario.reduce((acc,p)=> acc + toNum(p.costo)*toNum(p.cantidad), 0);
  // En Rauda, el campo que usamos es "Inversión LPS" (con tolerancias)
  const inversionRauda = rauda.reduce((acc,r)=> acc + toNum(r["Inversión LPS"] ?? r["Costo Inversión"] ?? r["Inversion LPS"]), 0);
  const totalInvertidoGlobal = invertidoInventario + inversionRauda;

  // 3) Envíos de moto: suma de costos de envío
  const totalCostosEnvioMoto = enviosMoto.reduce((acc,r)=> acc + toNum(r["Costo Envío"] ?? r["Costo Envio"]), 0);

  // 4) Ganancias totales (y por tipo)
  const gVentasDia = sumar(ventasDia, "Ganancia LPS");
  const gMoto      = sumar(enviosMoto, "Ganancia LPS");
  const gCaex      = sumar(enviosCaex, "Ganancia LPS");
  const gRauda     = sumar(rauda, "Ganancia LPS");
  const gananciaTotal = gVentasDia + gMoto + gCaex + gRauda;

  // Mostrar indicadores en la lista
  const totalesList = document.getElementById("totalesList");
  totalesList.innerHTML = `
    <li class="list-group-item">🧾 <b>Cantidad de ventas realizadas:</b> ${cantVentas}
      <span class="text-muted">(Día: ${ventasDia.length}, Moto: ${enviosMoto.length}, Caex: ${enviosCaex.length}, Rauda: ${rauda.length})</span>
    </li>
    <li class="list-group-item">📦 <b>Total invertido en productos:</b> L ${totalInvertidoGlobal.toFixed(2)}
      <span class="text-muted">(Inventario: L ${invertidoInventario.toFixed(2)} + Rauda: L ${inversionRauda.toFixed(2)})</span>
    </li>
    <li class="list-group-item">🏍️ <b>Envíos de moto (suma de costos de envío):</b> L ${totalCostosEnvioMoto.toFixed(2)}</li>
    <li class="list-group-item list-group-item-primary"><b>Ganancias totales:</b> L ${gananciaTotal.toFixed(2)}</li>
    <li class="list-group-item">— —</li>
    <li class="list-group-item">💰 <b>Ganancia Ventas del Día:</b> L ${gVentasDia.toFixed(2)}</li>
    <li class="list-group-item">🏍️ <b>Ganancia Envíos Moto:</b> L ${gMoto.toFixed(2)}</li>
    <li class="list-group-item">📦 <b>Ganancia Envíos Caex:</b> L ${gCaex.toFixed(2)}</li>
    <li class="list-group-item">🛍️ <b>Ganancia Rauda:</b> L ${gRauda.toFixed(2)}</li>
  `;

  // Tabla detallada (igual que antes)
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
