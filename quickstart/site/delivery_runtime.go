package site

import (
	"context"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

const (
	defaultDeliveryListTemplate   = "site/content/list"
	defaultDeliveryDetailTemplate = "site/content/detail"
)

type deliveryCapability struct {
	TypeSlug       string             `json:"type_slug"`
	Kind           string             `json:"kind"`
	ListRoute      string             `json:"list_route"`
	DetailRoute    string             `json:"detail_route"`
	ListTemplate   string             `json:"list_template"`
	DetailTemplate string             `json:"detail_template"`
	PathPolicy     deliveryPathPolicy `json:"path_policy"`
}

type deliveryPathPolicy struct {
	AllowExternalURLs bool     `json:"allow_external_ur_ls"`
	AllowRoot         bool     `json:"allow_root"`
	AllowedPrefixes   []string `json:"allowed_prefixes"`
	allowRootSet      bool
	allowedPrefixSet  bool
}

type localeContentCache struct {
	loaded map[string]bool
	items  map[string][]admin.CMSContent
}

func (c deliveryCapability) normalizedKind() string {
	switch strings.ToLower(strings.TrimSpace(c.Kind)) {
	case "page", "collection", "detail", "hybrid":
		return strings.ToLower(strings.TrimSpace(c.Kind))
	default:
		if strings.EqualFold(c.TypeSlug, "page") || strings.EqualFold(c.TypeSlug, "pages") {
			return "page"
		}
		return "detail"
	}
}

func (c deliveryCapability) listRoutePattern() string {
	if route := normalizeLocalePath(c.ListRoute); route != "/" || strings.TrimSpace(c.ListRoute) != "" {
		return route
	}
	return normalizeLocalePath("/" + pluralTypeSlug(c.TypeSlug))
}

func (c deliveryCapability) detailRoutePattern() string {
	if route := normalizeLocalePath(c.DetailRoute); route != "/" || strings.TrimSpace(c.DetailRoute) != "" {
		return route
	}
	return normalizeLocalePath("/" + pluralTypeSlug(c.TypeSlug) + "/:slug")
}

func (c deliveryCapability) detailTemplateCandidates() []string {
	out := []string{}
	appendTemplate := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		for _, existing := range out {
			if existing == name {
				return
			}
		}
		out = append(out, name)
	}
	appendTemplate(c.DetailTemplate)
	appendTemplate("site/" + singularTypeSlug(c.TypeSlug))
	appendTemplate(defaultDeliveryDetailTemplate)
	return out
}

func (c deliveryCapability) listTemplateCandidates() []string {
	out := []string{}
	appendTemplate := func(name string) {
		name = strings.TrimSpace(name)
		if name == "" {
			return
		}
		for _, existing := range out {
			if existing == name {
				return
			}
		}
		out = append(out, name)
	}
	appendTemplate(c.ListTemplate)
	appendTemplate("site/" + pluralTypeSlug(c.TypeSlug))
	appendTemplate(defaultDeliveryListTemplate)
	return out
}

type deliveryResolution struct {
	Mode               string             `json:"mode"`
	Capability         deliveryCapability `json:"capability"`
	Record             *admin.CMSContent  `json:"record"`
	Records            []admin.CMSContent `json:"records"`
	RequestedLocale    string             `json:"requested_locale"`
	ResolvedLocale     string             `json:"resolved_locale"`
	AvailableLocales   []string           `json:"available_locales"`
	MissingRequested   bool               `json:"missing_requested"`
	FamilyID           string             `json:"family_id"`
	PathsByLocale      map[string]string  `json:"paths_by_locale"`
	TemplateCandidates []string           `json:"template_candidates"`
}

type deliveryRuntime struct {
	siteCfg        ResolvedSiteConfig
	contentSvc     admin.CMSContentService
	contentTypeSvc admin.CMSContentTypeService
	navigation     *navigationRuntime
}

func newDeliveryRuntime(
	siteCfg ResolvedSiteConfig,
	adm *admin.Admin,
	contentSvc admin.CMSContentService,
	contentTypeSvc admin.CMSContentTypeService,
) *deliveryRuntime {
	if contentSvc == nil || contentTypeSvc == nil {
		return nil
	}
	return &deliveryRuntime{
		siteCfg:        siteCfg,
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
		navigation:     newNavigationRuntime(siteCfg, adm, contentSvc, contentTypeSvc),
	}
}

func newLocaleContentCache() *localeContentCache {
	return &localeContentCache{
		loaded: map[string]bool{},
		items:  map[string][]admin.CMSContent{},
	}
}

func (r *deliveryRuntime) listSiteContentsCached(
	ctx context.Context,
	locale string,
	cache *localeContentCache,
) ([]admin.CMSContent, error) {
	if r == nil || r.contentSvc == nil {
		return nil, nil
	}
	locale = strings.ToLower(strings.TrimSpace(locale))
	if cache == nil {
		items, err := listSiteContents(ctx, r.contentSvc, locale)
		if err != nil {
			return nil, err
		}
		return cloneContentRecords(items), nil
	}
	if cache.loaded[locale] {
		return cloneContentRecords(cache.items[locale]), nil
	}
	items, err := listSiteContents(ctx, r.contentSvc, locale)
	cache.loaded[locale] = true
	if err != nil {
		return nil, err
	}
	cache.items[locale] = cloneContentRecords(items)
	return cloneContentRecords(cache.items[locale]), nil
}

func cloneContentRecords(items []admin.CMSContent) []admin.CMSContent {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.CMSContent, len(items))
	copy(out, items)
	return out
}

func (r *deliveryRuntime) Handler() router.HandlerFunc {
	if r == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		state, ok := RequestStateFromRequest(c)
		if !ok {
			state = RequestState{
				Locale:              r.siteCfg.DefaultLocale,
				DefaultLocale:       r.siteCfg.DefaultLocale,
				SupportedLocales:    cloneStrings(r.siteCfg.SupportedLocales),
				AllowLocaleFallback: r.siteCfg.AllowLocaleFallback,
				Environment:         r.siteCfg.Environment,
				ContentChannel:      r.siteCfg.ContentChannel,
				BasePath:            r.siteCfg.BasePath,
				AssetBasePath:       r.siteCfg.Views.AssetBasePath,
				ActivePath:          c.Path(),
				ViewContext:         router.ViewContext{},
			}
		}
		if strings.TrimSpace(state.ContentChannel) == "" {
			state.ContentChannel = r.siteCfg.ContentChannel
		}

		path := r.requestPathForResolution(c)
		cache := newLocaleContentCache()
		requestCtx := c.Context()
		if strings.TrimSpace(state.ContentChannel) != "" {
			requestCtx = admin.WithContentChannel(requestCtx, state.ContentChannel)
		}
		resolution, siteErr := r.resolve(requestCtx, state, path, cache)
		if hasSiteRuntimeError(siteErr) {
			return renderSiteRuntimeError(c, state, r.siteCfg, siteErr)
		}
		if resolution == nil {
			return renderSiteRuntimeError(c, state, r.siteCfg, SiteRuntimeError{
				Status:          404,
				RequestedLocale: state.Locale,
			})
		}
		return r.renderResolution(c, state, resolution, path, cache)
	}
}

func (r *deliveryRuntime) requestPathForResolution(c router.Context) string {
	path := strings.TrimSpace(c.Path())
	if routePath := strings.TrimSpace(c.Param("path", "")); routePath != "" {
		path = "/" + strings.Trim(routePath, "/")
		if rest := strings.TrimSpace(c.Param("rest", "")); rest != "" {
			path = path + "/" + strings.Trim(rest, "/")
		}
	}
	path = normalizeLocalePath(path)
	basePath := normalizeLocalePath(r.siteCfg.BasePath)
	if basePath != "/" && strings.HasPrefix(path, basePath) {
		path = normalizeLocalePath(strings.TrimPrefix(path, basePath))
	}
	if r.siteCfg.Features.EnableI18N {
		if stripped, _ := StripSupportedLocalePrefix(path, r.siteCfg.SupportedLocales); stripped != "" {
			path = stripped
		}
	}
	return normalizeLocalePath(path)
}

func (r *deliveryRuntime) resolve(ctx context.Context, state RequestState, requestPath string, cache *localeContentCache) (*deliveryResolution, SiteRuntimeError) {
	capabilities, err := r.capabilities(ctx)
	if err != nil {
		return nil, SiteRuntimeError{Status: 500, Message: err.Error()}
	}
	if len(capabilities) == 0 {
		return nil, SiteRuntimeError{}
	}
	contents, err := r.listSiteContentsCached(ctx, state.Locale, cache)
	if err != nil {
		return nil, SiteRuntimeError{Status: 500, Message: err.Error()}
	}
	recordsByType := r.recordsByType(capabilities, contents, state)

	// Page-kind resolution is always path-first.
	for _, capability := range capabilities {
		if capability.normalizedKind() != "page" {
			continue
		}
		if resolution, siteErr, matched := r.resolvePageKind(ctx, capability, recordsByType[capability.TypeSlug], state, requestPath, cache); matched {
			if siteErr.Status > 0 || strings.TrimSpace(siteErr.Code) != "" {
				return nil, siteErr
			}
			return resolution, SiteRuntimeError{}
		}
	}

	// Detail and hybrid detail are resolved before collection list routes.
	for _, capability := range capabilities {
		kind := capability.normalizedKind()
		if kind != "detail" && kind != "hybrid" {
			continue
		}
		if resolution, siteErr, matched := r.resolveDetailKind(ctx, capability, recordsByType[capability.TypeSlug], state, requestPath, cache); matched {
			if siteErr.Status > 0 || strings.TrimSpace(siteErr.Code) != "" {
				return nil, siteErr
			}
			return resolution, SiteRuntimeError{}
		}
	}

	for _, capability := range capabilities {
		kind := capability.normalizedKind()
		if kind != "collection" && kind != "hybrid" {
			continue
		}
		if resolution, matched := r.resolveCollectionKind(capability, recordsByType[capability.TypeSlug], state, requestPath); matched {
			return resolution, SiteRuntimeError{}
		}
	}

	if resolution, siteErr, matched := r.resolvePreviewFallbackByRecordID(capabilities, recordsByType, state); matched {
		if hasSiteRuntimeError(siteErr) {
			return nil, siteErr
		}
		return resolution, SiteRuntimeError{}
	}

	return nil, SiteRuntimeError{}
}

func (r *deliveryRuntime) capabilities(ctx context.Context) ([]deliveryCapability, error) {
	items, err := r.contentTypeSvc.ContentTypes(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]deliveryCapability, 0, len(items))
	for _, item := range items {
		capability, ok := capabilityFromContentType(item)
		if !ok {
			continue
		}
		out = append(out, capability)
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := strings.TrimSpace(out[i].TypeSlug)
		right := strings.TrimSpace(out[j].TypeSlug)
		if left == right {
			return out[i].normalizedKind() < out[j].normalizedKind()
		}
		return left < right
	})
	return out, nil
}

func capabilityFromContentType(contentType admin.CMSContentType) (deliveryCapability, bool) {
	slug := strings.TrimSpace(contentType.Slug)
	if slug == "" {
		slug = strings.TrimSpace(contentType.Name)
	}
	if slug == "" {
		return deliveryCapability{}, false
	}
	slug = strings.ToLower(slug)

	contracts := admin.ReadContentTypeCapabilityContracts(contentType)
	delivery := anyMap(contracts.Delivery)
	if len(delivery) == 0 {
		return deliveryCapability{}, false
	}

	enabled := true
	if raw, ok := delivery["enabled"]; ok {
		enabled = anyBool(raw)
	}
	if !enabled {
		return deliveryCapability{}, false
	}

	routes := anyMap(delivery["routes"])
	templates := anyMap(delivery["templates"])
	out := deliveryCapability{
		TypeSlug:       slug,
		Kind:           strings.ToLower(strings.TrimSpace(anyString(delivery["kind"]))),
		ListRoute:      strings.TrimSpace(anyString(routes["list"])),
		DetailRoute:    strings.TrimSpace(anyString(routes["detail"])),
		ListTemplate:   strings.TrimSpace(anyString(templates["list"])),
		DetailTemplate: strings.TrimSpace(anyString(templates["detail"])),
	}
	out.PathPolicy = deliveryPathPolicyFromContract(delivery, out)
	return out, true
}

func (r *deliveryRuntime) recordsByType(
	capabilities []deliveryCapability,
	contents []admin.CMSContent,
	state RequestState,
) map[string][]admin.CMSContent {
	out := make(map[string][]admin.CMSContent, len(capabilities))
	for _, capability := range capabilities {
		filtered := []admin.CMSContent{}
		for _, record := range contents {
			if !matchesCapabilityType(record, capability.TypeSlug) {
				continue
			}
			if !recordVisibleForRequest(record, capability, state) {
				continue
			}
			filtered = append(filtered, record)
		}
		out[capability.TypeSlug] = filtered
	}
	return out
}

func (r *deliveryRuntime) resolvePageKind(
	ctx context.Context,
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
	cache *localeContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	candidates := []admin.CMSContent{}
	for _, record := range records {
		path := recordDeliveryPath(record, capability)
		if path == "" {
			continue
		}
		if !pathsMatch(path, requestPath) {
			continue
		}
		candidates = append(candidates, record)
	}
	if len(candidates) == 0 && !r.strictLocalizedPathsEnabled() {
		candidates = r.resolvePagePathAliasCandidates(ctx, capability, records, state, requestPath, cache)
	}
	if len(candidates) == 0 {
		return nil, SiteRuntimeError{}, false
	}

	selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
	if !missing && selected.ID == "" {
		return nil, SiteRuntimeError{}, false
	}
	if missing && !r.siteCfg.AllowLocaleFallback {
		return nil, translationMissingSiteError(state.Locale, available, capability.TypeSlug, requestPath), true
	}
	resolution := resolutionFromDetailRecord(capability, selected, state.Locale, available, fallbackUsed, candidates)
	return resolution, SiteRuntimeError{}, true
}

func (r *deliveryRuntime) resolvePagePathAliasCandidates(
	ctx context.Context,
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
	cache *localeContentCache,
) []admin.CMSContent {
	if r == nil || r.contentSvc == nil || len(records) == 0 || !r.siteCfg.Features.EnableI18N {
		return nil
	}

	identityToRecord := map[string]admin.CMSContent{}
	for _, record := range records {
		key := strings.TrimSpace(contentIdentityKey(record, capability))
		if key == "" {
			continue
		}
		if _, exists := identityToRecord[key]; exists {
			continue
		}
		identityToRecord[key] = record
	}
	if len(identityToRecord) == 0 {
		return nil
	}

	matchedKeys := map[string]struct{}{}
	requestPath = normalizeLocalePath(requestPath)
	locales := uniqueLocaleOrder(
		state.SupportedLocales,
		[]string{state.Locale},
		[]string{state.DefaultLocale},
		[]string{r.siteCfg.DefaultLocale},
	)
	for _, locale := range locales {
		items, err := r.listSiteContentsCached(ctx, locale, cache)
		if err != nil || len(items) == 0 {
			continue
		}

		localeState := state
		localeState.Locale = locale
		for _, item := range items {
			if !matchesCapabilityType(item, capability.TypeSlug) {
				continue
			}
			if !recordVisibleForRequest(item, capability, localeState) {
				continue
			}
			if !pathsMatch(recordDeliveryPath(item, capability), requestPath) {
				continue
			}
			key := strings.TrimSpace(contentIdentityKey(item, capability))
			if key == "" {
				continue
			}
			if _, ok := identityToRecord[key]; !ok {
				continue
			}
			matchedKeys[key] = struct{}{}
		}
	}
	if len(matchedKeys) == 0 {
		return nil
	}

	keys := make([]string, 0, len(matchedKeys))
	for key := range matchedKeys {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]admin.CMSContent, 0, len(keys))
	for _, key := range keys {
		out = append(out, identityToRecord[key])
	}
	return out
}

func (r *deliveryRuntime) resolveDetailKind(
	ctx context.Context,
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
	cache *localeContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	params, ok := matchRoutePattern(capability.detailRoutePattern(), requestPath)
	if !ok {
		return nil, SiteRuntimeError{}, false
	}
	slug := strings.TrimSpace(params["slug"])
	candidates := []admin.CMSContent{}
	for _, record := range records {
		if slug != "" {
			if !deliverySlugMatches(record, slug, capability) {
				continue
			}
		} else {
			path := recordDeliveryPath(record, capability)
			if !pathsMatch(path, requestPath) {
				continue
			}
		}
		candidates = append(candidates, record)
	}
	if len(candidates) == 0 && !r.strictLocalizedPathsEnabled() {
		candidates = r.resolveDetailPathAliasCandidates(ctx, capability, state, requestPath, slug, cache)
	}
	if len(candidates) == 0 {
		return nil, SiteRuntimeError{}, false
	}

	selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
	if !missing && selected.ID == "" {
		return nil, SiteRuntimeError{}, false
	}
	if missing && !r.siteCfg.AllowLocaleFallback {
		return nil, translationMissingSiteError(state.Locale, available, capability.TypeSlug, firstNonEmpty(slug, requestPath)), true
	}
	resolution := resolutionFromDetailRecord(capability, selected, state.Locale, available, fallbackUsed, candidates)
	return resolution, SiteRuntimeError{}, true
}

func (r *deliveryRuntime) resolveDetailPathAliasCandidates(
	ctx context.Context,
	capability deliveryCapability,
	state RequestState,
	requestPath string,
	slug string,
	cache *localeContentCache,
) []admin.CMSContent {
	if r == nil || r.contentSvc == nil || !r.siteCfg.Features.EnableI18N {
		return nil
	}

	requestPath = normalizeLocalePath(requestPath)
	locales := uniqueLocaleOrder(
		state.SupportedLocales,
		[]string{state.Locale},
		[]string{state.DefaultLocale},
		[]string{r.siteCfg.DefaultLocale},
	)
	if len(locales) == 0 {
		return nil
	}

	matchedIdentityKeys := map[string]struct{}{}
	for _, locale := range locales {
		items, err := r.listSiteContentsCached(ctx, locale, cache)
		if err != nil || len(items) == 0 {
			continue
		}
		localeState := state
		localeState.Locale = locale
		for _, item := range items {
			if !matchesCapabilityType(item, capability.TypeSlug) {
				continue
			}
			if !recordVisibleForRequest(item, capability, localeState) {
				continue
			}
			matches := false
			if slug != "" {
				matches = deliverySlugMatches(item, slug, capability)
			} else {
				matches = pathsMatch(recordDeliveryPath(item, capability), requestPath)
			}
			if !matches {
				continue
			}
			key := strings.TrimSpace(contentIdentityKey(item, capability))
			if key == "" {
				continue
			}
			matchedIdentityKeys[key] = struct{}{}
		}
	}
	if len(matchedIdentityKeys) == 0 {
		return nil
	}

	seen := map[string]struct{}{}
	out := []admin.CMSContent{}
	for _, locale := range locales {
		items, err := r.listSiteContentsCached(ctx, locale, cache)
		if err != nil || len(items) == 0 {
			continue
		}
		localeState := state
		localeState.Locale = locale
		for _, item := range items {
			if !matchesCapabilityType(item, capability.TypeSlug) {
				continue
			}
			if !recordVisibleForRequest(item, capability, localeState) {
				continue
			}
			key := strings.TrimSpace(contentIdentityKey(item, capability))
			if _, ok := matchedIdentityKeys[key]; !ok {
				continue
			}
			uniqueKey := strings.TrimSpace(item.ID) + "|" + strings.ToLower(strings.TrimSpace(item.Locale))
			if uniqueKey == "|" {
				uniqueKey = key + "|" + strings.ToLower(strings.TrimSpace(recordDeliveryPath(item, capability)))
			}
			if _, ok := seen[uniqueKey]; ok {
				continue
			}
			seen[uniqueKey] = struct{}{}
			out = append(out, item)
		}
	}
	return out
}

func (r *deliveryRuntime) resolveCollectionKind(
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
) (*deliveryResolution, bool) {
	if _, ok := matchRoutePattern(capability.listRoutePattern(), requestPath); !ok {
		return nil, false
	}

	selected := resolveLocaleRecordsForList(records, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
	resolvedLocale := state.Locale
	available := collectAvailableLocales(records)
	if len(selected) > 0 {
		resolvedLocale = strings.TrimSpace(firstNonEmpty(selected[0].ResolvedLocale, selected[0].Locale, state.Locale))
	}
	return &deliveryResolution{
		Mode:               "collection",
		Capability:         capability,
		Records:            selected,
		RequestedLocale:    state.Locale,
		ResolvedLocale:     resolvedLocale,
		AvailableLocales:   available,
		TemplateCandidates: capability.listTemplateCandidates(),
	}, true
}

func (r *deliveryRuntime) resolvePreviewFallbackByRecordID(
	capabilities []deliveryCapability,
	recordsByType map[string][]admin.CMSContent,
	state RequestState,
) (*deliveryResolution, SiteRuntimeError, bool) {
	if !state.PreviewTokenPresent || !state.PreviewTokenValid || !state.IsPreview {
		return nil, SiteRuntimeError{}, false
	}
	previewContentID := strings.TrimSpace(state.PreviewContentID)
	if previewContentID == "" {
		return nil, SiteRuntimeError{}, false
	}

	for _, capability := range capabilities {
		records := recordsByType[capability.TypeSlug]
		candidates := make([]admin.CMSContent, 0, len(records))
		for _, record := range records {
			if strings.TrimSpace(record.ID) != previewContentID {
				continue
			}
			if !previewEntityMatchesContentType(state.PreviewEntityType, capability, record) {
				continue
			}
			candidates = append(candidates, record)
		}
		if len(candidates) == 0 {
			continue
		}

		selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
		if !missing && selected.ID == "" {
			continue
		}
		if missing && !r.siteCfg.AllowLocaleFallback {
			return nil, translationMissingSiteError(state.Locale, available, capability.TypeSlug, previewContentID), true
		}
		resolution := resolutionFromDetailRecord(capability, selected, state.Locale, available, fallbackUsed, candidates)
		return resolution, SiteRuntimeError{}, true
	}

	return nil, SiteRuntimeError{}, false
}

func resolutionFromDetailRecord(
	capability deliveryCapability,
	record admin.CMSContent,
	requestedLocale string,
	availableLocales []string,
	fallbackUsed bool,
	group []admin.CMSContent,
) *deliveryResolution {
	record = withResolvedLocaleMetadata(record, requestedLocale, availableLocales, fallbackUsed)
	recordData := record.Data
	if recordData == nil {
		recordData = map[string]any{}
	}
	resolvedLocale := strings.TrimSpace(firstNonEmpty(record.ResolvedLocale, record.Locale, requestedLocale))
	return &deliveryResolution{
		Mode:               "detail",
		Capability:         capability,
		Record:             &record,
		RequestedLocale:    strings.TrimSpace(requestedLocale),
		ResolvedLocale:     resolvedLocale,
		AvailableLocales:   availableLocales,
		MissingRequested:   fallbackUsed,
		FamilyID:           strings.TrimSpace(firstNonEmpty(record.FamilyID, anyString(recordData["family_id"]))),
		PathsByLocale:      localizedPathsFromGroup(group, capability),
		TemplateCandidates: capability.detailTemplateCandidates(),
	}
}

func resolveLocaleRecord(
	candidates []admin.CMSContent,
	state RequestState,
	capability deliveryCapability,
	allowFallback bool,
	defaultLocale string,
) (admin.CMSContent, bool, []string, bool) {
	if len(candidates) == 0 {
		return admin.CMSContent{}, false, nil, false
	}
	available := collectAvailableLocales(candidates)
	requestedLocale := normalizeRequestedLocale(state.Locale, defaultLocale, state.SupportedLocales)

	exact := filterByLocale(candidates, requestedLocale)
	if len(exact) > 0 {
		selected := pickPreferredRecord(exact, state, capability)
		return withResolvedLocaleMetadata(selected, requestedLocale, available, false), false, available, false
	}
	if !allowFallback {
		return admin.CMSContent{}, true, available, false
	}

	fallbackCandidates := candidates
	if locale := normalizeRequestedLocale(defaultLocale, requestedLocale, state.SupportedLocales); locale != "" {
		if preferred := filterByLocale(candidates, locale); len(preferred) > 0 {
			fallbackCandidates = preferred
		}
	}
	selected := pickPreferredRecord(fallbackCandidates, state, capability)
	if selected.ID == "" {
		selected = pickPreferredRecord(candidates, state, capability)
	}
	return withResolvedLocaleMetadata(selected, requestedLocale, available, true), false, available, true
}

func resolveLocaleRecordsForList(
	records []admin.CMSContent,
	state RequestState,
	capability deliveryCapability,
	allowFallback bool,
	defaultLocale string,
) []admin.CMSContent {
	if len(records) == 0 {
		return nil
	}
	groups := map[string][]admin.CMSContent{}
	for _, record := range records {
		key := contentIdentityKey(record, capability)
		groups[key] = append(groups[key], record)
	}

	keys := make([]string, 0, len(groups))
	for key := range groups {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	out := make([]admin.CMSContent, 0, len(groups))
	for _, key := range keys {
		selected, missing, available, fallbackUsed := resolveLocaleRecord(groups[key], state, capability, allowFallback, defaultLocale)
		if missing || selected.ID == "" {
			continue
		}
		selected = withResolvedLocaleMetadata(selected, state.Locale, available, fallbackUsed)
		out = append(out, selected)
	}
	sort.SliceStable(out, func(i, j int) bool {
		leftPath := recordDeliveryPath(out[i], capability)
		rightPath := recordDeliveryPath(out[j], capability)
		if leftPath == rightPath {
			return strings.TrimSpace(out[i].Title) < strings.TrimSpace(out[j].Title)
		}
		return leftPath < rightPath
	})
	return out
}

func (r *deliveryRuntime) renderResolution(c router.Context, state RequestState, resolution *deliveryResolution, requestPath string, cache *localeContentCache) error {
	if target := r.canonicalRedirectTarget(c, resolution); target != "" {
		return c.Redirect(target, http.StatusPermanentRedirect)
	}

	viewCtx := cloneViewContext(state.ViewContext)
	viewCtx["requested_locale"] = resolution.RequestedLocale
	viewCtx["resolved_locale"] = resolution.ResolvedLocale
	viewCtx["locale"] = resolution.ResolvedLocale
	viewCtx["available_locales"] = cloneStrings(resolution.AvailableLocales)
	viewCtx["content_type"] = resolution.Capability.TypeSlug
	viewCtx["content_type_slug"] = resolution.Capability.TypeSlug
	viewCtx["missing_requested_locale"] = resolution.MissingRequested

	switch strings.ToLower(strings.TrimSpace(resolution.Mode)) {
	case "collection":
		items := make([]map[string]any, 0, len(resolution.Records))
		for _, record := range resolution.Records {
			items = append(items, mapDeliveryRecord(record, resolution.Capability))
		}
		viewCtx["records"] = items
		viewCtx[pluralTypeSlug(resolution.Capability.TypeSlug)] = items
	default:
		recordMap := map[string]any{}
		if resolution.Record != nil {
			recordMap = mapDeliveryRecord(*resolution.Record, resolution.Capability)
			viewCtx["record"] = recordMap
			viewCtx[singularTypeSlug(resolution.Capability.TypeSlug)] = recordMap
			viewCtx["family_id"] = strings.TrimSpace(firstNonEmpty(
				anyString(recordMap["family_id"]),
				resolution.FamilyID,
			))
		}
	}

	if r.navigation != nil {
		menus := r.navigation.context(c, state, requestPath)
		for key, value := range menus {
			viewCtx[key] = value
		}
	}

	switcherQuery := map[string]string{}
	if token := strings.TrimSpace(state.PreviewToken); token != "" {
		switcherQuery["preview_token"] = token
	}
	pathsByLocale := resolution.PathsByLocale
	if resolution.Record != nil {
		pathsByLocale = r.resolveLocalizedPathsByLocale(
			c.Context(),
			state,
			resolution.Capability,
			*resolution.Record,
			pathsByLocale,
			cache,
		)
	}
	viewCtx["locale_switcher"] = BuildLocaleSwitcherContract(
		r.siteCfg,
		requestPath,
		resolution.RequestedLocale,
		resolution.ResolvedLocale,
		resolution.FamilyID,
		resolution.AvailableLocales,
		pathsByLocale,
		switcherQuery,
	)

	if wantsJSONResponse(c) {
		payload := map[string]any{
			"mode":     resolution.Mode,
			"template": firstTemplate(resolution.TemplateCandidates),
			"context":  viewCtx,
		}
		return c.JSON(200, payload)
	}

	for _, templateName := range resolution.TemplateCandidates {
		if strings.TrimSpace(templateName) == "" {
			continue
		}
		if err := renderSiteTemplate(c, templateName, viewCtx); err == nil {
			return nil
		}
	}
	return renderSiteRuntimeError(c, state, r.siteCfg, SiteRuntimeError{
		Status:          500,
		Message:         "no site template could render the requested view",
		RequestedLocale: resolution.RequestedLocale,
		AvailableLocales: cloneStrings(
			resolution.AvailableLocales,
		),
	})
}

func (r *deliveryRuntime) strictLocalizedPathsEnabled() bool {
	if r == nil {
		return false
	}
	return r.siteCfg.Features.EnableI18N && r.siteCfg.Features.StrictLocalizedPaths
}

func (r *deliveryRuntime) canonicalRedirectTarget(c router.Context, resolution *deliveryResolution) string {
	if r == nil || c == nil || resolution == nil || resolution.Record == nil {
		return ""
	}
	if !r.siteCfg.Features.EnableCanonicalRedirect || wantsJSONResponse(c) {
		return ""
	}
	method := strings.ToUpper(strings.TrimSpace(c.Method()))
	if method != http.MethodGet && method != http.MethodHead {
		return ""
	}
	canonical := recordDeliveryPath(*resolution.Record, resolution.Capability)
	if canonical == "" {
		return ""
	}
	resolvedLocale := normalizeRequestedLocale(
		r.canonicalRedirectLocale(resolution),
		firstNonEmpty(resolution.RequestedLocale, r.siteCfg.DefaultLocale),
		r.siteCfg.SupportedLocales,
	)
	publicPath := canonical
	if r.siteCfg.Features.EnableI18N {
		publicPath = LocalizedPath(publicPath, resolvedLocale, r.siteCfg.DefaultLocale, r.siteCfg.LocalePrefixMode)
	}
	publicPath = normalizeLocalePath(admin.PrefixBasePath(r.siteCfg.BasePath, publicPath))
	if publicPath == "" {
		return ""
	}
	currentPath := normalizeLocalePath(c.Path())
	if currentPath == publicPath {
		return ""
	}
	if query := encodeRequestQuery(c); query != "" {
		return publicPath + "?" + query
	}
	return publicPath
}

func (r *deliveryRuntime) canonicalRedirectLocale(resolution *deliveryResolution) string {
	if resolution == nil {
		return ""
	}
	switch r.siteCfg.Features.CanonicalRedirectMode {
	case CanonicalRedirectRequestedLocaleSticky:
		if resolution.MissingRequested {
			return resolution.RequestedLocale
		}
	}
	return resolution.ResolvedLocale
}

func encodeRequestQuery(c router.Context) string {
	if c == nil {
		return ""
	}
	values := url.Values{}
	keys := make([]string, 0, len(c.Queries()))
	for key := range c.Queries() {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		added := false
		func() {
			defer func() { _ = recover() }()
			for _, value := range c.QueryValues(key) {
				values.Add(key, value)
				added = true
			}
		}()
		if !added {
			if value := strings.TrimSpace(c.Query(key)); value != "" {
				values.Add(key, value)
			}
		}
	}
	return values.Encode()
}

func translationMissingSiteError(requestedLocale string, availableLocales []string, contentType, slugOrPath string) SiteRuntimeError {
	return SiteRuntimeError{
		Code:             siteErrorCodeTranslationMissing,
		Status:           404,
		Message:          "translation missing",
		RequestedLocale:  strings.TrimSpace(requestedLocale),
		AvailableLocales: cloneStrings(availableLocales),
		ContentType:      strings.TrimSpace(contentType),
		SlugOrPath:       strings.TrimSpace(slugOrPath),
	}
}

func hasSiteRuntimeError(err SiteRuntimeError) bool {
	return err.Status > 0 || strings.TrimSpace(err.Code) != "" || strings.TrimSpace(err.Message) != ""
}

func wantsJSONResponse(c router.Context) bool {
	if c == nil {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(c.Query("format")), "json") {
		return true
	}
	accept := strings.ToLower(strings.TrimSpace(c.Header("Accept")))
	return strings.Contains(accept, "application/json")
}

func firstTemplate(candidates []string) string {
	for _, item := range candidates {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func matchRoutePattern(pattern, requestPath string) (map[string]string, bool) {
	pattern = normalizeLocalePath(pattern)
	requestPath = normalizeLocalePath(requestPath)
	if pattern == "/" && requestPath == "/" {
		return map[string]string{}, true
	}
	patternSegments := splitPathSegments(pattern)
	requestSegments := splitPathSegments(requestPath)
	if len(patternSegments) != len(requestSegments) {
		return nil, false
	}
	params := map[string]string{}
	for i, segment := range patternSegments {
		value := requestSegments[i]
		if strings.HasPrefix(segment, ":") {
			key := strings.TrimPrefix(segment, ":")
			if key == "" {
				return nil, false
			}
			params[key] = value
			continue
		}
		if !strings.EqualFold(segment, value) {
			return nil, false
		}
	}
	return params, true
}

func splitPathSegments(path string) []string {
	path = normalizeLocalePath(path)
	if path == "/" {
		return nil
	}
	trimmed := strings.Trim(path, "/")
	if trimmed == "" {
		return nil
	}
	return strings.Split(trimmed, "/")
}

func pathsMatch(left, right string) bool {
	return normalizeLocalePath(left) == normalizeLocalePath(right)
}

func matchesCapabilityType(record admin.CMSContent, typeSlug string) bool {
	target := strings.ToLower(strings.TrimSpace(typeSlug))
	if target == "" {
		return false
	}
	candidates := []string{
		record.ContentTypeSlug,
		record.ContentType,
	}
	for _, candidate := range candidates {
		candidate = strings.ToLower(strings.TrimSpace(candidate))
		if candidate == "" {
			continue
		}
		if candidate == target {
			return true
		}
		if singularTypeSlug(candidate) == singularTypeSlug(target) {
			return true
		}
	}
	return false
}

func recordVisibleForRequest(record admin.CMSContent, capability deliveryCapability, state RequestState) bool {
	if publishedStatus(record.Status) {
		return true
	}
	return previewAllowsRecord(record, capability, state)
}

func publishedStatus(status string) bool {
	return strings.EqualFold(strings.TrimSpace(status), "published")
}

func previewAllowsRecord(record admin.CMSContent, capability deliveryCapability, state RequestState) bool {
	if !state.PreviewTokenPresent || !state.PreviewTokenValid || !state.IsPreview {
		return false
	}
	if strings.TrimSpace(state.PreviewContentID) == "" || strings.TrimSpace(record.ID) == "" {
		return false
	}
	if strings.TrimSpace(state.PreviewContentID) != strings.TrimSpace(record.ID) {
		return false
	}
	return previewEntityMatchesContentType(state.PreviewEntityType, capability, record)
}

func previewEntityMatchesContentType(entityType string, capability deliveryCapability, record admin.CMSContent) bool {
	entityType = strings.ToLower(strings.TrimSpace(entityType))
	if entityType == "" {
		return false
	}
	tokenCandidates := []string{
		entityType,
		singularTypeSlug(entityType),
		pluralTypeSlug(entityType),
	}
	targetCandidates := []string{
		capability.TypeSlug,
		singularTypeSlug(record.ContentTypeSlug),
		pluralTypeSlug(record.ContentTypeSlug),
		singularTypeSlug(record.ContentType),
		pluralTypeSlug(record.ContentType),
	}
	for _, tokenCandidate := range tokenCandidates {
		tokenCandidate = singularTypeSlug(tokenCandidate)
		for _, targetCandidate := range targetCandidates {
			if tokenCandidate == singularTypeSlug(targetCandidate) {
				return true
			}
		}
	}
	return false
}

func filterByLocale(records []admin.CMSContent, locale string) []admin.CMSContent {
	locale = strings.ToLower(strings.TrimSpace(locale))
	if locale == "" {
		return records
	}
	out := make([]admin.CMSContent, 0, len(records))
	for _, record := range records {
		recordLocale := strings.ToLower(strings.TrimSpace(firstNonEmpty(record.ResolvedLocale, record.Locale)))
		if recordLocale == locale {
			out = append(out, record)
		}
	}
	return out
}

func pickPreferredRecord(records []admin.CMSContent, state RequestState, capability deliveryCapability) admin.CMSContent {
	if len(records) == 0 {
		return admin.CMSContent{}
	}
	if state.PreviewTokenValid {
		for _, record := range records {
			if strings.TrimSpace(record.ID) == strings.TrimSpace(state.PreviewContentID) &&
				previewEntityMatchesContentType(state.PreviewEntityType, capability, record) {
				return record
			}
		}
	}
	for _, record := range records {
		if publishedStatus(record.Status) {
			return record
		}
	}
	sort.SliceStable(records, func(i, j int) bool {
		return strings.TrimSpace(records[i].ID) < strings.TrimSpace(records[j].ID)
	})
	return records[0]
}

func collectAvailableLocales(records []admin.CMSContent) []string {
	values := map[string]struct{}{}
	for _, record := range records {
		for _, locale := range append([]string{record.Locale, record.ResolvedLocale}, record.AvailableLocales...) {
			locale = strings.ToLower(strings.TrimSpace(locale))
			if locale == "" {
				continue
			}
			values[locale] = struct{}{}
		}
	}
	return mapKeysSorted(values)
}

func withResolvedLocaleMetadata(
	record admin.CMSContent,
	requestedLocale string,
	availableLocales []string,
	missingRequestedLocale bool,
) admin.CMSContent {
	record.RequestedLocale = strings.TrimSpace(requestedLocale)
	if record.RequestedLocale == "" {
		record.RequestedLocale = strings.TrimSpace(record.Locale)
	}
	record.ResolvedLocale = strings.TrimSpace(firstNonEmpty(record.ResolvedLocale, record.Locale, record.RequestedLocale))
	record.AvailableLocales = cloneStrings(availableLocales)
	record.MissingRequestedLocale = missingRequestedLocale
	return record
}

func mapDeliveryRecord(record admin.CMSContent, capability deliveryCapability) map[string]any {
	data := cloneAnyMap(record.Data)
	path := recordDeliveryPath(record, capability)
	translationGroupID := strings.TrimSpace(firstNonEmpty(record.FamilyID, anyString(data["family_id"])))
	out := map[string]any{
		"id":                       strings.TrimSpace(record.ID),
		"title":                    strings.TrimSpace(record.Title),
		"slug":                     strings.TrimSpace(record.Slug),
		"path":                     path,
		"status":                   strings.TrimSpace(record.Status),
		"locale":                   strings.TrimSpace(record.Locale),
		"requested_locale":         strings.TrimSpace(record.RequestedLocale),
		"resolved_locale":          strings.TrimSpace(record.ResolvedLocale),
		"available_locales":        cloneStrings(record.AvailableLocales),
		"family_id":                translationGroupID,
		"missing_requested_locale": record.MissingRequestedLocale,
		"content_type":             strings.TrimSpace(firstNonEmpty(record.ContentType, capability.TypeSlug)),
		"content_type_slug":        strings.TrimSpace(firstNonEmpty(record.ContentTypeSlug, capability.TypeSlug)),
		"data":                     data,
	}
	if summary := strings.TrimSpace(firstNonEmpty(anyString(data["summary"]), anyString(data["excerpt"]))); summary != "" {
		out["summary"] = summary
	}
	if content := strings.TrimSpace(firstNonEmpty(anyString(data["content"]), anyString(data["body"]))); content != "" {
		out["content"] = content
	}
	if metaTitle := strings.TrimSpace(anyString(data["meta_title"])); metaTitle != "" {
		out["meta_title"] = metaTitle
	}
	if metaDescription := strings.TrimSpace(anyString(data["meta_description"])); metaDescription != "" {
		out["meta_description"] = metaDescription
	}
	if previewURL := strings.TrimSpace(anyString(data["preview_url"])); previewURL != "" {
		out["preview_url"] = previewURL
	}
	return out
}

func recordDeliveryPath(record admin.CMSContent, capability deliveryCapability) string {
	policy := effectiveDeliveryPathPolicy(capability)
	if value := strings.TrimSpace(admin.ResolveContentPath(record, "")); value != "" {
		if sanitized := sanitizeDeliveryPath(value, policy); sanitized != "" {
			return sanitized
		}
	}
	generated := generatedDeliveryPath(record, capability)
	if generated == "" {
		return ""
	}
	return sanitizeDeliveryPath(generated, policy)
}

func generatedDeliveryPath(record admin.CMSContent, capability deliveryCapability) string {
	slug := strings.Trim(strings.TrimSpace(record.Slug), "/")
	if slug == "" {
		return "/"
	}
	switch capability.normalizedKind() {
	case "page":
		return "/" + slug
	case "collection":
		return capability.listRoutePattern()
	default:
		pattern := capability.detailRoutePattern()
		if strings.Contains(pattern, ":slug") {
			return strings.Replace(pattern, ":slug", slug, 1)
		}
		return "/" + pluralTypeSlug(capability.TypeSlug) + "/" + slug
	}
}

func deliverySlugMatches(record admin.CMSContent, slug string, capability deliveryCapability) bool {
	slug = strings.Trim(strings.ToLower(strings.TrimSpace(slug)), "/")
	if slug == "" {
		return false
	}
	if strings.Trim(strings.ToLower(strings.TrimSpace(record.Slug)), "/") == slug {
		return true
	}
	path := strings.Trim(strings.ToLower(strings.TrimSpace(recordDeliveryPath(record, capability))), "/")
	if path == slug {
		return true
	}
	return false
}

func contentIdentityKey(record admin.CMSContent, capability deliveryCapability) string {
	recordData := record.Data
	if recordData == nil {
		recordData = map[string]any{}
	}
	if groupID := strings.TrimSpace(firstNonEmpty(record.FamilyID, anyString(recordData["family_id"]))); groupID != "" {
		return strings.ToLower(groupID)
	}
	if slug := strings.TrimSpace(record.Slug); slug != "" {
		return strings.ToLower(singularTypeSlug(capability.TypeSlug) + ":" + slug)
	}
	path := recordDeliveryPath(record, capability)
	if path != "" {
		return strings.ToLower(singularTypeSlug(capability.TypeSlug) + ":" + path)
	}
	return strings.ToLower(singularTypeSlug(capability.TypeSlug) + ":" + strings.TrimSpace(record.ID))
}

func localizedPathsFromGroup(group []admin.CMSContent, capability deliveryCapability) map[string]string {
	if len(group) == 0 {
		return nil
	}
	byLocale := map[string]string{}
	for _, record := range group {
		locale := strings.ToLower(strings.TrimSpace(firstNonEmpty(record.Locale, record.ResolvedLocale)))
		if locale == "" {
			continue
		}
		if _, exists := byLocale[locale]; exists {
			continue
		}
		path := recordDeliveryPath(record, capability)
		if path == "" {
			continue
		}
		byLocale[locale] = path
	}
	if len(byLocale) == 0 {
		return nil
	}
	return byLocale
}

func (r *deliveryRuntime) resolveLocalizedPathsByLocale(
	ctx context.Context,
	state RequestState,
	capability deliveryCapability,
	record admin.CMSContent,
	existing map[string]string,
	cache *localeContentCache,
) map[string]string {
	out := cloneLocalizedPaths(existing)
	if r == nil || r.contentSvc == nil {
		if len(out) == 0 {
			return nil
		}
		return out
	}

	key := contentIdentityKey(record, capability)
	if strings.TrimSpace(key) == "" {
		if len(out) == 0 {
			return nil
		}
		return out
	}

	for _, locale := range uniqueLocaleOrder(
		state.SupportedLocales,
		[]string{state.Locale},
		[]string{state.DefaultLocale},
		record.AvailableLocales,
	) {
		if locale == "" {
			continue
		}
		if _, exists := out[locale]; exists {
			continue
		}
		items, err := r.listSiteContentsCached(ctx, locale, cache)
		if err != nil || len(items) == 0 {
			continue
		}

		localeState := state
		localeState.Locale = locale
		for _, candidate := range items {
			if !matchesCapabilityType(candidate, capability.TypeSlug) {
				continue
			}
			if !recordVisibleForRequest(candidate, capability, localeState) {
				continue
			}
			if !strings.EqualFold(contentIdentityKey(candidate, capability), key) {
				continue
			}
			path := recordDeliveryPath(candidate, capability)
			if path == "" {
				break
			}
			out[locale] = normalizeLocalePath(path)
			break
		}
	}

	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneLocalizedPaths(input map[string]string) map[string]string {
	if len(input) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(input))
	for key, value := range input {
		key = strings.ToLower(strings.TrimSpace(key))
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		out[key] = normalizeLocalePath(value)
	}
	if len(out) == 0 {
		return map[string]string{}
	}
	return out
}

func uniqueLocaleOrder(groups ...[]string) []string {
	if len(groups) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, group := range groups {
		for _, locale := range group {
			locale = strings.ToLower(strings.TrimSpace(locale))
			if locale == "" {
				continue
			}
			if _, ok := seen[locale]; ok {
				continue
			}
			seen[locale] = struct{}{}
			out = append(out, locale)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func singularTypeSlug(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.Trim(value, "/")
	if value == "" {
		return "content"
	}
	if strings.HasSuffix(value, "ies") && len(value) > 3 {
		return strings.TrimSuffix(value, "ies") + "y"
	}
	if strings.HasSuffix(value, "s") && !strings.HasSuffix(value, "ss") {
		return strings.TrimSuffix(value, "s")
	}
	return value
}

func pluralTypeSlug(value string) string {
	value = singularTypeSlug(value)
	if strings.HasSuffix(value, "y") && len(value) > 1 {
		return strings.TrimSuffix(value, "y") + "ies"
	}
	if strings.HasSuffix(value, "s") {
		return value
	}
	return value + "s"
}

func deliveryPathPolicyFromContract(delivery map[string]any, capability deliveryCapability) deliveryPathPolicy {
	policy := deliveryPathPolicy{
		AllowExternalURLs: false,
		AllowRoot:         capability.normalizedKind() == "page",
		AllowedPrefixes:   defaultDeliveryPathPrefixes(capability),
		allowRootSet:      false,
		allowedPrefixSet:  false,
	}
	raw := anyMap(delivery["path_policy"])
	if len(raw) == 0 {
		return policy
	}
	if _, exists := raw["allow_external_urls"]; exists {
		policy.AllowExternalURLs = anyBool(raw["allow_external_urls"])
	}
	if _, exists := raw["allow_root"]; exists {
		policy.AllowRoot = anyBool(raw["allow_root"])
		policy.allowRootSet = true
	}
	if _, exists := raw["allowed_prefixes"]; exists {
		policy.allowedPrefixSet = true
		policy.AllowedPrefixes = normalizePolicyPrefixes(anyStringList(raw["allowed_prefixes"]))
		return policy
	}
	if values := normalizePolicyPrefixes(anyStringList(raw["allowed_prefixes"])); len(values) > 0 {
		policy.AllowedPrefixes = values
	}
	return policy
}

func effectiveDeliveryPathPolicy(capability deliveryCapability) deliveryPathPolicy {
	policy := capability.PathPolicy
	if !policy.allowRootSet {
		policy.AllowRoot = capability.normalizedKind() == "page"
	}
	if !policy.allowedPrefixSet {
		policy.AllowedPrefixes = defaultDeliveryPathPrefixes(capability)
	}
	policy.AllowedPrefixes = normalizePolicyPrefixes(policy.AllowedPrefixes)
	return policy
}

func defaultDeliveryPathPrefixes(capability deliveryCapability) []string {
	switch capability.normalizedKind() {
	case "collection":
		if prefix := staticRoutePrefix(capability.listRoutePattern()); prefix != "" && prefix != "/" {
			return []string{prefix}
		}
	case "detail", "hybrid":
		if prefix := staticRoutePrefix(capability.detailRoutePattern()); prefix != "" && prefix != "/" {
			return []string{prefix}
		}
	}
	return nil
}

func staticRoutePrefix(pattern string) string {
	pattern = normalizeLocalePath(pattern)
	segments := splitPathSegments(pattern)
	if len(segments) == 0 {
		return "/"
	}
	prefix := make([]string, 0, len(segments))
	for _, segment := range segments {
		if strings.HasPrefix(segment, ":") || strings.Contains(segment, "*") {
			break
		}
		prefix = append(prefix, segment)
	}
	if len(prefix) == 0 {
		return "/"
	}
	return normalizeLocalePath("/" + strings.Join(prefix, "/"))
}

func normalizePolicyPrefixes(items []string) []string {
	if len(items) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(items))
	for _, item := range items {
		path := normalizeLocalePath(item)
		if path == "" || path == "/" {
			continue
		}
		if _, exists := seen[path]; exists {
			continue
		}
		seen[path] = struct{}{}
		out = append(out, path)
	}
	if len(out) == 0 {
		return nil
	}
	sort.Strings(out)
	return out
}

func sanitizeDeliveryPath(raw string, policy deliveryPathPolicy) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if !policy.AllowExternalURLs {
		lower := strings.ToLower(raw)
		if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.HasPrefix(raw, "//") {
			return ""
		}
	}
	if strings.Contains(raw, "\\") {
		return ""
	}
	if idx := strings.IndexAny(raw, "?#"); idx >= 0 {
		raw = strings.TrimSpace(raw[:idx])
	}
	if raw == "" {
		return ""
	}
	if !strings.HasPrefix(raw, "/") {
		raw = "/" + strings.TrimLeft(raw, "/")
	}
	for _, segment := range strings.Split(strings.Trim(raw, "/"), "/") {
		if segment == "." || segment == ".." {
			return ""
		}
	}
	cleaned := path.Clean(raw)
	if !strings.HasPrefix(cleaned, "/") {
		cleaned = "/" + cleaned
	}
	cleaned = normalizeLocalePath(cleaned)
	if cleaned == "" {
		return ""
	}
	if cleaned == "/" && !policy.AllowRoot {
		return ""
	}
	if len(policy.AllowedPrefixes) > 0 && !pathMatchesAllowedPrefixes(cleaned, policy.AllowedPrefixes) {
		return ""
	}
	return cleaned
}

func pathMatchesAllowedPrefixes(path string, prefixes []string) bool {
	path = normalizeLocalePath(path)
	if path == "" || len(prefixes) == 0 {
		return false
	}
	for _, prefix := range prefixes {
		prefix = normalizeLocalePath(prefix)
		if prefix == "" || prefix == "/" {
			continue
		}
		if path == prefix || strings.HasPrefix(path, prefix+"/") {
			return true
		}
	}
	return false
}

func anyStringList(raw any) []string {
	switch typed := raw.(type) {
	case []string:
		return append([]string{}, typed...)
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			value := strings.TrimSpace(anyString(item))
			if value == "" {
				continue
			}
			out = append(out, value)
		}
		return out
	default:
		return nil
	}
}

func anyMap(raw any) map[string]any {
	if raw == nil {
		return nil
	}
	if typed, ok := raw.(map[string]any); ok {
		return typed
	}
	if typed, ok := raw.(map[string]string); ok {
		out := map[string]any{}
		for key, value := range typed {
			out[key] = value
		}
		return out
	}
	return nil
}

func anyString(raw any) string {
	switch typed := raw.(type) {
	case string:
		return typed
	default:
		return ""
	}
}

func anyBool(raw any) bool {
	switch typed := raw.(type) {
	case bool:
		return typed
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "1", "true", "yes", "on":
			return true
		}
	case int:
		return typed != 0
	case int64:
		return typed != 0
	case float64:
		return typed != 0
	}
	return false
}
