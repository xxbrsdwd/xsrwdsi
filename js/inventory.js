// inventory.js - Sincronización GitHub Rauda Dev
// Autor: Brayan Raudales (@rauda_yt)

let GITHUB = {
  owner: "xxbrsdwd",  // tu usuario GitHub
  repo: "xsrwdsi",    // tu repositorio
  branch: "main",
  path: "data/inventario.json",
  token: ""
};

// === Conexión simplificada ===
function conectarGithub() {
  const token = prompt("🔑 Ingresa tu token de GitHub (ghp_...):", "");
  if (!token) {
    alert("⚠️ No se ingresó el token.");
    return;
  }
  GITHUB.token = token.trim();
  alert(`✅ Conectado a ${GITHUB.owner}/${GITHUB.repo}`);
}

// === Leer inventario desde GitHub ===
async function leerInventarioGitHub() {
  try {
    const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${GITHUB.path}?ref=${GITHUB.branch}`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${GITHUB.token}` }
    });
    if (!res.ok) throw new Error("No se pudo leer inventario desde GitHub.");
    const data = await res.json();
    const content = atob(data.content);
    return JSON.parse(content);
  } catch (err) {
    alert("❌ Error al leer inventario: " + err.message);
    return [];
  }
}

// === Guardar inventario en GitHub ===
async function guardarInventarioGitHub(datos) {
  try {
    const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${GITHUB.path}`;
    const getRes = await fetch(url, { headers: { Authorization: `token ${GITHUB.token}` } });
    const getData = await getRes.json();
    const sha = getData.sha;

    const nuevoContenido = btoa(JSON.stringify(datos, null, 2));
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Actualización de inventario (${new Date().toLocaleString()})`,
        content: nuevoContenido,
        branch: GITHUB.branch,
        sha
      })
    });

    if (!res.ok) throw new Error("Error al guardar inventario en GitHub.");
    alert("✅ Inventario guardado correctamente en GitHub.");
  } catch (err) {
    alert("❌ Error: " + err.message);
  }
}
