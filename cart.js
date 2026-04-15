/* Shared cart utilities for VASTRA storefront pages */
(function initVastraCart(global) {
  const CART_KEY = "vastra_cart";
  const LEGACY_CART_KEY = "cart";
  const LAST_ORDER_KEY = "vastra_last_order";

  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) return JSON.parse(raw);

      // Backward compatibility if older code stored cart under "cart".
      const legacyRaw = localStorage.getItem(LEGACY_CART_KEY);
      if (!legacyRaw) return [];

      const legacyCart = JSON.parse(legacyRaw);
      if (Array.isArray(legacyCart)) {
        saveCart(legacyCart);
        return legacyCart;
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function formatPrice(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function getCartCount() {
    return getCart().reduce((total, item) => total + Number(item.qty || 0), 0);
  }

  function addToCart(product, quantity) {
    const qty = Math.max(1, Number(quantity || 1));
    const cart = getCart();
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price),
        image: product.image || "",
        qty
      });
    }

    saveCart(cart);
    return cart;
  }

  function updateQuantity(id, delta) {
    const cart = getCart();
    const item = cart.find((entry) => String(entry.id) === String(id));
    if (!item) return cart;

    item.qty += Number(delta);
    if (item.qty < 1) {
      return removeFromCart(id);
    }

    saveCart(cart);
    return cart;
  }

  function setQuantity(id, qty) {
    const cart = getCart();
    const item = cart.find((entry) => String(entry.id) === String(id));
    if (!item) return cart;

    item.qty = Math.max(1, Number(qty || 1));
    saveCart(cart);
    return cart;
  }

  function removeFromCart(id) {
    const updated = getCart().filter((item) => String(item.id) !== String(id));
    saveCart(updated);
    return updated;
  }

  function clearCart() {
    saveCart([]);
  }

  function getSubtotal() {
    return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function persistLastOrder(order) {
    localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  }

  function getLastOrder() {
    try {
      return JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function showToast(message) {
    let toast = document.getElementById("vastra-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "vastra-toast";
      toast.style.cssText = [
        "position:fixed",
        "bottom:24px",
        "left:50%",
        "transform:translateX(-50%) translateY(20px)",
        "background:#111319",
        "color:#f0ece4",
        "padding:12px 20px",
        "border-radius:999px",
        "border:1px solid rgba(201,169,110,0.35)",
        "box-shadow:0 12px 24px rgba(0,0,0,0.35)",
        "font-size:12px",
        "letter-spacing:0.05em",
        "z-index:99999",
        "opacity:0",
        "transition:all 0.3s ease"
      ].join(";");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(20px)";
    }, 2200);
  }

  global.VastraCart = {
    getCart,
    saveCart,
    formatPrice,
    getCartCount,
    addToCart,
    updateQuantity,
    setQuantity,
    removeFromCart,
    clearCart,
    getSubtotal,
    persistLastOrder,
    getLastOrder,
    showToast
  };
})(window);
