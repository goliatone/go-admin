package admin

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin/internal/boot"
	auth "github.com/goliatone/go-auth"
	cmscontent "github.com/goliatone/go-cms/content"
	cmspages "github.com/goliatone/go-cms/pages"
	"github.com/goliatone/go-command/dispatcher"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashboardrouter "github.com/goliatone/go-dashboard/components/dashboard/gorouter"
	goerrors "github.com/goliatone/go-errors"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/pkg/authctx"
	usertypes "github.com/goliatone/go-users/pkg/types"
	"github.com/julienschmidt/httprouter"
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
	listGroupByTranslationGroupID              = "translation_group_id"
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

func (p *panelBinding) List(c router.Context, locale string, opts boot.ListOptions) ([]map[string]any, int, any, any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	listOpts := ListOptions{
		Page:     opts.Page,
		PerPage:  opts.PerPage,
		SortBy:   opts.SortBy,
		SortDesc: opts.SortDesc,
		Filters:  opts.Filters,
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
	baseSchema := p.panel.Schema()
	if listOpts.Search != "" {
		if listOpts.Filters == nil {
			listOpts.Filters = map[string]any{}
		}
		listOpts.Filters["_search"] = listOpts.Search
	}
	requestedListOpts, groupBy := splitListGroupByOption(listOpts)
	groupedByTranslationGroup := strings.EqualFold(strings.TrimSpace(groupBy), listGroupByTranslationGroupID)
	shouldScopeByLocale := baseSchema.UseBlocks || baseSchema.UseSEO || baseSchema.TreeView
	if shouldScopeByLocale && strings.TrimSpace(locale) != "" && !groupedByTranslationGroup {
		if requestedListOpts.Filters == nil {
			requestedListOpts.Filters = map[string]any{}
		}
		if strings.TrimSpace(toString(requestedListOpts.Filters["locale"])) == "" {
			requestedListOpts.Filters["locale"] = locale
		}
	}
	baseListOpts, readinessPredicates := splitTranslationReadinessPredicates(requestedListOpts)
	var (
		records []map[string]any
		total   int
		err     error
	)
	if groupedByTranslationGroup {
		records, total, err = p.listGroupedByTranslationGroup(ctx, baseListOpts, requestedListOpts, readinessPredicates)
		if err != nil {
			return nil, 0, nil, nil, err
		}
	} else if len(readinessPredicates) > 0 {
		records, total, err = p.listWithTranslationReadinessPredicates(ctx, baseListOpts, requestedListOpts, readinessPredicates)
		if err != nil {
			return nil, 0, nil, nil, err
		}
	} else {
		records, total, err = p.panel.List(ctx, requestedListOpts)
		if err != nil {
			return nil, 0, nil, nil, err
		}
		records = p.withTranslationReadiness(ctx, records, requestedListOpts.Filters)
	}
	records = withCanonicalTranslationGroupIDs(records)
	schema := p.panel.SchemaWithTheme(p.admin.themePayload(ctx.Context))
	schema.Actions = filterActionsForScope(schema.Actions, ActionScopeRow)
	schema.BulkActions = filterActionsForScope(schema.BulkActions, ActionScopeBulk)
	if groupedByTranslationGroup {
		records = p.withGroupedRowActionState(ctx, records, schema.Actions)
	} else {
		records = p.withRowActionState(ctx, records, schema.Actions)
	}
	if p.admin != nil {
		p.admin.applyContentTypeSchemaFromContext(ctx, &schema, p.name)
	}
	if err := p.admin.decorateSchemaFor(ctx, &schema, p.name); err != nil {
		return nil, 0, nil, nil, err
	}
	var form PanelFormRequest
	if p.admin.panelForm != nil {
		form = p.admin.panelForm.Build(p.panel, ctx, nil, nil)
		if p.admin != nil {
			p.admin.applyContentTypeSchemaFromContext(ctx, &form.Schema, p.name)
		}
		if err := p.admin.decorateSchemaFor(ctx, &form.Schema, p.name); err != nil {
			return nil, 0, nil, nil, err
		}
	}
	return records, total, schema, form, nil
}

func (p *panelBinding) Detail(c router.Context, locale string, id string) (map[string]any, error) {
	ctx := p.admin.adminContextFromRequest(c, locale)
	record, err := p.panel.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	record = p.withTranslationReadinessRecord(ctx, record, nil)
	record = normalizeFallbackContextRecord(record, locale)
	applySourceTargetDriftContract(record)
	siblings, siblingsDegraded, siblingsReason := p.translationSiblingsPayload(ctx, id, locale, record)
	schema := p.panel.SchemaWithTheme(p.admin.themePayload(ctx.Context))
	contentTypeKey := ""
	if p.name == "content" && record != nil {
		contentTypeKey = firstNonEmpty(
			toString(record["content_type_slug"]),
			toString(record["content_type"]),
			toString(record["content_type_id"]),
		)
	}
	if p.admin != nil && contentTypeKey != "" {
		p.admin.applyContentTypeSchema(ctx, &schema, contentTypeKey)
	}
	if err := p.admin.decorateSchemaFor(ctx, &schema, p.name); err != nil {
		return nil, err
	}
	var form PanelFormRequest
	if p.admin.panelForm != nil {
		form = p.admin.panelForm.Build(p.panel, ctx, record, nil)
		if p.admin != nil && contentTypeKey != "" {
			p.admin.applyContentTypeSchema(ctx, &form.Schema, contentTypeKey)
		}
		if err := p.admin.decorateSchemaFor(ctx, &form.Schema, p.name); err != nil {
			return nil, err
		}
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
		if transitions, err := p.panel.workflow.AvailableTransitions(ctx.Context, p.name, state); err == nil {
			res["workflow"] = map[string]any{
				"transitions": transitions,
			}
		}
	}

	return res, nil
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
	record = cloneAnyMap(record)
	if record == nil {
		record = map[string]any{}
	}

	requestedLocale = strings.TrimSpace(firstNonEmpty(
		toString(record["requested_locale"]),
		requestedLocale,
		toString(record["locale"]),
	))
	resolvedLocale := strings.TrimSpace(firstNonEmpty(
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
	groupID := strings.TrimSpace(translationGroupIDFromRecord(record))
	if groupID == "" {
		groupID = id
	}
	if groupID == "" {
		return []map[string]any{translationSiblingSummary(record, id, requestedLocale)}, false, ""
	}

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
		records, total, err := p.panel.List(ctx, ListOptions{
			Page:    page,
			PerPage: perPage,
			Filters: map[string]any{
				"translation_group_id": groupID,
			},
		})
		if err != nil {
			degraded = true
			reason = "siblings_query_failed"
			break
		}
		for _, candidate := range records {
			if !strings.EqualFold(strings.TrimSpace(translationGroupIDFromRecord(candidate)), groupID) {
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
			siblings = append(siblings, sibling)
		}
		if len(records) == 0 {
			break
		}
		if total > 0 && page*perPage >= total {
			break
		}
		if len(records) < perPage {
			break
		}
		page++
	}

	if len(siblings) == 0 {
		siblings = append(siblings, translationSiblingSummary(record, id, requestedLocale))
	}
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
	return siblings, degraded, reason
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
		"translation_group_id":     strings.TrimSpace(translationGroupIDFromRecord(normalized)),
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

func (p *panelBinding) Action(c router.Context, locale, action string, body map[string]any) (map[string]any, error) {
	body = mergePanelActionContext(body, locale, c.Query("locale"), c.Query("environment"), c.Query("env"), c.Query("policy_entity"), c.Query("policyEntity"))
	ctx := p.admin.adminContextFromRequest(c, locale)
	ids := parseCommandIDs(body, c.Query("id"), c.Query("ids"))
	primaryID := resolvePrimaryActionID(body, ids)
	actionDef, actionDefined := p.panel.findAction(action)
	workflowBackedAction := actionDefined && shouldReturnWorkflowInvalidTransition(actionDef, action)
	if actionDefined {
		body = applyActionPayloadDefaults(actionDef, body, ids)
		if err := validateActionPayload(actionDef, body); err != nil {
			return nil, err
		}
	}

	if action == "create_translation" {
		if primaryID == "" {
			return nil, validationDomainError("translation requires a single id", map[string]any{
				"field": "id",
			})
		}
		targetLocale := normalizeCreateTranslationLocale(toString(body["locale"]))
		if targetLocale == "" {
			return nil, validationDomainError("translation locale required", map[string]any{
				"field": "locale",
			})
		}
		environment := resolvePolicyEnvironment(body, environmentFromContext(ctx.Context))
		record, err := p.panel.Get(ctx, primaryID)
		if err != nil {
			return nil, err
		}
		groupID := strings.TrimSpace(translationGroupIDFromRecord(record))
		if groupID == "" {
			groupID = primaryID
		}
		if creator, ok := p.panel.repo.(RepositoryTranslationCreator); ok && creator != nil {
			created, createErr := creator.CreateTranslation(ctx.Context, normalizeTranslationCreateInput(TranslationCreateInput{
				SourceID:     primaryID,
				Locale:       targetLocale,
				Environment:  environment,
				PolicyEntity: resolvePolicyEntity(body, p.name),
				ContentType:  p.name,
				Status:       "draft",
			}))
			if createErr == nil {
				recordTranslationCreateActionMetric(ctx.Context, translationCreateActionEvent{
					Entity:             p.name,
					EntityID:           primaryID,
					SourceLocale:       strings.TrimSpace(toString(record["locale"])),
					Locale:             targetLocale,
					Transition:         "create_translation",
					Environment:        environment,
					Outcome:            "created",
					TranslationGroupID: groupID,
				})
				p.panel.recordActivity(ctx, "panel.translation.create", map[string]any{
					"panel":                p.name,
					"entity_id":            primaryID,
					"locale":               targetLocale,
					"translation_group_id": groupID,
				})
				return buildCreateTranslationResponse(created, targetLocale, groupID), nil
			}
			var dup TranslationAlreadyExistsError
			if errors.As(createErr, &dup) ||
				errors.Is(createErr, cmscontent.ErrTranslationAlreadyExists) ||
				errors.Is(createErr, cmspages.ErrTranslationAlreadyExists) {
				duplicateLocale := strings.TrimSpace(firstNonEmpty(dup.Locale, targetLocale))
				duplicateGroupID := strings.TrimSpace(firstNonEmpty(dup.TranslationGroupID, groupID))
				recordTranslationCreateActionMetric(ctx.Context, translationCreateActionEvent{
					Entity:             p.name,
					EntityID:           primaryID,
					SourceLocale:       strings.TrimSpace(toString(record["locale"])),
					Locale:             duplicateLocale,
					Transition:         "create_translation",
					Environment:        environment,
					Outcome:            "duplicate",
					TranslationGroupID: duplicateGroupID,
				})
				return nil, createErr
			}
			if errors.Is(createErr, ErrTranslationCreateUnsupported) && shouldUseLegacyCreateTranslationFallback(p.name) {
				// Keep legacy clone+create only for page panels until a dedicated page
				// translation command is wired through repository capabilities.
			} else {
				recordTranslationCreateActionMetric(ctx.Context, translationCreateActionEvent{
					Entity:             p.name,
					EntityID:           primaryID,
					SourceLocale:       strings.TrimSpace(toString(record["locale"])),
					Locale:             targetLocale,
					Transition:         "create_translation",
					Environment:        environment,
					Outcome:            "error",
					TranslationGroupID: groupID,
					Err:                createErr,
				})
				return nil, createErr
			}
		}
		translationExists := translationLocaleExists(record, targetLocale)
		if !translationExists && groupID != "" {
			if exists, err := translationLocaleExistsInRepositoryGroup(ctx.Context, p.panel.repo, groupID, targetLocale, primaryID); err == nil && exists {
				translationExists = true
			}
		}
		if translationExists {
			recordTranslationCreateActionMetric(ctx.Context, translationCreateActionEvent{
				Entity:             p.name,
				EntityID:           primaryID,
				SourceLocale:       strings.TrimSpace(toString(record["locale"])),
				Locale:             targetLocale,
				Transition:         "create_translation",
				Environment:        environment,
				Outcome:            "duplicate",
				TranslationGroupID: groupID,
			})
			dup := TranslationAlreadyExistsError{
				Panel:              p.name,
				EntityID:           primaryID,
				SourceLocale:       strings.TrimSpace(toString(record["locale"])),
				Locale:             targetLocale,
				TranslationGroupID: groupID,
			}
			return nil, dup
		}
		clone := map[string]any{}
		for k, v := range record {
			clone[k] = v
		}
		delete(clone, "id")
		delete(clone, "ID")
		delete(clone, "created_at")
		delete(clone, "updated_at")
		delete(clone, "published_at")
		clone["locale"] = targetLocale
		clone["translation_group_id"] = groupID
		clone["status"] = "draft"
		prepareCreateTranslationClone(clone, record, targetLocale)
		created, err := p.panel.Create(ctx, clone)
		if err != nil {
			err = mapCreateTranslationPersistenceError(err, p.name, primaryID, strings.TrimSpace(toString(record["locale"])), targetLocale, groupID)
			var dup TranslationAlreadyExistsError
			if errors.As(err, &dup) {
				recordTranslationCreateActionMetric(ctx.Context, translationCreateActionEvent{
					Entity:             p.name,
					EntityID:           primaryID,
					SourceLocale:       strings.TrimSpace(toString(record["locale"])),
					Locale:             targetLocale,
					Transition:         "create_translation",
					Environment:        environment,
					Outcome:            "duplicate",
					TranslationGroupID: groupID,
				})
				return nil, err
			}
			recordTranslationCreateActionMetric(ctx.Context, translationCreateActionEvent{
				Entity:             p.name,
				EntityID:           primaryID,
				SourceLocale:       strings.TrimSpace(toString(record["locale"])),
				Locale:             targetLocale,
				Transition:         "create_translation",
				Environment:        environment,
				Outcome:            "error",
				TranslationGroupID: groupID,
				Err:                err,
			})
			return nil, err
		}
		recordTranslationCreateActionMetric(ctx.Context, translationCreateActionEvent{
			Entity:             p.name,
			EntityID:           primaryID,
			SourceLocale:       strings.TrimSpace(toString(record["locale"])),
			Locale:             targetLocale,
			Transition:         "create_translation",
			Environment:        environment,
			Outcome:            "created",
			TranslationGroupID: groupID,
		})
		p.panel.recordActivity(ctx, "panel.translation.create", map[string]any{
			"panel":                p.name,
			"entity_id":            primaryID,
			"locale":               targetLocale,
			"translation_group_id": groupID,
		})
		return buildCreateTranslationResponse(created, targetLocale, groupID), nil
	}

	if p.panel.workflow != nil && primaryID != "" {
		record, err := p.panel.Get(ctx, primaryID)
		if err != nil {
			if workflowBackedAction {
				return nil, err
			}
		} else {
			state := ""
			if s, ok := record["status"].(string); ok {
				state = s
			}
			transitions, err := p.panel.workflow.AvailableTransitions(ctx.Context, p.name, state)
			if err != nil {
				if workflowBackedAction {
					return nil, err
				}
			} else {
				candidates := workflowTransitionCandidates(action)
				for _, t := range transitions {
					if !containsTransitionName(candidates, t.Name) {
						continue
					}
					transitionName := t.Name
					for _, a := range p.panel.actions {
						if a.Name == action && a.Permission != "" && p.panel.authorizer != nil {
							if !p.panel.authorizer.Can(ctx.Context, a.Permission, p.name) {
								return nil, permissionDenied(a.Permission, p.name)
							}
						}
					}
					policyInput := buildTranslationPolicyInput(ctx.Context, p.name, primaryID, state, action, body)
					if policyInput.RequestedLocale == "" && record != nil {
						policyInput.RequestedLocale = requestedLocaleFromPayload(record, localeFromContext(ctx.Context))
					}
					if policyInput.Environment == "" && record != nil {
						policyInput.Environment = resolvePolicyEnvironment(record, environmentFromContext(ctx.Context))
					}
					if policyInput.PolicyEntity == "" && record != nil {
						policyInput.PolicyEntity = resolvePolicyEntity(record, p.name)
					}
					if err := applyTranslationPolicyWithQueueHook(ctx.Context, p.panel.translationPolicy, policyInput, record, p.panel.translationQueueAutoCreateHook); err != nil {
						p.recordBlockedTransition(ctx, primaryID, action, policyInput, err)
						return nil, err
					}
					_, err := p.panel.workflow.Transition(ctx.Context, TransitionInput{
						EntityID:     primaryID,
						EntityType:   p.name,
						CurrentState: state,
						Transition:   transitionName,
						TargetState:  t.To,
						ActorID:      ctx.UserID,
						Metadata:     body,
					})
					if err == nil {
						// Successfully transitioned, now update the record status without re-evaluating workflow.
						_, _ = p.panel.Update(ctx, primaryID, map[string]any{"status": t.To, "_workflow_skip": true})
					}
					if err != nil {
						return nil, err
					}
					return nil, nil
				}
				if workflowBackedAction {
					return nil, workflowInvalidTransitionDomainError(p.name, primaryID, action, state, transitions)
				}
			}
		}
	}

	return nil, p.panel.RunAction(ctx, action, body, ids)
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

func containsTransitionName(values []string, target string) bool {
	target = strings.ToLower(strings.TrimSpace(target))
	for _, value := range values {
		if strings.ToLower(strings.TrimSpace(value)) == target {
			return true
		}
	}
	return false
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

func workflowInvalidTransitionDomainError(panelName, entityID, action, currentState string, transitions []WorkflowTransition) error {
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

func workflowTransitionNamesList(transitions []WorkflowTransition) []string {
	if len(transitions) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(transitions))
	seen := make(map[string]struct{}, len(transitions))
	for _, transition := range transitions {
		name := strings.TrimSpace(transition.Name)
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

func (p *panelBinding) withRowActionState(ctx AdminContext, records []map[string]any, actions []Action) []map[string]any {
	if len(records) == 0 || len(actions) == 0 {
		return records
	}
	workflowTransitionsByState := map[string][]WorkflowTransition{}
	workflowTransitionErrByState := map[string]error{}
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		cloned := cloneAnyMap(record)
		state := strings.TrimSpace(toString(cloned["status"]))
		if p.panel.workflow != nil {
			if _, seen := workflowTransitionsByState[state]; !seen {
				transitions, err := p.panel.workflow.AvailableTransitions(ctx.Context, p.name, state)
				workflowTransitionsByState[state] = append([]WorkflowTransition{}, transitions...)
				workflowTransitionErrByState[state] = err
			}
		}
		actionState := p.rowActionStateForRecord(ctx, cloned, actions, workflowTransitionsByState[state], workflowTransitionErrByState[state])
		if len(actionState) > 0 {
			cloned["_action_state"] = actionState
		}
		out = append(out, cloned)
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
	// environment), and locale availability is aggregated by translation group.
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
	cloned := cloneAnyMap(record)
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
	cloned := cloneAnyMap(record)
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
	normalizedReadiness := cloneAnyMap(readiness)
	if normalizedReadiness == nil {
		normalizedReadiness = map[string]any{}
	}
	state := normalizeTranslationReadinessState(toString(normalizedReadiness["readiness_state"]))
	normalizedReadiness["readiness_state"] = state
	if groupID := strings.TrimSpace(toString(normalizedReadiness["translation_group_id"])); groupID != "" {
		if strings.TrimSpace(toString(record["translation_group_id"])) == "" {
			record["translation_group_id"] = groupID
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
		Search:   opts.Search,
	}
	if len(opts.Filters) > 0 {
		cloned.Filters = cloneAnyMap(opts.Filters)
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
	out := cloneAnyMap(filters)
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

func pruneGroupByFilters(filters map[string]any) map[string]any {
	if len(filters) == 0 {
		return filters
	}
	out := cloneAnyMap(filters)
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
		recordClone := cloneAnyMap(record)
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
			childClone := cloneAnyMap(child)
			childClone["_group"] = map[string]any{
				"id":          groupID,
				"row_type":    "child",
				"position":    childIndex + 1,
				"is_parent":   childIndex == 0,
				"child_count": len(children),
			}
			annotatedChildren = append(annotatedChildren, childClone)
		}
		parent := cloneAnyMap(annotatedChildren[0])
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
		recordClone := cloneAnyMap(record)
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
		out = append(out, cloneAnyMap(record))
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
	parent := cloneAnyMap(out[parentIndex])
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
		out = append(out, cloneAnyMap(record))
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
		cloned := cloneAnyMap(group)
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
	cloned := cloneAnyMap(record)
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
			out = append(out, cloneAnyMap(item))
		}
		return out
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			value, ok := item.(map[string]any)
			if !ok {
				continue
			}
			out = append(out, cloneAnyMap(value))
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
			availability["reason"] = fmt.Sprintf("transition %q is not available from state %q", name, firstNonEmpty(state, "unknown"))
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

func shouldUseLegacyCreateTranslationFallback(panel string) bool {
	return strings.EqualFold(strings.TrimSpace(panel), "pages")
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

func isBulkCreateMissingTranslationsAction(action string) bool {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case bulkCreateMissingTranslationsAction, bulkCreateMissingTranslationsActionAlias:
		return true
	default:
		return false
	}
}

func (p *panelBinding) bulkCreateMissingTranslations(c router.Context, ctx AdminContext, locale string, body map[string]any, ids []string) (map[string]any, error) {
	if len(ids) == 0 {
		return nil, validationDomainError("bulk create missing translations requires ids", map[string]any{
			"field": "ids",
		})
	}
	if _, ok := p.panel.findAction(CreateTranslationKey); !ok {
		return nil, validationDomainError("create_translation action is not configured for this panel", map[string]any{
			"panel": p.name,
		})
	}

	environment := resolvePolicyEnvironment(body, environmentFromContext(ctx.Context))
	policyEntity := resolvePolicyEntity(body, p.name)
	results := make([]map[string]any, 0, len(ids))
	summary := map[string]int{
		"total":             0,
		"succeeded":         0,
		"partial":           0,
		"failed":            0,
		"skipped":           0,
		"created_locales":   0,
		"failed_locales":    0,
		"requested_locales": 0,
	}

	for _, id := range dedupeStrings(ids) {
		recordResult := map[string]any{
			"id": strings.TrimSpace(id),
		}
		source, err := p.panel.Get(ctx, id)
		if err != nil {
			recordResult["status"] = "failed"
			recordResult["failures"] = []map[string]any{bulkCreateMissingTranslationsError("", err)}
			results = append(results, recordResult)
			summary["total"]++
			summary["failed"]++
			summary["failed_locales"]++
			continue
		}

		sourceWithReadiness := p.withTranslationReadinessRecord(ctx, source, map[string]any{
			"environment": environment,
		})
		readiness := extractMap(sourceWithReadiness["translation_readiness"])
		missingLocales := normalizedLocaleList(readiness["missing_required_locales"])
		if len(missingLocales) == 0 {
			missingLocales = normalizedLocaleList(readiness["missing_locales"])
		}
		recordResult["missing_locales"] = append([]string{}, missingLocales...)
		recordResult["translation_group_id"] = strings.TrimSpace(translationGroupIDFromRecord(sourceWithReadiness))
		recordResult["source_locale"] = strings.TrimSpace(toString(sourceWithReadiness["locale"]))

		if len(missingLocales) == 0 {
			recordResult["status"] = "skipped"
			recordResult["reason_code"] = bulkCreateMissingTranslationReasonNoLocale
			recordResult["reason"] = "record has no missing required locales"
			recordResult["created"] = []map[string]any{}
			recordResult["failures"] = []map[string]any{}
			results = append(results, recordResult)
			summary["total"]++
			summary["skipped"]++
			continue
		}

		created := make([]map[string]any, 0, len(missingLocales))
		failures := make([]map[string]any, 0)
		for _, targetLocale := range missingLocales {
			summary["requested_locales"]++
			payload := map[string]any{
				"id":            strings.TrimSpace(id),
				"locale":        targetLocale,
				"environment":   environment,
				"policy_entity": firstNonEmpty(policyEntity, resolvePolicyEntity(sourceWithReadiness, p.name)),
			}
			createdData, createErr := p.Action(c, locale, CreateTranslationKey, payload)
			if createErr != nil {
				failures = append(failures, bulkCreateMissingTranslationsError(targetLocale, createErr))
				continue
			}
			entry := map[string]any{
				"locale": targetLocale,
				"status": strings.TrimSpace(firstNonEmpty(toString(createdData["status"]), "created")),
			}
			if createdID := strings.TrimSpace(toString(createdData["id"])); createdID != "" {
				entry["id"] = createdID
			}
			if groupID := strings.TrimSpace(toString(createdData["translation_group_id"])); groupID != "" {
				entry["translation_group_id"] = groupID
			}
			created = append(created, entry)
		}

		recordResult["created"] = created
		recordResult["failures"] = failures
		summary["total"]++
		summary["created_locales"] += len(created)
		summary["failed_locales"] += len(failures)

		switch {
		case len(created) > 0 && len(failures) == 0:
			recordResult["status"] = "ok"
			summary["succeeded"]++
		case len(created) > 0 && len(failures) > 0:
			recordResult["status"] = "partial"
			summary["partial"]++
		default:
			recordResult["status"] = "failed"
			summary["failed"]++
		}
		results = append(results, recordResult)
	}

	return map[string]any{
		"action":  bulkCreateMissingTranslationsAction,
		"panel":   p.name,
		"results": results,
		"summary": summary,
	}, nil
}

func bulkCreateMissingTranslationsError(locale string, err error) map[string]any {
	failure := map[string]any{
		"locale": strings.TrimSpace(locale),
	}
	mapped, status := DefaultErrorPresenter().Present(err)
	if mapped != nil {
		failure["text_code"] = strings.TrimSpace(mapped.TextCode)
		failure["message"] = strings.TrimSpace(mapped.Message)
		if len(mapped.Metadata) > 0 {
			failure["metadata"] = cloneAnyMap(mapped.Metadata)
		}
		failure["status"] = mapped.Code
		return failure
	}
	failure["status"] = status
	failure["message"] = strings.TrimSpace(err.Error())
	return failure
}

func (p *panelBinding) Preview(c router.Context, locale, id string) (map[string]any, error) {
	if p.admin.preview == nil {
		return nil, FeatureDisabledError{Feature: "preview"}
	}
	format := strings.ToLower(strings.TrimSpace(c.Query("format")))
	if format == "" {
		format = strings.ToLower(strings.TrimSpace(c.Query("token_type")))
	}
	var (
		token string
		err   error
	)
	if format == "jwt" {
		token, err = p.admin.preview.GenerateJWT(p.name, id, 1*time.Hour)
	} else {
		token, err = p.admin.preview.Generate(p.name, id, 1*time.Hour)
	}
	if err != nil {
		return nil, err
	}
	query := url.Values{}
	if strings.TrimSpace(locale) != "" {
		query.Set("locale", locale)
	}

	params := map[string]string{"token": token}
	previewURL := resolveURLWith(p.admin.urlManager, publicAPIGroupName(p.admin.config), "preview", params, query)
	adminURL := resolveURLWith(p.admin.urlManager, adminAPIGroupName(p.admin.config), "preview", params, query)
	return map[string]any{
		"token":     token,
		"url":       previewURL,
		"admin_url": adminURL,
		"format":    format,
	}, nil
}

func (p *panelBinding) Subresources() []boot.PanelSubresourceSpec {
	if p == nil || p.panel == nil {
		return nil
	}
	declared := p.panel.Subresources()
	if len(declared) == 0 {
		return nil
	}
	out := make([]boot.PanelSubresourceSpec, 0, len(declared))
	for _, subresource := range declared {
		out = append(out, boot.PanelSubresourceSpec{
			Name:   strings.TrimSpace(subresource.Name),
			Method: strings.TrimSpace(subresource.Method),
		})
	}
	return out
}

func (p *panelBinding) HandleSubresource(c router.Context, locale, id, subresource, value string) error {
	if p == nil || p.panel == nil {
		return ErrNotFound
	}
	ctx := p.admin.adminContextFromRequest(c, locale)
	return p.panel.ServeSubresource(ctx, c, id, subresource, value)
}

type dashboardBinding struct {
	admin *Admin
}

func newDashboardBinding(a *Admin) boot.DashboardBinding {
	if a == nil || a.dashboard == nil {
		return nil
	}
	return &dashboardBinding{admin: a}
}

func (d *dashboardBinding) Enabled() bool {
	return d.admin != nil && featureEnabled(d.admin.featureGate, FeatureDashboard)
}

func (d *dashboardBinding) HasRenderer() bool {
	return d.admin != nil && d.admin.dashboard != nil && d.admin.dashboard.HasRenderer()
}

func (d *dashboardBinding) RenderHTML(c router.Context, locale string) (string, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return "", nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	theme := d.admin.resolveTheme(ctx.Context)
	basePath := d.admin.config.BasePath
	if basePath == "" {
		basePath = "/"
	}
	layout, err := d.admin.dashboard.RenderLayout(ctx, theme, basePath)
	if err != nil {
		return "", err
	}
	return d.admin.dashboard.renderer.Render("dashboard_ssr.html", layout)
}

func (d *dashboardBinding) Widgets(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	widgets, err := d.admin.dashboard.Resolve(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"widgets": widgets,
		"theme":   d.admin.themePayload(ctx.Context),
	}, nil
}

func (d *dashboardBinding) Preferences(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	layout := d.admin.dashboard.resolvedInstances(adminCtx)
	areas := d.admin.dashboard.Areas()
	if len(areas) == 0 && d.admin.widgetSvc != nil {
		areas = d.admin.widgetSvc.Areas()
	}
	return map[string]any{
		"providers": d.admin.dashboard.Providers(),
		"layout":    layout,
		"areas":     areas,
	}, nil
}

func (d *dashboardBinding) SavePreferences(c router.Context, body map[string]any) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, d.admin.config.DefaultLocale)

	if adminCtx.UserID != "" && d.admin.preferences != nil {
		overrides := expandDashboardOverrides(body)
		if _, err := d.admin.preferences.SaveDashboardOverrides(adminCtx.Context, adminCtx.UserID, overrides); err != nil {
			return nil, err
		}
	}

	if _, ok := body["layout_rows"]; ok {
		type widgetSlot struct {
			ID    string `json:"id"`
			Width int    `json:"width"`
		}
		type widgetLayoutRow struct {
			Widgets []widgetSlot `json:"widgets"`
		}
		rows := map[string][]widgetLayoutRow{}
		if rawRows, ok := body["layout_rows"].(map[string]any); ok {
			for area, areaRows := range rawRows {
				parsedRows := []widgetLayoutRow{}
				if rawAreaRows, ok := areaRows.([]any); ok {
					for _, r := range rawAreaRows {
						if rowMap, ok := r.(map[string]any); ok {
							wSlots := []widgetSlot{}
							if rawWidgets, ok := rowMap["widgets"].([]any); ok {
								for _, w := range rawWidgets {
									if wMap, ok := w.(map[string]any); ok {
										wSlots = append(wSlots, widgetSlot{
											ID:    toString(wMap["id"]),
											Width: atoiDefault(toString(wMap["width"]), 12),
										})
									}
								}
							}
							parsedRows = append(parsedRows, widgetLayoutRow{Widgets: wSlots})
						}
					}
				}
				rows[area] = parsedRows
			}
		}

		hiddenIDs := []string{}
		if rawHidden, ok := body["hidden_widget_ids"].([]any); ok {
			for _, id := range rawHidden {
				hiddenIDs = append(hiddenIDs, toString(id))
			}
		}

		currentLayout := d.admin.dashboard.resolvedInstances(adminCtx)
		byID := map[string]DashboardWidgetInstance{}
		for _, inst := range currentLayout {
			byID[inst.ID] = inst
		}

		newLayout := []DashboardWidgetInstance{}
		seenIDs := map[string]bool{}

		for areaCode, areaRows := range rows {
			for _, row := range areaRows {
				for _, slot := range row.Widgets {
					if inst, ok := byID[slot.ID]; ok {
						inst.AreaCode = areaCode
						inst.Span = slot.Width
						inst.Position = len(newLayout)
						inst.Hidden = false
						newLayout = append(newLayout, inst)
						seenIDs[slot.ID] = true
					}
				}
			}
		}

		for _, id := range hiddenIDs {
			if inst, ok := byID[id]; ok {
				inst.Hidden = true
				inst.Position = len(newLayout)
				newLayout = append(newLayout, inst)
				seenIDs[id] = true
			}
		}

		for _, inst := range currentLayout {
			if !seenIDs[inst.ID] {
				inst.Hidden = true
				inst.Position = len(newLayout)
				newLayout = append(newLayout, inst)
			}
		}

		if len(newLayout) > 0 {
			d.admin.dashboard.SetUserLayoutWithContext(adminCtx, newLayout)
		}
		return map[string]any{"status": "ok", "layout": newLayout}, nil
	}

	rawLayout, ok := body["layout"].([]any)
	if !ok {
		return nil, validationDomainError("layout must be an array or valid preferences object", map[string]any{
			"field": "layout",
		})
	}
	layout := []DashboardWidgetInstance{}
	for _, item := range rawLayout {
		obj, ok := item.(map[string]any)
		if !ok {
			continue
		}
		layout = append(layout, DashboardWidgetInstance{
			DefinitionCode: toString(obj["definition"]),
			AreaCode:       toString(obj["area"]),
			Config:         extractMap(obj["config"]),
			Position:       atoiDefault(toString(obj["position"]), 0),
			Span:           atoiDefault(toString(obj["span"]), 0),
			Hidden:         toBool(obj["hidden"]),
			Locale:         toString(obj["locale"]),
		})
	}
	if len(layout) > 0 {
		d.admin.dashboard.SetUserLayoutWithContext(adminCtx, layout)
	}
	return map[string]any{"layout": layout}, nil
}

func (d *dashboardBinding) RequirePreferencesPermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesPermission, preferencesModuleID)
}

func (d *dashboardBinding) RequirePreferencesUpdatePermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesUpdatePermission, preferencesModuleID)
}

type dashboardGoBinding struct {
	admin *Admin
}

func (d *dashboardGoBinding) Enabled() bool {
	return d.admin != nil && featureEnabled(d.admin.featureGate, FeatureDashboard)
}

func (d *dashboardGoBinding) HasRenderer() bool {
	return d.admin != nil && d.admin.dash != nil && d.admin.dash.controller != nil
}

func (d *dashboardGoBinding) RenderHTML(c router.Context, locale string) (string, error) {
	if d.admin == nil || d.admin.dash == nil || d.admin.dash.controller == nil {
		return "", nil
	}
	viewer := d.viewer(c, locale)
	var buf strings.Builder
	if err := d.admin.dash.controller.RenderTemplate(c.Context(), viewer, &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func (d *dashboardGoBinding) Widgets(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	widgets, err := d.admin.dashboard.Resolve(adminCtx)
	if err != nil {
		return nil, err
	}
	payload := map[string]any{
		"widgets": widgets,
		"locale":  locale,
	}
	if base := d.admin.config.BasePath; base != "" {
		payload["base_path"] = base
	}
	if theme := d.admin.themePayload(adminCtx.Context); theme != nil {
		payload["theme"] = theme
	}
	return payload, nil
}

func (d *dashboardGoBinding) Preferences(c router.Context, locale string) (map[string]any, error) {
	return d.Widgets(c, locale)
}

func (d *dashboardGoBinding) SavePreferences(c router.Context, _ map[string]any) (map[string]any, error) {
	if d.admin == nil || d.admin.dash == nil {
		return nil, nil
	}
	viewer := d.viewer(c, d.admin.config.DefaultLocale)
	if viewer.UserID == "" {
		return map[string]any{"status": "skipped"}, nil
	}
	if err := d.admin.dash.service.SavePreferences(c.Context(), viewer, dashcmp.LayoutOverrides{}); err != nil {
		return nil, err
	}
	return map[string]any{"status": "ok"}, nil
}

func (d *dashboardGoBinding) RequirePreferencesPermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesPermission, preferencesModuleID)
}

func (d *dashboardGoBinding) RequirePreferencesUpdatePermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesUpdatePermission, preferencesModuleID)
}

func (d *dashboardGoBinding) RegisterGoDashboardRoutes() error {
	if d.admin == nil || d.admin.dash == nil || d.admin.router == nil {
		return nil
	}
	defaultLocale := d.admin.config.DefaultLocale
	viewerResolver := func(c router.Context) dashcmp.ViewerContext {
		locale := strings.TrimSpace(c.Query("locale"))
		if locale == "" {
			locale = defaultLocale
		}
		adminCtx := d.admin.adminContextFromRequest(c, locale)
		if c != nil {
			c.SetContext(adminCtx.Context)
		}
		return dashcmp.ViewerContext{
			UserID: adminCtx.UserID,
			Locale: locale,
		}
	}
	basePath := adminBasePath(d.admin.config)
	routes := dashboardrouter.RouteConfig{
		HTML:        relativeRoutePath(basePath, adminRoutePath(d.admin, "dashboard.page")),
		Layout:      relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard")),
		Widgets:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets")),
		WidgetID:    relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widget")),
		Reorder:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets.reorder")),
		Refresh:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets.refresh")),
		Preferences: relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.preferences")),
	}

	registered, err := registerDashboardRoutesByRouterType(d.admin.router, dashboardRouteRegistrars{
		HTTP: func(rt router.Router[*httprouter.Router]) error {
			return dashboardrouter.Register(dashboardrouter.Config[*httprouter.Router]{
				Router:         rt,
				Controller:     d.admin.dash.controller,
				API:            d.admin.dash.executor,
				Broadcast:      d.admin.dash.broadcast,
				ViewerResolver: viewerResolver,
				BasePath:       basePath,
				Routes:         routes,
			})
		},
		Fiber: func(rt router.Router[*fiber.App]) error {
			return dashboardrouter.Register(dashboardrouter.Config[*fiber.App]{
				Router:         rt,
				Controller:     d.admin.dash.controller,
				API:            d.admin.dash.executor,
				Broadcast:      d.admin.dash.broadcast,
				ViewerResolver: viewerResolver,
				BasePath:       basePath,
				Routes:         routes,
			})
		},
	})
	if err != nil {
		return err
	}
	if registered {
		return nil
	}
	if rt, ok := d.admin.router.(AdminRouter); ok {
		dashboardPath := adminAPIRoutePath(d.admin, "dashboard")
		prefsPath := adminAPIRoutePath(d.admin, "dashboard.preferences")
		configPath := adminAPIRoutePath(d.admin, "dashboard.config")
		getLocale := func(c router.Context) string {
			locale := strings.TrimSpace(c.Query("locale"))
			if locale == "" {
				locale = defaultLocale
			}
			return locale
		}
		rt.Get(dashboardPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		rt.Get(prefsPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		rt.Get(configPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		savePrefs := func(c router.Context) error {
			locale := getLocale(c)
			adminCtx := d.admin.adminContextFromRequest(c, locale)
			viewer := dashcmp.ViewerContext{UserID: adminCtx.UserID, Locale: adminCtx.Locale}
			if viewer.UserID == "" {
				return writeError(c, ErrForbidden)
			}
			raw, err := d.admin.ParseBody(c)
			if err != nil {
				return writeError(c, err)
			}
			adminOverrides := expandDashboardOverrides(raw)
			if adminOverrides.Locale == "" {
				adminOverrides.Locale = locale
			}
			overrides := dashcmp.LayoutOverrides{
				Locale:        adminOverrides.Locale,
				AreaOrder:     cloneStringSliceMap(adminOverrides.AreaOrder),
				AreaRows:      convertDashboardRows(adminOverrides.AreaRows),
				HiddenWidgets: cloneHiddenWidgetMap(adminOverrides.HiddenWidgets),
			}
			if err := d.admin.dash.service.SavePreferences(c.Context(), viewer, overrides); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]any{"status": "ok"})
		}
		rt.Post(prefsPath, savePrefs)
		rt.Post(configPath, savePrefs)
		return nil
	}
	return serviceUnavailableDomainError("router does not support go-dashboard routes", map[string]any{"component": "boot_bindings"})
}

func (d *dashboardGoBinding) viewer(c router.Context, locale string) dashcmp.ViewerContext {
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return dashcmp.ViewerContext{
		UserID: adminCtx.UserID,
		Locale: locale,
	}
}

type navigationBinding struct {
	admin *Admin
}

func newNavigationBinding(a *Admin) boot.NavigationBinding {
	if a == nil || a.nav == nil {
		return nil
	}
	return &navigationBinding{admin: a}
}

func (n *navigationBinding) Resolve(c router.Context, locale, code string) (any, map[string]map[string]string) {
	ctx := n.admin.adminContextFromRequest(c, locale)
	items := n.admin.nav.ResolveMenu(ctx.Context, code, locale)
	return items, n.admin.themePayload(ctx.Context)
}

type searchBinding struct {
	admin *Admin
}

func newSearchBinding(a *Admin) boot.SearchBinding {
	if a == nil || a.search == nil {
		return nil
	}
	return &searchBinding{admin: a}
}

func (s *searchBinding) Query(c router.Context, locale, query string, limit int) ([]any, error) {
	ctx := s.admin.adminContextFromRequest(c, locale)
	results, err := s.admin.search.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	out := []any{}
	for _, result := range results {
		out = append(out, result)
	}
	return out, nil
}

type bulkBinding struct {
	admin *Admin
}

func newBulkBinding(a *Admin) boot.BulkBinding {
	if a == nil || a.bulkSvc == nil {
		return nil
	}
	return &bulkBinding{admin: a}
}

func (b *bulkBinding) List(c router.Context) (map[string]any, error) {
	jobs := b.admin.bulkSvc.List(c.Context())
	return map[string]any{"jobs": jobs}, nil
}

func (b *bulkBinding) Start(c router.Context, body map[string]any) (map[string]any, error) {
	total := atoiDefault(toString(body["total"]), 0)
	req := BulkRequest{
		Name:    toString(body["name"]),
		Action:  toString(body["action"]),
		Total:   total,
		Payload: cloneAnyMap(body),
	}
	if req.Name == "" && req.Action != "" {
		req.Name = req.Action
	}
	job, err := b.admin.bulkSvc.Start(c.Context(), req)
	if err != nil {
		return nil, err
	}
	b.admin.recordActivity(c.Context(), c.Header("X-User-ID"), "bulk.trigger", "bulk_job:"+job.ID, tagActivityActorType(map[string]any{
		"name":   job.Name,
		"action": job.Action,
	}, ActivityActorTypeTask))
	return map[string]any{"job": job}, nil
}

func (b *bulkBinding) Rollback(c router.Context, id string, body map[string]any) (map[string]any, error) {
	if rollbackSvc, ok := b.admin.bulkSvc.(BulkRollbacker); ok {
		if id == "" && body != nil {
			id = toString(body["id"])
		}
		if id == "" {
			return nil, validationDomainError("id required", map[string]any{
				"field": "id",
			})
		}
		job, err := rollbackSvc.Rollback(c.Context(), id)
		if err != nil {
			return nil, err
		}
		b.admin.recordActivity(c.Context(), c.Header("X-User-ID"), "bulk.rollback", "bulk_job:"+job.ID, tagActivityActorType(map[string]any{
			"name":   job.Name,
			"action": job.Action,
		}, ActivityActorTypeTask))
		return map[string]any{"job": job}, nil
	}
	return nil, FeatureDisabledError{Feature: string(FeatureBulk)}
}

type mediaBinding struct {
	admin *Admin
}

func newMediaBinding(a *Admin) boot.MediaBinding {
	if a == nil || a.mediaLibrary == nil {
		return nil
	}
	return &mediaBinding{admin: a}
}

func (m *mediaBinding) List(c router.Context) (map[string]any, error) {
	items, err := m.admin.mediaLibrary.List(c.Context())
	if err != nil {
		return nil, err
	}
	return map[string]any{"items": items}, nil
}

func (m *mediaBinding) Add(c router.Context, body map[string]any) (any, error) {
	item := MediaItem{
		ID:        toString(body["id"]),
		Name:      toString(body["name"]),
		URL:       toString(body["url"]),
		Thumbnail: toString(body["thumbnail"]),
		Metadata:  extractMap(body["metadata"]),
	}
	created, err := m.admin.mediaLibrary.Add(c.Context(), item)
	if err != nil {
		return nil, err
	}
	return created, nil
}

type notificationsBinding struct {
	admin *Admin
}

func newNotificationsBinding(a *Admin) boot.NotificationsBinding {
	if a == nil || a.notifications == nil {
		return nil
	}
	return &notificationsBinding{admin: a}
}

func (n *notificationsBinding) List(c router.Context) (map[string]any, error) {
	ctx := n.admin.adminContextFromRequest(c, n.admin.config.DefaultLocale)
	if err := n.admin.requirePermission(ctx, n.admin.config.NotificationsPermission, "notifications"); err != nil {
		return nil, err
	}
	items, err := n.admin.notifications.List(ctx.Context)
	if err != nil {
		return nil, err
	}
	unread := 0
	for _, item := range items {
		if !item.Read {
			unread++
		}
	}
	return map[string]any{
		"notifications": items,
		"unread_count":  unread,
	}, nil
}

func (n *notificationsBinding) Mark(c router.Context, body map[string]any) error {
	rawIDs, ok := body["ids"].([]any)
	if !ok {
		return validationDomainError("ids must be array", map[string]any{
			"field": "ids",
		})
	}
	read := true
	if r, ok := body["read"].(bool); ok {
		read = r
	}
	ids := []string{}
	for _, v := range rawIDs {
		if s, ok := v.(string); ok {
			ids = append(ids, s)
		}
	}
	adminCtx := n.admin.adminContextFromRequest(c, n.admin.config.DefaultLocale)
	if err := n.admin.requirePermission(adminCtx, n.admin.config.NotificationsUpdatePermission, "notifications"); err != nil {
		return err
	}
	if n.admin.notifications != nil {
		return n.admin.notifications.Mark(adminCtx.Context, ids, read)
	}
	return FeatureDisabledError{Feature: string(FeatureNotifications)}
}

type activityBinding struct {
	admin *Admin
}

func newActivityBinding(a *Admin) boot.ActivityBinding {
	if a == nil {
		return nil
	}
	return &activityBinding{admin: a}
}

func (aBinding *activityBinding) List(c router.Context) (map[string]any, error) {
	adminCtx := aBinding.admin.adminContextFromRequest(c, aBinding.admin.config.DefaultLocale)
	actorCtx, err := authctx.ResolveActorContext(adminCtx.Context)
	if err != nil {
		return nil, err
	}
	actorRef, err := authctx.ActorRefFromActorContext(actorCtx)
	if err != nil {
		if isActivityActorContextInvalid(err) {
			return nil, invalidActivityActorContextDomainError(actorCtx, err)
		}
		return nil, err
	}
	if err := aBinding.admin.requirePermission(adminCtx, aBinding.admin.config.ActivityPermission, "activity"); err != nil {
		return nil, err
	}
	if aBinding.admin.activityFeed == nil {
		return nil, FeatureDisabledError{Feature: "activity"}
	}
	filter, err := parseActivityFilter(c, actorRef, authctx.ScopeFromActorContext(actorCtx))
	if err != nil {
		return nil, err
	}
	page, err := aBinding.admin.activityFeed.Query(adminCtx.Context, filter)
	if err != nil {
		if isActivityActorContextInvalid(err) {
			return nil, invalidActivityActorContextDomainError(actorCtx, err)
		}
		if errors.Is(err, usertypes.ErrMissingActivityRepository) {
			return nil, FeatureDisabledError{Feature: "activity"}
		}
		return nil, err
	}
	return map[string]any{
		"entries":     entriesFromUsersRecords(page.Records),
		"total":       page.Total,
		"next_offset": page.NextOffset,
		"has_more":    page.HasMore,
	}, nil
}

func isActivityActorContextInvalid(err error) bool {
	var typed *goerrors.Error
	if !goerrors.As(err, &typed) || typed == nil {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(typed.TextCode), "ACTOR_CONTEXT_INVALID")
}

func invalidActivityActorContextDomainError(actorCtx *auth.ActorContext, cause error) error {
	actorID := ""
	role := ""
	subject := ""
	if actorCtx != nil {
		actorID = strings.TrimSpace(actorCtx.ActorID)
		role = strings.TrimSpace(actorCtx.Role)
		subject = strings.TrimSpace(actorCtx.Subject)
	}
	message := "activity requires auth actor_id to be a UUID string"
	if actorID != "" {
		message = fmt.Sprintf("activity requires auth actor_id to be a UUID string; got %q", actorID)
	}
	meta := map[string]any{
		"component":           "activity",
		"field":               "actor_id",
		"actor_id":            actorID,
		"role":                role,
		"subject":             subject,
		"expected_format":     "uuid",
		"source_text_code":    "ACTOR_CONTEXT_INVALID",
		"source_error":        strings.TrimSpace(cause.Error()),
		"resolution":          "Set auth actor_id/user_id to a UUID value in the auth middleware claims mapping.",
		"integration_surface": "authctx.ActorRefFromActorContext",
	}
	return NewDomainError(TextCodeActivityActorContextInvalid, message, meta)
}

type jobsBinding struct {
	admin *Admin
}

func newJobsBinding(a *Admin) boot.JobsBinding {
	if a == nil || a.jobs == nil {
		return nil
	}
	return &jobsBinding{admin: a}
}

func (j *jobsBinding) List(c router.Context) (map[string]any, error) {
	adminCtx := j.admin.adminContextFromRequest(c, j.admin.config.DefaultLocale)
	if err := j.admin.requirePermission(adminCtx, j.admin.config.JobsPermission, "jobs"); err != nil {
		return nil, err
	}
	return map[string]any{"jobs": j.admin.jobs.List()}, nil
}

func (j *jobsBinding) Trigger(c router.Context, body map[string]any) error {
	name, _ := body["name"].(string)
	if name == "" {
		return validationDomainError("name required", map[string]any{
			"field": "name",
		})
	}
	adminCtx := j.admin.adminContextFromRequest(c, j.admin.config.DefaultLocale)
	if err := j.admin.requirePermission(adminCtx, j.admin.config.JobsTriggerPermission, "jobs"); err != nil {
		return err
	}
	return j.admin.jobs.Trigger(adminCtx, name)
}

type settingsBinding struct {
	admin *Admin
}

func newSettingsBinding(a *Admin) boot.SettingsBinding {
	if a == nil || a.settings == nil {
		return nil
	}
	return &settingsBinding{admin: a}
}

func (s *settingsBinding) Values(c router.Context) (map[string]any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsPermission, "settings"); err != nil {
		return nil, err
	}
	return map[string]any{"values": s.admin.settings.ResolveAll(ctx.UserID)}, nil
}

func (s *settingsBinding) Form(c router.Context) (any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsPermission, "settings"); err != nil {
		return nil, err
	}
	form := s.admin.settingsForm.FormWithContext(ctx.Context, ctx.UserID)
	return form, nil
}

func (s *settingsBinding) Save(c router.Context, body map[string]any) (map[string]any, error) {
	ctx := s.admin.adminContextFromRequest(c, s.admin.config.DefaultLocale)
	if err := s.admin.requirePermission(ctx, s.admin.config.SettingsUpdatePermission, "settings"); err != nil {
		return nil, err
	}
	valuesRaw, ok := body["values"].(map[string]any)
	if !ok {
		return nil, validationDomainError("values must be an object", map[string]any{
			"field": "values",
		})
	}
	scope := SettingsScopeSite
	if str, ok := body["scope"].(string); ok && str != "" {
		scope = SettingsScope(str)
	}
	bundle := SettingsBundle{
		Scope:  scope,
		UserID: ctx.UserID,
		Values: valuesRaw,
	}
	if s.admin.commandBus != nil {
		payload := map[string]any{
			"values":  valuesRaw,
			"scope":   string(scope),
			"user_id": ctx.UserID,
		}
		if err := s.admin.commandBus.DispatchByName(ctx.Context, settingsUpdateCommandName, payload, nil); err != nil {
			return nil, err
		}
	} else if s.admin.settingsCommand != nil {
		if err := s.admin.settingsCommand.Execute(ctx.Context, SettingsUpdateMsg{Bundle: bundle}); err != nil {
			return nil, err
		}
	} else if s.admin.settings != nil {
		if err := s.admin.settings.Apply(ctx.Context, bundle); err != nil {
			return nil, err
		}
	}
	return map[string]any{
		"status": "ok",
		"values": s.admin.settings.ResolveAll(ctx.UserID),
	}, nil
}

type workflowManagementBinding struct {
	admin *Admin
}

func newWorkflowManagementBinding(a *Admin) boot.WorkflowManagementBinding {
	if a == nil || a.workflowRuntime == nil {
		return nil
	}
	return &workflowManagementBinding{admin: a}
}

func (w *workflowManagementBinding) ListWorkflows(c router.Context) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsPermission, "workflows"); err != nil {
		return nil, err
	}
	status := PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(c.Query("status"))))
	environment := strings.TrimSpace(c.Query("environment"))
	workflows, total, err := w.admin.workflowRuntime.ListWorkflows(adminCtx.Context, PersistedWorkflowListOptions{
		Status:      status,
		Environment: environment,
	})
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"workflows": workflows,
		"total":     total,
	}, nil
}

func (w *workflowManagementBinding) CreateWorkflow(c router.Context, body map[string]any) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return nil, err
	}
	workflow := workflowFromPayload("", body)
	created, err := w.admin.workflowRuntime.CreateWorkflow(adminCtx.Context, workflow)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"workflow": created,
	}, nil
}

func (w *workflowManagementBinding) UpdateWorkflow(c router.Context, id string, body map[string]any) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return nil, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, requiredFieldDomainError("id", nil)
	}
	rollbackVersion := atoiDefault(toString(body["rollback_to_version"]), 0)
	expectedVersion := atoiDefault(firstNonEmpty(toString(body["expected_version"]), toString(body["expectedVersion"]), toString(body["version"])), 0)
	if rollbackVersion > 0 {
		restored, err := w.admin.workflowRuntime.RollbackWorkflow(adminCtx.Context, id, rollbackVersion, expectedVersion)
		if err != nil {
			return nil, err
		}
		return map[string]any{
			"workflow": restored,
		}, nil
	}
	updated, err := w.admin.workflowRuntime.UpdateWorkflow(adminCtx.Context, workflowFromPayload(id, body), expectedVersion)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"workflow": updated,
	}, nil
}

func (w *workflowManagementBinding) ListBindings(c router.Context) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsPermission, "workflows"); err != nil {
		return nil, err
	}
	scopeType := WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(c.Query("scope_type"))))
	scopeRef := strings.TrimSpace(c.Query("scope_ref"))
	environment := strings.TrimSpace(c.Query("environment"))
	status := WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(c.Query("status"))))
	bindings, total, err := w.admin.workflowRuntime.ListBindings(adminCtx.Context, WorkflowBindingListOptions{
		ScopeType:   scopeType,
		ScopeRef:    scopeRef,
		Environment: environment,
		Status:      status,
	})
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"bindings": bindings,
		"total":    total,
	}, nil
}

func (w *workflowManagementBinding) CreateBinding(c router.Context, body map[string]any) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return nil, err
	}
	created, err := w.admin.workflowRuntime.CreateBinding(adminCtx.Context, workflowBindingFromPayload("", body))
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"binding": created,
	}, nil
}

func (w *workflowManagementBinding) UpdateBinding(c router.Context, id string, body map[string]any) (map[string]any, error) {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return nil, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, requiredFieldDomainError("id", nil)
	}
	expectedVersion := atoiDefault(firstNonEmpty(toString(body["expected_version"]), toString(body["expectedVersion"]), toString(body["version"])), 0)
	updated, err := w.admin.workflowRuntime.UpdateBinding(adminCtx.Context, workflowBindingFromPayload(id, body), expectedVersion)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"binding": updated,
	}, nil
}

func (w *workflowManagementBinding) DeleteBinding(c router.Context, id string) error {
	adminCtx := w.admin.adminContextFromRequest(c, w.admin.config.DefaultLocale)
	if err := w.admin.requirePermission(adminCtx, w.admin.config.SettingsUpdatePermission, "workflows"); err != nil {
		return err
	}
	return w.admin.workflowRuntime.DeleteBinding(adminCtx.Context, id)
}

func workflowFromPayload(id string, body map[string]any) PersistedWorkflow {
	workflow := PersistedWorkflow{
		ID:          strings.TrimSpace(firstNonEmpty(id, toString(body["id"]))),
		Name:        strings.TrimSpace(toString(body["name"])),
		Status:      PersistedWorkflowStatus(strings.ToLower(strings.TrimSpace(toString(body["status"])))),
		Environment: strings.TrimSpace(firstNonEmpty(toString(body["environment"]), toString(body["env"]))),
		Version:     atoiDefault(toString(body["version"]), 0),
	}
	workflow.Definition = workflowDefinitionFromPayload(body)
	return workflow
}

func workflowDefinitionFromPayload(body map[string]any) WorkflowDefinition {
	rawDef, ok := body["definition"].(map[string]any)
	if !ok || rawDef == nil {
		return WorkflowDefinition{}
	}
	def := WorkflowDefinition{
		InitialState: strings.TrimSpace(firstNonEmpty(toString(rawDef["initial_state"]), toString(rawDef["initialState"]))),
	}
	if rawTransitions, ok := rawDef["transitions"].([]any); ok {
		for _, raw := range rawTransitions {
			item, ok := raw.(map[string]any)
			if !ok || item == nil {
				continue
			}
			def.Transitions = append(def.Transitions, WorkflowTransition{
				Name:        strings.TrimSpace(toString(item["name"])),
				Description: strings.TrimSpace(toString(item["description"])),
				From:        strings.TrimSpace(toString(item["from"])),
				To:          strings.TrimSpace(toString(item["to"])),
			})
		}
	}
	return def
}

func workflowBindingFromPayload(id string, body map[string]any) WorkflowBinding {
	return WorkflowBinding{
		ID:          strings.TrimSpace(firstNonEmpty(id, toString(body["id"]))),
		ScopeType:   WorkflowBindingScopeType(strings.ToLower(strings.TrimSpace(firstNonEmpty(toString(body["scope_type"]), toString(body["scopeType"]))))),
		ScopeRef:    strings.TrimSpace(firstNonEmpty(toString(body["scope_ref"]), toString(body["scopeRef"]))),
		WorkflowID:  strings.TrimSpace(firstNonEmpty(toString(body["workflow_id"]), toString(body["workflowId"]))),
		Priority:    atoiDefault(toString(body["priority"]), 0),
		Status:      WorkflowBindingStatus(strings.ToLower(strings.TrimSpace(toString(body["status"])))),
		Environment: strings.TrimSpace(firstNonEmpty(toString(body["environment"]), toString(body["env"]))),
		Version:     atoiDefault(toString(body["version"]), 0),
	}
}

func (d *dashboardBinding) Diagnostics(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	msg := DashboardDiagnosticsMsg{Locale: locale}
	report, err := dispatcher.Query[DashboardDiagnosticsMsg, DashboardDiagnosticsReport](ctx.Context, msg)
	if err != nil {
		// Fallback to direct diagnostics when the command bus/query registry isn't available.
		if fallback, ferr := (&dashboardDiagnosticsQuery{admin: d.admin}).Query(ctx.Context, msg); ferr == nil {
			report = fallback
		} else {
			return nil, err
		}
	}
	return map[string]any{
		"locale":             report.Locale,
		"areas":              report.Areas,
		"providers":          report.Providers,
		"definitions":        report.Definitions,
		"instances":          report.Instances,
		"instances_by_area":  report.InstancesByArea,
		"resolved_by_area":   report.ResolvedByArea,
		"resolve_errors":     report.ResolveErrors,
		"widget_service":     report.WidgetService,
		"has_widget_service": report.HasWidgetService,
	}, nil
}

type iconsBinding struct {
	admin *Admin
}

func newIconsBinding(a *Admin) boot.IconsBinding {
	if a == nil || a.iconService == nil {
		return nil
	}
	return &iconsBinding{admin: a}
}

func (i *iconsBinding) Libraries(c router.Context) (map[string]any, error) {
	libraries := i.admin.iconService.Libraries()
	result := make([]map[string]any, len(libraries))
	for idx, lib := range libraries {
		result[idx] = map[string]any{
			"id":          lib.ID,
			"name":        lib.Name,
			"description": lib.Description,
			"version":     lib.Version,
			"cdn":         lib.CDN,
			"css_class":   lib.CSSClass,
			"render_mode": lib.RenderMode,
			"priority":    lib.Priority,
			"categories":  lib.Categories,
		}
	}
	defaults := i.admin.iconService.Defaults()
	return map[string]any{
		"libraries": result,
		"default":   defaults.DefaultLibrary,
	}, nil
}

func (i *iconsBinding) Library(c router.Context, id string) (map[string]any, error) {
	lib, ok := i.admin.iconService.Library(id)
	if !ok {
		return nil, notFoundDomainError("icon library not found", map[string]any{"id": id})
	}
	return map[string]any{
		"id":          lib.ID,
		"name":        lib.Name,
		"description": lib.Description,
		"version":     lib.Version,
		"cdn":         lib.CDN,
		"css_class":   lib.CSSClass,
		"render_mode": lib.RenderMode,
		"priority":    lib.Priority,
		"categories":  i.admin.iconService.Categories(id),
		"icon_count":  len(lib.Icons),
	}, nil
}

func (i *iconsBinding) LibraryIcons(c router.Context, libraryID, category string) ([]map[string]any, error) {
	icons := i.admin.iconService.LibraryIcons(libraryID, category)
	result := make([]map[string]any, len(icons))
	for idx, icon := range icons {
		result[idx] = map[string]any{
			"id":       icon.ID,
			"name":     icon.Name,
			"label":    icon.Label,
			"type":     icon.Type,
			"library":  icon.Library,
			"keywords": icon.Keywords,
			"category": icon.Category,
		}
	}
	return result, nil
}

func (i *iconsBinding) Search(c router.Context, query string, limit int) ([]map[string]any, error) {
	icons := i.admin.iconService.Search(c.Context(), query, limit)
	result := make([]map[string]any, len(icons))
	for idx, icon := range icons {
		result[idx] = map[string]any{
			"id":       icon.ID,
			"name":     icon.Name,
			"label":    icon.Label,
			"type":     icon.Type,
			"library":  icon.Library,
			"keywords": icon.Keywords,
			"category": icon.Category,
		}
	}
	return result, nil
}

func (i *iconsBinding) Resolve(c router.Context, value string) (map[string]any, error) {
	ref := ParseIconReference(value)
	def, err := i.admin.iconService.Resolve(ref)
	if err != nil {
		return nil, err
	}
	result := map[string]any{
		"raw":           ref.Raw,
		"type":          ref.Type,
		"library":       ref.Library,
		"value":         ref.Value,
		"qualified":     ref.Qualified,
		"legacy_mapped": ref.LegacyMapped,
	}
	if def != nil {
		result["definition"] = map[string]any{
			"id":       def.ID,
			"name":     def.Name,
			"label":    def.Label,
			"type":     def.Type,
			"library":  def.Library,
			"keywords": def.Keywords,
			"category": def.Category,
		}
	}
	return result, nil
}

func (i *iconsBinding) Render(c router.Context, value, variant string) (map[string]any, error) {
	ref := ParseIconReference(value)
	opts := RenderOptionsForAPI(false) // Untrusted by default for API requests
	if variant != "" {
		opts.Variant = variant
	}
	html := i.admin.iconService.Render(ref, opts)
	return map[string]any{
		"value":   value,
		"variant": variant,
		"html":    html,
		"type":    ref.Type,
		"library": ref.Library,
	}, nil
}
