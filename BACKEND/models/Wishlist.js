// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const pool = require("../config/database");

// ===== OBJETO WISHLIST =====
const Wishlist = {
  // Obtener wishlist del usuario
  async getWishlistByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT w.id, w.productId, w.addedAt, p.name, p.price, p.image, p.category, p.stock
       FROM wishlist w
       JOIN products p ON w.productId = p.id
       WHERE w.userId = ?
       ORDER BY w.addedAt DESC`,
      [userId]
    );
    return rows;
  },

  // Verificar si un producto está en la wishlist
  async isInWishlist(userId, productId) {
    const [rows] = await pool.query(
      "SELECT id FROM wishlist WHERE userId = ? AND productId = ?",
      [userId, productId]
    );
    return rows.length > 0;
  },

  // Agregar producto a la wishlist
  async addItem(userId, productId) {
    // Verificar si ya existe
    const exists = await this.isInWishlist(userId, productId);
    if (exists) {
      return {
        action: "exists",
        message: "El producto ya está en la lista de deseos",
      };
    }

    const [result] = await pool.query(
      "INSERT INTO wishlist (userId, productId) VALUES (?, ?)",
      [userId, productId]
    );
    return { action: "added", id: result.insertId };
  },

  // Eliminar producto de la wishlist
  async removeItem(userId, productId) {
    const [result] = await pool.query(
      "DELETE FROM wishlist WHERE userId = ? AND productId = ?",
      [userId, productId]
    );
    return result.affectedRows;
  },

  // Mover producto de wishlist a carrito
  async moveToCart(userId, productId) {
    const Cart = require("./Cart");

    // Agregar al carrito
    await Cart.addItem(userId, productId, 1);

    // Eliminar de wishlist
    await this.removeItem(userId, productId);

    return { success: true };
  },

  // Vaciar wishlist del usuario
  async clearWishlist(userId) {
    const [result] = await pool.query("DELETE FROM wishlist WHERE userId = ?", [
      userId,
    ]);
    return result.affectedRows;
  },

  // Obtener cantidad de items en wishlist
  async getItemCount(userId) {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as total FROM wishlist WHERE userId = ?",
      [userId]
    );
    return rows[0].total || 0;
  },
};

// ===== EXPORTACIÓN DEL MODELO =====
module.exports = Wishlist;
