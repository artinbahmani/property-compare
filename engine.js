/* property-compare — engine.js
 * Pure calculation layer: metrics, 5-year cost, normalisation and weighted scoring.
 * No DOM access here — app.js handles rendering and state.
 */

(function () {
  "use strict";

  // Acquisition cost assumptions (Dubai norms): 4% DLD fee + 2% agency fee.
  var DLD_FEE = 0.04;
  var AGENCY_FEE = 0.02;
  var HOLD_YEARS = 5;

  /**
   * Derived metrics for one property.
   * p.serviceCharge is AED per sqft per year; p.rent is expected annual rent in AED.
   */
  function computeMetrics(p) {
    var size = Math.max(0, p.size || 0);
    var price = Math.max(0, p.price || 0);
    var rent = Math.max(0, p.rent || 0);
    var annualService = p.serviceCharge * size;

    var pricePerSqft = size > 0 ? price / size : 0;
    var grossYield = price > 0 ? rent / price : 0;
    var netYield = price > 0 ? (rent - annualService) / price : 0;

    // 5-year net cost of ownership: purchase + fees + service charges,
    // offset by rental income. Off-plan units earn no rent until handover —
    // approximated by forfeiting 2 years of rent.
    var rentYears = p.status === "offplan" ? HOLD_YEARS - 2 : HOLD_YEARS;
    var fiveYearCost =
      price * (1 + DLD_FEE + AGENCY_FEE) + annualService * HOLD_YEARS - rent * rentYears;

    var commutes = [p.commuteMarina, p.commuteDowntown, p.commuteDIFC];
    var avgCommute = (commutes[0] + commutes[1] + commutes[2]) / 3;

    return {
      pricePerSqft: pricePerSqft,
      annualService: annualService,
      grossYield: grossYield,
      netYield: netYield,
      fiveYearCost: fiveYearCost,
      avgCommute: avgCommute,
      amenityCount: (p.amenities || []).length
    };
  }

  /**
   * Normalise an array of numbers to 0..100.
   * higherIsBetter flips the scale; identical values all map to 50.
   */
  function normalize(values, higherIsBetter) {
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    return values.map(function (v) {
      if (max === min) return 50;
      var t = (v - min) / (max - min);
      return (higherIsBetter ? t : 1 - t) * 100;
    });
  }

  /**
   * Score every property against the set, using user weights
   * { price, yield, location, size, amenities } (percentages, any total).
   * Returns an array of { metrics, axes, score } aligned with `properties`.
   * axes: [price, yield, location, size, amenities] each 0..100 — used by the radar chart.
   */
  function scoreAll(properties, weights) {
    var metrics = properties.map(computeMetrics);
    if (properties.length === 0) return [];

    var priceScore = normalize(metrics.map(function (m) { return m.pricePerSqft; }), false);
    var yieldScore = normalize(metrics.map(function (m) { return m.netYield; }), true);
    var locScore = normalize(metrics.map(function (m) { return m.avgCommute; }), false);
    var sizeScore = normalize(properties.map(function (p) { return p.size; }), true);
    var amenScore = normalize(metrics.map(function (m) { return m.amenityCount; }), true);

    var totalWeight =
      weights.price + weights.yield + weights.location + weights.size + weights.amenities;
    if (totalWeight <= 0) totalWeight = 1;

    return properties.map(function (p, i) {
      var axes = [priceScore[i], yieldScore[i], locScore[i], sizeScore[i], amenScore[i]];
      var score =
        (axes[0] * weights.price +
          axes[1] * weights.yield +
          axes[2] * weights.location +
          axes[3] * weights.size +
          axes[4] * weights.amenities) / totalWeight;
      return { metrics: metrics[i], axes: axes, score: score };
    });
  }

  /* ---------- formatting helpers ---------- */

  function fmtInt(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  // Compact money: 1.85M / 240k / 900
  function fmtMoney(n) {
    var abs = Math.abs(n);
    if (abs >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
    if (abs >= 1e3) return Math.round(n / 1e3) + "k";
    return String(Math.round(n));
  }

  function fmtPct(x) {
    return (x * 100).toFixed(2) + "%";
  }

  window.Engine = {
    computeMetrics: computeMetrics,
    scoreAll: scoreAll,
    normalize: normalize,
    fmtInt: fmtInt,
    fmtMoney: fmtMoney,
    fmtPct: fmtPct,
    HOLD_YEARS: HOLD_YEARS
  };
})();
