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
 * Icons for action namespaces (first segment of dotted action strings)
 */
export declare const NAMESPACE_ICONS: Record<string, string>;
/**
 * Parse a dotted action string like "debug.repl.close" into namespace and action
 */
export interface ParsedAction {
    namespace: string;
    action: string;
    icon: string;
    category: ActionCategory;
}
export declare function resolveActionLabel(actionStr: string, labels?: Record<string, string>): string;
export declare function parseActionString(actionStr: string, labels?: Record<string, string>): ParsedAction;
/**
 * Get the action category for a verb
 */
export declare function getActionCategory(verb: string): ActionCategory;
/**
 * Parse an object string (format: "type:id") into its components
 */
export declare function parseObject(object: string): ParsedObject;
/**
 * Escape HTML to prevent XSS
 */
export declare function escapeHtml(text: string): string;
/**
 * Shorten a UUID or long string to first N characters (like git short hash)
 */
export declare function shortenId(id: string, length?: number): string;
/**
 * Format an activity entry into a human-readable sentence
 */
export declare function formatActivitySentence(entry: ActivityEntry, labels?: Record<string, string>): string;
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
 * Format metadata for expanded display (grid-friendly items)
 */
export declare function formatMetadataExpanded(metadata: Record<string, unknown> | undefined): string;
/**
 * Format channel for display (shorten UUIDs)
 */
export declare function formatChannel(channel: string | undefined): string;
/**
 * Get CSS class for action category
 */
export declare function getActionClass(category: ActionCategory): string;
/**
 * Get icon HTML for action category
 */
export declare function getActionIconHtml(category: ActionCategory): string;
//# sourceMappingURL=formatters.d.ts.map