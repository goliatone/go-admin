import { escapeHTML as H } from "../shared/html.js";
import { readHTTPJSON as R } from "../shared/transport/http-client.js";
import { onReady as j } from "../shared/dom-ready.js";
import { parseJSONArray as F, parseJSONValue as O } from "../shared/json-parse.js";
import { initBlockEditor as z, markRequiredFields as U, refreshBlockTemplateRegistry as V, registerBlockTemplate as W } from "./block_editor.js";
function J(t) {
  const a = O(t, null);
  return a && typeof a == "object" ? a : {};
}
function K(t, a) {
  return O(t, a);
}
function I(t) {
  const a = t.trim().toLowerCase();
  return a ? Array.from(/* @__PURE__ */ new Set([
    a,
    a.replace(/-/g, "_"),
    a.replace(/_/g, "-")
  ])) : [];
}
function G(t) {
  const a = t.trim(), o = a.replace(/\/+$/, "");
  if (!o) {
    const f = a === "/" ? "/api" : "";
    return f ? {
      listBase: `${f}/panels/block_definitions`,
      templatesBase: `${f}/block_definitions_meta`
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
  const i = /\/api(\/|$)/.test(o) ? o : `${o}/api`;
  return {
    listBase: `${i}/panels/block_definitions`,
    templatesBase: `${i}/block_definitions_meta`
  };
}
function Q(t, a) {
  const o = t.querySelector("[data-picker-load-error]");
  o && o.remove();
  const i = document.createElement("div");
  i.setAttribute("data-picker-load-error", "true"), i.className = "mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-800/70 dark:bg-red-900/20", i.innerHTML = `
    <div class="flex items-start gap-2">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <p class="text-xs text-red-700 dark:text-red-300">${H(a)}</p>
    </div>
    <button type="button" data-picker-retry
            class="mt-2 ml-6 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
      Retry
    </button>
  `, i.querySelector("[data-picker-retry]")?.addEventListener("click", () => {
    i.remove(), P(t);
  }), t.prepend(i);
}
async function T(t) {
  const a = await fetch(t);
  if (!a.ok) throw new Error(`fetch ${t}: ${a.status}`);
  return R(a);
}
async function X(t, a) {
  const o = new URLSearchParams();
  a || o.set("filter_status", "active");
  const i = o.toString(), f = await T(i ? `${t}?${i}` : t);
  return Array.isArray(f.items) ? f.items.map((n) => {
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
async function D(t, a, o) {
  if (a.length === 0) return [];
  let i = `${t}/templates?slugs=${encodeURIComponent(a.join(","))}`;
  return o && (i += "&include_inactive=true"), (await T(i)).items ?? [];
}
async function Y(t, a, o) {
  let i = `${t}/templates/${encodeURIComponent(a)}`;
  o && (i += "?include_inactive=true");
  try {
    return (await T(i)).items?.[0] ?? null;
  } catch {
    return null;
  }
}
function M(t, a) {
  W(t, {
    type: a.slug,
    label: a.label,
    icon: a.icon || void 0,
    schemaVersion: a.schema_version || void 0,
    requiredFields: a.required_fields ?? [],
    html: a.html
  }), V(t);
}
function Z(t, a) {
  const o = typeof t.schema_version == "string" ? t.schema_version.trim() : "";
  return o || (a ? a.replace("{type}", t.slug) : `${t.slug}@v1.0.0`);
}
function ee(t, a, o) {
  const i = document.createElement("div");
  i.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", i.setAttribute("data-block-item", "true"), i.dataset.blockType = t.slug, a && i.setAttribute("draggable", "true");
  const f = document.createElement("div");
  f.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", f.setAttribute("data-block-header", "true");
  const n = document.createElement("div");
  n.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
  const c = document.createElement("span");
  c.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", c.textContent = t.icon || t.label.slice(0, 1).toUpperCase();
  const x = document.createElement("span");
  x.textContent = t.label;
  const g = document.createElement("span");
  g.className = "text-xs text-gray-500 dark:text-gray-400", g.textContent = t.slug;
  const w = Z(t, o), v = document.createElement("span");
  v.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", v.textContent = w, v.setAttribute("data-block-schema-badge", "true"), n.appendChild(c), n.appendChild(x), n.appendChild(g), n.appendChild(v);
  const h = document.createElement("div");
  if (h.className = "flex items-center gap-2", a) {
    const b = document.createElement("button");
    b.type = "button", b.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", b.textContent = "Up", b.setAttribute("data-block-move-up", "true"), h.appendChild(b);
    const u = document.createElement("button");
    u.type = "button", u.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", u.textContent = "Down", u.setAttribute("data-block-move-down", "true"), h.appendChild(u);
  }
  const d = document.createElement("button");
  d.type = "button", d.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", d.textContent = "Collapse", d.setAttribute("data-block-collapse", "true"), h.appendChild(d);
  const p = document.createElement("button");
  if (p.type = "button", p.className = "text-xs text-red-600 hover:text-red-700", p.textContent = "Remove", p.setAttribute("data-block-remove", "true"), h.appendChild(p), a) {
    const b = document.createElement("span");
    b.className = "text-xs text-gray-400 cursor-move", b.textContent = "Drag", b.setAttribute("data-block-drag-handle", "true"), h.appendChild(b);
  }
  f.appendChild(n), f.appendChild(h);
  const C = document.createElement("div");
  C.className = "p-4 space-y-4", C.setAttribute("data-block-body", "true"), C.innerHTML = t.html;
  const E = t.required_fields || [];
  E.length > 0 && U(C, E), i.appendChild(f), i.appendChild(C);
  const A = document.createElement("input");
  A.type = "hidden", A.name = "_type", A.value = t.slug, A.readOnly = !0, A.setAttribute("data-block-type-input", "true"), A.setAttribute("data-block-ignore", "true"), i.appendChild(A), i.dataset.blockSchema = w;
  const k = document.createElement("input");
  return k.type = "hidden", k.name = "_schema", k.value = w, k.setAttribute("data-block-schema-input", "true"), k.setAttribute("data-block-ignore", "true"), i.appendChild(k), i;
}
function te(t, a, o) {
  const i = a.searchable !== !1, f = a.groupByCategory !== !1, n = document.createElement("div");
  n.className = "absolute left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden picker-popover dark:bg-slate-900 dark:border-gray-700", n.style.display = "none", n.setAttribute("data-picker-popover", "true"), n.setAttribute("data-picker-dropdown", "true"), n.setAttribute("role", "dialog"), n.setAttribute("aria-label", "Add block");
  let c = null;
  if (i) {
    const e = document.createElement("div");
    e.className = "sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700 p-2 z-10";
    const r = document.createElement("div");
    r.className = "relative";
    const s = document.createElement("svg");
    s.className = "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none", s.setAttribute("fill", "none"), s.setAttribute("stroke", "currentColor"), s.setAttribute("viewBox", "0 0 24 24"), s.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>', c = document.createElement("input"), c.type = "text", c.placeholder = "Search blocks…", c.className = "w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500", c.setAttribute("data-picker-search", "true"), c.setAttribute("autocomplete", "off"), r.appendChild(s), r.appendChild(c), e.appendChild(r), n.appendChild(e);
  }
  const x = document.createElement("div");
  x.className = "max-h-72 overflow-y-auto py-1", x.setAttribute("data-picker-cards", "true"), x.setAttribute("role", "listbox"), n.appendChild(x);
  const g = document.createElement("div");
  g.className = "px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400", g.setAttribute("data-picker-empty", "true"), g.style.display = "none";
  const w = document.createElement("svg");
  w.className = "mx-auto mb-2 w-8 h-8 text-gray-300 dark:text-gray-600", w.setAttribute("fill", "none"), w.setAttribute("stroke", "currentColor"), w.setAttribute("viewBox", "0 0 24 24"), w.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>';
  const v = document.createElement("p");
  v.setAttribute("data-picker-empty-text", "true"), v.textContent = "No block types available", g.appendChild(w), g.appendChild(v), n.appendChild(g);
  let h = !1, d = -1, p = [], C = [...t], E = /* @__PURE__ */ new Set();
  function A(e, r) {
    const s = r || !!e.disabled, l = document.createElement("button");
    l.type = "button", l.setAttribute("data-picker-item", e.slug), l.setAttribute("data-picker-card", e.slug), l.setAttribute("role", "option"), l.setAttribute("aria-selected", "false"), e.category && (l.dataset.category = e.category), l.className = "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors " + (s ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none"), s && (l.disabled = !0, l.setAttribute("aria-disabled", "true"), l.title = e.status && e.status.toLowerCase() !== "active" ? "This block type is inactive" : "This block type is not available");
    const m = document.createElement("span");
    m.className = "inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg text-xs font-semibold " + (s ? "bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"), m.textContent = e.icon || e.label.slice(0, 2).toUpperCase();
    const B = document.createElement("div");
    B.className = "flex-1 min-w-0";
    const L = document.createElement("div");
    L.className = "font-medium truncate " + (s ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"), L.textContent = e.label;
    const N = document.createElement("div");
    N.className = "text-xs text-gray-500 dark:text-gray-400 truncate";
    const _ = [e.description || e.slug];
    return e.status && e.status.toLowerCase() !== "active" && _.push(`(${e.status})`), N.textContent = _.join(" "), B.appendChild(L), B.appendChild(N), l.appendChild(m), l.appendChild(B), l;
  }
  function k(e = "") {
    x.innerHTML = "", p = [], d = -1;
    const r = e.toLowerCase().trim(), s = r ? C.filter((l) => l.label.toLowerCase().includes(r) || l.slug.toLowerCase().includes(r) || (l.category || "").toLowerCase().includes(r) || (l.description || "").toLowerCase().includes(r)) : C;
    if (s.length === 0) {
      g.style.display = "";
      const l = g.querySelector("[data-picker-empty-text]");
      l && (l.textContent = r ? "No blocks match your search" : "No block types available");
      return;
    }
    if (g.style.display = "none", f) {
      const l = /* @__PURE__ */ new Map();
      for (const m of s) {
        const B = m.category || "other";
        l.has(B) || l.set(B, []), l.get(B).push(m);
      }
      for (const [m, B] of l) {
        const L = document.createElement("div");
        L.className = "px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900", L.setAttribute("data-picker-category", m), L.setAttribute("role", "presentation"), L.textContent = m, x.appendChild(L);
        for (const N of B) {
          const _ = A(N, E.has(N.slug));
          x.appendChild(_), _.disabled || p.push(_);
        }
      }
    } else for (const l of s) {
      const m = A(l, E.has(l.slug));
      x.appendChild(m), m.disabled || p.push(m);
    }
  }
  k();
  function b(e) {
    if (d >= 0 && d < p.length) {
      const r = p[d];
      r.classList.remove("bg-blue-50", "dark:bg-blue-900/20"), r.setAttribute("aria-selected", "false");
    }
    if (d = e, d >= 0 && d < p.length) {
      const r = p[d];
      r.classList.add("bg-blue-50", "dark:bg-blue-900/20"), r.setAttribute("aria-selected", "true"), typeof r.scrollIntoView == "function" && r.scrollIntoView({ block: "nearest" });
    }
  }
  c && c.addEventListener("input", () => {
    k(c.value);
  });
  function u(e) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault(), p.length > 0 && b(d < p.length - 1 ? d + 1 : 0);
        break;
      case "ArrowUp":
        e.preventDefault(), p.length > 0 && b(d <= 0 ? p.length - 1 : d - 1);
        break;
      case "Enter":
        if (e.preventDefault(), d >= 0 && d < p.length) {
          const r = p[d].getAttribute("data-picker-item");
          r && o.onSelect(r);
        }
        break;
      case "Escape":
        e.preventDefault(), o.onClose();
        break;
      case "Tab":
        e.preventDefault(), c && document.activeElement !== c ? (c.focus(), d = -1) : p.length > 0 && b(0);
        break;
    }
  }
  x.addEventListener("click", (e) => {
    const r = e.target.closest("[data-picker-item]");
    if (!r || r.disabled) return;
    const s = r.getAttribute("data-picker-item");
    s && o.onSelect(s);
  });
  function $() {
    n.style.bottom = "", n.style.marginBottom = "", n.style.top = "", n.style.marginTop = "4px", requestAnimationFrame(() => {
      n.getBoundingClientRect().bottom > window.innerHeight - 8 && (n.style.bottom = "100%", n.style.top = "auto", n.style.marginBottom = "4px", n.style.marginTop = "0");
    });
  }
  function y() {
    n.style.display = "", h = !0, $(), c && (c.value = "", k(""), requestAnimationFrame(() => c.focus())), n.addEventListener("keydown", u);
  }
  function q() {
    n.style.display = "none", h = !1, d = -1, n.removeEventListener("keydown", u);
  }
  function S(e, r) {
    C = e, r && (E = r), k(c?.value || "");
  }
  return {
    element: n,
    open: y,
    close: q,
    isOpen: () => h,
    updateCards: S
  };
}
async function P(t) {
  const a = J((t.closest("[data-component-config]") || t).getAttribute("data-component-config")), o = t.dataset.apiBase || a.apiBase || "";
  if (!o) {
    console.warn("block-library-picker: missing data-api-base");
    return;
  }
  const { listBase: i, templatesBase: f } = G(o);
  if (!i || !f) {
    console.warn("block-library-picker: invalid api base", o);
    return;
  }
  const n = K(t.dataset.allowedBlocks, a.allowedBlocks ?? []), c = parseInt(t.dataset.maxBlocks || "", 10) || a.maxBlocks || 0, x = a.lazyLoad !== !1, g = a.includeInactive === !0, w = a.sortable ?? t.dataset.blockSortable === "true", v = /* @__PURE__ */ new Set(), h = /* @__PURE__ */ new Map();
  let d;
  try {
    d = await X(i, g);
  } catch (e) {
    console.error("block-library-picker: metadata fetch failed", e), Q(t, `Failed to load block definitions: ${e instanceof Error ? e.message : "Failed to load block definitions."}`);
    return;
  }
  if (n.length > 0) {
    const e = /* @__PURE__ */ new Set();
    for (const r of n) for (const s of I(r)) e.add(s);
    d = d.filter((r) => {
      for (const s of I(r.slug)) if (e.has(s)) return !0;
      return !1;
    });
  }
  const p = F(t.querySelector("input[data-block-output]")?.value, []), C = [...new Set(p.map((e) => e && typeof e == "object" ? e._type : "").filter((e) => typeof e == "string" && e.length > 0))];
  if (C.length > 0) try {
    const e = await D(f, C, g);
    for (const r of e)
      M(t, r), v.add(r.slug), h.set(r.slug, r);
  } catch (e) {
    console.error("block-library-picker: template fetch failed", e);
  }
  if (!x) {
    const e = d.filter((r) => !v.has(r.slug)).map((r) => r.slug);
    if (e.length > 0) try {
      const r = await D(f, e, g);
      for (const s of r)
        M(t, s), v.add(s.slug), h.set(s.slug, s);
    } catch (r) {
      console.error("block-library-picker: prefetch failed", r);
    }
  }
  z(t);
  const E = t.querySelector("[data-block-add-select]"), A = t.querySelector("[data-block-add]"), k = document.createElement("div");
  k.className = "mt-3", k.setAttribute("data-picker-controls", "true");
  const b = document.createElement("div");
  b.className = "relative inline-block";
  const u = document.createElement("button");
  u.type = "button", u.className = "inline-flex items-center gap-1.5 py-2 px-4 rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-800", u.setAttribute("data-picker-add-btn", "true"), u.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>${typeof a.addLabel == "string" && a.addLabel.trim() ? a.addLabel.trim() : "Add Block"}</span>`;
  const $ = () => {
    if (c <= 0) return;
    const e = t.querySelectorAll("[data-block-item]").length >= c;
    u.disabled = e, u.classList.toggle("opacity-50", e), u.classList.toggle("cursor-not-allowed", e), u.title = e ? `Maximum of ${c} blocks reached` : "";
  }, y = te(d, a, {
    onSelect: (e) => q(e),
    onClose: () => {
      y.close(), u.focus();
    }
  });
  async function q(e) {
    const r = d.find((s) => s.slug === e);
    if (!(!r || r.disabled)) {
      if (c > 0 && t.querySelectorAll("[data-block-item]").length >= c) {
        y.close();
        return;
      }
      if (E instanceof HTMLSelectElement && Array.from(E.options).some((s) => s.value === e))
        E.value = e, A?.click();
      else {
        let s = h.get(e);
        if (!s) try {
          const m = await Y(f, e, g);
          m && (s = m, M(t, s), v.add(s.slug), h.set(s.slug, s));
        } catch (m) {
          console.error(`block-library-picker: fetch template ${e} failed`, m), y.close();
          return;
        }
        if (!s) {
          y.close();
          return;
        }
        const l = t.querySelector("[data-block-list]");
        if (l) {
          const m = ee(s, w, a.schemaVersionPattern);
          l.appendChild(m), m.dispatchEvent(new Event("input", { bubbles: !0 }));
        }
      }
      y.close(), $();
    }
  }
  if (u.addEventListener("click", (e) => {
    e.stopPropagation(), !u.disabled && (y.isOpen() ? y.close() : y.open());
  }), u.addEventListener("keydown", (e) => {
    e.key === "ArrowDown" && !y.isOpen() && !u.disabled && (e.preventDefault(), y.open());
  }), document.addEventListener("click", (e) => {
    y.isOpen() && !b.contains(e.target) && y.close();
  }), document.addEventListener("keydown", (e) => {
    e.key === "Escape" && y.isOpen() && (y.close(), u.focus());
  }), c > 0) {
    const e = t.querySelector("[data-block-list]");
    e && new MutationObserver(() => $()).observe(e, { childList: !0 }), $();
  }
  b.appendChild(u), b.appendChild(y.element), k.appendChild(b);
  const S = t.querySelector("[data-block-list]");
  S && S.nextSibling ? S.parentElement?.insertBefore(k, S.nextSibling) : t.appendChild(k), t.setAttribute("data-picker-initialized", "true");
}
async function ae(t = document) {
  const a = Array.from(t.querySelectorAll('[data-block-library-picker="true"]')).filter((o) => o.getAttribute("data-picker-initialized") !== "true").map((o) => P(o));
  await Promise.all(a);
}
j(() => {
  ae();
});
export {
  ae as initBlockLibraryPickers
};

//# sourceMappingURL=block_library_picker.js.map