const legalContent = {
  privacy: {
    title: "Privacy Policy",
    body: "We collect only required information to process orders, improve services, and provide customer support. Your data is never sold to third parties."
  },
  terms: {
    title: "Terms & Conditions",
    body: "By using this website, you agree to our purchase terms, return policies, and acceptable use standards. Orders may be canceled for suspected fraud."
  },
  refund: {
    title: "Refund Policy",
    body: "Returns are accepted within 14 days for unused items with tags. Refunds are processed to the original payment method after quality inspection."
  }
};

export function legalPage(app, section = "privacy") {
  const page = legalContent[section] || legalContent.privacy;
  app.innerHTML = `
    <div class="card stack fade-in center-card" style="padding:20px;">
      <div class="row">
        <h1>${page.title}</h1>
        <div class="row">
          <a class="btn" href="#/legal/privacy">Privacy</a>
          <a class="btn" href="#/legal/terms">Terms</a>
          <a class="btn" href="#/legal/refund">Refund</a>
        </div>
      </div>
      <p class="muted">${page.body}</p>
    </div>
  `;
}
