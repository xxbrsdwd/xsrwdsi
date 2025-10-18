Sistema Brayan Raudales — GitHub Pages Puro
=================================================

Cómo usar
---------
1) Sube todo este contenido al repositorio `xxbrsdwd/xsrwdsi` (branch main).
2) Activa GitHub Pages (Build y Deploy → GitHub Actions).
3) Abre `index.html` y pulsa **⚙️ Sync**:
   - Owner: xxbrsdwd
   - Repo: xsrwdsi
   - Branch: main
   - Ruta EMPRESA: data/INVENTARIO.json
   - Token: pega tu PAT con permiso Repository → Contents: Read & Write (Only selected repository).
   - Marca **Auto-commit al guardar** si quieres subir automáticamente.
   - Guarda ajustes.

Seguridad del token
-------------------
- El token **no se guarda en disco**. Se mantiene solo en `sessionStorage` de esa pestaña.
- Al cerrar el navegador, deberás pegarlo de nuevo cuando quieras subir.

Lectura en móviles
------------------
- Si no hay datos locales, las páginas leen los JSON de `data/` del repo para mostrar inventario y ventas.
- Así puedes ver el estado desde cualquier teléfono sin token.

Archivos
--------
- index.html, inventory.js  → Inventario EMPRESA + RAUDA + Sync
- ventas.html, ventas.js    → Ventas (Día, Moto, Caex, Rauda) con descuento/impuesto
- resumen.html              → Tarjetas: #ventas, invertido, envíos moto, ganancias
- notas.html                → Bloc simple
- data/*.json               → Almacenamiento en el repo
- static/style.css          → Estilos mínimos
