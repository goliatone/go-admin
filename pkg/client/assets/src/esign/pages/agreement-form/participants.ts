// @ts-nocheck

export function createParticipantsController(options = {}) {
  const {
    initialParticipants = [],
    onParticipantsChanged,
  } = options;

  const participantsContainer = document.getElementById('participants-container');
  const participantTemplate = document.getElementById('participant-template');
  const addParticipantBtn = document.getElementById('add-participant-btn');

  let participantCounter = 0;
  let participantFormIndex = 0;

  function generateParticipantId() {
    return `temp_${Date.now()}_${participantCounter++}`;
  }

  function addParticipant(data = {}) {
    const clone = participantTemplate.content.cloneNode(true);
    const entry = clone.querySelector('.participant-entry');
    const participantId = data.id || generateParticipantId();
    entry.setAttribute('data-participant-id', participantId);

    const idInput = entry.querySelector('.participant-id-input');
    const nameInput = entry.querySelector('input[name="participants[].name"]');
    const emailInput = entry.querySelector('input[name="participants[].email"]');
    const roleSelect = entry.querySelector('select[name="participants[].role"]');
    const signingStageInput = entry.querySelector('input[name="participants[].signing_stage"]');
    const notifyInput = entry.querySelector('input[name="participants[].notify"]');
    const signingStageWrapper = entry.querySelector('.signing-stage-wrapper');

    const formIndex = participantFormIndex++;
    idInput.name = `participants[${formIndex}].id`;
    idInput.value = participantId;
    nameInput.name = `participants[${formIndex}].name`;
    emailInput.name = `participants[${formIndex}].email`;
    roleSelect.name = `participants[${formIndex}].role`;
    if (signingStageInput) {
      signingStageInput.name = `participants[${formIndex}].signing_stage`;
    }
    if (notifyInput) {
      notifyInput.name = `participants[${formIndex}].notify`;
    }

    if (data.name) nameInput.value = data.name;
    if (data.email) emailInput.value = data.email;
    if (data.role) roleSelect.value = data.role;
    if (signingStageInput && data.signing_stage) {
      signingStageInput.value = data.signing_stage;
    }
    if (notifyInput) {
      notifyInput.checked = data.notify !== false;
    }

    const syncSigningStageVisibility = () => {
      if (!signingStageWrapper || !signingStageInput) return;
      const isSigner = roleSelect.value === 'signer';
      signingStageWrapper.classList.toggle('hidden', !isSigner);
      if (!isSigner) {
        signingStageInput.value = '';
      } else if (!signingStageInput.value) {
        signingStageInput.value = '1';
      }
    };
    syncSigningStageVisibility();

    entry.querySelector('.remove-participant-btn').addEventListener('click', () => {
      entry.remove();
      onParticipantsChanged?.();
    });

    roleSelect.addEventListener('change', () => {
      syncSigningStageVisibility();
      onParticipantsChanged?.();
    });

    participantsContainer.appendChild(clone);
  }

  function initialize() {
    if (initialParticipants.length > 0) {
      initialParticipants.forEach((participant) => {
        addParticipant({
          id: String(participant.id || '').trim(),
          name: String(participant.name || '').trim(),
          email: String(participant.email || '').trim(),
          role: String(participant.role || 'signer').trim() || 'signer',
          notify: participant.notify !== false,
          signing_stage: Number(participant.signing_stage || participant.signingStage || 1) || 1,
        });
      });
    } else {
      addParticipant();
    }
  }

  function bindEvents() {
    addParticipantBtn.addEventListener('click', () => addParticipant());

    const participantObserver = new MutationObserver(() => {
      onParticipantsChanged?.();
    });
    participantObserver.observe(participantsContainer, { childList: true, subtree: true });

    participantsContainer.addEventListener('change', (e) => {
      if (e.target.matches('select[name*=".role"]') || e.target.matches('input[name*=".name"]') || e.target.matches('input[name*=".email"]')) {
        onParticipantsChanged?.();
      }
    });
    participantsContainer.addEventListener('input', (e) => {
      if (e.target.matches('input[name*=".name"]') || e.target.matches('input[name*=".email"]')) {
        onParticipantsChanged?.();
      }
    });
  }

  function getSignerParticipants() {
    const entries = participantsContainer.querySelectorAll('.participant-entry');
    const signers = [];
    entries.forEach((entry) => {
      const participantId = entry.getAttribute('data-participant-id');
      const roleSelect = entry.querySelector('select[name*=".role"]');
      const nameInput = entry.querySelector('input[name*=".name"]');
      const emailInput = entry.querySelector('input[name*=".email"]');
      if (roleSelect.value === 'signer') {
        signers.push({
          id: participantId,
          name: nameInput.value || emailInput.value || 'Signer',
          email: emailInput.value,
        });
      }
    });
    return signers;
  }

  function collectParticipantsForState() {
    const participants = [];
    participantsContainer.querySelectorAll('.participant-entry').forEach((entry) => {
      const id = entry.getAttribute('data-participant-id');
      const name = entry.querySelector('input[name*=".name"]')?.value || '';
      const email = entry.querySelector('input[name*=".email"]')?.value || '';
      const role = entry.querySelector('select[name*=".role"]')?.value || 'signer';
      const signingStage = parseInt(entry.querySelector('.signing-stage-input')?.value || '1', 10);
      const notify = entry.querySelector('.notify-input')?.checked !== false;
      participants.push({ tempId: id, name, email, role, notify, signingStage });
    });
    return participants;
  }

  function restoreFromState(state) {
    if (!state?.participants || state.participants.length === 0) return;
    participantsContainer.innerHTML = '';
    participantFormIndex = 0;
    state.participants.forEach((participant) => {
      addParticipant({
        id: participant.tempId,
        name: participant.name,
        email: participant.email,
        role: participant.role,
        notify: participant.notify !== false,
        signing_stage: participant.signingStage,
      });
    });
  }

  return {
    refs: {
      participantsContainer,
      addParticipantBtn,
    },
    initialize,
    bindEvents,
    addParticipant,
    getSignerParticipants,
    collectParticipantsForState,
    restoreFromState,
  };
}
