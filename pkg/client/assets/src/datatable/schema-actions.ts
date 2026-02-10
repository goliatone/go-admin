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
  /** Whether payload is required */
  payload_required?: boolean;
  /** JSON Schema for payload */
  payload_schema?: PayloadSchema;
  /** Action type hint (navigation vs POST) */
  type?: 'navigation' | 'action';
  /** Target URL pattern for navigation actions */
  href?: string;
  /** Permission required for this action */
  permission?: string;
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

        // Skip duplicates
        if (this.seenActions.has(schemaAction.name)) continue;
        this.seenActions.add(schemaAction.name);

        const actionButton = this.buildActionFromSchema(record, schemaAction, queryContext);
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
    queryContext: string
  ): ActionButton | null {
    const actionName = schemaAction.name;
    const label = schemaAction.label || schemaAction.label_key || actionName;
    const variant = (schemaAction.variant || 'secondary') as ActionVariant;
    const icon = schemaAction.icon;

    // Determine action type based on name or explicit type hint
    const isNavigationAction = this.isNavigationAction(schemaAction);
    const isDeleteAction = actionName === 'delete';

    if (isNavigationAction) {
      return this.buildNavigationAction(record, schemaAction, label, variant, icon, queryContext);
    }

    if (isDeleteAction) {
      return this.buildDeleteAction(record, label, variant, icon);
    }

    // All other actions: POST to panel action endpoint
    return this.buildPostAction(record, schemaAction, label, variant, icon);
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

        // Execute action
        const result = await executeActionRequest(endpoint, payload);

        if (result.success) {
          this.config.onActionSuccess?.(actionName, result);
        } else if (result.error) {
          // Check for translation blocker
          if (isTranslationBlocker(result.error)) {
            const blockerInfo = extractTranslationBlocker(result.error);
            if (blockerInfo && this.config.onTranslationBlocker) {
              this.config.onTranslationBlocker({
                actionName,
                recordId,
                ...blockerInfo,
              });
              return;
            }
          }

          this.config.onActionError?.(actionName, result.error);
          throw new Error(result.error.message);
        }
      },
    };
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

    // If payload is required, we need to prompt for values
    if (schemaAction.payload_required && schemaAction.payload_schema) {
      const promptedValues = await this.promptForPayload(schemaAction);
      if (promptedValues === null) {
        return null; // User cancelled
      }
      Object.assign(payload, promptedValues);
    }

    return payload;
  }

  /**
   * Prompt user for required payload values
   * Uses the existing PayloadInputModal from actions.ts
   */
  private async promptForPayload(schemaAction: SchemaAction): Promise<Record<string, unknown> | null> {
    const schema = schemaAction.payload_schema;
    if (!schema?.properties) {
      return {};
    }

    // Import dynamically to avoid circular dependencies
    const { PayloadInputModal } = await import('./payload-modal.js');

    const required = schema.required || [];
    const fields = Object.entries(schema.properties).map(([name, prop]) => ({
      name,
      label: prop.title || name,
      description: prop.description,
      value: this.stringifyDefault(prop.default),
      type: prop.type || 'string',
      options: this.buildFieldOptions(prop),
    }));

    const result = await PayloadInputModal.prompt({
      title: `Complete ${schemaAction.label || schemaAction.name}`,
      fields: fields.filter(f => required.includes(f.name)),
    });

    return result;
  }

  /**
   * Build field options from schema property
   */
  private buildFieldOptions(prop: PayloadSchemaProperty): Array<{ value: string; label: string }> | undefined {
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

    return undefined;
  }

  /**
   * Stringify default value for form input
   */
  private stringifyDefault(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    return String(value);
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
