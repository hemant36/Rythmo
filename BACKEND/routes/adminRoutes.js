// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const { getUsers } = require("../controllers/userController");
const { isAdmin } = require("../middlewares/authMiddleware");

// ===== RUTAS =====
// Ruta protegida para el dashboard de admin
router.get("/adminDashboard", isAdmin, (req, res) => {
  res.sendStatus(200);
});

// Ruta protegida para obtener todos los usuarios
router.get("/usuarios", isAdmin, getUsers);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
