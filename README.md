# Landing · IA para el Sector Salud con Claude — BioMarketing

Landing page del taller práctico de automatizaciones con Claude IA para profesionales de la salud.
**Sábado 7 de noviembre de 2026 · Presencial en Cúcuta ($180.000) y virtual en vivo ($120.000).**

## Estructura

```
index.html                  Landing pública
admin.html                  Panel administrativo (imágenes, textos, precios, testimonios)
assets/css/styles.css       Estilos de la landing
assets/css/admin.css        Estilos del panel
assets/js/site-config.js    Configuración PUBLICADA (textos, precios, imágenes)
assets/js/store.js          Carga config + borrador del admin
assets/js/main.js           Interacciones, cuenta regresiva, formulario
assets/js/admin.js          Lógica del panel
integraciones/google-apps-script.gs   Guarda inscritos en Google Sheets + aviso por correo
```

Es un sitio 100% estático: no necesita servidor ni base de datos. Se puede subir a GitHub Pages, Netlify, Vercel o cualquier hosting (Hostinger, cPanel…).

## Panel administrativo

1. Abre `/admin.html`. Contraseña inicial: **`biomarketing2026`** (cámbiala en “Contraseña”).
2. En **Imágenes por sección** sube fondos e imágenes principales para cada sección (portada, problema, temario, certificado, tarjetas presencial/virtual, instructor, FAQ, llamado final). Se optimizan solas y puedes ajustar la intensidad del velo para que el texto siempre se lea.
3. **Galería** y **Testimonios** aparecen en la landing solo cuando tienen contenido.
4. **Guardar cambios** → los ves de inmediato en la landing desde ese mismo navegador.
5. **Publicar → Descargar site-config.js** → reemplaza `assets/js/site-config.js` en tu hosting. Así todos los visitantes ven los cambios.

## Inscripciones

El formulario se abre desde todos los botones. Al enviarlo:
- Si configuraste la URL de Google Apps Script, la inscripción se guarda en tu hoja de Google Sheets y te llega un correo.
- Se abre WhatsApp con todos los datos del inscrito para confirmar el pago.

Antes de publicar, en el panel configura: **número de WhatsApp**, **lugar del evento** e **instrucciones de pago**.

## Probar en local

```
python3 -m http.server 8080
# abrir http://localhost:8080
```
