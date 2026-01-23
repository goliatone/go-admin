/**
 * Permission matrix component.
 * Syncs checkbox state and extra permissions into a hidden input.
 */
(() => {
  const parsePermissionList = (raw?: string) =>
    (raw || '')
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

  const initPermissionMatrix = () => {
    document.querySelectorAll<HTMLElement>('.permission-matrix').forEach((matrix) => {
      const hidden = matrix.querySelector<HTMLInputElement>('.permission-matrix-value');
      const checkboxes = matrix.querySelectorAll<HTMLInputElement>('.perm-checkbox');
      const extraInput = matrix.querySelector<HTMLTextAreaElement>('.permission-matrix-extra');
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
        let raw = '';
        if (extraInput) {
          raw = extraInput.value || '';
        } else if (matrix.dataset.extraPermissions) {
          raw = matrix.dataset.extraPermissions || '';
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

      checkboxes.forEach((cb) => {
        cb.addEventListener('change', syncPermissions);
      });
      if (extraInput) {
        extraInput.addEventListener('input', syncPermissions);
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
