<div align="center">

# 🎵 Rythmo

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**A modern online music store with inventory management, shopping cart and admin dashboard**

</div>

---

## 🎯 About The Project

**Rythmo** is an e-commerce platform designed to sell musical instruments and accessories. Developed with Node.js on the backend and vanilla HTML/CSS/JavaScript on the frontend, it offers a smooth shopping experience with secure authentication, shopping cart, wishlist and payment processing.

### Why Rythmo?

- 🛒 **Intuitive shopping cart** with database persistence
- ❤️ **Wishlist** to save favorite products
- 🔐 **Secure authentication** with hashed passwords (bcrypt)
- 📧 **Contact system** with email sending
- 💳 **Multiple payment methods** (Card, OXXO, Transfer)
- 🎫 **PDF invoice generation**
- 🛡️ **CAPTCHA** anti-bot on forms
- 📊 **Complete admin panel**
- 🌍 **Multi-currency support** and multiple countries

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 👥 Customer Features

- Browse product catalog
- Authentication and registration system
- Shopping cart with persistence
- Personalized wishlist
- Multiple payment options
- Order history
- Password recovery
- PDF invoice generation
- Contact and support system

</td>
<td width="50%">

### 🔧 Admin Features

- Inventory management
- Add/Edit/Delete products
- Discount coupon control
- Subscription management
- Dashboard with statistics
- Order management
- Admin password hashing
- User management

</td>
</tr>
</table>

---

## 📸 Screenshots

### Customer Experience

|                 Home                 |                Catalog                 |                Product Details                |
| :----------------------------------: | :------------------------------------: | :-------------------------------------------: |
| ![Home](screenshots/01-homepage.png) | ![Catalog](screenshots/02-catalog.png) | ![Product](screenshots/03-product-detail.png) |

### Shopping & Checkout

|          Shopping Cart           |                 Checkout                 |                Payment                 |
| :------------------------------: | :--------------------------------------: | :------------------------------------: |
| ![Cart](screenshots/04-cart.png) | ![Checkout](screenshots/05-checkout.png) | ![Payment](screenshots/06-payment.png) |

### Authentication & Admin

|              Login               |          Admin Dashboard           |
| :------------------------------: | :--------------------------------: |
| ![Auth](screenshots/07-auth.png) | ![Admin](screenshots/08-admin.png) |

---

## 🚀 Installation

### Prerequisites

Make sure you have the following installed:

| Requirement | Version | Download                                     |
| ----------- | ------- | -------------------------------------------- |
| Node.js     | 18+     | [Download](https://nodejs.org/en/download/)  |
| MySQL       | 8.0+    | [Download](https://dev.mysql.com/downloads/) |
| Git         | Latest  | [Download](https://git-scm.com/)             |

> 💡 **Tip:** You can use [XAMPP](https://www.apachefriends.org/) or [WAMP](https://www.wampserver.com/) for MySQL.

### Quick Installation

```bash
# Clone the repository
git clone https://github.com/cesarMalanco/Rythmo.git
cd rythmo

# Install backend dependencies
cd BACKEND
npm install

# Create .env file (see configuration section)
cp .env.example .env

# Return to root
cd ..
```

---

## ⚙️ Configuration

### 1. Environment Variables

Create a `.env` file in the `BACKEND` folder:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=rythmo

# JWT Authentication
JWT_SECRET=your_secret_key_here

# Email (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@rythmo.com

# General Configuration
APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@rythmo.com
```

> ⚠️ **Important:** Change `JWT_SECRET` to a secure key. For Gmail, use [app passwords](https://myaccount.google.com/apppasswords).

---

## 🗄️ Database

### Recommended Setup

Your database needs the following tables:

**Main tables:**

- `users` - User information
- `products` - Product catalog
- `cart` - Shopping cart items
- `orders` - Completed orders
- `wishlist` - Saved items
- `coupons` - Discount codes
- `subscriptions` - User subscriptions
- `countries` - Shipping countries
- `captcha_sessions` - CAPTCHA sessions

### Import Database

**Option 1: SQL Script (Recommended)**

If you have a `database.sql` file:

```bash
# From command line
mysql -u root -p rythmo < database/database.sql
```

**Option 2: phpMyAdmin**

1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Create a new database called `rythmo`
3. Select the database
4. Go to "Import" and upload the SQL file

**Option 3: MySQL Workbench**

1. Open MySQL Workbench
2. Connect to your server
3. File → Open SQL Script
4. Open the database file
5. Execute the script

---

## 💻 Running the Project

### Backend

```bash
cd BACKEND

# Development (with nodemon)
npm run dev

# Production
npm start
```

The server will be available at `http://localhost:3000`

### Frontend

```bash
# Open index.html in your browser or use a local server
# Option 1: Live Server (VS Code)
# Right-click index.html → Open with Live Server

# Option 2: Python
python -m http.server 8000

# Option 3: Node.js
npx http-server FRONTEND
```

---

## 🛠️ Tech Stack

<div align="center">

|                                               Technology                                               |      Purpose       | Version |
| :----------------------------------------------------------------------------------------------------: | :----------------: | :-----: |
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | JavaScript Runtime |   18+   |
| ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) | Backend Framework  |  4.18+  |
|    ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)    |      Database      |  8.0+   |
|  ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)  |   Authentication   |    -    |
|                ![Bcrypt](https://img.shields.io/badge/Bcrypt-5A29E4?style=flat-square)                 |   Secure Hashing   |  6.0+   |

</div>

### Main Dependencies

```json
{
  "bcrypt": "^6.0.0", // Secure password hashing
  "cors": "^2.8.5", // CORS middleware
  "dotenv": "^17.2.3", // Environment variables
  "express": "^5.2.1", // Web framework
  "jsonwebtoken": "^9.0.2", // JWT authentication
  "multer": "^2.0.2", // File uploads
  "mysql2": "^3.15.3", // MySQL driver
  "nodemailer": "^7.0.10", // Email sending
  "pdfkit": "^0.15.2", // PDF generation
  "svg-captcha": "^1.4.0", // Anti-bot CAPTCHA
  "validator": "^13.15.23" // Data validation
}
```

---

## 📁 Project Structure

```
rythmo/
│
├── BACKEND/
│   ├── server.js                    # Server entry point
│   ├── hashAdmin.js                 # Password hashing utility
│   ├── package.json                 # Dependencies
│   │
│   ├── config/
│   │   ├── database.js              # MySQL connection pool
│   │   └── email.js                 # Nodemailer configuration
│   │
│   ├── models/
│   │   ├── User.js                  # User model
│   │   ├── Product.js               # Product model
│   │   ├── Order.js                 # Order model
│   │   ├── Cart.js                  # Cart model
│   │   ├── Wishlist.js              # Wishlist model
│   │   ├── Coupon.js                # Coupon model
│   │   ├── Country.js               # Country model
│   │   ├── Subscription.js          # Subscription model
│   │   ├── CaptchaSession.js        # CAPTCHA session model
│   │   └── ...
│   │
│   ├── controllers/
│   │   ├── authController.js        # Authentication logic
│   │   ├── productsController.js    # Product management
│   │   ├── cartController.js        # Cart management
│   │   ├── ordersController.js      # Order management
│   │   ├── checkoutController.js    # Payment processing
│   │   ├── wishlistController.js    # Wishlist management
│   │   └── ...
│   │
│   ├── routes/
│   │   ├── authRoutes.js            # Authentication routes
│   │   ├── productRoutes.js         # Product routes
│   │   ├── cartRoutes.js            # Cart routes
│   │   ├── orderRoutes.js           # Order routes
│   │   └── ...
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.js        # JWT verification
│   │   └── corsMiddleware.js        # CORS configuration
│   │
│   ├── services/
│   │   └── captchaService.js        # CAPTCHA service
│   │
│   ├── uploads/
│   │   └── invoices/                # PDF invoices folder
│   │
│   └── .env.example                 # Environment variables example
│
├── FRONTEND/
│   ├── PAGES/
│   │   ├── index.html               # Home page
│   │   ├── catalogo.html            # Product catalog
│   │   ├── cart.html                # Shopping cart
│   │   ├── checkout.html            # Checkout page
│   │   ├── login.html               # Login page
│   │   ├── register.html            # Register page
│   │   ├── contact.html             # Contact form
│   │   ├── paymentCard.html         # Card payment
│   │   ├── paymentOXXO.html         # OXXO payment
│   │   ├── transfer.html            # Transfer payment
│   │   ├── adminDashboard.html      # Admin panel
│   │   ├── address.html             # Address management
│   │   ├── wishlist.html            # Wishlist
│   │   ├── faq.html                 # FAQ
│   │   ├── nosotros.html            # About us
│   │   ├── resetpassword.html       # Password recovery
│   │   └── ...
│   │
│   ├── CSS/
│   │   ├── indexStyles.css
│   │   ├── catalogoStyles.css
│   │   ├── cartStyles.css
│   │   ├── loginStyles.css
│   │   ├── adminStyles.css
│   │   └── ...
│   │
│   ├── JS/
│   │   ├── acces_script.js          # General authentication
│   │   ├── login_script.js          # Login logic
│   │   ├── cart_script.js           # Cart management
│   │   ├── checkout_script.js       # Checkout logic
│   │   ├── admin_script.js          # Admin panel
│   │   ├── currencyUtils.js         # Currency utilities
│   │   └── ...
│   │
│   └── IMAGES/
│       └── (Product images)
│
└── README.md
```

---

## 🔐 Authentication

### Register

```javascript
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MyPassword123",
  "name": "John Doe"
}
```

### Login

```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MyPassword123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Using the Token

```javascript
// Send in headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📞 Contact & Support

The system includes a contact form that sends emails directly to your inbox. Make sure to configure the email variables correctly in `.env`.

---

## 🐛 Troubleshooting

### Problem: "Database connection error"

**Solution:**

- Verify that MySQL is running
- Check credentials in `.env`
- Ensure the database `rythmo` exists

### Problem: "CORS error"

**Solution:**

- Verify that `corsMiddleware.js` is configured correctly
- Ensure frontend and backend are on correct ports

### Problem: "Invalid JWT"

**Solution:**

- Clear browser localStorage
- Try logging in again
- Verify that `JWT_SECRET` is the same in backend

### Problem: "Emails not sending"

**Solution:**

- Verify Gmail credentials in `.env`
- Use app passwords, not normal password
- Enable less secure app access in Gmail

---

## 📝 Available Scripts

```bash
# Backend
cd BACKEND

npm start          # Run in production
npm run dev        # Run with nodemon (development)

# Frontend
npm start          # If configured
```

---

## 🚀 Deployment

### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-rythmo

# Set environment variables
heroku config:set DB_HOST=your-host
heroku config:set DB_USER=your-user
# ... etc

# Deploy
git push heroku main
```

### Railway, Vercel, or similar

Check the platform's documentation to deploy Node.js applications.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- [Danna Castro](https://github.com/dannaCas) - Lead Developer
- [Isabel Alvarado](https://github.com/isabelAlvarado) - Frontend Designer
- [César Malanco](https://github.com/cesarMalanco) - Backend Developer
- [Fernanda Uribe](https://github.com/cfervela) - Project Manager

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [MySQL](https://www.mysql.com/)
- [JWT](https://jwt.io/)
- [Bcrypt](https://www.npmjs.com/package/bcrypt)

---

<sub>Built with ❤️ using Node.js and JavaScript</sub>

</div>
