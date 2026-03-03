package site

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

const (
	menuDedupByURL    = "by_url"
	menuDedupByTarget = "by_target"
	menuDedupNone     = "none"
)

type menuByLocationWithOptions interface {
	MenuByLocationWithOptions(ctx context.Context, location, locale string, opts admin.SiteMenuReadOptions) (*admin.Menu, error)
}

type menuByCodeWithOptions interface {
	MenuByCodeWithOptions(ctx context.Context, code, locale string, opts admin.SiteMenuReadOptions) (*admin.Menu, error)
}

type navigationReadOptions struct {
	Locale                   string
	IncludeContributions     bool
	IncludeDrafts            bool
	PreviewToken             string
	ViewProfile              string
	DedupPolicy              string
	ContributionLocalePolicy string
}

func (o navigationReadOptions) toSiteMenuReadOptions() admin.SiteMenuReadOptions {
	return admin.SiteMenuReadOptions{
		Locale:               strings.TrimSpace(o.Locale),
		IncludeContributions: o.IncludeContributions,
		IncludeDrafts:        o.IncludeDrafts,
		PreviewToken:         strings.TrimSpace(o.PreviewToken),
		ViewProfile:          strings.TrimSpace(o.ViewProfile),
	}
}

type navigationRuntime struct {
	siteCfg     ResolvedSiteConfig
	menuSvc     admin.CMSMenuService
	contentSvc  admin.CMSContentService
	contentType admin.CMSContentTypeService
	authorizer  admin.Authorizer
}

func newNavigationRuntime(
	siteCfg ResolvedSiteConfig,
	adm *admin.Admin,
	contentSvc admin.CMSContentService,
	contentTypeSvc admin.CMSContentTypeService,
) *navigationRuntime {
	var menuSvc admin.CMSMenuService
	var authorizer admin.Authorizer
	if adm != nil {
		menuSvc = adm.MenuService()
		authorizer = adm.Authorizer()
	}
	if contentSvc == nil && adm != nil {
		contentSvc = adm.ContentService()
	}
	if contentTypeSvc == nil && adm != nil {
		contentTypeSvc = adm.ContentTypeService()
	}
	if menuSvc == nil && !siteCfg.Navigation.EnableGeneratedFallback {
		return nil
	}
	return &navigationRuntime{
		siteCfg:     siteCfg,
		menuSvc:     menuSvc,
		contentSvc:  contentSvc,
		contentType: contentTypeSvc,
		authorizer:  authorizer,
	}
}

func (r *navigationRuntime) context(c router.Context, state RequestState, activePath string) map[string]any {
	if r == nil {
		return map[string]any{
			"main_menu":          emptyResolvedMenu(DefaultMainMenuLocation, DefaultFallbackMenuCode, normalizeLocalePath(activePath)),
			"footer_menu":        emptyResolvedMenu(DefaultFooterMenuLocation, DefaultFallbackMenuCode, normalizeLocalePath(activePath)),
			"main_menu_items":    []map[string]any{},
			"footer_menu_items":  []map[string]any{},
			"navigation_debug":   false,
			"navigation_helpers": map[string]any{},
		}
	}

	opts := r.resolveReadOptions(c, state)
	activePath = normalizeLocalePath(activePath)
	debugMode := navigationDebugEnabled(c)

	main := r.resolveMenuForLocation(requestContext(c), state, r.siteCfg.Navigation.MainMenuLocation, activePath, opts, debugMode)
	footer := r.resolveMenuForLocation(requestContext(c), state, r.siteCfg.Navigation.FooterMenuLocation, activePath, opts, debugMode)

	mainItems := toMenuItemsContract(main["items"])
	footerItems := toMenuItemsContract(footer["items"])

	return map[string]any{
		"main_menu":         main,
		"footer_menu":       footer,
		"main_menu_items":   mainItems,
		"footer_menu_items": footerItems,
		"navigation_debug":  debugMode,
		// Keep legacy contract for templates that still bind a single nav list.
		"nav_items": mainItems,
		"navigation_helpers": map[string]any{
			"main": map[string]any{
				"location": r.siteCfg.Navigation.MainMenuLocation,
				"items":    mainItems,
				"active":   activePath,
			},
			"footer": map[string]any{
				"location": r.siteCfg.Navigation.FooterMenuLocation,
				"items":    footerItems,
				"active":   activePath,
			},
		},
	}
}

func (r *navigationRuntime) resolveReadOptions(c router.Context, state RequestState) navigationReadOptions {
	opts := navigationReadOptions{
		Locale:               strings.TrimSpace(state.Locale),
		IncludeContributions: queryBoolValue(c, "include_contributions", true),
		DedupPolicy:          normalizeDedupPolicy(strings.TrimSpace(primitivesFirstNonEmpty(queryValue(c, "menu_dedupe_policy"), queryValue(c, "dedupe_policy"), queryValue(c, "contribution_duplicate_policy")))),
		ContributionLocalePolicy: normalizeContributionLocalePolicy(strings.TrimSpace(primitivesFirstNonEmpty(
			queryValue(c, "contribution_locale_policy"),
			r.siteCfg.Navigation.ContributionLocalePolicy,
		))),
	}
	if opts.DedupPolicy == "" {
		opts.DedupPolicy = menuDedupByURL
	}

	if state.PreviewTokenPresent &&
		state.PreviewTokenValid &&
		r.siteCfg.Features.EnableMenuDraftPreview &&
		previewEntityAllowsMenuDrafts(state.PreviewEntityType) {
		opts.IncludeDrafts = true
		opts.PreviewToken = strings.TrimSpace(state.PreviewToken)
	}

	if c != nil {
		opts.ViewProfile = strings.TrimSpace(c.Query("view_profile"))
	}

	return opts
}

func (r *navigationRuntime) resolveMenuForLocation(
	ctx context.Context,
	state RequestState,
	location string,
	activePath string,
	opts navigationReadOptions,
	debugMode bool,
) map[string]any {
	location = strings.TrimSpace(location)
	if location == "" {
		location = strings.TrimSpace(r.siteCfg.Navigation.MainMenuLocation)
	}

	menu, source, resolveErr := r.resolveRawMenu(ctx, state, location, opts)
	if resolveErr != nil && menu == nil {
		return map[string]any{
			"location":           location,
			"code":               strings.TrimSpace(r.siteCfg.Navigation.FallbackMenuCode),
			"source":             "error",
			"active_path":        normalizeLocalePath(activePath),
			"items":              []map[string]any{},
			"error":              resolveErr.Error(),
			"include_drafts":     opts.IncludeDrafts,
			"include_preview":    strings.TrimSpace(opts.PreviewToken) != "",
			"include_debug":      debugMode,
			"include_fallback":   r.siteCfg.Navigation.EnableGeneratedFallback,
			"requested_locale":   strings.TrimSpace(state.Locale),
			"resolved_locale":    strings.TrimSpace(state.Locale),
			"view_profile":       strings.TrimSpace(opts.ViewProfile),
			"include_dedup_mode": opts.DedupPolicy,
		}
	}
	if menu == nil {
		return emptyResolvedMenu(location, r.siteCfg.Navigation.FallbackMenuCode, activePath)
	}

	filtered := r.filterMenuItems(ctx, menu.Items)
	filtered = r.enforceContributionLocalePolicy(ctx, filtered, opts.Locale, opts.ContributionLocalePolicy)
	projected := r.projectMenuItems(filtered, activePath, opts.DedupPolicy, debugMode)

	return map[string]any{
		"location":           strings.TrimSpace(primitivesFirstNonEmpty(menu.Location, location)),
		"code":               strings.TrimSpace(primitivesFirstNonEmpty(menu.Code, r.siteCfg.Navigation.FallbackMenuCode)),
		"source":             strings.TrimSpace(source),
		"active_path":        normalizeLocalePath(activePath),
		"items":              projected,
		"include_drafts":     opts.IncludeDrafts,
		"include_preview":    strings.TrimSpace(opts.PreviewToken) != "",
		"include_debug":      debugMode,
		"include_fallback":   r.siteCfg.Navigation.EnableGeneratedFallback,
		"requested_locale":   strings.TrimSpace(state.Locale),
		"resolved_locale":    strings.TrimSpace(state.Locale),
		"view_profile":       strings.TrimSpace(opts.ViewProfile),
		"include_dedup_mode": opts.DedupPolicy,
	}
}

func (r *navigationRuntime) resolveRawMenu(
	ctx context.Context,
	state RequestState,
	location string,
	opts navigationReadOptions,
) (*admin.Menu, string, error) {
	location = strings.TrimSpace(location)
	var lastErr error
	if r.menuSvc != nil && location != "" {
		menu, err := r.menuByLocation(ctx, location, opts)
		if err == nil && menu != nil && len(menu.Items) > 0 {
			return menu, "location", nil
		}
		if err != nil {
			lastErr = err
		}
		if err == nil && menu != nil && len(menu.Items) == 0 {
			lastErr = nil
		}
	}

	fallbackCode := strings.TrimSpace(r.siteCfg.Navigation.FallbackMenuCode)
	if r.menuSvc != nil && fallbackCode != "" {
		menu, err := r.menuByCode(ctx, fallbackCode, opts)
		if err == nil && menu != nil && len(menu.Items) > 0 {
			if strings.TrimSpace(menu.Location) == "" {
				menu.Location = location
			}
			return menu, "code", nil
		}
		if err != nil {
			lastErr = err
		}
		if err == nil && menu != nil && len(menu.Items) == 0 {
			lastErr = nil
		}
	}

	if generated := r.generatedFallbackMenu(ctx, state, location); generated != nil {
		return generated, "generated_fallback", nil
	}
	return &admin.Menu{
		Code:     fallbackCode,
		Location: location,
		Items:    []admin.MenuItem{},
	}, "empty", lastErr
}

func (r *navigationRuntime) menuByLocation(ctx context.Context, location string, opts navigationReadOptions) (*admin.Menu, error) {
	// In-memory menu service resolves locations by calling Menu while holding an
	// internal mutex; avoid that path for site runtime reads.
	if _, ok := r.menuSvc.(*admin.InMemoryMenuService); ok {
		return r.menuSvc.Menu(ctx, location, opts.Locale)
	}
	if withOpts, ok := r.menuSvc.(menuByLocationWithOptions); ok {
		return withOpts.MenuByLocationWithOptions(ctx, location, opts.Locale, opts.toSiteMenuReadOptions())
	}
	return r.menuSvc.MenuByLocation(ctx, location, opts.Locale)
}

func (r *navigationRuntime) menuByCode(ctx context.Context, code string, opts navigationReadOptions) (*admin.Menu, error) {
	if withOpts, ok := r.menuSvc.(menuByCodeWithOptions); ok {
		return withOpts.MenuByCodeWithOptions(ctx, code, opts.Locale, opts.toSiteMenuReadOptions())
	}
	return r.menuSvc.Menu(ctx, code, opts.Locale)
}

func (r *navigationRuntime) generatedFallbackMenu(ctx context.Context, state RequestState, location string) *admin.Menu {
	if r == nil || !r.siteCfg.Navigation.EnableGeneratedFallback || r.contentSvc == nil {
		return nil
	}
	records, err := listSiteContents(ctx, r.contentSvc, state.Locale)
	if err != nil || len(records) == 0 {
		return nil
	}

	pageKinds := r.pageKindByContentType(ctx)
	byIdentity := map[string][]admin.CMSContent{}
	for _, record := range records {
		if !generatedFallbackEligible(record, pageKinds) {
			continue
		}
		if !publishedStatus(record.Status) && !previewAllowsRecord(record, deliveryCapability{TypeSlug: firstNonEmpty(record.ContentTypeSlug, record.ContentType)}, state) {
			continue
		}
		key := generatedContentIdentity(record)
		byIdentity[key] = append(byIdentity[key], record)
	}
	if len(byIdentity) == 0 {
		return nil
	}

	keys := make([]string, 0, len(byIdentity))
	for key := range byIdentity {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	items := make([]admin.MenuItem, 0, len(keys))
	for index, key := range keys {
		selected := pickGeneratedLocaleRecord(byIdentity[key], state)
		if strings.TrimSpace(selected.ID) == "" {
			continue
		}
		if !generatedRecordVisibleForLocation(selected, location) {
			continue
		}
		href := generatedFallbackRecordPath(selected)
		if href == "" {
			continue
		}
		label := generatedFallbackRecordLabel(selected, href)
		itemID := generatedFallbackItemID(r.siteCfg.Navigation.FallbackMenuCode, href, index)
		items = append(items, admin.MenuItem{
			ID:    itemID,
			Code:  itemID,
			Type:  "item",
			Label: label,
			Target: map[string]any{
				"type":                "content",
				"key":                 href,
				"url":                 href,
				"active_match":        "prefix",
				"origin":              "generated_fallback",
				"contribution":        true,
				"contribution_origin": "generated_fallback",
			},
		})
	}
	if len(items) == 0 {
		return nil
	}
	return &admin.Menu{
		Code:     strings.TrimSpace(r.siteCfg.Navigation.FallbackMenuCode),
		Location: strings.TrimSpace(location),
		Items:    items,
	}
}

func (r *navigationRuntime) pageKindByContentType(ctx context.Context) map[string]bool {
	if r == nil || r.contentType == nil {
		return nil
	}
	types, err := r.contentType.ContentTypes(ctx)
	if err != nil || len(types) == 0 {
		return nil
	}
	out := map[string]bool{}
	for _, contentType := range types {
		capability, ok := capabilityFromContentType(contentType)
		if !ok {
			continue
		}
		if capability.normalizedKind() == "page" {
			out[singularTypeSlug(capability.TypeSlug)] = true
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func generatedFallbackEligible(record admin.CMSContent, pageKinds map[string]bool) bool {
	typeSlug := singularTypeSlug(firstNonEmpty(record.ContentTypeSlug, record.ContentType))
	if typeSlug == "page" {
		return true
	}
	if len(pageKinds) == 0 {
		return false
	}
	return pageKinds[typeSlug]
}

func generatedContentIdentity(record admin.CMSContent) string {
	group := strings.TrimSpace(record.TranslationGroupID)
	if group == "" && record.Data != nil {
		group = strings.TrimSpace(anyString(record.Data["translation_group_id"]))
	}
	if group != "" {
		return strings.ToLower(group)
	}
	if slug := strings.TrimSpace(record.Slug); slug != "" {
		return strings.ToLower(firstNonEmpty(record.ContentTypeSlug, record.ContentType) + ":" + slug)
	}
	return strings.ToLower(firstNonEmpty(record.ContentTypeSlug, record.ContentType) + ":" + strings.TrimSpace(record.ID))
}

func pickGeneratedLocaleRecord(group []admin.CMSContent, state RequestState) admin.CMSContent {
	if len(group) == 0 {
		return admin.CMSContent{}
	}
	requestedLocale := normalizeRequestedLocale(state.Locale, state.DefaultLocale, state.SupportedLocales)
	if requested := filterByLocale(group, requestedLocale); len(requested) > 0 {
		return requested[0]
	}
	if state.AllowLocaleFallback {
		defaultLocale := normalizeRequestedLocale(state.DefaultLocale, requestedLocale, state.SupportedLocales)
		if preferred := filterByLocale(group, defaultLocale); len(preferred) > 0 {
			return preferred[0]
		}
	}
	for _, record := range group {
		if publishedStatus(record.Status) {
			return record
		}
	}
	return group[0]
}

func generatedFallbackRecordPath(record admin.CMSContent) string {
	if record.Data != nil {
		for _, key := range []string{"path", "url", "href"} {
			if raw := strings.TrimSpace(anyString(record.Data[key])); raw != "" {
				return normalizeNavigationPath(raw)
			}
		}
	}
	if slug := strings.TrimSpace(record.Slug); slug != "" {
		return normalizeNavigationPath("/" + slug)
	}
	return ""
}

func generatedFallbackRecordLabel(record admin.CMSContent, href string) string {
	if title := strings.TrimSpace(record.Title); title != "" {
		return title
	}
	if record.Data != nil {
		for _, key := range []string{"title", "name", "label"} {
			if raw := strings.TrimSpace(anyString(record.Data[key])); raw != "" {
				return raw
			}
		}
	}
	if slug := strings.TrimSpace(record.Slug); slug != "" {
		return slug
	}
	if href == "/" {
		return "Home"
	}
	return strings.Trim(strings.TrimSpace(href), "/")
}

func generatedFallbackItemID(menuCode, href string, index int) string {
	candidate := strings.Trim(strings.ToLower(href), "/")
	if candidate == "" {
		candidate = "home"
	}
	candidate = strings.NewReplacer("/", ".", "-", "_", " ", "_").Replace(candidate)
	menuCode = strings.TrimSpace(menuCode)
	menuCode = strings.NewReplacer("-", "_", " ", "_").Replace(menuCode)
	if menuCode == "" {
		menuCode = "site_generated"
	}
	return fmt.Sprintf("%s.%s_%d", menuCode, candidate, index+1)
}

func generatedRecordVisibleForLocation(record admin.CMSContent, location string) bool {
	location = strings.TrimSpace(location)
	if location == "" {
		return true
	}

	effective := navigationVisibilityBoolMap(record.Data["effective_navigation_visibility"])
	if value, ok := effective[location]; ok {
		return value
	}

	override := navigationVisibilityStringMap(record.Navigation)
	for key, value := range navigationVisibilityStringMap(anyMap(record.Data["_navigation"])) {
		if _, exists := override[key]; !exists {
			override[key] = value
		}
	}
	if value, ok := override[location]; ok {
		switch value {
		case "show":
			return true
		case "hide":
			return false
		}
	}

	effectiveLocations := normalizedStringSet(record.EffectiveMenuLocations)
	for _, candidate := range stringSliceFromAny(record.Data["effective_menu_locations"]) {
		effectiveLocations[candidate] = struct{}{}
	}
	if len(effectiveLocations) > 0 {
		_, ok := effectiveLocations[location]
		return ok
	}
	return true
}

func navigationVisibilityStringMap(raw any) map[string]string {
	out := map[string]string{}
	switch typed := raw.(type) {
	case map[string]string:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			value = strings.ToLower(strings.TrimSpace(value))
			if key == "" || value == "" {
				continue
			}
			out[key] = value
		}
	case map[string]any:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			text := strings.ToLower(strings.TrimSpace(anyString(value)))
			if text == "" {
				continue
			}
			out[key] = text
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func navigationVisibilityBoolMap(raw any) map[string]bool {
	out := map[string]bool{}
	switch typed := raw.(type) {
	case map[string]bool:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			out[key] = value
		}
	case map[string]any:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			switch v := value.(type) {
			case bool:
				out[key] = v
			case string:
				v = strings.ToLower(strings.TrimSpace(v))
				switch v {
				case "1", "true", "yes", "on", "show":
					out[key] = true
				case "0", "false", "no", "off", "hide":
					out[key] = false
				}
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func stringSliceFromAny(raw any) []string {
	switch typed := raw.(type) {
	case []string:
		return normalizeStringSlice(typed)
	case []any:
		out := make([]string, 0, len(typed))
		for _, value := range typed {
			text := strings.TrimSpace(anyString(value))
			if text == "" {
				continue
			}
			out = append(out, text)
		}
		return normalizeStringSlice(out)
	default:
		return nil
	}
}

func normalizeStringSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizedStringSet(values []string) map[string]struct{} {
	if len(values) == 0 {
		return nil
	}
	out := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out[value] = struct{}{}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (r *navigationRuntime) filterMenuItems(ctx context.Context, items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	lastWasSeparator := false
	for _, item := range items {
		if !r.isAuthorized(ctx, item.Permissions) {
			continue
		}
		filteredChildren := r.filterMenuItems(ctx, item.Children)
		item.Children = filteredChildren
		itemType := normalizeMenuItemType(item.Type)

		if itemType == "group" && len(item.Children) == 0 {
			continue
		}
		if (item.Collapsible || targetBool(item.Target, "collapsible")) && len(item.Children) == 0 {
			continue
		}
		if itemType == "separator" {
			if len(out) == 0 || lastWasSeparator {
				continue
			}
			lastWasSeparator = true
			out = append(out, item)
			continue
		}

		lastWasSeparator = false
		out = append(out, item)
	}
	for len(out) > 0 && normalizeMenuItemType(out[len(out)-1].Type) == "separator" {
		out = out[:len(out)-1]
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (r *navigationRuntime) isAuthorized(ctx context.Context, permissions []string) bool {
	if len(permissions) == 0 || r.authorizer == nil {
		return true
	}
	return admin.CanAny(r.authorizer, ctx, "navigation", permissions...)
}

func (r *navigationRuntime) projectMenuItems(items []admin.MenuItem, activePath, dedupPolicy string, debugMode bool) []map[string]any {
	if len(items) == 0 {
		return nil
	}

	ordered := orderMenuItemsDeterministic(items)
	deduped := dedupeMenuItems(ordered, dedupPolicy)

	out := make([]map[string]any, 0, len(deduped))
	for _, item := range deduped {
		projected := r.projectMenuItem(item, activePath, dedupPolicy, debugMode)
		if projected == nil {
			continue
		}
		out = append(out, projected)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (r *navigationRuntime) projectMenuItem(item admin.MenuItem, activePath, dedupPolicy string, debugMode bool) map[string]any {
	itemType := normalizeMenuItemType(item.Type)
	target := cloneAnyMap(item.Target)
	href := resolveMenuItemHref(item, target)
	key := resolveMenuItemKey(item, href, target)

	children := r.projectMenuItems(item.Children, activePath, dedupPolicy, debugMode)

	activeMatch := normalizeActiveMatch(strings.TrimSpace(anyString(target["active_match"])))
	pattern := strings.TrimSpace(anyString(target["active_pattern"]))
	activeSelf := menuItemActive(normalizeNavigationPath(activePath), href, activeMatch, pattern)
	childActive := anyProjectedChildActive(children)
	active := activeSelf || childActive

	contribution, contributionOrigin := contributionInfoFromTarget(target)
	origin := strings.TrimSpace(anyString(target["origin"]))
	if origin == "" {
		if contribution {
			origin = primitivesFirstNonEmpty(contributionOrigin, "contribution")
		} else {
			origin = "manual"
		}
	}

	out := map[string]any{
		"id":                  strings.TrimSpace(item.ID),
		"code":                strings.TrimSpace(item.Code),
		"key":                 key,
		"type":                itemType,
		"label":               strings.TrimSpace(item.Label),
		"group_title":         strings.TrimSpace(item.GroupTitle),
		"href":                href,
		"active":              active,
		"active_self":         activeSelf,
		"active_ancestor":     childActive,
		"active_match":        activeMatch,
		"contribution":        contribution,
		"contribution_origin": contributionOrigin,
		"origin":              origin,
		"target":              target,
		"permissions":         append([]string{}, item.Permissions...),
		"classes":             append([]string{}, item.Classes...),
		"styles":              cloneStringMap(item.Styles),
		"collapsible":         item.Collapsible,
		"collapsed":           item.Collapsed,
	}
	if item.Position != nil {
		out["position"] = *item.Position
	}
	if item.Icon != "" {
		out["icon"] = strings.TrimSpace(item.Icon)
	}
	if item.Badge != nil {
		out["badge"] = cloneAnyMap(item.Badge)
	}
	if len(children) > 0 {
		out["children"] = children
	}
	if debugMode {
		out["debug"] = map[string]any{
			"id":                  strings.TrimSpace(item.ID),
			"code":                strings.TrimSpace(item.Code),
			"source":              origin,
			"contribution":        contribution,
			"contribution_origin": contributionOrigin,
			"permissions":         append([]string{}, item.Permissions...),
		}
	}
	return out
}

func dedupeMenuItems(items []admin.MenuItem, policy string) []admin.MenuItem {
	policy = normalizeDedupPolicy(policy)
	if policy == "" || policy == menuDedupNone || len(items) <= 1 {
		return items
	}
	seen := map[string]struct{}{}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		key := dedupeKeyForMenuItem(item, policy)
		if key == "" {
			out = append(out, item)
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, item)
	}
	return out
}

func dedupeKeyForMenuItem(item admin.MenuItem, policy string) string {
	target := item.Target
	switch policy {
	case menuDedupByTarget:
		for _, key := range []string{"key", "id", "content_id", "page_id", "slug", "name"} {
			if value := strings.TrimSpace(anyString(target[key])); value != "" {
				return strings.ToLower("target:" + value)
			}
		}
		if itemID := strings.TrimSpace(item.ID); itemID != "" {
			return strings.ToLower("target:" + itemID)
		}
		fallthrough
	case menuDedupByURL:
		if href := resolveMenuItemHref(item, target); href != "" {
			return strings.ToLower("url:" + href)
		}
	}
	return ""
}

func orderMenuItemsDeterministic(items []admin.MenuItem) []admin.MenuItem {
	if len(items) <= 1 {
		return append([]admin.MenuItem{}, items...)
	}
	type orderedItem struct {
		index int
		item  admin.MenuItem
	}
	out := make([]orderedItem, 0, len(items))
	for index, item := range items {
		out = append(out, orderedItem{index: index, item: item})
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := out[i].item
		right := out[j].item

		leftPos := menuItemPosition(left)
		rightPos := menuItemPosition(right)
		if leftPos != rightPos {
			return leftPos < rightPos
		}

		leftKey := resolveMenuItemKey(left, resolveMenuItemHref(left, left.Target), left.Target)
		rightKey := resolveMenuItemKey(right, resolveMenuItemHref(right, right.Target), right.Target)
		if leftKey != rightKey {
			return leftKey < rightKey
		}
		return out[i].index < out[j].index
	})

	projected := make([]admin.MenuItem, 0, len(out))
	for _, item := range out {
		projected = append(projected, item.item)
	}
	return projected
}

func menuItemPosition(item admin.MenuItem) int {
	if item.Position == nil {
		return int(^uint(0) >> 1)
	}
	return *item.Position
}

func resolveMenuItemHref(item admin.MenuItem, target map[string]any) string {
	for _, key := range []string{"url", "href", "path"} {
		if value := strings.TrimSpace(anyString(target[key])); value != "" {
			return normalizeNavigationPath(value)
		}
	}
	if slug := strings.TrimSpace(anyString(target["slug"])); slug != "" {
		contentType := singularTypeSlug(anyString(target["content_type_slug"]))
		if contentType == "page" {
			return normalizeNavigationPath("/" + slug)
		}
		if contentType != "" {
			return normalizeNavigationPath("/" + contentType + "/" + slug)
		}
		return normalizeNavigationPath("/" + slug)
	}
	if strings.EqualFold(normalizeMenuItemType(item.Type), "separator") {
		return ""
	}
	return normalizeNavigationPath("/")
}

func resolveMenuItemKey(item admin.MenuItem, href string, target map[string]any) string {
	if value := strings.TrimSpace(anyString(target["key"])); value != "" {
		return strings.ToLower(value)
	}
	if value := strings.TrimSpace(item.ID); value != "" {
		return strings.ToLower(value)
	}
	if value := strings.TrimSpace(item.Code); value != "" {
		return strings.ToLower(value)
	}
	if href != "" {
		return strings.ToLower(strings.Trim(href, "/"))
	}
	if value := strings.TrimSpace(item.Label); value != "" {
		return strings.ToLower(strings.ReplaceAll(value, " ", "_"))
	}
	return ""
}

func contributionInfoFromTarget(target map[string]any) (bool, string) {
	if len(target) == 0 {
		return false, ""
	}
	origin := strings.TrimSpace(primitivesFirstNonEmpty(
		anyString(target["contribution_origin"]),
		anyString(target["origin"]),
	))
	contribution := targetBool(target, "contribution")
	if !contribution {
		if meta := anyMap(target["metadata"]); len(meta) > 0 {
			contribution = strings.TrimSpace(anyString(meta["contribution"])) != ""
			if origin == "" {
				origin = strings.TrimSpace(anyString(meta["contribution_origin"]))
			}
		}
	}
	if origin != "" && !contribution {
		contribution = strings.Contains(strings.ToLower(origin), "contribution") || strings.Contains(strings.ToLower(origin), "override")
	}
	return contribution, origin
}

func (r *navigationRuntime) enforceContributionLocalePolicy(ctx context.Context, items []admin.MenuItem, locale, policy string) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	if r == nil || r.contentSvc == nil || normalizeContributionLocalePolicy(policy) != ContributionLocalePolicyStrict {
		return items
	}
	locale = strings.ToLower(strings.TrimSpace(locale))
	if locale == "" {
		return items
	}
	cache := map[string]bool{}
	filtered := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		item.Children = r.enforceContributionLocalePolicy(ctx, item.Children, locale, policy)
		if !menuItemMatchesRequestedLocale(ctx, r.contentSvc, item, locale, cache) {
			continue
		}
		filtered = append(filtered, item)
	}
	if len(filtered) == 0 {
		return nil
	}
	return filtered
}

func menuItemMatchesRequestedLocale(ctx context.Context, contentSvc admin.CMSContentService, item admin.MenuItem, locale string, cache map[string]bool) bool {
	target := item.Target
	if len(target) == 0 {
		return true
	}
	targetType := strings.ToLower(strings.TrimSpace(anyString(target["type"])))
	if targetType != "content" {
		return true
	}
	contentID := strings.TrimSpace(anyString(target["content_id"]))
	if contentID == "" {
		return true
	}
	if cached, ok := cache[contentID]; ok {
		return cached
	}
	record, err := contentSvc.Content(ctx, contentID, locale)
	if err != nil || record == nil {
		cache[contentID] = false
		return false
	}
	resolvedLocale := strings.ToLower(strings.TrimSpace(primitivesFirstNonEmpty(
		record.ResolvedLocale,
		record.Locale,
		anyString(record.Data["resolved_locale"]),
		anyString(record.Data["locale"]),
	)))
	missingRequested := record.MissingRequestedLocale || targetBool(record.Data, "missing_requested_locale")
	match := resolvedLocale == locale && !missingRequested
	cache[contentID] = match
	return match
}

func normalizeMenuItemType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "group":
		return "group"
	case "separator":
		return "separator"
	default:
		return "item"
	}
}

func normalizeDedupPolicy(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case menuDedupByTarget:
		return menuDedupByTarget
	case menuDedupNone:
		return menuDedupNone
	default:
		return menuDedupByURL
	}
}

func previewEntityAllowsMenuDrafts(raw string) bool {
	entityType := strings.ToLower(strings.TrimSpace(raw))
	if entityType == "" {
		return false
	}
	switch entityType {
	case "menu", "menus", "navigation", "menu_binding", "menu_bindings", "menu_view_profile", "menu_view_profiles":
		return true
	default:
		return false
	}
}

func normalizeActiveMatch(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "prefix":
		return "prefix"
	case "pattern":
		return "pattern"
	default:
		return "exact"
	}
}

func menuItemActive(activePath, href, mode, pattern string) bool {
	if href == "" {
		return false
	}
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") || strings.HasPrefix(href, "//") {
		return false
	}
	activePath = normalizeNavigationPath(activePath)
	href = normalizeNavigationPath(href)
	mode = normalizeActiveMatch(mode)

	switch mode {
	case "prefix":
		if href == "/" {
			return activePath == "/"
		}
		return activePath == href || strings.HasPrefix(activePath, href+"/")
	case "pattern":
		pattern = strings.TrimSpace(primitivesFirstNonEmpty(pattern, href))
		if pattern == "" {
			return activePath == href
		}
		return pathMatchesPattern(activePath, pattern)
	default:
		return activePath == href
	}
}

func pathMatchesPattern(path, pattern string) bool {
	path = normalizeNavigationPath(path)
	pattern = strings.TrimSpace(pattern)
	if pattern == "" {
		return false
	}
	if strings.HasPrefix(pattern, "/") {
		pattern = normalizeNavigationPath(pattern)
	}
	if strings.Contains(pattern, "*") {
		quoted := regexp.QuoteMeta(pattern)
		quoted = strings.ReplaceAll(quoted, "\\*", ".*")
		re, err := regexp.Compile("^" + quoted + "$")
		if err == nil {
			return re.MatchString(path)
		}
	}
	if re, err := regexp.Compile(pattern); err == nil {
		return re.MatchString(path)
	}
	return normalizeNavigationPath(pattern) == path
}

func anyProjectedChildActive(children []map[string]any) bool {
	for _, child := range children {
		if targetBool(child, "active") {
			return true
		}
	}
	return false
}

func targetBool(target map[string]any, key string) bool {
	if len(target) == 0 {
		return false
	}
	raw, ok := target[key]
	if !ok {
		return false
	}
	switch value := raw.(type) {
	case bool:
		return value
	case string:
		value = strings.ToLower(strings.TrimSpace(value))
		switch value {
		case "1", "true", "yes", "on":
			return true
		}
	}
	return false
}

func cloneStringMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func normalizeNavigationPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return "/"
	}
	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") || strings.HasPrefix(path, "//") {
		return path
	}
	return normalizeLocalePath(path)
}

func queryBoolValue(c router.Context, key string, fallback bool) bool {
	if c == nil {
		return fallback
	}
	value := strings.ToLower(strings.TrimSpace(c.Query(key)))
	if value == "" {
		return fallback
	}
	switch value {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func queryValue(c router.Context, key string) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.Query(key))
}

func navigationDebugEnabled(c router.Context) bool {
	return queryBoolValue(c, "nav_debug", false) || queryBoolValue(c, "debug_navigation", false)
}

func requestContext(c router.Context) context.Context {
	if c == nil || c.Context() == nil {
		return context.Background()
	}
	return c.Context()
}

func emptyResolvedMenu(location, code, activePath string) map[string]any {
	return map[string]any{
		"location":         strings.TrimSpace(location),
		"code":             strings.TrimSpace(code),
		"source":           "empty",
		"active_path":      normalizeNavigationPath(activePath),
		"items":            []map[string]any{},
		"include_drafts":   false,
		"include_preview":  false,
		"include_debug":    false,
		"include_fallback": false,
	}
}

func toMenuItemsContract(raw any) []map[string]any {
	items, ok := raw.([]map[string]any)
	if !ok || len(items) == 0 {
		return []map[string]any{}
	}
	return items
}

func primitivesFirstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}
