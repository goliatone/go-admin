import type { DoctorReport, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
/**
 * Options for rendering the doctor panel
 */
export type DoctorPanelOptions = PanelOptions & {
    /** Whether to show the raw JSON section. Defaults to true. */
    showRawJSON?: boolean;
    /** Whether to show only problematic checks. Defaults to false. */
    problemsOnly?: boolean;
};
/**
 * Render the full doctor panel
 */
export declare function renderDoctorPanel(report: DoctorReport, styles: StyleConfig, options?: DoctorPanelOptions): string;
/**
 * Render a compact version for the toolbar
 */
export declare function renderDoctorPanelCompact(report: DoctorReport, styles: StyleConfig): string;
//# sourceMappingURL=doctor.d.ts.map