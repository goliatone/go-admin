function ne(t) {
  if (!t) return {};
  try {
    const e = JSON.parse(t);
    if (e && typeof e == "object")
      return e;
  } catch {
  }
  return {};
}
function oe(t) {
  const e = t.closest("[data-component-config]");
  return ne(e?.getAttribute("data-component-config") ?? null);
}
function Q(t) {
  if (t == null) return;
  const e = t.trim().toLowerCase();
  if (e === "true") return !0;
  if (e === "false") return !1;
}
function re(t) {
  const e = t.querySelector("[data-block-list]"), o = t.querySelector("input[data-block-output]");
  if (!e || !o) return null;
  const n = t.querySelector("[data-block-add-select]"), r = t.querySelector("[data-block-add]"), d = t.querySelector("[data-block-empty]");
  return { root: t, list: e, output: o, addSelect: n ?? void 0, addButton: r ?? void 0, emptyState: d ?? void 0 };
}
function V(t) {
  return t.replace(/\]/g, "").split(/\.|\[/).map((o) => o.trim()).filter((o) => o.length > 0);
}
function ae(t, e, o) {
  if (!t) return o;
  const n = V(o);
  let r = `${t}[${e}]`;
  for (const d of n)
    r += `[${d}]`;
  return r;
}
function ce(t, e) {
  if (!t || !e) return;
  const o = V(e);
  let n = t;
  for (const r of o) {
    if (n == null) return;
    n = n[r];
  }
  return n;
}
function le(t, e, o) {
  if (!e) return;
  const n = V(e);
  if (n.length === 0) return;
  let r = t;
  n.forEach((d, p) => {
    const y = p === n.length - 1, A = n[p + 1], C = A !== void 0 && /^\d+$/.test(A);
    if (y) {
      if (d === "") return;
      r[d] = o;
      return;
    }
    (r[d] == null || typeof r[d] != "object") && (r[d] = C ? [] : {}), r = r[d];
  });
}
function se(t) {
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
function ie(t, e) {
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
function de(t, e) {
  const o = /* @__PURE__ */ new Map();
  return t.querySelectorAll("template[data-block-template]").forEach((n) => {
    const r = n.dataset.blockType?.trim();
    if (!r) return;
    const d = n.dataset.blockLabel?.trim() || r, p = n.dataset.blockIcon?.trim(), y = Q(n.dataset.blockCollapsed), A = n.dataset.blockSchemaVersion?.trim() || M(r, e.schemaVersionPattern), C = n.dataset.blockRequiredFields?.trim(), B = C ? C.split(",").map((c) => c.trim()).filter(Boolean) : e.requiredFields?.[r] || [];
    o.set(r, {
      type: r,
      label: d,
      icon: p || void 0,
      collapsed: y,
      schemaVersion: A,
      requiredFields: B,
      template: n
    });
  }), o;
}
function M(t, e) {
  return e ? e.replace("{type}", t) : `${t}@v1.0.0`;
}
function ue(t, e) {
  const o = [], n = e.requiredFields || [];
  for (const r of n) {
    const d = t.querySelector(
      `[name="${r}"], [data-block-field-name="${r}"]`
    );
    if (!d) continue;
    let p = !1;
    if (d instanceof HTMLInputElement)
      if (d.type === "checkbox")
        p = !d.checked;
      else if (d.type === "radio") {
        const y = t.querySelectorAll(`[name="${d.name}"]`);
        p = !Array.from(y).some((A) => A.checked);
      } else
        p = !d.value.trim();
    else d instanceof HTMLSelectElement ? p = !d.value || d.value === "" : p = !d.value.trim();
    p && o.push({
      field: r,
      message: `${r} is required`
    });
  }
  return o;
}
function fe(t, e) {
  if (me(t), e.length === 0) return;
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
      const d = r.closest("[data-component]");
      if (d) {
        const p = document.createElement("p");
        p.className = "block-field-error text-xs text-red-600 mt-1 dark:text-red-400", p.textContent = n.message, p.setAttribute("data-block-field-error", "true"), d.appendChild(p);
      }
    }
  }
}
function me(t) {
  t.classList.remove("block-item--invalid"), t.dataset.blockValid = "true", t.querySelectorAll("[data-block-error-badge]").forEach((e) => e.remove()), t.querySelectorAll("[data-block-field-error]").forEach((e) => e.remove()), t.querySelectorAll(".border-red-500").forEach((e) => {
    e.classList.remove("border-red-500", "focus:ring-red-500");
  });
}
function P(t, e) {
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
    const d = t[r] || {}, p = e[r] || {}, y = d._type || p._type || `block_${r}`, A = /* @__PURE__ */ new Set([...Object.keys(d), ...Object.keys(p)]);
    for (const C of A) {
      if (C.startsWith("_")) continue;
      const B = d[C], c = p[C];
      O(B, c) || o.push({
        blockIndex: r,
        blockType: y,
        field: C,
        embeddedValue: B,
        legacyValue: c
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
function O(t, e) {
  if (t === e) return !0;
  if (t == null || e == null) return t === e;
  if (typeof t != typeof e) return !1;
  if (Array.isArray(t) && Array.isArray(e))
    return t.length !== e.length ? !1 : t.every((o, n) => O(o, e[n]));
  if (typeof t == "object") {
    const o = Object.keys(t), n = Object.keys(e);
    return o.length !== n.length ? !1 : o.every((r) => O(t[r], e[r]));
  }
  return !1;
}
function pe(t) {
  const e = document.createElement("div");
  e.className = "block-conflict-report border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4 dark:bg-amber-900/20 dark:border-amber-700", e.setAttribute("data-block-conflict-report", "true");
  const o = document.createElement("div");
  o.className = "flex items-center gap-2 mb-3";
  const n = document.createElement("span");
  n.className = "text-amber-600 dark:text-amber-400", n.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  const r = document.createElement("span");
  r.className = "font-medium text-amber-800 dark:text-amber-200", r.textContent = "Block Conflicts Detected", o.appendChild(n), o.appendChild(r), e.appendChild(o);
  const d = document.createElement("p");
  if (d.className = "text-sm text-amber-700 dark:text-amber-300 mb-3", d.textContent = `Embedded blocks (${t.embeddedCount}) differ from legacy blocks (${t.legacyCount}). Embedded blocks are authoritative.`, e.appendChild(d), t.conflicts.length > 0) {
    const A = document.createElement("details");
    A.className = "text-sm";
    const C = document.createElement("summary");
    C.className = "cursor-pointer text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium", C.textContent = `View ${t.conflicts.length} field conflict${t.conflicts.length > 1 ? "s" : ""}`, A.appendChild(C);
    const B = document.createElement("ul");
    B.className = "mt-2 space-y-1 pl-4";
    for (const c of t.conflicts.slice(0, 10)) {
      const T = document.createElement("li");
      T.className = "text-amber-700 dark:text-amber-300", T.innerHTML = `<span class="font-mono text-xs">${c.blockType}[${c.blockIndex}].${c.field}</span>: <span class="text-green-600 dark:text-green-400">embedded</span> vs <span class="text-red-600 dark:text-red-400">legacy</span>`, B.appendChild(T);
    }
    if (t.conflicts.length > 10) {
      const c = document.createElement("li");
      c.className = "text-amber-600 dark:text-amber-400 italic", c.textContent = `...and ${t.conflicts.length - 10} more`, B.appendChild(c);
    }
    A.appendChild(B), e.appendChild(A);
  }
  const p = document.createElement("div");
  p.className = "mt-3 flex gap-2";
  const y = document.createElement("button");
  return y.type = "button", y.className = "text-xs px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40", y.textContent = "Dismiss", y.addEventListener("click", () => e.remove()), p.appendChild(y), e.appendChild(p), e;
}
function z(t, e) {
  if (t.querySelector("[data-block-conflict-report]")?.remove(), !e.hasConflicts) return;
  const o = pe(e), n = t.querySelector("[data-block-list]");
  n ? n.parentElement?.insertBefore(o, n) : t.insertBefore(o, t.firstChild);
}
function be() {
  const t = document.createElement("div");
  return t.className = "block-drop-indicator", t.setAttribute("data-block-drop-indicator", "true"), t.setAttribute("aria-hidden", "true"), t;
}
function W(t, e, o) {
  q(t);
  const n = be();
  return e ? o === "before" ? e.parentElement?.insertBefore(n, e) : e.parentElement?.insertBefore(n, e.nextSibling) : t.appendChild(n), n;
}
function q(t) {
  t.querySelectorAll("[data-block-drop-indicator]").forEach((e) => e.remove());
}
function D(t, e, o) {
  const n = Array.from(t.querySelectorAll("[data-block-item]"));
  for (const r of n) {
    if (r === o) continue;
    const d = r.getBoundingClientRect();
    if (e >= d.top && e <= d.bottom) {
      const p = e < d.top + d.height / 2 ? "before" : "after";
      return { item: r, position: p };
    }
  }
  if (n.length > 0) {
    const r = n[n.length - 1];
    if (r !== o) {
      const d = r.getBoundingClientRect();
      if (e > d.bottom)
        return { item: r, position: "after" };
    }
  }
  return null;
}
function G(t, e) {
  const o = Array.from(t.querySelectorAll("[data-block-item]")), n = /* @__PURE__ */ new Map();
  o.forEach((r) => {
    n.set(r, r.getBoundingClientRect());
  }), t.offsetHeight, o.forEach((r) => {
    const d = n.get(r);
    if (!d) return;
    const p = r.getBoundingClientRect(), y = d.top - p.top;
    Math.abs(y) < 1 || r.animate(
      [
        { transform: `translateY(${y}px)` },
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
function ge() {
  const t = document.getElementById("block-editor-live-region");
  if (t) return t;
  const e = document.createElement("div");
  return e.id = "block-editor-live-region", e.setAttribute("aria-live", "polite"), e.setAttribute("aria-atomic", "true"), e.className = "sr-only", e.style.cssText = "position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;", document.body.appendChild(e), e;
}
function w(t) {
  const e = ge();
  e.textContent = "", requestAnimationFrame(() => {
    e.textContent = t;
  });
}
function N(t, e) {
  const o = Array.from(t.querySelectorAll("[data-block-item]")), n = o.indexOf(e) + 1, r = o.length;
  return { label: e.querySelector("[data-block-header] span")?.textContent || e.dataset.blockType || "Block", position: n, total: r };
}
function he(t) {
  const e = {};
  return t.querySelectorAll("input, select, textarea").forEach((o) => {
    const n = o.getAttribute("data-block-field-name") || o.name;
    !n || o.dataset.blockIgnore === "true" || (o instanceof HTMLInputElement && o.type === "checkbox" ? e[n] = o.checked : o instanceof HTMLSelectElement && o.multiple ? e[n] = Array.from(o.selectedOptions).map((r) => r.value) : e[n] = o.value);
  }), e._type = t.dataset.blockType || "", e._schema = t.dataset.blockSchema || "", e;
}
function ke(t, e, o = 50, n = 10) {
  const r = () => {
    if (!e.dragging) {
      e.scrollInterval && (clearInterval(e.scrollInterval), e.scrollInterval = null);
      return;
    }
    const d = t.getBoundingClientRect(), p = e.touchCurrentY;
    p < d.top + o ? t.scrollTop -= n : p > d.bottom - o && (t.scrollTop += n);
  };
  e.scrollInterval || (e.scrollInterval = window.setInterval(r, 16));
}
function ye(t, e) {
  const o = t.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (o.length === 0) {
    const n = document.createElement("input");
    n.type = "hidden", n.name = "_type", n.value = e, n.setAttribute("data-block-type-input", "true"), n.setAttribute("data-block-ignore", "true"), t.appendChild(n);
    return;
  }
  o.forEach((n) => {
    n.setAttribute("data-block-type-input", "true"), n.setAttribute("data-block-ignore", "true"), n instanceof HTMLInputElement ? (n.value = e, n.readOnly = !0) : n instanceof HTMLSelectElement ? (Array.from(n.options).forEach((d) => {
      d.selected = d.value === e;
    }), n.disabled = !0) : (n.value = e, n.readOnly = !0);
    const r = n.closest("[data-component]");
    r && r.classList.add("hidden");
  });
}
function xe(t, e) {
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
function ve(t) {
  const e = re(t);
  if (!e) return;
  const o = oe(t), n = de(t, o), r = t.dataset.blockField || e.output.name, d = Q(t.dataset.blockSortable), p = o.sortable ?? d ?? !1, y = o.allowDrag ?? p, A = o.addLabel || e.addButton?.dataset.blockAddLabel || "Add block", C = o.emptyLabel || e.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.", B = o.validateOnInput ?? !0;
  e.addButton && (e.addButton.textContent = A), e.emptyState && (e.emptyState.textContent = C);
  const c = e.list, T = e.output, Y = () => {
    const a = Array.from(c.querySelectorAll("[data-block-item]"));
    let u = !1;
    const s = a.map((b) => {
      const l = {}, g = /* @__PURE__ */ new Map();
      b.querySelectorAll("input, select, textarea").forEach((f) => {
        if (f.dataset.blockIgnore === "true" || f.hasAttribute("data-block-ignore")) return;
        const m = f.getAttribute("data-block-field-name") || f.name || "";
        m && (g.has(m) || g.set(m, []), g.get(m).push(f));
      }), g.forEach((f, m) => {
        const S = se(f);
        S !== void 0 && le(l, m, S);
      });
      const k = b.dataset.blockType || l._type || "";
      k && (l._type = k);
      const i = b.dataset.blockSchema || l._schema;
      if (i)
        l._schema = i;
      else {
        const f = n.get(k);
        f?.schemaVersion && (l._schema = f.schemaVersion);
      }
      if (B) {
        const f = n.get(k);
        if (f) {
          const m = ue(b, f);
          fe(b, m), m.length > 0 && (u = !0);
        }
      }
      return l;
    });
    T.value = JSON.stringify(s), t.dataset.blockEditorValid = u ? "false" : "true";
  }, X = () => {
    Array.from(c.querySelectorAll("[data-block-item]")).forEach((u, s) => {
      u.querySelectorAll("input, select, textarea").forEach((b) => {
        if (b.dataset.blockIgnore === "true" || b.hasAttribute("data-block-ignore")) return;
        const l = b.getAttribute("data-block-field-name") || b.name;
        l && (b.hasAttribute("data-block-field-name") || b.setAttribute("data-block-field-name", l), b.name = ae(r, s, l));
      });
    });
  }, Z = () => {
    if (!e.emptyState) return;
    const a = c.querySelector("[data-block-item]");
    e.emptyState.classList.toggle("hidden", !!a);
  }, L = () => {
    X(), Y(), Z();
  }, R = t.closest("form");
  R && R.addEventListener("submit", () => {
    Y();
  });
  const ee = (a, u) => {
    a.querySelectorAll("input, select, textarea").forEach((s) => {
      const b = s.getAttribute("data-block-field-name") || s.name;
      if (!b) return;
      const l = ce(u, b);
      l !== void 0 && ie(s, l);
    });
  }, _ = (a, u) => {
    const s = document.createElement("div");
    s.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", s.setAttribute("data-block-item", "true"), s.dataset.blockType = a.type, p && s.setAttribute("draggable", "true");
    const b = document.createElement("div");
    b.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", b.setAttribute("data-block-header", "true");
    const l = document.createElement("div");
    l.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const g = document.createElement("span");
    g.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", g.textContent = a.icon || a.label.slice(0, 1).toUpperCase();
    const k = document.createElement("span");
    k.textContent = a.label;
    const i = document.createElement("span");
    i.className = "text-xs text-gray-500 dark:text-gray-400", i.textContent = a.type, l.appendChild(g), l.appendChild(k), l.appendChild(i);
    const f = document.createElement("div");
    if (f.className = "flex items-center gap-2", p) {
      const E = document.createElement("button");
      E.type = "button", E.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", E.textContent = "Up", E.setAttribute("data-block-move-up", "true");
      const I = document.createElement("button");
      I.type = "button", I.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", I.textContent = "Down", I.setAttribute("data-block-move-down", "true"), f.appendChild(E), f.appendChild(I);
    }
    const m = document.createElement("button");
    m.type = "button", m.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", m.textContent = "Collapse", m.setAttribute("data-block-collapse", "true");
    const S = document.createElement("button");
    if (S.type = "button", S.className = "text-xs text-red-600 hover:text-red-700", S.textContent = "Remove", S.setAttribute("data-block-remove", "true"), f.appendChild(m), f.appendChild(S), p) {
      const E = document.createElement("span");
      E.className = "text-xs text-gray-400 cursor-move", E.textContent = "Drag", E.setAttribute("data-block-drag-handle", "true"), f.appendChild(E);
    }
    b.appendChild(l), b.appendChild(f);
    const h = document.createElement("div");
    h.className = "p-4 space-y-4", h.setAttribute("data-block-body", "true");
    const x = a.template.content.cloneNode(!0);
    return h.appendChild(x), s.appendChild(b), s.appendChild(h), ye(s, a.type), xe(s, a.schemaVersion || M(a.type)), s.dataset.blockSchema = a.schemaVersion || M(a.type), u && ee(s, u), (a.collapsed ?? !1) && (h.classList.add("hidden"), s.dataset.blockCollapsed = "true", m.textContent = "Expand"), s;
  }, F = (a, u) => {
    const s = n.get(a);
    if (!s) return;
    const b = _(s, u);
    c.appendChild(b), L();
  }, j = e.addButton, $ = e.addSelect;
  if (j && $ && j.addEventListener("click", () => {
    const a = $.value.trim();
    a && (F(a), $.value = "");
  }), t.addEventListener("click", (a) => {
    const u = a.target;
    if (!(u instanceof HTMLElement)) return;
    const s = u.closest("[data-block-item]");
    if (s) {
      if (u.closest("[data-block-remove]")) {
        s.remove(), L();
        return;
      }
      if (u.closest("[data-block-collapse]")) {
        const b = s.querySelector("[data-block-body]");
        if (b) {
          const l = b.classList.toggle("hidden");
          s.dataset.blockCollapsed = l ? "true" : "false";
          const g = u.closest("[data-block-collapse]");
          g && (g.textContent = l ? "Expand" : "Collapse");
        }
        return;
      }
      if (u.closest("[data-block-move-up]")) {
        const b = s.previousElementSibling;
        b && c.insertBefore(s, b), L();
        return;
      }
      if (u.closest("[data-block-move-down]")) {
        const b = s.nextElementSibling;
        b && c.insertBefore(b, s), L();
        return;
      }
    }
  }), t.addEventListener("input", (a) => {
    const u = a.target;
    !(u instanceof HTMLElement) || !u.closest("[data-block-item]") || L();
  }), t.addEventListener("change", (a) => {
    const u = a.target;
    !(u instanceof HTMLElement) || !u.closest("[data-block-item]") || L();
  }), p && y) {
    const a = o.dragFromHeader ?? !0, u = o.enableTouch ?? !0, s = o.enableAnimations ?? !0, b = o.enableCrossEditor ?? !1, l = {
      dragging: null,
      touchStartY: 0,
      touchCurrentY: 0,
      scrollInterval: null,
      originalIndex: -1
    }, g = (i) => i.closest("[data-block-drag-handle]") ? !0 : a && i.closest("[data-block-header]") ? !i.closest("button, input, select, textarea") : !1, k = (i) => Array.from(c.querySelectorAll("[data-block-item]")).indexOf(i);
    if (c.addEventListener("dragstart", (i) => {
      const f = i.target;
      if (!(f instanceof HTMLElement)) return;
      if (!g(f)) {
        i.preventDefault();
        return;
      }
      const m = f.closest("[data-block-item]");
      if (!m) return;
      if (l.dragging = m, l.originalIndex = k(m), m.classList.add("block-item--dragging"), i.dataTransfer) {
        if (i.dataTransfer.effectAllowed = "move", i.dataTransfer.setData("text/plain", "block"), b) {
          const x = he(m);
          i.dataTransfer.setData("application/x-block", JSON.stringify(x));
        }
        const h = m.cloneNode(!0);
        h.style.cssText = "position: absolute; top: -9999px; left: -9999px; opacity: 0.8; transform: rotate(2deg);", document.body.appendChild(h), i.dataTransfer.setDragImage(h, 20, 20), requestAnimationFrame(() => h.remove());
      }
      const S = N(c, m);
      w(`Dragging ${S.label} from position ${S.position} of ${S.total}. Use arrow keys to move.`);
    }), c.addEventListener("dragover", (i) => {
      i.preventDefault(), i.dataTransfer && (i.dataTransfer.dropEffect = "move");
      const f = i.clientY, m = D(c, f, l.dragging || void 0);
      m ? W(c, m.item, m.position) : q(c);
    }), c.addEventListener("dragenter", (i) => {
      i.preventDefault();
    }), c.addEventListener("dragleave", (i) => {
      const f = i.relatedTarget;
      (!f || !c.contains(f)) && q(c);
    }), c.addEventListener("drop", (i) => {
      i.preventDefault(), q(c);
      const f = i.clientY, m = D(c, f, l.dragging || void 0);
      if (!l.dragging && b && i.dataTransfer) {
        const h = i.dataTransfer.getData("application/x-block");
        if (h)
          try {
            const x = JSON.parse(h), v = x._type;
            if (v && n.has(v)) {
              const E = n.get(v), I = _(E, x);
              m ? m.position === "before" ? c.insertBefore(I, m.item) : c.insertBefore(I, m.item.nextSibling) : c.appendChild(I), L(), w(`Block ${v} added from another editor`);
            }
          } catch {
          }
        return;
      }
      if (!l.dragging) return;
      if (m && (m.position === "before" ? c.insertBefore(l.dragging, m.item) : c.insertBefore(l.dragging, m.item.nextSibling)), s && G(c, l.dragging), k(l.dragging) !== l.originalIndex) {
        const h = N(c, l.dragging);
        w(`${h.label} moved to position ${h.position} of ${h.total}`);
      }
    }), c.addEventListener("dragend", () => {
      q(c), l.dragging && (l.dragging.classList.remove("block-item--dragging"), l.dragging = null), l.originalIndex = -1, L();
    }), u) {
      let i = null, f = null, m = !1;
      const S = 10;
      c.addEventListener("touchstart", (h) => {
        const x = h.touches[0], v = x.target;
        if (!g(v)) return;
        const E = v.closest("[data-block-item]");
        E && (l.touchStartY = x.clientY, l.touchCurrentY = x.clientY, i = E, m = !1);
      }, { passive: !0 }), c.addEventListener("touchmove", (h) => {
        if (!i) return;
        const x = h.touches[0];
        if (l.touchCurrentY = x.clientY, !m) {
          if (Math.abs(x.clientY - l.touchStartY) < S) return;
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
          `, document.body.appendChild(f), i.classList.add("block-item--placeholder"), l.dragging = i, l.originalIndex = k(i);
          const I = N(c, i);
          w(`Dragging ${I.label}. Move finger to reposition.`);
        }
        h.preventDefault(), f && (f.style.top = `${x.clientY - f.offsetHeight / 2}px`);
        const v = D(c, x.clientY, i || void 0);
        v ? W(c, v.item, v.position) : q(c), ke(c, l);
      }, { passive: !1 }), c.addEventListener("touchend", () => {
        if (l.scrollInterval && (clearInterval(l.scrollInterval), l.scrollInterval = null), q(c), f && (f.remove(), f = null), i && m) {
          i.classList.remove("block-item--placeholder");
          const h = D(c, l.touchCurrentY, i);
          if (h && (h.position === "before" ? c.insertBefore(i, h.item) : c.insertBefore(i, h.item.nextSibling)), s && G(c, i), k(i) !== l.originalIndex) {
            const v = N(c, i);
            w(`${v.label} moved to position ${v.position} of ${v.total}`);
          }
          L();
        }
        i = null, m = !1, l.dragging = null, l.originalIndex = -1;
      }), c.addEventListener("touchcancel", () => {
        l.scrollInterval && (clearInterval(l.scrollInterval), l.scrollInterval = null), q(c), f && (f.remove(), f = null), i && i.classList.remove("block-item--placeholder"), i = null, m = !1, l.dragging = null, l.originalIndex = -1;
      });
    }
  }
  if (e.addSelect) {
    const a = document.createElement("option");
    a.value = "", a.textContent = "Select block type", e.addSelect.appendChild(a), n.forEach((u) => {
      const s = document.createElement("option");
      s.value = u.type, s.textContent = u.label, e.addSelect?.appendChild(s);
    }), e.addSelect.value = "";
  }
  t.addEventListener("keydown", (a) => {
    const u = a.target;
    if (!(u instanceof HTMLElement)) return;
    const s = u.closest("[data-block-item]");
    if (!s) return;
    const b = u.closest("[data-block-header]");
    if (b)
      switch (a.key) {
        case "Delete":
        case "Backspace":
          a.shiftKey && (a.preventDefault(), s.remove(), L(), c.querySelector("[data-block-item] [data-block-header]")?.focus());
          break;
        case "ArrowUp":
          if (a.altKey && p) {
            a.preventDefault();
            const g = s.previousElementSibling;
            if (g) {
              c.insertBefore(s, g), L(), s.querySelector("[data-block-header]")?.focus();
              const k = N(c, s);
              w(`${k.label} moved to position ${k.position} of ${k.total}`);
            } else
              w("Already at the top");
          } else if (!a.altKey) {
            a.preventDefault();
            const k = s.previousElementSibling?.querySelector("[data-block-header]");
            k ? k.focus() : w("At the first block");
          }
          break;
        case "ArrowDown":
          if (a.altKey && p) {
            a.preventDefault();
            const g = s.nextElementSibling;
            if (g) {
              c.insertBefore(g, s), L(), s.querySelector("[data-block-header]")?.focus();
              const k = N(c, s);
              w(`${k.label} moved to position ${k.position} of ${k.total}`);
            } else
              w("Already at the bottom");
          } else if (!a.altKey) {
            a.preventDefault();
            const k = s.nextElementSibling?.querySelector("[data-block-header]");
            k ? k.focus() : w("At the last block");
          }
          break;
        case "Enter":
        case " ":
          u.matches("[data-block-collapse]") || u.matches("[data-block-remove]") || u.matches("[data-block-move-up]") || u.matches("[data-block-move-down]") ? (a.preventDefault(), u.click()) : b && !u.matches("button") && (a.preventDefault(), s.querySelector("[data-block-collapse]")?.click());
          break;
        case "Escape":
          const l = s.querySelector("[data-block-body]");
          if (l && !l.classList.contains("hidden")) {
            a.preventDefault(), l.classList.add("hidden"), s.dataset.blockCollapsed = "true";
            const g = s.querySelector("[data-block-collapse]");
            g && (g.textContent = "Expand");
          }
          break;
      }
  });
  const te = () => {
    c.querySelectorAll("[data-block-header]").forEach((a) => {
      a.hasAttribute("tabindex") || (a.setAttribute("tabindex", "0"), a.setAttribute("role", "button"), a.setAttribute("aria-label", "Block header - Press Enter to collapse/expand, Shift+Delete to remove"));
    });
  };
  new MutationObserver(() => {
    te();
  }).observe(c, { childList: !0, subtree: !0 });
  const U = T.value?.trim();
  let H = [];
  if (U)
    try {
      const a = JSON.parse(U);
      Array.isArray(a) && (H = a, a.forEach((u) => {
        const s = typeof u == "object" && u ? u._type : "";
        s && n.has(s) && F(s, u);
      }));
    } catch {
    }
  const J = o.showConflicts ?? !0;
  if (J && o.legacyBlocks && Array.isArray(o.legacyBlocks)) {
    const a = P(H, o.legacyBlocks);
    a.hasConflicts && z(t, a);
  }
  const K = t.dataset.blockLegacy;
  if (J && K)
    try {
      const a = JSON.parse(K);
      if (Array.isArray(a)) {
        const u = P(H, a);
        u.hasConflicts && z(t, u);
      }
    } catch {
    }
  L();
}
function Ee(t = document) {
  Array.from(t.querySelectorAll('[data-component="block"], [data-block-editor]')).forEach((o) => ve(o));
}
function Ae(t) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t, { once: !0 }) : t();
}
Ae(() => Ee());
export {
  Ee as initBlockEditors
};
//# sourceMappingURL=block_editor.js.map
