// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

// ===== FUNCIONES =====
// Obtener wishlist del usuario
async function getWishlist(req, res) {
  try {
    const userId = req.user.id;
    const items = await Wishlist.getWishlistByUserId(userId);

    res.json({
      success: true,
      items: items,
      itemCount: items.length,
    });
  } catch (error) {
    console.error("Error al obtener wishlist:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener la lista de deseos",
        error: error.message,
      });
  }
}

// Agregar producto a wishlist
async function addToWishlist(req, res) {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "ID de producto requerido" });
    }

    // Verificar que el producto existe
    const product = await Product.getProdById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }

    const result = await Wishlist.addItem(userId, productId);

    if (result.action === "exists") {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Obtener wishlist actualizada
    const items = await Wishlist.getWishlistByUserId(userId);

    res.json({
      success: true,
      message: "Producto agregado a la lista de deseos",
      itemCount: items.length,
    });
  } catch (error) {
    console.error("Error al agregar a wishlist:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al agregar a la lista de deseos",
        error: error.message,
      });
  }
}

// Eliminar producto de wishlist
async function removeFromWishlist(req, res) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "ID de producto requerido" });
    }

    await Wishlist.removeItem(userId, parseInt(productId));

    // Obtener wishlist actualizada
    const items = await Wishlist.getWishlistByUserId(userId);

    res.json({
      success: true,
      message: "Producto eliminado de la lista de deseos",
      items: items,
      itemCount: items.length,
    });
  } catch (error) {
    console.error("Error al eliminar de wishlist:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al eliminar de la lista de deseos",
        error: error.message,
      });
  }
}

// Mover producto de wishlist a carrito
async function moveToCart(req, res) {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "ID de producto requerido" });
    }

    // Verificar stock antes de mover
    const product = await Product.getProdById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Producto no encontrado" });
    }

    if (product.stock < 1) {
      return res
        .status(400)
        .json({ success: false, message: "Producto sin stock disponible" });
    }

    await Wishlist.moveToCart(userId, productId);

    res.json({
      success: true,
      message: "Producto movido al carrito",
    });
  } catch (error) {
    console.error("Error al mover a carrito:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al mover al carrito",
        error: error.message,
      });
  }
}

// Verificar si un producto está en wishlist
async function checkInWishlist(req, res) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const isInWishlist = await Wishlist.isInWishlist(
      userId,
      parseInt(productId)
    );

    res.json({
      success: true,
      inWishlist: isInWishlist,
    });
  } catch (error) {
    console.error("Error al verificar wishlist:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al verificar lista de deseos",
        error: error.message,
      });
  }
}

// Vaciar wishlist
async function clearWishlist(req, res) {
  try {
    const userId = req.user.id;
    await Wishlist.clearWishlist(userId);

    res.json({
      success: true,
      message: "Lista de deseos vaciada",
      items: [],
      itemCount: 0,
    });
  } catch (error) {
    console.error("Error al vaciar wishlist:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al vaciar la lista de deseos",
        error: error.message,
      });
  }
}

// Sincronizar wishlist desde localStorage
async function syncWishlist(req, res) {
  try {
    const userId = req.user.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res
        .status(400)
        .json({ success: false, message: "Items inválidos" });
    }

    for (const item of items) {
      if (item.id) {
        const product = await Product.getProdById(item.id);
        if (product) {
          await Wishlist.addItem(userId, item.id);
        }
      }
    }

    const wishlistItems = await Wishlist.getWishlistByUserId(userId);

    res.json({
      success: true,
      message: "Lista de deseos sincronizada",
      items: wishlistItems,
      itemCount: wishlistItems.length,
    });
  } catch (error) {
    console.error("Error al sincronizar wishlist:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error al sincronizar lista de deseos",
        error: error.message,
      });
  }
}

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
  checkInWishlist,
  clearWishlist,
  syncWishlist,
};
