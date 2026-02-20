package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
)

const translationQueueDueSoonWindow = 48 * time.Hour

type translationQueueBinding struct {
	admin *Admin
	now   func() time.Time
}

func newTranslationQueueBinding(a *Admin) *translationQueueBinding {
	if a == nil {
		return nil
	}
	return &translationQueueBinding{
		admin: a,
		now:   func() time.Time { return time.Now().UTC() },
	}
}

func (b *translationQueueBinding) MyWork(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, err
	}

	userID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 25), 1, 200)
	now := b.now().UTC()
	summary := map[string]int{
		"total":                         0,
		translationQueueDueStateOverdue: 0,
		translationQueueDueStateSoon:    0,
		translationQueueDueStateOnTrack: 0,
		translationQueueDueStateNone:    0,
		"review":                        0,
	}
	if userID == "" {
		return map[string]any{
			"scope":       "my_work",
			"user_id":     "",
			"summary":     summary,
			"assignments": []map[string]any{},
			"items":       []map[string]any{},
			"total":       0,
			"page":        page,
			"per_page":    perPage,
			"updated_at":  now,
		}, nil
	}

	filters := map[string]any{
		"assignee_id": userID,
	}
	if status := strings.TrimSpace(strings.ToLower(c.Query("status"))); status != "" {
		filters["status"] = status
	}

	assignments, total, err := repo.List(adminCtx.Context, ListOptions{
		Page:    page,
		PerPage: perPage,
		SortBy:  "due_date",
		Filters: filters,
	})
	if err != nil {
		return nil, err
	}
	summaryAssignments, err := b.listAssignmentsForSummary(adminCtx.Context, repo, "due_date", filters)
	if err != nil {
		return nil, err
	}

	rows := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		row := b.assignmentContractRow(adminCtx.Context, assignment, now)
		rows = append(rows, row)
	}
	for _, assignment := range summaryAssignments {
		dueState := translationQueueDueState(assignment.DueDate, now)
		summary[dueState]++
		summary["total"]++
		if assignment.Status == AssignmentStatusReview {
			summary["review"]++
		}
	}

	return map[string]any{
		"scope":       "my_work",
		"user_id":     userID,
		"summary":     summary,
		"assignments": rows,
		"items":       rows,
		"total":       total,
		"page":        page,
		"per_page":    perPage,
		"updated_at":  now,
	}, nil
}

func (b *translationQueueBinding) Queue(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, err
	}
	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 50), 1, 200)
	now := b.now().UTC()

	filters := map[string]any{}
	if assigneeID := strings.TrimSpace(c.Query("assignee_id")); assigneeID != "" {
		filters["assignee_id"] = assigneeID
	}
	if status := strings.TrimSpace(strings.ToLower(c.Query("status"))); status != "" {
		filters["status"] = status
	}
	if reviewOnly := strings.TrimSpace(strings.ToLower(c.Query("review"))); reviewOnly == "1" || reviewOnly == "true" {
		filters["status"] = string(AssignmentStatusReview)
	}

	assignments, total, err := repo.List(adminCtx.Context, ListOptions{
		Page:    page,
		PerPage: perPage,
		SortBy:  "updated_at",
		Filters: filters,
	})
	if err != nil {
		return nil, err
	}
	summaryAssignments, err := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", filters)
	if err != nil {
		return nil, err
	}

	rows := make([]map[string]any, 0, len(assignments))
	byQueueState := map[string]int{}
	byDueState := map[string]int{}
	for _, assignment := range assignments {
		row := b.assignmentContractRow(adminCtx.Context, assignment, now)
		rows = append(rows, row)
	}
	for _, assignment := range summaryAssignments {
		queueState := normalizeTranslationQueueState(string(assignment.Status))
		byQueueState[queueState]++
		dueState := translationQueueDueState(assignment.DueDate, now)
		byDueState[dueState]++
	}

	return map[string]any{
		"scope": "queue",
		"summary": map[string]any{
			"total":          len(summaryAssignments),
			"by_queue_state": byQueueState,
			"by_due_state":   byDueState,
		},
		"items":       rows,
		"assignments": rows,
		"total":       total,
		"page":        page,
		"per_page":    perPage,
		"updated_at":  now,
	}, nil
}

func (b *translationQueueBinding) EntityTypesOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	search := strings.ToLower(strings.TrimSpace(translationQueueOptionsSearch(c)))
	seen := map[string]map[string]any{}
	if b.admin.registry != nil {
		for panelName, panel := range b.admin.registry.Panels() {
			if panel == nil || !panelSupportsTranslationQueueTab(panelName, panel) {
				continue
			}
			entityType := normalizeTranslationQueueEntityType(panelName)
			if entityType == "" {
				continue
			}
			seen[entityType] = map[string]any{
				"value": entityType,
				"label": translationQueueEntityTypeLabel(entityType),
			}
		}
	}

	if repo, err := b.assignmentRepository(); err == nil && repo != nil {
		assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", nil)
		if listErr == nil {
			for _, assignment := range assignments {
				entityType := normalizeTranslationQueueEntityType(assignment.EntityType)
				if entityType == "" {
					continue
				}
				if _, ok := seen[entityType]; ok {
					continue
				}
				seen[entityType] = map[string]any{
					"value": entityType,
					"label": translationQueueEntityTypeLabel(entityType),
				}
			}
		}
	}

	options := make([]map[string]any, 0, len(seen))
	for _, option := range seen {
		if !translationQueueOptionMatchesSearch(option, search) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) SourceRecordsOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	entityType := normalizeTranslationQueueEntityType(c.Query("entity_type"))
	if entityType == "" {
		return []map[string]any{}, nil
	}
	panel, panelName, ok := b.panelForEntityType(entityType, adminCtx.Environment)
	if !ok || panel == nil {
		return []map[string]any{}, nil
	}

	search := translationQueueOptionsSearch(c)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 25), 1, 200)
	records, _, err := panel.List(adminCtx, ListOptions{
		Page:    1,
		PerPage: perPage,
		Search:  strings.TrimSpace(search),
	})
	if err != nil {
		return nil, err
	}

	options := make([]map[string]any, 0, len(records))
	for _, record := range records {
		option := translationQueueSourceRecordOption(record, panelName)
		if option == nil {
			continue
		}
		options = append(options, option)
	}
	searchKey := strings.ToLower(strings.TrimSpace(search))
	options = translationQueueFilterOptionsBySearch(options, searchKey)
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) LocalesOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	entityType := normalizeTranslationQueueEntityType(c.Query("entity_type"))
	sourceRecordID := strings.TrimSpace(c.Query("source_record_id"))
	excludeLocale := strings.ToLower(strings.TrimSpace(c.Query("source_locale")))
	localeSet := map[string]struct{}{}

	if defaultLocale := strings.ToLower(strings.TrimSpace(b.admin.config.DefaultLocale)); defaultLocale != "" {
		localeSet[defaultLocale] = struct{}{}
	}

	var sourceRecord map[string]any
	if entityType != "" && sourceRecordID != "" {
		if panel, panelName, ok := b.panelForEntityType(entityType, adminCtx.Environment); ok && panel != nil {
			record, err := panel.Get(adminCtx, sourceRecordID)
			if err == nil && len(record) > 0 {
				sourceRecord = record
				for _, locale := range translationReadinessAvailableLocales(record) {
					if locale = strings.ToLower(strings.TrimSpace(locale)); locale != "" {
						localeSet[locale] = struct{}{}
					}
				}
				for _, locale := range []string{
					toString(record["locale"]),
					toString(record["source_locale"]),
					toString(record["target_locale"]),
					toString(record["requested_locale"]),
					toString(record["resolved_locale"]),
				} {
					if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
						localeSet[normalized] = struct{}{}
					}
				}

				if policy := b.translationPolicyForPanel(panel); policy != nil {
					requiredLocales, _, resolved := resolveReadinessRequirements(
						adminCtx.Context,
						policy,
						panelName,
						record,
						map[string]any{"environment": adminCtx.Environment},
					)
					if resolved {
						for _, locale := range requiredLocales {
							if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
								localeSet[normalized] = struct{}{}
							}
						}
					}
				}
			}
		}
	}

	if repo, err := b.assignmentRepository(); err == nil && repo != nil {
		filters := map[string]any{}
		if entityType != "" {
			filters["entity_type"] = entityType
		}
		if sourceRecordID != "" {
			filters["source_record_id"] = sourceRecordID
		}
		assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", filters)
		if listErr == nil {
			for _, assignment := range assignments {
				for _, locale := range []string{assignment.SourceLocale, assignment.TargetLocale} {
					if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
						localeSet[normalized] = struct{}{}
					}
				}
			}
		}
	}

	if sourceRecord != nil {
		readiness, _ := sourceRecord["translation_readiness"].(map[string]any)
		for _, locale := range toStringSlice(readiness["required_locales"]) {
			if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
				localeSet[normalized] = struct{}{}
			}
		}
	}

	delete(localeSet, "")
	if excludeLocale != "" {
		delete(localeSet, excludeLocale)
	}

	search := strings.ToLower(strings.TrimSpace(translationQueueOptionsSearch(c)))
	options := make([]map[string]any, 0, len(localeSet))
	for locale := range localeSet {
		option := map[string]any{
			"value": locale,
			"label": strings.ToUpper(locale),
		}
		if !translationQueueOptionMatchesSearch(option, search) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) TranslationGroupsOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	entityType := normalizeTranslationQueueEntityType(c.Query("entity_type"))
	sourceRecordID := strings.TrimSpace(c.Query("source_record_id"))
	search := strings.ToLower(strings.TrimSpace(translationQueueOptionsSearch(c)))

	optionsByValue := map[string]map[string]any{}
	appendOption := func(value, label, description string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		label = strings.TrimSpace(label)
		if label == "" {
			label = value
		}
		current, exists := optionsByValue[value]
		if !exists {
			current = map[string]any{
				"value": value,
				"label": label,
			}
			optionsByValue[value] = current
		}
		if strings.TrimSpace(toString(current["description"])) == "" && strings.TrimSpace(description) != "" {
			current["description"] = strings.TrimSpace(description)
		}
	}

	if entityType != "" && sourceRecordID != "" {
		if panel, panelName, ok := b.panelForEntityType(entityType, adminCtx.Environment); ok && panel != nil {
			if record, err := panel.Get(adminCtx, sourceRecordID); err == nil && len(record) > 0 {
				groupID := strings.TrimSpace(translationGroupIDFromRecord(record))
				if groupID == "" {
					groupID = strings.TrimSpace(toString(record["translation_group_id"]))
				}
				label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
					toString(record["source_title"]),
					toString(record["title"]),
					toString(record["name"]),
					groupID,
				))
				description := strings.TrimSpace(primitives.FirstNonEmptyRaw(
					toString(record["source_path"]),
					toString(record["path"]),
					toString(record["slug"]),
				))
				if strings.TrimSpace(panelName) != "" {
					if description != "" {
						description = panelName + " • " + description
					} else {
						description = panelName
					}
				}
				appendOption(groupID, label, description)
			}
		}
	}

	if repo, err := b.assignmentRepository(); err == nil && repo != nil {
		filters := map[string]any{}
		if entityType != "" {
			filters["entity_type"] = entityType
		}
		if sourceRecordID != "" {
			filters["source_record_id"] = sourceRecordID
		}
		assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", filters)
		if listErr == nil {
			for _, assignment := range assignments {
				description := strings.TrimSpace(primitives.FirstNonEmptyRaw(
					assignment.SourcePath,
					assignment.EntityType,
				))
				label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
					assignment.SourceTitle,
					assignment.TranslationGroupID,
				))
				appendOption(assignment.TranslationGroupID, label, description)
			}
		}
	}

	options := make([]map[string]any, 0, len(optionsByValue))
	for _, option := range optionsByValue {
		if !translationQueueOptionMatchesSearch(option, search) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) AssigneesOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	search := translationQueueOptionsSearch(c)
	searchKey := strings.ToLower(strings.TrimSpace(search))
	perPage := clampInt(atoiDefault(c.Query("per_page"), 25), 1, 200)
	optionsByValue := map[string]map[string]any{}
	appendOption := func(option map[string]any) {
		if len(option) == 0 {
			return
		}
		value := strings.TrimSpace(toString(option["value"]))
		if value == "" {
			return
		}
		current, exists := optionsByValue[value]
		if !exists {
			current = map[string]any{
				"value": value,
				"label": strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(option["label"]), value)),
			}
			optionsByValue[value] = current
		}
		if strings.TrimSpace(toString(current["description"])) == "" && strings.TrimSpace(toString(option["description"])) != "" {
			current["description"] = strings.TrimSpace(toString(option["description"]))
		}
		if strings.TrimSpace(toString(current["display_name"])) == "" {
			displayName := strings.TrimSpace(primitives.FirstNonEmptyRaw(
				toString(option["display_name"]),
				toString(option["label"]),
			))
			if displayName != "" {
				current["display_name"] = displayName
			}
		}
		if strings.TrimSpace(toString(current["avatar_url"])) == "" && strings.TrimSpace(toString(option["avatar_url"])) != "" {
			current["avatar_url"] = strings.TrimSpace(toString(option["avatar_url"]))
		}
	}

	if b.admin.registry != nil {
		if usersPanel, ok := b.admin.registry.Panel(usersModuleID); ok && usersPanel != nil {
			records, _, err := usersPanel.List(adminCtx, ListOptions{
				Page:    1,
				PerPage: perPage,
				Search:  search,
			})
			if err == nil {
				for _, record := range records {
					appendOption(translationQueueAssigneeOption(record))
				}
			}
		}
	}

	if repo, err := b.assignmentRepository(); err == nil && repo != nil {
		assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", nil)
		if listErr == nil {
			for _, assignment := range assignments {
				assigneeID := strings.TrimSpace(assignment.AssigneeID)
				if assigneeID == "" {
					continue
				}
				appendOption(map[string]any{
					"value": assigneeID,
					"label": assigneeID,
				})
			}
		}
	}

	if selected := strings.TrimSpace(c.Query("assignee_id")); selected != "" {
		appendOption(map[string]any{
			"value": selected,
			"label": selected,
		})
	}

	options := make([]map[string]any, 0, len(optionsByValue))
	for _, option := range optionsByValue {
		if !translationQueueOptionMatchesSearch(option, searchKey) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) listAssignmentsForSummary(ctx context.Context, repo TranslationAssignmentRepository, sortBy string, filters map[string]any) ([]TranslationAssignment, error) {
	if repo == nil {
		return nil, nil
	}
	const summaryPerPage = 200
	page := 1
	summary := make([]TranslationAssignment, 0, summaryPerPage)
	for {
		batch, total, err := repo.List(ctx, ListOptions{
			Page:    page,
			PerPage: summaryPerPage,
			SortBy:  strings.TrimSpace(sortBy),
			Filters: primitives.CloneAnyMap(filters),
		})
		if err != nil {
			return nil, err
		}
		if len(batch) == 0 {
			break
		}
		summary = append(summary, batch...)
		if total > 0 && page*summaryPerPage >= total {
			break
		}
		if len(batch) < summaryPerPage {
			break
		}
		page++
	}
	return summary, nil
}

func (b *translationQueueBinding) assignmentRepository() (TranslationAssignmentRepository, error) {
	if b == nil || b.admin == nil || b.admin.registry == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	panel, ok := b.admin.registry.Panel(translationQueuePanelID)
	if !ok || panel == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	repo, ok := panel.repo.(*TranslationAssignmentPanelRepository)
	if !ok || repo == nil || repo.repo == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	return repo.repo, nil
}

func (b *translationQueueBinding) assignmentContractRow(ctx context.Context, assignment TranslationAssignment, now time.Time) map[string]any {
	row := translationQueueAssignmentContractRow(assignment, now)
	row["review_actions"] = b.reviewActionStates(ctx, assignment.Status)
	return row
}

func translationQueueAssignmentContractRow(assignment TranslationAssignment, now time.Time) map[string]any {
	queueState := normalizeTranslationQueueState(string(assignment.Status))
	contentState := translationQueueContentState(assignment.Status)
	row := map[string]any{
		"id":                   strings.TrimSpace(assignment.ID),
		"translation_group_id": strings.TrimSpace(assignment.TranslationGroupID),
		"entity_type":          strings.TrimSpace(assignment.EntityType),
		"source_record_id":     strings.TrimSpace(assignment.SourceRecordID),
		"target_record_id":     strings.TrimSpace(assignment.TargetRecordID),
		"source_locale":        strings.TrimSpace(assignment.SourceLocale),
		"target_locale":        strings.TrimSpace(assignment.TargetLocale),
		"source_title":         strings.TrimSpace(assignment.SourceTitle),
		"source_path":          strings.TrimSpace(assignment.SourcePath),
		"assignee_id":          strings.TrimSpace(assignment.AssigneeID),
		"assignment_type":      strings.TrimSpace(string(assignment.AssignmentType)),
		"content_state":        contentState,
		"queue_state":          queueState,
		"status":               queueState,
		"priority":             strings.TrimSpace(string(assignment.Priority)),
		"due_state":            translationQueueDueState(assignment.DueDate, now),
		"updated_at":           assignment.UpdatedAt,
		"created_at":           assignment.CreatedAt,
	}
	if assignment.DueDate != nil {
		row["due_date"] = assignment.DueDate
	}
	return row
}

func (b *translationQueueBinding) reviewActionStates(ctx context.Context, status AssignmentStatus) map[string]any {
	return map[string]any{
		"submit_review": b.queueActionState(ctx, status == AssignmentStatusInProgress, PermAdminTranslationsEdit, "assignment must be in progress"),
		"approve":       b.queueActionState(ctx, status == AssignmentStatusReview, PermAdminTranslationsApprove, "assignment must be in review"),
		"reject":        b.queueActionState(ctx, status == AssignmentStatusReview, PermAdminTranslationsApprove, "assignment must be in review"),
	}
}

func (b *translationQueueBinding) queueActionState(ctx context.Context, statusAllowed bool, permission, statusReason string) map[string]any {
	if ctx == nil {
		ctx = context.Background()
	}
	permission = strings.TrimSpace(permission)
	allowed := true
	if permission != "" && b != nil && b.admin != nil && b.admin.authorizer != nil {
		allowed = b.admin.authorizer.Can(ctx, permission, "translations")
	}
	out := map[string]any{
		"enabled": statusAllowed && allowed,
	}
	if permission != "" {
		out["permission"] = permission
	}
	if statusAllowed && allowed {
		return out
	}
	if !allowed {
		out["reason"] = "missing permission: " + permission
		out["reason_code"] = ActionDisabledReasonCodePermissionDenied
		return out
	}
	out["reason"] = strings.TrimSpace(statusReason)
	out["reason_code"] = ActionDisabledReasonCodeInvalidStatus
	return out
}

func translationQueueContentState(status AssignmentStatus) string {
	switch normalizeTranslationQueueState(string(status)) {
	case string(AssignmentStatusReview):
		return translationQueueContentStateReview
	case string(AssignmentStatusApproved), string(AssignmentStatusPublished):
		return translationQueueContentStateReady
	case string(AssignmentStatusArchived):
		return translationQueueContentStateArchived
	default:
		return translationQueueContentStateDraft
	}
}

func translationQueueDueState(dueDate *time.Time, now time.Time) string {
	if dueDate == nil || dueDate.IsZero() {
		return translationQueueDueStateNone
	}
	due := dueDate.UTC()
	current := now.UTC()
	if due.Before(current) {
		return translationQueueDueStateOverdue
	}
	if due.Sub(current) <= translationQueueDueSoonWindow {
		return translationQueueDueStateSoon
	}
	return translationQueueDueStateOnTrack
}

func (b *translationQueueBinding) panelForEntityType(entityType, env string) (*Panel, string, bool) {
	if b == nil || b.admin == nil || b.admin.registry == nil {
		return nil, "", false
	}
	entityType = normalizeTranslationQueueEntityType(entityType)
	env = strings.TrimSpace(env)
	if entityType == "" {
		return nil, "", false
	}

	candidates := []string{}
	if strings.Contains(entityType, "@") {
		candidates = append(candidates, entityType)
	} else if env != "" {
		candidates = append(candidates, entityType+"@"+env)
	}
	candidates = append(candidates, entityType)

	for _, candidate := range candidates {
		panel, ok := b.admin.registry.Panel(candidate)
		if ok && panel != nil {
			return panel, candidate, true
		}
	}
	return nil, "", false
}

func (b *translationQueueBinding) translationPolicyForPanel(panel *Panel) TranslationPolicy {
	if panel != nil && panel.translationPolicy != nil {
		return panel.translationPolicy
	}
	if b != nil && b.admin != nil {
		return b.admin.translationPolicy
	}
	return nil
}

func translationQueueSourceRecordOption(record map[string]any, panelName string) map[string]any {
	id := strings.TrimSpace(toString(record["id"]))
	if id == "" {
		return nil
	}
	label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["source_title"]),
		toString(record["title"]),
		toString(record["name"]),
		toString(record["slug"]),
		id,
	))
	previewParts := []string{}
	if path := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["source_path"]), toString(record["path"]), toString(record["slug"]))); path != "" {
		previewParts = append(previewParts, path)
	}
	if locale := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["locale"]), toString(record["resolved_locale"]), toString(record["source_locale"]))); locale != "" {
		previewParts = append(previewParts, strings.ToUpper(locale))
	}
	if len(previewParts) > 0 {
		label = label + " • " + strings.Join(previewParts, " • ")
	}
	descriptionParts := []string{}
	if path := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["source_path"]), toString(record["path"]), toString(record["slug"]))); path != "" {
		descriptionParts = append(descriptionParts, path)
	}
	if locale := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["locale"]), toString(record["resolved_locale"]), toString(record["source_locale"]))); locale != "" {
		descriptionParts = append(descriptionParts, strings.ToUpper(locale))
	}
	if status := strings.TrimSpace(toString(record["status"])); status != "" {
		descriptionParts = append(descriptionParts, status)
	}
	description := strings.Join(descriptionParts, " • ")

	option := map[string]any{
		"value": id,
		"label": label,
	}
	if locale := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["source_locale"]), toString(record["locale"]), toString(record["resolved_locale"]))); locale != "" {
		option["source_locale"] = strings.ToLower(locale)
	}
	if description != "" {
		option["description"] = description
	}
	if groupID := strings.TrimSpace(translationGroupIDFromRecord(record)); groupID != "" {
		option["translation_group_id"] = groupID
	}
	if panelName != "" {
		option["entity_type"] = normalizeTranslationQueueEntityType(panelName)
	}
	return option
}

func translationQueueAssigneeOption(record map[string]any) map[string]any {
	id := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["id"]),
		toString(record["user_id"]),
		toString(record["assignee_id"]),
	))
	if id == "" {
		return nil
	}
	displayName := strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["display_name"]),
		toString(record["full_name"]),
		toString(record["name"]),
		toString(record["username"]),
		toString(record["email"]),
		id,
	))
	label := displayName
	descriptionParts := []string{}
	if email := strings.TrimSpace(toString(record["email"])); email != "" && !strings.EqualFold(email, label) {
		descriptionParts = append(descriptionParts, email)
	}
	if role := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["role"]), toString(record["role_key"]))); role != "" {
		descriptionParts = append(descriptionParts, role)
	}
	if status := strings.TrimSpace(toString(record["status"])); status != "" {
		descriptionParts = append(descriptionParts, status)
	}
	option := map[string]any{
		"value":        id,
		"label":        label,
		"display_name": displayName,
	}
	if avatarURL := translationQueueAssigneeAvatarURL(record); avatarURL != "" {
		option["avatar_url"] = avatarURL
	}
	if len(descriptionParts) > 0 {
		option["description"] = strings.Join(descriptionParts, " • ")
	}
	return option
}

func translationQueueAssigneeAvatarURL(record map[string]any) string {
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(
		toString(record["avatar_url"]),
		toString(record["avatar"]),
		toString(record["profile_avatar_url"]),
		toString(record["profile_picture"]),
		toString(record["picture"]),
		toString(record["image_url"]),
		toString(record["photo_url"]),
	))
}

func translationQueueOptionsSearch(c router.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(c.Query("search"), c.Query("q")))
}

func translationQueueFilterOptionsBySearch(options []map[string]any, search string) []map[string]any {
	search = strings.ToLower(strings.TrimSpace(search))
	if search == "" || len(options) == 0 {
		return options
	}
	out := make([]map[string]any, 0, len(options))
	for _, option := range options {
		if translationQueueOptionMatchesSearch(option, search) {
			out = append(out, option)
		}
	}
	return out
}

func translationQueueOptionMatchesSearch(option map[string]any, search string) bool {
	search = strings.ToLower(strings.TrimSpace(search))
	if search == "" {
		return true
	}
	for _, key := range []string{"label", "value", "description"} {
		if strings.Contains(strings.ToLower(strings.TrimSpace(toString(option[key]))), search) {
			return true
		}
	}
	return false
}

func sortTranslationQueueOptions(options []map[string]any) {
	if len(options) == 0 {
		return
	}
	sort.SliceStable(options, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(options[i]["label"]), toString(options[i]["value"]))))
		right := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(options[j]["label"]), toString(options[j]["value"]))))
		if left == right {
			return strings.ToLower(strings.TrimSpace(toString(options[i]["value"]))) < strings.ToLower(strings.TrimSpace(toString(options[j]["value"])))
		}
		return left < right
	})
}

func normalizeTranslationQueueEntityType(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if idx := strings.Index(value, "@"); idx > 0 {
		value = strings.TrimSpace(value[:idx])
	}
	return strings.ToLower(value)
}

func translationQueueEntityTypeLabel(entityType string) string {
	entityType = normalizeTranslationQueueEntityType(entityType)
	if entityType == "" {
		return ""
	}
	entityType = strings.ReplaceAll(entityType, "-", " ")
	entityType = strings.ReplaceAll(entityType, "_", " ")
	parts := strings.Fields(entityType)
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}

func clampInt(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if maxValue > 0 && value > maxValue {
		return maxValue
	}
	return value
}
