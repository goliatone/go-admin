import { t as n } from "../../chunks/badge-DT04uHwZ.js";
var a = {
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
function r(e) {
  return e === "draft" || e === "deprecated" ? e : "active";
}
function d(e) {
  const t = r(e), l = a[t];
  return n(l.label, "status", t);
}
function s(e) {
  const t = a[r(e)];
  return `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full ${t.dotClass}" title="${t.label}"></span>`;
}
export {
  r as normalizeBlockStatus,
  d as renderBlockStatusBadge,
  s as renderBlockStatusDot
};

//# sourceMappingURL=status-badges.js.map