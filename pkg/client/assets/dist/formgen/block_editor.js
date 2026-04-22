import { onReady as ue } from "../shared/dom-ready.js";
import { parseJSONArray as K, parseJSONValue as fe } from "../shared/json-parse.js";
var z = /* @__PURE__ */ new WeakMap();
function ee(t) {
  const e = fe(t, null);
  return e && typeof e == "object" ? e : {};
}
function te(t) {
  return ee(t.closest("[data-component-config]")?.getAttribute("data-component-config") ?? null);
}
function ne(t) {
  if (t == null) return;
  const e = t.trim().toLowerCase();
  if (e === "true") return !0;
  if (e === "false") return !1;
}
function me(t) {
  const e = t.querySelector("[data-block-list]"), n = t.querySelector("input[data-block-output]");
  if (!e || !n) return null;
  const r = t.querySelector("[data-block-add-select]"), o = t.querySelector("[data-block-add]"), l = t.querySelector("[data-block-empty]");
  return {
    root: t,
    list: e,
    output: n,
    addSelect: r ?? void 0,
    addButton: o ?? void 0,
    emptyState: l ?? void 0
  };
}
function O(t) {
  return t.replace(/\]/g, "").split(/\.|\[/).map((e) => e.trim()).filter((e) => e.length > 0);
}
function pe(t, e, n) {
  if (!t) return n;
  const r = O(n);
  let o = `${t}[${e}]`;
  for (const l of r) o += `[${l}]`;
  return o;
}
function be(t, e) {
  if (!t || !e) return;
  const n = O(e);
  let r = t;
  for (const o of n) {
    if (r == null) return;
    r = r[o];
  }
  return r;
}
function ge(t, e, n) {
  if (!e) return;
  const r = O(e);
  if (r.length === 0) return;
  let o = t;
  r.forEach((l, b) => {
    const v = b === r.length - 1, A = r[b + 1], C = A !== void 0 && /^\d+$/.test(A);
    if (v) {
      if (l === "") return;
      o[l] = n;
      return;
    }
    (o[l] == null || typeof o[l] != "object") && (o[l] = C ? [] : {}), o = o[l];
  });
}
function he(t) {
  if (t.length === 0) return;
  const e = t[0];
  if (e instanceof HTMLSelectElement && e.multiple) return Array.from(e.selectedOptions).map((n) => n.value);
  if (e instanceof HTMLInputElement) {
    if (e.type === "radio") {
      const n = t.find((r) => r.checked);
      return n ? n.value : void 0;
    }
    if (e.type === "checkbox")
      return t.length > 1 ? t.filter((n) => n.checked).map((n) => n.value) : e.checked;
  }
  return e.value;
}
function ke(t) {
  const e = [];
  return t.forEach((n) => {
    if (n instanceof HTMLInputElement && n.type === "checkbox") {
      n.checked && e.push(n.value);
      return;
    }
    if (n instanceof HTMLSelectElement && n.multiple) {
      e.push(...Array.from(n.selectedOptions).map((r) => r.value));
      return;
    }
    n instanceof HTMLInputElement && n.type === "hidden" && n.value.trim() === "" || e.push(n.value);
  }), e;
}
function re(t) {
  return t.endsWith("[]") ? t.slice(0, -2) : t;
}
function ye(t) {
  return ee(t.closest("[data-component-config]")?.getAttribute("data-component-config") ?? null);
}
function oe(t, e) {
  if (e.endsWith("[]") || t.name.endsWith("[]")) return !0;
  const n = ye(t);
  return n.multiple === !0 || n.multiple === "true";
}
function xe(t, e) {
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
      const n = Array.isArray(e) ? e.map(String) : [String(e)];
      Array.from(t.options).forEach((r) => {
        r.selected = n.includes(r.value);
      });
      return;
    }
    t.value = String(e);
  }
}
function ve(t, e) {
  const n = /* @__PURE__ */ new Map();
  return t.querySelectorAll("template[data-block-template]").forEach((r) => {
    const o = r.dataset.blockType?.trim();
    if (!o) return;
    const l = r.dataset.blockLabel?.trim() || o, b = r.dataset.blockIcon?.trim(), v = ne(r.dataset.blockCollapsed), A = r.dataset.blockSchemaVersion?.trim() || le(o, e.schemaVersionPattern), C = r.dataset.blockRequiredFields?.trim(), L = C ? C.split(",").map((c) => c.trim()).filter(Boolean) : e.requiredFields?.[o] || [];
    n.set(o, {
      type: o,
      label: l,
      icon: b || void 0,
      collapsed: v,
      schemaVersion: A,
      requiredFields: L,
      template: r
    });
  }), n;
}
function ae(t, e) {
  const n = z.get(t) ?? /* @__PURE__ */ new Map(), r = ve(t, e);
  return n.clear(), r.forEach((o, l) => n.set(l, o)), z.set(t, n), n;
}
function le(t, e) {
  return e ? e.replace("{type}", t) : `${t}@v1.0.0`;
}
function Ee(t, e, n) {
  const r = e && typeof e._schema == "string" ? e._schema.trim() : "";
  return r || (t.schemaVersion ? t.schemaVersion : le(t.type, n));
}
function Ae(t, e) {
  const n = [], r = e.requiredFields || [];
  for (const o of r) {
    const l = t.querySelector(`[name="${o}"], [data-block-field-name="${o}"]`);
    if (!l) continue;
    let b = !1;
    if (l instanceof HTMLInputElement) if (l.type === "checkbox") b = !l.checked;
    else if (l.type === "radio") {
      const v = t.querySelectorAll(`[name="${l.name}"]`);
      b = !Array.from(v).some((A) => A.checked);
    } else b = !l.value.trim();
    else l instanceof HTMLSelectElement ? b = !l.value || l.value === "" : b = !l.value.trim();
    b && n.push({
      field: o,
      message: `${o} is required`
    });
  }
  return n;
}
function Ce(t, e) {
  if (Se(t), e.length === 0) return;
  t.classList.add("block-item--invalid"), t.dataset.blockValid = "false";
  const n = t.querySelector("[data-block-header]");
  if (n) {
    const r = document.createElement("span");
    r.className = "block-error-badge text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/20 dark:text-red-400", r.textContent = `${e.length} error${e.length > 1 ? "s" : ""}`, r.setAttribute("data-block-error-badge", "true"), n.querySelector(".flex")?.appendChild(r);
  }
  for (const r of e) {
    const o = t.querySelector(`[name="${r.field}"], [data-block-field-name="${r.field}"]`);
    if (o) {
      o.classList.add("border-red-500", "focus:ring-red-500");
      const l = o.closest("[data-component]");
      if (l) {
        const b = document.createElement("p");
        b.className = "block-field-error text-xs text-red-600 mt-1 dark:text-red-400", b.textContent = r.message, b.setAttribute("data-block-field-error", "true"), l.appendChild(b);
      }
    }
  }
}
function Se(t) {
  t.classList.remove("block-item--invalid"), t.dataset.blockValid = "true", t.querySelectorAll("[data-block-error-badge]").forEach((e) => e.remove()), t.querySelectorAll("[data-block-field-error]").forEach((e) => e.remove()), t.querySelectorAll(".border-red-500").forEach((e) => {
    e.classList.remove("border-red-500", "focus:ring-red-500");
  });
}
function Le(t, e) {
  for (const n of e) {
    const r = t.querySelector(`[name="${n}"], [data-block-field-name="${n}"]`);
    if (!r) continue;
    r.setAttribute("data-block-required", "true");
    const o = r.closest("[data-component]")?.querySelector("label") ?? r.closest("label");
    if (o && !o.querySelector("[data-required-indicator]")) {
      const l = document.createElement("span");
      l.className = "block-required-indicator text-red-500 ml-0.5", l.textContent = " *", l.setAttribute("data-required-indicator", "true"), l.setAttribute("aria-hidden", "true"), o.appendChild(l);
    }
  }
}
function G(t, e) {
  const n = [];
  if (!Array.isArray(t) || !Array.isArray(e)) return {
    hasConflicts: !1,
    conflicts: [],
    embeddedCount: Array.isArray(t) ? t.length : 0,
    legacyCount: Array.isArray(e) ? e.length : 0
  };
  t.length, e.length;
  const r = Math.max(t.length, e.length);
  for (let o = 0; o < r; o++) {
    const l = t[o] || {}, b = e[o] || {}, v = l._type || b._type || `block_${o}`, A = /* @__PURE__ */ new Set([...Object.keys(l), ...Object.keys(b)]);
    for (const C of A) {
      if (C.startsWith("_")) continue;
      const L = l[C], c = b[C];
      V(L, c) || n.push({
        blockIndex: o,
        blockType: v,
        field: C,
        embeddedValue: L,
        legacyValue: c
      });
    }
  }
  return {
    hasConflicts: n.length > 0 || t.length !== e.length,
    conflicts: n,
    embeddedCount: t.length,
    legacyCount: e.length
  };
}
function V(t, e) {
  if (t === e) return !0;
  if (t == null || e == null) return t === e;
  if (typeof t != typeof e) return !1;
  if (Array.isArray(t) && Array.isArray(e))
    return t.length !== e.length ? !1 : t.every((n, r) => V(n, e[r]));
  if (typeof t == "object") {
    const n = Object.keys(t), r = Object.keys(e);
    return n.length !== r.length ? !1 : n.every((o) => V(t[o], e[o]));
  }
  return !1;
}
function Be(t) {
  const e = document.createElement("div");
  e.className = "block-conflict-report border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4 dark:bg-amber-900/20 dark:border-amber-700", e.setAttribute("data-block-conflict-report", "true");
  const n = document.createElement("div");
  n.className = "flex items-center gap-2 mb-3";
  const r = document.createElement("span");
  r.className = "text-amber-600 dark:text-amber-400", r.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  const o = document.createElement("span");
  o.className = "font-medium text-amber-800 dark:text-amber-200", o.textContent = "Block Conflicts Detected", n.appendChild(r), n.appendChild(o), e.appendChild(n);
  const l = document.createElement("p");
  if (l.className = "text-sm text-amber-700 dark:text-amber-300 mb-3", l.textContent = `Embedded blocks (${t.embeddedCount}) differ from legacy blocks (${t.legacyCount}). Embedded blocks are authoritative.`, e.appendChild(l), t.conflicts.length > 0) {
    const A = document.createElement("details");
    A.className = "text-sm";
    const C = document.createElement("summary");
    C.className = "cursor-pointer text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium", C.textContent = `View ${t.conflicts.length} field conflict${t.conflicts.length > 1 ? "s" : ""}`, A.appendChild(C);
    const L = document.createElement("ul");
    L.className = "mt-2 space-y-1 pl-4";
    for (const c of t.conflicts.slice(0, 10)) {
      const T = document.createElement("li");
      T.className = "text-amber-700 dark:text-amber-300", T.innerHTML = `<span class="font-mono text-xs">${c.blockType}[${c.blockIndex}].${c.field}</span>: <span class="text-green-600 dark:text-green-400">embedded</span> vs <span class="text-red-600 dark:text-red-400">legacy</span>`, L.appendChild(T);
    }
    if (t.conflicts.length > 10) {
      const c = document.createElement("li");
      c.className = "text-amber-600 dark:text-amber-400 italic", c.textContent = `...and ${t.conflicts.length - 10} more`, L.appendChild(c);
    }
    A.appendChild(L), e.appendChild(A);
  }
  const b = document.createElement("div");
  b.className = "mt-3 flex gap-2";
  const v = document.createElement("button");
  return v.type = "button", v.className = "text-xs px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40", v.textContent = "Dismiss", v.addEventListener("click", () => e.remove()), b.appendChild(v), e.appendChild(b), e;
}
function Q(t, e) {
  if (t.querySelector("[data-block-conflict-report]")?.remove(), !e.hasConflicts) return;
  const n = Be(e), r = t.querySelector("[data-block-list]");
  r ? r.parentElement?.insertBefore(n, r) : t.insertBefore(n, t.firstChild);
}
function qe() {
  const t = document.createElement("div");
  return t.className = "block-drop-indicator", t.setAttribute("data-block-drop-indicator", "true"), t.setAttribute("aria-hidden", "true"), t;
}
function X(t, e, n) {
  I(t);
  const r = qe();
  return e ? n === "before" ? e.parentElement?.insertBefore(r, e) : e.parentElement?.insertBefore(r, e.nextSibling) : t.appendChild(r), r;
}
function I(t) {
  t.querySelectorAll("[data-block-drop-indicator]").forEach((e) => e.remove());
}
function D(t, e, n) {
  const r = Array.from(t.querySelectorAll("[data-block-item]"));
  for (const o of r) {
    if (o === n) continue;
    const l = o.getBoundingClientRect();
    if (e >= l.top && e <= l.bottom) return {
      item: o,
      position: e < l.top + l.height / 2 ? "before" : "after"
    };
  }
  if (r.length > 0) {
    const o = r[r.length - 1];
    if (o !== n && e > o.getBoundingClientRect().bottom)
      return {
        item: o,
        position: "after"
      };
  }
  return null;
}
function Z(t, e) {
  const n = Array.from(t.querySelectorAll("[data-block-item]")), r = /* @__PURE__ */ new Map();
  n.forEach((o) => {
    r.set(o, o.getBoundingClientRect());
  }), t.offsetHeight, n.forEach((o) => {
    const l = r.get(o);
    if (!l) return;
    const b = o.getBoundingClientRect(), v = l.top - b.top;
    Math.abs(v) < 1 || o.animate([{ transform: `translateY(${v}px)` }, { transform: "translateY(0)" }], {
      duration: 200,
      easing: "ease-out"
    });
  }), e.animate([{
    transform: "scale(1.02)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
  }, {
    transform: "scale(1)",
    boxShadow: "none"
  }], {
    duration: 200,
    easing: "ease-out"
  });
}
function Ie() {
  const t = document.getElementById("block-editor-live-region");
  if (t) return t;
  const e = document.createElement("div");
  return e.id = "block-editor-live-region", e.setAttribute("aria-live", "polite"), e.setAttribute("aria-atomic", "true"), e.className = "sr-only", e.style.cssText = "position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;", document.body.appendChild(e), e;
}
function B(t) {
  const e = Ie();
  e.textContent = "", requestAnimationFrame(() => {
    e.textContent = t;
  });
}
function w(t, e) {
  const n = Array.from(t.querySelectorAll("[data-block-item]")), r = n.indexOf(e) + 1, o = n.length;
  return {
    label: e.querySelector("[data-block-header] span")?.textContent || e.dataset.blockType || "Block",
    position: r,
    total: o
  };
}
function Te(t) {
  const e = {};
  return t.querySelectorAll("input, select, textarea").forEach((n) => {
    const r = n.getAttribute("data-block-field-name") || n.name;
    if (!r || n.dataset.blockIgnore === "true") return;
    const o = oe(n, r);
    if (!(o && n instanceof HTMLInputElement && n.type === "hidden" && n.value.trim() === ""))
      if (n instanceof HTMLInputElement && n.type === "checkbox") if (o) {
        const l = re(r);
        e[l] === void 0 && (e[l] = []), n.checked && H(e, r, n.value, !0);
      } else H(e, r, n.checked, !1);
      else n instanceof HTMLSelectElement && n.multiple ? H(e, r, Array.from(n.selectedOptions).map((l) => l.value), !1) : H(e, r, n.value, o);
  }), e._type = t.dataset.blockType || "", e._schema = t.dataset.blockSchema || "", e;
}
function H(t, e, n, r) {
  const o = e.endsWith("[]") ? e.slice(0, -2) : e;
  if (!o) return;
  if (!r) {
    t[o] = n;
    return;
  }
  const l = t[o];
  if (Array.isArray(l)) {
    l.push(n);
    return;
  }
  if (l !== void 0) {
    t[o] = [l, n];
    return;
  }
  t[o] = [n];
}
function we(t, e, n = 50, r = 10) {
  const o = () => {
    if (!e.dragging) {
      e.scrollInterval && (clearInterval(e.scrollInterval), e.scrollInterval = null);
      return;
    }
    const l = t.getBoundingClientRect(), b = e.touchCurrentY;
    b < l.top + n ? t.scrollTop -= r : b > l.bottom - n && (t.scrollTop += r);
  };
  e.scrollInterval || (e.scrollInterval = window.setInterval(o, 16));
}
function Ne(t, e) {
  const n = t.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (n.length === 0) {
    const r = document.createElement("input");
    r.type = "hidden", r.name = "_type", r.value = e, r.readOnly = !0, r.setAttribute("data-block-type-input", "true"), r.setAttribute("data-block-ignore", "true"), t.appendChild(r);
    return;
  }
  n.forEach((r) => {
    r.setAttribute("data-block-type-input", "true"), r.setAttribute("data-block-ignore", "true"), r instanceof HTMLInputElement ? (r.value = e, r.readOnly = !0) : r instanceof HTMLSelectElement ? (Array.from(r.options).forEach((l) => {
      l.selected = l.value === e;
    }), r.disabled = !0) : (r.value = e, r.readOnly = !0);
    const o = r.closest("[data-component]");
    o && o.classList.add("hidden");
  });
}
function $e(t, e) {
  const n = t.querySelectorAll('[name="_schema"], [data-block-schema-input]');
  if (n.length === 0) {
    const r = document.createElement("input");
    r.type = "hidden", r.name = "_schema", r.value = e, r.setAttribute("data-block-schema-input", "true"), r.setAttribute("data-block-ignore", "true"), t.appendChild(r);
    return;
  }
  n.forEach((r) => {
    r.setAttribute("data-block-schema-input", "true"), r.setAttribute("data-block-ignore", "true"), r.value = e, r.readOnly = !0;
    const o = r.closest("[data-component]");
    o && o.classList.add("hidden");
  });
}
function De(t) {
  const e = me(t);
  if (!e) return;
  const n = te(t), r = ae(t, n), o = t.dataset.blockField || e.output.name, l = ne(t.dataset.blockSortable), b = n.sortable ?? l ?? !1, v = n.allowDrag ?? b, A = n.addLabel || e.addButton?.dataset.blockAddLabel || "Add block", C = n.emptyLabel || e.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.", L = n.validateOnInput ?? !0;
  e.addButton && (e.addButton.textContent = A), e.emptyState && (e.emptyState.textContent = C);
  const c = e.list, T = e.output, R = () => {
    const a = Array.from(c.querySelectorAll("[data-block-item]"));
    let u = !1;
    const d = a.map((p) => {
      const s = {}, g = /* @__PURE__ */ new Map();
      p.querySelectorAll("input, select, textarea").forEach((f) => {
        if (f.dataset.blockIgnore === "true" || f.hasAttribute("data-block-ignore")) return;
        const m = f.getAttribute("data-block-field-name") || f.name || "";
        m && (g.has(m) || g.set(m, []), g.get(m).push(f));
      }), g.forEach((f, m) => {
        const y = f.some((h) => oe(h, m)) ? ke(f) : he(f);
        y !== void 0 && ge(s, re(m), y);
      });
      const x = p.dataset.blockType || s._type || "";
      x && (s._type = x);
      const i = p.dataset.blockSchema || s._schema;
      if (i) s._schema = i;
      else {
        const f = r.get(x);
        f?.schemaVersion && (s._schema = f.schemaVersion);
      }
      if (L) {
        const f = r.get(x);
        if (f) {
          const m = Ae(p, f);
          Ce(p, m), m.length > 0 && (u = !0);
        }
      }
      return s;
    });
    T.value = JSON.stringify(d), t.dataset.blockEditorValid = u ? "false" : "true";
  }, ce = () => {
    Array.from(c.querySelectorAll("[data-block-item]")).forEach((a, u) => {
      a.querySelectorAll("input, select, textarea").forEach((d) => {
        if (d.dataset.blockIgnore === "true" || d.hasAttribute("data-block-ignore")) return;
        const p = d.getAttribute("data-block-field-name") || d.name;
        p && (d.hasAttribute("data-block-field-name") || d.setAttribute("data-block-field-name", p), d.name = pe(o, u, p));
      });
    });
  }, se = () => {
    if (!e.emptyState) return;
    const a = c.querySelector("[data-block-item]");
    e.emptyState.classList.toggle("hidden", !!a);
  }, S = () => {
    ce(), R(), se();
  }, Y = t.closest("form");
  Y && Y.addEventListener("submit", () => {
    R();
  });
  const ie = (a, u) => {
    a.querySelectorAll("input, select, textarea").forEach((d) => {
      const p = d.getAttribute("data-block-field-name") || d.name;
      if (!p) return;
      const s = be(u, p);
      s !== void 0 && xe(d, s);
    });
  }, _ = (a, u) => {
    const d = Ee(a, u, n.schemaVersionPattern), p = document.createElement("div");
    p.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", p.setAttribute("data-block-item", "true"), p.dataset.blockType = a.type, b && p.setAttribute("draggable", "true");
    const s = document.createElement("div");
    s.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", s.setAttribute("data-block-header", "true");
    const g = document.createElement("div");
    g.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const x = document.createElement("span");
    x.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", x.textContent = a.icon || a.label.slice(0, 1).toUpperCase();
    const i = document.createElement("span");
    i.textContent = a.label;
    const f = document.createElement("span");
    f.className = "text-xs text-gray-500 dark:text-gray-400", f.textContent = a.type;
    const m = document.createElement("span");
    m.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", m.textContent = d, m.setAttribute("data-block-schema-badge", "true"), g.appendChild(x), g.appendChild(i), g.appendChild(f), g.appendChild(m);
    const y = document.createElement("div");
    if (y.className = "flex items-center gap-2", b) {
      const q = document.createElement("button");
      q.type = "button", q.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", q.textContent = "Up", q.setAttribute("data-block-move-up", "true");
      const N = document.createElement("button");
      N.type = "button", N.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", N.textContent = "Down", N.setAttribute("data-block-move-down", "true"), y.appendChild(q), y.appendChild(N);
    }
    const h = document.createElement("button");
    h.type = "button", h.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", h.textContent = "Collapse", h.setAttribute("data-block-collapse", "true");
    const k = document.createElement("button");
    if (k.type = "button", k.className = "text-xs text-red-600 hover:text-red-700", k.textContent = "Remove", k.setAttribute("data-block-remove", "true"), y.appendChild(h), y.appendChild(k), b) {
      const q = document.createElement("span");
      q.className = "text-xs text-gray-400 cursor-move", q.textContent = "Drag", q.setAttribute("data-block-drag-handle", "true"), y.appendChild(q);
    }
    s.appendChild(g), s.appendChild(y);
    const E = document.createElement("div");
    E.className = "p-4 space-y-4", E.setAttribute("data-block-body", "true");
    const $ = a.template.content.cloneNode(!0);
    E.appendChild($), p.appendChild(s), p.appendChild(E), Ne(p, a.type), $e(p, d), p.dataset.blockSchema = d, u && ie(p, u);
    const J = a.requiredFields || [];
    return J.length > 0 && Le(E, J), (a.collapsed ?? !1) && (E.classList.add("hidden"), p.dataset.blockCollapsed = "true", h.textContent = "Expand"), p;
  }, j = (a, u) => {
    const d = r.get(a);
    if (!d) return;
    const p = _(d, u);
    c.appendChild(p), S();
  }, P = e.addButton, M = e.addSelect;
  if (P && M && P.addEventListener("click", () => {
    const a = M.value.trim();
    a && (j(a), M.value = "");
  }), t.addEventListener("click", (a) => {
    const u = a.target;
    if (!(u instanceof HTMLElement)) return;
    const d = u.closest("[data-block-item]");
    if (d) {
      if (u.closest("[data-block-remove]")) {
        d.remove(), S();
        return;
      }
      if (u.closest("[data-block-collapse]")) {
        const p = d.querySelector("[data-block-body]");
        if (p) {
          const s = p.classList.toggle("hidden");
          d.dataset.blockCollapsed = s ? "true" : "false";
          const g = u.closest("[data-block-collapse]");
          g && (g.textContent = s ? "Expand" : "Collapse");
        }
        return;
      }
      if (u.closest("[data-block-move-up]")) {
        const p = d.previousElementSibling;
        p && c.insertBefore(d, p), S();
        return;
      }
      if (u.closest("[data-block-move-down]")) {
        const p = d.nextElementSibling;
        p && c.insertBefore(p, d), S();
        return;
      }
    }
  }), t.addEventListener("input", (a) => {
    const u = a.target;
    !(u instanceof HTMLElement) || !u.closest("[data-block-item]") || S();
  }), t.addEventListener("change", (a) => {
    const u = a.target;
    !(u instanceof HTMLElement) || !u.closest("[data-block-item]") || S();
  }), b && v) {
    const a = n.dragFromHeader ?? !0, u = n.enableTouch ?? !0, d = n.enableAnimations ?? !0, p = n.enableCrossEditor ?? !1, s = {
      dragging: null,
      placeholder: null,
      touchStartY: 0,
      touchCurrentY: 0,
      scrollInterval: null,
      originalIndex: -1
    }, g = (i) => i.closest("[data-block-drag-handle]") ? !0 : a && i.closest("[data-block-header]") ? !i.closest("button, input, select, textarea") : !1, x = (i) => Array.from(c.querySelectorAll("[data-block-item]")).indexOf(i);
    if (c.addEventListener("dragstart", (i) => {
      const f = i.target;
      if (!(f instanceof HTMLElement)) return;
      if (!g(f)) {
        i.preventDefault();
        return;
      }
      const m = f.closest("[data-block-item]");
      if (!m) return;
      if (s.dragging = m, s.originalIndex = x(m), m.classList.add("block-item--dragging"), i.dataTransfer) {
        if (i.dataTransfer.effectAllowed = "move", i.dataTransfer.setData("text/plain", "block"), p) {
          const k = Te(m);
          i.dataTransfer.setData("application/x-block", JSON.stringify(k));
        }
        const h = m.cloneNode(!0);
        h.style.cssText = "position: absolute; top: -9999px; left: -9999px; opacity: 0.8; transform: rotate(2deg);", document.body.appendChild(h), i.dataTransfer.setDragImage(h, 20, 20), requestAnimationFrame(() => h.remove());
      }
      const y = w(c, m);
      B(`Dragging ${y.label} from position ${y.position} of ${y.total}. Use arrow keys to move.`);
    }), c.addEventListener("dragover", (i) => {
      i.preventDefault(), i.dataTransfer && (i.dataTransfer.dropEffect = "move");
      const f = i.clientY, m = D(c, f, s.dragging || void 0);
      m ? X(c, m.item, m.position) : I(c);
    }), c.addEventListener("dragenter", (i) => {
      i.preventDefault();
    }), c.addEventListener("dragleave", (i) => {
      const f = i.relatedTarget;
      (!f || !c.contains(f)) && I(c);
    }), c.addEventListener("drop", (i) => {
      i.preventDefault(), I(c);
      const f = i.clientY, m = D(c, f, s.dragging || void 0);
      if (!s.dragging && p && i.dataTransfer) {
        const y = i.dataTransfer.getData("application/x-block");
        if (y) try {
          const h = JSON.parse(y), k = h._type;
          if (k && r.has(k)) {
            const E = _(r.get(k), h);
            m ? m.position === "before" ? c.insertBefore(E, m.item) : c.insertBefore(E, m.item.nextSibling) : c.appendChild(E), S(), B(`Block ${k} added from another editor`);
          }
        } catch {
        }
        return;
      }
      if (s.dragging && (m && (m.position === "before" ? c.insertBefore(s.dragging, m.item) : c.insertBefore(s.dragging, m.item.nextSibling)), d && Z(c, s.dragging), x(s.dragging) !== s.originalIndex)) {
        const y = w(c, s.dragging);
        B(`${y.label} moved to position ${y.position} of ${y.total}`);
      }
    }), c.addEventListener("dragend", () => {
      I(c), s.dragging && (s.dragging.classList.remove("block-item--dragging"), s.dragging = null), s.originalIndex = -1, S();
    }), u) {
      let i = null, f = null, m = !1;
      const y = 10;
      c.addEventListener("touchstart", (h) => {
        const k = h.touches[0], E = k.target;
        if (!g(E)) return;
        const $ = E.closest("[data-block-item]");
        $ && (s.touchStartY = k.clientY, s.touchCurrentY = k.clientY, i = $, m = !1);
      }, { passive: !0 }), c.addEventListener("touchmove", (h) => {
        if (!i) return;
        const k = h.touches[0];
        if (s.touchCurrentY = k.clientY, !m) {
          if (Math.abs(k.clientY - s.touchStartY) < y) return;
          m = !0, f = i.cloneNode(!0), f.className = "block-item--touch-dragging", f.style.cssText = `
            position: fixed;
            left: 0;
            right: 0;
            margin: 0 16px;
            z-index: 9999;
            pointer-events: none;
            opacity: 0.9;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            transform: scale(1.02);
          `, document.body.appendChild(f), i.classList.add("block-item--placeholder"), s.dragging = i, s.originalIndex = x(i), B(`Dragging ${w(c, i).label}. Move finger to reposition.`);
        }
        h.preventDefault(), f && (f.style.top = `${k.clientY - f.offsetHeight / 2}px`);
        const E = D(c, k.clientY, i || void 0);
        E ? X(c, E.item, E.position) : I(c), we(c, s);
      }, { passive: !1 }), c.addEventListener("touchend", () => {
        if (s.scrollInterval && (clearInterval(s.scrollInterval), s.scrollInterval = null), I(c), f && (f.remove(), f = null), i && m) {
          i.classList.remove("block-item--placeholder");
          const h = D(c, s.touchCurrentY, i);
          if (h && (h.position === "before" ? c.insertBefore(i, h.item) : c.insertBefore(i, h.item.nextSibling)), d && Z(c, i), x(i) !== s.originalIndex) {
            const k = w(c, i);
            B(`${k.label} moved to position ${k.position} of ${k.total}`);
          }
          S();
        }
        i = null, m = !1, s.dragging = null, s.originalIndex = -1;
      }), c.addEventListener("touchcancel", () => {
        s.scrollInterval && (clearInterval(s.scrollInterval), s.scrollInterval = null), I(c), f && (f.remove(), f = null), i && i.classList.remove("block-item--placeholder"), i = null, m = !1, s.dragging = null, s.originalIndex = -1;
      });
    }
  }
  if (e.addSelect) {
    const a = document.createElement("option");
    a.value = "", a.textContent = "Select block type", e.addSelect.appendChild(a), r.forEach((u) => {
      const d = document.createElement("option");
      d.value = u.type, d.textContent = u.label, e.addSelect?.appendChild(d);
    }), e.addSelect.value = "";
  }
  t.addEventListener("keydown", (a) => {
    const u = a.target;
    if (!(u instanceof HTMLElement)) return;
    const d = u.closest("[data-block-item]");
    if (!d) return;
    const p = u.closest("[data-block-header]");
    if (p)
      switch (a.key) {
        case "Delete":
        case "Backspace":
          a.shiftKey && (a.preventDefault(), d.remove(), S(), c.querySelector("[data-block-item] [data-block-header]")?.focus());
          break;
        case "ArrowUp":
          if (a.altKey && b) {
            a.preventDefault();
            const g = d.previousElementSibling;
            if (g) {
              c.insertBefore(d, g), S(), d.querySelector("[data-block-header]")?.focus();
              const x = w(c, d);
              B(`${x.label} moved to position ${x.position} of ${x.total}`);
            } else B("Already at the top");
          } else if (!a.altKey) {
            a.preventDefault();
            const g = d.previousElementSibling?.querySelector("[data-block-header]");
            g ? g.focus() : B("At the first block");
          }
          break;
        case "ArrowDown":
          if (a.altKey && b) {
            a.preventDefault();
            const g = d.nextElementSibling;
            if (g) {
              c.insertBefore(g, d), S(), d.querySelector("[data-block-header]")?.focus();
              const x = w(c, d);
              B(`${x.label} moved to position ${x.position} of ${x.total}`);
            } else B("Already at the bottom");
          } else if (!a.altKey) {
            a.preventDefault();
            const g = d.nextElementSibling?.querySelector("[data-block-header]");
            g ? g.focus() : B("At the last block");
          }
          break;
        case "Enter":
        case " ":
          u.matches("[data-block-collapse]") || u.matches("[data-block-remove]") || u.matches("[data-block-move-up]") || u.matches("[data-block-move-down]") ? (a.preventDefault(), u.click()) : p && !u.matches("button") && (a.preventDefault(), d.querySelector("[data-block-collapse]")?.click());
          break;
        case "Escape":
          const s = d.querySelector("[data-block-body]");
          if (s && !s.classList.contains("hidden")) {
            a.preventDefault(), s.classList.add("hidden"), d.dataset.blockCollapsed = "true";
            const g = d.querySelector("[data-block-collapse]");
            g && (g.textContent = "Expand");
          }
          break;
      }
  });
  const de = () => {
    c.querySelectorAll("[data-block-header]").forEach((a) => {
      a.hasAttribute("tabindex") || (a.setAttribute("tabindex", "0"), a.setAttribute("role", "button"), a.setAttribute("aria-label", "Block header - Press Enter to collapse/expand, Shift+Delete to remove"));
    });
  };
  new MutationObserver(() => {
    de();
  }).observe(c, {
    childList: !0,
    subtree: !0
  });
  const F = K(T.value, []);
  F.forEach((a) => {
    const u = typeof a == "object" && a ? a._type : "";
    u && r.has(u) && j(u, a);
  });
  const U = n.showConflicts ?? !0;
  if (U && n.legacyBlocks && Array.isArray(n.legacyBlocks)) {
    const a = G(F, n.legacyBlocks);
    a.hasConflicts && Q(t, a);
  }
  const W = t.dataset.blockLegacy;
  if (U && W) {
    const a = K(W, []);
    if (a.length > 0) {
      const u = G(F, a);
      u.hasConflicts && Q(t, u);
    }
  }
  S();
}
function Ve(t, e) {
  const n = document.createElement("template");
  n.setAttribute("data-block-template", ""), n.dataset.blockType = e.type, n.dataset.blockLabel = e.label, e.icon && (n.dataset.blockIcon = e.icon), e.schemaVersion && (n.dataset.blockSchemaVersion = e.schemaVersion), e.requiredFields && e.requiredFields.length > 0 && (n.dataset.blockRequiredFields = e.requiredFields.join(",")), n.innerHTML = e.html, t.appendChild(n);
}
function Oe(t) {
  t && ae(t, te(t));
}
function He(t = document) {
  Array.from(t.querySelectorAll('[data-component="block"], [data-block-editor]')).filter((e) => e.dataset.blockLibraryPicker !== "true" && e.dataset.blockInit !== "manual").forEach((e) => De(e));
}
ue(() => He());
export {
  De as initBlockEditor,
  He as initBlockEditors,
  Le as markRequiredFields,
  Oe as refreshBlockTemplateRegistry,
  Ve as registerBlockTemplate
};

//# sourceMappingURL=block_editor.js.map