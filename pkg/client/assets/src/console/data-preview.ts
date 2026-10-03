// Data application preview entry: launch controls for registered application
// views over an exact prepared receipt, shown in the Data console explorer's
// App preview section. The Data console entry loads this module on demand,
// so a Data page that never opens a preview does not pay for it. Sessions are
// created, read and closed only through the Data module's preview routes;
// the application views themselves are served by the host.

export {
  PREVIEW_LIMITS,
  PREVIEW_STATES,
  openWire,
  parseCapability,
  parseSession,
  previewID,
  previewPath,
  safeGuarantees,
  type PreviewCapability,
  type PreviewGuarantees,
  type PreviewOpenInput,
  type PreviewReason,
  type PreviewSession,
  type PreviewState,
  type PreviewSurface,
  type PreviewSurfaceKind,
} from './data-preview/contract.js';
export {
  PREVIEW_TIMEOUT_MS,
  classifyPreviewFailure,
  createHTTPPreviewTransport,
  sessionPath,
  unconfiguredPreviewTransport,
  type PreviewFailure,
  type PreviewFailureKind,
  type PreviewLocator,
  type PreviewResult,
  type PreviewRoutes,
  type PreviewTransport,
} from './data-preview/transport.js';
export {
  REQUEST_ID_REASON,
  UNCERTAIN_FAILURES,
  launchHref,
  renderPreview,
  sessionExpired,
  sessionLive,
  type CapabilityEntry,
  type LaunchAction,
  type LaunchBusy,
  type LaunchView,
  type PreviewModel,
} from './data-preview/view.js';
export {
  DataPreview,
  createDataPreview,
  type DataPreviewOptions,
  type PreviewContext,
  type PreviewHost,
} from './data-preview/controller.js';
