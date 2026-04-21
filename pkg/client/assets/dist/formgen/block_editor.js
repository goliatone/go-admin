import { onReady as se } from "../shared/dom-ready.js";
import { parseJSONArray as K, parseJSONValue as ie } from "../shared/json-parse.js";
var z = /* @__PURE__ */ new WeakMap();
function de(t) {
  const e = ie(t, null);
  return e && typeof e == "object" ? e : {};
}
function ee(t) {
  return de(t.closest("[data-component-config]")?.getAttribute("data-component-config") ?? null);
}
function te(t) {
  if (t == null) return;
  const e = t.trim().toLowerCase();
  if (e === "true") return !0;
  if (e === "false") return !1;
}
function ue(t) {
  const e = t.querySelector("[data-block-list]"), r = t.querySelector("input[data-block-output]");
  if (!e || !r) return null;
  const n = t.querySelector("[data-block-add-select]"), a = t.querySelector("[data-block-add]"), l = t.querySelector("[data-block-empty]");
  return {
    root: t,
    list: e,
    output: r,
    addSelect: n ?? void 0,
    addButton: a ?? void 0,
    emptyState: l ?? void 0
  };
}
function O(t) {
  return t.replace(/\]/g, "").split(/\.|\[/).map((e) => e.trim()).filter((e) => e.length > 0);
}
function fe(t, e, r) {
  if (!t) return r;
  const n = O(r);
  let a = `${t}[${e}]`;
  for (const l of n) a += `[${l}]`;
  return a;
}
function me(t, e) {
  if (!t || !e) return;
  const r = O(e);
  let n = t;
  for (const a of r) {
    if (n == null) return;
    n = n[a];
  }
  return n;
}
function pe(t, e, r) {
  if (!e) return;
  const n = O(e);
  if (n.length === 0) return;
  let a = t;
  n.forEach((l, b) => {
    const v = b === n.length - 1, A = n[b + 1], C = A !== void 0 && /^\d+$/.test(A);
    if (v) {
      if (l === "") return;
      a[l] = r;
      return;
    }
    (a[l] == null || typeof a[l] != "object") && (a[l] = C ? [] : {}), a = a[l];
  });
}
function be(t) {
  if (t.length === 0) return;
  const e = t[0];
  if (e instanceof HTMLSelectElement && e.multiple) return Array.from(e.selectedOptions).map((r) => r.value);
  if (e instanceof HTMLInputElement) {
    if (e.type === "radio") {
      const r = t.find((n) => n.checked);
      return r ? r.value : void 0;
    }
    if (e.type === "checkbox")
      return t.length > 1 ? t.filter((r) => r.checked).map((r) => r.value) : e.checked;
  }
  return e.value;
}
function he(t) {
  const e = [];
  return t.forEach((r) => {
    if (r instanceof HTMLInputElement && r.type === "checkbox") {
      r.checked && e.push(r.value);
      return;
    }
    if (r instanceof HTMLSelectElement && r.multiple) {
      e.push(...Array.from(r.selectedOptions).map((n) => n.value));
      return;
    }
    e.push(r.value);
  }), e;
}
function ge(t) {
  return t.endsWith("[]") ? t.slice(0, -2) : t;
}
function ke(t, e) {
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
      const r = Array.isArray(e) ? e.map(String) : [String(e)];
      Array.from(t.options).forEach((n) => {
        n.selected = r.includes(n.value);
      });
      return;
    }
    t.value = String(e);
  }
}
function ye(t, e) {
  const r = /* @__PURE__ */ new Map();
  return t.querySelectorAll("template[data-block-template]").forEach((n) => {
    const a = n.dataset.blockType?.trim();
    if (!a) return;
    const l = n.dataset.blockLabel?.trim() || a, b = n.dataset.blockIcon?.trim(), v = te(n.dataset.blockCollapsed), A = n.dataset.blockSchemaVersion?.trim() || re(a, e.schemaVersionPattern), C = n.dataset.blockRequiredFields?.trim(), L = C ? C.split(",").map((c) => c.trim()).filter(Boolean) : e.requiredFields?.[a] || [];
    r.set(a, {
      type: a,
      label: l,
      icon: b || void 0,
      collapsed: v,
      schemaVersion: A,
      requiredFields: L,
      template: n
    });
  }), r;
}
function ne(t, e) {
  const r = z.get(t) ?? /* @__PURE__ */ new Map(), n = ye(t, e);
  return r.clear(), n.forEach((a, l) => r.set(l, a)), z.set(t, r), r;
}
function re(t, e) {
  return e ? e.replace("{type}", t) : `${t}@v1.0.0`;
}
function xe(t, e, r) {
  const n = e && typeof e._schema == "string" ? e._schema.trim() : "";
  return n || (t.schemaVersion ? t.schemaVersion : re(t.type, r));
}
function ve(t, e) {
  const r = [], n = e.requiredFields || [];
  for (const a of n) {
    const l = t.querySelector(`[name="${a}"], [data-block-field-name="${a}"]`);
    if (!l) continue;
    let b = !1;
    if (l instanceof HTMLInputElement) if (l.type === "checkbox") b = !l.checked;
    else if (l.type === "radio") {
      const v = t.querySelectorAll(`[name="${l.name}"]`);
      b = !Array.from(v).some((A) => A.checked);
    } else b = !l.value.trim();
    else l instanceof HTMLSelectElement ? b = !l.value || l.value === "" : b = !l.value.trim();
    b && r.push({
      field: a,
      message: `${a} is required`
    });
  }
  return r;
}
function Ee(t, e) {
  if (Ae(t), e.length === 0) return;
  t.classList.add("block-item--invalid"), t.dataset.blockValid = "false";
  const r = t.querySelector("[data-block-header]");
  if (r) {
    const n = document.createElement("span");
    n.className = "block-error-badge text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/20 dark:text-red-400", n.textContent = `${e.length} error${e.length > 1 ? "s" : ""}`, n.setAttribute("data-block-error-badge", "true"), r.querySelector(".flex")?.appendChild(n);
  }
  for (const n of e) {
    const a = t.querySelector(`[name="${n.field}"], [data-block-field-name="${n.field}"]`);
    if (a) {
      a.classList.add("border-red-500", "focus:ring-red-500");
      const l = a.closest("[data-component]");
      if (l) {
        const b = document.createElement("p");
        b.className = "block-field-error text-xs text-red-600 mt-1 dark:text-red-400", b.textContent = n.message, b.setAttribute("data-block-field-error", "true"), l.appendChild(b);
      }
    }
  }
}
function Ae(t) {
  t.classList.remove("block-item--invalid"), t.dataset.blockValid = "true", t.querySelectorAll("[data-block-error-badge]").forEach((e) => e.remove()), t.querySelectorAll("[data-block-field-error]").forEach((e) => e.remove()), t.querySelectorAll(".border-red-500").forEach((e) => {
    e.classList.remove("border-red-500", "focus:ring-red-500");
  });
}
function Ce(t, e) {
  for (const r of e) {
    const n = t.querySelector(`[name="${r}"], [data-block-field-name="${r}"]`);
    if (!n) continue;
    n.setAttribute("data-block-required", "true");
    const a = n.closest("[data-component]")?.querySelector("label") ?? n.closest("label");
    if (a && !a.querySelector("[data-required-indicator]")) {
      const l = document.createElement("span");
      l.className = "block-required-indicator text-red-500 ml-0.5", l.textContent = " *", l.setAttribute("data-required-indicator", "true"), l.setAttribute("aria-hidden", "true"), a.appendChild(l);
    }
  }
}
function G(t, e) {
  const r = [];
  if (!Array.isArray(t) || !Array.isArray(e)) return {
    hasConflicts: !1,
    conflicts: [],
    embeddedCount: Array.isArray(t) ? t.length : 0,
    legacyCount: Array.isArray(e) ? e.length : 0
  };
  t.length, e.length;
  const n = Math.max(t.length, e.length);
  for (let a = 0; a < n; a++) {
    const l = t[a] || {}, b = e[a] || {}, v = l._type || b._type || `block_${a}`, A = /* @__PURE__ */ new Set([...Object.keys(l), ...Object.keys(b)]);
    for (const C of A) {
      if (C.startsWith("_")) continue;
      const L = l[C], c = b[C];
      F(L, c) || r.push({
        blockIndex: a,
        blockType: v,
        field: C,
        embeddedValue: L,
        legacyValue: c
      });
    }
  }
  return {
    hasConflicts: r.length > 0 || t.length !== e.length,
    conflicts: r,
    embeddedCount: t.length,
    legacyCount: e.length
  };
}
function F(t, e) {
  if (t === e) return !0;
  if (t == null || e == null) return t === e;
  if (typeof t != typeof e) return !1;
  if (Array.isArray(t) && Array.isArray(e))
    return t.length !== e.length ? !1 : t.every((r, n) => F(r, e[n]));
  if (typeof t == "object") {
    const r = Object.keys(t), n = Object.keys(e);
    return r.length !== n.length ? !1 : r.every((a) => F(t[a], e[a]));
  }
  return !1;
}
function Se(t) {
  const e = document.createElement("div");
  e.className = "block-conflict-report border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4 dark:bg-amber-900/20 dark:border-amber-700", e.setAttribute("data-block-conflict-report", "true");
  const r = document.createElement("div");
  r.className = "flex items-center gap-2 mb-3";
  const n = document.createElement("span");
  n.className = "text-amber-600 dark:text-amber-400", n.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  const a = document.createElement("span");
  a.className = "font-medium text-amber-800 dark:text-amber-200", a.textContent = "Block Conflicts Detected", r.appendChild(n), r.appendChild(a), e.appendChild(r);
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
  const r = Se(e), n = t.querySelector("[data-block-list]");
  n ? n.parentElement?.insertBefore(r, n) : t.insertBefore(r, t.firstChild);
}
function Le() {
  const t = document.createElement("div");
  return t.className = "block-drop-indicator", t.setAttribute("data-block-drop-indicator", "true"), t.setAttribute("aria-hidden", "true"), t;
}
function X(t, e, r) {
  I(t);
  const n = Le();
  return e ? r === "before" ? e.parentElement?.insertBefore(n, e) : e.parentElement?.insertBefore(n, e.nextSibling) : t.appendChild(n), n;
}
function I(t) {
  t.querySelectorAll("[data-block-drop-indicator]").forEach((e) => e.remove());
}
function D(t, e, r) {
  const n = Array.from(t.querySelectorAll("[data-block-item]"));
  for (const a of n) {
    if (a === r) continue;
    const l = a.getBoundingClientRect();
    if (e >= l.top && e <= l.bottom) return {
      item: a,
      position: e < l.top + l.height / 2 ? "before" : "after"
    };
  }
  if (n.length > 0) {
    const a = n[n.length - 1];
    if (a !== r && e > a.getBoundingClientRect().bottom)
      return {
        item: a,
        position: "after"
      };
  }
  return null;
}
function Z(t, e) {
  const r = Array.from(t.querySelectorAll("[data-block-item]")), n = /* @__PURE__ */ new Map();
  r.forEach((a) => {
    n.set(a, a.getBoundingClientRect());
  }), t.offsetHeight, r.forEach((a) => {
    const l = n.get(a);
    if (!l) return;
    const b = a.getBoundingClientRect(), v = l.top - b.top;
    Math.abs(v) < 1 || a.animate([{ transform: `translateY(${v}px)` }, { transform: "translateY(0)" }], {
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
function Be() {
  const t = document.getElementById("block-editor-live-region");
  if (t) return t;
  const e = document.createElement("div");
  return e.id = "block-editor-live-region", e.setAttribute("aria-live", "polite"), e.setAttribute("aria-atomic", "true"), e.className = "sr-only", e.style.cssText = "position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;", document.body.appendChild(e), e;
}
function B(t) {
  const e = Be();
  e.textContent = "", requestAnimationFrame(() => {
    e.textContent = t;
  });
}
function w(t, e) {
  const r = Array.from(t.querySelectorAll("[data-block-item]")), n = r.indexOf(e) + 1, a = r.length;
  return {
    label: e.querySelector("[data-block-header] span")?.textContent || e.dataset.blockType || "Block",
    position: n,
    total: a
  };
}
function qe(t) {
  const e = {};
  return t.querySelectorAll("input, select, textarea").forEach((r) => {
    const n = r.getAttribute("data-block-field-name") || r.name;
    if (!n || r.dataset.blockIgnore === "true") return;
    const a = n.endsWith("[]") || r.name.endsWith("[]");
    r instanceof HTMLInputElement && r.type === "checkbox" ? V(e, n, r.checked, a) : r instanceof HTMLSelectElement && r.multiple ? V(e, n, Array.from(r.selectedOptions).map((l) => l.value), !1) : V(e, n, r.value, a);
  }), e._type = t.dataset.blockType || "", e._schema = t.dataset.blockSchema || "", e;
}
function V(t, e, r, n) {
  const a = e.endsWith("[]") ? e.slice(0, -2) : e;
  if (!a) return;
  if (!n) {
    t[a] = r;
    return;
  }
  const l = t[a];
  if (Array.isArray(l)) {
    l.push(r);
    return;
  }
  if (l !== void 0) {
    t[a] = [l, r];
    return;
  }
  t[a] = [r];
}
function Ie(t, e, r = 50, n = 10) {
  const a = () => {
    if (!e.dragging) {
      e.scrollInterval && (clearInterval(e.scrollInterval), e.scrollInterval = null);
      return;
    }
    const l = t.getBoundingClientRect(), b = e.touchCurrentY;
    b < l.top + r ? t.scrollTop -= n : b > l.bottom - r && (t.scrollTop += n);
  };
  e.scrollInterval || (e.scrollInterval = window.setInterval(a, 16));
}
function Te(t, e) {
  const r = t.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (r.length === 0) {
    const n = document.createElement("input");
    n.type = "hidden", n.name = "_type", n.value = e, n.readOnly = !0, n.setAttribute("data-block-type-input", "true"), n.setAttribute("data-block-ignore", "true"), t.appendChild(n);
    return;
  }
  r.forEach((n) => {
    n.setAttribute("data-block-type-input", "true"), n.setAttribute("data-block-ignore", "true"), n instanceof HTMLInputElement ? (n.value = e, n.readOnly = !0) : n instanceof HTMLSelectElement ? (Array.from(n.options).forEach((l) => {
      l.selected = l.value === e;
    }), n.disabled = !0) : (n.value = e, n.readOnly = !0);
    const a = n.closest("[data-component]");
    a && a.classList.add("hidden");
  });
}
function we(t, e) {
  const r = t.querySelectorAll('[name="_schema"], [data-block-schema-input]');
  if (r.length === 0) {
    const n = document.createElement("input");
    n.type = "hidden", n.name = "_schema", n.value = e, n.setAttribute("data-block-schema-input", "true"), n.setAttribute("data-block-ignore", "true"), t.appendChild(n);
    return;
  }
  r.forEach((n) => {
    n.setAttribute("data-block-schema-input", "true"), n.setAttribute("data-block-ignore", "true"), n.value = e, n.readOnly = !0;
    const a = n.closest("[data-component]");
    a && a.classList.add("hidden");
  });
}
function Ne(t) {
  const e = ue(t);
  if (!e) return;
  const r = ee(t), n = ne(t, r), a = t.dataset.blockField || e.output.name, l = te(t.dataset.blockSortable), b = r.sortable ?? l ?? !1, v = r.allowDrag ?? b, A = r.addLabel || e.addButton?.dataset.blockAddLabel || "Add block", C = r.emptyLabel || e.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.", L = r.validateOnInput ?? !0;
  e.addButton && (e.addButton.textContent = A), e.emptyState && (e.emptyState.textContent = C);
  const c = e.list, T = e.output, R = () => {
    const o = Array.from(c.querySelectorAll("[data-block-item]"));
    let u = !1;
    const d = o.map((p) => {
      const s = {}, h = /* @__PURE__ */ new Map();
      p.querySelectorAll("input, select, textarea").forEach((f) => {
        if (f.dataset.blockIgnore === "true" || f.hasAttribute("data-block-ignore")) return;
        const m = f.getAttribute("data-block-field-name") || f.name || "";
        m && (h.has(m) || h.set(m, []), h.get(m).push(f));
      }), h.forEach((f, m) => {
        const y = m.endsWith("[]") || f.some((g) => g.name.endsWith("[]")) ? he(f) : be(f);
        y !== void 0 && pe(s, ge(m), y);
      });
      const x = p.dataset.blockType || s._type || "";
      x && (s._type = x);
      const i = p.dataset.blockSchema || s._schema;
      if (i) s._schema = i;
      else {
        const f = n.get(x);
        f?.schemaVersion && (s._schema = f.schemaVersion);
      }
      if (L) {
        const f = n.get(x);
        if (f) {
          const m = ve(p, f);
          Ee(p, m), m.length > 0 && (u = !0);
        }
      }
      return s;
    });
    T.value = JSON.stringify(d), t.dataset.blockEditorValid = u ? "false" : "true";
  }, ae = () => {
    Array.from(c.querySelectorAll("[data-block-item]")).forEach((o, u) => {
      o.querySelectorAll("input, select, textarea").forEach((d) => {
        if (d.dataset.blockIgnore === "true" || d.hasAttribute("data-block-ignore")) return;
        const p = d.getAttribute("data-block-field-name") || d.name;
        p && (d.hasAttribute("data-block-field-name") || d.setAttribute("data-block-field-name", p), d.name = fe(a, u, p));
      });
    });
  }, oe = () => {
    if (!e.emptyState) return;
    const o = c.querySelector("[data-block-item]");
    e.emptyState.classList.toggle("hidden", !!o);
  }, S = () => {
    ae(), R(), oe();
  }, Y = t.closest("form");
  Y && Y.addEventListener("submit", () => {
    R();
  });
  const le = (o, u) => {
    o.querySelectorAll("input, select, textarea").forEach((d) => {
      const p = d.getAttribute("data-block-field-name") || d.name;
      if (!p) return;
      const s = me(u, p);
      s !== void 0 && ke(d, s);
    });
  }, _ = (o, u) => {
    const d = xe(o, u, r.schemaVersionPattern), p = document.createElement("div");
    p.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", p.setAttribute("data-block-item", "true"), p.dataset.blockType = o.type, b && p.setAttribute("draggable", "true");
    const s = document.createElement("div");
    s.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", s.setAttribute("data-block-header", "true");
    const h = document.createElement("div");
    h.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const x = document.createElement("span");
    x.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", x.textContent = o.icon || o.label.slice(0, 1).toUpperCase();
    const i = document.createElement("span");
    i.textContent = o.label;
    const f = document.createElement("span");
    f.className = "text-xs text-gray-500 dark:text-gray-400", f.textContent = o.type;
    const m = document.createElement("span");
    m.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", m.textContent = d, m.setAttribute("data-block-schema-badge", "true"), h.appendChild(x), h.appendChild(i), h.appendChild(f), h.appendChild(m);
    const y = document.createElement("div");
    if (y.className = "flex items-center gap-2", b) {
      const q = document.createElement("button");
      q.type = "button", q.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", q.textContent = "Up", q.setAttribute("data-block-move-up", "true");
      const N = document.createElement("button");
      N.type = "button", N.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", N.textContent = "Down", N.setAttribute("data-block-move-down", "true"), y.appendChild(q), y.appendChild(N);
    }
    const g = document.createElement("button");
    g.type = "button", g.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", g.textContent = "Collapse", g.setAttribute("data-block-collapse", "true");
    const k = document.createElement("button");
    if (k.type = "button", k.className = "text-xs text-red-600 hover:text-red-700", k.textContent = "Remove", k.setAttribute("data-block-remove", "true"), y.appendChild(g), y.appendChild(k), b) {
      const q = document.createElement("span");
      q.className = "text-xs text-gray-400 cursor-move", q.textContent = "Drag", q.setAttribute("data-block-drag-handle", "true"), y.appendChild(q);
    }
    s.appendChild(h), s.appendChild(y);
    const E = document.createElement("div");
    E.className = "p-4 space-y-4", E.setAttribute("data-block-body", "true");
    const $ = o.template.content.cloneNode(!0);
    E.appendChild($), p.appendChild(s), p.appendChild(E), Te(p, o.type), we(p, d), p.dataset.blockSchema = d, u && le(p, u);
    const J = o.requiredFields || [];
    return J.length > 0 && Ce(E, J), (o.collapsed ?? !1) && (E.classList.add("hidden"), p.dataset.blockCollapsed = "true", g.textContent = "Expand"), p;
  }, j = (o, u) => {
    const d = n.get(o);
    if (!d) return;
    const p = _(d, u);
    c.appendChild(p), S();
  }, W = e.addButton, H = e.addSelect;
  if (W && H && W.addEventListener("click", () => {
    const o = H.value.trim();
    o && (j(o), H.value = "");
  }), t.addEventListener("click", (o) => {
    const u = o.target;
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
          const h = u.closest("[data-block-collapse]");
          h && (h.textContent = s ? "Expand" : "Collapse");
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
  }), t.addEventListener("input", (o) => {
    const u = o.target;
    !(u instanceof HTMLElement) || !u.closest("[data-block-item]") || S();
  }), t.addEventListener("change", (o) => {
    const u = o.target;
    !(u instanceof HTMLElement) || !u.closest("[data-block-item]") || S();
  }), b && v) {
    const o = r.dragFromHeader ?? !0, u = r.enableTouch ?? !0, d = r.enableAnimations ?? !0, p = r.enableCrossEditor ?? !1, s = {
      dragging: null,
      placeholder: null,
      touchStartY: 0,
      touchCurrentY: 0,
      scrollInterval: null,
      originalIndex: -1
    }, h = (i) => i.closest("[data-block-drag-handle]") ? !0 : o && i.closest("[data-block-header]") ? !i.closest("button, input, select, textarea") : !1, x = (i) => Array.from(c.querySelectorAll("[data-block-item]")).indexOf(i);
    if (c.addEventListener("dragstart", (i) => {
      const f = i.target;
      if (!(f instanceof HTMLElement)) return;
      if (!h(f)) {
        i.preventDefault();
        return;
      }
      const m = f.closest("[data-block-item]");
      if (!m) return;
      if (s.dragging = m, s.originalIndex = x(m), m.classList.add("block-item--dragging"), i.dataTransfer) {
        if (i.dataTransfer.effectAllowed = "move", i.dataTransfer.setData("text/plain", "block"), p) {
          const k = qe(m);
          i.dataTransfer.setData("application/x-block", JSON.stringify(k));
        }
        const g = m.cloneNode(!0);
        g.style.cssText = "position: absolute; top: -9999px; left: -9999px; opacity: 0.8; transform: rotate(2deg);", document.body.appendChild(g), i.dataTransfer.setDragImage(g, 20, 20), requestAnimationFrame(() => g.remove());
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
          const g = JSON.parse(y), k = g._type;
          if (k && n.has(k)) {
            const E = _(n.get(k), g);
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
      c.addEventListener("touchstart", (g) => {
        const k = g.touches[0], E = k.target;
        if (!h(E)) return;
        const $ = E.closest("[data-block-item]");
        $ && (s.touchStartY = k.clientY, s.touchCurrentY = k.clientY, i = $, m = !1);
      }, { passive: !0 }), c.addEventListener("touchmove", (g) => {
        if (!i) return;
        const k = g.touches[0];
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
        g.preventDefault(), f && (f.style.top = `${k.clientY - f.offsetHeight / 2}px`);
        const E = D(c, k.clientY, i || void 0);
        E ? X(c, E.item, E.position) : I(c), Ie(c, s);
      }, { passive: !1 }), c.addEventListener("touchend", () => {
        if (s.scrollInterval && (clearInterval(s.scrollInterval), s.scrollInterval = null), I(c), f && (f.remove(), f = null), i && m) {
          i.classList.remove("block-item--placeholder");
          const g = D(c, s.touchCurrentY, i);
          if (g && (g.position === "before" ? c.insertBefore(i, g.item) : c.insertBefore(i, g.item.nextSibling)), d && Z(c, i), x(i) !== s.originalIndex) {
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
    const o = document.createElement("option");
    o.value = "", o.textContent = "Select block type", e.addSelect.appendChild(o), n.forEach((u) => {
      const d = document.createElement("option");
      d.value = u.type, d.textContent = u.label, e.addSelect?.appendChild(d);
    }), e.addSelect.value = "";
  }
  t.addEventListener("keydown", (o) => {
    const u = o.target;
    if (!(u instanceof HTMLElement)) return;
    const d = u.closest("[data-block-item]");
    if (!d) return;
    const p = u.closest("[data-block-header]");
    if (p)
      switch (o.key) {
        case "Delete":
        case "Backspace":
          o.shiftKey && (o.preventDefault(), d.remove(), S(), c.querySelector("[data-block-item] [data-block-header]")?.focus());
          break;
        case "ArrowUp":
          if (o.altKey && b) {
            o.preventDefault();
            const h = d.previousElementSibling;
            if (h) {
              c.insertBefore(d, h), S(), d.querySelector("[data-block-header]")?.focus();
              const x = w(c, d);
              B(`${x.label} moved to position ${x.position} of ${x.total}`);
            } else B("Already at the top");
          } else if (!o.altKey) {
            o.preventDefault();
            const h = d.previousElementSibling?.querySelector("[data-block-header]");
            h ? h.focus() : B("At the first block");
          }
          break;
        case "ArrowDown":
          if (o.altKey && b) {
            o.preventDefault();
            const h = d.nextElementSibling;
            if (h) {
              c.insertBefore(h, d), S(), d.querySelector("[data-block-header]")?.focus();
              const x = w(c, d);
              B(`${x.label} moved to position ${x.position} of ${x.total}`);
            } else B("Already at the bottom");
          } else if (!o.altKey) {
            o.preventDefault();
            const h = d.nextElementSibling?.querySelector("[data-block-header]");
            h ? h.focus() : B("At the last block");
          }
          break;
        case "Enter":
        case " ":
          u.matches("[data-block-collapse]") || u.matches("[data-block-remove]") || u.matches("[data-block-move-up]") || u.matches("[data-block-move-down]") ? (o.preventDefault(), u.click()) : p && !u.matches("button") && (o.preventDefault(), d.querySelector("[data-block-collapse]")?.click());
          break;
        case "Escape":
          const s = d.querySelector("[data-block-body]");
          if (s && !s.classList.contains("hidden")) {
            o.preventDefault(), s.classList.add("hidden"), d.dataset.blockCollapsed = "true";
            const h = d.querySelector("[data-block-collapse]");
            h && (h.textContent = "Expand");
          }
          break;
      }
  });
  const ce = () => {
    c.querySelectorAll("[data-block-header]").forEach((o) => {
      o.hasAttribute("tabindex") || (o.setAttribute("tabindex", "0"), o.setAttribute("role", "button"), o.setAttribute("aria-label", "Block header - Press Enter to collapse/expand, Shift+Delete to remove"));
    });
  };
  new MutationObserver(() => {
    ce();
  }).observe(c, {
    childList: !0,
    subtree: !0
  });
  const M = K(T.value, []);
  M.forEach((o) => {
    const u = typeof o == "object" && o ? o._type : "";
    u && n.has(u) && j(u, o);
  });
  const P = r.showConflicts ?? !0;
  if (P && r.legacyBlocks && Array.isArray(r.legacyBlocks)) {
    const o = G(M, r.legacyBlocks);
    o.hasConflicts && Q(t, o);
  }
  const U = t.dataset.blockLegacy;
  if (P && U) {
    const o = K(U, []);
    if (o.length > 0) {
      const u = G(M, o);
      u.hasConflicts && Q(t, u);
    }
  }
  S();
}
function Me(t, e) {
  const r = document.createElement("template");
  r.setAttribute("data-block-template", ""), r.dataset.blockType = e.type, r.dataset.blockLabel = e.label, e.icon && (r.dataset.blockIcon = e.icon), e.schemaVersion && (r.dataset.blockSchemaVersion = e.schemaVersion), e.requiredFields && e.requiredFields.length > 0 && (r.dataset.blockRequiredFields = e.requiredFields.join(",")), r.innerHTML = e.html, t.appendChild(r);
}
function Ve(t) {
  t && ne(t, ee(t));
}
function $e(t = document) {
  Array.from(t.querySelectorAll('[data-component="block"], [data-block-editor]')).filter((e) => e.dataset.blockLibraryPicker !== "true" && e.dataset.blockInit !== "manual").forEach((e) => Ne(e));
}
se(() => $e());
export {
  Ne as initBlockEditor,
  $e as initBlockEditors,
  Ce as markRequiredFields,
  Ve as refreshBlockTemplateRegistry,
  Me as registerBlockTemplate
};

//# sourceMappingURL=block_editor.js.map