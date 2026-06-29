export type NavigationOverrideValue = 'inherit' | 'show' | 'hide';

export interface EntryNavigationConfig {
  enabled: boolean;
  editable: boolean;
  read_only: boolean;
  endpoint: string;
  eligible_locations: string[];
  default_locations: string[];
  allow_instance_override: boolean;
}

export interface EntryNavigationState {
  overrides: Record<string, NavigationOverrideValue>;
  effective_visibility: Record<string, boolean>;
}

export interface EntryNavigationPatchResult {
  overrides: Record<string, NavigationOverrideValue>;
  effective_visibility: Record<string, boolean>;
}
