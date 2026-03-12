// @ts-nocheck

export function createAgreementFormPayloadBuilder(options = {}) {
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

  function buildCanonicalAgreementPayload() {
    const participants = [];
    participantsContainer.querySelectorAll('.participant-entry').forEach((entry) => {
      const participantId = String(entry.getAttribute('data-participant-id') || '').trim();
      const name = String(entry.querySelector('input[name*=".name"]')?.value || '').trim();
      const email = String(entry.querySelector('input[name*=".email"]')?.value || '').trim();
      const role = String(entry.querySelector('select[name*=".role"]')?.value || 'signer').trim();
      const notify = entry.querySelector('.notify-input')?.checked !== false;
      const signingStageRaw = String(entry.querySelector('.signing-stage-input')?.value || '').trim();
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

    const fieldInstances = [];
    fieldDefinitionsContainer.querySelectorAll('.field-definition-entry').forEach((entry) => {
      const id = String(entry.getAttribute('data-field-definition-id') || '').trim();
      const type = String(entry.querySelector('.field-type-select')?.value || 'signature').trim();
      const participantID = String(entry.querySelector('.field-participant-select')?.value || '').trim();
      const page = Number(entry.querySelector('input[name*=".page"]')?.value || '1') || 1;
      const required = Boolean(entry.querySelector('input[name*=".required"]')?.checked);
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
