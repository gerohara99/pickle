document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
      }

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        await login(email, password);
      } catch (err) {
        console.error("Login failed:", err);
      }
    });
  }
});
