/**
 * Activity Feed Formatters
 * Handles action categorization, sentence formatting, and metadata display
 */
import type { ActivityEntry, ActionCategory, ParsedObject, ActorType } from './types.js';
/**
 * Icons for actor types (using iconoir icon names)
 */
export declare const ACTOR_TYPE_ICONS: Record<ActorType, string>;
/**
 * Labels for actor types
 */
export declare const ACTOR_TYPE_LABELS: Record<ActorType, string>;
/**
 * Check if a value looks like it's been masked (hashed or partially hidden)
 */
export declare function isMaskedValue(value: unknown): boolean;
/**
 * Check if metadata is empty or hidden (support role scenario)
 */
export declare function isMetadataHidden(metadata: Record<string, unknown> | undefined): boolean;
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
export declare function resolveActorLabel(entry: ActivityEntry): string;
export declare function resolveObjectDisplay(entry: ActivityEntry): string;
/**
 * Check if the object has been deleted
 */
export declare function isObjectDeleted(entry: ActivityEntry): boolean;
/**
 * Get the actor type from metadata
 */
export declare function getActorType(entry: ActivityEntry): ActorType;
/**
 * Get the actor email from metadata (may be masked)
 */
export declare function getActorEmail(entry: ActivityEntry): string;
/**
 * Get the session ID from metadata
 */
export declare function getSessionId(entry: ActivityEntry): string;
/**
 * Get enrichment info (enriched_at and enricher_version)
 */
export declare function getEnrichmentInfo(entry: ActivityEntry): {
    enrichedAt: string;
    enricherVersion: string;
} | null;
/**
 * Escape HTML to prevent XSS
 */
export declare function escapeHtml(text: string): string;
/**
 * Shorten a UUID or long string to first N characters (like git short hash)
 */
export declare function shortenId(id: string, length?: number): string;
/**
 * Options for formatting activity sentences
 */
export interface FormatActivitySentenceOptions {
    /** Include actor type badge before the actor name (for table view) */
    showActorTypeBadge?: boolean;
}
/**
 * Format an activity entry into a human-readable sentence
 */
export declare function formatActivitySentence(entry: ActivityEntry, labels?: Record<string, string>, options?: FormatActivitySentenceOptions): string;
/**
 * Format a timestamp for display
 */
export declare function formatTimestamp(value: string): string;
/**
 * Format relative time in short format (e.g., "2h ago")
 */
export declare function formatRelativeTime(value: string): string;
/**
 * Format relative time using Intl.RelativeTimeFormat for natural language output
 * (e.g., "2 hours ago", "yesterday", "3 days ago")
 */
export declare function formatRelativeTimeIntl(value: string): string;
/**
 * Get date label for timeline grouping ("Today", "Yesterday", or formatted date)
 */
export declare function getDateGroupLabel(date: Date): string;
/**
 * Get the start of day for a given date (midnight in local timezone)
 */
export declare function getStartOfDay(date: Date): Date;
/**
 * Get a stable date key for grouping (YYYY-MM-DD format)
 */
export declare function getDateKey(date: Date): string;
/**
 * Count the number of fields in metadata
 */
export declare function countMetadataFields(metadata: Record<string, unknown> | undefined): number;
/**
 * Get a summary of metadata changes
 * Returns a summary string, or 'hidden' for support role scenario, or empty for no metadata
 */
export declare function getMetadataSummary(metadata: Record<string, unknown> | undefined): string;
/**
 * Format metadata for expanded display (grid-friendly items)
 */
export declare function formatMetadataExpanded(metadata: Record<string, unknown> | undefined): string;
/**
 * Format enrichment debug info for display (collapsible diagnostics panel)
 */
export declare function formatEnrichmentDebugInfo(entry: ActivityEntry): string;
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
/**
 * Get actor type icon HTML with optional badge styling
 */
export declare function getActorTypeIconHtml(actorType: ActorType, options?: {
    badge?: boolean;
    size?: 'sm' | 'md' | 'lg';
}): string;
/**
 * Format actor display with type icon
 */
export declare function formatActorWithType(entry: ActivityEntry): string;
/**
 * Shorten a session ID for display
 */
export declare function formatSessionId(sessionId: string, length?: number): string;
/**
 * Get session group label for timeline display
 */
export declare function getSessionGroupLabel(sessionId: string): string;
//# sourceMappingURL=formatters.d.ts.map