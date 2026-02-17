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
/**
 * Default interpolation patterns for common template syntaxes.
 */
export declare const DEFAULT_INTERPOLATION_PATTERNS: InterpolationPattern[];
/**
 * Default sample values for interpolation preview.
 */
export declare const DEFAULT_SAMPLE_VALUES: Record<string, string>;
/**
 * Character counter for text inputs with threshold support.
 */
export declare class CharacterCounter {
    private config;
    private counterEl;
    private boundUpdate;
    constructor(config: CharacterCounterConfig);
    /**
     * Get current character count.
     */
    getCount(): number;
    /**
     * Get current severity based on thresholds.
     */
    getSeverity(): 'info' | 'warning' | 'error' | null;
    /**
     * Update the counter display.
     */
    update(): void;
    /**
     * Render the counter HTML.
     */
    render(): string;
    /**
     * Clean up event listeners.
     */
    destroy(): void;
    private init;
    private buildDefaultThresholds;
    private buildCounterClasses;
    private defaultFormatDisplay;
}
/**
 * Interpolation preview for template variables in translation text.
 */
export declare class InterpolationPreview {
    private config;
    private previewEl;
    private boundUpdate;
    constructor(config: InterpolationPreviewConfig);
    /**
     * Get all interpolation matches in the current text.
     */
    getMatches(): InterpolationMatch[];
    /**
     * Get preview text with sample values substituted.
     */
    getPreviewText(): string;
    /**
     * Update the preview display.
     */
    update(): void;
    /**
     * Render preview with highlighted variables.
     */
    renderHighlightedPreview(): string;
    /**
     * Render the preview HTML structure.
     */
    render(): string;
    /**
     * Clean up event listeners.
     */
    destroy(): void;
    private init;
    private getSampleValue;
    private escapeHtml;
}
/**
 * RTL/LTR direction toggle for text inputs.
 */
export declare class DirectionToggle {
    private config;
    private toggleEl;
    private currentDirection;
    constructor(config: DirectionToggleConfig);
    /**
     * Get current text direction.
     */
    getDirection(): 'ltr' | 'rtl';
    /**
     * Set text direction.
     */
    setDirection(direction: 'ltr' | 'rtl'): void;
    /**
     * Toggle between LTR and RTL.
     */
    toggle(): void;
    /**
     * Render the toggle button HTML.
     */
    render(): string;
    /**
     * Clean up.
     */
    destroy(): void;
    private init;
    private resolveInitialDirection;
    private updateToggle;
    private ltrIcon;
    private rtlIcon;
}
/**
 * Initialize all field helpers for a form.
 */
export declare function initFieldHelpers(form: HTMLFormElement, options?: {
    charCounterFields?: string[];
    charCounterConfig?: Partial<CharacterCounterConfig>;
    interpolationFields?: string[];
    interpolationConfig?: Partial<InterpolationPreviewConfig>;
    directionToggleFields?: string[];
    directionToggleConfig?: Partial<DirectionToggleConfig>;
}): {
    counters: CharacterCounter[];
    previews: InterpolationPreview[];
    toggles: DirectionToggle[];
    destroy: () => void;
};
/**
 * Render standalone character counter HTML.
 */
export declare function renderCharacterCounter(count: number, limit?: number, severity?: 'info' | 'warning' | 'error' | null, classPrefix?: string): string;
/**
 * Render standalone direction toggle HTML.
 */
export declare function renderDirectionToggle(direction: 'ltr' | 'rtl', classPrefix?: string): string;
/**
 * Get CSS styles for field helpers.
 */
export declare function getFieldHelperStyles(): string;
/**
 * Detect interpolation variables in text.
 */
export declare function detectInterpolations(text: string, patterns?: InterpolationPattern[]): InterpolationMatch[];
/**
 * Calculate character count severity based on thresholds.
 */
export declare function getCharCountSeverity(count: number, softLimit?: number, hardLimit?: number): 'info' | 'warning' | 'error' | null;
//# sourceMappingURL=field-helpers.d.ts.map