import { escapeAttribute as a, escapeHTML as n } from "../shared/html.js";
import { S as te, i as O, o as ve } from "../chunks/rich-C-60Te1B.js";
import { a as z, i as ge, l as be, r as _e, s as N, t as $e, u as xe } from "../chunks/auto-mount-B7vOjcyv.js";
import { a as ye, g as h, i as we, l as se, m as F, o as ke, r as me, s as Se, u as m, v as p } from "../chunks/transport-DVxB6IT1.js";
import { r as V, t as Re } from "../chunks/keys-CcTTWa6z.js";
function q(e) {
  return Array.isArray(e) ? e.filter(m) : m(e) ? [e] : [];
}
function Ce(e) {
  return typeof e == "number" && Number.isSafeInteger(e) && e >= 0 ? e : 0;
}
var Ee = ["catalog_example", "prepared"];
function Le(e) {
  const t = {}, s = m(e.explore) ? e.explore : {};
  return Ee.forEach((r) => {
    const i = F(s[r]);
    i && i.context === r && (t[r] = i);
  }), t;
}
function Te(e, t) {
  const s = e.dataset;
  return s.provider === t.provider && s.id === t.datasetId && s.version === t.version && t.digest.length > 0 && s.digest.startsWith(t.digest);
}
function Pe(e) {
  const t = p(e.key), s = p(e.dataset_key);
  if (!t || !s) return null;
  const r = e.content_revision;
  return {
    key: t,
    datasetKey: s,
    label: p(e.label) || p(e.scenario_id) || t,
    scenarioId: p(e.scenario_id),
    version: p(e.version),
    targetId: p(e.target_id),
    status: p(e.status),
    statusLabel: p(e.status_label),
    active: e.active === !0,
    receiptId: p(e.receipt_id),
    contentRevision: typeof r == "number" && Number.isSafeInteger(r) && r > 0 ? r : null,
    selections: Le(e)
  };
}
function De(e) {
  const t = p(e.key);
  return t ? {
    key: t,
    label: p(e.label) || t,
    provider: p(e.provider),
    datasetId: p(e.dataset_id),
    version: p(e.version),
    digest: p(e.digest),
    origin: p(e.origin),
    synthetic: e.synthetic === !0,
    timezone: p(e.timezone),
    records: p(e.records),
    prerequisites: p(e.prerequisites),
    declaredScenarios: Ce(e.scenarios),
    scenarios: []
  } : null;
}
function re(e) {
  const t = q(e)[0] || {};
  return (Array.isArray(t.targets) ? t.targets.filter(m) : []).map((s) => F(s.explore_active)).filter((s) => s !== null && s.context === "active");
}
function Ae(e, t) {
  return re(e).find((s) => s.target_id === t);
}
function Ie(e, t) {
  const s = e.selections.prepared || e.selections.catalog_example;
  if (!e.active || !s) return;
  const r = t.find((i) => i.target_id === s.target_id && i.receipt_id === e.receiptId && i.scenario.id === s.scenario.id && i.scenario.version === s.scenario.version && i.scenario.profile_hash === s.scenario.profile_hash && i.dataset.digest === s.dataset.digest);
  r && (e.selections.active = r);
}
function Ne(e, t, s) {
  const r = re(s), i = [], o = /* @__PURE__ */ new Map();
  return q(e).forEach((l) => {
    const c = De(l);
    c && !o.has(c.key) && (o.set(c.key, c), i.push(c));
  }), q(t).forEach((l) => {
    const c = Pe(l), v = c ? o.get(c.datasetKey) : void 0;
    !c || !v || v.scenarios.some((f) => f.key === c.key) || (Ie(c, r), se.forEach((f) => {
      const g = c.selections[f];
      g && !Te(g, v) && delete c.selections[f];
    }), v.scenarios.push(c));
  }), i;
}
function y(e) {
  return e.scenarios.find((t) => t.selections.catalog_example);
}
function k(e) {
  return e ? se.filter((t) => !!e.selections[t]) : [];
}
var Y = 240, A = {
  invalid: "This preview could not be read. Choose the scenario again.",
  expired: "Your session expired. Reload the page to continue.",
  denied: "You do not have access to these records.",
  gone: "These records are no longer available.",
  stale: "The data changed since this preview loaded. Refresh to read the current records.",
  unavailable: "Record previews are temporarily unavailable.",
  timeout: "The preview took too long.",
  network: "The preview could not reach the server.",
  malformed: "The server returned records this page cannot read.",
  canceled: "The preview was canceled.",
  unconfigured: "Record previews are not available on this installation.",
  failed: "The preview failed."
}, qe = /* @__PURE__ */ new Set([
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "failed",
  "canceled"
]), Me = /* @__PURE__ */ new Set([
  "stale",
  "gone",
  "invalid"
]);
function Oe(e) {
  return e.length <= Y ? n(e) : `<span title="${a(e)}">${n(e.slice(0, Y))}…</span>`;
}
function w(e, t, s) {
  return `<span class="console-explorer__cell console-explorer__cell--${e}" title="${a(s)}">${n(t)}<span class="console-sr-only"> (${n(s)})</span></span>`;
}
function Fe(e, t) {
  switch (e?.state) {
    case "redacted":
      return w("redacted", "Withheld", "value withheld by policy");
    case "null":
      return w("null", "null", "no value recorded");
    case "value":
      break;
    default:
      return w("unknown", "Unknown", "value not available");
  }
  const s = e.value;
  return s === null ? w("null", "null", "no value recorded") : s === "" ? w("empty", "Empty", "empty text") : typeof s == "boolean" ? `<code class="console-kv__mono">${s ? "true" : "false"}</code>` : typeof s == "number" && (t.type === "integer" || t.type === "number") ? `<span class="console-explorer__number">${n(s.toLocaleString())}</span>` : Oe(String(s));
}
function Be(e) {
  const t = e.unit ? `<span class="console-explorer__unit">${n(e.unit)}</span>` : "", s = [e.description, e.type].filter(Boolean).join(" · ");
  return `<th scope="col" title="${a(s)}"><span class="console-explorer__column">${n(e.label)}</span>${t}</th>`;
}
function Ke(e, t, s, r) {
  return r.map((i) => {
    const o = `related:${e.id}:${t}:${i.id}`;
    return `<button type="button" class="console-btn console-btn--sm" data-explorer-action="related" data-entity-id="${a(e.id)}" data-record-key="${a(t)}" data-relationship-id="${a(i.id)}" data-explorer-focus="${a(o)}" aria-describedby="${a(s)}">${n(i.label)}</button>`;
  }).join("");
}
function je(e, t, s, r, i) {
  const o = s.columns, l = r.length > 0, c = `${o.map(Be).join("")}${l ? '<th scope="col">Related</th>' : ""}`, v = s.rows.map((f, g) => {
    const b = `${e}-row-${t.id}-${g}`, _ = o.map(($, fe) => {
      const H = Fe(f.cells[$.id], $), W = a($.unit ? `${$.label} (${$.unit})` : $.label);
      return fe === 0 ? `<td data-label="${W}" id="${a(b)}">${H}</td>` : `<td data-label="${W}">${H}</td>`;
    }).join(""), he = l ? `<td data-label="Related" class="console-explorer__related-cell">${Ke(t, f.record_key, b, r)}</td>` : "";
    return `<tr data-record-key="${a(f.record_key)}">${_}${he}</tr>`;
  }).join("");
  return `<div class="console-explorer__table-wrap"><table class="console-table console-explorer__table console-explorer__samples"><caption class="console-sr-only">${n(i)}</caption><thead><tr>${c}</tr></thead><tbody>${v}</tbody></table></div>`;
}
function Ue(e) {
  return (e.sampling_method ? `Sampling: ${e.sampling_method}. ` : "") + (e.provenance === "observed" ? "Observed records." : e.provenance === "example" ? "Example records declared by the provider, not observed data." : "Provenance unknown.");
}
function He(e) {
  const t = e.value.rows.length;
  if (t === 0) return "No records";
  const s = e.start + 1, r = e.start + t, i = e.value.total;
  return i === null ? `Records ${s.toLocaleString()}–${r.toLocaleString()}; total unknown` : `Records ${s.toLocaleString()}–${r.toLocaleString()} of ${i.toLocaleString()}`;
}
function ie(e, t, s, r) {
  const i = (o) => o ? "" : ' aria-disabled="true"';
  return `<div class="console-explorer__pager" role="group" aria-label="Pages">
    <button type="button" class="console-btn console-btn--sm" data-explorer-action="page-previous" ${s} data-explorer-focus="${a(`${r}:previous`)}"${i(e)}>Previous</button>
    <button type="button" class="console-btn console-btn--sm" data-explorer-action="page-next" ${s} data-explorer-focus="${a(`${r}:next`)}"${i(t)}>Next</button>
  </div>`;
}
function We(e, t, s) {
  const r = e.page > 0;
  return !r && !e.hasNext ? "" : ie(r, e.hasNext, t, s);
}
function ze(e, t) {
  switch (e.state) {
    case "unsupported":
      return '<div class="console-callout" data-tone="info" data-explorer-sample-state="unsupported"><p>This provider does not offer sample records for this selection.</p></div>';
    case "suppressed":
      return '<div class="console-callout" data-tone="info" data-explorer-sample-state="suppressed"><p>Records for this selection are hidden by policy.</p></div>';
    default:
      return e.rows.length === 0 ? `<p class="console-explorer__para" data-explorer-sample-state="empty">No ${n(t)} records in this selection.</p>` : "";
  }
}
function Ve(e) {
  return e.completeness === "partial" ? '<div class="console-callout" data-tone="warning"><p>Partial preview: some records or values were left out.</p></div>' : e.completeness === "unknown" ? '<p class="console-explorer__para console-muted" data-explorer-completeness="unknown">Completeness unknown: the provider does not say whether records or values were left out.</p>' : "";
}
function Ye(e) {
  return e.observed_at ? ` Read ${O(e.observed_at, te)}.` : "";
}
function Ge(e, t, s) {
  const r = A[e.kind] || A.failed, i = qe.has(e.kind) ? `<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="page-retry" ${t} data-explorer-focus="${a(`${s}:retry`)}">Try again</button></div>` : Me.has(e.kind) ? '<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button></div>' : "";
  return `<div class="console-callout console-explorer__state" data-tone="${e.kind === "denied" || e.kind === "expired" ? "error" : "warning"}" role="alert" data-explorer-failure="${a(e.kind in A ? e.kind : "failed")}"><p>${n(r)}</p>${i}</div>`;
}
function ne(e, t, s, r, i, o) {
  if (s.status === "loading") {
    const b = '<div class="console-explorer__loading" role="status" aria-busy="true">Loading records…</div>';
    return s.paged ? `${b}<div class="console-explorer__pager-row"><span></span>${ie(!1, !1, i, o)}</div>` : b;
  }
  if (s.status === "failed") return Ge(s.failure, i, o);
  const l = s.value, c = ze(l, t.label), v = l.state === "available" || l.state === "empty", f = v && l.rows.length > 0 ? je(e, t, l, r, `${t.label} records`) : "", g = v && l.rows.length > 0 ? `<div class="console-explorer__pager-row"><span class="console-muted" role="status">${n(He(s))}</span>${We(s, i, o)}</div>` : "";
  return `<p class="console-explorer__para console-muted">${n(Ue(l))}${Ye(l)}</p>${Ve(l)}${c}${f}${g}`;
}
function Xe(e, t, s, r) {
  const i = `data-entity-id="${a(t.id)}"`, o = `samples:${t.id}`;
  if (!r) return "";
  if (!s) return `<div class="console-explorer__preview-toggle"><button type="button" class="console-btn console-btn--sm" data-explorer-action="samples" ${i} data-explorer-focus="${a(`${o}:open`)}">Preview ${n(t.label)} records</button><span class="console-muted">Up to 25 representative records for the data shown above. Reading never prepares or changes data.</span></div>`;
  const l = t.relationships;
  return `
    <section class="console-explorer__preview" aria-labelledby="${a(`${e}-preview-${t.id}`)}" data-explorer-preview="${a(t.id)}">
      <div class="console-explorer__preview-head">
        <h5 class="console-explorer__label" id="${a(`${e}-preview-${t.id}`)}">Sample ${n(t.label)} records</h5>
        <button type="button" class="console-btn console-btn--sm console-btn--ghost" data-explorer-action="samples-hide" ${i} data-explorer-focus="${a(`${o}:hide`)}">Hide records</button>
      </div>
      ${ne(e, t, s, l, i, o)}
    </section>
  `;
}
function G(e, t, s, r, i) {
  const o = s || t;
  return `
    <div class="console-drawer__body console-explorer__related-body" data-explorer-related-body>
      <p class="console-explorer__para console-muted">Declared ${n(o.label)} records related to ${n(t.label)} record <code class="console-kv__mono">${n(r)}</code>. One level only.</p>
      ${ne(e, o, i, [], "data-related-page", "related")}
    </div>
  `;
}
var oe = /* @__PURE__ */ new Set([
  "denied",
  "expired",
  "gone",
  "stale",
  "invalid",
  "unconfigured"
]);
function X(e) {
  return JSON.stringify([
    e.state,
    e.completeness,
    e.provenance,
    e.entity_id,
    e.sampling_method,
    e.total,
    !!e.next_cursor,
    e.columns,
    e.rows.map((t) => t.cells)
  ]);
}
function Je(e) {
  return typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(e) : e.replace(/["\\]/g, "\\$&");
}
var Qe = class {
  constructor(e) {
    this.pages = /* @__PURE__ */ new Map(), this.related = null, this.relatedSequence = 0, this.samplesRead = (t, s, r) => this.host.transport.samples({
      selection: t.selection,
      entityId: t.entityId,
      cursor: s,
      limit: 25
    }, r), this.relatedRead = (t, s, r) => {
      const i = t, o = i.source.relationships.find((l) => l.id === i.relationshipId);
      return this.host.transport.related({
        selection: t.selection,
        entityId: t.entityId,
        cursor: s,
        limit: 25,
        recordKey: i.recordKey,
        relationshipId: i.relationshipId,
        relatedEntityId: o?.entity_id || t.entityId
      }, r);
    }, this.host = e;
  }
  key(e, t) {
    return `${h(e)}\0${t}`;
  }
  render(e, t) {
    const s = e ? this.pages.get(this.key(e, t.id))?.page : void 0;
    return Xe(this.host.scope, t, s, this.host.configured && !!e);
  }
  open(e, t) {
    const s = this.key(e, t);
    if (this.pages.has(s) || !this.host.configured) return;
    const r = {
      selection: e,
      entityId: t,
      cursors: [""],
      starts: [0],
      page: {
        status: "loading",
        page: 0,
        start: 0
      },
      controller: null
    };
    this.pages.set(s, r), this.load(r, 0, this.samplesRead, () => this.host.update(`samples:${t}:hide`));
  }
  hide(e, t) {
    const s = this.key(e, t);
    this.pages.get(s)?.controller?.abort(), this.pages.delete(s), this.host.update(`samples:${t}:open`);
  }
  turn(e, t, s) {
    const r = this.pages.get(this.key(e, t));
    if (!r) return;
    const i = r.page.page + s, o = `samples:${t}:${s < 0 ? "previous" : s > 0 ? "next" : "retry"}`;
    i < 0 || i >= r.cursors.length || this.load(r, i, this.samplesRead, () => this.host.update(o));
  }
  openRelated(e, t, s, r, i, o) {
    const l = t.entities.find((_) => _.id === s), c = l?.relationships.find((_) => _.id === i);
    if (!l || !c || !this.host.configured) return;
    this.closeRelated(!1);
    const v = t.entities.find((_) => _.id === c.entity_id), f = {
      status: "loading",
      page: 0,
      start: 0
    };
    this.relatedSequence += 1;
    const g = new be({
      root: this.host.root,
      id: `${this.host.scope}-related-${this.relatedSequence}`,
      panelID: "explore",
      actionID: "related",
      title: c.label,
      eyebrow: "Related records",
      body: G(this.host.scope, l, v, r, f),
      invoker: o,
      fallbackFocus: () => this.host.fallbackFocus(`related:${s}:${r}:${i}`),
      onClose: () => {
        this.related?.drawer === g && (this.related.controller?.abort(), this.related = null);
      }
    }), b = {
      selection: e,
      entityId: s,
      cursors: [""],
      starts: [0],
      page: f,
      controller: null,
      source: l,
      target: v,
      recordKey: r,
      relationshipId: i,
      drawer: g
    };
    this.related = b, this.load(b, 0, this.relatedRead, () => this.updateRelated());
  }
  turnRelated(e) {
    const t = this.related;
    if (!t) return;
    const s = t.page.page + e;
    s < 0 || s >= t.cursors.length || this.load(t, s, this.relatedRead, () => this.updateRelated());
  }
  closeRelated(e = !0) {
    const t = this.related;
    this.related = null, t?.controller?.abort(), t?.drawer.close(e);
  }
  ownsDrawerElement(e) {
    return !!(this.related?.drawer.isOpen() && this.related.drawer.dialog.contains(e));
  }
  clear() {
    this.pages.forEach((e) => e.controller?.abort()), this.pages.clear(), this.closeRelated(!1);
  }
  markStale(e) {
    const t = e ? h(e) : "";
    this.pages.forEach((r, i) => {
      if (h(r.selection) !== t) {
        r.controller?.abort(), this.pages.delete(i);
        return;
      }
      r.stale = !0;
    });
    const s = this.related;
    s && h(s.selection) === t ? s.stale = !0 : this.closeRelated(!1);
  }
  revalidate() {
    this.pages.forEach((e) => this.revalidatePage(e, this.samplesRead, () => this.host.update())), this.related && this.revalidatePage(this.related, this.relatedRead, () => this.updateRelated());
  }
  revalidatePage(e, t, s) {
    if (!e.stale || e.controller || e.page.status === "loading") return;
    e.stale = !1;
    const r = e.page.page, i = e.page, o = new AbortController();
    e.controller = o, t(e, e.cursors[r] ?? "", o.signal).then((l) => {
      if (!(o.signal.aborted || e.controller !== o || !this.isCurrent(e))) {
        if (e.controller = null, !l.ok) {
          if (!oe.has(l.failure.kind)) return;
          e.page = {
            status: "failed",
            page: r,
            start: i.start,
            failure: l.failure
          }, s();
          return;
        }
        i.status === "ready" && X(i.value) === X(l.value) || (this.applyPage(e, r, l.value), s());
      }
    });
  }
  isCurrent(e) {
    return e === this.related ? !0 : this.pages.get(this.key(e.selection, e.entityId)) === e;
  }
  load(e, t, s, r) {
    e.stale = !1, e.controller?.abort();
    const i = new AbortController();
    e.controller = i;
    const o = e.page.status === "ready" && (e.page.page > 0 || e.page.hasNext);
    e.page = {
      status: "loading",
      page: t,
      start: e.starts[t] ?? 0,
      paged: o
    }, r(), s(e, e.cursors[t] ?? "", i.signal).then((l) => {
      i.signal.aborted || e.controller !== i || !this.isCurrent(e) || (e.controller = null, l.ok ? this.applyPage(e, t, l.value) : e.page = {
        status: "failed",
        page: t,
        start: e.starts[t] ?? 0,
        failure: l.failure
      }, r());
    });
  }
  applyPage(e, t, s) {
    const r = e.starts[t] ?? 0, i = s.next_cursor;
    e.cursors = e.cursors.slice(0, t + 1), e.starts = e.starts.slice(0, t + 1), i && (e.cursors.push(i), e.starts.push(r + s.rows.length)), e.page = {
      status: "ready",
      page: t,
      start: r,
      value: s,
      hasNext: !!i
    };
  }
  updateRelated() {
    const e = this.related;
    if (!e || !e.drawer.isOpen()) return;
    const t = e.drawer.dialog.querySelector("[data-explorer-related-body]");
    if (!t) return;
    const s = this.host.root.ownerDocument.activeElement, r = s instanceof HTMLElement && t.contains(s) && s.getAttribute("data-explorer-focus") || "", i = t.ownerDocument.createElement("template");
    i.innerHTML = G(this.host.scope, e.source, e.target, e.recordKey, e.page);
    const o = i.content.firstElementChild;
    o && (t.replaceWith(o), r && o.querySelector(`[data-explorer-focus="${Je(r)}"]`)?.focus());
  }
}, S = [
  {
    id: "about",
    label: "About"
  },
  {
    id: "contents",
    label: "Contents"
  },
  {
    id: "usage",
    label: "Used by"
  },
  {
    id: "scenarios",
    label: "Scenarios"
  },
  {
    id: "evidence",
    label: "Evidence"
  }
], Ze = [{
  id: "insights",
  label: "Insights"
}, {
  id: "compare",
  label: "Compare"
}];
function M(e) {
  return e === "insights" || e === "compare";
}
var et = {
  id: "app-preview",
  label: "App preview"
};
function tt(e, t = !1) {
  if (!e && !t) return S;
  const s = [];
  return S.forEach((r) => {
    s.push(r), e && r.id === "contents" && s.push(...Ze), t && r.id === "usage" && s.push(et);
  }), s;
}
var T = te, R = {
  catalog_example: "Catalog example",
  prepared: "Prepared receipt",
  active: "Active data"
}, st = {
  catalog_inventory: "Catalog inventory",
  selected_scenario: "Selected scenario"
}, rt = {
  screen: "Screen",
  report: "Report",
  workflow: "Workflow",
  target: "Managed target"
}, ae = {
  active: "success",
  verified: "info",
  stale_verification: "warning",
  verification_failed: "error",
  prepared: "neutral",
  not_prepared: "neutral"
}, J = {
  unconfigured: "Exploration is not available on this installation.",
  invalid: "This selection could not be read. Choose the scenario again.",
  expired: "Your session expired. Reload the page to continue.",
  denied: "You do not have access to explore this selection.",
  gone: "This selection is no longer available. Choose a current scenario or context.",
  stale: "The data changed since this view loaded. Refresh to explore the current state.",
  unavailable: "Exploration is temporarily unavailable.",
  timeout: "The request took too long.",
  network: "The request could not reach the server.",
  malformed: "The server returned details this page cannot read.",
  failed: "Exploration failed.",
  canceled: "The request was canceled."
}, it = /* @__PURE__ */ new Set([
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "failed",
  "canceled"
]), u = '<span class="console-kv__empty">Unknown</span>';
function d(e) {
  return `<span class="console-muted">${n(e)}</span>`;
}
function B(e, t = "") {
  return ve(e, t, T);
}
function Q(e, t) {
  if (!e) return u;
  const s = e.length > 16 ? `${e.slice(0, 12)}…` : e, r = s === e ? "" : ` title="${a(e)}"`;
  return `<span class="console-kv__copy" data-copy-content="${a(e)}"><code class="console-kv__mono"${r}>${n(s)}</code><button type="button" class="${T.copyBtnSm} console-kv__copy-btn" data-copy-trigger title="${a(`Copy ${t}`)}" aria-label="${a(`Copy ${t}`)}">Copy</button></span>`;
}
function K(e) {
  return `<dl class="console-kv">${e.map(([t, s]) => `<dt>${n(t)}</dt><dd>${s}</dd>`).join("")}</dl>`;
}
function C(e, t) {
  return e.length === 0 ? d(t) : `<ul class="console-explorer__list">${e.map((s) => `<li>${n(s)}</li>`).join("")}</ul>`;
}
function x(e) {
  if (e?.status === "ready")
    return e.value.state === "available" || e.value.state === "empty" ? e.value : void 0;
}
function le(e, t) {
  return x(t)?.title || e.label;
}
function ce(e, t) {
  const s = t.selections.catalog_example;
  if (!(!e || !s))
    return e.scenarios.find((r) => r.scenario.id === s.scenario.id && r.scenario.version === s.scenario.version && r.scenario.profile_hash === s.scenario.profile_hash);
}
function P(e, t) {
  return ce(e, t)?.title || t.label;
}
function j(e) {
  return e.statusLabel ? B(e.statusLabel, ae[e.status] || "neutral") : "";
}
function nt(e) {
  return e?.statusLabel ? {
    label: e.statusLabel,
    tone: ae[e.status] || "neutral"
  } : void 0;
}
function de(e, t, s = !0) {
  if (!t) return d("No description available.");
  if (!s && !e) return d("Description unknown: no scenario of this dataset can be explored.");
  if (!e || e.status === "loading") return '<span class="console-muted" aria-busy="true">Loading description…</span>';
  if (e.status === "failed") return d("Description unavailable.");
  switch (e.value.state) {
    case "unsupported":
      return d("No description provided by this dataset’s provider.");
    case "suppressed":
      return d("Description hidden by policy.");
    default:
      return e.value.summary ? n(e.value.summary) : d("No description provided.");
  }
}
function ot(e, t) {
  return e.scenarios.length === 0 ? d("None available") : `<ul class="console-explorer__chips">${e.scenarios.map((s) => `<li><span>${n(P(t, s))}</span>${j(s)}</li>`).join("")}</ul>`;
}
function at(e, t) {
  const s = t.cards.get(e.key), r = x(s), i = le(e, s);
  return `
    <article class="console-card console-explorer__card" data-row-key="${a(e.key)}" aria-labelledby="${a(`${t.scope}-card-${e.key}`)}">
      <header class="console-card__top">
        <span class="console-card__eyebrow">${n(e.origin || "Dataset")}</span>
        ${e.version ? `<code class="console-kv__mono console-explorer__version">v${n(e.version)}</code>` : ""}
      </header>
      <h4 class="console-card__title" id="${a(`${t.scope}-card-${e.key}`)}">${n(i)}</h4>
      <p class="console-card__subtitle console-explorer__summary">${de(s, t.configured, t.explorable.has(e.key))}</p>
      <dl class="console-card__meta console-explorer__card-meta">
        <div><dt>Scenarios</dt><dd>${ot(e, r)}</dd></div>
        <div><dt>Catalog inventory</dt><dd>${e.records && e.records !== "None" ? n(e.records) : u}</dd></div>
      </dl>
      <footer class="console-card__foot">
        ${e.provider ? d(`Provider ${e.provider}`) : "<span></span>"}
        <button type="button" class="console-btn console-btn--sm" data-explorer-action="open" data-dataset-key="${a(e.key)}" data-explorer-focus="${a(`open:${e.key}`)}" aria-label="${a(`View details for ${i}`)}">View details</button>
      </footer>
    </article>
  `;
}
function lt(e) {
  const t = e.datasets.slice(0, e.limit), s = e.datasets.length - t.length, r = e.configured ? "" : '<div class="console-callout" data-tone="info"><p>Descriptions, sample records and declared usage are not offered on this installation. Cards show lifecycle details only.</p></div>', i = e.datasets.length === 0 ? '<div class="console-empty">No datasets are available to explore.</div>' : `<div class="console-cards console-explorer__cards">${t.map((l) => at(l, e)).join("")}</div>`, o = s > 0 ? `<div class="console-explorer__more"><button type="button" class="console-btn" data-explorer-action="more">Show ${s} more</button></div>` : "";
  return `
    <section class="console-card-section console-explorer__catalog" aria-labelledby="${a(`${e.scope}-catalog`)}">
      <div class="console-json-header console-section-header"><div class="console-section-heading"><h3 class="console-json-title" id="${a(`${e.scope}-catalog`)}">Explore datasets</h3><p class="console-section-description">Descriptions and declared usage come from each dataset’s provider. Counts are catalog inventory unless labelled otherwise.</p></div></div>
      ${r}${i}${o}
    </section>
  `;
}
function ct(e, t, s) {
  if (!e) return "This scenario cannot be explored in this context.";
  switch (t) {
    case "prepared":
      return s?.selections.active?.receipt_id === e.receipt_id ? `Prepared receipt ${e.receipt_id} (content revision ${e.content_revision}) on ${e.target_id}: observed in its immutable prepared stage. This receipt is the active one; choose Active data to read what the target serves.` : `Prepared receipt ${e.receipt_id} (content revision ${e.content_revision}) on ${e.target_id}: observed in the prepared stage. It is not active.`;
    case "active":
      return `Active on ${e.target_id} at generation ${e.generation} (receipt ${e.receipt_id}): observed in the data the target serves.`;
    default:
      return "Catalog example: what the provider declares this scenario contains. It is not observed data and has not been verified.";
  }
}
function D(e, t) {
  return t ? e === "prepared" ? "No prepared receipt for this scenario." : e === "active" ? t.targetId ? `This scenario is not active on ${t.targetId}.` : "This scenario is not active." : "This scenario has no explorable target." : "Choose a scenario first.";
}
function dt(e, t) {
  const s = e.dataset.scenarios.map((i) => {
    const o = i.key === e.scenario?.key ? " selected" : "", l = i.statusLabel ? ` — ${i.statusLabel}` : "";
    return `<option value="${a(i.key)}"${o}>${n(P(t, i) + l)}</option>`;
  }).join(""), r = e.scenario || !e.scenarioKey || !s ? "" : '<option value="" selected disabled>Scenario no longer available</option>';
  return `<label class="console-filter console-explorer__picker">Scenario<select data-explorer-control="scenario" data-explorer-focus="scenario"${s ? "" : " disabled"}>${r}${s || "<option>No scenarios</option>"}</select></label>`;
}
function pt(e) {
  const t = `${e.scope}-context`;
  return `<fieldset class="console-explorer__contexts"><legend class="console-explorer__legend">Data shown</legend><div class="console-explorer__choices">${Object.keys(R).map((s) => {
    const r = !!e.scenario?.selections[s], i = s === e.context ? " checked" : "", o = r ? "" : D(s, e.scenario), l = `${e.scope}-context-${s}`;
    return `<label class="console-explorer__choice${r ? "" : " console-explorer__choice--unavailable"}" for="${a(l)}"${o ? ` title="${a(o)}"` : ""}><input type="radio" id="${a(l)}" name="${a(t)}" value="${s}" data-explorer-control="context" data-explorer-focus="${a(`context:${s}`)}"${i}${r ? "" : " disabled"}><span>${n(R[s])}</span>${o ? `<span class="console-sr-only"> — ${n(o)}</span>` : ""}</label>`;
  }).join("")}</div></fieldset>`;
}
function ut(e) {
  if (e?.status !== "ready") return "";
  const t = e.value, s = [t.observed_at ? `Read ${O(t.observed_at, T)}` : "", t.presentation_revision && t.presentation_revision !== "unknown" ? `Description revision ${n(t.presentation_revision)}` : ""].filter(Boolean);
  return s.length > 0 ? `<p class="console-explorer__observed">${s.join(" · ")}</p>` : "";
}
function ht(e) {
  const t = x(e.entry), s = le(e.dataset, e.entry), r = [
    e.dataset.origin,
    e.dataset.version ? `v${e.dataset.version}` : "",
    e.dataset.provider
  ].filter(Boolean).join(" · ");
  return `
    <section class="console-json-panel console-explorer__header" aria-labelledby="${a(`${e.scope}-title`)}">
      <div class="console-explorer__heading">
        ${r ? `<span class="console-card__eyebrow">${n(r)}</span>` : ""}
        <h3 class="console-explorer__title" id="${a(`${e.scope}-title`)}" tabindex="-1" data-explorer-focus="title">${n(s)}</h3>
        <p class="console-explorer__summary">${e.drift ? d("Refresh to show the description of the current data.") : de(e.entry, e.configured, !!e.selection)}</p>
      </div>
      <div class="console-explorer__context" role="group" aria-label="Exploring">
        ${dt(e, t)}
        ${pt(e)}
      </div>
      <p class="console-explorer__note" data-context="${e.context}">${n(ct(e.selection, e.context, e.scenario))}</p>
      ${ut(e.entry)}
    </section>
  `;
}
function ft(e) {
  return `<div class="console-explorer__tabs" role="tablist" aria-label="Dataset details">${(e.sections || S).map(({ id: t, label: s }) => {
    const r = t === e.section;
    return `<button type="button" role="tab" class="console-explorer__tab${r ? " console-explorer__tab--active" : ""}" id="${a(`${e.scope}-tab-${t}`)}" aria-selected="${r ? "true" : "false"}" aria-controls="${a(`${e.scope}-section`)}" tabindex="${r ? "0" : "-1"}" data-explorer-section="${t}" data-explorer-focus="${a(`section:${t}`)}">${n(s)}</button>`;
  }).join("")}</div>`;
}
function E(e) {
  const t = e.kind in J ? e : {
    kind: "failed",
    status: e.status
  }, s = it.has(t.kind) ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="retry" data-explorer-focus="retry">Try again</button>' : "", r = t.kind === "gone" || t.kind === "invalid" || t.kind === "stale" ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>' : "";
  return `<div class="console-callout console-explorer__state" data-tone="${t.kind === "denied" || t.kind === "expired" ? "error" : "warning"}" role="alert" data-explorer-failure="${t.kind}"><p>${n(J[t.kind])}</p>${s || r ? `<div class="console-explorer__state-actions">${s}${r}</div>` : ""}</div>`;
}
function vt(e) {
  if (!e.scenario) return "The scenario you were exploring is no longer available. Choose another scenario or refresh.";
  const t = R[e.context].toLowerCase();
  if (e.drift === "unavailable") return `The ${t} you were exploring is no longer available for this scenario. Refresh to explore what is available now.`;
  const s = e.current;
  return `The ${t} changed since you opened it.${s?.context === "active" ? ` It is now receipt ${s.receipt_id} at generation ${s.generation}.` : s?.context === "prepared" ? ` It is now receipt ${s.receipt_id} (content revision ${s.content_revision}).` : ""} Refresh to explore the current data.`;
}
function U(e) {
  return `<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-explorer-state="stale"><p>${n(vt(e))}</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button></div></div>`;
}
function gt(e) {
  const t = e.entry;
  return e.configured ? e.drift ? U(e) : e.selection ? !t || t.status === "loading" ? '<div class="console-explorer__loading" role="status" aria-busy="true">Loading details…</div>' : t.status === "failed" ? E(t.failure) : t.value.state === "suppressed" ? '<div class="console-callout console-explorer__state" data-tone="info" data-explorer-state="suppressed"><p>Details for this selection are hidden by policy.</p></div>' : t.value.state === "unsupported" ? '<div class="console-callout console-explorer__state" data-tone="info" data-explorer-state="unsupported"><p>This dataset’s provider does not describe its contents. Lifecycle details remain available in the other tabs.</p></div>' : "" : `<div class="console-callout console-explorer__state" data-tone="info"><p>${n(D(e.context, e.scenario))}</p></div>` : E({
    kind: "unconfigured",
    status: 0
  });
}
function bt(e) {
  const t = e?.period;
  if (!t) return d("No declared period");
  const s = t.start === t.end || !t.end ? t.start : `${t.start} to ${t.end}`;
  return n(t.timezone ? `${s} (${t.timezone})` : s);
}
function _t(e, t) {
  const s = e.selection, r = [
    ["Provider", e.dataset.provider ? n(e.dataset.provider) : u],
    ["Dataset ID", e.dataset.datasetId ? `<code class="console-kv__mono">${n(e.dataset.datasetId)}</code>` : u],
    ["Version", e.dataset.version ? n(e.dataset.version) : u],
    ["Digest", Q(s?.dataset.digest || e.dataset.digest, "dataset digest")]
  ];
  return s && r.push(["Scenario", `<code class="console-kv__mono">${n(`${s.scenario.id} v${s.scenario.version}`)}</code>`], ["Profile hash", Q(s.scenario.profile_hash, "scenario profile hash")], ["Target", n(s.target_id)]), t?.presentation_revision && r.push(["Description revision", n(t.presentation_revision)]), `<details class="console-explorer__identity" data-explorer-disclosure="identity"${e.identityOpen ? " open" : ""}><summary>Technical identity</summary>${K(r)}</details>`;
}
function $t(e, t) {
  const s = t ? C(t.prerequisites, "None declared") : n(e.dataset.prerequisites || "None");
  return `${K([
    ["Origin", n([e.dataset.origin, t?.origin && t.origin !== "unknown" ? t.origin : ""].filter(Boolean).join(" · ") || "Unknown")],
    ["Declared period", bt(t)],
    ["Timezone", n(t?.period?.timezone || e.dataset.timezone || "") || u],
    ["Prerequisites", s],
    ["Attribution", t ? C(t.attribution, "None declared") : u]
  ])}${_t(e, t)}`;
}
function pe(e, t) {
  return e.entities.find((s) => s.id === t)?.label || t;
}
function xt(e) {
  return e.inventory.length === 0 ? `<p class="console-explorer__para">${d("No counts declared.")}</p>` : `<table class="console-table console-explorer__table"><caption class="console-explorer__caption">Counts. Catalog inventory covers the whole dataset; selected-scenario counts describe this scenario only.</caption><thead><tr><th scope="col">Entity</th><th scope="col">Scope</th><th scope="col">Count</th></tr></thead><tbody>${e.inventory.map((t) => `<tr><td data-label="Entity">${n(pe(e, t.entity_id))}</td><td data-label="Scope">${n(st[t.scope])}</td><td data-label="Count" class="console-explorer__number">${t.total === null ? u : n(t.total.toLocaleString())}</td></tr>`).join("")}</tbody></table>`;
}
function yt(e) {
  return e.fields.length === 0 ? `<p class="console-explorer__para">${d("No fields declared.")}</p>` : `<table class="console-table console-explorer__table"><thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Unit</th><th scope="col">Meaning</th></tr></thead><tbody>${e.fields.map((t) => `<tr><td data-label="Field"><span class="console-cell-main"><span class="console-cell-title">${n(t.label)}</span><code class="console-cell-sub console-kv__mono">${n(t.id)}</code></span></td><td data-label="Type">${n(t.type)}</td><td data-label="Unit">${t.unit ? n(t.unit) : d("—")}</td><td data-label="Meaning">${t.description ? n(t.description) : d("Not described")}</td></tr>`).join("")}</tbody></table>`;
}
function wt(e, t) {
  return t.relationships.length === 0 ? "" : `<div class="console-explorer__related"><span class="console-explorer__label">Declared relationships</span>${C(t.relationships.map((s) => `${s.label} → ${pe(e, s.entity_id)}`), "")}</div>`;
}
function kt(e, t, s) {
  return `
    <article class="console-explorer__entity" data-entity-id="${a(s.id)}" aria-labelledby="${a(`${e.scope}-entity-${s.id}`)}">
      <div class="console-explorer__entity-head">
        <h4 class="console-explorer__entity-title" id="${a(`${e.scope}-entity-${s.id}`)}">${n(s.label)}</h4>
        ${s.description ? `<p class="console-explorer__para">${n(s.description)}</p>` : `<p class="console-explorer__para">${d("Not described.")}</p>`}
      </div>
      ${yt(s)}
      ${wt(t, s)}
      ${e.preview ? e.preview(s) : ""}
    </article>
  `;
}
function mt(e, t) {
  const s = t.entities.length === 0 ? `<p class="console-explorer__para">${d("No entities declared.")}</p>` : t.entities.map((r) => kt(e, t, r)).join("");
  return `${xt(t)}<div class="console-explorer__entities">${s}</div>`;
}
function St(e) {
  switch (e.usage_completeness) {
    case "complete":
      return "Declared by the dataset’s provider, which reports this list as complete. It is not discovered at runtime.";
    case "partial":
      return "Declared by the dataset’s provider. Other uses may exist; this list is not discovered at runtime.";
    default:
      return "Declared by the dataset’s provider. Other uses may exist; this list is not discovered at runtime.";
  }
}
var Rt = [
  {
    id: "prepare",
    label: "Prepare"
  },
  {
    id: "verify",
    label: "Verify"
  },
  {
    id: "activate",
    label: "Activate"
  }
];
function Ct(e, t) {
  if (!e) return "";
  try {
    const s = new URL(t), r = new URL(e, s);
    return r.protocol !== "http:" && r.protocol !== "https:" || r.origin !== s.origin ? "" : r.href;
  } catch {
    return "";
  }
}
function Et(e) {
  const t = Rt.map(({ id: s, label: r }) => {
    const i = e.effects.filter((l) => l.phase === s), o = i.length === 0 ? '<span class="console-kv__empty">Not declared — effect unknown</span>' : i.map((l) => n(l.description || "Declared without a description")).join("<br>");
    return `<dt>${n(r)}</dt><dd>${o}</dd>`;
  }).join("");
  return `<dl class="console-explorer__effects" aria-label="${a(`Declared effects on ${e.label}`)}">${t}</dl>`;
}
function Lt(e, t) {
  const s = Ct(t.href, e.base), r = s ? `<a class="console-link" href="${a(s)}" data-explorer-usage-link>Open ${n(t.label)}<span aria-hidden="true"> →</span></a>` : '<span class="console-muted">No link available</span>';
  return `<li class="console-explorer__usage" data-surface-id="${a(t.surface_id)}"><div class="console-explorer__usage-head"><span class="console-explorer__usage-label">${n(t.label)}</span>${B(rt[t.kind])}</div>${Et(t)}<div class="console-explorer__links">${r}</div></li>`;
}
function Tt(e, t) {
  const s = `<p class="console-explorer__para console-muted">${n(St(t))}</p>`;
  return t.usages.length === 0 ? `${s}<p class="console-explorer__para" data-explorer-state="usage-unknown">No usage is declared. Impact on application features is unknown.</p>` : `${s}<ul class="console-explorer__usages">${t.usages.map((r) => Lt(e, r)).join("")}</ul>`;
}
function Pt(e, t, s) {
  const r = ce(t, s), i = s.key === e.scenario?.key, o = r && r.expected_outcomes.length > 0 ? `<div class="console-explorer__related"><span class="console-explorer__label">Expected outcomes (declared, not verified)</span>${C(r.expected_outcomes, "")}</div>` : "", l = i ? B("Selected", "info") : `<button type="button" class="console-btn console-btn--sm" data-explorer-action="scenario" data-scenario-key="${a(s.key)}" data-explorer-focus="${a(`scenario:${s.key}`)}">Explore this scenario</button>`;
  return `
    <li class="console-explorer__scenario" data-scenario-key="${a(s.key)}">
      <div class="console-explorer__usage-head"><span class="console-explorer__usage-label">${n(P(t, s))}</span>${j(s)}</div>
      <p class="console-explorer__para">${r?.summary ? n(r.summary) : d("No description provided.")}</p>
      ${o}
      <div class="console-explorer__scenario-foot">${l}</div>
    </li>
  `;
}
function Dt(e, t) {
  return e.dataset.scenarios.length === 0 ? `<p class="console-explorer__para">${d("No scenarios are available.")}</p>` : `<ul class="console-explorer__scenarios">${e.dataset.scenarios.map((s) => Pt(e, t, s)).join("")}</ul>`;
}
function At(e) {
  return e?.status !== "ready" ? u : e.value.provenance === "example" ? n("Example — declared by the provider, not observed") : e.value.provenance === "observed" ? n("Observed") : u;
}
function It(e) {
  return e?.status !== "ready" || e.value.completeness === "unknown" ? u : n({
    complete: "Complete",
    partial: "Partial — some details are missing",
    unknown: "Unknown"
  }[e.value.completeness]);
}
function Nt(e) {
  const t = e.selection, s = e.entry?.status === "ready" && e.entry.value.observed_at ? O(e.entry.value.observed_at, T) : u;
  return `<p class="console-explorer__para console-muted">Expected outcomes and catalog examples are declarations, not executed checks. Verification and coverage come from lifecycle evidence.</p>${K([
    ["Data shown", n(R[e.context])],
    ["Provenance", At(e.entry)],
    ["Completeness", It(e.entry)],
    ["Read", s],
    ["Lifecycle status", e.scenario?.statusLabel ? j(e.scenario) : u],
    ["Target", t?.target_id ? n(t.target_id) : u],
    ["Receipt", t?.receipt_id ? `<code class="console-kv__mono">${n(t.receipt_id)}</code>` : d("None — catalog example")],
    ["Content revision", t?.content_revision ? n(String(t.content_revision)) : d("None")],
    ["Generation", t?.generation !== void 0 ? n(String(t.generation)) : d("None")]
  ])}<div class="console-explorer__links"><button type="button" class="console-link" data-console-panel-link="verification">Verification evidence<span aria-hidden="true"> →</span></button><button type="button" class="console-link" data-console-panel-link="coverage">Coverage<span aria-hidden="true"> →</span></button></div>`;
}
function qt(e, t) {
  return e.configured ? e.drift ? U(e) : e.selection ? e.insights ? e.insights(t) : "" : `<div class="console-callout console-explorer__state" data-tone="info"><p>${n(D(e.context, e.scenario))}</p></div>` : E({
    kind: "unconfigured",
    status: 0
  });
}
function Mt(e) {
  const t = e.scenario?.selections.prepared, s = e.context === "active" ? `Active data is what ${e.selection?.target_id || "the target"} serves now: open the application itself to see it. Application preview opens a prepared receipt without activating it.` : "A catalog example is not prepared data. Application preview opens a prepared receipt without activating it.", r = t ? `<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="prepared" data-explorer-focus="preview:prepared">Show prepared receipt ${n(t.receipt_id || "")}</button></div>` : `<p>${n("This scenario has no prepared receipt yet. Prepare it to preview it in the application.")}</p>`;
  return `<div class="console-callout console-explorer__state" data-tone="info" data-preview-state="context"><p>${n(s)}</p>${r}</div>`;
}
function Ot(e) {
  return e.configured ? e.drift ? U(e) : e.selection ? e.selection.context !== "prepared" ? Mt(e) : e.appPreview ? e.appPreview() : "" : `<div class="console-callout console-explorer__state" data-tone="info"><p>${n(D(e.context, e.scenario))}</p></div>` : E({
    kind: "unconfigured",
    status: 0
  });
}
function Ft(e) {
  if (M(e.section)) return qt(e, e.section);
  if (e.section === "app-preview") return Ot(e);
  const t = x(e.entry), s = gt(e);
  switch (e.section) {
    case "about":
      return `${s}${$t(e, t)}`;
    case "scenarios":
      return `${s}${Dt(e, t)}`;
    case "evidence":
      return `${s}${Nt(e)}`;
    case "contents":
      return s || (t ? mt(e, t) : "");
    default:
      return s || (t ? Tt(e, t) : "");
  }
}
function Bt(e) {
  const t = (e.sections || S).find((s) => s.id === e.section)?.label || "Details";
  return `
    <nav class="console-explorer__crumbs" aria-label="Explorer"><button type="button" class="console-link" data-explorer-action="back" data-explorer-focus="back"><span aria-hidden="true">← </span>All datasets</button></nav>
    ${ht(e)}
    <div class="console-explorer__sections">
      ${ft(e)}
      <section class="console-json-panel console-explorer__section" role="tabpanel" id="${a(`${e.scope}-section`)}" aria-labelledby="${a(`${e.scope}-tab-${e.section}`)}" data-explorer-section-panel="${e.section}" data-explorer-focus="section-panel" tabindex="0">
        <h4 class="console-sr-only">${n(t)}</h4>
        <div class="console-explorer__section-body">${Ft(e)}</div>
      </section>
    </div>
  `;
}
var ue = "explore", Kt = /* @__PURE__ */ new Set([
  "datasets",
  "scenarios",
  "overview"
]);
function Z(e) {
  if (!e) return "";
  if (e.status === "ready") {
    const { observed_at: t, ...s } = e.value;
    return JSON.stringify(["ready", s]);
  }
  return e.status === "failed" ? JSON.stringify(["failed", e.failure.kind]) : "loading";
}
var I = 12, jt = 3, Ut = 48, Ht = 0;
function Wt(e) {
  typeof queueMicrotask == "function" ? queueMicrotask(e) : Promise.resolve().then(e);
}
function ee(e) {
  return typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(e) : e.replace(/["\\]/g, "\\$&");
}
function zt(e) {
  try {
    const t = new URL(e.location?.href || "").searchParams.get("selection");
    return t ? F(JSON.parse(t)) : null;
  } catch {
    return null;
  }
}
function Vt(e) {
  try {
    const t = new URL(e.location.href);
    if (!t.searchParams.has("selection")) return;
    t.searchParams.delete("selection"), e.defaultView?.history.replaceState(e.defaultView.history.state, "", `${t.pathname}${t.search}${t.hash}`);
  } catch {
  }
}
function Yt(e, t) {
  if (t.preview === !1) return null;
  const s = t.preview || {};
  if (s.transport) return s;
  const r = t.transport ? void 0 : s.routes || ke(e) || void 0;
  return r ? {
    ...s,
    routes: r
  } : null;
}
var Gt = class {
  constructor(e, t = {}) {
    this.entries = /* @__PURE__ */ new Map(), this.pending = /* @__PURE__ */ new Map(), this.stale = /* @__PURE__ */ new Set(), this.cleanup = [], this.runtime = null, this.catalog = [], this.catalogSignature = "", this.view = "catalog", this.datasetKey = "", this.scenarioKey = "", this.context = "catalog_example", this.section = "about", this.focusRequest = "", this.disposed = !1, this.rendering = !1, this.identityOpen = !1, this.insights = null, this.insightsLoading = !1, this.insightsFailed = !1, this.appPreview = null, this.previewLoading = !1, this.previewFailed = !1, this.deepLink = null, this.root = e;
    const s = t.transport ? null : we(e);
    this.configured = !!(t.transport || s), this.transport = t.transport || (s ? me(s) : Se), this.scope = `data-explorer-${Ht += 1}`, this.cardLimit = Math.max(1, Math.floor(t.cardLimit || I)), this.concurrency = Math.max(1, Math.floor(t.concurrency || jt)), this.previews = new Qe({
      root: e,
      scope: this.scope,
      transport: this.transport,
      configured: this.configured,
      update: (o) => this.update(o),
      fallbackFocus: (o) => this.container()?.querySelector(`[data-explorer-focus="${ee(o)}"]`) || this.container()?.querySelector("[data-explorer-section-panel]") || null
    }), this.renderer = () => this.renderForRuntime();
    const r = t.insights === !1 || t.insights?.transport || t.transport ? null : ye(e), i = t.insights ? t.insights : r ? { routes: r } : null;
    this.insightsSource = this.configured && i && (i.routes || i.transport) ? i : null, this.previewSource = this.configured ? Yt(e, t) : null, this.deepLink = this.configured ? zt(e.ownerDocument) : null;
  }
  attach(e) {
    this.disposed || this.runtime || (this.runtime = e, this.listen("click", (t) => this.handleClick(t)), this.listen("change", (t) => this.handleChange(t)), this.listen("keydown", (t) => this.handleKeydown(t)), this.listen("toggle", (t) => {
      const s = this.owned(t.target, '[data-explorer-disclosure="identity"]');
      s?.tagName === "DETAILS" && (this.identityOpen = s.open);
    }, !0), this.syncCatalog(), this.applyDeepLink(), this.update());
  }
  handleRuntimeChange(e) {
    if (!this.disposed) {
      if (e.state === "denied" || e.state === "disposed") {
        e.state === "denied" && (this.appPreview?.clear(!0), this.previewSource && Re(V(N(this.root)))), this.reset(), e.state === "disposed" && this.destroy();
        return;
      }
      if (!(e.state !== "ready" || !this.runtime)) {
        if (e.snapshot) {
          const t = this.syncCatalog();
          if (this.applyDeepLink()) return;
          this.entries.forEach((s, r) => {
            s.status !== "loading" && !this.pending.has(r) && this.stale.add(r);
          }), this.previews.markStale(this.drift() ? void 0 : this.selection()), this.insights?.markStale(), this.insights?.reconcile(), this.appPreview?.markStale(), t ? this.update() : this.container() && this.revalidateShown();
          return;
        }
        e.panels.some((t) => Kt.has(t)) && this.syncCatalog() && (this.insights?.reconcile(), this.update());
      }
    }
  }
  destroy() {
    this.disposed || (this.disposed = !0, this.reset(), this.insights = null, this.appPreview?.destroy(), this.appPreview = null, this.cleanup.splice(0).forEach((e) => e()), this.runtime = null);
  }
  forgetDescriptions() {
    this.pending.forEach((e) => e.abort()), this.pending.clear(), this.entries.clear(), this.stale.clear();
  }
  reset() {
    this.forgetDescriptions(), this.previews.clear(), this.insights?.clear(), this.appPreview?.clear(), this.catalog = [], this.catalogSignature = "", this.view = "catalog", this.datasetKey = "", this.scenarioKey = "", this.context = "catalog_example", this.pinned = void 0, this.section = "about";
  }
  syncCatalog() {
    if (!this.runtime || this.runtime.getState() !== "ready") return !1;
    const e = Ne(this.runtime.getPanelData("datasets"), this.runtime.getPanelData("scenarios"), this.runtime.getPanelData("overview")), t = JSON.stringify(e);
    return t === this.catalogSignature ? !1 : (this.catalog = e, this.catalogSignature = t, this.reconcileSelection(), !0);
  }
  reconcileSelection() {
    if (this.view === "details") {
      if (!this.dataset()) {
        this.view = "catalog", this.pinned = void 0, this.previews.clear(), this.insights?.clear(), this.appPreview?.show(void 0), this.focusRequest = "catalog";
        return;
      }
      this.drift() && this.pinned && (this.cancel(this.pinned), this.entries.delete(h(this.pinned)), this.previews.clear(), this.insights?.clear(), this.appPreview?.show(void 0));
    }
  }
  applyDeepLink() {
    const e = this.deepLink;
    if (!e || !this.runtime || this.runtime.getState() !== "ready") return !1;
    this.deepLink = null, Vt(this.root.ownerDocument);
    const t = this.catalog.find((r) => r.provider === e.dataset.provider && r.datasetId === e.dataset.id && r.version === e.dataset.version && r.digest.length > 0 && e.dataset.digest.startsWith(r.digest)), s = t?.scenarios.find((r) => k(r).some((i) => {
      const o = r.selections[i];
      return o?.scenario.id === e.scenario.id && o.scenario.version === e.scenario.version && o.scenario.profile_hash === e.scenario.profile_hash;
    }));
    return !t || !s ? !1 : (this.view = "details", this.datasetKey = t.key, this.scenarioKey = s.key, this.context = e.context, this.pinned = e, this.insights?.show(e), this.appPreview?.show(e), this.section = e.context === "prepared" && this.previewSource ? "app-preview" : "about", this.focusRequest = this.section === "app-preview" ? "section-panel" : "title", this.runtime.selectPanel(ue), this.update(), !0);
  }
  drift() {
    if (this.view !== "details" || !this.pinned) return "";
    const e = this.currentSelection();
    return e ? h(e) === h(this.pinned) ? "" : "changed" : "unavailable";
  }
  pin() {
    this.pinned = this.currentSelection(), this.insights?.show(this.pinned), this.appPreview?.show(this.pinned);
  }
  sections() {
    return tt(!!this.insightsSource, !!this.previewSource);
  }
  dataset() {
    return this.catalog.find((e) => e.key === this.datasetKey);
  }
  scenario() {
    return this.dataset()?.scenarios.find((e) => e.key === this.scenarioKey);
  }
  selection() {
    return this.view === "details" ? this.pinned : void 0;
  }
  currentSelection() {
    return this.scenario()?.selections[this.context];
  }
  entryFor(e) {
    return e ? this.entries.get(h(e)) : void 0;
  }
  load(e, t = !1) {
    const s = h(e);
    if (!t && (this.entries.has(s) || this.pending.has(s))) return;
    this.pending.get(s)?.abort();
    const r = new AbortController();
    this.pending.set(s, r), this.store(s, { status: "loading" }), this.transport.metadata(e, r.signal).then((i) => {
      this.disposed || r.signal.aborted || this.pending.get(s) !== r || (this.pending.delete(s), this.store(s, i.ok ? {
        status: "ready",
        value: i.value
      } : {
        status: "failed",
        failure: i.failure
      }), this.update());
    });
  }
  store(e, t) {
    this.entries.delete(e), this.entries.set(e, t);
    for (const s of this.entries.keys()) {
      if (this.entries.size <= Ut) break;
      this.pending.has(s) || this.entries.delete(s);
    }
  }
  shownSelections() {
    if (this.view === "details") {
      const e = this.drift() ? void 0 : this.selection();
      return e ? [e] : [];
    }
    return this.catalog.slice(0, this.cardLimit).map((e) => y(e)?.selections.catalog_example).filter((e) => !!e);
  }
  revalidateShown() {
    this.configured && this.shownSelections().forEach((e) => {
      const t = h(e);
      !this.stale.has(t) || this.pending.has(t) || (this.stale.delete(t), this.reauthorize(e, t));
    }), this.view === "details" && !this.drift() && (this.previews.revalidate(), M(this.section) && this.insights?.revalidate(this.section), this.section === "app-preview" && this.appPreview?.revalidate());
  }
  reauthorize(e, t) {
    const s = new AbortController();
    this.pending.set(t, s), this.transport.metadata(e, s.signal).then((r) => {
      if (this.disposed || s.signal.aborted || this.pending.get(t) !== s || (this.pending.delete(t), !r.ok && !oe.has(r.failure.kind))) return;
      const i = r.ok ? {
        status: "ready",
        value: r.value
      } : {
        status: "failed",
        failure: r.failure
      }, o = Z(this.entries.get(t)) === Z(i);
      this.store(t, i), o || this.update();
    });
  }
  cancel(e) {
    if (!e) return;
    const t = h(e), s = this.pending.get(t);
    s && (s.abort(), this.pending.delete(t), this.entries.delete(t));
  }
  loadCards() {
    if (!(!this.configured || this.view !== "catalog"))
      for (const e of this.catalog.slice(0, this.cardLimit)) {
        if (this.pending.size >= this.concurrency) return;
        const t = y(e)?.selections.catalog_example;
        t && this.load(t);
      }
  }
  loadDetails() {
    const e = this.selection();
    this.configured && e && !this.drift() && this.load(e);
  }
  renderForRuntime() {
    this.rememberFocus(), this.rendering = !0;
    try {
      return this.runtime && this.syncCatalog(), this.markup();
    } finally {
      this.rendering = !1, Wt(() => this.afterRender());
    }
  }
  markup() {
    return !this.runtime || this.runtime.getState() !== "ready" ? '<div class="console-explorer" data-data-explorer data-explorer-view="loading"><div class="console-explorer__loading" role="status" aria-busy="true">Loading datasets…</div></div>' : `<div class="console-explorer" data-data-explorer data-explorer-view="${this.view}">${this.view === "details" && this.dataset() ? this.detailsMarkup() : this.catalogMarkup()}</div>`;
  }
  catalogMarkup() {
    const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Set();
    return this.catalog.forEach((s) => {
      const r = y(s)?.selections.catalog_example;
      e.set(s.key, this.entryFor(r)), r && t.add(s.key);
    }), lt({
      scope: this.scope,
      configured: this.configured,
      datasets: this.catalog,
      cards: e,
      explorable: t,
      limit: this.cardLimit
    });
  }
  detailsMarkup() {
    const e = this.dataset(), t = this.selection(), s = this.drift();
    return Bt({
      scope: this.scope,
      configured: this.configured,
      dataset: e,
      scenario: this.scenario(),
      scenarioKey: this.scenarioKey,
      context: this.context,
      selection: t,
      drift: s,
      current: this.currentSelection(),
      section: this.section,
      entry: s ? void 0 : this.entryFor(t),
      base: this.root.ownerDocument.location?.href || "http://localhost/",
      identityOpen: this.identityOpen,
      preview: (r) => this.previews.render(t, r),
      sections: this.sections(),
      insights: (r) => this.insightsMarkup(r, t),
      appPreview: () => this.appPreviewMarkup(t)
    });
  }
  appPreviewMarkup(e) {
    if (this.appPreview) {
      this.appPreview.show(e);
      const t = this.scenario();
      return this.appPreview.render({
        title: this.selectionTitle(e),
        status: nt(t),
        activeReceipt: !!e.receipt_id && t?.selections.active?.receipt_id === e.receipt_id,
        base: this.root.ownerDocument.location?.href || "http://localhost/"
      });
    }
    return this.previewFailed ? '<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-explorer-failure="preview-module"><p>Application preview could not be loaded.</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="preview-load" data-explorer-focus="preview-load">Try again</button></div></div>' : '<div class="console-explorer__loading" role="status" aria-busy="true">Loading application preview…</div>';
  }
  ensureAppPreview() {
    const e = this.previewSource;
    this.appPreview || this.previewLoading || !e || this.disposed || (this.previewLoading = !0, this.previewFailed = !1, import("./data-preview.js").then((t) => {
      this.previewLoading = !1, !this.disposed && (this.appPreview = t.createDataPreview({
        generate: xe,
        storageScope: V(N(this.root)),
        ...e,
        scope: `${this.scope}-preview`,
        update: (s) => this.update(s)
      }), this.update());
    }, () => {
      this.previewLoading = !1, this.previewFailed = !0, this.update();
    }));
  }
  loadAppPreview() {
    const e = this.selection();
    if (!(this.view !== "details" || this.section !== "app-preview" || !e || e.context !== "prepared" || this.drift())) {
      if (!this.appPreview) {
        this.ensureAppPreview();
        return;
      }
      this.appPreview.show(e), this.appPreview.load();
    }
  }
  insightsMarkup(e, t) {
    return this.insights ? (this.insights.show(t), this.insights.render(e)) : this.insightsFailed ? '<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-explorer-failure="insights-module"><p>Insights could not be loaded.</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="insights-load" data-explorer-focus="insights-load">Try again</button></div></div>' : '<div class="console-explorer__loading" role="status" aria-busy="true">Loading insights…</div>';
  }
  selectionTitle(e) {
    const t = this.catalog.find((i) => i.provider === e.dataset.provider && i.datasetId === e.dataset.id && i.version === e.dataset.version), s = t?.scenarios.find((i) => i.scenarioId === e.scenario.id && i.version === e.scenario.version);
    if (!t || !s) return `${e.scenario.id} v${e.scenario.version}`;
    const r = t.key === this.datasetKey && !this.drift() ? x(this.entryFor(this.selection())) : void 0;
    return P(r, s);
  }
  ensureInsights() {
    const e = this.insightsSource;
    this.insights || this.insightsLoading || !e || this.disposed || (this.insightsLoading = !0, this.insightsFailed = !1, import("./data-insights.js").then((t) => {
      this.insightsLoading = !1, !this.disposed && (this.insights = t.createDataInsights({
        ...e,
        scope: `${this.scope}-insights`,
        update: (s) => this.update(s),
        dataset: () => this.dataset(),
        activeSelection: (s) => Ae(this.runtime?.getPanelData("overview"), s),
        title: (s) => this.selectionTitle(s)
      }), this.update());
    }, () => {
      this.insightsLoading = !1, this.insightsFailed = !0, this.update();
    }));
  }
  loadInsights() {
    if (!(this.view !== "details" || !M(this.section) || !this.selection() || this.drift())) {
      if (!this.insights) {
        this.ensureInsights();
        return;
      }
      this.insights.show(this.selection()), this.insights.load(this.section);
    }
  }
  container() {
    return Array.from(this.root.querySelectorAll("[data-console-panel]")).find((e) => e.closest("[data-console-root]") === this.root)?.querySelector(":scope > [data-data-explorer]") || null;
  }
  update(e = "") {
    e && (this.focusRequest = e);
    const t = this.container();
    if (!t || this.disposed || this.rendering) return;
    this.rememberFocus();
    const s = this.root.ownerDocument.createElement("template");
    s.innerHTML = this.markup();
    const r = s.content.firstElementChild;
    r && t.replaceWith(r), this.afterRender();
  }
  afterRender() {
    this.disposed || !this.container() || (this.restoreFocus(), this.loadDetails(), this.loadInsights(), this.loadAppPreview(), this.revalidateShown(), this.loadCards());
  }
  rememberFocus() {
    if (this.focusRequest) return;
    const e = this.root.ownerDocument.activeElement, t = this.container();
    e instanceof HTMLElement && t?.contains(e) && (this.focusRequest = e.closest("[data-explorer-focus]")?.getAttribute("data-explorer-focus") || "");
  }
  restoreFocus() {
    const e = this.focusRequest;
    if (this.focusRequest = "", !e) return;
    const t = this.container(), s = (e === "catalog" ? t?.querySelector(".console-explorer__catalog h3") : t?.querySelector(`[data-explorer-focus="${ee(e)}"]`)) || (this.view === "details" ? t?.querySelector("[data-explorer-section-panel]") : null);
    s && (e === "catalog" && s.setAttribute("tabindex", "-1"), s.focus());
  }
  listen(e, t, s = !1) {
    this.root.addEventListener(e, t, s), this.cleanup.push(() => this.root.removeEventListener(e, t, s));
  }
  owned(e, t) {
    const s = e instanceof Element ? e.closest(t) : null;
    return s && (this.container()?.contains(s) || this.previews.ownsDrawerElement(s)) ? s : null;
  }
  handleClick(e) {
    const t = this.owned(e.target, "[data-insights-action]");
    if (t) {
      e.preventDefault(), this.insights?.handleClick(t);
      return;
    }
    const s = this.owned(e.target, "[data-preview-action]");
    if (s) {
      e.preventDefault(), this.appPreview?.handleClick(s);
      return;
    }
    const r = this.owned(e.target, "[data-explorer-section]");
    if (r) {
      this.selectSection(r.dataset.explorerSection || "", !0);
      return;
    }
    const i = this.owned(e.target, "[data-explorer-action]");
    if (!i || (e.preventDefault(), i.getAttribute("aria-disabled") === "true")) return;
    const o = i.dataset.explorerAction || "";
    if (o.startsWith("page-") || o.startsWith("samples") || o === "related") {
      this.handleRecordControl(o, i);
      return;
    }
    switch (o) {
      case "open":
        this.open(i.dataset.datasetKey || "");
        break;
      case "back":
        this.back();
        break;
      case "more":
        this.showMore();
        break;
      case "scenario":
        this.selectScenario(i.dataset.scenarioKey || "", !0);
        break;
      case "retry":
        this.retry();
        break;
      case "refresh":
        this.refreshSelection();
        break;
      case "insights-load":
        this.focusRequest = `section:${this.section}`, this.ensureInsights(), this.update();
        break;
      case "preview-load":
        this.focusRequest = `section:${this.section}`, this.ensureAppPreview(), this.update();
        break;
      case "prepared":
        this.selectContext("prepared", "section-panel");
    }
  }
  handleRecordControl(e, t) {
    const s = this.selection();
    if (!s || this.view !== "details") return;
    const r = t.dataset.entityId || "", i = e === "page-next" ? 1 : e === "page-previous" ? -1 : 0;
    if (e.startsWith("page-") && t.hasAttribute("data-related-page")) this.previews.turnRelated(i);
    else if (e.startsWith("page-")) this.previews.turn(s, r, i);
    else if (e === "samples") this.previews.open(s, r);
    else if (e === "samples-hide") this.previews.hide(s, r);
    else {
      const o = x(this.entryFor(s));
      o && this.previews.openRelated(s, o, r, t.dataset.recordKey || "", t.dataset.relationshipId || "", t);
    }
  }
  handleChange(e) {
    const t = this.owned(e.target, "[data-insights-control]");
    if (t) {
      this.insights?.handleChange(t);
      return;
    }
    const s = this.owned(e.target, "[data-explorer-control]");
    s && (s instanceof HTMLSelectElement && s.dataset.explorerControl === "scenario" ? this.selectScenario(s.value, !1) : s instanceof HTMLInputElement && s.dataset.explorerControl === "context" && s.checked && this.selectContext(s.value));
  }
  handleKeydown(e) {
    if (!this.owned(e.target, "[data-explorer-section]")) return;
    const t = this.sections().map((o) => o.id), s = t.indexOf(this.section), r = {
      ArrowRight: s + 1,
      ArrowLeft: s - 1,
      Home: 0,
      End: t.length - 1
    };
    if (!(e.key in r)) return;
    e.preventDefault();
    const i = (r[e.key] + t.length) % t.length;
    this.selectSection(t[i], !0);
  }
  open(e) {
    const t = this.catalog.find((s) => s.key === e);
    t && (this.view = "details", this.datasetKey = t.key, this.scenarioKey = (y(t) || t.scenarios[0])?.key || "", this.context = k(this.scenario())[0] || "catalog_example", this.pin(), this.section = "about", this.focusRequest = "title", this.update());
  }
  back() {
    this.cancel(this.selection()), this.previews.clear(), this.insights?.clear(), this.appPreview?.show(void 0);
    const e = this.datasetKey;
    this.pinned = void 0, this.view = "catalog", this.focusRequest = e ? `open:${e}` : "catalog", this.update();
  }
  showMore() {
    this.cardLimit += I;
    const e = this.catalog[this.cardLimit - I];
    this.focusRequest = e ? `open:${e.key}` : "", this.update();
  }
  selectScenario(e, t) {
    const s = this.dataset()?.scenarios.find((i) => i.key === e);
    if (!s || s.key === this.scenarioKey && !this.drift()) return;
    this.cancel(this.selection()), this.previews.clear(), this.scenarioKey = s.key;
    const r = k(s);
    r.includes(this.context) || (this.context = r[0] || "catalog_example"), this.pin(), this.focusRequest = t ? "title" : "scenario", this.update();
  }
  selectContext(e, t = `context:${e}`) {
    e === this.context && !this.drift() || !this.scenario()?.selections[e] || (this.cancel(this.selection()), this.previews.clear(), this.context = e, this.pin(), this.focusRequest = t, this.update());
  }
  selectSection(e, t) {
    const s = this.sections().find((r) => r.id === e);
    s && (this.section = s.id, this.focusRequest = t ? `section:${s.id}` : "", this.update());
  }
  retry() {
    const e = this.selection();
    !e || this.drift() || (this.focusRequest = "title", this.load(e, !0), this.previews.markStale(e), this.previews.revalidate(), this.update());
  }
  refreshSelection() {
    this.focusRequest = "title";
    const e = () => {
      if (this.disposed || this.view !== "details" || !this.dataset()) return;
      const t = this.pinned, s = this.dataset();
      this.scenario() || (this.scenarioKey = (y(s) || s.scenarios[0])?.key || "");
      const r = k(this.scenario());
      r.includes(this.context) || (this.context = r[0] || "catalog_example");
      const i = this.currentSelection();
      !t || !i || h(t) !== h(i) ? (this.cancel(t), t && this.entries.delete(h(t)), this.previews.clear()) : (this.entryFor(i)?.status === "failed" && this.load(i, !0), this.insights?.refreshFailed(), this.appPreview?.refreshFailed()), this.pinned = i, this.insights?.show(i), this.appPreview?.show(i), this.focusRequest = "title", this.update();
    };
    if (!this.runtime) {
      e();
      return;
    }
    this.runtime.refresh().then(e);
  }
};
function Xt(e, t = {}) {
  return new Gt(e, t);
}
var ns = "data", L = /* @__PURE__ */ new WeakMap();
function Jt(e, t) {
  return (t.bootstrap || N(e))?.console_id === "data" && !t.display && !e.hasAttribute("data-console-display");
}
function Qt(e, t = {}) {
  const s = ge(e);
  if (s) return s;
  const { explorer: r, ...i } = t;
  if (!Jt(e, t)) return z(e, i);
  const o = Xt(e, r), l = z(e, {
    ...i,
    renderers: {
      ...i.renderers,
      [ue]: o.renderer
    },
    onChange: (c) => {
      o.handleRuntimeChange(c), i.onChange?.(c);
    }
  });
  return l ? (L.set(e, o), o.attach(l), l) : (o.destroy(), null);
}
function Zt(e) {
  _e(e), L.get(e)?.destroy(), L.delete(e);
}
function os(e) {
  return L.get(e) || null;
}
$e({
  mount: (e) => {
    Qt(e);
  },
  dispose: Zt
});
export {
  ns as DATA_CONSOLE_ID,
  ue as DATA_EXPLORE_PANEL,
  Gt as DataExplorer,
  Xt as createDataExplorer,
  _e as disposeConsole,
  Zt as disposeDataConsole,
  os as getDataExplorer,
  ge as getMountedConsole,
  Qt as mountDataConsole
};

//# sourceMappingURL=data.js.map