import { t as n } from "./modal-ClEsOn-S.js";
import { createStructuredActionError as i, executeStructuredRequest as l, formatStructuredErrorForDisplay as u } from "../toast/error-helpers.js";
var f = { async prompt(e) {
  const { PayloadInputModal: t } = await import("./payload-modal-DVPl3gRZ.js");
  return t.prompt(e);
} };
function c(e) {
  return {
    textCode: null,
    message: e,
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function s(e) {
  const t = String(e.confirmMessage || "Are you sure you want to delete this item?").trim() || "Are you sure you want to delete this item?", r = String(e.confirmTitle || "Confirm Delete").trim() || "Confirm Delete";
  return e.notifier?.confirm ? e.notifier.confirm(t, {
    title: r,
    confirmText: "Delete",
    cancelText: "Cancel"
  }) : n.confirm(t, {
    title: r,
    confirmText: "Delete",
    cancelText: "Cancel",
    confirmVariant: "danger"
  });
}
async function p(e) {
  if (!await s(e)) return null;
  const t = await l(e.endpoint, {
    method: "DELETE",
    headers: { Accept: "application/json" }
  });
  if (t.success)
    return await e.onSuccess?.(t), t;
  const r = String(e.fallbackMessage || "Delete failed").trim() || "Delete failed", o = t.error || c(r), a = {
    ...o,
    message: u(o, r)
  };
  throw a.textCode && e.reconcileOnDomainFailure && await e.reconcileOnDomainFailure(a), await e.onError?.(a), i(a, r, !!e.onError);
}
export {
  f as n,
  p as t
};

//# sourceMappingURL=action-execution-Bc4l1JsL.js.map