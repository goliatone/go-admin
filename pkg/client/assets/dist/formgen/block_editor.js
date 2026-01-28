function G(e) {
  if (!e) return {};
  try {
    const t = JSON.parse(e);
    if (t && typeof t == "object")
      return t;
  } catch {
  }
  return {};
}
function Y(e) {
  const t = e.closest("[data-component-config]");
  return G(t?.getAttribute("data-component-config") ?? null);
}
function R(e) {
  if (e == null) return;
  const t = e.trim().toLowerCase();
  if (t === "true") return !0;
  if (t === "false") return !1;
}
function Q(e) {
  const t = e.querySelector("[data-block-list]"), n = e.querySelector("input[data-block-output]");
  if (!t || !n) return null;
  const a = e.querySelector("[data-block-add-select]"), s = e.querySelector("[data-block-add]"), l = e.querySelector("[data-block-empty]");
  return { root: e, list: t, output: n, addSelect: a ?? void 0, addButton: s ?? void 0, emptyState: l ?? void 0 };
}
function T(e) {
  return e.replace(/\]/g, "").split(/\.|\[/).map((n) => n.trim()).filter((n) => n.length > 0);
}
function X(e, t, n) {
  if (!e) return n;
  const a = T(n);
  let s = `${e}[${t}]`;
  for (const l of a)
    s += `[${l}]`;
  return s;
}
function Z(e, t) {
  if (!e || !t) return;
  const n = T(t);
  let a = e;
  for (const s of n) {
    if (a == null) return;
    a = a[s];
  }
  return a;
}
function ee(e, t, n) {
  if (!t) return;
  const a = T(t);
  if (a.length === 0) return;
  let s = e;
  a.forEach((l, u) => {
    const h = u === a.length - 1, k = a[u + 1], y = k !== void 0 && /^\d+$/.test(k);
    if (h) {
      if (l === "") return;
      s[l] = n;
      return;
    }
    (s[l] == null || typeof s[l] != "object") && (s[l] = y ? [] : {}), s = s[l];
  });
}
function te(e) {
  if (e.length === 0) return;
  const t = e[0];
  if (t instanceof HTMLSelectElement && t.multiple)
    return Array.from(t.selectedOptions).map((n) => n.value);
  if (t instanceof HTMLInputElement) {
    if (t.type === "radio") {
      const n = e.find((a) => a.checked);
      return n ? n.value : void 0;
    }
    if (t.type === "checkbox")
      return e.length > 1 ? e.filter((n) => n.checked).map((n) => n.value) : t.checked;
  }
  return t.value;
}
function ae(e, t) {
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
      const n = Array.isArray(t) ? t.map(String) : [String(t)];
      Array.from(e.options).forEach((a) => {
        a.selected = n.includes(a.value);
      });
      return;
    }
    e.value = String(t);
  }
}
function re(e, t) {
  const n = /* @__PURE__ */ new Map();
  return e.querySelectorAll("template[data-block-template]").forEach((a) => {
    const s = a.dataset.blockType?.trim();
    if (!s) return;
    const l = a.dataset.blockLabel?.trim() || s, u = a.dataset.blockIcon?.trim(), h = R(a.dataset.blockCollapsed), k = a.dataset.blockSchemaVersion?.trim() || w(s, t.schemaVersionPattern), y = a.dataset.blockRequiredFields?.trim(), g = y ? y.split(",").map((f) => f.trim()).filter(Boolean) : t.requiredFields?.[s] || [];
    n.set(s, {
      type: s,
      label: l,
      icon: u || void 0,
      collapsed: h,
      schemaVersion: k,
      requiredFields: g,
      template: a
    });
  }), n;
}
function w(e, t) {
  return t ? t.replace("{type}", e) : `${e}@v1.0.0`;
}
function ne(e, t) {
  const n = [], a = t.requiredFields || [];
  for (const s of a) {
    const l = e.querySelector(
      `[name="${s}"], [data-block-field-name="${s}"]`
    );
    if (!l) continue;
    let u = !1;
    if (l instanceof HTMLInputElement)
      if (l.type === "checkbox")
        u = !l.checked;
      else if (l.type === "radio") {
        const h = e.querySelectorAll(`[name="${l.name}"]`);
        u = !Array.from(h).some((k) => k.checked);
      } else
        u = !l.value.trim();
    else l instanceof HTMLSelectElement ? u = !l.value || l.value === "" : u = !l.value.trim();
    u && n.push({
      field: s,
      message: `${s} is required`
    });
  }
  return n;
}
function oe(e, t) {
  if (ce(e), t.length === 0) return;
  e.classList.add("block-item--invalid"), e.dataset.blockValid = "false";
  const n = e.querySelector("[data-block-header]");
  if (n) {
    const a = document.createElement("span");
    a.className = "block-error-badge text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/20 dark:text-red-400", a.textContent = `${t.length} error${t.length > 1 ? "s" : ""}`, a.setAttribute("data-block-error-badge", "true"), n.querySelector(".flex")?.appendChild(a);
  }
  for (const a of t) {
    const s = e.querySelector(
      `[name="${a.field}"], [data-block-field-name="${a.field}"]`
    );
    if (s) {
      s.classList.add("border-red-500", "focus:ring-red-500");
      const l = s.closest("[data-component]");
      if (l) {
        const u = document.createElement("p");
        u.className = "block-field-error text-xs text-red-600 mt-1 dark:text-red-400", u.textContent = a.message, u.setAttribute("data-block-field-error", "true"), l.appendChild(u);
      }
    }
  }
}
function ce(e) {
  e.classList.remove("block-item--invalid"), e.dataset.blockValid = "true", e.querySelectorAll("[data-block-error-badge]").forEach((t) => t.remove()), e.querySelectorAll("[data-block-field-error]").forEach((t) => t.remove()), e.querySelectorAll(".border-red-500").forEach((t) => {
    t.classList.remove("border-red-500", "focus:ring-red-500");
  });
}
function F(e, t) {
  const n = [];
  if (!Array.isArray(e) || !Array.isArray(t))
    return {
      hasConflicts: !1,
      conflicts: [],
      embeddedCount: Array.isArray(e) ? e.length : 0,
      legacyCount: Array.isArray(t) ? t.length : 0
    };
  e.length, t.length;
  const a = Math.max(e.length, t.length);
  for (let s = 0; s < a; s++) {
    const l = e[s] || {}, u = t[s] || {}, h = l._type || u._type || `block_${s}`, k = /* @__PURE__ */ new Set([...Object.keys(l), ...Object.keys(u)]);
    for (const y of k) {
      if (y.startsWith("_")) continue;
      const g = l[y], f = u[y];
      D(g, f) || n.push({
        blockIndex: s,
        blockType: h,
        field: y,
        embeddedValue: g,
        legacyValue: f
      });
    }
  }
  return {
    hasConflicts: n.length > 0 || e.length !== t.length,
    conflicts: n,
    embeddedCount: e.length,
    legacyCount: t.length
  };
}
function D(e, t) {
  if (e === t) return !0;
  if (e == null || t == null) return e === t;
  if (typeof e != typeof t) return !1;
  if (Array.isArray(e) && Array.isArray(t))
    return e.length !== t.length ? !1 : e.every((n, a) => D(n, t[a]));
  if (typeof e == "object") {
    const n = Object.keys(e), a = Object.keys(t);
    return n.length !== a.length ? !1 : n.every((s) => D(e[s], t[s]));
  }
  return !1;
}
function se(e) {
  const t = document.createElement("div");
  t.className = "block-conflict-report border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4 dark:bg-amber-900/20 dark:border-amber-700", t.setAttribute("data-block-conflict-report", "true");
  const n = document.createElement("div");
  n.className = "flex items-center gap-2 mb-3";
  const a = document.createElement("span");
  a.className = "text-amber-600 dark:text-amber-400", a.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
  const s = document.createElement("span");
  s.className = "font-medium text-amber-800 dark:text-amber-200", s.textContent = "Block Conflicts Detected", n.appendChild(a), n.appendChild(s), t.appendChild(n);
  const l = document.createElement("p");
  if (l.className = "text-sm text-amber-700 dark:text-amber-300 mb-3", l.textContent = `Embedded blocks (${e.embeddedCount}) differ from legacy blocks (${e.legacyCount}). Embedded blocks are authoritative.`, t.appendChild(l), e.conflicts.length > 0) {
    const k = document.createElement("details");
    k.className = "text-sm";
    const y = document.createElement("summary");
    y.className = "cursor-pointer text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium", y.textContent = `View ${e.conflicts.length} field conflict${e.conflicts.length > 1 ? "s" : ""}`, k.appendChild(y);
    const g = document.createElement("ul");
    g.className = "mt-2 space-y-1 pl-4";
    for (const f of e.conflicts.slice(0, 10)) {
      const A = document.createElement("li");
      A.className = "text-amber-700 dark:text-amber-300", A.innerHTML = `<span class="font-mono text-xs">${f.blockType}[${f.blockIndex}].${f.field}</span>: <span class="text-green-600 dark:text-green-400">embedded</span> vs <span class="text-red-600 dark:text-red-400">legacy</span>`, g.appendChild(A);
    }
    if (e.conflicts.length > 10) {
      const f = document.createElement("li");
      f.className = "text-amber-600 dark:text-amber-400 italic", f.textContent = `...and ${e.conflicts.length - 10} more`, g.appendChild(f);
    }
    k.appendChild(g), t.appendChild(k);
  }
  const u = document.createElement("div");
  u.className = "mt-3 flex gap-2";
  const h = document.createElement("button");
  return h.type = "button", h.className = "text-xs px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40", h.textContent = "Dismiss", h.addEventListener("click", () => t.remove()), u.appendChild(h), t.appendChild(u), t;
}
function j(e, t) {
  if (e.querySelector("[data-block-conflict-report]")?.remove(), !t.hasConflicts) return;
  const n = se(t), a = e.querySelector("[data-block-list]");
  a ? a.parentElement?.insertBefore(n, a) : e.insertBefore(n, e.firstChild);
}
function le(e, t) {
  const n = e.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (n.length === 0) {
    const a = document.createElement("input");
    a.type = "hidden", a.name = "_type", a.value = t, a.setAttribute("data-block-type-input", "true"), a.setAttribute("data-block-ignore", "true"), e.appendChild(a);
    return;
  }
  n.forEach((a) => {
    a.setAttribute("data-block-type-input", "true"), a.setAttribute("data-block-ignore", "true"), a instanceof HTMLInputElement ? (a.value = t, a.readOnly = !0) : a instanceof HTMLSelectElement ? (Array.from(a.options).forEach((l) => {
      l.selected = l.value === t;
    }), a.disabled = !0) : (a.value = t, a.readOnly = !0);
    const s = a.closest("[data-component]");
    s && s.classList.add("hidden");
  });
}
function ie(e, t) {
  const n = e.querySelectorAll('[name="_schema"], [data-block-schema-input]');
  if (n.length === 0) {
    const a = document.createElement("input");
    a.type = "hidden", a.name = "_schema", a.value = t, a.setAttribute("data-block-schema-input", "true"), a.setAttribute("data-block-ignore", "true"), e.appendChild(a);
    return;
  }
  n.forEach((a) => {
    a.setAttribute("data-block-schema-input", "true"), a.setAttribute("data-block-ignore", "true"), a.value = t, a.readOnly = !0;
    const s = a.closest("[data-component]");
    s && s.classList.add("hidden");
  });
}
function de(e) {
  const t = Q(e);
  if (!t) return;
  const n = Y(e), a = re(e, n), s = e.dataset.blockField || t.output.name, l = R(e.dataset.blockSortable), u = n.sortable ?? l ?? !1, h = n.allowDrag ?? u, k = n.addLabel || t.addButton?.dataset.blockAddLabel || "Add block", y = n.emptyLabel || t.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.", g = n.validateOnInput ?? !0;
  t.addButton && (t.addButton.textContent = k), t.emptyState && (t.emptyState.textContent = y);
  const f = t.list, A = t.output, H = () => {
    const r = Array.from(f.querySelectorAll("[data-block-item]"));
    let c = !1;
    const o = r.map((i) => {
      const d = {}, m = /* @__PURE__ */ new Map();
      i.querySelectorAll("input, select, textarea").forEach((p) => {
        if (p.dataset.blockIgnore === "true" || p.hasAttribute("data-block-ignore")) return;
        const b = p.getAttribute("data-block-field-name") || p.name || "";
        b && (m.has(b) || m.set(b, []), m.get(b).push(p));
      }), m.forEach((p, b) => {
        const C = te(p);
        C !== void 0 && ee(d, b, C);
      });
      const E = i.dataset.blockType || d._type || "";
      E && (d._type = E);
      const S = i.dataset.blockSchema || d._schema;
      if (S)
        d._schema = S;
      else {
        const p = a.get(E);
        p?.schemaVersion && (d._schema = p.schemaVersion);
      }
      if (g) {
        const p = a.get(E);
        if (p) {
          const b = ne(i, p);
          oe(i, b), b.length > 0 && (c = !0);
        }
      }
      return d;
    });
    A.value = JSON.stringify(o), e.dataset.blockEditorValid = c ? "false" : "true";
  }, K = () => {
    Array.from(f.querySelectorAll("[data-block-item]")).forEach((c, o) => {
      c.querySelectorAll("input, select, textarea").forEach((i) => {
        if (i.dataset.blockIgnore === "true" || i.hasAttribute("data-block-ignore")) return;
        const d = i.getAttribute("data-block-field-name") || i.name;
        d && (i.hasAttribute("data-block-field-name") || i.setAttribute("data-block-field-name", d), i.name = X(s, o, d));
      });
    });
  }, U = () => {
    if (!t.emptyState) return;
    const r = f.querySelector("[data-block-item]");
    t.emptyState.classList.toggle("hidden", !!r);
  }, x = () => {
    K(), H(), U();
  }, I = e.closest("form");
  I && I.addEventListener("submit", () => {
    H();
  });
  const P = (r, c) => {
    r.querySelectorAll("input, select, textarea").forEach((o) => {
      const i = o.getAttribute("data-block-field-name") || o.name;
      if (!i) return;
      const d = Z(c, i);
      d !== void 0 && ae(o, d);
    });
  }, J = (r, c) => {
    const o = document.createElement("div");
    o.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", o.setAttribute("data-block-item", "true"), o.dataset.blockType = r.type, u && o.setAttribute("draggable", "true");
    const i = document.createElement("div");
    i.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", i.setAttribute("data-block-header", "true");
    const d = document.createElement("div");
    d.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const m = document.createElement("span");
    m.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", m.textContent = r.icon || r.label.slice(0, 1).toUpperCase();
    const E = document.createElement("span");
    E.textContent = r.label;
    const S = document.createElement("span");
    S.className = "text-xs text-gray-500 dark:text-gray-400", S.textContent = r.type, d.appendChild(m), d.appendChild(E), d.appendChild(S);
    const p = document.createElement("div");
    if (p.className = "flex items-center gap-2", u) {
      const v = document.createElement("button");
      v.type = "button", v.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", v.textContent = "Up", v.setAttribute("data-block-move-up", "true");
      const B = document.createElement("button");
      B.type = "button", B.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", B.textContent = "Down", B.setAttribute("data-block-move-down", "true"), p.appendChild(v), p.appendChild(B);
    }
    const b = document.createElement("button");
    b.type = "button", b.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", b.textContent = "Collapse", b.setAttribute("data-block-collapse", "true");
    const C = document.createElement("button");
    if (C.type = "button", C.className = "text-xs text-red-600 hover:text-red-700", C.textContent = "Remove", C.setAttribute("data-block-remove", "true"), p.appendChild(b), p.appendChild(C), u) {
      const v = document.createElement("span");
      v.className = "text-xs text-gray-400 cursor-move", v.textContent = "Drag", v.setAttribute("data-block-drag-handle", "true"), p.appendChild(v);
    }
    i.appendChild(d), i.appendChild(p);
    const L = document.createElement("div");
    L.className = "p-4 space-y-4", L.setAttribute("data-block-body", "true");
    const W = r.template.content.cloneNode(!0);
    return L.appendChild(W), o.appendChild(i), o.appendChild(L), le(o, r.type), ie(o, r.schemaVersion || w(r.type)), o.dataset.blockSchema = r.schemaVersion || w(r.type), c && P(o, c), (r.collapsed ?? !1) && (L.classList.add("hidden"), o.dataset.blockCollapsed = "true", b.textContent = "Expand"), o;
  }, M = (r, c) => {
    const o = a.get(r);
    if (!o) return;
    const i = J(o, c);
    f.appendChild(i), x();
  }, $ = t.addButton, q = t.addSelect;
  if ($ && q && $.addEventListener("click", () => {
    const r = q.value.trim();
    r && (M(r), q.value = "");
  }), e.addEventListener("click", (r) => {
    const c = r.target;
    if (!(c instanceof HTMLElement)) return;
    const o = c.closest("[data-block-item]");
    if (o) {
      if (c.closest("[data-block-remove]")) {
        o.remove(), x();
        return;
      }
      if (c.closest("[data-block-collapse]")) {
        const i = o.querySelector("[data-block-body]");
        if (i) {
          const d = i.classList.toggle("hidden");
          o.dataset.blockCollapsed = d ? "true" : "false";
          const m = c.closest("[data-block-collapse]");
          m && (m.textContent = d ? "Expand" : "Collapse");
        }
        return;
      }
      if (c.closest("[data-block-move-up]")) {
        const i = o.previousElementSibling;
        i && f.insertBefore(o, i), x();
        return;
      }
      if (c.closest("[data-block-move-down]")) {
        const i = o.nextElementSibling;
        i && f.insertBefore(i, o), x();
        return;
      }
    }
  }), e.addEventListener("input", (r) => {
    const c = r.target;
    !(c instanceof HTMLElement) || !c.closest("[data-block-item]") || x();
  }), e.addEventListener("change", (r) => {
    const c = r.target;
    !(c instanceof HTMLElement) || !c.closest("[data-block-item]") || x();
  }), u && h) {
    let r = null;
    f.addEventListener("dragstart", (c) => {
      const o = c.target;
      if (!(o instanceof HTMLElement)) return;
      if (!o.closest("[data-block-drag-handle]")) {
        c.preventDefault();
        return;
      }
      const d = o.closest("[data-block-item]");
      d && (r = d, d.classList.add("opacity-70"), c.dataTransfer?.setData("text/plain", "block"));
    }), f.addEventListener("dragover", (c) => {
      if (!r) return;
      c.preventDefault();
      const o = c.target instanceof HTMLElement ? c.target.closest("[data-block-item]") : null;
      if (!o || o === r) return;
      const i = o.getBoundingClientRect(), d = c.clientY > i.top + i.height / 2;
      f.insertBefore(r, d ? o.nextSibling : o);
    }), f.addEventListener("dragend", () => {
      r && (r.classList.remove("opacity-70"), r = null, x());
    });
  }
  if (t.addSelect) {
    const r = document.createElement("option");
    r.value = "", r.textContent = "Select block type", t.addSelect.appendChild(r), a.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.type, o.textContent = c.label, t.addSelect?.appendChild(o);
    }), t.addSelect.value = "";
  }
  e.addEventListener("keydown", (r) => {
    const c = r.target;
    if (!(c instanceof HTMLElement)) return;
    const o = c.closest("[data-block-item]");
    if (!o) return;
    const i = c.closest("[data-block-header]");
    if (i)
      switch (r.key) {
        case "Delete":
        case "Backspace":
          r.shiftKey && (r.preventDefault(), o.remove(), x(), f.querySelector("[data-block-item] [data-block-header]")?.focus());
          break;
        case "ArrowUp":
          if (r.altKey && u) {
            r.preventDefault();
            const m = o.previousElementSibling;
            m && (f.insertBefore(o, m), x(), o.querySelector("[data-block-header]")?.focus());
          } else r.altKey || (r.preventDefault(), o.previousElementSibling?.querySelector("[data-block-header]")?.focus());
          break;
        case "ArrowDown":
          if (r.altKey && u) {
            r.preventDefault();
            const m = o.nextElementSibling;
            m && (f.insertBefore(m, o), x(), o.querySelector("[data-block-header]")?.focus());
          } else r.altKey || (r.preventDefault(), o.nextElementSibling?.querySelector("[data-block-header]")?.focus());
          break;
        case "Enter":
        case " ":
          c.matches("[data-block-collapse]") || c.matches("[data-block-remove]") || c.matches("[data-block-move-up]") || c.matches("[data-block-move-down]") ? (r.preventDefault(), c.click()) : i && !c.matches("button") && (r.preventDefault(), o.querySelector("[data-block-collapse]")?.click());
          break;
        case "Escape":
          const d = o.querySelector("[data-block-body]");
          if (d && !d.classList.contains("hidden")) {
            r.preventDefault(), d.classList.add("hidden"), o.dataset.blockCollapsed = "true";
            const m = o.querySelector("[data-block-collapse]");
            m && (m.textContent = "Expand");
          }
          break;
      }
  });
  const z = () => {
    f.querySelectorAll("[data-block-header]").forEach((r) => {
      r.hasAttribute("tabindex") || (r.setAttribute("tabindex", "0"), r.setAttribute("role", "button"), r.setAttribute("aria-label", "Block header - Press Enter to collapse/expand, Shift+Delete to remove"));
    });
  };
  new MutationObserver(() => {
    z();
  }).observe(f, { childList: !0, subtree: !0 });
  const V = A.value?.trim();
  let N = [];
  if (V)
    try {
      const r = JSON.parse(V);
      Array.isArray(r) && (N = r, r.forEach((c) => {
        const o = typeof c == "object" && c ? c._type : "";
        o && a.has(o) && M(o, c);
      }));
    } catch {
    }
  const O = n.showConflicts ?? !0;
  if (O && n.legacyBlocks && Array.isArray(n.legacyBlocks)) {
    const r = F(N, n.legacyBlocks);
    r.hasConflicts && j(e, r);
  }
  const _ = e.dataset.blockLegacy;
  if (O && _)
    try {
      const r = JSON.parse(_);
      if (Array.isArray(r)) {
        const c = F(N, r);
        c.hasConflicts && j(e, c);
      }
    } catch {
    }
  x();
}
function ue(e = document) {
  Array.from(e.querySelectorAll('[data-component="block"], [data-block-editor]')).forEach((n) => de(n));
}
function fe(e) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e, { once: !0 }) : e();
}
fe(() => ue());
export {
  ue as initBlockEditors
};
//# sourceMappingURL=block_editor.js.map
