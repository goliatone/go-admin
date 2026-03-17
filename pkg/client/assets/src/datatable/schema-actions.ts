/**
 * Schema-Driven Actions for DataGrid
 *
 * Builds row actions from server-provided schema.actions,
 * with fallback to default view/edit/delete when absent.
 *
 * Design decisions (per CONTENT_TRANSLATION_TDD.md):
 * - Schema actions are authoritative when present
 * - Default actions (view/edit/delete) are fallback only
 * - Duplicate prevention by action name
 * - Deterministic precedence: schema > defaults
 */

import { executeStructuredDelete } from './action-execution.js';
import type { ActionButton, ActionVariant } from './actions.js';
import type { ActionRemediation, ActionState } from './action-contracts.js';
import { resolveActionState } from './action-contracts.js';
import {
  createStructuredActionError,
  executeActionRequest,
  formatStructuredErrorForDisplay,
  type StructuredRequestResult,
  extractTranslationBlocker,
  isTranslationBlocker,
  type StructuredError,
} from '../toast/error-helpers.js';
import { getActionBlockDisplay } from './translation-status-vocabulary.js';
import { PayloadInputModal } from './payload-modal-lazy.js';

// ============================================================================
// Schema Action Types
// ============================================================================

/**
 * Schema action definition from server (schema.actions[*])
 */
export interface SchemaAction {
  /** Unique action identifier */
  name: string;
  /** Display label */
  label?: string;
  /** i18n label key */
  label_key?: string;
  /** Command name for command-backed actions */
  command_name?: string;
  /** Confirmation message (if action requires confirmation) */
  confirm?: string;
  /** Action visual variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  /** Icon identifier */
  icon?: string;
  /** Required payload fields (legacy boolean is also tolerated) */
  payload_required?: string[] | boolean;
  /** JSON Schema for payload */
  payload_schema?: PayloadSchema | Record<string, unknown>;
  /** Action type hint (navigation vs POST) */
  type?: 'navigation' | 'action';
  /** Target URL pattern for navigation actions */
  href?: string;
  /** Scope where this action is valid */
  scope?: 'all' | 'row' | 'detail' | 'bulk';
  /** Record fields required to render/execute this action in a given context */
  context_required?: string[];
  /** Permission required for this action */
  permission?: string;
  /** Server-authoritative display order (lower numbers appear first) */
  order?: number;
}

/**
 * Payload schema for actions requiring input
 */
export interface PayloadSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, PayloadSchemaProperty>;
  'x-translation-context'?: Record<string, unknown>;
  x_translation_context?: Record<string, unknown>;
}

export interface PayloadSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  oneOf?: PayloadSchemaOption[];
}

export interface PayloadSchemaOption {
  const?: unknown;
  title?: string;
}

// ============================================================================
// Schema Action Builder Configuration
// ============================================================================

/**
 * Configuration for building schema-driven actions
 */
export interface SchemaActionBuilderConfig {
  /** Base path for action API endpoint (e.g., /admin/api/panels/pages) */
  apiEndpoint: string;
  /** Base path for navigation actions (e.g., /admin/content/pages) */
  actionBasePath: string;
  /** Current locale context (passed to action payloads) */
  locale?: string;
  /** Current content channel context (passed to action payloads) */
  channel?: string;
  /** Panel/entity name (e.g., 'pages') */
  panelName?: string;
  /** Callback for handling translation blockers */
  onTranslationBlocker?: (info: TranslationBlockerContext) => void;
  /** Callback after successful action execution */
  onActionSuccess?: (actionName: string, result: ActionResult) => void;
  /** Callback after action error */
  onActionError?: (actionName: string, error: StructuredError) => void;
  /** Optional reconciliation hook after a structured domain failure */
  reconcileOnDomainFailure?: (actionName: string, error: StructuredError) => Promise<void> | void;
  /** Whether to use default actions as fallback (default: true) */
  useDefaultFallback?: boolean;
  /** Explicit compatibility mode: append defaults even with schema actions */
  appendDefaultActions?: boolean;
  /** Action rendering context (DataGrid row actions use 'row') */
  actionContext?: 'row' | 'detail' | 'bulk';
  /** Optional client-side action order override (action name -> order) */
  actionOrderOverride?: Record<string, number>;
}

/**
 * Result from action execution
 */
export interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: StructuredError;
}

/**
 * Context for translation blocker handling
 */
export interface TranslationBlockerContext {
  actionName: string;
  recordId: string;
  missingLocales: string[];
  missingFieldsByLocale: Record<string, string[]> | null;
  transition: string | null;
  entityType: string | null;
  requestedLocale: string | null;
  channel: string | null;
  retry?: () => Promise<ActionResult>;
}

// ============================================================================
// Schema Action Builder
// ============================================================================

// ============================================================================
// Action Ordering Constants
// ============================================================================

/**
 * Stable fallback order map for common actions.
 * Used when server doesn't provide explicit order.
 * Lower numbers appear first.
 */
const STABLE_ACTION_ORDER: Record<string, number> = {
  view: 100,
  view_family: 150,
  edit: 200,
  duplicate: 300,
  create_translation: 400,
  publish: 500,
  unpublish: 600,
  submit: 700,
  approve: 800,
  reject: 900,
  archive: 1000,
  restore: 1100,
  delete: 9000, // Destructive actions last
};

/** Default order for unknown actions (before destructive actions) */
const DEFAULT_ACTION_ORDER = 5000;

/** Maximum order value for insertion-order tie-breaking */
const MAX_ORDER = 10000;

/**
 * Internal wrapper for action with ordering metadata
 */
interface OrderedAction {
  action: ActionButton;
  name: string;
  order: number;
  insertionIndex: number;
}

/**
 * Builds row actions from schema.actions with proper precedence and deduplication.
 *
 * Rules:
 * 1. Navigation actions (view, edit): build navigation URLs
 * 2. Delete action: existing delete flow
 * 3. All other schema actions: POST to /admin/api/panels/{panel}/actions/{action.name}
 * 4. Duplicate prevention by action name
 * 5. Schema actions take precedence over defaults
 * 6. Action ordering precedence: schema.order > actionOrderOverride > stable fallback > insertion
 */
export class SchemaActionBuilder {
  private config: SchemaActionBuilderConfig;
  private seenActions: Set<string> = new Set();

  constructor(config: SchemaActionBuilderConfig) {
    this.config = {
      useDefaultFallback: true,
      appendDefaultActions: false,
      actionContext: 'row',
      ...config,
    };
  }

  private getContentChannel(): string | null {
    const channel = String(this.config.channel ?? '').trim();
    return channel || null;
  }

  /**
   * Build row actions for a record from schema.actions
   *
   * @param record - The data record
   * @param schemaActions - Actions from schema.actions (may be undefined)
   * @returns Array of ActionButton for rendering
   */
  buildRowActions(record: Record<string, unknown>, schemaActions?: SchemaAction[]): ActionButton[] {
    this.seenActions.clear();
    const orderedActions: OrderedAction[] = [];
    let insertionIndex = 0;

    // Build URL query context
    const queryContext = this.buildQueryContext();

    // If schema actions exist, use them as authoritative source
    if (Array.isArray(schemaActions) && schemaActions.length > 0) {
      for (const schemaAction of schemaActions) {
        if (!schemaAction.name) continue;
        const actionState = this.resolveRecordActionState(record, schemaAction.name);
        if (!this.shouldIncludeAction(record, schemaAction, actionState)) continue;

        // Skip duplicates
        const actionKey = schemaAction.name.toLowerCase();
        if (this.seenActions.has(actionKey)) continue;
        this.seenActions.add(actionKey);

        const normalizedActionState = this.normalizeContextBoundActionState(record, schemaAction, actionState);
        const actionButton = this.buildActionFromSchema(record, schemaAction, queryContext, normalizedActionState);
        if (actionButton) {
          orderedActions.push({
            action: actionButton,
            name: schemaAction.name,
            order: this.resolveActionOrder(schemaAction.name, schemaAction.order),
            insertionIndex: insertionIndex++,
          });
        }
      }

      // Only append defaults if explicitly requested (compatibility mode)
      if (this.config.appendDefaultActions) {
        this.appendDefaultActionsOrdered(orderedActions, record, queryContext, insertionIndex);
      }
    } else if (this.config.useDefaultFallback) {
      // No schema actions - use defaults as fallback
      this.appendDefaultActionsOrdered(orderedActions, record, queryContext, insertionIndex);
    }

    // Sort actions by order (ascending), then by insertion index for tie-breaking
    orderedActions.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.insertionIndex - b.insertionIndex;
    });

    return orderedActions.map((oa) => oa.action);
  }

  /**
   * Resolve action order using precedence:
   * 1. schema.actions[*].order (server authoritative)
   * 2. actionOrderOverride (optional client override)
   * 3. stable fallback map
   * 4. default order
   */
  private resolveActionOrder(actionName: string, schemaOrder?: number): number {
    // 1. Server-provided order takes highest precedence
    if (typeof schemaOrder === 'number' && Number.isFinite(schemaOrder)) {
      return schemaOrder;
    }

    const normalizedName = actionName.toLowerCase();

    // 2. Client-side override
    if (this.config.actionOrderOverride?.[normalizedName] !== undefined) {
      return this.config.actionOrderOverride[normalizedName];
    }

    // 3. Stable fallback map
    if (STABLE_ACTION_ORDER[normalizedName] !== undefined) {
      return STABLE_ACTION_ORDER[normalizedName];
    }

    // 4. Default order for unknown actions
    return DEFAULT_ACTION_ORDER;
  }

  /**
   * Build a single action from schema definition
   */
  private buildActionFromSchema(
    record: Record<string, unknown>,
    schemaAction: SchemaAction,
    queryContext: string,
    actionState: ActionState | null
  ): ActionButton | null {
    const actionName = schemaAction.name;
    const label = schemaAction.label || schemaAction.label_key || actionName;
    const variant = (schemaAction.variant || 'secondary') as ActionVariant;
    const icon = schemaAction.icon;

    // Determine action type based on name or explicit type hint
    const isNavigationAction = this.isNavigationAction(schemaAction);
    const isDeleteAction = actionName === 'delete';

    if (isNavigationAction) {
      return this.applyActionState(
        this.buildNavigationAction(record, schemaAction, label, variant, icon, queryContext),
        actionState
      );
    }

    if (isDeleteAction) {
      return this.applyActionState(this.buildDeleteAction(record, label, variant, icon), actionState);
    }

    // All other actions: POST to panel action endpoint
    return this.applyActionState(this.buildPostAction(record, schemaAction, label, variant, icon), actionState);
  }

  /**
   * Check if action is a navigation action
   */
  private isNavigationAction(schemaAction: SchemaAction): boolean {
    if (schemaAction.type === 'navigation') return true;
    if (schemaAction.href) return true;

    // Known navigation actions by name
    const navActions = ['view', 'edit', 'show', 'details'];
    return navActions.includes(schemaAction.name.toLowerCase());
  }

  private shouldIncludeAction(
    record: Record<string, unknown>,
    schemaAction: SchemaAction,
    actionState: ActionState | null
  ): boolean {
    if (!this.matchesActionScope(schemaAction.scope)) {
      return false;
    }

    const missingContext = this.missingRequiredContext(record, schemaAction);
    if (missingContext.length === 0) {
      return true;
    }

    // When the server publishes _action_state for a context-bound action,
    // keep the action visible so shared disabled-reason handling can render it.
    return actionState !== null;
  }

  private resolveRecordActionState(record: Record<string, unknown>, actionName: string): ActionState | null {
    return resolveActionState(record, actionName);
  }

  private applyActionState(action: ActionButton, state: ActionState | null): ActionButton {
    if (!state) {
      return action;
    }
    if (state.enabled !== false) {
      return action;
    }
    const disabledReason = this.disabledReason(state);
    return {
      ...action,
      disabled: true,
      disabledReason,
      disabledReasonCode: typeof state.reason_code === 'string' ? state.reason_code : undefined,
      disabledSeverity: typeof state.severity === 'string' ? state.severity : undefined,
      disabledKind: typeof state.kind === 'string' ? state.kind : undefined,
      remediation: this.normalizeRemediation(state.remediation),
    };
  }

  private normalizeRemediation(remediation: ActionRemediation | null | undefined): ActionRemediation | null {
    if (!remediation || typeof remediation !== 'object') {
      return null;
    }
    const label = typeof remediation.label === 'string' ? remediation.label.trim() : '';
    const href = typeof remediation.href === 'string' ? remediation.href.trim() : '';
    const kind = typeof remediation.kind === 'string' ? remediation.kind.trim() : '';
    if (!label && !href && !kind) {
      return null;
    }
    return {
      ...(label ? { label } : {}),
      ...(href ? { href } : {}),
      ...(kind ? { kind } : {}),
    };
  }

  private disabledReason(state: ActionState): string {
    const reason = typeof state.reason === 'string' ? state.reason.trim() : '';
    if (reason) {
      return reason;
    }
    const normalizedCode = typeof state.reason_code === 'string' ? state.reason_code.trim() : '';
    if (normalizedCode) {
      const shared = getActionBlockDisplay({ reason_code: normalizedCode });
      if (shared?.message) {
        return shared.message;
      }
    }
    switch (normalizedCode.toLowerCase()) {
      case 'workflow_transition_not_available':
      case 'invalid_status':
        return 'Action is not available in the current workflow state.';
      case 'permission_denied':
        return 'You do not have permission to execute this action.';
      case 'missing_context_required':
      case 'missing_context':
        return 'Action is unavailable because required record context is missing.';
      case 'translation_missing':
        return 'Required translations are missing.';
      case 'feature_disabled':
        return 'This feature is currently disabled.';
      default:
        return 'Action is currently unavailable.';
    }
  }

  private matchesActionScope(scope: SchemaAction['scope']): boolean {
    const normalizedScope = typeof scope === 'string' ? scope.trim().toLowerCase() : '';
    if (!normalizedScope || normalizedScope === 'all') {
      return true;
    }
    const context = (this.config.actionContext || 'row').toLowerCase();
    return normalizedScope === context;
  }

  private missingRequiredContext(
    record: Record<string, unknown>,
    schemaAction: SchemaAction
  ): string[] {
    const requiredContext = Array.isArray(schemaAction.context_required)
      ? schemaAction.context_required
      : [];
    if (requiredContext.length === 0) {
      return [];
    }

    const missing: string[] = [];
    for (const rawField of requiredContext) {
      const field = typeof rawField === 'string' ? rawField.trim() : '';
      if (!field) {
        continue;
      }
      const value = this.resolveRecordContextValue(record, field);
      if (this.isEmptyPayloadValue(value)) {
        missing.push(field);
      }
    }
    return missing;
  }

  private normalizeContextBoundActionState(
    record: Record<string, unknown>,
    schemaAction: SchemaAction,
    actionState: ActionState | null
  ): ActionState | null {
    const missingContext = this.missingRequiredContext(record, schemaAction);
    if (missingContext.length === 0) {
      return actionState;
    }
    if (actionState && actionState.enabled === false) {
      return actionState;
    }

    // Fail closed if a context-bound action reaches the renderer without the
    // required fields needed to execute or interpolate it.
    return {
      enabled: false,
      reason: 'record does not include required context for this action',
      reason_code: 'missing_context_required',
      metadata: {
        missing_context_fields: missingContext,
        required_context_fields: Array.isArray(schemaAction.context_required)
          ? [...schemaAction.context_required]
          : [],
      },
    };
  }

  private resolveRecordContextValue(record: Record<string, unknown>, path: string): unknown {
    const normalizedPath = path.trim();
    if (!normalizedPath) return undefined;
    if (!normalizedPath.includes('.')) {
      return record[normalizedPath];
    }

    const segments = normalizedPath.split('.').map((segment) => segment.trim()).filter(Boolean);
    if (segments.length === 0) return undefined;

    let cursor: unknown = record;
    for (const segment of segments) {
      if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) {
        return undefined;
      }
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    return cursor;
  }

  /**
   * Build navigation action (view, edit, etc.)
   */
  private buildNavigationAction(
    record: Record<string, unknown>,
    schemaAction: SchemaAction,
    label: string,
    variant: ActionVariant,
    icon: string | undefined,
    queryContext: string
  ): ActionButton {
    const recordId = String(record.id || '');
    const basePath = this.config.actionBasePath;

    // Determine target URL
    let targetUrl: string;
    if (schemaAction.href) {
      targetUrl = this.interpolateHrefTemplate(schemaAction.href, record, recordId);
    } else if (schemaAction.name === 'edit') {
      targetUrl = `${basePath}/${recordId}/edit`;
    } else {
      // Default: view
      targetUrl = `${basePath}/${recordId}`;
    }

    // Append query context
    if (queryContext) {
      targetUrl += targetUrl.includes('?') ? `&${queryContext}` : `?${queryContext}`;
    }

    return {
      id: schemaAction.name,
      label,
      icon: icon || this.getDefaultIcon(schemaAction.name),
      variant,
      action: () => {
        window.location.href = targetUrl;
      },
    };
  }

  private interpolateHrefTemplate(
    template: string,
    record: Record<string, unknown>,
    recordId: string
  ): string {
    const hrefTemplate = template.trim();
    if (!hrefTemplate) {
      return hrefTemplate;
    }

    return hrefTemplate.replace(/\{([^}]+)\}/g, (_match, rawField: string) => {
      const field = String(rawField || '').trim();
      if (!field) {
        return '';
      }
      if (field === 'id') {
        return recordId;
      }
      const value = this.resolveRecordContextValue(record, field);
      if (value === undefined || value === null) {
        return '';
      }
      return String(value);
    });
  }

  /**
   * Build delete action with confirmation
   */
  private buildDeleteAction(
    record: Record<string, unknown>,
    label: string,
    variant: ActionVariant,
    icon: string | undefined
  ): ActionButton {
    const recordId = String(record.id || '');
    const endpoint = this.config.apiEndpoint;

    return {
      id: 'delete',
      label,
      icon: icon || 'trash',
      variant: variant === 'secondary' ? 'danger' : variant,
      action: async () => {
        await executeStructuredDelete({
          endpoint: `${endpoint}/${recordId}`,
          fallbackMessage: 'Delete failed',
          onSuccess: async (result) => {
            this.config.onActionSuccess?.('delete', {
              success: true,
              data: result.data,
            });
          },
          onError: async (error) => {
            this.config.onActionError?.('delete', error);
          },
          reconcileOnDomainFailure: async (error) => {
            if (error.textCode && this.config.reconcileOnDomainFailure) {
              await this.config.reconcileOnDomainFailure('delete', error);
            }
          },
        });
      },
    };
  }

  /**
   * Build POST action for workflow/panel actions
   */
  private buildPostAction(
    record: Record<string, unknown>,
    schemaAction: SchemaAction,
    label: string,
    variant: ActionVariant,
    icon: string | undefined
  ): ActionButton {
    const recordId = String(record.id || '');
    const actionName = schemaAction.name;
    const endpoint = `${this.config.apiEndpoint}/actions/${actionName}`;

    return {
      id: actionName,
      label,
      icon: icon || this.getDefaultIcon(actionName),
      variant,
      action: async () => {
        // Handle confirmation if required
        if (schemaAction.confirm) {
          const confirmed = window.confirm(schemaAction.confirm);
          if (!confirmed) return;
        }

        // Build payload
        const payload = await this.buildActionPayload(record, schemaAction);
        if (payload === null) {
          // User cancelled payload input
          return;
        }

        await this.executePostAction({
          actionName,
          endpoint,
          payload,
          recordId,
        });
      },
    };
  }

  private async executePostAction(input: {
    actionName: string;
    endpoint: string;
    payload: Record<string, unknown>;
    recordId: string;
  }): Promise<ActionResult> {
    const result = await executeActionRequest(input.endpoint, input.payload);

    if (result.success) {
      // Post-create handoff for create_translation action
      if (input.actionName.toLowerCase() === 'create_translation' && result.data) {
        this.handleCreateTranslationSuccess(result.data, input.payload);
        return result;
      }

      if (this.handleActionRedirectSuccess(result.data)) {
        return result;
      }

      this.config.onActionSuccess?.(input.actionName, result);
      return result;
    }

    // Translation blockers require a modal-first remediation flow with retry support.
    if (result.error && isTranslationBlocker(result.error)) {
      const blockerInfo = extractTranslationBlocker(result.error);
      if (blockerInfo && this.config.onTranslationBlocker) {
        const retryPayload = { ...input.payload };
        const channel = this.getContentChannel() || blockerInfo.channel || null;
        this.config.onTranslationBlocker({
          actionName: input.actionName,
          recordId: input.recordId,
          ...blockerInfo,
          channel,
          retry: async () => this.executePostAction({
            actionName: input.actionName,
            endpoint: input.endpoint,
            payload: { ...retryPayload },
            recordId: input.recordId,
          }),
        });
        return { success: false, error: result.error };
      }
    }

    await this.handleStructuredActionFailure(input.actionName, result, `${input.actionName} failed`);
    return { success: false, error: result.error };
  }

  private handleActionRedirectSuccess(data?: Record<string, unknown>): boolean {
    if (!data || typeof window === 'undefined') {
      return false;
    }

    const redirectPath = typeof data.redirect_path === 'string' ? data.redirect_path.trim() : '';
    if (redirectPath) {
      window.location.href = redirectPath;
      return true;
    }

    const redirectRecordID = typeof data.redirect_record_id === 'string'
      ? data.redirect_record_id.trim()
      : '';
    if (!redirectRecordID) {
      return false;
    }

    const redirectToEdit = data.redirect_to_edit === true
      || data.mode === 'redirect';
    const targetURL = redirectToEdit
      ? `${this.config.actionBasePath}/${encodeURIComponent(redirectRecordID)}/edit`
      : `${this.config.actionBasePath}/${encodeURIComponent(redirectRecordID)}`;

    window.location.href = targetURL;
    return true;
  }

  private async handleStructuredActionFailure(
    actionName: string,
    result: StructuredRequestResult | ActionResult,
    fallbackMessage: string
  ): Promise<ActionResult> {
    if (!result.error) {
      return result;
    }

    const formattedMessage = this.buildActionErrorMessage(actionName, result.error);
    const normalizedError = {
      ...result.error,
      message: formattedMessage,
    };

    if (normalizedError.textCode && this.config.reconcileOnDomainFailure) {
      await this.config.reconcileOnDomainFailure(actionName, normalizedError);
    }

    this.config.onActionError?.(actionName, normalizedError);
    throw createStructuredActionError(normalizedError, fallbackMessage, !!this.config.onActionError);
  }

  /**
   * Handle successful create_translation action:
   * - Show success toast with source locale shortcut
   * - Redirect to new locale edit page
   */
  private handleCreateTranslationSuccess(
    data: Record<string, unknown>,
    originalPayload: Record<string, unknown>
  ): void {
    // Extract new record info from response
    const newId = typeof data.id === 'string' ? data.id : String(data.id || '');
    const newLocale = typeof data.locale === 'string' ? data.locale : '';

    if (!newId) {
      console.warn('[SchemaActionBuilder] create_translation response missing id');
      return;
    }

    // Build redirect URL to edit the new translation
    const basePath = this.config.actionBasePath;
    const params = new URLSearchParams();
    if (newLocale) {
      params.set('locale', newLocale);
    }
    const channel = this.getContentChannel();
    if (channel) {
      params.set('channel', channel);
    }
    const queryString = params.toString();
    const editUrl = `${basePath}/${newId}/edit${queryString ? `?${queryString}` : ''}`;

    // Show success toast with source locale shortcut
    const sourceLocale = typeof originalPayload.source_locale === 'string'
      ? originalPayload.source_locale
      : this.config.locale || 'source';
    const localeLabel = this.localeLabel(newLocale || 'unknown');

    // Use toast if available, otherwise console log
    if (typeof window !== 'undefined' && 'toastManager' in window) {
      const toastManager = (window as unknown as {
        toastManager: { success: (msg: string, opts?: { action?: { label: string; handler: () => void } }) => void }
      }).toastManager;

      toastManager.success(`${localeLabel} translation created`, {
        action: {
          label: `View ${sourceLocale.toUpperCase()}`,
          handler: () => {
            // Navigate back to source locale
            const sourceParams = new URLSearchParams();
            sourceParams.set('locale', sourceLocale);
            if (channel) {
              sourceParams.set('channel', channel);
            }
            const sourceId = typeof originalPayload.id === 'string'
              ? originalPayload.id
              : String(originalPayload.id || newId);
            window.location.href = `${basePath}/${sourceId}/edit?${sourceParams.toString()}`;
          },
        },
      });
    } else {
      console.log(`[SchemaActionBuilder] Translation created: ${newLocale}`);
    }

    // Redirect to new translation edit page
    window.location.href = editUrl;
  }

  /**
   * Build action payload from record and schema
   */
  private async buildActionPayload(
    record: Record<string, unknown>,
    schemaAction: SchemaAction
  ): Promise<Record<string, unknown> | null> {
    const normalizedActionName = schemaAction.name.trim().toLowerCase();
    const payload: Record<string, unknown> = {
      id: record.id,
    };

    // Add locale/channel context
    if (this.config.locale && normalizedActionName !== 'create_translation') {
      payload.locale = this.config.locale;
    }
    const channel = this.getContentChannel();
    if (channel) {
      payload.channel = channel;
    }
    if (this.config.panelName) {
      payload.policy_entity = this.config.panelName;
    }
    if (payload.expected_version === undefined) {
      const expectedVersion = this.resolveExpectedVersion(record);
      if (expectedVersion !== null) {
        payload.expected_version = expectedVersion;
      }
    }

    const schema = this.normalizePayloadSchema(schemaAction.payload_schema);
    const requiredFields = this.collectRequiredFields(schemaAction.payload_required, schema);
    if (normalizedActionName === 'create_translation') {
      this.applySchemaTranslationContext(payload, record, schema);
    }

    // Seed defaults from schema definitions.
    if (schema?.properties) {
      for (const [field, definition] of Object.entries(schema.properties)) {
        if (payload[field] === undefined && definition.default !== undefined) {
          payload[field] = definition.default;
        }
      }
    }

    // Generate idempotency_key for send-like actions when required but absent.
    if (
      requiredFields.includes('idempotency_key') &&
      this.isEmptyPayloadValue(payload.idempotency_key)
    ) {
      payload.idempotency_key = this.generateIdempotencyKey(schemaAction.name, String(record.id || ''));
    }

    const missingRequired = requiredFields.filter((field) => this.isEmptyPayloadValue(payload[field]));
    if (missingRequired.length === 0) {
      return payload;
    }

    const promptedValues = await this.promptForPayload(schemaAction, missingRequired, schema, payload, record);
    if (promptedValues === null) {
      return null; // User cancelled
    }

    for (const field of missingRequired) {
      const definition = schema?.properties?.[field];
      const rawValue = promptedValues[field] ?? '';
      const parsed = this.coercePromptValue(rawValue, field, definition);
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      payload[field] = parsed.value;
    }

    return payload;
  }

  /**
   * Prompt user for required payload values
   * Uses the lazy payload modal proxy.
   */
  private async promptForPayload(
    schemaAction: SchemaAction,
    requiredFields: string[],
    schema: PayloadSchema | null,
    payload: Record<string, unknown>,
    record?: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    if (requiredFields.length === 0) {
      return {};
    }

    const fields = requiredFields.map((name) => {
      const definition = schema?.properties?.[name];
      return {
        name,
        label: definition?.title || name,
        description: definition?.description,
        value: this.stringifyDefault(payload[name] ?? definition?.default),
        type: definition?.type || 'string',
        options: this.buildFieldOptions(name, schemaAction.name, definition, record, payload),
      };
    });

    const result = await PayloadInputModal.prompt({
      title: `Complete ${schemaAction.label || schemaAction.name}`,
      fields,
    });

    return result;
  }

  /**
   * Build field options from schema property
   */
  private buildFieldOptions(
    fieldName: string,
    actionName: string,
    prop: PayloadSchemaProperty | undefined,
    record?: Record<string, unknown>,
    payload?: Record<string, unknown>
  ): Array<{ value: string; label: string }> | undefined {
    const createTranslationOptions = this.deriveCreateTranslationLocaleOptions(fieldName, actionName, record, prop, payload);
    if (createTranslationOptions && createTranslationOptions.length > 0) {
      return createTranslationOptions;
    }
    if (!prop) {
      return undefined;
    }
    if (prop.oneOf) {
      return prop.oneOf
        .filter(opt => opt && 'const' in opt)
        .map(opt => ({
          value: this.stringifyDefault(opt.const),
          label: opt.title || this.stringifyDefault(opt.const),
        }));
    }

    if (prop.enum) {
      return prop.enum.map(val => ({
        value: this.stringifyDefault(val),
        label: this.stringifyDefault(val),
      }));
    }

    const extensionOptions = this.buildExtensionFieldOptions(prop);
    if (extensionOptions && extensionOptions.length > 0) {
      return extensionOptions;
    }
    return undefined;
  }

  private buildExtensionFieldOptions(prop: PayloadSchemaProperty): Array<{ value: string; label: string }> | undefined {
    const raw = prop as Record<string, unknown>;
    const candidate =
      raw['x-options'] ??
      raw.x_options ??
      raw.xOptions;
    if (!Array.isArray(candidate) || candidate.length === 0) {
      return undefined;
    }

    const options: Array<{ value: string; label: string }> = [];
    for (const item of candidate) {
      if (typeof item === 'string') {
        const value = this.stringifyDefault(item);
        if (!value) {
          continue;
        }
        options.push({ value, label: value });
        continue;
      }
      if (!item || typeof item !== 'object') {
        continue;
      }
      const candidateValue = (item as Record<string, unknown>).value;
      const value = this.stringifyDefault(candidateValue);
      if (!value) {
        continue;
      }
      const candidateLabel = (item as Record<string, unknown>).label;
      const label = this.stringifyDefault(candidateLabel) || value;
      options.push({ value, label });
    }
    return options.length > 0 ? options : undefined;
  }

  private deriveCreateTranslationLocaleOptions(
    fieldName: string,
    actionName: string,
    record?: Record<string, unknown>,
    prop?: PayloadSchemaProperty,
    payload?: Record<string, unknown>
  ): Array<{ value: string; label: string; description?: string; recommended?: boolean }> | undefined {
    if (fieldName.trim().toLowerCase() !== 'locale') {
      return undefined;
    }
    if (actionName.trim().toLowerCase() !== 'create_translation') {
      return undefined;
    }
    if (!record || typeof record !== 'object') {
      return undefined;
    }

    const readiness = this.asObject(record.translation_readiness);
    const context = payload && typeof payload === 'object'
      ? payload as Record<string, unknown>
      : {};
    let locales = this.asStringArray(context.missing_locales);
    if (locales.length === 0) {
      locales = this.asStringArray(readiness?.missing_required_locales);
    }
    if (locales.length === 0) {
      locales = this.asStringArray((record as Record<string, unknown>).missing_locales);
    }
    if (locales.length === 0 && readiness) {
      const required = this.asStringArray(readiness.required_locales);
      const availableSet = new Set(this.asStringArray(readiness.available_locales));
      locales = required.filter((locale) => !availableSet.has(locale));
    }
    const allowedLocales = this.asStringArray(prop?.enum);
    if (allowedLocales.length > 0) {
      const allowedSet = new Set(allowedLocales);
      locales = locales.filter((locale) => allowedSet.has(locale));
    }
    if (locales.length === 0) {
      return undefined;
    }

    // Extract context for hints
    const recommendedLocale = this.extractStringField(context, 'recommended_locale')
      || this.extractStringField(record, 'recommended_locale')
      || this.extractStringField(readiness || {}, 'recommended_locale');
    const requiredForPublish = this.asStringArray(
      context.required_for_publish
      ?? record.required_for_publish
      ?? readiness?.required_for_publish
      ?? readiness?.required_locales
    );
    const existingLocales = this.asStringArray(
      context.existing_locales
      ?? record.existing_locales
      ?? readiness?.available_locales
    );
    const localizedLabels = this.createTranslationLocaleLabelMap(prop);

    const seen = new Set<string>();
    const options: Array<{ value: string; label: string; description?: string; recommended?: boolean }> = [];
    for (const rawLocale of locales) {
      const locale = rawLocale.trim().toLowerCase();
      if (!locale || seen.has(locale)) {
        continue;
      }
      seen.add(locale);

      const isRecommended = recommendedLocale?.toLowerCase() === locale;
      const isRequiredForPublish = requiredForPublish.includes(locale);

      // Build description hint
      const hints: string[] = [];
      if (isRequiredForPublish) {
        hints.push('Required for publishing');
      }
      if (existingLocales.length > 0) {
        hints.push(`${existingLocales.length} translation${existingLocales.length > 1 ? 's' : ''} exist`);
      }
      const description = hints.length > 0 ? hints.join(' • ') : undefined;

      // Build label with explicit format: "FR - French (recommended)"
      const languageLabel = localizedLabels[locale] || this.localeLabel(locale);
      let label = `${locale.toUpperCase()} - ${languageLabel}`;
      if (isRecommended) {
        label += ' (recommended)';
      }

      options.push({
        value: locale,
        label,
        description,
        recommended: isRecommended,
      });
    }

    // Sort: recommended first, then alphabetically
    options.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return a.value.localeCompare(b.value);
    });

    return options.length > 0 ? options : undefined;
  }

  private applySchemaTranslationContext(
    payload: Record<string, unknown>,
    record: Record<string, unknown>,
    schema: PayloadSchema | null
  ): void {
    if (!schema) {
      return;
    }
    const context = this.extractTranslationContextMap(schema);
    if (Object.keys(context).length === 0) {
      return;
    }
    for (const [targetField, sourcePath] of Object.entries(context)) {
      const target = targetField.trim();
      const source = sourcePath.trim();
      if (!target || !source) {
        continue;
      }
      if (!this.isEmptyPayloadValue(payload[target])) {
        continue;
      }
      const value = this.resolveRecordContextValue(record, source);
      if (value === undefined || value === null) {
        continue;
      }
      payload[target] = this.clonePayloadValue(value);
    }
  }

  private extractTranslationContextMap(schema: PayloadSchema): Record<string, string> {
    const raw = (schema['x-translation-context'] ?? schema.x_translation_context) as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [targetField, sourcePath] of Object.entries(raw)) {
      const target = targetField.trim();
      const source = typeof sourcePath === 'string' ? sourcePath.trim() : '';
      if (!target || !source) {
        continue;
      }
      out[target] = source;
    }
    return out;
  }

  private clonePayloadValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.clonePayloadValue(entry));
    }
    if (value && typeof value === 'object') {
      return { ...(value as Record<string, unknown>) };
    }
    return value;
  }

  private createTranslationLocaleLabelMap(prop?: PayloadSchemaProperty): Record<string, string> {
    const labels: Record<string, string> = {};
    if (!prop) {
      return labels;
    }
    if (Array.isArray(prop.oneOf)) {
      for (const option of prop.oneOf) {
        const value = this.stringifyDefault(option?.const).trim().toLowerCase();
        if (!value) {
          continue;
        }
        const label = this.stringifyDefault(option?.title).trim();
        if (label) {
          labels[value] = label;
        }
      }
    }
    const raw = prop as Record<string, unknown>;
    const candidate = raw['x-options'] ?? raw.x_options ?? raw.xOptions;
    if (Array.isArray(candidate)) {
      for (const option of candidate) {
        if (!option || typeof option !== 'object') {
          continue;
        }
        const value = this.stringifyDefault((option as Record<string, unknown>).value).trim().toLowerCase();
        const label = this.stringifyDefault((option as Record<string, unknown>).label).trim();
        if (value && label) {
          labels[value] = label;
        }
      }
    }
    return labels;
  }

  private extractStringField(record: Record<string, unknown>, field: string): string | null {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    return null;
  }

  private resolveExpectedVersion(record: Record<string, unknown>): number | string | null {
    const candidates: unknown[] = [
      record.expected_version,
      record.expectedVersion,
      record.version,
      record._version,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
        return candidate;
      }
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (!trimmed) {
          continue;
        }
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed) && parsed > 0) {
          return trimmed;
        }
      }
    }
    return null;
  }

  private asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
  }

  private localeLabel(locale: string): string {
    const labels: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
    };
    return labels[locale] || locale.toUpperCase();
  }

  /**
   * Stringify default value for form input
   */
  private stringifyDefault(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '';
      }
    }
    return String(value);
  }

  private normalizePayloadSchema(schema: SchemaAction['payload_schema']): PayloadSchema | null {
    if (!schema || typeof schema !== 'object') {
      return null;
    }

    const propertiesRaw = (schema as Record<string, unknown>).properties;
    let properties: Record<string, PayloadSchemaProperty> | undefined;
    if (propertiesRaw && typeof propertiesRaw === 'object' && !Array.isArray(propertiesRaw)) {
      properties = {};
      for (const [key, value] of Object.entries(propertiesRaw as Record<string, unknown>)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          properties[key] = value as PayloadSchemaProperty;
        }
      }
    }

    const requiredRaw = (schema as Record<string, unknown>).required;
    const required = Array.isArray(requiredRaw)
      ? requiredRaw
        .filter((field): field is string => typeof field === 'string')
        .map((field) => field.trim())
        .filter((field) => field.length > 0)
      : undefined;

    const translationContextRaw = (
      (schema as Record<string, unknown>)['x-translation-context']
      ?? (schema as Record<string, unknown>).x_translation_context
    );
    const translationContext = (
      translationContextRaw
      && typeof translationContextRaw === 'object'
      && !Array.isArray(translationContextRaw)
    )
      ? translationContextRaw as Record<string, unknown>
      : undefined;

    return {
      type: typeof (schema as Record<string, unknown>).type === 'string'
        ? ((schema as Record<string, unknown>).type as string)
        : undefined,
      required,
      properties,
      ...(translationContext ? { 'x-translation-context': translationContext } : {}),
    };
  }

  private collectRequiredFields(
    payloadRequired: SchemaAction['payload_required'],
    schema: PayloadSchema | null
  ): string[] {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const append = (field: string): void => {
      const name = field.trim();
      if (!name || seen.has(name)) {
        return;
      }
      seen.add(name);
      ordered.push(name);
    };

    if (Array.isArray(payloadRequired)) {
      payloadRequired.forEach((field) => append(String(field)));
    }
    if (Array.isArray(schema?.required)) {
      schema.required.forEach((field) => append(String(field)));
    }
    return ordered;
  }

  private isEmptyPayloadValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length === 0;
    }
    return false;
  }

  private generateIdempotencyKey(actionName: string, recordId: string): string {
    const safeAction = actionName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safeRecord = recordId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    return `${safeAction || 'action'}-${safeRecord || 'record'}-${suffix}`;
  }

  private coercePromptValue(
    rawValue: unknown,
    field: string,
    prop: PayloadSchemaProperty | undefined
  ): { value: unknown; error?: string } {
    const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue ?? '').trim();
    const type = typeof prop?.type === 'string' ? prop.type.toLowerCase() : 'string';

    if (value.length === 0) {
      return { value };
    }

    if (type === 'number' || type === 'integer') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        return { value: null, error: `${field} must be a valid number` };
      }
      return { value: type === 'integer' ? Math.trunc(parsed) : parsed };
    }

    if (type === 'boolean') {
      const normalized = value.toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return { value: true };
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return { value: false };
      }
      return { value: null, error: `${field} must be true or false` };
    }

    if (type === 'array' || type === 'object') {
      try {
        return { value: JSON.parse(value) };
      } catch {
        const expected = type === 'array' ? '[...]' : '{...}';
        return { value: null, error: `${field} must be valid JSON (${expected})` };
      }
    }

    return { value };
  }

  private buildActionErrorMessage(actionName: string, error: StructuredError): string {
    return formatStructuredErrorForDisplay(error, `${actionName} failed`);
  }

  /**
   * Build URL query context from locale/channel
   */
  private buildQueryContext(): string {
    const params = new URLSearchParams();
    if (this.config.locale) {
      params.set('locale', this.config.locale);
    }
    const channel = this.getContentChannel();
    if (channel) {
      params.set('channel', channel);
    }
    return params.toString();
  }

  /**
   * Append default actions (view, edit, delete) avoiding duplicates
   */
  private appendDefaultActions(
    actions: ActionButton[],
    record: Record<string, unknown>,
    queryContext: string
  ): void {
    const recordId = String(record.id || '');
    const basePath = this.config.actionBasePath;
    const apiEndpoint = this.config.apiEndpoint;

    const defaults: Array<{ name: string; button: ActionButton }> = [
      {
        name: 'view',
        button: {
          id: 'view',
          label: 'View',
          icon: 'eye',
          variant: 'secondary',
          action: () => {
            let url = `${basePath}/${recordId}`;
            if (queryContext) url += `?${queryContext}`;
            window.location.href = url;
          },
        },
      },
      {
        name: 'edit',
        button: {
          id: 'edit',
          label: 'Edit',
          icon: 'edit',
          variant: 'primary',
          action: () => {
            let url = `${basePath}/${recordId}/edit`;
            if (queryContext) url += `?${queryContext}`;
            window.location.href = url;
          },
        },
      },
      {
        name: 'delete',
        button: this.buildDeleteAction(record, 'Delete', 'danger', 'trash'),
      },
    ];

    for (const def of defaults) {
      if (!this.seenActions.has(def.name)) {
        this.seenActions.add(def.name);
        actions.push(def.button);
      }
    }
  }

  /**
   * Append default actions with ordering metadata
   */
  private appendDefaultActionsOrdered(
    orderedActions: OrderedAction[],
    record: Record<string, unknown>,
    queryContext: string,
    startingIndex: number
  ): void {
    const recordId = String(record.id || '');
    const basePath = this.config.actionBasePath;
    const apiEndpoint = this.config.apiEndpoint;

    const defaults: Array<{ name: string; button: ActionButton }> = [
      {
        name: 'view',
        button: {
          id: 'view',
          label: 'View',
          icon: 'eye',
          variant: 'secondary',
          action: () => {
            let url = `${basePath}/${recordId}`;
            if (queryContext) url += `?${queryContext}`;
            window.location.href = url;
          },
        },
      },
      {
        name: 'edit',
        button: {
          id: 'edit',
          label: 'Edit',
          icon: 'edit',
          variant: 'primary',
          action: () => {
            let url = `${basePath}/${recordId}/edit`;
            if (queryContext) url += `?${queryContext}`;
            window.location.href = url;
          },
        },
      },
      {
        name: 'delete',
        button: this.buildDeleteAction(record, 'Delete', 'danger', 'trash'),
      },
    ];

    let insertionIndex = startingIndex;
    for (const def of defaults) {
      if (!this.seenActions.has(def.name)) {
        this.seenActions.add(def.name);
        orderedActions.push({
          action: def.button,
          name: def.name,
          order: this.resolveActionOrder(def.name, undefined),
          insertionIndex: insertionIndex++,
        });
      }
    }
  }

  /**
   * Get default icon for action by name
   */
  private getDefaultIcon(actionName: string): string | undefined {
    const icons: Record<string, string> = {
      view: 'eye',
      edit: 'edit',
      delete: 'trash',
      publish: 'check-circle',
      unpublish: 'x-circle',
      archive: 'archive',
      restore: 'archive',
      duplicate: 'copy',
      create_translation: 'copy',
      view_family: 'git-branch',
      approve: 'check-circle',
      reject: 'x-circle',
      submit: 'check-circle',
    };
    return icons[actionName.toLowerCase()];
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Build row actions from schema with default configuration
 */
export function buildSchemaRowActions(
  record: Record<string, unknown>,
  schemaActions: SchemaAction[] | undefined,
  config: SchemaActionBuilderConfig
): ActionButton[] {
  const builder = new SchemaActionBuilder(config);
  return builder.buildRowActions(record, schemaActions);
}

/**
 * Extract schema.actions from API response
 */
export function extractSchemaActions(response: {
  schema?: { actions?: SchemaAction[] };
}): SchemaAction[] | undefined {
  return response.schema?.actions;
}
