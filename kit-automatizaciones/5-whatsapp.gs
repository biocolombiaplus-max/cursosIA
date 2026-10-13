/**
 * Conector con la API oficial de WhatsApp Cloud (Meta).
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 * Si Meta publica una versión nueva de la API, actualiza GRAPH_VERSION.
 */
const GRAPH_VERSION = 'v23.0';

/** Normaliza un celular colombiano: "300 123 4567" → "573001234567". */
function numeroWa_(n) {
  let d = String(n || '').replace(/\D/g, '');
  if (d.length === 10 && d.charAt(0) === '3') d = '57' + d;
  return d;
}

function waListo_() {
  return !!(prop_('WA_TOKEN') && prop_('WA_PHONE_ID'));
}

function waPost_(ruta, payload) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${prop_('WA_PHONE_ID')}/${ruta}`;
  const opciones = {
    method: 'post',
    headers: { Authorization: 'Bearer ' + prop_('WA_TOKEN') },
    muteHttpExceptions: true
  };
  if (payload instanceof Object && payload.file) opciones.payload = payload; // multipart (archivos)
  else { opciones.contentType = 'application/json'; opciones.payload = JSON.stringify(payload); }
  const r = UrlFetchApp.fetch(url, opciones);
  const json = JSON.parse(r.getContentText() || '{}');
  if (r.getResponseCode() >= 300) throw new Error('WhatsApp: ' + (json.error ? json.error.message : r.getContentText()));
  return json;
}

/** Sube un archivo (PDF) a WhatsApp y devuelve su media id. */
function waSubirArchivo_(blob) {
  return waPost_('media', { messaging_product: 'whatsapp', type: blob.getContentType(), file: blob }).id;
}

/**
 * Envía una plantilla aprobada.
 * @param {string} para        celular
 * @param {string} plantilla   nombre de la plantilla en Meta
 * @param {string[]} variables valores para {{1}}, {{2}}…
 * @param {{id:string, filename:string}=} documento  encabezado tipo documento (opcional)
 */
function waPlantilla_(para, plantilla, variables, documento) {
  const componentes = [];
  if (documento) componentes.push({ type: 'header', parameters: [{ type: 'document', document: documento }] });
  if (variables && variables.length) componentes.push({ type: 'body', parameters: variables.map(v => ({ type: 'text', text: String(v) })) });
  return waPost_('messages', {
    messaging_product: 'whatsapp',
    to: numeroWa_(para),
    type: 'template',
    template: { name: plantilla, language: { code: CONFIG.idioma }, components: componentes }
  });
}

/** Mensaje de texto libre (solo dentro de las 24 h después de que el paciente escribió). */
function waTexto_(para, texto) {
  return waPost_('messages', { messaging_product: 'whatsapp', to: numeroWa_(para), type: 'text', text: { body: texto } });
}

/** Plan B sin API: devuelve un enlace wa.me con el mensaje listo para enviar con un clic. */
function waEnlace_(para, texto) {
  return `https://wa.me/${numeroWa_(para)}?text=${encodeURIComponent(texto)}`;
}

function probarWhatsApp() {
  const ui = SpreadsheetApp.getUi();
  if (!waListo_()) return ui.alert('Faltan WA_TOKEN y WA_PHONE_ID en Propiedades de la secuencia de comandos.');
  const r = ui.prompt('Escribe tu celular (ej. 3001234567)');
  if (r.getSelectedButton() !== ui.Button.OK) return;
  // "hello_world" es la plantilla de prueba que Meta crea en toda cuenta nueva (en inglés).
  waPost_('messages', { messaging_product: 'whatsapp', to: numeroWa_(r.getResponseText()), type: 'template', template: { name: 'hello_world', language: { code: 'en_US' } } });
  ui.alert('Mensaje de prueba enviado ✅ Revisa tu WhatsApp.');
}
