// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const imagenesController = require("../controllers/imagenesController");
const { isAdmin } = require("../middlewares/authMiddleware");

// ===== RUTAS =====
// Ruta para subir imágenes (solo admin)
router.post("/upload", isAdmin, imagenesController.uploadImages);

// Ruta para eliminar imágenes (solo admin)
router.post("/delete", isAdmin, imagenesController.deleteImages);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
