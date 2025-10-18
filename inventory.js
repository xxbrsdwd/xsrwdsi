
/* =====================================================
   Inventario (100% GitHub Pages)
   - Persistencia local: localStorage
   - Opcional: commit directo al repo vía GitHub REST API (PAT)
   ===================================================== */

// ====== Estado ======
let INVENTARIO = [];
let GH_CFG = loadGhCfg(); // {owner, repo, branch, path, token, autoCommit}

// ====== Util ======
function showToast(msg, type="info", ms=1600) {
  const toast = document.getElementById("toast");
  toast.className = `alert alert-${type}`;
  toast.textContent = msg;
  toast.classList.remove("d-none");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("d-none"), ms);
}

function saveLocal() {
  try { localStorage.setItem("INVENTARIO_JSON", JSON.stringify(INVENTARIO)); }
  catch(e){ console.error(e); }
}

function loadLocal() {
  try {
    const s = localStorage.getItem("INVENTARIO_JSON");
    if (s) return JSON.parse(s);
  } catch(e) { console.error(e); }
  return null;
}

async function loadFromDataFallback() {
  try {
    const r = await fetch("data/INVENTARIO.json", {cache: "no-store"});
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch(e){ console.error(e); return []; }
}

function renderTabla() {
  const tbody = document.getElementById("tbodyInv");
  if (!INVENTARIO.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No hay productos registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = INVENTARIO.map((p, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${p.nombre}</td>
      <td>${p.cantidad}</td>
      <td>L ${Number(p.costo).toFixed(2)}</td>
      <td>L ${Number(p.venta).toFixed(2)}</td>
      <td class="d-flex gap-2">
        <button class="btn btn-warning btn-sm" data-action="editar" data-index="${i}" data-bs-toggle="modal" data-bs-target="#editarModal">Editar</button>
        <button class="btn btn-danger btn-sm" data-action="eliminar" data-index="${i}">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

// ====== GitHub Sync (opcional) ======
function loadGhCfg() {
  try {
    const s = localStorage.getItem("GH_SYNC_CFG");
    return s ? JSON.parse(s) : { owner:"", repo:"", branch:"main", path:"data/INVENTARIO.json", token:"", autoCommit:false };
  } catch(e){ return { owner:"", repo:"", branch:"main", path:"data/INVENTARIO.json", token:"", autoCommit:false }; }
}
function saveGhCfg(obj) {
  GH_CFG = Object.assign({}, GH_CFG, obj);
  localStorage.setItem("GH_SYNC_CFG", JSON.stringify(GH_CFG));
}

async function ghGetFile() {
  const {owner, repo, branch, path, token} = GH_CFG;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": token ? `Bearer ${token}` : undefined
    }
  });
  if (r.status === 404) return {exists:false};
  if (!r.ok) throw new Error(`GET ${r.status}`);
  const j = await r.json();
  return {exists:true, sha:j.sha};
}

function _b64(str) {
  // utf8 -> b64
  return btoa(unescape(encodeURIComponent(str)));
}

async function ghPutFile(contentStr, message="Inventario: auto-guardado") {
  const {owner, repo, branch, path, token} = GH_CFG;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  // obtener sha si existe
  let sha = null;
  try {
    const meta = await ghGetFile();
    if (meta.exists) sha = meta.sha;
  } catch(e){ /* ignore */ }

  const body = {
    message,
    branch,
    content: _b64(contentStr),
    sha: sha || undefined
  };

  const r = await fetch(url, {
    method:"PUT",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": token ? `Bearer ${token}` : undefined,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`PUT ${r.status}`);
  return r.json();
}

let _commitTimer = null;
function ghAutoCommit() {
  if (!GH_CFG.autoCommit || !GH_CFG.token) return;
  clearTimeout(_commitTimer);
  _commitTimer = setTimeout(async () => {
    try {
      await ghPutFile(JSON.stringify(INVENTARIO, null, 2));
      showToast("Inventario guardado en GitHub ✅", "success", 1200);
    } catch(e) {
      console.error(e);
      showToast("No se pudo guardar en GitHub", "danger", 1600);
    }
  }, 900); // de-bounce para evitar múltiples commits seguidos
}

// ====== Eventos ======
window.addEventListener("DOMContentLoaded", async () => {
  // Cargar inventario
  const local = loadLocal();
  if (local) {
    INVENTARIO = local;
  } else {
    INVENTARIO = await loadFromDataFallback();
    saveLocal();
  }
  renderTabla();

  // Agregar
  document.getElementById("formAgregar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nuevo = {
      nombre: (fd.get("nombre")||"").trim(),
      cantidad: Number(fd.get("cantidad")||0),
      costo: Number(fd.get("costo")||0),
      venta: Number(fd.get("venta")||0),
    };
    if (!nuevo.nombre) return showToast("Escribe un nombre.", "warning");
    INVENTARIO.push(nuevo);
    renderTabla();
    saveLocal();
    ghAutoCommit();
    e.target.reset();
    showToast("Producto agregado.");
  });

  // Acciones tabla
  document.getElementById("tbodyInv").addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const idx = Number(btn.dataset.index);

    if (btn.dataset.action === "eliminar") {
      if (!confirm("¿Eliminar este producto?")) return;
      INVENTARIO.splice(idx, 1);
      renderTabla();
      saveLocal();
      ghAutoCommit();
      showToast("Eliminado.");
    }
    if (btn.dataset.action === "editar") {
      const p = INVENTARIO[idx];
      document.getElementById("editIndex").value = idx;
      document.getElementById("editNombre").value = p.nombre;
      document.getElementById("editCantidad").value = p.cantidad;
      document.getElementById("editCosto").value = p.costo;
      document.getElementById("editVenta").value = p.venta;
    }
  });

  // Guardar edición
  document.getElementById("formEditar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const idx = Number(document.getElementById("editIndex").value);
    INVENTARIO[idx] = {
      nombre: document.getElementById("editNombre").value.trim(),
      cantidad: Number(document.getElementById("editCantidad").value || 0),
      costo: Number(document.getElementById("editCosto").value || 0),
      venta: Number(document.getElementById("editVenta").value || 0)
    };
    renderTabla();
    const modal = bootstrap.Modal.getInstance(document.getElementById("editarModal"));
    modal.hide();
    saveLocal();
    ghAutoCommit();
    showToast("Editado.");
  });

  // Exportar / Importar
  document.getElementById("btnExportJSON").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(INVENTARIO, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "INVENTARIO.json";
    a.click();
  });
  document.getElementById("importFile").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Formato inválido");
      INVENTARIO = data;
      renderTabla();
      saveLocal();
      ghAutoCommit();
      showToast("Importado.");
    } catch(err) {
      console.error(err);
      showToast("JSON inválido.", "danger");
    }
    e.target.value = "";
  });

  // ====== Sync modal ======
  const formSync = document.getElementById("formSync");
  const status = document.getElementById("syncStatus");
  const autoCommit = document.getElementById("autoCommit");

  // Prellenar
  formSync.owner.value = GH_CFG.owner || "";
  formSync.repo.value  = GH_CFG.repo || "";
  formSync.branch.value= GH_CFG.branch || "main";
  formSync.path.value  = GH_CFG.path || "data/INVENTARIO.json";
  formSync.token.value = GH_CFG.token || "";
  autoCommit.checked   = !!GH_CFG.autoCommit;

  formSync.addEventListener("submit", (e) => {
    e.preventDefault();
    saveGhCfg({
      owner: formSync.owner.value.trim(),
      repo: formSync.repo.value.trim(),
      branch: formSync.branch.value.trim() || "main",
      path: formSync.path.value.trim() || "data/INVENTARIO.json",
      token: formSync.token.value.trim(),
      autoCommit: !!autoCommit.checked
    });
    status.textContent = "Ajustes guardados ✅";
    setTimeout(()=> status.textContent="", 1500);
  });

  document.getElementById("btnTestGH").addEventListener("click", async () => {
    try {
      const res = await ghGetFile();
      status.textContent = res.exists ? "Conexión OK (archivo existe)" : "Conexión OK (archivo no existe, se creará)";
    } catch(e) {
      console.error(e);
      status.textContent = "Error de conexión";
    }
  });

  document.getElementById("btnPushNow").addEventListener("click", async () => {
    try {
      await ghPutFile(JSON.stringify(INVENTARIO, null, 2), "Inventario: subida manual");
      status.textContent = "Subido a GitHub ✅";
    } catch(e) {
      console.error(e);
      status.textContent = "No se pudo subir";
    }
  });
});
