"use strict";
(function () {
  if (typeof window === "undefined") {
    return;
  }

  const target = window;
  const existing = target.GoAdminRelationshipActions;
  const globalHandlers = {};
  const actionHandlers = {};
  const UNHANDLED = typeof Symbol === "function"
    ? Symbol("GoAdminRelationshipActions.unhandled")
    : "__GO_ADMIN_RELATIONSHIP_ACTION_UNHANDLED__";
  const fallbackEvents = {
    onCreateAction: "formgen:relationship:create-action",
    onEditAction: "formgen:relationship:edit-action",
  };

  function isFunction(value) {
    return typeof value === "function";
  }

  function normalizeString(value) {
    return value == null ? "" : String(value);
  }

  function searchParamsObject(url) {
    const result = {};
    if (!url || !url.searchParams) {
      return result;
    }
    url.searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  function currentURL() {
    try {
      return new URL(target.location && target.location.href ? target.location.href : "");
    } catch (_err) {
      return null;
    }
  }

  function findFormContainer(element) {
    if (!element || !isFunction(element.closest)) {
      return null;
    }
    return element.closest("[data-record-id], [data-panel-name]");
  }

  function fieldNameFromContext(context) {
    const field = context && context.field ? context.field : {};
    const element = context && context.element ? context.element : null;
    return normalizeString(
      field.name ||
        field.id ||
        (element && element.name) ||
        (element && isFunction(element.getAttribute) && element.getAttribute("name")) ||
        ""
    );
  }

  function routeContextFrom(context, detail, routeContext) {
    const url = currentURL();
    const element = context && context.element ? context.element : null;
    const container = findFormContainer(element);
    const endpoint = context && context.endpoint ? context.endpoint : {};
    const request = context && context.request ? context.request : {};
    const endpointURL = normalizeString(endpoint.url || request.url || "");
    const params = searchParamsObject(url);
    const supplied = routeContext && typeof routeContext === "object" ? routeContext : {};
    const fieldName = fieldNameFromContext(context);
    const panel =
      supplied.panel ||
      supplied.panelName ||
      (container && container.dataset ? container.dataset.panelName : "") ||
      "";
    const recordId =
      supplied.recordId ||
      (container && container.dataset ? container.dataset.recordId : "") ||
      "";

    return {
      actionId: normalizeString((detail && detail.actionId) || ""),
      fieldName,
      panel: normalizeString(panel),
      panelName: normalizeString(panel),
      contentType: normalizeString(supplied.contentType || panel),
      recordId: normalizeString(recordId),
      locale: normalizeString(supplied.locale || params.locale || ""),
      channel: normalizeString(supplied.channel || params.channel || ""),
      basePath: normalizeString(supplied.basePath || ""),
      endpointURL,
      endpointUrl: endpointURL,
      url: url ? url.toString() : "",
      pathname: url ? url.pathname : "",
      search: url ? url.search : "",
      searchParams: params,
    };
  }

  function enrichContext(context, detail, routeContext) {
    const route = routeContextFrom(context, detail, routeContext);
    return Object.assign({}, context || {}, route, {
      goAdmin: route,
    });
  }

  function enrichDetail(context, detail, routeContext) {
    const route = routeContextFrom(context, detail, routeContext);
    return Object.assign({}, detail || {}, route, {
      goAdmin: route,
    });
  }

  function handlerFor(actionName, detail) {
    const actionId = normalizeString(detail && detail.actionId).trim();
    const scoped = actionId ? actionHandlers[actionId] : null;
    if (scoped && isFunction(scoped[actionName])) {
      return scoped[actionName];
    }
    if (isFunction(globalHandlers[actionName])) {
      return globalHandlers[actionName];
    }
    return null;
  }

  function hasHandlerObject(value) {
    return Boolean(
      value &&
        typeof value === "object" &&
        (isFunction(value.onCreateAction) || isFunction(value.onEditAction))
    );
  }

  function hasAnyActionHandlers() {
    return Object.keys(actionHandlers).some((actionId) => hasHandlerObject(actionHandlers[actionId]));
  }

  function fallbackPayload(context, detail, routeContext) {
    return Object.assign({}, context || {}, detail || {}, enrichDetail(context, detail, routeContext));
  }

  function dispatchFallback(actionName, context, detail, routeContext) {
    const element = context && context.element;
    const eventName = fallbackEvents[actionName];
    const CustomEventCtor =
      target.CustomEvent || (typeof CustomEvent !== "undefined" ? CustomEvent : null);
    if (!element || !eventName || !isFunction(element.dispatchEvent) || !CustomEventCtor) {
      return undefined;
    }
    try {
      element.dispatchEvent(
        new CustomEventCtor(eventName, {
          bubbles: true,
          detail: fallbackPayload(context, detail, routeContext),
        })
      );
    } catch (_err) {
      // Match go-formgen fallback behavior: event dispatch failures are non-fatal.
    }
    return undefined;
  }

  async function invokeAction(actionName, context, detail, routeContext) {
    const handler = handlerFor(actionName, detail);
    if (!handler) {
      return dispatchFallback(actionName, context, detail, routeContext);
    }

    const result = await handler(
      enrichContext(context, detail, routeContext),
      enrichDetail(context, detail, routeContext)
    );
    if (result === UNHANDLED) {
      return dispatchFallback(actionName, context, detail, routeContext);
    }
    return result;
  }

  function registerAction(actionId, nextHandlers) {
    const key = normalizeString(actionId).trim();
    if (!key || !nextHandlers || typeof nextHandlers !== "object") {
      return api;
    }
    const scoped = actionHandlers[key] || {};
    if (isFunction(nextHandlers.onCreateAction)) {
      scoped.onCreateAction = nextHandlers.onCreateAction;
    }
    if (isFunction(nextHandlers.onEditAction)) {
      scoped.onEditAction = nextHandlers.onEditAction;
    }
    actionHandlers[key] = scoped;
    return api;
  }

  function registerActions(actions) {
    if (!actions || typeof actions !== "object") {
      return api;
    }
    Object.keys(actions).forEach((actionId) => {
      registerAction(actionId, actions[actionId]);
    });
    return api;
  }

  function register(nextHandlers) {
    if (!nextHandlers || typeof nextHandlers !== "object") {
      return api;
    }
    if (nextHandlers.actions && typeof nextHandlers.actions === "object") {
      registerActions(nextHandlers.actions);
    }
    if (nextHandlers.actionId || nextHandlers.actionID) {
      registerAction(nextHandlers.actionId || nextHandlers.actionID, nextHandlers);
      return api;
    }
    if (isFunction(nextHandlers.onCreateAction)) {
      globalHandlers.onCreateAction = nextHandlers.onCreateAction;
    }
    if (isFunction(nextHandlers.onEditAction)) {
      globalHandlers.onEditAction = nextHandlers.onEditAction;
    }
    return api;
  }

  function unregister(actionName) {
    if (actionName === "onCreateAction" || actionName === "create") {
      delete globalHandlers.onCreateAction;
    }
    if (actionName === "onEditAction" || actionName === "edit") {
      delete globalHandlers.onEditAction;
    }
    if (!actionName) {
      delete globalHandlers.onCreateAction;
      delete globalHandlers.onEditAction;
      Object.keys(actionHandlers).forEach((actionId) => {
        delete actionHandlers[actionId];
      });
    }
    return api;
  }

  function unregisterAction(actionId, actionName) {
    const key = normalizeString(actionId).trim();
    const scoped = key ? actionHandlers[key] : null;
    if (!scoped) {
      return api;
    }
    if (actionName === "onCreateAction" || actionName === "create") {
      delete scoped.onCreateAction;
    } else if (actionName === "onEditAction" || actionName === "edit") {
      delete scoped.onEditAction;
    } else {
      delete actionHandlers[key];
      return api;
    }
    if (!hasHandlerObject(scoped)) {
      delete actionHandlers[key];
    }
    return api;
  }

  function hasHandlers() {
    return hasHandlerObject(globalHandlers) || hasAnyActionHandlers();
  }

  function buildInitConfig(routeContext) {
    return {
      onCreateAction(context, detail) {
        return invokeAction("onCreateAction", context, detail, routeContext);
      },
      onEditAction(context, detail) {
        return invokeAction("onEditAction", context, detail, routeContext);
      },
    };
  }

  const api = {
    unhandled: UNHANDLED,
    register,
    registerAction,
    registerActions,
    unregister,
    unregisterAction,
    hasHandlers,
    buildInitConfig,
  };

  target.GoAdminRelationshipActions = api;

  if (existing && existing !== api && typeof existing === "object") {
    if (existing.actions && typeof existing.actions === "object") {
      registerActions(existing.actions);
    }
    if (isFunction(existing.onCreateAction) || isFunction(existing.onEditAction) || existing.actionId || existing.actionID) {
      register(existing);
    }
    if (existing.handlers && typeof existing.handlers === "object") {
      register(existing.handlers);
    }
  }
})();
