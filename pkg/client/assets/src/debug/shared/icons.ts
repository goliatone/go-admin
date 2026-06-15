import { renderIcon, type IconRenderOptions } from '../../shared/icon-renderer.js';

export const DEBUG_ICON_REFS = {
  success: 'iconoir:check',
  error: 'iconoir:xmark',
  warning: 'iconoir:warning-triangle',
  info: 'iconoir:info-circle',
  unknown: 'iconoir:help-circle',
  hint: 'iconoir:light-bulb',
  nextAction: 'iconoir:list',
  terminal: 'iconoir:terminal',
  appConsole: 'iconoir:code',
  cache: 'iconoir:database',
  permissions: 'iconoir:shield-check',
  doctor: 'iconoir:heart',
  refresh: 'iconoir:refresh',
  clear: 'iconoir:erase',
  connect: 'iconoir:play',
  delete: 'iconoir:trash',
} as const;

export type DebugIconKind = keyof typeof DEBUG_ICON_REFS;

export type DebugIconRenderOptions = IconRenderOptions & {
  decorative?: boolean;
};

export function getDebugIconRef(kind: DebugIconKind): string {
  return DEBUG_ICON_REFS[kind];
}

export function renderDebugIcon(kind: DebugIconKind, options: DebugIconRenderOptions = {}): string {
  return renderDebugIconRef(getDebugIconRef(kind), options);
}

export function renderDebugIconRef(ref: string | undefined, options: DebugIconRenderOptions = {}): string {
  if (!ref) {
    return '';
  }
  const decorative = options.decorative ?? true;
  const { decorative: _decorative, ...renderOptions } = options;
  const icon = renderIcon(ref, renderOptions);
  if (!icon) {
    return '';
  }
  return decorative ? `<span class="debug-icon" aria-hidden="true">${icon}</span>` : icon;
}
