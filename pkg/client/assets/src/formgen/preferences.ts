(() => {
  const ROOT_SELECTOR = '[data-preferences-form]';
  const INPUT_SELECTOR = 'textarea[name="raw_ui"]';
  const JSON_EDITOR_SELECTOR = '[data-json-editor="true"]';
  const INVALID_JSON_MESSAGE = 'raw_ui must be valid JSON';
  const INVALID_TYPE_MESSAGE = 'raw_ui must be a JSON object';

  const isObject = (value: unknown): value is Record<string, unknown> => {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  };

  const parseJSON = (raw: string): { value: unknown; empty: boolean; error?: string } => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { value: null, empty: true };
    }
    try {
      return { value: JSON.parse(trimmed), empty: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : INVALID_JSON_MESSAGE;
      return { value: null, empty: false, error: message };
    }
  };

  const setValidity = (input: HTMLTextAreaElement, root: HTMLElement | null, message: string) => {
    input.setCustomValidity(message);
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (root) {
        root.setAttribute('data-json-editor-state', 'invalid');
      }
      return;
    }
    input.removeAttribute('aria-invalid');
    if (root) {
      root.setAttribute('data-json-editor-state', 'valid');
    }
  };

  const validateRawUI = (
    input: HTMLTextAreaElement,
    root: HTMLElement | null,
    strict: boolean,
    normalize: boolean
  ): boolean => {
    const parsed = parseJSON(input.value || '');
    if (parsed.empty) {
      setValidity(input, root, '');
      return true;
    }

    if (parsed.error) {
      if (strict) {
        setValidity(input, root, INVALID_JSON_MESSAGE);
        return false;
      }
      setValidity(input, root, '');
      return true;
    }

    if (strict && !isObject(parsed.value)) {
      setValidity(input, root, INVALID_TYPE_MESSAGE);
      return false;
    }

    setValidity(input, root, '');
    if (normalize) {
      input.value = JSON.stringify(parsed.value, null, 2);
    }
    return true;
  };

  const initContainer = (container: HTMLElement) => {
    const form = container.querySelector<HTMLFormElement>('form');
    const input = container.querySelector<HTMLTextAreaElement>(INPUT_SELECTOR);
    if (!form || !input) {
      return;
    }

    const strict = container.dataset.jsonEditorStrict === 'true';
    const root = input.closest<HTMLElement>(JSON_EDITOR_SELECTOR);

    const handleLiveValidation = () => {
      if (!strict) {
        setValidity(input, root, '');
        return;
      }
      validateRawUI(input, root, strict, false);
    };

    input.addEventListener('input', handleLiveValidation);
    input.addEventListener('blur', handleLiveValidation);

    form.addEventListener('submit', (event) => {
      const ok = validateRawUI(input, root, strict, true);
      if (!ok && strict) {
        event.preventDefault();
        input.reportValidity();
      }
    });

    handleLiveValidation();
  };

  const boot = () => {
    document.querySelectorAll<HTMLElement>(ROOT_SELECTOR).forEach(initContainer);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
