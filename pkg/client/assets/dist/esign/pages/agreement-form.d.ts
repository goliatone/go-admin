/**
 * E-Sign Agreement Form Page Controller
 * Handles the 6-step wizard for creating/editing agreements
 *
 * Wizard Steps:
 * 1. Document Selection
 * 2. Agreement Details
 * 3. Participants (Recipients)
 * 4. Field Definitions
 * 5. Field Placement
 * 6. Review & Send
 */
export interface AgreementFormConfig {
    basePath: string;
    apiBasePath?: string;
    isEditMode: boolean;
    createSuccess?: boolean;
    agreementId?: string;
    routes: {
        index: string;
        documents?: string;
        create?: string;
    };
}
export declare class AgreementFormController {
    private readonly config;
    private readonly apiBase;
    private stateManager;
    private syncManager;
    private currentStep;
    private readonly elements;
    constructor(config: AgreementFormConfig);
    init(): Promise<void>;
    private setupEventListeners;
    private checkForSavedProgress;
    private showResumeDialog;
    private hideResumeDialog;
    private resumeSavedProgress;
    private restoreStateToUI;
    private showConflictDialog;
    private hideConflictDialog;
    private updateSyncStatusUI;
    private handleDetailsChange;
    private canNavigateToStep;
    private goToStep;
    private goToNextStep;
    private goToPreviousStep;
    private updateWizardUI;
    private handleFormSubmit;
    destroy(): void;
}
export declare function initAgreementForm(config: AgreementFormConfig): AgreementFormController;
export declare function bootstrapAgreementForm(config: {
    basePath: string;
    apiBasePath?: string;
    isEditMode?: boolean;
    createSuccess?: boolean;
    agreementId?: string;
    routes: {
        index: string;
        documents?: string;
        create?: string;
    };
}): void;
//# sourceMappingURL=agreement-form.d.ts.map