function m(n, r = {}) {
  const t = r.base ? JSON.parse(JSON.stringify(r.base)) : u(n.dataset.actionPayload);
  return n instanceof HTMLFormElement && n.querySelectorAll("[data-action-field]").forEach((e) => {
    const a = e.closest("[hidden]");
    if (a && n.contains(a) || (e instanceof HTMLInputElement || e instanceof HTMLSelectElement || e instanceof HTMLTextAreaElement) && e.disabled) return;
    const i = (e.dataset.actionFieldPath || e.dataset.actionField || "").trim();
    if (!i || r.skipGenerated && e.hasAttribute("data-action-field-generated")) return;
    if (r.excludeSensitive && e.dataset.actionFieldSensitive === "true") {
      d(t, i);
      return;
    }
    const o = f(e);
    o !== void 0 && y(t, i, o);
  }), t;
}
function h(n) {
  return n.querySelector('[data-action-field-sensitive="true"]') !== null;
}
function s(n, r) {
  n.querySelectorAll("[data-action-field]").forEach((t) => {
    const e = (t.dataset.actionFieldPath || t.dataset.actionField || "").trim();
    if (!e) return;
    const a = l(r, e);
    if (a !== void 0) {
      if (t instanceof HTMLInputElement && t.type === "checkbox") t.checked = !!a;
      else if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
        const i = (t.dataset.actionFieldKind || "").trim().toLowerCase();
        i === "string_list" && Array.isArray(a) ? t.value = a.map((o) => String(o)).join(`
`) : i === "json" && typeof a == "object" && a !== null ? t.value = JSON.stringify(a, null, 2) : t.value = String(a);
      }
      t.dispatchEvent(new Event("change", { bubbles: !0 }));
    }
  });
}
function A(n, r, t) {
  const e = String(t.action_id || "").trim();
  if (!r || !e) return !1;
  const a = Array.from(n.querySelectorAll("[data-panel-action-picker]")).find((c) => c.dataset.panelActionPicker === r);
  if (!a || !Array.from(a.options).some((c) => c.value === e)) return !1;
  a.value = e, a.dispatchEvent(new Event("change", { bubbles: !0 }));
  const i = t.payload && typeof t.payload == "object" && !Array.isArray(t.payload) ? t.payload : {}, o = Array.from(n.querySelectorAll("[data-panel-action-form]")).find((c) => c.dataset.panelId === r && c.dataset.actionId === e);
  return o && s(o, i), !0;
}
function l(n, r) {
  let t = n;
  for (const e of r.split(".").map((a) => a.trim()).filter(Boolean)) {
    if (!t || typeof t != "object" || Array.isArray(t)) return;
    t = t[e];
  }
  return t;
}
function u(n) {
  if (!n) return {};
  try {
    const r = JSON.parse(n);
    return r && typeof r == "object" && !Array.isArray(r) ? r : {};
  } catch {
    return {};
  }
}
function f(n) {
  const r = (n.dataset.actionFieldKind || "").trim().toLowerCase();
  if (n instanceof HTMLInputElement && n.type === "checkbox") return n.checked;
  const t = p(n).trim();
  if (t !== "") {
    if (r === "number") {
      const e = Number(t);
      return Number.isFinite(e) ? e : t;
    }
    if (r === "integer") {
      const e = Number.parseInt(t, 10);
      return Number.isFinite(e) ? e : t;
    }
    if (r === "string_list") return t.split(/[\n,]/g).map((e) => e.trim()).filter(Boolean);
    if (r === "json") try {
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
function y(n, r, t) {
  const e = r.split(".").map((i) => i.trim()).filter(Boolean);
  if (e.length === 0) return;
  let a = n;
  e.slice(0, -1).forEach((i) => {
    const o = a[i];
    (!o || typeof o != "object" || Array.isArray(o)) && (a[i] = {}), a = a[i];
  }), a[e[e.length - 1]] = t;
}
function d(n, r) {
  const t = r.split(".").map((i) => i.trim()).filter(Boolean);
  if (t.length === 0) return;
  const e = [];
  let a = n;
  for (const i of t.slice(0, -1)) {
    const o = a[i];
    if (!o || typeof o != "object" || Array.isArray(o)) return;
    e.push({
      value: a,
      key: i
    }), a = o;
  }
  delete a[t[t.length - 1]];
  for (let i = e.length - 1; i >= 0; i -= 1) {
    const o = e[i], c = o.value[o.key];
    if (c && typeof c == "object" && !Array.isArray(c) && Object.keys(c).length === 0) delete o.value[o.key];
    else break;
  }
}
export {
  y as a,
  h as i,
  s as n,
  m as r,
  A as t
};

//# sourceMappingURL=actions-wQfzbd0C.js.map