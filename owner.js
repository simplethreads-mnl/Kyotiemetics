(function () {
  'use strict';
  var K = window.KYO, $ = function (s, r) { return (r || document).querySelector(s); };
  var S = K.load();
  var tab = 'overview', orderFilter = 'pending', month = new Date().toISOString().slice(0, 7);
  var peso = K.peso, esc = K.esc;
  var STATUS = { pending: 'Waiting for payment', paid: 'Paid · to pack', shipped: 'Shipped', cancelled: 'Cancelled' };
  var COLORS = ['#fde2ea', '#fbe9f0', '#e9defb', '#c4ead2', '#cfe8f6', '#ffe7a8', '#f1d9bf', '#fff3e2', '#ffffff', '#8a5a4a'];
  var ACCENTS = ['#f29ab8', '#ef6f86', '#b79ce8', '#7cc79a', '#7cc3e6', '#e8606a', '#c99a72', '#ffd56b'];
  var MOTIFS = ['cat', 'bunny', 'bear', 'frog', 'flower', 'strawberry', 'heart', 'cloud', 'none'];

  function save() { K.save(S); pill(); }
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function counted(o) { return o.status === 'paid' || o.status === 'shipped'; }
  function itemsNet(o) { return o.items.reduce(function (n, i) { return n + i.unit * i.qty; }, 0); }
  function itemsCost(o) { return o.items.reduce(function (n, i) { return n + i.cost * i.qty; }, 0); }
  function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); }
  function fmtTime(iso) { return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function pill() { var n = S.orders.filter(function (o) { return o.status === 'pending'; }).length; $('#pendingPill').textContent = n || ''; $('#pendingPill').hidden = !n; }
  function marginClass(m) { return m < 0 ? 'm-bad' : m < S.settings.targetMargin ? 'm-warn' : 'm-ok'; }
  function maxActivePct(p) {
    var st = S.settings, c = [p.disc || 0];
    if (st.sale.on) c.push(st.sale.pct);
    if (st.bulk.on) c.push(st.bulk.pct);
    st.codes.forEach(function (x) { if (x.on) c.push(x.pct); });
    return Math.max.apply(null, c);
  }

  /* ---------- overview ---------- */
  function overview() {
    var now = new Date(), m = now.toISOString().slice(0, 7);
    var mo = S.orders.filter(function (o) { return counted(o) && o.date.slice(0, 7) === m; });
    var sales = mo.reduce(function (n, o) { return n + itemsNet(o); }, 0);
    var cost = mo.reduce(function (n, o) { return n + itemsCost(o); }, 0);
    var pending = S.orders.filter(function (o) { return o.status === 'pending'; });
    var paid = S.orders.filter(function (o) { return o.status === 'paid'; });
    var low = S.products.filter(function (p) { return p.stock <= S.settings.lowStock; }).sort(function (a, b) { return a.stock - b.stock; });
    var days = [], max = 1;
    for (var i = 13; i >= 0; i--) {
      var d = new Date(now - i * 864e5).toISOString().slice(0, 10);
      var v = S.orders.filter(function (o) { return counted(o) && o.date.slice(0, 10) === d; }).reduce(function (n, o) { return n + itemsNet(o); }, 0);
      days.push({ d: d, v: v }); max = Math.max(max, v);
    }
    var sold = {};
    S.orders.forEach(function (o) { if (counted(o) && now - new Date(o.date) < 30 * 864e5) o.items.forEach(function (i) { sold[i.id] = (sold[i.id] || 0) + i.qty; }); });
    var best = Object.keys(sold).sort(function (a, b) { return sold[b] - sold[a]; }).slice(0, 5).map(function (id) { return { p: K.byId(S, id), n: sold[id] }; }).filter(function (x) { return x.p; });
    return '<h1 class="o-h1">Good day! Here’s the shop at a glance.</h1>' +
      '<div class="kpis">' +
      kpi('Sales this month', peso(sales), mo.length + ' paid orders') +
      kpi('Profit this month', peso(sales - cost), 'after cost of items') +
      kpi('Waiting for payment', pending.length, pending.length ? '<a href="#orders" data-goto="orders" data-of="pending">Check GCash →</a>' : 'all clear', pending.length ? 'hl' : '') +
      kpi('To pack', paid.length, paid.length ? '<a href="#orders" data-goto="orders" data-of="paid">See orders →</a>' : 'nothing to pack') +
      '</div>' +
      '<div class="o-grid2">' +
      '<section class="o-card"><h2>Sales, last 14 days</h2><div class="bars" role="img" aria-label="Daily sales for the last 14 days">' +
      days.map(function (x) { return '<div class="bar" title="' + fmtDate(x.d) + ': ' + peso(x.v) + '"><span style="height:' + Math.max(2, x.v / max * 100) + '%"></span><small>' + new Date(x.d).getDate() + '</small></div>'; }).join('') +
      '</div><p class="muted small">Highest day: ' + peso(max) + '</p></section>' +
      '<section class="o-card"><h2>Low stock</h2>' + (low.length ? '<ul class="mini">' + low.map(function (p) {
        return '<li><span class="mini-art">' + K.thumb(p) + '</span><span>' + esc(p.name) + '</span><b class="' + (p.stock ? 'warn' : 'bad') + '">' + (p.stock ? p.stock + ' left' : 'Sold out') + '</b></li>';
      }).join('') + '</ul>' : '<p class="muted">Everything is well stocked.</p>') + '</section>' +
      '<section class="o-card"><h2>Best sellers, last 30 days</h2><ul class="mini">' + best.map(function (x) {
        return '<li><span class="mini-art">' + K.thumb(x.p) + '</span><span>' + esc(x.p.name) + '</span><b>' + x.n + ' sold</b></li>';
      }).join('') + '</ul></section>' +
      '<section class="o-card"><h2>Discounts running now</h2>' + discountSummary() + '<button class="btn btn-ghost" data-goto="discounts">Manage discounts</button></section>' +
      '</div>';
  }
  function kpi(label, val, sub, cls) { return '<div class="kpi ' + (cls || '') + '"><span>' + label + '</span><b>' + val + '</b><small>' + sub + '</small></div>'; }
  function discountSummary() {
    var st = S.settings, out = [];
    if (st.sale.on) out.push(esc(st.sale.label) + ': ' + st.sale.pct + '% off everything');
    if (st.bulk.on) out.push('Bundle: ' + st.bulk.min + '+ items, ' + st.bulk.pct + '% off');
    st.codes.forEach(function (c) { if (c.on) out.push('Code ' + esc(c.code) + ': ' + c.pct + '% off'); });
    var items = S.products.filter(function (p) { return p.disc; }).length;
    if (items) out.push(items + ' items on their own sale');
    return '<ul class="ticks">' + out.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
  }

  /* ---------- orders ---------- */
  function orders() {
    var f = [['pending', 'Waiting for payment'], ['paid', 'To pack'], ['shipped', 'Shipped'], ['cancelled', 'Cancelled'], ['all', 'All']];
    var list = S.orders.filter(function (o) { return orderFilter === 'all' || o.status === orderFilter; });
    return '<h1 class="o-h1">Orders</h1><p class="muted">Stock goes down the moment a customer places an order. If you cancel, the pieces go back on the shelf on their own.</p>' +
      '<div class="chips o-chips">' + f.map(function (x) {
        var n = x[0] === 'all' ? S.orders.length : S.orders.filter(function (o) { return o.status === x[0]; }).length;
        return '<button class="chip' + (orderFilter === x[0] ? ' on' : '') + '" data-of="' + x[0] + '">' + x[1] + ' <span class="n">' + n + '</span></button>';
      }).join('') + '</div>' +
      (list.length ? '<div class="orders">' + list.map(orderCard).join('') + '</div>' : '<p class="o-empty">No orders here.</p>');
  }
  function orderCard(o) {
    var acts = '';
    if (o.status === 'pending') acts = '<button class="btn btn-pink" data-act="paid" data-id="' + o.id + '">Payment received</button><button class="btn btn-ghost" data-act="cancel" data-id="' + o.id + '">Payment not found</button>';
    if (o.status === 'paid') acts = '<button class="btn btn-pink" data-act="ship" data-id="' + o.id + '">Mark shipped</button><button class="btn btn-ghost" data-act="cancel" data-id="' + o.id + '">Cancel &amp; restock</button>';
    var how = { mm: 'Lalamove · Metro Manila', prov: 'J&T · Province', pickup: 'Pick up · Taguig' }[o.method] || '';
    return '<article class="order st-' + o.status + '"><header><b>' + o.id + '</b><span class="badge">' + STATUS[o.status] + '</span><time>' + fmtTime(o.date) + '</time></header>' +
      '<p class="who"><b>' + esc(o.name) + '</b>' + (o.city ? ' · ' + esc(o.city) : '') + ' · ' + how + (o.address ? '<br><span class="muted small">' + esc(o.address) + '</span>' : '') + (o.notes ? '<br><span class="muted small">Note: ' + esc(o.notes) + '</span>' : '') + '</p>' +
      '<ul class="o-items">' + o.items.map(function (i) { return '<li><span>' + i.qty + '× ' + esc(i.name) + (i.pct ? ' <em>−' + i.pct + '%</em>' : '') + '</span><span>' + peso(i.unit * i.qty) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="o-foot"><span class="muted small">GCash Ref ' + esc(o.ref) + (o.code ? ' · code ' + esc(o.code) : '') + '</span><b>' + peso(o.total) + '</b></div>' +
      (acts ? '<div class="o-acts">' + acts + '</div>' : '') + '</article>';
  }
  function setStatus(id, act) {
    var o = S.orders.filter(function (x) { return x.id === id; })[0]; if (!o) return;
    if (act === 'paid') { o.status = 'paid'; toast(o.id + ' marked as paid'); }
    if (act === 'ship') { o.status = 'shipped'; toast(o.id + ' marked as shipped'); }
    if (act === 'cancel') {
      if (!confirm('Cancel ' + o.id + ' and put the items back in stock?')) return;
      o.items.forEach(function (i) { var p = K.byId(S, i.id); if (p) p.stock += i.qty; });
      o.status = 'cancelled'; toast(o.id + ' cancelled · stock returned');
    }
    save(); render();
  }

  /* ---------- products ---------- */
  function products() {
    var full = S.products.length >= K.MAX;
    return '<div class="o-headrow"><div><h1 class="o-h1">Products</h1><p class="muted">' + S.products.length + ' of ' + K.MAX + ' slots used. Margin turns amber below your ' + S.settings.targetMargin + '% target.</p></div>' +
      '<button class="btn btn-pink" data-act="new"' + (full ? ' disabled' : '') + '>+ Add product</button></div>' +
      (full ? '<p class="note">The catalogue is full (30). Remove or replace a product to add a new one.</p>' : '') +
      '<div class="ptable" role="table" aria-label="Products"><div class="prow phead" role="row"><span role="columnheader">Item</span><span role="columnheader">Price</span><span role="columnheader">Cost</span><span role="columnheader">Margin</span><span role="columnheader">Sale</span><span role="columnheader">Stock</span><span role="columnheader"><span class="sr">Edit</span></span></div>' +
      S.products.map(function (p) {
        var sp = K.shelfPrice(p, S), m = K.margin(sp.price, p.cost);
        return '<div class="prow" role="row"><span class="pcell-item" role="cell"><span class="mini-art">' + K.thumb(p) + '</span><span><b>' + esc(p.name) + '</b><small>' + K.CATS[p.cat] + '</small></span></span>' +
          '<span role="cell" data-l="Price">' + peso(sp.price) + (sp.pct ? ' <s>' + peso(p.price) + '</s>' : '') + '</span>' +
          '<span role="cell" data-l="Cost">' + peso(p.cost) + '</span>' +
          '<span role="cell" data-l="Margin" class="' + marginClass(m) + '">' + m + '%</span>' +
          '<span role="cell" data-l="Sale">' + (p.disc ? p.disc + '%' : '—') + '</span>' +
          '<span role="cell" data-l="Stock" class="stock"><button data-st="' + p.id + '" data-d="-1" aria-label="One less ' + esc(p.name) + '">−</button><b class="' + (p.stock ? '' : 'bad') + '">' + p.stock + '</b><button data-st="' + p.id + '" data-d="1" aria-label="One more ' + esc(p.name) + '">+</button></span>' +
          '<span role="cell"><button class="btn btn-ghost sm" data-act="edit" data-id="' + p.id + '">Edit</button></span></div>';
      }).join('') + '</div>';
  }
  var draft = null;
  function editor(p) {
    draft = JSON.parse(JSON.stringify(p));
    var opts = function (list, cur) { return list.map(function (v) { return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + v + '</option>'; }).join(''); };
    var swatches = function (name, list, cur) {
      return '<div class="swatches" role="radiogroup" aria-label="' + name + '">' + list.map(function (c) {
        return '<label><input type="radio" name="' + name + '" value="' + c + '"' + (c === cur ? ' checked' : '') + '><span style="background:' + c + '"></span><b class="sr">' + c + '</b></label>';
      }).join('') + '</div>';
    };
    $('#peBody').innerHTML = '<h2 id="peTitle">' + (p.isNew ? 'Add a product' : 'Edit product') + '</h2>' +
      '<form id="pform" class="form pe-form" novalidate>' +
      '<div class="pe-art"><div class="pe-preview" id="pePrev"></div>' +
      '<label class="upload">Photo<input type="file" name="photo" accept="image/*"></label>' +
      (draft.photo ? '<button type="button" class="linkish" data-act="nophoto">Remove photo</button>' : '') +
      '<details' + (draft.photo ? '' : ' open') + '><summary>Placeholder drawing</summary>' +
      '<label>Shape<select name="kind">' + opts(['cottage', 'mug', 'spoon', 'set', 'bowl', 'plate'], draft.art.kind) + '</select></label>' +
      '<label>Design<select name="motif">' + opts(MOTIFS, draft.art.motif) + '</select></label>' +
      '<p class="lbl">Glaze</p>' + swatches('body', COLORS, draft.art.body) +
      '<p class="lbl">Accent</p>' + swatches('accent', ACCENTS, draft.art.accent) +
      '</details></div>' +
      '<div class="pe-fields">' +
      '<label>Name<input name="name" required value="' + esc(draft.name) + '"></label>' +
      '<label>Category<select name="cat">' + Object.keys(K.CATS).map(function (k) { return '<option value="' + k + '"' + (k === draft.cat ? ' selected' : '') + '>' + K.CATS[k] + '</option>'; }).join('') + '</select></label>' +
      '<div class="two"><label>Price (₱)<input name="price" type="number" min="1" inputmode="numeric" value="' + draft.price + '"></label>' +
      '<label>Your cost (₱)<input name="cost" type="number" min="0" inputmode="numeric" value="' + draft.cost + '"></label></div>' +
      '<div class="two"><label>Stock<input name="stock" type="number" min="0" inputmode="numeric" value="' + draft.stock + '"></label>' +
      '<label>Item sale (%)<input name="disc" type="number" min="0" max="90" inputmode="numeric" value="' + (draft.disc || 0) + '"></label></div>' +
      '<div class="quick" role="group" aria-label="Quick sale">' + [0, 10, 15, 20].map(function (v) { return '<button type="button" class="chip" data-quick="' + v + '">' + (v ? v + '% off' : 'No sale') + '</button>'; }).join('') + '</div>' +
      '<div class="calc" id="calc"></div>' +
      '<label class="check"><input type="checkbox" name="gift"' + (draft.gift ? ' checked' : '') + '> Comes in a gift box</label>' +
      '<label>Description<textarea name="desc" rows="2">' + esc(draft.desc) + '</textarea></label>' +
      '<p class="form-err" id="peErr" role="alert"></p>' +
      '<div class="row2">' + (p.isNew ? '' : '<button type="button" class="btn btn-ghost danger" data-act="del">Remove</button>') + '<button class="btn btn-pink" type="submit">' + (p.isNew ? 'Add to shop' : 'Save') + '</button></div>' +
      '</div></form>';
    preview(); $('#pedit').showModal();
  }
  function readForm() {
    var f = $('#pform'), d = new FormData(f);
    draft.name = String(d.get('name') || '').trim(); draft.cat = d.get('cat');
    draft.price = Math.max(0, Math.round(+d.get('price') || 0)); draft.cost = Math.max(0, Math.round(+d.get('cost') || 0));
    draft.stock = Math.max(0, Math.round(+d.get('stock') || 0)); draft.disc = Math.min(90, Math.max(0, Math.round(+d.get('disc') || 0)));
    draft.gift = !!d.get('gift'); draft.desc = String(d.get('desc') || '').trim();
    draft.art.kind = d.get('kind') || draft.art.kind; draft.art.motif = d.get('motif') || draft.art.motif;
    draft.art.body = d.get('body') || draft.art.body; draft.art.accent = d.get('accent') || draft.art.accent;
  }
  function preview() {
    readForm();
    $('#pePrev').innerHTML = K.thumb(draft);
    var t = S.settings.targetMargin, worst = maxActivePct(draft);
    var sale = Math.round(draft.price * (1 - draft.disc / 100));
    var low = Math.round(draft.price * (1 - worst / 100));
    var suggest = draft.cost ? Math.ceil(draft.cost / (1 - t / 100) / 10) * 10 - 1 : 0;
    var m1 = K.margin(sale, draft.cost), m2 = K.margin(low, draft.cost);
    $('#calc').innerHTML =
      '<p>At <b>' + peso(sale) + '</b> you keep <b>' + peso(sale - draft.cost) + '</b> per piece <span class="' + marginClass(m1) + '">(' + m1 + '% margin)</span>.</p>' +
      (worst > draft.disc ? '<p>With your biggest active discount (' + worst + '%) it sells for ' + peso(low) + ': <span class="' + marginClass(m2) + '">' + m2 + '% margin</span>.</p>' : '') +
      (draft.cost ? '<p class="muted small">For a ' + t + '% margin, price it at about <b>' + peso(suggest) + '</b>.</p>' : '');
  }
  function compress(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 700 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = function () { cb(null); };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* ---------- discounts ---------- */
  function discounts() {
    var st = S.settings;
    var risky = S.products.map(function (p) { var w = maxActivePct(p); return { p: p, w: w, m: K.margin(Math.round(p.price * (1 - w / 100)), p.cost) }; })
      .filter(function (x) { return x.m < st.targetMargin; }).sort(function (a, b) { return a.m - b.m; });
    var q = function (key, cur) { return '<div class="quick">' + [10, 15, 20].map(function (v) { return '<button type="button" class="chip' + (cur === v ? ' on' : '') + '" data-dq="' + key + '" data-v="' + v + '">' + v + '%</button>'; }).join('') + '</div>'; };
    return '<h1 class="o-h1">Discounts</h1><p class="muted">One discount per item: the customer always gets the biggest one, never two stacked. This protects your margin.</p>' +
      '<div class="o-grid2">' +
      '<section class="o-card"><div class="sw-row"><h2>Store-wide sale</h2>' + toggle('sale', st.sale.on) + '</div>' +
      '<p class="muted small">For paydays, holidays or weekend promos. Shows a banner on the shop.</p>' +
      '<label class="flbl">Banner name<input class="inp" data-set="saleLabel" value="' + esc(st.sale.label) + '"></label>' + q('sale', st.sale.pct) + '</section>' +
      '<section class="o-card"><div class="sw-row"><h2>Bundle deal</h2>' + toggle('bulk', st.bulk.on) + '</div>' +
      '<p class="muted small">For people buying for coworkers or as gifts.</p>' +
      '<label class="flbl">Minimum items<input class="inp" type="number" min="2" data-set="bulkMin" value="' + st.bulk.min + '"></label>' + q('bulk', st.bulk.pct) + '</section>' +
      '<section class="o-card"><h2>Discount codes</h2><ul class="codes">' + st.codes.map(function (c, i) {
        return '<li><code>' + esc(c.code) + '</code><span>' + c.pct + '% off</span>' + toggle('code' + i, c.on) + '<button class="icon-btn sm" data-delcode="' + i + '" aria-label="Delete code ' + esc(c.code) + '">✕</button></li>';
      }).join('') + '</ul>' +
      '<form id="codeAdd" class="inline-form"><label class="sr" for="nc">New code</label><input id="nc" class="inp" placeholder="e.g. THANKYOU" maxlength="16" autocapitalize="characters"><label class="sr" for="np">Percent</label><input id="np" class="inp" type="number" min="1" max="50" value="10"><button class="btn btn-ghost" type="submit">Add code</button></form></section>' +
      '<section class="o-card"><h2>Margin check</h2><label class="flbl">Target margin (%)<input class="inp" type="number" min="0" max="90" data-set="target" value="' + st.targetMargin + '"></label>' +
      (risky.length ? '<p class="small">These items go below your target with the biggest discount running:</p><ul class="mini">' + risky.slice(0, 8).map(function (x) {
        return '<li><span class="mini-art">' + K.thumb(x.p) + '</span><span>' + esc(x.p.name) + ' <small class="muted">at −' + x.w + '%</small></span><b class="' + marginClass(x.m) + '">' + x.m + '%</b></li>';
      }).join('') + '</ul>' : '<p class="ok">All items stay above your target, even with the biggest discount.</p>') + '</section>' +
      '</div>';
  }
  function toggle(key, on) { return '<button class="tgl' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-tgl="' + key + '"><span></span><b class="sr">' + (on ? 'On' : 'Off') + '</b></button>'; }

  /* ---------- accounting ---------- */
  function accounting() {
    var months = {};
    S.orders.forEach(function (o) { months[o.date.slice(0, 7)] = 1; });
    S.expenses.forEach(function (e) { months[e.date.slice(0, 7)] = 1; });
    months[new Date().toISOString().slice(0, 7)] = 1;
    var mlist = Object.keys(months).sort().reverse();
    var mo = S.orders.filter(function (o) { return counted(o) && o.date.slice(0, 7) === month; });
    var gross = mo.reduce(function (n, o) { return n + o.subtotal; }, 0);
    var disc = mo.reduce(function (n, o) { return n + o.discount; }, 0);
    var net = gross - disc;
    var cogs = mo.reduce(function (n, o) { return n + itemsCost(o); }, 0);
    var ship = mo.reduce(function (n, o) { return n + o.shipping; }, 0);
    var ex = S.expenses.filter(function (e) { return e.date.slice(0, 7) === month; });
    var exT = ex.reduce(function (n, e) { return n + e.amount; }, 0);
    var gp = net - cogs, np = gp - exT;
    var label = function (m) { return new Date(m + '-15').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }); };
    return '<div class="o-headrow"><h1 class="o-h1">Accounting</h1><label class="flbl inline">Month<select class="inp" id="month">' + mlist.map(function (m) { return '<option value="' + m + '"' + (m === month ? ' selected' : '') + '>' + label(m) + '</option>'; }).join('') + '</select></label></div>' +
      '<p class="muted">Counts paid and shipped orders only. Orders waiting for payment are not counted yet.</p>' +
      '<div class="o-grid2">' +
      '<section class="o-card"><h2>Profit and loss · ' + label(month) + '</h2><dl class="pl">' +
      '<dt>Sales at full price</dt><dd>' + peso(gross) + '</dd>' +
      '<dt>Discounts given</dt><dd class="neg">−' + peso(disc) + '</dd>' +
      '<dt class="sub">Net sales</dt><dd class="sub">' + peso(net) + '</dd>' +
      '<dt>Cost of items sold</dt><dd class="neg">−' + peso(cogs) + '</dd>' +
      '<dt class="sub">Gross profit</dt><dd class="sub">' + peso(gp) + ' <small>(' + (net ? Math.round(gp / net * 100) : 0) + '%)</small></dd>' +
      '<dt>Expenses</dt><dd class="neg">−' + peso(exT) + '</dd>' +
      '<dt class="tot">Net profit</dt><dd class="tot ' + (np < 0 ? 'bad' : '') + '">' + peso(np) + '</dd></dl>' +
      '<p class="muted small">Delivery fees collected: ' + peso(ship) + ' (passed to the courier, not counted as profit). ' + mo.length + ' orders.</p>' +
      '<div class="row2"><button class="btn btn-ghost" data-csv="sales">Download sales (CSV)</button><button class="btn btn-ghost" data-csv="expenses">Download expenses (CSV)</button></div>' +
      '<p class="muted small">CSV files open in Google Sheets or Excel, ready for your records or a bookkeeper.</p></section>' +
      '<section class="o-card"><h2>Expenses</h2>' +
      '<form id="exAdd" class="ex-form"><label>Date<input class="inp" type="date" name="date" value="' + new Date().toISOString().slice(0, 10) + '" required></label>' +
      '<label>What for<input class="inp" name="item" placeholder="e.g. bubble wrap" required></label>' +
      '<label>Type<select class="inp" name="cat"><option>Packaging</option><option>Delivery</option><option>Supplies</option><option>Other</option></select></label>' +
      '<label>Amount (₱)<input class="inp" type="number" min="1" name="amount" required></label><button class="btn btn-pink" type="submit">Add</button></form>' +
      (ex.length ? '<ul class="exlist">' + ex.sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (e) {
        return '<li><time>' + fmtDate(e.date) + '</time><span>' + esc(e.item) + ' <small class="muted">' + esc(e.cat) + '</small></span><b>' + peso(e.amount) + '</b><button class="icon-btn sm" data-delex="' + e.id + '" aria-label="Delete expense">✕</button></li>';
      }).join('') + '</ul>' : '<p class="muted">No expenses this month.</p>') + '</section></div>';
  }
  function csv(kind) {
    var rows;
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    if (kind === 'sales') {
      rows = [['Order', 'Date', 'Status', 'Customer', 'Item', 'Qty', 'Full price', 'Discount %', 'Sold at', 'Line total', 'Cost each', 'Line profit', 'Delivery fee', 'GCash ref']];
      S.orders.filter(function (o) { return o.date.slice(0, 7) === month; }).forEach(function (o) {
        o.items.forEach(function (i, n) {
          rows.push([o.id, o.date.slice(0, 10), o.status, o.name, i.name, i.qty, i.price, i.pct || 0, i.unit, i.unit * i.qty, i.cost, (i.unit - i.cost) * i.qty, n ? '' : o.shipping, o.ref]);
        });
      });
    } else {
      rows = [['Date', 'Item', 'Type', 'Amount']];
      S.expenses.filter(function (e) { return e.date.slice(0, 7) === month; }).forEach(function (e) { rows.push([e.date, e.item, e.cat, e.amount]); });
    }
    var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\n')], { type: 'text/csv' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kyotiemics-' + kind + '-' + month + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Downloaded ' + a.download);
  }

  /* ---------- render + events ---------- */
  function render() {
    var map = { overview: overview, orders: orders, products: products, discounts: discounts, accounting: accounting };
    $('#panel').innerHTML = map[tab]();
    document.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === tab); });
    pill();
  }
  function go(t) { tab = t; history.replaceState(null, '', '#' + t); render(); window.scrollTo(0, 0); }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-tab],[data-goto],[data-of],[data-act],[data-st],[data-tgl],[data-dq],[data-delcode],[data-delex],[data-csv],[data-quick],[data-close],#resetDemo');
    if (!el) return;
    var d = el.dataset;
    if (d.tab) return go(d.tab);
    if (d.goto) { e.preventDefault(); if (d.of) orderFilter = d.of; return go(d.goto); }
    if (d.of) { orderFilter = d.of; return render(); }
    if (d.st) { var p = K.byId(S, d.st); p.stock = Math.max(0, p.stock + Number(d.d)); save(); return render(); }
    if (d.tgl) {
      var st = S.settings;
      if (d.tgl === 'sale') st.sale.on = !st.sale.on;
      else if (d.tgl === 'bulk') st.bulk.on = !st.bulk.on;
      else { var c = st.codes[+d.tgl.slice(4)]; c.on = !c.on; }
      save(); return render();
    }
    if (d.dq) { S.settings[d.dq].pct = +d.v; save(); return render(); }
    if (d.delcode) { S.settings.codes.splice(+d.delcode, 1); save(); return render(); }
    if (d.delex) { S.expenses = S.expenses.filter(function (x) { return x.id !== d.delex; }); save(); return render(); }
    if (d.csv) return csv(d.csv);
    if (d.quick != null && d.quick !== undefined && el.closest('#pform')) { $('#pform [name=disc]').value = d.quick; return preview(); }
    if (el.hasAttribute('data-close')) return el.closest('dialog').close();
    if (el.id === 'resetDemo') {
      if (confirm('Reset the demo? This puts back the sample products, orders and settings.')) {
        S = K.reset(); K.save(S); try { localStorage.removeItem('kyo-cart-v1'); } catch (x) {} render(); toast('Demo reset');
      }
      return;
    }
    if (d.act === 'paid' || d.act === 'ship' || d.act === 'cancel') return setStatus(d.id, d.act);
    if (d.act === 'edit') return editor(K.byId(S, d.id));
    if (d.act === 'new') {
      if (S.products.length >= K.MAX) return toast('Catalogue is full (30)');
      return editor({ isNew: true, id: '', name: '', cat: 'mug', price: 399, cost: 200, stock: 5, disc: 0, gift: false, desc: '', photo: null, art: { kind: 'mug', body: '#fde2ea', accent: '#f29ab8', motif: 'cat' } });
    }
    if (d.act === 'nophoto') { draft.photo = null; el.remove(); return preview(); }
    if (d.act === 'del') {
      if (!confirm('Remove ' + draft.name + ' from the shop?')) return;
      S.products = S.products.filter(function (x) { return x.id !== draft.id; }); save();
      $('#pedit').close(); render(); toast('Removed'); return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.closest('#pform') && e.target.type !== 'file') preview();
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.closest('#pform')) {
      if (t.type === 'file' && t.files[0]) { compress(t.files[0], function (url) { if (url) { draft.photo = url; preview(); } else toast('Could not read that image'); }); }
      else preview();
      return;
    }
    if (t.id === 'month') { month = t.value; return render(); }
    if (t.dataset.set) {
      var v = t.dataset.set, st = S.settings;
      if (v === 'saleLabel') st.sale.label = t.value.trim() || 'Store sale';
      if (v === 'bulkMin') st.bulk.min = Math.max(2, Math.round(+t.value || 2));
      if (v === 'target') st.targetMargin = Math.min(90, Math.max(0, Math.round(+t.value || 0)));
      save(); render(); toast('Saved');
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; e.preventDefault();
    if (f.id === 'pform') {
      readForm();
      if (!draft.name) { $('#peErr').textContent = 'Please give it a name.'; return; }
      if (!draft.price) { $('#peErr').textContent = 'Please set a price.'; return; }
      if (draft.isNew) {
        if (S.products.length >= K.MAX) { $('#peErr').textContent = 'The catalogue is full (30).'; return; }
        delete draft.isNew; draft.id = 'p' + (S.nextProduct++); S.products.unshift(draft);
        toast('Added to the shop');
      } else {
        S.products = S.products.map(function (x) { return x.id === draft.id ? draft : x; });
        toast('Saved');
      }
      save(); $('#pedit').close(); render();
    }
    if (f.id === 'codeAdd') {
      var code = $('#nc').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), pct = Math.round(+$('#np').value);
      if (!code || !(pct > 0 && pct <= 50)) return toast('Add a code and a % from 1 to 50');
      if (S.settings.codes.some(function (c) { return c.code === code; })) return toast('That code already exists');
      S.settings.codes.push({ code: code, pct: pct, on: true }); save(); render(); toast('Code ' + code + ' added');
    }
    if (f.id === 'exAdd') {
      var d = new FormData(f), amt = Math.round(+d.get('amount'));
      if (!d.get('item') || !(amt > 0)) return toast('Add what it was for and the amount');
      S.expenses.push({ id: 'e' + Date.now(), date: d.get('date'), item: String(d.get('item')).trim(), cat: d.get('cat'), amount: amt });
      month = String(d.get('date')).slice(0, 7); save(); render(); toast('Expense added');
    }
  });
  window.addEventListener('storage', function (e) { if (e.key === K.KEY) { S = K.load(); render(); } });

  function fromHash() {
    var h = location.hash.slice(1);
    if (['overview', 'orders', 'products', 'discounts', 'accounting'].indexOf(h) >= 0) tab = h;
  }
  window.addEventListener('hashchange', function () { fromHash(); render(); });
  fromHash();
  render();
})();
