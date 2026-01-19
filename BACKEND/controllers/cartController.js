// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { User } = require("../models/User");

// ===== FUNCIONES =====
// Obtener carrito del usuario
async function getCart(req, res) {
  try {
    const userId = req.user.id;
    const items = await Cart.getCartByUserId(userId);

    // Calcular totales
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      items: items,
      subtotal: subtotal,
      itemCount: itemCount,
    });
  } catch (error) {
    console.error("Error al obtener carrito:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener el carrito",
      error: error.message,
    });
  }
}

// Agregar producto al carrito
async function addToCart(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "ID de producto requerido" });
    }

    // Verificar que el producto existe y tiene stock
    const product = await Product.getProdById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${product.stock} unidades disponibles`,
      });
    }

    const result = await Cart.addItem(userId, productId, quantity);

    // Obtener carrito actualizado
    const items = await Cart.getCartByUserId(userId);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      message:
        result.action === "updated"
          ? "Cantidad actualizada"
          : "Producto agregado al carrito",
      itemCount: itemCount,
      result: result,
    });
  } catch (error) {
    console.error("Error al agregar al carrito:", error);
    res.status(500).json({
      success: false,
      message: "Error al agregar al carrito",
      error: error.message,
    });
  }
}

// Actualizar cantidad de producto
async function updateQuantity(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "ID de producto y cantidad requeridos",
      });
    }

    // Verificar stock si se aumenta la cantidad
    if (quantity > 0) {
      const product = await Product.getProdById(productId);
      if (product && product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente. Solo hay ${product.stock} unidades disponibles`,
        });
      }
    }

    await Cart.updateItemQuantity(userId, productId, quantity);

    // Obtener carrito actualizado
    const items = await Cart.getCartByUserId(userId);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      message:
        quantity <= 0
          ? "Producto eliminado del carrito"
          : "Cantidad actualizada",
      items: items,
      subtotal: subtotal,
      itemCount: itemCount,
    });
  } catch (error) {
    console.error("Error al actualizar cantidad:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar cantidad",
      error: error.message,
    });
  }
}

// Eliminar producto del carrito
async function removeFromCart(req, res) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "ID de producto requerido" });
    }

    await Cart.removeItem(userId, parseInt(productId));

    // Obtener carrito actualizado
    const items = await Cart.getCartByUserId(userId);
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      message: "Producto eliminado del carrito",
      items: items,
      subtotal: subtotal,
      itemCount: itemCount,
    });
  } catch (error) {
    console.error("Error al eliminar del carrito:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar del carrito",
      error: error.message,
    });
  }
}

// Vaciar carrito
async function clearCart(req, res) {
  try {
    const userId = req.user.id;
    await Cart.clearCart(userId);

    res.json({
      success: true,
      message: "Carrito vaciado",
      items: [],
      subtotal: 0,
      itemCount: 0,
    });
  } catch (error) {
    console.error("Error al vaciar carrito:", error);
    res.status(500).json({
      success: false,
      message: "Error al vaciar el carrito",
      error: error.message,
    });
  }
}

// Sincronizar carrito desde localStorage (para cuando el usuario inicia sesión)
async function syncCart(req, res) {
  try {
    const userId = req.user.id;
    const { items } = req.body; // Items del localStorage

    // Verificar que el usuario existe en la BD
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no válido. Por favor, inicia sesión nuevamente.",
      });
    }

    if (!items || !Array.isArray(items)) {
      return res
        .status(400)
        .json({ success: false, message: "Items inválidos" });
    }

    // Agregar cada item al carrito de la BD
    for (const item of items) {
      if (item.id && item.quantity > 0) {
        // Verificar stock
        const product = await Product.getProdById(item.id);
        if (product && product.stock >= item.quantity) {
          await Cart.addItem(userId, item.id, item.quantity);
        }
      }
    }

    // Obtener carrito actualizado
    const cartItems = await Cart.getCartByUserId(userId);
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      message: "Carrito sincronizado",
      items: cartItems,
      subtotal: subtotal,
      itemCount: itemCount,
    });
  } catch (error) {
    console.error("Error al sincronizar carrito:", error);
    res.status(500).json({
      success: false,
      message: "Error al sincronizar carrito",
      error: error.message,
    });
  }
}

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  syncCart,
};
