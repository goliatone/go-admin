package admin

import (
	"context"
	"errors"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"maps"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/boot"
	cmscontent "github.com/goliatone/go-cms/content"
	cmspages "github.com/goliatone/go-cms/pages"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
)

type featureGatesAdapter struct {
	gate fggate.FeatureGate
}

func (f featureGatesAdapter) Enabled(key string) bool {
	enabled, err := f.enabled(context.Background(), key)
	return err == nil && enabled
}

func (f featureGatesAdapter) Require(key string) error {
	enabled, err := f.enabled(context.Background(), key)
	if err != nil {
		return err
	}
	if enabled {
		return nil
	}
	return FeatureDisabledError{Feature: key}
}

func (f featureGatesAdapter) enabled(ctx context.Context, key string) (bool, error) {
	if f.gate == nil {
		return false, nil
	}
	return f.gate.Enabled(ctx, key, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
}

type responderAdapter struct{}

func (responderAdapter) WriteJSON(c router.Context, payload any) error {
	return writeJSON(c, payload)
}

func (responderAdapter) WriteJSONStatus(c router.Context, statusCode int, payload any) error {
	if statusCode < 200 || statusCode >= 600 {
		statusCode = 200
	}
	return c.JSON(statusCode, payload)
}

func (responderAdapter) WriteHTML(c router.Context, html string) error {
	return writeHTML(c, html)
}

func (responderAdapter) WriteError(c router.Context, err error) error {
	return writeError(c, err)
}

type panelBinding struct {
	admin *Admin
	name  string
	panel *Panel
}

const (
	listGroupByFamilyID                        = "family_id"
	bulkCreateMissingTranslationsAction        = "create-missing-translations"
	bulkCreateMissingTranslationsActionAlias   = "create_missing_translations"
	bulkCreateMissingTranslationReasonNoLocale = "NO_MISSING_LOCALES"
)

func newPanelBindings(a *Admin) []boot.PanelBinding {
	if a == nil || a.registry == nil {
		return nil
	}
	out := []boot.PanelBinding{}
	preferencesEnabled := featureEnabled(a.featureGate, FeaturePreferences)
	for name, panel := range a.registry.Panels() {
		if name == preferencesModuleID && !preferencesEnabled {
			continue
		}
		out = append(out, &panelBinding{admin: a, name: name, panel: panel})
	}
	return out
}

func (p *panelBinding) Name() string { return p.name }

func (p *panelBinding) List(c router.Context, locale string, opts boot.ListOptions) ([]map[string]any, int, any, any, map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	listOpts := panelListOptions(opts)
	baseSchema := p.panel.Schema()
	requestedListOpts, groupedByTranslationGroup := p.requestedListOptions(baseSchema, locale, listOpts)
	records, total, err := p.listRecords(ctx, requestedListOpts, groupedByTranslationGroup)
	if err != nil {
		return nil, 0, nil, nil, nil, err
	}
	records = withTranslationDatagridRecords(p.admin, ctx.Channel, records)
	schema := p.panel.SchemaWithTheme(p.admin.themePayload(ctx.Context))
	schema.Actions = filterActionsForScope(schema.Actions, ActionScopeRow)
	schema.BulkActions = filterActionsForScope(schema.BulkActions, ActionScopeBulk)
	schema.BulkActionStateConfig = p.bulkActionStateConfig(schema.BulkActions)
	if groupedByTranslationGroup {
		records, err = p.withGroupedRowActionState(ctx, records, schema.Actions)
	} else {
		records, err = p.withRowActionState(ctx, records, schema.Actions)
	}
	if err != nil {
		return nil, 0, nil, nil, nil, err
	}
	if p.admin != nil {
		p.admin.applyContentTypeSchemaFromContext(ctx, &schema, p.name)
	}
	if err := p.admin.decorateSchemaFor(ctx, &schema, p.name); err != nil {
		return nil, 0, nil, nil, nil, err
	}
	form, err := p.listForm(ctx)
	if err != nil {
		return nil, 0, nil, nil, nil, err
	}
	meta, err := p.listMeta(ctx, total, schema.BulkActions, requestedListOpts)
	if err != nil {
		return nil, 0, nil, nil, nil, err
	}
	return records, total, schema, form, meta, nil
}

func panelListOptions(opts boot.ListOptions) ListOptions {
	listOpts := ListOptions{
		Page:     opts.Page,
		PerPage:  opts.PerPage,
		SortBy:   opts.SortBy,
		SortDesc: opts.SortDesc,
		Filters:  opts.Filters,
		Fields:   append([]string{}, opts.Fields...),
		Search:   opts.Search,
	}
	if len(opts.Predicates) > 0 {
		listOpts.Predicates = make([]ListPredicate, 0, len(opts.Predicates))
		for _, predicate := range opts.Predicates {
			listOpts.Predicates = append(listOpts.Predicates, ListPredicate{
				Field:    predicate.Field,
				Operator: predicate.Operator,
				Values:   append([]string{}, predicate.Values...),
			})
		}
	}
	return listOpts
}

func (p *panelBinding) requestedListOptions(baseSchema Schema, locale string, listOpts ListOptions) (ListOptions, bool) {
	if listOpts.Search != "" {
		if listOpts.Filters == nil {
			listOpts.Filters = map[string]any{}
		}
		listOpts.Filters["_search"] = listOpts.Search
	}
	requestedListOpts, groupBy := splitListGroupByOption(listOpts)
	groupedByTranslationGroup := strings.EqualFold(strings.TrimSpace(groupBy), listGroupByFamilyID)
	shouldScopeByLocale := baseSchema.UseBlocks || baseSchema.UseSEO || baseSchema.TreeView
	if shouldScopeByLocale && strings.TrimSpace(locale) != "" && !groupedByTranslationGroup {
		if requestedListOpts.Filters == nil {
			requestedListOpts.Filters = map[string]any{}
		}
		if strings.TrimSpace(toString(requestedListOpts.Filters["locale"])) == "" {
			requestedListOpts.Filters["locale"] = locale
		}
	}
	return requestedListOpts, groupedByTranslationGroup
}

func (p *panelBinding) listRecords(ctx AdminContext, requestedListOpts ListOptions, groupedByTranslationGroup bool) ([]map[string]any, int, error) {
	baseListOpts, readinessPredicates := splitTranslationReadinessPredicates(requestedListOpts)
	if groupedByTranslationGroup {
		ctx.Context = withTranslationFamilyExpansion(ctx.Context)
		return p.listGroupedByTranslationGroup(ctx, baseListOpts, requestedListOpts, readinessPredicates)
	}
	if len(readinessPredicates) > 0 {
		return p.listWithTranslationReadinessPredicates(ctx, baseListOpts, requestedListOpts, readinessPredicates)
	}
	records, total, err := p.panel.List(ctx, requestedListOpts)
	if err != nil {
		return nil, 0, err
	}
	return p.withTranslationReadiness(ctx, records, requestedListOpts.Filters), total, nil
}

func (p *panelBinding) listForm(ctx AdminContext) (PanelFormRequest, error) {
	var form PanelFormRequest
	if p.admin.panelForm == nil {
		return form, nil
	}
	form = p.admin.panelForm.Build(p.panel, ctx, nil, nil)
	if p.admin != nil {
		p.admin.applyContentTypeSchemaFromContext(ctx, &form.Schema, p.name)
	}
	if err := p.admin.decorateSchemaFor(ctx, &form.Schema, p.name); err != nil {
		return PanelFormRequest{}, err
	}
	return form, nil
}

func (p *panelBinding) listMeta(ctx AdminContext, total int, bulkActions []Action, requestedListOpts ListOptions) (map[string]any, error) {
	meta := map[string]any{"count": total}
	bulkActionState, err := p.bulkActionState(ctx, bulkActions, requestedListOpts)
	if err != nil {
		return nil, err
	}
	if len(bulkActionState) > 0 {
		meta["bulk_action_state"] = bulkActionState
	}
	return meta, nil
}

func (p *panelBinding) Detail(c router.Context, locale string, id string) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	record, err := p.panel.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	record = p.withTranslationReadinessRecord(ctx, record, nil)
	record = normalizeFallbackContextRecord(record, locale)
	record = withTranslationDatagridRecord(p.admin, ctx.Channel, record)
	applySourceTargetDriftContract(record)
	siblings, siblingsDegraded, siblingsReason := p.translationSiblingsPayload(ctx, id, locale, record)
	schema := p.panel.SchemaWithTheme(p.admin.themePayload(ctx.Context))
	contentTypeKey := detailContentTypeKey(p.name, record)
	if p.admin != nil && contentTypeKey != "" {
		p.admin.applyContentTypeSchema(ctx, &schema, contentTypeKey)
	}
	if err := p.admin.decorateSchemaFor(ctx, &schema, p.name); err != nil {
		return nil, err
	}
	schema.Actions = filterActionsForScope(schema.Actions, ActionScopeDetail)
	form, err := p.detailForm(ctx, record, contentTypeKey)
	if err != nil {
		return nil, err
	}
	record, err = p.detailRecordWithActionState(ctx, record, schema.Actions)
	if err != nil {
		return nil, err
	}

	res := map[string]any{
		"data":     record,
		"schema":   schema,
		"form":     form,
		"siblings": siblings,
	}
	if siblingsDegraded {
		res["siblings_degraded"] = true
		if strings.TrimSpace(siblingsReason) != "" {
			res["siblings_degraded_reason"] = strings.TrimSpace(siblingsReason)
		}
	}
	if drift := extractMap(record[translationSourceTargetDriftKey]); len(drift) > 0 {
		res[translationSourceTargetDriftKey] = drift
	}

	if p.panel.workflow != nil {
		state := ""
		if s, ok := record["status"].(string); ok {
			state = s
		}
		recordID := strings.TrimSpace(toString(record["id"]))
		if transitions, err := workflowSnapshotTransitions(ctx.Context, p.panel.workflow, p.name, recordID, state, record, true); err == nil {
			res["workflow"] = map[string]any{
				"transitions": transitions,
			}
		}
	}

	return res, nil
}

func detailContentTypeKey(panelName string, record map[string]any) string {
	if panelName != "content" || record == nil {
		return ""
	}
	return primitives.FirstNonEmptyRaw(
		toString(record["content_type_slug"]),
		toString(record["content_type"]),
		toString(record["content_type_id"]),
	)
}

func (p *panelBinding) detailForm(ctx AdminContext, record map[string]any, contentTypeKey string) (PanelFormRequest, error) {
	var form PanelFormRequest
	if p.admin.panelForm == nil {
		return form, nil
	}
	form = p.admin.panelForm.Build(p.panel, ctx, record, nil)
	if p.admin != nil && contentTypeKey != "" {
		p.admin.applyContentTypeSchema(ctx, &form.Schema, contentTypeKey)
	}
	if err := p.admin.decorateSchemaFor(ctx, &form.Schema, p.name); err != nil {
		return PanelFormRequest{}, err
	}
	return form, nil
}

func (p *panelBinding) detailRecordWithActionState(ctx AdminContext, record map[string]any, actions []Action) (map[string]any, error) {
	if len(actions) == 0 {
		return record, nil
	}
	withState, err := p.withScopedActionState(ctx, []map[string]any{record}, actions, ActionScopeDetail)
	if err != nil {
		return nil, err
	}
	if len(withState) == 0 {
		return record, nil
	}
	return withState[0], nil
}

func (p *panelBinding) Create(c router.Context, locale string, body map[string]any) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	return p.panel.Create(ctx, body)
}

func (p *panelBinding) Update(c router.Context, locale string, id string, body map[string]any) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	if err := p.autosaveConflictForUpdate(ctx, id, body); err != nil {
		return nil, err
	}
	updated, err := p.panel.Update(ctx, id, body)
	if err != nil {
		return nil, err
	}
	updated = normalizeFallbackContextRecord(updated, locale)
	applySourceTargetDriftContract(updated)
	return updated, nil
}

func (p *panelBinding) Delete(c router.Context, locale string, id string) error {
	ctx := p.admin.adminContextFromRequest(c, locale)
	return p.panel.Delete(ctx, id)
}

func normalizeFallbackContextRecord(record map[string]any, requestedLocale string) map[string]any {
	record = primitives.CloneAnyMap(record)
	if record == nil {
		record = map[string]any{}
	}

	requestedLocale = strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["requested_locale"]),
		requestedLocale,
		toString(record["locale"]),
	))
	resolvedLocale := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["resolved_locale"]),
		toString(record["locale"]),
		requestedLocale,
	))
	missingRequested := toBool(record["missing_requested_locale"])
	if !missingRequested && requestedLocale != "" && resolvedLocale != "" && !strings.EqualFold(requestedLocale, resolvedLocale) {
		missingRequested = true
	}
	fallbackUsed := toBool(record["fallback_used"])
	if !fallbackUsed && missingRequested {
		fallbackUsed = true
	}

	record["requested_locale"] = requestedLocale
	record["resolved_locale"] = resolvedLocale
	record["missing_requested_locale"] = missingRequested
	record["fallback_used"] = fallbackUsed
	return record
}

func (p *panelBinding) translationSiblingsPayload(ctx AdminContext, id, requestedLocale string, record map[string]any) ([]map[string]any, bool, string) {
	if p == nil || p.panel == nil {
		return []map[string]any{}, true, "panel_unavailable"
	}
	id = strings.TrimSpace(id)
	groupID := strings.TrimSpace(translationFamilyIDFromRecord(record))
	if groupID == "" {
		return []map[string]any{translationSiblingSummary(record, id, requestedLocale)}, true, "canonical_family_id_missing"
	}

	siblings, degraded, reason := p.loadTranslationSiblings(ctx, id, requestedLocale, groupID)
	if len(siblings) == 0 {
		siblings = append(siblings, translationSiblingSummary(record, id, requestedLocale))
	}
	sortTranslationSiblings(siblings)
	return siblings, degraded, reason
}

func (p *panelBinding) loadTranslationSiblings(ctx AdminContext, id, requestedLocale, groupID string) ([]map[string]any, bool, string) {
	const perPage = 200
	const maxPages = 10
	page := 1
	degraded := false
	reason := ""
	seen := map[string]struct{}{}
	siblings := make([]map[string]any, 0, 4)
	for {
		if page > maxPages {
			degraded = true
			reason = "siblings_query_limit_reached"
			break
		}
		records, total, err := p.listTranslationSiblingPage(ctx, groupID, page, perPage)
		if err != nil {
			degraded = true
			reason = "siblings_query_failed"
			break
		}
		appendTranslationSiblingPage(seen, records, groupID, id, requestedLocale, &siblings)
		if translationSiblingPageComplete(records, total, page, perPage) {
			break
		}
		page++
	}
	return siblings, degraded, reason
}

func (p *panelBinding) listTranslationSiblingPage(ctx AdminContext, groupID string, page, perPage int) ([]map[string]any, int, error) {
	return p.panel.List(ctx, ListOptions{
		Page:    page,
		PerPage: perPage,
		Filters: map[string]any{
			"family_id": groupID,
		},
	})
}

func appendTranslationSiblingPage(seen map[string]struct{}, records []map[string]any, groupID, id, requestedLocale string, out *[]map[string]any) {
	for _, candidate := range records {
		if !strings.EqualFold(strings.TrimSpace(translationFamilyIDFromRecord(candidate)), groupID) {
			continue
		}
		sibling := translationSiblingSummary(candidate, id, requestedLocale)
		key := strings.ToLower(strings.TrimSpace(toString(sibling["id"]))) + "::" + strings.ToLower(strings.TrimSpace(toString(sibling["locale"])))
		if key == "::" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		*out = append(*out, sibling)
	}
}

func translationSiblingPageComplete(records []map[string]any, total, page, perPage int) bool {
	if len(records) == 0 {
		return true
	}
	if total > 0 && page*perPage >= total {
		return true
	}
	return len(records) < perPage
}

func sortTranslationSiblings(siblings []map[string]any) {
	sort.SliceStable(siblings, func(i, j int) bool {
		leftLocale := strings.ToLower(strings.TrimSpace(toString(siblings[i]["locale"])))
		rightLocale := strings.ToLower(strings.TrimSpace(toString(siblings[j]["locale"])))
		if leftLocale == rightLocale {
			leftID := strings.ToLower(strings.TrimSpace(toString(siblings[i]["id"])))
			rightID := strings.ToLower(strings.TrimSpace(toString(siblings[j]["id"])))
			return leftID < rightID
		}
		return leftLocale < rightLocale
	})
}

func translationSiblingSummary(record map[string]any, currentID, requestedLocale string) map[string]any {
	normalized := normalizeFallbackContextRecord(record, requestedLocale)
	applySourceTargetDriftContract(normalized)
	id := strings.TrimSpace(toString(normalized["id"]))
	summary := map[string]any{
		"id":                       id,
		"locale":                   strings.TrimSpace(toString(normalized["locale"])),
		"status":                   strings.TrimSpace(toString(normalized["status"])),
		"title":                    strings.TrimSpace(toString(normalized["title"])),
		"family_id":                strings.TrimSpace(translationFamilyIDFromRecord(normalized)),
		"requested_locale":         normalized["requested_locale"],
		"resolved_locale":          normalized["resolved_locale"],
		"missing_requested_locale": toBool(normalized["missing_requested_locale"]),
		"fallback_used":            toBool(normalized["fallback_used"]),
		"is_current":               id != "" && strings.EqualFold(id, strings.TrimSpace(currentID)),
	}
	if slug := strings.TrimSpace(toString(normalized["slug"])); slug != "" {
		summary["slug"] = slug
	}
	if path := strings.TrimSpace(toString(normalized["path"])); path != "" {
		summary["path"] = path
	}
	if drift := extractMap(normalized[translationSourceTargetDriftKey]); len(drift) > 0 {
		summary[translationSourceTargetDriftKey] = drift
	}
	return summary
}

func (p *panelBinding) autosaveConflictForUpdate(ctx AdminContext, id string, body map[string]any) error {
	if !autosaveEnabled(body) {
		return nil
	}
	expectedVersion := autosaveExpectedVersion(body)
	if expectedVersion == "" {
		return nil
	}
	current, err := p.panel.Get(ctx, id)
	if err != nil {
		return nil
	}
	currentVersion := autosaveCurrentVersionToken(current)
	if currentVersion == "" {
		return nil
	}
	if strings.EqualFold(expectedVersion, currentVersion) {
		return nil
	}
	return AutosaveConflictError{
		Panel:             strings.TrimSpace(p.name),
		EntityID:          strings.TrimSpace(id),
		Version:           currentVersion,
		ExpectedVersion:   expectedVersion,
		LatestStatePath:   p.panelDetailPath(id),
		LatestServerState: map[string]any{"id": strings.TrimSpace(toString(current["id"])), "version": currentVersion},
	}
}

func autosaveEnabled(body map[string]any) bool {
	if len(body) == 0 {
		return false
	}
	if toBool(body["autosave"]) || toBool(body["is_autosave"]) {
		return true
	}
	if spec := extractMap(body["autosave"]); len(spec) > 0 {
		return toBool(spec["enabled"]) || toBool(spec["active"]) || toBool(spec["value"]) || toBool(spec["autosave"])
	}
	return false
}

func autosaveExpectedVersion(body map[string]any) string {
	if len(body) == 0 {
		return ""
	}
	if expected := strings.TrimSpace(toString(body["expected_version"])); expected != "" {
		return expected
	}
	if expected := strings.TrimSpace(toString(body["expectedVersion"])); expected != "" {
		return expected
	}
	if expected := strings.TrimSpace(toString(body["version"])); expected != "" {
		return expected
	}
	if spec := extractMap(body["autosave"]); len(spec) > 0 {
		if expected := strings.TrimSpace(toString(spec["expected_version"])); expected != "" {
			return expected
		}
		if expected := strings.TrimSpace(toString(spec["expectedVersion"])); expected != "" {
			return expected
		}
		if expected := strings.TrimSpace(toString(spec["version"])); expected != "" {
			return expected
		}
	}
	return ""
}

func autosaveCurrentVersionToken(record map[string]any) string {
	if len(record) == 0 {
		return ""
	}
	for _, key := range []string{"version", "_version", "updated_at", "updatedAt"} {
		if value := strings.TrimSpace(toString(record[key])); value != "" {
			return value
		}
	}
	return ""
}

func (p *panelBinding) panelDetailPath(id string) string {
	if p == nil || p.admin == nil {
		return ""
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return ""
	}
	path := resolveURLWith(p.admin.urlManager, adminAPIGroupName(p.admin.config), "panel.id", map[string]string{
		"panel": p.name,
		"id":    id,
	}, nil)
	path = strings.TrimSpace(path)
	if path != "" {
		return path
	}
	return "/admin/api/panels/" + strings.Trim(strings.TrimSpace(p.name), "/") + "/" + id
}

func (p *panelBinding) Action(c router.Context, locale, action string, body map[string]any) (boot.ActionResponse, error) {
	body = mergePanelActionContext(body, locale, c.Query("locale"), c.Query("channel"), "", c.Query("policy_entity"), c.Query("policyEntity"))
	adminCtx := p.admin.adminContextFromRequest(c, locale)
	body = mergePanelActionActorContext(body, adminCtx)
	ids := parseCommandIDs(body, c.Query("id"), c.Query("ids"))
	primaryID := resolvePrimaryActionID(body, ids)
	actionDef, actionDefined := p.panel.findAction(action)
	workflowBackedAction := actionDefined && shouldReturnWorkflowInvalidTransition(actionDef, action)
	if actionDefined {
		body = applyActionPayloadDefaults(actionDef, body, ids)
		if err := validateActionPayload(actionDef, body); err != nil {
			return boot.ActionResponse{}, err
		}
	}
	if action == "create_translation" {
		return p.runCreateTranslationAction(adminCtx, primaryID, body)
	}
	if response, handled, err := p.runWorkflowBackedAction(adminCtx, primaryID, action, body, workflowBackedAction); handled || err != nil {
		return response, err
	}

	response, err := p.panel.RunActionResponse(adminCtx, action, body, ids)
	if err != nil {
		return boot.ActionResponse{}, err
	}
	return bootActionResponse(response), nil
}

func (p *panelBinding) runCreateTranslationAction(ctx AdminContext, primaryID string, body map[string]any) (boot.ActionResponse, error) {
	if primaryID == "" {
		return boot.ActionResponse{}, validationDomainError("translation requires a single id", map[string]any{"field": "id"})
	}
	targetLocale := normalizeCreateTranslationLocale(toString(body["locale"]))
	if targetLocale == "" {
		return boot.ActionResponse{}, validationDomainError("translation locale required", map[string]any{"field": "locale"})
	}
	record, groupID, environment, err := p.prepareCreateTranslationAction(ctx, primaryID, body)
	if err != nil {
		return boot.ActionResponse{}, err
	}
	created, err := p.createTranslationRecord(ctx, primaryID, targetLocale, environment, groupID, record, body)
	if err != nil {
		return boot.ActionResponse{}, err
	}
	p.recordCreateTranslationSuccess(ctx, primaryID, targetLocale, environment, groupID, record)
	return bootActionResponse(normalizeActionResponse(ActionResponse{Data: buildCreateTranslationResponse(created, targetLocale, groupID)})), nil
}

func (p *panelBinding) prepareCreateTranslationAction(ctx AdminContext, primaryID string, body map[string]any) (map[string]any, string, string, error) {
	environment := resolvePolicyEnvironment(body, environmentFromContext(ctx.Context))
	record, err := p.panel.Get(ctx, primaryID)
	if err != nil {
		return nil, "", "", err
	}
	groupID := strings.TrimSpace(translationFamilyIDFromRecord(record))
	if familyErr := requireCanonicalFamilyID(groupID, p.name, primaryID); familyErr != nil {
		return nil, "", "", familyErr
	}
	return record, groupID, environment, nil
}

func (p *panelBinding) createTranslationRecord(
	ctx AdminContext,
	primaryID, targetLocale, environment, groupID string,
	record, body map[string]any,
) (map[string]any, error) {
	if creator, ok := p.panel.repo.(RepositoryTranslationCreator); ok && creator != nil {
		if created, handled, err := p.createTranslationViaRepositoryCreator(ctx, creator, primaryID, targetLocale, environment, groupID, record, body); handled || err != nil {
			return created, err
		}
	}
	return p.createTranslationViaPanelClone(ctx, primaryID, targetLocale, environment, groupID, record, body)
}

func (p *panelBinding) createTranslationViaRepositoryCreator(
	ctx AdminContext,
	creator RepositoryTranslationCreator,
	primaryID, targetLocale, environment, groupID string,
	record, body map[string]any,
) (map[string]any, bool, error) {
	created, createErr := creator.CreateTranslation(ctx.Context, normalizeTranslationCreateInput(TranslationCreateInput{
		SourceID:     primaryID,
		Locale:       targetLocale,
		Environment:  environment,
		PolicyEntity: resolvePolicyEntity(body, p.name),
		ContentType:  p.name,
		Status:       "draft",
		Path:         strings.TrimSpace(toString(body["path"])),
		RouteKey:     strings.TrimSpace(toString(body["route_key"])),
	}))
	if createErr == nil {
		return created, true, nil
	}
	if p.isCreateTranslationDuplicate(ctx.Context, createErr, targetLocale, groupID, primaryID, record, environment) {
		return nil, true, createErr
	}
	if errors.Is(createErr, ErrTranslationCreateUnsupported) {
		return nil, false, nil
	}
	p.recordCreateTranslationMetric(ctx.Context, primaryID, strings.TrimSpace(toString(record["locale"])), targetLocale, environment, "error", groupID, createErr)
	return nil, true, createErr
}

func (p *panelBinding) createTranslationViaPanelClone(
	ctx AdminContext,
	primaryID, targetLocale, environment, groupID string,
	record, body map[string]any,
) (map[string]any, error) {
	if translationExists := p.translationExistsInPanel(ctx, primaryID, targetLocale, groupID, record); translationExists {
		err := TranslationAlreadyExistsError{
			Panel:        p.name,
			EntityID:     primaryID,
			SourceLocale: strings.TrimSpace(toString(record["locale"])),
			Locale:       targetLocale,
			FamilyID:     groupID,
		}
		p.recordCreateTranslationMetric(ctx.Context, primaryID, strings.TrimSpace(toString(record["locale"])), targetLocale, environment, "duplicate", groupID, nil)
		return nil, err
	}
	clone := buildCreateTranslationClone(record, targetLocale, groupID, body)
	created, err := p.panel.Create(ctx, clone)
	if err != nil {
		err = mapCreateTranslationPersistenceError(err, p.name, primaryID, strings.TrimSpace(toString(record["locale"])), targetLocale, groupID)
		outcome := "error"
		var dup TranslationAlreadyExistsError
		if errors.As(err, &dup) {
			outcome = "duplicate"
		}
		p.recordCreateTranslationMetric(ctx.Context, primaryID, strings.TrimSpace(toString(record["locale"])), targetLocale, environment, outcome, groupID, err)
		return nil, err
	}
	return created, nil
}

func (p *panelBinding) translationExistsInPanel(ctx AdminContext, primaryID, targetLocale, groupID string, record map[string]any) bool {
	translationExists := strings.EqualFold(strings.TrimSpace(toString(record["locale"])), targetLocale)
	if !translationExists && groupID != "" {
		if exists, localeErr := translationLocaleExistsInRepositoryGroup(ctx.Context, p.panel.repo, groupID, targetLocale, primaryID); localeErr == nil {
			return exists
		}
	}
	return translationExists || translationLocaleExists(record, targetLocale)
}

func buildCreateTranslationClone(record map[string]any, targetLocale, groupID string, body map[string]any) map[string]any {
	clone := map[string]any{}
	maps.Copy(clone, record)
	delete(clone, "id")
	delete(clone, "ID")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	delete(clone, "published_at")
	clone["locale"] = targetLocale
	clone["family_id"] = groupID
	clone["status"] = "draft"
	prepareCreateTranslationClone(clone, record, targetLocale)
	if localizedPath := strings.TrimSpace(toString(body["path"])); localizedPath != "" {
		clone["path"] = localizedPath
	} else {
		delete(clone, "path")
		if data, ok := clone["data"].(map[string]any); ok && data != nil {
			delete(data, "path")
		}
	}
	if routeKey := strings.TrimSpace(toString(body["route_key"])); routeKey != "" {
		clone["route_key"] = routeKey
	}
	return clone
}

func (p *panelBinding) isCreateTranslationDuplicate(ctx context.Context, err error, targetLocale, groupID, primaryID string, record map[string]any, environment string) bool {
	var dup TranslationAlreadyExistsError
	if !(errors.As(err, &dup) || errors.Is(err, cmscontent.ErrTranslationAlreadyExists) || errors.Is(err, cmspages.ErrTranslationAlreadyExists)) {
		return false
	}
	duplicateLocale := strings.TrimSpace(primitives.FirstNonEmptyRaw(dup.Locale, targetLocale))
	duplicateGroupID := strings.TrimSpace(primitives.FirstNonEmptyRaw(dup.FamilyID, groupID))
	p.recordCreateTranslationMetric(ctx, primaryID, strings.TrimSpace(toString(record["locale"])), duplicateLocale, environment, "duplicate", duplicateGroupID, nil)
	return true
}

func (p *panelBinding) recordCreateTranslationSuccess(ctx AdminContext, primaryID, targetLocale, environment, groupID string, record map[string]any) {
	p.recordCreateTranslationMetric(ctx.Context, primaryID, strings.TrimSpace(toString(record["locale"])), targetLocale, environment, "created", groupID, nil)
	p.panel.recordActivity(ctx, "panel.translation.create", map[string]any{
		"panel":     p.name,
		"entity_id": primaryID,
		"locale":    targetLocale,
		"family_id": groupID,
	})
}

func (p *panelBinding) recordCreateTranslationMetric(ctx context.Context, primaryID, sourceLocale, targetLocale, environment, outcome, groupID string, err error) {
	recordTranslationCreateActionMetric(ctx, translationCreateActionEvent{
		Entity:       p.name,
		EntityID:     primaryID,
		SourceLocale: sourceLocale,
		Locale:       targetLocale,
		Transition:   "create_translation",
		Environment:  environment,
		Outcome:      outcome,
		FamilyID:     groupID,
		Err:          err,
	})
}

func (p *panelBinding) runWorkflowBackedAction(ctx AdminContext, primaryID, action string, body map[string]any, workflowBackedAction bool) (boot.ActionResponse, bool, error) {
	if p.panel.workflow == nil || primaryID == "" {
		return boot.ActionResponse{}, false, nil
	}
	record, err := p.panel.Get(ctx, primaryID)
	if err != nil {
		if workflowBackedAction {
			return boot.ActionResponse{}, true, err
		}
		return boot.ActionResponse{}, false, nil
	}
	state := strings.TrimSpace(toString(record["status"]))
	transitions, err := workflowSnapshotTransitions(ctx.Context, p.panel.workflow, p.name, primaryID, state, record, true)
	if err != nil {
		if workflowBackedAction {
			return boot.ActionResponse{}, true, err
		}
		return boot.ActionResponse{}, false, nil
	}
	response, matched, err := p.applyWorkflowTransition(ctx, primaryID, action, state, record, body, transitions)
	if err != nil || matched {
		return response, true, err
	}
	if workflowBackedAction {
		return boot.ActionResponse{}, true, workflowInvalidTransitionDomainError(p.name, primaryID, action, state, transitions)
	}
	return boot.ActionResponse{}, false, nil
}

func (p *panelBinding) applyWorkflowTransition(ctx AdminContext, primaryID, action, state string, record, body map[string]any, transitions []WorkflowTransitionInfo) (boot.ActionResponse, bool, error) {
	candidates := workflowTransitionCandidates(action)
	for _, t := range transitions {
		if !containsTransitionEvent(candidates, t.Event) {
			continue
		}
		if err := p.authorizeWorkflowAction(ctx, action); err != nil {
			return boot.ActionResponse{}, true, err
		}
		if err := p.applyWorkflowTranslationPolicy(ctx, primaryID, state, action, body, record); err != nil {
			return boot.ActionResponse{}, true, err
		}
		return p.executeWorkflowTransition(ctx, primaryID, strings.TrimSpace(t.Event), state, body, t)
	}
	return boot.ActionResponse{}, false, nil
}

func (p *panelBinding) authorizeWorkflowAction(ctx AdminContext, action string) error {
	for _, a := range p.panel.actions {
		if a.Name == action && a.Permission != "" && p.panel.authorizer != nil && !p.panel.authorizer.Can(ctx.Context, a.Permission, p.name) {
			return permissionDenied(a.Permission, p.name)
		}
	}
	return nil
}

func (p *panelBinding) applyWorkflowTranslationPolicy(ctx AdminContext, primaryID, state, action string, body, record map[string]any) error {
	policyInput := buildTranslationPolicyInput(ctx.Context, p.name, primaryID, state, action, body)
	if policyInput.RequestedLocale == "" {
		policyInput.RequestedLocale = requestedLocaleFromPayload(record, localeFromContext(ctx.Context))
	}
	if policyInput.Environment == "" {
		policyInput.Environment = resolvePolicyEnvironment(record, environmentFromContext(ctx.Context))
	}
	if policyInput.PolicyEntity == "" {
		policyInput.PolicyEntity = resolvePolicyEntity(record, p.name)
	}
	if err := applyTranslationPolicyWithQueueHook(ctx.Context, p.panel.translationPolicy, policyInput, record, p.panel.translationQueueAutoCreateHook); err != nil {
		p.recordBlockedTransition(ctx, primaryID, action, policyInput, err)
		return err
	}
	return nil
}

func (p *panelBinding) executeWorkflowTransition(ctx AdminContext, primaryID, transitionName, state string, body map[string]any, transition WorkflowTransitionInfo) (boot.ActionResponse, bool, error) {
	req := buildWorkflowApplyRequest(ctx.Context, p.name, primaryID, state, workflowTransitionTargetState(transition), body)
	req.Event = transitionName
	response, err := p.panel.workflow.ApplyEvent(ctx.Context, req)
	if err != nil {
		return boot.ActionResponse{}, true, err
	}
	data, err := p.persistWorkflowTransition(ctx, primaryID, response, workflowTransitionTargetState(transition))
	if err != nil {
		return boot.ActionResponse{}, true, err
	}
	return bootActionResponse(normalizeActionResponse(ActionResponse{Data: data})), true, nil
}

func (p *panelBinding) persistWorkflowTransition(ctx AdminContext, primaryID string, response *WorkflowApplyEventResponse, fallbackState string) (map[string]any, error) {
	data := map[string]any{"workflow": response}
	nextState := workflowCurrentStateFromResponse(response)
	if nextState == "" {
		nextState = fallbackState
	}
	if nextState == "" {
		return data, nil
	}
	updated, err := p.panel.repo.Update(ctx.Context, primaryID, map[string]any{"status": nextState})
	if err != nil {
		return nil, err
	}
	if updated != nil {
		data["record"] = updated
	}
	return data, nil
}

func bootActionResponse(response ActionResponse) boot.ActionResponse {
	response = normalizeActionResponse(response)
	return boot.ActionResponse{
		StatusCode: response.StatusCode,
		Data:       primitives.CloneAnyMapNilOnEmpty(response.Data),
	}
}

func workflowTransitionCandidates(action string) []string {
	normalized := strings.ToLower(strings.TrimSpace(action))
	switch normalized {
	case "submit_for_approval":
		return []string{"submit_for_approval", "request_approval"}
	case "request_approval":
		return []string{"request_approval", "submit_for_approval"}
	case "publish":
		return []string{"publish", "approve"}
	case "approve":
		return []string{"approve", "publish"}
	default:
		return []string{normalized}
	}
}

func shouldReturnWorkflowInvalidTransition(definition Action, action string) bool {
	if strings.TrimSpace(definition.CommandName) != "" {
		return false
	}
	if actionHasPassiveRouting(definition) {
		return false
	}
	action = strings.ToLower(strings.TrimSpace(action))
	if action == "" {
		return false
	}
	_, ok := workflowActionNames[action]
	return ok
}

func workflowInvalidTransitionDomainError(panelName, entityID, action, currentState string, transitions []WorkflowTransitionInfo) error {
	currentState = strings.TrimSpace(currentState)
	if currentState == "" {
		currentState = "unknown"
	}
	action = strings.TrimSpace(action)
	return NewDomainError(
		TextCodeWorkflowInvalidTransition,
		fmt.Sprintf("transition %q is not available from state %q", action, currentState),
		map[string]any{
			"panel":                 strings.TrimSpace(panelName),
			"entity_id":             strings.TrimSpace(entityID),
			"action":                action,
			"current_state":         currentState,
			"available_transitions": workflowTransitionNamesList(transitions),
		},
	)
}

func workflowTransitionNamesList(transitions []WorkflowTransitionInfo) []string {
	if len(transitions) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(transitions))
	seen := make(map[string]struct{}, len(transitions))
	for _, transition := range transitions {
		name := strings.TrimSpace(transition.Event)
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	return out
}

func (p *panelBinding) withTranslationReadiness(ctx AdminContext, records []map[string]any, filters map[string]any) []map[string]any {
	if len(records) == 0 {
		return records
	}
	policy := p.translationReadinessPolicy()
	if policy == nil {
		return records
	}
	// Use memoized requirements resolution for all records in the batch.
	// Requirements are memoized per (entity_type, policy_entity, transition,
	// channel), and locale availability is aggregated by translation family.
	cache := translationReadinessRequirementsCache{
		availableLocalesByGroup: translationReadinessBatchAvailableLocales(records),
	}
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		out = append(out, p.withTranslationReadinessRecordCached(ctx, record, filters, policy, &cache))
	}
	return out
}

func (p *panelBinding) withTranslationReadinessRecord(ctx AdminContext, record map[string]any, filters map[string]any) map[string]any {
	if len(record) == 0 {
		return record
	}
	policy := p.translationReadinessPolicy()
	if policy == nil {
		return record
	}
	readiness := buildRecordTranslationReadiness(ctx.Context, policy, p.name, record, filters)
	if len(readiness) == 0 {
		return record
	}
	cloned := primitives.CloneAnyMap(record)
	if cloned == nil {
		cloned = map[string]any{}
	}
	applyTranslationReadinessFields(cloned, readiness)
	return cloned
}

func (p *panelBinding) withTranslationReadinessRecordCached(ctx AdminContext, record map[string]any, filters map[string]any, policy TranslationPolicy, cache *translationReadinessRequirementsCache) map[string]any {
	if len(record) == 0 {
		return record
	}
	readiness := buildRecordTranslationReadinessWithCache(ctx.Context, policy, p.name, record, filters, cache)
	if len(readiness) == 0 {
		return record
	}
	cloned := primitives.CloneAnyMap(record)
	if cloned == nil {
		cloned = map[string]any{}
	}
	applyTranslationReadinessFields(cloned, readiness)
	return cloned
}

func applyTranslationReadinessFields(record map[string]any, readiness map[string]any) {
	if record == nil || len(readiness) == 0 {
		return
	}
	normalizedReadiness := primitives.CloneAnyMap(readiness)
	if normalizedReadiness == nil {
		normalizedReadiness = map[string]any{}
	}
	state := normalizeTranslationReadinessState(toString(normalizedReadiness["readiness_state"]))
	normalizedReadiness["readiness_state"] = state
	if groupID := strings.TrimSpace(toString(normalizedReadiness["family_id"])); groupID != "" {
		if strings.TrimSpace(toString(record["family_id"])) == "" {
			record["family_id"] = groupID
		}
	}
	record["translation_readiness"] = normalizedReadiness
	record["readiness_state"] = state
	record["incomplete"] = !strings.EqualFold(state, translationReadinessStateReady)
}

func splitTranslationReadinessPredicates(opts ListOptions) (ListOptions, []ListPredicate) {
	base := cloneListOptions(opts)
	var predicates []ListPredicate
	if len(opts.Predicates) > 0 {
		predicates = normalizePredicates(opts.Predicates)
	} else {
		predicates = predicatesFromFilterMap(opts.Filters)
	}
	if len(predicates) == 0 {
		return base, nil
	}

	readiness := make([]ListPredicate, 0, len(predicates))
	remaining := make([]ListPredicate, 0, len(predicates))
	for _, predicate := range predicates {
		if !isTranslationReadinessPredicateField(predicate.Field) {
			remaining = append(remaining, predicate)
			continue
		}
		readiness = append(readiness, normalizeTranslationReadinessPredicate(predicate))
	}
	if len(readiness) == 0 {
		return base, nil
	}

	base.Predicates = remaining
	base.Filters = pruneTranslationReadinessFilters(base.Filters)
	return base, readiness
}

func cloneListOptions(opts ListOptions) ListOptions {
	cloned := ListOptions{
		Page:     opts.Page,
		PerPage:  opts.PerPage,
		SortBy:   opts.SortBy,
		SortDesc: opts.SortDesc,
		Fields:   append([]string{}, opts.Fields...),
		Search:   opts.Search,
	}
	if len(opts.Filters) > 0 {
		cloned.Filters = primitives.CloneAnyMap(opts.Filters)
	}
	if len(opts.Predicates) > 0 {
		cloned.Predicates = cloneListPredicates(opts.Predicates)
	}
	return cloned
}

func cloneListPredicates(predicates []ListPredicate) []ListPredicate {
	if len(predicates) == 0 {
		return nil
	}
	out := make([]ListPredicate, 0, len(predicates))
	for _, predicate := range predicates {
		out = append(out, ListPredicate{
			Field:    strings.TrimSpace(predicate.Field),
			Operator: strings.ToLower(strings.TrimSpace(predicate.Operator)),
			Values:   append([]string{}, predicate.Values...),
		})
	}
	return out
}

func isTranslationReadinessPredicateField(field string) bool {
	normalized := strings.ToLower(strings.TrimSpace(field))
	switch normalized {
	case "incomplete", "readiness_state", "translation_readiness.readiness_state":
		return true
	default:
		return false
	}
}

func normalizeTranslationReadinessPredicate(predicate ListPredicate) ListPredicate {
	normalized := ListPredicate{
		Field:    strings.ToLower(strings.TrimSpace(predicate.Field)),
		Operator: strings.ToLower(strings.TrimSpace(predicate.Operator)),
		Values:   append([]string{}, predicate.Values...),
	}
	switch normalized.Field {
	case "translation_readiness.readiness_state":
		normalized.Field = "readiness_state"
	case "readiness_state":
		normalized.Field = "readiness_state"
	case "incomplete":
		normalized.Field = "incomplete"
	}
	if normalized.Operator == "" {
		normalized.Operator = "eq"
	}
	if normalized.Field == "incomplete" {
		normalized.Values = normalizeBooleanPredicateValues(normalized.Values)
	}
	return normalized
}

func normalizeBooleanPredicateValues(values []string) []string {
	if len(values) == 0 {
		return values
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		switch strings.ToLower(strings.TrimSpace(value)) {
		case "1", "true", "yes", "y", "on":
			out = append(out, "true")
		case "0", "false", "no", "n", "off":
			out = append(out, "false")
		default:
			out = append(out, strings.TrimSpace(value))
		}
	}
	return out
}

func pruneTranslationReadinessFilters(filters map[string]any) map[string]any {
	if len(filters) == 0 {
		return filters
	}
	out := primitives.CloneAnyMap(filters)
	for key := range out {
		field := key
		if parts := strings.SplitN(strings.TrimSpace(key), "__", 2); len(parts) > 0 {
			field = parts[0]
		}
		if !isTranslationReadinessPredicateField(field) {
			continue
		}
		delete(out, key)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func splitListGroupByOption(opts ListOptions) (ListOptions, string) {
	base := cloneListOptions(opts)
	groupBy := ""

	if len(opts.Filters) > 0 {
		for key, value := range opts.Filters {
			field := key
			if parts := strings.SplitN(strings.TrimSpace(key), "__", 2); len(parts) > 0 {
				field = parts[0]
			}
			if !isListGroupByPredicateField(field) {
				continue
			}
			if normalized := normalizeGroupByValue(groupByValuesFromAny(value)); normalized != "" {
				groupBy = normalized
				break
			}
		}
	}

	if len(opts.Predicates) > 0 {
		for _, predicate := range normalizePredicates(opts.Predicates) {
			if !isListGroupByPredicateField(predicate.Field) {
				continue
			}
			if normalized := normalizeGroupByValue(predicate.Values); normalized != "" {
				groupBy = normalized
				break
			}
		}
		base.Predicates = pruneGroupByPredicates(base.Predicates)
	}

	base.Filters = pruneGroupByFilters(base.Filters)
	return base, groupBy
}

func isListGroupByPredicateField(field string) bool {
	normalized := strings.ToLower(strings.TrimSpace(field))
	switch normalized {
	case "group_by", "groupby":
		return true
	default:
		return false
	}
}

func groupByValuesFromAny(raw any) []string {
	switch typed := raw.(type) {
	case nil:
		return nil
	case string:
		return normalizePredicateValues([]string{typed})
	case []string:
		return normalizePredicateValues(typed)
	case []any:
		values := make([]string, 0, len(typed))
		for _, value := range typed {
			values = append(values, toString(value))
		}
		return normalizePredicateValues(values)
	default:
		value := strings.TrimSpace(toString(raw))
		if value == "" {
			return nil
		}
		return normalizePredicateValues([]string{value})
	}
}

func normalizeGroupByValue(values []string) string {
	if len(values) == 0 {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(values[0]))
}
