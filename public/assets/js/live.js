/*
 * "Automatizaciones en acción": tres escenas animadas que simulan
 * automatizaciones reales (datos ficticios).
 *  - lab:    resultados de laboratorio enviados por WhatsApp
 *  - agenda: recordatorios, confirmaciones y lista de espera
 *  - report: informe mensual con gráficas y resumen escrito por IA
 */
(function () {
  const root = document.getElementById("en-accion");
  if (!root) return;
  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => Array.from(el.querySelectorAll(s));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ORDER = ["lab", "agenda", "report"];
  const DURATION = { lab: 17000, agenda: 17500, report: 15500 };

  let visible = false;
  let current = null; // { name, alive, t0 }
  let profIdx = 0;

  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    if (visible && !current) play("lab", true);
  }, { threshold: 0.2 }).observe($("#lvStage"));

  class Cancel extends Error {}
  function makeRun(name) {
    const run = { name, alive: true, t0: performance.now(), paused: 0 };
    run.wait = async (ms) => {
      let left = reduced ? 0 : ms;
      while (left > 0) {
        if (!run.alive) throw new Cancel();
        const step = Math.min(100, left);
        await new Promise((r) => setTimeout(r, step));
        if (visible && !document.hidden) left -= step;
        else run.paused += step;
      }
      if (!run.alive) throw new Cancel();
    };
    return run;
  }

  async function play(name, auto) {
    if (current) current.alive = false;
    const run = makeRun(name);
    current = run;
    $$(".lv-tab").forEach((t) => t.classList.toggle("is-active", t.dataset.scene === name));
    $$(".lv-scene").forEach((s) => s.classList.toggle("is-active", s.dataset.scene === name));
    try {
      await SCENES[name](run);
      await run.wait(1800);
      if (run.alive && !reduced) play(ORDER[(ORDER.indexOf(name) + 1) % ORDER.length], auto);
    } catch (e) {
      if (!(e instanceof Cancel)) console.error(e);
    }
  }
  $$(".lv-tab").forEach((t) => t.addEventListener("click", () => play(t.dataset.scene)));

  // Barra de progreso de la pestaña activa
  setInterval(() => {
    if (!current) return;
    const tab = $(`.lv-tab[data-scene="${current.name}"]`);
    const el = performance.now() - current.t0 - current.paused;
    tab.style.setProperty("--prog", Math.min(100, (el / DURATION[current.name]) * 100) + "%");
  }, 120);

  /* ---------- utilidades de chat ---------- */
  const now = (h, m) => `${h}:${String(m).padStart(2, "0")}`;
  function chatReset(chat) {
    chat.innerHTML = '<div class="wa__day">HOY</div>';
  }
  function trim(chat) {
    // conserva solo los últimos mensajes visibles
    const msgs = $$(".msg, .typing", chat);
    while (chat.scrollHeight > chat.clientHeight + 4 && msgs.length > 1) msgs.shift().remove();
  }
  async function typing(run, chat, ms) {
    const t = document.createElement("div");
    t.className = "typing";
    t.innerHTML = "<i></i><i></i><i></i>";
    chat.appendChild(t);
    trim(chat);
    await run.wait(ms);
    t.remove();
  }
  function msg(chat, html, dir, time, ticks) {
    const m = document.createElement("div");
    m.className = `msg msg--${dir}`;
    m.innerHTML = `${html}<div class="msg__meta">${time}${dir === "out" ? ' <span class="ticks">✓✓</span>' : ""}</div>`;
    chat.appendChild(m);
    trim(chat);
    return m;
  }
  function fly(scene) {
    const p = $("[data-pkt]", scene);
    p.classList.remove("is-fly");
    void p.offsetWidth;
    p.classList.add("is-fly");
  }
  function bump(el, delta = 1) {
    el.textContent = String(Number(el.textContent.replace(/\D/g, "")) + delta);
  }
  function setStatus(row, cls, text) {
    const s = $(".st", row);
    s.className = `st ${cls}`;
    s.textContent = text;
  }

  /* ============ Escena 1: laboratorio ============ */
  async function lab(run) {
    const sc = $('.lv-scene[data-scene="lab"]');
    const chat = $('[data-chat="lab"]', sc);
    const rows = $$("[data-lis-rows] tr", sc);
    const count = $("[data-lis-count]", sc), calls = $("[data-lis-calls]", sc);
    chatReset(chat);
    count.textContent = "46"; calls.textContent = "31";
    rows.slice(1).forEach((r) => { setStatus(r, "st--proc", "En proceso"); $("[data-t]", r).textContent = "—"; r.classList.remove("is-hl"); });

    const send = async (r, t) => {
      r.classList.add("is-hl");
      setStatus(r, "st--val", "Validado");
      $("[data-t]", r).textContent = t;
      await run.wait(650);
      setStatus(r, "st--send", "Enviando…");
      fly(sc);
      await run.wait(900);
      setStatus(r, "st--sent", "Enviado ✓✓");
      bump(count); bump(calls);
      r.classList.remove("is-hl");
    };

    await run.wait(700);
    const maria = rows[1];
    maria.classList.add("is-hl");
    setStatus(maria, "st--val", "Validado");
    $("[data-t]", maria).textContent = "07:42";
    await run.wait(800);
    setStatus(maria, "st--send", "Enviando…");
    fly(sc);
    await run.wait(700);
    await typing(run, chat, 1100);
    msg(chat,
      'Hola <b>María</b> 👋<br>Tu resultado de <b>Perfil lipídico</b> ya está listo.' +
      '<div class="msg__doc"><i>PDF</i><span><b>Resultado_Perfil_Lipidico.pdf</b><small>2 páginas · 184 KB</small></span></div>' +
      'Ábrelo de forma segura. Tu médico tratante te explicará los valores en tu próxima cita.' +
      '<div class="msg__btns"><span>📄 Ver resultado</span><span>📅 Agendar con mi médico</span></div>', "in", "7:42");
    setStatus(maria, "st--sent", "Enviado ✓✓");
    bump(count); bump(calls);
    maria.classList.remove("is-hl");

    await run.wait(1500);
    const reply = msg(chat, "¡Muchas gracias! 🙏 ¿Puedo pedir cita con el Dr. Ruiz?", "out", "7:44");
    await run.wait(800);
    $(".ticks", reply).classList.add("is-read");
    await send(rows[2], "07:44");
    await typing(run, chat, 1000);
    msg(chat, "¡Claro, María! El Dr. Ruiz tiene disponible:<br>📅 <b>Jue 12</b> · 10:00 a.m.<br>📅 <b>Vie 13</b> · 3:00 p.m.<br>Responde con la opción que prefieras.", "in", "7:44");
    await send(rows[3], "07:46");
    await run.wait(500);
    const r2 = msg(chat, "Jueves 10 a.m. 👍", "out", "7:45");
    await run.wait(700);
    $(".ticks", r2).classList.add("is-read");
    await typing(run, chat, 800);
    msg(chat, "✅ Listo. Tu cita quedó agendada el <b>jueves 12 a las 10:00 a.m.</b> Te enviaremos un recordatorio un día antes.", "in", "7:45");
    await send(rows[4], "07:49");
  }

  /* ============ Escena 2: agenda ============ */
  const PROFS = [
    { title: "Agenda · Dra. Pérez · Medicina interna", wa: "Consultorio Dra. Pérez", who: "la Dra. Pérez", esp: "Medicina interna", place: "Consultorio 302 · Torre Médica",
      svc: ["Control HTA", "Primera vez", "Control diabetes", "Lectura exámenes", "Chequeo general"] },
    { title: "Agenda · Dr. Ruiz · Odontología", wa: "Clínica Dental Sonríe", who: "el Dr. Ruiz", esp: "Odontología", place: "Clínica Sonríe · Av. 0 #12-40",
      svc: ["Limpieza", "Ortodoncia", "Endodoncia", "Valoración", "Blanqueamiento"] },
    { title: "Agenda · Ps. Andrea Gómez · Psicología", wa: "Ps. Andrea Gómez", who: "la psicóloga Andrea Gómez", esp: "Psicología", place: "Consultorio 5 · Centro Bienestar",
      svc: ["Terapia individual", "Primera consulta", "Terapia de pareja", "Seguimiento", "Orientación"] }
  ];
  const APPTS = [
    { d: 0, h: 0, n: "Ana L.", s: 0, st: "ok" }, { d: 0, h: 2, n: "Pedro V.", s: 3, st: "ok" }, { d: 0, h: 4, n: "Rosa T.", s: 1, st: "ok" },
    { d: 1, h: 1, n: "Diana C.", s: 4, st: "ok" }, { d: 1, h: 3, n: "Mario B.", s: 2, st: "ok" }, { d: 1, h: 5, n: "Elena F.", s: 0, st: "ok" },
    { d: 2, h: 0, n: "Javier N.", s: 3, st: "pend", key: "w1" }, { d: 2, h: 1, n: "Sofía R.", s: 1, st: "pend", key: "sofia" },
    { d: 2, h: 3, n: "Camilo D.", s: 4, st: "pend", key: "w2" }, { d: 2, h: 5, n: "Carlos M.", s: 0, st: "pend", key: "carlos" },
    { d: 3, h: 2, n: "Lucía A.", s: 2, st: "pend" }, { d: 4, h: 0, n: "Tomás G.", s: 1, st: "pend" }, { d: 4, h: 4, n: "Valentina P.", s: 3, st: "pend" }
  ];
  const HOURS = ["8:00 a.m.", "9:00 a.m.", "10:00 a.m.", "11:00 a.m.", "2:00 p.m.", "3:00 p.m."];

  async function agenda(run) {
    const sc = $('.lv-scene[data-scene="agenda"]');
    const P = PROFS[profIdx++ % PROFS.length];
    const pi = PROFS.indexOf(P);
    $$("[data-prof]", sc).forEach((b) => b.classList.toggle("is-on", +b.dataset.prof === pi));
    $("[data-cal-title]", sc).textContent = P.title;
    $("[data-wa-name2]", sc).innerHTML = `${P.wa} <i class="wa__verified">✓</i>`;
    const grid = $("[data-cal-grid]", sc);
    $$(".appt", grid).forEach((a) => a.remove());
    const el = {};
    APPTS.forEach((a) => {
      const d = document.createElement("div");
      d.className = "appt" + (a.st === "ok" ? " is-ok" : "");
      d.style.gridColumn = a.d + 2;
      d.style.gridRow = a.h + 2;
      d.innerHTML = `<b>${a.n}</b><small>${P.svc[a.s]}</small>${a.st === "ok" ? '<span class="ico">✓</span>' : ""}`;
      d.title = `${a.n} · ${P.svc[a.s]} · ${HOURS[a.h]}`;
      grid.appendChild(d);
      if (a.key) el[a.key] = d;
    });
    const sent = $("[data-cal-sent]", sc), ok = $("[data-cal-ok]", sc), re = $("[data-cal-re]", sc), toast = $("[data-cal-toast]", sc);
    sent.textContent = "58"; ok.textContent = "41"; re.textContent = "6";
    toast.classList.remove("is-on");
    const chat = $('[data-chat="agenda"]', sc);
    chatReset(chat);

    await run.wait(800);
    // Recordatorios 24 h antes para todas las citas del miércoles
    for (const k of ["w1", "sofia", "w2", "carlos"]) {
      el[k].classList.add("is-rem", "is-pulse");
      fly(sc);
      bump(sent);
      await run.wait(420);
      el[k].classList.remove("is-pulse");
    }
    await typing(run, chat, 900);
    msg(chat,
      `Hola <b>Carlos</b> 👋 Te recordamos tu cita de <b>${P.esp}</b> con ${P.who}:<br>📅 Mañana, miércoles 11 de noviembre<br>🕒 <b>3:00 p.m.</b><br>📍 ${P.place}<br>Responde <b>1</b> para confirmar o <b>2</b> para reprogramar.` +
      '<div class="msg__btns"><span>1 · Confirmo ✅</span><span>2 · Reprogramar</span></div>', "in", "6:00");
    await run.wait(1700);
    const r = msg(chat, "1", "out", "6:03");
    await run.wait(600);
    $(".ticks", r).classList.add("is-read");
    await typing(run, chat, 800);
    msg(chat, "¡Listo, Carlos! ✅ Tu cita quedó <b>confirmada</b>. Te esperamos 10 minutos antes.", "in", "6:03");
    el.carlos.classList.remove("is-rem");
    el.carlos.classList.add("is-ok", "is-pulse");
    el.carlos.insertAdjacentHTML("beforeend", '<span class="ico">✓</span>');
    bump(ok);
    await run.wait(700);
    el.carlos.classList.remove("is-pulse");

    // Otra paciente reprograma: el cupo se reasigna desde la lista de espera
    await run.wait(700);
    el.sofia.classList.remove("is-rem");
    el.sofia.classList.add("is-cancel", "is-pulse");
    $("small", el.sofia).textContent = "Reprogramó";
    await run.wait(1200);
    el.sofia.classList.remove("is-cancel");
    el.sofia.classList.add("is-re");
    $("b", el.sofia).textContent = "Laura M.";
    $("small", el.sofia).textContent = "Lista de espera";
    $("[data-cal-toast-txt]", sc).textContent = "9:00 a.m. asignado a Laura M. y notificada por WhatsApp";
    toast.classList.add("is-on");
    bump(re);
    await run.wait(900);
    el.sofia.classList.remove("is-pulse");
    for (const k of ["w1", "w2"]) {
      await run.wait(700);
      el[k].classList.remove("is-rem");
      el[k].classList.add("is-ok");
      el[k].insertAdjacentHTML("beforeend", '<span class="ico">✓</span>');
      bump(ok);
    }
    await run.wait(1200);
    toast.classList.remove("is-on");
  }

  /* ============ Escena 3: informe mensual ============ */
  const WEEKS = [268, 241, 290, 312, 137];
  const TAT = [3.9, 3.7, 3.4, 3.1, 3.0];
  const X0 = 28, SLOT = (296 - 28) / 5, BASE = 128;
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  function barPath(x, w, y, h) {
    const r = Math.min(4, h);
    return `M${x},${BASE} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${BASE} Z`;
  }
  function buildCharts(sc) {
    const bars = $("[data-bars]", sc);
    $$(".dyn", bars).forEach((e) => e.remove());
    WEEKS.forEach((v, i) => {
      const g = svgEl("g", { class: "dyn" });
      const x = X0 + SLOT * i + (SLOT - 26) / 2;
      const t = svgEl("title", {}); t.textContent = `Semana ${i + 1}: ${v} pacientes`;
      const p = svgEl("path", { d: barPath(x, 26, BASE, 0), fill: "#ff7a1a", "data-v": v, "data-x": x });
      const hit = svgEl("rect", { x: X0 + SLOT * i, y: 14, width: SLOT, height: 116, fill: "transparent" });
      g.append(t, hit, p);
      const lab = svgEl("text", { class: "xlab", x: x + 13, y: 142 }); lab.textContent = `S${i + 1}`;
      g.appendChild(lab);
      bars.appendChild(g);
    });
    const line = $("[data-line]", sc);
    line.classList.remove("is-drawn");
    $$(".dyn", line).forEach((e) => e.remove());
    const yOf = (v) => BASE - (v - 2) * 54;
    const pts = TAT.map((v, i) => [X0 + SLOT * (i + 0.5), yOf(v)]);
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const defs = svgEl("defs", { class: "dyn" });
    defs.innerHTML = '<linearGradient id="lvArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed" stop-opacity=".22"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></linearGradient>';
    const area = svgEl("path", { class: "area dyn", d: `${d} L${pts[4][0]},${BASE} L${pts[0][0]},${BASE} Z` });
    const ln = svgEl("path", { class: "ln dyn", d });
    line.append(defs, area, ln);
    const len = ln.getTotalLength();
    ln.style.strokeDasharray = len;
    ln.style.strokeDashoffset = len;
    pts.forEach((p, i) => {
      const g = svgEl("g", { class: "dyn" });
      const t = svgEl("title", {}); t.textContent = `Semana ${i + 1}: ${String(TAT[i]).replace(".", ",")} h`;
      g.append(t, svgEl("circle", { cx: p[0], cy: p[1], r: 4 }));
      const lab = svgEl("text", { class: "xlab", x: p[0], y: 142 }); lab.textContent = `S${i + 1}`;
      g.appendChild(lab);
      line.appendChild(g);
    });
    const end = svgEl("text", { class: "vlab dyn", x: pts[4][0], y: pts[4][1] - 10 }); end.textContent = "3,0 h";
    end.style.opacity = 0; end.style.transition = "opacity .4s 1.4s";
    line.appendChild(end);
    return { ln, end };
  }

  async function report(run) {
    const sc = $('.lv-scene[data-scene="report"]');
    const kpis = $$("[data-kpi-to]", sc);
    kpis.forEach((k) => (k.textContent = "0"));
    const typed = $("[data-rep-typed]", sc), status = $("[data-rep-status]", sc);
    typed.textContent = "";
    status.textContent = "Esperando datos…";
    $("[data-mail-open]", sc).classList.remove("is-on");
    $$(".mail__item--new", sc).forEach((e) => e.remove());
    const { ln, end } = buildCharts(sc);
    $$("[data-bars] .vlab", sc).forEach((e) => e.remove());

    await run.wait(600);
    // KPIs
    const t0 = performance.now();
    await new Promise((resolve) => {
      const step = () => {
        const p = reduced ? 1 : Math.min(1, (performance.now() - t0) / 1300);
        const e = 1 - Math.pow(1 - p, 3);
        kpis.forEach((k) => {
          const to = +k.dataset.kpiTo, dec = +(k.dataset.dec || 0);
          k.textContent = (to * e).toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec });
        });
        p < 1 ? requestAnimationFrame(step) : resolve();
      };
      step();
    });
    // Barras
    const bars = $("[data-bars]", sc);
    $$("path[data-v]", bars).forEach((p, i) => {
      setTimeout(() => {
        const v = +p.dataset.v, h = (v / 300) * 108, x = +p.dataset.x;
        const t1 = performance.now();
        const grow = () => {
          const q = reduced ? 1 : Math.min(1, (performance.now() - t1) / 700);
          const e = 1 - Math.pow(1 - q, 3);
          p.setAttribute("d", barPath(x, 26, BASE - h * e, h * e));
          if (q < 1) requestAnimationFrame(grow);
          else if (v === Math.max(...WEEKS)) {
            const lab = svgEl("text", { class: "vlab", x: x + 13, y: BASE - h - 5 });
            lab.textContent = v;
            bars.appendChild(lab);
          }
        };
        grow();
      }, reduced ? 0 : i * 140);
    });
    await run.wait(900);
    // Línea
    ln.style.strokeDashoffset = 0;
    ln.closest("svg").classList.add("is-drawn");
    end.style.opacity = 1;
    await run.wait(1500);
    // Resumen de Claude
    status.textContent = "Analizando 3.912 registros…";
    await run.wait(1100);
    status.textContent = "Redactando…";
    const txt = "En octubre se atendieron 1.248 pacientes (+12% vs. septiembre) y se procesaron 3.912 exámenes. El tiempo de entrega bajó a 3,2 h gracias al envío automático de resultados por WhatsApp. La semana 4 fue la de mayor demanda (312 pacientes): se recomienda reforzar la toma de muestras los lunes y martes.";
    for (let i = 0; i < txt.length; i += 3) {
      typed.textContent = txt.slice(0, i + 3);
      await run.wait(16);
    }
    typed.textContent = txt;
    status.textContent = "Listo ✓ · PDF generado";
    await run.wait(700);
    fly(sc);
    await run.wait(900);
    const item = document.createElement("div");
    item.className = "mail__item mail__item--new";
    item.innerHTML = '<span class="av">IA</span><div><b>Informe automático</b><small>📊 Informe mensual octubre 2026 — listo</small></div><em>7:00</em>';
    $("[data-mail-list]", sc).prepend(item);
    await run.wait(700);
    $("[data-mail-open]", sc).classList.add("is-on");
    await run.wait(2200);
  }

  const SCENES = { lab, agenda, report };
})();
