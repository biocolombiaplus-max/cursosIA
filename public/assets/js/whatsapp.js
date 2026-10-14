/*
 * WhatsApp contextual:
 *  - Un botón "¿Dudas? Escríbenos" en cada sección.
 *  - El botón flotante cambia su mensaje según la sección visible y muestra una burbuja corta.
 * Cada mensaje llega ya escrito y personalizado: la persona solo presiona "Enviar".
 */
(function () {
  const cfg = window.SITE_CONFIG || {};
  const num = String(cfg.contacto?.whatsapp || "").replace(/\D/g, "");
  if (!num) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const link = (msg) => `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  const AREAS = { medicos: "medicina", laboratorio: "laboratorio clínico", auditoria: "auditoría médica", odonto: "odontología",
    enfermeria: "enfermería y terapias", ips: "gestión de una IPS", marketing: "marketing médico" };
  const perfilActivo = () => AREAS[$(".tab.is-active")?.dataset.tab] || "";

  // Mensajes por sección: [burbuja del botón flotante, texto del botón en la sección, mensaje de WhatsApp]
  const CTX = {
    hero: ["¿Quieres asegurar tu cupo?", "¿Dudas? Escríbenos", () => "Hola 👋 Vi el curso de IA para el sector salud con Claude y quiero asegurar mi cupo. ¿Me ayudas?"],
    "en-accion": ["¿Quieres estas automatizaciones?", "Quiero una así", () => "Hola 👋 Vi las automatizaciones funcionando (WhatsApp, agenda e informes) y quiero aprender a hacerlas para mi trabajo. ¿Cómo me inscribo?"],
    problema: ["¿Te pasa lo mismo?", "Cuéntanos tu caso", () => "Hola 👋 Pierdo mucho tiempo en tareas repetitivas en mi trabajo en salud. ¿El curso me sirve para automatizarlas?"],
    demo: ["¿Te imaginas esto en tu consulta?", "Quiero aprender esto", () => "Hola 👋 Vi la demo en vivo de Claude y quiero hacer automatizaciones así. ¿Todavía hay cupos?"],
    perfiles: ["¿Dudas sobre tu perfil?", "Pregunta por tu perfil", () => `Hola 👋 Trabajo en ${perfilActivo() ? "el área de " + perfilActivo() : "el sector salud"}. ¿Qué automatizaciones voy a construir en el curso para mi perfil?`],
    claude: ["¿Nunca has usado Claude?", "¿Dudas? Escríbenos", () => "Hola 👋 Nunca he usado Claude. ¿Puedo tomar el curso desde cero?"],
    temario: ["¿Preguntas sobre el temario?", "Pregunta por el temario", () => "Hola 👋 Revisé el temario del curso de IA en salud y tengo una pregunta antes de inscribirme."],
    instructor: ["Habla directo con Juan Carlos", "Escríbele a Juan Carlos", () => "Hola Juan Carlos 👋 Me gustaría aprender contigo a automatizar con IA. ¿Cómo separo mi cupo?"],
    video: ["¿Te gustó la experiencia?", "Quiero vivirla", () => "Hola 👋 Vi el video del curso anterior y quiero participar en este. ¿Cómo me inscribo?"],
    certificado: ["¿Dudas sobre el certificado?", "Pregunta por el certificado", () => "Hola 👋 Quiero saber más sobre el certificado del curso de IA para el sector salud."],
    como: ["¿Te ayudamos a inscribirte?", "Inscríbeme por WhatsApp", () => "Hola 👋 Quiero inscribirme al curso de IA en salud y pagar con llave Bre-B. ¿Me guías paso a paso?"],
    modalidades: ["¿Dudas sobre precios o pagos?", "Resolver mis dudas de pago", () => "Hola 👋 Quiero reservar mi cupo. ¿Me confirmas disponibilidad y las opciones de pago (completo o reserva)?"],
    grupo: ["", "", () => "Hola 👋 Somos un grupo de la misma institución y queremos inscribirnos con el 10% de descuento. ¿Cómo lo hacemos?"],
    faq: ["¿No encontraste tu respuesta?", "Hablar por WhatsApp", () => "Hola 👋 Tengo una pregunta sobre el curso de IA para el sector salud:"],
    cta: ["¡Último paso! Asegura tu cupo", "Separar mi cupo por WhatsApp", () => "Hola 👋 ¡Quiero mi cupo para el curso de IA con Claude! ¿Cómo lo aseguro hoy?"]
  };
  const keyOf = (sec) => sec.id || sec.dataset.section || (sec.classList.contains("hero") ? "hero" : "");

  function boton(key, variant) {
    const [, label, msg] = CTX[key];
    const a = document.createElement("a");
    a.className = `wa-cta${variant ? " wa-cta--" + variant : ""}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.href = link(msg());
    a.addEventListener("pointerenter", () => (a.href = link(msg())));
    a.addEventListener("focus", () => (a.href = link(msg())));
    a.innerHTML = `<span class="wa-cta__ic"><svg><use href="#i-wa"/></svg></span><span class="wa-cta__txt"><b>${label}</b><small><i></i>En línea · respondemos en minutos</small></span>`;
    return a;
  }

  // 1) Botón en cada sección, junto a su llamado a la acción
  const sitios = [
    ["hero", ".hero__ctas", "link"],
    ["en-accion", ".sec__cta"], ["problema", ".sec__cta"], ["demo", ".sec__cta"], ["perfiles", ".sec__cta"],
    ["temario", ".sec__cta"], ["video", ".sec__cta"], ["como", ".sec__cta"], ["cta", ".final__ctas"]
  ];
  sitios.forEach(([key, sel, variant]) => {
    const sec = $$("section").find((s) => keyOf(s) === key);
    const box = sec && $(sel, sec);
    if (box) box.appendChild(boton(key, variant));
  });
  // Secciones sin contenedor de botones: se agrega una fila propia
  [["claude", ".why2 > div:last-child"], ["instructor", ".instructor__text"], ["certificado", ".split__text"], ["modalidades", ".wrap"]].forEach(([key, sel]) => {
    const sec = $$("section").find((s) => keyOf(s) === key);
    const box = sec && (key === "modalidades" ? $(".group-banner", sec)?.parentElement : $(sel, sec));
    if (!box) return;
    const row = document.createElement("div");
    row.className = "wa-row" + (key === "modalidades" ? " wa-row--center" : "");
    row.appendChild(boton(key));
    if (key === "modalidades") $(".group-banner", sec).after(row);
    else box.appendChild(row);
  });
  // Botón existente de grupos y de preguntas frecuentes con su mensaje propio
  $$('[data-open-form="grupo"]').forEach((b) => {
    const a = document.createElement("a");
    a.className = "wa-mini";
    a.target = "_blank";
    a.rel = "noopener";
    a.href = link(CTX.grupo[2]());
    a.innerHTML = '<svg><use href="#i-wa"/></svg>o coordinar por WhatsApp';
    b.after(a);
  });
  $$("#faq [data-wa]").forEach((a) => {
    const fix = () => (a.href = link(CTX.faq[2]()));
    ["pointerenter", "focus", "click"].forEach((ev) => a.addEventListener(ev, fix));
  });

  // 2) Botón flotante con burbuja según la sección visible
  const fab = $(".fab-wa");
  if (!fab) return;
  const bubble = document.createElement("div");
  bubble.className = "fab-bubble";
  bubble.innerHTML = '<button class="fab-bubble__x" aria-label="Cerrar">×</button><span class="fab-bubble__who"><i></i>Juan Carlos · en línea</span><b></b><small>Escríbenos, te respondemos en minutos</small>';
  document.body.appendChild(bubble);
  const badge = document.createElement("span");
  badge.className = "fab-badge";
  badge.textContent = "1";
  fab.appendChild(badge);

  let actual = "hero", ultimo = Date.now(), cerrado = false, timer;
  const vistos = new Set();
  const movil = matchMedia("(max-width: 640px)");
  const sticky = $("[data-wa-sticky]");
  if (sticky) sticky.addEventListener("click", () => (sticky.href = link(CTX[actual][2]())));
  function setCtx(key) {
    if (!CTX[key] || !CTX[key][0]) return;
    actual = key;
    fab.href = link(CTX[key][2]());
    if (sticky) sticky.href = fab.href;
    if (movil.matches) return; // en el celular WhatsApp vive en la barra inferior, sin burbujas
    if (cerrado || vistos.has(key) || Date.now() - ultimo < 18000 || document.body.style.overflow === "hidden") return;
    vistos.add(key);
    ultimo = Date.now();
    $("b", bubble).textContent = CTX[key][0];
    bubble.classList.add("is-on");
    clearTimeout(timer);
    timer = setTimeout(() => bubble.classList.remove("is-on"), 6500);
  }
  bubble.addEventListener("click", (e) => {
    if (e.target.closest(".fab-bubble__x")) { cerrado = true; bubble.classList.remove("is-on"); return; }
    window.open(link(CTX[actual][2]()), "_blank", "noopener");
  });
  fab.addEventListener("click", () => { badge.remove(); bubble.classList.remove("is-on"); fab.href = link(CTX[actual][2]()); });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.isIntersecting && setCtx(keyOf(e.target)));
  }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
  $$("section").forEach((s) => keyOf(s) && CTX[keyOf(s)] && io.observe(s));
  // Primera burbuja después de unos segundos en la portada
  setTimeout(() => { ultimo = 0; vistos.delete("hero"); if (actual === "hero") setCtx("hero"); }, 9000);
})();
