import { t as c } from "./icon-renderer-tQhqqQbt.js";
var t = {
  success: "iconoir:check",
  error: "iconoir:xmark",
  warning: "iconoir:warning-triangle",
  info: "iconoir:info-circle",
  unknown: "iconoir:help-circle",
  hint: "iconoir:light-bulb",
  nextAction: "iconoir:list",
  terminal: "iconoir:terminal",
  appConsole: "iconoir:code",
  cache: "iconoir:database",
  permissions: "iconoir:shield-check",
  doctor: "iconoir:heart",
  refresh: "iconoir:refresh",
  clear: "iconoir:erase",
  connect: "iconoir:play",
  delete: "iconoir:trash"
};
function a(r) {
  return t[r];
}
function l(r, i = {}) {
  return s(a(r), i);
}
function s(r, i = {}) {
  if (!r) return "";
  const o = i.decorative ?? !0, { decorative: u, ...e } = i, n = c(r, e);
  return n ? o ? `<span class="debug-icon" aria-hidden="true">${n}</span>` : n : "";
}
export {
  s as i,
  a as n,
  l as r,
  t
};

//# sourceMappingURL=icons-B_VaFfsl.js.map