/**
 * Starter field-set presets (T15)
 *
 * Pure data describing common content-type shapes so an empty builder can offer
 * a one-click quick start instead of forcing field-by-field assembly. The editor
 * owns construction (id generation, name de-duplication, default config); this
 * module only declares the intended shape.
 */

import type { FieldType } from '../types';

export interface PresetField {
  /** Suggested field name; de-duplicated by the editor against existing fields. */
  name: string;
  type: FieldType;
  label: string;
  required?: boolean;
}

export interface FieldSetPreset {
  id: string;
  label: string;
  description: string;
  /** Small inline SVG (decorative) shown on the preset button. */
  icon: string;
  fields: PresetField[];
}

const DOC_ICON =
  '<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
const PAGE_ICON =
  '<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3v6h6"></path></svg>';
const POST_ICON =
  '<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m0 0h2a2 2 0 012 2v9a2 2 0 11-4 0V7zM9 9h4m-4 3h4m-4 3h2"></path></svg>';

/**
 * Built-in starter presets. Field types reference the canonical {@link FieldType}
 * union so they resolve against the field-type registry.
 */
export const FIELD_SET_PRESETS: FieldSetPreset[] = [
  {
    id: 'basic',
    label: 'Basic',
    description: 'Title and description',
    icon: DOC_ICON,
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
    ],
  },
  {
    id: 'page',
    label: 'Page',
    description: 'Title, slug, and body',
    icon: PAGE_ICON,
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'slug', type: 'slug', label: 'Slug', required: true },
      { name: 'body', type: 'rich-text', label: 'Body' },
    ],
  },
  {
    id: 'blog-post',
    label: 'Blog Post',
    description: 'Title, slug, excerpt, cover, body, date',
    icon: POST_ICON,
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'slug', type: 'slug', label: 'Slug', required: true },
      { name: 'excerpt', type: 'textarea', label: 'Excerpt' },
      { name: 'cover_image', type: 'media-picker', label: 'Cover Image' },
      { name: 'body', type: 'rich-text', label: 'Body' },
      { name: 'published_at', type: 'datetime', label: 'Published At' },
    ],
  },
];

/** Look up a preset by id. */
export function getFieldSetPreset(id: string): FieldSetPreset | undefined {
  return FIELD_SET_PRESETS.find((p) => p.id === id);
}
