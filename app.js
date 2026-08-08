/* property-compare — app.js
 * State, rendering, persistence, radar chart, import/export.
 * Depends on engine.js (window.Engine), loaded first.
 */

(function () {
  "use strict";

  var MAX_PROPS = 4;
  var LS_KEY = "property-compare-v1";

  var PROPERTY_COLORS = ["#d4af37", "#58a6ff", "#3fb950", "#f778ba"];

  var AMENITIES = [
    "Pool", "Gym", "Covered parking", "Beach access",
    "Metro nearby", "Kids play area", "Concierge", "Balcony / terrace"
  ];

  var TYPES = ["Apartment", "Penthouse", "Duplex", "Villa", "Townhouse", "Studio"];

  var COMMUTES = [
    { key: "commuteMarina", label: "Marina" },
    { key: "commuteDowntown", label: "Downtown" },
    { key: "commuteDIFC", label: "DIFC" }
  ];

  var WEIGHT_DEFS = [
    { key: "price", label: "Price" },
    { key: "yield", label: "Yield" },
    { key: "location", label: "Location" },
    { key: "size", label: "Size" },
    { key: "amenities", label: "Amenities" }
  ];

  var RADAR_AXES = ["Price", "Yield", "Location", "Size", "Amenities"];

  var DEFAULT_WEIGHTS = { price: 25, yield: 25, location: 20, size: 15, amenities: 15 };

  /* ---------- seed data: three realistic Dubai listings ---------- */

  function seedProperties() {
    return [
      {
        id: 1,
        name: "Marina Gate 2BR",
        community: "Dubai Marina",
        type: "Apartment",
        price: 2150000,
        size: 1150,
        beds: 2,
        baths: 3,
        serviceCharge: 18,
        rent: 140000,
        status: "ready",
        handover: "Ready (2020)",
        developer: "Select Group",
        commuteMarina: 5,
        commuteDowntown: 20,
        commuteDIFC: 18,
        amenities: ["Pool", "Gym", "Covered parking", "Concierge", "Balcony / terrace"]
      },
      {
        id: 2,
        name: "Boulevard Point 1BR",
        community: "Downtown Dubai",
        type: "Apartment",
        price: 1680000,
        size: 780,
        beds: 1,
        baths: 2,
        serviceCharge: 24,
        rent: 115000,
        status: "ready",
        handover: "Ready (2021)",
        developer: "Emaar",
        commuteMarina: 22,
        commuteDowntown: 3,
        commuteDIFC: 8,
        amenities: ["Pool", "Gym", "Covered parking", "Metro nearby", "Concierge"]
      },
      {
        id: 3,
        name: "Sobha Hartland Waves 2BR",
        community: "MBR City",
        type: "Apartment",
        price: 1450000,
        size: 1050,
        beds: 2,
        baths: 2,
        serviceCharge: 14,
        rent: 95000,
        status: "offplan",
        handover: "Q2 2027",
        developer: "Sobha Realty",
        commuteMarina: 20,
        commuteDowntown: 14,
        commuteDIFC: 12,
        amenities: ["Pool", "Gym", "Covered parking", "Kids play area", "Balcony / terrace"]
      }
    ];
  }

  /* ---------- state ---------- */

  var state = loadState();

  function defaultState() {
    return { properties: seedProperties(), weights: clone(DEFAULT_WEIGHTS), nextId: 4 };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.properties) || !s.weights) return defaultState();
      // Ensure every property has all expected fields (tolerates older saves).
      s.properties = s.properties.slice(0, MAX_PROPS).map(normalizeProperty);
      s.weights = Object.assign(clone(DEFAULT_WEIGHTS), s.weights);
      s.nextId = s.properties.reduce(function (m, p) { return Math.max(m, p.id + 1); }, 1);
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  function blankProperty(id) {
    return {
      id: id,
      name: "New property",
      community: "",
      type: "Apartment",
      price: 0,
      size: 0,
      beds: 1,
      baths: 1,
      serviceCharge: 0,
      rent: 0,
      status: "ready",
      handover: "",
      developer: "",
      commuteMarina: 15,
      commuteDowntown: 15,
      commuteDIFC: 15,
      amenities: []
    };
  }

  function normalizeProperty(p) {
    var b = blankProperty(p.id || 0);
    var out = Object.assign(b, p);
    if (!Array.isArray(out.amenities)) out.amenities = [];
    ["price", "size", "beds", "baths", "serviceCharge", "rent",
     "commuteMarina", "commuteDowntown", "commuteDIFC"].forEach(function (k) {
      out[k] = Number(out[k]) || 0;
    });
    return out;
  }

  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* quota / private mode */ }
  }

  /* ---------- DOM helpers ---------- */

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function $(id) { return document.getElementById(id); }

  /* ---------- rendering: property cards ---------- */

  function renderCards(scored) {
    var wrap = $("cards");
    wrap.innerHTML = "";

    state.properties.forEach(function (p, idx) {
      var card = el("div", "card c" + (idx + 1));

      // header: color dot, editable name, remove button
      var head = el("div", "card-head");
      head.appendChild(el("span", "card-dot"));
      var nameInput = el("input", "card-title-input");
      nameInput.type = "text";
      nameInput.value = p.name;
      nameInput.dataset.prop = p.id;
      nameInput.dataset.field = "name";
      head.appendChild(nameInput);
      var rm = el("button", "card-remove", "×");
      rm.title = "Remove property";
      rm.dataset.remove = p.id;
      head.appendChild(rm);
      card.appendChild(head);

      // text / select / number fields
      card.appendChild(textField("Community", p.id, "community", p.community));
      card.appendChild(selectField("Type", p.id, "type", p.type, TYPES));

      var row1 = el("div", "field-row");
      row1.appendChild(numField("Price (AED)", p.id, "price", p.price, 0));
      row1.appendChild(numField("Size (sqft)", p.id, "size", p.size, 0));
      card.appendChild(row1);

      var row2 = el("div", "field-row");
      row2.appendChild(numField("Beds", p.id, "beds", p.beds, 0));
      row2.appendChild(numField("Baths", p.id, "baths", p.baths, 0));
      card.appendChild(row2);

      var row3 = el("div", "field-row");
      row3.appendChild(numField("Service chg AED/sqft", p.id, "serviceCharge", p.serviceCharge, 0));
      row3.appendChild(numField("Rent AED/yr", p.id, "rent", p.rent, 0));
      card.appendChild(row3);

      var row4 = el("div", "field-row");
      row4.appendChild(selectField("Status", p.id, "status", p.status,
        [["ready", "Ready"], ["offplan", "Off-plan"]]));
      row4.appendChild(textField("Handover", p.id, "handover", p.handover));
      card.appendChild(row4);

      card.appendChild(textField("Developer", p.id, "developer", p.developer));

      // commute sliders
      var comm = el("div", "commute");
      comm.appendChild(el("div", "commute-title", "Commute (minutes)"));
      COMMUTES.forEach(function (c) {
        var row = el("div", "slider-row");
        row.appendChild(el("span", "s-label", c.label));
        var slider = document.createElement("input");
        slider.type = "range";
        slider.min = 0; slider.max = 60; slider.step = 1;
        slider.value = p[c.key];
        slider.dataset.prop = p.id;
        slider.dataset.field = c.key;
        row.appendChild(slider);
        var val = el("span", "s-val", p[c.key] + " min");
        val.id = "sliderval-" + p.id + "-" + c.key;
        row.appendChild(val);
        comm.appendChild(row);
      });
      card.appendChild(comm);

      // amenities checkboxes
      card.appendChild(el("div", "amenities-title", "Amenities"));
      var am = el("div", "amenities");
      AMENITIES.forEach(function (a) {
        var lab = el("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = p.amenities.indexOf(a) !== -1;
        cb.dataset.prop = p.id;
        cb.dataset.amenity = a;
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(a));
        am.appendChild(lab);
      });
      card.appendChild(am);

      // computed chips
      var m = scored[idx].metrics;
      var chips = el("div", "chips");
      chips.appendChild(chip("AED/sqft ", Engine.fmtInt(m.pricePerSqft)));
      chips.appendChild(chip("Net yield ", Engine.fmtPct(m.netYield)));
      chips.appendChild(chip("Score ", scored[idx].score.toFixed(0)));
      card.appendChild(chips);

      wrap.appendChild(card);
    });
  }

  function chip(label, value) {
    var c = el("span", "chip");
    c.appendChild(document.createTextNode(label));
    c.appendChild(el("b", null, value));
    return c;
  }

  function fieldWrap(label, input) {
    var f = el("div", "field");
    f.appendChild(el("label", null, label));
    f.appendChild(input);
    return f;
  }

  function textField(label, id, field, value) {
    var i = document.createElement("input");
    i.type = "text";
    i.value = value;
    i.dataset.prop = id;
    i.dataset.field = field;
    return fieldWrap(label, i);
  }

  function numField(label, id, field, value, min) {
    var i = document.createElement("input");
    i.type = "number";
    i.min = min;
    i.value = value;
    i.dataset.prop = id;
    i.dataset.field = field;
    return fieldWrap(label, i);
  }

  function selectField(label, id, field, value, options) {
    var s = document.createElement("select");
    s.dataset.prop = id;
    s.dataset.field = field;
    options.forEach(function (opt) {
      var o = document.createElement("option");
      if (Array.isArray(opt)) { o.value = opt[0]; o.textContent = opt[1]; }
      else { o.value = opt; o.textContent = opt; }
      if (opt === value || (Array.isArray(opt) && opt[0] === value)) o.selected = true;
      s.appendChild(o);
    });
    return fieldWrap(label, s);
  }

  /* ---------- rendering: weights ---------- */

  function renderWeights() {
    var wrap = $("weights");
    wrap.innerHTML = "";
    var total = 0;
    WEIGHT_DEFS.forEach(function (w) {
      total += state.weights[w.key];
      var item = el("div", "weight-item");
      var row = el("div", "slider-row");
      row.appendChild(el("span", "s-label", w.label));
      var slider = document.createElement("input");
      slider.type = "range";
      slider.min = 0; slider.max = 60; slider.step = 5;
      slider.value = state.weights[w.key];
      slider.dataset.weight = w.key;
      row.appendChild(slider);
      var val = el("span", "s-val", state.weights[w.key] + "%");
      val.id = "weightval-" + w.key;
      row.appendChild(val);
      item.appendChild(row);
      wrap.appendChild(item);
    });
    $("weight-total").textContent = total;
  }

  /* ---------- rendering: comparison table ---------- */

  function renderTable(scored) {
    var table = $("compare-table");
    table.innerHTML = "";
    var props = state.properties;
    if (props.length === 0) return;

    var thead = document.createElement("thead");
    var htr = document.createElement("tr");
    htr.appendChild(el("th", null, ""));
    props.forEach(function (p, i) {
      var th = el("th");
      var dot = el("span", "th-dot");
      dot.style.background = PROPERTY_COLORS[i];
      th.appendChild(dot);
      th.appendChild(document.createTextNode(p.name));
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");

    // Rows: label, getter(p, metrics), formatter, higherIsBetter (null = no highlight)
    var rows = [
      ["Community", function (p) { return p.community; }, str, null],
      ["Type", function (p) { return p.type; }, str, null],
      ["Price (AED)", function (p) { return p.price; }, Engine.fmtInt, false],
      ["Price / sqft (AED)", function (p, m) { return m.pricePerSqft; }, Engine.fmtInt, false],
      ["Size (sqft)", function (p) { return p.size; }, Engine.fmtInt, true],
      ["Beds / Baths", function (p) { return p.beds + " / " + p.baths; }, str, null],
      ["Service charge (AED/yr)", function (p, m) { return m.annualService; }, Engine.fmtInt, false],
      ["Expected rent (AED/yr)", function (p) { return p.rent; }, Engine.fmtInt, true],
      ["Gross yield", function (p, m) { return m.grossYield; }, Engine.fmtPct, true],
      ["Net yield", function (p, m) { return m.netYield; }, Engine.fmtPct, true],
      ["5-yr cost (est.)", function (p, m) { return m.fiveYearCost; }, Engine.fmtMoney, false],
      ["Avg commute (min)", function (p, m) { return m.avgCommute; }, oneDec, false],
      ["Amenities", function (p, m) { return m.amenityCount; }, str, true],
      ["Status / Handover", function (p) {
        return (p.status === "offplan" ? "Off-plan" : "Ready") + (p.handover ? " · " + p.handover : "");
      }, str, null],
      ["Developer", function (p) { return p.developer; }, str, null]
    ];

    rows.forEach(function (r) {
      tbody.appendChild(buildRow(r[0], r[1], r[2], r[3], scored, false));
    });
    tbody.appendChild(buildRow("Weighted score",
      function (p, m, i) { return scored[i].score; },
      function (v) { return v.toFixed(0) + " / 100"; },
      true, scored, true));

    table.appendChild(tbody);
  }

  function str(v) { return v === undefined || v === null || v === "" ? "—" : String(v); }
  function oneDec(v) { return v.toFixed(1); }

  function buildRow(label, getter, fmt, higherIsBetter, scored, isScoreRow) {
    var tr = document.createElement("tr");
    if (isScoreRow) tr.className = "score-row";
    tr.appendChild(el("th", null, label));

    var values = state.properties.map(function (p, i) {
      return getter(p, scored[i].metrics, i);
    });

    // find best index (only for numeric rows and when >1 property)
    var bestIdx = -1;
    if (higherIsBetter !== null && values.length > 1 && values.every(function (v) { return typeof v === "number"; })) {
      bestIdx = 0;
      for (var i = 1; i < values.length; i++) {
        if (higherIsBetter ? values[i] > values[bestIdx] : values[i] < values[bestIdx]) bestIdx = i;
      }
      // no highlight when everything ties
      if (values.every(function (v) { return v === values[0]; })) bestIdx = -1;
    }

    values.forEach(function (v, i) {
      var td = el("td", i === bestIdx ? "best" : null, fmt(v));
      tr.appendChild(td);
    });
    return tr;
  }

  /* ---------- rendering: winner banner ---------- */

  function renderWinner(scored) {
    var banner = $("winner-banner");
    if (scored.length === 0) { banner.classList.add("hidden"); return; }
    var best = 0;
    for (var i = 1; i < scored.length; i++) {
      if (scored[i].score > scored[best].score) best = i;
    }
    var p = state.properties[best];
    var m = scored[best].metrics;
    banner.classList.remove("hidden");
    banner.innerHTML = "";
    banner.appendChild(el("span", "winner-trophy", "🏆"));
    var div = el("div");
    div.appendChild(el("div", "wb-name", p.name + " wins the comparison"));
    div.appendChild(el("div", "wb-detail",
      "Score " + scored[best].score.toFixed(0) + "/100 · Net yield " + Engine.fmtPct(m.netYield) +
      " · AED " + Engine.fmtInt(m.pricePerSqft) + "/sqft · 5-yr cost " + Engine.fmtMoney(m.fiveYearCost) + " AED"));
    banner.appendChild(div);
  }

  /* ---------- radar chart (canvas) ---------- */

  function drawRadar(scored) {
    var canvas = $("radar");
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var cssW = 640, cssH = 480;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var cx = cssW / 2, cy = cssH / 2 + 10;
    var radius = 165;
    var n = RADAR_AXES.length;

    function point(axis, value) { // value 0..100
      var angle = -Math.PI / 2 + (axis * 2 * Math.PI) / n;
      var r = radius * (value / 100);
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    }

    // grid rings
    ctx.strokeStyle = "#262d3a";
    ctx.lineWidth = 1;
    [25, 50, 75, 100].forEach(function (ring) {
      ctx.beginPath();
      for (var a = 0; a <= n; a++) {
        var pt = point(a % n, ring);
        if (a === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
      }
      ctx.stroke();
    });

    // spokes + axis labels
    ctx.font = "12px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillStyle = "#8b93a5";
    ctx.textAlign = "center";
    for (var a2 = 0; a2 < n; a2++) {
      var end = point(a2, 100);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(end[0], end[1]);
      ctx.stroke();
      var lp = point(a2, 118);
      ctx.fillText(RADAR_AXES[a2], lp[0], lp[1] + 4);
    }

    // property polygons
    scored.forEach(function (s, i) {
      var color = PROPERTY_COLORS[i];
      ctx.beginPath();
      for (var a3 = 0; a3 <= n; a3++) {
        var pt2 = point(a3 % n, s.axes[a3 % n]);
        if (a3 === 0) ctx.moveTo(pt2[0], pt2[1]); else ctx.lineTo(pt2[0], pt2[1]);
      }
      ctx.closePath();
      ctx.fillStyle = hexWithAlpha(color, 0.12);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // vertex dots
      ctx.fillStyle = color;
      for (var a4 = 0; a4 < n; a4++) {
        var pt3 = point(a4, s.axes[a4]);
        ctx.beginPath();
        ctx.arc(pt3[0], pt3[1], 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // legend
    var legend = $("radar-legend");
    legend.innerHTML = "";
    state.properties.forEach(function (p, i) {
      var item = el("div", "legend-item");
      var sw = el("span", "legend-swatch");
      sw.style.background = PROPERTY_COLORS[i];
      item.appendChild(sw);
      item.appendChild(el("span", null, p.name));
      item.appendChild(el("span", "legend-score", scored[i].score.toFixed(0)));
      legend.appendChild(item);
    });
  }

  function hexWithAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  /* ---------- master render ---------- */

  function render() {
    var scored = Engine.scoreAll(state.properties, state.weights);
    renderCards(scored);
    renderWeights();
    renderTable(scored);
    renderWinner(scored);
    drawRadar(scored);
    $("btn-add").disabled = state.properties.length >= MAX_PROPS;
  }

  /* ---------- events ---------- */

  function findProp(id) {
    return state.properties.find(function (p) { return p.id === Number(id); });
  }

  // Text/number/select edits + slider drags (delegated, live update)
  document.addEventListener("input", function (e) {
    var t = e.target;

    if (t.dataset && t.dataset.weight) {
      state.weights[t.dataset.weight] = Number(t.value);
      $("weightval-" + t.dataset.weight).textContent = t.value + "%";
      var total = WEIGHT_DEFS.reduce(function (s, w) { return s + state.weights[w.key]; }, 0);
      $("weight-total").textContent = total;
      saveState();
      softRefresh();
      return;
    }

    if (t.dataset && t.dataset.prop !== undefined && t.dataset.field) {
      var p = findProp(t.dataset.prop);
      if (!p) return;
      var field = t.dataset.field;
      var numeric = ["price", "size", "beds", "baths", "serviceCharge", "rent",
        "commuteMarina", "commuteDowntown", "commuteDIFC"].indexOf(field) !== -1;
      p[field] = numeric ? Math.max(0, Number(t.value) || 0) : t.value;

      if (t.type === "range") {
        var valEl = $("sliderval-" + p.id + "-" + field);
        if (valEl) valEl.textContent = t.value + " min";
      }
      saveState();
      softRefresh();
    }
  });

  // Amenity checkboxes (change event; re-render to update chips/scores)
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.prop !== undefined && t.dataset.amenity) {
      var p = findProp(t.dataset.prop);
      if (!p) return;
      var idx = p.amenities.indexOf(t.dataset.amenity);
      if (t.checked && idx === -1) p.amenities.push(t.dataset.amenity);
      if (!t.checked && idx !== -1) p.amenities.splice(idx, 1);
      saveState();
      render();
    }
  });

  // Remove buttons
  document.addEventListener("click", function (e) {
    var id = e.target.dataset && e.target.dataset.remove;
    if (id !== undefined) {
      state.properties = state.properties.filter(function (p) { return p.id !== Number(id); });
      saveState();
      render();
    }
  });

  /**
   * Recompute everything except the card grid, so typing in an input
   * doesn't blow away focus. Table/banner/radar have no focusable inputs.
   */
  function softRefresh() {
    var scored = Engine.scoreAll(state.properties, state.weights);
    renderTable(scored);
    renderWinner(scored);
    drawRadar(scored);
  }

  $("btn-add").addEventListener("click", function () {
    if (state.properties.length >= MAX_PROPS) return;
    state.properties.push(blankProperty(state.nextId++));
    saveState();
    render();
  });

  $("btn-reset").addEventListener("click", function () {
    if (!confirm("Reset to the 3 sample Dubai properties? Your edits will be lost.")) return;
    state = defaultState();
    saveState();
    render();
  });

  /* ---------- JSON export / import ---------- */

  $("btn-export").addEventListener("click", function () {
    var payload = {
      app: "property-compare",
      version: 1,
      exportedAt: new Date().toISOString(),
      weights: state.weights,
      properties: state.properties
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "property-compare.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $("btn-import").addEventListener("click", function () { $("import-file").click(); });

  $("import-file").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var props = Array.isArray(data) ? data : data.properties;
        if (!Array.isArray(props) || props.length === 0) throw new Error("no properties");
        state.properties = props.slice(0, MAX_PROPS).map(normalizeProperty);
        if (data.weights) state.weights = Object.assign(clone(DEFAULT_WEIGHTS), data.weights);
        state.nextId = state.properties.reduce(function (m, p) { return Math.max(m, p.id + 1); }, 1);
        saveState();
        render();
      } catch (err) {
        alert("Could not import: invalid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-importing the same file
  });

  window.addEventListener("resize", function () {
    drawRadar(Engine.scoreAll(state.properties, state.weights));
  });

  /* ---------- boot ---------- */

  render();
})();
