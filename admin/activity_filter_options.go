package admin

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/goliatone/go-auth"
	usertypes "github.com/goliatone/go-users/pkg/types"
)

const (
	activityFilterOptionsDefaultMax = 100
	activityFilterOptionsHardMax    = 500
	activityFilterOptionsSafetyMax  = 1500
	activityFilterOptionMaxBytes    = 256
)

// ActivityFilterOption is one stable machine value and its display label.
type ActivityFilterOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// ActivityFilterOptions is the normalized Activity filter catalog returned to
// the browser. Revision is opaque provider metadata, not a response validator.
type ActivityFilterOptions struct {
	Verbs       []ActivityFilterOption `json:"verbs"`
	Channels    []ActivityFilterOption `json:"channels"`
	ObjectTypes []ActivityFilterOption `json:"object_types"`
	Revision    string                 `json:"revision,omitempty"`
}

// ActivityFilterOptionsConfig declares host-curated baseline options.
type ActivityFilterOptionsConfig struct {
	Verbs       []ActivityFilterOption `json:"verbs"`
	Channels    []ActivityFilterOption `json:"channels"`
	ObjectTypes []ActivityFilterOption `json:"object_types"`
	MaxOptions  int                    `json:"max_options,omitempty"`
}

// ActivityFilterSelection carries browser-owned values independently from the
// trusted visibility filter used for option discovery.
type ActivityFilterSelection struct {
	Verbs      []string `json:"verbs,omitempty"`
	Channels   []string `json:"channels,omitempty"`
	ObjectType string   `json:"object_type,omitempty"`
}

// ActivityFilterOptionsQuery contains trusted request context for providers
// and policies. Callers receive detached values that are safe to mutate.
type ActivityFilterOptionsQuery struct {
	ReadContext     ActivityReadContext
	EffectiveFilter usertypes.ActivityFilter
	Selected        ActivityFilterSelection
}

// ActivityFilterOptionsProvider returns a request-time authorized option
// snapshot. Implementations are trusted backend integrations.
type ActivityFilterOptionsProvider interface {
	ActivityFilterOptions(context.Context, ActivityFilterOptionsQuery) (ActivityFilterOptions, error)
}

// ActivityFilterOptionsProviderFunc adapts a function into a provider.
type ActivityFilterOptionsProviderFunc func(context.Context, ActivityFilterOptionsQuery) (ActivityFilterOptions, error)

// ActivityFilterOptions implements ActivityFilterOptionsProvider.
func (f ActivityFilterOptionsProviderFunc) ActivityFilterOptions(ctx context.Context, query ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
	return f(ctx, query)
}

// ActivityFilterOptionsPolicy applies host guards to the complete Config and
// provider result. Errors fail closed.
type ActivityFilterOptionsPolicy interface {
	FilterActivityFilterOptions(context.Context, ActivityFilterOptionsQuery, ActivityFilterOptions) (ActivityFilterOptions, error)
}

// ActivityFilterOptionsPolicyFunc adapts a function into a policy.
type ActivityFilterOptionsPolicyFunc func(context.Context, ActivityFilterOptionsQuery, ActivityFilterOptions) (ActivityFilterOptions, error)

// FilterActivityFilterOptions implements ActivityFilterOptionsPolicy.
func (f ActivityFilterOptionsPolicyFunc) FilterActivityFilterOptions(ctx context.Context, query ActivityFilterOptionsQuery, options ActivityFilterOptions) (ActivityFilterOptions, error) {
	return f(ctx, query, options)
}

func normalizeActivityFilterOptionsConfig(cfg ActivityFilterOptionsConfig) ActivityFilterOptionsConfig {
	cfg.MaxOptions = effectiveActivityFilterOptionsMax(cfg.MaxOptions)
	cfg.Verbs = normalizeActivityFilterOptionList(cfg.Verbs, activityFilterOptionsHardMax)
	cfg.Channels = normalizeActivityFilterOptionList(cfg.Channels, activityFilterOptionsHardMax)
	cfg.ObjectTypes = normalizeActivityFilterOptionList(cfg.ObjectTypes, activityFilterOptionsHardMax)
	return cfg
}

func effectiveActivityFilterOptionsMax(value int) int {
	if value <= 0 {
		return activityFilterOptionsDefaultMax
	}
	if value > activityFilterOptionsHardMax {
		return activityFilterOptionsHardMax
	}
	return value
}

func normalizeActivityFilterOptionList(options []ActivityFilterOption, limit int) []ActivityFilterOption {
	if limit <= 0 || len(options) == 0 {
		return []ActivityFilterOption{}
	}
	normalized := make([]ActivityFilterOption, 0, min(len(options), limit))
	seen := make(map[string]struct{}, min(len(options), limit))
	for _, option := range options {
		value := strings.TrimSpace(option.Value)
		label := strings.TrimSpace(option.Label)
		if value == "" || !utf8.ValidString(value) || !utf8.ValidString(label) || len(value) > activityFilterOptionMaxBytes || len(label) > activityFilterOptionMaxBytes {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		if label == "" {
			label = value
		}
		seen[value] = struct{}{}
		normalized = append(normalized, ActivityFilterOption{Value: value, Label: label})
		if len(normalized) == limit {
			break
		}
	}
	return normalized
}

func normalizeActivityFilterSelection(selection ActivityFilterSelection, maxOptions int) (ActivityFilterSelection, error) {
	maxOptions = effectiveActivityFilterOptionsMax(maxOptions)
	verbs, err := normalizeActivityFilterSelectionValues(selection.Verbs, maxOptions, "verb")
	if err != nil {
		return ActivityFilterSelection{}, err
	}
	channels, err := normalizeActivityFilterSelectionValues(selection.Channels, maxOptions, "channels")
	if err != nil {
		return ActivityFilterSelection{}, err
	}
	objectTypes, err := normalizeActivityFilterSelectionValues([]string{selection.ObjectType}, 1, "object_type")
	if err != nil {
		return ActivityFilterSelection{}, err
	}
	objectType := ""
	if len(objectTypes) > 0 {
		objectType = objectTypes[0]
	}
	return ActivityFilterSelection{Verbs: verbs, Channels: channels, ObjectType: objectType}, nil
}

func normalizeActivityFilterSelectionValues(values []string, limit int, field string) ([]string, error) {
	normalized := make([]string, 0, min(len(values), limit))
	seen := make(map[string]struct{}, min(len(values), limit))
	for _, raw := range values {
		for part := range strings.SplitSeq(raw, ",") {
			value := strings.TrimSpace(part)
			if value == "" {
				continue
			}
			if !utf8.ValidString(value) || len(value) > activityFilterOptionMaxBytes {
				return nil, activityQueryError(field, fmt.Sprintf("%s values must not exceed %d bytes", field, activityFilterOptionMaxBytes))
			}
			if _, ok := seen[value]; ok {
				continue
			}
			seen[value] = struct{}{}
			normalized = append(normalized, value)
			if len(normalized) > limit {
				return nil, activityQueryError(field, fmt.Sprintf("%s accepts at most %d values", field, limit))
			}
		}
	}
	return normalized, nil
}

func (a *Admin) resolveActivityFilterOptions(
	ctx context.Context,
	actorCtx *auth.ActorContext,
	readCtx ActivityReadContext,
	selection ActivityFilterSelection,
) (ActivityFilterOptions, error) {
	maxOptions := effectiveActivityFilterOptionsMax(a.config.ActivityFilterOptions.MaxOptions)
	selected, err := normalizeActivityFilterSelection(selection, maxOptions)
	if err != nil {
		return ActivityFilterOptions{}, err
	}

	baseFilter := usertypes.ActivityFilter{Actor: readCtx.Actor, Scope: readCtx.Scope.Clone()}
	effectiveFilter := baseFilter
	if a.activityPolicy != nil {
		role := ""
		if actorCtx != nil {
			role = actorCtx.Role
		}
		effectiveFilter, err = a.activityPolicy.Apply(actorCtx, role, baseFilter)
		if err != nil {
			return ActivityFilterOptions{}, err
		}
	}

	query := ActivityFilterOptionsQuery{
		ReadContext:     cloneActivityReadContext(readCtx),
		EffectiveFilter: cloneActivityFilter(effectiveFilter),
		Selected:        cloneActivityFilterSelection(selected),
	}
	configured := optionsFromActivityFilterOptionsConfig(a.config.ActivityFilterOptions)
	merged := cloneActivityFilterOptions(configured)
	providerRevision := ""

	if a.activityFilterOptionsProvider != nil {
		provided, providerErr := a.activityFilterOptionsProvider.ActivityFilterOptions(ctx, cloneActivityFilterOptionsQuery(query))
		if providerErr != nil {
			a.reportActivityFilterOptionsProviderError(providerErr)
		} else if activityFilterOptionsExceeds(provided, activityFilterOptionsHardMax) {
			a.reportActivityFilterOptionsProviderError(fmt.Errorf("activity filter options provider exceeded %d entries per category", activityFilterOptionsHardMax))
		} else {
			provided = normalizeActivityFilterOptions(provided, activityFilterOptionsHardMax)
			merged = mergeActivityFilterOptions(merged, provided)
			providerRevision = normalizeActivityFilterOptionsRevision(provided.Revision)
		}
	}

	merged = addActivityFilterSelectedOptions(merged, selected)
	if activityFilterOptionsExceeds(merged, activityFilterOptionsSafetyMax) {
		return ActivityFilterOptions{}, fmt.Errorf("activity filter options merge exceeded safety limit")
	}

	if a.activityFilterOptionsPolicy != nil {
		merged, err = a.activityFilterOptionsPolicy.FilterActivityFilterOptions(
			ctx,
			cloneActivityFilterOptionsQuery(query),
			cloneActivityFilterOptions(merged),
		)
		if err != nil {
			return ActivityFilterOptions{}, err
		}
		if activityFilterOptionsExceeds(merged, activityFilterOptionsSafetyMax) {
			return ActivityFilterOptions{}, fmt.Errorf("activity filter options policy exceeded %d entries per category", activityFilterOptionsSafetyMax)
		}
	}

	merged = normalizeActivityFilterOptions(merged, activityFilterOptionsSafetyMax)
	merged.Verbs = boundActivityFilterOptions(merged.Verbs, selected.Verbs, maxOptions)
	merged.Channels = boundActivityFilterOptions(merged.Channels, selected.Channels, maxOptions)
	merged.ObjectTypes = boundActivityFilterOptions(merged.ObjectTypes, []string{selected.ObjectType}, maxOptions)
	merged.Revision = providerRevision
	return merged, nil
}

func optionsFromActivityFilterOptionsConfig(cfg ActivityFilterOptionsConfig) ActivityFilterOptions {
	return ActivityFilterOptions{
		Verbs:       cloneActivityFilterOptionList(cfg.Verbs),
		Channels:    cloneActivityFilterOptionList(cfg.Channels),
		ObjectTypes: cloneActivityFilterOptionList(cfg.ObjectTypes),
	}
}

func normalizeActivityFilterOptions(options ActivityFilterOptions, limit int) ActivityFilterOptions {
	return ActivityFilterOptions{
		Verbs:       normalizeActivityFilterOptionList(options.Verbs, limit),
		Channels:    normalizeActivityFilterOptionList(options.Channels, limit),
		ObjectTypes: normalizeActivityFilterOptionList(options.ObjectTypes, limit),
		Revision:    normalizeActivityFilterOptionsRevision(options.Revision),
	}
}

func normalizeActivityFilterOptionsRevision(revision string) string {
	revision = strings.TrimSpace(revision)
	if !utf8.ValidString(revision) || len(revision) > activityFilterOptionMaxBytes {
		return ""
	}
	return revision
}

func mergeActivityFilterOptions(configured, provided ActivityFilterOptions) ActivityFilterOptions {
	return ActivityFilterOptions{
		Verbs:       mergeActivityFilterOptionLists(configured.Verbs, provided.Verbs),
		Channels:    mergeActivityFilterOptionLists(configured.Channels, provided.Channels),
		ObjectTypes: mergeActivityFilterOptionLists(configured.ObjectTypes, provided.ObjectTypes),
	}
}

func mergeActivityFilterOptionLists(configured, provided []ActivityFilterOption) []ActivityFilterOption {
	merged := cloneActivityFilterOptionList(configured)
	seen := make(map[string]struct{}, len(configured)+len(provided))
	for _, option := range configured {
		seen[option.Value] = struct{}{}
	}
	for _, option := range provided {
		if _, ok := seen[option.Value]; ok {
			continue
		}
		seen[option.Value] = struct{}{}
		merged = append(merged, option)
	}
	return merged
}

func addActivityFilterSelectedOptions(options ActivityFilterOptions, selected ActivityFilterSelection) ActivityFilterOptions {
	options.Verbs = addActivityFilterSelectedList(options.Verbs, selected.Verbs)
	options.Channels = addActivityFilterSelectedList(options.Channels, selected.Channels)
	options.ObjectTypes = addActivityFilterSelectedList(options.ObjectTypes, []string{selected.ObjectType})
	return options
}

func addActivityFilterSelectedList(options []ActivityFilterOption, selected []string) []ActivityFilterOption {
	seen := make(map[string]struct{}, len(options)+len(selected))
	for _, option := range options {
		seen[option.Value] = struct{}{}
	}
	for _, value := range selected {
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		options = append(options, ActivityFilterOption{Value: value, Label: value})
	}
	return options
}

func boundActivityFilterOptions(options []ActivityFilterOption, selected []string, limit int) []ActivityFilterOption {
	sortActivityFilterOptions(options)
	byValue := make(map[string]ActivityFilterOption, len(options))
	for _, option := range options {
		byValue[option.Value] = option
	}
	bounded := make([]ActivityFilterOption, 0, min(len(options), limit))
	added := make(map[string]struct{}, len(options))
	for _, value := range selected {
		if option, ok := byValue[value]; ok && len(bounded) < limit {
			bounded = append(bounded, option)
			added[value] = struct{}{}
		}
	}
	for _, option := range options {
		if len(bounded) == limit {
			break
		}
		if _, ok := added[option.Value]; ok {
			continue
		}
		bounded = append(bounded, option)
	}
	sortActivityFilterOptions(bounded)
	return bounded
}

func sortActivityFilterOptions(options []ActivityFilterOption) {
	sort.SliceStable(options, func(i, j int) bool {
		left := strings.ToLower(options[i].Label)
		right := strings.ToLower(options[j].Label)
		if left == right {
			return options[i].Value < options[j].Value
		}
		return left < right
	})
}

func activityFilterOptionsExceeds(options ActivityFilterOptions, limit int) bool {
	return len(options.Verbs) > limit || len(options.Channels) > limit || len(options.ObjectTypes) > limit
}

func cloneActivityFilterOptionsQuery(query ActivityFilterOptionsQuery) ActivityFilterOptionsQuery {
	return ActivityFilterOptionsQuery{
		ReadContext:     cloneActivityReadContext(query.ReadContext),
		EffectiveFilter: cloneActivityFilter(query.EffectiveFilter),
		Selected:        cloneActivityFilterSelection(query.Selected),
	}
}

func cloneActivityReadContext(readCtx ActivityReadContext) ActivityReadContext {
	readCtx.Scope = readCtx.Scope.Clone()
	return readCtx
}

func cloneActivityFilter(filter usertypes.ActivityFilter) usertypes.ActivityFilter {
	filter.Scope = filter.Scope.Clone()
	filter.Verbs = append([]string(nil), filter.Verbs...)
	filter.Channels = append([]string(nil), filter.Channels...)
	filter.ChannelDenylist = append([]string(nil), filter.ChannelDenylist...)
	filter.MachineActorTypes = append([]string(nil), filter.MachineActorTypes...)
	filter.MachineDataKeys = append([]string(nil), filter.MachineDataKeys...)
	if filter.MachineActivityEnabled != nil {
		enabled := *filter.MachineActivityEnabled
		filter.MachineActivityEnabled = &enabled
	}
	return filter
}

func cloneActivityFilterSelection(selection ActivityFilterSelection) ActivityFilterSelection {
	selection.Verbs = append([]string(nil), selection.Verbs...)
	selection.Channels = append([]string(nil), selection.Channels...)
	return selection
}

func cloneActivityFilterOptions(options ActivityFilterOptions) ActivityFilterOptions {
	options.Verbs = cloneActivityFilterOptionList(options.Verbs)
	options.Channels = cloneActivityFilterOptionList(options.Channels)
	options.ObjectTypes = cloneActivityFilterOptionList(options.ObjectTypes)
	return options
}

func cloneActivityFilterOptionList(options []ActivityFilterOption) []ActivityFilterOption {
	return append([]ActivityFilterOption(nil), options...)
}

func (a *Admin) reportActivityFilterOptionsProviderError(err error) {
	if a == nil || err == nil {
		return
	}
	a.loggerFor("admin.activity").Warn("activity filter options provider degraded", "error", err)
}
