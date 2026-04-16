/* Shared Firestore-backed cart utilities */
(function initVastraCart(global) {
  console.log("Firebase API:", global.firebaseApi);
  const state = {
    cart: [],
    lastOrder: null
  };
  const listeners = new Set();

  function formatPrice(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function normalizeItem(item) {
    return {
      id: String(item.id),
      name: item.name || "Product",
      price: Number(item.price || 0),
      image: item.image || "",
      qty: Math.max(1, Number(item.qty || 1))
    };
  }

  function cloneCart() {
    return state.cart.map((item) => ({ ...item }));
  }

  function notify() {
    listeners.forEach((listener) => {
      try {
        listener(cloneCart());
      } catch {
        // ignore listener errors
      }
    });
  }

  function setCart(items) {
    state.cart = (items || []).map(normalizeItem);
    console.log("[VASTRA][cart] updated:", state.cart);
    notify();
  }

  function ensureFirebaseApi() {
    if (!global.firebaseApi) {
      throw new Error("Database unavailable. Check Firebase config.");
    }
    return global.firebaseApi;
  }

  function reportAsyncCartError(error, fallbackMessage) {
    const message = error && error.message ? error.message : fallbackMessage;
    console.error("[VASTRA][cart]", message);
    showToast(message);
  }

  function bindRemoteCart() {
    let unsubscribeCart = () => {};

    function stopCart() {
      try {
        unsubscribeCart();
      } catch {
        // ignore
      }
      unsubscribeCart = () => {};
    }

    function startCart() {
      if (!global.firebaseApi || typeof global.firebaseApi.subscribeCart !== "function") return;
      stopCart();
      unsubscribeCart = global.firebaseApi.subscribeCart((items) => {
        console.log("Cart updated:", items);
        setCart(items);
      });
    }

    // FIX: ensure cart only binds after auth is ready
    if (global.firebaseApi?.subscribeAuth) {
      global.firebaseApi.subscribeAuth((user) => {
        console.log("Current user:", global.firebaseApi?.getCurrentUser?.() || null);
        if (!user) {
          stopCart();
          setCart([]);
          return;
        }
        startCart();
      });
      return;
    }

    // Fallback if subscribeAuth isn't available for some reason.
    window.addEventListener(
      "load",
      () => {
        startCart();
      },
      { once: true }
    );
  }

  function getCart() {
    return cloneCart();
  }

  function saveCart(cart) {
    setCart(cart);
    return cloneCart();
  }

  function getCartCount() {
    return state.cart.reduce((total, item) => total + Number(item.qty || 0), 0);
  }

  function addToCart(product, quantity) {
    if (!global.firebaseApi?.getCurrentUser?.()) {
      showToast("Please sign in to use cart");
      return cloneCart();
    }
    const qty = Math.max(1, Number(quantity || 1));
    const id = String(product.id);
    const existing = state.cart.find((item) => String(item.id) === id);
    if (existing) existing.qty += qty;
    else {
      state.cart.push(
        normalizeItem({
          id,
          name: product.name,
          price: product.price,
          image: product.image,
          qty
        })
      );
    }
    notify();
    try {
      console.log("Current user:", ensureFirebaseApi().getCurrentUser?.() || null);
      const payload = {
        id: String(product.id),
        productId: String(product.productId || product.id),
        name: String(product.name || "Product"),
        price: Number(product.price || 0),
        image: String(product.image || "")
      };
      console.log("Product before cart:", payload);
      ensureFirebaseApi()
        .upsertCartItem(payload, qty)
        .then(() => console.log("Cart write success"))
        .catch((error) => {
          console.error("Cart write failed:", error);
          reportAsyncCartError(error, "Could not sync cart item.");
        });
      ensureFirebaseApi().trackEvent?.("add_to_cart", {
        productId: String(product.productId || product.id || ""),
        cartItemId: String(product.id || ""),
        qty,
        source: window.location.pathname || ""
      });
    } catch (error) {
      showToast(error.message);
    }
    return cloneCart();
  }

  function updateQuantity(id, delta) {
    const cartId = String(id);
    const item = state.cart.find((entry) => String(entry.id) === cartId);
    if (!item) return cloneCart();
    item.qty += Number(delta || 0);
    if (item.qty <= 0) {
      state.cart = state.cart.filter((entry) => String(entry.id) !== cartId);
      notify();
      try {
        ensureFirebaseApi()
          .removeCartItem(cartId)
          .catch((error) => reportAsyncCartError(error, "Could not remove cart item."));
      } catch {
        // ignore
      }
      return cloneCart();
    }
    notify();
    try {
      ensureFirebaseApi()
        .setCartItemQty(cartId, item.qty)
        .catch((error) => reportAsyncCartError(error, "Could not update cart quantity."));
    } catch {
      // ignore
    }
    return cloneCart();
  }

  function setQuantity(id, qty) {
    const cartId = String(id);
    const item = state.cart.find((entry) => String(entry.id) === cartId);
    if (!item) return cloneCart();
    item.qty = Math.max(1, Number(qty || 1));
    notify();
    try {
      ensureFirebaseApi()
        .setCartItemQty(cartId, item.qty)
        .catch((error) => reportAsyncCartError(error, "Could not update cart quantity."));
    } catch {
      // ignore
    }
    return cloneCart();
  }

  function removeFromCart(id) {
    const cartId = String(id);
    state.cart = state.cart.filter((entry) => String(entry.id) !== cartId);
    notify();
    try {
      ensureFirebaseApi()
        .removeCartItem(cartId)
        .catch((error) => reportAsyncCartError(error, "Could not remove cart item."));
    } catch {
      // ignore
    }
    return cloneCart();
  }

  function clearCart() {
    state.cart = [];
    notify();
    try {
      ensureFirebaseApi()
        .clearCart()
        .catch((error) => reportAsyncCartError(error, "Could not clear cart."));
    } catch {
      // ignore
    }
  }

  function getSubtotal() {
    return state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  }

  function persistLastOrder(order) {
    state.lastOrder = order || null;
  }

  function getLastOrder() {
    return state.lastOrder;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    listener(cloneCart());
    return () => listeners.delete(listener);
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
    showToast,
    subscribe
  };
  bindRemoteCart();
})(window);
