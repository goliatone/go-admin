/**
 * Payload Input Modal
 *
 * Reusable modal for collecting payload values from users
 * before executing actions that require input.
 */
import { Modal } from '../shared/modal.js';
export interface PayloadModalFieldOption {
    value: string;
    label: string;
    /** Optional description/hint for the option */
    description?: string;
    /** Whether this option is recommended (for preselection) */
    recommended?: boolean;
}
export interface PayloadModalField {
    name: string;
    label: string;
    description?: string;
    value: string;
    type: string;
    options?: PayloadModalFieldOption[];
}
export interface PayloadModalConfig {
    title: string;
    fields: PayloadModalField[];
    confirmLabel?: string;
    cancelLabel?: string;
}
export declare class PayloadInputModal extends Modal {
    private readonly modalConfig;
    private readonly onConfirm;
    private readonly onCancel;
    private resolved;
    constructor(config: PayloadModalConfig, onConfirm: (values: Record<string, string>) => void, onCancel: () => void);
    /**
     * Show modal and return promise that resolves with values or null if cancelled
     */
    static prompt(config: PayloadModalConfig): Promise<Record<string, string> | null>;
    protected renderContent(): string;
    protected bindContentEvents(): void;
    protected onBeforeHide(): boolean;
    private renderField;
    private renderSelect;
    private renderRadioGroup;
    private renderInput;
    private clearErrors;
    private showFieldError;
}
//# sourceMappingURL=payload-modal.d.ts.map