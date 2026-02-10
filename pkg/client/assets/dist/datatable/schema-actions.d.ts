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
import type { ActionButton } from './actions.js';
import { type StructuredError } from '../toast/error-helpers.js';
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
export declare class SchemaActionBuilder {
    private config;
    private seenActions;
    constructor(config: SchemaActionBuilderConfig);
    /**
     * Build row actions for a record from schema.actions
     *
     * @param record - The data record
     * @param schemaActions - Actions from schema.actions (may be undefined)
     * @returns Array of ActionButton for rendering
     */
    buildRowActions(record: Record<string, unknown>, schemaActions?: SchemaAction[]): ActionButton[];
    /**
     * Build a single action from schema definition
     */
    private buildActionFromSchema;
    /**
     * Check if action is a navigation action
     */
    private isNavigationAction;
    /**
     * Build navigation action (view, edit, etc.)
     */
    private buildNavigationAction;
    /**
     * Build delete action with confirmation
     */
    private buildDeleteAction;
    /**
     * Build POST action for workflow/panel actions
     */
    private buildPostAction;
    /**
     * Build action payload from record and schema
     */
    private buildActionPayload;
    /**
     * Prompt user for required payload values
     * Uses the existing PayloadInputModal from actions.ts
     */
    private promptForPayload;
    /**
     * Build field options from schema property
     */
    private buildFieldOptions;
    /**
     * Stringify default value for form input
     */
    private stringifyDefault;
    /**
     * Build URL query context from locale/environment
     */
    private buildQueryContext;
    /**
     * Append default actions (view, edit, delete) avoiding duplicates
     */
    private appendDefaultActions;
    /**
     * Get default icon for action by name
     */
    private getDefaultIcon;
}
/**
 * Build row actions from schema with default configuration
 */
export declare function buildSchemaRowActions(record: Record<string, unknown>, schemaActions: SchemaAction[] | undefined, config: SchemaActionBuilderConfig): ActionButton[];
/**
 * Extract schema.actions from API response
 */
export declare function extractSchemaActions(response: {
    schema?: {
        actions?: SchemaAction[];
    };
}): SchemaAction[] | undefined;
//# sourceMappingURL=schema-actions.d.ts.map