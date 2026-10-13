# Landing · IA para el Sector Salud con Claude — BioMarketing

Taller práctico de automatizaciones con Claude IA para profesionales de la salud.
**Sábado 7 de noviembre de 2026 · 2:00 a 6:00 p.m. (hora Colombia) · Presencial en Cúcuta ($180.000) y virtual en vivo ($120.000).**
Dicta: **Juan Carlos Cáceres M.** — Bacteriólogo, MSc. en Administración de Instituciones de Salud, Esp. en Analítica de Datos e IA para el sector salud.

## Estructura

```
index.html                  Landing pública
admin.html                  Panel administrativo
assets/css/styles.css       Estilos de la landing
assets/css/admin.css        Estilos del panel
assets/js/site-config.js    Configuración PUBLICADA (textos, precios, imágenes, video, pago)
assets/js/store.js          Carga config + borrador del admin (IndexedDB)
assets/js/main.js           Animaciones, demo en vivo, inscripción y pago Bre-B
assets/js/diploma.js        Genera el certificado (canvas → PDF, sin librerías)
assets/js/admin.js          Lógica del panel: imágenes, textos, asistencia y certificados
integraciones/google-apps-script.gs   Backend gratuito: Sheets + Drive + Gmail
```

Sitio 100% estático: GitHub Pages, Netlify, Vercel o cualquier hosting.

## Flujo del inscrito

1. Llena el formulario → su cupo queda apartado 24 h (contador visible).
2. Ve la tarjeta de pago **Llave Bre-B @OTO262** (titular Juan Carlos Cáceres) con botones para copiar llave y valor.
3. Sube el comprobante en la misma página → queda en Google Drive, se marca “Soporte recibido” en la hoja y le llega un correo de confirmación (requiere el Apps Script). Sin Apps Script, se abre WhatsApp para adjuntarlo.
4. Pantalla de confirmación con botón para agregar el taller a Google Calendar.

## Panel administrativo (`/admin.html`)

Contraseña inicial: **`biomarketing2026`** (cámbiala en “Contraseña”).

- **Asistencia y certificados**: carga los inscritos desde Google Sheets (o CSV / manual), marca asistencia con un interruptor, cambia el estado de pago y, para cada asistente: ver certificado, descargar PDF, **enviar por correo con un clic** o compartir por WhatsApp. También “Enviar certificados a todos los asistentes”. Puedes subir la firma escaneada.
- **Imágenes por sección**: fondos e imágenes principales (incluida la **foto del instructor**).
- **Instructor y video**: textos del instructor y **link del video de YouTube** del curso anterior.
- **Evento y precios**, **Contacto y pagos** (WhatsApp, llave Bre-B, URL de Apps Script), **Galería**, **Testimonios**.
- **Publicar**: descarga `site-config.js` y reemplázalo en `assets/js/` del hosting para que todos vean los cambios.

## Activar Google Sheets + correo automático

Sigue las instrucciones al inicio de `integraciones/google-apps-script.gs` (10 minutos). Cambia `CLAVE_ADMIN` y escribe la misma clave en el panel.

## Probar en local

```
python3 -m http.server 8080
# abrir http://localhost:8080
```
