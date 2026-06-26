import { t as a } from "../../chunks/badge-DT04uHwZ.js";
var i = {
  draft: "Draft",
  active: "Active",
  deprecated: "Deprecated"
};
function c(e) {
  return e === "draft" || e === "deprecated" ? e : "active";
}
function n(e, r) {
  const t = c(e);
  return a(i[t], "status", t, r?.size ? { size: r.size } : void 0);
}
export {
  c as normalizeBlockStatus,
  n as renderBlockStatusBadge
};

//# sourceMappingURL=status-badges.js.map