function parseConfig(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}
function resolveConfig(root) {
  const configRoot = root.closest("[data-component-config]");
  return parseConfig(configRoot?.getAttribute("data-component-config") ?? null);
}
function parseBoolean(value) {
  if (value == null) return void 0;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return void 0;
}
function resolveElements(root) {
  const list = root.querySelector("[data-block-list]");
  const output = root.querySelector("input[data-block-output]");
  if (!list || !output) return null;
  const addSelect = root.querySelector("[data-block-add-select]");
  const addButton = root.querySelector("[data-block-add]");
  const emptyState = root.querySelector("[data-block-empty]");
  return {
    root,
    list,
    output,
    addSelect: addSelect ?? void 0,
    addButton: addButton ?? void 0,
    emptyState: emptyState ?? void 0
  };
}
function toPathParts(raw) {
  const cleaned = raw.replace(/\]/g, "");
  return cleaned.split(/\.|\[/).map((part) => part.trim()).filter((part) => part.length > 0);
}
function buildInputName(base, index, raw) {
  if (!base) return raw;
  const parts = toPathParts(raw);
  let result = `${base}[${index}]`;
  for (const part of parts) {
    result += `[${part}]`;
  }
  return result;
}
function getByPath(data, rawPath) {
  if (!data || !rawPath) return void 0;
  const parts = toPathParts(rawPath);
  let current = data;
  for (const part of parts) {
    if (current == null) return void 0;
    current = current[part];
  }
  return current;
}
function setByPath(target, rawPath, value) {
  if (!rawPath) return;
  const parts = toPathParts(rawPath);
  if (parts.length === 0) return;
  let current = target;
  parts.forEach((part, idx) => {
    const isLast = idx === parts.length - 1;
    const nextPart = parts[idx + 1];
    const nextIsIndex = nextPart !== void 0 && /^\d+$/.test(nextPart);
    if (isLast) {
      if (part === "") return;
      current[part] = value;
      return;
    }
    if (current[part] == null || typeof current[part] !== "object") {
      current[part] = nextIsIndex ? [] : {};
    }
    current = current[part];
  });
}
function readFieldValue(elements) {
  if (elements.length === 0) return void 0;
  const first = elements[0];
  if (first instanceof HTMLSelectElement && first.multiple) {
    return Array.from(first.selectedOptions).map((opt) => opt.value);
  }
  if (first instanceof HTMLInputElement) {
    if (first.type === "radio") {
      const checked = elements.find((el) => el.checked);
      return checked ? checked.value : void 0;
    }
    if (first.type === "checkbox") {
      if (elements.length > 1) {
        return elements.filter((el) => el.checked).map((el) => el.value);
      }
      return first.checked;
    }
  }
  return first.value;
}
function setFieldValue(element, value) {
  if (value == null) return;
  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox") {
      if (Array.isArray(value)) {
        element.checked = value.map(String).includes(element.value);
      } else if (typeof value === "boolean") {
        element.checked = value;
      } else {
        element.checked = String(value) === element.value || value === true;
      }
      return;
    }
    if (element.type === "radio") {
      element.checked = String(value) === element.value;
      return;
    }
  }
  if (element instanceof HTMLSelectElement && element.multiple) {
    const values = Array.isArray(value) ? value.map(String) : [String(value)];
    Array.from(element.options).forEach((opt) => {
      opt.selected = values.includes(opt.value);
    });
    return;
  }
  element.value = String(value);
}
function collectTemplates(root) {
  const templates = new Map();
  root.querySelectorAll("template[data-block-template]").forEach((template) => {
    const type = template.dataset.blockType?.trim();
    if (!type) return;
    const label = template.dataset.blockLabel?.trim() || type;
    const icon = template.dataset.blockIcon?.trim();
    const collapsed = parseBoolean(template.dataset.blockCollapsed);
    templates.set(type, { type, label, icon: icon || void 0, collapsed, template });
  });
  return templates;
}
function ensureTypeField(item, type) {
  const inputs = item.querySelectorAll('[name="_type"], [data-block-type-input]');
  if (inputs.length === 0) {
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "_type";
    hidden.value = type;
    hidden.setAttribute("data-block-type-input", "true");
    hidden.setAttribute("data-block-ignore", "true");
    item.appendChild(hidden);
    return;
  }
  inputs.forEach((input) => {
    input.setAttribute("data-block-type-input", "true");
    input.setAttribute("data-block-ignore", "true");
    if (input instanceof HTMLInputElement) {
      input.value = type;
      input.readOnly = true;
    } else if (input instanceof HTMLSelectElement) {
      Array.from(input.options).forEach((opt) => {
        opt.selected = opt.value === type;
      });
      input.disabled = true;
    } else {
      input.value = type;
      input.readOnly = true;
    }
    const wrapper = input.closest("[data-component]");
    if (wrapper) {
      wrapper.classList.add("hidden");
    }
  });
}
function initBlockEditor(root) {
  const elements = resolveElements(root);
  if (!elements) return;
  const config = resolveConfig(root);
  const templates = collectTemplates(root);
  const baseName = root.dataset.blockField || elements.output.name;
  const sortableHint = parseBoolean(root.dataset.blockSortable);
  const sortable = config.sortable ?? sortableHint ?? false;
  const allowDrag = config.allowDrag ?? sortable;
  const addLabel = config.addLabel || elements.addButton?.dataset.blockAddLabel || "Add block";
  const emptyLabel = config.emptyLabel || elements.emptyState?.dataset.blockEmptyLabel || "No blocks added yet.";
  if (elements.addButton) {
    elements.addButton.textContent = addLabel;
  }
  if (elements.emptyState) {
    elements.emptyState.textContent = emptyLabel;
  }
  const list = elements.list;
  const output = elements.output;
  const syncOutput = () => {
    const items = Array.from(list.querySelectorAll("[data-block-item]"));
    const payload = items.map((item) => {
      const data = {};
      const groups = new Map();
      item.querySelectorAll("input, select, textarea").forEach((field) => {
        if (field.dataset.blockIgnore === "true" || field.hasAttribute("data-block-ignore")) return;
        const key = field.getAttribute("data-block-field-name") || field.name || "";
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(field);
      });
      groups.forEach((group, key) => {
        const value = readFieldValue(group);
        if (value !== void 0) {
          setByPath(data, key, value);
        }
      });
      const blockType = item.dataset.blockType || data._type || "";
      if (blockType) data._type = blockType;
      return data;
    });
    output.value = JSON.stringify(payload);
  };
  const updateNames = () => {
    const items = Array.from(list.querySelectorAll("[data-block-item]"));
    items.forEach((item, index) => {
      item.querySelectorAll("input, select, textarea").forEach((field) => {
        if (field.dataset.blockIgnore === "true" || field.hasAttribute("data-block-ignore")) return;
        const original = field.getAttribute("data-block-field-name") || field.name;
        if (!original) return;
        if (!field.hasAttribute("data-block-field-name")) {
          field.setAttribute("data-block-field-name", original);
        }
        field.name = buildInputName(baseName, index, original);
      });
    });
  };
  const updateEmptyState = () => {
    if (!elements.emptyState) return;
    const hasItems = list.querySelector("[data-block-item]");
    elements.emptyState.classList.toggle("hidden", Boolean(hasItems));
  };
  const syncAll = () => {
    updateNames();
    syncOutput();
    updateEmptyState();
  };
  const form = root.closest("form");
  if (form) {
    form.addEventListener("submit", () => {
      syncOutput();
    });
  }
  const fillValues = (item, values) => {
    item.querySelectorAll("input, select, textarea").forEach((field) => {
      const key = field.getAttribute("data-block-field-name") || field.name;
      if (!key) return;
      const value = getByPath(values, key);
      if (value !== void 0) {
        setFieldValue(field, value);
      }
    });
  };
  const createBlockItem = (template, values) => {
    const wrapper = document.createElement("div");
    wrapper.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700";
    wrapper.setAttribute("data-block-item", "true");
    wrapper.dataset.blockType = template.type;
    if (sortable) {
      wrapper.setAttribute("draggable", "true");
    }
    const header = document.createElement("div");
    header.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700";
    header.setAttribute("data-block-header", "true");
    const titleWrap = document.createElement("div");
    titleWrap.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
    const icon = document.createElement("span");
    icon.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200";
    icon.textContent = template.icon || template.label.slice(0, 1).toUpperCase();
    const label = document.createElement("span");
    label.textContent = template.label;
    const typeBadge = document.createElement("span");
    typeBadge.className = "text-xs text-gray-500 dark:text-gray-400";
    typeBadge.textContent = template.type;
    titleWrap.appendChild(icon);
    titleWrap.appendChild(label);
    titleWrap.appendChild(typeBadge);
    const actions = document.createElement("div");
    actions.className = "flex items-center gap-2";
    if (sortable) {
      const moveUp = document.createElement("button");
      moveUp.type = "button";
      moveUp.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
      moveUp.textContent = "Up";
      moveUp.setAttribute("data-block-move-up", "true");
      const moveDown = document.createElement("button");
      moveDown.type = "button";
      moveDown.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
      moveDown.textContent = "Down";
      moveDown.setAttribute("data-block-move-down", "true");
      actions.appendChild(moveUp);
      actions.appendChild(moveDown);
    }
    const collapseBtn = document.createElement("button");
    collapseBtn.type = "button";
    collapseBtn.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
    collapseBtn.textContent = "Collapse";
    collapseBtn.setAttribute("data-block-collapse", "true");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "text-xs text-red-600 hover:text-red-700";
    removeBtn.textContent = "Remove";
    removeBtn.setAttribute("data-block-remove", "true");
    actions.appendChild(collapseBtn);
    actions.appendChild(removeBtn);
    if (sortable) {
      const dragHandle = document.createElement("span");
      dragHandle.className = "text-xs text-gray-400 cursor-move";
      dragHandle.textContent = "Drag";
      dragHandle.setAttribute("data-block-drag-handle", "true");
      actions.appendChild(dragHandle);
    }
    header.appendChild(titleWrap);
    header.appendChild(actions);
    const body = document.createElement("div");
    body.className = "p-4 space-y-4";
    body.setAttribute("data-block-body", "true");
    const fragment = template.template.content.cloneNode(true);
    body.appendChild(fragment);
    wrapper.appendChild(header);
    wrapper.appendChild(body);
    ensureTypeField(wrapper, template.type);
    if (values) {
      fillValues(wrapper, values);
    }
    const shouldCollapse = template.collapsed ?? false;
    if (shouldCollapse) {
      body.classList.add("hidden");
      wrapper.dataset.blockCollapsed = "true";
      collapseBtn.textContent = "Expand";
    }
    return wrapper;
  };
  const addBlock = (type, values) => {
    const template = templates.get(type);
    if (!template) return;
    const item = createBlockItem(template, values);
    list.appendChild(item);
    syncAll();
  };
  if (elements.addButton && elements.addSelect) {
    elements.addButton.addEventListener("click", () => {
      const type = elements.addSelect?.value?.trim();
      if (type) {
        addBlock(type);
        elements.addSelect.value = "";
      }
    });
  }
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest("[data-block-item]");
    if (!item) return;
    if (target.closest("[data-block-remove]")) {
      item.remove();
      syncAll();
      return;
    }
    if (target.closest("[data-block-collapse]")) {
      const body = item.querySelector("[data-block-body]");
      if (body) {
        const isCollapsed = body.classList.toggle("hidden");
        item.dataset.blockCollapsed = isCollapsed ? "true" : "false";
        const button = target.closest("[data-block-collapse]");
        if (button) button.textContent = isCollapsed ? "Expand" : "Collapse";
      }
      return;
    }
    if (target.closest("[data-block-move-up]")) {
      const prev = item.previousElementSibling;
      if (prev) list.insertBefore(item, prev);
      syncAll();
      return;
    }
    if (target.closest("[data-block-move-down]")) {
      const next = item.nextElementSibling;
      if (next) list.insertBefore(next, item);
      syncAll();
      return;
    }
  });
  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest("[data-block-item]")) return;
    syncAll();
  });
  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest("[data-block-item]")) return;
    syncAll();
  });
  if (sortable && allowDrag) {
    let dragging = null;
    list.addEventListener("dragstart", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const handle = target.closest("[data-block-drag-handle]");
      if (!handle) {
        event.preventDefault();
        return;
      }
      const item = target.closest("[data-block-item]");
      if (!item) return;
      dragging = item;
      item.classList.add("opacity-70");
      event.dataTransfer?.setData("text/plain", "block");
    });
    list.addEventListener("dragover", (event) => {
      if (!dragging) return;
      event.preventDefault();
      const target = event.target instanceof HTMLElement ? event.target.closest("[data-block-item]") : null;
      if (!target || target === dragging) return;
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
      list.insertBefore(dragging, shouldInsertAfter ? target.nextSibling : target);
    });
    list.addEventListener("dragend", () => {
      if (!dragging) return;
      dragging.classList.remove("opacity-70");
      dragging = null;
      syncAll();
    });
  }
  if (elements.addSelect) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select block type";
    elements.addSelect.appendChild(placeholder);
    templates.forEach((template) => {
      const option = document.createElement("option");
      option.value = template.type;
      option.textContent = template.label;
      elements.addSelect.appendChild(option);
    });
    elements.addSelect.value = "";
  }
  const initialValue = output.value?.trim();
  if (initialValue) {
    try {
      const parsed = JSON.parse(initialValue);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          const type = typeof entry === "object" && entry ? entry._type : "";
          if (type && templates.has(type)) {
            addBlock(type, entry);
          }
        });
      }
    } catch {
      // ignore malformed data
    }
  }
  syncAll();
}
function initBlockEditors(scope = document) {
  const roots = Array.from(scope.querySelectorAll('[data-component="block"], [data-block-editor]'));
  roots.forEach((root) => initBlockEditor(root));
}
function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}
onReady(() => initBlockEditors());
export {
  initBlockEditors
};
//# sourceMappingURL=block_editor.js.map
