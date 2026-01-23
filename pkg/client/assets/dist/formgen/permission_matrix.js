(() => {
  const f = (n) => (n || "").split(`
`).map((i) => i.trim()).filter((i) => i.length > 0), d = () => {
    document.querySelectorAll(".permission-matrix").forEach((n) => {
      const i = n.querySelector(".permission-matrix-value"), r = n.querySelectorAll(".perm-checkbox"), o = n.querySelector(".permission-matrix-extra"), u = {};
      if (r.forEach((e) => {
        const s = e.dataset.permission;
        s && (u[s] = e);
      }), !i || r.length === 0)
        return;
      const h = () => {
        let e = "";
        o ? e = o.value || "" : n.dataset.extraPermissions && (e = n.dataset.extraPermissions || "");
        const s = [], t = {};
        return f(e).forEach((a) => {
          const l = u[a];
          if (l) {
            l.checked = !0;
            return;
          }
          t[a] || (t[a] = !0, s.push(a));
        }), s;
      }, c = () => {
        const e = [], s = {};
        h().forEach((t) => {
          s[t] || (s[t] = !0, e.push(t));
        }), r.forEach((t) => {
          t.checked && t.dataset.permission && (s[t.dataset.permission] || (s[t.dataset.permission] = !0, e.push(t.dataset.permission)));
        }), i.value = e.join(`
`);
      };
      r.forEach((e) => {
        e.addEventListener("change", c);
      }), o && o.addEventListener("input", c), c();
    });
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", d) : d();
})();
//# sourceMappingURL=permission_matrix.js.map
