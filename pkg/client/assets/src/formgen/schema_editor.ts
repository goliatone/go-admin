/**
 * Schema editor component.
 * Adds JSON formatting, validation, metadata helpers, and enhanced editing experience.
 */
(() => {
  const slugify = (value: string): string =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'block';

  const guessSchemaVersion = (root: HTMLElement): string => {
    const form = root.closest('form');
    if (!form) {
      return 'block@v1.0.0';
    }
    const candidates = [
      'input[name="name"]',
      'input[name="type"]',
      'input[name="slug"]',
    ];
    for (const selector of candidates) {
      const input = form.querySelector<HTMLInputElement>(selector);
      const value = input?.value?.trim();
      if (value) {
        return `${slugify(value)}@v1.0.0`;
      }
    }
    return 'block@v1.0.0';
  };

  const parsePayload = (raw: string): { value: any; error?: string; errorLine?: number } => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { value: {} };
    }
    try {
      return { value: JSON.parse(trimmed) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON';
      // Try to extract line number from error message
      const lineMatch = msg.match(/position (\d+)/i) || msg.match(/line (\d+)/i);
      const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
      return { value: null, error: msg, errorLine };
    }
  };

  const formatPayload = (payload: any): string => JSON.stringify(payload, null, 2);

  const ensureMetadata = (payload: any, version: string): any => {
    const root = payload && typeof payload === 'object' ? payload : {};
    const meta = (root.metadata && typeof root.metadata === 'object' && !Array.isArray(root.metadata))
      ? root.metadata
      : {};
    if (!meta.schema_version) {
      meta.schema_version = version;
    }
    root.metadata = meta;
    return root;
  };

  /**
   * Calculate schema statistics
   */
  const getSchemaStats = (payload: any): { properties: number; required: number; depth: number; types: string[] } => {
    if (!payload || typeof payload !== 'object') {
      return { properties: 0, required: 0, depth: 0, types: [] };
    }

    let properties = 0;
    let required = 0;
    let maxDepth = 0;
    const types = new Set<string>();

    const traverse = (obj: any, depth: number) => {
      if (!obj || typeof obj !== 'object') return;
      maxDepth = Math.max(maxDepth, depth);

      if (obj.type) {
        types.add(String(obj.type));
      }

      if (obj.properties && typeof obj.properties === 'object') {
        const props = Object.keys(obj.properties);
        properties += props.length;
        props.forEach((key) => traverse(obj.properties[key], depth + 1));
      }

      if (Array.isArray(obj.required)) {
        required += obj.required.length;
      }

      if (obj.items) {
        traverse(obj.items, depth + 1);
      }

      if (obj.allOf || obj.anyOf || obj.oneOf) {
        const combiner = obj.allOf || obj.anyOf || obj.oneOf;
        if (Array.isArray(combiner)) {
          combiner.forEach((sub: any) => traverse(sub, depth + 1));
        }
      }
    };

    traverse(payload, 0);
    return { properties, required, depth: maxDepth, types: Array.from(types) };
  };

  const setStatus = (root: HTMLElement, message: string, state: 'ok' | 'error' | 'info' | '') => {
    const status = root.querySelector<HTMLElement>('[data-schema-status]');
    if (!status) {
      return;
    }
    status.textContent = message;
    status.dataset.state = state;
    status.classList.remove('text-green-600', 'text-red-600', 'text-blue-600');
    if (state === 'ok') {
      status.classList.add('text-green-600');
    } else if (state === 'error') {
      status.classList.add('text-red-600');
    } else if (state === 'info') {
      status.classList.add('text-blue-600');
    }
  };

  /**
   * Update line numbers display
   */
  const updateLineNumbers = (textarea: HTMLTextAreaElement, lineNumbersEl: HTMLElement | null) => {
    if (!lineNumbersEl) return;

    const lines = textarea.value.split('\n');
    const lineCount = lines.length;
    const digits = String(lineCount).length;

    lineNumbersEl.innerHTML = lines
      .map((_, idx) => `<span class="block text-right pr-2">${String(idx + 1).padStart(digits, ' ')}</span>`)
      .join('');
  };

  /**
   * Sync scroll between textarea and line numbers
   */
  const syncScroll = (textarea: HTMLTextAreaElement, lineNumbersEl: HTMLElement | null) => {
    if (!lineNumbersEl) return;
    lineNumbersEl.scrollTop = textarea.scrollTop;
  };

  /**
   * Update stats display
   */
  const updateStats = (root: HTMLElement, payload: any) => {
    const statsEl = root.querySelector<HTMLElement>('[data-schema-stats]');
    if (!statsEl) return;

    const stats = getSchemaStats(payload);
    statsEl.innerHTML = `
      <span class="text-gray-600 dark:text-gray-400">
        ${stats.properties} properties
        ${stats.required > 0 ? ` · ${stats.required} required` : ''}
        ${stats.depth > 0 ? ` · depth ${stats.depth}` : ''}
        ${stats.types.length > 0 ? ` · types: ${stats.types.join(', ')}` : ''}
      </span>
    `;
  };

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  };

  /**
   * Insert a template at cursor position
   */
  const insertTemplate = (textarea: HTMLTextAreaElement, template: string) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + template + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + template.length;
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const TEMPLATES = {
    property: `"property_name": {
  "type": "string",
  "title": "Property Title",
  "description": "Property description"
}`,
    object: `{
  "type": "object",
  "title": "Object Title",
  "properties": {},
  "required": []
}`,
    array: `{
  "type": "array",
  "title": "Array Title",
  "items": {
    "type": "string"
  }
}`,
    enum: `{
  "type": "string",
  "title": "Enum Title",
  "enum": ["option1", "option2", "option3"]
}`,
  };

  const initSchemaEditor = () => {
    document.querySelectorAll<HTMLElement>('[data-schema-editor]').forEach((root) => {
      const textarea = root.querySelector<HTMLTextAreaElement>('[data-schema-input]');
      if (!textarea) {
        return;
      }

      const formatBtn = root.querySelector<HTMLButtonElement>('[data-schema-format]');
      const validateBtn = root.querySelector<HTMLButtonElement>('[data-schema-validate]');
      const metadataBtn = root.querySelector<HTMLButtonElement>('[data-schema-metadata]');
      const copyBtn = root.querySelector<HTMLButtonElement>('[data-schema-copy]');
      const lineNumbersEl = root.querySelector<HTMLElement>('[data-schema-line-numbers]');
      const statsEl = root.querySelector<HTMLElement>('[data-schema-stats]');

      // Template insertion buttons
      root.querySelectorAll<HTMLButtonElement>('[data-schema-template]').forEach((btn) => {
        const templateKey = btn.dataset.schemaTemplate as keyof typeof TEMPLATES;
        if (templateKey && TEMPLATES[templateKey]) {
          btn.addEventListener('click', () => {
            insertTemplate(textarea, TEMPLATES[templateKey]);
            setStatus(root, `Inserted ${templateKey} template`, 'info');
          });
        }
      });

      // Update line numbers on input
      if (lineNumbersEl) {
        updateLineNumbers(textarea, lineNumbersEl);
        textarea.addEventListener('input', () => updateLineNumbers(textarea, lineNumbersEl));
        textarea.addEventListener('scroll', () => syncScroll(textarea, lineNumbersEl));
      }

      // Format button
      formatBtn?.addEventListener('click', () => {
        const parsed = parsePayload(textarea.value);
        if (parsed.error) {
          setStatus(root, parsed.error, 'error');
          return;
        }
        textarea.value = formatPayload(parsed.value);
        if (lineNumbersEl) updateLineNumbers(textarea, lineNumbersEl);
        if (statsEl) updateStats(root, parsed.value);
        setStatus(root, 'Formatted', 'ok');
      });

      // Validate button
      validateBtn?.addEventListener('click', () => {
        const parsed = parsePayload(textarea.value);
        if (parsed.error) {
          setStatus(root, parsed.error, 'error');
          return;
        }
        if (statsEl) updateStats(root, parsed.value);
        setStatus(root, 'Valid JSON', 'ok');
      });

      // Metadata button
      metadataBtn?.addEventListener('click', () => {
        const parsed = parsePayload(textarea.value);
        if (parsed.error) {
          setStatus(root, parsed.error, 'error');
          return;
        }
        const version = guessSchemaVersion(root);
        const updated = ensureMetadata(parsed.value, version);
        textarea.value = formatPayload(updated);
        if (lineNumbersEl) updateLineNumbers(textarea, lineNumbersEl);
        if (statsEl) updateStats(root, updated);
        setStatus(root, 'Metadata inserted', 'ok');
      });

      // Copy button
      copyBtn?.addEventListener('click', async () => {
        const success = await copyToClipboard(textarea.value);
        setStatus(root, success ? 'Copied to clipboard' : 'Copy failed', success ? 'ok' : 'error');
      });

      // Clear status on input
      textarea.addEventListener('input', () => {
        setStatus(root, '', '');
      });

      // Keyboard shortcuts
      textarea.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + Shift + F = Format
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'f') {
          event.preventDefault();
          formatBtn?.click();
          return;
        }

        // Ctrl/Cmd + S = Validate (prevent page save)
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          validateBtn?.click();
          return;
        }

        // Ctrl/Cmd + M = Add metadata
        if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
          event.preventDefault();
          metadataBtn?.click();
          return;
        }

        // Tab handling for JSON editing
        if (event.key === 'Tab') {
          event.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;

          if (event.shiftKey) {
            // Un-indent: remove leading spaces from current line
            const text = textarea.value;
            const lineStart = text.lastIndexOf('\n', start - 1) + 1;
            const lineContent = text.substring(lineStart, start);
            const leadingSpaces = lineContent.match(/^  /);
            if (leadingSpaces) {
              textarea.value = text.substring(0, lineStart) + text.substring(lineStart + 2);
              textarea.selectionStart = textarea.selectionEnd = start - 2;
            }
          } else {
            // Indent: insert 2 spaces
            textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Auto-close brackets
        const pairs: Record<string, string> = { '{': '}', '[': ']', '"': '"' };
        if (pairs[event.key]) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          if (start === end) {
            event.preventDefault();
            const openChar = event.key;
            const closeChar = pairs[openChar];
            textarea.value = textarea.value.substring(0, start) + openChar + closeChar + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 1;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });

      // Initial stats update
      const initialParsed = parsePayload(textarea.value);
      if (!initialParsed.error && statsEl) {
        updateStats(root, initialParsed.value);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSchemaEditor);
  } else {
    initSchemaEditor();
  }
})();
