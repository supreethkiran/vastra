import { fetchProducts } from "../services/productService.js";
import { addToCart } from "../services/cartService.js";
import { productCard } from "../components/productCard.js";
import { showToast } from "../components/toast.js";
import { isWishlisted, toggleWishlist } from "../services/wishlistService.js";
import { getRecentlyViewed } from "../services/recentService.js";

export async function shopPage(app) {
  app.innerHTML = `
    <section class="hero-video" id="vastraHeroVideo">
      <video class="hero-video-el" autoplay muted loop playsinline preload="metadata" poster="">
        <source src="/assets/hero.mp4" type="video/mp4" />
      </video>
      <div class="hero-video-overlay">
        <div class="hero-video-inner hero-animate">
          <span class="hero-eyebrow">Premium drops • Limited stock</span>
          <h1 class="hero-title">VASTRA</h1>
          <p class="hero-subtitle">Wear Confidence. Premium silhouettes built for everyday dominance.</p>
          <div class="hero-cta-row">
            <button id="heroShopNowBtn" class="btn primary" type="button">Shop Now</button>
            <a class="btn ghost" href="#/wishlist">Explore Wishlist</a>
          </div>
        </div>
        <div class="scroll-indicator" aria-hidden="true"></div>
      </div>
    </section>

    <section id="outfit-generator" class="outfit-generator reveal-once" aria-label="AI outfit generator">
      <div class="row" style="justify-content:space-between;align-items:end;gap:12px;">
        <div>
          <h2 class="section-title" style="margin:0;">Generate Your Outfit</h2>
          <p class="muted" style="margin-top:6px;">A smart mix based on your browsing and category balance.</p>
        </div>
        <button id="generateOutfitBtn" class="btn primary" type="button">Generate</button>
      </div>
      <div id="outfitResult" class="scroll-row" style="margin-top:12px;"></div>
    </section>

    <section class="drop-highlight reveal-once" id="dropHighlight">
      <div class="drop-highlight-inner">
        <div class="drop-content">
          <div class="drop-kicker">NEW DROP</div>
          <h2 class="drop-title">Built for movement.<br>Designed for presence.</h2>
          <p class="drop-subtitle">Minimal silhouettes, premium weight, and a fit that holds its shape—day to night.</p>
          <div class="drop-actions">
            <button id="exploreDropBtn" class="btn primary drop-cta" type="button">Explore Drop</button>
            <a class="btn ghost" href="#/wishlist">Save favorites</a>
          </div>
        </div>
      </div>
    </section>

    <section class="product-showcase reveal-once" aria-label="Featured products">
      <div class="row" style="justify-content:space-between;align-items:end;gap:12px;">
        <h2 class="section-title" style="margin:0;">Featured</h2>
        <div class="muted" style="font-size:12px;">Swipe to explore</div>
      </div>
      <div class="scroll-row" id="scrollProducts" aria-label="Horizontal product showcase"></div>
    </section>

    <section class="recommendations reveal-once" aria-label="Recommended products">
      <div class="row" style="justify-content:space-between;align-items:end;gap:12px;">
        <h2 class="section-title" style="margin:0;">Recommended for you</h2>
        <div class="muted" id="recoHint" style="font-size:12px;"></div>
      </div>
      <div class="scroll-row" id="recommendedProducts" aria-label="Recommendations"></div>
    </section>

    <h2 class="section-title fade-in" style="margin-top:6px;">Drop Collection</h2>
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
    <div id="products" class="grid fade-in" aria-live="polite"></div>
    <section id="recommendedWrap" class="stack" style="margin-top:18px;"></section>
    <section id="recentWrap" class="stack" style="margin-top:18px;"></section>
  `;

  const productsEl = document.getElementById("products");
  const filterBtn = document.getElementById("filterBtn");
  const searchInput = document.getElementById("searchInput");
  const categoryInput = document.getElementById("categoryInput");
  const recentWrap = document.getElementById("recentWrap");
  const recommendedWrap = document.getElementById("recommendedWrap");
  const heroShopNowBtn = document.getElementById("heroShopNowBtn");
  const heroEl = document.getElementById("vastraHeroVideo");
  const exploreDropBtn = document.getElementById("exploreDropBtn");
  const scrollProductsEl = document.getElementById("scrollProducts");
  const recommendedProductsEl = document.getElementById("recommendedProducts");
  const recoHintEl = document.getElementById("recoHint");
  const generateOutfitBtn = document.getElementById("generateOutfitBtn");
  const outfitResultEl = document.getElementById("outfitResult");

  // Reveal animations on entry (once)
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const targets = app.querySelectorAll(".reveal-once");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.18 }
    );
    targets.forEach((t) => io.observe(t));
  } else {
    app.querySelectorAll(".reveal-once").forEach((el) => el.classList.add("in"));
  }

  heroShopNowBtn?.addEventListener("click", () => {
    const toolbar = document.querySelector(".toolbar");
    toolbar?.scrollIntoView({ behavior: "smooth", block: "start" });
    searchInput?.focus?.();
  });

  exploreDropBtn?.addEventListener("click", () => {
    const toolbar = document.querySelector(".toolbar");
    toolbar?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // Parallax background (minimal JS)
  if (heroEl && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = heroEl.getBoundingClientRect();
        const progress = Math.max(-1, Math.min(1, rect.top / Math.max(1, window.innerHeight)));
        heroEl.style.setProperty("--heroParallax", `${Math.round(progress * 28)}px`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function animateAddToCart(button) {
    const cartTarget = document.getElementById("navCartBtn") || document.querySelector('[href="#/cart"]');
    if (!button || !cartTarget) return;
    const start = button.getBoundingClientRect();
    const end = cartTarget.getBoundingClientRect();
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

  function renderShowcase(products) {
    if (!scrollProductsEl) return;
    const list = Array.isArray(products) ? products : [];
    const featured = [...list]
      .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
      .slice(0, 10);
    if (!featured.length) {
      scrollProductsEl.innerHTML = `<div class="card empty-state" style="min-width:260px;"><p class="muted">No featured products yet.</p></div>`;
      return;
    }
    scrollProductsEl.innerHTML = featured
      .map(
        (p) => `
        <a class="showcase-card" href="#/product/${p.id}" data-showcase="${p.id}">
          <div class="showcase-img">
            <img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async">
          </div>
          <div class="showcase-body">
            <div class="showcase-name">${p.name}</div>
            <div class="showcase-meta">
              <span class="muted">${p.category || "Essentials"}</span>
              <strong class="price">₹${Number(p.price || 0).toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </a>
      `
      )
      .join("");

    // Optional slow auto-scroll (pauses on hover/touch)
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let raf = 0;
      let paused = false;
      const step = () => {
        if (!scrollProductsEl || paused) {
          raf = requestAnimationFrame(step);
          return;
        }
        scrollProductsEl.scrollLeft += 0.35;
        if (scrollProductsEl.scrollLeft + scrollProductsEl.clientWidth >= scrollProductsEl.scrollWidth - 2) {
          scrollProductsEl.scrollLeft = 0;
        }
        raf = requestAnimationFrame(step);
      };
      const start = () => {
        if (raf) return;
        raf = requestAnimationFrame(step);
      };
      const stop = () => {
        if (!raf) return;
        cancelAnimationFrame(raf);
        raf = 0;
      };
      scrollProductsEl.addEventListener("pointerenter", () => (paused = true));
      scrollProductsEl.addEventListener("pointerleave", () => (paused = false));
      scrollProductsEl.addEventListener("touchstart", () => (paused = true), { passive: true });
      scrollProductsEl.addEventListener("touchend", () => (paused = false), { passive: true });
      window.addEventListener(
        "hashchange",
        () => {
          stop();
        },
        { once: true }
      );
      start();
    }
  }

  function renderSmartRecommendations(products) {
    if (!recommendedProductsEl) return;
    const list = Array.isArray(products) ? products : [];
    let recommended = list;
    let hint = "";
    try {
      const lastViewedCategory = localStorage.getItem("lastViewedCategory") || "";
      if (lastViewedCategory) {
        recommended = list.filter((p) => String(p.category || "").toLowerCase() === String(lastViewedCategory).toLowerCase());
        hint = `Because you viewed ${lastViewedCategory}`;
      }
    } catch {
      // ignore storage errors
    }
    if (!recommended.length) {
      recommended = list.slice(0, 6);
      hint = "Top picks";
    }
    if (recoHintEl) recoHintEl.textContent = hint;
    recommendedProductsEl.innerHTML = recommended
      .slice(0, 10)
      .map(
        (p) => `
        <a class="showcase-card compact" href="#/product/${p.id}" data-reco="${p.id}">
          <div class="showcase-img">
            <img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async">
          </div>
          <div class="showcase-body">
            <div class="showcase-name">${p.name}</div>
            <div class="showcase-meta">
              <span class="muted">${p.category || "Essentials"}</span>
              <strong class="price">₹${Number(p.price || 0).toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </a>
      `
      )
      .join("");
  }

  function generateOutfit(products) {
    const list = Array.isArray(products) ? products : [];
    if (!list.length) return [];
    const by = (pred) => list.filter((p) => pred(String(p.category || "")));
    const tops = by((c) => /top|tee|t-?shirt|shirt|hoodie|sweat|essentials/i.test(c));
    const bottoms = by((c) => /bottom|jean|denim|trouser|pant|jogger|short/i.test(c));
    const shoes = by((c) => /shoe|sneaker|footwear/i.test(c));

    let preferred = "";
    try {
      preferred = localStorage.getItem("lastViewedCategory") || "";
    } catch {
      // ignore
    }

    const pick = (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
    let top = pick(tops);
    let bottom = pick(bottoms);
    let shoe = pick(shoes);

    if (preferred) {
      const preferredItems = list.filter((p) => String(p.category || "").toLowerCase() === preferred.toLowerCase());
      if (preferredItems.length) top = pick(preferredItems) || top;
    }

    const uniq = new Map();
    [top, bottom, shoe].filter(Boolean).forEach((p) => uniq.set(String(p.id), p));
    return Array.from(uniq.values());
  }

  function renderOutfit(outfit) {
    if (!outfitResultEl) return;
    const items = Array.isArray(outfit) ? outfit : [];
    if (!items.length) {
      outfitResultEl.innerHTML = `<div class="card empty-state" style="min-width:260px;"><p class="muted">No outfit combos yet. Add more categories (tops/bottoms/shoes) to products.</p></div>`;
      return;
    }
    outfitResultEl.innerHTML = items
      .map(
        (p) => `
        <a class="showcase-card compact" href="#/product/${p.id}">
          <div class="showcase-img"><img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async"></div>
          <div class="showcase-body">
            <div class="showcase-name">${p.name}</div>
            <div class="showcase-meta">
              <span class="muted">${p.category || "Essentials"}</span>
              <strong class="price">₹${Number(p.price || 0).toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </a>
      `
      )
      .join("");
  }

  function bindBehaviorTracking(productsById) {
    // Track category preference for smart recommendations.
    app.addEventListener(
      "click",
      (e) => {
        const link = e.target?.closest?.('a[href^="#/product/"]');
        if (!link) return;
        const href = link.getAttribute("href") || "";
        const id = href.split("/").pop();
        const product = productsById?.[id];
        if (!product?.category) return;
        try {
          localStorage.setItem("lastViewedCategory", String(product.category));
        } catch {
          // ignore
        }
      },
      { passive: true }
    );
  }

  async function loadProducts() {
    filterBtn.disabled = true;
    filterBtn.innerHTML = '<span class="spinner"></span>';
    productsEl.setAttribute("aria-busy", "true");
    productsEl.innerHTML = Array.from({ length: 8 }, () => '<div class="skeleton skeleton-card"></div>').join("");
    try {
      console.log("Firebase API:", window.firebaseApi);
      const search = searchInput.value.trim();
      const category = categoryInput.value.trim();
      const data = await fetchProducts({ search, category });
      console.log("Products loaded:", data.products);
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
      renderShowcase(data.products);
      renderSmartRecommendations(data.products);
      generateOutfitBtn?.addEventListener("click", () => renderOutfit(generateOutfit(data.products)));
      // initial outfit suggestion
      renderOutfit(generateOutfit(data.products));
      if (!window.__vastraBehaviorBound) {
        bindBehaviorTracking(productsById);
        window.__vastraBehaviorBound = true;
      }
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
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          const oldLabel = btn.textContent;
          btn.textContent = "Adding...";
          try {
            const user = window.firebaseApi?.getCurrentUser?.() || null;
            if (!user) {
              alert("Please login first");
              window.location.href = "/#/login";
              return;
            }
            const clean = {
              id: String(product.id),
              productId: String(product.productId || product.id),
              name: String(product.name || "Product"),
              price: Number(product.price || 0),
              image: String(product.image || ""),
              stock: product.stock
            };
            console.log("Adding product:", clean);
            await window.firebaseApi.upsertCartItem(clean, 1);
            animateAddToCart(btn);
            btn.classList.remove("pulse");
            void btn.offsetWidth;
            btn.classList.add("pulse");
            showToast("Added to Cart");
          } catch (error) {
            console.error("AUTH ERROR:", error);
            showToast(error.message || "Unable to add to cart");
          }
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = oldLabel;
          }, 350);
        });
      });
    } catch (error) {
      console.error("Failed to load products", error);
      productsEl.innerHTML = `
        <div class="card empty-state">
          <p class="danger">Products unavailable</p>
          <button id="retryProductsBtn" class="btn" type="button">Retry</button>
        </div>
      `;
      document.getElementById("retryProductsBtn")?.addEventListener("click", loadProducts);
    } finally {
      filterBtn.disabled = false;
      filterBtn.textContent = "Apply";
      productsEl.setAttribute("aria-busy", "false");
    }
  }

  filterBtn.addEventListener("click", loadProducts);
  // Real search: filter as user types (debounced)
  let searchTimer = 0;
  searchInput.addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    const query = String(event.target.value || "").trim().toLowerCase();
    console.log("Search query:", query);
    searchTimer = window.setTimeout(() => loadProducts(), 160);
  });
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
