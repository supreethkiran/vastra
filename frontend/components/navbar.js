import { getCurrentUser, logout } from "../services/authService.js";
import { fetchProducts } from "../services/productService.js";
import { getLocalCart } from "../services/cartService.js";

export function renderNavbar(onNavigate) {
  const user = getCurrentUser();
  const el = document.getElementById("appHeader");
  const cartCount = getLocalCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
  el.innerHTML = `
    <nav class="nav">
      <a class="brand" href="#/">VASTRA</a>
      <button id="navHamburger" class="nav-hamburger" type="button" aria-label="Open menu">
        <span class="nav-hamburger-lines" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>
      <div class="nav-search-wrap">
        <input id="navSearchInput" type="search" placeholder="Search products...">
        <div id="navSearchSuggest" class="search-suggest" style="display:none;"></div>
      </div>
      <div class="nav-links primary-links">
        <a href="#/">Shop</a>
        <button id="navCartBtn" class="nav-pill" type="button" aria-label="Open cart">
          Cart
          <span id="navCartCount" class="nav-cart-count" style="${cartCount > 0 ? "" : "display:none;"}">${cartCount}</span>
        </button>
        <a href="#/wishlist">Wishlist</a>
        <a href="#/orders">My Orders</a>
        <a href="#/track">Track Order</a>
        <a href="#/legal/privacy">Legal</a>
        ${user?.role === "admin" ? '<a href="#/admin">Admin</a>' : ""}
      </div>
      <div class="nav-links">
        ${
          user
            ? `<span class="pill">${user.name}</span><button id="logoutBtn">Logout</button>`
            : '<a href="#/login">Login</a><a href="#/signup">Signup</a>'
        }
      </div>
    </nav>
    <div id="mobileNavBackdrop" class="mobile-nav-backdrop"></div>
    <aside id="mobileNavDrawer" class="mobile-nav-drawer" aria-label="Menu">
      <div class="row" style="justify-content:space-between;">
        <strong style="letter-spacing:.18em;">MENU</strong>
        <button id="mobileNavClose" class="btn ghost" type="button">Close</button>
      </div>
      <div class="mobile-nav-links">
        <a class="btn ghost" href="#/">Shop</a>
        <button id="mobileCartBtn" class="btn ghost" type="button">Cart</button>
        <a class="btn ghost" href="#/wishlist">Wishlist</a>
        <a class="btn ghost" href="#/orders">My Orders</a>
        <a class="btn ghost" href="#/track">Track Order</a>
        <a class="btn ghost" href="#/legal/privacy">Legal</a>
        ${user?.role === "admin" ? '<a class="btn ghost" href="#/admin">Admin</a>' : ""}
      </div>
      <div class="stack" style="gap:8px;">
        ${
          user
            ? `<div class="row"><span class="muted">Signed in</span><span class="pill">${user.name}</span></div><button id="mobileLogoutBtn" class="btn primary" type="button">Logout</button>`
            : '<a class="btn primary" href="#/login">Login</a><a class="btn ghost" href="#/signup">Create account</a>'
        }
      </div>
    </aside>
  `;

  const btn = document.getElementById("logoutBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      logout();
      onNavigate("#/login");
    });
  }

  document.getElementById("navCartBtn")?.addEventListener("click", () => {
    if (window.__vastraMiniCart?.open) {
      window.__vastraMiniCart.open();
      return;
    }
    onNavigate("#/cart");
  });

  const backdrop = document.getElementById("mobileNavBackdrop");
  const drawer = document.getElementById("mobileNavDrawer");
  const openMobile = () => {
    drawer.classList.add("open");
    backdrop.classList.add("open");
    document.documentElement.style.overflow = "hidden";
  };
  const closeMobile = () => {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    document.documentElement.style.overflow = "";
  };
  document.getElementById("navHamburger")?.addEventListener("click", openMobile);
  document.getElementById("mobileNavClose")?.addEventListener("click", closeMobile);
  backdrop?.addEventListener("click", closeMobile);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobile();
  });
  drawer?.querySelectorAll('a[href^="#/"]').forEach((a) => {
    a.addEventListener("click", closeMobile);
  });
  document.getElementById("mobileCartBtn")?.addEventListener("click", () => {
    closeMobile();
    document.getElementById("navCartBtn")?.click();
  });
  document.getElementById("mobileLogoutBtn")?.addEventListener("click", () => {
    closeMobile();
    logout();
    onNavigate("#/login");
  });

  const searchInput = document.getElementById("navSearchInput");
  const suggestEl = document.getElementById("navSearchSuggest");
  let timer;
  searchInput?.addEventListener("input", () => {
    clearTimeout(timer);
    const value = searchInput.value.trim();
    if (!value) {
      suggestEl.style.display = "none";
      suggestEl.innerHTML = "";
      return;
    }
    timer = setTimeout(async () => {
      try {
        const { products } = await fetchProducts({ search: value });
        if (!products.length) {
          suggestEl.innerHTML = '<div class="search-item"><span class="muted">No results found</span></div>';
          suggestEl.style.display = "block";
          return;
        }
        suggestEl.innerHTML = products
          .slice(0, 5)
          .map(
            (product) => `
            <a class="search-item" href="#/product/${product.id}">
              <img src="${product.image}" alt="${product.name}">
              <span>${product.name}</span>
              <strong>₹${Number(product.price).toLocaleString("en-IN")}</strong>
            </a>
          `
          )
          .join("");
        suggestEl.style.display = "block";
      } catch (error) {
        suggestEl.innerHTML = '<div class="search-item"><span class="danger">Search failed</span></div>';
        suggestEl.style.display = "block";
      }
    }, 150);
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onNavigate("#/");
      window.dispatchEvent(new CustomEvent("global-search", { detail: searchInput.value.trim() }));
      suggestEl.style.display = "none";
    }
  });

  if (window.__vastraNavOutsideClickHandler) {
    document.removeEventListener("click", window.__vastraNavOutsideClickHandler);
  }
  window.__vastraNavOutsideClickHandler = (event) => {
    if (!event.target.closest(".nav-search-wrap")) {
      suggestEl.style.display = "none";
    }
  };
  document.addEventListener("click", window.__vastraNavOutsideClickHandler);
}
