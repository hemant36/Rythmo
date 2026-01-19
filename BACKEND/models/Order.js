// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const pool = require("../config/database");

// ===== FUNCIONES =====
// Obtener todos los pedidos
async function getAllOrders() {
  const [rows] = await pool.query("SELECT * FROM orders");
  return rows;
}

// Obtener pedido por ID
async function getOrderById(id) {
  const [rows] = await pool.query("SELECT * FROM orders WHERE id = ?", [id]);
  return rows[0];
}

// Crear pedido
async function createOrder(userId, products, total, status = "pendiente") {
  const [result] = await pool.query(
    "INSERT INTO orders (userId, products, total, status, date) VALUES (?, ?, ?, ?, NOW())",
    [userId, JSON.stringify(products), total, status]
  );
  return result.insertId;
}

// Actualizar estado del pedido
async function updateOrderStatus(id, status) {
  const [result] = await pool.query(
    "UPDATE orders SET status = ? WHERE id = ?",
    [status, id]
  );
  return result.affectedRows;
}

// Eliminar pedido
async function deleteOrder(id) {
  const [result] = await pool.query("DELETE FROM orders WHERE id = ?", [id]);
  return result.affectedRows;
}

// ===== EXPORTACIÓN DEL MODELO =====
module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
};
