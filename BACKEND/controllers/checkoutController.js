// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const Coupon = require("../models/Coupon");
const Country = require("../models/Country");

// ===== FUNCIONES =====
// Validar cupón
async function validateCoupon(req, res) {
  try {
    const { code, subtotal } = req.body;
    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : null;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Código de cupón requerido" });
    }

    const result = await Coupon.validateCoupon(
      code,
      subtotal || 0,
      userId,
      userEmail
    );

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      coupon: {
        code: result.coupon.code,
        name: result.coupon.name,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
      },
      discount: result.discount,
    });
  } catch (error) {
    console.error("Error al validar cupón:", error);
    res.status(500).json({
      success: false,
      message: "Error al validar cupón",
      error: error.message,
    });
  }
}

// Obtener todos los países disponibles
function getCountries(req, res) {
  try {
    const countries = Country.getAllCountries();
    res.json({
      success: true,
      countries: countries,
    });
  } catch (error) {
    console.error("Error al obtener países:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener países",
      error: error.message,
    });
  }
}

// Obtener configuración de un país
function getCountryConfig(req, res) {
  try {
    const { countryCode } = req.params;
    const config = Country.getCountryConfig(countryCode);

    res.json({
      success: true,
      country: config,
    });
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener configuración del país",
      error: error.message,
    });
  }
}

// Calcular totales con país, envío, cupón, etc.
async function calculateTotals(req, res) {
  try {
    const { subtotal, countryCode, shippingType, couponCode, giftWrap } =
      req.body;
    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : null;

    if (subtotal === undefined || !countryCode) {
      return res
        .status(400)
        .json({ success: false, message: "Subtotal y país son requeridos" });
    }

    let discount = 0;
    let couponInfo = null;

    // Validar cupón si se proporciona
    if (couponCode) {
      const couponResult = await Coupon.validateCoupon(
        couponCode,
        subtotal,
        userId,
        userEmail
      );
      if (couponResult.valid) {
        discount = couponResult.discount;
        couponInfo = {
          code: couponResult.coupon.code,
          name: couponResult.coupon.name,
          discountType: couponResult.coupon.discountType,
        };

        // Si es envío gratis, lo manejamos diferente
        if (couponResult.coupon.discountType === "free_shipping") {
          // Se manejará en calculateTotals
        }
      }
    }

    const totals = Country.calculateTotals(
      subtotal,
      countryCode,
      shippingType || "standard",
      discount,
      giftWrap || false
    );

    // Si el cupón es de envío gratis, forzar envío a 0
    if (couponInfo && couponInfo.discountType === "free_shipping") {
      totals.shipping.shippingCost = 0;
      totals.shipping.isFree = true;
      totals.total =
        subtotal + totals.tax.taxAmount + totals.giftWrap - discount;
    }

    res.json({
      success: true,
      ...totals,
      coupon: couponInfo,
    });
  } catch (error) {
    console.error("Error al calcular totales:", error);
    res.status(500).json({
      success: false,
      message: "Error al calcular totales",
      error: error.message,
    });
  }
}

// Obtener información de conversión de moneda
function getCurrencyInfo(req, res) {
  try {
    const { countryCode } = req.params;
    const config = Country.getCountryConfig(countryCode);

    res.json({
      success: true,
      currency: config.currency,
      symbol: Country.getCurrencySymbol(config.currency),
      exchangeRate: Country.getExchangeRates()[config.currency] || 1,
      allRates: Country.getExchangeRates(),
      allSymbols: Country.getCurrencySymbols(),
    });
  } catch (error) {
    console.error("Error al obtener info de moneda:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener información de moneda",
      error: error.message,
    });
  }
}

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  validateCoupon,
  getCountries,
  getCountryConfig,
  calculateTotals,
  getCurrencyInfo,
};
