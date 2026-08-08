# property-compare

Dubai property comparison: up to 4 listings side-by-side with yields, 5-year cost, weighted scoring and a radar overlay. Vanilla JS, no dependencies.

## Features

- Compare up to 4 properties side-by-side, seeded with 3 realistic Dubai examples (Marina, Downtown, MBR City)
- Full field set per property: name, community, type, price (AED), size (sqft), beds/baths, service charge (AED/sqft/yr), expected annual rent, ready/off-plan status, handover, developer
- Commute sliders (minutes to Marina, Downtown, DIFC) and 8 amenities checkboxes per property
- Computed per property: price per sqft, gross & net rental yield, 5-year net cost estimate (4% DLD + 2% agency fees + service charges − rent, off-plan units forfeit 2 years of rent)
- User-adjustable scoring weights (price, yield, location, size, amenities) — score, table, radar and winner all update live
- Comparison table with per-row best-value highlighting (gold) and direction-aware logic (lower price wins, higher yield wins, etc.)
- Canvas radar chart overlaying all 4 properties on the five scoring axes, with color-coded legend
- Winner banner naming the highest-scoring property with its key stats
- localStorage persistence across sessions, JSON export/import for backup and sharing
- Responsive dark UI; table scrolls horizontally on small screens

## Run

Open index.html in any modern browser. No build step, no dependencies.

## Usage

- **+ Add property** — add a 4th (empty) property; **×** on a card removes it
- Edit any field directly; everything recalculates and saves on each keystroke
- Drag commute and weight sliders — slider values show inline
- **Export JSON** downloads the full comparison; **Import JSON** restores one
- **Reset** restores the 3 seed properties (asks for confirmation)

## Tech notes

- Scoring normalises each metric across the compared set to 0–100 (direction-aware), then applies the user's weight percentages — ties score 50 so equal properties aren't penalised
- `engine.js` is a pure calculation layer (no DOM); `app.js` owns state and rendering, so the math stays testable in isolation
- Radar chart is hand-drawn on a HiDPI-aware canvas (devicePixelRatio scaling) with translucent polygon fills and per-vertex dots
- Typing uses a "soft refresh" (table/banner/radar only) so re-rendering never steals input focus mid-keystroke

## Roadmap

- Mortgage mode: down payment, rate, term → cash-on-cash return and true 5-yr cost with financing
- Price history sparkline per community (seeded sample data, optional API)
- Currency toggle (AED / USD / EUR) with static exchange rates
- PDF / printable comparison report
- Amenity weighting — mark individual amenities as must-have and auto-penalise misses
- Shareable URL encoding the full comparison in a hash fragment
