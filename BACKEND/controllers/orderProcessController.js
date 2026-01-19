// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Country = require("../models/Country");
const { User } = require("../models/User");
const transporter = require("../config/email");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ===== FUNCIONES =====
// Procesar orden completa
async function processOrder(req, res) {
  try {
    const userId = req.user.id;
    const {
      // Datos de los items
      items,
      // Datos de pago
      paymentMethod,
      paymentDetails,
      // Totales ya calculados desde frontend
      subtotal,
      tax,
      taxName,
      shipping,
      shippingType,
      discount,
      couponCode,
      giftWrap,
      total,
      country,
      currencyCode,
      currencySymbol,
      // Datos de envío opcionales (se usarán del usuario si no vienen)
      shippingName,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      shippingPhone,
      notes,
    } = req.body;

    // Validar método de pago
    if (!paymentMethod) {
      return res
        .status(400)
        .json({ success: false, message: "Método de pago requerido" });
    }

    // Obtener datos del usuario por ID
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Usuario no encontrado" });
    }

    // Usar items del request o del carrito en BD
    let cartItems = items;
    if (!cartItems || cartItems.length === 0) {
      cartItems = await Cart.getCartByUserId(userId);
    }

    if (!cartItems || cartItems.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "El carrito está vacío" });
    }

    // Formatear items para almacenamiento
    const formattedItems = cartItems.map((item) => ({
      productId: item.id || item.productId,
      name: item.name,
      price: parseFloat(item.price),
      quantity: item.quantity,
      image: item.image,
    }));

    // Verificar stock de todos los productos
    for (const item of formattedItems) {
      const product = await Product.getProdById(item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Producto ${item.name} ya no está disponible`,
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${item.name}. Disponible: ${product.stock}`,
        });
      }
    }

    // Usar los totales calculados del frontend o recalcular
    const finalSubtotal =
      subtotal ||
      formattedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const finalTax = tax || finalSubtotal * 0.16;
    const finalShipping = shipping || 0;
    const finalDiscount = discount || 0;
    const finalTotal =
      total || finalSubtotal + finalTax + finalShipping - finalDiscount;

    // Crear la orden en la base de datos
    const orderData = {
      userId,
      products: formattedItems,
      subtotal: finalSubtotal,
      taxAmount: finalTax,
      shippingCost: finalShipping,
      discount: finalDiscount,
      couponCode: couponCode || null,
      giftWrap: giftWrap || false,
      giftWrapCost: giftWrap ? 20 : 0,
      total: finalTotal,
      status: paymentMethod === "card" ? "pagado" : "pendiente",
      shippingName: shippingName || user.name,
      shippingAddress: shippingAddress || "Por definir",
      shippingCity: shippingCity || "Por definir",
      shippingPostalCode: shippingPostalCode || "00000",
      shippingPhone: shippingPhone || user.phone || "Sin teléfono",
      shippingCountry: country || "MX",
      paymentMethod,
      paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
      notes: notes || null,
      currencyCode: currencyCode || "MXN",
      currencySymbol: currencySymbol || "$",
    };

    const orderId = await createCompleteOrder(orderData);

    // Decrementar stock de productos
    for (const item of formattedItems) {
      await decrementStock(item.productId, item.quantity);
      // Registrar venta
      await Product.registerSale(item.productId, item.quantity, userId);
    }

    // Registrar uso del cupón si aplica
    if (couponCode) {
      try {
        const couponInfo = await Coupon.findByCode(couponCode);
        if (couponInfo) {
          await Coupon.registerUsage(couponInfo.id, userId, orderId);
        }
      } catch (e) {
        console.log("Error registrando uso de cupón:", e.message);
      }
    }

    // Generar PDF de la nota de compra
    let pdfPath = null;
    try {
      pdfPath = await generateInvoicePDF(
        orderId,
        orderData,
        formattedItems,
        user
      );
      // Actualizar orden con la ruta del PDF
      await updateOrderPdfPath(orderId, pdfPath);
    } catch (e) {
      console.error("Error generando PDF:", e.message);
    }

    // Enviar email con la nota de compra
    try {
      await sendOrderConfirmationEmail(
        user,
        orderId,
        orderData,
        formattedItems,
        pdfPath
      );
    } catch (e) {
      console.error("Error enviando email:", e.message);
    }

    // Vaciar carrito en BD
    try {
      await Cart.clearCart(userId);
    } catch (e) {
      console.log("Error limpiando carrito BD:", e.message);
    }

    res.json({
      success: true,
      message: "¡Compra finalizada! La nota se envió a tu correo electrónico",
      orderId: orderId,
      total: finalTotal,
      currency: orderData.currencyCode,
      currencySymbol: orderData.currencySymbol,
    });
  } catch (error) {
    console.error("Error al procesar orden:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar la orden",
      error: error.message,
    });
  }
}

// Crear orden completa en BD
async function createCompleteOrder(orderData) {
  const pool = require("../config/database");

  const [result] = await pool.query(
    `INSERT INTO orders (
      userId, products, total, status, date,
      shippingName, shippingAddress, shippingCity, shippingPostalCode, 
      shippingPhone, shippingCountry, paymentMethod, subtotal, taxAmount,
      shippingCost, discount, couponCode, giftWrap, giftWrapCost, notes
    ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderData.userId,
      JSON.stringify(orderData.products),
      orderData.total,
      orderData.status,
      orderData.shippingName,
      orderData.shippingAddress,
      orderData.shippingCity,
      orderData.shippingPostalCode,
      orderData.shippingPhone,
      orderData.shippingCountry,
      orderData.paymentMethod,
      orderData.subtotal,
      orderData.taxAmount,
      orderData.shippingCost,
      orderData.discount,
      orderData.couponCode,
      orderData.giftWrap ? 1 : 0,
      orderData.giftWrapCost,
      orderData.notes,
    ]
  );

  return result.insertId;
}

// Decrementar stock
async function decrementStock(productId, quantity) {
  const pool = require("../config/database");
  await pool.query(
    "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
    [quantity, productId, quantity]
  );
}

// Actualizar ruta del PDF en la orden
async function updateOrderPdfPath(orderId, pdfPath) {
  const pool = require("../config/database");
  await pool.query("UPDATE orders SET pdfPath = ? WHERE id = ?", [
    pdfPath,
    orderId,
  ]);
}

// Generar PDF de nota de compra
async function generateInvoicePDF(orderId, orderData, items, user) {
  return new Promise((resolve, reject) => {
    try {
      const uploadsDir = path.join(__dirname, "../uploads/invoices");

      // Crear directorio si no existe
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `invoice_${orderId}_${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      const doc = new PDFDocument({ margin: 40, size: "LETTER" });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Colores de la marca
      const primaryColor = "#8B5E3C";
      const darkColor = "#2B1E14";

      // Configuración de moneda
      const currencyCode = orderData.currencyCode || "MXN";
      const currencySymbol = orderData.currencySymbol || "$";

      // Función helper para convertir precio
      const convertPrice = (amountInMXN) => {
        return Country.convertPrice(amountInMXN, currencyCode);
      };

      // ===== HEADER COMPACTO =====
      doc.fontSize(24).fillColor(primaryColor).text("Rythmo", 40, 30);
      doc.fontSize(8).fillColor("#666").text("WE BELIEVE IN MUSIC", 40, 55);

      // Info empresa (derecha)
      const contactEmail = process.env.EMAIL_USER || "contacto@rythmo.com";
      doc
        .fontSize(8)
        .fillColor("#666")
        .text(`${contactEmail}`, 400, 35, { align: "right" })
        .text("www.rythmo.com", 400, 45, { align: "right" });

      // Línea separadora
      doc
        .moveTo(40, 70)
        .lineTo(570, 70)
        .strokeColor(primaryColor)
        .lineWidth(1)
        .stroke();

      // ===== TÍTULO Y DATOS DE ORDEN =====
      doc
        .fontSize(16)
        .fillColor(darkColor)
        .text("NOTA DE COMPRA", 40, 80, { align: "center" });

      doc.fontSize(9).fillColor("#333");
      doc.text(`Orden #${orderId}`, 40, 105);
      doc.text(
        `Fecha: ${new Date().toLocaleDateString("es-MX", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })} a las ${new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}`,
        200,
        105
      );
      doc.text(
        `Método: ${getPaymentMethodName(orderData.paymentMethod)}`,
        400,
        105
      );

      // ===== CLIENTE Y ENVÍO EN LÍNEA =====
      let yPos = 125;

      // Caja cliente
      doc.fillColor("#f9f6f2").rect(40, yPos, 250, 55).fill();
      doc
        .fontSize(9)
        .fillColor(primaryColor)
        .text("Cliente", 50, yPos + 5);
      doc.fontSize(8).fillColor("#333");
      doc.text(`${user.name}`, 50, yPos + 18);
      doc.text(`${user.email}`, 50, yPos + 30);

      // Caja envío
      doc.fillColor("#f9f6f2").rect(310, yPos, 250, 55).fill();
      doc
        .fontSize(9)
        .fillColor(primaryColor)
        .text("Dirección de Envío", 320, yPos + 5);
      doc.fontSize(8).fillColor("#333");
      doc.text(`${orderData.shippingName}`, 320, yPos + 18, { width: 230 });
      doc.text(`${orderData.shippingAddress}`, 320, yPos + 30, { width: 230 });
      doc.text(
        `${orderData.shippingCity}, ${orderData.shippingPostalCode} | Tel: ${orderData.shippingPhone}`,
        320,
        yPos + 42,
        { width: 230 }
      );

      // ===== TABLA DE PRODUCTOS =====
      yPos = 195;

      // Encabezado de tabla
      doc.fillColor(primaryColor).rect(40, yPos, 520, 18).fill();
      doc.fillColor("#fff").fontSize(8);
      doc.text("Producto", 50, yPos + 5);
      doc.text("Cant.", 340, yPos + 5);
      doc.text("Precio", 400, yPos + 5);
      doc.text("Subtotal", 480, yPos + 5);

      yPos += 22;

      // Productos (más compactos)
      const maxItems = Math.min(items.length, 10); // Limitar a 10 items para caber en página
      for (let i = 0; i < maxItems; i++) {
        const item = items[i];
        const convertedPrice = convertPrice(item.price);
        const convertedSubtotal = convertPrice(item.price * item.quantity);

        // Alternar color de fondo
        if (i % 2 === 0) {
          doc
            .fillColor("#fafafa")
            .rect(40, yPos - 3, 520, 16)
            .fill();
        }

        doc.fillColor("#333").fontSize(8);
        doc.text(item.name.substring(0, 40), 50, yPos);
        doc.text(item.quantity.toString(), 350, yPos);
        doc.text(`${currencySymbol}${convertedPrice.toFixed(2)}`, 400, yPos);
        doc.text(`${currencySymbol}${convertedSubtotal.toFixed(2)}`, 480, yPos);

        yPos += 16;
      }

      // Si hay más items, mostrar indicador
      if (items.length > 10) {
        doc
          .fontSize(7)
          .fillColor("#666")
          .text(`... y ${items.length - 10} producto(s) más`, 50, yPos);
        yPos += 12;
      }

      // Línea separadora
      doc
        .moveTo(40, yPos + 5)
        .lineTo(560, yPos + 5)
        .strokeColor("#ddd")
        .lineWidth(0.5)
        .stroke();

      // ===== TOTALES (compactos, a la derecha) =====
      yPos += 15;
      const totalsX = 380;
      const valuesX = 480;
      doc.fontSize(9).fillColor("#333");

      // Subtotal
      doc.text("Subtotal:", totalsX, yPos);
      doc.text(
        `${currencySymbol}${convertPrice(orderData.subtotal).toFixed(2)}`,
        valuesX,
        yPos
      );
      yPos += 14;

      // Impuestos
      doc.text("Impuestos:", totalsX, yPos);
      doc.text(
        `${currencySymbol}${convertPrice(orderData.taxAmount).toFixed(2)}`,
        valuesX,
        yPos
      );
      yPos += 14;

      // Envío
      doc.text("Envío:", totalsX, yPos);
      doc.text(
        orderData.shippingCost === 0
          ? "Gratis"
          : `${currencySymbol}${convertPrice(orderData.shippingCost).toFixed(
              2
            )}`,
        valuesX,
        yPos
      );
      yPos += 14;

      // Envoltura (si aplica)
      if (orderData.giftWrap) {
        doc.text("Envoltura:", totalsX, yPos);
        doc.text(
          `${currencySymbol}${convertPrice(orderData.giftWrapCost).toFixed(2)}`,
          valuesX,
          yPos
        );
        yPos += 14;
      }

      // Descuento (si aplica)
      if (orderData.discount > 0) {
        doc.fillColor("#4CAF50").text("Descuento:", totalsX, yPos);
        doc.text(
          `-${currencySymbol}${convertPrice(orderData.discount).toFixed(2)}`,
          valuesX,
          yPos
        );
        yPos += 14;
      }

      // Línea antes del total
      doc
        .moveTo(totalsX, yPos)
        .lineTo(560, yPos)
        .strokeColor(primaryColor)
        .lineWidth(1)
        .stroke();
      yPos += 8;

      // Total grande
      doc.fontSize(12).fillColor(primaryColor);
      doc.text("TOTAL:", totalsX, yPos);
      doc.text(
        `${currencySymbol}${convertPrice(orderData.total).toFixed(
          2
        )} ${currencyCode}`,
        valuesX,
        yPos
      );

      // ===== FOOTER =====
      doc
        .fontSize(10)
        .fillColor(primaryColor)
        .text("¡Gracias por tu compra!", 40, 710, { align: "center" });
      doc
        .fontSize(7)
        .fillColor("#666")
        .text(
          "www.rythmo.com | Tu tienda de música de confianza desde 1975",
          40,
          725,
          { align: "center" }
        );

      doc.end();

      stream.on("finish", () => {
        resolve(`/uploads/invoices/${fileName}`);
      });

      stream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Obtener nombre del método de pago
function getPaymentMethodName(method) {
  const methods = {
    card: "Tarjeta de crédito/débito",
    transfer: "Transferencia bancaria",
    oxxo: "Pago en OXXO",
  };
  return methods[method] || method;
}

// Enviar email de confirmación con PDF
async function sendOrderConfirmationEmail(
  user,
  orderId,
  orderData,
  items,
  pdfPath
) {
  const fullPdfPath = path.join(__dirname, "..", pdfPath);
  const logoPath = path.join(__dirname, "../../FRONTEND/IMAGES/logo.png");

  // Convertir valores de MXN a la moneda del usuario
  const currencyCode = orderData.currencyCode || "MXN";
  const currencySymbol = orderData.currencySymbol || "$";

  // Función helper para convertir y formatear
  const convertAndFormat = (amountInMXN) => {
    const converted = Country.convertPrice(amountInMXN, currencyCode);
    return converted.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Convertir totales
  const convertedSubtotal = convertAndFormat(orderData.subtotal);
  const convertedTax = convertAndFormat(orderData.taxAmount);
  const convertedShipping = convertAndFormat(orderData.shippingCost);
  const convertedDiscount = convertAndFormat(orderData.discount);
  const convertedTotal = convertAndFormat(orderData.total);

  const itemsHtml = items
    .map((item) => {
      const convertedPrice = Country.convertPrice(item.price, currencyCode);
      const convertedItemSubtotal = Country.convertPrice(
        item.price * item.quantity,
        currencyCode
      );
      return `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${
        item.name
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${
        item.quantity
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${currencySymbol}${convertedPrice.toFixed(
        2
      )} ${currencyCode}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${currencySymbol}${convertedItemSubtotal.toFixed(
        2
      )} ${currencyCode}</td>
    </tr>
  `;
    })
    .join("");

  const mailOptions = {
    from: `"Rythmo Music Store" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `🎵 Confirmación de tu pedido #${orderId} - Rythmo`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f0e8;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #8B5E3C 0%, #6B4423 100%); padding: 30px; text-align: center;">
            <img src="cid:rythmologo" alt="Rythmo Logo" style="width: 80px; height: 80px; margin-bottom: 15px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Rythmo</h1>
            <p style="color: #f5e6d3; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 2px;">WE BELIEVE IN MUSIC</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 50px;">✅</div>
              <h2 style="color: #4CAF50; margin: 10px 0;">¡Compra Finalizada!</h2>
              <p style="color: #666;">Tu pedido ha sido procesado exitosamente</p>
            </div>
            
            <div style="background-color: #f9f6f2; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <p style="margin: 0;"><strong>Número de orden:</strong> #${orderId}</p>
              <p style="margin: 10px 0 0 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString(
                "es-MX",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )} a las ${new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // 24 horas
    })}</p>
            </div>
            
            <h3 style="color: #8B5E3C; border-bottom: 2px solid #8B5E3C; padding-bottom: 10px;">Resumen de tu pedido</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #8B5E3C; color: white;">
                  <th style="padding: 10px; text-align: left;">Producto</th>
                  <th style="padding: 10px; text-align: center;">Cant.</th>
                  <th style="padding: 10px; text-align: right;">Precio</th>
                  <th style="padding: 10px; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="text-align: right; padding: 15px; background-color: #f9f6f2; border-radius: 10px;">
              <p style="margin: 5px 0;"><strong>Subtotal:</strong> ${currencySymbol}${convertedSubtotal} ${currencyCode}</p>
              <p style="margin: 5px 0;"><strong>Impuestos:</strong> ${currencySymbol}${convertedTax} ${currencyCode}</p>
              <p style="margin: 5px 0;"><strong>Envío:</strong> ${
                orderData.shippingCost === 0
                  ? "Gratis"
                  : currencySymbol + convertedShipping + " " + currencyCode
              }</p>
              ${
                orderData.giftWrap
                  ? `<p style="margin: 5px 0;"><strong>Envoltura de regalo:</strong> ${currencySymbol}${convertAndFormat(
                      orderData.giftWrapCost
                    )} ${currencyCode}</p>`
                  : ""
              }
              ${
                orderData.discount > 0
                  ? `<p style="margin: 5px 0; color: #4CAF50;"><strong>Descuento:</strong> -${currencySymbol}${convertedDiscount} ${currencyCode}</p>`
                  : ""
              }
              <p style="margin: 15px 0 0 0; font-size: 20px; color: #8B5E3C;"><strong>Total: ${currencySymbol}${convertedTotal} ${currencyCode}</strong></p>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h4 style="margin: 0 0 10px 0; color: #8B5E3C;">Dirección de envío</h4>
              <p style="margin: 0; color: #666;">
                ${orderData.shippingName}<br>
                ${orderData.shippingAddress}<br>
                ${orderData.shippingCity}, ${orderData.shippingPostalCode}<br>
                Tel: ${orderData.shippingPhone}
              </p>
            </div>
            
            <p style="text-align: center; margin-top: 30px; color: #666;">
              📎 Adjuntamos tu nota de compra en formato PDF
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #2B1E14; padding: 20px; text-align: center;">
            <p style="color: #8B5E3C; margin: 0;">Rythmo Music Store</p>
            <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">Tu tienda de música de confianza desde 1975</p>
          </div>
          
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `Nota_Rythmo_${orderId}.pdf`,
        path: fullPdfPath,
      },
      {
        filename: "logo.png",
        path: logoPath,
        cid: "rythmologo",
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  console.log("Email de confirmación enviado a:", user.email);
}

// Obtener órdenes del usuario
async function getUserOrders(req, res) {
  try {
    const userId = req.user.id;
    const pool = require("../config/database");

    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE userId = ? ORDER BY date DESC",
      [userId]
    );

    // Parsear productos JSON
    const parsedOrders = orders.map((order) => ({
      ...order,
      products: JSON.parse(order.products || "[]"),
    }));

    res.json({
      success: true,
      orders: parsedOrders,
    });
  } catch (error) {
    console.error("Error al obtener órdenes:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener órdenes",
      error: error.message,
    });
  }
}

// ===== EXPORTACIÓN DE MÓDULOS =====
module.exports = {
  processOrder,
  getUserOrders,
};
