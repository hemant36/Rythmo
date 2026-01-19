// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const pool = require("../config/database");

// ===== FUNCIONES =====
async function getAllProd() {
  const [rows] = await pool.query("SELECT * FROM products");
  return rows;
}

async function getProdById(id) {
  const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
  return rows[0];
}

async function getProdByName(name) {
  const [rows] = await pool.query("SELECT * FROM products WHERE name LIKE ?", [
    `%${name}%`,
  ]);
  return rows;
}

async function createProd(
  name,
  price,
  description,
  category,
  stock,
  image,
  isFeatured = false,
  discount = 0
) {
  const [result] = await pool.query(
    "INSERT INTO products (name, price, description, category, stock, image, isFeatured, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      name,
      price,
      description,
      category,
      stock,
      image,
      isFeatured ? 1 : 0,
      discount || 0,
    ]
  );
  return result.insertId;
}

async function updateProd(
  id,
  name,
  price,
  description,
  category,
  stock,
  image,
  isFeatured = null,
  discount = null
) {
  // Si no se proporciona una nueva imagen, mantener la actual
  let query =
    "UPDATE products SET name = ?, price = ?, description = ?, category = ?, stock = ?";
  let params = [name, price, description, category, stock];

  if (image) {
    query += ", image = ?";
    params.push(image);
  }

  if (isFeatured !== null) {
    query += ", isFeatured = ?";
    params.push(isFeatured ? 1 : 0);
  }

  if (discount !== null) {
    query += ", discount = ?";
    params.push(discount);
  }

  query += " WHERE id = ?";
  params.push(id);

  const [result] = await pool.query(query, params);
  return result.affectedRows;
}

async function deleteProd(id) {
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows;
}

// Registrar una venta
async function registerSale(productId, quantity, userId = null) {
  const [result] = await pool.query(
    "INSERT INTO sales (productId, quantity, userId, date) VALUES (?, ?, ?, NOW())",
    [productId, quantity, userId]
  );
  return result.insertId;
}

// Obtener ventas agrupadas por categoría
async function getSalesByCategory() {
  const [rows] = await pool.query(`
    SELECT p.category, SUM(v.quantity * p.price) AS total_sales
    FROM sales v
    JOIN products p ON v.productId = p.id
    GROUP BY p.category
  `);
  return rows;
}

// Obtener el total de ventas de la empresa
async function getTotalSales() {
  const [rows] = await pool.query(`
    SELECT SUM(v.quantity * p.price) AS total_sales
    FROM sales v
    JOIN products p ON v.productId = p.id
  `);
  return { total_sales: rows[0].total_sales || 0 };
}

// Obtener productos más vendidos
async function getMostSoldProducts(limit = 10) {
  const [rows] = await pool.query(
    `
    SELECT p.name, SUM(v.quantity) AS quantity
    FROM sales v
    JOIN products p ON v.productId = p.id
    GROUP BY p.id, p.name
    ORDER BY quantity DESC
    LIMIT ?
  `,
    [limit]
  );
  return rows;
}

// Obtener productos destacados
async function getFeaturedProducts(limit = 4) {
  const [rows] = await pool.query(
    "SELECT * FROM products WHERE isFeatured = 1 LIMIT ?",
    [limit]
  );
  return rows;
}

// Actualizar solo el estado de destacado
async function toggleFeatured(id, isFeatured) {
  const [result] = await pool.query(
    "UPDATE products SET isFeatured = ? WHERE id = ?",
    [isFeatured ? 1 : 0, id]
  );
  return result.affectedRows;
}

// Obtener inventario (existencias) por producto en las tres categorías
async function getInventoryByCategory() {
  const [rows] = await pool.query(`
    SELECT id, name, category, stock, price
    FROM products
    ORDER BY category, name
  `);
  return rows;
}

// ===== EXPORTACIÓN DEL MODELO =====
module.exports = {
  getAllProd,
  getProdById,
  getProdByName,
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
