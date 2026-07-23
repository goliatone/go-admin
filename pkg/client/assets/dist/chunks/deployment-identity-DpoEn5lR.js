function a(i, e) {
  if (e && !e.some((s) => s.trim().toLowerCase() === "deployment")) return null;
  const n = i.deployment, t = typeof n?.environment?.name == "string" ? n.environment.name.trim() : "", o = typeof n?.runtime?.instance_name == "string" ? n.runtime.instance_name.trim() : "";
  if (!t || !o) return null;
  const r = typeof n?.environment?.color == "string" ? n.environment.color.trim().toLowerCase() : "", m = /^#[0-9a-f]{6}$/.test(r) ? r : "#64748b";
  return {
    label: `${t.toUpperCase()} · ${o}`,
    color: m
  };
}
export {
  a as t
};

//# sourceMappingURL=deployment-identity-DpoEn5lR.js.map