// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");
const { isAdmin, verifyToken } = require("../middlewares/authMiddleware");

// ===== RUTAS =====
// Obtener todos los pedidos (solo admin)
router.get("/", isAdmin, ordersController.getAllOrders);

// Obtener pedido por ID (admin o dueño del pedido)
router.get("/:id", verifyToken, ordersController.getOrderById);

// Crear pedido (usuario autenticado)
router.post("/", verifyToken, ordersController.createOrder);

// Actualizar estado del pedido (solo admin)
router.put("/:id/status", isAdmin, ordersController.updateOrderStatus);

// Eliminar pedido (solo admin)
router.delete("/:id", isAdmin, ordersController.deleteOrder);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
