import { escapeAttribute as u, escapeHTML as i } from "../shared/html.js";
function c(e, a, t) {
  const s = a.toLowerCase(), l = e === "status" ? "status-badge" : e === "role" ? "role-badge" : "badge", n = e === "status" ? "status" : e === "role" ? "role" : "badge", r = [l];
  return t === "sm" && r.push(`${l}--sm`), r.push(`${n}-${s}`), r.join(" ");
}
function f(e, a, t, s) {
  const l = [c(a, t, s?.size)];
  s?.uppercase && l.push("badge--uppercase"), s?.extraClass && l.push(s.extraClass);
  let n = "";
  return s?.attrs && (n = Object.entries(s.attrs).map(([r, o]) => o === "" ? ` ${r}` : ` ${r}="${u(o)}"`).join("")), `<span class="${l.join(" ")}"${n}>${i(e)}</span>`;
}
var d = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>', p = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>';
function $(e, a) {
  const t = e ? a?.trueLabel ?? "Yes" : a?.falseLabel ?? "No";
  return `<span class="badge badge-${e ? "boolean-true" : "boolean-false"}">${e ? d : p}${i(t)}</span>`;
}
export {
  $ as n,
  f as t
};

//# sourceMappingURL=badge-DT04uHwZ.js.map