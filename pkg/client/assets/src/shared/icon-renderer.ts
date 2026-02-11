/**
 * Shared Icon Renderer Utility
 *
 * Centralizes icon HTML generation across the admin UI for dynamic JS surfaces.
 * Parses qualified icon references (iconoir:, lucide:, emoji:, svg:, url:) and
 * generates safe HTML output.
 *
 * Usage patterns:
 *   renderIcon('home')                    -> <i class="iconoir-home flex-shrink-0" ...></i>
 *   renderIcon('iconoir:home')            -> <i class="iconoir-home flex-shrink-0" ...></i>
 *   renderIcon('lucide:home')             -> <i class="lucide-home flex-shrink-0" ...></i>
 *   renderIcon('emoji:rocket')            -> <span ...>rocket</span>
 *   renderIcon('url:https://...')         -> <img src="https://..." ...>
 *
 * Security considerations:
 *   - All CSS class names are escaped to prevent injection
 *   - SVG content from svg: prefix is sanitized
 *   - URLs are validated (only https: and data: with allowed MIME types)
 *   - data: URIs are validated for MIME type and size
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IconType = 'emoji' | 'library' | 'svg' | 'url';

export interface IconReference {
  type: IconType;
  library?: string;
  value: string;
  raw: string;
}

export interface IconRenderOptions {
  /** Custom CSS classes to add */
  extraClass?: string;
  /** Icon size style (e.g., '20px') */
  size?: string;
  /** Whether the icon source is trusted (allows SVG/URL) */
  trusted?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIBRARY = 'iconoir';
const DEFAULT_SIZE = 'var(--sidebar-icon-size, 20px)';

/** Allowed URL schemes for external icons */
const ALLOWED_URL_SCHEMES = ['https:'];

/** Allowed MIME types for data: URIs */
const ALLOWED_DATA_MIMES = [
  'image/svg+xml',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

/** Maximum size for data: URI payloads (128KB) */
const MAX_DATA_URI_SIZE = 131072;

/** SVG field type keys for legacy compatibility */
const SVG_FIELD_TYPE_KEYS: Record<string, string> = {
  'text': 'text',
  'textarea': 'text',
  'rich-text': 'edit-pencil',
  'markdown': 'edit-pencil',
  'code': 'code',
  'number': 'calculator',
  'integer': 'calculator',
  'currency': 'credit-card',
  'percentage': 'percentage-round',
  'select': 'list',
  'radio': 'circle',
  'checkbox': 'check-circle',
  'chips': 'label',
  'toggle': 'switch-on',
  'date': 'calendar',
  'time': 'clock',
  'datetime': 'calendar',
  'media-picker': 'media-image',
  'media-gallery': 'media-image-list',
  'file-upload': 'attachment',
  'reference': 'link',
  'references': 'link',
  'user': 'user',
  'group': 'folder',
  'repeater': 'refresh-double',
  'blocks': 'view-grid',
  'json': 'code-brackets',
  'slug': 'link',
  'color': 'color-picker',
  'location': 'pin-alt',
};

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parses an icon reference string into its components.
 *
 * Parsing precedence:
 *   1. Empty string -> empty reference
 *   2. emoji:<value> -> emoji type
 *   3. svg:<content> -> svg type
 *   4. url:<value> -> url type
 *   5. Raw <svg...> -> svg type
 *   6. Raw http(s):// or data: -> url type
 *   7. Qualified library:name -> library type
 *   8. Legacy iconoir-name -> library iconoir
 *   9. SVG field type key mapping
 *   10. Bare name -> default library (iconoir)
 */
export function parseIconReference(ref: string): IconReference {
  const raw = ref;
  ref = ref.trim();

  // 1. Empty string
  if (!ref) {
    return { type: 'library', value: '', raw };
  }

  // 2. emoji: prefix
  if (ref.startsWith('emoji:')) {
    return { type: 'emoji', value: ref.slice(6), raw };
  }

  // 3. svg: prefix
  if (ref.startsWith('svg:')) {
    return { type: 'svg', value: ref.slice(4), raw };
  }

  // 4. url: prefix
  if (ref.startsWith('url:')) {
    return { type: 'url', value: ref.slice(4), raw };
  }

  // 5. Raw SVG content
  if (ref.startsWith('<svg') || ref.startsWith('<?xml')) {
    return { type: 'svg', value: ref, raw };
  }

  // 6. Raw URL
  if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:')) {
    return { type: 'url', value: ref, raw };
  }

  // 7. Emoji detection (common emoji ranges)
  if (isEmoji(ref)) {
    return { type: 'emoji', value: ref, raw };
  }

  // 8. Qualified library:name
  if (ref.includes(':') && !ref.includes('://')) {
    const colonIdx = ref.indexOf(':');
    const library = ref.slice(0, colonIdx);
    const name = ref.slice(colonIdx + 1);
    return { type: 'library', library, value: name, raw };
  }

  // 9. Legacy iconoir-name
  if (ref.startsWith('iconoir-')) {
    return { type: 'library', library: 'iconoir', value: ref.slice(8), raw };
  }

  // 10. SVG field type key mapping
  const mapped = SVG_FIELD_TYPE_KEYS[ref];
  if (mapped) {
    return { type: 'library', library: 'iconoir', value: mapped, raw };
  }

  // 11. Default: bare name -> iconoir library
  return { type: 'library', library: DEFAULT_LIBRARY, value: ref, raw };
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

/**
 * Renders an icon reference to safe HTML.
 *
 *   renderIcon('home')                  -> <i class="iconoir-home ...">
 *   renderIcon('lucide:home')           -> <i class="lucide-home ...">
 *   renderIcon('emoji:rocket')          -> <span ...>rocket</span>
 *   renderIcon('url:https://...')       -> <img src="https://..." ...>
 */
export function renderIcon(ref: string, opts?: IconRenderOptions): string {
  const parsed = parseIconReference(ref);
  return renderParsedIcon(parsed, opts);
}

/**
 * Renders a pre-parsed icon reference to HTML.
 */
export function renderParsedIcon(ref: IconReference, opts?: IconRenderOptions): string {
  if (!ref.value && ref.type === 'library') {
    return '';
  }

  const size = opts?.size ?? DEFAULT_SIZE;
  const extraClass = opts?.extraClass ?? '';

  switch (ref.type) {
    case 'emoji':
      return renderEmoji(ref.value, size, extraClass);

    case 'library':
      return renderLibraryIcon(ref.library ?? DEFAULT_LIBRARY, ref.value, size, extraClass);

    case 'svg':
      if (opts?.trusted) {
        return renderSvgIcon(ref.value, size, extraClass);
      }
      // Untrusted SVG: fall back to empty or a placeholder
      console.warn('[icon-renderer] SVG content blocked for untrusted source');
      return '';

    case 'url':
      return renderUrlIcon(ref.value, size, extraClass, opts?.trusted);

    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Type-specific Renderers
// ---------------------------------------------------------------------------

function renderEmoji(emoji: string, size: string, extraClass: string): string {
  const style = `font-size: ${size}; line-height: 1; text-align: center; width: 1.25em;`;
  const cls = `flex-shrink-0${extraClass ? ' ' + extraClass : ''}`;
  return `<span class="${cls}" style="${style}">${escapeHtml(emoji)}</span>`;
}

function renderLibraryIcon(library: string, name: string, size: string, extraClass: string): string {
  const escapedLib = escapeClassName(library);
  const escapedName = escapeClassName(name);
  const style = `font-size: ${size};`;
  const cls = `${escapedLib}-${escapedName} flex-shrink-0${extraClass ? ' ' + extraClass : ''}`;
  return `<i class="${cls}" style="${style}"></i>`;
}

function renderSvgIcon(content: string, size: string, extraClass: string): string {
  // Sanitize SVG content
  const sanitized = sanitizeSvg(content);
  if (!sanitized) {
    return '';
  }

  const cls = `flex-shrink-0${extraClass ? ' ' + extraClass : ''}`;
  const style = `width: ${size}; height: ${size};`;
  return `<span class="${cls}" style="${style}">${sanitized}</span>`;
}

function renderUrlIcon(url: string, size: string, extraClass: string, trusted?: boolean): string {
  // Validate URL
  const validated = validateIconUrl(url, trusted);
  if (!validated) {
    console.warn('[icon-renderer] URL blocked:', url);
    return '';
  }

  const cls = `flex-shrink-0${extraClass ? ' ' + extraClass : ''}`;
  const style = `width: ${size}; height: ${size}; object-fit: contain;`;
  return `<img src="${escapeAttr(validated)}" class="${cls}" style="${style}" alt="" aria-hidden="true">`;
}

// ---------------------------------------------------------------------------
// URL Validation
// ---------------------------------------------------------------------------

function validateIconUrl(url: string, trusted?: boolean): string | null {
  url = url.trim();
  if (!url) {
    return null;
  }

  // Block javascript: URLs
  if (url.toLowerCase().startsWith('javascript:')) {
    return null;
  }

  // Handle data: URIs
  if (url.startsWith('data:')) {
    return validateDataUri(url, trusted);
  }

  // Handle external URLs
  try {
    const parsed = new URL(url);

    // Check scheme
    if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
      return null;
    }

    // Untrusted sources: block external URLs unless explicitly trusted
    if (!trusted) {
      console.warn('[icon-renderer] External URL blocked for untrusted source');
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function validateDataUri(dataUri: string, trusted?: boolean): string | null {
  if (!dataUri.startsWith('data:')) {
    return null;
  }

  // Check size limit
  if (dataUri.length > MAX_DATA_URI_SIZE) {
    console.warn('[icon-renderer] Data URI exceeds size limit');
    return null;
  }

  // Parse data URI: data:[<mediatype>][;base64],<data>
  const content = dataUri.slice(5); // Remove 'data:'
  const commaIdx = content.indexOf(',');
  if (commaIdx < 0) {
    return null;
  }

  const header = content.slice(0, commaIdx);
  const mimeType = header.split(';')[0].trim();

  // Check MIME allowlist
  if (!ALLOWED_DATA_MIMES.includes(mimeType.toLowerCase())) {
    console.warn('[icon-renderer] Data URI MIME type not allowed:', mimeType);
    return null;
  }

  // For untrusted sources, only allow non-SVG data URIs
  if (!trusted && mimeType.toLowerCase() === 'image/svg+xml') {
    console.warn('[icon-renderer] SVG data URI blocked for untrusted source');
    return null;
  }

  return dataUri;
}

// ---------------------------------------------------------------------------
// SVG Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitizes SVG content by removing dangerous elements and attributes.
 */
function sanitizeSvg(svg: string): string | null {
  // Basic structure check
  if (!svg.toLowerCase().includes('<svg')) {
    return null;
  }

  // Remove script tags, event handlers, and other dangerous content
  let sanitized = svg;

  // Remove dangerous elements
  sanitized = sanitized.replace(
    /<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
    ''
  );
  sanitized = sanitized.replace(
    /<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*\/?>/gi,
    ''
  );

  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: hrefs
  sanitized = sanitized.replace(/(href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*["']?/gi, '');

  // Remove external references
  sanitized = sanitized.replace(/(href|xlink:href|src)\s*=\s*["']?\s*(https?:|\/\/)[^"'\s>]*["']?/gi, '');

  // Remove XML entities and processing instructions
  sanitized = sanitized.replace(/<!ENTITY\s+[^>]+>/gi, '');
  sanitized = sanitized.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/gi, '');
  sanitized = sanitized.replace(/<\?[\s\S]*?\?>/g, '');

  // Verify structure is still intact
  if (!sanitized.toLowerCase().includes('<svg')) {
    return null;
  }

  return sanitized.trim();
}

// ---------------------------------------------------------------------------
// Emoji Detection
// ---------------------------------------------------------------------------

function isEmoji(str: string): boolean {
  for (const char of str) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;

    // Variation selector or ZWJ
    if (code === 0xFE0F || code === 0x200D) {
      return true;
    }

    // Symbol, Other category / Miscellaneous Symbols / Dingbats
    if (code >= 0x2600 && code <= 0x27BF) {
      return true;
    }

    // Main emoji blocks
    if (code >= 0x1F300 && code <= 0x1FAFF) {
      return true;
    }

    // Skin tone modifiers
    if (code >= 0x1F3FB && code <= 0x1F3FF) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Escape Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

/**
 * Escapes a string for safe use as a CSS class name.
 * Only allows alphanumeric characters, hyphens, and underscores.
 */
function escapeClassName(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '');
}
