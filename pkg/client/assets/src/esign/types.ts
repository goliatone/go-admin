/**
 * E-Sign Module Types
 * Core type definitions for the e-sign frontend module
 */

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
  recipient_id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  consent_given: boolean;
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

export interface GoogleImportRun {
  import_run_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  document?: DocumentSummary;
  agreement?: AgreementSummary;
  error?: APIError;
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
