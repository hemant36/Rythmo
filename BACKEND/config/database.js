// ===== CONEXIÓN A BD ====
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20, 
  queueLimit: 0,

  // Configuración para producción
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 segundos

  // Timeout de conexión
  connectTimeout: 10000, // 10 segundos
  
  // Timezone
  timezone: "local",
});

// Manejar errores de conexión
pool.on("error", (err) => {
  console.error("Error en el pool de MySQL:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.error("Conexión a la base de datos perdida. Reconectando...");
  }
});

// ===== EXPORTACIÓN DEL POOL =====
module.exports = pool;
