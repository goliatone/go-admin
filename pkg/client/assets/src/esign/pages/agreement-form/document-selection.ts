// @ts-nocheck

import { normalizeDocumentOption, parsePositiveInt } from './normalization';

export function createDocumentSelectionController(options = {}) {
  const {
    apiBase,
    apiVersionBase,
    currentUserID,
    documentsUploadURL,
    isEditMode,
    titleSource,
    normalizeTitleSource,
    stateManager,
    previewCard,
    parseAPIError,
    announceError,
    showToast,
    mapUserFacingError,
    renderFieldRulePreview,
  } = options;

  const documentIdInput = document.getElementById('document_id');
  const selectedDocument = document.getElementById('selected-document');
  const documentPicker = document.getElementById('document-picker');
  const documentSearch = document.getElementById('document-search');
  const documentList = document.getElementById('document-list');
  const changeDocumentBtn = document.getElementById('change-document-btn');
  const selectedDocumentTitle = document.getElementById('selected-document-title');
  const selectedDocumentInfo = document.getElementById('selected-document-info');
  const documentPageCountInput = document.getElementById('document_page_count');
  const documentRemediationPanel = document.getElementById('document-remediation-panel');
  const documentRemediationMessage = document.getElementById('document-remediation-message');
  const documentRemediationStatus = document.getElementById('document-remediation-status');
  const documentRemediationTriggerBtn = document.getElementById('document-remediation-trigger-btn');
  const documentRemediationDismissBtn = document.getElementById('document-remediation-dismiss-btn');
  const agreementTitleInput = document.getElementById('title');

  const TYPEAHEAD_DEBOUNCE_MS = 300;
  const RECENT_DOCUMENTS_LIMIT = 5;
  const SEARCH_RESULTS_LIMIT = 10;

  const documentTypeahead = document.getElementById('document-typeahead');
  const documentTypeaheadDropdown = document.getElementById('document-typeahead-dropdown');
  const documentRecentSection = document.getElementById('document-recent-section');
  const documentRecentList = document.getElementById('document-recent-list');
  const documentSearchSection = document.getElementById('document-search-section');
  const documentSearchList = document.getElementById('document-search-list');
  const documentEmptyState = document.getElementById('document-empty-state');
  const documentDropdownLoading = document.getElementById('document-dropdown-loading');
  const documentSearchLoading = document.getElementById('document-search-loading');

  const typeaheadState = {
    isOpen: false,
    query: '',
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: false,
    isSearchMode: false,
  };

  let documents = [];
  let pendingRemediationDocument = null;
  let typeaheadSearchRequestID = 0;
  let typeaheadSearchAbortController = null;
  const remediationInFlightByDocument = new Set();
  const remediationIdempotencyByDocument = new Map();

  function normalizeDocumentCompatibilityTier(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeDocumentCompatibilityReason(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isDocumentCompatibilityUnsupported(value) {
    return normalizeDocumentCompatibilityTier(value) === 'unsupported';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function initializeTitleSourceSeed() {
    if (!isEditMode && agreementTitleInput && agreementTitleInput.value.trim() !== '' && !stateManager.hasResumableState()) {
      stateManager.setTitleSource(titleSource.SERVER_SEED, { syncPending: false });
    }
  }

  function setDocumentPageCountValue(value) {
    const resolved = parsePositiveInt(value, 0);
    if (documentPageCountInput) {
      documentPageCountInput.value = String(resolved);
    }
  }

  function getCurrentDocumentPageCount() {
    const explicit = parsePositiveInt(documentPageCountInput?.value || '0', 0);
    if (explicit > 0) return explicit;
    const match = String(selectedDocumentInfo?.textContent || '').match(/(\d+)\s+pages?/i);
    if (match) {
      const parsed = parsePositiveInt(match[1], 0);
      if (parsed > 0) return parsed;
    }
    return 1;
  }

  function clearSelectedDocumentSelection() {
    if (documentIdInput) {
      documentIdInput.value = '';
    }
    if (selectedDocumentTitle) {
      selectedDocumentTitle.textContent = '';
    }
    if (selectedDocumentInfo) {
      selectedDocumentInfo.textContent = '';
    }
    setDocumentPageCountValue(0);
    stateManager.updateDocument({
      id: null,
      title: null,
      pageCount: null,
    });
    void previewCard.setDocument(null, null, null);
  }

  function buildPDFUnsupportedDocumentMessage(reason = '') {
    const base = 'This document cannot be used because its PDF is incompatible with online signing.';
    const normalizedReason = normalizeDocumentCompatibilityReason(reason);
    if (!normalizedReason) {
      return `${base} Select another document or upload a remediated PDF.`;
    }
    return `${base} Reason: ${normalizedReason}. Select another document or upload a remediated PDF.`;
  }

  function resetDocumentRemediationState() {
    pendingRemediationDocument = null;
    if (documentRemediationStatus) {
      documentRemediationStatus.textContent = '';
      documentRemediationStatus.className = 'mt-2 text-xs text-amber-800';
    }
    if (documentRemediationPanel) {
      documentRemediationPanel.classList.add('hidden');
    }
    if (documentRemediationTriggerBtn) {
      documentRemediationTriggerBtn.disabled = false;
      documentRemediationTriggerBtn.textContent = 'Remediate PDF';
    }
  }

  function setDocumentRemediationStatus(message, type = 'info') {
    if (!documentRemediationStatus) return;
    const text = String(message || '').trim();
    documentRemediationStatus.textContent = text;
    const tone = type === 'error' ? 'text-red-700' : (type === 'success' ? 'text-green-700' : 'text-amber-800');
    documentRemediationStatus.className = `mt-2 text-xs ${tone}`;
  }

  function showDocumentRemediationPanel(doc, reason = '') {
    if (!doc || !documentRemediationPanel || !documentRemediationMessage) return;
    pendingRemediationDocument = {
      id: String(doc.id || '').trim(),
      title: String(doc.title || '').trim(),
      pageCount: parsePositiveInt(doc.pageCount, 0),
      compatibilityReason: normalizeDocumentCompatibilityReason(reason || doc.compatibilityReason || ''),
    };
    if (!pendingRemediationDocument.id) return;
    documentRemediationMessage.textContent = buildPDFUnsupportedDocumentMessage(pendingRemediationDocument.compatibilityReason);
    setDocumentRemediationStatus('Run remediation to make this document signable.');
    documentRemediationPanel.classList.remove('hidden');
  }

  function autoPopulateAgreementTitle(documentTitle) {
    const titleInput = document.getElementById('title');
    if (!titleInput) return;

    const state = stateManager.getState();
    const currentTitle = titleInput.value.trim();
    const titleSourceValue = normalizeTitleSource(
      state?.titleSource,
      currentTitle === '' ? titleSource.AUTOFILL : titleSource.USER,
    );
    if (currentTitle && titleSourceValue === titleSource.USER) {
      return;
    }

    const suggestedTitle = String(documentTitle || '').trim();
    if (!suggestedTitle) return;

    titleInput.value = suggestedTitle;
    stateManager.updateDetails({
      title: suggestedTitle,
      message: stateManager.getState().details.message || '',
    }, { titleSource: titleSource.AUTOFILL });
  }

  function applySelectedDocument(id, title, pages) {
    documentIdInput.value = id;
    selectedDocumentTitle.textContent = title || '';
    selectedDocumentInfo.textContent = `${pages} pages`;
    setDocumentPageCountValue(pages);
    selectedDocument.classList.remove('hidden');
    documentPicker.classList.add('hidden');
    renderFieldRulePreview();
    autoPopulateAgreementTitle(title);
    const pageCount = parsePositiveInt(pages, 0);
    stateManager.updateDocument({
      id,
      title,
      pageCount,
    });
    previewCard.setDocument(id, title, pageCount);
    resetDocumentRemediationState();
  }

  function findDocumentByID(documentID) {
    const targetID = String(documentID || '').trim();
    if (targetID === '') return null;
    const fromMainList = documents.find((doc) => String(doc.id || '').trim() === targetID);
    if (fromMainList) return fromMainList;
    const fromRecent = typeaheadState.recentDocuments.find((doc) => String(doc.id || '').trim() === targetID);
    if (fromRecent) return fromRecent;
    const fromSearch = typeaheadState.searchResults.find((doc) => String(doc.id || '').trim() === targetID);
    if (fromSearch) return fromSearch;
    return null;
  }

  function ensureSelectedDocumentCompatibility() {
    const selectedDoc = findDocumentByID(documentIdInput?.value || '');
    if (!selectedDoc) return true;
    const compatibilityTier = normalizeDocumentCompatibilityTier(selectedDoc.compatibilityTier);
    if (!isDocumentCompatibilityUnsupported(compatibilityTier)) {
      resetDocumentRemediationState();
      return true;
    }
    showDocumentRemediationPanel(selectedDoc, selectedDoc.compatibilityReason || '');
    clearSelectedDocumentSelection();
    announceError(buildPDFUnsupportedDocumentMessage(selectedDoc.compatibilityReason || ''));
    if (selectedDocument) {
      selectedDocument.classList.add('hidden');
    }
    if (documentPicker) {
      documentPicker.classList.remove('hidden');
    }
    documentSearch?.focus();
    return false;
  }

  function hydrateSelectedDocumentFromList() {
    const currentID = (documentIdInput?.value || '').trim();
    if (!currentID) return;
    const selected = documents.find((doc) => String(doc.id || '').trim() === currentID);
    if (!selected) return;

    if (!selectedDocumentTitle.textContent.trim()) {
      selectedDocumentTitle.textContent = selected.title || 'Untitled';
    }
    if (!selectedDocumentInfo.textContent.trim() || selectedDocumentInfo.textContent.trim() === 'pages') {
      selectedDocumentInfo.textContent = `${selected.pageCount || 0} pages`;
    }
    setDocumentPageCountValue(selected.pageCount || 0);
    selectedDocument.classList.remove('hidden');
    documentPicker.classList.add('hidden');
  }

  async function loadDocuments() {
    try {
      const params = new URLSearchParams({
        per_page: '100',
        sort: 'created_at',
        sort_desc: 'true',
      });
      const response = await fetch(`${apiBase}/panels/esign_documents?${params.toString()}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const apiError = await parseAPIError(response, 'Failed to load documents');
        throw apiError;
      }
      const data = await response.json();
      const rawDocuments = Array.isArray(data?.records)
        ? data.records
        : (Array.isArray(data?.items) ? data.items : []);
      const sortedRawDocuments = rawDocuments.slice().sort((left, right) => {
        const leftDate = Date.parse(String(left?.created_at ?? left?.createdAt ?? left?.updated_at ?? left?.updatedAt ?? ''));
        const rightDate = Date.parse(String(right?.created_at ?? right?.createdAt ?? right?.updated_at ?? right?.updatedAt ?? ''));
        const leftTs = Number.isFinite(leftDate) ? leftDate : 0;
        const rightTs = Number.isFinite(rightDate) ? rightDate : 0;
        return rightTs - leftTs;
      });
      documents = sortedRawDocuments
        .map((record) => normalizeDocumentOption(record))
        .filter((record) => record.id !== '');
      renderDocumentList(documents);
      hydrateSelectedDocumentFromList();
    } catch (error) {
      const userMessage = mapUserFacingError(error?.message || 'Failed to load documents', error?.code || '', error?.status || 0);
      documentList.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${escapeHtml(userMessage)}</div>`;
    }
  }

  function renderDocumentList(docs) {
    if (docs.length === 0) {
      documentList.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${escapeHtml(documentsUploadURL)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }

    documentList.innerHTML = docs.map((doc, index) => {
      const safeID = escapeHtml(String(doc.id || '').trim());
      const safeTitle = escapeHtml(String(doc.title || '').trim());
      const safePageCount = String(parsePositiveInt(doc.pageCount, 0));
      const compatibilityTier = normalizeDocumentCompatibilityTier(doc.compatibilityTier);
      const compatibilityReason = normalizeDocumentCompatibilityReason(doc.compatibilityReason);
      const safeCompatibilityTier = escapeHtml(compatibilityTier);
      const safeCompatibilityReason = escapeHtml(compatibilityReason);
      const isUnsupported = isDocumentCompatibilityUnsupported(compatibilityTier);
      const unsupportedBadge = isUnsupported
        ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>'
        : '';
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${index === 0 ? '0' : '-1'}"
                data-document-id="${safeID}"
                data-document-title="${safeTitle}"
                data-document-pages="${safePageCount}"
                data-document-compatibility-tier="${safeCompatibilityTier}"
                data-document-compatibility-reason="${safeCompatibilityReason}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${safeTitle}</div>
            <div class="text-xs text-gray-500">${safePageCount} pages ${unsupportedBadge}</div>
          </div>
        </button>
      `;
    }).join('');

    const options = documentList.querySelectorAll('.document-option');
    options.forEach((btn, index) => {
      btn.addEventListener('click', () => selectDocument(btn));
      btn.addEventListener('keydown', (e) => {
        let nextIndex = index;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          nextIndex = Math.min(index + 1, options.length - 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          nextIndex = Math.max(index - 1, 0);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectDocument(btn);
          return;
        } else if (e.key === 'Home') {
          e.preventDefault();
          nextIndex = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          nextIndex = options.length - 1;
        }
        if (nextIndex !== index) {
          options[nextIndex].focus();
          options[nextIndex].setAttribute('tabindex', '0');
          btn.setAttribute('tabindex', '-1');
        }
      });
    });
  }

  function selectDocument(btn) {
    const id = btn.getAttribute('data-document-id');
    const title = btn.getAttribute('data-document-title');
    const pages = btn.getAttribute('data-document-pages');
    const compatibilityTier = normalizeDocumentCompatibilityTier(btn.getAttribute('data-document-compatibility-tier'));
    const compatibilityReason = normalizeDocumentCompatibilityReason(btn.getAttribute('data-document-compatibility-reason'));

    if (isDocumentCompatibilityUnsupported(compatibilityTier)) {
      showDocumentRemediationPanel({ id, title, pageCount: pages, compatibilityReason });
      clearSelectedDocumentSelection();
      announceError(buildPDFUnsupportedDocumentMessage(compatibilityReason));
      documentSearch?.focus();
      return;
    }
    applySelectedDocument(id, title, pages);
  }

  async function pollRemediationStatus(statusURL, dispatchID, documentID) {
    const normalizedStatusURL = String(statusURL || '').trim();
    if (!normalizedStatusURL) return;
    const startedAt = Date.now();
    const timeoutMS = 120000;
    const pollIntervalMS = 1250;
    while (Date.now() - startedAt < timeoutMS) {
      const response = await fetch(normalizedStatusURL, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const apiError = await parseAPIError(response, 'Failed to read remediation status');
        throw apiError;
      }
      const payload = await response.json();
      const dispatch = payload?.dispatch || {};
      const rawStatus = String(dispatch?.status || '').trim().toLowerCase();
      if (rawStatus === 'succeeded') {
        setDocumentRemediationStatus('Remediation completed. Refreshing document compatibility...', 'success');
        return;
      }
      if (rawStatus === 'failed' || rawStatus === 'canceled' || rawStatus === 'dead_letter') {
        const terminalReason = String(dispatch?.terminal_reason || '').trim();
        const errorMessage = terminalReason
          ? `Remediation failed: ${terminalReason}`
          : 'Remediation did not complete. Please upload a new document or try again.';
        throw { message: errorMessage, code: 'REMEDIATION_FAILED', status: 422 };
      }
      const stageMessage = rawStatus === 'retrying'
        ? 'Remediation is retrying in the queue...'
        : (rawStatus === 'running'
          ? 'Remediation is running...'
          : 'Remediation accepted and waiting for worker...');
      setDocumentRemediationStatus(stageMessage);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMS));
    }
    throw { message: `Timed out waiting for remediation dispatch ${dispatchID} (${documentID})`, code: 'REMEDIATION_TIMEOUT', status: 504 };
  }

  async function triggerPendingDocumentRemediation() {
    const pending = pendingRemediationDocument;
    if (!pending || !pending.id) return;
    const documentID = String(pending.id || '').trim();
    if (!documentID || remediationInFlightByDocument.has(documentID)) return;
    remediationInFlightByDocument.add(documentID);
    if (documentRemediationTriggerBtn) {
      documentRemediationTriggerBtn.disabled = true;
      documentRemediationTriggerBtn.textContent = 'Remediating...';
    }
    try {
      let idempotencyKey = remediationIdempotencyByDocument.get(documentID) || '';
      if (!idempotencyKey) {
        idempotencyKey = `esign-remediate-${documentID}-${Date.now()}`;
        remediationIdempotencyByDocument.set(documentID, idempotencyKey);
      }
      const triggerURL = `${apiVersionBase}/esign/documents/${encodeURIComponent(documentID)}/remediate`;
      const triggerResponse = await fetch(triggerURL, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
      });
      if (!triggerResponse.ok) {
        const apiError = await parseAPIError(triggerResponse, 'Failed to trigger remediation');
        throw apiError;
      }
      const triggerPayload = await triggerResponse.json();
      const receipt = triggerPayload?.receipt || {};
      const dispatchID = String(receipt?.dispatch_id || triggerPayload?.dispatch_id || '').trim();
      const mode = String(receipt?.mode || triggerPayload?.mode || '').trim().toLowerCase();
      let statusURL = String(triggerPayload?.dispatch_status_url || '').trim();
      if (!statusURL && dispatchID) {
        statusURL = `${apiVersionBase}/esign/dispatches/${encodeURIComponent(dispatchID)}`;
      }
      if (mode === 'queued' && dispatchID && statusURL) {
        setDocumentRemediationStatus('Remediation queued. Monitoring progress...');
        await pollRemediationStatus(statusURL, dispatchID, documentID);
      }
      await loadDocuments();
      const refreshedDoc = findDocumentByID(documentID);
      if (!refreshedDoc || isDocumentCompatibilityUnsupported(refreshedDoc.compatibilityTier)) {
        setDocumentRemediationStatus('Remediation finished, but this PDF is still incompatible.', 'error');
        announceError('Document remains incompatible after remediation. Upload another PDF.');
        return;
      }
      applySelectedDocument(refreshedDoc.id, refreshedDoc.title, refreshedDoc.pageCount);
      if (window.toastManager) {
        window.toastManager.success('Document remediated successfully. You can continue.');
      } else {
        showToast('Document remediated successfully. You can continue.', 'success');
      }
    } catch (error) {
      setDocumentRemediationStatus(String(error?.message || 'Remediation failed').trim(), 'error');
      announceError(error?.message || 'Failed to remediate document', error?.code || '', error?.status || 0);
    } finally {
      remediationInFlightByDocument.delete(documentID);
      if (documentRemediationTriggerBtn) {
        documentRemediationTriggerBtn.disabled = false;
        documentRemediationTriggerBtn.textContent = 'Remediate PDF';
      }
    }
  }

  function debounce(fn, delay) {
    let timeoutId = null;
    return (...args) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  }

  async function loadRecentDocuments() {
    try {
      const params = new URLSearchParams({
        sort: 'updated_at',
        sort_desc: 'true',
        per_page: String(RECENT_DOCUMENTS_LIMIT),
      });
      if (currentUserID) {
        params.set('created_by_user_id', currentUserID);
      }
      const response = await fetch(`${apiBase}/panels/esign_documents?${params}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        console.warn('Failed to load recent documents:', response.status);
        return;
      }
      const data = await response.json();
      const rawDocuments = Array.isArray(data?.records)
        ? data.records
        : (Array.isArray(data?.items) ? data.items : []);
      typeaheadState.recentDocuments = rawDocuments
        .map((record) => normalizeDocumentOption(record))
        .filter((record) => record.id !== '')
        .slice(0, RECENT_DOCUMENTS_LIMIT);
    } catch (error) {
      console.warn('Error loading recent documents:', error);
    }
  }

  async function searchDocuments(query) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      if (typeaheadSearchAbortController) {
        typeaheadSearchAbortController.abort();
        typeaheadSearchAbortController = null;
      }
      typeaheadState.isSearchMode = false;
      typeaheadState.searchResults = [];
      renderTypeaheadDropdown();
      return;
    }

    const requestID = ++typeaheadSearchRequestID;
    if (typeaheadSearchAbortController) {
      typeaheadSearchAbortController.abort();
    }
    typeaheadSearchAbortController = new AbortController();

    typeaheadState.isLoading = true;
    typeaheadState.isSearchMode = true;
    renderTypeaheadDropdown();

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        sort: 'updated_at',
        sort_desc: 'true',
        per_page: String(SEARCH_RESULTS_LIMIT),
      });
      const response = await fetch(`${apiBase}/panels/esign_documents?${params}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: typeaheadSearchAbortController.signal,
      });
      if (requestID !== typeaheadSearchRequestID) return;
      if (!response.ok) {
        console.warn('Failed to search documents:', response.status);
        typeaheadState.searchResults = [];
        typeaheadState.isLoading = false;
        renderTypeaheadDropdown();
        return;
      }
      const data = await response.json();
      const rawDocuments = Array.isArray(data?.records)
        ? data.records
        : (Array.isArray(data?.items) ? data.items : []);
      typeaheadState.searchResults = rawDocuments
        .map((record) => normalizeDocumentOption(record))
        .filter((record) => record.id !== '')
        .slice(0, SEARCH_RESULTS_LIMIT);
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.warn('Error searching documents:', error);
      typeaheadState.searchResults = [];
    } finally {
      if (requestID === typeaheadSearchRequestID) {
        typeaheadState.isLoading = false;
        renderTypeaheadDropdown();
      }
    }
  }

  const debouncedSearchDocuments = debounce(searchDocuments, TYPEAHEAD_DEBOUNCE_MS);

  function openTypeaheadDropdown() {
    if (!documentTypeaheadDropdown) return;
    typeaheadState.isOpen = true;
    typeaheadState.selectedIndex = -1;
    documentTypeaheadDropdown.classList.remove('hidden');
    documentSearch?.setAttribute('aria-expanded', 'true');
    documentList?.classList.add('hidden');
    renderTypeaheadDropdown();
  }

  function closeTypeaheadDropdown() {
    if (!documentTypeaheadDropdown) return;
    typeaheadState.isOpen = false;
    typeaheadState.selectedIndex = -1;
    documentTypeaheadDropdown.classList.add('hidden');
    documentSearch?.setAttribute('aria-expanded', 'false');
    documentList?.classList.remove('hidden');
  }

  function renderTypeaheadList(container, docs, listType) {
    if (!container) return;

    container.innerHTML = docs.map((doc, index) => {
      const globalIndex = listType === 'search' ? index : index;
      const isSelected = typeaheadState.selectedIndex === globalIndex;
      const safeID = escapeHtml(String(doc.id || '').trim());
      const safeTitle = escapeHtml(String(doc.title || '').trim());
      const safePageCount = String(parsePositiveInt(doc.pageCount, 0));
      const compatibilityTier = normalizeDocumentCompatibilityTier(doc.compatibilityTier);
      const compatibilityReason = normalizeDocumentCompatibilityReason(doc.compatibilityReason);
      const safeCompatibilityTier = escapeHtml(compatibilityTier);
      const safeCompatibilityReason = escapeHtml(compatibilityReason);
      const isUnsupported = isDocumentCompatibilityUnsupported(compatibilityTier);
      const unsupportedBadge = isUnsupported
        ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>'
        : '';
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${isSelected ? 'bg-blue-50' : ''}"
          role="option"
          aria-selected="${isSelected}"
          tabindex="-1"
          data-document-id="${safeID}"
          data-document-title="${safeTitle}"
          data-document-pages="${safePageCount}"
          data-document-compatibility-tier="${safeCompatibilityTier}"
          data-document-compatibility-reason="${safeCompatibilityReason}"
          data-typeahead-index="${globalIndex}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${safeTitle}</div>
            <div class="text-xs text-gray-500">${safePageCount} pages ${unsupportedBadge}</div>
          </div>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.typeahead-option').forEach((btn) => {
      btn.addEventListener('click', () => selectDocumentFromTypeahead(btn));
    });
  }

  function renderTypeaheadDropdown() {
    if (!documentTypeaheadDropdown) return;

    if (typeaheadState.isLoading) {
      documentDropdownLoading?.classList.remove('hidden');
      documentRecentSection?.classList.add('hidden');
      documentSearchSection?.classList.add('hidden');
      documentEmptyState?.classList.add('hidden');
      documentSearchLoading?.classList.remove('hidden');
      return;
    }

    documentDropdownLoading?.classList.add('hidden');
    documentSearchLoading?.classList.add('hidden');

    if (typeaheadState.isSearchMode) {
      documentRecentSection?.classList.add('hidden');
      if (typeaheadState.searchResults.length > 0) {
        documentSearchSection?.classList.remove('hidden');
        documentEmptyState?.classList.add('hidden');
        renderTypeaheadList(documentSearchList, typeaheadState.searchResults, 'search');
      } else {
        documentSearchSection?.classList.add('hidden');
        documentEmptyState?.classList.remove('hidden');
      }
    } else {
      documentSearchSection?.classList.add('hidden');
      if (typeaheadState.recentDocuments.length > 0) {
        documentRecentSection?.classList.remove('hidden');
        documentEmptyState?.classList.add('hidden');
        renderTypeaheadList(documentRecentList, typeaheadState.recentDocuments, 'recent');
      } else {
        documentRecentSection?.classList.add('hidden');
        documentEmptyState?.classList.remove('hidden');
        if (documentEmptyState) {
          documentEmptyState.textContent = 'No recent documents';
        }
      }
    }
  }

  function selectDocumentFromTypeahead(btn) {
    const id = btn.getAttribute('data-document-id');
    const title = btn.getAttribute('data-document-title');
    const pages = btn.getAttribute('data-document-pages');
    const compatibilityTier = normalizeDocumentCompatibilityTier(btn.getAttribute('data-document-compatibility-tier'));
    const compatibilityReason = normalizeDocumentCompatibilityReason(btn.getAttribute('data-document-compatibility-reason'));

    if (!id) return;
    if (isDocumentCompatibilityUnsupported(compatibilityTier)) {
      showDocumentRemediationPanel({ id, title, pageCount: pages, compatibilityReason });
      clearSelectedDocumentSelection();
      announceError(buildPDFUnsupportedDocumentMessage(compatibilityReason));
      documentSearch?.focus();
      return;
    }
    applySelectedDocument(id, title, pages);
    closeTypeaheadDropdown();
    if (documentSearch) {
      documentSearch.value = '';
    }
    typeaheadState.query = '';
    typeaheadState.isSearchMode = false;
    typeaheadState.searchResults = [];
  }

  function scrollToSelectedOption() {
    if (!documentTypeaheadDropdown) return;
    const selectedOption = documentTypeaheadDropdown.querySelector(`[data-typeahead-index="${typeaheadState.selectedIndex}"]`);
    if (selectedOption) {
      selectedOption.scrollIntoView({ block: 'nearest' });
    }
  }

  function handleTypeaheadKeydown(e) {
    if (!typeaheadState.isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openTypeaheadDropdown();
      }
      return;
    }

    const currentList = typeaheadState.isSearchMode
      ? typeaheadState.searchResults
      : typeaheadState.recentDocuments;
    const maxIndex = currentList.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        typeaheadState.selectedIndex = Math.min(typeaheadState.selectedIndex + 1, maxIndex);
        renderTypeaheadDropdown();
        scrollToSelectedOption();
        break;
      case 'ArrowUp':
        e.preventDefault();
        typeaheadState.selectedIndex = Math.max(typeaheadState.selectedIndex - 1, 0);
        renderTypeaheadDropdown();
        scrollToSelectedOption();
        break;
      case 'Enter':
        e.preventDefault();
        if (typeaheadState.selectedIndex >= 0 && typeaheadState.selectedIndex <= maxIndex) {
          const selectedDoc = currentList[typeaheadState.selectedIndex];
          if (selectedDoc) {
            const mockBtn = document.createElement('button');
            mockBtn.setAttribute('data-document-id', selectedDoc.id);
            mockBtn.setAttribute('data-document-title', selectedDoc.title);
            mockBtn.setAttribute('data-document-pages', String(selectedDoc.pageCount));
            mockBtn.setAttribute('data-document-compatibility-tier', String(selectedDoc.compatibilityTier || ''));
            mockBtn.setAttribute('data-document-compatibility-reason', String(selectedDoc.compatibilityReason || ''));
            selectDocumentFromTypeahead(mockBtn);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeTypeaheadDropdown();
        break;
      case 'Tab':
        closeTypeaheadDropdown();
        break;
      case 'Home':
        e.preventDefault();
        typeaheadState.selectedIndex = 0;
        renderTypeaheadDropdown();
        scrollToSelectedOption();
        break;
      case 'End':
        e.preventDefault();
        typeaheadState.selectedIndex = maxIndex;
        renderTypeaheadDropdown();
        scrollToSelectedOption();
        break;
    }
  }

  function bindEvents() {
    if (changeDocumentBtn) {
      changeDocumentBtn.addEventListener('click', () => {
        selectedDocument.classList.add('hidden');
        documentPicker.classList.remove('hidden');
        resetDocumentRemediationState();
        documentSearch?.focus();
        openTypeaheadDropdown();
      });
    }

    if (documentRemediationTriggerBtn) {
      documentRemediationTriggerBtn.addEventListener('click', () => {
        void triggerPendingDocumentRemediation();
      });
    }
    if (documentRemediationDismissBtn) {
      documentRemediationDismissBtn.addEventListener('click', () => {
        resetDocumentRemediationState();
        documentSearch?.focus();
      });
    }

    if (documentSearch) {
      documentSearch.addEventListener('input', (e) => {
        const target = e.target;
        const term = target.value;
        typeaheadState.query = term;

        if (!typeaheadState.isOpen) {
          openTypeaheadDropdown();
        }

        if (term.trim()) {
          typeaheadState.isLoading = true;
          renderTypeaheadDropdown();
          debouncedSearchDocuments(term);
        } else {
          typeaheadState.isSearchMode = false;
          typeaheadState.searchResults = [];
          renderTypeaheadDropdown();
        }

        const filtered = documents.filter((doc) =>
          String(doc.title || '').toLowerCase().includes(term.toLowerCase())
        );
        renderDocumentList(filtered);
      });

      documentSearch.addEventListener('focus', () => {
        openTypeaheadDropdown();
      });

      documentSearch.addEventListener('keydown', handleTypeaheadKeydown);
    }

    document.addEventListener('click', (e) => {
      const target = e.target;
      if (documentTypeahead && !documentTypeahead.contains(target)) {
        closeTypeaheadDropdown();
      }
    });
  }

  return {
    refs: {
      documentIdInput,
      selectedDocument,
      documentPicker,
      documentSearch,
      documentList,
      selectedDocumentTitle,
      selectedDocumentInfo,
      documentPageCountInput,
    },
    bindEvents,
    initializeTitleSourceSeed,
    loadDocuments,
    loadRecentDocuments,
    ensureSelectedDocumentCompatibility,
    getCurrentDocumentPageCount,
  };
}
