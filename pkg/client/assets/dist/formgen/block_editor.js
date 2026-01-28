function R(e) {
  if (!e) return {};
  try {
    const t = JSON.parse(e);
    if (t && typeof t == "object")
      return t;
  } catch {
  }
  return {};
}
function V(e) {
  const t = e.closest("[data-component-config]");
  return R(t?.getAttribute("data-component-config") ?? null);
}
function I(e) {
  if (e == null) return;
  const t = e.trim().toLowerCase();
  if (t === "true") return !0;
  if (t === "false") return !1;
}
function $(e) {
  const t = e.querySelector("[data-block-list]"), r = e.querySelector("input[data-block-output]");
  if (!t || !r) return null;
  const a = e.querySelector("[data-block-add-select]"), d = e.querySelector("[data-block-add]"), i = e.querySelector("[data-block-empty]");
  return { root: e, list: t, output: r, addSelect: a ?? void 0, addButton: d ?? void 0, emptyState: i ?? void 0 };
}
function B(e) {
  return e.replace(/\]/g, "").split(/\.|\[/).map((r) => r.trim()).filter((r) => r.length > 0);
}
function J(e, t, r) {
  if (!e) return r;
  const a = B(r);
  let d = `${e}[${t}]`;
  for (const i of a)
    d += `[${i}]`;
  return d;
}
function P(e, t) {
  if (!e || !t) return;
  const r = B(t);
  let a = e;
  for (const d of r) {
    if (a == null) return;
    a = a[d];
  }
  return a;
}
function U(e, t, r) {
  if (!t) return;
  const a = B(t);
  if (a.length === 0) return;
  let d = e;
  a.forEach((i, u) => {
    const A = u === a.length - 1, S = a[u + 1], C = S !== void 0 && /^\d+$/.test(S);
    if (A) {
      if (i === "") return;
      d[i] = r;
      return;
    }
    (d[i] == null || typeof d[i] != "object") && (d[i] = C ? [] : {}), d = d[i];
  });
}
function z(e) {
  if (e.length === 0) return;
  const t = e[0];
  if (t instanceof HTMLSelectElement && t.multiple)
    return Array.from(t.selectedOptions).map((r) => r.value);
  if (t instanceof HTMLInputElement) {
    if (t.type === "radio") {
      const r = e.find((a) => a.checked);
      return r ? r.value : void 0;
    }
    if (t.type === "checkbox")
      return e.length > 1 ? e.filter((r) => r.checked).map((r) => r.value) : t.checked;
  }
  return t.value;
}
function W(e, t) {
  if (t != null) {
    if (e instanceof HTMLInputElement) {
      if (e.type === "checkbox") {
        Array.isArray(t) ? e.checked = t.map(String).includes(e.value) : typeof t == "boolean" ? e.checked = t : e.checked = String(t) === e.value || t === !0;
        return;
      }
      if (e.type === "radio") {
        e.checked = String(t) === e.value;
        return;
      }
    }
    if (e instanceof HTMLSelectElement && e.multiple) {
      const r = Array.isArray(t) ? t.map(String) : [String(t)];
      Array.from(e.options).forEach((a) => {
        a.selected = r.includes(a.value);
      });
      return;
    }
    e.value = String(t);
  }
}
function Y(e) {
  const t = /* @__PURE__ */ new Map();
  return e.querySelectorAll("template[data-block-template]").forEach((r) => {
    const a = r.dataset.blockType?.trim();
    if (!a) return;
    const d = r.dataset.blockLabel?.trim() || a, i = r.dataset.blockIcon?.trim(), u = I(r.dataset.blockCollapsed);
    t.set(a, { type: a, label: d, icon: i || void 0, collapsed: u, template: r });
  }), t;
}
function G(e, t) {
  const r = e.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (r.length === 0) {
    const a = document.createElement("input");
    a.type = "hidden", a.name = "_type", a.value = t, a.setAttribute("data-block-type-input", "true"), a.setAttribute("data-block-ignore", "true"), e.appendChild(a);
    return;
  }
  r.forEach((a) => {
    a.setAttribute("data-block-type-input", "true"), a.setAttribute("data-block-ignore", "true"), a instanceof HTMLInputElement ? (a.value = t, a.readOnly = !0) : a instanceof HTMLSelectElement ? (Array.from(a.options).forEach((i) => {
      i.selected = i.value === t;
    }), a.disabled = !0) : (a.value = t, a.readOnly = !0);
    const d = a.closest("[data-component]");
    d && d.classList.add("hidden");
  });
}
function K(e) {
  const t = $(e);
  if (!t) return;
  const r = V(e), a = Y(e), d = e.dataset.blockField || t.output.name, i = I(e.dataset.blockSortable), u = r.sortable ?? i ?? !1, A = r.allowDrag ?? u, S = r.addLabel || t.addButton?.dataset.blockAddLabel || "Add block", C = r.emptyLabel || t.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.";
  t.addButton && (t.addButton.textContent = S), t.emptyState && (t.emptyState.textContent = C);
  const p = t.list, N = t.output, T = () => {
    const o = Array.from(p.querySelectorAll("[data-block-item]")).map((n) => {
      const s = {}, l = /* @__PURE__ */ new Map();
      n.querySelectorAll("input, select, textarea").forEach((f) => {
        if (f.dataset.blockIgnore === "true" || f.hasAttribute("data-block-ignore")) return;
        const b = f.getAttribute("data-block-field-name") || f.name || "";
        b && (l.has(b) || l.set(b, []), l.get(b).push(f));
      }), l.forEach((f, b) => {
        const m = z(f);
        m !== void 0 && U(s, b, m);
      });
      const g = n.dataset.blockType || s._type || "";
      return g && (s._type = g), s;
    });
    N.value = JSON.stringify(o);
  }, D = () => {
    Array.from(p.querySelectorAll("[data-block-item]")).forEach((o, n) => {
      o.querySelectorAll("input, select, textarea").forEach((s) => {
        if (s.dataset.blockIgnore === "true" || s.hasAttribute("data-block-ignore")) return;
        const l = s.getAttribute("data-block-field-name") || s.name;
        l && (s.hasAttribute("data-block-field-name") || s.setAttribute("data-block-field-name", l), s.name = J(d, n, l));
      });
    });
  }, O = () => {
    if (!t.emptyState) return;
    const c = p.querySelector("[data-block-item]");
    t.emptyState.classList.toggle("hidden", !!c);
  }, k = () => {
    D(), T(), O();
  }, w = e.closest("form");
  w && w.addEventListener("submit", () => {
    T();
  });
  const j = (c, o) => {
    c.querySelectorAll("input, select, textarea").forEach((n) => {
      const s = n.getAttribute("data-block-field-name") || n.name;
      if (!s) return;
      const l = P(o, s);
      l !== void 0 && W(n, l);
    });
  }, _ = (c, o) => {
    const n = document.createElement("div");
    n.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", n.setAttribute("data-block-item", "true"), n.dataset.blockType = c.type, u && n.setAttribute("draggable", "true");
    const s = document.createElement("div");
    s.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", s.setAttribute("data-block-header", "true");
    const l = document.createElement("div");
    l.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const g = document.createElement("span");
    g.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", g.textContent = c.icon || c.label.slice(0, 1).toUpperCase();
    const f = document.createElement("span");
    f.textContent = c.label;
    const b = document.createElement("span");
    b.className = "text-xs text-gray-500 dark:text-gray-400", b.textContent = c.type, l.appendChild(g), l.appendChild(f), l.appendChild(b);
    const m = document.createElement("div");
    if (m.className = "flex items-center gap-2", u) {
      const y = document.createElement("button");
      y.type = "button", y.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", y.textContent = "Up", y.setAttribute("data-block-move-up", "true");
      const E = document.createElement("button");
      E.type = "button", E.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", E.textContent = "Down", E.setAttribute("data-block-move-down", "true"), m.appendChild(y), m.appendChild(E);
    }
    const h = document.createElement("button");
    h.type = "button", h.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", h.textContent = "Collapse", h.setAttribute("data-block-collapse", "true");
    const x = document.createElement("button");
    if (x.type = "button", x.className = "text-xs text-red-600 hover:text-red-700", x.textContent = "Remove", x.setAttribute("data-block-remove", "true"), m.appendChild(h), m.appendChild(x), u) {
      const y = document.createElement("span");
      y.className = "text-xs text-gray-400 cursor-move", y.textContent = "Drag", y.setAttribute("data-block-drag-handle", "true"), m.appendChild(y);
    }
    s.appendChild(l), s.appendChild(m);
    const v = document.createElement("div");
    v.className = "p-4 space-y-4", v.setAttribute("data-block-body", "true");
    const F = c.template.content.cloneNode(!0);
    return v.appendChild(F), n.appendChild(s), n.appendChild(v), G(n, c.type), o && j(n, o), (c.collapsed ?? !1) && (v.classList.add("hidden"), n.dataset.blockCollapsed = "true", h.textContent = "Expand"), n;
  }, q = (c, o) => {
    const n = a.get(c);
    if (!n) return;
    const s = _(n, o);
    p.appendChild(s), k();
  }, M = t.addButton, L = t.addSelect;
  if (M && L && M.addEventListener("click", () => {
    const c = L.value.trim();
    c && (q(c), L.value = "");
  }), e.addEventListener("click", (c) => {
    const o = c.target;
    if (!(o instanceof HTMLElement)) return;
    const n = o.closest("[data-block-item]");
    if (n) {
      if (o.closest("[data-block-remove]")) {
        n.remove(), k();
        return;
      }
      if (o.closest("[data-block-collapse]")) {
        const s = n.querySelector("[data-block-body]");
        if (s) {
          const l = s.classList.toggle("hidden");
          n.dataset.blockCollapsed = l ? "true" : "false";
          const g = o.closest("[data-block-collapse]");
          g && (g.textContent = l ? "Expand" : "Collapse");
        }
        return;
      }
      if (o.closest("[data-block-move-up]")) {
        const s = n.previousElementSibling;
        s && p.insertBefore(n, s), k();
        return;
      }
      if (o.closest("[data-block-move-down]")) {
        const s = n.nextElementSibling;
        s && p.insertBefore(s, n), k();
        return;
      }
    }
  }), e.addEventListener("input", (c) => {
    const o = c.target;
    !(o instanceof HTMLElement) || !o.closest("[data-block-item]") || k();
  }), e.addEventListener("change", (c) => {
    const o = c.target;
    !(o instanceof HTMLElement) || !o.closest("[data-block-item]") || k();
  }), u && A) {
    let c = null;
    p.addEventListener("dragstart", (o) => {
      const n = o.target;
      if (!(n instanceof HTMLElement)) return;
      if (!n.closest("[data-block-drag-handle]")) {
        o.preventDefault();
        return;
      }
      const l = n.closest("[data-block-item]");
      l && (c = l, l.classList.add("opacity-70"), o.dataTransfer?.setData("text/plain", "block"));
    }), p.addEventListener("dragover", (o) => {
      if (!c) return;
      o.preventDefault();
      const n = o.target instanceof HTMLElement ? o.target.closest("[data-block-item]") : null;
      if (!n || n === c) return;
      const s = n.getBoundingClientRect(), l = o.clientY > s.top + s.height / 2;
      p.insertBefore(c, l ? n.nextSibling : n);
    }), p.addEventListener("dragend", () => {
      c && (c.classList.remove("opacity-70"), c = null, k());
    });
  }
  if (t.addSelect) {
    const c = document.createElement("option");
    c.value = "", c.textContent = "Select block type", t.addSelect.appendChild(c), a.forEach((o) => {
      const n = document.createElement("option");
      n.value = o.type, n.textContent = o.label, t.addSelect?.appendChild(n);
    }), t.addSelect.value = "";
  }
  const H = N.value?.trim();
  if (H)
    try {
      const c = JSON.parse(H);
      Array.isArray(c) && c.forEach((o) => {
        const n = typeof o == "object" && o ? o._type : "";
        n && a.has(n) && q(n, o);
      });
    } catch {
    }
  k();
}
function Q(e = document) {
  Array.from(e.querySelectorAll('[data-component="block"], [data-block-editor]')).forEach((r) => K(r));
}
function X(e) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e, { once: !0 }) : e();
}
X(() => Q());
export {
  Q as initBlockEditors
};
//# sourceMappingURL=block_editor.js.map
