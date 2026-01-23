/**
 * Activity Feed Formatters
 * Handles action categorization, sentence formatting, and metadata display
 */
import type { ActivityEntry, ActionCategory, ParsedObject } from './types.js';
/**
 * Icons for each action category (using iconoir icon names)
 */
export declare const ACTION_ICONS: Record<ActionCategory, string>;
/**
 * Get the action category for a verb
 */
export declare function getActionCategory(verb: string): ActionCategory;
/**
 * Parse an object string (format: "type:id") into its components
 */
export declare function parseObject(object: string): ParsedObject;
/**
 * Format an activity entry into a human-readable sentence
 */
export declare function formatActivitySentence(entry: ActivityEntry): string;
/**
 * Format a timestamp for display
 */
export declare function formatTimestamp(value: string): string;
/**
 * Format relative time (e.g., "2 hours ago")
 */
export declare function formatRelativeTime(value: string): string;
/**
 * Count the number of fields in metadata
 */
export declare function countMetadataFields(metadata: Record<string, unknown> | undefined): number;
/**
 * Get a summary of metadata changes
 */
export declare function getMetadataSummary(metadata: Record<string, unknown> | undefined): string;
/**
 * Format metadata for expanded display
 */
export declare function formatMetadataExpanded(metadata: Record<string, unknown> | undefined): string;
/**
 * Escape HTML to prevent XSS
 */
export declare function escapeHtml(text: string): string;
/**
 * Get CSS class for action category
 */
export declare function getActionClass(category: ActionCategory): string;
/**
 * Get icon HTML for action category
 */
export declare function getActionIconHtml(category: ActionCategory): string;
//# sourceMappingURL=formatters.d.ts.map