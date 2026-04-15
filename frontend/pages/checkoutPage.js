import { getLocalCart, setLocalCart } from "../services/cartService.js";
import { createOrder } from "../services/orderService.js";
import { showToast } from "../components/toast.js";
import { api } from "../services/api.js";

const RAZORPAY_FALLBACK_TEST_KEY = "rzp_test_1DP5mmOlF5G5ag";

function calcTotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
}

function applyCoupon(total, code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { total, discount: 0, message: "" };
  if (normalized === "VASTRA10") return { total: Math.max(0, total - Math.round(total * 0.1)), discount: Math.round(total * 0.1), message: "10% discount applied" };
  if (normalized === "WELCOME200") return { total: Math.max(0, total - 200), discount: 200, message: "₹200 discount applied" };
  return { total, discount: 0, message: "Invalid coupon code" };
}

function payWithRazorpay({ amount, customer, keyId, orderId, currency = "INR" }) {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay SDK missing"));
      return;
    }
    const rzp = new window.Razorpay({
      key: keyId || RAZORPAY_FALLBACK_TEST_KEY,
      amount: amount * 100,
      currency,
      ...(orderId ? { order_id: orderId } : {}),
      name: "VASTRA",
      description: "Checkout payment",
      prefill: { name: customer.name, email: customer.email, contact: customer.phone },
      handler(response) {
        resolve(response);
      },
      modal: {
        ondismiss() {
          reject(new Error("Payment cancelled"));
        }
      }
    });
    rzp.on("payment.failed", (event) => reject(new Error(event.error.description || "Payment failed")));
    rzp.open();
  });
}

export function checkoutPage(app) {
  const cart = getLocalCart();
  if (!cart.length) {
    app.innerHTML = `
      <div class="card empty-state fade-in">
        <p class="muted">Cart is empty.</p>
        <a href="#/" class="btn" style="display:inline-block;margin-top:8px;">Continue Shopping</a>
      </div>
    `;
    return;
  }
  const baseTotal = calcTotal(cart);

  app.innerHTML = `
    <h1 class="section-title">Checkout</h1>
    <div class="form-grid fade-in">
      <form id="checkoutForm" class="card stack" style="padding:16px;">
        <input name="name" placeholder="Full Name" required>
        <input name="email" type="email" placeholder="Email" required>
        <input name="phone" placeholder="Phone" required>
        <textarea name="address" placeholder="Address" required></textarea>
        <input name="cityPincode" placeholder="City / Pincode" required>
        <div class="row">
          <input id="couponInput" name="coupon" placeholder="Coupon code (e.g. VASTRA10)">
          <button id="applyCouponBtn" class="btn" type="button">Apply</button>
        </div>
        <p id="couponMessage" class="muted"></p>
        <p id="checkoutError" class="inline-error"></p>
        <button id="payBtn" class="btn primary" type="submit">Pay Now</button>
      </form>
      <aside class="card stack" style="padding:16px;">
        <h3>Order Summary</h3>
        ${cart.map((item) => `<div class="row"><span>${item.name} x ${item.qty}</span><strong>₹${(item.price * item.qty).toLocaleString("en-IN")}</strong></div>`).join("")}
        <div class="row"><strong>Subtotal</strong><strong id="subtotalAmount">₹${baseTotal.toLocaleString("en-IN")}</strong></div>
        <div class="row"><strong>Discount</strong><strong id="discountAmount">₹0</strong></div>
        <div class="row"><strong>Total</strong><strong class="price" id="finalAmount">₹${baseTotal.toLocaleString("en-IN")}</strong></div>
        <div class="trust-grid">
          <div class="trust-chip">Secure Payment</div>
          <div class="trust-chip">100% Original</div>
          <div class="trust-chip">Easy Returns</div>
        </div>
      </aside>
    </div>
  `;

  let finalTotal = baseTotal;
  let appliedCoupon = "";
  const couponInput = document.getElementById("couponInput");
  const couponMessage = document.getElementById("couponMessage");
  document.getElementById("applyCouponBtn").addEventListener("click", () => {
    const result = applyCoupon(baseTotal, couponInput.value);
    finalTotal = result.total;
    appliedCoupon = couponInput.value.trim();
    document.getElementById("discountAmount").textContent = `₹${result.discount.toLocaleString("en-IN")}`;
    document.getElementById("finalAmount").textContent = `₹${finalTotal.toLocaleString("en-IN")}`;
    couponMessage.textContent = result.message || "Coupon removed";
    couponMessage.className = result.discount > 0 ? "ok" : "muted";
  });

  document.getElementById("checkoutForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const details = Object.fromEntries(formData.entries());
    const errorEl = document.getElementById("checkoutError");
    errorEl.textContent = "";
    event.target.querySelectorAll("input,textarea").forEach((input) => input.classList.remove("field-error"));
    if (!details.name || !details.email || !details.phone || !details.address || !details.cityPincode) {
      errorEl.textContent = "Please fill all required fields.";
      Object.entries(details).forEach(([key, value]) => {
        if (!String(value || "").trim() && event.target.elements[key]) {
          event.target.elements[key].classList.add("field-error");
        }
      });
      showToast("Please fill all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      errorEl.textContent = "Please enter a valid email address.";
      event.target.elements.email.classList.add("field-error");
      showToast("Please enter valid email");
      return;
    }

    const payBtn = document.getElementById("payBtn");
    payBtn.disabled = true;
    payBtn.textContent = "Processing...";
    try {
      const paymentOrder = await api("/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: finalTotal })
      });
      const payment = await payWithRazorpay({
        amount: finalTotal,
        customer: details,
        keyId: paymentOrder?.keyId,
        orderId: paymentOrder?.mode === "live" ? paymentOrder?.order?.id : undefined,
        currency: paymentOrder?.order?.currency || "INR"
      });
      await api("/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature
        })
      }).catch(() => {});
      const { order } = await createOrder({
        products: cart,
        totalAmount: finalTotal,
        paymentId: payment.razorpay_payment_id,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_signature: payment.razorpay_signature,
        address: { ...details, coupon: appliedCoupon }
      });
      setLocalCart([]);
      localStorage.setItem("vastra_last_order", JSON.stringify(order));
      showToast("Order placed");
      location.hash = "#/success";
    } catch (error) {
      errorEl.textContent = error.message;
      showToast(error.message);
    } finally {
      payBtn.disabled = false;
      payBtn.textContent = "Pay Now";
    }
  });
}
