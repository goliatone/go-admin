package quickstart

import (
	"fmt"
	"net/http"
	"sort"
	"strings"

	goerrors "github.com/goliatone/go-errors"
)

type ContentEntryUpdateIntentAmbiguity string

const (
	ContentEntryUpdateIntentReject   ContentEntryUpdateIntentAmbiguity = "reject"
	ContentEntryUpdateIntentPreserve ContentEntryUpdateIntentAmbiguity = "preserve"
	ContentEntryUpdateIntentReplace  ContentEntryUpdateIntentAmbiguity = "replace"
)

type ContentEntryUpdateIntentPolicy struct {
	Arrays map[string]ContentEntryUpdateIntentArrayPolicy `json:"arrays"`
}

type ContentEntryUpdateIntentArrayPolicy struct {
	Mode               string                           `json:"mode"`
	Identity           []string                         `json:"identity"`
	ReferenceFields    []string                         `json:"reference_fields"`
	DeleteField        string                           `json:"delete_field"`
	Ambiguous          ContentEntryUpdateIntentAmbiguity `json:"ambiguous"`
	AllowIndexFallback bool                             `json:"allow_index_fallback"`
}

type contentEntryUpdateIntentPathSegment struct {
	Name  string
	Array bool
}

type contentEntryArrayIntentMarkers struct {
	Present bool
	Complete bool
	Clear bool
	Seen bool
}

func contentEntryApplyUpdateIntent(
	record map[string]any,
	existing map[string]any,
	schema map[string]any,
	uiSchema map[string]any,
	capabilities map[string]any,
	options ContentEntryUpdateIntentPolicy,
) (map[string]any, error) {
	policy := contentEntryUpdateIntentPolicy(schema, uiSchema, capabilities, options)
	if len(policy.Arrays) == 0 {
		return record, nil
	}
	if record == nil {
		record = map[string]any{}
	}
	if existing == nil {
		existing = map[string]any{}
	}
	out := deepCloneAnyMap(record)
	paths := contentEntryUpdateIntentPaths(policy)
	for _, path := range paths {
		arrayPolicy := policy.Arrays[path]
		segments := parseContentEntryUpdateIntentPath(path)
		if len(segments) == 0 {
			continue
		}
		if err := applyContentEntryUpdateIntentPath(out, existing, segments, arrayPolicy); err != nil {
			return nil, contentEntryUpdateIntentError(path, err)
		}
	}
	return out, nil
}

func contentEntryUpdateIntentPolicy(schema map[string]any, uiSchema map[string]any, capabilities map[string]any, options ContentEntryUpdateIntentPolicy) ContentEntryUpdateIntentPolicy {
	out := ContentEntryUpdateIntentPolicy{Arrays: map[string]ContentEntryUpdateIntentArrayPolicy{}}
	mergeContentEntryUpdateIntentPolicy(&out, contentEntryUpdateIntentPolicyFromMap(schema))
	mergeContentEntryUpdateIntentPolicy(&out, contentEntryUpdateIntentPolicyFromMap(uiSchema))
	mergeContentEntryUpdateIntentPolicy(&out, contentEntryUpdateIntentPolicyFromMap(capabilities))
	mergeContentEntryUpdateIntentPolicy(&out, options)
	return normalizeContentEntryUpdateIntentPolicy(out)
}

func contentEntryUpdateIntentPolicyFromMap(raw map[string]any) ContentEntryUpdateIntentPolicy {
	if len(raw) == 0 {
		return ContentEntryUpdateIntentPolicy{}
	}
	for _, source := range contentEntryUpdateIntentSources(raw) {
		intent, ok := anyMap(source["updateIntent"])
		if !ok {
			intent, ok = anyMap(source["update_intent"])
		}
		if !ok {
			intent, ok = anyMap(source["update-intent"])
		}
		if !ok {
			continue
		}
		return contentEntryUpdateIntentPolicyFromIntentMap(intent)
	}
	return ContentEntryUpdateIntentPolicy{}
}

func contentEntryUpdateIntentSources(raw map[string]any) []map[string]any {
	sources := []map[string]any{raw}
	for _, key := range []string{"x-go-admin", "x_go_admin", "xGoAdmin"} {
		if nested, ok := anyMap(raw[key]); ok {
			sources = append(sources, nested)
		}
	}
	return sources
}

func contentEntryUpdateIntentPolicyFromIntentMap(intent map[string]any) ContentEntryUpdateIntentPolicy {
	arrays, ok := anyMap(intent["arrays"])
	if !ok {
		return ContentEntryUpdateIntentPolicy{}
	}
	out := ContentEntryUpdateIntentPolicy{Arrays: map[string]ContentEntryUpdateIntentArrayPolicy{}}
	for path, raw := range arrays {
		trimmedPath := strings.TrimSpace(path)
		if trimmedPath == "" {
			continue
		}
		cfg, ok := anyMap(raw)
		if !ok {
			continue
		}
		out.Arrays[trimmedPath] = contentEntryUpdateIntentArrayPolicyFromMap(cfg)
	}
	return out
}

func contentEntryUpdateIntentArrayPolicyFromMap(raw map[string]any) ContentEntryUpdateIntentArrayPolicy {
	return ContentEntryUpdateIntentArrayPolicy{
		Mode:               strings.TrimSpace(anyToString(raw["mode"])),
		Identity:           contentEntryStringList(raw["identity"]),
		ReferenceFields:    firstStringList(raw["referenceFields"], raw["reference_fields"]),
		DeleteField:        firstNonEmpty(strings.TrimSpace(anyToString(raw["deleteField"])), strings.TrimSpace(anyToString(raw["delete_field"]))),
		Ambiguous:          ContentEntryUpdateIntentAmbiguity(strings.TrimSpace(anyToString(raw["ambiguous"]))),
		AllowIndexFallback: anyBool(raw["allowIndexFallback"]) || anyBool(raw["allow_index_fallback"]),
	}
}

func mergeContentEntryUpdateIntentPolicy(dst *ContentEntryUpdateIntentPolicy, src ContentEntryUpdateIntentPolicy) {
	if dst == nil || len(src.Arrays) == 0 {
		return
	}
	if dst.Arrays == nil {
		dst.Arrays = map[string]ContentEntryUpdateIntentArrayPolicy{}
	}
	for path, policy := range src.Arrays {
		if strings.TrimSpace(path) == "" {
			continue
		}
		dst.Arrays[strings.TrimSpace(path)] = policy
	}
}

func normalizeContentEntryUpdateIntentPolicy(policy ContentEntryUpdateIntentPolicy) ContentEntryUpdateIntentPolicy {
	if len(policy.Arrays) == 0 {
		return ContentEntryUpdateIntentPolicy{}
	}
	out := ContentEntryUpdateIntentPolicy{Arrays: map[string]ContentEntryUpdateIntentArrayPolicy{}}
	for path, arrayPolicy := range policy.Arrays {
		path = strings.TrimSpace(path)
		if path == "" {
			continue
		}
		arrayPolicy.Mode = strings.ToLower(strings.TrimSpace(arrayPolicy.Mode))
		if arrayPolicy.Mode == "" {
			arrayPolicy.Mode = "patch"
		}
		if arrayPolicy.Mode != "patch" {
			continue
		}
		arrayPolicy.DeleteField = strings.TrimSpace(arrayPolicy.DeleteField)
		if arrayPolicy.DeleteField == "" {
			arrayPolicy.DeleteField = "_delete"
		}
		arrayPolicy.Ambiguous = normalizeContentEntryUpdateIntentAmbiguity(arrayPolicy.Ambiguous)
		arrayPolicy.Identity = normalizeContentEntryUpdateIntentIdentity(arrayPolicy.Identity, arrayPolicy.ReferenceFields)
		arrayPolicy.ReferenceFields = normalizeStringList(arrayPolicy.ReferenceFields)
		out.Arrays[path] = arrayPolicy
	}
	if len(out.Arrays) == 0 {
		return ContentEntryUpdateIntentPolicy{}
	}
	return out
}

func normalizeContentEntryUpdateIntentAmbiguity(raw ContentEntryUpdateIntentAmbiguity) ContentEntryUpdateIntentAmbiguity {
	switch ContentEntryUpdateIntentAmbiguity(strings.ToLower(strings.TrimSpace(string(raw)))) {
	case ContentEntryUpdateIntentPreserve:
		return ContentEntryUpdateIntentPreserve
	case ContentEntryUpdateIntentReplace:
		return ContentEntryUpdateIntentReplace
	default:
		return ContentEntryUpdateIntentReject
	}
}

func normalizeContentEntryUpdateIntentIdentity(identity []string, referenceFields []string) []string {
	values := []string{"id", "_row_key"}
	values = append(values, identity...)
	values = append(values, referenceFields...)
	return normalizeStringList(values)
}

func normalizeStringList(values []string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func contentEntryUpdateIntentPaths(policy ContentEntryUpdateIntentPolicy) []string {
	paths := make([]string, 0, len(policy.Arrays))
	for path := range policy.Arrays {
		paths = append(paths, path)
	}
	sort.Slice(paths, func(i, j int) bool {
		left := strings.Count(paths[i], ".")
		right := strings.Count(paths[j], ".")
		if left == right {
			return paths[i] < paths[j]
		}
		return left > right
	})
	return paths
}

func parseContentEntryUpdateIntentPath(path string) []contentEntryUpdateIntentPathSegment {
	parts := strings.Split(strings.TrimSpace(path), ".")
	segments := []contentEntryUpdateIntentPathSegment{}
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			return nil
		}
		segment := contentEntryUpdateIntentPathSegment{Name: strings.TrimSuffix(part, "[]")}
		segment.Array = strings.HasSuffix(part, "[]")
		if segment.Name == "" {
			return nil
		}
		segments = append(segments, segment)
	}
	return segments
}

func applyContentEntryUpdateIntentPath(submittedParent map[string]any, existingParent map[string]any, segments []contentEntryUpdateIntentPathSegment, policy ContentEntryUpdateIntentArrayPolicy) error {
	if len(segments) == 0 || submittedParent == nil {
		return nil
	}
	segment := segments[0]
	if len(segments) == 1 {
		return applyContentEntryUpdateIntentArray(submittedParent, existingParent, segment.Name, policy)
	}
	if !segment.Array {
		nextSubmitted, _ := submittedParent[segment.Name].(map[string]any)
		nextExisting, _ := existingParent[segment.Name].(map[string]any)
		return applyContentEntryUpdateIntentPath(nextSubmitted, nextExisting, segments[1:], policy)
	}
	submittedRows, ok := submittedParent[segment.Name].([]any)
	if !ok {
		return nil
	}
	existingRows, _ := existingParent[segment.Name].([]any)
	for idx, rawRow := range submittedRows {
		submittedRow, ok := rawRow.(map[string]any)
		if !ok {
			continue
		}
		var existingRow map[string]any
		if idx < len(existingRows) {
			existingRow, _ = existingRows[idx].(map[string]any)
		}
		if existingRow == nil {
			existingRow = map[string]any{}
		}
		if err := applyContentEntryUpdateIntentPath(submittedRow, existingRow, segments[1:], policy); err != nil {
			return err
		}
	}
	return nil
}

func applyContentEntryUpdateIntentArray(parent map[string]any, existingParent map[string]any, field string, policy ContentEntryUpdateIntentArrayPolicy) error {
	if parent == nil {
		return nil
	}
	markers := contentEntryArrayIntentMarkersFromParent(parent, field)
	existingRows, _ := existingParent[field].([]any)
	submittedRows, submitted := parent[field].([]any)
	if markers.Clear {
		parent[field] = []any{}
		return nil
	}
	if !submitted {
		switch policy.Ambiguous {
		case ContentEntryUpdateIntentPreserve:
			if len(existingRows) > 0 {
				parent[field] = deepCloneAnyValue(existingRows)
			}
			return nil
		case ContentEntryUpdateIntentReplace:
			return nil
		default:
			if len(existingRows) == 0 {
				return nil
			}
			return fmt.Errorf("missing submitted array")
		}
	}
	patched, err := patchContentEntryUpdateIntentRows(submittedRows, existingRows, policy, markers)
	if err != nil {
		return err
	}
	parent[field] = patched
	return nil
}

func contentEntryArrayIntentMarkersFromParent(parent map[string]any, field string) contentEntryArrayIntentMarkers {
	markers := contentEntryArrayIntentMarkers{}
	for _, key := range []string{field + "__present", field + "__rendered"} {
		if value, ok := parent[key]; ok {
			markers.Present = anyBool(value)
			markers.Seen = true
			delete(parent, key)
		}
	}
	if value, ok := parent[field+"__complete"]; ok {
		markers.Complete = anyBool(value)
		markers.Seen = true
		delete(parent, field+"__complete")
	}
	if value, ok := parent[field+"__clear"]; ok {
		markers.Clear = anyBool(value)
		markers.Seen = true
		delete(parent, field+"__clear")
	}
	return markers
}

func patchContentEntryUpdateIntentRows(submittedRows []any, existingRows []any, policy ContentEntryUpdateIntentArrayPolicy, markers contentEntryArrayIntentMarkers) ([]any, error) {
	if policy.Ambiguous == ContentEntryUpdateIntentReplace {
		return replaceContentEntryUpdateIntentRows(submittedRows, policy), nil
	}
	if policy.Ambiguous == ContentEntryUpdateIntentReject && !markers.Seen && len(existingRows) > 0 {
		return nil, fmt.Errorf("missing array intent markers")
	}
	existingByID := map[string]int{}
	for idx, rawRow := range existingRows {
		row, ok := rawRow.(map[string]any)
		if !ok {
			continue
		}
		if identity, ok := contentEntryUpdateIntentRowIdentity(row, policy); ok {
			if _, exists := existingByID[identity]; exists {
				return nil, fmt.Errorf("duplicate existing row identity %q", identity)
			}
			existingByID[identity] = idx
		}
	}
	out := []any{}
	usedExisting := map[int]struct{}{}
	for idx, rawRow := range submittedRows {
		row, ok := rawRow.(map[string]any)
		if !ok {
			out = append(out, deepCloneAnyValue(rawRow))
			continue
		}
		existingIdx, matched := matchContentEntryUpdateIntentRow(row, idx, existingByID, len(existingRows), policy)
		if contentEntryUpdateIntentRowDeleted(row, policy.DeleteField) {
			if !matched && policy.Ambiguous == ContentEntryUpdateIntentReject {
				return nil, fmt.Errorf("delete row missing identity")
			}
			if matched {
				usedExisting[existingIdx] = struct{}{}
			}
			continue
		}
		if matched {
			usedExisting[existingIdx] = struct{}{}
			existingRow, _ := existingRows[existingIdx].(map[string]any)
			out = append(out, mergeContentEntryUpdateIntentRow(existingRow, row, policy))
			continue
		}
		if identity, ok := contentEntryUpdateIntentRowIdentity(row, policy); ok {
			if _, exists := existingByID[identity]; exists && policy.Ambiguous == ContentEntryUpdateIntentReject {
				return nil, fmt.Errorf("duplicate submitted row identity %q", identity)
			}
		}
		out = append(out, stripContentEntryUpdateIntentRow(row, policy))
	}
	if policy.Ambiguous == ContentEntryUpdateIntentPreserve || !markers.Complete {
		for idx, rawExisting := range existingRows {
			if _, used := usedExisting[idx]; used {
				continue
			}
			out = append(out, stripContentEntryUpdateIntentValue(rawExisting, policy))
		}
		return out, nil
	}
	if policy.Ambiguous == ContentEntryUpdateIntentReject {
		for idx := range existingRows {
			if _, used := usedExisting[idx]; !used {
				return nil, fmt.Errorf("submitted array omits existing row")
			}
		}
	}
	return out, nil
}

func replaceContentEntryUpdateIntentRows(rows []any, policy ContentEntryUpdateIntentArrayPolicy) []any {
	out := []any{}
	for _, row := range rows {
		rowMap, ok := row.(map[string]any)
		if ok && contentEntryUpdateIntentRowDeleted(rowMap, policy.DeleteField) {
			continue
		}
		out = append(out, stripContentEntryUpdateIntentValue(row, policy))
	}
	return out
}

func matchContentEntryUpdateIntentRow(row map[string]any, index int, existingByID map[string]int, existingLen int, policy ContentEntryUpdateIntentArrayPolicy) (int, bool) {
	if identity, ok := contentEntryUpdateIntentRowIdentity(row, policy); ok {
		if idx, exists := existingByID[identity]; exists {
			return idx, true
		}
	}
	if policy.AllowIndexFallback && index >= 0 && index < existingLen {
		return index, true
	}
	return 0, false
}

func contentEntryUpdateIntentRowIdentity(row map[string]any, policy ContentEntryUpdateIntentArrayPolicy) (string, bool) {
	for _, key := range policy.Identity {
		if value := strings.TrimSpace(anyToString(row[key])); value != "" {
			return key + "=" + value, true
		}
	}
	return "", false
}

func mergeContentEntryUpdateIntentRow(existing map[string]any, submitted map[string]any, policy ContentEntryUpdateIntentArrayPolicy) map[string]any {
	out := map[string]any{}
	for key, value := range existing {
		if contentEntryUpdateIntentInternalField(key, policy) {
			continue
		}
		out[key] = deepCloneAnyValue(value)
	}
	for key, value := range submitted {
		if contentEntryUpdateIntentInternalField(key, policy) {
			continue
		}
		if strings.HasSuffix(key, "__clear") && anyBool(value) {
			delete(out, strings.TrimSuffix(key, "__clear"))
			continue
		}
		out[key] = stripContentEntryUpdateIntentValue(value, policy)
	}
	return out
}

func stripContentEntryUpdateIntentRow(row map[string]any, policy ContentEntryUpdateIntentArrayPolicy) map[string]any {
	out := map[string]any{}
	for key, value := range row {
		if contentEntryUpdateIntentInternalField(key, policy) {
			continue
		}
		if strings.HasSuffix(key, "__clear") {
			continue
		}
		out[key] = stripContentEntryUpdateIntentValue(value, policy)
	}
	return out
}

func stripContentEntryUpdateIntentValue(value any, policy ContentEntryUpdateIntentArrayPolicy) any {
	switch typed := value.(type) {
	case map[string]any:
		return stripContentEntryUpdateIntentRow(typed, policy)
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, stripContentEntryUpdateIntentValue(item, policy))
		}
		return out
	default:
		return deepCloneAnyValue(value)
	}
}

func contentEntryUpdateIntentInternalField(key string, policy ContentEntryUpdateIntentArrayPolicy) bool {
	key = strings.TrimSpace(key)
	if key == "" {
		return false
	}
	switch key {
	case policy.DeleteField, "_row_key", "_row_state", "_present", "_intent_present":
		return true
	}
	return strings.HasPrefix(key, "__intent") || strings.HasPrefix(key, "_intent_")
}

func contentEntryUpdateIntentRowDeleted(row map[string]any, deleteField string) bool {
	if strings.TrimSpace(deleteField) == "" {
		deleteField = "_delete"
	}
	return anyBool(row[deleteField])
}

func contentEntryUpdateIntentError(path string, err error) error {
	return goerrors.New(fmt.Sprintf("invalid update intent for %s: %v", strings.TrimSpace(path), err), goerrors.CategoryValidation).
		WithCode(http.StatusBadRequest).
		WithTextCode("INVALID_FORM")
}

func firstStringList(values ...any) []string {
	for _, value := range values {
		if out := contentEntryStringList(value); len(out) > 0 {
			return out
		}
	}
	return nil
}

func anyMap(value any) (map[string]any, bool) {
	switch typed := value.(type) {
	case map[string]any:
		return typed, true
	default:
		return nil, false
	}
}

func anyBool(value any) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "1", "true", "yes", "on":
			return true
		default:
			return false
		}
	case int:
		return typed != 0
	case int64:
		return typed != 0
	case float64:
		return typed != 0
	default:
		return false
	}
}
