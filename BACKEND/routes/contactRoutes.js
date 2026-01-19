// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const { sendContactMessage } = require("../controllers/contactController");

// ===== RUTAS =====
// Enviar mensaje de contacto
router.post("/send", sendContactMessage);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
