var z = /* @__PURE__ */ new WeakMap();
function ce(t) {
  if (!t) return {};
  try {
    const e = JSON.parse(t);
    if (e && typeof e == "object") return e;
  } catch {
  }
  return {};
}
function Z(t) {
  return ce(t.closest("[data-component-config]")?.getAttribute("data-component-config") ?? null);
}
function ee(t) {
  if (t == null) return;
  const e = t.trim().toLowerCase();
  if (e === "true") return !0;
  if (e === "false") return !1;
}
function se(t) {
  const e = t.querySelector("[data-block-list]"), n = t.querySelector("input[data-block-output]");
  if (!e || !n) return null;
  const r = t.querySelector("[data-block-add-select]"), a = t.querySelector("[data-block-add]"), c = t.querySelector("[data-block-empty]");
  return {
    root: t,
    list: e,
    output: n,
    addSelect: r ?? void 0,
    addButton: a ?? void 0,
    emptyState: c ?? void 0
  };
}
function O(t) {
  return t.replace(/\]/g, "").split(/\.|\[/).map((e) => e.trim()).filter((e) => e.length > 0);
}
function ie(t, e, n) {
  if (!t) return n;
  const r = O(n);
  let a = `${t}[${e}]`;
  for (const c of r) a += `[${c}]`;
  return a;
}
function de(t, e) {
  if (!t || !e) return;
  const n = O(e);
  let r = t;
  for (const a of n) {
    if (r == null) return;
    r = r[a];
  }
  return r;
}
function ue(t, e, n) {
  if (!e) return;
  const r = O(e);
  if (r.length === 0) return;
  let a = t;
  r.forEach((c, b) => {
    const v = b === r.length - 1, A = r[b + 1], C = A !== void 0 && /^\d+$/.test(A);
    if (v) {
      if (c === "") return;
      a[c] = n;
      return;
    }
    (a[c] == null || typeof a[c] != "object") && (a[c] = C ? [] : {}), a = a[c];
  });
}
function fe(t) {
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
function me(t, e) {
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
function pe(t, e) {
  const n = /* @__PURE__ */ new Map();
  return t.querySelectorAll("template[data-block-template]").forEach((r) => {
    const a = r.dataset.blockType?.trim();
    if (!a) return;
    const c = r.dataset.blockLabel?.trim() || a, b = r.dataset.blockIcon?.trim(), v = ee(r.dataset.blockCollapsed), A = r.dataset.blockSchemaVersion?.trim() || re(a, e.schemaVersionPattern), C = r.dataset.blockRequiredFields?.trim(), L = C ? C.split(",").map((l) => l.trim()).filter(Boolean) : e.requiredFields?.[a] || [];
    n.set(a, {
      type: a,
      label: c,
      icon: b || void 0,
      collapsed: v,
      schemaVersion: A,
      requiredFields: L,
      template: r
    });
  }), n;
}
function te(t, e) {
  const n = z.get(t) ?? /* @__PURE__ */ new Map(), r = pe(t, e);
  return n.clear(), r.forEach((a, c) => n.set(c, a)), z.set(t, n), n;
}
function re(t, e) {
  return e ? e.replace("{type}", t) : `${t}@v1.0.0`;
}
function be(t, e, n) {
  const r = e && typeof e._schema == "string" ? e._schema.trim() : "";
  return r || (t.schemaVersion ? t.schemaVersion : re(t.type, n));
}
function ge(t, e) {
  const n = [], r = e.requiredFields || [];
  for (const a of r) {
    const c = t.querySelector(`[name="${a}"], [data-block-field-name="${a}"]`);
    if (!c) continue;
    let b = !1;
    if (c instanceof HTMLInputElement) if (c.type === "checkbox") b = !c.checked;
    else if (c.type === "radio") {
      const v = t.querySelectorAll(`[name="${c.name}"]`);
      b = !Array.from(v).some((A) => A.checked);
    } else b = !c.value.trim();
    else c instanceof HTMLSelectElement ? b = !c.value || c.value === "" : b = !c.value.trim();
    b && n.push({
      field: a,
      message: `${a} is required`
    });
  }
  return n;
}
function he(t, e) {
  if (ke(t), e.length === 0) return;
  t.classList.add("block-item--invalid"), t.dataset.blockValid = "false";
  const n = t.querySelector("[data-block-header]");
  if (n) {
    const r = document.createElement("span");
    r.className = "block-error-badge text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/20 dark:text-red-400", r.textContent = `${e.length} error${e.length > 1 ? "s" : ""}`, r.setAttribute("data-block-error-badge", "true"), n.querySelector(".flex")?.appendChild(r);
  }
  for (const r of e) {
    const a = t.querySelector(`[name="${r.field}"], [data-block-field-name="${r.field}"]`);
    if (a) {
      a.classList.add("border-red-500", "focus:ring-red-500");
      const c = a.closest("[data-component]");
      if (c) {
        const b = document.createElement("p");
        b.className = "block-field-error text-xs text-red-600 mt-1 dark:text-red-400", b.textContent = r.message, b.setAttribute("data-block-field-error", "true"), c.appendChild(b);
      }
    }
  }
}
function ke(t) {
  t.classList.remove("block-item--invalid"), t.dataset.blockValid = "true", t.querySelectorAll("[data-block-error-badge]").forEach((e) => e.remove()), t.querySelectorAll("[data-block-field-error]").forEach((e) => e.remove()), t.querySelectorAll(".border-red-500").forEach((e) => {
    e.classList.remove("border-red-500", "focus:ring-red-500");
  });
}
function ye(t, e) {
  for (const n of e) {
    const r = t.querySelector(`[name="${n}"], [data-block-field-name="${n}"]`);
    if (!r) continue;
    r.setAttribute("data-block-required", "true");
    const a = r.closest("[data-component]")?.querySelector("label") ?? r.closest("label");
    if (a && !a.querySelector("[data-required-indicator]")) {
      const c = document.createElement("span");
      c.className = "block-required-indicator text-red-500 ml-0.5", c.textContent = " *", c.setAttribute("data-required-indicator", "true"), c.setAttribute("aria-hidden", "true"), a.appendChild(c);
    }
  }
}
function W(t, e) {
  const n = [];
  if (!Array.isArray(t) || !Array.isArray(e)) return {
    hasConflicts: !1,
    conflicts: [],
    embeddedCount: Array.isArray(t) ? t.length : 0,
    legacyCount: Array.isArray(e) ? e.length : 0
  };
  t.length, e.length;
  const r = Math.max(t.length, e.length);
  for (let a = 0; a < r; a++) {
    const c = t[a] || {}, b = e[a] || {}, v = c._type || b._type || `block_${a}`, A = /* @__PURE__ */ new Set([...Object.keys(c), ...Object.keys(b)]);
    for (const C of A) {
      if (C.startsWith("_")) continue;
      const L = c[C], l = b[C];
      V(L, l) || n.push({
        blockIndex: a,
        blockType: v,
        field: C,
        embeddedValue: L,
        legacyValue: l
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
    return n.length !== r.length ? !1 : n.every((a) => V(t[a], e[a]));
  }
  return !1;
}
function xe(t) {
  const e = document.createElement("div");
  e.className = "block-conflict-report border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4 dark:bg-amber-900/20 dark:border-amber-700", e.setAttribute("data-block-conflict-report", "true");
  const n = document.createElement("div");
  n.className = "flex items-center gap-2 mb-3";
  const r = document.createElement("span");
  r.className = "text-amber-600 dark:text-amber-400", r.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  const a = document.createElement("span");
  a.className = "font-medium text-amber-800 dark:text-amber-200", a.textContent = "Block Conflicts Detected", n.appendChild(r), n.appendChild(a), e.appendChild(n);
  const c = document.createElement("p");
  if (c.className = "text-sm text-amber-700 dark:text-amber-300 mb-3", c.textContent = `Embedded blocks (${t.embeddedCount}) differ from legacy blocks (${t.legacyCount}). Embedded blocks are authoritative.`, e.appendChild(c), t.conflicts.length > 0) {
    const A = document.createElement("details");
    A.className = "text-sm";
    const C = document.createElement("summary");
    C.className = "cursor-pointer text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium", C.textContent = `View ${t.conflicts.length} field conflict${t.conflicts.length > 1 ? "s" : ""}`, A.appendChild(C);
    const L = document.createElement("ul");
    L.className = "mt-2 space-y-1 pl-4";
    for (const l of t.conflicts.slice(0, 10)) {
      const w = document.createElement("li");
      w.className = "text-amber-700 dark:text-amber-300", w.innerHTML = `<span class="font-mono text-xs">${l.blockType}[${l.blockIndex}].${l.field}</span>: <span class="text-green-600 dark:text-green-400">embedded</span> vs <span class="text-red-600 dark:text-red-400">legacy</span>`, L.appendChild(w);
    }
    if (t.conflicts.length > 10) {
      const l = document.createElement("li");
      l.className = "text-amber-600 dark:text-amber-400 italic", l.textContent = `...and ${t.conflicts.length - 10} more`, L.appendChild(l);
    }
    A.appendChild(L), e.appendChild(A);
  }
  const b = document.createElement("div");
  b.className = "mt-3 flex gap-2";
  const v = document.createElement("button");
  return v.type = "button", v.className = "text-xs px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40", v.textContent = "Dismiss", v.addEventListener("click", () => e.remove()), b.appendChild(v), e.appendChild(b), e;
}
function G(t, e) {
  if (t.querySelector("[data-block-conflict-report]")?.remove(), !e.hasConflicts) return;
  const n = xe(e), r = t.querySelector("[data-block-list]");
  r ? r.parentElement?.insertBefore(n, r) : t.insertBefore(n, t.firstChild);
}
function ve() {
  const t = document.createElement("div");
  return t.className = "block-drop-indicator", t.setAttribute("data-block-drop-indicator", "true"), t.setAttribute("aria-hidden", "true"), t;
}
function Q(t, e, n) {
  I(t);
  const r = ve();
  return e ? n === "before" ? e.parentElement?.insertBefore(r, e) : e.parentElement?.insertBefore(r, e.nextSibling) : t.appendChild(r), r;
}
function I(t) {
  t.querySelectorAll("[data-block-drop-indicator]").forEach((e) => e.remove());
}
function D(t, e, n) {
  const r = Array.from(t.querySelectorAll("[data-block-item]"));
  for (const a of r) {
    if (a === n) continue;
    const c = a.getBoundingClientRect();
    if (e >= c.top && e <= c.bottom) return {
      item: a,
      position: e < c.top + c.height / 2 ? "before" : "after"
    };
  }
  if (r.length > 0) {
    const a = r[r.length - 1];
    if (a !== n && e > a.getBoundingClientRect().bottom)
      return {
        item: a,
        position: "after"
      };
  }
  return null;
}
function X(t, e) {
  const n = Array.from(t.querySelectorAll("[data-block-item]")), r = /* @__PURE__ */ new Map();
  n.forEach((a) => {
    r.set(a, a.getBoundingClientRect());
  }), t.offsetHeight, n.forEach((a) => {
    const c = r.get(a);
    if (!c) return;
    const b = a.getBoundingClientRect(), v = c.top - b.top;
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
function Ee() {
  const t = document.getElementById("block-editor-live-region");
  if (t) return t;
  const e = document.createElement("div");
  return e.id = "block-editor-live-region", e.setAttribute("aria-live", "polite"), e.setAttribute("aria-atomic", "true"), e.className = "sr-only", e.style.cssText = "position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;", document.body.appendChild(e), e;
}
function B(t) {
  const e = Ee();
  e.textContent = "", requestAnimationFrame(() => {
    e.textContent = t;
  });
}
function T(t, e) {
  const n = Array.from(t.querySelectorAll("[data-block-item]")), r = n.indexOf(e) + 1, a = n.length;
  return {
    label: e.querySelector("[data-block-header] span")?.textContent || e.dataset.blockType || "Block",
    position: r,
    total: a
  };
}
function Ae(t) {
  const e = {};
  return t.querySelectorAll("input, select, textarea").forEach((n) => {
    const r = n.getAttribute("data-block-field-name") || n.name;
    !r || n.dataset.blockIgnore === "true" || (n instanceof HTMLInputElement && n.type === "checkbox" ? e[r] = n.checked : n instanceof HTMLSelectElement && n.multiple ? e[r] = Array.from(n.selectedOptions).map((a) => a.value) : e[r] = n.value);
  }), e._type = t.dataset.blockType || "", e._schema = t.dataset.blockSchema || "", e;
}
function Ce(t, e, n = 50, r = 10) {
  const a = () => {
    if (!e.dragging) {
      e.scrollInterval && (clearInterval(e.scrollInterval), e.scrollInterval = null);
      return;
    }
    const c = t.getBoundingClientRect(), b = e.touchCurrentY;
    b < c.top + n ? t.scrollTop -= r : b > c.bottom - n && (t.scrollTop += r);
  };
  e.scrollInterval || (e.scrollInterval = window.setInterval(a, 16));
}
function Se(t, e) {
  const n = t.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (n.length === 0) {
    const r = document.createElement("input");
    r.type = "hidden", r.name = "_type", r.value = e, r.readOnly = !0, r.setAttribute("data-block-type-input", "true"), r.setAttribute("data-block-ignore", "true"), t.appendChild(r);
    return;
  }
  n.forEach((r) => {
    r.setAttribute("data-block-type-input", "true"), r.setAttribute("data-block-ignore", "true"), r instanceof HTMLInputElement ? (r.value = e, r.readOnly = !0) : r instanceof HTMLSelectElement ? (Array.from(r.options).forEach((c) => {
      c.selected = c.value === e;
    }), r.disabled = !0) : (r.value = e, r.readOnly = !0);
    const a = r.closest("[data-component]");
    a && a.classList.add("hidden");
  });
}
function Le(t, e) {
  const n = t.querySelectorAll('[name="_schema"], [data-block-schema-input]');
  if (n.length === 0) {
    const r = document.createElement("input");
    r.type = "hidden", r.name = "_schema", r.value = e, r.setAttribute("data-block-schema-input", "true"), r.setAttribute("data-block-ignore", "true"), t.appendChild(r);
    return;
  }
  n.forEach((r) => {
    r.setAttribute("data-block-schema-input", "true"), r.setAttribute("data-block-ignore", "true"), r.value = e, r.readOnly = !0;
    const a = r.closest("[data-component]");
    a && a.classList.add("hidden");
  });
}
function Be(t) {
  const e = se(t);
  if (!e) return;
  const n = Z(t), r = te(t, n), a = t.dataset.blockField || e.output.name, c = ee(t.dataset.blockSortable), b = n.sortable ?? c ?? !1, v = n.allowDrag ?? b, A = n.addLabel || e.addButton?.dataset.blockAddLabel || "Add block", C = n.emptyLabel || e.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.", L = n.validateOnInput ?? !0;
  e.addButton && (e.addButton.textContent = A), e.emptyState && (e.emptyState.textContent = C);
  const l = e.list, w = e.output, F = () => {
    const o = Array.from(l.querySelectorAll("[data-block-item]"));
    let u = !1;
    const i = o.map((f) => {
      const s = {}, g = /* @__PURE__ */ new Map();
      f.querySelectorAll("input, select, textarea").forEach((m) => {
        if (m.dataset.blockIgnore === "true" || m.hasAttribute("data-block-ignore")) return;
        const p = m.getAttribute("data-block-field-name") || m.name || "";
        p && (g.has(p) || g.set(p, []), g.get(p).push(m));
      }), g.forEach((m, p) => {
        const y = fe(m);
        y !== void 0 && ue(s, p, y);
      });
      const x = f.dataset.blockType || s._type || "";
      x && (s._type = x);
      const d = f.dataset.blockSchema || s._schema;
      if (d) s._schema = d;
      else {
        const m = r.get(x);
        m?.schemaVersion && (s._schema = m.schemaVersion);
      }
      if (L) {
        const m = r.get(x);
        if (m) {
          const p = ge(f, m);
          he(f, p), p.length > 0 && (u = !0);
        }
      }
      return s;
    });
    w.value = JSON.stringify(i), t.dataset.blockEditorValid = u ? "false" : "true";
  }, ne = () => {
    Array.from(l.querySelectorAll("[data-block-item]")).forEach((o, u) => {
      o.querySelectorAll("input, select, textarea").forEach((i) => {
        if (i.dataset.blockIgnore === "true" || i.hasAttribute("data-block-ignore")) return;
        const f = i.getAttribute("data-block-field-name") || i.name;
        f && (i.hasAttribute("data-block-field-name") || i.setAttribute("data-block-field-name", f), i.name = ie(a, u, f));
      });
    });
  }, ae = () => {
    if (!e.emptyState) return;
    const o = l.querySelector("[data-block-item]");
    e.emptyState.classList.toggle("hidden", !!o);
  }, S = () => {
    ne(), F(), ae();
  }, R = t.closest("form");
  R && R.addEventListener("submit", () => {
    F();
  });
  const oe = (o, u) => {
    o.querySelectorAll("input, select, textarea").forEach((i) => {
      const f = i.getAttribute("data-block-field-name") || i.name;
      if (!f) return;
      const s = de(u, f);
      s !== void 0 && me(i, s);
    });
  }, Y = (o, u) => {
    const i = be(o, u, n.schemaVersionPattern), f = document.createElement("div");
    f.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", f.setAttribute("data-block-item", "true"), f.dataset.blockType = o.type, b && f.setAttribute("draggable", "true");
    const s = document.createElement("div");
    s.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", s.setAttribute("data-block-header", "true");
    const g = document.createElement("div");
    g.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const x = document.createElement("span");
    x.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", x.textContent = o.icon || o.label.slice(0, 1).toUpperCase();
    const d = document.createElement("span");
    d.textContent = o.label;
    const m = document.createElement("span");
    m.className = "text-xs text-gray-500 dark:text-gray-400", m.textContent = o.type;
    const p = document.createElement("span");
    p.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", p.textContent = i, p.setAttribute("data-block-schema-badge", "true"), g.appendChild(x), g.appendChild(d), g.appendChild(m), g.appendChild(p);
    const y = document.createElement("div");
    if (y.className = "flex items-center gap-2", b) {
      const q = document.createElement("button");
      q.type = "button", q.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", q.textContent = "Up", q.setAttribute("data-block-move-up", "true");
      const N = document.createElement("button");
      N.type = "button", N.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", N.textContent = "Down", N.setAttribute("data-block-move-down", "true"), y.appendChild(q), y.appendChild(N);
    }
    const k = document.createElement("button");
    k.type = "button", k.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", k.textContent = "Collapse", k.setAttribute("data-block-collapse", "true");
    const h = document.createElement("button");
    if (h.type = "button", h.className = "text-xs text-red-600 hover:text-red-700", h.textContent = "Remove", h.setAttribute("data-block-remove", "true"), y.appendChild(k), y.appendChild(h), b) {
      const q = document.createElement("span");
      q.className = "text-xs text-gray-400 cursor-move", q.textContent = "Drag", q.setAttribute("data-block-drag-handle", "true"), y.appendChild(q);
    }
    s.appendChild(g), s.appendChild(y);
    const E = document.createElement("div");
    E.className = "p-4 space-y-4", E.setAttribute("data-block-body", "true");
    const $ = o.template.content.cloneNode(!0);
    E.appendChild($), f.appendChild(s), f.appendChild(E), Se(f, o.type), Le(f, i), f.dataset.blockSchema = i, u && oe(f, u);
    const K = o.requiredFields || [];
    return K.length > 0 && ye(E, K), (o.collapsed ?? !1) && (E.classList.add("hidden"), f.dataset.blockCollapsed = "true", k.textContent = "Expand"), f;
  }, _ = (o, u) => {
    const i = r.get(o);
    if (!i) return;
    const f = Y(i, u);
    l.appendChild(f), S();
  }, j = e.addButton, H = e.addSelect;
  if (j && H && j.addEventListener("click", () => {
    const o = H.value.trim();
    o && (_(o), H.value = "");
  }), t.addEventListener("click", (o) => {
    const u = o.target;
    if (!(u instanceof HTMLElement)) return;
    const i = u.closest("[data-block-item]");
    if (i) {
      if (u.closest("[data-block-remove]")) {
        i.remove(), S();
        return;
      }
      if (u.closest("[data-block-collapse]")) {
        const f = i.querySelector("[data-block-body]");
        if (f) {
          const s = f.classList.toggle("hidden");
          i.dataset.blockCollapsed = s ? "true" : "false";
          const g = u.closest("[data-block-collapse]");
          g && (g.textContent = s ? "Expand" : "Collapse");
        }
        return;
      }
      if (u.closest("[data-block-move-up]")) {
        const f = i.previousElementSibling;
        f && l.insertBefore(i, f), S();
        return;
      }
      if (u.closest("[data-block-move-down]")) {
        const f = i.nextElementSibling;
        f && l.insertBefore(f, i), S();
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
    const o = n.dragFromHeader ?? !0, u = n.enableTouch ?? !0, i = n.enableAnimations ?? !0, f = n.enableCrossEditor ?? !1, s = {
      dragging: null,
      placeholder: null,
      touchStartY: 0,
      touchCurrentY: 0,
      scrollInterval: null,
      originalIndex: -1
    }, g = (d) => d.closest("[data-block-drag-handle]") ? !0 : o && d.closest("[data-block-header]") ? !d.closest("button, input, select, textarea") : !1, x = (d) => Array.from(l.querySelectorAll("[data-block-item]")).indexOf(d);
    if (l.addEventListener("dragstart", (d) => {
      const m = d.target;
      if (!(m instanceof HTMLElement)) return;
      if (!g(m)) {
        d.preventDefault();
        return;
      }
      const p = m.closest("[data-block-item]");
      if (!p) return;
      if (s.dragging = p, s.originalIndex = x(p), p.classList.add("block-item--dragging"), d.dataTransfer) {
        if (d.dataTransfer.effectAllowed = "move", d.dataTransfer.setData("text/plain", "block"), f) {
          const h = Ae(p);
          d.dataTransfer.setData("application/x-block", JSON.stringify(h));
        }
        const k = p.cloneNode(!0);
        k.style.cssText = "position: absolute; top: -9999px; left: -9999px; opacity: 0.8; transform: rotate(2deg);", document.body.appendChild(k), d.dataTransfer.setDragImage(k, 20, 20), requestAnimationFrame(() => k.remove());
      }
      const y = T(l, p);
      B(`Dragging ${y.label} from position ${y.position} of ${y.total}. Use arrow keys to move.`);
    }), l.addEventListener("dragover", (d) => {
      d.preventDefault(), d.dataTransfer && (d.dataTransfer.dropEffect = "move");
      const m = d.clientY, p = D(l, m, s.dragging || void 0);
      p ? Q(l, p.item, p.position) : I(l);
    }), l.addEventListener("dragenter", (d) => {
      d.preventDefault();
    }), l.addEventListener("dragleave", (d) => {
      const m = d.relatedTarget;
      (!m || !l.contains(m)) && I(l);
    }), l.addEventListener("drop", (d) => {
      d.preventDefault(), I(l);
      const m = d.clientY, p = D(l, m, s.dragging || void 0);
      if (!s.dragging && f && d.dataTransfer) {
        const y = d.dataTransfer.getData("application/x-block");
        if (y) try {
          const k = JSON.parse(y), h = k._type;
          if (h && r.has(h)) {
            const E = Y(r.get(h), k);
            p ? p.position === "before" ? l.insertBefore(E, p.item) : l.insertBefore(E, p.item.nextSibling) : l.appendChild(E), S(), B(`Block ${h} added from another editor`);
          }
        } catch {
        }
        return;
      }
      if (s.dragging && (p && (p.position === "before" ? l.insertBefore(s.dragging, p.item) : l.insertBefore(s.dragging, p.item.nextSibling)), i && X(l, s.dragging), x(s.dragging) !== s.originalIndex)) {
        const y = T(l, s.dragging);
        B(`${y.label} moved to position ${y.position} of ${y.total}`);
      }
    }), l.addEventListener("dragend", () => {
      I(l), s.dragging && (s.dragging.classList.remove("block-item--dragging"), s.dragging = null), s.originalIndex = -1, S();
    }), u) {
      let d = null, m = null, p = !1;
      const y = 10;
      l.addEventListener("touchstart", (k) => {
        const h = k.touches[0], E = h.target;
        if (!g(E)) return;
        const $ = E.closest("[data-block-item]");
        $ && (s.touchStartY = h.clientY, s.touchCurrentY = h.clientY, d = $, p = !1);
      }, { passive: !0 }), l.addEventListener("touchmove", (k) => {
        if (!d) return;
        const h = k.touches[0];
        if (s.touchCurrentY = h.clientY, !p) {
          if (Math.abs(h.clientY - s.touchStartY) < y) return;
          p = !0, m = d.cloneNode(!0), m.className = "block-item--touch-dragging", m.style.cssText = `
            position: fixed;
            left: 0;
            right: 0;
            margin: 0 16px;
            z-index: 9999;
            pointer-events: none;
            opacity: 0.9;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            transform: scale(1.02);
          `, document.body.appendChild(m), d.classList.add("block-item--placeholder"), s.dragging = d, s.originalIndex = x(d), B(`Dragging ${T(l, d).label}. Move finger to reposition.`);
        }
        k.preventDefault(), m && (m.style.top = `${h.clientY - m.offsetHeight / 2}px`);
        const E = D(l, h.clientY, d || void 0);
        E ? Q(l, E.item, E.position) : I(l), Ce(l, s);
      }, { passive: !1 }), l.addEventListener("touchend", () => {
        if (s.scrollInterval && (clearInterval(s.scrollInterval), s.scrollInterval = null), I(l), m && (m.remove(), m = null), d && p) {
          d.classList.remove("block-item--placeholder");
          const k = D(l, s.touchCurrentY, d);
          if (k && (k.position === "before" ? l.insertBefore(d, k.item) : l.insertBefore(d, k.item.nextSibling)), i && X(l, d), x(d) !== s.originalIndex) {
            const h = T(l, d);
            B(`${h.label} moved to position ${h.position} of ${h.total}`);
          }
          S();
        }
        d = null, p = !1, s.dragging = null, s.originalIndex = -1;
      }), l.addEventListener("touchcancel", () => {
        s.scrollInterval && (clearInterval(s.scrollInterval), s.scrollInterval = null), I(l), m && (m.remove(), m = null), d && d.classList.remove("block-item--placeholder"), d = null, p = !1, s.dragging = null, s.originalIndex = -1;
      });
    }
  }
  if (e.addSelect) {
    const o = document.createElement("option");
    o.value = "", o.textContent = "Select block type", e.addSelect.appendChild(o), r.forEach((u) => {
      const i = document.createElement("option");
      i.value = u.type, i.textContent = u.label, e.addSelect?.appendChild(i);
    }), e.addSelect.value = "";
  }
  t.addEventListener("keydown", (o) => {
    const u = o.target;
    if (!(u instanceof HTMLElement)) return;
    const i = u.closest("[data-block-item]");
    if (!i) return;
    const f = u.closest("[data-block-header]");
    if (f)
      switch (o.key) {
        case "Delete":
        case "Backspace":
          o.shiftKey && (o.preventDefault(), i.remove(), S(), l.querySelector("[data-block-item] [data-block-header]")?.focus());
          break;
        case "ArrowUp":
          if (o.altKey && b) {
            o.preventDefault();
            const g = i.previousElementSibling;
            if (g) {
              l.insertBefore(i, g), S(), i.querySelector("[data-block-header]")?.focus();
              const x = T(l, i);
              B(`${x.label} moved to position ${x.position} of ${x.total}`);
            } else B("Already at the top");
          } else if (!o.altKey) {
            o.preventDefault();
            const g = i.previousElementSibling?.querySelector("[data-block-header]");
            g ? g.focus() : B("At the first block");
          }
          break;
        case "ArrowDown":
          if (o.altKey && b) {
            o.preventDefault();
            const g = i.nextElementSibling;
            if (g) {
              l.insertBefore(g, i), S(), i.querySelector("[data-block-header]")?.focus();
              const x = T(l, i);
              B(`${x.label} moved to position ${x.position} of ${x.total}`);
            } else B("Already at the bottom");
          } else if (!o.altKey) {
            o.preventDefault();
            const g = i.nextElementSibling?.querySelector("[data-block-header]");
            g ? g.focus() : B("At the last block");
          }
          break;
        case "Enter":
        case " ":
          u.matches("[data-block-collapse]") || u.matches("[data-block-remove]") || u.matches("[data-block-move-up]") || u.matches("[data-block-move-down]") ? (o.preventDefault(), u.click()) : f && !u.matches("button") && (o.preventDefault(), i.querySelector("[data-block-collapse]")?.click());
          break;
        case "Escape":
          const s = i.querySelector("[data-block-body]");
          if (s && !s.classList.contains("hidden")) {
            o.preventDefault(), s.classList.add("hidden"), i.dataset.blockCollapsed = "true";
            const g = i.querySelector("[data-block-collapse]");
            g && (g.textContent = "Expand");
          }
          break;
      }
  });
  const le = () => {
    l.querySelectorAll("[data-block-header]").forEach((o) => {
      o.hasAttribute("tabindex") || (o.setAttribute("tabindex", "0"), o.setAttribute("role", "button"), o.setAttribute("aria-label", "Block header - Press Enter to collapse/expand, Shift+Delete to remove"));
    });
  };
  new MutationObserver(() => {
    le();
  }).observe(l, {
    childList: !0,
    subtree: !0
  });
  const P = w.value?.trim();
  let M = [];
  if (P) try {
    const o = JSON.parse(P);
    Array.isArray(o) && (M = o, o.forEach((u) => {
      const i = typeof u == "object" && u ? u._type : "";
      i && r.has(i) && _(i, u);
    }));
  } catch {
  }
  const U = n.showConflicts ?? !0;
  if (U && n.legacyBlocks && Array.isArray(n.legacyBlocks)) {
    const o = W(M, n.legacyBlocks);
    o.hasConflicts && G(t, o);
  }
  const J = t.dataset.blockLegacy;
  if (U && J) try {
    const o = JSON.parse(J);
    if (Array.isArray(o)) {
      const u = W(M, o);
      u.hasConflicts && G(t, u);
    }
  } catch {
  }
  S();
}
function we(t, e) {
  const n = document.createElement("template");
  n.setAttribute("data-block-template", ""), n.dataset.blockType = e.type, n.dataset.blockLabel = e.label, e.icon && (n.dataset.blockIcon = e.icon), e.schemaVersion && (n.dataset.blockSchemaVersion = e.schemaVersion), e.requiredFields && e.requiredFields.length > 0 && (n.dataset.blockRequiredFields = e.requiredFields.join(",")), n.innerHTML = e.html, t.appendChild(n);
}
function Te(t) {
  t && te(t, Z(t));
}
function qe(t = document) {
  Array.from(t.querySelectorAll('[data-component="block"], [data-block-editor]')).filter((e) => e.dataset.blockLibraryPicker !== "true" && e.dataset.blockInit !== "manual").forEach((e) => Be(e));
}
function Ie(t) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t, { once: !0 }) : t();
}
Ie(() => qe());
export {
  Be as initBlockEditor,
  qe as initBlockEditors,
  ye as markRequiredFields,
  Te as refreshBlockTemplateRegistry,
  we as registerBlockTemplate
};

//# sourceMappingURL=block_editor.js.map