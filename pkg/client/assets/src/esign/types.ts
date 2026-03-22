/**
 * E-Sign Module Types
 * Core type definitions for the e-sign frontend module
 */

import type { CandidateWarningSummary, FingerprintStatusSummary } from './lineage-contracts.js';

// Agreement status types
export type AgreementStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'completed'
  | 'voided'
  | 'declined'
  | 'expired';

// Recipient role types
export type RecipientRole = 'signer' | 'cc';

// Field types for signing
export type FieldType =
  | 'signature'
  | 'initials'
  | 'name'
  | 'date_signed'
  | 'text'
  | 'checkbox';

// Page configuration passed from templates
export interface ESignPageConfig {
  basePath: string;
  apiBasePath: string;
  panelName?: string;
  locale?: string;
  env?: string;
  routes?: ESignRoutes;
  featureFlags?: ESignFeatureFlags;
  [key: string]: unknown;
}

export interface ESignRoutes {
  agreements: string;
  agreementsNew: string;
  documents: string;
  documentsNew: string;
  googleIntegration?: string;
}

export interface ESignFeatureFlags {
  esign: boolean;
  esignGoogle: boolean;
}

// Agreement summary for lists and landing page
export interface AgreementSummary {
  id: string;
  title: string;
  status: AgreementStatus;
  recipient_count: number;
  created_at: string;
  updated_at: string;
}

// Agreement stats for dashboard
export interface AgreementStats {
  draft: number;
  sent: number;
  in_progress: number;
  completed: number;
  voided: number;
  declined: number;
  expired: number;
  pending: number;
  action_required: number;
}

// Document summary for lists
export interface DocumentSummary {
  id: string;
  name: string;
  file_name: string;
  source_original_name?: string;
  size_bytes: number;
  page_count: number;
  content_type: string;
  created_at: string;
  updated_at: string;
}

// Recipient details
export interface Recipient {
  id: string;
  name: string;
  email: string;
  role: RecipientRole;
  signing_order: number;
  status: string;
}

// Field definition
export interface Field {
  id: string;
  type: FieldType;
  page: number;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  required: boolean;
  recipient_id: string;
  label?: string;
  tab_index?: number;
  value?: string | boolean;
}

// Signer session data
export interface SignerSession {
  agreement_id: string;
  agreement_title: string;
  document_name: string;
  session_kind?: 'signer' | 'reviewer' | string;
  ui_mode?: 'sign' | 'review' | 'sign_and_review' | string;
  default_tab?: 'sign' | 'review' | string;
  viewer_mode?: 'review' | 'sign' | 'complete' | 'read_only' | string;
  viewer_banner?: 'sender_review' | 'sender_progress' | 'sender_complete' | 'sender_read_only' | string;
  recipient_id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  consent_given: boolean;
  can_sign?: boolean;
  review_markers_visible?: boolean;
  review_markers_interactive?: boolean;
  fields: Field[];
  page_count: number;
}

// API response envelope
export interface APIResponse<T> {
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// API list response
export interface ListResponse<T> {
  items?: T[];
  records?: T[];
  total: number;
  page: number;
  per_page: number;
}

// Google Drive integration types
export interface GoogleIntegrationStatus {
  connected: boolean;
  email?: string;
  account_id?: string;
  scopes?: string[];
  expires_at?: string;
  is_expired?: boolean;
  is_expiring_soon?: boolean;
  can_auto_refresh?: boolean;
  needs_reauthorization?: boolean;
  degraded?: boolean;
  degraded_reason?: string;
}

// Google Account info for multi-account management
export interface GoogleAccountInfo {
  account_id: string;
  email: string;
  status: 'connected' | 'expired' | 'needs_reauth' | 'degraded';
  scopes: string[];
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
  is_default: boolean;
}

// Response from accounts list endpoint
export interface GoogleAccountsResponse {
  status: string;
  accounts: GoogleAccountInfo[];
}

// Google OAuth callback data
export interface GoogleOAuthCallbackData {
  type: 'google_oauth_callback';
  code?: string;
  error?: string;
  error_description?: string;
  account_id?: string;
}

// Google OAuth state
export interface GoogleOAuthState {
  user_id: string;
  account_id: string;
}

// Google integration page config
export interface GoogleIntegrationPageConfig extends ESignPageConfig {
  userId: string;
  googleAccountId?: string;
  googleRedirectUri?: string;
  googleClientId?: string;
  googleEnabled: boolean;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mime_type: string;
  modified_time: string;
  size?: number;
  icon_link?: string;
  thumbnail_link?: string;
}

/**
 * Google import run status values.
 */
export type GoogleImportRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/**
 * Google import run payload returned by the backend import routes.
 * This is the raw transport shape. For normalized import-run handling,
 * use GoogleImportRunHandle or GoogleImportRunDetail from lineage-contracts.
 * @see DOC_LINEAGE_V1_TSK.md Phase 3 Task 3.9
 */
export interface GoogleImportRun {
  import_run_id: string;
  status: GoogleImportRunStatus | 'imported';
  status_url?: string;
  document?: Partial<DocumentSummary> | null;
  agreement?: Partial<AgreementSummary> | null;
  error?: APIError;
  source_document_id?: string | null;
  source_revision_id?: string | null;
  source_artifact_id?: string | null;
  lineage_status?: string;
  fingerprint_status?: FingerprintStatusSummary;
  candidate_status?: CandidateWarningSummary[];
  source_mime_type?: string | null;
  ingestion_mode?: string | null;
  source_document_url?: string;
  document_detail_url?: string;
  agreement_detail_url?: string;
}

// Draft persistence types (for wizard state)
export interface DraftSummary {
  id: string;
  wizard_id: string;
  title: string;
  current_step: number;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  revision: number;
}

export interface DraftDetail extends DraftSummary {
  wizard_state: WizardState;
}

export interface WizardState {
  step: number;
  document_id?: string;
  title?: string;
  recipients?: Recipient[];
  fields?: Field[];
  [key: string]: unknown;
}

export type {
  SourceMetadataBaseline,
  LineageReference,
  SourceRevisionSummary,
  SourceArtifactSummary,
  FingerprintStatusSummary,
  CandidateEvidenceSummary,
  CandidateWarningSummary,
  LineageEmptyState,
  DocumentLineageDetail,
  AgreementLineageDetail,
  GoogleImportLineageStatus,
  GoogleImportRunHandle,
  GoogleImportRunDetail,
  GoogleImportRunResource,
  GoogleImportRedirectRoutes,
  LineagePresentationRules,
  Phase1LineageContractFixtures,
  // Phase 11 Source-Management Types
  FingerprintProcessingSummary,
  SourceManagementLinks,
  SourceManagementPermissions,
  SourceProviderExtensionEnvelope,
  SourceProviderSummary,
  SourceManagementPageInfo,
  SourceHandleSummary,
  SourceRevisionListItem,
  SourceRelationshipSummary,
  SourceCommentAnchorSummary,
  SourceCommentThreadSummary,
  SourceSearchResultSummary,
  SourceListItem,
  SourceListQuery,
  SourceRevisionListQuery,
  SourceRelationshipListQuery,
  SourceSearchQuery,
  SourceListPage,
  SourceDetail,
  SourceRevisionPage,
  SourceRelationshipPage,
  SourceHandlePage,
  SourceRevisionDetail,
  SourceArtifactPage,
  SourceCommentPage,
  SourceSearchResults,
  SourceManagementContractRules,
  Phase11SourceManagementQueryFixtures,
  Phase11SourceManagementFixtureStates,
  Phase11SourceManagementContractFixtures,
} from './lineage-contracts.js';

// =============================================================================
// Timeline Types
// =============================================================================

/**
 * Timeline event from the backend audit log
 */
export interface TimelineEvent {
  id: string;
  event_type: string;
  actor_type?: string;
  actor_id?: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  metadata_raw?: string;
}

/**
 * Actor information for timeline display resolution
 */
export interface TimelineActor {
  actor_type: string;
  actor_id: string;
  display_name: string;
  email?: string;
  role?: string;
  name?: string;
}

/**
 * Participant information for actor fallback resolution
 */
export interface TimelineParticipant {
  id: string;
  recipient_id?: string;
  name?: string;
  display_name?: string;
  email: string;
  role?: string;
  participant_type?: string;
}

/**
 * Review participant data used by the agreement detail review workspace.
 */
export interface AgreementReviewParticipant extends TimelineParticipant {
  can_comment?: boolean;
  can_approve?: boolean;
}

/**
 * Field definition for field-related event resolution
 */
export interface TimelineFieldDefinition {
  id: string;
  participant_id?: string;
  recipient_id?: string;
  type: string;
  label?: string;
  required?: boolean;
  page_number?: number;
}

/**
 * Bootstrap data for the agreement timeline
 */
export interface AgreementTimelineBootstrap {
  agreement_id: string;
  current_user_id?: string;
  events: TimelineEvent[];
  actors: Record<string, TimelineActor>;
  participants: TimelineParticipant[];
  field_definitions: TimelineFieldDefinition[];
}

/**
 * Event category for grouping and filtering
 */
export type TimelineEventCategory =
  | 'lifecycle'
  | 'review'
  | 'comment'
  | 'participant'
  | 'field'
  | 'delivery'
  | 'system';

/**
 * Event priority for condensed view filtering
 * 1 = major lifecycle milestones (always visible)
 * 2 = important user workflow decisions
 * 3 = meaningful but secondary collaboration events
 * 4 = repetitive attention or notification events
 * 5 = technical/system churn (hidden by default)
 */
export type TimelineEventPriority = 1 | 2 | 3 | 4 | 5;

/**
 * Event display configuration from the registry
 */
export interface TimelineEventConfig {
  label: string;
  icon: string;
  color: TimelineColorKey;
  category: TimelineEventCategory;
  priority: TimelineEventPriority;
  groupable: boolean;
}

/**
 * Color keys for timeline event display
 */
export type TimelineColorKey =
  | 'green'
  | 'blue'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'purple'
  | 'gray'
  | 'indigo'
  | 'cyan'
  | 'amber';

/**
 * CSS class configuration for timeline colors
 */
export interface TimelineColorClasses {
  bg: string;
  text: string;
  dot: string;
}

/**
 * Resolved actor display information
 */
export interface ResolvedActorInfo {
  name: string;
  role: string;
  actor_type: string;
  email?: string;
  initials: string;
  color: string;
}

/**
 * Resolved metadata field for display
 */
export interface ResolvedMetadataField {
  key: string;
  displayKey: string;
  value: unknown;
  displayValue: string;
  isBadge: boolean;
  isHidden: boolean;
}

/**
 * Rendered timeline event with all display-ready data
 */
export interface RenderedTimelineEvent {
  event: TimelineEvent;
  config: TimelineEventConfig;
  actor: ResolvedActorInfo;
  timestamp: string;
  relativeTime: string;
  metadata: ResolvedMetadataField[];
}

/**
 * A group of consecutive similar events
 */
export interface TimelineEventGroup {
  events: TimelineEvent[];
  config: TimelineEventConfig;
  eventType: string;
  startTime: string;
  endTime: string;
  isExpanded: boolean;
}

/**
 * Timeline view mode
 */
export type TimelineViewMode = 'condensed' | 'all';

/**
 * Timeline controller configuration
 */
export interface TimelineControllerConfig {
  containerId: string;
  refreshButtonId?: string;
  viewToggleId?: string;
  bootstrap: AgreementTimelineBootstrap;
  basePath: string;
  apiBasePath: string;
  agreementId: string;
  panelName?: string;
}

/**
 * Agreement detail page controller configuration
 */
export interface AgreementDetailPageConfig {
  basePath: string;
  apiBasePath: string;
  panelName?: string;
  agreementId: string;
  agreementStatus?: string;
  tenantId?: string;
  orgId?: string;
  delivery?: {
    executed_applicable?: boolean;
    executed_status?: string;
    executed_object_key?: string;
    certificate_applicable?: boolean;
    certificate_status?: string;
    certificate_object_key?: string;
  };
  feedback?: {
    sseEndpoint?: string;
  };
}

export type AgreementLiveSection =
  | 'review_status'
  | 'review_config'
  | 'participants'
  | 'comments'
  | 'delivery'
  | 'artifacts'
  | 'timeline';

export interface ESignAgreementChangedEvent {
  type: 'esign.agreement.changed';
  resource_type: 'esign_agreement';
  resource_id: string;
  tenant_id?: string;
  org_id?: string;
  correlation_id?: string;
  sections: AgreementLiveSection[];
  occurred_at: string;
  status?: 'accepted' | 'completed' | 'failed';
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Review bootstrap data (existing format from template)
 */
export interface AgreementReviewBootstrap {
  status: string;
  gate: string;
  comments_enabled: boolean;
  review_id: string;
  override_active: boolean;
  override_reason: string;
  override_by_user_id: string;
  override_by_display_name: string;
  override_at: string;
  actor_map: Record<string, TimelineActor>;
  participants: AgreementReviewParticipant[];
}
