package admin

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/internal/adminkeys"
	"github.com/goliatone/go-admin/internal/primitives"
	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
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
	if len(readinessPredicates) == 0 {
		if records, total, handled, err := p.listOptimizedTranslationFamilies(ctx, baseOpts); handled {
			if err != nil {
				return nil, 0, err
			}
			return records, total, nil
		}
	}
	if records, total, handled, err := p.listTranslationFamiliesFromReadModel(ctx, baseOpts, requestedOpts, readinessPredicates); handled {
		if err != nil {
			return nil, 0, err
		}
		return records, total, nil
	}
	if records, total, handled, err := p.listOptimizedTranslationFamiliesWithReadinessPredicates(ctx, baseOpts, requestedOpts, readinessPredicates); handled {
		if err != nil {
			return nil, 0, err
		}
		return records, total, nil
	}
	filtered, err := p.listAllWithTranslationReadinessPredicates(ctx, baseOpts, readinessPredicates)
	if err != nil {
		return nil, 0, err
	}
	grouped := buildTranslationGroupedRows(filtered, p.groupedRowsDefaultLocale(ctx))
	paginated, total := paginateInMemory(grouped, requestedOpts, 10)
	return paginated, total, nil
}

type optimizedTranslationFamilyListRepository interface {
	ListTranslationFamilies(ctx context.Context, opts ListOptions) ([]map[string]any, int, error)
}

const groupedReadinessFamilyScanPerPage = 500

func (p *panelBinding) listOptimizedTranslationFamilies(ctx AdminContext, opts ListOptions) ([]map[string]any, int, bool, error) {
	if p == nil || p.panel == nil || p.panel.repo == nil {
		return nil, 0, false, nil
	}
	lister, ok := p.panel.repo.(optimizedTranslationFamilyListRepository)
	if !ok || lister == nil {
		return nil, 0, false, nil
	}
	records, total, err := lister.ListTranslationFamilies(ctx.Context, opts)
	if errors.Is(err, errOptimizedTranslationFamilyListUnsupported) {
		return nil, 0, false, nil
	}
	if err != nil {
		return nil, 0, true, err
	}
	return records, total, true, nil
}

type groupedReadinessFamilyReadModelQuery struct {
	readinessState        string
	blockerCode           string
	exactContentReadiness string
}

func (p *panelBinding) listTranslationFamiliesFromReadModel(ctx AdminContext, baseOpts, requestedOpts ListOptions, readinessPredicates []ListPredicate) ([]map[string]any, int, bool, error) {
	service, input, query, ok := p.groupedReadinessFamilyReadModelRequest(ctx, baseOpts, requestedOpts, readinessPredicates)
	if !ok {
		return nil, 0, false, nil
	}
	var result translationservices.ListFamiliesResult
	var err error
	if query.needsPostFilter() {
		result, err = listTranslationFamiliesFromReadModelFiltered(ctx.Context, service, input, query, requestedOpts)
	} else {
		result, err = service.List(ctx.Context, input)
	}
	if err != nil {
		return nil, 0, true, err
	}
	if result.Total == 0 || len(result.Items) == 0 {
		return nil, result.Total, true, nil
	}

	familyIDs, familiesByID := indexedTranslationFamilyReadModelRecords(result.Items)
	if len(familyIDs) == 0 {
		return nil, result.Total, true, nil
	}

	rows, hydrated, err := p.hydrateOptimizedTranslationFamiliesByID(ctx, baseOpts, familyIDs)
	if !hydrated {
		return nil, 0, false, nil
	}
	if err != nil {
		return nil, 0, true, err
	}
	rows = reorderGroupedRowsByFamilyIDs(rows, familyIDs)
	for _, row := range rows {
		familyID := strings.TrimSpace(toString(row["family_id"]))
		family, ok := familiesByID[familyID]
		if !ok {
			continue
		}
		applyTranslationFamilyReadModelReadiness(row, family)
	}
	if len(requestedOpts.Fields) > 0 {
		rows = projectRecordMapsByFields(rows, requestedOpts.Fields)
	}
	return rows, result.Total, true, nil
}

func (p *panelBinding) groupedReadinessFamilyReadModelRequest(ctx AdminContext, baseOpts, requestedOpts ListOptions, readinessPredicates []ListPredicate) (translationservices.FamilyService, translationservices.ListFamiliesInput, groupedReadinessFamilyReadModelQuery, bool) {
	if p == nil || p.admin == nil || p.admin.translationFamilyStore == nil || len(readinessPredicates) == 0 {
		return translationservices.FamilyService{}, translationservices.ListFamiliesInput{}, groupedReadinessFamilyReadModelQuery{}, false
	}
	if _, ok := p.admin.translationFamilyStore.(translationservices.FamilyQueryStore); !ok {
		return translationservices.FamilyService{}, translationservices.ListFamiliesInput{}, groupedReadinessFamilyReadModelQuery{}, false
	}
	if !groupedReadinessCanUseFamilyReadModel(baseOpts) {
		return translationservices.FamilyService{}, translationservices.ListFamiliesInput{}, groupedReadinessFamilyReadModelQuery{}, false
	}
	query, ok := groupedReadinessFamilyReadModelQueryForPredicates(readinessPredicates)
	if !ok {
		return translationservices.FamilyService{}, translationservices.ListFamiliesInput{}, groupedReadinessFamilyReadModelQuery{}, false
	}
	contentType := p.groupedReadinessFamilyReadModelContentType()
	if contentType == "" {
		return translationservices.FamilyService{}, translationservices.ListFamiliesInput{}, groupedReadinessFamilyReadModelQuery{}, false
	}

	identity := translationIdentityFromAdminContext(ctx)
	service := translationservices.FamilyService{
		Store: p.admin.translationFamilyStore,
		Policies: translationservices.PolicyService{
			Resolver: translationFamilyPolicyResolver{admin: p.admin},
		},
	}
	input := translationservices.ListFamiliesInput{
		Scope: translationservices.Scope{
			TenantID: identity.TenantID,
			OrgID:    identity.OrgID,
		},
		Environment:    translationReadinessEnvironment(ctx.Context, baseOpts.Filters),
		ContentType:    contentType,
		ReadinessState: query.readinessState,
		BlockerCode:    query.blockerCode,
		Page:           requestedOpts.Page,
		PerPage:        requestedOpts.PerPage,
	}
	return service, input, query, true
}

func indexedTranslationFamilyReadModelRecords(items []translationservices.FamilyRecord) ([]string, map[string]translationservices.FamilyRecord) {
	familyIDs := make([]string, 0, len(items))
	familiesByID := make(map[string]translationservices.FamilyRecord, len(items))
	for _, family := range items {
		familyID := strings.TrimSpace(family.ID)
		if familyID == "" {
			continue
		}
		familyIDs = append(familyIDs, familyID)
		familiesByID[familyID] = family
	}
	return familyIDs, familiesByID
}

func groupedReadinessCanUseFamilyReadModel(opts ListOptions) bool {
	if strings.TrimSpace(opts.Search) != "" {
		return false
	}
	for key := range opts.Filters {
		field := key
		if parts := strings.SplitN(strings.TrimSpace(key), "__", 2); len(parts) > 0 {
			field = parts[0]
		}
		if !groupedReadinessReadModelScopeField(field) {
			return false
		}
	}
	for _, predicate := range normalizePredicates(opts.Predicates) {
		field := predicate.Field
		if parts := strings.SplitN(strings.TrimSpace(field), "__", 2); len(parts) > 0 {
			field = parts[0]
		}
		if !groupedReadinessReadModelScopeField(field) {
			return false
		}
	}
	return true
}

func groupedReadinessReadModelScopeField(field string) bool {
	switch strings.ToLower(strings.TrimSpace(field)) {
	case "", "channel", "$channel", "content_channel", "site_content_channel", "environment", "env":
		return true
	default:
		return false
	}
}

func groupedReadinessFamilyReadModelQueryForPredicates(predicates []ListPredicate) (groupedReadinessFamilyReadModelQuery, bool) {
	var query groupedReadinessFamilyReadModelQuery
	seen := false
	for _, predicate := range predicates {
		next, ok := groupedReadinessFamilyReadModelQueryForPredicate(predicate)
		if !ok {
			return groupedReadinessFamilyReadModelQuery{}, false
		}
		if !seen {
			query = next
			seen = true
			continue
		}
		if !mergeGroupedReadinessFamilyReadModelQuery(&query, next) {
			return groupedReadinessFamilyReadModelQuery{}, false
		}
	}
	return query, seen
}

func groupedReadinessFamilyReadModelQueryForPredicate(predicate ListPredicate) (groupedReadinessFamilyReadModelQuery, bool) {
	field := strings.ToLower(strings.TrimSpace(predicate.Field))
	operator := strings.ToLower(strings.TrimSpace(predicate.Operator))
	if operator == "" {
		operator = "eq"
	}
	values := normalizePredicateValues(predicate.Values)
	if len(values) != 1 {
		return groupedReadinessFamilyReadModelQuery{}, false
	}
	value := strings.ToLower(strings.TrimSpace(values[0]))
	switch field {
	case "readiness_state", "translation_readiness.readiness_state":
		switch operator {
		case "eq":
			return groupedReadinessFamilyReadModelQueryForReadinessState(value)
		case "ne":
			if value == translationReadinessStateReady {
				return groupedReadinessFamilyReadModelQuery{readinessState: string(translationcore.FamilyReadinessBlocked)}, true
			}
		}
	case "incomplete":
		if operator != "eq" {
			return groupedReadinessFamilyReadModelQuery{}, false
		}
		switch value {
		case "true":
			return groupedReadinessFamilyReadModelQuery{readinessState: string(translationcore.FamilyReadinessBlocked)}, true
		case "false":
			return groupedReadinessFamilyReadModelQuery{readinessState: string(translationcore.FamilyReadinessReady)}, true
		}
	}
	return groupedReadinessFamilyReadModelQuery{}, false
}

func groupedReadinessFamilyReadModelQueryForReadinessState(state string) (groupedReadinessFamilyReadModelQuery, bool) {
	switch strings.ToLower(strings.TrimSpace(state)) {
	case translationReadinessStateReady:
		return groupedReadinessFamilyReadModelQuery{readinessState: string(translationcore.FamilyReadinessReady)}, true
	case string(translationcore.FamilyReadinessBlocked):
		return groupedReadinessFamilyReadModelQuery{readinessState: string(translationcore.FamilyReadinessBlocked)}, true
	case translationReadinessStateMissingLocales:
		return groupedReadinessFamilyReadModelQuery{
			readinessState:        string(translationcore.FamilyReadinessBlocked),
			blockerCode:           string(translationcore.FamilyBlockerMissingLocale),
			exactContentReadiness: translationReadinessStateMissingLocales,
		}, true
	case translationReadinessStateMissingFields:
		return groupedReadinessFamilyReadModelQuery{
			readinessState:        string(translationcore.FamilyReadinessBlocked),
			blockerCode:           string(translationcore.FamilyBlockerMissingField),
			exactContentReadiness: translationReadinessStateMissingFields,
		}, true
	case translationReadinessStateMissingLocalesFields:
		return groupedReadinessFamilyReadModelQuery{
			readinessState:        string(translationcore.FamilyReadinessBlocked),
			blockerCode:           string(translationcore.FamilyBlockerMissingLocale),
			exactContentReadiness: translationReadinessStateMissingLocalesFields,
		}, true
	default:
		return groupedReadinessFamilyReadModelQuery{}, false
	}
}

func mergeGroupedReadinessFamilyReadModelQuery(base *groupedReadinessFamilyReadModelQuery, next groupedReadinessFamilyReadModelQuery) bool {
	if base == nil {
		return false
	}
	if base.readinessState != "" && next.readinessState != "" && base.readinessState != next.readinessState {
		return false
	}
	if base.blockerCode != "" && next.blockerCode != "" && base.blockerCode != next.blockerCode {
		return false
	}
	if base.exactContentReadiness != "" && next.exactContentReadiness != "" && base.exactContentReadiness != next.exactContentReadiness {
		return false
	}
	if base.readinessState == "" {
		base.readinessState = next.readinessState
	}
	if base.blockerCode == "" {
		base.blockerCode = next.blockerCode
	}
	if base.exactContentReadiness == "" {
		base.exactContentReadiness = next.exactContentReadiness
	}
	return base.readinessState != ""
}

func (q groupedReadinessFamilyReadModelQuery) needsPostFilter() bool {
	return strings.TrimSpace(q.exactContentReadiness) != ""
}

func listTranslationFamiliesFromReadModelFiltered(ctx context.Context, service translationservices.FamilyService, input translationservices.ListFamiliesInput, query groupedReadinessFamilyReadModelQuery, requestedOpts ListOptions) (translationservices.ListFamiliesResult, error) {
	page := requestedOpts.Page
	if page <= 0 {
		page = 1
	}
	perPage := requestedOpts.PerPage
	if perPage <= 0 {
		perPage = 50
	}

	start := (page - 1) * perPage
	end := start + perPage
	out := translationservices.ListFamiliesResult{
		Page:    page,
		PerPage: perPage,
	}

	scan := input
	scan.Page = 1
	scan.PerPage = 200
	for {
		result, err := service.List(ctx, scan)
		if err != nil {
			return translationservices.ListFamiliesResult{}, err
		}
		for _, family := range result.Items {
			if !groupedReadinessFamilyMatchesReadModelQuery(family, query) {
				continue
			}
			if out.Total >= start && out.Total < end {
				out.Items = append(out.Items, family)
			}
			out.Total++
		}
		if len(result.Items) == 0 || result.Page*result.PerPage >= result.Total {
			break
		}
		scan.Page = result.Page + 1
	}
	return out, nil
}

func groupedReadinessFamilyMatchesReadModelQuery(family translationservices.FamilyRecord, query groupedReadinessFamilyReadModelQuery) bool {
	if strings.TrimSpace(query.exactContentReadiness) == "" {
		return true
	}
	return strings.EqualFold(translationReadinessStateFromFamilyRecord(family), query.exactContentReadiness)
}

func (p *panelBinding) groupedReadinessFamilyReadModelContentType() string {
	if p == nil {
		return ""
	}
	if p.panel != nil {
		if repo, ok := p.panel.repo.(*CMSContentTypeEntryRepository); ok && repo != nil {
			if value := normalizePolicyEntityKey(primitives.FirstNonEmptyRaw(repo.contentType.Slug, repo.contentType.Name, repo.contentType.ID)); value != "" {
				return value
			}
		}
		if value := normalizePolicyEntityKey(p.panel.name); value != "" {
			return value
		}
	}
	return normalizePolicyEntityKey(p.name)
}

func (p *panelBinding) hydrateOptimizedTranslationFamiliesByID(ctx AdminContext, baseOpts ListOptions, familyIDs []string) ([]map[string]any, bool, error) {
	if len(familyIDs) == 0 {
		return nil, true, nil
	}
	fetch := cloneListOptions(baseOpts)
	fetch.Page = 1
	fetch.PerPage = len(familyIDs)
	fetch.Fields = nil
	if fetch.Filters == nil {
		fetch.Filters = map[string]any{}
	}
	fetch.Filters["family_id"] = append([]string{}, familyIDs...)
	rows, _, handled, err := p.listOptimizedTranslationFamilies(ctx, fetch)
	if !handled || err != nil {
		return nil, handled, err
	}
	return rows, true, nil
}

func reorderGroupedRowsByFamilyIDs(rows []map[string]any, familyIDs []string) []map[string]any {
	if len(rows) == 0 || len(familyIDs) == 0 {
		return rows
	}
	byFamilyID := make(map[string]map[string]any, len(rows))
	for _, row := range rows {
		familyID := strings.TrimSpace(toString(row["family_id"]))
		if familyID == "" {
			continue
		}
		byFamilyID[familyID] = row
	}
	out := make([]map[string]any, 0, len(rows))
	for _, familyID := range familyIDs {
		if row, ok := byFamilyID[strings.TrimSpace(familyID)]; ok {
			out = append(out, row)
		}
	}
	return out
}

func (p *panelBinding) listOptimizedTranslationFamiliesWithReadinessPredicates(ctx AdminContext, baseOpts, requestedOpts ListOptions, readinessPredicates []ListPredicate) ([]map[string]any, int, bool, error) {
	if len(readinessPredicates) == 0 {
		return nil, 0, false, nil
	}

	fetch := cloneListOptions(baseOpts)
	fetch.Page = 1
	fetch.PerPage = groupedReadinessFamilyScanPerPage
	fetch.Fields = nil

	capacity := requestedOpts.PerPage
	if capacity <= 0 {
		capacity = 10
	}
	filtered := make([]map[string]any, 0, capacity)
	for {
		batch, total, handled, err := p.listOptimizedTranslationFamilies(ctx, fetch)
		if !handled {
			return nil, 0, false, nil
		}
		if err != nil {
			return nil, 0, true, err
		}
		if len(batch) == 0 {
			break
		}

		batch = p.withGroupedTranslationReadiness(ctx, batch, baseOpts.Filters)
		for _, record := range batch {
			if !groupedTranslationRowMatchesBasePredicates(record, baseOpts.Predicates) {
				continue
			}
			if !recordMatchesAllListPredicates(record, readinessPredicates) {
				continue
			}
			filtered = append(filtered, record)
		}

		if translationLocalePageComplete(batch, total, fetch.Page, fetch.PerPage) {
			break
		}
		fetch.Page++
	}

	paginated, total := paginateInMemory(filtered, requestedOpts, 10)
	if len(requestedOpts.Fields) > 0 {
		paginated = projectRecordMapsByFields(paginated, requestedOpts.Fields)
	}
	return paginated, total, true, nil
}

func groupedTranslationRowMatchesBasePredicates(record map[string]any, predicates []ListPredicate) bool {
	predicates = normalizePredicates(predicates)
	if len(predicates) == 0 {
		return true
	}
	options := listRecordOptions{
		SkipFields: map[string]struct{}{
			"channel":  {},
			"group_by": {},
			"groupby":  {},
		},
		PredicateMatcher: cmsContentRecordPredicateMatcher,
	}
	if recordMatchesListQuery(record, "", predicates, options) {
		return true
	}
	if parent := extractMap(record["parent"]); len(parent) > 0 && recordMatchesListQuery(parent, "", predicates, options) {
		return true
	}
	for _, child := range groupedTranslationRowChildren(record) {
		if recordMatchesListQuery(child, "", predicates, options) {
			return true
		}
	}
	return false
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
		groupID := translationFamilyIDForRecord(record)
		recordClone := primitives.CloneAnyMap(record)
		if groupID != "" {
			recordClone["family_id"] = groupID
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
			"id":           "group:" + groupID,
			"family_id":    groupID,
			"family_label": groupLabel,
			"group_by":     listGroupByFamilyID,
			"_group": map[string]any{
				"id":          groupID,
				"label":       groupLabel,
				"row_type":    "group",
				"child_count": len(annotatedChildren),
				"parent_id":   strings.TrimSpace(toString(parent["id"])),
			},
			"parent":                parent,
			"children":              annotatedChildren,
			"records":               annotatedChildren,
			"family_summary":        summary,
			"available_count":       summary["available_count"],
			"required_count":        summary["required_count"],
			"missing_locales":       summary["missing_locales"],
			"last_updated_at":       summary["last_updated_at"],
			"requirements_resolved": summary["requirements_resolved"],
			"requirements_state":    summary["requirements_state"],
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

func (p *panelBinding) withGroupedTranslationReadiness(ctx AdminContext, groups []map[string]any, filters map[string]any) []map[string]any {
	if len(groups) == 0 {
		return groups
	}
	defaultLocale := p.groupedRowsDefaultLocale(ctx)
	out := make([]map[string]any, 0, len(groups))
	for _, group := range groups {
		cloned := primitives.CloneAnyMap(group)
		if cloned == nil {
			cloned = map[string]any{}
		}
		children := groupedTranslationRowChildren(cloned)
		if len(children) == 0 {
			record := p.withTranslationReadinessRecord(ctx, cloned, filters)
			applyTranslationGroupSummaryReadinessFields(record)
			out = append(out, record)
			continue
		}

		children = p.withTranslationReadiness(ctx, children, filters)
		rebuilt := buildTranslationGroupedRows(children, defaultLocale)
		if len(rebuilt) == 0 {
			applyTranslationGroupSummaryReadinessFields(cloned)
			out = append(out, cloned)
			continue
		}

		merged := primitives.CloneAnyMap(cloned)
		if merged == nil {
			merged = map[string]any{}
		}
		maps.Copy(merged, rebuilt[0])
		applyTranslationGroupSummaryReadinessFields(merged)
		out = append(out, merged)
	}
	return out
}

func groupedTranslationRowChildren(row map[string]any) []map[string]any {
	for _, key := range []string{"children", "records"} {
		if children := toMapSlice(row[key]); len(children) > 0 {
			return children
		}
	}
	if parent := extractMap(row["parent"]); len(parent) > 0 {
		return []map[string]any{parent}
	}
	return nil
}

func applyTranslationGroupSummaryReadinessFields(row map[string]any) {
	if len(row) == 0 {
		return
	}
	summary := extractMap(row["family_summary"])
	if len(summary) == 0 {
		return
	}
	state := normalizeTranslationReadinessState(toString(summary["readiness_state"]))
	if state == "" {
		return
	}
	readiness := primitives.CloneAnyMap(summary)
	if readiness == nil {
		readiness = map[string]any{}
	}
	readiness["readiness_state"] = state
	if _, ok := readiness["missing_required_locales"]; !ok {
		readiness["missing_required_locales"] = readiness["missing_locales"]
	}
	if _, ok := readiness["family_id"]; !ok {
		readiness["family_id"] = strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(row["family_id"]), toString(summary["group_id"])))
	}
	if _, ok := readiness["ready_for_transition"]; !ok {
		readiness["ready_for_transition"] = map[string]bool{translationReadinessTransitionPublish: state == translationReadinessStateReady}
	}
	applyTranslationReadinessFields(row, readiness)
}

func applyTranslationFamilyReadModelReadiness(row map[string]any, family translationservices.FamilyRecord) {
	if len(row) == 0 || strings.TrimSpace(family.ID) == "" {
		return
	}
	state := translationReadinessStateFromFamilyRecord(family)
	if state == "" {
		return
	}
	availableLocales := translationFamilyAvailableLocales(family)
	missingLocales := translationFamilyMissingLocales(family)
	missingFields := translationFamilyMissingFieldsByLocale(family)
	requiredLocales := append([]string{}, family.Policy.RequiredLocales...)
	readiness := map[string]any{
		"family_id":                         family.ID,
		"family_readiness_state":            strings.TrimSpace(family.ReadinessState),
		"blocker_codes":                     append([]string{}, family.BlockerCodes...),
		"family_blockers":                   cloneFamilyBlockerPayloads(family.Blockers),
		"required_locales":                  requiredLocales,
		"required_for_publish":              append([]string{}, requiredLocales...),
		"available_locales":                 availableLocales,
		"missing_required_locales":          missingLocales,
		"missing_locales":                   append([]string{}, missingLocales...),
		"missing_required_fields_by_locale": missingFields,
		"readiness_state":                   state,
		"ready_for_transition":              map[string]bool{translationReadinessTransitionPublish: state == translationReadinessStateReady},
		"requirements_resolved":             len(requiredLocales) > 0,
		"quick_create":                      translationReadinessQuickCreatePayloadMap(translationFamilyQuickCreatePayload(family)),
	}
	applyTranslationReadinessFields(row, readiness)
	applyTranslationFamilyReadModelSummary(row, family, readiness)
}

func translationReadinessStateFromFamilyRecord(family translationservices.FamilyRecord) string {
	if strings.EqualFold(strings.TrimSpace(family.ReadinessState), string(translationcore.FamilyReadinessReady)) {
		return translationReadinessStateReady
	}
	hasMissingLocale := false
	hasMissingField := false
	for _, code := range family.BlockerCodes {
		switch strings.ToLower(strings.TrimSpace(code)) {
		case string(translationcore.FamilyBlockerMissingLocale):
			hasMissingLocale = true
		case string(translationcore.FamilyBlockerMissingField):
			hasMissingField = true
		}
	}
	for _, blocker := range family.Blockers {
		switch strings.ToLower(strings.TrimSpace(blocker.BlockerCode)) {
		case string(translationcore.FamilyBlockerMissingLocale):
			hasMissingLocale = true
		case string(translationcore.FamilyBlockerMissingField):
			hasMissingField = true
		}
	}
	switch {
	case hasMissingLocale && hasMissingField:
		return translationReadinessStateMissingLocalesFields
	case hasMissingLocale || family.MissingRequiredLocaleCount > 0:
		return translationReadinessStateMissingLocales
	case hasMissingField:
		return translationReadinessStateMissingFields
	case strings.EqualFold(strings.TrimSpace(family.ReadinessState), string(translationcore.FamilyReadinessBlocked)):
		return translationReadinessStateMissingFields
	default:
		return ""
	}
}

func translationFamilyMissingFieldsByLocale(family translationservices.FamilyRecord) map[string][]string {
	out := map[string][]string{}
	for _, blocker := range family.Blockers {
		if !strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerMissingField)) {
			continue
		}
		locale := strings.ToLower(strings.TrimSpace(blocker.Locale))
		field := strings.TrimSpace(blocker.FieldPath)
		if locale == "" || field == "" {
			continue
		}
		out[locale] = append(out[locale], field)
	}
	if len(out) == 0 {
		return map[string][]string{}
	}
	for locale, fields := range out {
		out[locale] = dedupeAndSortStrings(fields)
	}
	return out
}

func applyTranslationFamilyReadModelSummary(row map[string]any, family translationservices.FamilyRecord, readiness map[string]any) {
	summary := primitives.CloneAnyMap(extractMap(row["family_summary"]))
	if summary == nil {
		summary = map[string]any{}
	}
	state := strings.TrimSpace(toString(readiness["readiness_state"]))
	requiredLocales := toStringSlice(readiness["required_locales"])
	availableLocales := toStringSlice(readiness["available_locales"])
	missingLocales := toStringSlice(readiness["missing_required_locales"])
	summary["group_id"] = family.ID
	summary["required_locales"] = requiredLocales
	summary["available_locales"] = availableLocales
	summary["missing_locales"] = missingLocales
	summary["required_count"] = len(requiredLocales)
	summary["available_count"] = len(availableLocales)
	summary["missing_count"] = len(missingLocales)
	summary["readiness_state"] = state
	summary["ready_for_publish"] = state == translationReadinessStateReady
	summary["requirements_resolved"] = len(requiredLocales) > 0
	if len(requiredLocales) > 0 {
		summary["requirements_state"] = "resolved"
	}
	row["family_summary"] = summary
	row["available_count"] = summary["available_count"]
	row["required_count"] = summary["required_count"]
	row["missing_locales"] = summary["missing_locales"]
	row["requirements_resolved"] = summary["requirements_resolved"]
	row["requirements_state"] = summary["requirements_state"]
}

func translationFamilyIDForRecord(record map[string]any) string {
	return strings.TrimSpace(translationFamilyIDFromRecord(record))
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
	lastUpdatedAt := latestTranslationGroupTimestamp(records)
	requiredLocales, availableLocales, missingFields, requirementsResolved := collectTranslationGroupSummaryState(records)
	missingLocales := translationReadinessMissingLocales(requiredLocales, availableLocales)
	state := ""
	if len(requiredLocales) > 0 || len(missingFields) > 0 {
		state = translationReadinessState(missingLocales, missingFields)
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

func collectTranslationGroupSummaryState(records []map[string]any) ([]string, []string, map[string][]string, bool) {
	required := map[string]struct{}{}
	available := map[string]struct{}{}
	groupMissingFields := map[string]struct{}{}
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
		collectTranslationGroupLocales(required, readiness["required_locales"])
		collectTranslationGroupLocales(available, readiness["available_locales"])
		if len(readiness) == 0 {
			collectTranslationGroupLocales(available, record["available_locales"])
			collectTranslationGroupRecordLocale(available, record)
		}
		collectTranslationGroupMissingFields(groupMissingFields, readiness)
	}
	if !requirementsSignal {
		requirementsResolved = false
	}
	return localeSetToSortedList(required), localeSetToSortedList(available), translationGroupMissingFields(groupMissingFields), requirementsResolved
}

func collectTranslationGroupLocales(out map[string]struct{}, raw any) {
	for _, locale := range normalizedLocaleList(raw) {
		out[locale] = struct{}{}
	}
}

func collectTranslationGroupRecordLocale(out map[string]struct{}, record map[string]any) {
	if locale := strings.ToLower(strings.TrimSpace(toString(record["locale"]))); locale != "" {
		out[locale] = struct{}{}
	}
}

func collectTranslationGroupMissingFields(out map[string]struct{}, readiness map[string]any) {
	for _, locale := range translationReadinessMissingFieldLocales(readiness) {
		out[locale] = struct{}{}
	}
}

func translationGroupMissingFields(locales map[string]struct{}) map[string][]string {
	out := map[string][]string{}
	for locale := range locales {
		out[locale] = []string{"missing_fields"}
	}
	return out
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

func (p *panelBinding) withGroupedRowActionState(ctx AdminContext, groups []map[string]any, actions []Action) ([]map[string]any, error) {
	if len(groups) == 0 || len(actions) == 0 {
		return groups, nil
	}
	out := make([]map[string]any, 0, len(groups))
	for _, group := range groups {
		cloned := primitives.CloneAnyMap(group)
		children := toMapSlice(cloned["children"])
		parent := extractMap(cloned["parent"])
		if len(children) == 0 && len(parent) == 0 {
			rowWithState, err := p.withRowActionState(ctx, []map[string]any{cloned}, actions)
			if err != nil {
				return nil, err
			}
			if len(rowWithState) > 0 {
				out = append(out, rowWithState[0])
			} else {
				out = append(out, cloned)
			}
			continue
		}
		if len(children) > 0 {
			childrenWithState, err := p.withRowActionState(ctx, children, actions)
			if err != nil {
				return nil, err
			}
			cloned["children"] = childrenWithState
			cloned["records"] = childrenWithState
		}
		if len(parent) > 0 {
			parentWithState, err := p.withRowActionState(ctx, []map[string]any{parent}, actions)
			if err != nil {
				return nil, err
			}
			if len(parentWithState) > 0 {
				cloned["parent"] = parentWithState[0]
				if state := actionStateEnvelope(parentWithState[0]["_action_state"]); len(state) > 0 {
					cloned["_action_state"] = state
				}
			}
		}
		out = append(out, cloned)
	}
	return out, nil
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

func actionMatchesAvailableWorkflowTransition(action string, transitions []WorkflowTransitionInfo) bool {
	if len(transitions) == 0 {
		return false
	}
	candidates := workflowTransitionCandidates(action)
	for _, transition := range transitions {
		if containsTransitionEvent(candidates, transition.Event) {
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
	body = normalizeActionPayloadMap(body)
	queryLocale := ""
	queryChannel := ""
	queryPolicyEntity := ""
	if len(values) > 0 {
		queryLocale = strings.TrimSpace(values[0])
	}
	if len(values) > 1 {
		queryChannel = strings.TrimSpace(values[1])
	}
	if len(values) > 2 && queryChannel == "" {
		queryChannel = strings.TrimSpace(values[2])
	}
	if len(values) > 3 {
		queryPolicyEntity = strings.TrimSpace(values[3])
	}
	if len(values) > 4 && queryPolicyEntity == "" {
		queryPolicyEntity = strings.TrimSpace(values[4])
	}

	if strings.TrimSpace(toString(body[adminkeys.KeyLocale])) == "" {
		switch {
		case queryLocale != "":
			body[adminkeys.KeyLocale] = queryLocale
		case strings.TrimSpace(locale) != "":
			body[adminkeys.KeyLocale] = strings.TrimSpace(locale)
		}
	}
	if strings.TrimSpace(toString(body[adminkeys.KeyChannel])) == "" && queryChannel != "" {
		body[adminkeys.KeyChannel] = queryChannel
	}
	if strings.TrimSpace(toString(body[adminkeys.KeyPolicyEntity])) == "" && queryPolicyEntity != "" {
		body[adminkeys.KeyPolicyEntity] = queryPolicyEntity
	}
	return normalizeActionPayloadMap(body)
}

func mergePanelActionActorContext(body map[string]any, ctx AdminContext) map[string]any {
	body = normalizeActionPayloadMap(body)
	userID := strings.TrimSpace(primitives.FirstNonEmptyRaw(ctx.UserID, userIDFromContext(ctx.Context), actorFromContext(ctx.Context)))
	if userID != "" {
		if strings.TrimSpace(toString(body["user_id"])) == "" {
			body["user_id"] = userID
		}
		if strings.TrimSpace(toString(body["actor_id"])) == "" {
			body["actor_id"] = userID
		}
	}
	if tenantID := strings.TrimSpace(primitives.FirstNonEmptyRaw(ctx.TenantID, tenantIDFromContext(ctx.Context))); tenantID != "" {
		if strings.TrimSpace(toString(body["tenant"])) == "" {
			body["tenant"] = tenantID
		}
	}
	if requestID := strings.TrimSpace(requestIDFromContext(ctx.Context)); requestID != "" {
		if strings.TrimSpace(toString(body["request_id"])) == "" {
			body["request_id"] = requestID
		}
	}
	if correlationID := strings.TrimSpace(correlationIDFromContext(ctx.Context)); correlationID != "" {
		if strings.TrimSpace(toString(body["correlation_id"])) == "" {
			body["correlation_id"] = correlationID
		}
	}
	return normalizeActionPayloadMap(body)
}

func resolvePrimaryActionID(body map[string]any, ids []string) string {
	if len(body) == 0 {
		return firstNonEmptyActionID(ids)
	}
	if id := strings.TrimSpace(toString(body[adminkeys.KeyID])); id != "" {
		return id
	}
	if id := strings.TrimSpace(toString(extractMap(body[adminkeys.KeyRecord])[adminkeys.KeyID])); id != "" {
		return id
	}
	if id := selectionActionID(extractMap(body[adminkeys.KeySelection])); id != "" {
		return id
	}
	if id := firstNonEmptyActionID(toStringSlice(body[adminkeys.KeyIDs])); id != "" {
		return id
	}
	return firstNonEmptyActionID(ids)
}

func selectionActionID(selection map[string]any) string {
	if id := strings.TrimSpace(toString(selection[adminkeys.KeyID])); id != "" {
		return id
	}
	return firstNonEmptyActionID(toStringSlice(selection[adminkeys.KeyIDs]))
}

func firstNonEmptyActionID(ids []string) string {
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
		records, total, err := repo.List(ctx, ListOptions{Page: page, PerPage: perPage})
		if err != nil {
			return false, err
		}
		if translationLocaleExistsInRecords(records, groupID, locale, skipID) {
			return true, nil
		}
		if translationLocalePageComplete(records, total, page, perPage) {
			return false, nil
		}
		page++
	}
}

func translationLocaleExistsInRecords(records []map[string]any, groupID, locale, skipID string) bool {
	for _, record := range records {
		if strings.TrimSpace(toString(record["id"])) == strings.TrimSpace(skipID) {
			continue
		}
		candidateGroup := strings.TrimSpace(translationFamilyIDFromRecord(record))
		if candidateGroup == "" || !strings.EqualFold(candidateGroup, groupID) {
			continue
		}
		candidateLocale := strings.TrimSpace(toString(record["locale"]))
		if candidateLocale != "" && strings.EqualFold(candidateLocale, locale) {
			return true
		}
	}
	return false
}

func translationLocalePageComplete(records []map[string]any, total, page, perPage int) bool {
	if len(records) == 0 {
		return true
	}
	if total > 0 && page*perPage >= total {
		return true
	}
	return len(records) < perPage
}

func mapCreateTranslationPersistenceError(err error, panel, entityID, sourceLocale, locale, groupID string) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrPathConflict) {
		return TranslationAlreadyExistsError{
			Panel:        strings.TrimSpace(panel),
			EntityID:     strings.TrimSpace(entityID),
			SourceLocale: strings.TrimSpace(sourceLocale),
			Locale:       strings.TrimSpace(locale),
			FamilyID:     strings.TrimSpace(groupID),
		}
	}
	message := strings.ToLower(strings.TrimSpace(err.Error()))
	if strings.Contains(message, "slug already exists") ||
		strings.Contains(message, "path conflict") ||
		strings.Contains(message, "duplicate key") ||
		strings.Contains(message, "unique constraint failed") {
		return TranslationAlreadyExistsError{
			Panel:        strings.TrimSpace(panel),
			EntityID:     strings.TrimSpace(entityID),
			SourceLocale: strings.TrimSpace(sourceLocale),
			Locale:       strings.TrimSpace(locale),
			FamilyID:     strings.TrimSpace(groupID),
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

	if normalizeCreateTranslationLocale(targetLocale) == "" {
		return
	}
}

func buildCreateTranslationResponse(created map[string]any, locale, groupID string) map[string]any {
	response := map[string]any{
		"locale":    strings.TrimSpace(locale),
		"family_id": strings.TrimSpace(groupID),
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
	if createdGroupID := strings.TrimSpace(toString(created["family_id"])); createdGroupID != "" {
		response["family_id"] = createdGroupID
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
		"channel":          strings.TrimSpace(input.Environment),
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
	body = mergePanelActionContext(body, locale, c.Query(adminkeys.KeyLocale), c.Query(adminkeys.KeyChannel), "", c.Query(adminkeys.KeyPolicyEntity))
	body = mergePanelActionActorContext(body, ctx)
	ids := parseCommandIDs(body, c.Query(adminkeys.KeyID), c.Query(adminkeys.KeyIDs))
	if isBulkCreateMissingTranslationsAction(action) {
		return p.bulkCreateMissingTranslations(c, ctx, locale, body, ids)
	}
	if definition, ok := p.panel.findBulkAction(action); ok {
		body = applyActionPayloadDefaults(definition, body, ids)
		if err := validateActionPayload(definition, body); err != nil {
			return nil, err
		}
		if state, ok, err := p.targetedBulkActionExecutionState(ctx, action, ids, parseListOptions(c)); err != nil {
			return nil, err
		} else if ok && !state.Enabled {
			return nil, bulkActionBlockedError(p.name, definition, state)
		}
	}
	if err := p.panel.RunBulkAction(ctx, action, body, ids); err != nil {
		return nil, err
	}
	return nil, nil
}
