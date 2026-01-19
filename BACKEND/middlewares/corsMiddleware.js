// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const cors = require("cors");

// ===== CORS MIDDLEWARE =====
// En desarrollo permite cualquier origen, en producción usar lista blanca
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin 
    if (!origin) {
      return callback(null, true);
    }

    // En desarrollo, permitir localhost en cualquier puerto
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }

    // Lista de orígenes permitidos en producción
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : [];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("Origen no permitido por CORS:", origin);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"],
});

// ===== EXPORTACIÓN DE CORS =====
module.exports = corsMiddleware;
