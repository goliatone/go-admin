function e(t) {
  try {
    return new Date(t).toLocaleDateString(void 0, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return t;
  }
}
export {
  e as formatContentTypeDate
};

//# sourceMappingURL=date-formatters.js.map