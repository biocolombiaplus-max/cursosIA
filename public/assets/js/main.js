(async function () {
  const cfg = await window.BMStore.load();
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), cfg);
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lines = (s) => String(s || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const waNumber = String(cfg.contacto?.whatsapp || "").replace(/\D/g, "");
  const waLink = (msg) => `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pago = cfg.pago || {};

  /* ---------- Textos y precios ---------- */
  $$("[data-bind]").forEach((el) => {
    const v = get(el.dataset.bind);
    if (v !== undefined && v !== null && v !== "") el.textContent = v;
    else if (el.dataset.bind === "evento.lugar") el.textContent = "Sede por confirmar";
  });
  $$("[data-price]").forEach((el) => (el.textContent = money(get("precios." + el.dataset.price))));
  $$("[data-price-num]").forEach((el) => (el.textContent = Number(get("precios." + el.dataset.priceNum) || 0).toLocaleString("es-CO")));
  $$("[data-list]").forEach((el) => {
    el.innerHTML = lines(get(el.dataset.list)).map((l) => `<li><svg><use href="#i-check"/></svg><span>${esc(l)}</span></li>`).join("");
  });
  const credIcons = ["i-flask", "i-build", "i-cpu", "i-cert"];
  $$("[data-creds]").forEach((el) => {
    el.innerHTML = lines(cfg.instructor?.credenciales).map((l, i) => `<li><svg><use href="#${credIcons[i % credIcons.length]}"/></svg><b>${esc(l)}</b></li>`).join("");
  });
  const sig = $("[data-cert-sig]");
  if (sig && cfg.certificado?.firmaImg) {
    sig.style.backgroundImage = `url("${cfg.certificado.firmaImg}")`;
    sig.classList.add("has-img");
  }

  /* ---------- Contacto ---------- */
  $$("[data-wa]").forEach((a) => {
    a.href = waLink(cfg.contacto?.mensajeWhatsapp || "Hola, quiero información del curso.");
    a.target = "_blank";
    a.rel = "noopener";
  });
  $$("[data-mail]").forEach((a) => {
    a.href = "mailto:" + (cfg.contacto?.email || "");
    a.textContent = cfg.contacto?.email || "";
  });
  $$("[data-ig]").forEach((a) => {
    if (cfg.contacto?.instagram) {
      a.href = cfg.contacto.instagram.startsWith("http") ? cfg.contacto.instagram : "https://instagram.com/" + cfg.contacto.instagram.replace("@", "");
      a.target = "_blank";
      a.classList.remove("is-hidden");
    }
  });

  /* ---------- Imágenes administrables ---------- */
  const secs = cfg.secciones || {};
  $$("[data-bg]").forEach((el) => {
    const s = secs[el.dataset.bg];
    if (s && s.bg) {
      el.style.backgroundImage = `url("${s.bg}")`;
      el.style.setProperty("--ov", s.overlay ?? 0.75);
      el.classList.add("has-img");
    }
  });
  $$("[data-media]").forEach((img) => {
    const s = secs[img.dataset.media];
    if (s && s.media) {
      img.src = s.media;
      img.loading = "lazy";
      img.closest("[data-media-wrap]")?.classList.add("has-media");
    }
  });

  // Foto pequeña del instructor en su tarjeta de presentación
  const mini = $("[data-instructor-mini]");
  if (mini && secs.instructor?.media) {
    mini.src = secs.instructor.media;
    mini.hidden = false;
    mini.nextElementSibling.hidden = true;
  }

  /* ---------- Galería y testimonios ---------- */
  const gal = (cfg.galeria || []).filter((g) => g && g.src);
  if (gal.length) {
    $("#galeria").classList.remove("is-hidden");
    $("[data-gallery]").innerHTML = gal
      .map((g) => `<figure class="reveal"><img src="${esc(g.src)}" alt="${esc(g.caption || "")}" loading="lazy">${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}</figure>`)
      .join("");
  }
  const tes = (cfg.testimonios || []).filter((t) => t && t.texto);
  if (tes.length) {
    $("#testimonios").classList.remove("is-hidden");
    $("[data-testis]").innerHTML = tes
      .map((t) => {
        const ini = (t.nombre || "?").split(" ").map((p) => p[0]).slice(0, 2).join("");
        const pic = t.foto ? `<img src="${esc(t.foto)}" alt="">` : `<span class="ini">${esc(ini)}</span>`;
        return `<article class="testi reveal"><blockquote>${esc(t.texto)}</blockquote><div class="testi__who">${pic}<div><b>${esc(t.nombre)}</b><small>${esc(t.cargo || "")}</small></div></div></article>`;
      })
      .join("");
  }

  /* ---------- Video de YouTube ---------- */
  function ytId(url) {
    const m = String(url || "").match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(url || "") ? url : "";
  }
  const vid = ytId(cfg.video?.url);
  if (vid) {
    $("#video").classList.remove("is-hidden");
    const th = $("[data-thumb]");
    th.src = `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`;
    th.onerror = () => { th.onerror = () => (th.style.visibility = "hidden"); th.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`; };
    $("[data-play]").addEventListener("click", (e) => {
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`;
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      f.title = cfg.video?.titulo || "Video";
      e.currentTarget.replaceWith(f);
    });
  }

  /* ---------- Navegación y barra de progreso ---------- */
  const nav = $("#nav");
  const burger = $(".nav__burger");
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  $$(".nav__links a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));
  const sticky = $(".sticky-cta");
  const prog = $(".progress-line");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", scrollY > 40);
    sticky.classList.toggle("is-visible", scrollY > innerHeight * 0.8);
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Pestañas de perfiles ---------- */
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.toggle("is-active", x === t));
      $$(".panel").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === t.dataset.tab));
    })
  );

  /* ---------- Cuenta regresiva ---------- */
  const target = new Date(cfg.evento?.fechaISO || "2026-11-07T14:00:00-05:00").getTime();
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    $$('[data-countdown="full"]').forEach((el) => {
      $('[data-cd="d"]', el).textContent = pad(d);
      $('[data-cd="h"]', el).textContent = pad(h);
      $('[data-cd="m"]', el).textContent = pad(m);
      $('[data-cd="s"]', el).textContent = pad(s);
    });
    const compact = target > Date.now() ? `Faltan ${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s` : "¡Hoy es el taller!";
    $$('[data-countdown="compact"]').forEach((el) => (el.textContent = compact));
    const dias = target <= Date.now() ? "¡Hoy es el taller!" : d > 1 ? `Faltan ${d} días` : d === 1 ? "¡Falta 1 día!" : `Faltan ${h} h ${pad(m)} min`;
    $$('[data-countdown="days"]').forEach((el) => (el.textContent = dias));
    payTimer();
  }

  /* ---------- Animaciones al hacer scroll ---------- */
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 70 + "ms";
    io.observe(el);
  });
  const cio = new IntersectionObserver((entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1600);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      if (!reduced) requestAnimationFrame(step);
      cio.unobserve(el);
    })
  );
  $$("[data-count]").forEach((el) => cio.observe(el));

  /* ---------- Efectos: spotlight, botones magnéticos, tilt ---------- */
  $$(".auto, .why2__item, .tl, .bento__item, .plan, .steps3 li, .case").forEach((el) => {
    el.classList.add("spot");
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });
  if (!reduced && matchMedia("(hover: hover)").matches) {
    $$(".magnetic").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
      });
      b.addEventListener("pointerleave", () => (b.style.transform = ""));
    });
    $$("[data-tilt]").forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
      });
      c.addEventListener("pointerleave", () => (c.style.transform = ""));
    });
  }

  /* ---------- Partículas del hero ---------- */
  (function particles() {
    const cv = $(".hero__particles");
    if (!cv || reduced) return;
    const ctx = cv.getContext("2d");
    let w, h, pts, visible = true;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.offsetWidth; h = cv.offsetHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(70, Math.round((w * h) / 22000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 }));
    };
    resize();
    addEventListener("resize", resize);
    new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(cv);
    (function frame() {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        ctx.fillStyle = "rgba(200,180,255,.55)";
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.4, 0, 6.3); ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) {
            ctx.strokeStyle = `rgba(167,139,250,${(1 - d / 130) * 0.22})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
    })();
  })();

  /* ---------- Automatización animada del hero ---------- */
  (async function workflow() {
    const wf = $("#wf");
    if (!wf) return;
    const scenarios = [
      { in: "“¿Ya está mi resultado?”", out: "Hola María 👋 Tu resultado de perfil lipídico ya está disponible. Descárgalo aquí de forma segura. Tu médico tratante te explicará los valores en tu próxima cita." },
      { in: "“Quiero agendar control”", out: "¡Hola Carlos! Tengo disponible el martes a las 3:00 p.m. o el miércoles a las 9:30 a.m. con la Dra. Pérez. ¿Cuál prefieres? Te enviaré un recordatorio un día antes." },
      { in: "“¿Debo ir en ayunas?”", out: "Hola Laura. Para tu glicemia y perfil lipídico necesitas ayuno de 10 a 12 horas; puedes tomar agua. Te esperamos de 6:30 a 9:00 a.m. con tu orden y documento." }
    ];
    const typed = $("[data-wf-typed]", wf), inEl = $("[data-wf-in]", wf), status = $("[data-wf-status]", wf), time = $("[data-wf-time]", wf);
    const dots1 = $$('[data-dot="1"]', wf), dots2 = $$('[data-dot="2"]', wf);
    const fire = (dots) => dots.forEach((c) => {
      c.classList.add("is-on");
      try { c.querySelector("animateMotion").beginElement(); } catch (e) {}
      setTimeout(() => c.classList.remove("is-on"), 950);
    });
    let visible = true;
    new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(wf);
    if (reduced) {
      wf.dataset.phase = "3";
      typed.textContent = scenarios[0].out;
      status.textContent = "Listo ✓";
      return;
    }
    let i = 0;
    for (;;) {
      while (!visible || document.hidden) await sleep(400);
      const sc = scenarios[i++ % scenarios.length];
      wf.dataset.phase = "1";
      inEl.textContent = sc.in;
      typed.textContent = "";
      status.textContent = "Esperando…";
      time.textContent = "0.0 s";
      await sleep(600);
      fire(dots1);
      await sleep(950);
      wf.dataset.phase = "2";
      status.textContent = "Redactando…";
      const t0 = performance.now();
      for (let k = 0; k < sc.out.length; k += 2) {
        typed.textContent = sc.out.slice(0, k + 2);
        time.textContent = ((performance.now() - t0) / 1000).toFixed(1) + " s";
        await sleep(22);
      }
      status.textContent = "Listo ✓";
      await sleep(250);
      fire(dots2);
      await sleep(900);
      wf.dataset.phase = "3";
      await sleep(2600);
    }
  })();

  /* ---------- Demo en vivo (consola) ---------- */
  (function demo() {
    const box = $("#console");
    if (!box) return;
    const cases = [
      {
        title: "nota_clinica_soap",
        manual: "12 min",
        input: "“Paciente femenina de 54 años, consulta por dolor de cabeza de tres días, sobre todo en la mañana. Tiene hipertensión, toma losartán 50 miligramos pero a veces se le olvida. Tensión hoy 150 sobre 95, frecuencia 78. No tiene déficit neurológico. Le explico adherencia y signos de alarma, control en una semana.”",
        steps: ["Dictado recibido", "Anonimización", "Claude estructura", "Lista para la HC"],
        output:
          "NOTA CLÍNICA · FORMATO SOAP\n\nS: Mujer de 54 años con cefalea de 3 días, predominio matutino. Antecedente de HTA en manejo con losartán 50 mg, adherencia irregular.\n\nO: PA 150/95 mmHg · FC 78 lpm. Sin déficit neurológico.\n\nA: Cefalea en paciente con HTA no controlada, probable baja adherencia.\n\nP: Educación en adherencia. Signos de alarma explicados. Control de PA en 1 semana.\n\n⚠ Borrador para revisión y firma del médico."
      },
      {
        title: "entrega_resultados_lab",
        manual: "14 min",
        input: "Evento del LIS → Paciente: María G. · Examen: Perfil lipídico · Estado: VALIDADO 07:42 a.m. · Canal preferido: WhatsApp · Médico tratante: Dr. Ruiz",
        steps: ["Resultado validado", "Claude redacta", "Envío WhatsApp", "Registro en Sheets"],
        output:
          "MENSAJE PARA WHATSAPP\n\nHola María 👋\nTu resultado de *perfil lipídico* ya está disponible.\n\n📄 Descárgalo aquí de forma segura: [enlace]\n🩺 El Dr. Ruiz revisará contigo los valores en tu próxima cita.\n\n¿Necesitas agendar? Responde *CITA*.\n\n— Laboratorio Clínico\n\n✓ Registrado en hoja de control · 07:42"
      },
      {
        title: "respuesta_glosa",
        manual: "35 min",
        input: "Glosa · Factura FE-4587 · Código 1.2 Pertinencia: “Ecografía abdominal total sin justificación clínica.” Soportes disponibles: HC del 03/10 (dolor en hipocondrio derecho, 5 días, Murphy +), orden médica, resultado de la ecografía.",
        steps: ["Glosa recibida", "Revisa la historia", "Argumenta", "Borrador listo"],
        output:
          "RESPUESTA A GLOSA · FE-4587\n\nSe NO ACEPTA la glosa por pertinencia.\n\n1. La historia clínica del 03/10 registra dolor en hipocondrio derecho de 5 días con signo de Murphy positivo.\n2. Ante este cuadro, la ecografía abdominal es el estudio inicial indicado para descartar patología biliar.\n3. Existe orden médica y resultado que confirman la realización.\n\nSoportes: HC folio 12 · Orden médica · Informe ecográfico.\n\n⚠ Borrador para validación del auditor."
      }
    ];
    let cur = 0, running = false, ran = false;
    const stepsEl = $("[data-c-steps]", box), out = $("[data-c-out]", box), inEl = $("[data-c-in]", box), run = $("[data-c-run]", box);
    function load(idx) {
      cur = idx;
      const c = cases[idx];
      $$(".case", box).forEach((b) => b.classList.toggle("is-active", +b.dataset.case === idx));
      $("[data-c-title]", box).textContent = c.title;
      $("[data-c-manual]", box).textContent = c.manual;
      $("[data-c-auto]", box).textContent = "—";
      inEl.textContent = c.input;
      stepsEl.innerHTML = c.steps.map((s, i) => `<li><b>0${i + 1}</b>${s}</li>`).join("");
      out.innerHTML = '<span class="io__ph">Presiona “Ejecutar automatización”…</span>';
    }
    async function execute() {
      if (running) return;
      running = true;
      run.classList.add("is-running");
      const c = cases[cur], lis = $$("li", stepsEl), my = cur;
      out.textContent = "";
      const t0 = performance.now();
      for (let i = 0; i < 3; i++) {
        lis[i].classList.add("is-run");
        await sleep(reduced ? 0 : 650);
        lis[i].classList.add("is-done");
        if (my !== cur) break;
      }
      lis[3]?.classList.add("is-run");
      const chunk = reduced ? c.output.length : 3;
      for (let k = 0; k < c.output.length && my === cur; k += chunk) {
        out.textContent = c.output.slice(0, k + chunk);
        await sleep(14);
      }
      if (my === cur) {
        lis[3].classList.add("is-done");
        $("[data-c-auto]", box).textContent = Math.max(3, ((performance.now() - t0) / 1000) | 0) + " seg";
      }
      running = false;
      run.classList.remove("is-running");
    }
    $$(".case", box).forEach((b) => b.addEventListener("click", () => { running = false; run.classList.remove("is-running"); load(+b.dataset.case); execute(); }));
    run.addEventListener("click", execute);
    load(0);
    new IntersectionObserver((e, o) => {
      if (e[0].isIntersecting && !ran) { ran = true; o.disconnect(); setTimeout(execute, 500); }
    }, { threshold: 0.35 }).observe(box);
  })();

  /* =========================================================
     Inscripción → pago Bre-B → soporte
     ========================================================= */
  const modal = $("#modal");
  const form = $("#regForm");
  const REG_KEY = "bm-reg";
  const endpoint = cfg.registro?.endpoint || "";
  let lastFocus = null;
  const REGS_KEY = "bm-regs";
  let reg = null;      // inscripción que se está viendo
  let regs = [];       // todas las inscripciones hechas desde este dispositivo
  let payFile = null;
  let lastMode = null;
  try { regs = JSON.parse(localStorage.getItem(REGS_KEY) || "[]"); } catch (e) {}
  try {
    // Compatibilidad: inscripción única guardada por la versión anterior
    const old = JSON.parse(localStorage.getItem(REG_KEY) || "null");
    if (old && !regs.length) regs.push({ id: "r" + old.ts, ...old });
    localStorage.removeItem(REG_KEY);
  } catch (e) {}
  const saveReg = () => {
    if (reg) {
      const i = regs.findIndex((r) => r.id === reg.id);
      if (i >= 0) regs[i] = reg; else regs.push(reg);
    }
    try { localStorage.setItem(REGS_KEY, JSON.stringify(regs)); } catch (e) {}
  };

  async function post(payload) {
    if (!endpoint) return false;
    try {
      await fetch(endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      return true;
    } catch (e) {
      return false;
    }
  }

  function showStep(name) {
    $$(".mstep", modal).forEach((s) => (s.hidden = s.dataset.step !== name));
    const idx = { form: 0, pay: 1, done: 2, hub: -1 }[name];
    $$("[data-msteps] li", modal).forEach((li, i) => {
      li.classList.toggle("is-active", i === idx);
      li.classList.toggle("is-done", i < idx);
    });
    $(".modal__main", modal).scrollTop = 0;
    if (name === "pay") fillPay();
    if (name === "done") fillDone();
    if (name === "hub") fillHub();
  }

  // Lista de inscripciones de este dispositivo
  function fillHub() {
    const list = $("[data-hub-list]");
    list.innerHTML = regs.slice().reverse().map((r) => {
      const d = r.data, ok = r.status === "soporte" || r.status === "pagado";
      const chip = r.status === "pagado" ? "Pago aprobado" : r.status === "proceso" ? "Pago en proceso" : ok ? "Soporte enviado" : "Pago pendiente";
      return `<button type="button" class="hub-item" data-hub-id="${esc(r.id)}">
        <span class="hub-item__av">${esc((d.nombre || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase())}</span>
        <span class="hub-item__txt"><b>${esc(d.nombre)}</b><small>${esc(d.modalidad)}${d.grupo && d.grupo !== "No" ? " · grupo de " + esc(d.personas) : ""} · ${esc(d.valor)}</small></span>
        <span class="hub-chip ${ok ? "is-ok" : ""}">${chip}</span>
      </button>`;
    }).join("");
    $$("[data-hub-id]", list).forEach((b) => b.addEventListener("click", () => {
      reg = regs.find((r) => r.id === b.dataset.hubId);
      showStep(["soporte", "pagado", "proceso"].includes(reg.status) ? "done" : "pay");
    }));
  }
  function nuevaInscripcion(mode) {
    reg = null;
    payFile = null;
    drop.classList.remove("has-file");
    form.reset();
    const m = mode || lastMode;
    if (m) {
      const r = form.querySelector(`input[name="modalidad"][value="${m === "virtual" ? "Virtual" : "Presencial"}"]`);
      if (r) r.checked = true;
      form.querySelector('[name="grupo"]').checked = m === "grupo";
    }
    updateTotal();
    showStep("form");
    setTimeout(() => form.querySelector('[name="nombre"]').focus(), 300);
  }
  $$("[data-new-reg]").forEach((b) => b.addEventListener("click", () => nuevaInscripcion()));

  function openModal(mode) {
    lastFocus = document.activeElement;
    lastMode = mode || null;
    if (regs.length) { reg = null; showStep("hub"); }
    else {
      showStep("form");
      if (mode) {
        const r = form.querySelector(`input[name="modalidad"][value="${mode === "virtual" ? "Virtual" : "Presencial"}"]`);
        if (r) r.checked = true;
        form.querySelector('[name="grupo"]').checked = mode === "grupo";
      }
      setTimeout(() => form.querySelector('[name="nombre"]').focus(), 350);
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  const P = cfg.precios || {};
  const roundCOP = (n) => Math.round(n / 100) * 100;
  const descPct = Number(P.descuentoGrupo || 0);
  const grupoMin = Number(P.grupoMinimo || 3);
  function cotizar() {
    const modalidad = form.querySelector('input[name="modalidad"]:checked')?.value || "Presencial";
    const presencial = modalidad === "Presencial";
    const plan = presencial ? form.querySelector('input[name="plan"]:checked')?.value || "completo" : "completo";
    const grupo = form.querySelector('[name="grupo"]').checked;
    const personas = grupo ? Math.max(grupoMin, parseInt(form.querySelector('[name="personas"]').value, 10) || grupoMin) : 1;
    const f = grupo ? 1 - descPct / 100 : 1;
    let hoyBase, saldoBase;
    if (!presencial) { hoyBase = P.virtual; saldoBase = 0; }
    else if (plan === "reserva") { hoyBase = P.presencialReserva; saldoBase = P.presencialSaldo; }
    else { hoyBase = P.presencial; saldoBase = 0; }
    const hoyUnit = roundCOP(hoyBase * f), saldoUnit = roundCOP(saldoBase * f);
    return { modalidad, plan, grupo, personas, hoyUnit, saldoUnit, hoy: hoyUnit * personas, saldo: saldoUnit * personas,
      total: (hoyUnit + saldoUnit) * personas, ahorroGrupo: grupo ? (hoyBase + saldoBase) * personas - (hoyUnit + saldoUnit) * personas : 0 };
  }
  function updateTotal() {
    const c = cotizar();
    $("[data-plan-pick]").hidden = c.modalidad !== "Presencial";
    form.querySelector(".group-fields").hidden = !c.grupo;
    form.querySelector(".group-box").classList.toggle("is-on", c.grupo);
    $("[data-rf-label]").textContent = `Pagas hoy · ${c.modalidad}${c.grupo ? " · grupo" : ""}`;
    const el = $("[data-rf-price]");
    el.textContent = money(c.hoy);
    el.classList.remove("is-pop"); void el.offsetWidth; el.classList.add("is-pop");
    const det = [];
    if (c.grupo) det.push(`${c.personas} × ${money(c.hoyUnit)} · −${descPct}%`);
    if (c.saldo) det.push(`+ ${money(c.saldo)} el día del curso`);
    $("[data-rf-detail]").textContent = det.join(" · ");
    const planTxt = c.modalidad === "Virtual" ? "Pago único" : c.plan === "reserva" ? "Pago en 2 partes" : "Pago completo";
    const filas = [
      [`${c.modalidad} · ${planTxt}${c.grupo ? ` · ${c.personas} personas` : ""}`, ""],
      ["Pagas hoy", money(c.hoy), "hoy"],
      ...(c.saldo ? [["El día del curso", money(c.saldo)]] : []),
      ...(c.grupo ? [[`Descuento grupo (−${descPct}%)`, "−" + money(c.ahorroGrupo), "save"]] : []),
      ...(c.saldo || c.grupo ? [["Total", money(c.total), "total"]] : [])
    ];
    $("[data-rf-summary]").innerHTML = '<span class="rf-summary__t">Resumen de tu inscripción</span>' +
      filas.map(([k, v, cls]) => `<div class="rf-summary__r${cls ? " is-" + cls : ""}"><span>${k}</span><b>${v}</b></div>`).join("");
  }
  $$('input[name="modalidad"], input[name="plan"], [name="grupo"], [name="personas"]', form).forEach((r) => {
    r.addEventListener("change", updateTotal);
    r.addEventListener("input", updateTotal);
  });
  // Textos de ahorro y grupo en toda la página
  $$("[data-save]").forEach((el) => (el.textContent = money((P.presencialReserva || 0) + (P.presencialSaldo || 0) - (P.presencial || 0))));
  $$("[data-grupo-desc]").forEach((el) => (el.textContent = descPct));
  $$("[data-grupo-min]").forEach((el) => (el.textContent = grupoMin));
  form.querySelector('[name="personas"]').min = grupoMin;
  form.querySelector('[name="personas"]').value = grupoMin;
  $$("[data-open-form]").forEach((b) => b.addEventListener("click", () => { openModal(b.dataset.openForm); updateTotal(); }));
  $$("[data-close]", modal).forEach((b) => b.addEventListener("click", closeModal));
  addEventListener("keydown", (e) => e.key === "Escape" && modal.classList.contains("is-open") && closeModal());

  // Paso 1 → registro
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $(".form-error", form);
    err.textContent = "";
    $$(".field", form).forEach((f) => f.classList.remove("is-invalid"));
    let ok = true;
    $$("[required]", form).forEach((inp) => {
      const bad = inp.type === "checkbox" ? !inp.checked : !inp.value.trim() || (inp.type === "email" && !/^\S+@\S+\.\S+$/.test(inp.value));
      if (bad) { ok = false; inp.closest(".field")?.classList.add("is-invalid"); }
    });
    if (!ok) {
      err.textContent = "Completa los campos marcados y acepta el tratamiento de datos.";
      const first = form.querySelector(".is-invalid input, .is-invalid select") || form.querySelector('[name="consentimiento"]:not(:checked)');
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => first?.focus({ preventScroll: true }), 350);
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    data.consentimiento = "Sí";
    const c = cotizar();
    if (c.grupo && !String(data.institucionGrupo || "").trim()) {
      const f = form.querySelector('[name="institucionGrupo"]').closest(".field");
      f.classList.add("is-invalid");
      err.textContent = "Escribe el nombre de la institución del grupo.";
      f.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (c.grupo) data.institucion = data.institucionGrupo;
    delete data.institucionGrupo;
    data.plan = c.modalidad === "Presencial" ? (c.plan === "reserva" ? "Reserva + saldo el día del curso" : "Pago completo") : "Pago completo";
    data.personas = c.personas;
    data.grupo = c.grupo ? `Sí (−${descPct}%)` : "No";
    data.valorNum = c.hoy;
    data.valor = money(c.hoy);
    data.saldoNum = c.saldo;
    data.saldo = c.saldo ? money(c.saldo) : "";
    data.total = money(c.total);
    data.fecha = new Date().toLocaleString("es-CO");
    data.origen = location.href.split("#")[0];

    const btn = form.querySelector('button[type="submit"]');
    btn.classList.add("is-loading");
    $(".btn__label", btn).textContent = "Apartando tu cupo…";
    await post({ action: "registro", ...data });
    btn.classList.remove("is-loading");
    $(".btn__label", btn).textContent = "Confirmar inscripción";

    reg = { id: "r" + Date.now(), data, ts: Date.now(), status: "pendiente" };
    saveReg();
    form.reset();
    updateTotal();
    showStep("pay");
    if (cfg.registro?.abrirWhatsappAlEnviar) window.open(waLink(regMessage()), "_blank", "noopener");
  });

  function regMessage(extra = "") {
    const d = reg.data;
    return (
      `Hola BioMarketing 👋 Me inscribí al curso *IA para el Sector Salud con Claude*.\n\n` +
      `• Nombre: ${d.nombre}\n• Documento: ${d.documento}\n• Modalidad: ${d.modalidad}\n` +
      `• Forma de pago: ${d.plan || "Pago completo"}\n• Pago hoy: ${d.valor}${d.saldo ? `\n• Saldo el día del curso: ${d.saldo}` : ""}\n` +
      (d.grupo && d.grupo !== "No" ? `• Grupo: ${d.personas} personas · ${d.grupo} · Total ${d.total}\n` : "") +
      `• Perfil: ${d.perfil}\n• Correo: ${d.email}\n• WhatsApp: ${d.whatsapp}\n` +
      (d.ciudad ? `• Ciudad: ${d.ciudad}\n` : "") +
      (d.institucion ? `• Institución: ${d.institucion}\n` : "") +
      (d.objetivo ? `• Quiero automatizar: ${d.objetivo}\n` : "") +
      extra
    );
  }

  // Paso 2 → pago
  function fillPay() {
    if (!reg) return;
    const d = reg.data;
    $("[data-p-name]").textContent = d.nombre.split(" ")[0];
    $$("[data-p-llave], [data-p-llave2]").forEach((el) => (el.textContent = pago.llave || "@OTO262"));
    $$("[data-p-titular], [data-p-titular2]").forEach((el) => (el.textContent = pago.titular || ""));
    $("[data-p-amount]").textContent = d.valor;
    $("[data-p-mode]").textContent = d.modalidad + (d.grupo && d.grupo !== "No" ? ` · ${d.personas} pers.` : "");
    const note = $("[data-p-note]");
    const partes = [];
    if (d.saldo) partes.push(`Este pago reserva tu cupo. El saldo de <b>${d.saldo}</b> se paga el día del curso.`);
    if (d.grupo && d.grupo !== "No") partes.push(`Incluye el <b>descuento de grupo</b> para ${d.personas} personas. Total del grupo: <b>${d.total}</b>.`);
    note.innerHTML = partes.join("<br>");
    note.hidden = !partes.length;
    $("[data-p-wa]").href = waLink(regMessage(`\n✅ Ya realicé el pago por llave Bre-B ${pago.llave}. Adjunto el comprobante.`));
    $$("[data-e-amount], [data-e-amount2]").forEach((el) => (el.textContent = d.valor));
    $("[data-e-mode]").textContent = $("[data-p-mode]").textContent;
    $("[data-e-note]").textContent = d.saldo ? `Reserva tu cupo · saldo de ${d.saldo} el día del curso` : d.grupo && d.grupo !== "No" ? `Incluye descuento de grupo · ${d.personas} personas` : "";
    $("[data-e-error]").textContent = reg.payError || "";
    setMethod(reg.payError ? "epayco" : "breb");
    payTimer();
  }
  function payTimer() {
    const el = $("[data-p-timer]");
    if (!el || !reg) return;
    const end = reg.ts + (pago.horasReserva || 24) * 36e5;
    let diff = Math.max(0, end - Date.now());
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    el.innerHTML = `<b>${pad(h)}</b>:<b>${pad(m)}</b>:<b>${pad(s)}</b>`;
  }

  const toastEl = $("[data-copy-toast]");
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (x) {}
      t.remove();
    }
    btn.classList.add("is-ok");
    toastEl.textContent = `Copiado: ${text}`;
    toastEl.classList.add("is-on");
    setTimeout(() => { btn.classList.remove("is-ok"); toastEl.classList.remove("is-on"); }, 1800);
  }
  $$("[data-copy]").forEach((b) =>
    b.addEventListener("click", () => copy(b.dataset.copy === "llave" ? pago.llave : String(reg?.data.valorNum || ""), b))
  );

  const drop = $("[data-drop]"), fileIn = $("[data-p-file]");
  function setFile(f) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { $("[data-p-error]").textContent = "El archivo supera 10 MB. Sube una captura más liviana."; return; }
    payFile = f;
    $("[data-p-error]").textContent = "";
    drop.classList.add("has-file");
    $("[data-p-fname]").textContent = f.name;
    const pv = $("[data-p-preview]");
    if (f.type.startsWith("image/")) pv.src = URL.createObjectURL(f);
    else pv.src = "assets/img/favicon.png";
  }
  fileIn.addEventListener("change", () => setFile(fileIn.files[0]));
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => setFile(e.dataTransfer.files[0]));

  function fileToBase64(f) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = reject;
      r.onload = () => {
        if (!f.type.startsWith("image/")) return resolve({ mime: f.type || "application/pdf", data: String(r.result).split(",")[1] });
        const img = new Image();
        img.onload = () => {
          const sc = Math.min(1, 1600 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve({ mime: "image/jpeg", data: c.toDataURL("image/jpeg", 0.85).split(",")[1] });
        };
        img.onerror = () => resolve({ mime: f.type, data: String(r.result).split(",")[1] });
        img.src = r.result;
      };
      r.readAsDataURL(f);
    });
  }

  $("[data-p-send]").addEventListener("click", async (e) => {
    const err = $("[data-p-error]");
    if (!payFile) { err.textContent = "Sube la foto o PDF de tu comprobante, o usa la opción de WhatsApp."; drop.classList.add("is-over"); setTimeout(() => drop.classList.remove("is-over"), 900); return; }
    const btn = e.currentTarget;
    if (!endpoint) {
      // Sin servidor: el soporte se adjunta en WhatsApp
      window.open(waLink(regMessage(`\n✅ Ya realicé el pago por llave Bre-B ${pago.llave}. Te adjunto el comprobante.`)), "_blank", "noopener");
      reg.status = "soporte"; reg.via = "whatsapp"; saveReg();
      showStep("done");
      return;
    }
    btn.classList.add("is-loading");
    $(".btn__label", btn).textContent = "Enviando soporte…";
    try {
      const f = await fileToBase64(payFile);
      const ext = f.mime.includes("pdf") ? "pdf" : "jpg";
      await post({ action: "soporte", documento: reg.data.documento, nombre: reg.data.nombre, email: reg.data.email, whatsapp: reg.data.whatsapp, modalidad: reg.data.modalidad, valor: reg.data.valor, archivo: { name: `soporte_${reg.data.documento}.${ext}`, mime: f.mime, data: f.data } });
    } catch (x) {}
    btn.classList.remove("is-loading");
    $(".btn__label", btn).textContent = "Enviar soporte y confirmar mi cupo";
    reg.status = "soporte"; reg.via = "web"; saveReg();
    showStep("done");
  });

  $("[data-p-reset]").addEventListener("click", () => nuevaInscripcion());

  /* ---------- Pago con ePayco (tarjeta, PSE, Nequi, Daviplata…) ---------- */
  const methods = $("[data-pmethods]");
  function setMethod(m) {
    if (methods.hidden) m = "breb";
    $$("[data-method]", methods).forEach((b) => { const on = b.dataset.method === m; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on); });
    $$("[data-panel]", modal).forEach((p) => (p.hidden = p.dataset.panel !== m));
  }
  $$("[data-method]", methods).forEach((b) => b.addEventListener("click", () => setMethod(b.dataset.method)));
  let epaycoTest = false;
  fetch("/api/pago/config").then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (d && d.activo) { methods.hidden = false; epaycoTest = d.test; }
  }).catch(() => {});

  const cargados = {};
  const loadScript = (src) => cargados[src] || (cargados[src] = new Promise((res, rej) => {
    const sc = document.createElement("script");
    sc.src = src; sc.async = true;
    sc.onload = () => (window.ePayco && window.ePayco.checkout ? res() : rej(new Error("sin-epayco")));
    sc.onerror = () => { delete cargados[src]; rej(new Error("script")); };
    setTimeout(() => rej(new Error("timeout")), 15000);
    document.head.appendChild(sc);
  }));
  // Abre el Smart Checkout de ePayco. Usa checkout-v2.js (documentación oficial) y,
  // si el navegador no lo carga, la librería clásica checkout.js con la misma sesión.
  async function abrirCheckout(s) {
    const opciones = { sessionId: s.sessionId, type: "onpage", test: !!s.test, external: false };
    let ultimo = "E2";
    for (const src of ["https://checkout.epayco.co/checkout-v2.js", "https://checkout.epayco.co/checkout.js"]) {
      try { await loadScript(src); } catch (e) { ultimo = "E2-" + e.message; console.warn("ePayco", src, e.message); continue; }
      try {
        const h = window.ePayco.checkout.configure(opciones);
        if (h && typeof h.open === "function") { h.open(); return; }
        if (h && typeof h.openNew === "function") { h.openNew(); return; }
        ultimo = "E3-metodo";
      } catch (e) { ultimo = "E3"; console.warn("ePayco configure", e); }
    }
    throw Object.assign(new Error(""), { codigo: ultimo });
  }
  $("[data-e-pay]").addEventListener("click", async (e) => {
    const btn = e.currentTarget, err = $("[data-e-error]"), lbl = $(".btn__label", btn), txt = lbl.innerHTML;
    if (!reg || btn.classList.contains("is-loading")) return;
    err.textContent = "";
    reg.payError = "";
    btn.classList.add("is-loading");
    lbl.textContent = "Preparando pago seguro…";
    let codigo = "E1";
    try {
      const d = reg.data;
      const r = await fetch("/api/pago/sesion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regId: reg.id, nombre: d.nombre, email: d.email, documento: d.documento, whatsapp: d.whatsapp, ciudad: d.ciudad,
          modalidad: d.modalidad, plan: /^reserva/i.test(d.plan || "") ? "reserva" : "completo", grupo: !!d.grupo && d.grupo !== "No", personas: d.personas })
      });
      const s = await r.json().catch(() => ({ codigo: "E1-" + r.status }));
      if (!s.ok || !s.sessionId) { codigo = s.codigo || "E1-" + r.status; throw new Error(s.error || ""); }
      reg.via = "epayco"; saveReg();
      await abrirCheckout(s);
    } catch (x) {
      codigo = x.codigo || codigo;
      err.textContent = (x.message && !/fetch/i.test(x.message) ? x.message : "No pudimos abrir el pago con tarjeta.") +
        ` Puedes pagar con llave Bre-B o escribirnos por WhatsApp. (código ${codigo})`;
      console.warn("Pago ePayco", codigo, x);
    }
    btn.classList.remove("is-loading");
    lbl.innerHTML = txt;
  });

  // Regreso desde ePayco: /?pago=epayco&r=<inscripción>&ref_payco=<referencia>
  (async function retornoEpayco() {
    const q = new URLSearchParams(location.search);
    const ref = q.get("ref_payco") || q.get("x_ref_payco");
    if (!ref && q.get("pago") !== "epayco") return;
    history.replaceState(null, "", location.pathname + "#inicio");
    reg = regs.find((r) => r.id === q.get("r")) || null;
    if (!ref) { if (reg) { openModal(); showStep("pay"); } return; }
    let t = null;
    try { t = await (await fetch("/api/pago/estado?ref=" + encodeURIComponent(ref))).json(); } catch (e) {}
    if (!reg && t?.regId) reg = regs.find((r) => r.id === t.regId) || null;
    if (!reg) {
      if (!t?.ok) return;
      reg = { id: t.regId || "r" + Date.now(), ts: Date.now(), status: "pendiente",
        data: { nombre: t.nombre || "Hola", documento: t.documento, modalidad: /virtual/i.test(t.plan) ? "Virtual" : "Presencial", valor: money(t.valor), valorNum: t.valor, plan: t.plan, email: "", whatsapp: "", perfil: "" } };
    }
    reg.ref = ref; reg.via = "epayco";
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (t?.ok && t.estado === "aprobado") { reg.status = "pagado"; reg.payError = ""; saveReg(); showStep("done"); }
    else if (t?.ok && t.estado === "pendiente") { reg.status = "proceso"; saveReg(); showStep("done"); }
    else {
      reg.payError = t?.ok ? `Tu pago no fue aprobado (${t.respuesta || "rechazado"}). Intenta con otro medio o usa la llave Bre-B.` : "No pudimos confirmar el pago. Si se descontó el dinero, escríbenos por WhatsApp con tu referencia " + ref + ".";
      saveReg(); showStep("pay");
    }
  })();

  // Paso 3 → confirmación
  function gcalDate(iso) { return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  function fillDone() {
    if (!reg) return;
    $("[data-d-name]").textContent = reg.data.nombre.split(" ")[0];
    $("[data-d-mode]").textContent = `${reg.data.modalidad} · ${reg.data.valor}`;
    const ev = cfg.evento || {};
    const loc = reg.data.modalidad === "Virtual" ? ev.plataformaVirtual : `${ev.lugar || ""} ${ev.ciudad || ""}`.trim();
    $("[data-d-cal]").href =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent("Taller IA para el Sector Salud con Claude · BioMarketing")}` +
      `&dates=${gcalDate(ev.fechaISO)}/${gcalDate(ev.fechaFinISO || ev.fechaISO)}` +
      `&details=${encodeURIComponent(`Modalidad: ${reg.data.modalidad}. Lleva tu portátil y tu cuenta de Claude creada. Dudas: wa.me/${waNumber}`)}` +
      `&location=${encodeURIComponent(loc || "")}`;
    const viaWa = reg.via === "whatsapp";
    const first = reg.data.nombre.split(" ")[0];
    if (reg.via === "epayco") {
      const ok = reg.status === "pagado";
      $("[data-d-title]").innerHTML = ok ? `¡Pago aprobado, ${esc(first)}! 🎉` : `Tu pago está en proceso, ${esc(first)}`;
      $("[data-d-sub]").textContent = ok
        ? "Tu cupo quedó confirmado. Te enviamos por WhatsApp y correo todos los detalles del taller."
        : "El banco está confirmando tu pago (PSE o efectivo puede tardar unos minutos). Te avisamos apenas se apruebe.";
      $("[data-d-proof]").textContent = `${ok ? "Pago confirmado" : "Pago en verificación"} por ePayco · Ref. ${reg.ref || ""}`;
      $("[data-d-wa-label]").textContent = "Escribir a BioMarketing";
      $("[data-d-wa]").href = waLink(regMessage(`\n✅ ${ok ? "Pagué" : "Hice el pago"} con ePayco. Referencia: ${reg.ref || ""}`));
      modal.querySelector(".done__list .is-pending").style.display = ok ? "none" : "";
      if (ok) confetti();
      return;
    }
    modal.querySelector(".done__list .is-pending").style.display = "";
    $("[data-d-title]").innerHTML = viaWa ? `¡Último paso, ${esc(first)}!` : `¡Soporte recibido, ${esc(first)}!`;
    $("[data-d-sub]").textContent = viaWa
      ? "Adjunta la foto del comprobante en el chat de WhatsApp que se abrió. Validamos tu pago y te confirmamos con todos los detalles."
      : "Estamos validando tu pago. Te confirmamos por WhatsApp y correo con todos los detalles del taller.";
    $("[data-d-proof]").textContent = viaWa ? "Comprobante listo para enviar por WhatsApp" : "Comprobante enviado";
    $("[data-d-wa-label]").textContent = viaWa ? "Adjuntar comprobante en WhatsApp" : "Escribir a BioMarketing";
    $("[data-d-wa]").href = waLink(regMessage(viaWa ? `\n✅ Ya realicé el pago por llave Bre-B ${pago.llave}. Te adjunto el comprobante.` : `\n✅ Ya envié mi comprobante desde la página.`));
    confetti();
  }

  function confetti() {
    const cv = $("[data-confetti]");
    if (!cv || reduced) return;
    const ctx = cv.getContext("2d");
    const w = (cv.width = cv.offsetWidth), h = (cv.height = cv.offsetHeight);
    const colors = ["#ff6b1a", "#ffb020", "#7c3aed", "#a78bfa", "#10b981", "#ffffff"];
    const ps = Array.from({ length: 140 }, () => ({ x: w / 2, y: h * 0.3, vx: (Math.random() - 0.5) * 12, vy: Math.random() * -12 - 3, r: Math.random() * 6 + 3, c: colors[(Math.random() * colors.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3 }));
    const t0 = performance.now();
    (function f(t) {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      }
      if (t - t0 < 3200) requestAnimationFrame(f);
      else ctx.clearRect(0, 0, w, h);
    })(t0);
  }

  tick();
  setInterval(tick, 1000);
})();
