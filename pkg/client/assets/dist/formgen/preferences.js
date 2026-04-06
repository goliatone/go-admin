import { parseJSONValue as O } from "../shared/json-parse.js";
(() => {
  const d = "[data-preferences-form]", c = 'textarea[name="raw_ui"]', f = '[data-json-editor="true"]', o = "raw_ui must be valid JSON", m = "raw_ui must be a JSON object", E = (e) => !!e && typeof e == "object" && !Array.isArray(e), S = (e) => {
    const r = e.trim();
    if (!r) return {
      value: null,
      empty: !0
    };
    let t = null;
    const n = O(r, null, { onError: (a) => {
      t = a;
    } });
    return t ? {
      value: null,
      empty: !1,
      error: t instanceof Error ? t.message : o
    } : {
      value: n,
      empty: !1
    };
  }, s = (e, r, t) => {
    if (e.setCustomValidity(t), t) {
      e.setAttribute("aria-invalid", "true"), r && r.setAttribute("data-json-editor-state", "invalid");
      return;
    }
    e.removeAttribute("aria-invalid"), r && r.setAttribute("data-json-editor-state", "valid");
  }, u = (e, r, t, n) => {
    const a = S(e.value || "");
    return a.empty ? (s(e, r, ""), !0) : a.error ? t ? (s(e, r, o), !1) : (s(e, r, ""), !0) : t && !E(a.value) ? (s(e, r, m), !1) : (s(e, r, ""), n && (e.value = JSON.stringify(a.value, null, 2)), !0);
  }, v = (e) => {
    const r = e.querySelector("form"), t = e.querySelector(c);
    if (!r || !t) return;
    const n = e.dataset.jsonEditorStrict === "true", a = t.closest(f), i = () => {
      if (!n) {
        s(t, a, "");
        return;
      }
      u(t, a, n, !1);
    };
    t.addEventListener("input", i), t.addEventListener("blur", i), r.addEventListener("submit", (y) => {
      !u(t, a, n, !0) && n && (y.preventDefault(), t.reportValidity());
    }), i();
  }, l = () => {
    document.querySelectorAll(d).forEach(v);
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", l) : l();
})();

//# sourceMappingURL=preferences.js.map