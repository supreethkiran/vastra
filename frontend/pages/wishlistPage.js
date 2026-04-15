import { getWishlist, toggleWishlist } from "../services/wishlistService.js";
import { addToCart } from "../services/cartService.js";
import { showToast } from "../components/toast.js";

export function wishlistPage(app) {
  const wishlist = getWishlist();
  if (!wishlist.length) {
    app.innerHTML = `
      <h1 class="section-title">Wishlist</h1>
      <div class="card empty-state fade-in">
        <p class="muted">Your wishlist is empty.</p>
        <a href="#/" class="btn" style="display:inline-block;margin-top:8px;">Discover Products</a>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <h1 class="section-title">Wishlist</h1>
    <div class="grid fade-in">
      ${wishlist
        .map(
          (item) => `
          <article class="card">
            <img src="${item.image}" alt="${item.name}">
            <div class="card-body stack">
              <h3>${item.name}</h3>
              <p class="price">₹${Number(item.price).toLocaleString("en-IN")}</p>
              <div class="row">
                <button class="btn primary" data-add="${item.id}">Move to Cart</button>
                <button class="btn" data-remove="${item.id}">Remove</button>
              </div>
            </div>
          </article>
        `
        )
        .join("")}
    </div>
  `;

  wishlist.forEach((item) => {
    app.querySelector(`[data-add="${item.id}"]`)?.addEventListener("click", () => {
      addToCart(item);
      showToast("Added to Cart");
    });
    app.querySelector(`[data-remove="${item.id}"]`)?.addEventListener("click", () => {
      toggleWishlist(item);
      showToast("Removed from Wishlist");
      wishlistPage(app);
    });
  });
}
