import { onReady as ce } from "../shared/dom-ready.js";
import { parseJSONArray as J, parseJSONValue as se } from "../shared/json-parse.js";
const z = /* @__PURE__ */ new WeakMap();
function ie(t) {
  const e = se(t, null);
  return e && typeof e == "object" ? e : {};
}
function Z(t) {
  const e = t.closest("[data-component-config]");
  return ie(e?.getAttribute("data-component-config") ?? null);
}
function ee(t) {
  if (t == null) return;
  const e = t.trim().toLowerCase();
  if (e === "true") return !0;
  if (e === "false") return !1;
}
function de(t) {
  const e = t.querySelector("[data-block-list]"), o = t.querySelector("input[data-block-output]");
  if (!e || !o) return null;
  const n = t.querySelector("[data-block-add-select]"), r = t.querySelector("[data-block-add]"), s = t.querySelector("[data-block-empty]");
  return { root: t, list: e, output: o, addSelect: n ?? void 0, addButton: r ?? void 0, emptyState: s ?? void 0 };
}
function O(t) {
  return t.replace(/\]/g, "").split(/\.|\[/).map((o) => o.trim()).filter((o) => o.length > 0);
}
function ue(t, e, o) {
  if (!t) return o;
  const n = O(o);
  let r = `${t}[${e}]`;
  for (const s of n)
    r += `[${s}]`;
  return r;
}
function fe(t, e) {
  if (!t || !e) return;
  const o = O(e);
  let n = t;
  for (const r of o) {
    if (n == null) return;
    n = n[r];
  }
  return n;
}
function me(t, e, o) {
  if (!e) return;
  const n = O(e);
  if (n.length === 0) return;
  let r = t;
  n.forEach((s, u) => {
    const v = u === n.length - 1, C = n[u + 1], A = C !== void 0 && /^\d+$/.test(C);
    if (v) {
      if (s === "") return;
      r[s] = o;
      return;
    }
    (r[s] == null || typeof r[s] != "object") && (r[s] = A ? [] : {}), r = r[s];
  });
}
function pe(t) {
  if (t.length === 0) return;
  const e = t[0];
  if (e instanceof HTMLSelectElement && e.multiple)
    return Array.from(e.selectedOptions).map((o) => o.value);
  if (e instanceof HTMLInputElement) {
    if (e.type === "radio") {
      const o = t.find((n) => n.checked);
      return o ? o.value : void 0;
    }
    if (e.type === "checkbox")
      return t.length > 1 ? t.filter((o) => o.checked).map((o) => o.value) : e.checked;
  }
  return e.value;
}
function be(t, e) {
  if (e != null) {
    if (t instanceof HTMLInputElement) {
      if (t.type === "checkbox") {
        Array.isArray(e) ? t.checked = e.map(String).includes(t.value) : typeof e == "boolean" ? t.checked = e : t.checked = String(e) === t.value || e === !0;
        return;
      }
      if (t.type === "radio") {
        t.checked = String(e) === t.value;
        return;
      }
    }
    if (t instanceof HTMLSelectElement && t.multiple) {
      const o = Array.isArray(e) ? e.map(String) : [String(e)];
      Array.from(t.options).forEach((n) => {
        n.selected = o.includes(n.value);
      });
      return;
    }
    t.value = String(e);
  }
}
function ge(t, e) {
  const o = /* @__PURE__ */ new Map();
  return t.querySelectorAll("template[data-block-template]").forEach((n) => {
    const r = n.dataset.blockType?.trim();
    if (!r) return;
    const s = n.dataset.blockLabel?.trim() || r, u = n.dataset.blockIcon?.trim(), v = ee(n.dataset.blockCollapsed), C = n.dataset.blockSchemaVersion?.trim() || ne(r, e.schemaVersionPattern), A = n.dataset.blockRequiredFields?.trim(), B = A ? A.split(",").map((l) => l.trim()).filter(Boolean) : e.requiredFields?.[r] || [];
    o.set(r, {
      type: r,
      label: s,
      icon: u || void 0,
      collapsed: v,
      schemaVersion: C,
      requiredFields: B,
      template: n
    });
  }), o;
}
function te(t, e) {
  const n = z.get(t) ?? /* @__PURE__ */ new Map(), r = ge(t, e);
  return n.clear(), r.forEach((s, u) => n.set(u, s)), z.set(t, n), n;
}
function ne(t, e) {
  return e ? e.replace("{type}", t) : `${t}@v1.0.0`;
}
function he(t, e, o) {
  const n = e && typeof e._schema == "string" ? e._schema.trim() : "";
  return n || (t.schemaVersion ? t.schemaVersion : ne(t.type, o));
}
function ke(t, e) {
  const o = [], n = e.requiredFields || [];
  for (const r of n) {
    const s = t.querySelector(
      `[name="${r}"], [data-block-field-name="${r}"]`
    );
    if (!s) continue;
    let u = !1;
    if (s instanceof HTMLInputElement)
      if (s.type === "checkbox")
        u = !s.checked;
      else if (s.type === "radio") {
        const v = t.querySelectorAll(`[name="${s.name}"]`);
        u = !Array.from(v).some((C) => C.checked);
      } else
        u = !s.value.trim();
    else s instanceof HTMLSelectElement ? u = !s.value || s.value === "" : u = !s.value.trim();
    u && o.push({
      field: r,
      message: `${r} is required`
    });
  }
  return o;
}
function ye(t, e) {
  if (xe(t), e.length === 0) return;
  t.classList.add("block-item--invalid"), t.dataset.blockValid = "false";
  const o = t.querySelector("[data-block-header]");
  if (o) {
    const n = document.createElement("span");
    n.className = "block-error-badge text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/20 dark:text-red-400", n.textContent = `${e.length} error${e.length > 1 ? "s" : ""}`, n.setAttribute("data-block-error-badge", "true"), o.querySelector(".flex")?.appendChild(n);
  }
  for (const n of e) {
    const r = t.querySelector(
      `[name="${n.field}"], [data-block-field-name="${n.field}"]`
    );
    if (r) {
      r.classList.add("border-red-500", "focus:ring-red-500");
      const s = r.closest("[data-component]");
      if (s) {
        const u = document.createElement("p");
        u.className = "block-field-error text-xs text-red-600 mt-1 dark:text-red-400", u.textContent = n.message, u.setAttribute("data-block-field-error", "true"), s.appendChild(u);
      }
    }
  }
}
function xe(t) {
  t.classList.remove("block-item--invalid"), t.dataset.blockValid = "true", t.querySelectorAll("[data-block-error-badge]").forEach((e) => e.remove()), t.querySelectorAll("[data-block-field-error]").forEach((e) => e.remove()), t.querySelectorAll(".border-red-500").forEach((e) => {
    e.classList.remove("border-red-500", "focus:ring-red-500");
  });
}
function ve(t, e) {
  for (const o of e) {
    const n = t.querySelector(
      `[name="${o}"], [data-block-field-name="${o}"]`
    );
    if (!n) continue;
    n.setAttribute("data-block-required", "true");
    const s = n.closest("[data-component]")?.querySelector("label") ?? n.closest("label");
    if (s && !s.querySelector("[data-required-indicator]")) {
      const u = document.createElement("span");
      u.className = "block-required-indicator text-red-500 ml-0.5", u.textContent = " *", u.setAttribute("data-required-indicator", "true"), u.setAttribute("aria-hidden", "true"), s.appendChild(u);
    }
  }
}
function W(t, e) {
  const o = [];
  if (!Array.isArray(t) || !Array.isArray(e))
    return {
      hasConflicts: !1,
      conflicts: [],
      embeddedCount: Array.isArray(t) ? t.length : 0,
      legacyCount: Array.isArray(e) ? e.length : 0
    };
  t.length, e.length;
  const n = Math.max(t.length, e.length);
  for (let r = 0; r < n; r++) {
    const s = t[r] || {}, u = e[r] || {}, v = s._type || u._type || `block_${r}`, C = /* @__PURE__ */ new Set([...Object.keys(s), ...Object.keys(u)]);
    for (const A of C) {
      if (A.startsWith("_")) continue;
      const B = s[A], l = u[A];
      F(B, l) || o.push({
        blockIndex: r,
        blockType: v,
        field: A,
        embeddedValue: B,
        legacyValue: l
      });
    }
  }
  return {
    hasConflicts: o.length > 0 || t.length !== e.length,
    conflicts: o,
    embeddedCount: t.length,
    legacyCount: e.length
  };
}
function F(t, e) {
  if (t === e) return !0;
  if (t == null || e == null) return t === e;
  if (typeof t != typeof e) return !1;
  if (Array.isArray(t) && Array.isArray(e))
    return t.length !== e.length ? !1 : t.every((o, n) => F(o, e[n]));
  if (typeof t == "object") {
    const o = Object.keys(t), n = Object.keys(e);
    return o.length !== n.length ? !1 : o.every((r) => F(t[r], e[r]));
  }
  return !1;
}
function Ee(t) {
  const e = document.createElement("div");
  e.className = "block-conflict-report border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4 dark:bg-amber-900/20 dark:border-amber-700", e.setAttribute("data-block-conflict-report", "true");
  const o = document.createElement("div");
  o.className = "flex items-center gap-2 mb-3";
  const n = document.createElement("span");
  n.className = "text-amber-600 dark:text-amber-400", n.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  const r = document.createElement("span");
  r.className = "font-medium text-amber-800 dark:text-amber-200", r.textContent = "Block Conflicts Detected", o.appendChild(n), o.appendChild(r), e.appendChild(o);
  const s = document.createElement("p");
  if (s.className = "text-sm text-amber-700 dark:text-amber-300 mb-3", s.textContent = `Embedded blocks (${t.embeddedCount}) differ from legacy blocks (${t.legacyCount}). Embedded blocks are authoritative.`, e.appendChild(s), t.conflicts.length > 0) {
    const C = document.createElement("details");
    C.className = "text-sm";
    const A = document.createElement("summary");
    A.className = "cursor-pointer text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium", A.textContent = `View ${t.conflicts.length} field conflict${t.conflicts.length > 1 ? "s" : ""}`, C.appendChild(A);
    const B = document.createElement("ul");
    B.className = "mt-2 space-y-1 pl-4";
    for (const l of t.conflicts.slice(0, 10)) {
      const N = document.createElement("li");
      N.className = "text-amber-700 dark:text-amber-300", N.innerHTML = `<span class="font-mono text-xs">${l.blockType}[${l.blockIndex}].${l.field}</span>: <span class="text-green-600 dark:text-green-400">embedded</span> vs <span class="text-red-600 dark:text-red-400">legacy</span>`, B.appendChild(N);
    }
    if (t.conflicts.length > 10) {
      const l = document.createElement("li");
      l.className = "text-amber-600 dark:text-amber-400 italic", l.textContent = `...and ${t.conflicts.length - 10} more`, B.appendChild(l);
    }
    C.appendChild(B), e.appendChild(C);
  }
  const u = document.createElement("div");
  u.className = "mt-3 flex gap-2";
  const v = document.createElement("button");
  return v.type = "button", v.className = "text-xs px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40", v.textContent = "Dismiss", v.addEventListener("click", () => e.remove()), u.appendChild(v), e.appendChild(u), e;
}
function G(t, e) {
  if (t.querySelector("[data-block-conflict-report]")?.remove(), !e.hasConflicts) return;
  const o = Ee(e), n = t.querySelector("[data-block-list]");
  n ? n.parentElement?.insertBefore(o, n) : t.insertBefore(o, t.firstChild);
}
function Ce() {
  const t = document.createElement("div");
  return t.className = "block-drop-indicator", t.setAttribute("data-block-drop-indicator", "true"), t.setAttribute("aria-hidden", "true"), t;
}
function Q(t, e, o) {
  w(t);
  const n = Ce();
  return e ? o === "before" ? e.parentElement?.insertBefore(n, e) : e.parentElement?.insertBefore(n, e.nextSibling) : t.appendChild(n), n;
}
function w(t) {
  t.querySelectorAll("[data-block-drop-indicator]").forEach((e) => e.remove());
}
function H(t, e, o) {
  const n = Array.from(t.querySelectorAll("[data-block-item]"));
  for (const r of n) {
    if (r === o) continue;
    const s = r.getBoundingClientRect();
    if (e >= s.top && e <= s.bottom) {
      const u = e < s.top + s.height / 2 ? "before" : "after";
      return { item: r, position: u };
    }
  }
  if (n.length > 0) {
    const r = n[n.length - 1];
    if (r !== o) {
      const s = r.getBoundingClientRect();
      if (e > s.bottom)
        return { item: r, position: "after" };
    }
  }
  return null;
}
function X(t, e) {
  const o = Array.from(t.querySelectorAll("[data-block-item]")), n = /* @__PURE__ */ new Map();
  o.forEach((r) => {
    n.set(r, r.getBoundingClientRect());
  }), t.offsetHeight, o.forEach((r) => {
    const s = n.get(r);
    if (!s) return;
    const u = r.getBoundingClientRect(), v = s.top - u.top;
    Math.abs(v) < 1 || r.animate(
      [
        { transform: `translateY(${v}px)` },
        { transform: "translateY(0)" }
      ],
      {
        duration: 200,
        easing: "ease-out"
      }
    );
  }), e.animate(
    [
      { transform: "scale(1.02)", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)" },
      { transform: "scale(1)", boxShadow: "none" }
    ],
    {
      duration: 200,
      easing: "ease-out"
    }
  );
}
function Ae() {
  const t = document.getElementById("block-editor-live-region");
  if (t) return t;
  const e = document.createElement("div");
  return e.id = "block-editor-live-region", e.setAttribute("aria-live", "polite"), e.setAttribute("aria-atomic", "true"), e.className = "sr-only", e.style.cssText = "position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;", document.body.appendChild(e), e;
}
function L(t) {
  const e = Ae();
  e.textContent = "", requestAnimationFrame(() => {
    e.textContent = t;
  });
}
function $(t, e) {
  const o = Array.from(t.querySelectorAll("[data-block-item]")), n = o.indexOf(e) + 1, r = o.length;
  return { label: e.querySelector("[data-block-header] span")?.textContent || e.dataset.blockType || "Block", position: n, total: r };
}
function Se(t) {
  const e = {};
  return t.querySelectorAll("input, select, textarea").forEach((o) => {
    const n = o.getAttribute("data-block-field-name") || o.name;
    !n || o.dataset.blockIgnore === "true" || (o instanceof HTMLInputElement && o.type === "checkbox" ? e[n] = o.checked : o instanceof HTMLSelectElement && o.multiple ? e[n] = Array.from(o.selectedOptions).map((r) => r.value) : e[n] = o.value);
  }), e._type = t.dataset.blockType || "", e._schema = t.dataset.blockSchema || "", e;
}
function Be(t, e, o = 50, n = 10) {
  const r = () => {
    if (!e.dragging) {
      e.scrollInterval && (clearInterval(e.scrollInterval), e.scrollInterval = null);
      return;
    }
    const s = t.getBoundingClientRect(), u = e.touchCurrentY;
    u < s.top + o ? t.scrollTop -= n : u > s.bottom - o && (t.scrollTop += n);
  };
  e.scrollInterval || (e.scrollInterval = window.setInterval(r, 16));
}
function Le(t, e) {
  const o = t.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (o.length === 0) {
    const n = document.createElement("input");
    n.type = "hidden", n.name = "_type", n.value = e, n.readOnly = !0, n.setAttribute("data-block-type-input", "true"), n.setAttribute("data-block-ignore", "true"), t.appendChild(n);
    return;
  }
  o.forEach((n) => {
    n.setAttribute("data-block-type-input", "true"), n.setAttribute("data-block-ignore", "true"), n instanceof HTMLInputElement ? (n.value = e, n.readOnly = !0) : n instanceof HTMLSelectElement ? (Array.from(n.options).forEach((s) => {
      s.selected = s.value === e;
    }), n.disabled = !0) : (n.value = e, n.readOnly = !0);
    const r = n.closest("[data-component]");
    r && r.classList.add("hidden");
  });
}
function qe(t, e) {
  const o = t.querySelectorAll('[name="_schema"], [data-block-schema-input]');
  if (o.length === 0) {
    const n = document.createElement("input");
    n.type = "hidden", n.name = "_schema", n.value = e, n.setAttribute("data-block-schema-input", "true"), n.setAttribute("data-block-ignore", "true"), t.appendChild(n);
    return;
  }
  o.forEach((n) => {
    n.setAttribute("data-block-schema-input", "true"), n.setAttribute("data-block-ignore", "true"), n.value = e, n.readOnly = !0;
    const r = n.closest("[data-component]");
    r && r.classList.add("hidden");
  });
}
function Ie(t) {
  const e = de(t);
  if (!e) return;
  const o = Z(t), n = te(t, o), r = t.dataset.blockField || e.output.name, s = ee(t.dataset.blockSortable), u = o.sortable ?? s ?? !1, v = o.allowDrag ?? u, C = o.addLabel || e.addButton?.dataset.blockAddLabel || "Add block", A = o.emptyLabel || e.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.", B = o.validateOnInput ?? !0;
  e.addButton && (e.addButton.textContent = C), e.emptyState && (e.emptyState.textContent = A);
  const l = e.list, N = e.output, R = () => {
    const a = Array.from(l.querySelectorAll("[data-block-item]"));
    let d = !1;
    const f = a.map((m) => {
      const c = {}, g = /* @__PURE__ */ new Map();
      m.querySelectorAll("input, select, textarea").forEach((p) => {
        if (p.dataset.blockIgnore === "true" || p.hasAttribute("data-block-ignore")) return;
        const b = p.getAttribute("data-block-field-name") || p.name || "";
        b && (g.has(b) || g.set(b, []), g.get(b).push(p));
      }), g.forEach((p, b) => {
        const E = pe(p);
        E !== void 0 && me(c, b, E);
      });
      const k = m.dataset.blockType || c._type || "";
      k && (c._type = k);
      const i = m.dataset.blockSchema || c._schema;
      if (i)
        c._schema = i;
      else {
        const p = n.get(k);
        p?.schemaVersion && (c._schema = p.schemaVersion);
      }
      if (B) {
        const p = n.get(k);
        if (p) {
          const b = ke(m, p);
          ye(m, b), b.length > 0 && (d = !0);
        }
      }
      return c;
    });
    N.value = JSON.stringify(f), t.dataset.blockEditorValid = d ? "false" : "true";
  }, oe = () => {
    Array.from(l.querySelectorAll("[data-block-item]")).forEach((d, f) => {
      d.querySelectorAll("input, select, textarea").forEach((m) => {
        if (m.dataset.blockIgnore === "true" || m.hasAttribute("data-block-ignore")) return;
        const c = m.getAttribute("data-block-field-name") || m.name;
        c && (m.hasAttribute("data-block-field-name") || m.setAttribute("data-block-field-name", c), m.name = ue(r, f, c));
      });
    });
  }, re = () => {
    if (!e.emptyState) return;
    const a = l.querySelector("[data-block-item]");
    e.emptyState.classList.toggle("hidden", !!a);
  }, S = () => {
    oe(), R(), re();
  }, Y = t.closest("form");
  Y && Y.addEventListener("submit", () => {
    R();
  });
  const ae = (a, d) => {
    a.querySelectorAll("input, select, textarea").forEach((f) => {
      const m = f.getAttribute("data-block-field-name") || f.name;
      if (!m) return;
      const c = fe(d, m);
      c !== void 0 && be(f, c);
    });
  }, _ = (a, d) => {
    const f = he(a, d, o.schemaVersionPattern), m = document.createElement("div");
    m.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", m.setAttribute("data-block-item", "true"), m.dataset.blockType = a.type, u && m.setAttribute("draggable", "true");
    const c = document.createElement("div");
    c.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", c.setAttribute("data-block-header", "true");
    const g = document.createElement("div");
    g.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const k = document.createElement("span");
    k.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", k.textContent = a.icon || a.label.slice(0, 1).toUpperCase();
    const i = document.createElement("span");
    i.textContent = a.label;
    const p = document.createElement("span");
    p.className = "text-xs text-gray-500 dark:text-gray-400", p.textContent = a.type;
    const b = document.createElement("span");
    b.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", b.textContent = f, b.setAttribute("data-block-schema-badge", "true"), g.appendChild(k), g.appendChild(i), g.appendChild(p), g.appendChild(b);
    const E = document.createElement("div");
    if (E.className = "flex items-center gap-2", u) {
      const q = document.createElement("button");
      q.type = "button", q.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", q.textContent = "Up", q.setAttribute("data-block-move-up", "true");
      const D = document.createElement("button");
      D.type = "button", D.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", D.textContent = "Down", D.setAttribute("data-block-move-down", "true"), E.appendChild(q), E.appendChild(D);
    }
    const h = document.createElement("button");
    h.type = "button", h.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", h.textContent = "Collapse", h.setAttribute("data-block-collapse", "true");
    const x = document.createElement("button");
    if (x.type = "button", x.className = "text-xs text-red-600 hover:text-red-700", x.textContent = "Remove", x.setAttribute("data-block-remove", "true"), E.appendChild(h), E.appendChild(x), u) {
      const q = document.createElement("span");
      q.className = "text-xs text-gray-400 cursor-move", q.textContent = "Drag", q.setAttribute("data-block-drag-handle", "true"), E.appendChild(q);
    }
    c.appendChild(g), c.appendChild(E);
    const y = document.createElement("div");
    y.className = "p-4 space-y-4", y.setAttribute("data-block-body", "true");
    const T = a.template.content.cloneNode(!0);
    y.appendChild(T), m.appendChild(c), m.appendChild(y), Le(m, a.type), qe(m, f), m.dataset.blockSchema = f, d && ae(m, d);
    const I = a.requiredFields || [];
    return I.length > 0 && ve(y, I), (a.collapsed ?? !1) && (y.classList.add("hidden"), m.dataset.blockCollapsed = "true", h.textContent = "Expand"), m;
  }, j = (a, d) => {
    const f = n.get(a);
    if (!f) return;
    const m = _(f, d);
    l.appendChild(m), S();
  }, P = e.addButton, M = e.addSelect;
  if (P && M && P.addEventListener("click", () => {
    const a = M.value.trim();
    a && (j(a), M.value = "");
  }), t.addEventListener("click", (a) => {
    const d = a.target;
    if (!(d instanceof HTMLElement)) return;
    const f = d.closest("[data-block-item]");
    if (f) {
      if (d.closest("[data-block-remove]")) {
        f.remove(), S();
        return;
      }
      if (d.closest("[data-block-collapse]")) {
        const m = f.querySelector("[data-block-body]");
        if (m) {
          const c = m.classList.toggle("hidden");
          f.dataset.blockCollapsed = c ? "true" : "false";
          const g = d.closest("[data-block-collapse]");
          g && (g.textContent = c ? "Expand" : "Collapse");
        }
        return;
      }
      if (d.closest("[data-block-move-up]")) {
        const m = f.previousElementSibling;
        m && l.insertBefore(f, m), S();
        return;
      }
      if (d.closest("[data-block-move-down]")) {
        const m = f.nextElementSibling;
        m && l.insertBefore(m, f), S();
        return;
      }
    }
  }), t.addEventListener("input", (a) => {
    const d = a.target;
    !(d instanceof HTMLElement) || !d.closest("[data-block-item]") || S();
  }), t.addEventListener("change", (a) => {
    const d = a.target;
    !(d instanceof HTMLElement) || !d.closest("[data-block-item]") || S();
  }), u && v) {
    const a = o.dragFromHeader ?? !0, d = o.enableTouch ?? !0, f = o.enableAnimations ?? !0, m = o.enableCrossEditor ?? !1, c = {
      dragging: null,
      touchStartY: 0,
      touchCurrentY: 0,
      scrollInterval: null,
      originalIndex: -1
    }, g = (i) => i.closest("[data-block-drag-handle]") ? !0 : a && i.closest("[data-block-header]") ? !i.closest("button, input, select, textarea") : !1, k = (i) => Array.from(l.querySelectorAll("[data-block-item]")).indexOf(i);
    if (l.addEventListener("dragstart", (i) => {
      const p = i.target;
      if (!(p instanceof HTMLElement)) return;
      if (!g(p)) {
        i.preventDefault();
        return;
      }
      const b = p.closest("[data-block-item]");
      if (!b) return;
      if (c.dragging = b, c.originalIndex = k(b), b.classList.add("block-item--dragging"), i.dataTransfer) {
        if (i.dataTransfer.effectAllowed = "move", i.dataTransfer.setData("text/plain", "block"), m) {
          const x = Se(b);
          i.dataTransfer.setData("application/x-block", JSON.stringify(x));
        }
        const h = b.cloneNode(!0);
        h.style.cssText = "position: absolute; top: -9999px; left: -9999px; opacity: 0.8; transform: rotate(2deg);", document.body.appendChild(h), i.dataTransfer.setDragImage(h, 20, 20), requestAnimationFrame(() => h.remove());
      }
      const E = $(l, b);
      L(`Dragging ${E.label} from position ${E.position} of ${E.total}. Use arrow keys to move.`);
    }), l.addEventListener("dragover", (i) => {
      i.preventDefault(), i.dataTransfer && (i.dataTransfer.dropEffect = "move");
      const p = i.clientY, b = H(l, p, c.dragging || void 0);
      b ? Q(l, b.item, b.position) : w(l);
    }), l.addEventListener("dragenter", (i) => {
      i.preventDefault();
    }), l.addEventListener("dragleave", (i) => {
      const p = i.relatedTarget;
      (!p || !l.contains(p)) && w(l);
    }), l.addEventListener("drop", (i) => {
      i.preventDefault(), w(l);
      const p = i.clientY, b = H(l, p, c.dragging || void 0);
      if (!c.dragging && m && i.dataTransfer) {
        const h = i.dataTransfer.getData("application/x-block");
        if (h)
          try {
            const x = JSON.parse(h), y = x._type;
            if (y && n.has(y)) {
              const T = n.get(y), I = _(T, x);
              b ? b.position === "before" ? l.insertBefore(I, b.item) : l.insertBefore(I, b.item.nextSibling) : l.appendChild(I), S(), L(`Block ${y} added from another editor`);
            }
          } catch {
          }
        return;
      }
      if (!c.dragging) return;
      if (b && (b.position === "before" ? l.insertBefore(c.dragging, b.item) : l.insertBefore(c.dragging, b.item.nextSibling)), f && X(l, c.dragging), k(c.dragging) !== c.originalIndex) {
        const h = $(l, c.dragging);
        L(`${h.label} moved to position ${h.position} of ${h.total}`);
      }
    }), l.addEventListener("dragend", () => {
      w(l), c.dragging && (c.dragging.classList.remove("block-item--dragging"), c.dragging = null), c.originalIndex = -1, S();
    }), d) {
      let i = null, p = null, b = !1;
      const E = 10;
      l.addEventListener("touchstart", (h) => {
        const x = h.touches[0], y = x.target;
        if (!g(y)) return;
        const T = y.closest("[data-block-item]");
        T && (c.touchStartY = x.clientY, c.touchCurrentY = x.clientY, i = T, b = !1);
      }, { passive: !0 }), l.addEventListener("touchmove", (h) => {
        if (!i) return;
        const x = h.touches[0];
        if (c.touchCurrentY = x.clientY, !b) {
          if (Math.abs(x.clientY - c.touchStartY) < E) return;
          b = !0, p = i.cloneNode(!0), p.className = "block-item--touch-dragging", p.style.cssText = `
            position: fixed;
            left: 0;
            right: 0;
            margin: 0 16px;
            z-index: 9999;
            pointer-events: none;
            opacity: 0.9;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            transform: scale(1.02);
          `, document.body.appendChild(p), i.classList.add("block-item--placeholder"), c.dragging = i, c.originalIndex = k(i);
          const I = $(l, i);
          L(`Dragging ${I.label}. Move finger to reposition.`);
        }
        h.preventDefault(), p && (p.style.top = `${x.clientY - p.offsetHeight / 2}px`);
        const y = H(l, x.clientY, i || void 0);
        y ? Q(l, y.item, y.position) : w(l), Be(l, c);
      }, { passive: !1 }), l.addEventListener("touchend", () => {
        if (c.scrollInterval && (clearInterval(c.scrollInterval), c.scrollInterval = null), w(l), p && (p.remove(), p = null), i && b) {
          i.classList.remove("block-item--placeholder");
          const h = H(l, c.touchCurrentY, i);
          if (h && (h.position === "before" ? l.insertBefore(i, h.item) : l.insertBefore(i, h.item.nextSibling)), f && X(l, i), k(i) !== c.originalIndex) {
            const y = $(l, i);
            L(`${y.label} moved to position ${y.position} of ${y.total}`);
          }
          S();
        }
        i = null, b = !1, c.dragging = null, c.originalIndex = -1;
      }), l.addEventListener("touchcancel", () => {
        c.scrollInterval && (clearInterval(c.scrollInterval), c.scrollInterval = null), w(l), p && (p.remove(), p = null), i && i.classList.remove("block-item--placeholder"), i = null, b = !1, c.dragging = null, c.originalIndex = -1;
      });
    }
  }
  if (e.addSelect) {
    const a = document.createElement("option");
    a.value = "", a.textContent = "Select block type", e.addSelect.appendChild(a), n.forEach((d) => {
      const f = document.createElement("option");
      f.value = d.type, f.textContent = d.label, e.addSelect?.appendChild(f);
    }), e.addSelect.value = "";
  }
  t.addEventListener("keydown", (a) => {
    const d = a.target;
    if (!(d instanceof HTMLElement)) return;
    const f = d.closest("[data-block-item]");
    if (!f) return;
    const m = d.closest("[data-block-header]");
    if (m)
      switch (a.key) {
        case "Delete":
        case "Backspace":
          a.shiftKey && (a.preventDefault(), f.remove(), S(), l.querySelector("[data-block-item] [data-block-header]")?.focus());
          break;
        case "ArrowUp":
          if (a.altKey && u) {
            a.preventDefault();
            const g = f.previousElementSibling;
            if (g) {
              l.insertBefore(f, g), S(), f.querySelector("[data-block-header]")?.focus();
              const k = $(l, f);
              L(`${k.label} moved to position ${k.position} of ${k.total}`);
            } else
              L("Already at the top");
          } else if (!a.altKey) {
            a.preventDefault();
            const k = f.previousElementSibling?.querySelector("[data-block-header]");
            k ? k.focus() : L("At the first block");
          }
          break;
        case "ArrowDown":
          if (a.altKey && u) {
            a.preventDefault();
            const g = f.nextElementSibling;
            if (g) {
              l.insertBefore(g, f), S(), f.querySelector("[data-block-header]")?.focus();
              const k = $(l, f);
              L(`${k.label} moved to position ${k.position} of ${k.total}`);
            } else
              L("Already at the bottom");
          } else if (!a.altKey) {
            a.preventDefault();
            const k = f.nextElementSibling?.querySelector("[data-block-header]");
            k ? k.focus() : L("At the last block");
          }
          break;
        case "Enter":
        case " ":
          d.matches("[data-block-collapse]") || d.matches("[data-block-remove]") || d.matches("[data-block-move-up]") || d.matches("[data-block-move-down]") ? (a.preventDefault(), d.click()) : m && !d.matches("button") && (a.preventDefault(), f.querySelector("[data-block-collapse]")?.click());
          break;
        case "Escape":
          const c = f.querySelector("[data-block-body]");
          if (c && !c.classList.contains("hidden")) {
            a.preventDefault(), c.classList.add("hidden"), f.dataset.blockCollapsed = "true";
            const g = f.querySelector("[data-block-collapse]");
            g && (g.textContent = "Expand");
          }
          break;
      }
  });
  const le = () => {
    l.querySelectorAll("[data-block-header]").forEach((a) => {
      a.hasAttribute("tabindex") || (a.setAttribute("tabindex", "0"), a.setAttribute("role", "button"), a.setAttribute("aria-label", "Block header - Press Enter to collapse/expand, Shift+Delete to remove"));
    });
  };
  new MutationObserver(() => {
    le();
  }).observe(l, { childList: !0, subtree: !0 });
  const V = J(N.value, []);
  V.forEach((a) => {
    const d = typeof a == "object" && a ? a._type : "";
    d && n.has(d) && j(d, a);
  });
  const U = o.showConflicts ?? !0;
  if (U && o.legacyBlocks && Array.isArray(o.legacyBlocks)) {
    const a = W(V, o.legacyBlocks);
    a.hasConflicts && G(t, a);
  }
  const K = t.dataset.blockLegacy;
  if (U && K) {
    const a = J(K, []);
    if (a.length > 0) {
      const d = W(V, a);
      d.hasConflicts && G(t, d);
    }
  }
  S();
}
function He(t, e) {
  const o = document.createElement("template");
  o.setAttribute("data-block-template", ""), o.dataset.blockType = e.type, o.dataset.blockLabel = e.label, e.icon && (o.dataset.blockIcon = e.icon), e.schemaVersion && (o.dataset.blockSchemaVersion = e.schemaVersion), e.requiredFields && e.requiredFields.length > 0 && (o.dataset.blockRequiredFields = e.requiredFields.join(",")), o.innerHTML = e.html, t.appendChild(o);
}
function Me(t) {
  if (!t) return;
  const e = Z(t);
  te(t, e);
}
function we(t = document) {
  Array.from(t.querySelectorAll('[data-component="block"], [data-block-editor]')).filter((o) => o.dataset.blockLibraryPicker !== "true" && o.dataset.blockInit !== "manual").forEach((o) => Ie(o));
}
ce(() => we());
export {
  Ie as initBlockEditor,
  we as initBlockEditors,
  ve as markRequiredFields,
  Me as refreshBlockTemplateRegistry,
  He as registerBlockTemplate
};
//# sourceMappingURL=block_editor.js.map
