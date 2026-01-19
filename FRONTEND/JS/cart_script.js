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

// Estado del carrito
let cartState = {
  items: [],
  subtotal: 0,
  shipping: 0,
  shippingType: "standard",
  giftWrap: false,
  discount: 0,
  couponCode: null,
  couponInfo: null,
  tax: 0,
  taxName: "IVA",
  total: 0,
  country: "MX",
};

// Elementos del DOM
const productsContainer = document.getElementById("products-container");
const subtotalElement = document.getElementById("subtotal");
const shippingElement = document.getElementById("shipping");
const giftCostElement = document.getElementById("gift-cost");
const discountElement = document.getElementById("discount");
const totalElement = document.getElementById("total");
const giftWrapCheckbox = document.getElementById("gift-wrap");

document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Cargar moneda del usuario si currencyUtils está disponible
    if (typeof loadUserCurrency === "function") {
      await loadUserCurrency();
    }
    // Actualizar precio de envoltura de regalo con la moneda del usuario
    updateGiftWrapPrice();
    await loadUserCountry();
    await loadCart();
    setupEventListeners();
  } catch (error) {
    console.error("Error al inicializar carrito:", error);
    // Intentar mostrar carrito de localStorage como fallback
    loadCartFromLocalStorage();
    updateCartDisplay();
  }
});

// ===== ACTUALIZAR PRECIO DE ENVOLTURA DE REGALO =====
function updateGiftWrapPrice() {
  const giftWrapPriceElement = document.getElementById("gift-wrap-price");
  if (giftWrapPriceElement) {
    const formattedPrice =
      typeof formatPrice === "function" ? formatPrice(20) : "$20.00";
    giftWrapPriceElement.textContent = formattedPrice;
  }
}

// ===== CARGAR PAÍS DEL USUARIO =====
async function loadUserCountry() {
  if (!isLoggedIn()) {
    cartState.country = "MX"; // Default para usuarios no logueados
    updateFreeShippingNote();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: getAuthHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
      // Token inválido
      console.warn("Sesión inválida al cargar país");
      cartState.country = "MX";
      updateFreeShippingNote();
      return;
    }

    const data = await response.json();

    if (data.success && data.user && data.user.country) {
      cartState.country = data.user.country;
    } else {
      cartState.country = "MX"; // Default
    }
  } catch (error) {
    console.error("Error al cargar país del usuario:", error);
    cartState.country = "MX"; // Default en caso de error
  }

  updateFreeShippingNote();
}

// Configuración de envío por país (soporta códigos de país y moneda para compatibilidad)
const countryShippingConfig = {
  // Códigos de país
  MX: { threshold: 1500, currency: "MXN", symbol: "$" },
  US: { threshold: 100, currency: "USD", symbol: "$" },
  ES: { threshold: 80, currency: "EUR", symbol: "€" },
  CO: { threshold: 300000, currency: "COP", symbol: "$" },
  AR: { threshold: 50000, currency: "ARS", symbol: "$" },
  CL: { threshold: 80000, currency: "CLP", symbol: "$" },
  CA: { threshold: 120, currency: "CAD", symbol: "$" },
  BR: { threshold: 400, currency: "BRL", symbol: "R$" },
  PE: { threshold: 300, currency: "PEN", symbol: "S/" },
  GT: { threshold: 600, currency: "GTQ", symbol: "Q" },
  // Códigos de moneda (compatibilidad con usuarios existentes)
  MXN: { threshold: 1500, currency: "MXN", symbol: "$" },
  USD: { threshold: 100, currency: "USD", symbol: "$" },
  EUR: { threshold: 80, currency: "EUR", symbol: "€" },
  COP: { threshold: 300000, currency: "COP", symbol: "$" },
  ARS: { threshold: 50000, currency: "ARS", symbol: "$" },
  CLP: { threshold: 80000, currency: "CLP", symbol: "$" },
  CAD: { threshold: 120, currency: "CAD", symbol: "$" },
  BRL: { threshold: 400, currency: "BRL", symbol: "R$" },
  PEN: { threshold: 300, currency: "PEN", symbol: "S/" },
  GTQ: { threshold: 600, currency: "GTQ", symbol: "Q" },
};

// Actualizar nota de envío gratis según el país
function updateFreeShippingNote() {
  const noteElement = document.getElementById("free-shipping-note");
  if (!noteElement) return;

  const config =
    countryShippingConfig[cartState.country] || countryShippingConfig.MX;
  const formattedAmount = config.threshold.toLocaleString("es-MX");

  noteElement.innerHTML = `<i class="fa-solid fa-truck"></i> <span>¡Envío gratis en compras mayores a ${config.symbol}${formattedAmount} ${config.currency}!</span>`;
}

// Función para aplicar cupón
async function applyCoupon() {
  const couponInput = document.querySelector(".coupon-input input");
  const couponCode = couponInput?.value.trim();

  if (!couponCode) {
    Swal.fire({
      title: "Código vacío",
      text: "Por favor ingresa un código de cupón",
      icon: "warning",
      confirmButtonText: "Entendido",
      confirmButtonColor: "#8B5E3C",
    });
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/checkout/validate-coupon`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        code: couponCode,
        subtotal: cartState.subtotal,
      }),
    });

    const data = await response.json();

    if (data.success) {
      cartState.couponCode = couponCode;
      cartState.couponInfo = data.coupon;
      cartState.discount = data.discount;

      await calculateTotals();

      // Mostrar cupón aplicado
      const couponApplied = document.querySelector(".coupon-applied");
      if (couponApplied) {
        couponApplied.innerHTML = `
          <div class="coupon-success">
            <i class="fa-solid fa-check-circle"></i>
            <span>${data.coupon.name} aplicado</span>
          </div>
          <button class="remove-coupon" onclick="removeCoupon()">
            <i class="fa-solid fa-times"></i>
          </button>
        `;
        couponApplied.classList.add("show");
      }

      // Ocultar input
      document.getElementById("couponInput")?.classList.remove("show");

      Swal.fire({
        title: "¡Cupón aplicado!",
        text: data.message,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({
        title: "Cupón inválido",
        text: data.message || "El código ingresado no es válido o ha expirado",
        icon: "error",
        confirmButtonText: "Intentar otro",
        confirmButtonColor: "#8B5E3C",
      });
    }
  } catch (error) {
    console.error("Error al validar cupón:", error);
    Swal.fire({
      title: "Error",
      text: "No se pudo validar el cupón",
      icon: "error",
      confirmButtonColor: "#8B5E3C",
    });
  }

  if (couponInput) couponInput.value = "";
}

// Función para remover cupón
async function removeCoupon() {
  cartState.couponCode = null;
  cartState.couponInfo = null;
  cartState.discount = 0;

  await calculateTotals();

  const couponApplied = document.querySelector(".coupon-applied");
  if (couponApplied) {
    couponApplied.classList.remove("show");
  }
}

// Función para toggle cupón
function toggleCoupon() {
  const couponInput = document.getElementById("couponInput");
  if (couponInput) {
    couponInput.classList.toggle("show");
    if (couponInput.classList.contains("show")) {
      couponInput.querySelector("input")?.focus();
    }
  }
}

// Función para calcular totales
async function calculateTotals() {
  // Subtotal local
  cartState.subtotal = cartState.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cartState.items.length === 0) {
    cartState.shipping = 0;
    cartState.tax = 0;
    cartState.discount = 0;
    cartState.total = 0;
    updateTotalDisplay();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/checkout/calculate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        subtotal: cartState.subtotal,
        countryCode: cartState.country,
        shippingType: cartState.shippingType,
        couponCode: cartState.couponCode,
        giftWrap: cartState.giftWrap,
      }),
    });

    const data = await response.json();

    if (data.success) {
      cartState.tax = data.tax.taxAmount;
      cartState.taxName = data.tax.taxName;
      cartState.shipping = data.shipping.shippingCost;
      cartState.discount = data.discount;
      cartState.total = data.total;
      cartState.couponInfo = data.coupon;

      // Mostrar mensaje de envío gratis
      if (data.shipping.isFree) {
        showFreeShippingMessage();
      } else if (data.shipping.amountForFreeShipping) {
        showAmountForFreeShipping(data.shipping.amountForFreeShipping);
      }
    }
  } catch (error) {
    console.error("Error al calcular totales desde servidor:", error);
    // Cálculo local de respaldo usando configuración del país
    const shippingConfig =
      countryShippingConfig[cartState.country] || countryShippingConfig.MX;
    // Convertir subtotal a moneda local para comparación
    const subtotalInLocalCurrency =
      typeof convertPrice === "function"
        ? convertPrice(cartState.subtotal)
        : cartState.subtotal;

    cartState.tax = cartState.subtotal * 0.16;
    cartState.shipping =
      subtotalInLocalCurrency >= shippingConfig.threshold ? 0 : 10;
    const giftCost = cartState.giftWrap ? 20 : 0;
    cartState.total =
      cartState.subtotal +
      cartState.tax +
      cartState.shipping +
      giftCost -
      cartState.discount;
  }

  updateTotalDisplay();
  updateCartBadgeGlobal();
}

// Mensajes de envío
function showFreeShippingMessage() {
  const message = document.querySelector(".free-shipping-message");
  if (message) {
    message.innerHTML =
      '<i class="fa-solid fa-truck"></i> ¡Envío gratis incluido!';
    message.style.display = "block";
    message.className = "free-shipping-message success";
  }
}

function showAmountForFreeShipping(amount) {
  const message = document.querySelector(".free-shipping-message");
  if (message) {
    const formattedAmount =
      typeof formatPrice === "function"
        ? formatPrice(amount)
        : `$${amount.toFixed(2)}`;
    message.innerHTML = `<i class="fa-solid fa-info-circle"></i> ¡Agrega ${formattedAmount} más para envío gratis!`;
    message.style.display = "block";
    message.className = "free-shipping-message info";
  }
}

// Función para mostrar totales
function updateTotalDisplay() {
  // Helper para formatear precios
  const fmtPrice = (amount) => {
    return typeof formatPrice === "function"
      ? formatPrice(amount)
      : `$${amount.toFixed(2)}`;
  };

  if (subtotalElement) {
    subtotalElement.textContent = fmtPrice(cartState.subtotal);
  }

  // Shipping
  if (shippingElement) {
    if (cartState.shipping === 0 && cartState.subtotal > 0) {
      shippingElement.innerHTML = '<span class="free-shipping">Gratis</span>';
    } else {
      shippingElement.textContent = fmtPrice(cartState.shipping);
    }
  }

  // Agregar fila de impuestos si no existe
  addTaxRow();

  // Gift wrap (20 MXN)
  if (giftCostElement) {
    giftCostElement.textContent = cartState.giftWrap
      ? fmtPrice(20)
      : fmtPrice(0);
  }

  // Discount
  if (discountElement) {
    if (cartState.discount > 0) {
      const discountFormatted = fmtPrice(cartState.discount);
      discountElement.innerHTML = `-${discountFormatted} <span class="savings-badge">Ahorro</span>`;
      if (discountElement.parentElement) {
        discountElement.parentElement.style.display = "flex";
      }
    } else {
      discountElement.textContent = fmtPrice(0);
    }
  }

  // Total
  if (totalElement) {
    totalElement.textContent = fmtPrice(cartState.total);
  }

  // Animación del botón de pago si hay productos
  const payButton = document.querySelector(".btn-next");
  if (payButton) {
    if (cartState.items.length > 0 && cartState.total > 0) {
      payButton.classList.add("pulse");
    } else {
      payButton.classList.remove("pulse");
    }
  }
}

// Agregar fila de impuestos
function addTaxRow() {
  const priceDetails = document.querySelector(".price-details");
  if (!priceDetails) return;

  // Helper para formatear precios
  const fmtPrice = (amount) => {
    return typeof formatPrice === "function"
      ? formatPrice(amount)
      : `$${amount.toFixed(2)}`;
  };

  let taxLine = document.getElementById("tax-line");
  if (!taxLine && shippingElement) {
    const shippingLine = shippingElement.parentElement;
    if (shippingLine) {
      taxLine = document.createElement("div");
      taxLine.className = "line";
      taxLine.id = "tax-line";
      taxLine.innerHTML = `
        <span>${cartState.taxName} (${cartState.country})</span>
        <span id="tax-amount">${fmtPrice(0)}</span>
      `;
      shippingLine.parentNode.insertBefore(taxLine, shippingLine.nextSibling);
    }
  }

  const taxAmount = document.getElementById("tax-amount");
  if (taxAmount) {
    taxAmount.textContent = fmtPrice(cartState.tax);
  }

  // Actualizar nombre del impuesto
  if (taxLine) {
    const taxLabel = taxLine.querySelector("span:first-child");
    if (taxLabel) {
      taxLabel.textContent = `${cartState.taxName} (${cartState.country})`;
    }
  }
}

// Cargar carrito desde localStorage o servidor
async function loadCart() {
  // Siempre cargar primero desde localStorage como base
  loadCartFromLocalStorage();

  if (isLoggedIn()) {
    // Intentar cargar desde el servidor
    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.items && data.items.length > 0) {
          cartState.items = data.items.map((item) => ({
            id: item.productId,
            name: item.name,
            price: parseFloat(item.price),
            image: item.image || "/IMAGES/TiredCat_No-bg.png",
            category: item.category,
            quantity: item.quantity,
            stock: item.stock,
          }));
        }
        // Si el servidor devuelve éxito pero sin items, mantener los de localStorage
      } else if (response.status === 401 || response.status === 403) {
        // Token inválido o usuario no existe -> limpiar sesión
        console.warn("Sesión inválida, limpiando token...");
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
      }
      // Si la respuesta no es ok por otra razón, mantener los de localStorage
    } catch (error) {
      console.error("Error al cargar carrito del servidor:", error);
    }
  }

  // Actualizar stock de productos desde la API (para tener stock actualizado)
  await updateCartItemsStock();

  updateCartDisplay();
  await calculateTotals();
  updateCartBadgeGlobal();
}

// Función para actualizar el stock de los items del carrito desde la API
async function updateCartItemsStock() {
  if (cartState.items.length === 0) return;

  try {
    // Obtener IDs de productos en el carrito
    const productIds = cartState.items.map((item) => item.id);

    // Hacer una sola petición para obtener todos los productos
    const response = await fetch(`${API_BASE_URL}/products`);
    if (response.ok) {
      const data = await response.json();
      const products = data.products || data;

      // Actualizar el stock de cada item en el carrito
      cartState.items.forEach((item) => {
        const product = products.find((p) => p.id === item.id);
        if (product) {
          item.stock = product.stock;
          // Si la cantidad actual excede el stock, ajustarla
          if (item.quantity > product.stock) {
            item.quantity = product.stock;
          }
        }
      });

      // Guardar cambios en localStorage
      await syncCartToStorage();
    }
  } catch (error) {
    console.error("Error al actualizar stock de productos:", error);
  }
}

function loadCartFromLocalStorage() {
  // Verificar que getCartFromStorage exista (de cartUtils.js)
  if (typeof getCartFromStorage === "function") {
    const savedCart = getCartFromStorage();
    if (savedCart && savedCart.length > 0) {
      cartState.items = savedCart;
    } else {
      cartState.items = [];
    }
  } else {
    // Fallback: leer directamente de localStorage
    const userEmail =
      localStorage.getItem("currentUser") ||
      sessionStorage.getItem("currentUser");
    const key = userEmail ? `rythmo_cart_${userEmail}` : "rythmo_cart_guest";
    try {
      const cart = localStorage.getItem(key);
      cartState.items = cart ? JSON.parse(cart) : [];
    } catch (e) {
      console.error("Error al leer carrito:", e);
      cartState.items = [];
    }
  }
}

// Guardar cambios del carrito en localStorage y servidor
async function syncCartToStorage() {
  saveCartToStorage(cartState.items);
  updateCartBadgeGlobal();

  // Sincronizar con servidor si está logueado
  if (isLoggedIn()) {
    try {
      await fetch(`${API_BASE_URL}/cart/sync`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ items: cartState.items }),
      });
    } catch (error) {
      console.error("Error al sincronizar carrito con servidor:", error);
    }
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Envoltura de regalo
  if (giftWrapCheckbox) {
    giftWrapCheckbox.addEventListener("change", async function () {
      cartState.giftWrap = this.checked;
      await calculateTotals();
    });
  }

  // Cupón
  const applyCouponBtn = document.querySelector(".btn-apply");
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener("click", applyCoupon);
  }

  // Tipo de envío
  const shippingTypeInputs = document.querySelectorAll(
    'input[name="shipping-type"]'
  );
  shippingTypeInputs.forEach((input) => {
    input.addEventListener("change", async function () {
      cartState.shippingType = this.value;
      await calculateTotals();
    });
  });

  // Botón de pagar
  const payButton = document.querySelector(".btn-next");
  if (payButton) {
    payButton.addEventListener("click", function (e) {
      if (!validateCartBeforePayment()) {
        e.preventDefault();
      } else {
        // Guardar datos del carrito para la página de pago (usar localStorage)
        localStorage.setItem(
          "checkoutData",
          JSON.stringify({
            items: cartState.items,
            subtotal: cartState.subtotal,
            tax: cartState.tax,
            taxName: cartState.taxName,
            shipping: cartState.shipping,
            shippingType: cartState.shippingType,
            discount: cartState.discount,
            couponCode: cartState.couponCode,
            giftWrap: cartState.giftWrap,
            total: cartState.total,
            country: cartState.country,
          })
        );
      }
    });
  }
}

function updateCartDisplay() {
  if (!productsContainer) return;

  if (cartState.items.length === 0) {
    productsContainer.innerHTML = `
            <div class="empty-cart-message">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Tu carrito está vacío</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">Agrega algunos productos musicales</p>
                <a href="/PAGES/catalogo.html" class="btn">
                    <i class="fa-solid fa-guitar"></i>
                    Explorar Catálogo
                </a>
            </div>
        `;
    return;
  }

  // Agregar contador de productos
  const cartSummary = `
        <div class="cart-summary">
            <div class="product-count">
                ${cartState.items.length} producto${
    cartState.items.length > 1 ? "s" : ""
  } en el carrito
            </div>
        </div>
    `;

  productsContainer.innerHTML =
    cartSummary +
    cartState.items
      .map((item) => {
        const subtotal = item.price * item.quantity;
        const stockWarning = item.stock && item.quantity >= item.stock;
        const minQuantityReached = item.quantity <= 1;

        // Usar conversión de moneda si está disponible
        const priceDisplay =
          typeof formatPrice === "function"
            ? formatPrice(item.price)
            : "$" + item.price.toFixed(2);
        const subtotalDisplay =
          typeof formatPrice === "function"
            ? formatPrice(subtotal)
            : "$" + subtotal.toFixed(2);

        return `
        <div class="product-item" data-id="${item.id}">
            ${item.onSale ? '<span class="product-badge">Oferta</span>' : ""}
            
            <img src="${item.image}" alt="${
          item.name
        }" onerror="this.src='/IMAGES/TiredCat_No-bg.png'">
            
            <div class="product-info">
                <strong>${item.name}</strong>
                <span class="product-category">${
                  item.category || "General"
                }</span>
                <div class="product-price">${priceDisplay}</div>
                
                <div class="product-quantity">
                    <button class="quantity-btn ${
                      minQuantityReached ? "disabled" : ""
                    }" onclick="${
          minQuantityReached ? "" : `updateQuantity(${item.id}, -1)`
        }" title="${
          minQuantityReached
            ? "Cantidad mínima alcanzada"
            : "Disminuir cantidad"
        }" ${minQuantityReached ? "disabled" : ""}>
                        <i class="fa-solid fa-minus"></i>
                    </button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn ${
                      stockWarning ? "disabled" : ""
                    }" onclick="${
          stockWarning ? "" : `updateQuantity(${item.id}, 1)`
        }" title="${
          stockWarning ? "Stock máximo alcanzado" : "Aumentar cantidad"
        }" ${stockWarning ? "disabled" : ""}>
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
                
                ${
                  stockWarning
                    ? '<span class="stock-warning">Máximo disponible</span>'
                    : ""
                }
                
                <div class="product-subtotal">
                    Subtotal: ${subtotalDisplay}
                </div>
                
            </div>
            
            <div class="product-actions">
                <button class="wishlist-btn" onclick="moveToWishlist(${
                  item.id
                })" title="Mover a favoritos">
                    <i class="fa-solid fa-heart"></i>
                </button>
                <button class="remove-btn" onclick="removeFromCart(${
                  item.id
                })" title="Eliminar producto">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
        `;
      })
      .join("");
}

// Nueva función para mover a favoritos
async function moveToWishlist(productId) {
  const item = cartState.items.find((item) => item.id === productId);
  if (!item) return;

  const result = await Swal.fire({
    title: "¿Mover a favoritos?",
    text: `¿Quieres mover "${item.name}" a tu lista de deseos?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, mover",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#8B5E3C",
  });

  if (result.isConfirmed) {
    if (isLoggedIn()) {
      try {
        // Agregar a wishlist en servidor
        await fetch(`${API_BASE_URL}/wishlist/add`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ productId }),
        });
      } catch (error) {
        console.error("Error al mover a wishlist:", error);
      }
    } else {
      // Agregar a wishlist en localStorage
      addProductToWishlist(item);
    }

    // Eliminar del carrito
    await removeFromCart(productId);

    Swal.fire({
      title: "¡Movido!",
      text: "Producto agregado a tu lista de deseos",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  }
}

// Helper para agregar a wishlist en localStorage
function addProductToWishlist(product) {
  const email = getCurrentUserEmail() || "guest";
  const key = `rythmo_wishlist_${email}`;
  const wishlist = JSON.parse(localStorage.getItem(key) || "[]");

  if (!wishlist.find((item) => item.id === product.id)) {
    wishlist.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
    });
    localStorage.setItem(key, JSON.stringify(wishlist));
  }
}

// Función de eliminación con animación
async function removeFromCart(productId) {
  const itemElement = document.querySelector(
    `.product-item[data-id="${productId}"]`
  );
  if (itemElement) {
    itemElement.classList.add("removing");
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  cartState.items = cartState.items.filter((item) => item.id !== productId);

  if (isLoggedIn()) {
    try {
      await fetch(`${API_BASE_URL}/cart/remove/${productId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Error al eliminar del carrito:", error);
    }
  }

  await syncCartToStorage();
  updateCartDisplay();
  await calculateTotals();
  updateCartBadgeGlobal();
}

// Actualizar cantidad
async function updateQuantity(productId, change) {
  const item = cartState.items.find((item) => item.id === productId);
  if (!item) return;

  const newQuantity = item.quantity + change;

  if (newQuantity <= 0) {
    await removeFromCart(productId);
    return;
  }

  // Verificar stock
  if (item.stock && newQuantity > item.stock) {
    Swal.fire({
      title: "Stock limitado",
      text: `Solo hay ${item.stock} unidades disponibles`,
      icon: "warning",
      confirmButtonColor: "#8B5E3C",
    });
    return;
  }

  item.quantity = newQuantity;

  if (isLoggedIn()) {
    try {
      await fetch(`${API_BASE_URL}/cart/quantity`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, quantity: newQuantity }),
      });
    } catch (error) {
      console.error("Error al actualizar cantidad:", error);
    }
  }

  await syncCartToStorage();
  updateCartDisplay();
  await calculateTotals();
  updateCartBadgeGlobal();
}

function validateCartBeforePayment() {
  if (cartState.items.length === 0) {
    Swal.fire({
      title: "¡Carrito vacío!",
      text: "Agrega productos al carrito antes de pagar.",
      icon: "warning",
      confirmButtonText: "Continuar",
      confirmButtonColor: "#8B5E3C",
    });
    return false;
  }

  if (!isLoggedIn()) {
    Swal.fire({
      title: "Inicia sesión",
      text: "Necesitas iniciar sesión para continuar con la compra",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Iniciar sesión",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8B5E3C",
    }).then((result) => {
      if (result.isConfirmed) {
        // Guardar la intención de ir al checkout
        sessionStorage.setItem("pendingAction", "checkout");
        window.location.href = "/PAGES/login.html";
      }
    });
    return false;
  }

  return true;
}

// Agregar event listener al botón de pagar (respaldo)
document.addEventListener("DOMContentLoaded", function () {
  const payButton = document.querySelector(
    '.btn-next[href="/PAGES/generalPayment.html"]'
  );
  if (payButton) {
    payButton.addEventListener("click", function (e) {
      if (!validateCartBeforePayment()) {
        e.preventDefault();
      }
    });
  }
});

// Función para mostrar la notificación
function showCopyNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `copy-notification ${type}`;
  notification.innerHTML = `
            <i class="fa-solid fa-${
              type === "success" ? "check" : "xmark"
            }"></i>
            ${message}
        `;

  notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === "success" ? "#4CAF50" : "#f44336"};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Exportar para uso global
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.moveToWishlist = moveToWishlist;
window.applyCoupon = applyCoupon;
window.toggleCoupon = toggleCoupon;
window.removeCoupon = removeCoupon;
