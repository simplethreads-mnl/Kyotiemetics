/* Kyotiemics concept demo: shared data, pricing rules and illustrations.
   Everything lives in localStorage so the shop and the owner view share it. */
(function () {
  'use strict';
  var KEY = 'kyo-demo-v4';
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

  var CATS = { character: 'Character mugs', print: 'Cat print mugs', mug: 'Everyday mugs', set: 'Cups & bundles', spoon: 'Spoons' };

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

  /* Drawings modelled on the shop's real pieces (placeholders until her photos go in) */
  function hdl(col, w) { return '<path d="M146 96 c40 -4 40 56 0 54" stroke="' + col + '" stroke-width="' + (w || 13) + '" fill="none" stroke-linecap="round"/>'; }
  function star4(x, y, r, col) { return '<path d="M' + x + ' ' + (y - r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) + ' Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'Z" fill="' + col + '"/>'; }
  function heart(x, y, s, col, outline) {
    var d = 'M' + x + ' ' + (y + 7 * s) + ' C' + (x - 13 * s) + ' ' + (y - 1 * s) + ' ' + (x - 6 * s) + ' ' + (y - 10 * s) + ' ' + x + ' ' + (y - 3.5 * s) + ' C' + (x + 6 * s) + ' ' + (y - 10 * s) + ' ' + (x + 13 * s) + ' ' + (y - 1 * s) + ' ' + x + ' ' + (y + 7 * s) + 'Z';
    return outline ? '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2"/>' : '<path d="' + d + '" fill="' + col + '"/>';
  }
  function eyes(y, gap, r) { return '<circle cx="' + (100 - gap) + '" cy="' + y + '" r="' + r + '" fill="#1d1b22"/><circle cx="' + (100 + gap) + '" cy="' + y + '" r="' + r + '" fill="#1d1b22"/>'; }
  function wavy(tx, ty, s, rot) {
    return '<g transform="translate(' + tx + ' ' + ty + ') rotate(' + rot + ' 100 120) scale(' + s + ')">' +
      '<path d="M58 96 c-40 -4 -40 56 0 54" stroke="#f3c3cf" stroke-width="14" fill="none" stroke-linecap="round"/>' +
      '<path d="M60 70 Q54 96 62 118 Q54 146 64 170 H136 Q146 146 138 118 Q146 96 140 70Z" fill="#fbf8f6" stroke="#ece4e2" stroke-width="2"/>' +
      '<ellipse cx="100" cy="70" rx="40" ry="9" fill="#e98a9c"/><path d="M72 92 Q68 118 74 140" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/></g>';
  }
  function cat(x, y, v) {
    var o = '', ink = '#6b4a35';
    if (v === 'cozy') {
      o += '<ellipse cx="' + x + '" cy="' + (y + 16) + '" rx="34" ry="13" fill="#f2b04a"/>';
      o += '<ellipse cx="' + x + '" cy="' + (y + 6) + '" rx="24" ry="11" fill="#fff" stroke="' + ink + '" stroke-width="1.6"/><circle cx="' + (x - 16) + '" cy="' + (y - 2) + '" r="11" fill="#fff" stroke="' + ink + '" stroke-width="1.6"/>';
      o += '<path d="M' + (x - 25) + ' ' + (y - 8) + ' l3 -9 l5 7 M' + (x - 12) + ' ' + (y - 11) + ' l5 -7 l2 9" stroke="' + ink + '" stroke-width="1.6" fill="#fff"/>';
      o += '<ellipse cx="' + (x + 4) + '" cy="' + (y + 2) + '" rx="8" ry="5" fill="#f0a453"/><path d="M' + (x - 21) + ' ' + (y - 1) + ' q2 2 4 0 M' + (x - 14) + ' ' + (y - 1) + ' q2 2 4 0" stroke="' + ink + '" stroke-width="1.4" fill="none"/>';
      o += '<path d="M' + (x - 28) + ' ' + (y - 4) + ' Q' + (x - 16) + ' ' + (y - 20) + ' ' + (x - 4) + ' ' + (y - 4) + '" stroke="#5b5b66" stroke-width="2.4" fill="none"/>';
      o += '<path d="M' + (x + 26) + ' ' + (y - 24) + ' h8 v-6" stroke="' + ink + '" stroke-width="1.4" fill="none"/>';
      return o;
    }
    o += '<ellipse cx="' + x + '" cy="' + (y + 18) + '" rx="15" ry="14" fill="#fff" stroke="' + ink + '" stroke-width="1.6"/>';
    o += '<path d="M' + (x - 13) + ' ' + (y - 6) + ' l2 -14 l9 8 M' + (x + 13) + ' ' + (y - 6) + ' l-2 -14 l-9 8" stroke="' + ink + '" stroke-width="1.6" fill="#fff" stroke-linejoin="round"/>';
    o += '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#fff" stroke="' + ink + '" stroke-width="1.6"/><path d="M' + (x - 13) + ' ' + (y - 5) + ' a14 14 0 0 1 10 -9 v7Z" fill="#f0a453"/>';
    o += '<circle cx="' + (x - 5) + '" cy="' + (y + 1) + '" r="1.8" fill="' + ink + '"/><circle cx="' + (x + 5) + '" cy="' + (y + 1) + '" r="1.8" fill="' + ink + '"/><ellipse cx="' + (x - 9) + '" cy="' + (y + 6) + '" rx="3" ry="2" fill="#f48fb1" opacity=".6"/><ellipse cx="' + (x + 9) + '" cy="' + (y + 6) + '" rx="3" ry="2" fill="#f48fb1" opacity=".6"/>';
    if (v === 'tree') o += '<path d="M' + (x - 16) + ' ' + (y - 6) + ' L' + x + ' ' + (y - 34) + ' L' + (x + 16) + ' ' + (y - 6) + 'Z" fill="#3f7d3a"/>' + star4(x, y - 36, 6, '#f2c230');
    if (v === 'santa') o += '<path d="M' + (x - 12) + ' ' + (y - 10) + ' Q' + (x + 4) + ' ' + (y - 34) + ' ' + (x + 16) + ' ' + (y - 22) + ' L' + (x + 12) + ' ' + (y - 10) + 'Z" fill="#c8323a"/><circle cx="' + (x + 17) + '" cy="' + (y - 23) + '" r="3.5" fill="#fff"/>';
    if (v === 'tree' || v === 'santa') o += '<rect x="' + (x - 13) + '" y="' + (y + 10) + '" width="26" height="7" rx="3" fill="#c8323a"/><path d="M' + (x - 6) + ' ' + (y + 10) + ' v7 M' + (x + 2) + ' ' + (y + 10) + ' v7" stroke="#fff" stroke-width="2"/>';
    if (v === 'coffee') o += '<path d="M' + (x - 20) + ' ' + (y + 14) + ' h40 l-4 22 h-32Z" fill="#e8c27a"/><ellipse cx="' + (x - 6) + '" cy="' + (y + 20) + '" rx="5" ry="7" fill="#7a4a2e"/><ellipse cx="' + (x + 7) + '" cy="' + (y + 22) + '" rx="5" ry="7" fill="#7a4a2e"/>';
    return o;
  }
  var EXTRA = {
    beret: function (a, id, fill) {
      var g = hdl(a.handleCol || '#f6c1cf', 14);
      g += '<rect x="50" y="76" width="100" height="94" rx="36" fill="' + fill + '"/>';
      g += '<path d="M50 146 V104 Q50 74 100 74 Q150 74 150 104 V146 Q148 126 140 120 Q132 110 122 118 Q112 106 100 116 Q88 106 78 118 Q68 110 60 120 Q52 126 50 146Z" fill="' + a.hair + '"/>';
      g += '<path d="M62 100 Q68 88 82 84" stroke="#fff" stroke-width="5" opacity=".45" fill="none" stroke-linecap="round"/>';
      g += '<path d="M44 82 Q100 30 156 82 Q100 96 44 82Z" fill="' + a.accent + '"/><circle cx="100" cy="45" r="7" fill="' + shade(a.accent, -0.15) + '"/><path d="M66 66 Q82 52 102 50" stroke="#fff" stroke-width="5" opacity=".4" fill="none" stroke-linecap="round"/>';
      g += '<circle cx="70" cy="148" r="11" fill="#f48fb1" opacity=".5"/><circle cx="130" cy="148" r="11" fill="#f48fb1" opacity=".5"/>' + eyes(138, 16, 4.6) + '<circle cx="100" cy="145" r="2.4" fill="#ef8aa0"/>';
      g += a.smile ? '<path d="M92 151 q8 7 16 0" stroke="#e46a86" stroke-width="2.6" fill="none" stroke-linecap="round"/>' : '<path d="M95 154 q5 -4 10 0" stroke="#e46a86" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
      return g;
    },
    eggplant: function (a, id, fill) {
      var g = '<path d="M100 78 C70 78 66 104 60 126 C50 162 72 174 100 174 C128 174 150 162 140 126 C134 104 130 78 100 78Z" fill="' + fill + '"/>';
      g += '<path d="M72 120 Q68 140 76 156" stroke="#fff" stroke-width="5" opacity=".45" fill="none" stroke-linecap="round"/>';
      var pts = [];
      for (var i = 0; i < 10; i++) { var an = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 15 : 34; pts.push((100 + Math.cos(an) * r).toFixed(1) + ',' + (80 + Math.sin(an) * r * 0.5).toFixed(1)); }
      g += '<polygon points="' + pts.join(' ') + '" fill="#a6cf3c" stroke="#a6cf3c" stroke-width="10" stroke-linejoin="round"/><rect x="94" y="48" width="12" height="26" rx="5" fill="#97c232"/>';
      if (a.face === 'cry') {
        g += '<ellipse cx="86" cy="120" rx="3.5" ry="5" fill="#1d1b22"/><ellipse cx="114" cy="120" rx="3.5" ry="5" fill="#1d1b22"/><rect x="84" y="126" width="4" height="24" rx="2" fill="#3f7fd0"/><rect x="112" y="126" width="4" height="24" rx="2" fill="#3f7fd0"/><ellipse cx="100" cy="134" rx="5" ry="4" fill="#fff" stroke="#1d1b22" stroke-width="1.5"/>';
      } else if (a.face === 'wink') {
        g += '<path d="M80 118 l8 4 l-8 4" stroke="#1d1b22" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="116" cy="122" r="4.5" fill="#1d1b22"/><path d="M94 134 l5 5 l9 -9" stroke="#1d1b22" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="126" cy="132" r="7" fill="#fff" opacity=".7"/>';
      } else {
        g += eyes(120, 14, 4.5) + '<path d="M92 132 q8 8 16 0" stroke="#1d1b22" stroke-width="3" fill="none" stroke-linecap="round"/>' + star4(126, 108, 7, '#f2c94c');
      }
      return g + '<path d="M96 160 l6 6 M102 160 l-6 6" stroke="#2f2440" stroke-width="2.2"/>';
    },
    ripple: function (a, id) {
      var cid = 'c' + id, ribs = '';
      for (var x = 46; x < 158; x += 7) ribs += '<path d="M' + x + ' 104 V172" stroke="#5e3626" stroke-width="2"/>';
      return '<defs><clipPath id="' + cid + '"><path d="M42 92 H158 Q156 168 100 168 Q44 168 42 92Z"/></clipPath></defs>' +
        hdl('#6d3f2c', 14) + '<path d="M42 92 H158 Q156 168 100 168 Q44 168 42 92Z" fill="#7a4a35"/>' +
        '<g clip-path="url(#' + cid + ')">' + ribs + '<path d="M42 90 H158 V112 Q130 104 112 116 Q88 106 70 118 Q54 112 42 116Z" fill="#f4ecdf"/></g>' +
        '<ellipse cx="100" cy="92" rx="58" ry="12" fill="#fbf6ee"/><ellipse cx="100" cy="93" rx="50" ry="8" fill="#ece0cd"/>' +
        '<g transform="rotate(-12 70 176)"><rect x="66" y="170" width="76" height="9" rx="4.5" fill="#6d3f2c"/><ellipse cx="58" cy="174" rx="20" ry="10" fill="#6d3f2c"/><ellipse cx="57" cy="173" rx="15" ry="7" fill="#f4ecdf"/></g>';
    },
    bearband: function (a, id, fill) {
      var cid = 'c' + id, blue = '#a9cbe8';
      return hdl(blue, 14) + '<defs><clipPath id="' + cid + '"><rect x="48" y="72" width="100" height="94" rx="30"/></clipPath></defs>' +
        '<rect x="48" y="72" width="100" height="94" rx="30" fill="' + fill + '"/>' +
        '<g clip-path="url(#' + cid + ')"><path d="M40 70 H160 V90 Q100 98 40 90Z" fill="' + blue + '"/><path d="M40 150 Q100 142 160 150 V170 H40Z" fill="' + blue + '"/></g>' +
        '<ellipse cx="98" cy="76" rx="46" ry="7" fill="' + shade(blue, -0.1) + '"/>' +
        '<ellipse cx="76" cy="108" rx="10" ry="8" fill="' + shade(a.body, -0.07) + '"/><ellipse cx="120" cy="108" rx="10" ry="8" fill="' + shade(a.body, -0.07) + '"/>' +
        '<ellipse cx="98" cy="128" rx="12" ry="8" fill="' + shade(a.body, -0.05) + '"/><path d="M62 98 Q58 118 64 138" stroke="#fff" stroke-width="5" opacity=".55" fill="none" stroke-linecap="round"/>';
    },
    bundle: function () { return wavy(10, 54, 0.66, -8) + wavy(64, 58, 0.66, 6); },
    catprint: function (a, id, fill) {
      var g = hdl(a.handleCol || '#f4efe6', 15);
      g += '<rect x="48" y="74" width="100" height="94" rx="20" fill="' + fill + '"/>';
      if (a.base) g += '<rect x="48" y="150" width="100" height="18" rx="9" fill="' + a.base + '"/>';
      g += '<ellipse cx="98" cy="78" rx="48" ry="8" fill="' + shade(a.body, -0.1) + '"/>';
      g += cat(98, 116, a.v);
      if (a.v === 'tree' || a.v === 'santa') g += '<circle cx="64" cy="96" r="3.5" fill="#c8323a"/><circle cx="132" cy="102" r="3.5" fill="#f2c230"/><circle cx="62" cy="140" r="3" fill="#3f7d3a"/><circle cx="136" cy="140" r="3" fill="#c8323a"/>' + star4(130, 90, 6, '#f2c230');
      if (a.v === 'coffee') g += '<rect x="58" y="94" width="12" height="16" rx="3" fill="#6b4a35"/><rect x="56" y="90" width="16" height="5" rx="2" fill="#c98a4a"/>';
      return g + '<path d="M58 92 Q54 120 60 146" stroke="#fff" stroke-width="5" opacity=".5" fill="none" stroke-linecap="round"/>';
    },
    luckycat: function (a, id, fill) {
      var lav = '#c3acdf';
      var g = '<circle cx="156" cy="122" r="20" stroke="' + lav + '" stroke-width="15" fill="none"/>';
      g += '<rect x="50" y="80" width="96" height="88" rx="22" fill="' + fill + '"/>' + heart(98, 128, 3, '#cdbff0');
      g += '<path d="M86 112 l2 -12 l7 7 M110 112 l-2 -12 l-7 7" fill="#1d1b22"/><circle cx="98" cy="114" r="12" fill="#1d1b22"/><ellipse cx="98" cy="140" rx="14" ry="17" fill="#1d1b22"/>';
      g += '<circle cx="93" cy="113" r="2" fill="#f2d55c"/><circle cx="103" cy="113" r="2" fill="#f2d55c"/>';
      g += '<path d="M86 104 Q96 84 112 96 Z" fill="#8a6bb8"/><rect x="84" y="102" width="28" height="5" rx="2.5" fill="#fff"/>';
      g += star4(66, 100, 6, '#1d1b22') + star4(130, 146, 5, '#1d1b22');
      g += '<path d="M134 74 L150 36" stroke="#c9c9d1" stroke-width="4" stroke-linecap="round"/><circle cx="153" cy="32" r="11" fill="' + lav + '"/>';
      g += '<path d="M44 82 Q98 52 152 82 Q98 94 44 82Z" fill="' + lav + '"/><path d="M62 76 Q78 66 96 64" stroke="#fff" stroke-width="4" opacity=".5" fill="none" stroke-linecap="round"/>';
      return g;
    },
    dragon: function (a, id, fill) {
      var e = '#ddd6cc';
      var flame = 'M140 74 C170 66 150 96 168 104 C184 116 150 128 166 148 C172 160 150 162 140 160';
      var g = '<path d="' + flame + '" stroke="' + e + '" stroke-width="16" fill="none" stroke-linecap="round"/><path d="' + flame + '" stroke="#f8f5f0" stroke-width="11" fill="none" stroke-linecap="round"/>';
      g += '<rect x="56" y="58" width="86" height="116" rx="12" fill="' + fill + '"/><ellipse cx="99" cy="60" rx="43" ry="8" fill="#8f86c9"/>';
      g += '<g stroke="' + e + '" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M70 126 c8 -22 34 -22 36 -2 c2 16 -18 18 -18 6"/><path d="M82 96 q12 -12 26 -2 q8 6 18 0"/><path d="M68 154 q18 -12 34 0 q14 10 30 -4"/><path d="M112 128 q10 -8 18 4"/></g>';
      return g + '<path d="M64 76 V160" stroke="#fff" stroke-width="5" opacity=".7" stroke-linecap="round"/>';
    },
    doodle: function (a, id, fill) {
      var g = hdl(a.handleCol || '#f2ece0', 14);
      g += '<path d="M54 76 H146 L138 160 Q136 170 126 170 H74 Q64 170 62 160Z" fill="' + fill + '"/><ellipse cx="100" cy="76" rx="46" ry="9" fill="' + a.inside + '"/>';
      var c = a.accent;
      g += heart(80, 104, 1.4, c, 1) + heart(118, 98, 1, c) + heart(100, 132, 1.8, c, 1) + heart(76, 150, 1, c) + heart(124, 146, 1.3, c, 1);
      if (a.sparkle) g += star4(90, 116, 7, c) + star4(126, 122, 5, c) + star4(70, 128, 4, c);
      if (a.spoon) g += '<path d="M118 78 L150 36" stroke="#e7e2da" stroke-width="8" stroke-linecap="round"/><path d="M118 78 L150 36" stroke="#fff" stroke-width="5" stroke-linecap="round"/>';
      return g + '<path d="M66 90 L72 150" stroke="#fff" stroke-width="5" opacity=".6" stroke-linecap="round"/>';
    },
    mushspoon: function () {
      var g = '<g transform="rotate(20 100 100)">';
      g += '<path d="M93 92 Q90 140 92 176 Q100 184 108 176 Q110 140 107 92Z" fill="#fbf8f4" stroke="#e6ded4" stroke-width="2"/><ellipse cx="100" cy="168" rx="4" ry="5" fill="#e6ded4"/><path d="M95 128 q5 -5 10 0" stroke="#8a4b33" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
      g += '<path d="M100 24 C140 24 150 60 136 82 Q120 98 100 96 Q80 98 64 82 C50 60 60 24 100 24Z" fill="#d8262f"/><path d="M86 94 q14 6 28 0" stroke="#f4ece4" stroke-width="5" stroke-linecap="round"/>';
      [[82, 44, 6], [108, 38, 5], [124, 60, 6], [92, 66, 7], [74, 70, 4], [114, 82, 4]].forEach(function (d) { g += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '" fill="#fff"/>'; });
      return g + '<path d="M72 46 Q78 34 90 30" stroke="#fff" stroke-width="4" opacity=".5" fill="none" stroke-linecap="round"/></g>';
    }
  };

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
    if (EXTRA[a.kind]) {
      shadow = '<ellipse cx="100" cy="172" rx="60" ry="7" fill="' + INK + '" opacity=".12"/>';
      g = EXTRA[a.kind](a, id, fill, dk);
    } else if (a.kind === 'cottage') {
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
      if (a.apple) {
        g += '<circle cx="158" cy="122" r="22" fill="#a9cf54"/><circle cx="150" cy="114" r="6" fill="#fff" opacity=".45"/><path d="M160 102 q2 -10 8 -14" stroke="#5a3b2a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M166 96 q10 -6 14 2 q-8 6 -14 -2Z" fill="#6fae3f"/>';
      } else {
        var hc = a.handleCol || dk;
        g += '<path d="M140 96 c38 -4 38 52 0 52" stroke="' + hc + '" stroke-width="13" fill="none" stroke-linecap="round"/>';
        if (a.twist) g += '<path d="M140 96 c38 -4 38 52 0 52" stroke="' + shade(hc, -0.2) + '" stroke-width="13" stroke-dasharray="3 7" fill="none" opacity=".5"/>';
      }
      g += '<rect x="48" y="70" width="96" height="94" rx="26" fill="' + fill + '"/>';
      g += '<ellipse cx="96" cy="76" rx="44" ry="8" fill="' + (a.inside || dk) + '"/><ellipse cx="96" cy="75" rx="38" ry="5" fill="' + shade(a.inside || body, -0.32) + '" opacity=".55"/>';
      if (m === 'ghost') {
        g += '<ellipse cx="78" cy="122" rx="8" ry="16" fill="#1d1b22" transform="rotate(-14 78 122)"/><ellipse cx="116" cy="122" rx="8" ry="16" fill="#1d1b22" transform="rotate(14 116 122)"/><ellipse cx="76" cy="114" rx="2" ry="4" fill="#fff" opacity=".6"/>';
      } else if (m === 'drip') {
        g += '<path d="M48 112 q6 -12 12 0 q6 14 12 0 q6 -12 12 0 q6 14 12 0 q6 -12 12 0 q6 14 12 0 q6 -12 12 0 q6 14 12 0 V148 q-6 8 -12 0 q-6 8 -12 0 q-6 8 -12 0 q-6 8 -12 0 q-6 8 -12 0 q-6 8 -12 0 q-6 8 -12 0 q-6 8 -12 0Z" fill="' + acc + '"/>';
      } else {
        g += facey(96, 120, 1);
      }
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
  /* Her real catalogue (from the r/SmallBusinessPH post). Prices are hers.
     Costs and stock are guesses for the demo; she would enter the real ones. */
  var P = [
    ['Flower House Mug & Spoon', 'character', 599, 330, 2, 0, { kind: 'cottage', body: '#fbe9f0', accent: '#f29ab8', door: '#7b3fb0' }, 1, 'A pink-roof cottage mug with a purple door, a little lid and a matching flower spoon. Comes in a gift box.'],
    ['Beret Girl Mug · Cherry', 'character', 249, 130, 3, 0, { kind: 'beret', body: '#fffaf5', hair: '#5a2a24', accent: '#d8323c' }, 1, 'Chocolate-brown bob, red beret lid and rosy cheeks. Comes in a “For You” gift box.'],
    ['Beret Girl Mug · Sky', 'character', 249, 130, 3, 0, { kind: 'beret', body: '#fffaf5', hair: '#f2b632', accent: '#8cc3dc', smile: 1 }, 1, 'Sunny blonde bob with a sky-blue beret lid and a little smile. Gift box included.'],
    ['Eggplant Buddy Mug · Happy', 'character', 249, 130, 2, 0, { kind: 'eggplant', body: '#9467c4', accent: '#b79ce8', face: 'happy' }, 0, 'A happy purple eggplant with a green leaf lid.'],
    ['Eggplant Buddy Mug · Crybaby', 'character', 249, 130, 1, 0, { kind: 'eggplant', body: '#9467c4', accent: '#b79ce8', face: 'cry' }, 0, 'The dramatic one. Purple eggplant with a leaf lid and blue tears.'],
    ['Eggplant Buddy Mug · Wink', 'character', 249, 130, 1, 0, { kind: 'eggplant', body: '#9467c4', accent: '#b79ce8', face: 'wink' }, 0, 'Winking eggplant with a green leaf lid.'],
    ['Sky Bear Mug', 'character', 110, 55, 3, 0, { kind: 'bearband', body: '#f7efd9', accent: '#a9cbe8' }, 0, 'Cream mug with little bear ears and soft blue bands.'],
    ['Lucky Black Cat Mug', 'character', 270, 145, 2, 10, { kind: 'luckycat', body: '#fffdf9', accent: '#c3acdf' }, 1, 'Black cat in a purple hat, with a lavender lid and a stirring spoon.'],
    ['Coffee Time Cat Mug', 'print', 110, 55, 2, 0, { kind: 'catprint', body: '#fbf6ec', handleCol: '#f6efe2', v: 'coffee', accent: '#e8c27a' }, 0, 'A cat napping in a coffee-bean sack. Chunky cream handle.'],
    ['Christmas Tree Cat Mug', 'print', 110, 55, 2, 0, { kind: 'catprint', body: '#fbf6ec', handleCol: '#2f6b3d', base: '#2f6b3d', v: 'tree', accent: '#8fbf8a' }, 0, 'A cat in a Christmas-tree hat. Green handle and base.'],
    ['Santa Scarf Cat Mug', 'print', 110, 55, 2, 0, { kind: 'catprint', body: '#fbf6ec', handleCol: '#2f6b3d', base: '#2f6b3d', v: 'santa', accent: '#8fbf8a' }, 0, 'A cat in a red scarf and Santa hat. Green handle and base.'],
    ['Nice Day Cat Mug', 'print', 110, 55, 1, 0, { kind: 'catprint', body: '#f6c9cf', handleCol: '#f3b7c0', v: 'cozy', accent: '#f3b7c0' }, 0, '“It’s a nice day.” A cat on a cushion with headphones. Pink all over.'],
    ['Ghost Eyes Mug', 'mug', 110, 55, 3, 0, { kind: 'mug', body: '#f6f3ee', accent: '#cfcbd8', motif: 'ghost', handleCol: '#ece6dd' }, 0, 'Plain white mug with two big glossy black eyes.'],
    ['Green Apple Mug', 'mug', 110, 55, 2, 0, { kind: 'mug', body: '#f5f0e8', accent: '#a9cf54', motif: 'none', apple: 1 }, 0, 'Cream mug with a green apple for a handle.'],
    ['Lemon Drip Mug', 'mug', 110, 55, 2, 0, { kind: 'mug', body: '#fbfaf7', accent: '#f2d97a', motif: 'drip', handleCol: '#ecd27a', twist: 1 }, 0, 'White glaze dripping over butter yellow, with a twisted handle.'],
    ['Pink Heart Doodle Mug', 'mug', 199, 105, 2, 0, { kind: 'doodle', body: '#fbf6ef', inside: '#f2a8b6', accent: '#e58ea0' }, 0, 'Cream mug with a pink inside and engraved pink doodles.'],
    ['Lavender Sparkle Mug & Spoon', 'mug', 220, 115, 2, 0, { kind: 'doodle', body: '#fbf6ef', inside: '#b9b2ea', accent: '#b6a3dd', sparkle: 1, spoon: 1 }, 0, 'Cream mug with a lavender inside, sparkle doodles and a white spoon.'],
    ['Embossed Dragon Mug', 'mug', 299, 160, 2, 10, { kind: 'dragon', body: '#f8f5f0', accent: '#b9b2ea' }, 0, 'Tall white mug with a raised dragon design, flame handle and lavender inside.'],
    ['Choco Ripple Cup & Spoon', 'set', 220, 115, 2, 0, { kind: 'ripple', body: '#7a4a35', accent: '#c99a72' }, 0, 'Wide ribbed cup in chocolate brown with a wavy cream rim and matching spoon.'],
    ['Pink Cloud Mug Bundle (2 pcs)', 'set', 250, 130, 1, 0, { kind: 'bundle', body: '#fbf8f6', accent: '#f3b7c0' }, 0, 'Two wavy white mugs with pink handles and pink insides. Sold as a pair.'],
    ['Mushroom Spoon', 'spoon', 80, 35, 8, 0, { kind: 'mushspoon', body: '#d8262f', accent: '#e8606a' }, 0, 'Red polka-dot mushroom cap with a white stem handle.']
  ];

  /* Product mockups made from her own photos (images/products/<id>.jpg).
     The Santa Scarf Cat Mug (p11) is left out: its only photo is cut off at the screen edge.
     Remove it from SKIP once she sends a new photo. */
  var SKIP = { p11: 1 };

  function seed() {
    var r = rng(20261122);
    var products = P.map(function (p, i) {
      var a = Object.assign({ body: '#fbf6ef', accent: '#f29ab8' }, p[6]);
      if (!a.motif) a.motif = 'none';
      var pid = 'p' + (i + 1);
      return { id: pid, name: p[0], cat: p[1], price: p[2], cost: p[3], stock: p[4], disc: p[5], art: a, gift: !!p[7], desc: p[8], photo: 'images/products/' + pid + '.jpg' };
    }).filter(function (p) { return !SKIP[p.id]; });
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
      v: 4, products: products, orders: orders, expenses: expenses, nextOrder: 1027, nextProduct: 22,
      settings: {
        sale: { on: false, pct: 15, label: 'Payday sale' },
        codes: [{ code: 'COFFEE10', pct: 10, on: true }, { code: 'KYOTIE15', pct: 15, on: true }, { code: 'XMAS20', pct: 20, on: false }],
        bulk: { on: true, min: 3, pct: 10 },
        targetMargin: 40,
        shipping: { pickup: 0, mm: 100, prov: 180 },
        lowStock: 1
      }
    };
  }

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 4) return s; } catch (e) {}
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
    thumb: function (p) { return p.photo ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" width="1000" height="1000" loading="lazy" decoding="async">' : art(p.art); }
  };
})();
