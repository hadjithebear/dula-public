/* DULA V0.6 — THE CANONICAL VISUAL GRAMMAR.
 *
 * One module, imported by every relationship surface, so the mapping from what Dula knows to how it
 * is drawn exists in exactly one place and can be tested there.
 *
 * THE TWO CHANNELS ARE SEPARATE, AND THIS IS THE WHOLE POINT:
 *
 *      LINE STYLE  =  EPISTEMIC STATE      how sure are we this relationship exists
 *      THICKNESS   =  MAGNITUDE            how large is it -- ONLY when measured
 *
 * Before V0.6 these were conflated: sysview and chainview varied stroke width by confidence
 * (observed 2.0, unknown 1.0). That reads as "this relationship is bigger" when it meant "we are
 * surer", which are different questions and must never share a channel. From here, an edge is drawn
 * at one standard width unless Dula holds a MEASURED magnitude for it. Almost nothing does, so
 * almost every line is uniform — and that is scientifically correct. The payoff comes later: when a
 * genuinely thick edge appears, it means Dula has evidence the relationship is materially larger,
 * and nothing else can produce that appearance.
 *
 * CONTRADICTED IS NOT A POINT ON THE UNCERTAINTY SEQUENCE. Solid → dashed → dotted → broken runs
 * from "we observed it" to "no mechanism connects these". Contradiction is a different kind of
 * claim: evidence points AGAINST. It gets its own treatment — a struck line with an explicit badge
 * and reduced prominence — rather than a fifth dash pattern.
 *
 * RUST MEANS ATTENTION, NEVER BAD. It marks selection, Dula's own action, and intervention. A
 * negative or contradicted state communicates through structure, annotation and text. There is no
 * colour in this grammar that means "bad", and `rustAllowed()` exists so a surface can assert it.
 */

/* Dula's own epistemic vocabulary, as used across sysrel, transmit, econ and future, mapped onto the
 * four canonical line styles. The mapping is declared rather than inferred so it can be read and
 * argued with. */
export const LINE = {
  SOLID:  { dash: "", name: "solid" },
  DASHED: { dash: "7 5", name: "dashed" },
  DOTTED: { dash: "1.5 4", name: "dotted" },
  BROKEN: { dash: "11 9", name: "broken" },
};

export const EPISTEMIC = {
  OBSERVED:     { line: "SOLID",  word: "observed",
                  means: "Recorded directly in a series or a document." },
  SUPPORTED:    { line: "DASHED", word: "supported inference",
                  means: "Evidence points this way without establishing it." },
  CONDITIONAL:  { line: "DOTTED", word: "conditional",
                  means: "It follows only if something not yet measured is true." },
  HYPOTHESIZED: { line: "DOTTED", word: "hypothesis",
                  means: "Dula's reading of the evidence, not a finding in it." },
  UNKNOWN:      { line: "BROKEN", word: "missing mechanism",
                  means: "Nothing held connects these. The drawing stops." },
  CONTRADICTED: { line: "SOLID",  word: "contradicted", struck: true, faded: true,
                  means: "Evidence points against this." },
};

/* THICKNESS. One standard width, and a wider one only where a magnitude is actually measured. The
 * magnitude vocabulary is the held engine's own: MAGNITUDE_OBSERVED / _ESTIMATED / _UNKNOWN. Only
 * OBSERVED earns a different width; ESTIMATED is someone else's number applied here, which is not a
 * measurement of this relationship. */
export const STANDARD_WIDTH = 1.4;
export const MEASURED_WIDTH = 3.2;

export function width(magnitudeState) {
  return magnitudeState === "MAGNITUDE_OBSERVED" ? MEASURED_WIDTH : STANDARD_WIDTH;
}

export function magnitudeEncoded(magnitudeState) {
  return magnitudeState === "MAGNITUDE_OBSERVED";
}

/* EMPHASIS. Three tiers. Selection reveals structure; it does not make the rest of the economy
 * disappear, so context stays legible rather than dropping to the map's .22 layer value. */
export const EMPHASIS = { SELECTED: 1, CONNECTED: 0.62, CONTEXT: 0.3 };

export function emphasis(role) {
  return EMPHASIS[role] === undefined ? EMPHASIS.SELECTED : EMPHASIS[role];
}

/* ================================================================ VALUE AVAILABILITY
 *
 * NOT A NEW TAXONOMY. R-04's authored VALUE dimension already holds exactly these three, and its own
 * wording is the authority:
 *
 *   PRESENT                "a value, series or feature is actually there. ZERO IS PRESENT: 0 is a
 *                           measurement and never a missing one"
 *   WITHHELD_BY_PUBLISHER  "the measurement exists conceptually and the publisher withheld the
 *                           number -- Census (D), NASS suppression. This is categorically not ABSENT
 *                           and categorically not zero"
 *   ABSENT                 "no value is present in this representation. It says NOTHING about
 *                           whether a measurement exists"
 *
 * The generative exam found that the drawing had no treatment for the middle one, so two boards
 * invented one. This carries the kernel's existing state into the visual grammar; it adds nothing to
 * the kernel. A withheld value is drawn as a HELD SLOT WITH NO NUMBER IN IT -- hatched, not blank and
 * not broken -- because "someone measured this and will not tell us" is a different fact from both
 * "nobody measured it" and "it is zero".
 */
export const VALUE_STATE = {
  PRESENT:               { word: "present", hatched: false, slot: false,
                           means: "a value is there. Zero is present." },
  WITHHELD_BY_PUBLISHER: { word: "withheld by the publisher", hatched: true, slot: true,
                           means: "the publisher holds the number and suppressed it. Not absent, "
                                + "and not zero." },
  ABSENT:                { word: "no value in this representation", hatched: false, slot: true,
                           means: "nothing is here. It says nothing about whether a measurement "
                                + "exists elsewhere." },
};

export function valueState(v) {
  return VALUE_STATE[v] ? v : "PRESENT";
}

/* ================================================================ PERIOD COVERAGE
 *
 * ORTHOGONAL TO BOTH OF THE ABOVE, and this is the whole point of modelling it separately. An
 * observation covering seven months of a stated year is still OBSERVED and its value is still
 * PRESENT; what is partial is the INTERVAL the number speaks for. The canonical record already
 * carries `value.reference_time {stated, start, end, kind}`, and R-02 already records that a permit
 * total partly imputed from missing months "is indistinguishable from one that isn't" -- which is the
 * defect this treatment exists to make visible.
 *
 * So coverage is a MODIFIER, never a member of the epistemic enum. A record may not lose a valid
 * epistemic state because its period is short.
 */
export const COVERAGE = {
  COMPLETE:       { word: "complete period", dash: "", partial: false },
  PARTIAL_PERIOD: { word: "part of its period", dash: "4 3", partial: true },
};

export function coverage(reported, expected) {
  if (reported == null || expected == null || reported >= expected) {
    return { state: "COMPLETE", ...COVERAGE.COMPLETE, reported, expected, of: null };
  }
  return { state: "PARTIAL_PERIOD", ...COVERAGE.PARTIAL_PERIOD, reported, expected,
           of: `${reported} of ${expected}` };
}

/* THE THREE DIMENSIONS, COMBINED WITHOUT COLLAPSING.
 *
 * `mark()` returns one drawing instruction built from three independent facts. The invariant worth
 * testing, and tested: the epistemic component of the result is a function of `state` ALONE.
 * Neither a withheld value nor a short period may quietly demote how sure Dula is. */
export function mark(state, valueStateName, coverageInfo, magnitudeState, role) {
  const e = edge(state, magnitudeState, role);
  const v = VALUE_STATE[valueState(valueStateName)];
  const c = coverageInfo && coverageInfo.state ? coverageInfo : coverage(null, null);
  return {
    ...e,
    value: valueState(valueStateName), valueWord: v.word, hatched: v.hatched, emptySlot: v.slot,
    coverage: c.state, coverageWord: c.word, partial: !!c.partial, coverageOf: c.of,
    // the period's own dash never replaces the epistemic dash; a partial period is drawn as a
    // modifier ON the mark, which is why it is reported separately rather than merged into `dash`.
    periodDash: c.dash,
  };
}

/* A SELECTION A SURFACE CANNOT RESOLVE IS NOT A SELECTION HERE.
 *
 * The workspace carries one selection across projections on purpose, so a role chosen in the system
 * view stays chosen on the map. But the lenses do not all draw the same universe: a food role has no
 * node in the constraint graph. Without this, arriving at that graph with a role selected pushed
 * EVERY node to context and produced a screen that was uniformly faded and said nothing. A surface
 * that cannot find the selection among its own ids draws itself at full strength instead. */
export function resolve(id, ids) {
  if (!id) return null;
  const has = ids instanceof Set ? ids.has(id) : (ids || []).indexOf(id) >= 0;
  return has ? id : null;
}

/* Given a selection and an object's relationship to it, which tier does it sit in. */
export function tier(id, selectedId, connectedIds) {
  if (!selectedId) return "SELECTED";          // nothing selected: everything reads normally
  if (id === selectedId) return "SELECTED";
  return (connectedIds && connectedIds.has && connectedIds.has(id)) ? "CONNECTED" : "CONTEXT";
}

/* COLOUR. Rust is reserved. A surface may ask whether it is entitled to use it. */
export const RUST_MEANS = ["selection", "attention", "intervention", "dula-action"];

export function rustAllowed(reason) {
  return RUST_MEANS.indexOf(reason) >= 0;
}

/* The full drawing instruction for one edge, from what Dula knows about it. */
export function edge(state, magnitudeState, role) {
  const e = EPISTEMIC[state] || EPISTEMIC.UNKNOWN;
  return {
    state, dash: LINE[e.line].dash, lineName: LINE[e.line].name,
    width: width(magnitudeState),
    magnitudeEncoded: magnitudeEncoded(magnitudeState),
    opacity: emphasis(role || "SELECTED"),
    struck: !!e.struck, faded: !!e.faded,
    word: e.word, means: e.means,
  };
}

/* The legend for a set of states actually present, generated from the same table that draws them so
 * it can never describe a style the surface does not use. */
export function legendFor(states) {
  const seen = [];
  for (const s of states) {
    if (!EPISTEMIC[s] || seen.some(x => x.state === s)) continue;
    const e = EPISTEMIC[s];
    seen.push({ state: s, word: e.word, dash: LINE[e.line].dash, width: STANDARD_WIDTH,
                struck: !!e.struck });
  }
  return seen;
}
