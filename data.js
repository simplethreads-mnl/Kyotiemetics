/* Kyotiemics concept demo: shared data, pricing rules and illustrations.
   Everything lives in localStorage so the shop and the owner view share it. */
(function () {
  'use strict';
  var KEY = 'kyo-demo-v1';
  var MAX_PRODUCTS = 30;
  var INK = '#4a3b4f';

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function peso(n) { return '₱' + Math.round(n).toLocaleString('en-PH'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shade(hex, amt) {
    var n = parseInt(hex.replace('#', ''), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = amt < 0 ? function (x) { return Math.round(x * (1 + amt)); }
                    : function (x) { return Math.round(x + (255 - x) * amt); };
    return '#' + [f(r), f(g), f(b)].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }

  var CATS = { cottage: 'Cottage mugs', mug: 'Mugs', spoon: 'Spoons', set: 'Cup & saucer', bowl: 'Bowls & plates' };

  /* ---------- illustrations (placeholders for her real photos) ---------- */
  var uid = 0;
  function face(cx, cy, s, noEyes) {
    var out = '';
    if (!noEyes) {
      out += '<circle cx="' + (cx - 14 * s) + '" cy="' + cy + '" r="' + 3.8 * s + '" fill="' + INK + '"/>' +
             '<circle cx="' + (cx + 14 * s) + '" cy="' + cy + '" r="' + 3.8 * s + '" fill="' + INK + '"/>' +
             '<circle cx="' + (cx - 12.8 * s) + '" cy="' + (cy - 1.4 * s) + '" r="' + 1.3 * s + '" fill="#fff"/>' +
             '<circle cx="' + (cx + 15.2 * s) + '" cy="' + (cy - 1.4 * s) + '" r="' + 1.3 * s + '" fill="#fff"/>';
    }
    out += '<ellipse cx="' + (cx - 23 * s) + '" cy="' + (cy + 8 * s) + '" rx="' + 6 * s + '" ry="' + 3.4 * s + '" fill="#f27fa5" opacity=".5"/>' +
           '<ellipse cx="' + (cx + 23 * s) + '" cy="' + (cy + 8 * s) + '" rx="' + 6 * s + '" ry="' + 3.4 * s + '" fill="#f27fa5" opacity=".5"/>' +
           '<path d="M' + (cx - 5 * s) + ' ' + (cy + 5 * s) + ' q' + 2.5 * s + ' ' + 3.4 * s + ' ' + 5 * s + ' 0 q' + 2.5 * s + ' ' + 3.4 * s + ' ' + 5 * s + ' 0" stroke="' + INK + '" stroke-width="' + 1.9 * s + '" fill="none" stroke-linecap="round"/>';
    return out;
  }
  function ears(m, cx, top, w, col) {
    var inner = '#f6b3c8', d = shade(col, -0.08);
    if (m === 'cat') {
      return [-1, 1].map(function (k) {
        var x = cx + k * w * 0.3;
        return '<path d="M' + (x - 15 * k) + ' ' + (top + 8) + ' L' + (x - 2 * k) + ' ' + (top - 20) + ' L' + (x + 13 * k) + ' ' + (top + 6) + 'Z" fill="' + col + '" stroke="' + d + '" stroke-width="5" stroke-linejoin="round"/>' +
               '<path d="M' + (x - 8 * k) + ' ' + (top + 4) + ' L' + (x - 2 * k) + ' ' + (top - 10) + ' L' + (x + 6 * k) + ' ' + (top + 3) + 'Z" fill="' + inner + '" stroke-linejoin="round"/>';
      }).join('');
    }
    if (m === 'bunny') {
      return [-1, 1].map(function (k) {
        var x = cx + k * w * 0.18;
        return '<ellipse cx="' + x + '" cy="' + (top - 18) + '" rx="9.5" ry="25" fill="' + col + '" stroke="' + d + '" stroke-width="3" transform="rotate(' + (k * 10) + ' ' + x + ' ' + top + ')"/>' +
               '<ellipse cx="' + x + '" cy="' + (top - 16) + '" rx="4.5" ry="16" fill="' + inner + '" transform="rotate(' + (k * 10) + ' ' + x + ' ' + top + ')"/>';
      }).join('');
    }
    if (m === 'bear') {
      return [-1, 1].map(function (k) {
        var x = cx + k * w * 0.34;
        return '<circle cx="' + x + '" cy="' + (top + 2) + '" r="13" fill="' + col + '" stroke="' + d + '" stroke-width="3"/>' +
               '<circle cx="' + x + '" cy="' + (top + 2) + '" r="6.5" fill="' + inner + '"/>';
      }).join('');
    }
    if (m === 'frog') {
      return [-1, 1].map(function (k) {
        var x = cx + k * w * 0.24;
        return '<circle cx="' + x + '" cy="' + (top - 2) + '" r="14" fill="' + col + '" stroke="' + d + '" stroke-width="3"/>' +
               '<circle cx="' + x + '" cy="' + (top - 3) + '" r="8" fill="#fff"/><circle cx="' + x + '" cy="' + (top - 2) + '" r="4.4" fill="' + INK + '"/>';
      }).join('');
    }
    return '';
  }
  function decor(m, cx, cy, s, accent) {
    if (m === 'flower') {
      var p = '';
      for (var i = 0; i < 5; i++) {
        var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        p += '<circle cx="' + (cx + Math.cos(a) * 9 * s) + '" cy="' + (cy + Math.sin(a) * 9 * s) + '" r="' + 7 * s + '" fill="' + accent + '"/>';
      }
      return p + '<circle cx="' + cx + '" cy="' + cy + '" r="' + 5 * s + '" fill="#ffd36b"/>';
    }
    if (m === 'strawberry') {
      return '<path d="M' + cx + ' ' + (cy + 18 * s) + ' C' + (cx - 22 * s) + ' ' + (cy + 4 * s) + ' ' + (cx - 16 * s) + ' ' + (cy - 12 * s) + ' ' + cx + ' ' + (cy - 10 * s) + ' C' + (cx + 16 * s) + ' ' + (cy - 12 * s) + ' ' + (cx + 22 * s) + ' ' + (cy + 4 * s) + ' ' + cx + ' ' + (cy + 18 * s) + 'Z" fill="#ef6f86"/>' +
        '<path d="M' + (cx - 10 * s) + ' ' + (cy - 11 * s) + ' l' + 5 * s + ' ' + 5 * s + ' l' + 5 * s + ' -' + 7 * s + ' l' + 5 * s + ' ' + 7 * s + ' l' + 5 * s + ' -' + 5 * s + '" fill="#7cc79a" stroke="#7cc79a" stroke-width="' + 3 * s + '" stroke-linejoin="round"/>' +
        [[-6, 0], [6, 0], [0, 8], [-4, -4], [5, -5], [0, 1]].map(function (d) {
          return '<ellipse cx="' + (cx + d[0] * s) + '" cy="' + (cy + 2 * s + d[1] * s) + '" rx="' + 1 * s + '" ry="' + 1.6 * s + '" fill="#ffe8a3"/>';
        }).join('');
    }
    if (m === 'heart') {
      return '<path d="M' + cx + ' ' + (cy + 14 * s) + ' C' + (cx - 26 * s) + ' ' + (cy - 2 * s) + ' ' + (cx - 12 * s) + ' ' + (cy - 20 * s) + ' ' + cx + ' ' + (cy - 7 * s) + ' C' + (cx + 12 * s) + ' ' + (cy - 20 * s) + ' ' + (cx + 26 * s) + ' ' + (cy - 2 * s) + ' ' + cx + ' ' + (cy + 14 * s) + 'Z" fill="' + accent + '"/>';
    }
    if (m === 'cloud') {
      return '<g fill="#fff" stroke="' + shade(accent, -0.1) + '" stroke-width="' + 2 * s + '"><path d="M' + (cx - 22 * s) + ' ' + (cy + 8 * s) + ' a' + 9 * s + ' ' + 9 * s + ' 0 0 1 ' + 4 * s + ' -' + 17 * s + ' a' + 12 * s + ' ' + 12 * s + ' 0 0 1 ' + 22 * s + ' -' + 4 * s + ' a' + 10 * s + ' ' + 10 * s + ' 0 0 1 ' + 16 * s + ' ' + 21 * s + 'Z"/></g>' + face(cx, cy + 1 * s, 0.45 * s);
    }
    return '';
  }
  var FACE = { cat: 1, bunny: 1, bear: 1, frog: 1, face: 1 };

  function art(a) {
    var id = 'k' + (++uid);
    var body = a.body, acc = a.accent, m = a.motif, dk = shade(body, -0.16);
    var grad = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + shade(body, 0.35) + '"/><stop offset=".6" stop-color="' + body + '"/><stop offset="1" stop-color="' + shade(body, -0.1) + '"/></linearGradient></defs>';
    var fill = 'url(#' + id + ')', g = '', shadow;
    var hl = function (x, y, h) { return '<rect x="' + x + '" y="' + y + '" width="8" height="' + h + '" rx="4" fill="#fff" opacity=".6"/>'; };
    var facey = function (cx, cy, s) {
      if (FACE[m]) return face(cx, cy, s, m === 'frog');
      return decor(m, cx, cy, s, acc);
    };
    if (a.kind === 'cottage') {
      shadow = '<ellipse cx="100" cy="170" rx="62" ry="8" fill="' + INK + '" opacity=".12"/>';
      g += '<path d="M146 104 c40 -6 40 54 0 50" stroke="' + dk + '" stroke-width="13" fill="none" stroke-linecap="round"/>';
      g += '<rect x="44" y="80" width="108" height="86" rx="34" fill="' + fill + '"/>';
      g += '<path d="M62 160 C58 130 76 112 70 96" stroke="#8fcf9f" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M136 160 C142 136 126 120 134 100" stroke="#8fcf9f" stroke-width="5" fill="none" stroke-linecap="round"/>';
      g += '<path d="M80 166 V132 a18 18 0 0 1 36 0 V166 Z" fill="' + (a.door || '#8a5cc8') + '"/><path d="M98 166 V116" stroke="' + shade(a.door || '#8a5cc8', -0.2) + '" stroke-width="2"/>';
      g += '<circle cx="93" cy="146" r="2.6" fill="#f0a04b"/><circle cx="103" cy="146" r="2.6" fill="#f0a04b"/>';
      g += '<circle cx="134" cy="124" r="9" fill="#fff" opacity=".75" stroke="' + dk + '" stroke-width="3"/>';
      g += '<path d="M36 92 Q98 10 160 92 Q98 104 36 92Z" fill="' + acc + '"/><path d="M36 92 Q98 104 160 92" stroke="' + shade(acc, -0.15) + '" stroke-width="4" fill="none"/>';
      g += '<circle cx="98" cy="40" r="7" fill="' + shade(acc, -0.12) + '"/>';
      if (a.dots) g += '<circle cx="74" cy="72" r="5" fill="#fff"/><circle cx="112" cy="58" r="6" fill="#fff"/><circle cx="132" cy="80" r="4" fill="#fff"/>';
      g += '<path d="M66 82 Q80 60 98 52" stroke="#fff" stroke-width="5" opacity=".45" fill="none" stroke-linecap="round"/>';
      g += hl(56, 108, 34);
    } else if (a.kind === 'mug') {
      shadow = '<ellipse cx="96" cy="168" rx="56" ry="8" fill="' + INK + '" opacity=".12"/>';
      g += ears(m, 96, 74, 96, body);
      g += '<path d="M140 96 c38 -4 38 52 0 52" stroke="' + dk + '" stroke-width="13" fill="none" stroke-linecap="round"/>';
      g += '<rect x="48" y="70" width="96" height="94" rx="26" fill="' + fill + '"/>';
      g += '<ellipse cx="96" cy="76" rx="44" ry="8" fill="' + dk + '"/><ellipse cx="96" cy="75" rx="38" ry="5" fill="' + shade(body, -0.32) + '" opacity=".55"/>';
      g += facey(96, 120, 1);
      g += hl(58, 92, 40);
    } else if (a.kind === 'spoon') {
      shadow = '<ellipse cx="100" cy="176" rx="40" ry="6" fill="' + INK + '" opacity=".1"/>';
      g += '<g transform="rotate(-18 100 100)">';
      g += '<rect x="91" y="44" width="18" height="96" rx="9" fill="' + fill + '"/>';
      g += '<ellipse cx="100" cy="150" rx="30" ry="34" fill="' + fill + '"/><ellipse cx="100" cy="152" rx="21" ry="25" fill="' + shade(body, -0.12) + '"/><ellipse cx="94" cy="142" rx="6" ry="10" fill="#fff" opacity=".5"/>';
      if (FACE[m]) {
        g += ears(m, 100, 26, 40, body) + '<circle cx="100" cy="36" r="22" fill="' + fill + '"/>' + face(100, 36, 0.55, m === 'frog');
      } else {
        g += '<circle cx="100" cy="36" r="20" fill="' + shade(acc, 0.5) + '"/>' + decor(m, 100, 36, 1, acc);
      }
      g += '</g>';
    } else if (a.kind === 'set') {
      shadow = '';
      g += '<ellipse cx="100" cy="160" rx="80" ry="20" fill="' + shade(acc, -0.12) + '"/><ellipse cx="100" cy="156" rx="78" ry="18" fill="' + acc + '"/><ellipse cx="100" cy="156" rx="52" ry="10" fill="' + shade(acc, -0.08) + '"/>';
      g += ears(m, 100, 98, 100, body);
      g += '<path d="M146 108 c30 0 30 36 -4 36" stroke="' + dk + '" stroke-width="11" fill="none" stroke-linecap="round"/>';
      g += '<path d="M50 100 H150 Q148 158 100 158 Q52 158 50 100Z" fill="' + fill + '"/><ellipse cx="100" cy="100" rx="50" ry="9" fill="' + dk + '"/>';
      g += facey(100, 126, 0.8);
      g += '<path d="M62 112 Q64 134 76 146" stroke="#fff" stroke-width="6" opacity=".5" fill="none" stroke-linecap="round"/>';
    } else if (a.kind === 'bowl') {
      shadow = '<ellipse cx="100" cy="172" rx="58" ry="7" fill="' + INK + '" opacity=".12"/>';
      g += ears(m, 100, 92, 140, body);
      g += '<path d="M28 96 H172 Q168 170 100 170 Q32 170 28 96Z" fill="' + fill + '"/><ellipse cx="100" cy="96" rx="72" ry="14" fill="' + dk + '"/><ellipse cx="100" cy="98" rx="62" ry="9" fill="' + shade(body, 0.4) + '"/>';
      g += '<rect x="80" y="166" width="40" height="8" rx="4" fill="' + dk + '"/>';
      g += facey(100, 132, 1);
      g += '<path d="M44 110 Q50 140 70 156" stroke="#fff" stroke-width="6" opacity=".5" fill="none" stroke-linecap="round"/>';
    } else {
      shadow = '<ellipse cx="102" cy="104" rx="80" ry="80" fill="' + INK + '" opacity=".08"/>';
      g += '<circle cx="100" cy="100" r="80" fill="' + fill + '"/><circle cx="100" cy="100" r="58" fill="' + shade(body, 0.3) + '" stroke="' + dk + '" stroke-width="2"/>';
      if (FACE[m]) { g += ears(m, 100, 74, 60, acc) + '<circle cx="100" cy="104" r="30" fill="' + acc + '"/>' + face(100, 104, 0.75, m === 'frog'); }
      else { g += decor(m, 100, 100, 1.6, acc); }
      for (var i = 0; i < 10; i++) { var an = i / 10 * Math.PI * 2; g += '<circle cx="' + (100 + Math.cos(an) * 69) + '" cy="' + (100 + Math.sin(an) * 69) + '" r="3" fill="' + acc + '"/>'; }
      g += '<path d="M44 70 Q52 46 76 34" stroke="#fff" stroke-width="7" opacity=".5" fill="none" stroke-linecap="round"/>';
    }
    return '<svg viewBox="0 0 200 200" role="img" aria-hidden="true" focusable="false">' + grad + shadow + g + '</svg>';
  }

  /* ---------- seed data ---------- */
  var P = [
    ['Flower House Mug', 'cottage', 599, 330, 4, 0, { body: '#fbe9f0', accent: '#f29ab8', door: '#8a5cc8' }, 1, 'The one from slide 1: a pink-roof cottage with a purple door and a little lid you can lift.'],
    ['Mushroom Cottage Mug', 'cottage', 649, 360, 3, 0, { body: '#fff6ea', accent: '#e8606a', door: '#a8744f', dots: 1 }, 1, 'A red-cap mushroom house for your desk. Lid included.'],
    ['Blueberry Cottage Mug', 'cottage', 599, 320, 5, 15, { body: '#ffd56b', accent: '#7cc3e6', door: '#5f7fd1' }, 1, 'Sunny yellow cottage with a sky-blue roof.'],
    ['Choco Strawberry Cottage', 'cottage', 649, 350, 2, 0, { body: '#8a5a4a', accent: '#e8505b', door: '#f4b6c2' }, 1, 'Chocolate-brown walls and a strawberry-red roof.'],
    ['Lavender Fairy Cottage', 'cottage', 699, 390, 2, 10, { body: '#fff4fa', accent: '#b79ce8', door: '#6f9bd1' }, 1, 'A soft lavender roof and a blue fairy door.'],
    ['Mint Garden Cottage', 'cottage', 599, 330, 0, 0, { body: '#fde3ea', accent: '#8fd3b0', door: '#8a5cc8' }, 0, 'Pink walls and a mint roof. Restocking soon.'],
    ['Sleepy Cat Mug', 'mug', 389, 210, 8, 10, { body: '#fde2ea', accent: '#f29ab8', motif: 'cat' }, 1, 'Cat ears on the rim and a sleepy little face.'],
    ['Bunny Hug Mug', 'mug', 389, 210, 6, 0, { body: '#e9defb', accent: '#b79ce8', motif: 'bunny' }, 0, 'Lavender bunny with tall ears.'],
    ['Little Bear Mug', 'mug', 399, 215, 5, 20, { body: '#f1d9bf', accent: '#c99a72', motif: 'bear' }, 0, 'A latte-coloured bear for your morning coffee.'],
    ['Froggy Morning Mug', 'mug', 379, 200, 7, 0, { body: '#c4ead2', accent: '#7cc79a', motif: 'frog' }, 0, 'A happy mint frog. Holds about 350 ml.'],
    ['Strawberry Milk Mug', 'mug', 349, 180, 9, 0, { body: '#ffe1e7', accent: '#ef6f86', motif: 'strawberry' }, 0, 'Pink glaze with a hand-painted strawberry.'],
    ['Cloud Nap Mug', 'mug', 349, 180, 6, 0, { body: '#cfe8f6', accent: '#9ccbe6', motif: 'cloud' }, 0, 'A sleepy cloud on a sky-blue mug.'],
    ['Tulip Glaze Mug', 'mug', 329, 170, 10, 0, { body: '#fff3e2', accent: '#f29ab8', motif: 'flower' }, 0, 'Cream glaze with a pink flower.'],
    ['Heart Latte Mug', 'mug', 299, 150, 12, 10, { body: '#ffeeb0', accent: '#f27fa5', motif: 'heart' }, 1, 'Butter-yellow with a pink heart. Easy gift.'],
    ['Petal Spoon · Pink', 'spoon', 149, 60, 12, 0, { body: '#f8c6d6', accent: '#f29ab8', motif: 'flower' }, 0, 'Flower-top coffee spoon.'],
    ['Petal Spoon · Mint', 'spoon', 149, 60, 11, 0, { body: '#c4ead2', accent: '#7cc79a', motif: 'flower' }, 0, 'Flower-top coffee spoon in mint.'],
    ['Kitty Spoon', 'spoon', 169, 70, 9, 0, { body: '#fff3e2', accent: '#f29ab8', motif: 'cat' }, 0, 'A tiny cat head on top.'],
    ['Bunny Spoon', 'spoon', 169, 70, 8, 15, { body: '#e9defb', accent: '#b79ce8', motif: 'bunny' }, 0, 'Lavender bunny spoon.'],
    ['Strawberry Spoon', 'spoon', 159, 65, 10, 0, { body: '#ffe1e7', accent: '#ef6f86', motif: 'strawberry' }, 0, 'Strawberry-top dessert spoon.'],
    ['Bear Spoon', 'spoon', 169, 70, 1, 0, { body: '#f1d9bf', accent: '#c99a72', motif: 'bear' }, 0, 'A little bear for stirring.'],
    ['Cat Café Cup & Saucer', 'set', 549, 300, 4, 0, { body: '#fde2ea', accent: '#d9c8f5', motif: 'cat' }, 1, 'Cup with cat ears and a lavender saucer.'],
    ['Garden Cup & Saucer', 'set', 499, 270, 5, 0, { body: '#fff3e2', accent: '#bfe6cf', motif: 'flower' }, 1, 'Cream cup, mint saucer, pink flower.'],
    ['Bunny Tea Set', 'set', 549, 300, 3, 10, { body: '#ffffff', accent: '#f8c6d6', motif: 'bunny' }, 1, 'White bunny cup on a pink saucer.'],
    ['Kitty Ramen Bowl', 'bowl', 459, 250, 4, 0, { body: '#ffe7a8', accent: '#f29ab8', motif: 'cat' }, 0, 'A big bowl with cat ears on the rim.'],
    ['Froggy Rice Bowl', 'bowl', 399, 210, 6, 0, { body: '#c4ead2', accent: '#7cc79a', motif: 'frog' }, 0, 'Mint frog bowl for rice or cereal.'],
    ['Bunny Dessert Bowl', 'bowl', 349, 180, 7, 0, { body: '#fde2ea', accent: '#f29ab8', motif: 'bunny' }, 0, 'Small pink bowl for desserts.'],
    ['Bear Snack Plate', 'bowl', 299, 150, 5, 0, { body: '#fff3e2', accent: '#e3c29f', motif: 'bear', plate: 1 }, 0, 'Cream plate with a bear in the middle.'],
    ['Flower Dessert Plate', 'bowl', 279, 140, 6, 0, { body: '#ece3fb', accent: '#f29ab8', motif: 'flower', plate: 1 }, 0, 'Lavender plate with a pink flower.']
  ];

  function seed() {
    var r = rng(20261122);
    var products = P.map(function (p, i) {
      var a = Object.assign({ kind: p[6].plate ? 'plate' : p[1] }, p[6]);
      if (!a.motif) a.motif = 'none';
      return { id: 'p' + (i + 1), name: p[0], cat: p[1], price: p[2], cost: p[3], stock: p[4], disc: p[5], art: a, gift: !!p[7], desc: p[8], photo: null };
    });
    var now = Date.now(), DAY = 864e5, orders = [];
    var names = ['Bea', 'Camille', 'Joanna', 'Trish', 'Mika', 'Andrea', 'Pia', 'Rhea', 'Kat', 'Nicole', 'Jas', 'Lara', 'Gelo', 'Maan'];
    for (var o = 0; o < 26; o++) {
      var age = Math.floor(r() * 46) + (o < 3 ? 0 : 1);
      if (o < 3) age = o === 0 ? 0 : 1;
      var date = new Date(now - age * DAY - Math.floor(r() * 10) * 36e5);
      var count = 1 + Math.floor(r() * 3), items = [], used = {};
      for (var k = 0; k < count; k++) {
        var p = products[Math.floor(r() * products.length)];
        if (used[p.id]) continue; used[p.id] = 1;
        var pct = r() < 0.45 ? [10, 15, 20][Math.floor(r() * 3)] : 0;
        var qty = r() < 0.2 ? 2 : 1;
        items.push({ id: p.id, name: p.name, qty: qty, price: p.price, unit: Math.round(p.price * (1 - pct / 100)), cost: p.cost, pct: pct });
      }
      var subtotal = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
      var net = items.reduce(function (s, i) { return s + i.unit * i.qty; }, 0);
      var method = ['mm', 'mm', 'pickup', 'prov'][Math.floor(r() * 4)];
      var ship = { pickup: 0, mm: 100, prov: 180 }[method];
      var status = o < 3 ? 'pending' : age < 4 ? 'paid' : 'shipped';
      if (o === 7) status = 'cancelled';
      orders.push({
        id: 'KYO-' + (1001 + 25 - o), date: date.toISOString(), name: names[o % names.length] + ' ' + 'DGLMRST'[o % 7] + '.',
        city: ['Taguig', 'Pasig', 'Makati', 'Quezon City', 'Cebu City', 'Mandaluyong'][o % 6], method: method,
        items: items, subtotal: subtotal, discount: subtotal - net, shipping: ship, total: net + ship,
        ref: String(1000000000000 + Math.floor(r() * 8999999999999)).slice(0, 13), status: status, code: ''
      });
    }
    orders.sort(function (a, b) { return b.date < a.date ? -1 : 1; });
    var month = function (d) { return new Date(now - d * DAY).toISOString().slice(0, 10); };
    var expenses = [
      { id: 'e1', date: month(2), item: 'Bubble wrap and fragile tape', cat: 'Packaging', amount: 420 },
      { id: 'e2', date: month(5), item: 'Gift boxes (20 pcs)', cat: 'Packaging', amount: 600 },
      { id: 'e3', date: month(9), item: 'Lalamove to mall pick-up', cat: 'Delivery', amount: 260 },
      { id: 'e4', date: month(16), item: 'Ribbon and stickers', cat: 'Packaging', amount: 180 },
      { id: 'e5', date: month(33), item: 'Bubble wrap and fragile tape', cat: 'Packaging', amount: 380 },
      { id: 'e6', date: month(38), item: 'Lalamove to mall pick-up', cat: 'Delivery', amount: 240 }
    ];
    return {
      v: 1, products: products, orders: orders, expenses: expenses, nextOrder: 1027, nextProduct: 29,
      settings: {
        sale: { on: false, pct: 15, label: 'Payday sale' },
        codes: [{ code: 'COFFEE10', pct: 10, on: true }, { code: 'KYOTIE15', pct: 15, on: true }, { code: 'XMAS20', pct: 20, on: false }],
        bulk: { on: true, min: 3, pct: 10 },
        targetMargin: 40,
        shipping: { pickup: 0, mm: 100, prov: 180 },
        lowStock: 2
      }
    };
  }

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) {}
    return seed();
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} return seed(); }

  /* ---------- pricing: one discount per item, the biggest one wins ---------- */
  function bestPct(p, s, opts) {
    opts = opts || {};
    var cands = [{ pct: p.disc || 0, why: 'Item sale' }];
    if (s.settings.sale.on) cands.push({ pct: s.settings.sale.pct, why: s.settings.sale.label || 'Store sale' });
    if (opts.code) cands.push({ pct: opts.code.pct, why: 'Code ' + opts.code.code });
    if (opts.bulk) cands.push({ pct: s.settings.bulk.pct, why: s.settings.bulk.min + '+ items' });
    return cands.reduce(function (a, b) { return b.pct > a.pct ? b : a; });
  }
  function shelfPrice(p, s) {
    var b = bestPct(p, s);
    return { pct: b.pct, why: b.why, price: Math.round(p.price * (1 - b.pct / 100)) };
  }
  function findCode(s, text) {
    text = String(text || '').trim().toUpperCase();
    if (!text) return null;
    return s.settings.codes.filter(function (c) { return c.on && c.code === text; })[0] || null;
  }
  function totals(s, cart, codeText, method) {
    var code = findCode(s, codeText);
    var qtyAll = cart.reduce(function (n, l) { return n + l.qty; }, 0);
    var bulk = s.settings.bulk.on && qtyAll >= s.settings.bulk.min;
    var lines = [];
    cart.forEach(function (l) {
      var p = byId(s, l.id); if (!p) return;
      var b = bestPct(p, s, { code: code, bulk: bulk });
      lines.push({ p: p, qty: l.qty, pct: b.pct, why: b.why, unit: Math.round(p.price * (1 - b.pct / 100)) });
    });
    var subtotal = lines.reduce(function (n, l) { return n + l.p.price * l.qty; }, 0);
    var net = lines.reduce(function (n, l) { return n + l.unit * l.qty; }, 0);
    var ship = lines.length ? (s.settings.shipping[method || 'mm'] || 0) : 0;
    return { lines: lines, code: code, bulk: bulk, qty: qtyAll, subtotal: subtotal, discount: subtotal - net, net: net, shipping: ship, total: net + ship };
  }
  function byId(s, id) { return s.products.filter(function (p) { return p.id === id; })[0]; }
  function margin(price, cost) { return price > 0 ? Math.round((price - cost) / price * 100) : 0; }

  window.KYO = {
    KEY: KEY, MAX: MAX_PRODUCTS, CATS: CATS, peso: peso, esc: esc, art: art, rng: rng,
    load: load, save: save, reset: reset, totals: totals, shelfPrice: shelfPrice, bestPct: bestPct,
    findCode: findCode, byId: byId, margin: margin, shade: shade,
    thumb: function (p) { return p.photo ? '<img src="' + p.photo + '" alt="">' : art(p.art); }
  };
})();
