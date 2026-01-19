// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

// ===== RUTAS =====
// GET /api/cart - Obtener carrito del usuario
router.get("/", cartController.getCart);

// POST /api/cart/add - Agregar producto al carrito
router.post("/add", cartController.addToCart);

// PUT /api/cart/quantity - Actualizar cantidad de producto
router.put("/quantity", cartController.updateQuantity);

// DELETE /api/cart/remove/:productId - Eliminar producto del carrito
router.delete("/remove/:productId", cartController.removeFromCart);

// DELETE /api/cart/clear - Vaciar carrito
router.delete("/clear", cartController.clearCart);

// POST /api/cart/sync - Sincronizar carrito desde localStorage
router.post("/sync", cartController.syncCart);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
