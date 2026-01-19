-- =====================================================
-- DATABASE FOR RYTHMO - MUSIC STORE
-- =====================================================
-- Script to create the database structure
-- Compatible with MySQL 8.0+

-- Create the database
CREATE DATABASE IF NOT EXISTS rythmo;
USE rythmo;

-- ===== TABLE: USERS =====
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    isAdmin TINYINT DEFAULT 0,
    profileImage VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_isAdmin (isAdmin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: PRODUCTS =====
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description LONGTEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50),
    stock INT DEFAULT 0,
    image VARCHAR(255),
    isFeatured TINYINT DEFAULT 0,
    discount DECIMAL(5, 2) DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    views INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_isFeatured (isFeatured),
    FULLTEXT INDEX ft_name_description (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: CART =====
CREATE TABLE IF NOT EXISTS cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    productId INT NOT NULL,
    quantity INT DEFAULT 1,
    addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (userId, productId),
    INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: WISHLIST =====
CREATE TABLE IF NOT EXISTS wishlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    productId INT NOT NULL,
    addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (userId, productId),
    INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: COUNTRIES =====
CREATE TABLE IF NOT EXISTS countries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(2) NOT NULL UNIQUE,
    shippingCost DECIMAL(8, 2) DEFAULT 0,
    isActive TINYINT DEFAULT 1,
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: ORDERS =====
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    orderNumber VARCHAR(50) UNIQUE NOT NULL,
    totalAmount DECIMAL(12, 2) NOT NULL,
    shippingCost DECIMAL(8, 2) DEFAULT 0,
    discount DECIMAL(8, 2) DEFAULT 0,
    finalAmount DECIMAL(12, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    paymentMethod VARCHAR(50) NOT NULL,
    paymentStatus ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    shippingAddress VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zipCode VARCHAR(20),
    notes TEXT,
    invoicePath VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_createdAt (createdAt),
    INDEX idx_orderNumber (orderNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: ORDER DETAILS =====
CREATE TABLE IF NOT EXISTS orderDetails (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orderId INT NOT NULL,
    productId INT NOT NULL,
    productName VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id),
    INDEX idx_orderId (orderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: COUPONS =====
CREATE TABLE IF NOT EXISTS coupons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    discountType ENUM('percentage', 'fixed') DEFAULT 'percentage',
    discountValue DECIMAL(8, 2) NOT NULL,
    maxUses INT,
    currentUses INT DEFAULT 0,
    minPurchase DECIMAL(10, 2) DEFAULT 0,
    maxDiscount DECIMAL(10, 2),
    expiryDate DATE,
    isActive TINYINT DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy INT,
    INDEX idx_code (code),
    INDEX idx_isActive (isActive),
    INDEX idx_expiryDate (expiryDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('active', 'inactive', 'unsubscribed') DEFAULT 'active',
    subscribedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribedAt TIMESTAMP NULL,
    preferredCategory VARCHAR(50),
    notificationFrequency ENUM('weekly', 'monthly', 'never') DEFAULT 'weekly',
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: CAPTCHA SESSIONS =====
CREATE TABLE IF NOT EXISTS captcha_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sessionId VARCHAR(255) UNIQUE NOT NULL,
    captchaText VARCHAR(255) NOT NULL,
    attempts INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiresAt TIMESTAMP,
    INDEX idx_sessionId (sessionId),
    INDEX idx_expiresAt (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: CONTACT MESSAGES =====
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(200) NOT NULL,
    message LONGTEXT NOT NULL,
    status ENUM('new', 'read', 'responded') DEFAULT 'new',
    response TEXT,
    respondedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== TABLE: AUDIT LOG (OPTIONAL) =====
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT,
    action VARCHAR(100) NOT NULL,
    entityType VARCHAR(50),
    entityId INT,
    oldValues JSON,
    newValues JSON,
    ipAddress VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_userId (userId),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insertar usuario administrador
INSERT INTO users (email, password, firstName, lastName, isAdmin, createdAt) VALUES
('admin@rythmo.com', '$2b$10$YourHashedPasswordHere', 'Admin', 'User', 1, NOW());

-- Insertar usuario de prueba
INSERT INTO users (email, password, firstName, lastName, createdAt) VALUES
('usuario@example.com', '$2b$10$YourHashedPasswordHere', 'Juan', 'Pérez', NOW());

-- Insertar categorías de ejemplo (países)
INSERT INTO countries (name, code, shippingCost, isActive) VALUES
('México', 'MX', 50.00, 1),
('Estados Unidos', 'US', 100.00, 1),
('Colombia', 'CO', 75.00, 1),
('Argentina', 'AR', 80.00, 1),
('Spain', 'ES', 120.00, 1);

-- Insert sample products
INSERT INTO products (name, description, price, category, stock, isFeatured, discount) VALUES
('Premium Acoustic Guitar', 'Acoustic guitar with 6 crystal clear strings', 450.00, 'Guitars', 15, 1, 10),
('88-Key Keyboard', 'Professional MIDI keyboard with 88 weighted keys', 800.00, 'Keyboards', 8, 1, 0),
('Electronic Drums', 'Complete electronic drum set with headphones', 600.00, 'Drums', 5, 0, 15),
('USB Condenser Microphone', 'Professional USB microphone for streaming and recording', 120.00, 'Microphones', 20, 0, 0),
('100W Guitar Amplifier', 'Professional 100W amplifier with multiple effects', 350.00, 'Amplifiers', 10, 1, 5);

-- Create sample coupon
INSERT INTO coupons (code, discountType, discountValue, maxUses, expiryDate, isActive) VALUES
('DISCOUNT10', 'percentage', 10, 100, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 1),
('NEW50', 'fixed', 50, 50, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 1);

-- =====================================================
-- USEFUL VIEWS (OPTIONAL)
-- =====================================================

-- View: Products with low stock
CREATE OR REPLACE VIEW v_low_stock AS
SELECT id, name, stock, price
FROM products
WHERE stock < 10
ORDER BY stock ASC;

-- View: Recent orders
CREATE OR REPLACE VIEW v_recent_orders AS
SELECT 
    o.id,
    o.orderNumber,
    u.firstName,
    u.email,
    o.totalAmount,
    o.status,
    o.createdAt
FROM orders o
LEFT JOIN users u ON o.userId = u.id
ORDER BY o.createdAt DESC
LIMIT 50;

-- View: Best-selling products
CREATE OR REPLACE VIEW v_best_sellers AS
SELECT 
    p.id,
    p.name,
    p.price,
    COUNT(od.id) as sales_count,
    SUM(od.quantity) as total_quantity_sold,
    SUM(od.subtotal) as total_revenue
FROM products p
LEFT JOIN orderDetails od ON p.id = od.productId
GROUP BY p.id
ORDER BY total_revenue DESC;

-- =====================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================

ALTER TABLE orders ADD INDEX idx_paymentStatus (paymentStatus);
ALTER TABLE orderDetails ADD INDEX idx_productId (productId);
ALTER TABLE products ADD INDEX idx_price (price);
ALTER TABLE products ADD INDEX idx_stock (stock);

-- ===== END OF SCRIPT =====
