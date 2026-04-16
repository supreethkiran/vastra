import { renderNavbar } from "./components/navbar.js";
import { showToast } from "./components/toast.js";
import { getCurrentUser } from "./services/authService.js";
import { mountMiniCart } from "./components/miniCart.js";
import { shopPage } from "./pages/shopPage.js";
import { productPage } from "./pages/productPage.js";
import { loginPage, signupPage } from "./pages/authPages.js";
import { cartPage } from "./pages/cartPage.js";
import { checkoutPage } from "./pages/checkoutPage.js";
import { ordersPage } from "./pages/ordersPage.js";
import { adminPage } from "./pages/adminPage.js";
import { successPage } from "./pages/successPage.js";
import { wishlistPage } from "./pages/wishlistPage.js";
import { trackPage } from "./pages/trackPage.js";
import { legalPage } from "./pages/legalPage.js";

const app = document.getElementById("app");

function requireAuth() {
  if (!getCurrentUser()) {
    location.hash = "#/login";
    return false;
  }
  return true;
}

async function router() {
  mountMiniCart();
  renderNavbar((target) => {
    location.hash = target;
  });

  const hash = location.hash || "#/";
  const user = getCurrentUser();
  const [, route, id, sub] = hash.split("/");

  try {
    app.classList.add("route-enter");
    app.innerHTML = '<p class="muted fade-in">Loading...</p>';

    if (!route) return shopPage(app);
    if (route === "login") return loginPage(app);
    if (route === "signup") return signupPage(app);
    if (route === "product" && id) return productPage(app, id);
    if (route === "wishlist") {
      if (!requireAuth()) return;
      return wishlistPage(app);
    }
    if (route === "track") {
      if (!requireAuth()) return;
      return trackPage(app);
    }
    if (route === "legal") return legalPage(app, id || sub || "privacy");
    if (route === "cart") {
      if (!requireAuth()) return;
      return cartPage(app);
    }
    if (route === "checkout") {
      if (!requireAuth()) return;
      return checkoutPage(app);
    }
    if (route === "orders") {
      if (!requireAuth()) return;
      return ordersPage(app);
    }
    if (route === "admin") {
      if (!requireAuth()) return;
      if (user?.role !== "admin") {
        app.innerHTML = '<p class="danger">Admin access only.</p>';
        return;
      }
      return adminPage(app);
    }
    if (route === "success") return successPage(app);

    app.innerHTML = '<p class="danger">Page not found.</p>';
  } catch (error) {
    app.innerHTML = `<p class="danger">${error.message}</p>`;
    showToast(error.message);
  } finally {
    setTimeout(() => app.classList.remove("route-enter"), 280);
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);
window.addEventListener("offline", () => showToast("You are offline. Some actions may fail."));
window.addEventListener("online", () => showToast("Back online."));
