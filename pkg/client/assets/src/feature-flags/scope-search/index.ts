/**
 * Scope Search Module
 * Specialized search box for feature flags scope selection
 */

export { ScopeSearchBox, createScopeSearchBox, createDefaultScopeConfigs } from './scope-search-box.js';

export type {
  ScopeType,
  ScopeConfig,
  ScopeSearchBoxConfig,
  SystemScopeResult,
  TenantScopeResult,
  OrgScopeResult,
  UserScopeResult,
} from './types.js';
