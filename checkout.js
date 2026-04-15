/* Checkout page behavior */
(function initCheckout(global) {
  const form = document.getElementById("checkoutForm");
  if (!form || !global.VastraCart) return;

  const cartList = document.getElementById("checkoutItems");
  const subtotalEl = document.getElementById("checkoutSubtotal");
  const totalEl = document.getElementById("checkoutTotal");
  const payBtn = document.getElementById("payNowBtn");
  const errorBox = document.getElementById("checkoutError");
  const loader = document.getElementById("checkoutLoader");

  function renderSummary() {
    const cart = global.VastraCart.getCart();
    if (!cart.length) {
      cartList.innerHTML = '<p class="muted">Your cart is empty. Please add items first.</p>';
      payBtn.disabled = true;
      return;
    }

    cartList.innerHTML = cart
      .map(
        (item) => `
        <div class="summary-item">
          <img src="${item.image}" alt="${item.name}">
          <div>
            <p>${item.name}</p>
            <small>Qty ${item.qty}</small>
          </div>
          <strong>${global.VastraCart.formatPrice(item.price * item.qty)}</strong>
        </div>
      `
      )
      .join("");

    const subtotal = global.VastraCart.getSubtotal();
    subtotalEl.textContent = global.VastraCart.formatPrice(subtotal);
    totalEl.textContent = global.VastraCart.formatPrice(subtotal);
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";

    const cart = global.VastraCart.getCart();
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

    setLoading(true);
    try {
      const totalAmount = global.VastraCart.getSubtotal();
      const paymentResponse = await global.VastraPayment.startRazorpayPayment({
        amount: totalAmount,
        customer: userDetails
      });

      const orderData = {
        userDetails,
        products: cart,
        totalAmount,
        paymentId: paymentResponse.paymentId,
        status: "paid"
      };

      const orderId = await global.VastraFirebase.saveOrderToFirestore(orderData);
      const completeOrder = { orderId, ...orderData };

      global.VastraCart.persistLastOrder(completeOrder);
      global.VastraCart.clearCart();
      window.location.href = "./success.html?orderId=" + encodeURIComponent(orderId);
    } catch (error) {
      errorBox.textContent = error.message || "Payment failed. Please try again.";
    } finally {
      setLoading(false);
    }
  });

  renderSummary();
})(window);
