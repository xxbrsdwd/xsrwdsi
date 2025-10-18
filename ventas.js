/* =====================================================
   Ventas - EMPRESA + RAUDA (GitHub Pages puro) - PATH/STOCK FIX
   ===================================================== */

let INVENTARIO = [];     // EMPRESA
let INV_RAUDA = [];      // RAUDA
let VENTAS_EMPRESA = [];
let ENVIOS_MOTO = [];
let ENVIOS_CAEX = [];
let VENTAS_RAUDA = [];

/* ============== Config GitHub ============== */
const LS_META_KEY = "GH_SYNC_META";
const SS_TOKEN_KEY = "GH_TOKEN_SESSION";
const LEGACY_KEY   = "GH_SYNC_CFG";

function loadGhMeta(){ try{ return JSON.parse(localStorage.getItem(LS_META_KEY)||"{}"); }catch{ return {}; } }
function loadGhTokenSession(){ return sessionStorage.getItem(SS_TOKEN_KEY) || null; }
function loadLegacyCfg(){ try{ return JSON.parse(localStorage.getItem(LEGACY_KEY)||"{}"); }catch{ return {}; } }

function loadGhCfg(){
  const meta = loadGhMeta();
  const token = loadGhTokenSession() || (loadLegacyCfg().token || null);
  return {
    owner:  (meta.owner  || "xxbrsdwd").trim(),
    repo:   (meta.repo   || "xsrwdsi").trim(),
    branch: (meta.branch || "main").trim(),
    path:   (meta.path   || "data/INVENTARIO.json").trim(),
    autoCommit: !!meta.autoCommit,
    token: token || null
  };
}

function encodePathForGithub(p){ return (p||"").split("/").map(encodeURIComponent).join("/"); }
function b64(str){ return btoa(unescape(encodeURIComponent(str))); }

async function ghGetSha(path){
  const {owner,repo,branch,token} = loadGhCfg();
  const encPath = encodePathForGithub(path);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath}?ref=${branch}`;
  const headers = {"Accept":"application/vnd.github+json"};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(url, {headers});
  if (r.status === 200){
    const j = await r.json();
    return j.sha || null;
  }
  return null;
}

async function ghPutFile(path, content, msg="Auto-commit ventas"){
  const {owner,repo,branch,token,autoCommit} = loadGhCfg();
  if (!token || !autoCommit) return;
  const encPath = encodePathForGithub(path);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encPath}`;
  let sha = null;
  try { sha = await ghGetSha(path); } catch {}
  const body = {
    message: msg,
    branch,
    content: b64(JSON.stringify(content,null,2)),
    ...(sha ? {sha} : {})
  };
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      "Accept":"application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const txt = await r.text().catch(()=> "");
    console.error("GitHub PUT error:", r.status, txt);
    showToast(`⛔ Error GitHub ${r.status}`, "danger", 2500);
    throw new Error(`GitHub PUT ${r.status}`);
  }
}

/* ============== Utils ============== */
function showToast(msg,type="success",ms=1600){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.className=`alert alert-${type}`;
  t.classList.remove("d-none");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>t.classList.add("d-none"), ms);
}
function toNum(n){const v=Number(n);return isNaN(v)?0:v;}
function fechaHora(){const f=new Date();return f.toLocaleDateString("es-HN")+" "+f.toLocaleTimeString("es-HN",{hour:"2-digit",minute:"2-digit"})}
async function fetchJSON(url){try{const r=await fetch(url,{cache:"no-store"});if(r.ok)return r.json();}catch{}return []}
function saveLocal(k,v){localStorage.setItem(k,JSON.stringify(v))}
function loadLocal(k){try{const s=localStorage.getItem(k);return s?JSON.parse(s):[]}catch{return []}}

// preferir repo; si falla, local
async function loadArrPreferRepo(key, url){
  try{
    const r=await fetch(url,{cache:"no-store"});
    if(r.ok){ const j=await r.json(); if(Array.isArray(j)){ saveLocal(key,j); return j; } }
  }catch{}
  return loadLocal(key);
}

// Render genérico con orden de columnas fijo (si se pasa)
function renderTable(el, arr, columns){
  if(!arr.length){ el.innerHTML="<tr><td class='text-muted'>Sin registros</td></tr>"; return; }
  const cols = columns && columns.length ? columns : Object.keys(arr[0]);
  el.innerHTML =
    "<thead><tr>" + cols.map(c=>`<th>${c}</th>`).join("") + "</tr></thead>" +
    "<tbody>" + arr.map(r=>"<tr>"+cols.map(c=>`<td>${r[c] ?? ""}</td>`).join("")+"</tr>").join("") + "</tbody>";
}

// === Inventarios ===
async function cargarInventarioEmpresa(){ const local=loadLocal("INVENTARIO_JSON"); if(local?.length) return local; return await fetchJSON("data/INVENTARIO.json"); }
async function cargarInventarioRauda(){ const local=loadLocal("INVENTARIO_RAUDA_JSON"); if(local?.length) return local; return await fetchJSON("data/INVENTARIO_RAUDA.json"); }
const buscarEmp = n => INVENTARIO.find(p => (p.nombre||"").toLowerCase()===(n||"").toLowerCase());
const buscarRau = n => INV_RAUDA.find(p => (p.nombre||"").toLowerCase()===(n||"").toLowerCase());

async function descStockEmp(nombre,cant){
  const i = INVENTARIO.findIndex(p => (p.nombre||"").toLowerCase()===(nombre||"").toLowerCase());
  if(i<0){ showToast("Producto no encontrado (EMPRESA)","danger"); return false; }
  const disp = toNum(INVENTARIO[i].cantidad);
  if(cant>disp){ showToast(`Stock insuficiente EMPRESA (disp: ${disp})`,"danger"); return false; }
  INVENTARIO[i].cantidad = disp - cant;
  saveLocal("INVENTARIO_JSON", INVENTARIO);
  try{
    const cfg = loadGhCfg();
    await ghPutFile(cfg.path || "data/INVENTARIO.json", INVENTARIO, "Actualizar stock EMPRESA");
  }catch{}
  return true;
}
async function descStockRau(nombre,cant){
  const i = INV_RAUDA.findIndex(p => (p.nombre||"").toLowerCase()===(nombre||"").toLowerCase());
  if(i<0){ showToast("Producto no encontrado (RAUDA)","danger"); return false; }
  const disp = toNum(INV_RAUDA[i].cantidad);
  if(cant>disp){ showToast(`Stock insuficiente RAUDA (disp: ${disp})`,"danger"); return false; }
  INV_RAUDA[i].cantidad = disp - cant;
  saveLocal("INVENTARIO_RAUDA_JSON", INV_RAUDA);
  try{ await ghPutFile("data/INVENTARIO_RAUDA.json", INV_RAUDA, "Actualizar stock RAUDA"); }catch{}
  return true;
}

// === Columnas fijas (EMPRESA)
const COLS_EMPRESA = ["Fecha","Producto","Cantidad","Costo Envío","Total Vendido LPS","Descuento","Impuesto","Ganancia LPS"];
const COLS_RAUDA   = ["Fecha","Producto","Cantidad","Inversión LPS","Vendido LPS","Descuento","Impuesto","Ganancia LPS","Descripción","Comentario"];

// === Init ===
window.addEventListener("DOMContentLoaded", async ()=>{
  // Inventarios
  INVENTARIO = await cargarInventarioEmpresa();
  INV_RAUDA  = await cargarInventarioRauda();

  // Llenar selects EMPRESA
  const nombresEmp = INVENTARIO.map(p=>p.nombre);
  ["prodVentaDia","prodEnvioMoto","prodEnvioCaex"].forEach(id=>{
    const s = document.getElementById(id);
    if(s) s.innerHTML = "<option value=''>Seleccione...</option>" + nombresEmp.map(n=>`<option>${n}</option>`).join("");
  });

  // Select RAUDA
  const selR = document.getElementById("prodRauda");
  if(selR){
    const nombresR = INV_RAUDA.map(p=>p.nombre);
    selR.innerHTML = "<option value=''>Seleccione...</option>" + nombresR.map(n=>`<option>${n}</option>`).join("");
  }

  // Prellenar inversión RAUDA = costo unitario × cantidad
  function updateInvRauda(){
    const nombre = (document.getElementById("prodRauda")?.value||"").trim();
    const cant   = toNum(document.getElementById("cantRauda")?.value||1);
    const p      = buscarRau(nombre);
    if(!p) return;
    const inv = toNum(p.costo) * cant;
    const invInput = document.getElementById("invRauda");
    if(invInput) invInput.value = inv.toFixed(2);
  }
  document.getElementById("prodRauda")?.addEventListener("change", updateInvRauda);
  document.getElementById("cantRauda")?.addEventListener("input", updateInvRauda);

  // Cargar registros (prefer repo; si falla, local)
  VENTAS_EMPRESA = await loadArrPreferRepo("VENTAS_EMPRESA", "data/VENTAS_EMPRESA.json");
  ENVIOS_MOTO    = await loadArrPreferRepo("ENVIOS_MOTO",    "data/ENVIOS_MOTO.json");
  ENVIOS_CAEX    = await loadArrPreferRepo("ENVIOS_CAEX",    "data/ENVIOS_CAEX.json");
  VENTAS_RAUDA   = await loadArrPreferRepo("VENTAS_RAUDA",   "data/VENTAS_RAUDA.json");

  // Render
  renderTable(document.getElementById("tablaVentaDia"), VENTAS_EMPRESA, COLS_EMPRESA);
  renderTable(document.getElementById("tablaEnvioMoto"), ENVIOS_MOTO,   COLS_EMPRESA);
  renderTable(document.getElementById("tablaEnvioCaex"), ENVIOS_CAEX,   COLS_EMPRESA);
  renderTable(document.getElementById("tablaRauda"),     VENTAS_RAUDA,  COLS_RAUDA);

  // Guardar locals (por si vinieron del repo)
  saveLocal("VENTAS_EMPRESA", VENTAS_EMPRESA);
  saveLocal("ENVIOS_MOTO", ENVIOS_MOTO);
  saveLocal("ENVIOS_CAEX", ENVIOS_CAEX);
  saveLocal("VENTAS_RAUDA", VENTAS_RAUDA);

  // === Ventas del día (EMPRESA)
  document.getElementById("formVentaDia")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const nombre = prodVentaDia.value;
    const cant   = toNum(cantVentaDia.value);
    const desc   = toNum(descVentaDia.value)||0;
    const imp    = (impVentaDia.value||"0").trim();
    const p = buscarEmp(nombre);
    if(!p) return showToast("Producto no encontrado","danger");
    if(!(await descStockEmp(nombre,cant))) return;

    const totalVend = toNum(p.venta)*cant;
    const gan = ((toNum(p.venta)-toNum(p.costo))*cant) - desc;

    const reg = {"Fecha":fechaHora(),"Producto":nombre,"Cantidad":cant,"Costo Envío":0,"Total Vendido LPS":totalVend.toFixed(2),"Descuento":desc,"Impuesto":imp,"Ganancia LPS":gan.toFixed(2)};
    VENTAS_EMPRESA.push(reg);
    saveLocal("VENTAS_EMPRESA", VENTAS_EMPRESA);
    renderTable(tablaVentaDia, VENTAS_EMPRESA, COLS_EMPRESA);
    showToast("✅ Venta registrada");
    try{ await ghPutFile("data/VENTAS_EMPRESA.json", VENTAS_EMPRESA, "Venta del día"); }catch{}
    e.target.reset(); impVentaDia.value="0";
  });

  // === Envíos Moto (EMPRESA)
  document.getElementById("formEnvioMoto")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const nombre = prodEnvioMoto.value;
    const cant   = toNum(cantEnvioMoto.value);
    const envio  = toNum(costoEnvioMoto.value)||0;
    const desc   = toNum(descEnvioMoto.value)||0;
    const imp    = (impEnvioMoto.value||"0").trim();
    const p = buscarEmp(nombre);
    if(!p) return showToast("Producto no encontrado","danger");
    if(!(await descStockEmp(nombre,cant))) return;

    const totalVend = (toNum(p.venta)*cant)+envio;
    const gan = ((toNum(p.venta)-toNum(p.costo))*cant) - desc;

    const reg = {"Fecha":fechaHora(),"Producto":nombre,"Cantidad":cant,"Costo Envío":envio,"Total Vendido LPS":totalVend.toFixed(2),"Descuento":desc,"Impuesto":imp,"Ganancia LPS":gan.toFixed(2)};
    ENVIOS_MOTO.push(reg);
    saveLocal("ENVIOS_MOTO", ENVIOS_MOTO);
    renderTable(tablaEnvioMoto, ENVIOS_MOTO, COLS_EMPRESA);
    showToast("✅ Envío Moto registrado");
    try{ await ghPutFile("data/ENVIOS_MOTO.json", ENVIOS_MOTO, "Envío moto"); }catch{}
    e.target.reset(); impEnvioMoto.value="0";
  });

  // === Envíos Caex (EMPRESA)
  document.getElementById("formEnvioCaex")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const nombre = prodEnvioCaex.value;
    const cant   = toNum(cantEnvioCaex.value);
    const envio  = toNum(costoEnvioCaex.value)||0;
    const desc   = toNum(descEnvioCaex.value)||0;  // FIX id correcto
    const imp    = (impEnvioCaex.value||"0").trim();
    const p = buscarEmp(nombre);
    if(!p) return showToast("Producto no encontrado","danger");
    if(!(await descStockEmp(nombre,cant))) return;

    const totalVend = toNum(p.venta)*cant; // Caex NO suma envío al total vendido
    const gan = ((toNum(p.venta)-toNum(p.costo))*cant) - envio - desc;

    const reg = {"Fecha":fechaHora(),"Producto":nombre,"Cantidad":cant,"Costo Envío":envio,"Total Vendido LPS":totalVend.toFixed(2),"Descuento":desc,"Impuesto":imp,"Ganancia LPS":gan.toFixed(2)};
    ENVIOS_CAEX.push(reg);
    saveLocal("ENVIOS_CAEX", ENVIOS_CAEX);
    renderTable(tablaEnvioCaex, ENVIOS_CAEX, COLS_EMPRESA);
    showToast("✅ Envío Caex registrado");
    try{ await ghPutFile("data/ENVIOS_CAEX.json", ENVIOS_CAEX, "Envío caex"); }catch{}
    e.target.reset(); impEnvioCaex.value="0";
  });

  // === Rauda (vende contra inventario RAUDA)
  document.getElementById("formRauda")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const nombre = (document.getElementById("prodRauda")?.value||"").trim();
    const cant   = toNum(document.getElementById("cantRauda")?.value||1);
    const inv    = toNum(document.getElementById("invRauda")?.value||0);
    const vend   = toNum(document.getElementById("vendRauda")?.value||0);
    const desc   = toNum(document.getElementById("descuentoRauda")?.value||0);
    const imp    = (document.getElementById("impRauda")?.value||"0").trim();
    const descTxt= (document.getElementById("descRauda")?.value||"").trim();
    const com    = (document.getElementById("comRauda")?.value||"").trim();

    if(!nombre) return showToast("Selecciona un producto RAUDA","danger");
    if(cant<=0)  return showToast("Cantidad inválida","danger");

    const i = INV_RAUDA.findIndex(p => (p.nombre||"").toLowerCase()===(nombre||"").toLowerCase());
    if(i<0){ showToast("Producto no encontrado (RAUDA)","danger"); return; }
    const disp = toNum(INV_RAUDA[i].cantidad);
    if(cant>disp){ showToast(`Stock insuficiente RAUDA (disp: ${disp})`,"danger"); return; }
    INV_RAUDA[i].cantidad = disp - cant;
    saveLocal("INVENTARIO_RAUDA_JSON", INV_RAUDA);
    try{ await ghPutFile("data/INVENTARIO_RAUDA.json", INV_RAUDA, "Actualizar stock RAUDA"); }catch{}

    const gan = (vend - inv) - desc;
    const reg = {"Fecha":fechaHora(),"Producto":nombre,"Cantidad":cant,"Inversión LPS":inv.toFixed(2),"Vendido LPS":vend.toFixed(2),"Descuento":desc,"Impuesto":imp,"Ganancia LPS":gan.toFixed(2),"Descripción":descTxt,"Comentario":com};

    VENTAS_RAUDA.push(reg);
    saveLocal("VENTAS_RAUDA", VENTAS_RAUDA);
    renderTable(tablaRauda, VENTAS_RAUDA, COLS_RAUDA);
    showToast("✅ Venta RAUDA registrada");
    try{ await ghPutFile("data/VENTAS_RAUDA.json", VENTAS_RAUDA, "Venta RAUDA"); }catch{}
    e.target.reset(); document.getElementById("cantRauda").value="1"; document.getElementById("impRauda").value="0";
  });
});
