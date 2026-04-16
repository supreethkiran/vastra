export function productCard(product) {
  const rating = Number(product.rating || 4.4).toFixed(1);
  const stock = Number(product.stock || 12);
  const secondaryImage = product.secondaryImage || product.image;
  const normalizedBadgeType = String(product.badgeType || product.badge || "").trim().toLowerCase();
  const badge =
    normalizedBadgeType === "new" || normalizedBadgeType === "new-in" || normalizedBadgeType === "just in"
      ? { label: "New", className: "new" }
      : normalizedBadgeType === "trending" || normalizedBadgeType === "hot"
        ? { label: "Trending", className: "trending" }
        : Number(product.rating || 0) >= 4.6
          ? { label: "Trending", className: "trending" }
          : null;
  return `
    <article class="card product-card" data-card="${product.id}">
      <div class="product-image-wrap">
        ${badge ? `<div class="badge-row"><span class="badge ${badge.className}">${badge.label}</span></div>` : ""}
        <img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async">
        <img class="product-hover-image" src="${secondaryImage}" alt="${product.name}" loading="lazy" decoding="async">
        <button class="wishlist-btn" data-wish="${product.id}" aria-label="Wishlist">♡</button>
        <div class="product-overlay" aria-hidden="true">
          <div class="quick-actions">
            <a class="btn ghost" href="#/product/${product.id}">View Product</a>
            <button class="btn primary" data-add="${product.id}">Add to Cart</button>
          </div>
        </div>
      </div>
      <div class="card-body stack">
        <h3>${product.name}</h3>
        <p class="muted">${product.category}</p>
        <div class="row">
          <span class="pill">⭐ ${rating}</span>
          <span class="muted">${stock < 8 ? `${stock} in stock` : "In stock"}</span>
        </div>
        <p class="price">₹${Number(product.price).toLocaleString("en-IN")}</p>
        <div class="row" style="gap:8px;">
          <a class="btn" href="#/product/${product.id}">View</a>
          <button class="btn primary" data-add="${product.id}">Add</button>
        </div>
      </div>
    </article>
  `;
}
