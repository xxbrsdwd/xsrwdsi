/* =====================================================
   Inventario con dos rubros: EMPRESA (igual que siempre) y RAUDA
   - GitHub Pages puro + auto-commit opcional (GH_CFG)
   - No rompe tu inventario actual: EMPRESA conserva claves/archivo
   - RAUDA usa su propio JSON/LS y su propia tabla
   ===================================================== */

let INV_EMPRESA = [];
let INV_RAUDA   = [];

// === Config GH (reutiliza tu config existente del Sync) ===
function loadGhCfg() {
  try { const s = localStorage.getItem("GH_SYNC_CFG"); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
}
const GH_CFG = loadGhCfg();

function b64(str){ return btoa(unescape(encodeURIComponent(str))); }
async function ghPutFile(path,content,msg="Auto-commit inventario"){
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

// === Utils ===
function showToast(msg, type="success", ms=1500) {
  const t = document.getElementById("toast");
  if(!t) return alert(msg);
  t.textContent = msg;
  t.className = `alert alert-${type}`;
  t.classList.remove("d-none");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>t.classList.add("d-none"), ms);
}
async function fetchJSON(url){ try{ const r=await fetch(url,{cache:"no-store"}); if(r.ok) return r.json(); }catch{} return []; }
function saveLocal(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function loadLocal(k){ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):[]; }catch{ return []; } }
function toNum(n){ const v=Number(n); return isNaN(v)?0:v; }

// === Carga inicial (preferir localStorage; si vacío, JSON del repo) ===
async function cargarInventarios(){
  // EMPRESA: mantiene las mismas claves/archivo que ya usabas
  INV_EMPRESA = loadLocal("INVENTARIO_JSON");
  if(!Array.isArray(INV_EMPRESA) || !INV_EMPRESA.length){
    INV_EMPRESA = await fetchJSON("data/INVENTARIO.json");
  }

  // RAUDA: nuevo dataset
  INV_RAUDA = loadLocal("INVENTARIO_RAUDA_JSON");
  if(!Array.isArray(INV_RAUDA) || !INV_RAUDA.length){
    INV_RAUDA = await fetchJSON("data/INVENTARIO_RAUDA.json");
  }

  // Asegurar arrays
  INV_EMPRESA = Array.isArray(INV_EMPRESA) ? INV_EMPRESA : [];
  INV_RAUDA   = Array.isArray(INV_RAUDA)   ? INV_RAUDA   : [];
}

// === Guardar (LS + repo si auto-commit) ===
async function persistEmpresa(msg="Actualizar inventario EMPRESA"){
  saveLocal("INVENTARIO_JSON", INV_EMPRESA);
  await ghPutFile("data/INVENTARIO.json", INV_EMPRESA, msg);
}
async function persistRauda(msg="Actualizar inventario RAUDA"){
  saveLocal("INVENTARIO_RAUDA_JSON", INV_RAUDA);
  await ghPutFile("data/INVENTARIO_RAUDA.json", INV_RAUDA, msg);
}

// === Render tablas ===
function renderTablaEmpresa(){
  const el = document.getElementById("tablaInventario");
  if(!el) return;
  if(!INV_EMPRESA.length){ el.innerHTML="<tr><td class='text-muted'>Sin productos</td></tr>"; return; }
  el.innerHTML = `
    <thead><tr>
      <th>Nombre</th><th>Costo</th><th>Venta</th><th>Cantidad</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${INV_EMPRESA.map((p,i)=>`
        <tr>
          <td>${p.nombre}</td>
          <td>${toNum(p.costo).toFixed(2)}</td>
          <td>${toNum(p.venta).toFixed(2)}</td>
          <td>${toNum(p.cantidad)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-set="EMPRESA" data-idx="${i}" data-action="edit">Editar</button>
            <button class="btn btn-sm btn-outline-danger"  data-set="EMPRESA" data-idx="${i}" data-action="del">Eliminar</button>
          </td>
        </tr>
      `).join("")}
    </tbody>
  `;
}
function renderTablaRauda(){
  const el = document.getElementById("tablaInventarioRauda");
  if(!el) return;
  if(!INV_RAUDA.length){ el.innerHTML="<tr><td class='text-muted'>Sin productos RAUDA</td></tr>"; return; }
  el.innerHTML = `
    <thead><tr>
      <th>Nombre</th><th>Costo</th><th>Venta</th><th>Cantidad</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${INV_RAUDA.map((p,i)=>`
        <tr>
          <td>${p.nombre}</td>
          <td>${toNum(p.costo).toFixed(2)}</td>
          <td>${toNum(p.venta).toFixed(2)}</td>
          <td>${toNum(p.cantidad)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-set="RAUDA" data-idx="${i}" data-action="edit">Editar</button>
            <button class="btn btn-sm btn-outline-danger"  data-set="RAUDA" data-idx="${i}" data-action="del">Eliminar</button>
          </td>
        </tr>
      `).join("")}
    </tbody>
  `;
}
function rerender(){ renderTablaEmpresa(); renderTablaRauda(); }

// === Alta / Edición ===
let editCtx = null; // {set: 'EMPRESA'|'RAUDA', idx: number}

function leerCampos(){
  // Ajusta ids si tus inputs tienen otros nombres
  const nombre   = (document.getElementById("nombre")?.value||"").trim();
  const costo    = toNum(document.getElementById("costo")?.value);
  const venta    = toNum(document.getElementById("venta")?.value);
  const cantidad = toNum(document.getElementById("cantidad")?.value);
  return {nombre, costo, venta, cantidad};
}
function setCampos(p){
  if(document.getElementById("nombre"))   document.getElementById("nombre").value = p?.nombre ?? "";
  if(document.getElementById("costo"))    document.getElementById("costo").value = p?.costo ?? 0;
  if(document.getElementById("venta"))    document.getElementById("venta").value = p?.venta ?? 0;
  if(document.getElementById("cantidad")) document.getElementById("cantidad").value = p?.cantidad ?? 0;
}

async function onSubmitProducto(e){
  e.preventDefault();
  const rubroSel = (document.getElementById("rubroInventario")?.value || "EMPRESA").toUpperCase();
  const p = leerCampos();
  if(!p.nombre){ showToast("Nombre requerido","danger"); return; }
  if(p.costo<0 || p.venta<0 || p.cantidad<0){ showToast("Valores no válidos","danger"); return; }

  if(editCtx){
    // Editar
    if(editCtx.set==="EMPRESA"){
      INV_EMPRESA[editCtx.idx] = p;
      await persistEmpresa("Editar producto EMPRESA");
    }else{
      INV_RAUDA[editCtx.idx] = p;
      await persistRauda("Editar producto RAUDA");
    }
    editCtx=null;
    showToast("Producto actualizado");
  }else{
    // Alta
    if(rubroSel==="RAUDA"){
      INV_RAUDA.push(p);
      await persistRauda("Agregar producto RAUDA");
      showToast("Producto agregado a RAUDA");
    }else{
      INV_EMPRESA.push(p);
      await persistEmpresa("Agregar producto EMPRESA");
      showToast("Producto agregado a EMPRESA");
    }
  }

  rerender();
  // limpia formulario
  setCampos({nombre:"",costo:0,venta:0,cantidad:0});
  const form = e.target;
  if(form && form.reset) form.reset();
  // vuelve el rubro por defecto EMPRESA
  const rubro = document.getElementById("rubroInventario");
  if(rubro) rubro.value = "EMPRESA";
}

// === Delegación de eventos para Editar/Eliminar ===
document.addEventListener("click", async (ev)=>{
  const btn = ev.target.closest("button[data-action]");
  if(!btn) return;
  const set = btn.getAttribute("data-set"); // EMPRESA | RAUDA
  const idx = Number(btn.getAttribute("data-idx"));
  const act = btn.getAttribute("data-action");

  if(act==="edit"){
    editCtx = {set, idx};
    const p = (set==="EMPRESA" ? INV_EMPRESA[idx] : INV_RAUDA[idx]) || {};
    setCampos(p);
    document.getElementById("rubroInventario") && (document.getElementById("rubroInventario").value=set);
    showToast(`Editando producto en ${set}`);
  }

  if(act==="del"){
    if(!confirm("¿Eliminar este producto?")) return;
    if(set==="EMPRESA"){
      INV_EMPRESA.splice(idx,1);
      await persistEmpresa("Eliminar producto EMPRESA");
    }else{
      INV_RAUDA.splice(idx,1);
      await persistRauda("Eliminar producto RAUDA");
    }
    rerender();
    showToast("Producto eliminado","warning");
  }
});

// === Inicialización ===
window.addEventListener("DOMContentLoaded", async ()=>{
  await cargarInventarios();

  // Bind del form (ajusta si tu form tiene otro id)
  const form = document.getElementById("formInventario") || document.getElementById("formProducto") || document.querySelector("form#formAdd") || document.querySelector("form");
  if(form) form.addEventListener("submit", onSubmitProducto);

  // Si no existe el selector todavía, crea uno por defecto (EMPRESA)
  if(!document.getElementById("rubroInventario")){
    const fake = document.createElement("input");
    fake.type="hidden"; fake.id="rubroInventario"; fake.value="EMPRESA";
    document.body.appendChild(fake);
  }

  // Render
  rerender();
});
