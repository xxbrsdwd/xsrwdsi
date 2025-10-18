
# Sistema de Inventario — 100% GitHub Pages (sin servidores)

Este paquete funciona **solo** con GitHub Pages. Guarda el inventario en:
1) **Tu navegador** (localStorage) — inmediato y sin internet.
2) **Opcional**: hace **commit** directo al repositorio con el **GitHub API** usando un **PAT** (token) que tú pegas en la app. Así el inventario queda en `data/INVENTARIO.json` del repo y se comparte entre dispositivos.

> La interfaz y el flujo de Inventario se mantienen: agregar/editar/eliminar, exportar/importar, modal de edición y alertas.

## Cómo publicar
1. Sube todo el contenido de esta carpeta a un repositorio (ej. `SistemaInventarioWeb`).
2. En `Settings → Pages`, activa GitHub Pages con “Deploy from branch” (main / root).
3. Abre tu página: `https://TU_USUARIO.github.io/SistemaInventarioWeb/`.

## Sincronización con GitHub (opcional)
- Abre el botón **⚙️ Sync** en la barra.
- Completa: `owner`, `repo`, `branch (main)`, `path (data/INVENTARIO.json)`, y pega tu **Token (PAT)**.
- Marca **Auto-commit al guardar** si quieres que cada cambio suba solo.
- **Probar conexión** te dice si el archivo existe o se creará.
- **Subir ahora** hace un commit manual inmediato.

### Crear un PAT seguro
- Ve a `Settings → Developer settings → Fine-grained personal access tokens`.
- Crea uno **restringido a 1 repositorio**, con permiso **Repository permissions → Contents: Read and Write**.
- Copia el token y pégalo en la app (se guarda solo en tu navegador). **No lo publiques**.

## Notas
- Sin el PAT, todo funciona localmente (persistente por navegador/dispositivo).
- Con PAT, el archivo `data/INVENTARIO.json` del repo se mantiene actualizado, y podrás cargarlo en otros dispositivos.
- La app usa un de-bounce de ~900ms para evitar demasiados commits seguidos.
