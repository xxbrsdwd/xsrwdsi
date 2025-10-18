/* =====================================================
   Módulo de Ventas - Sistema Brayan Raudales
   Compatible con GitHub Pages (local + auto-commit opcional)
   ===================================================== */

let INVENTARIO = [];
let VENTAS_EMPRESA = [];
let ENVIOS_MOTO = [];
let ENVIOS_CAEX = [];
let VENTAS_RAUDA = [];

// === Configuración GitHub (reutiliza la del inventario) ===
function loadGhCfg() {
  try {
    const s = localStorage.getItem("GH_SYNC_CFG");
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}
const GH_CFG = loadGhCfg();

// === Funciones utilitarias ===
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
async function fetchJSON(url){try{const r=await fetch(url,{cache:"no-store"});if(r.ok)return r.json()}catch{return[]}return[]}
function saveLocal(k,v){localStorage.setItem(k,JSON.stringify(v));}
function loadLocal(k){try{const s=localStorage.getItem(k);return s?JSON.parse(s):[]}catch{return[]}}
function b64(str){return btoa(unescape(encodeURIComponent(str)));}

// === Auto-commit a GitHub (igual al inventario) ===
async function ghPutFile(path,content,msg="Auto-commit ventas"){
  if(!GH_CFG.token) return;
  const {owner,repo,branch,token}=GH_CFG;
  const meta=await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,{
    headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`}
  });
  let sha=null;
  if(meta.status===200){const j=await meta.json();sha=j.sha;}
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

// === Render tablas ===
function render(tabla,arr){
  if(!arr.length){tabla.innerHTML="<tr><td class='text-muted'>Sin registros</td></tr>";return;}
  const keys=Object.keys(arr[0]);
  tabla.innerHTML="<thead><tr>"+keys.map(k=>`<th>${k}</th>`).join("")+"</tr></thead>"+
  "<tbody>"+arr.map(r=>"<tr>"+keys.map(k=>`<td>${r[k]}</td>`).join("")+"</tr>").join("")+"</tbody>";
}

// === Cargar inventario ===
async function cargarInventario(){
  const local=loadLocal("INVENTARIO_JSON");
  if(local?.length) return local;
  const remoto=await fetchJSON("data/INVENTARIO.json");
  return remoto;
}

// === Inicialización ===
window.addEventListener("DOMContentLoaded",async()=>{
  INVENTARIO=await cargarInventario();

  // llenar selects
  const prods=INVENTARIO.map(p=>p.nombre);
  const selects=["prodVentaDia","prodEnvioMoto","prodEnvioCaex"];
  selects.forEach(id=>{
    const s=document.getElementById(id);
    s.innerHTML="<option value=''>Seleccione...</option>"+prods.map(p=>`<option>${p}</option>`).join("");
  });

  // cargar ventas locales
  VENTAS_EMPRESA=loadLocal("VENTAS_EMPRESA");
  ENVIOS_MOTO=loadLocal("ENVIOS_MOTO");
  ENVIOS_CAEX=loadLocal("ENVIOS_CAEX");
  VENTAS_RAUDA=loadLocal("VENTAS_RAUDA");

  render(tablaVentaDia,VENTAS_EMPRESA);
  render(tablaEnvioMoto,ENVIOS_MOTO);
  render(tablaEnvioCaex,ENVIOS_CAEX);
  render(tablaRauda,VENTAS_RAUDA);

  // === Ventas del día ===
  formVentaDia.addEventListener("submit",async e=>{
    e.preventDefault();
    const nombre=prodVentaDia.value;
    const cant=Number(cantVentaDia.value);
    const desc=Number(descVentaDia.value)||0;
    const imp=impVentaDia.value.trim();
    const prod=INVENTARIO.find(p=>p.nombre===nombre);
    if(!prod) return showToast("Producto no encontrado","danger");
    const gan=(prod.venta-prod.costo)*cant-desc;
    const reg={Fecha:fechaHora(),Producto:nombre,Cant:cant,"Ganancia LPS":gan.toFixed(2),Descuento:desc,Impuesto:imp};
    VENTAS_EMPRESA.push(reg);
    saveLocal("VENTAS_EMPRESA",VENTAS_EMPRESA);
    render(tablaVentaDia,VENTAS_EMPRESA);
    showToast("✅ Venta registrada correctamente");
    if(GH_CFG.autoCommit) ghPutFile("data/VENTAS_EMPRESA.json",VENTAS_EMPRESA);
    e.target.reset();
  });

  // === Envíos Moto ===
  formEnvioMoto.addEventListener("submit",async e=>{
    e.preventDefault();
    const nombre=prodEnvioMoto.value;
    const cant=Number(cantEnvioMoto.value);
    const envio=Number(costoEnvioMoto.value)||0;
    const desc=Number(descEnvioMoto.value)||0;
    const imp=impEnvioMoto.value.trim();
    const prod=INVENTARIO.find(p=>p.nombre===nombre);
    if(!prod) return showToast("Producto no encontrado","danger");
    const gan=(prod.venta-prod.costo)*cant-desc;
    const reg={Fecha:fechaHora(),Producto:nombre,Cant:cant,"Costo Envio":envio,"Ganancia LPS":gan.toFixed(2),Descuento:desc,Impuesto:imp};
    ENVIOS_MOTO.push(reg);
    saveLocal("ENVIOS_MOTO",ENVIOS_MOTO);
    render(tablaEnvioMoto,ENVIOS_MOTO);
    showToast("✅ Envío Moto registrado");
    if(GH_CFG.autoCommit) ghPutFile("data/ENVIOS_MOTO.json",ENVIOS_MOTO);
    e.target.reset();
  });

  // === Envíos Caex ===
  formEnvioCaex.addEventListener("submit",async e=>{
    e.preventDefault();
    const nombre=prodEnvioCaex.value;
    const cant=Number(cantEnvioCaex.value);
    const envio=Number(costoEnvioCaex.value)||0;
    const desc=Number(descEnvioCaex.value)||0;
    const imp=impEnvioCaex.value.trim();
    const prod=INVENTARIO.find(p=>p.nombre===nombre);
    if(!prod) return showToast("Producto no encontrado","danger");
    const gan=((prod.venta-prod.costo)*cant)-envio-desc;
    const reg={Fecha:fechaHora(),Producto:nombre,Cant:cant,"Costo Envio":envio,"Ganancia LPS":gan.toFixed(2),Descuento:desc,Impuesto:imp};
    ENVIOS_CAEX.push(reg);
    saveLocal("ENVIOS_CAEX",ENVIOS_CAEX);
    render(tablaEnvioCaex,ENVIOS_CAEX);
    showToast("✅ Envío Caex registrado");
    if(GH_CFG.autoCommit) ghPutFile("data/ENVIOS_CAEX.json",ENVIOS_CAEX);
    e.target.reset();
  });

  // === Rauda ===
  formRauda.addEventListener("submit",async e=>{
    e.preventDefault();
    const descR=descRauda.value.trim();
    const inv=Number(invRauda.value);
    const vend=Number(vendRauda.value);
    const desc=Number(descRauda.value)||0;
    const imp=impRauda.value.trim();
    const com=comRauda.value.trim();
    const gan=(vend-inv)-desc;
    const reg={Fecha:fechaHora(),Descripción:descR,"Inversión LPS":inv,"Vendido LPS":vend,"Ganancia LPS":gan.toFixed(2),Descuento:desc,Impuesto:imp,Comentario:com};
    VENTAS_RAUDA.push(reg);
    saveLocal("VENTAS_RAUDA",VENTAS_RAUDA);
    render(tablaRauda,VENTAS_RAUDA);
    showToast("✅ Venta Rauda registrada");
    if(GH_CFG.autoCommit) ghPutFile("data/VENTAS_RAUDA.json",VENTAS_RAUDA);
    e.target.reset();
  });
});
