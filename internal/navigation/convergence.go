package navigation

import (
	"sort"
	"strings"
)

type ConvergenceAction string

const (
	ConvergenceNoop      ConvergenceAction = "noop"
	ConvergenceCreate    ConvergenceAction = "create"
	ConvergenceUpdate    ConvergenceAction = "update"
	ConvergenceReplace   ConvergenceAction = "replace"
	ConvergenceAmbiguous ConvergenceAction = "ambiguous"
	ConvergenceUnsafe    ConvergenceAction = "unsafe_broad_match"
)

type PreserveManagedFieldsFunc func(actual, expected Item) (Item, []string)

type ConvergenceOptions struct {
	MatchPolicy      MatchPolicy
	Apply            bool
	AllowDestructive bool
	Preserve         PreserveManagedFieldsFunc
}

type PlannedItem struct {
	Action               ConvergenceAction
	Expected             Item
	Actual               Item
	Update               Item
	MatchKey             string
	Matched              bool
	Ambiguous            bool
	UnsafeBroad          bool
	StaleTargetState     bool
	DestructiveCandidate bool
	PreservedFields      []string
}

type ConvergencePlan struct {
	EngineIdentity string
	EngineVersion  string
	ExpectedKeys   []string
	Items          []PlannedItem
}

func PlanConvergence(expected, actual []Item, opts ConvergenceOptions) ConvergencePlan {
	plan := ConvergencePlan{
		EngineIdentity: EngineIdentity,
		EngineVersion:  EngineVersion,
	}
	expectedKeys := map[string]bool{}
	for _, item := range expected {
		for _, key := range IdentityKeys(item) {
			expectedKeys[key] = true
		}
		plan.Items = append(plan.Items, PlanExpectedItem(item, actual, opts))
	}
	plan.ExpectedKeys = sortedKeys(expectedKeys)
	return plan
}

func PlanExpectedItem(expected Item, actual []Item, opts ConvergenceOptions) PlannedItem {
	match := FindMatch(expected, actual, opts.MatchPolicy)
	planned := PlannedItem{
		Expected:    expected,
		Update:      expected,
		MatchKey:    match.Key,
		Ambiguous:   match.Ambiguous,
		UnsafeBroad: match.UnsafeBroad,
	}
	switch {
	case match.Ambiguous:
		planned.Action = ConvergenceAmbiguous
		return planned
	case match.UnsafeBroad && !match.Matched:
		planned.Action = ConvergenceUnsafe
		return planned
	case !match.Matched:
		planned.Action = ConvergenceCreate
		return planned
	}

	planned.Actual = match.Item
	planned.Matched = true
	planned.StaleTargetState = HasRequestScopedTargetState(match.Item)
	if opts.Preserve != nil {
		planned.Update, planned.PreservedFields = opts.Preserve(match.Item, expected)
	}
	planned = planReplacement(planned, opts)
	if planned.Action == ConvergenceReplace {
		return planned
	}
	if EquivalentManagedFields(match.Item, planned.Update) {
		planned.Action = ConvergenceNoop
		return planned
	}
	planned.Action = ConvergenceUpdate
	return planned
}

func planReplacement(planned PlannedItem, opts ConvergenceOptions) PlannedItem {
	actualID := strings.TrimSpace(planned.Actual.ID)
	updateID := strings.TrimSpace(planned.Update.ID)
	if actualID == "" || strings.EqualFold(actualID, updateID) {
		return planned
	}
	planned.DestructiveCandidate = true
	if opts.Apply && (opts.AllowDestructive || ResolveOwner(planned.Actual) == opts.MatchPolicy.Owner) {
		planned.Action = ConvergenceReplace
		return planned
	}
	planned.Update.ID = planned.Actual.ID
	planned.Update.Code = strings.TrimSpace(planned.Actual.Code)
	if planned.Update.Code == "" || strings.EqualFold(planned.Update.Code, updateID) {
		planned.Update.Code = planned.Actual.ID
	}
	planned.PreservedFields = append(planned.PreservedFields, planned.Update.ID+":id")
	return planned
}

func sortedKeys(values map[string]bool) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for value := range values {
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}
