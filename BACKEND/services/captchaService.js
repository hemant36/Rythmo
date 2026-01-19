// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const svgCaptcha = require('svg-captcha');
const CaptchaSession = require('../models/CaptchaSession');

// ===== SERVICIO DE CAPTCHA =====
// Creación de captcha
async function createCaptcha(email){
    await CaptchaSession.cleanExpired();
    const captcha = svgCaptcha.create({
        size: 5,
        noise: 2,
        color: false,
    });

    const captchaId = Date.now().toString();
    CaptchaSession.create(captchaId, captcha.text.toLowerCase(), email);
    return {id: captchaId, image: captcha.data};
}

// Validación de captcha (con BD)
async function validateCaptcha(id, answer) {
    await CaptchaSession.cleanExpired();
    const session = await CaptchaSession.findById(id);
    if (!session) return { success: false, message: 'Captcha expirado' };
    
    await CaptchaSession.delete(id);

    if (answer.toLowerCase() === session.text) {
        return { success: true, message: 'Captcha correcto' };
    }
    return { success: false, message: 'Captcha incorrecto' };
}

// ===== EXPORTACIÓN DE FUNCIONES =====
module.exports = { createCaptcha, validateCaptcha };