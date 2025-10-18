/* =====================================================
   Módulo de Ventas - Sistema Brayan Raudales (orden fijo + fix Rauda)
   ===================================================== */

let INVENTARIO = [];
let VENTAS_EMPRESA = [];
let ENVIOS_MOTO = [];
let ENVIOS_CAEX = [];
let VENTAS_RAUDA = [];

// === Configuración GitHub (reutiliza la del inventario) ===
function loadGhCfg() {
  try { const s = localStorage.getItem("GH_SYNC_CFG"); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
}
const GH_CFG = loadGhCfg();

// === Utilidades ===
function showToast(msg, type="success", ms=1500) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `alert alert-${type}`;
  t.classList.remove("d-none");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>t.classList.add("d-none"), ms);
}
function fechaHora() {
  const f = new Date();
  return f.toLocaleDateString("es-HN")+" "+f.toLocaleTimeString("es-HN",{hour:"2-digit",minute:"2-digit"});
}
async function fetchJSON(url){ try{const r=await fetch(url,{cache:"no-store"}); if(r.ok) return r.json();}catch{} return []; }
function saveLocal(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function loadLocal(k){ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):[]; }catch{ return []; } }
function b64(str){ return btoa(unescape(encodeURIComponent(str))); }
function toNum(n){ const v=Number(n); return isNaN(v)?0:v; }

// === Auto-commit GitHub (opcional) ===
async function ghPutFile(path,content,msg="Auto-commit ventas"){
  if(!GH_CFG.token || !GH_CFG.autoCommit) return;
  const {owner,repo,branch,token}=GH_CFG;
  let sha=null;
  try{
    const meta=await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,{
      headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`}
    });
    if(meta.status===200){ const j=await meta.json(); sha=j.sha; }
  }catch{}
  await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`,{
    method:"PUT",
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({message:msg,branch,content:b64(JSON.stringify(content,null,2)),sha})
  });
}

// === ORDEN FIJO de columnas para EMPRESA ===
const COLS_EMPRESA = [
  "Fecha","Producto","Cantidad","Costo Envío","Total Vendido LPS","Descuento","Impuesto","Ganancia LPS"
];

function renderOrdered(tableEl, arr, cols=COLS_EMPRESA){
  if(!arr.length){ tableEl.innerHTML="<tr><td class='text-muted'>Sin registros</td></tr>"; return; }
  tableEl.innerHTML =
    "<thead><tr>"+cols.map(c=>`<th>${c}</th>`).join("")+"</tr></thead>"+
    "<tbody>"+arr.map(r=>"<tr>"+cols.map(c=>`<td>${(r[c] ?? "").toString()}</td>`).join("")+"</tr>").join("")+"</tbody>";
}
function renderAuto(tableEl, arr){
  if(!arr.length){ tableEl.innerHTML="<tr><td class='text-muted'>Sin registros</td></tr>"; return; }
  const cols = Object.keys(arr[0]);
  tableEl.innerHTML =
    "<thead><tr>"+cols.map(c=>`<th>${c}</th>`).join("")+"</tr></thead>"+
    "<tbody>"+arr.map(r=>"<tr>"+cols.map(c=>`<td>${r[c]}</td>`).join("")+"</tr>").join("")+"</tbody>";
}

// === Cargar inventario ===
async function cargarInventario(){
  const local=loadLocal("INVENTARIO_JSON");
  if(local?.length) return local;
  return await fetchJSON("data/INVENTARIO.json");
}
const buscarProd = nombre => INVENTARIO.find(p => (p.nombre||"").toLowerCase()===(nombre||"").toLowerCase()) || {venta:0,costo:0};

// === Migración (ajusta a esquema y ORDEN nuevos) ===
function migEmpresa(arr){
  return arr.map(r=>{
    const nombre = r.Producto ?? r.producto ?? "";
    const cant   = toNum(r.Cantidad ?? r.Cant);
    const prod   = buscarProd(nombre);
    const desc   = toNum(r.Descuento);
    const imp    = (r.Impuesto || "").toString();
    const costoEnv = 0;                          // Ventas del día
    const totalVend = toNum(prod.venta)*cant;    // sin envío
    const gan = ((toNum(prod.venta)-toNum(prod.costo))*cant) - desc;
    return {
      "Fecha": r.Fecha || fechaHora(),
      "Producto": nombre,
      "Cantidad": cant,
      "Costo Envío": costoEnv,
      "Total Vendido LPS": totalVend.toFixed(2),
      "Descuento": desc,
      "Impuesto": imp,
      "Ganancia LPS": gan.toFixed(2)
    };
  });
}
function migMoto(arr){
  return arr.map(r=>{
    const nombre = r.Producto ?? "";
    const cant   = toNum(r.Cantidad ?? r.Cant);
    const prod   = buscarProd(nombre);
    const envio  = toNum(r["Costo Envío"] ?? r["Costo Envio"]);
    const desc   = toNum(r.Descuento);
    const imp    = (r.Impuesto || "").toString();
    const totalVend = (toNum(prod.venta)*cant) + envio;           // + envío moto
    const gan = ((toNum(prod.venta)-toNum(prod.costo))*cant) - desc; // envío NO afecta ganancia
    return {
      "Fecha": r.Fecha || fechaHora(),
      "Producto": nombre,
      "Cantidad": cant,
      "Costo Envío": envio,
      "Total Vendido LPS": totalVend.toFixed(2),
      "Descuento": desc,
      "Impuesto": imp,
      "Ganancia LPS": gan.toFixed(2)
    };
  });
}
function migCaex(arr){
  return arr.map(r=>{
    const nombre = r.Producto ?? "";
    const cant   = toNum(r.Cantidad ?? r.Cant);
    const prod   = buscarProd(nombre);
    const envio  = toNum(r["Costo Envío"] ?? r["Costo Envio"]);
    const desc   = toNum(r.Descuento);
    const imp    = (r.Impuesto || "").toString();
    const totalVend = toNum(prod.venta)*cant;                       // Caex NO suma envío al total vendido
    const gan = ((toNum(prod.venta)-toNum(prod.costo))*cant) - envio - desc;
    return {
      "Fecha": r.Fecha || fechaHora(),
      "Producto": nombre,
      "Cantidad": cant,
      "Costo Envío": envio,
      "Total Vendido LPS": totalVend.toFixed(2),
      "Descuento": desc,
      "Impuesto": imp,
      "Ganancia LPS": gan.toFixed(2)
    };
  });
}

// === Inicialización ===
window.addEventListener("DOMContentLoaded", async ()=>{
  INVENTARIO = await cargarInventario();

  // llenar selects EMPRESA
  const prods = INVENTARIO.map(p=>p.nombre);
  ["prodVentaDia","prodEnvioMoto","prodEnvioCaex"].forEach(id=>{
    const s=document.getElementById(id);
    if(s) s.innerHTML="<option value=''>Seleccione...</option>"+prods.map(p=>`<option>${p}</option>`).join("");
  });

  // cargar registros locales y migrar a ORDEN nuevo
  VENTAS_EMPRESA = migEmpresa(loadLocal("VENTAS_EMPRESA"));
  ENVIOS_MOTO    = migMoto(loadLocal("ENVIOS_MOTO"));
  ENVIOS_CAEX    = migCaex(loadLocal("ENVIOS_CAEX"));
  VENTAS_RAUDA   = loadLocal("VENTAS_RAUDA"); // Rauda mantiene su esquema

  // Render inicial con orden fijo (EMPRESA) y auto (RAUDA)
  renderOrdered(tablaVentaDia, VENTAS_EMPRESA);
  renderOrdered(tablaEnvioMoto, ENVIOS_MOTO);
  renderOrdered(tablaEnvioCaex, ENVIOS_CAEX);
  renderAuto(tablaRauda, VENTAS_RAUDA);

  // Guardar migración
  saveLocal("VENTAS_EMPRESA", VENTAS_EMPRESA);
  saveLocal("ENVIOS_MOTO", ENVIOS_MOTO);
  saveLocal("ENVIOS_CAEX", ENVIOS_CAEX);

  // === Ventas del día ===
  formVentaDia.addEventListener("submit", async e=>{
    e.preventDefault();
    const nombre = prodVentaDia.value;
    const cant   = Number(cantVentaDia.value);
    const desc   = Number(descVentaDia.value)||0;
    const imp    = (impVentaDia.value||"").trim();
    const prod   = buscarProd(nombre);
    if(!prod) return showToast("Producto no encontrado","danger");

    const costoEnv  = 0;
    const totalVend = Number(prod.venta)*cant;             // sin envío
    const gan       = ((Number(prod.venta)-Number(prod.costo))*cant) - desc;

    const reg = {
      "Fecha": fechaHora(),
      "Producto": nombre,
      "Cantidad": cant,
      "Costo Envío": costoEnv,
      "Total Vendido LPS": totalVend.toFixed(2),
      "Descuento": desc,
      "Impuesto": imp,
      "Ganancia LPS": gan.toFixed(2)
    };

    VENTAS_EMPRESA.push(reg);
    saveLocal("VENTAS_EMPRESA", VENTAS_EMPRESA);
    renderOrdered(tablaVentaDia, VENTAS_EMPRESA);
    showToast("✅ Venta registrada correctamente");
    await ghPutFile("data/VENTAS_EMPRESA.json", VENTAS_EMPRESA);
    e.target.reset();
  });

  // === Envíos Moto ===
  formEnvioMoto.addEventListener("submit", async e=>{
    e.preventDefault();
    const nombre = prodEnvioMoto.value;
    const cant   = Number(cantEnvioMoto.value);
    const envio  = Number(costoEnvioMoto.value)||0;
    const desc   = Number(descEnvioMoto.value)||0;
    const imp    = (impEnvioMoto.value||"").trim();
    const prod   = buscarProd(nombre);
    if(!prod) return showToast("Producto no encontrado","danger");

    const totalVend = (Number(prod.venta)*cant) + envio;   // + envío moto
    const gan       = ((Number(prod.venta)-Number(prod.costo))*cant) - desc; // envío NO afecta ganancia

    const reg = {
      "Fecha": fechaHora(),
      "Producto": nombre,
      "Cantidad": cant,
      "Costo Envío": envio,
      "Total Vendido LPS": totalVend.toFixed(2),
      "Descuento": desc,
      "Impuesto": imp,
      "Ganancia LPS": gan.toFixed(2)
    };

    ENVIOS_MOTO.push(reg);
    saveLocal("ENVIOS_MOTO", ENVIOS_MOTO);
    renderOrdered(tablaEnvioMoto, ENVIOS_MOTO);
    showToast("✅ Envío Moto registrado");
    await ghPutFile("data/ENVIOS_MOTO.json", ENVIOS_MOTO);
    e.target.reset();
  });

  // === Envíos Caex ===
  formEnvioCaex.addEventListener("submit", async e=>{
    e.preventDefault();
    const nombre = prodEnvioCaex.value;
    const cant   = Number(cantEnvioCaex.value);
    const envio  = Number(costoEnvioCaex.value)||0;
    const desc   = Number(descEnvioCaex.value)||0;
    const imp    = (impEnvioCaex.value||"").trim();
    const prod   = buscarProd(nombre);
    if(!prod) return showToast("Producto no encontrado","danger");

    const totalVend = Number(prod.venta)*cant;             // Caex NO suma envío al total vendido
    const gan       = ((Number(prod.venta)-Number(prod.costo))*cant) - envio - desc;

    const reg = {
      "Fecha": fechaHora(),
      "Producto": nombre,
      "Cantidad": cant,
      "Costo Envío": envio,
      "Total Vendido LPS": totalVend.toFixed(2),
      "Descuento": desc,
      "Impuesto": imp,
      "Ganancia LPS": gan.toFixed(2)
    };

    ENVIOS_CAEX.push(reg);
    saveLocal("ENVIOS_CAEX", ENVIOS_CAEX);
    renderOrdered(tablaEnvioCaex, ENVIOS_CAEX);
    showToast("✅ Envío Caex registrado");
    await ghPutFile("data/ENVIOS_CAEX.json", ENVIOS_CAEX);
    e.target.reset();
  });

  // === Rauda (fix: descuentoRauda) ===
  formRauda.addEventListener("submit", async e=>{
    e.preventDefault();
    const descR = (document.getElementById("descRauda").value||"").trim();  // Descripción
    const inv   = Number(document.getElementById("invRauda").value);
    const vend  = Number(document.getElementById("vendRauda").value);
    const desc  = Number(document.getElementById("descuentoRauda").value)||0; // <-- id correcto
    const imp   = (document.getElementById("impRauda").value||"").trim();
    const com   = (document.getElementById("comRauda").value||"").trim();

    const gan = (vend - inv) - desc;

    const reg = {
      "Fecha": fechaHora(),
      "Descripción": descR,
      "Inversión LPS": inv,
      "Vendido LPS": vend,
      "Ganancia LPS": gan.toFixed(2),
      "Descuento": desc,
      "Impuesto": imp,
      "Comentario": com
    };

    VENTAS_RAUDA.push(reg);
    saveLocal("VENTAS_RAUDA", VENTAS_RAUDA);
    renderAuto(tablaRauda, VENTAS_RAUDA);
    showToast("✅ Venta Rauda registrada");
    await ghPutFile("data/VENTAS_RAUDA.json", VENTAS_RAUDA);
    e.target.reset();
  });
});
