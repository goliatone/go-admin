"use strict";
(function () {
  if (typeof window === "undefined") {
    return;
  }

  const target = window;
  const existing = target.GoAdminRelationshipActions;
  const handlers = {};

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

  function register(nextHandlers) {
    if (!nextHandlers || typeof nextHandlers !== "object") {
      return api;
    }
    if (isFunction(nextHandlers.onCreateAction)) {
      handlers.onCreateAction = nextHandlers.onCreateAction;
    }
    if (isFunction(nextHandlers.onEditAction)) {
      handlers.onEditAction = nextHandlers.onEditAction;
    }
    return api;
  }

  function unregister(actionName) {
    if (actionName === "onCreateAction" || actionName === "create") {
      delete handlers.onCreateAction;
    }
    if (actionName === "onEditAction" || actionName === "edit") {
      delete handlers.onEditAction;
    }
    if (!actionName) {
      delete handlers.onCreateAction;
      delete handlers.onEditAction;
    }
    return api;
  }

  function hasHandlers() {
    return isFunction(handlers.onCreateAction) || isFunction(handlers.onEditAction);
  }

  function buildInitConfig(routeContext) {
    const config = {};
    if (isFunction(handlers.onCreateAction)) {
      config.onCreateAction = function onCreateAction(context, detail) {
        return handlers.onCreateAction(
          enrichContext(context, detail, routeContext),
          enrichDetail(context, detail, routeContext)
        );
      };
    }
    if (isFunction(handlers.onEditAction)) {
      config.onEditAction = function onEditAction(context, detail) {
        return handlers.onEditAction(
          enrichContext(context, detail, routeContext),
          enrichDetail(context, detail, routeContext)
        );
      };
    }
    return Object.keys(config).length > 0 ? config : undefined;
  }

  const api = {
    register,
    unregister,
    hasHandlers,
    buildInitConfig,
  };

  target.GoAdminRelationshipActions = api;

  if (existing && existing !== api && typeof existing === "object") {
    if (isFunction(existing.onCreateAction) || isFunction(existing.onEditAction)) {
      register(existing);
    } else if (existing.handlers && typeof existing.handlers === "object") {
      register(existing.handlers);
    }
  }
})();
