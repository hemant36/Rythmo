// ===== CONFIGURACIÓN Y ESTADO GLOBAL =====
// Guarda el estado de la página actual y configuración
const AppState = {
  currentPage: "dashboard",
  pages: {
    dashboard: {
      title: "Dashboard",
      desc: "Bienvenido al panel de administración",
    },
    agregar: {
      title: "Agregar Producto",
      desc: "Añade nuevos productos al catálogo",
    },
    actualizar: {
      title: "Actualizar Producto",
      desc: "Modifica información de productos existentes",
    },
    eliminar: {
      title: "Eliminar Producto",
      desc: "Gestiona la eliminación de productos",
    },
    clientes: {
      title: "Gestión de Clientes",
      desc: "Administra la información de clientes",
    },
    pedidos: {
      title: "Gestión de Pedidos",
      desc: "Revisa y gestiona los pedidos",
    },
  },
};

// ===== INICIALIZACIÓN =====
document.addEventListener("DOMContentLoaded", function () {
  setupEventListeners();
  // Limpiar imagen al resetear el formulario de agregar producto
  const addForm = document.getElementById("add-product-form");
  if (addForm) {
    addForm.addEventListener("reset", function () {
      const previewImg = document.getElementById("image-preview");
      if (previewImg) {
        previewImg.classList.add("hidden");
        previewImg.src = "";
      }
      const imageInput = document.getElementById("product-image");
      if (imageInput) {
        imageInput.value = "";
      }
      // Ocultar campo de descuento al resetear
      const discountRow = document.getElementById("discount-row");
      if (discountRow) {
        discountRow.style.display = "none";
      }
    });
  }

  // Mostrar/ocultar campo de descuento según checkbox "En Oferta"
  const featuredCheckbox = document.getElementById("product-featured");
  const discountRow = document.getElementById("discount-row");
  if (featuredCheckbox && discountRow) {
    featuredCheckbox.addEventListener("change", function () {
      discountRow.style.display = this.checked ? "block" : "none";
      if (!this.checked) {
        document.getElementById("product-discount").value = "0";
      }
    });
  }

  loadDashboardData();
  setupImageUpload();
  // Actualizar nombre del admin en el dashboard
  const userName =
    localStorage.getItem("userName") ||
    sessionStorage.getItem("userName") ||
    "Administrador";
  const userNameSpan = document.querySelector(".user-name");
  if (userNameSpan) {
    userNameSpan.textContent = userName;
  }

  // Mostrar estadísticas solo si es admin
  const role = localStorage.getItem("role") || sessionStorage.getItem("role");
  if (role === "admin") {
    fetchTotalSales();
    fetchSalesByCategory();
    fetchMostSoldProducts();
    fetchTotalOrders();
    fetchInventoryByCategory();
  }

  // Mostrar clientes al cargar la sección
  if (document.getElementById("clients-list")) {
    fetchClients();
  }

  // Exponer función para refrescar gráficas al cambiar tema
  window.refreshDashboardCharts = function () {
    // Refrescar siempre si los contenedores existen
    const salesChart = document.getElementById("sales-chart");
    const productsChart = document.getElementById("products-chart");

    if (salesChart || productsChart) {
      fetchSalesByCategory();
      fetchMostSoldProducts();
    }
  };
});

// Detecta cambio de sección y carga pedidos automáticamente
function setupSectionListeners() {
  document.querySelectorAll(".menu-item[data-page]").forEach((item) => {
    item.addEventListener("click", function () {
      const page = item.getAttribute("data-page");

      // Ignorar el logout -> se maneja en handleNavigation
      if (page === "logout") {
        return;
      }

      document.querySelectorAll(".page-section").forEach((sec) => {
        sec.classList.remove("active");
      });
      const targetSection = document.getElementById(page + "-section");
      if (targetSection) {
        targetSection.classList.add("active");
      }
      // Si es la sección de pedidos, carga la tabla
      if (page === "pedidos") {
        fetchAndRenderOrders();
      }
      // Si es el dashboard, recargar las gráficas
      if (page === "dashboard") {
        fetchSalesByCategory();
        fetchMostSoldProducts();
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  setupSectionListeners();
});

// ===============================
//    TOTAL DE PEDIDOS EN DASHBOARD
// ===============================
function fetchTotalOrders() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  fetch("http://localhost:3000/api/orders", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("role");
        sessionStorage.removeItem("role");
        localStorage.removeItem("userName");
        sessionStorage.removeItem("userName");
        localStorage.removeItem("currentUser");
        sessionStorage.removeItem("currentUser");
        Swal.fire({
          icon: "warning",
          title: "Sesión expirada",
          text: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
        }).then(() => {
          window.location.href = "/PAGES/login.html";
        });
        return;
      }
      const orders = await res.json();
      // Solo contar pedidos que NO están enviados
      const pendingOrders = orders.filter(
        (order) => order.status !== "enviado"
      );
      const totalOrders = document.getElementById("total-orders");
      if (totalOrders) {
        totalOrders.textContent = pendingOrders.length;
      }
    })
    .catch(() => {
      const totalOrders = document.getElementById("total-orders");
      if (totalOrders) totalOrders.textContent = "0";
    });
}

// ===============================
//    MOSTRAR CLIENTES EN DASHBOARD
// ===============================
function fetchClients() {
  fetch("http://localhost:3000/api/users")
    .then(async (res) => {
      const allUsers = await res.json();
      // Filtrar solo clientes (excluir admins)
      const clients = allUsers.filter((user) => user.role !== "admin");
      renderClientsTable(clients);
    })
    .catch(() => {
      renderClientsTable([]);
    });
}

function renderClientsTable(clients) {
  const container = document.getElementById("clients-list");
  if (!container) return;
  if (!clients.length) {
    container.innerHTML =
      "<div class='loading'>No hay clientes registrados.</div>";
    return;
  }
  let html = `<table class='clients-table' style='width:100%;'><thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>País</th></tr></thead><tbody>`;
  clients.forEach((client) => {
    html += `<tr>
      <td style='padding-left:32px;'>${client.id}</td>
      <td>${client.name}</td>
      <td>${client.email}</td>
      <td>${client.country || ""}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  container.innerHTML = html;
}
// Consulta el total de ventas
function fetchTotalSales() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  fetch("http://localhost:3000/api/products/sales/total", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then(async (res) => {
      if (res.status === 401) {
        // Token expirado o inválido
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("role");
        sessionStorage.removeItem("role");
        localStorage.removeItem("userName");
        sessionStorage.removeItem("userName");
        localStorage.removeItem("currentUser");
        sessionStorage.removeItem("currentUser");
        Swal.fire({
          icon: "warning",
          title: "Sesión expirada",
          text: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
        }).then(() => {
          window.location.href = "/PAGES/login.html";
        });
        return;
      }
      const data = await res.json();
      const totalSales = document.getElementById("total-sales");
      if (totalSales && data.total_sales) {
        totalSales.textContent = `$${Number(data.total_sales).toLocaleString(
          "es-MX",
          { minimumFractionDigits: 2 }
        )}`;
      }
    })
    .catch(() => {
      const totalSales = document.getElementById("total-sales");
      if (totalSales) totalSales.textContent = "$0.00";
    });
}

// Consulta inventario por categoría
function fetchInventoryByCategory() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const container = document.getElementById("inventory-report");
  if (!container) return;

  fetch("http://localhost:3000/api/products/inventory/category", {
    headers: { Authorization: "Bearer " + token },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Error al cargar inventario");
      const data = await res.json();
      renderInventoryReport(data);
    })
    .catch(() => {
      container.innerHTML = "<p>No se pudo cargar el inventario.</p>";
    });
}

// Renderiza tabla de inventario por producto en las tres categorías
function renderInventoryReport(data) {
  const container = document.getElementById("inventory-report");
  if (!container || !data.length) {
    if (container) container.innerHTML = "<p>No hay datos de inventario.</p>";
    return;
  }

  const categoryNames = {
    instrumentos: "Instrumentos",
    albumes: "Álbumes",
    discos: "Discos",
  };

  // Agrupar productos por categoría
  const grouped = {};
  data.forEach((product) => {
    const cat = product.category?.toLowerCase() || "otros";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(product);
  });

  let html = "";

  // Renderizar una tabla por cada categoría
  Object.keys(grouped).forEach((category) => {
    const products = grouped[category];
    const catName = categoryNames[category] || category;
    const totalStock = products.reduce(
      (sum, p) => sum + (parseInt(p.stock) || 0),
      0
    );

    html += `
    <div class="inventory-category">
      <h3 class="inventory-category-title">${catName} <span class="category-total">(${products.length} productos - ${totalStock} unidades)</span></h3>
      <table class="inventory-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Producto</th>
            <th>Precio</th>
            <th>Existencias</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>`;

    products.forEach((product) => {
      const stock = parseInt(product.stock) || 0;
      let statusClass = "status-ok";
      let statusText = "Disponible";

      if (stock === 0) {
        statusClass = "status-danger";
        statusText = "Agotado";
      } else if (stock <= 3) {
        statusClass = "status-warning";
        statusText = "Stock bajo";
      }

      html += `
          <tr>
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>$${parseFloat(product.price).toFixed(2)}</td>
            <td class="${stock === 0 ? "text-danger" : ""}">${stock}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          </tr>`;
    });

    html += `
        </tbody>
      </table>
    </div>`;
  });

  container.innerHTML = html;
}

// Consulta ventas por categoría
function fetchSalesByCategory() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  fetch("http://localhost:3000/api/products/sales/category", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("role");
        sessionStorage.removeItem("role");
        localStorage.removeItem("userName");
        sessionStorage.removeItem("userName");
        localStorage.removeItem("currentUser");
        sessionStorage.removeItem("currentUser");
        Swal.fire({
          icon: "warning",
          title: "Sesión expirada",
          text: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
        }).then(() => {
          window.location.href = "/PAGES/login.html";
        });
        return;
      }
      const data = await res.json();
      // Espera que data sea un array de objetos
      const categories = data.map((item) => item.category);
      const totals = data.map((item) => item.total_sales);
      renderSalesPieChart(categories, totals);
    })
    .catch(() => {
      const chartContainer = document.getElementById("sales-chart");
      if (chartContainer)
        chartContainer.innerHTML = "<p>No se pudo cargar la gráfica.</p>";
    });
}

// Consulta los productos más vendidos y muestra la gráfica
function fetchMostSoldProducts() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  fetch("http://localhost:3000/api/products/sales/most-sold", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("role");
        sessionStorage.removeItem("role");
        localStorage.removeItem("userName");
        sessionStorage.removeItem("userName");
        localStorage.removeItem("currentUser");
        sessionStorage.removeItem("currentUser");
        Swal.fire({
          icon: "warning",
          title: "Sesión expirada",
          text: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
        }).then(() => {
          window.location.href = "/PAGES/login.html";
        });
        return;
      }
      const data = await res.json();
      // Espera que data sea un array de objetos
      const productNames = data.map((item) => item.name);
      const quantities = data.map((item) => item.quantity);
      renderMostSoldProductsChart(productNames, quantities);
    })
    .catch(() => {
      const chartContainer = document.getElementById("products-chart");
      if (chartContainer)
        chartContainer.innerHTML = "<p>No se pudo cargar la gráfica.</p>";
    });
}

// Renderiza la gráfica de barras de productos más vendidos
function renderMostSoldProductsChart(labels, data) {
  const chartContainer = document.getElementById("products-chart");
  if (!chartContainer) return;
  chartContainer.innerHTML =
    '<canvas id="mostSoldProductsChart" style="max-width:400px;margin:auto;"></canvas>';
  const ctx = document.getElementById("mostSoldProductsChart").getContext("2d");
  // Detectar modo oscuro
  const isDark = document.body.classList.contains("dark-mode");
  const barColors = isDark
    ? [
        "#4F46E5",
        "#6366F1",
        "#8B5CF6",
        "#A78BFA",
        "#7C3AED",
        "#6D28D9",
        "#C026D3",
        "#9333EA",
      ]
    : ["#8D5524"];
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Cantidad Vendida",
          data: data,
          backgroundColor: labels.map(
            (_, i) => barColors[i % barColors.length]
          ),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              let value = context.parsed.y || 0;
              return `${label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Producto",
          },
        },
        y: {
          title: {
            display: true,
            text: "Cantidad Vendida",
          },
          beginAtZero: true,
          ticks: {
            precision: 0,
            callback: function (value) {
              return Math.round(value);
            },
          },
        },
      },
    },
  });
}

// Renderiza la gráfica de pastel en el dashboard
function renderSalesPieChart(labels, data) {
  const chartContainer = document.getElementById("sales-chart");
  if (!chartContainer) return;
  chartContainer.innerHTML =
    '<canvas id="salesPieChart" style="max-width:400px;margin:auto;"></canvas>';
  const ctx = document.getElementById("salesPieChart").getContext("2d");
  const isDark = document.body.classList.contains("dark-mode");
  const pieColors = isDark
    ? [
        "#6366F1",
        "#8B5CF6",
        "#A78BFA",
        "#7C3AED",
        "#6D28D9",
        "#C026D3",
        "#9333EA",
        "#4F46E5",
      ]
    : ["#8D5524", "#C68642", "#E0AC69", "#F6E2B3", "#A47551", "#BCA18D"];
  const intData = data.map((num) => Math.round(Number(num)));
  const capitalizedLabels = labels.map(
    (label) => label.charAt(0).toUpperCase() + label.slice(1)
  );
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: capitalizedLabels,
      datasets: [
        {
          data: intData,
          backgroundColor: capitalizedLabels.map(
            (_, i) => pieColors[i % pieColors.length]
          ),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label || "";
              let value = context.parsed || 0;
              return `${label}: $${value}`;
            },
          },
        },
      },
    },
  });
}

function setupEventListeners() {
  // Navegación del sidebar
  const menuItems = document.querySelectorAll(".menu-item[data-page]");
  menuItems.forEach((item) => {
    item.addEventListener("click", handleNavigation);
  });

  // Formulario de agregar producto
  const addForm = document.getElementById("add-product-form");
  if (addForm) {
    addForm.addEventListener("submit", handleAddProduct);
  }

  // Búsqueda de productos
  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", handleSearchProduct);
  }
}

function setupImageUpload() {
  const imageInput = document.getElementById("product-image");
  const uploadBox = document.getElementById("image-upload-box");
  const previewImg = document.getElementById("image-preview");

  // Abrir selector al hacer clic en la caja
  if (uploadBox) {
    uploadBox.addEventListener("click", () => {
      imageInput.click();
    });
  }

  // Cambiar vista previa cuando seleccionan imagen
  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];
      if (!file) return;

      // Validar que sea una imagen
      if (!file.type.match("image.*")) {
        showNotification(
          "Por favor selecciona un archivo de imagen válido",
          "error"
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        previewImg.src = reader.result;
        previewImg.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    });
  }
}

// Nueva función para enviar imagen al servidor
function uploadProductImage(imageFile) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("File[0]", imageFile);

    console.log("Enviando imagen al servidor...");
    console.log("Archivo:", imageFile.name, "Tamaño:", imageFile.size);

    fetch("http://localhost:3000/api/images/upload", {
      method: "POST",
      body: formData,
      headers: {
        Authorization:
          "Bearer " +
          (localStorage.getItem("token") || sessionStorage.getItem("token")),
      },
    })
      .then((response) => {
        console.log("Respuesta recibida:", response.status);

        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.error || response.statusText);
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("✓ Respuesta del servidor:", data);
        resolve(data);
      })
      .catch((error) => {
        console.error("Error al subir imagen:", error);
        reject(error);
      });
  });
}

function handleNavigation(event) {
  const menuItem = event.currentTarget;
  const page = menuItem.dataset.page;

  if (page === "logout") {
    handleLogout();
    return;
  }

  showPage(page);
  updateActiveMenu(menuItem);
}

// ===== NAVEGACIÓN DE PÁGINAS =====
function showPage(page) {
  // Ocultar todas las secciones
  const sections = document.querySelectorAll(".page-section");
  sections.forEach((section) => {
    section.classList.remove("active");
  });

  // Mostrar sección seleccionada
  const targetSection = document.getElementById(`${page}-section`);
  if (targetSection) {
    targetSection.classList.add("active");
  }

  // Actualiza el encabezado
  updateHeader(page);

  // Cargar datos de la página en la que se está
  loadPageData(page);

  // Actualizar estado
  AppState.currentPage = page;
}

// ===== ACTUALIZACIÓN DE INTERFAZ =====
function updateActiveMenu(activeItem) {
  // Remover clase active de todos los items
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.classList.remove("active");
  });

  // Agregar clase active al item seleccionado
  activeItem.classList.add("active");
}

// Actualiza el título y descripción del encabezado
function updateHeader(page) {
  const pageInfo = AppState.pages[page];
  if (pageInfo) {
    document.getElementById("page-title").textContent = pageInfo.title;
    document.getElementById("page-desc").textContent = pageInfo.desc;
  }
}

// ===== FUNCIONES DE DATOS =====
function loadDashboardData() {
  // Cargar productos para actualizar contador
  fetch("http://localhost:3000/api/products")
    .then((response) => response.json())
    .then((products) => {
      const totalProducts = document.getElementById("total-products");
      if (totalProducts) {
        totalProducts.textContent = products.length;
      }
    })
    .catch((error) => console.error("Error al cargar productos:", error));

  // Cargar clientes para actualizar contador
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  fetch("http://localhost:3000/api/admin/usuarios", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((response) => response.json())
    .then((clients) => {
      console.log("Usuarios recibidos:", clients);
      // Solo cuenta los usuarios con rol "user" o "cliente"
      const total = Array.isArray(clients)
        ? clients.filter((u) => u.role === "user" || u.role === "cliente")
            .length
        : 0;
      const totalCustomers = document.getElementById("total-customers");
      if (totalCustomers) {
        totalCustomers.textContent = total;
      }
    })
    .catch((error) => {
      const totalCustomers = document.getElementById("total-customers");
      if (totalCustomers) totalCustomers.textContent = "0";
      console.error("Error al cargar clientes:", error);
    });
}

// Cargar datos específicos para cada página
function loadPageData(page) {
  switch (page) {
    case "agregar":
      const addForm = document.getElementById("add-product-form");
      if (addForm) addForm.reset();
      const previewImg = document.getElementById("image-preview");
      if (previewImg) {
        previewImg.classList.add("hidden");
        previewImg.src = "";
      }
      break;
    case "actualizar":
      const searchInput = document.getElementById("search-product");
      if (searchInput) searchInput.value = "";
      break;
    case "eliminar":
      loadProductsForDeletion();
      break;
    case "clientes":
      loadClients();
      break;
  }
}

async function loadClients() {
  const container = document.getElementById("clients-list");

  // Mostrar loading
  container.innerHTML =
    '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Cargando clientes...</div>';

  try {
    const response = await fetch("http://localhost:3000/api/users");

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const allUsers = await response.json();
    // Filtrar solo clientes (excluir admins)
    const clients = allUsers.filter((user) => user.role !== "admin");

    // Actualizar contador en el dashboard
    const totalCustomers = document.getElementById("total-customers");
    if (totalCustomers) {
      totalCustomers.textContent = clients.length;
    }

    renderClientsTable(clients);
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    container.innerHTML = "";
    showNotification("Error al cargar clientes: " + error.message, "error");
  }
}

// ===== FUNCIONES AUXILIARES PARA CLIENTES =====
function formatDate(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Fecha inválida";

  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return date.toLocaleDateString("es-MX", options);
}

// ===== MANEJO DE FORMULARIOS =====
function setupForms() {
  // Validación en tiempo real para formularios
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    // Remover el listener de submit genérico para el formulario de agregar producto
    if (form.id === "add-product-form") {
      return;
    }

    form.addEventListener("submit", function (e) {
      if (!validateForm(this)) {
        e.preventDefault();
      }
    });
  });
}

function validateForm(form) {
  const inputs = form.querySelectorAll(
    "input[required], select[required], textarea[required]"
  );
  let isValid = true;

  inputs.forEach((input) => {
    if (!input.value.trim()) {
      showInputError(input, "Este campo es obligatorio");
      isValid = false;
    } else {
      clearInputError(input);
    }
  });

  return isValid;
}

function showInputError(input, message) {
  clearInputError(input);
  input.style.borderColor = "var(--accent)";

  const errorDiv = document.createElement("div");
  errorDiv.className = "input-error";
  errorDiv.style.color = "var(--accent)";
  errorDiv.style.fontSize = "12px";
  errorDiv.style.marginTop = "5px";
  errorDiv.textContent = message;

  input.parentNode.appendChild(errorDiv);
}

function clearInputError(input) {
  input.style.borderColor = "";
  const existingError = input.parentNode.querySelector(".input-error");
  if (existingError) {
    existingError.remove();
  }
}

// ===== MANEJO DE PRODUCTOS =====
async function handleAddProduct(event) {
  console.log("=== Iniciando proceso de agregar producto ===");
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const productData = Object.fromEntries(formData);

  // Validar campos requeridos (nombre, precio, categoria)
  if (
    !productData.nombre?.trim() ||
    !productData.precio ||
    !productData.categoria
  ) {
    showNotification("Por favor completa todos los campos requeridos", "error");
    return;
  }

  // Validar que el precio sea un número válido
  const precio = parseFloat(productData.precio);
  if (isNaN(precio) || precio <= 0) {
    showNotification("El precio debe ser un número mayor a 0", "error");
    return;
  }

  // Mostrar indicador de carga
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
  submitBtn.disabled = true;

  try {
    // 1. Validar imagen
    const imageInput = document.getElementById("product-image");
    if (!imageInput || imageInput.files.length === 0) {
      showNotification(
        "Faltan campos por agregar: Selecciona una imagen del producto.",
        "error"
      );
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      return;
    }

    // 2. Validar producto repetido por nombre (comparar con 'name' del backend)
    const productNombre = productData.nombre?.trim().toLowerCase();
    let existsProduct = false;
    try {
      const productsResp = await fetch("http://localhost:3000/api/products");
      if (productsResp.ok) {
        const products = await productsResp.json();
        existsProduct = products.some(
          (p) => p.name?.trim().toLowerCase() === productNombre
        );
      }
    } catch (err) {}
    if (existsProduct) {
      showNotification(
        "Ya existe un producto con ese nombre. No se puede agregar duplicado.",
        "error"
      );
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      return;
    }

    // 3. Subir imagen
    try {
      const imageData = await uploadProductImage(imageInput.files[0]);
      productData.imagePath = imageData.files[0].filename;
      showNotification("Imagen subida correctamente", "success");
    } catch (error) {
      showNotification(
        "No se pudo subir la imagen: " + error.message,
        "warning"
      );
      productData.imagePath = null;
    }

    // 4. Transformar los nombres de los campos al formato que espera el backend
    const isFeaturedCheckbox = document.getElementById("product-featured");
    const discountInput = document.getElementById("product-discount");
    const productDataBackend = {
      name: productData.nombre,
      price: productData.precio,
      description: productData.descripcion,
      category: productData.categoria,
      stock: productData.stock,
      imagePath: productData.imagePath,
      isFeatured: isFeaturedCheckbox ? isFeaturedCheckbox.checked : false,
      discount: discountInput ? parseInt(discountInput.value) || 0 : 0,
    };

    // Enviar producto al backend
    const response = await fetch("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer " +
          (localStorage.getItem("token") || sessionStorage.getItem("token")),
      },
      body: JSON.stringify(productDataBackend),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error ${response.status}`);
    }

    const result = await response.json();
    showNotification("¡Producto agregado correctamente!", "success");

    // 5. Resetear formulario
    form.reset();

    // 6. Limpiar vista previa de imagen
    const previewImg = document.getElementById("image-preview");
    if (previewImg) {
      previewImg.classList.add("hidden");
      previewImg.src = "";
    }

    // 7. Actualizar contador del dashboard e inventario
    loadDashboardData();
    fetchInventoryByCategory();
  } catch (error) {
    showNotification("Error al agregar producto: " + error.message, "error");
  } finally {
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
  }
}

// ===== FUNCIONES PARA ACTUALIZAR PRODUCTOS =====
// Buscar productos
async function handleSearchProduct() {
  const searchTerm = document.getElementById("search-product").value.trim();

  if (!searchTerm) {
    showNotification("Ingresa un término de búsqueda", "warning");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/api/products/search?nombre=${encodeURIComponent(
        searchTerm
      )}`
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const products = await response.json();

    if (products.length === 0) {
      showNotification("No se encontraron productos con ese nombre", "info");
      document.getElementById("update-product-form").classList.add("hidden");
      return;
    }

    // Mostrar resultados para seleccionar
    displaySearchResults(products);
  } catch (error) {
    console.error("Error al buscar productos:", error);
    showNotification("Error al buscar productos", "error");
  }
}

// Mostrar resultados de búsqueda
function displaySearchResults(products) {
  // Como hay validación de nombres únicos, mostrar directamente el formulario de edición
  if (products.length >= 1) {
    loadProductForUpdate(products[0].id);
  }
}

async function loadProductForUpdate(productId) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/products/${productId}`
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const product = await response.json();
    displayUpdateForm(product);
  } catch (error) {
    console.error("Error al cargar producto:", error);
    showNotification("Error al cargar el producto", "error");
  }
}

// Mostrar formulario de actualización
function displayUpdateForm(product) {
  const formContainer = document.getElementById("update-product-form");

  // Extraer solo el nombre del archivo de la imagen si existe
  let imagePath = "";
  if (product.image) {
    const urlParts = product.image.split("/");
    imagePath = urlParts[urlParts.length - 1];
  }

  const productDiscount = parseInt(product.discount) || 0;

  formContainer.innerHTML = `
        <div class="update-form-container">
            <div class="form-header">
                <h3>Actualizando: ${product.name}</h3>
                <button type="button" class="btn-cancel" onclick="clearUpdateForm()">
                  <i class="fa-solid fa-times"></i> Cancelar
                </button>
            </div>
            
            <form id="update-form" onsubmit="handleUpdateProduct(event, ${
              product.id
            })">
                <div class="form-row">
                    <label for="update-product-name">Nombre</label>
                    <input type="text" id="update-product-name" name="name" value="${
                      product.name
                    }" required>
                </div>

                <div class="form-row">
                    <label for="update-product-price">Precio</label>
                    <input type="number" id="update-product-price" name="price" step="0.01" value="${
                      product.price
                    }" required>
                </div>

                <div class="form-row">
                    <label for="update-product-description">Descripción</label>
                    <textarea id="update-product-description" name="description">${
                      product.description || ""
                    }</textarea>
                </div>

                <div class="form-row">
                    <label for="update-product-category">Categoría</label>
                    <select id="update-product-category" name="category" required>
                        <option value="Discos" ${
                          product.category === "Discos" ? "selected" : ""
                        }>Discos</option>
                        <option value="Albumes" ${
                          product.category === "Albumes" ? "selected" : ""
                        }>Álbumes</option>
                        <option value="Instrumentos" ${
                          product.category === "Instrumentos" ? "selected" : ""
                        }>Instrumentos</option>
                    </select>
                </div>

                <div class="form-row">
                    <label for="update-product-stock">Stock</label>
                    <input type="number" id="update-product-stock" name="stock" value="${
                      product.stock
                    }" required>
                </div>

                <div class="form-row checkbox-row">
                    <label class="checkbox-label">
                        <input type="checkbox" id="update-product-featured" name="isFeatured" ${
                          product.isFeatured ? "checked" : ""
                        } onchange="toggleUpdateDiscount()">
                        <span class="checkbox-custom"></span>
                        <span class="checkbox-text"><i class="fa-solid fa-tag"></i> Producto en Oferta</span>
                    </label>
                    <p class="form-hint">Los productos en oferta aparecerán en la página principal</p>
                </div>

                <div class="form-row discount-row" id="update-discount-row" style="display: ${
                  product.isFeatured ? "block" : "none"
                };">
                    <label for="update-product-discount">Porcentaje de descuento (%)</label>
                    <input type="number" id="update-product-discount" name="discount" min="0" max="99" value="${productDiscount}">
                    <p class="form-hint">Ingresa el % de descuento (0-99). El precio original se mostrará tachado.</p>
                </div>

                <div class="form-row">
                    <label for="update-product-image">Imagen del Producto</label>
                    <input type="file" id="update-product-image" accept="image/*" class="hidden-input">
                    
                    <div class="image-upload-box" id="update-image-upload-box">
                        ${
                          product.image
                            ? `<img id="update-image-preview" class="image-preview" src="${product.image}" alt="Vista previa" style="max-width: 150px; max-height: 150px; object-fit: cover;">
                             <p style="margin-top: 10px;">Haz clic para cambiar la imagen</p>`
                            : `<i class="fa-solid fa-cloud-arrow-up upload-icon"></i>
                             <p>Haz clic para subir una imagen</p>
                             <img id="update-image-preview" class="image-preview hidden" alt="Vista previa">`
                        }
                    </div>
                    <input type="hidden" id="current-image-path" value="${imagePath}">
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fa-solid fa-save"></i> Actualizar Producto
                    </button>
                    <button type="button" class="btn-cancel" onclick="clearUpdateForm()">
                      <i class="fa-solid fa-times"></i> Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;

  formContainer.classList.remove("hidden");

  // Configurar la carga de imagen para el formulario de actualización
  setupUpdateImageUpload();
}

// Función para mostrar/ocultar campo de descuento en formulario de actualización
function toggleUpdateDiscount() {
  const checkbox = document.getElementById("update-product-featured");
  const discountRow = document.getElementById("update-discount-row");
  if (checkbox && discountRow) {
    discountRow.style.display = checkbox.checked ? "block" : "none";
    if (!checkbox.checked) {
      document.getElementById("update-product-discount").value = "0";
    }
  }
}

// Configurar carga de imagen para actualización
function setupUpdateImageUpload() {
  const imageInput = document.getElementById("update-product-image");
  const uploadBox = document.getElementById("update-image-upload-box");
  const previewImg = document.getElementById("update-image-preview");

  if (uploadBox) {
    uploadBox.addEventListener("click", () => {
      imageInput.click();
    });
  }

  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];
      if (!file) return;

      if (!file.type.match("image.*")) {
        showNotification(
          "Por favor selecciona un archivo de imagen válido",
          "error"
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        previewImg.src = reader.result;
        previewImg.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    });
  }
}

// Manejar actualización de producto
async function handleUpdateProduct(event, productId) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const productData = Object.fromEntries(formData);

  // Validar campos
  if (
    !productData.name?.trim() ||
    !productData.price ||
    !productData.category
  ) {
    showNotification("Por favor completa todos los campos requeridos", "error");
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';
  submitBtn.disabled = true;

  try {
    // Verificar si hay nueva imagen
    const imageInput = document.getElementById("update-product-image");
    if (imageInput && imageInput.files.length > 0) {
      console.log("📸 Subiendo nueva imagen...");
      try {
        const imageData = await uploadProductImage(imageInput.files[0]);
        productData.imagePath = imageData.files[0].filename;
        showNotification("Nueva imagen subida", "success");
      } catch (error) {
        console.error("Error al subir nueva imagen:", error);
        showNotification("No se pudo subir la nueva imagen", "warning");
        // Mantener imagen actual
        const currentImagePath =
          document.getElementById("current-image-path").value;
        if (currentImagePath) {
          productData.imagePath = currentImagePath;
        }
      }
    } else {
      // Mantener imagen actual
      const currentImagePath =
        document.getElementById("current-image-path").value;
      if (currentImagePath) {
        productData.imagePath = currentImagePath;
      }
    }

    // Agregar campo isFeatured
    const isFeaturedCheckbox = document.getElementById(
      "update-product-featured"
    );
    productData.isFeatured = isFeaturedCheckbox
      ? isFeaturedCheckbox.checked
      : false;

    // Agregar campo discount
    const discountInput = document.getElementById("update-product-discount");
    productData.discount = discountInput
      ? parseInt(discountInput.value) || 0
      : 0;

    // Enviar actualización
    const response = await fetch(
      `http://localhost:3000/api/products/${productId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer " +
            (localStorage.getItem("token") || sessionStorage.getItem("token")),
        },
        body: JSON.stringify(productData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error ${response.status}`);
    }

    const result = await response.json();
    showNotification("¡Producto actualizado correctamente!", "success");

    // Limpiar formulario
    clearUpdateForm();

    // Actualizar contador del dashboard e inventario
    loadDashboardData();
    fetchInventoryByCategory();
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    showNotification("Error al actualizar producto: " + error.message, "error");
  } finally {
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
  }
}

// Limpiar formulario de actualización
function clearUpdateForm() {
  const formContainer = document.getElementById("update-product-form");
  formContainer.innerHTML = "";
  formContainer.classList.add("hidden");

  const searchInput = document.getElementById("search-product");
  if (searchInput) {
    searchInput.value = "";
  }
}

// Variable global para almacenar todos los productos para eliminación
let allProductsForDeletion = [];

async function loadProductsForDeletion() {
  const container = document.getElementById("delete-products-list");

  // Mostrar loading
  container.innerHTML =
    '<div class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Cargando productos...</div>';

  try {
    const response = await fetch("http://localhost:3000/api/products");

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const products = await response.json();
    allProductsForDeletion = products; // Guardar todos los productos

    // Actualizar contador en el dashboard
    const totalProducts = document.getElementById("total-products");
    if (totalProducts) {
      totalProducts.textContent = products.length;
    }

    // Configurar búsqueda
    setupDeleteSearch();

    displayProductsForDeletion(products);
  } catch (error) {
    console.error("Error al cargar productos:", error);
    container.innerHTML = `
            <div class="error-message">
                <i class="fa-solid fa-exclamation-circle"></i>
                <p>Error al cargar los productos: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadProductsForDeletion()">Reintentar</button>
            </div>
        `;
    showNotification("Error al cargar productos", "error");
  }
}

// Configurar la búsqueda para eliminación
function setupDeleteSearch() {
  const searchInput = document.getElementById("delete-search-input");
  const clearBtn = document.getElementById("clear-delete-search");

  if (searchInput) {
    // Remover listeners anteriores para evitar duplicados
    searchInput.removeEventListener("input", handleDeleteSearch);
    searchInput.addEventListener("input", handleDeleteSearch);
  }

  if (clearBtn) {
    clearBtn.removeEventListener("click", clearDeleteSearch);
    clearBtn.addEventListener("click", clearDeleteSearch);
  }
}

// Manejar búsqueda de productos para eliminar
function handleDeleteSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (searchTerm === "") {
    displayProductsForDeletion(allProductsForDeletion);
    return;
  }

  const filteredProducts = allProductsForDeletion.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm) ||
      (product.category && product.category.toLowerCase().includes(searchTerm))
  );

  displayProductsForDeletion(filteredProducts, searchTerm);
}

// Limpiar búsqueda
function clearDeleteSearch() {
  const searchInput = document.getElementById("delete-search-input");
  if (searchInput) {
    searchInput.value = "";
  }
  displayProductsForDeletion(allProductsForDeletion);
}

// Función para cambiar estado destacado de un producto
async function toggleFeatured(productId, isFeatured) {
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    const response = await fetch(
      `http://localhost:3000/api/products/${productId}/featured`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isFeatured }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || `Error ${response.status}`);
    }

    const result = await response.json();

    // Actualizar el producto en el array local
    const productIndex = allProductsForDeletion.findIndex(
      (p) => p.id === productId
    );
    if (productIndex !== -1) {
      allProductsForDeletion[productIndex].isFeatured = isFeatured;
    }

    // Re-renderizar la lista
    const searchInput = document.getElementById("delete-search-input");
    const searchTerm = searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";

    if (searchTerm) {
      const filteredProducts = allProductsForDeletion.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          (product.category &&
            product.category.toLowerCase().includes(searchTerm))
      );
      displayProductsForDeletion(filteredProducts, searchTerm);
    } else {
      displayProductsForDeletion(allProductsForDeletion);
    }

    showNotification(
      isFeatured ? "Producto marcado en oferta" : "Producto quitado de ofertas",
      "success"
    );
  } catch (error) {
    console.error("Error al actualizar estado de oferta:", error);
    showNotification("Error al actualizar: " + error.message, "error");
  }
}

function displayProductsForDeletion(products, searchTerm = "") {
  const container = document.getElementById("delete-products-list");

  if (!products || products.length === 0) {
    container.innerHTML = `
            <div class="no-data">
                <i class="fa-solid fa-box-open"></i>
                <p>${
                  searchTerm
                    ? `No se encontraron productos con "${searchTerm}"`
                    : "No hay productos para mostrar"
                }</p>
                ${
                  searchTerm
                    ? '<button class="btn btn-ver-todos" onclick="clearDeleteSearch()"><i class="fa-solid fa-arrow-left"></i> Ver todos</button>'
                    : ""
                }
            </div>
        `;
    return;
  }

  container.innerHTML = `
        <div class="products-delete-grid">
            ${products
              .map(
                (product) => `
                <div class="product-delete-card ${
                  product.isFeatured ? "featured" : ""
                }">
                    ${
                      product.isFeatured
                        ? `<div class="featured-badge sale-badge"><i class="fa-solid fa-tag"></i> ${
                            product.discount > 0
                              ? `-${product.discount}%`
                              : "En Oferta"
                          }</div>`
                        : ""
                    }
                    <div class="product-delete-image">
                        ${
                          product.image
                            ? `<img src="${product.image}" alt="${product.name}">`
                            : `<div class="no-image"><i class="fa-solid fa-image"></i></div>`
                        }
                    </div>
                    <div class="product-delete-info">
                        <h3 class="product-delete-name">${product.name}</h3>
                        <span class="product-delete-category">${
                          product.category || "Sin categoría"
                        }</span>
                        <p class="product-delete-price">$${parseFloat(
                          product.price
                        ).toFixed(2)}</p>
                        <p class="product-delete-stock"><i class="fa-solid fa-boxes-stacked"></i> Stock: ${
                          product.stock
                        }</p>
                    </div>
                    <div class="product-delete-actions">
                        <button class="btn btn-featured ${
                          product.isFeatured ? "active" : ""
                        }" onclick="toggleFeatured(${
                  product.id
                }, ${!product.isFeatured})" title="${
                  product.isFeatured ? "Quitar de ofertas" : "Marcar en oferta"
                }">
                            <i class="fa-solid fa-tag"></i>
                        </button>
                        <button class="btn btn-delete" onclick="deleteProduct(${
                          product.id
                        }, '${product.name.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `
              )
              .join("")}
        </div>
        
        <div class="delete-footer">
            <p><i class="fa-solid fa-box"></i> Total de productos: <strong>${
              products.length
            }</strong></p>
            <p><i class="fa-solid fa-tag"></i> En Oferta: <strong>${
              products.filter((p) => p.isFeatured).length
            }</strong></p>
        </div>
    `;
}

async function deleteProduct(productId, productName) {
  const result = await Swal.fire({
    title: "¿Eliminar producto?",
    html: `<p style="margin-bottom: 10px;">Estás a punto de eliminar:</p>
           <strong style="color: #8B5E3C; font-size: 1.1em;">${productName}</strong>
           <p style="margin-top: 15px; color: #C25454; font-size: 0.9em;"><i class="fa-solid fa-exclamation-triangle"></i> Esta acción no se puede deshacer.</p>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#8B5E3C",
    cancelButtonColor: "#6c757d",
    confirmButtonText: '<i class="fa-solid fa-trash"></i> Sí, eliminar',
    cancelButtonText: '<i class="fa-solid fa-xmark"></i> Cancelar',
    reverseButtons: false,
    focusCancel: true,
  });

  if (!result.isConfirmed) {
    return;
  }

  // Mostrar loading mientras se elimina
  Swal.fire({
    title: "Eliminando producto...",
    html: '<i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #8B5E3C;"></i>',
    allowOutsideClick: false,
    showConfirmButton: false,
  });

  try {
    const response = await fetch(
      `http://localhost:3000/api/products/${productId}`,
      {
        method: "DELETE",
        headers: {
          Authorization:
            "Bearer " +
            (localStorage.getItem("token") || sessionStorage.getItem("token")),
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        Swal.fire({
          icon: "error",
          title: "Acceso restringido",
          text: "No tienes permisos para realizar esta acción.",
          confirmButtonColor: "#8B5E3C",
          confirmButtonText: "Cerrar",
        });
        return;
      }

      // Producto con ventas asociadas
      if (response.status === 409 && data.codigo === "TIENE_VENTAS") {
        Swal.fire({
          icon: "warning",
          title: "No se puede eliminar",
          html: `<p style="margin-bottom: 10px;"><strong>"${productName}"</strong> tiene ventas registradas.</p>
                 <p style="color: #666; font-size: 0.9em;">Los productos con historial de ventas no pueden eliminarse para mantener la integridad de los reportes.</p>`,
          confirmButtonColor: "#8B5E3C",
          confirmButtonText: "Entendido",
        });
        return;
      }

      throw new Error(data.mensaje || `Error ${response.status}`);
    }

    Swal.fire({
      icon: "success",
      title: "¡Producto eliminado!",
      text: `"${productName}" ha sido eliminado correctamente.`,
      confirmButtonColor: "#8B5E3C",
      confirmButtonText: "Aceptar",
      timer: 2500,
      timerProgressBar: true,
    });

    // Limpiar la barra de búsqueda
    clearDeleteSearch();

    // Recargar la lista
    loadProductsForDeletion();

    // Actualizar contador del dashboard e inventario
    loadDashboardData();
    fetchInventoryByCategory();
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    Swal.fire({
      icon: "error",
      title: "Error al eliminar",
      text: error.message,
      confirmButtonColor: "#8B5E3C",
      confirmButtonText: "Cerrar",
    });
  }
}

// Función para editar un pedido (solo cambiar status)
function editOrder(orderId) {
  Swal.fire({
    title: "Cambiar estado del pedido",
    input: "select",
    inputOptions: {
      pendiente: "Pendiente",
      enviado: "Enviado",
      cancelado: "Cancelado",
    },
    inputPlaceholder: "Selecciona el nuevo estado",
    showCancelButton: true,
    confirmButtonText: "Actualizar",
    cancelButtonText: "Cancelar",
    inputValidator: (value) => {
      if (!value) return "Debes seleccionar un estado";
    },
  }).then(async (result) => {
    if (result.isConfirmed && result.value) {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await fetch(
          `http://localhost:3000/api/orders/${orderId}/status`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: result.value }),
          }
        );
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Estado actualizado",
            text: "El estado del pedido fue actualizado correctamente",
            confirmButtonText: "Cerrar",
          });
          fetchAndRenderOrders();
          fetchTotalOrders();
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo actualizar el estado del pedido",
            confirmButtonText: "Cerrar",
          });
        }
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error de conexión",
          text: "No se pudo conectar al servidor",
          confirmButtonText: "Cerrar",
        });
      }
    }
  });
}

// Función para borrar un pedido
async function deleteOrder(orderId) {
  const result = await Swal.fire({
    title: "¿Estás seguro?",
    text: "¿Quieres eliminar el pedido ID: " + orderId + "?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#8B5E3C",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });
  if (!result.isConfirmed) return;
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const res = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Pedido eliminado",
        text: "El pedido fue eliminado correctamente",
        confirmButtonText: "Cerrar",
      });
      fetchAndRenderOrders(); // Recarga la tabla
      fetchTotalOrders(); // Actualiza el número de pedidos en dashboard
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al eliminar el pedido",
        confirmButtonText: "Cerrar",
      });
    }
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Error de conexión",
      text: "No se pudo conectar al servidor para eliminar el pedido",
      confirmButtonText: "Cerrar",
    });
  }
}

function updateProductCount(change) {
  const currentCount = parseInt(
    document.getElementById("total-products").textContent
  );
  document.getElementById("total-products").textContent = Math.max(
    0,
    currentCount + change
  );
}

// ===== UTILIDADES =====
function handleLogout() {
  Swal.fire({
    title: "¿Estás seguro de que quieres cerrar sesión?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, cerrar sesión",
    cancelButtonText: "Cancelar",
    reverseButtons: false,
  }).then((result) => {
    if (result.isConfirmed) {
      // Eliminar token y datos de sesión
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.removeItem("role");
      sessionStorage.removeItem("role");
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");

      Swal.fire({
        icon: "success",
        title: "Sesión cerrada correctamente",
        showConfirmButton: false,
        timer: 1200,
      });

      setTimeout(() => {
        window.location.href = "/PAGES/login.html";
      }, 1200);
    }
  });
}

function showNotification(message, type = "info") {
  if (type === "error" || type === "warning" || type === "info") {
    Swal.fire({
      text: message,
      icon: type,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  } else {
    Swal.fire({
      text: message,
      icon: type,
      showConfirmButton: true,
    });
  }
}

// ===== ESTILOS ADICIONALES DINÁMICOS =====
const dynamicStyles = `
    .product-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background: var(--bg-light);
        border-radius: 10px;
        margin-bottom: 10px;
    }
    
    .btn-sm {
        padding: 8px 16px;
        font-size: 12px;
    }
    
    .no-data {
        text-align: center;
        color: var(--text-muted);
        font-style: italic;
        padding: 20px;
    }
    
    .input-error {
        color: var(--accent) !important;
        font-size: 12px !important;
        margin-top: 5px !important;
    }
`;

// Injectar estilos dinámicos
const styleSheet = document.createElement("style");
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// ===============================
//    MOSTRAR PEDIDOS EN DASHBOARD
// ===============================
function fetchOrders() {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  fetch("http://localhost:3000/api/orders", {
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then(async (res) => {
      if (res.status === 401) {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("role");
        sessionStorage.removeItem("role");
        localStorage.removeItem("userName");
        sessionStorage.removeItem("userName");
        localStorage.removeItem("currentUser");
        sessionStorage.removeItem("currentUser");
        Swal.fire({
          icon: "warning",
          title: "Sesión expirada",
          text: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
        }).then(() => {
          window.location.href = "/PAGES/login.html";
        });
        return;
      }
      const orders = await res.json();
      renderOrdersTable(orders);
    })
    .catch(() => {
      renderOrdersTable([]);
    });
}

function renderOrdersTable(orders, usersMap) {
  const container = document.getElementById("orders-list");
  if (!container) return;

  // Guardar orders globalmente para el filtro
  window.allOrders = orders;
  window.usersMap = usersMap || {};

  if (!orders.length) {
    container.innerHTML = `
      <div class='no-orders'>
        <i class="fa-solid fa-box-open"></i>
        <p>No hay pedidos registrados.</p>
      </div>`;
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table class='orders-table'>
        <thead>
          <tr>
            <th><i class="fa-solid fa-hashtag"></i> ID</th>
            <th><i class="fa-solid fa-user"></i> Cliente</th>
            <th><i class="fa-solid fa-box"></i> Productos</th>
            <th><i class="fa-solid fa-dollar-sign"></i> Total</th>
            <th><i class="fa-solid fa-circle-info"></i> Estado</th>
            <th><i class="fa-solid fa-calendar"></i> Fecha</th>
            <th><i class="fa-solid fa-gear"></i> Acciones</th>
          </tr>
        </thead>
        <tbody>`;

  orders.forEach((order) => {
    const cliente =
      usersMap && usersMap[order.userId]
        ? usersMap[order.userId]
        : `Usuario #${order.userId}`;

    // Formatear productos
    let productosHtml = "";
    if (Array.isArray(order.products)) {
      productosHtml = '<div class="order-products">';
      order.products.forEach((p) => {
        const nombreProducto = p.nombre || p.name || `Producto #${p.id}`;
        productosHtml += `
          <div class="product-item">
            <span class="product-qty">x${p.cantidad || p.quantity || 1}</span>
            <span class="product-name" title="${nombreProducto}">${nombreProducto}</span>
          </div>`;
      });
      productosHtml += "</div>";
    } else {
      productosHtml = `<span class="order-products-text">${
        order.products || "Sin productos"
      }</span>`;
    }

    // Formatear fecha
    const fecha = order.date
      ? new Date(order.date).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Sin fecha";

    // Icono para el estado
    const statusIcons = {
      pendiente: "fa-clock",
      procesando: "fa-spinner",
      enviado: "fa-truck",
      entregado: "fa-check-circle",
      cancelado: "fa-times-circle",
    };
    const statusIcon = statusIcons[order.status] || "fa-question-circle";

    html += `
      <tr data-order-id="${
        order.id
      }" data-client="${cliente.toLowerCase()}" data-status="${order.status}">
        <td><span class="order-id">#${order.id}</span></td>
        <td><span class="order-client">${cliente}</span></td>
        <td>${productosHtml}</td>
        <td><span class="order-total">$${parseFloat(order.total).toFixed(
          2
        )}</span></td>
        <td><span class="status-badge ${
          order.status
        }"><i class="fa-solid ${statusIcon}"></i> ${order.status}</span></td>
        <td><span class="order-date">${fecha}</span></td>
        <td class="order-actions">
          <button class="btn btn-primary btn-sm" onclick="editOrder(${
            order.id
          })" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteOrder(${
            order.id
          })" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`;
  });

  html += "</tbody></table></div>";
  container.innerHTML = html;
}

// Función para filtrar pedidos
function filterOrders() {
  const statusFilter = document.getElementById("filter-status")?.value || "";
  const searchText =
    document.getElementById("search-order")?.value?.toLowerCase() || "";

  const rows = document.querySelectorAll(".orders-table tbody tr");

  rows.forEach((row) => {
    const status = row.dataset.status || "";
    const client = row.dataset.client || "";
    const orderId = row.dataset.orderId || "";

    const matchesStatus = !statusFilter || status === statusFilter;
    const matchesSearch =
      !searchText ||
      client.includes(searchText) ||
      orderId.includes(searchText);

    row.style.display = matchesStatus && matchesSearch ? "" : "none";
  });
}

// Función para limpiar filtros de pedidos
function clearOrderFilters() {
  const statusFilter = document.getElementById("filter-status");
  const searchInput = document.getElementById("search-order");

  if (statusFilter) statusFilter.value = "";
  if (searchInput) searchInput.value = "";

  // Mostrar todas las filas
  const rows = document.querySelectorAll(".orders-table tbody tr");
  rows.forEach((row) => {
    row.style.display = "";
  });
}

// Ejemplo de fetch dinámico de pedidos y usuarios
async function fetchAndRenderOrders() {
  try {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    const [ordersRes, usersRes] = await Promise.all([
      fetch("http://localhost:3000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("http://localhost:3000/api/admin/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    const orders = await ordersRes.json();
    const users = await usersRes.json();
    // Crear un mapa id->nombre para mostrar el nombre del cliente
    const usersMap = {};
    users.forEach((u) => {
      usersMap[u.id] = u.name || u.email || u.id;
    });
    renderOrdersTable(orders, usersMap);
  } catch (err) {
    console.error("Error al cargar pedidos o usuarios", err);
    renderOrdersTable([], {});
  }
}
