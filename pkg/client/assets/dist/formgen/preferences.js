(() => {
  const l = "[data-preferences-form]", c = 'textarea[name="raw_ui"]', f = '[data-json-editor="true"]', o = "raw_ui must be valid JSON", m = "raw_ui must be a JSON object", E = (e) => !!e && typeof e == "object" && !Array.isArray(e), S = (e) => {
    const r = e.trim();
    if (!r)
      return { value: null, empty: !0 };
    try {
      return { value: JSON.parse(r), empty: !1 };
    } catch (t) {
      return { value: null, empty: !1, error: t instanceof Error ? t.message : o };
    }
  }, n = (e, r, t) => {
    if (e.setCustomValidity(t), t) {
      e.setAttribute("aria-invalid", "true"), r && r.setAttribute("data-json-editor-state", "invalid");
      return;
    }
    e.removeAttribute("aria-invalid"), r && r.setAttribute("data-json-editor-state", "valid");
  }, u = (e, r, t, s) => {
    const a = S(e.value || "");
    return a.empty ? (n(e, r, ""), !0) : a.error ? t ? (n(e, r, o), !1) : (n(e, r, ""), !0) : t && !E(a.value) ? (n(e, r, m), !1) : (n(e, r, ""), s && (e.value = JSON.stringify(a.value, null, 2)), !0);
  }, v = (e) => {
    const r = e.querySelector("form"), t = e.querySelector(c);
    if (!r || !t)
      return;
    const s = e.dataset.jsonEditorStrict === "true", a = t.closest(f), i = () => {
      if (!s) {
        n(t, a, "");
        return;
      }
      u(t, a, s, !1);
    };
    t.addEventListener("input", i), t.addEventListener("blur", i), r.addEventListener("submit", (y) => {
      !u(t, a, s, !0) && s && (y.preventDefault(), t.reportValidity());
    }), i();
  }, d = () => {
    document.querySelectorAll(l).forEach(v);
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", d) : d();
})();
//# sourceMappingURL=preferences.js.map
