/**
 * Field Configuration Form
 *
 * Modal/drawer UI for configuring a field's properties.
 */
import type { FieldConfigFormConfig } from './types';
export declare class FieldConfigForm {
    private config;
    private container;
    private backdrop;
    private field;
    private isNewField;
    constructor(config: FieldConfigFormConfig);
    /**
     * Show the field config form modal
     */
    show(): void;
    /**
     * Hide the field config form modal
     */
    hide(): void;
    private render;
    private renderGeneralSection;
    private renderValidationSection;
    private renderAppearanceSection;
    private renderTypeSpecificSection;
    private bindEvents;
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