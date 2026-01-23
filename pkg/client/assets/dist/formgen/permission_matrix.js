/**
 * Permission Matrix Component
 * Syncs checkbox state to a hidden input for form submission.
 */
(function() {
  'use strict';

  function initPermissionMatrix() {
    document.querySelectorAll('.permission-matrix').forEach(function(matrix) {
      var hidden = matrix.querySelector('.permission-matrix-value');
      var checkboxes = matrix.querySelectorAll('.perm-checkbox');
      var extraInput = matrix.querySelector('.permission-matrix-extra');
      var checkboxMap = {};
      checkboxes.forEach(function(cb) {
        if (cb.dataset.permission) {
          checkboxMap[cb.dataset.permission] = cb;
        }
      });

      if (!hidden || checkboxes.length === 0) {
        return;
      }

      function parsePermissionList(raw) {
        return (raw || '')
          .split('\n')
          .map(function(item) { return item.trim(); })
          .filter(function(item) { return item.length > 0; });
      }

      function collectExtraPermissions() {
        var raw = '';
        if (extraInput) {
          raw = extraInput.value || '';
        } else if (matrix.dataset.extraPermissions) {
          raw = matrix.dataset.extraPermissions || '';
        }
        var extras = [];
        var seen = {};
        parsePermissionList(raw).forEach(function(perm) {
          if (checkboxMap[perm]) {
            checkboxMap[perm].checked = true;
            return;
          }
          if (!seen[perm]) {
            seen[perm] = true;
            extras.push(perm);
          }
        });
        return extras;
      }

      function syncPermissions() {
        var perms = [];
        var seen = {};

        collectExtraPermissions().forEach(function(perm) {
          if (!seen[perm]) {
            seen[perm] = true;
            perms.push(perm);
          }
        });

        checkboxes.forEach(function(cb) {
          if (cb.checked && cb.dataset.permission) {
            if (!seen[cb.dataset.permission]) {
              seen[cb.dataset.permission] = true;
              perms.push(cb.dataset.permission);
            }
          }
        });

        hidden.value = perms.join('\n');
      }

      checkboxes.forEach(function(cb) {
        cb.addEventListener('change', syncPermissions);
      });
      if (extraInput) {
        extraInput.addEventListener('input', syncPermissions);
      }

      syncPermissions();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPermissionMatrix);
  } else {
    initPermissionMatrix();
  }
})();
