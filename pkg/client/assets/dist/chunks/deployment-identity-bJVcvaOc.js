var l = "#64748b", m = {
  development: "DEV",
  dev: "DEV",
  local: "LOCAL",
  staging: "STG",
  stage: "STG",
  production: "PROD",
  prod: "PROD",
  preview: "PREV",
  sandbox: "SBX",
  testing: "TEST",
  test: "TEST",
  qa: "QA"
};
function o(t) {
  return typeof t == "string" ? t.trim() : "";
}
function p(t) {
  const e = o(t).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(e) ? e : l;
}
function u(t) {
  const e = m[t.toLowerCase()];
  if (e) return e;
  const n = t.toUpperCase();
  return n.length <= 5 ? n : n.slice(0, 4);
}
function d(t, e) {
  if (e && !e.some((c) => c.trim().toLowerCase() === "deployment")) return null;
  const n = t.deployment, r = o(n?.environment?.name), i = o(n?.runtime?.instance_name);
  if (!r || !i) return null;
  const s = r.toUpperCase(), a = [
    `Environment: ${r}`,
    `Instance: ${i}`,
    o(n?.application?.version) ? `Version: ${o(n?.application?.version)}` : "",
    o(n?.build?.commit_short) ? `Commit: ${o(n?.build?.commit_short)}` : ""
  ].filter(Boolean);
  return {
    label: `${s} · ${i}`,
    color: p(n?.environment?.color),
    environment: s,
    environmentShort: u(r),
    instance: i,
    title: a.join(" · ")
  };
}
export {
  d as t
};

//# sourceMappingURL=deployment-identity-bJVcvaOc.js.map