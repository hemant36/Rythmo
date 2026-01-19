// ===== UTILIDADES DE LA WISHLIST (COMPARTIDO EN TODAS LAS PÁGINAS) =====

// Bandera para indicar si la sincronización inicial está completa
let wishlistSyncComplete = false;
let syncPromise = null;

// Obtener la clave de la wishlist para el usuario actual
function getWishlistStorageKey() {
  const userEmail =
    localStorage.getItem("currentUser") ||
    sessionStorage.getItem("currentUser");
  if (userEmail) {
    return `rythmo_wishlist_${userEmail}`;
  }
  return "rythmo_wishlist_guest"; // Para usuarios no logueados
}

// Obtener wishlist de localStorage
function getWishlistFromStorage() {
  try {
    const wishlist = localStorage.getItem(getWishlistStorageKey());
    return wishlist ? JSON.parse(wishlist) : [];
  } catch (e) {
    console.error("Error al leer wishlist:", e);
    return [];
  }
}

// Guardar wishlist en localStorage
function saveWishlistToStorage(items) {
  try {
    localStorage.setItem(getWishlistStorageKey(), JSON.stringify(items));
  } catch (e) {
    console.error("Error al guardar wishlist:", e);
  }
}

// Sincronizar wishlist desde servidor a localStorage (para usuarios logueados)
async function syncWishlistFromServer() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) {
    wishlistSyncComplete = true;
    return;
  }

  try {
    const API_URL =
      typeof API_BASE_URL !== "undefined"
        ? API_BASE_URL
        : "http://localhost:3000/api";
    const response = await fetch(`${API_URL}/wishlist`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (data.success && data.items && data.items.length > 0) {
      // Guardar datos del servidor en localStorage
      const items = data.items.map((item) => ({
        id: parseInt(item.productId),
        name: item.name,
        price: parseFloat(item.price),
        image: item.image || "/IMAGES/TiredCat_No-bg.png",
        category: item.category,
        stock: item.stock || 10,
        onSale: item.onSale || false,
      }));
      saveWishlistToStorage(items);
      updateWishlistBadgeGlobal();
    }
  } catch (error) {
    console.error("Error al sincronizar wishlist desde servidor:", error);
  } finally {
    wishlistSyncComplete = true;
  }
}

// Esperar a que la sincronización esté completa
async function waitForSync() {
  if (wishlistSyncComplete) return;
  if (syncPromise) {
    await syncPromise;
  }
}

// Agregar producto a la wishlist
async function addProductToWishlist(product) {
  // Esperar a que la sincronización inicial esté completa
  await waitForSync();

  const wishlist = getWishlistFromStorage();

  // Asegurar que el ID sea número para comparación consistente
  const productId = parseInt(product.id);

  // Verificar si el producto ya existe
  const existingIndex = wishlist.findIndex(
    (item) => parseInt(item.id) === productId
  );

  if (existingIndex !== -1) {
    // Ya existe, no agregar duplicado
    return {
      added: false,
      message: "Este producto ya está en tu lista de deseos",
    };
  }

  // Agregar nuevo producto al localStorage
  wishlist.push({
    id: productId,
    name: product.name,
    price: product.price,
    image: product.image || "/IMAGES/TiredCat_No-bg.png",
    category: product.category || "General",
    stock: product.stock || 10,
    onSale: product.onSale || false,
  });

  saveWishlistToStorage(wishlist);
  updateWishlistBadgeGlobal();

  // Si el usuario está logueado, también sincronizar con el servidor
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    try {
      const API_URL =
        typeof API_BASE_URL !== "undefined"
          ? API_BASE_URL
          : "http://localhost:3000/api";
      await fetch(`${API_URL}/wishlist/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product.id }),
      });
    } catch (error) {
      console.error("Error al sincronizar wishlist con servidor:", error);
    }
  }

  return { added: true, message: "Producto agregado a tu lista de deseos" };
}

// Eliminar producto de la wishlist
async function removeProductFromWishlist(productId) {
  let wishlist = getWishlistFromStorage();
  const id = parseInt(productId);
  wishlist = wishlist.filter((item) => parseInt(item.id) !== id);
  saveWishlistToStorage(wishlist);
  updateWishlistBadgeGlobal();

  // Si el usuario está logueado, también sincronizar con el servidor
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    try {
      const API_URL =
        typeof API_BASE_URL !== "undefined"
          ? API_BASE_URL
          : "http://localhost:3000/api";
      await fetch(`${API_URL}/wishlist/remove/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Error al sincronizar eliminación con servidor:", error);
    }
  }

  return wishlist;
}

// Verificar si un producto está en la wishlist
function isProductInWishlist(productId) {
  const wishlist = getWishlistFromStorage();
  const id = parseInt(productId);
  return wishlist.some((item) => parseInt(item.id) === id);
}

// Obtener cantidad total de items en la wishlist
function getWishlistItemCount() {
  const wishlist = getWishlistFromStorage();
  return wishlist.length;
}

// Actualizar badge de la wishlist (funciona en cualquier página)
function updateWishlistBadgeGlobal() {
  const badge = document.getElementById("wishlist-badge");
  if (!badge) return;

  const totalItems = getWishlistItemCount();

  if (totalItems === 0) {
    badge.style.display = "none";
  } else {
    badge.style.display = "inline-block";
    badge.textContent = totalItems > 99 ? "99+" : totalItems;
  }
}

// Limpiar wishlist
function clearWishlistStorage() {
  localStorage.removeItem(getWishlistStorageKey());
  updateWishlistBadgeGlobal();
}

// Inicializar badge al cargar la página y sincronizar si está logueado
document.addEventListener("DOMContentLoaded", function () {
  // Sincronizar wishlist desde servidor si el usuario está logueado
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    syncPromise = syncWishlistFromServer();
  } else {
    wishlistSyncComplete = true;
  }
  updateWishlistBadgeGlobal();
});

// Exportar funciones globales
window.getWishlistFromStorage = getWishlistFromStorage;
window.saveWishlistToStorage = saveWishlistToStorage;
window.addProductToWishlist = addProductToWishlist;
window.removeProductFromWishlist = removeProductFromWishlist;
window.isProductInWishlist = isProductInWishlist;
window.getWishlistItemCount = getWishlistItemCount;
window.updateWishlistBadgeGlobal = updateWishlistBadgeGlobal;
window.clearWishlistStorage = clearWishlistStorage;
window.syncWishlistFromServer = syncWishlistFromServer;
