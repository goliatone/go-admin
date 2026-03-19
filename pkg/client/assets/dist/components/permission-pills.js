const b = {
  view: { initial: "V", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  create: { initial: "C", bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  edit: { initial: "E", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  delete: { initial: "D", bg: "bg-red-100", text: "text-red-700", border: "border-red-200" }
}, m = (t) => t ? Array.isArray(t) ? t.filter(Boolean).map(String) : String(t).split(/[,\n]/).map((e) => e.trim()).filter(Boolean) : [], x = (t) => {
  const e = {};
  return t.forEach((n) => {
    const s = n.split("."), o = s.pop() || "", r = s.join(".");
    e[r] || (e[r] = []), e[r].push(o);
  }), e;
}, u = (t) => t.map((e) => {
  const n = b[e] || {
    initial: e[0]?.toUpperCase() || "?",
    bg: "bg-gray-100",
    text: "text-gray-700"
  };
  return `<span class="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-semibold ${n.bg} ${n.text}" title="${e}">${n.initial}</span>`;
}).join(""), p = (t, e) => {
  const n = t.split(".").pop();
  return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs">
    <span class="flex gap-0.5">${u(e)}</span>
    <span class="text-gray-600 font-medium">${n || t}</span>
  </span>`;
}, f = () => `perm-${Math.random().toString(36).slice(2, 11)}`;
function y(t) {
  const e = document.getElementById(t);
  if (!e) return;
  const n = e.querySelector(".permission-pills-collapsed"), s = e.querySelector(".permission-pills-expanded");
  n && s && (n.classList.toggle("hidden"), s.classList.toggle("hidden"), s.classList.toggle("flex"));
}
typeof window < "u" && (window.togglePermissions = y);
function h(t, e = {}) {
  const n = e.maxVisible ?? 4, s = m(t);
  if (s.length === 0)
    return '<span class="text-gray-400 text-sm">No permissions</span>';
  const o = x(s), r = Object.keys(o), g = r.slice(0, n).map((l) => p(l, o[l])), a = r.length - n, d = f();
  let i = `<div class="permission-pills-container" id="${d}">`;
  if (i += '<div class="flex flex-wrap gap-1 items-center permission-pills-collapsed">', i += g.join(""), a > 0 && (i += `<button type="button" class="permission-expand-btn inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs text-gray-600 font-medium transition-colors" onclick="togglePermissions('${d}')">+${a} more</button>`), i += "</div>", a > 0) {
    const l = r.map((c) => p(c, o[c]));
    i += '<div class="hidden flex-wrap gap-1 items-center permission-pills-expanded">', i += l.join(""), i += `<button type="button" class="permission-collapse-btn inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs text-gray-600 font-medium transition-colors" onclick="togglePermissions('${d}')">Show less</button>`, i += "</div>";
  }
  return i += "</div>", i;
}
function $(t = {}) {
  return (e) => h(e, t);
}
export {
  b as actionConfig,
  h as default,
  $ as permissionPills,
  h as permissionPillsRenderer,
  y as togglePermissions
};
//# sourceMappingURL=permission-pills.js.map
