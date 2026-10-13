/**
 * Recibe las inscripciones de la landing y las guarda en Google Sheets,
 * además envía un correo de aviso por cada inscrito.
 *
 * CÓMO INSTALARLO (5 minutos):
 * 1. Crea una hoja de cálculo nueva en Google Sheets (ej. "Inscritos curso IA Salud").
 * 2. Menú Extensiones → Apps Script. Borra el contenido y pega TODO este archivo.
 * 3. Cambia CORREO_AVISO por el correo donde quieres recibir cada inscripción.
 * 4. Guarda. Clic en "Implementar" → "Nueva implementación" → tipo "Aplicación web".
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona
 * 5. Autoriza los permisos y copia la URL que termina en /exec.
 * 6. En /admin.html → "Contacto y pagos" pega la URL en
 *    "URL para guardar inscritos", guarda y publica el site-config.js.
 */
const CORREO_AVISO = 'biomarketing.salud@gmail.com';
const HOJA = 'Inscritos';
const COLUMNAS = ['fecha', 'modalidad', 'valor', 'nombre', 'documento', 'whatsapp', 'email', 'perfil', 'ciudad', 'institucion', 'objetivo', 'consentimiento', 'origen'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(HOJA);
    if (!sh) {
      sh = ss.insertSheet(HOJA);
      sh.appendRow(COLUMNAS.map(c => c.toUpperCase()).concat(['ESTADO PAGO']));
      sh.setFrozenRows(1);
    }
    sh.appendRow(COLUMNAS.map(c => data[c] || '').concat(['Pendiente']));

    if (CORREO_AVISO) {
      MailApp.sendEmail({
        to: CORREO_AVISO,
        subject: `Nueva inscripción (${data.modalidad}): ${data.nombre}`,
        htmlBody: COLUMNAS.map(c => `<b>${c}:</b> ${String(data[c] || '-')}`).join('<br>')
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
