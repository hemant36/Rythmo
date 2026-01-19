// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController"); 

// ===== RUTAS =====
// Ruta de registro de usuario
router.post("/register", authController.register);

//Ruta de login
router.post("/login", authController.login);

// Ruta para enviar código (recuperación de contraseña)
router.post('/forgot-password', authController.sendResetCode);

// Ruta para verificar código (recuperación de contraseña)
router.post('/verify-reset-code', authController.verifyResetCode);

// Ruta resetear contraseña (recuperación de contraseña)
router.post('/reset-password', authController.resetPassword);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;