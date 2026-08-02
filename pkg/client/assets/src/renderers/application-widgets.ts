export interface ApplicationWidgetRenderer<TWidget = unknown> {
  render(widget: TWidget): string;
  title?: string | ((widget: TWidget) => string);
}

interface ApplicationWidgetRendererRegistry {
  renderers: Map<string, ApplicationWidgetRenderer>;
}

const registryKey = Symbol.for('@goliatone/go-admin-client/application-widget-renderers');

function registry(): ApplicationWidgetRendererRegistry {
  const root = globalThis as typeof globalThis & {
    [registryKey]?: ApplicationWidgetRendererRegistry;
  };
  if (!root[registryKey]) {
    root[registryKey] = { renderers: new Map() };
  }
  return root[registryKey];
}

function normalizeDefinition(definition: string): string {
  const value = String(definition || '').trim();
  if (!value) throw new TypeError('widget definition is required');
  return value;
}

export function registerApplicationWidgetRenderer<TWidget = unknown>(
  definition: string,
  renderer: ApplicationWidgetRenderer<TWidget>,
): () => void {
  const key = normalizeDefinition(definition);
  if (!renderer || typeof renderer.render !== 'function') {
    throw new TypeError('widget renderer must provide a render function');
  }
  const value = renderer as ApplicationWidgetRenderer;
  registry().renderers.set(key, value);
  return () => {
    if (registry().renderers.get(key) === value) registry().renderers.delete(key);
  };
}

export function resolveApplicationWidgetRenderer<TWidget = unknown>(
  definition?: string,
): ApplicationWidgetRenderer<TWidget> | undefined {
  const key = String(definition || '').trim();
  if (!key) return undefined;
  return registry().renderers.get(key) as ApplicationWidgetRenderer<TWidget> | undefined;
}

export function unregisterApplicationWidgetRenderer(definition: string): boolean {
  const key = String(definition || '').trim();
  return key ? registry().renderers.delete(key) : false;
}

export function resolveApplicationWidgetTitle<TWidget = unknown>(
  definition: string | undefined,
  widget: TWidget,
): string | undefined {
  const title = resolveApplicationWidgetRenderer<TWidget>(definition)?.title;
  if (typeof title === 'function') return String(title(widget) || '').trim() || undefined;
  return String(title || '').trim() || undefined;
}
