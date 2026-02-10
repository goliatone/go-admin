/**
 * Translation Exchange Manager
 * Handles export, import validation, and apply workflows for translation exchange
 */
import type { TranslationExchangeConfig, TranslationExchangeSelectors, ToastNotifier } from './types.js';
export declare class TranslationExchangeManager {
    private config;
    private selectors;
    private toast;
    private tabExport;
    private tabImport;
    private panelExport;
    private panelImport;
    private exportForm;
    private exportStatus;
    private importFile;
    private importOptions;
    private fileNameEl;
    private validateBtn;
    private applyBtn;
    private validationResults;
    private downloadReportBtn;
    private resultsTable;
    private resultsEmpty;
    private importState;
    constructor(config: TranslationExchangeConfig, selectors?: Partial<TranslationExchangeSelectors>, toast?: ToastNotifier);
    /**
     * Initialize the translation exchange manager
     */
    init(): void;
    /**
     * Destroy the manager and clean up
     */
    destroy(): void;
    private cacheElements;
    private bindEvents;
    private switchTab;
    private handleExport;
    private downloadExportResult;
    private convertToCSV;
    private handleFileSelect;
    private handleFile;
    private handleValidate;
    private handleApply;
    private getImportOptions;
    private displayExchangeResults;
    private renderResultsTable;
    private handleDownloadReport;
    private setExportStatus;
    private setButtonLoading;
    private showError;
    private escapeHtml;
}
//# sourceMappingURL=translation-exchange-manager.d.ts.map