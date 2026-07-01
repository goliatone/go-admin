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

	DefaultEntryNavigationActivityAction = "content.navigation_visibility.update"
)

var navigationOverrideModes = []string{
	NavigationOverrideInherit,
	NavigationOverrideShow,
	NavigationOverrideHide,
}

// EntryNavigationPolicy declares the content-type policy used to evaluate
// entry-level navigation visibility.
type EntryNavigationPolicy struct {
	Enabled               bool     `json:"enabled"`
	EligibleLocations     []string `json:"eligible_locations"`
	DefaultLocations      []string `json:"default_locations"`
	DefaultVisible        bool     `json:"default_visible"`
	AllowInstanceOverride bool     `json:"allow_instance_override"`
	ViewPermission        string   `json:"view_permission,omitempty"`
	EditPermission        string   `json:"edit_permission,omitempty"`
	PermissionResource    string   `json:"permission_resource,omitempty"`
	ActivityAction        string   `json:"activity_action,omitempty"`
	Excluded              bool     `json:"excluded,omitempty"`
}

// EntryNavigationEvaluation is the normalized read/write contract for an entry.
type EntryNavigationEvaluation struct {
	Overrides           map[string]string `json:"overrides"`
	EffectiveLocations  []string          `json:"effective_locations"`
	EffectiveVisibility map[string]bool   `json:"effective_visibility"`
}

// EntryNavigationViewModel is the server-authored state used by templates and
// progressive enhancement code.
type EntryNavigationViewModel struct {
	Visible                bool              `json:"visible"`
	Editable               bool              `json:"editable"`
	ReadOnly               bool              `json:"read_only"`
	ContentType            string            `json:"content_type"`
	Panel                  string            `json:"panel"`
	RecordID               string            `json:"record_id"`
	Endpoint               string            `json:"endpoint"`
	EligibleLocations      []string          `json:"eligible_locations"`
	DefaultLocations       []string          `json:"default_locations"`
	Overrides              map[string]string `json:"overrides"`
	EffectiveVisibility    map[string]bool   `json:"effective_visibility"`
	EffectiveMenuLocations []string          `json:"effective_menu_locations"`
	AllowInstanceOverride  bool              `json:"allow_instance_override"`
	ViewPermission         string            `json:"view_permission,omitempty"`
	EditPermission         string            `json:"edit_permission,omitempty"`
	PermissionResource     string            `json:"permission_resource,omitempty"`
	PanelViewPermission    string            `json:"panel_view_permission,omitempty"`
	PanelEditPermission    string            `json:"panel_edit_permission,omitempty"`
	ActivityAction         string            `json:"activity_action,omitempty"`
	Reason                 string            `json:"reason,omitempty"`
	Debug                  map[string]any    `json:"debug,omitempty"`
}

// EntryNavigationViewModelInput contains server state needed to build a view model.
type EntryNavigationViewModelInput struct {
	Context     context.Context
	Authorizer  Authorizer
	Panel       *Panel
	PanelName   string
	ContentType *CMSContentType
	Record      map[string]any
	Policy      EntryNavigationPolicy
	Endpoint    string
}

type contentEntryNavigationPolicy = EntryNavigationPolicy
type contentEntryNavigationEvaluation = EntryNavigationEvaluation

// EntryNavigationOptions configures reusable entry navigation visibility.
type EntryNavigationOptions struct {
	Enabled               *bool                                 `json:"enabled,omitempty"`
	EligibleLocations     []string                              `json:"eligible_locations,omitempty"`
	DefaultLocations      []string                              `json:"default_locations,omitempty"`
	DefaultVisible        *bool                                 `json:"default_visible,omitempty"`
	AllowInstanceOverride *bool                                 `json:"allow_instance_override,omitempty"`
	ViewPermission        string                                `json:"view_permission,omitempty"`
	EditPermission        string                                `json:"edit_permission,omitempty"`
	PermissionResource    string                                `json:"permission_resource,omitempty"`
	ActivityAction        string                                `json:"activity_action,omitempty"`
	ExcludedContentTypes  []string                              `json:"excluded_content_types,omitempty"`
	ContentTypes          map[string]EntryNavigationTypeOptions `json:"content_types,omitempty"`
}

// EntryNavigationTypeOptions narrows or disables entry navigation for a content type.
type EntryNavigationTypeOptions struct {
	Excluded              bool     `json:"excluded,omitempty"`
	EligibleLocations     []string `json:"eligible_locations,omitempty"`
	DefaultLocations      []string `json:"default_locations,omitempty"`
	DefaultVisible        *bool    `json:"default_visible,omitempty"`
	AllowInstanceOverride *bool    `json:"allow_instance_override,omitempty"`
	ViewPermission        string   `json:"view_permission,omitempty"`
	EditPermission        string   `json:"edit_permission,omitempty"`
	PermissionResource    string   `json:"permission_resource,omitempty"`
	ActivityAction        string   `json:"activity_action,omitempty"`
}

// ToMap returns a template-friendly map using the JSON field names.
func (m EntryNavigationViewModel) ToMap() map[string]any {
	return map[string]any{
		"visible":                         m.Visible,
		"editable":                        m.Editable,
		"read_only":                       m.ReadOnly,
		"content_type":                    m.ContentType,
		"panel":                           m.Panel,
		"record_id":                       m.RecordID,
		"endpoint":                        m.Endpoint,
		"eligible_locations":              append([]string{}, m.EligibleLocations...),
		"default_locations":               append([]string{}, m.DefaultLocations...),
		"overrides":                       navigationVisibilityMapAny(m.Overrides),
		"effective_visibility":            navigationVisibilityBoolMapAny(m.EffectiveVisibility),
		"effective_navigation_visibility": navigationVisibilityBoolMapAny(m.EffectiveVisibility),
		"effective_menu_locations":        append([]string{}, m.EffectiveMenuLocations...),
		"allow_instance_override":         m.AllowInstanceOverride,
		"view_permission":                 m.ViewPermission,
		"edit_permission":                 m.EditPermission,
		"permission_resource":             m.PermissionResource,
		"panel_view_permission":           m.PanelViewPermission,
		"panel_edit_permission":           m.PanelEditPermission,
		"activity_action":                 m.ActivityAction,
		"reason":                          m.Reason,
		"debug":                           cloneEntryNavigationDebug(m.Debug),
	}
}

func cloneEntryNavigationDebug(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := map[string]any{}
	for key, value := range in {
		if strings.TrimSpace(key) == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// BuildEntryNavigationViewModel resolves visibility, editability, and effective
// navigation state for a content entry.
//
//nolint:funlen // The view model assembly is kept together to preserve field/default ordering.
func BuildEntryNavigationViewModel(input EntryNavigationViewModelInput) (EntryNavigationViewModel, error) {
	model := EntryNavigationViewModel{
		Panel:                 strings.TrimSpace(input.PanelName),
		Endpoint:              strings.TrimSpace(input.Endpoint),
		ActivityAction:        strings.TrimSpace(primitives.FirstNonEmptyRaw(input.Policy.ActivityAction, DefaultEntryNavigationActivityAction)),
		AllowInstanceOverride: input.Policy.AllowInstanceOverride,
		ViewPermission:        strings.TrimSpace(input.Policy.ViewPermission),
		EditPermission:        strings.TrimSpace(input.Policy.EditPermission),
		PermissionResource:    entryNavigationPermissionResource(input.Policy),
		Debug:                 map[string]any{},
	}
	if input.Context == nil {
		input.Context = context.Background()
	}
	if input.ContentType != nil {
		model.ContentType = strings.TrimSpace(primitives.FirstNonEmptyRaw(input.ContentType.Slug, input.ContentType.Name, input.ContentType.ID))
	}
	if model.ContentType == "" {
		model.ContentType = strings.TrimSpace(model.Panel)
	}
	model.RecordID = strings.TrimSpace(extractRecordID(input.Record))
	if len(input.Record) == 0 {
		return hiddenEntryNavigationViewModel(model, "record_unavailable"), nil
	}
	if !input.Policy.Enabled {
		reason := "policy_disabled"
		if input.Policy.Excluded {
			reason = "content_type_excluded"
		}
		return hiddenEntryNavigationViewModel(model, reason), nil
	}
	eligible := dedupeAndSortStrings(input.Policy.EligibleLocations)
	if len(eligible) == 0 {
		return hiddenEntryNavigationViewModel(model, "no_eligible_locations"), nil
	}
	eval, ok := evaluateContentEntryNavigationFromRecord(input.Record, input.Policy)
	if !ok {
		return hiddenEntryNavigationViewModel(model, "evaluation_unavailable"), nil
	}
	model.EligibleLocations = eligible
	model.DefaultLocations = filterEntryNavigationDefaults(input.Policy.DefaultLocations, eligible)
	model.Overrides = eval.Overrides
	model.EffectiveVisibility = eval.EffectiveVisibility
	model.EffectiveMenuLocations = eval.EffectiveLocations

	perms := PanelPermissions{}
	if input.Panel != nil {
		perms = input.Panel.Schema().Permissions
	}
	model.PanelViewPermission = strings.TrimSpace(perms.View)
	model.PanelEditPermission = strings.TrimSpace(perms.Edit)
	panelViewAllowed := permissionAllowed(input.Authorizer, input.Context, model.PanelViewPermission, model.Panel)
	featureViewAllowed := permissionAllowed(input.Authorizer, input.Context, model.ViewPermission, model.PermissionResource)
	if !panelViewAllowed || !featureViewAllowed {
		model.Debug["panel_view_allowed"] = panelViewAllowed
		model.Debug["feature_view_allowed"] = featureViewAllowed
		return hiddenEntryNavigationViewModel(model, "view_permission_denied"), nil
	}
	panelEditAllowed := permissionAllowed(input.Authorizer, input.Context, model.PanelEditPermission, model.Panel)
	featureEditAllowed := permissionAllowed(input.Authorizer, input.Context, model.EditPermission, model.PermissionResource)
	model.Visible = true
	model.Editable = panelEditAllowed && featureEditAllowed && input.Policy.AllowInstanceOverride
	model.ReadOnly = !model.Editable
	model.Debug["panel_view_allowed"] = panelViewAllowed
	model.Debug["feature_view_allowed"] = featureViewAllowed
	model.Debug["panel_edit_allowed"] = panelEditAllowed
	model.Debug["feature_edit_allowed"] = featureEditAllowed
	return model, nil
}

func hiddenEntryNavigationViewModel(model EntryNavigationViewModel, reason string) EntryNavigationViewModel {
	model.Visible = false
	model.Editable = false
	model.ReadOnly = false
	model.Reason = strings.TrimSpace(reason)
	return model
}

func entryNavigationPanelAuthorizer(panel *Panel, fallback Authorizer) Authorizer {
	if panel != nil {
		if authorizer := panel.Authorizer(); authorizer != nil {
			return authorizer
		}
	}
	return fallback
}

func entryNavigationPermissionResource(policy EntryNavigationPolicy) string {
	if resource := strings.TrimSpace(policy.PermissionResource); resource != "" {
		return resource
	}
	return "content_navigation"
}

// NavigationOverrideModes returns the supported tri-state override values.
func NavigationOverrideModes() []string {
	return navigationOverrideModesContract()
}

func navigationOverrideModesContract() []string {
	return append([]string{}, navigationOverrideModes...)
}

// NormalizeNavigationOverrideMode normalizes a raw override value to inherit,
// show, or hide. Invalid values return an empty string.
func NormalizeNavigationOverrideMode(raw string) string {
	return normalizeNavigationOverrideMode(raw)
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

// NormalizeNavigationOverrideMap validates and normalizes an entry _navigation
// payload. Nil or empty maps return nil.
func NormalizeNavigationOverrideMap(raw any) (map[string]string, error) {
	return normalizeNavigationOverrideMap(raw)
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

// EntryNavigationPolicyFromContentType builds the entry-navigation policy from
// a CMS content type's capabilities.navigation contract.
func EntryNavigationPolicyFromContentType(contentType CMSContentType) EntryNavigationPolicy {
	return contentEntryNavigationPolicyFromContentType(contentType)
}

func contentEntryNavigationPolicyFromContentType(contentType CMSContentType) contentEntryNavigationPolicy {
	contracts := ReadContentTypeCapabilityContracts(contentType)
	if len(contracts.Navigation) == 0 {
		return contentEntryNavigationPolicy{}
	}
	return contentEntryNavigationPolicyFromCapability(contracts.Navigation)
}

func contentEntryNavigationPolicyFromContentTypeIfConfigured(contentType CMSContentType) (contentEntryNavigationPolicy, bool) {
	if !contentTypeHasEntryNavigationCapability(contentType) {
		return contentEntryNavigationPolicy{}, false
	}
	return contentEntryNavigationPolicyFromContentType(contentType), true
}

func contentEntryNavigationPolicyFromCapability(navigation map[string]any) contentEntryNavigationPolicy {
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
	policy.ActivityAction = DefaultEntryNavigationActivityAction
	return policy
}

// EntryNavigationPolicyFromOptions builds the merged entry-navigation policy for
// a content type using global options, capabilities.navigation, per-type
// options, and exclusions in that order.
func EntryNavigationPolicyFromOptions(contentType CMSContentType, options EntryNavigationOptions) EntryNavigationPolicy {
	return entryNavigationPolicyFromOptions(contentType, options)
}

func entryNavigationPolicyFromOptions(contentType CMSContentType, options EntryNavigationOptions) EntryNavigationPolicy {
	policy := entryNavigationPolicyFromGlobalOptions(options)
	capabilityEligibleLocationsSet := false
	contracts := ReadContentTypeCapabilityContracts(contentType)
	useCapabilityLocationFallback := entryNavigationShouldUseCapabilityLocationFallback(contentType, contracts, options)
	if navigation := entryNavigationCapabilityFieldsForPolicy(contentType, contracts); len(navigation) > 0 {
		capabilityEligibleLocationsSet = entryNavigationCapabilityEligibleLocationsFieldSet(contentType)
		policy = applyEntryNavigationCapabilityFields(policy, navigation)
	}

	typeOptions, hasTypeOptions := entryNavigationTypeOptionsFor(contentType, options)
	if hasTypeOptions && len(typeOptions.EligibleLocations) > 0 {
		useCapabilityLocationFallback = false
	}
	if hasTypeOptions {
		policy = applyEntryNavigationTypeOptions(policy, typeOptions, entryNavigationTypeOptionContext{
			preserveEmptyEligibleLocations: capabilityEligibleLocationsSet && len(policy.EligibleLocations) == 0,
		})
	}
	if policy.Enabled && useCapabilityLocationFallback && len(policy.EligibleLocations) == 0 {
		policy.EligibleLocations = dedupeAndSortStrings(toStringSlice(contracts.Navigation["eligible_locations"]))
		policy.DefaultLocations = dedupeAndSortStrings(toStringSlice(contracts.Navigation["default_locations"]))
	}
	if entryNavigationContentTypeExcluded(contentType, options) || (hasTypeOptions && typeOptions.Excluded) {
		policy.Enabled = false
		policy.EligibleLocations = nil
		policy.DefaultLocations = nil
		policy.AllowInstanceOverride = false
		policy.Excluded = true
	}
	policy.EligibleLocations = dedupeAndSortStrings(policy.EligibleLocations)
	policy.DefaultLocations = filterEntryNavigationDefaults(policy.DefaultLocations, policy.EligibleLocations)
	if policy.ActivityAction == "" {
		policy.ActivityAction = DefaultEntryNavigationActivityAction
	}
	return policy
}

func applyEntryNavigationCapabilityFields(policy contentEntryNavigationPolicy, navigation map[string]any) contentEntryNavigationPolicy {
	if len(navigation) == 0 {
		return policy
	}
	if raw, exists := entryNavigationCapabilityField(navigation, "enabled"); exists {
		policy.Enabled = toBool(raw)
		if !policy.Enabled {
			policy.EligibleLocations = nil
			policy.DefaultLocations = nil
			policy.AllowInstanceOverride = false
			return policy
		}
	}
	if raw, exists := entryNavigationCapabilityField(navigation, "eligible_locations"); exists {
		policy.EligibleLocations = dedupeAndSortStrings(toStringSlice(raw))
	}
	if raw, exists := entryNavigationCapabilityField(navigation, "default_locations"); exists {
		policy.DefaultLocations = dedupeAndSortStrings(toStringSlice(raw))
	}
	if raw, exists := entryNavigationCapabilityField(navigation, "default_visible"); exists {
		policy.DefaultVisible = toBool(raw)
	}
	if raw, exists := entryNavigationCapabilityField(navigation, "allow_instance_override"); exists {
		policy.AllowInstanceOverride = toBool(raw)
	}
	if policy.ActivityAction == "" {
		policy.ActivityAction = DefaultEntryNavigationActivityAction
	}
	return policy
}

func rawEntryNavigationCapability(contentType CMSContentType) map[string]any {
	raw, ok := capabilityValue(contentType.Capabilities, "navigation")
	if !ok {
		return nil
	}
	return extractMap(raw)
}

func entryNavigationCapabilityFieldsForPolicy(contentType CMSContentType, contracts ContentTypeCapabilityContracts) map[string]any {
	normalized := contracts.Navigation
	if len(normalized) == 0 {
		return nil
	}
	out := map[string]any{}
	if _, exists := entryNavigationRawCapabilityField(contentType, "enabled", "navigation_enabled"); exists {
		out["enabled"] = normalized["enabled"]
	} else if contracts.MigratedDeliveryMenu {
		out["enabled"] = normalized["enabled"]
	}

	if raw, exists := entryNavigationRawCapabilityField(contentType, "eligible_locations", "navigation_eligible_locations"); exists {
		if len(normalizeStringListAny(raw)) == 0 {
			out["eligible_locations"] = []string{}
			delete(out, "default_locations")
		} else {
			copyEntryNavigationNormalizedLocations(out, normalized)
		}
	} else if _, exists := entryNavigationRawCapabilityField(contentType, "default_locations", "navigation_default_locations"); exists || contracts.MigratedDeliveryMenu {
		copyEntryNavigationNormalizedLocations(out, normalized)
	}

	if _, exists := entryNavigationRawCapabilityField(contentType, "default_visible", "navigation_default_visible"); exists {
		out["default_visible"] = normalized["default_visible"]
	}
	if _, exists := entryNavigationRawCapabilityField(contentType, "allow_instance_override", "allow_instance_override"); exists {
		out["allow_instance_override"] = normalized["allow_instance_override"]
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func entryNavigationShouldUseCapabilityLocationFallback(contentType CMSContentType, contracts ContentTypeCapabilityContracts, options EntryNavigationOptions) bool {
	if len(contracts.Navigation) == 0 || !toBool(contracts.Navigation["enabled"]) {
		return false
	}
	if entryNavigationCapabilityLocationPolicySet(contentType, contracts) {
		return false
	}
	if len(options.EligibleLocations) > 0 {
		return false
	}
	return len(toStringSlice(contracts.Navigation["eligible_locations"])) > 0
}

func copyEntryNavigationNormalizedLocations(out map[string]any, normalized map[string]any) {
	if raw, exists := normalized["eligible_locations"]; exists {
		out["eligible_locations"] = raw
	}
	if raw, exists := normalized["default_locations"]; exists {
		out["default_locations"] = raw
	}
}

func entryNavigationRawCapabilityField(contentType CMSContentType, nestedKey string, flatKey string) (any, bool) {
	if navigation := rawEntryNavigationCapability(contentType); len(navigation) > 0 {
		if raw, exists := entryNavigationCapabilityField(navigation, nestedKey); exists {
			return raw, true
		}
	}
	if flatKey == "" {
		return nil, false
	}
	return capabilityValue(contentType.Capabilities, flatKey)
}

func entryNavigationCapabilityEligibleLocationsFieldSet(contentType CMSContentType) bool {
	_, exists := entryNavigationRawCapabilityField(contentType, "eligible_locations", "navigation_eligible_locations")
	return exists
}

func entryNavigationCapabilityLocationPolicySet(contentType CMSContentType, contracts ContentTypeCapabilityContracts) bool {
	if contracts.MigratedDeliveryMenu {
		return true
	}
	if _, exists := entryNavigationRawCapabilityField(contentType, "eligible_locations", "navigation_eligible_locations"); exists {
		return true
	}
	if _, exists := entryNavigationRawCapabilityField(contentType, "default_locations", "navigation_default_locations"); exists {
		return true
	}
	return false
}

func entryNavigationCapabilityField(navigation map[string]any, key string) (any, bool) {
	return capabilityValue(navigation, key)
}

func entryNavigationPolicyFromGlobalOptions(options EntryNavigationOptions) EntryNavigationPolicy {
	eligible := dedupeAndSortStrings(options.EligibleLocations)
	enabled := len(eligible) > 0
	if options.Enabled != nil {
		enabled = *options.Enabled
	}
	defaultVisible := true
	if options.DefaultVisible != nil {
		defaultVisible = *options.DefaultVisible
	}
	allowInstanceOverride := true
	if options.AllowInstanceOverride != nil {
		allowInstanceOverride = *options.AllowInstanceOverride
	}
	return EntryNavigationPolicy{
		Enabled:               enabled,
		EligibleLocations:     eligible,
		DefaultLocations:      filterEntryNavigationDefaults(options.DefaultLocations, eligible),
		DefaultVisible:        defaultVisible,
		AllowInstanceOverride: allowInstanceOverride,
		ViewPermission:        strings.TrimSpace(options.ViewPermission),
		EditPermission:        strings.TrimSpace(options.EditPermission),
		PermissionResource:    strings.TrimSpace(options.PermissionResource),
		ActivityAction:        strings.TrimSpace(primitives.FirstNonEmptyRaw(options.ActivityAction, DefaultEntryNavigationActivityAction)),
	}
}

func entryNavigationPolicyFromContentTypeWithOptions(contentType CMSContentType, options EntryNavigationOptions, optionsSet bool) (contentEntryNavigationPolicy, bool) {
	if !optionsSet {
		return contentEntryNavigationPolicyFromContentTypeIfConfigured(contentType)
	}
	if !contentTypeHasEntryNavigationCapability(contentType) && !entryNavigationOptionsConfiguredForContentType(contentType, options) {
		return contentEntryNavigationPolicy{}, false
	}
	return entryNavigationPolicyFromOptions(contentType, options), true
}

func contentTypeHasEntryNavigationCapability(contentType CMSContentType) bool {
	return len(ReadContentTypeCapabilityContracts(contentType).Navigation) > 0
}

func entryNavigationOptionsConfiguredForContentType(contentType CMSContentType, options EntryNavigationOptions) bool {
	if entryNavigationGlobalPolicyOptionsConfigured(options) {
		return true
	}
	if entryNavigationContentTypeExcluded(contentType, options) {
		return true
	}
	typeOptions, ok := entryNavigationTypeOptionsFor(contentType, options)
	return ok && entryNavigationTypePolicyOptionsConfigured(typeOptions)
}

func entryNavigationGlobalPolicyOptionsConfigured(options EntryNavigationOptions) bool {
	return len(options.EligibleLocations) > 0
}

func entryNavigationTypePolicyOptionsConfigured(options EntryNavigationTypeOptions) bool {
	return options.Excluded ||
		len(options.EligibleLocations) > 0
}

type entryNavigationTypeOptionContext struct {
	preserveEmptyEligibleLocations bool
}

func applyEntryNavigationTypeOptions(policy EntryNavigationPolicy, options EntryNavigationTypeOptions, ctx entryNavigationTypeOptionContext) EntryNavigationPolicy {
	if len(options.EligibleLocations) > 0 {
		policy.EligibleLocations = narrowEntryNavigationLocations(policy.EligibleLocations, options.EligibleLocations, ctx.preserveEmptyEligibleLocations)
	}
	if len(options.DefaultLocations) > 0 {
		policy.DefaultLocations = options.DefaultLocations
	}
	if options.DefaultVisible != nil {
		policy.DefaultVisible = *options.DefaultVisible
	}
	if options.AllowInstanceOverride != nil && !*options.AllowInstanceOverride {
		policy.AllowInstanceOverride = false
	}
	if value := strings.TrimSpace(options.ViewPermission); value != "" {
		policy.ViewPermission = value
	}
	if value := strings.TrimSpace(options.EditPermission); value != "" {
		policy.EditPermission = value
	}
	if value := strings.TrimSpace(options.PermissionResource); value != "" {
		policy.PermissionResource = value
	}
	if value := strings.TrimSpace(options.ActivityAction); value != "" {
		policy.ActivityAction = value
	}
	return policy
}

func narrowEntryNavigationLocations(current, requested []string, preserveEmptyCurrent bool) []string {
	requested = dedupeAndSortStrings(requested)
	if len(current) == 0 {
		if preserveEmptyCurrent {
			return nil
		}
		return requested
	}
	currentSet := contentNavigationLocationSet(dedupeAndSortStrings(current))
	out := []string{}
	for _, location := range requested {
		if _, ok := currentSet[location]; ok {
			out = append(out, location)
		}
	}
	return dedupeAndSortStrings(out)
}

func filterEntryNavigationDefaults(defaults, eligible []string) []string {
	if len(defaults) == 0 || len(eligible) == 0 {
		return nil
	}
	eligibleSet := contentNavigationLocationSet(dedupeAndSortStrings(eligible))
	out := []string{}
	for _, location := range dedupeAndSortStrings(defaults) {
		if _, ok := eligibleSet[location]; ok {
			out = append(out, location)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func entryNavigationTypeOptionsFor(contentType CMSContentType, options EntryNavigationOptions) (EntryNavigationTypeOptions, bool) {
	if len(options.ContentTypes) == 0 {
		return EntryNavigationTypeOptions{}, false
	}
	keys := entryNavigationContentTypeKeys(contentType)
	for _, key := range keys {
		for candidate, value := range options.ContentTypes {
			if normalizeEntryNavigationContentTypeKey(candidate) == key {
				return value, true
			}
		}
	}
	return EntryNavigationTypeOptions{}, false
}

func entryNavigationContentTypeExcluded(contentType CMSContentType, options EntryNavigationOptions) bool {
	if len(options.ExcludedContentTypes) == 0 {
		return false
	}
	keys := contentNavigationLocationSet(entryNavigationContentTypeKeys(contentType))
	for _, excluded := range options.ExcludedContentTypes {
		if _, ok := keys[normalizeEntryNavigationContentTypeKey(excluded)]; ok {
			return true
		}
	}
	return false
}

func entryNavigationContentTypeKeys(contentType CMSContentType) []string {
	values := []string{contentType.Slug, contentType.Name, contentType.ID}
	out := []string{}
	for _, value := range values {
		if key := normalizeEntryNavigationContentTypeKey(value); key != "" {
			out = append(out, key)
		}
	}
	return dedupeAndSortStrings(out)
}

func normalizeEntryNavigationContentTypeKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

// ResolveEntryNavigationPolicy resolves a content type by slug or ID and
// returns its entry-navigation policy.
func ResolveEntryNavigationPolicy(ctx context.Context, service CMSContentTypeService, contentTypeKey string) (EntryNavigationPolicy, bool) {
	return resolveContentEntryNavigationPolicy(ctx, service, contentTypeKey)
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
		return contentEntryNavigationPolicyFromContentTypeIfConfigured(*record)
	}
	if record, err := service.ContentType(ctx, key); err == nil && record != nil {
		return contentEntryNavigationPolicyFromContentTypeIfConfigured(*record)
	}
	return contentEntryNavigationPolicy{}, false
}

func resolveContentEntryNavigationPolicyWithOptionalOptions(ctx context.Context, service CMSContentTypeService, contentTypeKey string, options EntryNavigationOptions, optionsSet bool) (contentEntryNavigationPolicy, bool) {
	if !optionsSet {
		return resolveContentEntryNavigationPolicy(ctx, service, contentTypeKey)
	}
	if service == nil {
		return contentEntryNavigationPolicy{}, false
	}
	key := strings.TrimSpace(contentTypeKey)
	if key == "" {
		return contentEntryNavigationPolicy{}, false
	}
	if record, err := service.ContentTypeBySlug(ctx, key); err == nil && record != nil {
		return entryNavigationPolicyFromContentTypeWithOptions(*record, options, true)
	}
	if record, err := service.ContentType(ctx, key); err == nil && record != nil {
		return entryNavigationPolicyFromContentTypeWithOptions(*record, options, true)
	}
	return contentEntryNavigationPolicy{}, false
}

// ResolveEntryNavigationPolicyWithOptions resolves and merges entry navigation
// options for a content type.
func ResolveEntryNavigationPolicyWithOptions(ctx context.Context, service CMSContentTypeService, contentTypeKey string, options EntryNavigationOptions) (EntryNavigationPolicy, bool) {
	return resolveContentEntryNavigationPolicyWithOptionalOptions(ctx, service, contentTypeKey, options, true)
}

// EvaluateEntryNavigation normalizes overrides and computes effective menu
// locations and visibility for a policy. Strict mode rejects invalid locations
// and disabled policies; non-strict mode drops invalid locations and returns an
// empty result for disabled policies.
func EvaluateEntryNavigation(rawOverrides any, policy EntryNavigationPolicy, strict bool) (EntryNavigationEvaluation, error) {
	return evaluateContentEntryNavigation(rawOverrides, policy, strict)
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
	if overrides, err = validateNavigationOverrides(overrides, eligible, strict); err != nil {
		return contentEntryNavigationEvaluation{}, err
	}
	if !policy.AllowInstanceOverride {
		overrides = nil
	}

	defaultSet := contentNavigationLocationSet(dedupeAndSortStrings(policy.DefaultLocations))
	visibility, locations := evaluateContentNavigationVisibility(eligible, overrides, defaultSet, policy)
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

// ValidateEntryNavigationOverrides ensures override locations are eligible for
// a policy. Strict mode returns a validation error; non-strict mode drops
// ineligible locations.
func ValidateEntryNavigationOverrides(overrides map[string]string, eligible []string, strict bool) (map[string]string, error) {
	return validateNavigationOverrides(overrides, eligible, strict)
}

func validateNavigationOverrides(overrides map[string]string, eligible []string, strict bool) (map[string]string, error) {
	if len(overrides) == 0 {
		return overrides, nil
	}
	eligibleSet := contentNavigationLocationSet(eligible)
	for location := range overrides {
		if _, ok := eligibleSet[location]; ok {
			continue
		}
		if strict {
			return nil, validationDomainError("invalid navigation location override", map[string]any{
				"field":             "_navigation." + location,
				"location":          location,
				"allowed_locations": eligible,
				"guidance":          contentNavigationValidationContract(),
			})
		}
		delete(overrides, location)
	}
	return overrides, nil
}

func contentNavigationLocationSet(locations []string) map[string]struct{} {
	out := map[string]struct{}{}
	for _, location := range locations {
		out[location] = struct{}{}
	}
	return out
}

// EvaluateEntryNavigationVisibility computes effective visibility for all
// eligible locations using normalized overrides and defaults.
func EvaluateEntryNavigationVisibility(eligible []string, overrides map[string]string, defaultSet map[string]struct{}, policy EntryNavigationPolicy) (map[string]bool, []string) {
	return evaluateContentNavigationVisibility(eligible, overrides, defaultSet, policy)
}

func evaluateContentNavigationVisibility(eligible []string, overrides map[string]string, defaultSet map[string]struct{}, policy contentEntryNavigationPolicy) (map[string]bool, []string) {
	visibility := map[string]bool{}
	locations := make([]string, 0, len(eligible))
	for _, location := range eligible {
		visible := resolveContentNavigationVisibility(location, overrides, defaultSet, policy)
		visibility[location] = visible
		if visible {
			locations = append(locations, location)
		}
	}
	return visibility, locations
}

// ResolveEntryNavigationVisibility resolves a single location to its effective
// visible state.
func ResolveEntryNavigationVisibility(location string, overrides map[string]string, defaultSet map[string]struct{}, policy EntryNavigationPolicy) bool {
	return resolveContentNavigationVisibility(location, overrides, defaultSet, policy)
}

func resolveContentNavigationVisibility(location string, overrides map[string]string, defaultSet map[string]struct{}, policy contentEntryNavigationPolicy) bool {
	mode := NavigationOverrideInherit
	if policy.AllowInstanceOverride {
		if override := normalizeNavigationOverrideMode(overrides[location]); override != "" {
			mode = override
		}
	}
	switch mode {
	case NavigationOverrideShow:
		return true
	case NavigationOverrideHide:
		return false
	default:
		_, inDefaults := defaultSet[location]
		return policy.DefaultVisible && inDefaults
	}
}

// EvaluateEntryNavigationFromRecord extracts _navigation from a record and
// computes the effective entry-navigation contract.
func EvaluateEntryNavigationFromRecord(record map[string]any, policy EntryNavigationPolicy) (EntryNavigationEvaluation, bool) {
	return evaluateContentEntryNavigationFromRecord(record, policy)
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

// ApplyEntryNavigationWriteContract normalizes _navigation and writes the
// effective visibility fields onto a mutable record before persistence.
func ApplyEntryNavigationWriteContract(record map[string]any, policy EntryNavigationPolicy, always bool) error {
	return applyContentEntryNavigationWrite(record, policy, always)
}

func applyContentEntryNavigationWrite(record map[string]any, policy contentEntryNavigationPolicy, always bool) error {
	if record == nil {
		return nil
	}
	rawOverrides, hasOverride := contentEntryNavigationWriteOverrides(record)
	if !always && !hasOverride {
		return nil
	}

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

func contentEntryNavigationWriteOverrides(record map[string]any) (any, bool) {
	if record == nil {
		return nil, false
	}
	if recordHasKey(record, "_navigation") {
		return record["_navigation"], true
	}
	if data, ok := record["data"].(map[string]any); ok {
		raw, exists := data["_navigation"]
		return raw, exists
	}
	return nil, false
}

// ApplyEntryNavigationReadContract returns a cloned record with normalized
// _navigation, effective_menu_locations, and effective_navigation_visibility.
func ApplyEntryNavigationReadContract(record map[string]any, policy EntryNavigationPolicy) map[string]any {
	return applyContentEntryNavigationReadContract(record, policy)
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
