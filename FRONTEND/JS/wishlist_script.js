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

// Estado de la wishlist
let wishlistState = {
  items: [],
};

// Elementos del DOM
const wishlistContainer = document.getElementById("wishlist-container");
const wishlistBadge = document.getElementById("wishlist-badge");

// Inicialización
document.addEventListener("DOMContentLoaded", async function () {
  // Cargar moneda del usuario primero
  if (typeof loadUserCurrency === "function") {
    await loadUserCurrency();
  }
  await loadWishlist();
  updateWishlistBadge();
});

// Cargar wishlist desde localStorage o servidor
async function loadWishlist() {
  if (isLoggedIn()) {
    try {
      const response = await fetch(`${API_BASE_URL}/wishlist`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success && data.items && data.items.length > 0) {
        // Usar datos del servidor
        wishlistState.items = data.items.map((item) => ({
          id: item.productId,
          name: item.name,
          price: parseFloat(item.price),
          image: item.image || "/IMAGES/TiredCat_No-bg.png",
          category: item.category,
          stock: item.stock || 0,
        }));
        // Sincronizar con localStorage
        saveWishlistToStorage(wishlistState.items);
      } else {
        // El servidor no tiene datos, cargar de localStorage y sincronizar
        loadWishlistFromLocalStorage();
        // Si hay datos en localStorage, sincronizarlos al servidor
        if (wishlistState.items.length > 0) {
          await syncLocalToServer();
        }
      }
    } catch (error) {
      console.error("Error al cargar wishlist del servidor:", error);
      loadWishlistFromLocalStorage();
    }
  } else {
    loadWishlistFromLocalStorage();
  }

  // Actualizar el stock de los productos desde el servidor
  await updateWishlistStock();

  updateWishlistDisplay();
}

// Actualizar stock de productos en la wishlist desde el servidor
async function updateWishlistStock() {
  if (wishlistState.items.length === 0) return;

  try {
    // Obtener IDs de productos en la wishlist
    const productIds = wishlistState.items.map((item) => item.id);

    // Consultar stock actual de los productos
    const response = await fetch(`${API_BASE_URL}/products`);
    const data = await response.json();

    if (data.success && data.products) {
      // Actualizar stock de cada producto en la wishlist
      wishlistState.items = wishlistState.items.map((item) => {
        const product = data.products.find(
          (p) => parseInt(p.id) === parseInt(item.id)
        );
        if (product) {
          return {
            ...item,
            stock: product.stock || 0,
            price: parseFloat(product.price) || item.price,
            name: product.name || item.name,
          };
        }
        return { ...item, stock: 0 }; // Si no se encuentra, marcar como sin stock
      });

      // Guardar los datos actualizados
      saveWishlistToStorage(wishlistState.items);
    }
  } catch (error) {
    console.error("Error al actualizar stock de wishlist:", error);
  }
}

// Sincronizar datos de localStorage al servidor
async function syncLocalToServer() {
  if (!isLoggedIn() || wishlistState.items.length === 0) return;

  try {
    await fetch(`${API_BASE_URL}/wishlist/sync`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ items: wishlistState.items }),
    });
  } catch (error) {
    console.error("Error al sincronizar con servidor:", error);
  }
}

function loadWishlistFromLocalStorage() {
  const savedWishlist = getWishlistFromStorage();
  if (savedWishlist && savedWishlist.length > 0) {
    wishlistState.items = savedWishlist;
  } else {
    wishlistState.items = [];
  }
}

// Sincronizar cambios con localStorage y servidor
async function syncWishlistToStorage() {
  saveWishlistToStorage(wishlistState.items);
  updateWishlistBadgeGlobal();

  if (isLoggedIn()) {
    try {
      await fetch(`${API_BASE_URL}/wishlist/sync`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ items: wishlistState.items }),
      });
    } catch (error) {
      console.error("Error al sincronizar wishlist con servidor:", error);
    }
  }
}

// Actualizar display de la wishlist
function updateWishlistDisplay() {
  if (!wishlistContainer) return;

  if (wishlistState.items.length === 0) {
    wishlistContainer.innerHTML = `
            <div class="empty-wishlist-message">
                <i class="fa-solid fa-heart"></i>
                <p>Tu lista de deseos está vacía</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">Agrega productos que te gusten</p>
                <a href="/PAGES/catalogo.html" class="btn">
                    <i class="fa-solid fa-guitar"></i>
                    Explorar Catálogo
                </a>
            </div>
        `;
    return;
  }

  // Agregar contador de productos
  const wishlistSummary = `
        <div class="wishlist-summary">
            <div class="wishlist-count">
                ${wishlistState.items.length} producto${
    wishlistState.items.length > 1 ? "s" : ""
  } en la lista de deseos
            </div>
        </div>
    `;

  wishlistContainer.innerHTML =
    wishlistSummary +
    wishlistState.items
      .map((item) => {
        const stockStatus = getStockStatus(item.stock);
        const stockText = getStockText(item.stock);
        const isOutOfStock = item.stock === 0;

        return `
        <div class="wishlist-item ${
          isOutOfStock ? "out-of-stock" : ""
        }" data-id="${item.id}">
            
            <img src="${item.image}" alt="${item.name}" 
                 onerror="this.src='/IMAGES/TiredCat_No-bg.png'">
            
            <div class="wishlist-info">
                <strong>${item.name}</strong>
                <span class="wishlist-category">${
                  item.category || "General"
                }</span>
                <div class="wishlist-price">${
                  typeof formatPrice === "function"
                    ? formatPrice(item.price)
                    : "$" + item.price.toFixed(2)
                }</div>
                
                <span class="wishlist-stock ${stockStatus}">${stockText}</span>
                
                ${
                  isOutOfStock
                    ? '<div class="restock-notice">Próximamente disponible</div>'
                    : ""
                }
            </div>
            
            <div class="wishlist-actions-item">
                <button class="add-to-cart-btn ${
                  isOutOfStock ? "btn-disabled" : ""
                }" 
                    onclick="${
                      isOutOfStock
                        ? "showOutOfStockAlert('" +
                          item.name.replace(/'/g, "\\'") +
                          "')"
                        : "addToCartFromWishlist(" + item.id + ")"
                    }" 
                    ${isOutOfStock ? "disabled" : ""} title="${
          isOutOfStock ? "Producto agotado" : "Agregar al carrito"
        }">
                    <i class="fa-solid fa-${
                      isOutOfStock ? "ban" : "cart-plus"
                    }"></i>
                    ${isOutOfStock ? "Sin stock" : "Agregar al carrito"}
                </button>
                <button class="remove-wishlist-btn" onclick="removeFromWishlist(${
                  item.id
                })" title="Eliminar de la lista">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
        `;
      })
      .join("");
}

// Función auxiliar para estado de stock
function getStockStatus(stock) {
  if (stock === 0) return "stock-out";
  if (stock <= 2) return "stock-low";
  return "stock-available";
}

function getStockText(stock) {
  if (stock === 0) return "Agotado";
  if (stock <= 2) return "Últimas unidades";
  return "Disponible";
}

// Mostrar alerta de producto sin stock
function showOutOfStockAlert(productName) {
  Swal.fire({
    title: "Producto sin stock",
    text: `"${productName}" no está disponible actualmente. Te notificaremos cuando vuelva a estar en stock.`,
    icon: "warning",
    confirmButtonColor: "#8B5E3C",
    confirmButtonText: "Entendido",
  });
}

// Agregar producto al carrito desde la wishlist
async function addToCartFromWishlist(productId) {
  const id = parseInt(productId);
  const item = wishlistState.items.find((item) => parseInt(item.id) === id);
  if (!item) return;

  // Validar stock antes de agregar
  if (!item.stock || item.stock <= 0) {
    Swal.fire({
      title: "Producto agotado",
      text: `"${item.name}" no tiene stock disponible en este momento`,
      icon: "warning",
      confirmButtonColor: "#8B5E3C",
    });
    return;
  }

  // Verificar si ya hay en el carrito y si excede el stock
  const cart =
    typeof getCartFromStorage === "function" ? getCartFromStorage() : [];
  const cartItem = cart.find((c) => parseInt(c.id) === id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  if (currentQuantity >= item.stock) {
    Swal.fire({
      title: "Stock limitado",
      text: `Solo hay ${item.stock} unidad(es) disponible(s) de "${item.name}" y ya tienes ${currentQuantity} en tu carrito`,
      icon: "warning",
      confirmButtonColor: "#8B5E3C",
    });
    return;
  }

  if (isLoggedIn()) {
    try {
      // Mover de wishlist a carrito en el servidor
      await fetch(`${API_BASE_URL}/wishlist/move-to-cart/${productId}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Error al mover al carrito:", error);
    }
  }

  // Agregar al carrito local también
  addProductToCart({
    id: item.id,
    name: item.name,
    price: item.price,
    image: item.image,
    category: item.category,
    stock: item.stock,
  });

  Swal.fire({
    title: "¡Agregado al carrito!",
    text: `"${item.name}" ha sido agregado a tu carrito`,
    icon: "success",
    timer: 1500,
    showConfirmButton: false,
  });

  // Animación de confirmación
  const itemElement = document.querySelector(
    `.wishlist-item[data-id="${productId}"]`
  );
  if (itemElement) {
    itemElement.classList.add("adding");
    setTimeout(() => {
      itemElement.classList.remove("adding");
    }, 600);
  }
}

// Eliminar producto de la wishlist
async function removeFromWishlist(productId) {
  const id = parseInt(productId);
  const item = wishlistState.items.find((item) => parseInt(item.id) === id);
  if (!item) return;

  const result = await Swal.fire({
    title: "¿Eliminar de la lista?",
    text: `¿Quieres eliminar "${item.name}" de tu lista de deseos?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#8B5E3C",
  });

  if (result.isConfirmed) {
    const itemElement = document.querySelector(
      `.wishlist-item[data-id="${productId}"]`
    );
    if (itemElement) {
      itemElement.classList.add("removing");
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    wishlistState.items = wishlistState.items.filter((i) => i.id !== productId);

    if (isLoggedIn()) {
      try {
        await fetch(`${API_BASE_URL}/wishlist/remove/${productId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
      } catch (error) {
        console.error("Error al eliminar de wishlist:", error);
      }
    }

    await syncWishlistToStorage();
    updateWishlistDisplay();
    updateWishlistBadge();

    Swal.fire({
      title: "Eliminado",
      text: "Producto removido de tu lista de deseos",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
  }
}

// Limpiar toda la wishlist
async function clearWishlist() {
  if (wishlistState.items.length === 0) {
    Swal.fire({
      title: "Lista vacía",
      text: "Tu lista de deseos ya está vacía",
      icon: "info",
      timer: 1500,
      showConfirmButton: false,
    });
    return;
  }

  const result = await Swal.fire({
    title: "¿Limpiar lista completa?",
    text: `¿Estás seguro de que quieres eliminar todos los productos (${wishlistState.items.length}) de tu lista de deseos?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, limpiar todo",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#8B5E3C",
  });

  if (result.isConfirmed) {
    wishlistState.items = [];

    if (isLoggedIn()) {
      try {
        await fetch(`${API_BASE_URL}/wishlist/clear`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
      } catch (error) {
        console.error("Error al limpiar wishlist:", error);
      }
    }

    await syncWishlistToStorage();
    updateWishlistDisplay();
    updateWishlistBadge();

    Swal.fire({
      title: "¡Lista limpiada!",
      text: "Todos los productos han sido eliminados de tu lista de deseos",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
  }
}

// Agregar todos los productos disponibles al carrito
async function addAllToCart() {
  // Filtrar productos con stock disponible
  const availableItems = wishlistState.items.filter(
    (item) => item.stock && item.stock > 0
  );

  if (availableItems.length === 0) {
    Swal.fire({
      title: "No hay productos disponibles",
      text: "Todos los productos en tu lista están actualmente agotados",
      icon: "warning",
      confirmButtonColor: "#8B5E3C",
    });
    return;
  }

  // Verificar cuántos realmente se pueden agregar (considerando el carrito actual)
  const cart =
    typeof getCartFromStorage === "function" ? getCartFromStorage() : [];
  const itemsToAdd = [];
  const itemsSkipped = [];

  for (const item of availableItems) {
    const cartItem = cart.find((c) => parseInt(c.id) === parseInt(item.id));
    const currentQuantity = cartItem ? cartItem.quantity : 0;

    if (currentQuantity < item.stock) {
      itemsToAdd.push(item);
    } else {
      itemsSkipped.push(item.name);
    }
  }

  if (itemsToAdd.length === 0) {
    Swal.fire({
      title: "No se pueden agregar productos",
      text: "Todos los productos disponibles ya están en tu carrito con la cantidad máxima de stock",
      icon: "warning",
      confirmButtonColor: "#8B5E3C",
    });
    return;
  }

  let confirmText = `¿Quieres agregar ${itemsToAdd.length} producto${
    itemsToAdd.length > 1 ? "s" : ""
  } a tu carrito?`;
  if (itemsSkipped.length > 0) {
    confirmText += `\n\n${itemsSkipped.length} producto(s) no se agregarán por falta de stock.`;
  }

  const result = await Swal.fire({
    title: "¿Agregar al carrito?",
    text: confirmText,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, agregar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#8B5E3C",
  });

  if (result.isConfirmed) {
    // Agregar los productos que sí tienen stock disponible
    for (const item of itemsToAdd) {
      if (isLoggedIn()) {
        try {
          await fetch(`${API_BASE_URL}/cart/add`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ productId: item.id, quantity: 1 }),
          });
        } catch (error) {
          console.error("Error al agregar al carrito:", error);
        }
      }

      addProductToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        category: item.category,
        stock: item.stock,
      });
    }

    let successMessage = `${itemsToAdd.length} producto${
      itemsToAdd.length > 1 ? "s" : ""
    } agregado${itemsToAdd.length > 1 ? "s" : ""} a tu carrito`;
    if (itemsSkipped.length > 0) {
      successMessage += `. ${itemsSkipped.length} omitido(s) por stock.`;
    }

    Swal.fire({
      title: "¡Productos agregados!",
      text: successMessage,
      icon: "success",
      timer: 2500,
      showConfirmButton: false,
    });

    // Animación para los items agregados
    itemsToAdd.forEach((item) => {
      const itemElement = document.querySelector(
        `.wishlist-item[data-id="${item.id}"]`
      );
      if (itemElement) {
        itemElement.classList.add("adding");
        setTimeout(() => {
          itemElement.classList.remove("adding");
        }, 600);
      }
    });
  }
}

// Actualizar badge de la wishlist
function updateWishlistBadge() {
  if (!wishlistBadge) return;

  const totalItems = wishlistState.items.length;

  if (totalItems === 0) {
    wishlistBadge.style.display = "none";
  } else {
    wishlistBadge.style.display = "inline-block";
    wishlistBadge.textContent = totalItems > 99 ? "99+" : totalItems.toString();
  }
}

// Función para agregar producto a la wishlist (desde otras páginas)
async function addToWishlist(product) {
  // Verificar si el producto ya está en la wishlist
  const existingItem = wishlistState.items.find(
    (item) => item.id === product.id
  );

  if (existingItem) {
    Swal.fire({
      title: "Ya en tu lista",
      text: "Este producto ya está en tu lista de deseos",
      icon: "info",
      timer: 1500,
      showConfirmButton: false,
    });
    return;
  }

  // Agregar al servidor si está logueado
  if (isLoggedIn()) {
    try {
      await fetch(`${API_BASE_URL}/wishlist/add`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId: product.id }),
      });
    } catch (error) {
      console.error("Error al agregar a wishlist:", error);
    }
  }

  // Agregar producto a la wishlist local
  wishlistState.items.push(product);
  await syncWishlistToStorage();
  updateWishlistBadge();

  Swal.fire({
    title: "¡Agregado a favoritos!",
    text: "Producto agregado a tu lista de deseos",
    icon: "success",
    timer: 1500,
    showConfirmButton: false,
  });
}

// Exportar funciones para uso global
window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;
window.clearWishlist = clearWishlist;
window.addAllToCart = addAllToCart;
window.addToCartFromWishlist = addToCartFromWishlist;
window.showOutOfStockAlert = showOutOfStockAlert;
