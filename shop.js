(function () {
  'use strict';
  var K = window.KYO, $ = function (s, r) { return (r || document).querySelector(s); };
  var S = K.load();
  var CART_KEY = 'kyo-cart-v1';
  var cart = readCart(), codeText = '', filter = 'all', query = '', sort = 'feat';

  function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function inCart(id) { var l = cart.filter(function (x) { return x.id === id; })[0]; return l ? l.qty : 0; }

  /* ---------- hero shelf + about cats ---------- */
  function sleepingCat() {
    return '<svg class="shelf-cat" viewBox="0 0 160 90"><path d="M20 80 Q16 40 60 38 Q110 34 132 60 Q146 80 120 82Z" fill="#fff" stroke="#e9d8cf" stroke-width="3"/>' +
      '<path d="M118 82 Q150 84 146 64" stroke="#e9d8cf" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M118 82 Q150 84 146 64" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M30 46 L34 22 L48 38Z M60 38 L70 18 L76 38Z" fill="#fff" stroke="#e9d8cf" stroke-width="3" stroke-linejoin="round"/><path d="M36 40 L38 30 L44 38Z M64 36 L69 26 L72 36Z" fill="#f6b3c8"/>' +
      '<circle cx="34" cy="56" r="10" fill="#f6c99a" opacity=".8"/><path d="M40 56 q5 4 10 0 M60 54 q5 4 10 0" stroke="#4a3b4f" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="38" cy="64" rx="5" ry="3" fill="#f27fa5" opacity=".45"/><ellipse cx="76" cy="62" rx="5" ry="3" fill="#f27fa5" opacity=".45"/>' +
      '<text x="96" y="30" font-family="Fredoka, sans-serif" font-size="16" fill="#b79ce8">z</text><text x="108" y="18" font-family="Fredoka, sans-serif" font-size="12" fill="#b79ce8">z</text></svg>';
  }
  function heroShelf() {
    var pick = ['p1', 'p7', 'p15'].map(function (id) { return K.byId(S, id); }).filter(Boolean);
    $('#heroShelf').innerHTML =
      '<div class="shelf-row">' + pick.map(function (p, i) { return '<div class="shelf-item s' + i + '">' + K.art(p.art) + '</div>'; }).join('') + '</div>' +
      '<div class="shelf-board"></div>' + sleepingCat() +
      '<span class="hero-tag">from ' + K.peso(Math.min.apply(null, S.products.map(function (p) { return p.price; }))) + '</span>';
    $('#aboutCats').innerHTML = sleepingCat();
  }

  /* ---------- catalogue ---------- */
  function chips() {
    var list = [['all', 'All']].concat(Object.keys(K.CATS).map(function (k) { return [k, K.CATS[k]]; })).concat([['gift', 'Gift picks'], ['sale', 'On sale']]);
    $('#chips').innerHTML = list.map(function (c) {
      return '<button class="chip' + (filter === c[0] ? ' on' : '') + '" data-f="' + c[0] + '" aria-pressed="' + (filter === c[0]) + '">' + c[1] + '</button>';
    }).join('');
  }
  function visible() {
    var q = query.trim().toLowerCase();
    var list = S.products.filter(function (p) {
      if (filter === 'gift' && !p.gift) return false;
      if (filter === 'sale' && !K.shelfPrice(p, S).pct) return false;
      if (K.CATS[filter] && p.cat !== filter) return false;
      if (q && (p.name + ' ' + p.desc + ' ' + K.CATS[p.cat] + ' ' + p.art.motif).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (sort !== 'feat') {
      list = list.slice().sort(function (a, b) {
        var pa = K.shelfPrice(a, S), pb = K.shelfPrice(b, S);
        if (sort === 'low') return pa.price - pb.price;
        if (sort === 'high') return pb.price - pa.price;
        return pb.pct - pa.pct;
      });
    }
    return list;
  }
  function card(p) {
    var sp = K.shelfPrice(p, S), out = p.stock <= 0;
    var left = !out && p.stock <= S.settings.lowStock ? '<span class="left">Only ' + p.stock + ' left</span>' : '';
    return '<article class="card' + (out ? ' out' : '') + '" style="--tile:' + K.shade(p.art.accent || p.art.body, 0.72) + '">' +
      '<button class="card-art" data-view="' + p.id + '" aria-label="View ' + K.esc(p.name) + '">' + K.thumb(p) +
      (sp.pct ? '<span class="sticker">−' + sp.pct + '%</span>' : '') + (out ? '<span class="soldout">Sold out</span>' : '') + '</button>' +
      '<div class="card-body"><p class="card-cat">' + K.CATS[p.cat] + (p.gift ? ' · gift box' : '') + '</p>' +
      '<h3>' + K.esc(p.name) + '</h3>' +
      '<p class="price"><b>' + K.peso(sp.price) + '</b>' + (sp.pct ? ' <s>' + K.peso(p.price) + '</s>' : '') + '</p>' + left +
      '<button class="btn btn-add" data-add="' + p.id + '"' + (out ? ' disabled' : '') + '>' + (out ? 'Sold out' : 'Add to cart') + '</button></div></article>';
  }
  function renderGrid() {
    var list = visible();
    $('#grid').innerHTML = list.map(card).join('');
    $('#empty').hidden = list.length > 0;
    var inStock = S.products.filter(function (p) { return p.stock > 0; }).length;
    $('#countNote').textContent = S.products.length + ' pieces · ' + inStock + ' in stock';
  }
  function ribbon() {
    var s = S.settings.sale, r = $('#saleRibbon');
    var codes = S.settings.codes.filter(function (c) { return c.on; });
    var msg = '';
    if (s.on) msg = '<b>' + K.esc(s.label || 'Store sale') + ':</b> ' + s.pct + '% off everything';
    else if (S.settings.bulk.on) msg = '<b>Bundle deal:</b> buy ' + S.settings.bulk.min + ' or more, get ' + S.settings.bulk.pct + '% off';
    if (codes.length) msg += ' · try code <b>' + K.esc(codes[0].code) + '</b>';
    r.innerHTML = msg; r.hidden = !msg;
  }

  /* ---------- product view ---------- */
  function view(id) {
    var p = K.byId(S, id); if (!p) return;
    var sp = K.shelfPrice(p, S), out = p.stock <= 0;
    $('#pviewBody').innerHTML =
      '<div class="pview-art" style="--tile:' + K.shade(p.art.accent || p.art.body, 0.72) + '">' + K.thumb(p) + (sp.pct ? '<span class="sticker big">−' + sp.pct + '%</span>' : '') + '</div>' +
      '<div class="pview-info"><p class="card-cat">' + K.CATS[p.cat] + '</p><h2 id="pvName">' + K.esc(p.name) + '</h2>' +
      '<p class="price big"><b>' + K.peso(sp.price) + '</b>' + (sp.pct ? ' <s>' + K.peso(p.price) + '</s> <span class="why">' + K.esc(sp.why) + '</span>' : '') + '</p>' +
      '<p>' + K.esc(p.desc) + '</p>' +
      '<ul class="facts"><li>' + (out ? 'Sold out for now' : p.stock + ' in stock') + '</li>' + (p.gift ? '<li>Comes in a gift box</li>' : '') + '<li>Ceramic · hand wash recommended</li></ul>' +
      '<button class="btn btn-pink wide" data-add="' + p.id + '"' + (out ? ' disabled' : '') + '>' + (out ? 'Sold out' : 'Add to cart · ' + K.peso(sp.price)) + '</button></div>';
    $('#pview').showModal();
  }

  /* ---------- cart ---------- */
  function add(id) {
    var p = K.byId(S, id); if (!p || p.stock <= 0) return;
    var have = inCart(id);
    if (have >= p.stock) { toast('That’s all we have of ' + p.name); return; }
    if (have) cart.forEach(function (l) { if (l.id === id) l.qty++; }); else cart.push({ id: id, qty: 1 });
    saveCart(); renderCart(); bump();
    toast('Added ' + p.name);
  }
  function setQty(id, q) {
    var p = K.byId(S, id);
    cart = cart.map(function (l) { return l.id === id ? { id: id, qty: Math.max(0, Math.min(q, p ? p.stock : 0)) } : l; })
               .filter(function (l) { return l.qty > 0; });
    saveCart(); renderCart();
  }
  function bump() { var b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  function cleanCart() {
    cart = cart.filter(function (l) { var p = K.byId(S, l.id); return p && p.stock > 0; })
               .map(function (l) { var p = K.byId(S, l.id); return { id: l.id, qty: Math.min(l.qty, p.stock) }; });
    saveCart();
  }
  function renderCart() {
    var t = K.totals(S, cart, codeText, 'mm');
    $('#cartCount').textContent = t.qty;
    $('#cartCount').classList.toggle('zero', !t.qty);
    if (!t.lines.length) {
      $('#cartBody').innerHTML = '<div class="cart-empty">' + K.art({ kind: 'mug', body: '#fde2ea', accent: '#f29ab8', motif: 'cat' }) + '<p>Your cart is empty.</p><button class="btn btn-ghost" data-close-cart>Browse the shelf</button></div>';
      $('#cartFoot').innerHTML = '';
      return;
    }
    var nextBulk = S.settings.bulk.on && !t.bulk ? S.settings.bulk.min - t.qty : 0;
    $('#cartBody').innerHTML = (nextBulk > 0 ? '<p class="nudge">Add ' + nextBulk + ' more for ' + S.settings.bulk.pct + '% off with the bundle deal.</p>' : '') +
      t.lines.map(function (l) {
        return '<div class="line"><div class="line-art">' + K.thumb(l.p) + '</div><div class="line-info"><b>' + K.esc(l.p.name) + '</b>' +
          '<span class="line-price">' + K.peso(l.unit) + (l.pct ? ' <s>' + K.peso(l.p.price) + '</s> <em>' + K.esc(l.why) + '</em>' : '') + '</span>' +
          '<div class="qty"><button data-q="' + l.p.id + '" data-d="-1" aria-label="One less">−</button><span aria-live="polite">' + l.qty + '</span><button data-q="' + l.p.id + '" data-d="1" aria-label="One more"' + (l.qty >= l.p.stock ? ' disabled' : '') + '>+</button></div></div>' +
          '<b class="line-total">' + K.peso(l.unit * l.qty) + '</b></div>';
      }).join('');
    var codeMsg = codeText ? (t.code ? '<span class="ok">Code applied: ' + t.code.pct + '% off</span>' : '<span class="bad">That code isn’t active.</span>') : '';
    $('#cartFoot').innerHTML =
      '<form class="code" id="codeForm"><label class="sr" for="codeIn">Discount code</label><input id="codeIn" placeholder="Discount code" value="' + K.esc(codeText) + '" autocapitalize="characters"><button class="btn btn-ghost" type="submit">Apply</button></form>' +
      '<p class="code-msg">' + codeMsg + '</p>' +
      '<dl class="sum"><dt>Items</dt><dd>' + K.peso(t.subtotal) + '</dd>' +
      (t.discount ? '<dt>Discounts</dt><dd class="minus">−' + K.peso(t.discount) + '</dd>' : '') +
      '<dt class="tot">Total before delivery</dt><dd class="tot">' + K.peso(t.net) + '</dd></dl>' +
      '<p class="fine">One discount per item: you always get the biggest one.</p>' +
      '<button class="btn btn-pink wide" id="toCheckout">Checkout with GCash</button>';
  }
  var lastFocus = null;
  function openCart() {
    S = K.load(); cleanCart(); renderCart();
    lastFocus = document.activeElement;
    var d = $('#drawer'); d.removeAttribute('inert'); d.setAttribute('aria-hidden', 'false');
    d.classList.add('open'); $('#scrim').hidden = false; document.body.classList.add('lock');
    setTimeout(function () { $('#closeCart').focus(); }, 50);
  }
  function closeCart() {
    var d = $('#drawer'); d.classList.remove('open'); d.setAttribute('inert', ''); d.setAttribute('aria-hidden', 'true');
    $('#scrim').hidden = true; document.body.classList.remove('lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- checkout ---------- */
  var co = { name: '', phone: '', method: 'mm', address: '', notes: '' };
  function fakeQR(seed) {
    var r = K.rng(seed), n = 25, cell = 8, sq = '';
    function finder(x, y) { return '<rect x="' + x * cell + '" y="' + y * cell + '" width="' + 7 * cell + '" height="' + 7 * cell + '" fill="#1d1b2a"/><rect x="' + (x + 1) * cell + '" y="' + (y + 1) * cell + '" width="' + 5 * cell + '" height="' + 5 * cell + '" fill="#fff"/><rect x="' + (x + 2) * cell + '" y="' + (y + 2) * cell + '" width="' + 3 * cell + '" height="' + 3 * cell + '" fill="#1d1b2a"/>'; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inF && r() < 0.46) sq += '<rect x="' + x * cell + '" y="' + y * cell + '" width="' + cell + '" height="' + cell + '" fill="#1d1b2a"/>';
    }
    return '<svg viewBox="0 0 200 200" class="qr" role="img" aria-label="Sample QR code, not a real account"><rect width="200" height="200" fill="#fff"/>' + sq + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '</svg>';
  }
  function summary(t) {
    return '<div class="co-sum">' + t.lines.map(function (l) { return '<div class="co-line"><span>' + l.qty + '× ' + K.esc(l.p.name) + '</span><span>' + K.peso(l.unit * l.qty) + '</span></div>'; }).join('') +
      '<dl class="sum"><dt>Items</dt><dd>' + K.peso(t.subtotal) + '</dd>' + (t.discount ? '<dt>Discounts</dt><dd class="minus">−' + K.peso(t.discount) + '</dd>' : '') +
      '<dt>Delivery</dt><dd>' + (t.shipping ? K.peso(t.shipping) : 'Free') + '</dd><dt class="tot">Total</dt><dd class="tot">' + K.peso(t.total) + '</dd></dl></div>';
  }
  function step1() {
    var t = K.totals(S, cart, codeText, co.method), sh = S.settings.shipping;
    var opt = function (v, label, sub, price) {
      return '<label class="opt"><input type="radio" name="method" value="' + v + '"' + (co.method === v ? ' checked' : '') + '><span><b>' + label + '</b><small>' + sub + '</small></span><em>' + (price ? K.peso(price) : 'Free') + '</em></label>';
    };
    $('#coBody').innerHTML = '<p class="step-no">Step 1 of 2</p><h2 id="coTitle">Delivery details</h2>' +
      '<form id="f1" class="form" novalidate>' +
      '<label>Full name<input name="name" required autocomplete="name" value="' + K.esc(co.name) + '"></label>' +
      '<label>Mobile number<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="09XX XXX XXXX" value="' + K.esc(co.phone) + '"></label>' +
      '<fieldset><legend>Delivery</legend>' + opt('mm', 'Metro Manila', 'Lalamove, 1–2 days', sh.mm) + opt('prov', 'Province', 'J&T Express, 3–7 days', sh.prov) + opt('pickup', 'Pick up in Taguig', 'We’ll message a meet-up spot', sh.pickup) + '</fieldset>' +
      '<label class="addr"' + (co.method === 'pickup' ? ' hidden' : '') + '>Address<textarea name="address" rows="2" autocomplete="street-address">' + K.esc(co.address) + '</textarea></label>' +
      '<label>Notes (optional)<input name="notes" placeholder="Gift message, landmark…" value="' + K.esc(co.notes) + '"></label>' +
      '<p class="form-err" id="err1" role="alert"></p>' +
      summary(t) +
      '<button class="btn btn-pink wide" type="submit">Continue to GCash · ' + K.peso(t.total) + '</button></form>';
  }
  function step2() {
    var t = K.totals(S, cart, codeText, co.method);
    $('#coBody').innerHTML = '<p class="step-no">Step 2 of 2</p><h2 id="coTitle">Pay with GCash</h2>' +
      '<div class="gcash"><div class="gcash-head"><span class="gc-logo">G</span><span>Send exactly</span><b>' + K.peso(t.total) + '</b></div>' +
      '<div class="qr-wrap">' + fakeQR(t.total + cart.length) + '<span class="qr-stamp">SAMPLE</span></div>' +
      '<p class="small center">Kyotiemics (demo account)</p>' +
      '<ol class="pay-steps"><li>Open GCash, tap <b>QR</b>, and scan this code (or save it and use <b>Upload QR</b>).</li><li>Send <b>' + K.peso(t.total) + '</b>.</li><li>Copy the 13-digit <b>Ref No.</b> from your receipt and paste it below.</li></ol></div>' +
      '<form id="f2" class="form" novalidate><label>GCash reference number<input name="ref" inputmode="numeric" maxlength="16" placeholder="e.g. 1009 876 543210" required></label>' +
      '<button type="button" class="linkish" id="fillRef">Demo: fill a sample reference</button>' +
      '<p class="form-err" id="err2" role="alert"></p>' +
      '<div class="row2"><button type="button" class="btn btn-ghost" id="back1">Back</button><button class="btn btn-pink" type="submit">Place order</button></div></form>' +
      '<p class="fine">In the real shop this can be a GCash payment link that confirms on its own. This demo uses the QR + reference method most small shops start with.</p>';
  }
  function placeOrder(ref) {
    S = K.load();
    var t = K.totals(S, cart, codeText, co.method);
    for (var i = 0; i < t.lines.length; i++) {
      if (t.lines[i].qty > t.lines[i].p.stock) return 'Sorry, ' + t.lines[i].p.name + ' just sold out or has fewer left. Please check your cart.';
    }
    if (!t.lines.length) return 'Your cart is empty.';
    t.lines.forEach(function (l) { l.p.stock -= l.qty; });
    var order = {
      id: 'KYO-' + (S.nextOrder++), date: new Date().toISOString(), name: co.name, phone: co.phone, address: co.address, notes: co.notes,
      city: co.method === 'pickup' ? 'Taguig (pick up)' : '', method: co.method,
      items: t.lines.map(function (l) { return { id: l.p.id, name: l.p.name, qty: l.qty, price: l.p.price, unit: l.unit, cost: l.p.cost, pct: l.pct }; }),
      subtotal: t.subtotal, discount: t.discount, shipping: t.shipping, total: t.total, ref: ref, status: 'pending', code: t.code ? t.code.code : ''
    };
    S.orders.unshift(order); K.save(S);
    cart = []; codeText = ''; saveCart();
    step3(order);
    renderGrid(); renderCart();
    return '';
  }
  function step3(o) {
    $('#coBody').innerHTML = '<div class="done">' + K.art({ kind: 'cottage', body: '#fbe9f0', accent: '#f29ab8', door: '#8a5cc8' }) +
      '<h2 id="coTitle">Thank you, ' + K.esc(o.name.split(' ')[0]) + '!</h2><p>Order <b>' + o.id + '</b> is in. We’ll check your GCash payment (Ref ' + K.esc(o.ref) + ') and message you once it’s packed.</p>' +
      '<p class="fine">Demo: the stock on the shelf already went down. Open the owner view to see this order waiting for payment confirmation.</p>' +
      '<div class="row2"><a class="btn btn-ghost" href="owner#orders">See it in owner view</a><button class="btn btn-pink" data-close>Keep shopping</button></div></div>';
  }
  function openCheckout() {
    closeCart(); S = K.load(); cleanCart();
    if (!cart.length) { toast('Your cart is empty'); return; }
    step1(); $('#checkout').showModal();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-add],[data-view],[data-q],[data-f],[data-filter],[data-close],[data-close-cart],#toCheckout,#back1,#fillRef');
    if (!el) return;
    if (el.dataset.add) { add(el.dataset.add); }
    else if (el.dataset.view) { view(el.dataset.view); }
    else if (el.dataset.q) { setQty(el.dataset.q, inCart(el.dataset.q) + Number(el.dataset.d)); }
    else if (el.dataset.f) { filter = el.dataset.f; chips(); renderGrid(); }
    else if (el.dataset.filter) { filter = el.dataset.filter; chips(); renderGrid(); }
    else if (el.hasAttribute('data-close')) { el.closest('dialog').close(); }
    else if (el.hasAttribute('data-close-cart')) { closeCart(); location.hash = 'shop'; }
    else if (el.id === 'toCheckout') { openCheckout(); }
    else if (el.id === 'back1') { step1(); }
    else if (el.id === 'fillRef') { $('#f2 [name=ref]').value = '1009' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'); }
  });
  $('#cartBtn').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', closeCart);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#drawer').classList.contains('open')) closeCart(); });
  $('#q').addEventListener('input', function (e) { query = e.target.value; renderGrid(); });
  $('#sort').addEventListener('change', function (e) { sort = e.target.value; renderGrid(); });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'codeForm') { e.preventDefault(); codeText = $('#codeIn').value.trim().toUpperCase(); renderCart(); }
    if (f.id === 'f1') {
      e.preventDefault();
      var d = new FormData(f);
      co.name = String(d.get('name') || '').trim(); co.phone = String(d.get('phone') || '').trim();
      co.method = d.get('method') || 'mm'; co.address = String(d.get('address') || '').trim(); co.notes = String(d.get('notes') || '').trim();
      var err = !co.name ? 'Please add your name.' : !/^(09|\+639|639)\d{9}$/.test(co.phone.replace(/[-\s()]/g, '')) ? 'Please use a PH mobile number like 0917 123 4567.' : (co.method !== 'pickup' && !co.address) ? 'Please add your delivery address.' : '';
      if (err) { $('#err1').textContent = err; return; }
      step2();
    }
    if (f.id === 'f2') {
      e.preventDefault();
      var ref = String(new FormData(f).get('ref') || '').replace(/\s/g, '');
      if (!/^\d{13}$/.test(ref)) { $('#err2').textContent = 'The GCash Ref No. has 13 digits. Please check your receipt.'; return; }
      var msg = placeOrder(ref);
      if (msg) $('#err2').textContent = msg;
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.name === 'method') {
      co.method = e.target.value;
      var f = $('#f1'); var d = new FormData(f);
      co.name = d.get('name'); co.phone = d.get('phone'); co.address = d.get('address') || ''; co.notes = d.get('notes');
      step1();
    }
  });
  window.addEventListener('storage', function (e) {
    if (e.key === K.KEY) { S = K.load(); cleanCart(); renderGrid(); renderCart(); ribbon(); }
  });

  heroShelf(); chips(); renderGrid(); ribbon(); cleanCart(); renderCart();
})();
