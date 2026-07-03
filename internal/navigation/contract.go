package navigation

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"maps"
	"reflect"
	"slices"
	"sort"
	"strings"
)

const (
	EngineIdentity = "go-admin.internal.navigation"
	EngineVersion  = "2026-06-11.1"
)

type Classification string

const (
	ClassificationRendered              Classification = "rendered"
	ClassificationPersistedMissing      Classification = "persisted_missing"
	ClassificationRawPresentNotRendered Classification = "raw_present_not_rendered"
	ClassificationPermissionFiltered    Classification = "permission_filtered"
	ClassificationCapabilityOmitted     Classification = "capability_omitted"
	ClassificationRouteMissing          Classification = "route_missing"
	ClassificationStaleFields           Classification = "stale_fields"
	ClassificationAmbiguousDuplicate    Classification = "ambiguous_duplicate"
	ClassificationRetired               Classification = "retired"
	ClassificationCustom                Classification = "custom"
	ClassificationUnsafeBroadMatch      Classification = "unsafe_broad_match"
)

var allClassifications = []Classification{
	ClassificationRendered,
	ClassificationPersistedMissing,
	ClassificationRawPresentNotRendered,
	ClassificationPermissionFiltered,
	ClassificationCapabilityOmitted,
	ClassificationRouteMissing,
	ClassificationStaleFields,
	ClassificationAmbiguousDuplicate,
	ClassificationRetired,
	ClassificationCustom,
	ClassificationUnsafeBroadMatch,
}

func AllClassifications() []Classification {
	return append([]Classification{}, allClassifications...)
}

type Owner string

const (
	OwnerUnknown    Owner = ""
	OwnerQuickstart Owner = "quickstart"
	OwnerModule     Owner = "module"
	OwnerHost       Owner = "host"
	OwnerUser       Owner = "user"
)

const (
	TargetGeneratedByKey       = "_generated_by"
	TargetGeneratedIDKey       = "_generated_id"
	TargetProgrammaticOwnerKey = "_menu_owner"
	TargetProgrammaticOwner    = "go-admin.programmatic"
	TargetProgrammaticIDKey    = "_menu_owner_id"
	TargetPlacementSlotKey     = "_placement_slot"
)

type Item struct {
	ID            string
	Code          string
	Type          string
	Label         string
	LabelKey      string
	GroupTitle    string
	GroupTitleKey string
	URLOverride   *string
	Target        map[string]any
	Icon          string
	Position      *int
	PlacementSlot string
	Permissions   []string
	Badge         map[string]any
	Classes       []string
	Styles        map[string]string
	Menu          string
	ParentID      string
	ParentCode    string
	Locale        string
	Collapsible   bool
	Collapsed     bool
}

type ExpectedItem struct {
	Item               Item
	Owner              Owner
	OwnerID            string
	Retired            bool
	RouteMissing       bool
	CapabilityOmitted  bool
	PermissionFiltered bool
}

type MatchPolicy struct {
	Owner                  Owner
	AllowLegacyRouteMatch  bool
	AllowUnsafeBroadRepair bool
}

type MatchResult struct {
	Item        Item
	Key         string
	Matched     bool
	Ambiguous   bool
	UnsafeBroad bool
}

func RequestScopedTargetKeys() []string {
	return []string{
		"enabled",
		"disabled",
		"aria_disabled",
		"disabled_reason",
		"disabled_reason_code",
		"missing_permission",
	}
}

func CleanTarget(target map[string]any) map[string]any {
	if len(target) == 0 {
		return nil
	}
	out := cloneMap(target)
	for _, key := range RequestScopedTargetKeys() {
		delete(out, key)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func HasRequestScopedTargetState(item Item) bool {
	for _, key := range RequestScopedTargetKeys() {
		if _, ok := item.Target[key]; ok {
			return true
		}
	}
	return false
}

func ResolveOwner(item Item) Owner {
	if strings.EqualFold(TargetString(item.Target, TargetGeneratedByKey), string(OwnerQuickstart)) {
		return OwnerQuickstart
	}
	if strings.EqualFold(TargetString(item.Target, TargetProgrammaticOwnerKey), TargetProgrammaticOwner) {
		return OwnerModule
	}
	return OwnerUnknown
}

func OwnerID(item Item) string {
	for _, candidate := range []string{
		TargetString(item.Target, TargetGeneratedIDKey),
		TargetString(item.Target, TargetProgrammaticIDKey),
		TargetString(item.Target, "key"),
		TargetString(item.Target, "name"),
		TargetString(item.Target, "route_name"),
		TargetString(item.Target, "route"),
		strings.TrimSpace(item.ID),
		TargetString(item.Target, "path"),
	} {
		if candidate != "" {
			return candidate
		}
	}
	return ""
}

func MarkProgrammatic(item Item) Item {
	itemType := strings.ToLower(strings.TrimSpace(item.Type))
	if itemType == "group" || itemType == "separator" || len(item.Target) == 0 {
		return item
	}
	target := cloneMap(item.Target)
	target[TargetProgrammaticOwnerKey] = TargetProgrammaticOwner
	if TargetString(target, TargetProgrammaticIDKey) == "" {
		target[TargetProgrammaticIDKey] = OwnerID(Item{ID: item.ID, Target: target})
	}
	item.Target = target
	return item
}

func IdentityKeys(item Item) []string {
	keys := []string{}
	if id := strings.TrimSpace(item.ID); id != "" {
		normalizedID := strings.ToLower(id)
		keys = append(keys, "path:"+normalizedID, "id:"+normalizedID)
		if idx := strings.Index(id, "."); idx >= 0 && idx+1 < len(id) {
			suffix := strings.ToLower(strings.TrimSpace(id[idx+1:]))
			keys = append(keys, "id_suffix:"+suffix)
		}
		if idx := strings.LastIndex(id, "."); idx >= 0 && idx+1 < len(id) {
			suffix := strings.ToLower(strings.TrimSpace(id[idx+1:]))
			keys = append(keys, "id_suffix:"+suffix)
		}
	}
	if code := strings.TrimSpace(item.Code); code != "" {
		keys = append(keys, "code:"+strings.ToLower(code))
	}
	if generatedID := TargetString(item.Target, TargetGeneratedIDKey); generatedID != "" {
		keys = append(keys, "generated_id:"+strings.ToLower(generatedID))
	}
	if strings.EqualFold(TargetString(item.Target, TargetProgrammaticOwnerKey), TargetProgrammaticOwner) {
		if ownerID := TargetString(item.Target, TargetProgrammaticIDKey); ownerID != "" {
			keys = append(keys, "programmatic_id:"+strings.ToLower(ownerID))
		}
	}
	if key := TargetString(item.Target, "key"); key != "" {
		keys = append(keys, "target_key:"+strings.ToLower(key))
	}
	if name := TargetString(item.Target, "name"); name != "" {
		keys = append(keys, "target_name:"+strings.ToLower(name))
	}
	if routeName := TargetString(item.Target, "route_name"); routeName != "" {
		keys = append(keys, "target_name:"+strings.ToLower(routeName))
	}
	if route := TargetString(item.Target, "route"); route != "" {
		keys = append(keys, "target_name:"+strings.ToLower(route))
	}
	if path := TargetString(item.Target, "path"); path != "" {
		keys = append(keys, "target_path:"+strings.ToLower(path))
	}
	return unique(keys)
}

func StrongIdentityKeys(item Item) []string {
	keys := []string{}
	for _, key := range IdentityKeys(item) {
		if StrongIdentityKey(key) {
			keys = append(keys, key)
		}
	}
	return unique(keys)
}

func StrongIdentityKey(key string) bool {
	return strings.HasPrefix(key, "path:") ||
		strings.HasPrefix(key, "id:") ||
		strings.HasPrefix(key, "code:") ||
		strings.HasPrefix(key, "generated_id:") ||
		strings.HasPrefix(key, "programmatic_id:")
}

func ShareIdentityKey(a, b Item) bool {
	keys := map[string]bool{}
	for _, key := range IdentityKeys(a) {
		keys[key] = true
	}
	for _, key := range IdentityKeys(b) {
		if keys[key] {
			return true
		}
	}
	return false
}

func StronglyAppearsIn(item Item, items []Item) bool {
	keys := map[string]bool{}
	for _, key := range StrongIdentityKeys(item) {
		keys[key] = true
	}
	if len(keys) == 0 {
		return false
	}
	for _, existing := range items {
		for _, key := range StrongIdentityKeys(existing) {
			if keys[key] {
				return true
			}
		}
	}
	return false
}

func FindMatch(expected Item, actual []Item, policy MatchPolicy) MatchResult {
	switch policy.Owner {
	case OwnerQuickstart:
		return findQuickstartMatch(expected, actual)
	case OwnerModule:
		return findModuleMatch(expected, actual, policy)
	default:
		return findGenericMatch(expected, actual, policy)
	}
}

func EquivalentManagedFields(actual, expected Item) bool {
	actual = comparableItem(actual)
	expected = comparableItem(expected)
	return reflect.DeepEqual(actual, expected)
}

func TargetString(target map[string]any, key string) string {
	if target == nil {
		return ""
	}
	value, ok := target[key]
	if !ok || value == nil {
		return ""
	}
	return primitives.StringFromAny(value)
}

func MissingRoute(item Item) bool {
	return strings.EqualFold(TargetString(item.Target, "type"), "url") &&
		strings.TrimSpace(TargetString(item.Target, "path")) == "" &&
		strings.TrimSpace(TargetString(item.Target, "url")) == ""
}

type ClassifiedItem struct {
	CanonicalID    string         `json:"canonical_id"`
	Classification Classification `json:"classification"`
	Owner          Owner          `json:"owner,omitempty"`
	OwnerID        string         `json:"owner_id,omitempty"`
	IdentityKey    string         `json:"identity_key,omitempty"`
	ProposedAction string         `json:"proposed_action,omitempty"`
	Evidence       []string       `json:"evidence,omitempty"`
}

type ClassificationReport struct {
	EngineIdentity      string           `json:"engine_identity"`
	EngineVersion       string           `json:"engine_version"`
	Environment         string           `json:"environment,omitempty"`
	EnvironmentSource   string           `json:"environment_source,omitempty"`
	CoordinationBackend string           `json:"coordination_backend,omitempty"`
	CoordinationScope   string           `json:"coordination_scope,omitempty"`
	CoordinationWarning string           `json:"coordination_warning,omitempty"`
	PersistenceBackend  string           `json:"persistence_backend,omitempty"`
	RawInventoryScope   string           `json:"raw_inventory_scope,omitempty"`
	PersistenceWarnings []string         `json:"persistence_warnings,omitempty"`
	Items               []ClassifiedItem `json:"items"`
}

func Classify(expected []ExpectedItem, rendered, raw []Item) ClassificationReport {
	report := ClassificationReport{EngineIdentity: EngineIdentity, EngineVersion: EngineVersion}
	merged := mergeInventories(rendered, raw)
	expectedKeys := map[string]bool{}
	for _, exp := range expected {
		for _, key := range IdentityKeys(exp.Item) {
			expectedKeys[key] = true
		}
		item := classifyExpected(exp, rendered, raw, merged)
		report.Items = append(report.Items, item)
	}
	for _, item := range merged {
		if matchesExpectedKeys(item, expectedKeys) {
			continue
		}
		owner := ResolveOwner(item)
		classification := ClassificationCustom
		if owner == OwnerQuickstart || owner == OwnerModule {
			classification = ClassificationRetired
		}
		report.Items = append(report.Items, ClassifiedItem{
			CanonicalID:    strings.TrimSpace(item.ID),
			Classification: classification,
			Owner:          owner,
			OwnerID:        OwnerID(item),
			ProposedAction: proposedAction(classification),
		})
	}
	sort.SliceStable(report.Items, func(i, j int) bool {
		if report.Items[i].Classification == report.Items[j].Classification {
			return report.Items[i].CanonicalID < report.Items[j].CanonicalID
		}
		return report.Items[i].Classification < report.Items[j].Classification
	})
	return report
}

func findQuickstartMatch(expected Item, actual []Item) MatchResult {
	generatedID := strings.ToLower(TargetString(expected.Target, TargetGeneratedIDKey))
	if generatedID != "" {
		if matches := quickstartGeneratedIDMatches(actual, generatedID); len(matches) > 0 {
			return matchResult(matches, "generated_owned_id", false)
		}
	}
	if matches := ownedMatches(expected, actual, OwnerQuickstart); len(matches) > 0 {
		return matchResult(matches, "generated_owned", false)
	}
	if generatedID != "" {
		if matches := nonQuickstartGeneratedIDMatches(actual, generatedID); len(matches) > 0 {
			return matchResult(matches, "generated_id", false)
		}
	}
	return matchResult(legacyQuickstartMatches(expected, actual), "legacy_generated", false)
}

func quickstartGeneratedIDMatches(actual []Item, generatedID string) []Item {
	matches := []Item{}
	for _, item := range actual {
		if ResolveOwner(item) != OwnerQuickstart {
			continue
		}
		if strings.ToLower(TargetString(item.Target, TargetGeneratedIDKey)) == generatedID {
			matches = appendUniqueItem(matches, item)
		}
	}
	return matches
}

func nonQuickstartGeneratedIDMatches(actual []Item, generatedID string) []Item {
	matches := []Item{}
	for _, item := range actual {
		if ResolveOwner(item) == OwnerQuickstart {
			continue
		}
		if strings.ToLower(TargetString(item.Target, TargetGeneratedIDKey)) == generatedID {
			matches = appendUniqueItem(matches, item)
		}
	}
	return matches
}

func legacyQuickstartMatches(expected Item, actual []Item) []Item {
	matches := []Item{}
	for _, item := range actual {
		if ResolveOwner(item) == OwnerQuickstart || TargetString(item.Target, TargetGeneratedIDKey) != "" {
			continue
		}
		if legacyGeneratedMatch(expected, item) {
			matches = appendUniqueItem(matches, item)
		}
	}
	return matches
}

func findModuleMatch(expected Item, actual []Item, policy MatchPolicy) MatchResult {
	if matches := ownedMatches(expected, actual, OwnerModule); len(matches) > 0 {
		return matchResult(matches, "module_owned", false)
	}
	return findGenericMatch(expected, actual, policy)
}

func findGenericMatch(expected Item, actual []Item, policy MatchPolicy) MatchResult {
	for _, key := range IdentityKeys(expected) {
		if !StrongIdentityKey(key) {
			continue
		}
		matches := compatibleMatches(expected, key, actual)
		if len(matches) > 0 {
			return matchResult(matches, key, false)
		}
	}
	for _, key := range IdentityKeys(expected) {
		if StrongIdentityKey(key) {
			continue
		}
		matches := compatibleMatches(expected, key, actual)
		if len(matches) == 0 {
			continue
		}
		if !policy.AllowUnsafeBroadRepair && !legacyProgrammaticRepairCandidate(expected, matches[0], key) {
			result := matchResult(matches, key, true)
			result.UnsafeBroad = true
			return result
		}
		return matchResult(matches, key, false)
	}
	return MatchResult{}
}

func ownedMatches(expected Item, actual []Item, owner Owner) []Item {
	out := []Item{}
	expectedKeys := IdentityKeys(expected)
	for _, item := range actual {
		if ResolveOwner(item) != owner {
			continue
		}
		if compatibleOwnedMatch(expected, item, expectedKeys) {
			out = appendUniqueItem(out, item)
		}
	}
	return out
}

func compatibleOwnedMatch(expected, actual Item, expectedKeys []string) bool {
	actualKeys := map[string]bool{}
	for _, key := range IdentityKeys(actual) {
		actualKeys[key] = true
	}
	for _, key := range expectedKeys {
		if !actualKeys[key] {
			continue
		}
		if compatibleMatch(expected, actual, key) {
			return true
		}
	}
	return false
}

func compatibleMatches(expected Item, key string, actual []Item) []Item {
	out := []Item{}
	for _, item := range actual {
		if !contains(IdentityKeys(item), key) {
			continue
		}
		if !compatibleMatch(expected, item, key) {
			continue
		}
		out = appendUniqueItem(out, item)
	}
	return out
}

func compatibleMatch(expected, existing Item, key string) bool {
	if !strings.HasPrefix(key, "target_path:") {
		return true
	}
	expectedParent := strings.ToLower(strings.TrimSpace(expected.ParentID))
	existingParent := strings.ToLower(strings.TrimSpace(existing.ParentID))
	if expectedParent != "" || existingParent != "" {
		return expectedParent == existingParent
	}
	return true
}

func legacyProgrammaticRepairCandidate(expected, existing Item, key string) bool {
	if StrongIdentityKey(key) {
		return true
	}
	if ResolveOwner(existing) == OwnerModule {
		return true
	}
	if legacyEquivalentModuleRow(expected, existing) {
		return true
	}
	expectedPath := TargetString(expected.Target, "path")
	existingPath := TargetString(existing.Target, "path")
	if expectedPath != "" && existingPath == "" {
		return true
	}
	if containsFold(existing.Permissions, "admin.archive.view") && !containsFold(expected.Permissions, "admin.archive.view") {
		return true
	}
	return false
}

func legacyEquivalentModuleRow(expected, existing Item) bool {
	if ResolveOwner(existing) != OwnerUnknown {
		return false
	}
	if !sameMenuParent(expected, existing) || !sameNormalizedIDSegment(expected.ID, existing.ID) {
		return false
	}
	if !sameNonEmptyTargetValue(expected, existing, "key") || !sameNonEmptyTargetValue(expected, existing, "path") {
		return false
	}
	return compatibleMenuLabel(expected, existing)
}

func sameMenuParent(expected, existing Item) bool {
	return strings.EqualFold(menuParentIdentity(expected), menuParentIdentity(existing))
}

func menuParentIdentity(item Item) string {
	if parent := strings.TrimSpace(primitives.FirstNonEmpty(item.ParentID, item.ParentCode)); parent != "" {
		return strings.ToLower(parent)
	}
	id := strings.TrimSpace(item.ID)
	if idx := strings.LastIndex(id, "."); idx > 0 {
		return strings.ToLower(strings.TrimSpace(id[:idx]))
	}
	return ""
}

func sameNormalizedIDSegment(left, right string) bool {
	left = normalizedIDSegment(left)
	right = normalizedIDSegment(right)
	return left != "" && left == right
}

func normalizedIDSegment(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if idx := strings.LastIndex(value, "."); idx >= 0 && idx+1 < len(value) {
		value = strings.TrimSpace(value[idx+1:])
	}
	value = strings.ReplaceAll(value, "_", "-")
	return value
}

func sameNonEmptyTargetValue(expected, existing Item, key string) bool {
	expectedValue := strings.ToLower(TargetString(expected.Target, key))
	existingValue := strings.ToLower(TargetString(existing.Target, key))
	return expectedValue != "" && existingValue != "" && expectedValue == existingValue
}

func compatibleMenuLabel(expected, existing Item) bool {
	expectedLabelKey := strings.ToLower(strings.TrimSpace(expected.LabelKey))
	existingLabelKey := strings.ToLower(strings.TrimSpace(existing.LabelKey))
	if expectedLabelKey != "" && existingLabelKey != "" {
		return expectedLabelKey == existingLabelKey
	}
	expectedLabel := strings.ToLower(strings.TrimSpace(expected.Label))
	existingLabel := strings.ToLower(strings.TrimSpace(existing.Label))
	if expectedLabel != "" && existingLabel != "" {
		return expectedLabel == existingLabel
	}
	return expectedLabelKey == "" && existingLabelKey == "" && expectedLabel == "" && existingLabel == ""
}

func legacyGeneratedMatch(expected, actual Item) bool {
	if legacyGeneratedRouteIdentityMatches(expected, actual) {
		return true
	}
	if !legacyIDMatches(expected, actual) {
		return false
	}
	expectedKey := strings.ToLower(TargetString(expected.Target, "key"))
	actualKey := strings.ToLower(TargetString(actual.Target, "key"))
	if expectedKey != "" && actualKey != "" {
		return expectedKey == actualKey
	}
	expectedPath := strings.ToLower(TargetString(expected.Target, "path"))
	actualPath := strings.ToLower(TargetString(actual.Target, "path"))
	if expectedPath != "" && actualPath != "" {
		return expectedPath == actualPath
	}
	return expectedKey == "" && actualKey == "" && expectedPath == "" && actualPath == ""
}

func legacyGeneratedRouteIdentityMatches(expected, actual Item) bool {
	expectedParent := strings.ToLower(strings.TrimSpace(expected.ParentID))
	actualParent := strings.ToLower(strings.TrimSpace(actual.ParentID))
	if expectedParent == "" || actualParent == "" || expectedParent != actualParent {
		return false
	}
	if !legacyIDSuffixMatches(expected, actual) {
		return false
	}
	for _, key := range []string{"key", "path", "name", "route_name"} {
		if expectedValue, actualValue := strings.ToLower(TargetString(expected.Target, key)), strings.ToLower(TargetString(actual.Target, key)); expectedValue != "" && actualValue != "" && expectedValue == actualValue {
			return true
		}
	}
	return false
}

func legacyIDMatches(expected, actual Item) bool {
	expectedID := strings.ToLower(strings.TrimSpace(expected.ID))
	actualID := strings.ToLower(strings.TrimSpace(actual.ID))
	if expectedID == "" || actualID == "" {
		return false
	}
	if expectedID == actualID {
		return true
	}
	if legacyIDSuffixMatches(expected, actual) {
		return true
	}
	if idx := strings.Index(expectedID, "."); idx >= 0 && idx+1 < len(expectedID) {
		if actualID == strings.TrimSpace(expectedID[idx+1:]) {
			return true
		}
	}
	itemType := strings.ToLower(strings.TrimSpace(expected.Type))
	if itemType != "group" && !expected.Collapsible {
		return false
	}
	if idx := strings.LastIndex(expectedID, "."); idx >= 0 && idx+1 < len(expectedID) {
		return actualID == strings.TrimSpace(expectedID[idx+1:])
	}
	return false
}

func legacyIDSuffixMatches(expected, actual Item) bool {
	expectedID := strings.ToLower(strings.TrimSpace(expected.ID))
	actualID := strings.ToLower(strings.TrimSpace(actual.ID))
	if expectedID == "" || actualID == "" || !legacyIDPrefixCompatible(expectedID, actualID) {
		return false
	}
	expectedParts := strings.Split(expectedID, ".")
	actualParts := strings.Split(actualID, ".")
	if len(expectedParts) < 2 || len(actualParts) < 2 {
		return false
	}
	return strings.Join(expectedParts[len(expectedParts)-2:], ".") == strings.Join(actualParts[len(actualParts)-2:], ".")
}

func legacyIDPrefixCompatible(expectedID, actualID string) bool {
	expectedParts := strings.Split(strings.ToLower(strings.TrimSpace(expectedID)), ".")
	actualParts := strings.Split(strings.ToLower(strings.TrimSpace(actualID)), ".")
	return len(expectedParts) > 0 && len(actualParts) > 0 && expectedParts[0] != "" && expectedParts[0] == actualParts[0]
}

func matchResult(matches []Item, key string, unsafe bool) MatchResult {
	if len(matches) == 0 {
		return MatchResult{}
	}
	if len(matches) > 1 {
		return MatchResult{Key: key, Ambiguous: true, UnsafeBroad: unsafe}
	}
	if unsafe {
		return MatchResult{Item: matches[0], Key: key, UnsafeBroad: true}
	}
	return MatchResult{Item: matches[0], Key: key, Matched: true, UnsafeBroad: unsafe}
}

func comparableItem(item Item) Item {
	item.Code = ""
	item.Menu = ""
	item.Target = CleanTarget(item.Target)
	if len(item.Target) == 0 {
		item.Target = nil
	}
	if len(item.Permissions) == 0 {
		item.Permissions = nil
	}
	return item
}

func classifyExpected(exp ExpectedItem, rendered, raw, merged []Item) ClassifiedItem {
	canonicalID := strings.TrimSpace(exp.Item.ID)
	item := ClassifiedItem{CanonicalID: canonicalID, Owner: exp.Owner, OwnerID: primitives.FirstNonEmpty(exp.OwnerID, OwnerID(exp.Item))}
	switch {
	case exp.Retired:
		item.Classification = ClassificationRetired
	case exp.RouteMissing || MissingRoute(exp.Item):
		item.Classification = ClassificationRouteMissing
	case exp.CapabilityOmitted:
		item.Classification = ClassificationCapabilityOmitted
	case exp.PermissionFiltered:
		item.Classification = ClassificationPermissionFiltered
	default:
		match := FindMatch(exp.Item, merged, MatchPolicy{Owner: exp.Owner})
		item.IdentityKey = match.Key
		switch {
		case match.Ambiguous:
			item.Classification = ClassificationAmbiguousDuplicate
		case match.UnsafeBroad:
			item.Classification = ClassificationUnsafeBroadMatch
		case !match.Matched:
			item.Classification = ClassificationPersistedMissing
		case !StronglyAppearsIn(match.Item, rendered) && StronglyAppearsIn(match.Item, raw):
			item.Classification = ClassificationRawPresentNotRendered
		case !EquivalentManagedFields(match.Item, exp.Item) || HasRequestScopedTargetState(match.Item):
			item.Classification = ClassificationStaleFields
		default:
			item.Classification = ClassificationRendered
		}
	}
	item.ProposedAction = proposedAction(item.Classification)
	return item
}

func proposedAction(classification Classification) string {
	switch classification {
	case ClassificationPersistedMissing:
		return "create"
	case ClassificationRawPresentNotRendered, ClassificationStaleFields:
		return "repair"
	case ClassificationAmbiguousDuplicate, ClassificationUnsafeBroadMatch:
		return "manual_review"
	case ClassificationRetired:
		return "remove_when_owned"
	case ClassificationRouteMissing:
		return "fix_route"
	default:
		return "none"
	}
}

func mergeInventories(rendered, raw []Item) []Item {
	if len(raw) == 0 {
		return append([]Item{}, rendered...)
	}
	out := append([]Item{}, rendered...)
	for _, item := range raw {
		if StronglyAppearsIn(item, out) {
			continue
		}
		out = append(out, item)
	}
	return out
}

func matchesExpectedKeys(item Item, expectedKeys map[string]bool) bool {
	for _, key := range IdentityKeys(item) {
		if expectedKeys[key] {
			return true
		}
	}
	return false
}

func appendUniqueItem(items []Item, item Item) []Item {
	key := itemIdentity(item)
	for _, existing := range items {
		if key != "" && itemIdentity(existing) == key {
			return items
		}
	}
	return append(items, item)
}

func itemIdentity(item Item) string {
	if id := strings.ToLower(strings.TrimSpace(item.ID)); id != "" {
		return "id:" + id
	}
	if code := strings.ToLower(strings.TrimSpace(item.Code)); code != "" {
		return "code:" + code
	}
	if ownerID := TargetString(item.Target, TargetProgrammaticIDKey); ownerID != "" {
		return "programmatic:" + strings.ToLower(ownerID)
	}
	if generatedID := TargetString(item.Target, TargetGeneratedIDKey); generatedID != "" {
		return "generated:" + strings.ToLower(generatedID)
	}
	return ""
}

func cloneMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]any, len(input))
	maps.Copy(out, input)
	return out
}

func unique(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}

func contains(values []string, want string) bool {
	return slices.Contains(values, want)
}

func containsFold(values []string, want string) bool {
	want = strings.ToLower(strings.TrimSpace(want))
	if want == "" {
		return false
	}
	for _, value := range values {
		if strings.ToLower(strings.TrimSpace(value)) == want {
			return true
		}
	}
	return false
}
