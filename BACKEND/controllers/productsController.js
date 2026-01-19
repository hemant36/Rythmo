// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const prodModel = require("../models/Product");
const fs = require("fs");
const path = require("path");

// ===== FUNCIONES =====
// Función auxiliar para eliminar imagen del servidor
const deleteImageFile = (imageUrl) => {
  if (!imageUrl) return;

  try {
    // Extraer el nombre del archivo de la URL
    // URL ejemplo: http://localhost:3000/uploads/1234567890-123456789.jpg
    const filename = imageUrl.split("/uploads/").pop();
    if (!filename) return;

    const filePath = path.join(__dirname, "../uploads", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✓ Imagen eliminada: ${filename}`);
    }
  } catch (error) {
    console.error("Error al eliminar imagen:", error.message);
  }
};

// Obtener todos los productos
const getProd = async (req, res) => {
  try {
    const prods = await prodModel.getAllProd();
    res.json(prods);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ mensaje: "Error al obtener productos" });
  }
};

// Obtener producto por ID
const getProdById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prodModel.getProdById(id);

    if (!product) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    res.json(product);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({
      mensaje: "Error al obtener producto",
      detalles: error.message,
    });
  }
};

// Buscar productos por nombre
const searchProd = async (req, res) => {
  const { nombre } = req.query;

  if (!nombre) {
    return res.status(400).json({
      mensaje: "Debes proporcionar un nombre para buscar",
    });
  }

  try {
    const products = await prodModel.getProdByName(nombre);
    res.json(products);
  } catch (error) {
    console.error("Error al buscar productos:", error);
    res.status(500).json({
      mensaje: "Error al buscar productos",
      detalles: error.message,
    });
  }
};

// Crear un nuevo producto
const createProd = async (req, res) => {
  const {
    name,
    price,
    description,
    category,
    stock,
    imagePath,
    isFeatured,
    discount,
  } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({
      mensaje: "Faltan campos requeridos (name, price, category)",
    });
  }

  try {
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock) || 0;
    const featured =
      isFeatured === true || isFeatured === "true" || isFeatured === 1;
    const discountNum = parseInt(discount) || 0;

    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        mensaje: "El precio debe ser un número válido mayor o igual a 0",
      });
    }

    const imageUrl = imagePath
      ? `http://localhost:3000/uploads/${imagePath}`
      : null;

    const productId = await prodModel.createProd(
      name,
      priceNum,
      description || null,
      category,
      stockNum,
      imageUrl,
      featured,
      discountNum
    );

    res.status(201).json({
      mensaje: "Producto creado correctamente",
      id: productId,
      producto: {
        id: productId,
        name,
        price: priceNum,
        description,
        category,
        stock: stockNum,
        image: imageUrl,
        isFeatured: featured,
        discount: discountNum,
      },
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({
      mensaje: "Error al crear producto",
      detalles: error.message,
    });
  }
};

// Actualizar un producto
const updateProd = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    price,
    description,
    category,
    stock,
    imagePath,
    isFeatured,
    discount,
  } = req.body;

  if (!name || !price || !category) {
    return res.status(400).json({
      mensaje: "Faltan campos requeridos (name, price, category)",
    });
  }

  try {
    // Verificar si el producto existe
    const existingProduct = await prodModel.getProdById(id);
    if (!existingProduct) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock) || 0;
    const featured =
      isFeatured === true ||
      isFeatured === "true" ||
      isFeatured === 1 ||
      isFeatured === "1";
    const discountNum =
      discount !== undefined && discount !== null ? parseInt(discount) : null;

    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        mensaje: "El precio debe ser un número válido mayor o igual a 0",
      });
    }

    // Si hay nueva imagen, eliminar la anterior y construir nueva URL
    let imageUrl;
    if (imagePath) {
      // Eliminar imagen anterior si existe
      if (existingProduct.image) {
        deleteImageFile(existingProduct.image);
      }
      imageUrl = `http://localhost:3000/uploads/${imagePath}`;
    } else {
      // Mantener la imagen actual
      imageUrl = existingProduct.image;
    }

    const affectedRows = await prodModel.updateProd(
      id,
      name,
      priceNum,
      description || null,
      category,
      stockNum,
      imageUrl,
      featured,
      discountNum
    );

    if (affectedRows === 0) {
      return res.status(404).json({
        mensaje: "No se pudo actualizar el producto",
      });
    }

    res.json({
      mensaje: "Producto actualizado correctamente",
      producto: {
        id,
        name,
        price: priceNum,
        description,
        category,
        stock: stockNum,
        image: imageUrl,
        isFeatured: featured,
        discount: discountNum !== null ? discountNum : existingProduct.discount,
      },
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({
      mensaje: "Error al actualizar producto",
      detalles: error.message,
    });
  }
};

// Eliminar un producto
const deleteProd = async (req, res) => {
  const { id } = req.params;

  try {
    // Primero obtener el producto para saber su imagen
    const product = await prodModel.getProdById(id);

    if (!product) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    // Eliminar el producto de la base de datos
    const affectedRows = await prodModel.deleteProd(id);

    if (affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Producto no encontrado",
      });
    }

    // Eliminar la imagen del servidor si existe
    if (product.image) {
      deleteImageFile(product.image);
    }

    res.json({
      mensaje: "Producto eliminado correctamente",
      id: id,
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);

    // Verificar si es error de clave foránea (producto con ventas asociadas)
    if (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451) {
      return res.status(409).json({
        mensaje: "No se puede eliminar el producto",
        detalles:
          "Este producto tiene ventas asociadas y no puede ser eliminado para mantener el historial de ventas.",
        codigo: "TIENE_VENTAS",
      });
    }

    res.status(500).json({
      mensaje: "Error al eliminar producto",
      detalles: error.message,
    });
  }
};

// Ruta para registrar una venta (solo usuarios autenticados)
const registerSale = async (req, res) => {
  const { productId, quantity, userId } = req.body;
  if (!productId || !quantity) {
    return res.status(400).json({ message: "Missing required data" });
  }
  try {
    const saleId = await prodModel.registerSale(productId, quantity, userId);
    res
      .status(201)
      .json({ message: "Sale registered successfully", id: saleId });
  } catch (error) {
    console.error("Error registering sale:", error);
    res.status(500).json({ message: "Error registering sale" });
  }
};

// Ruta para obtener ventas por categoría (solo admin)
const getSalesByCategory = async (req, res) => {
  try {
    const sales = await prodModel.getSalesByCategory();
    res.json(sales);
  } catch (error) {
    console.error("Error al obtener ventas por categoría:", error);
    res.status(500).json({ mensaje: "Error al obtener ventas por categoría" });
  }
};

// Ruta para obtener el total de ventas (solo admin)
const getTotalSales = async (req, res) => {
  try {
    const total = await prodModel.getTotalSales();
    res.json(total);
  } catch (error) {
    console.error("Error al obtener el total de ventas:", error);
    res.status(500).json({ mensaje: "Error al obtener el total de ventas" });
  }
};

// Obtener productos más vendidos
const getMostSoldProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await prodModel.getMostSoldProducts(limit);
    res.json(products);
  } catch (error) {
    console.error("Error al obtener productos más vendidos:", error);
    res
      .status(500)
      .json({ mensaje: "Error al obtener productos más vendidos" });
  }
};

// Obtener productos destacados
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const products = await prodModel.getFeaturedProducts(limit);
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error al obtener productos destacados:", error);
    res.status(500).json({
      success: false,
      mensaje: "Error al obtener productos destacados",
    });
  }
};

// Cambiar estado de destacado de un producto
const toggleFeatured = async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;

  try {
    const affectedRows = await prodModel.toggleFeatured(id, isFeatured);

    if (affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, mensaje: "Producto no encontrado" });
    }

    res.json({
      success: true,
      mensaje: isFeatured
        ? "Producto marcado como destacado"
        : "Producto desmarcado como destacado",
    });
  } catch (error) {
    console.error("Error al cambiar estado destacado:", error);
    res
      .status(500)
      .json({ success: false, mensaje: "Error al actualizar producto" });
  }
};

// Obtener reporte de inventario por categoría
const getInventoryByCategory = async (req, res) => {
  try {
    const inventory = await prodModel.getInventoryByCategory();
    res.json(inventory);
  } catch (error) {
    console.error("Error al obtener inventario:", error);
    res.status(500).json({ mensaje: "Error al obtener inventario" });
  }
};

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  getProd,
  getProdById,
  searchProd,
  createProd,
  updateProd,
  deleteProd,
  registerSale,
  getSalesByCategory,
  getTotalSales,
  getMostSoldProducts,
  getFeaturedProducts,
  toggleFeatured,
  getInventoryByCategory,
};
