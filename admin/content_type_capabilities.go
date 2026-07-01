package admin

import (
	"context"
	"maps"
	"reflect"
	"slices"
	"sort"
	"strings"

	cmscontent "github.com/goliatone/go-cms/content"
)

const (
	ContentTypeCapabilityKeyBlocks          = "blocks"
	ContentTypeCapabilityKeyBlockTypes      = "block_types"
	ContentTypeCapabilityKeyI18N            = "i18n"
	ContentTypeCapabilityKeyLocalized       = "localized"
	ContentTypeCapabilityKeyMenuLabel       = "menu_label"
	ContentTypeCapabilityKeyNavigationLabel = "navigation_label"
	ContentTypeCapabilityKeyPanelLabel      = "panel_label"
	ContentTypeCapabilityKeyPanelPreset     = "panel_preset"
	ContentTypeCapabilityKeyPanelSlug       = "panel_slug"
	ContentTypeCapabilityKeyPanelTraits     = "panel_traits"
	ContentTypeCapabilityKeyPermission      = "permission"
	ContentTypeCapabilityKeyPermissions     = "permissions"
	ContentTypeCapabilityKeySEO             = "seo"
	ContentTypeCapabilityKeySearchContent   = "search_content_type"
	ContentTypeCapabilityKeyTranslation     = "translation"
	ContentTypeCapabilityKeyTranslations    = "translations"
	ContentTypeCapabilityKeyTree            = "tree"
	ContentTypeCapabilityKeyTreeView        = "tree_view"
	ContentTypeCapabilityKeyUseSEO          = "use_seo"
	ContentTypeCapabilityKeyWorkflow        = "workflow"
	ContentTypeCapabilityKeyWorkflowID      = "workflow_id"
	ContentTypeCapabilityKeyWorkflowKey     = "workflow_key"
)

// ContentTypeCapabilityContracts captures normalized capability payloads and
// validation metadata used by admin and quickstart callers.
type ContentTypeCapabilityContracts struct {
	Normalized           map[string]any    `json:"normalized"`
	Delivery             map[string]any    `json:"delivery"`
	Navigation           map[string]any    `json:"navigation"`
	Search               map[string]any    `json:"search"`
	Validation           map[string]string `json:"validation"`
	MigratedDeliveryMenu bool              `json:"migrated_delivery_menu"`
}

// ReadContentTypeCapabilityContracts resolves normalized capability contracts
// from a full CMS content type payload.
func ReadContentTypeCapabilityContracts(contentType CMSContentType) ContentTypeCapabilityContracts {
	return ParseContentTypeCapabilityContracts(contentType.Capabilities)
}

// ParseContentTypeCapabilityContracts resolves normalized capability contracts
// from a raw capabilities payload.
func ParseContentTypeCapabilityContracts(capabilities map[string]any) ContentTypeCapabilityContracts {
	return convertCapabilityContracts(normalizeContentTypeCapabilityContracts(capabilities))
}

// NormalizeContentTypeCapabilities returns canonical capability objects and
// validation metadata without mutating the input payload.
func NormalizeContentTypeCapabilities(capabilities map[string]any) (map[string]any, map[string]string) {
	contracts := normalizeContentTypeCapabilityContracts(capabilities)
	return contracts.Normalized, contracts.Validation
}

// ValidateAndNormalizeContentTypeCapabilities validates and normalizes
// capabilities via the canonical go-cms implementation.
func ValidateAndNormalizeContentTypeCapabilities(capabilities map[string]any) (map[string]any, error) {
	normalized, validation := NormalizeContentTypeCapabilities(capabilities)
	if len(validation) > 0 {
		return nil, contentTypeValidationError(validation)
	}
	return normalized, nil
}

// ContentTypeCapabilityString returns the first non-empty string value for the
// canonical capability keys, accepting snake_case, camelCase, and kebab-case
// spellings for compatibility with legacy payloads. Identifier-like
// capabilities are normalized to lowercase; display strings preserve case.
func ContentTypeCapabilityString(capabilities map[string]any, keys ...string) string {
	if len(capabilities) == 0 {
		return ""
	}
	for _, key := range keys {
		for _, raw := range capabilityValues(capabilities, key) {
			if value := capabilityStringValue(raw); value != "" {
				return normalizeContentTypeCapabilityString(key, value)
			}
		}
	}
	return ""
}

// ContentTypeCapabilityValue returns the first capability value for the
// canonical capability keys, accepting snake_case, camelCase, and kebab-case
// spellings for compatibility with legacy payloads.
func ContentTypeCapabilityValue(capabilities map[string]any, keys ...string) (any, bool) {
	return capabilityValue(capabilities, keys...)
}

// ContentTypeCapabilityValues returns all values found for the canonical
// capability keys and their supported legacy spellings.
func ContentTypeCapabilityValues(capabilities map[string]any, keys ...string) []any {
	return capabilityValues(capabilities, keys...)
}

// BackfillContentTypeNavigationDefaults updates existing content types so
// canonical navigation defaults are persisted for legacy capability payloads.
func BackfillContentTypeNavigationDefaults(ctx context.Context, service CMSContentTypeService) (int, error) {
	if service == nil {
		return 0, ErrNotFound
	}
	types, err := service.ContentTypes(ctx)
	if err != nil {
		return 0, err
	}
	updated := 0
	for _, item := range types {
		normalized, validation := NormalizeContentTypeCapabilities(item.Capabilities)
		if len(validation) > 0 {
			return updated, contentTypeValidationError(validation)
		}
		if reflect.DeepEqual(normalized, item.Capabilities) {
			continue
		}
		next := item
		next.Capabilities = normalized
		next.ReplaceCapabilities = true
		if _, err := service.UpdateContentType(ctx, next); err != nil {
			return updated, err
		}
		updated++
	}
	return updated, nil
}

func convertCapabilityContracts(in cmscontent.ContentTypeCapabilityContracts) ContentTypeCapabilityContracts {
	return ContentTypeCapabilityContracts{
		Normalized:           in.Normalized,
		Delivery:             in.Delivery,
		Navigation:           in.Navigation,
		Search:               in.Search,
		Validation:           in.Validation,
		MigratedDeliveryMenu: in.MigratedDeliveryMenu,
	}
}

func normalizeContentTypeCapabilitiesInternal(capabilities map[string]any) (map[string]any, map[string]string, bool) {
	contracts := normalizeContentTypeCapabilityContracts(capabilities)
	return contracts.Normalized, contracts.Validation, contracts.MigratedDeliveryMenu
}

func normalizeContentTypeCapabilityContracts(capabilities map[string]any) cmscontent.ContentTypeCapabilityContracts {
	canonicalized := canonicalizeContentTypeCapabilityAliases(capabilities)
	preserveExplicitEmptyNavigationLocations := hasExplicitEmptyNavigationEligibleLocations(canonicalized)
	contracts := cmscontent.ParseContentTypeCapabilityContracts(canonicalized)
	if preserveExplicitEmptyNavigationLocations {
		contracts = restoreExplicitEmptyNavigationLocations(contracts)
	}
	return contracts
}

func canonicalizeContentTypeCapabilityAliases(capabilities map[string]any) map[string]any {
	if len(capabilities) == 0 {
		return capabilities
	}
	out := make(map[string]any, len(capabilities))
	maps.Copy(out, capabilities)
	rawNavigation, ok := capabilityValue(out, "navigation")
	if ok {
		navigation := extractMap(rawNavigation)
		if len(navigation) > 0 {
			out["navigation"] = canonicalizeNavigationCapabilityAliases(navigation)
		}
	}
	return out
}

func canonicalizeNavigationCapabilityAliases(navigation map[string]any) map[string]any {
	if len(navigation) == 0 {
		return navigation
	}
	out := make(map[string]any, len(navigation))
	maps.Copy(out, navigation)
	for _, key := range []string{
		"enabled",
		"eligible_locations",
		"default_locations",
		"default_visible",
		"allow_instance_override",
		"merge_mode",
	} {
		raw, exists := capabilityValue(out, key)
		if exists {
			if _, canonicalExists := out[key]; !canonicalExists {
				out[key] = raw
			}
		}
		for _, variant := range capabilityKeyVariants(key) {
			if variant != key {
				delete(out, variant)
			}
		}
	}
	return out
}

func hasExplicitEmptyNavigationEligibleLocations(capabilities map[string]any) bool {
	if len(capabilities) == 0 {
		return false
	}
	if raw, exists := capabilityValue(capabilities, "navigation_eligible_locations"); exists {
		return len(normalizeStringListAny(raw)) == 0
	}
	if rawNavigation, exists := capabilityValue(capabilities, "navigation"); exists {
		navigation := extractMap(rawNavigation)
		if raw, exists := capabilityValue(navigation, "eligible_locations"); exists {
			return len(normalizeStringListAny(raw)) == 0
		}
	}
	return false
}

func restoreExplicitEmptyNavigationLocations(contracts cmscontent.ContentTypeCapabilityContracts) cmscontent.ContentTypeCapabilityContracts {
	navigation := cloneAnyMapDeep(contracts.Navigation)
	if navigation == nil {
		navigation = map[string]any{}
	}
	navigation["eligible_locations"] = []string{}
	delete(navigation, "default_locations")
	contracts.Navigation = navigation

	normalized := cloneAnyMapDeep(contracts.Normalized)
	if normalized == nil {
		normalized = map[string]any{}
	}
	normalized["navigation"] = cloneAnyMapDeep(navigation)
	contracts.Normalized = normalized
	return contracts
}

func capabilityString(capabilities map[string]any, keys ...string) string {
	if len(capabilities) == 0 {
		return ""
	}
	for _, raw := range capabilityValues(capabilities, keys...) {
		if value := capabilityStringValue(raw); value != "" {
			return value
		}
	}
	return ""
}

func capabilityStringValue(raw any) string {
	switch value := raw.(type) {
	case string:
		return strings.TrimSpace(value)
	case []string:
		if len(value) == 0 {
			return ""
		}
		return strings.TrimSpace(value[0])
	case []any:
		if len(value) == 0 {
			return ""
		}
		return strings.TrimSpace(toString(value[0]))
	case map[string]any:
		keys := []string{"value", "name", "key", "slug", "id"}
		for _, key := range keys {
			if nested, ok := value[key]; ok {
				if result := capabilityStringValue(nested); result != "" {
					return result
				}
			}
		}
		return ""
	}
	return strings.TrimSpace(toString(raw))
}

func normalizeContentTypeCapabilityString(key, value string) string {
	value = strings.TrimSpace(value)
	switch canonicalContentTypeCapabilityKey(key) {
	case ContentTypeCapabilityKeyPanelPreset,
		ContentTypeCapabilityKeyPanelSlug,
		ContentTypeCapabilityKeySearchContent,
		ContentTypeCapabilityKeyWorkflow,
		ContentTypeCapabilityKeyWorkflowID,
		ContentTypeCapabilityKeyWorkflowKey:
		return strings.ToLower(value)
	default:
		return value
	}
}

func canonicalContentTypeCapabilityKey(key string) string {
	words := capabilityKeyWordsFromCanonical(key)
	if len(words) == 0 {
		return strings.TrimSpace(key)
	}
	return strings.Join(words, "_")
}

func capabilityValue(capabilities map[string]any, keys ...string) (any, bool) {
	if len(capabilities) == 0 {
		return nil, false
	}
	for _, key := range keys {
		for _, variant := range capabilityKeyVariants(key) {
			if raw, ok := capabilities[variant]; ok {
				return raw, true
			}
		}
	}
	return nil, false
}

func capabilityValues(capabilities map[string]any, keys ...string) []any {
	if len(capabilities) == 0 {
		return nil
	}
	out := []any{}
	seen := map[string]struct{}{}
	for _, key := range keys {
		for _, variant := range capabilityKeyVariants(key) {
			if _, ok := seen[variant]; ok {
				continue
			}
			seen[variant] = struct{}{}
			if raw, ok := capabilities[variant]; ok {
				out = append(out, raw)
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func capabilityKeyVariants(key string) []string {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil
	}
	out := []string{}
	appendVariant := func(variant string) {
		variant = strings.TrimSpace(variant)
		if variant == "" {
			return
		}
		if slices.Contains(out, variant) {
			return
		}
		out = append(out, variant)
	}
	appendVariant(key)
	words := capabilityKeyWordsFromCanonical(key)
	if len(words) == 0 {
		return out
	}
	appendVariant(strings.Join(words, "_"))
	appendVariant(lowerCamelCapabilityKey(words))
	appendVariant(strings.Join(words, "-"))
	return out
}

func capabilityKeyWordsFromCanonical(key string) []string {
	key = strings.NewReplacer("-", "_", " ", "_", ".", "_").Replace(key)
	rawWords := strings.Split(key, "_")
	words := make([]string, 0, len(rawWords))
	for _, word := range rawWords {
		word = strings.ToLower(strings.TrimSpace(word))
		if word != "" {
			words = append(words, word)
		}
	}
	return words
}

func lowerCamelCapabilityKey(words []string) string {
	if len(words) == 0 {
		return ""
	}
	var out strings.Builder
	out.WriteString(words[0])
	for _, word := range words[1:] {
		if word == "" {
			continue
		}
		out.WriteString(strings.ToUpper(word[:1]))
		if len(word) > 1 {
			out.WriteString(word[1:])
		}
	}
	return out.String()
}

func normalizeStringListAny(raw any) []string {
	switch typed := raw.(type) {
	case nil:
		return nil
	case []string:
		return dedupeAndSortStrings(typed)
	case []any:
		out := make([]string, 0, len(typed))
		for _, value := range typed {
			if item := strings.TrimSpace(toString(value)); item != "" {
				out = append(out, item)
			}
		}
		return dedupeAndSortStrings(out)
	case string:
		out := make([]string, 0, 1)
		for part := range strings.SplitSeq(typed, ",") {
			if item := strings.TrimSpace(part); item != "" {
				out = append(out, item)
			}
		}
		return dedupeAndSortStrings(out)
	default:
		if item := strings.TrimSpace(toString(raw)); item != "" {
			return []string{item}
		}
		return nil
	}
}

func dedupeAndSortStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	set := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		item := strings.TrimSpace(value)
		if item == "" {
			continue
		}
		if _, ok := set[item]; ok {
			continue
		}
		set[item] = struct{}{}
		out = append(out, item)
	}
	sort.Strings(out)
	if len(out) == 0 {
		return nil
	}
	return out
}
