(async function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let cfg = await window.BMStore.load();
  let dirty = false;

  const SECTIONS = [
    { key: "hero", name: "Portada (hero)", bg: true, media: true, mediaHelp: "Foto detrás de la tarjeta de automatización (ej. profesional de salud con portátil)." },
    { key: "problema", name: "El problema", bg: true, media: true, mediaHelp: "Imagen sobre la tabla comparativa." },
    { key: "perfiles", name: "Automatizaciones por perfil", bg: true, media: false },
    { key: "temario", name: "Temario / agenda", bg: true, media: true, mediaHelp: "Imagen vertical junto al temario." },
    { key: "certificado", name: "Certificado", bg: true, media: true, mediaHelp: "Sube el diseño real del certificado para reemplazar la maqueta." },
    { key: "modalidades", name: "Inversión / precios", bg: true, media: false },
    { key: "presencial", name: "Tarjeta presencial", bg: false, media: true, mediaHelp: "Foto del lugar o del salón en Cúcuta." },
    { key: "virtual", name: "Tarjeta virtual", bg: false, media: true, mediaHelp: "Foto de clase en línea / transmisión." },
    { key: "instructor", name: "Instructor", bg: true, media: true, mediaHelp: "Foto vertical del instructor (4:5)." },
    { key: "faq", name: "Preguntas frecuentes", bg: true, media: true, mediaHelp: "Imagen debajo del botón de WhatsApp." },
    { key: "cta", name: "Llamado final", bg: true, media: false }
  ];

  /* ---------- Utilidades ---------- */
  function toast(msg, type = "") {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast is-on " + type;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.className = "toast"), 2800);
  }
  const getPath = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), cfg);
  function setPath(path, val) {
    const ks = path.split(".");
    let o = cfg;
    ks.slice(0, -1).forEach((k) => (o = o[k] = o[k] || {}));
    o[ks.at(-1)] = val;
  }
  function markDirty() {
    dirty = true;
    $("#draftState").textContent = "Tienes cambios sin guardar.";
    $("#draftState").classList.add("warn");
  }

  async function sha256(text) {
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256Fallback(text);
  }
  // SHA-256 en JS puro para navegadores sin crypto.subtle (p. ej. http sin SSL).
  function sha256Fallback(ascii) {
    const rr = (v, n) => (v >>> n) | (v << (32 - n));
    const K = [], H = [];
    let p = 0;
    for (let c = 2; p < 64; c++) {
      let prime = true;
      for (let d = 2; d * d <= c; d++) if (c % d === 0) { prime = false; break; }
      if (!prime) continue;
      if (p < 8) H[p] = (Math.pow(c, 1 / 2) * 4294967296) | 0;
      K[p++] = (Math.pow(c, 1 / 3) * 4294967296) | 0;
    }
    const bytes = Array.from(new TextEncoder().encode(ascii));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
    for (let j = 0; j < bytes.length; j += 64) {
      const w = [];
      for (let i = 0; i < 16; i++) w[i] = (bytes[j + i * 4] << 24) | (bytes[j + i * 4 + 1] << 16) | (bytes[j + i * 4 + 2] << 8) | bytes[j + i * 4 + 3];
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        if (i >= 16) {
          const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
          const s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
  }

  // Redimensiona y comprime la imagen en el navegador.
  function compressImage(file, maxSide = 1920, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          let url = c.toDataURL("image/webp", quality);
          if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/jpeg", quality);
          resolve(url);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  const kb = (s) => Math.round((s || "").length * 0.75 / 1024);

  /* ---------- Login ---------- */
  const SESSION = "bm-admin-ok";
  async function tryLogin(pwd) {
    const h = await sha256(pwd);
    return h === (cfg.admin?.passwordHash || "");
  }
  if (sessionStorage.getItem(SESSION) === cfg.admin?.passwordHash) start();
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await tryLogin($("#pwd").value)) {
      sessionStorage.setItem(SESSION, cfg.admin.passwordHash);
      start();
    } else {
      $("#loginErr").textContent = "Contraseña incorrecta.";
    }
  });
  $("#logout").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION);
    location.reload();
  });

  async function start() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    if (await window.BMStore.hasDraft()) $("#draftState").textContent = "Viendo tu borrador guardado (aún no publicado para todos).";
    renderSections();
    renderGallery();
    renderTestis();
    bindFields();
    updateSize();
  }

  /* ---------- Navegación ---------- */
  $$(".side__nav button").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".side__nav button").forEach((x) => x.classList.toggle("is-active", x === b));
      $$(".view").forEach((v) => v.classList.toggle("is-active", v.dataset.view === b.dataset.view));
      $("#viewTitle").textContent = b.textContent.trim();
      if (b.dataset.view === "publicar") updateSize();
    })
  );

  /* ---------- Imágenes por sección ---------- */
  function slot(sec, field, label, help) {
    const s = cfg.secciones[sec.key] || {};
    const val = s[field] || "";
    return `
      <div class="slot" data-sec="${sec.key}" data-field="${field}">
        <div class="slot__label">${label}${help ? `<small>${esc(help)}</small>` : ""}</div>
        <div class="slot__preview ${val ? "has" : ""}" style="${val ? `background-image:url('${esc(val)}')` : ""}">
          ${val ? "" : "<span>Sin imagen</span>"}
          ${val ? `<em>${val.startsWith("data:") ? kb(val) + " KB" : "URL"}</em>` : ""}
        </div>
        <div class="slot__actions">
          <label class="a-btn a-btn--sm a-btn--primary file-btn">Subir<input type="file" accept="image/*" data-upload /></label>
          <button class="a-btn a-btn--sm a-btn--ghost" data-url>Usar URL</button>
          ${val ? `<button class="a-btn a-btn--sm a-btn--danger" data-remove>Quitar</button>` : ""}
        </div>
      </div>`;
  }
  function renderSections() {
    cfg.secciones = cfg.secciones || {};
    $("#sectionCards").innerHTML = SECTIONS.map((sec) => {
      const s = (cfg.secciones[sec.key] = cfg.secciones[sec.key] || {});
      const ov = s.overlay ?? 0.75;
      return `
        <article class="card">
          <header><h3>${sec.name}</h3><a href="index.html#${sec.key === "cta" ? "faq" : sec.key === "hero" ? "inicio" : sec.key === "presencial" || sec.key === "virtual" ? "modalidades" : sec.key}" target="_blank">ver ↗</a></header>
          <div class="slots">
            ${sec.bg ? slot(sec, "bg", "Imagen de fondo") : ""}
            ${sec.media ? slot(sec, "media", "Imagen principal", sec.mediaHelp) : ""}
          </div>
          ${sec.bg ? `<label class="range">Intensidad del velo sobre el fondo <b>${Math.round(ov * 100)}%</b>
            <input type="range" min="0" max="0.95" step="0.05" value="${ov}" data-overlay="${sec.key}" /></label>` : ""}
        </article>`;
    }).join("");

    $$("#sectionCards .slot").forEach((el) => {
      const { sec, field } = el.dataset;
      $("[data-upload]", el).addEventListener("change", async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        toast("Optimizando imagen…");
        const url = await compressImage(f, field === "bg" ? 1920 : 1400);
        cfg.secciones[sec][field] = url;
        markDirty();
        renderSections();
        toast("Imagen lista. Recuerda guardar.", "ok");
      });
      $("[data-url]", el).addEventListener("click", () => {
        const url = prompt("Pega la URL pública de la imagen (https://…)", cfg.secciones[sec][field] || "");
        if (url === null) return;
        cfg.secciones[sec][field] = url.trim();
        markDirty();
        renderSections();
      });
      $("[data-remove]", el)?.addEventListener("click", () => {
        cfg.secciones[sec][field] = "";
        markDirty();
        renderSections();
      });
    });
    $$("[data-overlay]").forEach((r) =>
      r.addEventListener("input", () => {
        cfg.secciones[r.dataset.overlay].overlay = +r.value;
        r.previousElementSibling.textContent = Math.round(r.value * 100) + "%";
        markDirty();
      })
    );
  }

  /* ---------- Galería ---------- */
  function renderGallery() {
    cfg.galeria = cfg.galeria || [];
    $("#galList").innerHTML = cfg.galeria.length
      ? cfg.galeria.map((g, i) => `
        <figure class="gitem">
          <div class="gitem__img" style="background-image:url('${esc(g.src)}')"></div>
          <input placeholder="Pie de foto (opcional)" value="${esc(g.caption || "")}" data-cap="${i}" />
          <div class="row">
            <button class="a-btn a-btn--sm a-btn--ghost" data-up="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
            <button class="a-btn a-btn--sm a-btn--ghost" data-down="${i}" ${i === cfg.galeria.length - 1 ? "disabled" : ""}>↓</button>
            <button class="a-btn a-btn--sm a-btn--danger" data-del="${i}">Quitar</button>
          </div>
        </figure>`).join("")
      : `<p class="empty">Aún no hay fotos en la galería.</p>`;
    $$("[data-cap]").forEach((inp) => inp.addEventListener("input", () => { cfg.galeria[inp.dataset.cap].caption = inp.value; markDirty(); }));
    $$("[data-del]").forEach((b) => b.addEventListener("click", () => { cfg.galeria.splice(+b.dataset.del, 1); markDirty(); renderGallery(); }));
    const move = (i, d) => { const g = cfg.galeria; [g[i], g[i + d]] = [g[i + d], g[i]]; markDirty(); renderGallery(); };
    $$("[data-up]").forEach((b) => b.addEventListener("click", () => move(+b.dataset.up, -1)));
    $$("[data-down]").forEach((b) => b.addEventListener("click", () => move(+b.dataset.down, 1)));
  }
  $("#galUpload").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    toast(`Optimizando ${files.length} foto(s)…`);
    for (const f of files) cfg.galeria.push({ src: await compressImage(f, 1400), caption: "" });
    e.target.value = "";
    markDirty();
    renderGallery();
    toast("Fotos agregadas. Recuerda guardar.", "ok");
  });

  /* ---------- Testimonios ---------- */
  function renderTestis() {
    cfg.testimonios = cfg.testimonios || [];
    $("#testiList").innerHTML = cfg.testimonios.length
      ? cfg.testimonios.map((t, i) => `
        <article class="card testi-item" data-i="${i}">
          <div class="testi-item__pic" style="${t.foto ? `background-image:url('${esc(t.foto)}')` : ""}">
            <label class="file-btn">${t.foto ? "" : "Foto"}<input type="file" accept="image/*" data-tfoto /></label>
          </div>
          <div class="form-grid">
            <label>Nombre<input data-tk="nombre" value="${esc(t.nombre || "")}" /></label>
            <label>Cargo / especialidad<input data-tk="cargo" value="${esc(t.cargo || "")}" /></label>
            <label class="full">Testimonio<textarea rows="3" data-tk="texto">${esc(t.texto || "")}</textarea></label>
          </div>
          <button class="a-btn a-btn--sm a-btn--danger" data-tdel>Eliminar</button>
        </article>`).join("")
      : `<p class="empty">Aún no hay testimonios.</p>`;
    $$(".testi-item").forEach((card) => {
      const i = +card.dataset.i;
      $$("[data-tk]", card).forEach((inp) => inp.addEventListener("input", () => { cfg.testimonios[i][inp.dataset.tk] = inp.value; markDirty(); }));
      $("[data-tdel]", card).addEventListener("click", () => { cfg.testimonios.splice(i, 1); markDirty(); renderTestis(); });
      $("[data-tfoto]", card).addEventListener("change", async (e) => {
        if (!e.target.files[0]) return;
        cfg.testimonios[i].foto = await compressImage(e.target.files[0], 300);
        markDirty();
        renderTestis();
      });
    });
  }
  $("#addTesti").addEventListener("click", () => { cfg.testimonios.push({ nombre: "", cargo: "", texto: "", foto: "" }); renderTestis(); });

  /* ---------- Campos de texto ---------- */
  function isoToLocal(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    // Hora de Colombia (UTC-5) para la edición
    const co = new Date(d.getTime() - 5 * 3600e3);
    return co.toISOString().slice(0, 16);
  }
  function bindFields() {
    $$("[data-k]").forEach((inp) => {
      const k = inp.dataset.k, type = inp.dataset.type;
      const v = getPath(k);
      if (type === "bool") inp.checked = v !== false;
      else if (type === "datetime") inp.value = isoToLocal(v);
      else inp.value = v ?? "";
      inp.addEventListener(type === "bool" ? "change" : "input", () => {
        let val = inp.value;
        if (type === "number") val = Number(val || 0);
        if (type === "bool") val = inp.checked;
        if (type === "datetime") val = val ? val + ":00-05:00" : "";
        setPath(k, val);
        markDirty();
      });
    });
  }

  /* ---------- Guardar / descartar ---------- */
  $("#save").addEventListener("click", async () => {
    try {
      await window.BMStore.saveDraft(cfg);
      dirty = false;
      $("#draftState").textContent = "Guardado. Abre la landing en este navegador para ver los cambios. Para publicarlos para todos ve a “Publicar”.";
      $("#draftState").classList.remove("warn");
      toast("Cambios guardados ✓", "ok");
      updateSize();
    } catch (e) {
      toast("No se pudo guardar: " + e.message, "err");
    }
  });
  $("#discard").addEventListener("click", async () => {
    if (!confirm("¿Descartar el borrador y volver a la versión publicada?")) return;
    await window.BMStore.clearDraft();
    location.reload();
  });
  addEventListener("beforeunload", (e) => {
    if (dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ---------- Publicar ---------- */
  function download(name, content, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function buildJs() {
    return `/*\n * Configuración publicada de la landing (generada por el panel administrativo).\n * ${new Date().toLocaleString("es-CO")}\n */\nwindow.SITE_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`;
  }
  function updateSize() {
    const size = new Blob([buildJs()]).size / 1024 / 1024;
    $("#sizeInfo").textContent = `Tamaño actual: ${size.toFixed(2)} MB${size > 4 ? " · Es pesado: considera usar URLs para algunas imágenes o fotos más livianas." : ""}`;
  }
  $("#exportJs").addEventListener("click", () => { download("site-config.js", buildJs(), "text/javascript"); toast("Archivo descargado ✓", "ok"); });
  $("#exportJson").addEventListener("click", () => download("biomarketing-config.json", JSON.stringify(cfg, null, 2), "application/json"));
  $("#importJson").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      cfg = window.BMStore.deepMerge(window.BMStore.published(), JSON.parse(await f.text()));
      await window.BMStore.saveDraft(cfg);
      toast("Configuración importada ✓", "ok");
      setTimeout(() => location.reload(), 700);
    } catch (x) {
      toast("Archivo no válido", "err");
    }
  });

  /* ---------- Contraseña ---------- */
  $("#changePwd").addEventListener("click", async () => {
    const a = $("#newPwd").value, b = $("#newPwd2").value;
    if (a.length < 8) return toast("Usa al menos 8 caracteres", "err");
    if (a !== b) return toast("Las contraseñas no coinciden", "err");
    cfg.admin = { ...(cfg.admin || {}), passwordHash: await sha256(a) };
    await window.BMStore.saveDraft(cfg);
    sessionStorage.setItem(SESSION, cfg.admin.passwordHash);
    $("#newPwd").value = $("#newPwd2").value = "";
    toast("Contraseña actualizada. Publica el site-config.js para aplicarla en línea.", "ok");
  });
})();
