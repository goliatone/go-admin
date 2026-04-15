package admin

import (
	"context"
	"errors"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"time"

	usersactivity "github.com/goliatone/go-users/activity"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

const (
	ActivityActorTypeUser = "user"
)

const (
	ActivityObjectTypeUser             = "user"
	ActivityObjectTypeRole             = "role"
	ActivityObjectTypeTenant           = "tenant"
	ActivityObjectTypeOrganization     = "organization"
	ActivityObjectTypeSettings         = "settings"
	ActivityObjectTypeDashboard        = "dashboard"
	ActivityObjectTypePanel            = "panel"
	ActivityObjectTypeNotification     = "notification"
	ActivityObjectTypePreferences      = "preferences"
	ActivityObjectTypeProfile          = "profile"
	ActivityObjectTypeJob              = "job"
	ActivityObjectTypeWidgetArea       = "widget_area"
	ActivityObjectTypeWidgetDefinition = "widget_def"
	ActivityObjectTypeWidgetInstance   = "widget_instance"
	ActivityObjectTypeMenu             = "menu"
	ActivityObjectTypeMenuItem         = "menu_item"
	ActivityObjectTypePage             = "page"
	ActivityObjectTypeContent          = "content"
	ActivityObjectTypeBlockDefinition  = "block_def"
	ActivityObjectTypeBlock            = "block"
)

// AdminActorResolver enriches actor details using admin user sources.
type AdminActorResolver struct {
	Users    UserRepository `json:"users"`
	Profiles ProfileStore   `json:"profiles"`
}

// ResolveActors resolves actor details in batch.
func (r AdminActorResolver) ResolveActors(ctx context.Context, ids []uuid.UUID, _ usersactivity.ResolveContext) (map[uuid.UUID]usersactivity.ActorInfo, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	out := make(map[uuid.UUID]usersactivity.ActorInfo, len(ids))
	for _, id := range ids {
		if id == uuid.Nil {
			continue
		}
		info, ok, err := r.resolveActor(ctx, id)
		if err != nil {
			return out, err
		}
		if ok {
			out[id] = info
		}
	}
	if len(out) == 0 {
		return nil, nil
	}
	return out, nil
}

func (r AdminActorResolver) resolveActor(ctx context.Context, id uuid.UUID) (usersactivity.ActorInfo, bool, error) {
	userID := id.String()
	display := ""
	email := ""
	if r.Users != nil {
		user, err := r.Users.Get(ctx, userID)
		if err != nil {
			if errors.Is(err, ErrNotFound) {
				return usersactivity.ActorInfo{}, false, nil
			}
			return usersactivity.ActorInfo{}, false, err
		}
		display = formatUserDisplay(user)
		email = strings.TrimSpace(user.Email)
	}
	if r.Profiles != nil && (display == "" || email == "") {
		profile, err := r.Profiles.Get(ctx, userID)
		if err == nil {
			if display == "" {
				display = strings.TrimSpace(profile.DisplayName)
			}
			if email == "" {
				email = strings.TrimSpace(profile.Email)
			}
		}
	}
	if display == "" {
		display = userID
	}
	return usersactivity.ActorInfo{
		ID:      id,
		Type:    ActivityActorTypeUser,
		Display: display,
		Email:   email,
	}, true, nil
}

// ObjectResolverFunc adapts a function into an ObjectResolver.
type ObjectResolverFunc func(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error)

// ResolveObjects satisfies usersactivity.ObjectResolver.
func (f ObjectResolverFunc) ResolveObjects(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
	return f(ctx, objectType, ids, meta)
}

// ObjectResolverMap dispatches object resolution by object type.
type ObjectResolverMap struct {
	Resolvers map[string]usersactivity.ObjectResolver `json:"resolvers"`
	Fallback  usersactivity.ObjectResolver            `json:"fallback"`
}

// ResolveObjects resolves objects by type, falling back when needed.
func (m ObjectResolverMap) ResolveObjects(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
	objectType = strings.TrimSpace(objectType)
	if objectType != "" && m.Resolvers != nil {
		if resolver, ok := m.Resolvers[objectType]; ok && resolver != nil {
			return resolver.ResolveObjects(ctx, objectType, ids, meta)
		}
	}
	if m.Fallback != nil {
		return m.Fallback.ResolveObjects(ctx, objectType, ids, meta)
	}
	return nil, nil
}

// AdminObjectResolverConfig wires admin object resolvers.
type AdminObjectResolverConfig struct {
	Users         UserRepository               `json:"users"`
	Roles         RoleRepository               `json:"roles"`
	Tenants       TenantRepository             `json:"tenants"`
	Organizations OrganizationRepository       `json:"organizations"`
	Profiles      ProfileStore                 `json:"profiles"`
	Settings      *SettingsService             `json:"settings"`
	Jobs          *JobRegistry                 `json:"jobs"`
	Widgets       CMSWidgetService             `json:"widgets"`
	Menus         CMSMenuService               `json:"menus"`
	Content       CMSContentService            `json:"content"`
	Fallback      usersactivity.ObjectResolver `json:"fallback"`
}

// NewAdminObjectResolver returns an object resolver map for admin object types.
func NewAdminObjectResolver(cfg AdminObjectResolverConfig) usersactivity.ObjectResolver {
	fallback := cfg.Fallback
	if fallback == nil {
		fallback = fallbackObjectResolver()
	}
	return ObjectResolverMap{
		Resolvers: map[string]usersactivity.ObjectResolver{
			ActivityObjectTypeUser:             newUserObjectResolver(cfg.Users, cfg.Profiles),
			ActivityObjectTypeRole:             newRoleObjectResolver(cfg.Roles),
			ActivityObjectTypeTenant:           newTenantObjectResolver(cfg.Tenants),
			ActivityObjectTypeOrganization:     newOrganizationObjectResolver(cfg.Organizations),
			ActivityObjectTypeSettings:         newStaticObjectResolver(ActivityObjectTypeSettings, "Settings"),
			ActivityObjectTypeDashboard:        newStaticObjectResolver(ActivityObjectTypeDashboard, "Dashboard"),
			ActivityObjectTypePanel:            newPanelObjectResolver(),
			ActivityObjectTypeNotification:     newNotificationObjectResolver(),
			ActivityObjectTypePreferences:      newPreferencesObjectResolver(cfg.Users, cfg.Profiles),
			ActivityObjectTypeProfile:          newProfileObjectResolver(cfg.Users, cfg.Profiles),
			ActivityObjectTypeJob:              newJobObjectResolver(cfg.Jobs),
			ActivityObjectTypeWidgetArea:       newWidgetAreaObjectResolver(cfg.Widgets),
			ActivityObjectTypeWidgetDefinition: newWidgetDefinitionObjectResolver(cfg.Widgets),
			ActivityObjectTypeWidgetInstance:   newWidgetInstanceObjectResolver(),
			ActivityObjectTypeMenu:             newMenuObjectResolver(cfg.Menus),
			ActivityObjectTypeMenuItem:         newMenuItemObjectResolver(),
			ActivityObjectTypePage:             newPageObjectResolver(cfg.Content),
			ActivityObjectTypeContent:          newContentObjectResolver(cfg.Content),
			ActivityObjectTypeBlockDefinition:  newBlockDefinitionObjectResolver(cfg.Content),
			ActivityObjectTypeBlock:            newBlockObjectResolver(),
		},
		Fallback: fallback,
	}
}

// AdminActivityEnricherConfig wires the actor/object resolvers for activity enrichment.
type AdminActivityEnricherConfig struct {
	ActorResolver   usersactivity.ActorResolver  `json:"actor_resolver"`
	ObjectResolver  usersactivity.ObjectResolver `json:"object_resolver"`
	EnricherVersion string                       `json:"enricher_version"`
	Now             func() time.Time             `json:"now"`
}

// NewAdminActivityEnricher builds an activity enricher that adds missing metadata keys.
func NewAdminActivityEnricher(cfg AdminActivityEnricherConfig) usersactivity.ActivityEnricher {
	return adminActivityEnricher{
		actorResolver:  cfg.ActorResolver,
		objectResolver: cfg.ObjectResolver,
		version:        strings.TrimSpace(cfg.EnricherVersion),
		now:            cfg.Now,
	}
}

func newUserObjectResolver(users UserRepository, profiles ProfileStore) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaDisplay := metadataDisplay(ids, meta)
		label := objectTypeLabel(objectType)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if users == nil {
				display := formatObjectDisplay(label, "", id)
				if profiles != nil {
					if profile, err := profiles.Get(ctx, id); err == nil {
						display = formatObjectDisplay(label, strings.TrimSpace(profile.DisplayName), id)
					}
				}
				return objectInfo(objectType, id, display), true, nil
			}
			user, err := users.Get(ctx, id)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					display := metaDisplay
					if profiles != nil && display == "" {
						if profile, profileErr := profiles.Get(ctx, id); profileErr == nil {
							display = formatObjectDisplay(label, strings.TrimSpace(profile.DisplayName), id)
						}
					}
					return tombstoneObjectInfo(objectType, id, display), true, nil
				}
				return usersactivity.ObjectInfo{}, false, err
			}
			userDisplay := formatUserDisplay(user)
			if profiles != nil && userDisplay == "" {
				if profile, err := profiles.Get(ctx, id); err == nil {
					userDisplay = strings.TrimSpace(profile.DisplayName)
				}
			}
			display := formatObjectDisplay(label, userDisplay, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newRoleObjectResolver(roles RoleRepository) usersactivity.ObjectResolver {
	return newLookupObjectResolver(
		roles != nil,
		func(ctx context.Context, id string) (RoleRecord, error) {
			return roles.Get(ctx, id)
		},
		formatRoleDisplay,
	)
}

func newTenantObjectResolver(tenants TenantRepository) usersactivity.ObjectResolver {
	return newLookupObjectResolver(
		tenants != nil,
		func(ctx context.Context, id string) (TenantRecord, error) {
			return tenants.Get(ctx, id)
		},
		formatTenantDisplay,
	)
}

func newOrganizationObjectResolver(orgs OrganizationRepository) usersactivity.ObjectResolver {
	return newLookupObjectResolver(
		orgs != nil,
		func(ctx context.Context, id string) (OrganizationRecord, error) {
			return orgs.Get(ctx, id)
		},
		formatOrganizationDisplay,
	)
}

func newLookupObjectResolver[T any](
	available bool,
	get func(context.Context, string) (T, error),
	displayValue func(T) string,
) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaDisplay := metadataDisplay(ids, meta)
		label := objectTypeLabel(objectType)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if !available {
				return objectInfo(objectType, id, formatObjectDisplay(label, "", id)), true, nil
			}
			item, err := get(ctx, id)
			if err != nil {
				if errors.Is(err, ErrNotFound) {
					return tombstoneObjectInfo(objectType, id, metaDisplay), true, nil
				}
				return usersactivity.ObjectInfo{}, false, err
			}
			display := formatObjectDisplay(label, displayValue(item), id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newStaticObjectResolver(objectType, label string) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, _ string, ids []string, _ usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			ids = []string{""}
		}
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			display := formatObjectDisplay(label, "", id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newPanelObjectResolver() usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, objectType string, ids []string, _ usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		label := objectTypeLabel(objectType)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			display := formatObjectDisplay(label, id, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newNotificationObjectResolver() usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, objectType string, ids []string, _ usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		label := objectTypeLabel(objectType)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			display := formatObjectDisplay(label, id, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newPreferencesObjectResolver(users UserRepository, profiles ProfileStore) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaDisplay := metadataDisplay(ids, meta)
		label := objectTypeLabel(objectType)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if users != nil {
				user, err := users.Get(ctx, id)
				if err != nil {
					if errors.Is(err, ErrNotFound) {
						return tombstoneObjectInfo(objectType, id, metaDisplay), true, nil
					}
					return usersactivity.ObjectInfo{}, false, err
				}
				display := formatObjectDisplay(label, formatUserDisplay(user), id)
				return objectInfo(objectType, id, display), true, nil
			}
			display := formatObjectDisplay(label, metaDisplay, id)
			if profiles != nil && metaDisplay == "" {
				if profile, err := profiles.Get(ctx, id); err == nil {
					display = formatObjectDisplay(label, strings.TrimSpace(profile.DisplayName), id)
				}
			}
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newProfileObjectResolver(users UserRepository, profiles ProfileStore) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaDisplay := metadataDisplay(ids, meta)
		label := objectTypeLabel(objectType)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if profiles != nil {
				profile, err := profiles.Get(ctx, id)
				if err == nil {
					display := formatObjectDisplay(label, strings.TrimSpace(profile.DisplayName), id)
					return objectInfo(objectType, id, display), true, nil
				}
			}
			if users != nil {
				user, err := users.Get(ctx, id)
				if err != nil {
					if errors.Is(err, ErrNotFound) {
						return tombstoneObjectInfo(objectType, id, metaDisplay), true, nil
					}
					return usersactivity.ObjectInfo{}, false, err
				}
				display := formatObjectDisplay(label, formatUserDisplay(user), id)
				return objectInfo(objectType, id, display), true, nil
			}
			display := formatObjectDisplay(label, metaDisplay, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newJobObjectResolver(registry *JobRegistry) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, objectType string, ids []string, _ usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		label := objectTypeLabel(objectType)
		jobMap := map[string]Job{}
		if registry != nil {
			for _, job := range registry.List() {
				jobMap[job.Name] = job
			}
		}
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if registry != nil {
				if _, ok := jobMap[id]; ok {
					display := formatObjectDisplay(label, id, id)
					return objectInfo(objectType, id, display), true, nil
				}
				return tombstoneObjectInfo(objectType, id, ""), true, nil
			}
			display := formatObjectDisplay(label, id, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newWidgetAreaObjectResolver(widgets CMSWidgetService) usersactivity.ObjectResolver {
	return newWidgetCatalogObjectResolver(
		widgets,
		func(service CMSWidgetService) []WidgetAreaDefinition { return service.Areas() },
		func(def WidgetAreaDefinition) string { return def.Code },
		func(def WidgetAreaDefinition) string { return def.Name },
	)
}

func newWidgetDefinitionObjectResolver(widgets CMSWidgetService) usersactivity.ObjectResolver {
	return newWidgetCatalogObjectResolver(
		widgets,
		func(service CMSWidgetService) []WidgetDefinition { return service.Definitions() },
		func(def WidgetDefinition) string { return def.Code },
		func(def WidgetDefinition) string { return def.Name },
	)
}

func newWidgetCatalogObjectResolver[T any](
	widgets CMSWidgetService,
	load func(CMSWidgetService) []T,
	code func(T) string,
	name func(T) string,
) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaName := metadataValue(ids, meta, "name")
		label := objectTypeLabel(objectType)
		catalog := map[string]T{}
		if widgets != nil {
			for _, def := range load(widgets) {
				catalog[code(def)] = def
			}
		}
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if def, ok := catalog[id]; ok {
				display := formatObjectDisplay(label, strings.TrimSpace(name(def)), id)
				return objectInfo(objectType, id, display), true, nil
			}
			if widgets != nil {
				return tombstoneObjectInfo(objectType, id, metaName), true, nil
			}
			display := formatObjectDisplay(label, metaName, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newWidgetInstanceObjectResolver() usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		definition := metadataValue(ids, meta, "definition")
		area := metadataValue(ids, meta, "area")
		pageID := metadataValue(ids, meta, "page_id")
		label := objectTypeLabel(objectType)
		value := primitives.FirstNonEmptyRaw(definition, area, pageID)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			display := formatObjectDisplay(label, value, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newMenuObjectResolver(menus CMSMenuService) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaSlug := metadataValue(ids, meta, "slug")
		label := objectTypeLabel(objectType)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if menus != nil {
				menu, err := menus.Menu(ctx, id, "")
				if err != nil {
					if errors.Is(err, ErrNotFound) {
						return tombstoneObjectInfo(objectType, id, metaSlug), true, nil
					}
					return usersactivity.ObjectInfo{}, false, err
				}
				display := formatObjectDisplay(label, strings.TrimSpace(menu.Slug), id)
				return objectInfo(objectType, id, display), true, nil
			}
			display := formatObjectDisplay(label, metaSlug, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newMenuItemObjectResolver() usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		labelValue := metadataValue(ids, meta, "label")
		label := objectTypeLabel(objectType)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			display := formatObjectDisplay(label, labelValue, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newPageObjectResolver(content CMSContentService) usersactivity.ObjectResolver {
	return newCMSContentObjectResolver(content, func(ctx context.Context, service CMSContentService, id, locale string) (string, string, error) {
		page, err := service.Page(ctx, id, locale)
		if err != nil {
			return "", "", err
		}
		return page.Title, page.Slug, nil
	})
}

func newContentObjectResolver(content CMSContentService) usersactivity.ObjectResolver {
	return newCMSContentObjectResolver(content, func(ctx context.Context, service CMSContentService, id, locale string) (string, string, error) {
		entry, err := service.Content(ctx, id, locale)
		if err != nil {
			return "", "", err
		}
		return entry.Title, entry.Slug, nil
	})
}

func newCMSContentObjectResolver(
	content CMSContentService,
	load func(context.Context, CMSContentService, string, string) (string, string, error),
) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaTitle := metadataValue(ids, meta, "title")
		metaSlug := metadataValue(ids, meta, "slug")
		metaLocale := metadataValue(ids, meta, "locale")
		label := objectTypeLabel(objectType)
		fallback := primitives.FirstNonEmptyRaw(metaTitle, metaSlug)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if content != nil {
				title, slug, err := load(ctx, content, id, metaLocale)
				if err != nil {
					if errors.Is(err, ErrNotFound) {
						return tombstoneObjectInfo(objectType, id, fallback), true, nil
					}
					return usersactivity.ObjectInfo{}, false, err
				}
				display := formatObjectDisplay(label, primitives.FirstNonEmptyRaw(title, slug), id)
				return objectInfo(objectType, id, display), true, nil
			}
			display := formatObjectDisplay(label, fallback, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newBlockDefinitionObjectResolver(content CMSContentService) usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(ctx context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaName := metadataValue(ids, meta, "name")
		metaType := metadataValue(ids, meta, "type")
		label := objectTypeLabel(objectType)
		defs := map[string]CMSBlockDefinition{}
		if content != nil {
			list, err := content.BlockDefinitions(ctx)
			if err != nil {
				return nil, err
			}
			for _, def := range list {
				defs[def.ID] = def
			}
		}
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			if def, ok := defs[id]; ok {
				value := primitives.FirstNonEmptyRaw(def.Name, def.Type)
				display := formatObjectDisplay(label, value, id)
				return objectInfo(objectType, id, display), true, nil
			}
			if content != nil {
				return tombstoneObjectInfo(objectType, id, primitives.FirstNonEmptyRaw(metaName, metaType)), true, nil
			}
			display := formatObjectDisplay(label, primitives.FirstNonEmptyRaw(metaName, metaType), id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func newBlockObjectResolver() usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, objectType string, ids []string, meta usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		metaContent := metadataValue(ids, meta, "content_id")
		metaRegion := metadataValue(ids, meta, "region")
		label := objectTypeLabel(objectType)
		value := primitives.FirstNonEmptyRaw(metaRegion, metaContent)
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			display := formatObjectDisplay(label, value, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

func fallbackObjectResolver() usersactivity.ObjectResolver {
	return ObjectResolverFunc(func(_ context.Context, objectType string, ids []string, _ usersactivity.ResolveContext) (map[string]usersactivity.ObjectInfo, error) {
		ids = normalizeObjectIDs(ids)
		if len(ids) == 0 {
			return nil, nil
		}
		return resolveObjectIDs(ids, func(id string) (usersactivity.ObjectInfo, bool, error) {
			display := safeObjectDisplay(objectType, id)
			return objectInfo(objectType, id, display), true, nil
		})
	})
}

type adminActivityEnricher struct {
	actorResolver  usersactivity.ActorResolver
	objectResolver usersactivity.ObjectResolver
	version        string
	now            func() time.Time
}

func (e adminActivityEnricher) Enrich(ctx context.Context, record userstypes.ActivityRecord) (userstypes.ActivityRecord, error) {
	data := primitives.CloneAnyMap(record.Data)
	if data == nil {
		data = map[string]any{}
	}
	actorID := record.ActorID
	if actorID == uuid.Nil {
		actorID = record.UserID
	}
	objectType := strings.TrimSpace(record.ObjectType)
	objectID := strings.TrimSpace(record.ObjectID)
	updated := seedActivityMetadata(data, actorID, objectType, objectID)
	resolveCtx := usersactivity.ResolveContext{
		TenantID: record.TenantID,
		ActorID:  actorID,
		Verb:     strings.TrimSpace(record.Verb),
		Source:   strings.TrimSpace(record.Channel),
		Metadata: data,
	}
	actorUpdated, err := e.enrichActorMetadata(ctx, data, actorID, resolveCtx)
	if err != nil {
		return record, err
	}
	objectUpdated, err := e.enrichObjectMetadata(ctx, data, objectType, objectID, resolveCtx)
	if err != nil {
		return record, err
	}
	updated = updated || actorUpdated || objectUpdated
	updated = applyDefaultActivityDisplays(data, actorID, objectType, objectID) || updated
	if !updated {
		return record, nil
	}
	return e.stampEnrichedActivity(record, data), nil
}

func seedActivityMetadata(data map[string]any, actorID uuid.UUID, objectType, objectID string) bool {
	updated := false
	if actorID != uuid.Nil {
		updated = setMissingMetadata(data, usersactivity.DataKeyActorID, actorID.String()) || updated
	}
	if _, ok := data[usersactivity.DataKeyActorType]; !ok {
		if legacy, ok := data[ActivityActorTypeKeyLegacy]; ok {
			updated = setMissingMetadata(data, usersactivity.DataKeyActorType, legacy) || updated
		}
	}
	if objectType != "" {
		updated = setMissingMetadata(data, usersactivity.DataKeyObjectType, objectType) || updated
	}
	if objectID != "" {
		updated = setMissingMetadata(data, usersactivity.DataKeyObjectID, objectID) || updated
	}
	return updated
}

func (e adminActivityEnricher) enrichActorMetadata(ctx context.Context, data map[string]any, actorID uuid.UUID, resolveCtx usersactivity.ResolveContext) (bool, error) {
	if e.actorResolver == nil || actorID == uuid.Nil {
		return false, nil
	}
	infos, err := e.actorResolver.ResolveActors(ctx, []uuid.UUID{actorID}, resolveCtx)
	if err != nil {
		return false, err
	}
	info, ok := infos[actorID]
	if !ok {
		return false, nil
	}
	updated := false
	if info.ID != uuid.Nil {
		updated = setMissingMetadata(data, usersactivity.DataKeyActorID, info.ID.String()) || updated
	}
	if info.Type != "" {
		updated = setMissingMetadata(data, usersactivity.DataKeyActorType, info.Type) || updated
	}
	if info.Display != "" {
		updated = setMissingMetadata(data, usersactivity.DataKeyActorDisplay, info.Display) || updated
	}
	if info.Email != "" {
		updated = setMissingMetadata(data, usersactivity.DataKeyActorEmail, info.Email) || updated
	}
	return updated, nil
}

func (e adminActivityEnricher) enrichObjectMetadata(ctx context.Context, data map[string]any, objectType, objectID string, resolveCtx usersactivity.ResolveContext) (bool, error) {
	if e.objectResolver == nil || objectType == "" || objectID == "" {
		return false, nil
	}
	infos, err := e.objectResolver.ResolveObjects(ctx, objectType, []string{objectID}, resolveCtx)
	if err != nil {
		return false, err
	}
	info, ok := infos[objectID]
	if !ok {
		return false, nil
	}
	updated := false
	if info.ID != "" {
		updated = setMissingMetadata(data, usersactivity.DataKeyObjectID, info.ID) || updated
	}
	if info.Type != "" {
		updated = setMissingMetadata(data, usersactivity.DataKeyObjectType, info.Type) || updated
	}
	if info.Display != "" {
		updated = setMissingMetadata(data, usersactivity.DataKeyObjectDisplay, info.Display) || updated
	}
	if info.Deleted {
		updated = setMissingMetadata(data, usersactivity.DataKeyObjectDeleted, true) || updated
	}
	return updated, nil
}

func applyDefaultActivityDisplays(data map[string]any, actorID uuid.UUID, objectType, objectID string) bool {
	updated := false
	if _, ok := data[usersactivity.DataKeyObjectDisplay]; !ok && objectType != "" {
		display := safeObjectDisplay(objectType, objectID)
		if objectID == "" {
			display = objectTypeLabel(objectType)
		}
		if strings.TrimSpace(display) != "" {
			updated = setMissingMetadata(data, usersactivity.DataKeyObjectDisplay, display) || updated
		}
	}
	if _, ok := data[usersactivity.DataKeyActorDisplay]; !ok && actorID != uuid.Nil {
		updated = setMissingMetadata(data, usersactivity.DataKeyActorDisplay, actorID.String()) || updated
	}
	return updated
}

func (e adminActivityEnricher) stampEnrichedActivity(record userstypes.ActivityRecord, data map[string]any) userstypes.ActivityRecord {
	out := record
	out.Data = data
	now := time.Now().UTC()
	if e.now != nil {
		now = e.now()
		if now.IsZero() {
			now = time.Now().UTC()
		} else {
			now = now.UTC()
		}
	}
	return usersactivity.StampEnrichment(out, now, e.version)
}

func setMissingMetadata(data map[string]any, key string, value any) bool {
	key = strings.TrimSpace(key)
	if key == "" || data == nil {
		return false
	}
	if _, exists := data[key]; exists {
		return false
	}
	switch v := value.(type) {
	case string:
		if strings.TrimSpace(v) == "" {
			return false
		}
	case nil:
		return false
	}
	data[key] = value
	return true
}

func resolveObjectIDs(ids []string, builder func(id string) (usersactivity.ObjectInfo, bool, error)) (map[string]usersactivity.ObjectInfo, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	out := make(map[string]usersactivity.ObjectInfo, len(ids))
	for _, id := range ids {
		info, ok, err := builder(id)
		if err != nil {
			return out, err
		}
		if ok {
			out[id] = info
		}
	}
	if len(out) == 0 {
		return nil, nil
	}
	return out, nil
}

func normalizeObjectIDs(ids []string) []string {
	if len(ids) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func metadataDisplay(ids []string, meta usersactivity.ResolveContext) string {
	return metadataValue(ids, meta, usersactivity.DataKeyObjectDisplay)
}

func metadataValue(ids []string, meta usersactivity.ResolveContext, key string) string {
	if len(ids) != 1 || meta.Metadata == nil {
		return ""
	}
	return strings.TrimSpace(toString(meta.Metadata[key]))
}

func formatUserDisplay(user UserRecord) string {
	if user.ID == "" && user.Email == "" && user.Username == "" && user.FirstName == "" && user.LastName == "" {
		return ""
	}
	fullName := strings.TrimSpace(strings.Join([]string{user.FirstName, user.LastName}, " "))
	return primitives.FirstNonEmptyRaw(fullName, user.Username, user.Email, user.ID)
}

func formatRoleDisplay(role RoleRecord) string {
	return primitives.FirstNonEmptyRaw(role.Name, role.RoleKey, role.ID)
}

func formatTenantDisplay(tenant TenantRecord) string {
	return primitives.FirstNonEmptyRaw(tenant.Name, tenant.Slug, tenant.Domain, tenant.ID)
}

func formatOrganizationDisplay(org OrganizationRecord) string {
	return primitives.FirstNonEmptyRaw(org.Name, org.Slug, org.ID)
}

func objectInfo(objectType, id, display string) usersactivity.ObjectInfo {
	return usersactivity.ObjectInfo{
		ID:      id,
		Type:    strings.TrimSpace(objectType),
		Display: strings.TrimSpace(display),
	}
}

func tombstoneObjectInfo(objectType, id, existingDisplay string) usersactivity.ObjectInfo {
	existingDisplay = strings.TrimSpace(existingDisplay)
	display := existingDisplay
	if display == "" {
		display = deletedObjectDisplay(objectType, id)
	}
	return usersactivity.ObjectInfo{
		ID:      id,
		Type:    strings.TrimSpace(objectType),
		Display: display,
		Deleted: true,
	}
}

func formatObjectDisplay(label, value, id string) string {
	label = strings.TrimSpace(label)
	value = strings.TrimSpace(value)
	id = strings.TrimSpace(id)
	switch {
	case label != "" && value != "":
		return fmt.Sprintf("%s: %s", label, value)
	case label != "" && id != "":
		return fmt.Sprintf("%s: %s", label, id)
	case label != "":
		return label
	case value != "":
		return value
	default:
		return id
	}
}

func deletedObjectDisplay(objectType, id string) string {
	label := objectTypeLabel(objectType)
	if id == "" {
		return fmt.Sprintf("Deleted %s", label)
	}
	return fmt.Sprintf("Deleted %s: %s", label, id)
}

func safeObjectDisplay(objectType, id string) string {
	objectType = strings.TrimSpace(objectType)
	id = strings.TrimSpace(id)
	switch {
	case objectType == "":
		return id
	case id == "":
		return objectType
	default:
		return objectType + ":" + id
	}
}

func objectTypeLabel(objectType string) string {
	if label, ok := objectTypeLabels[objectType]; ok {
		return label
	}
	if objectType == "" {
		return "Object"
	}
	return titleWords(strings.ReplaceAll(objectType, "_", " "))
}

var objectTypeLabels = map[string]string{
	ActivityObjectTypeUser:             "User",
	ActivityObjectTypeRole:             "Role",
	ActivityObjectTypeTenant:           "Tenant",
	ActivityObjectTypeOrganization:     "Organization",
	ActivityObjectTypeSettings:         "Settings",
	ActivityObjectTypeDashboard:        "Dashboard",
	ActivityObjectTypePanel:            "Panel",
	ActivityObjectTypeNotification:     "Notification",
	ActivityObjectTypePreferences:      "Preferences",
	ActivityObjectTypeProfile:          "Profile",
	ActivityObjectTypeJob:              "Job",
	ActivityObjectTypeWidgetArea:       "Widget Area",
	ActivityObjectTypeWidgetDefinition: "Widget Definition",
	ActivityObjectTypeWidgetInstance:   "Widget Instance",
	ActivityObjectTypeMenu:             "Menu",
	ActivityObjectTypeMenuItem:         "Menu Item",
	ActivityObjectTypePage:             "Page",
	ActivityObjectTypeContent:          "Content",
	ActivityObjectTypeBlockDefinition:  "Block Definition",
	ActivityObjectTypeBlock:            "Block",
}

func titleWords(input string) string {
	if input == "" {
		return ""
	}
	parts := strings.Fields(input)
	for i, part := range parts {
		parts[i] = capitalizeWord(part)
	}
	return strings.Join(parts, " ")
}

func capitalizeWord(input string) string {
	if input == "" {
		return ""
	}
	return strings.ToUpper(input[:1]) + strings.ToLower(input[1:])
}
