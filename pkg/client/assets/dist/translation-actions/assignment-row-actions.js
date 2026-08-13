import { createLogger as u } from "../shared/logger.js";
import { httpRequest as h, readHTTPError as g } from "../shared/transport/http-client.js";
import { initActionMenus as S } from "../shared/action-menu.js";
import { getStringSearchParam as A, readLocationSearchParams as w } from "../shared/query-state/url-state.js";
import { asString as r } from "../shared/coercion.js";
var y = u("AssignmentRowActions");
function R(t, i, o) {
  const n = t.trim();
  if (!n || !i || !o) return "";
  const e = n.startsWith("http://") || n.startsWith("https://"), a = new URL(n, e ? void 0 : "http://localhost");
  return a.pathname = `${a.pathname.replace(/\/+$/, "")}/${encodeURIComponent(i)}/actions/${encodeURIComponent(o)}`, e ? a.toString() : `${a.pathname}${a.search}`;
}
function E(t, i) {
  const o = globalThis.crypto?.randomUUID;
  return typeof o == "function" ? o.call(globalThis.crypto) : `${t}:${i}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}
function l(t) {
  return t === "claim" || t === "release";
}
async function $(t, i, o, n) {
  const e = { expected_version: n.expected_version };
  n.idempotency_key && (e.idempotency_key = n.idempotency_key), n.reason && (e.reason = n.reason), n.channel && (e.channel = n.channel);
  const a = await h(R(t, i, o), {
    method: "POST",
    json: e
  });
  if (!a.ok) throw new Error(await g(a, `Failed to ${o} assignment`));
}
function U(t, i) {
  return i.endpoint || t.dataset.actionEndpoint || t.dataset.assignmentActionEndpoint || "";
}
function v(t) {
  return r(t.dataset.channel) || typeof window < "u" && A(w(window.location) ?? new URLSearchParams(), "channel") || "";
}
function I(t, i) {
  i.initializeMenus === !1 || t.dataset.assignmentActionMenusEnhanced === "true" || (t.dataset.assignmentActionMenusEnhanced = "true", S(t, {
    containerSelector: "[data-action-menu]",
    triggerSelector: "[data-action-menu-trigger]",
    menuSelector: "[data-action-menu-content]",
    itemSelector: '[data-action-menu-item], [role="menuitem"], .action-item'
  }));
}
function x(t, i = {}) {
  if (!t || (I(t, i), t.dataset.assignmentActionsEnhanced === "true")) return;
  const o = U(t, i);
  if (!o) return;
  const n = Array.from(t.querySelectorAll("[data-translation-action]")).filter((e) => l(r(e.dataset.translationAction)));
  n.length !== 0 && (t.dataset.assignmentActionsEnhanced = "true", n.forEach((e) => {
    e.addEventListener("click", async (a) => {
      const s = r(e.dataset.translationAction);
      if (!l(s)) return;
      a.preventDefault();
      const c = r(e.dataset.assignmentId), d = Number.parseInt(r(e.dataset.rowVersion), 10), p = Number.isFinite(d) ? d : 0, m = v(t);
      if (c && !(e.disabled || e.getAttribute("aria-disabled") === "true")) {
        e.disabled = !0;
        try {
          await $(o, c, s, {
            expected_version: p,
            idempotency_key: E(c, s),
            ...m ? { channel: m } : {}
          }), typeof window < "u" && window.location.reload();
        } catch (f) {
          e.disabled = !1, y.error(f);
        }
      }
    });
  }));
}
export {
  R as buildAssignmentActionURL,
  x as initAssignmentSSRRowActions
};

//# sourceMappingURL=assignment-row-actions.js.map