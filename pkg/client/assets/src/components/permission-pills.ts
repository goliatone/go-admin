type ActionConfig = {
  initial: string;
  bg: string;
  text: string;
  border: string;
};

type PermissionPillsOptions = {
  maxVisible?: number;
};

export const actionConfig: Record<string, ActionConfig> = {
  view: { initial: 'V', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  create: { initial: 'C', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  edit: { initial: 'E', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  delete: { initial: 'D', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

const parsePermissions = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return String(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const groupByResource = (perms: string[]) => {
  const grouped: Record<string, string[]> = {};
  perms.forEach((perm) => {
    const parts = perm.split('.');
    const action = parts.pop() || '';
    const resource = parts.join('.');
    if (!grouped[resource]) {
      grouped[resource] = [];
    }
    grouped[resource].push(action);
  });
  return grouped;
};

const buildActionBadges = (actions: string[]) =>
  actions
    .map((action) => {
      const config = actionConfig[action] || {
        initial: action[0]?.toUpperCase() || '?',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        border: 'border-gray-200',
      };
      return `<span class="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-semibold ${config.bg} ${config.text}" title="${action}">${config.initial}</span>`;
    })
    .join('');

const buildPill = (resource: string, actions: string[]) => {
  const resourceName = resource.split('.').pop();
  const actionBadges = buildActionBadges(actions);
  return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs">
    <span class="flex gap-0.5">${actionBadges}</span>
    <span class="text-gray-600 font-medium">${resourceName || resource}</span>
  </span>`;
};

const generateId = () => `perm-${Math.random().toString(36).slice(2, 11)}`;

export function togglePermissions(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const collapsed = container.querySelector<HTMLElement>('.permission-pills-collapsed');
  const expanded = container.querySelector<HTMLElement>('.permission-pills-expanded');
  if (collapsed && expanded) {
    collapsed.classList.toggle('hidden');
    expanded.classList.toggle('hidden');
    expanded.classList.toggle('flex');
  }
}

declare global {
  interface Window {
    togglePermissions?: (containerId: string) => void;
  }
}

if (typeof window !== 'undefined') {
  window.togglePermissions = togglePermissions;
}

export function permissionPillsRenderer(value: unknown, options: PermissionPillsOptions = {}) {
  const maxVisible = options.maxVisible ?? 4;
  const perms = parsePermissions(value);
  if (perms.length === 0) {
    return '<span class="text-gray-400 text-sm">No permissions</span>';
  }
  const grouped = groupByResource(perms);
  const resources = Object.keys(grouped);
  const visiblePills = resources.slice(0, maxVisible).map((resource) => buildPill(resource, grouped[resource]));
  const hiddenCount = resources.length - maxVisible;
  const containerId = generateId();

  let html = `<div class="permission-pills-container" id="${containerId}">`;
  html += `<div class="flex flex-wrap gap-1 items-center permission-pills-collapsed">`;
  html += visiblePills.join('');
  if (hiddenCount > 0) {
    html += `<button type="button" class="permission-expand-btn inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs text-gray-600 font-medium transition-colors" onclick="togglePermissions('${containerId}')">+${hiddenCount} more</button>`;
  }
  html += '</div>';
  if (hiddenCount > 0) {
    const allPills = resources.map((resource) => buildPill(resource, grouped[resource]));
    html += `<div class="hidden flex-wrap gap-1 items-center permission-pills-expanded">`;
    html += allPills.join('');
    html += `<button type="button" class="permission-collapse-btn inline-flex items-center px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-200 text-xs text-gray-600 font-medium transition-colors" onclick="togglePermissions('${containerId}')">Show less</button>`;
    html += '</div>';
  }
  html += '</div>';
  return html;
}

export function permissionPills(options: PermissionPillsOptions = {}) {
  return (value: unknown) => permissionPillsRenderer(value, options);
}

export default permissionPillsRenderer;
