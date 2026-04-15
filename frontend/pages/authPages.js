import { login, signup } from "../services/authService.js";
import { showToast } from "../components/toast.js";

export function loginPage(app) {
  app.innerHTML = `
    <h1 class="section-title">Login</h1>
    <form id="loginForm" class="card stack fade-in" style="padding:16px;max-width:520px;">
      <input name="email" type="email" placeholder="Email" required>
      <input name="password" type="password" placeholder="Password" required>
      <p id="loginError" class="inline-error"></p>
      <button id="loginBtn" class="btn primary" type="submit">Login</button>
      <p class="muted">Admin demo email: admin@vastra.shop</p>
    </form>
  `;
  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const errorEl = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginBtn");
    errorEl.textContent = "";
    event.target.querySelectorAll("input").forEach((input) => input.classList.remove("field-error"));

    if (!email || !password) {
      errorEl.textContent = "Email and password are required.";
      if (!email) event.target.elements.email.classList.add("field-error");
      if (!password) event.target.elements.password.classList.add("field-error");
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span>';
      await login({
        email,
        password
      });
      showToast("Login Successful");
      location.hash = "#/";
    } catch (error) {
      errorEl.textContent = error.message;
      showToast("Error occurred");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  });
}

export function signupPage(app) {
  app.innerHTML = `
    <h1 class="section-title">Create account</h1>
    <form id="signupForm" class="card stack fade-in" style="padding:16px;max-width:520px;">
      <input name="name" type="text" placeholder="Full name" required>
      <input name="email" type="email" placeholder="Email" required>
      <input name="password" type="password" placeholder="Password" required>
      <p id="signupError" class="inline-error"></p>
      <button id="signupBtn" class="btn primary" type="submit">Signup</button>
    </form>
  `;
  document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const errorEl = document.getElementById("signupError");
    const signupBtn = document.getElementById("signupBtn");
    errorEl.textContent = "";
    event.target.querySelectorAll("input").forEach((input) => input.classList.remove("field-error"));

    if (!name || !email || !password) {
      errorEl.textContent = "All fields are required.";
      if (!name) event.target.elements.name.classList.add("field-error");
      if (!email) event.target.elements.email.classList.add("field-error");
      if (!password) event.target.elements.password.classList.add("field-error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = "Enter a valid email address.";
      event.target.elements.email.classList.add("field-error");
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      event.target.elements.password.classList.add("field-error");
      return;
    }

    try {
      signupBtn.disabled = true;
      signupBtn.innerHTML = '<span class="spinner"></span>';
      await signup({
        name,
        email,
        password
      });
      showToast("Account created");
      location.hash = "#/";
    } catch (error) {
      errorEl.textContent = error.message;
      showToast("Error occurred");
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = "Signup";
    }
  });
}
