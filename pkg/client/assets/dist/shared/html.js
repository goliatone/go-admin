function t(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function c(e) {
  return t(e).replace(/`/g, "&#96;");
}
export {
  c as escapeAttribute,
  t as escapeHTML
};
//# sourceMappingURL=html.js.map
