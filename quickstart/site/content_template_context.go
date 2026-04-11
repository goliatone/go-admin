package site

import (
	"strings"

	router "github.com/goliatone/go-router"
)

func applySiteContentAwareViewContext(viewCtx router.ViewContext) router.ViewContext {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}

	content := cloneAnyMap(anyMap(viewCtx["site_content"]))
	if content == nil {
		content = map[string]any{}
	}

	record := anyMap(viewCtx["record"])
	recordCount := viewContextRecordCount(viewCtx["records"])
	hasRecord := len(record) > 0
	hasRecords := recordCount > 0
	typeSlug := strings.TrimSpace(primitivesFirstNonEmpty(
		anyString(content["type_slug"]),
		anyString(content["type"]),
		anyString(viewCtx["content_type_slug"]),
		anyString(viewCtx["content_type"]),
	))

	content["active_path"] = strings.TrimSpace(anyString(viewCtx["active_path"]))
	content["requested_locale"] = strings.TrimSpace(anyString(viewCtx["requested_locale"]))
	content["resolved_locale"] = strings.TrimSpace(primitivesFirstNonEmpty(
		anyString(viewCtx["resolved_locale"]),
		anyString(viewCtx["locale"]),
	))
	content["locale"] = anyString(content["resolved_locale"])
	content["missing_requested_locale"] = anyBool(viewCtx["missing_requested_locale"])
	content["type"] = typeSlug
	content["type_slug"] = typeSlug
	content["has_record"] = hasRecord
	content["has_records"] = hasRecords
	content["record_count"] = recordCount

	if strings.TrimSpace(anyString(content["kind"])) == "" {
		switch {
		case hasSearchSignals(viewCtx):
			content["kind"] = "search"
		case hasRecords:
			content["kind"] = "list"
		case hasRecord:
			content["kind"] = "detail"
		default:
			content["kind"] = "generic"
		}
	}

	if strings.TrimSpace(anyString(content["mode"])) == "" {
		switch {
		case anyString(content["kind"]) == "search":
			content["mode"] = "search"
		case hasRecords:
			content["mode"] = "collection"
		case hasRecord:
			content["mode"] = "detail"
		default:
			content["mode"] = anyString(content["kind"])
		}
	}

	if candidates := siteTemplateCandidates(content, viewCtx); len(candidates) > 0 {
		content["template_candidates"] = candidates
	}

	viewCtx["site_content"] = content
	viewCtx["site_page"] = buildSitePageViewContext(anyMap(viewCtx["site_page"]), content)
	return viewCtx
}

func mergeSiteContentViewContext(viewCtx router.ViewContext, fields map[string]any) router.ViewContext {
	if viewCtx == nil {
		viewCtx = router.ViewContext{}
	}
	content := cloneAnyMap(anyMap(viewCtx["site_content"]))
	if content == nil {
		content = map[string]any{}
	}
	for key, value := range fields {
		if strings.TrimSpace(key) == "" || value == nil {
			continue
		}
		content[key] = value
	}
	viewCtx["site_content"] = content
	return applySiteContentAwareViewContext(viewCtx)
}

func buildSitePageViewContext(existing map[string]any, content map[string]any) map[string]any {
	page := cloneAnyMap(existing)
	if page == nil {
		page = map[string]any{}
	}

	kind := strings.TrimSpace(primitivesFirstNonEmpty(
		anyString(page["kind"]),
		anyString(content["kind"]),
		"generic",
	))
	mode := strings.TrimSpace(primitivesFirstNonEmpty(
		anyString(page["mode"]),
		anyString(content["mode"]),
		kind,
	))
	typeSlug := strings.TrimSpace(primitivesFirstNonEmpty(
		anyString(page["type_slug"]),
		anyString(content["type_slug"]),
		anyString(content["type"]),
	))
	activePath := strings.TrimSpace(primitivesFirstNonEmpty(
		anyString(page["active_path"]),
		anyString(content["active_path"]),
	))

	bodyClasses := mergeClassTokens(
		mergeClassTokens(anyStringSlice(page["body_classes"]), splitClassTokens(anyString(page["body_class"]))...),
		"site-page",
		classToken("site-page--", kind),
	)
	mainClasses := mergeClassTokens(
		mergeClassTokens(anyStringSlice(page["main_classes"]), splitClassTokens(anyString(page["main_class"]))...),
		"site-page__main",
		classToken("site-page__main--", kind),
	)
	if typeSlug != "" {
		bodyClasses = mergeClassTokens(bodyClasses, classToken("site-page--type-", typeSlug))
		mainClasses = mergeClassTokens(mainClasses, classToken("site-page__main--type-", typeSlug))
	}

	page["kind"] = kind
	page["mode"] = mode
	page["type_slug"] = typeSlug
	page["active_path"] = activePath
	page["body_classes"] = bodyClasses
	page["body_class"] = strings.Join(bodyClasses, " ")
	page["main_classes"] = mainClasses
	page["main_class"] = strings.Join(mainClasses, " ")
	if candidates := siteTemplateCandidates(content, nil); len(candidates) > 0 {
		page["template_candidates"] = candidates
	}

	return page
}

func hasSearchSignals(viewCtx router.ViewContext) bool {
	if viewCtx == nil {
		return false
	}
	activePath := strings.TrimSpace(anyString(viewCtx["active_path"]))
	if activePath == "/search" || strings.HasSuffix(activePath, "/search") {
		return true
	}
	if strings.TrimSpace(anyString(viewCtx["search_route"])) != "" {
		return true
	}
	if strings.TrimSpace(anyString(viewCtx["search_query"])) != "" {
		return true
	}
	if viewContextRecordCount(viewCtx["search_results"]) > 0 {
		return true
	}
	return len(anyMap(viewCtx["search_state"])) > 0
}

func deliveryResolutionContentKind(resolution *deliveryResolution) string {
	if resolution == nil {
		return "generic"
	}
	switch strings.ToLower(strings.TrimSpace(resolution.Mode)) {
	case "collection":
		return "list"
	case "detail":
		return "detail"
	default:
		if resolution.Record != nil {
			return "detail"
		}
		if len(resolution.Records) > 0 {
			return "list"
		}
		return "generic"
	}
}

func siteTemplateCandidates(content map[string]any, viewCtx router.ViewContext) []string {
	for _, source := range []any{
		nilIfEmptyMap(content),
		nilIfEmptyMap(viewCtx),
	} {
		if source == nil {
			continue
		}
		candidateMap := anyMap(source)
		for _, key := range []string{"template_candidates", "site_template_candidates"} {
			if candidates := cloneStrings(anyStringSlice(candidateMap[key])); len(candidates) > 0 {
				return candidates
			}
		}
	}
	return nil
}

func viewContextRecordCount(raw any) int {
	switch typed := raw.(type) {
	case []any:
		return len(typed)
	case []map[string]any:
		return len(typed)
	default:
		return 0
	}
}

func mergeClassTokens(base []string, tokens ...string) []string {
	seen := make(map[string]struct{}, len(base)+len(tokens))
	out := make([]string, 0, len(base)+len(tokens))
	for _, source := range [][]string{base, tokens} {
		for _, token := range source {
			token = strings.TrimSpace(token)
			if token == "" {
				continue
			}
			if _, ok := seen[token]; ok {
				continue
			}
			seen[token] = struct{}{}
			out = append(out, token)
		}
	}
	return out
}

func splitClassTokens(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	return strings.Fields(raw)
}

func classToken(prefix string, raw string) string {
	raw = sanitizeClassToken(raw)
	if raw == "" {
		return ""
	}
	return strings.TrimSpace(prefix) + raw
}

func sanitizeClassToken(raw string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	if raw == "" {
		return ""
	}

	var out strings.Builder
	lastDash := false
	for _, r := range raw {
		isAlpha := r >= 'a' && r <= 'z'
		isNum := r >= '0' && r <= '9'
		if isAlpha || isNum {
			out.WriteRune(r)
			lastDash = false
			continue
		}
		if lastDash {
			continue
		}
		out.WriteByte('-')
		lastDash = true
	}
	return strings.Trim(out.String(), "-")
}

func nilIfEmptyMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	return input
}
