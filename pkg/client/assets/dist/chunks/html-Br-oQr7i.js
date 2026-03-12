function t(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function a(e) {
  return t(e).replace(/`/g, "&#96;");
}
export {
  t as a,
  a as e
};
//# sourceMappingURL=html-Br-oQr7i.js.map
