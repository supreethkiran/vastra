export function productCard(product) {
  const rating = Number(product.rating || 4.4).toFixed(1);
  const stock = Number(product.stock || 12);
  const secondaryImage = product.secondaryImage || product.image;
  return `
    <article class="card product-card" data-card="${product.id}">
      <div class="product-image-wrap">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <img class="product-hover-image" src="${secondaryImage}" alt="${product.name}" loading="lazy">
        <button class="wishlist-btn" data-wish="${product.id}" aria-label="Wishlist">♡</button>
      </div>
      <div class="card-body stack">
        <h3>${product.name}</h3>
        <p class="muted">${product.category}</p>
        <div class="row">
          <span class="pill">⭐ ${rating}</span>
          <span class="muted">${stock < 8 ? `Only ${stock} left` : "Selling fast"}</span>
        </div>
        <p class="price">₹${Number(product.price).toLocaleString("en-IN")}</p>
        <div class="row">
          <a class="btn" href="#/product/${product.id}">View</a>
          <button class="btn primary" data-add="${product.id}">Add to Cart</button>
        </div>
      </div>
    </article>
  `;
}
