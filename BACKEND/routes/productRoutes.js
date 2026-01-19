// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/productsController");
const { isAdmin, authenticate } = require("../middlewares/authMiddleware");

// ===== RUTAS =====
// GET all products (acceso público)
router.get("/", getProd);

// GET featured products (acceso público)
router.get("/featured", getFeaturedProducts);

// GET search products by name (acceso público)
router.get("/search", searchProd);

// GET product by ID (acceso público)
router.get("/:id", getProdById);

// POST create new product (solo admin)
router.post("/", isAdmin, createProd);

// PUT update product by ID (solo admin)
router.put("/:id", isAdmin, updateProd);

// PATCH toggle featured status (solo admin)
router.patch("/:id/featured", isAdmin, toggleFeatured);

// DELETE product by ID (solo admin)
router.delete("/:id", isAdmin, deleteProd);

// Ruta para registrar una venta (solo usuarios autenticados)
router.post("/sale", authenticate, registerSale);

// Ruta para obtener ventas por categoría (solo admin)
router.get("/sales/category", isAdmin, getSalesByCategory);

// Ruta para obtener el total de ventas (solo admin)
router.get("/sales/total", isAdmin, getTotalSales);

// Ruta para obtener productos más vendidos (solo admin)
router.get("/sales/most-sold", isAdmin, getMostSoldProducts);

// Ruta para obtener inventario por categoría (solo admin)
router.get("/inventory/category", isAdmin, getInventoryByCategory);

// ===== EXPORTACIÓN DE RUTAS =====
module.exports = router;
