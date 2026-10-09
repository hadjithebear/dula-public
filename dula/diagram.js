/* PHASE 10V. The diagram renderer.
 *
 * It draws nothing on its own authority. Every line style, width and emphasis comes from
 * grammar.js — the canonical V0.6 visual grammar, which this phase REUSES and does not
 * modify. The two channels it enforces are the reason this module exists:
 *
 *     LINE STYLE = how sure we are the relationship exists
 *     THICKNESS  = how large it is, and ONLY where Dula measured it
 *
 * So an unobserved pair cannot be drawn as observed, and a flow with no measured size
 * gets no size encoding. Node treatments reuse the established .sysnode classes in
 * dula.css rather than inventing a second set.
 */
import * as G from "./grammar.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Dula's epistemic words as the diagram specs use them, mapped onto the grammar's own
 * vocabulary. The mapping is declared here so it can be read, exactly as grammar.js
 * declares its own. */
const TO_GRAMMAR = {
  OBSERVED: "OBSERVED", SUPPORTED: "SUPPORTED", MECHANISM_SUPPORTED: "SUPPORTED",
  CONDITIONAL: "CONDITIONAL", UNKNOWN: "UNKNOWN", CONTRADICTED: "CONTRADICTED",
};

// Node fill follows the established .sysnode state classes, not a new palette.
const NODE_CLASS = { OBSERVED: "observed", SUPPORTED: "classified", UNKNOWN: "unobserved" };

// Node boxes size to their text, and sub-text is clipped with an ellipsis rather than
// overflowing the box. A diagram whose labels collide is not legible, whatever it encodes.
const BOX_W = 150, BOX_H = 54, ROW_H = 104, COL_GAP = 58;
const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s || "");

// The gap between columns is sized to the longest edge label the spec actually carries,
// so a chain of five steps widens its canvas rather than abbreviating every label to six
// characters. The SVG scales to its container, so a wider canvas means smaller type, not
// a horizontal scrollbar.
function gapFor(edges) {
  const longest = Math.max(0, ...edges.map(e => (e.label || "").length));
  return Math.min(230, Math.max(58, longest * 6.2 + 18));
}

function layout(nodes, edges, W) {
  // Columns by dependency depth, so a chain reads left to right and a hub reads as a hub.
  const depth = {};
  const incoming = id => edges.filter(e => e.to === id).map(e => e.from);
  const walk = (id, d, seen) => {
    if (seen.has(id)) return;
    seen.add(id);
    depth[id] = Math.max(depth[id] ?? 0, d);
    edges.filter(e => e.from === id).forEach(e => walk(e.to, d + 1, new Set(seen)));
  };
  nodes.filter(n => incoming(n.id).length === 0).forEach(n => walk(n.id, 0, new Set()));
  nodes.forEach(n => { if (depth[n.id] === undefined) depth[n.id] = 0; });
  const cols = {};
  nodes.forEach(n => (cols[depth[n.id]] ||= []).push(n));
  const nCols = Math.max(...Object.keys(cols).map(Number)) + 1;
  const tallestCol = Math.max(...Object.values(cols).map(a => a.length));
  // A long single-file chain laid out horizontally becomes a thin strip that scales down
  // to unreadable. Run it down the page instead, which is the direction the reader is
  // already moving.
  if (nCols >= 5 && tallestCol === 1) {
    const pos = {};
    nodes.forEach(n => {
      pos[n.id] = { x: W / 2, y: 42 + depth[n.id] * 96 };
    });
    // Vertical has horizontal room to spare, so the boxes get it and the labels fit.
    return { pos, W, H: 42 + nCols * 96, vertical: true, boxW: 248 };
  }
  const pad = BOX_W / 2 + 12;
  // Guarantee a gap wide enough to print an edge label in, widening the canvas if the
  // column count demands it rather than letting text run over a box.
  const colW = Math.max(BOX_W + gapFor(edges), nCols > 1 ? (W - 2 * pad) / (nCols - 1) : 0);
  const tallest = Math.max(...Object.values(cols).map(a => a.length));
  const pos = {};
  Object.entries(cols).forEach(([d, ns]) => {
    ns.forEach((n, i) => {
      pos[n.id] = {
        x: pad + Number(d) * colW,
        y: 42 + i * ROW_H + (tallest - ns.length) * ROW_H / 2,
      };
    });
  });
  const H = 42 + tallest * ROW_H;
  const wide = Math.max(W, pad * 2 + (nCols - 1) * colW);
  return { pos, W: wide, H };
}

export function draw(spec, opts = {}) {
  const W = opts.width || 760;
  const lay = layout(spec.nodes, spec.edges, W);
  const { pos, H } = lay, VW = lay.W;
  const BW = lay.boxW || BOX_W;
  const NAME_CHARS = Math.floor(BW / 5.8);
  const byId = Object.fromEntries(spec.nodes.map(n => [n.id, n]));

  const edgeSvg = spec.edges.map((e, i) => {
    const g = TO_GRAMMAR[e.state] || "UNKNOWN";
    const ep = G.EPISTEMIC[g];
    const dash = G.LINE[ep.line].dash;
    const w = G.width(e.magnitude_state);
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) return "";
    const vert = !!lay.vertical;
    const back = b.x < a.x;
    const x1 = vert ? a.x : (back ? a.x - BW / 2 : a.x + BW / 2);
    const x2 = vert ? b.x : (back ? b.x + BW / 2 : b.x - BW / 2);
    const y1 = vert ? a.y + BOX_H / 2 : a.y;
    const y2 = vert ? b.y - BOX_H / 2 : b.y;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    // Stagger labels along the run so parallel edges do not print on top of each other.
    const off = ((i % 3) - 1) * 13 - 8;
    const faded = ep.faded ? 0.45 : 1;
    return `<g class="dg-edge" opacity="${faded}">
      <path d="${vert ? `M${x1} ${y1} L ${x2} ${y2}`
        : `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}"
        fill="none" stroke="var(--line-2)" stroke-width="${w}"
        stroke-dasharray="${dash}" marker-end="url(#dg-arrow)"/>
      ${ep.struck ? `<line x1="${mx - 7}" y1="${my - 7}" x2="${mx + 7}" y2="${my + 7}"
        stroke="var(--warn)" stroke-width="1.6"/>` : ""}
      <text class="dg-el" x="${vert ? mx + 10 : mx}" y="${vert ? my + 4 : my + off}"
        text-anchor="${vert ? "start" : "middle"}">
        <tspan class="dg-elb">${esc(vert ? e.label : clip(e.label, Math.max(6,
          Math.floor((Math.abs(x2 - x1) - 18) / 6.2))))}</tspan></text>
    </g>`;
  }).join("");

  const nodeSvg = spec.nodes.map(n => {
    const cls = NODE_CLASS[n.state] || "unobserved";
    const p = pos[n.id];
    return `<g class="sysnode ${cls} dg-node" transform="translate(${p.x},${p.y})">
      <rect class="dg-box" x="${-BW / 2}" y="${-BOX_H / 2}" width="${BW}"
        height="${BOX_H}" rx="8"/>
      <text class="sys-k dg-nl" text-anchor="middle" y="${n.sub ? -4 : 4}"
        >${esc(clip(n.label, NAME_CHARS))}</text>
      ${n.sub ? `<text class="sys-d dg-ns" text-anchor="middle" y="13"
        >${esc(clip(n.sub, NAME_CHARS + 6))}</text>` : ""}
      <title>${esc(n.label)}${n.sub ? " — " + esc(n.sub) : ""}</title>
    </g>`;
  }).join("");

  const states = [...new Set(spec.edges.map(e => TO_GRAMMAR[e.state] || "UNKNOWN"))];
  const legend = states.map(s => {
    const ep = G.EPISTEMIC[s];
    return `<span class="dg-key"><svg width="30" height="8" aria-hidden="true"><line x1="0" y1="4"
      x2="30" y2="4" stroke="var(--line-2)" stroke-width="1.6"
      stroke-dasharray="${G.LINE[ep.line].dash}"/></svg>${esc(ep.word)}</span>`;
  }).join("");
  const anyMeasured = spec.edges.some(e => G.magnitudeEncoded(e.magnitude_state));

  return `<figure class="dg">
    <svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="${esc(spec.title)}">
      <defs><marker id="dg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7"
        markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--line-2)"/></marker></defs>
      ${edgeSvg}${nodeSvg}
    </svg>
    <figcaption class="dg-cap">${legend}
      ${anyMeasured ? `<span class="dg-key"><svg width="30" height="8" aria-hidden="true"><line
        x1="0" y1="4" x2="30" y2="4" stroke="var(--line-2)" stroke-width="${G.MEASURED_WIDTH}"/></svg>a measured size</span>`
        : `<span class="dg-key dg-nomag">no line here encodes a size — none is measured</span>`}
    </figcaption>
  </figure>`;
}

/* A comparison bar set. Magnitude is the whole point of this one, so it is encoded — but
 * only because every value in it is measured on the same basis. */
export function compare(rows, unit, fmt = v => v.toLocaleString()) {
  const top = Math.max(...rows.map(r => r.value));
  return `<div class="cmp">${rows.map(r => `<div class="cmp-row">
    <span class="cmp-lbl">${esc(r.place)}</span>
    <span class="cmp-bar"><i style="width:${(r.value / top * 100).toFixed(1)}%"></i></span>
    <span class="cmp-val">${esc(fmt(r.value))}</span></div>`).join("")}
    <div class="cmp-unit">${esc(unit)}</div></div>`;
}

/* Three or four numbers that belong together, sized so the relationship between them is
 * the first thing read. */
export function metrics(items) {
  return `<div class="mx">${items.map(m => `<div class="mx-i">
    <div class="mx-v">${esc(typeof m.value === "number" ? m.value.toLocaleString() : m.value)}</div>
    <div class="mx-l">${esc(m.label)}${m.unit ? " " + esc(m.unit) : ""}</div>
    ${m.note ? `<div class="mx-n">${esc(m.note)}</div>` : ""}</div>`).join("")}</div>`;
}
