// ===== UTILIDADES DEL CARRITO (COMPARTIDO EN TODAS LAS PÁGINAS) =====

// Obtener la clave del carrito para el usuario actual
function getCartStorageKey() {
  const userEmail =
    localStorage.getItem("currentUser") ||
    sessionStorage.getItem("currentUser");
  if (userEmail) {
    return `rythmo_cart_${userEmail}`;
  }
  return "rythmo_cart_guest"; // Para usuarios no logueados
}

// Obtener carrito de localStorage
function getCartFromStorage() {
  try {
    const cart = localStorage.getItem(getCartStorageKey());
    return cart ? JSON.parse(cart) : [];
  } catch (e) {
    console.error("Error al leer carrito:", e);
    return [];
  }
}

// Guardar carrito en localStorage
function saveCartToStorage(items) {
  try {
    localStorage.setItem(getCartStorageKey(), JSON.stringify(items));
  } catch (e) {
    console.error("Error al guardar carrito:", e);
  }
}

// Agregar producto al carrito
function addProductToCart(product) {
  const cart = getCartFromStorage();

  // Verificar si el producto ya existe
  const existingIndex = cart.findIndex((item) => item.id === product.id);

  if (existingIndex !== -1) {
    // Verificar stock antes de incrementar
    const currentStock = product.stock || cart[existingIndex].stock || Infinity;
    if (cart[existingIndex].quantity >= currentStock) {
      return { cart, added: false, reason: "stock_exceeded" };
    }
    // Incrementar cantidad y actualizar stock si viene nuevo
    cart[existingIndex].quantity += 1;
    if (product.stock) {
      cart[existingIndex].stock = product.stock;
    }
  } else {
    // Agregar nuevo producto con cantidad 1
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || "/IMAGES/TiredCat_No-bg.png",
      category: product.category || "General",
      stock: product.stock || Infinity,
      quantity: 1,
    });
  }

  saveCartToStorage(cart);
  updateCartBadgeGlobal();
  return { cart, added: true };
}

// Obtener cantidad total de items en el carrito
function getCartItemCount() {
  const cart = getCartFromStorage();
  return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

// Actualizar badge del carrito (funciona en cualquier página)
function updateCartBadgeGlobal() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const totalItems = getCartItemCount();

  if (totalItems === 0) {
    badge.style.display = "none";
  } else {
    badge.style.display = "inline-block";
    badge.textContent = totalItems > 99 ? "99+" : totalItems;
  }
}

// Limpiar carrito
function clearCart() {
  localStorage.removeItem(getCartStorageKey());
  updateCartBadgeGlobal();
}

// Inicializar badge al cargar la página
document.addEventListener("DOMContentLoaded", function () {
  updateCartBadgeGlobal();
});

// Exportar funciones globales
window.getCartFromStorage = getCartFromStorage;
window.saveCartToStorage = saveCartToStorage;
window.addProductToCart = addProductToCart;
window.getCartItemCount = getCartItemCount;
window.updateCartBadgeGlobal = updateCartBadgeGlobal;
window.clearCart = clearCart;
