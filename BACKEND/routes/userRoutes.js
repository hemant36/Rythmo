// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const {
  getUsers,
  getProfile,
  deleteAccount,
} = require("../controllers/userController");
const { verifyToken } = require("../middlewares/authMiddleware");

// ===== RUTAS =====
// Obtener todos los usuarios
router.get("/", getUsers);

// Obtener perfil del usuario logueado
router.get("/profile", verifyToken, getProfile);

// Eliminar cuenta del usuario
router.delete("/account", verifyToken, deleteAccount);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
