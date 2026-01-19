// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require('express');
const router = express.Router();
const captchaController = require('../controllers/captchaController');

// ===== RUTAS =====
// Ruta para obtener captcha
router.post('/', captchaController.getCaptcha);

// Ruta para validar captcha
router.post('/validate', captchaController.validateCaptcha);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;