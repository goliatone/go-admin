function r(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function t(e) {
  return r(e).replace(/`/g, "&#96;");
}
export {
  r as n,
  t
};

//# sourceMappingURL=html-Cx1oHGAm.js.map