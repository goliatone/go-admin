import type {
  ContentNavigationContracts,
  MenuBindingRecord,
  MenuBuilderContracts,
  MenuItemNode,
  MenuItemTarget,
  MenuPreviewResult,
  MenuRecord,
  MenuViewProfileMode,
  MenuViewProfileRecord,
  NavigationOverrideValue,
} from './types.js';

const allowedNavigationOverrideValues = new Set<NavigationOverrideValue>(['inherit', 'show', 'hide']);
const allowedMenuStatuses = new Set(['draft', 'published']);
const allowedTargetTypes = new Set(['content', 'route', 'module', 'external']);
const allowedProfileModes = new Set<MenuViewProfileMode>([
  'full',
  'top_level_limit',
  'max_depth',
  'include_ids',
  'exclude_ids',
  'composed',
]);

function asObject(raw: unknown, context: string): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${context} must be an object`);
  }
  return raw as Record<string, unknown>;
}

function asString(raw: unknown, field: string, fallback = ''): string {
  if (typeof raw === 'string') {
    return raw.trim();
  }
  if (raw == null) {
    return fallback;
  }
  return String(raw).trim();
}

function asBool(raw: unknown): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'string') {
    return raw.trim().toLowerCase() === 'true';
  }
  return false;
}

function asNumber(raw: unknown, fallback = 0): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(item => asString(item, 'value'))
    .filter(item => item.length > 0);
}

function normalizeStatus(raw: unknown): 'draft' | 'published' {
  const status = asString(raw, 'status', 'draft').toLowerCase();
  if (allowedMenuStatuses.has(status)) {
    return status as 'draft' | 'published';
  }
  return 'draft';
}

function normalizeProfileMode(raw: unknown): MenuViewProfileMode {
  const mode = asString(raw, 'mode', 'full').toLowerCase() as MenuViewProfileMode;
  if (allowedProfileModes.has(mode)) {
    return mode;
  }
  return 'full';
}

export function parseMenuContracts(raw: unknown): MenuBuilderContracts {
  const source = asObject(raw, 'menu contracts');
  const endpoints = asObject(source.endpoints, 'menu contracts endpoints');
  const errorCodesRaw = source.error_codes ?? source.errorCode ?? {};
  const errorCodesSource = asObject(errorCodesRaw, 'menu contracts error codes');

  const parsedEndpoints: Record<string, string> = {};
  Object.entries(endpoints).forEach(([key, value]) => {
    const resolved = asString(value, `endpoints.${key}`);
    if (resolved) {
      parsedEndpoints[key] = resolved;
    }
  });

  const parsedErrorCodes: Record<string, string> = {};
  Object.entries(errorCodesSource).forEach(([key, value]) => {
    const resolved = asString(value, `error_codes.${key}`);
    if (resolved) {
      parsedErrorCodes[key] = resolved;
    }
  });

  const contentNavigation = parseContentNavigationContracts(source.content_navigation);

  return {
    endpoints: parsedEndpoints,
    error_codes: parsedErrorCodes,
    content_navigation: contentNavigation,
  };
}

export function parseContentNavigationContracts(raw: unknown): ContentNavigationContracts | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const source = raw as Record<string, unknown>;
  const endpointsRaw = source.endpoints;
  const overridesRaw = source.entry_navigation_overrides;
  const validationRaw = source.validation;

  const endpoints: Record<string, string> = {};
  if (endpointsRaw && typeof endpointsRaw === 'object' && !Array.isArray(endpointsRaw)) {
    Object.entries(endpointsRaw as Record<string, unknown>).forEach(([key, value]) => {
      const resolved = asString(value, `content_navigation.endpoints.${key}`);
      if (resolved) {
        endpoints[key] = resolved;
      }
    });
  }

  const out: ContentNavigationContracts = {};
  if (Object.keys(endpoints).length > 0) {
    out.endpoints = endpoints;
  }

  if (overridesRaw && typeof overridesRaw === 'object' && !Array.isArray(overridesRaw)) {
    const overrides = overridesRaw as Record<string, unknown>;
    out.entry_navigation_overrides = {
      value_enum: asStringArray(overrides.value_enum),
      write_endpoint: asString(overrides.write_endpoint, 'content_navigation.entry_navigation_overrides.write_endpoint'),
    };
  }

  if (validationRaw && typeof validationRaw === 'object' && !Array.isArray(validationRaw)) {
    const validation = validationRaw as Record<string, unknown>;
    const invalidLocationRaw = validation.invalid_location;
    const invalidValueRaw = validation.invalid_value;
    out.validation = {
      invalid_location:
        invalidLocationRaw && typeof invalidLocationRaw === 'object' && !Array.isArray(invalidLocationRaw)
          ? {
              field_pattern: asString((invalidLocationRaw as Record<string, unknown>).field_pattern, 'invalid_location.field_pattern'),
              rule: asString((invalidLocationRaw as Record<string, unknown>).rule, 'invalid_location.rule'),
              hint: asString((invalidLocationRaw as Record<string, unknown>).hint, 'invalid_location.hint'),
            }
          : undefined,
      invalid_value:
        invalidValueRaw && typeof invalidValueRaw === 'object' && !Array.isArray(invalidValueRaw)
          ? {
              allowed_values: asStringArray((invalidValueRaw as Record<string, unknown>).allowed_values),
            }
          : undefined,
    };
  }

  return out;
}

export function parseMenuRecord(raw: unknown): MenuRecord {
  const source = asObject(raw, 'menu record');
  const id = asString(source.id, 'menu.id', asString(source.code, 'menu.code'));
  const code = asString(source.code, 'menu.code', id);
  if (!id || !code) {
    throw new Error('menu record requires id and code');
  }
  return {
    id,
    code,
    name: asString(source.name, 'menu.name', code),
    description: asString(source.description, 'menu.description'),
    status: normalizeStatus(source.status),
    locale: asString(source.locale, 'menu.locale'),
    translation_group_id: asString(source.translation_group_id, 'menu.translation_group_id'),
    archived: asBool(source.archived),
    created_at: asString(source.created_at, 'menu.created_at'),
    updated_at: asString(source.updated_at, 'menu.updated_at'),
    published_at: asString(source.published_at, 'menu.published_at'),
    archived_at: asString(source.archived_at, 'menu.archived_at'),
  };
}

export function parseMenuBindingRecord(raw: unknown): MenuBindingRecord {
  const source = asObject(raw, 'menu binding record');
  const location = asString(source.location, 'binding.location');
  const menuCode = asString(source.menu_code, 'binding.menu_code');
  if (!location || !menuCode) {
    throw new Error('menu binding requires location and menu_code');
  }

  return {
    id: asString(source.id, 'binding.id'),
    location,
    menu_code: menuCode,
    view_profile_code: asString(source.view_profile_code, 'binding.view_profile_code'),
    locale: asString(source.locale, 'binding.locale'),
    priority: asNumber(source.priority, 0),
    status: normalizeStatus(source.status),
    created_at: asString(source.created_at, 'binding.created_at'),
    updated_at: asString(source.updated_at, 'binding.updated_at'),
    published_at: asString(source.published_at, 'binding.published_at'),
  };
}

export function parseMenuViewProfileRecord(raw: unknown): MenuViewProfileRecord {
  const source = asObject(raw, 'menu view profile');
  const code = asString(source.code, 'profile.code');
  if (!code) {
    throw new Error('menu view profile requires code');
  }

  return {
    code,
    name: asString(source.name, 'profile.name', code),
    mode: normalizeProfileMode(source.mode),
    max_top_level: asNumber(source.max_top_level, 0) || undefined,
    max_depth: asNumber(source.max_depth, 0) || undefined,
    include_item_ids: asStringArray(source.include_item_ids),
    exclude_item_ids: asStringArray(source.exclude_item_ids),
    status: normalizeStatus(source.status),
    created_at: asString(source.created_at, 'profile.created_at'),
    updated_at: asString(source.updated_at, 'profile.updated_at'),
    published_at: asString(source.published_at, 'profile.published_at'),
  };
}

export function parseMenuItemTarget(raw: unknown): MenuItemTarget | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const source = raw as Record<string, unknown>;
  const type = asString(source.type, 'menu item target.type').toLowerCase();
  if (!allowedTargetTypes.has(type)) {
    return undefined;
  }
  return {
    type: type as MenuItemTarget['type'],
    id: asString(source.id, 'target.id'),
    slug: asString(source.slug, 'target.slug'),
    content_type: asString(source.content_type, 'target.content_type'),
    path: asString(source.path, 'target.path'),
    route: asString(source.route, 'target.route'),
    module: asString(source.module, 'target.module'),
    url: asString(source.url, 'target.url'),
  };
}

export function parseMenuItemNode(raw: unknown, context = 'menu item'): MenuItemNode {
  const source = asObject(raw, context);
  const id = asString(source.id, `${context}.id`);
  if (!id) {
    throw new Error(`${context} requires id`);
  }
  const childrenRaw = source.children ?? source.Items;
  const children = Array.isArray(childrenRaw)
    ? childrenRaw.map((child, index) => parseMenuItemNode(child, `${context}.children[${index}]`))
    : [];

  return {
    id,
    label: asString(source.label, `${context}.label`, id),
    type: asString(source.type, `${context}.type`),
    parent_id: asString(source.parent_id ?? source.parentID ?? source.ParentID, `${context}.parent_id`),
    target: parseMenuItemTarget(source.target ?? source.Target),
    children,
  };
}

export function parseMenuPreviewResult(raw: unknown): MenuPreviewResult {
  const source = asObject(raw, 'menu preview response');
  const menuSource = asObject(source.menu ?? source.data, 'menu preview menu');
  const itemsRaw = menuSource.items ?? menuSource.Items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((item, index) => parseMenuItemNode(item, `preview.menu.items[${index}]`))
    : [];

  return {
    menu: {
      code: asString(menuSource.code ?? menuSource.Code, 'preview.menu.code'),
      items,
    },
    simulation:
      source.simulation && typeof source.simulation === 'object' && !Array.isArray(source.simulation)
        ? {
            requested_id: asString((source.simulation as Record<string, unknown>).requested_id, 'preview.simulation.requested_id'),
            location: asString((source.simulation as Record<string, unknown>).location, 'preview.simulation.location'),
            locale: asString((source.simulation as Record<string, unknown>).locale, 'preview.simulation.locale'),
            view_profile: asString((source.simulation as Record<string, unknown>).view_profile, 'preview.simulation.view_profile'),
            include_drafts: asBool((source.simulation as Record<string, unknown>).include_drafts),
            preview_token_present: asBool((source.simulation as Record<string, unknown>).preview_token_present),
            binding:
              (source.simulation as Record<string, unknown>).binding && typeof (source.simulation as Record<string, unknown>).binding === 'object'
                ? parseMenuBindingRecord((source.simulation as Record<string, unknown>).binding)
                : undefined,
            profile:
              (source.simulation as Record<string, unknown>).profile && typeof (source.simulation as Record<string, unknown>).profile === 'object'
                ? parseMenuViewProfileRecord((source.simulation as Record<string, unknown>).profile)
                : undefined,
          }
        : undefined,
  };
}

export function parseNavigationOverrides(
  raw: unknown,
  allowedLocations: string[] = []
): Record<string, NavigationOverrideValue> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const source = raw as Record<string, unknown>;
  const allowedSet = new Set(allowedLocations.map(location => location.trim()).filter(Boolean));
  const parsed: Record<string, NavigationOverrideValue> = {};

  Object.entries(source).forEach(([rawLocation, rawValue]) => {
    const location = rawLocation.trim();
    if (!location) {
      return;
    }
    if (allowedSet.size > 0 && !allowedSet.has(location)) {
      throw new Error(`invalid navigation location: ${location}`);
    }
    const value = asString(rawValue, `_navigation.${location}`).toLowerCase() as NavigationOverrideValue;
    if (!allowedNavigationOverrideValues.has(value)) {
      throw new Error(`invalid navigation value for ${location}: ${String(rawValue)}`);
    }
    parsed[location] = value;
  });

  return parsed;
}
