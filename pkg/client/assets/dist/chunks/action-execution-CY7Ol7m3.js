import { createStructuredActionError as a, executeStructuredRequest as i, formatStructuredErrorForDisplay as l } from "../toast/error-helpers.js";
var m = { async prompt(e) {
  const { PayloadInputModal: t } = await import("./payload-modal-DVPl3gRZ.js");
  return t.prompt(e);
} };
function u(e) {
  return {
    textCode: null,
    message: e,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function s(e) {
  const t = String(e.confirmMessage || "Are you sure you want to delete this item?").trim() || "Are you sure you want to delete this item?", o = String(e.confirmTitle || "Confirm Delete").trim() || "Confirm Delete";
  if (e.notifier?.confirm) return e.notifier.confirm(t, {
    title: o,
    confirmText: "Delete",
    cancelText: "Cancel"
  });
  const r = globalThis.window;
  return r && typeof r.confirm == "function" ? r.confirm(t) : !0;
}
async function d(e) {
  if (!await s(e)) return null;
  const t = await i(e.endpoint, {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  if (t.success)
    return await e.onSuccess?.(t), t;
  const o = String(e.fallbackMessage || "Delete failed").trim() || "Delete failed", r = t.error || u(o), n = {
    ...r,
    message: l(r, o)
  };
  throw n.textCode && e.reconcileOnDomainFailure && await e.reconcileOnDomainFailure(n), await e.onError?.(n), a(n, o, !!e.onError);
}
export {
  m as n,
  d as t
};

//# sourceMappingURL=action-execution-CY7Ol7m3.js.map