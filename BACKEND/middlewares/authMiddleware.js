// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const jwt = require("jsonwebtoken");

// ===== FUNCIONES =====
// Middleware de autenticación normal
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

// Alias para authenticate (verifyToken)
function verifyToken(req, res, next) {
  return authenticate(req, res, next);
}

// Middleware de autenticación opcional (no falla si no hay token)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }
  next();
}

// Middleware para verificar si el usuario es admin
function isAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Acceso solo para administradores" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  authenticate,
  verifyToken,
  optionalAuth,
  isAdmin,
};
