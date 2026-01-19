// ===== CONFIGURACIÓN DE API =====
const API_BASE_URL = "http://localhost:3000/api";

// Estado del catálogo
let catalogState = {
  products: [],
  filteredProducts: [],
  currentFilter: "all",
};

// Elementos del DOM
const productsGrid = document.getElementById("products-grid");
const filterButtons = document.querySelectorAll(".filter-btn");

// Inicialización
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Cargar moneda del usuario primero (si está disponible)
    if (typeof loadUserCurrency === "function") {
      try {
        await loadUserCurrency();
        // Actualizar placeholders con símbolo de moneda
        updatePriceFilterPlaceholders();
      } catch (e) {
        console.warn("Error cargando moneda, usando MXN por defecto:", e);
      }
    }
    await loadProducts();
    setupEventListeners();
  } catch (error) {
    console.error("Error en inicialización del catálogo:", error);
    showErrorMessage();
  }
});

// Actualizar placeholders de filtro de precio con símbolo de moneda
function updatePriceFilterPlaceholders() {
  const symbol =
    typeof getCurrencySymbol === "function" ? getCurrencySymbol() : "$";
  const minInput = document.getElementById("price-min");
  const maxInput = document.getElementById("price-max");
  if (minInput) minInput.placeholder = `${symbol} Mín`;
  if (maxInput) maxInput.placeholder = `${symbol} Máx`;
}

// Cargar productos desde la API
async function loadProducts() {
  try {
    // Mostrar loading
    if (productsGrid) {
      productsGrid.innerHTML = `
        <div class="loading-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i>
          <p style="color: var(--text-muted);">Cargando productos...</p>
        </div>
      `;
    }

    const response = await fetch(`${API_BASE_URL}/products`);
    const data = await response.json();

    if (Array.isArray(data)) {
      catalogState.products = data.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description || "",
        price: parseFloat(product.price),
        category: product.category,
        image: product.image || "",
        stock: product.stock || 0,
        onSale: product.isFeatured === 1 || product.isFeatured === true,
        discount: parseInt(product.discount) || 0,
      }));
      catalogState.filteredProducts = catalogState.products;
      renderProducts();
    } else {
      console.error("Formato de respuesta inesperado:", data);
      showErrorMessage();
    }
  } catch (error) {
    console.error("Error al cargar productos:", error);
    showErrorMessage();
  }
}

// Mostrar mensaje de error
function showErrorMessage() {
  if (productsGrid) {
    productsGrid.innerHTML = `
      <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <i class="fa-solid fa-exclamation-triangle" style="font-size: 4rem; color: var(--accent); margin-bottom: 20px;"></i>
        <h3 style="color: var(--text-muted); margin-bottom: 15px;">Error al cargar productos</h3>
        <p style="color: var(--text-light);">Por favor intenta de nuevo más tarde.</p>
        <button onclick="loadProducts()" class="btn" style="margin-top: 20px;">
          <i class="fa-solid fa-refresh"></i> Reintentar
        </button>
      </div>
    `;
  }
}

// Renderizar productos
function renderProducts() {
  if (catalogState.filteredProducts.length === 0) {
    productsGrid.innerHTML = `
                    <div class="empty-catalog-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                        <i class="fa-solid fa-music" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 20px;"></i>
                        <h3 style="color: var(--text-muted); margin-bottom: 15px;">No hay productos en esta categoría</h3>
                        <p style="color: var(--text-light);">Prueba con otra categoría o vuelve más tarde.</p>
                    </div>
                `;
    return;
  }

  productsGrid.innerHTML = catalogState.filteredProducts
    .map((product) => {
      const stockStatus = getStockStatus(product.stock);
      const stockText = getStockText(product.stock);
      const isOutOfStock = product.stock === 0;

      // Calcular precio con descuento si aplica
      const hasDiscount = product.onSale && product.discount > 0;
      const discountedPrice = hasDiscount
        ? product.price * (1 - product.discount / 100)
        : product.price;

      // Formatear precios
      const currentPriceFormatted =
        typeof formatPrice === "function"
          ? formatPrice(discountedPrice)
          : "$" + discountedPrice.toFixed(2);
      const originalPriceFormatted =
        typeof formatPrice === "function"
          ? formatPrice(product.price)
          : "$" + product.price.toFixed(2);

      return `
                <div class="product-card" data-category="${product.category}">
                    ${
                      product.onSale
                        ? `<span class="product-badge sale-badge"><i class="fa-solid fa-tag"></i> ${
                            product.discount > 0
                              ? `-${product.discount}%`
                              : "En Oferta"
                          }</span>`
                        : ""
                    }
                    <img src="${product.image}" alt="${
        product.name
      }" class="product-image"
                         onerror="this.src='https://via.placeholder.com/300x200/F8F3EB/8B5E3C?text=🎵'">
                    <div class="product-info">

                        <div class="product-top">
                            <div class="product-category">${formatCategory(
                              product.category
                            )}</div>
                            <h3 class="product-name">${product.name}</h3>
                            <p class="product-description">${
                              product.description
                            }</p>
                        </div>

                        <div class="product-bottom">
                            <div class="product-price ${
                              hasDiscount ? "has-discount" : ""
                            }">
                                ${
                                  hasDiscount
                                    ? `<span class="original-price">${originalPriceFormatted}</span>`
                                    : ""
                                }
                                <span class="current-price">${currentPriceFormatted}</span>
                            </div>
                            <div class="product-stock ${stockStatus}">
                                <i class="fa-solid ${
                                  isOutOfStock
                                    ? "fa-circle-xmark"
                                    : "fa-circle-check"
                                }"></i>
                                ${stockText}
                            </div>
                            <div class="product-actions">
                                <button class="btn btn-primary" onclick="addToCart(${
                                  product.id
                                })" 
                                    ${isOutOfStock ? "disabled" : ""}>
                                    <i class="fa-solid fa-cart-plus"></i>
                                    ${isOutOfStock ? "Agotado" : "Agregar"}
                                </button>
                                <button class="btn btn-secondary" onclick="addToWishlist(${
                                  product.id
                                })">
                                    <i class="fa-regular fa-heart"></i>
                                    Favorito
                                </button>
                            </div>
                        </div>

                    </div>

                </div>
                `;
    })
    .join("");
}

// Configurar event listeners
function setupEventListeners() {
  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const filter = this.getAttribute("data-filter");

      // Actualizar botones activos
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      // Aplicar filtro
      applyFilter(filter);
    });
  });
}

// Aplicar filtro
function applyFilter(filter) {
  catalogState.currentFilter = filter;
  applyAllFilters();
}

// Aplicar todos los filtros combinados
function applyAllFilters() {
  let filtered = catalogState.products;

  // Filtro por categoría
  if (catalogState.currentFilter !== "all") {
    filtered = filtered.filter(
      (product) =>
        product.category.toLowerCase() ===
        catalogState.currentFilter.toLowerCase()
    );
  }

  // Filtro por rango de precio
  // El usuario ingresa precios en SU moneda, debemos convertirlos a MXN para comparar
  const minPriceInput =
    parseFloat(document.getElementById("price-min")?.value) || 0;
  const maxPriceInput =
    parseFloat(document.getElementById("price-max")?.value) || Infinity;

  if (minPriceInput > 0 || maxPriceInput < Infinity) {
    // Obtener tasa de conversión: rate es cuánto vale 1 MXN en la moneda del usuario
    // Ej: USD rate = 0.058, significa 1 MXN = 0.058 USD
    // Para convertir de USD a MXN: dividir por rate
    const userCurrencyData =
      typeof getUserCurrency === "function" ? getUserCurrency() : { rate: 1 };
    const rate = userCurrencyData.rate || 1;

    // Convertir los precios del filtro (en moneda del usuario) a MXN
    const minPriceMXN = rate > 0 ? minPriceInput / rate : minPriceInput;
    const maxPriceMXN =
      rate > 0 && maxPriceInput !== Infinity
        ? maxPriceInput / rate
        : maxPriceInput;

    filtered = filtered.filter((product) => {
      // Calcular precio efectivo en MXN (con descuento si aplica)
      const effectivePrice =
        product.onSale && product.discount > 0
          ? product.price * (1 - product.discount / 100)
          : product.price;
      return effectivePrice >= minPriceMXN && effectivePrice <= maxPriceMXN;
    });
  }

  // Filtro por ofertas
  const onlyOnSale = document.getElementById("filter-featured")?.checked;
  if (onlyOnSale) {
    filtered = filtered.filter((product) => product.onSale === true);
  }

  catalogState.filteredProducts = filtered;
  renderProducts();
}

// Aplicar filtro de precio
function applyPriceFilter() {
  applyAllFilters();
}

// Limpiar todos los filtros
function clearAllFilters() {
  // Reset categoría
  catalogState.currentFilter = "all";
  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector('.filter-btn[data-filter="all"]')
    ?.classList.add("active");

  // Reset precio
  const minInput = document.getElementById("price-min");
  const maxInput = document.getElementById("price-max");
  if (minInput) minInput.value = "";
  if (maxInput) maxInput.value = "";

  // Reset ofertas
  const featuredCheckbox = document.getElementById("filter-featured");
  if (featuredCheckbox) featuredCheckbox.checked = false;

  // Mostrar todos
  catalogState.filteredProducts = catalogState.products;
  renderProducts();
}

// Funciones auxiliares
function getStockStatus(stock) {
  if (stock === 0) return "stock-out";
  if (stock <= 2) return "stock-low";
  return "stock-available";
}

function getStockText(stock) {
  if (stock === 0) return "Agotado";
  if (stock <= 2) return `Últimas ${stock} unidades`;
  return "Disponible";
}

function formatCategory(category) {
  const categories = {
    instrumentos: "Instrumento",
    albumes: "Álbum",
    discos: "Disco de Vinilo",
  };
  return categories[category] || category;
}

// Función para verificar si el usuario está logueado
function isUserLoggedIn() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  return !!token;
}

// Función para guardar producto pendiente y redirigir al login
function savePendingProductAndRedirect(productId, action) {
  const product = catalogState.products.find((p) => p.id === productId);
  if (product) {
    const pendingProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      action: action, // 'cart' o 'wishlist'
    };
    localStorage.setItem("pendingProduct", JSON.stringify(pendingProduct));
  }
  window.location.href = "/PAGES/login.html";
}

// Función para mostrar alerta de login requerido
function showLoginRequiredAlert(action, productId) {
  Swal.fire({
    title: "Inicio de sesión requerido",
    text: `Necesitas iniciar sesión para ${
      action === "cart"
        ? "agregar productos al carrito"
        : "agregar productos a tu lista de deseos"
    }`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Iniciar sesión",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#8B5E3C",
    cancelButtonColor: "#6c757d",
    background: "#F8F3EB",
    color: "#2B1E14",
  }).then((result) => {
    if (result.isConfirmed) {
      savePendingProductAndRedirect(productId, action);
    }
  });
}

// Funciones de interacción
function addToCart(productId) {
  // Verificar si el usuario está logueado
  if (!isUserLoggedIn()) {
    showLoginRequiredAlert("cart", productId);
    return;
  }

  // Asegurar que productId sea número para la comparación
  const id = parseInt(productId);
  const product = catalogState.products.find((p) => p.id === id);
  if (product) {
    // Verificar stock antes de agregar
    const cart = getCartFromStorage();
    const existingItem = cart.find((item) => item.id === id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;

    if (currentQuantity >= product.stock) {
      Swal.fire({
        title: "Stock limitado",
        text: `Solo hay ${product.stock} unidades disponibles de este producto`,
        icon: "warning",
        confirmButtonColor: "#8B5E3C",
      });
      return;
    }

    // Agregar al carrito usando el sistema global
    addProductToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      stock: product.stock,
    });

    Swal.fire({
      title: "¡Producto agregado!",
      text: `${product.name} se agregó al carrito`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
      background: "#F8F3EB",
      color: "#2B1E14",
    });
  }
}

async function addToWishlist(productId) {
  // Verificar si el usuario está logueado
  if (!isUserLoggedIn()) {
    showLoginRequiredAlert("wishlist", productId);
    return;
  }

  // Asegurar que productId sea número para la comparación
  const id = parseInt(productId);
  const product = catalogState.products.find((p) => p.id === id);
  if (product) {
    // Agregar a la wishlist usando el sistema global (await porque es async)
    const result = await addProductToWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      stock: product.stock,
    });

    if (result.added) {
      Swal.fire({
        title: "¡Agregado a favoritos!",
        text: `${product.name} se agregó a tu lista de deseos`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        background: "#F8F3EB",
        color: "#2B1E14",
      });
    } else {
      Swal.fire({
        title: "Ya en tu lista",
        text: result.message,
        icon: "info",
        timer: 2000,
        showConfirmButton: false,
        background: "#F8F3EB",
        color: "#2B1E14",
      });
    }
  }
}

// updateCartBadge -> usar la función global de cartUtils.js
function updateCartBadge() {
  if (typeof updateCartBadgeGlobal === "function") {
    updateCartBadgeGlobal();
  }
}

function showCopyNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `copy-notification ${type}`;
  notification.innerHTML = `
        <i class="fa-solid fa-${type === "success" ? "check" : "xmark"}"></i>
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

// Hacer funciones globales para los onclick
window.addToCart = addToCart;
window.addToWishlist = addToWishlist;
