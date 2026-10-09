/* PHASE 10G. The Dula graph layer.
 *
 * Every chart inherits the existing tokens, type and spacing — no dashboard aesthetic,
 * no new palette. Two rules it enforces rather than trusts:
 *
 *   A visual encoding may not carry information the observation does not contain. Area,
 *   width and length encode magnitude ONLY where a magnitude is measured.
 *
 *   A chart is a claim. Every graph carries its question, unit, source, geography, time
 *   and limitations; Intelligence shows what aids comprehension, Model and Evidence show
 *   the rest.
 */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const n = (v, d = 0) => v == null ? "—"
  : Number(v).toLocaleString(undefined, { maximumFractionDigits: d });

/* §AB. A graph object knows what it is claiming. §AC: a title may not exceed the claim. */
export function frame(meta, body) {
  return `<figure class="gq" data-gid="${esc(meta.id || "")}">
    ${meta.title ? `<figcaption class="gq-t">${esc(meta.title)}</figcaption>` : ""}
    ${meta.sub ? `<p class="gq-s">${esc(meta.sub)}</p>` : ""}
    ${body}
    <div class="gq-m">${[meta.unit, meta.geography, meta.time].filter(Boolean)
      .map(x => `<span>${esc(x)}</span>`).join("")}</div>
    ${meta.caveat ? `<p class="gq-c">${esc(meta.caveat)}</p>` : ""}
  </figure>`;
}

/* ---- LINE. Change over time. A break in the series is drawn as a break, not smoothed. */
export function line(series, meta = {}) {
  const W = 680, H = 190, P = { l: 46, r: 14, t: 14, b: 26 };
  const all = series.flatMap(s => s.points);
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys), y1 = Math.max(...ys);
  const sx = v => P.l + (v - x0) / ((x1 - x0) || 1) * (W - P.l - P.r);
  const sy = v => H - P.b - (v - y0) / ((y1 - y0) || 1) * (H - P.t - P.b);
  const ticks = [y0, y0 + (y1 - y0) / 2, y1];
  const paths = series.map((s, i) => {
    const d = s.points.map((p, j) => `${j ? "L" : "M"}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(" ");
    const last = s.points[s.points.length - 1];
    return `<path d="${d}" fill="none" stroke="${s.colour || "var(--clay)"}"
      stroke-width="${s.emphasis ? 2.2 : 1.4}" opacity="${s.emphasis === false ? 0.42 : 1}"/>
    <circle cx="${sx(last[0])}" cy="${sy(last[1])}" r="3" fill="${s.colour || "var(--clay)"}"/>
    <text class="gq-sl" x="${sx(last[0]) - 4}" y="${sy(last[1]) - 9}" text-anchor="end"
      >${esc(s.label)}</text>`;
  }).join("");
  const marks = (meta.annotations || []).map(a => `
    <line x1="${sx(a.x)}" y1="${P.t}" x2="${sx(a.x)}" y2="${H - P.b}"
      stroke="var(--warn)" stroke-width="1" stroke-dasharray="3 3"/>
    <text class="gq-an" x="${sx(a.x) + 4}" y="${P.t + 10}">${esc(a.label)}</text>`).join("");
  return frame(meta, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(meta.title || "")}">
    ${ticks.map(t => `<line x1="${P.l}" y1="${sy(t)}" x2="${W - P.r}" y2="${sy(t)}"
      stroke="var(--line)" stroke-width="1"/>
      <text class="gq-ax" x="${P.l - 6}" y="${sy(t) + 3}" text-anchor="end">${n(t)}</text>`).join("")}
    <text class="gq-ax" x="${P.l}" y="${H - 8}">${x0}</text>
    <text class="gq-ax" x="${W - P.r}" y="${H - 8}" text-anchor="end">${x1}</text>
    ${marks}${paths}</svg>`);
}

/* ---- RANKED BAR. Cross-entity comparison, ordered by the measure. */
export function ranked(rows, meta = {}) {
  const top = Math.max(...rows.map(r => Math.abs(r.value)));
  return frame(meta, `<div class="gq-rk">${rows.map(r => `<div class="gq-rr${r.mark ? " on" : ""}">
    <span class="gq-rl">${esc(r.label)}</span>
    <span class="gq-rb"><i style="width:${(Math.abs(r.value) / top * 100).toFixed(1)}%"></i></span>
    <span class="gq-rv">${esc(r.display ?? n(r.value, 1))}</span>
    ${r.dir ? `<span class="gq-rd">${esc(r.dir)}</span>` : ""}</div>`).join("")}</div>`);
}

/* ---- SCATTER. Two measured variables. No fitted line: nothing here identifies one. */
export function scatter(pts, meta = {}) {
  const W = 560, H = 300, P = { l: 52, r: 18, t: 16, b: 38 };
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs) * 0.92, x1 = Math.max(...xs) * 1.06;
  const y0 = Math.min(...ys) * 0.88, y1 = Math.max(...ys) * 1.08;
  const sx = v => P.l + (v - x0) / ((x1 - x0) || 1) * (W - P.l - P.r);
  const sy = v => H - P.b - (v - y0) / ((y1 - y0) || 1) * (H - P.t - P.b);
  return frame(meta, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(meta.title || "")}">
    ${[y0, (y0 + y1) / 2, y1].map(t => `<line x1="${P.l}" y1="${sy(t)}" x2="${W - P.r}"
      y2="${sy(t)}" stroke="var(--line)"/><text class="gq-ax" x="${P.l - 6}" y="${sy(t) + 3}"
      text-anchor="end">${n(t)}</text>`).join("")}
    ${[x0, (x0 + x1) / 2, x1].map(t => `<text class="gq-ax" x="${sx(t)}" y="${H - 20}"
      text-anchor="middle">${n(t)}</text>`).join("")}
    <text class="gq-axl" x="${(W) / 2}" y="${H - 4}" text-anchor="middle">${esc(meta.xlabel || "")}</text>
    <text class="gq-axl" transform="rotate(-90 12 ${H / 2})" x="12" y="${H / 2}"
      text-anchor="middle">${esc(meta.ylabel || "")}</text>
    ${pts.map(p => `<g><circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="${p.mark ? 6 : 4.5}"
      fill="${p.mark ? "var(--clay)" : "var(--water)"}" opacity="${p.mark ? 1 : .75}"/>
      <text class="gq-pl" x="${sx(p.x) + 8}" y="${sy(p.y) + 3.5}">${esc(p.label)}</text></g>`).join("")}
  </svg>`);
}

/* ---- MATRIX. Many entities across several dimensions. One encoding per cell: the
   direction arrow, with the level as text. Historical position is progressive disclosure
   on hover, not a third simultaneous encoding. */
const ARROW = { RISING: "▲", FALLING: "▼", FLAT: "—", UNKNOWN: "·" };
export function matrix(rows, cols, cells, meta = {}) {
  return frame(meta, `<div class="gq-mx"><table><thead><tr><th></th>
    ${cols.map(c => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>
    ${rows.map(r => `<tr><th class="gq-mr">${esc(r.label)}</th>
      ${cols.map(c => {
        const v = cells[`${r.id}|${c.id}`];
        if (!v) return `<td class="gq-mc none">·</td>`;
        return `<td class="gq-mc ${String(v.direction).toLowerCase()}"
          title="${esc(`${r.label} · ${c.label}: ${v.display} · ${String(v.direction).toLowerCase()}${
            v.percentile != null ? ` · ${v.percentile}th percentile of its own history` : ""}`)}">
          <span class="gq-mv">${esc(v.display)}</span>
          <span class="gq-md">${ARROW[v.direction] || "·"}</span></td>`;
      }).join("")}</tr>`).join("")}</tbody></table></div>`);
}

/* ---- SMALL MULTIPLES. The same measure across entities, on one shared scale. */
export function multiples(panels, meta = {}) {
  const w = 150, h = 62;
  // Panels share a scale only with panels in the same UNIT. Putting a percentage of GDP
  // and an annual price change on one axis flattens the price panels into a line at the
  // bottom and reads as "nothing is happening" when something is.
  const groups = {};
  panels.forEach(p => {
    const g = p.scale || meta.unit || "default";
    (groups[g] ||= []).push(...p.points.map(q => q[1]));
  });
  const bounds = {};
  Object.entries(groups).forEach(([g, vals]) =>
    (bounds[g] = { lo: Math.min(...vals), hi: Math.max(...vals) }));
  return frame(meta, `<div class="gq-sm">${panels.map(p => {
    const b = bounds[p.scale || meta.unit || "default"];
    const y0 = b.lo, y1 = b.hi;
    const xs = p.points.map(q => q[0]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const sx = v => 4 + (v - x0) / ((x1 - x0) || 1) * (w - 8);
    const sy = v => h - 10 - (v - y0) / ((y1 - y0) || 1) * (h - 20);
    const d = p.points.map((q, i) => `${i ? "L" : "M"}${sx(q[0]).toFixed(1)} ${sy(q[1]).toFixed(1)}`).join(" ");
    const last = p.points[p.points.length - 1];
    return `<div class="gq-sp"><div class="gq-spl">${esc(p.label)}</div>
      <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(p.label)}">
        <path d="${d}" fill="none" stroke="${p.colour || "var(--clay)"}" stroke-width="1.5"/>
        <circle cx="${sx(last[0])}" cy="${sy(last[1])}" r="2.5" fill="${p.colour || "var(--clay)"}"/>
      </svg><div class="gq-spv">${esc(p.display ?? n(last[1], 1))}</div></div>`;
  }).join("")}</div>`);
}

/* ---- SPARKLINE. Direction and context beside a current value. */
export function spark(points, opts = {}) {
  const w = 72, h = 18;
  const ys = points.map(p => p[1]);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = i => i / ((points.length - 1) || 1) * (w - 2) + 1;
  const sy = v => h - 2 - (v - y0) / ((y1 - y0) || 1) * (h - 4);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(" ");
  return `<svg class="gq-sk" viewBox="0 0 ${w} ${h}" role="img"
    aria-label="${esc(opts.label || "trend")}"><path d="${d}" fill="none"
    stroke="var(--ink-3)" stroke-width="1.2"/><circle cx="${sx(points.length - 1)}"
    cy="${sy(ys[ys.length - 1])}" r="1.8" fill="var(--clay)"/></svg>`;
}

/* ---- FLOW. Ranked movement between named places. Width encodes the measured quantity;
   this is the one chart where that is legitimate, because every row is measured on the
   same basis. */
export function flows(rows, meta = {}) {
  const top = Math.max(...rows.map(r => r.value));
  return frame(meta, `<div class="gq-fl">${rows.map(r => `<div class="gq-fr">
    <span class="gq-fa">${esc(r.from)}</span>
    <span class="gq-fw"><i style="height:${Math.max(2, r.value / top * 14).toFixed(1)}px"></i></span>
    <span class="gq-fb">${esc(r.to)}</span>
    <span class="gq-fv">${n(r.value)}</span>
    <span class="gq-fs">${esc(r.share || "")}</span></div>`).join("")}</div>`);
}

/* §AJ. A refusal is a first-class output. */
export function refusal(r) {
  return `<div class="gq-no"><div class="gq-not">Not charted — ${esc(r.question)}</div>
    <p>${esc(r.why_refused)}</p></div>`;
}
