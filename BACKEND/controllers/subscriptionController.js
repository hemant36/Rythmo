// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const Subscription = require("../models/Subscription");
const transporter = require("../config/email");

// ===== FUNCIONES =====
// Suscribirse al newsletter
async function subscribe(req, res) {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email es requerido" });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Formato de email inválido" });
    }

    // Crear suscripción
    const result = await Subscription.subscribe(email, name);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Solo generar cupón para suscripciones nuevas (no reactivaciones)
    if (!result.reactivated) {
      const couponInfo = await Subscription.generateWelcomeCoupon(email);
      await sendWelcomeEmail(email, name, couponInfo);

      return res.json({
        success: true,
        message:
          "¡Gracias por suscribirte! Revisa tu correo para obtener tu cupón de bienvenida",
        couponCode: couponInfo.code,
      });
    }

    // Reactivación sin cupón nuevo
    res.json({
      success: true,
      message:
        "¡Bienvenido de nuevo! Hemos reactivado tu suscripción. Tu cupón original sigue siendo válido si no lo has usado.",
    });
  } catch (error) {
    console.error("Error al suscribir:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar la suscripción",
      error: error.message,
    });
  }
}

// Cancelar suscripción
async function unsubscribe(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email es requerido" });
    }

    const result = await Subscription.unsubscribe(email);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Email no encontrado en las suscripciones",
      });
    }

    res.json({
      success: true,
      message: "Te has dado de baja del newsletter correctamente",
    });
  } catch (error) {
    console.error("Error al cancelar suscripción:", error);
    res.status(500).json({
      success: false,
      message: "Error al cancelar la suscripción",
      error: error.message,
    });
  }
}

// Enviar email de bienvenida
async function sendWelcomeEmail(email, name, couponInfo) {
  const subscriberName = name || "Amante de la música";
  const path = require("path");
  const logoPath = path.join(__dirname, "../../FRONTEND/IMAGES/logo.png");

  const mailOptions = {
    from: `"Rythmo Music Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🎵 ¡Bienvenido a Rythmo! Tu cupón de descuento está aquí",
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e8;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8B5E3C 0%, #6B4423 100%); padding: 40px 30px; text-align: center;">
            <img src="cid:rythmologo" alt="Rythmo Logo" style="width: 80px; height: 80px; margin-bottom: 15px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Rythmo</h1>
            <p style="color: #f5e6d3; margin: 5px 0 0 0; font-size: 14px; letter-spacing: 2px;">WE BELIEVE IN MUSIC</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2B1E14; margin: 0 0 20px 0; font-size: 24px;">¡Hola, ${subscriberName}! 🎸</h2>
            
            <p style="color: #5a4a3a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              ¡Bienvenido a la familia Rythmo! Estamos emocionados de tenerte con nosotros. 
              Como agradecimiento por unirte a nuestra comunidad musical, te obsequiamos un cupón especial.
            </p>
            
            <!-- Coupon Box -->
            <div style="background: linear-gradient(135deg, #fff9f0 0%, #f5e6d3 100%); border: 2px dashed #8B5E3C; border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0;">
              <p style="color: #8B5E3C; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Tu cupón de bienvenida</p>
              <div style="background-color: #8B5E3C; color: #ffffff; font-size: 28px; font-weight: 700; padding: 15px 25px; border-radius: 8px; display: inline-block; letter-spacing: 3px;">
                ${couponInfo.code}
              </div>
              <p style="color: #2B1E14; font-size: 20px; font-weight: 600; margin: 20px 0 5px 0;">15% DE DESCUENTO</p>
              <p style="color: #5a4a3a; font-size: 14px; margin: 0;">En tu próxima compra • Válido por 30 días</p>
            </div>
            
            <p style="color: #5a4a3a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              Explora nuestra colección de discos de vinilo, álbumes de colección e instrumentos musicales. 
              ¡Tenemos todo lo que necesitas para disfrutar y crear música!
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #2B1E14; padding: 30px; text-align: center;">
            <p style="color: #8B5E3C; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">Rythmo Music Store</p>
            <p style="color: #a89080; font-size: 12px; margin: 0 0 15px 0;">Tu tienda de música de confianza desde 1975</p>
            <div style="margin: 15px 0;">
              <a href="#" style="color: #8B5E3C; text-decoration: none; margin: 0 10px;">Facebook</a>
              <a href="#" style="color: #8B5E3C; text-decoration: none; margin: 0 10px;">Instagram</a>
              <a href="#" style="color: #8B5E3C; text-decoration: none; margin: 0 10px;">Twitter</a>
            </div>
            <p style="color: #5a4a3a; font-size: 11px; margin: 15px 0 0 0;">
              Recibiste este correo porque te suscribiste a nuestro newsletter.<br>
              
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email de bienvenida enviado a:", email);
  } catch (error) {
    console.error("Error al enviar email de bienvenida:", error);
    throw error;
  }
}

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  subscribe,
  unsubscribe,
};
