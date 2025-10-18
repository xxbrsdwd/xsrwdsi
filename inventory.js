/* =========================
   SYNC GitHub (sin guardar token)
   ========================= */

// Claves de almacenamiento
const LS_META_KEY = "GH_SYNC_META";          // owner, repo, branch, path, autoCommit (sin token)
const SS_TOKEN_KEY = "GH_TOKEN_SESSION";     // token solo en sessionStorage (se borra al cerrar)

// Cargar meta (sin token)
function loadGhMeta(){
  try { return JSON.parse(localStorage.getItem(LS_META_KEY) || "{}"); }
  catch { return {}; }
}

// Guardar meta (sin token)
function saveGhMeta(meta){
  localStorage.setItem(LS_META_KEY, JSON.stringify(meta || {}));
}

// Guardar token SOLO en sessionStorage
function saveGhTokenSession(token){
  if (token) sessionStorage.setItem(SS_TOKEN_KEY, token);
  else sessionStorage.removeItem(SS_TOKEN_KEY);
}

// Leer token de sessionStorage
function loadGhTokenSession(){
  return sessionStorage.getItem(SS_TOKEN_KEY) || "";
}

// Config unificada para usar en commits (meta + token de sesión)
function currentGhCfg(){
  const meta = loadGhMeta();
  const token = loadGhTokenSession();
  return {
    owner: meta.owner || "",
    repo: meta.repo || "",
    branch: meta.branch || "main",
    path: meta.path || "data/INVENTARIO.json",
    autoCommit: !!meta.autoCommit,
    token: token || null
  };
}

// ACTUALIZA el helper global usado por el resto del código
function loadGhCfg(){ return currentGhCfg(); }

// Prefill del modal SYNC sin token
function fillSyncModal(){
  const meta = loadGhMeta();
  const form = document.getElementById("formSync");
  if (!form) return;

  form.owner.value  = meta.owner  ?? "";
  form.repo.value   = meta.repo   ?? "";
  form.branch.value = meta.branch ?? "main";
  form.path.value   = meta.path   ?? "data/INVENTARIO.json";
  document.getElementById("autoCommit").checked = !!meta.autoCommit;

  // Token SIEMPRE vacío (por seguridad)
  form.token.value = "";
}

// Test a la API de contenidos de GitHub
async function testGhConnection(owner, repo, branch, path, token){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`;
  const headers = {"Accept":"application/vnd.github+json"};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(url, {headers});
  return r;
}

// PUT a contenidos (solo manda sha si existe)
function b64(str){ return btoa(unescape(encodeURIComponent(str))); }

async function ghGetSha(owner,repo,branch,path,token){
  const u = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`;
  const h = {"Accept":"application/vnd.github+json"};
  if (token) h["Authorization"] = `Bearer ${token}`;
  const r = await fetch(u,{headers:h});
  if (r.status === 200){
    const j = await r.json();
    return j.sha || null;
  }
  return null;
}

async function ghPutFileRaw({owner,repo,branch,token,path,content,msg}){
  if (!token) throw new Error("No hay token para subir.");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const sha = await ghGetSha(owner,repo,branch,path,token);
  const body = {
    message: msg || "Auto-commit",
    branch,
    content: b64(JSON.stringify(content,null,2)),
    ...(sha ? {sha} : {})
  };
  const r = await fetch(url,{
    method:"PUT",
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });
  if(!r.ok){
    const txt = await r.text();
    throw new Error(`PUT ${r.status}: ${txt}`);
  }
}

// ------------ Bind de UI Sync ------------
window.addEventListener("DOMContentLoaded", ()=>{
  const syncModal = document.getElementById("syncModal");
  const formSync  = document.getElementById("formSync");
  const btnTest   = document.getElementById("btnTestGH");
  const btnPush   = document.getElementById("btnPushNow");
  const statusEl  = document.getElementById("syncStatus");

  // Rellena TODO MENOS TOKEN al abrir
  if (syncModal){
    syncModal.addEventListener("show.bs.modal", fillSyncModal);
  } else {
    // si no hay modal, igual pre-carga meta
    fillSyncModal();
  }

  // Guardar ajustes (sin token a LS; token a session)
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

    const token = formSync.token.value.trim();
    if (token) saveGhTokenSession(token);  // sesión solamente

    statusEl.innerHTML = `<span class="text-success">✅ Ajustes guardados (token no se guarda en disco).</span>`;
  });

  // Probar conexión
  btnTest?.addEventListener("click", async ()=>{
    statusEl.textContent = "Probando conexión...";
    const meta = loadGhMeta();
    const tok  = document.getElementById("formSync").token.value.trim() || loadGhTokenSession();

    try{
      const r = await testGhConnection(
        meta.owner || "xxbrsdwd",
        meta.repo  || "xsrwdsi",
        meta.branch|| "main",
        meta.path  || "data/INVENTARIO.json",
        tok || null
      );
      if (r.status === 200){
        statusEl.innerHTML = `<span class="text-success">✅ OK. Archivo existe y es accesible.</span>`;
      } else if (r.status === 404){
        statusEl.innerHTML = `<span class="text-warning">⚠️ Repo/archivo no encontrado (se creará al primer guardado si el token tiene permisos).</span>`;
      } else if (r.status === 403 || r.status === 401){
        statusEl.innerHTML = `<span class="text-danger">⛔ Token inválido o sin permisos (Contents: Read & Write).</span>`;
      } else {
        statusEl.innerHTML = `<span class="text-danger">⛔ Error ${r.status} al probar. Revisa owner/repo/branch/path.</span>`;
      }
    }catch(err){
      statusEl.innerHTML = `<span class="text-danger">⛔ Error de red: ${err.message}</span>`;
    }
  });

  // Subir ahora (inventario actual)
  btnPush?.addEventListener("click", async ()=>{
    statusEl.textContent = "Subiendo inventario...";
    const cfg = currentGhCfg();
    if (!cfg.token){
      statusEl.innerHTML = `<span class="text-danger">⛔ Ingresa el token en el campo Token (no se guarda en disco).</span>`;
      return;
    }
    try{
      // EMPRESA
      const invEmp = JSON.parse(localStorage.getItem("INVENTARIO_JSON") || "[]");
      await ghPutFileRaw({
        owner: cfg.owner || "xxbrsdwd",
        repo: cfg.repo || "xsrwdsi",
        branch: cfg.branch || "main",
        token: cfg.token,
        path: cfg.path || "data/INVENTARIO.json",
        content: Array.isArray(invEmp) ? invEmp : [],
        msg: "Subida manual desde Sync (EMPRESA)"
      });

      // RAUDA (opcional: descomenta si quieres subir también)
      // const invRau = JSON.parse(localStorage.getItem("INVENTARIO_RAUDA_JSON") || "[]");
      // await ghPutFileRaw({
      //   owner: cfg.owner || "xxbrsdwd",
      //   repo: cfg.repo || "xsrwdsi",
      //   branch: cfg.branch || "main",
      //   token: cfg.token,
      //   path: "data/INVENTARIO_RAUDA.json",
      //   content: Array.isArray(invRau) ? invRau : [],
      //   msg: "Subida manual desde Sync (RAUDA)"
      // });

      statusEl.innerHTML = `<span class="text-success">✅ Inventario subido al repo.</span>`;
    }catch(err){
      statusEl.innerHTML = `<span class="text-danger">⛔ Error subiendo: ${err.message}</span>`;
    }
  });
});
