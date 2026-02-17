/**
 * Translator Dashboard Component (Phase 4 - TX-047)
 *
 * Provides a focused work queue for translators with progress and due-date awareness.
 * Card + table hybrid: workload summary + actionable assignments list.
 */
import type { CapabilityGate } from './capability-gate.js';
/**
 * Due state classification from backend
 */
export type DueState = 'overdue' | 'due_soon' | 'on_track' | 'none';
/**
 * Queue state / assignment status
 */
export type QueueState = 'pending' | 'assigned' | 'in_progress' | 'review' | 'approved' | 'published' | 'archived';
/**
 * Content state derived from queue state
 */
export type ContentState = 'draft' | 'review' | 'ready' | 'archived';
/**
 * Assignment priority levels
 */
export type AssignmentPriority = 'low' | 'normal' | 'high' | 'urgent';
/**
 * Action state for review actions
 */
export interface ReviewActionState {
    enabled: boolean;
    reason?: string;
    reason_code?: string;
    permission?: string;
}
/**
 * Assignment row from API
 */
export interface TranslationAssignment {
    id: string;
    translation_group_id: string;
    entity_type: string;
    source_record_id: string;
    target_record_id: string;
    source_locale: string;
    target_locale: string;
    source_title: string;
    source_path: string;
    assignee_id: string;
    assignment_type: string;
    content_state: ContentState;
    queue_state: QueueState;
    status: QueueState;
    priority: AssignmentPriority;
    due_state: DueState;
    due_date?: string;
    updated_at: string;
    created_at: string;
    review_actions: {
        submit_review: ReviewActionState;
        approve: ReviewActionState;
        reject: ReviewActionState;
    };
}
/**
 * My Work API response
 */
export interface MyWorkResponse {
    scope: 'my_work';
    user_id: string;
    summary: {
        total: number;
        overdue: number;
        due_soon: number;
        on_track: number;
        none: number;
        review: number;
    };
    assignments: TranslationAssignment[];
    items: TranslationAssignment[];
    total: number;
    page: number;
    per_page: number;
    updated_at: string;
}
/**
 * Queue API response
 */
export interface QueueResponse {
    scope: 'queue';
    summary: {
        total: number;
        by_queue_state: Record<string, number>;
        by_due_state: Record<string, number>;
    };
    assignments: TranslationAssignment[];
    items: TranslationAssignment[];
    total: number;
    page: number;
    per_page: number;
    updated_at: string;
}
/**
 * Filter preset definition
 */
export interface FilterPreset {
    id: string;
    label: string;
    icon?: string;
    filters: Record<string, string>;
    badge?: () => number | string | null;
}
/**
 * Dashboard state
 */
export type DashboardState = 'loading' | 'loaded' | 'error' | 'empty';
/**
 * Dashboard configuration
 */
export interface TranslatorDashboardConfig {
    /** API endpoint for my-work data */
    myWorkEndpoint: string;
    /** API endpoint for queue data (optional for unified view) */
    queueEndpoint?: string;
    /** Panel base URL for opening assignments */
    panelBaseUrl?: string;
    /** Capability gate for permission checks */
    capabilityGate?: CapabilityGate;
    /** Custom filter presets */
    filterPresets?: FilterPreset[];
    /** Auto-refresh interval in ms (0 = disabled) */
    refreshInterval?: number;
    /** Callback when assignment is clicked */
    onAssignmentClick?: (assignment: TranslationAssignment) => void;
    /** Callback when action is clicked */
    onActionClick?: (action: string, assignment: TranslationAssignment) => Promise<void>;
    /** Custom labels (merged with defaults) */
    labels?: Partial<DashboardLabels>;
}
/**
 * Customizable labels
 */
export interface DashboardLabels {
    title: string;
    myAssignments: string;
    dueSoon: string;
    needsReview: string;
    all: string;
    overdue: string;
    onTrack: string;
    noAssignments: string;
    noAssignmentsDescription: string;
    loading: string;
    error: string;
    retry: string;
    submitForReview: string;
    approve: string;
    reject: string;
    openAssignment: string;
    dueDate: string;
    priority: string;
    status: string;
    targetLocale: string;
    sourceTitle: string;
}
/**
 * Default filter presets for translator dashboard
 */
export declare const DEFAULT_FILTER_PRESETS: FilterPreset[];
/**
 * Translator Dashboard component
 */
export declare class TranslatorDashboard {
    private config;
    private container;
    private state;
    private data;
    private error;
    private activePreset;
    private refreshTimer;
    constructor(config: TranslatorDashboardConfig);
    /**
     * Mount the dashboard to a container element
     */
    mount(container: HTMLElement): void;
    /**
     * Unmount and cleanup
     */
    unmount(): void;
    /**
     * Refresh dashboard data
     */
    refresh(): Promise<void>;
    /**
     * Set active filter preset
     */
    setActivePreset(presetId: string): void;
    /**
     * Get current state
     */
    getState(): DashboardState;
    /**
     * Get current data
     */
    getData(): MyWorkResponse | null;
    private startAutoRefresh;
    private stopAutoRefresh;
    private loadData;
    private render;
    private renderHeader;
    private renderSummaryCards;
    private renderSummaryCard;
    private renderSummaryLoading;
    private renderFilterBar;
    private renderFilterPreset;
    private renderContent;
    private renderLoading;
    private renderError;
    private renderEmpty;
    private renderAssignmentList;
    private renderAssignmentRow;
    private renderAssignmentActions;
    private attachEventListeners;
    private openAssignment;
    private buildAssignmentEditURL;
}
/**
 * Get CSS styles for translator dashboard
 */
export declare function getTranslatorDashboardStyles(): string;
/**
 * Create and mount a translator dashboard
 */
export declare function createTranslatorDashboard(container: HTMLElement, config: TranslatorDashboardConfig): TranslatorDashboard;
/**
 * Initialize translator dashboard from data attributes
 */
export declare function initTranslatorDashboard(container: HTMLElement): TranslatorDashboard | null;
//# sourceMappingURL=translator-dashboard.d.ts.map