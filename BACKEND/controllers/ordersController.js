// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const Order = require("../models/Order");

// ===== FUNCIONES =====
// Obtener todos los pedidos
async function getAllOrders(req, res) {
  try {
    const orders = await Order.getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener pedidos", error });
  }
}

// Obtener pedido por ID
async function getOrderById(req, res) {
  try {
    const id = req.params.id;
    const order = await Order.getOrderById(id);
    if (!order)
      return res.status(404).json({ message: "Pedido no encontrado" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener pedido", error });
  }
}

// Crear pedido
async function createOrder(req, res) {
  try {
    const { userId, products, total, status } = req.body;
    const orderId = await Order.createOrder(userId, products, total, status);
    res.status(201).json({ message: "Pedido creado", orderId });
  } catch (error) {
    res.status(500).json({ message: "Error al crear pedido", error });
  }
}

// Actualizar estado del pedido
async function updateOrderStatus(req, res) {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const updated = await Order.updateOrderStatus(id, status);
    if (!updated)
      return res.status(404).json({ message: "Pedido no encontrado" });
    res.json({ message: "Estado actualizado" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar estado", error });
  }
}

// Eliminar pedido
async function deleteOrder(req, res) {
  try {
    const id = req.params.id;
    const deleted = await Order.deleteOrder(id);
    if (!deleted)
      return res.status(404).json({ message: "Pedido no encontrado" });
    res.json({ message: "Pedido eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar pedido", error });
  }
}

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
};
