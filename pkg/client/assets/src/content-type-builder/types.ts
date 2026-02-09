/**
 * Content Type Builder Types
 *
 * Type definitions for the Content Type Builder UI module.
 */

// =============================================================================
// Content Type Definitions
// =============================================================================

export interface ContentType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  schema: JSONSchema;
  ui_schema?: UISchemaOverlay;
  capabilities?: ContentTypeCapabilities;
  schema_version?: string;
  status?: ContentTypeStatus;
  created_at?: string;
  updated_at?: string;
}

export type ContentTypeStatus = 'draft' | 'active' | 'deprecated' | 'published';

export interface ContentTypeCapabilities {
  versioning?: boolean;
  scheduling?: boolean;
  seo?: boolean;
  localization?: boolean;
  blocks?: boolean;
  [key: string]: ContentTypeCapabilityValue | undefined;
}

export type ContentTypeCapabilityValue =
  | boolean
  | string
  | number
  | null
  | ContentTypeCapabilityObject
  | ContentTypeCapabilityValue[];

export interface ContentTypeCapabilityObject {
  [key: string]: ContentTypeCapabilityValue | undefined;
}

// =============================================================================
// JSON Schema Types (Draft 2020-12 subset)
// =============================================================================

export interface JSONSchema {
  $schema?: string;
  $id?: string;
  $defs?: Record<string, JSONSchema>;
  type?: JSONSchemaType | JSONSchemaType[];
  title?: string;
  description?: string;
  default?: unknown;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  enum?: unknown[];
  const?: unknown;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  additionalProperties?: boolean | JSONSchema;
  // UI extensions
  'x-formgen'?: FormgenExtension;
  'x-admin'?: AdminExtension;
  [key: string]: unknown;
}

export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';

export interface FormgenExtension {
  widget?: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  section?: string;
  order?: number;
  grid?: { span?: number; offset?: number };
  readonly?: boolean;
  hidden?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  collapsed?: boolean;
  icon?: string;
  [key: string]: unknown;
}

export interface AdminExtension {
  group?: string;
  tags?: string[];
  filterable?: boolean;
  sortable?: boolean;
  searchable?: boolean;
  [key: string]: unknown;
}

// =============================================================================
// UI Schema Overlay
// =============================================================================

export interface UISchemaOverlay {
  $schema?: string;
  layout?: UILayoutConfig;
  overrides?: UIOverride[];
  conditionalFields?: ConditionalField[];
}

export interface UILayoutConfig {
  type?: 'tabs' | 'sections' | 'flat';
  tabs?: UITab[];
  gridColumns?: number;
}

export interface UITab {
  id: string;
  label: string;
  order?: number;
  icon?: string;
}

export interface UIOverride {
  path: string;
  'x-formgen'?: FormgenExtension;
  'x-admin'?: AdminExtension;
}

export interface ConditionalField {
  field: string;
  condition: Record<string, unknown>;
}

// =============================================================================
// Field Definition (Builder UI)
// =============================================================================

export interface FieldDefinition {
  id: string; // Unique ID for drag/drop
  name: string; // JSON property key
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  readonly?: boolean;
  hidden?: boolean;
  filterable?: boolean;
  defaultValue?: unknown;
  // Validation
  validation?: FieldValidation;
  // Appearance
  section?: string;
  gridSpan?: number;
  order?: number;
  // Type-specific config
  config?: FieldTypeConfig;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'rich-text'
  | 'markdown'
  | 'code'
  | 'number'
  | 'integer'
  | 'currency'
  | 'percentage'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'chips'
  | 'toggle'
  | 'date'
  | 'time'
  | 'datetime'
  | 'daterange'
  | 'media-picker'
  | 'media-gallery'
  | 'file-upload'
  | 'reference'
  | 'references'
  | 'user'
  | 'group'
  | 'repeater'
  | 'blocks'
  | 'json'
  | 'slug'
  | 'color'
  | 'location';

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customValidator?: string;
}

export type FieldTypeConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | SelectFieldConfig
  | MediaFieldConfig
  | ReferenceFieldConfig
  | RepeaterFieldConfig
  | BlocksFieldConfig
  | CodeFieldConfig
  | SlugFieldConfig
  | ColorFieldConfig
  | LocationFieldConfig
  | DateRangeFieldConfig;

export interface TextFieldConfig {
  multiline?: boolean;
  rows?: number;
}

export interface NumberFieldConfig {
  step?: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
}

export interface SelectFieldConfig {
  options?: SelectOption[];
  multiple?: boolean;
  allowCreate?: boolean;
  endpoint?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface MediaFieldConfig {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

export interface ReferenceFieldConfig {
  target: string;
  displayField?: string;
  searchFields?: string[];
  multiple?: boolean;
}

export interface RepeaterFieldConfig {
  fields: FieldDefinition[];
  minItems?: number;
  maxItems?: number;
  collapsed?: boolean;
}

export interface BlocksFieldConfig {
  allowedBlocks?: string[];
  deniedBlocks?: string[];
  minBlocks?: number;
  maxBlocks?: number;
  // Internal round-trip metadata used by the builder to preserve source schema shape.
  __sourceItemsSchema?: JSONSchema;
  __sourceAllowedBlocks?: string[];
  __sourceDeniedBlocks?: string[];
  __sourceRefPrefix?: string;
  __sourceRepresentation?: 'refs' | 'inline';
  __sourceWidget?: string;
  __sourceSortable?: boolean;
  __sourceHadAllowedBlocks?: boolean;
  __sourceHadDeniedBlocks?: boolean;
}

export interface CodeFieldConfig {
  language?: string;
  lineNumbers?: boolean;
}

export interface SlugFieldConfig {
  sourceField?: string; // Field to generate slug from
  prefix?: string;
  suffix?: string;
  separator?: string;
}

export interface ColorFieldConfig {
  format?: 'hex' | 'rgb' | 'hsl';
  presets?: string[];
  allowAlpha?: boolean;
}

export interface LocationFieldConfig {
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  searchEnabled?: boolean;
}

export interface DateRangeFieldConfig {
  minDate?: string;
  maxDate?: string;
  allowSameDay?: boolean;
}

// =============================================================================
// Field Type Metadata (for FieldTypePicker)
// =============================================================================

export interface FieldTypeMetadata {
  type: FieldType;
  label: string;
  description: string;
  icon: string;
  category: FieldTypeCategory;
  defaultConfig?: Partial<FieldDefinition>;
}

export type FieldTypeCategory =
  | 'text'
  | 'number'
  | 'selection'
  | 'datetime'
  | 'media'
  | 'reference'
  | 'structural'
  | 'advanced';

// =============================================================================
// API Types
// =============================================================================

export interface ContentTypeListResponse {
  items: ContentType[];
  total: number;
  page?: number;
  per_page?: number;
}

export interface ContentTypeResponse {
  item: ContentType;
}

export interface SchemaValidationRequest {
  schema: JSONSchema;
  ui_schema?: UISchemaOverlay;
  slug?: string;
  form_id?: string;
}

export interface SchemaValidationResponse {
  valid: boolean;
  errors?: SchemaValidationError[];
}

export interface SchemaValidationError {
  path: string;
  message: string;
}

export interface SchemaPreviewRequest {
  schema: JSONSchema;
  ui_schema?: UISchemaOverlay;
  slug?: string;
  form_id?: string;
}

export interface SchemaPreviewResponse {
  html: string;
}

export interface APIErrorResponse {
  error:
    | string
    | {
        message?: string;
        text_code?: string;
        validation_errors?: Array<{ field?: string; message?: string }>;
        metadata?: { fields?: Record<string, string> };
      };
  text_code?: string;
  fields?: Record<string, string>;
}

// =============================================================================
// Builder State
// =============================================================================

export interface ContentTypeBuilderState {
  contentType: ContentType | null;
  fields: FieldDefinition[];
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isPreviewing: boolean;
  validationErrors: SchemaValidationError[];
  selectedFieldId: string | null;
  previewHtml: string | null;
}

// =============================================================================
// Component Configuration
// =============================================================================

export interface ContentTypeEditorConfig {
  apiBasePath: string;
  basePath?: string;
  contentTypeId?: string;
  locale?: string;
  onSave?: (contentType: ContentType) => void;
  onCancel?: () => void;
}

export interface FieldTypePickerConfig {
  onSelect: (fieldType: FieldType) => void;
  onCancel: () => void;
  excludeTypes?: FieldType[];
}

export interface FieldConfigFormConfig {
  field: FieldDefinition;
  onSave: (field: FieldDefinition) => void;
  onCancel: () => void;
  existingFieldNames?: string[];
  apiBasePath?: string;
}

export interface SchemaPreviewConfig {
  apiBasePath: string;
  schema: JSONSchema;
  uiSchema?: UISchemaOverlay;
  slug?: string;
}

// =============================================================================
// Events
// =============================================================================

export type ContentTypeBuilderEvent =
  | { type: 'field:add'; field: FieldDefinition }
  | { type: 'field:update'; field: FieldDefinition }
  | { type: 'field:remove'; fieldId: string }
  | { type: 'field:reorder'; fieldIds: string[] }
  | { type: 'field:select'; fieldId: string | null }
  | { type: 'schema:validate'; errors: SchemaValidationError[] }
  | { type: 'schema:preview'; html: string }
  | { type: 'save:start' }
  | { type: 'save:success'; contentType: ContentType }
  | { type: 'save:error'; error: string };

// =============================================================================
// Block Definition Types
// =============================================================================

export interface BlockDefinition {
  id: string;
  name: string;
  slug?: string;
  type: string; // Unique block type identifier (e.g., "hero", "text", "gallery")
  description?: string;
  icon?: string;
  category?: string;
  schema: JSONSchema;
  ui_schema?: UISchemaOverlay;
  schema_version?: string;
  status?: BlockDefinitionStatus;
  created_at?: string;
  updated_at?: string;
}

export type BlockDefinitionStatus = 'draft' | 'active' | 'deprecated';

export interface BlockDefinitionListResponse {
  items: BlockDefinition[];
  total: number;
  page?: number;
  per_page?: number;
}

export interface BlockDefinitionSummary {
  id: string;
  name: string;
  slug?: string;
  type: string;
  description?: string;
  icon?: string;
  category?: string;
  schema_version?: string;
  status?: BlockDefinitionStatus;
}

export interface BlockLibraryManagerConfig {
  apiBasePath: string;
  onSelect?: (block: BlockDefinitionSummary) => void;
  onClose?: () => void;
  mode?: 'manage' | 'picker';
  allowedBlocks?: string[];
  deniedBlocks?: string[];
}

export interface BlockLibraryManagerState {
  blocks: BlockDefinition[];
  selectedBlockId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  filter: string;
  categoryFilter: string | null;
}

export interface BlockSchemaVersion {
  version: string;
  schema: JSONSchema;
  created_at: string;
  created_by?: string;
  is_breaking?: boolean;
  migration_status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  migrated_count?: number;
  total_count?: number;
}

// =============================================================================
// Content Type Schema Version (for version history)
// =============================================================================

export interface ContentTypeSchemaVersion {
  version: string;
  schema: JSONSchema;
  ui_schema?: UISchemaOverlay;
  created_at: string;
  created_by?: string;
  is_breaking?: boolean;
  migration_status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  migrated_count?: number;
  total_count?: number;
  changes?: SchemaChange[];
}

export interface SchemaChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  field?: string;
  description?: string;
  is_breaking?: boolean;
}

export interface CompatibilityCheckResult {
  compatible: boolean;
  breaking_changes: SchemaChange[];
  warnings: SchemaChange[];
  migration_required: boolean;
  affected_entries_count?: number;
}
