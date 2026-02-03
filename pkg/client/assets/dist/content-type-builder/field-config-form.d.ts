/**
 * Field Configuration Form
 *
 * Modal/drawer UI for configuring a field's properties.
 */
import type { FieldConfigFormConfig } from './types';
import { Modal } from '../shared/modal';
export declare class FieldConfigForm extends Modal {
    private config;
    private field;
    private isNewField;
    constructor(config: FieldConfigFormConfig);
    protected onBeforeHide(): boolean;
    protected renderContent(): string;
    private renderGeneralSection;
    private renderValidationSection;
    private renderAppearanceSection;
    private renderTypeSpecificSection;
    protected bindContentEvents(): void;
    private bindOptionsEvents;
    private bindBlockPickerEvents;
    private showBlockPicker;
    private updateBlockList;
    private removeBlockFromList;
    private handleSave;
    private buildTypeSpecificConfig;
    private showError;
}
//# sourceMappingURL=field-config-form.d.ts.map