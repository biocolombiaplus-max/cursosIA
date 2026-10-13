(async function () {
  const cfg = await window.BMStore.load();
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const get = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), cfg);
  const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lines = (s) => String(s || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const waLink = (msg) => `https://wa.me/${String(cfg.contacto?.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

  /* ---------- Textos y precios ---------- */
  $$("[data-bind]").forEach((el) => {
    const v = get(el.dataset.bind);
    if (v !== undefined && v !== null && v !== "") el.textContent = v;
    else if (el.dataset.bind === "evento.lugar") el.textContent = "Sede por confirmar";
  });
  $$("[data-price]").forEach((el) => (el.textContent = money(get("precios." + el.dataset.price))));
  $$("[data-price-num]").forEach((el) => (el.textContent = Number(get("precios." + el.dataset.priceNum) || 0).toLocaleString("es-CO")));
  $$("[data-list]").forEach((el) => {
    el.innerHTML = lines(get(el.dataset.list))
      .map((l) => `<li><svg><use href="#i-check"/></svg><span>${esc(l)}</span></li>`)
      .join("");
  });

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

  /* ---------- Navegación ---------- */
  const nav = $("#nav");
  const burger = $(".nav__burger");
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  $$(".nav__links a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));
  const sticky = $(".sticky-cta");
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", scrollY > 40);
    sticky.classList.toggle("is-visible", scrollY > innerHeight * 0.8);
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
  const target = new Date(cfg.evento?.fechaISO || "2026-11-07T08:00:00-05:00").getTime();
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
  }
  tick();
  setInterval(tick, 1000);

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
      requestAnimationFrame(step);
      cio.unobserve(el);
    })
  );
  $$("[data-count]").forEach((el) => cio.observe(el));

  /* ---------- Modal de inscripción ---------- */
  const modal = $("#modal");
  const form = $("#regForm");
  let lastFocus = null;
  function openModal(mode) {
    lastFocus = document.activeElement;
    $('[data-step="form"]').hidden = false;
    $('[data-step="done"]').hidden = true;
    if (mode) {
      const r = form.querySelector(`input[name="modalidad"][value="${mode === "virtual" ? "Virtual" : "Presencial"}"]`);
      if (r) r.checked = true;
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => form.querySelector('[name="nombre"]').focus(), 350);
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  $$("[data-open-form]").forEach((b) => b.addEventListener("click", () => openModal(b.dataset.openForm)));
  $$("[data-close]", modal).forEach((b) => b.addEventListener("click", closeModal));
  addEventListener("keydown", (e) => e.key === "Escape" && modal.classList.contains("is-open") && closeModal());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $(".form-error", form);
    err.textContent = "";
    $$(".field", form).forEach((f) => f.classList.remove("is-invalid"));
    let ok = true;
    $$("[required]", form).forEach((inp) => {
      const bad = inp.type === "checkbox" ? !inp.checked : !inp.value.trim() || (inp.type === "email" && !/^\S+@\S+\.\S+$/.test(inp.value));
      if (bad) {
        ok = false;
        inp.closest(".field")?.classList.add("is-invalid");
      }
    });
    if (!ok) {
      err.textContent = "Revisa los campos obligatorios y acepta el tratamiento de datos.";
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    data.consentimiento = "Sí";
    data.valor = money(data.modalidad === "Virtual" ? cfg.precios.virtual : cfg.precios.presencial);
    data.fecha = new Date().toLocaleString("es-CO");
    data.origen = location.href;

    const btn = form.querySelector('button[type="submit"]');
    btn.classList.add("is-loading");
    $(".btn__label", btn).textContent = "Enviando…";

    const endpoint = cfg.registro?.endpoint;
    if (endpoint) {
      try {
        await fetch(endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
      } catch (x) {
        /* Si falla la red, igual se confirma por WhatsApp */
      }
    }
    btn.classList.remove("is-loading");
    $(".btn__label", btn).textContent = "Confirmar inscripción";

    const msg =
      `Hola BioMarketing 👋 Quiero confirmar mi inscripción al curso *IA para el Sector Salud con Claude*.\n\n` +
      `• Nombre: ${data.nombre}\n• Documento: ${data.documento}\n• Modalidad: ${data.modalidad} (${data.valor})\n` +
      `• Perfil: ${data.perfil}\n• Correo: ${data.email}\n• Ciudad: ${data.ciudad || "-"}\n` +
      (data.institucion ? `• Institución: ${data.institucion}\n` : "") +
      (data.objetivo ? `• Quiero automatizar: ${data.objetivo}\n` : "") +
      `\nQuedo atento(a) a los datos de pago.`;
    const link = waLink(msg);

    $("[data-done-name]").textContent = data.nombre.split(" ")[0];
    $("[data-done-mode]").textContent = data.modalidad;
    $("[data-done-price]").textContent = data.valor;
    $("[data-done-wa]").href = link;
    const pay = $("[data-done-pay]");
    if (cfg.pago?.linkPago) {
      pay.href = cfg.pago.linkPago;
      pay.classList.remove("is-hidden");
    }
    $('[data-step="form"]').hidden = true;
    $('[data-step="done"]').hidden = false;
    form.reset();
    if (cfg.registro?.abrirWhatsappAlEnviar !== false) window.open(link, "_blank", "noopener");
  });
})();
