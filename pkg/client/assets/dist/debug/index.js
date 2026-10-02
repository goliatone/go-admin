import { escapeHTML as c } from "../shared/html.js";
import { httpRequest as w, readCSRFToken as Xe, readExpectedHTTPJSON as $, readHTTPErrorResult as Ye } from "../shared/transport/http-client.js";
import { t as Ze } from "../chunks/sortable.esm-ChQrsKAN.js";
import { _ as et, g as j, h as tt, m as O, v as Us } from "../chunks/rich-C-60Te1B.js";
import { a as Js, c as Hs, d as zs, l as B, o as st, s as at, u as Ks } from "../chunks/avatar-DIbK-LSg.js";
import { _ as he, c as Ws, d as Xs, g as Ys, h as Zs, l as ea, m as ta, p as sa, s as aa, u as na, v as ra } from "../chunks/hydrate-CnDSPe87.js";
import { i as L, n as oa, r as me, t as nt } from "../chunks/actions-wQfzbd0C.js";
import { i as ca, n as rt, r as pe, t as Be } from "../chunks/browser-state-B2H0HF9F.js";
import { A as it, B as ua, C as y, D as ha, E as ma, F as pa, G as fa, H as ga, I as ya, J as ba, K as Sa, L as ot, N as va, O as lt, P as fe, R as Ra, S as ct, T as Ea, U as wa, V as K, W as Pa, Y as dt, _ as ut, a as _a, b as ht, c as mt, d as pt, f as ft, g as gt, h as yt, i as Ca, j as ge, k as bt, l as St, m as ye, n as Aa, o as La, p as vt, q as $a, r as qa, s as Ia, t as Ta, u as Rt, v as Da, w as xa, x as Et, y as wt, z as Fa } from "../chunks/builtin-panels-Dtyptkou.js";
import { n as Pt, t as _t } from "../chunks/simple-object-search-Dd_AEBhz.js";
import { _ as Ma, a as Ct, b as At, c as Lt, d as $t, f as qt, h as k, i as Na, l as V, m as P, n as ja, o as Ba, p as It, r as Q, s as Tt, t as Va, u as Ua, v as Ga, x as Ja, y as Ha } from "../chunks/runtime-helpers-BJB2ragE.js";
import { _ as Ka, a as be, b as Qa, c as Dt, d as xt, f as Se, g as ve, h as Re, i as Ft, l as Ot, m as kt, n as Mt, o as C, p as Wa, r as Xa, s as Ya, u as Nt, v as Za, x as Ee, y as jt } from "../chunks/server-definitions-C46a7zQP.js";
import { i as Bt, n as tn, r as sn, t as an } from "../chunks/icons-CAenalpJ.js";
function Vt(e) {
  return rt(e).load;
}
var Ut = Vt(() => import("./jsonpath-search.js")), N = "commands", we = "command-options://", M = "", W = "", H = /* @__PURE__ */ new Map(), G = /* @__PURE__ */ new Set(), Pe = 0, _e = 0, R = /* @__PURE__ */ new Map(), _ = 0, Ce = 230, oe = 180, Gt = 640, Jt = 280, Ht = 24, Ve = "cmdl:sidebar-width", ae = /* @__PURE__ */ new Map(), Ae = {
  submitting: 0,
  accepted: 1,
  running: 2,
  completed: 3,
  failed: 3,
  canceled: 3,
  cancelled: 3,
  rejected: 3
};
function zt(e) {
  const t = e && typeof e == "object" ? e : {}, s = Array.from(new Set([
    h(t.correlation_id) || h(t.CorrelationID),
    h(t.run_id) || h(t.RunID),
    h(t.dispatch_id) || h(t.DispatchID)
  ].filter(Boolean))), a = S(t.state) || S(t.State);
  if (s.length === 0 || !a) return;
  const n = h(t.run_id) || h(t.RunID), r = h(t.correlation_id) || h(t.CorrelationID), i = h(t.dispatch_id) || h(t.DispatchID);
  s.forEach((o) => {
    const l = ae.get(o);
    l && (Ae[l.state] ?? -1) > (Ae[a] ?? -1) || ae.set(o, {
      state: a,
      message: h(t.message) || h(t.Message),
      at: h(t.at) || h(t.At),
      code: h(t.code) || h(t.Code),
      runID: n,
      correlationID: r,
      dispatchID: i
    });
  });
}
function Kt(e) {
  return e ? ae.get(e) : void 0;
}
function h(e) {
  return typeof e == "string" ? e.trim() : "";
}
function S(e) {
  return h(e).toLowerCase();
}
function Qt(e) {
  return !e || typeof e != "object" ? "" : c(JSON.stringify(e)).replace(/'/g, "&#39;");
}
function Ue(e) {
  return typeof e == "string" ? e.trim() : typeof e == "number" || typeof e == "boolean" ? String(e) : "";
}
function Ge(e) {
  const t = S(e);
  return t === "inline" || t === "sync" ? "inline" : t === "queued" || t === "async" || t === "background" ? "queued" : "other";
}
function Wt(e, t) {
  const s = t && typeof t == "object" ? t : {}, a = Array.isArray(s.commands) ? s.commands : [], n = Array.isArray(s.diagnostics) ? s.diagnostics : [], r = Array.isArray(e.ui?.actions) ? e.ui.actions : [], i = /* @__PURE__ */ new Map();
  a.forEach((d) => {
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
  return a.forEach((d) => u(h(d?.id))), r.forEach((d) => u(h(d.payload?.command_id))), {
    entries: l.map((d) => {
      const f = i.get(d), p = o.get(d), g = p ? S(p.id) : "", E = !!(p && g && S(p.form?.renderer) === "formgen"), b = h(p?.label) || h(f?.label) || d, ue = h(f?.group) || "Other", We = `${d} ${b} ${ue} ${(Array.isArray(f?.tags) ? f.tags.map(h).filter(Boolean) : []).join(" ")}${E ? "" : " no-access locked"}`.toLowerCase();
      return {
        key: E ? g : `cmd:${d}`,
        actionId: g,
        commandId: d,
        label: b,
        action: E ? p : void 0,
        descriptor: f,
        group: ue,
        search: We,
        executable: E
      };
    }),
    diagnostics: n
  };
}
function Xt(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((s) => {
    t.has(s.group) || t.set(s.group, []), t.get(s.group).push(s);
  }), Array.from(t.entries()).sort((s, a) => s[0].localeCompare(a[0])).map(([s, a]) => ({
    group: s,
    items: a.sort((n, r) => (n.commandId || n.label).localeCompare(r.commandId || r.label))
  }));
}
function Yt(e) {
  const t = h(e.descriptor?.execution_mode), s = Ge(t), a = t ? `Execution: ${t}` : "Execution mode unknown", n = e.descriptor?.mutating === !0;
  let r;
  return e.executable ? n ? r = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>' : r = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>' : r = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>', `
    <button type="button" class="cmdl-item${e.executable ? "" : " cmdl-item--locked"}"
      data-cmdl-item="${c(e.key)}"
      data-cmdl-search="${c(e.search)}"
      title="${c(e.commandId || e.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${s}" title="${c(a)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${c(e.commandId || e.label)}</span>
      ${r}
    </button>`;
}
function z(e) {
  return e.trim();
}
function Zt(e) {
  const t = z(e).replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "commands";
  let s = 2166136261;
  for (const a of e)
    s ^= a.charCodeAt(0), s = Math.imul(s, 16777619);
  return `cmdl-group-${t}-${(s >>> 0).toString(36)}`;
}
function es(e, t) {
  const s = e.map((a) => {
    const n = z(a.group), r = Zt(a.group), i = !G.has(n);
    return `
      <section class="cmdl-group" data-cmdl-group data-cmdl-group-key="${c(n)}">
        <button type="button" class="cmdl-group__toggle" data-cmdl-group-toggle
          aria-expanded="${i ? "true" : "false"}" aria-controls="${c(r)}">
          <span>${c(a.group)}</span>
          <span class="cmdl-group__count">${a.items.length}</span>
          <span class="cmdl-group__chevron" aria-hidden="true">›</span>
        </button>
        <div id="${c(r)}" role="group" aria-label="${c(a.group)} commands"
          data-cmdl-group-items${i ? "" : " hidden"}>
          ${a.items.map(Yt).join("")}
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
        ${s}
        <div class="cmdl__noresults" data-cmdl-noresults hidden>No commands match your filter.</div>
      </div>
    </aside>`;
}
function ts(e) {
  return e.trim().replace(/^payload\./, "");
}
function ss(e) {
  const t = e.action;
  if (!t) return "";
  const s = t.form, a = typeof s.html == "string" ? s.html : "", n = a.trim() !== "", r = h(t.submit_label) || "Run command", i = h(t.confirm_text), o = t.requires_confirm === !0, l = e.descriptor?.mutating === !0, m = s.sensitive === !0, u = `${n && !m ? `<div class="cmdl-recall" data-cmdl-recall data-cmdl-command="${c(e.commandId)}">
      <div class="cmdl-recall__list" data-cmdl-recall-list></div>
      <button type="button" class="cmdl-recall__save" data-cmdl-save-preset>Save preset</button>
    </div>` : ""}
    <div class="cmdl-form__fields" data-cmdl-fields data-cmdl-formgen-root data-operation-id="${c(h(s.operation_id))}">
      ${n ? a : '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>'}
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
      data-panel-id="${c(N)}"
      data-action-id="${c(e.actionId)}"
      data-action-confirm="${c(i)}"
      data-action-requires-confirm="${o ? "true" : "false"}"
      data-cmdl-confirm="${d ? "true" : "false"}"
      ${d ? 'data-action-confirm-inline="true"' : ""}
      data-action-payload='${Qt(t.payload)}'>
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
function as(e) {
  const t = h(e.descriptor?.execution_mode), s = e.descriptor?.mutating === !0, a = h(e.descriptor?.summary), n = [];
  n.push(`<span class="cmdl-chip">${c(e.group)}</span>`), t && n.push(`<span class="cmdl-chip cmdl-chip--${Ge(t)}">${c(t)}</span>`), n.push(s ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>' : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'), e.executable || n.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  let r;
  return e.executable ? r = `${s ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>` : ""}${ss(e)}` : r = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`, `
    <div class="cmdl-cmd" data-cmdl-detail="${c(e.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${c(e.commandId || e.label)}</div>
        ${a ? `<div class="cmdl-cmd__summary">${c(a)}</div>` : ""}
        <div class="cmdl-cmd__chips">${n.join("")}</div>
      </div>
      ${r}
    </div>`;
}
function Le(e) {
  return e.length ? `<ul class="cmdl-diagnostics">${e.map((t) => {
    const s = S(t.severity) || "info", a = h(t.message), n = h(t.code);
    return `
        <li class="cmdl-diag cmdl-diag--${c(s)}">
          <span class="cmdl-diag__sev">${c(s)}</span>
          <span class="cmdl-diag__msg">${c(a)}${n ? ` <span class="cmdl-diag__code">${c(n)}</span>` : ""}</span>
        </li>`;
  }).join("")}</ul>` : "";
}
function ns(e) {
  const { def: t, data: s } = e, { entries: a, diagnostics: n } = Wt(t, s), r = h((t.ui?.metadata && typeof t.ui.metadata == "object" ? t.ui.metadata : {}).option_resolver_action), i = r ? ` data-cmdl-option-resolver="${c(r)}"` : "";
  if (a.length === 0) return `
      <div class="cmdl" data-cmdl-root${i}>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${Le(n)}
        <div class="cmdl-result" data-panel-action-result="${c(N)}"></div>
      </div>`;
  const o = Xt(a), l = a.map(as).join("");
  return `
    <div class="cmdl" data-cmdl-root${i}>
      <div class="cmdl__body" data-cmdl-body>
        ${es(o, a.length)}
        <div class="cmdl__resizer" data-cmdl-resizer role="separator" aria-orientation="vertical"
          aria-label="Resize command list" tabindex="0"></div>
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${l}
          <!-- Result lives in the detail column (beside the list, below the form it
               belongs to) so it appears next to where the command was run, not as a
               full-width strip under the whole console. Empty == hidden via CSS. -->
          <div class="cmdl-result" data-panel-action-result="${c(N)}"></div>
        </section>
      </div>
      ${Le(n)}
    </div>`;
}
function q(e, t) {
  for (const s of t) {
    const a = e[s];
    if (typeof a == "string" && a.trim() !== "") return a.trim();
  }
  return "";
}
var rs = [
  "category",
  "text_code",
  "source",
  "stack_trace",
  "severity",
  "location",
  "metadata"
];
function is(e, t) {
  const s = [];
  e && typeof e == "object" && !Array.isArray(e) && s.push(e.error, e), t && typeof t == "object" && !Array.isArray(t) && s.push(t.error, t);
  for (const a of s) if (a && typeof a == "object" && !Array.isArray(a)) {
    const n = a;
    if (rs.some((r) => r in n)) return n;
  }
  return null;
}
function $e(e) {
  const t = e.lastIndexOf("/");
  return t >= 0 ? e.slice(t + 1) : e;
}
function qe(e) {
  const t = e.split("/").filter(Boolean);
  return t.length > 2 ? t.slice(-2).join("/") : e;
}
function Ie(e) {
  if (typeof e == "number") return e;
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
function os(e) {
  const t = e.metadata && typeof e.metadata == "object" && !Array.isArray(e.metadata) ? e.metadata : {}, s = Object.entries(t).map(([d, f]) => ({
    key: d,
    value: Ue(f) || Je(f)
  })).filter((d) => d.value), a = (Array.isArray(e.stack_trace) ? e.stack_trace : []).map((d) => {
    const f = h(d.function), p = h(d.file), g = Ie(d.line);
    return {
      func: $e(f),
      funcTitle: f,
      loc: p ? `${qe(p)}${g ? `:${g}` : ""}` : "",
      locTitle: p ? `${p}${g ? `:${g}` : ""}` : "",
      app: p !== "" && !p.includes("/pkg/mod/")
    };
  }).filter((d) => d.func || d.loc), n = e.location && typeof e.location == "object" && !Array.isArray(e.location) ? e.location : {}, r = h(n.file), i = h(n.function), o = Ie(n.line), l = r ? `${qe(r)}${o ? `:${o}` : ""}` : "", m = [$e(i), l ? `(${l})` : ""].filter(Boolean).join(" "), u = [i, r ? `${r}${o ? `:${o}` : ""}` : ""].filter(Boolean).join(" ");
  return {
    category: h(e.category),
    textCode: h(e.text_code),
    source: h(e.source),
    severity: h(e.severity),
    timestamp: h(e.timestamp),
    httpCode: typeof e.code == "number" ? String(e.code) : h(e.code),
    metadata: s,
    location: m,
    locationTitle: u,
    stackTrace: a
  };
}
function ls(e, t, s, a) {
  const n = s && typeof s == "object" ? s : {}, r = n.receipt && typeof n.receipt == "object" ? n.receipt : {}, i = (Array.isArray(n.validation_errors) ? n.validation_errors : []).map((g) => ({
    path: h(g.path),
    message: h(g.message),
    code: h(g.code)
  })).filter((g) => g.message || g.path), o = r.Accepted ?? r.accepted, l = typeof o == "boolean" ? o : void 0;
  let m = "ok";
  e === "error" ? m = "error" : (i.length > 0 || l === !1) && (m = "invalid");
  const u = m === "error" ? is(s, a) : null, d = u ? os(u) : null;
  let f = "";
  i.length > 0 ? f = "VALIDATION_ERROR" : m === "error" && (f = d && d.textCode || q(a || {}, ["code", "text_code"]) || (d ? d.httpCode : ""));
  const p = s != null && (typeof s != "object" || Object.keys(n).length > 0);
  return {
    kind: m,
    message: h(t) || (m === "error" ? "Command failed" : "Command dispatched"),
    code: f,
    correlationId: q(r, ["CorrelationID", "correlation_id"]),
    runId: q(r, ["RunID", "run_id"]) || q(n, ["run_id", "RunID"]),
    mode: q(r, ["Mode", "mode"]),
    dispatchId: q(r, ["DispatchID", "dispatch_id"]),
    statusReference: h(n.status_reference) || h(n.statusReference),
    accepted: l,
    validationErrors: i,
    richError: d,
    hasRaw: p,
    rawJSON: p ? Je(s) : ""
  };
}
function Je(e) {
  try {
    return JSON.stringify(e, null, 2);
  } catch {
    return String(e);
  }
}
function cs(e) {
  return !Number.isFinite(e) || e < 0 ? "" : e < 1e3 ? `${Math.round(e)}ms` : `${(e / 1e3).toFixed(2)}s`;
}
function ds(e) {
  try {
    return new Date(e).toLocaleTimeString();
  } catch {
    return "";
  }
}
function v(e, t, s) {
  return s ? `<span class="cmdl-meta" title="${c(t)}"><span class="cmdl-meta__k">${c(e)}</span>${c(s)}</span>` : "";
}
function us(e, t = {}) {
  const s = e.kind === "error" ? "Dispatch failed" : e.kind === "invalid" ? e.validationErrors.length ? "Validation failed" : "Not accepted" : "Command dispatched", a = e.code ? `<span class="cmdl-result__code">${c(e.code)}</span>` : "", n = t.liveStatus, r = n ? `<span class="cmdl-result__live cmdl-result__live--${c(n.state)}" title="Live status${n.at ? ` · ${c(n.at)}` : ""}">${c(n.state)}</span>` : "", i = e.richError, o = [
    v("id", "Correlation ID", e.correlationId),
    v("mode", "Execution mode", e.mode),
    v("dispatch", "Dispatch ID", e.dispatchId),
    v("status", "Status reference", e.statusReference),
    v("took", "Round-trip duration", typeof t.durationMs == "number" ? cs(t.durationMs) : ""),
    v("at", "Dispatched at", typeof t.at == "number" && t.at > 0 ? ds(t.at) : ""),
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
        <span class="cmdl-result__status">${c(s)}</span>
        ${a}${r}
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
function He() {
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
  He();
}
function hs(e) {
  R.forEach((t, s) => {
    if (s !== e) {
      try {
        t.unsubscribe();
      } catch {
      }
      try {
        t.controller.destroy();
      } catch {
      }
      R.delete(s);
    }
  });
}
function ms() {
  const e = globalThis, t = e.FormgenRelationships && typeof e.FormgenRelationships == "object" ? e.FormgenRelationships : {}, s = e.Formgen && typeof e.Formgen == "object" ? e.Formgen : void 0;
  return {
    ...t,
    Formgen: t.Formgen || s
  };
}
function F(e) {
  const t = S(e.dataset.actionId || "");
  return t ? R.get(t) : void 0;
}
function ps(e, t) {
  const s = R.get(S(e));
  if (!s) return !1;
  const a = {};
  if (Object.entries(t || {}).forEach(([r, i]) => {
    const o = ts(r).replace(/^payload\./, "");
    if (o) {
      if (typeof i == "string") a[o] = i;
      else if (Array.isArray(i)) {
        const l = i.map(Ue).filter(Boolean);
        l.length > 0 && (a[o] = l);
      }
    }
  }), s.controller.clearErrors(), Object.keys(a).length === 0) return !0;
  s.controller.setErrors(a);
  const n = Object.keys(a)[0];
  return s.controller.focus(n), !0;
}
function fs(e, t) {
  const s = R.get(S(e));
  if (!s) return !1;
  const a = t.payload && typeof t.payload == "object" && !Array.isArray(t.payload) ? t.payload : t;
  s.controller.setValues(a);
  const n = s.controller.getValues();
  return A(s.form, n), D(s.form, n), !0;
}
function A(e, t) {
  const s = e.querySelector("[data-cmdl-controller-payload]");
  s && (s.value = JSON.stringify(t || {}));
}
function D(e, t) {
  const s = S(e.dataset.actionId || "");
  !s || L(e) || H.set(s, ze(t));
}
function ze(e) {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}
function Y(e, t, s = "") {
  e.dataset.cmdlFormgenReady = t ? "true" : "false", e.querySelectorAll("[data-cmdl-formgen-submit]").forEach((n) => {
    n.disabled = !t;
  });
  let a = e.querySelector("[data-cmdl-formgen-error]");
  s && !a && (a = document.createElement("div"), a.dataset.cmdlFormgenError = "", a.className = "cmdl-form__runtime-error", e.querySelector("[data-cmdl-fields]")?.insertAdjacentElement("afterend", a)), a && (a.textContent = s, a.hidden = s === "");
}
function gs(e) {
  return { beforeFetch(t) {
    const s = ys(t.request.url);
    if (!s) return;
    const a = e.closest("[data-cmdl-root]"), n = h(a?.dataset.cmdlDebugPath), r = h(a?.dataset.cmdlOptionResolver);
    if (!n || !r) throw new Error("Dynamic command options are unavailable because no protected resolver action is configured.");
    const i = s.searchParams.get("command_id") || h(e.dataset.cmdlCommand), o = s.searchParams.get("field_path") || "", l = s.searchParams.get("source_id") || "";
    if (!i || !o || !l) throw new Error("Dynamic command option metadata is incomplete.");
    const m = F(e)?.controller.getValues() || de(e), u = new Headers(t.request.init.headers || {});
    u.set("Accept", "application/json"), u.set("Content-Type", "application/json");
    const d = Xe();
    d && u.set("X-CSRF-Token", d), t.request.url = `${n}/api/panels/${N}/actions/${encodeURIComponent(r)}`, t.request.init.method = "POST", t.request.init.credentials = "same-origin", t.request.init.headers = u, t.request.init.body = JSON.stringify({
      command_id: i,
      field_path: o,
      source_id: l,
      payload: m
    });
  } };
}
function ys(e) {
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
  if (F(e) && e.dataset.cmdlFormgenReady === "true") return Promise.resolve();
  const s = (async () => {
    const a = S(e.dataset.actionId || ""), n = e.querySelector("[data-cmdl-formgen-root]"), r = ms();
    if (!a || !n || !r?.initFormgenRoot || !r.Formgen?.attach) {
      Y(e, !1, "The form runtime is unavailable. Refresh after loading the formgen assets.");
      return;
    }
    const i = n.querySelector("[data-formgen-auto-init]") || n;
    try {
      const o = r.Formgen.attach(i), l = H.get(a);
      l && !L(e) && o.setValues(l), R.set(a, {
        form: e,
        root: i,
        controller: o,
        unsubscribe: () => {
        }
      }), A(e, o.getValues());
      const m = await r.initFormgenRoot(i, gs(e));
      if (!e.isConnected || M !== a) {
        o.destroy(), m.destroy(i), R.delete(a);
        return;
      }
      o.destroy();
      const u = r.Formgen.attach(i, { registry: m });
      l && !L(e) && u.setValues(l);
      const d = u.onChange((p) => {
        A(e, p), D(e, p);
      });
      R.set(a, {
        form: e,
        root: i,
        controller: u,
        unsubscribe: d
      });
      const f = u.getValues();
      A(e, f), D(e, f), Y(e, !0);
    } catch (o) {
      const l = R.get(a);
      if (l?.form === e) {
        try {
          l.unsubscribe();
        } catch {
        }
        try {
          l.controller.destroy();
        } catch {
        }
        R.delete(a);
      }
      Y(e, !1, o instanceof Error ? o.message : "Unable to initialize the generated form.");
    } finally {
      X.delete(e);
    }
  })();
  return X.set(e, s), s;
}
function J(e, t, s) {
  const a = z(e.dataset.cmdlGroupKey || ""), n = e.querySelector("[data-cmdl-group-toggle]"), r = e.querySelector("[data-cmdl-group-items]");
  n?.setAttribute("aria-expanded", t ? "true" : "false"), r && (r.hidden = !t), !(!s || !a) && (t ? G.delete(a) : G.add(a));
}
function bs(e) {
  const t = e?.closest("[data-cmdl-group]");
  t && J(t, !0, !0);
}
function U(e, t) {
  M = t, hs(t);
  const s = e.querySelector("[data-cmdl-empty]");
  s && (s.hidden = !!t), e.querySelectorAll("[data-cmdl-detail]").forEach((n) => {
    n.hidden = n.dataset.cmdlDetail !== t;
  }), e.querySelectorAll("[data-cmdl-item]").forEach((n) => {
    const r = n.dataset.cmdlItem === t;
    n.classList.toggle("cmdl-item--active", r), r ? n.setAttribute("aria-current", "true") : n.removeAttribute("aria-current");
  }), bs(e.querySelector(`[data-cmdl-item="${ie(t)}"]`));
  const a = e.querySelector(`[data-cmdl-detail="${ie(t)}"]`);
  if (a) {
    const n = a.querySelector("[data-panel-action-form]");
    n && le(n);
  }
}
function De(e, t) {
  const s = t.trim().toLowerCase();
  let a = !1;
  e.querySelectorAll("[data-cmdl-item]").forEach((r) => {
    const i = r.dataset.cmdlSearch || "", o = s === "" || i.includes(s);
    r.hidden = !o, o && (a = !0);
  }), e.querySelectorAll("[data-cmdl-group]").forEach((r) => {
    const i = Array.from(r.querySelectorAll("[data-cmdl-item]")).some((o) => !o.hidden);
    r.hidden = !i, i && J(r, s !== "" || !G.has(z(r.dataset.cmdlGroupKey || "")), !1);
  });
  const n = e.querySelector("[data-cmdl-noresults]");
  n && (n.hidden = a);
}
function xe(e) {
  return Array.from(e.querySelectorAll("[data-cmdl-item]")).filter((t) => {
    if (t.hidden) return !1;
    const s = t.closest("[data-cmdl-group]"), a = t.closest("[data-cmdl-group-items]");
    return !s?.hidden && !a?.hidden;
  });
}
function Ss(e) {
  if (!S(e.dataset.actionId || "")) return;
  const t = F(e)?.controller?.getValues() || de(e);
  A(e, t), D(e, t);
}
var vs = 6, x = Be();
function Rs(e) {
  e !== x && (x = e, _ = 0);
}
function T(e) {
  try {
    const t = x.get(e), s = t ? JSON.parse(t) : [];
    return Array.isArray(s) ? s : [];
  } catch {
    return [];
  }
}
function ne(e, t) {
  try {
    x.set(e, JSON.stringify(t));
  } catch {
  }
}
function ce(e) {
  return `cmdl:recent:${e}`;
}
function I(e) {
  return `cmdl:preset:${e}`;
}
function Es(e) {
  const t = e && typeof e == "object" ? e : {}, s = h(t.command_id), a = t.payload && typeof t.payload == "object" ? t.payload : {};
  if (!s || Object.keys(a).length === 0) return;
  const n = ce(s), r = JSON.stringify(a), i = T(n).filter((o) => JSON.stringify(o.payload) !== r);
  i.unshift({
    at: Date.now(),
    payload: a
  }), ne(n, i.slice(0, vs));
}
function Ke(e) {
  return L(e) ? {} : F(e)?.controller.getValues() || de(e);
}
function de(e) {
  const t = e.querySelector("[data-cmdl-controller-payload]");
  if (!t?.value) return {};
  try {
    const s = JSON.parse(t.value);
    return s && typeof s == "object" && !Array.isArray(s) ? s : {};
  } catch {
    return {};
  }
}
function Qe(e, t) {
  const s = F(e);
  if (s) {
    s.controller.setValues(t), A(e, s.controller.getValues()), D(e, s.controller.getValues());
    return;
  }
  const a = S(e.dataset.actionId || "");
  a && !L(e) && H.set(a, ze(t)), le(e);
}
function re(e) {
  const t = h(e.dataset.cmdlCommand), s = e.querySelector("[data-cmdl-recall-list]");
  if (!t || !s) return;
  const a = T(ce(t)), n = T(I(t)), r = [];
  a.forEach((i, o) => {
    r.push(`<button type="button" class="cmdl-recall__chip" data-cmdl-load="recent:${o}" title="Reload recent invocation ${o + 1}">↻ recent ${o + 1}</button>`);
  }), n.forEach((i, o) => {
    const l = h(i.name) || `preset ${o + 1}`;
    r.push(`<span class="cmdl-recall__preset"><button type="button" class="cmdl-recall__chip cmdl-recall__chip--preset" data-cmdl-load="preset:${o}" title="Load saved preset">★ ${c(l)}</button><button type="button" class="cmdl-recall__del" data-cmdl-del-preset="${o}" aria-label="Delete preset ${c(l)}">×</button></span>`);
  }), s.innerHTML = r.length ? r.join("") : '<span class="cmdl-recall__empty">No recent runs yet.</span>';
}
function ws(e, t) {
  const s = e.closest("[data-cmdl-load]");
  if (s) {
    const r = s.closest("[data-panel-action-form]"), i = h(s.closest("[data-cmdl-recall]")?.dataset.cmdlCommand), [o, l] = (s.dataset.cmdlLoad || "").split(":"), m = Number(l);
    if (r && i && Number.isInteger(m)) {
      const u = T(o === "preset" ? I(i) : ce(i))[m]?.payload;
      u && typeof u == "object" && Qe(r, u);
    }
    return !0;
  }
  const a = e.closest("[data-cmdl-save-preset]");
  if (a) {
    const r = a.closest("[data-panel-action-form]"), i = a.closest("[data-cmdl-recall]"), o = h(i?.dataset.cmdlCommand);
    if (r && i && o) {
      const l = (typeof window < "u" && typeof window.prompt == "function" ? window.prompt("Preset name") : "") || "";
      if (l.trim()) {
        const m = T(I(o)).filter((u) => h(u.name) !== l.trim());
        m.unshift({
          name: l.trim(),
          payload: Ke(r)
        }), ne(I(o), m), re(i);
      }
    }
    return !0;
  }
  const n = e.closest("[data-cmdl-del-preset]");
  if (n) {
    const r = n.closest("[data-cmdl-recall]"), i = h(r?.dataset.cmdlCommand), o = Number(n.dataset.cmdlDelPreset);
    if (r && i && Number.isInteger(o)) {
      const l = T(I(i));
      l.splice(o, 1), ne(I(i), l), re(r);
    }
    return !0;
  }
  return !1;
}
function Ps(e, t) {
  if (L(e)) return;
  const s = e.querySelector("[data-cmdl-fields]"), a = e.querySelector("[data-cmdl-json]"), n = e.querySelector("[data-cmdl-json-editor]"), r = e.querySelector("[data-cmdl-json-toggle]"), i = e.querySelector("[data-cmdl-json-error]");
  if (!s || !a || !n) return;
  if (t) {
    n.value = JSON.stringify(Ke(e), null, 2), i && (i.hidden = !0), s.hidden = !0, a.hidden = !1, e.dataset.cmdlMode = "json", r && (r.textContent = "Form");
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
  Qe(e, o), s.hidden = !1, a.hidden = !0, e.dataset.cmdlMode = "form", r && (r.textContent = "JSON");
}
function _s() {
  const e = Number(x.get(Ve));
  return Number.isFinite(e) && e >= oe ? e : 0;
}
function Cs(e) {
  const t = e.clientWidth || 0;
  return t > 0 ? Math.max(oe, t - Jt) : Gt;
}
function Z(e, t) {
  const s = Math.min(Math.max(Math.round(t), oe), Cs(e));
  return _ = s, e.style.setProperty("--cmdl-sidebar-w", `${s}px`), x.set(Ve, String(s)), s;
}
function As(e) {
  _ || (_ = _s()), _ && e.style.setProperty("--cmdl-sidebar-w", `${_}px`);
}
function Ls(e) {
  const t = e.querySelector("[data-cmdl-resizer]"), s = e.querySelector("[data-cmdl-body]");
  !t || !s || (As(s), t.addEventListener("pointerdown", (a) => {
    a.preventDefault();
    const n = a.clientX, r = _ || Ce;
    if (typeof t.setPointerCapture == "function") try {
      t.setPointerCapture(a.pointerId);
    } catch {
    }
    const i = (l) => Z(s, r + (l.clientX - n)), o = (l) => {
      Z(s, r + (l.clientX - n)), t.removeEventListener("pointermove", i), t.removeEventListener("pointerup", o), t.removeEventListener("pointercancel", o);
    };
    t.addEventListener("pointermove", i), t.addEventListener("pointerup", o), t.addEventListener("pointercancel", o);
  }), t.addEventListener("keydown", (a) => {
    a.key !== "ArrowLeft" && a.key !== "ArrowRight" || (a.preventDefault(), Z(s, (_ || Ce) + (a.key === "ArrowRight" ? Ht : -24)));
  }));
}
function ee(e, t) {
  const s = e.querySelector("[data-cmdl-bar-main]"), a = e.querySelector("[data-cmdl-confirm-row]");
  if (!s || !a) return;
  s.hidden = t, a.hidden = !t;
  const n = t ? a.querySelector("[data-cmdl-confirm-run]") : s.querySelector("button");
  if (n && typeof n.focus == "function") try {
    n.focus();
  } catch {
  }
}
function $s(e, t = {}) {
  const s = e.querySelector("[data-cmdl-root]");
  if (!s) return;
  He(), s.dataset.cmdlDebugPath = h(t.debugPath), Ls(s), s.querySelectorAll("[data-cmdl-recall]").forEach((i) => re(i));
  const a = s.querySelector("[data-cmdl-filter]");
  a && (a.value = W, De(s, W)), M && s.querySelector(`[data-cmdl-item="${ie(M)}"]`) && U(s, M);
  const n = s.querySelector("[data-cmdl-groups]"), r = s.querySelector("[data-cmdl-detailcol]");
  n && (n.scrollTop = Pe), r && (r.scrollTop = _e), s.addEventListener("scroll", (i) => {
    n && i.target === n && (Pe = n.scrollTop), r && i.target === r && (_e = r.scrollTop);
  }, !0), s.addEventListener("click", (i) => {
    const o = i.target, l = o.closest("[data-cmdl-group-toggle]");
    if (l) {
      const p = l.closest("[data-cmdl-group]");
      p && J(p, l.getAttribute("aria-expanded") !== "true", !0);
      return;
    }
    if (ws(o, s)) return;
    const m = o.closest("[data-cmdl-json-toggle]");
    if (m) {
      const p = m.closest("[data-panel-action-form]");
      p && Ps(p, p.dataset.cmdlMode !== "json");
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
      U(s, f.dataset.cmdlItem || "");
      return;
    }
  }), a && (a.addEventListener("input", () => {
    W = a.value, De(s, a.value);
  }), a.addEventListener("keydown", (i) => {
    if (i.key === "ArrowDown" || i.key === "Enter") {
      const o = xe(s)[0];
      o && (i.preventDefault(), i.key === "Enter" ? U(s, o.dataset.cmdlItem || "") : o.focus());
    }
  })), s.addEventListener("submit", (i) => {
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
      Ss(o), o.dataset.cmdlConfirm === "true" && (delete o.dataset.cmdlArmed, ee(o, !1));
    }
  }, !0), s.addEventListener("keydown", (i) => {
    const o = i.target, l = o.closest("[data-cmdl-group-toggle]");
    if (l && (i.key === "Enter" || i.key === " ")) {
      i.preventDefault();
      const u = l.closest("[data-cmdl-group]");
      u && J(u, l.getAttribute("aria-expanded") !== "true", !0);
      return;
    }
    const m = o.closest("[data-cmdl-item]");
    if (m && (i.key === "ArrowDown" || i.key === "ArrowUp")) {
      i.preventDefault();
      const u = xe(s), d = u.indexOf(m), f = u[i.key === "ArrowDown" ? d + 1 : d - 1];
      f ? f.focus() : i.key === "ArrowUp" && a && a.focus();
      return;
    }
    m && i.key === "Enter" && (i.preventDefault(), U(s, m.dataset.cmdlItem || ""));
  }), s.addEventListener("reset", (i) => {
    const o = i.target, l = S(o.dataset.actionId || "");
    l && H.delete(l), window.setTimeout(() => {
      const m = F(o);
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
Ft(N, ns);
var Fe = "debug-console-active-panel", Oe = "debug-console-panel-order", qs = 5e3, Is = 15e3, Ts = 1e4, ke = [
  5e3,
  1e4,
  2e4,
  4e4,
  6e4
], Ds = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, Me = (e) => {
  if (!e) return null;
  try {
    return JSON.parse(e);
  } catch {
    return null;
  }
}, xs = (e) => Array.isArray(e) && e.length > 0 ? e.filter((t) => typeof t == "string" && t.trim()).map((t) => t.trim()) : Ct(), te = (e, t) => _t(e, t), Fs = (e, t, s) => {
  if (!e || !t) return;
  const a = t.split(".").map((r) => r.trim()).filter(Boolean);
  if (a.length === 0) return;
  let n = e;
  for (let r = 0; r < a.length - 1; r += 1) {
    const i = a[r];
    (!n[i] || typeof n[i] != "object") && (n[i] = {}), n = n[i];
  }
  n[a[a.length - 1]] = s;
}, se = (e, t) => {
  if (!e) return t;
  const s = Number(e);
  return Number.isNaN(s) ? t : s;
}, Os = (e) => e.closest("[data-debug-root]") || e.ownerDocument || document, Ne = (e) => {
  try {
    return JSON.parse(JSON.stringify(e));
  } catch {
    return { ...e };
  }
}, ks = class {
  constructor(e) {
    this.savedPanelOrder = null, this.customFilterState = {}, this.paused = !1, this.logsExpanded = /* @__PURE__ */ new Set(), this.jserrorsExpanded = /* @__PURE__ */ new Set(), this.pauseButton = null, this.eventCount = 0, this.lastEventAt = null, this.sessions = [], this.sessionsLoading = !1, this.sessionsLoaded = !1, this.sessionsError = null, this.sessionsUpdatedAt = null, this.activeSessionId = null, this.activeSession = null, this.replLoadGeneration = 0, this.jsonPathLoadGeneration = 0, this.jsonPathResult = null, this.sessionBannerEl = null, this.sessionMetaEl = null, this.sessionDetachEl = null, this.unsubscribeRegistry = null, this.expandedRequests = /* @__PURE__ */ new Set(), this.tabsSortable = null, this.panelActionResults = /* @__PURE__ */ new Map(), this.commandLauncherLastPayloads = /* @__PURE__ */ new Map(), this.commandRunStateGeneration = 0, this.commandRunGenerations = /* @__PURE__ */ new Map(), this.commandRunSnapshotBaseline = null, this.commandRunReconcileTimer = null, this.commandRunReconcileInFlight = !1, this.commandRunReconcileFailures = 0, this.commandRunSnapshotAbort = null, this.destroyed = !1, this.listenerCleanup = [], this.handleVisibilityChange = () => {
      this.destroyed || (document.visibilityState === "hidden" ? this.stopCommandRunReconciliation() : this.activePanel === "command_runs" && this.beginCommandRunSnapshotRequest("visibility"));
    }, this.handlePageHide = () => {
      this.destroyed || this.stopCommandRunReconciliation(!0);
    }, this.container = e, this.browserState = Be(e.dataset.preferencesNamespace), Rs(this.browserState);
    const t = Me(e.dataset.panels), s = xs(t);
    s.includes("sessions") || s.push("sessions"), this.availablePanels = this.normalizeAvailablePanelIDs(s), this.savedPanelOrder = this.loadStoredPanelOrder(), this.panels = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder), this.activePanel = this.panels[0] || "template", this.debugPath = e.dataset.debugPath || "", this.panelOrderPreferencesPath = e.dataset.panelOrderPreferencesPath || "", this.streamBasePath = this.debugPath, this.maxLogEntries = se(e.dataset.maxLogEntries, 500), this.maxSQLQueries = se(e.dataset.maxSqlQueries, 200), this.slowThresholdMs = se(e.dataset.slowThresholdMs, 50), this.replCommands = qt(Me(e.dataset.replCommands)), this.state = {
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
    }, this.replPanels = /* @__PURE__ */ new Map(), this.panelRenderers = /* @__PURE__ */ new Map(), It.forEach((a) => {
      this.panelRenderers.set(a, {
        render: () => this.renderReplPanel(a),
        filters: () => '<span class="timestamp">REPL controls are in the panel header.</span>'
      });
    }), this.eventToPanel = Q(), this.root = Os(e), this.tabsEl = this.requireElement("[data-debug-tabs]", this.root), this.panelEl = this.requireElement("[data-debug-panel]", this.root), this.filtersEl = this.requireElement("[data-debug-filters]", this.root), this.statusEl = this.root.querySelector("[data-debug-status]") || this.container, this.connectionEl = this.requireElement("[data-debug-connection]", this.root), this.eventCountEl = this.requireElement("[data-debug-events]", this.root), this.lastEventEl = this.requireElement("[data-debug-last]", this.root), this.sessionBannerEl = this.root.querySelector("[data-debug-session-banner]"), this.sessionMetaEl = this.root.querySelector("[data-debug-session-meta]"), this.sessionDetachEl = this.root.querySelector("[data-debug-session-detach]"), this.sessionDetachEl && this.listen(this.sessionDetachEl, "click", () => this.detachSession()), this.sqlView = new wt({
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
      shouldDisplay: (a) => this.sqlEntryMatchesFilters(a),
      onNeedFullRender: () => this.renderPanel(),
      onPendingChange: (a) => this.updatePauseIndicator(a)
    }), this.logsView = new K({
      styles: y,
      keyOf: ye,
      renderRow: (a) => gt(a, y, {
        showSource: !0,
        truncateMessage: !1,
        expandable: !0
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (a) => this.logEntryMatchesFilters(a),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (a) => ge(a, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.logsExpanded
      }),
      onRestore: (a) => fe(a, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.logsExpanded
      }),
      onEvict: (a) => a.forEach((n) => this.logsExpanded.delete(n)),
      onAfterAppend: () => {
        this.attachCopyButtonListeners(), this.applyLogsAutoScroll();
      }
    }), this.requestsView = new K({
      styles: y,
      containerSelector: "[data-request-table] tbody",
      rowSelector: "tr[data-request-id]",
      keyAttr: "data-request-id",
      keyOf: ct,
      renderRow: (a) => ht(a, y, {
        expandedRequestIds: this.expandedRequests,
        truncatePath: !1,
        slowThresholdMs: this.slowThresholdMs
      }),
      getRenderOptions: () => ({ newestFirst: this.filters.requests.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      shouldDisplay: (a) => this.requestEntryMatchesFilters(a),
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (a) => it(a, this.expandedRequests, { useIconFeedback: !0 })
    }), this.jserrorsView = new K({
      styles: y,
      keyOf: mt,
      renderRow: (a) => St(a, y, { compact: !1 }),
      getRenderOptions: () => ({ newestFirst: this.filters.logs.newestFirst }),
      getMaxEntries: () => this.maxLogEntries,
      onNeedFullRender: () => this.renderPanel(),
      onAdopt: (a) => ge(a, {
        tableSelector: "[data-live-list]",
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      }),
      onRestore: (a) => fe(a, {
        rowSelector: "tr.expandable-row",
        keyAttr: "data-row-key",
        expanded: this.jserrorsExpanded
      })
    }), this.registryLiveList = new ft({
      styles: y,
      getRenderOptions: () => ({}),
      shouldDisplay: (a, n) => {
        if (!a.applyFilters) return !0;
        const r = this.getPanelFilterState(a.id, a), i = a.applyFilters([n], r);
        return Array.isArray(i) ? i.length > 0 : !0;
      },
      onNeedFullRender: () => this.renderPanel()
    }), this.bindActions(), this.updateSessionBanner(), this.stream = new pe({
      basePath: this.streamBasePath,
      onEvent: (a) => this.handleEvent(a),
      onStatusChange: (a) => this.updateConnectionStatus(a),
      onSnapshotInvalidated: () => this.beginCommandRunSnapshotRequest("invalidation", !0)
    }), document.addEventListener("visibilitychange", this.handleVisibilityChange), window.addEventListener("pagehide", this.handlePageHide), this.unsubscribeRegistry = P.subscribe((a) => this.handleRegistryChange(a)), this.initializeServerDefinitions();
  }
  async initializeServerDefinitions() {
    const e = await this.loadServerPanelOrderPreference();
    this.destroyed || (this.applyPanelOrder(), await Mt(this.debugPath), !this.destroyed && (this.eventToPanel = Q(), this.applyPanelOrder(), e && this.persistPanelOrder(), this.restoreActivePanel(), this.renderTabs(), this.renderActivePanel(), this.fetchSnapshot(), this.stream.connect(), this.subscribeToEvents()));
  }
  subscribeToEvents() {
    const e = /* @__PURE__ */ new Set();
    for (const t of this.panels) for (const s of Tt(t)) e.add(s);
    this.stream.subscribe(Array.from(e));
  }
  normalizeStoredPanelID(e) {
    const t = typeof e == "string" ? e.trim() : "";
    return t && this.panels.includes(t) ? t : null;
  }
  restoreActivePanel() {
    let e = null, t = null;
    try {
      e = this.normalizeStoredPanelID(this.browserState.get(Fe, "session"));
      const s = new URLSearchParams(window.location.search);
      t = this.normalizeStoredPanelID(s.get("panel"));
      const a = Re(s.toString());
      !t && (a.runID || a.dispatchID || a.correlationID) && this.panels.includes("command_runs") && (t = "command_runs"), t === "command_runs" && Ee(a);
    } catch {
      e = null, t = null;
    }
    this.activePanel = t || e || this.normalizeStoredPanelID(this.activePanel) || this.panels[0] || "template";
  }
  persistActivePanel() {
    this.browserState.set(Fe, this.activePanel, "session");
  }
  replacePanelURL(e, t = "", s = "", a = "") {
    try {
      const n = window.location.href, r = e === "command_runs" ? Se(n, {
        runID: t,
        dispatchID: s,
        correlationID: a
      }) : (() => {
        const i = new URL(n);
        return i.searchParams.set("panel", e), i.searchParams.delete("run_id"), i.searchParams.delete("dispatch_id"), i.searchParams.delete("correlation_id"), `${i.pathname}${i.search}${i.hash}`;
      })();
      window.history.replaceState(window.history.state, "", r);
    } catch {
    }
  }
  persistPanelOrder() {
    this.browserState.set(Oe, JSON.stringify(this.panels));
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
      const s = await $(t);
      return !s?.available || !s.found ? !1 : (this.savedPanelOrder = this.normalizeAvailablePanelIDs(s.panel_order), this.savedPanelOrder.length > 0);
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
      const e = this.browserState.get(Oe);
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
    return !t || !Ds.test(t) ? null : t;
  }
  normalizeAvailablePanelIDs(e) {
    if (!Array.isArray(e)) return [];
    const t = [], s = /* @__PURE__ */ new Set();
    for (const a of e) {
      const n = this.normalizePanelID(a);
      !n || s.has(n) || (s.add(n), t.push(n));
    }
    return t;
  }
  normalizeSavedPanelOrder(e) {
    const t = this.normalizeAvailablePanelIDs(e);
    return t.length > 0 ? t : null;
  }
  mergePanelOrder(e, t) {
    const s = this.normalizeAvailablePanelIDs(e);
    if (!t || t.length === 0) return s;
    const a = new Set(s), n = [];
    for (const r of t) a.has(r) && (n.push(r), a.delete(r));
    for (const r of s) a.has(r) && n.push(r);
    return n;
  }
  applyPanelOrder() {
    const e = this.mergePanelOrder(this.availablePanels, this.savedPanelOrder);
    this.panels = e.length > 0 ? e : this.availablePanels, this.restoreActivePanel();
  }
  initTabDragDrop() {
    this.tabsSortable && (this.tabsSortable.destroy(), this.tabsSortable = null), this.tabsSortable = Ze.create(this.tabsEl, {
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
        const e = Array.from(this.tabsEl.querySelectorAll("[data-panel]")).map((s) => s.dataset.panel || "").filter(Boolean), t = this.mergePanelOrder(this.availablePanels, e);
        t.length > 0 && (this.savedPanelOrder = t, this.panels = t, this.persistPanelOrder(), this.saveServerPanelOrderPreference(t));
      }
    });
  }
  handleRegistryChange(e) {
    const t = this.normalizePanelID(e.panelId), s = this.activePanel, a = e.type === "unregister" && t === s;
    this.eventToPanel = Q(), e.type === "register" ? (t && !this.availablePanels.includes(t) && this.availablePanels.push(t), t && e.panel && e.panel.defaultFilters !== void 0 && !(t in this.customFilterState) && (this.customFilterState[t] = this.cloneFilterState(e.panel.defaultFilters))) : e.type === "unregister" && t && (this.availablePanels = this.availablePanels.filter((r) => r !== t), delete this.customFilterState[t]), this.applyPanelOrder();
    const n = s !== this.activePanel;
    this.subscribeToEvents(), this.renderTabs(), (a || n || t === this.activePanel) && this.renderActivePanel();
  }
  requireElement(e, t = this.container) {
    const s = t.querySelector(e);
    if (!s) throw new Error(`Missing debug element: ${e}`);
    return s;
  }
  listen(e, t, s) {
    e.addEventListener(t, s), this.listenerCleanup.push(() => e.removeEventListener(t, s));
  }
  bindActions() {
    this.listen(this.tabsEl, "click", (e) => {
      const t = e.target;
      if (!t) return;
      const s = t.closest("[data-panel]");
      if (!s) return;
      const a = s.dataset.panel || "";
      !a || a === this.activePanel || (this.activePanel = a, this.persistActivePanel(), this.replacePanelURL(a), this.renderActivePanel(), a === "command_runs" ? this.beginCommandRunSnapshotRequest("activation") : this.stopCommandRunReconciliation());
    }), this.listen(this.container, "click", (e) => {
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
    }), this.listen(this.panelEl, "click", (e) => {
      const t = e.target;
      if (!t) return;
      const s = t.closest("[data-doctor-action-navigate]");
      if (s && !s.disabled) {
        this.navigateFromDoctorAction(s);
        return;
      }
      const a = t.closest("[data-doctor-action-run]");
      if (!a || a.disabled) return;
      const n = a.dataset.doctorActionRun || "", r = a.dataset.doctorActionConfirm || "", i = a.dataset.doctorActionRequiresConfirmation === "true";
      this.runDoctorAction(n, r, i);
    }), this.listen(this.panelEl, Ot, (e) => {
      if (this.activePanel !== "command_runs") return;
      const t = e.detail, s = typeof t?.runID == "string" ? t.runID : "";
      s && this.replacePanelURL("command_runs", s);
    });
  }
  renderTabs() {
    const e = this.panels.map((t) => {
      const s = t === this.activePanel ? "debug-tab--active" : "", a = Bt(Lt(t), {
        size: "14px",
        extraClass: "debug-tab__icon"
      });
      return `
          <button class="debug-tab ${s}" data-panel="${c(t)}">
            ${a}
            <span class="debug-tab__label">${c(V(t))}</span>
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
    const s = this.panelRenderers.get(e);
    if (s?.filters) t = s.filters();
    else {
      const a = P.get(e);
      if (a?.showFilters === !1) {
        this.filtersEl.innerHTML = '<span class="timestamp">No filters</span>';
        return;
      }
      if (a?.renderFilters) {
        const n = this.getPanelFilterState(e, a), r = a.renderFilters(n);
        this.filtersEl.innerHTML = r || '<span class="timestamp">No filters</span>', r && this.bindFilterInputs();
        return;
      }
    }
    if (!s?.filters && e === "requests") {
      const a = this.filters.requests, n = this.getUniqueContentTypes();
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
      ], a.method)}
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
      ], a.status)}
          </select>
        </div>
        <div class="debug-filter">
          <label>Content-Type</label>
          <select data-filter="contentType">
            ${this.renderSelectOptions(["all", ...n], a.contentType)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(a.search)}" placeholder="/admin/users" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="hasBody" ${a.hasBody ? "checked" : ""} />
          <span>Has Body</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${a.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!s?.filters && e === "sql") {
      const a = this.filters.sql;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(a.search)}" placeholder="SELECT" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="slowOnly" ${a.slowOnly ? "checked" : ""} />
          <span>Slow only</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="errorOnly" ${a.errorOnly ? "checked" : ""} />
          <span>Errors</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${a.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
      `;
    } else if (!s?.filters && e === "logs") {
      const a = this.filters.logs;
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
      ], a.level)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(a.search)}" placeholder="database" />
        </div>
        <label class="debug-btn">
          <input type="checkbox" data-filter="newestFirst" ${a.newestFirst ? "checked" : ""} />
          <span>Newest first</span>
        </label>
        <label class="debug-btn">
          <input type="checkbox" data-filter="autoScroll" ${a.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
      `;
    } else if (!s?.filters && e === "routes") {
      const a = this.filters.routes;
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
      ], a.method)}
          </select>
        </div>
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(a.search)}" placeholder="/admin" />
        </div>
      `;
    } else if (!s?.filters && e === "sessions") {
      const a = this.filters.sessions;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search</label>
          <input type="search" data-filter="search" value="${c(a.search)}" placeholder="user, session id, path" />
        </div>
      `;
    } else if (!s?.filters) {
      const a = this.filters.objects;
      t = `
        <div class="debug-filter debug-filter--grow">
          <label>Search (JSONPath supported)</label>
          <input type="search" data-filter="search" value="${c(a.search)}" placeholder="user.roles[0].name" />
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
    const e = this.activePanel, t = this.filtersEl.querySelectorAll("[data-filter]"), s = P.get(e);
    if (s?.renderFilters) {
      const a = this.getPanelFilterState(e, s), n = a && typeof a == "object" && !Array.isArray(a) ? { ...a } : {};
      t.forEach((r) => {
        const i = r.dataset.filter || "";
        if (!i) return;
        const o = n[i];
        n[i] = this.readFilterInputValue(r, o);
      }), this.customFilterState[e] = n, this.renderPanel();
      return;
    }
    if (e === "requests") {
      const a = { ...this.filters.requests };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r === "newestFirst" || r === "hasBody" ? a[r] = n.checked : r && r in a && (a[r] = n.value);
      }), this.filters.requests = a;
    } else if (e === "sql") {
      const a = { ...this.filters.sql };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r === "slowOnly" || r === "errorOnly" || r === "newestFirst" ? a[r] = n.checked : r === "search" && (a[r] = n.value);
      }), this.filters.sql = a;
    } else if (e === "logs") {
      const a = { ...this.filters.logs };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r === "autoScroll" || r === "newestFirst" ? a[r] = n.checked : (r === "level" || r === "search") && (a[r] = n.value);
      }), this.filters.logs = a;
    } else if (e === "routes") {
      const a = { ...this.filters.routes };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in a && (a[r] = n.value);
      }), this.filters.routes = a;
    } else if (e === "sessions") {
      const a = { ...this.filters.sessions };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in a && (a[r] = n.value);
      }), this.filters.sessions = a;
    } else {
      const a = { ...this.filters.objects };
      t.forEach((n) => {
        const r = n.dataset.filter || "";
        r && r in a && (a[r] = n.value);
      }), this.filters.objects = a, this.jsonPathLoadGeneration += 1, this.jsonPathResult = null;
    }
    this.renderPanel();
  }
  getPanelFilterState(e, t) {
    const s = t || P.get(e);
    return s ? (e in this.customFilterState || (this.customFilterState[e] = s.defaultFilters !== void 0 ? this.cloneFilterState(s.defaultFilters) : {}), this.customFilterState[e]) : {};
  }
  cloneFilterState(e) {
    return Array.isArray(e) ? [...e] : e && typeof e == "object" ? { ...e } : e;
  }
  readFilterInputValue(e, t) {
    if (e instanceof HTMLInputElement && e.type === "checkbox") return e.checked;
    const s = e.value;
    if (typeof t == "number") {
      const a = Number(s);
      return Number.isNaN(a) ? t : a;
    }
    return typeof t == "boolean" ? s === "true" || s === "1" || s.toLowerCase() === "yes" : s;
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
    let s = "";
    if (e === "template") s = this.renderJSONPanel("Template Context", this.state.template, this.filters.objects.search);
    else if (e === "session") s = this.renderJSONPanel("Session", this.state.session, this.filters.objects.search);
    else if (e === "config") s = this.renderJSONPanel("Config", this.state.config, this.filters.objects.search);
    else if (e === "requests") s = this.renderRequests();
    else if (e === "sql") s = this.renderSQL();
    else if (e === "logs") s = this.renderLogs();
    else if (e === "routes") s = this.renderRoutes();
    else if (e === "sessions") s = this.renderSessionsPanel();
    else if (e === "custom") s = this.renderCustom();
    else if (e === "jserrors") s = Rt(this.state.extra.jserrors || [], y, {
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
        s = (n.renderConsole || n.render)(i, y, { newestFirst: this.filters.logs.newestFirst });
      } else s = this.renderJSONPanel(V(e), this.state.extra[e], this.filters.objects.search);
    }
    Te(), this.panelEl.innerHTML = s, e === "logs" && this.applyLogsAutoScroll(), this.attachExpandableRowListeners(), this.attachCopyButtonListeners(), e === "requests" && this.requestsView.adopt(this.panelEl), e === "sql" && this.mountSQLView(), e === "logs" && this.logsView.adopt(this.panelEl), e === "jserrors" && this.jserrorsView.adopt(this.panelEl);
    const a = P.get(e);
    a && this.registryLiveList.handles(a) && this.registryLiveList.adopt(a, this.panelEl), e === "sessions" && this.attachSessionActions(), this.attachPanelActionListeners(), e === "commands" && $s(this.panelEl, { debugPath: this.debugPath }), this.renderStoredPanelActionResult(e);
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
        const s = e.querySelector('button[type="submit"]') || void 0;
        s?.disabled || this.runPanelAction(e, s);
      });
    });
  }
  async runPanelAction(e, t, s) {
    const a = e.dataset.panelId || "", n = e.dataset.actionId || "";
    if (!this.debugPath || !a || !n) return;
    const r = e.dataset.actionConfirm || "", i = e.dataset.actionRequiresConfirm === "true";
    if (e.dataset.actionConfirmInline !== "true" && (i || r) && !window.confirm(r || "Run this debug panel action?")) return;
    const o = s || me(e);
    let l = o;
    a === "commands" && e instanceof HTMLFormElement && (l = me(e, { excludeSensitive: !0 }), L(e) ? this.commandLauncherLastPayloads.delete(n) : this.commandLauncherLastPayloads.set(n, Ne(o))), t && (t.disabled = !0);
    const m = Date.now();
    try {
      const u = await w(`${this.debugPath}/api/panels/${encodeURIComponent(a)}/actions/${encodeURIComponent(n)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o)
      });
      if (!u.ok) {
        const f = await Ye(u, `Action failed (${u.status})`, { appendStatusToFallback: !1 });
        this.showPanelActionResult(a, "error", f.message, n, f.payload, void 0, {
          at: Date.now(),
          durationMs: Date.now() - m
        });
        return;
      }
      const d = await $(u);
      this.showPanelActionResult(a, d.ok === !1 ? "error" : "ok", d.message || (d.ok === !1 ? "Action failed" : "Action complete"), n, d.data, d.errors, {
        at: Date.now(),
        durationMs: Date.now() - m
      }), a === "commands" && Es(l), d.event && this.handleEvent(d.event), d.refresh && await this.fetchSnapshot();
    } catch (u) {
      const d = u instanceof Error ? u.message : "Action failed";
      this.showPanelActionResult(a, "error", d, n, void 0, void 0, {
        at: Date.now(),
        durationMs: Date.now() - m
      });
    } finally {
      t && (t.disabled = !1);
    }
  }
  showPanelActionResult(e, t, s, a, n, r, i) {
    if (this.panelActionResults.set(e, {
      status: t,
      message: s,
      actionID: a,
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
    const s = Array.from(this.panelEl.querySelectorAll("[data-panel-action-result]")).find((r) => r.dataset.panelActionResult === e);
    if (!s) return;
    if (e === "commands") {
      const r = ls(t.status, t.message, t.data, t.errors), i = {};
      r.validationErrors.forEach((u) => {
        u.path && (i[u.path] = u.message || u.code);
      }), t.errors && typeof t.errors == "object" && Object.assign(i, t.errors), (!t.actionID || !ps(t.actionID, i)) && this.renderPanelActionErrors(i, t.actionID);
      const o = !!(t.actionID && this.commandLauncherLastPayloads.has(t.actionID)), l = Kt(r.correlationId || r.runId || r.dispatchId), m = r.runId || l?.runID || r.dispatchId || l?.dispatchID || r.correlationId || l?.correlationID ? Se(window.location.href, {
        runID: r.runId || l?.runID,
        dispatchID: r.dispatchId || l?.dispatchID,
        correlationID: r.correlationId || l?.correlationID
      }) : "";
      s.innerHTML = us(r, {
        canRetry: o,
        at: t.at,
        durationMs: t.durationMs,
        liveStatus: l,
        commandRunsHref: m
      }), this.attachCommandLauncherResultActions(s, t.actionID);
      return;
    }
    const a = this.renderPanelActionErrors(t.errors, t.actionID), n = t.data === void 0 ? "" : `<pre class="${y.jsonPanel}" style="margin-top:0.5rem;max-height:18rem;overflow:auto;white-space:pre-wrap">${c(tt(t.data, { nullAsEmptyObject: !1 }))}</pre>`;
    s.innerHTML = `<div class="${t.status === "error" ? y.badgeError : y.badge}">${c(t.message)}</div>${a}${n}`;
  }
  attachCommandLauncherResultActions(e, t) {
    const s = e.querySelector("[data-cmdl-dismiss]");
    s && s.addEventListener("click", () => {
      this.panelActionResults.delete("commands"), e.innerHTML = "";
    });
    const a = e.querySelector("[data-cmdl-retry]");
    !a || !t || a.addEventListener("click", () => {
      this.retryCommandLauncherAction(t, a);
    });
  }
  retryCommandLauncherAction(e, t) {
    const s = this.commandLauncherLastPayloads.get(e);
    if (!s) return;
    const a = Array.from(this.panelEl.querySelectorAll("[data-panel-action-form]")).find((n) => n.dataset.panelId === "commands" && n.dataset.actionId === e);
    a && (fs(e, s), this.runPanelAction(a, t, Ne(s)));
  }
  updatePanelActionPicker(e) {
    const t = e.closest("[data-panel-action-launcher]");
    if (!t) return;
    const s = e.value || "";
    t.querySelectorAll("[data-panel-action-choice]").forEach((a) => {
      a.hidden = a.dataset.panelActionChoice !== s;
    });
  }
  navigateFromDoctorAction(e) {
    const t = this.normalizePanelID(e.dataset.doctorActionNavigate || "");
    if (!t || !this.panels.includes(t)) return;
    let s = {};
    try {
      const a = decodeURIComponent(e.dataset.doctorActionState || ""), n = a ? JSON.parse(a) : {};
      n && typeof n == "object" && !Array.isArray(n) && (s = n);
    } catch {
      s = {};
    }
    this.activePanel = t, this.persistActivePanel(), this.renderActivePanel(), this.applyDoctorNavigationState(t, s);
  }
  applyDoctorNavigationState(e, t) {
    nt(this.panelEl, e, t);
  }
  clearPanelActionErrors() {
    this.panelEl.querySelectorAll("[data-action-field-error]").forEach((e) => {
      e.textContent = "", e.hidden = !0;
    });
  }
  renderPanelActionErrors(e, t) {
    if (!e || typeof e != "object") return "";
    const s = [];
    return Object.entries(e).forEach(([a, n]) => {
      const r = this.stringifyActionError(n);
      if (!r) return;
      const i = a.trim(), o = Array.from(this.panelEl.querySelectorAll("[data-action-field-error]")).find((l) => t && l.dataset.actionId !== t ? !1 : l.dataset.actionFieldError === i || l.dataset.actionFieldName === i || l.dataset.actionFieldError === `payload.${i}`);
      if (o) {
        o.textContent = r, o.hidden = !1;
        return;
      }
      s.push(r);
    }), s.length === 0 ? "" : `<ul class="${y.badgeError}" style="margin-top:0.5rem">${s.map((a) => `<li>${c(a)}</li>`).join("")}</ul>`;
  }
  stringifyActionError(e) {
    return typeof e == "string" ? e.trim() : Array.isArray(e) ? e.map((t) => this.stringifyActionError(t)).filter(Boolean).join("; ") : e && typeof e == "object" && typeof e.message == "string" ? (e.message || "").trim() : e == null ? "" : String(e);
  }
  attachExpandableRowListeners() {
    bt(this.panelEl);
  }
  attachCopyButtonListeners() {
    lt(this.panelEl, { useIconFeedback: !0 });
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
    const s = ++this.replLoadGeneration;
    this.panelEl.innerHTML = this.renderCapabilityLoading("terminal"), dt().then(({ DebugReplPanel: a }) => {
      if (this.destroyed || s !== this.replLoadGeneration || this.activePanel !== e) return;
      const n = new a({
        kind: e === "shell" ? "shell" : "console",
        debugPath: this.debugPath,
        commands: e === "console" ? this.replCommands : []
      });
      this.replPanels.set(e, n), n.attach(this.panelEl);
    }).catch(() => {
      this.destroyed || s !== this.replLoadGeneration || this.activePanel !== e || (this.panelEl.innerHTML = this.renderCapabilityError("terminal"), this.panelEl.querySelector("[data-debug-capability-retry]")?.addEventListener("click", () => {
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
      const s = t.content_type;
      s && e.add(s.split(";")[0].trim());
    }
    return [...e].sort();
  }
  requestEntryMatchesFilters(e) {
    const { method: t, status: s, search: a, hasBody: n, contentType: r } = this.filters.requests;
    return !(t !== "all" && (e.method || "").toUpperCase() !== t || s !== "all" && String(e.status || "") !== s || a && !(e.path || "").toLowerCase().includes(a.toLowerCase()) || n && !e.request_body || r !== "all" && (e.content_type || "").split(";")[0].trim() !== r);
  }
  renderRequests() {
    const { newestFirst: e } = this.filters.requests, t = this.state.requests.filter((s) => this.requestEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No requests captured yet.") : Et(t, y, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      showSortToggle: !1,
      truncatePath: !1,
      expandedRequestIds: this.expandedRequests
    });
  }
  sqlEntryMatchesFilters(e) {
    const { search: t, slowOnly: s, errorOnly: a } = this.filters.sql;
    return !(a && !e.error || s && !this.isSlowQuery(e) || t && !(e.query || "").toLowerCase().includes(t.toLowerCase()));
  }
  renderSQL() {
    const { newestFirst: e } = this.filters.sql, t = this.state.sql.filter((s) => this.sqlEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No SQL queries captured yet.") : ot(t, y, {
      newestFirst: e,
      slowThresholdMs: this.slowThresholdMs,
      maxEntries: this.maxSQLQueries,
      showSortToggle: !1,
      useIconCopyButton: !0
    });
  }
  logEntryMatchesFilters(e) {
    const { level: t, search: s } = this.filters.logs;
    return !(t !== "all" && (e.level || "").toLowerCase() !== t || s && !yt(e).includes(s.toLowerCase()));
  }
  applyLogsAutoScroll() {
    this.filters.logs.autoScroll && (this.panelEl.scrollTop = this.filters.logs.newestFirst ? 0 : this.panelEl.scrollHeight);
  }
  renderLogs() {
    const { newestFirst: e } = this.filters.logs, t = this.state.logs.filter((s) => this.logEntryMatchesFilters(s));
    return t.length === 0 ? this.renderEmptyState("No logs captured yet.") : ut(t, y, {
      newestFirst: e,
      maxEntries: this.maxLogEntries,
      showSortToggle: !1,
      showSource: !0,
      truncateMessage: !1,
      expandable: !0
    });
  }
  renderRoutes() {
    const { method: e, search: t } = this.filters.routes, s = t.toLowerCase(), a = this.state.routes.filter((n) => {
      if (e !== "all" && (n.method || "").toUpperCase() !== e) return !1;
      const r = `${n.path || ""} ${n.handler || ""} ${n.summary || ""}`.toLowerCase();
      return !(s && !r.includes(s));
    });
    return a.length === 0 ? this.renderEmptyState("No routes captured yet.") : vt(a, y, { showName: !0 });
  }
  renderSessionsPanel() {
    if (!this.sessionsLoaded && !this.sessionsLoading && this.fetchSessions(), this.sessionsError) return this.renderEmptyState(this.sessionsError);
    const e = this.state.config && typeof this.state.config == "object" && "session_tracking" in this.state.config ? !!this.state.config.session_tracking : void 0, t = this.filters.sessions.search.trim().toLowerCase();
    let s = [...this.sessions];
    if (t && (s = s.filter((r) => [
      r.username,
      r.user_id,
      r.session_id,
      r.ip,
      r.current_page
    ].filter(Boolean).join(" ").toLowerCase().includes(t))), s.sort((r, i) => {
      const o = new Date(r.last_activity || r.started_at || 0).getTime();
      return new Date(i.last_activity || i.started_at || 0).getTime() - o;
    }), this.sessionsLoading && s.length === 0) return this.renderEmptyState("Loading sessions...");
    if (s.length === 0)
      return e === !1 ? this.renderEmptyState("Session tracking is disabled. Enable it to list active sessions.") : this.renderEmptyState("No active sessions yet.");
    const a = s.map((r) => {
      const i = r.session_id || "", o = r.username || r.user_id || "Unknown", l = et(r.last_activity || r.started_at), m = j(r.request_count ?? 0), u = !!i && i === this.activeSessionId, d = u ? "detach" : "attach", f = u ? "Detach" : "Attach", p = u ? "debug-btn debug-btn--danger" : "debug-btn debug-btn--primary", g = u ? "debug-session-row debug-session-row--active" : "debug-session-row", E = r.current_page || "-", b = r.ip || "-";
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
        <span class="debug-session-toolbar__label">${`${j(s.length)} active`}</span>
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
          ${a}
        </tbody>
      </table>
    `;
  }
  renderCustom() {
    const { search: e } = this.filters.custom, t = Object.keys(this.state.custom.data).length > 0, s = this.state.custom.logs.length > 0;
    return !t && !s ? this.renderEmptyState("No custom data captured yet.") : pt(this.state.custom, y, {
      maxLogEntries: this.maxLogEntries,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: e ? (a) => te(a, e) : void 0
    });
  }
  renderJSONPanel(e, t, s) {
    const a = t && typeof t == "object" && !Array.isArray(t), n = Array.isArray(t);
    if (a && Object.keys(t || {}).length === 0 || n && (t || []).length === 0 || !a && !n && !t) return this.renderEmptyState(`No ${e.toLowerCase()} data available.`);
    if (s && Pt(s)) {
      const r = t;
      if (this.jsonPathResult?.data === r && this.jsonPathResult.search === s) return he(e, this.jsonPathResult.result, y, {
        useIconCopyButton: !0,
        showCount: !0
      });
      const i = ++this.jsonPathLoadGeneration;
      return Ut().then(({ filterObjectBySearch: o }) => {
        this.destroyed || i !== this.jsonPathLoadGeneration || this.filters.objects.search === s && (this.jsonPathResult = {
          data: r,
          search: s,
          result: o(r, s)
        }, this.renderPanel());
      }).catch(() => {
        this.destroyed || i !== this.jsonPathLoadGeneration || (this.panelEl.innerHTML = this.renderCapabilityError("JSONPath filter"), this.panelEl.querySelector("[data-debug-capability-retry]")?.addEventListener("click", () => {
          this.jsonPathResult = null, this.destroyed || this.renderPanel();
        }, { once: !0 }));
      }), this.renderCapabilityLoading("JSONPath filter");
    }
    return he(e, t, y, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: s ? (r) => te(r, s) : void 0
    });
  }
  attachSessionActions() {
    this.panelEl.querySelectorAll("[data-session-action]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.sessionAction || "", s = e.dataset.sessionId || "";
        switch (t) {
          case "refresh":
            this.fetchSessions(!0);
            break;
          case "attach":
            this.attachSessionByID(s);
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
        const s = await $(t);
        if (this.sessions = Array.isArray(s.sessions) ? s.sessions : [], this.sessionsLoaded = !0, this.sessionsUpdatedAt = /* @__PURE__ */ new Date(), this.activeSessionId) {
          const a = this.sessions.find((n) => n.session_id === this.activeSessionId);
          a && (this.activeSession = a, this.updateSessionBanner());
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
    const s = this.sessions.find((a) => a.session_id === t) || { session_id: t };
    this.attachSession(s);
  }
  attachSession(e) {
    const t = (e.session_id || "").trim();
    t && this.activeSessionId !== t && (this.activeSessionId = t, this.activeSession = e, this.streamBasePath = this.buildSessionStreamPath(t), this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("session"), this.renderPanel());
  }
  detachSession() {
    this.activeSessionId && (this.activeSessionId = null, this.activeSession = null, this.streamBasePath = this.debugPath, this.resetDebugState(), this.updateSessionBanner(), this.rebuildStream("global"), this.renderPanel());
  }
  rebuildStream(e) {
    this.stopCommandRunReconciliation(), this.stream.close(), this.stream = new pe({
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
    }, this.expandedRequests.clear(), this.logsExpanded.clear(), this.jserrorsExpanded.clear(), jt(), Ee(Re(window.location.search)), this.commandRunStateGeneration += 1, this.commandRunGenerations.clear(), this.eventCount = 0, this.lastEventAt = null, this.updateStatusMeta(), this.updateTabCounts();
  }
  buildSessionStreamPath(e) {
    const t = this.debugPath.replace(/\/+$/, ""), s = encodeURIComponent(e);
    return t ? `${t}/session/${s}` : "";
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
        const s = B(t), a = { [s]: this.getStateForKey(s) };
        return at(a, t);
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
    return e.map((s) => {
      const a = s.toLowerCase() === t.toLowerCase() ? "selected" : "";
      return `<option value="${c(s)}" ${a}>${c(s)}</option>`;
    }).join("");
  }
  updateTabCounts() {
    this.panels.forEach((e) => {
      const t = this.panelCount(e), s = this.tabsEl.querySelector(`[data-panel-count="${e}"]`);
      s && (s.textContent = j(t));
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
    this.eventCountEl.textContent = `${j(this.eventCount)} events`, this.lastEventAt && (this.lastEventEl.textContent = this.lastEventAt.toLocaleTimeString());
  }
  handleEvent(e) {
    if (this.destroyed || !e || !e.type) return;
    if (e.type === "debug_command_error") {
      const a = e.payload && typeof e.payload == "object" ? e.payload : {}, n = typeof a.operation == "string" ? a.operation.trim().toLowerCase() : "";
      this.showDebugToast(n === "clear" ? "Unable to clear debug data." : "Debug command failed.", "error");
      return;
    }
    if (e.type === "snapshot") {
      const a = this.commandRunSnapshotBaseline || /* @__PURE__ */ new Map();
      this.applySnapshot(e.payload, a), this.commandRunReconcileInFlight && this.finishCommandRunSnapshotRequest(!0);
      return;
    }
    if (this.eventCount += 1, this.lastEventAt = /* @__PURE__ */ new Date(), this.updateStatusMeta(), this.paused) {
      (this.eventToPanel[e.type] || e.type) === "sql" && this.activePanel === "sql" && this.sqlView.enqueue([e.payload]);
      return;
    }
    if (e.type === "command_status") {
      zt(e.payload), this.activePanel === "commands" && this.renderStoredPanelActionResult("commands");
      return;
    }
    const t = this.eventToPanel[e.type] || e.type, s = P.get(t);
    if (s) {
      const a = B(s), n = this.getStateForKey(a), r = a === "command_runs" ? C(e.payload) : "", i = r && Array.isArray(n) ? n.find((m) => C(m) === r) : void 0, o = a === "command_runs" && i ? Dt(i, e.payload) : !1, l = (s.handleEvent || ((m, u) => st(m, u, this.maxLogEntries)))(n, e.payload);
      if (this.setStateForKey(a, l), a === "command_runs") {
        const m = r && Array.isArray(l) ? l.find((u) => C(u) === r) : void 0;
        r && m === e.payload && (this.commandRunStateGeneration += 1, this.commandRunGenerations.set(r, this.commandRunStateGeneration)), this.pruneCommandRunGenerations(l), ve(l), o ? this.beginCommandRunSnapshotRequest("revision-gap") : this.refreshCommandRunReconciliation();
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
        $t(t) || (this.state.extra[t] = e.payload);
    }
    if (this.updateTabCounts(), t === this.activePanel) if (t === "sql") this.sqlView.enqueue([e.payload]);
    else if (t === "logs") this.logsView.enqueue([e.payload]);
    else if (t === "requests") this.requestsView.enqueue([e.payload]);
    else if (t === "jserrors") this.jserrorsView.enqueue([e.payload]);
    else if (this.registryLiveList.handles(s)) {
      const a = this.getStateForKey(B(s)), n = s.liveList?.updateMode === "upsert" ? e.payload : Array.isArray(a) ? a[a.length - 1] : void 0;
      this.registryLiveList.enqueue(s, n);
    } else this.renderPanel();
  }
  handleCustomEvent(e) {
    if (e) {
      if (typeof e == "object" && "key" in e && "value" in e) {
        Fs(this.state.custom.data, String(e.key), e.value);
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
    const s = e || {}, a = this.state.extra.command_runs;
    this.state.template = s.template || {}, this.state.session = s.session || {}, this.state.requests = k(s.requests), this.state.sql = k(s.sql), this.state.logs = k(s.logs), this.reconcileLogExpansion(), this.state.config = s.config || {}, this.state.routes = k(s.routes);
    const n = s.custom || {};
    this.state.custom = {
      data: n.data || {},
      logs: k(n.logs)
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
      !r.has(o) && o in s && (i[o] = s[o]);
    }), a !== void 0 || "command_runs" in s) {
      const o = t || /* @__PURE__ */ new Map(), l = P.get("command_runs")?.liveList?.getMaxEntries?.() || this.maxLogEntries, m = kt(a, s.command_runs, o, this.commandRunGenerations, l), u = new Set(m.map(C).filter(Boolean)), d = Array.isArray(a) ? a.map(C).filter((f) => f && !u.has(f)) : [];
      d.length > 0 && xt(d), i.command_runs = m, this.commandRunStateGeneration += 1, u.forEach((f) => this.commandRunGenerations.set(f, this.commandRunStateGeneration)), this.pruneCommandRunGenerations(m);
    }
    this.state.extra = i, ve(i.command_runs, !0), this.updateTabCounts(), this.renderPanel(), this.refreshCommandRunReconciliation();
  }
  pruneCommandRunGenerations(e) {
    const t = new Set((Array.isArray(e) ? e : []).map(C).filter(Boolean));
    this.commandRunGenerations.forEach((s, a) => {
      t.has(a) || this.commandRunGenerations.delete(a);
    });
  }
  commandRunsHaveNonterminalRows() {
    const e = this.state.extra.command_runs;
    return Array.isArray(e) && e.some((t) => C(t) && !Nt(t));
  }
  commandRunReconciliationVisible() {
    return this.activePanel === "command_runs" && document.visibilityState !== "hidden" && this.commandRunsHaveNonterminalRows();
  }
  clearCommandRunReconcileTimer() {
    this.commandRunReconcileTimer !== null && (window.clearTimeout(this.commandRunReconcileTimer), this.commandRunReconcileTimer = null);
  }
  refreshCommandRunReconciliation(e = qs) {
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
    const s = this.stream.getStatus() === "connected", a = !this.activeSessionId && !!this.debugPath;
    if (!t && !s && !a) return;
    if (this.clearCommandRunReconcileTimer(), this.commandRunSnapshotBaseline = be(this.state.extra.command_runs, this.commandRunGenerations), this.commandRunReconcileInFlight = !0, t || s) {
      t || this.stream.requestSnapshot(), this.commandRunReconcileTimer = window.setTimeout(() => {
        this.commandRunReconcileTimer = null, this.finishCommandRunSnapshotRequest(!1);
      }, Ts);
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
      this.commandRunReconcileFailures = 0, this.refreshCommandRunReconciliation(Is);
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
    const e = new Set(this.state.logs.map(ye));
    this.logsExpanded.forEach((t) => {
      e.has(t) || this.logsExpanded.delete(t);
    });
  }
  isSlowQuery(e) {
    return At(e?.duration, this.slowThresholdMs);
  }
  async fetchSnapshot() {
    if (this.destroyed || !this.debugPath || this.activeSessionId) return;
    const e = be(this.state.extra.command_runs, this.commandRunGenerations);
    try {
      const t = await w(`${this.debugPath}/api/snapshot`, { credentials: "same-origin" });
      if (!t.ok) return;
      const s = await $(t);
      if (this.destroyed) return;
      this.applySnapshot(s, e);
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
        this.showDebugToast(`Unable to clear ${V(e)}.`, "error");
        return;
      }
      e === "logs" && this.logsExpanded.clear();
    } catch {
      this.showDebugToast(`Unable to clear ${V(e)}.`, "error");
    }
  }
  async parseJSONResponse(e) {
    const t = await $(e);
    return t && typeof t == "object" ? t : null;
  }
  readResponsePath(e, t) {
    if (!e || !t) return;
    const s = t.split(".").map((n) => n.trim()).filter(Boolean);
    if (s.length === 0) return;
    let a = e;
    for (const n of s) {
      if (!a || typeof a != "object") return;
      a = a[n];
    }
    return a;
  }
  responseMessage(e, t) {
    for (const s of t) {
      const a = this.readResponsePath(e, s);
      if (typeof a == "string" && a.trim()) return a.trim();
    }
    return "";
  }
  showDebugToast(e, t) {
    const s = e.trim();
    if (!s) return;
    window.getComputedStyle(this.container).position === "static" && (this.container.style.position = "relative");
    let a = this.container.querySelector("[data-debug-toast-host]");
    a || (a = document.createElement("div"), a.dataset.debugToastHost = "true", a.style.position = "absolute", a.style.right = "12px", a.style.bottom = "12px", a.style.display = "flex", a.style.flexDirection = "column", a.style.gap = "8px", a.style.pointerEvents = "none", a.style.zIndex = "1000", this.container.appendChild(a));
    const n = t === "success" ? {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.45)",
      color: "#bbf7d0"
    } : {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.45)",
      color: "#fecaca"
    }, r = document.createElement("div");
    r.style.maxWidth = "380px", r.style.padding = "10px 12px", r.style.borderRadius = "8px", r.style.border = `1px solid ${n.border}`, r.style.background = n.bg, r.style.color = n.color, r.style.fontSize = "12px", r.style.lineHeight = "1.4", r.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.25)", r.style.pointerEvents = "auto", r.textContent = s, a.appendChild(r), window.setTimeout(() => {
      r.remove(), a && a.childElementCount === 0 && a.remove();
    }, 4200);
  }
  async runDoctorAction(e, t = "", s = !1) {
    if (!this.debugPath || this.activeSessionId) return;
    const a = e.trim();
    if (!a) return;
    const n = t.trim();
    if (s || n) {
      const r = n || "Are you sure you want to run this doctor action?";
      if (!window.confirm(r)) return;
    }
    try {
      const r = await w(`${this.debugPath}/api/doctor/${encodeURIComponent(a)}/action`, {
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
    this.destroyed || (this.destroyed = !0, this.listenerCleanup.splice(0).forEach((e) => e()), this.replLoadGeneration += 1, this.jsonPathLoadGeneration += 1, this.replPanels.forEach((e) => e.destroy()), this.replPanels.clear(), document.removeEventListener("visibilitychange", this.handleVisibilityChange), window.removeEventListener("pagehide", this.handlePageHide), this.stopCommandRunReconciliation(!0), this.stream.close(), this.unsubscribeRegistry?.(), this.unsubscribeRegistry = null, this.tabsSortable?.destroy(), this.tabsSortable = null, Te());
  }
  updatePauseIndicator(e) {
    !this.paused || !this.pauseButton || (this.pauseButton.textContent = e > 0 ? `Resume (${e})` : "Resume");
  }
}, Ms = (e) => {
  const t = e || document.querySelector("[data-debug-console]");
  return t ? new ks(t) : null;
}, je = () => {
  Ms();
};
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", je) : je();
export {
  ma as DATA_ATTRS,
  an as DEBUG_ICON_REFS,
  ks as DebugPanel,
  pe as DebugStream,
  ha as INTERACTION_CLASSES,
  K as LiveListView,
  ft as RegistryLiveListManager,
  ca as RemoteDebugStream,
  wt as SqlLiveView,
  ga as appendListRow,
  pa as appendSqlRowDOM,
  Va as applyCustomEventPayload,
  ja as applyDebugEventToSnapshot,
  nt as applyPanelActionNavigation,
  oa as applyPanelActionPayload,
  lt as attachCopyListeners,
  bt as attachExpandableRowListeners,
  it as attachRequestDetailListeners,
  ge as attachRowExpansion,
  Q as buildEventToPanel,
  be as captureCommandRunSnapshotBaseline,
  C as commandRunKey,
  Ya as commandRunRevision,
  Dt as commandRunRevisionGap,
  Ot as commandRunSelectionEvent,
  Nt as commandRunTerminal,
  Se as commandRunsNavigationHref,
  Wa as commandRunsSelection,
  y as consoleStyles,
  va as copyToClipboard,
  O as countPayload,
  ba as createDebugReplLoader,
  Vt as createJSONPathLoader,
  Pa as createSyntaxLoader,
  Js as defaultGetCount,
  st as defaultHandleEvent,
  qa as doctorNavigation,
  fa as enhanceDeferredSyntax,
  c as escapeHTML,
  wa as evictListOverflow,
  ya as evictSqlOverflow,
  Na as fetchDebugSnapshot,
  Ma as formatDuration,
  tt as formatJSON,
  j as formatNumber,
  et as formatTimestamp,
  tn as getDebugIconRef,
  Ct as getDefaultPanels,
  Ba as getDefaultToolbarPanels,
  Ga as getLevelClass,
  at as getPanelCount,
  Hs as getPanelData,
  Tt as getPanelEventTypes,
  Lt as getPanelIcon,
  V as getPanelLabel,
  B as getSnapshotKey,
  Ha as getStatusClass,
  xa as getStyleConfig,
  Ua as getToolbarCounts,
  Us as hashString,
  Ms as initDebugPanel,
  $t as isKnownPanel,
  aa as isSchemaListRenderer,
  At as isSlowDuration,
  mt as jsErrorRowKey,
  dt as loadDebugReplPanel,
  Ut as loadJSONPathSearch,
  Sa as loadSyntaxHighlight,
  ye as logRowKey,
  yt as logSearchText,
  kt as mergeAuthoritativeCommandRuns,
  Ks as normalizeEventTypes,
  qt as normalizeReplCommands,
  Xa as panelDefinitionFromServer,
  P as panelRegistry,
  Re as parseCommandRunsNavigation,
  ve as reconcileCommandRunsRows,
  Ka as renderCommandRunRow,
  Za as renderCommandRunsPanel,
  pt as renderCustomPanel,
  sn as renderDebugIcon,
  Bt as renderDebugIconRef,
  $a as renderDeferredSyntax,
  Ca as renderDoctorPanel,
  _a as renderDoctorPanelCompact,
  St as renderErrorRow,
  Rt as renderJSErrorsPanel,
  he as renderJSONPanel,
  ra as renderJSONViewer,
  gt as renderLogRow,
  ut as renderLogsPanel,
  zs as renderPanelContent,
  La as renderPermissionsPanel,
  Ia as renderPermissionsPanelCompact,
  ht as renderRequestRow,
  Et as renderRequestsPanel,
  vt as renderRoutesPanel,
  ot as renderSQLPanel,
  Ra as renderSQLRow,
  Fa as renderSQLRowsHTML,
  Ws as renderSchemaIdentity,
  ea as renderSchemaKeyValue,
  na as renderSchemaListRow,
  Xs as renderSchemaMetrics,
  sa as renderSchemaStatusList,
  ta as renderSchemaTable,
  Zs as renderSchemaTimeline,
  Ta as renderSiteRenderCachePanel,
  Aa as renderSiteRenderCachePanelCompact,
  It as replPanelIDs,
  ct as requestRowKey,
  jt as resetCommandRunsState,
  fe as restoreRowExpansion,
  Ys as schemaRowKey,
  Qa as selectCommandRun,
  Da as serializeLogEntry,
  Ee as setCommandRunsNavigationTarget,
  ua as sqlRowKey,
  Ea as toolbarStyles,
  Ja as truncate
};

//# sourceMappingURL=index.js.map