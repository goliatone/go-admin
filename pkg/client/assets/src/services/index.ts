/**
 * Services Module
 * Frontend integration for the go-admin services platform
 */

// Types
export * from './types.js';

// API Client
export {
  ServicesAPIClient,
  getServicesClient,
  setServicesClient,
  createServicesClient,
  type ServicesAPIClientConfig,
} from './api-client.js';

// Query State Management
export {
  QueryStateManager,
  debounce,
  buildSearchParams,
  parseSearchParams,
  type QueryStateConfig,
  type QueryState,
  type QueryStateManagerOptions,
} from './query-state.js';

// Permissions
export {
  ServicesPermissionManager,
  getPermissionManager,
  initPermissions,
  initPermissionsFromContext,
  loadPermissionsFromContext,
  // Guards
  createPermissionGuard,
  requireAll,
  requireAny,
  combineGuards,
  canViewServices,
  canConnect,
  canEdit,
  canRevoke,
  canReconsent,
  canViewActivity,
  // Error handling
  isForbiddenError,
  handleForbidden,
  withPermission,
  // DOM utilities
  gateElement,
  initPermissionGates,
  // Types
  type PermissionState,
  type PermissionCheckResult,
  type PermissionGateOptions,
  type PermissionGuard,
} from './permissions.js';

// UI State Components
export {
  renderLoadingState,
  renderEmptyState,
  renderNoResultsState,
  renderErrorState,
  renderForbiddenState,
  renderTableLoadingState,
  renderTableErrorState,
  renderTableEmptyState,
  renderTableNoResultsState,
  UIStateManager,
  type UIStateConfig,
  type LoadingStateConfig,
  type EmptyStateConfig,
  type NoResultsStateConfig,
  type ErrorStateConfig,
  type ForbiddenStateConfig,
  type UIStateType,
  type UIStateManagerConfig,
} from './ui-states.js';

// Mutation Feedback (confirmation UX and feedback patterns)
export {
  MutationButtonManager,
  withMutationFeedback,
  withConfirmation,
  renderRetryUI,
  clearRetryUI,
  getServiceConfirmConfig,
  confirmServiceAction,
  ActionQueue,
  type MutationButtonState,
  type MutationButtonConfig,
  type MutationFeedbackConfig,
  type ConfirmMutationConfig,
  type RetryableActionConfig,
  type ServiceConfirmConfig,
} from './mutation-feedback.js';

// Activity Labels (action label resolution with backend overrides)
export {
  initActivityLabels,
  getActionLabel,
  getActionEntry,
  getAllActionLabels,
  getActionsByCategory,
  setActionLabels,
  isActivityLabelsInitialized,
  resetActivityLabels,
  createActionLabelResolver,
  DEFAULT_ACTION_LABELS,
  type ActionLabelConfig,
  type ActionLabelEntry,
} from './activity-labels.js';

// Deep Links (entity navigation with context preservation)
export {
  configureDeepLinks,
  generateDeepLink,
  generateListLink,
  navigateToEntity,
  navigateBack,
  parseCurrentDeepLink,
  parseDeepLink,
  mapObjectTypeToEntity,
  createNavigationContext,
  createActivityNavigateHandler,
  deepLinkManager,
  type ServiceEntityType,
  type DeepLinkConfig,
  type NavigationContext,
  type ParsedDeepLink,
} from './deep-links.js';

// Accessibility (keyboard navigation, focus management, screen reader support)
export {
  setupKeyboardNavigation,
  setupRovingTabindex,
  createFocusTrap,
  announceToScreenReader,
  announceLoading,
  announceSuccess,
  announceError,
  announceNavigation,
  setExpandedState,
  setLoadingState,
  setStatusLabel,
  setSortableHeader,
  setProgress,
  createSkipLink,
  setupDialogFocus,
  prefersReducedMotion,
  getAnimationDuration,
  FOCUSABLE_SELECTOR,
  type KeyboardNavigationConfig,
  type FocusTrapConfig,
  type AnnounceOptions,
} from './accessibility.js';

// Extension Diagnostics (package registration state, hooks, config health, errors)
export {
  ExtensionDiagnosticsPanel,
  renderStateSourceIndicator,
  addStateSourceIndicator,
  renderStateSourceLegend,
  type ExtensionStatus,
  type ProviderPackInfo,
  type HookInfo,
  type ConfigHealth,
  type ExtensionError,
  type ExtensionDiagnosticsState,
  type ExtensionDiagnosticsPanelConfig,
  type StateSource,
  type StateSourceIndicatorConfig,
} from './extension-diagnostics.js';

// Pages
export {
  ProvidersCatalogManager,
  createProvidersCatalog,
  ConnectionsListManager,
  createConnectionsList,
  InstallationsListManager,
  createInstallationsList,
  ActivityPageManager,
  createActivityPage,
  SubscriptionsSyncPageManager,
  createSubscriptionsSyncPage,
  ConnectionDetailManager,
  createConnectionDetail,
  type ProvidersPageConfig,
  type ProviderCardData,
  type ConnectionsListConfig,
  type InstallationsListConfig,
  type ActivityPageConfig,
  type ActivityViewMode,
  type SubscriptionsSyncPageConfig,
  type SubscriptionsSyncTab,
  type ConnectionDetailConfig,
} from './pages/index.js';
