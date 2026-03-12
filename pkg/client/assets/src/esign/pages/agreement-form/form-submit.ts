// @ts-nocheck

export function createAgreementFormSubmitController(options = {}) {
  const {
    config,
    form,
    submitBtn,
    documentIdInput,
    documentSearch,
    participantsContainer,
    addParticipantBtn,
    fieldDefinitionsContainer,
    fieldRulesContainer,
    documentPageCountInput,
    fieldPlacementsJSONInput,
    fieldRulesJSONInput,
    currentUserID,
    draftsEndpoint,
    draftEndpointWithUserID,
    draftRequestHeaders,
    syncService,
    syncOrchestrator,
    stateManager,
    submitMode,
    totalWizardSteps,
    wizardStep,
    getCurrentStep,
    getPlacementState,
    getCurrentDocumentPageCount,
    ensureSelectedDocumentCompatibility,
    collectFieldRulesForState,
    collectFieldRulesForForm,
    expandRulesForPreview,
    findSignersMissingRequiredSignatureField,
    missingSignatureFieldMessage,
    getSignerParticipants,
    buildCanonicalAgreementPayload,
    announceError,
    emitWizardTelemetry,
    parseAPIError,
    goToStep,
    surfaceSyncOutcome,
    activeTabOwnershipRequiredCode = 'ACTIVE_TAB_OWNERSHIP_REQUIRED',
    addFieldBtn,
  } = options;

  async function persistLatestWizardState() {
    stateManager.updateState(stateManager.collectFormState());
    const syncResult = await syncOrchestrator.forceSync();
    if (syncResult?.blocked && syncResult.reason === 'passive_tab') {
      throw {
        code: activeTabOwnershipRequiredCode,
        message: 'This agreement is active in another tab. Take control in this tab before saving or sending.',
      };
    }
    const syncedState = stateManager.getState();
    if (syncedState?.syncPending) {
      throw new Error('Unable to sync latest draft changes');
    }
    return syncedState;
  }

  async function ensureDraftReadyForSend() {
    const syncedState = await persistLatestWizardState();
    const currentDraftID = String(syncedState?.serverDraftId || '').trim();
    if (!currentDraftID) {
      const created = await syncService.create(syncedState);
      stateManager.markSynced(created.id, created.revision);
      return {
        draftID: String(created.id || '').trim(),
        revision: Number(created.revision || 0),
      };
    }
    try {
      const loaded = await syncService.load(currentDraftID);
      const draftID = String(loaded?.id || currentDraftID).trim();
      const revision = Number(loaded?.revision || syncedState?.serverRevision || 0);
      if (draftID && revision > 0) {
        stateManager.markSynced(draftID, revision);
      }
      return {
        draftID,
        revision: revision > 0 ? revision : Number(syncedState?.serverRevision || 0),
      };
    } catch (error) {
      if (Number(error?.status || 0) !== 404) {
        throw error;
      }
      const recreated = await syncService.create({
        ...stateManager.getState(),
        ...stateManager.collectFormState(),
      });
      const draftID = String(recreated?.id || '').trim();
      const revision = Number(recreated?.revision || 0);
      stateManager.markSynced(draftID, revision);
      emitWizardTelemetry('wizard_send_stale_draft_recovered', {
        stale_draft_id: currentDraftID,
        recovered_draft_id: draftID,
      });
      return { draftID, revision };
    }
  }

  async function resyncAfterSendNotFound() {
    const currentState = stateManager.getState();
    stateManager.setState({
      ...currentState,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: true,
    }, { syncPending: true });
    await syncOrchestrator.forceSync();
  }

  function bindEvents() {
    form.addEventListener('submit', function(e) {
      buildCanonicalAgreementPayload();

      if (!documentIdInput.value) {
        e.preventDefault();
        announceError('Please select a document');
        documentSearch.focus();
        return;
      }
      if (!ensureSelectedDocumentCompatibility()) {
        e.preventDefault();
        return;
      }

      const participantEntries = participantsContainer.querySelectorAll('.participant-entry');
      if (participantEntries.length === 0) {
        e.preventDefault();
        announceError('Please add at least one participant');
        addParticipantBtn.focus();
        return;
      }

      let hasSigners = false;
      participantEntries.forEach((entry) => {
        const roleSelect = entry.querySelector('select[name*=".role"]');
        if (roleSelect.value === 'signer') {
          hasSigners = true;
        }
      });

      if (!hasSigners) {
        e.preventDefault();
        announceError('At least one signer is required');
        const firstRoleSelect = participantEntries[0]?.querySelector('select[name*=".role"]');
        if (firstRoleSelect) firstRoleSelect.focus();
        return;
      }

      const fieldDefinitionEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
      const missingSigners = findSignersMissingRequiredSignatureField();
      if (missingSigners.length > 0) {
        e.preventDefault();
        announceError(missingSignatureFieldMessage(missingSigners));
        goToStep(wizardStep.FIELDS);
        addFieldBtn.focus();
        return;
      }

      let invalidFieldAssignment = false;
      fieldDefinitionEntries.forEach((field) => {
        const participantSelect = field.querySelector('.field-participant-select');
        if (!participantSelect.value) {
          invalidFieldAssignment = true;
        }
      });

      if (invalidFieldAssignment) {
        e.preventDefault();
        announceError('Please assign all fields to a signer');
        const firstUnassigned = fieldDefinitionsContainer.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        if (firstUnassigned) firstUnassigned.focus();
        return;
      }

      const rules = collectFieldRulesForState();
      const invalidRuleAssignment = rules.some((rule) => !rule.participantId);
      if (invalidRuleAssignment) {
        e.preventDefault();
        announceError('Please assign all automation rules to a signer');
        const firstUnassignedRule = Array.from(fieldRulesContainer?.querySelectorAll('.field-rule-participant-select') || [])
          .find((select) => !select.value);
        firstUnassignedRule?.focus();
        return;
      }

      const hasSaveAsDraftIntent = Boolean(form.querySelector('input[name="save_as_draft"]'));
      const shouldSendForSignature = getCurrentStep() === totalWizardSteps && !hasSaveAsDraftIntent;

      if (shouldSendForSignature) {
        let sendIntentInput = form.querySelector('input[name="send_for_signature"]');
        if (!sendIntentInput) {
          sendIntentInput = document.createElement('input');
          sendIntentInput.type = 'hidden';
          sendIntentInput.name = 'send_for_signature';
          form.appendChild(sendIntentInput);
        }
        sendIntentInput.value = '1';
      } else {
        form.querySelector('input[name="send_for_signature"]')?.remove();
      }

      if (submitMode === 'json') {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${shouldSendForSignature ? 'Sending...' : 'Saving...'}
        `;
        void (async () => {
          try {
            buildCanonicalAgreementPayload();

            const indexRoute = String(config.routes?.index || '').trim();
            if (!shouldSendForSignature) {
              await persistLatestWizardState();
              if (indexRoute) {
                window.location.href = indexRoute;
                return;
              }
              window.location.reload();
              return;
            }

            const sendDraft = await ensureDraftReadyForSend();
            const draftID = String(sendDraft?.draftID || '').trim();
            const expectedRevision = Number(sendDraft?.revision || 0);
            if (!draftID || expectedRevision <= 0) {
              throw new Error('Draft session not available. Please try again.');
            }
            if (!syncOrchestrator.ensureActiveTabOwnership('send', { allowClaimIfAvailable: true })) {
              throw {
                code: activeTabOwnershipRequiredCode,
                message: 'This agreement is active in another tab. Take control in this tab before sending.',
              };
            }

            const response = await fetch(
              draftEndpointWithUserID(`${draftsEndpoint}/${encodeURIComponent(draftID)}/send`),
              {
                method: 'POST',
                credentials: 'same-origin',
                headers: draftRequestHeaders(),
                body: JSON.stringify({
                  expected_revision: expectedRevision,
                  created_by_user_id: currentUserID,
                }),
              }
            );
            if (!response.ok) {
              const apiError = await parseAPIError(response, 'Failed to send agreement');
              if (String(apiError?.code || '').trim().toUpperCase() === 'DRAFT_SEND_NOT_FOUND') {
                emitWizardTelemetry('wizard_send_not_found', {
                  draft_id: draftID,
                  status: Number(apiError?.status || 0),
                });
                await resyncAfterSendNotFound().catch(() => {});
                throw {
                  ...apiError,
                  code: 'DRAFT_SESSION_STALE',
                };
              }
              throw apiError;
            }
            const payload = await response.json();
            const agreementID = String(payload?.agreement_id || payload?.id || payload?.data?.id || '').trim();

            stateManager.clear();
            syncOrchestrator.broadcastStateUpdate();

            if (agreementID && indexRoute) {
              window.location.href = `${indexRoute}/${encodeURIComponent(agreementID)}`;
              return;
            }
            if (indexRoute) {
              window.location.href = indexRoute;
              return;
            }
            window.location.reload();
          } catch (error) {
            const message = String(error?.message || 'Failed to process agreement').trim();
            const code = String(error?.code || '').trim();
            const status = Number(error?.status || 0);
            announceError(message, code, status);
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
              <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
              Send for Signature
            `;
          }
        })();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${shouldSendForSignature ? 'Sending...' : 'Saving...'}
      `;
    });
  }

  return {
    bindEvents,
    ensureDraftReadyForSend,
    persistLatestWizardState,
    resyncAfterSendNotFound,
  };
}
