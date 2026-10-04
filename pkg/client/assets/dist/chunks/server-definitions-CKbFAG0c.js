import { escapeAttribute as _, escapeHTML as f } from "../shared/html.js";
import { _ as O } from "./rich-5UU6Sxl8.js";
import { n as q, r as T, t as U } from "./hydrate-yld76QdH.js";
import { m as z } from "./runtime-helpers-BJB2ragE.js";
var H = /* @__PURE__ */ new Set([
  "succeeded",
  "failed",
  "canceled",
  "rejected"
]), v = /* @__PURE__ */ new Set(), m = "", $ = "", S = "", D = "", R = !1, K = "debug:command-run-selection";
function i(e) {
  return e == null ? "" : String(e).trim();
}
function A(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
function b(e) {
  const t = i(e);
  return t.length <= 512 ? t : "";
}
function re(e) {
  const t = new URLSearchParams(e || "");
  return {
    runID: b(t.get("run_id")) || void 0,
    dispatchID: b(t.get("dispatch_id")) || void 0,
    correlationID: b(t.get("correlation_id")) || void 0
  };
}
function oe(e, t) {
  const n = typeof window < "u" ? window.location.href : "http://localhost/", a = new URL(e || n, n), r = b(t.runID), o = b(t.dispatchID), c = b(t.correlationID);
  return a.searchParams.set("panel", "command_runs"), r ? a.searchParams.set("run_id", r) : a.searchParams.delete("run_id"), o && !r ? a.searchParams.set("dispatch_id", o) : a.searchParams.delete("dispatch_id"), c && !r && !o ? a.searchParams.set("correlation_id", c) : a.searchParams.delete("correlation_id"), `${a.pathname}${a.search}${a.hash}`;
}
function ie(e) {
  $ = b(e.runID), S = $ ? "" : b(e.dispatchID), D = $ || S ? "" : b(e.correlationID), m = $, R = !1, m && v.add(m);
}
function B(e, t = !1) {
  const n = Array.isArray(e) ? e.filter((r) => r && typeof r == "object") : [], a = $ ? n.find((r) => h(r) === $) : S ? n.find((r) => i(r.dispatch_id) === S) : D ? n.find((r) => i(r.correlation_id) === D) : void 0;
  return a ? (m = h(a), v.add(m), R = !1) : t && ($ || S || D) && (R = !0), m;
}
function h(e) {
  return e && typeof e == "object" ? i(e.run_id) : "";
}
function g(e) {
  return e && typeof e == "object" ? A(e.revision) : 0;
}
function y(e) {
  return !!e && typeof e == "object" && H.has(i(e.phase).toLowerCase());
}
function I(e) {
  if (!e || typeof e != "object") return 0;
  const t = e.updated_at || e.occurred_at || "", n = Date.parse(i(t));
  return Number.isFinite(n) ? n : 0;
}
function V(e, t) {
  const n = g(e), a = g(t);
  if (y(e) && !y(t) || n === a && y(e) && y(t) && i(e.phase).trim().toLowerCase() !== i(t.phase).trim().toLowerCase()) return !1;
  if (a > 0 && n > 0) {
    if (a < n) return !1;
    if (a > n) return !0;
  }
  return y(t) && !y(e) ? !0 : a >= n;
}
function W(e, t) {
  return !e || !V(e, t) ? e || t : g(e) === g(t) ? {
    ...e,
    ...t
  } : t;
}
function se(e, t) {
  const n = g(e), a = g(t);
  return n > 0 && a > n + 1;
}
function de(e, t) {
  const n = /* @__PURE__ */ new Map();
  return (Array.isArray(e) ? e : []).forEach((a) => {
    const r = h(a);
    r && n.set(r, {
      revision: g(a),
      generation: t.get(r) || 0
    });
  }), n;
}
function ce(e, t, n, a, r = 500) {
  const o = Array.isArray(e) ? e.filter((d) => d && typeof d == "object") : [], c = Array.isArray(t) ? t.filter((d) => d && typeof d == "object") : [], l = /* @__PURE__ */ new Map();
  o.forEach((d) => {
    const u = h(d);
    u && l.set(u, d);
  });
  const p = /* @__PURE__ */ new Set(), C = [];
  return c.forEach((d) => {
    const u = h(d);
    !u || p.has(u) || (p.add(u), C.push(W(l.get(u), d)));
  }), o.forEach((d) => {
    const u = h(d);
    if (!u || p.has(u)) return;
    const k = n.get(u);
    k && k.revision === g(d) && k.generation === (a.get(u) || 0) || C.push(d);
  }), C.sort((d, u) => I(u) - I(d) || h(d).localeCompare(h(u))), r > 0 ? C.slice(0, r) : C;
}
function x(e) {
  const t = e.current, n = e.total;
  if (typeof t != "number" && typeof n != "number") return "—";
  if (typeof n == "number" && n > 0) {
    const a = Math.max(0, Math.min(100, Math.round(A(t) / n * 100)));
    return `${A(t)} / ${n} (${a}%)`;
  }
  return String(A(t));
}
function E(e) {
  return !e.attempt && !e.max_attempts ? "—" : e.max_attempts ? `${A(e.attempt)} / ${A(e.max_attempts)}` : String(A(e.attempt));
}
function P(e) {
  return typeof e.duration_ms != "number" ? "—" : e.duration_ms < 1e3 ? `${e.duration_ms} ms` : `${(e.duration_ms / 1e3).toFixed(e.duration_ms < 1e4 ? 2 : 1)} s`;
}
function s(e, t, n) {
  const a = i(t) || "—";
  return `<div><dt class="${n.detailLabel}">${f(e)}</dt><dd class="${n.detailValue}">${f(a)}</dd></div>`;
}
function G(e, t) {
  const n = i(e.outcome?.summary), a = e.outcome?.fields && typeof e.outcome.fields == "object" ? Object.entries(e.outcome.fields).filter(([r, o]) => i(r) ? typeof o == "number" ? Number.isFinite(o) : typeof o == "string" || typeof o == "boolean" : !1).sort(([r], [o]) => r.localeCompare(o)) : [];
  return !n && a.length === 0 ? `<p class="${t.muted}" data-command-run-outcome-empty>No additional result metadata was recorded.</p>` : `
    <section class="command-run-outcome" data-command-run-outcome>
      <h4>Outcome</h4>
      ${n ? `<p>${f(n)}</p>` : ""}
      ${a.length > 0 ? `
        <dl class="command-run-details command-run-outcome__fields">
          ${a.map(([r, o]) => s(r, o, t)).join("")}
        </dl>
      ` : ""}
    </section>
  `;
}
function M(e, t) {
  const n = e && typeof e == "object" ? e : {}, a = h(n);
  if (!a) return "";
  const r = i(n.phase).toLowerCase() || "unknown", o = g(n), c = y(n), l = `command-run-detail-${a.replace(/[^a-zA-Z0-9_-]/g, "-")}`, p = n.failure && (n.failure.category || n.failure.code) ? `${i(n.failure.category)}${n.failure.category && n.failure.code ? " / " : ""}${i(n.failure.code)}` : "—";
  return `
    <tr
      class="command-run-row ${t.expandableRow}"
      data-row-key="${_(a)}"
      data-row-revision="${o}"
      data-row-terminal="${c ? "true" : "false"}"
      data-command-run-row
      aria-selected="false"
      tabindex="-1"
    >
      <td>
        <button type="button" class="command-run-toggle" data-command-run-toggle data-live-row-focus aria-expanded="false" aria-controls="${_(l)}" aria-label="Show details for ${_(i(n.command_id) || "unknown command")} run ${_(a)} (${_(r)})">
          <span aria-hidden="true">›</span>
        </button>
        <span class="${t.badge} command-run-phase command-run-phase--${_(r)}">${f(r)}</span>
      </td>
      <td><strong>${f(i(n.command_id) || "Unknown command")}</strong><div class="${t.muted}">${f(a)}</div></td>
      <td>${f(x(n))}</td>
      <td>${f(i(n.mode) || "—")}</td>
      <td>${f(E(n))}</td>
      <td><span class="${t.timestamp}">${f(O(n.updated_at || n.occurred_at))}</span><div class="${t.muted}">${f(P(n))}</div></td>
      <td>${f(i(n.message) || i(n.checkpoint) || "—")}</td>
    </tr>
    <tr id="${_(l)}" class="command-run-detail ${t.expansionRow}" data-command-run-detail data-parent-key="${_(a)}" hidden>
      <td colspan="7">
        <div class="${t.expandedContent}">
          <dl class="command-run-details">
            ${s("Run ID", n.run_id, t)}
            ${s("Dispatch ID", n.dispatch_id, t)}
            ${s("Correlation ID", n.correlation_id, t)}
            ${s("Event ID", n.event_id, t)}
            ${s("Command", n.command_id, t)}
            ${s("Phase", r, t)}
            ${s("Revision", n.revision, t)}
            ${s("Mode", n.mode, t)}
            ${s("Progress", x(n), t)}
            ${s("Attempt", E(n), t)}
            ${s("First occurred", n.first_occurred_at, t)}
            ${s("Occurred", n.occurred_at, t)}
            ${s("Started", n.started_at, t)}
            ${s("Updated", n.updated_at, t)}
            ${s("Duration", P(n), t)}
            ${s("Checkpoint", n.checkpoint, t)}
            ${s("Message", n.message, t)}
            ${s("Failure", p, t)}
          </dl>
          ${G(n, t)}
        </div>
      </td>
    </tr>
  `;
}
function Z(e, t) {
  const n = Array.isArray(e) ? e : [];
  return B(n), n.length === 0 ? `<div class="${t.emptyState}" data-command-runs-empty>No command runs available</div>
      <div class="${t.emptyState}" data-command-run-unavailable ${R ? "" : "hidden"}>Selected command run is no longer retained.</div>` : `
    <section class="${t.jsonPanel}" data-command-runs-panel>
      <table class="${t.table} command-runs-table">
        <thead><tr><th>Status</th><th>Command / Run</th><th>Progress</th><th>Mode</th><th>Attempt</th><th>Timing</th><th>Message</th></tr></thead>
        <tbody data-live-list>${n.map((a) => M(a, t)).join("")}</tbody>
      </table>
      <div class="${t.emptyState}" data-command-run-unavailable hidden>Selected command run is no longer retained.</div>
    </section>
  `;
}
function J(e, t) {
  t.dataset.commandRunsWired !== "true" && (t.dataset.commandRunsWired = "true", t.addEventListener("click", (n) => {
    const a = n.target, r = a?.closest("[data-command-run-row]");
    if (!r) return;
    const o = r.getAttribute("data-row-key") || "";
    if (!o) return;
    m = o, $ = o, S = "", D = "", R = !1, a?.closest("[data-command-run-toggle]") && (v.has(o) ? v.delete(o) : v.add(o)), L(e, t);
    const c = t.ownerDocument.defaultView?.CustomEvent || CustomEvent;
    t.dispatchEvent(new c(K, {
      bubbles: !0,
      detail: { runID: o }
    }));
  }), t.addEventListener("keydown", (n) => {
    if (n.key !== "Enter" && n.key !== " ") return;
    const a = n.target;
    a?.closest("[data-command-run-toggle]") && (n.preventDefault(), a.click());
  }));
}
function L(e, t) {
  t.querySelectorAll("[data-command-run-row]").forEach((n) => {
    const a = n.getAttribute("data-row-key") || "", r = v.has(a), o = m === a;
    n.setAttribute("aria-selected", o ? "true" : "false"), n.classList.toggle("command-run-row--selected", o), n.classList.toggle("expanded", r);
    const c = n.querySelector("[data-command-run-toggle]");
    if (c?.setAttribute("aria-expanded", r ? "true" : "false"), c) {
      const p = i(n.querySelector("strong")?.textContent) || "unknown command", C = i(n.querySelector(".command-run-phase")?.textContent) || "unknown";
      c.setAttribute("aria-label", `${r ? "Hide" : "Show"} details for ${p} run ${a} (${C})`);
    }
    const l = Array.from(t.querySelectorAll("[data-command-run-detail]")).find((p) => p.getAttribute("data-parent-key") === a);
    l && (l.hidden = !r);
  }), e.querySelectorAll("[data-command-run-unavailable]").forEach((n) => {
    n.hidden = !R;
  });
}
function Q(e) {
  e.forEach((t) => {
    v.delete(t), t === m && (R = !0);
  });
}
function ue() {
  return m;
}
function me(e) {
  m = i(e), $ = m, S = "", D = "", R = !1, m && v.add(m);
}
function le() {
  m = "", $ = "", S = "", D = "", R = !1, v.clear();
}
var w = /* @__PURE__ */ new Map();
function j(e) {
  return (e || "").trim().replace(/\/+$/g, "") || "/admin/debug";
}
function F(e) {
  return typeof e == "string" ? e.trim().toLowerCase() : "";
}
var N = /* @__PURE__ */ new Map();
function fe(e, t) {
  const n = F(e);
  n && typeof t == "function" && N.set(n, t);
}
function X(e) {
  const t = F(e?.id), n = t === "command_runs";
  return T(e, {
    consoleRenderer: n ? ({ data: a, styles: r }) => Z(a, r) : N.get(t),
    consoleRendererOwnsFilters: !n,
    extend: (a, { ui: r, eventMode: o, liveNewestFirst: c }) => !n || !r || o !== "upsert" ? a : {
      ...a,
      liveList: {
        updateMode: "upsert",
        renderRow: (l, p) => M(l, p),
        keyOf: h,
        revisionOf: g,
        terminalOf: y,
        getMaxEntries: () => typeof r.events?.max_entries == "number" ? r.events.max_entries : 500,
        newestFirst: c,
        onAdopt: J,
        onRestore: L,
        onEvict: Q
      }
    }
  });
}
async function Y(e, t = U) {
  return q(`${j(e)}/api/panels`, t);
}
async function pe(e) {
  const t = j(e), n = w.get(t);
  if (n) return n;
  const a = Y(t).then((r) => {
    let o = 0;
    return r.forEach((c) => {
      const l = X(c);
      l && z.registerServerDefinition(l) && (o += 1);
    }), o;
  });
  return w.set(t, a), a;
}
export {
  M as _,
  de as a,
  me as b,
  se as c,
  Q as d,
  oe as f,
  B as g,
  re as h,
  fe as i,
  K as l,
  ce as m,
  pe as n,
  h as o,
  ue as p,
  X as r,
  g as s,
  Y as t,
  y as u,
  Z as v,
  ie as x,
  le as y
};

//# sourceMappingURL=server-definitions-CKbFAG0c.js.map