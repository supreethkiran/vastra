# VASTRA Launch and Deployment Playbook

## Launch Strategy

### Pre-launch (Day -5 to Day -1)

- Teaser campaign with countdown stories and close-up product visuals
- Waitlist capture via bio link
- Creator seeding starts
- “Coming soon” posts with moodboard aesthetics

### Launch day

- Hero offer: `10% OFF first order` (coupon: `VASTRA10`)
- Launch reel + pinned post + story highlights
- First 100 orders social proof campaign

### Post-launch (Day +1 to Day +14)

- Best seller push
- UGC repost strategy
- Review and testimonial capture
- Weekly drop calendar announcement

## Domain and Hosting

### Domain

- Preferred: `vastra.in`
- Backup: `shopvastra.in`, `vastrastudio.in`

### Frontend deployment (Vercel)

1. Connect Git repository to Vercel
2. Set build/output for static frontend
3. Add env:
   - `VITE_API_URL` (if adopting build-time env flow)
4. Map custom domain

### Backend deployment (Render / Node hosting)

1. Deploy Node service (`backend/src/server.js`)
2. Set env:
   - `PORT`
   - `JWT_SECRET`
   - `CORS_ORIGIN`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
3. Configure health check `/api/health`

## Razorpay Live Setup

1. Switch from test keys to live keys
2. Store keys only in environment variables
3. Keep signature verification on backend enabled
4. Validate webhook/event pipeline (recommended next phase)

## Production Readiness Checklist

- [ ] All primary buttons and navigation paths tested
- [ ] Signup/login/cart/checkout/order-success tested on mobile + desktop
- [ ] Payment success + failure paths tested
- [ ] No `localhost` API references in production
- [ ] Rate limit and security headers enabled
- [ ] Legal pages visible from footer/nav
- [ ] Analytics and conversion tracking active
