/* =====================================================
   Módulo Resumen - Sistema Brayan Raudales (actualizado)
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

function sumar(arr, campo){
  return arr.reduce((a,b)=> a + (Number(b[campo]) || 0), 0);
}

function fechaFormato(str){
  if(!str) return "";
  return str.split(" ")[0];
}

function agruparPorFecha(arr){
  const mapa = {};
  arr.forEach(v=>{
    const f = fechaFormato(v.Fecha);
    mapa[f] = (mapa[f] || 0) + (Number(v["Ganancia LPS"]) || 0);
  });
  return Object.entries(mapa).map(([fecha, total])=>({fecha, total}));
}

async function cargarResumen(){
  const ventasDia = await fetchJSON("data/VENTAS_EMPRESA.json");
  const enviosMoto = await fetchJSON("data/ENVIOS_MOTO.json");
  const enviosCaex = await fetchJSON("data/ENVIOS_CAEX.json");
  const rauda = await fetchJSON("data/VENTAS_RAUDA.json");

  const totales = {
    "Ventas del Día": sumar(ventasDia, "Ganancia LPS"),
    "Envíos Moto": sumar(enviosMoto, "Ganancia LPS"),
    "Envíos Caex": sumar(enviosCaex, "Ganancia LPS"),
    "Rauda": sumar(rauda, "Ganancia LPS")
  };

  const totalGeneral = Object.values(totales).reduce((a,b)=>a+b,0);
  const totalesList = document.getElementById("totalesList");
  totalesList.innerHTML = `
    <li class="list-group-item">💰 <b>Ventas del Día:</b> L ${totales["Ventas del Día"].toFixed(2)}</li>
    <li class="list-group-item">🏍️ <b>Envíos Moto:</b> L ${totales["Envíos Moto"].toFixed(2)}</li>
    <li class="list-group-item">📦 <b>Envíos Caex:</b> L ${totales["Envíos Caex"].toFixed(2)}</li>
    <li class="list-group-item">🛍️ <b>Rauda:</b> L ${totales["Rauda"].toFixed(2)}</li>
    <li class="list-group-item list-group-item-primary"><b>Total General:</b> L ${totalGeneral.toFixed(2)}</li>
  `;

  // Tabla detallada
  const detalle = [
    ...ventasDia.map(v=>({...v, Tipo:"Ventas del Día"})),
    ...enviosMoto.map(v=>({...v, Tipo:"Envíos Moto"})),
    ...enviosCaex.map(v=>({...v, Tipo:"Envíos Caex"})),
    ...rauda.map(v=>({...v, Tipo:"Rauda"}))
  ];

  if(!detalle.length){
    tablaDetalle.innerHTML="<tr><td class='text-muted'>Sin registros</td></tr>";
    return;
  }

  const campos = Object.keys(detalle[0]);
  tablaDetalle.innerHTML = `
    <thead><tr>${campos.map(c=>`<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${detalle.map(d=>`<tr>${campos.map(c=>`<td>${d[c]}</td>`).join("")}</tr>`).join("")}</tbody>
  `;
  showToast("Resumen actualizado ✅","success");
}

window.addEventListener("DOMContentLoaded", ()=>{
  cargarResumen();
  document.getElementById("btnActualizar").addEventListener("click", cargarResumen);
});
