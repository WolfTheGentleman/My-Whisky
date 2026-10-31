/*
 * My Whisky - collection app. Everything is stored on this device (IndexedDB).
 * Copyright (c) 2026. All rights reserved. See LICENSE.txt.
 */
(function () {
  'use strict';

  var MASTER = 3; // different whiskies needed for a distillery to turn full colour
  var REGION_MIN = 3; // distilleries with at least one whisky for a region to turn colour

  var FAMILIES = [
    { id: 'fruity', name: 'Fruity', color: '#12a07a', subs: ['Fresh fruit', 'Estery', 'Citrus', 'Fruity sweets'] },
    { id: 'floral', name: 'Floral', color: '#e8506a', subs: ['Fresh flowers', 'Perfumed', 'Leafy', 'Plant house'] },
    { id: 'peaty', name: 'Peaty', color: '#7b3f9e', subs: ['Smoky', 'Medicinal', 'Burnt', 'Tar'] },
    { id: 'cereal', name: 'Cereal', color: '#f2a22a', subs: ['Dry cereal', 'Wet cereal', 'Malty', 'Yeasty'] },
    { id: 'woody', name: 'Woody', color: '#8a2f44', subs: ['Oaky', 'Coconut', 'Nutty', 'Vanilla'] },
    { id: 'feinty', name: 'Feinty', color: '#1f6fb5', subs: ['Leathery', 'Tobacco', 'Sweaty', 'Plastic'] },
    { id: 'spicy', name: 'Spicy', color: '#f06a1e', subs: ['Dried spices', 'Peppery', 'Ginger', 'Sherried'] },
    { id: 'sulphury', name: 'Sulphury', color: '#7aa23a', subs: ['Cooked vegetables', 'Meaty', 'Struck match', 'Rubbery'] }
  ];

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
  var today = function () { return new Date().toISOString().slice(0, 10); };

  /* ---------- Storage ---------- */
  var db = null;
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('mywhisky', 1);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains('whiskies')) d.createObjectStore('whiskies', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('distilleries')) d.createObjectStore('distilleries', { keyPath: 'id' });
      };
      req.onsuccess = function () { db = req.result; resolve(); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function store(name, mode) { return db.transaction(name, mode).objectStore(name); }
  function getAll(name) {
    return new Promise(function (resolve, reject) {
      var r = store(name, 'readonly').getAll();
      r.onsuccess = function () { resolve(r.result || []); };
      r.onerror = function () { reject(r.error); };
    });
  }
  function put(name, obj) {
    return new Promise(function (resolve, reject) {
      var r = store(name, 'readwrite').put(obj);
      r.onsuccess = function () { resolve(); };
      r.onerror = function () { reject(r.error); };
    });
  }
  function del(name, id) {
    return new Promise(function (resolve, reject) {
      var r = store(name, 'readwrite').delete(id);
      r.onsuccess = function () { resolve(); };
      r.onerror = function () { reject(r.error); };
    });
  }

  /* ---------- State ---------- */
  var state = {
    view: 'home', param: null,
    whiskies: [], custom: [], dists: [], distMap: {},
    country: 'Scotland', homeCountry: 'All', exploreQ: '', sort: 'recent',
    draft: null, notice: ''
  };

  function buildDists() {
    var list = window.DIST_RAW.map(function (r) {
      return { id: slug(r[0]), name: r[0], country: r[1], region: r[2], founded: r[3], custom: false };
    });
    state.custom.forEach(function (c) { if (!list.some(function (d) { return d.id === c.id; })) list.push(c); });
    state.dists = list;
    state.distMap = {};
    list.forEach(function (d) { state.distMap[d.id] = d; });
    state.bottles = [];
    state.bottleMap = {};
    Object.keys(window.BOTTLINGS).forEach(function (dn) {
      var did = slug(dn);
      if (!state.distMap[did]) return;
      window.BOTTLINGS[dn].forEach(function (nm) {
        var m = /(\d+) Year Old/.exec(nm);
        var b = { id: slug(dn + ' ' + nm), distId: did, name: nm, age: m ? m[1] : '', full: dn + ' ' + nm };
        state.bottles.push(b);
        state.bottleMap[b.id] = b;
      });
    });
  }

  function loadAll() {
    return Promise.all([getAll('whiskies'), getAll('distilleries')]).then(function (res) {
      state.whiskies = res[0];
      state.custom = res[1];
      buildDists();
    });
  }

  function whiskyKey(w) { return (w.distId + '|' + w.name + '|' + (w.age || '')).toLowerCase(); }
  function distCount(distId) {
    var seen = {};
    state.whiskies.forEach(function (w) { if (w.distId === distId) seen[whiskyKey(w)] = 1; });
    return Object.keys(seen).length;
  }
  function distState(distId) {
    var n = distCount(distId);
    return n >= MASTER ? 'full' : n > 0 ? 'partial' : 'locked';
  }
  function regionStats(region, country) {
    var ds = state.dists.filter(function (d) { return d.region === region && d.country === country; });
    var tried = ds.filter(function (d) { return distCount(d.id) > 0; }).length;
    var mastered = ds.filter(function (d) { return distCount(d.id) >= MASTER; }).length;
    return { total: ds.length, tried: tried, mastered: mastered, unlocked: tried >= Math.min(REGION_MIN, ds.length) };
  }
  function color(d) { return window.REGION_COLORS[d.region] || window.REGION_COLORS[d.country] || window.REGION_COLORS.Other; }
  function fullName(w) {
    var d = state.distMap[w.distId];
    return (d ? d.name : 'Unknown') + ' ' + w.name;
  }

  /* ---------- Search helpers ---------- */
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function hit(n, hay) {
    return n.split(' ').every(function (t) { return hay.indexOf(t) >= 0; });
  }
  function matchDists(q, limit) {
    var n = norm(q);
    if (!n) return [];
    var out = [];
    state.dists.forEach(function (d) {
      var nm = norm(d.name), score;
      if (hit(n, nm)) score = nm.indexOf(n) === 0 ? 0 : (' ' + nm).indexOf(' ' + n) >= 0 ? 1 : 2;
      else if (hit(n, nm + ' ' + norm(d.region) + ' ' + norm(d.country))) score = 3;
      else return;
      out.push({ d: d, s: score });
    });
    out.sort(function (a, b) { return a.s - b.s || a.d.name.localeCompare(b.d.name); });
    return out.slice(0, limit || 8).map(function (o) { return o.d; });
  }
  function matchBottles(q, distId, limit) {
    var n = norm(q);
    var pool = distId ? state.bottles.filter(function (b) { return b.distId === distId; }) : state.bottles;
    if (!n) return distId ? pool.slice(0, limit || 12) : [];
    if (!distId && n.length < 2) return [];
    var out = [];
    pool.forEach(function (b) {
      var hay = norm(b.full);
      if (!hit(n, hay)) return;
      var nm = norm(b.name);
      out.push({ b: b, s: nm.indexOf(n) === 0 ? 0 : hay.indexOf(n) === 0 ? 1 : 2 });
    });
    out.sort(function (a, b) { return a.s - b.s; });
    return out.slice(0, limit || 12).map(function (o) { return o.b; });
  }
  function findRecord(distId, name) {
    var n = norm(name);
    return state.whiskies.filter(function (w) { return w.distId === distId && norm(w.name) === n; })[0] || null;
  }

  /* ---------- Components ---------- */
  function tileHtml(d) {
    var st = distState(d.id), n = distCount(d.id), pips = '';
    for (var i = 0; i < MASTER; i++) pips += '<i class="pip' + (i < n ? ' f' : '') + '"></i>';
    var style = st === 'full' ? ' style="background:linear-gradient(145deg,' + color(d) + ',' + color(d) + 'bb)"' : '';
    return '<button class="tile ' + st + '" data-act="dist" data-id="' + d.id + '"' + style + '>' +
      '<div class="nm">' + esc(d.name) + '</div><div class="rg">' + esc(d.region) + '</div>' +
      '<div class="pips">' + pips + '</div></button>';
  }

  function radarSvg(taste, size) {
    size = size || 260;
    var c = size / 2, R = size * 0.34, n = FAMILIES.length, out = '';
    function pt(i, v) {
      var a = -Math.PI / 2 + (i + 0.5) * (2 * Math.PI / n);
      return [c + Math.cos(a) * R * v / 10, c + Math.sin(a) * R * v / 10];
    }
    [2, 4, 6, 8, 10].forEach(function (ring) {
      var pts = FAMILIES.map(function (f, i) { return pt(i, ring).join(','); }).join(' ');
      out += '<polygon points="' + pts + '" fill="none" stroke="#3a2e22" stroke-width="1"/>';
    });
    FAMILIES.forEach(function (f, i) {
      var p = pt(i, 10), l = pt(i, 12.8);
      out += '<line x1="' + c + '" y1="' + c + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#3a2e22"/>';
      out += '<text x="' + l[0] + '" y="' + l[1] + '" fill="' + f.color + '" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">' + f.name + '</text>';
    });
    var poly = FAMILIES.map(function (f, i) { return pt(i, Math.max(0.3, (taste && taste[f.id]) || 0)).join(','); }).join(' ');
    out += '<polygon points="' + poly + '" fill="rgba(217,149,43,.35)" stroke="#d9952b" stroke-width="2" stroke-linejoin="round"/>';
    FAMILIES.forEach(function (f, i) {
      var v = (taste && taste[f.id]) || 0;
      if (v > 0) { var p = pt(i, v); out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="' + f.color + '"/>'; }
    });
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="Taste chart">' + out + '</svg>';
  }

  /* ---------- Views ---------- */
  function statsHtml() {
    var tried = state.dists.filter(function (d) { return distCount(d.id) > 0; }).length;
    var countries = {};
    state.whiskies.forEach(function (w) { var d = state.distMap[w.distId]; if (d) countries[d.country] = 1; });
    return '<div class="stats"><div class="stat"><b>' + state.whiskies.length + '</b><span>whiskies</span></div>' +
      '<div class="stat"><b>' + tried + '/' + state.dists.length + '</b><span>distilleries</span></div>' +
      '<div class="stat"><b>' + Object.keys(countries).length + '</b><span>countries</span></div></div>';
  }

  function viewHome() {
    if (!state.whiskies.length) {
      var preview = state.dists.filter(function (d) { return d.country === 'Scotland'; }).slice(0, 12).map(tileHtml).join('');
      return '<div class="hero"><div class="big">🔒</div><h1>My Whisky</h1>' +
        '<p class="muted">Your collection is locked. Photograph the bottle or label of the first whisky you taste to unlock it.</p>' +
        '<button class="btn" data-go="add">Unlock your first whisky</button></div>' +
        '<h2>Waiting to be unlocked</h2><div class="grid">' + preview + '</div>' +
        '<p class="muted small" style="margin-top:12px">Open the Explore tab to see every distillery.</p>';
    }
    var countries = ['All'];
    state.whiskies.forEach(function (w) {
      var d = state.distMap[w.distId];
      if (d && countries.indexOf(d.country) < 0) countries.push(d.country);
    });
    var list = state.whiskies.filter(function (w) {
      var d = state.distMap[w.distId];
      return state.homeCountry === 'All' || (d && d.country === state.homeCountry);
    });
    list.sort(function (a, b) {
      if (state.sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (state.sort === 'name') return fullName(a).localeCompare(fullName(b));
      return (b.date || '').localeCompare(a.date || '') || (b.created || 0) - (a.created || 0);
    });
    var chips = countries.map(function (c) {
      return '<button class="chip' + (state.homeCountry === c ? ' on' : '') + '" data-act="hc" data-v="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
    var sorts = [['recent', 'Recent'], ['rating', 'Top rated'], ['name', 'A–Z']].map(function (s) {
      return '<button class="chip' + (state.sort === s[0] ? ' on' : '') + '" data-act="sort" data-v="' + s[0] + '">' + s[1] + '</button>';
    }).join('');
    var cards = list.map(function (w) {
      var thumb = w.photo ? ' style="background-image:url(' + w.photo + ')"' : '';
      return '<button class="card" data-act="open" data-id="' + w.id + '"><div class="thumb"' + thumb + '>' + (w.photo ? '' : '🥃') + '</div>' +
        '<div><div class="t">' + esc(fullName(w)) + '</div><div class="muted small">' +
        esc((state.distMap[w.distId] || {}).region || '') + (w.date ? ' · ' + esc(w.date) : '') + '</div></div>' +
        '<div class="score">' + esc(w.rating || '–') + '<small>/10</small></div></button>';
    }).join('');
    return '<h1>My Collection</h1>' + statsHtml() +
      '<div class="chips">' + chips + '</div><div class="chips">' + sorts + '</div>' +
      '<div class="cards">' + (cards || '<div class="empty">Nothing here yet.</div>') + '</div>';
  }

  function whiskyCard(w) {
    var thumb = w.photo ? ' style="background-image:url(' + w.photo + ')"' : '';
    var d = state.distMap[w.distId] || {};
    return '<button class="card" data-act="open" data-id="' + w.id + '"><div class="thumb"' + thumb + '>' + (w.photo ? '' : '🥃') + '</div>' +
      '<div><div class="t">' + esc(fullName(w)) + '</div><div class="muted small">' + esc(d.region || '') + '</div></div>' +
      '<div class="score">' + esc(w.rating || '–') + '<small>/10</small></div></button>';
  }
  function lockedCard(b) {
    var d = state.distMap[b.distId] || {};
    return '<button class="card locked" data-act="addbottle" data-id="' + b.id + '"><div class="thumb">🔒</div>' +
      '<div><div class="t">' + esc(b.full) + '</div><div class="muted small">' + esc(d.region || '') + ' · tap to unlock</div></div></button>';
  }

  function searchResults(q) {
    var n = norm(q);
    var ds = matchDists(q, 12);
    var have = state.whiskies.filter(function (w) {
      var d = state.distMap[w.distId];
      return hit(n, norm((d ? d.name : '') + ' ' + w.name));
    });
    var todo = matchBottles(q, '', 40).filter(function (b) { return !findRecord(b.distId, b.name); });
    var html = '';
    if (ds.length) html += '<h2>Distilleries</h2><div class="grid">' + ds.map(tileHtml).join('') + '</div>';
    if (have.length) html += '<h2>Collected</h2><div class="cards">' + have.map(whiskyCard).join('') + '</div>';
    if (todo.length) html += '<h2>Still to find</h2><div class="cards">' + todo.map(lockedCard).join('') + '</div>';
    if (!html) html = '<div class="empty">Nothing matches “' + esc(q) + '”.<br>Try a distillery, a region or part of a whisky name.</div>';
    return html;
  }

  function exploreBody() {
    var q = (state.exploreQ || '').trim();
    if (q) return searchResults(q);
    var countries = [];
    state.dists.forEach(function (d) { if (countries.indexOf(d.country) < 0) countries.push(d.country); });
    var chips = countries.map(function (c) {
      var ds = state.dists.filter(function (d) { return d.country === c; });
      var tried = ds.filter(function (d) { return distCount(d.id) > 0; }).length;
      return '<button class="chip' + (state.country === c ? ' on' : '') + '" data-act="country" data-v="' + esc(c) + '">' + esc(c) + ' ' + tried + '/' + ds.length + '</button>';
    }).join('');
    var regions = [];
    state.dists.filter(function (d) { return d.country === state.country; }).forEach(function (d) {
      if (regions.indexOf(d.region) < 0) regions.push(d.region);
    });
    var html = '<p class="muted small">Grey = not yet tried. A dot fills for each whisky you collect; collect ' + MASTER + ' from one distillery and it turns full colour.</p>' +
      '<div class="chips">' + chips + '</div>';
    regions.forEach(function (r) {
      var rs = regionStats(r, state.country);
      var ds = state.dists.filter(function (d) { return d.country === state.country && d.region === r; });
      var col = window.REGION_COLORS[r] || window.REGION_COLORS.Other;
      var pct = rs.total ? Math.round(rs.tried / rs.total * 100) : 0;
      var title = rs.unlocked ? '<span style="color:' + col + '">' + esc(r) + '</span>' : '<span class="muted">' + esc(r) + '</span>';
      html += '<div class="sec-head"><h2>' + title + (rs.unlocked ? ' ✦' : '') + '</h2><span class="muted small">' + rs.tried + '/' + rs.total + ' tried · ' + rs.mastered + ' mastered</span></div>' +
        '<div class="bar"><i style="width:' + pct + '%;' + (rs.unlocked ? 'background:' + col : '') + '"></i></div>' +
        '<div class="grid">' + ds.map(tileHtml).join('') + '</div>';
    });
    return html;
  }

  function viewExplore() {
    return '<h1>Explore</h1>' +
      '<input type="search" id="exSearch" class="search" placeholder="Search distilleries, regions or whiskies" autocomplete="off" autocorrect="off" autocapitalize="off" value="' + esc(state.exploreQ) + '">' +
      '<div id="exBody">' + exploreBody() + '</div>';
  }

  function viewDist(id) {
    var d = state.distMap[id];
    if (!d) return '<p>Not found.</p>';
    var ws = state.whiskies.filter(function (w) { return w.distId === id; });
    var cards = ws.map(function (w) {
      var thumb = w.photo ? ' style="background-image:url(' + w.photo + ')"' : '';
      return '<button class="card" data-act="open" data-id="' + w.id + '"><div class="thumb"' + thumb + '>' + (w.photo ? '' : '🥃') + '</div>' +
        '<div><div class="t">' + esc(w.name) + '</div></div><div class="score">' + esc(w.rating || '–') + '<small>/10</small></div></button>';
    }).join('');
    var todo = state.bottles.filter(function (b) { return b.distId === id && !findRecord(id, b.name); });
    var locked = todo.map(function (b) {
      return '<button class="card locked" data-act="addbottle" data-id="' + b.id + '"><div class="thumb">🔒</div>' +
        '<div><div class="t">' + esc(b.name) + '</div><div class="muted small">Tap to unlock</div></div></button>';
    }).join('');
    var n = distCount(id);
    return '<button class="back" data-go="explore">‹ Explore</button><h1>' + esc(d.name) + '</h1>' +
      '<div class="facts"><div><span>Region</span><span>' + esc(d.region) + (d.country !== d.region ? ', ' + esc(d.country) : '') + '</span></div>' +
      (d.founded ? '<div><span>Founded</span><span>' + esc(d.founded) + '</span></div>' : '') +
      '<div><span>Collected</span><span>' + n + ' / ' + MASTER + (n >= MASTER ? ' ★ mastered' : '') + '</span></div></div>' +
      (cards ? '<h2>Collected</h2><div class="cards">' + cards + '</div>' : '') +
      (locked ? '<h2>Still to find</h2><div class="cards">' + locked + '</div>' : '') +
      '<button class="btn block" style="margin-top:14px" data-act="addfor" data-id="' + id + '">Add another whisky from ' + esc(d.name) + '</button>';
  }

  function viewDetail(id) {
    var w = state.whiskies.filter(function (x) { return x.id === id; })[0];
    if (!w) return '<p>Not found.</p>';
    var d = state.distMap[w.distId] || {};
    return '<button class="back" data-go="home">‹ Collection</button>' +
      (w.photo ? '<img class="hero-img" src="' + w.photo + '" alt="">' : '') +
      '<h1 style="margin-top:12px">' + esc(fullName(w)) + '</h1>' +
      '<div class="row"><div class="rating-val" style="font-size:34px">' + esc(w.rating || '–') + '<span class="muted small"> /10</span></div></div>' +
      '<div class="radar-wrap">' + radarSvg(w.taste, 280) + '</div>' +
      '<div class="facts">' +
      '<div><span>Distillery</span><span>' + esc(d.name || '–') + '</span></div>' +
      '<div><span>Region</span><span>' + esc(d.region || '–') + (d.country && d.country !== d.region ? ', ' + esc(d.country) : '') + '</span></div>' +
      '<div><span>Distillery founded</span><span>' + esc(d.founded || '–') + '</span></div>' +
      (w.age ? '<div><span>Age</span><span>' + esc(w.age) + ' years</span></div>' : '') +
      (w.abv ? '<div><span>ABV</span><span>' + esc(w.abv) + '%</span></div>' : '') +
      (w.date ? '<div><span>Tried</span><span>' + esc(w.date) + '</span></div>' : '') +
      (w.where ? '<div><span>Where</span><span>' + esc(w.where) + '</span></div>' : '') +
      '</div>' +
      (w.notes ? '<h3>Notes &amp; awards</h3><p>' + esc(w.notes).replace(/\n/g, '<br>') + '</p>' : '') +
      '<div class="row" style="margin-top:16px"><button class="btn ghost" data-act="edit" data-id="' + w.id + '">Edit</button>' +
      '<button class="btn danger" data-act="delete" data-id="' + w.id + '">Delete</button></div>';
  }

  function newDraft(distId) {
    var taste = {};
    FAMILIES.forEach(function (f) { taste[f.id] = 0; });
    return { id: null, distId: distId || '', distName: distId && state.distMap[distId] ? state.distMap[distId].name : '', name: '', age: '', abv: '', where: '', date: today(), rating: 7, taste: taste, step: 0, addNew: false, notes: '', photo: '' };
  }

  function viewAdd() {
    var dr = state.draft || (state.draft = newDraft());
    var countryOpts = ['Scotland', 'Japan', 'Ireland', 'Wales', 'England', 'USA', 'India', 'Taiwan', 'Australia', 'Sweden', 'Other'].map(function (c) { return '<option>' + c + '</option>'; }).join('');
    return '<h1>' + (dr.id ? 'Edit whisky' : 'Unlock a whisky') + '</h1>' +
      '<label class="photo-pick' + (dr.photo ? ' has' : '') + '" id="photoBox"' + (dr.photo ? ' style="background-image:url(' + dr.photo + ')"' : '') + '>' +
      '<span id="photoHint">' + (dr.photo ? '' : '📷 Tap to photograph the bottle or label') + '</span>' +
      '<input type="file" id="photoIn" accept="image/*" hidden></label>' +
      '<label class="f">Distillery</label><input type="text" id="fDist" autocomplete="off" autocorrect="off" placeholder="Start typing, e.g. Lagav or Islay" value="' + esc(dr.distName) + '">' +
      '<div class="sug" id="distSug" hidden></div>' +
      '<div id="newDist"' + (dr.addNew && !dr.distId ? '' : ' hidden') + '><div class="toast warn small">Adding a new distillery. Fill these in (optional) and it joins your list.</div>' +
      '<div class="row"><select id="nCountry">' + countryOpts + '</select>' +
      '<input type="text" id="nRegion" placeholder="Region (optional)"><input type="number" id="nFounded" placeholder="Founded"></div></div>' +
      '<label class="f">Whisky (single malt)</label><input type="text" id="fName" autocomplete="off" autocorrect="off" placeholder="Search or type, e.g. 12 Year Old" value="' + esc(dr.name) + '">' +
      '<div class="sug" id="nameSug" hidden></div>' +
      '<div class="row"><div style="flex:1"><label class="f">Age (years)</label><input type="number" id="fAge" inputmode="numeric" value="' + esc(dr.age) + '"></div>' +
      '<div style="flex:1"><label class="f">ABV %</label><input type="number" id="fAbv" inputmode="decimal" step="0.1" value="' + esc(dr.abv) + '"></div></div>' +
      '<div class="row"><div style="flex:1"><label class="f">Date tried</label><input type="date" id="fDate" value="' + esc(dr.date) + '"></div>' +
      '<div style="flex:1"><label class="f">Where</label><input type="text" id="fWhere" placeholder="Pub, bar, bought…" value="' + esc(dr.where) + '"></div></div>' +
      '<label class="f">Your rating</label><div class="rating-val" id="rv">' + dr.rating + '<span class="muted small"> /10</span></div>' +
      '<input type="range" id="fRating" min="1" max="10" step="1" value="' + dr.rating + '">' +
      '<h2>Taste chart</h2><p class="muted small">Rate each of the 8 flavour families from 1 to 10, one at a time.</p>' +
      '<div id="tasteBox">' + tasteHtml() + '</div>' +
      '<label class="f">Notes &amp; awards (optional)</label><textarea id="fNotes" placeholder="Anything worth remembering…">' + esc(dr.notes) + '</textarea>' +
      '<button class="btn block sticky-save" id="saveBtn" data-act="save">' + (dr.id ? 'Save changes' : 'Unlock it') + '</button>' +
      (dr.id ? '<button class="btn ghost block" style="margin-top:10px" data-act="cancel">Cancel</button>' : '');
  }

  function viewBackup() {
    return '<h1>Backup</h1><p class="muted">Your collection lives only on this phone. Export a backup file now and then, and before you switch phones.</p>' +
      '<button class="btn block" data-act="export">Export backup</button>' +
      '<p class="muted small" style="margin-top:8px">On iPhone, choose “Save to Files” and pick iCloud Drive.</p>' +
      '<h2>Restore</h2><p class="muted">Importing merges a backup into the app. Entries with the same id are updated, nothing is deleted.</p>' +
      '<label class="btn ghost block" style="text-align:center">Import backup<input type="file" id="importIn" accept=".json,application/json" hidden></label>' +
      '<div id="backupMsg">' + (state.notice ? '<div class="toast">' + esc(state.notice) + '</div>' : '') + '</div>' +
      '<h2>About</h2><p class="muted small">My Whisky v1 · ' + state.whiskies.length + ' whiskies saved · works offline once opened from the Home Screen.<br>© 2026 My Whisky. All rights reserved.</p>';
  }

  /* ---------- Rendering ---------- */
  function render() {
    var v = $('#view');
    var html = '';
    if (state.view === 'home') html = viewHome();
    else if (state.view === 'explore') html = viewExplore();
    else if (state.view === 'add') html = viewAdd();
    else if (state.view === 'detail') html = viewDetail(state.param);
    else if (state.view === 'dist') html = viewDist(state.param);
    else if (state.view === 'backup') html = viewBackup();
    v.innerHTML = html;
    var tab = { home: 'home', detail: 'home', explore: 'explore', dist: 'explore', add: 'add', backup: 'backup' }[state.view];
    $$('#tabs button').forEach(function (b) { b.classList.toggle('on', b.id === 'tab-' + tab); });
    if (state.view === 'add') wireAdd();
    if (state.view === 'explore') wireExplore();
    if (state.view === 'backup') wireBackup();
    window.scrollTo(0, 0);
  }

  function go(view, param) {
    // Leaving an edit half-way and tapping Add should start a fresh entry, not resume the edit.
    if (view === 'add' && state.draft && state.draft.id) state.draft = null;
    state.view = view;
    state.param = param || null;
    render();
  }

  /* ---------- Add / edit form ---------- */
  function findDist(name) {
    var n = (name || '').trim().toLowerCase();
    if (!n) return null;
    return state.dists.filter(function (d) { return d.name.toLowerCase() === n; })[0] || null;
  }

  /* ---------- Suggestion lists in the Add form ---------- */
  function distRow(d) {
    return '<button type="button" class="sug-row" data-act="pickdist" data-id="' + d.id + '"><span>' + esc(d.name) + '</span>' +
      '<small>' + esc(d.region) + (d.country !== d.region ? ' · ' + esc(d.country) : '') + '</small></button>';
  }
  function bottleRow(b, showDist) {
    var got = findRecord(b.distId, b.name);
    return '<button type="button" class="sug-row" data-act="pickbottle" data-id="' + b.id + '"><span>' + esc(showDist ? b.full : b.name) + (got ? ' ✓' : '') + '</span>' +
      '<small>' + (got ? 'collected' : '') + '</small></button>';
  }
  function renderDistSug() {
    var box = $('#distSug');
    if (!box) return;
    var q = $('#fDist').value.trim();
    if (!q || findDist(q)) { box.hidden = true; box.innerHTML = ''; return; }
    var html = matchDists(q, 8).map(distRow).join('');
    if (q.length >= 2) html += '<button type="button" class="sug-row add" data-act="newdist"><span>＋ Add “' + esc(q) + '” as a new distillery</span></button>';
    box.innerHTML = html;
    box.hidden = !html;
  }
  function renderNameSug() {
    var box = $('#nameSug');
    if (!box) return;
    var dr = state.draft, q = $('#fName').value.trim();
    var res = matchBottles(q, dr.distId, dr.distId ? 12 : 10);
    var exact = !!dr.distId && res.some(function (b) { return norm(b.name) === norm(q); });
    if (!res.length || exact) { box.hidden = true; box.innerHTML = ''; return; }
    box.innerHTML = res.map(function (b) { return bottleRow(b, !dr.distId); }).join('');
    box.hidden = false;
  }
  function pickDist(id) {
    var dr = state.draft, d = state.distMap[id];
    if (!d) return;
    dr.distId = id; dr.distName = d.name; dr.addNew = false;
    $('#fDist').value = d.name;
    $('#newDist').hidden = true;
    renderDistSug();
    var fn = $('#fName');
    fn.focus();
    renderNameSug();
  }
  function pickBottle(id) {
    var dr = state.draft, b = state.bottleMap[id];
    if (!b) return;
    var d = state.distMap[b.distId];
    dr.distId = b.distId; dr.distName = d ? d.name : ''; dr.addNew = false;
    dr.name = b.name; dr.age = b.age;
    $('#fDist').value = dr.distName;
    $('#fName').value = b.name;
    $('#fAge').value = b.age;
    $('#newDist').hidden = true;
    renderDistSug();
    renderNameSug();
  }
  function showNewDist() {
    state.draft.addNew = true;
    $('#newDist').hidden = false;
    $('#distSug').hidden = true;
  }

  /* ---------- Taste wizard ---------- */
  function tasteHtml() {
    var dr = state.draft, st = dr.step, total = FAMILIES.length;
    var dots = FAMILIES.map(function (f, i) {
      return '<button type="button" class="tdot' + (i === st ? ' cur' : '') + (dr.taste[f.id] ? ' set' : '') + '" data-act="tjump" data-v="' + i + '" style="--c:' + f.color + '" aria-label="' + f.name + '"></button>';
    }).join('');
    var body;
    if (st < total) {
      var f = FAMILIES[st], cur = dr.taste[f.id], nums = '';
      for (var n = 1; n <= 10; n++) {
        nums += '<button type="button" class="num' + (cur === n ? ' on' : '') + '" data-act="rate" data-v="' + n + '"' +
          (cur === n ? ' style="background:' + f.color + ';border-color:' + f.color + '"' : '') + '>' + n + '</button>';
      }
      body = '<div class="tstep"><div class="muted small">Flavour ' + (st + 1) + ' of ' + total + '</div>' +
        '<div class="tname" style="color:' + f.color + '">' + f.name + '</div>' +
        '<div class="subs">Contains flavours: ' + f.subs.join(', ') + '</div>' +
        '<div class="muted small">How strong is it? 1 = barely there, 10 = very strong</div></div>' +
        '<div class="numgrid">' + nums + '</div>' +
        '<div class="row"><button type="button" class="btn ghost" data-act="tback"' + (st === 0 ? ' disabled' : '') + '>‹ Back</button>' +
        '<button type="button" class="btn ghost" data-act="tnext" style="margin-left:auto">' + (cur ? 'Next ›' : 'Skip ›') + '</button></div>';
    } else {
      body = '<div class="tstep"><div class="tname">Taste chart complete ✓</div><div class="muted small">Tap any dot above to change a flavour.</div></div>';
    }
    return '<div class="radar-wrap">' + radarSvg(dr.taste, 260) + '</div><div class="tdots">' + dots + '</div>' + body;
  }

  function renderTaste() {
    var box = $('#tasteBox');
    if (box) box.innerHTML = tasteHtml();
  }

  function wireAdd() {
    var dr = state.draft;
    var fDist = $('#fDist'), fName = $('#fName');
    fDist.addEventListener('input', function () {
      dr.distName = fDist.value;
      var d = findDist(fDist.value);
      dr.distId = d ? d.id : '';
      if (d) dr.addNew = false;
      $('#newDist').hidden = !(dr.addNew && !d);
      renderDistSug();
      renderNameSug();
    });
    fDist.addEventListener('focus', function () { $('#nameSug').hidden = true; renderDistSug(); });
    fName.addEventListener('input', function () { dr.name = fName.value; renderNameSug(); });
    fName.addEventListener('focus', function () { $('#distSug').hidden = true; renderNameSug(); });
    $('#fAge').addEventListener('input', function (e) { dr.age = e.target.value; });
    $('#fAbv').addEventListener('input', function (e) { dr.abv = e.target.value; });
    $('#fDate').addEventListener('input', function (e) { dr.date = e.target.value; });
    $('#fWhere').addEventListener('input', function (e) { dr.where = e.target.value; });
    $('#fNotes').addEventListener('input', function (e) { dr.notes = e.target.value; });
    $('#fRating').addEventListener('input', function (e) {
      dr.rating = +e.target.value;
      $('#rv').innerHTML = dr.rating + '<span class="muted small"> /10</span>';
    });
    $('#photoIn').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      shrinkImage(file).then(function (url) {
        dr.photo = url;
        var box = $('#photoBox');
        box.style.backgroundImage = 'url(' + url + ')';
        box.classList.add('has');
        $('#photoHint').textContent = '';
      }).catch(function () { alert('Could not read that photo. Try another one.'); });
    });
  }

  function wireExplore() {
    var inp = $('#exSearch');
    if (!inp) return;
    inp.addEventListener('input', function () {
      state.exploreQ = inp.value;
      $('#exBody').innerHTML = exploreBody();
    });
  }

  function shrinkImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 900, s = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s);
        cv.height = Math.round(img.height * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  function saveDraft() {
    var dr = state.draft;
    var name = (dr.name || '').trim();
    var distName = (dr.distName || '').trim();
    if (!distName) { alert('Pick or type the distillery first.'); return Promise.resolve(); }
    if (!name) { alert('Add the whisky name, e.g. "12 Year Old".'); return Promise.resolve(); }

    var before = {};
    state.dists.forEach(function (d) { before[d.id] = distCount(d.id); });
    var regionBefore = {};

    var d = findDist(distName), p = Promise.resolve();
    if (!d && !dr.addNew) { alert('Pick the distillery from the suggestions, or tap "Add as a new distillery".'); return Promise.resolve(); }
    if (!d) {
      var region = ($('#nRegion').value || '').trim() || $('#nCountry').value;
      d = { id: slug(distName) || uid(), name: distName, country: $('#nCountry').value, region: region, founded: $('#nFounded').value || '', custom: true };
      if (state.distMap[d.id]) d.id = d.id + '-' + uid().slice(0, 4);
      p = put('distilleries', d);
    }
    var existing = dr.id ? state.whiskies.filter(function (w) { return w.id === dr.id; })[0] : null;
    var rec = {
      id: dr.id || uid(), distId: d.id, name: name, age: dr.age, abv: dr.abv, where: dr.where, date: dr.date,
      rating: dr.rating, taste: dr.taste, notes: dr.notes, photo: dr.photo,
      created: existing ? existing.created : Date.now(), updated: Date.now()
    };
    var isNew = !existing;
    return p.then(function () { return put('whiskies', rec); }).then(loadAll).then(function () {
      state.draft = null;
      if (isNew) showUnlock(rec, before[d.id] || 0, regionBefore);
      go('detail', rec.id);
    }).catch(function (err) { alert('Could not save: ' + err); });
  }

  function showUnlock(rec, beforeCount) {
    var d = state.distMap[rec.distId], now = distCount(d.id), rs = regionStats(d.region, d.country);
    var msgs = ['<b>' + esc(d.name) + '</b>: ' + Math.min(now, MASTER) + '/' + MASTER + ' collected'];
    if (beforeCount === 0) msgs.unshift('New distillery discovered!');
    if (beforeCount < MASTER && now >= MASTER) msgs.unshift('★ Distillery mastered!');
    if (rs.unlocked && rs.tried === Math.min(REGION_MIN, rs.total) && beforeCount === 0) msgs.push(esc(d.region) + ' region unlocked ✦');
    var col = color(d);
    var o = $('#overlay');
    o.innerHTML = '<div class="unlock"><div class="badge" style="background:linear-gradient(145deg,' + col + ',' + col + 'bb)">' + esc(d.name) + '</div>' +
      '<h2>Unlocked!</h2><p>' + esc(fullName(rec)) + '</p><p class="muted small">' + msgs.join('<br>') + '</p>' +
      '<button class="btn" id="closeUnlock">Nice</button></div>';
    o.hidden = false;
    $('#closeUnlock').onclick = function () { o.hidden = true; o.innerHTML = ''; };
  }

  /* ---------- Backup ---------- */
  function exportBackup() {
    var data = { app: 'mywhisky', version: 1, exported: new Date().toISOString(), whiskies: state.whiskies, distilleries: state.custom };
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    var fname = 'my-whisky-backup-' + today() + '.json';
    var file;
    try { file = new File([blob], fname, { type: 'application/json' }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'My Whisky backup' }).catch(function () {});
      return;
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function wireBackup() {
    $('#importIn').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var data = JSON.parse(fr.result);
          if (data.app !== 'mywhisky') throw new Error('This is not a My Whisky backup.');
          var ops = [];
          (data.distilleries || []).forEach(function (d) { ops.push(put('distilleries', d)); });
          (data.whiskies || []).forEach(function (w) {
            var cur = state.whiskies.filter(function (x) { return x.id === w.id; })[0];
            if (!cur || (w.updated || 0) >= (cur.updated || 0)) ops.push(put('whiskies', w));
          });
          Promise.all(ops).then(loadAll).then(function () {
            state.notice = 'Imported ' + (data.whiskies || []).length + ' whiskies.';
            render();
          });
        } catch (err) {
          state.notice = 'Import failed: ' + err.message;
          render();
        }
      };
      fr.readAsText(file);
    });
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go],[data-act]');
    if (!t) return;
    var goTo = t.getAttribute('data-go');
    if (goTo) {
      if (goTo === 'add' && state.view === 'add') return;
      state.notice = '';
      go(goTo);
      return;
    }
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id'), v = t.getAttribute('data-v');
    if (act === 'dist') { state.view = 'dist'; state.param = id; render(); }
    else if (act === 'open') { state.view = 'detail'; state.param = id; render(); }
    else if (act === 'country') { state.country = v; render(); }
    else if (act === 'hc') { state.homeCountry = v; render(); }
    else if (act === 'sort') { state.sort = v; render(); }
    else if (act === 'addfor') { state.draft = newDraft(id); state.view = 'add'; state.param = null; render(); }
    else if (act === 'pickdist') pickDist(id);
    else if (act === 'pickbottle') pickBottle(id);
    else if (act === 'newdist') showNewDist();
    else if (act === 'addbottle') {
      var bt = state.bottleMap[id];
      if (bt) { state.draft = newDraft(bt.distId); state.draft.name = bt.name; state.draft.age = bt.age; state.view = 'add'; state.param = null; render(); }
    }
    else if (act === 'rate') {
      var dr = state.draft;
      if (dr.step < FAMILIES.length) {
        dr.taste[FAMILIES[dr.step].id] = +v;
        var shown = dr.step;
        renderTaste();
        setTimeout(function () {
          if (state.draft === dr && dr.step === shown) { dr.step = Math.min(shown + 1, FAMILIES.length); renderTaste(); }
        }, 220);
      }
    }
    else if (act === 'tnext') { state.draft.step = Math.min(state.draft.step + 1, FAMILIES.length); renderTaste(); }
    else if (act === 'tback') { state.draft.step = Math.max(state.draft.step - 1, 0); renderTaste(); }
    else if (act === 'tjump') { state.draft.step = +v; renderTaste(); }
    else if (act === 'save') saveDraft();
    else if (act === 'cancel') { var wid = state.draft && state.draft.id; state.draft = null; if (wid) { state.view = 'detail'; state.param = wid; } else state.view = 'home'; render(); }
    else if (act === 'export') exportBackup();
    else if (act === 'edit') {
      var w = state.whiskies.filter(function (x) { return x.id === id; })[0];
      var d = state.distMap[w.distId];
      state.draft = JSON.parse(JSON.stringify(w));
      state.draft.distName = d ? d.name : '';
      state.draft.taste = state.draft.taste || {};
      FAMILIES.forEach(function (f) { if (typeof state.draft.taste[f.id] !== 'number') state.draft.taste[f.id] = 0; });
      delete state.draft.subs;
      var firstOpen = FAMILIES.findIndex(function (f) { return !state.draft.taste[f.id]; });
      state.draft.step = firstOpen < 0 ? FAMILIES.length : firstOpen;
      state.draft.photo = state.draft.photo || '';
      state.view = 'add'; state.param = null; render();
    }
    else if (act === 'delete') {
      if (confirm('Delete this whisky from your collection?')) {
        del('whiskies', id).then(loadAll).then(function () { go('home'); });
      }
    }
  });

  /* ---------- Start ---------- */
  function start() {
    openDb().then(loadAll).then(function () {
      render();
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    }).catch(function (err) {
      $('#view').innerHTML = '<h1>My Whisky</h1><div class="toast warn">Storage is not available in this browser mode (' + esc(err && err.message) + '). Private tabs can block it; open the app normally or from the Home Screen.</div>';
    });
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
    }
  }

  window.__mywhisky = { state: state, go: go, saveDraft: saveDraft, distCount: distCount, regionStats: regionStats, newDraft: newDraft, render: render };
  start();
})();
