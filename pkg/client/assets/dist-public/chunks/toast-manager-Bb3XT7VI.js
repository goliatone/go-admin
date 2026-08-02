var a = class {
  show(r) {
    const e = r.title ? `${r.title}: ` : "";
    alert(e + r.message);
  }
  success(r) {
    alert(r);
  }
  error(r) {
    alert("Error: " + r);
  }
  warning(r) {
    alert("Warning: " + r);
  }
  info(r) {
    alert(r);
  }
  async confirm(r, e) {
    const t = e?.title ? `${e.title}

` : "";
    return Promise.resolve(confirm(t + r));
  }
};
export {
  a as t
};

//# sourceMappingURL=toast-manager-Bb3XT7VI.js.map