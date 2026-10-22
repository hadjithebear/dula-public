/* DOWNTOWN ALBUQUERQUE OS — the read-only stakeholder prototype.
 *
 * Reads exactly one file, downtown/os.json, written by pipeline/downtown_os_publish.py. There is
 * no API, no account, no storage and no request to any other origin: every control on the page
 * is a link to another view of that one file, so nothing can be shown that cannot work.
 *
 * Routing is by URL fragment, so the page works unchanged under a GitHub Pages sub-path:
 *   #/                                   overview — the four sections
 *   #/understand  #/develop  #/invest  #/learn
 *   #/understand/figure/<key>            one county figure, with its source and limits
 *   #/invest/structure/<key>             one development structure
 *   #/understand/signal/<id>             one signal under investigation
 *   #/develop/opportunity/<plan_id>  #/invest/opportunity/<plan_id>  #/learn/opportunity/<plan_id>
 *                                        one published opportunity, in each of three sections
 *
 * Signals and opportunities are records from the publication registry: zero, one or many. No
 * section depends on any of them, and nothing here names one.
 */
const J = async p => (await fetch(p, { cache: "no-cache" })).json();
const D = await J("downtown/os.json");
const S = D.sections;
/* Every word a visitor reads comes from os.json -- the section text from S, the furniture from
   U -- so the approval of the page text covers all of it. Nothing visible is written here. */
const U = D.ui;
const SIG = D.signals || [], OPP = D.opportunities || [];
const sigById = id => SIG.find(x => x.id === id), oppById = id => OPP.find(x => x.plan_id === id);
const UO = U.opportunity, US = U.signal;
const tpl = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k]);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const app = document.getElementById("app");

/* ---- numbers. Shown as published, at the precision a reader can use, never rounded into a
   different claim: a share is a share, money says its unit, a count keeps every digit. */
function fmt(f) {
  const v = f.value, u = String(f.unit || "");
  if (v == null) return "—";
  if (u === "share") return `${(v * 100).toFixed(1)}%`;
  if (u.startsWith("USD")) {
    const per = u.slice(3).trim();
    const n = Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(1)}bn`
      : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v).toLocaleString("en-US")}`;
    return per ? `${n} ${per}` : n;
  }
  return Math.round(v).toLocaleString("en-US");
}
const unitWord = f => (String(f.unit).startsWith("USD") || f.unit === "share") ? "" : f.unit;

/* ---- the four marks. One small drawing per section, from the same few strokes: a field of
   points (what is observed), a ladder (stages), interlocking forms (structures), and a line
   that has not yet been drawn past its first point (a baseline not yet set). */
const MARK = {
  understand: `<svg viewBox="0 0 120 80" aria-hidden="true">${Array.from({ length: 40 }, (_, i) => {
      const x = 10 + (i % 10) * 11, y = 12 + Math.floor(i / 10) * 18, r = 1.4 + ((i * 7) % 5) * 0.55;
      return `<circle cx="${x}" cy="${y}" r="${r}" class="m-${i % 7 ? "a" : "b"}"/>`;
    }).join("")}</svg>`,
  develop: `<svg viewBox="0 0 120 80" aria-hidden="true">
      <path d="M14 66 H44 V46 H74 V26 H104" class="m-line"/>
      <circle cx="44" cy="46" r="4" class="m-b"/><circle cx="74" cy="26" r="4" class="m-hollow"/>
      <circle cx="104" cy="26" r="4" class="m-hollow"/></svg>`,
  invest: `<svg viewBox="0 0 120 80" aria-hidden="true">
      <rect x="18" y="18" width="38" height="38" rx="3" class="m-hollow"/>
      <rect x="40" y="28" width="38" height="38" rx="19" class="m-hollow"/>
      <rect x="62" y="14" width="38" height="38" rx="3" class="m-a-soft"/></svg>`,
  learn: `<svg viewBox="0 0 120 80" aria-hidden="true">
      <path d="M14 56 H106" class="m-axis"/><path d="M30 56 C 50 56, 60 30, 104 22" class="m-dash"/>
      <circle cx="30" cy="56" r="4" class="m-hollow"/></svg>`,
};

const ORDER = ["understand", "develop", "invest", "learn"];
const countLabel = (k, n) => tpl(U.counts[k][n === 0 ? "0" : n === 1 ? "1" : "n"], { n });
const status = k => tpl(U.status[k], {
  opportunities: countLabel("opportunities", OPP.length),
  figures: S.understand.county.figures.length, downtown: S.understand.downtown.measurements_published,
  stages: S.develop.stages.length, structures: S.invest.structures.length,
  decisions: S.invest.capital_decisions_published, baselines: S.learn.indicators_with_baseline,
});

const back = (href, label) => `<a class="back" href="${href}">← ${esc(label)}</a>`;
const head = (k) => `<header class="sec-head">
  <div class="mark">${MARK[k]}</div>
  <div><p class="kicker">${esc(S[k].title)}</p><h1>${esc(S[k].question)}</h1>
  <p class="lede">${esc(S[k].lede)}</p></div></header>`;

/* ---- views */
function overview() {
  return `<header class="hero">
    <p class="kicker">${esc(U.brand)}</p><h1 class="title">${esc(D.title)}</h1>
    <p class="lede">${esc(D.subtitle)}</p></header>
  <nav class="grid4" aria-label="Sections">${ORDER.map((k, i) => `
    <a class="tile" href="#/${k}">
      <div class="mark">${MARK[k]}</div>
      <span class="n">${i + 1}</span>
      <h2>${esc(S[k].title)}</h2>
      <p>${esc(S[k].question)}</p>
      <span class="status">${esc(status(k))}</span>
    </a>`).join("")}</nav>
  ${featured()}
  <section class="limits"><h2 class="eyebrow">${esc(U.limits_heading)}</h2>
    <ul>${D.not_established.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>`;
}

function understand() {
  const V = S.understand, C = V.county;
  return `${back("#/", U.back_overview)}${head("understand")}
  <section><h2 class="eyebrow">${esc(V.county_heading)}</h2>
    <p class="note"><span class="geo">${esc(C.geography_label)}</span></p>
    <p class="muted">${esc(V.county_note)}</p>
    <div class="grid-fig">${C.figures.map(f => `
      <a class="fig" href="#/understand/figure/${encodeURIComponent(f.key)}">
        <span class="v">${esc(fmt(f))}</span>
        <span class="l">${esc(f.label)}</span>
        <span class="p">${esc(unitWord(f))} ${esc(f.reference_period)}</span>
      </a>`).join("")}</div></section>
  ${SIG.length ? `<section><h2 class="eyebrow">${esc(V.signals_heading)}</h2>
    ${SIG.map(g => card(`#/understand/signal/${g.id}`, g.title, US.tile_note)).join("")}</section>` : ""}
  <section><h2 class="eyebrow">${esc(V.downtown_heading)}</h2>
    <div class="empty"><span class="big">${V.downtown.measurements_published}</span>
      <p>${esc(V.downtown_text)}</p></div></section>
  <section><h2 class="eyebrow">${esc(V.withheld_heading)}</h2>
    <p class="muted">${esc(V.withheld_text)}</p>
    <ul class="withheld">${C.withheld.map(w => `<li><b>${esc(w.label)}</b>
      <span>${esc(w.why)}</span></li>`).join("")}</ul></section>`;
}

function figure(key) {
  const f = S.understand.county.figures.find(x => x.key === key);
  if (!f) return notFound();
  const R = U.figure_rows;
  const row = (k, v) => v ? `<div class="kv"><dt>${esc(k)}</dt><dd>${v}</dd></div>` : "";
  return `${back("#/understand", S.understand.title)}
  <article class="detail"><p class="kicker">${esc(S.understand.county.name)}</p>
    <h1>${esc(f.label)}</h1><p class="v-big">${esc(fmt(f))}</p>
    <p class="note"><span class="geo">${esc(f.geography_label)}</span></p>
    <dl>${row(R.unit, esc(f.unit))}${row(R.period, esc(f.reference_period))}
      ${row(R.source, esc(f.source))}${row(R.vintage, esc(f.vintage))}
      ${row(R.universe, esc(f.universe))}${row(R.basis, esc(f.basis))}
      ${row(R.provenance, (f.provenance || []).map(p => {
        const [, src, file] = p.match(/acquired\/([^/]+)\/MANIFEST\.json#(.+)$/) || [, "", p];
        return `${esc(file)}<span class="muted"> · ${esc(tpl(U.provenance_note, { source: src }))}</span>`;
      }).join("<br>"))}</dl>
    ${(f.limitations || []).length ? `<h2 class="eyebrow">${esc(U.limits)}</h2>
      <ul>${f.limitations.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</article>`;
}

function develop() {
  const V = S.develop;
  return `${back("#/", U.back_overview)}${head("develop")}
  <section><ol class="ladder">${V.stages.map((s, i) => `<li>
      <span class="step">${i + 1}</span><div><h3>${esc(s.label)}</h3><p>${esc(s.question)}</p>
      <p class="can"><b>${esc(V.stage_can_label)}</b> ${esc(s.dula_can)}</p></div></li>`).join("")}
    </ol><p class="muted">${esc(V.stages_note)}</p></section>
  <section><h2 class="eyebrow">${esc(V.evidence_heading)}</h2>
    <dl class="basis">${V.evidence.map(e => `<div><dt><span class="tag">${esc(e.basis)}</span></dt>
      <dd>${esc(e.means)}</dd></div>`).join("")}</dl></section>
  <section><h2 class="eyebrow">${esc(V.opportunities_heading)}</h2>
    ${OPP.length ? OPP.map(o => card(`#/develop/opportunity/${o.plan_id}`, o.title,
      `${U.record_status[o.status]}. ${o.display.summary || ""}`)).join("")
      : `<div class="empty"><p>${esc(V.opportunities_empty)}</p></div>`}</section>`;
}

function invest() {
  const V = S.invest;
  return `${back("#/", U.back_overview)}${head("invest")}
  <section><h2 class="eyebrow">${esc(V.structures_heading)}</h2>
    <p class="muted">${esc(V.structures_note)}</p>
    <div class="grid-fig">${V.structures.map(s => `
      <a class="fig" href="#/invest/structure/${encodeURIComponent(s.key)}">
        <span class="l">${esc(title(s.key))}</span><span class="p">${esc(s.means)}</span></a>`).join("")}</div></section>
  ${OPP.length ? `<section><h2 class="eyebrow">${esc(V.opportunities_heading)}</h2>
    ${OPP.map(o => card(`#/invest/opportunity/${o.plan_id}`, tpl(UO.invest_heading, o),
      U.record_status[o.status])).join("")}</section>` : ""}
  <section><h2 class="eyebrow">${esc(V.recorded_heading)}</h2>
    <div class="empty"><span class="big">${V.capital_decisions_published}</span>
      <p>${esc(V.recorded_text)}</p></div></section>`;
}

function structure(key) {
  const V = S.invest, s = V.structures.find(x => x.key === key);
  if (!s) return notFound();
  return `${back("#/invest", S.invest.title)}
  <article class="detail"><p class="kicker">${esc(U.structure_kicker)}</p><h1>${esc(title(s.key))}</h1>
    <p class="lede">${esc(s.means)}</p><p class="muted">${esc(V.structures_note)}</p>
    <h2 class="eyebrow">${esc(V.questions_heading)}</h2>
    <ol class="qs">${V.question_keys.map(q => `<li>${esc(V.questions[q] || q)}</li>`).join("")}</ol>
    <p class="muted">${esc(U.structure_unanswered)}</p></article>`;
}

function learn() {
  const V = S.learn;
  return `${back("#/", U.back_overview)}${head("learn")}
  <section><h2 class="eyebrow">${esc(V.chain_heading)}</h2>
    <ol class="chain">${V.chain.map(c => `<li><h3>${esc(c.step)}</h3><p>${esc(c.means)}</p></li>`).join("")}</ol></section>
  <section><h2 class="eyebrow">${esc(V.baseline_heading)}</h2>
    <div class="empty"><span class="big">${V.indicators_with_baseline}</span><p>${esc(V.baseline_text)}</p></div></section>
  ${OPP.length ? `<section><h2 class="eyebrow">${esc(V.opportunities_heading)}</h2>
    ${OPP.map(o => card(`#/learn/opportunity/${o.plan_id}`, tpl(UO.learn_heading, o),
      U.record_status[o.status])).join("")}</section>` : ""}
  <section><h2 class="eyebrow">${esc(V.capability_heading)}</h2><p>${esc(V.capability_text)}</p></section>
  <section><h2 class="eyebrow">${esc(V.proposal_heading)}</h2><p>${esc(V.proposal_text)}</p></section>`;
}

/* ---- signals and opportunities. Generic views over registry records: a signal is an
   investigation with a two-period comparison; an opportunity is a Dula plan, shown in Develop,
   Invest and Learn. Every answer is marked with what it rests on; nothing is left unlabelled, and
   every view of an opportunity carries its status. */
const card = (href, t, note) => `<a class="link-card" href="${href}"><b>${esc(t)}</b>
  ${note ? `<span>${esc(note)}</span>` : ""}<i aria-hidden="true">→</i></a>`;
const chip = k => `<span class="chip chip-${k.toLowerCase()}">${esc(U.status_chips[k] || k)}</span>`;
const list = xs => `<ul>${(xs || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
const usd = v => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString("en-US")}`;
const pct = v => `${v > 0 ? "+" : ""}${v.toLocaleString("en-US")}%`;
const num = v => v.toLocaleString("en-US");
const longDate = iso => { const d = new Date(`${iso}T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
/* A provenance reference, as the figure pages show it: the file, and the manifest it is in. */
const ref = p => {
  const [, src, file] = p.match(/acquired\/([^/]+)\/MANIFEST\.json#(.+)$/) || [, "", p];
  return `${esc(file)} <span class="muted">(${esc(tpl(U.provenance_note, { source: src }))})</span>`;
};
const recordStatus = o => `<p class="note"><span class="status-pill">${esc(U.record_status[o.status])}</span></p>`;

function featured() {
  const xs = OPP.filter(o => o.featured);
  if (!xs.length) return "";
  return `<section class="band"><h2 class="eyebrow">${esc(U.thread.label)}</h2>
    <p>${esc(U.thread.intro)}</p>${xs.map(o => `<div class="featured">
      <b>${esc(o.title)}</b> <span class="muted">${esc(U.record_status[o.status])}</span>
      ${threadStrip(o, null)}<a class="btn" href="${o.thread[0].route}">${esc(U.thread.start)} →</a>
    </div>`).join("")}</section>`;
}
function threadStrip(o, current) {
  return `<nav class="thread" aria-label="${esc(U.thread.label)}"><ol>${o.thread.map((t, i) => `
    <li${t.step === current ? ' aria-current="step" class="on"' : ""}>
      <a href="${t.route}"><span class="tn">${i + 1}</span>${esc(U.thread.steps[t.step])}</a></li>`).join("")}
  </ol></nav>`;
}
function threadNext(o, step) {
  const i = o.thread.findIndex(t => t.step === step), n = o.thread[i + 1];
  return `<p class="thread-next">${n
    ? `<a class="btn" href="${n.route}">${esc(U.thread.next)}: ${esc(U.thread.steps[n.step])} →</a>`
    : `<a class="btn" href="${o.thread[0].route}">← ${esc(U.thread.back_to_start)}</a>`}</p>`;
}
const oppHead = (o, kicker, h, step) => `${back("#/", U.back_overview)}${threadStrip(o, step)}
  <header class="detail"><p class="kicker">${esc(kicker)}</p><h1>${esc(h)}</h1></header>
  ${recordStatus(o)}`;
const stageOf = (o, k) => (o.stages || []).find(s => s.stage === k);

function signalView(id) {
  const G = sigById(id);
  if (!G) return notFound();
  const responders = G.responded_to_by.map(oppById).filter(Boolean);
  const via = responders[0];
  return `${back("#/", U.back_overview)}${via ? threadStrip(via, "signal") : ""}
  <header class="detail"><p class="kicker">${esc(S.understand.title)}</p><h1>${esc(G.title)}</h1></header>
  <p class="note"><span class="geo">${esc(S.understand.county.geography_label)}</span></p>
  <p class="muted">${esc(G.question)}</p>
  <section><h2 class="eyebrow">${esc(US.heading)}</h2>
    <div class="channels">${G.measures.map(m => `<div class="channel">
      <h3>${esc(m.label)}</h3>
      <dl><div><dt>${esc(US.columns.value)}</dt><dd>${usd(m.value[0])} → ${usd(m.value[1])} <b>${pct(m.value_change_pct)}</b></dd></div>
      <div><dt>${esc(US.columns.count)}</dt><dd>${num(m.count[0])} → ${num(m.count[1])} <b>${pct(m.count_change_pct)}</b></dd></div>
      <div><dt>${esc(US.columns.ratio)}</dt><dd><b>${pct(m.ratio_change_pct)}</b></dd></div></dl>
    </div>`).join("")}</div>
    <p class="muted">${esc(US.comparison_note)}</p>
    <p class="src">${esc(G.source)} · ${G.periods.map(esc).join(", ")} · ${G.provenance.map(ref).join(" · ")}</p></section>
  <section><h2 class="eyebrow">${esc(US.caveats_heading)}</h2>${list(G.caveats)}</section>
  <section><h2 class="eyebrow">${esc(US.reading_heading)}</h2><p>${esc(G.reading)}</p>
    <p class="muted">${esc(G.origin_means)}</p></section>
  ${G.related.length ? `<section><h2 class="eyebrow">${esc(US.related_heading)}</h2>${G.related.map(r => `
    <article class="q"><h3>${esc(r.question)}</h3><p>${esc(r.reading)}</p>
    <p><b>${esc(r.decision)}.</b> ${esc(US.would_advance)} ${esc(r.would_advance)}</p></article>`).join("")}</section>` : ""}
  <section><h2 class="eyebrow">${esc(US.decision_heading)}</h2>
    <p><b>${esc(G.decision)}.</b> ${esc(US.would_advance)} ${esc(G.would_advance)}</p></section>
  <section><h2 class="eyebrow">${esc(US.responded_label)}</h2>
    ${responders.length ? responders.map(o => card(`#/develop/opportunity/${o.plan_id}`, o.title,
      U.record_status[o.status])).join("") : `<p class="muted">${esc(US.responded_none)}</p>`}</section>
  ${via ? threadNext(via, "signal") : ""}`;
}

function opportunityView(id) {
  const o = oppById(id);
  if (!o) return notFound();
  const Q = UO.questions, F = UO.fallback_answers, cl = o.claims;
  // A record's own answers first; otherwise a fallback that agrees with what the record holds.
  const A = Object.assign({}, F, {
    support: o.research_agenda.length ? F.support : F.support_none,
    blocking: cl.shown.some(c => c.basis === "ABSENT") ? F.blocking : F.blocking_none,
  }, o.display.answers || {});
  const obs = cl.shown.filter(c => c.basis === "OBSERVATION");
  const assu = cl.shown.filter(c => c.basis === "ASSUMPTION" || c.basis === "MODELLED");
  const absent = cl.shown.filter(c => c.basis === "ABSENT");
  const BASIS_CHIP = { OBSERVATION: "OBSERVED", ASSUMPTION: "ASSUMED", ABSENT: "ABSENT", MODELLED: "MODELLED" };
  const claim = c => `<li>${chip(BASIS_CHIP[c.basis] || "NOT_ESTABLISHED")}
    ${esc(c.statement)}${c.asserted_on ? ` <span class="muted">— ${esc(tpl(UO.assumption_attribution, { date: longDate(c.asserted_on) }))}</span>` : ""}
    ${c.source ? `<span class="src">${esc(c.source)} · ${(c.provenance || []).map(ref).join(" · ")}</span>` : ""}
    ${(c.qualifications || []).length ? `<span class="muted"> (${c.qualifications.map(esc).join("; ")})</span>` : ""}</li>`;
  const q = (key, st, body) => `<article class="q"><h3>${esc(Q[key])}</h3>${chip(st)}
    <p>${esc(A[key])}</p>${body || ""}</article>`;
  const worked = k => (stageOf(o, k) || {}).state === "WORKED";
  const route = s => `#/${s}/opportunity/${o.plan_id}`;
  const sig = o.signals.map(sigById).filter(Boolean);
  const dp = o.decision_position;
  return `${oppHead(o, S.develop.title, o.title, "opportunity")}
  <p class="lede"><span class="muted">${esc(UO.objective_label)}</span> ${esc(o.objective)}</p>
  ${(o.display.chips || []).length ? `<p class="chips">${o.display.chips.map(x => `<span class="tag">${esc(x)}</span>`).join("")}</p>` : ""}
  ${o.display.location ? `<p class="note"><span class="geo">${esc(o.display.location)}</span></p>` : ""}
  <section><h2 class="eyebrow">${esc(UO.stages_heading)}</h2>
    <ol class="strip">${o.stages.map(s => `<li class="st st-${s.state.toLowerCase()}">
      <b>${esc(s.label)}</b><span class="state">${esc(s.state.replace(/_/g, " ").toLowerCase())}</span>
      <span class="why">${esc(s.why)}</span></li>`).join("")}</ol></section>
  <section><h2 class="eyebrow">${esc(UO.questions_heading)}</h2>
    ${q("what", "PROPOSED")}
    ${q("why", obs.length ? "OBSERVED" : "NOT_ESTABLISHED", `<ul class="claims">${obs.map(claim).join("")}</ul>
      ${sig.map(g => card(`#/understand/signal/${g.id}`, g.title, US.tile_note)).join("")}`)}
    ${q("how", worked("develop") ? "PROPOSED" : "NOT_ESTABLISHED", `${list(o.next_stage_needs)}
      <ul class="claims">${assu.map(claim).join("")}</ul>
      <p class="muted">${esc(UO.how_structures)} <a href="#/invest">${esc(S.invest.title)} →</a></p>`)}
    ${q("blocking", absent.length ? "ABSENT" : "NOT_ESTABLISHED", `<ul class="claims">${absent.map(claim).join("")}</ul>
      ${sig.flatMap(g => g.related).map(r => `<p>${esc(r.reading)}</p>`).join("")}${list(dp.blocking)}`)}
    ${q("support", o.research_agenda.length ? "RESEARCH" : "NOT_ESTABLISHED", `<div class="agenda">${o.research_agenda.map(r => `<div class="ag">
      <b>${esc(r.action)}</b>
      <dl><div><dt>${esc(UO.agenda_columns.source)}</dt><dd>${esc(r.plausible_source)}</dd></div>
      <div><dt>${esc(UO.agenda_columns.who)}</dt><dd>${esc(r.who_could_help)}</dd></div>
      <div><dt>${esc(UO.agenda_columns.resolves)}</dt><dd>${esc(r.would_resolve)}</dd></div></dl></div>`).join("")}</div>`)}
    ${q("funder", worked("invest") ? "PROPOSED" : "NOT_ESTABLISHED", `${o.invest ? `<p class="muted">${esc(o.invest.why)}</p>` : ""}
      ${card(route("invest"), tpl(UO.invest_heading, o))}`)}
    ${q("measure", "NOT_ESTABLISHED", card(route("learn"), tpl(UO.learn_heading, o)))}
  </section>
  <section><h2 class="eyebrow">${esc(UO.evidence_heading)}</h2>
    ${cl.withheld.length ? `<h3 class="sub">${esc(UO.evidence_withheld)}</h3>
    <ul class="withheld">${cl.withheld.map(w => `<li><b>${esc(w.source || UO.withheld_unnamed)}</b><span>${esc(w.why)}</span></li>`).join("")}</ul>` : ""}
    ${cl.context.length ? `<h3 class="sub">${esc(UO.evidence_context)}</h3>
    <p class="ctx">${cl.context.map(c => c.figure
      ? `<a href="#/understand/figure/${encodeURIComponent(c.figure)}">${esc(c.label)}</a>`
      : `<span class="muted">${esc(c.label)}</span>`).join(" · ")}</p>` : ""}
    ${cl.context_unlisted ? `<p class="muted">${esc(tpl(UO.context_unlisted, { n: cl.context_unlisted }))}</p>` : ""}</section>
  <section><h2 class="eyebrow">${esc(UO.organisations_heading)}</h2>
    <p>${esc(tpl(UO.organisations_count, { count: o.organisations.count }))}</p>
    ${o.organisations.coverage ? `<p class="muted">${esc(o.organisations.coverage)}</p>` : ""}</section>
  <section><h2 class="eyebrow">${esc(UO.not_established_heading)}</h2>${list(o.not_established)}</section>
  ${threadNext(o, "opportunity")}`;
}

function opportunityInvest(id) {
  const o = oppById(id);
  if (!o) return notFound();
  const s = o.invest, dp = o.decision_position;
  return `${oppHead(o, S.invest.title, tpl(UO.invest_heading, o), "capital")}
  <div class="empty"><p><b>${esc(UO.invest_no_figures)}</b></p></div>
  ${s ? `<p>${chip(s.state === "WORKED" ? "PROPOSED" : "NOT_ESTABLISHED")} ${esc(s.why)}</p>
  <section><h2 class="eyebrow">${esc(UO.invest_needs_heading)}</h2>${list(s.what_this_stage_needs)}</section>
  ${s.what_the_workspace_holds_toward_it ? `<section><h2 class="eyebrow">${esc(UO.invest_holds_heading)}</h2>
    <p>${esc(s.what_the_workspace_holds_toward_it)}</p></section>` : ""}`
    : `<p>${chip("NOT_ESTABLISHED")} ${esc(UO.invest_not_worked)}</p>`}
  <section><h2 class="eyebrow">${esc(UO.invest_position_heading)}</h2>
    <p>${esc(tpl(UO.invest_position, { investigations: dp.investigations, pathways: dp.pathways_supported,
      validated: dp.validated_for_implementation }))}</p>
    <p class="muted">${esc(o.structures_note || "")} <a href="#/invest">${esc(S.invest.title)} →</a></p></section>
  ${threadNext(o, "capital")}`;
}

function opportunityLearn(id) {
  const o = oppById(id);
  if (!o) return notFound();
  const s = o.learn, h = (s || {}).what_the_workspace_holds;
  const nothingYet = !h || !h.outcome_observations;
  return `${oppHead(o, S.learn.title, tpl(UO.learn_heading, o), "measurement")}
  ${nothingYet ? `<div class="empty"><p><b>${esc(UO.learn_attribution)}</b></p></div>` : ""}
  ${s ? `<p>${chip("NOT_ESTABLISHED")} ${esc(s.why)}</p>` : `<p>${chip("NOT_ESTABLISHED")} ${esc(UO.learn_not_worked)}</p>`}
  ${h ? `<section><h2 class="eyebrow">${esc(UO.learn_holds_heading)}</h2>
    <p>${esc(tpl(UO.learn_holds, { versions: h.plan_versions, outcomes: h.outcome_observations,
      links: h.intervention_to_outcome_links }))}</p></section>` : ""}
  ${s && s.what_would_move_it_on ? `<section><h2 class="eyebrow">${esc(UO.learn_move_heading)}</h2>${list(s.what_would_move_it_on)}</section>` : ""}
  <section><h2 class="eyebrow">${esc(S.learn.chain_heading)}</h2>
    <ol class="chain">${S.learn.chain.map(c => `<li><h3>${esc(c.step)}</h3><p>${esc(c.means)}</p></li>`).join("")}</ol></section>
  ${threadNext(o, "measurement")}`;
}

const title = k => k.toLowerCase().replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
const notFound = () => `${back("#/", U.back_overview)}<p>${esc(U.not_found)}</p>`;

const footer = () => `<footer class="foot">
  <p><b>${esc(U.vintage_label)}</b> ${D.vintage.map(esc).join(" · ")}</p>
  <p>${esc(D.footer.refresh)} ${esc(D.footer.elsewhere)}${D.footer.atlas_link ? ` <a href="${esc(D.footer.atlas_link.url)}" rel="noopener noreferrer">${esc(D.footer.atlas_link.label)}</a>.` : ""}</p></footer>`;

/* ---- the masthead, drawn once above every view: the page's name, the four sections in order,
   and who built it. The section names are the sections' own titles; the current one is marked. */
const SECTIONS = ["understand", "develop", "invest", "learn"];
const mast = document.createElement("header");
mast.className = "mast";
mast.innerHTML = `<div class="mast-in"><a class="mast-prod" href="#/">${esc(D.title)}</a>
  <p class="powered">${esc(U.powered_by)}</p></div>
  <nav class="mast-nav" aria-label="${esc(U.sections_label)}">${SECTIONS.map((k, i) =>
    `<a href="#/${k}" data-sec="${k}"><span class="n">${i + 1}</span>${esc(S[k].title)}</a>`).join("")}</nav>`;
app.before(mast);
const navLinks = [...mast.querySelectorAll(".mast-nav a")];

function route() {
  const [a, b, c] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  for (const l of navLinks) {
    if (l.dataset.sec === a) l.setAttribute("aria-current", "page");
    else l.removeAttribute("aria-current");
  }
  const view = !a ? overview()
    : a === "understand" ? (b === "figure" ? figure(c) : b === "signal" ? signalView(c) : understand())
    : a === "develop" ? (b === "opportunity" ? opportunityView(c) : develop())
    : a === "invest" ? (b === "structure" ? structure(c) : b === "opportunity" ? opportunityInvest(c) : invest())
    : a === "learn" ? (b === "opportunity" ? opportunityLearn(c) : learn()) : notFound();
  app.innerHTML = view + footer();
  document.title = a && S[a] ? `${S[a].title} · ${D.title}` : D.title;
  window.scrollTo(0, 0);
}

const draft = document.getElementById("draft");
if (D.pending_approval.length) {
  draft.hidden = false;
  draft.textContent = `${U.draft_prefix} ${D.pending_approval.map(x => x.what).join("; ")}.`;
}
addEventListener("hashchange", route);
route();
