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

// ===== ESTADO DEL CHECKOUT =====
let checkoutState = {
  items: [],
  subtotal: 0,
  tax: 0,
  taxName: "IVA",
  shipping: 0,
  shippingType: "standard",
  discount: 0,
  couponCode: null,
  giftWrap: false,
  total: 0,
  country: "MX",
  shippingInfo: null,
  paymentMethod: null,
  paymentDetails: null,
};

// ===== INICIALIZACIÓN =====
document.addEventListener("DOMContentLoaded", async function () {
  // Verificar autenticación
  if (!isLoggedIn()) {
    Swal.fire({
      title: "Inicia sesión",
      text: "Necesitas iniciar sesión para realizar una compra",
      icon: "info",
      confirmButtonText: "Ir a login",
      confirmButtonColor: "#8B5E3C",
    }).then(() => {
      sessionStorage.setItem("pendingAction", "checkout");
      window.location.href = "/PAGES/login.html";
    });
    return;
  }

  // Cargar datos del checkout desde sessionStorage
  loadCheckoutData();

  // Cargar países
  await loadCountries();

  // Configurar formularios
  setupShippingForm();
  setupPaymentMethodSelection();
  setupEventListeners();

  // Mostrar resumen del pedido
  updateOrderSummary();
});

// ===== CARGAR DATOS DEL CHECKOUT =====
function loadCheckoutData() {
  const savedData = sessionStorage.getItem("checkoutData");
  if (savedData) {
    const data = JSON.parse(savedData);
    checkoutState = { ...checkoutState, ...data };
  } else {
    // Si no hay datos, redirigir al carrito
    Swal.fire({
      title: "Carrito vacío",
      text: "Agrega productos al carrito antes de pagar",
      icon: "warning",
      confirmButtonText: "Ir al carrito",
      confirmButtonColor: "#8B5E3C",
    }).then(() => {
      window.location.href = "/PAGES/cart.html";
    });
  }
}

// ===== CARGAR PAÍSES =====
async function loadCountries() {
  try {
    const response = await fetch(`${API_BASE_URL}/checkout/countries`);
    const data = await response.json();

    if (data.success) {
      const countrySelect = document.getElementById("shipping-country");
      if (countrySelect) {
        countrySelect.innerHTML = data.countries
          .map(
            (country) =>
              `<option value="${country.code}" ${
                country.code === checkoutState.country ? "selected" : ""
              }>${country.name}</option>`
          )
          .join("");

        countrySelect.addEventListener("change", async function () {
          checkoutState.country = this.value;
          await recalculateTotals();
        });
      }
    }
  } catch (error) {
    console.error("Error al cargar países:", error);
  }
}

// ===== FORMULARIO DE ENVÍO =====
function setupShippingForm() {
  const form = document.getElementById("shipping-form");
  if (!form) return;

  // Pre-cargar email del usuario
  const emailInput = document.getElementById("shipping-email");
  if (emailInput) {
    emailInput.value = getCurrentUserEmail() || "";
  }

  // Tipo de envío
  const shippingOptions = document.querySelectorAll(
    'input[name="shipping-method"]'
  );
  shippingOptions.forEach((option) => {
    option.addEventListener("change", async function () {
      checkoutState.shippingType = this.value;
      await recalculateTotals();
    });
  });
}

// ===== SELECCIÓN DE MÉTODO DE PAGO =====
function setupPaymentMethodSelection() {
  const paymentOptions = document.querySelectorAll(".payment-option");
  const paymentForms = document.querySelectorAll(".payment-form");

  paymentOptions.forEach((option) => {
    option.addEventListener("click", function () {
      // Remover selección de otros
      paymentOptions.forEach((o) => o.classList.remove("selected"));
      this.classList.add("selected");

      // Mostrar formulario correspondiente
      const method = this.dataset.method;
      checkoutState.paymentMethod = method;

      paymentForms.forEach((form) => {
        form.style.display = form.id === `form-${method}` ? "block" : "none";
      });
    });
  });
}

// ===== RECALCULAR TOTALES =====
async function recalculateTotals() {
  try {
    const response = await fetch(`${API_BASE_URL}/checkout/calculate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        subtotal: checkoutState.subtotal,
        countryCode: checkoutState.country,
        shippingType: checkoutState.shippingType,
        couponCode: checkoutState.couponCode,
        giftWrap: checkoutState.giftWrap,
      }),
    });

    const data = await response.json();

    if (data.success) {
      checkoutState.tax = data.tax.taxAmount;
      checkoutState.taxName = data.tax.taxName;
      checkoutState.shipping = data.shipping.shippingCost;
      checkoutState.discount = data.discount;
      checkoutState.total = data.total;

      updateOrderSummary();
    }
  } catch (error) {
    console.error("Error al recalcular totales:", error);
  }
}

// ===== ACTUALIZAR RESUMEN =====
function updateOrderSummary() {
  // Productos
  const itemsList = document.getElementById("checkout-items");
  if (itemsList) {
    itemsList.innerHTML = checkoutState.items
      .map(
        (item) => `
      <div class="checkout-item">
        <img src="${item.image}" alt="${
          item.name
        }" onerror="this.src='/IMAGES/TiredCat_No-bg.png'">
        <div class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">x${item.quantity}</span>
        </div>
        <span class="item-price">$${(item.price * item.quantity).toFixed(
          2
        )}</span>
      </div>
    `
      )
      .join("");
  }

  // Totales
  document.getElementById("summary-subtotal")?.textContent &&
    (document.getElementById(
      "summary-subtotal"
    ).textContent = `$${checkoutState.subtotal.toFixed(2)}`);

  document.getElementById("summary-tax")?.textContent &&
    (document.getElementById(
      "summary-tax"
    ).textContent = `$${checkoutState.tax.toFixed(2)}`);

  document.getElementById("summary-tax-label")?.textContent &&
    (document.getElementById("summary-tax-label").textContent =
      checkoutState.taxName);

  const shippingEl = document.getElementById("summary-shipping");
  if (shippingEl) {
    if (checkoutState.shipping === 0) {
      shippingEl.innerHTML = '<span class="free-shipping">Gratis</span>';
    } else {
      shippingEl.textContent = `$${checkoutState.shipping.toFixed(2)}`;
    }
  }

  const discountEl = document.getElementById("summary-discount");
  if (discountEl) {
    if (checkoutState.discount > 0) {
      discountEl.textContent = `-$${checkoutState.discount.toFixed(2)}`;
      discountEl.parentElement.style.display = "flex";
    } else {
      discountEl.parentElement.style.display = "none";
    }
  }

  document.getElementById("summary-total")?.textContent &&
    (document.getElementById(
      "summary-total"
    ).textContent = `$${checkoutState.total.toFixed(2)}`);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Botón de procesar pago
  const processPaymentBtn = document.getElementById("process-payment");
  if (processPaymentBtn) {
    processPaymentBtn.addEventListener("click", processPayment);
  }
}

// ===== PROCESAR PAGO =====
async function processPayment() {
  // Validar formulario de envío
  if (!validateShippingForm()) {
    return;
  }

  // Validar método de pago
  if (!checkoutState.paymentMethod) {
    Swal.fire({
      title: "Selecciona un método de pago",
      text: "Por favor selecciona cómo deseas pagar",
      icon: "warning",
      confirmButtonColor: "#8B5E3C",
    });
    return;
  }

  // Validar detalles del método de pago
  if (!validatePaymentDetails()) {
    return;
  }

  // Recopilar información de envío
  const shippingInfo = {
    fullName: document.getElementById("shipping-name")?.value,
    email: document.getElementById("shipping-email")?.value,
    phone: document.getElementById("shipping-phone")?.value,
    address: document.getElementById("shipping-address")?.value,
    city: document.getElementById("shipping-city")?.value,
    state: document.getElementById("shipping-state")?.value,
    zipCode: document.getElementById("shipping-zip")?.value,
    country: checkoutState.country,
  };

  // Mostrar procesando
  const btn = document.getElementById("process-payment");
  const originalText = btn.textContent;
  btn.textContent = "Procesando...";
  btn.disabled = true;

  try {
    const response = await fetch(`${API_BASE_URL}/checkout/process`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        items: checkoutState.items,
        shippingInfo,
        paymentMethod: checkoutState.paymentMethod,
        paymentDetails: checkoutState.paymentDetails,
        subtotal: checkoutState.subtotal,
        tax: checkoutState.tax,
        taxName: checkoutState.taxName,
        shipping: checkoutState.shipping,
        shippingType: checkoutState.shippingType,
        discount: checkoutState.discount,
        couponCode: checkoutState.couponCode,
        giftWrap: checkoutState.giftWrap,
        total: checkoutState.total,
        country: checkoutState.country,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Limpiar carrito
      clearCartAfterPurchase();

      // Limpiar sessionStorage
      sessionStorage.removeItem("checkoutData");

      // Mostrar confirmación
      await Swal.fire({
        title: "¡Pedido completado!",
        html: `
          <p>Tu pedido #${data.orderId} ha sido procesado exitosamente.</p>
          <p>Recibirás un correo con los detalles y la factura PDF.</p>
          ${
            checkoutState.paymentMethod === "oxxo"
              ? `<p><strong>Referencia OXXO:</strong> ${data.oxxoReference}</p>
             <p>Tienes 72 horas para realizar el pago.</p>`
              : ""
          }
        `,
        icon: "success",
        confirmButtonText: "Ver mis pedidos",
        confirmButtonColor: "#8B5E3C",
      });

      // Redirigir a página de pedidos o inicio
      window.location.href = "/PAGES/index.html";
    } else {
      throw new Error(data.message || "Error al procesar el pedido");
    }
  } catch (error) {
    console.error("Error al procesar pago:", error);
    Swal.fire({
      title: "Error",
      text:
        error.message ||
        "Hubo un error al procesar tu pedido. Intenta de nuevo.",
      icon: "error",
      confirmButtonColor: "#8B5E3C",
    });
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ===== VALIDACIONES =====
function validateShippingForm() {
  const requiredFields = [
    { id: "shipping-name", name: "Nombre completo" },
    { id: "shipping-email", name: "Email" },
    { id: "shipping-phone", name: "Teléfono" },
    { id: "shipping-address", name: "Dirección" },
    { id: "shipping-city", name: "Ciudad" },
    { id: "shipping-state", name: "Estado/Provincia" },
    { id: "shipping-zip", name: "Código postal" },
  ];

  for (const field of requiredFields) {
    const input = document.getElementById(field.id);
    if (!input || !input.value.trim()) {
      Swal.fire({
        title: "Campo requerido",
        text: `Por favor ingresa tu ${field.name}`,
        icon: "warning",
        confirmButtonColor: "#8B5E3C",
      });
      input?.focus();
      return false;
    }
  }

  // Validar email
  const emailInput = document.getElementById("shipping-email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailInput.value)) {
    Swal.fire({
      title: "Email inválido",
      text: "Por favor ingresa un email válido",
      icon: "warning",
      confirmButtonColor: "#8B5E3C",
    });
    emailInput.focus();
    return false;
  }

  return true;
}

function validatePaymentDetails() {
  switch (checkoutState.paymentMethod) {
    case "card":
      return validateCardPayment();
    case "transfer":
      return validateTransferPayment();
    case "oxxo":
      return validateOxxoPayment();
    default:
      return true;
  }
}

function validateCardPayment() {
  const cardNumber = document
    .getElementById("card-number")
    ?.value?.replace(/\s/g, "");
  const cardName = document.getElementById("card-name")?.value;
  const cardExpiry = document.getElementById("card-expiry")?.value;
  const cardCvv = document.getElementById("card-cvv")?.value;

  if (!cardNumber || cardNumber.length < 16) {
    Swal.fire({
      title: "Número de tarjeta inválido",
      text: "Ingresa un número de tarjeta válido (16 dígitos)",
      icon: "error",
      confirmButtonColor: "#8B5E3C",
    });
    return false;
  }

  if (!cardName) {
    Swal.fire({
      title: "Nombre requerido",
      text: "Ingresa el nombre del titular de la tarjeta",
      icon: "error",
      confirmButtonColor: "#8B5E3C",
    });
    return false;
  }

  if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
    Swal.fire({
      title: "Fecha de expiración inválida",
      text: "Ingresa la fecha en formato MM/AA",
      icon: "error",
      confirmButtonColor: "#8B5E3C",
    });
    return false;
  }

  if (!cardCvv || cardCvv.length < 3) {
    Swal.fire({
      title: "CVV inválido",
      text: "Ingresa un CVV válido (3-4 dígitos)",
      icon: "error",
      confirmButtonColor: "#8B5E3C",
    });
    return false;
  }

  // Guardar detalles (enmascarados para seguridad)
  checkoutState.paymentDetails = {
    cardLast4: cardNumber.slice(-4),
    cardName,
    cardExpiry,
  };

  return true;
}

function validateTransferPayment() {
  // Para transferencia, solo confirmamos que el usuario acepta
  const transferConfirm = document.getElementById("transfer-confirm")?.checked;

  if (!transferConfirm) {
    Swal.fire({
      title: "Confirma la transferencia",
      text: "Debes confirmar que realizarás la transferencia bancaria",
      icon: "warning",
      confirmButtonColor: "#8B5E3C",
    });
    return false;
  }

  checkoutState.paymentDetails = {
    method: "bank_transfer",
    confirmed: true,
  };

  return true;
}

function validateOxxoPayment() {
  // OXXO solo requiere confirmación
  checkoutState.paymentDetails = {
    method: "oxxo",
    confirmed: true,
  };

  return true;
}

// ===== LIMPIAR CARRITO =====
async function clearCartAfterPurchase() {
  // Limpiar localStorage
  const userEmail = getCurrentUserEmail() || "guest";
  localStorage.removeItem(`rythmo_cart_${userEmail}`);

  // Limpiar en servidor si está logueado
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

  // Actualizar badge
  const cartBadge = document.getElementById("cart-badge");
  if (cartBadge) {
    cartBadge.style.display = "none";
  }
}

// ===== SUSCRIPCIÓN A NEWSLETTER =====
async function subscribeToNewsletter(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/checkout/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (data.success) {
      Swal.fire({
        title: "¡Suscrito!",
        text: data.message,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error en suscripción:", error);
  }
}

// Setup para formulario de newsletter en el footer
document.addEventListener("DOMContentLoaded", function () {
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const emailInput = this.querySelector('input[type="email"]');
      if (emailInput && emailInput.value) {
        await subscribeToNewsletter(emailInput.value);
        emailInput.value = "";
      }
    });
  }
});

// Exportar funciones globales
window.processPayment = processPayment;
window.subscribeToNewsletter = subscribeToNewsletter;
