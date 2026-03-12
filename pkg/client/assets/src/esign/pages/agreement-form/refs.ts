export interface AgreementFormRefs {
  marker: HTMLElement | null;
  form: {
    root: HTMLFormElement;
    submitBtn: HTMLElement;
    wizardSaveBtn: HTMLElement | null;
    announcements: HTMLElement | null;
    documentIdInput: HTMLInputElement;
    documentPageCountInput: HTMLInputElement | null;
    titleInput: HTMLInputElement;
    messageInput: HTMLTextAreaElement | HTMLInputElement;
  };
  ownership: {
    banner: HTMLElement | null;
    message: HTMLElement | null;
    takeControlBtn: HTMLElement | null;
    reloadBtn: HTMLElement | null;
  };
  sync: {
    indicator: HTMLElement | null;
    icon: HTMLElement | null;
    text: HTMLElement | null;
    retryBtn: HTMLElement | null;
  };
  conflict: {
    modal: HTMLElement | null;
    localTime: HTMLElement | null;
    serverRevision: HTMLElement | null;
    serverTime: HTMLElement | null;
  };
}

function findById<T extends HTMLElement = HTMLElement>(root: ParentNode, id: string): T | null {
  if (root instanceof Document) {
    return root.getElementById(id) as T | null;
  }
  return root.querySelector<T>(`#${id}`);
}

function requireById<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  id: string,
  label: string,
): T {
  const element = findById<T>(root, id);
  if (!element) {
    throw new Error(`Agreement form boot failed: missing required ${label} element (#${id})`);
  }
  return element;
}

export function collectAgreementFormRefs(root: ParentNode = document): AgreementFormRefs {
  return {
    marker: findById(root, 'esign-page-config'),
    form: {
      root: requireById<HTMLFormElement>(root, 'agreement-form', 'form'),
      submitBtn: requireById(root, 'submit-btn', 'submit button'),
      wizardSaveBtn: findById(root, 'wizard-save-btn'),
      announcements: findById(root, 'form-announcements'),
      documentIdInput: requireById<HTMLInputElement>(root, 'document_id', 'document selector'),
      documentPageCountInput: findById<HTMLInputElement>(root, 'document_page_count'),
      titleInput: requireById<HTMLInputElement>(root, 'title', 'title input'),
      messageInput: requireById<HTMLTextAreaElement | HTMLInputElement>(root, 'message', 'message input'),
    },
    ownership: {
      banner: findById(root, 'active-tab-banner'),
      message: findById(root, 'active-tab-message'),
      takeControlBtn: findById(root, 'active-tab-take-control-btn'),
      reloadBtn: findById(root, 'active-tab-reload-btn'),
    },
    sync: {
      indicator: findById(root, 'sync-status-indicator'),
      icon: findById(root, 'sync-status-icon'),
      text: findById(root, 'sync-status-text'),
      retryBtn: findById(root, 'sync-retry-btn'),
    },
    conflict: {
      modal: findById(root, 'conflict-dialog-modal'),
      localTime: findById(root, 'conflict-local-time'),
      serverRevision: findById(root, 'conflict-server-revision'),
      serverTime: findById(root, 'conflict-server-time'),
    },
  };
}
