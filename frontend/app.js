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
window.__vastraLastNonAuthHash = window.__vastraLastNonAuthHash || "#/";

function bindRipplesOnce() {
  if (window.__vastraRipplesBound) return;
  window.__vastraRipplesBound = true;

  document.addEventListener("pointerdown", (event) => {
    const btn = event.target?.closest?.("button.btn, a.btn, .nav button, .nav a");
    if (!btn) return;
    if (btn.disabled) return;
    btn.classList.add("ripple-ready");
    const rect = btn.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    btn.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  });
}

function requireAuth() {
  if (!getCurrentUser()) {
    // Remember intent so we can redirect after login.
    try {
      const intended = location.hash || "#/";
      if (intended && intended !== "#/login" && intended !== "#/signup") {
        sessionStorage.setItem("vastra_post_auth_redirect", intended);
      }
    } catch {
      // ignore
    }
    location.hash = "#/login";
    return false;
  }
  return true;
}

async function router() {
  console.log("Current route:", location.hash || "#/");

  if (!app) {
    // Hard failsafe: never allow a silent blank screen if #app is missing.
    console.error("[VASTRA][router] #app container missing");
    return;
  }

  // Safety: avoid "scroll freeze" if a drawer left overflow locked.
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  mountMiniCart();
  bindRipplesOnce();
  renderNavbar((target) => {
    location.hash = target;
  });

  const hash = location.hash || "#/";
  const user = getCurrentUser();
  const [, route, id, sub] = hash.split("/");

  if (route !== "login" && route !== "signup") {
    window.__vastraLastNonAuthHash = hash;
  }

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

  // Safety: warn about obviously-unwired buttons (heuristic, avoids spam).
  try {
    app.querySelectorAll("button").forEach((btn) => {
      if (btn.dataset.wireWarned) return;
      const id = btn.getAttribute("id") || "";
      const hasData = Array.from(btn.attributes).some((a) => a.name.startsWith("data-"));
      const type = btn.getAttribute("type") || "";
      if (id || hasData || type === "submit") return;
      btn.dataset.wireWarned = "1";
      btn.addEventListener("click", () => {
        // eslint-disable-next-line no-console
        console.warn("Unwired button clicked:", (btn.innerText || btn.textContent || "").trim());
      });
    });
  } catch {
    // ignore
  }
}

window.addEventListener("hashchange", () => {
  try {
    router().catch((err) => console.error("[VASTRA][router] hashchange failed", err));
  } catch (err) {
    console.error("[VASTRA][router] hashchange threw", err);
  }
});
window.addEventListener("load", () => {
  try {
    router().catch((err) => console.error("[VASTRA][router] load failed", err));
  } catch (err) {
    console.error("[VASTRA][router] load threw", err);
  }
});
window.addEventListener("offline", () => showToast("You are offline. Some actions may fail."));
window.addEventListener("online", () => showToast("Back online."));

// Extra safety: ensure scroll is never stuck locked.
window.addEventListener(
  "load",
  () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "auto";
  },
  { once: true }
);

// Temporary failsafe: remove any legacy "live" blocks if present.
window.addEventListener(
  "load",
  () => {
    try {
      document.querySelectorAll(".live, #live, .live-section, .live-products").forEach((el) => el.remove());
    } catch {
      // ignore
    }
  },
  { once: true }
);

// Ensure navbar + protected routes update after Firebase restores session.
(async function bindAuthRerender() {
  try {
    if (window.firebaseReady) await window.firebaseReady;
    window.firebaseApi?.subscribeAuth?.(() => {
      // Re-run router to refresh navbar + auth-gated views.
      router().catch(() => {});
    });
  } catch {
    // ignore
  }
})();
