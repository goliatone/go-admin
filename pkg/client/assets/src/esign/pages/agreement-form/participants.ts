interface ParticipantRecordInput {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  notify?: unknown;
  signing_stage?: unknown;
  signingStage?: unknown;
}

export interface SignerParticipantSummary {
  id: string;
  name: string;
  email: string;
}

export interface ParticipantStateRecord {
  tempId: string;
  name: string;
  email: string;
  role: string;
  notify: boolean;
  signingStage: number;
}

interface ParticipantDraftInput {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  notify?: boolean;
  signing_stage?: number;
}

interface ParticipantsControllerOptions {
  initialParticipants?: ParticipantRecordInput[];
  onParticipantsChanged?(): void;
}

export interface ParticipantsController {
  refs: {
    participantsContainer: HTMLElement | null;
    addParticipantBtn: HTMLElement | null;
  };
  initialize(): void;
  bindEvents(): void;
  addParticipant(data?: ParticipantDraftInput): void;
  getSignerParticipants(): SignerParticipantSummary[];
  collectParticipantsForState(): ParticipantStateRecord[];
  restoreFromState(state: { participants?: ParticipantStateRecord[] } | null | undefined): void;
}

function inputElement(root: ParentNode, selector: string): HTMLInputElement | null {
  const element = root.querySelector(selector);
  return element instanceof HTMLInputElement ? element : null;
}

function selectElement(root: ParentNode, selector: string): HTMLSelectElement | null {
  const element = root.querySelector(selector);
  return element instanceof HTMLSelectElement ? element : null;
}

export function createParticipantsController(options: ParticipantsControllerOptions = {}): ParticipantsController {
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

  function addParticipant(data: ParticipantDraftInput = {}) {
    if (!(participantTemplate instanceof HTMLTemplateElement) || !participantsContainer) {
      return;
    }
    const clone = participantTemplate.content.cloneNode(true) as DocumentFragment;
    const entry = clone.querySelector('.participant-entry');
    if (!(entry instanceof HTMLElement)) return;
    const participantId = data.id || generateParticipantId();
    entry.setAttribute('data-participant-id', participantId);

    const idInput = inputElement(entry, '.participant-id-input');
    const nameInput = inputElement(entry, 'input[name="participants[].name"]');
    const emailInput = inputElement(entry, 'input[name="participants[].email"]');
    const roleSelect = selectElement(entry, 'select[name="participants[].role"]');
    const signingStageInput = inputElement(entry, 'input[name="participants[].signing_stage"]');
    const notifyInput = inputElement(entry, 'input[name="participants[].notify"]');
    const signingStageWrapper = entry.querySelector('.signing-stage-wrapper');
    if (!idInput || !nameInput || !emailInput || !roleSelect) return;

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
      signingStageInput.value = String(data.signing_stage);
    }
    if (notifyInput) {
      notifyInput.checked = data.notify !== false;
    }

    const syncSigningStageVisibility = () => {
      if (!(signingStageWrapper instanceof HTMLElement) || !signingStageInput) return;
      const isSigner = roleSelect.value === 'signer';
      signingStageWrapper.classList.toggle('hidden', !isSigner);
      if (!isSigner) {
        signingStageInput.value = '';
      } else if (!signingStageInput.value) {
        signingStageInput.value = '1';
      }
    };
    syncSigningStageVisibility();

    entry.querySelector('.remove-participant-btn')?.addEventListener('click', () => {
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
    if (!participantsContainer) return;
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
    if (!participantsContainer) return;
    addParticipantBtn?.addEventListener('click', () => addParticipant());

    const participantObserver = new MutationObserver(() => {
      onParticipantsChanged?.();
    });
    participantObserver.observe(participantsContainer, { childList: true, subtree: true });

    participantsContainer.addEventListener('change', (e) => {
      const target = e.target;
      if (
        target instanceof Element &&
        (target.matches('select[name*=".role"]') || target.matches('input[name*=".name"]') || target.matches('input[name*=".email"]'))
      ) {
        onParticipantsChanged?.();
      }
    });
    participantsContainer.addEventListener('input', (e) => {
      const target = e.target;
      if (
        target instanceof Element &&
        (target.matches('input[name*=".name"]') || target.matches('input[name*=".email"]'))
      ) {
        onParticipantsChanged?.();
      }
    });
  }

  function getSignerParticipants(): SignerParticipantSummary[] {
    if (!participantsContainer) return [];
    const entries = participantsContainer.querySelectorAll('.participant-entry');
    const signers: SignerParticipantSummary[] = [];
    entries.forEach((entry) => {
      const participantId = entry.getAttribute('data-participant-id');
      const roleSelect = selectElement(entry, 'select[name*=".role"]');
      const nameInput = inputElement(entry, 'input[name*=".name"]');
      const emailInput = inputElement(entry, 'input[name*=".email"]');
      if (roleSelect?.value === 'signer') {
        signers.push({
          id: String(participantId || ''),
          name: nameInput?.value || emailInput?.value || 'Signer',
          email: emailInput?.value || '',
        });
      }
    });
    return signers;
  }

  function collectParticipantsForState(): ParticipantStateRecord[] {
    if (!participantsContainer) return [];
    const participants: ParticipantStateRecord[] = [];
    participantsContainer.querySelectorAll('.participant-entry').forEach((entry) => {
      const id = entry.getAttribute('data-participant-id');
      const name = inputElement(entry, 'input[name*=".name"]')?.value || '';
      const email = inputElement(entry, 'input[name*=".email"]')?.value || '';
      const role = selectElement(entry, 'select[name*=".role"]')?.value || 'signer';
      const signingStage = Number.parseInt(inputElement(entry, '.signing-stage-input')?.value || '1', 10);
      const notify = inputElement(entry, '.notify-input')?.checked !== false;
      participants.push({
        tempId: String(id || ''),
        name,
        email,
        role,
        notify,
        signingStage: Number.isFinite(signingStage) ? signingStage : 1,
      });
    });
    return participants;
  }

  function restoreFromState(state: { participants?: ParticipantStateRecord[] } | null | undefined) {
    if (!participantsContainer || !state?.participants || state.participants.length === 0) return;
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
