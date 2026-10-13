/*
 * Configuración publicada de la landing.
 * Este archivo se puede reemplazar por el que descarga el panel /admin.html
 * (botón "Publicar → Descargar site-config.js"). Así los cambios de imágenes
 * y textos quedan visibles para todos los visitantes.
 */
window.SITE_CONFIG = {
  evento: {
    titulo: "IA para el Sector Salud: automatizaciones con Claude",
    fechaISO: "2026-11-07T14:00:00-05:00",
    fechaFinISO: "2026-11-07T18:00:00-05:00",
    fechaTexto: "Sábado 7 de noviembre de 2026",
    horario: "2:00 p.m. – 6:00 p.m. (hora Colombia)",
    intensidad: "4 horas",
    ciudad: "Cúcuta, Norte de Santander",
    lugar: "Lugar del evento por confirmar",
    plataformaVirtual: "En vivo por Zoom",
    cuposPresencial: 40
  },
  precios: {
    presencial: 180000,
    virtual: 120000,
    presencialIncluye:
      "Taller presencial en Cúcuta, 4 horas intensivas\nAcompañamiento en sala para construir tus automatizaciones\nKit de 30+ automatizaciones y plantillas de prompts por especialidad\nCertificado de asistencia firmado\nNetworking con profesionales de la salud de la región\nGrupo privado de soporte post-curso",
    virtualIncluye:
      "Transmisión en vivo el mismo día y horario\nPreguntas en tiempo real por chat\nKit de 30+ automatizaciones y plantillas de prompts por especialidad\nCertificado de asistencia digital firmado\nGrupo privado de soporte post-curso"
  },
  contacto: {
    whatsapp: "573505457420",
    email: "biomarketing.salud@gmail.com",
    instagram: "",
    mensajeWhatsapp: "Hola BioMarketing, quiero información del curso de IA para el sector salud con Claude."
  },
  pago: {
    tipo: "Llave Bre-B",
    llave: "@OTO262",
    titular: "Juan Carlos Cáceres",
    horasReserva: 24,
    instrucciones: "Transfiere desde la app de cualquier banco o billetera (Bancolombia, Nequi, Daviplata, Davivienda, BBVA…) usando la llave Bre-B. El dinero llega al instante.",
    linkPago: ""
  },
  registro: {
    // URL de Google Apps Script (ver integraciones/google-apps-script.gs). Vacío = solo WhatsApp.
    endpoint: "",
    abrirWhatsappAlEnviar: false
  },
  instructor: {
    nombre: "Juan Carlos Cáceres M.",
    rol: "Bacteriólogo · MSc. en Administración de Instituciones de Salud",
    credenciales:
      "Bacteriólogo\nMagíster en Administración de Instituciones de Salud\nEspecialista en Analítica de Datos e Inteligencia Artificial para el sector salud",
    bio:
      "Ha trabajado en laboratorio clínico, gestión de instituciones de salud y auditoría. Hoy acompaña a médicos, laboratorios e IPS a implementar inteligencia artificial de forma práctica, ética y medible. En este taller enseña lo que ya funciona en instituciones reales.",
    puntos:
      "Implementación de IA en consultorios, IPS y laboratorios clínicos\nAnalítica de datos para la toma de decisiones en salud\nAuditoría médica, calidad y respuesta a glosas\nMarketing médico ético y captación de pacientes"
  },
  video: {
    url: "",
    titulo: "Así se vivió nuestro curso anterior",
    descripcion: "Mira a profesionales de la salud construyendo sus primeras automatizaciones en vivo."
  },
  certificado: {
    firmante: "JUAN CARLOS CÁCERES M.",
    cargo:
      "Bacteriólogo · MSc. en Administración de Instituciones de Salud\nEsp. en Analítica de Datos e Inteligencia Artificial para el Sector Salud",
    firmaImg: "",
    codigoPrefijo: "BM-IA-2026"
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
