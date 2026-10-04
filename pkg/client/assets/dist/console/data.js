import { escapeAttribute as a, escapeHTML as o } from "../shared/html.js";
import { C as Q, b as ve, i as Z, o as ge } from "../chunks/rich-5UU6Sxl8.js";
import { a as H, i as be, l as _e, r as $e, s as q, t as xe, u as ye } from "../chunks/auto-mount-D2gPkwX5.js";
import { a as we, g as u, i as ke, l as ee, m as F, o as me, r as Se, s as Ce, u as S, v as p } from "../chunks/transport-DVxB6IT1.js";
import { r as W, t as Re } from "../chunks/keys-CcTTWa6z.js";
function M(e) {
  return Array.isArray(e) ? e.filter(S) : S(e) ? [e] : [];
}
function Le(e) {
  return typeof e == "number" && Number.isSafeInteger(e) && e >= 0 ? e : 0;
}
var Ee = ["catalog_example", "prepared"];
function Te(e) {
  const t = {}, s = S(e.explore) ? e.explore : {};
  return Ee.forEach((i) => {
    const r = F(s[i]);
    r && r.context === i && (t[i] = r);
  }), t;
}
function Pe(e, t) {
  const s = e.dataset;
  return s.provider === t.provider && s.id === t.datasetId && s.version === t.version && t.digest.length > 0 && s.digest.startsWith(t.digest);
}
function De(e) {
  const t = p(e.key), s = p(e.dataset_key);
  if (!t || !s) return null;
  const i = e.content_revision;
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
    contentRevision: typeof i == "number" && Number.isSafeInteger(i) && i > 0 ? i : null,
    selections: Te(e)
  };
}
function Ae(e) {
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
    declaredScenarios: Le(e.scenarios),
    scenarios: []
  } : null;
}
function te(e) {
  const t = M(e)[0] || {};
  return (Array.isArray(t.targets) ? t.targets.filter(S) : []).map((s) => F(s.explore_active)).filter((s) => s !== null && s.context === "active");
}
function Ie(e, t) {
  return te(e).find((s) => s.target_id === t);
}
function Ne(e, t) {
  const s = e.selections.prepared || e.selections.catalog_example;
  if (!e.active || !s) return;
  const i = t.find((r) => r.target_id === s.target_id && r.receipt_id === e.receiptId && r.scenario.id === s.scenario.id && r.scenario.version === s.scenario.version && r.scenario.profile_hash === s.scenario.profile_hash && r.dataset.digest === s.dataset.digest);
  i && (e.selections.active = i);
}
function qe(e, t, s) {
  const i = te(s), r = [], n = /* @__PURE__ */ new Map();
  return M(e).forEach((l) => {
    const c = Ae(l);
    c && !n.has(c.key) && (n.set(c.key, c), r.push(c));
  }), M(t).forEach((l) => {
    const c = De(l), v = c ? n.get(c.datasetKey) : void 0;
    !c || !v || v.scenarios.some((h) => h.key === c.key) || (Ne(c, i), ee.forEach((h) => {
      const g = c.selections[h];
      g && !Pe(g, v) && delete c.selections[h];
    }), v.scenarios.push(c));
  }), r;
}
function y(e) {
  return e.scenarios.find((t) => t.selections.catalog_example);
}
function k(e) {
  return e ? ee.filter((t) => !!e.selections[t]) : [];
}
var z = 240, A = {
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
}, Me = /* @__PURE__ */ new Set([
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "failed",
  "canceled"
]), Oe = /* @__PURE__ */ new Set([
  "stale",
  "gone",
  "invalid"
]);
function Fe(e) {
  return e.length <= z ? o(e) : `<span title="${a(e)}">${o(e.slice(0, z))}…</span>`;
}
function w(e, t, s) {
  return `<span class="console-explorer__cell console-explorer__cell--${e}" title="${a(s)}">${o(t)}<span class="console-sr-only"> (${o(s)})</span></span>`;
}
function Be(e, t) {
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
  return s === null ? w("null", "null", "no value recorded") : s === "" ? w("empty", "Empty", "empty text") : typeof s == "boolean" ? `<code class="console-kv__mono">${s ? "true" : "false"}</code>` : typeof s == "number" && (t.type === "integer" || t.type === "number") ? `<span class="console-explorer__number">${o(s.toLocaleString())}</span>` : Fe(String(s));
}
function Ke(e) {
  const t = e.unit ? `<span class="console-explorer__unit">${o(e.unit)}</span>` : "", s = [e.description, e.type].filter(Boolean).join(" · ");
  return `<th scope="col" title="${a(s)}"><span class="console-explorer__column">${o(e.label)}</span>${t}</th>`;
}
function je(e, t, s, i) {
  return i.map((r) => {
    const n = `related:${e.id}:${t}:${r.id}`;
    return `<button type="button" class="console-btn console-btn--sm" data-explorer-action="related" data-entity-id="${a(e.id)}" data-record-key="${a(t)}" data-relationship-id="${a(r.id)}" data-explorer-focus="${a(n)}" aria-describedby="${a(s)}">${o(r.label)}</button>`;
  }).join("");
}
function Ue(e, t, s, i, r) {
  const n = s.columns, l = i.length > 0, c = `${n.map(Ke).join("")}${l ? '<th scope="col">Related</th>' : ""}`, v = s.rows.map((h, g) => {
    const b = `${e}-row-${t.id}-${g}`, _ = n.map(($, fe) => {
      const j = Be(h.cells[$.id], $), U = a($.unit ? `${$.label} (${$.unit})` : $.label);
      return fe === 0 ? `<td data-label="${U}" id="${a(b)}">${j}</td>` : `<td data-label="${U}">${j}</td>`;
    }).join(""), he = l ? `<td data-label="Related" class="console-explorer__related-cell">${je(t, h.record_key, b, i)}</td>` : "";
    return `<tr data-record-key="${a(h.record_key)}">${_}${he}</tr>`;
  }).join("");
  return `<div class="console-explorer__table-wrap"><table class="console-table console-explorer__table console-explorer__samples"><caption class="console-sr-only">${o(r)}</caption><thead><tr>${c}</tr></thead><tbody>${v}</tbody></table></div>`;
}
function He(e) {
  return (e.sampling_method ? `Sampling: ${e.sampling_method}. ` : "") + (e.provenance === "observed" ? "Observed records." : e.provenance === "example" ? "Example records declared by the provider, not observed data." : "Provenance unknown.");
}
function We(e) {
  const t = e.value.rows.length;
  if (t === 0) return "No records";
  const s = e.start + 1, i = e.start + t, r = e.value.total;
  return r === null ? `Records ${s.toLocaleString()}–${i.toLocaleString()}; total unknown` : `Records ${s.toLocaleString()}–${i.toLocaleString()} of ${r.toLocaleString()}`;
}
function se(e, t, s, i) {
  const r = (n) => n ? "" : ' aria-disabled="true"';
  return `<div class="console-explorer__pager" role="group" aria-label="Pages">
    <button type="button" class="console-btn console-btn--sm" data-explorer-action="page-previous" ${s} data-explorer-focus="${a(`${i}:previous`)}"${r(e)}>Previous</button>
    <button type="button" class="console-btn console-btn--sm" data-explorer-action="page-next" ${s} data-explorer-focus="${a(`${i}:next`)}"${r(t)}>Next</button>
  </div>`;
}
function ze(e, t, s) {
  const i = e.page > 0;
  return !i && !e.hasNext ? "" : se(i, e.hasNext, t, s);
}
function Ve(e, t) {
  switch (e.state) {
    case "unsupported":
      return '<div class="console-callout" data-tone="info" data-explorer-sample-state="unsupported"><p>This provider does not offer sample records for this selection.</p></div>';
    case "suppressed":
      return '<div class="console-callout" data-tone="info" data-explorer-sample-state="suppressed"><p>Records for this selection are hidden by policy.</p></div>';
    default:
      return e.rows.length === 0 ? `<p class="console-explorer__para" data-explorer-sample-state="empty">No ${o(t)} records in this selection.</p>` : "";
  }
}
function Ye(e) {
  return e.completeness === "partial" ? '<div class="console-callout" data-tone="warning"><p>Partial preview: some records or values were left out.</p></div>' : e.completeness === "unknown" ? '<p class="console-explorer__para console-muted" data-explorer-completeness="unknown">Completeness unknown: the provider does not say whether records or values were left out.</p>' : "";
}
function Ge(e) {
  return e.observed_at ? ` Read ${Z(e.observed_at, Q)}.` : "";
}
function Xe(e, t, s) {
  const i = A[e.kind] || A.failed, r = Me.has(e.kind) ? `<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="page-retry" ${t} data-explorer-focus="${a(`${s}:retry`)}">Try again</button></div>` : Oe.has(e.kind) ? '<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button></div>' : "";
  return `<div class="console-callout console-explorer__state" data-tone="${e.kind === "denied" || e.kind === "expired" ? "error" : "warning"}" role="alert" data-explorer-failure="${a(e.kind in A ? e.kind : "failed")}"><p>${o(i)}</p>${r}</div>`;
}
function ie(e, t, s, i, r, n) {
  if (s.status === "loading") {
    const b = '<div class="console-explorer__loading" role="status" aria-busy="true">Loading records…</div>';
    return s.paged ? `${b}<div class="console-explorer__pager-row"><span></span>${se(!1, !1, r, n)}</div>` : b;
  }
  if (s.status === "failed") return Xe(s.failure, r, n);
  const l = s.value, c = Ve(l, t.label), v = l.state === "available" || l.state === "empty", h = v && l.rows.length > 0 ? Ue(e, t, l, i, `${t.label} records`) : "", g = v && l.rows.length > 0 ? `<div class="console-explorer__pager-row"><span class="console-muted" role="status">${o(We(s))}</span>${ze(s, r, n)}</div>` : "";
  return `<p class="console-explorer__para console-muted">${o(He(l))}${Ge(l)}</p>${Ye(l)}${c}${h}${g}`;
}
function Je(e, t, s, i) {
  const r = `data-entity-id="${a(t.id)}"`, n = `samples:${t.id}`;
  if (!i) return "";
  if (!s) return `<div class="console-explorer__preview-toggle"><button type="button" class="console-btn console-btn--sm" data-explorer-action="samples" ${r} data-explorer-focus="${a(`${n}:open`)}">Preview ${o(t.label)} records</button><span class="console-muted">Up to 25 representative records for the data shown above. Reading never prepares or changes data.</span></div>`;
  const l = t.relationships;
  return `
    <section class="console-explorer__preview" aria-labelledby="${a(`${e}-preview-${t.id}`)}" data-explorer-preview="${a(t.id)}">
      <div class="console-explorer__preview-head">
        <h5 class="console-explorer__label" id="${a(`${e}-preview-${t.id}`)}">Sample ${o(t.label)} records</h5>
        <button type="button" class="console-btn console-btn--sm console-btn--ghost" data-explorer-action="samples-hide" ${r} data-explorer-focus="${a(`${n}:hide`)}">Hide records</button>
      </div>
      ${ie(e, t, s, l, r, n)}
    </section>
  `;
}
function V(e, t, s, i, r) {
  const n = s || t;
  return `
    <div class="console-drawer__body console-explorer__related-body" data-explorer-related-body>
      <p class="console-explorer__para console-muted">Declared ${o(n.label)} records related to ${o(t.label)} record <code class="console-kv__mono">${o(i)}</code>. One level only.</p>
      ${ie(e, n, r, [], "data-related-page", "related")}
    </div>
  `;
}
var re = /* @__PURE__ */ new Set([
  "denied",
  "expired",
  "gone",
  "stale",
  "invalid",
  "unconfigured"
]);
function Y(e) {
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
function Qe(e) {
  return typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(e) : e.replace(/["\\]/g, "\\$&");
}
var Ze = class {
  constructor(e) {
    this.pages = /* @__PURE__ */ new Map(), this.related = null, this.relatedSequence = 0, this.samplesRead = (t, s, i) => this.host.transport.samples({
      selection: t.selection,
      entityId: t.entityId,
      cursor: s,
      limit: 25
    }, i), this.relatedRead = (t, s, i) => {
      const r = t, n = r.source.relationships.find((l) => l.id === r.relationshipId);
      return this.host.transport.related({
        selection: t.selection,
        entityId: t.entityId,
        cursor: s,
        limit: 25,
        recordKey: r.recordKey,
        relationshipId: r.relationshipId,
        relatedEntityId: n?.entity_id || t.entityId
      }, i);
    }, this.host = e;
  }
  key(e, t) {
    return `${u(e)}\0${t}`;
  }
  render(e, t) {
    const s = e ? this.pages.get(this.key(e, t.id))?.page : void 0;
    return Je(this.host.scope, t, s, this.host.configured && !!e);
  }
  open(e, t) {
    const s = this.key(e, t);
    if (this.pages.has(s) || !this.host.configured) return;
    const i = {
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
    this.pages.set(s, i), this.load(i, 0, this.samplesRead, () => this.host.update(`samples:${t}:hide`));
  }
  hide(e, t) {
    const s = this.key(e, t);
    this.pages.get(s)?.controller?.abort(), this.pages.delete(s), this.host.update(`samples:${t}:open`);
  }
  turn(e, t, s) {
    const i = this.pages.get(this.key(e, t));
    if (!i) return;
    const r = i.page.page + s, n = `samples:${t}:${s < 0 ? "previous" : s > 0 ? "next" : "retry"}`;
    r < 0 || r >= i.cursors.length || this.load(i, r, this.samplesRead, () => this.host.update(n));
  }
  openRelated(e, t, s, i, r, n) {
    const l = t.entities.find((_) => _.id === s), c = l?.relationships.find((_) => _.id === r);
    if (!l || !c || !this.host.configured) return;
    this.closeRelated(!1);
    const v = t.entities.find((_) => _.id === c.entity_id), h = {
      status: "loading",
      page: 0,
      start: 0
    };
    this.relatedSequence += 1;
    const g = new _e({
      root: this.host.root,
      id: `${this.host.scope}-related-${this.relatedSequence}`,
      panelID: "explore",
      actionID: "related",
      title: c.label,
      eyebrow: "Related records",
      body: V(this.host.scope, l, v, i, h),
      invoker: n,
      fallbackFocus: () => this.host.fallbackFocus(`related:${s}:${i}:${r}`),
      onClose: () => {
        this.related?.drawer === g && (this.related.controller?.abort(), this.related = null);
      }
    }), b = {
      selection: e,
      entityId: s,
      cursors: [""],
      starts: [0],
      page: h,
      controller: null,
      source: l,
      target: v,
      recordKey: i,
      relationshipId: r,
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
    const t = e ? u(e) : "";
    this.pages.forEach((i, r) => {
      if (u(i.selection) !== t) {
        i.controller?.abort(), this.pages.delete(r);
        return;
      }
      i.stale = !0;
    });
    const s = this.related;
    s && u(s.selection) === t ? s.stale = !0 : this.closeRelated(!1);
  }
  revalidate() {
    this.pages.forEach((e) => this.revalidatePage(e, this.samplesRead, () => this.host.update())), this.related && this.revalidatePage(this.related, this.relatedRead, () => this.updateRelated());
  }
  revalidatePage(e, t, s) {
    if (!e.stale || e.controller || e.page.status === "loading") return;
    e.stale = !1;
    const i = e.page.page, r = e.page, n = new AbortController();
    e.controller = n, t(e, e.cursors[i] ?? "", n.signal).then((l) => {
      if (!(n.signal.aborted || e.controller !== n || !this.isCurrent(e))) {
        if (e.controller = null, !l.ok) {
          if (!re.has(l.failure.kind)) return;
          e.page = {
            status: "failed",
            page: i,
            start: r.start,
            failure: l.failure
          }, s();
          return;
        }
        r.status === "ready" && Y(r.value) === Y(l.value) || (this.applyPage(e, i, l.value), s());
      }
    });
  }
  isCurrent(e) {
    return e === this.related ? !0 : this.pages.get(this.key(e.selection, e.entityId)) === e;
  }
  load(e, t, s, i) {
    e.stale = !1, e.controller?.abort();
    const r = new AbortController();
    e.controller = r;
    const n = e.page.status === "ready" && (e.page.page > 0 || e.page.hasNext);
    e.page = {
      status: "loading",
      page: t,
      start: e.starts[t] ?? 0,
      paged: n
    }, i(), s(e, e.cursors[t] ?? "", r.signal).then((l) => {
      r.signal.aborted || e.controller !== r || !this.isCurrent(e) || (e.controller = null, l.ok ? this.applyPage(e, t, l.value) : e.page = {
        status: "failed",
        page: t,
        start: e.starts[t] ?? 0,
        failure: l.failure
      }, i());
    });
  }
  applyPage(e, t, s) {
    const i = e.starts[t] ?? 0, r = s.next_cursor;
    e.cursors = e.cursors.slice(0, t + 1), e.starts = e.starts.slice(0, t + 1), r && (e.cursors.push(r), e.starts.push(i + s.rows.length)), e.page = {
      status: "ready",
      page: t,
      start: i,
      value: s,
      hasNext: !!r
    };
  }
  updateRelated() {
    const e = this.related;
    if (!e || !e.drawer.isOpen()) return;
    const t = e.drawer.dialog.querySelector("[data-explorer-related-body]");
    if (!t) return;
    const s = this.host.root.ownerDocument.activeElement, i = s instanceof HTMLElement && t.contains(s) && s.getAttribute("data-explorer-focus") || "", r = t.ownerDocument.createElement("template");
    r.innerHTML = V(this.host.scope, e.source, e.target, e.recordKey, e.page);
    const n = r.content.firstElementChild;
    n && (t.replaceWith(n), i && n.querySelector(`[data-explorer-focus="${Qe(i)}"]`)?.focus());
  }
}, C = [
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
  }
], et = [{
  id: "insights",
  label: "Insights"
}, {
  id: "compare",
  label: "Compare"
}];
function O(e) {
  return e === "insights" || e === "compare";
}
var tt = {
  id: "app-preview",
  label: "App preview"
};
function st(e, t = !1) {
  if (!e && !t) return C;
  const s = [];
  return C.forEach((i) => {
    s.push(i), e && i.id === "contents" && s.push(...et), t && i.id === "usage" && s.push(tt);
  }), s;
}
var B = Q, R = {
  catalog_example: "Catalog example",
  prepared: "Prepared receipt",
  active: "Active data"
}, it = {
  catalog_inventory: "Catalog inventory",
  selected_scenario: "Selected scenario"
}, rt = {
  screen: "Screen",
  report: "Report",
  workflow: "Workflow",
  target: "Managed target"
}, ne = {
  active: "success",
  verified: "info",
  stale_verification: "warning",
  verification_failed: "error",
  prepared: "neutral",
  not_prepared: "neutral"
}, G = {
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
}, nt = /* @__PURE__ */ new Set([
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "failed",
  "canceled"
]), f = '<span class="console-kv__empty">Unknown</span>';
function d(e) {
  return `<span class="console-muted">${o(e)}</span>`;
}
function oe(e, t = "") {
  return ge(e, t, B);
}
function I(e, t) {
  if (!e) return f;
  const s = e.length > 16 ? ve(e) : e, i = s === e ? "" : ` title="${a(e)}"`;
  return `<span class="console-kv__copy" data-copy-content="${a(e)}"><code class="console-kv__mono"${i}>${o(s)}</code><button type="button" class="${B.copyBtnSm} console-kv__copy-btn" data-copy-trigger title="${a(`Copy ${t}`)}" aria-label="${a(`Copy ${t}`)}">Copy</button></span>`;
}
function ae(e) {
  return `<dl class="console-kv">${e.map(([t, s]) => `<dt>${o(t)}</dt><dd>${s}</dd>`).join("")}</dl>`;
}
function m(e, t) {
  return e.length === 0 ? d(t) : `<ul class="console-explorer__list">${e.map((s) => `<li>${o(s)}</li>`).join("")}</ul>`;
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
    return e.scenarios.find((i) => i.scenario.id === s.scenario.id && i.scenario.version === s.scenario.version && i.scenario.profile_hash === s.scenario.profile_hash);
}
function P(e, t) {
  return ce(e, t)?.title || t.label;
}
function de(e) {
  return e.statusLabel ? oe(e.statusLabel, ne[e.status] || "neutral") : "";
}
function ot(e) {
  return e?.statusLabel ? {
    label: e.statusLabel,
    tone: ne[e.status] || "neutral"
  } : void 0;
}
function pe(e, t, s = !0) {
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
      return e.value.summary ? o(e.value.summary) : d("No description provided.");
  }
}
function at(e, t) {
  return e.scenarios.length === 0 ? d("None available") : `<ul class="console-explorer__chips">${e.scenarios.map((s) => `<li><span>${o(P(t, s))}</span>${de(s)}</li>`).join("")}</ul>`;
}
function lt(e, t) {
  const s = t.cards.get(e.key), i = x(s), r = le(e, s);
  return `
    <article class="console-card console-explorer__card" data-row-key="${a(e.key)}" aria-labelledby="${a(`${t.scope}-card-${e.key}`)}">
      <header class="console-card__top">
        <span class="console-card__eyebrow">${o(e.origin || "Dataset")}</span>
        ${e.version ? `<code class="console-kv__mono console-explorer__version">v${o(e.version)}</code>` : ""}
      </header>
      <h4 class="console-card__title" id="${a(`${t.scope}-card-${e.key}`)}">${o(r)}</h4>
      <p class="console-card__subtitle console-explorer__summary">${pe(s, t.configured, t.explorable.has(e.key))}</p>
      <dl class="console-card__meta console-explorer__card-meta">
        <div><dt>Scenarios</dt><dd>${at(e, i)}</dd></div>
        <div><dt>Catalog inventory</dt><dd>${e.records && e.records !== "None" ? o(e.records) : f}</dd></div>
      </dl>
      <footer class="console-card__foot">
        ${e.provider ? d(`Provider ${e.provider}`) : "<span></span>"}
        <button type="button" class="console-btn console-btn--sm" data-explorer-action="open" data-dataset-key="${a(e.key)}" data-explorer-focus="${a(`open:${e.key}`)}" aria-label="${a(`View details for ${r}`)}">View details</button>
      </footer>
    </article>
  `;
}
function ct(e) {
  const t = e.datasets.slice(0, e.limit), s = e.datasets.length - t.length, i = e.configured ? "" : '<div class="console-callout" data-tone="info"><p>Descriptions, sample records and declared usage are not offered on this installation. Cards show lifecycle details only.</p></div>', r = e.datasets.length === 0 ? '<div class="console-empty">No datasets are available to explore.</div>' : `<div class="console-cards console-explorer__cards">${t.map((l) => lt(l, e)).join("")}</div>`, n = s > 0 ? `<div class="console-explorer__more"><button type="button" class="console-btn" data-explorer-action="more">Show ${s} more</button></div>` : "";
  return `
    <section class="console-card-section console-explorer__catalog" aria-labelledby="${a(`${e.scope}-catalog`)}">
      <div class="console-json-header console-section-header"><div class="console-section-heading"><h3 class="console-json-title" id="${a(`${e.scope}-catalog`)}">Explore datasets</h3><p class="console-section-description">Descriptions and declared usage come from each dataset’s provider. Counts are catalog inventory unless labelled otherwise.</p></div></div>
      ${i}${r}${n}
    </section>
  `;
}
function dt(e, t, s, i) {
  if (!e) return "This scenario cannot be explored in this context.";
  const r = i || "this scenario";
  switch (t) {
    case "prepared":
      return s?.selections.active?.receipt_id === e.receipt_id ? `Prepared data for ${r} on ${e.target_id}, observed in its isolated stage. This prepared data is also what the target serves; choose Active data to read it live.` : `Prepared data for ${r} on ${e.target_id}, observed in its isolated stage. It is not what ${e.target_id} serves.`;
    case "active":
      return `What ${e.target_id} serves now for ${r} (generation ${e.generation}), observed live.`;
    default:
      return "Catalog example: what the provider declares this scenario contains. It is not observed data and has not been verified.";
  }
}
function D(e, t) {
  return t ? e === "prepared" ? "No prepared receipt for this scenario." : e === "active" ? t.targetId ? `This scenario is not active on ${t.targetId}.` : "This scenario is not active." : "This scenario has no explorable target." : "Choose a scenario first.";
}
function pt(e, t) {
  const s = e.dataset.scenarios.map((r) => {
    const n = r.key === e.scenario?.key ? " selected" : "", l = r.statusLabel ? ` · ${r.statusLabel}` : "";
    return `<option value="${a(r.key)}"${n}>${o(P(t, r) + l)}</option>`;
  }).join(""), i = e.scenario || !e.scenarioKey || !s ? "" : '<option value="" selected disabled>Scenario no longer available</option>';
  return `<label class="console-filter console-explorer__picker">Scenario<select data-explorer-control="scenario" data-explorer-focus="scenario"${s ? "" : " disabled"}>${i}${s || "<option>No scenarios</option>"}</select></label>`;
}
function ut(e) {
  const t = `${e.scope}-context`;
  return `<fieldset class="console-explorer__contexts"><legend class="console-explorer__legend">Data shown</legend><div class="console-explorer__choices">${Object.keys(R).map((s) => {
    const i = !!e.scenario?.selections[s], r = s === e.context ? " checked" : "", n = i ? "" : D(s, e.scenario), l = `${e.scope}-context-${s}`;
    return `<label class="console-explorer__choice${i ? "" : " console-explorer__choice--unavailable"}" for="${a(l)}"${n ? ` title="${a(n)}"` : ""}><input type="radio" id="${a(l)}" name="${a(t)}" value="${s}" data-explorer-control="context" data-explorer-focus="${a(`context:${s}`)}"${r}${i ? "" : " disabled"}><span>${o(R[s])}</span>${n ? `<span class="console-sr-only"> — ${o(n)}</span>` : ""}</label>`;
  }).join("")}</div></fieldset>`;
}
function ht(e) {
  if (e?.status !== "ready") return "";
  const t = e.value, s = [t.observed_at ? `Read ${Z(t.observed_at, B)}` : "", t.presentation_revision && t.presentation_revision !== "unknown" ? `Description revision ${o(t.presentation_revision)}` : ""].filter(Boolean);
  return s.length > 0 ? `<p class="console-explorer__observed">${s.join(" · ")}</p>` : "";
}
function ft(e) {
  const t = x(e.entry), s = le(e.dataset, e.entry), i = [
    e.dataset.origin,
    e.dataset.version ? `v${e.dataset.version}` : "",
    e.dataset.provider
  ].filter(Boolean).join(" · ");
  return `
    <section class="console-json-panel console-explorer__header" aria-labelledby="${a(`${e.scope}-title`)}">
      <div class="console-explorer__heading">
        ${i ? `<span class="console-card__eyebrow">${o(i)}</span>` : ""}
        <h3 class="console-explorer__title" id="${a(`${e.scope}-title`)}" tabindex="-1" data-explorer-focus="title">${o(s)}</h3>
        <p class="console-explorer__summary">${e.drift ? d("Refresh to show the description of the current data.") : pe(e.entry, e.configured, !!e.selection)}</p>
      </div>
      <div class="console-explorer__context" role="group" aria-label="Exploring">
        ${pt(e, t)}
        ${ut(e)}
      </div>
      <p class="console-explorer__note" data-context="${e.context}">${o(dt(e.selection, e.context, e.scenario, e.scenario ? P(t, e.scenario) : ""))}</p>
      ${ht(e.entry)}
    </section>
  `;
}
function vt(e) {
  return `<div class="console-explorer__tabs" role="tablist" aria-label="Dataset details">${(e.sections || C).map(({ id: t, label: s }) => {
    const i = t === e.section;
    return `<button type="button" role="tab" class="console-explorer__tab${i ? " console-explorer__tab--active" : ""}" id="${a(`${e.scope}-tab-${t}`)}" aria-selected="${i ? "true" : "false"}" aria-controls="${a(`${e.scope}-section`)}" tabindex="${i ? "0" : "-1"}" data-explorer-section="${t}" data-explorer-focus="${a(`section:${t}`)}">${o(s)}</button>`;
  }).join("")}</div>`;
}
function L(e) {
  const t = e.kind in G ? e : {
    kind: "failed",
    status: e.status
  }, s = nt.has(t.kind) ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="retry" data-explorer-focus="retry">Try again</button>' : "", i = t.kind === "gone" || t.kind === "invalid" || t.kind === "stale" ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>' : "";
  return `<div class="console-callout console-explorer__state" data-tone="${t.kind === "denied" || t.kind === "expired" ? "error" : "warning"}" role="alert" data-explorer-failure="${t.kind}"><p>${o(G[t.kind])}</p>${s || i ? `<div class="console-explorer__state-actions">${s}${i}</div>` : ""}</div>`;
}
function gt(e) {
  if (!e.scenario) return "The scenario you were exploring is no longer available. Choose another scenario or refresh.";
  const t = R[e.context].toLowerCase();
  if (e.drift === "unavailable") return `The ${t} you were exploring is no longer available for this scenario. Refresh to explore what is available now.`;
  const s = e.current;
  return `The ${t} changed since you opened it.${s?.context === "active" ? ` The target now serves generation ${s.generation}.` : s?.context === "prepared" ? ` A newer prepared revision (${s.content_revision}) exists now.` : ""} Refresh to explore the current data.`;
}
function K(e) {
  return `<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-explorer-state="stale"><p>${o(gt(e))}</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button></div></div>`;
}
function bt(e) {
  const t = e.entry;
  return e.configured ? e.drift ? K(e) : e.selection ? !t || t.status === "loading" ? '<div class="console-explorer__loading" role="status" aria-busy="true">Loading details…</div>' : t.status === "failed" ? L(t.failure) : t.value.state === "suppressed" ? '<div class="console-callout console-explorer__state" data-tone="info" data-explorer-state="suppressed"><p>Details for this selection are hidden by policy.</p></div>' : t.value.state === "unsupported" ? '<div class="console-callout console-explorer__state" data-tone="info" data-explorer-state="unsupported"><p>This dataset’s provider does not describe its contents. Lifecycle details remain available in the other tabs.</p></div>' : "" : `<div class="console-callout console-explorer__state" data-tone="info"><p>${o(D(e.context, e.scenario))}</p></div>` : L({
    kind: "unconfigured",
    status: 0
  });
}
function _t(e) {
  const t = e?.period;
  if (!t) return d("No declared period");
  const s = t.start === t.end || !t.end ? t.start : `${t.start} to ${t.end}`;
  return o(t.timezone ? `${s} (${t.timezone})` : s);
}
function $t(e, t) {
  const s = e.selection, i = [
    ["Provider", e.dataset.provider ? o(e.dataset.provider) : f],
    ["Dataset ID", e.dataset.datasetId ? `<code class="console-kv__mono">${o(e.dataset.datasetId)}</code>` : f],
    ["Version", e.dataset.version ? o(e.dataset.version) : f],
    ["Digest", I(s?.dataset.digest || e.dataset.digest, "dataset digest")]
  ];
  return s && i.push(["Scenario", `<code class="console-kv__mono">${o(`${s.scenario.id} v${s.scenario.version}`)}</code>`], ["Profile hash", I(s.scenario.profile_hash, "scenario profile hash")], ["Target", o(s.target_id)], ["Data shown", o(R[e.context])], ["Receipt", s.receipt_id ? I(s.receipt_id, "receipt ID") : d("None — catalog example")], ["Content revision", s.content_revision ? o(String(s.content_revision)) : d("None")], ["Generation", s.generation !== void 0 ? o(String(s.generation)) : d("None")]), i.push(["Provenance", At(e.entry)], ["Completeness", It(e.entry)]), t?.presentation_revision && i.push(["Description revision", o(t.presentation_revision)]), `<details class="console-explorer__identity" data-explorer-disclosure="identity"${e.identityOpen ? " open" : ""}><summary>Technical identity</summary>${ae(i)}</details>`;
}
function xt(e, t) {
  const s = e.dataset.origin, i = t?.origin && t.origin !== "unknown" ? t.origin : "", r = [s];
  return i && i.toLowerCase() !== s.toLowerCase() && r.push(i), o(r.filter(Boolean).join(" · ") || "Unknown");
}
function yt(e, t) {
  const s = t ? m(t.prerequisites, "None declared") : o(e.dataset.prerequisites || "None"), i = e.scenario ? ce(t, e.scenario) : void 0, r = [
    ["Origin", xt(e, t)],
    ["Declared period", _t(t)],
    ["Timezone", o(t?.period?.timezone || e.dataset.timezone || "") || f],
    ["Prerequisites", s],
    ["Attribution", t ? m(t.attribution, "None declared") : f]
  ];
  return e.scenario && r.push(["This scenario", i?.summary ? o(i.summary) : d("No description provided.")], ["Expected outcomes", i && i.expected_outcomes.length > 0 ? `${m(i.expected_outcomes, "")}<span class="console-muted">Declared, not verified.</span>` : d("None declared")], ["Lifecycle status", e.scenario.statusLabel ? de(e.scenario) : f]), `${ae(r)}${$t(e, t)}<div class="console-explorer__links"><button type="button" class="console-link" data-console-panel-link="verification">Verification evidence<span aria-hidden="true"> →</span></button><button type="button" class="console-link" data-console-panel-link="coverage">Coverage<span aria-hidden="true"> →</span></button></div>`;
}
function ue(e, t) {
  return e.entities.find((s) => s.id === t)?.label || t;
}
function wt(e) {
  return e.inventory.length === 0 ? `<p class="console-explorer__para">${d("No counts declared.")}</p>` : `<table class="console-table console-explorer__table"><caption class="console-explorer__caption">Counts. Catalog inventory covers the whole dataset; selected-scenario counts describe this scenario only.</caption><thead><tr><th scope="col">Entity</th><th scope="col">Scope</th><th scope="col">Count</th></tr></thead><tbody>${e.inventory.map((t) => `<tr><td data-label="Entity">${o(ue(e, t.entity_id))}</td><td data-label="Scope">${o(it[t.scope])}</td><td data-label="Count" class="console-explorer__number">${t.total === null ? f : o(t.total.toLocaleString())}</td></tr>`).join("")}</tbody></table>`;
}
function kt(e) {
  return e.fields.length === 0 ? `<p class="console-explorer__para">${d("No fields declared.")}</p>` : `<table class="console-table console-explorer__table"><thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Unit</th><th scope="col">Meaning</th></tr></thead><tbody>${e.fields.map((t) => `<tr><td data-label="Field"><span class="console-cell-main"><span class="console-cell-title">${o(t.label)}</span><code class="console-cell-sub console-kv__mono">${o(t.id)}</code></span></td><td data-label="Type">${o(t.type)}</td><td data-label="Unit">${t.unit ? o(t.unit) : d("—")}</td><td data-label="Meaning">${t.description ? o(t.description) : d("Not described")}</td></tr>`).join("")}</tbody></table>`;
}
function mt(e, t) {
  return t.relationships.length === 0 ? "" : `<div class="console-explorer__related"><span class="console-explorer__label">Declared relationships</span>${m(t.relationships.map((s) => `${s.label} → ${ue(e, s.entity_id)}`), "")}</div>`;
}
function St(e, t, s) {
  return `
    <article class="console-explorer__entity" data-entity-id="${a(s.id)}" aria-labelledby="${a(`${e.scope}-entity-${s.id}`)}">
      <div class="console-explorer__entity-head">
        <h4 class="console-explorer__entity-title" id="${a(`${e.scope}-entity-${s.id}`)}">${o(s.label)}</h4>
        ${s.description ? `<p class="console-explorer__para">${o(s.description)}</p>` : `<p class="console-explorer__para">${d("Not described.")}</p>`}
      </div>
      ${kt(s)}
      ${mt(t, s)}
      ${e.preview ? e.preview(s) : ""}
    </article>
  `;
}
function Ct(e, t) {
  const s = t.entities.length === 0 ? `<p class="console-explorer__para">${d("No entities declared.")}</p>` : t.entities.map((i) => St(e, t, i)).join("");
  return `${wt(t)}<div class="console-explorer__entities">${s}</div>`;
}
function Rt(e) {
  switch (e.usage_completeness) {
    case "complete":
      return "Declared by the dataset’s provider, which reports this list as complete. It is not discovered at runtime.";
    case "partial":
      return "Declared by the dataset’s provider. Other uses may exist; this list is not discovered at runtime.";
    default:
      return "Declared by the dataset’s provider. Other uses may exist; this list is not discovered at runtime.";
  }
}
var Lt = [
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
function Et(e, t) {
  if (!e) return "";
  try {
    const s = new URL(t), i = new URL(e, s);
    return i.protocol !== "http:" && i.protocol !== "https:" || i.origin !== s.origin ? "" : i.href;
  } catch {
    return "";
  }
}
function Tt(e) {
  const t = Lt.map(({ id: s, label: i }) => {
    const r = e.effects.filter((l) => l.phase === s), n = r.length === 0 ? '<span class="console-kv__empty">Not declared — effect unknown</span>' : r.map((l) => o(l.description || "Declared without a description")).join("<br>");
    return `<dt>${o(i)}</dt><dd>${n}</dd>`;
  }).join("");
  return `<dl class="console-explorer__effects" aria-label="${a(`Declared effects on ${e.label}`)}">${t}</dl>`;
}
function Pt(e, t) {
  const s = Et(t.href, e.base), i = s ? `<a class="console-link" href="${a(s)}" data-explorer-usage-link>Open ${o(t.label)}<span aria-hidden="true"> →</span></a>` : '<span class="console-muted">No link available</span>';
  return `<li class="console-explorer__usage" data-surface-id="${a(t.surface_id)}"><div class="console-explorer__usage-head"><span class="console-explorer__usage-label">${o(t.label)}</span>${oe(rt[t.kind])}</div>${Tt(t)}<div class="console-explorer__links">${i}</div></li>`;
}
function Dt(e, t) {
  const s = `<p class="console-explorer__para console-muted">${o(Rt(t))}</p>`;
  return t.usages.length === 0 ? `${s}<p class="console-explorer__para" data-explorer-state="usage-unknown">No usage is declared. Impact on application features is unknown.</p>` : `${s}<ul class="console-explorer__usages">${t.usages.map((i) => Pt(e, i)).join("")}</ul>`;
}
function At(e) {
  return e?.status !== "ready" ? f : e.value.provenance === "example" ? o("Example — declared by the provider, not observed") : e.value.provenance === "observed" ? o("Observed") : f;
}
function It(e) {
  return e?.status !== "ready" || e.value.completeness === "unknown" ? f : o({
    complete: "Complete",
    partial: "Partial — some details are missing",
    unknown: "Unknown"
  }[e.value.completeness]);
}
function Nt(e, t) {
  return e.configured ? e.drift ? K(e) : e.selection ? e.insights ? e.insights(t) : "" : `<div class="console-callout console-explorer__state" data-tone="info"><p>${o(D(e.context, e.scenario))}</p></div>` : L({
    kind: "unconfigured",
    status: 0
  });
}
function qt(e) {
  const t = e.scenario?.selections.prepared, s = e.context === "active" ? `Active data is what ${e.selection?.target_id || "the target"} serves now: open the application itself to see it. Application preview opens a prepared receipt without activating it.` : "A catalog example is not prepared data. Application preview opens a prepared receipt without activating it.", i = t ? '<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="prepared" data-explorer-focus="preview:prepared">Show the prepared data</button></div>' : `<p>${o("This scenario has no prepared data yet. Prepare it to preview it in the application.")}</p>`;
  return `<div class="console-callout console-explorer__state" data-tone="info" data-preview-state="context"><p>${o(s)}</p>${i}</div>`;
}
function Mt(e) {
  return e.configured ? e.drift ? K(e) : e.selection ? e.selection.context !== "prepared" ? qt(e) : e.appPreview ? e.appPreview() : "" : `<div class="console-callout console-explorer__state" data-tone="info"><p>${o(D(e.context, e.scenario))}</p></div>` : L({
    kind: "unconfigured",
    status: 0
  });
}
function Ot(e) {
  if (O(e.section)) return Nt(e, e.section);
  if (e.section === "app-preview") return Mt(e);
  const t = x(e.entry), s = bt(e);
  switch (e.section) {
    case "about":
      return `${s}${yt(e, t)}`;
    case "contents":
      return s || (t ? Ct(e, t) : "");
    default:
      return s || (t ? Dt(e, t) : "");
  }
}
function Ft(e) {
  const t = (e.sections || C).find((s) => s.id === e.section)?.label || "Details";
  return `
    <nav class="console-explorer__crumbs" aria-label="Explorer"><button type="button" class="console-link" data-explorer-action="back" data-explorer-focus="back"><span aria-hidden="true">← </span>All datasets</button></nav>
    ${ft(e)}
    <div class="console-explorer__sections">
      ${vt(e)}
      <section class="console-json-panel console-explorer__section" role="tabpanel" id="${a(`${e.scope}-section`)}" aria-labelledby="${a(`${e.scope}-tab-${e.section}`)}" data-explorer-section-panel="${e.section}" data-explorer-focus="section-panel" tabindex="0">
        <h4 class="console-sr-only">${o(t)}</h4>
        <div class="console-explorer__section-body">${Ot(e)}</div>
      </section>
    </div>
  `;
}
var E = "explore", Bt = /* @__PURE__ */ new Set([
  E,
  "scenarios",
  "overview"
]);
function X(e) {
  if (!e) return "";
  if (e.status === "ready") {
    const { observed_at: t, ...s } = e.value;
    return JSON.stringify(["ready", s]);
  }
  return e.status === "failed" ? JSON.stringify(["failed", e.failure.kind]) : "loading";
}
var N = 12, Kt = 3, jt = 48, Ut = 0;
function Ht(e) {
  typeof queueMicrotask == "function" ? queueMicrotask(e) : Promise.resolve().then(e);
}
function J(e) {
  return typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(e) : e.replace(/["\\]/g, "\\$&");
}
function Wt(e) {
  try {
    const t = new URL(e.location?.href || "").searchParams.get("selection");
    return t ? F(JSON.parse(t)) : null;
  } catch {
    return null;
  }
}
function zt(e) {
  try {
    const t = new URL(e.location.href);
    if (!t.searchParams.has("selection")) return;
    t.searchParams.delete("selection"), e.defaultView?.history.replaceState(e.defaultView.history.state, "", `${t.pathname}${t.search}${t.hash}`);
  } catch {
  }
}
function Vt(e, t) {
  if (t.preview === !1) return null;
  const s = t.preview || {};
  if (s.transport) return s;
  const i = t.transport ? void 0 : s.routes || me(e) || void 0;
  return i ? {
    ...s,
    routes: i
  } : null;
}
var Yt = class {
  constructor(e, t = {}) {
    this.entries = /* @__PURE__ */ new Map(), this.pending = /* @__PURE__ */ new Map(), this.stale = /* @__PURE__ */ new Set(), this.cleanup = [], this.runtime = null, this.catalog = [], this.catalogSignature = "", this.view = "catalog", this.datasetKey = "", this.scenarioKey = "", this.context = "catalog_example", this.section = "about", this.focusRequest = "", this.disposed = !1, this.rendering = !1, this.identityOpen = !1, this.insights = null, this.insightsLoading = !1, this.insightsFailed = !1, this.appPreview = null, this.previewLoading = !1, this.previewFailed = !1, this.deepLink = null, this.root = e;
    const s = t.transport ? null : ke(e);
    this.configured = !!(t.transport || s), this.transport = t.transport || (s ? Se(s) : Ce), this.scope = `data-explorer-${Ut += 1}`, this.cardLimit = Math.max(1, Math.floor(t.cardLimit || N)), this.concurrency = Math.max(1, Math.floor(t.concurrency || Kt)), this.previews = new Ze({
      root: e,
      scope: this.scope,
      transport: this.transport,
      configured: this.configured,
      update: (n) => this.update(n),
      fallbackFocus: (n) => this.container()?.querySelector(`[data-explorer-focus="${J(n)}"]`) || this.container()?.querySelector("[data-explorer-section-panel]") || null
    }), this.renderer = () => this.renderForRuntime();
    const i = t.insights === !1 || t.insights?.transport || t.transport ? null : we(e), r = t.insights ? t.insights : i ? { routes: i } : null;
    this.insightsSource = this.configured && r && (r.routes || r.transport) ? r : null, this.previewSource = this.configured ? Vt(e, t) : null, this.deepLink = this.configured ? Wt(e.ownerDocument) : null;
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
        e.state === "denied" && (this.appPreview?.clear(!0), this.previewSource && Re(W(q(this.root)))), this.reset(), e.state === "disposed" && this.destroy();
        return;
      }
      if (!(e.state !== "ready" || !this.runtime)) {
        if (e.snapshot) {
          const t = this.syncCatalog();
          if (this.applyDeepLink()) return;
          this.entries.forEach((s, i) => {
            s.status !== "loading" && !this.pending.has(i) && this.stale.add(i);
          }), this.previews.markStale(this.drift() ? void 0 : this.selection()), this.insights?.markStale(), this.insights?.reconcile(), this.appPreview?.markStale(), t ? this.update() : this.container() && this.revalidateShown();
          return;
        }
        e.panels.some((t) => Bt.has(t)) && this.syncCatalog() && (this.insights?.reconcile(), this.update());
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
    const e = qe(this.runtime.getPanelData(E), this.runtime.getPanelData("scenarios"), this.runtime.getPanelData("overview")), t = JSON.stringify(e);
    return t === this.catalogSignature ? !1 : (this.catalog = e, this.catalogSignature = t, this.reconcileSelection(), !0);
  }
  reconcileSelection() {
    if (this.view === "details") {
      if (!this.dataset()) {
        this.view = "catalog", this.pinned = void 0, this.previews.clear(), this.insights?.clear(), this.appPreview?.show(void 0), this.focusRequest = "catalog";
        return;
      }
      this.drift() && this.pinned && (this.cancel(this.pinned), this.entries.delete(u(this.pinned)), this.previews.clear(), this.insights?.clear(), this.appPreview?.show(void 0));
    }
  }
  applyDeepLink() {
    const e = this.deepLink;
    if (!e || !this.runtime || this.runtime.getState() !== "ready") return !1;
    this.deepLink = null, zt(this.root.ownerDocument);
    const t = this.catalog.find((i) => i.provider === e.dataset.provider && i.datasetId === e.dataset.id && i.version === e.dataset.version && i.digest.length > 0 && e.dataset.digest.startsWith(i.digest)), s = t?.scenarios.find((i) => k(i).some((r) => {
      const n = i.selections[r];
      return n?.scenario.id === e.scenario.id && n.scenario.version === e.scenario.version && n.scenario.profile_hash === e.scenario.profile_hash;
    }));
    return !t || !s ? !1 : (this.view = "details", this.datasetKey = t.key, this.scenarioKey = s.key, this.context = e.context, this.pinned = e, this.insights?.show(e), this.appPreview?.show(e), this.section = e.context === "prepared" && this.previewSource ? "app-preview" : "about", this.focusRequest = this.section === "app-preview" ? "section-panel" : "title", this.runtime.selectPanel(E), this.update(), !0);
  }
  drift() {
    if (this.view !== "details" || !this.pinned) return "";
    const e = this.currentSelection();
    return e ? u(e) === u(this.pinned) ? "" : "changed" : "unavailable";
  }
  pin() {
    this.pinned = this.currentSelection(), this.insights?.show(this.pinned), this.appPreview?.show(this.pinned);
  }
  sections() {
    return st(!!this.insightsSource, !!this.previewSource);
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
    return e ? this.entries.get(u(e)) : void 0;
  }
  load(e, t = !1) {
    const s = u(e);
    if (!t && (this.entries.has(s) || this.pending.has(s))) return;
    this.pending.get(s)?.abort();
    const i = new AbortController();
    this.pending.set(s, i), this.store(s, { status: "loading" }), this.transport.metadata(e, i.signal).then((r) => {
      this.disposed || i.signal.aborted || this.pending.get(s) !== i || (this.pending.delete(s), this.store(s, r.ok ? {
        status: "ready",
        value: r.value
      } : {
        status: "failed",
        failure: r.failure
      }), this.update());
    });
  }
  store(e, t) {
    this.entries.delete(e), this.entries.set(e, t);
    for (const s of this.entries.keys()) {
      if (this.entries.size <= jt) break;
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
      const t = u(e);
      !this.stale.has(t) || this.pending.has(t) || (this.stale.delete(t), this.reauthorize(e, t));
    }), this.view === "details" && !this.drift() && (this.previews.revalidate(), O(this.section) && this.insights?.revalidate(this.section), this.section === "app-preview" && this.appPreview?.revalidate());
  }
  reauthorize(e, t) {
    const s = new AbortController();
    this.pending.set(t, s), this.transport.metadata(e, s.signal).then((i) => {
      if (this.disposed || s.signal.aborted || this.pending.get(t) !== s || (this.pending.delete(t), !i.ok && !re.has(i.failure.kind))) return;
      const r = i.ok ? {
        status: "ready",
        value: i.value
      } : {
        status: "failed",
        failure: i.failure
      }, n = X(this.entries.get(t)) === X(r);
      this.store(t, r), n || this.update();
    });
  }
  cancel(e) {
    if (!e) return;
    const t = u(e), s = this.pending.get(t);
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
      this.rendering = !1, Ht(() => this.afterRender());
    }
  }
  markup() {
    return !this.runtime || this.runtime.getState() !== "ready" ? '<div class="console-explorer" data-data-explorer data-explorer-view="loading"><div class="console-explorer__loading" role="status" aria-busy="true">Loading datasets…</div></div>' : `<div class="console-explorer" data-data-explorer data-explorer-view="${this.view}">${this.view === "details" && this.dataset() ? this.detailsMarkup() : this.catalogMarkup()}</div>`;
  }
  catalogMarkup() {
    const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Set();
    return this.catalog.forEach((s) => {
      const i = y(s)?.selections.catalog_example;
      e.set(s.key, this.entryFor(i)), i && t.add(s.key);
    }), ct({
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
    return Ft({
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
      preview: (i) => this.previews.render(t, i),
      sections: this.sections(),
      insights: (i) => this.insightsMarkup(i, t),
      appPreview: () => this.appPreviewMarkup(t)
    });
  }
  appPreviewMarkup(e) {
    if (this.appPreview) {
      this.appPreview.show(e);
      const t = this.scenario();
      return this.appPreview.render({
        title: this.selectionTitle(e),
        status: ot(t),
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
        generate: ye,
        storageScope: W(q(this.root)),
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
    const t = this.catalog.find((r) => r.provider === e.dataset.provider && r.datasetId === e.dataset.id && r.version === e.dataset.version), s = t?.scenarios.find((r) => r.scenarioId === e.scenario.id && r.version === e.scenario.version);
    if (!t || !s) return `${e.scenario.id} v${e.scenario.version}`;
    const i = t.key === this.datasetKey && !this.drift() ? x(this.entryFor(this.selection())) : void 0;
    return P(i, s);
  }
  ensureInsights() {
    const e = this.insightsSource;
    this.insights || this.insightsLoading || !e || this.disposed || (this.insightsLoading = !0, this.insightsFailed = !1, import("./data-insights.js").then((t) => {
      this.insightsLoading = !1, !this.disposed && (this.insights = t.createDataInsights({
        ...e,
        scope: `${this.scope}-insights`,
        update: (s) => this.update(s),
        dataset: () => this.dataset(),
        activeSelection: (s) => Ie(this.runtime?.getPanelData("overview"), s),
        title: (s) => this.selectionTitle(s)
      }), this.update());
    }, () => {
      this.insightsLoading = !1, this.insightsFailed = !0, this.update();
    }));
  }
  loadInsights() {
    if (!(this.view !== "details" || !O(this.section) || !this.selection() || this.drift())) {
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
    const i = s.content.firstElementChild;
    i && t.replaceWith(i), this.afterRender();
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
    const t = this.container(), s = (e === "catalog" ? t?.querySelector(".console-explorer__catalog h3") : t?.querySelector(`[data-explorer-focus="${J(e)}"]`)) || (this.view === "details" ? t?.querySelector("[data-explorer-section-panel]") : null);
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
    const i = this.owned(e.target, "[data-explorer-section]");
    if (i) {
      this.selectSection(i.dataset.explorerSection || "", !0);
      return;
    }
    const r = this.owned(e.target, "[data-explorer-action]");
    if (!r || (e.preventDefault(), r.getAttribute("aria-disabled") === "true")) return;
    const n = r.dataset.explorerAction || "";
    if (n.startsWith("page-") || n.startsWith("samples") || n === "related") {
      this.handleRecordControl(n, r);
      return;
    }
    switch (n) {
      case "open":
        this.open(r.dataset.datasetKey || "");
        break;
      case "back":
        this.back();
        break;
      case "more":
        this.showMore();
        break;
      case "scenario":
        this.selectScenario(r.dataset.scenarioKey || "", !0);
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
    const i = t.dataset.entityId || "", r = e === "page-next" ? 1 : e === "page-previous" ? -1 : 0;
    if (e.startsWith("page-") && t.hasAttribute("data-related-page")) this.previews.turnRelated(r);
    else if (e.startsWith("page-")) this.previews.turn(s, i, r);
    else if (e === "samples") this.previews.open(s, i);
    else if (e === "samples-hide") this.previews.hide(s, i);
    else {
      const n = x(this.entryFor(s));
      n && this.previews.openRelated(s, n, i, t.dataset.recordKey || "", t.dataset.relationshipId || "", t);
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
    const t = this.sections().map((n) => n.id), s = t.indexOf(this.section), i = {
      ArrowRight: s + 1,
      ArrowLeft: s - 1,
      Home: 0,
      End: t.length - 1
    };
    if (!(e.key in i)) return;
    e.preventDefault();
    const r = (i[e.key] + t.length) % t.length;
    this.selectSection(t[r], !0);
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
    this.cardLimit += N;
    const e = this.catalog[this.cardLimit - N];
    this.focusRequest = e ? `open:${e.key}` : "", this.update();
  }
  selectScenario(e, t) {
    const s = this.dataset()?.scenarios.find((r) => r.key === e);
    if (!s || s.key === this.scenarioKey && !this.drift()) return;
    this.cancel(this.selection()), this.previews.clear(), this.scenarioKey = s.key;
    const i = k(s);
    i.includes(this.context) || (this.context = i[0] || "catalog_example"), this.pin(), this.focusRequest = t ? "title" : "scenario", this.update();
  }
  selectContext(e, t = `context:${e}`) {
    e === this.context && !this.drift() || !this.scenario()?.selections[e] || (this.cancel(this.selection()), this.previews.clear(), this.context = e, this.pin(), this.focusRequest = t, this.update());
  }
  selectSection(e, t) {
    const s = this.sections().find((i) => i.id === e);
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
      const i = k(this.scenario());
      i.includes(this.context) || (this.context = i[0] || "catalog_example");
      const r = this.currentSelection();
      !t || !r || u(t) !== u(r) ? (this.cancel(t), t && this.entries.delete(u(t)), this.previews.clear()) : (this.entryFor(r)?.status === "failed" && this.load(r, !0), this.insights?.refreshFailed(), this.appPreview?.refreshFailed()), this.pinned = r, this.insights?.show(r), this.appPreview?.show(r), this.focusRequest = "title", this.update();
    };
    if (!this.runtime) {
      e();
      return;
    }
    this.runtime.refresh().then(e);
  }
};
function Gt(e, t = {}) {
  return new Yt(e, t);
}
var rs = "data", T = /* @__PURE__ */ new WeakMap();
function Xt(e, t) {
  return (t.bootstrap || q(e))?.console_id === "data" && !t.display && !e.hasAttribute("data-console-display");
}
function Jt(e, t = {}) {
  const s = be(e);
  if (s) return s;
  const { explorer: i, ...r } = t;
  if (!Xt(e, t)) return H(e, r);
  const n = Gt(e, i), l = H(e, {
    ...r,
    renderers: {
      ...r.renderers,
      [E]: n.renderer
    },
    onChange: (c) => {
      n.handleRuntimeChange(c), r.onChange?.(c);
    }
  });
  return l ? (T.set(e, n), n.attach(l), l) : (n.destroy(), null);
}
function Qt(e) {
  $e(e), T.get(e)?.destroy(), T.delete(e);
}
function ns(e) {
  return T.get(e) || null;
}
xe({
  mount: (e) => {
    Jt(e);
  },
  dispose: Qt
});
export {
  rs as DATA_CONSOLE_ID,
  E as DATA_EXPLORE_PANEL,
  Yt as DataExplorer,
  Gt as createDataExplorer,
  $e as disposeConsole,
  Qt as disposeDataConsole,
  ns as getDataExplorer,
  be as getMountedConsole,
  Jt as mountDataConsole
};

//# sourceMappingURL=data.js.map