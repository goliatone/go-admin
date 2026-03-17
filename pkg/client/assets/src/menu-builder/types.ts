export type MenuStatus = 'draft' | 'published';
export type NavigationOverrideValue = 'inherit' | 'show' | 'hide';
export type MenuTargetType = 'content' | 'route' | 'module' | 'external';

export interface MenuBuilderEndpoints {
  [key: string]: string;
}

export interface ContentNavigationContracts {
  endpoints?: Record<string, string>;
  entry_navigation_overrides?: {
    value_enum?: string[];
    write_endpoint?: string;
  };
  validation?: {
    invalid_location?: {
      field_pattern?: string;
      rule?: string;
      hint?: string;
    };
    invalid_value?: {
      allowed_values?: string[];
    };
  };
}

export interface MenuBuilderContracts {
  endpoints: MenuBuilderEndpoints;
  error_codes: Record<string, string>;
  content_navigation?: ContentNavigationContracts;
}

export interface MenuRecord {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: MenuStatus;
  locale?: string;
  family_id?: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
  archived_at?: string;
}

export interface MenuBindingRecord {
  id?: string;
  location: string;
  menu_code: string;
  view_profile_code?: string;
  locale?: string;
  priority: number;
  status: MenuStatus;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
}

export type MenuViewProfileMode = 'full' | 'top_level_limit' | 'max_depth' | 'include_ids' | 'exclude_ids' | 'composed';

export interface MenuViewProfileRecord {
  code: string;
  name: string;
  mode: MenuViewProfileMode;
  max_top_level?: number;
  max_depth?: number;
  include_item_ids?: string[];
  exclude_item_ids?: string[];
  status: MenuStatus;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
}

export interface MenuItemTarget {
  type: MenuTargetType;
  id?: string;
  slug?: string;
  content_type?: string;
  path?: string;
  route?: string;
  module?: string;
  url?: string;
}

export interface MenuItemNode {
  id: string;
  label: string;
  type?: string;
  parent_id?: string;
  target?: MenuItemTarget;
  children: MenuItemNode[];
}

export interface MenuPreviewSimulation {
  requested_id?: string;
  location?: string;
  locale?: string;
  view_profile?: string;
  include_drafts?: boolean;
  preview_token_present?: boolean;
  binding?: MenuBindingRecord;
  profile?: MenuViewProfileRecord;
}

export interface MenuPreviewResult {
  menu: {
    code: string;
    items: MenuItemNode[];
  };
  simulation?: MenuPreviewSimulation;
}

export interface ValidationIssue {
  code: string;
  message: string;
  field?: string;
  item_id?: string;
}

export interface MenuBuilderState {
  loading: boolean;
  error: string;
  contracts: MenuBuilderContracts | null;
  menus: MenuRecord[];
  selected_menu_id: string;
  selected_menu: MenuRecord | null;
  draft_items: MenuItemNode[];
  bindings: MenuBindingRecord[];
  profiles: MenuViewProfileRecord[];
  validation_issues: ValidationIssue[];
  preview_result: MenuPreviewResult | null;
}

export interface EntryNavigationConfig {
  enabled: boolean;
  eligible_locations: string[];
  default_locations: string[];
  allow_instance_override: boolean;
  merge_mode?: string;
}

export interface EntryNavigationState {
  overrides: Record<string, NavigationOverrideValue>;
  effective_visibility: Record<string, boolean>;
}
