// // Usuario actual
// const userId = localStorage.getItem("currentUser");
// const FONT_KEY = `fontSize_${userId}`;
// const THEME_KEY = `theme_${userId}`;

// // Elementos
// const icon = document.getElementById("accessibility-icon");
// const panel = document.getElementById("accessibility-panel");

// const increaseBtn = document.getElementById("increase-text");
// const decreaseBtn = document.getElementById("decrease-text");

// const lightBtn = document.getElementById("light-mode-btn");
// const darkBtn = document.getElementById("dark-mode-btn");

// const resetBtn = document.getElementById("reset-accessibility");

// // Preferencias guardadas
// let fontSize = parseFloat(localStorage.getItem(FONT_KEY)) || 1;
// let theme = localStorage.getItem(THEME_KEY) || "light";

// // Aplicar preferencias
// function applyPreferences() {
//     document.documentElement.style.fontSize = fontSize + "rem";

//     if (theme === "dark") {
//         document.body.classList.add("dark-mode");
//     } else {
//         document.body.classList.remove("dark-mode");
//     }
// }

// applyPreferences();

// // Mostrar / ocultar panel (flotante)
// icon.addEventListener("click", () => {
//     panel.classList.toggle("hidden");
// });

// // AUMENTAR TEXTO
// increaseBtn.addEventListener("click", () => {
//     fontSize += 0.1;
//     localStorage.setItem(FONT_KEY, fontSize);
//     applyPreferences();
// });

// // REDUCIR TEXTO
// decreaseBtn.addEventListener("click", () => {
//     fontSize -= 0.1;
//     if (fontSize < 0.6) fontSize = 0.6;
//     localStorage.setItem(FONT_KEY, fontSize);
//     applyPreferences();
// });

// // MODO CLARO
// lightBtn.addEventListener("click", () => {
//     theme = "light";
//     localStorage.setItem(THEME_KEY, theme);
//     applyPreferences();
// });

// // MODO OSCURO
// darkBtn.addEventListener("click", () => {
//     theme = "dark";
//     localStorage.setItem(THEME_KEY, theme);
//     applyPreferences();
// });

// // RESTABLECER
// resetBtn.addEventListener("click", () => {
//     localStorage.removeItem(FONT_KEY);
//     localStorage.removeItem(THEME_KEY);

//     fontSize = 1;
//     theme = "light";

//     applyPreferences();
// });

document.addEventListener("DOMContentLoaded", () => {
  // ============================
  //       DATOS DEL USUARIO
  // ============================
  const userId = localStorage.getItem("currentUser");

  // Si no hay usuario, no guardar por usuario (modo visitante)
  const storageKey = userId ? `accessibility_${userId}` : "accessibility_guest";

  // ============================
  //       CARGAR PREFERENCIAS
  // ============================
  function loadPreferences() {
    const saved = JSON.parse(localStorage.getItem(storageKey));

    if (!saved) return;

    // Tema
    if (saved.theme === "dark") {
      document.body.classList.add("dark-mode");
    }

    // Tamaño de texto
    if (saved.fontSize) {
      document.documentElement.style.fontSize = saved.fontSize + "%";
    }
  }

  // Guardar preferencias actuales
  function savePreferences() {
    const data = {
      theme: document.body.classList.contains("dark-mode") ? "dark" : "light",
      fontSize: parseInt(
        document.documentElement.style.fontSize.replace("%", "") || 100
      ),
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  loadPreferences(); // Ejecutar al cargar

  // ============================
  //      CONTROLES DOM
  // ============================
  const panel = document.getElementById("accessibility-panel");
  const icon = document.getElementById("accessibility-icon");

  const increaseBtn = document.getElementById("increase-text");
  const decreaseBtn = document.getElementById("decrease-text");
  const resetBtn = document.getElementById("reset-accessibility");
  const lightBtn = document.getElementById("light-mode-btn");
  const darkBtn = document.getElementById("dark-mode-btn");

  // ============================
  //   ABRIR / CERRAR PANEL
  // ============================
  icon.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    // Activar escucha global para cerrar el panel al hacer clic fuera
    if (!panel.classList.contains("hidden")) {
      document.addEventListener("mousedown", closePanelOnOutsideClick);
    }
  });

  function closePanelOnOutsideClick(e) {
    // Si el panel está abierto y el clic no fue dentro del panel ni en el icono
    if (
      !panel.classList.contains("hidden") &&
      !panel.contains(e.target) &&
      e.target !== icon
    ) {
      panel.classList.add("hidden");
      document.removeEventListener("mousedown", closePanelOnOutsideClick);
    }
  }

  // ============================
  //    CAMBIAR TAMAÑO DE TEXTO
  // ============================
  let fontSize = parseInt(
    document.documentElement.style.fontSize.replace("%", "") || 100
  );

  increaseBtn.addEventListener("click", () => {
    fontSize = Math.min(fontSize + 10, 160);
    document.documentElement.style.fontSize = fontSize + "%";
    savePreferences();
  });

  decreaseBtn.addEventListener("click", () => {
    fontSize = Math.max(fontSize - 10, 60);
    document.documentElement.style.fontSize = fontSize + "%";
    savePreferences();
  });

  // ============================
  //       MODO CLARO/OSCURO
  // ============================
  lightBtn.addEventListener("click", () => {
    document.body.classList.remove("dark-mode");
    savePreferences();
    if (typeof window.refreshDashboardCharts === "function") {
      window.refreshDashboardCharts();
    }
  });

  darkBtn.addEventListener("click", () => {
    document.body.classList.add("dark-mode");
    savePreferences();
    if (typeof window.refreshDashboardCharts === "function") {
      window.refreshDashboardCharts();
    }
  });

  // ============================
  //         RESTABLECER
  // ============================
  resetBtn.addEventListener("click", () => {
    document.body.classList.remove("dark-mode");
    document.documentElement.style.fontSize = "100%";

    localStorage.removeItem(storageKey);

    // Refrescar gráficas al restablecer
    if (typeof window.refreshDashboardCharts === "function") {
      window.refreshDashboardCharts();
    }
  });
});
