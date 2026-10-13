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
    initAsistencia();
    renderYt();
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
          <header><h3>${sec.name}</h3><a href="./#${sec.key === "cta" ? "faq" : sec.key === "hero" ? "inicio" : sec.key === "presencial" || sec.key === "virtual" ? "modalidades" : sec.key}" target="_blank">ver ↗</a></header>
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
    a.href = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
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

  /* =========================================================
     Asistencia y certificados
     ========================================================= */
  let people = [];
  let adminKey = "";
  const endpoint = () => cfg.registro?.endpoint || "";
  const norm = (d) => String(d || "").replace(/[^\dA-Za-z]/g, "");
  const waNum = (n) => { let d = String(n || "").replace(/\D/g, ""); if (d.length === 10 && d.startsWith("3")) d = "57" + d; return d; };
  const savePeople = () => window.BMStore.kvSet("asistentes", people).catch(() => {});
  const blobToB64 = (b) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(",")[1]); fr.readAsDataURL(b); });
  const fmtDate = () => new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

  async function api(action, payload = {}) {
    const url = endpoint();
    if (!url) throw new Error("Falta la URL de Google Apps Script (Contacto y pagos).");
    if (!adminKey) throw new Error("Falta la clave de administración (Configuración del certificado y conexión).");
    const body = JSON.stringify({ action, clave: adminKey, ...payload });
    try {
      const r = await fetch(url, { method: "POST", body });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Error del servidor");
      return j;
    } catch (e) {
      if (/Clave|servidor|Error/.test(e.message)) throw e;
      await fetch(url, { method: "POST", mode: "no-cors", body });
      return { ok: true, opaque: true };
    }
  }

  async function initAsistencia() {
    people = (await window.BMStore.kvGet("asistentes")) || [];
    adminKey = (await window.BMStore.kvGet("adminKey")) || "";
    $("#adminKey").value = adminKey;
    $("#adminKey").addEventListener("change", (e) => { adminKey = e.target.value.trim(); window.BMStore.kvSet("adminKey", adminKey); toast("Clave guardada en este navegador", "ok"); });
    $("#search").addEventListener("input", renderPeople);
    $("#filter").addEventListener("change", renderPeople);
    $("#syncSheets").addEventListener("click", syncSheets);
    $("#importCsv").addEventListener("change", importCsv);
    $("#addPerson").addEventListener("click", addPerson);
    $("#exportCsv").addEventListener("click", exportCsv);
    $("#sendAll").addEventListener("click", sendAll);
    $("#zipAll").addEventListener("click", downloadAll);
    $("#previewCert").addEventListener("click", () => preview({ nombre: "Nombre Apellido Ejemplo", documento: "1090000000", modalidad: "Presencial" }));
    $("#pvClose").addEventListener("click", () => ($("#pv").hidden = true));
    $("#pv").addEventListener("click", (e) => e.target.id === "pv" && ($("#pv").hidden = true));
    $("#sigUpload").addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      cfg.certificado.firmaImg = await toPng(f, 900);
      markDirty(); renderSig(); toast("Firma cargada. Recuerda guardar.", "ok");
    });
    $("#sigRemove").addEventListener("click", () => { cfg.certificado.firmaImg = ""; markDirty(); renderSig(); });
    renderSig();
    renderPeople();
  }

  function toPng(file, max) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const sc = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          const x = c.getContext("2d");
          x.drawImage(img, 0, 0, c.width, c.height);
          // Vuelve transparente el fondo blanco de una firma escaneada
          const d = x.getImageData(0, 0, c.width, c.height);
          for (let i = 0; i < d.data.length; i += 4) {
            const v = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3;
            if (v > 215) d.data[i + 3] = 0;
            else if (v > 170) d.data[i + 3] = Math.round(((215 - v) / 45) * d.data[i + 3]);
          }
          x.putImageData(d, 0, 0);
          resolve(c.toDataURL("image/png"));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  function renderSig() {
    const s = cfg.certificado?.firmaImg;
    $("#sigPrev").style.backgroundImage = s ? `url('${s}')` : "";
    $("#sigPrev").textContent = s ? "" : "Sin firma";
  }

  function upsert(p) {
    const k = norm(p.documento) || p.email;
    if (!k) return;
    const cur = people.find((x) => (norm(x.documento) || x.email) === k);
    if (cur) {
      for (const f of ["nombre", "email", "whatsapp", "modalidad", "perfil", "ciudad", "institucion", "soporte"]) if (p[f]) cur[f] = p[f];
      if (p.pago && (!cur.pago || cur.pago === "Pendiente")) cur.pago = p.pago;
      if (p.asistio) cur.asistio = true;
      if (p.certificado && !cur.certificado) cur.certificado = p.certificado;
    } else {
      people.push({ nombre: "", documento: "", email: "", whatsapp: "", modalidad: "Presencial", perfil: "", pago: "Pendiente", asistio: false, certificado: "", ...p });
    }
  }

  async function syncSheets() {
    if (!endpoint() || !adminKey) return toast("Configura la URL de Apps Script y la clave de administración primero.", "err");
    toast("Cargando inscritos…");
    try {
      const r = await fetch(`${endpoint()}?action=list&clave=${encodeURIComponent(adminKey)}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Clave incorrecta");
      j.rows.forEach((row) =>
        upsert({
          nombre: row.nombre, documento: String(row.documento || ""), email: row.email, whatsapp: String(row.whatsapp || ""), modalidad: row.modalidad,
          perfil: row.perfil, ciudad: row.ciudad, institucion: row.institucion, pago: row.estado_pago || "", soporte: row.soporte || "",
          asistio: String(row.asistio || "").toLowerCase().startsWith("s"), certificado: row.certificado || ""
        })
      );
      await savePeople();
      renderPeople();
      toast(`${j.rows.length} inscritos sincronizados ✓`, "ok");
    } catch (e) {
      toast("No se pudo cargar: " + e.message, "err");
    }
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", q = false;
    const sep = (text.split("\n")[0].match(/;/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch !== "\r") cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }
  async function importCsv(e) {
    const f = e.target.files[0];
    if (!f) return;
    const rows = parseCsv(await f.text());
    const head = rows.shift().map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim());
    const col = (...names) => head.findIndex((h) => names.some((n) => h.includes(n)));
    const m = { nombre: col("nombre"), documento: col("documento", "cedula", "c.c", "identificacion"), email: col("email", "correo"), whatsapp: col("whatsapp", "celular", "telefono"), modalidad: col("modalidad"), perfil: col("perfil", "profesion"), pago: col("estado pago", "pago") };
    rows.forEach((r) => upsert(Object.fromEntries(Object.entries(m).filter(([, i]) => i >= 0).map(([k, i]) => [k, (r[i] || "").trim()]))));
    e.target.value = "";
    await savePeople();
    renderPeople();
    toast(`${rows.length} registros importados ✓`, "ok");
  }
  async function addPerson() {
    const nombre = prompt("Nombre completo del asistente");
    if (!nombre) return;
    const documento = prompt("Documento de identidad") || "";
    const email = prompt("Correo electrónico") || "";
    const whatsapp = prompt("WhatsApp") || "";
    const modalidad = confirm("¿Asistió de forma PRESENCIAL? (Cancelar = Virtual)") ? "Presencial" : "Virtual";
    upsert({ nombre, documento: documento || "M" + Date.now(), email, whatsapp, modalidad, asistio: true });
    await savePeople();
    renderPeople();
  }
  function exportCsv() {
    const cols = ["nombre", "documento", "email", "whatsapp", "modalidad", "perfil", "pago", "asistio", "certificado"];
    const csv = [cols.join(",")].concat(people.map((p) => cols.map((c) => `"${String(c === "asistio" ? (p.asistio ? "Sí" : "No") : p[c] || "").replace(/"/g, '""')}"`).join(","))).join("\n");
    download("asistentes_curso_ia.csv", "﻿" + csv, "text/csv");
  }

  function filtered() {
    const q = $("#search").value.trim().toLowerCase();
    const f = $("#filter").value;
    return people.filter((p) => {
      if (q && !`${p.nombre} ${p.documento} ${p.email}`.toLowerCase().includes(q)) return false;
      if (f === "asistio") return p.asistio;
      if (f === "noasistio") return !p.asistio;
      if (f === "sincert") return p.asistio && !p.certificado;
      if (f === "Presencial" || f === "Virtual") return p.modalidad === f;
      return true;
    });
  }

  const PAGOS = ["Pendiente", "Soporte recibido", "Confirmado"];
  function renderPeople() {
    $('[data-kpi="total"]').textContent = people.length;
    $('[data-kpi="pago"]').textContent = people.filter((p) => p.pago === "Confirmado").length;
    $('[data-kpi="asistio"]').textContent = people.filter((p) => p.asistio).length;
    $('[data-kpi="cert"]').textContent = people.filter((p) => p.certificado).length;
    const list = filtered();
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([""], "a.pdf", { type: "application/pdf" })] }));
    $("#people").innerHTML = list.length
      ? list.map((p) => {
          const i = people.indexOf(p);
          const pagoCls = p.pago === "Confirmado" ? "ok" : p.pago === "Soporte recibido" ? "mid" : "";
          return `
        <article class="person ${p.asistio ? "is-in" : ""}" data-i="${i}">
          <label class="att" title="Marcar asistencia"><input type="checkbox" data-att ${p.asistio ? "checked" : ""} /><span></span></label>
          <div class="person__who">
            <b>${esc(p.nombre)}</b>
            <small>C.C. ${esc(p.documento)} · ${esc(p.email || "sin correo")} · ${esc(p.whatsapp || "sin WhatsApp")}</small>
            <div class="chips">
              <span class="chip chip--${p.modalidad === "Virtual" ? "v" : "p"}">${esc(p.modalidad || "")}</span>
              ${p.perfil ? `<span class="chip">${esc(p.perfil)}</span>` : ""}
              <button class="chip chip--pay ${pagoCls}" data-pay title="Cambiar estado de pago">Pago: ${esc(p.pago || "Pendiente")}</button>
              ${p.soporte ? `<a class="chip" href="${esc(p.soporte)}" target="_blank" rel="noopener">Ver soporte ↗</a>` : ""}
              ${p.certificado ? `<span class="chip chip--ok">Certificado enviado ${esc(p.certificado)}</span>` : ""}
            </div>
          </div>
          <div class="person__actions">
            <button class="a-btn a-btn--sm a-btn--ghost" data-act="ver">Ver</button>
            <button class="a-btn a-btn--sm a-btn--ghost" data-act="pdf">PDF</button>
            <button class="a-btn a-btn--sm a-btn--primary" data-act="mail" ${p.asistio ? "" : "disabled title='Marca la asistencia primero'"}>Enviar por correo</button>
            <button class="a-btn a-btn--sm a-btn--wa" data-act="wa" ${p.asistio ? "" : "disabled"}>${canShare ? "Compartir" : "WhatsApp"}</button>
            <button class="a-btn a-btn--sm a-btn--danger" data-act="del" title="Eliminar">✕</button>
          </div>
        </article>`;
        }).join("")
      : `<p class="empty">${people.length ? "No hay coincidencias con el filtro." : "Aún no hay inscritos. Cárgalos desde Google Sheets, importa un CSV o agrégalos manualmente."}</p>`;

    $$("#people .person").forEach((el) => {
      const p = people[+el.dataset.i];
      $("[data-att]", el).addEventListener("change", async (e) => {
        p.asistio = e.target.checked;
        p.horaAsistencia = p.asistio ? fmtDate() : "";
        await savePeople();
        renderPeople();
        if (endpoint() && adminKey) api("actualizar", { documento: p.documento, campo: "asistio", valor: p.asistio ? "Sí" : "No" }).catch(() => {});
      });
      $("[data-pay]", el).addEventListener("click", async () => {
        p.pago = PAGOS[(PAGOS.indexOf(p.pago) + 1) % PAGOS.length];
        await savePeople();
        renderPeople();
        if (endpoint() && adminKey) api("actualizar", { documento: p.documento, campo: "estado_pago", valor: p.pago }).catch(() => {});
      });
      $$("[data-act]", el).forEach((b) => b.addEventListener("click", () => action(b.dataset.act, p, b)));
    });
  }

  async function action(act, p, btn) {
    if (act === "del") {
      if (!confirm(`¿Eliminar a ${p.nombre} de la lista?`)) return;
      people.splice(people.indexOf(p), 1);
      await savePeople();
      return renderPeople();
    }
    if (act === "ver") return preview(p);
    btn.disabled = true;
    try {
      const doc = await window.BMDiploma.pdf(p, cfg);
      if (act === "pdf") download(doc.filename, doc.blob, "application/pdf");
      if (act === "mail") await sendMail(p, doc);
      if (act === "wa") await sendWa(p, doc);
    } catch (e) {
      toast(e.message, "err");
    }
    btn.disabled = false;
  }

  async function sendMail(p, doc) {
    if (!p.email) throw new Error(`${p.nombre} no tiene correo registrado.`);
    toast(`Enviando certificado a ${p.email}…`);
    await api("certificado", { documento: p.documento, nombre: p.nombre, email: p.email, modalidad: p.modalidad, filename: doc.filename, pdf: await blobToB64(doc.blob), codigo: window.BMDiploma.code(cfg.certificado?.codigoPrefijo, p.documento) });
    p.certificado = fmtDate();
    await savePeople();
    renderPeople();
    toast(`Certificado enviado a ${p.nombre} ✓`, "ok");
  }

  async function sendWa(p, doc) {
    const first = String(p.nombre).split(" ")[0];
    const msg = `¡Hola ${first}! 🎓 Gracias por asistir al taller *${cfg.evento?.titulo}*. Aquí está tu certificado de asistencia. ¡Éxitos implementando tus automatizaciones! — ${cfg.certificado?.firmante || "BioMarketing"}`;
    const file = new File([doc.blob], doc.filename, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: msg }); } catch (e) { return; }
    } else {
      download(doc.filename, doc.blob, "application/pdf");
      window.open(`https://wa.me/${waNum(p.whatsapp)}?text=${encodeURIComponent(msg + "\n\n(Adjunto el PDF)")}`, "_blank", "noopener");
      toast("PDF descargado: adjúntalo en el chat de WhatsApp que se abrió.", "ok");
    }
    if (!p.certificado) p.certificado = fmtDate() + " (WhatsApp)";
    await savePeople();
    renderPeople();
  }

  async function sendAll() {
    const list = people.filter((p) => p.asistio && !p.certificado && p.email);
    if (!list.length) return toast("No hay asistentes pendientes de certificado con correo.", "err");
    if (!endpoint() || !adminKey) return toast("Para el envío masivo configura la URL de Apps Script y la clave de administración.", "err");
    if (!confirm(`Se enviará el certificado por correo a ${list.length} asistente(s). ¿Continuar?`)) return;
    let ok = 0;
    for (const p of list) {
      try {
        toast(`Enviando ${ok + 1} de ${list.length}: ${p.nombre}…`);
        await sendMail(p, await window.BMDiploma.pdf(p, cfg));
        ok++;
      } catch (e) {
        toast(`Error con ${p.nombre}: ${e.message}`, "err");
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    toast(`${ok} certificado(s) enviados ✓`, "ok");
  }

  async function downloadAll() {
    const list = people.filter((p) => p.asistio);
    if (!list.length) return toast("Marca primero la asistencia.", "err");
    for (const p of list) {
      const d = await window.BMDiploma.pdf(p, cfg);
      download(d.filename, d.blob, "application/pdf");
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  async function preview(p) {
    const c = await window.BMDiploma.render(p, cfg);
    $("#pvTitle").textContent = `Certificado · ${p.nombre}`;
    $("#pvImg").innerHTML = "";
    c.style.width = "100%";
    c.style.height = "auto";
    $("#pvImg").appendChild(c);
    $("#pv").hidden = false;
  }

  function renderYt() {
    const box = $("#ytPrev");
    const inp = $('[data-k="video.url"]');
    const draw = () => {
      const m = String(inp.value || "").match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
      box.innerHTML = m ? `<img src="https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg" alt=""><span>✓ Video detectado. Se mostrará en la landing.</span>` : inp.value ? `<span class="warn">No se reconoce el link de YouTube.</span>` : "";
    };
    inp.addEventListener("input", draw);
    draw();
  }
})();
