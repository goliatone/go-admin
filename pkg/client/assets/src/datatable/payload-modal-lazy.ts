/**
 * Lazy payload modal proxy.
 *
 * Keeps payload modal code out of the main datatable chunk while exposing
 * a stable PayloadInputModal API for callers that patch prompt() in tests.
 */
export const PayloadInputModal = {
  async prompt(
    config: import('./payload-modal.js').PayloadModalConfig
  ): Promise<Record<string, string> | null> {
    const { PayloadInputModal: Modal } = await import('./payload-modal.js');
    return Modal.prompt(config);
  },
};
