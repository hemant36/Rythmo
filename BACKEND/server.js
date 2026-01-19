// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("./middlewares/corsMiddleware");
const pool = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const captchaRoutes = require("./routes/captchaRoutes");
const imagenesRoutes = require("./routes/imagenesRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRouter = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== RATE LIMITING SIMPLE =====
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX = 100; // máximo 100 requests por minuto por IP

function simpleRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
  } else {
    const record = requestCounts.get(ip);
    if (now - record.startTime > RATE_LIMIT_WINDOW) {
      // Reiniciar ventana
      requestCounts.set(ip, { count: 1, startTime: now });
    } else {
      record.count++;
      if (record.count > RATE_LIMIT_MAX) {
        return res.status(429).json({
          message: "Demasiadas solicitudes. Intenta de nuevo en un minuto.",
        });
      }
    }
  }
  next();
}

// Limpiar IPs antiguas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(ip);
    }
  }
}, 300000);

// ===== MIDDLEWARES =====
app.use(cors);
app.use(simpleRateLimit);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Servir archivos estáticos de uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== RUTA BASE =====
app.get("/", (req, res) => {
  res.send("¡API Rythmos funcionando correctamente!");
});

// ===== RUTAS DE AUTENTICACIÓN =====
app.use("/api/auth", authRoutes);

// ===== RUTAS DE CAPTCHA =====
app.use("/api/captcha", captchaRoutes);

// ===== RUTAS DE IMAGENES =====
app.use("/api/images", imagenesRoutes);

// ===== RUTAS DE ADMIN =====
app.use("/api/admin", adminRoutes);

// ===== RUTAS DE PRODUCTOS =====
app.use("/api/products", productRouter);

// ===== RUTAS DE USUARIOS =====
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// ===== RUTAS DE PEDIDOS =====
app.use("/api/orders", orderRoutes);

// ===== RUTAS DE CARRITO =====
app.use("/api/cart", cartRoutes);

// ===== RUTAS DE WISHLIST =====
app.use("/api/wishlist", wishlistRoutes);

// ===== RUTAS DE CHECKOUT =====
app.use("/api/checkout", checkoutRoutes);

// ===== RUTAS DE CONTACTO =====
app.use("/api/contact", contactRoutes);

// ===== MANEJO DE ERRORES GLOBAL =====
// Ruta no encontrada
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);

  // Error de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "JSON inválido en el cuerpo de la petición",
    });
  }

  // Error de CORS
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Origen no permitido",
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    // Solo mostrar detalles en desarrollo
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// ===== FUNCIÓN DE PRUEBA COMPLETA BD =====
async function testConnection() {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    console.log(" Conexión básica establecida. Resultado:", rows[0].result);
  } catch (error) {
    console.error(" Error al conectar con la base de datos:");
    console.error("  Mensaje:", error.message);
    console.error("  Código:", error.code);
    console.error("  SQL:", error.sql);
  }
}

// ===== INICIALIZACIÓN DEL SERVIDOR =====
app.listen(PORT, async () => {
  console.log(` Servidor escuchando en http://localhost:${PORT}`);
  await testConnection();
});
