/* =====================================================
   INVENTARIO - EMPRESA + RAUDA (GitHub Pages puro) [PATH FIX]
   ===================================================== */

let INV_EMPRESA = [];
let INV_RAUDA   = [];

/* ===== Config GitHub: meta en localStorage, token en sessionStorage ===== */
const LS_META_KEY = "GH_SYNC_META";       // { owner, repo, branch, path, autoCommit }
const SS_TOKEN_KEY = "GH_TOKEN_SESSION";  // token (solo sesión)
const LEGACY_KEY   = "GH_SYNC_CFG";       // compat (antiguo)

function loadGhMeta(){ try{ return JSON.parse(localStorage.getItem(LS_META_KEY)||"{}"); }catch{ return {}; } }
function saveGhMeta(meta){ localStorage.setItem(LS_META_KEY, JSON.stringify(meta||{})); }
function loadGhTokenSession(){ return sessionStorage.getItem(SS_TOKEN_KEY) || null; }
function saveGhTokenSession(token){ if(token) sessionStorage.setItem(SS_TOKEN_KEY, token); }
function loadLegacyCfg(){ try{ return JSON.parse(localStorage.getItem(LEGACY_KEY)||"{}"); }catch{ return {}; } }

function loadGhCfg(){
  const meta = loadGhMeta();
  const token = loadGhTokenSession() || (loadLegacyCfg().token || null);
  return {
    owner:  (meta.owner  || "xxbrsdwd").trim(),
    repo:   (meta.repo   || "xsrwdsi").trim(),
    branch: (meta.branch || "main").trim(),
    path:   (meta.path   || "data/INVENTARIO.json").trim(),  // ruta EMPRESA
    autoCommit: !!meta.autoCommit,
    token: token || null
  };
}

function encodePathForGithub(p){ return (p||"").split("/").map(encodeURIComponent).join("/"); }
function b64(s){ return btoa(unescape(encodeURIComponent(s))); }
function b64ToUtf8(b64){ try{ return decodeURIComponent(escape(atob(b64))); }catch{ return atob(b64); } }

async function ghGetSha(path){
  const {owner,repo,branch,token} = loadGhCfg();
  const url = `https://api.github.com/repos/${owner}/{repo}/contents/${encodePathForGithub(path)}?ref=${branch}`.replace("{repo}", repo)
  const headers = {"Accept":"application/vnd.github+json"};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(url,{headers,cache:"no-store"});
  if (r.status===200){ const j=await r.json(); return j.sha||null; }
  return null;
}
async function ghPutFile(path, content, msg="Auto-commit inventario"){
  const {owner,repo,branch,token,autoCommit} = loadGhCfg();
  if (!token || !autoCommit) return;
  const url = `https://api.github.com/repos/${owner}/{repo}/contents/${encodePathForGithub(path)}`.replace("{repo}", repo)
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

/* ===== Utils ===== */
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
async function fetchGHJSON(path){
  const {owner,repo,branch,token} = loadGhCfg();
  if(!owner||!repo||!branch||!path) return null;
  const url = `https://api.github.com/repos/${owner}/{repo}/contents/${encodePathForGithub(path)}?ref=${branch}`.replace("{repo}", repo)
  const headers = {"Accept":"application/vnd.github+json"};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try{
    const r = await fetch(url,{headers,cache:"no-store"});
    if(!r.ok) return null;
    const j = await r.json();
    if(j && j.content){
      const raw = b64ToUtf8(j.content);
      return JSON.parse(raw);
    }
  }catch{}
  return null;
}
function toNum(n){ const v=Number(n); return isNaN(v)?0:v; }
function saveLS(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function loadLS(k){ try{ const s=localStorage.getItem(k); return s?JSON.parse(s):[]; }catch{ return []; } }

/* ===== Preferir GH path -> sitio -> local ===== */
async function loadInvEmpresa(){
  const cfg = loadGhCfg();
  const fromGH = await fetchGHJSON(cfg.path || "data/INVENTARIO.json");
  if (Array.isArray(fromGH)) { saveLS("INVENTARIO_JSON", fromGH); return fromGH; }
  const site = await fetchJSON("data/INVENTARIO.json");
  if (Array.isArray(site) && site.length) { saveLS("INVENTARIO_JSON", site); return site; }
  return loadLS("INVENTARIO_JSON");
}
async function loadInvRauda(){
  const site = await fetchJSON("data/INVENTARIO_RAUDA.json");
  if (Array.isArray(site) && site.length) { saveLS("INVENTARIO_RAUDA_JSON", site); return site; }
  return loadLS("INVENTARIO_RAUDA_JSON");
}

/* ===== Render ===== */
const COLS = ["#","Producto","Cantidad","Costo LPS","Venta LPS","Acciones"];
function renderInv(tableId, arr){
  const el = document.getElementById(tableId);
  if(!el) return;
  if(!Array.isArray(arr) || !arr.length){
    el.innerHTML = `<thead><tr>${COLS.map(c=>`<th>${c}</th>`).join("")}</tr></thead>
    <tbody><tr><td colspan="6" class="text-muted">Sin registros</td></tr></tbody>`;
    return;
  }
  el.innerHTML = `<thead><tr>${COLS.map(c=>`<th>${c}</th>`).join("")}</tr></thead>
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

/* ===== Persistencia por rubro ===== */
async function persistInventario(rubro){
  if(rubro==="RAUDA"){
    saveLS("INVENTARIO_RAUDA_JSON", INV_RAUDA);
    await ghPutFile("data/INVENTARIO_RAUDA.json", INV_RAUDA, "Actualizar inventario RAUDA");
  }else{
    saveLS("INVENTARIO_JSON", INV_EMPRESA);
    const {path} = loadGhCfg();
    await ghPutFile(path || "data/INVENTARIO.json", INV_EMPRESA, "Actualizar inventario EMPRESA");
  }
}

/* ===== Sync UI ===== */
function fillSyncModal(){
  const form = document.getElementById("formSync");
  if(!form) return;
  const meta = loadGhMeta();
  form.owner.value  = meta.owner  ?? "xxbrsdwd";
  form.repo.value   = meta.repo   ?? "xsrwdsi";
  form.branch.value = meta.branch ?? "main";
  form.path.value   = meta.path   ?? "data/INVENTARIO.json";
  document.getElementById("autoCommit").checked = !!meta.autoCommit;
  // token NO se prellena por seguridad
  form.token.value = "";
}

async function testGh(owner,repo,branch,path,token){
  const url = `https://api.github.com/repos/${owner}/{repo}/contents/${encodePathForGithub(path)}?ref=${branch}`.replace("{repo}", repo)
  const h = {"Accept":"application/vnd.github+json"};
  if (token) h["Authorization"] = `Bearer ${token}`;
  return await fetch(url, {headers:h});
}

/* ===== Init ===== */
window.addEventListener("DOMContentLoaded", async ()=>{
  INV_EMPRESA = await loadInvEmpresa();
  INV_RAUDA   = await loadInvRauda();

  renderInv("tablaInventario",      INV_EMPRESA);
  renderInv("tablaInventarioRauda", INV_RAUDA);

  // Form agregar
  const form = document.getElementById("formAgregar");
  form?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const nombre   = (document.getElementById("nombre")?.value||"").trim();
    const cantidad = toNum(document.getElementById("cantidad")?.value||0);
    const costo    = toNum(document.getElementById("costo")?.value||0);
    const venta    = toNum(document.getElementById("venta")?.value||0);
    const rubroSel = (document.getElementById("rubroInventario")?.value||"EMPRESA").toUpperCase();
    if(!nombre) return showToast("Escribe el nombre del producto","warning");

    const item = { nombre, cantidad, costo, venta };
    if(rubroSel==="RAUDA"){ INV_RAUDA.push(item); renderInv("tablaInventarioRauda", INV_RAUDA); }
    else{ INV_EMPRESA.push(item); renderInv("tablaInventario", INV_EMPRESA); }
    await persistInventario(rubroSel);
    showToast("✅ Producto agregado","success");
    form.reset();
  });

  // Exportar ambos inventarios
  document.getElementById("btnExportJSON")?.addEventListener("click", ()=>{
    const a1=document.createElement("a");
    a1.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(INV_EMPRESA,null,2));
    a1.download="INVENTARIO_EMPRESA.json"; a1.click();
    const a2=document.createElement("a");
    a2.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(INV_RAUDA,null,2));
    a2.download="INVENTARIO_RAUDA.json"; a2.click();
  });

  // Importar al rubro seleccionado
  document.getElementById("importFile")?.addEventListener("change", async (ev)=>{
    const file = ev.target.files?.[0]; if(!file) return;
    try{
      const json = JSON.parse(await file.text());
      const rubroSel = (document.getElementById("rubroInventario")?.value||"EMPRESA").toUpperCase();
      if(!Array.isArray(json)) throw new Error("JSON inválido");
      if(rubroSel==="RAUDA"){ INV_RAUDA = json; renderInv("tablaInventarioRauda", INV_RAUDA); }
      else{ INV_EMPRESA = json; renderInv("tablaInventario", INV_EMPRESA); }
      await persistInventario(rubroSel);
      showToast("✅ Inventario importado","success");
    }catch{ showToast("⛔ JSON inválido","danger"); }
    ev.target.value="";
  });

  // --- Sync modal ---
  const formSync  = document.getElementById("formSync");
  const btnTest   = document.getElementById("btnTestGH");
  const btnPush   = document.getElementById("btnPushNow");
  const statusEl  = document.getElementById("syncStatus");

  document.getElementById("syncModal")?.addEventListener("show.bs.modal", fillSyncModal);
  fillSyncModal();

  formSync?.addEventListener("submit", (e)=>{
    e.preventDefault();
    const meta = {
      owner:  formSync.owner.value.trim()  || "xxbrsdwd",
      repo:   formSync.repo.value.trim()   || "xsrwdsi",
      branch: formSync.branch.value.trim() || "main",
      path:   formSync.path.value.trim()   || "data/INVENTARIO.json",
      autoCommit: document.getElementById("autoCommit").checked
    };
    saveGhMeta(meta);
    const tok = formSync.token.value.trim();
    if (tok) saveGhTokenSession(tok);
    statusEl.innerHTML = `<span class="text-success">✅ Ajustes guardados. El token queda solo en esta sesión.</span>`;
  });

  btnTest?.addEventListener("click", async ()=>{
    statusEl.textContent = "Probando conexión...";
    const meta = loadGhMeta();
    const tok  = document.getElementById("formSync").token.value.trim() || loadGhTokenSession();
    try{
      const r = await testGh(meta.owner||"xxbrsdwd", meta.repo||"xsrwdsi", meta.branch||"main", meta.path||"data/INVENTARIO.json", tok||null);
      if (r.status===200)      statusEl.innerHTML = `<span class="text-success">✅ OK. Archivo existe.</span>`;
      else if (r.status===404) statusEl.innerHTML = `<span class="text-warning">⚠️ No existe (se creará al guardar).</span>`;
      else if (r.status===401 || r.status===403) statusEl.innerHTML = `<span class="text-danger">⛔ Token inválido o sin permisos.</span>`;
      else statusEl.innerHTML = `<span class="text-danger">⛔ Error ${r.status}.</span>`;
    }catch(err){
      statusEl.innerHTML = `<span class="text-danger">⛔ Error: ${err.message}</span>`;
    }
  });

  btnPush?.addEventListener("click", async ()=>{
    statusEl.textContent = "Subiendo inventarios...";
    const cfg = loadGhCfg();
    if(!cfg.token){ statusEl.innerHTML = `<span class="text-danger">⛔ Ingresa un token.</span>`; return; }
    try{
      await ghPutFile(cfg.path || "data/INVENTARIO.json", INV_EMPRESA, "Subida manual EMPRESA");
      await ghPutFile("data/INVENTARIO_RAUDA.json", INV_RAUDA, "Subida manual RAUDA");
      statusEl.innerHTML = `<span class="text-success">✅ Subido al repo.</span>`;
    }catch(err){
      statusEl.innerHTML = `<span class="text-danger">⛔ ${err.message}</span>`;
    }
  });
});
