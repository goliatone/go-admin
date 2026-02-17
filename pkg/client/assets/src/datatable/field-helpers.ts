/**
 * Field-Level Helpers for Translation Forms
 *
 * Phase 3 translation UX: character counters, interpolation preview, RTL/LTR toggle.
 * These helpers enhance text input fields with translation-specific features.
 *
 * Features:
 * - Character counter with soft/hard thresholds
 * - Interpolation preview for template variables ({{name}}, {0}, %s, etc.)
 * - RTL/LTR text direction toggle with persistence
 * - Schema-driven configuration when available
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Character counter threshold configuration.
 */
export interface CharacterCounterThreshold {
  /**
   * Character limit for this threshold.
   */
  limit: number;

  /**
   * Severity level: 'info' | 'warning' | 'error'.
   */
  severity: 'info' | 'warning' | 'error';

  /**
   * Optional message to display when threshold is reached.
   */
  message?: string;
}

/**
 * Character counter configuration.
 */
export interface CharacterCounterConfig {
  /**
   * Target input element.
   */
  input: HTMLInputElement | HTMLTextAreaElement;

  /**
   * Container element for the counter display.
   * If not provided, counter is appended after input.
   */
  container?: HTMLElement;

  /**
   * Soft limit (warning threshold).
   */
  softLimit?: number;

  /**
   * Hard limit (error/maximum threshold).
   */
  hardLimit?: number;

  /**
   * Custom thresholds for more granular control.
   */
  thresholds?: CharacterCounterThreshold[];

  /**
   * Whether to enforce hard limit by preventing input.
   * Default: false
   */
  enforceHardLimit?: boolean;

  /**
   * CSS class prefix.
   * Default: 'char-counter'
   */
  classPrefix?: string;

  /**
   * Custom format function for the counter display.
   */
  formatDisplay?: (current: number, limit?: number) => string;
}

/**
 * Interpolation pattern definition.
 */
export interface InterpolationPattern {
  /**
   * Regex pattern to match interpolation syntax.
   */
  pattern: RegExp;

  /**
   * Name of this pattern type (for display).
   */
  name: string;

  /**
   * Example of the pattern.
   */
  example: string;
}

/**
 * Interpolation preview configuration.
 */
export interface InterpolationPreviewConfig {
  /**
   * Target input element.
   */
  input: HTMLInputElement | HTMLTextAreaElement;

  /**
   * Container element for the preview display.
   */
  container?: HTMLElement;

  /**
   * Sample values to use for preview.
   */
  sampleValues?: Record<string, string>;

  /**
   * Custom patterns to detect (in addition to defaults).
   */
  customPatterns?: InterpolationPattern[];

  /**
   * Whether to highlight variables in the preview.
   * Default: true
   */
  highlightVariables?: boolean;

  /**
   * CSS class prefix.
   * Default: 'interpolation-preview'
   */
  classPrefix?: string;
}

/**
 * RTL/LTR toggle configuration.
 */
export interface DirectionToggleConfig {
  /**
   * Target input element.
   */
  input: HTMLInputElement | HTMLTextAreaElement;

  /**
   * Container element for the toggle button.
   */
  container?: HTMLElement;

  /**
   * Initial direction.
   * Default: auto-detected or 'ltr'
   */
  initialDirection?: 'ltr' | 'rtl' | 'auto';

  /**
   * Persistence key for localStorage.
   * If provided, direction is persisted per field.
   */
  persistenceKey?: string;

  /**
   * CSS class prefix.
   * Default: 'dir-toggle'
   */
  classPrefix?: string;

  /**
   * Callback when direction changes.
   */
  onChange?: (direction: 'ltr' | 'rtl') => void;
}

/**
 * Field helper state.
 */
export interface FieldHelperState {
  charCount: number;
  severity: 'info' | 'warning' | 'error' | null;
  direction: 'ltr' | 'rtl';
  interpolations: InterpolationMatch[];
}

/**
 * Interpolation match result.
 */
export interface InterpolationMatch {
  pattern: string;
  variable: string;
  start: number;
  end: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CHAR_COUNTER_PREFIX = 'char-counter';
const DEFAULT_INTERPOLATION_PREFIX = 'interpolation-preview';
const DEFAULT_DIR_TOGGLE_PREFIX = 'dir-toggle';

/**
 * Default interpolation patterns for common template syntaxes.
 */
export const DEFAULT_INTERPOLATION_PATTERNS: InterpolationPattern[] = [
  // Mustache/Handlebars: {{name}}, {{user.name}}
  { pattern: /\{\{(\w+(?:\.\w+)*)\}\}/g, name: 'Mustache', example: '{{name}}' },
  // ICU MessageFormat: {name}, {count, plural, ...}
  { pattern: /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g, name: 'ICU', example: '{name}' },
  // Printf: %s, %d, %1$s
  { pattern: /%(\d+\$)?[sdfc]/g, name: 'Printf', example: '%s' },
  // Ruby/Python named: %(name)s, ${name}
  { pattern: /%\((\w+)\)[sdf]/g, name: 'Named Printf', example: '%(name)s' },
  { pattern: /\$\{(\w+)\}/g, name: 'Template Literal', example: '${name}' }
];

/**
 * Default sample values for interpolation preview.
 */
export const DEFAULT_SAMPLE_VALUES: Record<string, string> = {
  name: 'John',
  count: '5',
  email: 'user@example.com',
  date: '2024-01-15',
  price: '$29.99',
  user: 'Jane',
  item: 'Product',
  total: '100'
};

// =============================================================================
// CharacterCounter Class
// =============================================================================

/**
 * Character counter for text inputs with threshold support.
 */
export class CharacterCounter {
  private config: Required<Omit<CharacterCounterConfig, 'container' | 'thresholds' | 'formatDisplay'>> & {
    container?: HTMLElement;
    thresholds: CharacterCounterThreshold[];
    formatDisplay: (current: number, limit?: number) => string;
  };

  private counterEl: HTMLElement | null = null;
  private boundUpdate: () => void;

  constructor(config: CharacterCounterConfig) {
    this.config = {
      input: config.input,
      container: config.container,
      softLimit: config.softLimit,
      hardLimit: config.hardLimit,
      thresholds: config.thresholds ?? this.buildDefaultThresholds(config),
      enforceHardLimit: config.enforceHardLimit ?? false,
      classPrefix: config.classPrefix ?? DEFAULT_CHAR_COUNTER_PREFIX,
      formatDisplay: config.formatDisplay ?? this.defaultFormatDisplay.bind(this)
    };

    this.boundUpdate = this.update.bind(this);
    this.init();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get current character count.
   */
  getCount(): number {
    return this.config.input.value.length;
  }

  /**
   * Get current severity based on thresholds.
   */
  getSeverity(): 'info' | 'warning' | 'error' | null {
    const count = this.getCount();

    // Sort thresholds by limit descending
    const sortedThresholds = [...this.config.thresholds].sort((a, b) => b.limit - a.limit);

    for (const threshold of sortedThresholds) {
      if (count >= threshold.limit) {
        return threshold.severity;
      }
    }

    return null;
  }

  /**
   * Update the counter display.
   */
  update(): void {
    const count = this.getCount();
    const severity = this.getSeverity();
    const limit = this.config.hardLimit ?? this.config.softLimit;

    // Enforce hard limit if configured
    if (this.config.enforceHardLimit && this.config.hardLimit && count > this.config.hardLimit) {
      this.config.input.value = this.config.input.value.slice(0, this.config.hardLimit);
    }

    if (this.counterEl) {
      this.counterEl.textContent = this.config.formatDisplay(count, limit);
      this.counterEl.className = this.buildCounterClasses(severity);

      // Set ARIA attributes
      this.counterEl.setAttribute('aria-live', 'polite');
      if (severity === 'error') {
        this.counterEl.setAttribute('role', 'alert');
      } else {
        this.counterEl.removeAttribute('role');
      }
    }
  }

  /**
   * Render the counter HTML.
   */
  render(): string {
    const count = this.getCount();
    const severity = this.getSeverity();
    const limit = this.config.hardLimit ?? this.config.softLimit;

    return `<span class="${this.buildCounterClasses(severity)}" aria-live="polite">${this.config.formatDisplay(count, limit)}</span>`;
  }

  /**
   * Clean up event listeners.
   */
  destroy(): void {
    this.config.input.removeEventListener('input', this.boundUpdate);
    this.config.input.removeEventListener('change', this.boundUpdate);
    if (this.counterEl?.parentElement) {
      this.counterEl.parentElement.removeChild(this.counterEl);
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private init(): void {
    // Create counter element
    this.counterEl = document.createElement('span');
    this.counterEl.className = this.buildCounterClasses(null);

    // Mount counter
    if (this.config.container) {
      this.config.container.appendChild(this.counterEl);
    } else {
      this.config.input.parentElement?.insertBefore(
        this.counterEl,
        this.config.input.nextSibling
      );
    }

    // Bind events
    this.config.input.addEventListener('input', this.boundUpdate);
    this.config.input.addEventListener('change', this.boundUpdate);

    // Initial update
    this.update();
  }

  private buildDefaultThresholds(config: CharacterCounterConfig): CharacterCounterThreshold[] {
    const thresholds: CharacterCounterThreshold[] = [];

    if (config.softLimit) {
      thresholds.push({
        limit: config.softLimit,
        severity: 'warning',
        message: `Approaching limit (${config.softLimit} characters)`
      });
    }

    if (config.hardLimit) {
      thresholds.push({
        limit: config.hardLimit,
        severity: 'error',
        message: `Maximum limit reached (${config.hardLimit} characters)`
      });
    }

    return thresholds;
  }

  private buildCounterClasses(severity: 'info' | 'warning' | 'error' | null): string {
    const prefix = this.config.classPrefix;
    const classes = [prefix];

    if (severity) {
      classes.push(`${prefix}--${severity}`);
    }

    return classes.join(' ');
  }

  private defaultFormatDisplay(current: number, limit?: number): string {
    if (limit) {
      return `${current} / ${limit}`;
    }
    return `${current}`;
  }
}

// =============================================================================
// InterpolationPreview Class
// =============================================================================

/**
 * Interpolation preview for template variables in translation text.
 */
export class InterpolationPreview {
  private config: Required<Omit<InterpolationPreviewConfig, 'container' | 'customPatterns'>> & {
    container?: HTMLElement;
    patterns: InterpolationPattern[];
  };

  private previewEl: HTMLElement | null = null;
  private boundUpdate: () => void;

  constructor(config: InterpolationPreviewConfig) {
    this.config = {
      input: config.input,
      container: config.container,
      sampleValues: config.sampleValues ?? DEFAULT_SAMPLE_VALUES,
      patterns: [...DEFAULT_INTERPOLATION_PATTERNS, ...(config.customPatterns ?? [])],
      highlightVariables: config.highlightVariables ?? true,
      classPrefix: config.classPrefix ?? DEFAULT_INTERPOLATION_PREFIX
    };

    this.boundUpdate = this.update.bind(this);
    this.init();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get all interpolation matches in the current text.
   */
  getMatches(): InterpolationMatch[] {
    const text = this.config.input.value;
    const matches: InterpolationMatch[] = [];

    for (const patternDef of this.config.patterns) {
      // Reset pattern lastIndex for global patterns
      patternDef.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = patternDef.pattern.exec(text)) !== null) {
        matches.push({
          pattern: patternDef.name,
          variable: match[1] ?? match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return matches;
  }

  /**
   * Get preview text with sample values substituted.
   */
  getPreviewText(): string {
    let text = this.config.input.value;

    for (const patternDef of this.config.patterns) {
      patternDef.pattern.lastIndex = 0;
      text = text.replace(patternDef.pattern, (match, variable) => {
        const varName = variable ?? match;
        const normalized = varName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        // Try to find a matching sample value
        for (const [key, value] of Object.entries(this.config.sampleValues)) {
          if (key.toLowerCase() === normalized) {
            return value;
          }
        }

        // Return the match highlighted if no sample found
        return match;
      });
    }

    return text;
  }

  /**
   * Update the preview display.
   */
  update(): void {
    if (!this.previewEl) return;

    const matches = this.getMatches();
    const hasInterpolations = matches.length > 0;

    if (!hasInterpolations) {
      this.previewEl.classList.add(`${this.config.classPrefix}--empty`);
      this.previewEl.innerHTML = '';
      return;
    }

    this.previewEl.classList.remove(`${this.config.classPrefix}--empty`);

    if (this.config.highlightVariables) {
      this.previewEl.innerHTML = this.renderHighlightedPreview();
    } else {
      this.previewEl.textContent = this.getPreviewText();
    }
  }

  /**
   * Render preview with highlighted variables.
   */
  renderHighlightedPreview(): string {
    const text = this.config.input.value;
    const matches = this.getMatches();
    const prefix = this.config.classPrefix;

    if (matches.length === 0) {
      return this.escapeHtml(text);
    }

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    let result = '';
    let lastIndex = 0;

    for (const match of matches) {
      // Add text before this match
      result += this.escapeHtml(text.slice(lastIndex, match.start));

      // Add highlighted variable
      const sampleValue = this.getSampleValue(match.variable);
      const original = text.slice(match.start, match.end);

      result += `<span class="${prefix}__variable" title="${this.escapeHtml(original)}">${this.escapeHtml(sampleValue ?? original)}</span>`;

      lastIndex = match.end;
    }

    // Add remaining text
    result += this.escapeHtml(text.slice(lastIndex));

    return result;
  }

  /**
   * Render the preview HTML structure.
   */
  render(): string {
    const prefix = this.config.classPrefix;
    const matches = this.getMatches();
    const isEmpty = matches.length === 0;

    return `<div class="${prefix}${isEmpty ? ` ${prefix}--empty` : ''}">
      <span class="${prefix}__label">Preview:</span>
      <span class="${prefix}__content">${this.config.highlightVariables ? this.renderHighlightedPreview() : this.escapeHtml(this.getPreviewText())}</span>
    </div>`;
  }

  /**
   * Clean up event listeners.
   */
  destroy(): void {
    this.config.input.removeEventListener('input', this.boundUpdate);
    if (this.previewEl?.parentElement) {
      this.previewEl.parentElement.removeChild(this.previewEl);
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private init(): void {
    // Create preview element
    this.previewEl = document.createElement('div');
    this.previewEl.className = this.config.classPrefix;

    // Mount preview
    if (this.config.container) {
      this.config.container.appendChild(this.previewEl);
    } else {
      this.config.input.parentElement?.appendChild(this.previewEl);
    }

    // Bind events
    this.config.input.addEventListener('input', this.boundUpdate);

    // Initial update
    this.update();
  }

  private getSampleValue(variable: string): string | null {
    const normalized = variable.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    for (const [key, value] of Object.entries(this.config.sampleValues)) {
      if (key.toLowerCase() === normalized) {
        return value;
      }
    }

    return null;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// =============================================================================
// DirectionToggle Class
// =============================================================================

/**
 * RTL/LTR direction toggle for text inputs.
 */
export class DirectionToggle {
  private config: Required<Omit<DirectionToggleConfig, 'container' | 'persistenceKey' | 'onChange'>> & {
    container?: HTMLElement;
    persistenceKey?: string;
    onChange?: (direction: 'ltr' | 'rtl') => void;
  };

  private toggleEl: HTMLButtonElement | null = null;
  private currentDirection: 'ltr' | 'rtl';

  constructor(config: DirectionToggleConfig) {
    this.config = {
      input: config.input,
      container: config.container,
      initialDirection: config.initialDirection ?? 'auto',
      persistenceKey: config.persistenceKey,
      classPrefix: config.classPrefix ?? DEFAULT_DIR_TOGGLE_PREFIX,
      onChange: config.onChange
    };

    this.currentDirection = this.resolveInitialDirection();
    this.init();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get current text direction.
   */
  getDirection(): 'ltr' | 'rtl' {
    return this.currentDirection;
  }

  /**
   * Set text direction.
   */
  setDirection(direction: 'ltr' | 'rtl'): void {
    if (direction === this.currentDirection) return;

    this.currentDirection = direction;
    this.config.input.dir = direction;
    this.config.input.style.textAlign = direction === 'rtl' ? 'right' : 'left';

    // Persist if configured
    if (this.config.persistenceKey) {
      try {
        localStorage.setItem(this.config.persistenceKey, direction);
      } catch {
        // Ignore storage errors
      }
    }

    // Update toggle button
    this.updateToggle();

    // Notify callback
    this.config.onChange?.(direction);
  }

  /**
   * Toggle between LTR and RTL.
   */
  toggle(): void {
    this.setDirection(this.currentDirection === 'ltr' ? 'rtl' : 'ltr');
  }

  /**
   * Render the toggle button HTML.
   */
  render(): string {
    const prefix = this.config.classPrefix;
    const isRtl = this.currentDirection === 'rtl';

    return `<button type="button" class="${prefix}" aria-pressed="${isRtl}" title="Toggle text direction (${isRtl ? 'RTL' : 'LTR'})">
      <span class="${prefix}__icon">${isRtl ? this.rtlIcon() : this.ltrIcon()}</span>
      <span class="${prefix}__label">${isRtl ? 'RTL' : 'LTR'}</span>
    </button>`;
  }

  /**
   * Clean up.
   */
  destroy(): void {
    if (this.toggleEl?.parentElement) {
      this.toggleEl.parentElement.removeChild(this.toggleEl);
    }
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private init(): void {
    // Apply initial direction to input
    this.config.input.dir = this.currentDirection;
    this.config.input.style.textAlign = this.currentDirection === 'rtl' ? 'right' : 'left';

    // Create toggle button
    this.toggleEl = document.createElement('button');
    this.toggleEl.type = 'button';
    this.toggleEl.className = this.config.classPrefix;
    this.updateToggle();

    // Bind click handler
    this.toggleEl.addEventListener('click', () => this.toggle());

    // Mount toggle
    if (this.config.container) {
      this.config.container.appendChild(this.toggleEl);
    } else {
      this.config.input.parentElement?.appendChild(this.toggleEl);
    }
  }

  private resolveInitialDirection(): 'ltr' | 'rtl' {
    // Check persistence first
    if (this.config.persistenceKey) {
      try {
        const stored = localStorage.getItem(this.config.persistenceKey);
        if (stored === 'ltr' || stored === 'rtl') {
          return stored;
        }
      } catch {
        // Ignore storage errors
      }
    }

    // Check config
    if (this.config.initialDirection === 'ltr' || this.config.initialDirection === 'rtl') {
      return this.config.initialDirection;
    }

    // Auto-detect from input or document
    if (this.config.input.dir === 'rtl') {
      return 'rtl';
    }

    if (document.dir === 'rtl' || document.documentElement.dir === 'rtl') {
      return 'rtl';
    }

    // Default to LTR
    return 'ltr';
  }

  private updateToggle(): void {
    if (!this.toggleEl) return;

    const isRtl = this.currentDirection === 'rtl';
    this.toggleEl.setAttribute('aria-pressed', String(isRtl));
    this.toggleEl.setAttribute('title', `Toggle text direction (${isRtl ? 'RTL' : 'LTR'})`);
    this.toggleEl.innerHTML = `
      <span class="${this.config.classPrefix}__icon">${isRtl ? this.rtlIcon() : this.ltrIcon()}</span>
      <span class="${this.config.classPrefix}__label">${isRtl ? 'RTL' : 'LTR'}</span>
    `;
  }

  private ltrIcon(): string {
    return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  private rtlIcon(): string {
    return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Initialize all field helpers for a form.
 */
export function initFieldHelpers(
  form: HTMLFormElement,
  options: {
    charCounterFields?: string[];
    charCounterConfig?: Partial<CharacterCounterConfig>;
    interpolationFields?: string[];
    interpolationConfig?: Partial<InterpolationPreviewConfig>;
    directionToggleFields?: string[];
    directionToggleConfig?: Partial<DirectionToggleConfig>;
  } = {}
): {
  counters: CharacterCounter[];
  previews: InterpolationPreview[];
  toggles: DirectionToggle[];
  destroy: () => void;
} {
  const counters: CharacterCounter[] = [];
  const previews: InterpolationPreview[] = [];
  const toggles: DirectionToggle[] = [];

  // Initialize character counters
  for (const fieldName of options.charCounterFields ?? []) {
    const input = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLTextAreaElement;
    if (input) {
      counters.push(new CharacterCounter({
        input,
        ...options.charCounterConfig
      }));
    }
  }

  // Initialize interpolation previews
  for (const fieldName of options.interpolationFields ?? []) {
    const input = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLTextAreaElement;
    if (input) {
      previews.push(new InterpolationPreview({
        input,
        ...options.interpolationConfig
      }));
    }
  }

  // Initialize direction toggles
  for (const fieldName of options.directionToggleFields ?? []) {
    const input = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLTextAreaElement;
    if (input) {
      toggles.push(new DirectionToggle({
        input,
        persistenceKey: `dir-${fieldName}`,
        ...options.directionToggleConfig
      }));
    }
  }

  return {
    counters,
    previews,
    toggles,
    destroy: () => {
      counters.forEach(c => c.destroy());
      previews.forEach(p => p.destroy());
      toggles.forEach(t => t.destroy());
    }
  };
}

/**
 * Render standalone character counter HTML.
 */
export function renderCharacterCounter(
  count: number,
  limit?: number,
  severity?: 'info' | 'warning' | 'error' | null,
  classPrefix: string = DEFAULT_CHAR_COUNTER_PREFIX
): string {
  const classes = [classPrefix];
  if (severity) {
    classes.push(`${classPrefix}--${severity}`);
  }

  const display = limit ? `${count} / ${limit}` : `${count}`;

  return `<span class="${classes.join(' ')}" aria-live="polite">${display}</span>`;
}

/**
 * Render standalone direction toggle HTML.
 */
export function renderDirectionToggle(
  direction: 'ltr' | 'rtl',
  classPrefix: string = DEFAULT_DIR_TOGGLE_PREFIX
): string {
  const isRtl = direction === 'rtl';
  const icon = isRtl
    ? `<path d="M13 8H3M6 5L3 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;

  return `<button type="button" class="${classPrefix}" aria-pressed="${isRtl}" title="Toggle text direction (${direction.toUpperCase()})">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">${icon}</svg>
    <span class="${classPrefix}__label">${direction.toUpperCase()}</span>
  </button>`;
}

/**
 * Get CSS styles for field helpers.
 */
export function getFieldHelperStyles(): string {
  return `
    /* Character Counter */
    .char-counter {
      display: inline-flex;
      font-size: 0.75rem;
      color: var(--char-counter-color, #6b7280);
      margin-left: 0.5rem;
    }

    .char-counter--warning {
      color: var(--char-counter-warning-color, #f59e0b);
    }

    .char-counter--error {
      color: var(--char-counter-error-color, #ef4444);
      font-weight: 500;
    }

    /* Interpolation Preview */
    .interpolation-preview {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: var(--preview-bg, #f9fafb);
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }

    .interpolation-preview--empty {
      display: none;
    }

    .interpolation-preview__label {
      color: var(--preview-label-color, #6b7280);
      font-size: 0.75rem;
      margin-right: 0.5rem;
    }

    .interpolation-preview__variable {
      background: var(--preview-variable-bg, #e0f2fe);
      color: var(--preview-variable-color, #0369a1);
      padding: 0.125rem 0.25rem;
      border-radius: 0.125rem;
      font-family: monospace;
    }

    /* Direction Toggle */
    .dir-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      color: var(--dir-toggle-color, #374151);
      background: var(--dir-toggle-bg, #f3f4f6);
      border: 1px solid var(--dir-toggle-border, #d1d5db);
      border-radius: 0.25rem;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .dir-toggle:hover {
      background: var(--dir-toggle-hover-bg, #e5e7eb);
    }

    .dir-toggle[aria-pressed="true"] {
      background: var(--dir-toggle-active-bg, #dbeafe);
      border-color: var(--dir-toggle-active-border, #93c5fd);
      color: var(--dir-toggle-active-color, #1d4ed8);
    }

    .dir-toggle__icon {
      display: inline-flex;
    }

    .dir-toggle__label {
      font-weight: 500;
    }
  `;
}

/**
 * Detect interpolation variables in text.
 */
export function detectInterpolations(
  text: string,
  patterns: InterpolationPattern[] = DEFAULT_INTERPOLATION_PATTERNS
): InterpolationMatch[] {
  const matches: InterpolationMatch[] = [];

  for (const patternDef of patterns) {
    patternDef.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = patternDef.pattern.exec(text)) !== null) {
      matches.push({
        pattern: patternDef.name,
        variable: match[1] ?? match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  return matches;
}

/**
 * Calculate character count severity based on thresholds.
 */
export function getCharCountSeverity(
  count: number,
  softLimit?: number,
  hardLimit?: number
): 'info' | 'warning' | 'error' | null {
  if (hardLimit && count >= hardLimit) {
    return 'error';
  }
  if (softLimit && count >= softLimit) {
    return 'warning';
  }
  return null;
}
