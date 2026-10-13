/**
 * AUTOMATIZACIÓN 3 · Informe mensual de productividad con IA
 * ----------------------------------------------------------
 * El día 1 de cada mes a las 7:00 a.m.:
 *   1. Lee la hoja "Atenciones" del mes anterior (una fila por atención).
 *   2. Calcula indicadores: atenciones, inasistencias, ingresos, tiempo de entrega,
 *      satisfacción, productividad por profesional y por servicio, comparado con el mes previo.
 *   3. Claude redacta el resumen ejecutivo y recomendaciones (solo recibe cifras agregadas,
 *      NUNCA nombres ni datos de pacientes).
 *   4. Arma un documento con tablas y gráficas, lo convierte en PDF, lo guarda en Drive
 *      y lo envía por correo a gerencia.
 */
function generarInformeMensual(fechaReferencia) {
  const ref = fechaReferencia instanceof Date ? fechaReferencia : new Date();
  const ini = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const fin = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const iniPrev = new Date(ref.getFullYear(), ref.getMonth() - 2, 1);
  const nombreMes = `${MESES[ini.getMonth()]} ${ini.getFullYear()}`;

  const filas = leerAtenciones_();
  const actual = metricas_(filas.filter(f => f.fecha >= ini && f.fecha < fin), ini);
  const previo = metricas_(filas.filter(f => f.fecha >= iniPrev && f.fecha < ini), iniPrev);
  if (!actual.total) {
    MailApp.sendEmail(CONFIG.correoAvisos, `Informe ${nombreMes}: sin datos`, 'La hoja Atenciones no tiene registros del mes.');
    return;
  }

  const analisis = analisisClaude_(nombreMes, actual, previo);
  const graficas = graficas_(actual);
  const pdf = construirPdf_(nombreMes, actual, previo, analisis, graficas);

  const archivo = carpeta_(CONFIG.carpetaInformes).createFile(pdf);
  MailApp.sendEmail({
    to: CONFIG.correoGerencia,
    subject: `📊 Informe mensual ${nombreMes} — ${CONFIG.institucion}`,
    htmlBody: `<p>Hola,</p><p>Adjunto el informe de productividad de <b>${nombreMes}</b>.</p>
      <ul><li><b>${actual.total}</b> atenciones (${variacion_(actual.total, previo.total)} vs. mes anterior)</li>
      <li>Inasistencia: <b>${pct_(actual.inasistencias, actual.total)}</b></li>
      <li>Ingresos: <b>${pesos_(actual.ingresos)}</b></li></ul>
      <p>Copia en Drive: <a href="${archivo.getUrl()}">${archivo.getName()}</a></p>
      <p style="color:#888">Generado automáticamente · Kit BioMarketing</p>`,
    attachments: [pdf]
  });
}

function leerAtenciones_() {
  const sh = hoja_(CONFIG.hojaAtenciones, []);
  const n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 8).getValues()
    .filter(r => r[0] instanceof Date)
    .map(r => ({ fecha: r[0], profesional: String(r[2] || 'Sin asignar'), servicio: String(r[3] || 'Otro'),
      valor: Number(r[4]) || 0, estado: String(r[5] || '').toLowerCase(), tat: Number(r[6]) || null, sat: Number(r[7]) || null }));
}

function metricas_(filas, inicioMes) {
  const m = { total: filas.length, atendidas: 0, inasistencias: 0, canceladas: 0, ingresos: 0, tat: null, sat: null,
    porProfesional: {}, porServicio: {}, porSemana: [0, 0, 0, 0, 0], porDia: [0, 0, 0, 0, 0, 0, 0] };
  const tats = [], sats = [];
  filas.forEach(f => {
    if (/inasist|no asist/.test(f.estado)) m.inasistencias++;
    else if (/cancel/.test(f.estado)) m.canceladas++;
    else { m.atendidas++; m.ingresos += f.valor; }
    if (f.tat) tats.push(f.tat);
    if (f.sat) sats.push(f.sat);
    const p = (m.porProfesional[f.profesional] = m.porProfesional[f.profesional] || { atenciones: 0, ingresos: 0, inasistencias: 0 });
    p.atenciones++; if (/inasist|no asist/.test(f.estado)) p.inasistencias++; else if (!/cancel/.test(f.estado)) p.ingresos += f.valor;
    m.porServicio[f.servicio] = (m.porServicio[f.servicio] || 0) + 1;
    m.porSemana[Math.min(4, Math.floor((f.fecha.getDate() - 1) / 7))]++;
    m.porDia[f.fecha.getDay()]++;
  });
  if (tats.length) m.tat = tats.reduce((a, b) => a + b, 0) / tats.length;
  if (sats.length) m.sat = sats.reduce((a, b) => a + b, 0) / sats.length;
  return m;
}

const pct_ = (a, b) => (b ? ((a / b) * 100).toFixed(1).replace('.', ',') + '%' : '—');
const pesos_ = n => '$' + Math.round(n).toLocaleString('es-CO');
function variacion_(a, b) {
  if (!b) return 's/d';
  const v = ((a - b) / b) * 100;
  return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
}

/**
 * Llama a la API de Claude (Messages API) con cifras agregadas y devuelve el análisis en texto.
 * Usa respaldo automático del servidor ("fallbacks": "default") por si el modelo declina la solicitud.
 */
function analisisClaude_(nombreMes, a, p) {
  const key = prop_('ANTHROPIC_API_KEY');
  if (!key) return 'Configura ANTHROPIC_API_KEY en Propiedades de la secuencia de comandos para recibir el análisis automático con IA.';
  const datos = {
    mes: nombreMes, institucion: CONFIG.institucion,
    actual: { atenciones: a.total, atendidas: a.atendidas, inasistencias: a.inasistencias, canceladas: a.canceladas, ingresos: a.ingresos,
      tiempo_entrega_horas: a.tat, satisfaccion: a.sat, por_profesional: a.porProfesional, por_servicio: a.porServicio,
      por_semana: a.porSemana, por_dia_semana_dom_a_sab: a.porDia },
    mes_anterior: { atenciones: p.total, inasistencias: p.inasistencias, ingresos: p.ingresos, tiempo_entrega_horas: p.tat, satisfaccion: p.sat }
  };
  const prompt =
    'Eres analista de gestión de una institución de salud en Colombia. Con los indicadores agregados del mes (JSON abajo), ' +
    'escribe en español un informe para gerencia con estas secciones, en texto plano sin markdown:\n' +
    'RESUMEN EJECUTIVO (3-4 frases con las cifras clave y su variación frente al mes anterior)\n' +
    'HALLAZGOS (3 a 5 viñetas con "- ")\n' +
    'RECOMENDACIONES (3 viñetas accionables y concretas con "- ")\n' +
    'Usa solo los datos entregados; no inventes cifras. Si un dato falta, no lo menciones.\n\n' + JSON.stringify(datos);

  const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01'
    },
    payload: JSON.stringify({
      model: CONFIG.modeloClaude,
      max_tokens: 16000,
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const json = JSON.parse(r.getContentText() || '{}');
  if (r.getResponseCode() !== 200) return 'No fue posible generar el análisis con IA: ' + (json.error ? json.error.message : r.getResponseCode());
  if (json.stop_reason === 'refusal') return 'El análisis automático no estuvo disponible este mes. Revisa los indicadores en las tablas.';
  return (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

/** Crea las gráficas en una hoja auxiliar y las exporta como imágenes. */
function graficas_(a) {
  const ss = libro_();
  let sh = ss.getSheetByName('_informe');
  if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet('_informe');
  sh.getRange(1, 1, 6, 2).setValues([['Semana', 'Atenciones'], ['S1', a.porSemana[0]], ['S2', a.porSemana[1]], ['S3', a.porSemana[2]], ['S4', a.porSemana[3]], ['S5', a.porSemana[4]]]);
  const serv = Object.entries(a.porServicio).sort((x, y) => y[1] - x[1]).slice(0, 6);
  sh.getRange(1, 4, serv.length + 1, 2).setValues([['Servicio', 'Atenciones']].concat(serv));

  const semana = sh.newChart().asColumnChart().addRange(sh.getRange(1, 1, 6, 2))
    .setOption('title', 'Atenciones por semana').setOption('legend', { position: 'none' })
    .setOption('colors', ['#ff7a1a']).setOption('width', 620).setOption('height', 300).setPosition(1, 8, 0, 0).build();
  const servicios = sh.newChart().asBarChart().addRange(sh.getRange(1, 4, serv.length + 1, 2))
    .setOption('title', 'Servicios más solicitados').setOption('legend', { position: 'none' })
    .setOption('colors', ['#6d28d9']).setOption('width', 620).setOption('height', 300).setPosition(18, 8, 0, 0).build();
  sh.insertChart(semana);
  sh.insertChart(servicios);
  SpreadsheetApp.flush();
  const imgs = sh.getCharts().map(c => c.getAs('image/png'));
  ss.deleteSheet(sh);
  return imgs;
}

function construirPdf_(nombreMes, a, p, analisis, graficas) {
  const doc = DocumentApp.create(`Informe ${nombreMes} · ${CONFIG.institucion}`);
  const b = doc.getBody();
  b.setMarginTop(36).setMarginBottom(36);
  const titulo = b.appendParagraph(`Informe mensual · ${nombreMes}`).setHeading(DocumentApp.ParagraphHeading.TITLE);
  titulo.editAsText().setForegroundColor('#3b1fa8');
  b.appendParagraph(`${CONFIG.institucion} · Generado el ${fmt_(new Date(), 'dd/MM/yyyy HH:mm')}`).editAsText().setForegroundColor('#6b6280').setFontSize(10);

  b.appendParagraph('Indicadores clave').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const kpi = [
    ['Indicador', nombreMes, 'Mes anterior', 'Variación'],
    ['Atenciones', String(a.total), String(p.total), variacion_(a.total, p.total)],
    ['Atendidas', String(a.atendidas), String(p.atendidas), variacion_(a.atendidas, p.atendidas)],
    ['Inasistencia', pct_(a.inasistencias, a.total), pct_(p.inasistencias, p.total), ''],
    ['Ingresos', pesos_(a.ingresos), pesos_(p.ingresos), variacion_(a.ingresos, p.ingresos)]
  ];
  if (a.tat) kpi.push(['Tiempo de entrega (h)', a.tat.toFixed(1), p.tat ? p.tat.toFixed(1) : '—', '']);
  if (a.sat) kpi.push(['Satisfacción (1-5)', a.sat.toFixed(1), p.sat ? p.sat.toFixed(1) : '—', '']);
  estiloTabla_(b.appendTable(kpi));

  b.appendParagraph('Análisis y recomendaciones (IA)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  analisis.split('\n').filter(l => l.trim()).forEach(l => {
    if (/^[-•]\s*/.test(l)) b.appendListItem(l.replace(/^[-•]\s*/, '')).setGlyphType(DocumentApp.GlyphType.BULLET);
    else if (/^[A-ZÁÉÍÓÚÑ ]{6,}$/.test(l.trim())) b.appendParagraph(l.trim()).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    else b.appendParagraph(l);
  });

  b.appendParagraph('Gráficas').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  graficas.forEach(g => b.appendImage(g).setWidth(460).setHeight(222));

  b.appendParagraph('Productividad por profesional').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const prof = [['Profesional', 'Atenciones', 'Inasistencias', 'Ingresos']].concat(
    Object.entries(a.porProfesional).sort((x, y) => y[1].atenciones - x[1].atenciones)
      .map(([n, v]) => [n, String(v.atenciones), pct_(v.inasistencias, v.atenciones), pesos_(v.ingresos)]));
  estiloTabla_(b.appendTable(prof));
  b.appendParagraph('Análisis generado con IA a partir de cifras agregadas. Validar antes de tomar decisiones.').editAsText().setItalic(true).setFontSize(9).setForegroundColor('#8a8199');

  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  const pdf = file.getAs('application/pdf').setName(`Informe_${nombreMes.replace(' ', '_')}.pdf`);
  file.setTrashed(true);
  return pdf;
}

function estiloTabla_(t) {
  t.setBorderColor('#e6e2f0');
  const enc = t.getRow(0);
  for (let i = 0; i < enc.getNumCells(); i++) enc.getCell(i).setBackgroundColor('#1a0f45').editAsText().setForegroundColor('#ffffff').setBold(true);
  for (let r = 1; r < t.getNumRows(); r++) for (let c = 0; c < t.getRow(r).getNumCells(); c++) t.getRow(r).getCell(c).editAsText().setFontSize(10);
}
