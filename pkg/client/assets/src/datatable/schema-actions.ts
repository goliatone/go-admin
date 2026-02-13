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

import type { ActionButton, ActionVariant } from './actions.js';
import {
  executeActionRequest,
  formatStructuredErrorForDisplay,
  extractTranslationBlocker,
  isTranslationBlocker,
  type StructuredError,
} from '../toast/error-helpers.js';

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
}

export interface ActionState {
  enabled?: boolean;
  reason?: string;
  reason_code?: string;
  available_transitions?: string[];
}

/**
 * Payload schema for actions requiring input
 */
export interface PayloadSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, PayloadSchemaProperty>;
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
  /** Base path for action API endpoint (e.g., /admin/api/pages) */
  apiEndpoint: string;
  /** Base path for navigation actions (e.g., /admin/content/pages) */
  actionBasePath: string;
  /** Current locale context (passed to action payloads) */
  locale?: string;
  /** Current environment context (passed to action payloads) */
  environment?: string;
  /** Panel/entity name (e.g., 'pages') */
  panelName?: string;
  /** Callback for handling translation blockers */
  onTranslationBlocker?: (info: TranslationBlockerContext) => void;
  /** Callback after successful action execution */
  onActionSuccess?: (actionName: string, result: ActionResult) => void;
  /** Callback after action error */
  onActionError?: (actionName: string, error: StructuredError) => void;
  /** Whether to use default actions as fallback (default: true) */
  useDefaultFallback?: boolean;
  /** Explicit compatibility mode: append defaults even with schema actions */
  appendDefaultActions?: boolean;
  /** Action rendering context (DataGrid row actions use 'row') */
  actionContext?: 'row' | 'detail' | 'bulk';
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
  environment: string | null;
  retry?: () => Promise<ActionResult>;
}

// ============================================================================
// Schema Action Builder
// ============================================================================

/**
 * Builds row actions from schema.actions with proper precedence and deduplication.
 *
 * Rules:
 * 1. Navigation actions (view, edit): build navigation URLs
 * 2. Delete action: existing delete flow
 * 3. All other schema actions: POST to /admin/api/{panel}/actions/{action.name}
 * 4. Duplicate prevention by action name
 * 5. Schema actions take precedence over defaults
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

  /**
   * Build row actions for a record from schema.actions
   *
   * @param record - The data record
   * @param schemaActions - Actions from schema.actions (may be undefined)
   * @returns Array of ActionButton for rendering
   */
  buildRowActions(record: Record<string, unknown>, schemaActions?: SchemaAction[]): ActionButton[] {
    this.seenActions.clear();
    const actions: ActionButton[] = [];

    // Build URL query context
    const queryContext = this.buildQueryContext();

    // If schema actions exist, use them as authoritative source
    if (Array.isArray(schemaActions) && schemaActions.length > 0) {
      for (const schemaAction of schemaActions) {
        if (!schemaAction.name) continue;
        if (!this.shouldIncludeAction(record, schemaAction)) continue;

        // Skip duplicates
        const actionKey = schemaAction.name.toLowerCase();
        if (this.seenActions.has(actionKey)) continue;
        this.seenActions.add(actionKey);

        const actionState = this.resolveRecordActionState(record, schemaAction.name);
        const actionButton = this.buildActionFromSchema(record, schemaAction, queryContext, actionState);
        if (actionButton) {
          actions.push(actionButton);
        }
      }

      // Only append defaults if explicitly requested (compatibility mode)
      if (this.config.appendDefaultActions) {
        this.appendDefaultActions(actions, record, queryContext);
      }
    } else if (this.config.useDefaultFallback) {
      // No schema actions - use defaults as fallback
      this.appendDefaultActions(actions, record, queryContext);
    }

    return actions;
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

  private shouldIncludeAction(record: Record<string, unknown>, schemaAction: SchemaAction): boolean {
    if (!this.matchesActionScope(schemaAction.scope)) {
      return false;
    }

    const requiredContext = Array.isArray(schemaAction.context_required)
      ? schemaAction.context_required
      : [];
    if (requiredContext.length === 0) {
      return true;
    }

    for (const rawField of requiredContext) {
      const field = typeof rawField === 'string' ? rawField.trim() : '';
      if (!field) continue;
      const value = this.resolveRecordContextValue(record, field);
      if (this.isEmptyPayloadValue(value)) {
        return false;
      }
    }
    return true;
  }

  private resolveRecordActionState(record: Record<string, unknown>, actionName: string): ActionState | null {
    const rawState = record['_action_state'];
    if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
      return null;
    }
    const perAction = (rawState as Record<string, unknown>)[actionName];
    if (!perAction || typeof perAction !== 'object' || Array.isArray(perAction)) {
      return null;
    }
    return perAction as ActionState;
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
    };
  }

  private disabledReason(state: ActionState): string {
    const reason = typeof state.reason === 'string' ? state.reason.trim() : '';
    if (reason) {
      return reason;
    }
    const code = typeof state.reason_code === 'string' ? state.reason_code.trim().toLowerCase() : '';
    switch (code) {
      case 'workflow_transition_not_available':
        return 'Action is not available in the current workflow state.';
      case 'permission_denied':
        return 'You do not have permission to execute this action.';
      case 'missing_context_required':
        return 'Action is unavailable because required record context is missing.';
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
      // Use explicit href pattern, replacing {id} placeholder
      targetUrl = schemaAction.href.replace('{id}', recordId);
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
      label,
      icon: icon || this.getDefaultIcon(schemaAction.name),
      variant,
      action: () => {
        window.location.href = targetUrl;
      },
    };
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
      label,
      icon: icon || 'trash',
      variant: variant === 'secondary' ? 'danger' : variant,
      action: async () => {
        const confirmed = window.confirm(`Are you sure you want to delete this item?`);
        if (!confirmed) return;

        const response = await fetch(`${endpoint}/${recordId}`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Delete failed');
        }
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
      this.config.onActionSuccess?.(input.actionName, result);
      return result;
    }

    if (!result.error) {
      return result;
    }

    // Translation blockers require a modal-first remediation flow with retry support.
    if (isTranslationBlocker(result.error)) {
      const blockerInfo = extractTranslationBlocker(result.error);
      if (blockerInfo && this.config.onTranslationBlocker) {
        const retryPayload = { ...input.payload };
        this.config.onTranslationBlocker({
          actionName: input.actionName,
          recordId: input.recordId,
          ...blockerInfo,
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

    const formattedMessage = this.buildActionErrorMessage(input.actionName, result.error);
    this.config.onActionError?.(input.actionName, {
      ...result.error,
      message: formattedMessage,
    });
    throw new Error(formattedMessage);
  }

  /**
   * Build action payload from record and schema
   */
  private async buildActionPayload(
    record: Record<string, unknown>,
    schemaAction: SchemaAction
  ): Promise<Record<string, unknown> | null> {
    const payload: Record<string, unknown> = {
      id: record.id,
    };

    // Add locale/environment context
    if (this.config.locale) {
      payload.locale = this.config.locale;
    }
    if (this.config.environment) {
      payload.environment = this.config.environment;
    }
    if (this.config.panelName) {
      payload.policy_entity = this.config.panelName;
    }

    const schema = this.normalizePayloadSchema(schemaAction.payload_schema);
    const requiredFields = this.collectRequiredFields(schemaAction.payload_required, schema);

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
   * Uses the existing PayloadInputModal from actions.ts
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
    // Import dynamically to avoid circular dependencies
    const { PayloadInputModal } = await import('./payload-modal.js');

    const fields = requiredFields.map((name) => {
      const definition = schema?.properties?.[name];
      return {
        name,
        label: definition?.title || name,
        description: definition?.description,
        value: this.stringifyDefault(payload[name] ?? definition?.default),
        type: definition?.type || 'string',
        options: this.buildFieldOptions(name, schemaAction.name, definition, record),
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
    record?: Record<string, unknown>
  ): Array<{ value: string; label: string }> | undefined {
    if (!prop) {
      return this.deriveCreateTranslationLocaleOptions(fieldName, actionName, record);
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

    return this.deriveCreateTranslationLocaleOptions(fieldName, actionName, record);
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
    record?: Record<string, unknown>
  ): Array<{ value: string; label: string }> | undefined {
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
    let locales = this.asStringArray(readiness?.missing_required_locales);
    if (locales.length === 0) {
      locales = this.asStringArray((record as Record<string, unknown>).missing_locales);
    }
    if (locales.length === 0 && readiness) {
      const required = this.asStringArray(readiness.required_locales);
      const availableSet = new Set(this.asStringArray(readiness.available_locales));
      locales = required.filter((locale) => !availableSet.has(locale));
    }
    if (locales.length === 0) {
      return undefined;
    }

    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];
    for (const rawLocale of locales) {
      const locale = rawLocale.trim().toLowerCase();
      if (!locale || seen.has(locale)) {
        continue;
      }
      seen.add(locale);
      options.push({
        value: locale,
        label: this.localeLabel(locale),
      });
    }
    return options.length > 0 ? options : undefined;
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

    return {
      type: typeof (schema as Record<string, unknown>).type === 'string'
        ? ((schema as Record<string, unknown>).type as string)
        : undefined,
      required,
      properties,
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
   * Build URL query context from locale/environment
   */
  private buildQueryContext(): string {
    const params = new URLSearchParams();
    if (this.config.locale) {
      params.set('locale', this.config.locale);
    }
    if (this.config.environment) {
      params.set('env', this.config.environment);
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
        button: {
          label: 'Delete',
          icon: 'trash',
          variant: 'danger',
          action: async () => {
            if (!window.confirm('Are you sure you want to delete this item?')) return;
            const response = await fetch(`${apiEndpoint}/${recordId}`, {
              method: 'DELETE',
              headers: { 'Accept': 'application/json' },
            });
            if (!response.ok) {
              throw new Error('Delete failed');
            }
          },
        },
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
