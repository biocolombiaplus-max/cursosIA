/*
 * BioMarketing · Servidor de pagos (Cloudflare Worker)
 *
 * Sirve la landing (carpeta public/) y agrega 4 rutas para pagar con ePayco
 * (tarjetas, PSE, Nequi, Daviplata, efectivo…):
 *   GET  /api/pago/config        → ¿ePayco está activo?
 *   POST /api/pago/sesion        → crea la sesión de pago (Smart Checkout v2)
 *   GET  /api/pago/estado?ref=…  → estado de una transacción (página de respuesta)
 *   POST /api/pago/confirmacion  → aviso servidor a servidor de ePayco (firma validada)
 *
 * Las llaves NO van en el código. Se guardan en Cloudflare →
 * Workers → cursosia → Configuración → Variables y secretos:
 *   EPAYCO_PUBLIC_KEY   (PUBLIC_KEY)
 *   EPAYCO_PRIVATE_KEY  (PRIVATE_KEY)          ← tipo "Secreto"
 *   EPAYCO_CUST_ID      (P_CUST_ID_CLIENTE)
 *   EPAYCO_P_KEY        (P_KEY)                ← tipo "Secreto"
 *   EPAYCO_TEST         "true" para pruebas, "false" o vacío para pagos reales
 */
const APIFY = "https://apify.epayco.co";
const VALIDACION = "https://secure.epayco.co/validation/v1/reference/";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/pago/")) {
      try {
        return await api(req, env, ctx, url);
      } catch (e) {
        return json({ ok: false, error: "Error inesperado. Intenta de nuevo o paga con llave Bre-B." }, 500);
      }
    }
    return env.ASSETS.fetch(req);
  }
};

async function api(req, env, ctx, url) {
  const ruta = url.pathname.replace("/api/pago/", "");
  const activo = Boolean(env.EPAYCO_PUBLIC_KEY && env.EPAYCO_PRIVATE_KEY);
  const test = String(env.EPAYCO_TEST || "").toLowerCase() === "true";

  if (ruta === "config") return json({ ok: true, activo, test });

  if (ruta === "sesion" && req.method === "POST") {
    if (!activo) return json({ ok: false, error: "Los pagos con tarjeta aún no están activos. Usa la llave Bre-B." }, 503);
    const b = await req.json().catch(() => ({}));
    const cfg = await siteConfig(env, url);
    const c = cotizar(cfg.precios || {}, b);
    if (!c.hoy) return json({ ok: false, error: "No se pudo calcular el valor." }, 400);
    const doc = limpio(b.documento, 20).replace(/[^\dA-Za-z]/g, "");
    const nombre = limpio(b.nombre, 80);
    const email = limpio(b.email, 120);
    if (!doc || !nombre || !/^\S+@\S+\.\S+$/.test(email)) return json({ ok: false, error: "Faltan datos del comprador." }, 400);

    const token = await login(env).catch(() => "");
    if (!token) return json({ ok: false, error: "No pudimos conectar con ePayco en este momento." }, 502);
    const titulo = cfg.evento?.titulo || "Taller IA para el Sector Salud con Claude";
    const planTxt = c.modalidad === "Virtual" ? "Virtual" : c.plan === "reserva" ? "Presencial · reserva" : "Presencial · pago completo";
    const regId = limpio(b.regId, 40);
    const tel = limpio(b.whatsapp, 20).replace(/\D/g, "");
    const body = {
      test,
      ip: req.headers.get("CF-Connecting-IP") || "127.0.0.1",
      name: titulo.slice(0, 60),
      description: `${planTxt}${c.personas > 1 ? ` · grupo ${c.personas} personas` : ""} · ${nombre}`.slice(0, 120),
      invoice: `BM-${doc}-${Date.now().toString(36).toUpperCase()}`,
      currency: "COP",
      amount: c.hoy,
      taxBase: 0,
      tax: 0,
      taxIco: 0,
      country: "CO",
      lang: "ES",
      response: `${url.origin}/?pago=epayco&r=${encodeURIComponent(regId)}`,
      confirmation: `${url.origin}/api/pago/confirmacion`,
      checkout_version: "2",
      extra1: doc,
      extra2: regId,
      extra3: planTxt,
      extra4: String(c.personas),
      extra5: nombre,
      billing: { email, name: nombre, address: limpio(b.ciudad, 60) || "Colombia", typeDoc: "CC", numberDoc: doc, ...(tel ? { mobilePhone: tel } : {}) }
    };
    const r = await fetch(`${APIFY}/payment/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const d = await r.json().catch(() => ({}));
    const sessionId = d?.data?.sessionId;
    if (!sessionId) {
      const det = (d?.data?.errors || d?.errors || []).map?.((e) => e.errorMessage).filter(Boolean).join(" · ");
      // El detalle técnico queda en los registros de Cloudflare (Observability), no se le muestra al cliente
      console.log("ePayco session/create", r.status, det || JSON.stringify(d).slice(0, 800));
      return json({ ok: false, error: "No pudimos abrir el pago con tarjeta en este momento." }, 502);
    }
    return json({ ok: true, sessionId, test, amount: c.hoy });
  }

  if (ruta === "estado") {
    const ref = limpio(url.searchParams.get("ref"), 40).replace(/[^\w-]/g, "");
    if (!ref) return json({ ok: false, error: "Falta la referencia." }, 400);
    const r = await fetch(VALIDACION + ref);
    const d = (await r.json().catch(() => ({})))?.data;
    if (!d || !d.x_ref_payco) return json({ ok: false, error: "No encontramos la transacción." }, 404);
    const t = transaccion(d);
    if ((await firmaValida(env, d)) !== false) ctx.waitUntil(avisar(env, url, t));
    return json({ ok: true, ...t });
  }

  if (ruta === "confirmacion" && req.method === "POST") {
    const f = Object.fromEntries(new URLSearchParams(await req.text()));
    if (!f.x_ref_payco) return new Response("Sin datos", { status: 400 });
    if ((await firmaValida(env, f)) === false) return new Response("Firma inválida", { status: 400 });
    ctx.waitUntil(avisar(env, url, transaccion(f)));
    return new Response("OK");
  }

  return json({ ok: false, error: "Ruta no encontrada." }, 404);
}

/* ---------- ePayco ---------- */
async function login(env) {
  const r = await fetch(`${APIFY}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${env.EPAYCO_PUBLIC_KEY}:${env.EPAYCO_PRIVATE_KEY}`) }
  });
  const d = await r.json().catch(() => ({}));
  if (!d.token) throw new Error("login");
  return d.token;
}

// Devuelve true/false si hay P_KEY configurada; null si no se puede validar.
async function firmaValida(env, f) {
  if (!env.EPAYCO_CUST_ID || !env.EPAYCO_P_KEY || !f.x_signature) return null;
  const base = [env.EPAYCO_CUST_ID, env.EPAYCO_P_KEY, f.x_ref_payco, f.x_transaction_id, f.x_amount, f.x_currency_code].join("^");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(base));
  const hex = [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, "0")).join("");
  return hex === String(f.x_signature).toLowerCase();
}

function transaccion(d) {
  const cod = Number(d.x_cod_response || d.x_cod_transaction_state || 0);
  const estado = cod === 1 ? "aprobado" : cod === 3 || cod === 7 ? "pendiente" : "rechazado";
  return {
    estado,
    respuesta: d.x_response || d.x_transaction_state || "",
    ref: String(d.x_ref_payco || ""),
    valor: Number(d.x_amount || 0),
    moneda: d.x_currency_code || "COP",
    metodo: d.x_franchise || d.x_bank_name || "",
    fecha: d.x_transaction_date || d.x_fecha_transaccion || "",
    documento: d.x_extra1 || "",
    regId: d.x_extra2 || "",
    plan: d.x_extra3 || "",
    nombre: d.x_extra5 || ""
  };
}

// Reenvía el resultado al Google Sheets del panel (si está configurado)
async function avisar(env, url, t) {
  const cfg = await siteConfig(env, url);
  const endpoint = cfg.registro?.endpoint;
  if (!endpoint || !t.documento) return;
  try {
    await fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "pago_epayco", ref: t.ref, documento: t.documento }) });
  } catch (e) {}
}

/* ---------- Precios (misma lógica que la landing; el valor nunca lo decide el navegador) ---------- */
async function siteConfig(env, url) {
  const r = await env.ASSETS.fetch(new Request(`${url.origin}/assets/js/site-config.js`));
  const txt = await r.text();
  try {
    return JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
  } catch (e) {
    return {};
  }
}

function cotizar(P, b) {
  const round = (n) => Math.round(n / 100) * 100;
  const modalidad = b.modalidad === "Virtual" ? "Virtual" : "Presencial";
  const plan = modalidad === "Presencial" && b.plan === "reserva" ? "reserva" : "completo";
  const min = Number(P.grupoMinimo || 3);
  const grupo = Boolean(b.grupo);
  const personas = grupo ? Math.min(100, Math.max(min, parseInt(b.personas, 10) || min)) : 1;
  const f = grupo ? 1 - Number(P.descuentoGrupo || 0) / 100 : 1;
  const base = modalidad === "Virtual" ? P.virtual : plan === "reserva" ? P.presencialReserva : P.presencial;
  return { modalidad, plan, personas, hoy: round(Number(base || 0) * f) * personas };
}

const limpio = (v, n) => String(v ?? "").trim().slice(0, n);
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
