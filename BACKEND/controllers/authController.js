// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const transporter = require("../config/email");

const { User } = require("../models/User");

const captchaService = require("../services/captchaService");

// ===== FUNCIONES =====
// Función para registrar usuario
exports.register = async (req, res) => {
  try {
    const { name, email, password, country } = req.body;
    // Verificar que el email sea válido
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "El correo no es válido" });
    }

    // Verificar que estén llenados todos los campos
    if (!name || !email || !password || !country) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const userId = await User.createUser({
      name,
      email,
      password: hashedPassword,
      country,
    });

    // Recuperar el usuario recién creado
    const user = await User.findByEmail(email);

    // Generar un token JWT
    const token = jwt.sign(
      { id: userId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({
      message: "Usuario registrado con éxito",
      token,
      name: user.name,
    });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ message: "Error al registrar el usuario" });
  }
};

// Función para hacer login
exports.login = async (req, res) => {
  try {
    const { email, password, captchaId, captchaAnswer } = req.body;

    // Validar captcha
    const captchaResult = await captchaService.validateCaptcha(
      captchaId,
      captchaAnswer
    );
    if (!captchaResult.success) {
      return res.status(400).json({ message: "Captcha incorrecto o expirado" });
    }

    // Buscar usuario
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado" });
    }

    // Verificar si la cuenta está bloqueada (temporalemnte --> 5 min)
    if (user.lock_until && new Date() < new Date(user.lock_until)) {
      const now = new Date();
      const unlockDate = new Date(user.lock_until);
      const diffMs = unlockDate - now;
      const diffMin = Math.ceil(diffMs / 60000); // minutos restantes
      return res.status(403).json({
        message: `Cuenta bloqueada. Intenta nuevamente en ${diffMin} minutos.`,
      });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      let failed_attempts = (user.failed_attempts || 0) + 1;
      let lock_until = null;
      const maxAttempts = 3;
      const attemptsLeft = maxAttempts - failed_attempts;

      if (failed_attempts >= maxAttempts) {
        lock_until = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
        await User.updateLoginAttempts(email, failed_attempts, lock_until);
        return res.status(403).json({
          message: "Cuenta bloqueada por 5 minutos por intentos fallidos.",
        });
      }

      await User.updateLoginAttempts(email, failed_attempts, lock_until);
      return res.status(400).json({
        message: `Contraseña incorrecta. Te quedan ${attemptsLeft} intento(s) antes del bloqueo.`,
      });
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    await User.updateLoginAttempts(email, 0, null);
    res.status(200).json({
      message: "Login exitoso",
      token,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error al iniciar sesión" });
  }
};

// Función para enviar código (recuperación de contraseña)
exports.sendResetCode = async (req, res) => {
  const { email } = req.body;
  const user = await User.findByEmail(email);
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  const code = crypto.randomInt(100000, 999999).toString();
  const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

  await User.saveResetCode(email, code, expires);

  const path = require("path");
  const logoPath = path.join(__dirname, "../../FRONTEND/IMAGES/logo.png");

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e8;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B5E3C 0%, #6B4423 100%); padding: 30px; text-align: center;">
          <img src="cid:rythmologo" alt="Rythmo Logo" style="width: 80px; height: 80px; margin-bottom: 15px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Rythmo</h1>
          <p style="color: #f5e6d3; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 2px;">WE BELIEVE IN MUSIC</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 50px;">🔐</div>
            <h2 style="color: #8B5E3C; margin: 10px 0;">Recuperación de Contraseña</h2>
            <p style="color: #666;">Hemos recibido una solicitud para restablecer tu contraseña</p>
          </div>
          
          <div style="background-color: #f9f6f2; padding: 25px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0 0 15px 0; color: #666;">Tu código de verificación es:</p>
            <div style="background: linear-gradient(135deg, #8B5E3C 0%, #6B4423 100%); color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 30px; border-radius: 10px; display: inline-block;">
              ${code}
            </div>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 13px;">
              ⏱️ Este código expirará en <strong>5 minutos</strong>
            </p>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Importante:</strong> Si no solicitaste este código, puedes ignorar este mensaje. Tu cuenta permanecerá segura.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Si tienes problemas, contáctanos en:<br>
              <a href="mailto:soporte@rythmo.com" style="color: #8B5E3C; text-decoration: none;">soporte@rythmo.com</a>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2B1E14; padding: 20px; text-align: center;">
          <p style="color: #8B5E3C; margin: 0;">Rythmo Music Store</p>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">Tu tienda de música de confianza desde 1975</p>
        </div>
        
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Rythmo Music Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 Código de recuperación - Rythmo",
    html: emailHtml,
    text: `Tu código de recuperación de contraseña es: ${code}\n\nEste código expirará en 5 minutos.\n\nSi no solicitaste este código, puedes ignorar este mensaje.`,
    attachments: [
      {
        filename: "logo.png",
        path: logoPath,
        cid: "rythmologo",
      },
    ],
  });

  res.json({ message: "Código enviado" });
};

// Función para verificar código (recuperación de contraseña)
exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findByEmailAndResetCode(email, code);
  if (!user) {
    return res
      .status(400)
      .json({ message: "Código inválido o usuario no encontrado" });
  }
  if (new Date(user.resetCodeExpires) < new Date()) {
    return res.status(400).json({ message: "El código ha expirado" });
  }
  res.json({ message: "Código válido" });
};

// Función para resetear contraseña (recuperación de contraseña)
exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = await User.findByEmailAndResetCode(email, code);
  if (!user) {
    return res
      .status(400)
      .json({ message: "Código inválido o usuario no encontrado" });
  }
  if (new Date(user.resetCodeExpires) < new Date()) {
    return res.status(400).json({ message: "El código ha expirado" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Actualiza la contraseña y elimina el código de recuperación
  await User.updatePasswordAndClearReset(email, hashedPassword);

  res.json({ message: "Contraseña actualizada correctamente" });
};
