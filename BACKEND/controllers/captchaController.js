// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const captchaService = require('../services/captchaService');

// ===== FUNCIONES =====
// Función para obtener captcha
exports.getCaptcha = async (req, res) => {
    const { email } = req.body;
    const captcha = await captchaService.createCaptcha(email);
    res.json(captcha);
};

// Función para validar captcha
exports.validateCaptcha = async (req, res) => {
    const { id, answer } = req.body;
    const result = await captchaService.validateCaptcha(id, answer);
    if (result.success) return res.json(result);
    return res.status(400).json(result);
};