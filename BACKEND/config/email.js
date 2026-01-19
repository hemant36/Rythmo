// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const nodemailer = require('nodemailer');

// ===== CREACIÓN DEL TRANSPORTER ====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ===== EXPORTACIÓN DEL TRANSPORTER =====
module.exports = transporter;