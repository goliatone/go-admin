import { escapeHTML as c } from "../shared/html.js";
import { httpRequest as w, readCSRFToken as We, readExpectedHTTPJSON as $, readHTTPErrorResult as Xe } from "../shared/transport/http-client.js";
import { t as Ye } from "../chunks/sortable.esm-ChQrsKAN.js";
import { n as js, t as he } from "../chunks/debug-stream-o5N7-MAm.js";
import { A as Ze, D as Vs, F as et, M as Us, N as tt, O as st, P as Gs, T as F, _ as Js, a as at, b as P, c as nt, d as rt, f as it, g as ot, h as lt, i as Hs, j as zs, k as N, l as j, m as Ks, n as Qs, o as Ws, p as ct, r as K, s as dt, t as Xs, u as Ys, v as B, w as O, x as Zs, y as ea } from "../chunks/runtime-helpers-C2cPJaEE.js";
import { A as sa, B as aa, C as ut, D as y, E as ht, F as me, G as na, H as ra, K as mt, L as ia, M as pt, N as ft, O as oa, P as gt, R as pe, S as la, T as yt, U as ca, V as bt, W as da, _ as St, a as ua, b as vt, c as ha, d as ma, f as Rt, g as Et, h as wt, i as L, j as pa, k as fa, l as ga, m as Pt, n as ya, o as ba, p as _t, r as fe, s as Sa, t as Ct, u as va, v as ge, w as At, x as Lt, y as $t, z as Ra } from "../chunks/builtin-panels-uRf1D3XB.js";
import { n as It, t as qt } from "../chunks/simple-object-search-Dd_AEBhz.js";
import { A as Pa, B as _a, C as Ca, D as Aa, E as La, F as $a, I as Ia, L as qa, M as Ta, N as Q, O as Da, P as xa, R as Fa, S as Oa, T as ka, _ as Ma, a as ye, b as Na, c as Tt, d as Dt, f as be, g as Se, h as ve, i as xt, j as Re, k as ja, l as Ft, m as Ot, n as kt, o as _, p as Ba, r as Va, s as Ua, u as Mt, v as Ga, w as Ja, x as Ee, y as Nt, z as Ha } from "../chunks/server-definitions-yM2kAYaY.js";
import { i as jt, n as Ka, r as Qa, t as Wa } from "../chunks/icons-CAenalpJ.js";
function Bt(e) {
  return et(e).load;
}
var Vt = Bt(() => import("./jsonpath-search.js")), M = "commands", we = "command-options://", k = "", W = "", J = /* @__PURE__ */ new Map(), U = /* @__PURE__ */ new Set(), Pe = 0, _e = 0, R = /* @__PURE__ */ new Map(), C = 0, Ce = 230, oe = 180, Ut = 640, Gt = 280, Jt = 24, Be = "cmdl:sidebar-width", ae = /* @__PURE__ */ new Map(), Ae = {
  submitting: 0,
  accepted: 1,
  running: 2,
  completed: 3,
  failed: 3,
  canceled: 3,
  cancelled: 3,
  rejected: 3
};
function Ht(e) {
  const t = e && typeof e == "object" ? e : {}, a = Array.from(new Set([
    h(t.correlation_id) || h(t.CorrelationID),
    h(t.run_id) || h(t.RunID),
    h(t.dispatch_id) || h(t.DispatchID)
  ].filter(Boolean))), s = S(t.state) || S(t.State);
  if (a.length === 0 || !s) return;
  const n = h(t.run_id) || h(t.RunID), r = h(t.correlation_id) || h(t.CorrelationID), i = h(t.dispatch_id) || h(t.DispatchID);
  a.forEach((o) => {
    const l = ae.get(o);
    l && (Ae[l.state] ?? -1) > (Ae[s] ?? -1) || ae.set(o, {
      state: s,
      message: h(t.message) || h(t.Message),
      at: h(t.at) || h(t.At),
      code: h(t.code) || h(t.Code),
      runID: n,
      correlationID: r,
      dispatchID: i
    });
  });
}
function zt(e) {
  return e ? ae.get(e) : void 0;
}
function h(e) {
  return typeof e == "string" ? e.trim() : "";
}
function S(e) {
  return h(e).toLowerCase();
}
function Kt(e) {
  return !e || typeof e != "object" ? "" : c(JSON.stringify(e)).replace(/'/g, "&#39;");
}
function Ve(e) {
  return typeof e == "string" ? e.trim() : typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function Ue(e) {
  const t = S(e);
  return t === "inline" || t === "sync" ? "inline" : t === "queued" || t === "async" || t === "background" ? "queued" : "other";
}
function Qt(e, t) {
  const a = t && typeof t == "object" ? t : {}, s = Array.isArray(a.commands) ? a.commands : [], n = Array.isArray(a.diagnostics) ? a.diagnostics : [], r = Array.isArray(e.ui?.actions) ? e.ui.actions : [], i = /* @__PURE__ */ new Map();
  s.forEach((d) => {
    const f = h(d?.id);
    f && i.set(f, d);
  });
  const o = /* @__PURE__ */ new Map();
  r.forEach((d) => {
    const f = S(d?.id), p = h(d.payload?.command_id);
    f && p && !o.has(p) && o.set(p, d);
  });
  const l = [], m = /* @__PURE__ */ new Set(), u = (d) => {
    d && !m.has(d) && (m.add(d), l.push(d));
  };
  return s.forEach((d) => u(h(d?.id))), r.forEach((d) => u(h(d.payload?.command_id))), {
    entries: l.map((d) => {
      const f = i.get(d), p = o.get(d), g = p ? S(p.id) : "", E = !!(p && g && S(p.form?.renderer) === "formgen"), b = h(p?.label) || h(f?.label) || d, ue = h(f?.group) || "Other", Qe = `${d} ${b} ${ue} ${(Array.isArray(f?.tags) ? f.tags.map(h).filter(Boolean) : []).join(" ")}${E ? "" : " no-access locked"}`.toLowerCase();
      return {
        key: E ? g : `cmd:${d}`,
        actionId: g,
        commandId: d,
        label: b,
        action: E ? p : void 0,
        descriptor: f,
        group: ue,
        search: Qe,
        executable: E
      };
    }),
    diagnostics: n
  };
}
function Wt(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((a) => {
    t.has(a.group) || t.set(a.group, []), t.get(a.group).push(a);
  }), Array.from(t.entries()).sort((a, s) => a[0].localeCompare(s[0])).map(([a, s]) => ({
    group: a,
    items: s.sort((n, r) => (n.commandId || n.label).localeCompare(r.commandId || r.label))
  }));
}
function Xt(e) {
  const t = h(e.descriptor?.execution_mode), a = Ue(t), s = t ? `Execution: ${t}` : "Execution mode unknown", n = e.descriptor?.mutating === !0;
  let r;
  return e.executable ? n ? r = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>' : r = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>' : r = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>', `
    <button type="button" class="cmdl-item${e.executable ? "" : " cmdl-item--locked"}"
      data-cmdl-item="${c(e.key)}"
      data-cmdl-search="${c(e.search)}"
      title="${c(e.commandId || e.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${a}" title="${c(s)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${c(e.commandId || e.label)}</span>
      ${r}
    </button>`;
}
function H(e) {
  return e.trim();
}
function Yt(e) {
  const t = H(e).replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "commands";
  let a = 2166136261;
  for (const s of e)
    a ^= s.charCodeAt(0), a = Math.imul(a, 16777619);
  return `cmdl-group-${t}-${(a >>> 0).toString(36)}`;
}
function Zt(e, t) {
  const a = e.map((s) => {
    const n = H(s.group), r = Yt(s.group), i = !U.has(n);
    return `
      <section class="cmdl-group" data-cmdl-group data-cmdl-group-key="${c(n)}">
        <button type="button" class="cmdl-group__toggle" data-cmdl-group-toggle
          aria-expanded="${i ? "true" : "false"}" aria-controls="${c(r)}">
          <span>${c(s.group)}</span>
          <span class="cmdl-group__count">${s.items.length}</span>
          <span class="cmdl-group__chevron" aria-hidden="true">›</span>
        </button>
        <div id="${c(r)}" role="group" aria-label="${c(s.group)} commands"
          data-cmdl-group-items${i ? "" : " hidden"}>
          ${s.items.map(Xt).join("")}
        </div>
      </section>`;
  }).join("");
  return `
    <aside class="cmdl__list">
      <div class="cmdl__search">
        <input type="search" class="cmdl__search-input" data-cmdl-filter
          placeholder="Filter ${t} command${t === 1 ? "" : "s"}…"
          aria-label="Filter commands" autocomplete="off" spellcheck="false">
      </div>
      <div class="cmdl__groups" aria-label="Commands" data-cmdl-groups>
        ${a}
        <div class="cmdl__noresults" data-cmdl-noresults hidden>No commands match your filter.</div>
      </div>
    </aside>`;
}
function es(e) {
  return e.trim().replace(/^payload\./, "");
}
function ts(e) {
  const t = e.action;
  if (!t) return "";
  const a = t.form, s = typeof a.html == "string" ? a.html : "", n = s.trim() !== "", r = h(t.submit_label) || "Run command", i = h(t.confirm_text), o = t.requires_confirm === !0, l = e.descriptor?.mutating === !0, m = a.sensitive === !0, u = `${n && !m ? `<div class="cmdl-recall" data-cmdl-recall data-cmdl-command="${c(e.commandId)}">
      <div class="cmdl-recall__list" data-cmdl-recall-list></div>
      <button type="button" class="cmdl-recall__save" data-cmdl-save-preset>Save preset</button>
    </div>` : ""}
    <div class="cmdl-form__fields" data-cmdl-fields data-cmdl-formgen-root data-operation-id="${c(h(a.operation_id))}">
      ${n ? s : '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>'}
    </div>
    <input type="hidden" data-action-field="__payload__" data-action-field-kind="json" data-action-field-path="payload"
      data-cmdl-controller-payload${m ? ' data-action-field-sensitive="true"' : ""} value="{}">
    ${n && !m ? `<div class="cmdl-form__json" data-cmdl-json hidden>
      <textarea class="cmdl-json-editor" data-cmdl-json-editor rows="10" spellcheck="false" aria-label="Raw JSON payload"></textarea>
      <div class="cmdl-json-error" data-cmdl-json-error hidden></div>
    </div>` : ""}`, d = o || i !== "", f = l ? '<span class="cmdl-form__note">Confirms before running</span>' : "", p = n && !m ? '<button type="button" class="cmdl-btn cmdl-btn--ghost cmdl-btn--json" data-cmdl-json-toggle title="Edit the raw JSON payload">JSON</button>' : "", g = m ? '<span class="cmdl-form__note">Sensitive values are never saved and must be re-entered</span>' : "", E = d ? `
        <div class="cmdl-form__confirm" data-cmdl-confirm-row hidden>
          <span class="cmdl-form__confirm-msg">${c(i || "Run this command?")}</span>
          <button type="submit" class="cmdl-btn cmdl-btn--run cmdl-btn--confirm" data-cmdl-confirm-run>Confirm run</button>
          <button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-cancel>Cancel</button>
        </div>` : "";
  return `
    <form class="cmdl-form" data-panel-action-form data-cmdl-mode="form" data-cmdl-command="${c(e.commandId)}"
      data-panel-id="${c(M)}"
      data-action-id="${c(e.actionId)}"
      data-action-confirm="${c(i)}"
      data-action-requires-confirm="${o ? "true" : "false"}"
      data-cmdl-confirm="${d ? "true" : "false"}"
      ${d ? 'data-action-confirm-inline="true"' : ""}
      data-action-payload='${Kt(t.payload)}'>
      ${u}
      <div class="cmdl-form__bar" data-cmdl-bar>
        <div class="cmdl-form__bar-main" data-cmdl-bar-main>
		  <button type="submit" class="cmdl-btn cmdl-btn--run" disabled data-cmdl-formgen-submit>${c(r)}</button>
          <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
          ${p}
          ${f}
          ${g}
        </div>${E}
      </div>
    </form>`;
}
function ss(e) {
  const t = h(e.descriptor?.execution_mode), a = e.descriptor?.mutating === !0, s = h(e.descriptor?.summary), n = [];
  n.push(`<span class="cmdl-chip">${c(e.group)}</span>`), t && n.push(`<span class="cmdl-chip cmdl-chip--${Ue(t)}">${c(t)}</span>`), n.push(a ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>' : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'), e.executable || n.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  let r;
  return e.executable ? r = `${a ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>` : ""}${ts(e)}` : r = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`, `
    <div class="cmdl-cmd" data-cmdl-detail="${c(e.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${c(e.commandId || e.label)}</div>
        ${s ? `<div class="cmdl-cmd__summary">${c(s)}</div>` : ""}
        <div class="cmdl-cmd__chips">${n.join("")}</div>
      </div>
      ${r}
    </div>`;
}
function Le(e) {
  return e.length ? `<ul class="cmdl-diagnostics">${e.map((t) => {
    const a = S(t.severity) || "info", s = h(t.message), n = h(t.code);
    return `
        <li class="cmdl-diag cmdl-diag--${c(a)}">
          <span class="cmdl-diag__sev">${c(a)}</span>
          <span class="cmdl-diag__msg">${c(s)}${n ? ` <span class="cmdl-diag__code">${c(n)}</span>` : ""}</span>
        </li>`;
  }).join("")}</ul>` : "";
}
function as(e) {
  const { def: t, data: a } = e, { entries: s, diagnostics: n } = Qt(t, a), r = h((t.ui?.metadata && typeof t.ui.metadata == "object" ? t.ui.metadata : {}).option_resolver_action), i = r ? ` data-cmdl-option-resolver="${c(r)}"` : "";
  if (s.length === 0) return `
      <div class="cmdl" data-cmdl-root${i}>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${Le(n)}
        <div class="cmdl-result" data-panel-action-result="${c(M)}"></div>
      </div>`;
  const o = Wt(s), l = s.map(ss).join("");
  return `
    <div class="cmdl" data-cmdl-root${i}>
      <div class="cmdl__body" data-cmdl-body>
        ${Zt(o, s.length)}
        <div class="cmdl__resizer" data-cmdl-resizer role="separator" aria-orientation="vertical"
          aria-label="Resize command list" tabindex="0"></div>
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${l}
          <!-- Result lives in the detail column (beside the list, below the form it
               belongs to) so it appears next to where the command was run, not as a
               full-width strip under the whole console. Empty == hidden via CSS. -->
          <div class="cmdl-result" data-panel-action-result="${c(M)}"></div>
        </section>
      </div>
      ${Le(n)}
    </div>`;
}
function I(e, t) {
  for (const a of t) {
    const s = e[a];
    if (typeof s == "string" && s.trim() !== "") return s.trim();
  }
  return "";
}
var ns = [
  "category",
  "text_code",
  "source",
  "stack_trace",
  "severity",
  "location",
  "metadata"
];
function rs(e, t) {
  const a = [];
  e && typeof e == "object" && !Array.isArray(e) && a.push(e.error, e), t && typeof t == "object" && !Array.isArray(t) && a.push(t.error, t);
  for (const s of a) if (s && typeof s == "object" && !Array.isArray(s)) {
    const n = s;
    if (ns.some((r) => r in n)) return n;
  }
  return null;
}
function $e(e) {
  const t = e.lastIndexOf("/");
  return t >= 0 ? e.slice(t + 1) : e;
}
function Ie(e) {
  const t = e.split("/").filter(Boolean);
  return t.length > 2 ? t.slice(-2).join("/") : e;
}
function qe(e) {
  if (typeof e == "number") return e;
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
function is(e) {
  const t = e.metadata && typeof e.metadata == "object" && !Array.isArray(e.metadata) ? e.metadata : {}, a = Object.entries(t).map(([d, f]) => ({
    key: d,
    value: Ve(f) || Ge(f)
  })).filter((d) => d.value), s = (Array.isArray(e.stack_trace) ? e.stack_trace : []).map((d) => {
    const f = h(d.function), p = h(d.file), g = qe(d.line);
    return {
      func: $e(f),
      funcTitle: f,
      loc: p ? `${Ie(p)}${g ? `:${g}` : ""}` : "",
      locTitle: p ? `${p}${g ? `:${g}` : ""}` : "",
      app: p !== "" && !p.includes("/pkg/mod/")
    };
  }).filter((d) => d.func || d.loc), n = e.location && typeof e.location == "object" && !Array.isArray(e.location) ? e.location : {}, r = h(n.file), i = h(n.function), o = qe(n.line), l = r ? `${Ie(r)}${o ? `:${o}` : ""}` : "", m = [$e(i), l ? `(${l})` : ""].filter(Boolean).join(" "), u = [i, r ? `${r}${o ? `:${o}` : ""}` : ""].filter(Boolean).join(" ");
  return {
    category: h(e.category),
    textCode: h(e.text_code),
    source: h(e.source),
    severity: h(e.severity),
    timestamp: h(e.timestamp),
    httpCode: typeof e.code == "number" ? String(e.code) : h(e.code),
    metadata: a,
    location: m,
    locationTitle: u,
    stackTrace: s
  };
}
function os(e, t, a, s) {
  const n = a && typeof a == "object" ? a : {}, r = n.receipt && typeof n.receipt == "object" ? n.receipt : {}, i = (Array.isArray(n.validation_errors) ? n.validation_errors : []).map((g) => ({
    path: h(g.path),
    message: h(g.message),
    code: h(g.code)
  })).filter((g) => g.message || g.path), o = r.Accepted ?? r.accepted, l = typeof o == "boolean" ? o : void 0;
  let m = "ok";
  e === "error" ? m = "error" : (i.length > 0 || l === !1) && (m = "invalid");
  const u = m === "error" ? rs(a, s) : null, d = u ? is(u) : null;
  let f = "";
  i.length > 0 ? f = "VALIDATION_ERROR" : m === "error" && (f = d && d.textCode || I(s || {}, ["code", "text_code"]) || (d ? d.httpCode : ""));
  const p = a != null && (typeof a != "object" || Object.keys(n).length > 0);
  return {
    kind: m,
    message: h(t) || (m === "error" ? "Command failed" : "Command dispatched"),
    code: f,
    correlationId: I(r, ["CorrelationID", "correlation_id"]),
    runId: I(r, ["RunID", "run_id"]) || I(n, ["run_id", "RunID"]),
    mode: I(r, ["Mode", "mode"]),
    dispatchId: I(r, ["DispatchID", "dispatch_id"]),
    statusReference: h(n.status_reference) || h(n.statusReference),
    accepted: l,
    validationErrors: i,
    richError: d,
    hasRaw: p,
    rawJSON: p ? Ge(a) : ""
  };
}
function Ge(e) {
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
function ls(e) {
  return !Number.isFinite(e) || e < 0 ? "" : e < 1e3 ? `${Math.round(e)}ms` : `${(e / 1e3).toFixed(2)}s`;
}
function cs(e) {
  try {
    return new Date(e).toLocaleTimeString();
  } catch {
    return "";
  }
}
function v(e, t, a) {
  return a ? `<span class="cmdl-meta" title="${c(t)}"><span class="cmdl-meta__k">${c(e)}</span>${c(a)}</span>` : "";
}
function ds(e, t = {}) {
  const a = e.kind === "error" ? "Dispatch failed" : e.kind === "invalid" ? e.validationErrors.length ? "Validation failed" : "Not accepted" : "Command dispatched", s = e.code ? `<span class="cmdl-result__code">${c(e.code)}</span>` : "", n = t.liveStatus, r = n ? `<span class="cmdl-result__live cmdl-result__live--${c(n.state)}" title="Live status${n.at ? ` · ${c(n.at)}` : ""}">${c(n.state)}</span>` : "", i = e.richError, o = [
    v("id", "Correlation ID", e.correlationId),
    v("mode", "Execution mode", e.mode),
    v("dispatch", "Dispatch ID", e.dispatchId),
    v("status", "Status reference", e.statusReference),
    v("took", "Round-trip duration", typeof t.durationMs == "number" ? ls(t.durationMs) : ""),
    v("at", "Dispatched at", typeof t.at == "number" && t.at > 0 ? cs(t.at) : ""),
    i ? v("category", "Category", i.category) : "",
    i ? v("severity", "Severity", i.severity) : "",
    i ? v("http", "HTTP status", i.httpCode) : "",
    ...i ? i.metadata.map((b) => v(b.key, b.key, b.value)) : [],
    i ? v("when", "Timestamp", i.timestamp) : "",
    i ? v("at", i.locationTitle || "Origin", i.location) : ""
  ].filter(Boolean).join(""), l = o ? `<div class="cmdl-result__meta">${o}</div>` : "", m = i && i.source && i.source !== e.message ? `<div class="cmdl-result__cause"><span class="cmdl-result__cause-k">Cause</span><code class="cmdl-result__cause-v">${c(i.source)}</code></div>` : "", u = i && i.stackTrace.length ? `<details class="cmdl-result__trace"><summary>Stack trace · ${i.stackTrace.length} frame${i.stackTrace.length === 1 ? "" : "s"}</summary><ol class="cmdl-trace">${i.stackTrace.map((b) => `<li class="cmdl-trace__frame${b.app ? " cmdl-trace__frame--app" : ""}"><span class="cmdl-trace__fn" title="${c(b.funcTitle)}">${c(b.func)}</span>${b.loc ? `<span class="cmdl-trace__loc" title="${c(b.locTitle)}">${c(b.loc)}</span>` : ""}</li>`).join("")}</ol></details>` : "", d = e.validationErrors.length ? `<ul class="cmdl-result__validation">${e.validationErrors.map((b) => `<li><span class="cmdl-result__path">${c(b.path || "payload")}</span><span class="cmdl-result__vmsg">${c(b.message || b.code)}</span></li>`).join("")}</ul>` : "", f = e.hasRaw ? `<details class="cmdl-result__raw"><summary>Raw response</summary><pre>${c(e.rawJSON)}</pre></details>` : "", p = t.commandRunsHref ? `<a class="cmdl-btn cmdl-btn--ghost" data-cmdl-command-runs href="${c(t.commandRunsHref)}">View command run</a>` : "", g = t.canRetry ? '<button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-retry>Retry</button>' : "", E = p || g ? `<div class="cmdl-result__actions">${p}${g}</div>` : "";
  return `
    <div class="cmdl-result__card cmdl-result__card--${e.kind}">
      <div class="cmdl-result__head">
        <span class="cmdl-result__status">${c(a)}</span>
        ${s}${r}
        <button type="button" class="cmdl-result__dismiss" data-cmdl-dismiss aria-label="Dismiss result" title="Dismiss result">×</button>
      </div>
      <div class="cmdl-result__msg">${c(e.message)}</div>
      ${m}
      ${l}
      ${d}
      ${u}
      ${E}
      ${f}
    </div>`;
}
var X = /* @__PURE__ */ new WeakMap();
function Je() {
  R.forEach((e) => {
    try {
      e.unsubscribe();
    } catch {
    }
    try {
      e.controller.destroy();
    } catch {
    }
  }), R.clear();
}
function Te() {
  Je();
}
function us(e) {
  R.forEach((t, a) => {
    if (a !== e) {
      try {
        t.unsubscribe();
      } catch {
      }
      try {
        t.controller.destroy();
      } catch {
      }
      R.delete(a);
    }
  });
}
function hs() {
  const e = globalThis, t = e.FormgenRelationships && typeof e.FormgenRelationships == "object" ? e.FormgenRelationships : {}, a = e.Formgen && typeof e.Formgen == "object" ? e.Formgen : void 0;
  return {
    ...t,
    Formgen: t.Formgen || a
  };
}
function x(e) {
  const t = S(e.dataset.actionId || "");
  return t ? R.get(t) : void 0;
}
function ms(e, t) {
  const a = R.get(S(e));
  if (!a) return !1;
  const s = {};
  if (Object.entries(t || {}).forEach(([r, i]) => {
    const o = es(r).replace(/^payload\./, "");
    if (o) {
      if (typeof i == "string") s[o] = i;
      else if (Array.isArray(i)) {
        const l = i.map(Ve).filter(Boolean);
        l.length > 0 && (s[o] = l);
      }
    }
  }), a.controller.clearErrors(), Object.keys(s).length === 0) return !0;
  a.controller.setErrors(s);
  const n = Object.keys(s)[0];
  return a.controller.focus(n), !0;
}
function ps(e, t) {
  const a = R.get(S(e));
  if (!a) return !1;
  const s = t.payload && typeof t.payload == "object" && !Array.isArray(t.payload) ? t.payload : t;
  a.controller.setValues(s);
  const n = a.controller.getValues();
  return A(a.form, n), D(a.form, n), !0;
}
function A(e, t) {
  const a = e.querySelector("[data-cmdl-controller-payload]");
  a && (a.value = JSON.stringify(t || {}));
}
function D(e, t) {
  const a = S(e.dataset.actionId || "");
  !a || L(e) || J.set(a, He(t));
}
function He(e) {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}
function Y(e, t, a = "") {
  e.dataset.cmdlFormgenReady = t ? "true" : "false", e.querySelectorAll("[data-cmdl-formgen-submit]").forEach((n) => {
    n.disabled = !t;
  });
  let s = e.querySelector("[data-cmdl-formgen-error]");
  a && !s && (s = document.createElement("div"), s.dataset.cmdlFormgenError = "", s.className = "cmdl-form__runtime-error", e.querySelector("[data-cmdl-fields]")?.insertAdjacentElement("afterend", s)), s && (s.textContent = a, s.hidden = a === "");
}
function fs(e) {
  return { beforeFetch(t) {
    const a = gs(t.request.url);
    if (!a) return;
    const s = e.closest("[data-cmdl-root]"), n = h(s?.dataset.cmdlDebugPath), r = h(s?.dataset.cmdlOptionResolver);
    if (!n || !r) throw new Error("Dynamic command options are unavailable because no protected resolver action is configured.");
    const i = a.searchParams.get("command_id") || h(e.dataset.cmdlCommand), o = a.searchParams.get("field_path") || "", l = a.searchParams.get("source_id") || "";
    if (!i || !o || !l) throw new Error("Dynamic command option metadata is incomplete.");
    const m = x(e)?.controller.getValues() || de(e), u = new Headers(t.request.init.headers || {});
    u.set("Accept", "application/json"), u.set("Content-Type", "application/json");
    const d = We();
    d && u.set("X-CSRF-Token", d), t.request.url = `${n}/api/panels/${M}/actions/${encodeURIComponent(r)}`, t.request.init.method = "POST", t.request.init.credentials = "same-origin", t.request.init.headers = u, t.request.init.body = JSON.stringify({
      command_id: i,
      field_path: o,
      source_id: l,
      payload: m
    });
  } };
}
function gs(e) {
  const t = e.startsWith(`/${we}`) ? e.slice(1) : e;
  if (!t.startsWith(we)) return null;
  try {
    return new URL(t);
  } catch {
    throw new Error("Dynamic command option metadata contains an invalid resolver URL.");
  }
}
function le(e) {
  if (!e.querySelector("[data-cmdl-formgen-root]")) return Promise.resolve();
  const t = X.get(e);
  if (t) return t;
  if (x(e) && e.dataset.cmdlFormgenReady === "true") return Promise.resolve();
  const a = (async () => {
    const s = S(e.dataset.actionId || ""), n = e.querySelector("[data-cmdl-formgen-root]"), r = hs();
    if (!s || !n || !r?.initFormgenRoot || !r.Formgen?.attach) {
      Y(e, !1, "The form runtime is unavailable. Refresh after loading the formgen assets.");
      return;
    }
    const i = n.querySelector("[data-formgen-auto-init]") || n;
    try {
      const o = r.Formgen.attach(i), l = J.get(s);
      l && !L(e) && o.setValues(l), R.set(s, {
        form: e,
        root: i,
        controller: o,
        unsubscribe: () => {
        }
      }), A(e, o.getValues());
      const m = await r.initFormgenRoot(i, fs(e));
      if (!e.isConnected || k !== s) {
        o.destroy(), m.destroy(i), R.delete(s);
        return;
      }
      o.destroy();
      const u = r.Formgen.attach(i, { registry: m });
      l && !L(e) && u.setValues(l);
      const d = u.onChange((p) => {
        A(e, p), D(e, p);
      });
      R.set(s, {
        form: e,
        root: i,
        controller: u,
        unsubscribe: d
      });
      const f = u.getValues();
      A(e, f), D(e, f), Y(e, !0);
    } catch (o) {
      const l = R.get(s);
      if (l?.form === e) {
        try {
          l.unsubscribe();
        } catch {
        }
        try {
          l.controller.destroy();
        } catch {
        }
        R.delete(s);
      }
      Y(e, !1, o instanceof Error ? o.message : "Unable to initialize the generated form.");
    } finally {
      X.delete(e);
    }
  })();
  return X.set(e, a), a;
}
function G(e, t, a) {
  const s = H(e.dataset.cmdlGroupKey || ""), n = e.querySelector("[data-cmdl-group-toggle]"), r = e.querySelector("[data-cmdl-group-items]");
  n?.setAttribute("aria-expanded", t ? "true" : "false"), r && (r.hidden = !t), !(!a || !s) && (t ? U.delete(s) : U.add(s));
}
function ys(e) {
  const t = e?.closest("[data-cmdl-group]");
  t && G(t, !0, !0);
}
function V(e, t) {
  k = t, us(t);
  const a = e.querySelector("[data-cmdl-empty]");
  a && (a.hidden = !!t), e.querySelectorAll("[data-cmdl-detail]").forEach((n) => {
    n.hidden = n.dataset.cmdlDetail !== t;
  }), e.querySelectorAll("[data-cmdl-item]").forEach((n) => {
    const r = n.dataset.cmdlItem === t;
    n.classList.toggle("cmdl-item--active", r), r ? n.setAttribute("aria-current", "true") : n.removeAttribute("aria-current");
  }), ys(e.querySelector(`[data-cmdl-item="${ie(t)}"]`));
  const s = e.querySelector(`[data-cmdl-detail="${ie(t)}"]`);
  if (s) {
    const n = s.querySelector("[data-panel-action-form]");
    n && le(n);
  }
}
function De(e, t) {
  const a = t.trim().toLowerCase();
  let s = !1;
  e.querySelectorAll("[data-cmdl-item]").forEach((r) => {
    const i = r.dataset.cmdlSearch || "", o = a === "" || i.includes(a);
    r.hidden = !o, o && (s = !0);
  }), e.querySelectorAll("[data-cmdl-group]").forEach((r) => {
    const i = Array.from(r.querySelectorAll("[data-cmdl-item]")).some((o) => !o.hidden);
    r.hidden = !i, i && G(r, a !== "" || !U.has(H(r.dataset.cmdlGroupKey || "")), !1);
  });
  const n = e.querySelector("[data-cmdl-noresults]");
  n && (n.hidden = s);
}
function xe(e) {
  return Array.from(e.querySelectorAll("[data-cmdl-item]")).filter((t) => {
    if (t.hidden) return !1;
    const a = t.closest("[data-cmdl-group]"), s = t.closest("[data-cmdl-group-items]");
    return !a?.hidden && !s?.hidden;
  });
}
function bs(e) {
  if (!S(e.dataset.actionId || "")) return;
  const t = x(e)?.controller?.getValues() || de(e);
  A(e, t), D(e, t);
}
var Ss = 6;
function z() {
  try {
    return typeof localStorage < "u" ? localStorage : null;
  } catch {
    return null;
  }
}
function T(e) {
  const t = z();
  if (!t) return [];
  try {
    const a = t.getItem(e), s = a ? JSON.parse(a) : [];
    return Array.isArray(s) ? s : [];
  } catch {
    return [];
  }
}
function ne(e, t) {
  const a = z();
  if (a)
    try {
      a.setItem(e, JSON.stringify(t));
    } catch {
    }
}
function ce(e) {
  return `cmdl:recent:${e}`;
}
function q(e) {
  return `cmdl:preset:${e}`;
}
function vs(e) {
  const t = e && typeof e == "object" ? e : {}, a = h(t.command_id), s = t.payload && typeof t.payload == "object" ? t.payload : {};
  if (!a || Object.keys(s).length === 0) return;
  const n = ce(a), r = JSON.stringify(s), i = T(n).filter((o) => JSON.stringify(o.payload) !== r);
  i.unshift({
    at: Date.now(),
    payload: s
  }), ne(n, i.slice(0, Ss));
}
function ze(e) {
  return L(e) ? {} : x(e)?.controller.getValues() || de(e);
}
function de(e) {
  const t = e.querySelector("[data-cmdl-controller-payload]");
  if (!t?.value) return {};
  try {
    const a = JSON.parse(t.value);
    return a && typeof a == "object" && !Array.isArray(a) ? a : {};
  } catch {
    return {};
  }
}
function Ke(e, t) {
  const a = x(e);
  if (a) {
    a.controller.setValues(t), A(e, a.controller.getValues()), D(e, a.controller.getValues());
    return;
  }
  const s = S(e.dataset.actionId || "");
  s && !L(e) && J.set(s, He(t)), le(e);
}
function re(e) {
  const t = h(e.dataset.cmdlCommand), a = e.querySelector("[data-cmdl-recall-list]");
  if (!t || !a) return;
  const s = T(ce(t)), n = T(q(t)), r = [];
  s.forEach((i, o) => {
    r.push(`<button type="button" class="cmdl-recall__chip" data-cmdl-load="recent:${o}" title="Reload recent invocation ${o + 1}">↻ recent ${o + 1}</button>`);
  }), n.forEach((i, o) => {
    const l = h(i.name) || `preset ${o + 1}`;
    r.push(`<span class="cmdl-recall__preset"><button type="button" class="cmdl-recall__chip cmdl-recall__chip--preset" data-cmdl-load="preset:${o}" title="Load saved preset">★ ${c(l)}</button><button type="button" class="cmdl-recall__del" data-cmdl-del-preset="${o}" aria-label="Delete preset ${c(l)}">×</button></span>`);
  }), a.innerHTML = r.length ? r.join("") : '<span class="cmdl-recall__empty">No recent runs yet.</span>';
}
function Rs(e, t) {
  const a = e.closest("[data-cmdl-load]");
  if (a) {
    const r = a.closest("[data-panel-action-form]"), i = h(a.closest("[data-cmdl-recall]")?.dataset.cmdlCommand), [o, l] = (a.dataset.cmdlLoad || "").split(":"), m = Number(l);
    if (r && i && Number.isInteger(m)) {
      const u = T(o === "preset" ? q(i) : ce(i))[m]?.payload;
      u && typeof u == "object" && Ke(r, u);
    }
    return !0;
  }
  const s = e.closest("[data-cmdl-save-preset]");
  if (s) {
    const r = s.closest("[data-panel-action-form]"), i = s.closest("[data-cmdl-recall]"), o = h(i?.dataset.cmdlCommand);
    if (r && i && o) {
      const l = (typeof window < "u" && typeof window.prompt == "function" ? window.prompt("Preset name") : "") || "";
      if (l.trim()) {
        const m = T(q(o)).filter((u) => h(u.name) !== l.trim());
        m.unshift({
          name: l.trim(),
          payload: ze(r)
        }), ne(q(o), m), re(i);
      }
    }
    return !0;
  }
  const n = e.closest("[data-cmdl-del-preset]");
  if (n) {
    const r = n.closest("[data-cmdl-recall]"), i = h(r?.dataset.cmdlCommand), o = Number(n.dataset.cmdlDelPreset);
    if (r && i && Number.isInteger(o)) {
      const l = T(q(i));
      l.splice(o, 1), ne(q(i), l), re(r);
    }
    return !0;
  }
  return !1;
}
function Es(e, t) {
  if (L(e)) return;
  const a = e.querySelector("[data-cmdl-fields]"), s = e.querySelector("[data-cmdl-json]"), n = e.querySelector("[data-cmdl-json-editor]"), r = e.querySelector("[data-cmdl-json-toggle]"), i = e.querySelector("[data-cmdl-json-error]");
  if (!a || !s || !n) return;
  if (t) {
    n.value = JSON.stringify(ze(e), null, 2), i && (i.hidden = !0), a.hidden = !0, s.hidden = !1, e.dataset.cmdlMode = "json", r && (r.textContent = "Form");
    return;
  }
  let o;
  try {
    o = n.value.trim() ? JSON.parse(n.value) : {};
  } catch (l) {
    i && (i.textContent = `Invalid JSON: ${l.message}`, i.hidden = !1);
    return;
  }
  if (!o || typeof o != "object" || Array.isArray(o)) {
    i && (i.textContent = "Payload must be a JSON object.", i.hidden = !1);
    return;
  }
  Ke(e, o), a.hidden = !1, s.hidden = !0, e.dataset.cmdlMode = "form", r && (r.textContent = "JSON");
}
function ws() {
  const e = z();
  if (!e) return 0;
  try {
    const t = Number(e.getItem(Be));
    return Number.isFinite(t) && t >= oe ? t : 0;
  } catch {
    return 0;
  }
}
function Ps(e) {
  const t = e.clientWidth || 0;
  return t > 0 ? Math.max(oe, t - Gt) : Ut;
}
function Z(e, t) {
  const a = Math.min(Math.max(Math.round(t), oe), Ps(e));
  C = a, e.style.setProperty("--cmdl-sidebar-w", `${a}px`);
  const s = z();
  if (s) try {
    s.setItem(Be, String(a));
  } catch {
  }
  return a;
}
function _s(e) {
  C || (C = ws()), C && e.style.setProperty("--cmdl-sidebar-w", `${C}px`);
}
function Cs(e) {
  const t = e.querySelector("[data-cmdl-resizer]"), a = e.querySelector("[data-cmdl-body]");
  !t || !a || (_s(a), t.addEventListener("pointerdown", (s) => {
    s.preventDefault();
    const n = s.clientX, r = C || Ce;
    if (typeof t.setPointerCapture == "function") try {
      t.setPointerCapture(s.pointerId);
    } catch {
    }
    const i = (l) => Z(a, r + (l.clientX - n)), o = (l) => {
      Z(a, r + (l.clientX - n)), t.removeEventListener("pointermove", i), t.removeEventListener("pointerup", o), t.removeEventListener("pointercancel", o);
    };
    t.addEventListener("pointermove", i), t.addEventListener("pointerup", o), t.addEventListener("pointercancel", o);
  }), t.addEventListener("keydown", (s) => {
    s.key !== "ArrowLeft" && s.key !== "ArrowRight" || (s.preventDefault(), Z(a, (C || Ce) + (s.key === "ArrowRight" ? Jt : -24)));
  }));
}
function ee(e, t) {
  const a = e.querySelector("[data-cmdl-bar-main]"), s = e.querySelector("[data-cmdl-confirm-row]");
  if (!a || !s) return;
  a.hidden = t, s.hidden = !t;
  const n = t ? s.querySelector("[data-cmdl-confirm-run]") : a.querySelector("button");
  if (n && typeof n.focus == "function") try {
    n.focus();
  } catch {
  }
}
function As(e, t = {}) {
  const a = e.querySelector("[data-cmdl-root]");
  if (!a) return;
  Je(), a.dataset.cmdlDebugPath = h(t.debugPath), Cs(a), a.querySelectorAll("[data-cmdl-recall]").forEach((i) => re(i));
  const s = a.querySelector("[data-cmdl-filter]");
  s && (s.value = W, De(a, W)), k && a.querySelector(`[data-cmdl-item="${ie(k)}"]`) && V(a, k);
  const n = a.querySelector("[data-cmdl-groups]"), r = a.querySelector("[data-cmdl-detailcol]");
  n && (n.scrollTop = Pe), r && (r.scrollTop = _e), a.addEventListener("scroll", (i) => {
    n && i.target === n && (Pe = n.scrollTop), r && i.target === r && (_e = r.scrollTop);
  }, !0), a.addEventListener("click", (i) => {
    const o = i.target, l = o.closest("[data-cmdl-group-toggle]");
    if (l) {
      const p = l.closest("[data-cmdl-group]");
      p && G(p, l.getAttribute("aria-expanded") !== "true", !0);
      return;
    }
    if (Rs(o, a)) return;
    const m = o.closest("[data-cmdl-json-toggle]");
    if (m) {
      const p = m.closest("[data-panel-action-form]");
      p && Es(p, p.dataset.cmdlMode !== "json");
      return;
    }
    const u = o.closest("[data-cmdl-confirm-run]");
    if (u) {
      const p = u.closest("[data-panel-action-form]");
      p && (p.dataset.cmdlArmed = "true");
      return;
    }
    const d = o.closest("[data-cmdl-cancel]");
    if (d) {
      const p = d.closest("[data-panel-action-form]");
      p && (delete p.dataset.cmdlArmed, ee(p, !1));
      return;
    }
    const f = o.closest("[data-cmdl-item]");
    if (f) {
      V(a, f.dataset.cmdlItem || "");
      return;
    }
  }), s && (s.addEventListener("input", () => {
    W = s.value, De(a, s.value);
  }), s.addEventListener("keydown", (i) => {
    if (i.key === "ArrowDown" || i.key === "Enter") {
      const o = xe(a)[0];
      o && (i.preventDefault(), i.key === "Enter" ? V(a, o.dataset.cmdlItem || "") : o.focus());
    }
  })), a.addEventListener("submit", (i) => {
    const o = i.target?.closest("[data-panel-action-form]");
    if (o) {
      if (o.dataset.cmdlFormgenReady !== "true") {
        i.preventDefault(), i.stopImmediatePropagation(), le(o);
        return;
      }
      if (o.dataset.cmdlConfirm === "true" && o.dataset.cmdlArmed !== "true") {
        i.preventDefault(), i.stopImmediatePropagation(), ee(o, !0);
        return;
      }
      bs(o), o.dataset.cmdlConfirm === "true" && (delete o.dataset.cmdlArmed, ee(o, !1));
    }
  }, !0), a.addEventListener("keydown", (i) => {
    const o = i.target, l = o.closest("[data-cmdl-group-toggle]");
    if (l && (i.key === "Enter" || i.key === " ")) {
      i.preventDefault();
      const u = l.closest("[data-cmdl-group]");
      u && G(u, l.getAttribute("aria-expanded") !== "true", !0);
      return;
    }
    const m = o.closest("[data-cmdl-item]");
    if (m && (i.key === "ArrowDown" || i.key === "ArrowUp")) {
      i.preventDefault();
      const u = xe(a), d = u.indexOf(m), f = u[i.key === "ArrowDown" ? d + 1 : d - 1];
      f ? f.focus() : i.key === "ArrowUp" && s && s.focus();
      return;
    }
    m && i.key === "Enter" && (i.preventDefault(), V(a, m.dataset.cmdlItem || ""));
  }), a.addEventListener("reset", (i) => {
    const o = i.target, l = S(o.dataset.actionId || "");
    l && J.delete(l), window.setTimeout(() => {
      const m = x(o);
      if (m) {
        m.controller.reset();
        const u = m.controller.getValues();
        A(o, u), D(o, u);
      }
    }, 0);
  });
}
function ie(e) {
  return e.replace(/["\\]/g, "\\$&");
}
xt(M, as);
var Fe = "debug-console-active-panel", Oe = "debug-console-panel-order", Ls = 5e3, $s = 15e3, Is = 1e4, ke = [
  5e3,
  1e4,
  2e4,
  4e4,
  6e4
], qs = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, Me = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, Ts = (e) => Array.isArray(e) && e.length > 0 ? e.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : at(), te = (e, t) => qt(e, t), Ds = (e, t, a) => {
  if (!e || !t) return;
  const s = t.split(".").map((r) => r.trim()).filter(Boolean);
  if (s.length === 0) return;
  let n = e;
  for (let r = 0; r < s.length - 1; r += 1) {
    const i = s[r];
    (!n[i] || typeof n[i] != "object") && (n[i] = {}), n = n[i];
  }
  n[s[s.length - 1]] = a;
}, se = (e, t) => {
  if (!e) return t;
  const a = Number(e);
  return Number.isNaN(a) ? t : a;
}, Ne = (e) => {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}, xs = class {
  constructor(e) {
    this.savedPanelOrder = null, this.customFilterState = {}, this.paused = !1, this.logsExpanded = /* @__PURE__ */ new Set(), this.jserrorsExpanded = /* @__PURE__ */ new Set(), this.pauseButton = null, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.replLoadGeneration = 0, this.jsonPathLoadGeneration = 0, this.jsonPathResult = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.tabsSortable = null, this.panelActionResults = /* @__PURE__ */ new Map(), this.commandLauncherLastPayloads = /* @__PURE__ */ new Map(), this.commandRunStateGeneration = 0, this.commandRunGenerations = /* @__PURE__ */ new Map(), this.commandRunSnapshotBaseline = null, this.commandRunReconcileTimer = null, this.commandRunReconcileInFlight = !1, this.commandRunReconcileFailures = 0, this.commandRunSnapshotAbort = null, this.destroyed = !1, this.handleVisibilityChange = () => {
      this.destroyed || (document.visibilityState === "hidden" ? this.stopCommandRunReconciliation() : this.activePanel === "command_runs" && this.beginCommandRunSnapshotRequest("visibility"));
    }, this.handlePageHide = () => {
      this.destroyed || this.stopCommandRunReconciliation(!0);
    }, this.container = e;
    const t = Me(e.dataset.panels), a = Ts(t);
    a.includes("sessions") || a.push("sessions"), this.availablePanels = this.normalizeAvailablePanelIDs(a), this.savedPanelOrder = this.loadStoredPanelOrder(), this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.panelOrderPreferencesPath = e.dataset.panelOrderPreferencesPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = se(e.dataset.maxLogEntries, 500), this.maxSQLQueries = se(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = se(e.dataset.slowThresholdMs, 50), this.replCommands = it(Me(e.dataset.replCommands)), this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: {
        data: {},
        logs: []
      },
      extra: {}
    }, this.filters = {
      requests: {
        method: "all",
        status: "all",
        search: "",
        newestFirst: !0,
        hasBody: !1,
        contentType: "all"
      },
      sql: {
        search: "",
        slowOnly: !1,
        errorOnly: !1,
        newestFirst: !0
      },
      logs: {
        level: "all",
        search: "",
        autoScroll: !0,
        newestFirst: !0
      },
      routes: {
        method: "all",
        search: ""
      },
      sessions: { search: "" },
      custom: { search: "" },
      objects: { search: "" }
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), ct.forEach((s) => {
      this.panelRenderers.set(s, {
        render: () => this.renderReplPanel(s),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = K(), this.tabsEl = this.requireElement("[data-debug-tabs]", document), this.panelEl = this.requireElement("[data-debug-panel]", document), this.filtersEl = this.requireElement("[data-debug-filters]", document), this.statusEl = document.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", document), this.eventCountEl = this.requireElement("[data-debug-events]", document), this.lastEventEl = this.requireElement("[data-debug-last]", document), this.sessionBannerEl = document.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = document.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = document.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.sessionDetachEl.addEventListener("click", () => this.detachSession()), this.sqlView = new ut({
      styles: y,
      copyOptions: { useIconFeedback: !0 },
      getQueries: () => this.state.sql,
      getRenderOptions: () => ({
        newestFirst: this.filters.sql.newestFirst,
        slowThresholdMs: this.slowThresholdMs,
        maxEntries: this.maxSQLQueries,
        useIconCopyButton: !0
      }),
      getMaxEntries: () => this.maxSQLQueries,
      shouldDisplay: (s) => this.sqlEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onPendingChange: (s) => this.updatePauseIndicator(s)
    }), this.logsView = new Q({
      styles: y,
      keyOf: ge,
      renderRow: (s) => vt(s, y, {
        showSource: !0,
        truncateMessage: !1,
        expandable: !0
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.logEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => me(s, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.logsExpanded
      }),
      onRestore: (s) => pe(s, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.logsExpanded
      }),
      onEvict: (s) => s.forEach((n) => this.logsExpanded.delete(n)),
      onAfterAppend: () => {
        this.attachCopyButtonListeners(), this.applyLogsAutoScroll();
      }
    }), this.requestsView = new Q({
      styles: y,
      containerSelector: "[data-request-table] tbody",
      rowSelector: "tr[data-request-id]",
      keyAttr: "data-request-id",
      keyOf: ht,
      renderRow: (s) => At(s, y, {
        expandedRequestIds: this.expandedRequests,
        truncatePath: !1,
        slowThresholdMs: this.slowThresholdMs
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.requests.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (s) => this.requestEntryMatchesFilters(s),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => gt(s, this.expandedRequests, { useIconFeedback: !0 })
    }), this.jserrorsView = new Q({
      styles: y,
      keyOf: Rt,
      renderRow: (s) => _t(s, y, { compact: !1 }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (s) => me(s, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      }),
      onRestore: (s) => pe(s, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      })
    }), this.registryLiveList = new Et({
      styles: y,
      getRenderOptions: () => ({}),
      shouldDisplay: (s, n) => {
        if (!s.applyFilters) return !0;
        const r = this.getPanelFilterState(s.id, s), i = s.applyFilters([n], r);
        return Array.isArray(i) ? i.length > 0 : !0;
      },
      onNeedFullRender: () => this.renderPanel()
    }), this.bindActions(), this.updateSessionBanner(), this.stream = new he({
      basePath: this.streamBasePath,
      onEvent: (s) => this.handleEvent(s),
      onStatusChange: (s) => this.updateConnectionStatus(s),
      onSnapshotInvalidated: () => this.beginCommandRunSnapshotRequest("invalidation", !0)
    }), document.addEventListener("visibilitychange", this.handleVisibilityChange), window.addEventListener("pagehide", this.handlePageHide), this.unsubscribeRegistry = P.subscribe((s) => this.handleRegistryChange(s)), this.initializeServerDefinitions();
  }
  async initializeServerDefinitions() {
    const e = await this.loadServerPanelOrderPreference();
    this.destroyed || (this.applyPanelOrder(), await kt(this.debugPath), !this.destroyed && (this.eventToPanel = K(), this.applyPanelOrder(), e && this.persistPanelOrder(), this.restoreActivePanel(), this.renderTabs(), this.renderActivePanel(), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents()));
  }
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const a of dt(t)) e.add(a);
    this.stream.subscribe(Array.from(e));
  }
  normalizeStoredPanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return t && this.panels.includes(t) ? t : null;
  }
  restoreActivePanel() {
    let e = null, t = null;
    try {
      e = this.normalizeStoredPanelID(sessionStorage.getItem(Fe));
      const a = new URLSearchParams(window.location.search);
      t = this.normalizeStoredPanelID(a.get("panel"));
      const s = ve(a.toString());
      !t && (s.runID || s.dispatchID || s.correlationID) && this.panels.includes("command_runs") && (t = "command_runs"), t === "command_runs" && Ee(s);
    } catch {
      e = null, t = null;
    }
    this.activePanel = t || e || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || "template";
  }
  persistActivePanel() {
    try {
      sessionStorage.setItem(Fe, this.activePanel);
    } catch {
    }
  }
  replacePanelURL(e, t = "", a = "", s = "") {
    try {
      const n = window.location.href, r = e === "command_runs" ? be(n, {
        runID: t,
        dispatchID: a,
        correlationID: s
      }) : (() => {
        const i = new URL(n);
        return i.searchParams.set("panel", e), i.searchParams.delete("run_id"), i.searchParams.delete("dispatch_id"), i.searchParams.delete("correlation_id"), `${i.pathname}${i.search}${i.hash}`;
      })();
      window.history.replaceState(window.history.state, "", r);
    } catch {
    }
  }
  persistPanelOrder() {
    try {
      localStorage.setItem(Oe, JSON.stringify(this.panels));
    } catch {
    }
  }
  async loadServerPanelOrderPreference() {
    const e = this.panelOrderPreferencesPath.trim();
    if (!e) return !1;
    try {
      const t = await w(e, {
        method: "GET",
        credentials: "same-origin"
      });
      if (!t.ok) return !1;
      const a = await $(t);
      return !a?.available || !a.found ? !1 : (this.savedPanelOrder = this.normalizeAvailablePanelIDs(a.panel_order), this.savedPanelOrder.length > 0);
    } catch {
      return !1;
    }
  }
  async saveServerPanelOrderPreference(e) {
    const t = this.panelOrderPreferencesPath.trim();
    if (t)
      try {
        await w(t, {
          method: "PUT",
          credentials: "same-origin",
          json: { panel_order: e }
        });
      } catch {
      }
  }
  loadStoredPanelOrder() {
    try {
      const e = localStorage.getItem(Oe);
      if (e) {
        const t = JSON.parse(e);
        return this.normalizeSavedPanelOrder(t);
      }
    } catch {
    }
    return null;
  }
  normalizePanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return !t || !qs.test(t) ? null : t;
  }
  normalizeAvailablePanelIDs(e) {
    if (!Array.isArray(e)) return [];
    const t = [], a = /* @__PURE__ */ new Set();
    for (const s of e) {
      const n = this.normalizePanelID(s);
      !n || a.has(n) || (a.add(n), t.push(n));
    }
    return t;
  }
  normalizeSavedPanelOrder(e) {
    const t = this.normalizeAvailablePanelIDs(e);
    return t.length > 0 ? t : null;
  }
  mergePanelOrder(e, t) {
    const a = this.normalizeAvailablePanelIDs(e);
    if (!t || t.length === 0) return a;
    const s = new Set(a), n = [];
    for (const r of t) s.has(r) && (n.push(r), s.delete(r));
    for (const r of a) s.has(r) && n.push(r);
    return n;
  }
  applyPanelOrder() {
    const e = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder);
    this.panels = e.length > 0 ? e : this.availablePanels, this.restoreActivePanel();
  }
  initTabDragDrop() {
    this.tabsSortable && (this.tabsSortable.destroy(), this.tabsSortable = null), this.tabsSortable = Ye.create(this.tabsEl, {
      animation: 150,
      draggable: ".debug-tab",
      fallbackTolerance: 5,
      delayOnTouchOnly: !0,
      delay: 120,
      touchStartThreshold: 8,
      scroll: !0,
      bubbleScroll: !0,
      ghostClass: "debug-tab--ghost",
      chosenClass: "debug-tab--chosen",
      dragClass: "debug-tab--drag",
      direction: "horizontal",
      onEnd: () => {
        const e = Array.from(this.tabsEl.querySelectorAll("[data-panel]")).map((a) => a.dataset.panel || "").filter(Boolean), t = this.mergePanelOrder(this.availablePanels, e);
        t.length > 0 && (this.savedPanelOrder = t, this.panels = t, this.persistPanelOrder(), this.saveServerPanelOrderPreference(t));
      }
    });
  }
  handleRegistryChange(e) {
    const t = this.normalizePanelID(e.panelId), a = this.activePanel, s = e.type === "unregister" && t === a;
    this.eventToPanel = K(), e.type === "register" ? (t && !this.availablePanels.includes(t) && this.availablePanels.push(t), t && e.panel && e.panel.defaultFilters !== void 0 && !(t in this.customFilterState) && (this.customFilterState[t] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && t && (this.availablePanels = this.availablePanels.filter((r) => r !== t), delete this.customFilterState[t]), this.applyPanelOrder();
    const n = a !== this.activePanel;
    this.subscribeToEvents(), this.renderTabs(), (s || n || t === this.activePanel) && this.renderActivePanel();
  }
  requireElement(e, t = this.container) {
    const a = t.querySelector(e);
    if (!a) throw new Error(`Missing debug element: ${e}`);
    return a;
  }
  bindActions() {
    this.tabsEl.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;
      const a = t.closest("[data-panel]");
      if (!a) return;
      const s = a.dataset.panel || "";
      !s || s === this.activePanel || (this.activePanel = s, this.persistActivePanel(), this.replacePanelURL(s), this.renderActivePanel(), s === "command_runs" ? this.beginCommandRunSnapshotRequest("activation") : this.stopCommandRunReconciliation());
    }), this.container.addEventListener("click", (e) => {
      const t = e.target?.closest("[data-debug-action]");
      if (!(!t || !this.container.contains(t)))
        switch (t.dataset.debugAction || "") {
          case "snapshot":
            this.stream.requestSnapshot();
            break;
          case "clear":
            this.clearAll();
            break;
          case "pause":
            this.togglePause(t);
            break;
          case "clear-panel":
            this.clearActivePanel();
        }
    }), this.panelEl.addEventListener("click", (e) => {
      const t = e.target;
      if (!t) return;
      const a = t.closest("[data-doctor-action-navigate]");
      if (a && !a.disabled) {
        this.navigateFromDoctorAction(a);
        return;
      }
      const s = t.closest("[data-doctor-action-run]");
      if (!s || s.disabled) return;
      const n = s.dataset.doctorActionRun || "", r = s.dataset.doctorActionConfirm || "", i = s.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(n, r, i);
    }), this.panelEl.addEventListener(Ft, (e) => {
      if (this.activePanel !== "command_runs") return;
      const t = e.detail, a = typeof t?.runID == "string" ? t.runID : "";
      a && this.replacePanelURL("command_runs", a);
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => {
      const a = t === this.activePanel ? "debug-tab--active" : "", s = jt(nt(t), {
        size: "14px",
        extraClass: "debug-tab__icon"
      });
      return `
          <button class="debug-tab ${a}" data-panel="${c(t)}">
            ${s}
            <span class="debug-tab__label">${c(j(t))}</span>
            <span class="debug-tab__count" data-panel-count="${c(t)}">0</span>
          </button>
        `;
    }).join("");
    this.tabsEl.innerHTML = e, this.updateTabCounts(), this.initTabDragDrop();
  }
  renderActivePanel() {
    this.renderTabs(), this.renderFilters(), this.renderPanel();
  }
  renderFilters() {
    const e = this.activePanel;
    let t = "";
    const a = this.panelRenderers.get(e);
    if (a?.filters) t = a.filters();
    else {
      const s = P.get(e);
      if (s?.showFilters === !1) {
        this.filtersEl.innerHTML = '<span class="timestamp">No filters</span>';
        return;
      }
      if (s?.renderFilters) {
        const n = this.getPanelFilterState(e, s), r = s.renderFilters(n);
        this.filtersEl.innerHTML = r || '<span class="timestamp">No filters</span>', r && this.bindFilterInputs();
        return;
      }
    }
    if (!a?.filters && e === "requests") {
      const s = this.filters.requests, n = this.getUniqueContentTypes();
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions([
        "all",
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
      ], s.method)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Status</label>
          <select data-filter="status">
            ${this.renderSelectOptions([
        "all",
        "200",
        "201",
        "204",
        "400",
        "401",
        "403",
        "404",
        "500"
      ], s.status)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Content-Type</label>
          <select data-filter="contentType">
            ${this.renderSelectOptions(["all", ...n], s.contentType)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(s.search)}" placeholder="/admin/users" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="hasBody" ${s.hasBody ? "checked" : ""} />
          <span>Has Body</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${s.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!a?.filters && e === "sql") {
      const s = this.filters.sql;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(s.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="slowOnly" ${s.slowOnly ? "checked" : ""} />
          <span>Slow only</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="errorOnly" ${s.errorOnly ? "checked" : ""} />
          <span>Errors</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${s.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!a?.filters && e === "logs") {
      const s = this.filters.logs;
      t = `
        <div class="debug-filter">
          <label>Level</label>
          <select data-filter="level">
            ${this.renderSelectOptions([
        "all",
        "debug",
        "info",
        "warn",
        "error"
      ], s.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(s.search)}" placeholder="database" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${s.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="autoScroll" ${s.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (!a?.filters && e === "routes") {
      const s = this.filters.routes;
      t = `
        <div class="debug-filter">
          <label>Method</label>
          <select data-filter="method">
            ${this.renderSelectOptions([
        "all",
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
      ], s.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(s.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!a?.filters && e === "sessions") {
      const s = this.filters.sessions;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(s.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!a?.filters) {
      const s = this.filters.objects;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${c(s.search)}" placeholder="user.roles[0].name" />
        </div>
      `;
    }
    this.filtersEl.innerHTML = t || '<span class="timestamp">No filters</span>', this.bindFilterInputs();
  }
  bindFilterInputs() {
    this.filtersEl.querySelectorAll("input, select").forEach((e) => {
      e.addEventListener("input", () => this.updateFiltersFromInputs()), e.addEventListener("change", () => this.updateFiltersFromInputs());
    });
  }
  updateFiltersFromInputs() {
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]"), a = P.get(e);
    if (a?.renderFilters) {
      const s = this.getPanelFilterState(e, a), n = s && typeof s == "object" && !Array.isArray(s) ? { ...s } : {};
      t.forEach((r) => {
        const i = r.dataset.filter || "";
        if (!i) return;
        const o = n[i];
        n[i] = this.readFilterInputValue(r, o);
      }), this.customFilterState[e] = n, this.renderPanel();
      return;
    }
    if (e === "requests") {
      const s = { ...this.filters.requests };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r === "newestFirst" || r === "hasBody" ? s[r] = n.checked : r && r in s && (s[r] = n.value);
      }), this.filters.requests = s;
    } else if (e === "sql") {
      const s = { ...this.filters.sql };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r === "slowOnly" || r === "errorOnly" || r === "newestFirst" ? s[r] = n.checked : r === "search" && (s[r] = n.value);
      }), this.filters.sql = s;
    } else if (e === "logs") {
      const s = { ...this.filters.logs };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r === "autoScroll" || r === "newestFirst" ? s[r] = n.checked : (r === "level" || r === "search") && (s[r] = n.value);
      }), this.filters.logs = s;
    } else if (e === "routes") {
      const s = { ...this.filters.routes };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in s && (s[r] = n.value);
      }), this.filters.routes = s;
    } else if (e === "sessions") {
      const s = { ...this.filters.sessions };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in s && (s[r] = n.value);
      }), this.filters.sessions = s;
    } else {
      const s = { ...this.filters.objects };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in s && (s[r] = n.value);
      }), this.filters.objects = s, this.jsonPathLoadGeneration += 1, this.jsonPathResult = null;
    }
    this.renderPanel();
  }
  getPanelFilterState(e, t) {
    const a = t || P.get(e);
    return a ? (e in this.customFilterState || (this.customFilterState[e] = a.defaultFilters !== void 0 ? this.cloneFilterState(a.defaultFilters) : {}), this.customFilterState[e]) : {};
  }
  cloneFilterState(e) {
    return Array.isArray(e) ? [...e] : e && typeof e == "object" ? { ...e } : e;
  }
  readFilterInputValue(e, t) {
    if (e instanceof HTMLInputElement && e.type === "checkbox") return e.checked;
    const a = e.value;
    if (typeof t == "number") {
      const s = Number(a);
      return Number.isNaN(s) ? t : s;
    }
    return typeof t == "boolean" ? a === "true" || a === "1" || a.toLowerCase() === "yes" : a;
  }
  renderPanel() {
    const e = this.activePanel;
    this.panelEl.classList.toggle("debug-content--launcher", e === "commands");
    const t = this.panelRenderers.get(e);
    if (t) {
      t.render();
      return;
    }
    this.replLoadGeneration += 1, this.panelEl.classList.remove("debug-content--repl");
    let a = "";
    if (e === "template") a = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search);
    else if (e === "session") a = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search);
    else if (e === "config") a = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search);
    else if (e === "requests") a = this.renderRequests();
    else if (e === "sql") a = this.renderSQL();
    else if (e === "logs") a = this.renderLogs();
    else if (e === "routes") a = this.renderRoutes();
    else if (e === "sessions") a = this.renderSessionsPanel();
    else if (e === "custom") a = this.renderCustom();
    else if (e === "jserrors") a = Pt(this.state.extra.jserrors || [], y, {
      newestFirst: this.filters.logs.newestFirst,
      showSortToggle: !0
    });
    else {
      const n = P.get(e);
      if (n && (n.renderConsole || n.render)) {
        const r = B(n);
        let i = this.getStateForKey(r);
        if (n.applyFilters) {
          const o = this.getPanelFilterState(e, n);
          i = n.applyFilters(i, o);
        } else if (!n.renderFilters && n.showFilters !== !1) {
          const o = this.filters.objects.search.trim();
          o && i && typeof i == "object" && !Array.isArray(i) && (i = te(i, o));
        }
        a = (n.renderConsole || n.render)(i, y, { newestFirst: this.filters.logs.newestFirst });
      } else a = this.renderJSONPanel(j(e), this.state.extra[e], this.filters.objects.search);
    }
    Te(), this.panelEl.innerHTML = a, e === "logs" && this.applyLogsAutoScroll(), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && this.requestsView.adopt(this.panelEl), e === "sql" && this.mountSQLView(), e === "logs" && this.logsView.adopt(this.panelEl), e === "jserrors" && this.jserrorsView.adopt(this.panelEl);
    const s = P.get(e);
    s && this.registryLiveList.handles(s) && this.registryLiveList.adopt(s, this.panelEl), e === "sessions" && this.attachSessionActions(), this.attachPanelActionListeners(), e === "commands" && As(this.panelEl, { debugPath: this.debugPath }), this.renderStoredPanelActionResult(e);
  }
  attachPanelActionListeners() {
    this.panelEl.querySelectorAll("[data-panel-action-picker]").forEach((e) => {
      const t = () => this.updatePanelActionPicker(e);
      e.addEventListener("change", t), t();
    }), this.panelEl.querySelectorAll("[data-panel-action]").forEach((e) => {
      e.addEventListener("click", () => {
        e.disabled || this.runPanelAction(e, e);
      });
    }), this.panelEl.querySelectorAll("[data-panel-action-form]").forEach((e) => {
      e.addEventListener("submit", (t) => {
        t.preventDefault();
        const a = e.querySelector('button[type="submit"]') || void 0;
        a?.disabled || this.runPanelAction(e, a);
      });
    });
  }
  async runPanelAction(e, t, a) {
    const s = e.dataset.panelId || "", n = e.dataset.actionId || "";
    if (!this.debugPath || !s || !n) return;
    const r = e.dataset.actionConfirm || "", i = e.dataset.actionRequiresConfirm === "true";
    if (e.dataset.actionConfirmInline !== "true" && (i || r) && !window.confirm(r || "Run this debug panel action?")) return;
    const o = a || fe(e);
    let l = o;
    s === "commands" && e instanceof HTMLFormElement && (l = fe(e, { excludeSensitive: !0 }), L(e) ? this.commandLauncherLastPayloads.delete(n) : this.commandLauncherLastPayloads.set(n, Ne(o))), t && (t.disabled = !0);
    const m = Date.now();
    try {
      const u = await w(`${this.debugPath}/api/panels/${encodeURIComponent(s)}/actions/${encodeURIComponent(n)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o)
      });
      if (!u.ok) {
        const f = await Xe(u, `Action failed (${u.status})`, { appendStatusToFallback: !1 });
        this.showPanelActionResult(s, "error", f.message, n, f.payload, void 0, {
          at: Date.now(),
          durationMs: Date.now() - m
        });
        return;
      }
      const d = await $(u);
      this.showPanelActionResult(s, d.ok === !1 ? "error" : "ok", d.message || (d.ok === !1 ? "Action failed" : "Action complete"), n, d.data, d.errors, {
        at: Date.now(),
        durationMs: Date.now() - m
      }), s === "commands" && vs(l), d.event && this.handleEvent(d.event), d.refresh && await this.fetchSnapshot();
    } catch (u) {
      const d = u instanceof Error ? u.message : "Action failed";
      this.showPanelActionResult(s, "error", d, n, void 0, void 0, {
        at: Date.now(),
        durationMs: Date.now() - m
      });
    } finally {
      t && (t.disabled = !1);
    }
  }
  showPanelActionResult(e, t, a, s, n, r, i) {
    if (this.panelActionResults.set(e, {
      status: t,
      message: a,
      actionID: s,
      data: n,
      errors: r,
      at: i?.at,
      durationMs: i?.durationMs
    }), this.renderStoredPanelActionResult(e), e === "commands") {
      const o = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((l) => l.dataset.panelActionResult === "commands");
      o && typeof o.scrollIntoView == "function" && o.scrollIntoView({ block: "nearest" });
    }
  }
  renderStoredPanelActionResult(e) {
    const t = this.panelActionResults.get(e);
    if (!t) return;
    this.clearPanelActionErrors();
    const a = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((r) => r.dataset.panelActionResult === e);
    if (!a) return;
    if (e === "commands") {
      const r = os(t.status, t.message, t.data, t.errors), i = {};
      r.validationErrors.forEach((u) => {
        u.path && (i[u.path] = u.message || u.code);
      }), t.errors && typeof t.errors == "object" && Object.assign(i, t.errors), (!t.actionID || !ms(t.actionID, i)) && this.renderPanelActionErrors(i, t.actionID);
      const o = !!(t.actionID && this.commandLauncherLastPayloads.has(t.actionID)), l = zt(r.correlationId || r.runId || r.dispatchId), m = r.runId || l?.runID || r.dispatchId || l?.dispatchID || r.correlationId || l?.correlationID ? be(window.location.href, {
        runID: r.runId || l?.runID,
        dispatchID: r.dispatchId || l?.dispatchID,
        correlationID: r.correlationId || l?.correlationID
      }) : "";
      a.innerHTML = ds(r, {
        canRetry: o,
        at: t.at,
        durationMs: t.durationMs,
        liveStatus: l,
        commandRunsHref: m
      }), this.attachCommandLauncherResultActions(a, t.actionID);
      return;
    }
    const s = this.renderPanelActionErrors(t.errors, t.actionID), n = t.data === void 0 ? "" : `<pre class="${y.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${c(st(t.data, { nullAsEmptyObject: !1 }))}</pre>`;
    a.innerHTML = `<div class="${t.status === "error" ? y.badgeError : y.badge}">${c(t.message)}</div>${s}${n}`;
  }
  attachCommandLauncherResultActions(e, t) {
    const a = e.querySelector("[data-cmdl-dismiss]");
    a && a.addEventListener("click", () => {
      this.panelActionResults.delete("commands"), e.innerHTML = "";
    });
    const s = e.querySelector("[data-cmdl-retry]");
    !s || !t || s.addEventListener("click", () => {
      this.retryCommandLauncherAction(t, s);
    });
  }
  retryCommandLauncherAction(e, t) {
    const a = this.commandLauncherLastPayloads.get(e);
    if (!a) return;
    const s = Array.from(this.panelEl.querySelectorAll("[data-panel-action-form]")).find((n) => n.dataset.panelId === "commands" && n.dataset.actionId === e);
    s && (ps(e, a), this.runPanelAction(s, t, Ne(a)));
  }
  updatePanelActionPicker(e) {
    const t = e.closest("[data-panel-action-launcher]");
    if (!t) return;
    const a = e.value || "";
    t.querySelectorAll("[data-panel-action-choice]").forEach((s) => {
      s.hidden = s.dataset.panelActionChoice !== a;
    });
  }
  navigateFromDoctorAction(e) {
    const t = this.normalizePanelID(e.dataset.doctorActionNavigate || "");
    if (!t || !this.panels.includes(t)) return;
    let a = {};
    try {
      const s = decodeURIComponent(e.dataset.doctorActionState || ""), n = s ? JSON.parse(s) : {};
      n && typeof n == "object" && !Array.isArray(n) && (a = n);
    } catch {
      a = {};
    }
    this.activePanel = t, this.persistActivePanel(), this.renderActivePanel(), this.applyDoctorNavigationState(t, a);
  }
  applyDoctorNavigationState(e, t) {
    Ct(this.panelEl, e, t);
  }
  clearPanelActionErrors() {
    this.panelEl.querySelectorAll("[data-action-field-error]").forEach((e) => {
      e.textContent = "", e.hidden = !0;
    });
  }
  renderPanelActionErrors(e, t) {
    if (!e || typeof e != "object") return "";
    const a = [];
    return Object.entries(e).forEach(([s, n]) => {
      const r = this.stringifyActionError(n);
      if (!r) return;
      const i = s.trim(), o = Array.from(this.panelEl.querySelectorAll("[data-action-field-error]")).find((l) => t && l.dataset.actionId !== t ? !1 : l.dataset.actionFieldError === i || l.dataset.actionFieldName === i || l.dataset.actionFieldError === `payload.${i}`);
      if (o) {
        o.textContent = r, o.hidden = !1;
        return;
      }
      a.push(r);
    }), a.length === 0 ? "" : `<ul class="${y.badgeError}" style="margin-top:0.5rem">${a.map((s) => `<li>${c(s)}</li>`).join("")}</ul>`;
  }
  stringifyActionError(e) {
    return typeof e == "string" ? e.trim() : Array.isArray(e) ? e.map((t) => this.stringifyActionError(t)).filter(Boolean).join("; ") : e && typeof e == "object" && typeof e.message == "string" ? (e.message || "").trim() : e == null ? "" : String(e);
  }
  attachExpandableRowListeners() {
    ft(this.panelEl);
  }
  attachCopyButtonListeners() {
    pt(this.panelEl, { useIconFeedback: !0 });
  }
  mountSQLView() {
    this.sqlView.adopt(this.panelEl);
  }
  renderReplPanel(e) {
    this.panelEl.classList.add("debug-content--repl");
    const t = this.replPanels.get(e);
    if (t) {
      t.attach(this.panelEl);
      return;
    }
    const a = ++this.replLoadGeneration;
    this.panelEl.innerHTML = this.renderCapabilityLoading("terminal"), mt().then(({ DebugReplPanel: s }) => {
      if (this.destroyed || a !== this.replLoadGeneration || this.activePanel !== e) return;
      const n = new s({
        kind: e === "shell" ? "shell" : "console",
        debugPath: this.debugPath,
        commands: e === "console" ? this.replCommands : []
      });
      this.replPanels.set(e, n), n.attach(this.panelEl);
    }).catch(() => {
      this.destroyed || a !== this.replLoadGeneration || this.activePanel !== e || (this.panelEl.innerHTML = this.renderCapabilityError("terminal"), this.panelEl.querySelector("[data-debug-capability-retry]")?.addEventListener("click", () => {
        !this.destroyed && this.activePanel === e && this.renderReplPanel(e);
      }, { once: !0 }));
    });
  }
  renderCapabilityLoading(e) {
    return `<div class="debug-empty-state" role="status">Loading ${c(e)}…</div>`;
  }
  renderCapabilityError(e) {
    return `<div class="debug-empty-state" role="alert">Unable to load ${c(e)}. <button class="debug-btn" type="button" data-debug-capability-retry>Retry</button></div>`;
  }
  getUniqueContentTypes() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.state.requests) {
      const a = t.content_type;
      a && e.add(a.split(";")[0].trim());
    }
    return [...e].sort();
  }
  requestEntryMatchesFilters(e) {
    const { method: t, status: a, search: s, hasBody: n, contentType: r } = this.filters.requests;
    return !(t !== "all" && (e.method || "").toUpperCase() !== t || a !== "all" && String(e.status || "") !== a || s && !(e.path || "").toLowerCase().includes(s.toLowerCase()) || n && !e.request_body || r !== "all" && (e.content_type || "").split(";")[0].trim() !== r);
  }
  renderRequests() {
    const { newestFirst: e } = this.filters.requests, t = this.state.requests.filter((a) => this.requestEntryMatchesFilters(a));
    return t.length === 0 ? this.renderEmptyState("No requests captured yet.") : yt(t, y, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      truncatePath: !1,
      expandedRequestIds: this.expandedRequests
    });
  }
  sqlEntryMatchesFilters(e) {
    const { search: t, slowOnly: a, errorOnly: s } = this.filters.sql;
    return !(s && !e.error || a && !this.isSlowQuery(e) || t && !(e.query || "").toLowerCase().includes(t.toLowerCase()));
  }
  renderSQL() {
    const { newestFirst: e } = this.filters.sql, t = this.state.sql.filter((a) => this.sqlEntryMatchesFilters(a));
    return t.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : bt(t, y, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      useIconCopyButton: !0
    });
  }
  logEntryMatchesFilters(e) {
    const { level: t, search: a } = this.filters.logs;
    return !(t !== "all" && (e.level || "").toLowerCase() !== t || a && !$t(e).includes(a.toLowerCase()));
  }
  applyLogsAutoScroll() {
    this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight);
  }
  renderLogs() {
    const { newestFirst: e } = this.filters.logs, t = this.state.logs.filter((a) => this.logEntryMatchesFilters(a));
    return t.length === 0 ? this.renderEmptyState("No logs captured yet.") : Lt(t, y, {
      newestFirst: e,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      showSource: !0,
      truncateMessage: !1,
      expandable: !0
    });
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, a = t.toLowerCase(), s = this.state.routes.filter((n) => {
      if (e !== "all" && (n.method || "").toUpperCase() !== e) return !1;
      const r = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(a && !r.includes(a));
    });
    return s.length === 0 ? this.renderEmptyState("No routes captured yet.") : St(s, y, { showName: !0 });
  }
  renderSessionsPanel() {
    if (!this.sessionsLoaded && !this.sessionsLoading && this.fetchSessions(), this.sessionsError) return this.renderEmptyState(this.sessionsError);
    const e = this.state.config && typeof this.state.config == "object" && "session_tracking" in this.state.config ? !!this.state.config.session_tracking : void 0, t = this.filters.sessions.search.trim().toLowerCase();
    let a = [...this.sessions];
    if (t && (a = a.filter((r) => [
      r.username,
      r.user_id,
      r.session_id,
      r.ip,
      r.current_page
    ].filter(Boolean).join(" ").toLowerCase().includes(t))), a.sort((r, i) => {
      const o = new Date(r.last_activity || r.started_at || 0).getTime();
      return new Date(i.last_activity || i.started_at || 0).getTime() - o;
    }), this.sessionsLoading && a.length === 0) return this.renderEmptyState("Loading sessions...");
    if (a.length === 0)
      return e === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const s = a.map((r) => {
      const i = r.session_id || "", o = r.username || r.user_id || "Unknown", l = Ze(r.last_activity || r.started_at), m = N(r.request_count ?? 0), u = !!i && i === this.activeSessionId, d = u ? "detach" : "attach", f = u ? "Detach" : "Attach", p = u ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", g = u ? "debug-session-row debug-session-row--active" : "debug-session-row", E = r.current_page || "-", b = r.ip || "-";
      return `
          <tr class="${g}">
            <td>
              <div class="debug-session-user">${c(o)}</div>
              <div class="debug-session-meta">
                <span class="debug-session-id">${c(i || "-")}</span>
              </div>
            </td>
            <td>${c(b)}</td>
            <td>
              <span class="debug-session-path">${c(E)}</span>
            </td>
            <td>${c(l || "-")}</td>
            <td>${c(m)}</td>
            <td>
              <button class="${p}" data-session-action="${d}" data-session-id="${c(i)}">
                ${f}
              </button>
            </td>
          </tr>
        `;
    }).join(""), n = this.sessionsLoading ? "Refreshing..." : "Refresh";
    return `
      <div class="debug-session-toolbar">
        <span class="debug-session-toolbar__label">${`${N(a.length)} active`}</span>
        <div class="debug-session-toolbar__actions">
          <button class="debug-btn" data-session-action="refresh">
            <i class="iconoir-refresh"></i> ${n}
          </button>
        </div>
      </div>
      <table class="debug-table debug-session-table">
        <thead>
          <tr>
            <th>User</th>
            <th>IP</th>
            <th>Current Page</th>
            <th>Last Activity</th>
            <th>Requests</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${s}
        </tbody>
      </table>
    `;
  }
  renderCustom() {
    const { search: e } = this.filters.custom, t = Object.keys(this.state.custom.data).length > 0, a = this.state.custom.logs.length > 0;
    return !t && !a ? this.renderEmptyState("No custom data captured yet.") : wt(this.state.custom, y, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: e ? (s) => te(s, e) : void 0
    });
  }
  renderJSONPanel(e, t, a) {
    const s = t && typeof t == "object" && !Array.isArray(t), n = Array.isArray(t);
    if (s && Object.keys(t || {}).length === 0 || n && (t || []).length === 0 || !s && !n && !t) return this.renderEmptyState(`No ${e.toLowerCase()} data available.`);
    if (a && It(a)) {
      const r = t;
      if (this.jsonPathResult?.data === r && this.jsonPathResult.search === a) return Re(e, this.jsonPathResult.result, y, {
        useIconCopyButton: !0,
        showCount: !0
      });
      const i = ++this.jsonPathLoadGeneration;
      return Vt().then(({ filterObjectBySearch: o }) => {
        this.destroyed || i !== this.jsonPathLoadGeneration || this.filters.objects.search === a && (this.jsonPathResult = {
          data: r,
          search: a,
          result: o(r, a)
        }, this.renderPanel());
      }).catch(() => {
        this.destroyed || i !== this.jsonPathLoadGeneration || (this.panelEl.innerHTML = this.renderCapabilityError("JSONPath filter"), this.panelEl.querySelector("[data-debug-capability-retry]")?.addEventListener("click", () => {
          this.jsonPathResult = null, this.destroyed || this.renderPanel();
        }, { once: !0 }));
      }), this.renderCapabilityLoading("JSONPath filter");
    }
    return Re(e, t, y, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: a ? (r) => te(r, a) : void 0
    });
  }
  attachSessionActions() {
    this.panelEl.querySelectorAll("[data-session-action]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.sessionAction || "", a = e.dataset.sessionId || "";
        switch (t) {
          case "refresh":
            this.fetchSessions(!0);
            break;
          case "attach":
            this.attachSessionByID(a);
            break;
          case "detach":
            this.detachSession();
        }
      });
    });
  }
  async fetchSessions(e = !1) {
    if (this.debugPath && !this.sessionsLoading && !(!e && this.sessionsLoaded && this.sessionsUpdatedAt && Date.now() - this.sessionsUpdatedAt.getTime() < 3e3)) {
      this.sessionsLoading = !0, this.sessionsError = null;
      try {
        const t = await w(`${this.debugPath}/api/sessions`, { credentials: "same-origin" });
        if (!t.ok) {
          this.sessionsError = "Failed to load active sessions.";
          return;
        }
        const a = await $(t);
        if (this.sessions = Array.isArray(a.sessions) ? a.sessions : [], this.sessionsLoaded = !0, this.sessionsUpdatedAt = /* @__PURE__ */ new Date(), this.activeSessionId) {
          const s = this.sessions.find((n) => n.session_id === this.activeSessionId);
          s && (this.activeSession = s, this.updateSessionBanner());
        }
      } catch {
        this.sessionsError = "Failed to load active sessions.";
      } finally {
        this.sessionsLoading = !1, this.updateTabCounts(), this.activePanel === "sessions" && this.renderPanel();
      }
    }
  }
  attachSessionByID(e) {
    const t = e.trim();
    if (!t || this.activeSessionId === t) return;
    const a = this.sessions.find((s) => s.session_id === t) || { session_id: t };
    this.attachSession(a);
  }
  attachSession(e) {
    const t = (e.session_id || "").trim();
    t && this.activeSessionId !== t && (this.activeSessionId = t, this.activeSession = e, this.streamBasePath = this.buildSessionStreamPath(t), this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("session"), this.renderPanel());
  }
  detachSession() {
    this.activeSessionId && (this.activeSessionId = null, this.activeSession = null, this.streamBasePath = this.debugPath, this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("global"), this.renderPanel());
  }
  rebuildStream(e) {
    this.stopCommandRunReconciliation(), this.stream.close(), this.stream = new he({
      basePath: this.streamBasePath,
      onEvent: (t) => this.handleEvent(t),
      onStatusChange: (t) => this.updateConnectionStatus(t),
      onSnapshotInvalidated: () => this.beginCommandRunSnapshotRequest("invalidation", !0)
    }), this.stream.connect(), this.subscribeToEvents(), e === "session" ? this.stream.requestSnapshot() : this.fetchSnapshot();
  }
  resetDebugState() {
    this.stopCommandRunReconciliation(), this.state = {
      template: {},
      session: {},
      requests: [],
      sql: [],
      logs: [],
      config: {},
      routes: [],
      custom: {
        data: {},
        logs: []
      },
      extra: {}
    }, this.expandedRequests.clear(), this.logsExpanded.clear(), this.jserrorsExpanded.clear(), Nt(), Ee(ve(window.location.search)), this.commandRunStateGeneration += 1, this.commandRunGenerations.clear(), this.eventCount = 0, this.lastEventAt = null, this.updateStatusMeta(), this.updateTabCounts();
  }
  buildSessionStreamPath(e) {
    const t = this.debugPath.replace(/\/+$/, ""), a = encodeURIComponent(e);
    return t ? `${t}/session/${a}` : "";
  }
  updateSessionBanner() {
    if (this.sessionBannerEl) {
      if (!this.activeSessionId) {
        this.sessionBannerEl.setAttribute("hidden", "true");
        return;
      }
      this.sessionBannerEl.removeAttribute("hidden"), this.sessionMetaEl && (this.sessionMetaEl.textContent = this.sessionMetaText());
    }
  }
  sessionMetaText() {
    const e = this.activeSession || this.sessions.find((t) => t.session_id === this.activeSessionId) || { session_id: this.activeSessionId || void 0 };
    return [
      e.username || e.user_id,
      e.session_id,
      e.ip,
      e.current_page
    ].filter(Boolean).join(" | ");
  }
  panelCount(e) {
    if (e !== "sessions") {
      const t = P.get(e);
      if (t) {
        const a = B(t), s = { [a]: this.getStateForKey(a) };
        return ot(s, t);
      }
    }
    switch (e) {
      case "template":
        return O(this.state.template);
      case "session":
        return O(this.state.session);
      case "requests":
        return this.state.requests.length;
      case "sql":
        return this.state.sql.length;
      case "logs":
        return this.state.logs.length;
      case "config":
        return O(this.state.config);
      case "routes":
        return this.state.routes.length;
      case "sessions":
        return this.sessions.length;
      case "custom":
        return O(this.state.custom.data) + this.state.custom.logs.length;
      default:
        return O(this.state.extra[e]);
    }
  }
  renderEmptyState(e) {
    return `
      <div class="debug-empty">
        <p>${c(e)}</p>
      </div>
    `;
  }
  renderSelectOptions(e, t) {
    return e.map((a) => {
      const s = a.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${c(a)}" ${s}>${c(a)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((e) => {
      const t = this.panelCount(e), a = this.tabsEl.querySelector(`[data-panel-count="${e}"]`);
      a && (a.textContent = N(t));
    });
  }
  updateConnectionStatus(e) {
    if (!this.destroyed) {
      if (this.connectionEl.textContent = e, this.statusEl.setAttribute("data-status", e), e === "connected" && this.activePanel === "command_runs") {
        this.beginCommandRunSnapshotRequest("reconnect");
        return;
      }
      this.refreshCommandRunReconciliation();
    }
  }
  updateStatusMeta() {
    this.eventCountEl.textContent = `${N(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(e) {
    if (this.destroyed || !e || !e.type) return;
    if (e.type === "debug_command_error") {
      const s = e.payload && typeof e.payload == "object" ? e.payload : {}, n = typeof s.operation == "string" ? s.operation.trim().toLowerCase() : "";
      this.showDebugToast(n === "clear" ? "Unable to clear debug data." : "Debug command failed.", "error");
      return;
    }
    if (e.type === "snapshot") {
      const s = this.commandRunSnapshotBaseline || /* @__PURE__ */ new Map();
      this.applySnapshot(e.payload, s), this.commandRunReconcileInFlight && this.finishCommandRunSnapshotRequest(!0);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused) {
      (this.eventToPanel[e.type] || e.type) === "sql" && this.activePanel === "sql" && this.sqlView.enqueue([e.payload]);
      return;
    }
    if (e.type === "command_status") {
      Ht(e.payload), this.activePanel === "commands" && this.renderStoredPanelActionResult("commands");
      return;
    }
    const t = this.eventToPanel[e.type] || e.type, a = P.get(t);
    if (a) {
      const s = B(a), n = this.getStateForKey(s), r = s === "command_runs" ? _(e.payload) : "", i = r && Array.isArray(n) ? n.find((m) => _(m) === r) : void 0, o = s === "command_runs" && i ? Tt(i, e.payload) : !1, l = (a.handleEvent || ((m, u) => lt(m, u, this.maxLogEntries)))(n, e.payload);
      if (this.setStateForKey(s, l), s === "command_runs") {
        const m = r && Array.isArray(l) ? l.find((u) => _(u) === r) : void 0;
        r && m === e.payload && (this.commandRunStateGeneration += 1, this.commandRunGenerations.set(r, this.commandRunStateGeneration)), this.pruneCommandRunGenerations(l), Se(l), o ? this.beginCommandRunSnapshotRequest("revision-gap") : this.refreshCommandRunReconciliation();
      }
    } else switch (e.type) {
      case "request":
        this.state.requests.push(e.payload), this.trim(this.state.requests, this.maxLogEntries);
        break;
      case "sql":
        this.state.sql.push(e.payload), this.trim(this.state.sql, this.maxSQLQueries);
        break;
      case "log":
        this.state.logs.push(e.payload), this.trim(this.state.logs, this.maxLogEntries);
        break;
      case "template":
        this.state.template = e.payload || {};
        break;
      case "session":
        this.state.session = e.payload || {};
        break;
      case "custom":
        this.handleCustomEvent(e.payload);
        break;
      default:
        rt(t) || (this.state.extra[t] = e.payload);
    }
    if (this.updateTabCounts(), t === this.activePanel) if (t === "sql") this.sqlView.enqueue([e.payload]);
    else if (t === "logs") this.logsView.enqueue([e.payload]);
    else if (t === "requests") this.requestsView.enqueue([e.payload]);
    else if (t === "jserrors") this.jserrorsView.enqueue([e.payload]);
    else if (this.registryLiveList.handles(a)) {
      const s = this.getStateForKey(B(a)), n = a.liveList?.updateMode === "upsert" ? e.payload : Array.isArray(s) ? s[s.length - 1] : void 0;
      this.registryLiveList.enqueue(a, n);
    } else this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        Ds(this.state.custom.data, String(e.key), e.value);
        return;
      }
      if (typeof e == "object" && ("category" in e || "message" in e)) {
        this.state.custom.logs.push(e), this.trim(this.state.custom.logs, this.maxLogEntries);
        return;
      }
    }
  }
  getStateForKey(e) {
    switch (e) {
      case "template":
        return this.state.template;
      case "session":
        return this.state.session;
      case "requests":
        return this.state.requests;
      case "sql":
        return this.state.sql;
      case "logs":
        return this.state.logs;
      case "config":
        return this.state.config;
      case "routes":
        return this.state.routes;
      case "custom":
        return this.state.custom;
      default:
        return this.state.extra[e];
    }
  }
  setStateForKey(e, t) {
    switch (e) {
      case "template":
        this.state.template = t || {};
        break;
      case "session":
        this.state.session = t || {};
        break;
      case "requests":
        this.state.requests = t || [];
        break;
      case "sql":
        this.state.sql = t || [];
        break;
      case "logs":
        this.state.logs = t || [], this.reconcileLogExpansion();
        break;
      case "config":
        this.state.config = t || {};
        break;
      case "routes":
        this.state.routes = t || [];
        break;
      case "custom":
        this.state.custom = t || {
          data: {},
          logs: []
        };
        break;
      default:
        this.state.extra[e] = t;
    }
  }
  applySnapshot(e, t) {
    const a = e || {}, s = this.state.extra.command_runs;
    this.state.template = a.template || {}, this.state.session = a.session || {}, this.state.requests = F(a.requests), this.state.sql = F(a.sql), this.state.logs = F(a.logs), this.reconcileLogExpansion(), this.state.config = a.config || {}, this.state.routes = F(a.routes);
    const n = a.custom || {};
    this.state.custom = {
      data: n.data || {},
      logs: F(n.logs)
    };
    const r = /* @__PURE__ */ new Set([
      "template",
      "session",
      "requests",
      "sql",
      "logs",
      "config",
      "routes",
      "custom"
    ]), i = {};
    if (this.panels.forEach((o) => {
      !r.has(o) && o in a && (i[o] = a[o]);
    }), s !== void 0 || "command_runs" in a) {
      const o = t || /* @__PURE__ */ new Map(), l = P.get("command_runs")?.liveList?.getMaxEntries?.() || this.maxLogEntries, m = Ot(s, a.command_runs, o, this.commandRunGenerations, l), u = new Set(m.map(_).filter(Boolean)), d = Array.isArray(s) ? s.map(_).filter((f) => f && !u.has(f)) : [];
      d.length > 0 && Dt(d), i.command_runs = m, this.commandRunStateGeneration += 1, u.forEach((f) => this.commandRunGenerations.set(f, this.commandRunStateGeneration)), this.pruneCommandRunGenerations(m);
    }
    this.state.extra = i, Se(i.command_runs, !0), this.updateTabCounts(), this.renderPanel(), this.refreshCommandRunReconciliation();
  }
  pruneCommandRunGenerations(e) {
    const t = new Set((Array.isArray(e) ? e : []).map(_).filter(Boolean));
    this.commandRunGenerations.forEach((a, s) => {
      t.has(s) || this.commandRunGenerations.delete(s);
    });
  }
  commandRunsHaveNonterminalRows() {
    const e = this.state.extra.command_runs;
    return Array.isArray(e) && e.some((t) => _(t) && !Mt(t));
  }
  commandRunReconciliationVisible() {
    return this.activePanel === "command_runs" && document.visibilityState !== "hidden" && this.commandRunsHaveNonterminalRows();
  }
  clearCommandRunReconcileTimer() {
    this.commandRunReconcileTimer !== null && (window.clearTimeout(this.commandRunReconcileTimer), this.commandRunReconcileTimer = null);
  }
  refreshCommandRunReconciliation(e = Ls) {
    if (this.destroyed) {
      this.clearCommandRunReconcileTimer();
      return;
    }
    if (this.commandRunReconcileInFlight) return;
    if (!this.commandRunReconciliationVisible()) {
      this.clearCommandRunReconcileTimer();
      return;
    }
    if (this.commandRunReconcileTimer !== null) return;
    const t = Math.max(0, e);
    this.commandRunReconcileTimer = window.setTimeout(() => {
      this.commandRunReconcileTimer = null, this.beginCommandRunSnapshotRequest("timer");
    }, t);
  }
  beginCommandRunSnapshotRequest(e, t = !1) {
    if (this.destroyed || !(this.activePanel === "command_runs" && document.visibilityState !== "hidden") || this.commandRunReconcileInFlight) return;
    const a = this.stream.getStatus() === "connected", s = !this.activeSessionId && !!this.debugPath;
    if (!t && !a && !s) return;
    if (this.clearCommandRunReconcileTimer(), this.commandRunSnapshotBaseline = ye(this.state.extra.command_runs, this.commandRunGenerations), this.commandRunReconcileInFlight = !0, t || a) {
      t || this.stream.requestSnapshot(), this.commandRunReconcileTimer = window.setTimeout(() => {
        this.commandRunReconcileTimer = null, this.finishCommandRunSnapshotRequest(!1);
      }, Is);
      return;
    }
    const n = new AbortController();
    this.commandRunSnapshotAbort = n, w(`${this.debugPath}/api/snapshot`, {
      credentials: "same-origin",
      signal: n.signal
    }).then(async (r) => {
      if (!r.ok) throw new Error("snapshot request failed");
      const i = await $(r);
      n.signal.aborted || (this.applySnapshot(i, this.commandRunSnapshotBaseline || void 0), this.finishCommandRunSnapshotRequest(!0));
    }).catch(() => {
      n.signal.aborted || this.finishCommandRunSnapshotRequest(!1);
    });
  }
  finishCommandRunSnapshotRequest(e) {
    if (this.destroyed) {
      this.stopCommandRunReconciliation(!0);
      return;
    }
    if (this.clearCommandRunReconcileTimer(), this.commandRunSnapshotAbort = null, this.commandRunSnapshotBaseline = null, this.commandRunReconcileInFlight = !1, e) {
      this.commandRunReconcileFailures = 0, this.refreshCommandRunReconciliation($s);
      return;
    }
    const t = Math.min(this.commandRunReconcileFailures, ke.length - 1);
    this.commandRunReconcileFailures += 1, this.refreshCommandRunReconciliation(ke[t]);
  }
  stopCommandRunReconciliation(e = !1) {
    this.clearCommandRunReconcileTimer(), this.commandRunSnapshotAbort?.abort(), this.commandRunSnapshotAbort = null, this.commandRunSnapshotBaseline = null, this.commandRunReconcileInFlight = !1, e && this.commandRunGenerations.clear();
  }
  trim(e, t) {
    if (!(!Array.isArray(e) || t <= 0))
      for (; e.length > t; ) e.shift();
  }
  reconcileLogExpansion() {
    const e = new Set(this.state.logs.map(ge));
    this.logsExpanded.forEach((t) => {
      e.has(t) || this.logsExpanded.delete(t);
    });
  }
  isSlowQuery(e) {
    return tt(e?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (this.destroyed || !this.debugPath || this.activeSessionId) return;
    const e = ye(this.state.extra.command_runs, this.commandRunGenerations);
    try {
      const t = await w(`${this.debugPath}/api/snapshot`, { credentials: "same-origin" });
      if (!t.ok) return;
      const a = await $(t);
      if (this.destroyed) return;
      this.applySnapshot(a, e);
    } catch {
    }
  }
  async clearAll() {
    if (this.debugPath) {
      if (this.activeSessionId) {
        this.logsExpanded.clear(), this.stream.clear();
        return;
      }
      try {
        if (!(await w(`${this.debugPath}/api/clear`, {
          method: "POST",
          credentials: "same-origin"
        })).ok) {
          this.showDebugToast("Unable to clear debug data.", "error");
          return;
        }
        this.logsExpanded.clear();
      } catch {
        this.showDebugToast("Unable to clear debug data.", "error");
      }
    }
  }
  async clearActivePanel() {
    if (!this.debugPath) return;
    const e = this.activePanel;
    if (this.activeSessionId) {
      e === "logs" && this.logsExpanded.clear(), this.stream.clear([e]);
      return;
    }
    try {
      if (!(await w(`${this.debugPath}/api/clear/${encodeURIComponent(e)}`, {
        method: "POST",
        credentials: "same-origin"
      })).ok) {
        this.showDebugToast(`Unable to clear ${j(e)}.`, "error");
        return;
      }
      e === "logs" && this.logsExpanded.clear();
    } catch {
      this.showDebugToast(`Unable to clear ${j(e)}.`, "error");
    }
  }
  async parseJSONResponse(e) {
    const t = await $(e);
    return t && typeof t == "object" ? t : null;
  }
  readResponsePath(e, t) {
    if (!e || !t) return;
    const a = t.split(".").map((n) => n.trim()).filter(Boolean);
    if (a.length === 0) return;
    let s = e;
    for (const n of a) {
      if (!s || typeof s != "object") return;
      s = s[n];
    }
    return s;
  }
  responseMessage(e, t) {
    for (const a of t) {
      const s = this.readResponsePath(e, a);
      if (typeof s == "string" && s.trim()) return s.trim();
    }
    return "";
  }
  showDebugToast(e, t) {
    const a = e.trim();
    if (!a) return;
    window.getComputedStyle(this.container).position === "static" && (this.container.style.position = "relative");
    let s = this.container.querySelector("[data-debug-toast-host]");
    s || (s = document.createElement("div"), s.dataset.debugToastHost = "true", s.style.position = "absolute", s.style.right = "12px", s.style.bottom = "12px", s.style.display = "flex", s.style.flexDirection = "column", s.style.gap = "8px", s.style.pointerEvents = "none", s.style.zIndex = "1000", this.container.appendChild(s));
    const n = t === "success" ? {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.45)",
      color: "#bbf7d0"
    } : {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.45)",
      color: "#fecaca"
    }, r = document.createElement("div");
    r.style.maxWidth = "380px", r.style.padding = "10px 12px", r.style.borderRadius = "8px", r.style.border = `1px solid ${n.border}`, r.style.background = n.bg, r.style.color = n.color, r.style.fontSize = "12px", r.style.lineHeight = "1.4", r.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.25)", r.style.pointerEvents = "auto", r.textContent = a, s.appendChild(r), window.setTimeout(() => {
      r.remove(), s && s.childElementCount === 0 && s.remove();
    }, 4200);
  }
  async runDoctorAction(e, t = "", a = !1) {
    if (!this.debugPath || this.activeSessionId) return;
    const s = e.trim();
    if (!s) return;
    const n = t.trim();
    if (a || n) {
      const r = n || "Are you sure you want to run this doctor action?";
      if (!window.confirm(r)) return;
    }
    try {
      const r = await w(`${this.debugPath}/api/doctor/${encodeURIComponent(s)}/action`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      }), i = await this.parseJSONResponse(r);
      if (!r.ok) {
        const l = this.responseMessage(i, [
          "error.message",
          "message",
          "result.message"
        ]) || `Doctor action failed (${r.status})`;
        this.showDebugToast(l, "error");
        return;
      }
      const o = this.responseMessage(i, ["message", "result.message"]) || "Doctor action completed.";
      this.showDebugToast(o, "success");
    } catch {
      this.showDebugToast("Doctor action failed: unable to reach debug API.", "error");
    } finally {
      this.stream.requestSnapshot();
    }
  }
  togglePause(e) {
    if (this.paused = !this.paused, this.pauseButton = e, this.sqlView.setPaused(this.paused), this.paused) {
      e.textContent = "Resume";
      return;
    }
    this.sqlView.discardPending(), e.textContent = "Pause", this.stream.requestSnapshot();
  }
  destroy() {
    this.destroyed || (this.destroyed = !0, this.replLoadGeneration += 1, this.jsonPathLoadGeneration += 1, this.replPanels.forEach((e) => e.destroy()), this.replPanels.clear(), document.removeEventListener("visibilitychange", this.handleVisibilityChange), window.removeEventListener("pagehide", this.handlePageHide), this.stopCommandRunReconciliation(!0), this.stream.close(), this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null, this.tabsSortable?.destroy(), this.tabsSortable = null, Te());
  }
  updatePauseIndicator(e) {
    !this.paused || !this.pauseButton || (this.pauseButton.textContent = e > 0 ? `Resume (${e})` : "Resume");
  }
}, Fs = (e) => {
  const t = e || document.querySelector("[data-debug-console]");
  return t ? new xs(t) : null;
}, je = () => {
  Fs();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", je) : je();
export {
  sa as DATA_ATTRS,
  Wa as DEBUG_ICON_REFS,
  xs as DebugPanel,
  he as DebugStream,
  pa as INTERACTION_CLASSES,
  Q as LiveListView,
  Et as RegistryLiveListManager,
  js as RemoteDebugStream,
  ut as SqlLiveView,
  xa as appendListRow,
  Ra as appendSqlRowDOM,
  Xs as applyCustomEventPayload,
  Qs as applyDebugEventToSnapshot,
  Ct as applyPanelActionNavigation,
  ya as applyPanelActionPayload,
  pt as attachCopyListeners,
  ft as attachExpandableRowListeners,
  gt as attachRequestDetailListeners,
  me as attachRowExpansion,
  K as buildEventToPanel,
  ye as captureCommandRunSnapshotBaseline,
  _ as commandRunKey,
  Ua as commandRunRevision,
  Tt as commandRunRevisionGap,
  Ft as commandRunSelectionEvent,
  Mt as commandRunTerminal,
  be as commandRunsNavigationHref,
  Ba as commandRunsSelection,
  y as consoleStyles,
  ia as copyToClipboard,
  O as countPayload,
  na as createDebugReplLoader,
  Bt as createJSONPathLoader,
  qa as createSyntaxLoader,
  Ks as defaultGetCount,
  lt as defaultHandleEvent,
  Sa as doctorNavigation,
  Fa as enhanceDeferredSyntax,
  c as escapeHTML,
  $a as evictListOverflow,
  aa as evictSqlOverflow,
  Hs as fetchDebugSnapshot,
  Vs as formatDuration,
  st as formatJSON,
  N as formatNumber,
  Ze as formatTimestamp,
  Ka as getDebugIconRef,
  at as getDefaultPanels,
  Ws as getDefaultToolbarPanels,
  zs as getLevelClass,
  ot as getPanelCount,
  Js as getPanelData,
  dt as getPanelEventTypes,
  nt as getPanelIcon,
  j as getPanelLabel,
  B as getSnapshotKey,
  Us as getStatusClass,
  oa as getStyleConfig,
  Ys as getToolbarCounts,
  Ia as hashString,
  Fs as initDebugPanel,
  rt as isKnownPanel,
  Oa as isSchemaListRenderer,
  tt as isSlowDuration,
  Rt as jsErrorRowKey,
  mt as loadDebugReplPanel,
  Vt as loadJSONPathSearch,
  Ha as loadSyntaxHighlight,
  ge as logRowKey,
  $t as logSearchText,
  Ot as mergeAuthoritativeCommandRuns,
  ea as normalizeEventTypes,
  it as normalizeReplCommands,
  Va as panelDefinitionFromServer,
  P as panelRegistry,
  ve as parseCommandRunsNavigation,
  Se as reconcileCommandRunsRows,
  Ma as renderCommandRunRow,
  Ga as renderCommandRunsPanel,
  wt as renderCustomPanel,
  Qa as renderDebugIcon,
  jt as renderDebugIconRef,
  _a as renderDeferredSyntax,
  ha as renderDoctorPanel,
  ga as renderDoctorPanelCompact,
  _t as renderErrorRow,
  Pt as renderJSErrorsPanel,
  Re as renderJSONPanel,
  Ta as renderJSONViewer,
  vt as renderLogRow,
  Lt as renderLogsPanel,
  Zs as renderPanelContent,
  va as renderPermissionsPanel,
  ma as renderPermissionsPanelCompact,
  At as renderRequestRow,
  yt as renderRequestsPanel,
  St as renderRoutesPanel,
  bt as renderSQLPanel,
  ra as renderSQLRow,
  ca as renderSQLRowsHTML,
  Ca as renderSchemaIdentity,
  Ja as renderSchemaKeyValue,
  ka as renderSchemaListRow,
  La as renderSchemaMetrics,
  Aa as renderSchemaStatusList,
  Da as renderSchemaTable,
  ja as renderSchemaTimeline,
  ua as renderSiteRenderCachePanel,
  ba as renderSiteRenderCachePanelCompact,
  ct as replPanelIDs,
  ht as requestRowKey,
  Nt as resetCommandRunsState,
  pe as restoreRowExpansion,
  Pa as schemaRowKey,
  Na as selectCommandRun,
  la as serializeLogEntry,
  Ee as setCommandRunsNavigationTarget,
  da as sqlRowKey,
  fa as toolbarStyles,
  Gs as truncate
};

//# sourceMappingURL=index.js.map