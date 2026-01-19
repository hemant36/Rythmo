// ===== REGISTRO DE USUARIO =====
document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.querySelector(".register-form form");
  if (!registerForm) return;

  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = registerForm.querySelector('input[type="text"]').value.trim();
    const email = registerForm
      .querySelector('input[type="email"]')
      .value.trim();
    const password = registerForm.querySelector('input[type="password"]').value;
    const passwordConfirm = registerForm.querySelector(
      "#registerPasswordConfirm"
    ).value;
    const country = registerForm.querySelector("select#country").value;

    if (password !== passwordConfirm) {
      Swal.fire({
        icon: "error",
        title: "Contraseñas no coinciden",
        text: "Asegúrate de escribir la misma contraseña en ambos campos",
        confirmButtonText: "Cerrar",
      });
      registerForm.querySelector("#registerPasswordConfirm").value = "";
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, country }),
      });
      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: "success",
          title: "¡Registro exitoso!",
          text: "Tu cuenta ha sido creada correctamente.",
          confirmButtonText: "Continuar",
        }).then(() => {
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
          // Guardar el nombre del usuario
          localStorage.setItem("userName", name);
          // Guardar el usuario actual
          localStorage.setItem("currentUser", name);
          registerForm.reset();
          window.location.href = "/PAGES/index.html";
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error de registro",
          text: data.message || "Error al registrar el usuario",
          confirmButtonText: "Cerrar",
        });
        // Si el usuario ya existe, limpiar email y contraseña
        if (
          data.message &&
          data.message.toLowerCase().includes("usuario ya existe")
        ) {
          registerForm.querySelector('input[type="email"]').value = "";
          registerForm.querySelector('input[type="password"]').value = "";
          registerForm.querySelector("#registerPasswordConfirm").value = "";
        }
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor. Intenta más tarde.",
        confirmButtonText: "Cerrar",
      });
    }
  });
});
