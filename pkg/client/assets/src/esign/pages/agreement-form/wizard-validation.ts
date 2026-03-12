interface ValidationFieldRuleState {
  participantId?: string;
}

interface MissingSignatureSigner {
  id?: string;
  name?: string;
}

interface AgreementWizardValidationControllerOptions {
  documentIdInput: HTMLInputElement;
  titleInput: HTMLInputElement;
  participantsContainer: HTMLElement;
  fieldDefinitionsContainer: HTMLElement;
  fieldRulesContainer?: HTMLElement | null;
  addFieldBtn: HTMLElement;
  ensureSelectedDocumentCompatibility(): boolean;
  collectFieldRulesForState(): ValidationFieldRuleState[];
  findSignersMissingRequiredSignatureField(): MissingSignatureSigner[];
  missingSignatureFieldMessage(missingSigners: MissingSignatureSigner[]): string;
  announceError(message: string): void;
}

export interface AgreementWizardValidationController {
  validateStep(stepNum: number): boolean;
}

function roleSelect(entry: ParentNode): HTMLSelectElement | null {
  return entry.querySelector('select[name*=".role"]') as HTMLSelectElement | null;
}

function fieldParticipantSelect(entry: ParentNode): HTMLSelectElement | null {
  return entry.querySelector('.field-participant-select') as HTMLSelectElement | null;
}

export function createAgreementWizardValidationController(
  options: AgreementWizardValidationControllerOptions,
): AgreementWizardValidationController {
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

  function validateStep(stepNum: number): boolean {
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
        const participantEntries = participantsContainer.querySelectorAll<HTMLElement>('.participant-entry');
        if (participantEntries.length === 0) {
          announceError('Please add at least one participant');
          return false;
        }
        let hasSigners = false;
        participantEntries.forEach((entry) => {
          const select = roleSelect(entry);
          if (select?.value === 'signer') {
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
        const fieldEntries = fieldDefinitionsContainer.querySelectorAll<HTMLElement>('.field-definition-entry');
        for (const field of Array.from(fieldEntries)) {
          const participantSelect = fieldParticipantSelect(field);
          if (!participantSelect?.value) {
            announceError('Please assign all fields to a signer');
            participantSelect?.focus();
            return false;
          }
        }

        const rules = collectFieldRulesForState();
        const unassignedRule = rules.find((rule) => !rule.participantId);
        if (unassignedRule) {
          announceError('Please assign all automation rules to a signer');
          fieldRulesContainer?.querySelector<HTMLSelectElement>('.field-rule-participant-select')?.focus();
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
