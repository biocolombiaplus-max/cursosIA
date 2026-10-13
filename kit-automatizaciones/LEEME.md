# Kit de automatizaciones para profesionales de la salud · BioMarketing

Tres automatizaciones reales, listas para instalar en una cuenta de Google. Son las mismas que se ven en la sección **"Automatizaciones en acción"** de la landing y las que se construyen en el taller.

| # | Automatización | Para quién | Qué hace |
|---|---|---|---|
| 1 | **Resultados → WhatsApp** | Laboratorios clínicos, imágenes diagnósticas | Cuando el resultado está validado, envía el PDF al WhatsApp del paciente, deja trazabilidad y avisa si algo falla |
| 2 | **Agenda inteligente** | Medicina, odontología, psicología, fisioterapia, nutrición… | Recordatorio 24 h antes, confirmación con 1 / 2, cita en verde o rojo en Google Calendar y el cupo liberado se ofrece a la lista de espera |
| 3 | **Informe mensual con IA** | IPS, laboratorios, consultorios, gerencia | El día 1 de cada mes calcula indicadores, crea gráficas, Claude redacta el análisis y llega un PDF al correo |

Todo corre gratis en Google Apps Script. Sin servidores.

---

## 1. Instalación (15 minutos)

1. Crea una hoja de cálculo nueva en Google Sheets, por ejemplo *"Automatizaciones Laboratorio Vida"*.
2. Menú **Extensiones → Apps Script**.
3. Crea un archivo por cada `.gs` de esta carpeta (botón **+ → Secuencia de comandos**) y pega su contenido:
   `0-config.gs`, `1-resultados.gs`, `2-agenda.gs`, `3-informe.gs`, `4-webhook.gs`, `5-whatsapp.gs`.
4. **Configuración del proyecto (⚙️)** → marca *"Mostrar el archivo de manifiesto appsscript.json"* y reemplázalo por el de esta carpeta (deja la zona horaria en `America/Bogota`).
5. Edita `0-config.gs` con los datos de tu institución (nombre, correos, lugar de las citas, especialidad).
6. Guarda, vuelve a la hoja y recárgala. Aparece el menú **🤖 Automatizaciones**:
   - **1. Crear hojas y carpetas** → crea las hojas `Resultados`, `ListaEspera`, `Atenciones` y las carpetas de Drive.
   - **2. Activar automatizaciones** → programa los disparadores (pide permisos la primera vez).

> Sin conectar WhatsApp ya funciona en **modo semiautomático**: el script prepara cada mensaje como enlace `wa.me` (en la hoja o en un correo) y lo envías con un clic. Para que sea 100% automático, conecta la API oficial (paso 2).

---

## 2. Conectar WhatsApp (API oficial de Meta)

1. Entra a **developers.facebook.com** → *Crear app* → tipo **Empresa** → agrega el producto **WhatsApp**.
2. Registra el número del consultorio o laboratorio. Debe ser un número que **no** esté en uso en la app de WhatsApp normal.
3. Copia el **Phone number ID** y crea un **token permanente** (Configuración del negocio → Usuarios del sistema → Generar token con permisos `whatsapp_business_messaging` y `whatsapp_business_management`).
4. En Apps Script → ⚙️ → **Propiedades de la secuencia de comandos**, agrega:

| Propiedad | Valor |
|---|---|
| `WA_TOKEN` | token permanente |
| `WA_PHONE_ID` | Phone number ID |
| `WA_VERIFY_TOKEN` | una palabra secreta inventada por ti |

5. Prueba con el menú **Probar WhatsApp**.

### Plantillas para aprobar en Meta (categoría *Utilidad*, idioma Español)

WhatsApp exige plantillas aprobadas para escribirle primero a un paciente. Créalas en **Administrador de WhatsApp → Plantillas de mensajes** con estos nombres exactos:

**`resultado_listo`**: encabezado tipo **Documento**
```
Hola {{1}}, tu resultado de {{2}} ya está listo y lo adjuntamos en este mensaje.
Tu médico tratante te explicará los valores en tu próxima cita.
Si tienes dudas, responde a este chat.
```

**`recordatorio_cita`**: botones de respuesta rápida: `1 · Confirmo` y `2 · Reprogramar`
```
Hola {{1}}, te recordamos tu cita de {{2}} el {{3}} a las {{4}} en {{5}}.
Responde 1 para confirmar o 2 para reprogramar.
```

**`cupo_disponible`**: botón de respuesta rápida: `Sí, lo quiero`
```
Hola {{1}}, se liberó un cupo de {{2}} el {{3}} a las {{4}}.
¿Lo quieres? Responde SÍ para asignártelo.
```

### Recibir las respuestas de los pacientes (webhook)

1. En Apps Script: **Implementar → Nueva implementación → Aplicación web** (Ejecutar como: *Yo* · Acceso: *Cualquier persona*). Copia la URL que termina en `/exec`.
2. En Meta → WhatsApp → **Configuración → Webhook**: pega la URL y tu `WA_VERIFY_TOKEN`, y suscribe el campo **messages**.

> Algunas cuentas de Meta rechazan la verificación del webhook porque Apps Script responde con una redirección. Si te pasa, pon un puente gratuito (un Worker de Cloudflare, Make o n8n) que reciba el webhook de Meta y lo reenvíe a la URL `/exec`. En el taller lo configuramos juntos.

---

## 3. Cómo se usa cada una

### Resultados → WhatsApp
- Hoja **Resultados**: `FECHA · PACIENTE · DOCUMENTO · WHATSAPP · EXAMEN · ARCHIVO PDF · ESTADO · ENVIADO · OBSERVACIÓN`.
- Guarda el PDF en la carpeta de Drive **Resultados por enviar** con el documento al inicio del nombre (`1090123456_perfil.pdf`), o pega el enlace del PDF en *ARCHIVO PDF*.
- Cambia **ESTADO** a `Validado`. En menos de 5 minutos queda en `Enviado`, con fecha y hora. La fila se pinta de verde, o de rojo con el motivo si algo falla, y te llega un correo.

### Agenda inteligente
- Agenda en Google Calendar con el título `Nombre Paciente - Servicio` y en la descripción `Tel: 3001234567`.
- 24 horas antes sale el recordatorio y la cita se pinta **amarilla**.
- Si el paciente responde **1**, la cita queda **verde ✅**. Si responde **2**, queda **roja 🔁**, te llega un correo y el cupo se ofrece al primero de la hoja **ListaEspera**. Si ese paciente responde **SÍ**, la cita se le asigna (⭐ morada).

### Informe mensual con IA
- Hoja **Atenciones**: `FECHA · PACIENTE · PROFESIONAL · SERVICIO · VALOR · ESTADO (Atendida/Inasistencia/Cancelada) · TIEMPO ENTREGA (H) · SATISFACCIÓN (1-5)`. Puede llenarse con un formulario, a mano o con una exportación de tu software.
- Agrega `ANTHROPIC_API_KEY` en Propiedades (créala en console.anthropic.com).
- El día 1 a las 7:00 a.m. llega a gerencia un PDF con los indicadores, la comparación con el mes anterior, gráficas, productividad por profesional y el análisis escrito por Claude.
- **Privacidad:** a Claude solo se envían cifras agregadas. Nunca nombres, documentos ni datos clínicos.

---

## 4. Cumplimiento y buenas prácticas
- Pide al paciente **autorización escrita** para recibir resultados y recordatorios por WhatsApp (Ley 1581 de 2012). Agrega la casilla a tu formato de ingreso.
- Los mensajes **no** interpretan resultados ni dan diagnósticos. La IA apoya y el profesional decide.
- WhatsApp Business API cobra por mensaje de plantilla según la tarifa de Meta para Colombia, y la API de Claude cobra por uso. Para un informe mensual, el costo es de centavos de dólar.
