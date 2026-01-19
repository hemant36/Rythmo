// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const pool = require("../config/database");

// ===== OBJETO SUBSCRIPTION =====
const Subscription = {
  // Verificar si el email ya está suscrito
  async isSubscribed(email) {
    const [rows] = await pool.query(
      "SELECT id FROM subscriptions WHERE email = ? AND isActive = 1",
      [email]
    );
    return rows.length > 0;
  },

  // Crear suscripción
  async subscribe(email, name = null) {
    // Verificar si ya existe
    const [existing] = await pool.query(
      "SELECT id, isActive FROM subscriptions WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      if (existing[0].isActive) {
        return { success: false, message: "Este email ya está suscrito" };
      } else {
        // Reactivar suscripción
        await pool.query(
          "UPDATE subscriptions SET isActive = 1, subscribedAt = NOW() WHERE id = ?",
          [existing[0].id]
        );
        return {
          success: true,
          message: "Suscripción reactivada",
          reactivated: true,
        };
      }
    }

    // Crear nueva suscripción
    const [result] = await pool.query(
      "INSERT INTO subscriptions (email, name) VALUES (?, ?)",
      [email, name]
    );

    return {
      success: true,
      id: result.insertId,
      message: "Suscripción exitosa",
    };
  },

  // Cancelar suscripción
  async unsubscribe(email) {
    const [result] = await pool.query(
      "UPDATE subscriptions SET isActive = 0 WHERE email = ?",
      [email]
    );
    return result.affectedRows > 0;
  },

  // Obtener todas las suscripciones activas
  async getAllActive() {
    const [rows] = await pool.query(
      "SELECT * FROM subscriptions WHERE isActive = 1 ORDER BY subscribedAt DESC"
    );
    return rows;
  },

  // Generar cupón para nuevo suscriptor
  async generateWelcomeCoupon(email) {
    const Coupon = require("./Coupon");

    // Código único basado en email y timestamp
    const uniqueCode = `WELCOME${Date.now().toString(36).toUpperCase()}`;

    // Crear cupón de bienvenida (15% descuento, válido por 30 días)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const couponId = await Coupon.createCoupon({
      code: uniqueCode,
      name: "Cupón de Bienvenida",
      description: "15% de descuento por suscribirte a nuestro newsletter",
      discountType: "percentage",
      discountValue: 15,
      minPurchase: 50,
      maxDiscount: 100,
      maxUses: 1,
      onePerUser: true,
      expiresAt: expiresAt,
      restrictedToEmail: email, // Solo el email suscrito puede usar este cupón
    });

    return {
      code: uniqueCode,
      discount: "15%",
      expiresAt: expiresAt,
      couponId: couponId,
    };
  },
};

// ===== EXPORTACIÓN DEL MODELO =====
module.exports = Subscription;
