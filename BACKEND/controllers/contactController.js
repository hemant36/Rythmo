// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const transporter = require("../config/email");

// ===== FUNCIONES =====
// Enviar mensaje de contacto
async function sendContactMessage(req, res) {
  try {
    const { name, email, phone, message } = req.body;

    // Validaciones
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Nombre, email y mensaje son requeridos",
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Formato de email inválido",
      });
    }

    // Email para el equipo de Rythmo
    const mailToTeam = {
      from: `"Rythmo Contacto" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Se envía al mismo correo de Rythmo
      replyTo: email, // Para que puedan responder directamente al cliente
      subject: `📬 Nuevo mensaje de contacto - ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e8;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8B5E3C 0%, #6B4423 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📬 Nuevo Mensaje de Contacto</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background-color: #f8f3eb; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #8B5E3C; margin: 0 0 15px 0;">Información del Cliente</h3>
                <p style="margin: 8px 0; color: #2B1E14;"><strong>Nombre:</strong> ${name}</p>
                <p style="margin: 8px 0; color: #2B1E14;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #8B5E3C;">${email}</a></p>
                <p style="margin: 8px 0; color: #2B1E14;"><strong>Teléfono:</strong> ${
                  phone || "No proporcionado"
                }</p>
              </div>
              
              <div style="background-color: #fff9f0; border-left: 4px solid #8B5E3C; padding: 20px; border-radius: 0 10px 10px 0;">
                <h3 style="color: #8B5E3C; margin: 0 0 10px 0;">Mensaje</h3>
                <p style="color: #2B1E14; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              
              <p style="color: #6A574B; font-size: 12px; margin-top: 20px; text-align: center;">
                Recibido el ${new Date().toLocaleString("es-MX", {
                  timeZone: "America/Mexico_City",
                })}
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #2B1E14; padding: 20px; text-align: center;">
              <p style="color: #8B5E3C; margin: 0; font-size: 14px;">Rythmo Music Store</p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    };

    // Path para el logo
    const path = require("path");
    const logoPath = path.join(__dirname, "../../FRONTEND/IMAGES/logo.png");

    // Email de confirmación para el cliente
    const mailToClient = {
      from: `"Rythmo Music Store" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🎵 Hemos recibido tu mensaje - Rythmo",
      attachments: [
        {
          filename: "logo.png",
          path: logoPath,
          cid: "rythmologo",
        },
      ],
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e8;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8B5E3C 0%, #6B4423 100%); padding: 40px 30px; text-align: center;">
              <img src="cid:rythmologo" alt="Rythmo Logo" style="width: 80px; height: 80px; margin-bottom: 15px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Rythmo</h1>
              <p style="color: #f5e6d3; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 2px;">WE BELIEVE IN MUSIC</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #2B1E14; margin: 0 0 20px 0;">¡Hola, ${name}! 🎸</h2>
              
              <p style="color: #5a4a3a; font-size: 16px; line-height: 1.6;">
                Gracias por contactarnos. Hemos recibido tu mensaje y nuestro equipo 
                te responderá lo antes posible.
              </p>
              
              <div style="background-color: #f8f3eb; border-radius: 10px; padding: 20px; margin: 25px 0;">
                <p style="color: #8B5E3C; font-weight: 600; margin: 0 0 10px 0;">Tu mensaje:</p>
                <p style="color: #2B1E14; line-height: 1.6; margin: 0; font-style: italic; white-space: pre-wrap;">"${message}"</p>
              </div>
              
              <p style="color: #5a4a3a; font-size: 16px; line-height: 1.6;">
                Normalmente respondemos en un plazo de 24-48 horas hábiles.
              </p>
              
              <p style="color: #5a4a3a; font-size: 16px; line-height: 1.6;">
                ¡Gracias por tu interés en Rythmo! 🎵
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #2B1E14; padding: 30px; text-align: center;">
              <p style="color: #8B5E3C; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">Rythmo Music Store</p>
              <p style="color: #a89080; font-size: 12px; margin: 0;">Tu tienda de música de confianza desde 1975</p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    };

    // Enviar ambos emails
    await transporter.sendMail(mailToTeam);
    await transporter.sendMail(mailToClient);

    res.json({
      success: true,
      message:
        "¡Mensaje enviado correctamente! Te hemos enviado una confirmación a tu correo.",
    });
  } catch (error) {
    console.error("Error al enviar mensaje de contacto:", error);
    res.status(500).json({
      success: false,
      message: "Error al enviar el mensaje. Por favor intenta de nuevo.",
    });
  }
}

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  sendContactMessage,
};
