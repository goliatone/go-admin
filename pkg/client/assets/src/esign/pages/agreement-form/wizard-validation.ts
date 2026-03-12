// @ts-nocheck

export function createAgreementWizardValidationController(options = {}) {
  const {
    documentIdInput,
    titleInput,
    participantsContainer,
    fieldDefinitionsContainer,
    fieldRulesContainer,
    addFieldBtn,
    ensureSelectedDocumentCompatibility,
    collectFieldRulesForState,
    findSignersMissingRequiredSignatureField,
    missingSignatureFieldMessage,
    announceError,
  } = options;

  function validateStep(stepNum) {
    switch (stepNum) {
      case 1:
        if (!documentIdInput.value) {
          announceError('Please select a document');
          return false;
        }
        if (!ensureSelectedDocumentCompatibility()) {
          return false;
        }
        return true;

      case 2:
        if (!titleInput.value.trim()) {
          announceError('Please enter an agreement title');
          titleInput.focus();
          return false;
        }
        return true;

      case 3: {
        const participantEntries = participantsContainer.querySelectorAll('.participant-entry');
        if (participantEntries.length === 0) {
          announceError('Please add at least one participant');
          return false;
        }
        let hasSigners = false;
        participantEntries.forEach((entry) => {
          const roleSelect = entry.querySelector('select[name*=".role"]');
          if (roleSelect.value === 'signer') {
            hasSigners = true;
          }
        });
        if (!hasSigners) {
          announceError('At least one signer is required');
          return false;
        }
        return true;
      }

      case 4: {
        const fieldEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
        for (const field of fieldEntries) {
          const participantSelect = field.querySelector('.field-participant-select');
          if (!participantSelect.value) {
            announceError('Please assign all fields to a signer');
            participantSelect.focus();
            return false;
          }
        }

        const rules = collectFieldRulesForState();
        const unassignedRule = rules.find((rule) => !rule.participantId);
        if (unassignedRule) {
          announceError('Please assign all automation rules to a signer');
          fieldRulesContainer?.querySelector('.field-rule-participant-select')?.focus();
          return false;
        }

        const missingSigners = findSignersMissingRequiredSignatureField();
        if (missingSigners.length > 0) {
          announceError(missingSignatureFieldMessage(missingSigners));
          addFieldBtn.focus();
          return false;
        }
        return true;
      }

      case 5:
        return true;

      default:
        return true;
    }
  }

  return {
    validateStep,
  };
}
