/**
 * Import Modal Component
 *
 * A reusable modal component for bulk file imports with drag & drop support,
 * file preview, results display with summary cards, fullscreen toggle,
 * and result filtering.
 *
 * Usage:
 *   import { ImportModal } from '/admin/assets/components/import-modal.js';
 *
 *   const importModal = new ImportModal({
 *     modalId: 'import-users-modal',
 *     endpoint: '/admin/api/users-import',
 *     onSuccess: (summary) => grid.refresh(),
 *     notifier: window.toastManager
 *   });
 *
 *   // Open modal
 *   document.getElementById('import-btn')?.addEventListener('click', () => importModal.open());
 */
type ImportModalNotifier = {
    success: (message: string) => void;
    error: (message: string) => void;
};
type ImportModalOptions = {
    modalId?: string;
    endpoint?: string;
    apiBasePath?: string;
    onSuccess?: (summary: Record<string, number>) => void;
    notifier?: ImportModalNotifier;
    resourceName?: string;
};
/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted size string
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Import Modal class for handling bulk file imports
 */
export declare class ImportModal {
    modalId: string;
    endpoint: string;
    onSuccess: (summary: Record<string, number>) => void;
    notifier: ImportModalNotifier;
    resourceName: string;
    elements: Record<string, HTMLElement | null>;
    isFullscreen: boolean;
    currentFilter: string;
    resultItems: any[];
    /**
     * @param options - Configuration options
     * @param options.modalId - ID of the modal element
     * @param options.endpoint - API endpoint for file upload
     * @param options.onSuccess - Callback when import succeeds (receives summary)
     * @param options.notifier - Toast notification manager (with success/error methods)
     * @param options.resourceName - Name of resource being imported (default: 'items')
     */
    constructor(options?: ImportModalOptions);
    /**
     * Bind DOM elements
     */
    bindElements(): void;
    /**
     * Bind event listeners
     */
    bindEvents(): void;
    /**
     * Bind filter button events
     */
    bindFilterButtons(): void;
    /**
     * Set the current filter and update display
     * @param filter - 'all', 'succeeded', or 'failed'
     */
    setFilter(filter: string): void;
    /**
     * Apply the current filter to results
     */
    applyFilter(): void;
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen(): void;
    /**
     * Bind drag and drop events
     */
    bindDragAndDrop(): void;
    /**
     * Update the file preview display
     */
    updateFilePreview(): void;
    /**
     * Reset the modal to initial state
     */
    reset(): void;
    /**
     * Set loading state
     * @param isLoading - Whether loading is in progress
     */
    setLoading(isLoading: boolean): void;
    /**
     * Open the modal
     */
    open(): void;
    /**
     * Close the modal
     */
    close(): void;
    /**
     * Build a table cell element
     * @param value - Cell content
     * @param className - CSS classes
     */
    buildCell(value: string, className: string): HTMLTableCellElement;
    /**
     * Render import results
     * @param payload - API response payload
     */
    renderResults(payload: any): void;
    /**
     * Handle form submission
     * @param event - Submit event
     */
    handleSubmit(event: Event): Promise<void>;
}
export default ImportModal;
//# sourceMappingURL=import-modal.d.ts.map