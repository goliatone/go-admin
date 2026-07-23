function m(r) {
  const n = r.deployment, e = typeof n?.environment?.name == "string" ? n.environment.name.trim() : "", t = typeof n?.runtime?.instance_name == "string" ? n.runtime.instance_name.trim() : "";
  if (!e || !t) return null;
  const o = typeof n?.environment?.color == "string" ? n.environment.color.trim().toLowerCase() : "", i = /^#[0-9a-f]{6}$/.test(o) ? o : "#64748b";
  return {
    label: `${e.toUpperCase()} · ${t}`,
    color: i
  };
}
export {
  m as t
};

//# sourceMappingURL=deployment-identity-3Tfk-LDW.js.map