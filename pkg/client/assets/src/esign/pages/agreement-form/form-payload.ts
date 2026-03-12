interface AgreementPayloadParticipant {
  id: string;
  name: string;
  email: string;
  role: string;
  notify: boolean;
  signing_stage: number;
}

interface AgreementPayloadFieldInstance {
  id: string;
  type: string;
  participant_id: string;
  page: number;
  required: boolean;
}

export interface CanonicalAgreementPayload {
  document_id: string;
  title: string;
  message: string;
  participants: AgreementPayloadParticipant[];
  field_instances: AgreementPayloadFieldInstance[];
  field_placements: Record<string, unknown>[];
  field_placements_json: string;
  field_rules: Record<string, unknown>[];
  field_rules_json: string;
  send_for_signature: number;
  recipients_present: number;
  fields_present: number;
  field_instances_present: number;
  document_page_count: number;
}

interface AgreementFormPayloadBuilderOptions {
  documentIdInput: HTMLInputElement | null;
  documentPageCountInput: HTMLInputElement | null;
  titleInput: HTMLInputElement | null;
  messageInput: HTMLTextAreaElement | HTMLInputElement | null;
  participantsContainer: ParentNode;
  fieldDefinitionsContainer: ParentNode;
  fieldPlacementsJSONInput: HTMLInputElement | HTMLTextAreaElement | null;
  fieldRulesJSONInput: HTMLInputElement | HTMLTextAreaElement | null;
  collectFieldRulesForForm(): Record<string, unknown>[];
  buildPlacementFormEntries(): Record<string, unknown>[];
  getCurrentStep(): number;
  totalWizardSteps: number;
}

function queryValue<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  root: ParentNode,
  selector: string,
  fallback = '',
): string {
  return String((root.querySelector(selector) as T | null)?.value || fallback).trim();
}

function queryChecked(root: ParentNode, selector: string, fallback = false): boolean {
  const input = root.querySelector(selector) as HTMLInputElement | null;
  return input ? input.checked : fallback;
}

export function createAgreementFormPayloadBuilder(options: AgreementFormPayloadBuilderOptions) {
  const {
    documentIdInput,
    documentPageCountInput,
    titleInput,
    messageInput,
    participantsContainer,
    fieldDefinitionsContainer,
    fieldPlacementsJSONInput,
    fieldRulesJSONInput,
    collectFieldRulesForForm,
    buildPlacementFormEntries,
    getCurrentStep,
    totalWizardSteps,
  } = options;

  function buildCanonicalAgreementPayload(): CanonicalAgreementPayload {
    const participants: AgreementPayloadParticipant[] = [];
    participantsContainer.querySelectorAll('.participant-entry').forEach((entry) => {
      const participantId = String(entry.getAttribute('data-participant-id') || '').trim();
      const name = queryValue<HTMLInputElement>(entry, 'input[name*=".name"]');
      const email = queryValue<HTMLInputElement>(entry, 'input[name*=".email"]');
      const role = queryValue<HTMLSelectElement>(entry, 'select[name*=".role"]', 'signer');
      const notify = queryChecked(entry, '.notify-input', true);
      const signingStageRaw = queryValue<HTMLInputElement>(entry, '.signing-stage-input');
      const signingStage = Number(signingStageRaw || '1') || 1;

      participants.push({
        id: participantId,
        name,
        email,
        role,
        notify,
        signing_stage: role === 'signer' ? signingStage : 0,
      });
    });

    const fieldInstances: AgreementPayloadFieldInstance[] = [];
    fieldDefinitionsContainer.querySelectorAll('.field-definition-entry').forEach((entry) => {
      const id = String(entry.getAttribute('data-field-definition-id') || '').trim();
      const type = queryValue<HTMLSelectElement>(entry, '.field-type-select', 'signature');
      const participantID = queryValue<HTMLSelectElement>(entry, '.field-participant-select');
      const page = Number(queryValue<HTMLInputElement>(entry, 'input[name*=".page"]', '1')) || 1;
      const required = queryChecked(entry, 'input[name*=".required"]');
      if (!id) return;

      fieldInstances.push({
        id,
        type,
        participant_id: participantID,
        page,
        required,
      });
    });

    const fieldPlacements = buildPlacementFormEntries();
    const serializedPlacements = JSON.stringify(fieldPlacements);
    if (fieldPlacementsJSONInput) {
      fieldPlacementsJSONInput.value = serializedPlacements;
    }

    return {
      document_id: String(documentIdInput?.value || '').trim(),
      title: String(titleInput?.value || '').trim(),
      message: String(messageInput?.value || '').trim(),
      participants,
      field_instances: fieldInstances,
      field_placements: fieldPlacements,
      field_placements_json: serializedPlacements,
      field_rules: collectFieldRulesForForm(),
      field_rules_json: String(fieldRulesJSONInput?.value || '[]'),
      send_for_signature: getCurrentStep() === totalWizardSteps ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(documentPageCountInput?.value || '0') || 0,
    };
  }

  return {
    buildCanonicalAgreementPayload,
  };
}
