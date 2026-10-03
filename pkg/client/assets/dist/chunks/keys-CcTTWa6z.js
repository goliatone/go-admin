var o = "go-admin:data-preview:v1:";
function a(e) {
  return e ? [
    e.application_id,
    e.environment_id,
    e.actor_id,
    e.scope_key
  ].join("\0") : "";
}
function n(e) {
  return `${o}${e || "default"}`;
}
function r(e) {
  try {
    typeof sessionStorage < "u" && sessionStorage.removeItem(n(e));
  } catch {
  }
}
export {
  n,
  a as r,
  r as t
};

//# sourceMappingURL=keys-CcTTWa6z.js.map