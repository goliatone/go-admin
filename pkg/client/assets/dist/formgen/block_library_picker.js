import { initBlockEditor as P, markRequiredFields as j, refreshBlockTemplateRegistry as R, registerBlockTemplate as H } from "./block_editor.js";
function F(t) {
  if (!t) return {};
  try {
    const a = JSON.parse(t);
    if (a && typeof a == "object") return a;
  } catch {
  }
  return {};
}
function z(t, a) {
  if (!t) return a;
  try {
    return JSON.parse(t);
  } catch {
  }
  return a;
}
function D(t) {
  const a = t.trim().toLowerCase();
  return a ? Array.from(/* @__PURE__ */ new Set([
    a,
    a.replace(/-/g, "_"),
    a.replace(/_/g, "-")
  ])) : [];
}
function U(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function V(t) {
  const a = t.trim(), o = a.replace(/\/+$/, "");
  if (!o) {
    const m = a === "/" ? "/api" : "";
    return m ? {
      listBase: `${m}/panels/block_definitions`,
      templatesBase: `${m}/block_definitions_meta`
    } : {
      listBase: "",
      templatesBase: ""
    };
  }
  if (o.endsWith("/block_definitions_meta")) return {
    listBase: `${o.replace(/\/block_definitions_meta$/, "")}/panels/block_definitions`,
    templatesBase: o
  };
  if (o.endsWith("/panels/block_definitions")) return {
    listBase: o,
    templatesBase: o.replace(/\/panels\/block_definitions$/, "/block_definitions_meta")
  };
  if (o.endsWith("/block_definitions")) return {
    listBase: "",
    templatesBase: ""
  };
  const l = /\/api(\/|$)/.test(o) ? o : `${o}/api`;
  return {
    listBase: `${l}/panels/block_definitions`,
    templatesBase: `${l}/block_definitions_meta`
  };
}
function W(t, a) {
  const o = t.querySelector("[data-picker-load-error]");
  o && o.remove();
  const l = document.createElement("div");
  l.setAttribute("data-picker-load-error", "true"), l.className = "mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-800/70 dark:bg-red-900/20", l.innerHTML = `
    <div class="flex items-start gap-2">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <p class="text-xs text-red-700 dark:text-red-300">${U(a)}</p>
    </div>
    <button type="button" data-picker-retry
            class="mt-2 ml-6 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
      Retry
    </button>
  `, l.querySelector("[data-picker-retry]")?.addEventListener("click", () => {
    l.remove(), O(t);
  }), t.prepend(l);
}
async function T(t) {
  const a = await fetch(t);
  if (!a.ok) throw new Error(`fetch ${t}: ${a.status}`);
  return a.json();
}
async function J(t, a) {
  const o = new URLSearchParams();
  a || o.set("filter_status", "active");
  const l = o.toString(), m = await T(l ? `${t}?${l}` : t);
  return Array.isArray(m.items) ? m.items.map((n) => {
    const c = typeof n.status == "string" ? n.status.trim() : "";
    return {
      slug: n.slug ?? "",
      label: n.name ?? n.label ?? n.slug ?? "",
      icon: n.icon,
      category: n.category,
      description: n.description,
      schema_version: n.schema_version,
      required_fields: n.required_fields,
      status: n.status,
      disabled: c.toLowerCase() !== "active"
    };
  }) : [];
}
async function I(t, a, o) {
  if (a.length === 0) return [];
  let l = `${t}/templates?slugs=${encodeURIComponent(a.join(","))}`;
  return o && (l += "&include_inactive=true"), (await T(l)).items ?? [];
}
async function K(t, a, o) {
  let l = `${t}/templates/${encodeURIComponent(a)}`;
  o && (l += "?include_inactive=true");
  try {
    return (await T(l)).items?.[0] ?? null;
  } catch {
    return null;
  }
}
function M(t, a) {
  H(t, {
    type: a.slug,
    label: a.label,
    icon: a.icon || void 0,
    schemaVersion: a.schema_version || void 0,
    requiredFields: a.required_fields ?? [],
    html: a.html
  }), R(t);
}
function G(t, a) {
  const o = typeof t.schema_version == "string" ? t.schema_version.trim() : "";
  return o || (a ? a.replace("{type}", t.slug) : `${t.slug}@v1.0.0`);
}
function Q(t, a, o) {
  const l = document.createElement("div");
  l.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", l.setAttribute("data-block-item", "true"), l.dataset.blockType = t.slug, a && l.setAttribute("draggable", "true");
  const m = document.createElement("div");
  m.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", m.setAttribute("data-block-header", "true");
  const n = document.createElement("div");
  n.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
  const c = document.createElement("span");
  c.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", c.textContent = t.icon || t.label.slice(0, 1).toUpperCase();
  const x = document.createElement("span");
  x.textContent = t.label;
  const b = document.createElement("span");
  b.className = "text-xs text-gray-500 dark:text-gray-400", b.textContent = t.slug;
  const E = G(t, o), C = document.createElement("span");
  C.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", C.textContent = E, C.setAttribute("data-block-schema-badge", "true"), n.appendChild(c), n.appendChild(x), n.appendChild(b), n.appendChild(C);
  const k = document.createElement("div");
  if (k.className = "flex items-center gap-2", a) {
    const p = document.createElement("button");
    p.type = "button", p.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", p.textContent = "Up", p.setAttribute("data-block-move-up", "true"), k.appendChild(p);
    const w = document.createElement("button");
    w.type = "button", w.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", w.textContent = "Down", w.setAttribute("data-block-move-down", "true"), k.appendChild(w);
  }
  const d = document.createElement("button");
  d.type = "button", d.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", d.textContent = "Collapse", d.setAttribute("data-block-collapse", "true"), k.appendChild(d);
  const u = document.createElement("button");
  if (u.type = "button", u.className = "text-xs text-red-600 hover:text-red-700", u.textContent = "Remove", u.setAttribute("data-block-remove", "true"), k.appendChild(u), a) {
    const p = document.createElement("span");
    p.className = "text-xs text-gray-400 cursor-move", p.textContent = "Drag", p.setAttribute("data-block-drag-handle", "true"), k.appendChild(p);
  }
  m.appendChild(n), m.appendChild(k);
  const B = document.createElement("div");
  B.className = "p-4 space-y-4", B.setAttribute("data-block-body", "true"), B.innerHTML = t.html;
  const L = t.required_fields || [];
  L.length > 0 && j(B, L), l.appendChild(m), l.appendChild(B);
  const v = document.createElement("input");
  v.type = "hidden", v.name = "_type", v.value = t.slug, v.readOnly = !0, v.setAttribute("data-block-type-input", "true"), v.setAttribute("data-block-ignore", "true"), l.appendChild(v), l.dataset.blockSchema = E;
  const A = document.createElement("input");
  return A.type = "hidden", A.name = "_schema", A.value = E, A.setAttribute("data-block-schema-input", "true"), A.setAttribute("data-block-ignore", "true"), l.appendChild(A), l;
}
function X(t, a, o) {
  const l = a.searchable !== !1, m = a.groupByCategory !== !1, n = document.createElement("div");
  n.className = "absolute left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden picker-popover dark:bg-slate-900 dark:border-gray-700", n.style.display = "none", n.setAttribute("data-picker-popover", "true"), n.setAttribute("data-picker-dropdown", "true"), n.setAttribute("role", "dialog"), n.setAttribute("aria-label", "Add block");
  let c = null;
  if (l) {
    const s = document.createElement("div");
    s.className = "sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700 p-2 z-10";
    const e = document.createElement("div");
    e.className = "relative";
    const i = document.createElement("svg");
    i.className = "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none", i.setAttribute("fill", "none"), i.setAttribute("stroke", "currentColor"), i.setAttribute("viewBox", "0 0 24 24"), i.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>', c = document.createElement("input"), c.type = "text", c.placeholder = "Search blocks…", c.className = "w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500", c.setAttribute("data-picker-search", "true"), c.setAttribute("autocomplete", "off"), e.appendChild(i), e.appendChild(c), s.appendChild(e), n.appendChild(s);
  }
  const x = document.createElement("div");
  x.className = "max-h-72 overflow-y-auto py-1", x.setAttribute("data-picker-cards", "true"), x.setAttribute("role", "listbox"), n.appendChild(x);
  const b = document.createElement("div");
  b.className = "px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400", b.setAttribute("data-picker-empty", "true"), b.style.display = "none";
  const E = document.createElement("svg");
  E.className = "mx-auto mb-2 w-8 h-8 text-gray-300 dark:text-gray-600", E.setAttribute("fill", "none"), E.setAttribute("stroke", "currentColor"), E.setAttribute("viewBox", "0 0 24 24"), E.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>';
  const C = document.createElement("p");
  C.setAttribute("data-picker-empty-text", "true"), C.textContent = "No block types available", b.appendChild(E), b.appendChild(C), n.appendChild(b);
  let k = !1, d = -1, u = [], B = [...t], L = /* @__PURE__ */ new Set();
  function v(s, e) {
    const i = e || !!s.disabled, r = document.createElement("button");
    r.type = "button", r.setAttribute("data-picker-item", s.slug), r.setAttribute("data-picker-card", s.slug), r.setAttribute("role", "option"), r.setAttribute("aria-selected", "false"), s.category && (r.dataset.category = s.category), r.className = "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors " + (i ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none"), i && (r.disabled = !0, r.setAttribute("aria-disabled", "true"), r.title = s.status && s.status.toLowerCase() !== "active" ? "This block type is inactive" : "This block type is not available");
    const h = document.createElement("span");
    h.className = "inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg text-xs font-semibold " + (i ? "bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"), h.textContent = s.icon || s.label.slice(0, 2).toUpperCase();
    const f = document.createElement("div");
    f.className = "flex-1 min-w-0";
    const S = document.createElement("div");
    S.className = "font-medium truncate " + (i ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"), S.textContent = s.label;
    const N = document.createElement("div");
    N.className = "text-xs text-gray-500 dark:text-gray-400 truncate";
    const _ = [s.description || s.slug];
    return s.status && s.status.toLowerCase() !== "active" && _.push(`(${s.status})`), N.textContent = _.join(" "), f.appendChild(S), f.appendChild(N), r.appendChild(h), r.appendChild(f), r;
  }
  function A(s = "") {
    x.innerHTML = "", u = [], d = -1;
    const e = s.toLowerCase().trim(), i = e ? B.filter((r) => r.label.toLowerCase().includes(e) || r.slug.toLowerCase().includes(e) || (r.category || "").toLowerCase().includes(e) || (r.description || "").toLowerCase().includes(e)) : B;
    if (i.length === 0) {
      b.style.display = "";
      const r = b.querySelector("[data-picker-empty-text]");
      r && (r.textContent = e ? "No blocks match your search" : "No block types available");
      return;
    }
    if (b.style.display = "none", m) {
      const r = /* @__PURE__ */ new Map();
      for (const h of i) {
        const f = h.category || "other";
        r.has(f) || r.set(f, []), r.get(f).push(h);
      }
      for (const [h, f] of r) {
        const S = document.createElement("div");
        S.className = "px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900", S.setAttribute("data-picker-category", h), S.setAttribute("role", "presentation"), S.textContent = h, x.appendChild(S);
        for (const N of f) {
          const _ = v(N, L.has(N.slug));
          x.appendChild(_), _.disabled || u.push(_);
        }
      }
    } else for (const r of i) {
      const h = v(r, L.has(r.slug));
      x.appendChild(h), h.disabled || u.push(h);
    }
  }
  A();
  function p(s) {
    if (d >= 0 && d < u.length) {
      const e = u[d];
      e.classList.remove("bg-blue-50", "dark:bg-blue-900/20"), e.setAttribute("aria-selected", "false");
    }
    if (d = s, d >= 0 && d < u.length) {
      const e = u[d];
      e.classList.add("bg-blue-50", "dark:bg-blue-900/20"), e.setAttribute("aria-selected", "true"), typeof e.scrollIntoView == "function" && e.scrollIntoView({ block: "nearest" });
    }
  }
  c && c.addEventListener("input", () => {
    A(c.value);
  });
  function w(s) {
    switch (s.key) {
      case "ArrowDown":
        s.preventDefault(), u.length > 0 && p(d < u.length - 1 ? d + 1 : 0);
        break;
      case "ArrowUp":
        s.preventDefault(), u.length > 0 && p(d <= 0 ? u.length - 1 : d - 1);
        break;
      case "Enter":
        if (s.preventDefault(), d >= 0 && d < u.length) {
          const e = u[d].getAttribute("data-picker-item");
          e && o.onSelect(e);
        }
        break;
      case "Escape":
        s.preventDefault(), o.onClose();
        break;
      case "Tab":
        s.preventDefault(), c && document.activeElement !== c ? (c.focus(), d = -1) : u.length > 0 && p(0);
        break;
    }
  }
  x.addEventListener("click", (s) => {
    const e = s.target.closest("[data-picker-item]");
    if (!e || e.disabled) return;
    const i = e.getAttribute("data-picker-item");
    i && o.onSelect(i);
  });
  function g() {
    n.style.bottom = "", n.style.marginBottom = "", n.style.top = "", n.style.marginTop = "4px", requestAnimationFrame(() => {
      n.getBoundingClientRect().bottom > window.innerHeight - 8 && (n.style.bottom = "100%", n.style.top = "auto", n.style.marginBottom = "4px", n.style.marginTop = "0");
    });
  }
  function $() {
    n.style.display = "", k = !0, g(), c && (c.value = "", A(""), requestAnimationFrame(() => c.focus())), n.addEventListener("keydown", w);
  }
  function y() {
    n.style.display = "none", k = !1, d = -1, n.removeEventListener("keydown", w);
  }
  function q(s, e) {
    B = s, e && (L = e), A(c?.value || "");
  }
  return {
    element: n,
    open: $,
    close: y,
    isOpen: () => k,
    updateCards: q
  };
}
async function O(t) {
  const a = F((t.closest("[data-component-config]") || t).getAttribute("data-component-config")), o = t.dataset.apiBase || a.apiBase || "";
  if (!o) {
    console.warn("block-library-picker: missing data-api-base");
    return;
  }
  const { listBase: l, templatesBase: m } = V(o);
  if (!l || !m) {
    console.warn("block-library-picker: invalid api base", o);
    return;
  }
  const n = z(t.dataset.allowedBlocks, a.allowedBlocks ?? []), c = parseInt(t.dataset.maxBlocks || "", 10) || a.maxBlocks || 0, x = a.lazyLoad !== !1, b = a.includeInactive === !0, E = a.sortable ?? t.dataset.blockSortable === "true", C = /* @__PURE__ */ new Set(), k = /* @__PURE__ */ new Map();
  let d;
  try {
    d = await J(l, b);
  } catch (e) {
    console.error("block-library-picker: metadata fetch failed", e), W(t, `Failed to load block definitions: ${e instanceof Error ? e.message : "Failed to load block definitions."}`);
    return;
  }
  if (n.length > 0) {
    const e = /* @__PURE__ */ new Set();
    for (const i of n) for (const r of D(i)) e.add(r);
    d = d.filter((i) => {
      for (const r of D(i.slug)) if (e.has(r)) return !0;
      return !1;
    });
  }
  const u = t.querySelector("input[data-block-output]");
  let B = [];
  if (u?.value) try {
    const e = JSON.parse(u.value);
    Array.isArray(e) && (B = e);
  } catch {
  }
  const L = [...new Set(B.map((e) => e && typeof e == "object" ? e._type : "").filter((e) => typeof e == "string" && e.length > 0))];
  if (L.length > 0) try {
    const e = await I(m, L, b);
    for (const i of e)
      M(t, i), C.add(i.slug), k.set(i.slug, i);
  } catch (e) {
    console.error("block-library-picker: template fetch failed", e);
  }
  if (!x) {
    const e = d.filter((i) => !C.has(i.slug)).map((i) => i.slug);
    if (e.length > 0) try {
      const i = await I(m, e, b);
      for (const r of i)
        M(t, r), C.add(r.slug), k.set(r.slug, r);
    } catch (i) {
      console.error("block-library-picker: prefetch failed", i);
    }
  }
  P(t);
  const v = t.querySelector("[data-block-add-select]"), A = t.querySelector("[data-block-add]"), p = document.createElement("div");
  p.className = "mt-3", p.setAttribute("data-picker-controls", "true");
  const w = document.createElement("div");
  w.className = "relative inline-block";
  const g = document.createElement("button");
  g.type = "button", g.className = "inline-flex items-center gap-1.5 py-2 px-4 rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-800", g.setAttribute("data-picker-add-btn", "true"), g.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>${typeof a.addLabel == "string" && a.addLabel.trim() ? a.addLabel.trim() : "Add Block"}</span>`;
  const $ = () => {
    if (c <= 0) return;
    const e = t.querySelectorAll("[data-block-item]").length >= c;
    g.disabled = e, g.classList.toggle("opacity-50", e), g.classList.toggle("cursor-not-allowed", e), g.title = e ? `Maximum of ${c} blocks reached` : "";
  }, y = X(d, a, {
    onSelect: (e) => q(e),
    onClose: () => {
      y.close(), g.focus();
    }
  });
  async function q(e) {
    const i = d.find((r) => r.slug === e);
    if (!(!i || i.disabled)) {
      if (c > 0 && t.querySelectorAll("[data-block-item]").length >= c) {
        y.close();
        return;
      }
      if (v instanceof HTMLSelectElement && Array.from(v.options).some((r) => r.value === e))
        v.value = e, A?.click();
      else {
        let r = k.get(e);
        if (!r) try {
          const f = await K(m, e, b);
          f && (r = f, M(t, r), C.add(r.slug), k.set(r.slug, r));
        } catch (f) {
          console.error(`block-library-picker: fetch template ${e} failed`, f), y.close();
          return;
        }
        if (!r) {
          y.close();
          return;
        }
        const h = t.querySelector("[data-block-list]");
        if (h) {
          const f = Q(r, E, a.schemaVersionPattern);
          h.appendChild(f), f.dispatchEvent(new Event("input", { bubbles: !0 }));
        }
      }
      y.close(), $();
    }
  }
  if (g.addEventListener("click", (e) => {
    e.stopPropagation(), !g.disabled && (y.isOpen() ? y.close() : y.open());
  }), g.addEventListener("keydown", (e) => {
    e.key === "ArrowDown" && !y.isOpen() && !g.disabled && (e.preventDefault(), y.open());
  }), document.addEventListener("click", (e) => {
    y.isOpen() && !w.contains(e.target) && y.close();
  }), document.addEventListener("keydown", (e) => {
    e.key === "Escape" && y.isOpen() && (y.close(), g.focus());
  }), c > 0) {
    const e = t.querySelector("[data-block-list]");
    e && new MutationObserver(() => $()).observe(e, { childList: !0 }), $();
  }
  w.appendChild(g), w.appendChild(y.element), p.appendChild(w);
  const s = t.querySelector("[data-block-list]");
  s && s.nextSibling ? s.parentElement?.insertBefore(p, s.nextSibling) : t.appendChild(p), t.setAttribute("data-picker-initialized", "true");
}
async function Y(t = document) {
  const a = Array.from(t.querySelectorAll('[data-block-library-picker="true"]')).filter((o) => o.getAttribute("data-picker-initialized") !== "true").map((o) => O(o));
  await Promise.all(a);
}
function Z(t) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t, { once: !0 }) : t();
}
Z(() => {
  Y();
});
export {
  Y as initBlockLibraryPickers
};

//# sourceMappingURL=block_library_picker.js.map