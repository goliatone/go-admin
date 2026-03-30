function t(e) {
  return e.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().split(" ").map((r) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()).join(" ");
}
function a(e) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (r) => r.toUpperCase());
}
function p(e) {
  return e.charAt(0).toUpperCase() + e.slice(1).toLowerCase();
}
function c(e) {
  return e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export {
  p as capitalizeLabel,
  c as nameToSlug,
  t as titleCaseIdentifier,
  a as titleCaseWords
};
//# sourceMappingURL=text.js.map
