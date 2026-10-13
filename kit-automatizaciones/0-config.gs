/**
 * KIT DE AUTOMATIZACIONES PARA PROFESIONALES DE LA SALUD · BioMarketing
 * ---------------------------------------------------------------------
 * Un solo proyecto de Google Apps Script con 3 automatizaciones:
 *   1) Resultados de laboratorio → WhatsApp automático     (1-resultados.gs)
 *   2) Agenda: recordatorios, confirmaciones y lista de espera (2-agenda.gs + 4-webhook.gs)
 *   3) Informe mensual de productividad con IA (Claude)    (3-informe.gs)
 *
 * Instalación completa en LEEME.md. Aquí solo se configuran los datos de tu consultorio.
 *
 * Los secretos NO van en el código: se guardan en
 * Configuración del proyecto (⚙️) → Propiedades de la secuencia de comandos:
 *   WA_TOKEN           Token permanente de la API de WhatsApp Cloud (Meta)
 *   WA_PHONE_ID        Phone number ID del número de WhatsApp Business
 *   WA_VERIFY_TOKEN    Una palabra secreta inventada por ti (para el webhook)
 *   ANTHROPIC_API_KEY  Clave de la API de Claude (console.anthropic.com)
 */
const CONFIG = {
  institucion: 'Laboratorio Clínico Vida',          // nombre que verá el paciente
  correoAvisos: 'biomarketing.salud@gmail.com',      // recibe alertas y copias
  correoGerencia: 'biomarketing.salud@gmail.com',    // recibe el informe mensual
  zonaHoraria: 'America/Bogota',
  idioma: 'es',                                      // idioma de las plantillas de WhatsApp aprobadas

  // 1) Resultados
  hojaResultados: 'Resultados',
  carpetaResultados: 'Resultados por enviar',        // carpeta de Drive donde se dejan los PDF
  plantillaResultado: 'resultado_listo',

  // 2) Agenda
  calendarioId: 'primary',                           // o el ID del calendario del consultorio
  lugarCita: 'Consultorio 302 · Torre Médica',
  especialidad: 'Medicina interna',
  plantillaRecordatorio: 'recordatorio_cita',
  plantillaCupo: 'cupo_disponible',
  hojaListaEspera: 'ListaEspera',
  horasAntesRecordatorio: 24,

  // 3) Informe mensual
  hojaAtenciones: 'Atenciones',
  carpetaInformes: 'Informes mensuales',
  modeloClaude: 'claude-opus-5-5'
};

function prop_(k) {
  return PropertiesService.getScriptProperties().getProperty(k) || '';
}

function libro_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function hoja_(nombre, encabezados) {
  const ss = libro_();
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.appendRow(encabezados);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, encabezados.length).setFontWeight('bold').setBackground('#1a0f45').setFontColor('#ffffff');
    sh.autoResizeColumns(1, encabezados.length);
  }
  return sh;
}

function carpeta_(nombre) {
  const it = DriveApp.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nombre);
}

function fmt_(fecha, patron) {
  return Utilities.formatDate(fecha, CONFIG.zonaHoraria, patron);
}

/** Menú en la hoja de cálculo para usar todo sin abrir el código. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 Automatizaciones')
    .addItem('1. Crear hojas y carpetas', 'instalarHojas')
    .addItem('2. Activar automatizaciones (disparadores)', 'instalarDisparadores')
    .addSeparator()
    .addItem('Enviar resultados pendientes ahora', 'enviarResultadosPendientes')
    .addItem('Enviar recordatorios ahora', 'enviarRecordatorios')
    .addItem('Generar informe del mes anterior', 'generarInformeMensual')
    .addSeparator()
    .addItem('Probar WhatsApp (mensaje a mi número)', 'probarWhatsApp')
    .addToUi();
}

function instalarHojas() {
  hoja_(CONFIG.hojaResultados, ['FECHA', 'PACIENTE', 'DOCUMENTO', 'WHATSAPP', 'EXAMEN', 'ARCHIVO PDF', 'ESTADO', 'ENVIADO', 'OBSERVACIÓN']);
  hoja_(CONFIG.hojaListaEspera, ['FECHA', 'NOMBRE', 'WHATSAPP', 'SERVICIO', 'ESTADO']);
  hoja_(CONFIG.hojaAtenciones, ['FECHA', 'PACIENTE', 'PROFESIONAL', 'SERVICIO', 'VALOR', 'ESTADO', 'TIEMPO ENTREGA (H)', 'SATISFACCIÓN (1-5)']);
  carpeta_(CONFIG.carpetaResultados);
  carpeta_(CONFIG.carpetaInformes);
  SpreadsheetApp.getUi().alert('Listo ✅ Se crearon las hojas y las carpetas de Drive.');
}

function instalarDisparadores() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('enviarResultadosPendientes').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('enviarRecordatorios').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('generarInformeMensual').timeBased().onMonthDay(1).atHour(7).inTimezone(CONFIG.zonaHoraria).create();
  SpreadsheetApp.getUi().alert('Automatizaciones activas ✅\n• Resultados: cada 5 minutos\n• Recordatorios: cada hora\n• Informe: día 1 de cada mes, 7:00 a.m.');
}
