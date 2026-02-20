/**
 * Permission matrix component.
 * Syncs checkbox state and extra permissions into a hidden input.
 */
(() => {
  const parsePermissionList = (raw?: string) =>
    (raw || "")
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

  const normalizePermission = (raw?: string) => (raw || "").trim();

  const initPermissionMatrix = () => {
    document.querySelectorAll<HTMLElement>('.permission-matrix').forEach((matrix) => {
      const hidden = matrix.querySelector<HTMLInputElement>('.permission-matrix-value');
      const checkboxes = matrix.querySelectorAll<HTMLInputElement>('.perm-checkbox');
      const extraSelect = matrix.querySelector<HTMLSelectElement>('select.permission-matrix-extra');
      const extraTextarea = matrix.querySelector<HTMLTextAreaElement>('textarea.permission-matrix-extra');
      const extraInput = matrix.querySelector<HTMLInputElement>('.permission-matrix-extra-input');
      const extraAdd = matrix.querySelector<HTMLButtonElement>('.permission-matrix-extra-add');
      const checkboxMap: Record<string, HTMLInputElement> = {};

      checkboxes.forEach((cb) => {
        const perm = cb.dataset.permission;
        if (perm) {
          checkboxMap[perm] = cb;
        }
      });

      if (!hidden || checkboxes.length === 0) {
        return;
      }

      const collectExtraPermissions = () => {
        if (extraSelect) {
          const extras: string[] = [];
          const seen: Record<string, boolean> = {};

          Array.from(extraSelect.selectedOptions).forEach((option) => {
            const perm = normalizePermission(option.value);
            if (!perm) {
              return;
            }
            const target = checkboxMap[perm];
            if (target) {
              target.checked = true;
              return;
            }
            if (!seen[perm]) {
              seen[perm] = true;
              extras.push(perm);
            }
          });

          return extras;
        }

        let raw = "";
        if (extraTextarea) {
          raw = extraTextarea.value || "";
        } else if (matrix.dataset.extraPermissions) {
          raw = matrix.dataset.extraPermissions || "";
        }

        const extras: string[] = [];
        const seen: Record<string, boolean> = {};
        parsePermissionList(raw).forEach((perm) => {
          const target = checkboxMap[perm];
          if (target) {
            target.checked = true;
            return;
          }
          if (!seen[perm]) {
            seen[perm] = true;
            extras.push(perm);
          }
        });
        return extras;
      };

      const syncPermissions = () => {
        const perms: string[] = [];
        const seen: Record<string, boolean> = {};

        collectExtraPermissions().forEach((perm) => {
          if (!seen[perm]) {
            seen[perm] = true;
            perms.push(perm);
          }
        });

        checkboxes.forEach((cb) => {
          if (cb.checked && cb.dataset.permission) {
            if (!seen[cb.dataset.permission]) {
              seen[cb.dataset.permission] = true;
              perms.push(cb.dataset.permission);
            }
          }
        });

        hidden.value = perms.join('\n');
      };

      const addExtraPermission = (raw: string) => {
        const permission = normalizePermission(raw);
        if (!permission) {
          return;
        }

        const target = checkboxMap[permission];
        if (target) {
          target.checked = true;
          syncPermissions();
          return;
        }

        if (extraSelect) {
          let option = Array.from(extraSelect.options).find((item) => normalizePermission(item.value) === permission);
          if (!option) {
            option = document.createElement("option");
            option.value = permission;
            option.textContent = permission;
            extraSelect.appendChild(option);
          }
          option.selected = true;
          extraSelect.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }

        if (extraTextarea) {
          const existing = parsePermissionList(extraTextarea.value || "");
          if (!existing.includes(permission)) {
            existing.push(permission);
            extraTextarea.value = existing.join("\n");
          }
          extraTextarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };

      const submitExtraInput = () => {
        if (!extraInput) {
          return;
        }
        const value = extraInput.value;
        addExtraPermission(value);
        extraInput.value = "";
      };

      checkboxes.forEach((cb) => {
        cb.addEventListener('change', syncPermissions);
      });
      if (extraSelect) {
        extraSelect.addEventListener("change", syncPermissions);
      }
      if (extraTextarea) {
        extraTextarea.addEventListener('input', syncPermissions);
      }
      if (extraAdd) {
        extraAdd.addEventListener("click", submitExtraInput);
      }
      if (extraInput) {
        extraInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            submitExtraInput();
          }
        });
      }

      syncPermissions();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPermissionMatrix);
  } else {
    initPermissionMatrix();
  }
})();
