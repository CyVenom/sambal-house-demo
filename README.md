<p align="center">
  <img src="assets/favicon.svg" alt="Sambal House" width="96" height="96">
</p>

<h1 align="center">Sambal House (demo)</h1>

<p align="center">
  A click-through demo of a full e-commerce store for handcrafted chili pastes.<br>
  Static HTML, CSS and vanilla JavaScript. No server, no build step.
</p>

## What this is

Sambal House started as a three-person university group project (CIT6224 Web Application Development, Multimedia University), written in PHP and MySQL. I was the team leader and the full-stack and security lead. The original needs XAMPP to run, so this repo is a static rebuild of it: same look, same pages, same flow, but all the data lives in your own browser.

## Try it

1. Open the site and choose **Try as customer** on the login page (or register: the OTP code is shown on screen).
2. Add sambal to the cart, check out, pick a bank and confirm on the simulated FPX page.
3. Open **Track** on the order and watch it go Paid, Shipped, Received, Completed.
4. Once an order is completed, rate it. The review shows up on the product page.
5. Open the admin panel from the footer (one-click demo login) to see the dashboard, change order statuses and edit products.

Demo logins, if you prefer typing them:

| Role | Email | Password |
|------|-------|----------|
| Customer | `demo@sambal.local` | `demo1234` |
| Admin | `owner@sambal.local` | `owner123` |

## What the demo includes

- Shop with search, price, stock and category filters, and sorting
- Product pages with zoom, ratings, favourites and "you may also like"
- Cart, checkout with validation, and a simulated FPX bank gateway
- Orders with tabs, cancel (stock goes back), pay later, ratings and reviews
- Live order tracking with toasts and a countdown
- Profile with a saved address used to pre-fill checkout
- Admin: dashboard stats, order status control, product add, edit, deactivate and delete

## How it differs from the original

| | Original | This demo |
|---|---|---|
| Data | MySQL, 14 tables | Browser `localStorage`, same data model |
| Sign-up | Email OTP over SMTP | OTP shown on screen |
| Payment | Simulated FPX gateway | Same idea, with plain colour badges instead of real bank logos |
| Order tracking | Advances every 60 s | Advances every 20 s |
| Security | CSRF tokens, hashed passwords, session hardening, CSP | No server, so no auth to defend. Passwords are plain text in your browser, so don't reuse a real one. Security headers are set in `vercel.json`. |

Not rebuilt: returns and refunds tracking, PDF receipts, password reset, email-change verification, live admin polling, sales CSV export and the team page.

The 11 products, prices, stock levels and descriptions come from the original database. The demo customer and the two older orders are made-up sample data so the pages aren't empty.

## Run it locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Any static file server works.

## How it is built

```
index.html, product.html, cart.html, ...   one page per screen
admin/                                     admin panel pages
assets/app.js                              the whole "backend": state, cart, orders, auth, page chrome
assets/seed.js                             product catalogue
assets/style.css, assets/css/              the original stylesheets, split per page
assets/images/                             product photos (WebP) and bank badges
vercel.json                                security headers
```

Use **Reset demo data** in the footer to put everything back to the starting state.
