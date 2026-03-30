function n(t) {
  try {
    return new Date(t).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return t;
  }
}
export {
  n as formatContentTypeDate
};
//# sourceMappingURL=date-formatters.js.map
