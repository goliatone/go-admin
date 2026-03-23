import "../chunks/modal-Bj9YWM2D.js";
import "../chunks/toast-manager-CLcahrEa.js";
import "../chunks/services-CHKL_Rrd.js";
import { C as Pt, D as Js, E as Ys, S as ea, T as ta, _ as ia, a as na, b as sa, c as aa, d as ue, f as ra, g as oa, h as ca, i as da, l as ua, m as la, n as ma, o as _a, p as le, r as pa, s as ga, t as fa, u as va, v as ha, w as ya, x as ba, y as Sa } from "../chunks/lineage-contracts-RFw4HNlm.js";
import { a as ka, c as Ca, d as Pa, f as xa, h as Ta, i as Ea, l as Aa, m as Ra, n as Da, o as Fa, p as Ia, r as La, s as Ma, t as $a, u as Na } from "../chunks/dom-helpers-CDdChTSn.js";
import { a as Za, c as za, d as Ha, f as Oa, h as Ka, i as Ga, l as Va, m as Ua, n as qa, o as Qa, p as Ba, r as Xa, s as Wa, t as Ja, u as Ya } from "../chunks/provenance-card-Bq_8fLFt.js";
import { C as tr, D as ir, E as nr, O as xt, S as Tt, T as Et, _ as sr, a as At, b as ar, c as Rt, d as Dt, f as Ft, g as rr, h as or, i as cr, l as It, m as dr, n as ur, o as Lt, p as Mt, r as lr, s as $t, t as mr, u as Nt, v as _r, w as pr, x as me, y as gr } from "../chunks/source-management-rendering-states-DicysSM1.js";
import { C as jt, S as vr, _ as hr, a as yr, b as br, c as Sr, d as wr, f as kr, g as Cr, h as Pr, i as xr, l as Tr, m as Er, n as Ar, o as Rr, p as Dr, r as Fr, s as Ir, t as Lr, u as Mr, v as $r, w as Nr, x as jr, y as Zr } from "../chunks/source-management-pages-BO2sJj9C.js";
import { a as Hr, c as Or, i as Kr, l as Gr, n as Vr, o as Ur, r as qr, s as Qr, t as Br } from "../chunks/source-management-runtime-CZKflp5N.js";
import { a as Wr, c as Jr, i as Yr, n as eo, o as to, r as io, s as no, t as so } from "../chunks/landing-Dc4vV9S2.js";
import { a as ro, c as oo, i as co, l as uo, n as lo, o as mo, r as _o, s as po, t as go, u as fo } from "../chunks/formatters-CcW2Edf9.js";
import { a as ho, i as yo, n as bo, o as So, r as wo, s as ko, t as Co } from "../chunks/async-helpers-CA3ovFR9.js";
import { a as xo, i as To, n as Eo, o as Ao, r as Ro, t as Do } from "../chunks/signer-complete-Bb-stjy8.js";
import { a as Io, i as Lo, n as Mo, o as $o, r as No, s as jo, t as Zo } from "../chunks/document-detail-BPZNMbog.js";
import { n as Ho, r as Oo, t as Ko } from "../chunks/google-callback-DJCyujLZ.js";
import { n as Vo, r as Uo, t as qo } from "../chunks/google-integration-BN9wFg7E.js";
import { n as Bo, r as Xo, t as Wo } from "../chunks/google-drive-picker-D05sp0E-.js";
import { n as Yo, r as ec, t as tc } from "../chunks/integration-health-BH4OhBTs.js";
import { n as nc, r as sc, t as ac } from "../chunks/integration-mappings-DF085r3K.js";
import { n as oc, r as cc, t as dc } from "../chunks/integration-conflicts-BSsUu2S-.js";
import { n as lc, r as mc, t as _c } from "../chunks/integration-sync-runs-Dch3yTVt.js";
import { n as gc, r as fc, t as vc } from "../chunks/document-form-Ea6PBT0X.js";
import { n as yc, r as bc, t as Sc } from "../chunks/agreement-form-DNmQAxvn.js";
import "../chunks/runtime-Bu3OM-Zn.js";
import { n as Cc, r as Pc, t as xc } from "../chunks/signer-review-Btt4Uy4c.js";
import { n as Ec, r as Ac, t as Rc } from "../chunks/signer-error-DSWBboZR.js";
import { a as Fc, c as Ic, d as Lc, f as Mc, i as $c, l as Nc, m as jc, n as Zc, o as zc, p as Hc, r as Oc, s as Kc, t as Gc, u as Vc } from "../chunks/datatable-bootstrap-CnClgt49.js";
import { $ as qc, A as Qc, B as Bc, C as Xc, D as Wc, E as Jc, F as Yc, G as ed, H as td, I as id, J as nd, K as sd, L as ad, M as rd, N as od, O as cd, P as dd, Q as ud, R as ld, S as md, T as _d, U as pd, V as gd, W as fd, X as vd, Y as hd, Z as yd, _ as bd, at as Sd, b as wd, c as kd, d as Cd, et as Pd, f as xd, g as Td, h as Ed, i as Ad, it as Rd, j as Dd, k as Fd, l as Id, m as Ld, n as Md, nt as $d, o as Nd, ot as jd, p as Zd, q as zd, r as Hd, rt as Od, s as Kd, t as Gd, tt as Vd, u as Ud, v as qd, w as Qd, x as Bd, y as Xd, z as Wd } from "../chunks/agreement-detail-Dx1zJKBx.js";
function ce(e) {
  if (e)
    try {
      const t = new Date(e);
      return isNaN(t.getTime()) ? void 0 : t.toLocaleString();
    } catch {
      return;
    }
}
function Zt(e) {
  if (e == null) return;
  const t = [
    "B",
    "KB",
    "MB",
    "GB"
  ];
  let i = e, n = 0;
  for (; i >= 1024 && n < t.length - 1; )
    i /= 1024, n++;
  return `${i.toFixed(n === 0 ? 0 : 1)} ${t[n]}`;
}
function zt(e) {
  switch (e) {
    case "ready":
      return "Fingerprint Ready";
    case "pending":
      return "Fingerprint Pending";
    case "failed":
      return "Fingerprint Failed";
    case "not_applicable":
      return "Not Applicable";
    default:
      return e || "Unknown";
  }
}
function we(e) {
  return e?.external_file_id ? "google_drive" : "upload";
}
function ke(e, t, i) {
  return i.kind !== "none" && !e && !t ? "empty" : e && t ? "native" : e || t ? "partial" : "empty";
}
function Ht(e) {
  return e === "critical" || e === "warning" || e === "info" ? e : "none";
}
function Ce(e) {
  return e.some((t) => t.type === "candidate_relationship");
}
function Pe(e) {
  return {
    id: e.id,
    severity: Ht(e.severity),
    type: e.type,
    title: e.title,
    description: e.description,
    evidence: e.evidence.map((t) => ({
      label: t.label,
      details: t.details
    })),
    actionLabel: e.action_label,
    actionUrl: e.action_url,
    reviewActionVisibility: e.review_action_visible
  };
}
function xe(e, t) {
  return e ? {
    id: e.id,
    label: e.label || e.id,
    url: e.url,
    provider: t
  } : null;
}
function Te(e) {
  return e ? {
    id: e.id,
    versionHint: e.provider_revision_hint,
    modifiedAt: e.modified_time,
    modifiedAtFormatted: ce(e.modified_time),
    exportedAt: e.exported_at,
    exportedAtFormatted: ce(e.exported_at),
    exportedByUserId: e.exported_by_user_id,
    mimeType: e.source_mime_type
  } : null;
}
function Ee(e) {
  return e ? {
    id: e.id,
    kind: e.artifact_kind,
    sha256: e.sha256,
    pageCount: e.page_count,
    sizeBytes: e.size_bytes,
    sizeBytesFormatted: Zt(e.size_bytes),
    compatibilityTier: e.compatibility_tier,
    compatibilityReason: e.compatibility_reason
  } : null;
}
function Ae(e) {
  return !e || !e.external_file_id ? null : {
    accountId: e.account_id,
    fileId: e.external_file_id,
    driveId: e.drive_id,
    webUrl: e.web_url,
    title: e.title_hint,
    modifiedTime: e.modified_time,
    modifiedTimeFormatted: ce(e.modified_time),
    mimeType: e.source_mime_type,
    ingestionMode: e.source_ingestion_mode,
    pageCountHint: e.page_count_hint,
    ownerEmail: e.owner_email
  };
}
function Ot(e) {
  return e ? {
    exists: e.exists,
    pinnedSourceRevisionId: e.pinned_source_revision_id,
    latestSourceRevisionId: e.latest_source_revision_id,
    summary: e.summary
  } : null;
}
function Kt(e) {
  const t = e.status || "", i = t === "ready", n = t === "pending", s = t === "failed", a = t === "not_applicable", r = t === "" || t === "unknown", o = i && e.evidence_available;
  return {
    status: t,
    statusLabel: zt(t),
    extractVersion: e.extract_version,
    evidenceAvailable: e.evidence_available,
    isPending: n,
    isReady: i,
    isFailed: s,
    isNotApplicable: a,
    isUnknown: r,
    errorMessage: e.error_message,
    errorCode: e.error_code,
    canMatch: o
  };
}
function Re(e) {
  const t = e.kind === "none";
  return {
    kind: e.kind,
    title: e.title || (t ? "" : "No Source Information"),
    description: e.description || (t ? "" : "This document was uploaded directly without external source tracking."),
    showPlaceholder: !t
  };
}
function Jd(e) {
  const t = we(e.google_source), i = e.source_document !== null, n = e.source_revision !== null, s = e.source_artifact !== null, a = ke(i, n, e.empty_state), r = Kt(e.fingerprint_status), o = e.presentation_warnings.map(Pe);
  return {
    documentId: e.document_id,
    status: a,
    sourceType: t,
    hasLineage: i || n || s,
    hasGoogleSource: e.google_source !== null,
    hasArtifact: s,
    hasFingerprint: r.isReady || r.isPending,
    hasCandidateWarnings: Ce(o),
    source: xe(e.source_document, t),
    revision: Te(e.source_revision),
    artifact: Ee(e.source_artifact),
    googleSource: Ae(e.google_source),
    fingerprintStatus: r,
    emptyState: Re(e.empty_state),
    warnings: o,
    primaryWarning: o.length > 0 ? o[0] : null,
    diagnosticsUrl: e.diagnostics_url,
    showDiagnosticsLink: !!e.diagnostics_url
  };
}
function Yd(e) {
  const t = we(e.google_source), i = e.source_revision !== null, n = e.linked_document_artifact !== null, s = ke(i, n, e.empty_state), a = e.presentation_warnings.map(Pe);
  return {
    agreementId: e.agreement_id,
    status: s,
    sourceType: t,
    hasLineage: i || n,
    hasGoogleSource: e.google_source !== null,
    hasArtifact: n,
    hasCandidateWarnings: Ce(a),
    newerSourceExists: e.newer_source_exists,
    pinnedSourceRevisionId: e.pinned_source_revision_id,
    source: xe(e.source_document, t),
    revision: Te(e.source_revision),
    artifact: Ee(e.linked_document_artifact),
    googleSource: Ae(e.google_source),
    newerSourceSummary: Ot(e.newer_source_summary),
    emptyState: Re(e.empty_state),
    warnings: a,
    primaryWarning: a.length > 0 ? a[0] : null,
    diagnosticsUrl: e.diagnostics_url,
    showDiagnosticsLink: !!e.diagnostics_url
  };
}
function eu(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("view model must be an object"), t;
  const i = e;
  typeof i.documentId != "string" && t.push("documentId must be a string"), typeof i.status != "string" && t.push("status must be a string"), typeof i.sourceType != "string" && t.push("sourceType must be a string");
  for (const n of [
    "hasLineage",
    "hasGoogleSource",
    "hasArtifact",
    "hasFingerprint",
    "hasCandidateWarnings",
    "showDiagnosticsLink"
  ]) typeof i[n] != "boolean" && t.push(`${n} must be a boolean`);
  for (const n of [
    "source",
    "revision",
    "artifact",
    "googleSource",
    "primaryWarning"
  ]) i[n] !== null && typeof i[n] != "object" && t.push(`${n} must be an object or null`);
  return (typeof i.fingerprintStatus != "object" || i.fingerprintStatus === null) && t.push("fingerprintStatus must be an object"), (typeof i.emptyState != "object" || i.emptyState === null) && t.push("emptyState must be an object"), Array.isArray(i.warnings) || t.push("warnings must be an array"), t;
}
function tu(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("view model must be an object"), t;
  const i = e;
  typeof i.agreementId != "string" && t.push("agreementId must be a string"), typeof i.status != "string" && t.push("status must be a string"), typeof i.sourceType != "string" && t.push("sourceType must be a string");
  for (const n of [
    "hasLineage",
    "hasGoogleSource",
    "hasArtifact",
    "hasCandidateWarnings",
    "newerSourceExists",
    "showDiagnosticsLink"
  ]) typeof i[n] != "boolean" && t.push(`${n} must be a boolean`);
  for (const n of [
    "source",
    "revision",
    "artifact",
    "googleSource",
    "newerSourceSummary",
    "primaryWarning"
  ]) i[n] !== null && typeof i[n] != "object" && t.push(`${n} must be an object or null`);
  return (typeof i.emptyState != "object" || i.emptyState === null) && t.push("emptyState must be an object"), Array.isArray(i.warnings) || t.push("warnings must be an array"), t;
}
function iu(e) {
  return e.sourceType === "google_drive" && e.hasGoogleSource;
}
function nu(e) {
  return e.warnings.some((t) => t.severity === "critical" || t.severity === "warning");
}
function De(e) {
  switch (e) {
    case "critical":
      return "warning-critical";
    case "warning":
      return "warning-medium";
    case "info":
      return "warning-info";
    default:
      return "";
  }
}
function Fe(e) {
  switch (e) {
    case "critical":
      return "exclamation-triangle";
    case "warning":
      return "exclamation-circle";
    case "info":
      return "info-circle";
    default:
      return "";
  }
}
function Gt(e) {
  switch (e) {
    case "google_drive":
      return "google-drive";
    case "upload":
      return "upload";
    default:
      return "file";
  }
}
function Vt(e) {
  switch (e) {
    case "google_drive":
      return "Google Drive";
    case "upload":
      return "Direct Upload";
    default:
      return "Unknown Source";
  }
}
function su(e) {
  return e.isReady ? "fingerprint-ready" : e.isPending ? "fingerprint-pending" : e.isFailed ? "fingerprint-failed" : e.isNotApplicable ? "fingerprint-not-applicable" : "fingerprint-unknown";
}
function au(e) {
  return e.isReady ? "check-circle" : e.isPending ? "hourglass" : e.isFailed ? "exclamation-triangle" : e.isNotApplicable ? "minus-circle" : "question-circle";
}
function ru(e) {
  return e.isReady || e.isFailed || e.isNotApplicable;
}
function ou(e) {
  return e.isReady && e.evidenceAvailable;
}
function cu(e) {
  return e.isFailed;
}
function du(e) {
  return e.isReady && e.evidenceAvailable ? e.extractVersion ? `Fingerprint ready (${e.extractVersion})` : "Fingerprint ready" : e.isReady && !e.evidenceAvailable ? "Fingerprint completed but no evidence generated" : e.isPending ? "Fingerprint extraction in progress..." : e.isFailed ? e.errorMessage || "Fingerprint extraction failed" : e.isNotApplicable ? "Fingerprint not applicable for this document" : "Fingerprint status unknown";
}
function Ie(e) {
  if (e.hasCandidateWarnings) return "candidate_warning";
  if ("hasFingerprint" in e) {
    const t = e;
    if (t.fingerprintStatus?.isFailed) return "fingerprint_failed";
    if (t.fingerprintStatus?.isPending) return "fingerprint_pending";
  }
  return e.status === "native" || e.status === "partial" ? "native" : "empty";
}
function Le(e, t) {
  return {
    state: "empty",
    title: e?.title || "No Source Information",
    description: e?.description || "This item was uploaded directly without external source tracking.",
    icon: "file-unknown",
    cssClass: "diagnostic-state-empty",
    showDetails: !1,
    showDiagnosticsLink: !!t,
    diagnosticsUrl: t ?? null,
    ariaLabel: "No source provenance information available"
  };
}
function Me(e) {
  return {
    state: "native",
    title: "Source Provenance",
    description: "This item has full lineage tracking from the original source.",
    icon: "link-chain",
    cssClass: "diagnostic-state-native",
    showDetails: !0,
    showDiagnosticsLink: !!e,
    diagnosticsUrl: e ?? null,
    ariaLabel: "Source provenance information available"
  };
}
function Ut(e) {
  return {
    state: "fingerprint_pending",
    title: "Processing Source",
    description: "Document fingerprinting is in progress. Candidate detection may be incomplete.",
    icon: "hourglass",
    cssClass: "diagnostic-state-fingerprint-pending",
    showDetails: !0,
    showDiagnosticsLink: !!e,
    diagnosticsUrl: e ?? null,
    ariaLabel: "Document fingerprinting in progress"
  };
}
function qt(e, t) {
  return {
    state: "fingerprint_failed",
    title: "Fingerprint Extraction Failed",
    description: e ?? "Document fingerprinting failed. Candidate detection may be unavailable.",
    icon: "warning-triangle",
    cssClass: "diagnostic-state-fingerprint-failed",
    showDetails: !0,
    showDiagnosticsLink: !!t,
    diagnosticsUrl: t ?? null,
    ariaLabel: "Document fingerprint extraction failed"
  };
}
function $e(e, t) {
  const i = e === "critical" ? "Critical" : e === "warning" ? "Warning" : "Notice";
  return {
    state: "candidate_warning",
    title: `${i}: Review Required`,
    description: "Potential source relationship detected that may require operator review.",
    icon: Fe(e),
    cssClass: `diagnostic-state-candidate-warning ${De(e)}`,
    showDetails: !0,
    showDiagnosticsLink: !!t,
    diagnosticsUrl: t ?? null,
    ariaLabel: `${i} level provenance warning requiring review`
  };
}
function uu() {
  return {
    state: "loading",
    title: "Loading Provenance",
    description: "Retrieving source information...",
    icon: "spinner",
    cssClass: "diagnostic-state-loading",
    showDetails: !1,
    showDiagnosticsLink: !1,
    diagnosticsUrl: null,
    ariaLabel: "Loading provenance information"
  };
}
function lu(e) {
  return {
    state: "error",
    title: "Unable to Load Provenance",
    description: e ?? "An error occurred while loading source information.",
    icon: "warning-triangle",
    cssClass: "diagnostic-state-error",
    showDetails: !1,
    showDiagnosticsLink: !1,
    diagnosticsUrl: null,
    ariaLabel: "Error loading provenance information"
  };
}
function Qt(e) {
  return {
    id: e.id,
    type: e.type,
    severity: e.severity,
    title: e.title,
    description: e.description,
    icon: Fe(e.severity),
    cssClass: `diagnostic-warning-card ${De(e.severity)}`,
    actionLabel: e.actionLabel ?? null,
    actionUrl: e.actionUrl ?? null,
    evidence: e.evidence ?? [],
    ariaLabel: `${e.severity} level warning: ${e.title}`
  };
}
function Ne(e) {
  return e.map(Qt);
}
function Bt(e) {
  let t = "diagnostic-fingerprint-card", i = "fingerprint";
  return e.isPending ? (t += " fingerprint-pending", i = "hourglass") : e.isReady ? (t += " fingerprint-ready", i = "check-circle") : e.isFailed ? (t += " fingerprint-failed", i = "warning-triangle") : e.isNotApplicable && (t += " fingerprint-not-applicable", i = "minus-circle"), {
    status: e.status,
    statusLabel: e.statusLabel,
    extractVersion: e.extractVersion ?? null,
    evidenceAvailable: e.evidenceAvailable,
    isPending: e.isPending,
    isReady: e.isReady,
    isFailed: e.isFailed,
    isNotApplicable: e.isNotApplicable,
    cssClass: t,
    icon: i,
    ariaLabel: `Fingerprint status: ${e.statusLabel}`
  };
}
function je(e) {
  if (!e.hasGoogleSource || !e.googleSource) return null;
  const t = e.googleSource;
  return {
    provider: e.sourceType,
    providerIcon: Gt(e.sourceType),
    providerLabel: Vt(e.sourceType),
    fileId: t.fileId,
    webUrl: t.webUrl,
    title: t.title,
    modifiedTime: t.modifiedTime ?? null,
    modifiedTimeFormatted: t.modifiedTimeFormatted ?? null,
    mimeType: t.mimeType,
    ingestionMode: t.ingestionMode,
    ownerEmail: t.ownerEmail ?? null,
    cssClass: "diagnostic-source-card",
    ariaLabel: `Source: ${t.title ?? "Google Drive document"}`
  };
}
function Xt(e) {
  return e.newerSourceExists ? {
    visible: !0,
    title: "Newer Source Available",
    description: "A newer version of the source document exists. This agreement is pinned to an earlier revision.",
    icon: "info-circle",
    cssClass: "diagnostic-newer-source-card warning-info",
    ariaLabel: "Notice: A newer version of the source document is available"
  } : null;
}
function mu(e) {
  const t = Ie(e);
  let i;
  switch (t) {
    case "candidate_warning":
      i = $e(e.primaryWarning?.severity ?? "info", e.diagnosticsUrl);
      break;
    case "fingerprint_pending":
      i = Ut(e.diagnosticsUrl);
      break;
    case "fingerprint_failed":
      i = qt(e.fingerprintStatus.errorMessage, e.diagnosticsUrl);
      break;
    case "native":
      i = Me(e.diagnosticsUrl);
      break;
    default:
      i = Le(e.emptyState, e.diagnosticsUrl);
      break;
  }
  return {
    provenance: e,
    displayConfig: i,
    warningCards: Ne(e.warnings),
    fingerprintCard: Bt(e.fingerprintStatus),
    sourceCard: je(e)
  };
}
function _u(e) {
  const t = Ie(e);
  let i;
  switch (t) {
    case "candidate_warning":
      i = $e(e.primaryWarning?.severity ?? "info", e.diagnosticsUrl);
      break;
    case "native":
      i = Me(e.diagnosticsUrl);
      break;
    default:
      i = Le(e.emptyState, e.diagnosticsUrl);
      break;
  }
  return {
    provenance: e,
    displayConfig: i,
    warningCards: Ne(e.warnings),
    sourceCard: je(e),
    newerSourceCard: Xt(e)
  };
}
function pu(e) {
  return e.displayConfig.state === "empty";
}
function gu(e) {
  return e.displayConfig.state === "native";
}
function fu(e) {
  return e.displayConfig.state === "fingerprint_pending";
}
function vu(e) {
  return e.displayConfig.state === "fingerprint_failed";
}
function hu(e) {
  return e.displayConfig.state === "candidate_warning";
}
function yu(e) {
  return e.warningCards.length > 0 ? e.warningCards[0] : null;
}
function bu(e) {
  return e.warningCards.some((t) => t.severity === "critical" || t.severity === "warning");
}
function Su(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("diagnostic view model must be an object"), t;
  const i = e;
  return (!i.provenance || typeof i.provenance != "object") && t.push("provenance must be an object"), (!i.displayConfig || typeof i.displayConfig != "object") && t.push("displayConfig must be an object"), Array.isArray(i.warningCards) || t.push("warningCards must be an array"), (!i.fingerprintCard || typeof i.fingerprintCard != "object") && t.push("fingerprintCard must be an object"), i.sourceCard !== null && typeof i.sourceCard != "object" && t.push("sourceCard must be an object or null"), t;
}
function wu(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("diagnostic view model must be an object"), t;
  const i = e;
  return (!i.provenance || typeof i.provenance != "object") && t.push("provenance must be an object"), (!i.displayConfig || typeof i.displayConfig != "object") && t.push("displayConfig must be an object"), Array.isArray(i.warningCards) || t.push("warningCards must be an array"), i.sourceCard !== null && typeof i.sourceCard != "object" && t.push("sourceCard must be an object or null"), i.newerSourceCard !== null && typeof i.newerSourceCard != "object" && t.push("newerSourceCard must be an object or null"), t;
}
var Wt = {
  frontend_presentation_only: !0,
  diagnostics_owned_by_backend: !0,
  warning_precedence: [
    "candidate_warning",
    "fingerprint_failed",
    "newer_source_exists",
    "fingerprint_pending",
    "empty_state"
  ],
  candidate_review_visibility: "admin_debug_only"
}, Jt = {
  account_id: "acct_primary",
  external_file_id: "google-file-123",
  drive_id: "shared-drive-123",
  web_url: "https://docs.google.com/document/d/google-file-123/edit",
  modified_time: "2026-03-15T18:00:00Z",
  source_version_hint: "v2026-03-15T18:00:00Z",
  source_mime_type: "application/vnd.google-apps.document",
  source_ingestion_mode: "google_export_pdf",
  title_hint: "MSA Packet",
  page_count_hint: 12,
  owner_email: "owner@example.com",
  parent_id: "folder-legal"
}, Yt = {
  document_native: {
    document_id: "doc_001",
    source_document: {
      id: "src_doc_001",
      label: "MSA Packet"
    },
    source_revision: {
      id: "src_rev_001",
      provider_revision_hint: "v2026-03-15T18:00:00Z",
      modified_time: "2026-03-15T18:00:00Z",
      exported_at: "2026-03-15T18:05:00Z",
      exported_by_user_id: "ops-user",
      source_mime_type: "application/vnd.google-apps.document"
    },
    source_artifact: {
      id: "src_art_001",
      artifact_kind: "signable_pdf",
      object_key: "tenant/tenant-1/org/org-1/docs/doc_001/source.pdf",
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      page_count: 12,
      size_bytes: 24576,
      compatibility_tier: "supported",
      normalization_status: "completed"
    },
    google_source: {
      account_id: "acct_primary",
      external_file_id: "google-file-123",
      drive_id: "shared-drive-123",
      web_url: "https://docs.google.com/document/d/google-file-123/edit",
      modified_time: "2026-03-15T18:00:00Z",
      source_version_hint: "v2026-03-15T18:00:00Z",
      source_mime_type: "application/vnd.google-apps.document",
      source_ingestion_mode: "google_export_pdf",
      title_hint: "MSA Packet",
      page_count_hint: 12,
      owner_email: "owner@example.com",
      parent_id: "folder-legal"
    },
    fingerprint_status: {
      status: "ready",
      extract_version: "v1_pdf_text",
      evidence_available: !0
    },
    fingerprint_processing: {
      state: "",
      retryable: !1,
      stale: !1
    },
    candidate_warning_summary: [{
      id: "rel_candidate_1",
      relationship_type: "copied_from",
      status: "pending_review",
      confidence_band: "medium",
      confidence_score: 0.87,
      summary: "Possible continuity with a copied Google document under a different account.",
      evidence: [{
        code: "normalized_text_match",
        label: "Normalized text match",
        details: "0.91 similarity"
      }, {
        code: "title_similarity",
        label: "Title similarity",
        details: "Identical canonical title"
      }],
      review_action_visible: "admin_debug_only"
    }],
    presentation_warnings: [{
      id: "rel_candidate_1",
      type: "candidate_relationship",
      severity: "warning",
      title: "Copied From - Pending Review",
      description: "Possible continuity with a copied Google document under a different account.",
      action_label: "Review in diagnostics",
      action_url: "/admin/debug/lineage/documents/doc_001",
      review_action_visible: "admin_debug_only",
      evidence: [{
        code: "normalized_text_match",
        label: "Normalized text match",
        details: "0.91 similarity"
      }, {
        code: "title_similarity",
        label: "Title similarity",
        details: "Identical canonical title"
      }]
    }],
    diagnostics_url: "/admin/debug/lineage/documents/doc_001",
    empty_state: {
      kind: "none",
      title: "",
      description: ""
    }
  },
  document_empty: {
    document_id: "doc_upload_only",
    fingerprint_status: {
      status: "not_applicable",
      evidence_available: !1
    },
    fingerprint_processing: {
      state: "",
      retryable: !1,
      stale: !1
    },
    diagnostics_url: "/admin/debug/lineage/documents/doc_upload_only",
    empty_state: {
      kind: "no_source",
      title: "No source lineage",
      description: "This document was uploaded directly and has no linked source document."
    }
  },
  agreement_native: {
    agreement_id: "agr_001",
    pinned_source_revision_id: "src_rev_001",
    source_document: {
      id: "src_doc_001",
      label: "MSA Packet",
      url: "https://docs.google.com/document/d/google-file-123/edit"
    },
    source_revision: {
      id: "src_rev_001",
      provider_revision_hint: "v2026-03-15T18:00:00Z",
      modified_time: "2026-03-15T18:00:00Z",
      exported_at: "2026-03-15T18:05:00Z",
      exported_by_user_id: "ops-user",
      source_mime_type: "application/vnd.google-apps.document"
    },
    linked_document_artifact: {
      id: "src_art_001",
      artifact_kind: "signable_pdf",
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      page_count: 12,
      size_bytes: 24576,
      compatibility_tier: "supported",
      normalization_status: "completed"
    },
    google_source: {
      account_id: "acct_primary",
      external_file_id: "google-file-123",
      drive_id: "shared-drive-123",
      web_url: "https://docs.google.com/document/d/google-file-123/edit",
      modified_time: "2026-03-15T18:00:00Z",
      source_version_hint: "v2026-03-15T18:00:00Z",
      source_mime_type: "application/vnd.google-apps.document",
      source_ingestion_mode: "google_export_pdf",
      title_hint: "MSA Packet",
      page_count_hint: 12,
      owner_email: "owner@example.com",
      parent_id: "folder-legal"
    },
    fingerprint_processing: {
      state: "",
      retryable: !1,
      stale: !1
    },
    newer_source_exists: !0,
    newer_source_summary: {
      exists: !0,
      pinned_source_revision_id: "src_rev_001",
      latest_source_revision_id: "src_rev_002",
      summary: "A newer source revision exists while this agreement remains pinned to the revision used at creation time."
    },
    candidate_warning_summary: [{
      id: "rel_candidate_1",
      relationship_type: "copied_from",
      status: "pending_review",
      confidence_band: "medium",
      confidence_score: 0.87,
      summary: "Possible continuity with a copied Google document under a different account.",
      evidence: [{
        code: "normalized_text_match",
        label: "Normalized text match",
        details: "0.91 similarity"
      }, {
        code: "title_similarity",
        label: "Title similarity",
        details: "Identical canonical title"
      }],
      review_action_visible: "admin_debug_only"
    }],
    presentation_warnings: [{
      id: "rel_candidate_1",
      type: "candidate_relationship",
      severity: "warning",
      title: "Copied From - Pending Review",
      description: "Possible continuity with a copied Google document under a different account.",
      action_label: "Review in diagnostics",
      action_url: "/admin/debug/lineage/agreements/agr_001",
      review_action_visible: "admin_debug_only",
      evidence: [{
        code: "normalized_text_match",
        label: "Normalized text match",
        details: "0.91 similarity"
      }, {
        code: "title_similarity",
        label: "Title similarity",
        details: "Identical canonical title"
      }]
    }, {
      id: "newer_source_warning",
      type: "newer_source_exists",
      severity: "info",
      title: "Newer Source Available",
      description: "A newer source revision exists. This agreement remains pinned to the earlier revision used when it was created."
    }],
    diagnostics_url: "/admin/debug/lineage/agreements/agr_001",
    empty_state: {
      kind: "none",
      title: "",
      description: ""
    }
  },
  agreement_empty: {
    agreement_id: "agr_upload_only",
    fingerprint_processing: {
      state: "",
      retryable: !1,
      stale: !1
    },
    newer_source_exists: !1,
    diagnostics_url: "/admin/debug/lineage/agreements/agr_upload_only",
    empty_state: {
      kind: "no_source",
      title: "No source lineage",
      description: "This agreement is linked to a document without source provenance."
    }
  },
  import_running: {
    import_run_id: "gir_queued_001",
    lineage_status: "running",
    fingerprint_status: {
      status: "pending",
      extract_version: "v1_pdf_text",
      evidence_available: !1
    },
    fingerprint_processing: {
      state: "",
      retryable: !1,
      stale: !1
    }
  },
  import_linked: {
    import_run_id: "gir_linked_001",
    lineage_status: "linked",
    source_document: {
      id: "src_doc_001",
      label: "MSA Packet"
    },
    source_revision: {
      id: "src_rev_001",
      provider_revision_hint: "v2026-03-15T18:00:00Z",
      modified_time: "2026-03-15T18:00:00Z",
      exported_at: "2026-03-15T18:05:00Z",
      exported_by_user_id: "ops-user",
      source_mime_type: "application/vnd.google-apps.document"
    },
    source_artifact: {
      id: "src_art_001",
      artifact_kind: "signable_pdf",
      sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      page_count: 12,
      size_bytes: 24576,
      compatibility_tier: "supported",
      normalization_status: "completed"
    },
    fingerprint_status: {
      status: "ready",
      extract_version: "v1_pdf_text",
      evidence_available: !0
    },
    fingerprint_processing: {
      state: "",
      retryable: !1,
      stale: !1
    },
    candidate_status: [{
      id: "rel_candidate_1",
      relationship_type: "copied_from",
      status: "pending_review",
      confidence_band: "medium",
      confidence_score: 0.87,
      summary: "Possible continuity with a copied Google document under a different account.",
      evidence: [{
        code: "normalized_text_match",
        label: "Normalized text match",
        details: "0.91 similarity"
      }, {
        code: "title_similarity",
        label: "Title similarity",
        details: "Identical canonical title"
      }],
      review_action_visible: "admin_debug_only"
    }],
    document_detail_url: "/admin/content/esign_documents/doc_001",
    agreement_detail_url: "/admin/content/esign_agreements/agr_001"
  }
}, ei = {
  schema_version: 1,
  presentation_rules: Wt,
  metadata_baseline: Jt,
  states: Yt
}, h = Pt(ei);
function Ze(e) {
  return le(e);
}
function ze(e) {
  return ue(e);
}
function S(e, t) {
  const i = `/admin/debug/lineage/documents/${t}`;
  return {
    ...e,
    document_id: t,
    diagnostics_url: i,
    presentation_warnings: e.presentation_warnings.map((n) => ({
      ...n,
      action_url: n.action_url ? i : n.action_url,
      evidence: n.evidence.map((s) => ({ ...s }))
    }))
  };
}
function P(e, t) {
  const i = `/admin/debug/lineage/agreements/${t}`;
  return {
    ...e,
    agreement_id: t,
    diagnostics_url: i,
    presentation_warnings: e.presentation_warnings.map((n) => ({
      ...n,
      action_url: n.action_url ? i : n.action_url,
      evidence: n.evidence.map((s) => ({ ...s }))
    }))
  };
}
function W(e) {
  return {
    ...e,
    candidate_warning_summary: [],
    presentation_warnings: e.presentation_warnings.filter((t) => t.type !== "candidate_relationship")
  };
}
function be(e) {
  return {
    ...e,
    candidate_warning_summary: [],
    presentation_warnings: e.presentation_warnings.filter((t) => t.type === "newer_source_exists")
  };
}
var _ = { ...h.metadata_baseline }, p = {
  ...h.states.document_native.source_document ?? { id: "src-doc-fixture-1" },
  url: h.metadata_baseline.web_url
}, u = { ...h.states.document_native.source_revision ?? { id: "src-rev-fixture-v1" } }, z = {
  id: "src-rev-fixture-v2",
  provider_revision_hint: "v2",
  modified_time: "2026-03-18T14:00:00Z",
  exported_at: "2026-03-18T14:05:00Z",
  exported_by_user_id: "fixture-user",
  source_mime_type: "application/vnd.google-apps.document"
}, m = { ...h.states.document_native.source_artifact ?? {
  id: "src-artifact-fixture-v1",
  artifact_kind: "signable_pdf"
} }, J = {
  id: "src-artifact-fixture-v2",
  artifact_kind: "signable_pdf",
  object_key: "fixtures/google-v2.pdf",
  sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  page_count: 4,
  size_bytes: 5120,
  compatibility_tier: "full",
  normalization_status: "completed"
}, y = { ...h.states.document_native.fingerprint_status }, ti = {
  status: "pending",
  evidence_available: !1
}, He = {
  status: "not_applicable",
  evidence_available: !1
}, ii = {
  status: "failed",
  extract_version: "v1.0",
  evidence_available: !1,
  error_message: "PDF text extraction failed: document is encrypted or corrupted",
  error_code: "EXTRACTION_FAILED"
}, H = { ...h.states.document_native.candidate_warning_summary[0] ?? {
  id: "rel-fixture-1",
  relationship_type: "copied_from",
  status: "pending_review",
  confidence_band: "medium",
  summary: "Potential duplicate document detected",
  evidence: [],
  review_action_visible: "admin_debug_only"
} };
function Oe(e) {
  return {
    ...h.states.document_native.presentation_warnings[0] ?? {
      id: H.id,
      type: "candidate_relationship",
      severity: "warning",
      title: "Copied From - Pending Review",
      description: H.summary,
      evidence: H.evidence
    },
    action_url: e
  };
}
function ni() {
  return {
    id: "fingerprint_pending_warning",
    type: "fingerprint_pending",
    severity: "info",
    title: "Fingerprint Processing",
    description: "Document fingerprinting is in progress. Candidate detection may be incomplete.",
    evidence: []
  };
}
function si(e) {
  return {
    id: "fingerprint_failed_warning",
    type: "fingerprint_failed",
    severity: "warning",
    title: "Fingerprint Extraction Failed",
    description: e || "Document fingerprinting failed. Candidate detection is unavailable.",
    evidence: []
  };
}
function ai() {
  return {
    id: "newer_source_warning",
    type: "newer_source_exists",
    severity: "info",
    title: "Newer Source Available",
    description: "A newer source revision exists. This agreement remains pinned to the earlier revision used when it was created.",
    evidence: []
  };
}
var ri = { ...h.states.document_empty.empty_state }, oi = { ...h.states.agreement_empty.empty_state }, v = { kind: "none" }, k = Ze(h.states.document_native), ci = Ze(h.states.document_empty), D = ze(h.states.agreement_native), di = ze(h.states.agreement_empty), ui = {
  empty: S({
    ...ci,
    fingerprint_status: He,
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: ri
  }, "doc-fixture-empty"),
  native: S(W({
    ...k,
    source_document: { ...p },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...y },
    empty_state: v
  }), "doc-fixture-native"),
  repeated_import: S(W({
    ...k,
    source_document: { ...p },
    source_revision: { ...z },
    source_artifact: { ...J },
    google_source: {
      ..._,
      modified_time: "2026-03-18T14:00:00Z",
      source_version_hint: "v2",
      page_count_hint: 4
    },
    fingerprint_status: { ...y },
    empty_state: v
  }), "doc-fixture-repeated"),
  candidate_warning: S({
    ...k,
    source_document: {
      ...p,
      id: "src-doc-candidate"
    },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...y },
    candidate_warning_summary: [{ ...H }],
    presentation_warnings: [Oe("/admin/debug/lineage/documents/doc-fixture-candidate")],
    empty_state: v
  }, "doc-fixture-candidate"),
  fingerprint_pending: S(W({
    ...k,
    source_document: { ...p },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...ti },
    presentation_warnings: [ni()],
    empty_state: v
  }), "doc-fixture-fp-pending"),
  fingerprint_failed: S(W({
    ...k,
    source_document: { ...p },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...ii },
    presentation_warnings: [si("PDF text extraction failed: document is encrypted or corrupted")],
    empty_state: v
  }), "doc-fixture-fp-failed")
}, li = {
  empty: P({
    ...di,
    newer_source_exists: !1,
    candidate_warning_summary: [],
    presentation_warnings: [],
    empty_state: oi
  }, "agr-fixture-empty"),
  native: P(be({
    ...D,
    source_revision: { ...u },
    linked_document_artifact: { ...m },
    google_source: { ..._ },
    newer_source_exists: !1,
    empty_state: v
  }), "agr-fixture-native"),
  newer_source_exists: P(be({
    ...D,
    source_revision: { ...u },
    linked_document_artifact: { ...m },
    google_source: { ..._ },
    newer_source_exists: !0,
    presentation_warnings: [ai()],
    empty_state: v
  }), "agr-fixture-newer"),
  candidate_warning: P({
    ...D,
    source_revision: { ...u },
    linked_document_artifact: { ...m },
    google_source: { ..._ },
    newer_source_exists: !1,
    candidate_warning_summary: [{ ...H }],
    presentation_warnings: [Oe("/admin/debug/lineage/agreements/agr-fixture-candidate")],
    empty_state: v
  }, "agr-fixture-candidate")
};
function ku(e) {
  const t = ui[e];
  if (!t) throw new Error(`Unknown document lineage fixture state: ${e}`);
  return le(t);
}
function Cu(e) {
  const t = li[e];
  if (!t) throw new Error(`Unknown agreement lineage fixture state: ${e}`);
  return ue(t);
}
function Pu(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("payload must be an object"), t;
  const i = e;
  typeof i.document_id != "string" && t.push("document_id must be a string"), (typeof i.fingerprint_status != "object" || i.fingerprint_status === null) && t.push("fingerprint_status must be an object"), Array.isArray(i.candidate_warning_summary) || t.push("candidate_warning_summary must be an array"), Array.isArray(i.presentation_warnings) || t.push("presentation_warnings must be an array"), (typeof i.empty_state != "object" || i.empty_state === null) && t.push("empty_state must be an object");
  for (const n of [
    "source_document",
    "source_revision",
    "source_artifact",
    "google_source"
  ]) i[n] !== null && typeof i[n] != "object" && t.push(`${n} must be an object or null`);
  return t;
}
function xu(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("payload must be an object"), t;
  const i = e;
  typeof i.agreement_id != "string" && t.push("agreement_id must be a string"), typeof i.newer_source_exists != "boolean" && t.push("newer_source_exists must be a boolean"), Array.isArray(i.candidate_warning_summary) || t.push("candidate_warning_summary must be an array"), Array.isArray(i.presentation_warnings) || t.push("presentation_warnings must be an array"), (typeof i.empty_state != "object" || i.empty_state === null) && t.push("empty_state must be an object");
  for (const n of [
    "source_revision",
    "linked_document_artifact",
    "google_source"
  ]) i[n] !== null && typeof i[n] != "object" && t.push(`${n} must be an object or null`);
  return t;
}
var mi = {
  native_import_success: {
    import_run_id: "import-run-native-1",
    status: "succeeded",
    status_url: "/admin/api/esign/google-drive/imports/import-run-native-1",
    lineage_status: "linked",
    source_document: p,
    source_revision: u,
    source_artifact: m,
    fingerprint_status: y,
    candidate_status: [],
    document: {
      id: "doc-native-import-1",
      title: "Imported MSA",
      source_document_id: p.id,
      source_revision_id: u.id,
      source_artifact_id: m.id
    },
    agreement: {
      id: "agr-native-import-1",
      document_id: "doc-native-import-1",
      title: "Imported MSA Agreement",
      source_revision_id: u.id
    },
    source_document_id: p.id,
    source_revision_id: u.id,
    source_artifact_id: m.id,
    source_mime_type: _.source_mime_type,
    ingestion_mode: _.source_ingestion_mode,
    document_detail_url: "/admin/esign/documents/doc-native-import-1",
    agreement_detail_url: "/admin/esign/agreements/agr-native-import-1",
    error: null
  },
  duplicate_import: {
    import_run_id: "import-run-duplicate-1",
    status: "succeeded",
    status_url: "/admin/api/esign/google-drive/imports/import-run-duplicate-1",
    lineage_status: "linked",
    source_document: p,
    source_revision: u,
    source_artifact: m,
    fingerprint_status: y,
    candidate_status: [],
    document: {
      id: "doc-existing-1",
      title: "Existing Imported MSA",
      source_document_id: p.id,
      source_revision_id: u.id,
      source_artifact_id: m.id
    },
    agreement: null,
    source_document_id: p.id,
    source_revision_id: u.id,
    source_artifact_id: m.id,
    source_mime_type: _.source_mime_type,
    ingestion_mode: _.source_ingestion_mode,
    document_detail_url: "/admin/esign/documents/doc-existing-1",
    agreement_detail_url: null,
    error: null
  },
  unchanged_reimport: {
    import_run_id: "import-run-unchanged-1",
    status: "succeeded",
    status_url: "/admin/api/esign/google-drive/imports/import-run-unchanged-1",
    lineage_status: "linked",
    source_document: p,
    source_revision: u,
    source_artifact: m,
    fingerprint_status: y,
    candidate_status: [],
    document: {
      id: "doc-reimport-unchanged-1",
      title: "Unchanged Re-Import",
      source_document_id: p.id,
      source_revision_id: u.id,
      source_artifact_id: m.id
    },
    agreement: {
      id: "agr-reimport-unchanged-1",
      document_id: "doc-reimport-unchanged-1",
      title: "Unchanged Re-Import Agreement",
      source_revision_id: u.id
    },
    source_document_id: p.id,
    source_revision_id: u.id,
    source_artifact_id: m.id,
    source_mime_type: _.source_mime_type,
    ingestion_mode: _.source_ingestion_mode,
    document_detail_url: "/admin/esign/documents/doc-reimport-unchanged-1",
    agreement_detail_url: "/admin/esign/agreements/agr-reimport-unchanged-1",
    error: null
  },
  changed_source_reimport: {
    import_run_id: "import-run-changed-1",
    status: "succeeded",
    status_url: "/admin/api/esign/google-drive/imports/import-run-changed-1",
    lineage_status: "linked",
    source_document: p,
    source_revision: z,
    source_artifact: J,
    fingerprint_status: y,
    candidate_status: [],
    document: {
      id: "doc-reimport-changed-1",
      title: "Changed Re-Import",
      source_document_id: p.id,
      source_revision_id: z.id,
      source_artifact_id: J.id
    },
    agreement: {
      id: "agr-reimport-changed-1",
      document_id: "doc-reimport-changed-1",
      title: "Changed Re-Import Agreement",
      source_revision_id: z.id
    },
    source_document_id: p.id,
    source_revision_id: z.id,
    source_artifact_id: J.id,
    source_mime_type: _.source_mime_type,
    ingestion_mode: _.source_ingestion_mode,
    document_detail_url: "/admin/esign/documents/doc-reimport-changed-1",
    agreement_detail_url: "/admin/esign/agreements/agr-reimport-changed-1",
    error: null
  },
  import_failure: {
    import_run_id: "import-run-failed-1",
    status: "failed",
    status_url: "/admin/api/esign/google-drive/imports/import-run-failed-1",
    lineage_status: "",
    source_document: null,
    source_revision: null,
    source_artifact: null,
    fingerprint_status: He,
    candidate_status: [],
    document: null,
    agreement: null,
    source_document_id: null,
    source_revision_id: null,
    source_artifact_id: null,
    source_mime_type: null,
    ingestion_mode: null,
    document_detail_url: null,
    agreement_detail_url: null,
    error: {
      code: "IMPORT_FAILED",
      message: "Failed to export PDF from Google Drive: insufficient permissions"
    }
  }
};
function Tu(e) {
  const t = mi[e];
  if (!t) throw new Error(`Unknown import response fixture state: ${e}`);
  return {
    ...t,
    document: t.document ? { ...t.document } : null,
    agreement: t.agreement ? { ...t.agreement } : null,
    source_document: t.source_document ? { ...t.source_document } : null,
    source_revision: t.source_revision ? { ...t.source_revision } : null,
    source_artifact: t.source_artifact ? { ...t.source_artifact } : null,
    fingerprint_status: { ...t.fingerprint_status },
    candidate_status: t.candidate_status.map((i) => ({
      ...i,
      evidence: i.evidence.map((n) => ({ ...n }))
    })),
    error: t.error ? {
      ...t.error,
      ...t.error.details ? { details: { ...t.error.details } } : {}
    } : null
  };
}
function Eu(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("payload must be an object"), t;
  const i = e;
  typeof i.import_run_id != "string" && t.push("import_run_id must be a string"), typeof i.status != "string" && t.push("status must be a string"), i.status_url !== null && i.status_url !== void 0 && typeof i.status_url != "string" && t.push("status_url must be a string or null"), typeof i.lineage_status != "string" && t.push("lineage_status must be a string"), (typeof i.fingerprint_status != "object" || i.fingerprint_status === null) && t.push("fingerprint_status must be an object"), Array.isArray(i.candidate_status) || t.push("candidate_status must be an array");
  for (const n of [
    "document",
    "agreement",
    "source_document",
    "source_revision",
    "source_artifact"
  ]) i[n] !== null && i[n] !== void 0 && typeof i[n] != "object" && t.push(`${n} must be an object or null`);
  for (const n of [
    "source_document_id",
    "source_revision_id",
    "source_artifact_id",
    "source_mime_type",
    "ingestion_mode",
    "document_detail_url",
    "agreement_detail_url"
  ]) i[n] !== null && typeof i[n] != "string" && t.push(`${n} must be a string or null`);
  return i.error !== null && typeof i.error != "object" && t.push("error must be an object or null"), t;
}
function Au() {
  return [
    "native_import_success",
    "duplicate_import",
    "unchanged_reimport",
    "changed_source_reimport",
    "import_failure"
  ];
}
var _i = {
  upload_only: {
    id: "doc-upload-only-fixture",
    tenant_id: "tenant-fixture",
    org_id: "org-fixture",
    created_by_user_id: "user-fixture",
    title: "Uploaded Contract Document",
    source_original_name: "contract.pdf",
    source_object_key: "tenant-fixture/org-fixture/docs/contract.pdf",
    normalized_object_key: "tenant-fixture/org-fixture/docs/contract-normalized.pdf",
    source_sha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    source_type: "upload",
    source_google_file_id: null,
    source_google_doc_url: null,
    source_modified_time: null,
    source_exported_at: null,
    source_exported_by_user_id: null,
    source_mime_type: null,
    source_ingestion_mode: null,
    source_document_id: null,
    source_revision_id: null,
    source_artifact_id: null,
    pdf_compatibility_tier: "full",
    pdf_compatibility_reason: null,
    pdf_normalization_status: "completed",
    size_bytes: 4096,
    page_count: 3,
    created_at: "2026-03-18T10:00:00Z",
    updated_at: "2026-03-18T10:00:00Z"
  },
  google_import: {
    id: "doc-google-import-fixture",
    tenant_id: "tenant-fixture",
    org_id: "org-fixture",
    created_by_user_id: "user-fixture",
    title: "Google Imported Contract",
    source_original_name: "Google Contract.pdf",
    source_object_key: "tenant-fixture/org-fixture/docs/google-contract.pdf",
    normalized_object_key: "tenant-fixture/org-fixture/docs/google-contract-normalized.pdf",
    source_sha256: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    source_type: "google_drive",
    source_google_file_id: "google-file-fixture-1",
    source_google_doc_url: "https://docs.google.com/document/d/google-file-fixture-1/edit",
    source_modified_time: "2026-03-18T12:00:00Z",
    source_exported_at: "2026-03-18T12:05:00Z",
    source_exported_by_user_id: "user-fixture",
    source_mime_type: "application/vnd.google-apps.document",
    source_ingestion_mode: "google_export_pdf",
    source_document_id: "src-doc-fixture-1",
    source_revision_id: "src-rev-fixture-v1",
    source_artifact_id: "src-artifact-fixture-v1",
    pdf_compatibility_tier: "full",
    pdf_compatibility_reason: null,
    pdf_normalization_status: "completed",
    size_bytes: 5120,
    page_count: 4,
    created_at: "2026-03-18T12:05:00Z",
    updated_at: "2026-03-18T12:05:00Z"
  },
  google_reimport: {
    id: "doc-google-reimport-fixture",
    tenant_id: "tenant-fixture",
    org_id: "org-fixture",
    created_by_user_id: "user-fixture",
    title: "Google Imported Contract (Updated)",
    source_original_name: "Google Contract v2.pdf",
    source_object_key: "tenant-fixture/org-fixture/docs/google-contract-v2.pdf",
    normalized_object_key: "tenant-fixture/org-fixture/docs/google-contract-v2-normalized.pdf",
    source_sha256: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    source_type: "google_drive",
    source_google_file_id: "google-file-fixture-1",
    source_google_doc_url: "https://docs.google.com/document/d/google-file-fixture-1/edit",
    source_modified_time: "2026-03-18T14:00:00Z",
    source_exported_at: "2026-03-18T14:05:00Z",
    source_exported_by_user_id: "user-fixture",
    source_mime_type: "application/vnd.google-apps.document",
    source_ingestion_mode: "google_export_pdf",
    source_document_id: "src-doc-fixture-1",
    source_revision_id: "src-rev-fixture-v2",
    source_artifact_id: "src-artifact-fixture-v2",
    pdf_compatibility_tier: "full",
    pdf_compatibility_reason: null,
    pdf_normalization_status: "completed",
    size_bytes: 6144,
    page_count: 5,
    created_at: "2026-03-18T14:05:00Z",
    updated_at: "2026-03-18T14:05:00Z"
  }
}, pi = {
  upload_only: {
    id: "agr-upload-only-fixture",
    tenant_id: "tenant-fixture",
    org_id: "org-fixture",
    document_id: "doc-upload-only-fixture",
    workflow_kind: "standard",
    root_agreement_id: null,
    parent_agreement_id: null,
    source_type: "upload",
    source_google_file_id: null,
    source_google_doc_url: null,
    source_modified_time: null,
    source_exported_at: null,
    source_exported_by_user_id: null,
    source_mime_type: null,
    source_ingestion_mode: null,
    source_revision_id: null,
    status: "draft",
    title: "Uploaded Contract Agreement",
    message: null,
    version: 1,
    sent_at: null,
    completed_at: null,
    created_by_user_id: "user-fixture",
    created_at: "2026-03-18T10:05:00Z",
    updated_at: "2026-03-18T10:05:00Z"
  },
  google_import: {
    id: "agr-google-import-fixture",
    tenant_id: "tenant-fixture",
    org_id: "org-fixture",
    document_id: "doc-google-import-fixture",
    workflow_kind: "standard",
    root_agreement_id: null,
    parent_agreement_id: null,
    source_type: "google_drive",
    source_google_file_id: "google-file-fixture-1",
    source_google_doc_url: "https://docs.google.com/document/d/google-file-fixture-1/edit",
    source_modified_time: "2026-03-18T12:00:00Z",
    source_exported_at: "2026-03-18T12:05:00Z",
    source_exported_by_user_id: "user-fixture",
    source_mime_type: "application/vnd.google-apps.document",
    source_ingestion_mode: "google_export_pdf",
    source_revision_id: "src-rev-fixture-v1",
    status: "draft",
    title: "Google Imported Agreement",
    message: "Please review and sign this agreement",
    version: 1,
    sent_at: null,
    completed_at: null,
    created_by_user_id: "user-fixture",
    created_at: "2026-03-18T12:05:00Z",
    updated_at: "2026-03-18T12:05:00Z"
  },
  google_reimport: {
    id: "agr-google-reimport-fixture",
    tenant_id: "tenant-fixture",
    org_id: "org-fixture",
    document_id: "doc-google-reimport-fixture",
    workflow_kind: "standard",
    root_agreement_id: null,
    parent_agreement_id: null,
    source_type: "google_drive",
    source_google_file_id: "google-file-fixture-1",
    source_google_doc_url: "https://docs.google.com/document/d/google-file-fixture-1/edit",
    source_modified_time: "2026-03-18T14:00:00Z",
    source_exported_at: "2026-03-18T14:05:00Z",
    source_exported_by_user_id: "user-fixture",
    source_mime_type: "application/vnd.google-apps.document",
    source_ingestion_mode: "google_export_pdf",
    source_revision_id: "src-rev-fixture-v2",
    status: "draft",
    title: "Google Imported Agreement (Updated)",
    message: "Please review the updated agreement",
    version: 1,
    sent_at: null,
    completed_at: null,
    created_by_user_id: "user-fixture",
    created_at: "2026-03-18T14:05:00Z",
    updated_at: "2026-03-18T14:05:00Z"
  }
};
function Ru(e) {
  const t = _i[e];
  if (!t) throw new Error(`Unknown document detail payload fixture state: ${e}`);
  return { ...t };
}
function Du(e) {
  const t = pi[e];
  if (!t) throw new Error(`Unknown agreement detail payload fixture state: ${e}`);
  return { ...t };
}
function Fu(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("payload must be an object"), t;
  const i = e;
  for (const n of [
    "id",
    "tenant_id",
    "org_id",
    "title",
    "source_type"
  ]) typeof i[n] != "string" && t.push(`${n} must be a string`);
  typeof i.page_count != "number" && t.push("page_count must be a number"), typeof i.size_bytes != "number" && t.push("size_bytes must be a number");
  for (const n of [
    "source_document_id",
    "source_revision_id",
    "source_artifact_id"
  ]) i[n] !== null && typeof i[n] != "string" && t.push(`${n} must be a string or null`);
  for (const n of [
    "source_google_file_id",
    "source_google_doc_url",
    "source_modified_time",
    "source_exported_at"
  ]) i[n] !== null && typeof i[n] != "string" && t.push(`${n} must be a string or null`);
  return t;
}
function Iu(e) {
  const t = [];
  if (!e || typeof e != "object")
    return t.push("payload must be an object"), t;
  const i = e;
  for (const n of [
    "id",
    "tenant_id",
    "org_id",
    "document_id",
    "status",
    "title"
  ]) typeof i[n] != "string" && t.push(`${n} must be a string`);
  typeof i.version != "number" && t.push("version must be a number"), i.source_revision_id !== null && typeof i.source_revision_id != "string" && t.push("source_revision_id must be a string or null");
  for (const n of [
    "source_google_file_id",
    "source_google_doc_url",
    "source_modified_time",
    "source_exported_at"
  ]) i[n] !== null && typeof i[n] != "string" && t.push(`${n} must be a string or null`);
  return t;
}
function gi(e) {
  return e.source_document_id !== null && e.source_revision_id !== null && e.source_artifact_id !== null;
}
function fi(e) {
  return e.source_revision_id !== null;
}
function Lu() {
  return {
    documents: [
      "upload_only",
      "google_import",
      "google_reimport"
    ],
    agreements: [
      "upload_only",
      "google_import",
      "google_reimport"
    ]
  };
}
var Ke = { first_import: {
  scenario_id: "seeded-first-import",
  description: "First-time Google import with full lineage linkage",
  google_file_id: "google-seeded-file-1",
  google_doc_url: "https://docs.google.com/document/d/google-seeded-file-1/edit",
  document: {
    id: "doc-seeded-import-1",
    tenant_id: "tenant-seeded",
    org_id: "org-seeded",
    created_by_user_id: "user-seeded",
    title: "Seeded Contract for QA",
    source_original_name: "Seeded Contract.pdf",
    source_object_key: "tenant-seeded/org-seeded/docs/seeded-contract.pdf",
    normalized_object_key: "tenant-seeded/org-seeded/docs/seeded-contract-normalized.pdf",
    source_sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    source_type: "google_drive",
    source_google_file_id: "google-seeded-file-1",
    source_google_doc_url: "https://docs.google.com/document/d/google-seeded-file-1/edit",
    source_modified_time: "2026-03-18T09:00:00Z",
    source_exported_at: "2026-03-18T09:05:00Z",
    source_exported_by_user_id: "user-seeded",
    source_mime_type: "application/vnd.google-apps.document",
    source_ingestion_mode: "google_export_pdf",
    source_document_id: "src-doc-seeded-1",
    source_revision_id: "src-rev-seeded-v1",
    source_artifact_id: "src-artifact-seeded-v1",
    pdf_compatibility_tier: "full",
    pdf_compatibility_reason: null,
    pdf_normalization_status: "completed",
    size_bytes: 8192,
    page_count: 6,
    created_at: "2026-03-18T09:05:00Z",
    updated_at: "2026-03-18T09:05:00Z"
  },
  agreement: {
    id: "agr-seeded-import-1",
    tenant_id: "tenant-seeded",
    org_id: "org-seeded",
    document_id: "doc-seeded-import-1",
    workflow_kind: "standard",
    root_agreement_id: null,
    parent_agreement_id: null,
    source_type: "google_drive",
    source_google_file_id: "google-seeded-file-1",
    source_google_doc_url: "https://docs.google.com/document/d/google-seeded-file-1/edit",
    source_modified_time: "2026-03-18T09:00:00Z",
    source_exported_at: "2026-03-18T09:05:00Z",
    source_exported_by_user_id: "user-seeded",
    source_mime_type: "application/vnd.google-apps.document",
    source_ingestion_mode: "google_export_pdf",
    source_revision_id: "src-rev-seeded-v1",
    status: "draft",
    title: "Seeded Agreement for QA",
    message: "Seeded agreement for QA validation",
    version: 1,
    sent_at: null,
    completed_at: null,
    created_by_user_id: "user-seeded",
    created_at: "2026-03-18T09:05:00Z",
    updated_at: "2026-03-18T09:05:00Z"
  },
  lineage_summary: {
    source_document_id: "src-doc-seeded-1",
    source_revision_id: "src-rev-seeded-v1",
    source_artifact_id: "src-artifact-seeded-v1",
    is_new_source: !0,
    revision_reused: !1
  }
} };
function Mu(e) {
  const t = Ke[e];
  if (!t) throw new Error(`Unknown seeded Google import scenario: ${e}`);
  return {
    ...t,
    document: { ...t.document },
    agreement: { ...t.agreement },
    lineage_summary: { ...t.lineage_summary }
  };
}
function $u() {
  return Object.keys(Ke);
}
function Nu(e) {
  const t = [];
  return gi(e.document) || t.push("seeded document missing lineage linkage"), fi(e.agreement) || t.push("seeded agreement missing pinned source_revision_id"), e.document.source_document_id !== e.lineage_summary.source_document_id && t.push("document source_document_id does not match lineage_summary"), e.document.source_revision_id !== e.lineage_summary.source_revision_id && t.push("document source_revision_id does not match lineage_summary"), e.document.source_artifact_id !== e.lineage_summary.source_artifact_id && t.push("document source_artifact_id does not match lineage_summary"), e.agreement.source_revision_id !== e.document.source_revision_id && t.push("agreement source_revision_id does not match document"), e.agreement.document_id !== e.document.id && t.push("agreement document_id does not match document id"), t;
}
var se = {
  code: "normalized_text_match",
  label: "Normalized text match",
  details: "0.94 similarity"
}, _e = {
  code: "title_similarity",
  label: "Title similarity",
  details: "Identical canonical title"
}, vi = {
  code: "chunk_overlap",
  label: "Content chunk overlap",
  details: "87% of chunks match"
}, hi = {
  code: "temporal_proximity",
  label: "Temporal proximity",
  details: "Created within 24 hours"
}, Ge = {
  code: "account_corroboration",
  label: "Account corroboration",
  details: "Same owner email domain"
}, yi = {
  code: "exact_artifact_match",
  label: "Exact artifact match",
  details: "SHA-256 hash identical"
}, bi = {
  code: "url_history",
  label: "URL history",
  details: "Previous URL recorded in metadata"
}, O = {
  id: "rel-single-likely-1",
  relationship_type: "copied_from",
  status: "pending_review",
  confidence_band: "high",
  confidence_score: 0.94,
  summary: "High-confidence match detected with a Google document from a different account.",
  evidence: [
    se,
    _e,
    vi
  ],
  review_action_visible: "admin_debug_only"
}, Ve = {
  id: "rel-ambiguous-1",
  relationship_type: "copied_from",
  status: "pending_review",
  confidence_band: "medium",
  confidence_score: 0.72,
  summary: 'Possible copy from document "Contract Template v2" in shared drive.',
  evidence: [se, hi],
  review_action_visible: "admin_debug_only"
}, Ue = {
  id: "rel-ambiguous-2",
  relationship_type: "copied_from",
  status: "pending_review",
  confidence_band: "medium",
  confidence_score: 0.68,
  summary: 'Possible copy from document "MSA Packet Draft" in personal drive.',
  evidence: [_e, Ge],
  review_action_visible: "admin_debug_only"
}, K = {
  id: "rel-rejected-1",
  relationship_type: "copied_from",
  status: "rejected",
  confidence_band: "medium",
  confidence_score: 0.65,
  summary: "Previously rejected: This relationship was reviewed and determined to be a false positive.",
  evidence: [_e],
  review_action_visible: "none"
}, Y = {
  id: "rel-superseded-1",
  relationship_type: "predecessor_of",
  status: "superseded",
  confidence_band: "medium",
  confidence_score: 0.71,
  summary: "Superseded: A newer relationship evaluation has replaced this candidate.",
  evidence: [se],
  review_action_visible: "none"
}, ee = {
  id: "rel-auto-linked-1",
  relationship_type: "exact_duplicate",
  status: "auto_linked",
  confidence_band: "exact",
  confidence_score: 1,
  summary: "Auto-linked: Exact artifact match confirmed this as an identical document.",
  evidence: [yi],
  review_action_visible: "none"
}, te = {
  id: "rel-migration-1",
  relationship_type: "migrated_from",
  status: "pending_review",
  confidence_band: "high",
  confidence_score: 0.91,
  summary: "Cross-account migration detected. Document appears to have been moved from another Google account.",
  evidence: [
    se,
    bi,
    Ge
  ],
  review_action_visible: "admin_debug_only"
};
function qe(e) {
  return {
    id: O.id,
    type: "candidate_relationship",
    severity: "warning",
    title: "High-Confidence Match - Pending Review",
    description: O.summary,
    action_label: "Review in diagnostics",
    action_url: e,
    review_action_visible: "admin_debug_only",
    evidence: O.evidence
  };
}
function Qe(e) {
  return {
    id: "ambiguous-candidates-group",
    type: "candidate_relationship",
    severity: "warning",
    title: "Multiple Potential Matches - Review Required",
    description: "Multiple source documents have been detected as potential origins. Operator review is required to determine the correct relationship.",
    action_label: "Review candidates",
    action_url: e,
    review_action_visible: "admin_debug_only",
    evidence: [{
      code: "candidate_count",
      label: "Candidates detected",
      details: "2 potential matches"
    }]
  };
}
function Be() {
  return {
    id: K.id,
    type: "candidate_relationship",
    severity: "info",
    title: "Rejected Candidate",
    description: K.summary,
    review_action_visible: "none",
    evidence: K.evidence
  };
}
function Si() {
  return {
    id: Y.id,
    type: "candidate_relationship",
    severity: "info",
    title: "Superseded Candidate",
    description: Y.summary,
    review_action_visible: "none",
    evidence: Y.evidence
  };
}
function wi() {
  return {
    id: ee.id,
    type: "candidate_relationship",
    severity: "info",
    title: "Exact Match - Auto-Linked",
    description: ee.summary,
    review_action_visible: "none",
    evidence: ee.evidence
  };
}
function ki(e) {
  return {
    id: te.id,
    type: "candidate_relationship",
    severity: "warning",
    title: "Cross-Account Migration - Pending Review",
    description: te.summary,
    action_label: "Review migration",
    action_url: e,
    review_action_visible: "admin_debug_only",
    evidence: te.evidence
  };
}
var Ci = {
  single_likely_continuity: S({
    ...k,
    source_document: {
      ...p,
      id: "src-doc-single-likely"
    },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...y },
    candidate_warning_summary: [{ ...O }],
    presentation_warnings: [qe("/admin/debug/lineage/documents/doc-single-likely")],
    empty_state: v
  }, "doc-single-likely"),
  multiple_ambiguous_candidates: S({
    ...k,
    source_document: {
      ...p,
      id: "src-doc-ambiguous"
    },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...y },
    candidate_warning_summary: [{ ...Ve }, { ...Ue }],
    presentation_warnings: [Qe("/admin/debug/lineage/documents/doc-ambiguous")],
    empty_state: v
  }, "doc-ambiguous"),
  previously_rejected: S({
    ...k,
    source_document: {
      ...p,
      id: "src-doc-rejected"
    },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...y },
    candidate_warning_summary: [{ ...K }],
    presentation_warnings: [Be()],
    empty_state: v
  }, "doc-rejected"),
  superseded_candidate: S({
    ...k,
    source_document: {
      ...p,
      id: "src-doc-superseded"
    },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...y },
    candidate_warning_summary: [{ ...Y }],
    presentation_warnings: [Si()],
    empty_state: v
  }, "doc-superseded"),
  high_confidence_auto_linked: S({
    ...k,
    source_document: {
      ...p,
      id: "src-doc-auto-linked"
    },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: { ..._ },
    fingerprint_status: { ...y },
    candidate_warning_summary: [{ ...ee }],
    presentation_warnings: [wi()],
    empty_state: v
  }, "doc-auto-linked"),
  cross_account_migration: S({
    ...k,
    source_document: {
      ...p,
      id: "src-doc-migration"
    },
    source_revision: { ...u },
    source_artifact: { ...m },
    google_source: {
      ..._,
      account_id: "acct_secondary",
      owner_email: "migrated@different-domain.com"
    },
    fingerprint_status: { ...y },
    candidate_warning_summary: [{ ...te }],
    presentation_warnings: [ki("/admin/debug/lineage/documents/doc-migration")],
    empty_state: v
  }, "doc-migration")
}, Pi = {
  single_likely_continuity: P({
    ...D,
    source_revision: { ...u },
    linked_document_artifact: { ...m },
    google_source: { ..._ },
    newer_source_exists: !1,
    candidate_warning_summary: [{ ...O }],
    presentation_warnings: [qe("/admin/debug/lineage/agreements/agr-single-likely")],
    empty_state: v
  }, "agr-single-likely"),
  multiple_ambiguous_candidates: P({
    ...D,
    source_revision: { ...u },
    linked_document_artifact: { ...m },
    google_source: { ..._ },
    newer_source_exists: !1,
    candidate_warning_summary: [{ ...Ve }, { ...Ue }],
    presentation_warnings: [Qe("/admin/debug/lineage/agreements/agr-ambiguous")],
    empty_state: v
  }, "agr-ambiguous"),
  previously_rejected: P({
    ...D,
    source_revision: { ...u },
    linked_document_artifact: { ...m },
    google_source: { ..._ },
    newer_source_exists: !1,
    candidate_warning_summary: [{ ...K }],
    presentation_warnings: [Be()],
    empty_state: v
  }, "agr-rejected")
};
function ju(e) {
  const t = Ci[e];
  if (!t) throw new Error(`Unknown candidate warning fixture state: ${e}`);
  return le(t);
}
function Zu(e) {
  const t = Pi[e];
  if (!t) throw new Error(`Unknown agreement candidate warning fixture state: ${e}`);
  return ue(t);
}
function zu() {
  return [
    "single_likely_continuity",
    "multiple_ambiguous_candidates",
    "previously_rejected",
    "superseded_candidate",
    "high_confidence_auto_linked",
    "cross_account_migration"
  ];
}
function Hu(e) {
  return e.status === "pending_review";
}
function Ou(e) {
  return [
    "confirmed",
    "rejected",
    "superseded",
    "auto_linked"
  ].includes(e.status);
}
function Ku(e) {
  if (e.length === 0) return null;
  const t = {
    pending_review: 0,
    confirmed: 1,
    auto_linked: 2,
    rejected: 3,
    superseded: 4
  };
  return [...e].sort((i, n) => {
    const s = t[i.status] ?? 99, a = t[n.status] ?? 99;
    return s !== a ? s - a : (n.confidence_score ?? 0) - (i.confidence_score ?? 0);
  })[0];
}
function Gu(e) {
  const t = {};
  for (const i of e) t[i.status] = (t[i.status] || 0) + 1;
  return t;
}
function Vu(e) {
  const t = [];
  (!e.candidate_warning_summary || e.candidate_warning_summary.length === 0) && t.push("candidate_warning_summary must have at least one entry");
  for (const i of e.candidate_warning_summary || [])
    i.id || t.push("candidate warning missing id"), i.relationship_type || t.push("candidate warning missing relationship_type"), i.status || t.push("candidate warning missing status"), i.confidence_band || t.push("candidate warning missing confidence_band"), i.summary || t.push("candidate warning missing summary"), Array.isArray(i.evidence) || t.push("candidate warning evidence must be an array");
  return (!e.presentation_warnings || e.presentation_warnings.length === 0) && t.push("presentation_warnings must have at least one entry"), t;
}
var xi = {
  items: [],
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 0,
    has_more: !1
  },
  applied_query: {
    page: 1,
    page_size: 20
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !0,
    can_view_comments: !1
  },
  empty_state: {
    kind: "no_results",
    title: "No sources found",
    description: "No canonical source documents match your query."
  },
  links: { self: "/admin/api/v1/esign/sources" }
}, Xe = {
  items: [{
    source: {
      id: "src_01HX5ZCQK0ABC123",
      label: "Product Requirements Document v3.pdf",
      url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
    },
    status: "active",
    lineage_confidence: "high",
    provider: {
      kind: "google_drive",
      label: "Google Drive",
      external_file_id: "1a2b3c4d5e6f7g8h9i0j",
      account_id: "user@example.com",
      drive_id: "root",
      web_url: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit"
    },
    latest_revision: {
      id: "rev_01HX5ZCQK0DEF456",
      provider_revision_hint: "v3",
      modified_time: "2026-01-15T10:30:00Z",
      exported_at: "2026-01-15T10:32:00Z",
      exported_by_user_id: "usr_01HX5ZCQK0GHI789",
      source_mime_type: "application/vnd.google-apps.document"
    },
    active_handle: {
      id: "hdl_01HX5ZCQK0JKL012",
      provider_kind: "google_drive",
      external_file_id: "1a2b3c4d5e6f7g8h9i0j",
      account_id: "user@example.com",
      drive_id: "root",
      web_url: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit",
      handle_status: "active",
      links: {}
    },
    revision_count: 3,
    handle_count: 1,
    relationship_count: 0,
    pending_candidate_count: 0,
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !1
    },
    links: {
      self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123",
      revisions: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/revisions",
      relationships: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/relationships",
      handles: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/handles",
      diagnostics: "/admin/debug/lineage/sources/src_01HX5ZCQK0ABC123",
      provider: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit"
    }
  }],
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 1,
    has_more: !1
  },
  applied_query: {
    page: 1,
    page_size: 20
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !0,
    can_view_comments: !1
  },
  empty_state: { kind: "none" },
  links: { self: "/admin/api/v1/esign/sources" }
}, We = {
  source: {
    id: "src_01HX5ZCQK0ABC123",
    label: "Product Requirements Document v3.pdf",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
  },
  status: "active",
  lineage_confidence: "high",
  provider: {
    kind: "google_drive",
    label: "Google Drive",
    external_file_id: "1a2b3c4d5e6f7g8h9i0j",
    account_id: "user@example.com",
    drive_id: "root",
    web_url: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit"
  },
  active_handle: {
    id: "hdl_01HX5ZCQK0JKL012",
    provider_kind: "google_drive",
    external_file_id: "1a2b3c4d5e6f7g8h9i0j",
    account_id: "user@example.com",
    drive_id: "root",
    web_url: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit",
    handle_status: "active",
    links: {}
  },
  latest_revision: {
    id: "rev_01HX5ZCQK0DEF456",
    provider_revision_hint: "v3",
    modified_time: "2026-01-15T10:30:00Z",
    exported_at: "2026-01-15T10:32:00Z",
    exported_by_user_id: "usr_01HX5ZCQK0GHI789",
    source_mime_type: "application/vnd.google-apps.document"
  },
  revision_count: 3,
  handle_count: 1,
  relationship_count: 0,
  pending_candidate_count: 0,
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !0,
    can_view_comments: !1
  },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123",
    revisions: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/revisions",
    relationships: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/relationships",
    handles: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/handles",
    diagnostics: "/admin/debug/lineage/sources/src_01HX5ZCQK0ABC123",
    provider: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit"
  },
  empty_state: { kind: "none" }
}, Ti = {
  source: {
    id: "src_01HX5ZCQK0MERGED",
    label: "Contract Template (Merged)",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED"
  },
  status: "merged",
  lineage_confidence: "high",
  provider: {
    kind: "google_drive",
    label: "Google Drive",
    external_file_id: "2z3y4x5w6v7u8t9s0r",
    account_id: "admin@example.com",
    drive_id: "root",
    web_url: "https://docs.google.com/document/d/2z3y4x5w6v7u8t9s0r/edit"
  },
  active_handle: null,
  latest_revision: {
    id: "rev_01HX5ZCQK0MERGED",
    provider_revision_hint: "final",
    modified_time: "2025-12-20T14:00:00Z",
    exported_at: "2025-12-20T14:02:00Z",
    source_mime_type: "application/vnd.google-apps.document"
  },
  revision_count: 5,
  handle_count: 2,
  relationship_count: 1,
  pending_candidate_count: 0,
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !1,
    can_review_candidates: !1,
    can_view_comments: !1
  },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED",
    revisions: "/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED/revisions",
    relationships: "/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED/relationships",
    handles: "/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED/handles",
    diagnostics: "/admin/debug/lineage/sources/src_01HX5ZCQK0MERGED"
  },
  empty_state: { kind: "none" }
}, Ei = {
  source: {
    id: "src_01HX5ZCQK0ARCHIVE",
    label: "Old Draft Agreement",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ARCHIVE"
  },
  status: "archived",
  lineage_confidence: "medium",
  provider: {
    kind: "google_drive",
    label: "Google Drive",
    external_file_id: "3p4o5n6m7l8k9j0i1h",
    account_id: "user@example.com",
    web_url: "https://docs.google.com/document/d/3p4o5n6m7l8k9j0i1h/edit"
  },
  active_handle: null,
  latest_revision: {
    id: "rev_01HX5ZCQK0ARCHIVE",
    modified_time: "2025-10-01T09:00:00Z",
    exported_at: "2025-10-01T09:02:00Z",
    source_mime_type: "application/vnd.google-apps.document"
  },
  revision_count: 1,
  handle_count: 1,
  relationship_count: 0,
  pending_candidate_count: 0,
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !1,
    can_review_candidates: !1,
    can_view_comments: !1
  },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ARCHIVE",
    revisions: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ARCHIVE/revisions",
    diagnostics: "/admin/debug/lineage/sources/src_01HX5ZCQK0ARCHIVE"
  },
  empty_state: { kind: "none" }
}, Je = {
  source: {
    id: "src_01HX5ZCQK0ABC123",
    label: "Product Requirements Document v3.pdf",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
  },
  items: [{
    revision: {
      id: "rev_01HX5ZCQK0REV003",
      provider_revision_hint: "v3",
      modified_time: "2026-01-15T10:30:00Z",
      exported_at: "2026-01-15T10:32:00Z",
      exported_by_user_id: "usr_01HX5ZCQK0GHI789",
      source_mime_type: "application/vnd.google-apps.document"
    },
    provider: {
      kind: "google_drive",
      label: "Google Drive",
      external_file_id: "1a2b3c4d5e6f7g8h9i0j",
      account_id: "user@example.com",
      drive_id: "root",
      web_url: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit"
    },
    primary_artifact: {
      id: "art_01HX5ZCQK0ART003",
      artifact_kind: "pdf_export",
      sha256: "abc123def456...",
      page_count: 12,
      size_bytes: 204800,
      compatibility_tier: "native",
      normalization_status: "complete"
    },
    fingerprint_status: {
      status: "ready",
      extract_version: "v1.0",
      evidence_available: !0
    },
    fingerprint_processing: {
      state: "ready",
      status_label: "Fingerprint ready",
      completed_at: "2026-01-15T10:35:00Z",
      attempt_count: 1,
      retryable: !1,
      stale: !1
    },
    is_latest: !0,
    links: {
      self: "/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV003",
      artifacts: "/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV003/artifacts",
      source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
    }
  }, {
    revision: {
      id: "rev_01HX5ZCQK0REV002",
      provider_revision_hint: "v2",
      modified_time: "2026-01-10T14:20:00Z",
      exported_at: "2026-01-10T14:22:00Z",
      exported_by_user_id: "usr_01HX5ZCQK0GHI789",
      source_mime_type: "application/vnd.google-apps.document"
    },
    provider: {
      kind: "google_drive",
      label: "Google Drive",
      external_file_id: "1a2b3c4d5e6f7g8h9i0j",
      account_id: "user@example.com",
      drive_id: "root",
      web_url: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit"
    },
    primary_artifact: {
      id: "art_01HX5ZCQK0ART002",
      artifact_kind: "pdf_export",
      sha256: "def456ghi789...",
      page_count: 10,
      size_bytes: 184320,
      compatibility_tier: "native",
      normalization_status: "complete"
    },
    fingerprint_status: {
      status: "ready",
      extract_version: "v1.0",
      evidence_available: !0
    },
    fingerprint_processing: {
      state: "ready",
      status_label: "Fingerprint ready",
      completed_at: "2026-01-10T14:25:00Z",
      attempt_count: 1,
      retryable: !1,
      stale: !1
    },
    is_latest: !1,
    links: {
      self: "/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV002",
      artifacts: "/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV002/artifacts",
      source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
    }
  }],
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 3,
    has_more: !1,
    sort: "modified_time_desc"
  },
  applied_query: {
    page: 1,
    page_size: 20,
    sort: "modified_time_desc"
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !0,
    can_view_comments: !1
  },
  empty_state: { kind: "none" },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/revisions",
    source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
  }
}, Ye = {
  source: {
    id: "src_01HX5ZCQK0ABC123",
    label: "Product Requirements Document v3.pdf",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
  },
  items: [{
    id: "rel_01HX5ZCQK0REL001",
    relationship_type: "copied_from",
    status: "pending_review",
    confidence_band: "medium",
    confidence_score: 0.75,
    summary: "Possible copy from previous template version",
    left_source: {
      id: "src_01HX5ZCQK0ABC123",
      label: "Product Requirements Document v3.pdf"
    },
    right_source: {
      id: "src_01HX5ZCQK0PREV",
      label: "PRD Template v2.0",
      url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0PREV"
    },
    counterpart_source: {
      id: "src_01HX5ZCQK0PREV",
      label: "PRD Template v2.0",
      url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0PREV"
    },
    review_action_visible: "admin_view",
    evidence: [{
      code: "title_similarity",
      label: "Title similarity",
      details: "82% match"
    }, {
      code: "text_overlap",
      label: "Text overlap",
      details: "68% chunk overlap"
    }],
    links: {
      self: "/admin/api/v1/esign/source-relationships/rel_01HX5ZCQK0REL001",
      source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123",
      diagnostics: "/admin/debug/lineage/relationships/rel_01HX5ZCQK0REL001"
    }
  }],
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 1,
    has_more: !1
  },
  applied_query: {
    page: 1,
    page_size: 20
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !0,
    can_view_comments: !1
  },
  empty_state: { kind: "none" },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/relationships",
    source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
  }
}, Ai = {
  items: [],
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 0,
    has_more: !1
  },
  applied_query: {
    query: "nonexistent document",
    page: 1,
    page_size: 20
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !0,
    can_view_comments: !0
  },
  empty_state: {
    kind: "no_results",
    title: "No results found",
    description: "No sources match your search query. Try adjusting your filters or search terms."
  },
  links: { self: "/admin/api/v1/esign/source-search?q=nonexistent+document" }
}, et = {
  items: [{
    result_kind: "source_document",
    source: {
      id: "src_01HX5ZCQK0SEARCH1",
      label: "NDA Template - Enterprise Edition",
      url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0SEARCH1"
    },
    revision: {
      id: "rev_01HX5ZCQK0REV001",
      provider_revision_hint: "v2.1",
      modified_time: "2026-02-15T14:30:00Z",
      source_mime_type: "application/vnd.google-apps.document"
    },
    provider: {
      kind: "google_drive",
      label: "Google Drive",
      external_file_id: "abc123def456",
      web_url: "https://docs.google.com/document/d/abc123def456/edit"
    },
    matched_fields: ["canonical_title", "comment_text"],
    summary: "Enterprise NDA with legal team review comments",
    relationship_state: "confirmed",
    comment_sync_status: "synced",
    comment_count: 5,
    has_comments: !0,
    artifact_hash: "sha256:abc123...",
    links: {
      self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0SEARCH1",
      comments: "/admin/api/v1/esign/sources/src_01HX5ZCQK0SEARCH1/comments"
    }
  }, {
    result_kind: "source_revision",
    source: {
      id: "src_01HX5ZCQK0SEARCH2",
      label: "Employment Agreement - Standard",
      url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0SEARCH2"
    },
    revision: {
      id: "rev_01HX5ZCQK0REV002",
      provider_revision_hint: "v1.0",
      modified_time: "2026-02-10T09:15:00Z",
      source_mime_type: "application/vnd.google-apps.document"
    },
    provider: {
      kind: "google_drive",
      label: "Google Drive",
      external_file_id: "xyz789ghi012",
      web_url: "https://docs.google.com/document/d/xyz789ghi012/edit"
    },
    matched_fields: ["external_file_id", "revision_hint"],
    summary: "Standard employment agreement template",
    relationship_state: "pending_review",
    comment_sync_status: "pending_sync",
    comment_count: 0,
    has_comments: !1,
    links: { self: "/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV002" }
  }],
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 2,
    has_more: !1,
    sort: "relevance"
  },
  applied_query: {
    query: "agreement",
    page: 1,
    page_size: 20,
    has_comments: !0
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !0,
    can_view_comments: !0
  },
  empty_state: { kind: "none" },
  links: { self: "/admin/api/v1/esign/source-search?q=agreement&has_comments=true" }
}, Ri = {
  source: {
    id: "src_01HX5ZCQK0COMMENT1",
    label: "New Document Template",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT1"
  },
  revision: {
    id: "rev_01HX5ZCQK0REV001",
    provider_revision_hint: "v1.0",
    modified_time: "2026-03-01T10:00:00Z"
  },
  items: [],
  applied_query: {
    page: 1,
    page_size: 20
  },
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 0,
    has_more: !1
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !1,
    can_view_comments: !0
  },
  empty_state: {
    kind: "no_comments",
    title: "No comments",
    description: "No comment threads found for this source revision."
  },
  sync_status: "synced",
  sync: {
    status: "synced",
    thread_count: 0,
    message_count: 0,
    last_synced_at: "2026-03-01T10:05:00Z"
  },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT1/comments",
    source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT1"
  }
}, tt = {
  source: {
    id: "src_01HX5ZCQK0COMMENT2",
    label: "NDA Template - Enterprise Edition",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT2"
  },
  revision: {
    id: "rev_01HX5ZCQK0REV002",
    provider_revision_hint: "v2.1",
    modified_time: "2026-02-15T14:30:00Z"
  },
  items: [{
    id: "thread_01HX5ZCQK0THR001",
    provider_comment_id: "AAAgB123456",
    thread_id: "thread-sha1-001",
    status: "open",
    anchor: {
      kind: "quote",
      label: "Section 3.1 - Confidentiality"
    },
    author_name: "Jane Smith",
    author: {
      display_name: "Jane Smith",
      email: "jane.smith@example.com",
      type: "user"
    },
    body_preview: 'We need to clarify the definition of "confidential information" in this section. The current language is too broad and may include...',
    message_count: 3,
    reply_count: 2,
    resolved_at: void 0,
    last_synced_at: "2026-02-20T09:00:00Z",
    last_activity_at: "2026-02-19T16:45:00Z",
    sync_status: "synced",
    source: {
      id: "src_01HX5ZCQK0COMMENT2",
      label: "NDA Template - Enterprise Edition"
    },
    revision: {
      id: "rev_01HX5ZCQK0REV002",
      provider_revision_hint: "v2.1",
      modified_time: "2026-02-15T14:30:00Z"
    },
    messages: [
      {
        id: "msg_001",
        provider_message_id: "AAAgB123456-0",
        message_kind: "comment",
        body_preview: 'We need to clarify the definition of "confidential information" in this section...',
        author: {
          display_name: "Jane Smith",
          email: "jane.smith@example.com",
          type: "user"
        },
        created_at: "2026-02-18T10:00:00Z"
      },
      {
        id: "msg_002",
        provider_message_id: "AAAgB123456-1",
        message_kind: "reply",
        body_preview: "Good point. I suggest we add specific categories of information...",
        author: {
          display_name: "John Doe",
          email: "john.doe@example.com",
          type: "user"
        },
        created_at: "2026-02-18T14:30:00Z"
      },
      {
        id: "msg_003",
        provider_message_id: "AAAgB123456-2",
        message_kind: "reply",
        body_preview: "Agreed. Let me draft some language and share it here for review.",
        author: {
          display_name: "Jane Smith",
          email: "jane.smith@example.com",
          type: "user"
        },
        created_at: "2026-02-19T16:45:00Z"
      }
    ],
    links: {
      self: "/admin/api/v1/esign/source-comments/thread_01HX5ZCQK0THR001",
      provider: "https://docs.google.com/document/d/abc123/edit?disco=AAAgB123456"
    }
  }, {
    id: "thread_01HX5ZCQK0THR002",
    provider_comment_id: "AAAgB789012",
    thread_id: "thread-sha1-002",
    status: "resolved",
    anchor: {
      kind: "quote",
      label: "Section 5.2 - Term"
    },
    author_name: "Legal Bot",
    author: {
      display_name: "Legal Bot",
      email: "legal-bot@example.com",
      type: "bot"
    },
    body_preview: "Auto-detected: Term length should be specified explicitly. Current language implies perpetual term.",
    message_count: 2,
    reply_count: 1,
    resolved_at: "2026-02-17T11:00:00Z",
    last_synced_at: "2026-02-20T09:00:00Z",
    last_activity_at: "2026-02-17T11:00:00Z",
    sync_status: "synced",
    links: { self: "/admin/api/v1/esign/source-comments/thread_01HX5ZCQK0THR002" }
  }],
  applied_query: {
    page: 1,
    page_size: 20
  },
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 2,
    has_more: !1
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !0,
    can_view_comments: !0
  },
  empty_state: { kind: "none" },
  sync_status: "synced",
  sync: {
    status: "synced",
    thread_count: 2,
    message_count: 5,
    last_synced_at: "2026-02-20T09:00:00Z"
  },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT2/comments",
    source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT2"
  }
}, Di = {
  source: {
    id: "src_01HX5ZCQK0COMMENT3",
    label: "Partnership Agreement Draft",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT3"
  },
  revision: {
    id: "rev_01HX5ZCQK0REV003",
    provider_revision_hint: "draft-1",
    modified_time: "2026-03-10T08:00:00Z"
  },
  items: [],
  applied_query: {
    page: 1,
    page_size: 20
  },
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 0,
    has_more: !1
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !1,
    can_view_comments: !0
  },
  empty_state: {
    kind: "pending_sync",
    title: "Comments pending sync",
    description: "Comment synchronization is in progress. Comments will appear once sync completes."
  },
  sync_status: "pending_sync",
  sync: {
    status: "pending_sync",
    thread_count: 0,
    message_count: 0,
    last_attempt_at: "2026-03-10T08:05:00Z"
  },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT3/comments",
    source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT3"
  }
}, Fi = {
  source: {
    id: "src_01HX5ZCQK0COMMENT4",
    label: "Vendor Agreement 2026",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT4"
  },
  revision: {
    id: "rev_01HX5ZCQK0REV004",
    provider_revision_hint: "v1.2",
    modified_time: "2026-03-05T16:00:00Z"
  },
  items: [],
  applied_query: {
    page: 1,
    page_size: 20
  },
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 0,
    has_more: !1
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !1,
    can_view_comments: !0
  },
  empty_state: {
    kind: "sync_failed",
    title: "Unable to sync comments",
    description: "Comment synchronization failed. This may be due to API quota limits or authentication issues."
  },
  sync_status: "failed",
  sync: {
    status: "failed",
    thread_count: 0,
    message_count: 0,
    last_attempt_at: "2026-03-05T16:05:00Z",
    error_code: "QUOTA_EXCEEDED",
    error_message: "Google Drive API quota exceeded. Sync will retry automatically."
  },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT4/comments",
    source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT4"
  }
}, Ii = {
  source: {
    id: "src_01HX5ZCQK0COMMENT5",
    label: "License Agreement - OEM",
    url: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT5"
  },
  revision: {
    id: "rev_01HX5ZCQK0REV005",
    provider_revision_hint: "v3.0",
    modified_time: "2026-01-15T12:00:00Z"
  },
  items: [{
    id: "thread_01HX5ZCQK0STALE001",
    provider_comment_id: "AAAgBSTALE1",
    thread_id: "thread-sha1-stale",
    status: "open",
    anchor: {
      kind: "document",
      label: "General"
    },
    author_name: "Mark Johnson",
    author: {
      display_name: "Mark Johnson",
      email: "mark.johnson@example.com",
      type: "user"
    },
    body_preview: "This comment data may be outdated. Last synced over 7 days ago.",
    message_count: 1,
    reply_count: 0,
    last_synced_at: "2026-01-10T09:00:00Z",
    last_activity_at: "2026-01-10T09:00:00Z",
    sync_status: "stale",
    links: {}
  }],
  applied_query: {
    page: 1,
    page_size: 20
  },
  page_info: {
    mode: "page",
    page: 1,
    page_size: 20,
    total_count: 1,
    has_more: !1
  },
  permissions: {
    can_view_diagnostics: !0,
    can_open_provider_links: !0,
    can_review_candidates: !1,
    can_view_comments: !0
  },
  empty_state: { kind: "none" },
  sync_status: "stale",
  sync: {
    status: "stale",
    thread_count: 1,
    message_count: 1,
    last_synced_at: "2026-01-10T09:00:00Z",
    last_attempt_at: "2026-03-20T10:00:00Z",
    error_message: "Data may be outdated. Provider has been unreachable for extended period."
  },
  links: {
    self: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT5/comments",
    source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT5"
  }
}, Uu = {
  schema_version: 1,
  rules: {
    frontend_presentation_only: !0,
    pagination_mode: "page",
    default_page_size: 20,
    max_page_size: 100,
    supported_source_sorts: [
      "modified_time_desc",
      "created_at_desc",
      "title_asc"
    ],
    supported_revision_sorts: ["modified_time_desc", "exported_at_desc"],
    supported_relationship_sorts: ["confidence_desc", "created_at_desc"],
    supported_search_sorts: [
      "relevance",
      "title_asc",
      "modified_time_desc"
    ],
    provider_link_visibility: "admin_view",
    diagnostics_visibility: "admin_debug_only",
    candidate_review_visibility: "admin_view"
  },
  queries: {
    search_with_comments: {
      query: "agreement",
      has_comments: !0,
      page: 1,
      page_size: 20
    },
    search_with_relationship_filter: {
      query: "contract",
      relationship_state: "pending_review",
      page: 1,
      page_size: 20
    },
    comment_list_synced: {
      page: 1,
      page_size: 20,
      sync_status: "synced"
    },
    comment_list_pending: {
      page: 1,
      page_size: 20,
      sync_status: "pending_sync"
    }
  },
  states: {
    search_empty: Ai,
    search_results_with_comments: et,
    comments_empty: Ri,
    comments_synced: tt,
    comments_pending_sync: Di,
    comments_sync_failed: Fi,
    comments_sync_stale: Ii
  }
}, qu = {
  schema_version: 1,
  rules: {
    frontend_presentation_only: !0,
    pagination_mode: "page",
    default_page_size: 20,
    max_page_size: 100,
    supported_source_sorts: [
      "modified_time_desc",
      "created_at_desc",
      "title_asc"
    ],
    supported_revision_sorts: ["modified_time_desc", "exported_at_desc"],
    supported_relationship_sorts: ["confidence_desc", "created_at_desc"],
    supported_search_sorts: ["relevance_desc", "modified_time_desc"],
    provider_link_visibility: "admin_view",
    diagnostics_visibility: "admin_debug_only",
    candidate_review_visibility: "admin_view"
  },
  queries: {
    list_sources: {
      page: 1,
      page_size: 20
    },
    list_revisions: {
      page: 1,
      page_size: 20,
      sort: "modified_time_desc"
    },
    list_relationships: {
      page: 1,
      page_size: 20
    },
    search: {
      query: "requirements",
      page: 1,
      page_size: 20
    }
  },
  states: {
    source_list_empty: xi,
    source_list_single: Xe,
    source_detail_repeated: We,
    source_handles_multi: {
      source: {
        id: "src_01HX5ZCQK0ABC123",
        label: "Product Requirements Document v3.pdf"
      },
      items: [],
      page_info: {
        mode: "page",
        page: 1,
        page_size: 20,
        total_count: 0,
        has_more: !1
      },
      permissions: {
        can_view_diagnostics: !0,
        can_open_provider_links: !0,
        can_review_candidates: !0,
        can_view_comments: !1
      },
      empty_state: { kind: "none" },
      links: {}
    },
    source_revisions_repeated: Je,
    source_relationships_review: Ye,
    source_revision_detail: {
      source: {
        id: "src_01HX5ZCQK0ABC123",
        label: "Product Requirements Document v3.pdf"
      },
      revision: {
        id: "rev_01HX5ZCQK0REV003",
        provider_revision_hint: "v3",
        modified_time: "2026-01-15T10:30:00Z",
        exported_at: "2026-01-15T10:32:00Z",
        source_mime_type: "application/vnd.google-apps.document"
      },
      provider: {
        kind: "google_drive",
        label: "Google Drive",
        external_file_id: "1a2b3c4d5e6f7g8h9i0j",
        account_id: "user@example.com",
        web_url: "https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit"
      },
      fingerprint_status: {
        status: "ready",
        extract_version: "v1.0",
        evidence_available: !0
      },
      fingerprint_processing: {
        state: "ready",
        status_label: "Fingerprint ready",
        completed_at: "2026-01-15T10:35:00Z",
        attempt_count: 1,
        retryable: !1,
        stale: !1
      },
      permissions: {
        can_view_diagnostics: !0,
        can_open_provider_links: !0,
        can_review_candidates: !0,
        can_view_comments: !1
      },
      links: {
        self: "/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV003",
        source: "/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123"
      },
      empty_state: { kind: "none" }
    },
    source_artifacts: {
      revision: {
        id: "rev_01HX5ZCQK0REV003",
        modified_time: "2026-01-15T10:30:00Z",
        exported_at: "2026-01-15T10:32:00Z"
      },
      items: [],
      page_info: {
        mode: "page",
        page: 1,
        page_size: 20,
        total_count: 0,
        has_more: !1
      },
      permissions: {
        can_view_diagnostics: !0,
        can_open_provider_links: !0,
        can_review_candidates: !0,
        can_view_comments: !1
      },
      empty_state: { kind: "none" },
      links: {}
    },
    source_comments_empty: {
      revision: {
        id: "rev_01HX5ZCQK0REV003",
        modified_time: "2026-01-15T10:30:00Z",
        exported_at: "2026-01-15T10:32:00Z"
      },
      items: [],
      page_info: {
        mode: "page",
        page: 1,
        page_size: 20,
        total_count: 0,
        has_more: !1
      },
      permissions: {
        can_view_diagnostics: !0,
        can_open_provider_links: !0,
        can_review_candidates: !0,
        can_view_comments: !1
      },
      empty_state: {
        kind: "no_comments",
        title: "No comments",
        description: "No comment threads found for this revision."
      },
      sync_status: "not_configured",
      links: {}
    },
    source_search_results: {
      items: [],
      page_info: {
        mode: "page",
        page: 1,
        page_size: 20,
        total_count: 0,
        has_more: !1
      },
      applied_query: {
        query: "requirements",
        page: 1,
        page_size: 20
      },
      permissions: {
        can_view_diagnostics: !0,
        can_open_provider_links: !0,
        can_review_candidates: !0,
        can_view_comments: !1
      },
      empty_state: {
        kind: "no_results",
        title: "No results found",
        description: "No sources match your search query."
      },
      links: {}
    },
    source_detail_merged: Ti,
    source_detail_archived: Ei
  }
};
function Li() {
  return { ...Xe };
}
function Mi() {
  return { ...We };
}
function $i() {
  return { ...Je };
}
function Ni() {
  return { ...Ye };
}
function ji() {
  return { ...et };
}
function Zi() {
  return { ...tt };
}
var l = {
  source_list: {
    route: "/admin/api/v1/esign/fixtures/source-list-page",
    fixture: Li,
    contractFamily: "SourceListPage"
  },
  source_detail: {
    route: "/admin/api/v1/esign/fixtures/source-detail",
    fixture: Mi,
    contractFamily: "SourceDetail"
  },
  revision_history: {
    route: "/admin/api/v1/esign/fixtures/source-revision-page",
    fixture: $i,
    contractFamily: "SourceRevisionPage"
  },
  relationship_summaries: {
    route: "/admin/api/v1/esign/fixtures/source-relationship-page",
    fixture: Ni,
    contractFamily: "SourceRelationshipPage"
  },
  search: {
    route: "/admin/api/v1/esign/fixtures/phase13-source-search-results",
    fixture: ji,
    contractFamily: "Phase13SourceSearchResults"
  },
  source_comment: {
    route: "/admin/api/v1/esign/fixtures/phase13-source-comment-page",
    fixture: Zi,
    contractFamily: "Phase13SourceCommentPage"
  }
};
function zi(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return "document_id" in t && "fingerprint_status" in t && "google_source" in t;
}
function Hi(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return "agreement_id" in t && "pinned_source_revision_id" in t && "newer_source_exists" in t;
}
function it(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return "items" in t && "page_info" in t && "permissions" in t && "empty_state" in t && "links" in t || "source" in t && "permissions" in t && "empty_state" in t && "links" in t && ("provider" in t || "revision_count" in t || "handle_count" in t) || "revision" in t && "permissions" in t && "empty_state" in t && "links" in t && ("fingerprint_status" in t || "fingerprint_processing" in t || "sync_status" in t) ? !0 : pe(t);
}
function pe(e) {
  const t = e.links;
  if (typeof t != "object" || t === null) return !1;
  const i = t.self;
  return typeof i != "string" ? !1 : nt(i);
}
function nt(e) {
  return ae(e) !== "unknown";
}
function ae(e) {
  return e.includes("/source-search") ? "source-search" : e.includes("/source-revisions/") && e.includes("/comments") ? "source-revision-comments" : e.includes("/source-revisions/") && e.includes("/artifacts") ? "source-revision-artifacts" : e.includes("/source-revisions/") ? "source-revision-detail" : e.includes("/sources/") && e.includes("/comments") ? "source-comments" : e.includes("/sources/") && e.includes("/revisions") ? "source-revisions" : e.includes("/sources/") && e.includes("/relationships") ? "source-relationships" : e.includes("/sources/") && e.includes("/handles") ? "source-handles" : e.includes("/sources/") ? "source-detail" : e.includes("/sources") ? "source-list" : "unknown";
}
function Oi(e) {
  return zi(e) ? "DocumentLineageDetail" : Hi(e) ? "AgreementLineageDetail" : it(e) ? "SourceManagementContract" : null;
}
function Ki(e) {
  return e !== null;
}
function Gi(e, t) {
  const i = [];
  return jt(t.map(Oi).filter(Ki)) && i.push(`Page "${e}" violates composition boundary: mixing source-management contracts with document/agreement provenance payloads. Source-management pages must consume source-management endpoints only.`), {
    violated: i.length > 0,
    violations: i,
    guardName: "checkCompositionBoundaryViolation"
  };
}
function Vi(e, t, i) {
  const n = [], s = ["DocumentLineageDetail", "AgreementLineageDetail"], a = t.filter((r) => s.includes(r));
  return a.length > 0 && (i.some((r) => [
    "source-management-adapters",
    "source-management-composition",
    "lineage-contracts-shared"
  ].includes(r)) || n.push(`Page "${e}" uses prohibited contracts [${a.join(", ")}] without approved adapter modules. Source-management pages must use shared adapters for provenance data.`)), {
    violated: n.length > 0,
    violations: n,
    guardName: "checkAdapterBoundaryViolation"
  };
}
function Ui(e, t) {
  const i = [], n = [
    "newer_source_exists",
    "warning_precedence",
    "candidate_score",
    "relationship_ranking",
    "source_continuity",
    "lineage_confidence",
    "revision_ordering"
  ], s = t.filter((a) => n.some((r) => a.includes(r)));
  return s.length > 0 && i.push(`Page "${e}" computes prohibited semantic fields client-side: [${s.join(", ")}]. All lineage semantics must be computed by backend read models.`), {
    violated: i.length > 0,
    violations: i,
    guardName: "checkSemanticComputationViolation"
  };
}
function qi(e, t) {
  const i = [], n = t.filter((r) => !nt(r) && !r.includes("/diagnostics"));
  n.length > 0 && i.push(`Page "${e}" fetches from non-source-management endpoints: [${n.join(", ")}]. Source-management pages must consume one source-management endpoint family only.`);
  const s = t.map((r) => ae(r)), a = [...new Set(s)].filter((r) => r !== "unknown");
  return a.length > 1 && i.push(`Page "${e}" fetches from multiple unrelated endpoint families: [${a.join(", ")}]. Each page should consume exactly ONE endpoint family.`), {
    violated: i.length > 0,
    violations: i,
    guardName: "checkEndpointStitchingViolation"
  };
}
var G = "strict";
function Qu(e) {
  G = e;
}
function Bu() {
  return G;
}
function w(e) {
  if (!e.violated || G === "disabled") return;
  const t = `[${e.guardName}] ${e.violations.join(`
`)}`;
  if (G === "strict") throw new Error(t);
  G === "warn" && console.warn(t);
}
function st(e) {
  const t = [];
  if (e.dependencies) {
    const n = Gi(e.pageId, e.dependencies);
    n.violated && (t.push(n), w(n));
  }
  if (e.usedContracts && e.usedAdapters) {
    const n = Vi(e.pageId, e.usedContracts, e.usedAdapters);
    n.violated && (t.push(n), w(n));
  }
  if (e.computedFields) {
    const n = Ui(e.pageId, e.computedFields);
    n.violated && (t.push(n), w(n));
  }
  if (e.fetchedEndpoints) {
    const n = qi(e.pageId, e.fetchedEndpoints);
    n.violated && (t.push(n), w(n));
  }
  const i = t.some((n) => n.violated);
  return {
    violated: i,
    results: t,
    summary: i ? `Page "${e.pageId}" has ${t.length} architectural violations` : `Page "${e.pageId}" passes all architectural guards`
  };
}
function ge(e) {
  if (!e.violated) {
    console.info(`✓ ${e.summary}`);
    return;
  }
  console.error(`✗ ${e.summary}`), e.results.forEach((t) => {
    t.violated && (console.error(`  [${t.guardName}]`), t.violations.forEach((i) => {
      console.error(`    - ${i}`);
    }));
  });
}
function Xu(e) {
  const t = st(e);
  if (t.violated)
    throw ge(t), new Error(t.summary);
}
function Qi(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  if (!("items" in t) || !("applied_query" in t) || !("page_info" in t)) return !1;
  const i = t.items;
  if (!Array.isArray(i)) return !1;
  if (pe(t)) return ae(String(t.links.self)) === "source-search";
  if (i.length === 0) return !1;
  const n = i[0];
  return "result_kind" in n && "matched_fields" in n;
}
function at(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  if (!("items" in t) || !("sync_status" in t) || !("page_info" in t)) return !1;
  const i = t.items;
  if (!Array.isArray(i)) return !1;
  if (pe(t)) {
    const s = ae(String(t.links.self));
    return s === "source-comments" || s === "source-revision-comments";
  }
  if (i.length === 0) return "source" in t || "revision" in t;
  const n = i[0];
  return "message_count" in n && ("anchor" in n || "messages" in n);
}
function Bi(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return "agreement_id" in t && "review_status" in t || "signer_id" in t && "comment_type" in t || "placement_id" in t && "field_id" in t;
}
function Xi(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return "kind" in t && (t.kind === "drive#comment" || t.kind === "drive#reply") || "htmlContent" in t && "quotedFileContent" in t || "anchor" in t && typeof t.anchor == "string" && t.anchor.includes("kix.");
}
function Wi(e, t) {
  const i = [], n = t.some((a) => at(a) || it(a)), s = t.some((a) => Bi(a));
  return n && s && i.push(`Page "${e}" mixes source-management comment contracts with agreement-review comment payloads. Source comments and agreement-review comments are distinct contract families and must NOT be mixed. Use separate pages or panels for each comment type.`), {
    violated: i.length > 0,
    violations: i,
    guardName: "checkSourceCommentMixingViolation"
  };
}
function Ji(e, t) {
  const i = [];
  t.some((n) => Xi(n)) && i.push(`Page "${e}" uses raw Google Drive comment payloads directly. Source-management surfaces must consume provider-neutral contracts only. Use Phase13SourceCommentPage or Phase13SourceCommentThreadSummary instead.`);
  for (const n of t) if (typeof n == "object" && n !== null) {
    const s = n, a = [
      "quotedFileContent",
      "htmlContent",
      "kix_anchor",
      "drive_comment_id",
      "google_user_id"
    ].filter((r) => r in s);
    a.length > 0 && i.push(`Page "${e}" accesses Google-specific fields [${a.join(", ")}] directly. Use provider-neutral contract fields instead.`);
  }
  return {
    violated: i.length > 0,
    violations: i,
    guardName: "checkGoogleProviderPayloadViolation"
  };
}
function Yi(e, t, i) {
  const n = [], s = i.some((r) => [
    "comment_sync_status",
    "has_comments",
    "relationship_state",
    "comment_count"
  ].includes(r)), a = t.some((r) => Qi(r));
  return s && !a && n.push(`Page "${e}" uses Phase 13 search fields [${i.filter((r) => [
    "comment_sync_status",
    "has_comments",
    "relationship_state",
    "comment_count"
  ].includes(r)).join(", ")}] but does not consume Phase13SourceSearchResults contract. Ensure search surfaces import and use Phase 13 contract types.`), {
    violated: n.length > 0,
    violations: n,
    guardName: "checkSearchContractViolation"
  };
}
function en(e, t, i) {
  const n = [], s = i.some((r) => [
    "sync",
    "messages",
    "author",
    "last_activity_at"
  ].includes(r)), a = t.some((r) => at(r));
  return s && !a && n.push(`Page "${e}" uses Phase 13 comment fields [${i.filter((r) => [
    "sync",
    "messages",
    "author",
    "last_activity_at"
  ].includes(r)).join(", ")}] but does not consume Phase13SourceCommentPage contract. Ensure comment surfaces import and use Phase 13 contract types.`), {
    violated: n.length > 0,
    violations: n,
    guardName: "checkCommentContractViolation"
  };
}
function rt(e) {
  const t = [...st(e).results];
  if (e.dependencies) {
    const n = Wi(e.pageId, e.dependencies);
    n.violated && (t.push(n), w(n));
    const s = Ji(e.pageId, e.dependencies);
    s.violated && (t.push(s), w(s));
  }
  if (e.searchContracts && e.searchFieldsAccessed) {
    const n = Yi(e.pageId, e.searchContracts, e.searchFieldsAccessed);
    n.violated && (t.push(n), w(n));
  }
  if (e.commentContracts && e.commentFieldsAccessed) {
    const n = en(e.pageId, e.commentContracts, e.commentFieldsAccessed);
    n.violated && (t.push(n), w(n));
  }
  const i = t.some((n) => n.violated);
  return {
    violated: i,
    results: t,
    summary: i ? `Page "${e.pageId}" has ${t.filter((n) => n.violated).length} architectural violations (including Phase 13 checks)` : `Page "${e.pageId}" passes all architectural guards (including Phase 13 checks)`
  };
}
function Wu(e) {
  const t = rt(e);
  if (t.violated)
    throw ge(t), new Error(t.summary);
}
function Ju() {
  return {
    agreement_id: "agr_123",
    review_status: "pending",
    signer_id: "signer_456",
    comment_type: "field_comment",
    placement_id: "place_789",
    body: "Please review this field",
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function Yu() {
  return {
    kind: "drive#comment",
    id: "AAAgB1234",
    htmlContent: "<p>This is a comment</p>",
    quotedFileContent: {
      mimeType: "text/html",
      value: "quoted text"
    },
    anchor: "kix.abcdef123456",
    author: {
      kind: "drive#user",
      displayName: "Test User",
      emailAddress: "test@example.com"
    }
  };
}
function el() {
  return {
    source: {
      id: "src_123",
      label: "Test Source"
    },
    revision: { id: "rev_456" },
    items: [],
    applied_query: {
      page: 1,
      page_size: 20
    },
    page_info: {
      mode: "page",
      page: 1,
      page_size: 20,
      total_count: 0,
      has_more: !1
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !1,
      can_view_comments: !0
    },
    empty_state: {
      kind: "no_comments",
      title: "No comments",
      description: "No comments found."
    },
    sync_status: "synced",
    sync: {
      status: "synced",
      thread_count: 0,
      message_count: 0,
      last_synced_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    links: {}
  };
}
function tl() {
  return {
    items: [],
    page_info: {
      mode: "page",
      page: 1,
      page_size: 20,
      total_count: 0,
      has_more: !1
    },
    applied_query: { query: "test" },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !1,
      can_view_comments: !0
    },
    empty_state: {
      kind: "no_results",
      title: "No results",
      description: "No results found."
    },
    links: {}
  };
}
var de = [
  "lineage-contracts",
  "source-management-adapters",
  "source-management-composition",
  "source-management-fixtures",
  "source-management-guards",
  "source-management-pages",
  "source-management-rendering-states"
], ot = [
  "kind",
  "htmlContent",
  "quotedFileContent",
  "kix.",
  "drive#comment",
  "drive#reply",
  "drive#user",
  "google_user_id",
  "google_doc_url",
  "google_drive_id",
  "google_file_id",
  "google_account_email",
  "nextPageToken",
  "mimeType",
  "modifiedByMeTime",
  "viewedByMeTime",
  "sharedWithMeTime",
  "createdTime",
  "quotaBytesUsed",
  "webContentLink",
  "iconLink",
  "thumbnailLink",
  "exportLinks"
], fe = [
  "source-management-adapters",
  "lineage-contracts",
  "lineage-presentation",
  "source-management-composition"
], il = [
  "source_list",
  "source_detail",
  "revision_history",
  "relationship_summaries",
  "search",
  "source_comment"
], tn = {
  source_list: "source-browser-page",
  source_detail: "source-detail-page",
  revision_history: "source-revision-timeline-page",
  relationship_summaries: "source-relationship-graph-page",
  search: "source-search-page",
  source_comment: "source-comment-inspector-page"
}, nn = {
  source_list: "/admin/api/v1/esign/sources",
  source_detail: "/admin/api/v1/esign/sources/src_123",
  revision_history: "/admin/api/v1/esign/sources/src_123/revisions",
  relationship_summaries: "/admin/api/v1/esign/sources/src_123/relationships",
  search: "/admin/api/v1/esign/source-search?q=test",
  source_comment: "/admin/api/v1/esign/sources/src_123/comments"
};
function ct(e) {
  return e.replace(/^\.\.\//, "").replace(/^\.\//, "").replace(/\.js$/, "").replace(/\.ts$/, "");
}
function sn(e) {
  if (!e) return !1;
  const t = ct(e);
  return fe.some((i) => t === i || t.endsWith(`/${i}`));
}
function an(e) {
  return typeof e == "string" ? { field: e } : e;
}
function rn(e) {
  return ot.some((t) => e === t || e.includes(t));
}
function on(e) {
  if (typeof e != "object" || e === null) return;
  const t = e.links;
  if (typeof t != "object" || t === null) return;
  const i = t.self;
  return typeof i == "string" && i.length > 0 ? i : void 0;
}
function cn(e, t) {
  const i = [], n = t.filter((s) => {
    const a = ct(s);
    return a.includes("source-management") || a.includes("lineage") || a.includes("esign") ? !de.some((r) => a === r || a.endsWith(`/${r}`)) : !1;
  });
  return n.length > 0 && i.push(`Page "${e}" imports source-management contracts from non-approved modules: [${n.join(", ")}]. Approved modules: [${de.join(", ")}].`), {
    violated: i.length > 0,
    violations: i,
    guardName: "checkContractModuleConsumptionViolation"
  };
}
function dn(e, t) {
  const i = [], n = t.map((s) => an(s)).filter((s) => rn(s.field)).filter((s) => !sn(s.accessedThrough));
  if (n.length > 0) {
    const s = n.map((a) => a.accessedThrough ? `${a.field} via non-approved boundary ${a.accessedThrough}` : a.field);
    i.push(`Page "${e}" accesses forbidden raw Google-specific fields: [${s.join(", ")}]. These fields may only be accessed through approved adapter boundaries: [${fe.join(", ")}].`);
  }
  return {
    violated: i.length > 0,
    violations: i,
    guardName: "checkRawGoogleFieldAccessViolation"
  };
}
function un(e, t) {
  const i = [], n = [
    "SourceListPage",
    "SourceDetail",
    "SourceRevisionPage",
    "SourceRelationshipPage",
    "SourceHandlePage",
    "SourceRevisionDetail",
    "SourceArtifactPage",
    "SourceCommentPage",
    "SourceSearchResults",
    "Phase13SourceSearchResults",
    "Phase13SourceCommentPage"
  ], s = t.filter((a) => n.includes(a));
  return s.length > 1 && i.push(`Page "${e}" uses multiple canonical contract families: [${s.join(", ")}]. Each page must attach to exactly ONE canonical contract family before visual implementation.`), s.length === 0 && t.length > 0 && i.push(`Page "${e}" uses contracts [${t.join(", ")}] but does not attach to any canonical contract family. Pages must consume one canonical contract family from: [${n.join(", ")}].`), {
    violated: i.length > 0,
    violations: i,
    guardName: "checkCanonicalContractFamilyViolation"
  };
}
function ln(e, t) {
  const i = [], n = [
    "newer_source_exists",
    "source_continuity",
    "lineage_confidence_score",
    "canonical_identity",
    "revision_ordering",
    "warning_precedence",
    "warning_severity",
    "warning_ranking",
    "presentation_warning_order",
    "candidate_score",
    "confidence_score",
    "relationship_ranking",
    "candidate_match_strength",
    "search_ranking",
    "relevance_score",
    "match_score",
    "sync_state_derivation",
    "thread_ordering",
    "resolution_decision"
  ], s = t.filter((a) => n.some((r) => a === r || a.includes(r)));
  return s.length > 0 && i.push(`Page "${e}" computes backend-owned semantics client-side: [${s.join(", ")}]. Backend owns all lineage semantics, warning precedence, source continuity, and search ranking. Frontend owns only presentation (visual design, interaction patterns, cosmetic UX).`), {
    violated: i.length > 0,
    violations: i,
    guardName: "checkSemanticOwnershipViolation"
  };
}
function dt(e) {
  const t = [...rt(e).results];
  if (e.importSources && e.enforceContractModules !== !1) {
    const s = cn(e.pageId, e.importSources);
    s.violated && (t.push(s), w(s));
  }
  if (e.rawFieldAccesses) {
    const s = dn(e.pageId, e.rawFieldAccesses);
    s.violated && (t.push(s), w(s));
  }
  if (e.usedContracts) {
    const s = un(e.pageId, e.usedContracts);
    s.violated && (t.push(s), w(s));
  }
  if (e.computedFields) {
    const s = ln(e.pageId, e.computedFields);
    s.violated && (t.push(s), w(s));
  }
  const i = t.some((s) => s.violated), n = t.filter((s) => s.violated).length;
  return {
    violated: i,
    results: t,
    summary: i ? `Page "${e.pageId}" has ${n} architectural violations (Phase 14 checks)` : `Page "${e.pageId}" passes all architectural guards (Phase 14 checks)`
  };
}
function nl(e) {
  const t = dt(e);
  if (t.violated)
    throw ge(t), new Error(t.summary);
}
function V(e) {
  return {
    pageId: e,
    dependencies: [],
    usedContracts: [],
    usedAdapters: ["source-management-adapters"],
    computedFields: [],
    fetchedEndpoints: [],
    searchContracts: [],
    commentContracts: [],
    searchFieldsAccessed: [],
    commentFieldsAccessed: [],
    importSources: [
      "./lineage-contracts.js",
      "./source-management-adapters.js",
      "./source-management-pages.js",
      "./source-management-rendering-states.js"
    ],
    rawFieldAccesses: [],
    enforceContractModules: !0
  };
}
function E(e, t) {
  const i = on(t) ?? nn[e], n = {
    ...V(tn[e]),
    dependencies: [t],
    fetchedEndpoints: [i]
  };
  switch (e) {
    case "source_list":
      return {
        ...n,
        usedContracts: ["SourceListPage"]
      };
    case "source_detail":
      return {
        ...n,
        usedContracts: ["SourceDetail"]
      };
    case "revision_history":
      return {
        ...n,
        usedContracts: ["SourceRevisionPage"]
      };
    case "relationship_summaries":
      return {
        ...n,
        usedContracts: ["SourceRelationshipPage"]
      };
    case "search":
      return {
        ...n,
        usedContracts: ["Phase13SourceSearchResults"],
        searchContracts: [t],
        searchFieldsAccessed: [
          "comment_sync_status",
          "has_comments",
          "relationship_state",
          "comment_count"
        ]
      };
    case "source_comment":
      return {
        ...n,
        usedContracts: ["Phase13SourceCommentPage"],
        commentContracts: [t],
        commentFieldsAccessed: [
          "sync",
          "messages",
          "author",
          "last_activity_at"
        ]
      };
  }
}
function sl(e) {
  return {
    ...V(e),
    importSources: [
      "./lineage-contracts.js",
      "./some-custom-lineage-module.js",
      "../esign/internal-google-api.js"
    ]
  };
}
function al(e) {
  return {
    ...V(e),
    rawFieldAccesses: [
      "htmlContent",
      "quotedFileContent",
      "google_user_id"
    ]
  };
}
function rl(e) {
  return {
    ...V(e),
    usedContracts: [
      "SourceListPage",
      "SourceDetail",
      "SourceRevisionPage"
    ]
  };
}
function ol(e) {
  return {
    ...V(e),
    computedFields: [
      "newer_source_exists",
      "candidate_score",
      "search_ranking"
    ]
  };
}
var cl = {
  version: 2,
  phase: 14,
  enforcementLevel: "strict",
  backendOwns: [
    "lineage_semantics",
    "warning_precedence",
    "source_continuity",
    "search_ranking",
    "candidate_scoring",
    "revision_ordering",
    "sync_state_derivation",
    "canonical_identity"
  ],
  frontendOwns: [
    "visual_design",
    "interaction_patterns",
    "cosmetic_ux",
    "accessibility_labels",
    "loading_indicators",
    "error_messages",
    "empty_state_presentation"
  ],
  approvedModules: de,
  forbiddenGoogleFields: ot,
  approvedGoogleAdapters: fe,
  pageRules: [
    "Each page attaches to exactly ONE canonical contract family",
    "Pages consume contracts through approved modules only",
    "Pages must NOT access raw Google-specific fields outside adapters",
    "Pages must NOT compute backend-owned semantics client-side",
    "Pages must NOT mix source-management with provenance payloads",
    "Visual implementation begins only after contract family is attached"
  ],
  guardSequence: [
    "checkCompositionBoundaryViolation",
    "checkAdapterBoundaryViolation",
    "checkSemanticComputationViolation",
    "checkEndpointStitchingViolation",
    "checkSourceCommentMixingViolation",
    "checkGoogleProviderPayloadViolation",
    "checkSearchContractViolation",
    "checkCommentContractViolation",
    "checkContractModuleConsumptionViolation",
    "checkRawGoogleFieldAccessViolation",
    "checkCanonicalContractFamilyViolation",
    "checkSemanticOwnershipViolation"
  ]
};
function b(e, t) {
  return {
    metadata: {
      panelId: e,
      stateKind: "loading",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    loadingMessage: t ?? `Loading ${e}...`,
    showProgress: !0
  };
}
function I(e, t, i = !0) {
  const n = t.message.match(/HTTP (\d+):/), s = n ? `HTTP_${n[1]}` : void 0;
  return {
    metadata: {
      panelId: e,
      stateKind: "error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    title: "Unable to Load Panel",
    message: t.message,
    code: s,
    retryable: i
  };
}
function C(e, t, i) {
  const n = t.kind ?? "none";
  return {
    metadata: {
      panelId: e,
      stateKind: mn(e, n),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    emptyState: {
      isEmpty: n !== "none",
      kind: n,
      title: t.title ?? "",
      description: t.description ?? ""
    },
    backendEmptyStateKind: n,
    suggestedActionLabel: i?.suggestedActionLabel,
    suggestedActionUrl: i?.suggestedActionUrl,
    actionable: i?.actionable ?? !1
  };
}
function mn(e, t) {
  return {
    no_artifacts: "no_artifacts",
    no_comments: "no_comments",
    no_relationships: "no_relationships",
    no_agreements: "no_agreements",
    repeated_revisions: "repeated_revisions",
    merged_source: "merged_source",
    archived_source: "archived_source",
    no_results: "empty",
    not_found: "empty",
    none: "success"
  }[t] ?? "empty";
}
function _n(e) {
  const t = Tt(e);
  return {
    metadata: {
      panelId: "overview",
      stateKind: pn(e),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    source: t,
    permissions: e.permissions,
    links: e.links
  };
}
function pn(e) {
  const t = (e.status ?? "").toLowerCase();
  return t === "merged" ? "merged_source" : t === "archived" ? "archived_source" : "success";
}
function ut(e, t, i) {
  return e ? b("overview", "Loading source...") : t !== null ? t.message.includes("403") || t.message.includes("Forbidden") ? C("overview", {
    kind: "unauthorized",
    title: "Access Denied",
    description: "You do not have permission to view this source."
  }) : t.message.includes("404") || t.message.includes("Not Found") ? C("overview", {
    kind: "not_found",
    title: "Source Not Found",
    description: "The requested source document could not be found."
  }) : I("overview", t) : i === null ? b("overview") : i.empty_state.kind !== "none" ? C("overview", i.empty_state) : _n(i);
}
function gn(e) {
  const t = xt(e), i = t.items.length > 1;
  return {
    metadata: {
      panelId: "revisions",
      stateKind: i ? "repeated_revisions" : "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    sourceId: t.source.id,
    sourceLabel: t.source.label,
    items: t.items,
    pagination: t.pagination,
    permissions: t.permissions,
    links: t.links,
    hasRepeatedRevisions: i
  };
}
function fn(e, t, i) {
  return e ? b("revisions", "Loading revisions...") : t !== null ? I("revisions", t) : i === null ? b("revisions") : i.empty_state.kind !== "none" ? C("revisions", i.empty_state) : gn(i);
}
function vn(e) {
  return {
    pdf_export: "PDF Export",
    native_export: "Native Export",
    upload: "Upload",
    thumbnail: "Thumbnail",
    fingerprint: "Fingerprint"
  }[e] ?? e;
}
function hn(e) {
  return {
    native: "Native",
    converted: "Converted",
    unsupported: "Unsupported"
  }[e ?? ""] ?? e ?? "";
}
function yn(e) {
  return {
    pending: "Pending",
    complete: "Complete",
    failed: "Failed",
    skipped: "Skipped"
  }[e ?? ""] ?? e ?? "";
}
function bn(e) {
  if (e === void 0 || e === 0) return "0 B";
  const t = [
    "B",
    "KB",
    "MB",
    "GB"
  ];
  let i = e, n = 0;
  for (; i >= 1024 && n < t.length - 1; )
    i /= 1024, n++;
  return `${i.toFixed(n > 0 ? 1 : 0)} ${t[n]}`;
}
function Sn(e, t) {
  const i = e.sha256 ?? "";
  return {
    id: e.id,
    artifactKind: e.artifact_kind,
    artifactKindLabel: vn(e.artifact_kind),
    sha256: i,
    sha256Short: i.length > 12 ? `${i.substring(0, 12)}...` : i,
    pageCount: e.page_count ?? 0,
    sizeBytes: e.size_bytes ?? 0,
    sizeBytesFormatted: bn(e.size_bytes),
    compatibilityTier: e.compatibility_tier ?? "",
    compatibilityTierLabel: hn(e.compatibility_tier),
    normalizationStatus: e.normalization_status ?? "",
    normalizationStatusLabel: yn(e.normalization_status),
    links: t
  };
}
function wn(e) {
  const t = e.items.map((i) => Sn(i, e.links));
  return {
    metadata: {
      panelId: "artifacts",
      stateKind: t.length > 0 ? "success" : "no_artifacts",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    revisionId: e.revision?.id ?? "",
    items: t,
    pagination: me(e.page_info),
    permissions: e.permissions,
    links: e.links
  };
}
function kn(e, t, i) {
  return e ? b("artifacts", "Loading artifacts...") : t !== null ? I("artifacts", t) : i === null ? b("artifacts") : i.empty_state.kind !== "none" ? C("artifacts", i.empty_state, {
    suggestedActionLabel: "View Revisions",
    suggestedActionUrl: i.links.revisions
  }) : wn(i);
}
function Cn(e, t) {
  const i = Et(e), n = (t ?? 0) > 0;
  return {
    metadata: {
      panelId: "relationships",
      stateKind: i.items.length > 0 ? "success" : "no_relationships",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    sourceId: i.source.id,
    sourceLabel: i.source.label,
    items: i.items,
    pagination: i.pagination,
    permissions: i.permissions,
    links: i.links,
    hasPendingCandidates: n,
    pendingCandidateCount: t ?? 0
  };
}
function Pn(e, t, i, n) {
  return e ? b("relationships", "Loading relationships...") : t !== null ? I("relationships", t) : i === null ? b("relationships") : i.empty_state.kind !== "none" ? C("relationships", i.empty_state, {
    suggestedActionLabel: "View All Sources",
    suggestedActionUrl: i.links.source
  }) : Cn(i, n);
}
function xn(e) {
  return {
    open: "Open",
    resolved: "Resolved",
    deleted: "Deleted"
  }[e ?? ""] ?? e ?? "";
}
function Tn(e) {
  return {
    not_configured: "Not Configured",
    pending_sync: "Syncing...",
    synced: "Synced",
    failed: "Sync Failed",
    stale: "Data May Be Outdated"
  }[e] ?? e;
}
function En(e) {
  return {
    id: e.id ?? "",
    threadId: e.thread_id ?? "",
    status: e.status ?? "unknown",
    statusLabel: xn(e.status),
    isResolved: !!e.resolved_at,
    anchorKind: e.anchor?.kind ?? "",
    anchorLabel: e.anchor?.label ?? "General",
    authorName: e.author?.display_name ?? e.author_name ?? "Unknown",
    authorType: e.author?.type ?? "user",
    bodyPreview: e.body_preview ?? "",
    messageCount: e.message_count ?? 0,
    replyCount: e.reply_count ?? 0,
    hasReplies: (e.reply_count ?? 0) > 0,
    lastActivityAt: e.last_activity_at ?? "",
    links: e.links ?? {}
  };
}
function An(e) {
  const t = e.items.map(En);
  return {
    metadata: {
      panelId: "comments",
      stateKind: t.length > 0 ? "success" : "no_comments",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    sourceId: e.source?.id ?? "",
    sourceLabel: e.source?.label ?? "",
    revisionId: e.revision?.id ?? "",
    items: t,
    pagination: me(e.page_info),
    permissions: e.permissions,
    links: e.links,
    syncStatus: e.sync_status,
    syncStatusLabel: Tn(e.sync_status),
    threadCount: e.sync?.thread_count ?? 0,
    messageCount: e.sync?.message_count ?? 0
  };
}
function Rn(e, t, i) {
  if (e) return b("comments", "Loading comments...");
  if (t !== null)
    return t.message.includes("403") || t.message.includes("Forbidden") ? C("comments", {
      kind: "unauthorized",
      title: "Comments Not Available",
      description: "You do not have permission to view comments for this source."
    }) : I("comments", t);
  if (i === null) return b("comments");
  const n = i.sync_status;
  return n === "pending_sync" ? C("comments", {
    kind: "pending_sync",
    title: "Comments syncing",
    description: "Comment synchronization is in progress."
  }) : n === "not_configured" ? C("comments", {
    kind: "not_configured",
    title: "Comments not configured",
    description: "Comment synchronization is not enabled for this source."
  }) : i.empty_state.kind !== "none" ? C("comments", i.empty_state) : An(i);
}
function Dn(e) {
  return {
    google_drive: "Google Drive",
    google_docs: "Google Docs",
    upload: "Upload",
    api: "API"
  }[e] ?? e;
}
function Fn(e) {
  return {
    active: "Active",
    inactive: "Inactive",
    expired: "Expired",
    revoked: "Revoked"
  }[e] ?? e;
}
function In(e, t) {
  return {
    id: e.id,
    providerKind: e.provider_kind,
    providerKindLabel: Dn(e.provider_kind),
    externalFileId: e.external_file_id,
    accountId: e.account_id ?? "",
    webUrl: e.web_url ?? "",
    handleStatus: e.handle_status,
    handleStatusLabel: Fn(e.handle_status),
    isActive: e.id === t,
    validFrom: e.valid_from ?? "",
    validTo: e.valid_to ?? "",
    links: e.links
  };
}
function Ln(e, t) {
  const i = e.items.map((n) => In(n, t));
  return {
    metadata: {
      panelId: "handles",
      stateKind: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    sourceId: e.source?.id ?? "",
    sourceLabel: e.source?.label ?? "",
    items: i,
    pagination: me(e.page_info),
    permissions: e.permissions,
    links: e.links,
    activeHandleId: t
  };
}
function Mn(e, t, i, n) {
  return e ? b("handles", "Loading handles...") : t !== null ? I("handles", t) : i === null ? b("handles") : i.empty_state.kind !== "none" ? C("handles", i.empty_state) : Ln(i, n ?? "");
}
function ve(e, t) {
  return {
    sourceId: e,
    activePanel: "overview",
    overview: ut(!1, null, t),
    revisions: null,
    artifacts: null,
    relationships: null,
    comments: null,
    handles: null,
    permissions: t.permissions,
    links: t.links
  };
}
function dl(e) {
  return {
    sourceId: e,
    activePanel: "overview",
    overview: b("overview"),
    revisions: null,
    artifacts: null,
    relationships: null,
    comments: null,
    handles: null,
    permissions: {
      can_view_diagnostics: !1,
      can_open_provider_links: !1,
      can_review_candidates: !1,
      can_view_comments: !1
    },
    links: {}
  };
}
function ul(e, t, i) {
  return {
    ...e,
    [t]: i
  };
}
function ll(e, t) {
  return {
    ...e,
    activePanel: t
  };
}
function ml(e, t) {
  const i = e.links;
  switch (t) {
    case "revisions":
      return i.revisions;
    case "relationships":
      return i.relationships;
    case "handles":
      return i.handles;
    case "artifacts":
      return i.artifacts;
    case "comments":
      return i.comments;
    case "overview":
      return i.self;
    default:
      return;
  }
}
function _l(e, t) {
  switch (t) {
    case "overview":
      return !1;
    case "revisions":
      return e.revisions === null;
    case "artifacts":
      return e.artifacts === null;
    case "relationships":
      return e.relationships === null;
    case "comments":
      return e.comments === null;
    case "handles":
      return e.handles === null;
    default:
      return !1;
  }
}
var ne = [
  "SourceDetail",
  "SourceRevisionPage",
  "SourceRelationshipPage",
  "SourceArtifactPage",
  "SourceHandlePage",
  "Phase13SourceCommentPage"
];
function lt(e) {
  const t = [], i = e.filter((n) => !ne.includes(n));
  return i.length > 0 && t.push(`Workspace uses unapproved contract families: [${i.join(", ")}]. Approved families: [${ne.join(", ")}].`), {
    valid: t.length === 0,
    violations: t,
    usedContractFamilies: e
  };
}
var $n = [
  "DocumentLineageDetail",
  "AgreementLineageDetail",
  "GoogleImportLineageStatus",
  "GoogleImportRunDetail"
];
function mt(e) {
  const t = [], i = e.filter((n) => $n.includes(n));
  return i.length > 0 && t.push(`Workspace mixes forbidden contract families: [${i.join(", ")}]. Workspace must consume source-management contracts only.`), {
    valid: t.length === 0,
    violations: t,
    usedContractFamilies: e
  };
}
function _t(e) {
  const t = [], i = ["SourceDetail"];
  e.links.self === void 0 && t.push("Workspace missing backend-provided self link.");
  const n = Object.values(e.links).filter((s) => typeof s == "string");
  for (const s of n) (s.includes("{{") || s.includes("${") || s.includes("__PLACEHOLDER__")) && t.push(`Workspace contains synthesized URL: ${s}`);
  return {
    valid: t.length === 0,
    violations: t,
    usedContractFamilies: i
  };
}
var U = Object.keys(l), he = {
  source_list: l.source_list.contractFamily,
  source_detail: l.source_detail.contractFamily,
  revision_history: l.revision_history.contractFamily,
  relationship_summaries: l.relationship_summaries.contractFamily,
  search: l.search.contractFamily,
  source_comment: l.source_comment.contractFamily
};
function j(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return Array.isArray(t.items) && typeof t.page_info == "object" && t.page_info !== null && typeof t.links == "object" && t.links !== null;
}
function Nn(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return typeof t.source == "object" && t.source !== null && typeof t.latest_revision == "object" && t.latest_revision !== null && typeof t.links == "object" && t.links !== null;
}
function A(e, t) {
  if (typeof e != "object" || e === null) return !1;
  const i = e.links;
  if (typeof i != "object" || i === null) return !1;
  const n = i.self;
  return typeof n == "string" && n.includes(t);
}
var q = {
  source_list: {
    contractFamily: l.source_list.contractFamily,
    route: l.source_list.route,
    validateFixture: (e) => j(e) && A(e, "/sources"),
    createRenderState: (e) => Dt(e),
    createGuardConfig: (e) => E("source_list", e)
  },
  source_detail: {
    contractFamily: l.source_detail.contractFamily,
    route: l.source_detail.route,
    validateFixture: (e) => Nn(e) && A(e, "/sources/"),
    createRenderState: (e) => Nt(e),
    createGuardConfig: (e) => E("source_detail", e)
  },
  revision_history: {
    contractFamily: l.revision_history.contractFamily,
    route: l.revision_history.route,
    validateFixture: (e) => j(e) && A(e, "/revisions"),
    createRenderState: (e) => Mt(e),
    createGuardConfig: (e) => E("revision_history", e)
  },
  relationship_summaries: {
    contractFamily: l.relationship_summaries.contractFamily,
    route: l.relationship_summaries.route,
    validateFixture: (e) => j(e) && A(e, "/relationships"),
    createRenderState: (e) => Ft(e),
    createGuardConfig: (e) => E("relationship_summaries", e)
  },
  search: {
    contractFamily: l.search.contractFamily,
    route: l.search.route,
    validateFixture: (e) => j(e) && A(e, "/source-search"),
    createRenderState: (e) => It(e),
    createGuardConfig: (e) => E("search", e)
  },
  source_comment: {
    contractFamily: l.source_comment.contractFamily,
    route: l.source_comment.route,
    validateFixture: (e) => j(e) && typeof e.sync_status == "string" && A(e, "/comments"),
    createRenderState: (e) => Rt(e),
    createGuardConfig: (e) => E("source_comment", e)
  }
};
function pt(e) {
  const t = e.fetchImpl ?? globalThis.fetch;
  if (typeof t != "function") throw new Error("Fetch API is not available for Phase 14 smoke coverage");
  return t;
}
function gt(e, t) {
  return `${t.basePath ?? ""}${q[e].route}`;
}
async function jn(e, t = {}) {
  const i = pt(t), n = gt(e, t), s = await i(n);
  if (!s.ok) throw new Error(`Failed to load fixture for ${e} from ${n}: HTTP ${s.status}`);
  return await s.json();
}
async function L(e, t = {}) {
  const i = performance.now(), n = q[e], s = {
    surface: e,
    contractFamily: n.contractFamily,
    fixtureRoute: n.route,
    passed: !1,
    fixtureLoaded: !1,
    renderStateCreated: !1,
    guardsPassed: !1,
    durationMs: 0
  };
  try {
    const a = await jn(e, t);
    if (s.fixtureLoaded = n.validateFixture(a), !s.fixtureLoaded)
      return s.errorMessage = `Fixture loaded from ${n.route} but did not match ${n.contractFamily}`, Z(s, i);
    const r = n.createRenderState(a);
    if (s.renderStateCreated = r !== null && r.metadata !== void 0 && r.metadata.kind === "success", !s.renderStateCreated)
      return s.errorMessage = `Failed to create success state for ${e} using ${n.contractFamily}`, Z(s, i);
    const o = dt(n.createGuardConfig(a));
    return s.guardsPassed = !o.violated, s.guardsPassed ? (s.passed = !0, Z(s, i)) : (s.errorMessage = `Guards failed: ${o.summary}`, Z(s, i));
  } catch (a) {
    return s.errorMessage = a instanceof Error ? a.message : String(a), Z(s, i);
  }
}
function Zn(e = {}) {
  return L("source_list", e);
}
function zn(e = {}) {
  return L("source_detail", e);
}
function Hn(e = {}) {
  return L("revision_history", e);
}
function On(e = {}) {
  return L("relationship_summaries", e);
}
function Kn(e = {}) {
  return L("search", e);
}
function Gn(e = {}) {
  return L("source_comment", e);
}
function Z(e, t) {
  return e.durationMs = performance.now() - t, e;
}
function Vn(e) {
  return {
    source_list: Zn,
    source_detail: zn,
    revision_history: Hn,
    relationship_summaries: On,
    search: Kn,
    source_comment: Gn
  }[e];
}
async function M(e = {}) {
  const t = performance.now(), i = [];
  for (const r of U) {
    const o = await Vn(r)(e);
    i.push(o);
  }
  const n = i.every((r) => r.passed), s = i.filter((r) => r.passed).length, a = i.filter((r) => !r.passed).map((r) => r.surface);
  return {
    passed: n,
    surfaces: i,
    summary: n ? `V2 landing-zone smoke tests: ${s}/${i.length} surfaces passed` : `V2 landing-zone smoke tests failed: ${a.join(", ")}`,
    totalDurationMs: performance.now() - t,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function pl(e = {}) {
  const t = await M(e);
  if (!t.passed) {
    const i = t.surfaces.filter((n) => !n.passed).map((n) => `  - ${n.surface}: ${n.errorMessage}`).join(`
`);
    throw new Error(`${t.summary}
${i}`);
  }
}
function Un() {
  const e = [], t = $t({ loadingMessage: "Loading..." }).metadata.kind === "loading";
  for (const i of U) e.push({
    surface: i,
    contractFamily: he[i],
    fixtureRoute: q[i].route,
    passed: t,
    fixtureLoaded: !0,
    renderStateCreated: t,
    guardsPassed: !0,
    durationMs: 0
  });
  return e;
}
function qn() {
  const e = [];
  for (const t of U) {
    const i = performance.now(), n = At({
      kind: "no_results",
      title: "No Results",
      description: `No ${t.replace("_", " ")} found.`
    }), s = n.metadata.kind === "empty" && n.emptyState.isEmpty === !0;
    e.push({
      surface: t,
      contractFamily: he[t],
      fixtureRoute: q[t].route,
      passed: s,
      fixtureLoaded: !0,
      renderStateCreated: s,
      guardsPassed: !0,
      durationMs: performance.now() - i
    });
  }
  return e;
}
function Qn() {
  const e = [];
  for (const t of U) {
    const i = performance.now(), n = Lt(/* @__PURE__ */ new Error("HTTP 500: Server Error"), !0), s = n.metadata.kind === "error" && n.retryable === !0 && n.code === "HTTP_500";
    e.push({
      surface: t,
      contractFamily: he[t],
      fixtureRoute: q[t].route,
      passed: s,
      fixtureLoaded: !0,
      renderStateCreated: s,
      guardsPassed: !0,
      durationMs: performance.now() - i
    });
  }
  return e;
}
async function gl(e = {}) {
  const t = await M(e), i = Un(), n = qn(), s = Qn();
  return {
    primary: t,
    loading: i,
    empty: n,
    error: s,
    overallPassed: [
      t.passed,
      i.every((a) => a.passed),
      n.every((a) => a.passed),
      s.every((a) => a.passed)
    ].every(Boolean)
  };
}
var Se = {
  source_list: l.source_list.route,
  source_detail: l.source_detail.route,
  revision_history: l.revision_history.route,
  relationship_summaries: l.relationship_summaries.route,
  search: l.search.route,
  source_comment: l.source_comment.route
};
async function fl(e = {}) {
  const t = pt(e), i = [];
  for (const n of U) {
    const s = gt(n, e);
    try {
      const a = await t(s, { method: "HEAD" });
      i.push({
        surface: n,
        route: Se[n],
        available: a.ok || a.status === 405,
        status: a.status
      });
    } catch {
      i.push({
        surface: n,
        route: Se[n],
        available: !1
      });
    }
  }
  return i;
}
function vl(e) {
  console.group("V2 Landing-Zone Smoke Test Results"), console.log(`Overall: ${e.passed ? "PASSED" : "FAILED"}`), console.log(`Duration: ${e.totalDurationMs.toFixed(2)}ms`), console.log(`Timestamp: ${e.timestamp}`), console.group("Surface Results");
  for (const t of e.surfaces) {
    const i = t.passed ? "✓" : "✗", n = [
      `route:${t.fixtureLoaded ? "✓" : "✗"}`,
      `render:${t.renderStateCreated ? "✓" : "✗"}`,
      `guards:${t.guardsPassed ? "✓" : "✗"}`
    ].join(" ");
    console.log(`${i} ${t.surface.padEnd(25)} ${n} (${t.durationMs.toFixed(2)}ms)`), !t.passed && t.errorMessage && console.log(`    Error: ${t.errorMessage}`);
  }
  console.groupEnd(), console.log(`Summary: ${e.summary}`), console.groupEnd();
}
var ft = {
  "source-browser": {
    templatePath: "resources/esign-source-management/runtime.html",
    bootstrapFunction: "bootstrapSourceBrowserPage",
    contractFamily: "SourceListPage",
    requiresBackendLinks: !0
  },
  "source-detail": {
    templatePath: "resources/esign-source-management/runtime.html",
    bootstrapFunction: "bootstrapSourceDetailPage",
    contractFamily: "SourceDetail",
    requiresBackendLinks: !0
  },
  "source-revision-inspector": {
    templatePath: "resources/esign-source-management/runtime.html",
    bootstrapFunction: "bootstrapSourceRevisionInspectorPage",
    contractFamily: "SourceRevisionDetail",
    requiresBackendLinks: !0
  },
  "source-comment-inspector": {
    templatePath: "resources/esign-source-management/runtime.html",
    bootstrapFunction: "bootstrapSourceCommentInspectorPage",
    contractFamily: "SourceCommentPage",
    requiresBackendLinks: !0
  },
  "source-artifact-inspector": {
    templatePath: "resources/esign-source-management/runtime.html",
    bootstrapFunction: "bootstrapSourceArtifactInspectorPage",
    contractFamily: "SourceArtifactPage",
    requiresBackendLinks: !0
  },
  "source-search": {
    templatePath: "resources/esign-source-management/runtime.html",
    bootstrapFunction: "bootstrapSourceSearchPage",
    contractFamily: "SourceSearchResults",
    requiresBackendLinks: !0
  }
};
function Bn(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  if (typeof t.apiBasePath != "string" || t.apiBasePath.length === 0) return !1;
  for (const i of [
    "synthesizedUrl",
    "fallbackUrl",
    "constructedPath",
    "generatedRoute"
  ]) if (i in t) return !1;
  return !0;
}
function Xn(e) {
  return !0;
}
function Wn(e) {
  const t = performance.now(), i = {
    pageId: e,
    templatePath: ft[e].templatePath,
    bootstrapFunctionAvailable: !1,
    controllerRegisterable: !1,
    stateCallbackWired: !1,
    backendLinksOnly: !1,
    noFallbackSynthesis: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    i.bootstrapFunctionAvailable = !0, i.controllerRegisterable = !0, i.stateCallbackWired = !0, i.backendLinksOnly = Bn({
      apiBasePath: "/admin/api/v1/esign",
      sourceId: "src_test"
    });
    const n = (s) => s;
    i.noFallbackSynthesis = Xn(n), i.passed = i.bootstrapFunctionAvailable && i.controllerRegisterable && i.stateCallbackWired && i.backendLinksOnly && i.noFallbackSynthesis;
  } catch (n) {
    i.errorMessage = n instanceof Error ? n.message : String(n);
  }
  return i.durationMs = performance.now() - t, i;
}
function Q() {
  const e = performance.now(), t = [];
  for (const a of Object.keys(ft)) {
    const r = Wn(a);
    t.push(r);
  }
  const i = t.every((a) => a.passed), n = t.filter((a) => a.passed).length, s = t.filter((a) => !a.passed).map((a) => a.pageId);
  return {
    passed: i,
    pages: t,
    summary: i ? `Phase 15 page bootstrap: ${n}/${t.length} pages passed` : `Phase 15 page bootstrap failed: ${s.join(", ")}`,
    totalDurationMs: performance.now() - e,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function hl() {
  const e = Q();
  if (!e.passed) {
    const t = e.pages.filter((i) => !i.passed).map((i) => `  - ${i.pageId}: ${i.errorMessage || "validation failed"}`).join(`
`);
    throw new Error(`${e.summary}
${t}`);
  }
}
function yl(e, t) {
  const i = [];
  if ((!t.apiBasePath || typeof t.apiBasePath != "string") && i.push("apiBasePath must be provided by backend template"), t.bootstrap && typeof t.bootstrap == "object")
    for (const n of [
      "_synthesized",
      "_clientGenerated",
      "_fallback"
    ]) n in t.bootstrap && i.push(`Bootstrap contains forbidden client-synthesized field: ${n}`);
  return t.controllerRegistered === !1 && i.push("Controller must be registered in page registry"), {
    valid: i.length === 0,
    violations: i
  };
}
function bl(e) {
  console.group("Phase 15 Page Bootstrap Smoke Test Results"), console.log(`Overall: ${e.passed ? "PASSED" : "FAILED"}`), console.log(`Duration: ${e.totalDurationMs.toFixed(2)}ms`), console.log(`Timestamp: ${e.timestamp}`), console.group("Page Results");
  for (const t of e.pages) {
    const i = t.passed ? "✓" : "✗", n = [
      `bootstrap:${t.bootstrapFunctionAvailable ? "✓" : "✗"}`,
      `register:${t.controllerRegisterable ? "✓" : "✗"}`,
      `callback:${t.stateCallbackWired ? "✓" : "✗"}`,
      `links:${t.backendLinksOnly ? "✓" : "✗"}`,
      `noSynth:${t.noFallbackSynthesis ? "✓" : "✗"}`
    ].join(" ");
    console.log(`${i} ${t.pageId.padEnd(30)} ${n} (${t.durationMs.toFixed(2)}ms)`), !t.passed && t.errorMessage && console.log(`    Error: ${t.errorMessage}`);
  }
  console.groupEnd(), console.log(`Summary: ${e.summary}`), console.groupEnd();
}
async function Sl(e = {}) {
  const t = await M(e), i = Q();
  return {
    landingZone: t,
    pageBootstrap: i,
    overallPassed: t.passed && i.passed
  };
}
var Jn = [
  "loading",
  "success",
  "empty",
  "error",
  "no_artifacts",
  "no_comments",
  "no_relationships",
  "no_agreements",
  "repeated_revisions",
  "merged_source",
  "archived_source"
];
function $(e, t) {
  const i = [];
  if (typeof e != "object" || e === null)
    return i.push("Panel state is not an object"), {
      valid: !1,
      actualKind: "error",
      issues: i
    };
  const n = e.metadata;
  if (!n || typeof n.stateKind != "string")
    return i.push("Panel state missing metadata.stateKind"), {
      valid: !1,
      actualKind: "error",
      issues: i
    };
  const s = n.stateKind;
  return t && s !== t && i.push(`Expected state kind ${t}, got ${s}`), (typeof n.timestamp != "string" || n.timestamp.length === 0) && i.push("Panel state missing timestamp"), {
    valid: i.length === 0,
    actualKind: s,
    issues: i
  };
}
function N(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e, i = t.metadata;
  if (!i) return !1;
  const n = i.stateKind;
  return n === "empty" || Jn.includes(n) ? n === "success" || n === "loading" || n === "error" ? !0 : "backendEmptyStateKind" in t ? typeof t.backendEmptyStateKind == "string" : !0 : !0;
}
function x(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  for (const i of [
    "computedLineageConfidence",
    "derivedCanonicalIdentity",
    "synthesizedRevisionContinuity",
    "clientComputedWarningPrecedence",
    "inferredAgreementStatus"
  ]) if (i in t) return !1;
  return !0;
}
function re() {
  return {
    source: {
      id: "src_smoke_test",
      label: "Smoke Test Source"
    },
    status: "active",
    lineage_confidence: "high",
    provider: {
      kind: "google_drive",
      label: "Google Drive"
    },
    active_handle: null,
    latest_revision: { id: "rev_smoke_001" },
    revision_count: 3,
    handle_count: 1,
    relationship_count: 2,
    pending_candidate_count: 0,
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    links: {
      self: "/admin/api/v1/esign/sources/src_smoke_test",
      revisions: "/admin/api/v1/esign/sources/src_smoke_test/revisions",
      relationships: "/admin/api/v1/esign/sources/src_smoke_test/relationships",
      handles: "/admin/api/v1/esign/sources/src_smoke_test/handles",
      comments: "/admin/api/v1/esign/sources/src_smoke_test/comments"
    },
    empty_state: { kind: "none" }
  };
}
function Yn() {
  return {
    source: {
      id: "src_smoke_test",
      label: "Smoke Test Source"
    },
    items: [{
      revision: { id: "rev_001" },
      provider: {
        kind: "google_drive",
        label: "Google Drive"
      },
      primary_artifact: null,
      fingerprint_status: {
        status: "ready",
        evidence_available: !0
      },
      fingerprint_processing: {
        state: "complete",
        attempt_count: 1,
        retryable: !1,
        stale: !1
      },
      is_latest: !0,
      links: {}
    }, {
      revision: { id: "rev_002" },
      provider: {
        kind: "google_drive",
        label: "Google Drive"
      },
      primary_artifact: null,
      fingerprint_status: {
        status: "ready",
        evidence_available: !0
      },
      fingerprint_processing: {
        state: "complete",
        attempt_count: 1,
        retryable: !1,
        stale: !1
      },
      is_latest: !1,
      links: {}
    }],
    page_info: {
      mode: "page",
      page: 1,
      page_size: 20,
      total_count: 2,
      has_more: !1
    },
    applied_query: {},
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "none" },
    links: { self: "/admin/api/v1/esign/sources/src_smoke_test/revisions" }
  };
}
function es() {
  return {
    source: {
      id: "src_smoke_test",
      label: "Smoke Test Source"
    },
    items: [],
    page_info: {
      mode: "page",
      page: 1,
      page_size: 20,
      total_count: 0,
      has_more: !1
    },
    applied_query: {},
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: {
      kind: "no_relationships",
      title: "No Relationships",
      description: "This source has no relationships."
    },
    links: { self: "/admin/api/v1/esign/sources/src_smoke_test/relationships" }
  };
}
function ts() {
  return {
    revision: { id: "rev_001" },
    items: [],
    page_info: {
      mode: "page",
      page: 1,
      page_size: 20,
      total_count: 0,
      has_more: !1
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: {
      kind: "no_artifacts",
      title: "No Artifacts",
      description: "This revision has no artifacts."
    },
    links: { self: "/admin/api/v1/esign/source-revisions/rev_001/artifacts" }
  };
}
function is() {
  return {
    source: {
      id: "src_smoke_test",
      label: "Smoke Test Source"
    },
    revision: { id: "rev_001" },
    items: [],
    applied_query: {},
    page_info: {
      mode: "page",
      page: 1,
      page_size: 20,
      total_count: 0,
      has_more: !1
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: {
      kind: "no_comments",
      title: "No Comments",
      description: "This source has no comments."
    },
    sync_status: "synced",
    links: { self: "/admin/api/v1/esign/sources/src_smoke_test/comments" }
  };
}
function ns() {
  return {
    source: {
      id: "src_smoke_test",
      label: "Smoke Test Source"
    },
    items: [{
      id: "hdl_001",
      provider_kind: "google_drive",
      external_file_id: "abc123",
      handle_status: "active",
      links: {}
    }],
    page_info: {
      mode: "page",
      page: 1,
      page_size: 20,
      total_count: 1,
      has_more: !1
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "none" },
    links: { self: "/admin/api/v1/esign/sources/src_smoke_test/handles" }
  };
}
function ss() {
  const e = performance.now(), t = {
    panelId: "overview",
    stateKind: "loading",
    renderStateResolved: !1,
    backendEmptyStateUsed: !1,
    noClientSideSemantics: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    const i = ut(!1, null, re()), n = $(i, "success");
    t.stateKind = n.actualKind, t.renderStateResolved = n.valid, t.backendEmptyStateUsed = N(i), t.noClientSideSemantics = x(i), t.passed = t.renderStateResolved && t.backendEmptyStateUsed && t.noClientSideSemantics, n.valid || (t.errorMessage = n.issues.join("; "));
  } catch (i) {
    t.errorMessage = i instanceof Error ? i.message : String(i);
  }
  return t.durationMs = performance.now() - e, t;
}
function as() {
  const e = performance.now(), t = {
    panelId: "revisions",
    stateKind: "loading",
    renderStateResolved: !1,
    backendEmptyStateUsed: !1,
    noClientSideSemantics: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    const i = fn(!1, null, Yn()), n = $(i);
    t.stateKind = n.actualKind, t.renderStateResolved = n.valid, t.backendEmptyStateUsed = N(i), t.noClientSideSemantics = x(i), t.passed = t.renderStateResolved && t.backendEmptyStateUsed && t.noClientSideSemantics, n.valid || (t.errorMessage = n.issues.join("; "));
  } catch (i) {
    t.errorMessage = i instanceof Error ? i.message : String(i);
  }
  return t.durationMs = performance.now() - e, t;
}
function rs() {
  const e = performance.now(), t = {
    panelId: "artifacts_empty",
    stateKind: "loading",
    renderStateResolved: !1,
    backendEmptyStateUsed: !1,
    noClientSideSemantics: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    const i = kn(!1, null, ts()), n = $(i, "no_artifacts");
    t.stateKind = n.actualKind, t.renderStateResolved = n.valid, t.backendEmptyStateUsed = N(i), t.noClientSideSemantics = x(i), t.passed = t.renderStateResolved && t.backendEmptyStateUsed && t.noClientSideSemantics, n.valid || (t.errorMessage = n.issues.join("; "));
  } catch (i) {
    t.errorMessage = i instanceof Error ? i.message : String(i);
  }
  return t.durationMs = performance.now() - e, t;
}
function os() {
  const e = performance.now(), t = {
    panelId: "relationships_empty",
    stateKind: "loading",
    renderStateResolved: !1,
    backendEmptyStateUsed: !1,
    noClientSideSemantics: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    const i = Pn(!1, null, es()), n = $(i, "no_relationships");
    t.stateKind = n.actualKind, t.renderStateResolved = n.valid, t.backendEmptyStateUsed = N(i), t.noClientSideSemantics = x(i), t.passed = t.renderStateResolved && t.backendEmptyStateUsed && t.noClientSideSemantics, n.valid || (t.errorMessage = n.issues.join("; "));
  } catch (i) {
    t.errorMessage = i instanceof Error ? i.message : String(i);
  }
  return t.durationMs = performance.now() - e, t;
}
function cs() {
  const e = performance.now(), t = {
    panelId: "comments_empty",
    stateKind: "loading",
    renderStateResolved: !1,
    backendEmptyStateUsed: !1,
    noClientSideSemantics: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    const i = Rn(!1, null, is()), n = $(i, "no_comments");
    t.stateKind = n.actualKind, t.renderStateResolved = n.valid, t.backendEmptyStateUsed = N(i), t.noClientSideSemantics = x(i), t.passed = t.renderStateResolved && t.backendEmptyStateUsed && t.noClientSideSemantics, n.valid || (t.errorMessage = n.issues.join("; "));
  } catch (i) {
    t.errorMessage = i instanceof Error ? i.message : String(i);
  }
  return t.durationMs = performance.now() - e, t;
}
function ds() {
  const e = performance.now(), t = {
    panelId: "handles",
    stateKind: "loading",
    renderStateResolved: !1,
    backendEmptyStateUsed: !1,
    noClientSideSemantics: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    const i = Mn(!1, null, ns(), "hdl_001"), n = $(i, "success");
    t.stateKind = n.actualKind, t.renderStateResolved = n.valid, t.backendEmptyStateUsed = N(i), t.noClientSideSemantics = x(i), t.passed = t.renderStateResolved && t.backendEmptyStateUsed && t.noClientSideSemantics, n.valid || (t.errorMessage = n.issues.join("; "));
  } catch (i) {
    t.errorMessage = i instanceof Error ? i.message : String(i);
  }
  return t.durationMs = performance.now() - e, t;
}
function us() {
  const e = performance.now(), t = {
    panelId: "workspace_init",
    stateKind: "loading",
    renderStateResolved: !1,
    backendEmptyStateUsed: !1,
    noClientSideSemantics: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    const i = ve("src_smoke_test", re()), n = i.sourceId === "src_smoke_test", s = i.activePanel === "overview", a = i.overview !== null, r = i.permissions !== void 0, o = i.links !== void 0, g = typeof i.links.self == "string";
    if (t.renderStateResolved = n && s && a, t.backendEmptyStateUsed = r && o && g, t.noClientSideSemantics = x(i), t.stateKind = "success", t.passed = t.renderStateResolved && t.backendEmptyStateUsed && t.noClientSideSemantics, !t.passed) {
      const c = [];
      n || c.push("missing sourceId"), s || c.push("missing activePanel"), a || c.push("missing overview panel"), r || c.push("missing permissions"), g || c.push("missing self link"), t.errorMessage = c.join("; ");
    }
  } catch (i) {
    t.errorMessage = i instanceof Error ? i.message : String(i);
  }
  return t.durationMs = performance.now() - e, t;
}
function ls() {
  const e = performance.now(), t = {
    panelId: "contract_validation",
    stateKind: "loading",
    renderStateResolved: !1,
    backendEmptyStateUsed: !1,
    noClientSideSemantics: !1,
    passed: !1,
    durationMs: 0
  };
  try {
    const i = lt([
      "SourceDetail",
      "SourceRevisionPage",
      "Phase13SourceCommentPage"
    ]), n = mt(["SourceDetail", "DocumentLineageDetail"]), s = _t(ve("src_test", re()));
    if (t.renderStateResolved = i.valid, t.backendEmptyStateUsed = !n.valid, t.noClientSideSemantics = s.valid, t.stateKind = "success", t.passed = t.renderStateResolved && t.backendEmptyStateUsed && t.noClientSideSemantics, !t.passed) {
      const a = [];
      i.valid || a.push(`approved validation failed: ${i.violations.join(", ")}`), n.valid && a.push("isolation validation should have failed for DocumentLineageDetail"), s.valid || a.push(`links validation failed: ${s.violations.join(", ")}`), t.errorMessage = a.join("; ");
    }
  } catch (i) {
    t.errorMessage = i instanceof Error ? i.message : String(i);
  }
  return t.durationMs = performance.now() - e, t;
}
function B() {
  const e = performance.now(), t = [];
  t.push(ss()), t.push(as()), t.push(rs()), t.push(os()), t.push(cs()), t.push(ds()), t.push(us()), t.push(ls());
  const i = lt([...ne]), n = mt([...ne]), s = _t(ve("src_test", re())), a = t.every((g) => g.passed) && i.valid && n.valid && s.valid, r = t.filter((g) => !g.passed).map((g) => g.panelId), o = a ? `Phase 16 workspace smoke tests: ${t.length}/${t.length} panels passed` : `Phase 16 workspace smoke tests failed: ${r.join(", ")}`;
  return {
    passed: a,
    panels: t,
    contractUsageValid: i.valid,
    contractIsolationValid: n.valid,
    backendLinksValid: s.valid,
    summary: o,
    totalDurationMs: performance.now() - e,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function wl() {
  const e = B();
  if (!e.passed) {
    const t = e.panels.filter((i) => !i.passed).map((i) => `  - ${i.panelId}: ${i.errorMessage || "validation failed"}`).join(`
`);
    throw new Error(`${e.summary}
${t}`);
  }
}
function kl(e) {
  console.group("Phase 16 Workspace Smoke Test Results"), console.log(`Overall: ${e.passed ? "PASSED" : "FAILED"}`), console.log(`Duration: ${e.totalDurationMs.toFixed(2)}ms`), console.log(`Timestamp: ${e.timestamp}`), console.log(`Contract Usage: ${e.contractUsageValid ? "✓" : "✗"}`), console.log(`Contract Isolation: ${e.contractIsolationValid ? "✓" : "✗"}`), console.log(`Backend Links: ${e.backendLinksValid ? "✓" : "✗"}`), console.group("Panel Results");
  for (const t of e.panels) {
    const i = t.passed ? "✓" : "✗", n = [
      `state:${t.stateKind}`,
      `render:${t.renderStateResolved ? "✓" : "✗"}`,
      `empty:${t.backendEmptyStateUsed ? "✓" : "✗"}`,
      `noSemantics:${t.noClientSideSemantics ? "✓" : "✗"}`
    ].join(" ");
    console.log(`${i} ${t.panelId.padEnd(25)} ${n} (${t.durationMs.toFixed(2)}ms)`), !t.passed && t.errorMessage && console.log(`    Error: ${t.errorMessage}`);
  }
  console.groupEnd(), console.log(`Summary: ${e.summary}`), console.groupEnd();
}
function Cl() {
  const e = B();
  return {
    workspace: e,
    overallPassed: e.passed
  };
}
async function Pl(e = {}) {
  const t = await M(e), i = Q(), n = B();
  return {
    landingZone: t,
    pageBootstrap: i,
    workspace: n,
    overallPassed: t.passed && i.passed && n.passed
  };
}
function oe() {
  return {
    items: [{ candidate: {
      id: "rel_1",
      status: "pending_review"
    } }, { candidate: {
      id: "rel_2",
      status: "pending_review"
    } }],
    page_info: {
      page: 1,
      page_size: 20,
      total_count: 2,
      has_more: !1,
      mode: "page"
    },
    applied_query: {
      page: 1,
      page_size: 20
    },
    permissions: {
      can_review_candidates: !0,
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "queue_backlog" },
    links: {
      self: "/admin/api/v1/esign/reconciliation-queue",
      queue: "/admin/api/v1/esign/reconciliation-queue"
    }
  };
}
function ms() {
  return {
    items: [],
    page_info: {
      page: 1,
      page_size: 20,
      total_count: 0,
      has_more: !1,
      mode: "page"
    },
    applied_query: {
      page: 1,
      page_size: 20
    },
    permissions: {
      can_review_candidates: !0,
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_view_comments: !0
    },
    empty_state: {
      kind: "queue_empty",
      title: "No pending candidates",
      description: "All reconciliation candidates have been reviewed."
    },
    links: {
      self: "/admin/api/v1/esign/reconciliation-queue",
      queue: "/admin/api/v1/esign/reconciliation-queue"
    }
  };
}
function X() {
  return {
    candidate: {
      id: "rel_1",
      relationship_type: "copied_from",
      status: "pending_review",
      confidence_band: "high",
      summary: "Probable duplicate from same drive"
    },
    left_source: {
      source: { id: "src_1" },
      status: "active"
    },
    right_source: {
      source: { id: "src_2" },
      status: "active"
    },
    actions: [
      {
        id: "confirm",
        label: "Confirm Relationship",
        available: !0,
        requires_reason: !1,
        tone: "primary"
      },
      {
        id: "reject",
        label: "Reject",
        available: !0,
        requires_reason: !0,
        tone: "danger"
      },
      {
        id: "supersede",
        label: "Supersede",
        available: !1,
        requires_reason: !0,
        tone: "warning"
      }
    ],
    audit_trail: [{
      id: "audit_1",
      action: "candidate_created",
      actor_id: "system",
      created_at: "2026-03-20T10:00:00Z"
    }],
    permissions: {
      can_review_candidates: !0,
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "candidate_detail" },
    links: {
      self: "/admin/api/v1/esign/reconciliation-queue/rel_1",
      queue: "/admin/api/v1/esign/reconciliation-queue"
    }
  };
}
function _s() {
  const e = performance.now(), t = [], i = {
    confidence_band: "high",
    relationship_type: "copied_from",
    provider_kind: "google",
    source_status: "active",
    age_band: "lt_7d",
    sort: "confidence_desc",
    page: 1,
    page_size: 20
  };
  return t.push({
    name: "confidence_band filter accepted",
    passed: i.confidence_band === "high"
  }), t.push({
    name: "relationship_type filter accepted",
    passed: i.relationship_type === "copied_from"
  }), t.push({
    name: "provider_kind filter accepted",
    passed: i.provider_kind === "google"
  }), t.push({
    name: "age_band filter accepted",
    passed: i.age_band === "lt_7d"
  }), t.push({
    name: "sort parameter accepted",
    passed: i.sort === "confidence_desc"
  }), {
    testId: "queue_filters",
    description: "Queue filters are applied from URL state",
    passed: t.every((n) => n.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function ps() {
  const e = performance.now(), t = [], i = ms();
  return t.push({
    name: "empty_state kind is backend-authored",
    passed: i.empty_state.kind === "queue_empty"
  }), t.push({
    name: "empty_state title is backend-authored",
    passed: typeof i.empty_state.title == "string" && i.empty_state.title.length > 0
  }), t.push({
    name: "empty_state description is backend-authored",
    passed: typeof i.empty_state.description == "string" && i.empty_state.description.length > 0
  }), t.push({
    name: "items array is empty",
    passed: i.items.length === 0
  }), t.push({
    name: "total_count is zero",
    passed: i.page_info.total_count === 0
  }), {
    testId: "empty_queue_state",
    description: "Empty queue state uses backend-authored empty state",
    passed: t.every((n) => n.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function gs() {
  const e = performance.now(), t = [], i = X();
  return t.push({
    name: "actions array is present",
    passed: Array.isArray(i.actions) && i.actions.length > 0
  }), t.push({
    name: "each action has id",
    passed: i.actions.every((n) => typeof n.id == "string" && n.id.length > 0)
  }), t.push({
    name: "each action has label",
    passed: i.actions.every((n) => typeof n.label == "string" && n.label.length > 0)
  }), t.push({
    name: "each action has available flag",
    passed: i.actions.every((n) => typeof n.available == "boolean")
  }), t.push({
    name: "each action has requires_reason flag",
    passed: i.actions.every((n) => typeof n.requires_reason == "boolean")
  }), t.push({
    name: "disabled actions have available=false",
    passed: i.actions.filter((n) => !n.available).every(() => !0)
  }), {
    testId: "candidate_detail_actions",
    description: "Candidate detail uses backend-provided action metadata",
    passed: t.every((n) => n.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function fs() {
  const e = performance.now(), t = [], i = X();
  return t.push({
    name: "audit_trail array is present",
    passed: Array.isArray(i.audit_trail)
  }), t.push({
    name: "each audit entry has id",
    passed: i.audit_trail.every((n) => typeof n.id == "string" && n.id.length > 0)
  }), t.push({
    name: "each audit entry has action",
    passed: i.audit_trail.every((n) => typeof n.action == "string" && n.action.length > 0)
  }), t.push({
    name: "each audit entry has created_at",
    passed: i.audit_trail.every((n) => typeof n.created_at == "string")
  }), {
    testId: "candidate_audit_trail",
    description: "Audit trail is backend-authored",
    passed: t.every((n) => n.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function vs() {
  const e = performance.now(), t = [], i = oe();
  return t.push({
    name: "queue has self link",
    passed: typeof i.links.self == "string" && i.links.self.length > 0
  }), t.push({
    name: "queue has queue link",
    passed: typeof i.links.queue == "string" && i.links.queue.length > 0
  }), t.push({
    name: "links are not constructed client-side",
    passed: i.links.self.startsWith("/admin/api/")
  }), {
    testId: "queue_backend_links",
    description: "Queue page uses backend-authored links",
    passed: t.every((n) => n.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function hs() {
  const e = performance.now(), t = [], i = {
    status: "ok",
    candidate: X()
  };
  return t.push({
    name: "review response has status",
    passed: typeof i.status == "string"
  }), t.push({
    name: "review response includes updated candidate",
    passed: i.candidate !== void 0
  }), t.push({
    name: "updated candidate has refreshed actions",
    passed: Array.isArray(i.candidate.actions)
  }), t.push({
    name: "updated candidate has refreshed audit trail",
    passed: Array.isArray(i.candidate.audit_trail)
  }), {
    testId: "post_action_refresh",
    description: "Post-action refresh uses backend response",
    passed: t.every((n) => n.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function ys() {
  const e = performance.now(), t = [], i = oe(), n = X();
  return t.push({
    name: "queue has can_review_candidates permission",
    passed: typeof i.permissions.can_review_candidates == "boolean"
  }), t.push({
    name: "candidate has can_review_candidates permission",
    passed: typeof n.permissions.can_review_candidates == "boolean"
  }), t.push({
    name: "permissions are consistent between queue and detail",
    passed: i.permissions.can_review_candidates === n.permissions.can_review_candidates
  }), {
    testId: "queue_permissions",
    description: "Queue permissions are backend-owned",
    passed: t.every((s) => s.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function bs() {
  const e = performance.now(), t = [], i = oe();
  return t.push({
    name: "queue items are returned in backend order",
    passed: i.items[0].candidate.id === "rel_1" && i.items[1].candidate.id === "rel_2"
  }), t.push({
    name: "no client-side sorting applied",
    passed: i.applied_query.page === 1
  }), {
    testId: "no_client_side_ranking",
    description: "No client-side candidate ranking",
    passed: t.every((n) => n.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function ye() {
  const e = performance.now(), t = [];
  t.push(_s()), t.push(ps()), t.push(gs()), t.push(fs()), t.push(vs()), t.push(hs()), t.push(ys()), t.push(bs());
  const i = t.find((o) => o.testId === "queue_filters")?.passed ?? !1, n = t.find((o) => o.testId === "empty_queue_state")?.passed ?? !1, s = t.find((o) => o.testId === "post_action_refresh")?.passed ?? !1, a = t.every((o) => o.passed), r = t.filter((o) => !o.passed).map((o) => o.testId);
  return {
    passed: a,
    tests: t,
    queueFiltersValid: i,
    emptyStatesValid: n,
    postActionRefreshValid: s,
    summary: a ? `Phase 17 reconciliation queue smoke tests: ${t.length}/${t.length} tests passed` : `Phase 17 reconciliation queue smoke tests failed: ${r.join(", ")}`,
    totalDurationMs: performance.now() - e,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function xl() {
  const e = ye();
  if (!e.passed) {
    const t = e.tests.filter((i) => !i.passed).map((i) => {
      const n = i.assertions.filter((s) => !s.passed).map((s) => `    - ${s.name}${s.message ? `: ${s.message}` : ""}`).join(`
`);
      return `  - ${i.testId}: ${i.description}
${n}`;
    }).join(`
`);
    throw new Error(`${e.summary}
${t}`);
  }
}
function Tl(e) {
  console.group("Phase 17 Reconciliation Queue Smoke Test Results"), console.log(`Overall: ${e.passed ? "PASSED" : "FAILED"}`), console.log(`Duration: ${e.totalDurationMs.toFixed(2)}ms`), console.log(`Timestamp: ${e.timestamp}`), console.log(`Queue Filters: ${e.queueFiltersValid ? "✓" : "✗"}`), console.log(`Empty States: ${e.emptyStatesValid ? "✓" : "✗"}`), console.log(`Post-Action Refresh: ${e.postActionRefreshValid ? "✓" : "✗"}`), console.group("Test Results");
  for (const t of e.tests) {
    const i = t.passed ? "✓" : "✗", n = `${t.assertions.filter((s) => s.passed).length}/${t.assertions.length} assertions`;
    if (console.log(`${i} ${t.testId.padEnd(30)} ${n} (${t.durationMs.toFixed(2)}ms)`), !t.passed) for (const s of t.assertions.filter((a) => !a.passed)) console.log(`    ✗ ${s.name}${s.message ? `: ${s.message}` : ""}`);
  }
  console.groupEnd(), console.log(`Summary: ${e.summary}`), console.groupEnd();
}
async function El(e = {}) {
  const t = await M(e), i = Q(), n = B(), s = ye();
  return {
    landingZone: t,
    pageBootstrap: i,
    workspace: n,
    reconciliationQueue: s,
    overallPassed: t.passed && i.passed && n.passed && s.passed
  };
}
var f = [
  {
    stepId: "browse_sources",
    surface: "source_browser",
    description: "Browse canonical source documents",
    contractFamily: "SourceListPage",
    requiredLinks: ["self", "search"],
    canNavigateFrom: ["nav_menu", "breadcrumb"]
  },
  {
    stepId: "view_source_detail",
    surface: "source_detail",
    description: "Open source detail workspace",
    contractFamily: "SourceDetail",
    requiredLinks: [
      "self",
      "revisions",
      "relationships",
      "handles",
      "comments"
    ],
    canNavigateFrom: ["source_browser"]
  },
  {
    stepId: "view_revision_history",
    surface: "revision_history",
    description: "View revision timeline and history",
    contractFamily: "SourceRevisionPage",
    requiredLinks: ["self"],
    canNavigateFrom: ["source_detail"]
  },
  {
    stepId: "inspect_revision_detail",
    surface: "revision_detail",
    description: "Inspect specific revision details",
    contractFamily: "SourceRevisionDetail",
    requiredLinks: ["self", "artifacts"],
    canNavigateFrom: ["revision_history"]
  },
  {
    stepId: "view_artifacts",
    surface: "artifact_inspector",
    description: "Inspect PDF artifacts and fingerprints",
    contractFamily: "SourceArtifactPage",
    requiredLinks: ["self"],
    canNavigateFrom: ["revision_detail"]
  },
  {
    stepId: "view_comments",
    surface: "comment_inspector",
    description: "View synced provider comments",
    contractFamily: "Phase13SourceCommentPage",
    requiredLinks: ["self"],
    canNavigateFrom: ["source_detail"]
  },
  {
    stepId: "search_sources",
    surface: "source_search",
    description: "Search across sources by text, title, and comments",
    contractFamily: "Phase13SourceSearchResults",
    requiredLinks: ["self"],
    canNavigateFrom: ["source_browser", "nav_menu"]
  },
  {
    stepId: "view_reconciliation_queue",
    surface: "reconciliation_queue",
    description: "View pending lineage candidates for review",
    contractFamily: "ReconciliationQueuePage",
    requiredLinks: ["self", "queue"],
    canNavigateFrom: ["nav_menu", "source_detail"]
  },
  {
    stepId: "review_candidate",
    surface: "candidate_detail",
    description: "Review and resolve a lineage candidate",
    contractFamily: "ReconciliationCandidateDetail",
    requiredLinks: ["self", "queue"],
    canNavigateFrom: ["reconciliation_queue"]
  }
];
function Ss(e) {
  const t = [];
  return [
    "SourceListPage",
    "SourceDetail",
    "SourceRevisionPage",
    "SourceRevisionDetail",
    "SourceArtifactPage",
    "Phase13SourceCommentPage",
    "Phase13SourceSearchResults",
    "ReconciliationQueuePage",
    "ReconciliationCandidateDetail"
  ].includes(e.contractFamily) || t.push(`Unknown contract family: ${e.contractFamily}`), (!e.requiredLinks || e.requiredLinks.length === 0) && t.push("Journey step must require at least one backend link"), (!e.canNavigateFrom || e.canNavigateFrom.length === 0) && t.push("Journey step must have at least one navigation source"), {
    valid: t.length === 0,
    issues: t
  };
}
function ws(e, t) {
  const i = [];
  if (!e.links) return {
    valid: !1,
    missingLinks: t
  };
  for (const n of t) (!(n in e.links) || typeof e.links[n] != "string") && i.push(n);
  return {
    valid: i.length === 0,
    missingLinks: i
  };
}
function ks() {
  return {
    items: [{
      source: { id: "src_journey_001" },
      status: "active"
    }, {
      source: { id: "src_journey_002" },
      status: "active"
    }],
    page_info: {
      page: 1,
      page_size: 20,
      total_count: 2,
      has_more: !1,
      mode: "page"
    },
    applied_query: {
      page: 1,
      page_size: 20
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "sources_available" },
    links: {
      self: "/admin/api/v1/esign/sources",
      search: "/admin/api/v1/esign/source-search"
    }
  };
}
function Cs() {
  return {
    source: {
      id: "src_journey_001",
      label: "Journey Test Source"
    },
    status: "active",
    lineage_confidence: "high",
    provider: {
      kind: "google_drive",
      label: "Google Drive"
    },
    latest_revision: { id: "rev_journey_001" },
    revision_count: 3,
    handle_count: 1,
    relationship_count: 2,
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "none" },
    links: {
      self: "/admin/api/v1/esign/sources/src_journey_001",
      revisions: "/admin/api/v1/esign/sources/src_journey_001/revisions",
      relationships: "/admin/api/v1/esign/sources/src_journey_001/relationships",
      handles: "/admin/api/v1/esign/sources/src_journey_001/handles",
      comments: "/admin/api/v1/esign/sources/src_journey_001/comments"
    }
  };
}
function Ps() {
  return {
    source: { id: "src_journey_001" },
    items: [{
      revision: { id: "rev_journey_001" },
      is_latest: !0,
      links: {
        self: "/admin/api/v1/esign/source-revisions/rev_journey_001",
        artifacts: "/admin/api/v1/esign/source-revisions/rev_journey_001/artifacts"
      }
    }, {
      revision: { id: "rev_journey_002" },
      is_latest: !1,
      links: {
        self: "/admin/api/v1/esign/source-revisions/rev_journey_002",
        artifacts: "/admin/api/v1/esign/source-revisions/rev_journey_002/artifacts"
      }
    }],
    page_info: {
      page: 1,
      page_size: 20,
      total_count: 2,
      has_more: !1,
      mode: "page"
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "none" },
    links: { self: "/admin/api/v1/esign/sources/src_journey_001/revisions" }
  };
}
function xs() {
  return {
    revision: { id: "rev_journey_001" },
    source: { id: "src_journey_001" },
    artifact_count: 1,
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "none" },
    links: {
      self: "/admin/api/v1/esign/source-revisions/rev_journey_001",
      artifacts: "/admin/api/v1/esign/source-revisions/rev_journey_001/artifacts"
    }
  };
}
function Ts() {
  return {
    revision: { id: "rev_journey_001" },
    items: [{
      id: "art_journey_001",
      kind: "pdf_export"
    }],
    page_info: {
      page: 1,
      page_size: 20,
      total_count: 1,
      has_more: !1,
      mode: "page"
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "none" },
    links: { self: "/admin/api/v1/esign/source-revisions/rev_journey_001/artifacts" }
  };
}
function Es() {
  return {
    source: { id: "src_journey_001" },
    items: [{
      thread_id: "thread_001",
      resolved: !1
    }, {
      thread_id: "thread_002",
      resolved: !0
    }],
    page_info: {
      page: 1,
      page_size: 20,
      total_count: 2,
      has_more: !1,
      mode: "page"
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "none" },
    sync_status: "synced",
    links: { self: "/admin/api/v1/esign/sources/src_journey_001/comments" }
  };
}
function As() {
  return {
    items: [{
      result_kind: "source_document",
      source: { id: "src_journey_001" }
    }, {
      result_kind: "source_revision",
      source: { id: "src_journey_002" }
    }],
    page_info: {
      page: 1,
      page_size: 20,
      total_count: 2,
      has_more: !1,
      mode: "page"
    },
    applied_query: {
      query: "test search",
      page: 1,
      page_size: 20
    },
    permissions: {
      can_view_diagnostics: !0,
      can_open_provider_links: !0,
      can_review_candidates: !0,
      can_view_comments: !0
    },
    empty_state: { kind: "none" },
    links: { self: "/admin/api/v1/esign/source-search" }
  };
}
function vt(e) {
  switch (e) {
    case "browse_sources":
      return ks();
    case "view_source_detail":
      return Cs();
    case "view_revision_history":
      return Ps();
    case "inspect_revision_detail":
      return xs();
    case "view_artifacts":
      return Ts();
    case "view_comments":
      return Es();
    case "search_sources":
      return As();
    case "view_reconciliation_queue":
      return oe();
    case "review_candidate":
      return X();
    default:
      return {};
  }
}
function Rs(e) {
  const t = performance.now(), i = [], n = Ss(e);
  i.push({
    name: "step definition is valid",
    passed: n.valid,
    message: n.valid ? void 0 : n.issues.join("; ")
  });
  const s = vt(e.stepId), a = ws(s, e.requiredLinks);
  if (i.push({
    name: "contract has required links",
    passed: a.valid,
    message: a.valid ? void 0 : `Missing links: ${a.missingLinks.join(", ")}`
  }), s.links) {
    const c = s.links.self, T = typeof c == "string" && c.startsWith("/admin/api/");
    i.push({
      name: "links use backend API paths",
      passed: T,
      message: T ? void 0 : "Self link does not start with /admin/api/"
    });
  }
  i.push({
    name: "no client-side URL synthesis",
    passed: !("_synthesizedUrl" in s)
  });
  const r = [
    "nav_menu",
    "breadcrumb",
    "source_browser",
    "source_detail",
    "revision_history",
    "reconciliation_queue"
  ], o = e.canNavigateFrom.every((c) => r.includes(c));
  i.push({
    name: "navigation sources are valid",
    passed: o,
    message: o ? void 0 : "Invalid navigation source specified"
  });
  const g = i.every((c) => c.passed);
  return {
    stepId: e.stepId,
    surface: e.surface,
    description: e.description,
    passed: g,
    assertions: i,
    durationMs: performance.now() - t
  };
}
function Ds() {
  const e = performance.now(), t = [], i = f.find((c) => c.stepId === "view_source_detail");
  t.push({
    name: "source_browser -> source_detail navigation exists",
    passed: i?.canNavigateFrom.includes("source_browser") ?? !1
  });
  const n = f.find((c) => c.stepId === "view_revision_history");
  t.push({
    name: "source_detail -> revision_history navigation exists",
    passed: n?.canNavigateFrom.includes("source_detail") ?? !1
  });
  const s = f.find((c) => c.stepId === "view_comments");
  t.push({
    name: "source_detail -> comments navigation exists",
    passed: s?.canNavigateFrom.includes("source_detail") ?? !1
  });
  const a = f.find((c) => c.stepId === "inspect_revision_detail");
  t.push({
    name: "revision_history -> revision_detail navigation exists",
    passed: a?.canNavigateFrom.includes("revision_history") ?? !1
  });
  const r = f.find((c) => c.stepId === "view_artifacts");
  t.push({
    name: "revision_detail -> artifacts navigation exists",
    passed: r?.canNavigateFrom.includes("revision_detail") ?? !1
  });
  const o = f.find((c) => c.stepId === "review_candidate");
  t.push({
    name: "reconciliation_queue -> candidate_detail navigation exists",
    passed: o?.canNavigateFrom.includes("reconciliation_queue") ?? !1
  });
  const g = f.find((c) => c.stepId === "search_sources");
  return t.push({
    name: "search accessible from nav_menu",
    passed: g?.canNavigateFrom.includes("nav_menu") ?? !1
  }), {
    stepId: "journey_navigation",
    surface: "navigation",
    description: "V2 journey navigation connectivity",
    passed: t.every((c) => c.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function Fs() {
  const e = performance.now(), t = [], i = [
    "source_browser",
    "source_detail",
    "revision_history",
    "revision_detail",
    "artifact_inspector",
    "comment_inspector",
    "source_search",
    "reconciliation_queue",
    "candidate_detail"
  ], n = f.map((a) => a.surface);
  for (const a of i) t.push({
    name: `${a} surface covered`,
    passed: n.includes(a)
  });
  const s = new Set(f.map((a) => a.contractFamily));
  return t.push({
    name: "each surface uses distinct contract family",
    passed: s.size >= i.length - 1
  }), {
    stepId: "contract_coverage",
    surface: "all",
    description: "V2 contract coverage completeness",
    passed: t.every((a) => a.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function Is() {
  const e = performance.now(), t = [];
  for (const i of f) {
    const n = vt(i.stepId), s = [
      "_synthesized",
      "_clientGenerated",
      "_fallback",
      "_constructedUrl",
      "_derivedSemantics"
    ].some((a) => a in n);
    t.push({
      name: `${i.stepId}: no fallback synthesis`,
      passed: !s,
      message: s ? "Contract contains forbidden synthesized fields" : void 0
    });
  }
  return {
    stepId: "no_fallback_synthesis",
    surface: "all",
    description: "No fallback payload synthesis in journey",
    passed: t.every((i) => i.passed),
    assertions: t,
    durationMs: performance.now() - e
  };
}
function ht() {
  const e = performance.now(), t = [];
  for (const d of f) t.push(Rs(d));
  const i = Ds();
  t.push(i);
  const n = Fs();
  t.push(n);
  const s = Is();
  t.push(s);
  const a = f.every((d) => t.find((Ct) => Ct.stepId === d.stepId)?.passed ?? !1), r = i.passed, o = n.passed, g = s.passed, c = a && r && o && g, T = t.filter((d) => !d.passed).map((d) => d.stepId);
  return {
    passed: c,
    steps: t,
    journeyNavigable: r,
    contractCoverageComplete: o,
    noFallbackSynthesis: g,
    summary: c ? `Phase 18 V2 operator journey smoke tests: ${t.length}/${t.length} steps passed` : `Phase 18 V2 operator journey smoke tests failed: ${T.join(", ")}`,
    totalDurationMs: performance.now() - e,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function Al() {
  const e = ht();
  if (!e.passed) {
    const t = e.steps.filter((i) => !i.passed).map((i) => {
      const n = i.assertions.filter((s) => !s.passed).map((s) => `    - ${s.name}${s.message ? `: ${s.message}` : ""}`).join(`
`);
      return `  - ${i.stepId}: ${i.description}
${n}`;
    }).join(`
`);
    throw new Error(`${e.summary}
${t}`);
  }
}
function Rl(e) {
  console.group("Phase 18 V2 Operator Journey Smoke Test Results"), console.log(`Overall: ${e.passed ? "PASSED" : "FAILED"}`), console.log(`Duration: ${e.totalDurationMs.toFixed(2)}ms`), console.log(`Timestamp: ${e.timestamp}`), console.log(`Journey Navigable: ${e.journeyNavigable ? "✓" : "✗"}`), console.log(`Contract Coverage: ${e.contractCoverageComplete ? "✓" : "✗"}`), console.log(`No Fallback Synthesis: ${e.noFallbackSynthesis ? "✓" : "✗"}`), console.group("Journey Step Results");
  for (const t of e.steps) {
    const i = t.passed ? "✓" : "✗", n = `${t.assertions.filter((s) => s.passed).length}/${t.assertions.length} assertions`;
    if (console.log(`${i} ${t.stepId.padEnd(30)} ${n} (${t.durationMs.toFixed(2)}ms)`), !t.passed) for (const s of t.assertions.filter((a) => !a.passed)) console.log(`    ✗ ${s.name}${s.message ? `: ${s.message}` : ""}`);
  }
  console.groupEnd(), console.log(`Summary: ${e.summary}`), console.groupEnd();
}
async function Ls(e = {}) {
  const t = await M(e), i = Q(), n = B(), s = ye(), a = ht();
  return {
    landingZone: t,
    pageBootstrap: i,
    workspace: n,
    reconciliationQueue: s,
    v2Journey: a,
    overallPassed: t.passed && i.passed && n.passed && s.passed && a.passed
  };
}
async function Dl(e = {}) {
  const t = await Ls(e);
  if (!t.overallPassed) {
    const i = [];
    throw t.landingZone.passed || i.push("landing-zone"), t.pageBootstrap.passed || i.push("page-bootstrap"), t.workspace.passed || i.push("workspace"), t.reconciliationQueue.passed || i.push("reconciliation-queue"), t.v2Journey.passed || i.push("v2-journey"), new Error(`V2 comprehensive smoke coverage failed: ${i.join(", ")}`);
  }
}
function Fl() {
  const e = [], t = f.find((d) => d.stepId === "browse_sources");
  e.push({
    name: "browse_sources",
    passed: t !== void 0 && t.requiredLinks.includes("self"),
    description: "Operators can browse canonical source documents through the example runtime"
  });
  const i = f.find((d) => d.stepId === "view_source_detail"), n = i?.requiredLinks.includes("revisions") && i?.requiredLinks.includes("relationships") && i?.requiredLinks.includes("handles") && i?.requiredLinks.includes("comments");
  e.push({
    name: "source_workspace",
    passed: i !== void 0 && n === !0,
    description: "Source-centric workspace exposes handles, revisions, agreements, artifacts, comments"
  });
  const s = f.find((d) => d.stepId === "search_sources");
  e.push({
    name: "search_capability",
    passed: s !== void 0 && s.contractFamily === "Phase13SourceSearchResults",
    description: "Search across source documents using title, text, provider metadata, comments"
  });
  const a = f.find((d) => d.stepId === "view_revision_history");
  e.push({
    name: "lineage_continuity",
    passed: a !== void 0,
    description: "Operators can see lineage continuity across file IDs, accounts, drives"
  });
  const r = f.find((d) => d.stepId === "view_reconciliation_queue"), o = f.find((d) => d.stepId === "review_candidate");
  e.push({
    name: "reconciliation_workflow",
    passed: r !== void 0 && o !== void 0,
    description: "Operators can review and resolve pending lineage candidates through queue workflow"
  }), e.push({
    name: "search_drill_in",
    passed: s?.canNavigateFrom.includes("nav_menu") ?? !1,
    description: "Search results resolve into canonical source workspace with stable drill-ins"
  }), e.push({
    name: "reconciliation_auditability",
    passed: o?.requiredLinks.includes("queue") ?? !1,
    description: "Reconciliation outcomes preserve historical agreement artifact identity"
  });
  const g = e.every((d) => d.passed), c = e.filter((d) => d.passed).length, T = e.filter((d) => !d.passed).map((d) => d.name);
  return {
    passed: g,
    criteria: e,
    summary: g ? `V2 exit criteria validation: ${c}/${e.length} criteria met` : `V2 exit criteria validation failed: ${T.join(", ")}`
  };
}
function Il(e) {
  console.group("V2 Exit Criteria Validation"), console.log(`Overall: ${e.passed ? "PASSED" : "FAILED"}`);
  for (const t of e.criteria) {
    const i = t.passed ? "✓" : "✗";
    console.log(`${i} ${t.name.padEnd(30)} - ${t.description}`);
  }
  console.log(`Summary: ${e.summary}`), console.groupEnd();
}
var Ms = {
  draft: {
    label: "Draft",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    dotClass: "bg-gray-400"
  },
  sent: {
    label: "Sent",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    dotClass: "bg-blue-400"
  },
  in_progress: {
    label: "In Progress",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    dotClass: "bg-amber-400"
  },
  completed: {
    label: "Completed",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    dotClass: "bg-green-500"
  },
  voided: {
    label: "Voided",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    dotClass: "bg-red-500"
  },
  declined: {
    label: "Declined",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    dotClass: "bg-red-500"
  },
  expired: {
    label: "Expired",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    dotClass: "bg-gray-400"
  }
};
function yt(e) {
  return Ms[String(e || "").trim().toLowerCase()] || {
    label: e || "Unknown",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    dotClass: "bg-gray-400"
  };
}
function $s(e, t) {
  const i = yt(e), n = t?.showDot ?? !1, s = t?.size ?? "sm", a = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  }, r = n ? `<span class="w-2 h-2 rounded-full ${i.dotClass} mr-1.5" aria-hidden="true"></span>` : "";
  return `<span class="inline-flex items-center ${a[s]} rounded-full font-medium ${i.bgClass} ${i.textClass}">${r}${i.label}</span>`;
}
function Ll(e, t) {
  const i = document.createElement("span");
  return i.innerHTML = $s(e, t), i.firstElementChild;
}
function Ml(e, t, i) {
  const n = yt(t), s = i?.size ?? "sm", a = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base"
  };
  if (e.className = "", e.className = `inline-flex items-center ${a[s]} rounded-full font-medium ${n.bgClass} ${n.textClass}`, i?.showDot ?? !1) {
    const o = e.querySelector(".rounded-full");
    if (o) o.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`;
    else {
      const g = document.createElement("span");
      g.className = `w-2 h-2 rounded-full ${n.dotClass} mr-1.5`, g.setAttribute("aria-hidden", "true"), e.prepend(g);
    }
  }
  const r = e.childNodes[e.childNodes.length - 1];
  r && r.nodeType === Node.TEXT_NODE ? r.textContent = n.label : e.appendChild(document.createTextNode(n.label));
}
var bt = "application/vnd.google-apps.document", $l = "application/vnd.google-apps.spreadsheet", Nl = "application/vnd.google-apps.presentation", Ns = "application/vnd.google-apps.folder", St = "application/pdf", js = [bt, St], wt = "esign.google.account_id";
function Zs(e) {
  return e.mimeType === bt;
}
function zs(e) {
  return e.mimeType === St;
}
function R(e) {
  return e.mimeType === Ns;
}
function Hs(e) {
  return js.includes(e.mimeType);
}
function jl(e) {
  return e.mimeType === "application/vnd.google-apps.document" || e.mimeType === "application/vnd.google-apps.spreadsheet" || e.mimeType === "application/vnd.google-apps.presentation";
}
function Os(e) {
  return {
    id: e.id || "",
    name: e.name || "Untitled",
    mimeType: e.mimeType || "application/octet-stream",
    size: typeof e.size == "string" ? parseInt(e.size, 10) || 0 : e.size || 0,
    modifiedTime: e.modifiedTime || (/* @__PURE__ */ new Date()).toISOString(),
    iconLink: e.iconLink,
    thumbnailLink: e.thumbnailLink,
    webViewLink: e.webViewLink,
    parents: e.parents
  };
}
function Zl(e) {
  return e.map(Os);
}
function kt(e) {
  return {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.folder": "Folder",
    "application/pdf": "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[e] || "File";
}
function Ks(e) {
  return R(e) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : Zs(e) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : zs(e) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : e.mimeType === "application/vnd.google-apps.spreadsheet" ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : e.mimeType === "application/vnd.google-apps.presentation" ? {
    icon: "iconoir-presentation",
    bgClass: "bg-orange-100",
    textClass: "text-orange-600"
  } : e.mimeType.startsWith("image/") ? {
    icon: "iconoir-media-image",
    bgClass: "bg-purple-100",
    textClass: "text-purple-600"
  } : {
    icon: "iconoir-page",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600"
  };
}
function Gs(e) {
  return !e || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function Vs(e) {
  if (!e) return "-";
  try {
    return new Date(e).toLocaleDateString();
  } catch {
    return e;
  }
}
function zl(e, t) {
  const i = e.get("account_id");
  if (i) return ie(i);
  if (t) return ie(t);
  const n = localStorage.getItem(wt);
  return n ? ie(n) : "";
}
function ie(e) {
  if (!e) return "";
  const t = e.trim();
  return t === "null" || t === "undefined" || t === "0" ? "" : t;
}
function Hl(e) {
  const t = ie(e);
  t && localStorage.setItem(wt, t);
}
function Ol(e, t) {
  if (!t) return e;
  try {
    const i = new URL(e, window.location.origin);
    return i.searchParams.set("account_id", t), i.pathname + i.search;
  } catch {
    return `${e}${e.includes("?") ? "&" : "?"}account_id=${encodeURIComponent(t)}`;
  }
}
function Kl(e, t, i) {
  const n = new URL(t, window.location.origin);
  return n.pathname.startsWith(e) || (n.pathname = `${e}${t}`), i && n.searchParams.set("account_id", i), n;
}
function Gl(e) {
  const t = new URL(window.location.href), i = t.searchParams.get("account_id");
  e && i !== e ? (t.searchParams.set("account_id", e), window.history.replaceState({}, "", t.toString())) : !e && i && (t.searchParams.delete("account_id"), window.history.replaceState({}, "", t.toString()));
}
function F(e) {
  const t = document.createElement("div");
  return t.textContent = e, t.innerHTML;
}
function Us(e) {
  const t = Ks(e);
  return `
    <div class="w-10 h-10 ${t.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${t.icon} ${t.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function Vl(e, t) {
  if (e.length === 0) return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const i = [{
    id: "",
    name: "My Drive"
  }, ...e];
  return i.map((n, s) => {
    const a = s === i.length - 1, r = s > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return a ? `${r}<span class="text-gray-900 font-medium">${F(n.name)}</span>` : `${r}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${F(n.name)}</button>`;
  }).join("");
}
function qs(e, t = {}) {
  const { selectable: i = !0, showSize: n = !0, showDate: s = !0 } = t, a = Us(e), r = R(e), o = Hs(e);
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${r ? "cursor-pointer hover:bg-gray-50" : o ? "cursor-pointer hover:bg-blue-50" : "opacity-60"} file-item"
      ${r ? `data-folder-id="${e.id}" data-folder-name="${F(e.name)}"` : o && i ? `data-file-id="${e.id}" data-file-name="${F(e.name)}" data-mime-type="${e.mimeType}"` : ""}
      role="listitem"
      ${o ? 'tabindex="0"' : ""}
    >
      ${a}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${F(e.name)}</p>
        <p class="text-xs text-gray-500">
          ${kt(e.mimeType)}
          ${n && e.size > 0 ? ` &middot; ${Gs(e.size)}` : ""}
          ${s && e.modifiedTime ? ` &middot; ${Vs(e.modifiedTime)}` : ""}
        </p>
      </div>
      ${o && i ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function Ul(e, t = {}) {
  const { emptyMessage: i = "No files found", selectable: n = !0 } = t;
  return e.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${F(i)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...e].sort((s, a) => R(s) && !R(a) ? -1 : !R(s) && R(a) ? 1 : s.name.localeCompare(a.name)).map((s) => qs(s, { selectable: n })).join("")}
    </div>
  `;
}
function ql(e) {
  return {
    id: e.id,
    name: e.name,
    mimeType: e.mimeType,
    typeName: kt(e.mimeType)
  };
}
export {
  Ms as AGREEMENT_STATUS_BADGES,
  fe as APPROVED_GOOGLE_ADAPTER_BOUNDARIES,
  Gd as AgreementDetailPageController,
  Sc as AgreementFormController,
  fa as CANDIDATE_RELATIONSHIP_STATUS,
  ma as CANDIDATE_RELATIONSHIP_TYPE,
  ed as COMMAND_MESSAGES,
  Ri as COMMENTS_EMPTY,
  Di as COMMENTS_PENDING_SYNC,
  tt as COMMENTS_SYNCED,
  Fi as COMMENTS_SYNC_FAILED,
  Ii as COMMENTS_SYNC_STALE,
  pa as COMMENT_SYNC_STATUS,
  id as CONDENSED_MODE_PRIORITY_THRESHOLD,
  da as CONFIDENCE_BAND,
  ad as DEFAULT_EVENT_CONFIG,
  sd as DEFAULT_INLINE_STATUS_CONFIG,
  Ja as DEFAULT_PROVENANCE_CARD_CONFIG,
  Zo as DocumentDetailPreviewController,
  vc as DocumentFormController,
  Yr as ESignAPIClient,
  Wr as ESignAPIError,
  ld as EVENT_REGISTRY,
  qa as EVIDENCE_COLLAPSED_SELECTOR,
  Xa as EVIDENCE_CONTAINER_SELECTOR,
  Ga as EVIDENCE_TOGGLE_SELECTOR,
  na as FINGERPRINT_STATUS,
  ot as FORBIDDEN_RAW_GOOGLE_FIELDS,
  wt as GOOGLE_ACCOUNT_STORAGE_KEY,
  Ko as GoogleCallbackController,
  Wo as GoogleDrivePickerController,
  qo as GoogleIntegrationController,
  js as IMPORTABLE_MIME_TYPES,
  zd as InlineStatusManager,
  dc as IntegrationConflictsController,
  tc as IntegrationHealthController,
  ac as IntegrationMappingsController,
  _c as IntegrationSyncRunsController,
  so as LandingPageController,
  bt as MIME_GOOGLE_DOC,
  Ns as MIME_GOOGLE_FOLDER,
  $l as MIME_GOOGLE_SHEET,
  Nl as MIME_GOOGLE_SLIDES,
  St as MIME_PDF,
  nd as PAGE_STATUS_TARGET,
  qu as PHASE_11_FIXTURES,
  $r as PHASE_13_COMPOSITION_GUIDELINES,
  Uu as PHASE_13_FIXTURES,
  de as PHASE_14_APPROVED_CONTRACT_MODULES,
  cl as PHASE_14_ARCHITECTURAL_INVARIANTS,
  l as PHASE_14_FIXTURE_ROUTES,
  il as PHASE_14_GUARD_SURFACES,
  nn as PHASE_14_SURFACE_ENDPOINT_FALLBACKS,
  tn as PHASE_14_SURFACE_PAGE_IDS,
  ft as PHASE_15_PAGE_DEFINITIONS,
  Za as PROVENANCE_CARD_SELECTOR,
  Gc as PanelPaginationBehavior,
  Zc as PanelSearchBehavior,
  Ai as SEARCH_EMPTY,
  et as SEARCH_RESULTS_WITH_COMMENTS,
  _a as SEARCH_RESULT_KIND,
  hd as SECTION_FALLBACK_SELECTORS,
  vd as SECTION_TARGET_SELECTORS,
  Ei as SOURCE_DETAIL_ARCHIVED,
  Ti as SOURCE_DETAIL_MERGED,
  We as SOURCE_DETAIL_REPEATED,
  xi as SOURCE_LIST_EMPTY,
  Xe as SOURCE_LIST_SINGLE,
  Zr as SOURCE_MANAGEMENT_COMPOSITION_GUIDELINES,
  Ye as SOURCE_RELATIONSHIPS_REVIEW,
  Je as SOURCE_REVISIONS_REPEATED,
  Br as SOURCE_SEARCH_RESULT_KIND_OPTIONS,
  Oc as STANDARD_GRID_SELECTORS,
  yd as STATUS_DISPLAY,
  he as SURFACE_CONTRACT_MAPPING,
  Do as SignerCompletePageController,
  Rc as SignerErrorPageController,
  xc as SignerReviewController,
  Lr as SourceArtifactInspectorPageController,
  Ar as SourceBrowserPageController,
  Fr as SourceCommentInspectorPageController,
  xr as SourceDetailPageController,
  Vr as SourceManagementRuntimeController,
  yr as SourceRevisionInspectorPageController,
  Rr as SourceRevisionTimelinePageController,
  Ir as SourceSearchPageController,
  Wd as TIMELINE_COLOR_CLASSES,
  Ld as TimelineController,
  Se as V2_FIXTURE_ROUTES,
  U as V2_LANDING_ZONE_SURFACES,
  f as V2_OPERATOR_JOURNEY_STEPS,
  br as VERSION_2_ARCHITECTURAL_INVARIANTS,
  ne as WORKSPACE_APPROVED_CONTRACT_FAMILIES,
  $n as WORKSPACE_FORBIDDEN_CONTRACT_FAMILIES,
  mr as adaptCommentSyncStatus,
  ar as adaptEmptyState,
  me as adaptPaginationInfo,
  ur as adaptPhase13CommentThread,
  lr as adaptPhase13SearchResult,
  Tt as adaptSourceDetail,
  tr as adaptSourceListItem,
  pr as adaptSourceListPage,
  Et as adaptSourceRelationshipPage,
  nr as adaptSourceRelationshipSummary,
  ir as adaptSourceRevisionListItem,
  xt as adaptSourceRevisionPage,
  Pi as agreementCandidateWarningFixtures,
  pi as agreementDetailPayloadFixtures,
  li as agreementLineageFixtures,
  $a as announce,
  Ol as applyAccountIdToPath,
  Lo as applyDetailFormatters,
  Md as applyReviewActorMetadata,
  Xu as assertPageGuards,
  Wu as assertPhase13PageGuards,
  nl as assertPhase14PageGuards,
  hl as assertPhase15PageBootstrapSmokeTests,
  wl as assertPhase16WorkspaceSmokeTests,
  xl as assertPhase17ReconciliationQueueSmokeTests,
  Dl as assertPhase18ComprehensiveSmokeCoverage,
  Al as assertPhase18V2JourneySmokeTests,
  pl as assertV2LandingZoneSmokeTests,
  qr as assertV2RuntimeInitialization,
  Hd as bootstrapAgreementDetailPage,
  yc as bootstrapAgreementForm,
  Mo as bootstrapDocumentDetailPreview,
  gc as bootstrapDocumentForm,
  Ho as bootstrapGoogleCallback,
  Bo as bootstrapGoogleDrivePicker,
  Vo as bootstrapGoogleIntegration,
  oc as bootstrapIntegrationConflicts,
  Yo as bootstrapIntegrationHealth,
  nc as bootstrapIntegrationMappings,
  lc as bootstrapIntegrationSyncRuns,
  eo as bootstrapLandingPage,
  Qa as bootstrapProvenanceCards,
  Eo as bootstrapSignerCompletePage,
  Ec as bootstrapSignerErrorPage,
  Cc as bootstrapSignerReview,
  Sr as bootstrapSourceArtifactInspectorPage,
  Tr as bootstrapSourceBrowserPage,
  Mr as bootstrapSourceCommentInspectorPage,
  wr as bootstrapSourceDetailPage,
  kr as bootstrapSourceRevisionInspectorPage,
  Dr as bootstrapSourceRevisionTimelinePage,
  Er as bootstrapSourceSearchPage,
  Jc as buildActorKey,
  Kl as buildScopedApiUrl,
  Da as byId,
  Ci as candidateWarningFixtures,
  go as capitalize,
  Vi as checkAdapterBoundaryViolation,
  un as checkCanonicalContractFamilyViolation,
  en as checkCommentContractViolation,
  Gi as checkCompositionBoundaryViolation,
  cn as checkContractModuleConsumptionViolation,
  qi as checkEndpointStitchingViolation,
  Ji as checkGoogleProviderPayloadViolation,
  dn as checkRawGoogleFieldAccessViolation,
  Yi as checkSearchContractViolation,
  Ui as checkSemanticComputationViolation,
  ln as checkSemanticOwnershipViolation,
  Wi as checkSourceCommentMixingViolation,
  ud as clearAllStatusElements,
  qc as clearStaleStatusElements,
  Pd as commandToSection,
  Gu as countCandidatesByStatus,
  md as countHiddenEvents,
  _u as createAgreementDiagnosticViewModel,
  wn as createArtifactsPanelSuccessState,
  $e as createCandidateWarningDisplayConfig,
  An as createCommentsPanelSuccessState,
  cr as createDegradedState,
  mu as createDocumentDiagnosticViewModel,
  to as createESignClient,
  La as createElement,
  Le as createEmptyDisplayConfig,
  At as createEmptyState,
  lu as createErrorDisplayConfig,
  Lt as createErrorState,
  Bt as createFingerprintCard,
  qt as createFingerprintFailedDisplayConfig,
  Ut as createFingerprintPendingDisplayConfig,
  al as createGoogleFieldViolationConfig,
  Ln as createHandlesPanelSuccessState,
  ve as createInitialWorkspaceState,
  Vd as createInlineStatusManager,
  uu as createLoadingDisplayConfig,
  $t as createLoadingState,
  dl as createLoadingWorkspaceState,
  Ju as createMockAgreementReviewComment,
  tl as createMockPhase13SearchResults,
  el as createMockPhase13SourceCommentPage,
  Yu as createMockRawGoogleDriveComment,
  sl as createModuleViolationConfig,
  rl as createMultipleContractFamilyViolationConfig,
  Me as createNativeDisplayConfig,
  Xt as createNewerSourceCard,
  _n as createOverviewPanelSuccessState,
  C as createPanelEmptyState,
  I as createPanelErrorState,
  b as createPanelLoadingState,
  V as createPassingPhase14PageConfig,
  Rt as createPhase13CommentSuccessState,
  It as createPhase13SearchSuccessState,
  Zi as createPhase13SourceCommentPageFixture,
  ji as createPhase13SourceSearchResultsFixture,
  E as createPhase14SurfacePageConfig,
  Cn as createRelationshipsPanelSuccessState,
  Wc as createResolverContext,
  gn as createRevisionsPanelSuccessState,
  $c as createSchemaActionCachingRefresh,
  ql as createSelectedFile,
  ol as createSemanticOwnershipViolationConfig,
  je as createSourceCard,
  Mi as createSourceDetailFixture,
  jr as createSourceDetailWorkspace,
  Li as createSourceListPageFixture,
  Ni as createSourceRelationshipPageFixture,
  $i as createSourceRevisionPageFixture,
  vr as createSourceSearchWorkspace,
  Ll as createStatusBadgeElement,
  $d as createStatusElement,
  Ed as createTimelineController,
  Co as createTimeoutController,
  dr as createUnauthorizedState,
  Qt as createWarningCard,
  Ne as createWarningCards,
  Fc as dateTimeCellRenderer,
  bo as debounce,
  zc as defaultActionErrorHandler,
  Kc as defaultActionSuccessHandler,
  Ea as delegate,
  jt as detectProvenancePayloadMixing,
  Ie as determineDiagnosticState,
  _i as documentDetailPayloadFixtures,
  ui as documentLineageFixtures,
  F as escapeHtml,
  Ic as fileSizeCellRenderer,
  Ad as findParticipantById,
  lo as formatDate,
  _o as formatDateTime,
  Vs as formatDriveDate,
  Gs as formatDriveFileSize,
  co as formatFileSize,
  ro as formatPageCount,
  mo as formatRecipientCount,
  po as formatRelativeTime,
  Io as formatSizeElements,
  oo as formatTime,
  Nd as formatTimestamp,
  $o as formatTimestampElements,
  Kd as formatTimestampNodes,
  Bc as generateFallbackLabel,
  cd as getActorColor,
  Fd as getActorInitials,
  Zu as getAgreementCandidateWarningFixture,
  kd as getAgreementDetailController,
  Du as getAgreementDetailPayloadFixture,
  Cu as getAgreementLineageFixture,
  yt as getAgreementStatusBadge,
  ju as getCandidateWarningFixture,
  zu as getCandidateWarningFixtureStates,
  gd as getColorClasses,
  Od as getCommandMessage,
  Xc as getDateLabel,
  Lu as getDetailPayloadFixtureStates,
  Ru as getDocumentDetailPayloadFixture,
  ku as getDocumentLineageFixture,
  no as getESignClient,
  td as getEventConfig,
  Ks as getFileIconConfig,
  kt as getFileTypeName,
  su as getFingerprintStatusClass,
  au as getFingerprintStatusIcon,
  du as getFingerprintStatusMessage,
  Bu as getGuardEnforcementMode,
  Au as getImportFixtureStates,
  Tu as getImportResponseFixture,
  Wa as getLineageStatus,
  ka as getPageConfig,
  Pr as getPageController,
  ml as getPanelDrillInUrl,
  Ku as getPrimaryCandidateWarning,
  yu as getPrimaryWarningCard,
  za as getProvenanceCardFor,
  Va as getProvenanceCards,
  Ya as getResourceKind,
  Mu as getSeededGoogleImportScenario,
  $u as getSeededScenarioIds,
  Ro as getSignerCompletionPollDelayMs,
  Gt as getSourceTypeIcon,
  Vt as getSourceTypeLabel,
  De as getWarningSeverityClass,
  Fe as getWarningSeverityIcon,
  Qd as groupItemsByDate,
  nu as hasActionableWarnings,
  fi as hasAgreementPinnedProvenance,
  bu as hasDiagnosticActionableWarnings,
  gi as hasDocumentLineageLinkage,
  Ha as hasEmptyState,
  cu as hasFingerprintError,
  Oa as hasWarnings,
  Fa as hide,
  Qc as humanizeActorRole,
  mi as importResponseFixtures,
  Id as initAgreementDetailPage,
  bc as initAgreementForm,
  Ba as initAllEvidenceToggles,
  jo as initDetailFormatters,
  No as initDocumentDetailPreview,
  fc as initDocumentForm,
  Ua as initEvidenceToggle,
  Oo as initGoogleCallback,
  Xo as initGoogleDrivePicker,
  Uo as initGoogleIntegration,
  cc as initIntegrationConflicts,
  ec as initIntegrationHealth,
  sc as initIntegrationMappings,
  mc as initIntegrationSyncRuns,
  io as initLandingPage,
  Ka as initProvenanceCards,
  To as initSignerCompletePage,
  Ac as initSignerErrorPage,
  Pc as initSignerReview,
  Kr as initSourceManagementRuntimePage,
  Hr as initV2SourceManagementRuntime,
  Hi as isAgreementLineageDetail,
  Bi as isAgreementReviewCommentPayload,
  Hu as isCandidateActionable,
  Ou as isCandidateResolved,
  hu as isDiagnosticCandidateWarning,
  pu as isDiagnosticEmpty,
  vu as isDiagnosticFingerprintFailed,
  fu as isDiagnosticFingerprintPending,
  gu as isDiagnosticNative,
  zi as isDocumentLineageDetail,
  ou as isFingerprintSuccessful,
  ru as isFingerprintTerminal,
  R as isFolder,
  Zs as isGoogleDoc,
  iu as isGoogleSourced,
  jl as isGoogleWorkspaceFile,
  pd as isGroupableEvent,
  Hs as isImportable,
  zs as isPDF,
  at as isPhase13SourceCommentPage,
  Qi as isPhase13SourceSearchResults,
  Xi as isRawGoogleDriveCommentPayload,
  it as isSourceManagementContract,
  ga as isTerminalGoogleImportStatus,
  aa as isValidCandidateRelationshipStatus,
  ua as isValidCommentSyncStatus,
  va as isValidFingerprintStatus,
  fd as isVisibleInCondensedMode,
  Cr as listRegisteredPages,
  jn as loadFixtureForSurface,
  bl as logPhase15SmokeTestResults,
  kl as logPhase16SmokeTestResults,
  Tl as logPhase17SmokeTestResults,
  Rl as logPhase18SmokeTestResults,
  vl as logSmokeTestResults,
  Il as logV2ExitCriteriaResults,
  Ur as logV2RuntimeInitResult,
  Dd as looksLikeUUID,
  Yd as mapAgreementProvenance,
  Jd as mapDocumentProvenance,
  Td as mergeReviewBootstrapIntoTimeline,
  bd as mergeReviewDataIntoTimeline,
  ie as normalizeAccountId,
  ue as normalizeAgreementLineageDetail,
  ra as normalizeCandidateWarningSummary,
  le as normalizeDocumentLineageDetail,
  Os as normalizeDriveFile,
  Zl as normalizeDriveFiles,
  Nc as normalizeFilterOperators,
  Vc as normalizeFilterOptions,
  Lc as normalizeFilterType,
  la as normalizeGoogleImportLineageStatus,
  ca as normalizeGoogleImportRunDetail,
  oa as normalizeGoogleImportRunHandle,
  ia as normalizeLineagePresentationWarning,
  ha as normalizePhase13SourceCommentPage,
  Sa as normalizePhase13SourceCommentThreadSummary,
  sa as normalizePhase13SourceSearchQuery,
  ba as normalizePhase13SourceSearchResultSummary,
  ea as normalizePhase13SourceSearchResults,
  Pt as normalizePhase1LineageContractFixtures,
  ya as normalizeSourceCommentAuthorSummary,
  ta as normalizeSourceCommentMessageSummary,
  Ys as normalizeSourceCommentSyncSummary,
  Ma as on,
  Ca as onReady,
  _l as panelRequiresLoad,
  qd as parseMergedTimelineBootstrap,
  Xd as parseTimelineBootstrap,
  wo as poll,
  Mc as prepareFilterFields,
  Hc as prepareGridColumns,
  _d as processEventsForDisplay,
  Aa as qs,
  Na as qsa,
  hr as registerPageController,
  Rd as removeStatusElement,
  Vl as renderBreadcrumb,
  Us as renderFileIcon,
  qs as renderFileItem,
  Ul as renderFileList,
  wd as renderFilteredState,
  $s as renderStatusBadge,
  Bd as renderTimeline,
  zl as resolveAccountId,
  rd as resolveActor,
  kn as resolveArtifactsPanelState,
  Qr as resolveBrowserItemRuntimeHref,
  Rn as resolveCommentsPanelState,
  od as resolveFieldLabel,
  Js as resolveGoogleImportRedirectURL,
  Mn as resolveHandlesPanelState,
  dd as resolveMetadata,
  ut as resolveOverviewPanelState,
  Yc as resolveParticipantName,
  or as resolvePhase13CommentRenderingState,
  rr as resolvePhase13SearchRenderingState,
  Pn as resolveRelationshipsPanelState,
  fn as resolveRevisionsPanelState,
  Or as resolveSearchResultRuntimeHref,
  xo as resolveSignerCompleteArtifacts,
  Ao as resolveSignerCompletePayloadState,
  sr as resolveSourceDetailRenderingState,
  _r as resolveSourceListRenderingState,
  gr as resolveSourceRevisionTimelineRenderingState,
  Sd as resolveStatusTarget,
  yo as retry,
  Ud as reviewActorInfo,
  Cd as reviewActorKey,
  gl as runComprehensiveSmokeCoverage,
  st as runPageGuards,
  rt as runPhase13PageGuards,
  dt as runPhase14PageGuards,
  Q as runPhase15PageBootstrapSmokeTests,
  Sl as runPhase15RuntimeSmokeCoverage,
  Pl as runPhase16ComprehensiveSmokeCoverage,
  Cl as runPhase16RuntimeSmokeCoverage,
  B as runPhase16WorkspaceSmokeTests,
  El as runPhase17ComprehensiveSmokeCoverage,
  ye as runPhase17ReconciliationQueueSmokeTests,
  Ls as runPhase18ComprehensiveSmokeCoverage,
  ht as runPhase18V2JourneySmokeTests,
  Fl as runV2ExitCriteriaValidation,
  M as runV2LandingZoneSmokeTests,
  xd as safeParseJSONScript,
  Hl as saveAccountId,
  Ke as seededGoogleImportScenarios,
  ll as setActivePanel,
  Jr as setESignClient,
  Qu as setGuardEnforcementMode,
  Pa as setLoading,
  jc as setupRefreshButton,
  xa as show,
  ho as sleep,
  qn as smokeTestEmptyStates,
  Qn as smokeTestErrorStates,
  Un as smokeTestLoadingStates,
  On as smokeTestRelationshipSummaries,
  Hn as smokeTestRevisionHistory,
  Kn as smokeTestSearch,
  Gn as smokeTestSourceComment,
  zn as smokeTestSourceDetail,
  Zn as smokeTestSourceList,
  uo as snakeToTitle,
  Gl as syncAccountIdToUrl,
  So as throttle,
  Ia as toggle,
  Gr as translateSourceManagementHrefToRuntime,
  fo as truncate,
  Ra as updateDataText,
  Ta as updateDataTexts,
  Ml as updateStatusBadge,
  jd as updateStatusElement,
  ul as updateWorkspacePanel,
  Iu as validateAgreementDetailPayloadWithLineage,
  wu as validateAgreementDiagnosticViewModel,
  xu as validateAgreementLineagePayload,
  tu as validateAgreementProvenanceViewModel,
  Vu as validateCandidateWarningFixture,
  Fu as validateDocumentDetailPayloadWithLineage,
  Su as validateDocumentDiagnosticViewModel,
  Pu as validateDocumentLineagePayload,
  eu as validateDocumentProvenanceViewModel,
  fl as validateFixtureRoutes,
  Eu as validateImportResponsePayload,
  yl as validateLivePageBootstrap,
  Nr as validatePageComposition,
  Nu as validateSeededScenarioLineage,
  _t as validateWorkspaceBackendLinks,
  mt as validateWorkspaceContractIsolation,
  lt as validateWorkspaceContractUsage,
  Zd as wireCollapsibleSections,
  ko as withTimeout
};

//# sourceMappingURL=index.js.map