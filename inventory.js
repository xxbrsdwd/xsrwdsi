/* =====================================================
   INVENTARIO - EMPRESA + RAUDA (GitHub Pages puro)
   ===================================================== */

let INV_EMPRESA = [];
let INV_RAUDA   = [];

/* ============== Config GitHub (meta en LS, token en SS) ============== */
const LS_META_KEY = "GH_SYNC_META";       // { owner, repo, branch, path, autoCommit }
const SS_TOKEN_KEY = "GH_TOKEN_SESSION";  // token (solo sesión)
const LEGACY_KEY   = "GH_SYNC_CFG";       // compat (antiguo)

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
    // path de EMPRESA (el de RAUDA lo fijo abajo)
    path:   (meta.path   || "data/INVENTARIO.json").trim(),
    autoCommit: !!meta.autoCommit,
    token: token || null
  };
}

function encodePathForGithub(p){ return (p||"").split("/").map(encodeURIComponent).join("/"); }
function b64(s){ return btoa(unescape(encodeURIComponent(s))); }

/* ============== GitHub API helpers ============== */
async function ghGetSha(path){
  const {owner,repo,branch,token} = loadGhCfg();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodePathForGithub(path)}?ref=${branch}`;
  const headers = {"Accept":"application/vnd.github+json"};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(url,{headers});
  if (r.status===200){ const j=await r.json(); return j.sha||null; }
  return null;
}
async function ghPutFile(path, content, msg="Auto-commit inventario"){
  const {owner,repo,branch,token,autoCommit} = loadGhCfg();
  if (!token || !autoCommit) return;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodePathForGithub(path)}`;
  const sha = await ghGetSha(path).catch(()=>null);
  const body = {
    message: msg,
    branch,
    content: b64(JSON.stringify(content,null,2)),
    ...(sha ? {sha} : {})
  };
  const r = await fetch(url,{
    method:"PUT",
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });
  if(!r.ok){
    const t = await r.text().catch(()=> "");
    console.error("GitHub PUT error:", r.status, t);
    showToast(`⛔ Error GitHub ${r.status}`, "danger", 2500);
  }
}

/* ============== Utils ============== */
function showToast(msg,type="info",ms=1500){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove("d-none");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>el.classList.add("d-none"), ms);
}
async function fetchJSON(u){ try{ const r=await fetch(u,{cache:"no-store"}); if(r.ok) return r.json(); }catch{} return []; }
function toNum(n){ const v=Number(n); return isNaN(v)?0:v; }
function saveLS(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function loadLS(k){ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):[]; }catch{ return []; } }

/* ============== Carga preferente local -> remoto ============== */
async function loadInvEmpresa(){ const l = loadLS("INVENTARIO_JSON");  return (Array.isArray(l)&&l.length)?l:await fetchJSON("data/INVENTARIO.json"); }
async function loadInvRauda(){   const l = loadLS("INVENTARIO_RAUDA_JSON"); return (Array.isArray(l)&&l.length)?l:await fetchJSON("data/INVENTARIO_RAUDA.json"); }

/* ============== Render ============== */
const COLS = ["#","Producto","Cantidad","Costo LPS","Venta LPS","Acciones"];

function renderInv(tableId, arr){
  const el = document.getElementById(tableId);
  if(!el) return;
  if(!Array.isArray(arr)) arr = [];
  if(!arr.length){
    el.innerHTML = `
      <thead><tr>${COLS.map(c=>`<th>${c}</th>`).join("")}</tr></thead>
      <tbody><tr><td colspan="6" class="text-muted">Sin registros</td></tr></tbody>`;
    return;
  }
  el.innerHTML = `
    <thead><tr>${COLS.map(c=>`<th>${c}</th>`).join("")}</tr></thead>
    <tbody>
      ${arr.map((p,i)=>`
        <tr>
          <td>${i+1}</td>
          <td>${p.nombre||""}</td>
          <td>${p.cantidad??0}</td>
          <td>L ${toNum(p.costo).toFixed(2)}</td>
          <td>L ${toNum(p.venta).toFixed(2)}</td>
          <td></td>
        </tr>`).join("")}
    </tbody>`;
}

/* ============== Guardar por rubro ============== */
async function persistInventario(rubro){
  if(rubro==="RAUDA"){
    saveLS("INVENTARIO_RAUDA_JSON", INV_RAUDA);
    await ghPutFile("data/INVENTARIO_RAUDA.json", INV_RAUDA, "Actualizar inventario RAUDA");
  }else{
    saveLS("INVENTARIO_JSON", INV_EMPRESA);
    const {path} = loadGhCfg(); // path de EMPRESA desde el modal
    await ghPutFile(path || "data/INVENTARIO.json", INV_EMPRESA, "Actualizar inventario EMPRESA");
  }
}

/* ============== Init ============== */
window.addEventListener("DOMContentLoaded", async ()=>{
  // Carga inicial (si no hay local, lee del repo)
  INV_EMPRESA = await loadInvEmpresa();
  INV_RAUDA   = await loadInvRauda();

  // Render inicial
  renderInv("tablaInventario",      INV_EMPRESA);
  renderInv("tablaInventarioRauda", INV_RAUDA);

  // --- Formulario Agregar ---
  const form = document.getElementById("formAgregar");
  if(form){
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const nombre   = (document.getElementById("nombre")?.value||"").trim();
      const cantidad = toNum(document.getElementById("cantidad")?.value||0);
      const costo    = toNum(document.getElementById("costo")?.value||0);
      const venta    = toNum(document.getElementById("venta")?.value||0);
      const rubro    = (document.getElementById("rubroInventario")?.value||"EMPRESA").toUpperCase();

      if(!nombre) return showToast("Escribe el nombre del producto","warning");
      const item = { nombre, cantidad, costo, venta };

      if(rubro==="RAUDA"){
        INV_RAUDA.push(item);
        renderInv("tablaInventarioRauda", INV_RAUDA);
      }else{
        INV_EMPRESA.push(item);
        renderInv("tablaInventario", INV_EMPRESA);
      }
      await persistInventario(rubro);
      showToast("✅ Producto agregado","success");
      form.reset();
    });
  }

  // --- Exportar JSON (exporta ambos inventarios en un ZIP lógico simple: 2 descargas) ---
  document.getElementById("btnExportJSON")?.addEventListener("click", ()=>{
    // Descarga EMPRESA
    const a1=document.createElement("a");
    a1.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(INV_EMPRESA,null,2));
    a1.download="INVENTARIO_EMPRESA.json";
    a1.click();
    // Descarga RAUDA
    const a2=document.createElement("a");
    a2.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(INV_RAUDA,null,2));
    a2.download="INVENTARIO_RAUDA.json";
    a2.click();
  });

  // --- Importar JSON (importa al rubro seleccionado) ---
  document.getElementById("importFile")?.addEventListener("change", async (ev)=>{
    const file = ev.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const data = JSON.parse(text);
      const rubro = (document.getElementById("rubroInventario")?.value||"EMPRESA").toUpperCase();
      if(!Array.isArray(data)) throw new Error("JSON inválido");
      if(rubro==="RAUDA"){ INV_RAUDA = data; renderInv("tablaInventarioRauda", data); }
      else{ INV_EMPRESA = data; renderInv("tablaInventario", data); }
      await persistInventario(rubro);
      showToast("✅ Inventario importado","success");
    }catch(err){
      showToast("⛔ JSON inválido","danger");
    }finally{
      ev.target.value="";
    }
  });
});
