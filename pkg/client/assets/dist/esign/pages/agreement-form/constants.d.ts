export declare const WIZARD_STEP: {
    readonly DOCUMENT: 1;
    readonly DETAILS: 2;
    readonly PARTICIPANTS: 3;
    readonly FIELDS: 4;
    readonly PLACEMENT: 5;
    readonly REVIEW: 6;
};
export type WizardStepID = (typeof WIZARD_STEP)[keyof typeof WIZARD_STEP];
export declare const TOTAL_WIZARD_STEPS: WizardStepID;
export declare const WIZARD_NEXT_STEP_LABELS: Record<number, string>;
export declare const PLACEMENT_SOURCE: {
    readonly AUTO: "auto";
    readonly MANUAL: "manual";
    readonly AUTO_FALLBACK: "auto_fallback";
    /** Placement was auto-created by copying from a linked field in the same link group */
    readonly AUTO_LINKED: "auto_linked";
};
export type PlacementSource = (typeof PLACEMENT_SOURCE)[keyof typeof PLACEMENT_SOURCE] | string;
/**
 * Default dimensions for linked field placements
 */
export declare const LINKED_PLACEMENT_DEFAULTS: {
    /** Vertical offset between linked field placements on the same page */
    readonly VERTICAL_OFFSET: 60;
    /** Maximum number of linked fields per page before wrapping */
    readonly MAX_PER_PAGE: 10;
};
/**
 * Document preview card default configuration
 */
export declare const PREVIEW_CARD_DEFAULTS: {
    /** Maximum thumbnail width in pixels */
    readonly THUMBNAIL_MAX_WIDTH: 280;
    /** Maximum thumbnail height in pixels */
    readonly THUMBNAIL_MAX_HEIGHT: 200;
    /** Cache TTL in milliseconds (30 minutes) */
    readonly CACHE_TTL_MS: number;
};
/**
 * Steps where the preview card should be visible
 */
export declare const PREVIEW_CARD_VISIBLE_STEPS: readonly [1, 2, 3, 4, 6];
//# sourceMappingURL=constants.d.ts.map