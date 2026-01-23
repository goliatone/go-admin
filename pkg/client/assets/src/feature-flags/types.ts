/**
 * Feature Flags Types
 */

export interface FlagDefault {
  set: boolean;
  value: boolean;
}

export interface FlagOverride {
  state: string;
  value?: boolean;
}

export interface Flag {
  key: string;
  description?: string;
  effective: boolean;
  source: string;
  default?: FlagDefault;
  override?: FlagOverride;
}

export interface FlagsPayload {
  flags: Flag[];
  mutable: boolean;
}

export interface FeatureFlagsConfig {
  /** API endpoint for feature flags */
  apiPath: string;
  /** Base path for the admin panel */
  basePath: string;
}

export interface FeatureFlagsSelectors {
  scopeSelect: string;
  scopeIdInput: string;
  applyScopeBtn: string;
  refreshBtn: string;
  searchInput: string;
  mutableState: string;
  tableBody: string;
  emptyState: string;
}

export type OverrideState = 'unset' | 'enabled' | 'disabled';

export interface ActionMenuOption {
  value: OverrideState;
  label: string;
  icon: string;
}

export interface ToastNotifier {
  success(message: string): void;
  error(message: string): void;
}
