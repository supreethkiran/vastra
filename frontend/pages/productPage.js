import { fetchProduct, fetchProducts } from "../services/productService.js";
import { addToCart } from "../services/cartService.js";
import { showToast } from "../components/toast.js";
import { addRecentlyViewed } from "../services/recentService.js";
import { isWishlisted, toggleWishlist } from "../services/wishlistService.js";

export async function productPage(app, id) {
  app.innerHTML = `
    <div class="card" style="padding:16px;">
      <div class="gallery-grid">
        <div class="skeleton" style="height:420px;"></div>
        <div class="stack">
          <div class="skeleton" style="height:32px;"></div>
          <div class="skeleton" style="height:18px;"></div>
          <div class="skeleton" style="height:120px;"></div>
        </div>
      </div>
    </div>
  `;
  try {
    const { product } = await fetchProduct(id);
    const gallery = [product.image, product.secondaryImage, product.thirdImage].filter(Boolean);
    const fallbackGallery = gallery.length ? gallery : [product.image];
    const { products: sameCategory } = await fetchProducts({ category: product.category }).catch(() => ({ products: [] }));
    const recs = sameCategory.filter((item) => item.id !== product.id).slice(0, 4);
    addRecentlyViewed(product);
    const stock = Number(product.stock || 12);
    const rating = Number(product.rating || 4.6).toFixed(1);
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L", "XL"];
    const defaultSize = sizes.includes("M") ? "M" : sizes[0];
    app.innerHTML = `
      <section class="card fade-in" style="padding:16px;">
        <div class="gallery-grid">
          <div class="stack">
            <div class="gallery-main zoomable">
              <img id="mainGalleryImage" src="${fallbackGallery[0]}" alt="${product.name}" loading="eager" decoding="async">
            </div>
            <div class="thumb-row">
              ${fallbackGallery
                .map(
                  (image, index) =>
                    `<button type="button" class="thumb-btn ${index === 0 ? "active" : ""}" data-thumb="${index}"><img src="${image}" alt="${product.name} ${index + 1}" loading="lazy"></button>`
                )
                .join("")}
            </div>
          </div>
          <div class="stack">
            <div class="row">
              <h1>${product.name}</h1>
              <button id="wishBtn" class="wishlist-btn ${isWishlisted(product.id) ? "active" : ""}" aria-label="Wishlist">♡</button>
            </div>
            <p class="muted">${product.category}</p>
            <p class="muted">⭐ ${rating} · ${stock < 8 ? `${stock} in stock` : "In stock"}</p>
            <p class="price">₹${Number(product.price).toLocaleString("en-IN")}</p>
            <div class="card stack" style="padding:12px;">
              <div class="row">
                <strong>Choose size</strong>
                <span class="pill">Recommended: ${defaultSize}</span>
              </div>
              <div id="sizeRow" class="size-row" role="listbox" aria-label="Select size">
                ${sizes.map((s) => `<button type="button" class="size-pill ${s === defaultSize ? "active" : ""}" data-size="${s}">${s}</button>`).join("")}
              </div>
              <p id="sizeHint" class="muted" style="font-size:12px;">Tip: sizes sell out fast—lock it in before checkout.</p>
            </div>
            <button id="addOneBtn" class="btn primary">Add to Cart</button>
            <div class="trust-grid">
              <div class="trust-chip">100% Original</div>
              <div class="trust-chip">Secure Payment</div>
              <div class="trust-chip">Easy Returns</div>
            </div>
            <div class="card stack" style="padding:12px;">
              <h3>Description</h3>
              <p class="muted">${product.description || "Premium fabric, tailored fit, and made for daily wear."}</p>
            </div>
            <div class="card stack" style="padding:12px;">
              <h3>Size Recommendation</h3>
              <div class="row">
                <input id="heightInput" type="number" placeholder="Height (cm)">
                <input id="weightInput" type="number" placeholder="Weight (kg)">
              </div>
              <button id="sizeSuggestBtn" class="btn" type="button">Suggest Size</button>
              <p id="sizeResult" class="muted"></p>
            </div>
            <div class="card stack" style="padding:12px;">
              <h3>Reviews</h3>
              <p>★★★★★ <span class="muted">"Perfect fit and premium fabric."</span> <span class="pill">Verified Buyer</span></p>
              <p>★★★★☆ <span class="muted">"Great quality, fast delivery."</span> <span class="pill">Verified Buyer</span></p>
            </div>
          </div>
        </div>
      </section>
      ${
        recs.length
          ? `
      <section class="stack" style="margin-top:16px;">
        <h2 class="section-title" style="font-size:20px;">You May Also Like</h2>
        <div class="grid compact">
          ${recs
            .map(
              (item) => `
              <article class="card rec-card">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                <div class="card-body stack">
                  <p>${item.name}</p>
                  <p class="price">₹${Number(item.price).toLocaleString("en-IN")}</p>
                  <a href="#/product/${item.id}" class="btn">View</a>
                </div>
              </article>
            `
            )
            .join("")}
        </div>
      </section>`
          : ""
      }
    `;

    const mainImage = document.getElementById("mainGalleryImage");
    document.querySelectorAll("[data-thumb]").forEach((thumb, index) => {
      thumb.addEventListener("click", () => {
        mainImage.src = fallbackGallery[index];
        document.querySelectorAll("[data-thumb]").forEach((btn) => btn.classList.remove("active"));
        thumb.classList.add("active");
      });
    });

    let selectedSize = defaultSize;
    const sizeRow = document.getElementById("sizeRow");
    sizeRow?.querySelectorAll("[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedSize = btn.dataset.size;
        sizeRow.querySelectorAll("[data-size]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    document.getElementById("addOneBtn").addEventListener("click", (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      btn.textContent = "Adding...";
      try {
        addToCart({ ...product, selectedSize });
        showToast("Added to Cart");
      } catch (error) {
        console.error("AUTH ERROR:", error);
        showToast(error.message || "Unable to add to cart");
      }
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = "Add to Cart";
      }, 350);
    });
    document.getElementById("wishBtn").addEventListener("click", () => {
      const { added } = toggleWishlist(product);
      document.getElementById("wishBtn").classList.toggle("active", added);
      showToast(added ? "Added to Wishlist" : "Removed from Wishlist");
    });
    document.getElementById("sizeSuggestBtn").addEventListener("click", () => {
      const h = Number(document.getElementById("heightInput").value || 0);
      const w = Number(document.getElementById("weightInput").value || 0);
      const resultEl = document.getElementById("sizeResult");
      if (!h || !w) {
        resultEl.textContent = "Enter both height and weight for recommendation.";
        resultEl.className = "danger";
        return;
      }
      let size = "M";
      if (h < 165 || w < 58) size = "S";
      else if (h > 182 || w > 82) size = "XL";
      else if (h > 175 || w > 72) size = "L";
      resultEl.textContent = `Recommended size: ${size}`;
      resultEl.className = "ok";
    });
  } catch (error) {
    app.innerHTML = `<p class="danger">Unable to load product: ${error.message}</p>`;
  }
}
