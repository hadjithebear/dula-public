/* THE CANONICAL DULA APPLICATION.
 *
 * Phase 10R. This replaces the legacy workspace at its own route. There is one product:
 * World, New Mexico and places live inside it, with three modes over the same bound
 * object. The old record-inventory Overview is not reachable from normal navigation;
 * what was useful in it — the ledger of what Dula holds, the provenance sheets — lives
 * in Evidence Mode, where it answers a question somebody actually has.
 *
 * The information hierarchy is meaning, then relationship, then model, then evidence.
 * A record count is never the hero.
 */
/* R3.11. `cache: "no-cache"` REVALIDATES rather than bypassing: a 304 when unchanged, and
 * the new bytes when changed. Without it a returning browser renders the previous build's
 * data against the current code, which is how a page looks right and is wrong. */
const J = async p => (await fetch(p, { cache: "no-cache" })).json();
import * as DG from "./diagram.js";
import * as GR from "./graph.js";
import * as AT from "./atlas.js";

const [PLACES, NM, WORLD, OBS, LEG, GQ, RD, MC, RG, ECON, ECM, ECS, ECP, ECI, ECO, ECD, ECPL, ECN,
  ECF, ECE, ECO2, ATL] = await Promise.all([
  J("product/places.json"), J("product/newmexico.json"), J("product/world.json"),
  J("product/observatory.json"), J("product/legible.json"), J("product/graphs.json"),
  J("product/reading.json"), J("product/machine.json"), J("product/regional.json"),
  J("product/economy.json"),
  /* R3.14. The connected economy: one shared representation (ECM), the system-strength audit
   * (ECS), and the cross-system pathways (ECP). These are three views of the SAME records --
   * ECM indexes what is held, ECS audits it against the strength formulation, ECP traverses
   * between systems -- which is why they load together and share one scope. */
  J("product/economy_model.json"), J("product/economy_strength.json"),
  J("product/economy_pathways.json"),
  /* R3.15. Intervention economics: the same representation, asked what it would take to change. */
  J("product/economy_interventions.json"),
  J("product/economy_origination.json"),
  J("product/economy_discovery.json"),
  J("product/place_economy.json"),
  J("product/economy_network.json"),
  /* R3.21. Market structure, enterprise economics and opportunity feasibility. Three
   * determinations per opportunity, kept apart on purpose, over the SAME representation the
   * rest of this scope reads. */
  J("product/economy_feasibility.json"),
  /* R3.22. What Dula holds (ECE) and what reading it turns up (ECO2). The inventory loads with
   * the discovery because a candidate is only as good as the holding behind it, and the view
   * shows both. */
  J("product/economy_evidence.json"),
  J("product/economy_opportunity.json"),
  /* R3.24. Geography and movement: Census county boundaries and LODES county-to-county job
   * flows. The only two things the atlas needed that no earlier artefact held. */
  J("product/atlas.json"),
]);

/* R3.10, revised R3.23. product/economy.json is the PUBLIC half of the R3 economic
 * intelligence. The INTERNAL half -- opportunity economics, financial assumptions, portfolio
 * construction, marketed assets and asking prices -- is NOT here and must not be. It is
 * gitignored and, since R3.23, excluded by the deployment build's allow-list: a file reaches
 * the public artefact only because the application asks for it, and this probe is written so
 * that ABSENCE IS THE NORMAL CASE. There is no authentication, so a UI toggle would never have
 * been a control; the layer is fetched only where it is actually present and labelled when
 * shown. */
const IS_PUBLIC_BUILD =
  (document.querySelector('meta[name="dula-build"]') || {}).content === "public";
const INTERNAL = IS_PUBLIC_BUILD ? null
  : await fetch("data_internal/r310_investment.json", { cache: "no-cache" })
    .then(r => r.ok ? r.json() : null).catch(() => null);

/* PHASE 10H. A reading is rendered as an ARGUMENT: each beat is a claim, the visual it
 * rests on, what that visual says, and what works against it. A graph appears because a
 * claim created a reason to look at it, never because it exists. */
const VISUAL = {
  /* PHASE 10I. The machine's visuals use the SAME primitives as every other reading.
     Nothing new is drawn: coverage is a ranked bar, the boundary is a flow, the
     identities are a matrix of states, the decomposition is a ranked comparison. */
  MACHINE_COVERAGE: () => GR.ranked(
    MC.coverage.sectors && Object.entries(MC.coverage.sectors).map(([k, v]) => ({
      label: k.replace(/_/g, " ").toLowerCase(),
      value: v.held, display: `${v.held} of ${v.required}`,
      dir: v.absent.length ? `${v.absent.length} absent` : "complete",
      mark: v.held / v.required < 0.5,
    })).sort((a, b) => b.value / 1 - a.value / 1),
    { id: "machine-coverage", title: "What the US machine requires, and what Dula holds",
      sub: "Elements per sector. The elements are not commensurable, so there is no total.",
      unit: "count of required elements", geography: "United States",
      caveat: MC.coverage.no_total }),
  /* Drawn, not charted. The first version used GR.flows with value 1 on every row,
     which printed a meaningless "1" five times: a magnitude where there is none. The
     boundary is a chain, so diagram.js draws it and the grammar carries the epistemic
     state — the observed links solid, the link that stops it dashed. */
  MACHINE_BOUNDARY: () => DG.draw(MC.boundary_diagram) +
    GR.ranked(MC.boundary.stops.map(x => ({
      label: `${x.entry} → ${x.stops_at}`, value: 1,
      display: x.closure.replace(/^CLOSABLE_BY_/, "").replace(/_/g, " ").toLowerCase(),
      dir: `last observed at ${x.last_observed_geography || "—"}`,
    })), { id: "machine-boundary", title: "Every walk, and what would close its last step",
      sub: "Each row is a walk of the registered graph from a world or national condition. None of them crosses into a county.",
      unit: "one row per entry point", geography: "world to New Mexico",
      caveat: MC.boundary.what_this_is_a_boundary_of }),
  MACHINE_IDENTITIES: () => GR.ranked(
    MC.identities.map(i => ({
      label: i.name, value: 1, display: i.status.replace(/_/g, " ").toLowerCase(),
      dir: i.sector, mark: i.status !== "CLOSES_IN_THE_DATA" && i.status !== "HOLDS_BY_CONSTRUCTION",
    })),
    { id: "machine-identities", title: "The four accounting identities, checked",
      sub: "An identity cannot be contradicted by data. Where it does not close, a term is unobserved or the specification is wrong.",
      unit: "status", geography: "United States and New Mexico",
      caveat: "The bar length is uniform on purpose: a status is not a quantity." }),
  MACHINE_DEBT: () => GR.ranked(
    Object.entries(MC.debt.faces).map(([k, f]) => ({
      label: k.toLowerCase(), value: 1,
      display: f.state === "UNKNOWN" ? "unknown"
        : (f.value != null ? String(f.value) : f.state.toLowerCase()),
      dir: f.unit || f.state.replace(/_/g, " ").toLowerCase(),
      mark: f.state === "UNKNOWN",
    })),
    { id: "machine-debt", title: "US household debt, in ten faces",
      sub: MC.debt.refuses, unit: "one row per face", geography: "United States",
      caveat: MC.debt.faces.DISTRIBUTION.this_is_the_one_that_matters }),
  MACHINE_NM_DEFLATOR: () => {
    const c = MC.identities.find(i => i.id === "ID_NM_PRICE_QUANTITY").check;
    return GR.ranked([
      { label: "nominal output", value: c.nominal_change_pct, display: `+${c.nominal_change_pct}%` },
      { label: "real output (volume)", value: c.real_change_pct, display: `+${c.real_change_pct}%` },
      { label: "implicit price deflator", value: c.price_change_pct, display: `+${c.price_change_pct}%`, mark: true },
    ], { id: "machine-nm-deflator",
      title: `New Mexico output, ${c.span}`,
      sub: `Price accounts for ${Math.round(c.price_share_of_nominal_growth * 100)}% of the nominal growth.`,
      unit: "percent change over the period", geography: "New Mexico",
      caveat: c.what_this_is_not });
  },
  MACHINE_HINGES: () => GR.ranked(
    Object.entries({
      "wire up what is already held": MC.acquisition.wire_up_instead.length,
      "derive from a recorded recipe": MC.acquisition.derive_instead.length,
      "acquire a published series": MC.acquisition.acquire.length,
      "fieldwork, governed": MC.acquisition.fieldwork_not_this_phase.length,
      "governed — never a download": MC.acquisition.governed_never_acquire.length,
      "not closable": MC.acquisition.not_closable.length,
    }).map(([k, v]) => ({ label: k, value: v, display: String(v),
      mark: k.startsWith("governed") })),
    { id: "machine-hinges", title: "What would close each hinge",
      sub: "A download must be justified by a hinge. Availability is not a justification.",
      unit: "count of hinges", geography: "the whole machine",
      caveat: MC.acquisition.rule }),
  /* PHASE 10J. Same primitives again. The boundary proof is a matrix because the
     question is "what does this become under each boundary"; the labour system is a
     flow table because the question is movement; propagation is drawn because it is a
     chain and the grammar can say every step of it is unobserved. */
  REGIONAL_BOUNDARY_RELATIVITY: () => GR.matrix(
    RG.boundary_matrix.rows, RG.boundary_matrix.cols, RG.boundary_matrix.cells,
    { id: "regional-boundary", title: "One event, read under four declared boundaries",
      sub: "Each row is a single stored record. Changing the boundary changes the reading, not the event.",
      unit: "classification", geography: "New Mexico and Texas",
      caveat: RG.boundary_relativity[0].proof }),
  REGIONAL_LABOUR_SYSTEM: () => GR.flows(
    RG.prototypes.labour.edges.map(e => ({
      from: e.from_name, to: e.to_name, value: e.jobs,
      share: `${e.share_of_destination_jobs}% of ${e.to_name}'s jobs · ${e.share_of_sender_residents ?? "—"}% of ${e.from_name}'s own working residents`,
    })),
    { id: "regional-labour", title: "Who fills the jobs in Los Alamos",
      sub: "Two shares, two denominators. By volume the largest supplier is Santa Fe; by dependence it is Rio Arriba.",
      unit: "jobs, 2022", geography: "county pairs, LODES 2022",
      caveat: "Counted in jobs. Earnings by origin county are not held, so none of this is a share of income." }),
  REGIONAL_STRUCTURE: () => GR.ranked(
    RG.connectivity.map(c => ({
      label: `${c.seed_name} — ${c.non_seed_members} other counties`,
      value: Math.max(c.edge_count, 0.001),
      display: `${c.edge_count} edges among members`,
      dir: c.structure.toLowerCase().replace("_", " "),
      mark: !c.is_a_functional_region,
    })),
    { id: "regional-structure", title: "Is the discovered set a region, or a star?",
      sub: "Edges running among the NON-SEED members. A set whose members connect only to the hub is not a system: a change in one spoke reaches the hub and stops.",
      unit: "count of edges at the 10% threshold", geography: "New Mexico and Texas",
      caveat: RG.refusals.find(r => r.id === "RF_NO_STAR_AS_REGION").why }),
  REGIONAL_RETENTION: () => GR.ranked(
    RG.retention.map(r => ({
      label: `${r.kind.toLowerCase()} under ${r.boundary.replace("BND_", "").replace("_", " ").toLowerCase()}`,
      value: r.share_percent, display: `${r.share_percent}%`,
      dir: r.flow.toLowerCase(), mark: r.kind === "LEAKAGE",
    })),
    { id: "regional-retention", title: "The same wages, under two boundaries",
      sub: `Both measured against the same denominator: ${RG.retention[0].denominator.what}.`,
      unit: "percent of jobs located in Los Alamos", geography: "Los Alamos County and its labour region",
      caveat: RG.retention[0].boundary_relative }),
  REGIONAL_PROPAGATION: () => DG.draw(RG.propagation_diagram),
  STATE_SYSTEM: () => DG.draw(LEG.diagrams.STATE_SYSTEM),
  LOSALAMOS_LABOUR: () => DG.metrics(LEG.labour_gap.metrics) + DG.draw(LEG.diagrams.LOSALAMOS_LABOUR),
  PUBLIC_FINANCE: () => DG.draw(LEG.diagrams.PUBLIC_FINANCE),
  NM_LABOUR_DEPENDENCE: () => GR.flows(GQ.nm.dependence.slice(0, 8), {
    unit: "jobs, and share of the sending county's working residents",
    geography: "county pair", time: "2022" })
    + det(`The same relationships ranked by ${GQ.nm.captions.dependence.alternate_ordering} instead`,
        GR.flows(GQ.nm.biggest_flows.slice(0, 8), { unit: "jobs",
          geography: "county pair", time: "2022",
          caveat: GQ.nm.captions.dependence.why })),
  NM_EARNINGS_COMPARISON: () => GR.ranked(GQ.nm.earnings, {
    sub: "The nine counties with employer-level data. Measured where the job is, not "
       + "where the worker lives.",
    unit: "average monthly private earnings", geography: "county of workplace",
    time: "2024 Q4", caveat: GQ.nm.captions.earnings.caveat }),
  NM_EMPLOYMENT_TREND: () => GR.line(GQ.nm.employment.map((e, i) => ({
      label: e.label, points: e.points,
      colour: i === 0 ? "var(--clay)" : i === 1 ? "var(--water)" : "var(--stone)",
      emphasis: i === 0 })), {
    sub: GQ.nm.captions.employment.sub,
    unit: "private jobs at workplaces",
    geography: GQ.nm.captions.employment.comparator_note, time: "annual",
    caveat: GQ.nm.employment[0].break_note || undefined }),
  NM_HOUSING_BURDEN: () => GR.scatter(GQ.nm.rent_burden, {
    xlabel: "median household income ($)", ylabel: "annual rent as % of median income",
    unit: "%", geography: "county", time: "2020-2024 five-year average",
    caveat: GQ.nm.captions.housing.caveat }),
  WORLD_CONFIGURATION: () => GR.matrix(GQ.world.matrix_rows, GQ.world.matrix_cols,
    GQ.world.matrix_cells, { unit: "mixed — see each column", geography: "country and bloc",
    time: "latest held" }),
  WORLD_CREDIT_COMPARISON: () => GR.ranked(GQ.world.credit, {
    unit: "private non-financial credit, % of GDP", geography: "country",
    time: "latest quarter held", caveat: GQ.world.captions.credit.caveat }),
  WORLD_STOCK_VS_SERVICE: () => GR.scatter(GQ.world.stock_vs_service, Object.assign({
    xlabel: "private credit, % of GDP", ylabel: "private debt service, % of income",
    unit: "% of GDP against % of income", geography: "country", time: "latest held" },
    { caveat: GQ.world.captions.stock_vs_service.caveat })),
  WORLD_LONG_CREDIT: () => GR.multiples(GQ.world.credit_long, {
    unit: "% of GDP", geography: "country", time: "to the latest quarter held" }),
  ...Object.fromEntries(Object.entries(LEG.place_visuals || {})
      .filter(([, v]) => v)
      .map(([f, v]) => [`PLACE_${f}`, () => DG.metrics(v.metrics) + DG.draw(v)
        + `<p class="muted">${esc(v.not_observed)}</p>`])),
  CHINA_JAPAN_ANALOGUE: () => GR.multiples(GQ.world.analogue, Object.assign({
    unit: "% of GDP, and annual %", geography: "China and Japan", time: "full held history" },
    { caveat: GQ.world.captions.analogue.caveat })),
};

function renderBeat(b, i) {
  const vis = b.visual && VISUAL[b.visual] ? VISUAL[b.visual]() : "";
  return `<section class="bt">
    <div class="bt-n">${i + 1}</div>
    <div class="bt-b">
      ${b.claim ? `<h2 class="bt-c">${esc(b.claim)}</h2>` : ""}
      ${vis}
      ${b.says ? `<p class="bt-s">${esc(b.says)}</p>` : ""}
      ${b.because ? `<p class="bt-w">${esc(b.because)}</p>` : ""}
      ${b.rival ? `<p class="bt-r"><b>What works against this.</b> ${esc(b.rival)}</p>` : ""}
      ${b.consequence ? `<p class="bt-k"><b>What it changes.</b> ${esc(b.consequence)}</p>` : ""}
      ${b.unknown ? `<p class="bt-u">${esc(b.unknown)}</p>` : ""}
      ${b.question ? `<p class="bt-q">${esc(b.question)}</p>` : ""}
    </div></section>`;
}

function renderReading(R) {
  const u = R.most_consequential_unknown, q = R.next_question;
  return `
  <section><h2>The reading</h2>
    <p class="lede">${esc(R.lede)}</p>
    <ol class="defn">${R.defining.map(d => `<li>${esc(d)}</li>`).join("")}</ol>
  </section>
  ${R.beats.map(renderBeat).join("")}
  <section><h2>The unknown that limits the next decision</h2>
    <div class="gap"><h3>${esc(u.gap)}</h3><p>${esc(u.why_it_limits)}</p>
      <p class="gap-s">Would resolve it: ${esc(u.would_resolve)}</p></div>
  </section>
  <section><h2>What to find out next</h2>
    <div class="card"><h3>${esc(q.question)}</h3>
      ${kv({ "What would have to be observed": q.observation_needed,
             "At what resolution": `${q.unit} · ${q.geography} · ${q.time}`,
             "Who could provide it": q.who_could_provide,
             "What it would distinguish": q.what_it_would_distinguish,
             "What decision it would change": q.what_decision_it_changes })}
      <p class="muted">${esc(q.not_a_recommendation)}</p></div>
  </section>`;
}

/* PHASE 10V. Machine states never reach Intelligence Mode. `sayState` is the only way a
 * state becomes visible there, and it returns economics rather than an enum. The enum
 * stays available in Model Mode, which is where a researcher goes to find it. */
const sayState = k => (LEG.state_words[k] || { label: String(k).replace(/_/g, " ").toLowerCase() });

/* The state machine names its world-entry points internally. A reader needs the system
 * they land on, not the identifier. The identifiers stay in Model Mode. */
const NM_FACE = {
  WE_FREIGHT: "freight and delivered input costs",
  "WE_FREIGHT / construction and food input costs": "construction and food input costs",
  WE_ENERGY_FISCAL: "state revenue and the services it funds",
  "WE_ENERGY_FISCAL — the Phase 8 world entry": "state revenue and the services it funds",
  WE_WATER: "water for irrigated production",
  WE_FEDERAL_SCIENCE: "federal science employment",
  "the Phase 8 labour shed": "the northern labour shed",
};

/* The circuit analysis comes from the OBSERVATORY, not from the state machine's own copy.
 * Phase 8 built the circuits before Phase 9 acquired the county-pair commuting matrix, so
 * newmexico.json still records the labour circuit breaking at the join that Phase 9
 * closed. Two held artefacts disagree, and the product must show the later one. This is a
 * product-integration decision, not a research change: nothing was recomputed. */
const CIRCUITS = OBS.circuits;

const esc = s => String(s ?? "").replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ul = a => `<ul>${(a || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
const det = (t, inner) => `<details><summary>${esc(t)}</summary><div class="in">${inner}</div></details>`;
const kv = o => `<dl class="kv">${Object.entries(o).filter(([, v]) => v).map(([k, v]) =>
  `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
const low = s => esc(String(s).replace(/_/g, " ").toLowerCase());
const n = v => v == null ? "—" : Math.abs(v) > 1e9 ? (v / 1e12).toFixed(1) + "T"
  : Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 });
/* A magnitude-aware money format. `n` jumps straight from plain digits to trillions, so an
   annual payroll of $15.26bn rendered as "$0.0T". Billions and millions get their own step. */
/* R3.21: and the sign goes outside the symbol. A loss shown as "$-23,568" reads as a dollar
   amount of something negative; "−$23,568" reads as a loss, which is what it is. */
const money = v => v == null ? "—"
  : (v < 0 ? "−" : "") + (a => Math.abs(a) >= 1e12 ? "$" + (a / 1e12).toFixed(2) + "tn"
    : Math.abs(a) >= 1e9 ? "$" + (a / 1e9).toFixed(2) + "bn"
      : Math.abs(a) >= 1e6 ? "$" + (a / 1e6).toFixed(1) + "m"
        : "$" + a.toLocaleString(undefined, { maximumFractionDigits: 0 }))(Math.abs(Number(v)));
const UNK = t => `<div class="refuse">UNKNOWN — ${esc(t)}</div>`;

const PIDS = Object.keys(PLACES.places);

/* ---- ROUTE. The route IS the state. One scope, one place, one mode, and a reload or a
   shared link resolves the same thing. Nothing survives a navigation. */
function route() {
  const h = (location.hash || "").replace(/^#\/?/, "");
  const [scope, a, b] = h.split("/");
  if (scope === "world") return { scope: "world", mode: a || "intelligence" };
  if (scope === "machine") return { scope: "machine", mode: a || "intelligence" };
  if (scope === "regional") return { scope: "regional", mode: a || "intelligence" };
  if (scope === "economy") return { scope: "economy", mode: a || "intelligence" };
  if (scope === "home" || !scope) return { scope: "home", mode: "intelligence" };
  if (scope === "systems") return { scope: "systems", mode: a || "network", sel: b || null };
  if (scope === "place" && PLACES.places[a])
    return { scope: "place", pid: a, mode: b || "overview", sel: h.split("/")[3] || null };
  return { scope: "nm", mode: (scope === "nm" && a) || "intelligence" };
}
function go(r) {
  location.hash = r.scope === "home" ? "/home"
    : r.scope === "place"
      ? `/place/${r.pid}/${r.mode || "overview"}${r.sel ? "/" + r.sel : ""}`
    /* The feasibility view is the one place where a mode has a subject, so the route carries
       it. Everywhere else a third segment would be state the URL does not need. */
    : (r.scope === "systems" && ["feasible", "opportunity"].includes(r.mode) && r.sel)
      ? `/systems/${r.mode}/${r.sel}`
      : `/${r.scope}/${r.mode || "intelligence"}`;
}
addEventListener("hashchange", render);

/* ---- SHELL. The selected scope and mode are unmistakable, and the shell is built from
   the SAME route the body reads, so the two cannot disagree. */
function shell(r, title, sub) {
  const scopes = [["home", "Dula"], ["nm", "New Mexico"], ["world", "The world"],
    ["machine", "The machine"],
    ["regional", "Regional systems"], ["economy", "Economy & capital"],
    ["systems", "The connected economy"]];
  return `
  <header class="sf">
    <div class="sf-mark">Dula · Economic Intelligence</div>
    <h1 class="sf">${esc(title)}</h1>
    <p class="sf-sub">${esc(sub)}</p>
    <div class="row" style="margin:16px 0 0">
      ${scopes.map(([s, l]) => `<span class="tag nav-chip${r.scope === s && !r.pid ? " on" : ""}"
        aria-current="${r.scope === s && !r.pid ? "page" : "false"}"
        style="cursor:pointer" data-go='${JSON.stringify({ scope: s, mode: r.mode })}'>${esc(l)}</span>`).join("")}
      ${/* R3.23: county names, because every page behind these chips measures a county.
             The row previously mixed seats and counties, which is the same substitution the
             page titles were making. */ ""}
      ${PIDS.map(id => `<span class="tag nav-chip${r.pid === id ? " on" : ""}"
        aria-current="${r.pid === id ? "page" : "false"}" style="cursor:pointer"
        data-go='${JSON.stringify({ scope: "place", pid: id, mode: r.mode })}'
        >${esc(PLACES.places[id].name.replace(" County", ""))}</span>`).join("")}
    </div>
    <div class="row" style="margin:10px 0 0">
      ${/* The connected economy is the same model seen four ways, so its modes are the four
            perspectives rather than the three this shell uses everywhere else. */
        (r.scope === "systems"
          ? ["opportunity", "network", "feasible", "discover", "change", "originate",
             "pathway", "system", "component", "strength"]
          : ["intelligence", "model", "evidence"]
        ).map(m => `<span class="tag mode-chip${r.mode === m ? " on" : ""}"
        aria-current="${r.mode === m ? "page" : "false"}"
        style="cursor:pointer" data-go='${JSON.stringify({ ...r, mode: m })}'>${m}</span>`).join("")}
    </div>
    <form class="row" style="margin:16px 0 0" id="askf">
      <input id="ask" placeholder="Ask about ${esc(title)}…" style="flex:1;min-width:16rem;
        padding:9px 12px;border:1px solid var(--line-2);border-radius:8px;background:#fff;
        font-family:inherit;font-size:14px">
    </form>
    <div id="answer"></div>
  </header>`;
}

/* ---- CONVERSATION. Scoped to the bound object by construction: it answers out of the
   same payload the page rendered, so it cannot be about the previous place. */
function ask(r, q) {
  const t = q.toLowerCase();
  const o = r.scope === "place" ? PLACES.places[r.pid]
    : r.scope === "world" ? WORLD : r.scope === "machine" ? MC
      : r.scope === "regional" ? RG : NM;
  const name = r.scope === "place" ? (o.seat || o.name)
    : r.scope === "world" ? "the world" : r.scope === "machine" ? "the machine"
      : r.scope === "regional" ? "regional systems" : "New Mexico";
  const pick = (...pairs) => {
    for (const [keys, fn] of pairs) if (keys.some(k => t.includes(k))) return fn();
    return null;
  };
  let a = null;
  if (r.scope === "place") {
    a = pick(
      [["how does", "how it work", "what is this"], () => o.reading.sentence || o.reading.why],
      [["depend on", "rely on"], () => (o.dependencies.filter(d => d.direction === "DEPENDS_ON")
        .map(d => `${d.other} — ${d.mechanism}`).join(" ") || `Nothing Dula holds is material enough to call ${name} dependent on one other place.`)],
      [["depends on it", "rely on it", "who relies"], () => (o.dependencies.filter(d => d.direction === "RELIED_ON_BY")
        .map(d => `${d.other} — ${d.mechanism}`).join(" ") || "Nothing observed depends on this place.")],
      [["chang"], () => o.changing.map(c => `${c.what}: ${c.level} (${c.as_of})`).join(" · ")],
      [["constrain", "harder"], () => (o.constraints.map(c => `${c.what} — ${c.plain}`).join(" ") || "Nothing observed here rises to a constraint.")],
      [["capab"], () => o.capabilities.map(c => `${c.capability}: ${c.plain}`).join(" ")],
      [["world"], () => o.world.map(w => `${w.world} → ${w.us} → ${w.here}${w.lands ? "" : " — but the chain stops before it gets here"}`).join(" ")],
      [["worth", "invest", "opportun"], () => o.opportunities.map(x => x.hypothesis ? `${x.status}: ${x.hypothesis}` : x.why).join(" ")],
      [["not know", "don't know", "unknown"], () => "Dula cannot see " + o.coverage.cannot_see.join("; ")],
      [["evidence", "show me"], () => "Open Evidence Mode: every number here comes from LODES 2022, the ACS 2020-2024 and QWI 2024-Q4, each with what it cannot be read as."],
    );
  } else if (r.scope === "regional") {
    title = "Regional systems";
    sub = "How a change reaches a place, and what a region is for that purpose.";
    body = r.mode === "model" ? regionalModel()
      : r.mode === "evidence" ? regionalEvidence() : regionalIntel();
  } else if (r.scope === "regional") {
    a = pick(
      [["what region", "what economic region", "which region"], () =>
        `There is no answer without saying for what. ${RG.overlapping[0].name} participates in ${RG.overlapping[0].system_count} systems whose geographies do not nest: ${RG.overlapping[0].functional_systems.map(f => `${f.system.toLowerCase()} — ${f.members.join(", ")}`).join("; ")}.`],
      [["labor system", "labour system", "los alamos"], () => {
        const p = RG.prototypes.labour;
        return `${p.region.member_names.join(", ")}, discovered from commuting flows. ` +
          p.edges.map(e => `${e.from_name} supplies ${e.share_of_destination_jobs}% of its jobs, which is ${e.share_of_sender_residents}% of ${e.from_name}'s own working residents`).join("; ") + ".";
      }],
      [["depend on albuquerque", "bernalillo"], () => {
        const b = RG.centrality.find(x => x.fips === "35001");
        return `${b.draws_workers_from.length} counties send Bernalillo at least 5% of the jobs located there, and ${b.sends_workers_to.length} receive at least 5% of Bernalillo's own working residents. That is a count of counterparties, not a weight.`;
      }],
      [["oil", "crude", "energy", "fuel"], () => {
        const e = RG.prototypes.energy;
        return `${e.why_this_geography} The path stops at ${e.path.first_unsupported_edge}, so the direction is supported and the magnitude is not.`;
      }],
      [["stop", "where does it stop", "evidence"], () =>
        Object.values(RG.prototypes).map(p => `${p.system_name}: stops at ${p.path ? p.path.first_unsupported_edge : "—"}`).join(" · ")],
      [["leak", "retention", "stays local", "remain"], () =>
        RG.retention.map(x => `${x.share_percent}% ${x.kind.toLowerCase()} under ${x.boundary}`).join("; ") + ". " + RG.retention[0].boundary_relative],
      [["county an economic unit", "is a county", "administrative"], () =>
        RG.refusals.find(x => x.id === "RF_NO_COUNTY_AS_ECONOMY").why],
      [["propagate", "intervention", "what happens after"], () =>
        `${RG.propagation.fixture_label}. ${RG.propagation.effects.length} expected effects over three orders; ${RG.propagation.compounding_claims} compounding, and attribution is ${RG.propagation.attribution}.`],
      [["connect santa fe and los alamos", "which systems connect"], () => {
        const p = RG.prototypes.labour;
        const e = p.edges.find(x => x.from === "35049");
        return `Labour: ${e.jobs.toLocaleString()} Santa Fe residents hold jobs in Los Alamos, ${e.share_of_destination_jobs}% of the jobs located there. Nothing else held connects them as a system.`;
      }],
      [["would have to be observed", "not know", "unknown"], () =>
        RG.reading.most_consequential_unknown.gap + " — " + RG.reading.most_consequential_unknown.why_it_limits],
    );
  } else if (r.scope === "machine") {
    a = pick(
      [["what is", "what does", "machine"], () => MC.reading.lede],
      [["how much", "coverage", "observe"], () =>
        `${MC.coverage.circuits.legs_observed} of ${MC.coverage.circuits.legs_total} circuit legs have a series behind them; ${MC.coverage.circuits.legs_represented_not_observed} name an object nothing measures. ${MC.coverage.no_total}`],
      [["boundary", "new mexico", "reach", "county"], () => MC.boundary.finding + " " + MC.boundary.consequence],
      [["identit", "accounting", "balance"], () =>
        MC.identities.map(i => `${i.name}: ${i.status.replace(/_/g, " ").toLowerCase()}`).join(" · ")],
      [["debt"], () => MC.debt.faces.BURDEN && MC.identities.find(i => i.id === "ID_HH_BURDEN").check.finding],
      [["bubble"], () => MC.bubble_gate.refusal + " " + MC.bubble_gate.what_can_be_said_instead],
      [["cycle", "where are we", "phase"], () => MC.no_master_cycle.why + " " + MC.no_master_cycle.what_is_offered_instead],
      [["acquire", "download", "next", "data"], () => MC.acquisition.why_nothing_was_acquired],
      [["wrong", "attack", "challeng"], () =>
        `Twenty attacks were run. ${["SURVIVED", "REVISED", "WITHDRAWN", "UNKNOWN"].map(v => `${MC.adversarial.filter(x => x.verdict === v).length} ${v.toLowerCase()}`).join(", ")}.`],
      [["not know", "unknown", "cannot see"], () => MC.reading.most_consequential_unknown.gap + " — " + MC.reading.most_consequential_unknown.why_it_limits],
      [["vintage", "revis"], () => MC.vintage.forbids],
    );
  } else if (r.scope === "world") {
    a = pick(
      [["happen", "what is"], () => WORLD.readings[0].claim],
      [["why"], () => "Debt is nominal and the income servicing it is nominal, so where the price level has stopped rising an unchanged debt stock is a larger claim on a smaller nominal income."],
      [["next", "happen next"], () => WORLD.futures[0].then],
      [["change the view", "wrong"], () => WORLD.readings[0].falsifier],
      [["new mexico", "reach"], () => WORLD.transmission.map(x => `${x.world} → ${x.us} → ${x.nm_interface} (stops at ${x.stops_at})`).join(" · ")],
      [["not know", "unknown"], () => WORLD.census.missing.join("; ")],
    );
  } else {
    a = pick(
      [["happen", "how does", "work"], () => NM.readings[0].claim],
      [["connect", "depend"], () => NM.dependencies.map(d => `${d.dependent} draws on ${d.provider} for ${d.draws}`).join(" · ")],
      [["not know", "unknown"], () => NM.overrepresented.cannot_be_made.join("; ")],
      [["constrain", "bottleneck"], () => NM.constraints.map(c => `${c.name} — ${c.grade}`).join(" · ")],
    );
  }
  return a || `Dula has no held answer to that about ${name}. It answers from what it holds, and it does not improvise.`;
}

/* ---- PLACE · INTELLIGENCE. Meaning, then relationships, then what is not known. */
const EV_TAG = { OBSERVED: "s", COMPUTED: "s", PROXY_ONLY: "w",
  SUGGESTED_BY_MODEL: "k", UNMEASURED: "u" };

function ecFact(f) {
  const v = f.value == null ? "—"
    : (f.unit === "USD" || (f.unit || "").startsWith("USD")) ? money(f.value)
      : n(f.value) + (f.unit ? " " + f.unit : "");
  return `<div class="row" style="justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap">
      <span>${esc(f.what)}</span>
      <span><span class="num">${esc(v)}</span>
        <span class="tag ${EV_TAG[f.evidence] || "u"}">${low(f.evidence)}</span></span></div>
    ${f.note ? `<p class="bt-u" style="margin:0 0 8px">${esc(f.note)}</p>`
      : f.source ? `<p class="muted" style="margin:0 0 8px">${esc(f.source)}</p>` : ""}`;
}

/* ---- PLACE · ECONOMIC INTELLIGENCE (R3.18).
   The page used to open with a commuting sentence and spend four sections on labour, because
   LODES is the most complete dataset held — not because commuting is the most important thing
   about an economy. It is now organised by the MODEL: what the economy produces, how value
   moves, what makes it productive, what is changing, what could be developed. The commuting and
   earnings analysis is preserved in full as ONE investigation among those five.

   Every figure comes from ec_place.place_economy, which computes from held observations. Where a
   flow is unmeasured the line says so and names what would measure it. */
function placeIntel(p) {
  const E = (ECPL.places || {})[p.id];
  if (!E || E.unavailable) return placeLabor(p, true);
  const C = E.coverage, S = E.productive_structure, G = E.at_a_glance;

  const F = E.findings || [], M = E.measures;
  return `
  ${F.length ? `<section>
    <h2>What this economy is doing</h2>
    ${E.geography ? `<p class="bt-u" style="margin:0 0 4px">${esc(E.geography.measured)}.
      ${E.geography.seat_is_context ? esc(E.geography.seat_is_context) : ""}</p>` : ""}
    ${F.map(f => `<div class="card" style="margin:14px 0 0">
      <b>${esc(f.headline)}</b>
      <p class="bt-s" style="margin:8px 0 0"><b>What is happening.</b> ${esc(f.what_is_happening)}</p>
      <p class="bt-w"><b>Why it matters.</b> ${esc(f.why_it_matters)}</p>
      <p class="bt-s"><b>The question that follows.</b> ${esc(f.question_that_follows)}</p>
      <p class="bt-u">Source: ${f.sources.map(esc).join("; ")}.
        ${f.qualifications.length ? " " + f.qualifications.map(esc).join("; ") + "." : ""}</p>
      <p class="bt-r">${esc(f.not_an_investment_claim)}</p>
    </div>`).join("")}
  </section>` : ""}

  ${M ? `<section>
    <h2>Where these numbers come from</h2>
    <p class="bt-u">${esc(M.the_rule)}</p>
    ${M.figures.map(x => `<div class="row"
      style="gap:12px;align-items:baseline;margin:0 0 8px;flex-wrap:wrap">
      <div class="num" style="font-size:16px;min-width:7rem">${
        String(x.unit).includes("USD") ? money(x.value) : n(x.value)}</div>
      <div style="min-width:10rem"><b style="font-size:13.5px">${esc(x.figure)}</b>
        <span class="tag w">${esc(x.programme)} ${esc(String(x.year))}</span></div>
      <div style="flex:1;min-width:16rem"><p class="bt-u" style="margin:0">${esc(x.measures)}</p>
        <p class="bt-w" style="margin:1px 0 0">excludes ${x.excludes.map(esc).join("; ")}</p></div>
    </div>`).join("")}
    ${M.reconciliations.map(rc => `<div class="card" style="margin:12px 0 0;background:var(--paper-2)">
      <b>${rc.figures.map(esc).join(" vs ")}</b>
      <p class="bt-s" style="margin:6px 0 0">${n(rc.values[0])} against ${n(rc.values[1])} —
        a difference of ${n(Math.abs(rc.difference))} (${Math.abs(rc.difference_pct)}%).
        ${rc.same_year ? "Same year, same county." : ""}</p>
      <p class="bt-u">${esc(rc.why)}</p>
      <p class="bt-r"><b>It is not ${esc(rc.what_it_is_not)}.</b> ${esc(rc.what_dula_cannot_do)}</p>
    </div>`).join("")}
  </section>` : ""}

  <section>
    <h2>How far the evidence actually goes</h2>
    ${E.geography ? `<p class="bt-r" style="margin:0 0 10px"><b>${esc(E.geography.measured)}.</b>
      ${esc(E.geography.qualification)}</p>` : ""}
    <p class="lede">${esc(C.reading)}</p>
    ${S.sector_total ? `<div class="row" style="gap:28px;margin:12px 0 0;align-items:flex-start;flex-wrap:wrap">
      <div><div class="num" style="font-size:24px">${n(S.sector_total.employment)}</div>
        <p class="bt-u" style="margin:2px 0 0">private jobs<br>${S.sectors.length} sectors</p></div>
      <div><div class="num" style="font-size:24px">${n(S.sector_total.establishments)}</div>
        <p class="bt-u" style="margin:2px 0 0">establishments</p></div>
      <div><div class="num" style="font-size:24px">${money(S.sector_total.payroll_usd_thousands * 1000)}</div>
        <p class="bt-u" style="margin:2px 0 0">annual payroll</p></div>
      ${S.business_dynamics ? `<div><div class="num" style="font-size:24px">${
        S.business_dynamics.net_job_creation > 0 ? "+" : ""}${n(S.business_dynamics.net_job_creation)}</div>
        <p class="bt-u" style="margin:2px 0 0">net jobs created<br>${S.business_dynamics_year}</p></div>` : ""}
    </div>` : ""}
    <h3 style="font-size:15px;margin:18px 0 6px">How much of this is actually known?</h3>
    <p class="bt-r">${esc(C.four_coverages.why_four_numbers)}</p>
    ${["economic", "research", "relationship", "decision"].map(k => {
      const d = C.four_coverages[k];
      return `<div class="row" style="gap:10px;align-items:baseline;flex-wrap:wrap">
        <span class="tag ${d.state === "HIGH" ? "s" : d.state === "LOW" || d.state === "NONE"
          || d.state === "NEAR ZERO" ? "u" : "w"}">${low(d.state)}</span>
        <b>${low(k)} coverage</b><span class="muted">${esc(d.question)}</span></div>
      <p class="bt-u" style="margin:0 0 8px">${esc(d.note)}</p>`;
    }).join("")}
    ${det("The figure R3.18 reported, and why it was wrong",
      `<p class="bt-r">${esc(C.four_coverages.research.corrects_r318)}</p>
       <p>${esc(C.four_coverages.research.and_still_does_not_mean)}</p>`)}
  </section>

  <section>
    <h2>Economic structure — what this economy produces</h2>
    ${S.sectors && S.sectors.length ? `
      <div class="chain">${S.sectors.slice().sort((a, b) => b.employment - a.employment)
        .map(x => `${String(x.employment).padStart(8)}  ${String(x.establishments).padStart(6)} est  ${x.name}`).join("\n")}</div>
      <p class="bt-u">${esc(S.sector_source.covers)}</p>
      ${det("How every job is accounted for", `
        <div class="chain">published total        ${n(S.sector_accounting.published_total)}
sum of sectors         ${n(S.sector_accounting.sum_of_sectors)}
unclassified           ${n(S.sector_accounting.unclassified)}
residual               ${n(S.sector_accounting.residual)}</div>
        <p>${esc(S.sector_accounting.residual_is)}</p>
        <p class="muted">${esc(S.sector_source.programme)}, ${esc(S.sector_source.classification)},
          ${esc(S.sector_source.measure)}</p>`)}
      <h3 style="font-size:15px;margin:18px 0 6px">By productive system</h3>
      <p class="bt-r">${esc(S.systems_are_not_additive)}</p>
      <div class="chain">${S.productive_systems.slice().sort((a, b) => b.employment - a.employment)
        .filter(x => x.employment)
        .map(x => `${String(x.employment).padStart(8)}  ${x.system}`).join("\n")}</div>
      ${S.business_dynamics ? `<h3 style="font-size:15px;margin:18px 0 6px">Firms entering and leaving</h3>
        <div class="chain">establishments         ${n(S.business_dynamics.establishments)}
firms                  ${n(S.business_dynamics.firms)}
entered                ${n(S.business_dynamics.entries)}
exited                 ${n(S.business_dynamics.exits)}
jobs created           ${n(S.business_dynamics.job_creation)}   of which from new firms ${n(S.business_dynamics.job_creation_from_births)}
jobs destroyed         ${n(S.business_dynamics.job_destruction)}
net                    ${n(S.business_dynamics.net_job_creation)}</div>` : ""}`
      : `<p class="bt-u">No county sector detail is published for this place.</p>`}
    <h3 style="font-size:15px;margin:18px 0 6px">What has been investigated within it</h3>
    <p>${esc(S.role)}</p>
    <p class="bt-r">${esc(S.inventory_is_not_structure)}</p>
    ${det("The actors, by what they do", `
      <p><b>Producing.</b> ${Object.entries(S.actors_producing).map(([k, v]) =>
        `${v} ${k.replace(/_/g, " ")}`).join(", ") || "none observed"}</p>
      <p><b>Moving.</b> ${Object.entries(S.actors_moving).map(([k, v]) =>
        `${v} ${k.replace(/_/g, " ")}`).join(", ") || "none observed"}</p>
      <p><b>Buying.</b> ${Object.entries(S.actors_buying).map(([k, v]) =>
        `${v} ${k.replace(/_/g, " ")}`).join(", ") || "none observed"}</p>`)}
  </section>

  ${E.interindustry ? `<section>
    <h2>Economic relationships — what depends on what</h2>
    <p class="bt-r"><b>${esc(E.interindustry.rule)}</b></p>
    ${E.interindustry.relationships.map(r => `<div class="card" style="margin:10px 0 0">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
        <b>${esc(r.name)}</b>
        <span class="tag ${r.evidence === "ACTOR_OBSERVED" ? "s"
          : r.evidence === "NATIONAL_IO" ? "w" : "u"}">${low(r.evidence)}</span></div>
      <p class="bt-u" style="margin:3px 0 0">${esc(r.means)}</p>
      <p style="margin:6px 0 0">${esc(r.the_local_question)}</p>
      ${r.national_pattern ? det("What this industry buys, nationally",
        `<div class="chain">${r.national_pattern.map(x =>
          `${String(Math.round(x.share_of_intermediate_inputs * 100)).padStart(4)}%  ${x.commodity}`).join("\n")}</div>
         <p class="bt-r">These are United States averages. No regional multiplier or leakage
           figure is computed from them.</p>`) : ""}
      <p class="bt-w" style="margin:6px 0 0"><b>What would settle it.</b> ${esc(r.what_would_settle_it)}</p>
    </div>`).join("")}
  </section>` : ""}

  <section>
    <h2>Economic flows — how value moves, and what is not counted</h2>
    ${E.economic_flows.map(ecFact).join("")}
  </section>

  <section>
    <h2>System strength — what makes this economy productive</h2>
    <p class="bt-u">S = f(K, C, L, U, X, H). No score is computed: f is not specified, and six
      partial measurements with an unknown f do not make a seventh number.</p>
    ${Object.entries(E.system_strength).map(([k, d]) => `<div class="card" style="margin:10px 0 0">
      <b>${esc(k)} · ${esc(d.name)}</b>
      <div style="margin:6px 0 0">${d.items.map(ecFact).join("")}</div>
    </div>`).join("")}
  </section>

  <section>
    <h2>Economic change — what is moving, and what reaches here</h2>
    <p class="bt-r">${esc(E.economic_change.note)}</p>
    ${E.economic_change.changing.map(c => `<div class="bt"><div class="bt-n"></div><div class="bt-b">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <b>${esc(c.what)}</b><span class="tag ${c.direction === "UNKNOWN" ? "u" : "s"}"
          >${low(c.direction)}</span><span class="tag u">${esc(c.as_of)}</span></div>
      <p style="margin:3px 0 0">${esc(c.level)}</p>
      ${c.why_unknown ? `<p class="bt-u" style="margin:3px 0 0">${esc(c.why_unknown)}</p>` : ""}
    </div></div>`).join("")}
    <h3 style="font-size:15px;margin:16px 0 6px">What the world does to this place</h3>
    ${E.economic_change.world_chains.map(w2 => `<div class="card" style="margin:8px 0 0">
      <div class="chain">${esc(w2.world)}
  ↓ ${esc(w2.us)}
  ↓ ${esc(w2.here)}${w2.lands ? "" : `\n  <span class="stop">the chain stops before it gets here</span>`}</div>
      ${w2.stops_because ? `<p class="bt-w" style="margin:4px 0 0">${esc(w2.stops_because)}</p>` : ""}
    </div>`).join("")}
    ${E.economic_change.constraints.length
      ? E.economic_change.constraints.map(c => `<div class="card" style="margin:8px 0 0">
          <b>${esc(c.what)}</b><p style="margin:3px 0 0">${esc(c.plain)}</p>
          <p class="fnd-so" style="margin:3px 0 0">${esc(sayState(c.grade).label)}${
            sayState(c.grade).note ? " — " + esc(sayState(c.grade).note) : ""}</p></div>`).join("")
      : `<p class="bt-u">Nothing observed here rises to a constraint on this evidence.</p>`}
  </section>

  <section>
    <h2>Development — what could be built, and what does not apply</h2>
    <p class="bt-r"><b>${esc(E.development.regional_hypotheses_do_not_transfer)}</b></p>
    <p class="bt-s">${esc(E.development.the_relationship_that_does_hold)}</p>
    ${E.development.place_opportunities.map(x => `<div class="card" style="margin:10px 0 0">
      <div class="row" style="gap:8px;flex-wrap:wrap"><span class="tag ${x.status === "NOT READY" ? "u" : "k"}"
        >${low(x.status)}</span></div>
      ${x.hypothesis ? `<b>${esc(x.hypothesis)}</b>` : `<p style="margin:4px 0 0">${esc(x.why)}</p>`}
    </div>`).join("")}
    <h3 style="font-size:15px;margin:16px 0 6px">What it can and cannot put to work</h3>
    ${E.development.capabilities.map(c => `<div class="bt"><div class="bt-n"></div><div class="bt-b">
      <b>${esc(c.capability)}</b>
      <p style="margin:3px 0 0">${esc(c.plain)}</p>
      <p class="bt-u" style="margin:3px 0 0">exists: ${low(c.exists)} ·
        can be mobilised: ${low(c.can_be_mobilised)}</p>
    </div></div>`).join("")}
    <p class="bt-w" style="margin:12px 0 0"><b>What would make a local hypothesis possible.</b></p>
    <ul>${E.development.what_would_make_a_local_hypothesis_possible
      .map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <p class="bt-u">Open <b>The connected economy → discover</b> to see how opportunity
      hypotheses are derived, and <b>→ change</b> for the intervention economics behind them.</p>
  </section>

  ${placeLabor(p, false)}

  <section>
    <h2>What cannot be observed here</h2>
    ${(C.cannot_see || []).slice(0, 3).map(x => `<div class="gap">
      <h3>${esc(String(x).split(" — ")[0])}</h3>
      ${String(x).includes(" — ") ? `<p>${esc(String(x).split(" — ")[1])}</p>` : ""}
    </div>`).join("")}
    ${det("What is observed here, and the full list of what is not",
      `<p>Observed: ${esc((C.can_see || []).join(", "))}.</p>` + ul(C.cannot_see || []))}
  </section>`;
}

/* The commuting and earnings investigation. Preserved whole — it is good work and the most
   complete evidence this place has. It is simply no longer the entire economic story. */
function placeLabor(p, alone) {
  const w = p.works_here, o = p.works_elsewhere;
  const PV = (LEG.place_visuals || {})[p.id];
  const PT = GQ.nm.earnings.some(r => r.label === p.name.replace(" County", ""));
  const PE = (GQ.employment_detail || {})[p.id];
  const dep = p.dependencies.filter(d => d.direction === "DEPENDS_ON");
  const rel = p.dependencies.filter(d => d.direction === "RELIED_ON_BY");
  const PR = (RD.places || {})[p.id];
  return `
  <section>
    <h2>Labor and regional flows</h2>
    ${alone ? "" : `<p class="bt-u">The most complete evidence this place has, and one
      investigation among five.</p>`}
    ${alone && PR ? renderReading(PR) : ""}
    ${p.reading.sentence ? `<p>${esc(p.reading.sentence)}</p>` : ""}
    ${PV ? DG.metrics(PV.metrics) : ""}
    ${PV ? DG.draw(PV) : ""}
    ${PV ? `<p class="muted">${esc(PV.not_observed)}</p>` : ""}
    ${det("The counts behind it", `<div class="card"><div class="chain">${[
      w && `jobs located here        ${n(w.total_jobs_here)}`,
      w && `  filled by residents    ${n(w.filled_by_residents)}`,
      w && `  filled from elsewhere  ${n(w.filled_from_elsewhere)}   ${w.share_from_elsewhere}%`,
      o && `working residents        ${n(o.total_working_residents)}`,
      o && `  work in the county     ${n(o.work_here)}`,
      o && `  work somewhere else    ${n(o.leave)}   ${o.share_leaving}%`,
    ].filter(Boolean).map(esc).join("\n")}</div>
    <p class="muted">Two flows, counted separately. A commuter count is not an income flow.</p></div>`)}
    ${!w && !o ? UNK("no labour relationship is observed here") : ""}
    ${[...dep, ...rel].length ? det("What it depends on, and what depends on it",
      [...dep, ...rel].map(d => `<div class="card">
        <h3>${esc(d.direction === "DEPENDS_ON"
          ? `${d.this_place} relies on ${d.other}` : `${d.other} relies on ${d.this_place}`)}</h3>
        <p class="muted">for ${esc(d.for)}</p>
        ${kv({ "How it works": d.mechanism, "What would break it": d.could_break_it,
               "Not measured": d.unknown })}</div>`).join("")) : ""}
    ${PT ? GR.ranked(GQ.nm.earnings.map(r => Object.assign({}, r,
        { mark: r.label === p.name.replace(" County", "") })), {
      title: `Average private earnings at workplaces, with ${esc(p.name)} County marked`,
      unit: "average monthly private earnings", geography: "county of workplace",
      time: "2024 Q4",
      caveat: "County averages over different occupation and industry mixes, measured "
            + "where the job is rather than where the worker lives." }) : ""}
    ${PE ? GR.line([{ label: PE.name, points: PE.points, colour: "var(--clay)", emphasis: true }], {
      unit: "private jobs at workplaces", geography: PE.name, time: "annual",
      caveat: PE.note || undefined }) : ""}
  </section>`;
}

/* ---- PLACE · MODEL. The formal objects. Flows carry BOTH magnitude and share, and the
   share is of the DEPENDENT — ranking by the provider's volume hides whoever most
   depends on it. */
function placeModel(p) {
  const rows = [
    ...(p.works_here?.origins || []).map(x => ({ dir: "in", other: x.place, jobs: x.jobs, share: x.share })),
    ...(p.works_elsewhere?.destinations || []).map(x => ({ dir: "out", other: x.place, jobs: x.jobs, share: x.share })),
  ];
  return `<section><h2>Model</h2>
  <p class="muted">The formal objects under the reading. The second screen, not the first.</p>
  <div class="card"><h3>Observed flows</h3>
    <div class="chain">${rows.map(x =>
      `${x.dir === "in" ? esc(x.other) + " → " + esc(p.name) : esc(p.name) + " → " + esc(x.other)}
    ${n(x.jobs)} jobs    ${x.share}% of the ${x.dir === "in" ? "jobs here" : "residents who work"}`).join("\n")}</div>
    <p class="muted">Magnitude and share are both kept. A large flow can be a small share
    of the sender, and a small flow can be most of what a small place does.</p></div>
  ${p.dependencies.map(d => `<div class="card"><h3>${low(d.direction)}</h3>${kv({
    from: d.this_place, to: d.other, for: d.for, mechanism: d.mechanism,
    observed: d.observed, unknown: d.unknown, breaks_if: d.could_break_it })}</div>`).join("")}
  ${p.constraints.map(c => `<div class="card"><h3>${esc(c.grade)}</h3>${kv(c)}</div>`).join("")}
  ${p.capabilities.map(c => `<div class="card"><h3>${esc(c.capability)}</h3>${kv({
    existence: c.exists, mobilisation: c.can_be_mobilised })}</div>`).join("")}
  </section>`;
}

/* ---- EVIDENCE. Where the old Overview's ledger belongs: a record count answers "what
   does Dula hold", which is an evidence question, not an economic one. */
function evidenceFor(label, sources) {
  return `<section><h2>Evidence</h2>
  <p class="muted">Where every number in ${esc(label)} comes from, and what each source
  cannot be read as. This is the third screen.</p>
  ${sources.map(s => `<div class="card"><h3>${esc(s.title)}</h3>${kv(s.fields)}</div>`).join("")}
  </section>`;
}
const PLACE_SOURCES = [
  { title: "LEHD LODES8 origin-destination, 2022", fields: {
    Publisher: "U.S. Census Bureau, Longitudinal Employer-Household Dynamics",
    Unit: "jobs, by census block of residence and block of workplace",
    "Used here as": "county-to-county job flows, aggregated from block pairs",
    "Cannot be read as": "a count of commuting PERSONS — one person with two jobs is counted twice — nor as current conditions; the reference year is 2022",
    Noise: "infused for confidentiality; small cells are the least reliable" } },
  { title: "ACS 2020-2024 five-year estimates", fields: {
    Publisher: "U.S. Census Bureau",
    "Used here as": "population, age structure, housing stock, rent and income",
    "Cannot be read as": "a statement about any single year; a five-year average cannot date a turn" } },
  { title: "QWI 2024-Q4", fields: {
    Publisher: "U.S. Census Bureau",
    "Used here as": "private employment and average earnings at workplaces",
    "Cannot be read as": "total employment — ownercode A05 is PRIVATE employers only, so government is excluded" } },
  { title: "What Dula holds, by count", fields: {
    Note: "Record counts live here because 'how many rows does Dula hold' is a question about the evidence, not about the economy. The old Overview led with them; that was the defect Phase 10P and 10R exist to fix.",
    "Why not on the Overview": "A count tells a reader nothing about how a place works." } },
];

/* ---- NEW MEXICO. §AC hierarchy: the reading, then how it works, then what matters,
   then relationships, pressures, the world, questions, blind spots. Every section is
   written for someone who has never heard of this model. */
/* ---- THE MACHINE. Phase 10I. The machine is a scope like the world or the state: a
   bound object with three modes over one payload. Intelligence is the reading, rendered
   through renderReading() so a machine beat and a place beat share one code path.
   Model is the registry. Evidence is the coverage census and the attack record. */
/* ---- REGIONAL SYSTEMS. Phase 10J. A fourth scope, same three modes, same renderers.
   Intelligence is the reading. Model is the boundary registry and the paths. Evidence
   is where each path stops and what was attacked. */
function regionalIntel() {
  return renderReading(RG.reading) + `
  <section><h2>What this phase refused</h2>
    ${RG.refusals.map(r => `<div class="card"><h3>${esc(r.refuses)}</h3>
      ${kv({ "Why": r.why, "What it prevents": r.prevents })}</div>`).join("")}
  </section>`;
}

function regionalModel() {
  const P = RG.prototypes;
  return `<section><h2>Model</h2>
  <p class="muted">Declared boundaries, and the paths that cross or stay inside them.</p>
  <div class="card"><h3>What a boundary is, and what it is not</h3>
    ${kv({ "Declared": "a boundary is an analytical frame somebody draws. Any of these is legitimate.",
           "Tested": "whether the thing inside it is a functional region is a separate claim, and one of the four fails it.",
           "Classification": "transmission, inflow, outflow and internal movement are properties of an event RELATIVE to a boundary, not of the event." })}</div>
  ${RG.boundaries.map(b => `<div class="card"><h3>${esc(b.name)}</h3>
    ${kv({ type: b.boundary_type, purpose: b.purpose,
           geographies: b.geography_count,
           structure: b.structure || "—",
           "is a functional region": b.is_a_functional_region === null ? "not tested — this is an observation unit"
             : b.is_a_functional_region ? "yes" : "NO",
           "why it is economically meaningful": b.why_economically_meaningful,
           "geography": b.derived_from })}
    ${b.known_blind_spots.length ? `<p class="bt-u">${esc(b.known_blind_spots[0])}</p>` : ""}
    </div>`).join("")}
  <div class="card"><h3>A transmission gate is not a hinge</h3>
    ${kv(RG.gate_vs_hinge)}</div>
  ${Object.values(P).map(p => {
    const path = p.path;
    return `<div class="card"><h3>${esc(p.system_name)}</h3>
    ${kv({ mechanism: p.mechanism_kind + (p.is_non_price ? " — non-price" : ""),
           "geography provenance": p.geography_provenance || (p.geography_discovered ? "DISCOVERED" : "—"),
           "geography the path found": p.geography_discovered || "—" })}
    ${path ? `<div class="chain">${[path.edges.map(e =>
        `${esc(e.from_name || e.from)}  →  ${esc(e.to_name || e.to)}   [${esc(e.relationship || "")}]`).join("\n"),
        path.first_unsupported_edge ? `✕  ${esc(path.first_unsupported_edge)}   EVIDENCE STOPS` : ""]
        .filter(Boolean).join("\n")}</div>
      ${kv({ "first unsupported edge": path.first_unsupported_edge || "none — the walk ran out of relationships",
             "why it stops": path.evidence_stops_because || "—",
             "direction only": path.direction_only ? "yes — pass-through is not observed" : "no",
             "terms observed": `${path.terms_observed} of ${path.decomposition.length}`,
             "alternative path": path.alternative_path,
             "falsification": path.falsification })}
      <p class="muted">${esc(path.decomposition_rule)}</p>` : ""}
    ${p.hinge || (path && path.hinge) ? (() => { const h = p.hinge || path.hinge;
      return `<h3 style="margin-top:14px">Hinge — ${esc(h.economic_quantity)}</h3>
      ${kv({ unit: h.unit, geography: h.geography, time: h.time,
             "evidence state": h.evidence_state,
             "why not measured": h.why_not_measured,
             "upstream": (h.upstream_causes || []).join("; "),
             "downstream": (h.downstream_consequences || []).join("; ") })}`; })() : ""}
    ${path && path.transmission_gate ? `<h3 style="margin-top:14px">Gate — ${esc(path.transmission_gate.parameter)}</h3>
      ${kv({ controls: path.transmission_gate.controls,
             state: path.transmission_gate.evidence_state,
             "is not": path.transmission_gate.is_not })}` : ""}
    </div>`;
  }).join("")}
  <div class="card"><h3>The discovery procedure</h3>
    <div class="chain">${RG.discovery_steps.map((s_, i) => `${i + 1}. ${esc(s_)}`).join("\n")}</div>
    <p class="muted">It must be able to return NO FUNCTIONAL SYSTEM IDENTIFIED, and for
     federal spending in New Mexico it does: ${esc(RG.discovery_examples.refused_federal.why || "")}</p></div>
  </section>`;
}

function regionalEvidence() {
  const c = RG.top_down_vs_bottom_up, t = RG.transitive_dissolution, s_ = RG.threshold_sensitivity;
  return `<section><h2>Evidence</h2>
  <p class="muted">Where each reading comes from, how sensitive it is, and what was attacked.</p>
  <div class="card"><h3>Does the region survive a different threshold?</h3>
    ${GR.ranked(s_.by_threshold.map(b => ({ label: `${b.threshold}% threshold`,
      value: b.size, display: `${b.size} counties`, dir: b.members.join(", ") })),
      { id: "regional-threshold", title: "", sub: "", unit: "counties in the discovered region",
        caveat: s_.reads_as })}
    <p class="${s_.stable ? "muted" : "bt-u"}">${s_.stable ? "Stable across thresholds."
      : "NOT stable. The region shrinks smoothly as the threshold rises, which means it is a gradient rather than a bounded thing. Santa Fe is the last county to drop out."}</p></div>
  <div class="card"><h3>What indirect connection does to it</h3>
    ${kv({ "direct": `${t.direct_size} counties`, "after ${t.by_rounds.length} rounds": `${t.transitive_size} counties`,
           "dissolves": t.dissolves ? "yes" : "no" })}
    <p>${esc(t.finding)}</p><p class="muted">${esc(t.why_it_matters)}</p></div>
  <div class="card"><h3>Top-down against bottom-up</h3>
    ${kv({ "top-down from Brent reaches": c.top_down_reaches,
           "bottom-up from Santa Fe reaches": (c.bottom_up_region || []).join(", "),
           "agree": c.agree ? "yes" : "no" })}
    <p>${esc(c.finding)}</p></div>
  <div class="card"><h3>Volume, dependence, centrality and concentration</h3>
    ${kv(RG.measures)}
    ${GR.ranked(RG.concentration.filter(x => x.concentration != null).map(x => ({
      label: x.name, value: x.concentration, display: `${x.concentration}%`,
      dir: `to ${x.largest_destination}, ${x.counterparties} counterparties` })),
      { id: "regional-concentration", title: "", sub: "Share of a county's out-commuters going to its single largest destination.",
        unit: "percent of its own out-commuters", caveat: RG.concentration[0].is_not })}</div>
  <div class="card"><h3>Thirty attacks on this phase</h3>
    ${RG.adversarial.map(x => `<div class="gap"><h3>${x.n}. ${esc(x.attack)}</h3>
      <p class="gap-s">${esc(x.verdict)}</p><p>${esc(x.finding)}</p></div>`).join("")}
  </div>
  </section>`;
}

function machineIntel() {
  return renderReading(MC.reading) + `
  <section><h2>What this phase refused</h2>
    ${MC.refusals.map(r => `<div class="card"><h3>${esc(r.refuses)}</h3>
      ${kv({ "Instead": r.instead, "What it prevents": r.prevents })}</div>`).join("")}
  </section>`;
}

function machineModel() {
  const t = MC.coverage.variables.by_type;
  const cs = MC.circuits;
  return `<section><h2>Model</h2>
  <p class="muted">The machine's own objects: what each variable is, where it sits, and
   what depends on it.</p>
  <div class="card"><h3>Variable types</h3>
    ${kv(Object.fromEntries(Object.entries(t).filter(([, v]) => v)
      .map(([k, v]) => [k.toLowerCase(), `${v} — ${MC.types[k]}`])))}
    <p class="muted">A ratio is never summed, a stock is never added to a flow, and no
     composite is formed from any of them.</p></div>
  <div class="card"><h3>What the type system forbids</h3>
    ${kv(MC.forbidden_operations)}</div>
  ${cs.map(c => `<div class="card"><h3>${esc(c.name)}</h3>
    ${kv({ scale: c.scale, question: c.question,
           observed: `${c.observed_legs} of ${c.total_legs} legs`,
           "represented, not observed": c.represented_not_observed,
           "declared absent by the author": c.declared_absent,
           actors: c.actors.join(", ") || "none — every transition in this circuit reads as arithmetic",
           "known gap": c.known_gap })}
    <div class="chain">${c.legs.map(l =>
      `${esc(l.id)}  ${esc(l.state.padEnd(16))}  ${esc(l.step)}`).join("\n")}</div>
    </div>`).join("")}
  <div class="card"><h3>Why there is no cycle label</h3>
    ${kv({ refused: MC.no_master_cycle.refused,
           "would have looked like": MC.no_master_cycle.examples_refused.join(", "),
           why: MC.no_master_cycle.why,
           instead: MC.no_master_cycle.what_is_offered_instead,
           precedent: MC.no_master_cycle.precedent })}</div>
  <div class="card"><h3>Configuration, held in ${Object.keys(MC.configuration_dimensions).length} dimensions</h3>
    ${kv(MC.configuration_dimensions)}
    <p class="muted">${esc(MC.configuration_refusals.NETTING_OPPOSITES)}</p></div>
  </section>`;
}

function machineEvidence() {
  const v = MC.coverage.variables, c = MC.coverage.circuits, a = MC.analogue_2007;
  return `<section><h2>Evidence</h2>
  <p class="muted">What is observed, what is not, and what was attacked.</p>
  <div class="card"><h3>Coverage</h3>
    ${kv({ "variables typed": v.registered, "refused": v.refused,
           "observed at the needed scale": v.observed_at_needed_scale,
           "observed above the needed scale": v.observed_coarser,
           "named and unobserved": v.unknown,
           "named by nothing in the machine": v.orphaned,
           "circuit legs observed": `${c.legs_observed} of ${c.legs_total}`,
           "circuits with no actor": c.circuits_with_no_actor.join(", "),
           "circuits wholly unobserved": c.wholly_unobserved.join(", ") || "none" })}
    <p class="muted">${esc(MC.coverage.no_total)}</p></div>
  <div class="card"><h3>Vintage</h3>
    ${kv(Object.fromEntries(Object.entries(MC.vintage.counts)
      .map(([k, n_]) => [k.toLowerCase().replace(/_/g, " "), n_])))}
    <p><b>What this forbids.</b> ${esc(MC.vintage.forbids)}</p>
    <p class="muted">${esc(MC.vintage.example_of_the_error)}</p></div>
  <div class="card"><h3>Now against ${esc(a.then.slice(0, 7))}, dimension by dimension</h3>
    ${GR.matrix(a.dimensions.map(d => ({ id: d.dimension, label: d.dimension.toLowerCase().replace(/_/g, " ") })),
      [{ id: "then", label: a.then.slice(0, 7) }, { id: "now", label: "latest" }],
      Object.fromEntries(a.dimensions.flatMap(d => [
        [`${d.dimension}|then`, { display: String(d.then), direction: "FLAT" }],
        [`${d.dimension}|now`, { display: String(d.now), direction: d.direction === "HIGHER" ? "RISING" : d.direction === "LOWER" ? "FALLING" : "FLAT" }],
      ])),
      { id: "machine-analogue", title: "", sub: "", unit: "each row in its own unit",
        caveat: a.refuses })}
    <p class="muted">Never returned: ${esc(a.never.join("; "))}.</p></div>
  <div class="card"><h3>Twenty attacks on this phase</h3>
    ${MC.adversarial.map(x => `<div class="gap"><h3>${x.n}. ${esc(x.attack)}</h3>
      <p class="gap-s">${esc(x.verdict)}</p><p>${esc(x.finding)}</p></div>`).join("")}
  </div>
  </section>`;
}

function nmIntel() {
  const cp = OBS.county_pairs || {};
  return renderReading(RD.nm) + `
  <section><h2>What could not be charted, and why it matters</h2>
    <p class="muted">Six questions worth asking cannot be drawn from what is held. Two of
    them are findings rather than gaps, and they appear in the reading above.</p>
    ${GQ.refusals.map(r => GR.refusal(r)).join("")}
  </section>

  <section><h2>What this reading does not cover</h2>
    <p class="muted">Labour is the only movement between named places that anyone
    observes. Money, goods, public spending, procurement and capital move between these
    counties too, and none of them is measured as a pair.</p>
    ${DG.metrics([
      { value: cp.observed_cross_county_pairs, label: "county pairs with an observed labour flow",
        note: `of ${(cp.possible_cross_county_pairs || 0).toLocaleString()} possible` },
      { value: cp.jobs_in_cross_county_pairs, label: "jobs that cross a county line" },
    ])}
    ${LEG.blind_spots.map(bs => `<div class="gap"><h3>${esc(bs.gap)}</h3>
      <p>${esc(bs.why_it_matters)}</p>
      <p class="gap-s">${esc(bs.status.label)}</p></div>`).join("")}
  </section>`;
}

function nmModel() {
  return `<section><h2>Model</h2>
  <p class="muted">The state machine's own objects.</p>
  <div class="card"><h3>Boundary</h3>
    <div class="chain">${Object.entries(NM.boundary.worked_example).map(([k, v]) =>
      `${esc(k)}  →  ${low(v)}`).join("\n")}</div>
    <p class="muted">${esc(NM.boundary.rule)}</p></div>
  ${NM.flows.map(f => `<div class="card"><h3>${esc(f.id)}</h3>${kv({
    class: f.flow_class, from: f.source, to: f.destination, relation: f.relation,
    magnitude: f.magnitude, quantity: f.quantity == null ? "" : n(f.quantity),
    mechanism: f.mechanism, limitations: f.limitations })}</div>`).join("")}
  ${NM.hinges.map(h => `<div class="card"><h3>${esc(h.name)}</h3>${kv({
    grade: h.grade, scope: h.scope, identity: h.identity_validity.state,
    why_not_leverage: h.why_not_leverage })}</div>`).join("")}
  </section>`;
}

/* ---- WORLD. Inside the same product, not a separate demo. */
function worldIntel() {
  return renderReading(RD.world) + `
  <section><h2>What could change this view</h2>
    <p class="muted">Each of these was tried against the reading. Two changed it.</p>
    ${WORLD.adversarial.attacks.map(at => {
      const verdict = at.result.startsWith("SUCCEEDED") ? "This one landed"
        : at.result.startsWith("PRODUCED") ? "This one found something else"
        : at.result.startsWith("FAILED") ? "The reading survived this"
        : "A standing limitation";
      const econ = at.result
        .replace(/^(SUCCEEDED|FAILED|PRODUCED A NEW READING|STANDS AS A LIMITATION)[.,]?\s*/, "")
        .replace(/\bThe first draft claimed\b/, "The first version of this reading said")
        .replace(/\b(Phase \d+\w*|It is now W3\.?)/g, "").replace(/\s{2,}/g, " ").trim();
      return `<div class="fnd"><div class="fnd-n">${esc(verdict === "This one landed" ? "✕" : "·")}</div>
        <div class="fnd-b"><h3>${esc(at.attack.replace(/^([a-z])/, c => c.toUpperCase()))}</h3>
        <p>${esc(econ)}</p><p class="fnd-so">${esc(verdict)}.</p></div></div>`;
    }).join("")}
  </section>

  <section><h2>Deeper history</h2>
    <p class="muted">Below the reading: the same price series over the full held period,
    which adds context the argument above does not rest on.</p>
    ${GR.multiples(GQ.world.price_long, { unit: "annual %", geography: "country",
      time: "annual, to 2025",
      caveat: "Annual observations cannot date a turning point inside a year." })}
  </section>`;
}

function worldModel() {
  return `<section><h2>Model</h2>
  ${WORLD.readings.map(r => `<div class="card"><h3>${esc(r.id)}</h3>${kv({
    status: r.status, strength: r.claim_strength, geography: r.geography,
    decisive_unknown: r.decisive_unknown, falsifier: r.falsifier })}</div>`).join("")}
  ${WORLD.scenarios.map(s => `<div class="card"><h3>${esc(s.name)}</h3>
    <div class="chain">${s.trace.map(t => `<b>${esc(t.order)}</b> ${esc(t.claim)}`).join("\n  ↓ ")}</div>
    </div>`).join("")}
  <div class="card"><h3>Interaction</h3>${kv({ claim: WORLD.interaction.claim,
    mechanism: WORLD.interaction.mechanism, "what this is not": WORLD.interaction.is_not })}</div>
  </section>`;
}

const WORLD_SOURCES = [
  { title: "World Bank World Development Indicators", fields: {
    Publisher: "The World Bank", Economies: "13, of which 12 are not the United States",
    "Temporal": "annual, 1960-2025",
    "Revision policy": "REVISED WITHOUT VINTAGES — the API serves the current vintage only, so no historical reconstruction from it can reproduce what was knowable at the time",
    "Cannot be read as": "a current-quarter observation, or a measure of productive capability" } },
  { title: "BIS credit to the non-financial sector, and debt service ratios", fields: {
    Publisher: "Bank for International Settlements", Temporal: "quarterly",
    "Cannot be read as": "a crisis state. Debt service ratios are BIS ESTIMATES built from an assumed maturity and interest rate, not observed payment records",
    "A ratio of a stock to a flow": "credit-to-GDP moves with its denominator; a falling ratio can mean rising GDP rather than falling debt" } },
];

/* ---- ECONOMY & CAPITAL. R3.10, improved in R3.11.
 *
 * Chains are drawn by dula/diagram.js, whose grammar carries two channels: LINE STYLE is how
 * sure we are the relationship exists, THICKNESS is magnitude and ONLY where measured. No edge
 * in either chain has an observed magnitude, so every edge draws at standard width -- the
 * grammar refusing to encode a size the model does not hold.
 *
 * R3.11 fixed three integration losses found by walking the product as an analyst: opportunities
 * rendered as bare identifiers, the financial `mechanism` field dropped, and the portfolio
 * relation `mechanism` dropped with financial and development relationships not distinguished.
 * Nothing here is a paragraph copied from a report; every string comes from the exports. */
function econFigure(f) {
  return `<div class="bt-k"><b>${esc(f.label)}</b> · ${esc(f.value)}
    <span class="muted">${esc(f.unit)} · ${esc(f.geography)} · ${esc(f.period)}
    · ${esc(f.source)}</span></div>`;
}
function econNext(n) {
  if (!n) return "";
  return `<div class="card" style="border-color:var(--water);background:var(--water-soft)">
    <h2 style="color:#2a5a69">What would move this</h2>
    ${kv({ "Evidence needed": n.evidence_needed,
           "Where it may come from": n.where_it_may_come_from,
           "What it would enable": n.what_it_would_enable })}</div>`;
}
const ECON_STATE_TAG = { OBSERVED: "s", ESTIMATED: "w", UNKNOWN: "u" };
function econStep(s) {
  return `<div class="bt">
    <div class="bt-n">${s.n}</div>
    <div class="bt-b">
      <div class="row"><span class="tag k">${esc(s.stage)}</span>
        ${s.evidence_state ? `<span class="tag ${ECON_STATE_TAG[s.evidence_state] || "u"}"
          >${esc(s.evidence_state.toLowerCase())}</span>` : ""}
        ${s.status ? `<span class="tag u">${low(s.status)}</span>` : ""}</div>
      <h2 class="bt-c">${esc(s.question)}</h2>
      <p class="bt-s">${esc(s.plain)}</p>
      ${(s.figures || []).map(econFigure).join("")}
      ${s.what_it_costs_the_reader
        ? `<p class="bt-r"><b>What this costs you.</b> ${esc(s.what_it_costs_the_reader)}</p>` : ""}
      ${s.why_it_exists ? `<p class="bt-w"><b>Why the gap exists.</b> ${esc(s.why_it_exists)}</p>` : ""}
      ${s.what_prevents_it ? `<p class="bt-r"><b>What prevents it.</b> ${esc(s.what_prevents_it)}</p>` : ""}
      ${s.blocked_on ? `<p class="bt-r"><b>Blocked on.</b> ${esc(s.blocked_on)}</p>` : ""}
      ${s.caveat ? `<p class="bt-u">${esc(s.caveat)}</p>` : ""}
      ${econNext(s.next)}
    </div></div>`;
}
function econChain(c) {
  const stop = c.links.find(l => l.state === "UNKNOWN");
  return `<div class="card">
    <h3>${esc(c.title)}</h3>
    <div class="row"><span class="tag k">${low(c.support_shape)}</span>
      <span class="tag u">stops at ${esc(c.stops_at)}</span></div>
    ${DG.draw(c.diagram)}
    <p>${esc(c.support_shape_means)}</p>
    ${stop ? `<div class="chain"><b>THE BREAK</b>  ${esc(stop.from)} → ${esc(stop.to)}
      <span class="stop">UNKNOWN</span>${stop.params.length
        ? `\n<b>MISSING PARAMETER</b>  ${esc(stop.params.join(", "))}` : ""}
      \n${esc(stop.note || "")}</div>` : ""}
    ${kv({ Rival: c.rival, "What must be true": c.what_must_be_true.join(" · "),
           "Opportunity or threat": c.opportunity_or_threat })}
    ${det("Every link, with its evidence state", c.links.map(l =>
      `<p><b>${low(l.level)}</b> · ${esc(l.state)} · ${esc(l.from)} → ${esc(l.to)}<br>
       <span class="muted">${esc(l.note || "")}</span></p>`).join(""))}
  </div>`;
}

/* R3.12 §3. ONE adjustable input on the EXISTING four-corner calculation.
 *
 * The equation below is the same closed form as r38_feasibility._annuity, which produces the
 * static corners. It is NOT a second model: pipeline/r310_economy.py exports a verification
 * table computed by that Python function, and test_r312 asserts this JavaScript reproduces
 * every row of it. If the two ever diverge, that test fails.
 *
 * The slider moves an ANALYST ASSUMPTION, not an observation. The parameter it stands in for --
 * CONSTRUCTION_LOAN_TERMS_NNM -- is UNKNOWN in the world model, which is exactly why the input
 * is adjustable and exactly why its result is not a market quote. */
function econAnnuityMonthly(principal, rate, years) {
  return principal * rate / (1 - Math.pow(1 + rate, -years)) / 12;
}
function econInteractive(I) {
  const term = 35, ceiling = Number(I.fixed_inputs.find(f => f.name.includes("ceiling"))
    .value.replace(/[^0-9.]/g, ""));
  const PU_LOW = 191000000 / 380, PU_HIGH = 200000000 / 380;
  // The three §3 unknowns start at ZERO. At zero the operating statement below reproduces
  // the published four corners exactly, so the default view is still the FLOOR the model
  // claims to be -- the controls can only ever make the project look worse, never better.
  const state = { rate: I.adjustable.default, utility_allowance: 0, vacancy: 0, opex: 0 };
  const OM = I.operating_model;
  const money = v => (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString();

  function compute(ratePct) {
    const r = ratePct / 100;
    const dLow = Math.round(econAnnuityMonthly(PU_LOW, r, term));
    const dHigh = Math.round(econAnnuityMonthly(PU_HIGH, r, term));
    const factor = r / (1 - Math.pow(1 + r, -term));
    const carry = (ceiling * 12) / factor;
    // Unrounded, because r310_economy.operating() divides the unrounded annuity. Rounding
    // here instead would make the browser and the exporter disagree by a cent and the
    // verification test would be asserting on rounding, not on the equation.
    const op = pu => {
      const netRent = ceiling - state.utility_allowance;
      const egi = netRent * (1 - state.vacancy / 100);
      const noi = egi - state.opex;
      const ds = econAnnuityMonthly(pu, r, term);
      // No coverage ratio. See r310_economy.operating(): there is no established NOI to put
      // over debt service, and a ratio with opex at zero would read as an underwriting result.
      return { netRent, vacancyLoss: netRent * (state.vacancy / 100), egi, noi, ds,
        cash: noi - ds, maxOpex: egi - ds };
    };
    return { r, dLow, dHigh, hLow: ceiling - dLow, hHigh: ceiling - dHigh,
      carry: Math.round(carry),
      gapLow: Math.round(Math.max(0, PU_LOW - carry)),
      gapHigh: Math.round(Math.max(0, PU_HIGH - carry)),
      opLow: op(PU_LOW), opHigh: op(PU_HIGH) };
  }

  function panel(c) {
    const sign = v => v >= 0 ? "s" : "u";
    return `
      <div class="row" style="gap:28px;margin:14px 0 0;align-items:flex-start">
        <div><div class="num" style="font-size:24px">${money(c.dLow)}</div>
          <p class="bt-u" style="margin:2px 0 0">debt service / unit / month<br>at ${money(PU_LOW)} per unit</p></div>
        <div><div class="num" style="font-size:24px">${money(c.dHigh)}</div>
          <p class="bt-u" style="margin:2px 0 0">at ${money(PU_HIGH)} per unit</p></div>
      </div>
      <div class="row" style="gap:28px;margin:16px 0 0;align-items:flex-start">
        <div><div class="num" style="font-size:24px;color:${c.hLow >= 0 ? "var(--sage)" : "var(--warn)"}"
          >${c.hLow >= 0 ? "+" : ""}${money(c.hLow)}</div>
          <p class="bt-u" style="margin:2px 0 0">headroom against the ${money(ceiling)} ceiling</p></div>
        <div><div class="num" style="font-size:24px;color:${c.hHigh >= 0 ? "var(--sage)" : "var(--warn)"}"
          >${c.hHigh >= 0 ? "+" : ""}${money(c.hHigh)}</div>
          <p class="bt-u" style="margin:2px 0 0">on the higher cost estimate</p></div>
      </div>
      <p class="bt-s" style="margin:14px 0 0">${
        c.hLow < 0 && c.hHigh < 0
          ? `<b>At ${state.rate}% the restricted rent does not cover debt service on either cost
             estimate</b>, before a single dollar of operating cost.`
          : c.hLow >= 0 && c.hHigh >= 0
            ? `<b>At ${state.rate}% the rent covers debt service on both estimates</b>, leaving
               ${money(c.hHigh)} to ${money(c.hLow)} a month to pay for management, maintenance,
               insurance, reserves and vacancy — which is the whole operating budget.`
            : `<b>At ${state.rate}% it covers the low cost estimate and not the high one.</b>
               The project's feasibility turns on a cost figure reported three different ways.`}
      </p>
      <h3 style="font-size:15px;margin:20px 0 6px">What the rent can carry, and what it cannot</h3>
      <div class="chain">principal a ${money(ceiling)} payment supports    ${money(c.carry)}
unit cost                                 ${money(PU_LOW)} to ${money(PU_HIGH)}
<b>capital the rent cannot repay</b>             <b>${money(c.gapLow)} to ${money(c.gapHigh)} per unit</b></div>
      <p class="bt-w">That remainder is what candidate <b>R1</b> is a product for. A higher
      coupon does not make the opportunity more attractive — it makes it <b>larger and
      harder</b>, because the gap grows while the evidence that anything can be charged for
      filling it does not.</p>
      ${opPanel(c)}`;
  }

  function line(label, v, opts) {
    const o = opts || {};
    return `<div class="row" style="justify-content:space-between;gap:12px;${o.rule
      ? "border-top:1px solid var(--rule);padding-top:4px;margin-top:4px" : ""}">
      <span style="${o.strong ? "font-weight:600" : ""}">${label}</span>
      <span class="num" style="${o.strong ? "font-weight:600;" : ""}${
        o.warn && v < 0 ? "color:var(--warn)" : ""}">${
        (v < 0 ? "−$" : "$") + Math.abs(v).toLocaleString(undefined,
          { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
  }

  function opPanel(c) {
    // One column per cost estimate. No coverage ratio is printed: there is no established net
    // operating income to put over debt service, and the bound at the foot of each column is
    // what replaces it.
    const col = (o, title) => `
      <div style="flex:1;min-width:16rem">
        <p class="bt-u" style="margin:0 0 6px"><b>${title}</b></p>
        ${line("gross 80%-AMI housing ceiling", o.netRent + state.utility_allowance)}
        ${line("less tenant-paid utilities", -state.utility_allowance)}
        ${line("net collectible rent", o.netRent, { rule: 1 })}
        ${line("less vacancy and collection loss", -o.vacancyLoss)}
        ${line("effective gross income", o.egi, { rule: 1 })}
        ${line("less operating expenses", -state.opex)}
        ${line("net operating income", o.noi, { rule: 1, strong: 1 })}
        ${line("less debt service", -o.ds)}
        ${line("cash after debt service", o.cash, { rule: 1, strong: 1, warn: 1 })}
        <p class="bt-s" style="margin:6px 0 0">Largest operating budget this coupon leaves
          room for: <b class="num">${(o.maxOpex < 0 ? "−$" : "$")
            + Math.abs(o.maxOpex).toLocaleString(undefined,
              { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> per unit per month${
            o.maxOpex < 0 ? " — <b>there is none</b>" : ""}.</p>
      </div>`;
    return `
      <h3 style="font-size:15px;margin:22px 0 6px">${esc(OM.title)}</h3>
      <p class="bt-u" style="margin:0 0 4px">${esc(OM.unit)}. ${esc(OM.defaults_are_zero)}</p>
      <div class="row" style="gap:28px;margin:12px 0 0;align-items:flex-start">
        ${col(c.opLow, money(PU_LOW) + " per unit")}
        ${col(c.opHigh, money(PU_HIGH) + " per unit")}
      </div>
      <p class="bt-w" style="margin:12px 0 0"><b>${esc(OM.the_inversion.what_it_is)}</b>
        ${esc(OM.the_inversion.why_it_is_the_honest_form)}</p>
      <p class="bt-r" style="margin:8px 0 0"><b>${esc(OM.no_coverage_ratio.why)}</b>
        ${esc(OM.no_coverage_ratio.what_replaces_it)}</p>`;
  }

  // Rendered once; the handler re-renders only the result panel, so the control keeps focus.
  setTimeout(() => {
    const inp = document.getElementById("econ-rate");
    const out = document.getElementById("econ-out");
    const lab = document.getElementById("econ-rate-label");
    if (!inp || !out) return;
    const redraw = () => {
      state.rate = Number(inp.value);
      lab.textContent = state.rate.toFixed(2) + "%";
      for (const u of OM.adjustable_unknowns) {
        const el = document.getElementById("econ-" + u.key);
        const l = document.getElementById("econ-" + u.key + "-label");
        if (!el) continue;
        state[u.key] = Number(el.value);
        l.textContent = u.unit.startsWith("percent")
          ? state[u.key].toFixed(1) + "%"
          : "$" + state[u.key].toLocaleString();
      }
      out.innerHTML = panel(compute(state.rate));
    };
    inp.addEventListener("input", redraw);
    for (const u of OM.adjustable_unknowns) {
      const el = document.getElementById("econ-" + u.key);
      if (el) el.addEventListener("input", redraw);
    }
    const rst = document.getElementById("econ-reset");
    if (rst) rst.addEventListener("click", () => {
      for (const u of OM.adjustable_unknowns) {
        const el = document.getElementById("econ-" + u.key);
        if (el) el.value = u.default;
      }
      redraw();
    });
    redraw();
  }, 0);

  const be = I.breakeven;
  return `<div class="card" style="border-color:var(--clay)">
    <h3>${esc(I.title)}</h3>
    <p class="muted">${esc(I.equation)} · ${esc(I.model)}</p>

    <div class="row" style="margin:14px 0 0;align-items:center;gap:14px">
      <label for="econ-rate" style="font-size:13px"><b>Assumed coupon</b></label>
      <input id="econ-rate" type="range" min="${I.adjustable.min}" max="${I.adjustable.max}"
        step="${I.adjustable.step}" value="${I.adjustable.default}" style="flex:1;min-width:14rem">
      <span id="econ-rate-label" class="num" style="font-size:20px;min-width:4.5rem"
        >${I.adjustable.default.toFixed(2)}%</span>
      <span class="tag u">${esc(I.adjustable.state.toLowerCase())}</span>
    </div>
    <p class="bt-r" style="margin:8px 0 0"><b>${esc(I.adjustable.warning)}</b></p>
    <p class="bt-u">${esc(I.adjustable.why_adjustable)}</p>

    <div class="card" style="margin:14px 0 0;background:var(--paper-2)">
      <h3 style="font-size:15px;margin:0 0 2px">The three things the model does not hold</h3>
      <p class="bt-u" style="margin:0 0 10px">Each starts at zero, and at zero this page shows
      the published result. Every one of them can only make the project worse, which is why the
      published figure is a <b>floor</b> and not an estimate. None of these is a market quote,
      and the ranges are bounds for exploring the arithmetic — <b>not estimates</b>.</p>
      ${OM.adjustable_unknowns.map(u => `
        <div class="row" style="margin:0 0 10px;align-items:center;gap:12px">
          <label for="econ-${u.key}" style="font-size:13px;min-width:13rem"
            ><b>${esc(u.name)}</b></label>
          <input id="econ-${u.key}" type="range" min="${u.min}" max="${u.max}"
            step="${u.step}" value="${u.default}" style="flex:1;min-width:10rem">
          <span id="econ-${u.key}-label" class="num" style="font-size:16px;min-width:4.5rem"></span>
          <span class="tag u">unknown</span>
        </div>
        <p class="bt-u" style="margin:-4px 0 10px">${esc(u.why)}
          <br><b>To obtain it:</b> ${esc(u.obtain_from)}
          <br><span class="bt-r">${esc(u.range_basis)}</span></p>`).join("")}
      <button id="econ-reset" type="button">Reset all three to zero</button>
    </div>

    <div id="econ-out"></div>

    <div class="card" style="margin:18px 0 0;background:var(--paper-2)">
      <h3 style="font-size:15px">Where it stops working</h3>
      <p>The ceiling exactly covers debt service at <b>${be.low_cost_pct}%</b> on the low cost
      estimate and <b>${be.high_cost_pct}%</b> on the high one. ${esc(be.means)}</p>
      <p class="bt-u">${esc(be.solved_how)}.</p>
    </div>

    ${det("What stays fixed, and why", I.fixed_inputs.map(f => `<p><b>${esc(f.name)}</b> ·
      ${esc(f.value)} <span class="tag ${f.state === "OBSERVED" ? "s" : "u"}"
      >${low(f.state)}</span><br><span class="muted">${esc(f.note)} — ${esc(f.source)}</span></p>`).join("")
      + "<p class='bt-w'>" + I.what_does_not_change.map(esc).join("<br>") + "</p>")}

    <h3 style="font-size:15px;margin:20px 0 6px">What cannot be computed at any rate</h3>
    ${I.what_cannot_be_completed.map(x => `<div style="margin:0 0 10px">
      <div class="row"><b>${esc(x.output)}</b><span class="tag u">blocked</span></div>
      <p class="bt-u" style="margin:2px 0 0">${esc(x.blocked_by)}</p>
      <p class="bt-w" style="margin:2px 0 0">${esc(x.consequence)}</p></div>`).join("")}
  </div>`;
}

function economyReading(E, vis) {
  return `<section><h2>The reading</h2>
    <p class="lede">${esc(E.readings[0].claim)}</p>
    ${E.readings.map(b => `<div class="bt">
      <div class="bt-n">·</div>
      <div class="bt-b">
        <h2 class="bt-c">${esc(b.claim)}</h2>
        ${(vis[b.visual] || (() => ""))()}
        <p class="bt-s">${esc(b.what_it_says)}</p>
        <p class="bt-r"><b>What works against it.</b> ${esc(b.what_works_against_it)}</p>
      </div></div>`).join("")}
  </section>`;
}

function economyIntel() {
  const E = ECON;
  const vis = {
    INCOME_BY_RESIDENCE: () => GR.ranked(E.income_by_residence.rows,
      { id: "econ-income", title: "One employer's payroll, by where the earner lives",
        sub: "FY2025 salary attributed by county of residence in the operator's own report.",
        unit: E.income_by_residence.unit, geography: E.income_by_residence.geography,
        caveat: E.income_by_residence.caveat }),
    SALARY_PER_EMPLOYEE: () => GR.ranked(E.salary_per_employee.rows,
      { id: "econ-per-employee", title: "Salary per employee, by county of residence",
        sub: "The same payroll divided by the same report's employee counts.",
        unit: E.salary_per_employee.unit, geography: E.salary_per_employee.geography,
        caveat: E.salary_per_employee.caveat }),
    CHAIN_TCR01: () => econChain(E.chains.find(c => c.id === "TCR01")),
    CHAIN_TCR02: () => econChain(E.chains.find(c => c.id === "TCR02")),
    BUFFER_COMPONENTS: () => `<div class="card"><h3>What a household buffer would need</h3>
      <div class="row"><span class="tag u">${low(E.household_buffer.label)}</span>
        <span class="tag u">no score</span></div>
      ${kv(Object.fromEntries(Object.entries(E.household_buffer.components).map(([k, v]) =>
        [k.replace(/_/g, " "), String(v.measured) + (v.why_not_computable
          ? " — " + v.why_not_computable : "")])))}</div>`,
  };
  const WF = E.workflow, WFI = INTERNAL && INTERNAL.workflow;
  /* A stale export must degrade, not blank the page: reading .title off a missing workflow
     threw inside render() and left the app on "loading…". */
  if (!WF || !WF.steps) {
    return `<section><h2>Workflow unavailable</h2><div class="card">
      <p>This build expects a <code>workflow</code> section in <code>product/economy.json</code>
      and the loaded export has none, so the stepped economic argument cannot be shown.
      Rebuild with <code>pipeline/r310_economy.py</code>. The reading below is unaffected.</p>
      </div></section>` + economyReading(E, vis);
  }
  return `
  <section><h2>${esc(WF.title)}</h2>
    <p class="lede">${esc(WF.what_the_reader_should_conclude)}</p>
    <p class="muted">Seven steps from a world rate change to a portfolio question.
      ${esc(WF.why_this_one)}</p>
    ${WF.steps.map(s => econStep(s) + (s.n === 4 && E.interactive
      ? `<div class="bt"><div class="bt-n"></div><div class="bt-b">${econInteractive(E.interactive)}</div></div>`
      : "")).join("")}
    ${WFI ? WFI.steps.map(econStep).join("")
      : `<div class="card"><p class="muted">Steps 5 to 7 — the opportunity, its financial
         implications and its portfolio relevance — rest on investment intelligence that is
         not in the public export. They appear only when the internal layer is present.</p></div>`}
    <div class="card" style="border-color:var(--warn)">
      <h2>What this does not show</h2>
      <p>${esc(WF.what_the_reader_should_not_conclude)}</p></div>
  </section>

  ${economyReading(E, vis)}

  <section><h2>The identity this turns on</h2>
    <div class="card"><h3>${esc(E.identity.name)}</h3>
      <p class="muted">${esc(E.identity.declared_by)}</p>
      ${kv(E.identity.declared_identity)}
      ${kv({ Numerator: E.identity.numerator_status,
             Denominator: E.identity.denominator_status,
             "The marginal project": E.identity.marginal_term_status })}
      <p class="bt-q">${esc(E.identity.verdict)}</p>
      <p class="bt-w">${esc(E.identity.not_a_crossing)}</p>
    </div>
  </section>

  <section><h2>Where the money comes from, and what it is spent on</h2>
    <div class="card">
      ${kv(Object.fromEntries(Object.entries(E.procurement.by_fiscal_year).map(([y, v]) =>
        ["FY" + y, "$" + (v / 1e9).toFixed(2) + "bn of procurement, all locations"])))}
      <p class="bt-w"><b>${esc(E.procurement.discontinuity.observed)}</b></p>
      <p class="bt-r"><b>Cause found.</b> ${esc(E.procurement.discontinuity.cause)}</p>
      <p class="bt-k">${esc(E.procurement.discontinuity.the_consequence_that_matters)}</p>
    </div>
    <div class="card"><h3>The one priced advantage in the region</h3>
      <p>${esc(E.procurement.preference.rule)}</p>
      ${kv({ Qualifying: E.procurement.preference.qualification_bar,
             Counties: E.procurement.preference.counties_covered.join(", "),
             And: E.procurement.preference.plus,
             "What it is not": E.procurement.preference.what_it_is_not })}
      <p class="bt-r"><b>And it is observed to fail.</b>
        ${esc(E.procurement.reframing.observation)} ${esc(E.procurement.reframing.inference)}</p>
      <p class="bt-w"><b>Rival.</b> ${esc(E.procurement.reframing.rival)}</p>
    </div>
  </section>

  ${INTERNAL ? `<section><h2>Investment intelligence · internal</h2>
    <div class="card" style="border-color:var(--warn)">
      <div class="row"><span class="tag k">INTERNAL</span>
        <span class="tag u">local only · excluded from every deployed build</span></div>
      <p class="bt-w">${esc(INTERNAL.where_this_may_live)}</p>
      <p class="bt-u">${esc(INTERNAL.restricted_material_excluded)}</p>
    </div>

    <div class="card"><h3>Candidates</h3>
      <p class="muted">Promotion is enforced in the research code: market validation needs a
      named buyer and observed purchases, feasibility needs a cost and a price, investable needs
      a return mechanism and a counterparty.</p>
      ${["FEASIBILITY_CANDIDATE", "MARKET_VALIDATED_CANDIDATE", "RESEARCH_CANDIDATE", "SIGNAL"]
        .filter(s => INTERNAL.by_status[s]).map(s => `
        <h3 style="font-size:15px;margin:18px 0 6px">${low(s)}</h3>
        ${INTERNAL.by_status[s].map(id => {
          const o = INTERNAL.opportunities.find(x => x.id === id);
          if (!o) return "";
          return `<div class="bt"><div class="bt-n">${esc(o.id)}</div><div class="bt-b">
            <h2 class="bt-c" style="font-size:18px!important">${esc(o.name)}</h2>
            <p class="bt-s">${esc(o.economic_gap)}</p>
            <p class="bt-w"><b>Why it exists.</b> ${esc(o.why_the_gap_exists)}</p>
            <p class="bt-r"><b>What prevents it.</b> ${esc(o.what_prevents_it_from_working)}</p>
            ${det("Market, buyers, revenue, operator, regional effect", kv({
              Market: o.market, Buyers: o.buyers, Suppliers: o.suppliers,
              "What it sells": o.what_it_sells, "How it earns": o.revenue_mechanism,
              Cost: o.cost, "Who could run it": o.who_could_operate_it,
              "Regional effect": o.regional_economic_effect }))}
            <p class="bt-q"><b>Next.</b> ${esc(o.next_step)}</p>
          </div></div>`;
        }).join("")}`).join("")}
      <p class="bt-q">Nothing reached investable.</p>
    </div>

    <div class="card"><h3>Financial feasibility</h3>
      <p class="bt-s">${esc(INTERNAL.financial_lens.the_decisive_absence)}</p>
      ${INTERNAL.financial_lens.terms.map(x => `<div style="margin:0 0 14px">
        <div class="row"><b>${low(x.term)}</b>
          <span class="tag ${x.state === "OBSERVED" ? "s" : x.state === "NOT_ESTABLISHED" ? "u" : "w"}"
            >${low(x.state)}</span></div>
        ${x.value ? `<p class="bt-k" style="margin:4px 0 0">${esc(String(x.value))}</p>` : ""}
        <p class="bt-w" style="margin:4px 0 0">${esc(x.mechanism)}</p>
      </div>`).join("")}
      <p class="bt-q">${esc(INTERNAL.financial_lens.what_the_mechanism_says_anyway)}</p>
    </div>

    <div class="card"><h3>Portfolio · development relationships</h3>
      <p class="muted">Whether investing in one activity would change the costs, revenues,
      capacity or feasibility of another. A shared parameter makes a candidate; a MEASURED
      capacity on it is what would make the interaction computable.</p>
      ${INTERNAL.development_portfolio.relations.map(x => `<div style="margin:0 0 14px">
        <div class="row"><b>${esc(x.a)} → ${esc(x.b)}</b>
          <span class="tag ${x.direction === "displacing" || x.direction === "competing" ? "u" : "s"}"
            >${esc(x.direction)}</span>
          <span class="tag u">${low(x["class"])}</span></div>
        <p style="font-family:var(--mono);font-size:12px;color:var(--clay);margin:4px 0 0"
          >${esc(x.shared_parameter)}</p>
        <p class="bt-w" style="margin:4px 0 0">${esc(x.mechanism)}</p>
      </div>`).join("")}
      <p class="bt-q">${esc(INTERNAL.development_portfolio.the_verdict)}</p>
    </div>

    <div class="card"><h3>Portfolio · financial relationships</h3>
      <p class="muted">Shared exposure, concentration, liquidity, duration, capital requirement
      and downside. Each is a property of a RETURN SERIES, and this region has produced no
      candidate with a return — so each says what IS known and why no number follows.</p>
      ${INTERNAL.traditional_portfolio.properties.map(x => `<div style="margin:0 0 12px">
        <div class="row"><b>${low(x.property)}</b>
          <span class="tag u">${esc(x.state.toLowerCase())}</span></div>
        <p class="bt-s" style="margin:4px 0 0">${esc(x.what_is_known)}</p>
        <p class="bt-u" style="margin:2px 0 0">${esc(x.why_no_number)}</p>
      </div>`).join("")}
      <p class="bt-q">${esc(INTERNAL.traditional_portfolio.the_asymmetry_that_matters)}</p>
    </div>

    <div class="card"><h3>Capital</h3>
      <p class="num">$${esc(String(INTERNAL.capital_allocation.deployable_today))}</p>
      <p class="bt-s">deployable today. ${esc(INTERNAL.capital_allocation.why_zero)}</p>
      ${kv(Object.fromEntries(Object.entries(INTERNAL.capital_allocation.four_stages_kept_apart)
        .map(([k, v]) => [k.replace(/_/g, " ").toLowerCase(), v.state])))}
    </div>
  </section>` : `<section><h2>Investment intelligence</h2>
    <div class="card"><p class="muted">The internal investment layer is not loaded, and in a
    published copy it never is: opportunity economics, financial assumptions, portfolio
    construction, marketed assets and asking prices are held outside every artefact that gets
    deployed. Its absence is the control — not a hidden element on this page.</p></div></section>`}
  `;
}

function economyModel() {
  const E = ECON;
  return `<section><h2>Model</h2>
    <div class="card"><h3>Epistemic grades</h3>
      <p class="muted">Every world claim carries a grade and a structural-or-cyclical reading.
      The second distinction is not in the world model; the research layer adds it, and where it
      cannot be determined the claim says so.</p>
      ${kv(E.world.by_grade)}${kv(E.world.by_kind)}</div>
    ${E.world.claims.map(c => `<div class="card"><p>${esc(c.claim)}</p>
      <div class="row"><span class="tag ${c.grade === "OBSERVED" ? "s" : c.grade === "ESTIMATED" ? "w" : "u"}"
        >${esc(c.grade.toLowerCase())}</span>
        <span class="tag u">${low(c.kind)}</span></div>
      ${c.antecedent ? `<p class="bt-w"><b>Only if.</b> ${esc(c.antecedent)}</p>` : ""}
      ${c.rival ? `<p class="bt-w"><b>Rival.</b> ${esc(c.rival)}</p>` : ""}
      <p class="bt-u">${esc(c.source)}</p></div>`).join("")}
    <div class="card"><h3>What the model explains, and cannot</h3>
      ${kv({ "Explains well": E.world.explains_well,
             "Cannot explain": E.world.cannot_explain })}
      <p class="bt-q">${esc(E.world.honest_frame)}</p></div>
    ${E.chains.map(econChain).join("")}
  </section>`;
}

function economyEvidence() {
  const E = ECON;
  return `<section><h2>Evidence</h2>
    <p class="muted">${esc(E.what_this_is)}</p>
    <div class="card" style="border-color:var(--warn)"><h3>What this export does not carry</h3>
      <p>${esc(E.what_this_is_not)}</p></div>
    ${E.conflicts.length ? `<div class="card"><h3>Conflicts between sources, recorded not resolved</h3>
      ${kv(Object.fromEntries(E.conflicts.map(c => [c.id, c.conflict])))}</div>` : ""}
    ${E.provenance.map(s => `<div class="card"><h3>${esc(s.id)} · ${esc(s.source)}</h3>
      ${kv({ Publisher: s.publisher, Accessed: s.access_date, Period: s.time_period,
             Geography: s.geography, Unit: s.unit, Coverage: s.coverage,
             Limitations: s.limitations, "Cannot be read as": s.does_not_support })}</div>`).join("")}
  </section>`;
}

/* ---- RENDER */

/* ================================================================= THE CONNECTED ECONOMY (R3.14)
 * Four perspectives on ONE representation. The pathway view leads, because a pathway is the only
 * one of the four that answers "so what" -- it ends in money. The other three are how you check
 * it: which systems hold what, which objects two systems share, and which strength dimensions
 * are observed at all.
 *
 * The rule the renderers follow is §10's: lead with the finding, and let the identifiers be
 * inspectable rather than primary. A reader should meet "the project can absorb $21,304 a unit"
 * before they meet CM_WATER_SEWER_CAPACITY, and should be able to reach the component when they
 * want it. */
const EC_TAG = {
  OBSERVED: "s", DERIVED: "s", ACCOUNTING_IDENTITY: "k",
  PROXY_ONLY: "w", ESTIMATED: "w", HYPOTHESIS: "u", UNKNOWN: "u",
};
const ecMoney = v => (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString();
const ecChip = e => `<span class="tag ${EC_TAG[e] || "u"}">${low(e)}</span>`;

function ecEdge(e) {
  return `<div class="bt">
    <div class="bt-n"></div>
    <div class="bt-b">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline">
        <b>${esc(e.from)} → ${esc(e.to)}</b>
        <span class="tag ${e.traversable ? "s" : "u"}">${e.traversable ? "traversable" : "measurement stops here"}</span>
      </div>
      <p style="margin:4px 0 0">${esc(e.mechanism)}</p>
      <p class="bt-u" style="margin:4px 0 0">${low(e.state)} — ${esc(e.state_means)}</p>
      ${e.bounds ? `<p class="bt-s" style="margin:4px 0 0"><b>Bound:</b>
        ${esc(e.bounds.why_no_point || "")}</p>` : ""}
      ${e.why ? `<p class="bt-w" style="margin:4px 0 0">${esc(e.why)}</p>` : ""}
      ${det("What would settle it", `
        ${e.next_decisive_observation ? `<p><b>Next decisive observation.</b>
          ${esc(e.next_decisive_observation)}</p>` : ""}
        ${e.falsifier ? `<p><b>Falsifier.</b> ${esc(e.falsifier)}</p>` : ""}
        ${e.alternative_explanations && e.alternative_explanations.length
          ? `<p><b>Alternatives not ruled out.</b> ${e.alternative_explanations.map(esc).join("; ")}</p>` : ""}
        ${e.held && e.held.length ? `<p class="muted">Held: ${e.held.map(esc).join(", ")}</p>` : ""}
        <p class="muted">carries ${low(e.carries)} · ${low(e.geography_from)} → ${low(e.geography_to)}
          · ${low(e.lag)}</p>`)}
    </div></div>`;
}

function ecHingeWater(h) {
  const rows = h.bound.filter(b => [3, 3.5, 4, 4.25, 4.5, 5, 6].includes(b.coupon_pct));
  return `
    <h3 style="font-size:15px;margin:18px 0 6px">The hinge · ${esc(h.name)}</h3>
    <p class="lede" style="margin:0 0 8px">${esc(h.reading)}</p>
    <p class="bt-u">${esc(h.why_this_is_the_hinge)}</p>
    <p class="bt-r"><b>${esc(h.state)}.</b> ${esc(h.what_is_computable_without_it)}</p>
    <div class="chain">coupon    rent supports      headroom, low cost    headroom, high cost
${rows.map(b => `${String(b.coupon_pct.toFixed(2)).padStart(5)}%   ${ecMoney(b.principal_the_rent_supports).padStart(12)}   ${ecMoney(b.headroom_low_cost).padStart(14)}   ${ecMoney(b.headroom_high_cost).padStart(14)}`).join("\n")}</div>
    <p class="bt-w">${esc(h.what_it_does_not_establish)}</p>
    ${det("The inputs, and what each one is", Object.entries(h.inputs).map(([k, v]) =>
      `<p><b>${low(k)}</b> · ${esc(Array.isArray(v.value) ? v.value.map(ecMoney).join(" to ")
        : v.value == null ? "—" : v.value)} ${esc(v.unit || "")}
       <span class="tag ${v.state === "OBSERVED" ? "s" : "u"}">${low(v.state)}</span>
       ${v.note ? `<br><span class="muted">${esc(v.note)}</span>` : ""}</p>`).join(""))}`;
}

function ecHingeFood(h) {
  return `
    <h3 style="font-size:15px;margin:18px 0 6px">The hinge · ${esc(h.name)}</h3>
    <p class="bt-u">${esc(h.why_this_is_the_hinge)}</p>
    <p class="bt-s"><b>Observed.</b> A ${n(h.observed.loop_miles)}-mile northern loop costs
      ${ecMoney(h.observed.loop_cost_usd[0])}–${ecMoney(h.observed.loop_cost_usd[1])}.
      <span class="muted">${esc(h.observed.state)}</span></p>
    <div class="chain">stops per loop     cost per stop, low     cost per stop, high
${h.cost_per_stop.map(c => `${String(c.stops).padStart(9)}        ${("$" + c.low.toFixed(2)).padStart(12)}        ${("$" + c.high.toFixed(2)).padStart(12)}`).join("\n")}</div>
    <p class="bt-r"><b>${esc(h.break_even_order_value.state)}</b> —
      ${esc(h.break_even_order_value.identity)}.</p>
    <p>${esc(h.break_even_order_value.worked)}</p>
    <p class="bt-w">${esc(h.break_even_order_value.margin_not_supplied)}</p>
    <div class="card" style="margin:14px 0 0;background:var(--paper-2)">
      <h3 style="font-size:14px;margin:0 0 4px">The question that would change the answer</h3>
      <p>${esc(h.shared_infrastructure_question.what)}</p>
      <p class="bt-s">${esc(h.shared_infrastructure_question.why_it_matters)}</p>
      <p class="bt-u">${low(h.shared_infrastructure_question.state)} ·
        ${esc(h.shared_infrastructure_question.next_observation)}</p>
    </div>`;
}

function ecPathway(p) {
  const g = p.gate;
  return `<section>
    <div class="row" style="justify-content:space-between;align-items:baseline;gap:10px">
      <h2 style="margin:0">${esc(p.title)}</h2>
      <span class="tag u">${p.systems.map(low).join(" · ")}</span>
    </div>
    <div class="card" style="margin:10px 0 0">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline">
        <b>Where it starts</b>${ecChip(p.initiating_condition.state.split(" ")[0])}
      </div>
      <p style="margin:4px 0 0">${esc(p.initiating_condition.what)}</p>
      <p class="bt-s" style="margin:4px 0 0">${esc(p.initiating_condition.evidence)}</p>
    </div>
    <h3 style="font-size:15px;margin:18px 0 6px">How it travels, and where it stops</h3>
    ${p.edges.map(ecEdge).join("")}
    <p class="bt-r"><b>${g.traversable}/${g.edges} edges traversable.</b> ${esc(g.reading)}</p>
    ${p.id === "PW_WATER_HOUSING_FINANCE" ? ecHingeWater(p.hinge) : ecHingeFood(p.hinge)}
    <h3 style="font-size:15px;margin:18px 0 6px">What it does to money</h3>
    <p>${esc(p.financial_consequence.mechanism)}</p>
    ${p.financial_consequence.consequence_if_cost_exceeds_bound
      ? `<p class="bt-w">${esc(p.financial_consequence.consequence_if_cost_exceeds_bound)}</p>` : ""}
    ${p.financial_consequence.who_bears_it
      ? `<p class="bt-r"><b>Who bears it.</b> ${esc(p.financial_consequence.who_bears_it)}</p>` : ""}
    ${p.financial_consequence.investment_form
      ? `<p class="bt-u">${esc(p.financial_consequence.investment_form)}</p>` : ""}
    <div class="card" style="margin:14px 0 0">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline">
        <b>Could an investment change this?</b>
        <span class="tag u">${low(p.development_implication.status)}</span></div>
      <p style="margin:4px 0 0">${esc(p.development_implication.what)}</p>
      <p class="bt-w" style="margin:4px 0 0">${esc(p.development_implication.why)}</p>
      ${p.development_implication.what_would_establish_it
        ? `<p class="bt-u" style="margin:4px 0 0">${esc(p.development_implication.what_would_establish_it)}</p>` : ""}
    </div>
    ${det(`The actors this runs through (${p.actors.length})`, p.actors.map(a =>
      `<p><b>${esc(a.actor)}</b> — ${esc(a.role)}
        <span class="tag ${a.observed === true ? "s" : "w"}">${a.observed === true ? "observed"
          : low(String(a.observed))}</span>
        ${a.note ? `<br><span class="muted">${esc(a.note)}</span>` : ""}</p>`).join(""))}
    ${det(`What is not known (${p.unknowns.length})`,
      `<ul>${p.unknowns.map(u => `<li>${esc(u)}</li>`).join("")}</ul>`)}
    ${det("The shared objects this pathway runs on", `<p class="muted">${p.resources.map(id => {
      const o = ECM.records.find(x => x.uid === id);
      return o ? `<b>${esc(o.name)}</b> (${o.systems.join(" + ")}, ${low(o.evidence)})` : esc(id);
    }).join("<br>")}</p>`)}
  </section>`;
}

function ecPathways() {
  return `
    <section>
      <h2>Two systems, one economy</h2>
      <p class="lede">${esc(ECP.what_a_hinge_is)}</p>
      <p class="bt-u">Engine: ${esc(ECP.engine)}. Financial model: ${esc(ECP.financial_model)}.</p>
    </section>
    ${ECP.pathways.map(ecPathway).join("")}`;
}

const CLS_TAG = {
  BINDING_ECONOMIC_CONSTRAINT: "u", VERIFIED_RESTRICTION: "w", OBSERVED_CONSTRAINT: "w",
  CONSTRAINT_UNDER_SCENARIO: "w", POTENTIAL_BOTTLENECK: "k", UNVERIFIED_HYPOTHESIS: "k",
  OBSERVED: "s", COMPUTED_FROM_OBSERVED: "s", PROPOSED_MECHANISM: "k", UNKNOWN: "u",
};

function ecConstraint(c) {
  return `<div class="bt"><div class="bt-n"></div><div class="bt-b">
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <b>${esc(c.condition)}</b>
      <span class="tag ${CLS_TAG[c.cls] || "u"}">${low(c.cls)}</span></div>
    <p class="bt-u" style="margin:3px 0 0">on: ${esc(c.activity)}</p>
    <p style="margin:4px 0 0">${esc(c.why)}</p>
    ${c.refused ? `<p class="bt-r" style="margin:4px 0 0"><b>A stronger claim was refused.</b>
      ${esc(c.refused)}</p>` : ""}
    ${c.scenario ? `<p class="bt-w" style="margin:4px 0 0"><b>Only under:</b> ${esc(c.scenario)}</p>` : ""}
    ${det("What this rests on", `<p class="muted">${c.evidence.map(esc).join("<br>")}</p>
      <p class="muted">condition observed ${c.condition_observed} · activity observed
      ${c.activity_observed} · link observed ${c.link_observed}</p>`)}
  </div></div>`;
}

function ecHeadroom(h) {
  const rows = h.table.filter(r => [3, 3.5, 4, 4.5, 5, 6].includes(r.rate_pct));
  return `<div class="card" style="margin:14px 0 0;border-color:var(--clay)">
    <h3 style="font-size:15px;margin:0 0 4px">One pot, six claims on it</h3>
    <p class="lede" style="margin:0 0 8px">${esc(h.reading)}</p>
    <p class="bt-r"><b>Correction.</b> ${esc(h.correction_of_r314)}</p>
    <div class="chain">coupon   as capital (low cost)   as monthly operating budget
${rows.map(r => `${String(r.rate_pct.toFixed(2)).padStart(5)}%   ${ecMoney(r.low_cost.capital_headroom).padStart(18)}   ${((r.low_cost.monthly_headroom < 0 ? "−$" : "$") + Math.abs(r.low_cost.monthly_headroom).toFixed(2) + "/mo").padStart(22)}`).join("\n")}</div>
    <p class="bt-u">${esc(h.identity)}</p>
    <h3 style="font-size:14px;margin:14px 0 4px">What competes for it</h3>
    ${h.competing_claims.map(c => `<div class="row" style="gap:8px;align-items:baseline">
      <span class="tag u">${low(c.state)}</span><span>${esc(c.claim)}</span>
      <span class="muted">(${esc(c.form)})</span></div>
      <p class="bt-u" style="margin:0 0 6px">to price it: ${esc(c.obtain)}</p>`).join("")}
  </div>`;
}

function ecRoute(m) {
  const state = { stops: 10, route_cost: m.observed.route_cost_usd[0], other_uncovered: 0,
    handling_per_stop: 0, margin: 0, deliveries_per_month: 0 };
  const calc = () => {
    const total = state.route_cost + state.other_uncovered
      + state.handling_per_stop * state.stops;
    const perStop = total / state.stops;
    return { total, perStop,
      sales: state.margin > 0 ? perStop / (state.margin / 100) : null,
      monthly: state.deliveries_per_month > 0 ? perStop * state.deliveries_per_month : null };
  };
  setTimeout(() => {
    const out = document.getElementById("route-out");
    if (!out) return;
    const draw = () => {
      for (const a of m.adjustable) {
        const el = document.getElementById("rt-" + a.key);
        if (!el) continue;
        state[a.key] = Number(el.value);
        const lab = document.getElementById("rt-" + a.key + "-l");
        if (lab) lab.textContent = a.unit.startsWith("percent") ? state[a.key] + "%"
          : a.unit.startsWith("USD") ? "$" + state[a.key].toLocaleString()
            : String(state[a.key]);
      }
      const c = calc();
      out.innerHTML = `
        <div class="row" style="gap:28px;margin:4px 0 0;align-items:flex-start">
          <div><div class="num" style="font-size:24px">$${c.perStop.toFixed(2)}</div>
            <p class="bt-u" style="margin:2px 0 0">must be contributed per stop<br>
              to cover $${c.total.toFixed(2)} of route cost</p></div>
          <div><div class="num" style="font-size:24px">${c.sales === null ? "—"
            : "$" + c.sales.toFixed(2)}</div>
            <p class="bt-u" style="margin:2px 0 0">${c.sales === null
              ? "sales per stop needs a contribution margin;<br>none is held and none is assumed"
              : "of sales per stop, at a " + state.margin + "% contribution margin"}</p></div>
          ${c.monthly !== null ? `<div><div class="num" style="font-size:24px">$${c.monthly.toFixed(2)}</div>
            <p class="bt-u" style="margin:2px 0 0">per stop per month<br>
              at ${state.deliveries_per_month} deliveries</p></div>` : ""}
        </div>
        <p class="bt-r" style="margin:12px 0 0"><b>${esc(m.not_a_business_model)}</b></p>`;
    };
    for (const a of m.adjustable) {
      const el = document.getElementById("rt-" + a.key);
      if (el) el.addEventListener("input", draw);
    }
    draw();
  }, 0);

  return `<div class="card" style="margin:14px 0 0;border-color:var(--clay)">
    <h3 style="font-size:15px;margin:0 0 2px">${esc(m.title)}</h3>
    <p class="bt-u" style="margin:0 0 4px">${esc(m.identity_1)}</p>
    <p class="bt-u" style="margin:0 0 10px">${esc(m.identity_2)}</p>
    <p class="bt-w">${esc(m.defaults_note)}</p>
    ${m.adjustable.map(a => `
      <div class="row" style="margin:8px 0 0;align-items:center;gap:12px">
        <label for="rt-${a.key}" style="font-size:13px;min-width:13rem"><b>${esc(a.name)}</b></label>
        <input id="rt-${a.key}" type="range" min="${a.min}" max="${a.max}" step="${a.step}"
          value="${a.default}" style="flex:1;min-width:9rem">
        <span id="rt-${a.key}-l" class="num" style="font-size:15px;min-width:4.5rem"></span>
        <span class="tag ${a.state === "OBSERVED RANGE" ? "s" : "u"}">${low(a.state)}</span>
      </div>
      <p class="bt-u" style="margin:-2px 0 0">${a.definition ? esc(a.definition) + " " : ""}
        <b>To obtain it:</b> ${esc(a.obtain)}</p>`).join("")}
    <div id="route-out" style="margin:14px 0 0"></div>
  </div>`;
}

function KN(id) {
  for (const d of ECI.demonstrations) for (const k of d.constraints) if (k.id === id) return k.condition;
  return id;
}

function ecIntervention(iv) {
  const eff = e => `<div class="row" style="gap:8px;align-items:baseline">
    <span class="tag ${CLS_TAG[e.state] || "u"}">${low(e.state)}</span>
    <span>${esc(e.what)}${e.value != null ? " — " + esc(String(e.value)) + " " + esc(e.unit || "") : ""}</span></div>
    ${e.basis ? `<p class="bt-u" style="margin:0 0 6px">${esc(e.basis)}</p>` : ""}`;
  const m = iv.mechanism;
  return `<div class="card" style="margin:14px 0 0">
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline">
      <h3 style="margin:0;font-size:16px">${esc(iv.name)}</h3>
      <span class="tag u">${low(iv.kind)}</span></div>
    <p class="bt-u" style="margin:3px 0 0">addresses <b>${esc(KN(iv.constraint))}</b> ·
      attaches to existing candidate <b>${esc(iv.attaches_to)}</b>
      <span class="muted">(${esc(iv.id)} · ${esc(iv.constraint)})</span></p>

    <h4 style="font-size:14px;margin:14px 0 4px">What is being constrained</h4>
    <p>${esc(iv.economic_problem)}</p>

    <h4 style="font-size:14px;margin:14px 0 4px">How it would work</h4>
    <div class="chain">${["initiating_condition", "affected_actor", "transmission",
      "changed_variable", "operating_or_financial_consequence", "potential_actor_response"]
      .map(k => `${k.replace(/_/g, " ").padEnd(34)} ${m[k]}`).join("\n")}</div>

    <h4 style="font-size:14px;margin:14px 0 4px">What it would change</h4>
    ${iv.direct_effects.map(eff).join("")}
    ${iv.proposed_mechanisms.length ? `<p class="bt-r" style="margin:6px 0 0">
      <b>Held as proposed mechanisms, not effects:</b>
      ${iv.proposed_mechanisms.map(e => esc(e.what)).join("; ")}.
      ${esc(iv.effects_note)}</p>` : ""}

    <h4 style="font-size:14px;margin:14px 0 4px">What it would cost</h4>
    ${Object.entries(iv.costs).map(([k, v]) => `<div class="row" style="gap:8px;align-items:baseline">
      <span class="tag ${v.state === "UNKNOWN" ? "u" : "k"}">${low(v.state)}</span>
      <span>${low(k)}</span></div><p class="bt-u" style="margin:0 0 6px">${esc(v.why)}</p>`).join("")}

    <h4 style="font-size:14px;margin:14px 0 4px">Who would have to act</h4>
    ${iv.actors.map(a => `<div class="row" style="gap:8px;align-items:baseline">
      <span class="tag ${a.observed === true ? "s" : "u"}">${a.observed === true ? "observed" : "not observed"}</span>
      <span><b>${esc(a.actor)}</b> — ${esc(a.must)}</span></div>
      ${a.note ? `<p class="bt-u" style="margin:0 0 6px">${esc(a.note)}</p>` : ""}`).join("")}

    ${det("Financing, dependencies and risks", `
      <p><b>Instruments.</b> ${iv.financing.instruments.map(esc).join("; ")}
        <span class="tag u">${low(iv.financing.state)}</span></p>
      <p class="bt-u">${esc(iv.financing.note)}</p>
      <p><b>Repayment source.</b> ${iv.financing.repayment_source.map(esc).join("; ")}</p>
      <p><b>Depends on.</b></p><ul>${iv.dependencies.map(d => `<li>${esc(d)}</li>`).join("")}</ul>
      <p><b>Risks.</b></p>${iv.risks.map(r => `<p>${esc(r.risk)}
        <span class="tag u">${low(r.kind)}</span>${r.note ? `<br><span class="muted">${esc(r.note)}</span>` : ""}</p>`).join("")}`)}

    <h4 style="font-size:14px;margin:14px 0 4px">What must be verified before this can proceed</h4>
    ${iv.validation.map(v => `<p><b>${esc(v.test)}</b><br>
      <span class="bt-s">from: ${esc(v.source)}</span><br>
      <span class="bt-u">settles: ${esc(v.settles)}</span></p>`).join("")}

    ${iv.household ? `<p class="bt-w"><b>Household pathway</b>
      <span class="tag ${iv.household.state === "NO PATHWAY" ? "u" : "k"}">${low(iv.household.state)}</span><br>
      ${esc(iv.household.pathway)}<br><span class="muted">${esc(iv.household.why_not_established || "")}</span></p>` : ""}
    ${iv.strength && iv.strength.length ? `<p class="bt-u"><b>System strength.</b>
      ${iv.strength.map(x => `${esc(x.dimension)}: ${esc(x.claim)} (${low(x.state)})`).join("; ")}</p>` : ""}
  </div>`;
}

function ecDemo(d) {
  return `<section>
    <h2>${esc(d.question)}</h2>
    <p class="bt-u">${d.systems.map(low).join(" · ")}</p>
    <h3 style="font-size:15px;margin:18px 0 6px">Why it is happening — and what is actually binding</h3>
    ${d.constraints.map(ecConstraint).join("")}
    ${d.shared_headroom ? ecHeadroom(d.shared_headroom) : ""}
    ${d.operating_model ? ecRoute(d.operating_model) : ""}
    <h3 style="font-size:15px;margin:20px 0 6px">What could change it</h3>
    ${d.interventions.map(ecIntervention).join("")}
  </section>`;
}

const OTYPE_TAG = { DISCOVER: "s", DEVELOP: "k", COORDINATE: "w" };

function ecArchetype(a) {
  const brief = ECO.briefs.find(b => b.archetype === a.id);
  return `<div class="card" style="margin:14px 0 0">
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <h3 style="margin:0;font-size:16px">${esc(a.name)}</h3>
      <span class="tag ${OTYPE_TAG[a.origination] || "u"}">${low(a.origination)}</span></div>
    <p class="bt-u" style="margin:3px 0 0">${esc(a.origination_means)}</p>
    <p style="margin:8px 0 0">${esc(a.what_it_does)}</p>
    <div class="row" style="gap:10px;margin:8px 0 0;align-items:baseline;flex-wrap:wrap">
      <span class="tag u">${low(a.operator_axis)}</span>
      <span class="tag k">${low(a.evidence_axis)}</span>
      <span class="muted">${esc(a.operator_means)}</span></div>

    ${/* R3.17. The archetype no longer carries any place's evidence -- that is the whole point
          of the split -- so the evidence shown here comes from the PLACE brief. Reading it off
          the archetype is what broke this view: the fields were removed from the model and the
          renderer still asked for them, render() threw, and the page never left "loading...". */
      ""}
    <h4 style="font-size:14px;margin:14px 0 4px">Why we think there may be something here
      ${brief ? `<span class="muted" style="font-weight:400">— in ${esc(brief.place)}</span>` : ""}</h4>
    <ul>${((brief && brief.why_we_think_so) || []).map(x => `<li>${esc(x)}</li>`).join("")
      || "<li class='muted'>no place evidence is held for this archetype yet</li>"}</ul>

    <h4 style="font-size:14px;margin:14px 0 4px">What we have NOT established</h4>
    <ul>${((brief && brief.what_we_have_not_established) || []).map(x => `<li>${esc(x)}</li>`).join("")
      || "<li class='muted'>—</li>"}</ul>
    ${a.what_varies_by_place && a.what_varies_by_place.length ? `<p class="bt-r">
      <b>What varies by place</b>, and therefore cannot be carried from one region to another:
      ${a.what_varies_by_place.map(esc).join("; ")}.</p>` : ""}

    ${det("What would have to be true, and how it would make money", `
      <p><b>Serves.</b> ${esc(a.who_it_serves)}</p>
      <p><b>Revenue.</b> ${esc(a.revenue_mechanism)}</p>
      <p><b>Cost drivers.</b> ${a.cost_drivers.map(esc).join("; ")}</p>
      <p><b>Must be true.</b></p><ul>${a.must_be_true.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="muted">answers the observed gap: ${a.gap.map(esc).join(", ")}</p>
      ${a.scale_hint ? `<p class="bt-s">${esc(a.scale_hint)}</p>` : ""}
      ${a.note ? `<p class="bt-w">${esc(a.note)}</p>` : ""}`)}

    ${brief ? det("The brief we would send, and who to", `
      <p class="bt-s"><b>${esc(brief.subject)}</b></p>
      <p>${esc(brief.what_our_research_suggests)}</p>
      <p class="bt-r"><b>${esc(brief.the_honest_position)}</b></p>
      <p><b>What we would ask.</b></p>
      <ul>${brief.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
      <p><b>What a reply would change.</b></p>
      <ul>${brief.what_a_response_would_change.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="bt-w">We are not asking for: ${brief.we_are_not_asking_for.map(esc).join("; ")}.</p>
      <p><b>Who would know (${brief.recipients.count} observed organisations:
        ${Object.entries(brief.recipients.by_role || {}).map(([k, v]) => v + " " + k).join(", ")}).</b></p>
      ${brief.recipients.shown.map(r => `<p style="margin:0">${esc(r.name)}
        <span class="muted">— ${esc(r.role)}${r.place ? ", " + esc(r.place) : ""}</span></p>`).join("")}
      <p class="bt-r">${esc(brief.recipients.note)}</p>`) : ""}

    ${a.responses.length ? `<p class="bt-s"><b>Responses: ${a.responses.length}</b></p>`
      : `<p class="bt-u">No response recorded. The operator axis cannot move without one.</p>`}
  </div>`;
}

const DEM_TAG = { OBSERVED_TRANSACTION: "s", DOCUMENTED_PROCUREMENT: "s",
  BUYER_COMMITMENT: "s", EXPRESSION_OF_INTEREST: "w", ESTIMATED: "w", HYPOTHESIZED: "u" };
const STRAT_TAG = { EXPANSION: "s", COORDINATION: "w", SHARED_INFRASTRUCTURE: "w",
  NEW_ENTERPRISE: "u" };

function ecHowFound(h) {
  const ds = ECD.discoveries.filter(d => h.discovered_by.includes(d.id));
  return det(`How this was found (${ds.length} discovery rule${ds.length === 1 ? "" : "s"} fired)`,
    ds.map(d => `<div class="bt"><div class="bt-n"></div><div class="bt-b">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <span class="tag k">${low(d.mechanism)}</span>
        <span class="muted">${esc(d.mechanism_question)}</span></div>
      <div class="chain">observed condition   ${d.observed_condition}
relationship         ${d.economic_relationship}
hypothesis           ${d.productive_activity_hypothesis}
next validation      ${d.next_validation_action}</div>
      <p class="bt-r" style="margin:4px 0 0"><b>Fired because:</b> ${esc(d.fired_because)}.
        <b>Does NOT establish:</b> ${esc(d.does_not_establish)}</p>
      <p class="muted" style="margin:3px 0 0">${d.provenance.map(esc).join(" · ")}</p>
    </div></div>`).join(""));
}

function ecHypothesis(h) {
  const a = ECO.archetypes.find(x => x.id === h.archetype) || { name: h.archetype };
  const sup = h.supply_and_competition, op = h.operating_economics, cap = h.capital_requirements;
  return `<section>
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <h2 style="margin:0">${esc(a.name)} — ${esc(h.place)}</h2>
      <span class="tag ${h.feasibility === "CHALLENGED_OR_RETIRED" ? "u" : "k"}"
        >${low(h.feasibility)}</span></div>

    <h3 style="font-size:15px;margin:16px 0 6px">Why this might make economic sense</h3>
    <p class="lede">${esc(h.economic_rationale)}</p>
    ${ecHowFound(h)}

    <h3 style="font-size:15px;margin:18px 0 6px">What already exists</h3>
    <p>${esc(sup.reading)}</p>
    <div class="chain">${Object.entries(sup.existing_providers)
      .map(([k, v]) => `${String(v).padStart(4)}  ${k.replace(/_/g, " ")}`).join("\n")}</div>
    <p class="bt-w"><b>Could an incumbent do it?</b> ${esc(sup.could_an_incumbent_expand)}</p>
    <p class="bt-r"><b>Do not infer:</b> ${esc(sup.do_not_infer)}</p>

    <h3 style="font-size:15px;margin:18px 0 6px">Who would buy it, and how well do we know?</h3>
    ${h.demand.map(d => `<div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
      <span class="tag ${DEM_TAG[d.evidence] || "u"}">${low(d.evidence)}</span>
      <span>${esc(d.what)}${d.value != null ? " — " + n(d.value) : ""}</span></div>
      <p class="bt-u" style="margin:0 0 6px">${esc(d.basis || "")}${d.note ? " — " + esc(d.note) : ""}</p>`).join("")}

    <h3 style="font-size:15px;margin:18px 0 6px">What would make it viable</h3>
    <p class="bt-s">${esc(op.model)}</p>
    ${op.known ? `<p><b>Known.</b> ${Object.entries(op.known).map(([k, v]) =>
      `${low(k)} ${Array.isArray(v) ? v.map(n).join("–") : n(v)}`).join("; ")}</p>` : ""}
    <p class="bt-u"><b>Not known.</b> ${(op.unknown || []).map(esc).join("; ")}</p>
    <p class="bt-w"><b>Break-even.</b> ${esc(op.break_even)}</p>
    ${op.worked_floor ? `<p class="bt-s">${esc(op.worked_floor)}</p>` : ""}
    ${op.supplied ? op.supplied.map(x => `<p class="bt-r"><b>Supplied by ${esc(x.source)}
      (${esc(x.date)}):</b> ${Object.entries(x.data).map(([k, v]) => low(k) + " " + v).join("; ")}
      — <i>${esc(x.status)}</i></p>`).join("") : ""}

    <h3 style="font-size:15px;margin:18px 0 6px">What capital it might need</h3>
    <p>${(cap.kinds_possibly_required || []).map(esc).join("; ")}</p>
    <p class="bt-r"><b>${esc(cap.amounts)}</b> ${esc(cap.do_not_invent)}</p>

    <h3 style="font-size:15px;margin:18px 0 6px">Four ways to develop it — none preferred</h3>
    ${h.development_strategies.map(s => `<div class="card" style="margin:10px 0 0">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
        <b>${esc(s.name)}</b><span class="tag ${STRAT_TAG[s.kind] || "u"}">${low(s.kind)}</span></div>
      <p class="bt-u" style="margin:3px 0 0">who: ${esc(s.who_would_do_it)}</p>
      <p style="margin:4px 0 0"><b>Requires.</b> ${s.what_it_requires.map(esc).join("; ")}</p>
      <p class="bt-s" style="margin:3px 0 0"><b>For.</b> ${s.advantages.map(esc).join("; ")}</p>
      <p class="bt-w" style="margin:3px 0 0"><b>Against.</b> ${s.risks.map(esc).join("; ")}</p>
      <p class="muted" style="margin:3px 0 0">evidence: ${esc(s.evidence_for_it)}
        ${s.strengthened_by_response ? ' <span class="tag s">strengthened by a response</span>' : ""}</p>
    </div>`).join("")}
    <p class="bt-r">${esc(h.development_strategies[0].why_not_ranked)}</p>

    <h3 style="font-size:15px;margin:18px 0 6px">What we need to find out</h3>
    <ul>${h.critical_unknowns.map(u => `<li>${esc(u)}</li>`).join("")}</ul>

    ${det("Who could help, and what we would ask each of them",
      ECD.validation_requests.filter(v => v.hypothesis === h.id).map(v => `
        <p><b>${low(v.role)}</b> — ${esc(v.role_means)}</p>
        <ul>${v.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
        <p class="bt-r">${esc(v.we_are_not_claiming)} ${esc(v.no_message_is_sent)}</p>`).join(""))}
    <p class="bt-u">${esc(h.evidence_is_place_specific)}</p>
  </section>`;
}

const REL_TAG = { LOCALLY_OBSERVED: "s", STATE_OBSERVED: "s", NATIONALLY_MODELLED: "w",
  ESTIMATED: "w", HYPOTHETICAL: "u" };
const EFF_TAG = { OBSERVED_EFFECT: "s", ACCOUNTING_IMPLICATION: "s", MODELLED_SCENARIO: "w",
  HYPOTHESISED: "u", CAUSAL_IMPACT: "u" };

function ecActivity(a) {
  const grp = (items, label) => items.length ? `<p style="margin:6px 0 0"><b>${label}.</b></p>`
    + items.map(x => `<div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <span class="tag ${REL_TAG[x.evidence] || "u"}">${low(x.evidence)}</span>
        <span>${esc(x.what)}${x.quantity != null ? " — " + n(x.quantity)
          + (x.unit ? " " + esc(x.unit) : "") : ""}</span></div>
      ${x.note ? `<p class="bt-u" style="margin:0 0 6px">${esc(x.note)}</p>` : ""}`).join("") : "";
  return `<div class="card" style="margin:12px 0 0">
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <b>${esc(a.name)}</b><span class="tag u">${low(a.system)}</span></div>
    <p class="bt-u" style="margin:3px 0 0">produces ${esc(a.produces)} ·
      measured in ${esc(a.output_unit)}${a.actors_observed
        ? " · " + n(a.actors_observed) + " actors observed" : ""}</p>
    ${grp(a.inputs, "What it requires")}
    <p style="margin:6px 0 0"><b>How it works.</b> ${esc(a.process)}</p>
    ${grp(a.buyers, "Who buys the output")}
    ${grp(a.suppliers, "Who supplies it")}
    ${a.capacity ? `<p class="bt-r" style="margin:6px 0 0"><b>Capacity
      ${low(a.capacity.state)}.</b> ${esc(a.capacity.why)}</p>` : ""}
    ${det("Infrastructure, capital, institutions, households, outside", `
      <p><b>Infrastructure.</b> ${a.infrastructure.map(esc).join("; ")}</p>
      <p><b>Capital observed.</b> ${(a.capital.observed || []).map(esc).join("; ") || "none"}</p>
      <p><b>Capital unobserved.</b> ${(a.capital.unobserved || []).map(esc).join("; ")}</p>
      <p><b>Institutions.</b> ${a.institutions.map(esc).join("; ")}</p>
      <p><b>Households.</b> ${esc(a.households.mechanism)}</p>
      <p><b>From outside the region.</b> ${a.external.map(esc).join("; ")}</p>`)}
  </div>`;
}

function ecRel(r) {
  return `<div class="bt"><div class="bt-n"></div><div class="bt-b">
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <b>${esc(r.from)} → ${esc(r.to)}</b>
      <span class="tag ${REL_TAG[r.evidence] || "u"}">${low(r.evidence)}</span></div>
    <p class="bt-u" style="margin:3px 0 0">${low(r.kind)} · ${esc(r.geography)}${
      r.period ? " · " + esc(r.period) : ""}</p>
    <p style="margin:4px 0 0">${esc(r.mechanism)}</p>
    ${r.quantity != null ? `<p class="num" style="margin:4px 0 0">${n(r.quantity)}
      <span class="muted">${esc(r.unit || "")}</span></p>` : ""}
    ${r.limits ? `<p class="bt-r" style="margin:4px 0 0">${esc(r.limits)}</p>` : ""}
    ${r.conditions && r.conditions.length ? `<p class="bt-w" style="margin:4px 0 0">
      <b>Only if:</b> ${r.conditions.map(esc).join("; ")}</p>` : ""}
  </div></div>`;
}

function ecNetwork() {
  const M = ECN.materials_market_scale, PR = ECN.effect_chains[0], TP = ECN.two_perspectives;
  return `
    <section>
      <h2>How this economy actually produces</h2>
      <p class="lede">${esc(ECN.the_position)}</p>
      <div class="chain">${Object.entries(ECN.counts.by_evidence)
        .map(([k, v]) => `${String(v).padStart(4)}  ${k.replace(/_/g, " ").toLowerCase()}`).join("\n")}</div>
      ${det("What each relationship type means", Object.entries(ECN.relationship_types)
        .map(([k, v]) => `<p><b>${low(k)}</b> — ${esc(v)}</p>`).join(""))}
    </section>

    <section>
      <h2>Input-output: what is computed, and what cannot be</h2>
      <p class="num">${esc(ECN.io.framework)}</p>
      <p class="bt-s"><b>Computed.</b> ${esc(ECN.io.what_is_computed)}</p>
      <p class="bt-u">${esc(ECN.io.identity_checked)}</p>
      <p class="bt-r"><b>${esc(ECN.io.classification)}</b></p>
      ${Object.entries(ECN.io.what_is_not).map(([k, v]) =>
        `<div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
          <span class="tag u">not computed</span><span>${low(k)}</span></div>
         <p class="bt-u" style="margin:0 0 6px">${esc(v)}</p>`).join("")}
    </section>

    ${ECN.networks.map(net => `<section>
      <h2>${esc(net.title)}</h2>
      ${net.activities.map(ecActivity).join("")}
      <h3 style="font-size:15px;margin:18px 0 6px">What depends on what</h3>
      ${net.relationships.map(ecRel).join("")}
      ${net.route_economics ? `
        <h3 style="font-size:15px;margin:18px 0 6px">What a route must recover</h3>
        <div class="chain">stops   contribution needed per stop (low – high)
${net.route_economics.table.map(r => `${String(r.stops).padStart(5)}   $${r.low.required_contribution_per_stop.toFixed(2)} – $${r.high.required_contribution_per_stop.toFixed(2)}`).join("\n")}</div>
        <p class="bt-r">${esc(net.route_economics.do_not_conclude)}</p>
        <p class="bt-u"><b>Unresolved:</b> ${net.route_economics.unresolved.map(esc).join("; ")}</p>` : ""}
      ${net.direct_requirements ? det("What this activity buys, per dollar of output (national)",
        `<div class="chain">${net.direct_requirements.top_inputs.map(x =>
          `${x.coefficient_per_dollar_of_output.toFixed(4)}  ${x.commodity}`).join("\n")}</div>
         <p class="bt-r">${esc(net.direct_requirements.not_a_local_transaction)}</p>`) : ""}
    </section>`).join("")}

    ${M ? `<section>
      <h2>How big is the materials question?</h2>
      <div class="row" style="gap:28px;align-items:flex-start;flex-wrap:wrap">
        <div><div class="num" style="font-size:22px">${money(M.observed.construction_payroll_usd)}</div>
          <p class="bt-u" style="margin:2px 0 0">construction payroll<br>observed</p></div>
        <div><div class="num" style="font-size:22px">${money(M.estimated.implied_construction_output_usd)}</div>
          <p class="bt-u" style="margin:2px 0 0">implied output<br>model-dependent estimate</p></div>
        <div><div class="num" style="font-size:22px">${money(M.estimated.materials_purchase_usd)}</div>
          <p class="bt-u" style="margin:2px 0 0">materials purchase<br>model-dependent estimate</p></div>
      </div>
      <p class="bt-s" style="margin:10px 0 0"><b>The chain.</b> ${esc(M.chain)}</p>
      <p class="bt-r"><b>Which way is the error?</b> Not established. One term has a known sign
      — ${esc(M.error_direction.one_term_with_a_known_sign)} — and
      ${M.error_direction.terms_with_no_established_sign.length} do not:
      ${M.error_direction.terms_with_no_established_sign.map(esc).join("; ")}.
      <b>R3.20 called these a floor and R3.21 withdrew it:</b>
      ${esc(M.error_direction.r320_said)}</p>
      <p class="bt-w"><b>What is not claimed.</b> ${M.what_is_not_claimed.map(esc).join("; ")}.</p>
      <p class="bt-s"><b>${esc(M.the_real_question)}</b></p>
    </section>` : ""}

    <section>
      <h2>What could change it</h2>
      ${ECN.levers.map(l => `<div class="card" style="margin:12px 0 0">
        <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
          <b>${esc(l.proposed_change)}</b>
          <span class="tag ${EFF_TAG[l.effect_class] || "u"}">${low(l.effect_class)}</span></div>
        <p class="bt-u" style="margin:3px 0 0">${low(l.kind)} · attaches to ${esc(l.attaches_to)}</p>
        <p style="margin:4px 0 0"><b>Now.</b> ${esc(l.current_condition)}</p>
        <p style="margin:4px 0 0"><b>Mechanism.</b> ${esc(l.mechanism)}</p>
        <p class="bt-u" style="margin:4px 0 0">changes: ${l.affected_variables.map(esc).join("; ")}</p>
        <p class="bt-s" style="margin:4px 0 0"><b>Financial.</b> ${esc(l.potential_outcomes.financial)}</p>
        <p class="bt-s" style="margin:2px 0 0"><b>Development.</b> ${esc(l.potential_outcomes.development)}</p>
        ${l.counterfactual ? `<p class="bt-w" style="margin:4px 0 0"><b>Without it.</b> ${esc(l.counterfactual)}</p>` : ""}
        ${det("Who must act, and what would settle it", `
          <p>${l.actors_required.map(esc).join("; ")}</p>
          <p class="bt-u">${esc(l.investment_or_coordination)}</p>
          <ul>${l.validation.map(v => `<li>${esc(v)}</li>`).join("")}</ul>`)}
      </div>`).join("")}
    </section>

    <section>
      <h2>If it worked, what else would move?</h2>
      <p class="bt-r"><b>${esc(PR.reading)}</b></p>
      <div class="chain">${PR.steps.map((s, i) =>
        `${String(i + 1).padStart(2)}. ${s.step}\n    [${s.class.toLowerCase().replace(/_/g, " ")}] ${s.limits}`).join("\n")}</div>
      <p class="bt-w"><b>Stops at:</b> ${esc(PR.stops_at)}</p>
      <p class="bt-u"><b>Counterfactual.</b> ${esc(PR.counterfactual)}</p>
    </section>

    <section>
      <h2>Good investment, or good development?</h2>
      <p class="bt-r">${esc(TP.why_both)}</p>
      <div class="row" style="gap:28px;align-items:flex-start;flex-wrap:wrap">
        <div style="flex:1;min-width:15rem"><p><b>As an investment</b></p>
          ${Object.entries(TP.financial).filter(([k]) => k !== "risk").map(([k, v]) =>
            `<p class="bt-u" style="margin:2px 0 0">${low(k)}: ${esc(v)}</p>`).join("")}
          <p class="bt-w" style="margin:4px 0 0">Risks: ${TP.financial.risk.map(esc).join("; ")}</p></div>
        <div style="flex:1;min-width:15rem"><p><b>As development</b></p>
          ${Object.entries(TP.development).map(([k, v]) =>
            `<p class="bt-u" style="margin:2px 0 0">${low(k)}: ${esc(v)}</p>`).join("")}</div>
      </div>
      <p class="bt-r" style="margin:10px 0 0"><b>Portfolio.</b> ${esc(TP.portfolio.state)}
        Complementary: ${TP.portfolio.complementary.map(esc).join("; ")}.
        Competing: ${TP.portfolio.competing.map(esc).join("; ")}.</p>
    </section>`;
}


/* ============================ R3.21 · FEASIBILITY ============================
 * One opportunity, three determinations, and the eight questions §13 asks of it. The order is
 * deliberate: what the finding IS, then the four conclusions, then the three dimensions, and
 * only then the market, the arithmetic and the machinery. Nobody opening this needs to see a
 * data structure before they see a verdict.
 *
 * NO COMPOSITE SCORE IS RENDERED ANYWHERE. The three determinations are shown side by side
 * precisely because combining them would hide the distinction they exist to make. */
const MK_TAG = {
  OBSERVED_TRANSACTION: "s", EXECUTED_CONTRACT: "s", PUBLISHED_PROCUREMENT: "w",
  SUPPLIER_QUOTE: "w", CUSTOMER_INTERVIEW: "w", EXPRESSION_OF_INTEREST: "w",
  MARKET_ESTIMATE: "w", INDUSTRY_PROXY: "w", HYPOTHESIS: "u",
};
const DET_TAG = {
  SUPPORTED: "s", PARTIALLY_SUPPORTED: "w", NOT_ESTABLISHED: "u",
  CHALLENGED: "w", REFUTED: "w",
};

function fctLine(f) {
  const v = f.value == null ? "" :
    (String(f.unit || "").includes("USD") ? money(f.value) : n(f.value))
    + ` <span class="muted">${esc(f.unit || "")}</span>`;
  return `<div style="margin:0 0 10px">
    <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
      <b style="font-size:13.5px">${esc(f.what)}</b>
      <span class="tag ${MK_TAG[f.evidence] || "u"}">${low(f.evidence)}</span>
      ${f.model_dependent ? `<span class="tag u">not local</span>` : ""}
      ${f.stated_not_observed ? `<span class="tag w">stated, not observed</span>` : ""}
    </div>
    ${v ? `<div class="num" style="font-size:17px;margin:1px 0 0">${v}</div>` : ""}
    ${f.source ? `<p class="bt-u" style="margin:1px 0 0">${esc(f.source)}</p>` : ""}
    ${f.derivation ? `<p class="bt-u" style="margin:1px 0 0">derived: ${esc(f.derivation)}</p>` : ""}
    ${f.note ? `<p class="bt-w" style="margin:2px 0 0">${esc(f.note)}</p>` : ""}
  </div>`;
}

function ecfDimension(d) {
  return `<div class="card" style="margin:12px 0 0">
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <b>${low(d.dimension)}</b>
      <span class="tag ${DET_TAG[d.determination] || "u"}">${low(d.determination)}</span>
    </div>
    <p class="bt-u" style="margin:2px 0 0">${esc(d.means)}</p>
    ${d.history ? d.history.map(h => `<p class="bt-r">${h.moved
      ? `<b>Changed:</b> ${low(h.was)} → ${low(h.now)}.` : `<b>Did not move</b> (${low(h.now)}).`}
      ${esc(h.because)}${h.unknowns_resolved_count
        ? ` ${h.unknowns_resolved_count} unknown(s) resolved.` : ""}
      ${h.note ? " " + esc(h.note) : ""}</p>`).join("") : ""}
    ${d.supporting.length ? `<p class="bt-s" style="margin:10px 0 2px"><b>For</b></p>`
      + d.supporting.map(fctLine).join("") : ""}
    ${d.contradictory.length ? `<p class="bt-s" style="margin:8px 0 2px"><b>Against</b></p>`
      + d.contradictory.map(fctLine).join("") : ""}
    ${d.unknowns.length ? `<p class="bt-s" style="margin:8px 0 2px"><b>Not known</b></p>`
      + d.unknowns.map(u => `<div style="margin:0 0 8px">
        <div class="row" style="gap:8px;align-items:baseline"><b style="font-size:13px"
          >${esc(u.what)}</b>${u.critical ? `<span class="tag u">critical</span>` : ""}</div>
        <p class="bt-u" style="margin:1px 0 0">${esc(u.why)}</p>
        <p class="bt-w" style="margin:1px 0 0"><b>To resolve:</b> ${esc(u.how_to_resolve)}</p>
      </div>`).join("") : ""}
    <p class="bt-r"><b>What would change it.</b> ${d.would_change_it.map(esc).join("; ")}.</p>
    <p class="bt-s"><b>Next.</b> ${esc(d.next_action)}</p>
    <p class="bt-u">Bears on ${esc(d.bears_on)}. ${esc(d.not_combined)}</p>
  </div>`;
}

function ecfModel(m) {
  const D = m.derived, U = m.underdetermined;
  const row = (k, lab, fmt) => D[k] == null ? "" : `<div><div class="num"
    style="font-size:20px">${fmt ? fmt(D[k]) : n(D[k])}</div>
    <p class="bt-u" style="margin:2px 0 0">${esc(lab)}</p></div>`;
  return `<div class="card" style="margin:12px 0 0">
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <b>${esc(m.name)}</b>
      <span class="tag ${m.computable ? "w" : "u"}"
        >${m.computable ? "break-even computes" : "underdetermined"}</span>
    </div>
    <div class="chain" style="margin:8px 0 0">${Object.entries(m.input_states)
      .filter(([, v]) => v).map(([k, v]) => `<span>${v} ${low(k)}</span>`).join("")}</div>
    ${Object.keys(D).length ? `<div class="row" style="gap:24px;margin:12px 0 0;flex-wrap:wrap">
      ${row("contribution_per_unit", "contribution per " + m.output_unit.replace(/s$/, ""), money)}
      ${row("contribution_margin", "contribution margin", v => (v * 100).toFixed(1) + "%")}
      ${row("break_even_volume", "break-even " + m.output_unit)}
      ${row("break_even_price", "break-even price", money)}
      ${row("required_utilisation", "required utilisation", v => (v * 100).toFixed(0) + "%")}
      ${row("operating_cash_before_financing", "operating cash", money)}
      ${row("debt_service_cover", "debt service covered", v => v.toFixed(2) + "×")}
      ${row("working_capital_requirement", "working capital needed", money)}
    </div>` : ""}
    ${D.break_even_volume_why_none ? `<p class="bt-r">${esc(D.break_even_volume_why_none)}</p>` : ""}
    ${D.debt_service_cover_why_none ? `<p class="bt-r">${esc(D.debt_service_cover_why_none)}</p>` : ""}
    ${D.required_utilisation != null && D.required_utilisation > 1
      ? `<p class="bt-r"><b>Required utilisation is above capacity.</b> On these inputs the
         operation would have to sell more than it can produce before it covered its operating
         cost, which means it does not cover it at all.</p>` : ""}
    ${D.break_even_price_means ? `<p class="bt-u">${esc(D.break_even_price_means)}</p>` : ""}
    ${D.still_not_established ? `<p class="bt-r">${esc(D.still_not_established)}</p>` : ""}
    ${m.note ? `<p class="bt-w">${esc(m.note)}</p>` : ""}
    ${U.length ? det(`What cannot be computed, and what is missing (${U.length})`,
      U.map(u => `<p style="margin:0 0 10px"><b>${esc(u.output)}</b><br>
        <span class="num" style="font-size:13px">${esc(u.equation)}</span><br>
        <span class="muted">known: ${Object.entries(u.known).map(([k, v]) =>
          esc(k) + " = " + n(v)).join(", ") || "nothing"}</span><br>
        <span class="bt-w">missing: ${u.missing.map(esc).join(", ")}</span></p>`).join("")) : ""}
    ${det(`Every input, and what state it is in (${m.inputs.length})`,
      m.inputs.map(x => `<p style="margin:0 0 8px"><b>${esc(x.name)}</b>
        <span class="tag ${x.state === "OBSERVED" ? "s"
          : x.state === "UNKNOWN" ? "u" : "w"}">${low(x.state)}</span>
        ${x.known ? `<br><span class="num" style="font-size:14px">${
          String(x.unit || "").includes("USD") ? money(x.value) : n(x.value)}
          <span class="muted">${esc(x.unit)}</span></span>` : ""}
        ${x.source ? `<br><span class="muted">${esc(x.source)}</span>` : ""}
        ${x.note ? `<br><span class="bt-w">${esc(x.note)}</span>` : ""}</p>`).join(""))}
    ${m.sensitivity.length ? det(`Sensitivity to the inputs that are held (${m.sensitivity.length})`,
      `<p class="bt-u">Only the inputs actually present are moved. Nothing is varied that was
       never there.</p>` + m.sensitivity.map(x => `<p style="margin:0 0 4px">
        <b>${esc(x.variable)}</b> ${x.change > 0 ? "+" : ""}${(x.change * 100).toFixed(0)}% →
        contribution ${money(x.contribution_per_unit)}${x.break_even_volume
          ? `, break-even ${n(x.break_even_volume)}` : ""}
        ${x.break_even_volume_note ? ` — ${esc(x.break_even_volume_note)}` : ""}</p>`).join("")) : ""}
    <p class="bt-u">${m.what_it_is_not.map(esc).join(" ")}</p>
  </div>`;
}

function ecfFunnel(F) {
  return `<section>
    <h2>How much of this is demand anybody could sell into?</h2>
    <p class="lede">${esc(F.the_rule)}</p>
    ${F.stages.map((s, i) => `<div class="row"
      style="gap:12px;align-items:baseline;margin:0 0 10px;padding-left:${i * 14}px">
      <div style="min-width:12rem"><b style="font-size:13.5px">${low(s.stage)}</b>
        <span class="tag ${MK_TAG[s.evidence] || "u"}">${low(s.evidence)}</span></div>
      <div class="num" style="font-size:18px;min-width:8rem">${s.value == null ? "—"
        : (String(s.unit).includes("USD") ? money(s.value) : n(s.value) + " " + esc(s.unit))}</div>
      <div style="flex:1;min-width:14rem"><p class="bt-u" style="margin:0"
        >${s.value == null ? "<b>To establish it:</b> " : ""}${esc(s.basis)}</p>
        ${s.note ? `<p class="bt-w" style="margin:2px 0 0">${esc(s.note)}</p>` : ""}
        ${s.scenario_warning ? `<p class="bt-r">${esc(s.scenario_warning)}</p>` : ""}</div>
    </div>`).join("")}
    <p class="bt-r"><b>Lowest stage established:</b> ${low(F.lowest_established)}.
      ${F.unresolved.length} below it are unresolved. ${esc(F.no_share_assumed)}.</p>
  </section>`;
}

function ecfFeasView(f) {
  const M = f.market, C = f.conclusions, IR = f.investment_readiness, R = f.regional;
  const cmp = f.comparison;
  return `
  <section>
    <p class="lede">${esc(f.the_finding)}</p>
    <p class="bt-r"><b>Where this is.</b> ${esc(f.geography.qualification)}
      Not the same as: ${f.geography.not_the_same_as.map(esc).join("; ")}.</p>
  </section>

  <section>
    <h2>Four different conclusions</h2>
    <p class="bt-u">${esc(C.distinct)}</p>
    <div class="row" style="gap:18px;margin:12px 0 0;flex-wrap:wrap">
      ${C.conclusions.map(c => `<div class="card" style="flex:1;min-width:15rem;margin:0">
        <span class="tag ${DET_TAG[c.state] || "u"}">${low(c.state)}</span>
        <p class="bt-s" style="margin:6px 0 0"><b>${esc(c.says)}</b></p>
        <p class="bt-u" style="margin:2px 0 0">rests on ${low(c.rests_on)}</p>
        ${c.requirements_unmet && c.requirements_unmet.length
          ? `<p class="bt-w" style="margin:4px 0 0">${c.requirements_unmet.length} requirement(s)
             unmet: ${c.requirements_unmet.map(esc).join("; ")}.</p>` : ""}
      </div>`).join("")}
    </div>
  </section>

  <section>
    <h2>The three questions, asked separately</h2>
    <p class="bt-u">${esc(ECF.no_composite_score.why)}</p>
    ${f.dimensions.map(ecfDimension).join("")}
  </section>

  <section>
    <h2>What is the market?</h2>
    <p class="lede">${esc(M.product.what)}</p>
    <p class="bt-w"><b>Specification.</b> ${esc(M.product.specification)}</p>
    ${M.product.why_this_category
      ? `<p class="bt-u"><b>Why this category.</b> ${esc(M.product.why_this_category)}</p>` : ""}
    <h3 style="font-size:15px;margin:18px 0 6px">Who would buy it</h3>
    ${M.customers.map(fctLine).join("")}
    <h3 style="font-size:15px;margin:18px 0 6px">Who supplies it now</h3>
    ${M.existing_suppliers.map(fctLine).join("")}
    <h3 style="font-size:15px;margin:18px 0 6px">What customers could choose instead</h3>
    ${M.substitutes.map(fctLine).join("")}
    <h3 style="font-size:15px;margin:18px 0 6px">What is known about price</h3>
    ${M.prices.map(fctLine).join("")}
    <h3 style="font-size:15px;margin:18px 0 6px">What decides who gets the order</h3>
    <ul class="bt-s" style="margin:0 0 0 1.1rem">${M.competition.what_determines_selection
      .map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <p class="bt-r">${esc(M.competition.structure.reading)}</p>
    <p class="bt-w"><b>An entrant faces.</b> ${esc(M.competition.entrant_faces)}</p>
    <h3 style="font-size:15px;margin:18px 0 6px">How the market is reached</h3>
    ${M.market_access.channels.map(c => `<div style="margin:0 0 10px">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <b style="font-size:13.5px">${esc(c.channel)}</b>
        <span class="tag ${MK_TAG[c.evidence] || "u"}">${low(c.evidence)}</span>
        ${c.establishments ? `<span class="num" style="font-size:14px">${n(c.establishments)}
          establishments${c.employment ? ", " + n(c.employment) + " jobs" : ""}</span>` : ""}
      </div>
      <p class="bt-u" style="margin:1px 0 0">${esc(c.relevance)}</p>
      ${c.note ? `<p class="bt-w" style="margin:1px 0 0">${esc(c.note)}</p>` : ""}
    </div>`).join("")}
    <p class="bt-s"><b>What a supplier would have to meet.</b>
      ${M.market_access.requirements.map(esc).join("; ")}.</p>
    <p class="bt-r">${esc(M.market_access.none_of_which_is_held)}.</p>
    ${det("Where everything is, asked separately", Object.entries(M.geography)
      .map(([k, v]) => `<p><b>${low(k)}</b><br><span class="muted">${esc(v)}</span></p>`)
      .join(""))}
    ${det(`What could change demand, price or cost (${M.dynamics.length})`,
      M.dynamics.map(x => `<p><b>${esc(x.what)}</b>
        <span class="tag ${x.held ? "w" : "u"}">${x.held ? "held" : "not held"}</span>
        <span class="muted"> · ${esc(x.direction)}</span>
        ${x.note ? `<br><span class="bt-w">${esc(x.note)}</span>` : ""}</p>`).join(""))}
    <p class="bt-r">${esc(M.reading.large_is_not_accessible)}.
      ${esc(M.reading.buyer_is_not_relationship)}. ${esc(M.reading.notice_is_not_award)}.</p>
  </section>

  ${ecfFunnel(f.funnel)}

  <section>
    <h2>Could a business make money?</h2>
    ${ecfModel(f.economics)}
    ${f.economics_as_held ? `<p class="bt-s" style="margin:16px 0 0"><b>And the same business on
      the evidence actually held, with nothing entered:</b></p>${ecfModel(f.economics_as_held)}` : ""}
    ${f.threshold ? `<h3 style="font-size:15px;margin:20px 0 6px">The threshold</h3>
      <p class="num" style="font-size:13px">${esc(f.threshold.equation)}</p>
      <p class="bt-u">Observed input: ${esc(f.threshold.observed_input)}.
        Entered: ${f.threshold.entered_inputs.map(esc).join(", ")}.</p>
      <div class="row" style="gap:0;flex-wrap:wrap;margin:10px 0 0">
        ${f.threshold.table.map(t => `<div style="min-width:9rem;margin:0 18px 12px 0">
          <div class="num" style="font-size:17px">${money(t.required_order_value_usd)}</div>
          <p class="bt-u" style="margin:1px 0 0">${t.stops_per_loop} stops · ${esc(t.route_cost_case)}
            route<br><span class="tag ${t.covers ? "w" : "u"}"
            >${t.covers ? "covered" : "short"}</span></p></div>`).join("")}
      </div>
      <p class="bt-r">${esc(f.threshold.reading)}</p>
      <p class="bt-w"><b>What would make it a finding.</b>
        ${f.threshold.what_would_make_it_a_finding.map(esc).join("; ")}.</p>` : ""}
    ${f.verification ? `<div class="card" style="margin:16px 0 0;background:var(--paper-2)">
      <h3 style="font-size:15px;margin:0 0 2px">Move the assumptions</h3>
      <p class="bt-u" style="margin:0 0 10px">${esc(f.verification.adjustable.warning)}</p>
      ${["order_value", "gross_margin", "stops_per_loop"].map(k => {
        const a = f.verification.adjustable[k];
        return `<div class="row" style="margin:0 0 10px;align-items:center;gap:12px">
          <label for="fs-${k}" style="font-size:13px;min-width:11rem"><b>${low(k)}</b></label>
          <input id="fs-${k}" type="range" min="${a.min}" max="${a.max}" step="${a.step}"
            value="${a.default}" style="flex:1;min-width:9rem">
          <span id="fs-${k}-label" class="num" style="font-size:16px;min-width:4.5rem"></span>
          <span class="tag u">entered</span></div>`;
      }).join("")}
      <button id="fs-reset" type="button">Reset to the published assumptions</button>
      <div id="fs-out" style="margin:12px 0 0"></div>
      <p class="bt-u">${esc(f.verification.model)}. Identity:
        ${f.verification.identity.map(esc).join("; ")}.</p>
    </div>` : ""}
  </section>

  <section>
    <h2>What are the alternatives?</h2>
    <p class="lede">${esc(cmp.question)}</p>
    <p class="bt-s"><b>${cmp.strongest_supported_case
      ? "Strongest currently supported case: " + esc(cmp.strongest_supported_case) + "."
      : "No single model can be ranked first."}</b>
      ${cmp.why_if_tied ? esc(cmp.why_if_tied) + "." : ""}</p>
    <p class="bt-u">Ranked on ${esc(cmp.ranked_on)}</p>
    <p class="bt-r"><b>Economic ranking: ${cmp.economic_ranking.possible ? "possible" : "refused"}.</b>
      ${esc(cmp.economic_ranking.refusal || "every model has computable economics")}
      ${cmp.economic_ranking.and_the_generic_model
        ? "<br>" + esc(cmp.economic_ranking.and_the_generic_model) : ""}</p>
    ${cmp.ranking.map((rk, i) => {
      const m = f.models.find(x => x.name === rk.name);
      return `<div class="card" style="margin:12px 0 0">
        <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
          <b>${i + 1}. ${esc(rk.name)}</b>
          <span class="tag ${MK_TAG[rk.evidence] || "u"}">${low(rk.evidence)}</span>
        </div>
        <p class="bt-u" style="margin:2px 0 0">${esc(m.kind_means)}</p>
        <p class="bt-s"><b>Evidence for it.</b> ${esc(m.evidence_for_it.what)}
          ${m.evidence_for_it.note ? "<br><span class='bt-w'>" + esc(m.evidence_for_it.note)
            + "</span>" : ""}</p>
        ${m.note ? `<p class="bt-r">${esc(m.note)}</p>` : ""}
        ${det("The nine structural questions", Object.entries(m.answers).map(([k, v]) =>
          `<p><b>${low(k)}</b><br><span class="muted">${esc(v)}</span></p>`).join(""))}
      </div>`;
    }).join("")}
    <p class="bt-r"><b>${esc(cmp.no_default)}</b></p>
    <p class="bt-w"><b>Minimum evidence to separate them.</b>
      ${esc(cmp.minimum_evidence_to_separate)}</p>
  </section>

  <section>
    <h2>What would it take to build, and is it ready for money?</h2>
    <p class="lede">${esc(IR.reading)}</p>
    ${IR.requirements.map(q => `<div class="row" style="gap:10px;align-items:baseline;margin:0 0 6px">
      <span class="tag ${q.met ? "s" : "u"}">${q.met ? "met" : "unmet"}</span>
      <div style="flex:1"><b style="font-size:13.5px">${esc(q.requirement)}</b>
        <span class="muted"> · required at ${low(q.gate)}</span></div></div>`).join("")}
    <p class="bt-s"><b>Highest state the existing ladder allows: ${low(IR.state)}.</b>
      ${esc(IR.state_requires)}.</p>
    <p class="bt-u">Operator ladder: ${low(IR.operator_state)}. Ladder: ${esc(IR.ladder)}.</p>
  </section>

  <section>
    <h2>What would it do for the region, if it worked?</h2>
    <p class="lede">${esc(R.kept_apart)}</p>
    <h3 style="font-size:15px;margin:16px 0 6px">Direct, to the enterprise</h3>
    ${R.direct_enterprise_outcomes.map(x => `<p style="margin:0 0 6px"><b>${esc(x.outcome)}</b>
      <span class="tag u">${low(x.quantity)}</span><br>
      <span class="bt-u">${esc(x.basis)}</span></p>`).join("")}
    <h3 style="font-size:15px;margin:16px 0 6px">Hypothesised, to the region</h3>
    ${R.hypothesised_regional_effects.map(x => `<div style="margin:0 0 10px">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <b style="font-size:13.5px">${esc(x.effect)}</b>
        <span class="tag ${x.class === "ACCOUNTING_IMPLICATION" ? "w" : "u"}"
          >${low(x.class)}</span></div>
      <p class="bt-u" style="margin:1px 0 0">${esc(x.mechanism)}</p>
      <p class="bt-r">${esc(x.why_weak)}</p></div>`).join("")}
    <div class="card" style="margin:14px 0 0;background:var(--paper-2)">
      <h3 style="font-size:15px;margin:0 0 2px">Local is not automatically better</h3>
      <p class="bt-s" style="margin:0">${esc(R.local_sourcing_is_not_automatically_good.rule)}</p>
      ${R.local_sourcing_is_not_automatically_good.how_it_could_weaken_the_region
        .map(x => `<p class="bt-w" style="margin:6px 0 0">· ${esc(x)}</p>`).join("")}
    </div>
  </section>

  <section>
    <h2>Who should we talk to, and what should we ask?</h2>
    ${ECF.briefs.filter(b => b.opportunity === f.id).map(b => det(
      `${low(b.role)} — ${b.questions.length} questions, ${b.the_specific_unknowns_we_need.length} unknowns`,
      `<p class="bt-s">${esc(b.the_honest_position)}</p>
       <p class="bt-r">${esc(b.we_are_not_claiming)}</p>
       <p class="bt-s" style="margin:12px 0 2px"><b>Questions</b></p>
       ${b.questions.map(q => `<p style="margin:0 0 4px">· ${esc(q)}</p>`).join("")}
       <p class="bt-s" style="margin:12px 0 2px"><b>The specific things we need</b></p>
       ${b.the_specific_unknowns_we_need.map(u => `<p style="margin:0 0 8px"><b>${esc(u.what)}</b>
         <br><span class="bt-u">${esc(u.why)}</span>
         <br><span class="bt-w">How: ${esc(u.how_it_would_be_resolved)}</span></p>`).join("")}
       ${b.equations_waiting_on_an_answer.length ? `<p class="bt-s" style="margin:12px 0 2px"
         ><b>Equations waiting on an answer</b></p>`
         + b.equations_waiting_on_an_answer.map(e => `<p style="margin:0 0 4px"
           ><span class="num" style="font-size:13px">${esc(e.equation)}</span>
           <br><span class="bt-w">missing: ${e.missing.map(esc).join(", ")}</span></p>`).join("")
         : ""}
       <p class="bt-r"><b>${esc(b.no_message_is_sent)}</b></p>`)).join("")}
  </section>

  <section>
    <h2>What an answer would change</h2>
    <p class="bt-u">Every respondent below is a labelled fixture. Nobody has been contacted and
      nobody has said any of this. What is real is what the machinery does with a reply.</p>
    ${ECF.worked_responses.filter(w => w.investigation === f.id).map(w => `
      <div class="card" style="margin:12px 0 0">
        <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
          <b>${esc(w.case)}</b><span class="tag u">fixture</span></div>
        <p class="bt-u" style="margin:2px 0 0">${esc(w.record.respondent)} ·
          ${low(w.record.role)} · ${esc(w.record.source_date)}</p>
        <p class="bt-s">${esc(w.record.detail)}</p>
        <p class="bt-s"><b>What moved.</b> ${w.record.changed.map(esc).join("; ") || "nothing"}.</p>
        ${w.record.refused.length ? `<p class="bt-r"><b>What it was refused.</b>
          ${w.record.refused.map(esc).join("; ")}.</p>` : ""}
        ${w.dimension_now ? `<p class="bt-w">${low(w.dimension_now.dimension)} is now
          <b>${low(w.dimension_now.determination)}</b>${w.dimension_now.critical_unknowns.length
            ? `, with ${w.dimension_now.critical_unknowns.length} critical unknown(s) still
               standing: ${w.dimension_now.critical_unknowns.map(esc).join("; ")}` : ""}.</p>` : ""}
        ${w.economics_now && w.economics_now.derived.break_even_volume != null
          ? `<p class="bt-s"><b>Recomputed.</b> break-even
             ${n(w.economics_now.derived.break_even_volume)}
             ${esc(w.economics_now.output_unit)}, required utilisation
             ${(w.economics_now.derived.required_utilisation * 100).toFixed(0)}%${
               w.economics_now.derived.debt_service_cover != null
                 ? `, debt service covered ${w.economics_now.derived.debt_service_cover.toFixed(2)}×`
                 : ""}.</p>` : ""}
        ${w.contradictions ? w.contradictions.map(c => `<p class="bt-r"><b>Contradiction kept.</b>
          ${esc(c.rule)}. Prior evidence retained: ${c.prior_evidence_retained.map(esc).join("; ")}.
          </p>`).join("") : ""}
      </div>`).join("")}
  </section>`;
}

function ecFeasible(r) {
  const INV = ECF.investigations;
  const f = INV.find(x => x.id === r.sel) || INV[0];
  const COR = ECF.correction;

  /* Wired after the body is in the document, and it redraws only the result panel so the
     control keeps focus. Same pattern as the R3.12 rate slider, same discipline: the sliders
     move entered assumptions and the one sourced input in the identity does not move. */
  if (f.verification) setTimeout(() => {
    const A = f.verification.adjustable;
    const keys = ["order_value", "gross_margin", "stops_per_loop"];
    const out = document.getElementById("fs-out");
    const el = k => document.getElementById("fs-" + k);
    if (!out || !el("order_value")) return;
    const redraw = () => {
      const v = {};
      for (const k of keys) {
        v[k] = Number(el(k).value);
        document.getElementById("fs-" + k + "-label").textContent =
          A[k].unit === "percent" ? v[k] + "%"
            : A[k].unit.includes("USD") ? "$" + v[k].toLocaleString() : String(v[k]);
      }
      out.innerHTML = fsPanel(f, v.order_value, v.gross_margin, v.stops_per_loop);
    };
    for (const k of keys) el(k).addEventListener("input", redraw);
    const rst = document.getElementById("fs-reset");
    if (rst) rst.addEventListener("click", () => {
      for (const k of keys) el(k).value = A[k].default;
      redraw();
    });
    redraw();
  }, 0);

  return `
  <div class="row" style="gap:8px;margin:0 0 18px;flex-wrap:wrap">
    ${INV.map(x => `<span class="tag nav-chip${x.id === f.id ? " on" : ""}"
      aria-current="${x.id === f.id ? "page" : "false"}" style="cursor:pointer"
      data-go='${JSON.stringify({ scope: "systems", mode: "feasible", sel: x.id })}'
      >${esc(x.short_title || x.title)}</span>`).join("")}
  </div>

  <section>
    <p class="lede">${esc(ECF.the_position)}</p>
  </section>

  <div class="card" style="margin:0 0 20px;background:var(--paper-2)">
    <h3 style="font-size:15px;margin:0 0 2px">A number this phase withdrew</h3>
    <p class="bt-s" style="margin:0"><b>${esc(COR.withdrawn.claim)}.</b>
      ${esc(COR.withdrawn.why)} It was in ${esc(COR.withdrawn.where_it_was)}.</p>
    <p class="bt-u">The chain is: ${esc(COR.chain)}.</p>
    ${COR.sources.map(x => `<p class="bt-w" style="margin:4px 0 0">
      <span class="tag ${x.established ? "w" : "u"}">${x.established ? "sign known"
        : "sign unknown"}</span> ${esc(x.source)} — ${esc(x.sign)}</p>`).join("")}
    <p class="bt-r"><b>${esc(COR.total)}</b></p>
    <p class="bt-w"><b>May not be read as.</b> ${COR.may_not_be_read_as.map(esc).join("; ")}.</p>
  </div>

  ${ecfFeasView(f)}

  <section>
    <h2>How this connects to everything else</h2>
    <p class="bt-u">${esc(ECF.chain.ladders.added_by_r321)}</p>
    <div class="chain" style="margin:10px 0 0">${ECF.chain.stages
      .map(s => `<span>${esc(s.stage)}</span>`).join("")}</div>
    ${det("Who owns each stage", ECF.chain.stages.map(s => `<p><b>${esc(s.stage)}</b><br>
      <span class="muted">${esc(s.owner)} · ${esc(s.added_by)}</span></p>`).join("")
      + `<p class="bt-s"><b>Ladders.</b> ${Object.entries(ECF.chain.ladders)
        .map(([k, v]) => esc(k) + ": " + esc(v)).join("<br>")}</p>`)}
    <p class="bt-s"><b>Every opportunity retains:</b>
      ${ECF.chain.what_every_opportunity_retains.map(esc).join(", ")}.</p>
  </section>`;
}

/* The assumption panel. ONE identity, shared with Python: ec_feasibility.enterprise_model
 * produces the verification table this reproduces, and test_r321 runs this arithmetic against
 * every row of it. The sliders move ENTERED assumptions, never an observation. */
function fsPanel(f, order, marginPct, stops) {
  const H = f.verification.held_constant, margin = marginPct / 100;
  const vc = order * (1 - margin) + H.route_cost_low / stops + H.handling_per_stop;
  const cpu = order - vc, vol = stops * H.loops_per_year;
  const bev = cpu > 0 ? H.fixed_annual / cpu : null;
  const util = bev ? bev / vol : null;
  const cash = cpu * vol - H.fixed_annual;
  return `<div class="row" style="gap:24px;flex-wrap:wrap">
    <div><div class="num" style="font-size:20px">${money(cpu)}</div>
      <p class="bt-u" style="margin:2px 0 0">contribution per stop</p></div>
    <div><div class="num" style="font-size:20px">${bev ? n(Math.round(bev)) : "—"}</div>
      <p class="bt-u" style="margin:2px 0 0">break-even stops a year</p></div>
    <div><div class="num" style="font-size:20px">${n(vol)}</div>
      <p class="bt-u" style="margin:2px 0 0">stops a year at capacity</p></div>
    <div><div class="num" style="font-size:20px">${util ? (util * 100).toFixed(0) + "%" : "—"}</div>
      <p class="bt-u" style="margin:2px 0 0">required utilisation</p></div>
    <div><div class="num" style="font-size:20px">${money(cash)}</div>
      <p class="bt-u" style="margin:2px 0 0">operating cash</p></div>
  </div>
  <p class="bt-${cpu <= 0 || util > 1 ? "r" : "s"}">${cpu <= 0
    ? "<b>Contribution is not positive.</b> No volume covers the fixed cost; more sales make the loss larger."
    : util > 1
      ? "<b>It does not cover its operating cost.</b> Break-even is above capacity, so the route would have to carry more stops than it has."
      : "<b>It covers its operating cost at this utilisation.</b> That is not viability: financing, working capital and seasonality are not in this identity."}</p>`;
}


/* ============================ R3.22 · DISCOVERY ============================
 * §11. A place, its productive systems, the conditions read out of the holdings, and what those
 * conditions could support. The order leads with what was FOUND and what was deliberately NOT
 * promoted, because a discovery engine that only shows its hits is not showing its discipline.
 *
 * This is one more mode of the existing scope with a subject in the route, exactly as the R3.21
 * feasibility view is. It adds no navigation hierarchy. */
const COND_TAG = {
  INPUT_WITH_LOCAL_PRODUCER: "s", INPUT_WITHOUT_PUBLISHED_PRODUCER: "u",
  DEPENDENCY_WITHOUT_CAPACITY: "w", ESTABLISHMENT_CONCENTRATION: "w",
  PRODUCTION_SERIES_BREAK: "u", SCALE_MISMATCH: "w", EVIDENCE_GAP: "u",
};
const GRADE_TAG = { HIGH: "s", MEDIUM: "w", LOW: "u", UNKNOWN: "u" };

function oppCandidate(c) {
  const p = c.priority;
  return `<div class="card" style="margin:12px 0 0">
    <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <b>${esc(c.system_label)}</b>
      <span class="tag ${COND_TAG[c.condition.kind] || "u"}">${low(c.condition.kind)}</span>
    </div>
    <p class="bt-s" style="margin:6px 0 0">${esc(c.hypothesis)}</p>
    <p class="bt-u"><b>Observed.</b> ${esc(c.condition.observation)}</p>
    <p class="bt-u">Read at ${low(c.condition.resolution)} resolution from
      ${c.condition.holdings.map(esc).join("; ")}.</p>
    <p class="bt-s" style="margin:10px 0 2px"><b>Mechanisms that could apply</b></p>
    ${c.development_mechanism.map(m => `<p class="bt-w" style="margin:0 0 4px">
      <b>${esc(m.label)}</b> — ${esc(m.mechanism)}<br>
      <span class="bt-u">Fails if: ${esc(m.fails_if)}</span></p>`).join("")}
    ${c.existing_archetypes.length
      ? `<p class="bt-u">Existing archetypes: ${c.existing_archetypes.map(esc).join(", ")}.</p>`
      : `<p class="bt-r">${esc(c.archetype_coverage)}</p>`}
    <p class="bt-s" style="margin:10px 0 2px"><b>Against it</b></p>
    ${c.counterevidence.map(x => `<p class="bt-r" style="margin:0 0 4px">
      <span class="tag ${x.strength === "OBSERVED" ? "s" : "u"}">${low(x.strength)}</span>
      <b>${esc(x.against)}</b> — ${esc(x.because)}</p>`).join("")}
    <p class="bt-s" style="margin:10px 0 2px"><b>Not known</b></p>
    <p class="bt-u" style="margin:0">${c.critical_unknowns.map(esc).join("; ")}.</p>
    <div class="row" style="gap:6px;margin:10px 0 0;flex-wrap:wrap">
      ${Object.entries(p.axes).map(([k, v]) => `<span class="tag ${GRADE_TAG[v]}"
        >${low(k)}: ${low(v)}</span>`).join("")}
    </div>
    <p class="bt-r"><b>The tradeoff.</b> ${esc(p.tradeoff)}</p>
    <p class="bt-s"><b>Next: ${low(c.next_action.kind)}.</b> ${esc(c.next_action.what)}
      <br><span class="bt-u">Settles: ${esc(c.next_action.settles)} · Cost: ${esc(c.next_action.cost)}</span></p>
    <p class="bt-u">State: ${low(c.state)}. ${esc(c.state_means)}</p>
  </div>`;
}

function oppPlace(P) {
  const D = P.discovery, SL = P.shortlist, SE = P.system_evidence;
  /* §4. Fifteen candidates are not fifteen opportunities. The audit groups them by the question
     each actually poses, and the view leads with that grouping so nobody reads the list as a
     pipeline of deals. */
  const short = SL.selected.map(id => D.candidates.find(c => c.id === id)).filter(Boolean);
  const rest = D.candidates.filter(c => !SL.selected.includes(c.id));
  return `
  ${SE ? `<section>
    <h2>What does this economy produce?</h2>
    <p class="bt-u">Nine views into one economy. They overlap and do not partition, so the rows
      below do not add to the county total — food retail sits inside retail, and both are shown.</p>
    ${Object.values(SE).map(e => `<div class="row"
      style="gap:12px;align-items:baseline;margin:0 0 8px;flex-wrap:wrap">
      <div style="min-width:15rem"><b style="font-size:13.5px">${esc(e.label)}</b>
        <span class="tag ${e.cbp_grade === "DETAILED" ? "s" : "u"}">${low(e.cbp_grade)}</span></div>
      <div class="num" style="font-size:17px;min-width:6rem">${n(e.employment)}</div>
      <div class="muted" style="min-width:5rem">${n(e.establishments)} estab</div>
      <div class="num" style="font-size:15px;min-width:6rem">${money(e.payroll_usd)}</div>
      <div style="flex:1;min-width:14rem"><p class="bt-u" style="margin:0">${esc(e.note)}</p></div>
    </div>`).join("")}
    <p class="bt-r">Employment and payroll are observed. Output, capacity, demand and margin are
      not, in any sector, from this source.</p>
  </section>` : ""}

  <section>
    <h2>What the evidence turned up, and what it does not support</h2>
    <div class="chain">${Object.entries(D.counts.by_kind).filter(([, v]) => v)
      .map(([k, v]) => `<span>${v} ${low(k)}</span>`).join("")}</div>
    <p class="bt-s">${esc(D.discipline)}</p>
    ${D.not_promoted.map(h => `<div class="card" style="margin:12px 0 0;background:var(--paper-2)">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <b>${low(h.kind)}</b><span class="tag u">not promoted</span>
        <span class="muted">${esc(h.condition)}</span></div>
      <p class="bt-r" style="margin:4px 0 0">${esc(h.why)}</p>
      <p class="bt-u" style="margin:2px 0 0">Becomes: ${esc(h.becomes)}.</p>
    </div>`).join("")}
  </section>

  ${P.audit ? `<section>
    <h2>What these candidates actually are</h2>
    <p class="lede">${esc(P.audit.the_honest_count)}</p>
    <p class="bt-u">${esc(P.audit.no_target)}</p>
    ${P.audit.groups.map(g => `<div class="card" style="margin:12px 0 0">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
        <b>${esc(g.group)}</b>
        <span class="tag ${g.klass === "DISTINCT_INVESTIGATION" ? "s"
          : g.klass === "UNSUPPORTED_UNTIL_CHECKED" ? "u" : "w"}">${low(g.klass)}</span>
      </div>
      <p class="bt-u" style="margin:2px 0 0">${g.count} candidate${g.count === 1 ? "" : "s"}
        · ${g.systems.map(x => low(x)).join(", ")}</p>
      <p class="bt-s">${esc(g.one_question)}</p>
      ${g.why_not_separate_opportunities
        ? `<p class="bt-r">${esc(g.why_not_separate_opportunities)}</p>` : ""}
    </div>`).join("")}
    <p class="bt-w" style="margin:12px 0 0">Inside every candidate below, the archetype families
      are <b>alternative strategies for one condition</b> — not separate things to do.</p>
  </section>` : ""}

  <section>
    <h2>The candidates worth looking at first</h2>
    <p class="bt-u">${esc(SL.bar)}</p>
    <p class="bt-r">${esc(SL.not_a_ranking)}</p>
    ${short.map(oppCandidate).join("")}
    ${rest.length ? det(`The other ${rest.length} candidates`, rest.map(oppCandidate).join("")) : ""}
  </section>`;
}

function oppWater(W) {
  const H = W.what_is_held;
  return `<section>
    <h2>Water, development capacity and housing</h2>
    <p class="lede">${esc(W.chain)}</p>
    <div class="row" style="gap:24px;margin:12px 0 0;flex-wrap:wrap">
      <div><div class="num" style="font-size:22px">${n(H.retail_systems)}</div>
        <p class="bt-u" style="margin:2px 0 0">retail water systems<br>named</p></div>
      <div><div class="num" style="font-size:22px">${n(H.retail_connections)}</div>
        <p class="bt-u" style="margin:2px 0 0">service connections<br>observed</p></div>
      <div><div class="num" style="font-size:22px">${n(H.population_served)}</div>
        <p class="bt-u" style="margin:2px 0 0">people served<br>observed</p></div>
      <div><div class="num" style="font-size:22px">—</div>
        <p class="bt-u" style="margin:2px 0 0">capacity<br>held for none of them</p></div>
      <div><div class="num" style="font-size:22px">${n(W.housing_production.permitted_last_5_years)}</div>
        <p class="bt-u" style="margin:2px 0 0">units permitted<br>last five years</p></div>
    </div>
    ${H.wholesale_excluded.length ? `<p class="bt-r"><b>Excluded from the connection count.</b>
      ${H.wholesale_excluded.map(x => esc(x.name) + " (" + n(x.connections) + " connections)").join("; ")}
      — a system serving zero population sells to other systems, so counting it would
      double-count the connections behind it.</p>` : ""}
    <h3 style="font-size:15px;margin:18px 0 6px">The largest systems</h3>
    ${H.largest.map(x => `<div class="row" style="gap:12px;align-items:baseline;margin:0 0 6px">
      <div style="min-width:20rem"><b style="font-size:13px">${esc(x.name)}</b></div>
      <div class="num" style="font-size:15px;min-width:6rem">${n(x.connections)} conn</div>
      <div class="muted">${n(x.population)} people · ${esc(x.owner)} · ${esc(x.source)}</div>
    </div>`).join("")}
    <h3 style="font-size:15px;margin:18px 0 6px">What is not held</h3>
    <p class="bt-u">${W.what_is_not_held.map(esc).join("; ")}.</p>
    <div class="card" style="margin:14px 0 0">
      <p class="bt-s" style="margin:0"><b>The dependency is established.</b> ${esc(W.the_dependency.how)}</p>
      <p class="bt-r"><b>Whether it binds: ${esc(W.the_dependency.binding)}</b></p>
      <p class="bt-w">${esc(W.the_dependency.why_it_matters)}</p>
    </div>
    <h3 style="font-size:15px;margin:18px 0 6px">Which mechanism the evidence supports</h3>
    ${W.archetypes_compared.map(a => `<div style="margin:0 0 10px">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <b style="font-size:13.5px">${esc(a.label)}</b>
        <span class="tag ${a.supported.startsWith("PLAUSIBLE") ? "w"
          : a.supported.startsWith("PARTIALLY") ? "w" : "u"}">${esc(a.supported.split(" —")[0])}</span>
      </div>
      <p class="bt-u" style="margin:1px 0 0">${esc(a.supported)}</p>
      <p class="bt-w" style="margin:1px 0 0">Blocked by: ${esc(a.blocked_by)}</p></div>`).join("")}
    <p class="bt-r"><b>${esc(W.conclusion)}</b></p>
    <p class="bt-s"><b>What would change it.</b> ${W.what_would_change_it.map(esc).join("; ")}.</p>
    <p class="bt-w"><b>Do not conclude.</b> ${W.do_not_conclude.map(esc).join("; ")}.</p>
  </section>`;
}

function oppFood(F) {
  const P = F.production, D = F.downstream, B = F.where_the_binding_question_is;
  return `<section>
    <h2>Food, water and where the binding question actually is</h2>
    <div class="row" style="gap:24px;margin:0 0 10px;flex-wrap:wrap">
      <div><div class="num" style="font-size:22px">${n(P.farms)}</div>
        <p class="bt-u" style="margin:2px 0 0">farm operations</p></div>
      <div><div class="num" style="font-size:22px">${money(P.total_sales_usd)}</div>
        <p class="bt-u" style="margin:2px 0 0">total farm sales<br>gross, 2022</p></div>
      <div><div class="num" style="font-size:22px">${money(P.sales_per_operation_usd)}</div>
        <p class="bt-u" style="margin:2px 0 0">per operation</p></div>
      <div><div class="num" style="font-size:22px">${n(P.irrigated_acres)}</div>
        <p class="bt-u" style="margin:2px 0 0">irrigated acres<br>of ${n(P.acres_operated)} operated</p></div>
      <div><div class="num" style="font-size:22px">${money(D.cbp_payroll_usd)}</div>
        <p class="bt-u" style="margin:2px 0 0">downstream payroll<br>handling and selling food</p></div>
    </div>
    <p class="bt-u">${esc(P.caveat)}. ${esc(D.note)}</p>
    <p class="lede" style="margin:14px 0 0">${esc(F.the_comparison)}</p>
    <div class="card" style="margin:14px 0 0;background:var(--paper-2)">
      <h3 style="font-size:15px;margin:0 0 2px">Discovery did not reach distribution</h3>
      <p class="bt-s" style="margin:0">${esc(B.not_distribution)}</p>
      <p class="bt-r">${esc(B.what_discovery_reached)}</p>
      <p class="bt-w">${esc(B.and_therefore)}</p>
    </div>
    <h3 style="font-size:15px;margin:18px 0 6px">What this system depends on</h3>
    ${Object.entries(F.cross_system).map(([k, v]) => `<p style="margin:0 0 6px">
      <b>${low(k)}</b><br><span class="bt-u">${esc(v)}</span></p>`).join("")}
    <p class="bt-r">${esc(F.honest_limit)}</p>
  </section>`;
}

function oppCorrection(C) {
  const D = C.demand_at_product_resolution, S = C.supply_at_product_resolution;
  return `<section>
    <h2>Correcting R3.21 on concrete</h2>
    <p class="bt-u"><b>What R3.21 concluded.</b> ${esc(C.what_r321_concluded)}</p>
    <p class="bt-r"><b>What was available.</b> ${esc(C.what_was_available)}</p>
    <h3 style="font-size:15px;margin:16px 0 6px">Ready-mix concrete, per dollar of output, by what is built</h3>
    <div class="row" style="gap:0;flex-wrap:wrap">
      ${D.by_building_type.map(b => `<div style="min-width:11rem;margin:0 20px 12px 0">
        <div class="num" style="font-size:18px">${b.ready_mix_coefficient.toFixed(5)}</div>
        <p class="bt-u" style="margin:1px 0 0">${esc(b.building_type)}<br>
          implies ${money(b.implied_purchase_usd)}</p></div>`).join("")}
    </div>
    <p class="bt-u">${esc(D.spread)}. ${esc(D.why_a_range)}</p>
    <div class="row" style="gap:24px;margin:14px 0 0;flex-wrap:wrap">
      <div><div class="num" style="font-size:20px">${n(S.establishments)}</div>
        <p class="bt-u" style="margin:2px 0 0">local ready-mix plants<br>observed</p></div>
      <div><div class="num" style="font-size:20px">${n(S.employment)}</div>
        <p class="bt-u" style="margin:2px 0 0">employees</p></div>
      <div><div class="num" style="font-size:20px">${money(S.implied_local_output_usd)}</div>
        <p class="bt-u" style="margin:2px 0 0">implied local output<br>model-dependent</p></div>
    </div>
    <p class="bt-r" style="margin:14px 0 0"><b>${esc(C.the_correction)}</b></p>
    <h3 style="font-size:15px;margin:16px 0 6px">What now stands</h3>
    ${C.what_now_stands.map(x => `<p class="bt-s" style="margin:0 0 6px">· ${esc(x)}</p>`).join("")}
    <p class="bt-w"><b>Determination now.</b> ${esc(C.determination_now)}</p>
    <p class="bt-u"><b>Still unknown.</b> ${C.still_unknown.map(esc).join("; ")}.</p>
  </section>`;
}

function oppDeps(D) {
  return `<section>
    <h2>How these systems bear on one another</h2>
    <div class="chain">${Object.entries(D.by_state).filter(([, v]) => v)
      .map(([k, v]) => `<span>${v} ${low(k)}</span>`).join("")}</div>
    ${D.dependencies.map(d => `<div style="margin:10px 0 0">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <b style="font-size:13.5px">${low(d.from)} → ${low(d.to)}</b>
        <span class="tag ${d.state === "OBSERVED" ? "s" : d.state === "HYPOTHETICAL" ? "u" : "w"}"
          >${low(d.state)}</span><span class="muted">${low(d.kind)}</span></div>
      <p class="bt-u" style="margin:1px 0 0">${esc(d.mechanism)}</p>
      ${d.unknown_because ? `<p class="bt-r">${esc(d.unknown_because)}</p>` : ""}
    </div>`).join("")}
    <h3 style="font-size:15px;margin:18px 0 6px">Proposed complementarities</h3>
    ${D.potential_complementarities.map(c => `<p style="margin:0 0 8px">
      <b>${esc(c.proposed)}</b> <span class="tag ${c.state === "ARGUED_AGAINST" ? "u" : "w"}"
        >${low(c.state)}</span><br>
      <span class="bt-u">${esc(c.why_not_demonstrated)}</span></p>`).join("")}
    <h3 style="font-size:15px;margin:18px 0 6px">Possible conflicts</h3>
    ${D.potential_conflicts.map(c => `<p style="margin:0 0 8px"><b>${esc(c.what)}</b>
      <span class="tag ${c.state === "PHYSICAL" ? "w" : "u"}">${low(c.state)}</span><br>
      <span class="bt-u">${esc(c.why)}</span></p>`).join("")}
    <p class="bt-r"><b>${esc(D.the_refusal)}</b></p>
    <p class="bt-w">${esc(D.connects_to_coherence)}</p>
  </section>`;
}


/* ============================ R3.23 · THE PUBLIC ENTRY ============================
 * Someone who has never seen Dula opens this. In thirty seconds they should know what the
 * company is, what it does, why the approach might matter, and what they can do here.
 *
 * EVERY FIGURE ON THIS PAGE IS READ FROM AN ARTEFACT, NOT WRITTEN INTO THE COPY. The three
 * demonstrations below are the actual state of three investigations, including the two where
 * the honest answer is that nothing is supported yet. That is the point: a landing page that
 * only showed hits would misrepresent the product on its first screen. */
function homeDemos() {
  const W = ECO2.santa_fe.water_housing;
  const C = ECO2.bernallilo.concrete_correction;
  const F = ECO2.santa_fe.food_system;
  const A = ECO2.santa_fe.audit;
  const held = W.what_is_held;
  const seven = W.capacity_is_seven_things || [];
  const rmx = C.supply_at_product_resolution;
  const prod = F.production;
  return [
    {
      place: "Santa Fe County",
      system: "Water and housing",
      establishes: `${held.retail_systems} community water systems are held by name, carrying `
        + `${n(held.retail_connections)} service connections and serving `
        + `${n(held.population_served)} people.`,
      condition: "A dwelling cannot be occupied without a water connection, so whatever a system "
        + "will accept caps how much housing a site can carry.",
      question: "Is water actually constraining development here, or is it only a dependency "
        + "that nobody has measured?",
      unknown: `All ${seven.filter(x => x.held === false).length} of the things "capacity" `
        + `means — rights, source, treatment, storage, distribution, peak demand — are held for `
        + `no system at all.`,
      resolves: "A capacity-development review for any of the five largest systems. It is a "
        + "public-records request.",
      verdict: "No opportunity supported",
      route: { scope: "systems", mode: "opportunity", sel: "35049" },
    },
    {
      place: "Bernalillo County",
      system: "Construction materials",
      establishes: `${rmx.establishments} ready-mix concrete plants operate here, employing `
        + `${n(rmx.employment)}. Two earlier phases reported that Dula held no record of them.`,
      condition: "Construction buys concrete at a rate that differs five-fold depending on what "
        + "is being built, and this county already makes it.",
      question: "Is there a sourcing gap worth developing a supplier into, or do the plants "
        + "here already serve the builders here?",
      unknown: "Not one supplier-to-buyer pair in this market is observed, and no delivered "
        + "price from anybody at any date is held.",
      resolves: "One conversation with a heavy-civil contractor about where its concrete comes "
        + "from.",
      verdict: "Capability observed, nothing beyond it",
      route: { scope: "systems", mode: "opportunity", sel: "35001" },
    },
    {
      place: "Santa Fe County",
      system: "Food and agriculture",
      establishes: `${n(prod.farms)} farm operations sold ${money(prod.total_sales_usd)} of `
        + `product in 2022 — ${money(prod.sales_per_operation_usd)} each — on `
        + `${n(prod.irrigated_acres)} irrigated acres.`,
      condition: "Production scale constrains any intervention whose economics depend on "
        + "throughput. It does not constrain every intervention.",
      question: "Does the opportunity lie in aggregation, in yield per irrigated acre, in market "
        + "access, or in what is grown at all?",
      unknown: "No producer's realised price, yield or crop mix is held.",
      resolves: "Production-side measurement: yield, crop mix, and one realised price.",
      verdict: "Open, and narrower than it looks",
      route: { scope: "systems", mode: "opportunity", sel: "35049" },
    },
  ];
}


/* ============================ R3.24 · THE ECONOMIC ATLAS ============================
 * One system, every county. Nothing below is written for a place: each view asks the county's
 * own artefacts what they hold and draws whatever is there, so Mora's page differs from Santa
 * Fe's because the economies differ and not because somebody wrote two pages.
 *
 * The six views answer six different questions, and each is drawn in the form its question
 * deserves. A composition problem gets a proportional field; a boundary problem gets a map you
 * can move the boundary on; a dependency problem gets a pathway. None of them is a dashboard
 * tile, and none of them is a paragraph pretending to be a visualisation.
 */
const PLACE_MODES = [["overview", "Overview"], ["system", "System"], ["flows", "Flows"],
  ["constraints", "Constraints"], ["opportunities", "Opportunities"], ["evidence", "Evidence"]];
/* Older links used these names. They still resolve, to the view that replaced them. */
const MODE_ALIAS = { intelligence: "overview", model: "system" };

/* The opening sentence of a county page, COMPOSED FROM ITS OWN ROWS. The page used to lead
   with the food study's actor counts, which describe Dula's research reach and not the economy.
   What a reader wants first is what this place does for a living. */
function characterise(E, flows) {
  const S = E.productive_structure, T = S.sector_total || {};
  const secs = (S.sectors || []).filter(x => x.employment)
    .sort((a, b) => b.employment - a.employment);
  if (!secs.length || !T.employment) return E.coverage.reading;
  const three = secs.slice(0, 3);
  const sh = Math.round(three.reduce((a, b) => a + b.employment, 0) / T.employment * 100);
  const names = three.map(x => x.name.replace(/ and /g, " and ").toLowerCase());
  const list = names.length > 2
    ? `${names[0]}, ${names[1]} and ${names[2]}` : names.join(" and ");
  const sc = flows && flows.self_containment != null
    ? ` ${Math.round(flows.self_containment * 100)}% of the people who live here also work here.`
    : "";
  return `${n(T.employment)} private jobs across ${secs.length} sectors. ${list.charAt(0)
    .toUpperCase()}${list.slice(1)} are ${sh}% of them.${sc}`;
}

function placeData(pid) {
  const O = ECO2;
  return O.santa_fe && O.santa_fe.geoid === pid ? O.santa_fe
    : O.bernallilo && O.bernallilo.geoid === pid ? O.bernallilo
      : (O.places || {})[pid] || null;
}

function atlasHeader(p, r, E) {
  const g = (E && E.geography) || {};
  return `<header class="atl-head">
    <div class="atl-crumb"><span class="sf-mark" style="cursor:pointer"
      data-go='${JSON.stringify({ scope: "home" })}'>Dula</span>
      <span class="atl-sep">/</span><b>${esc(g.titled || p.name + " County")}</b></div>
    <nav class="atl-tabs" aria-label="Place views">
      ${PLACE_MODES.map(([m, label]) => `<span class="atl-tab${r.mode === m ? " on" : ""}"
        role="link" tabindex="0" aria-current="${r.mode === m ? "page" : "false"}"
        data-go='${JSON.stringify({ scope: "place", pid: r.pid, mode: m })}'
        >${esc(label)}</span>`).join("")}
    </nav>
    <div class="atl-places">${PIDS.map(id => `<span class="atl-pill${id === r.pid ? " on" : ""}"
      data-go='${JSON.stringify({ scope: "place", pid: id, mode: r.mode })}'
      >${esc(PLACES.places[id].name.replace(" County", ""))}</span>`).join("")}</div>
  </header>`;
}

/* ---------------------------------------------------------------- A · OVERVIEW */
function viewOverview(p, r, E) {
  if (!E || E.unavailable) return `<p class="bt-u">No economic artefact is held for this county.</p>`;
  const S = E.productive_structure, T = S.sector_total || {}, F = E.findings || [];
  const D = placeData(r.pid);
  const flows = (ATL.commuting.per_county || {})[r.pid];
  const g = E.geography || {};
  return `
  <section class="atl-hero">
    <div class="atl-hero-text">
      <h1 class="atl-h1">${esc(g.titled || p.name + " County")}</h1>
      <p class="lede" style="margin:10px 0 0">${esc(characterise(E, flows))}</p>
      ${g.seat_is_context ? `<p class="bt-u">${esc(g.seat_is_context)}</p>` : ""}
      <div class="atl-figs">
        ${AT.figure(T.employment, "private jobs", { source: `${S.sectors.length} sectors` })}
        ${AT.figure(T.establishments, "establishments")}
        ${AT.figure((T.payroll_usd_thousands || 0) * 1000, "annual payroll", { unit: "USD" })}
        ${flows ? AT.figure(flows.jobs_located_here, "jobs located here",
          { source: `${Math.round(flows.self_containment * 100)}% filled from inside` }) : ""}
      </div>
    </div>
    <div class="atl-hero-map">
      ${AT.countyMap(ATL, { selected: r.pid, w: 440, h: 330, label: true,
        focus: Object.keys(ATL.counties).filter(x => x !== "35025" || r.pid === "35025"),
        caption: `${esc(p.name)} County in its region. Census Bureau cartographic boundaries,
          generalised for drawing.` })}
    </div>
  </section>

  ${F.length ? `<section>
    <h2>What this economy is doing</h2>
    <div class="atl-finds">
      ${F.slice(0, 3).map((f, i) => `<article class="atl-find">
        <div class="atl-find-n">${i + 1}</div>
        <h3>${esc(f.headline)}</h3>
        <p class="bt-s">${esc(f.what_is_happening)}</p>
        <p class="bt-w"><b>Why it matters.</b> ${esc(f.why_it_matters)}</p>
        <p class="bt-s atl-q">${esc(f.question_that_follows)}</p>
        <span class="atl-link" data-go='${JSON.stringify({ scope: "place", pid: r.pid,
          mode: f.id === "FND_UNSEEN" ? "evidence" : "system" })}'>Investigate →</span>
      </article>`).join("")}
    </div>
    ${F.length > 3 ? det(`The other ${F.length - 3} findings`, F.slice(3).map(f =>
      `<div style="margin:0 0 14px"><b>${esc(f.headline)}</b>
       <p class="bt-u" style="margin:4px 0 0">${esc(f.what_is_happening)}</p>
       <p class="bt-w">${esc(f.question_that_follows)}</p></div>`).join("")) : ""}
  </section>` : ""}

  ${D ? `<section>
    <h2>Where to look next</h2>
    <div class="atl-next">
      ${[["system", "The productive system", `${S.sectors.length} sectors, ${n(T.establishments)} establishments`],
         ["flows", "What moves through", flows ? `${n(flows.inflow)} jobs in, ${n(flows.outflow)} out` : "commuting"],
         ["constraints", "What limits it", `${(D.discovery.conditions || []).length} conditions read`],
         ["opportunities", "What could be developed", `${D.audit.counts.distinct_investigations} distinct investigation(s)`]]
        .map(([m, t, sub]) => `<div class="atl-next-card"
          data-go='${JSON.stringify({ scope: "place", pid: r.pid, mode: m })}'>
          <b>${esc(t)}</b><p class="bt-u" style="margin:3px 0 0">${esc(sub)}</p></div>`).join("")}
    </div>
  </section>` : ""}`;
}

/* ---------------------------------------------------------------- B · SYSTEM */
function viewSystem(p, r, E) {
  const S = E.productive_structure, T = S.sector_total || {};
  const secs = S.sectors || [];
  const sel = r.sel && secs.find(s => s.code === r.sel) ? r.sel : null;
  const cur = sel ? secs.find(s => s.code === sel) : null;
  const D = placeData(r.pid);
  // Relationships for the selected sector, from the model — never invented, and each carries
  // the epistemic class the model gave it.
  const rels = cur ? sectorRelationships(r.pid, cur, D) : [];
  return `
  <section>
    <h2>The productive system</h2>
    <p class="lede">Every private sector this county publishes, drawn to scale. Select one to
      see what the model holds about it.</p>
    ${AT.composition(secs, { selected: sel, total: T.employment })}
    <p class="bt-u">${esc(S.sector_source ? S.sector_source.programme || "" : "")}
      Private employer establishments only — government, the self-employed and most farm
      production are outside this source.</p>
  </section>

  ${cur ? `<section>
    <h2>${esc(cur.name)}</h2>
    <div class="atl-figs">
      ${AT.figure(cur.employment, "jobs", { source: `${(cur.employment / T.employment * 100).toFixed(1)}% of private employment` })}
      ${AT.figure(cur.establishments, "establishments",
        { source: `${(cur.employment / cur.establishments).toFixed(1)} per establishment` })}
      ${AT.figure((cur.payroll_usd_thousands || 0) * 1000, "annual payroll", { unit: "USD" })}
      ${cur.payroll_usd_thousands ? AT.figure(
        Math.round(cur.payroll_usd_thousands * 1000 / cur.employment), "average pay",
        { unit: "USD", source: "payroll ÷ employees, not a wage" }) : ""}
    </div>
    <h3 style="font-size:16px;margin:22px 0 8px">What this sector depends on, and what depends on it</h3>
    ${rels.length ? rels.map(x => `<div class="atl-rel">
      <div class="atl-rel-line ${x.cls}"></div>
      <div><b>${esc(x.what)}</b> ${AT.state(x.evidence)}
        <p class="bt-u" style="margin:3px 0 0">${esc(x.detail)}</p>
        ${x.refuses ? `<p class="bt-r">${esc(x.refuses)}</p>` : ""}</div>
    </div>`).join("")
    : `<p class="bt-u">The model holds no relationship for this sector in this county. That is
       an absence in Dula, not in the economy.</p>`}
    <span class="atl-link" data-go='${JSON.stringify({ scope: "place", pid: r.pid, mode: "system" })}'
      >← Clear selection</span>
  </section>` : `<section>
    <h2>Select a sector</h2>
    <p class="bt-u">Each rectangle is a sector, sized by employment. Choosing one changes the
      analysis below it — it does not open a paragraph.</p>
  </section>`}`;
}

/* The relationships the MODEL holds for a sector here. National coefficients are returned as
   national coefficients; nothing is promoted to a local transaction. */
function sectorRelationships(pid, sec, D) {
  const out = [];
  /* TWO CHANNELS, TWO ENTRIES, NEVER ONE SENTENCE.
     An earlier version put observed local employment inside a block badged NATIONALLY
     MODELLED, and listed the Use table's ACCOUNTING AGGREGATES -- Total Intermediate,
     Compensation of employees -- as things the industry buys. The first mislabels a
     measurement; the second is simply false. A local count and a national coefficient are
     separate findings of separate kinds and are emitted separately. */
  const io = (ECPL.places[pid] || {}).interindustry || {};
  for (const rel of (io.relationships || [])) {
    const isBuyer = rel.from_sector === sec.code;
    const isSupplier = (rel.to_sectors || []).includes(sec.code);
    if (!isBuyer && !isSupplier) continue;
    const le = Object.entries(rel.local_employment || {});
    if (le.length) {
      out.push({
        what: isBuyer
          ? "Employment in this sector and the sectors it would buy from, here"
          : "Employment in this sector and the sector that would buy from it, here",
        evidence: "OBSERVED", cls: "solid",
        detail: le.map(([k, v]) => `${k} ${n(v)}`).join(", ")
          + ". County Business Patterns, this county.",
        refuses: "that any of these firms trade with each other. Not one purchase between two "
          + "firms in this county is observed, in either direction." });
    }
    out.push({
      what: isBuyer ? rel.name : `Supplies ${(rel.name || "").split(" buys")[0].toLowerCase()}`,
      evidence: "NATIONALLY_MODELLED", cls: "dash",
      detail: "a relationship the national input-output accounts record between these "
        + "industries. It is a pattern for the United States as a whole.",
      refuses: rel.means });
  }
  /* The actual commodity coefficients, where the network model holds them for this industry.
     These are real numbers with a real unit, and they are national. */
  for (const net of (ECN.networks || [])) {
    const dr = net.direct_requirements;
    if (!dr || dr.industry !== sec.code) continue;
    const top = (dr.top_inputs || []).filter(x => x.coefficient_per_dollar_of_output > 0)
      .slice(0, 5);
    if (!top.length) continue;
    out.push({
      what: `What a dollar of ${dr.industry_name.toLowerCase()} output buys, nationally`,
      evidence: "NATIONALLY_MODELLED", cls: "dash",
      detail: top.map(x => `${x.commodity} ${x.coefficient_per_dollar_of_output.toFixed(3)}`)
        .join(" · ") + `. Unit: ${esc(dr.unit)}. Geography: ${esc(dr.geography)}.`,
      refuses: dr.not_a_local_transaction });
  }
  const sys = (D && D.system_evidence) || {};
  for (const [k, v] of Object.entries(sys)) {
    if (!v || !v.aggregated_from) continue;
    if (v.aggregated_from.includes(sec.code)) {
      out.push({ what: `Counted inside the ${v.label.toLowerCase()} productive system`,
        evidence: "COMPUTED", cls: "solid",
        detail: `${n(v.employment)} jobs across ${v.aggregated_from.join(", ")}. `
          + v.note,
        refuses: null });
    }
  }
  const cond = ((D && D.discovery && D.discovery.conditions) || [])
    .filter(c => (c.id || "").endsWith("_" + sec.code));
  for (const c of cond) {
    out.push({ what: c.kind.replace(/_/g, " ").toLowerCase(), evidence: "OBSERVED",
      cls: "solid", detail: c.observation,
      refuses: (c.does_not_establish || [])[0] });
  }
  return out;
}


/* ---------------------------------------------------------------- C · FLOWS */
function viewFlows(p, r, E) {
  /* THE BOUNDARY IS IN THE ROUTE. A selection of counties is the analysis, so it is shareable
     and survives a refresh like every other piece of state in this application. */
  const inside = r.sel ? r.sel.split(",").filter(g => ATL.counties[g]) : [r.pid];
  const F = AT.flows(ATL, { inside });
  const me = (ATL.commuting.per_county || {})[r.pid] || {};
  const C = ATL.commuting;
  const top = C.edges.filter(e => e.from !== "OUTSIDE" && e.to !== "OUTSIDE"
    && e.from !== e.to && (e.from === r.pid || e.to === r.pid))
    .sort((a, b) => b.jobs - a.jobs).slice(0, 8);
  const setLink = gs => JSON.stringify({ scope: "place", pid: r.pid, mode: "flows",
    sel: gs.join(",") });
  const neighbours = [...new Set(top.flatMap(e => [e.from, e.to]))].filter(g => g !== r.pid);
  return `
  <section>
    <h2>What moves through this economy</h2>
    <p class="lede">The same job is an inflow, an outflow or an internal movement depending only
      on where the boundary is drawn. Move it and watch the categories change while the jobs
      stay the same.</p>
    <div class="atl-bar">
      <span class="atl-chip${inside.length === 1 && inside[0] === r.pid ? " on" : ""}"
        data-go='${setLink([r.pid])}'>This county alone</span>
      ${neighbours.length ? `<span class="atl-chip${inside.length > 1 ? " on" : ""}"
        data-go='${setLink([r.pid, ...neighbours])}'>With its commuting neighbours</span>` : ""}
      <span class="atl-chip${inside.length === Object.keys(ATL.counties).length ? " on" : ""}"
        data-go='${setLink(Object.keys(ATL.counties))}'>Every county Dula maps</span>
      <span class="atl-hint">or click any county on the map</span>
    </div>
    ${F.svg}
    ${AT.share([
      { v: F.tally.internal, label: "internal to the boundary", fill: "var(--sage)" },
      { v: F.tally.inflow, label: "crossing in", fill: "var(--clay)" },
      { v: F.tally.outflow, label: "crossing out", fill: "var(--water)" },
      { v: F.tally.outside, label: "entirely outside the boundary", fill: "var(--paper-3)" },
    ])}
    <div class="atl-tally">
      <div><div class="num" style="font-size:24px;color:var(--sage)">${n(F.tally.internal)}</div>
        <p class="bt-u" style="margin:2px 0 0">internal to the boundary</p></div>
      <div><div class="num" style="font-size:24px;color:var(--clay)">${n(F.tally.inflow)}</div>
        <p class="bt-u" style="margin:2px 0 0">crossing in</p></div>
      <div><div class="num" style="font-size:24px;color:var(--water)">${n(F.tally.outflow)}</div>
        <p class="bt-u" style="margin:2px 0 0">crossing out</p></div>
      <div><div class="num" style="font-size:24px;color:var(--ink-3)">${n(F.tally.outside)}</div>
        <p class="bt-u" style="margin:2px 0 0">entirely outside it</p></div>
      <div><div class="num" style="font-size:24px">${n(F.tally.total)}</div>
        <p class="bt-u" style="margin:2px 0 0">the same jobs, every time<br>
          <span style="color:var(--ink-3)">this total does not move</span></p></div>
    </div>
    <p class="bt-r"><b>${esc(C.the_boundary_is_the_point)}</b></p>
  </section>

  <section>
    <h2>${esc(p.name)} County's own position</h2>
    <div class="atl-figs">
      ${AT.figure(me.resident_workers, "workers who live here")}
      ${AT.figure(me.jobs_located_here, "jobs located here")}
      ${AT.figure(me.internal, "live and work here",
        { source: me.self_containment != null
          ? `${Math.round(me.self_containment * 100)}% of residents — an upper bound` : null })}
      ${AT.figure(me.net, "net position", { source: me.net > 0 ? "draws workers in" : "sends workers out" })}
    </div>
    ${AT.share([
      { v: me.internal || 0, label: "live and work here", fill: "var(--sage)" },
      { v: me.inflow_from_other_counties || 0, label: "come from another county",
        fill: "var(--clay)" },
      { v: me.inflow_from_outside_new_mexico || 0, label: "come from outside New Mexico",
        fill: "var(--sand)" },
      { v: me.outflow || 0, label: "leave to work elsewhere in the state",
        fill: "var(--water)" },
    ])}
    <p class="bt-u">${n(me.inflow_from_other_counties)} of the people working here come from
      another New Mexico county and ${n(me.inflow_from_outside_new_mexico)} from outside the
      state.</p>
    <p class="bt-r"><b>What this denominator does not contain.</b>
      ${esc(C.denominator.excludes[0])}. ${esc(C.denominator.consequence)}</p>
    <h3 style="font-size:16px;margin:22px 0 8px">Largest flows touching this county</h3>
    ${top.map(e => `<div class="atl-flow-row">
      <span class="atl-flow-pair">${esc(ATL.counties[e.from].label)}
        <span class="atl-arrow">→</span> ${esc(ATL.counties[e.to].label)}</span>
      <span class="atl-flow-n">${n(e.jobs)}</span>
      <span class="tag ${e.to === r.pid ? "s" : "w"}">${e.to === r.pid ? "in" : "out"}</span>
    </div>`).join("")}
    <p class="bt-w"><b>${esc(C.unit)}.</b> ${C.never_establishes.map(esc).join("; ")}.</p>
    <p class="bt-u">${esc(C.source.programme)}, ${esc(C.source.publisher)}, ${C.source.year} —
      ${n(C.block_pairs_read)} block pairs aggregated to counties.</p>
  </section>`;
}

/* ---------------------------------------------------------------- D · CONSTRAINTS */
const DETERMINATION = {
  DEPENDENCY_WITHOUT_CAPACITY: ["Investigation needed", "u"],
  INPUT_WITHOUT_PUBLISHED_PRODUCER: ["Investigation needed", "u"],
  INPUT_WITH_LOCAL_PRODUCER: ["Possible constraint", "w"],
  ESTABLISHMENT_CONCENTRATION: ["Possible constraint", "w"],
  SCALE_MISMATCH: ["Measured condition", "s"],
  PRODUCTION_SERIES_BREAK: ["Investigation needed", "u"],
  EVIDENCE_GAP: ["Investigation needed", "u"],
};
function viewConstraints(p, r, E) {
  const D = placeData(r.pid);
  if (!D) return `<section><h2>Constraints</h2><p class="bt-u">No scan is held for this
    county: County Business Patterns does not publish enough industry detail here for the
    detectors to read.</p></section>`;
  const conds = D.discovery.conditions || [];
  const W = D.water_housing;
  const bySys = {};
  for (const c of conds) (bySys[c.system] = bySys[c.system] || []).push(c);
  const sel = r.sel && bySys[r.sel] ? r.sel : null;
  return `
  <section>
    <h2>What could be limiting this economy</h2>
    <p class="lede">Conditions read out of the holdings, each shown at the strength the evidence
      actually supports. A measured condition, a possible constraint and an open question are
      three different things and are not coloured the same.</p>
    <div class="atl-bar">
      ${Object.keys(bySys).map(sys => `<span class="atl-chip${sel === sys ? " on" : ""}"
        data-go='${JSON.stringify({ scope: "place", pid: r.pid, mode: "constraints",
          sel: sel === sys ? null : sys })}'>${esc(sys.replace(/_/g, " ").toLowerCase())}
        <b>${bySys[sys].length}</b></span>`).join("")}
    </div>
    ${(sel ? bySys[sel] : conds).map(c => {
      const [label, cls] = DETERMINATION[c.kind] || ["Investigation needed", "u"];
      return `<article class="atl-cond">
        <div class="atl-cond-head">
          <span class="tag ${cls}">${esc(label)}</span>
          <b>${esc(c.system.replace(/_/g, " ").toLowerCase())}</b>
          <span class="atl-cond-res">read at ${esc(c.resolution.replace(/_/g, " ").toLowerCase())}</span>
        </div>
        <p class="bt-s">${esc(c.observation)}</p>
        <p class="bt-r"><b>What it does not establish.</b> ${c.does_not_establish.map(esc).join("; ")}.</p>
        ${c.note ? `<p class="bt-u">${esc(c.note)}</p>` : ""}
        <p class="bt-u">Source: ${c.holdings.map(esc).join("; ")}.</p>
      </article>`;
    }).join("")}
  </section>

  ${W && W.capacity_is_seven_things ? `<section>
    <h2>Water, and what "capacity" actually means</h2>
    <p class="lede">${esc(W.the_dependency.how)}</p>
    <p class="bt-r"><b>Whether it binds here: ${esc(W.the_dependency.binding)}</b></p>
    <div class="atl-seven">
      ${W.capacity_is_seven_things.map(c => `<div class="atl-seven-c">
        <span class="tag ${c.held === false ? "u" : "w"}">${c.held === false ? "not held"
          : "partial"}</span>
        <b>${esc(c.component)}</b>
        <p class="bt-u" style="margin:3px 0 0">${esc(c.why_it_matters)}</p>
        <p class="bt-w" style="margin:3px 0 0">${esc(c.where_it_would_come_from)}</p>
      </div>`).join("")}
    </div>
    <p class="bt-r">${esc(W.a_county_count_is_not_a_site_answer)}</p>
    <p class="bt-w"><b>Do not conclude.</b> ${W.do_not_conclude.map(esc).join("; ")}.</p>
  </section>` : ""}`;
}

/* ---------------------------------------------------------------- E · OPPORTUNITIES */
const MATURITY = [["Economic condition", "a condition has been read out of the holdings"],
  ["Development hypothesis", "a mechanism might address it"],
  ["Investment candidate", "demand, economics and an operator are being established"],
  ["Underwritten opportunity", "the existing investment requirements are met"]];
function viewOpportunities(p, r, E) {
  const D = placeData(r.pid);
  if (!D) return `<section><h2>Opportunities</h2><p class="bt-u">No scan is held for this
    county.</p></section>`;
  const A = D.audit, cands = D.discovery.candidates || [];
  const sel = r.sel && cands.find(c => c.id === r.sel) ? cands.find(c => c.id === r.sel) : null;
  return `
  <section>
    <h2>From condition to development question</h2>
    <p class="lede">${esc(A.the_honest_count)}</p>
    <div class="atl-ladder">
      ${MATURITY.map(([t, sub], i) => `<div class="atl-rung${i === 0 ? " on" : ""}">
        <div class="atl-rung-n">${i + 1}</div><b>${esc(t)}</b>
        <p class="bt-u" style="margin:2px 0 0">${esc(sub)}</p></div>`).join("")}
    </div>
    <p class="bt-r">Everything this county holds sits at stage one or two. Nothing here is an
      investment candidate, and the ladder does not advance because a pattern matched.</p>
  </section>

  <section>
    <h2>What the conditions could support</h2>
    ${A.groups.map(g => `<article class="atl-group">
      <div class="atl-cond-head">
        <span class="tag ${g.klass === "DISTINCT_INVESTIGATION" ? "s"
          : g.klass === "UNSUPPORTED_UNTIL_CHECKED" ? "u" : "w"}"
          >${esc(g.klass.replace(/_/g, " ").toLowerCase())}</span>
        <b>${esc(g.group)}</b>
        <span class="atl-cond-res">${g.count} candidate${g.count === 1 ? "" : "s"}</span>
      </div>
      <p class="bt-s">${esc(g.one_question)}</p>
      ${g.why_not_separate_opportunities
        ? `<p class="bt-r">${esc(g.why_not_separate_opportunities)}</p>` : ""}
      <div class="atl-bar" style="margin-top:10px">
        ${g.members.slice(0, 6).map(id => {
          const c = cands.find(x => x.id === id);
          return c ? `<span class="atl-chip${sel && sel.id === id ? " on" : ""}"
            data-go='${JSON.stringify({ scope: "place", pid: r.pid, mode: "opportunities",
              sel: sel && sel.id === id ? null : id })}'
            >${esc(c.system_label)}</span>` : "";
        }).join("")}
      </div>
    </article>`).join("")}
  </section>

  ${sel ? `<section>
    <h2>${esc(sel.system_label)}</h2>
    <p class="lede">${esc(sel.hypothesis)}</p>
    <h3 style="font-size:16px;margin:18px 0 6px">What is already established</h3>
    <p class="bt-s">${esc(sel.condition.observation)}</p>
    <p class="bt-u">Read at ${esc(sel.condition.resolution.replace(/_/g, " ").toLowerCase())}
      from ${sel.condition.holdings.map(esc).join("; ")}.</p>
    <h3 style="font-size:16px;margin:18px 0 6px">What argues against it</h3>
    ${sel.counterevidence.map(x => `<p class="bt-r" style="margin:0 0 6px">
      ${AT.state(x.strength === "OBSERVED" ? "OBSERVED" : "HYPOTHESIS")}
      <b>${esc(x.against)}</b> — ${esc(x.because)}</p>`).join("")}
    <h3 style="font-size:16px;margin:18px 0 6px">What remains unknown</h3>
    <p class="bt-u">${sel.critical_unknowns.map(esc).join("; ")}.</p>
    <h3 style="font-size:16px;margin:18px 0 6px">What would settle it</h3>
    <div class="card" style="margin:0">
      <b>${esc(sel.next_action.kind.replace(/_/g, " ").toLowerCase())}</b>
      <p class="bt-s" style="margin:6px 0 0">${esc(sel.next_action.what)}</p>
      <p class="bt-u">Settles: ${esc(sel.next_action.settles)}</p>
      <p class="bt-w">Cost: ${esc(sel.next_action.cost)} ·
        Who: ${sel.actors.map(esc).join(", ")}</p>
    </div>
    <h3 style="font-size:16px;margin:18px 0 6px">Mechanisms that could apply</h3>
    ${sel.development_mechanism.map(m => `<p class="bt-w" style="margin:0 0 6px">
      <b>${esc(m.label)}</b> — ${esc(m.mechanism)}<br>
      <span class="bt-u">Fails if: ${esc(m.fails_if)}</span></p>`).join("")}
    <p class="bt-r">${esc(sel.state_means)}</p>
  </section>` : ""}`;
}

/* ---------------------------------------------------------------- F · EVIDENCE */
function viewEvidence(p, r, E) {
  const M = E.measures, C = E.coverage, D = placeData(r.pid);
  const cov = (ECE.place_coverage || []).find(x => x.geoid === r.pid);
  return `
  <section>
    <h2>Where every number here comes from</h2>
    <p class="lede">${esc(M.the_rule)}</p>
    ${M.figures.map(x => `<div class="atl-meas">
      <div class="num" style="font-size:19px">${String(x.unit).includes("USD")
        ? money(x.value) : n(x.value)}</div>
      <div><b>${esc(x.figure)}</b> <span class="tag w">${esc(x.programme)} ${esc(String(x.year))}</span>
        <p class="bt-u" style="margin:2px 0 0">${esc(x.measures)}</p>
        <p class="bt-w" style="margin:2px 0 0">excludes ${x.excludes.map(esc).join("; ")}</p></div>
    </div>`).join("")}
    ${M.reconciliations.map(rc => `<div class="card" style="background:var(--paper-2)">
      <b>${rc.figures.map(esc).join(" vs ")}</b>
      <p class="bt-s" style="margin:6px 0 0">${n(rc.values[0])} against ${n(rc.values[1])} —
        ${n(Math.abs(rc.difference))} apart (${Math.abs(rc.difference_pct)}%).
        ${rc.same_year ? "Same year, same county." : ""}</p>
      <p class="bt-u">${esc(rc.why)}</p>
      <p class="bt-r"><b>It is not ${esc(rc.what_it_is_not)}.</b> ${esc(rc.what_dula_cannot_do)}</p>
    </div>`).join("")}
  </section>

  <section>
    <h2>How far the evidence goes</h2>
    <p class="lede">${esc(C.reading)}</p>
    <div class="atl-cov">
      ${Object.entries(C.four_coverages || {}).map(([kind, x]) => `<div class="atl-cov-c">
        <span class="tag ${x.state === "HIGH" ? "s"
          : ["LOW", "NEAR ZERO", "NONE"].includes(x.state) ? "u" : "w"}">${esc(x.state)}</span>
        <b>${esc(kind)} coverage</b>
        <p class="bt-u" style="margin:3px 0 0">${esc(x.question)}</p>
        <p class="bt-w" style="margin:3px 0 0">${esc(x.note)}</p>
      </div>`).join("")}
    </div>
    <div class="row" style="gap:28px;margin:16px 0 0;flex-wrap:wrap">
      <div style="flex:1;min-width:16rem"><p class="bt-s"><b>What Dula can see here</b></p>
        ${(C.can_see || []).map(x => `<p class="bt-u" style="margin:0 0 4px">· ${esc(x)}</p>`).join("")}</div>
      <div style="flex:1;min-width:16rem"><p class="bt-s"><b>What it cannot</b></p>
        ${(C.cannot_see || []).map(x => `<p class="bt-r" style="margin:0 0 4px">· ${esc(x)}</p>`).join("")}</div>
    </div>
    ${cov ? `<p class="bt-u">Holdings covering this county: County Business Patterns
      ${cov.cbp_rows} rows to ${cov.cbp_finest} digits · building permits ${cov.bps_years} years ·
      ${cov.sdwis_systems} water systems · ${cov.nass_rows} agricultural census rows ·
      ${cov.entities} named entities.</p>` : ""}
    ${D ? `<p class="bt-r">${esc(D.discovery.discipline)}</p>` : ""}
  </section>`;
}

function home() {
  const A = ECO2.santa_fe.audit;
  const EVI = ECE.catalogue_summary;
  const places = Object.keys(PLACES.places).length;
  const systems = Object.keys(ECE.productive_systems).length;
  return `
  <header class="atl-entrance">
    <div class="atl-entrance-l">
      <div class="sf-mark">Dula</div>
      <h1 class="atl-title">Understand a place.</h1>
      <p class="atl-lead">Explore how regional economies work, what shapes their development,
        and where coordinated action could strengthen productive capacity.</p>
      <div class="atl-pick">
        <p class="atl-pick-l">Choose a county</p>
        <div class="atl-pick-grid">
          ${["35049", "35001", "35055", "35028", "35039"].filter(g => PLACES.places[g])
            .map(g => {
              const e = (ECPL.places || {})[g] || {};
              const t = (e.productive_structure || {}).sector_total || {};
              return `<div class="atl-pick-c" data-go='${JSON.stringify({ scope: "place",
                pid: g, mode: "overview" })}'>
                <b>${esc(PLACES.places[g].name)} County</b>
                <span class="atl-pick-sub">New Mexico</span>
                ${t.employment ? `<span class="atl-pick-n">${n(t.employment)} private jobs</span>`
                  : ""}</div>`;
            }).join("")}
        </div>
        <p class="bt-u" style="margin:10px 0 0">Every measurement is for a COUNTY. Dula holds no
          city-level observations, and does not imply any.</p>
      </div>
      <p class="atl-disc"><b>A research demonstration.</b> Dula is an independent economic
        research and development company. The models here are still being developed and
        validated. Nothing in this application is an investment offering, and no opportunity in
        it is investable.
        <a href="#approach" class="atl-disc-l">How the approach works ↓</a></p>
    </div>
    <div class="atl-entrance-r">
      ${(() => {
        /* The map carries employment, because employment is counted — a county's weight on
           this page is what it employs and not how interesting it is. Lea County sits far
           south-east of the rest and would flatten the north-central cluster into nothing, so
           the frame holds the cluster and the caption says what is outside it. */
        const emp = {}; let hi = 1;
        for (const g of Object.keys(ATL.counties)) {
          const t = (((ECPL.places || {})[g] || {}).productive_structure || {}).sector_total;
          emp[g] = (t && t.employment) || 0;
          hi = Math.max(hi, emp[g]);
        }
        const frame = Object.keys(ATL.counties).filter(g => g !== "35025");
        const shade = (g, on) => {
          const t = Math.sqrt(emp[g] / hi);
          return emp[g] ? `color-mix(in srgb, var(--clay) ${(8 + t * 58).toFixed(0)}%, var(--paper-2))`
            : "var(--paper-2)";
        };
        return AT.countyMap(ATL, { w: 460, h: 520, label: true, selected: null, focus: frame,
          shade, caption: `Counties shaded by private employment, ${n(Math.min(...Object.values(emp)
            .filter(Boolean)))} to ${n(hi)}. Census Bureau cartographic boundaries. Dula also
            holds Lea County, which lies outside this frame.` });
      })()}
    </div>
  </header>

  <section>
    <h2>One economic model, asked three questions</h2>
    <p class="bt-u">These are not three products. They are three things you can ask of the same
      representation of a regional economy.</p>
    <div class="row" style="gap:20px;margin:14px 0 0;flex-wrap:wrap;align-items:stretch">
      <div class="card" style="flex:1;min-width:16rem;margin:0">
        <b>Understand economic change</b>
        <p class="bt-u" style="margin:6px 0 0">How conditions outside a region — prices, rates,
          federal spending, drought — reach the businesses, costs and financing inside it.</p>
        <p class="bt-w" style="margin:8px 0 0"><span class="tag s">built</span>
          world-to-place transmission, with the crossings that fail stated as failures.</p>
      </div>
      <div class="card" style="flex:1;min-width:16rem;margin:0">
        <b>Discover investment opportunities</b>
        <p class="bt-u" style="margin:6px 0 0">Where existing capabilities, market demand,
          infrastructure and economic constraints together suggest something productive could be
          built or expanded.</p>
        <p class="bt-w" style="margin:8px 0 0"><span class="tag s">built</span>
          detectors that read the evidence and refuse to promote what it does not support.</p>
      </div>
      <div class="card" style="flex:1;min-width:16rem;margin:0">
        <b>Develop and coordinate investment</b>
        <p class="bt-u" style="margin:6px 0 0">How capital, enterprises, infrastructure and
          institutional relationships might be organised so that an activity becomes
          commercially feasible.</p>
        <p class="bt-w" style="margin:8px 0 0"><span class="tag w">partial</span>
          operating economics and feasibility are built; underwriting and portfolio economics
          are not.</p>
      </div>
    </div>
  </section>

  <section>
    <h2>What this actually produces</h2>
    <p class="bt-u">Three investigations, as they currently stand. Two of them conclude that
      nothing is supported yet — which is what the evidence says, and what a page that only
      showed its hits would hide.</p>
    ${homeDemos().map(d => `<div class="card" style="margin:14px 0 0">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
        <b>${esc(d.place)} · ${esc(d.system)}</b>
        <span class="tag u">${esc(d.verdict)}</span>
      </div>
      <p class="bt-s" style="margin:8px 0 0"><b>What the evidence establishes.</b> ${esc(d.establishes)}</p>
      <p class="bt-w"><b>Why it matters.</b> ${esc(d.condition)}</p>
      <p class="bt-s"><b>The question that follows.</b> ${esc(d.question)}</p>
      <p class="bt-r"><b>What is not known.</b> ${esc(d.unknown)}</p>
      <p class="bt-w"><b>What would resolve it.</b> ${esc(d.resolves)}</p>
      <span class="tag nav-chip" style="cursor:pointer;margin-top:10px;display:inline-block"
        data-go='${JSON.stringify(d.route)}'>Open the investigation</span>
    </div>`).join("")}
  </section>

  <section>
    <h2>What is in here</h2>
    <div class="row" style="gap:28px;margin:10px 0 0;flex-wrap:wrap">
      <div><div class="num" style="font-size:22px">${n(places)}</div>
        <p class="bt-u" style="margin:2px 0 0">New Mexico counties</p></div>
      <div><div class="num" style="font-size:22px">${n(systems)}</div>
        <p class="bt-u" style="margin:2px 0 0">productive systems</p></div>
      <div><div class="num" style="font-size:22px">${n(EVI.holdings)}</div>
        <p class="bt-u" style="margin:2px 0 0">public data holdings</p></div>
      <div><div class="num" style="font-size:22px">${n(A.counts.candidates)}</div>
        <p class="bt-u" style="margin:2px 0 0">Santa Fe candidates</p></div>
      <div><div class="num" style="font-size:22px">${n(A.counts.distinct_investigations)}</div>
        <p class="bt-u" style="margin:2px 0 0">distinct investigations<br>among them</p></div>
    </div>
    <p class="bt-r" style="margin:12px 0 0">${esc(A.the_honest_count)}</p>
  </section>

  <section id="approach">
    <h2>The approach, and what is being claimed</h2>
    <p class="lede">The performance of a business or an investment depends on relationships —
      among markets, infrastructure, suppliers, customers, labour, financing and institutions.
      Analysing an asset on its own cannot see those relationships. Dula is an attempt to model
      them.</p>
    <div class="row" style="gap:20px;margin:16px 0 0;flex-wrap:wrap;align-items:stretch">
      <div class="card" style="flex:1;min-width:18rem;margin:0">
        <div class="row" style="gap:8px;align-items:baseline">
          <b>Investment intelligence</b><span class="tag u">proposition</span></div>
        <p class="bt-u" style="margin:6px 0 0">That understanding economic relationships may
          improve which investments are selected, how they are underwritten, and how a portfolio
          is put together.</p>
      </div>
      <div class="card" style="flex:1;min-width:18rem;margin:0">
        <div class="row" style="gap:8px;align-items:baseline">
          <b>Investment development</b><span class="tag u">proposition</span></div>
        <p class="bt-u" style="margin:6px 0 0">That deliberately changing some of those
          relationships — organising demand, financing shared infrastructure, developing a
          supplier — may make a productive investment feasible that was not.</p>
      </div>
    </div>
    <p class="bt-r" style="margin:14px 0 0"><b>Both are propositions under investigation.</b>
      Neither is a demonstrated performance claim, and nothing in this application should be read
      as one. Dula has produced no investment return, holds no track record, and the opportunity
      investigations here are at the stage of asking whether a thing is worth looking at.</p>
    <p class="bt-w">What the system will not do is as much of the design as what it does. It
      refuses to call a modelled estimate an observation, to read an absent record as an absent
      capability, to combine separate judgements into one score, or to advance an opportunity
      because its pattern matched.</p>
  </section>

  <section>
    <h2>Where to go</h2>
    <div class="row" style="gap:12px;flex-wrap:wrap">
      ${[["nm", "New Mexico", "the state as one connected economy"],
         ["systems", "The connected economy", "productive systems, opportunities and feasibility"],
         ["world", "The world", "conditions outside the region, and how they arrive"],
         ["economy", "Economy & capital", "what an investment case can and cannot be built on"]]
        .map(([s, label, why]) => `<div class="card" style="flex:1;min-width:15rem;margin:0;cursor:pointer"
          data-go='${JSON.stringify({ scope: s, mode: "intelligence" })}'>
          <b>${esc(label)}</b>
          <p class="bt-u" style="margin:4px 0 0">${esc(why)}</p></div>`).join("")}
    </div>
  </section>`;
}

function ecOpportunity(r) {
  const PLACES_ = [["35049", "Santa Fe County", ECO2.santa_fe],
                   ["35001", "Bernalillo County", ECO2.bernallilo]];
  const sel = PLACES_.find(p => p[0] === r.sel) || PLACES_[0];
  const P = sel[2];
  const EVI = ECE.catalogue_summary;
  return `
  <div class="row" style="gap:8px;margin:0 0 18px;flex-wrap:wrap">
    ${PLACES_.map(([g, lab]) => `<span class="tag nav-chip${g === sel[0] ? " on" : ""}"
      aria-current="${g === sel[0] ? "page" : "false"}" style="cursor:pointer"
      data-go='${JSON.stringify({ scope: "systems", mode: "opportunity", sel: g })}'
      >${esc(lab)}</span>`).join("")}
  </div>

  <section><p class="lede">${esc(ECO2.the_position)}</p></section>

  <div class="card" style="margin:0 0 20px;background:var(--paper-2)">
    <h3 style="font-size:15px;margin:0 0 2px">What the holdings cover, and what was missed in them</h3>
    <div class="row" style="gap:24px;margin:6px 0 10px;flex-wrap:wrap">
      <div><div class="num" style="font-size:20px">${n(EVI.holdings)}</div>
        <p class="bt-u" style="margin:2px 0 0">holdings</p></div>
      <div><div class="num" style="font-size:20px">${n(EVI.files)}</div>
        <p class="bt-u" style="margin:2px 0 0">files</p></div>
      <div><div class="num" style="font-size:20px">${(EVI.bytes / 1e9).toFixed(2)} GB</div>
        <p class="bt-u" style="margin:2px 0 0">on disk</p></div>
      ${Object.entries(EVI.manifest_completeness).map(([k, v]) => `<div>
        <div class="num" style="font-size:20px">${v}</div>
        <p class="bt-u" style="margin:2px 0 0">${low(k)} manifests</p></div>`).join("")}
    </div>
    <p class="bt-r">${esc(EVI.the_problem)}</p>
    ${ECE.reported_absent_while_present.map(x => `<div style="margin:10px 0 0">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <span class="tag u">${esc(x.phase)}</span>
        <b style="font-size:13px">claimed: ${esc(x.claimed)}</b></div>
      <p class="bt-s" style="margin:2px 0 0"><b>Actually:</b> ${esc(x.actually)}</p>
      <p class="bt-u" style="margin:1px 0 0">${esc(x.file)} · found by ${esc(x.found_by)} · ${esc(x.cost)}</p>
    </div>`).join("")}
  </div>

  ${oppPlace(P)}
  ${P.water_housing ? oppWater(P.water_housing) : ""}
  ${P.food_system ? oppFood(P.food_system) : ""}
  ${P.concrete_correction ? oppCorrection(P.concrete_correction) : ""}
  ${P.dependencies ? oppDeps(P.dependencies) : ""}

  ${P.actions ? `<section>
    <h2>What somebody would actually do next</h2>
    ${P.actions.slice(0, 10).map(a => `<div class="row"
      style="gap:12px;align-items:baseline;margin:0 0 10px;flex-wrap:wrap">
      <span class="tag w" style="min-width:9rem">${low(a.kind)}</span>
      <div style="flex:1;min-width:18rem"><b style="font-size:13.5px">${esc(a.action)}</b>
        <p class="bt-u" style="margin:1px 0 0">Settles: ${esc(a.settles)}</p>
        <p class="bt-w" style="margin:1px 0 0">Cost: ${esc(a.cost)} · Who: ${a.who.map(esc).join(", ")}</p></div>
    </div>`).join("")}
  </section>` : ""}

  <section>
    <h2>Who would get the value</h2>
    ${ECO2.value_profiles.map(v => `<div class="card" style="margin:12px 0 0">
      <b>${esc(v.name)}</b>
      ${["commercial", "regional", "household", "public_or_philanthropic"].map(k => `
        <p style="margin:6px 0 0"><b style="font-size:13px">${low(k)}</b><br>
        <span class="bt-u">${esc(v[k])}</span></p>`).join("")}
      <p class="bt-r">${esc(v.not_all_captured)}</p>
      <p class="bt-w">${esc(v.no_return_estimate)}</p>
    </div>`).join("")}
  </section>

  <section>
    <h2>The ten mechanisms, and which already have an archetype</h2>
    <p class="bt-u">${esc(ECO2.family_summary.no_duplicates)}</p>
    ${ECO2.families.map(f => `<div style="margin:0 0 10px">
      <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
        <b style="font-size:13.5px">${esc(f.label)}</b>
        ${f.existing_archetypes.length
          ? f.existing_archetypes.map(a => `<span class="tag s">${esc(a)}</span>`).join("")
          : `<span class="tag u">no archetype yet</span>`}</div>
      <p class="bt-u" style="margin:1px 0 0">${esc(f.economic_condition)}</p>
      <p class="bt-w" style="margin:1px 0 0"><b>Fails if:</b> ${esc(f.failure_conditions[0])}</p>
    </div>`).join("")}
  </section>

  ${P.pipeline ? `<section>
    <h2>Did the demonstration actually demonstrate anything?</h2>
    <div class="chain">${P.pipeline.chain.map(s => `<span>${esc(s)}</span>`).join("")}</div>
    ${P.pipeline.tests.map(t => `<div class="row" style="gap:10px;align-items:baseline;margin:0 0 6px">
      <span class="tag ${t.met ? "s" : "u"}">${t.met ? "met" : "not met"}</span>
      <div style="flex:1"><b style="font-size:13.5px">${esc(t.test)}</b>
        <span class="muted"> · ${t.actual} of ${t.required} required</span>
        <p class="bt-u" style="margin:1px 0 0">${(t.detail || []).map(esc).join(", ")}</p></div>
    </div>`).join("")}
    <p class="bt-r">${esc(P.pipeline.honest_note)}</p>
  </section>` : ""}`;
}

function ecDiscover() {
  const RD_ = ECD.response_demonstration, L = ECD.learning;
  return `
    <section>
      <h2>What could exist here?</h2>
      <p class="lede">${esc(ECD.the_position)}</p>
      <p class="bt-r"><b>${esc(ECD.discovery_is_a_scan)}</b></p>
      <p class="bt-u">${esc(ECD.archetypes_are_portable)}</p>
      <div class="chain">${Object.entries(ECD.discovery_counts.by_mechanism)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${String(v).padStart(4)}  ${k.replace(/_/g, " ").toLowerCase()}`).join("\n")}</div>
      ${det("What each mechanism asks, and what it does not establish",
        Object.entries(ECD.mechanisms).map(([k, m]) => `<p><b>${low(k)}</b> — ${esc(m.question)}
          <br><span class="bt-u">fires when: ${esc(m.fires_when)}</span>
          <br><span class="bt-r">does NOT establish: ${esc(m.does_not_establish)}</span></p>`).join(""))}
    </section>
    ${ECD.hypotheses.map(ecHypothesis).join("")}
    <section>
      <h2>What a reply would change</h2>
      <p class="bt-r"><b>${esc(RD_.note)}</b></p>
      ${RD_.applied.map(r => `<div class="bt"><div class="bt-n"></div><div class="bt-b">
        <div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
          <span class="tag ${r.effect === "DEMONSTRATES_INSUFFICIENT_DEMAND" ? "s" : "k"}"
            >${low(r.effect)}</span>
          <span>${esc(r.respondent)}</span></div>
        <p style="margin:3px 0 0">${esc(r.detail)}</p>
        <p class="bt-u" style="margin:3px 0 0">${r.changed.map(esc).join("; ")}</p>
        ${r.feasibility_before !== r.feasibility_after
          ? `<p class="bt-r" style="margin:3px 0 0"><b>${low(r.feasibility_before)} →
             ${low(r.feasibility_after)}</b></p>`
          : `<p class="muted" style="margin:3px 0 0">feasibility unchanged — ${low(r.effect)}
             is not evidence of demand</p>`}
      </div></div>`).join("")}
    </section>
    <section>
      <h2>What we would carry to the next region</h2>
      <p class="bt-r"><b>${esc(L.rule)}</b></p>
      ${L.lessons.map(x => `<div class="card" style="margin:10px 0 0">
        <b>${esc(x.archetype)} in ${esc(x.place)} — ${low(x.outcome)}</b>
        <p style="margin:4px 0 0">${x.because.map(esc).join("; ")}</p>
        <p class="bt-s" style="margin:4px 0 0"><b>Transfers.</b> ${esc(x.transfers)}</p>
        <p class="bt-w" style="margin:4px 0 0"><b>Does not transfer.</b> ${esc(x.does_not_transfer)}</p>
      </div>`).join("")}
      ${det("What is preserved when an opportunity moves or dies",
        `<ul>${L.what_is_preserved.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`)}
    </section>`;
}

function ecOriginate() {
  const T = ECO.two_axes;
  return `
    <section>
      <h2>Who could build this?</h2>
      <p class="lede">${esc(ECO.the_position)}</p>
      <p class="bt-r"><b>${esc(ECO.names_no_company)}</b></p>
      <p class="bt-u">${esc(ECO.no_candidate_id_required)}</p>
    </section>
    <section>
      <h2>Two ladders, because they are two questions</h2>
      <p>${esc(T.why)}</p>
      <div class="row" style="gap:28px;align-items:flex-start;flex-wrap:wrap">
        <div style="flex:1;min-width:16rem">
          <p class="bt-u"><b>What is known about it</b> — ${esc(T.evidence)}</p>
          <div class="chain">${T.evidence_ladder.map((x, n) => `${n + 1}. ${x}`).join("\n")}</div>
        </div>
        <div style="flex:1;min-width:16rem">
          <p class="bt-u"><b>Whether anyone can build it</b> — ${esc(T.operator)}</p>
          <div class="chain">${T.operator_ladder.map((x, n) => `${n + 1}. ${x.state}`).join("\n")}</div>
        </div>
      </div>
      ${det("What each operator state means", T.operator_ladder.map(x =>
        `<p><b>${low(x.state)}</b> — ${esc(x.means)}</p>`).join(""))}
    </section>
    <section>
      <h2>Three ways to originate</h2>
      ${Object.entries(ECO.origination_types).map(([k, v]) => {
        const ids = ECO.by_origination_type[k] || [];
        return `<div class="row" style="gap:10px;align-items:baseline;flex-wrap:wrap">
          <span class="tag ${OTYPE_TAG[k] || "u"}">${low(k)}</span><span>${esc(v)}</span></div>
          <p class="bt-u" style="margin:0 0 8px">${ids.length} archetype${ids.length === 1 ? "" : "s"}:
            ${ids.map(id => esc((ECO.archetypes.find(a => a.id === id) || {}).name || id)).join("; ")}</p>`;
      }).join("")}
    </section>
    <section>
      <h2>The archetypes</h2>
      ${ECO.archetypes.map(ecArchetype).join("")}
    </section>
    <section>
      <h2>What a reply would do</h2>
      ${Object.entries(ECO.response_kinds).map(([k, v]) =>
        `<div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
          <span class="tag ${k === "HAS_CONTRARY_EVIDENCE" ? "s" : "u"}">${low(k)}</span>
          <span>${esc(v)}</span></div>`).join("")}
      <p class="bt-w" style="margin:10px 0 0">Contrary evidence RETIRES an archetype, which is as
        useful as a yes and arrives faster.</p>
      ${ECO.promotion_attempts.map(x => x.outcome === "REFUSED"
        ? `<p class="bt-r" style="margin:10px 0 0"><b>A promotion was attempted and refused.</b>
           ${esc(x.why)}</p>` : "").join("")}
    </section>`;
}

function ecChange() {
  const C = ECI.comparison, P = ECI.portfolio, H = ECI.household;
  /* §12: identifiers are for inspecting, not for reading. Interventions and constraints are
     shown by name; the id stays available in the detail panes. */
  const IV_NAME = {}, K_NAME = {};
  for (const d of ECI.demonstrations) {
    for (const iv of d.interventions) IV_NAME[iv.id] = iv.name;
    for (const k of d.constraints) K_NAME[k.id] = k.condition;
  }
  return `
    <section>
      <h2>What would it take to make this work better?</h2>
      ${(() => {
        const ks = ECI.demonstrations.flatMap(d => d.constraints);
        const binding = ks.filter(k => k.cls === "BINDING_ECONOMIC_CONSTRAINT");
        const verified = ks.filter(k => k.cls === "VERIFIED_RESTRICTION");
        return `<p class="lede">A constraint is not binding because it exists, and a rule that
          demonstrably applies is not the same as the thing limiting output. Of
          <b>${ks.length}</b> conditions examined here,
          <b>${binding.length === 0 ? "none" : binding.length}</b>
          ${binding.length === 1 || binding.length === 0 ? "is" : "are"} an established
          economic bottleneck;
          ${verified.length} ${verified.length === 1 ? "is a verified restriction" :
            "are verified restrictions"}.</p>
          ${binding.length === 0 ? `<p class="bt-r"><b>Nothing here is established as binding,
            and that is the finding.</b> Naming the constraint that binds means ruling out the
            others, and eight of housing production's eleven components are unobserved or
            proxied. A project that cannot obtain water service is limited by water whatever
            the rent cap says.</p>` : ""}`;
      })()}
      <p class="bt-r"><b>${esc(ECI.constraint_rule)}</b></p>
      <p class="bt-u">${Object.entries(ECI.constraint_classes).map(([k, v]) =>
        `<b>${low(k)}</b> — ${esc(v)}`).join("<br>")}</p>
    </section>
    ${ECI.demonstrations.map(ecDemo).join("")}
    <section>
      <h2>Comparing them, without a score</h2>
      <p class="bt-r"><b>${esc(C.no_score)}</b></p>
      <div class="chain">intervention                       capital        actors   deps  risks  computed  proposed
${C.rows.map(r => `${r.name.slice(0, 33).padEnd(35)}${String(r.capital_state).padEnd(14)} ${String(r.actors_observed + "/" + r.actors_total).padStart(5)}  ${String(r.dependencies).padStart(4)}  ${String(r.risks).padStart(5)}  ${String(r.direct_effects_computed).padStart(8)}  ${String(r.proposed_mechanisms).padStart(8)}`).join("\n")}</div>
      <h3 style="font-size:15px;margin:18px 0 6px">What can and cannot be compared today</h3>
      ${Object.entries(C.comparable_on).map(([k, v]) => {
        /* The status is the leading SHOUTED words, not everything before the first colon --
           several entries have no colon, and splitting on one put the whole sentence inside a
           chip, which blew the layout to 920px on a 375px screen. */
        const st = (v.match(/^[A-Z ]+/) || ["unknown"])[0].trim().toLowerCase();
        return `<div class="row" style="gap:8px;align-items:baseline;flex-wrap:wrap">
          <span class="tag ${st.startsWith("supported") ? "s" : st.startsWith("partially") ? "w" : "u"}"
            >${esc(st)}</span><span>${low(k)}</span></div>
          <p class="bt-u" style="margin:0 0 6px">${esc(v)}</p>`;
      }).join("")}
      <p class="bt-w"><b>What would make this decision-ready.</b></p>
      <ul>${C.what_would_make_this_decision_ready.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </section>
    <section>
      <h2>Do these interact?</h2>
      <p class="bt-r">${esc(P.geography_is_not_a_relation)}</p>
      ${P.relations.map(r => `<div class="bt"><div class="bt-n"></div><div class="bt-b">
        <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline">
          <b>${esc(r.a)} · ${esc(r.b)}</b>
          <span class="tag ${r.cls === "SHARED_EXPOSURE" ? "w" : "k"}">${low(r.cls)}</span></div>
        <p class="bt-u" style="margin:3px 0 0">through ${esc(r.via)}</p>
        <p style="margin:3px 0 0">${esc(r.why)}</p>
        ${r.refused ? `<p class="bt-r" style="margin:3px 0 0"><b>Refused:</b> ${esc(r.refused)}</p>` : ""}
      </div></div>`).join("")}
      <p class="bt-w"><b>No complementarity is demonstrated.</b> ${esc(P.why_none_demonstrated)}</p>
    </section>
    <section>
      <h2>Would any household be better off?</h2>
      <p class="bt-r"><b>${esc(H.rule)}</b></p>
      ${H.pathways.map(p => `<div class="row" style="gap:8px;align-items:baseline">
        <span class="tag ${p.state === "NO PATHWAY" ? "u" : "k"}">${low(p.state)}</span>
        <span>${esc(IV_NAME[p.intervention] || p.intervention)} → ${esc(p.to)}</span></div>
        <p class="bt-u" style="margin:0 0 8px">${esc(p.why)}</p>`).join("")}
      <p class="bt-w"><b>Household financial buffer.</b> ${esc(H.buffer_identity)}.
        ${esc(H.buffer_status)}</p>
    </section>`;
}

function ecSystems() {
  const cov = ECM.coverage;
  const order = Object.keys(cov).sort((a, b) => a === "(unattributed)" ? 1 : b === "(unattributed)" ? -1
    : a.localeCompare(b));
  return `<section>
    <h2>What each productive system actually holds</h2>
    <p class="lede">The same eight components are asked of every system. Where a system has no
      record of a component, the cell is empty — which is the finding, not a rendering gap.</p>
    ${order.map(sys => {
      const cs = cov[sys];
      const tot = Object.values(cs).reduce((t, e) => t + Object.values(e).reduce((a, b) => a + b, 0), 0);
      const obs = Object.values(cs).reduce((t, e) => t + (e.OBSERVED || 0), 0);
      return `<div class="card" style="margin:10px 0 0">
        <div class="row" style="justify-content:space-between;align-items:baseline;gap:10px">
          <b style="text-transform:capitalize">${esc(sys)}</b>
          <span class="num">${n(obs)} observed of ${n(tot)}</span></div>
        <div class="chain">${Object.keys(ECM.components).map(c => {
          const e = cs[c];
          if (!e) return `${c.padEnd(15)} —`;
          return `${c.padEnd(15)} ${Object.entries(e).sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ")}`;
        }).join("\n")}</div>
      </div>`;
    }).join("")}
    ${det("What each component means", Object.entries(ECM.components).map(([k, v]) =>
      `<p><b>${esc(k)}</b> — ${esc(v)}</p>`).join(""))}
  </section>`;
}

function ecComponents() {
  const shared = ECM.shared_objects;
  return `<section>
    <h2>What the systems share</h2>
    <p class="lede">A water utility that serves housing and farms is one actor, not two. These
      ${n(shared.length)} objects carry one identity across more than one productive system, and
      they are where a change in one system reaches another.</p>
    ${shared.slice(0, 40).map(o => `<div class="bt"><div class="bt-n"></div><div class="bt-b">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline">
        <b>${esc(o.name)}</b>${ecChip(o.evidence)}</div>
      <p class="bt-u" style="margin:3px 0 0">${o.systems.join(" + ")} ·
        ${low(o.component)}${o.capacity ? ` · capacity ${low(o.capacity)}` : ""}</p>
      ${(() => {
        const full = ECM.records.find(x => x.uid === o.uid);
        return full && full.observation_required
          ? `<p class="bt-r" style="margin:3px 0 0"><b>To know its capacity:</b>
             ${esc(full.observation_required)}</p>` : "";
      })()}
      <p class="muted" style="margin:3px 0 0">${esc(o.uid)}</p>
    </div></div>`).join("")}
    <p class="bt-w">The §2 rule this obeys: a VARIABLE is not an economic object. Dula holds
      ${n(ECM.measurements.length)} variables and they are indexed separately — employment is a
      measurement, an employer is an actor, a wage is a flow.</p>
    ${ECM.unattributed.length ? det(`Belonging to no single productive system (${ECM.unattributed.length})`,
      ECM.unattributed.map(u => `<p><b>${esc(u.name)}</b> — ${esc(u.why)}</p>`).join("")) : ""}
  </section>`;
}

function ecStrength() {
  const D = ECS.dimensions;
  return `<section>
    <h2>System strength, and what of it can be seen</h2>
    <p class="lede">${esc(ECS.formulation)}</p>
    <p class="bt-r"><b>No score is computed.</b> ${esc(ECS.no_score)}</p>
    ${Object.entries(D).map(([k, d]) => `<div class="card" style="margin:10px 0 0">
      <div class="row" style="justify-content:space-between;align-items:baseline;gap:10px">
        <b>${esc(k)} · ${esc(d.name)}</b>
        <span class="num">${d.observed} observed / ${d.proxy_only} proxy / ${d.unmeasured} unmeasured</span>
      </div>
      <p class="bt-u" style="margin:3px 0 0">${esc(d.meaning)}</p>
      ${d.indicators.map(i => `<div class="row" style="gap:8px;align-items:baseline;margin:6px 0 0">
        ${ecChip(i.state)}<span>${esc(i.indicator)}</span></div>
        ${i.held ? `<p class="bt-s" style="margin:1px 0 0">${esc(i.held)}</p>` : ""}
        ${i.note ? `<p class="bt-w" style="margin:1px 0 0">${esc(i.note)}</p>` : ""}`).join("")}
    </div>`).join("")}
    <h3 style="font-size:15px;margin:20px 0 6px">Coherence, measured</h3>
    <p>${esc(ECS.coherence_instrument.why_this_is_coherence)}</p>
    <div class="chain">activity                      components   exists   capacity known   shared
${ECS.coherence_instrument.rows.map(r => `${r.title.slice(0, 27).padEnd(28)} ${String(r.components_required).padStart(8)}   ${String(r.existence_observed).padStart(6)}   ${String(r.capacity_known).padStart(13)}   ${String(r.shared_components).padStart(6)}`).join("\n")}</div>
    <p class="bt-r"><b>${esc(ECS.the_result)}</b></p>
    <h3 style="font-size:15px;margin:20px 0 6px">Mobilization</h3>
    ${ECS.mobilization.map(m => `<div class="bt"><div class="bt-n"></div><div class="bt-b">
      <b>${esc(m.name)}</b> <span class="tag u">not evaluable</span>
      <p class="num" style="margin:3px 0 0">${esc(m.identity)}</p>
      ${Object.entries(m.terms).map(([t, v]) => `<p class="bt-u" style="margin:2px 0 0">
        <b>${esc(t)}</b> ${low(v.state)} — ${esc(v.why)}</p>`).join("")}
      <p class="bt-w" style="margin:3px 0 0">${esc(m.note)}</p>
    </div></div>`).join("")}
    <h3 style="font-size:15px;margin:20px 0 6px">Outcomes, which are not strength</h3>
    ${ECM.records.filter(r => r.component === "OUTCOME").map(o => `<div class="bt">
      <div class="bt-n"></div><div class="bt-b">
      <div class="row" style="justify-content:space-between;gap:10px;align-items:baseline">
        <b>${esc(o.name)}</b>${ecChip(o.evidence)}</div>
      <p style="margin:3px 0 0">${esc(o.definition)}</p>
      <p class="bt-w" style="margin:3px 0 0">${esc(o.status)}</p>
      ${o.identity ? `<p class="bt-r" style="margin:3px 0 0">${esc(o.identity)}</p>` : ""}
      ${o.why_not_a_strength_score ? `<p class="bt-u" style="margin:3px 0 0">${esc(o.why_not_a_strength_score)}</p>` : ""}
    </div></div>`).join("")}
  </section>`;
}

/* An error boundary, added after a renderer that asked for a field the model no longer had
   threw, and the page sat on "loading…" with nothing on screen and nothing in the UI to say
   why. A view that fails should fail VISIBLY and alone: the shell, the navigation and every
   other scope must keep working, because an app that hides its own breakage is worse than one
   that breaks. */
function render() {
  try {
    renderBody();
  } catch (e) {
    const app = document.getElementById("app");
    const r = route();
    if (app) {
      // The SHELL is rendered too, so the navigation the message points at actually exists.
      // If even the shell cannot be built, fall back to the bare card.
      let head = "";
      try { head = shell(r, "Dula", "A view failed to render."); } catch (_) { head = ""; }
      app.innerHTML = head + `<div class="card" style="border-color:var(--warn)">
        <h2 style="margin:0 0 6px">This view failed to render</h2>
        <p>Every other view still works — use the navigation above to move to one.</p>
        <p class="bt-r"><b>${esc(r.scope)}${r.mode ? " · " + esc(r.mode) : ""}</b> —
          ${esc(String((e && e.message) || e))}</p>
        <p class="muted">${esc(String((e && e.stack) || "").split("\n").slice(0, 3).join(" "))}</p>
      </div>`;
      app.querySelectorAll("[data-go]").forEach(el =>
        el.addEventListener("click", () => go(JSON.parse(el.dataset.go))));
    }
    console.error("render failed for", r, e);
  }
}

function renderBody() {
  const r = route();
  const app = document.getElementById("app");
  let title, sub, body;
  /* The public entry builds its own header, because the scope chips are a working surface and
     the first screen is not. Everything else below is unchanged, and every existing route
     still resolves exactly as it did. */
  if (r.scope === "home") {
    app.innerHTML = home() +
      `<div class="foot">Dula · economic intelligence for investment and development. Every
       figure on this page is read from the model's own artefacts. Nothing here is a
       performance claim.</div>`;
    app.querySelectorAll("[data-go]").forEach(el =>
      el.addEventListener("click", () => go(JSON.parse(el.dataset.go))));
    return;
  }
  if (r.scope === "place") {
    const p = PLACES.places[r.pid];
    /* R3.24. The place experience is the atlas. It builds its own header because the generic
       shell's scope chips are a working surface and this is a place-centred instrument. Older
       mode names still resolve to the view that replaced them. */
    const _m = MODE_ALIAS[r.mode] || r.mode;
    if (PLACE_MODES.some(([k]) => k === _m)) {
      const E = (ECPL.places || {})[r.pid];
      const rr = { ...r, mode: _m };
      const body = !E || E.unavailable ? placeLabor(p, true)
        : _m === "system" ? viewSystem(p, rr, E)
          : _m === "flows" ? viewFlows(p, rr, E)
            : _m === "constraints" ? viewConstraints(p, rr, E)
              : _m === "opportunities" ? viewOpportunities(p, rr, E)
                : _m === "evidence" ? viewEvidence(p, rr, E)
                  : viewOverview(p, rr, E);
      app.innerHTML = `<div class="atl">${atlasHeader(p, rr, E)}${body}</div>
        <div class="foot">Dula · a research demonstration. Every figure is read from the
         model's own artefacts; where Dula holds nothing, the page says so.</div>`;
      app.querySelectorAll("[data-go]").forEach(el =>
        el.addEventListener("click", () => go(JSON.parse(el.dataset.go))));
      app.querySelectorAll(".atl-county[data-geoid]").forEach(el =>
        el.addEventListener("click", () => {
          const g = el.dataset.geoid;
          if (rr.mode === "flows") {
            const cur = new Set(rr.sel ? rr.sel.split(",") : [rr.pid]);
            cur.has(g) ? cur.delete(g) : cur.add(g);
            go({ ...rr, sel: [...cur].join(",") || rr.pid });
          } else go({ scope: "place", pid: g, mode: rr.mode });
        }));
      app.querySelectorAll(".atl-cell[data-sector]").forEach(el =>
        el.addEventListener("click", () =>
          go({ ...rr, sel: rr.sel === el.dataset.sector ? null : el.dataset.sector })));
      return;
    }
    /* R3.23. The page was titled by the county SEAT while every figure on it is a county
       figure. "Albuquerque" above 277,465 Bernalillo County jobs is a geographic substitution,
       and the fix belongs here rather than in a caption under it. */
    const _pg = ((ECPL.places || {})[r.pid] || {}).geography;
    title = (_pg && _pg.titled) || `${p.name} County`;
    // The subtitle described the LABOUR relationship, which is the same narrowing the body
    // had. It now says what this economy is and how much of it Dula can see.
    const _pe = (ECPL.places || {})[r.pid];
    sub = (_pe && !_pe.unavailable && _pe.coverage.share_of_employment_base != null)
      ? `Regional economic intelligence — Dula observes `
        + `${Math.round(_pe.coverage.share_of_employment_base * 100)}% of its employment base, `
        + `in one sector family.`
      : (p.reading.role ? `Within New Mexico, ${p.reading.role}.`
         : "Dula holds no labour relationship for this place.");
    body = r.mode === "model" ? placeModel(p)
      : r.mode === "evidence" ? evidenceFor(title, PLACE_SOURCES) : placeIntel(p);
  } else if (r.scope === "world") {
    title = "The world";
    sub = "What is happening, why, what actors are doing, and what reaches New Mexico.";
    body = r.mode === "model" ? worldModel()
      : r.mode === "evidence" ? evidenceFor("the world reading", WORLD_SOURCES) : worldIntel();
  } else if (r.scope === "regional") {
    title = "Regional systems";
    sub = "How a change reaches a place, and what a region is for that purpose.";
    body = r.mode === "model" ? regionalModel()
      : r.mode === "evidence" ? regionalEvidence() : regionalIntel();
  } else if (r.scope === "economy") {
    title = "Economy & capital";
    sub = "How a world force reaches this region, where the evidence stops, and what that "
      + "does to an investment case.";
    body = r.mode === "model" ? economyModel()
      : r.mode === "evidence" ? economyEvidence() : economyIntel();
  } else if (r.scope === "systems") {
    title = "The connected economy";
    sub = "One representation: how a change in water, food or finance reaches another system, "
      + "and what it does to money when it gets there.";
    body = r.mode === "system" ? ecSystems()
      : r.mode === "component" ? ecComponents()
        : r.mode === "strength" ? ecStrength()
          : r.mode === "pathway" ? ecPathways()
            : r.mode === "originate" ? ecOriginate()
              : r.mode === "change" ? ecChange()
                : r.mode === "opportunity" ? ecOpportunity(r)
                  : r.mode === "feasible" ? ecFeasible(r)
                  : r.mode === "discover" ? ecDiscover() : ecNetwork();
  } else if (r.scope === "machine") {
    title = "The machine";
    sub = "What Dula believes an economy is made of, and how much of it it can see.";
    body = r.mode === "model" ? machineModel()
      : r.mode === "evidence" ? machineEvidence() : machineIntel();
  } else {
    title = "New Mexico";
    sub = "How the state works as a connected economy — not thirty-three county profiles.";
    body = r.mode === "model" ? nmModel()
      : r.mode === "evidence" ? evidenceFor("New Mexico", PLACE_SOURCES) : nmIntel();
  }
  app.innerHTML = shell(r, title, sub) + body +
    `<div class="foot">One product. Every section is built from the bound object's own
     observations; where Dula holds nothing, the section says so rather than borrowing.</div>`;
  app.querySelectorAll("[data-go]").forEach(el =>
    el.addEventListener("click", () => go(JSON.parse(el.dataset.go))));
  const f = document.getElementById("askf");
  if (f) f.addEventListener("submit", e => {
    e.preventDefault();
    const q = document.getElementById("ask").value.trim();
    if (!q) return;
    document.getElementById("answer").innerHTML =
      `<div class="card" style="margin-top:12px"><p class="muted">${esc(q)}</p>
       <p>${esc(ask(r, q))}</p></div>`;
  });
}
render();
