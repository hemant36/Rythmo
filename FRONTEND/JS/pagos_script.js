// /FRONTEND/JS/pagos_script.js

// ===== CONFIGURACIÓN DE API =====
const API_BASE_URL = "http://localhost:3000/api";

// ===== UTILIDADES DE AUTENTICACIÓN =====
function getAuthToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function isLoggedIn() {
  return !!getAuthToken();
}

function getCurrentUserEmail() {
  return (
    localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser")
  );
}

// ===== CARGAR DATOS DEL CHECKOUT =====
function getCheckoutData() {
  const data = localStorage.getItem("checkoutData");
  if (data) {
    return JSON.parse(data);
  }
  return null;
}

// ===== MOSTRAR RESUMEN EN PÁGINAS DE PAGO =====
async function displayOrderSummary() {
  const checkoutData = getCheckoutData();
  if (!checkoutData) return;

  // Cargar currency del usuario primero
  if (typeof loadUserCurrency === "function") {
    await loadUserCurrency();
  }

  // Obtener currency del usuario
  const userCurrency =
    typeof getUserCurrency === "function"
      ? getUserCurrency()
      : { code: "MXN", symbol: "$" };

  // Helper para formatear en la currency del usuario
  const fmtPrice = (amount) =>
    typeof formatPrice === "function"
      ? formatPrice(amount)
      : `${userCurrency.symbol}${amount.toFixed(2)}`;

  // Para paymentCard.html
  const priceElement = document.getElementById("price");
  if (priceElement) {
    priceElement.textContent = fmtPrice(checkoutData.total);
  }

  // Mostrar código de moneda
  const currencyCodeElement = document.getElementById("currencyCode");
  if (currencyCodeElement) {
    currencyCodeElement.textContent = userCurrency.code;
  }

  const productNameElement = document.getElementById("productName");
  if (productNameElement) {
    const itemCount = checkoutData.items.length;
    productNameElement.textContent = `${itemCount} producto${
      itemCount > 1 ? "s" : ""
    }`;
  }

  const orderNumberElement = document.getElementById("orderNumber");
  if (orderNumberElement) {
    orderNumberElement.textContent = `ORD-${Date.now().toString().slice(-8)}`;
  }

  // Para paymentOXXO.html
  const orderTotalElement = document.getElementById("order-total");
  if (orderTotalElement) {
    orderTotalElement.textContent = `${fmtPrice(checkoutData.total)} ${
      userCurrency.code
    }`;
  }

  // Para transfer.html
  const transferAmountElement = document.getElementById("transfer-amount");
  if (transferAmountElement) {
    transferAmountElement.textContent = `${fmtPrice(checkoutData.total)} ${
      userCurrency.code
    }`;
  }

  // Monto mínimo para transferencia (100 MXN convertido)
  const minAmountElement = document.getElementById("min-amount");
  if (minAmountElement) {
    minAmountElement.textContent = `${fmtPrice(100)} ${userCurrency.code}`;
  }

  // Comisión (0 en cualquier moneda)
  const commissionElement = document.getElementById("commission");
  if (commissionElement) {
    commissionElement.textContent = `${fmtPrice(0)} ${userCurrency.code}`;
  }
}

// ===== PROCESAR ORDEN =====
async function processOrder(paymentMethod, paymentDetails = {}) {
  const checkoutData = getCheckoutData();

  if (!checkoutData || checkoutData.items.length === 0) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No hay datos del pedido. Por favor regresa al carrito.",
      confirmButtonColor: "#8B5E3C",
    }).then(() => {
      window.location.href = "/PAGES/cart.html";
    });
    return null;
  }

  if (!isLoggedIn()) {
    Swal.fire({
      icon: "warning",
      title: "Sesión requerida",
      text: "Debes iniciar sesión para completar la compra.",
      confirmButtonColor: "#8B5E3C",
    }).then(() => {
      window.location.href = "/PAGES/login.html";
    });
    return null;
  }

  try {
    // Obtener datos del formulario de envío
    const shippingData = getShippingFormData();

    // Obtener currency y símbolo del usuario
    const userCurrency =
      typeof getUserCurrency === "function"
        ? getUserCurrency()
        : { code: "MXN", symbol: "$" };

    const response = await fetch(`${API_BASE_URL}/checkout/process`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        items: checkoutData.items,
        paymentMethod: paymentMethod,
        paymentDetails: paymentDetails,
        subtotal: checkoutData.subtotal,
        tax: checkoutData.tax,
        taxName: checkoutData.taxName,
        shipping: checkoutData.shipping,
        shippingType: checkoutData.shippingType,
        discount: checkoutData.discount,
        couponCode: checkoutData.couponCode,
        giftWrap: checkoutData.giftWrap,
        total: checkoutData.total,
        country: checkoutData.country,
        currencyCode: userCurrency.code,
        currencySymbol: userCurrency.symbol,
        // Datos de envío del formulario
        shippingName: shippingData.name,
        shippingAddress: shippingData.address,
        shippingCity: shippingData.city,
        shippingPostalCode: shippingData.postalCode,
        shippingPhone: shippingData.phone,
        notes: shippingData.notes,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error al procesar orden:", error);
    return { success: false, message: "Error de conexión con el servidor" };
  }
}

// ===== OBTENER DATOS DEL FORMULARIO DE ENVÍO =====
function getShippingFormData() {
  // Primero intentar obtener de localStorage (guardado desde generalPayment.html)
  const savedAddress = localStorage.getItem("shippingAddress");
  if (savedAddress) {
    try {
      const address = JSON.parse(savedAddress);
      // Construir dirección completa
      const fullAddress = [address.street, address.colony, address.state]
        .filter(Boolean)
        .join(", ");

      return {
        name: address.recipientName || "",
        phone: address.phone || "",
        address: fullAddress || "Por definir",
        city: address.city || "Por definir",
        postalCode: address.zipCode || "00000",
        notes: address.references || "",
      };
    } catch (e) {
      console.error("Error al parsear dirección guardada:", e);
    }
  }

  // Fallback: intentar leer de elementos del DOM (si existen en la página actual)
  const recipientName = document.getElementById("recipient-name")?.value || "";
  const phone = document.getElementById("phone")?.value || "";
  const street = document.getElementById("street")?.value || "";
  const colony = document.getElementById("colony")?.value || "";
  const zipCode = document.getElementById("zip-code")?.value || "";
  const city = document.getElementById("city")?.value || "";
  const state = document.getElementById("state")?.value || "";
  const notes =
    document.getElementById("references")?.value ||
    document.getElementById("delivery-notes")?.value ||
    "";

  // Construir dirección completa
  const fullAddress = [street, colony, state].filter(Boolean).join(", ");

  return {
    name: recipientName,
    phone: phone,
    address: fullAddress || "Por definir",
    city: city || "Por definir",
    postalCode: zipCode || "00000",
    notes: notes,
  };
}

// ===== LIMPIAR DESPUÉS DE COMPRA =====
async function clearCartAfterPurchase() {
  const userEmail = getCurrentUserEmail() || "guest";
  localStorage.removeItem(`rythmo_cart_${userEmail}`);
  localStorage.removeItem("checkoutData");

  if (isLoggedIn()) {
    try {
      await fetch(`${API_BASE_URL}/cart/clear`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Error al limpiar carrito:", error);
    }
  }
}

// ===== CÓDIGO PARA TARJETA DE CRÉDITO =====
document.addEventListener("DOMContentLoaded", async function () {
  // Mostrar resumen del pedido
  await displayOrderSummary();

  // Elementos del formulario de tarjeta
  const cardNumberInput = document.getElementById("cardNumber");
  const cvvInput = document.getElementById("cvv");
  const expMonthInput = document.getElementById("expMonth");
  const expYearInput = document.getElementById("expYear");
  const cardHolderInput = document.getElementById("cardHolder");
  const passwordInput = document.getElementById("password");

  // Si no hay elementos de tarjeta, salir
  if (!cardNumberInput) return;

  // Elementos de preview de la tarjeta
  const previewCardNumber = document.getElementById("previewCardNumber");
  const previewExpiry = document.getElementById("previewExpiry");
  const previewName = document.getElementById("previewName");
  const previewCvv = document.getElementById("previewCvv");
  const cardContainer = document.querySelector(".credit-card-container");

  // Logos de las tarjetas
  const cardLogos = {
    visa: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
    mastercard:
      "https://upload.wikimedia.org/wikipedia/commons/0/04/Mastercard-logo.png",
    amex: "https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg",
    default:
      "https://upload.wikimedia.org/wikipedia/commons/0/04/Mastercard-logo.png",
  };

  // Inicializar valores por defecto
  previewName.textContent = "Jonathan Michael";
  previewExpiry.textContent = "09/22";
  previewCvv.textContent = "***";
  previewCardNumber.textContent = "**** **** **** ****";

  // Función para detectar la marca de la tarjeta
  function detectCardBrand(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, "");

    if (/^4/.test(cleaned)) {
      return "visa";
    } else if (/^5[1-5]/.test(cleaned)) {
      return "mastercard";
    } else if (/^3[47]/.test(cleaned)) {
      return "amex";
    } else {
      return "default";
    }
  }

  // Función para actualizar el logo de la tarjeta
  function updateCardLogo(cardNumber) {
    if (cardNumber.replace(/\s/g, "").length >= 1) {
      const brand = detectCardBrand(cardNumber);
      const logos = document.querySelectorAll(".card-logo img, .back-logo img");
      logos.forEach((logo) => {
        logo.src = cardLogos[brand];
        logo.alt = `${brand} logo`;
      });
    } else {
      const logos = document.querySelectorAll(".card-logo img, .back-logo img");
      logos.forEach((logo) => {
        logo.src = cardLogos["default"];
        logo.alt = "card logo";
      });
    }
  }

  // Formatear número de tarjeta y actualizar preview
  cardNumberInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    let formattedValue = "";

    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedValue += " ";
      }
      formattedValue += value[i];
    }

    e.target.value = formattedValue;

    // Actualizar preview de la tarjeta
    if (formattedValue) {
      const cleaned = formattedValue.replace(/\s/g, "");
      let displayValue = cleaned;

      // Si tiene menos de 16, rellenar con *
      if (cleaned.length < 16) {
        let remaining = 16 - cleaned.length;
        let stars = "*".repeat(remaining);

        displayValue += stars;
      }

      // Reagrupar siempre en bloques de 4
      displayValue = displayValue.match(/.{1,4}/g).join(" ");

      previewCardNumber.textContent = displayValue;
    } else {
      previewCardNumber.textContent = "**** **** **** ****";
    }

    // Actualizar logo de la tarjeta
    updateCardLogo(formattedValue);
  });

  // Actualizar CVV en el reverso de la tarjeta
  cvvInput.addEventListener("input", function (e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");

    if (e.target.value) {
      // Mostrar CVV real en el reverso
      previewCvv.textContent = e.target.value;
    } else {
      previewCvv.textContent = " ***";
    }
  });

  // Efecto visual cuando el CVV está enfocado
  cvvInput.addEventListener("focus", function () {
    if (window.innerWidth > 768) {
      cardContainer.classList.add("flipped");
    }
  });

  cvvInput.addEventListener("blur", function () {
    cardContainer.classList.remove("flipped");
  });

  // Actualizar nombre del titular
  cardHolderInput.addEventListener("input", function (e) {
    previewName.textContent = e.target.value || "Jonathan Michael";
  });

  // Actualizar fecha de expiración
  expMonthInput.addEventListener("input", function (e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
    if (e.target.value > 12) e.target.value = "12";
    updateExpiry();
  });

  expYearInput.addEventListener("input", function (e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
    updateExpiry();
  });

  function updateExpiry() {
    let month = expMonthInput.value;
    let year = expYearInput.value;

    // Si el input está vacío, usar valores por defecto
    month = month === "" ? "09" : month.padStart(2, "0");
    year = year === "" ? "22" : year.padStart(2, "0");

    previewExpiry.textContent = `${month}/${year}`;

    // Validar fechas en tiempo real
    validateExpiryMonth();
    validateExpiryYear();
  }

  // ===== FUNCIONES DE VALIDACIÓN VISUAL EN TIEMPO REAL =====

  // Validar número de tarjeta (16 dígitos)
  function validateCardNumber() {
    const value = cardNumberInput.value.replace(/\s/g, "");
    const isValid = value.length === 16 && /^\d+$/.test(value);

    cardNumberInput.classList.remove("valid", "invalid");
    if (value.length > 0) {
      cardNumberInput.classList.add(isValid ? "valid" : "invalid");
    }
    return isValid;
  }

  // Validar CVV (3-4 dígitos)
  function validateCVV() {
    const value = cvvInput.value;
    const isValid =
      value.length >= 3 && value.length <= 4 && /^\d+$/.test(value);

    cvvInput.classList.remove("valid", "invalid");
    if (value.length > 0) {
      cvvInput.classList.add(isValid ? "valid" : "invalid");
    }
    return isValid;
  }

  // Validar mes de expiración (01-12)
  function validateExpiryMonth() {
    const value = expMonthInput.value;
    const month = parseInt(value);

    // Primero validar que sea un mes válido (1-12)
    if (value.length === 0) {
      expMonthInput.classList.remove("valid", "invalid");
      return false;
    }

    const isValidFormat = value.length === 2 && month >= 1 && month <= 12;

    if (!isValidFormat) {
      expMonthInput.classList.remove("valid", "invalid");
      expMonthInput.classList.add("invalid");
      return false;
    }

    // Si hay año ingresado, verificar que no esté expirado
    const yearValue = expYearInput.value;
    if (yearValue.length === 2) {
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      const year = parseInt(yearValue);

      // Si es el año actual, el mes debe ser >= al mes actual
      if (year === currentYear && month < currentMonth) {
        expMonthInput.classList.remove("valid", "invalid");
        expMonthInput.classList.add("invalid");
        return false;
      }

      // Si el año ya pasó, es inválido
      if (year < currentYear) {
        expMonthInput.classList.remove("valid", "invalid");
        expMonthInput.classList.add("invalid");
        return false;
      }
    }

    expMonthInput.classList.remove("valid", "invalid");
    expMonthInput.classList.add("valid");
    return true;
  }

  // Validar año de expiración (no expirado)
  function validateExpiryYear() {
    const yearValue = expYearInput.value;

    if (yearValue.length === 0) {
      expYearInput.classList.remove("valid", "invalid");
      return false;
    }

    if (yearValue.length < 2) {
      expYearInput.classList.remove("valid", "invalid");
      expYearInput.classList.add("invalid");
      return false;
    }

    const currentYear = new Date().getFullYear() % 100;
    const year = parseInt(yearValue);

    // El año no puede ser menor al actual
    if (year < currentYear) {
      expYearInput.classList.remove("valid", "invalid");
      expYearInput.classList.add("invalid");
      // También actualizar el mes ya que la combinación es inválida
      if (expMonthInput.value.length === 2) {
        expMonthInput.classList.remove("valid");
        expMonthInput.classList.add("invalid");
      }
      return false;
    }

    // Si es el año actual, verificar que el mes no haya pasado
    if (year === currentYear) {
      const monthValue = expMonthInput.value;
      const currentMonth = new Date().getMonth() + 1;
      const month = parseInt(monthValue) || 0;

      if (monthValue.length === 2 && month < currentMonth) {
        expYearInput.classList.remove("valid", "invalid");
        expYearInput.classList.add("invalid");
        expMonthInput.classList.remove("valid");
        expMonthInput.classList.add("invalid");
        return false;
      }
    }

    expYearInput.classList.remove("valid", "invalid");
    expYearInput.classList.add("valid");

    // Revalidar el mes cuando el año cambia
    if (expMonthInput.value.length === 2) {
      validateExpiryMonth();
    }

    return true;
  }

  // Validar nombre del titular (al menos 3 caracteres, solo letras y espacios)
  function validateCardHolder() {
    const value = cardHolderInput.value.trim();
    const isValid =
      value.length >= 3 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value);

    cardHolderInput.classList.remove("valid", "invalid");
    if (value.length > 0) {
      cardHolderInput.classList.add(isValid ? "valid" : "invalid");
    }
    return isValid;
  }

  // Validar contraseña (al menos 4 caracteres)
  function validatePassword() {
    const value = passwordInput.value;
    const isValid = value.length >= 4;

    passwordInput.classList.remove("valid", "invalid");
    if (value.length > 0) {
      passwordInput.classList.add(isValid ? "valid" : "invalid");
    }
    return isValid;
  }

  // Agregar validación en tiempo real a cada campo
  cardNumberInput.addEventListener("input", validateCardNumber);
  cardNumberInput.addEventListener("blur", validateCardNumber);

  cvvInput.addEventListener("input", validateCVV);
  cvvInput.addEventListener("blur", validateCVV);

  expMonthInput.addEventListener("blur", validateExpiryMonth);
  expYearInput.addEventListener("blur", validateExpiryYear);

  cardHolderInput.addEventListener("input", validateCardHolder);
  cardHolderInput.addEventListener("blur", validateCardHolder);

  passwordInput.addEventListener("input", validatePassword);
  passwordInput.addEventListener("blur", validatePassword);

  // Manejar el botón de pago con tarjeta
  const payBtn = document.querySelector(".pay-btn");
  if (payBtn) {
    payBtn.addEventListener("click", async function (e) {
      e.preventDefault();

      // Validaciones básicas
      if (
        !cardNumberInput.value ||
        cardNumberInput.value.replace(/\s/g, "").length !== 16
      ) {
        Swal.fire({
          icon: "error",
          title: "Número de tarjeta inválido",
          text: "Por favor ingrese un número de tarjeta válido (16 dígitos)",
          confirmButtonText: "Cerrar",
          confirmButtonColor: "#8B5E3C",
        });
        cardNumberInput.focus();
        return;
      }

      if (!cvvInput.value || cvvInput.value.length < 3) {
        Swal.fire({
          icon: "error",
          title: "CVV inválido",
          text: "Por favor ingrese un CVV válido",
          confirmButtonText: "Cerrar",
          confirmButtonColor: "#8B5E3C",
        });
        cvvInput.focus();
        return;
      }

      if (!expMonthInput.value || !expYearInput.value) {
        Swal.fire({
          icon: "error",
          title: "Fecha de expiración inválida",
          text: "Por favor ingrese una fecha de expiración válida",
          confirmButtonText: "Cerrar",
          confirmButtonColor: "#8B5E3C",
        });
        expMonthInput.focus();
        return;
      }

      if (!cardHolderInput.value) {
        Swal.fire({
          icon: "error",
          title: "Nombre del titular requerido",
          text: "Por favor ingrese el nombre del titular de la tarjeta",
          confirmButtonText: "Cerrar",
          confirmButtonColor: "#8B5E3C",
        });
        cardHolderInput.focus();
        return;
      }

      if (!passwordInput.value) {
        Swal.fire({
          icon: "error",
          title: "Contraseña requerida",
          text: "Por favor ingrese su contraseña",
          confirmButtonText: "Cerrar",
          confirmButtonColor: "#8B5E3C",
        });
        passwordInput.focus();
        return;
      }

      // Procesar pago
      const payButton = this;
      const originalText = payButton.textContent;
      payButton.textContent = "Procesando...";
      payButton.disabled = true;
      payButton.style.background = "#9ca3af";

      const cardNumber = cardNumberInput.value.replace(/\s/g, "");
      const result = await processOrder("card", {
        cardLast4: cardNumber.slice(-4),
        cardName: cardHolderInput.value,
        cardExpiry: `${expMonthInput.value}/${expYearInput.value}`,
      });

      if (result && result.success) {
        await clearCartAfterPurchase();

        Swal.fire({
          icon: "success",
          title: "¡Pago procesado exitosamente!",
          html: `
            <p>Tu pedido <strong>#${result.orderId}</strong> ha sido confirmado.</p>
            <p>Recibirás un correo con los detalles y la factura.</p>
          `,
          confirmButtonText: "Ver inicio",
          confirmButtonColor: "#8B5E3C",
        }).then(() => {
          window.location.href = "/PAGES/index.html";
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error en el pago",
          text:
            result?.message || "No se pudo procesar el pago. Intenta de nuevo.",
          confirmButtonText: "Cerrar",
          confirmButtonColor: "#8B5E3C",
        });
        payButton.textContent = originalText;
        payButton.disabled = false;
        payButton.style.background = "";
      }
    });
  }

  // Inicializar logo de tarjeta
  updateCardLogo("");
});

// =============================== PARA EL PAGO CON OXXO =============================== //

// Obtener la clave del timer OXXO para el usuario actual
function getOxxoTimerKey() {
  const userEmail =
    localStorage.getItem("currentUser") ||
    sessionStorage.getItem("currentUser");
  if (userEmail) {
    return `rythmo_oxxoExpire_${userEmail}`;
  }
  return "rythmo_oxxoExpire_guest";
}

// Tiempo total: 72 horas = 259200000 ms
const TOTAL_TIME = 72 * 60 * 60 * 1000;

let expireTime = null;
let timerInterval = null;

// Iniciar el timer de OXXO y crear la orden
async function startOxxoTimer() {
  const storageKey = getOxxoTimerKey();

  // Verificar si ya existe un timer activo para este usuario
  let savedExpireTime = localStorage.getItem(storageKey);

  if (savedExpireTime) {
    expireTime = parseInt(savedExpireTime);
    // Si el timer ya expiró, crear uno nuevo
    if (expireTime <= Date.now()) {
      expireTime = Date.now() + TOTAL_TIME;
      localStorage.setItem(storageKey, expireTime);
    }
  } else {
    // Crear nuevo timer
    expireTime = Date.now() + TOTAL_TIME;
    localStorage.setItem(storageKey, expireTime);
  }

  // Generar código de barras único
  const barcodeNumber = generateOxxoBarcode();
  const barcodeElement = document.getElementById("barcode-number");
  if (barcodeElement) {
    barcodeElement.textContent = barcodeNumber;
  }

  // Procesar la orden con método OXXO
  const result = await processOrder("oxxo", {
    barcodeReference: barcodeNumber,
    expiresAt: new Date(expireTime).toISOString(),
  });

  if (result && result.success) {
    // Guardar referencia de la orden
    localStorage.setItem(`${storageKey}_orderId`, result.orderId);

    // Mostrar el total
    displayOrderSummary();
  }

  // Iniciar el intervalo si no está corriendo
  if (!timerInterval) {
    timerInterval = setInterval(updateTimer, 1000);
  }
  updateTimer();
}

// Generar código de barras OXXO
function generateOxxoBarcode() {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return timestamp + random;
}

// Cargar timer existente (para cuando el usuario vuelve a la página)
function loadExistingOxxoTimer() {
  const storageKey = getOxxoTimerKey();
  let savedExpireTime = localStorage.getItem(storageKey);

  if (savedExpireTime) {
    expireTime = parseInt(savedExpireTime);

    // Si el timer ya expiró, no mostrarlo
    if (expireTime <= Date.now()) {
      localStorage.removeItem(storageKey);
      const timerElement = document.getElementById("timer");
      if (timerElement) {
        timerElement.textContent = "No hay pago pendiente";
      }
      return false;
    }

    // Timer válido, iniciarlo
    if (!timerInterval) {
      timerInterval = setInterval(updateTimer, 1000);
    }
    updateTimer();
    return true;
  }

  // No hay timer guardado
  const timerElement = document.getElementById("timer");
  if (timerElement) {
    timerElement.textContent = "Pendiente de pago";
  }
  return false;
}

function updateTimer() {
  const timerElement = document.getElementById("timer");
  if (!timerElement || !expireTime) return;

  const now = Date.now();
  const remaining = expireTime - now;

  if (remaining <= 0) {
    timerElement.textContent = "00:00:00 - Expirado";
    localStorage.removeItem(getOxxoTimerKey());
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    return;
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60))
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((remaining / (1000 * 60)) % 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((remaining / 1000) % 60)
    .toString()
    .padStart(2, "0");

  timerElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// Cancelar/limpiar el timer de OXXO
function cancelOxxoTimer() {
  const storageKey = getOxxoTimerKey();
  localStorage.removeItem(storageKey);
  localStorage.removeItem(`${storageKey}_orderId`);
  expireTime = null;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const timerElement = document.getElementById("timer");
  if (timerElement) {
    timerElement.textContent = "Cancelado";
  }
}

// Solo cargar timer existente si estamos en la página de OXXO
document.addEventListener("DOMContentLoaded", function () {
  const timerElement = document.getElementById("timer");
  if (timerElement) {
    loadExistingOxxoTimer();
    displayOrderSummary();
  }
});

// =============================== PARA TRANSFERENCIA BANCARIA =============================== //

// Procesar orden de transferencia
async function processTransferOrder(bankReference) {
  const checkoutData = getCheckoutData();
  if (!checkoutData) {
    return { success: false, error: "No hay datos del pedido." };
  }

  const result = await processOrder("transfer", {
    bankReference: bankReference,
    confirmed: false, // Pendiente de confirmación
  });

  if (result && result.success) {
    await clearCartAfterPurchase();
    return {
      success: true,
      orderNumber: result.orderId,
    };
  }

  return {
    success: false,
    error: result?.message || "No se pudo procesar el pedido.",
  };
}

// Procesar orden OXXO
async function processOxxoOrder(barcodeReference) {
  const checkoutData = getCheckoutData();
  if (!checkoutData) {
    return { success: false, error: "No hay datos del pedido." };
  }

  const storageKey = getOxxoTimerKey();
  const expireTimeOxxo = localStorage.getItem(storageKey);

  const result = await processOrder("oxxo", {
    barcodeReference: barcodeReference,
    expiresAt: expireTimeOxxo
      ? new Date(parseInt(expireTimeOxxo)).toISOString()
      : null,
  });

  if (result && result.success) {
    await clearCartAfterPurchase();
    return {
      success: true,
      orderNumber: result.orderId,
    };
  }

  return {
    success: false,
    error: result?.message || "No se pudo procesar el pedido.",
  };
}

// Procesar confirmación de transferencia
async function processTransferPayment() {
  const checkoutData = getCheckoutData();
  if (!checkoutData) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No hay datos del pedido.",
      confirmButtonColor: "#8B5E3C",
    });
    return;
  }

  const referenceElement = document.getElementById("reference");
  const reference = referenceElement
    ? referenceElement.textContent
    : `TR-${Date.now()}`;

  const result = await processOrder("transfer", {
    bankReference: reference,
    confirmed: true,
  });

  if (result && result.success) {
    await clearCartAfterPurchase();

    Swal.fire({
      icon: "success",
      title: "¡Pedido registrado!",
      html: `
        <p>Tu pedido <strong>#${result.orderId}</strong> está pendiente de confirmación.</p>
        <p>Una vez que verifiquemos tu transferencia, recibirás un correo de confirmación.</p>
      `,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#8B5E3C",
    }).then(() => {
      window.location.href = "/PAGES/index.html";
    });
  } else {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: result?.message || "No se pudo procesar el pedido.",
      confirmButtonColor: "#8B5E3C",
    });
  }
}

// Exportar funciones globales
window.startOxxoTimer = startOxxoTimer;
window.loadExistingOxxoTimer = loadExistingOxxoTimer;
window.cancelOxxoTimer = cancelOxxoTimer;
window.processTransferPayment = processTransferPayment;
window.processOrder = processOrder;
window.clearCartAfterPurchase = clearCartAfterPurchase;
window.displayOrderSummary = displayOrderSummary;
window.processTransferOrder = processTransferOrder;
window.processOxxoOrder = processOxxoOrder;
