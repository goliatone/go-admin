export const WIZARD_STEP = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6,
} as const;

export type WizardStepID = (typeof WIZARD_STEP)[keyof typeof WIZARD_STEP];

export const TOTAL_WIZARD_STEPS: WizardStepID = WIZARD_STEP.REVIEW;

export const WIZARD_NEXT_STEP_LABELS: Record<number, string> = {
  [WIZARD_STEP.DOCUMENT]: 'Details',
  [WIZARD_STEP.DETAILS]: 'Participants',
  [WIZARD_STEP.PARTICIPANTS]: 'Fields',
  [WIZARD_STEP.FIELDS]: 'Placement',
  [WIZARD_STEP.PLACEMENT]: 'Review',
};

export const PLACEMENT_SOURCE = {
  AUTO: 'auto',
  MANUAL: 'manual',
  AUTO_FALLBACK: 'auto_fallback',
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: 'auto_linked',
} as const;

export type PlacementSource = (typeof PLACEMENT_SOURCE)[keyof typeof PLACEMENT_SOURCE] | string;

/**
 * Default dimensions for linked field placements
 */
export const LINKED_PLACEMENT_DEFAULTS = {
  /** Vertical offset between linked field placements on the same page */
  VERTICAL_OFFSET: 60,
  /** Maximum number of linked fields per page before wrapping */
  MAX_PER_PAGE: 10,
} as const;

/**
 * Document preview card default configuration
 */
export const PREVIEW_CARD_DEFAULTS = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200,
  /** Cache TTL in milliseconds (30 minutes) */
  CACHE_TTL_MS: 30 * 60 * 1000,
} as const;

/**
 * Steps where the preview card should be visible
 */
export const PREVIEW_CARD_VISIBLE_STEPS = [
  WIZARD_STEP.DOCUMENT,
  WIZARD_STEP.DETAILS,
  WIZARD_STEP.PARTICIPANTS,
  WIZARD_STEP.FIELDS,
  WIZARD_STEP.REVIEW,
] as const;
