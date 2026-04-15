/* Razorpay test mode payment helper */
(function initVastraPayment(global) {
  // Public Razorpay test key (replace with your own for production use).
  const RAZORPAY_TEST_KEY = "rzp_test_1DP5mmOlF5G5ag";

  function startRazorpayPayment(payload) {
    return new Promise((resolve, reject) => {
      if (!global.Razorpay) {
        reject(new Error("Razorpay SDK failed to load."));
        return;
      }

      const options = {
        key: RAZORPAY_TEST_KEY,
        amount: Math.round(Number(payload.amount || 0) * 100),
        currency: "INR",
        name: "VASTRA",
        description: "Order Payment",
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
            orderId: response.razorpay_order_id || "",
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
