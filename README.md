# Landing · IA para el Sector Salud con Claude — BioMarketing

Taller práctico de automatizaciones con Claude IA para profesionales de la salud.
**Sábado 7 de noviembre de 2026 · 2:00 a 6:00 p.m. (hora Colombia) · Presencial en Cúcuta ($180.000) y virtual en vivo ($120.000).**
Dicta: **Juan Carlos Cáceres M.** — Bacteriólogo, MSc. en Administración de Instituciones de Salud, Esp. en Analítica de Datos e IA para el sector salud.

## Estructura

Todo lo que se publica está en `public/` (README e integraciones no quedan expuestos).

```
public/index.html                  Landing pública
public/admin.html                  Panel administrativo (en línea: /admin)
public/_headers                    Cabeceras de seguridad y caché de Cloudflare
public/_redirects                  Atajos: /panel → /admin, /inscripcion → precios
public/404.html, robots.txt
assets/css/styles.css       Estilos de la landing
assets/css/admin.css        Estilos del panel
assets/js/site-config.js    Configuración PUBLICADA (textos, precios, imágenes, video, pago)
assets/js/store.js          Carga config + borrador del admin (IndexedDB)
assets/js/main.js           Animaciones, demo en vivo, inscripción y pago Bre-B
assets/js/diploma.js        Genera el certificado (canvas → PDF, sin librerías)
assets/js/admin.js          Lógica del panel: imágenes, textos, asistencia y certificados
integraciones/google-apps-script.gs   Backend gratuito: Sheets + Drive + Gmail
```

Sitio 100% estático alojado en **Cloudflare Pages** (gratis, sin Vercel).

## Publicar en Cloudflare (una sola vez)

**Opción A — botón "Create app" (panel nuevo, recomendada):**
1. https://dash.cloudflare.com → **Create app** (o *Compute → Workers & Pages → Create*).
2. **Import a repository / Connect GitHub** → elige **biocolombiaplus-max/cursosIA** y la rama donde está este código.
3. Deja **Build command** vacío y **Deploy command** `npx wrangler deploy` (lee `wrangler.jsonc`, que publica la carpeta `public/`).
4. **Deploy**. Queda en `https://cursosia.<tu-subdominio>.workers.dev`. Dominio propio en *Settings → Domains & Routes*.

**Opción B — Cloudflare Pages:** *Workers & Pages → Create → pestaña Pages → Connect to Git* · Framework `None` · Build command vacío · **Build output directory `public`**.

En ambos casos cada cambio en GitHub se publica solo, y `_headers`, `_redirects` y `404.html` funcionan igual.

## Publicar cambios hechos en el panel (automático)

1. Entra por el botón discreto **Iniciar sesión** al final de la landing (o `/admin`).
2. La primera vez, en **Publicar**, conecta GitHub con un token *fine-grained* (solo repositorio `cursosIA`, permiso **Contents: Read and write**). Se guarda solo en ese navegador.
3. Haz tus cambios (fotos, video, textos, precios…) y presiona **Publicar en la web**. El panel guarda la configuración en GitHub, Cloudflare la publica sola y el panel avisa “✓ En vivo para todos” cuando está lista (~1 minuto).

Plan B sin token: *Publicar → Copia de seguridad → Descargar site-config.js* y súbelo a `public/assets/js/` en GitHub.

## Panel administrativo (`/admin.html`)

Contraseña inicial: **`biomarketing2026`** (cámbiala en “Contraseña”).

- **Asistencia y certificados**: carga los inscritos desde Google Sheets (o CSV / manual), marca asistencia con un interruptor, cambia el estado de pago y, para cada asistente: ver certificado, descargar PDF, **enviar por correo con un clic** o compartir por WhatsApp. También “Enviar certificados a todos los asistentes”. Puedes subir la firma escaneada.
- **Imágenes por sección**: fondos e imágenes principales (incluida la **foto del instructor**).
- **Instructor y video**: textos del instructor y **link del video de YouTube** del curso anterior.
- **Evento y precios**, **Contacto y pagos** (WhatsApp, llave Bre-B, URL de Apps Script), **Galería**, **Testimonios**.
- **Publicar**: descarga `site-config.js` y súbelo a `public/assets/js/` en GitHub (ver “Publicar cambios hechos en el panel”) para que todos vean los cambios.

## Kit de automatizaciones reales (`kit-automatizaciones/`)

Resultados de laboratorio por WhatsApp, agenda con recordatorios/confirmaciones/lista de espera e informe mensual con IA (Claude). Instalación en `kit-automatizaciones/LEEME.md`.

## Activar Google Sheets + correo automático

Sigue las instrucciones al inicio de `integraciones/google-apps-script.gs` (10 minutos). Cambia `CLAVE_ADMIN` y escribe la misma clave en el panel.

## Probar en local

```
npx wrangler pages dev public   # igual que Cloudflare
# o: python3 -m http.server 8080 --directory public
```
