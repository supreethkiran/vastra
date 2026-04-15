import { fetchProducts } from "../services/productService.js";
import { addToCart } from "../services/cartService.js";
import { productCard } from "../components/productCard.js";
import { showToast } from "../components/toast.js";
import { isWishlisted, toggleWishlist } from "../services/wishlistService.js";
import { getRecentlyViewed } from "../services/recentService.js";

export async function shopPage(app) {
  app.innerHTML = `
    <h1 class="section-title fade-in">Drop Collection</h1>
    <div class="toolbar">
      <input id="searchInput" placeholder="Search products...">
      <select id="categoryInput">
        <option value="">All Categories</option>
        <option value="Hoodies">Hoodies</option>
        <option value="Bottoms">Bottoms</option>
        <option value="Essentials">Essentials</option>
      </select>
      <button id="filterBtn" class="btn">Apply</button>
    </div>
    <div id="products" class="grid fade-in"></div>
    <section id="recommendedWrap" class="stack" style="margin-top:18px;"></section>
    <section id="recentWrap" class="stack" style="margin-top:18px;"></section>
  `;

  const productsEl = document.getElementById("products");
  const filterBtn = document.getElementById("filterBtn");
  const searchInput = document.getElementById("searchInput");
  const categoryInput = document.getElementById("categoryInput");
  const recentWrap = document.getElementById("recentWrap");
  const recommendedWrap = document.getElementById("recommendedWrap");

  function animateAddToCart(button) {
    const cartLink = document.querySelector('a[href="#/cart"]');
    if (!button || !cartLink) return;
    const start = button.getBoundingClientRect();
    const end = cartLink.getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "flying-dot";
    dot.style.left = `${start.left + start.width / 2}px`;
    dot.style.top = `${start.top + start.height / 2}px`;
    document.body.appendChild(dot);
    dot.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${end.left - start.left}px, ${end.top - start.top}px) scale(.3)`, opacity: 0.2 }
      ],
      { duration: 500, easing: "cubic-bezier(0.16,1,0.3,1)" }
    ).onfinish = () => dot.remove();
  }

  function renderRecentlyViewed() {
    const recent = getRecentlyViewed();
    if (!recent.length) {
      recentWrap.innerHTML = "";
      return;
    }
    recentWrap.innerHTML = `
      <h2 class="section-title" style="font-size:20px;">Recently Viewed</h2>
      <div class="grid">${recent.map(productCard).join("")}</div>
    `;
  }

  function renderRecommendations(products) {
    const recommended = [...products]
      .sort((a, b) => Number(b.rating || 4.5) - Number(a.rating || 4.3))
      .slice(0, 4);
    if (!recommended.length) {
      recommendedWrap.innerHTML = "";
      return;
    }
    recommendedWrap.innerHTML = `
      <h2 class="section-title" style="font-size:20px;">Recommended For You</h2>
      <div class="grid compact">${recommended.map(productCard).join("")}</div>
    `;
  }

  async function loadProducts() {
    filterBtn.disabled = true;
    filterBtn.innerHTML = '<span class="spinner"></span>';
    productsEl.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton skeleton-card"></div>').join("");
    try {
      const search = searchInput.value.trim();
      const category = categoryInput.value.trim();
      const data = await fetchProducts({ search, category });
      if (!data.products.length) {
        productsEl.innerHTML = `
          <div class="card empty-state">
            <p class="muted">No products match your search.</p>
            <button id="clearFiltersBtn" class="btn" type="button">Clear filters</button>
          </div>
        `;
        document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
          searchInput.value = "";
          categoryInput.value = "";
          loadProducts();
        });
        return;
      }
      const productsById = Object.fromEntries(data.products.map((product) => [product.id, product]));
      productsEl.innerHTML = data.products.map(productCard).join("");
      renderRecommendations(data.products);
      app.querySelectorAll("[data-wish]").forEach((wish) => {
        const product = productsById[wish.dataset.wish];
        if (!product) return;
        if (isWishlisted(product.id)) wish.classList.add("active");
        wish.addEventListener("click", () => {
          const result = toggleWishlist(product);
          wish.classList.toggle("active", result.added);
          showToast(result.added ? "Added to Wishlist" : "Removed from Wishlist");
        });
      });
      app.querySelectorAll("[data-add]").forEach((btn) => {
        const product = productsById[btn.dataset.add];
        if (!product) return;
        btn.addEventListener("click", () => {
          btn.disabled = true;
          const oldLabel = btn.textContent;
          btn.textContent = "Adding...";
          addToCart(product);
          animateAddToCart(btn);
          showToast("Added to Cart");
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = oldLabel;
          }, 350);
        });
      });
    } catch (error) {
      productsEl.innerHTML = `
        <div class="card empty-state">
          <p class="danger">Failed to load products: ${error.message}</p>
          <button id="retryProductsBtn" class="btn" type="button">Retry</button>
        </div>
      `;
      document.getElementById("retryProductsBtn")?.addEventListener("click", loadProducts);
    } finally {
      filterBtn.disabled = false;
      filterBtn.textContent = "Apply";
    }
  }

  filterBtn.addEventListener("click", loadProducts);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") loadProducts();
  });
  categoryInput.addEventListener("change", loadProducts);
  if (!window.__vastraSearchBound) {
    window.addEventListener("global-search", (event) => {
      const currentSearch = document.getElementById("searchInput");
      if (currentSearch) {
        currentSearch.value = event.detail || "";
      }
      document.getElementById("filterBtn")?.click();
    });
    window.__vastraSearchBound = true;
  }
  renderRecentlyViewed();
  await loadProducts();
}
