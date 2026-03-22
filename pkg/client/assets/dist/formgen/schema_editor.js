(() => {
  const b = (t) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "block", L = (t) => {
    const e = t.closest("form");
    if (!e) return "block@v1.0.0";
    for (const n of [
      'input[name="name"]',
      'input[name="type"]',
      'input[name="slug"]'
    ]) {
      const s = e.querySelector(n)?.value?.trim();
      if (s) return `${b(s)}@v1.0.0`;
    }
    return "block@v1.0.0";
  }, m = (t) => {
    const e = t.trim();
    if (!e) return { value: {} };
    try {
      return { value: JSON.parse(e) };
    } catch (n) {
      const s = n instanceof Error ? n.message : "Invalid JSON", i = s.match(/position (\d+)/i) || s.match(/line (\d+)/i);
      return {
        value: null,
        error: s,
        errorLine: i ? parseInt(i[1], 10) : void 0
      };
    }
  }, S = (t) => JSON.stringify(t, null, 2), q = (t, e) => {
    const n = t && typeof t == "object" ? t : {}, s = n.metadata && typeof n.metadata == "object" && !Array.isArray(n.metadata) ? n.metadata : {};
    return s.schema_version || (s.schema_version = e), n.metadata = s, n;
  }, T = (t) => {
    if (!t || typeof t != "object") return {
      properties: 0,
      required: 0,
      depth: 0,
      types: []
    };
    let e = 0, n = 0, s = 0;
    const i = /* @__PURE__ */ new Set(), p = (a, l) => {
      if (!(!a || typeof a != "object")) {
        if (s = Math.max(s, l), a.type && i.add(String(a.type)), a.properties && typeof a.properties == "object") {
          const d = Object.keys(a.properties);
          e += d.length, d.forEach((r) => p(a.properties[r], l + 1));
        }
        if (Array.isArray(a.required) && (n += a.required.length), a.items && p(a.items, l + 1), a.allOf || a.anyOf || a.oneOf) {
          const d = a.allOf || a.anyOf || a.oneOf;
          Array.isArray(d) && d.forEach((r) => p(r, l + 1));
        }
      }
    };
    return p(t, 0), {
      properties: e,
      required: n,
      depth: s,
      types: Array.from(i)
    };
  }, o = (t, e, n) => {
    const s = t.querySelector("[data-schema-status]");
    s && (s.textContent = e, s.dataset.state = n, s.classList.remove("text-green-600", "text-red-600", "text-blue-600"), n === "ok" ? s.classList.add("text-green-600") : n === "error" ? s.classList.add("text-red-600") : n === "info" && s.classList.add("text-blue-600"));
  }, h = (t, e) => {
    if (!e) return;
    const n = t.value.split(`
`), s = n.length, i = String(s).length;
    e.innerHTML = n.map((p, a) => `<span class="block text-right pr-2">${String(a + 1).padStart(i, " ")}</span>`).join("");
  }, O = (t, e) => {
    e && (e.scrollTop = t.scrollTop);
  }, v = (t, e) => {
    const n = t.querySelector("[data-schema-stats]");
    if (!n) return;
    const s = T(e);
    n.innerHTML = `
      <span class="text-gray-600 dark:text-gray-400">
        ${s.properties} properties
        ${s.required > 0 ? ` · ${s.required} required` : ""}
        ${s.depth > 0 ? ` · depth ${s.depth}` : ""}
        ${s.types.length > 0 ? ` · types: ${s.types.join(", ")}` : ""}
      </span>
    `;
  }, x = async (t) => {
    try {
      return await navigator.clipboard.writeText(t), !0;
    } catch {
      const e = document.createElement("textarea");
      e.value = t, e.style.position = "fixed", e.style.opacity = "0", document.body.appendChild(e), e.select();
      const n = document.execCommand("copy");
      return document.body.removeChild(e), n;
    }
  }, C = (t, e) => {
    const n = t.selectionStart, s = t.selectionEnd, i = t.value;
    t.value = i.substring(0, n) + e + i.substring(s), t.selectionStart = t.selectionEnd = n + e.length, t.focus(), t.dispatchEvent(new Event("input", { bubbles: !0 }));
  }, E = {
    property: `"property_name": {
  "type": "string",
  "title": "Property Title",
  "description": "Property description"
}`,
    object: `{
  "type": "object",
  "title": "Object Title",
  "properties": {},
  "required": []
}`,
    array: `{
  "type": "array",
  "title": "Array Title",
  "items": {
    "type": "string"
  }
}`,
    enum: `{
  "type": "string",
  "title": "Enum Title",
  "enum": ["option1", "option2", "option3"]
}`
  }, k = () => {
    document.querySelectorAll("[data-schema-editor]").forEach((t) => {
      const e = t.querySelector("[data-schema-input]");
      if (!e) return;
      const n = t.querySelector("[data-schema-format]"), s = t.querySelector("[data-schema-validate]"), i = t.querySelector("[data-schema-metadata]"), p = t.querySelector("[data-schema-copy]"), a = t.querySelector("[data-schema-line-numbers]"), l = t.querySelector("[data-schema-stats]");
      t.querySelectorAll("[data-schema-template]").forEach((r) => {
        const u = r.dataset.schemaTemplate;
        u && E[u] && r.addEventListener("click", () => {
          C(e, E[u]), o(t, `Inserted ${u} template`, "info");
        });
      }), a && (h(e, a), e.addEventListener("input", () => h(e, a)), e.addEventListener("scroll", () => O(e, a))), n?.addEventListener("click", () => {
        const r = m(e.value);
        if (r.error) {
          o(t, r.error, "error");
          return;
        }
        e.value = S(r.value), a && h(e, a), l && v(t, r.value), o(t, "Formatted", "ok");
      }), s?.addEventListener("click", () => {
        const r = m(e.value);
        if (r.error) {
          o(t, r.error, "error");
          return;
        }
        l && v(t, r.value), o(t, "Valid JSON", "ok");
      }), i?.addEventListener("click", () => {
        const r = m(e.value);
        if (r.error) {
          o(t, r.error, "error");
          return;
        }
        const u = L(t), c = q(r.value, u);
        e.value = S(c), a && h(e, a), l && v(t, c), o(t, "Metadata inserted", "ok");
      }), p?.addEventListener("click", async () => {
        const r = await x(e.value);
        o(t, r ? "Copied to clipboard" : "Copy failed", r ? "ok" : "error");
      }), e.addEventListener("input", () => {
        o(t, "", "");
      }), e.addEventListener("keydown", (r) => {
        if ((r.ctrlKey || r.metaKey) && r.shiftKey && r.key === "f") {
          r.preventDefault(), n?.click();
          return;
        }
        if ((r.ctrlKey || r.metaKey) && r.key === "s") {
          r.preventDefault(), s?.click();
          return;
        }
        if ((r.ctrlKey || r.metaKey) && r.key === "m") {
          r.preventDefault(), i?.click();
          return;
        }
        if (r.key === "Tab") {
          r.preventDefault();
          const c = e.selectionStart, g = e.selectionEnd;
          if (r.shiftKey) {
            const y = e.value, f = y.lastIndexOf(`
`, c - 1) + 1;
            y.substring(f, c).match(/^  /) && (e.value = y.substring(0, f) + y.substring(f + 2), e.selectionStart = e.selectionEnd = c - 2);
          } else
            e.value = e.value.substring(0, c) + "  " + e.value.substring(g), e.selectionStart = e.selectionEnd = c + 2;
          e.dispatchEvent(new Event("input", { bubbles: !0 }));
        }
        const u = {
          "{": "}",
          "[": "]",
          '"': '"'
        };
        if (u[r.key]) {
          const c = e.selectionStart, g = e.selectionEnd;
          if (c === g) {
            r.preventDefault();
            const y = r.key, f = u[y];
            e.value = e.value.substring(0, c) + y + f + e.value.substring(g), e.selectionStart = e.selectionEnd = c + 1, e.dispatchEvent(new Event("input", { bubbles: !0 }));
          }
        }
      });
      const d = m(e.value);
      !d.error && l && v(t, d.value);
    });
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", k) : k();
})();

//# sourceMappingURL=schema_editor.js.map