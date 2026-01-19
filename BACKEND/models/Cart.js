// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const pool = require("../config/database");

// ===== OBJETO CART =====
const Cart = {
  // Obtener carrito del usuario
  async getCartByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT ci.id, ci.productId, ci.quantity, p.name, p.price, p.image, p.category, p.stock
       FROM cart_items ci
       JOIN products p ON ci.productId = p.id
       WHERE ci.userId = ?`,
      [userId]
    );
    return rows;
  },

  // Agregar producto al carrito
  async addItem(userId, productId, quantity = 1) {
    // Verificar si el producto ya existe en el carrito
    const [existing] = await pool.query(
      "SELECT id, quantity FROM cart_items WHERE userId = ? AND productId = ?",
      [userId, productId]
    );

    if (existing.length > 0) {
      // Actualizar cantidad
      const newQuantity = existing[0].quantity + quantity;
      await pool.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [
        newQuantity,
        existing[0].id,
      ]);
      return { action: "updated", quantity: newQuantity };
    } else {
      // Insertar nuevo item
      const [result] = await pool.query(
        "INSERT INTO cart_items (userId, productId, quantity) VALUES (?, ?, ?)",
        [userId, productId, quantity]
      );
      return { action: "added", id: result.insertId };
    }
  },

  // Actualizar cantidad de un producto
  async updateItemQuantity(userId, productId, quantity) {
    if (quantity <= 0) {
      return await this.removeItem(userId, productId);
    }
    const [result] = await pool.query(
      "UPDATE cart_items SET quantity = ? WHERE userId = ? AND productId = ?",
      [quantity, userId, productId]
    );
    return result.affectedRows;
  },

  // Eliminar producto del carrito
  async removeItem(userId, productId) {
    const [result] = await pool.query(
      "DELETE FROM cart_items WHERE userId = ? AND productId = ?",
      [userId, productId]
    );
    return result.affectedRows;
  },

  // Vaciar carrito del usuario
  async clearCart(userId) {
    const [result] = await pool.query(
      "DELETE FROM cart_items WHERE userId = ?",
      [userId]
    );
    return result.affectedRows;
  },

  // Obtener cantidad total de items
  async getItemCount(userId) {
    const [rows] = await pool.query(
      "SELECT SUM(quantity) as total FROM cart_items WHERE userId = ?",
      [userId]
    );
    return rows[0].total || 0;
  },
};

// ===== EXPORTACIÓN DEL MODELO =====
module.exports = Cart;
