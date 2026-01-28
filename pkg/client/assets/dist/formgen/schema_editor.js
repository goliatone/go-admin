(() => {
  const u = (e) => e.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "block", l = (e) => {
    const t = e.closest("form");
    if (!t)
      return "block@v1.0.0";
    const a = [
      'input[name="name"]',
      'input[name="type"]',
      'input[name="slug"]'
    ];
    for (const r of a) {
      const n = t.querySelector(r)?.value?.trim();
      if (n)
        return `${u(n)}@v1.0.0`;
    }
    return "block@v1.0.0";
  }, c = (e) => {
    const t = e.trim();
    if (!t)
      return { value: {} };
    try {
      return { value: JSON.parse(t) };
    } catch (a) {
      return { value: null, error: a instanceof Error ? a.message : "Invalid JSON" };
    }
  }, o = (e) => JSON.stringify(e, null, 2), m = (e, t) => {
    const a = e && typeof e == "object" ? e : {}, r = a.metadata && typeof a.metadata == "object" && !Array.isArray(a.metadata) ? a.metadata : {};
    return r.schema_version || (r.schema_version = t), a.metadata = r, a;
  }, s = (e, t, a) => {
    const r = e.querySelector("[data-schema-status]");
    r && (r.textContent = t, r.dataset.state = a, r.classList.remove("text-green-600", "text-red-600"), a === "ok" ? r.classList.add("text-green-600") : a === "error" && r.classList.add("text-red-600"));
  }, d = () => {
    document.querySelectorAll("[data-schema-editor]").forEach((e) => {
      const t = e.querySelector("[data-schema-input]");
      if (!t)
        return;
      const a = e.querySelector("[data-schema-format]"), r = e.querySelector("[data-schema-validate]"), i = e.querySelector("[data-schema-metadata]");
      a?.addEventListener("click", () => {
        const n = c(t.value);
        if (n.error) {
          s(e, n.error, "error");
          return;
        }
        t.value = o(n.value), s(e, "Formatted", "ok");
      }), r?.addEventListener("click", () => {
        const n = c(t.value);
        if (n.error) {
          s(e, n.error, "error");
          return;
        }
        s(e, "Valid JSON", "ok");
      }), i?.addEventListener("click", () => {
        const n = c(t.value);
        if (n.error) {
          s(e, n.error, "error");
          return;
        }
        const v = l(e), f = m(n.value, v);
        t.value = o(f), s(e, "Metadata inserted", "ok");
      }), t.addEventListener("input", () => {
        s(e, "", "");
      });
    });
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", d) : d();
})();
//# sourceMappingURL=schema_editor.js.map
