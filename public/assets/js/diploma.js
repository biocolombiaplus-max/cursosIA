/*
 * Generador de certificados de asistencia.
 * Dibuja el diploma en un canvas y lo convierte en un PDF (A4 horizontal)
 * sin librerías externas.
 */
(function () {
  const W = 2200, H = 1556; // proporción A4 horizontal

  function loadImg(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = src;
    });
  }

  function code(prefix, doc) {
    let h = 5381;
    for (const ch of String(doc)) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
    return `${prefix || "BM"}-${h.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
  }

  function fitText(ctx, text, font, size, maxW) {
    let s = size;
    do { ctx.font = font.replace("{s}", s); s -= 2; } while (ctx.measureText(text).width > maxW && s > 20);
  }

  function wrap(ctx, text, maxW) {
    const words = text.split(" "), out = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  async function render(person, cfg) {
    await Promise.all([
      document.fonts.load('600 80px "Fraunces"'), document.fonts.load('italic 400 40px "Fraunces"'),
      document.fonts.load('800 40px "Plus Jakarta Sans"'), document.fonts.load('500 30px "Plus Jakarta Sans"')
    ]).catch(() => {});
    const [logo, firma] = await Promise.all([loadImg("assets/img/logo-t.png"), loadImg(cfg.certificado?.firmaImg)]);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    const ev = cfg.evento || {}, ce = cfg.certificado || {};

    // Fondo
    x.fillStyle = "#fbf8f2"; x.fillRect(0, 0, W, H);
    let g = x.createRadialGradient(0, 0, 0, 0, 0, 900);
    g.addColorStop(0, "rgba(124,58,237,.16)"); g.addColorStop(1, "rgba(124,58,237,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createRadialGradient(W, H, 0, W, H, 1000);
    g.addColorStop(0, "rgba(255,122,26,.16)"); g.addColorStop(1, "rgba(255,122,26,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // Arcos de marca (como el logo)
    x.lineCap = "round";
    let lg = x.createLinearGradient(0, 0, 700, 700);
    lg.addColorStop(0, "#3b1fa8"); lg.addColorStop(1, "#7c3aed");
    x.strokeStyle = lg; x.lineWidth = 16;
    x.beginPath(); x.arc(-60, -60, 520, 0.05, Math.PI / 2 - 0.05); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.arc(-60, -60, 580, 0.1, Math.PI / 2 - 0.1); x.stroke();
    lg = x.createLinearGradient(W - 700, H - 700, W, H);
    lg.addColorStop(0, "#ffb020"); lg.addColorStop(1, "#ff5a1a");
    x.strokeStyle = lg; x.lineWidth = 16;
    x.beginPath(); x.arc(W + 60, H + 60, 520, Math.PI + 0.05, Math.PI * 1.5 - 0.05); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.arc(W + 60, H + 60, 580, Math.PI + 0.1, Math.PI * 1.5 - 0.1); x.stroke();

    // Marcos dorados
    x.strokeStyle = "#c8ac6e"; x.lineWidth = 4; x.strokeRect(56, 56, W - 112, H - 112);
    x.strokeStyle = "#dcc89c"; x.lineWidth = 1.5; x.strokeRect(74, 74, W - 148, H - 148);

    x.textAlign = "center"; x.textBaseline = "alphabetic";
    const cx = W / 2;

    if (logo) x.drawImage(logo, cx - 105, 110, 210, 210);

    x.fillStyle = "#6d28d9";
    x.font = '800 40px "Plus Jakarta Sans", sans-serif';
    if ("letterSpacing" in x) x.letterSpacing = "14px";
    x.fillText("CERTIFICADO DE ASISTENCIA", cx + 7, 395);
    if ("letterSpacing" in x) x.letterSpacing = "0px";

    x.fillStyle = "#6b6280";
    x.font = 'italic 400 40px "Fraunces", Georgia, serif';
    x.fillText("BioMarketing · Innovación Digital certifica que", cx, 470);

    // Nombre
    const nombre = String(person.nombre || "").trim().toUpperCase();
    fitText(x, nombre, '600 {s}px "Fraunces", Georgia, serif', 104, 1600);
    x.fillStyle = "#1b1240";
    x.fillText(nombre, cx, 600);
    const lw = Math.min(1500, x.measureText(nombre).width + 160);
    lg = x.createLinearGradient(cx - lw / 2, 0, cx + lw / 2, 0);
    lg.addColorStop(0, "rgba(200,172,110,0)"); lg.addColorStop(0.5, "#c8ac6e"); lg.addColorStop(1, "rgba(200,172,110,0)");
    x.fillStyle = lg; x.fillRect(cx - lw / 2, 632, lw, 3);

    x.fillStyle = "#4a4362";
    x.font = '500 34px "Plus Jakarta Sans", sans-serif';
    x.fillText(`identificado(a) con documento No. ${person.documento || "—"}`, cx, 695);
    x.fillText("asistió y participó en el taller práctico", cx, 770);

    x.fillStyle = "#3b1fa8";
    fitText(x, (ev.titulo || "").toUpperCase(), '800 {s}px "Plus Jakarta Sans", sans-serif', 50, 1700);
    x.fillText((ev.titulo || "").toUpperCase(), cx, 845);

    x.fillStyle = "#4a4362";
    x.font = '500 32px "Plus Jakarta Sans", sans-serif';
    const lugar = person.modalidad === "Virtual" ? "modalidad virtual en vivo" : `modalidad presencial en ${ev.ciudad || "Cúcuta"}`;
    const desc = `realizado el ${String(ev.fechaTexto || "").toLowerCase()}, en ${lugar}, con una intensidad horaria de ${ev.intensidad || "4 horas"}.`;
    wrap(x, desc, 1600).forEach((l, i) => x.fillText(l, cx, 915 + i * 46));

    // Firma
    const sx = cx, sy = 1265;
    if (firma) {
      const r = Math.min(520 / firma.width, 150 / firma.height);
      x.drawImage(firma, sx - (firma.width * r) / 2, sy - 20 - firma.height * r, firma.width * r, firma.height * r);
    } else {
      x.fillStyle = "#2c2160";
      x.font = 'italic 400 64px "Fraunces", Georgia, serif';
      x.fillText(String(ce.firmante || "").toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "), sx, sy - 40);
    }
    x.fillStyle = "#9b8f73"; x.fillRect(sx - 300, sy - 8, 600, 2);
    x.fillStyle = "#1b1240";
    x.font = '800 32px "Plus Jakarta Sans", sans-serif';
    x.fillText(ce.firmante || "", sx, sy + 38);
    x.fillStyle = "#5c5470";
    x.font = '500 23px "Plus Jakarta Sans", sans-serif';
    String(ce.cargo || "").split("\n").forEach((l, i) => x.fillText(l.trim(), sx, sy + 76 + i * 32));

    // Sello
    const px = W - 330, py = 1250;
    x.save();
    x.shadowColor = "rgba(255,107,26,.35)"; x.shadowBlur = 30;
    g = x.createLinearGradient(px - 110, py - 110, px + 110, py + 110);
    g.addColorStop(0, "#ff6b1a"); g.addColorStop(1, "#ffc23d");
    x.fillStyle = g; x.beginPath(); x.arc(px, py, 110, 0, Math.PI * 2); x.fill();
    x.restore();
    x.strokeStyle = "#fbf8f2"; x.lineWidth = 6; x.beginPath(); x.arc(px, py, 92, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = "#e7b25a"; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 122, 0, Math.PI * 2); x.stroke();
    x.fillStyle = "#2b1300";
    x.font = '800 66px "Plus Jakarta Sans", sans-serif';
    x.fillText("BM", px, py + 12);
    x.font = '800 15px "Plus Jakarta Sans", sans-serif';
    x.fillText("CERTIFICADO", px, py + 46);

    // Código y lugar
    x.textAlign = "left";
    x.fillStyle = "#5c5470";
    x.font = '600 24px "Plus Jakarta Sans", sans-serif';
    x.fillText(`${ev.ciudad ? ev.ciudad.split(",")[0] : "Cúcuta"}, Colombia`, 170, 1270);
    x.fillText(ev.fechaTexto || "", 170, 1308);
    x.fillStyle = "#8a8199";
    x.font = '500 21px "Plus Jakarta Sans", sans-serif';
    x.fillText(`Código de verificación: ${code(ce.codigoPrefijo, person.documento)}`, 170, 1350);
    x.fillText(`Modalidad: ${person.modalidad || "—"}`, 170, 1382);

    return c;
  }

  // PDF mínimo con una imagen JPEG a página completa (A4 horizontal)
  function jpegPdf(dataUrl, wPx, hPx) {
    const b64 = dataUrl.split(",")[1];
    const bin = atob(b64);
    const img = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) img[i] = bin.charCodeAt(i);
    const enc = new TextEncoder();
    const parts = [];
    const offsets = [];
    let len = 0;
    const push = (u8) => { parts.push(u8); len += u8.length; };
    const str = (s) => push(enc.encode(s));
    const PW = 842, PH = 595;
    const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
    str("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    offsets[1] = len; str("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    offsets[2] = len; str("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
    offsets[3] = len; str(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
    offsets[4] = len; str(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wPx} /Height ${hPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
    push(img); str("\nendstream\nendobj\n");
    offsets[5] = len; str(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    const xref = len;
    let x = "xref\n0 6\n0000000000 65535 f \n";
    for (let i = 1; i <= 5; i++) x += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    str(x + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: "application/pdf" });
  }

  async function pdf(person, cfg) {
    const canvas = await render(person, cfg);
    const blob = jpegPdf(canvas.toDataURL("image/jpeg", 0.9), canvas.width, canvas.height);
    return { canvas, blob, filename: `Certificado_${String(person.nombre || "asistente").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/[^A-Za-z0-9]+/g, "_")}.pdf` };
  }

  window.BMDiploma = { render, pdf, code };
})();
