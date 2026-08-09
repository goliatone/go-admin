(function initializeAdminSidebarState(global) {
  'use strict';

  if (!global || !global.document) return;

  if (global.GoAdminSidebarState) return;

  const storageKey = 'admin-sidebar-collapsed';
  const narrowMediaQuery = '(max-width: 1023px)';
  const collapsedAttribute = 'data-admin-sidebar-collapsed';
  const readyAttribute = 'data-admin-sidebar-ready';
  const root = global.document.documentElement;

  const isNarrow = () => {
    try {
      return typeof global.matchMedia === 'function' &&
        global.matchMedia(narrowMediaQuery).matches;
    } catch (_error) {
      return false;
    }
  };

  const readStorage = (key) => {
    try {
      return global.localStorage?.getItem(key) ?? null;
    } catch (_error) {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      if (!global.localStorage) return false;
      global.localStorage.setItem(key, String(value));
      return true;
    } catch (_error) {
      return false;
    }
  };

  const readStoredCollapsed = () => readStorage(storageKey) === 'true';

  const writeStoredCollapsed = (collapsed) =>
    writeStorage(storageKey, String(Boolean(collapsed)));

  const resolveCollapsed = () => !isNarrow() && readStoredCollapsed();

  const setRootCollapsed = (collapsed) => {
    root.setAttribute(collapsedAttribute, String(Boolean(collapsed)));
  };

  const setReady = (ready) => {
    root.setAttribute(readyAttribute, String(Boolean(ready)));
  };

  const applyInitialState = () => {
    setReady(false);
    setRootCollapsed(resolveCollapsed());
  };

  global.GoAdminSidebarState = Object.freeze({
    storageKey,
    narrowMediaQuery,
    collapsedAttribute,
    readyAttribute,
    isNarrow,
    readStorage,
    writeStorage,
    readStoredCollapsed,
    writeStoredCollapsed,
    resolveCollapsed,
    setRootCollapsed,
    setReady,
    applyInitialState,
  });

  applyInitialState();
})(window);
