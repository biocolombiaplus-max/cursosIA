/**
 * AUTOMATIZACIÓN 1 · Resultados de laboratorio → WhatsApp del paciente
 * ---------------------------------------------------------------------
 * Cómo se usa en el día a día:
 *   a) El laboratorio registra al paciente en la hoja "Resultados" (o la llena una exportación del LIS).
 *   b) Cuando el resultado está validado, guarda el PDF en la carpeta de Drive "Resultados por enviar"
 *      con el número de documento al inicio del nombre:  1090123456_perfil_lipidico.pdf
 *      (o pega el enlace del PDF en la columna ARCHIVO PDF).
 *   c) Cambia ESTADO a "Validado".
 * Cada 5 minutos el script envía el PDF por WhatsApp con la plantilla aprobada,
 * marca ENVIADO con la fecha y deja trazabilidad. Si algo falla, lo escribe en OBSERVACIÓN
 * y te avisa por correo.
 */
const COL = { fecha: 1, paciente: 2, documento: 3, whatsapp: 4, examen: 5, archivo: 6, estado: 7, enviado: 8, obs: 9 };

function enviarResultadosPendientes() {
  const sh = hoja_(CONFIG.hojaResultados, []);
  const ultima = sh.getLastRow();
  if (ultima < 2) return;
  const datos = sh.getRange(2, 1, ultima - 1, 9).getValues();
  const carpeta = carpeta_(CONFIG.carpetaResultados);
  const errores = [];
  let enviados = 0;

  datos.forEach((f, i) => {
    const fila = i + 2;
    const estado = String(f[COL.estado - 1]).trim().toLowerCase();
    if (estado !== 'validado' || f[COL.enviado - 1]) return;
    const nombre = String(f[COL.paciente - 1]).trim();
    const primerNombre = nombre.split(' ')[0];
    const examen = String(f[COL.examen - 1]).trim();
    const cel = f[COL.whatsapp - 1];
    try {
      const archivo = buscarPdf_(f[COL.archivo - 1], f[COL.documento - 1], carpeta);
      if (!archivo) throw new Error('No se encontró el PDF (revisa el nombre del archivo o el enlace).');

      if (waListo_()) {
        const pdf = archivo.getBlob().setContentType('application/pdf');
        const nombreArchivo = `Resultado_${examen.replace(/[^\wÁÉÍÓÚáéíóúñÑ]+/g, '_')}.pdf`;
        const mediaId = waSubirArchivo_(pdf);
        waPlantilla_(cel, CONFIG.plantillaResultado, [primerNombre, examen], { id: mediaId, filename: nombreArchivo });
        sh.getRange(fila, COL.obs).setValue('Enviado por API de WhatsApp');
      } else {
        // Sin API: deja un enlace de envío con un clic (el PDF se comparte con enlace de solo lectura)
        archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const texto = `Hola ${primerNombre} 👋 Tu resultado de ${examen} ya está listo. Descárgalo aquí: ${archivo.getUrl()}\nTu médico tratante te explicará los valores en tu próxima cita. — ${CONFIG.institucion}`;
        sh.getRange(fila, COL.obs).setValue(waEnlace_(cel, texto));
      }
      sh.getRange(fila, COL.estado).setValue('Enviado');
      sh.getRange(fila, COL.enviado).setValue(fmt_(new Date(), 'yyyy-MM-dd HH:mm'));
      sh.getRange(fila, 1, 1, 9).setBackground('#ecfdf5');
      // Mueve el PDF a una subcarpeta de enviados para mantener orden
      archivo.moveTo(subcarpeta_(carpeta, 'Enviados ' + fmt_(new Date(), 'yyyy-MM')));
      enviados++;
    } catch (e) {
      sh.getRange(fila, COL.obs).setValue('⚠️ ' + e.message);
      sh.getRange(fila, 1, 1, 9).setBackground('#fef2f2');
      errores.push(`${nombre} (${examen}): ${e.message}`);
    }
  });

  if (errores.length && CONFIG.correoAvisos) {
    MailApp.sendEmail(CONFIG.correoAvisos, `⚠️ ${errores.length} resultado(s) sin enviar`, errores.join('\n'));
  }
  if (enviados) console.log(`Resultados enviados: ${enviados}`);
}

function buscarPdf_(enlace, documento, carpeta) {
  const id = String(enlace || '').match(/[-\w]{25,}/);
  if (id) return DriveApp.getFileById(id[0]);
  const doc = String(documento || '').replace(/\D/g, '');
  if (!doc) return null;
  const it = carpeta.searchFiles(`title contains '${doc}' and mimeType = 'application/pdf' and trashed = false`);
  return it.hasNext() ? it.next() : null;
}

function subcarpeta_(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}
