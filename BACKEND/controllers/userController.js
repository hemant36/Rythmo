// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const { getAllUsers, User } = require("../models/User");
const bcrypt = require("bcrypt");
const pool = require("../config/database");

// ===== FUNCIONES =====
// Obtener la lista de todos los usuarios
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res
      .status(500)
      .json({ error: "Error al obtener los usuarios", details: error.message });
  }
};

// Obtener perfil del usuario logueado
const getProfile = async (req, res) => {
  try {
    const user = await User.findByEmail(req.user.email);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Usuario no encontrado" });
    }

    // No enviar la contraseña ni datos sensibles
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        country: user.country,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res
      .status(500)
      .json({ success: false, message: "Error al obtener el perfil" });
  }
};

// Eliminar cuenta del usuario
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Debes confirmar tu contraseña para eliminar la cuenta",
      });
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Contraseña incorrecta",
      });
    }

    // No permitir eliminar cuenta de admin
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "No se puede eliminar una cuenta de administrador",
      });
    }

    // Verificar si el usuario tiene órdenes pendientes
    const [orders] = await pool.query(
      "SELECT COUNT(*) as count FROM orders WHERE userId = ? AND status IN ('pendiente', 'procesando', 'enviado')",
      [userId]
    );

    if (orders[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `No puedes eliminar tu cuenta porque tienes ${orders[0].count} pedido(s) pendiente(s). Espera a que se completen o contacta soporte.`,
      });
    }

    // Eliminar la cuenta
    await User.deleteAccount(userId);

    res.json({
      success: true,
      message: "Tu cuenta ha sido eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar la cuenta",
    });
  }
};

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = { getUsers, getProfile, deleteAccount };
