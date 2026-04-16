/* Checkout page behavior */
(function initCheckout(global) {
  const form = document.getElementById("checkoutForm");
  if (!form) return;

  const cartList = document.getElementById("checkoutItems");
  const subtotalEl = document.getElementById("checkoutSubtotal");
  const totalEl = document.getElementById("checkoutTotal");
  const payBtn = document.getElementById("payNowBtn");
  const errorBox = document.getElementById("checkoutError");
  const loader = document.getElementById("checkoutLoader");

  let cartItems = [];

  function formatSafePrice(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function updateTotal(items) {
    const sub = (items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    subtotalEl.textContent = formatSafePrice(sub);
    totalEl.textContent = formatSafePrice(sub);
  }

  function renderCheckout(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      cartList.innerHTML = '<p class="muted">Your cart is empty. Please add items first.</p>';
      payBtn.disabled = true;
      updateTotal([]);
      return;
    }
    cartList.innerHTML = list
      .map(
        (item) => `
        <div class="summary-item">
          <img src="${item.image}" alt="${item.name}">
          <div>
            <p>${item.name}</p>
            <small>₹${Number(item.price || 0).toLocaleString("en-IN")} × ${Number(item.qty || 0)}</small>
          </div>
          <strong>${formatSafePrice(Number(item.price || 0) * Number(item.qty || 0))}</strong>
        </div>
      `
      )
      .join("");
    payBtn.disabled = false;
    updateTotal(list);
  }

  function waitForAuth() {
    return new Promise((resolve) => {
      const unsub = global.firebaseApi.subscribeAuth((user) => {
        if (user) {
          try {
            unsub();
          } catch {
            // ignore
          }
          resolve(user);
        }
      });
    });
  }

  async function initCheckoutFromFirebase() {
    if (!global.firebaseApi?.subscribeAuth || !global.firebaseApi?.subscribeCart) {
      cartList.innerHTML = '<p class="muted">Checkout unavailable. Please refresh.</p>';
      payBtn.disabled = true;
      return;
    }
    const user = await waitForAuth();
    console.log("Checkout user:", user);
    console.log("Current user:", global.firebaseApi.getCurrentUser?.() || null);

    global.firebaseApi.subscribeCart((items) => {
      console.log("Checkout cart items:", items);
      cartItems = Array.isArray(items) ? items : [];
      console.log("Cart items at checkout:", cartItems);
      renderCheckout(cartItems);
    });
  }

  function validate(data) {
    if (!data.name || !data.email || !data.phone || !data.address || !data.cityPincode) {
      return "Please fill all required fields.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "Please enter a valid email address.";
    }
    return "";
  }

  function setLoading(isLoading) {
    payBtn.disabled = isLoading;
    loader.style.display = isLoading ? "inline-block" : "none";
    payBtn.querySelector("span").textContent = isLoading ? "Processing..." : "Pay Now";
  }

  async function runWithSingleRetry(task, contextLabel) {
    try {
      return await task();
    } catch (error) {
      const message = String(error?.message || "");
      const shouldRetry = /network|timeout|failed to fetch|temporarily unavailable/i.test(message);
      if (!shouldRetry) throw error;
      console.warn(`[VASTRA][checkout] retrying ${contextLabel} after transient failure`);
      return task();
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";

    const cart = Array.isArray(cartItems) ? cartItems : [];
    if (!cart.length) {
      errorBox.textContent = "Cart is empty.";
      return;
    }

    const formData = new FormData(form);
    const userDetails = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      cityPincode: String(formData.get("cityPincode") || "").trim()
    };

    const validationError = validate(userDetails);
    if (validationError) {
      errorBox.textContent = validationError;
      return;
    }

    if (!global.VastraPayment || typeof global.VastraPayment.startRazorpayPayment !== "function") {
      errorBox.textContent = "Payment service is unavailable. Please refresh and try again.";
      return;
    }
    if (!global.firebaseApi || typeof global.firebaseApi.createPaymentOrder !== "function") {
      errorBox.textContent = "Order service is unavailable. Please refresh and try again.";
      return;
    }
    if (!global.firebaseApi.getCurrentUser?.()) {
      errorBox.textContent = "Please sign in to place order.";
      return;
    }

    setLoading(true);
    try {
      global.firebaseApi.trackEvent?.("checkout_started", {
        itemCount: cart.reduce((sum, item) => sum + Number(item.qty || 0), 0),
        path: window.location.pathname || ""
      });
      console.log("[VASTRA][checkout] creating server payment order");
      const serverPaymentOrder = await runWithSingleRetry(
        () => global.firebaseApi.createPaymentOrder(),
        "createPaymentOrder"
      );
      console.log("[VASTRA][checkout] opening Razorpay checkout");
      const paymentResponse = await global.VastraPayment.startRazorpayPayment({
        keyId: serverPaymentOrder.key_id || serverPaymentOrder.keyId,
        orderId: serverPaymentOrder.razorpay_order_id,
        amount: serverPaymentOrder.amount,
        currency: serverPaymentOrder.currency || "INR",
        order: serverPaymentOrder.order,
        customer: userDetails
      });

      console.log("[VASTRA][checkout] finalizing paid order");
      const orderId = await runWithSingleRetry(
        () =>
          global.firebaseApi.finalizePaidOrder({
            userInfo: userDetails,
            payment: {
              orderId: paymentResponse.razorpayOrderId || "",
              paymentId: paymentResponse.paymentId || "",
              signature: paymentResponse.signature || ""
            }
          }),
        "finalizePaidOrder"
      );
      global.firebaseApi.trackEvent?.("order_completed", {
        orderId,
        path: window.location.pathname || ""
      });
      // Cart is cleared server-side after finalize; also clear client copy.
      cartItems = [];
      renderCheckout([]);
      window.location.href = "./success.html?orderId=" + encodeURIComponent(orderId);
    } catch (error) {
      console.error("[VASTRA][checkout] failed", error);
      errorBox.textContent = error.message || "Payment failed. Please try again.";
    } finally {
      setLoading(false);
    }
  });

  payBtn.disabled = true;
  cartList.innerHTML = '<p class="muted">Loading your cart…</p>';
  initCheckoutFromFirebase().catch((e) => {
    console.error("[VASTRA][checkout] init failed", e);
    cartList.innerHTML = '<p class="muted">Unable to load cart. Please refresh.</p>';
  });
})(window);
