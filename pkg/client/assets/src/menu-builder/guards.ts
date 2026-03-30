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
import { asRecord, coerceInteger, coerceString, coerceStringArray } from '../shared/coercion.js';

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
  const record = asRecord(raw);
  if (!raw || Array.isArray(raw) || record !== raw) {
    throw new Error(`${context} must be an object`);
  }
  return record;
}

function asBool(raw: unknown): boolean {
  return coerceString(raw).toLowerCase() === 'true';
}

function normalizeStatus(raw: unknown): 'draft' | 'published' {
  const status = coerceString(raw, 'draft').toLowerCase();
  if (allowedMenuStatuses.has(status)) {
    return status as 'draft' | 'published';
  }
  return 'draft';
}

function normalizeProfileMode(raw: unknown): MenuViewProfileMode {
  const mode = coerceString(raw, 'full').toLowerCase() as MenuViewProfileMode;
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
    const resolved = coerceString(value);
    if (resolved) {
      parsedEndpoints[key] = resolved;
    }
  });

  const parsedErrorCodes: Record<string, string> = {};
  Object.entries(errorCodesSource).forEach(([key, value]) => {
    const resolved = coerceString(value);
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
      const resolved = coerceString(value);
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
      value_enum: coerceStringArray(overrides.value_enum),
      write_endpoint: coerceString(overrides.write_endpoint),
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
              field_pattern: coerceString((invalidLocationRaw as Record<string, unknown>).field_pattern),
              rule: coerceString((invalidLocationRaw as Record<string, unknown>).rule),
              hint: coerceString((invalidLocationRaw as Record<string, unknown>).hint),
            }
          : undefined,
      invalid_value:
        invalidValueRaw && typeof invalidValueRaw === 'object' && !Array.isArray(invalidValueRaw)
          ? {
              allowed_values: coerceStringArray((invalidValueRaw as Record<string, unknown>).allowed_values),
            }
          : undefined,
    };
  }

  return out;
}

export function parseMenuRecord(raw: unknown): MenuRecord {
  const source = asObject(raw, 'menu record');
  const id = coerceString(source.id, coerceString(source.code));
  const code = coerceString(source.code, id);
  if (!id || !code) {
    throw new Error('menu record requires id and code');
  }
  return {
    id,
    code,
    name: coerceString(source.name, code),
    description: coerceString(source.description),
    status: normalizeStatus(source.status),
    locale: coerceString(source.locale),
    family_id: coerceString(source.family_id),
    archived: asBool(source.archived),
    created_at: coerceString(source.created_at),
    updated_at: coerceString(source.updated_at),
    published_at: coerceString(source.published_at),
    archived_at: coerceString(source.archived_at),
  };
}

export function parseMenuBindingRecord(raw: unknown): MenuBindingRecord {
  const source = asObject(raw, 'menu binding record');
  const location = coerceString(source.location);
  const menuCode = coerceString(source.menu_code);
  if (!location || !menuCode) {
    throw new Error('menu binding requires location and menu_code');
  }

  return {
    id: coerceString(source.id),
    location,
    menu_code: menuCode,
    view_profile_code: coerceString(source.view_profile_code),
    locale: coerceString(source.locale),
    priority: coerceInteger(source.priority, 0),
    status: normalizeStatus(source.status),
    created_at: coerceString(source.created_at),
    updated_at: coerceString(source.updated_at),
    published_at: coerceString(source.published_at),
  };
}

export function parseMenuViewProfileRecord(raw: unknown): MenuViewProfileRecord {
  const source = asObject(raw, 'menu view profile');
  const code = coerceString(source.code);
  if (!code) {
    throw new Error('menu view profile requires code');
  }

  return {
    code,
    name: coerceString(source.name, code),
    mode: normalizeProfileMode(source.mode),
    max_top_level: coerceInteger(source.max_top_level, 0) || undefined,
    max_depth: coerceInteger(source.max_depth, 0) || undefined,
    include_item_ids: coerceStringArray(source.include_item_ids),
    exclude_item_ids: coerceStringArray(source.exclude_item_ids),
    status: normalizeStatus(source.status),
    created_at: coerceString(source.created_at),
    updated_at: coerceString(source.updated_at),
    published_at: coerceString(source.published_at),
  };
}

export function parseMenuItemTarget(raw: unknown): MenuItemTarget | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const source = raw as Record<string, unknown>;
  const type = coerceString(source.type).toLowerCase();
  if (!allowedTargetTypes.has(type)) {
    return undefined;
  }
  return {
    type: type as MenuItemTarget['type'],
    id: coerceString(source.id),
    slug: coerceString(source.slug),
    content_type: coerceString(source.content_type),
    path: coerceString(source.path),
    route: coerceString(source.route),
    module: coerceString(source.module),
    url: coerceString(source.url),
  };
}

export function parseMenuItemNode(raw: unknown, context = 'menu item'): MenuItemNode {
  const source = asObject(raw, context);
  const id = coerceString(source.id);
  if (!id) {
    throw new Error(`${context} requires id`);
  }
  const childrenRaw = source.children ?? source.Items;
  const children = Array.isArray(childrenRaw)
    ? childrenRaw.map((child, index) => parseMenuItemNode(child, `${context}.children[${index}]`))
    : [];

  return {
    id,
    label: coerceString(source.label, id),
    type: coerceString(source.type),
    parent_id: coerceString(source.parent_id ?? source.parentID ?? source.ParentID),
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
      code: coerceString(menuSource.code ?? menuSource.Code),
      items,
    },
    simulation:
      source.simulation && typeof source.simulation === 'object' && !Array.isArray(source.simulation)
        ? {
            requested_id: coerceString((source.simulation as Record<string, unknown>).requested_id),
            location: coerceString((source.simulation as Record<string, unknown>).location),
            locale: coerceString((source.simulation as Record<string, unknown>).locale),
            view_profile: coerceString((source.simulation as Record<string, unknown>).view_profile),
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
    const value = coerceString(rawValue).toLowerCase() as NavigationOverrideValue;
    if (!allowedNavigationOverrideValues.has(value)) {
      throw new Error(`invalid navigation value for ${location}: ${String(rawValue)}`);
    }
    parsed[location] = value;
  });

  return parsed;
}
