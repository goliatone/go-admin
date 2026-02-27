package site

import (
	"context"
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
	TypeSlug       string
	Kind           string
	ListRoute      string
	DetailRoute    string
	ListTemplate   string
	DetailTemplate string
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
	Mode               string
	Capability         deliveryCapability
	Record             *admin.CMSContent
	Records            []admin.CMSContent
	RequestedLocale    string
	ResolvedLocale     string
	AvailableLocales   []string
	MissingRequested   bool
	TranslationGroupID string
	PathsByLocale      map[string]string
	TemplateCandidates []string
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
				BasePath:            r.siteCfg.BasePath,
				ActivePath:          c.Path(),
				ViewContext:         router.ViewContext{},
			}
		}

		path := r.requestPathForResolution(c)
		resolution, siteErr := r.resolve(c.Context(), state, path)
		if hasSiteRuntimeError(siteErr) {
			return renderSiteRuntimeError(c, state, r.siteCfg, siteErr)
		}
		if resolution == nil {
			return renderSiteRuntimeError(c, state, r.siteCfg, SiteRuntimeError{
				Status:          404,
				RequestedLocale: state.Locale,
			})
		}
		return r.renderResolution(c, state, resolution, path)
	}
}

func (r *deliveryRuntime) requestPathForResolution(c router.Context) string {
	path := strings.TrimSpace(c.Path())
	if routePath := strings.TrimSpace(c.Param("path", "")); routePath != "" {
		path = "/" + strings.Trim(routePath, "/")
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

func (r *deliveryRuntime) resolve(ctx context.Context, state RequestState, requestPath string) (*deliveryResolution, SiteRuntimeError) {
	capabilities, err := r.capabilities(ctx)
	if err != nil {
		return nil, SiteRuntimeError{Status: 500, Message: err.Error()}
	}
	if len(capabilities) == 0 {
		return nil, SiteRuntimeError{}
	}
	contents, err := r.contentSvc.Contents(ctx, "")
	if err != nil {
		return nil, SiteRuntimeError{Status: 500, Message: err.Error()}
	}
	recordsByType := r.recordsByType(capabilities, contents, state)

	// Page-kind resolution is always path-first.
	for _, capability := range capabilities {
		if capability.normalizedKind() != "page" {
			continue
		}
		if resolution, siteErr, matched := r.resolvePageKind(capability, recordsByType[capability.TypeSlug], state, requestPath); matched {
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
		if resolution, siteErr, matched := r.resolveDetailKind(capability, recordsByType[capability.TypeSlug], state, requestPath); matched {
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
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
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

func (r *deliveryRuntime) resolveDetailKind(
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
	requestPath string,
) (*deliveryResolution, SiteRuntimeError, bool) {
	params, ok := matchRoutePattern(capability.detailRoutePattern(), requestPath)
	if !ok {
		return nil, SiteRuntimeError{}, false
	}
	slug := strings.TrimSpace(params["slug"])
	candidates := []admin.CMSContent{}
	for _, record := range records {
		if slug != "" {
			if !deliverySlugMatches(record, slug) {
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
		TranslationGroupID: strings.TrimSpace(firstNonEmpty(record.TranslationGroupID, anyString(recordData["translation_group_id"]))),
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

func (r *deliveryRuntime) renderResolution(c router.Context, state RequestState, resolution *deliveryResolution, requestPath string) error {
	viewCtx := cloneViewContext(state.ViewContext)
	viewCtx["requested_locale"] = resolution.RequestedLocale
	viewCtx["resolved_locale"] = resolution.ResolvedLocale
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
			viewCtx["translation_group_id"] = strings.TrimSpace(firstNonEmpty(
				anyString(recordMap["translation_group_id"]),
				resolution.TranslationGroupID,
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
	viewCtx["locale_switcher"] = BuildLocaleSwitcherContract(
		r.siteCfg,
		requestPath,
		resolution.RequestedLocale,
		resolution.ResolvedLocale,
		resolution.TranslationGroupID,
		resolution.AvailableLocales,
		resolution.PathsByLocale,
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
		if err := c.Render(templateName, viewCtx); err == nil {
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
	translationGroupID := strings.TrimSpace(firstNonEmpty(record.TranslationGroupID, anyString(data["translation_group_id"])))
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
		"translation_group_id":     translationGroupID,
		"missing_requested_locale": record.MissingRequestedLocale,
		"content_type":             strings.TrimSpace(firstNonEmpty(record.ContentType, capability.TypeSlug)),
		"content_type_slug":        strings.TrimSpace(firstNonEmpty(record.ContentTypeSlug, capability.TypeSlug)),
		"data":                     data,
	}
	if previewURL := strings.TrimSpace(anyString(data["preview_url"])); previewURL != "" {
		out["preview_url"] = previewURL
	}
	return out
}

func recordDeliveryPath(record admin.CMSContent, capability deliveryCapability) string {
	if record.Data != nil {
		if value := strings.TrimSpace(anyString(record.Data["path"])); value != "" {
			return normalizeLocalePath(value)
		}
	}
	slug := strings.Trim(strings.TrimSpace(record.Slug), "/")
	if slug == "" {
		return "/"
	}
	switch capability.normalizedKind() {
	case "page":
		return normalizeLocalePath("/" + slug)
	case "collection":
		return normalizeLocalePath(capability.listRoutePattern())
	default:
		pattern := capability.detailRoutePattern()
		if strings.Contains(pattern, ":slug") {
			return normalizeLocalePath(strings.Replace(pattern, ":slug", slug, 1))
		}
		return normalizeLocalePath("/" + pluralTypeSlug(capability.TypeSlug) + "/" + slug)
	}
}

func deliverySlugMatches(record admin.CMSContent, slug string) bool {
	slug = strings.Trim(strings.ToLower(strings.TrimSpace(slug)), "/")
	if slug == "" {
		return false
	}
	if strings.Trim(strings.ToLower(strings.TrimSpace(record.Slug)), "/") == slug {
		return true
	}
	if record.Data != nil {
		path := strings.Trim(strings.ToLower(strings.TrimSpace(anyString(record.Data["path"]))), "/")
		if path == slug {
			return true
		}
	}
	return false
}

func contentIdentityKey(record admin.CMSContent, capability deliveryCapability) string {
	recordData := record.Data
	if recordData == nil {
		recordData = map[string]any{}
	}
	if groupID := strings.TrimSpace(firstNonEmpty(record.TranslationGroupID, anyString(recordData["translation_group_id"]))); groupID != "" {
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
		byLocale[locale] = recordDeliveryPath(record, capability)
	}
	if len(byLocale) == 0 {
		return nil
	}
	return byLocale
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

func cloneAnyMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}
