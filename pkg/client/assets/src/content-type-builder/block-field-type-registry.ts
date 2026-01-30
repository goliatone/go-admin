/**
 * Block Field Type Registry
 *
 * Maps backend block field type registry payloads to the frontend field metadata
 * used by the Block Library IDE.
 */

import type { FieldType, FieldTypeCategory, FieldTypeMetadata, FieldDefinition } from './types';
import { iconForKey, normalizeFieldType } from './field-type-picker';

export interface BackendFieldTypeDefinition {
  type: string;
  label?: string;
  description?: string;
  category?: string;
  icon?: string;
  defaults?: Record<string, unknown>;
  order?: number;
}

export interface BackendFieldTypeCategory {
  id?: string;
  label?: string;
  icon?: string;
  order?: number;
  collapsed?: boolean;
}

export interface BackendFieldTypeCategoryGroup {
  category?: BackendFieldTypeCategory;
  field_types?: BackendFieldTypeDefinition[];
}

export interface BlockFieldTypeCategory {
  id: FieldTypeCategory;
  label: string;
  icon: string;
  collapsed?: boolean;
}

export interface BlockFieldTypeRegistry {
  categories: BlockFieldTypeCategory[];
  fieldTypes: FieldTypeMetadata[];
}

const CATEGORY_ID_MAP: Record<string, FieldTypeCategory> = {
  text: 'text',
  media: 'media',
  choice: 'selection',
  number: 'number',
  datetime: 'datetime',
  relationship: 'reference',
  structure: 'structural',
  advanced: 'advanced',
};

const CATEGORY_ICON_MAP: Record<string, string> = {
  text: 'cat-text',
  media: 'cat-media',
  choice: 'cat-selection',
  number: 'cat-number',
  datetime: 'cat-datetime',
  relationship: 'cat-reference',
  structure: 'cat-structural',
  advanced: 'cat-advanced',
};

function normalizeCategoryId(id?: string): FieldTypeCategory {
  const raw = (id ?? '').trim().toLowerCase();
  return CATEGORY_ID_MAP[raw] ?? 'advanced';
}

function normalizeCategoryLabel(label?: string, fallbackId?: string): string {
  const val = (label ?? '').trim();
  if (val) return val;
  const id = (fallbackId ?? '').trim();
  return id ? titleCase(id) : 'Advanced';
}

function normalizeCategoryIcon(id?: string): string {
  const raw = (id ?? '').trim().toLowerCase();
  const iconKey = CATEGORY_ICON_MAP[raw] ?? 'cat-advanced';
  return iconForKey(iconKey);
}

function normalizeDefaults(def: BackendFieldTypeDefinition): Partial<FieldDefinition> | undefined {
  const defaults = def.defaults;
  if (!defaults || typeof defaults !== 'object') return undefined;
  const out = defaults as Partial<FieldDefinition>;
  return out;
}

function mapFieldType(def: BackendFieldTypeDefinition, categoryId: FieldTypeCategory): FieldTypeMetadata {
  const rawType = (def.type ?? 'text').trim().toLowerCase();
  const normalizedType = rawType === 'text' ? 'textarea' : normalizeFieldType(rawType);
  const label = (def.label ?? '').trim() || titleCase(def.type ?? normalizedType);
  const description = (def.description ?? '').trim();
  const icon = iconForKey(def.icon ?? '') || iconForKey(normalizedType) || '';
  const defaultConfig = normalizeDefaults(def);
  const meta: FieldTypeMetadata = {
    type: normalizedType,
    label,
    description,
    icon,
    category: categoryId,
    defaultConfig,
  };
  if ((def.type ?? '').toLowerCase() === 'hidden') {
    meta.defaultConfig = {
      ...(meta.defaultConfig ?? {}),
      hidden: true,
    };
  }
  return meta;
}

export function buildRegistryFromGroups(groups: BackendFieldTypeCategoryGroup[]): BlockFieldTypeRegistry {
  const categories: BlockFieldTypeCategory[] = [];
  const fieldTypes: FieldTypeMetadata[] = [];

  for (const group of groups) {
    const category = group.category ?? {};
    const backendId = (category.id ?? '').trim().toLowerCase();
    const mappedId = normalizeCategoryId(backendId);
    categories.push({
      id: mappedId,
      label: normalizeCategoryLabel(category.label, backendId),
      icon: normalizeCategoryIcon(backendId),
      collapsed: category.collapsed,
    });

    const defs = Array.isArray(group.field_types) ? group.field_types : [];
    for (const def of defs) {
      fieldTypes.push(mapFieldType(def, mappedId));
    }
  }

  return { categories, fieldTypes };
}

export const BLOCK_FIELD_TYPE_REGISTRY_FALLBACK: BlockFieldTypeRegistry = buildRegistryFromGroups([
  {
    category: { id: 'text', label: 'Text', icon: 'text', order: 10 },
    field_types: [
      {
        type: 'string',
        label: 'Single Line Text',
        description: 'Short text value',
        category: 'text',
        icon: 'text',
        defaults: { validation: { maxLength: 255 } },
        order: 10,
      },
      {
        type: 'text',
        label: 'Multi Line Text',
        description: 'Paragraph text',
        category: 'text',
        icon: 'textarea',
        defaults: { config: { rows: 4 } },
        order: 20,
      },
      {
        type: 'richtext',
        label: 'Rich Text',
        description: 'Formatted text editor',
        category: 'text',
        icon: 'rich-text',
        defaults: { config: { toolbar: 'standard' } },
        order: 30,
      },
      {
        type: 'slug',
        label: 'Slug',
        description: 'URL-friendly identifier',
        category: 'text',
        icon: 'slug',
        defaults: { config: { sourceField: null } },
        order: 40,
      },
      {
        type: 'url',
        label: 'URL',
        description: 'Website link',
        category: 'text',
        icon: 'url',
        order: 50,
      },
      {
        type: 'email',
        label: 'Email',
        description: 'Email address',
        category: 'text',
        icon: 'email',
        order: 60,
      },
    ],
  },
  {
    category: { id: 'media', label: 'Media', icon: 'media', order: 20 },
    field_types: [
      {
        type: 'image',
        label: 'Image',
        description: 'Image asset',
        category: 'media',
        icon: 'media-picker',
        defaults: { config: { accept: 'image/*' } },
        order: 10,
      },
      {
        type: 'file',
        label: 'File',
        description: 'File attachment',
        category: 'media',
        icon: 'file-upload',
        order: 20,
      },
    ],
  },
  {
    category: { id: 'choice', label: 'Choice', icon: 'choice', order: 30 },
    field_types: [
      {
        type: 'boolean',
        label: 'Boolean',
        description: 'True/false toggle',
        category: 'choice',
        icon: 'toggle',
        defaults: { config: { displayAs: 'toggle' } },
        order: 10,
      },
      {
        type: 'select',
        label: 'Select',
        description: 'Dropdown selection',
        category: 'choice',
        icon: 'select',
        defaults: { config: { options: [], multiple: false } },
        order: 20,
      },
      {
        type: 'multiselect',
        label: 'Multi Select',
        description: 'Multiple selections',
        category: 'choice',
        icon: 'chips',
        defaults: { config: { options: [], multiple: true } },
        order: 30,
      },
    ],
  },
  {
    category: { id: 'number', label: 'Number', icon: 'number', order: 40 },
    field_types: [
      { type: 'integer', label: 'Integer', description: 'Whole number', category: 'number', icon: 'integer', order: 10 },
      {
        type: 'decimal',
        label: 'Decimal',
        description: 'Decimal number',
        category: 'number',
        icon: 'number',
        defaults: { config: { precision: 2 } },
        order: 20,
      },
    ],
  },
  {
    category: { id: 'datetime', label: 'Date & Time', icon: 'datetime', order: 50 },
    field_types: [
      {
        type: 'date',
        label: 'Date',
        description: 'Calendar date',
        category: 'datetime',
        icon: 'date',
        defaults: { config: { format: 'YYYY-MM-DD' } },
        order: 10,
      },
      {
        type: 'datetime',
        label: 'Date & Time',
        description: 'Date with time',
        category: 'datetime',
        icon: 'datetime',
        order: 20,
      },
    ],
  },
  {
    category: { id: 'relationship', label: 'Relationship', icon: 'relationship', order: 60 },
    field_types: [
      {
        type: 'reference',
        label: 'Reference',
        description: 'Link to another type',
        category: 'relationship',
        icon: 'reference',
        defaults: { config: { targetType: null } },
        order: 10,
      },
    ],
  },
  {
    category: { id: 'structure', label: 'Structure', icon: 'structure', order: 70 },
    field_types: [
      {
        type: 'group',
        label: 'Group',
        description: 'Nested fields',
        category: 'structure',
        icon: 'group',
        defaults: { config: { fields: [] } },
        order: 10,
      },
    ],
  },
  {
    category: { id: 'advanced', label: 'Advanced', icon: 'advanced', order: 80, collapsed: true },
    field_types: [
      { type: 'json', label: 'JSON', description: 'Raw JSON input', category: 'advanced', icon: 'json', order: 10 },
      {
        type: 'color',
        label: 'Color',
        description: 'Color picker',
        category: 'advanced',
        icon: 'color',
        defaults: { config: { format: 'hex' } },
        order: 20,
      },
      {
        type: 'hidden',
        label: 'Hidden',
        description: 'Hidden field',
        category: 'advanced',
        icon: 'json',
        order: 30,
      },
    ],
  },
]);

function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
