/* Sambal House demo: the whole "backend" lives in the visitor's browser (localStorage).
 * Nothing is sent to a server. See README.md for how this maps to the original PHP/MySQL app. */
(function () {
  'use strict';

  var KEY = 'sambal_demo_v1';
  var STEP_MS = 20000; // PAID -> SHIPPED -> RECEIVED -> COMPLETED, one step per 20 s (original: 60 s)
  var BANKS = {
    MAYBANK:   { name: 'Maybank',             short: 'Maybank',      abbr: 'MAY',  color: '#F5A000', bg: '#FFFBF0', logo: 'maybank' },
    CIMB:      { name: 'CIMB Bank',           short: 'CIMB Bank',    abbr: 'CIMB', color: '#BE0B0B', bg: '#FFF5F5', logo: 'cimb' },
    PUBLIC:    { name: 'Public Bank Berhad',  short: 'Public Bank',  abbr: 'PBB',  color: '#003087', bg: '#F0F4FF', logo: 'public' },
    RHB:       { name: 'RHB Bank',            short: 'RHB Bank',     abbr: 'RHB',  color: '#7B2D8B', bg: '#FAF0FF', logo: 'rhb' },
    HONGLEONG: { name: 'Hong Leong Bank',     short: 'Hong Leong',   abbr: 'HLB',  color: '#0066CC', bg: '#F0F7FF', logo: 'hongleong' },
    AMBANK:    { name: 'AmBank',              short: 'AmBank',       abbr: 'AMB',  color: '#C1121F', bg: '#FFF5F5', logo: 'ambank' },
    BANKISLAM: { name: 'Bank Islam Malaysia', short: 'Bank Islam',   abbr: 'BIMB', color: '#00843D', bg: '#F0FFF6', logo: 'bankislam' },
    TOUCHNGO:  { name: "Touch 'n Go eWallet", short: "Touch 'n Go",  abbr: 'TNG',  color: '#1A9FDD', bg: '#F0FAFF', logo: 'touchngo' }
  };
  var STATES = ['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'];
  var EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'yahoo.com.my', 'outlook.com', 'hotmail.com', 'hotmail.my', 'icloud.com', 'me.com', 'mac.com', 'live.com', 'protonmail.com', 'proton.me', 'fastmail.com', 'zoho.com', 'gmx.com', 'mail.com', 'qq.com', '163.com', 'yandex.com', 'tm.net.my', 'streamyx.com', 'naver.com', 'googlemail.com', 'msn.com', 'aol.com', 'sambal.local'];

  var DAY = 86400000;

  function seed() {
    var now = Date.now();
    return {
      v: 1,
      nextOrderId: 3,
      nextUserId: 2,
      products: (window.SEED_PRODUCTS || []).map(function (p) { return Object.assign({}, p); }),
      users: [{ id: 1, name: 'Demo Customer', email: 'demo@sambal.local', password: 'demo1234', phone: '+60 12-345 6789',
        address_line1: '12 Jalan Contoh', address_line2: '', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur', postcode: '50000', created: now - 10 * DAY }],
      admin: { name: 'Owner', email: 'owner@sambal.local', password: 'owner123' },
      carts: {}, favs: {}, reviews: [],
      orders: [
        { id: 1, user_id: 1, full_name: 'Demo Customer', email: 'demo@sambal.local', phone: '+60 12-345 6789', address_line1: '12 Jalan Contoh', address_line2: '',
          city: 'Kuala Lumpur', state_region: 'W.P. Kuala Lumpur', postcode: '50000', country: 'Malaysia', payment_method: 'FPX', bank: 'MAYBANK', status: 'COMPLETED', total: 34.80,
          created_at: now - 4 * DAY, paid_at: now - 4 * DAY + 60000, shipped_at: now - 4 * DAY + 120000, received_at: now - 3 * DAY, completed_at: now - 3 * DAY + 60000,
          items: [{ product_id: 1, name: 'Sambal Belacan 230g', price: 15.90, qty: 1 }, { product_id: 11, name: 'Sambal Ikan Bilis 230g', price: 18.90, qty: 1 }] },
        { id: 2, user_id: 1, full_name: 'Demo Customer', email: 'demo@sambal.local', phone: '+60 12-345 6789', address_line1: '12 Jalan Contoh', address_line2: '',
          city: 'Kuala Lumpur', state_region: 'W.P. Kuala Lumpur', postcode: '50000', country: 'Malaysia', payment_method: 'FPX', bank: 'CIMB', status: 'CANCELLED', total: 29.90,
          created_at: now - 2 * DAY, paid_at: null, cancelled_at: now - 2 * DAY + 600000,
          items: [{ product_id: 14, name: 'Sambal Udang 230g', price: 29.90, qty: 1 }] }
      ]
    };
  }

  var state;
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || state.v !== 1) { state = seed(); save(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ } }
  function sess() { try { return JSON.parse(sessionStorage.getItem('sambal_session')) || {}; } catch (e) { return {}; } }
  function setSess(o) { sessionStorage.setItem('sambal_session', JSON.stringify(Object.assign(sess(), o))); }

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(ts, withTime) {
    if (!ts) return '';
    var d = new Date(ts), s = (d.getDate() < 10 ? '0' : '') + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
    if (withTime === false) return s;
    var h = d.getHours() % 12 || 12, m = d.getMinutes();
    return s + ', ' + h + ':' + (m < 10 ? '0' : '') + m + ' ' + (d.getHours() >= 12 ? 'PM' : 'AM');
  }
  function stockBadge(stock, short) {
    if (stock > 10) return { cls: 'green', text: short ? 'In Stock' : 'In stock: ' + stock, status: 'in-stock' };
    if (stock > 0) return { cls: 'low', text: short ? 'Low Stock' : 'Low stock: ' + stock, status: 'low-stock' };
    return { cls: 'oos', text: 'Out of stock', status: 'out-of-stock' };
  }
  function flash(type, title, text) { sessionStorage.setItem('sambal_flash', JSON.stringify({ type: type, title: title, text: text })); }
  function showFlash() {
    var f; try { f = JSON.parse(sessionStorage.getItem('sambal_flash')); } catch (e) { f = null; }
    if (!f) return;
    sessionStorage.removeItem('sambal_flash');
    if (!window.Swal) return;
    var o = { icon: f.type, title: f.title, text: f.text };
    if (f.type === 'success') { o.timer = 1500; o.showConfirmButton = false; }
    Swal.fire(o);
  }

  // ---------- auth ----------
  function user() { var s = sess(); if (!s.uid) return null; return state.users.filter(function (u) { return u.id === s.uid; })[0] || null; }
  function isAdmin() { return !!sess().admin; }
  function login(email, password) {
    email = (email || '').trim().toLowerCase();
    var u = state.users.filter(function (x) { return x.email.toLowerCase() === email && x.password === password; })[0];
    if (!u) return false;
    setSess({ uid: u.id }); return true;
  }
  function loginAs(id) { setSess({ uid: id }); }
  function adminLogin(email, password) {
    if ((email || '').trim().toLowerCase() === state.admin.email && password === state.admin.password) { setSess({ admin: true }); return true; }
    return false;
  }
  function logout(which) { var s = sess(); if (which === 'admin') delete s.admin; else delete s.uid; sessionStorage.setItem('sambal_session', JSON.stringify(s)); }
  function register(d) {
    var email = d.email.trim().toLowerCase();
    if (state.users.some(function (u) { return u.email.toLowerCase() === email; })) return { error: 'An account with this email already exists.' };
    var u = { id: state.nextUserId++, name: d.name.trim(), email: email, password: d.password, phone: d.phone || '', address_line1: '', address_line2: '', city: '', state: '', postcode: '', created: Date.now() };
    state.users.push(u); save(); setSess({ uid: u.id });
    return { user: u };
  }
  function requireUser(msg) {
    if (user()) return true;
    flash('error', 'Login Required', msg || 'Please sign in to continue.');
    location.href = '/login.html?next=' + encodeURIComponent(location.pathname + location.search);
    return false;
  }
  function requireAdmin() {
    if (isAdmin()) return true;
    location.href = '/admin/login.html'; return false;
  }

  // ---------- catalogue ----------
  function products(all) { return state.products.filter(function (p) { return all || p.active; }); }
  function productBySlug(slug) { return state.products.filter(function (p) { return p.slug === slug && p.active; })[0] || null; }
  function productById(id) { return state.products.filter(function (p) { return p.id === id; })[0] || null; }

  // ---------- cart ----------
  function cartItems() {
    var u = user(); if (!u) return [];
    var c = state.carts[u.id] || [];
    return c.map(function (it) { var p = productById(it.product_id); return p ? { product: p, qty: it.qty } : null; }).filter(Boolean);
  }
  function cartCount() { return cartItems().reduce(function (a, i) { return a + i.qty; }, 0); }
  function cartTotal() { return cartItems().reduce(function (a, i) { return a + i.product.price * Math.min(i.qty, i.product.stock); }, 0); }
  function addToCart(pid, qty) {
    var u = user(); if (!u) return false;
    var p = productById(pid); if (!p || p.stock <= 0) return false;
    var c = state.carts[u.id] = state.carts[u.id] || [];
    var it = c.filter(function (x) { return x.product_id === pid; })[0];
    if (it) it.qty = Math.min(it.qty + qty, p.stock); else c.push({ product_id: pid, qty: Math.min(qty, p.stock) });
    save(); return true;
  }
  function setCartQty(pid, qty) {
    var u = user(); if (!u) return;
    var c = state.carts[u.id] || [];
    var p = productById(pid);
    qty = Math.max(0, Math.min(qty, p ? p.stock : 0));
    state.carts[u.id] = c.filter(function (x) { return x.product_id !== pid || qty > 0; }).map(function (x) { if (x.product_id === pid) x.qty = qty; return x; });
    save();
  }

  // ---------- favourites ----------
  function favs() { var u = user(); return u ? (state.favs[u.id] || []) : []; }
  function toggleFav(pid) {
    var u = user(); if (!u) return null;
    var f = state.favs[u.id] = state.favs[u.id] || [];
    var i = -1; f.forEach(function (x, k) { if (x.product_id === pid) i = k; });
    if (i >= 0) f.splice(i, 1); else f.push({ product_id: pid, saved: Date.now() });
    save(); return { favourited: i < 0, count: f.length };
  }

  // ---------- orders ----------
  var FLOW = { PAID: ['SHIPPED', 'shipped_at'], SHIPPED: ['RECEIVED', 'received_at'], RECEIVED: ['COMPLETED', 'completed_at'] };
  var FLOW_FROM = { PAID: 'paid_at', SHIPPED: 'shipped_at', RECEIVED: 'received_at' };
  function advance(o) {
    var changed = false;
    for (var i = 0; i < 3; i++) {
      var f = FLOW[o.status]; if (!f) break;
      var from = o[FLOW_FROM[o.status]]; if (!from || Date.now() - from < STEP_MS) break;
      o.status = f[0]; o[f[1]] = from + STEP_MS; changed = true;
    }
    return changed;
  }
  function advanceAll() { var ch = false; state.orders.forEach(function (o) { if (advance(o)) ch = true; }); if (ch) save(); }
  function myOrders() { var u = user(); if (!u) return []; advanceAll(); return state.orders.filter(function (o) { return o.user_id === u.id; }).sort(function (a, b) { return b.id - a.id; }); }
  function orderById(id, anyUser) {
    advanceAll();
    var u = user();
    return state.orders.filter(function (o) { return o.id === id && (anyUser || (u && o.user_id === u.id)); })[0] || null;
  }
  function placeOrder(d, bank) {
    var u = user(), items = cartItems();
    if (!u || !items.length) return { error: 'Your cart is empty.' };
    var adjusted = items.some(function (i) { return i.qty > i.product.stock; });
    if (adjusted) {
      items.forEach(function (i) { if (i.qty > i.product.stock) setCartQty(i.product.id, i.product.stock); });
      return { error: 'Some quantities were adjusted to available stock. Please review your cart.' };
    }
    var total = 0, lines = items.map(function (i) { total += i.product.price * i.qty; return { product_id: i.product.id, name: i.product.name, price: i.product.price, qty: i.qty }; });
    items.forEach(function (i) { i.product.stock -= i.qty; });
    var o = Object.assign({ id: state.nextOrderId++, user_id: u.id, payment_method: 'FPX', bank: bank, status: 'PENDING', total: total, created_at: Date.now(), paid_at: null, items: lines }, d);
    state.orders.push(o); state.carts[u.id] = []; save();
    return { order: o };
  }
  function payOrder(id) {
    var o = orderById(id); if (!o || o.status !== 'PENDING') return o;
    o.status = 'PAID'; o.paid_at = Date.now(); save(); return o;
  }
  function cancelOrder(id) {
    var o = orderById(id); if (!o || (o.status !== 'PENDING' && o.status !== 'PAID')) return false;
    o.items.forEach(function (it) { var p = productById(it.product_id); if (p) p.stock += it.qty; });
    o.status = 'CANCELLED'; o.cancelled_at = Date.now(); save(); return true;
  }
  function addReviews(orderId, list) {
    var u = user(), o = orderById(orderId); if (!u || !o || o.status !== 'COMPLETED') return;
    list.forEach(function (r) {
      if (!o.items.some(function (i) { return i.product_id === r.product_id; })) return;
      state.reviews = state.reviews.filter(function (x) { return !(x.user_id === u.id && x.product_id === r.product_id); });
      state.reviews.push({ product_id: r.product_id, user_id: u.id, order_id: orderId, rating: r.rating, text: r.text || '', created: Date.now(), name: u.name });
    });
    save();
  }
  function reviewsFor(pid) { return state.reviews.filter(function (r) { return r.product_id === pid; }).sort(function (a, b) { return b.created - a.created; }); }
  function myReview(pid) { var u = user(); return u ? state.reviews.filter(function (r) { return r.product_id === pid && r.user_id === u.id; })[0] || null : null; }

  // ---------- admin ----------
  function adminSetStatus(id, status) {
    var o = orderById(id, true); if (!o || o.status === 'CANCELLED') return;
    var now = Date.now(), order = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'RECEIVED', 'COMPLETED'];
    o.status = status;
    if (order.indexOf(status) >= 1 && !o.paid_at) o.paid_at = now;
    if (order.indexOf(status) >= 3 && !o.shipped_at) o.shipped_at = now;
    if (order.indexOf(status) >= 4 && !o.received_at) o.received_at = now;
    if (status === 'COMPLETED' && !o.completed_at) o.completed_at = now;
    save();
  }
  function adminSaveProduct(p) {
    if (p.id) { var cur = productById(p.id); Object.assign(cur, p); }
    else { p.id = state.products.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1; p.active = true; p.image = p.image || '/assets/images/products/' + state.products[0].image.split('/').pop(); state.products.push(p); }
    save();
  }
  function adminDeleteProduct(id) { state.products = state.products.filter(function (p) { return p.id !== id; }); Object.keys(state.carts).forEach(function (k) { state.carts[k] = state.carts[k].filter(function (i) { return i.product_id !== id; }); }); save(); }
  function reset() { localStorage.removeItem(KEY); sessionStorage.clear(); load(); }

  // ---------- page chrome ----------
  function navHTML() {
    var u = user(), n = cartCount(), fc = favs().length;
    var right = '<a href="/index.html#shop" class="nav-box"><i class="fas fa-store"></i> &nbsp;Shop</a>' +
      '<a href="/about.html" class="nav-box"><i class="fas fa-circle-info"></i> &nbsp;About</a>' +
      '<a href="/cart.html" class="nav-box"><i class="fas fa-cart-shopping"></i> &nbsp;Cart (' + n + ')</a>';
    var mob = '<a href="/index.html#shop" class="nav-box"><i class="fas fa-store"></i> Shop</a><a href="/about.html" class="nav-box"><i class="fas fa-circle-info"></i> About</a><a href="/cart.html" class="nav-box"><i class="fas fa-cart-shopping"></i> Cart (' + n + ')</a>';
    var center, mobTop;
    if (u) {
      center = '<a href="/profile.html" class="nav-box"><i class="fas fa-user-circle"></i> &nbsp;Hi, ' + esc(u.name.split(' ')[0]) + '</a>';
      mobTop = '<a href="/profile.html" class="nav-box"><i class="fas fa-user-circle"></i> Hi, ' + esc(u.name.split(' ')[0]) + '</a>';
      right += '<a href="/favourites.html" class="nav-box" style="position:relative"><i class="fas fa-heart" style="color:#f87171"></i> &nbsp;Favourites' +
        '<span id="navFavCount" style="position:absolute;top:-5px;right:-5px;background:#f87171;color:#fff;font-size:.6rem;font-weight:700;border-radius:99px;padding:1px 5px;min-width:16px;text-align:center;line-height:1.6;' + (fc === 0 ? 'display:none' : '') + '">' + fc + '</span></a>' +
        '<a href="/orders.html" class="nav-box"><i class="fas fa-receipt"></i> &nbsp;My Orders</a>' +
        '<a href="#" class="nav-box" data-logout><i class="fas fa-right-from-bracket"></i> &nbsp;Logout</a>';
      mob += '<a href="/favourites.html" class="nav-box"><i class="fas fa-heart" style="color:#f87171"></i> Favourites' + (fc ? ' (' + fc + ')' : '') + '</a><a href="/orders.html" class="nav-box"><i class="fas fa-receipt"></i> My Orders</a><a href="#" class="nav-box" data-logout><i class="fas fa-right-from-bracket"></i> Logout</a>';
    } else {
      center = '<a href="/login.html" class="nav-box nav-login-btn"><i class="fas fa-right-to-bracket"></i> &nbsp;Login</a><a href="/register.html" class="nav-box nav-register-btn"><i class="fas fa-user-plus"></i> &nbsp;Register</a>';
      mobTop = '<a href="/login.html" class="nav-box nav-login-btn"><i class="fas fa-right-to-bracket"></i> Login</a><a href="/register.html" class="nav-box nav-register-btn"><i class="fas fa-user-plus"></i> Register</a>';
    }
    return '<div class="demo-banner"><i class="fas fa-flask"></i> Demo build: runs entirely in your browser, nothing is sent anywhere. <a href="/about.html">How it works</a></div>' +
      '<nav class="navbar" id="main-nav"><div class="nav-left"><a href="/index.html"><b>Sambal House</b></a></div><div class="nav-center">' + center + '</div><div class="nav-right">' + right + '</div>' +
      '<button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button></nav>' +
      '<div class="nav-mobile-menu" id="nav-mobile-menu">' + mobTop + mob + '</div>';
  }
  function footerHTML() {
    return '<footer class="site-footer"><div class="site-footer-inner"><div class="brand-block"><div class="brand"><i class="fas fa-pepper-hot"></i> Sambal House</div>' +
      '<p>Handcrafted Malaysian chili pastes made fresh in small batches. Bringing the heat from our kitchen to your table since day one.</p></div>' +
      '<div><h4>Shop</h4><ul><li><a href="/index.html#shop">All Sambal</a></li><li><a href="/cart.html">Your Cart</a></li><li><a href="/orders.html">My Orders</a></li></ul></div>' +
      '<div><h4>Demo</h4><ul><li><a href="/about.html">How this demo works</a></li><li><a href="/admin/login.html">Admin panel</a></li><li><a href="#" id="resetDemo">Reset demo data</a></li></ul></div></div>' +
      '<div class="copy">&copy; ' + new Date().getFullYear() + ' Sambal House demo &nbsp;·&nbsp; A university group project, rebuilt as a static demo</div></footer>';
  }
  function adminNavHTML() {
    return '<nav class="navbar"><div class="nav-left"><a href="/admin/index.html"><b>Sambal House · Admin</b></a></div>' +
      '<div class="nav-center"><span class="nav-box"><i class="fas fa-user-shield"></i> &nbsp;Hello, Owner</span></div>' +
      '<div class="nav-right"><a href="/admin/index.html" class="nav-box"><i class="fas fa-tachometer-alt"></i> &nbsp;Dashboard</a>' +
      '<a href="/admin/products.html" class="nav-box"><i class="fas fa-box"></i> &nbsp;Products</a>' +
      '<a href="/admin/orders.html" class="nav-box"><i class="fas fa-shopping-cart"></i> &nbsp;Orders</a>' +
      '<a href="/index.html" class="nav-box" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> &nbsp;View Shop</a>' +
      '<a href="#" class="nav-box" data-logout><i class="fas fa-sign-out-alt"></i> &nbsp;Logout</a></div></nav>';
  }

  function updateNavCounts() {
    var nav = document.getElementById('nav-root');
    if (nav && nav.dataset.mode !== 'admin') { nav.innerHTML = navHTML(); wireChrome(); }
  }
  function wireChrome() {
    var btn = document.getElementById('nav-hamburger'), menu = document.getElementById('nav-mobile-menu');
    if (btn && menu) btn.addEventListener('click', function () {
      var open = menu.classList.toggle('open'); btn.setAttribute('aria-expanded', open); btn.classList.toggle('active', open);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-logout]'), function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); var adm = !!document.querySelector('#nav-root[data-mode=admin]'); logout(adm ? 'admin' : 'user'); flash('success', 'Signed out', 'See you soon.'); location.href = adm ? '/admin/login.html' : '/index.html'; });
    });
    var r = document.getElementById('resetDemo');
    if (r) r.addEventListener('click', function (e) {
      e.preventDefault();
      if (confirm('Reset all demo data (cart, orders, reviews, edits) back to the starting state?')) { reset(); flash('success', 'Demo reset', 'Everything is back to the starting state.'); location.href = '/index.html'; }
    });
  }
  function ready(fn) {
    function go() {
      var nav = document.getElementById('nav-root'), foot = document.getElementById('footer-root');
      if (nav) { nav.dataset.mode = nav.dataset.mode || 'shop'; nav.innerHTML = nav.dataset.mode === 'admin' ? adminNavHTML() : navHTML(); }
      if (foot) foot.innerHTML = footerHTML();
      wireChrome();
      if (fn) fn();
      showFlash();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  load();
  window.SH = {
    BANKS: BANKS, STATES: STATES, EMAIL_DOMAINS: EMAIL_DOMAINS, STEP_MS: STEP_MS,
    esc: esc, money: money, fmtDate: fmtDate, stockBadge: stockBadge, flash: flash, showFlash: showFlash,
    user: user, isAdmin: isAdmin, login: login, loginAs: loginAs, adminLogin: adminLogin, logout: logout, register: register, requireUser: requireUser, requireAdmin: requireAdmin,
    products: products, productBySlug: productBySlug, productById: productById,
    cartItems: cartItems, cartCount: cartCount, cartTotal: cartTotal, addToCart: addToCart, setCartQty: setCartQty,
    favs: favs, toggleFav: toggleFav,
    myOrders: myOrders, orderById: orderById, placeOrder: placeOrder, payOrder: payOrder, cancelOrder: cancelOrder, advanceAll: advanceAll,
    addReviews: addReviews, reviewsFor: reviewsFor, myReview: myReview,
    adminSetStatus: adminSetStatus, adminSaveProduct: adminSaveProduct, adminDeleteProduct: adminDeleteProduct,
    allOrders: function () { advanceAll(); return state.orders.slice().sort(function (a, b) { return b.id - a.id; }); },
    allUsers: function () { return state.users; },
    allProducts: function () { return state.products; },
    save: save, reset: reset, ready: ready, updateNavCounts: updateNavCounts,
    get state() { return state; }
  };
})();
