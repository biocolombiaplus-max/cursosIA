/**
 * WEBHOOK de WhatsApp: recibe las respuestas de los pacientes (1, 2, SÍ).
 * Publica este proyecto como Aplicación web (Implementar → Nueva implementación →
 * Aplicación web · Ejecutar como: Yo · Acceso: Cualquier persona) y pega la URL /exec
 * en Meta → WhatsApp → Configuración → Webhook, con el mismo WA_VERIFY_TOKEN.
 * Suscribe el campo "messages".
 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p['hub.mode'] === 'subscribe' && p['hub.verify_token'] === prop_('WA_VERIFY_TOKEN')) {
    return ContentService.createTextOutput(p['hub.challenge']);
  }
  return ContentService.createTextOutput('BioMarketing · webhook activo');
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    (body.entry || []).forEach(entry => (entry.changes || []).forEach(ch => {
      ((ch.value && ch.value.messages) || []).forEach(m => procesarMensaje_(m));
    }));
  } catch (err) {
    console.error(err);
  }
  return ContentService.createTextOutput('ok');
}

function procesarMensaje_(m) {
  const tel = numeroWa_(m.from);
  const texto = String(
    (m.text && m.text.body) ||
    (m.button && (m.button.payload || m.button.text)) ||
    (m.interactive && m.interactive.button_reply && m.interactive.button_reply.title) || ''
  ).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Evita procesar dos veces el mismo mensaje (Meta reintenta si no recibe respuesta rápida)
  const cache = CacheService.getScriptCache();
  if (cache.get(m.id)) return;
  cache.put(m.id, '1', 21600);

  let respuesta = '';
  if (/^1\b|confirm/.test(texto)) respuesta = confirmarCita_(tel);
  else if (/^2\b|reprogram|cancel/.test(texto)) respuesta = reprogramarCita_(tel);
  else if (/^(si|sí|quiero|acepto)\b/.test(texto)) respuesta = aceptarCupo_(tel);
  if (respuesta && waListo_()) waTexto_(tel, respuesta);
}
