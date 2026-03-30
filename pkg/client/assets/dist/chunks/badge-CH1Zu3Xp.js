import { escapeHTML as i, escapeAttribute as u } from "../shared/html.js";
function b(s, a, t) {
  const e = a.toLowerCase(), r = s === "status" ? "status-badge" : s === "role" ? "role-badge" : "badge", n = s === "status" ? "status" : s === "role" ? "role" : "badge", l = [r];
  return t === "sm" && l.push(`${r}--sm`), l.push(`${n}-${e}`), l.join(" ");
}
function $(s, a, t, e) {
  const n = [b(a, t, e?.size)];
  e?.uppercase && n.push("badge--uppercase"), e?.extraClass && n.push(e.extraClass);
  let l = "";
  return e?.attrs && (l = Object.entries(e.attrs).map(([o, c]) => c === "" ? ` ${o}` : ` ${o}="${u(c)}"`).join("")), `<span class="${n.join(" ")}"${l}>${i(s)}</span>`;
}
const d = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>', p = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>';
function C(s, a) {
  const t = s ? a?.trueLabel ?? "Yes" : a?.falseLabel ?? "No";
  return `<span class="badge badge-${s ? "boolean-true" : "boolean-false"}">${s ? d : p}${i(t)}</span>`;
}
export {
  C as a,
  $ as b
};
//# sourceMappingURL=badge-CH1Zu3Xp.js.map
