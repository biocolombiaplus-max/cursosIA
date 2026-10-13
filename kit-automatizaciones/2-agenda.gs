/**
 * AUTOMATIZACIÓN 2 · Agenda: recordatorios, confirmaciones y lista de espera
 * --------------------------------------------------------------------------
 * Sirve para medicina, odontología, psicología, fisioterapia, nutrición… (cualquier agenda).
 *
 * Cómo se agenda una cita en Google Calendar:
 *   Título:       Carlos Martínez - Control HTA
 *   Descripción:  Tel: 3001234567
 *
 * Cada hora el script busca las citas de las próximas 24 h y envía el recordatorio por WhatsApp
 * (plantilla "recordatorio_cita" con botones 1 · Confirmo / 2 · Reprogramar).
 * Las respuestas del paciente las procesa 4-webhook.gs:
 *   1 → la cita se pone VERDE con ✅
 *   2 → la cita se pone ROJA, te avisa por correo y ofrece el cupo al primero de la lista de espera
 */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga_(d) {
  const dd = new Date(fmt_(d, "yyyy-MM-dd'T'HH:mm:ss"));
  return `${DIAS[dd.getDay()]} ${dd.getDate()} de ${MESES[dd.getMonth()]}`;
}
function horaCorta_(d) {
  return fmt_(d, 'h:mm a').replace('AM', 'a.m.').replace('PM', 'p.m.');
}

/** Extrae nombre, servicio y celular de un evento. */
function datosCita_(ev) {
  const titulo = ev.getTitle().replace(/^[✅🔁⭐]\s*/, '');
  const [nombre, servicio] = titulo.split(/\s+-\s+/);
  const tel = (ev.getDescription() || '').match(/(?:tel|cel|whatsapp|celular)[^\d+]*([+\d][\d\s-]{8,})/i);
  return { nombre: (nombre || '').trim(), servicio: (servicio || CONFIG.especialidad).trim(), tel: tel ? numeroWa_(tel[1]) : '' };
}

function calendario_() {
  return CONFIG.calendarioId === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(CONFIG.calendarioId);
}

function enviarRecordatorios() {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + (CONFIG.horasAntesRecordatorio + 1) * 3600e3);
  const eventos = calendario_().getEvents(ahora, hasta);
  const manuales = [];
  let enviados = 0;

  eventos.forEach(ev => {
    if (ev.isAllDayEvent() || ev.getTag('bm_rec')) return;
    const horasFaltan = (ev.getStartTime() - ahora) / 3600e3;
    if (horasFaltan > CONFIG.horasAntesRecordatorio || horasFaltan < 1) return;
    const c = datosCita_(ev);
    if (!c.tel) return;
    const fecha = fechaLarga_(ev.getStartTime()), hora = horaCorta_(ev.getStartTime());
    try {
      if (waListo_()) {
        waPlantilla_(c.tel, CONFIG.plantillaRecordatorio, [c.nombre.split(' ')[0], c.servicio, fecha, hora, CONFIG.lugarCita]);
      } else {
        manuales.push(`${c.nombre} · ${fecha} ${hora}\n${waEnlace_(c.tel, `Hola ${c.nombre.split(' ')[0]} 👋 Te recordamos tu cita de ${c.servicio} el ${fecha} a las ${hora} en ${CONFIG.lugarCita}. Responde 1 para confirmar o 2 para reprogramar.`)}`);
      }
      ev.setTag('bm_rec', fmt_(ahora, 'yyyy-MM-dd HH:mm'));
      ev.setTag('bm_tel', c.tel);
      ev.setTag('bm_estado', 'recordada');
      ev.setColor(CalendarApp.EventColor.YELLOW);
      enviados++;
    } catch (e) {
      MailApp.sendEmail(CONFIG.correoAvisos, '⚠️ Recordatorio no enviado', `${c.nombre}: ${e.message}`);
    }
  });

  // Sin API de WhatsApp: te llega un correo con los enlaces para enviar cada recordatorio con un clic
  if (manuales.length) {
    MailApp.sendEmail(CONFIG.correoAvisos, `📅 ${manuales.length} recordatorio(s) listos para enviar`, manuales.join('\n\n'));
  }
  if (enviados) console.log(`Recordatorios: ${enviados}`);
}

/** Busca la próxima cita de un paciente por su celular. */
function citaPorTelefono_(tel, etiqueta) {
  const ahora = new Date();
  const eventos = calendario_().getEvents(ahora, new Date(ahora.getTime() + 7 * 864e5));
  return eventos.find(ev => ev.getTag(etiqueta || 'bm_tel') === tel) || null;
}

function confirmarCita_(tel) {
  const ev = citaPorTelefono_(tel);
  if (!ev) return 'No encontramos una cita próxima con este número. Escríbenos y te ayudamos 🙌';
  const c = datosCita_(ev);
  ev.setColor(CalendarApp.EventColor.GREEN);
  if (!/^✅/.test(ev.getTitle())) ev.setTitle('✅ ' + ev.getTitle().replace(/^[🔁⭐]\s*/, ''));
  ev.setTag('bm_estado', 'confirmada');
  return `¡Listo, ${c.nombre.split(' ')[0]}! ✅ Tu cita del ${fechaLarga_(ev.getStartTime())} a las ${horaCorta_(ev.getStartTime())} quedó confirmada. Te esperamos 10 minutos antes.`;
}

function reprogramarCita_(tel) {
  const ev = citaPorTelefono_(tel);
  if (!ev) return 'No encontramos una cita próxima con este número. Escríbenos y te ayudamos 🙌';
  const c = datosCita_(ev);
  ev.setColor(CalendarApp.EventColor.RED);
  ev.setTitle('🔁 ' + ev.getTitle().replace(/^[✅⭐]\s*/, ''));
  ev.setTag('bm_estado', 'reprogramar');
  const cuando = `${fechaLarga_(ev.getStartTime())} a las ${horaCorta_(ev.getStartTime())}`;
  MailApp.sendEmail(CONFIG.correoAvisos, `🔁 ${c.nombre} pidió reprogramar`, `Cita: ${cuando}\nWhatsApp: ${tel}\nEl cupo se ofreció automáticamente a la lista de espera.`);
  ofrecerCupo_(ev, c.servicio);
  return `Entendido, ${c.nombre.split(' ')[0]}. Liberamos tu cita del ${cuando} y en breve te escribimos para elegir un nuevo horario 📅`;
}

/** Ofrece el cupo liberado al primero de la lista de espera. */
function ofrecerCupo_(ev, servicio) {
  const sh = hoja_(CONFIG.hojaListaEspera, []);
  const n = sh.getLastRow();
  if (n < 2) return;
  const filas = sh.getRange(2, 1, n - 1, 5).getValues();
  const i = filas.findIndex(f => f[1] && f[2] && (!f[4] || /espera/i.test(f[4])));
  if (i < 0) return;
  const [, nombre, cel, serv] = filas[i];
  const tel = numeroWa_(cel);
  const fecha = fechaLarga_(ev.getStartTime()), hora = horaCorta_(ev.getStartTime());
  if (waListo_()) waPlantilla_(tel, CONFIG.plantillaCupo, [String(nombre).split(' ')[0], serv || servicio, fecha, hora]);
  sh.getRange(i + 2, 5).setValue(`Cupo ofrecido ${fmt_(new Date(), 'yyyy-MM-dd HH:mm')}`);
  ev.setTag('bm_ofrecido', tel);
}

/** El paciente de la lista de espera respondió SÍ: se le asigna el cupo. */
function aceptarCupo_(tel) {
  const ev = citaPorTelefono_(tel, 'bm_ofrecido');
  if (!ev || ev.getTag('bm_estado') !== 'reprogramar') return 'Gracias por responder 🙏 Ese cupo ya fue tomado; te avisaremos del próximo disponible.';
  const sh = hoja_(CONFIG.hojaListaEspera, []);
  const filas = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 5).getValues();
  const i = filas.findIndex(f => numeroWa_(f[2]) === tel);
  const nombre = i >= 0 ? String(filas[i][1]) : 'Paciente lista de espera';
  const servicio = i >= 0 && filas[i][3] ? filas[i][3] : datosCita_(ev).servicio;
  ev.setTitle(`⭐ ${nombre} - ${servicio}`);
  ev.setDescription(`Tel: ${tel}\nAsignado desde lista de espera`);
  ev.setColor(CalendarApp.EventColor.MAUVE);
  ev.setTag('bm_tel', tel);
  ev.setTag('bm_estado', 'confirmada');
  ev.setTag('bm_ofrecido', '');
  if (i >= 0) sh.getRange(i + 2, 5).setValue('Asignado ✅');
  MailApp.sendEmail(CONFIG.correoAvisos, `⭐ Cupo reasignado a ${nombre}`, `${fechaLarga_(ev.getStartTime())} ${horaCorta_(ev.getStartTime())}`);
  return `¡Excelente, ${nombre.split(' ')[0]}! ⭐ Tu cita quedó agendada el ${fechaLarga_(ev.getStartTime())} a las ${horaCorta_(ev.getStartTime())} en ${CONFIG.lugarCita}.`;
}
