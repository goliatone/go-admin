import { httpRequest as f, readHTTPError as h } from "../shared/transport/http-client.js";
import { getStringSearchParam as S, readLocationSearchParams as g } from "../shared/query-state/url-state.js";
import { initActionMenus as w } from "../shared/action-menu.js";
import { asString as r } from "../shared/coercion.js";
function A(t, i, o) {
  const e = t.trim();
  if (!e || !i || !o) return "";
  const n = e.startsWith("http://") || e.startsWith("https://"), a = new URL(e, n ? void 0 : "http://localhost");
  return a.pathname = `${a.pathname.replace(/\/+$/, "")}/${encodeURIComponent(i)}/actions/${encodeURIComponent(o)}`, n ? a.toString() : `${a.pathname}${a.search}`;
}
function y(t, i) {
  const o = globalThis.crypto?.randomUUID;
  return typeof o == "function" ? o.call(globalThis.crypto) : `${t}:${i}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}
function l(t) {
  return t === "claim" || t === "release";
}
async function R(t, i, o, e) {
  const n = { expected_version: e.expected_version };
  e.idempotency_key && (n.idempotency_key = e.idempotency_key), e.reason && (n.reason = e.reason), e.channel && (n.channel = e.channel);
  const a = await f(A(t, i, o), {
    method: "POST",
    json: n
  });
  if (!a.ok) throw new Error(await h(a, `Failed to ${o} assignment`));
}
function E(t, i) {
  return i.endpoint || t.dataset.actionEndpoint || t.dataset.assignmentActionEndpoint || "";
}
function $(t) {
  return r(t.dataset.channel) || typeof window < "u" && S(g(window.location) ?? new URLSearchParams(), "channel") || "";
}
function U(t, i) {
  i.initializeMenus === !1 || t.dataset.assignmentActionMenusEnhanced === "true" || (t.dataset.assignmentActionMenusEnhanced = "true", w(t, {
    containerSelector: "[data-action-menu]",
    triggerSelector: "[data-action-menu-trigger]",
    menuSelector: "[data-action-menu-content]",
    itemSelector: '[data-action-menu-item], [role="menuitem"], .action-item'
  }));
}
function M(t, i = {}) {
  if (!t || (U(t, i), t.dataset.assignmentActionsEnhanced === "true")) return;
  const o = E(t, i);
  if (!o) return;
  const e = Array.from(t.querySelectorAll("[data-translation-action]")).filter((n) => l(r(n.dataset.translationAction)));
  e.length !== 0 && (t.dataset.assignmentActionsEnhanced = "true", e.forEach((n) => {
    n.addEventListener("click", async (a) => {
      const s = r(n.dataset.translationAction);
      if (!l(s)) return;
      a.preventDefault();
      const c = r(n.dataset.assignmentId), d = Number.parseInt(r(n.dataset.rowVersion), 10), p = Number.isFinite(d) ? d : 0, m = $(t);
      if (c && !(n.disabled || n.getAttribute("aria-disabled") === "true")) {
        n.disabled = !0;
        try {
          await R(o, c, s, {
            expected_version: p,
            idempotency_key: y(c, s),
            ...m ? { channel: m } : {}
          }), typeof window < "u" && window.location.reload();
        } catch (u) {
          n.disabled = !1, console.error(u);
        }
      }
    });
  }));
}
export {
  A as buildAssignmentActionURL,
  M as initAssignmentSSRRowActions
};

//# sourceMappingURL=assignment-row-actions.js.map