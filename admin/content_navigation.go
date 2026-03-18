package admin

import (
	"context"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

const (
	NavigationOverrideInherit = "inherit"
	NavigationOverrideShow    = "show"
	NavigationOverrideHide    = "hide"
)

var navigationOverrideModes = []string{
	NavigationOverrideInherit,
	NavigationOverrideShow,
	NavigationOverrideHide,
}

type contentEntryNavigationPolicy struct {
	Enabled               bool     `json:"enabled"`
	EligibleLocations     []string `json:"eligible_locations"`
	DefaultLocations      []string `json:"default_locations"`
	DefaultVisible        bool     `json:"default_visible"`
	AllowInstanceOverride bool     `json:"allow_instance_override"`
}

type contentEntryNavigationEvaluation struct {
	Overrides           map[string]string `json:"overrides"`
	EffectiveLocations  []string          `json:"effective_locations"`
	EffectiveVisibility map[string]bool   `json:"effective_visibility"`
}

func navigationOverrideModesContract() []string {
	return append([]string{}, navigationOverrideModes...)
}

func normalizeNavigationOverrideMode(raw string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	switch raw {
	case NavigationOverrideInherit, NavigationOverrideShow, NavigationOverrideHide:
		return raw
	default:
		return ""
	}
}

func normalizeNavigationOverrideMap(raw any) (map[string]string, error) {
	if raw == nil {
		return nil, nil
	}
	source := map[string]any{}
	switch typed := raw.(type) {
	case map[string]any:
		source = typed
	case map[string]string:
		for key, value := range typed {
			source[key] = value
		}
	default:
		return nil, validationDomainError("navigation override map must be an object", map[string]any{
			"field":         "_navigation",
			"allowed_modes": navigationOverrideModesContract(),
		})
	}

	out := map[string]string{}
	for key, value := range source {
		location := strings.TrimSpace(key)
		if location == "" {
			continue
		}
		mode := normalizeNavigationOverrideMode(toString(value))
		if mode == "" {
			return nil, validationDomainError("invalid navigation override value", map[string]any{
				"field":         "_navigation." + location,
				"location":      location,
				"value":         strings.TrimSpace(toString(value)),
				"allowed_modes": navigationOverrideModesContract(),
				"examples":      contentNavigationExamplesContract(),
			})
		}
		out[location] = mode
	}
	if len(out) == 0 {
		return nil, nil
	}
	return out, nil
}

func contentEntryNavigationPolicyFromContentType(contentType CMSContentType) contentEntryNavigationPolicy {
	contracts := ReadContentTypeCapabilityContracts(contentType)
	navigation := contracts.Navigation
	if len(navigation) == 0 {
		return contentEntryNavigationPolicy{}
	}
	eligible := dedupeAndSortStrings(toStringSlice(navigation["eligible_locations"]))
	defaults := dedupeAndSortStrings(toStringSlice(navigation["default_locations"]))
	policy := contentEntryNavigationPolicy{
		Enabled:               toBool(navigation["enabled"]),
		EligibleLocations:     eligible,
		DefaultLocations:      defaults,
		DefaultVisible:        true,
		AllowInstanceOverride: true,
	}
	if raw, exists := navigation["default_visible"]; exists {
		policy.DefaultVisible = toBool(raw)
	}
	if raw, exists := navigation["allow_instance_override"]; exists {
		policy.AllowInstanceOverride = toBool(raw)
	}
	return policy
}

func resolveContentEntryNavigationPolicy(ctx context.Context, service CMSContentTypeService, contentTypeKey string) (contentEntryNavigationPolicy, bool) {
	if service == nil {
		return contentEntryNavigationPolicy{}, false
	}
	key := strings.TrimSpace(contentTypeKey)
	if key == "" {
		return contentEntryNavigationPolicy{}, false
	}
	if record, err := service.ContentTypeBySlug(ctx, key); err == nil && record != nil {
		return contentEntryNavigationPolicyFromContentType(*record), true
	}
	if record, err := service.ContentType(ctx, key); err == nil && record != nil {
		return contentEntryNavigationPolicyFromContentType(*record), true
	}
	return contentEntryNavigationPolicy{}, false
}

func evaluateContentEntryNavigation(rawOverrides any, policy contentEntryNavigationPolicy, strict bool) (contentEntryNavigationEvaluation, error) {
	overrides, err := normalizeNavigationOverrideMap(rawOverrides)
	if err != nil {
		return contentEntryNavigationEvaluation{}, err
	}
	if !policy.Enabled {
		if strict && len(overrides) > 0 {
			return contentEntryNavigationEvaluation{}, validationDomainError("navigation overrides are disabled for this content type", map[string]any{
				"field": "_navigation",
				"hint":  "Enable capabilities.navigation.enabled before setting entry-level overrides.",
			})
		}
		return contentEntryNavigationEvaluation{}, nil
	}

	eligible := dedupeAndSortStrings(policy.EligibleLocations)
	eligibleSet := map[string]struct{}{}
	for _, location := range eligible {
		eligibleSet[location] = struct{}{}
	}
	if len(overrides) > 0 {
		for location := range overrides {
			if _, ok := eligibleSet[location]; ok {
				continue
			}
			if strict {
				return contentEntryNavigationEvaluation{}, validationDomainError("invalid navigation location override", map[string]any{
					"field":             "_navigation." + location,
					"location":          location,
					"allowed_locations": eligible,
					"guidance":          contentNavigationValidationContract(),
				})
			}
			delete(overrides, location)
		}
	}
	if !policy.AllowInstanceOverride {
		overrides = nil
	}

	defaultSet := map[string]struct{}{}
	for _, location := range dedupeAndSortStrings(policy.DefaultLocations) {
		defaultSet[location] = struct{}{}
	}

	visibility := map[string]bool{}
	locations := make([]string, 0, len(eligible))
	for _, location := range eligible {
		mode := NavigationOverrideInherit
		if policy.AllowInstanceOverride {
			if override := normalizeNavigationOverrideMode(overrides[location]); override != "" {
				mode = override
			}
		}
		visible := false
		switch mode {
		case NavigationOverrideShow:
			visible = true
		case NavigationOverrideHide:
			visible = false
		default:
			_, inDefaults := defaultSet[location]
			visible = policy.DefaultVisible && inDefaults
		}
		visibility[location] = visible
		if visible {
			locations = append(locations, location)
		}
	}
	sort.Strings(locations)
	if len(overrides) == 0 {
		overrides = nil
	}
	if len(visibility) == 0 {
		visibility = nil
	}
	return contentEntryNavigationEvaluation{
		Overrides:           overrides,
		EffectiveLocations:  locations,
		EffectiveVisibility: visibility,
	}, nil
}

func evaluateContentEntryNavigationFromRecord(record map[string]any, policy contentEntryNavigationPolicy) (contentEntryNavigationEvaluation, bool) {
	if len(record) == 0 {
		return contentEntryNavigationEvaluation{}, false
	}
	rawOverrides := record["_navigation"]
	if rawOverrides == nil {
		if data, ok := record["data"].(map[string]any); ok {
			rawOverrides = data["_navigation"]
		}
	}
	eval, err := evaluateContentEntryNavigation(rawOverrides, policy, false)
	if err != nil {
		return contentEntryNavigationEvaluation{}, false
	}
	return eval, true
}

func applyContentEntryNavigationWrite(record map[string]any, policy contentEntryNavigationPolicy, always bool) error {
	if record == nil {
		return nil
	}
	hasOverride := recordHasKey(record, "_navigation")
	if !hasOverride {
		if data, ok := record["data"].(map[string]any); ok {
			_, hasOverride = data["_navigation"]
		}
	}
	if !always && !hasOverride {
		return nil
	}

	rawOverrides := record["_navigation"]
	if !hasOverride {
		rawOverrides = nil
	}
	eval, err := evaluateContentEntryNavigation(rawOverrides, policy, true)
	if err != nil {
		return err
	}
	record["_navigation"] = navigationVisibilityMapAny(eval.Overrides)
	record["effective_menu_locations"] = append([]string{}, eval.EffectiveLocations...)
	record["effective_navigation_visibility"] = navigationVisibilityBoolMapAny(eval.EffectiveVisibility)
	return nil
}

func applyContentEntryNavigationReadContract(record map[string]any, policy contentEntryNavigationPolicy) map[string]any {
	if record == nil {
		return nil
	}
	out := primitives.CloneAnyMap(record)
	if out == nil {
		out = map[string]any{}
	}
	eval, ok := evaluateContentEntryNavigationFromRecord(out, policy)
	if !ok {
		return out
	}
	out["_navigation"] = navigationVisibilityMapAny(eval.Overrides)
	out["effective_menu_locations"] = append([]string{}, eval.EffectiveLocations...)
	out["effective_navigation_visibility"] = navigationVisibilityBoolMapAny(eval.EffectiveVisibility)
	return out
}

func inferEffectiveNavigationVisibility(overrides map[string]string, effectiveLocations []string) map[string]bool {
	visibility := map[string]bool{}
	for _, location := range dedupeAndSortStrings(effectiveLocations) {
		visibility[location] = true
	}
	for location, mode := range overrides {
		location = strings.TrimSpace(location)
		if location == "" {
			continue
		}
		switch normalizeNavigationOverrideMode(mode) {
		case NavigationOverrideShow:
			visibility[location] = true
		case NavigationOverrideHide:
			visibility[location] = false
		default:
			if _, exists := visibility[location]; !exists {
				visibility[location] = false
			}
		}
	}
	if len(visibility) == 0 {
		return nil
	}
	return visibility
}

func contentNavigationDefaultsEditorContract() map[string]any {
	return map[string]any{
		"field": "capabilities.navigation",
		"fields": []string{
			"enabled",
			"eligible_locations",
			"default_locations",
			"default_visible",
			"allow_instance_override",
			"merge_mode",
		},
		"merge_mode_values": []string{"append", "prepend", "replace"},
		"subset_rule":       "default_locations must be a subset of eligible_locations",
	}
}

func contentNavigationEntryOverrideContract() map[string]any {
	return map[string]any{
		"field":      "_navigation",
		"value_enum": navigationOverrideModesContract(),
		"value_meanings": map[string]any{
			NavigationOverrideInherit: "use content type defaults",
			NavigationOverrideShow:    "force include in location",
			NavigationOverrideHide:    "force exclude from location",
		},
		"write_endpoint": "/api/v1/admin/content/:type/:id/navigation",
	}
}

func contentNavigationExamplesContract() map[string]any {
	return map[string]any{
		"inherit": map[string]any{
			"_navigation": map[string]any{
				"site.main": NavigationOverrideInherit,
			},
		},
		"show_hide": map[string]any{
			"_navigation": map[string]any{
				"site.main":   NavigationOverrideShow,
				"site.footer": NavigationOverrideHide,
			},
		},
	}
}

func contentNavigationValidationContract() map[string]any {
	return map[string]any{
		"invalid_location": map[string]any{
			"field_pattern": "_navigation.<location>",
			"rule":          "location key must exist in capabilities.navigation.eligible_locations",
			"hint":          "Use only eligible location keys and values inherit|show|hide.",
		},
		"invalid_value": map[string]any{
			"allowed_values": navigationOverrideModesContract(),
		},
	}
}

func contentNavigationContractsPayload(endpoints map[string]string) map[string]any {
	payload := map[string]any{
		"content_type_navigation_defaults": contentNavigationDefaultsEditorContract(),
		"entry_navigation_overrides":       contentNavigationEntryOverrideContract(),
		"examples":                         contentNavigationExamplesContract(),
		"validation":                       contentNavigationValidationContract(),
	}
	if len(endpoints) > 0 {
		endpointPayload := map[string]any{}
		for key, value := range endpoints {
			if strings.TrimSpace(key) == "" {
				continue
			}
			endpointPayload[key] = strings.TrimSpace(value)
		}
		payload["endpoints"] = endpointPayload
	}
	return payload
}

func navigationVisibilityBoolMapAny(in map[string]bool) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := map[string]any{}
	for key, value := range in {
		location := strings.TrimSpace(key)
		if location == "" {
			continue
		}
		out[location] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func normalizeNavigationVisibilityBoolMap(raw any) map[string]bool {
	if raw == nil {
		return nil
	}
	out := map[string]bool{}
	switch typed := raw.(type) {
	case map[string]bool:
		for key, value := range typed {
			location := strings.TrimSpace(key)
			if location == "" {
				continue
			}
			out[location] = value
		}
	case map[string]any:
		for key, value := range typed {
			location := strings.TrimSpace(key)
			if location == "" {
				continue
			}
			out[location] = toBool(value)
		}
	default:
		return nil
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
