(() => {
  const h = (r) => (r || "").split(`
`).map((c) => c.trim()).filter((c) => c.length > 0), m = (r) => (r || "").trim(), x = () => {
    document.querySelectorAll(".permission-matrix").forEach((r) => {
      const c = r.querySelector(".permission-matrix-value"), f = r.querySelectorAll(".perm-checkbox"), i = r.querySelector("select.permission-matrix-extra"), o = r.querySelector("textarea.permission-matrix-extra"), u = r.querySelector(".permission-matrix-extra-input"), E = r.querySelector(".permission-matrix-extra-add"), p = {};
      if (f.forEach((e) => {
        const t = e.dataset.permission;
        t && (p[t] = e);
      }), !c || f.length === 0)
        return;
      const k = () => {
        if (i) {
          const n = [], a = {};
          return Array.from(i.selectedOptions).forEach((S) => {
            const l = m(S.value);
            if (!l)
              return;
            const y = p[l];
            if (y) {
              y.checked = !0;
              return;
            }
            a[l] || (a[l] = !0, n.push(l));
          }), n;
        }
        let e = "";
        o ? e = o.value || "" : r.dataset.extraPermissions && (e = r.dataset.extraPermissions || "");
        const t = [], s = {};
        return h(e).forEach((n) => {
          const a = p[n];
          if (a) {
            a.checked = !0;
            return;
          }
          s[n] || (s[n] = !0, t.push(n));
        }), t;
      }, d = () => {
        const e = [], t = {};
        k().forEach((s) => {
          t[s] || (t[s] = !0, e.push(s));
        }), f.forEach((s) => {
          s.checked && s.dataset.permission && (t[s.dataset.permission] || (t[s.dataset.permission] = !0, e.push(s.dataset.permission)));
        }), c.value = e.join(`
`);
      }, g = (e) => {
        const t = m(e);
        if (!t)
          return;
        const s = p[t];
        if (s) {
          s.checked = !0, d();
          return;
        }
        if (i) {
          let n = Array.from(i.options).find((a) => m(a.value) === t);
          n || (n = document.createElement("option"), n.value = t, n.textContent = t, i.appendChild(n)), n.selected = !0, i.dispatchEvent(new Event("change", { bubbles: !0 }));
          return;
        }
        if (o) {
          const n = h(o.value || "");
          n.includes(t) || (n.push(t), o.value = n.join(`
`)), o.dispatchEvent(new Event("input", { bubbles: !0 }));
        }
      }, v = () => {
        if (!u)
          return;
        const e = u.value;
        g(e), u.value = "";
      };
      f.forEach((e) => {
        e.addEventListener("change", d);
      }), i && i.addEventListener("change", d), o && o.addEventListener("input", d), E && E.addEventListener("click", v), u && u.addEventListener("keydown", (e) => {
        (e.key === "Enter" || e.key === ",") && (e.preventDefault(), v());
      }), d();
    });
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", x) : x();
})();
//# sourceMappingURL=permission_matrix.js.map
