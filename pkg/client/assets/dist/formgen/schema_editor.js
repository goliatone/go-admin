import { parseJSONValue as A } from "../shared/json-parse.js";
(() => {
  const b = (t) => t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "block", L = (t) => {
    const e = t.closest("form");
    if (!e)
      return "block@v1.0.0";
    const s = [
      'input[name="name"]',
      'input[name="type"]',
      'input[name="slug"]'
    ];
    for (const n of s) {
      const c = e.querySelector(n)?.value?.trim();
      if (c)
        return `${b(c)}@v1.0.0`;
    }
    return "block@v1.0.0";
  }, m = (t) => {
    const e = t.trim();
    if (!e)
      return { value: {} };
    let s = null;
    const n = A(e, null, {
      onError: (i) => {
        s = i;
      }
    });
    if (s) {
      const i = s instanceof Error ? s.message : "Invalid JSON", c = i.match(/position (\d+)/i) || i.match(/line (\d+)/i), a = c ? parseInt(c[1], 10) : void 0;
      return { value: null, error: i, errorLine: a };
    }
    return { value: n };
  }, S = (t) => JSON.stringify(t, null, 2), q = (t, e) => {
    const s = t && typeof t == "object" ? t : {}, n = s.metadata && typeof s.metadata == "object" && !Array.isArray(s.metadata) ? s.metadata : {};
    return n.schema_version || (n.schema_version = e), s.metadata = n, s;
  }, T = (t) => {
    if (!t || typeof t != "object")
      return { properties: 0, required: 0, depth: 0, types: [] };
    let e = 0, s = 0, n = 0;
    const i = /* @__PURE__ */ new Set(), c = (a, u) => {
      if (!(!a || typeof a != "object")) {
        if (n = Math.max(n, u), a.type && i.add(String(a.type)), a.properties && typeof a.properties == "object") {
          const p = Object.keys(a.properties);
          e += p.length, p.forEach((r) => c(a.properties[r], u + 1));
        }
        if (Array.isArray(a.required) && (s += a.required.length), a.items && c(a.items, u + 1), a.allOf || a.anyOf || a.oneOf) {
          const p = a.allOf || a.anyOf || a.oneOf;
          Array.isArray(p) && p.forEach((r) => c(r, u + 1));
        }
      }
    };
    return c(t, 0), { properties: e, required: s, depth: n, types: Array.from(i) };
  }, l = (t, e, s) => {
    const n = t.querySelector("[data-schema-status]");
    n && (n.textContent = e, n.dataset.state = s, n.classList.remove("text-green-600", "text-red-600", "text-blue-600"), s === "ok" ? n.classList.add("text-green-600") : s === "error" ? n.classList.add("text-red-600") : s === "info" && n.classList.add("text-blue-600"));
  }, h = (t, e) => {
    if (!e) return;
    const s = t.value.split(`
`), n = s.length, i = String(n).length;
    e.innerHTML = s.map((c, a) => `<span class="block text-right pr-2">${String(a + 1).padStart(i, " ")}</span>`).join("");
  }, C = (t, e) => {
    e && (e.scrollTop = t.scrollTop);
  }, v = (t, e) => {
    const s = t.querySelector("[data-schema-stats]");
    if (!s) return;
    const n = T(e);
    s.innerHTML = `
      <span class="text-gray-600 dark:text-gray-400">
        ${n.properties} properties
        ${n.required > 0 ? ` · ${n.required} required` : ""}
        ${n.depth > 0 ? ` · depth ${n.depth}` : ""}
        ${n.types.length > 0 ? ` · types: ${n.types.join(", ")}` : ""}
      </span>
    `;
  }, O = async (t) => {
    try {
      return await navigator.clipboard.writeText(t), !0;
    } catch {
      const e = document.createElement("textarea");
      e.value = t, e.style.position = "fixed", e.style.opacity = "0", document.body.appendChild(e), e.select();
      const s = document.execCommand("copy");
      return document.body.removeChild(e), s;
    }
  }, x = (t, e) => {
    const s = t.selectionStart, n = t.selectionEnd, i = t.value;
    t.value = i.substring(0, s) + e + i.substring(n), t.selectionStart = t.selectionEnd = s + e.length, t.focus(), t.dispatchEvent(new Event("input", { bubbles: !0 }));
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
      if (!e)
        return;
      const s = t.querySelector("[data-schema-format]"), n = t.querySelector("[data-schema-validate]"), i = t.querySelector("[data-schema-metadata]"), c = t.querySelector("[data-schema-copy]"), a = t.querySelector("[data-schema-line-numbers]"), u = t.querySelector("[data-schema-stats]");
      t.querySelectorAll("[data-schema-template]").forEach((r) => {
        const d = r.dataset.schemaTemplate;
        d && E[d] && r.addEventListener("click", () => {
          x(e, E[d]), l(t, `Inserted ${d} template`, "info");
        });
      }), a && (h(e, a), e.addEventListener("input", () => h(e, a)), e.addEventListener("scroll", () => C(e, a))), s?.addEventListener("click", () => {
        const r = m(e.value);
        if (r.error) {
          l(t, r.error, "error");
          return;
        }
        e.value = S(r.value), a && h(e, a), u && v(t, r.value), l(t, "Formatted", "ok");
      }), n?.addEventListener("click", () => {
        const r = m(e.value);
        if (r.error) {
          l(t, r.error, "error");
          return;
        }
        u && v(t, r.value), l(t, "Valid JSON", "ok");
      }), i?.addEventListener("click", () => {
        const r = m(e.value);
        if (r.error) {
          l(t, r.error, "error");
          return;
        }
        const d = L(t), o = q(r.value, d);
        e.value = S(o), a && h(e, a), u && v(t, o), l(t, "Metadata inserted", "ok");
      }), c?.addEventListener("click", async () => {
        const r = await O(e.value);
        l(t, r ? "Copied to clipboard" : "Copy failed", r ? "ok" : "error");
      }), e.addEventListener("input", () => {
        l(t, "", "");
      }), e.addEventListener("keydown", (r) => {
        if ((r.ctrlKey || r.metaKey) && r.shiftKey && r.key === "f") {
          r.preventDefault(), s?.click();
          return;
        }
        if ((r.ctrlKey || r.metaKey) && r.key === "s") {
          r.preventDefault(), n?.click();
          return;
        }
        if ((r.ctrlKey || r.metaKey) && r.key === "m") {
          r.preventDefault(), i?.click();
          return;
        }
        if (r.key === "Tab") {
          r.preventDefault();
          const o = e.selectionStart, g = e.selectionEnd;
          if (r.shiftKey) {
            const f = e.value, y = f.lastIndexOf(`
`, o - 1) + 1;
            f.substring(y, o).match(/^  /) && (e.value = f.substring(0, y) + f.substring(y + 2), e.selectionStart = e.selectionEnd = o - 2);
          } else
            e.value = e.value.substring(0, o) + "  " + e.value.substring(g), e.selectionStart = e.selectionEnd = o + 2;
          e.dispatchEvent(new Event("input", { bubbles: !0 }));
        }
        const d = { "{": "}", "[": "]", '"': '"' };
        if (d[r.key]) {
          const o = e.selectionStart, g = e.selectionEnd;
          if (o === g) {
            r.preventDefault();
            const f = r.key, y = d[f];
            e.value = e.value.substring(0, o) + f + y + e.value.substring(g), e.selectionStart = e.selectionEnd = o + 1, e.dispatchEvent(new Event("input", { bubbles: !0 }));
          }
        }
      });
      const p = m(e.value);
      !p.error && u && v(t, p.value);
    });
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", k) : k();
})();
//# sourceMappingURL=schema_editor.js.map
