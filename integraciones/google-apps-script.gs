/**
 * BioMarketing · Backend gratuito con Google Sheets + Drive + Gmail
 *
 * Qué hace:
 *  - Guarda cada inscripción de la landing en la hoja "Inscritos".
 *  - Guarda el comprobante de pago (Bre-B) en una carpeta de Google Drive y
 *    marca la inscripción como "Soporte recibido". Te avisa por correo.
 *  - Desde el panel /admin.html: lista los inscritos, actualiza pago/asistencia
 *    y envía el certificado en PDF al correo del asistente con un clic.
 *
 * CÓMO INSTALARLO (10 minutos):
 * 1. Crea una hoja de cálculo nueva en Google Sheets (ej. "Inscritos curso IA Salud").
 * 2. Menú Extensiones → Apps Script. Borra el contenido y pega TODO este archivo.
 * 3. Cambia CLAVE_ADMIN por una clave secreta tuya (no la compartas).
 * 4. Guarda. Clic en "Implementar" → "Nueva implementación" → tipo "Aplicación web".
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier persona
 * 5. Autoriza los permisos (Sheets, Drive y Gmail) y copia la URL que termina en /exec.
 * 6. En /admin.html:
 *    - "Contacto y pagos" → pega la URL en "URL para guardar inscritos", guarda y publica site-config.js.
 *    - "Asistencia y certificados" → "Configuración…" → escribe la misma CLAVE_ADMIN.
 *
 * Si modificas este código, vuelve a "Implementar → Gestionar implementaciones →
 * Editar → Nueva versión" para que los cambios se apliquen.
 */
const CLAVE_ADMIN = 'cambia-esta-clave-2026';
const CORREO_AVISO = 'biomarketing.salud@gmail.com';
const NOMBRE_REMITENTE = 'BioMarketing · Curso IA para el Sector Salud';
const CARPETA_SOPORTES = 'Soportes de pago · Curso IA Salud';
const HOJA = 'Inscritos';
const COLUMNAS = ['fecha', 'modalidad', 'valor', 'nombre', 'documento', 'whatsapp', 'email', 'perfil', 'ciudad',
  'institucion', 'objetivo', 'consentimiento', 'estado_pago', 'soporte', 'asistio', 'certificado', 'origen'];

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) {
    sh = ss.insertSheet(HOJA);
    sh.appendRow(COLUMNAS.map(c => c.toUpperCase()));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold').setBackground('#1a0f45').setFontColor('#ffffff');
  }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function fila_(sh, documento) {
  const col = COLUMNAS.indexOf('documento') + 1;
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const vals = sh.getRange(2, col, last - 1, 1).getValues();
  const doc = String(documento).replace(/\D/g, '');
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]).replace(/\D/g, '') === doc) return i + 2;
  }
  return 0;
}

function set_(sh, row, campo, valor) {
  const c = COLUMNAS.indexOf(campo) + 1;
  if (row && c) sh.getRange(row, c).setValue(valor);
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'list') {
    if (p.clave !== CLAVE_ADMIN) return json_({ ok: false, error: 'Clave incorrecta' });
    const sh = hoja_();
    const last = sh.getLastRow();
    const rows = last < 2 ? [] : sh.getRange(2, 1, last - 1, COLUMNAS.length).getValues().map(r => {
      const o = {};
      COLUMNAS.forEach((c, i) => (o[c] = r[i] instanceof Date ? r[i].toISOString() : r[i]));
      return o;
    });
    return json_({ ok: true, rows });
  }
  return json_({ ok: true, servicio: 'BioMarketing curso IA' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const sh = hoja_();
    const action = d.action || 'registro';

    if (action === 'registro') {
      const row = COLUMNAS.map(c => (c === 'estado_pago' ? 'Pendiente' : c === 'asistio' ? 'No' : d[c] || ''));
      const existing = fila_(sh, d.documento);
      if (existing) sh.getRange(existing, 1, 1, COLUMNAS.length).setValues([row]);
      else sh.appendRow(row);
      if (CORREO_AVISO) {
        MailApp.sendEmail({
          to: CORREO_AVISO,
          subject: `🟡 Nueva inscripción (${d.modalidad}): ${d.nombre}`,
          htmlBody: COLUMNAS.filter(c => d[c]).map(c => `<b>${c}:</b> ${String(d[c])}`).join('<br>')
        });
      }
      return json_({ ok: true });
    }

    if (action === 'soporte') {
      const it = DriveApp.getFoldersByName(CARPETA_SOPORTES);
      const folder = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_SOPORTES);
      const a = d.archivo || {};
      const blob = Utilities.newBlob(Utilities.base64Decode(a.data), a.mime || 'image/jpeg', `${d.documento}_${d.nombre}_${a.name || 'soporte'}`);
      const file = folder.createFile(blob);
      const row = fila_(sh, d.documento);
      set_(sh, row, 'estado_pago', 'Soporte recibido');
      set_(sh, row, 'soporte', file.getUrl());
      if (CORREO_AVISO) {
        MailApp.sendEmail({
          to: CORREO_AVISO,
          subject: `🟢 Soporte de pago recibido: ${d.nombre} (${d.modalidad} · ${d.valor})`,
          htmlBody: `<p><b>${d.nombre}</b> (C.C. ${d.documento}) envió su comprobante.</p>
                     <p>WhatsApp: ${d.whatsapp}<br>Correo: ${d.email}</p>
                     <p><a href="${file.getUrl()}">Ver comprobante en Drive</a></p>`,
          attachments: [blob]
        });
      }
      if (d.email) {
        MailApp.sendEmail({
          to: d.email,
          name: NOMBRE_REMITENTE,
          subject: 'Recibimos tu comprobante · Curso IA para el Sector Salud',
          htmlBody: `<div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#3b1fa8">¡Hola ${String(d.nombre).split(' ')[0]}! 🎉</h2>
            <p>Recibimos tu comprobante de pago para el taller <b>IA para el Sector Salud: automatizaciones con Claude</b> (${d.modalidad}).</p>
            <p>Validaremos el pago y te confirmaremos por WhatsApp con todos los detalles.</p>
            <p><b>Sábado 7 de noviembre de 2026 · 2:00 a 6:00 p.m. (hora Colombia)</b></p>
            <p>— Equipo BioMarketing</p></div>`
        });
      }
      return json_({ ok: true, url: file.getUrl() });
    }

    // Acciones administrativas: requieren clave
    if (d.clave !== CLAVE_ADMIN) return json_({ ok: false, error: 'Clave incorrecta' });

    if (action === 'actualizar') {
      const row = fila_(sh, d.documento);
      if (!row) return json_({ ok: false, error: 'No se encontró el documento ' + d.documento });
      set_(sh, row, d.campo, d.valor);
      return json_({ ok: true });
    }

    if (action === 'certificado') {
      const pdf = Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', d.filename || 'Certificado.pdf');
      MailApp.sendEmail({
        to: d.email,
        name: NOMBRE_REMITENTE,
        subject: '🎓 Tu certificado · IA para el Sector Salud con Claude',
        htmlBody: `<div style="font-family:Arial,sans-serif;max-width:560px">
          <h2 style="color:#3b1fa8">¡Felicitaciones, ${String(d.nombre).split(' ')[0]}! 🎓</h2>
          <p>Gracias por asistir al taller <b>IA para el Sector Salud: automatizaciones con Claude</b>.</p>
          <p>Adjunto encontrarás tu <b>certificado de asistencia</b> (código ${d.codigo || ''}).</p>
          <p>Te invitamos a compartirlo en LinkedIn y a seguir implementando tus automatizaciones. Estamos atentos en el grupo de soporte.</p>
          <p>— Juan Carlos Cáceres M.<br>BioMarketing · Innovación Digital</p></div>`,
        attachments: [pdf]
      });
      const row = fila_(sh, d.documento);
      set_(sh, row, 'asistio', 'Sí');
      set_(sh, row, 'certificado', 'Enviado ' + Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd HH:mm'));
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
