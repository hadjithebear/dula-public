/* DULA — THE ECONOMIC ATLAS.
 *
 * R3.24. The application could describe an economy and could not let anyone look at one. This is
 * the drawing layer for the place-centred experience: a projection, a county map, a composition
 * field, a boundary-sensitive flow diagram, and the small instruments they share.
 *
 * THREE RULES CARRIED OVER FROM THE EXISTING GRAMMAR, NOT REINVENTED HERE.
 *
 *   Area, length and width encode a MEASURED magnitude or they encode nothing. A sector's
 *   rectangle is its employment because employment is counted; nothing is sized by confidence,
 *   importance or interest.
 *
 *   Line STYLE carries epistemic state and line WIDTH carries magnitude, and the two never share
 *   a channel. A national coefficient is drawn dashed however large it is.
 *
 *   Every coordinate is published geography. The county outlines are the Census Bureau's own
 *   cartographic boundaries, generalised for drawing by a recorded tolerance and not moved.
 *   Nothing is jittered, nothing is placed from prose, and no point is invented to fill a map.
 */
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const n = (v, d = 0) => v == null ? "—"
  : Number(v).toLocaleString(undefined, { maximumFractionDigits: d });
const money = v => v == null ? "—"
  : (v < 0 ? "−" : "") + (a => a >= 1e9 ? "$" + (a / 1e9).toFixed(2) + "bn"
    : a >= 1e6 ? "$" + (a / 1e6).toFixed(1) + "m"
      : "$" + a.toLocaleString(undefined, { maximumFractionDigits: 0 }))(Math.abs(Number(v)));

/* ---- PROJECTION. Equirectangular with a latitude correction, which is accurate enough across
   one state and keeps the map inside this product's own drawing instead of importing a library
   and its aesthetic. */
export function projection(bbox, w, h, pad = 14) {
  const [x0, y0, x1, y1] = bbox;
  const k = Math.cos((y0 + y1) / 2 * Math.PI / 180);
  const dx = (x1 - x0) * k, dy = y1 - y0;
  const s = Math.min((w - pad * 2) / dx, (h - pad * 2) / dy);
  const ox = (w - dx * s) / 2, oy = (h - dy * s) / 2;
  return ([lon, lat]) => [ox + (lon - x0) * k * s, oy + (y1 - lat) * s];
}

export function centroid(rings) {
  let sx = 0, sy = 0, c = 0;
  for (const r of rings) for (const p of r) { sx += p[0]; sy += p[1]; c++; }
  return c ? [sx / c, sy / c] : [0, 0];
}

/* ---- THE COUNTY MAP. One instrument, used by every view that needs geography. `shade` returns
   a fill for a county so the same map can carry employment, a flow role, or nothing at all. */
export function countyMap(atlas, {
  w = 760, h = 440, selected = null, shade = null, label = true, onSelect = true,
  focus = null, caption = null, marks = null,
} = {}) {
  /* A focus both REFRAMES and RESTRICTS. Reframing alone left the excluded counties drawn
     outside the viewBox, which is worse than not focusing at all: a shape half off the edge
     reads as a rendering fault rather than as a decision. */
  const ids = focus ? Object.keys(atlas.counties).filter(g => focus.includes(g))
    : Object.keys(atlas.counties);
  const box = focus ? focusBox(atlas, focus) : atlas.bbox;
  const P = projection(box, w, h);
  const paths = ids.map(g => {
    const c = atlas.counties[g];
    const d = c.rings.map(r => "M" + r.map(p => P(p).map(v => v.toFixed(1)).join(",")).join("L")
      + "Z").join(" ");
    const on = g === selected;
    const fill = shade ? shade(g, on) : (on ? "var(--clay-soft)" : "var(--paper-2)");
    return `<path d="${d}" fill="${fill}"
      stroke="${on ? "var(--clay)" : "var(--line-2)"}" stroke-width="${on ? 1.6 : 0.7}"
      ${onSelect ? `class="atl-county" data-geoid="${g}" style="cursor:pointer"` : ""}
      ><title>${esc(c.label)} County</title></path>`;
  }).join("");
  const labels = label ? ids.map(g => {
    const c = atlas.counties[g];
    const [x, y] = P(centroid(c.rings));
    const on = g === selected;
    if (!on && ids.length > 6 && !c.seat) return "";
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle"
      font-family="var(--serif)" font-size="${on ? 13 : 10.5}"
      fill="${on ? "var(--clay)" : "var(--ink-3)"}"
      style="pointer-events:none">${esc(c.label)}</text>`;
  }).join("") : "";
  const pts = marks ? marks.map(m => {
    const [x, y] = P(m.at);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${m.r || 3}"
      fill="${m.fill || "var(--clay)"}" fill-opacity="${m.o == null ? 0.75 : m.o}"
      stroke="#fff" stroke-width="0.6"><title>${esc(m.title || "")}</title></circle>`;
  }).join("") : "";
  return `<figure class="atl-fig">
    <svg viewBox="0 0 ${w} ${h}" class="atl-map" role="img"
      aria-label="Counties of northern and central New Mexico">
      ${paths}${pts}${labels}
    </svg>
    ${caption ? `<figcaption class="atl-cap">${caption}</figcaption>` : ""}
  </figure>`;
}

function focusBox(atlas, geoids, pad = 0.04) {
  const pts = geoids.flatMap(g => (atlas.counties[g] ? atlas.counties[g].rings.flat() : []));
  if (!pts.length) return atlas.bbox;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const mx = (x1 - x0) * pad, my = (y1 - y0) * pad;
  return [x0 - mx, y0 - my, x1 + mx, y1 + my];
}

/* ---- THE COMPOSITION FIELD. A sector's rectangle is its EMPLOYMENT, by area, because
   employment is counted. Colour is average pay per employee, which is a different measured
   quantity and therefore a different channel. A squarified treemap, written here rather than
   imported, because the layout has to answer to the grammar above. */
export function composition(sectors, { w = 760, h = 300, selected = null, total = null } = {}) {
  const items = sectors.filter(s => s.employment > 0)
    .map(s => ({ ...s, v: s.employment,
      pay: s.payroll_usd_thousands && s.employment
        ? (s.payroll_usd_thousands * 1000) / s.employment : null }))
    .sort((a, b) => b.v - a.v);
  if (!items.length) return `<p class="bt-u">No sector employment is published for this county.</p>`;
  const sum = items.reduce((a, b) => a + b.v, 0);
  const pays = items.map(i => i.pay).filter(Boolean);
  const lo = Math.min(...pays), hi = Math.max(...pays);
  const rects = squarify(items.map(i => ({ ...i, area: i.v / sum * w * h })), 0, 0, w, h);
  const body = rects.map(r => {
    const on = r.code === selected;
    const t = r.pay && hi > lo ? (r.pay - lo) / (hi - lo) : 0;
    const fill = r.pay == null ? "var(--paper-3)"
      : `color-mix(in srgb, var(--clay) ${(12 + t * 62).toFixed(0)}%, var(--paper-2))`;
    const big = r.w > 86 && r.h > 34;
    const mid = r.w > 54 && r.h > 22;
    return `<g class="atl-cell" data-sector="${esc(r.code)}" style="cursor:pointer">
      <rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${Math.max(0, r.w - 1.5).toFixed(1)}"
        height="${Math.max(0, r.h - 1.5).toFixed(1)}" fill="${fill}"
        stroke="${on ? "var(--clay)" : "#fff"}" stroke-width="${on ? 2 : 1}" rx="2"/>
      ${big ? `<text x="${(r.x + 8).toFixed(1)}" y="${(r.y + 19).toFixed(1)}"
        font-size="11" font-weight="600" fill="var(--ink)"
        style="pointer-events:none">${esc(short(r.name))}</text>
      <text x="${(r.x + 8).toFixed(1)}" y="${(r.y + 34).toFixed(1)}" font-size="10.5"
        fill="var(--ink-2)" style="pointer-events:none">${n(r.v)} jobs</text>`
      : mid ? `<text x="${(r.x + 6).toFixed(1)}" y="${(r.y + 15).toFixed(1)}" font-size="9.5"
        fill="var(--ink-2)" style="pointer-events:none">${esc(short(r.name, 14))}</text>` : ""}
      <title>${esc(r.name)} — ${n(r.v)} jobs, ${n(r.establishments)} establishments${
        r.pay ? `, ${money(r.pay)} average pay` : ""}</title>
    </g>`;
  }).join("");
  return `<figure class="atl-fig">
    <svg viewBox="0 0 ${w} ${h}" class="atl-tree" role="img"
      aria-label="Private employment by sector, area proportional to jobs">${body}</svg>
    <figcaption class="atl-cap">Area is employment. Colour is average annual pay per employee,
      ${money(lo)} to ${money(hi)}. ${total ? n(total) + " private jobs. " : ""}Two measured
      quantities, two channels — nothing here is sized by importance.</figcaption>
  </figure>`;
}

function short(s, k = 26) {
  const t = String(s).replace(/ and /g, " & ").replace(/, except.*$/, "");
  return t.length > k ? t.slice(0, k - 1) + "…" : t;
}

/* A squarified treemap. Worst-aspect-ratio row packing, the standard algorithm. */
function squarify(items, x, y, w, h) {
  const out = [];
  let rest = items.slice(), cx = x, cy = y, cw = w, ch = h;
  while (rest.length) {
    const horiz = cw >= ch;
    const side = horiz ? ch : cw;
    let row = [], best = Infinity;
    for (const it of rest) {
      const cand = row.concat([it]);
      const s = cand.reduce((a, b) => a + b.area, 0);
      const len = s / side;
      const worst = Math.max(...cand.map(c => Math.max(len / (c.area / len || 1e-9),
        (c.area / len || 1e-9) / len)));
      if (worst > best && row.length) break;
      row = cand; best = worst;
    }
    const s = row.reduce((a, b) => a + b.area, 0);
    const len = s / side;
    let off = horiz ? cy : cx;
    for (const it of row) {
      const t = it.area / len;
      out.push(horiz ? { ...it, x: cx, y: off, w: len, h: t }
        : { ...it, x: off, y: cy, w: t, h: len });
      off += t;
    }
    if (horiz) { cx += len; cw -= len; } else { cy += len; ch -= len; }
    rest = rest.slice(row.length);
    if (cw < 0.5 || ch < 0.5) break;
  }
  return out;
}

/* ---- THE FLOW INSTRUMENT. THE BOUNDARY IS THE ANALYSIS.
 *
 * The same observed job is an inflow, an outflow or an internal movement depending only on where
 * the line is drawn. This draws the counties, lets the reader put any set of them inside the
 * boundary, and recategorises every flow against it — so the categories move and the jobs do not.
 * That is a property of the measurement, and the point of showing it this way.
 *
 * A flow is drawn as an arc between two county centroids, with width proportional to jobs,
 * because jobs ARE counted. Nothing is drawn for a pair LODES does not report. */
export function flows(atlas, { inside = [], w = 760, h = 460, min = 150 } = {}) {
  const C = atlas.counties, F = atlas.commuting;
  const set = new Set(inside);
  const P = projection(atlas.bbox, w, h);
  const cen = {};
  for (const g of Object.keys(C)) cen[g] = P(centroid(C[g].rings));

  /* ONLY EDGES BETWEEN TWO PLACES ON THIS MAP CAN BE DRAWN AS ARCS. `OUTSIDE` and
     `OUT_OF_STATE` are aggregates, not locations: they have no boundary and no centroid, so an
     arc to one would have to be drawn to an invented point. They are counted in the tally and
     reported in words instead. R3.24 added OUT_OF_STATE to the data with the aux file and did
     not update this filter, which threw on every Flows view -- and shipped, because the tests
     check the artefact's arithmetic and nothing re-opened the view after the data changed. */
  const drawable = g => Boolean(C[g]);
  const edges = F.edges.filter(e => e.jobs >= min
    && (set.has(e.from) || set.has(e.to))
    && drawable(e.from) && drawable(e.to) && e.from !== e.to);
  const undrawn = F.edges.filter(e => !(drawable(e.from) && drawable(e.to))
    && (set.has(e.from) || set.has(e.to)))
    .reduce((a, e) => a + e.jobs, 0);
  /* THE UNIVERSE IS FIXED AND THE CATEGORIES MOVE. Every job pair LODES reports for this
     region is counted exactly once, in one of four buckets, against wherever the boundary
     currently is. An earlier version tallied only the flows that touched the boundary, so the
     total grew as the boundary widened -- which contradicted the very claim the view makes.
     Now the total is invariant by construction, because that is the point being demonstrated. */
  const tally = { internal: 0, inflow: 0, outflow: 0, outside: 0 };
  for (const e of F.edges) {
    const a = set.has(e.from), b = set.has(e.to);
    if (a && b) tally.internal += e.jobs;
    else if (b) tally.inflow += e.jobs;
    else if (a) tally.outflow += e.jobs;
    else tally.outside += e.jobs;
  }
  tally.total = tally.internal + tally.inflow + tally.outflow + tally.outside;
  const big = Math.max(1, ...edges.map(e => e.jobs));

  const shade = g => set.has(g) ? "var(--clay-soft)" : "var(--paper-2)";
  const land = Object.keys(C).map(g => {
    const d = C[g].rings.map(r => "M" + r.map(p => P(p).map(v => v.toFixed(1)).join(",")).join("L")
      + "Z").join(" ");
    return `<path d="${d}" fill="${shade(g)}" stroke="${set.has(g) ? "var(--clay)" : "var(--line-2)"}"
      stroke-width="${set.has(g) ? 1.4 : 0.6}" class="atl-county" data-geoid="${g}"
      style="cursor:pointer"><title>${esc(C[g].label)} County — click to move the boundary</title></path>`;
  }).join("");

  const arcs = edges.sort((a, b) => a.jobs - b.jobs).map(e => {
    const [x1, y1] = cen[e.from], [x2, y2] = cen[e.to];
    const a = set.has(e.from), b = set.has(e.to);
    const kind = a && b ? "internal" : b ? "inflow" : "outflow";
    const col = kind === "internal" ? "var(--sage)"
      : kind === "inflow" ? "var(--clay)" : "var(--water)";
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const cx = mx - dy * 0.18, cy = my + dx * 0.18;
    const sw = 0.8 + 6.5 * Math.sqrt(e.jobs / big);
    return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)}
      ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${col}" stroke-opacity="0.5"
      stroke-width="${sw.toFixed(2)}" stroke-linecap="round"
      ><title>${esc((C[e.from] || {}).label || e.from)} → ${esc((C[e.to] || {}).label || e.to)}: ${
        n(e.jobs)} jobs (${kind})</title></path>`;
  }).join("");

  const dots = Object.keys(C).map(g => {
    const [x, y] = cen[g];
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"
      fill="${set.has(g) ? "var(--clay)" : "var(--ink-3)"}" style="pointer-events:none"/>
      <text x="${x.toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" font-size="9.5"
        font-family="var(--serif)" fill="${set.has(g) ? "var(--clay)" : "var(--ink-3)"}"
        style="pointer-events:none">${esc(C[g].label)}</text>`;
  }).join("");

  return { svg: `<figure class="atl-fig">
    <svg viewBox="0 0 ${w} ${h}" class="atl-map" role="img"
      aria-label="Commuting job flows between counties, by selected boundary">
      ${land}${arcs}${dots}
    </svg>
    <figcaption class="atl-cap">Arc width is jobs. Colour is the flow's category
      <b style="color:var(--sage)">inside the boundary</b>,
      <b style="color:var(--clay)">in</b>, or <b style="color:var(--water)">out</b> — which
      depends entirely on which counties are selected. Flows under ${n(min)} jobs are not drawn${
        undrawn ? `, and ${n(undrawn)} jobs reaching the boundary from outside this map have no
        place to be drawn from — they are counted, and named below` : ""}.
    </figcaption></figure>`, tally, edges, undrawn };
}

/* ---- SMALL INSTRUMENTS ---------------------------------------------------------------- */

/* An epistemic chip. The vocabulary is the model's, not a new one. */
const STATE_CLASS = {
  OBSERVED: "s", OBSERVED_TRANSACTION: "s", LOCALLY_OBSERVED: "s", MEASURED: "s", COMPUTED: "s",
  EXECUTED_CONTRACT: "s", STATE_OBSERVED: "w", ESTIMATED: "w", MARKET_ESTIMATE: "w",
  COMPUTED_ESTIMATE: "w", PUBLISHED_PROCUREMENT: "w", SUPPLIER_QUOTE: "w",
  CUSTOMER_INTERVIEW: "w", NATIONALLY_MODELLED: "w", INDUSTRY_PROXY: "w", PROXY_ONLY: "w",
  HYPOTHETICAL: "u", HYPOTHESIS: "u", HYPOTHESIZED: "u", UNKNOWN: "u", UNMEASURED: "u",
  NOT_HELD: "u", EXPRESSION_OF_INTEREST: "u",
};
export function state(s, extra = "") {
  const k = STATE_CLASS[s] || "u";
  return `<span class="tag ${k}">${esc(String(s).replace(/_/g, " ").toLowerCase())}${
    extra ? " · " + esc(extra) : ""}</span>`;
}

/* A measured quantity with the thing that makes it readable attached. */
export function figure(value, label, { unit = null, source = null, big = false } = {}) {
  return `<div class="atl-fig-n">
    <div class="num" style="font-size:${big ? 30 : 22}px">${
      unit === "USD" ? money(value) : n(value)}</div>
    <p class="bt-u" style="margin:2px 0 0">${esc(label)}${
      source ? `<br><span style="color:var(--ink-3)">${esc(source)}</span>` : ""}</p>
  </div>`;
}

/* A horizontal proportion bar for one measured share. Width is the share and nothing else. */
export function share(parts, { w = 760, h = 26 } = {}) {
  const sum = parts.reduce((a, b) => a + b.v, 0) || 1;
  let x = 0;
  const seg = parts.map(p => {
    const pw = p.v / sum * w;
    const r = `<rect x="${x.toFixed(1)}" y="0" width="${Math.max(0, pw - 1).toFixed(1)}"
      height="${h}" fill="${p.fill}" rx="2"><title>${esc(p.label)}: ${n(p.v)}</title></rect>`;
    x += pw;
    return r;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" class="atl-share" role="img"
    aria-label="${esc(parts.map(p => p.label + " " + p.v).join(", "))}">${seg}</svg>`;
}
