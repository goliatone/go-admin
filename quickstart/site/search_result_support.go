package site

import (
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func searchNormalizedHitURL(hit admin.SearchHit) string {
	fields := cloneAnyMap(hit.Fields)
	candidates := []string{
		strings.TrimSpace(hit.URL),
		strings.TrimSpace(anyString(fields["canonical_url"])),
		strings.TrimSpace(anyString(fields["canonical_path"])),
		strings.TrimSpace(anyString(fields["url"])),
		strings.TrimSpace(anyString(fields["path"])),
		strings.TrimSpace(anyString(fields["href"])),
	}
	for _, candidate := range candidates {
		if normalized := strings.TrimSpace(admin.CanonicalPath(candidate, "")); normalized != "" {
			return normalized
		}
	}
	contentType := strings.TrimSpace(firstNonEmpty(
		hit.Type,
		anyString(fields["content_type"]),
		anyString(fields["type"]),
		anyString(fields["entity_type"]),
	))
	slug := strings.TrimSpace(firstNonEmpty(
		anyString(fields["slug"]),
		anyString(fields["path_slug"]),
		anyString(fields["id"]),
		hit.ID,
	))
	if path := admin.CanonicalContentPath(contentType, slug); path != "" {
		return path
	}
	return ""
}

func searchSortOptions(active string) []map[string]any {
	active = strings.TrimSpace(strings.ToLower(active))
	options := []map[string]any{
		{"value": "", "label": "Relevance"},
		{"value": "published_year:desc", "label": "Newest"},
		{"value": "published_year:asc", "label": "Oldest"},
		{"value": "duration_seconds:asc", "label": "Shortest"},
		{"value": "duration_seconds:desc", "label": "Longest"},
		{"value": "published_at:desc", "label": "Newest"},
		{"value": "published_at:asc", "label": "Oldest"},
		{"value": "title:asc", "label": "Title A-Z"},
		{"value": "title:desc", "label": "Title Z-A"},
	}
	out := make([]map[string]any, 0, len(options))
	for _, option := range options {
		value := strings.TrimSpace(strings.ToLower(anyString(option["value"])))
		clone := cloneAnyMap(option)
		clone["active"] = value == active || (active == "" && value == "")
		out = append(out, clone)
	}
	return out
}

func searchRequestPayload(c router.Context) map[string]any {
	if c == nil {
		return map[string]any{}
	}
	return map[string]any{
		"method":          strings.TrimSpace(c.Method()),
		"path":            strings.TrimSpace(c.Path()),
		"ip":              strings.TrimSpace(c.IP()),
		"user_agent":      strings.TrimSpace(c.Header("User-Agent")),
		"accept_language": searchAcceptLanguage(c),
		"query":           c.Queries(),
		"query_values":    searchCurrentQueryValues(c),
	}
}

func searchActorPayload(c router.Context) map[string]any {
	if c == nil {
		return nil
	}
	var actor *auth.ActorContext
	if resolved, ok := auth.ActorFromRouterContext(c); ok && resolved != nil {
		actor = resolved
	} else if resolved, ok := auth.ActorFromContext(c.Context()); ok && resolved != nil {
		actor = resolved
	}
	if actor == nil {
		return nil
	}
	out := map[string]any{
		"actor_id":        strings.TrimSpace(actor.ActorID),
		"subject":         strings.TrimSpace(actor.Subject),
		"role":            strings.TrimSpace(actor.Role),
		"tenant_id":       strings.TrimSpace(actor.TenantID),
		"organization_id": strings.TrimSpace(actor.OrganizationID),
		"metadata":        cloneAnyMap(actor.Metadata),
	}
	if out["actor_id"] == "" && out["subject"] != "" {
		out["actor_id"] = out["subject"]
	}
	return out
}

func searchRangeValues(ranges []admin.SearchRange) map[string]map[string]any {
	out := map[string]map[string]any{}
	for _, item := range ranges {
		field := strings.TrimSpace(item.Field)
		if field == "" {
			continue
		}
		out[field] = map[string]any{
			"gte": item.GTE,
			"lte": item.LTE,
		}
	}
	return out
}

func searchPositiveOrFallback(value, fallback int) int {
	if value > 0 {
		return value
	}
	if fallback > 0 {
		return fallback
	}
	return 1
}

func searchIntQuery(c router.Context, key string, fallback int) int {
	if c == nil {
		return fallback
	}
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
