/**
 * Field Type Picker
 *
 * Modal/drawer UI for selecting a field type when adding new fields.
 */

import type { FieldType, FieldTypeMetadata, FieldTypeCategory, FieldTypePickerConfig } from './types';

// =============================================================================
// SVG Icon Map
// =============================================================================

const SVG_ICONS: Record<string, string> = {
  // Text
  text: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8"></path></svg>',
  textarea: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h10M4 18h6"></path></svg>',
  'rich-text': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  markdown: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>',
  code: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',

  // Number
  number: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>',
  integer: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m-3-3v18"></path></svg>',
  currency: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  percentage: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 5L5 19M9 7a2 2 0 11-4 0 2 2 0 014 0zm10 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>',

  // Selection
  select: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>',
  radio: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  checkbox: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  chips: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>',
  toggle: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="1" y="6" width="22" height="12" rx="6" stroke-width="2"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>',

  // Date/Time
  date: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  time: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  datetime: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13l-2 2-1-1"></path></svg>',

  // Media
  'media-picker': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  'media-gallery': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>',
  'file-upload': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>',

  // Reference
  reference: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>',
  references: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8h2m2 0h-2m0 0V6m0 2v2"></path></svg>',
  user: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',

  // Structural
  group: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>',
  repeater: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>',
  blocks: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"></path></svg>',

  // Advanced
  json: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
  slug: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 18h8"></path></svg>',
  color: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>',
  location: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',

  // Category icons
  'cat-text': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8"></path></svg>',
  'cat-number': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>',
  'cat-selection': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>',
  'cat-datetime': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  'cat-media': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
  'cat-reference': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>',
  'cat-structural': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>',
  'cat-advanced': '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
};

export function iconForKey(key: string): string {
  return SVG_ICONS[key] ?? '';
}

export function normalizeFieldType(type: string): FieldType {
  const key = type.trim().toLowerCase();
  const map: Record<string, FieldType> = {
    string: 'text',
    richtext: 'rich-text',
    decimal: 'number',
    boolean: 'toggle',
    multiselect: 'chips',
    image: 'media-picker',
    file: 'file-upload',
    url: 'text',
    email: 'text',
    hidden: 'text',
  };
  return (map[key] ?? key) as FieldType;
}

function icon(key: string): string {
  return iconForKey(key);
}

// =============================================================================
// Field Type Registry
// =============================================================================

export const FIELD_TYPES: FieldTypeMetadata[] = [
  // Text Fields
  {
    type: 'text',
    label: 'Text',
    description: 'Single line text input',
    icon: icon('text'),
    category: 'text',
    defaultConfig: { validation: { maxLength: 255 } },
  },
  {
    type: 'textarea',
    label: 'Textarea',
    description: 'Multi-line text input',
    icon: icon('textarea'),
    category: 'text',
    defaultConfig: { config: { multiline: true, rows: 4 } },
  },
  {
    type: 'rich-text',
    label: 'Rich Text',
    description: 'WYSIWYG editor with formatting',
    icon: icon('rich-text'),
    category: 'text',
  },
  {
    type: 'markdown',
    label: 'Markdown',
    description: 'Markdown text editor',
    icon: icon('markdown'),
    category: 'text',
  },
  {
    type: 'code',
    label: 'Code',
    description: 'Code editor with syntax highlighting',
    icon: icon('code'),
    category: 'text',
    defaultConfig: { config: { language: 'json', lineNumbers: true } },
  },

  // Number Fields
  {
    type: 'number',
    label: 'Number',
    description: 'Decimal number input',
    icon: icon('number'),
    category: 'number',
  },
  {
    type: 'integer',
    label: 'Integer',
    description: 'Whole number input',
    icon: icon('integer'),
    category: 'number',
  },
  {
    type: 'currency',
    label: 'Currency',
    description: 'Money amount with currency symbol',
    icon: icon('currency'),
    category: 'number',
    defaultConfig: { config: { precision: 2, prefix: '$' } },
  },
  {
    type: 'percentage',
    label: 'Percentage',
    description: 'Percentage value (0-100)',
    icon: icon('percentage'),
    category: 'number',
    defaultConfig: { validation: { min: 0, max: 100 }, config: { suffix: '%' } },
  },

  // Selection Fields
  {
    type: 'select',
    label: 'Select',
    description: 'Dropdown selection',
    icon: icon('select'),
    category: 'selection',
    defaultConfig: { config: { options: [] } },
  },
  {
    type: 'radio',
    label: 'Radio',
    description: 'Radio button selection',
    icon: icon('radio'),
    category: 'selection',
    defaultConfig: { config: { options: [] } },
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    description: 'Single checkbox (true/false)',
    icon: icon('checkbox'),
    category: 'selection',
  },
  {
    type: 'chips',
    label: 'Chips',
    description: 'Tag-style multi-select',
    icon: icon('chips'),
    category: 'selection',
    defaultConfig: { config: { options: [], multiple: true } },
  },
  {
    type: 'toggle',
    label: 'Toggle',
    description: 'Boolean switch',
    icon: icon('toggle'),
    category: 'selection',
  },

  // Date/Time Fields
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker',
    icon: icon('date'),
    category: 'datetime',
  },
  {
    type: 'time',
    label: 'Time',
    description: 'Time picker',
    icon: icon('time'),
    category: 'datetime',
  },
  {
    type: 'datetime',
    label: 'Date & Time',
    description: 'Date and time picker',
    icon: icon('datetime'),
    category: 'datetime',
  },

  // Media Fields
  {
    type: 'media-picker',
    label: 'Media',
    description: 'Single media asset picker',
    icon: icon('media-picker'),
    category: 'media',
    defaultConfig: { config: { accept: 'image/*' } },
  },
  {
    type: 'media-gallery',
    label: 'Gallery',
    description: 'Multiple media assets',
    icon: icon('media-gallery'),
    category: 'media',
    defaultConfig: { config: { accept: 'image/*', multiple: true } },
  },
  {
    type: 'file-upload',
    label: 'File',
    description: 'File attachment',
    icon: icon('file-upload'),
    category: 'media',
  },

  // Reference Fields
  {
    type: 'reference',
    label: 'Reference',
    description: 'Link to another content type',
    icon: icon('reference'),
    category: 'reference',
    defaultConfig: { config: { target: '', displayField: 'name' } },
  },
  {
    type: 'references',
    label: 'References',
    description: 'Multiple links to another content type',
    icon: icon('references'),
    category: 'reference',
    defaultConfig: { config: { target: '', displayField: 'name', multiple: true } },
  },
  {
    type: 'user',
    label: 'User',
    description: 'User reference',
    icon: icon('user'),
    category: 'reference',
  },

  // Structural Fields
  {
    type: 'group',
    label: 'Group',
    description: 'Collapsible field group',
    icon: icon('group'),
    category: 'structural',
  },
  {
    type: 'repeater',
    label: 'Repeater',
    description: 'Repeatable field group',
    icon: icon('repeater'),
    category: 'structural',
    defaultConfig: { config: { fields: [], minItems: 0, maxItems: 10 } },
  },
  {
    type: 'blocks',
    label: 'Blocks',
    description: 'Modular content blocks',
    icon: icon('blocks'),
    category: 'structural',
    defaultConfig: { config: { allowedBlocks: [] } },
  },

  // Advanced Fields
  {
    type: 'json',
    label: 'JSON',
    description: 'Raw JSON editor',
    icon: icon('json'),
    category: 'advanced',
  },
  {
    type: 'slug',
    label: 'Slug',
    description: 'URL-friendly identifier',
    icon: icon('slug'),
    category: 'advanced',
    defaultConfig: { validation: { pattern: '^[a-z0-9-]+$' } },
  },
  {
    type: 'color',
    label: 'Color',
    description: 'Color picker',
    icon: icon('color'),
    category: 'advanced',
  },
  {
    type: 'location',
    label: 'Location',
    description: 'Geographic coordinates',
    icon: icon('location'),
    category: 'advanced',
  },
];

export const FIELD_CATEGORIES: { id: FieldTypeCategory; label: string; icon: string }[] = [
  { id: 'text', label: 'Text', icon: icon('cat-text') },
  { id: 'number', label: 'Numbers', icon: icon('cat-number') },
  { id: 'selection', label: 'Selection', icon: icon('cat-selection') },
  { id: 'datetime', label: 'Date & Time', icon: icon('cat-datetime') },
  { id: 'media', label: 'Media', icon: icon('cat-media') },
  { id: 'reference', label: 'References', icon: icon('cat-reference') },
  { id: 'structural', label: 'Structural', icon: icon('cat-structural') },
  { id: 'advanced', label: 'Advanced', icon: icon('cat-advanced') },
];

export function getFieldTypeMetadata(type: FieldType): FieldTypeMetadata | undefined {
  const normalized = normalizeFieldType(String(type));
  return FIELD_TYPES.find((ft) => ft.type === normalized);
}

export function getFieldTypesByCategory(category: FieldTypeCategory): FieldTypeMetadata[] {
  return FIELD_TYPES.filter((ft) => ft.category === category);
}

// =============================================================================
// Field Type Picker Component
// =============================================================================

export class FieldTypePicker {
  private config: FieldTypePickerConfig;
  private container: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private selectedCategory: FieldTypeCategory = 'text';
  private searchQuery: string = '';

  constructor(config: FieldTypePickerConfig) {
    this.config = config;
  }

  /**
   * Show the field type picker modal
   */
  show(): void {
    this.render();
    this.bindEvents();
    // Focus search input
    const searchInput = this.container?.querySelector<HTMLInputElement>('[data-field-type-search]');
    searchInput?.focus();
  }

  /**
   * Hide the field type picker modal
   */
  hide(): void {
    if (this.backdrop) {
      this.backdrop.classList.add('opacity-0');
      setTimeout(() => {
        this.backdrop?.remove();
        this.backdrop = null;
        this.container = null;
      }, 150);
    }
  }

  private render(): void {
    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className =
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-150';
    this.backdrop.setAttribute('data-field-type-picker-backdrop', 'true');

    // Create modal container
    this.container = document.createElement('div');
    this.container.className =
      'bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden';
    this.container.setAttribute('data-field-type-picker', 'true');

    this.container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Add Field</h2>
        <button type="button" data-field-type-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            data-field-type-search
            placeholder="Search field types..."
            class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <div class="w-48 border-r border-gray-200 dark:border-gray-700 overflow-y-auto" data-field-type-categories>
          ${this.renderCategories()}
        </div>

        <div class="flex-1 overflow-y-auto p-4" data-field-type-list>
          ${this.renderFieldTypes()}
        </div>
      </div>
    `;

    this.backdrop.appendChild(this.container);
    document.body.appendChild(this.backdrop);

    // Trigger animation
    requestAnimationFrame(() => {
      this.backdrop?.classList.remove('opacity-0');
    });
  }

  private renderCategories(): string {
    return FIELD_CATEGORIES.map(
      (cat) => `
      <button
        type="button"
        data-field-category="${cat.id}"
        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
          cat.id === this.selectedCategory
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }"
      >
        <span class="flex-shrink-0 w-6 flex items-center justify-center">${cat.icon}</span>
        <span>${cat.label}</span>
      </button>
    `
    ).join('');
  }

  private renderFieldTypes(): string {
    const excludeSet = new Set(this.config.excludeTypes ?? []);
    let types = FIELD_TYPES.filter((ft) => !excludeSet.has(ft.type));

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      types = types.filter(
        (ft) =>
          ft.label.toLowerCase().includes(query) ||
          ft.description.toLowerCase().includes(query) ||
          ft.type.toLowerCase().includes(query)
      );
    } else {
      // Filter by category when not searching
      types = types.filter((ft) => ft.category === this.selectedCategory);
    }

    if (types.length === 0) {
      return `
        <div class="flex flex-col items-center justify-center h-full text-gray-400">
          <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm">No field types found</p>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-2 gap-3">
        ${types.map((ft) => this.renderFieldTypeCard(ft)).join('')}
      </div>
    `;
  }

  private renderFieldTypeCard(fieldType: FieldTypeMetadata): string {
    return `
      <button
        type="button"
        data-field-type-select="${fieldType.type}"
        class="flex items-start gap-3 p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
      >
        <span class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          ${fieldType.icon}
        </span>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 dark:text-white">${fieldType.label}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">${fieldType.description}</div>
        </div>
      </button>
    `;
  }

  private bindEvents(): void {
    if (!this.container || !this.backdrop) return;

    // Close on backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.config.onCancel();
        this.hide();
      }
    });

    // Close button
    this.container.querySelector('[data-field-type-close]')?.addEventListener('click', () => {
      this.config.onCancel();
      this.hide();
    });

    // Category selection
    this.container.querySelectorAll('[data-field-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.getAttribute('data-field-category') as FieldTypeCategory;
        this.searchQuery = '';
        const searchInput = this.container?.querySelector<HTMLInputElement>('[data-field-type-search]');
        if (searchInput) searchInput.value = '';
        this.updateView();
      });
    });

    // Field type selection
    this.container.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-field-type-select]');
      if (target) {
        const type = target.getAttribute('data-field-type-select') as FieldType;
        this.config.onSelect(type);
        this.hide();
      }
    });

    // Search
    const searchInput = this.container.querySelector<HTMLInputElement>('[data-field-type-search]');
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value;
      this.updateView();
    });

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.config.onCancel();
        this.hide();
      }
    });
  }

  private updateView(): void {
    if (!this.container) return;

    // Update categories
    const categoriesContainer = this.container.querySelector('[data-field-type-categories]');
    if (categoriesContainer) {
      categoriesContainer.innerHTML = this.renderCategories();
      // Re-bind category events
      categoriesContainer.querySelectorAll('[data-field-category]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.selectedCategory = btn.getAttribute('data-field-category') as FieldTypeCategory;
          this.searchQuery = '';
          const searchInput = this.container?.querySelector<HTMLInputElement>('[data-field-type-search]');
          if (searchInput) searchInput.value = '';
          this.updateView();
        });
      });
    }

    // Update field types list
    const listContainer = this.container.querySelector('[data-field-type-list]');
    if (listContainer) {
      listContainer.innerHTML = this.renderFieldTypes();
    }
  }
}
