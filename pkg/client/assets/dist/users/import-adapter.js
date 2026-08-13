var n = (e) => {
  const r = Number(e);
  return Number.isFinite(r) && r > 0 ? Math.floor(r) : 0;
}, s = (e) => e == null ? "" : String(e), m = (e) => typeof e == "object" && e !== null && !Array.isArray(e), h = (e) => m(e) ? s(e.status).trim().length > 0 || s(e.error).trim().length > 0 : !1, g = (e) => m(e?.summary) && Array.isArray(e?.results) && e.results.every(h), b = (e) => {
  const r = s(e?.error).trim();
  return r ? r.slice(0, 512) : "Import failed";
};
function R(e) {
  return g(e.payload) ? e.response.ok ? !0 : e.response.status === 422 && e.payload.results.length > 0 : !1;
}
function w(e) {
  const r = e?.summary || {}, a = (Array.isArray(e?.results) ? e.results : []).map((t, y) => {
    const l = s(t?.error).trim(), o = l.length > 0, u = Number(t?.index);
    return {
      reference: String(Number.isFinite(u) ? u + 1 : y + 1),
      outcome: o ? "failed" : "succeeded",
      action: o ? "rejected" : s(t?.status).trim() || "imported",
      message: o ? l : "",
      metadata: {
        email: s(t?.email),
        user_id: s(t?.user_id)
      }
    };
  }), c = Math.max(n(r.processed), a.length), d = a.filter((t) => t.outcome === "failed").length, f = a.length - d, i = Math.max(n(r.failed), d), p = Math.max(n(r.succeeded), f);
  return {
    phase: "complete",
    mode: "users-create",
    metrics: [
      {
        key: "processed",
        label: "Processed",
        value: c
      },
      {
        key: "succeeded",
        label: "Succeeded",
        value: p,
        tone: "success",
        filter: {
          key: "succeeded",
          label: "Succeeded",
          outcome: "succeeded"
        }
      },
      {
        key: "failed",
        label: "Failed",
        value: i,
        tone: "danger",
        filter: {
          key: "failed",
          label: "Failed",
          outcome: "failed"
        }
      }
    ],
    rows: a,
    bounds: {
      returnedRows: a.length,
      totalRows: c,
      truncated: !1
    },
    partial: i > 0
  };
}
function x(e) {
  if (!R(e)) throw new Error(b(e.payload));
  return w(e.payload);
}
export {
  w as adaptUsersImportReport,
  x as adaptUsersImportResult,
  R as isReportableUsersImportResult
};

//# sourceMappingURL=import-adapter.js.map