/*
 * Configuración publicada de la landing.
 * Este archivo se puede reemplazar por el que descarga el panel /admin.html
 * (botón "Publicar → Descargar site-config.js"). Así los cambios de imágenes
 * y textos quedan visibles para todos los visitantes.
 */
window.SITE_CONFIG = {
  evento: {
    fechaISO: "2026-11-07T08:00:00-05:00",
    fechaTexto: "Sábado 7 de noviembre de 2026",
    horario: "8:00 a.m. – 5:00 p.m.",
    ciudad: "Cúcuta, Norte de Santander",
    lugar: "Lugar del evento por confirmar",
    plataformaVirtual: "En vivo por Zoom",
    cuposPresencial: 40
  },
  precios: {
    presencial: 180000,
    virtual: 120000,
    presencialIncluye:
      "Taller presencial en Cúcuta, 8 horas\nAcompañamiento del equipo en sala para tus automatizaciones\nKit de 30+ automatizaciones y plantillas de prompts por especialidad\nCertificado de asistencia\nNetworking con profesionales de la salud de la región\nGrupo privado de soporte post-curso",
    virtualIncluye:
      "Transmisión en vivo el mismo día\nPreguntas en tiempo real por chat\nKit de 30+ automatizaciones y plantillas de prompts por especialidad\nCertificado de asistencia digital\nGrupo privado de soporte post-curso"
  },
  contacto: {
    whatsapp: "573000000000",
    email: "biomarketing.salud@gmail.com",
    instagram: "",
    mensajeWhatsapp: "Hola BioMarketing, quiero información del curso de IA para el sector salud con Claude."
  },
  pago: {
    instrucciones:
      "Te enviaremos por WhatsApp los datos de pago (transferencia, Nequi o Bancolombia). Tu cupo queda confirmado al recibir el comprobante.",
    linkPago: ""
  },
  registro: {
    // URL de Google Apps Script (ver integraciones/google-apps-script.gs). Vacío = solo WhatsApp + copia local.
    endpoint: "",
    abrirWhatsappAlEnviar: true
  },
  instructor: {
    nombre: "Equipo BioMarketing",
    rol: "Marketing médico · Auditoría en salud · Automatización con IA",
    bio:
      "Trabajamos todos los días con médicos, laboratorios clínicos, IPS y auditores. Este taller nace de lo que ya implementamos en consultorios y laboratorios reales: menos tiempo en tareas repetitivas y más tiempo con el paciente.",
    puntos: "Implementación de IA en consultorios, IPS y laboratorios\nProcesos de auditoría médica y respuesta a glosas\nMarketing médico ético y captación de pacientes"
  },
  testimonios: [],
  galeria: [],
  // Imágenes por sección: bg = fondo, overlay = oscurecimiento (0 a 0.95), media = imagen principal.
  secciones: {
    hero: { bg: "", overlay: 0.75, media: "" },
    problema: { bg: "", overlay: 0.2, media: "" },
    perfiles: { bg: "", overlay: 0.85, media: "" },
    temario: { bg: "", overlay: 0.2, media: "" },
    certificado: { bg: "", overlay: 0.85, media: "" },
    modalidades: { bg: "", overlay: 0.85, media: "" },
    presencial: { media: "" },
    virtual: { media: "" },
    instructor: { bg: "", overlay: 0.2, media: "" },
    faq: { bg: "", overlay: 0.2, media: "" },
    cta: { bg: "", overlay: 0.7, media: "" }
  },
  admin: {
    // SHA-256 de la contraseña. Por defecto: "biomarketing2026" (cámbiala en el panel).
    passwordHash: "0fe60a381e992632bfcb5d5a0e40f3b306d319ab2dd98e751a75fa584b03eda1"
  }
};
