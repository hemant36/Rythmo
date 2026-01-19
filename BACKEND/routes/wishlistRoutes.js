// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlistController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

// ===== RUTAS =====
// GET /api/wishlist - Obtener wishlist del usuario
router.get("/", wishlistController.getWishlist);

// POST /api/wishlist/add - Agregar producto a wishlist
router.post("/add", wishlistController.addToWishlist);

// DELETE /api/wishlist/remove/:productId - Eliminar producto de wishlist
router.delete("/remove/:productId", wishlistController.removeFromWishlist);

// POST /api/wishlist/move-to-cart - Mover producto a carrito
router.post("/move-to-cart", wishlistController.moveToCart);

// GET /api/wishlist/check/:productId - Verificar si producto está en wishlist
router.get("/check/:productId", wishlistController.checkInWishlist);

// DELETE /api/wishlist/clear - Vaciar wishlist
router.delete("/clear", wishlistController.clearWishlist);

// POST /api/wishlist/sync - Sincronizar wishlist desde localStorage
router.post("/sync", wishlistController.syncWishlist);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
