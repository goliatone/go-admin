package admin

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
)

type menuBuilderBinding struct {
	admin *Admin
}

func newMenuBuilderBinding(a *Admin) *menuBuilderBinding {
	if a == nil {
		return nil
	}
	return &menuBuilderBinding{admin: a}
}

func (a *Admin) menuBuilderService() *MenuBuilderService {
	if a == nil {
		return nil
	}
	if a.menuBuilder == nil {
		a.menuBuilder = NewMenuBuilderService()
	}
	return a.menuBuilder
}

func (a *Admin) menuBuilderEndpoints() map[string]string {
	return map[string]string{
		"menus":                      adminAPIRoutePath(a, "menus"),
		"menus.contracts":            adminAPIRoutePath(a, "menus.contracts"),
		"content.navigation":         adminAPIRoutePath(a, "content.navigation"),
		"menus.id":                   adminAPIRoutePath(a, "menus.id"),
		"menus.publish":              adminAPIRoutePath(a, "menus.publish"),
		"menus.unpublish":            adminAPIRoutePath(a, "menus.unpublish"),
		"menus.items":                adminAPIRoutePath(a, "menus.items"),
		"menus.preview":              adminAPIRoutePath(a, "menus.preview"),
		"menus.clone":                adminAPIRoutePath(a, "menus.clone"),
		"menus.archive":              adminAPIRoutePath(a, "menus.archive"),
		"menu.bindings":              adminAPIRoutePath(a, "menu.bindings"),
		"menu.bindings.location":     adminAPIRoutePath(a, "menu.bindings.location"),
		"menu.view_profiles":         adminAPIRoutePath(a, "menu.view_profiles"),
		"menu.view_profiles.code":    adminAPIRoutePath(a, "menu.view_profiles.code"),
		"menu.view_profiles.publish": adminAPIRoutePath(a, "menu.view_profiles.publish"),
	}
}

func (a *Admin) registerMenuBuilderRoutes() {
	if a == nil || a.router == nil || a.menuBuilderRoutesRegistered {
		return
	}
	binding := newMenuBuilderBinding(a)
	if binding == nil {
		return
	}
	target := a.ProtectedRouter()
	if target == nil {
		return
	}
	endpoints := a.menuBuilderEndpoints()
	registerRoute := func(route string, handler router.HandlerFunc, register func(string, router.HandlerFunc, ...router.MiddlewareFunc) router.RouteInfo) {
		path := strings.TrimSpace(endpoints[route])
		if path == "" || handler == nil || register == nil {
			return
		}
		register(path, handler)
	}

	registerRoute("menus.contracts", binding.Contracts, target.Get)
	registerRoute("menus", binding.ListMenus, target.Get)
	registerRoute("menus", binding.CreateMenu, target.Post)
	registerRoute("menus.id", binding.GetMenu, target.Get)
	registerRoute("menus.id", binding.UpdateMenu, target.Put)
	registerRoute("menus.id", binding.DeleteMenu, target.Delete)
	registerRoute("menus.publish", binding.PublishMenu, target.Post)
	registerRoute("menus.unpublish", binding.UnpublishMenu, target.Post)
	registerRoute("menus.items", binding.UpsertMenuItems, target.Put)
	registerRoute("menus.preview", binding.PreviewMenu, target.Get)
	registerRoute("menus.clone", binding.CloneMenu, target.Post)
	registerRoute("menus.archive", binding.ArchiveMenu, target.Post)

	registerRoute("menu.bindings", binding.ListBindings, target.Get)
	registerRoute("menu.bindings.location", binding.UpsertBindingByLocation, target.Put)
	registerRoute("menu.view_profiles", binding.ListViewProfiles, target.Get)
	registerRoute("menu.view_profiles", binding.CreateViewProfile, target.Post)
	registerRoute("menu.view_profiles.code", binding.UpdateViewProfile, target.Put)
	registerRoute("menu.view_profiles.code", binding.DeleteViewProfile, target.Delete)
	registerRoute("menu.view_profiles.publish", binding.PublishViewProfile, target.Post)

	a.menuBuilderRoutesRegistered = true
}

func (b *menuBuilderBinding) requireView(ctx AdminContext) error {
	if b == nil || b.admin == nil {
		return serviceUnavailableDomainError("menu builder unavailable", nil)
	}
	return b.admin.requirePermission(ctx, b.admin.config.MenuBuilderPermission, "menus")
}

func (b *menuBuilderBinding) requireEdit(ctx AdminContext) error {
	if b == nil || b.admin == nil {
		return serviceUnavailableDomainError("menu builder unavailable", nil)
	}
	return b.admin.requirePermission(ctx, b.admin.config.MenuBuilderEditPermission, "menus")
}

func (b *menuBuilderBinding) requirePublish(ctx AdminContext) error {
	if b == nil || b.admin == nil {
		return serviceUnavailableDomainError("menu builder unavailable", nil)
	}
	return b.admin.requirePermission(ctx, b.admin.config.MenuBuilderPublishPermission, "menus")
}

func (b *menuBuilderBinding) Contracts(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireView(adminCtx); err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	return writeJSON(c, map[string]any{
		"contracts": service.Contracts(b.admin.menuBuilderEndpoints()),
	})
}

func (b *menuBuilderBinding) ListMenus(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireView(adminCtx); err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	records := service.ListMenus()
	return writeJSON(c, map[string]any{
		"menus": records,
		"total": len(records),
		"meta":  map[string]any{"endpoints": b.admin.menuBuilderEndpoints()},
	})
}

func (b *menuBuilderBinding) CreateMenu(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	record, err := service.CreateMenu(adminCtx.Context, b.admin.menuSvc, body, adminCtx.Locale)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.create", "menu:"+record.Code, map[string]any{
		"menu_code": record.Code,
		"status":    record.Status,
	})
	return writeJSON(c, map[string]any{"menu": record})
}

func (b *menuBuilderBinding) GetMenu(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireView(adminCtx); err != nil {
		return writeError(c, err)
	}
	id := strings.TrimSpace(c.Param("id", ""))
	if id == "" {
		return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
	}
	service := b.admin.menuBuilderService()
	record, err := service.ensureMenuFromService(adminCtx.Context, b.admin.menuSvc, id, adminCtx.Locale)
	if err != nil {
		return writeError(c, err)
	}
	menu, err := b.admin.menuSvc.Menu(adminCtx.Context, record.Code, adminCtx.Locale)
	if err != nil {
		return writeError(c, err)
	}
	return writeJSON(c, map[string]any{
		"menu":  record,
		"items": menu.Items,
	})
}

func (b *menuBuilderBinding) UpdateMenu(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	id := strings.TrimSpace(c.Param("id", ""))
	if id == "" {
		return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	record, err := service.UpdateMenu(id, body)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.update", "menu:"+record.Code, map[string]any{
		"menu_code": record.Code,
	})
	return writeJSON(c, map[string]any{"menu": record})
}

func (b *menuBuilderBinding) DeleteMenu(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	id := strings.TrimSpace(c.Param("id", ""))
	if id == "" {
		return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
	}
	force := strings.EqualFold(strings.TrimSpace(c.Query("force")), "true")
	if !force {
		body, err := b.admin.ParseBody(c)
		if err == nil {
			if raw, ok := body["force"].(bool); ok {
				force = raw
			}
		}
	}
	service := b.admin.menuBuilderService()
	if err := service.DeleteMenu(id, force); err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.delete", "menu:"+normalizeMenuCode(id), map[string]any{
		"menu_code": normalizeMenuCode(id),
		"force":     force,
	})
	return writeJSON(c, map[string]any{"status": "ok"})
}

func (b *menuBuilderBinding) PublishMenu(c router.Context) error {
	return b.setMenuPublishState(c, true)
}

func (b *menuBuilderBinding) UnpublishMenu(c router.Context) error {
	return b.setMenuPublishState(c, false)
}

func (b *menuBuilderBinding) setMenuPublishState(c router.Context, publish bool) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requirePublish(adminCtx); err != nil {
		return writeError(c, err)
	}
	id := strings.TrimSpace(c.Param("id", ""))
	if id == "" {
		return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
	}
	service := b.admin.menuBuilderService()
	status := MenuRecordStatusDraft
	action := "menu.unpublish"
	if publish {
		status = MenuRecordStatusPublished
		action = "menu.publish"
	}
	record, err := service.SetMenuStatus(id, status)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, action, "menu:"+record.Code, map[string]any{
		"menu_code": record.Code,
		"status":    record.Status,
	})
	return writeJSON(c, map[string]any{"menu": record})
}

func (b *menuBuilderBinding) UpsertMenuItems(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	id := strings.TrimSpace(c.Param("id", ""))
	if id == "" {
		return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	rawItems, ok := body["items"]
	if !ok {
		return writeError(c, requiredFieldDomainError("items", map[string]any{"field": "items"}))
	}
	tree := parseMenuItemsPayload(rawItems)
	service := b.admin.menuBuilderService()
	menu, err := service.UpsertMenuItems(adminCtx.Context, b.admin.menuSvc, id, tree, adminCtx.Locale)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.items.upsert", "menu:"+normalizeMenuCode(id), map[string]any{
		"menu_code": normalizeMenuCode(id),
		"items":     len(menu.Items),
	})
	return writeJSON(c, map[string]any{"menu": menu})
}

func (b *menuBuilderBinding) PreviewMenu(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireView(adminCtx); err != nil {
		return writeError(c, err)
	}
	id := strings.TrimSpace(c.Param("id", ""))
	if id == "" {
		return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
	}
	service := b.admin.menuBuilderService()
	record, err := service.ensureMenuFromService(adminCtx.Context, b.admin.menuSvc, id, adminCtx.Locale)
	if err != nil {
		return writeError(c, err)
	}

	opts, location, locale, viewProfile, includeDrafts, binding, previewTokenPresent, err := b.previewMenuOptions(c, &adminCtx, service)
	if err != nil {
		return writeError(c, err)
	}

	var menu *Menu
	if location != "" {
		menu, err = b.admin.menuByLocation(adminCtx.Context, location, opts)
	} else {
		menu, err = b.admin.menuByCode(adminCtx.Context, record.Code, opts)
	}
	if err != nil {
		return writeError(c, err)
	}
	if menu != nil && b.admin.contentSvc != nil {
		b.admin.resolveMenuTargets(adminCtx.Context, menu.Items, locale)
	}

	var profile *AdminMenuViewProfileRecord
	if viewProfile != "" {
		if resolved, ok := service.GetViewProfile(viewProfile); ok {
			projected := projectMenuForProfile(menu, resolved)
			menu = projected
			profile = &resolved
		}
	}

	return writeJSON(c, map[string]any{
		"menu": menu,
		"simulation": AdminMenuPreviewSimulation{
			RequestedID:         record.Code,
			Location:            location,
			Locale:              locale,
			ViewProfile:         viewProfile,
			IncludeDrafts:       includeDrafts,
			PreviewTokenPresent: previewTokenPresent,
			Binding:             binding,
			Profile:             profile,
		},
	})
}

func (b *menuBuilderBinding) previewMenuOptions(c router.Context, adminCtx *AdminContext, service *MenuBuilderService) (SiteMenuReadOptions, string, string, string, bool, *AdminMenuBindingRecord, bool, error) {
	locale := strings.TrimSpace(primitives.FirstNonEmptyRaw(c.Query("locale"), adminCtx.Locale, b.admin.config.DefaultLocale))
	location := strings.TrimSpace(c.Query("location"))
	viewProfile := strings.TrimSpace(c.Query("view_profile"))
	includeDrafts := strings.EqualFold(strings.TrimSpace(c.Query("include_drafts")), "true")
	previewToken := strings.TrimSpace(c.Query("preview_token"))
	previewTokenPresent := previewToken != ""
	if previewTokenPresent {
		token, err := b.admin.previewTokenFromQuery(previewToken)
		if err != nil {
			return SiteMenuReadOptions{}, "", "", "", false, nil, false, err
		}
		_, env := splitPreviewEntityType(token.EntityType)
		if env != "" {
			adminCtx.Context = WithEnvironment(adminCtx.Context, env)
		}
		includeDrafts = true
	}
	binding := service.ResolveBinding(location, locale)
	if location == "" && binding != nil {
		location = binding.Location
	}
	if viewProfile == "" && binding != nil {
		viewProfile = binding.ViewProfileCode
	}
	return SiteMenuReadOptions{
		Locale:               locale,
		IncludeDrafts:        includeDrafts,
		IncludeContributions: true,
		PreviewToken:         previewToken,
		ViewProfile:          viewProfile,
	}, location, locale, viewProfile, includeDrafts, binding, previewTokenPresent, nil
}

func (b *menuBuilderBinding) CloneMenu(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	id := strings.TrimSpace(c.Param("id", ""))
	if id == "" {
		return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	target := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(body["code"]),
		toString(body["target_code"]),
		toString(body["id"]),
	))
	service := b.admin.menuBuilderService()
	record, err := service.CloneMenu(adminCtx.Context, b.admin.menuSvc, id, target, adminCtx.Locale)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.clone", "menu:"+record.Code, map[string]any{
		"source_menu_code": normalizeMenuCode(id),
		"menu_code":        record.Code,
	})
	return writeJSON(c, map[string]any{"menu": record})
}

func (b *menuBuilderBinding) ArchiveMenu(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	id := strings.TrimSpace(c.Param("id", ""))
	if id == "" {
		return writeError(c, requiredFieldDomainError("id", map[string]any{"field": "id"}))
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	archived := true
	if raw, ok := body["archived"].(bool); ok {
		archived = raw
	}
	service := b.admin.menuBuilderService()
	record, err := service.ArchiveMenu(id, archived)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.archive", "menu:"+record.Code, map[string]any{
		"menu_code": record.Code,
		"archived":  archived,
	})
	return writeJSON(c, map[string]any{"menu": record})
}

func (b *menuBuilderBinding) ListBindings(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireView(adminCtx); err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	records := service.ListBindings()
	return writeJSON(c, map[string]any{"bindings": records, "total": len(records)})
}

func (b *menuBuilderBinding) UpsertBindingByLocation(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	location := strings.TrimSpace(c.Param("location", ""))
	if location == "" {
		return writeError(c, requiredFieldDomainError("location", map[string]any{"field": "location"}))
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	binding, err := service.UpsertBinding(location, body)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.binding.upsert", "menu_binding:"+binding.ID, map[string]any{
		"location":          binding.Location,
		"menu_code":         binding.MenuCode,
		"view_profile_code": binding.ViewProfileCode,
	})
	return writeJSON(c, map[string]any{"binding": binding})
}

func (b *menuBuilderBinding) ListViewProfiles(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireView(adminCtx); err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	records := service.ListViewProfiles()
	return writeJSON(c, map[string]any{
		"view_profiles": records,
		"profiles":      records, // Backward-compatible alias.
		"total":         len(records),
	})
}

func (b *menuBuilderBinding) CreateViewProfile(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	profile, err := service.UpsertViewProfile("", body)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.view_profile.create", "menu_view_profile:"+profile.Code, map[string]any{
		"code": profile.Code,
	})
	return writeJSON(c, map[string]any{
		"view_profile": profile,
		"profile":      profile, // Backward-compatible alias.
	})
}

func (b *menuBuilderBinding) UpdateViewProfile(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	code := strings.TrimSpace(c.Param("code", ""))
	if code == "" {
		return writeError(c, requiredFieldDomainError("code", map[string]any{"field": "code"}))
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	service := b.admin.menuBuilderService()
	profile, err := service.UpsertViewProfile(code, body)
	if err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.view_profile.update", "menu_view_profile:"+profile.Code, map[string]any{
		"code": profile.Code,
	})
	return writeJSON(c, map[string]any{
		"view_profile": profile,
		"profile":      profile, // Backward-compatible alias.
	})
}

func (b *menuBuilderBinding) DeleteViewProfile(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requireEdit(adminCtx); err != nil {
		return writeError(c, err)
	}
	code := strings.TrimSpace(c.Param("code", ""))
	if code == "" {
		return writeError(c, requiredFieldDomainError("code", map[string]any{"field": "code"}))
	}
	service := b.admin.menuBuilderService()
	if err := service.DeleteViewProfile(code); err != nil {
		return writeError(c, err)
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "menu.view_profile.delete", "menu_view_profile:"+normalizeMenuCode(code), map[string]any{
		"code": normalizeMenuCode(code),
	})
	return writeJSON(c, map[string]any{"status": "ok"})
}

func (b *menuBuilderBinding) PublishViewProfile(c router.Context) error {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.requirePublish(adminCtx); err != nil {
		return writeError(c, err)
	}
	code := strings.TrimSpace(c.Param("code", ""))
	if code == "" {
		return writeError(c, requiredFieldDomainError("code", map[string]any{"field": "code"}))
	}
	body, err := b.admin.ParseBody(c)
	if err != nil {
		return writeError(c, err)
	}
	publish := true
	if raw, ok := body["publish"].(bool); ok {
		publish = raw
	}
	service := b.admin.menuBuilderService()
	profile, err := service.PublishViewProfile(code, publish)
	if err != nil {
		return writeError(c, err)
	}
	action := "menu.view_profile.publish"
	if !publish {
		action = "menu.view_profile.unpublish"
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, action, "menu_view_profile:"+profile.Code, map[string]any{
		"code":   profile.Code,
		"status": profile.Status,
	})
	return writeJSON(c, map[string]any{
		"view_profile": profile,
		"profile":      profile, // Backward-compatible alias.
	})
}

func parseMenuItemsPayload(raw any) []MenuItem {
	if raw == nil {
		return nil
	}
	switch typed := raw.(type) {
	case []MenuItem:
		return typed
	case []map[string]any:
		out := make([]MenuItem, 0, len(typed))
		for _, entry := range typed {
			out = append(out, parseMenuItemMap(entry))
		}
		return out
	case []any:
		out := make([]MenuItem, 0, len(typed))
		for _, entry := range typed {
			if mapped, ok := entry.(map[string]any); ok {
				out = append(out, parseMenuItemMap(mapped))
			}
		}
		return out
	default:
		return nil
	}
}

func parseMenuItemMap(record map[string]any) MenuItem {
	item := MenuItem{
		ID:            strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["id"]), toString(record["code"]))),
		Code:          strings.TrimSpace(toString(record["code"])),
		Type:          strings.TrimSpace(toString(record["type"])),
		Label:         strings.TrimSpace(toString(record["label"])),
		LabelKey:      strings.TrimSpace(toString(record["label_key"])),
		GroupTitle:    strings.TrimSpace(toString(record["group_title"])),
		GroupTitleKey: strings.TrimSpace(toString(record["group_title_key"])),
		Locale:        strings.TrimSpace(toString(record["locale"])),
		Icon:          strings.TrimSpace(toString(record["icon"])),
		Menu:          strings.TrimSpace(toString(record["menu"])),
		ParentID:      strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["parent_id"]), toString(record["parent_code"]))),
		ParentCode:    strings.TrimSpace(toString(record["parent_code"])),
		Target:        extractMap(record["target"]),
		Badge:         extractMap(record["badge"]),
		Permissions:   menuBuilderStringSlice(record["permissions"]),
		Classes:       menuBuilderStringSlice(record["classes"]),
		Styles:        mapToStringMap(record["styles"]),
		Collapsible:   boolFromAny(record["collapsible"]),
		Collapsed:     boolFromAny(record["collapsed"]),
	}
	if pos := atoiDefault(toString(record["position"]), -1); pos >= 0 {
		item.Position = new(pos)
	}
	item.Children = parseMenuItemsPayload(record["children"])
	return item
}

func boolFromAny(raw any) bool {
	if value, ok := primitives.BoolFromAny(raw); ok {
		return value
	}
	return false
}

func mapToStringMap(raw any) map[string]string {
	if raw == nil {
		return nil
	}
	switch typed := raw.(type) {
	case map[string]string:
		return primitives.CloneStringMapNilOnEmpty(typed)
	case map[string]any:
		out := map[string]string{}
		for key, value := range typed {
			trimmed := strings.TrimSpace(toString(value))
			if trimmed == "" {
				continue
			}
			out[key] = trimmed
		}
		return out
	default:
		return nil
	}
}
