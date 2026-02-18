package admin

import (
	"context"
	"errors"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
)

func pruneGroupByFilters(filters map[string]any) map[string]any {
	if len(filters) == 0 {
		return filters
	}
	out := primitives.CloneAnyMap(filters)
	for key := range out {
		field := key
		if parts := strings.SplitN(strings.TrimSpace(key), "__", 2); len(parts) > 0 {
			field = parts[0]
		}
		if !isListGroupByPredicateField(field) {
			continue
		}
		delete(out, key)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func pruneGroupByPredicates(predicates []ListPredicate) []ListPredicate {
	if len(predicates) == 0 {
		return nil
	}
	out := make([]ListPredicate, 0, len(predicates))
	for _, predicate := range predicates {
		if isListGroupByPredicateField(predicate.Field) {
			continue
		}
		out = append(out, predicate)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (p *panelBinding) listWithTranslationReadinessPredicates(ctx AdminContext, baseOpts, requestedOpts ListOptions, predicates []ListPredicate) ([]map[string]any, int, error) {
	filtered, err := p.listAllWithTranslationReadinessPredicates(ctx, baseOpts, predicates)
	if err != nil {
		return nil, 0, err
	}
	paginated, total := paginateInMemory(filtered, requestedOpts, 10)
	return paginated, total, nil
}

func (p *panelBinding) listAllWithTranslationReadinessPredicates(ctx AdminContext, baseOpts ListOptions, predicates []ListPredicate) ([]map[string]any, error) {
	fetch := cloneListOptions(baseOpts)
	if fetch.PerPage <= 0 {
		fetch.PerPage = 50
	}
	if fetch.PerPage < 50 {
		fetch.PerPage = 50
	}
	fetch.Page = 1

	filtered := make([]map[string]any, 0, fetch.PerPage)
	for {
		batch, total, err := p.panel.List(ctx, fetch)
		if err != nil {
			return nil, err
		}
		if len(batch) == 0 {
			break
		}
		batch = p.withTranslationReadiness(ctx, batch, baseOpts.Filters)
		batch = withCanonicalTranslationGroupIDs(batch)
		for _, record := range batch {
			if len(predicates) > 0 && !recordMatchesAllListPredicates(record, predicates) {
				continue
			}
			filtered = append(filtered, record)
		}
		if fetch.Page*fetch.PerPage >= total {
			break
		}
		fetch.Page++
	}

	return filtered, nil
}

func (p *panelBinding) listGroupedByTranslationGroup(ctx AdminContext, baseOpts, requestedOpts ListOptions, readinessPredicates []ListPredicate) ([]map[string]any, int, error) {
	filtered, err := p.listAllWithTranslationReadinessPredicates(ctx, baseOpts, readinessPredicates)
	if err != nil {
		return nil, 0, err
	}
	grouped := buildTranslationGroupedRows(filtered, p.groupedRowsDefaultLocale(ctx))
	paginated, total := paginateInMemory(grouped, requestedOpts, 10)
	return paginated, total, nil
}

func (p *panelBinding) groupedRowsDefaultLocale(ctx AdminContext) string {
	locale := strings.ToLower(strings.TrimSpace(localeFromContext(ctx.Context)))
	if locale != "" {
		return locale
	}
	if p != nil && p.admin != nil {
		locale = strings.ToLower(strings.TrimSpace(p.admin.config.DefaultLocale))
	}
	if locale != "" {
		return locale
	}
	return "en"
}

func buildTranslationGroupedRows(records []map[string]any, defaultLocale string) []map[string]any {
	if len(records) == 0 {
		return nil
	}
	groups := map[string][]map[string]any{}
	groupOrder := make([]string, 0, len(records))
	ungrouped := make([]map[string]any, 0)
	for _, record := range records {
		groupID := translationGroupIDForRecord(record)
		recordClone := primitives.CloneAnyMap(record)
		if groupID != "" {
			recordClone["translation_group_id"] = groupID
		}
		if groupID == "" {
			ungrouped = append(ungrouped, recordClone)
			continue
		}
		if _, ok := groups[groupID]; !ok {
			groupOrder = append(groupOrder, groupID)
		}
		groups[groupID] = append(groups[groupID], recordClone)
	}
	sort.Strings(groupOrder)

	ungrouped = orderTranslationUngroupedRows(ungrouped)

	out := make([]map[string]any, 0, len(groupOrder)+len(ungrouped))
	for _, groupID := range groupOrder {
		children := orderTranslationGroupChildren(groups[groupID], defaultLocale)
		if len(children) == 0 {
			continue
		}
		annotatedChildren := make([]map[string]any, 0, len(children))
		for childIndex, child := range children {
			childClone := primitives.CloneAnyMap(child)
			childClone["_group"] = map[string]any{
				"id":          groupID,
				"row_type":    "child",
				"position":    childIndex + 1,
				"is_parent":   childIndex == 0,
				"child_count": len(children),
			}
			annotatedChildren = append(annotatedChildren, childClone)
		}
		parent := primitives.CloneAnyMap(annotatedChildren[0])
		groupLabel := translationGroupLabelForChildren(annotatedChildren)
		summary := buildTranslationGroupSummary(groupID, annotatedChildren)
		if groupLabel != "" {
			summary["group_label"] = groupLabel
		}
		row := map[string]any{
			"id":                      "group:" + groupID,
			"translation_group_id":    groupID,
			"translation_group_label": groupLabel,
			"group_by":                listGroupByTranslationGroupID,
			"_group": map[string]any{
				"id":          groupID,
				"label":       groupLabel,
				"row_type":    "group",
				"child_count": len(annotatedChildren),
				"parent_id":   strings.TrimSpace(toString(parent["id"])),
			},
			"parent":                    parent,
			"children":                  annotatedChildren,
			"records":                   annotatedChildren,
			"translation_group_summary": summary,
			"available_count":           summary["available_count"],
			"required_count":            summary["required_count"],
			"missing_locales":           summary["missing_locales"],
			"last_updated_at":           summary["last_updated_at"],
			"requirements_resolved":     summary["requirements_resolved"],
			"requirements_state":        summary["requirements_state"],
		}
		out = append(out, row)
	}
	for index, record := range ungrouped {
		recordClone := primitives.CloneAnyMap(record)
		recordClone["_group"] = map[string]any{
			"id":       fmt.Sprintf("ungrouped:%d", index+1),
			"row_type": "ungrouped",
			"position": index + 1,
		}
		out = append(out, recordClone)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationGroupIDForRecord(record map[string]any) string {
	return strings.TrimSpace(translationGroupIDFromRecord(record))
}

func orderTranslationGroupChildren(records []map[string]any, defaultLocale string) []map[string]any {
	if len(records) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		out = append(out, primitives.CloneAnyMap(record))
	}
	sort.SliceStable(out, func(i, j int) bool {
		leftLocale := strings.ToLower(strings.TrimSpace(toString(out[i]["locale"])))
		rightLocale := strings.ToLower(strings.TrimSpace(toString(out[j]["locale"])))
		if leftLocale != rightLocale {
			return leftLocale < rightLocale
		}
		leftID := strings.TrimSpace(toString(out[i]["id"]))
		rightID := strings.TrimSpace(toString(out[j]["id"]))
		if leftID != rightID {
			return leftID < rightID
		}
		return false
	})

	defaultLocale = strings.ToLower(strings.TrimSpace(defaultLocale))
	if defaultLocale == "" {
		return out
	}
	parentIndex := -1
	for index, record := range out {
		if strings.EqualFold(strings.TrimSpace(toString(record["locale"])), defaultLocale) {
			parentIndex = index
			break
		}
	}
	if parentIndex <= 0 {
		return out
	}
	parent := primitives.CloneAnyMap(out[parentIndex])
	reordered := make([]map[string]any, 0, len(out))
	reordered = append(reordered, parent)
	reordered = append(reordered, out[:parentIndex]...)
	reordered = append(reordered, out[parentIndex+1:]...)
	return reordered
}

func buildTranslationGroupSummary(groupID string, records []map[string]any) map[string]any {
	required := map[string]struct{}{}
	available := map[string]struct{}{}
	groupMissingFields := map[string]struct{}{}
	lastUpdatedAt := latestTranslationGroupTimestamp(records)
	requirementsResolved := true
	requirementsSignal := false

	for _, record := range records {
		readiness := extractMap(record["translation_readiness"])
		if len(readiness) == 0 {
			requirementsResolved = false
		}
		if resolved, ok := readiness["requirements_resolved"].(bool); ok {
			requirementsSignal = true
			if !resolved {
				requirementsResolved = false
			}
		}
		for _, locale := range normalizedLocaleList(readiness["required_locales"]) {
			required[locale] = struct{}{}
		}
		for _, locale := range normalizedLocaleList(readiness["available_locales"]) {
			available[locale] = struct{}{}
		}
		if len(readiness) == 0 {
			for _, locale := range normalizedLocaleList(record["available_locales"]) {
				available[locale] = struct{}{}
			}
			if locale := strings.ToLower(strings.TrimSpace(toString(record["locale"]))); locale != "" {
				available[locale] = struct{}{}
			}
		}
		for _, locale := range translationReadinessMissingFieldLocales(readiness) {
			groupMissingFields[locale] = struct{}{}
		}
	}

	requiredLocales := localeSetToSortedList(required)
	availableLocales := localeSetToSortedList(available)
	missingLocales := translationReadinessMissingLocales(requiredLocales, availableLocales)
	missingFields := map[string][]string{}
	for locale := range groupMissingFields {
		missingFields[locale] = []string{"missing_fields"}
	}
	state := ""
	if len(requiredLocales) > 0 || len(missingFields) > 0 {
		state = translationReadinessState(missingLocales, missingFields)
	}
	if !requirementsSignal {
		requirementsResolved = false
	}
	if !requirementsResolved && strings.EqualFold(state, translationReadinessStateReady) {
		state = ""
	}
	requiredCount := len(requiredLocales)
	if requirementsResolved && requiredCount == 0 {
		requiredCount = len(availableLocales)
	}
	childCount := len(records)
	requirementsState := "unresolved"
	if requirementsResolved {
		requirementsState = "resolved"
	}

	return map[string]any{
		"group_id":              groupID,
		"required_locales":      requiredLocales,
		"available_locales":     availableLocales,
		"missing_locales":       missingLocales,
		"required_count":        requiredCount,
		"available_count":       len(availableLocales),
		"missing_count":         len(missingLocales),
		"total_items":           childCount,
		"child_count":           childCount,
		"readiness_state":       state,
		"ready_for_publish":     requirementsResolved && state == translationReadinessStateReady,
		"last_updated_at":       lastUpdatedAt,
		"requirements_resolved": requirementsResolved,
		"requirements_state":    requirementsState,
	}
}

func orderTranslationUngroupedRows(records []map[string]any) []map[string]any {
	if len(records) <= 1 {
		return records
	}
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		out = append(out, primitives.CloneAnyMap(record))
	}
	sort.SliceStable(out, func(i, j int) bool {
		leftLocale := strings.ToLower(strings.TrimSpace(toString(out[i]["locale"])))
		rightLocale := strings.ToLower(strings.TrimSpace(toString(out[j]["locale"])))
		if leftLocale != rightLocale {
			return leftLocale < rightLocale
		}
		leftID := strings.TrimSpace(toString(out[i]["id"]))
		rightID := strings.TrimSpace(toString(out[j]["id"]))
		if leftID != rightID {
			return leftID < rightID
		}
		return false
	})
	return out
}

func translationGroupLabelForChildren(children []map[string]any) string {
	if len(children) == 0 {
		return ""
	}
	parent := children[0]
	for _, key := range []string{"title", "name", "slug", "path"} {
		value := strings.TrimSpace(toString(parent[key]))
		if value != "" {
			return value
		}
	}
	return ""
}

func translationReadinessMissingFieldLocales(readiness map[string]any) []string {
	raw := extractMap(readiness["missing_required_fields_by_locale"])
	if len(raw) == 0 {
		return nil
	}
	out := map[string]struct{}{}
	for locale, fields := range raw {
		normalizedLocale := strings.ToLower(strings.TrimSpace(locale))
		if normalizedLocale == "" {
			continue
		}
		hasMissing := false
		switch typed := fields.(type) {
		case []string:
			hasMissing = len(typed) > 0
		case []any:
			hasMissing = len(typed) > 0
		default:
			hasMissing = strings.TrimSpace(toString(typed)) != ""
		}
		if !hasMissing {
			continue
		}
		out[normalizedLocale] = struct{}{}
	}
	return localeSetToSortedList(out)
}

func localeSetToSortedList(values map[string]struct{}) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for value := range values {
		trimmed := strings.ToLower(strings.TrimSpace(value))
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	sort.Strings(out)
	return out
}

func latestTranslationGroupTimestamp(records []map[string]any) string {
	var (
		bestTime   time.Time
		bestParsed bool
		fallback   string
	)
	for _, record := range records {
		for _, field := range []string{"updated_at", "published_at", "created_at"} {
			raw, ok := record[field]
			if !ok {
				continue
			}
			parsed, formatted, ok := parseTranslationGroupTimestamp(raw)
			if ok {
				if !bestParsed || parsed.After(bestTime) {
					bestParsed = true
					bestTime = parsed
				}
				continue
			}
			if formatted != "" && formatted > fallback {
				fallback = formatted
			}
		}
	}
	if bestParsed {
		return bestTime.UTC().Format(time.RFC3339)
	}
	return fallback
}

func parseTranslationGroupTimestamp(raw any) (time.Time, string, bool) {
	switch typed := raw.(type) {
	case time.Time:
		return typed, typed.UTC().Format(time.RFC3339), true
	case *time.Time:
		if typed == nil || typed.IsZero() {
			return time.Time{}, "", false
		}
		return *typed, typed.UTC().Format(time.RFC3339), true
	}
	value := strings.TrimSpace(toString(raw))
	if value == "" {
		return time.Time{}, "", false
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed, parsed.UTC().Format(time.RFC3339), true
		}
	}
	return time.Time{}, value, false
}

func (p *panelBinding) withGroupedRowActionState(ctx AdminContext, groups []map[string]any, actions []Action) []map[string]any {
	if len(groups) == 0 || len(actions) == 0 {
		return groups
	}
	out := make([]map[string]any, 0, len(groups))
	for _, group := range groups {
		cloned := primitives.CloneAnyMap(group)
		children := toMapSlice(cloned["children"])
		parent := extractMap(cloned["parent"])
		if len(children) == 0 && len(parent) == 0 {
			rowWithState := p.withRowActionState(ctx, []map[string]any{cloned}, actions)
			if len(rowWithState) > 0 {
				out = append(out, rowWithState[0])
			} else {
				out = append(out, cloned)
			}
			continue
		}
		if len(children) > 0 {
			childrenWithState := p.withRowActionState(ctx, children, actions)
			cloned["children"] = childrenWithState
			cloned["records"] = childrenWithState
		}
		if len(parent) > 0 {
			parentWithState := p.withRowActionState(ctx, []map[string]any{parent}, actions)
			if len(parentWithState) > 0 {
				cloned["parent"] = parentWithState[0]
				if state := extractMap(parentWithState[0]["_action_state"]); len(state) > 0 {
					cloned["_action_state"] = state
				}
			}
		}
		out = append(out, cloned)
	}
	return out
}

func withCanonicalTranslationGroupIDs(records []map[string]any) []map[string]any {
	if len(records) == 0 {
		return records
	}
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		out = append(out, withCanonicalTranslationGroupIDRecord(record))
	}
	return out
}

func withCanonicalTranslationGroupIDRecord(record map[string]any) map[string]any {
	cloned := primitives.CloneAnyMap(record)
	if len(cloned) == 0 {
		return cloned
	}
	if groupID := strings.TrimSpace(translationGroupIDFromRecord(cloned)); groupID != "" {
		cloned["translation_group_id"] = groupID
	}
	if parent := extractMap(cloned["parent"]); len(parent) > 0 {
		cloned["parent"] = withCanonicalTranslationGroupIDRecord(parent)
	}
	if children := toMapSlice(cloned["children"]); len(children) > 0 {
		canonicalChildren := make([]map[string]any, 0, len(children))
		for _, child := range children {
			canonicalChildren = append(canonicalChildren, withCanonicalTranslationGroupIDRecord(child))
		}
		cloned["children"] = canonicalChildren
		cloned["records"] = canonicalChildren
	}
	return cloned
}

func toMapSlice(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, primitives.CloneAnyMap(item))
		}
		return out
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			value, ok := item.(map[string]any)
			if !ok {
				continue
			}
			out = append(out, primitives.CloneAnyMap(value))
		}
		return out
	default:
		return nil
	}
}

func recordMatchesAllListPredicates(record map[string]any, predicates []ListPredicate) bool {
	for _, predicate := range predicates {
		if !listRecordMatchesPredicate(record, predicate) {
			return false
		}
	}
	return true
}

func (p *panelBinding) translationReadinessPolicy() TranslationPolicy {
	if p == nil {
		return nil
	}
	if p.panel != nil && p.panel.translationPolicy != nil {
		return p.panel.translationPolicy
	}
	if p.admin != nil {
		return p.admin.translationPolicy
	}
	return nil
}

func (p *panelBinding) rowActionStateForRecord(ctx AdminContext, record map[string]any, actions []Action, transitions []WorkflowTransition, transitionsErr error) map[string]map[string]any {
	if len(record) == 0 || len(actions) == 0 {
		return nil
	}
	state := strings.TrimSpace(toString(record["status"]))
	id := strings.TrimSpace(toString(record["id"]))
	out := map[string]map[string]any{}
	for _, action := range actions {
		name := strings.TrimSpace(action.Name)
		if name == "" {
			continue
		}
		availability := map[string]any{"enabled": true}
		if !actionContextRequiredSatisfied(record, action.ContextRequired) {
			availability["enabled"] = false
			availability["reason_code"] = ActionDisabledReasonCodeMissingContext
			availability["reason"] = "record does not include required context for this action"
			out[name] = availability
			continue
		}
		if action.Permission != "" && p.panel.authorizer != nil && !p.panel.authorizer.Can(ctx.Context, action.Permission, p.name) {
			availability["enabled"] = false
			availability["reason_code"] = ActionDisabledReasonCodePermissionDenied
			availability["reason"] = "you do not have permission to execute this action"
			out[name] = availability
			continue
		}
		lowered := strings.ToLower(name)
		if _, workflowAction := workflowActionNames[lowered]; !workflowAction {
			out[name] = availability
			continue
		}
		if p.panel.workflow == nil {
			availability["enabled"] = false
			availability["reason_code"] = ActionDisabledReasonCodeInvalidStatus
			availability["reason"] = "workflow is not configured for this panel"
			out[name] = availability
			continue
		}
		if id == "" {
			availability["enabled"] = false
			availability["reason_code"] = ActionDisabledReasonCodeMissingContext
			availability["reason"] = "record id required to evaluate workflow action"
			out[name] = availability
			continue
		}
		if transitionsErr != nil {
			availability["enabled"] = false
			availability["reason_code"] = ActionDisabledReasonCodeInvalidStatus
			availability["reason"] = "workflow transitions are unavailable"
			out[name] = availability
			continue
		}
		transitionNames := workflowTransitionNamesList(transitions)
		availability["available_transitions"] = transitionNames
		if !actionMatchesAvailableWorkflowTransition(name, transitions) {
			availability["enabled"] = false
			availability["reason_code"] = ActionDisabledReasonCodeInvalidStatus
			availability["reason"] = fmt.Sprintf("transition %q is not available from state %q", name, primitives.FirstNonEmptyRaw(state, "unknown"))
			out[name] = availability
			continue
		}
		if reason, blocked := translationBlockedActionReason(name, record); blocked {
			availability["enabled"] = false
			availability["reason_code"] = ActionDisabledReasonCodeTranslationMissing
			availability["reason"] = reason
			out[name] = availability
			continue
		}
		out[name] = availability
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationBlockedActionReason(actionName string, record map[string]any) (string, bool) {
	if !actionRequiresTranslationReady(actionName) {
		return "", false
	}
	readiness, ok := record["translation_readiness"].(map[string]any)
	if !ok || len(readiness) == 0 {
		return "", false
	}
	state := normalizeTranslationReadinessState(toString(readiness["readiness_state"]))
	if state == translationReadinessStateReady {
		return "", false
	}
	missingLocales := toStringSlice(readiness["missing_required_locales"])
	if len(missingLocales) == 0 {
		missingLocales = toStringSlice(readiness["missing_locales"])
	}
	if len(missingLocales) > 0 {
		return fmt.Sprintf("missing required locales: %s", strings.Join(uppercaseLocaleList(missingLocales), ", ")), true
	}
	if state == translationReadinessStateMissingFields || state == translationReadinessStateMissingLocalesFields {
		return "required translation fields are incomplete", true
	}
	return "required translations are missing", true
}

func actionRequiresTranslationReady(actionName string) bool {
	switch strings.ToLower(strings.TrimSpace(actionName)) {
	case "publish":
		return true
	default:
		return false
	}
}

func uppercaseLocaleList(locales []string) []string {
	if len(locales) == 0 {
		return nil
	}
	out := make([]string, 0, len(locales))
	seen := map[string]struct{}{}
	for _, locale := range locales {
		normalized := strings.ToLower(strings.TrimSpace(locale))
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, strings.ToUpper(normalized))
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func actionMatchesAvailableWorkflowTransition(action string, transitions []WorkflowTransition) bool {
	if len(transitions) == 0 {
		return false
	}
	candidates := workflowTransitionCandidates(action)
	for _, transition := range transitions {
		if containsTransitionName(candidates, transition.Name) {
			return true
		}
	}
	return false
}

func actionContextRequiredSatisfied(record map[string]any, required []string) bool {
	if len(required) == 0 {
		return true
	}
	for _, field := range required {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}
		value, ok := actionContextValue(record, field)
		if !ok || isEmptyActionPayloadValue(value) {
			return false
		}
	}
	return true
}

func actionContextValue(record map[string]any, field string) (any, bool) {
	if len(record) == 0 {
		return nil, false
	}
	if !strings.Contains(field, ".") {
		value, ok := record[field]
		return value, ok
	}
	parts := strings.Split(field, ".")
	var current any = record
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			return nil, false
		}
		object, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		next, ok := object[part]
		if !ok {
			return nil, false
		}
		current = next
	}
	return current, true
}

func mergePanelActionContext(body map[string]any, locale string, values ...string) map[string]any {
	if body == nil {
		body = map[string]any{}
	}
	queryLocale := ""
	queryEnvironment := ""
	queryPolicyEntity := ""
	if len(values) > 0 {
		queryLocale = strings.TrimSpace(values[0])
	}
	if len(values) > 1 {
		queryEnvironment = strings.TrimSpace(values[1])
	}
	if len(values) > 2 && queryEnvironment == "" {
		queryEnvironment = strings.TrimSpace(values[2])
	}
	if len(values) > 3 {
		queryPolicyEntity = strings.TrimSpace(values[3])
	}
	if len(values) > 4 && queryPolicyEntity == "" {
		queryPolicyEntity = strings.TrimSpace(values[4])
	}

	if strings.TrimSpace(toString(body["locale"])) == "" {
		switch {
		case queryLocale != "":
			body["locale"] = queryLocale
		case strings.TrimSpace(locale) != "":
			body["locale"] = strings.TrimSpace(locale)
		}
	}
	if strings.TrimSpace(toString(body["environment"])) == "" && strings.TrimSpace(toString(body["env"])) == "" && queryEnvironment != "" {
		body["environment"] = queryEnvironment
	}
	if strings.TrimSpace(toString(body["policy_entity"])) == "" && strings.TrimSpace(toString(body["policyEntity"])) == "" && queryPolicyEntity != "" {
		body["policy_entity"] = queryPolicyEntity
	}
	return body
}

func resolvePrimaryActionID(body map[string]any, ids []string) string {
	if len(body) > 0 {
		if id := strings.TrimSpace(toString(body["id"])); id != "" {
			return id
		}
		if record := extractMap(body["record"]); len(record) > 0 {
			if id := strings.TrimSpace(toString(record["id"])); id != "" {
				return id
			}
		}
		if selection := extractMap(body["selection"]); len(selection) > 0 {
			if id := strings.TrimSpace(toString(selection["id"])); id != "" {
				return id
			}
			if selectionIDs := toStringSlice(selection["ids"]); len(selectionIDs) > 0 {
				if id := strings.TrimSpace(selectionIDs[0]); id != "" {
					return id
				}
			}
		}
		if bodyIDs := toStringSlice(body["ids"]); len(bodyIDs) > 0 {
			if id := strings.TrimSpace(bodyIDs[0]); id != "" {
				return id
			}
		}
	}
	for _, id := range ids {
		if trimmed := strings.TrimSpace(id); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func translationLocaleExists(record map[string]any, locale string) bool {
	locale = strings.TrimSpace(locale)
	if locale == "" || len(record) == 0 {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(toString(record["locale"])), locale) {
		return true
	}
	for _, item := range toStringSlice(record["available_locales"]) {
		if strings.EqualFold(strings.TrimSpace(item), locale) {
			return true
		}
	}
	return false
}

func translationLocaleExistsInRepositoryGroup(ctx context.Context, repo Repository, groupID, locale, skipID string) (bool, error) {
	if repo == nil {
		return false, ErrNotFound
	}
	groupID = strings.TrimSpace(groupID)
	locale = strings.TrimSpace(locale)
	if groupID == "" || locale == "" {
		return false, nil
	}
	const perPage = 200
	page := 1
	for {
		records, total, err := repo.List(ctx, ListOptions{
			Page:    page,
			PerPage: perPage,
		})
		if err != nil {
			return false, err
		}
		for _, record := range records {
			if strings.TrimSpace(toString(record["id"])) == strings.TrimSpace(skipID) {
				continue
			}
			candidateGroup := strings.TrimSpace(translationGroupIDFromRecord(record))
			if candidateGroup == "" || !strings.EqualFold(candidateGroup, groupID) {
				continue
			}
			candidateLocale := strings.TrimSpace(toString(record["locale"]))
			if candidateLocale != "" && strings.EqualFold(candidateLocale, locale) {
				return true, nil
			}
		}
		if len(records) == 0 {
			return false, nil
		}
		if total > 0 && page*perPage >= total {
			return false, nil
		}
		if len(records) < perPage {
			return false, nil
		}
		page++
	}
}

func mapCreateTranslationPersistenceError(err error, panel, entityID, sourceLocale, locale, groupID string) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrPathConflict) {
		return TranslationAlreadyExistsError{
			Panel:              strings.TrimSpace(panel),
			EntityID:           strings.TrimSpace(entityID),
			SourceLocale:       strings.TrimSpace(sourceLocale),
			Locale:             strings.TrimSpace(locale),
			TranslationGroupID: strings.TrimSpace(groupID),
		}
	}
	message := strings.ToLower(strings.TrimSpace(err.Error()))
	if strings.Contains(message, "slug already exists") ||
		strings.Contains(message, "path conflict") ||
		strings.Contains(message, "duplicate key") ||
		strings.Contains(message, "unique constraint failed") {
		return TranslationAlreadyExistsError{
			Panel:              strings.TrimSpace(panel),
			EntityID:           strings.TrimSpace(entityID),
			SourceLocale:       strings.TrimSpace(sourceLocale),
			Locale:             strings.TrimSpace(locale),
			TranslationGroupID: strings.TrimSpace(groupID),
		}
	}
	return err
}

func normalizeCreateTranslationLocale(locale string) string {
	return strings.ToLower(strings.TrimSpace(locale))
}

func prepareCreateTranslationClone(clone, source map[string]any, targetLocale string) {
	if len(clone) == 0 {
		return
	}

	for _, key := range []string{
		"available_locales",
		"requested_locale",
		"resolved_locale",
		"missing_requested_locale",
		"translation_readiness",
		"_action_state",
	} {
		delete(clone, key)
	}

	sourceLocale := normalizeCreateTranslationLocale(toString(source["locale"]))
	if sourceLocale == "" {
		sourceLocale = normalizeCreateTranslationLocale(toString(clone["locale"]))
	}
	targetLocale = normalizeCreateTranslationLocale(targetLocale)
	if targetLocale == "" {
		return
	}

	if slug := strings.TrimSpace(toString(clone["slug"])); slug != "" {
		clone["slug"] = withCreateTranslationLocaleSuffix(slug, sourceLocale, targetLocale)
	}
	if path := strings.TrimSpace(toString(clone["path"])); path != "" {
		clone["path"] = withCreateTranslationPathSuffix(path, sourceLocale, targetLocale)
	}

	if data, ok := clone["data"].(map[string]any); ok && data != nil {
		if slug := strings.TrimSpace(toString(data["slug"])); slug != "" {
			data["slug"] = withCreateTranslationLocaleSuffix(slug, sourceLocale, targetLocale)
		}
		if path := strings.TrimSpace(toString(data["path"])); path != "" {
			data["path"] = withCreateTranslationPathSuffix(path, sourceLocale, targetLocale)
		}
	}
}

func withCreateTranslationLocaleSuffix(value, sourceLocale, targetLocale string) string {
	base := strings.TrimSpace(value)
	if base == "" {
		return base
	}
	sourceLocale = normalizeCreateTranslationLocale(sourceLocale)
	targetLocale = normalizeCreateTranslationLocale(targetLocale)
	if targetLocale == "" {
		return base
	}
	if sourceLocale != "" {
		base = stripCreateTranslationLocaleSuffix(base, sourceLocale)
	}
	if strings.EqualFold(base, "/") {
		return "/" + targetLocale
	}
	if strings.HasSuffix(strings.ToLower(base), "-"+targetLocale) {
		return base
	}
	return strings.TrimRight(base, "-") + "-" + targetLocale
}

func withCreateTranslationPathSuffix(path, sourceLocale, targetLocale string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return trimmed
	}

	sourceLocale = normalizeCreateTranslationLocale(sourceLocale)
	targetLocale = normalizeCreateTranslationLocale(targetLocale)
	if targetLocale == "" {
		return trimmed
	}

	if strings.EqualFold(trimmed, "/") {
		return "/" + targetLocale
	}
	if sourceLocale != "" {
		if strings.EqualFold(trimmed, "/"+sourceLocale) {
			return "/" + targetLocale
		}
		prefix := "/" + sourceLocale + "/"
		if strings.HasPrefix(strings.ToLower(trimmed), strings.ToLower(prefix)) {
			return "/" + targetLocale + trimmed[len(prefix)-1:]
		}
	}
	return withCreateTranslationLocaleSuffix(trimmed, sourceLocale, targetLocale)
}

func stripCreateTranslationLocaleSuffix(value, locale string) string {
	base := strings.TrimSpace(value)
	if base == "" {
		return base
	}
	locale = normalizeCreateTranslationLocale(locale)
	if locale == "" {
		return base
	}
	suffix := "-" + locale
	if strings.HasSuffix(strings.ToLower(base), suffix) {
		return strings.TrimSpace(base[:len(base)-len(suffix)])
	}
	return base
}

func buildCreateTranslationResponse(created map[string]any, locale, groupID string) map[string]any {
	response := map[string]any{
		"locale":               strings.TrimSpace(locale),
		"translation_group_id": strings.TrimSpace(groupID),
	}
	if createdID := strings.TrimSpace(toString(created["id"])); createdID != "" {
		response["id"] = createdID
	}
	if createdLocale := strings.TrimSpace(toString(created["locale"])); createdLocale != "" {
		response["locale"] = createdLocale
	}
	status := strings.TrimSpace(toString(created["status"]))
	if status == "" {
		status = "draft"
	}
	response["status"] = status
	if createdGroupID := strings.TrimSpace(toString(created["translation_group_id"])); createdGroupID != "" {
		response["translation_group_id"] = createdGroupID
	}
	if availableLocales := normalizedLocaleList(created["available_locales"]); len(availableLocales) > 0 {
		response["available_locales"] = append([]string{}, availableLocales...)
	}
	if requestedLocale := strings.TrimSpace(toString(created["requested_locale"])); requestedLocale != "" {
		response["requested_locale"] = requestedLocale
	}
	if resolvedLocale := strings.TrimSpace(toString(created["resolved_locale"])); resolvedLocale != "" {
		response["resolved_locale"] = resolvedLocale
	}
	if missingRequestedLocale, ok := created["missing_requested_locale"].(bool); ok {
		response["missing_requested_locale"] = missingRequestedLocale
	}
	return response
}

func (p *panelBinding) recordBlockedTransition(ctx AdminContext, entityID, transition string, input TranslationPolicyInput, policyErr error) {
	if p == nil || p.panel == nil {
		return
	}
	metadata := map[string]any{
		"panel":            p.name,
		"entity_id":        strings.TrimSpace(entityID),
		"transition":       strings.TrimSpace(transition),
		"locale":           strings.TrimSpace(input.RequestedLocale),
		"environment":      strings.TrimSpace(input.Environment),
		"policy_entity":    strings.TrimSpace(input.PolicyEntity),
		"translation_code": TextCodeTranslationMissing,
	}
	var missing MissingTranslationsError
	if errors.As(policyErr, &missing) {
		metadata["missing_locales"] = normalizeLocaleList(missing.MissingLocales)
	}
	p.panel.recordActivity(ctx, "panel.transition.blocked", metadata)
}

func (p *panelBinding) Bulk(c router.Context, locale, action string, body map[string]any) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	ids := parseCommandIDs(body, c.Query("id"), c.Query("ids"))
	if isBulkCreateMissingTranslationsAction(action) {
		return p.bulkCreateMissingTranslations(c, ctx, locale, body, ids)
	}
	if definition, ok := p.panel.findBulkAction(action); ok {
		body = applyActionPayloadDefaults(definition, body, ids)
		if err := validateActionPayload(definition, body); err != nil {
			return nil, err
		}
	}
	if err := p.panel.RunBulkAction(ctx, action, body, ids); err != nil {
		return nil, err
	}
	return nil, nil
}
