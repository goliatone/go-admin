function u(e, s, t) {
  const a = s.toLowerCase(), r = e === "status" ? "status-badge" : e === "role" ? "role-badge" : "badge", n = e === "status" ? "status" : e === "role" ? "role" : "badge", l = [r];
  return t === "sm" && l.push(`${r}--sm`), l.push(`${n}-${a}`), l.join(" ");
}
function g(e, s, t, a) {
  const n = [u(s, t, a?.size)];
  a?.uppercase && n.push("badge--uppercase"), a?.extraClass && n.push(a.extraClass);
  let l = "";
  return a?.attrs && (l = Object.entries(a.attrs).map(([c, o]) => o === "" ? ` ${c}` : ` ${c}="${b(o)}"`).join("")), `<span class="${n.join(" ")}"${l}>${i(e)}</span>`;
}
const p = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>', d = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>';
function f(e, s) {
  const t = e ? s?.trueLabel ?? "Yes" : s?.falseLabel ?? "No";
  return `<span class="badge badge-${e ? "boolean-true" : "boolean-false"}">${e ? p : d}${i(t)}</span>`;
}
function i(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function b(e) {
  return e.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
export {
  f as a,
  g as b
};
//# sourceMappingURL=badge-CqKzZ9y5.js.map
