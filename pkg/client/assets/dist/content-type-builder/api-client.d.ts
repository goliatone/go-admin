/**
 * Content Type API Client
 *
 * Handles all API communication for content type management.
 */
import type { ContentType, ContentTypeListResponse, SchemaValidationRequest, SchemaValidationResponse, SchemaPreviewRequest, SchemaPreviewResponse, JSONSchema, UISchemaOverlay, BlockDefinition, BlockDefinitionListResponse, BlockDefinitionSummary, BlockSchemaVersion, ContentTypeSchemaVersion, CompatibilityCheckResult, FieldTypeMetadata } from './types';
import type { BackendFieldTypeCategoryGroup } from './block-field-type-registry';
export interface ContentTypeAPIConfig {
    basePath: string;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
}
export declare class ContentTypeAPIError extends Error {
    readonly status: number;
    readonly textCode?: string;
    readonly fields?: Record<string, string>;
    constructor(message: string, status: number, textCode?: string, fields?: Record<string, string>);
}
export declare class ContentTypeAPIClient {
    private config;
    private environment;
    constructor(config: ContentTypeAPIConfig);
    /** Set the active environment for all subsequent API requests (Phase 12 — Task 12.3) */
    setEnvironment(env: string): void;
    /** Get the current environment */
    getEnvironment(): string;
    /** Persist environment selection to the server session (Phase 12) */
    setEnvironmentSession(env: string): Promise<void>;
    /**
     * List all content types
     */
    list(params?: {
        page?: number;
        per_page?: number;
        search?: string;
    }): Promise<ContentTypeListResponse>;
    /**
     * Get a single content type by ID or slug
     */
    get(idOrSlug: string): Promise<ContentType>;
    /**
     * Create a new content type
     */
    create(contentType: Partial<ContentType>): Promise<ContentType>;
    /**
     * Update an existing content type
     */
    update(idOrSlug: string, contentType: Partial<ContentType>): Promise<ContentType>;
    /**
     * Delete a content type
     */
    delete(idOrSlug: string): Promise<void>;
    /**
     * Publish a content type (change status to active)
     */
    publish(idOrSlug: string, force?: boolean): Promise<ContentType>;
    /**
     * Deprecate a content type
     */
    deprecate(idOrSlug: string): Promise<ContentType>;
    /**
     * Clone a content type
     */
    clone(idOrSlug: string, newSlug: string, newName?: string): Promise<ContentType>;
    /**
     * Check compatibility between current schema and a new schema
     */
    checkCompatibility(idOrSlug: string, newSchema: JSONSchema, newUiSchema?: UISchemaOverlay): Promise<CompatibilityCheckResult>;
    /**
     * Get content type schema version history
     */
    getVersionHistory(idOrSlug: string): Promise<{
        versions: ContentTypeSchemaVersion[];
    }>;
    /**
     * Validate a JSON schema
     */
    validateSchema(request: SchemaValidationRequest): Promise<SchemaValidationResponse>;
    /**
     * Generate a preview of the schema as a rendered form
     */
    previewSchema(request: SchemaPreviewRequest): Promise<SchemaPreviewResponse>;
    /**
     * List available block definitions (summary)
     */
    listBlockDefinitionsSummary(): Promise<BlockDefinitionSummary[]>;
    /**
     * List block definitions with full details
     */
    listBlockDefinitions(params?: {
        page?: number;
        per_page?: number;
        search?: string;
        category?: string;
        status?: string;
    }): Promise<BlockDefinitionListResponse>;
    /**
     * Get a single block definition by ID or type
     */
    getBlockDefinition(idOrType: string): Promise<BlockDefinition>;
    /**
     * Create a new block definition
     */
    createBlockDefinition(block: Partial<BlockDefinition>): Promise<BlockDefinition>;
    /**
     * Update an existing block definition
     */
    updateBlockDefinition(idOrType: string, block: Partial<BlockDefinition>): Promise<BlockDefinition>;
    /**
     * Delete a block definition
     */
    deleteBlockDefinition(idOrType: string): Promise<void>;
    /**
     * Publish a block definition (change status to active)
     */
    publishBlockDefinition(idOrType: string): Promise<BlockDefinition>;
    /**
     * Deprecate a block definition
     */
    deprecateBlockDefinition(idOrType: string): Promise<BlockDefinition>;
    /**
     * Clone a block definition
     */
    cloneBlockDefinition(idOrType: string, newType: string, newSlug?: string): Promise<BlockDefinition>;
    /**
     * Get block definition schema version history
     */
    getBlockDefinitionVersions(idOrType: string): Promise<{
        versions: BlockSchemaVersion[];
    }>;
    /**
     * Get block categories
     */
    getBlockCategories(): Promise<string[]>;
    /**
     * Fetch field types from the backend registry.
     * Falls back to null if the endpoint is not available (Phase 3 not deployed).
     */
    getFieldTypes(): Promise<FieldTypeMetadata[] | null>;
    /**
     * Fetch grouped field types from the backend registry.
     * Returns null when the endpoint does not expose grouped categories.
     */
    getBlockFieldTypeGroups(): Promise<BackendFieldTypeCategoryGroup[] | null>;
    private fetch;
    private handleError;
}
import type { FieldDefinition } from './types';
/**
 * Convert field definitions to JSON Schema
 */
export declare function fieldsToSchema(fields: FieldDefinition[], slug?: string): JSONSchema;
/**
 * Convert field definitions to a block definition schema
 */
export declare function fieldsToBlockSchema(fields: FieldDefinition[], slug?: string): JSONSchema;
/**
 * Convert JSON Schema to field definitions
 */
export declare function schemaToFields(schema: JSONSchema): FieldDefinition[];
/**
 * Generate a unique field ID
 */
export declare function generateFieldId(): string;
//# sourceMappingURL=api-client.d.ts.map