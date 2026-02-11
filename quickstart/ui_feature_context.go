package quickstart

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func withUIFeatureContext(ctx router.ViewContext, adm *admin.Admin, active string) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	activityEnabled := adm != nil && adm.ActivityReadEnabled()
	ctx["activity_enabled"] = activityEnabled
	ctx["activity_feature_enabled"] = activityEnabled
	ctx["translation_capabilities"] = translationCapabilitiesForAdmin(adm)
	return withFeatureBodyClasses(ctx, "activity", activityEnabled, strings.EqualFold(strings.TrimSpace(active), "activity"))
}

func withFeatureBodyClasses(ctx router.ViewContext, feature string, enabled bool, markActive bool) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	feature = normalizeFeatureClassName(feature)
	if feature == "" {
		return ctx
	}
	classes := bodyClassesFromContext(ctx["body_classes"])
	classes = appendBodyClasses(classes, "feature-"+feature)
	if enabled {
		classes = appendBodyClasses(classes, "feature-"+feature+"-enabled")
		if markActive {
			classes = appendBodyClasses(classes, "feature-enabled")
		}
	} else {
		classes = appendBodyClasses(classes, "feature-"+feature+"-disabled")
		if markActive {
			classes = appendBodyClasses(classes, "feature-disabled")
		}
	}
	ctx["body_classes"] = strings.Join(classes, " ")
	return ctx
}

func normalizeFeatureClassName(feature string) string {
	feature = strings.ToLower(strings.TrimSpace(feature))
	if feature == "" {
		return ""
	}
	feature = strings.ReplaceAll(feature, ".", "-")
	feature = strings.ReplaceAll(feature, "_", "-")
	feature = strings.ReplaceAll(feature, " ", "-")
	return feature
}

func bodyClassesFromContext(value any) []string {
	switch typed := value.(type) {
	case string:
		return splitBodyClasses(typed)
	case []string:
		out := make([]string, 0, len(typed))
		for _, entry := range typed {
			out = append(out, splitBodyClasses(entry)...)
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, entry := range typed {
			if s, ok := entry.(string); ok {
				out = append(out, splitBodyClasses(s)...)
			}
		}
		return out
	default:
		return []string{}
	}
}

func splitBodyClasses(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return []string{}
	}
	fields := strings.Fields(value)
	return append([]string{}, fields...)
}

func appendBodyClasses(existing []string, entries ...string) []string {
	if len(entries) == 0 {
		return existing
	}
	if existing == nil {
		existing = []string{}
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(existing)+len(entries))
	for _, entry := range existing {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if _, ok := seen[entry]; ok {
			continue
		}
		seen[entry] = struct{}{}
		out = append(out, entry)
	}
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		if _, ok := seen[entry]; ok {
			continue
		}
		seen[entry] = struct{}{}
		out = append(out, entry)
	}
	return out
}
