import type { DocumentPreviewCard } from './preview-card';

interface WizardStepMap {
  DOCUMENT: number;
  DETAILS: number;
  PARTICIPANTS: number;
  FIELDS: number;
  PLACEMENT: number;
  REVIEW: number;
}

interface WizardNavigationControllerOptions {
  totalWizardSteps: number;
  wizardStep: WizardStepMap;
  nextStepLabels: Record<number, string>;
  submitBtn: HTMLElement;
  previewCard: DocumentPreviewCard;
  updateCoordinationUI(): void;
  validateStep(stepNum: number): boolean;
  onPlacementStep?(): void;
  onReviewStep?(): void;
  onStepChanged?(stepNum: number): void;
  initialStep?: number;
}

export interface WizardNavigationController {
  bindEvents(): void;
  getCurrentStep(): number;
  setCurrentStep(stepNum: number): void;
  goToStep(stepNum: number): void;
  updateWizardUI(): void;
}

function parseStepNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createWizardNavigationController(
  options: WizardNavigationControllerOptions,
): WizardNavigationController {
  const {
    totalWizardSteps,
    wizardStep,
    nextStepLabels,
    submitBtn,
    previewCard,
    updateCoordinationUI,
    validateStep,
    onPlacementStep,
    onReviewStep,
    onStepChanged,
    initialStep = 1,
  } = options;

  let currentStep = initialStep;

  const wizardStepBtns = Array.from(document.querySelectorAll<HTMLElement>('.wizard-step-btn'));
  const wizardSteps = Array.from(document.querySelectorAll<HTMLElement>('.wizard-step'));
  const wizardConnectors = Array.from(document.querySelectorAll<HTMLElement>('.wizard-connector'));
  const wizardPrevBtn = document.getElementById('wizard-prev-btn');
  const wizardNextBtn = document.getElementById('wizard-next-btn');
  const wizardSaveBtn = document.getElementById('wizard-save-btn');

  function updateWizardUI() {
    wizardStepBtns.forEach((btn, index) => {
      const stepNum = index + 1;
      const stepNumber = btn.querySelector('.wizard-step-number');
      if (!(stepNumber instanceof HTMLElement)) return;

      if (stepNum < currentStep) {
        btn.classList.remove('text-gray-500', 'text-blue-600');
        btn.classList.add('text-green-600');
        stepNumber.classList.remove('bg-gray-300', 'text-gray-600', 'bg-blue-600', 'text-white');
        stepNumber.classList.add('bg-green-600', 'text-white');
        btn.removeAttribute('aria-current');
      } else if (stepNum === currentStep) {
        btn.classList.remove('text-gray-500', 'text-green-600');
        btn.classList.add('text-blue-600');
        stepNumber.classList.remove('bg-gray-300', 'text-gray-600', 'bg-green-600');
        stepNumber.classList.add('bg-blue-600', 'text-white');
        btn.setAttribute('aria-current', 'step');
      } else {
        btn.classList.remove('text-blue-600', 'text-green-600');
        btn.classList.add('text-gray-500');
        stepNumber.classList.remove('bg-blue-600', 'text-white', 'bg-green-600');
        stepNumber.classList.add('bg-gray-300', 'text-gray-600');
        btn.removeAttribute('aria-current');
      }
    });

    wizardConnectors.forEach((connector, index) => {
      if (index < currentStep - 1) {
        connector.classList.remove('bg-gray-300');
        connector.classList.add('bg-green-600');
      } else {
        connector.classList.remove('bg-green-600');
        connector.classList.add('bg-gray-300');
      }
    });

    wizardSteps.forEach((step) => {
      const stepNum = parseStepNumber(step.dataset.step);
      if (stepNum === currentStep) {
        step.classList.remove('hidden');
      } else {
        step.classList.add('hidden');
      }
    });

    wizardPrevBtn?.classList.toggle('hidden', currentStep === 1);
    wizardNextBtn?.classList.toggle('hidden', currentStep === totalWizardSteps);
    wizardSaveBtn?.classList.toggle('hidden', currentStep !== totalWizardSteps);
    submitBtn.classList.toggle('hidden', currentStep !== totalWizardSteps);
    updateCoordinationUI();

    if (currentStep < totalWizardSteps) {
      const nextStepName = nextStepLabels[currentStep] || 'Next';
      if (wizardNextBtn) {
        wizardNextBtn.innerHTML = `
        ${nextStepName}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
      }
    }

    if (currentStep === wizardStep.PLACEMENT) {
      onPlacementStep?.();
    } else if (currentStep === wizardStep.REVIEW) {
      onReviewStep?.();
    }

    previewCard.updateVisibility(currentStep);
  }

  function goToStep(stepNum: number): void {
    if (stepNum < wizardStep.DOCUMENT || stepNum > totalWizardSteps) return;

    if (stepNum > currentStep) {
      for (let i = currentStep; i < stepNum; i++) {
        if (!validateStep(i)) return;
      }
    }

    currentStep = stepNum;
    updateWizardUI();
    onStepChanged?.(stepNum);
    document.querySelector('.wizard-step:not(.hidden)')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindEvents() {
    wizardStepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetStep = parseStepNumber(btn.dataset.step);
        goToStep(targetStep);
      });
    });

    wizardPrevBtn?.addEventListener('click', () => goToStep(currentStep - 1));
    wizardNextBtn?.addEventListener('click', () => goToStep(currentStep + 1));

    wizardSaveBtn?.addEventListener('click', () => {
      const form = document.getElementById('agreement-form');
      if (!(form instanceof HTMLFormElement)) return;
      const draftInput = document.createElement('input');
      draftInput.type = 'hidden';
      draftInput.name = 'save_as_draft';
      draftInput.value = '1';
      form.appendChild(draftInput);
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
        return;
      }
      form.submit();
    });
  }

  return {
    bindEvents,
    getCurrentStep() {
      return currentStep;
    },
    setCurrentStep(stepNum) {
      currentStep = stepNum;
    },
    goToStep,
    updateWizardUI,
  };
}
