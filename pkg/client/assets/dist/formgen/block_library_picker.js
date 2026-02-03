import { initBlockEditor as _, registerBlockTemplate as $, refreshBlockTemplateRegistry as j, markRequiredFields as P } from "./block_editor.js";
function R(t) {
  if (!t) return {};
  try {
    const s = JSON.parse(t);
    if (s && typeof s == "object") return s;
  } catch {
  }
  return {};
}
function H(t, s) {
  if (!t) return s;
  try {
    return JSON.parse(t);
  } catch {
  }
  return s;
}
async function I(t) {
  const s = await fetch(t);
  if (!s.ok) throw new Error(`fetch ${t}: ${s.status}`);
  return s.json();
}
async function F(t, s) {
  const i = new URLSearchParams();
  s || i.set("filter_status", "active");
  const c = i.toString(), w = c ? `${t}?${c}` : t, n = await I(w);
  return Array.isArray(n.items) ? n.items.map((o) => {
    const b = typeof o.status == "string" ? o.status.trim() : "";
    return {
      slug: o.slug ?? "",
      label: o.name ?? o.label ?? o.slug ?? "",
      icon: o.icon,
      category: o.category,
      description: o.description,
      schema_version: o.schema_version,
      required_fields: o.required_fields,
      status: o.status,
      disabled: b.toLowerCase() !== "active"
    };
  }) : [];
}
async function O(t, s, i) {
  if (s.length === 0) return [];
  let c = `${t}/templates?slugs=${encodeURIComponent(s.join(","))}`;
  return i && (c += "&include_inactive=true"), (await I(c)).items ?? [];
}
async function U(t, s, i) {
  let c = `${t}/${encodeURIComponent(s)}/template`;
  i && (c += "?include_inactive=true");
  try {
    return (await I(c)).items?.[0] ?? null;
  } catch {
    return null;
  }
}
function D(t, s) {
  $(t, {
    type: s.slug,
    label: s.label,
    icon: s.icon || void 0,
    schemaVersion: s.schema_version || void 0,
    requiredFields: s.required_fields ?? [],
    html: s.html
  }), j(t);
}
function z(t, s) {
  const i = typeof t.schema_version == "string" ? t.schema_version.trim() : "";
  return i || (s ? s.replace("{type}", t.slug) : `${t.slug}@v1.0.0`);
}
function V(t, s, i) {
  const c = document.createElement("div");
  c.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", c.setAttribute("data-block-item", "true"), c.dataset.blockType = t.slug, s && c.setAttribute("draggable", "true");
  const w = document.createElement("div");
  w.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", w.setAttribute("data-block-header", "true");
  const n = document.createElement("div");
  n.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
  const o = document.createElement("span");
  o.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", o.textContent = t.icon || t.label.slice(0, 1).toUpperCase();
  const b = document.createElement("span");
  b.textContent = t.label;
  const x = document.createElement("span");
  x.className = "text-xs text-gray-500 dark:text-gray-400", x.textContent = t.slug;
  const v = z(t, i), C = document.createElement("span");
  C.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", C.textContent = v, C.setAttribute("data-block-schema-badge", "true"), n.appendChild(o), n.appendChild(b), n.appendChild(x), n.appendChild(C);
  const g = document.createElement("div");
  if (g.className = "flex items-center gap-2", s) {
    const m = document.createElement("button");
    m.type = "button", m.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", m.textContent = "Up", m.setAttribute("data-block-move-up", "true"), g.appendChild(m);
    const d = document.createElement("button");
    d.type = "button", d.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", d.textContent = "Down", d.setAttribute("data-block-move-down", "true"), g.appendChild(d);
  }
  const l = document.createElement("button");
  l.type = "button", l.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", l.textContent = "Collapse", l.setAttribute("data-block-collapse", "true"), g.appendChild(l);
  const p = document.createElement("button");
  if (p.type = "button", p.className = "text-xs text-red-600 hover:text-red-700", p.textContent = "Remove", p.setAttribute("data-block-remove", "true"), g.appendChild(p), s) {
    const m = document.createElement("span");
    m.className = "text-xs text-gray-400 cursor-move", m.textContent = "Drag", m.setAttribute("data-block-drag-handle", "true"), g.appendChild(m);
  }
  w.appendChild(n), w.appendChild(g);
  const A = document.createElement("div");
  A.className = "p-4 space-y-4", A.setAttribute("data-block-body", "true"), A.innerHTML = t.html;
  const L = t.required_fields || [];
  L.length > 0 && P(A, L), c.appendChild(w), c.appendChild(A);
  const E = document.createElement("input");
  E.type = "hidden", E.name = "_type", E.value = t.slug, E.readOnly = !0, E.setAttribute("data-block-type-input", "true"), E.setAttribute("data-block-ignore", "true"), c.appendChild(E), c.dataset.blockSchema = v;
  const f = document.createElement("input");
  return f.type = "hidden", f.name = "_schema", f.value = v, f.setAttribute("data-block-schema-input", "true"), f.setAttribute("data-block-ignore", "true"), c.appendChild(f), c;
}
function J(t, s, i) {
  const c = s.searchable !== !1, w = s.groupByCategory !== !1, n = document.createElement("div");
  n.className = "absolute left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden picker-popover dark:bg-slate-900 dark:border-gray-700", n.style.display = "none", n.setAttribute("data-picker-popover", "true"), n.setAttribute("data-picker-dropdown", "true"), n.setAttribute("role", "dialog"), n.setAttribute("aria-label", "Add block");
  let o = null;
  if (c) {
    const e = document.createElement("div");
    e.className = "sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700 p-2 z-10";
    const a = document.createElement("div");
    a.className = "relative";
    const u = document.createElement("svg");
    u.className = "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none", u.setAttribute("fill", "none"), u.setAttribute("stroke", "currentColor"), u.setAttribute("viewBox", "0 0 24 24"), u.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>', o = document.createElement("input"), o.type = "text", o.placeholder = "Search blocks…", o.className = "w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500", o.setAttribute("data-picker-search", "true"), o.setAttribute("autocomplete", "off"), a.appendChild(u), a.appendChild(o), e.appendChild(a), n.appendChild(e);
  }
  const b = document.createElement("div");
  b.className = "max-h-72 overflow-y-auto py-1", b.setAttribute("data-picker-cards", "true"), b.setAttribute("role", "listbox"), n.appendChild(b);
  const x = document.createElement("div");
  x.className = "px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400", x.setAttribute("data-picker-empty", "true"), x.style.display = "none";
  const v = document.createElement("svg");
  v.className = "mx-auto mb-2 w-8 h-8 text-gray-300 dark:text-gray-600", v.setAttribute("fill", "none"), v.setAttribute("stroke", "currentColor"), v.setAttribute("viewBox", "0 0 24 24"), v.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>';
  const C = document.createElement("p");
  C.setAttribute("data-picker-empty-text", "true"), C.textContent = "No block types available", x.appendChild(v), x.appendChild(C), n.appendChild(x);
  let g = !1, l = -1, p = [], A = [...t], L = /* @__PURE__ */ new Set();
  function E(e, a) {
    const u = a || !!e.disabled, r = document.createElement("button");
    r.type = "button", r.setAttribute("data-picker-item", e.slug), r.setAttribute("data-picker-card", e.slug), r.setAttribute("role", "option"), r.setAttribute("aria-selected", "false"), e.category && (r.dataset.category = e.category), r.className = "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors " + (u ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none"), u && (r.disabled = !0, r.setAttribute("aria-disabled", "true"), r.title = e.status && e.status.toLowerCase() !== "active" ? "This block type is inactive" : "This block type is not available");
    const k = document.createElement("span");
    k.className = "inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg text-xs font-semibold " + (u ? "bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"), k.textContent = e.icon || e.label.slice(0, 2).toUpperCase();
    const y = document.createElement("div");
    y.className = "flex-1 min-w-0";
    const S = document.createElement("div");
    S.className = "font-medium truncate " + (u ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"), S.textContent = e.label;
    const B = document.createElement("div");
    B.className = "text-xs text-gray-500 dark:text-gray-400 truncate";
    const q = [e.description || e.slug];
    return e.status && e.status.toLowerCase() !== "active" && q.push(`(${e.status})`), B.textContent = q.join(" "), y.appendChild(S), y.appendChild(B), r.appendChild(k), r.appendChild(y), r;
  }
  function f(e = "") {
    b.innerHTML = "", p = [], l = -1;
    const a = e.toLowerCase().trim(), u = a ? A.filter(
      (r) => r.label.toLowerCase().includes(a) || r.slug.toLowerCase().includes(a) || (r.category || "").toLowerCase().includes(a) || (r.description || "").toLowerCase().includes(a)
    ) : A;
    if (u.length === 0) {
      x.style.display = "";
      const r = x.querySelector("[data-picker-empty-text]");
      r && (r.textContent = a ? "No blocks match your search" : "No block types available");
      return;
    }
    if (x.style.display = "none", w) {
      const r = /* @__PURE__ */ new Map();
      for (const k of u) {
        const y = k.category || "other";
        r.has(y) || r.set(y, []), r.get(y).push(k);
      }
      for (const [k, y] of r) {
        const S = document.createElement("div");
        S.className = "px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900", S.setAttribute("data-picker-category", k), S.setAttribute("role", "presentation"), S.textContent = k, b.appendChild(S);
        for (const B of y) {
          const q = E(B, L.has(B.slug));
          b.appendChild(q), q.disabled || p.push(q);
        }
      }
    } else
      for (const r of u) {
        const k = E(r, L.has(r.slug));
        b.appendChild(k), k.disabled || p.push(k);
      }
  }
  f();
  function m(e) {
    if (l >= 0 && l < p.length) {
      const a = p[l];
      a.classList.remove("bg-blue-50", "dark:bg-blue-900/20"), a.setAttribute("aria-selected", "false");
    }
    if (l = e, l >= 0 && l < p.length) {
      const a = p[l];
      a.classList.add("bg-blue-50", "dark:bg-blue-900/20"), a.setAttribute("aria-selected", "true"), typeof a.scrollIntoView == "function" && a.scrollIntoView({ block: "nearest" });
    }
  }
  o && o.addEventListener("input", () => {
    f(o.value);
  });
  function d(e) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault(), p.length > 0 && m(l < p.length - 1 ? l + 1 : 0);
        break;
      case "ArrowUp":
        e.preventDefault(), p.length > 0 && m(l <= 0 ? p.length - 1 : l - 1);
        break;
      case "Enter":
        if (e.preventDefault(), l >= 0 && l < p.length) {
          const a = p[l].getAttribute("data-picker-item");
          a && i.onSelect(a);
        }
        break;
      case "Escape":
        e.preventDefault(), i.onClose();
        break;
      case "Tab":
        e.preventDefault(), o && document.activeElement !== o ? (o.focus(), l = -1) : p.length > 0 && m(0);
        break;
    }
  }
  b.addEventListener("click", (e) => {
    const a = e.target.closest("[data-picker-item]");
    if (!a || a.disabled) return;
    const u = a.getAttribute("data-picker-item");
    u && i.onSelect(u);
  });
  function M() {
    n.style.bottom = "", n.style.marginBottom = "", n.style.top = "", n.style.marginTop = "4px", requestAnimationFrame(() => {
      n.getBoundingClientRect().bottom > window.innerHeight - 8 && (n.style.bottom = "100%", n.style.top = "auto", n.style.marginBottom = "4px", n.style.marginTop = "0");
    });
  }
  function h() {
    n.style.display = "", g = !0, M(), o && (o.value = "", f(""), requestAnimationFrame(() => o.focus())), n.addEventListener("keydown", d);
  }
  function T() {
    n.style.display = "none", g = !1, l = -1, n.removeEventListener("keydown", d);
  }
  function N(e, a) {
    A = e, a && (L = a), f(o?.value || "");
  }
  return {
    element: n,
    open: h,
    close: T,
    isOpen: () => g,
    updateCards: N
  };
}
async function K(t) {
  const s = t.closest("[data-component-config]") || t, i = R(s.getAttribute("data-component-config")), c = t.dataset.apiBase || i.apiBase || "";
  if (!c) {
    console.warn("block-library-picker: missing data-api-base");
    return;
  }
  const w = H(t.dataset.allowedBlocks, i.allowedBlocks ?? []), n = parseInt(t.dataset.maxBlocks || "", 10) || i.maxBlocks || 0, o = i.lazyLoad !== !1, b = i.includeInactive === !0, x = i.sortable ?? t.dataset.blockSortable === "true", v = /* @__PURE__ */ new Set(), C = /* @__PURE__ */ new Map();
  let g;
  try {
    g = await F(c, b);
  } catch (e) {
    console.error("block-library-picker: metadata fetch failed", e);
    return;
  }
  if (w.length > 0) {
    const e = new Set(w.map((a) => a.toLowerCase()));
    g = g.filter((a) => e.has(a.slug.toLowerCase()));
  }
  const l = t.querySelector("input[data-block-output]");
  let p = [];
  if (l?.value)
    try {
      const e = JSON.parse(l.value);
      Array.isArray(e) && (p = e);
    } catch {
    }
  const A = [
    ...new Set(
      p.map((e) => e && typeof e == "object" ? e._type : "").filter((e) => typeof e == "string" && e.length > 0)
    )
  ];
  if (A.length > 0)
    try {
      const e = await O(c, A, b);
      for (const a of e)
        D(t, a), v.add(a.slug), C.set(a.slug, a);
    } catch (e) {
      console.error("block-library-picker: template fetch failed", e);
    }
  if (!o) {
    const e = g.filter((a) => !v.has(a.slug)).map((a) => a.slug);
    if (e.length > 0)
      try {
        const a = await O(c, e, b);
        for (const u of a)
          D(t, u), v.add(u.slug), C.set(u.slug, u);
      } catch (a) {
        console.error("block-library-picker: prefetch failed", a);
      }
  }
  _(t);
  const L = t.querySelector("[data-block-add-select]"), E = t.querySelector("[data-block-add]"), f = document.createElement("div");
  f.className = "mt-3", f.setAttribute("data-picker-controls", "true");
  const m = document.createElement("div");
  m.className = "relative inline-block";
  const d = document.createElement("button");
  d.type = "button", d.className = "inline-flex items-center gap-1.5 py-2 px-4 rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-800", d.setAttribute("data-picker-add-btn", "true"), d.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>${i.addLabel || "Add Block"}</span>`;
  const M = () => {
    if (n <= 0) return;
    const a = t.querySelectorAll("[data-block-item]").length >= n;
    d.disabled = a, d.classList.toggle("opacity-50", a), d.classList.toggle("cursor-not-allowed", a), d.title = a ? `Maximum of ${n} blocks reached` : "";
  }, h = J(g, i, {
    onSelect: (e) => T(e),
    onClose: () => {
      h.close(), d.focus();
    }
  });
  async function T(e) {
    const a = g.find((r) => r.slug === e);
    if (!a || a.disabled) return;
    if (n > 0 && t.querySelectorAll("[data-block-item]").length >= n) {
      h.close();
      return;
    }
    if (L instanceof HTMLSelectElement && Array.from(L.options).some((r) => r.value === e))
      L.value = e, E?.click();
    else {
      let r = C.get(e);
      if (!r)
        try {
          const y = await U(c, e, b);
          y && (r = y, D(t, r), v.add(r.slug), C.set(r.slug, r));
        } catch (y) {
          console.error(`block-library-picker: fetch template ${e} failed`, y), h.close();
          return;
        }
      if (!r) {
        h.close();
        return;
      }
      const k = t.querySelector("[data-block-list]");
      if (k) {
        const y = V(r, x, i.schemaVersionPattern);
        k.appendChild(y), y.dispatchEvent(new Event("input", { bubbles: !0 }));
      }
    }
    h.close(), M();
  }
  if (d.addEventListener("click", (e) => {
    e.stopPropagation(), !d.disabled && (h.isOpen() ? h.close() : h.open());
  }), d.addEventListener("keydown", (e) => {
    e.key === "ArrowDown" && !h.isOpen() && !d.disabled && (e.preventDefault(), h.open());
  }), document.addEventListener("click", (e) => {
    h.isOpen() && !m.contains(e.target) && h.close();
  }), document.addEventListener("keydown", (e) => {
    e.key === "Escape" && h.isOpen() && (h.close(), d.focus());
  }), n > 0) {
    const e = t.querySelector("[data-block-list]");
    e && new MutationObserver(() => M()).observe(e, { childList: !0 }), M();
  }
  m.appendChild(d), m.appendChild(h.element), f.appendChild(m);
  const N = t.querySelector("[data-block-list]");
  N && N.nextSibling ? N.parentElement?.insertBefore(f, N.nextSibling) : t.appendChild(f), t.setAttribute("data-picker-initialized", "true");
}
async function W(t = document) {
  const i = Array.from(
    t.querySelectorAll('[data-block-library-picker="true"]')
  ).filter((c) => c.getAttribute("data-picker-initialized") !== "true").map((c) => K(c));
  await Promise.all(i);
}
function G(t) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t, { once: !0 }) : t();
}
G(() => {
  W();
});
export {
  W as initBlockLibraryPickers
};
//# sourceMappingURL=block_library_picker.js.map
