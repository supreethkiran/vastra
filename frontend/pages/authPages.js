import { login, signup } from "../services/authService.js";
import { showToast } from "../components/toast.js";

function nextAfterAuth() {
  try {
    const redirect = sessionStorage.getItem("vastra_post_auth_redirect");
    if (redirect) {
      sessionStorage.removeItem("vastra_post_auth_redirect");
      return redirect;
    }
  } catch {
    // ignore
  }
  return "#/";
}

function mountAuthModal({ app, title, subtitle, mode, bodyHtml }) {
  const closeTarget = window.__vastraLastNonAuthHash || "#/";
  app.innerHTML = `
    <div class="auth-modal open" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="auth-modal-backdrop" id="authBackdrop"></div>
      <div class="auth-modal-content" role="document">
        <button class="auth-modal-close" id="authCloseBtn" type="button" aria-label="Close">✕</button>
        <div class="auth-modal-inner">
          <aside class="auth-modal-hero" aria-hidden="true">
            <div class="auth-modal-hero-inner">
              <div class="auth-logo">VASTRA</div>
              <div class="auth-eyebrow">Join the Culture</div>
              <div class="auth-modal-hero-title">Wear the statement. Own the room.</div>
              <div class="auth-modal-hero-sub">${subtitle || ""}</div>
            </div>
          </aside>
          <div class="auth-modal-panel">
            <div class="card auth-card auth-card--modal">
              <div class="auth-card-head">
                <div class="auth-brand">VASTRA</div>
                <h2 class="auth-card-title">${title}</h2>
                <p class="muted">${subtitle || ""}</p>
              </div>
              ${bodyHtml}
              <div class="auth-trust">
                <div class="muted">✔ Trusted by 10,000+ users</div>
                <div class="muted">✔ Secure checkout with Razorpay</div>
                <div class="muted">✔ Fast delivery across India</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const close = () => {
    location.hash = closeTarget;
  };
  document.getElementById("authBackdrop")?.addEventListener("click", close);
  document.getElementById("authCloseBtn")?.addEventListener("click", close);
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") close();
    },
    { once: true }
  );
}

function bindPhoneFlow({ rootIdPrefix = "" }) {
  const q = (id) => document.getElementById(`${id}${rootIdPrefix}`);
  const step1 = q("phoneStep1");
  const step2 = q("phoneStep2");
  const toggle = q("phoneToggleBtn");
  const phoneInput = q("phoneInput");
  const otpInput = q("otpInput");
  const sendBtn = q("sendOtpBtn");
  const verifyBtn = q("verifyOtpBtn");
  const resendBtn = q("resendOtpBtn");
  const countdownEl = q("otpCountdown");

  let timer = null;
  let remaining = 0;

  function renderCountdown() {
    if (!countdownEl || !resendBtn) return;
    if (remaining <= 0) {
      countdownEl.textContent = "";
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend OTP";
      return;
    }
    countdownEl.textContent = `Resend OTP in ${remaining}s`;
    resendBtn.disabled = true;
    resendBtn.textContent = "Resend OTP";
  }

  function startCountdown(seconds = 30) {
    remaining = seconds;
    renderCountdown();
    clearInterval(timer);
    timer = setInterval(() => {
      remaining -= 1;
      renderCountdown();
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
  }

  function open() {
    const panel = q("phoneAuthPanel");
    if (panel) panel.style.display = "grid";
    if (step1) step1.style.display = "grid";
    if (step2) step2.style.display = "none";
    phoneInput?.focus?.();
  }

  toggle?.addEventListener("click", () => {
    const panel = q("phoneAuthPanel");
    const openNow = panel?.style?.display !== "none";
    if (panel) panel.style.display = openNow ? "none" : "grid";
    if (!openNow) open();
  });

  async function sendOtp() {
    const phone = String(phoneInput?.value || "").trim();
    if (!phone) {
      showToast("Enter phone number");
      return;
    }
    try {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<span class="spinner"></span> Sending…';
      await window.firebaseReady;
      await window.firebaseApi.sendOTP(phone);
      showToast("OTP sent");
      if (step1) step1.style.display = "none";
      if (step2) step2.style.display = "grid";
      otpInput?.focus?.();
      startCountdown(30);
    } catch (e) {
      console.error("send OTP failed:", e);
      showToast(e?.message || "Unable to send OTP");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send OTP";
    }
  }

  async function verifyOtp() {
    const code = String(otpInput?.value || "").trim();
    if (!code) {
      showToast("Enter OTP");
      return;
    }
    try {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = '<span class="spinner"></span> Verifying…';
      await window.firebaseReady;
      await window.firebaseApi.verifyOTP(code);
      showToast("Success");
      location.hash = nextAfterAuth();
    } catch (e) {
      console.error("verify OTP failed:", e);
      showToast(e?.message || "Unable to verify OTP");
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify";
    }
  }

  sendBtn?.addEventListener("click", sendOtp);
  resendBtn?.addEventListener("click", sendOtp);
  verifyBtn?.addEventListener("click", verifyOtp);
}

export function loginPage(app) {
  mountAuthModal({
    app,
    mode: "login",
    title: "Welcome back",
    subtitle: "Sign in to track orders, unlock drops, and checkout faster.",
    bodyHtml: `
      <form id="loginForm" class="auth-form" style="margin-top:14px;">
        <div class="float-field">
          <input name="email" type="email" placeholder=" " autocomplete="email" required>
          <label>Email</label>
        </div>
        <div class="float-field">
          <input name="password" type="password" placeholder=" " autocomplete="current-password" required>
          <label>Password</label>
        </div>
        <p id="loginError" class="inline-error auth-error"></p>
        <button id="loginBtn" class="btn primary auth-cta" type="submit">Sign in</button>
        <div class="auth-or"><span>OR</span></div>
        <button id="googleLoginBtn" class="btn auth-google" type="button">
          <span class="g-icon" aria-hidden="true"></span>
          Continue with Google
        </button>
        <button id="phoneToggleBtn" class="btn auth-phone-toggle" type="button">Continue with phone</button>
        <div id="phoneAuthPanel" class="auth-phone" style="display:none;">
          <div id="phoneStep1" class="auth-phone-step">
            <div class="muted" style="font-size:12px;">We’ll send a one-time code to verify your number.</div>
            <div class="row" style="gap:10px;">
              <input id="phoneInput" placeholder="+91XXXXXXXXXX" autocomplete="tel">
              <button id="sendOtpBtn" class="btn" type="button">Send OTP</button>
            </div>
            <div id="recaptcha-container"></div>
          </div>
          <div id="phoneStep2" class="auth-phone-step" style="display:none;">
            <div class="row" style="gap:10px;">
              <input id="otpInput" placeholder="Enter OTP" inputmode="numeric">
              <button id="verifyOtpBtn" class="btn primary" type="button">Verify</button>
            </div>
            <div class="row" style="justify-content:space-between;">
              <span id="otpCountdown" class="muted" style="font-size:12px;"></span>
              <button id="resendOtpBtn" class="btn ghost" type="button">Resend OTP</button>
            </div>
          </div>
        </div>
        <p class="muted auth-foot">New here? <a class="auth-link" href="#/signup">Create account</a></p>
      </form>
    `
  });
  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const errorEl = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginBtn");
    errorEl.textContent = "";
    event.target.querySelectorAll("input").forEach((input) => input.classList.remove("field-error"));

    if (!email || !password) {
      errorEl.textContent = "Email and password are required.";
      if (!email) event.target.elements.email.classList.add("field-error");
      if (!password) event.target.elements.password.classList.add("field-error");
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span> Processing…';
      await login({
        email,
        password
      });
      showToast("Login successful");
      location.hash = nextAfterAuth();
    } catch (error) {
      errorEl.textContent = error.message || "Unable to sign in";
      showToast(error.message || "Invalid credentials");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Sign in";
    }
  });

  // Providers (no change to email/password login)
  const googleBtn = document.getElementById("googleLoginBtn");
  googleBtn?.addEventListener("click", async () => {
    try {
      googleBtn.disabled = true;
      googleBtn.innerHTML = '<span class="spinner"></span> Processing…';
      await window.firebaseReady;
      await window.firebaseApi.signInWithGoogle();
      showToast("Logged in");
      location.hash = nextAfterAuth();
    } catch (e) {
      console.error("Google login failed:", e);
      showToast("Google login failed");
    } finally {
      googleBtn.disabled = false;
      googleBtn.innerHTML = '<span class="g-icon" aria-hidden="true"></span> Continue with Google';
    }
  });

  bindPhoneFlow({ rootIdPrefix: "" });
}

export function signupPage(app) {
  mountAuthModal({
    app,
    mode: "signup",
    title: "Create account",
    subtitle: "Unlock drops, track orders, and checkout in seconds.",
    bodyHtml: `
      <form id="signupForm" class="auth-form" style="margin-top:14px;">
        <div class="float-field">
          <input name="name" type="text" placeholder=" " autocomplete="name" required>
          <label>Full name</label>
        </div>
        <div class="float-field">
          <input name="email" type="email" placeholder=" " autocomplete="email" required>
          <label>Email</label>
        </div>
        <div class="float-field">
          <input name="password" type="password" placeholder=" " autocomplete="new-password" required>
          <label>Password</label>
        </div>
        <p id="signupError" class="inline-error auth-error"></p>
        <button id="signupBtn" class="btn primary auth-cta" type="submit">Create account</button>
        <div class="auth-or"><span>OR</span></div>
        <button id="googleSignupBtn" class="btn auth-google" type="button">
          <span class="g-icon" aria-hidden="true"></span>
          Continue with Google
        </button>
        <button id="phoneToggleBtn" class="btn auth-phone-toggle" type="button">Continue with phone</button>
        <div id="phoneAuthPanel" class="auth-phone" style="display:none;">
          <div id="phoneStep1" class="auth-phone-step">
            <div class="muted" style="font-size:12px;">We’ll send a one-time code to verify your number.</div>
            <div class="row" style="gap:10px;">
              <input id="phoneInput" placeholder="+91XXXXXXXXXX" autocomplete="tel">
              <button id="sendOtpBtn" class="btn" type="button">Send OTP</button>
            </div>
            <div id="recaptcha-container"></div>
          </div>
          <div id="phoneStep2" class="auth-phone-step" style="display:none;">
            <div class="row" style="gap:10px;">
              <input id="otpInput" placeholder="Enter OTP" inputmode="numeric">
              <button id="verifyOtpBtn" class="btn primary" type="button">Verify</button>
            </div>
            <div class="row" style="justify-content:space-between;">
              <span id="otpCountdown" class="muted" style="font-size:12px;"></span>
              <button id="resendOtpBtn" class="btn ghost" type="button">Resend OTP</button>
            </div>
          </div>
        </div>
        <p class="muted auth-foot">Already have an account? <a class="auth-link" href="#/login">Sign in</a></p>
      </form>
    `
  });
  document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const errorEl = document.getElementById("signupError");
    const signupBtn = document.getElementById("signupBtn");
    errorEl.textContent = "";
    event.target.querySelectorAll("input").forEach((input) => input.classList.remove("field-error"));

    if (!name || !email || !password) {
      errorEl.textContent = "All fields are required.";
      if (!name) event.target.elements.name.classList.add("field-error");
      if (!email) event.target.elements.email.classList.add("field-error");
      if (!password) event.target.elements.password.classList.add("field-error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = "Enter a valid email address.";
      event.target.elements.email.classList.add("field-error");
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = "Password must be at least 6 characters.";
      event.target.elements.password.classList.add("field-error");
      return;
    }

    try {
      signupBtn.disabled = true;
      signupBtn.innerHTML = '<span class="spinner"></span> Processing…';
      await signup({
        name,
        email,
        password
      });
      showToast("Account created");
      location.hash = nextAfterAuth();
    } catch (error) {
      errorEl.textContent = error.message || "Unable to create account";
      showToast(error.message || "Signup failed");
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = "Create account";
    }
  });

  const googleSignupBtn = document.getElementById("googleSignupBtn");
  googleSignupBtn?.addEventListener("click", async () => {
    try {
      googleSignupBtn.disabled = true;
      googleSignupBtn.innerHTML = '<span class="spinner"></span> Processing…';
      await window.firebaseReady;
      await window.firebaseApi.signInWithGoogle();
      showToast("Signed in");
      location.hash = nextAfterAuth();
    } catch (e) {
      console.error("Google signup failed:", e);
      showToast("Google login failed");
    } finally {
      googleSignupBtn.disabled = false;
      googleSignupBtn.innerHTML = '<span class="g-icon" aria-hidden="true"></span> Continue with Google';
    }
  });

  bindPhoneFlow({ rootIdPrefix: "" });
}
