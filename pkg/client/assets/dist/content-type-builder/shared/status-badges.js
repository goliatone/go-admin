import { b as n } from "../../chunks/badge-CH1Zu3Xp.js";
const r = {
  draft: {
    label: "Draft",
    dotClass: "bg-yellow-400"
  },
  active: {
    label: "Active",
    dotClass: "bg-green-400"
  },
  deprecated: {
    label: "Deprecated",
    dotClass: "bg-red-400"
  }
};
function l(e) {
  return e === "draft" || e === "deprecated" ? e : "active";
}
function s(e) {
  const t = l(e), a = r[t];
  return n(a.label, "status", t);
}
function c(e) {
  const t = l(e), a = r[t];
  return `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full ${a.dotClass}" title="${a.label}"></span>`;
}
export {
  l as normalizeBlockStatus,
  s as renderBlockStatusBadge,
  c as renderBlockStatusDot
};
//# sourceMappingURL=status-badges.js.map
