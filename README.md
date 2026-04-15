# VASTRA Full-Stack Upgrade

This project extends the existing static VASTRA storefront into a full-stack e-commerce app while keeping old pages (`1.html`, `2.html`, `cart.html`, `checkout.html`, `success.html`) intact.

## What was analyzed

- Existing UI was static and visually strong (Nike/Snitch-style), with product cards, cart drawer, and basic checkout pages.
- Core limitations found:
  - No true backend APIs
  - No authentication or protected routes
  - Products mostly hardcoded in client
  - No admin product management
  - Orders partially stored in localStorage/Firebase fallback only

## New architecture

```
/frontend
  app.js
  index.html
  styles.css
  /components
  /pages
  /services
  /utils

/backend
  /src
    server.js
    /routes
    /middleware
    /utils
  /data/db.json
```

## Features implemented

- JWT auth (`/api/auth/signup`, `/api/auth/login`, `/api/auth/me`)
- Dynamic products API with search + category filter
- Admin product CRUD (create/update/delete)
- Cart API sync (`/api/cart`)
- Checkout flow with Razorpay test mode popup + payment verification endpoints
- Orders API (`/api/orders`, `/api/orders/my`)
- My Orders page
- Admin dashboard (products + orders)
- Protected frontend routes (`#/cart`, `#/checkout`, `#/orders`, `#/admin`, `#/wishlist`, `#/track`)
- Local cart persistence + backend sync
- Toasts, loading states, empty states, and validation
- Live search suggestion dropdown in navbar
- Wishlist system with dedicated page
- Recently viewed products section
- Coupon system at checkout (`VASTRA10`, `WELCOME200`)
- Order tracking page with timeline states
- Legal pages (`#/legal/privacy`, `#/legal/terms`, `#/legal/refund`)
- Size recommendation feature on product details page
- UX micro-interactions: image hover swap, add-to-cart feedback animation, route transitions

## Run instructions

1. Install dependencies:
   - `npm install`
2. Configure env:
   - copy `.env.example` to `.env`
   - set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for payment verification
   - set `FIREBASE_PROJECT_ID`
   - set `FIREBASE_SERVICE_ACCOUNT_JSON` (single-line JSON with escaped newlines in private key)
   - set `CORS_ORIGIN` including deployed frontend domain(s) and local development origins
3. Firebase Auth production setup:
   - add your deployed Vercel domain in Firebase Console -> Authentication -> Settings -> Authorized domains
   - ensure `window.VASTRA_FIREBASE_CONFIG` in `firebase-config.js` uses matching `authDomain`
4. Start app:
   - `npm run dev`
5. Open:
   - `http://localhost:4000`

## Notes

- Existing old UI pages are untouched and still usable.
- New full-stack application is served from `frontend/index.html`.
- Default admin user in `backend/data/db.json`:
  - email: `admin@vastra.shop`
  - password hash is pre-seeded (you can replace or create via signup and then set role to `admin` in db).

# vastra
