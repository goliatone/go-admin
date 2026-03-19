/**
 * Lineage Diagnostics Rendering
 *
 * Diagnostic rendering states for provenance display using backend-authored data only.
 * Provides empty, native, fingerprint-pending, and candidate-warning rendering states.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 6 Task 6.6
 */

import type {
  DocumentProvenanceViewModel,
  AgreementProvenanceViewModel,
  ProvenanceWarning,
  ProvenanceStatus,
  WarningSeverity,
  ProvenanceFingerprintStatus,
  ProvenanceEmptyState,
} from './lineage-presentation.js';

import {
  getWarningSeverityClass,
  getWarningSeverityIcon,
  getSourceTypeIcon,
  getSourceTypeLabel,
} from './lineage-presentation.js';

// ============================================================================
// Diagnostic State Types
// ============================================================================

/**
 * Diagnostic rendering state for provenance blocks.
 * Represents a complete diagnostic view ready for template rendering.
 */
export type DiagnosticRenderState =
  | 'empty'
  | 'native'
  | 'fingerprint_pending'
  | 'fingerprint_failed'
  | 'candidate_warning'
  | 'loading'
  | 'error';

/**
 * Diagnostic display configuration for a provenance block.
 */
export interface DiagnosticDisplayConfig {
  state: DiagnosticRenderState;
  title: string;
  description: string;
  icon: string;
  cssClass: string;
  showDetails: boolean;
  showDiagnosticsLink: boolean;
  diagnosticsUrl: string | null;
  ariaLabel: string;
}

/**
 * Diagnostic warning card configuration.
 */
export interface DiagnosticWarningCard {
  id: string;
  type: string;
  severity: WarningSeverity;
  title: string;
  description: string;
  icon: string;
  cssClass: string;
  actionLabel: string | null;
  actionUrl: string | null;
  evidence: Array<{ label: string; details?: string }>;
  ariaLabel: string;
}

/**
 * Diagnostic fingerprint status card configuration.
 */
export interface DiagnosticFingerprintCard {
  status: string;
  statusLabel: string;
  extractVersion: string | null;
  evidenceAvailable: boolean;
  isPending: boolean;
  isReady: boolean;
  isFailed: boolean;
  isNotApplicable: boolean;
  cssClass: string;
  icon: string;
  ariaLabel: string;
}

/**
 * Complete diagnostic view model for document detail pages.
 * Extends DocumentProvenanceViewModel with diagnostic-specific rendering data.
 */
export interface DocumentDiagnosticViewModel {
  provenance: DocumentProvenanceViewModel;
  displayConfig: DiagnosticDisplayConfig;
  warningCards: DiagnosticWarningCard[];
  fingerprintCard: DiagnosticFingerprintCard;
  sourceCard: DiagnosticSourceCard | null;
}

/**
 * Complete diagnostic view model for agreement detail pages.
 * Extends AgreementProvenanceViewModel with diagnostic-specific rendering data.
 */
export interface AgreementDiagnosticViewModel {
  provenance: AgreementProvenanceViewModel;
  displayConfig: DiagnosticDisplayConfig;
  warningCards: DiagnosticWarningCard[];
  sourceCard: DiagnosticSourceCard | null;
  newerSourceCard: DiagnosticNewerSourceCard | null;
}

/**
 * Diagnostic source card configuration for Google source display.
 */
export interface DiagnosticSourceCard {
  provider: string;
  providerIcon: string;
  providerLabel: string;
  fileId: string | null;
  webUrl: string | null;
  title: string | null;
  modifiedTime: string | null;
  modifiedTimeFormatted: string | null;
  mimeType: string | null;
  ingestionMode: string | null;
  ownerEmail: string | null;
  cssClass: string;
  ariaLabel: string;
}

/**
 * Diagnostic card for newer source exists warning.
 */
export interface DiagnosticNewerSourceCard {
  visible: boolean;
  title: string;
  description: string;
  icon: string;
  cssClass: string;
  ariaLabel: string;
}

// ============================================================================
// Diagnostic State Determination
// ============================================================================

/**
 * Determine the diagnostic render state from a document provenance view model.
 */
export function determineDiagnosticState(
  vm: DocumentProvenanceViewModel | AgreementProvenanceViewModel
): DiagnosticRenderState {
  // Check for candidate warnings first (highest priority)
  if (vm.hasCandidateWarnings) {
    return 'candidate_warning';
  }

  // Check for fingerprint pending (document only)
  if ('hasFingerprint' in vm) {
    const docVm = vm as DocumentProvenanceViewModel;
    if (docVm.fingerprintStatus?.isFailed) {
      return 'fingerprint_failed';
    }
    if (docVm.fingerprintStatus?.isPending) {
      return 'fingerprint_pending';
    }
  }

  // Check for native vs empty
  if (vm.status === 'native' || vm.status === 'partial') {
    return 'native';
  }

  return 'empty';
}

// ============================================================================
// Display Configuration Builders
// ============================================================================

/**
 * Create diagnostic display configuration for empty provenance state.
 */
export function createEmptyDisplayConfig(
  emptyState?: ProvenanceEmptyState,
  diagnosticsUrl?: string
): DiagnosticDisplayConfig {
  return {
    state: 'empty',
    title: emptyState?.title || 'No Source Information',
    description:
      emptyState?.description || 'This item was uploaded directly without external source tracking.',
    icon: 'file-unknown',
    cssClass: 'diagnostic-state-empty',
    showDetails: false,
    showDiagnosticsLink: Boolean(diagnosticsUrl),
    diagnosticsUrl: diagnosticsUrl ?? null,
    ariaLabel: 'No source provenance information available',
  };
}

/**
 * Create diagnostic display configuration for native provenance state.
 */
export function createNativeDisplayConfig(
  diagnosticsUrl?: string
): DiagnosticDisplayConfig {
  return {
    state: 'native',
    title: 'Source Provenance',
    description: 'This item has full lineage tracking from the original source.',
    icon: 'link-chain',
    cssClass: 'diagnostic-state-native',
    showDetails: true,
    showDiagnosticsLink: Boolean(diagnosticsUrl),
    diagnosticsUrl: diagnosticsUrl ?? null,
    ariaLabel: 'Source provenance information available',
  };
}

/**
 * Create diagnostic display configuration for fingerprint-pending state.
 */
export function createFingerprintPendingDisplayConfig(
  diagnosticsUrl?: string
): DiagnosticDisplayConfig {
  return {
    state: 'fingerprint_pending',
    title: 'Processing Source',
    description: 'Document fingerprinting is in progress. Candidate detection may be incomplete.',
    icon: 'hourglass',
    cssClass: 'diagnostic-state-fingerprint-pending',
    showDetails: true,
    showDiagnosticsLink: Boolean(diagnosticsUrl),
    diagnosticsUrl: diagnosticsUrl ?? null,
    ariaLabel: 'Document fingerprinting in progress',
  };
}

/**
 * Create diagnostic display configuration for fingerprint-failed state.
 */
export function createFingerprintFailedDisplayConfig(
  errorMessage?: string,
  diagnosticsUrl?: string
): DiagnosticDisplayConfig {
  return {
    state: 'fingerprint_failed',
    title: 'Fingerprint Extraction Failed',
    description:
      errorMessage ?? 'Document fingerprinting failed. Candidate detection may be unavailable.',
    icon: 'warning-triangle',
    cssClass: 'diagnostic-state-fingerprint-failed',
    showDetails: true,
    showDiagnosticsLink: Boolean(diagnosticsUrl),
    diagnosticsUrl: diagnosticsUrl ?? null,
    ariaLabel: 'Document fingerprint extraction failed',
  };
}

/**
 * Create diagnostic display configuration for candidate-warning state.
 */
export function createCandidateWarningDisplayConfig(
  primarySeverity: WarningSeverity,
  diagnosticsUrl?: string
): DiagnosticDisplayConfig {
  const severityText =
    primarySeverity === 'critical'
      ? 'Critical'
      : primarySeverity === 'warning'
        ? 'Warning'
        : 'Notice';

  return {
    state: 'candidate_warning',
    title: `${severityText}: Review Required`,
    description: 'Potential source relationship detected that may require operator review.',
    icon: getWarningSeverityIcon(primarySeverity),
    cssClass: `diagnostic-state-candidate-warning ${getWarningSeverityClass(primarySeverity)}`,
    showDetails: true,
    showDiagnosticsLink: Boolean(diagnosticsUrl),
    diagnosticsUrl: diagnosticsUrl ?? null,
    ariaLabel: `${severityText} level provenance warning requiring review`,
  };
}

/**
 * Create diagnostic display configuration for loading state.
 */
export function createLoadingDisplayConfig(): DiagnosticDisplayConfig {
  return {
    state: 'loading',
    title: 'Loading Provenance',
    description: 'Retrieving source information...',
    icon: 'spinner',
    cssClass: 'diagnostic-state-loading',
    showDetails: false,
    showDiagnosticsLink: false,
    diagnosticsUrl: null,
    ariaLabel: 'Loading provenance information',
  };
}

/**
 * Create diagnostic display configuration for error state.
 */
export function createErrorDisplayConfig(errorMessage?: string): DiagnosticDisplayConfig {
  return {
    state: 'error',
    title: 'Unable to Load Provenance',
    description: errorMessage ?? 'An error occurred while loading source information.',
    icon: 'warning-triangle',
    cssClass: 'diagnostic-state-error',
    showDetails: false,
    showDiagnosticsLink: false,
    diagnosticsUrl: null,
    ariaLabel: 'Error loading provenance information',
  };
}

// ============================================================================
// Warning Card Builders
// ============================================================================

/**
 * Create a diagnostic warning card from a provenance warning.
 */
export function createWarningCard(warning: ProvenanceWarning): DiagnosticWarningCard {
  return {
    id: warning.id,
    type: warning.type,
    severity: warning.severity,
    title: warning.title,
    description: warning.description,
    icon: getWarningSeverityIcon(warning.severity),
    cssClass: `diagnostic-warning-card ${getWarningSeverityClass(warning.severity)}`,
    actionLabel: warning.actionLabel ?? null,
    actionUrl: warning.actionUrl ?? null,
    evidence: warning.evidence ?? [],
    ariaLabel: `${warning.severity} level warning: ${warning.title}`,
  };
}

/**
 * Create diagnostic warning cards from all provenance warnings.
 */
export function createWarningCards(warnings: ProvenanceWarning[]): DiagnosticWarningCard[] {
  return warnings.map(createWarningCard);
}

// ============================================================================
// Fingerprint Card Builders
// ============================================================================

/**
 * Create a diagnostic fingerprint card from fingerprint status.
 */
export function createFingerprintCard(
  status: ProvenanceFingerprintStatus
): DiagnosticFingerprintCard {
  let cssClass = 'diagnostic-fingerprint-card';
  let icon = 'fingerprint';

  if (status.isPending) {
    cssClass += ' fingerprint-pending';
    icon = 'hourglass';
  } else if (status.isReady) {
    cssClass += ' fingerprint-ready';
    icon = 'check-circle';
  } else if (status.isFailed) {
    cssClass += ' fingerprint-failed';
    icon = 'warning-triangle';
  } else if (status.isNotApplicable) {
    cssClass += ' fingerprint-not-applicable';
    icon = 'minus-circle';
  }

  return {
    status: status.status,
    statusLabel: status.statusLabel,
    extractVersion: status.extractVersion ?? null,
    evidenceAvailable: status.evidenceAvailable,
    isPending: status.isPending,
    isReady: status.isReady,
    isFailed: status.isFailed,
    isNotApplicable: status.isNotApplicable,
    cssClass,
    icon,
    ariaLabel: `Fingerprint status: ${status.statusLabel}`,
  };
}

// ============================================================================
// Source Card Builders
// ============================================================================

/**
 * Create a diagnostic source card from Google source data.
 */
export function createSourceCard(
  vm: DocumentProvenanceViewModel | AgreementProvenanceViewModel
): DiagnosticSourceCard | null {
  if (!vm.hasGoogleSource || !vm.googleSource) {
    return null;
  }

  const gs = vm.googleSource;

  return {
    provider: vm.sourceType,
    providerIcon: getSourceTypeIcon(vm.sourceType),
    providerLabel: getSourceTypeLabel(vm.sourceType),
    fileId: gs.fileId,
    webUrl: gs.webUrl,
    title: gs.title,
    modifiedTime: gs.modifiedTime ?? null,
    modifiedTimeFormatted: gs.modifiedTimeFormatted ?? null,
    mimeType: gs.mimeType,
    ingestionMode: gs.ingestionMode,
    ownerEmail: gs.ownerEmail ?? null,
    cssClass: 'diagnostic-source-card',
    ariaLabel: `Source: ${gs.title ?? 'Google Drive document'}`,
  };
}

/**
 * Create a diagnostic newer source card for agreements.
 */
export function createNewerSourceCard(
  vm: AgreementProvenanceViewModel
): DiagnosticNewerSourceCard | null {
  if (!vm.newerSourceExists) {
    return null;
  }

  return {
    visible: true,
    title: 'Newer Source Available',
    description:
      'A newer version of the source document exists. This agreement is pinned to an earlier revision.',
    icon: 'info-circle',
    cssClass: 'diagnostic-newer-source-card warning-info',
    ariaLabel: 'Notice: A newer version of the source document is available',
  };
}

// ============================================================================
// Complete Diagnostic View Model Builders
// ============================================================================

/**
 * Create a complete document diagnostic view model.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 6 Task 6.6
 */
export function createDocumentDiagnosticViewModel(
  provenance: DocumentProvenanceViewModel
): DocumentDiagnosticViewModel {
  const state = determineDiagnosticState(provenance);

  let displayConfig: DiagnosticDisplayConfig;

  switch (state) {
    case 'candidate_warning':
      displayConfig = createCandidateWarningDisplayConfig(
        provenance.primaryWarning?.severity ?? 'info',
        provenance.diagnosticsUrl
      );
      break;
    case 'fingerprint_pending':
      displayConfig = createFingerprintPendingDisplayConfig(provenance.diagnosticsUrl);
      break;
    case 'fingerprint_failed':
      displayConfig = createFingerprintFailedDisplayConfig(
        provenance.fingerprintStatus.errorMessage,
        provenance.diagnosticsUrl
      );
      break;
    case 'native':
      displayConfig = createNativeDisplayConfig(provenance.diagnosticsUrl);
      break;
    case 'empty':
    default:
      displayConfig = createEmptyDisplayConfig(provenance.emptyState, provenance.diagnosticsUrl);
      break;
  }

  return {
    provenance,
    displayConfig,
    warningCards: createWarningCards(provenance.warnings),
    fingerprintCard: createFingerprintCard(provenance.fingerprintStatus),
    sourceCard: createSourceCard(provenance),
  };
}

/**
 * Create a complete agreement diagnostic view model.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 6 Task 6.6
 */
export function createAgreementDiagnosticViewModel(
  provenance: AgreementProvenanceViewModel
): AgreementDiagnosticViewModel {
  const state = determineDiagnosticState(provenance);

  let displayConfig: DiagnosticDisplayConfig;

  switch (state) {
    case 'candidate_warning':
      displayConfig = createCandidateWarningDisplayConfig(
        provenance.primaryWarning?.severity ?? 'info',
        provenance.diagnosticsUrl
      );
      break;
    case 'native':
      displayConfig = createNativeDisplayConfig(provenance.diagnosticsUrl);
      break;
    case 'empty':
    default:
      displayConfig = createEmptyDisplayConfig(provenance.emptyState, provenance.diagnosticsUrl);
      break;
  }

  return {
    provenance,
    displayConfig,
    warningCards: createWarningCards(provenance.warnings),
    sourceCard: createSourceCard(provenance),
    newerSourceCard: createNewerSourceCard(provenance),
  };
}

// ============================================================================
// Diagnostic Fixture Helpers
// ============================================================================

/**
 * Diagnostic fixture state identifiers for testing.
 */
export type DiagnosticFixtureState =
  | 'document_empty'
  | 'document_native'
  | 'document_fingerprint_pending'
  | 'document_fingerprint_failed'
  | 'document_candidate_warning'
  | 'agreement_empty'
  | 'agreement_native'
  | 'agreement_newer_source'
  | 'agreement_candidate_warning';

/**
 * Check if a diagnostic view model represents the empty state.
 */
export function isDiagnosticEmpty(
  vm: DocumentDiagnosticViewModel | AgreementDiagnosticViewModel
): boolean {
  return vm.displayConfig.state === 'empty';
}

/**
 * Check if a diagnostic view model represents the native state.
 */
export function isDiagnosticNative(
  vm: DocumentDiagnosticViewModel | AgreementDiagnosticViewModel
): boolean {
  return vm.displayConfig.state === 'native';
}

/**
 * Check if a diagnostic view model has fingerprint pending state.
 */
export function isDiagnosticFingerprintPending(
  vm: DocumentDiagnosticViewModel | AgreementDiagnosticViewModel
): boolean {
  return vm.displayConfig.state === 'fingerprint_pending';
}

/**
 * Check if a diagnostic view model has fingerprint failed state.
 */
export function isDiagnosticFingerprintFailed(
  vm: DocumentDiagnosticViewModel | AgreementDiagnosticViewModel
): boolean {
  return vm.displayConfig.state === 'fingerprint_failed';
}

/**
 * Check if a diagnostic view model has candidate warning state.
 */
export function isDiagnosticCandidateWarning(
  vm: DocumentDiagnosticViewModel | AgreementDiagnosticViewModel
): boolean {
  return vm.displayConfig.state === 'candidate_warning';
}

/**
 * Get the primary warning card from a diagnostic view model.
 */
export function getPrimaryWarningCard(
  vm: DocumentDiagnosticViewModel | AgreementDiagnosticViewModel
): DiagnosticWarningCard | null {
  return vm.warningCards.length > 0 ? vm.warningCards[0] : null;
}

/**
 * Check if a diagnostic view model has actionable warnings.
 */
export function hasDiagnosticActionableWarnings(
  vm: DocumentDiagnosticViewModel | AgreementDiagnosticViewModel
): boolean {
  return vm.warningCards.some((w) => w.severity === 'critical' || w.severity === 'warning');
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a document diagnostic view model structure.
 */
export function validateDocumentDiagnosticViewModel(vm: unknown): string[] {
  const errors: string[] = [];

  if (!vm || typeof vm !== 'object') {
    errors.push('diagnostic view model must be an object');
    return errors;
  }

  const record = vm as Record<string, unknown>;

  if (!record.provenance || typeof record.provenance !== 'object') {
    errors.push('provenance must be an object');
  }

  if (!record.displayConfig || typeof record.displayConfig !== 'object') {
    errors.push('displayConfig must be an object');
  }

  if (!Array.isArray(record.warningCards)) {
    errors.push('warningCards must be an array');
  }

  if (!record.fingerprintCard || typeof record.fingerprintCard !== 'object') {
    errors.push('fingerprintCard must be an object');
  }

  if (record.sourceCard !== null && typeof record.sourceCard !== 'object') {
    errors.push('sourceCard must be an object or null');
  }

  return errors;
}

/**
 * Validate an agreement diagnostic view model structure.
 */
export function validateAgreementDiagnosticViewModel(vm: unknown): string[] {
  const errors: string[] = [];

  if (!vm || typeof vm !== 'object') {
    errors.push('diagnostic view model must be an object');
    return errors;
  }

  const record = vm as Record<string, unknown>;

  if (!record.provenance || typeof record.provenance !== 'object') {
    errors.push('provenance must be an object');
  }

  if (!record.displayConfig || typeof record.displayConfig !== 'object') {
    errors.push('displayConfig must be an object');
  }

  if (!Array.isArray(record.warningCards)) {
    errors.push('warningCards must be an array');
  }

  if (record.sourceCard !== null && typeof record.sourceCard !== 'object') {
    errors.push('sourceCard must be an object or null');
  }

  if (record.newerSourceCard !== null && typeof record.newerSourceCard !== 'object') {
    errors.push('newerSourceCard must be an object or null');
  }

  return errors;
}
