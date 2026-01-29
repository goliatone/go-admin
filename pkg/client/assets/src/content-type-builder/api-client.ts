/**
 * Content Type API Client
 *
 * Handles all API communication for content type management.
 */

import type {
  ContentType,
  ContentTypeListResponse,
  SchemaValidationRequest,
  SchemaValidationResponse,
  SchemaPreviewRequest,
  SchemaPreviewResponse,
  APIErrorResponse,
  JSONSchema,
  UISchemaOverlay,
  BlockDefinition,
  BlockDefinitionListResponse,
  BlockDefinitionSummary,
  BlockSchemaVersion,
  ContentTypeSchemaVersion,
  CompatibilityCheckResult,
} from './types';

export interface ContentTypeAPIConfig {
  basePath: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

export class ContentTypeAPIError extends Error {
  readonly status: number;
  readonly textCode?: string;
  readonly fields?: Record<string, string>;

  constructor(message: string, status: number, textCode?: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ContentTypeAPIError';
    this.status = status;
    this.textCode = textCode;
    this.fields = fields;
  }
}

export class ContentTypeAPIClient {
  private config: ContentTypeAPIConfig;

  constructor(config: ContentTypeAPIConfig) {
    this.config = {
      basePath: config.basePath.replace(/\/$/, ''),
      headers: config.headers ?? {},
      credentials: config.credentials ?? 'same-origin',
    };
  }

  // ===========================================================================
  // Content Type CRUD
  // ===========================================================================

  /**
   * List all content types
   */
  async list(params?: { page?: number; per_page?: number; search?: string }): Promise<ContentTypeListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.per_page) queryParams.set('per_page', String(params.per_page));
    if (params?.search) queryParams.set('search', params.search);

    const query = queryParams.toString();
    const url = `${this.config.basePath}/api/content_types${query ? `?${query}` : ''}`;

    const response = await this.fetch(url, { method: 'GET' });
    const data = await response.json();

    // Handle both array and paginated response formats
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    if (data.items && Array.isArray(data.items)) {
      return data as ContentTypeListResponse;
    }
    if (data.data && Array.isArray(data.data)) {
      return { items: data.data, total: data.total ?? data.data.length };
    }

    return { items: [], total: 0 };
  }

  /**
   * Get a single content type by ID or slug
   */
  async get(idOrSlug: string): Promise<ContentType> {
    const url = `${this.config.basePath}/api/content_types/${encodeURIComponent(idOrSlug)}`;
    const response = await this.fetch(url, { method: 'GET' });
    const data = await response.json();

    // Handle wrapped and unwrapped response formats
    return data.item ?? data.data ?? data;
  }

  /**
   * Create a new content type
   */
  async create(contentType: Partial<ContentType>): Promise<ContentType> {
    const url = `${this.config.basePath}/api/content_types`;
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(contentType),
    });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Update an existing content type
   */
  async update(idOrSlug: string, contentType: Partial<ContentType>): Promise<ContentType> {
    const url = `${this.config.basePath}/api/content_types/${encodeURIComponent(idOrSlug)}`;
    const response = await this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(contentType),
    });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Delete a content type
   */
  async delete(idOrSlug: string): Promise<void> {
    const url = `${this.config.basePath}/api/content_types/${encodeURIComponent(idOrSlug)}`;
    await this.fetch(url, { method: 'DELETE' });
  }

  // ===========================================================================
  // Content Type Lifecycle (Publish, Clone, Deprecate)
  // ===========================================================================

  /**
   * Publish a content type (change status to active)
   */
  async publish(idOrSlug: string, force?: boolean): Promise<ContentType> {
    const url = `${this.config.basePath}/api/content_types/${encodeURIComponent(idOrSlug)}/publish`;
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify({ force: force ?? false }),
    });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Deprecate a content type
   */
  async deprecate(idOrSlug: string): Promise<ContentType> {
    const url = `${this.config.basePath}/api/content_types/${encodeURIComponent(idOrSlug)}/deprecate`;
    const response = await this.fetch(url, { method: 'POST' });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Clone a content type
   */
  async clone(idOrSlug: string, newSlug: string, newName?: string): Promise<ContentType> {
    const url = `${this.config.basePath}/api/content_types/${encodeURIComponent(idOrSlug)}/clone`;
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify({ slug: newSlug, name: newName }),
    });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Check compatibility between current schema and a new schema
   */
  async checkCompatibility(
    idOrSlug: string,
    newSchema: JSONSchema,
    newUiSchema?: UISchemaOverlay
  ): Promise<CompatibilityCheckResult> {
    const url = `${this.config.basePath}/api/content_types/${encodeURIComponent(idOrSlug)}/compatibility`;
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify({ schema: newSchema, ui_schema: newUiSchema }),
    });
    return await response.json();
  }

  /**
   * Get content type schema version history
   */
  async getVersionHistory(idOrSlug: string): Promise<{ versions: ContentTypeSchemaVersion[] }> {
    const url = `${this.config.basePath}/api/content_types/${encodeURIComponent(idOrSlug)}/versions`;
    try {
      const response = await this.fetch(url, { method: 'GET' });
      const data = await response.json();
      return { versions: data.versions ?? data.items ?? data ?? [] };
    } catch {
      return { versions: [] };
    }
  }

  // ===========================================================================
  // Schema Validation & Preview
  // ===========================================================================

  /**
   * Validate a JSON schema
   */
  async validateSchema(request: SchemaValidationRequest): Promise<SchemaValidationResponse> {
    const url = `${this.config.basePath}/api/content_types/validate`;
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    const data = await response.json();
    return data;
  }

  /**
   * Generate a preview of the schema as a rendered form
   */
  async previewSchema(request: SchemaPreviewRequest): Promise<SchemaPreviewResponse> {
    const url = `${this.config.basePath}/api/content_types/preview`;
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    const data = await response.json();
    return data;
  }

  // ===========================================================================
  // Block Definitions (for blocks field configuration)
  // ===========================================================================

  /**
   * List available block definitions (summary)
   */
  async listBlockDefinitionsSummary(): Promise<BlockDefinitionSummary[]> {
    const url = `${this.config.basePath}/api/block_definitions`;
    try {
      const response = await this.fetch(url, { method: 'GET' });
      const data = await response.json();
      if (Array.isArray(data)) return data;
      if (data.items && Array.isArray(data.items)) return data.items;
      if (data.data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      // Block definitions may not be available
      return [];
    }
  }

  /**
   * List block definitions with full details
   */
  async listBlockDefinitions(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<BlockDefinitionListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.per_page) queryParams.set('per_page', String(params.per_page));
    if (params?.search) queryParams.set('search', params.search);
    if (params?.category) queryParams.set('category', params.category);
    if (params?.status) queryParams.set('status', params.status);

    const query = queryParams.toString();
    const url = `${this.config.basePath}/api/block_definitions${query ? `?${query}` : ''}`;

    try {
      const response = await this.fetch(url, { method: 'GET' });
      const data = await response.json();

      if (Array.isArray(data)) {
        return { items: data, total: data.length };
      }
      if (data.items && Array.isArray(data.items)) {
        return data as BlockDefinitionListResponse;
      }
      if (data.data && Array.isArray(data.data)) {
        return { items: data.data, total: data.total ?? data.data.length };
      }

      return { items: [], total: 0 };
    } catch {
      return { items: [], total: 0 };
    }
  }

  /**
   * Get a single block definition by ID or type
   */
  async getBlockDefinition(idOrType: string): Promise<BlockDefinition> {
    const url = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(idOrType)}`;
    const response = await this.fetch(url, { method: 'GET' });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Create a new block definition
   */
  async createBlockDefinition(block: Partial<BlockDefinition>): Promise<BlockDefinition> {
    const url = `${this.config.basePath}/api/block_definitions`;
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(block),
    });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Update an existing block definition
   */
  async updateBlockDefinition(idOrType: string, block: Partial<BlockDefinition>): Promise<BlockDefinition> {
    const url = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(idOrType)}`;
    const response = await this.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(block),
    });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Delete a block definition
   */
  async deleteBlockDefinition(idOrType: string): Promise<void> {
    const url = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(idOrType)}`;
    await this.fetch(url, { method: 'DELETE' });
  }

  /**
   * Publish a block definition (change status to active)
   */
  async publishBlockDefinition(idOrType: string): Promise<BlockDefinition> {
    const url = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(idOrType)}/publish`;
    const response = await this.fetch(url, { method: 'POST' });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Deprecate a block definition
   */
  async deprecateBlockDefinition(idOrType: string): Promise<BlockDefinition> {
    const url = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(idOrType)}/deprecate`;
    const response = await this.fetch(url, { method: 'POST' });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Clone a block definition
   */
  async cloneBlockDefinition(idOrType: string, newType: string): Promise<BlockDefinition> {
    const url = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(idOrType)}/clone`;
    const response = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify({ type: newType }),
    });
    const data = await response.json();
    return data.item ?? data.data ?? data;
  }

  /**
   * Get block definition schema version history
   */
  async getBlockDefinitionVersions(idOrType: string): Promise<{ versions: BlockSchemaVersion[] }> {
    const url = `${this.config.basePath}/api/block_definitions/${encodeURIComponent(idOrType)}/versions`;
    try {
      const response = await this.fetch(url, { method: 'GET' });
      const data = await response.json();
      return { versions: data.versions ?? data.items ?? data ?? [] };
    } catch {
      return { versions: [] };
    }
  }

  /**
   * Get block categories
   */
  async getBlockCategories(): Promise<string[]> {
    const url = `${this.config.basePath}/api/block_definitions/categories`;
    try {
      const response = await this.fetch(url, { method: 'GET' });
      const data = await response.json();
      return Array.isArray(data) ? data : data.categories ?? [];
    } catch {
      return ['content', 'media', 'layout', 'interactive', 'custom'];
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async fetch(url: string, options: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.config.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: this.config.credentials,
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    return response;
  }

  private async handleError(response: Response): Promise<never> {
    let errorData: APIErrorResponse | null = null;

    try {
      errorData = await response.json();
    } catch {
      // Response may not be JSON
    }

    const message = errorData?.error ?? response.statusText ?? 'Request failed';
    throw new ContentTypeAPIError(message, response.status, errorData?.text_code, errorData?.fields);
  }
}

// ===========================================================================
// Schema Conversion Utilities
// ===========================================================================

import type { FieldDefinition, FieldType } from './types';

/**
 * Convert field definitions to JSON Schema
 */
export function fieldsToSchema(fields: FieldDefinition[], slug?: string): JSONSchema {
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  for (const field of fields) {
    properties[field.name] = fieldToSchemaProperty(field);
    if (field.required) {
      required.push(field.name);
    }
  }

  const schema: JSONSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties,
  };

  if (slug) {
    schema.$id = slug;
  }

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}

/**
 * Convert a single field to a JSON Schema property
 */
function fieldToSchemaProperty(field: FieldDefinition): JSONSchema {
  const schema: JSONSchema = {};

  // Base type mapping
  const typeMapping: Record<FieldType, { type: JSONSchema['type']; format?: string }> = {
    text: { type: 'string' },
    textarea: { type: 'string' },
    'rich-text': { type: 'string' },
    markdown: { type: 'string' },
    code: { type: 'string' },
    number: { type: 'number' },
    integer: { type: 'integer' },
    currency: { type: 'number' },
    percentage: { type: 'number' },
    select: { type: 'string' },
    radio: { type: 'string' },
    checkbox: { type: 'boolean' },
    chips: { type: 'array' },
    toggle: { type: 'boolean' },
    date: { type: 'string', format: 'date' },
    time: { type: 'string', format: 'time' },
    datetime: { type: 'string', format: 'date-time' },
    daterange: { type: 'object' },
    'media-picker': { type: 'string', format: 'uri' },
    'media-gallery': { type: 'array' },
    'file-upload': { type: 'string', format: 'uri' },
    reference: { type: 'string', format: 'uuid' },
    references: { type: 'array' },
    user: { type: 'string', format: 'uuid' },
    group: { type: 'object' },
    repeater: { type: 'array' },
    blocks: { type: 'array' },
    json: { type: 'object' },
    slug: { type: 'string' },
    color: { type: 'string' },
    location: { type: 'object' },
  };

  const mapping = typeMapping[field.type] ?? { type: 'string' };
  schema.type = mapping.type;
  if (mapping.format) {
    schema.format = mapping.format;
  }

  // Title and description
  if (field.label) {
    schema.title = field.label;
  }
  if (field.description) {
    schema.description = field.description;
  }

  // Default value
  if (field.defaultValue !== undefined) {
    schema.default = field.defaultValue;
  }

  // Validation constraints
  if (field.validation) {
    if (field.validation.minLength !== undefined) {
      schema.minLength = field.validation.minLength;
    }
    if (field.validation.maxLength !== undefined) {
      schema.maxLength = field.validation.maxLength;
    }
    if (field.validation.min !== undefined) {
      schema.minimum = field.validation.min;
    }
    if (field.validation.max !== undefined) {
      schema.maximum = field.validation.max;
    }
    if (field.validation.pattern) {
      schema.pattern = field.validation.pattern;
    }
  }

  // x-formgen extension
  const formgen: Record<string, unknown> = {};
  const widget = fieldTypeToWidget(field.type);
  if (widget) {
    formgen.widget = widget;
  }
  if (field.placeholder) {
    formgen.placeholder = field.placeholder;
  }
  if (field.helpText) {
    formgen.helpText = field.helpText;
  }
  if (field.section) {
    formgen.section = field.section;
  }
  if (field.order !== undefined) {
    formgen.order = field.order;
  }
  if (field.gridSpan !== undefined) {
    formgen.grid = { span: field.gridSpan };
  }
  if (field.readonly) {
    formgen.readonly = true;
  }
  if (field.hidden) {
    formgen.hidden = true;
  }

  if (Object.keys(formgen).length > 0) {
    schema['x-formgen'] = formgen as FormgenExtension;
  }

  // Type-specific handling
  switch (field.type) {
    case 'select':
    case 'radio':
      if (field.config && 'options' in field.config && field.config.options) {
        schema.enum = field.config.options.map((opt) => opt.value);
      }
      break;

    case 'chips':
      schema.items = { type: 'string' };
      if (field.config && 'options' in field.config && field.config.options) {
        schema.items.enum = field.config.options.map((opt) => opt.value);
      }
      break;

    case 'media-gallery':
    case 'references':
      schema.items = { type: 'string', format: 'uri' };
      break;

    case 'repeater':
      if (field.config && 'fields' in field.config && field.config.fields) {
        schema.items = fieldsToSchema(field.config.fields);
      }
      break;

    case 'blocks': {
      // Blocks use oneOf with _type discriminator pattern
      const blocksConfig = field.config as import('./types').BlocksFieldConfig | undefined;

      // Build the items schema with oneOf and discriminator
      const itemsSchema: JSONSchema = {
        type: 'object',
        properties: {
          _type: {
            type: 'string',
            description: 'Block type discriminator',
          },
          _schema: {
            type: 'string',
            description: 'Block schema version',
          },
        },
        required: ['_type'],
      };

      // If we have allowed blocks, create oneOf with explicit types
      if (blocksConfig?.allowedBlocks && blocksConfig.allowedBlocks.length > 0) {
        itemsSchema.oneOf = blocksConfig.allowedBlocks.map((blockType) => ({
          type: 'object' as const,
          properties: {
            _type: { const: blockType },
          },
          required: ['_type'],
        }));
        // Add discriminator metadata
        itemsSchema['x-discriminator'] = '_type';
      }

      schema.items = itemsSchema;

      // Add min/max constraints
      if (blocksConfig?.minBlocks !== undefined) {
        schema.minItems = blocksConfig.minBlocks;
      }
      if (blocksConfig?.maxBlocks !== undefined) {
        schema.maxItems = blocksConfig.maxBlocks;
      }

      // Build x-formgen with blocks configuration
      const blocksFormgen: Record<string, unknown> = {
        ...formgen,
        widget: 'block',
        sortable: true,
      };
      if (blocksConfig?.allowedBlocks) {
        blocksFormgen.allowedBlocks = blocksConfig.allowedBlocks;
      }
      if (blocksConfig?.deniedBlocks) {
        blocksFormgen.deniedBlocks = blocksConfig.deniedBlocks;
      }
      schema['x-formgen'] = blocksFormgen as FormgenExtension;
      break;
    }
  }

  return schema;
}

/**
 * Map field type to widget name
 */
function fieldTypeToWidget(fieldType: FieldType): string | undefined {
  const widgetMap: Partial<Record<FieldType, string>> = {
    textarea: 'textarea',
    'rich-text': 'rich-text',
    markdown: 'markdown',
    code: 'code-editor',
    toggle: 'toggle',
    chips: 'chips',
    'media-picker': 'media-picker',
    'media-gallery': 'media-picker',
    'file-upload': 'file-upload',
    blocks: 'block',
    json: 'json-editor',
    slug: 'slug',
    color: 'color',
  };
  return widgetMap[fieldType];
}

/**
 * Convert JSON Schema to field definitions
 */
export function schemaToFields(schema: JSONSchema): FieldDefinition[] {
  if (!schema.properties) {
    return [];
  }

  const required = new Set(schema.required ?? []);
  const fields: FieldDefinition[] = [];

  for (const [name, propSchema] of Object.entries(schema.properties)) {
    fields.push(schemaPropertyToField(name, propSchema, required.has(name)));
  }

  // Sort by x-formgen.order if present
  fields.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return fields;
}

/**
 * Convert a JSON Schema property to a field definition
 */
function schemaPropertyToField(name: string, schema: JSONSchema, isRequired: boolean): FieldDefinition {
  const formgen = schema['x-formgen'] as FormgenExtension | undefined;

  const field: FieldDefinition = {
    id: generateFieldId(),
    name,
    type: schemaToFieldType(schema),
    label: schema.title ?? titleCase(name),
    description: schema.description,
    placeholder: formgen?.placeholder,
    helpText: formgen?.helpText,
    required: isRequired,
    readonly: formgen?.readonly,
    hidden: formgen?.hidden,
    defaultValue: schema.default,
    section: formgen?.section,
    gridSpan: formgen?.grid?.span,
    order: formgen?.order,
  };

  // Validation
  const validation: FieldDefinition['validation'] = {};
  if (schema.minLength !== undefined) validation.minLength = schema.minLength;
  if (schema.maxLength !== undefined) validation.maxLength = schema.maxLength;
  if (schema.minimum !== undefined) validation.min = schema.minimum;
  if (schema.maximum !== undefined) validation.max = schema.maximum;
  if (schema.pattern) validation.pattern = schema.pattern;
  if (Object.keys(validation).length > 0) {
    field.validation = validation;
  }

  // Enum options
  if (schema.enum && Array.isArray(schema.enum)) {
    field.config = {
      options: schema.enum.map((value) => ({
        value: String(value),
        label: titleCase(String(value)),
      })),
    };
  }

  // Blocks configuration
  if (field.type === 'blocks' && schema.type === 'array') {
    const blocksConfig: import('./types').BlocksFieldConfig = {};

    // Extract min/max from schema
    if (schema.minItems !== undefined) {
      blocksConfig.minBlocks = schema.minItems;
    }
    if (schema.maxItems !== undefined) {
      blocksConfig.maxBlocks = schema.maxItems;
    }

    // Extract allowed blocks from x-formgen or oneOf
    if (formgen?.allowedBlocks && Array.isArray(formgen.allowedBlocks)) {
      blocksConfig.allowedBlocks = formgen.allowedBlocks as string[];
    } else if (schema.items) {
      const itemsSchema = schema.items as JSONSchema;
      if (itemsSchema.oneOf && Array.isArray(itemsSchema.oneOf)) {
        // Extract allowed block types from oneOf const values
        const allowedTypes = itemsSchema.oneOf
          .map((subSchema) => {
            const typeSchema = subSchema as JSONSchema;
            const typeProp = typeSchema.properties?._type as JSONSchema | undefined;
            return typeProp?.const as string | undefined;
          })
          .filter((t): t is string => !!t);
        if (allowedTypes.length > 0) {
          blocksConfig.allowedBlocks = allowedTypes;
        }
      }
    }

    // Extract denied blocks from x-formgen
    if (formgen?.deniedBlocks && Array.isArray(formgen.deniedBlocks)) {
      blocksConfig.deniedBlocks = formgen.deniedBlocks as string[];
    }

    if (Object.keys(blocksConfig).length > 0) {
      field.config = blocksConfig;
    }
  }

  return field;
}

/**
 * Infer field type from JSON Schema property
 */
function schemaToFieldType(schema: JSONSchema): FieldType {
  const formgen = schema['x-formgen'] as FormgenExtension | undefined;

  // Check explicit widget
  if (formgen?.widget) {
    const widgetToType: Record<string, FieldType> = {
      textarea: 'textarea',
      'rich-text': 'rich-text',
      markdown: 'markdown',
      'code-editor': 'code',
      toggle: 'toggle',
      chips: 'chips',
      'media-picker': 'media-picker',
      'file-upload': 'file-upload',
      block: 'blocks',
      'json-editor': 'json',
      slug: 'slug',
      color: 'color',
    };
    if (widgetToType[formgen.widget]) {
      return widgetToType[formgen.widget];
    }
  }

  // Infer from type + format
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (type) {
    case 'string':
      if (schema.format === 'date-time') return 'datetime';
      if (schema.format === 'date') return 'date';
      if (schema.format === 'time') return 'time';
      if (schema.format === 'uri') return 'media-picker';
      if (schema.format === 'uuid') return 'reference';
      if (schema.enum) return 'select';
      return 'text';

    case 'number':
      return 'number';

    case 'integer':
      return 'integer';

    case 'boolean':
      return 'toggle';

    case 'array':
      if (schema.items) {
        const itemsSchema = schema.items as JSONSchema;
        if (itemsSchema.oneOf) return 'blocks';
        if (itemsSchema.enum) return 'chips';
      }
      return 'repeater';

    case 'object':
      return 'json';

    default:
      return 'text';
  }
}

/**
 * Generate a unique field ID
 */
export function generateFieldId(): string {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Convert string to title case
 */
function titleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

import type { FormgenExtension } from './types';
