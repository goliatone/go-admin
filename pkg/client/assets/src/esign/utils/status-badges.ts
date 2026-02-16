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
export const AGREEMENT_STATUS_BADGES: Record<AgreementStatus, BadgeConfig> = {
  draft: {
    label: 'Draft',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    dotClass: 'bg-gray-400',
  },
  sent: {
    label: 'Sent',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-400',
  },
  completed: {
    label: 'Completed',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    dotClass: 'bg-green-500',
  },
  voided: {
    label: 'Voided',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
  declined: {
    label: 'Declined',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
  expired: {
    label: 'Expired',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-500',
    dotClass: 'bg-gray-400',
  },
};

/**
 * Get badge configuration for an agreement status
 */
export function getAgreementStatusBadge(
  status: AgreementStatus | string
): BadgeConfig {
  const normalizedStatus = String(status || '')
    .trim()
    .toLowerCase() as AgreementStatus;
  return (
    AGREEMENT_STATUS_BADGES[normalizedStatus] || {
      label: status || 'Unknown',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-600',
      dotClass: 'bg-gray-400',
    }
  );
}

/**
 * Render a status badge as HTML
 */
export function renderStatusBadge(
  status: AgreementStatus | string,
  options?: {
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
): string {
  const badge = getAgreementStatusBadge(status);
  const showDot = options?.showDot ?? false;
  const size = options?.size ?? 'sm';

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const dotHtml = showDot
    ? `<span class="w-2 h-2 rounded-full ${badge.dotClass} mr-1.5" aria-hidden="true"></span>`
    : '';

  return `<span class="inline-flex items-center ${sizeClasses[size]} rounded-full font-medium ${badge.bgClass} ${badge.textClass}">${dotHtml}${badge.label}</span>`;
}

/**
 * Render a status badge element (returns DOM element)
 */
export function createStatusBadgeElement(
  status: AgreementStatus | string,
  options?: {
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
): HTMLSpanElement {
  const container = document.createElement('span');
  container.innerHTML = renderStatusBadge(status, options);
  return container.firstElementChild as HTMLSpanElement;
}

/**
 * Update an existing badge element with new status
 */
export function updateStatusBadge(
  element: HTMLElement,
  status: AgreementStatus | string,
  options?: {
    showDot?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
): void {
  const badge = getAgreementStatusBadge(status);
  const size = options?.size ?? 'sm';

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  // Remove old status classes
  element.className = '';
  element.className = `inline-flex items-center ${sizeClasses[size]} rounded-full font-medium ${badge.bgClass} ${badge.textClass}`;

  // Update content
  const showDot = options?.showDot ?? false;
  if (showDot) {
    const existingDot = element.querySelector('.rounded-full');
    if (existingDot) {
      existingDot.className = `w-2 h-2 rounded-full ${badge.dotClass} mr-1.5`;
    } else {
      const dotSpan = document.createElement('span');
      dotSpan.className = `w-2 h-2 rounded-full ${badge.dotClass} mr-1.5`;
      dotSpan.setAttribute('aria-hidden', 'true');
      element.prepend(dotSpan);
    }
  }

  // Update label text (find text node or last child)
  const textContent = element.childNodes[element.childNodes.length - 1];
  if (textContent && textContent.nodeType === Node.TEXT_NODE) {
    textContent.textContent = badge.label;
  } else {
    element.appendChild(document.createTextNode(badge.label));
  }
}
