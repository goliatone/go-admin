/**
 * E-Sign Status Badges
 * Status badge rendering utilities for agreements and documents
 */
import type { AgreementStatus } from '../types.js';
export interface BadgeConfig {
    label: string;
    bgClass: string;
    textClass: string;
    dotClass?: string;
}
/**
 * Agreement status badge configurations
 */
export declare const AGREEMENT_STATUS_BADGES: Record<AgreementStatus, BadgeConfig>;
/**
 * Get badge configuration for an agreement status
 */
export declare function getAgreementStatusBadge(status: AgreementStatus | string): BadgeConfig;
/**
 * Render a status badge as HTML
 */
export declare function renderStatusBadge(status: AgreementStatus | string, options?: {
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
}): string;
/**
 * Render a status badge element (returns DOM element)
 */
export declare function createStatusBadgeElement(status: AgreementStatus | string, options?: {
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
}): HTMLSpanElement;
/**
 * Update an existing badge element with new status
 */
export declare function updateStatusBadge(element: HTMLElement, status: AgreementStatus | string, options?: {
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
}): void;
//# sourceMappingURL=status-badges.d.ts.map