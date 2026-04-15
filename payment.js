/* Razorpay test mode payment helper */
(function initVastraPayment(global) {
  function startRazorpayPayment(payload) {
    return new Promise((resolve, reject) => {
      if (!global.Razorpay) {
        reject(new Error("Razorpay SDK failed to load."));
        return;
      }
      if (!payload || !payload.order || !payload.keyId) {
        reject(new Error("Payment order is unavailable. Please retry checkout."));
        return;
      }

      const options = {
        key: payload.keyId,
        amount: Number(payload.amount || payload.order?.amount || 0),
        currency: payload.currency || payload.order?.currency || "INR",
        name: "VASTRA",
        description: "Order Payment",
        order_id: payload.orderId || payload.order?.id,
        prefill: {
          name: payload.customer.name,
          email: payload.customer.email,
          contact: payload.customer.phone
        },
        theme: {
          color: "#c9a96e"
        },
        handler(response) {
          resolve({
            paymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id || "",
            signature: response.razorpay_signature || ""
          });
        },
        modal: {
          ondismiss() {
            reject(new Error("Payment was cancelled."));
          }
        }
      };

      const paymentObject = new global.Razorpay(options);
      paymentObject.on("payment.failed", function onPaymentFailed(event) {
        const reason = event.error && event.error.description ? event.error.description : "Payment failed.";
        reject(new Error(reason));
      });
      paymentObject.open();
    });
  }

  global.VastraPayment = {
    startRazorpayPayment
  };
})(window);
