// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const pool = require("../config/database");

// ===== OBJETO COUPON =====
const Coupon = {
  // Obtener todos los cupones activos
  async getAllActive() {
    const [rows] = await pool.query(
      "SELECT * FROM coupons WHERE isActive = 1 AND (expiresAt IS NULL OR expiresAt > NOW())"
    );
    return rows;
  },

  // Buscar cupón por código
  async findByCode(code) {
    const [rows] = await pool.query(
      "SELECT * FROM coupons WHERE code = ? AND isActive = 1",
      [code.toUpperCase()]
    );
    return rows[0] || null;
  },

  // Validar cupón
  async validateCoupon(code, subtotal, userId = null, userEmail = null) {
    const coupon = await this.findByCode(code);

    if (!coupon) {
      return { valid: false, message: "Cupón no encontrado o inactivo" };
    }

    // Verificar si el cupón está restringido a un email específico
    if (coupon.restrictedToEmail) {
      const restrictedEmail = coupon.restrictedToEmail.toLowerCase().trim();
      const currentEmail = userEmail ? userEmail.toLowerCase().trim() : null;

      if (restrictedEmail !== currentEmail) {
        return {
          valid: false,
          message:
            "Este cupón solo puede ser usado por el email al que fue enviado",
        };
      }
    }

    // Verificar expiración
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, message: "Este cupón ha expirado" };
    }

    // Verificar mínimo de compra
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return {
        valid: false,
        message: `Compra mínima de $${coupon.minPurchase} requerida para este cupón`,
      };
    }

    // Verificar usos máximos
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return {
        valid: false,
        message: "Este cupón ha alcanzado su límite de usos",
      };
    }

    // Verificar si el usuario ya usó este cupón (si aplica por usuario o está restringido a email)
    if (userId && (coupon.onePerUser || coupon.restrictedToEmail)) {
      const [used] = await pool.query(
        "SELECT id FROM coupon_usage WHERE couponId = ? AND userId = ?",
        [coupon.id, userId]
      );
      if (used.length > 0) {
        return {
          valid: false,
          message: "Ya has usado este cupón anteriormente",
        };
      }
    }

    // Verificar también por email si el cupón está restringido a un email específico
    if (userEmail && coupon.restrictedToEmail) {
      const [usedByEmail] = await pool.query(
        `SELECT cu.id FROM coupon_usage cu 
         INNER JOIN users u ON cu.userId = u.id 
         WHERE cu.couponId = ? AND u.email = ?`,
        [coupon.id, userEmail]
      );
      if (usedByEmail.length > 0) {
        return {
          valid: false,
          message: "Este cupón ya fue utilizado",
        };
      }
    }

    // Calcular descuento
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = subtotal * (coupon.discountValue / 100);
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.discountType === "fixed") {
      discount = coupon.discountValue;
    } else if (coupon.discountType === "free_shipping") {
      discount = 0; // Se maneja aparte
    }

    return {
      valid: true,
      coupon: coupon,
      discount: discount,
      message: `Cupón "${coupon.name}" aplicado correctamente`,
    };
  },

  // Registrar uso de cupón
  async registerUsage(couponId, userId, orderId) {
    // Incrementar contador de usos
    await pool.query(
      "UPDATE coupons SET usedCount = usedCount + 1 WHERE id = ?",
      [couponId]
    );

    // Registrar uso por usuario
    await pool.query(
      "INSERT INTO coupon_usage (couponId, userId, orderId) VALUES (?, ?, ?)",
      [couponId, userId, orderId]
    );
  },

  // Crear cupón (para admin)
  async createCoupon(couponData) {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      maxUses,
      onePerUser,
      expiresAt,
      restrictedToEmail,
    } = couponData;

    const [result] = await pool.query(
      `INSERT INTO coupons (code, name, description, discountType, discountValue, 
       minPurchase, maxDiscount, maxUses, onePerUser, expiresAt, restrictedToEmail) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.toUpperCase(),
        name,
        description,
        discountType,
        discountValue,
        minPurchase || null,
        maxDiscount || null,
        maxUses || null,
        onePerUser ? 1 : 0,
        expiresAt || null,
        restrictedToEmail || null,
      ]
    );
    return result.insertId;
  },

  // Desactivar cupón
  async deactivateCoupon(id) {
    const [result] = await pool.query(
      "UPDATE coupons SET isActive = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  },
};

// ===== EXPORTACIÓN DEL MODELO =====
module.exports = Coupon;
