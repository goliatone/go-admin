import { J as p } from "./server-definitions-4iGaxxbT.js";
var u = "#64748b", d = {
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
function o(e) {
  return typeof e == "string" ? e.trim() : "";
}
function v(e) {
  const t = o(e).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(t) ? t : u;
}
function f(e) {
  const t = d[e.toLowerCase()];
  if (t) return t;
  const n = e.toUpperCase();
  return n.length <= 5 ? n : n.slice(0, 4);
}
function C(e, t) {
  if (t && !t.some((c) => c.trim().toLowerCase() === "deployment")) return null;
  const n = e.deployment, i = o(n?.environment?.name), s = o(n?.runtime?.instance_name);
  if (!i || !s) return null;
  const a = i.toUpperCase(), r = p(n?.persona), m = r?.name || s, l = [
    `Environment: ${i}`,
    `Instance: ${s}`,
    r ? `Persona: ${r.name}` : "",
    o(n?.application?.version) ? `Version: ${o(n?.application?.version)}` : "",
    o(n?.build?.commit_short) ? `Commit: ${o(n?.build?.commit_short)}` : ""
  ].filter(Boolean);
  return {
    label: `${a} · ${m}`,
    color: v(n?.environment?.color),
    environment: a,
    environmentShort: f(i),
    instance: s,
    ...r ? { persona: r } : {},
    title: l.join(" · ")
  };
}
export {
  C as t
};

//# sourceMappingURL=deployment-identity-OqtktVXM.js.map