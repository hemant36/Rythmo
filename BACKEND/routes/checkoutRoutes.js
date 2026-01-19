// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const checkoutController = require("../controllers/checkoutController");
const orderProcessController = require("../controllers/orderProcessController");
const subscriptionController = require("../controllers/subscriptionController");
const { verifyToken, optionalAuth } = require("../middlewares/authMiddleware");

// ===== RUTAS PÚBLICAS =====
// GET /api/checkout/countries - Obtener lista de países
router.get("/countries", checkoutController.getCountries);

// GET /api/checkout/country/:countryCode - Obtener configuración de país
router.get("/country/:countryCode", checkoutController.getCountryConfig);

// GET /api/checkout/currency/:countryCode - Obtener información de moneda
router.get("/currency/:countryCode", checkoutController.getCurrencyInfo);

// POST /api/checkout/calculate - Calcular totales (público pero mejor con auth)
router.post("/calculate", optionalAuth, checkoutController.calculateTotals);

// POST /api/checkout/validate-coupon - Validar cupón
router.post(
  "/validate-coupon",
  optionalAuth,
  checkoutController.validateCoupon
);

// ===== RUTAS DE SUSCRIPCIÓN (PÚBLICAS) =====
// POST /api/checkout/subscribe - Suscribirse al newsletter
router.post("/subscribe", subscriptionController.subscribe);

// POST /api/checkout/unsubscribe - Cancelar suscripción
router.post("/unsubscribe", subscriptionController.unsubscribe);

// ===== RUTAS PROTEGIDAS =====
// POST /api/checkout/process - Procesar orden completa
router.post("/process", verifyToken, orderProcessController.processOrder);

// GET /api/checkout/orders - Obtener órdenes del usuario
router.get("/orders", verifyToken, orderProcessController.getUserOrders);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
