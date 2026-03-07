import type { AgreementDocumentOption, EffectivePageResult, ExpandedRuleField, FieldRuleFormPayload, FieldRuleState, NormalizedPlacementInstance, PlacementFormPayload, RawPlacementInstance, RuleExpansionPageRange } from './contracts';
export declare function parsePositiveInt(value: unknown, fallback?: number): number;
export declare function parseFiniteNumber(value: unknown, fallback?: number): number;
export declare function clampNumber(value: number, min: number, max: number): number;
export declare function normalizeOptionalPageNumber(value: unknown, maxPage: number): number;
export declare function clampPageNumber(value: unknown, maxPage: number, fallback?: number): number;
export declare function normalizePageRange(fromPage: unknown, toPage: unknown, terminalPage: unknown): RuleExpansionPageRange;
export declare function parseExcludePagesCSV(raw: unknown): number[];
export declare function normalizeFieldRuleState(input: Partial<FieldRuleState> & Record<string, unknown>, terminalPage: number): FieldRuleState;
export declare function toFieldRuleFormPayload(rule: FieldRuleState): FieldRuleFormPayload;
export declare function resolveRuleExpansionBaseID(rule: Partial<FieldRuleState>, index: number): string;
export declare function expandRuleDefinitionsForPreview(rules: Array<Partial<FieldRuleState>>, terminalPage: number): ExpandedRuleField[];
/**
 * Computes the effective pages that will be generated for an initials_each_page rule.
 * This matches the backend expansion logic in panel_repositories.go.
 *
 * @param fromPage - Start of range (defaults to 1 if <= 0)
 * @param toPage - End of range (defaults to terminalPage if <= 0)
 * @param terminalPage - Document page count (used for excludeLastPage)
 * @param excludeLastPage - If true, excludes terminalPage from generation
 * @param excludePages - Array of specific pages to exclude
 * @returns EffectivePageResult with the actual pages that will be generated
 */
export declare function computeEffectiveRulePages(fromPage: number, toPage: number, terminalPage: number, excludeLastPage: boolean, excludePages: number[]): EffectivePageResult;
/**
 * Formats the effective page result into a human-readable summary string.
 * Shows explicit derived range to avoid ambiguity with excludeLastPage behavior.
 *
 * Examples:
 * - "pages 1, 2, 3, 4" (small count, listed)
 * - "pages 1-10" (contiguous range)
 * - "pages 1-3, 5-8, 10" (non-contiguous with gaps)
 * - "(no pages - all excluded)" (empty result)
 */
export declare function formatEffectivePageRange(result: EffectivePageResult): string;
export declare function normalizeDocumentOption(raw: Record<string, unknown> | null | undefined): AgreementDocumentOption;
export declare function normalizePlacementSource(value: unknown): string;
export declare function normalizePlacementInstance(instance: RawPlacementInstance, index?: number): NormalizedPlacementInstance;
export declare function toPlacementFormPayload(instance: RawPlacementInstance, index?: number): PlacementFormPayload;
//# sourceMappingURL=normalization.d.ts.map