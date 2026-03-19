const z = /* @__PURE__ */ new WeakMap();
function le(t) {
  if (!t) return {};
  try {
    const e = JSON.parse(t);
    if (e && typeof e == "object")
      return e;
  } catch {
  }
  return {};
}
function Z(t) {
  const e = t.closest("[data-component-config]");
  return le(e?.getAttribute("data-component-config") ?? null);
}
function ee(t) {
  if (t == null) return;
  const e = t.trim().toLowerCase();
  if (e === "true") return !0;
  if (e === "false") return !1;
}
function se(t) {
  const e = t.querySelector("[data-block-list]"), r = t.querySelector("input[data-block-output]");
  if (!e || !r) return null;
  const n = t.querySelector("[data-block-add-select]"), o = t.querySelector("[data-block-add]"), s = t.querySelector("[data-block-empty]");
  return { root: t, list: e, output: r, addSelect: n ?? void 0, addButton: o ?? void 0, emptyState: s ?? void 0 };
}
function F(t) {
  return t.replace(/\]/g, "").split(/\.|\[/).map((r) => r.trim()).filter((r) => r.length > 0);
}
function ie(t, e, r) {
  if (!t) return r;
  const n = F(r);
  let o = `${t}[${e}]`;
  for (const s of n)
    o += `[${s}]`;
  return o;
}
function de(t, e) {
  if (!t || !e) return;
  const r = F(e);
  let n = t;
  for (const o of r) {
    if (n == null) return;
    n = n[o];
  }
  return n;
}
function ue(t, e, r) {
  if (!e) return;
  const n = F(e);
  if (n.length === 0) return;
  let o = t;
  n.forEach((s, f) => {
    const v = f === n.length - 1, A = n[f + 1], C = A !== void 0 && /^\d+$/.test(A);
    if (v) {
      if (s === "") return;
      o[s] = r;
      return;
    }
    (o[s] == null || typeof o[s] != "object") && (o[s] = C ? [] : {}), o = o[s];
  });
}
function fe(t) {
  if (t.length === 0) return;
  const e = t[0];
  if (e instanceof HTMLSelectElement && e.multiple)
    return Array.from(e.selectedOptions).map((r) => r.value);
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
      const r = Array.isArray(e) ? e.map(String) : [String(e)];
      Array.from(t.options).forEach((n) => {
        n.selected = r.includes(n.value);
      });
      return;
    }
    t.value = String(e);
  }
}
function pe(t, e) {
  const r = /* @__PURE__ */ new Map();
  return t.querySelectorAll("template[data-block-template]").forEach((n) => {
    const o = n.dataset.blockType?.trim();
    if (!o) return;
    const s = n.dataset.blockLabel?.trim() || o, f = n.dataset.blockIcon?.trim(), v = ee(n.dataset.blockCollapsed), A = n.dataset.blockSchemaVersion?.trim() || ne(o, e.schemaVersionPattern), C = n.dataset.blockRequiredFields?.trim(), L = C ? C.split(",").map((c) => c.trim()).filter(Boolean) : e.requiredFields?.[o] || [];
    r.set(o, {
      type: o,
      label: s,
      icon: f || void 0,
      collapsed: v,
      schemaVersion: A,
      requiredFields: L,
      template: n
    });
  }), r;
}
function te(t, e) {
  const n = z.get(t) ?? /* @__PURE__ */ new Map(), o = pe(t, e);
  return n.clear(), o.forEach((s, f) => n.set(f, s)), z.set(t, n), n;
}
function ne(t, e) {
  return e ? e.replace("{type}", t) : `${t}@v1.0.0`;
}
function be(t, e, r) {
  const n = e && typeof e._schema == "string" ? e._schema.trim() : "";
  return n || (t.schemaVersion ? t.schemaVersion : ne(t.type, r));
}
function ge(t, e) {
  const r = [], n = e.requiredFields || [];
  for (const o of n) {
    const s = t.querySelector(
      `[name="${o}"], [data-block-field-name="${o}"]`
    );
    if (!s) continue;
    let f = !1;
    if (s instanceof HTMLInputElement)
      if (s.type === "checkbox")
        f = !s.checked;
      else if (s.type === "radio") {
        const v = t.querySelectorAll(`[name="${s.name}"]`);
        f = !Array.from(v).some((A) => A.checked);
      } else
        f = !s.value.trim();
    else s instanceof HTMLSelectElement ? f = !s.value || s.value === "" : f = !s.value.trim();
    f && r.push({
      field: o,
      message: `${o} is required`
    });
  }
  return r;
}
function he(t, e) {
  if (ke(t), e.length === 0) return;
  t.classList.add("block-item--invalid"), t.dataset.blockValid = "false";
  const r = t.querySelector("[data-block-header]");
  if (r) {
    const n = document.createElement("span");
    n.className = "block-error-badge text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/20 dark:text-red-400", n.textContent = `${e.length} error${e.length > 1 ? "s" : ""}`, n.setAttribute("data-block-error-badge", "true"), r.querySelector(".flex")?.appendChild(n);
  }
  for (const n of e) {
    const o = t.querySelector(
      `[name="${n.field}"], [data-block-field-name="${n.field}"]`
    );
    if (o) {
      o.classList.add("border-red-500", "focus:ring-red-500");
      const s = o.closest("[data-component]");
      if (s) {
        const f = document.createElement("p");
        f.className = "block-field-error text-xs text-red-600 mt-1 dark:text-red-400", f.textContent = n.message, f.setAttribute("data-block-field-error", "true"), s.appendChild(f);
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
  for (const r of e) {
    const n = t.querySelector(
      `[name="${r}"], [data-block-field-name="${r}"]`
    );
    if (!n) continue;
    n.setAttribute("data-block-required", "true");
    const s = n.closest("[data-component]")?.querySelector("label") ?? n.closest("label");
    if (s && !s.querySelector("[data-required-indicator]")) {
      const f = document.createElement("span");
      f.className = "block-required-indicator text-red-500 ml-0.5", f.textContent = " *", f.setAttribute("data-required-indicator", "true"), f.setAttribute("aria-hidden", "true"), s.appendChild(f);
    }
  }
}
function W(t, e) {
  const r = [];
  if (!Array.isArray(t) || !Array.isArray(e))
    return {
      hasConflicts: !1,
      conflicts: [],
      embeddedCount: Array.isArray(t) ? t.length : 0,
      legacyCount: Array.isArray(e) ? e.length : 0
    };
  t.length, e.length;
  const n = Math.max(t.length, e.length);
  for (let o = 0; o < n; o++) {
    const s = t[o] || {}, f = e[o] || {}, v = s._type || f._type || `block_${o}`, A = /* @__PURE__ */ new Set([...Object.keys(s), ...Object.keys(f)]);
    for (const C of A) {
      if (C.startsWith("_")) continue;
      const L = s[C], c = f[C];
      O(L, c) || r.push({
        blockIndex: o,
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
function O(t, e) {
  if (t === e) return !0;
  if (t == null || e == null) return t === e;
  if (typeof t != typeof e) return !1;
  if (Array.isArray(t) && Array.isArray(e))
    return t.length !== e.length ? !1 : t.every((r, n) => O(r, e[n]));
  if (typeof t == "object") {
    const r = Object.keys(t), n = Object.keys(e);
    return r.length !== n.length ? !1 : r.every((o) => O(t[o], e[o]));
  }
  return !1;
}
function xe(t) {
  const e = document.createElement("div");
  e.className = "block-conflict-report border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4 dark:bg-amber-900/20 dark:border-amber-700", e.setAttribute("data-block-conflict-report", "true");
  const r = document.createElement("div");
  r.className = "flex items-center gap-2 mb-3";
  const n = document.createElement("span");
  n.className = "text-amber-600 dark:text-amber-400", n.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  const o = document.createElement("span");
  o.className = "font-medium text-amber-800 dark:text-amber-200", o.textContent = "Block Conflicts Detected", r.appendChild(n), r.appendChild(o), e.appendChild(r);
  const s = document.createElement("p");
  if (s.className = "text-sm text-amber-700 dark:text-amber-300 mb-3", s.textContent = `Embedded blocks (${t.embeddedCount}) differ from legacy blocks (${t.legacyCount}). Embedded blocks are authoritative.`, e.appendChild(s), t.conflicts.length > 0) {
    const A = document.createElement("details");
    A.className = "text-sm";
    const C = document.createElement("summary");
    C.className = "cursor-pointer text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium", C.textContent = `View ${t.conflicts.length} field conflict${t.conflicts.length > 1 ? "s" : ""}`, A.appendChild(C);
    const L = document.createElement("ul");
    L.className = "mt-2 space-y-1 pl-4";
    for (const c of t.conflicts.slice(0, 10)) {
      const N = document.createElement("li");
      N.className = "text-amber-700 dark:text-amber-300", N.innerHTML = `<span class="font-mono text-xs">${c.blockType}[${c.blockIndex}].${c.field}</span>: <span class="text-green-600 dark:text-green-400">embedded</span> vs <span class="text-red-600 dark:text-red-400">legacy</span>`, L.appendChild(N);
    }
    if (t.conflicts.length > 10) {
      const c = document.createElement("li");
      c.className = "text-amber-600 dark:text-amber-400 italic", c.textContent = `...and ${t.conflicts.length - 10} more`, L.appendChild(c);
    }
    A.appendChild(L), e.appendChild(A);
  }
  const f = document.createElement("div");
  f.className = "mt-3 flex gap-2";
  const v = document.createElement("button");
  return v.type = "button", v.className = "text-xs px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40", v.textContent = "Dismiss", v.addEventListener("click", () => e.remove()), f.appendChild(v), e.appendChild(f), e;
}
function G(t, e) {
  if (t.querySelector("[data-block-conflict-report]")?.remove(), !e.hasConflicts) return;
  const r = xe(e), n = t.querySelector("[data-block-list]");
  n ? n.parentElement?.insertBefore(r, n) : t.insertBefore(r, t.firstChild);
}
function ve() {
  const t = document.createElement("div");
  return t.className = "block-drop-indicator", t.setAttribute("data-block-drop-indicator", "true"), t.setAttribute("aria-hidden", "true"), t;
}
function Q(t, e, r) {
  w(t);
  const n = ve();
  return e ? r === "before" ? e.parentElement?.insertBefore(n, e) : e.parentElement?.insertBefore(n, e.nextSibling) : t.appendChild(n), n;
}
function w(t) {
  t.querySelectorAll("[data-block-drop-indicator]").forEach((e) => e.remove());
}
function H(t, e, r) {
  const n = Array.from(t.querySelectorAll("[data-block-item]"));
  for (const o of n) {
    if (o === r) continue;
    const s = o.getBoundingClientRect();
    if (e >= s.top && e <= s.bottom) {
      const f = e < s.top + s.height / 2 ? "before" : "after";
      return { item: o, position: f };
    }
  }
  if (n.length > 0) {
    const o = n[n.length - 1];
    if (o !== r) {
      const s = o.getBoundingClientRect();
      if (e > s.bottom)
        return { item: o, position: "after" };
    }
  }
  return null;
}
function X(t, e) {
  const r = Array.from(t.querySelectorAll("[data-block-item]")), n = /* @__PURE__ */ new Map();
  r.forEach((o) => {
    n.set(o, o.getBoundingClientRect());
  }), t.offsetHeight, r.forEach((o) => {
    const s = n.get(o);
    if (!s) return;
    const f = o.getBoundingClientRect(), v = s.top - f.top;
    Math.abs(v) < 1 || o.animate(
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
function $(t, e) {
  const r = Array.from(t.querySelectorAll("[data-block-item]")), n = r.indexOf(e) + 1, o = r.length;
  return { label: e.querySelector("[data-block-header] span")?.textContent || e.dataset.blockType || "Block", position: n, total: o };
}
function Ae(t) {
  const e = {};
  return t.querySelectorAll("input, select, textarea").forEach((r) => {
    const n = r.getAttribute("data-block-field-name") || r.name;
    !n || r.dataset.blockIgnore === "true" || (r instanceof HTMLInputElement && r.type === "checkbox" ? e[n] = r.checked : r instanceof HTMLSelectElement && r.multiple ? e[n] = Array.from(r.selectedOptions).map((o) => o.value) : e[n] = r.value);
  }), e._type = t.dataset.blockType || "", e._schema = t.dataset.blockSchema || "", e;
}
function Ce(t, e, r = 50, n = 10) {
  const o = () => {
    if (!e.dragging) {
      e.scrollInterval && (clearInterval(e.scrollInterval), e.scrollInterval = null);
      return;
    }
    const s = t.getBoundingClientRect(), f = e.touchCurrentY;
    f < s.top + r ? t.scrollTop -= n : f > s.bottom - r && (t.scrollTop += n);
  };
  e.scrollInterval || (e.scrollInterval = window.setInterval(o, 16));
}
function Se(t, e) {
  const r = t.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (r.length === 0) {
    const n = document.createElement("input");
    n.type = "hidden", n.name = "_type", n.value = e, n.readOnly = !0, n.setAttribute("data-block-type-input", "true"), n.setAttribute("data-block-ignore", "true"), t.appendChild(n);
    return;
  }
  r.forEach((n) => {
    n.setAttribute("data-block-type-input", "true"), n.setAttribute("data-block-ignore", "true"), n instanceof HTMLInputElement ? (n.value = e, n.readOnly = !0) : n instanceof HTMLSelectElement ? (Array.from(n.options).forEach((s) => {
      s.selected = s.value === e;
    }), n.disabled = !0) : (n.value = e, n.readOnly = !0);
    const o = n.closest("[data-component]");
    o && o.classList.add("hidden");
  });
}
function Le(t, e) {
  const r = t.querySelectorAll('[name="_schema"], [data-block-schema-input]');
  if (r.length === 0) {
    const n = document.createElement("input");
    n.type = "hidden", n.name = "_schema", n.value = e, n.setAttribute("data-block-schema-input", "true"), n.setAttribute("data-block-ignore", "true"), t.appendChild(n);
    return;
  }
  r.forEach((n) => {
    n.setAttribute("data-block-schema-input", "true"), n.setAttribute("data-block-ignore", "true"), n.value = e, n.readOnly = !0;
    const o = n.closest("[data-component]");
    o && o.classList.add("hidden");
  });
}
function Be(t) {
  const e = se(t);
  if (!e) return;
  const r = Z(t), n = te(t, r), o = t.dataset.blockField || e.output.name, s = ee(t.dataset.blockSortable), f = r.sortable ?? s ?? !1, v = r.allowDrag ?? f, A = r.addLabel || e.addButton?.dataset.blockAddLabel || "Add block", C = r.emptyLabel || e.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.", L = r.validateOnInput ?? !0;
  e.addButton && (e.addButton.textContent = A), e.emptyState && (e.emptyState.textContent = C);
  const c = e.list, N = e.output, R = () => {
    const a = Array.from(c.querySelectorAll("[data-block-item]"));
    let d = !1;
    const u = a.map((m) => {
      const l = {}, g = /* @__PURE__ */ new Map();
      m.querySelectorAll("input, select, textarea").forEach((p) => {
        if (p.dataset.blockIgnore === "true" || p.hasAttribute("data-block-ignore")) return;
        const b = p.getAttribute("data-block-field-name") || p.name || "";
        b && (g.has(b) || g.set(b, []), g.get(b).push(p));
      }), g.forEach((p, b) => {
        const E = fe(p);
        E !== void 0 && ue(l, b, E);
      });
      const k = m.dataset.blockType || l._type || "";
      k && (l._type = k);
      const i = m.dataset.blockSchema || l._schema;
      if (i)
        l._schema = i;
      else {
        const p = n.get(k);
        p?.schemaVersion && (l._schema = p.schemaVersion);
      }
      if (L) {
        const p = n.get(k);
        if (p) {
          const b = ge(m, p);
          he(m, b), b.length > 0 && (d = !0);
        }
      }
      return l;
    });
    N.value = JSON.stringify(u), t.dataset.blockEditorValid = d ? "false" : "true";
  }, re = () => {
    Array.from(c.querySelectorAll("[data-block-item]")).forEach((d, u) => {
      d.querySelectorAll("input, select, textarea").forEach((m) => {
        if (m.dataset.blockIgnore === "true" || m.hasAttribute("data-block-ignore")) return;
        const l = m.getAttribute("data-block-field-name") || m.name;
        l && (m.hasAttribute("data-block-field-name") || m.setAttribute("data-block-field-name", l), m.name = ie(o, u, l));
      });
    });
  }, oe = () => {
    if (!e.emptyState) return;
    const a = c.querySelector("[data-block-item]");
    e.emptyState.classList.toggle("hidden", !!a);
  }, S = () => {
    re(), R(), oe();
  }, Y = t.closest("form");
  Y && Y.addEventListener("submit", () => {
    R();
  });
  const ae = (a, d) => {
    a.querySelectorAll("input, select, textarea").forEach((u) => {
      const m = u.getAttribute("data-block-field-name") || u.name;
      if (!m) return;
      const l = de(d, m);
      l !== void 0 && me(u, l);
    });
  }, _ = (a, d) => {
    const u = be(a, d, r.schemaVersionPattern), m = document.createElement("div");
    m.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", m.setAttribute("data-block-item", "true"), m.dataset.blockType = a.type, f && m.setAttribute("draggable", "true");
    const l = document.createElement("div");
    l.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", l.setAttribute("data-block-header", "true");
    const g = document.createElement("div");
    g.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const k = document.createElement("span");
    k.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", k.textContent = a.icon || a.label.slice(0, 1).toUpperCase();
    const i = document.createElement("span");
    i.textContent = a.label;
    const p = document.createElement("span");
    p.className = "text-xs text-gray-500 dark:text-gray-400", p.textContent = a.type;
    const b = document.createElement("span");
    b.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", b.textContent = u, b.setAttribute("data-block-schema-badge", "true"), g.appendChild(k), g.appendChild(i), g.appendChild(p), g.appendChild(b);
    const E = document.createElement("div");
    if (E.className = "flex items-center gap-2", f) {
      const q = document.createElement("button");
      q.type = "button", q.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", q.textContent = "Up", q.setAttribute("data-block-move-up", "true");
      const D = document.createElement("button");
      D.type = "button", D.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", D.textContent = "Down", D.setAttribute("data-block-move-down", "true"), E.appendChild(q), E.appendChild(D);
    }
    const h = document.createElement("button");
    h.type = "button", h.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", h.textContent = "Collapse", h.setAttribute("data-block-collapse", "true");
    const x = document.createElement("button");
    if (x.type = "button", x.className = "text-xs text-red-600 hover:text-red-700", x.textContent = "Remove", x.setAttribute("data-block-remove", "true"), E.appendChild(h), E.appendChild(x), f) {
      const q = document.createElement("span");
      q.className = "text-xs text-gray-400 cursor-move", q.textContent = "Drag", q.setAttribute("data-block-drag-handle", "true"), E.appendChild(q);
    }
    l.appendChild(g), l.appendChild(E);
    const y = document.createElement("div");
    y.className = "p-4 space-y-4", y.setAttribute("data-block-body", "true");
    const T = a.template.content.cloneNode(!0);
    y.appendChild(T), m.appendChild(l), m.appendChild(y), Se(m, a.type), Le(m, u), m.dataset.blockSchema = u, d && ae(m, d);
    const I = a.requiredFields || [];
    return I.length > 0 && ye(y, I), (a.collapsed ?? !1) && (y.classList.add("hidden"), m.dataset.blockCollapsed = "true", h.textContent = "Expand"), m;
  }, j = (a, d) => {
    const u = n.get(a);
    if (!u) return;
    const m = _(u, d);
    c.appendChild(m), S();
  }, P = e.addButton, M = e.addSelect;
  if (P && M && P.addEventListener("click", () => {
    const a = M.value.trim();
    a && (j(a), M.value = "");
  }), t.addEventListener("click", (a) => {
    const d = a.target;
    if (!(d instanceof HTMLElement)) return;
    const u = d.closest("[data-block-item]");
    if (u) {
      if (d.closest("[data-block-remove]")) {
        u.remove(), S();
        return;
      }
      if (d.closest("[data-block-collapse]")) {
        const m = u.querySelector("[data-block-body]");
        if (m) {
          const l = m.classList.toggle("hidden");
          u.dataset.blockCollapsed = l ? "true" : "false";
          const g = d.closest("[data-block-collapse]");
          g && (g.textContent = l ? "Expand" : "Collapse");
        }
        return;
      }
      if (d.closest("[data-block-move-up]")) {
        const m = u.previousElementSibling;
        m && c.insertBefore(u, m), S();
        return;
      }
      if (d.closest("[data-block-move-down]")) {
        const m = u.nextElementSibling;
        m && c.insertBefore(m, u), S();
        return;
      }
    }
  }), t.addEventListener("input", (a) => {
    const d = a.target;
    !(d instanceof HTMLElement) || !d.closest("[data-block-item]") || S();
  }), t.addEventListener("change", (a) => {
    const d = a.target;
    !(d instanceof HTMLElement) || !d.closest("[data-block-item]") || S();
  }), f && v) {
    const a = r.dragFromHeader ?? !0, d = r.enableTouch ?? !0, u = r.enableAnimations ?? !0, m = r.enableCrossEditor ?? !1, l = {
      dragging: null,
      touchStartY: 0,
      touchCurrentY: 0,
      scrollInterval: null,
      originalIndex: -1
    }, g = (i) => i.closest("[data-block-drag-handle]") ? !0 : a && i.closest("[data-block-header]") ? !i.closest("button, input, select, textarea") : !1, k = (i) => Array.from(c.querySelectorAll("[data-block-item]")).indexOf(i);
    if (c.addEventListener("dragstart", (i) => {
      const p = i.target;
      if (!(p instanceof HTMLElement)) return;
      if (!g(p)) {
        i.preventDefault();
        return;
      }
      const b = p.closest("[data-block-item]");
      if (!b) return;
      if (l.dragging = b, l.originalIndex = k(b), b.classList.add("block-item--dragging"), i.dataTransfer) {
        if (i.dataTransfer.effectAllowed = "move", i.dataTransfer.setData("text/plain", "block"), m) {
          const x = Ae(b);
          i.dataTransfer.setData("application/x-block", JSON.stringify(x));
        }
        const h = b.cloneNode(!0);
        h.style.cssText = "position: absolute; top: -9999px; left: -9999px; opacity: 0.8; transform: rotate(2deg);", document.body.appendChild(h), i.dataTransfer.setDragImage(h, 20, 20), requestAnimationFrame(() => h.remove());
      }
      const E = $(c, b);
      B(`Dragging ${E.label} from position ${E.position} of ${E.total}. Use arrow keys to move.`);
    }), c.addEventListener("dragover", (i) => {
      i.preventDefault(), i.dataTransfer && (i.dataTransfer.dropEffect = "move");
      const p = i.clientY, b = H(c, p, l.dragging || void 0);
      b ? Q(c, b.item, b.position) : w(c);
    }), c.addEventListener("dragenter", (i) => {
      i.preventDefault();
    }), c.addEventListener("dragleave", (i) => {
      const p = i.relatedTarget;
      (!p || !c.contains(p)) && w(c);
    }), c.addEventListener("drop", (i) => {
      i.preventDefault(), w(c);
      const p = i.clientY, b = H(c, p, l.dragging || void 0);
      if (!l.dragging && m && i.dataTransfer) {
        const h = i.dataTransfer.getData("application/x-block");
        if (h)
          try {
            const x = JSON.parse(h), y = x._type;
            if (y && n.has(y)) {
              const T = n.get(y), I = _(T, x);
              b ? b.position === "before" ? c.insertBefore(I, b.item) : c.insertBefore(I, b.item.nextSibling) : c.appendChild(I), S(), B(`Block ${y} added from another editor`);
            }
          } catch {
          }
        return;
      }
      if (!l.dragging) return;
      if (b && (b.position === "before" ? c.insertBefore(l.dragging, b.item) : c.insertBefore(l.dragging, b.item.nextSibling)), u && X(c, l.dragging), k(l.dragging) !== l.originalIndex) {
        const h = $(c, l.dragging);
        B(`${h.label} moved to position ${h.position} of ${h.total}`);
      }
    }), c.addEventListener("dragend", () => {
      w(c), l.dragging && (l.dragging.classList.remove("block-item--dragging"), l.dragging = null), l.originalIndex = -1, S();
    }), d) {
      let i = null, p = null, b = !1;
      const E = 10;
      c.addEventListener("touchstart", (h) => {
        const x = h.touches[0], y = x.target;
        if (!g(y)) return;
        const T = y.closest("[data-block-item]");
        T && (l.touchStartY = x.clientY, l.touchCurrentY = x.clientY, i = T, b = !1);
      }, { passive: !0 }), c.addEventListener("touchmove", (h) => {
        if (!i) return;
        const x = h.touches[0];
        if (l.touchCurrentY = x.clientY, !b) {
          if (Math.abs(x.clientY - l.touchStartY) < E) return;
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
          `, document.body.appendChild(p), i.classList.add("block-item--placeholder"), l.dragging = i, l.originalIndex = k(i);
          const I = $(c, i);
          B(`Dragging ${I.label}. Move finger to reposition.`);
        }
        h.preventDefault(), p && (p.style.top = `${x.clientY - p.offsetHeight / 2}px`);
        const y = H(c, x.clientY, i || void 0);
        y ? Q(c, y.item, y.position) : w(c), Ce(c, l);
      }, { passive: !1 }), c.addEventListener("touchend", () => {
        if (l.scrollInterval && (clearInterval(l.scrollInterval), l.scrollInterval = null), w(c), p && (p.remove(), p = null), i && b) {
          i.classList.remove("block-item--placeholder");
          const h = H(c, l.touchCurrentY, i);
          if (h && (h.position === "before" ? c.insertBefore(i, h.item) : c.insertBefore(i, h.item.nextSibling)), u && X(c, i), k(i) !== l.originalIndex) {
            const y = $(c, i);
            B(`${y.label} moved to position ${y.position} of ${y.total}`);
          }
          S();
        }
        i = null, b = !1, l.dragging = null, l.originalIndex = -1;
      }), c.addEventListener("touchcancel", () => {
        l.scrollInterval && (clearInterval(l.scrollInterval), l.scrollInterval = null), w(c), p && (p.remove(), p = null), i && i.classList.remove("block-item--placeholder"), i = null, b = !1, l.dragging = null, l.originalIndex = -1;
      });
    }
  }
  if (e.addSelect) {
    const a = document.createElement("option");
    a.value = "", a.textContent = "Select block type", e.addSelect.appendChild(a), n.forEach((d) => {
      const u = document.createElement("option");
      u.value = d.type, u.textContent = d.label, e.addSelect?.appendChild(u);
    }), e.addSelect.value = "";
  }
  t.addEventListener("keydown", (a) => {
    const d = a.target;
    if (!(d instanceof HTMLElement)) return;
    const u = d.closest("[data-block-item]");
    if (!u) return;
    const m = d.closest("[data-block-header]");
    if (m)
      switch (a.key) {
        case "Delete":
        case "Backspace":
          a.shiftKey && (a.preventDefault(), u.remove(), S(), c.querySelector("[data-block-item] [data-block-header]")?.focus());
          break;
        case "ArrowUp":
          if (a.altKey && f) {
            a.preventDefault();
            const g = u.previousElementSibling;
            if (g) {
              c.insertBefore(u, g), S(), u.querySelector("[data-block-header]")?.focus();
              const k = $(c, u);
              B(`${k.label} moved to position ${k.position} of ${k.total}`);
            } else
              B("Already at the top");
          } else if (!a.altKey) {
            a.preventDefault();
            const k = u.previousElementSibling?.querySelector("[data-block-header]");
            k ? k.focus() : B("At the first block");
          }
          break;
        case "ArrowDown":
          if (a.altKey && f) {
            a.preventDefault();
            const g = u.nextElementSibling;
            if (g) {
              c.insertBefore(g, u), S(), u.querySelector("[data-block-header]")?.focus();
              const k = $(c, u);
              B(`${k.label} moved to position ${k.position} of ${k.total}`);
            } else
              B("Already at the bottom");
          } else if (!a.altKey) {
            a.preventDefault();
            const k = u.nextElementSibling?.querySelector("[data-block-header]");
            k ? k.focus() : B("At the last block");
          }
          break;
        case "Enter":
        case " ":
          d.matches("[data-block-collapse]") || d.matches("[data-block-remove]") || d.matches("[data-block-move-up]") || d.matches("[data-block-move-down]") ? (a.preventDefault(), d.click()) : m && !d.matches("button") && (a.preventDefault(), u.querySelector("[data-block-collapse]")?.click());
          break;
        case "Escape":
          const l = u.querySelector("[data-block-body]");
          if (l && !l.classList.contains("hidden")) {
            a.preventDefault(), l.classList.add("hidden"), u.dataset.blockCollapsed = "true";
            const g = u.querySelector("[data-block-collapse]");
            g && (g.textContent = "Expand");
          }
          break;
      }
  });
  const ce = () => {
    c.querySelectorAll("[data-block-header]").forEach((a) => {
      a.hasAttribute("tabindex") || (a.setAttribute("tabindex", "0"), a.setAttribute("role", "button"), a.setAttribute("aria-label", "Block header - Press Enter to collapse/expand, Shift+Delete to remove"));
    });
  };
  new MutationObserver(() => {
    ce();
  }).observe(c, { childList: !0, subtree: !0 });
  const U = N.value?.trim();
  let V = [];
  if (U)
    try {
      const a = JSON.parse(U);
      Array.isArray(a) && (V = a, a.forEach((d) => {
        const u = typeof d == "object" && d ? d._type : "";
        u && n.has(u) && j(u, d);
      }));
    } catch {
    }
  const J = r.showConflicts ?? !0;
  if (J && r.legacyBlocks && Array.isArray(r.legacyBlocks)) {
    const a = W(V, r.legacyBlocks);
    a.hasConflicts && G(t, a);
  }
  const K = t.dataset.blockLegacy;
  if (J && K)
    try {
      const a = JSON.parse(K);
      if (Array.isArray(a)) {
        const d = W(V, a);
        d.hasConflicts && G(t, d);
      }
    } catch {
    }
  S();
}
function Ne(t, e) {
  const r = document.createElement("template");
  r.setAttribute("data-block-template", ""), r.dataset.blockType = e.type, r.dataset.blockLabel = e.label, e.icon && (r.dataset.blockIcon = e.icon), e.schemaVersion && (r.dataset.blockSchemaVersion = e.schemaVersion), e.requiredFields && e.requiredFields.length > 0 && (r.dataset.blockRequiredFields = e.requiredFields.join(",")), r.innerHTML = e.html, t.appendChild(r);
}
function $e(t) {
  if (!t) return;
  const e = Z(t);
  te(t, e);
}
function qe(t = document) {
  Array.from(t.querySelectorAll('[data-component="block"], [data-block-editor]')).filter((r) => r.dataset.blockLibraryPicker !== "true" && r.dataset.blockInit !== "manual").forEach((r) => Be(r));
}
function Ie(t) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t, { once: !0 }) : t();
}
Ie(() => qe());
export {
  Be as initBlockEditor,
  qe as initBlockEditors,
  ye as markRequiredFields,
  $e as refreshBlockTemplateRegistry,
  Ne as registerBlockTemplate
};
//# sourceMappingURL=block_editor.js.map
