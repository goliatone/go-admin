function m(n, a = {}) {
  const t = u(n.dataset.actionPayload);
  return n instanceof HTMLFormElement && n.querySelectorAll("[data-action-field]").forEach((e) => {
    const r = e.closest("[hidden]");
    if (r && n.contains(r) || (e instanceof HTMLInputElement || e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement) && e.disabled) return;
    const o = (e.dataset.actionFieldPath || e.dataset.actionField || "").trim();
    if (!o) return;
    if (a.excludeSensitive && e.dataset.actionFieldSensitive === "true") {
      d(t, o);
      return;
    }
    const i = f(e);
    i !== void 0 && y(t, o, i);
  }), t;
}
function h(n) {
  return n.querySelector('[data-action-field-sensitive="true"]') !== null;
}
function s(n, a) {
  n.querySelectorAll("[data-action-field]").forEach((t) => {
    const e = (t.dataset.actionFieldPath || t.dataset.actionField || "").trim();
    if (!e) return;
    const r = l(a, e);
    if (r !== void 0) {
      if (t instanceof HTMLInputElement && t.type === "checkbox") t.checked = !!r;
      else if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
        const o = (t.dataset.actionFieldKind || "").trim().toLowerCase();
        o === "string_list" && Array.isArray(r) ? t.value = r.map((i) => String(i)).join(`
`) : o === "json" && typeof r == "object" && r !== null ? t.value = JSON.stringify(r, null, 2) : t.value = String(r);
      }
      t.dispatchEvent(new Event("change", { bubbles: !0 }));
    }
  });
}
function A(n, a, t) {
  const e = String(t.action_id || "").trim();
  if (!a || !e) return !1;
  const r = Array.from(n.querySelectorAll("[data-panel-action-picker]")).find((c) => c.dataset.panelActionPicker === a);
  if (!r || !Array.from(r.options).some((c) => c.value === e)) return !1;
  r.value = e, r.dispatchEvent(new Event("change", { bubbles: !0 }));
  const o = t.payload && typeof t.payload == "object" && !Array.isArray(t.payload) ? t.payload : {}, i = Array.from(n.querySelectorAll("[data-panel-action-form]")).find((c) => c.dataset.panelId === a && c.dataset.actionId === e);
  return i && s(i, o), !0;
}
function l(n, a) {
  let t = n;
  for (const e of a.split(".").map((r) => r.trim()).filter(Boolean)) {
    if (!t || typeof t != "object" || Array.isArray(t)) return;
    t = t[e];
  }
  return t;
}
function u(n) {
  if (!n) return {};
  try {
    const a = JSON.parse(n);
    return a && typeof a == "object" && !Array.isArray(a) ? a : {};
  } catch {
    return {};
  }
}
function f(n) {
  const a = (n.dataset.actionFieldKind || "").trim().toLowerCase();
  if (n instanceof HTMLInputElement && n.type === "checkbox") return n.checked;
  const t = p(n).trim();
  if (t !== "") {
    if (a === "number") {
      const e = Number(t);
      return Number.isFinite(e) ? e : t;
    }
    if (a === "integer") {
      const e = Number.parseInt(t, 10);
      return Number.isFinite(e) ? e : t;
    }
    if (a === "string_list") return t.split(/[\n,]/g).map((e) => e.trim()).filter(Boolean);
    if (a === "json") try {
      return JSON.parse(t);
    } catch {
      return t;
    }
    return t;
  }
}
function p(n) {
  return (n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement || n instanceof HTMLSelectElement) && n.value || "";
}
function y(n, a, t) {
  const e = a.split(".").map((o) => o.trim()).filter(Boolean);
  if (e.length === 0) return;
  let r = n;
  e.slice(0, -1).forEach((o) => {
    const i = r[o];
    (!i || typeof i != "object" || Array.isArray(i)) && (r[o] = {}), r = r[o];
  }), r[e[e.length - 1]] = t;
}
function d(n, a) {
  const t = a.split(".").map((o) => o.trim()).filter(Boolean);
  if (t.length === 0) return;
  const e = [];
  let r = n;
  for (const o of t.slice(0, -1)) {
    const i = r[o];
    if (!i || typeof i != "object" || Array.isArray(i)) return;
    e.push({
      value: r,
      key: o
    }), r = i;
  }
  delete r[t[t.length - 1]];
  for (let o = e.length - 1; o >= 0; o -= 1) {
    const i = e[o], c = i.value[i.key];
    if (c && typeof c == "object" && !Array.isArray(c) && Object.keys(c).length === 0) delete i.value[i.key];
    else break;
  }
}
export {
  h as i,
  s as n,
  m as r,
  A as t
};

//# sourceMappingURL=actions-zb2HbM0q.js.map