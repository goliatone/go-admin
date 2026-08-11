import { escapeAttribute as p, escapeHTML as i } from "../shared/html.js";
import { i as c } from "./status-vocabulary-BYdivV6D.js";
function d(e, a, t) {
  const s = a.toLowerCase();
  if (e === "status") {
    const l = [
      "status-chip",
      `status-chip--${c(s)}`,
      "status-badge"
    ];
    return t === "sm" && l.push("status-chip--sm", "status-badge--sm"), l.push(`status-${s}`), l.join(" ");
  }
  const r = e === "role" ? "role-badge" : "badge", o = e === "role" ? "role" : "badge", n = [r];
  return t === "sm" && n.push(`${r}--sm`), n.push(`${o}-${s}`), n.join(" ");
}
function g(e, a, t, s) {
  const r = [d(a, t, s?.size)];
  s?.uppercase && r.push("badge--uppercase"), s?.extraClass && r.push(s.extraClass);
  let o = "";
  s?.attrs && (o = Object.entries(s.attrs).map(([l, u]) => u === "" ? ` ${l}` : ` ${l}="${p(u)}"`).join(""));
  const n = a === "status" ? ` data-tone="${c(t)}"` : "";
  return `<span class="${r.join(" ")}"${n}${o}>${i(e)}</span>`;
}
var b = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>', f = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>';
function m(e, a) {
  const t = e ? a?.trueLabel ?? "Yes" : a?.falseLabel ?? "No";
  return `<span class="badge badge-${e ? "boolean-true" : "boolean-false"}">${e ? b : f}${i(t)}</span>`;
}
export {
  m as n,
  g as t
};

//# sourceMappingURL=badge-uRjgR9qC.js.map