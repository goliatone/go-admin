/**
 * Schema editor component.
 * Adds JSON formatting, validation, and metadata helpers for schema payloads.
 */
(() => {
  const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "block";
  const guessSchemaVersion = (root) => {
    const form = root.closest("form");
    if (!form) {
      return "block@v1.0.0";
    }
    const candidates = ["input[name=\"name\"]", "input[name=\"type\"]", "input[name=\"slug\"]"];
    for (const selector of candidates) {
      const input = form.querySelector(selector);
      const value = input?.value?.trim();
      if (value) {
        return `${slugify(value)}@v1.0.0`;
      }
    }
    return "block@v1.0.0";
  };
  const parsePayload = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { value: {} };
    }
    try {
      return { value: JSON.parse(trimmed) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid JSON";
      return { value: null, error: msg };
    }
  };
  const formatPayload = (payload) => JSON.stringify(payload, null, 2);
  const ensureMetadata = (payload, version) => {
    const root = payload && typeof payload === "object" ? payload : {};
    const meta = root.metadata && typeof root.metadata === "object" && !Array.isArray(root.metadata) ? root.metadata : {};
    if (!meta.schema_version) {
      meta.schema_version = version;
    }
    root.metadata = meta;
    return root;
  };
  const setStatus = (root, message, state) => {
    const status = root.querySelector("[data-schema-status]");
    if (!status) {
      return;
    }
    status.textContent = message;
    status.dataset.state = state;
    status.classList.remove("text-green-600", "text-red-600");
    if (state === "ok") {
      status.classList.add("text-green-600");
    } else if (state === "error") {
      status.classList.add("text-red-600");
    }
  };
  const initSchemaEditor = () => {
    document.querySelectorAll("[data-schema-editor]").forEach((root) => {
      const textarea = root.querySelector("[data-schema-input]");
      if (!textarea) {
        return;
      }
      const formatBtn = root.querySelector("[data-schema-format]");
      const validateBtn = root.querySelector("[data-schema-validate]");
      const metadataBtn = root.querySelector("[data-schema-metadata]");
      formatBtn?.addEventListener("click", () => {
        const parsed = parsePayload(textarea.value);
        if (parsed.error) {
          setStatus(root, parsed.error, "error");
          return;
        }
        textarea.value = formatPayload(parsed.value);
        setStatus(root, "Formatted", "ok");
      });
      validateBtn?.addEventListener("click", () => {
        const parsed = parsePayload(textarea.value);
        if (parsed.error) {
          setStatus(root, parsed.error, "error");
          return;
        }
        setStatus(root, "Valid JSON", "ok");
      });
      metadataBtn?.addEventListener("click", () => {
        const parsed = parsePayload(textarea.value);
        if (parsed.error) {
          setStatus(root, parsed.error, "error");
          return;
        }
        const version = guessSchemaVersion(root);
        const updated = ensureMetadata(parsed.value, version);
        textarea.value = formatPayload(updated);
        setStatus(root, "Metadata inserted", "ok");
      });
      textarea.addEventListener("input", () => {
        setStatus(root, "", "");
      });
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSchemaEditor);
  } else {
    initSchemaEditor();
  }
})();
//# sourceMappingURL=schema_editor.js.map
