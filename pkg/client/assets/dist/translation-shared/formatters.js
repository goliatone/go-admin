import { asString as n } from "../shared/coercion.js";
function a(t) {
  const e = n(t);
  if (!e) return "";
  const r = new Date(e);
  return Number.isNaN(r.getTime()) ? e : r.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function m(t, e = "") {
  const r = n(t);
  if (!r) return e;
  const i = new Date(r);
  return Number.isNaN(i.getTime()) ? r : new Intl.DateTimeFormat(void 0, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(i);
}
function s(t) {
  const e = n(t).replace(/_/g, " ");
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
export {
  m as formatTranslationShortDateTime,
  a as formatTranslationTimestampUTC,
  s as sentenceCaseToken
};

//# sourceMappingURL=formatters.js.map