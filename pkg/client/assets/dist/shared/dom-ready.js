function n(e) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", e, { once: !0 });
    return;
  }
  e();
}
export {
  n as onReady
};
//# sourceMappingURL=dom-ready.js.map
