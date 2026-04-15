package admin

import (
	"net/url"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

func withTranslationDatagridRecords(a *Admin, channel string, records []map[string]any) []map[string]any {
	if len(records) == 0 {
		return records
	}
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		out = append(out, withTranslationDatagridRecord(a, channel, record))
	}
	return out
}

func withTranslationDatagridRecord(a *Admin, channel string, record map[string]any) map[string]any {
	if len(record) == 0 {
		return record
	}
	out := primitives.CloneAnyMap(record)
	if out == nil {
		out = map[string]any{}
	}

	groupID := strings.TrimSpace(translationFamilyIDFromRecord(out))
	if groupID != "" {
		out["translation_family_id"] = groupID
		if familyURL := translationFamilyURLForAdmin(a, groupID, channel); familyURL != "" {
			out["translation_family_url"] = familyURL
		}
	}
	if familyMemberCount, ok := translationFamilyMemberCount(out); ok {
		out["family_member_count"] = familyMemberCount
	} else {
		delete(out, "family_member_count")
	}

	if summary := normalizeTranslationDatagridSummaryMap(translationAssignmentSummaryValue(out)); len(summary) > 0 {
		out["translation_assignment_summary"] = summary
	} else {
		delete(out, "translation_assignment_summary")
	}
	if summary := normalizeTranslationDatagridSummaryMap(translationExchangeSummaryValue(out)); len(summary) > 0 {
		out["translation_exchange_summary"] = summary
	} else {
		delete(out, "translation_exchange_summary")
	}

	return out
}

func translationFamilyURLForAdmin(a *Admin, groupID string, channel string) string {
	groupID = strings.TrimSpace(groupID)
	if groupID == "" {
		return ""
	}
	template := translationFamilyRouteTemplate(a)
	if template == "" {
		return ""
	}
	resolved := strings.TrimSpace(strings.Replace(template, ":family_id", groupID, 1))
	return translationFamilyURLWithChannel(resolved, channel)
}

func translationFamilyRouteTemplate(a *Admin) string {
	basePath := "/admin"
	if a != nil {
		if resolved := adminBasePath(a.config); resolved != "" {
			basePath = resolved
		}
		if resolved := routePathWithBase(a.urlManager, basePath, "admin", "translations.families.id"); resolved != "" {
			return resolved
		}
	}
	return joinBasePath(basePath, "/translations/families/:family_id")
}

func translationFamilyURLWithChannel(rawURL string, channel string) string {
	rawURL = strings.TrimSpace(rawURL)
	channel = strings.TrimSpace(channel)
	if rawURL == "" || channel == "" {
		return rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	query := parsed.Query()
	if strings.TrimSpace(query.Get(ContentChannelScopeQueryParam)) == "" &&
		strings.TrimSpace(query.Get("channel")) == "" &&
		strings.TrimSpace(query.Get("content_channel")) == "" {
		query.Set("channel", channel)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func translationFamilyMemberCount(record map[string]any) (int, bool) {
	if len(record) == 0 {
		return 0, false
	}
	locales := normalizedLocaleList(record["available_locales"])
	if len(locales) == 0 {
		locales = normalizedLocaleList(translationReadinessNestedValue(record, "translation_readiness", "available_locales"))
	}
	if len(locales) > 0 {
		return len(locales), true
	}
	if strings.TrimSpace(translationFamilyIDFromRecord(record)) == "" {
		return 0, false
	}
	if locale := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["resolved_locale"]),
		toString(record["locale"]),
	)); locale != "" {
		return 1, true
	}
	return 0, false
}

func translationAssignmentSummaryValue(record map[string]any) map[string]any {
	return translationDatagridSummaryValue(record,
		[]string{"translation_assignment_summary"},
		[]string{"metadata", "translation_assignment_summary"},
		[]string{"data", "translation_assignment_summary"},
	)
}

func translationExchangeSummaryValue(record map[string]any) map[string]any {
	return translationDatagridSummaryValue(record,
		[]string{"translation_exchange_summary"},
		[]string{"metadata", "translation_exchange_summary"},
		[]string{"data", "translation_exchange_summary"},
	)
}

func translationDatagridSummaryValue(record map[string]any, paths ...[]string) map[string]any {
	for _, path := range paths {
		if len(path) == 0 {
			continue
		}
		value := translationReadinessNestedValue(record, path...)
		if summary := extractMap(value); len(summary) > 0 {
			return primitives.CloneAnyMap(summary)
		}
	}
	return nil
}

func normalizeTranslationDatagridSummaryMap(summary map[string]any) map[string]any {
	if len(summary) == 0 {
		return nil
	}
	out := primitives.CloneAnyMap(summary)
	if out == nil {
		return nil
	}

	for _, key := range []string{
		"status",
		"label",
		"assignee_id",
		"reviewer_id",
		"priority",
		"last_job_id",
		"last_job_status",
		"last_job_label",
	} {
		value := strings.TrimSpace(toString(out[key]))
		if value == "" {
			delete(out, key)
			continue
		}
		out[key] = value
	}

	for _, key := range []string{
		"active_count",
		"open_count",
		"pending_count",
		"error_count",
	} {
		if value, ok := normalizeTranslationDatagridSummaryInt(out[key]); ok {
			out[key] = value
			continue
		}
		delete(out, key)
	}

	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeTranslationDatagridSummaryInt(value any) (int, bool) {
	if out, ok := normalizeTranslationDatagridSignedInt(value); ok {
		return out, true
	}
	if out, ok := normalizeTranslationDatagridUnsignedInt(value); ok {
		return out, true
	}
	switch typed := value.(type) {
	case float32:
		return int(typed), true
	case float64:
		return int(typed), true
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return 0, false
		}
		return atoiDefault(trimmed, 0), true
	default:
		trimmed := strings.TrimSpace(toString(value))
		if trimmed == "" {
			return 0, false
		}
		return atoiDefault(trimmed, 0), true
	}
}

func normalizeTranslationDatagridSignedInt(value any) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, true
	case int8:
		return int(typed), true
	case int16:
		return int(typed), true
	case int32:
		return int(typed), true
	case int64:
		return primitives.IntFromInt64(typed)
	default:
		return 0, false
	}
}

func normalizeTranslationDatagridUnsignedInt(value any) (int, bool) {
	switch typed := value.(type) {
	case uint:
		return primitives.IntFromUint(typed)
	case uint8:
		return int(typed), true
	case uint16:
		return int(typed), true
	case uint32:
		return int(typed), true
	case uint64:
		return primitives.IntFromUint64(typed)
	default:
		return 0, false
	}
}
