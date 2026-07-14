package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"

	"github.com/goliatone/go-admin/admin/internal/adminkeys"
	translationqueue "github.com/goliatone/go-admin/admin/internal/translationqueue"
	"github.com/goliatone/go-admin/internal/primitives"
	goerrors "github.com/goliatone/go-errors"
	"github.com/google/uuid"
	"maps"
	"net/url"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
	router "github.com/goliatone/go-router"
)

const translationQueueDueSoonWindow = 48 * time.Hour
const translationQueueMissingActorFilterToken = translationqueue.MissingActorFilterToken
const translationQueueReviewStateQABlocked = translationqueue.ReviewStateQABlocked
const translationQueueBulkSnapshotTTL = 15 * time.Minute
const translationQueueBulkSnapshotMaxAssignments = 5_000

var translationQueuePrioritySortRank = map[string]int{
	"low":    0,
	"normal": 1,
	"high":   2,
	"urgent": 3,
}

var translationQueueDueStateSortRank = map[string]int{
	translationQueueDueStateNone:    0,
	translationQueueDueStateOnTrack: 1,
	translationQueueDueStateSoon:    2,
	translationQueueDueStateOverdue: 3,
}

type translationQueueBinding struct {
	admin                *Admin
	now                  func() time.Time
	dashboardLoadRuntime func(context.Context, string) (*translationFamilyRuntime, error)
	idempotencyMu        sync.Mutex
	idempotency          map[string]translationQueueActionReplay
	snapshotMu           sync.Mutex
	snapshots            map[string]translationQueueFilterSnapshot
}

type translationQueueActionReplay struct {
	PayloadHash string         `json:"payload_hash"`
	Response    map[string]any `json:"response"`
	StoredAt    time.Time      `json:"stored_at"`
}

type translationQueueBulkActionSelection struct {
	AssignmentID     string `json:"assignment_id"`
	ExpectedVersion  int64  `json:"expected_version"`
	OriginalPosition int    `json:"-"`
}

type translationQueueFilterSnapshot struct {
	ID            string                                `json:"snapshot_id"`
	ActorID       string                                `json:"actor_id"`
	TenantID      string                                `json:"tenant_id"`
	OrgID         string                                `json:"org_id"`
	Channel       string                                `json:"channel"`
	Filter        translationAssignmentListFilter       `json:"filter"`
	FilterPayload map[string]any                        `json:"filters"`
	FilterSummary []string                              `json:"filter_summary"`
	Selections    []translationQueueBulkActionSelection `json:"-"`
	CreatedAt     time.Time                             `json:"created_at"`
	ExpiresAt     time.Time                             `json:"expires_at"`
}

type translationQueueGroupingRequest struct {
	Enabled      bool
	Mode         string
	Strategy     string
	ExplicitSort bool
}

func translationQueueGroupingFromRequest(c router.Context) (translationQueueGroupingRequest, error) {
	groupBy := strings.TrimSpace(strings.ToLower(c.Query(adminkeys.QueryGroupBy)))
	if groupBy == "" {
		return translationQueueGroupingRequest{}, nil
	}
	strategy := strings.TrimSpace(strings.ToLower(c.Query(adminkeys.QueryGroupStrategy)))
	if strategy == "" {
		strategy = "page_local"
	}
	switch groupBy {
	case "family_id":
		switch strategy {
		case "page_local", "server_family":
			return translationQueueGroupingRequest{
				Enabled:      true,
				Mode:         "family_id",
				Strategy:     strategy,
				ExplicitSort: strings.TrimSpace(firstNonEmpty(c.Query(adminkeys.QuerySort), c.Query(adminkeys.QuerySortBy))) != "",
			}, nil
		default:
			return translationQueueGroupingRequest{}, validationDomainError("unsupported assignment queue grouping strategy", map[string]any{
				"field":                      adminkeys.QueryGroupStrategy,
				adminkeys.QueryGroupBy:       groupBy,
				adminkeys.QueryGroupStrategy: strategy,
				"supported":                  []string{"page_local", "server_family"},
				"reason_code":                "group_strategy_unsupported",
			})
		}
	default:
		return translationQueueGroupingRequest{}, validationDomainError("unsupported assignment queue grouping", map[string]any{
			"field":                adminkeys.QueryGroupBy,
			adminkeys.QueryGroupBy: groupBy,
			"supported":            []string{"family_id"},
		})
	}
}

func newTranslationQueueBinding(a *Admin) *translationQueueBinding {
	if a == nil {
		return nil
	}
	return &translationQueueBinding{
		admin:       a,
		now:         func() time.Time { return time.Now().UTC() },
		idempotency: map[string]translationQueueActionReplay{},
		snapshots:   map[string]translationQueueFilterSnapshot{},
	}
}

func (b *translationQueueBinding) Assignments(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.list",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	err = validateTranslationQueuePredicateQuery(c)
	if err != nil {
		return nil, err
	}
	adminCtx, repo, now, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	actorID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))

	page := clampInt(atoiDefault(c.Query(adminkeys.QueryPage), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query(adminkeys.QueryPerPage), 50), 1, 200)
	filter := b.assignmentFilterFromRequest(adminCtx, c)
	channel := translationChannelFromRequest(c, adminCtx, nil)
	grouping, err := translationQueueGroupingFromRequest(c)
	if err != nil {
		return nil, err
	}
	if grouping.Strategy == "server_family" {
		return b.serverFamilyAssignmentGroups(adminCtx, repo, filter, page, clampInt(atoiDefault(c.Query(adminkeys.QueryPerPage), 25), 1, 100), channel, now, grouping)
	}
	assignments, total, optimizedPage, err := b.assignmentPage(adminCtx.Context, repo, filter, page, perPage, channel, now)
	if err != nil {
		return nil, err
	}
	page, perPage = normalizeTranslationAssignmentPagination(page, perPage, total, 50)
	rows := b.assignmentListRows(adminCtx.Context, assignments, now, channel, grouping)
	var reviewAssignments []TranslationAssignment
	if optimizedPage {
		optimizedSummary, countsErr := b.optimizedReviewerAggregateMetadata(adminCtx.Context, repo, filter, actorID, now)
		if countsErr == nil {
			return map[string]any{
				"data": rows,
				"meta": b.assignmentListMeta(page, perPage, total, now, actorID, optimizedSummary, grouping, len(rows), len(assignments), channel, translationQueueRepositorySupportsServerFamily(repo)),
			}, nil
		}
		metadata := unavailableReviewerAggregateMetadata(TranslationQueueReviewAggregateCountKeys())
		if !errors.Is(countsErr, ErrTranslationAssignmentQueryUnsupported) {
			metadata = degradedReviewerAggregateMetadata(TranslationQueueReviewAggregateCountKeys())
		}
		return map[string]any{
			"data": rows,
			"meta": b.assignmentListMeta(page, perPage, total, now, actorID, metadata, grouping, len(rows), len(assignments), channel, translationQueueRepositorySupportsServerFamily(repo)),
		}, nil
	} else {
		reviewAssignments, err = b.listAssignmentsForSummary(adminCtx.Context, repo, filter.SortBy, nil)
		if err != nil {
			return nil, err
		}
	}
	reviewAggregateCounts, err := b.reviewerAggregateCounts(adminCtx.Context, reviewAssignments, filter, actorID, channel, now)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"data": rows,
		"meta": b.assignmentListMeta(page, perPage, total, now, actorID, reviewerAggregateMetadataFromCounts(reviewAggregateCounts), grouping, len(rows), len(assignments), channel, translationQueueRepositorySupportsServerFamily(repo)),
	}, nil
}

func (b *translationQueueBinding) assignmentListMeta(page, perPage, total int, now time.Time, actorID string, reviewAggregateMetadata TranslationAssignmentReviewerAggregateSummary, grouping translationQueueGroupingRequest, rowCount, assignmentCount int, channel string, serverFamilySupported bool) map[string]any {
	reviewAggregateMetadata = normalizedReviewerAggregateMetadata(reviewAggregateMetadata)
	return mergeTranslationChannelContract(map[string]any{
		"page":                                page,
		"per_page":                            perPage,
		"total":                               total,
		"updated_at":                          now,
		"supported_sort_keys":                 TranslationQueueSupportedSortKeys(),
		"supported_filter_keys":               TranslationQueueSupportedFilterKeys(),
		"supported_review_states":             TranslationQueueSupportedReviewStates(),
		"default_sort":                        translationQueueDefaultSortContract(),
		"saved_filter_presets":                TranslationQueueSavedFilterPresets(),
		"saved_review_filter_presets":         TranslationQueueSavedReviewFilterPresets(),
		"default_review_filter_preset":        "review_inbox",
		"review_actor_id":                     actorID,
		"review_aggregate_counts":             reviewAggregateMetadata.Counts,
		"review_aggregate_counts_unavailable": reviewAggregateMetadata.Unavailable,
		"review_aggregate_counts_degraded":    reviewAggregateMetadata.Degraded,
		"grouping":                            translationQueueGroupingContract(grouping, rowCount, assignmentCount, serverFamilySupported),
	}, channel)
}

func (b *translationQueueBinding) optimizedReviewerAggregateMetadata(ctx context.Context, repo TranslationAssignmentRepository, filter translationAssignmentListFilter, actorID string, now time.Time) (TranslationAssignmentReviewerAggregateSummary, error) {
	aggregateStore, ok := repo.(TranslationAssignmentReviewerAggregateStore)
	if ok && aggregateStore != nil {
		summary, err := aggregateStore.AssignmentReviewerAggregateSummary(ctx, TranslationAssignmentReviewerAggregateInput{
			TenantID: filter.TenantID,
			OrgID:    filter.OrgID,
			ActorID:  actorID,
			Now:      now,
		})
		if err != nil {
			return TranslationAssignmentReviewerAggregateSummary{}, err
		}
		return normalizedReviewerAggregateMetadata(summary), nil
	}
	reviewerStore, ok := repo.(TranslationAssignmentReviewerSummaryStore)
	if !ok || reviewerStore == nil {
		return TranslationAssignmentReviewerAggregateSummary{}, ErrTranslationAssignmentQueryUnsupported
	}
	counts, err := reviewerStore.AssignmentReviewerAggregateCounts(ctx, TranslationAssignmentReviewerAggregateInput{
		TenantID: filter.TenantID,
		OrgID:    filter.OrgID,
		ActorID:  actorID,
		Now:      now,
	})
	if err != nil {
		return TranslationAssignmentReviewerAggregateSummary{}, err
	}
	return reviewerAggregateMetadataFromCounts(counts), nil
}

func reviewerAggregateMetadataFromCounts(counts map[string]int) TranslationAssignmentReviewerAggregateSummary {
	return TranslationAssignmentReviewerAggregateSummary{Counts: counts}
}

func unavailableReviewerAggregateMetadata(keys []string) TranslationAssignmentReviewerAggregateSummary {
	return TranslationAssignmentReviewerAggregateSummary{Unavailable: normalizedReviewerAggregateKeys(keys)}
}

func degradedReviewerAggregateMetadata(keys []string) TranslationAssignmentReviewerAggregateSummary {
	return TranslationAssignmentReviewerAggregateSummary{Degraded: normalizedReviewerAggregateKeys(keys)}
}

func normalizedReviewerAggregateMetadata(metadata TranslationAssignmentReviewerAggregateSummary) TranslationAssignmentReviewerAggregateSummary {
	counts := map[string]int{}
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		counts[key] = 0
	}
	for key, value := range metadata.Counts {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		counts[key] = value
	}
	metadata.Counts = counts
	metadata.Unavailable = normalizedReviewerAggregateKeys(metadata.Unavailable)
	metadata.Degraded = normalizedReviewerAggregateKeys(metadata.Degraded)
	return metadata
}

func normalizedReviewerAggregateKeys(keys []string) []string {
	if len(keys) == 0 {
		return []string{}
	}
	known := map[string]bool{}
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		known[key] = true
	}
	out := make([]string, 0, len(keys))
	seen := map[string]bool{}
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" || seen[key] || !known[key] {
			continue
		}
		seen[key] = true
		out = append(out, key)
	}
	return out
}

func (b *translationQueueBinding) serverFamilyAssignmentGroups(adminCtx AdminContext, repo TranslationAssignmentRepository, filter translationAssignmentListFilter, page, perPage int, channel string, now time.Time, grouping translationQueueGroupingRequest) (map[string]any, error) {
	if err := validateServerFamilySort(filter.SortBy, grouping.ExplicitSort); err != nil {
		return nil, err
	}
	store, ok := repo.(TranslationAssignmentFamilyGroupingStore)
	if !ok || store == nil {
		return nil, translationQueueGroupingUnsupportedError("grouped_query_unsupported", "server-side family grouping is not supported for this repository", map[string]any{
			"field":                      adminkeys.QueryGroupStrategy,
			adminkeys.QueryGroupStrategy: "server_family",
			"fallback_modes":             []string{"flat", "page_local_family"},
		})
	}
	result, err := store.ListAssignmentFamilyGroups(adminCtx.Context, TranslationAssignmentFamilyGroupQueryInput{
		Filter:      filter,
		Page:        page,
		PerPage:     perPage,
		Environment: channel,
		Now:         now,
	})
	if err != nil {
		return nil, translationQueueFamilyGroupingError(err)
	}
	normalizedPage, normalizedPerPage := normalizeTranslationAssignmentPagination(page, perPage, result.FamilyTotal, 25)
	if result.FamilyTotal > 0 && (normalizedPage != page || normalizedPerPage != perPage) {
		result, err = store.ListAssignmentFamilyGroups(adminCtx.Context, TranslationAssignmentFamilyGroupQueryInput{
			Filter:      filter,
			Page:        normalizedPage,
			PerPage:     normalizedPerPage,
			Environment: channel,
			Now:         now,
		})
		if err != nil {
			return nil, translationQueueFamilyGroupingError(err)
		}
	}
	page, perPage = normalizedPage, normalizedPerPage
	rows := make([]map[string]any, 0, len(result.Families))
	for _, family := range result.Families {
		rows = append(rows, b.serverFamilyParentRow(family, filter, page, perPage, channel))
	}
	actorID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	// Reviewer aggregates describe assignment lists, while this response is
	// paginated by family. Report them unavailable instead of presenting global
	// counts as though they described the active family page.
	reviewerMetadata := unavailableReviewerAggregateMetadata(TranslationQueueReviewAggregateCountKeys())
	meta := b.assignmentListMeta(page, perPage, result.FamilyTotal, now, actorID, reviewerMetadata, grouping, len(rows), result.AssignmentTotal, channel, true)
	meta["total"] = result.FamilyTotal
	meta["family_total"] = result.FamilyTotal
	meta["assignment_total"] = result.AssignmentTotal
	meta["supported_sort_keys"] = translationQueueServerFamilySupportedSortKeys()
	meta["grouping"] = translationQueueServerFamilyGroupingContract(result.FamilyTotal, result.AssignmentTotal, len(rows))
	return map[string]any{
		"data": rows,
		"meta": meta,
	}, nil
}

func (b *translationQueueBinding) FamilyAssignments(c router.Context, familyID string) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.family_assignments",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	err = validateTranslationQueuePredicateQuery(c)
	if err != nil {
		return nil, err
	}
	adminCtx, repo, now, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	store, ok := repo.(TranslationAssignmentFamilyGroupingStore)
	if !ok || store == nil {
		return nil, translationQueueGroupingUnsupportedError("grouped_query_unsupported", "server-side family assignment expansion is not supported for this repository", map[string]any{
			"field":                      adminkeys.QueryGroupStrategy,
			adminkeys.QueryGroupStrategy: "server_family",
		})
	}
	page := clampInt(atoiDefault(c.Query(adminkeys.QueryPage), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query(adminkeys.QueryPerPage), 25), 1, 100)
	filter := b.assignmentFilterFromRequest(adminCtx, c)
	channel := translationChannelFromRequest(c, adminCtx, nil)
	result, err := store.ListFamilyAssignments(adminCtx.Context, TranslationAssignmentFamilyAssignmentsQueryInput{
		FamilyID:    familyID,
		Filter:      filter,
		Page:        page,
		PerPage:     perPage,
		Environment: channel,
		Now:         now,
	})
	if err != nil {
		return nil, translationQueueFamilyGroupingError(err)
	}
	normalizedPage, normalizedPerPage := normalizeTranslationAssignmentPagination(page, perPage, result.Total, 25)
	if result.Total > 0 && (normalizedPage != page || normalizedPerPage != perPage) {
		result, err = store.ListFamilyAssignments(adminCtx.Context, TranslationAssignmentFamilyAssignmentsQueryInput{
			FamilyID:    familyID,
			Filter:      filter,
			Page:        normalizedPage,
			PerPage:     normalizedPerPage,
			Environment: channel,
			Now:         now,
		})
		if err != nil {
			return nil, translationQueueFamilyGroupingError(err)
		}
	}
	page, perPage = normalizedPage, normalizedPerPage
	rows := b.translationQueueAssignmentRows(adminCtx.Context, result.Items, now, channel)
	return map[string]any{
		"data": rows,
		"meta": mergeTranslationChannelContract(map[string]any{
			"family_id": strings.TrimSpace(familyID),
			"page":      page,
			"per_page":  perPage,
			"total":     result.Total,
			"has_next":  result.HasNext,
			"sort":      filter.SortBy,
			"order":     translationQueueSortOrder(filter.SortDesc),
		}, channel),
	}, nil
}

func validateTranslationQueuePredicateQuery(c router.Context) error {
	if c == nil {
		return nil
	}
	for key, raw := range c.Queries() {
		key = strings.TrimSpace(strings.ToLower(key))
		if key == "" || strings.TrimSpace(raw) == "" || !strings.Contains(key, "__") {
			continue
		}
		field, operator, _ := strings.Cut(key, "__")
		supportedField := field == "title" || field == "source_title" || field == "path" || field == "source_path"
		supportedOperator := operator == "ilike" || operator == "contains"
		if supportedField && supportedOperator {
			continue
		}
		return validationDomainError("unsupported assignment queue predicate", map[string]any{
			"field":               key,
			"predicate_field":     field,
			"operator":            operator,
			"supported_fields":    []string{"title", "source_title", "path", "source_path"},
			"supported_operators": []string{"ilike", "contains"},
			"reason_code":         "queue_predicate_unsupported",
		})
	}
	return nil
}

func (b *translationQueueBinding) RunAssignmentAction(c router.Context, assignmentID, action string, body map[string]any) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.action." + strings.TrimSpace(strings.ToLower(action)),
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return nil, identityErr
	}
	adminCtx, repo, now, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	identity := translationIdentityFromAdminContext(adminCtx)
	channel := translationChannelFromRequest(c, adminCtx, body)
	if identity.ActorID == "" {
		return nil, NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment actions require an authenticated actor", map[string]any{
			"component": "translation_queue_binding",
			"action":    strings.TrimSpace(strings.ToLower(action)),
		})
	}
	service := &DefaultTranslationQueueService{
		Repository:    repo,
		Activity:      b.admin.ActivityFeed(),
		Notifications: b.admin.NotificationService(),
		URLs:          b.admin.URLs(),
	}
	action, assignmentID, err = normalizeAssignmentActionRequest(action, assignmentID)
	if err != nil {
		return nil, err
	}

	idempotencyKey := strings.TrimSpace(toString(body["idempotency_key"]))
	if replay, ok, replayErr := b.lookupActionReplay(identity.ActorID, assignmentID, action, idempotencyKey, body); replayErr != nil {
		return nil, replayErr
	} else if ok {
		if rawMeta, hasMeta := replay["meta"]; hasMeta {
			meta := extractMap(rawMeta)
			meta["idempotency_hit"] = true
			replay["meta"] = meta
		}
		return replay, nil
	}

	current, err := repo.Get(adminCtx.Context, assignmentID)
	if err != nil {
		return nil, err
	}
	if scopeErr := b.ensureAssignmentScope(identity, current); scopeErr != nil {
		return nil, scopeErr
	}
	if permissionErr := b.requireAssignmentActionPermission(adminCtx, action, current); permissionErr != nil {
		return nil, permissionErr
	}
	updated, err := b.executeAssignmentAction(adminCtx, service, current, identity.ActorID, assignmentID, action, body)
	if err != nil {
		return nil, err
	}
	response := b.assignmentActionResponse(adminCtx, updated, assignmentID, channel, now)
	b.storeActionReplay(identity.ActorID, assignmentID, action, idempotencyKey, body, response)
	return response, nil
}

func (b *translationQueueBinding) CreateAssignmentBulkSnapshot(c router.Context, body map[string]any) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.bulk_snapshot.create",
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return nil, identityErr
	}
	adminCtx, repo, now, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	identity := translationIdentityFromAdminContext(adminCtx)
	channel := translationChannelFromRequest(c, adminCtx, body)
	if identity.ActorID == "" {
		return nil, NewDomainError(string(translationcore.ErrorPermissionDenied), "bulk assignment snapshots require an authenticated actor", map[string]any{
			"component": "translation_queue_binding",
		})
	}

	filter := b.assignmentFilterFromSnapshotBody(adminCtx, body)
	selections, total, err := b.assignmentSnapshotSelections(adminCtx.Context, repo, filter, channel, now)
	if err != nil {
		return nil, err
	}
	if total > translationQueueBulkSnapshotMaxAssignments {
		return nil, validationDomainError("filter snapshot matches too many assignments for synchronous bulk action", map[string]any{
			"field":     "filters",
			"matched":   total,
			"max_items": translationQueueBulkSnapshotMaxAssignments,
		})
	}

	snapshot := translationQueueFilterSnapshot{
		ID:            "snap_" + strings.ReplaceAll(uuid.NewString(), "-", ""),
		ActorID:       identity.ActorID,
		TenantID:      identity.TenantID,
		OrgID:         identity.OrgID,
		Channel:       channel,
		Filter:        filter,
		FilterPayload: translationQueueSnapshotFilterPayload(filter),
		FilterSummary: translationQueueSnapshotFilterSummary(filter),
		Selections:    selections,
		CreatedAt:     now,
		ExpiresAt:     now.Add(translationQueueBulkSnapshotTTL),
	}
	b.storeAssignmentBulkSnapshot(snapshot)

	return map[string]any{
		"data": snapshot.assignmentBulkSnapshotContract(),
		"meta": mergeTranslationChannelContract(map[string]any{
			"selection_scope": "filter_snapshot",
			"requested":       len(selections),
			"expires_in_sec":  int(translationQueueBulkSnapshotTTL.Seconds()),
		}, channel),
	}, nil
}

//nolint:funlen,gocyclo // Bulk action dispatch intentionally keeps validation, execution, and audit metadata together.
func (b *translationQueueBinding) RunAssignmentBulkAction(c router.Context, body map[string]any) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	action := normalizeTranslationQueueBulkAction(toString(body["action"]))
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.bulk_action." + strings.TrimSpace(action),
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return nil, identityErr
	}
	adminCtx, repo, now, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	identity := translationIdentityFromAdminContext(adminCtx)
	channel := translationChannelFromRequest(c, adminCtx, body)
	if identity.ActorID == "" {
		return nil, NewDomainError(string(translationcore.ErrorPermissionDenied), "bulk assignment actions require an authenticated actor", map[string]any{
			"component": "translation_queue_binding",
			"action":    action,
		})
	}
	if action == "" {
		return nil, requiredFieldDomainError("action", nil)
	}
	if !translationQueueBulkActionSupported(action) {
		return nil, validationDomainError("unsupported bulk assignment action", map[string]any{
			"field":  "action",
			"action": action,
		})
	}
	service := &DefaultTranslationQueueService{
		Repository:    repo,
		Activity:      b.admin.ActivityFeed(),
		Notifications: b.admin.NotificationService(),
		URLs:          b.admin.URLs(),
	}

	selectionScope := normalizeTranslationQueueBulkSelectionScope(body)
	if selectionScope != "current_page" && selectionScope != "filter_snapshot" {
		return nil, validationDomainError("unsupported bulk assignment selection scope", map[string]any{
			"field":           "selection_scope",
			"selection_scope": selectionScope,
			"supported":       []string{"current_page", "filter_snapshot"},
		})
	}
	idempotencyKey := strings.TrimSpace(toString(body["idempotency_key"]))
	replayScope := "bulk"
	if replay, ok, replayErr := b.lookupActionReplay(identity.ActorID, replayScope, action, idempotencyKey, body); replayErr != nil {
		return nil, replayErr
	} else if ok {
		if rawMeta, hasMeta := replay["meta"]; hasMeta {
			meta := extractMap(rawMeta)
			meta["idempotency_hit"] = true
			replay["meta"] = meta
		}
		return replay, nil
	}
	var snapshot *translationQueueFilterSnapshot
	var selections []translationQueueBulkActionSelection
	if selectionScope == "filter_snapshot" {
		resolved, lookupErr := b.lookupAssignmentBulkSnapshot(identity, channel, body, now)
		if lookupErr != nil {
			return nil, lookupErr
		}
		snapshot = resolved
		selections = cloneTranslationQueueBulkSelections(snapshot.Selections)
	} else {
		selections, err = translationQueueBulkActionSelections(body)
		if err != nil {
			return nil, err
		}
	}

	results, errorsOut, updatedRows, succeeded := b.runAssignmentBulkSelections(adminCtx, repo, service, identity, action, channel, now, selections, body, snapshot)

	meta := mergeTranslationChannelContract(map[string]any{
		"selection_scope": selectionScope,
		"requested":       len(selections),
		"succeeded":       succeeded,
		"failed":          len(errorsOut),
		"partial":         succeeded > 0 && len(errorsOut) > 0,
		"idempotency_hit": false,
	}, channel)
	if snapshot != nil {
		meta["snapshot_id"] = snapshot.ID
		meta["filters"] = primitives.CloneAnyMap(snapshot.FilterPayload)
		meta["filter_summary"] = append([]string{}, snapshot.FilterSummary...)
		meta["snapshot_created_at"] = snapshot.CreatedAt
		meta["snapshot_expires_at"] = snapshot.ExpiresAt
	}

	response := map[string]any{
		"data": map[string]any{
			"action":      action,
			"results":     results,
			"assignments": updatedRows,
			"errors":      errorsOut,
		},
		"meta": meta,
	}
	b.storeActionReplay(identity.ActorID, replayScope, action, idempotencyKey, body, response)
	return response, nil
}

func (b *translationQueueBinding) runAssignmentBulkSelections(adminCtx AdminContext, repo TranslationAssignmentRepository, service *DefaultTranslationQueueService, identity translationTransportIdentity, action, channel string, now time.Time, selections []translationQueueBulkActionSelection, body map[string]any, snapshot *translationQueueFilterSnapshot) ([]map[string]any, []map[string]any, []map[string]any, int) {
	results := make([]map[string]any, 0, len(selections))
	errorsOut := make([]map[string]any, 0)
	updatedRows := make([]map[string]any, 0, len(selections))
	succeeded := 0
	actorLabels := b.newAssignmentActorLabelResolver()
	for _, selection := range selections {
		current, itemErr := repo.Get(adminCtx.Context, selection.AssignmentID)
		if itemErr == nil {
			itemErr = b.ensureAssignmentScope(identity, current)
		}
		if itemErr == nil && snapshot != nil {
			itemErr = b.ensureAssignmentStillMatchesSnapshot(adminCtx.Context, current, *snapshot, channel)
		}
		if itemErr == nil {
			itemErr = b.requireAssignmentBulkActionPermission(adminCtx, action, current)
		}
		var updated TranslationAssignment
		if itemErr == nil {
			updated, itemErr = b.executeAssignmentBulkAction(adminCtx, service, current, identity.ActorID, action, selection.ExpectedVersion, body)
		}
		if itemErr != nil {
			errorPayload := translationQueueBulkActionError(selection, itemErr)
			results = append(results, map[string]any{
				"assignment_id":     selection.AssignmentID,
				"requested_version": selection.ExpectedVersion,
				"status":            "failed",
				"error":             errorPayload["error"],
			})
			errorsOut = append(errorsOut, errorPayload)
			continue
		}
		row := b.assignmentContractRow(adminCtx.Context, updated, now, channel, actorLabels.labelsForAssignments(adminCtx.Context, []TranslationAssignment{updated}))
		updatedRows = append(updatedRows, row)
		results = append(results, map[string]any{
			"assignment_id":     updated.ID,
			"requested_version": selection.ExpectedVersion,
			"status":            "succeeded",
			"row_version":       updated.Version,
			"assignment":        row,
		})
		succeeded++
	}
	return results, errorsOut, updatedRows, succeeded
}

func normalizeAssignmentActionRequest(action, assignmentID string) (string, string, error) {
	action = strings.TrimSpace(strings.ToLower(action))
	assignmentID = strings.TrimSpace(assignmentID)
	if assignmentID == "" {
		return "", "", requiredFieldDomainError("assignment_id", nil)
	}
	if action == "" {
		return "", "", requiredFieldDomainError("action", nil)
	}
	return action, assignmentID, nil
}

func queueActionExpectedVersion(current TranslationAssignment, body map[string]any) int64 {
	expectedVersion := queueExpectedVersion(body)
	if expectedVersion <= 0 {
		expectedVersion = current.Version
	}
	return expectedVersion
}

func (b *translationQueueBinding) executeAssignmentAction(
	adminCtx AdminContext,
	service *DefaultTranslationQueueService,
	current TranslationAssignment,
	actorID, assignmentID, action string,
	body map[string]any,
) (TranslationAssignment, error) {
	expectedVersion := queueActionExpectedVersion(current, body)
	switch action {
	case "claim":
		return service.Claim(adminCtx.Context, TranslationQueueClaimInput{
			AssignmentID:    assignmentID,
			ClaimerID:       actorID,
			ExpectedVersion: expectedVersion,
		})
	case "release":
		return service.Release(adminCtx.Context, TranslationQueueReleaseInput{
			AssignmentID:    assignmentID,
			ActorID:         actorID,
			ExpectedVersion: expectedVersion,
		})
	case "submit_review":
		return b.runSubmitReviewAction(adminCtx, service, current, expectedVersion, body)
	case "approve":
		return b.runApproveAction(adminCtx, service, current, expectedVersion, body)
	case "reject":
		return b.runRejectAction(adminCtx, service, current, expectedVersion, body)
	case "archive":
		return service.Archive(adminCtx.Context, TranslationQueueArchiveInput{
			AssignmentID:    assignmentID,
			ActorID:         actorID,
			ExpectedVersion: expectedVersion,
		})
	default:
		return TranslationAssignment{}, validationDomainError("unsupported assignment action", map[string]any{
			"field":  "action",
			"action": action,
		})
	}
}

func (b *translationQueueBinding) executeAssignmentBulkAction(
	adminCtx AdminContext,
	service *DefaultTranslationQueueService,
	current TranslationAssignment,
	actorID, action string,
	expectedVersion int64,
	body map[string]any,
) (TranslationAssignment, error) {
	switch action {
	case "assign":
		return service.Assign(adminCtx.Context, TranslationQueueAssignInput{
			AssignmentID:    current.ID,
			AssigneeID:      strings.TrimSpace(toString(body["assignee_id"])),
			AssignerID:      actorID,
			Priority:        queuePriority(body),
			DueDate:         queueDueDate(body),
			ExpectedVersion: expectedVersion,
		})
	case "release":
		return service.Release(adminCtx.Context, TranslationQueueReleaseInput{
			AssignmentID:    current.ID,
			ActorID:         actorID,
			ExpectedVersion: expectedVersion,
		})
	case "priority":
		priority := queuePriority(body)
		if !priority.IsValid() {
			return TranslationAssignment{}, validationDomainError("invalid priority", map[string]any{"field": "priority"})
		}
		current.Priority = priority
		updated, err := service.Repository.Update(adminCtx.Context, current, expectedVersion)
		if err != nil {
			return TranslationAssignment{}, err
		}
		service.recordTransition(adminCtx.Context, "priority_updated", actorID, updated)
		return updated, nil
	case "archive":
		return service.Archive(adminCtx.Context, TranslationQueueArchiveInput{
			AssignmentID:    current.ID,
			ActorID:         actorID,
			ExpectedVersion: expectedVersion,
		})
	default:
		return TranslationAssignment{}, validationDomainError("unsupported bulk assignment action", map[string]any{
			"field":  "action",
			"action": action,
		})
	}
}

func (b *translationQueueBinding) assignmentActionResponse(adminCtx AdminContext, updated TranslationAssignment, assignmentID, channel string, now time.Time) map[string]any {
	actorLabels := b.newAssignmentActorLabelResolver().labelsForAssignments(adminCtx.Context, []TranslationAssignment{updated})
	return map[string]any{
		"data": map[string]any{
			"assignment_id": assignmentID,
			"status":        normalizeTranslationQueueState(string(updated.Status)),
			"row_version":   updated.Version,
			"updated_at":    updated.UpdatedAt,
			"assignment":    b.assignmentContractRow(adminCtx.Context, updated, now, channel, actorLabels),
		},
		"meta": mergeTranslationChannelContract(map[string]any{
			"idempotency_hit": false,
		}, channel),
	}
}

func (b *translationQueueBinding) MyWork(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.queue.my_work",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, err
	}
	userID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	channel := translationChannelFromRequest(c, adminCtx, nil)
	page := clampInt(atoiDefault(c.Query(adminkeys.QueryPage), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query(adminkeys.QueryPerPage), 25), 1, 200)
	now := b.now().UTC()
	if userID == "" {
		return translationQueueEmptyMyWorkPayload(page, perPage, now), nil
	}
	filters := translationQueueMyWorkFilters(userID, c.Query("status"))
	assignments, total, err := repo.List(adminCtx.Context, ListOptions{
		Page:    page,
		PerPage: perPage,
		SortBy:  "due_date",
		Filters: filters,
	})
	if err != nil {
		return nil, err
	}
	rows := b.translationQueueAssignmentRows(adminCtx.Context, assignments, now, channel)
	summary, err := b.myWorkSummary(adminCtx.Context, repo, filters, now)
	if err != nil {
		return nil, err
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
		"channel":     channel,
	}, nil
}

func translationQueueEmptyMyWorkPayload(page, perPage int, now time.Time) map[string]any {
	return map[string]any{
		"scope":       "my_work",
		"user_id":     "",
		"summary":     translationQueueMyWorkSummary(nil, now),
		"assignments": []map[string]any{},
		"items":       []map[string]any{},
		"total":       0,
		"page":        page,
		"per_page":    perPage,
		"updated_at":  now,
	}
}

func translationQueueMyWorkFilters(userID, status string) map[string]any {
	filters := map[string]any{
		"assignee_id": strings.TrimSpace(userID),
	}
	if status = strings.TrimSpace(strings.ToLower(status)); status != "" {
		filters["status"] = status
	}
	return filters
}

func translationQueueMyWorkSummary(assignments []TranslationAssignment, now time.Time) map[string]int {
	summary := map[string]int{
		"total":                         0,
		translationQueueDueStateOverdue: 0,
		translationQueueDueStateSoon:    0,
		translationQueueDueStateOnTrack: 0,
		translationQueueDueStateNone:    0,
		"review":                        0,
	}
	for _, assignment := range assignments {
		dueState := translationQueueDueState(assignment.DueDate, now)
		summary[dueState]++
		summary["total"]++
		if assignment.Status == AssignmentStatusInReview {
			summary["review"]++
		}
	}
	return summary
}

func (b *translationQueueBinding) myWorkSummary(ctx context.Context, repo TranslationAssignmentRepository, filters map[string]any, now time.Time) (map[string]int, error) {
	if summaryStore, ok := repo.(TranslationAssignmentSummaryStore); ok && summaryStore != nil {
		summary, err := summaryStore.AssignmentMyWorkSummary(ctx, TranslationAssignmentMyWorkSummaryInput{
			Filters: primitives.CloneAnyMap(filters),
			Now:     now,
		})
		if err == nil {
			return summary, nil
		}
		if !errors.Is(err, ErrTranslationAssignmentQueryUnsupported) {
			return nil, err
		}
	}
	summaryAssignments, err := b.listAssignmentsForSummary(ctx, repo, "due_date", filters)
	if err != nil {
		return nil, err
	}
	return translationQueueMyWorkSummary(summaryAssignments, now), nil
}

func (b *translationQueueBinding) translationQueueAssignmentRows(ctx context.Context, assignments []TranslationAssignment, now time.Time, channel string) []map[string]any {
	actorLabels := b.newAssignmentActorLabelResolver().labelsForAssignments(ctx, assignments)
	rows := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		rows = append(rows, b.assignmentContractRow(ctx, assignment, now, channel, actorLabels))
	}
	return rows
}

func (b *translationQueueBinding) Queue(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.queue.list",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, err
	}
	page := clampInt(atoiDefault(c.Query(adminkeys.QueryPage), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query(adminkeys.QueryPerPage), 50), 1, 200)
	channel := translationChannelFromRequest(c, adminCtx, nil)
	now := b.now().UTC()

	filters := map[string]any{}
	if assigneeID := strings.TrimSpace(c.Query("assignee_id")); assigneeID != "" {
		filters["assignee_id"] = assigneeID
	}
	if status := strings.TrimSpace(strings.ToLower(c.Query("status"))); status != "" {
		filters["status"] = status
	}
	if reviewOnly := strings.TrimSpace(strings.ToLower(c.Query("review"))); reviewOnly == "1" || reviewOnly == "true" {
		filters["status"] = string(AssignmentStatusInReview)
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
	actorLabels := b.newAssignmentActorLabelResolver().labelsForAssignments(adminCtx.Context, assignments)
	rows := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		row := b.assignmentContractRow(adminCtx.Context, assignment, now, channel, actorLabels)
		rows = append(rows, row)
	}
	summary, err := b.queueSummary(adminCtx.Context, repo, filters, now)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"scope": "queue",
		"summary": map[string]any{
			"total":          summary.Total,
			"by_queue_state": summary.ByQueueState,
			"by_due_state":   summary.ByDueState,
		},
		"items":       rows,
		"assignments": rows,
		"total":       total,
		"page":        page,
		"per_page":    perPage,
		"updated_at":  now,
		"channel":     channel,
	}, nil
}

func (b *translationQueueBinding) queueSummary(ctx context.Context, repo TranslationAssignmentRepository, filters map[string]any, now time.Time) (TranslationAssignmentQueueSummary, error) {
	if summaryStore, ok := repo.(TranslationAssignmentSummaryStore); ok && summaryStore != nil {
		summary, err := summaryStore.AssignmentQueueSummary(ctx, TranslationAssignmentQueueSummaryInput{
			Filters: primitives.CloneAnyMap(filters),
			Now:     now,
		})
		if err == nil {
			return summary, nil
		}
		if !errors.Is(err, ErrTranslationAssignmentQueryUnsupported) {
			return TranslationAssignmentQueueSummary{}, err
		}
	}
	summaryAssignments, err := b.listAssignmentsForSummary(ctx, repo, "updated_at", filters)
	if err != nil {
		return TranslationAssignmentQueueSummary{}, err
	}
	byQueueState := map[string]int{}
	byDueState := map[string]int{}
	for _, assignment := range summaryAssignments {
		queueState := normalizeTranslationQueueState(string(assignment.Status))
		byQueueState[queueState]++
		dueState := translationQueueDueState(assignment.DueDate, now)
		byDueState[dueState]++
	}
	return TranslationAssignmentQueueSummary{
		Total:        len(summaryAssignments),
		ByQueueState: byQueueState,
		ByDueState:   byDueState,
	}, nil
}

func (b *translationQueueBinding) prepareAssignmentRequest(c router.Context) (AdminContext, TranslationAssignmentRepository, time.Time, error) {
	if b == nil || b.admin == nil {
		return AdminContext{}, nil, time.Time{}, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	setTranslationTraceHeaders(c, adminCtx.Context)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return AdminContext{}, nil, time.Time{}, err
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return AdminContext{}, nil, time.Time{}, err
	}
	return adminCtx, repo, b.now().UTC(), nil
}

func (b *translationQueueBinding) assignmentFilterFromRequest(adminCtx AdminContext, c router.Context) translationAssignmentListFilter {
	actorID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	return translationqueue.AssignmentFilterFromQuery(
		func(key string) string { return c.Query(key) },
		actorID,
		strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.TenantID, tenantIDFromContext(adminCtx.Context))),
		strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.OrgID, orgIDFromContext(adminCtx.Context))),
	)
}

func (b *translationQueueBinding) assignmentFilterFromSnapshotBody(adminCtx AdminContext, body map[string]any) translationAssignmentListFilter {
	actorID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	filters := extractMap(body["filters"])
	if len(filters) == 0 {
		filters = primitives.CloneAnyMap(body)
	}
	return translationqueue.AssignmentFilterFromQuery(
		func(key string) string {
			return translationQueueSnapshotFilterValue(filters, key)
		},
		actorID,
		strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.TenantID, tenantIDFromContext(adminCtx.Context))),
		strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.OrgID, orgIDFromContext(adminCtx.Context))),
	)
}

func translationQueueSnapshotFilterValue(filters map[string]any, key string) string {
	if len(filters) == 0 {
		return ""
	}
	candidates := []string{key}
	switch key {
	case "assignee_id":
		candidates = append(candidates, "assigneeId")
	case "reviewer_id":
		candidates = append(candidates, "reviewerId")
	case "due_state":
		candidates = append(candidates, "dueState")
	case "review_state":
		candidates = append(candidates, "reviewState")
	case "entity_type":
		candidates = append(candidates, "entityType", "content_type", "contentType", "type")
	case "title__ilike":
		candidates = append(candidates, "title__contains", "source_title__ilike", "source_title__contains", "titleContains")
	case "path__ilike":
		candidates = append(candidates, "path__contains", "source_path__ilike", "source_path__contains", "pathContains")
	case "family_id":
		candidates = append(candidates, "familyId")
	case "target_locale", "locale":
		candidates = append(candidates, "target_locale", "targetLocale")
	case "sort":
		candidates = append(candidates, "sort_by", "sortBy")
	case "sort_by":
		candidates = append(candidates, "sort")
	}
	for _, candidate := range candidates {
		if value := strings.TrimSpace(toString(filters[candidate])); value != "" {
			return value
		}
	}
	return ""
}

type translationAssignmentListFilter = translationqueue.AssignmentListFilter

func (b *translationQueueBinding) assignmentSnapshotSelections(ctx context.Context, repo TranslationAssignmentRepository, filter translationAssignmentListFilter, environment string, now time.Time) ([]translationQueueBulkActionSelection, int, error) {
	if queryStore, ok := repo.(TranslationAssignmentSnapshotQueryStore); ok && queryStore != nil {
		result, err := queryStore.ListAssignmentSnapshot(ctx, TranslationAssignmentSnapshotQueryInput{
			Filter:      filter,
			Environment: environment,
			Now:         now,
			Limit:       translationQueueBulkSnapshotMaxAssignments,
		})
		if err == nil {
			return translationQueueSnapshotSelectionsFromQuery(result.Selections), result.Total, nil
		}
		if errors.Is(err, ErrTranslationAssignmentFamilyBlockersUnavailable) {
			return nil, 0, validationDomainError("filter snapshot review state requires unavailable family blocker aggregates", map[string]any{
				"field":        "filters.review_state",
				"review_state": normalizeTranslationQueueReviewState(filter.ReviewState),
				"reason_code":  "snapshot_review_state_unavailable",
			})
		}
		if !errors.Is(err, ErrTranslationAssignmentQueryUnsupported) {
			return nil, 0, err
		}
		if strings.TrimSpace(filter.ReviewState) != "" {
			return nil, 0, unsupportedSnapshotFilterError(filter.ReviewState)
		}
		return nil, 0, validationDomainError("filter snapshot matching is not supported by the assignment repository", map[string]any{
			"field":       "filters",
			"reason_code": "snapshot_query_unsupported",
		})
	}
	return nil, 0, validationDomainError("filter snapshot matching is not supported by the assignment repository", map[string]any{
		"field":       "filters",
		"reason_code": "snapshot_query_unsupported",
	})
}

func unsupportedSnapshotFilterError(reviewState string) error {
	return validationDomainError("filter snapshot review state is not supported by the assignment repository", map[string]any{
		"field":        "filters.review_state",
		"review_state": normalizeTranslationQueueReviewState(reviewState),
		"reason_code":  "snapshot_review_state_unsupported",
	})
}

func (b *translationQueueBinding) ensureAssignmentStillMatchesSnapshot(ctx context.Context, assignment TranslationAssignment, snapshot translationQueueFilterSnapshot, channel string) error {
	if !matchesAssignmentListFilter(assignment, snapshot.Filter, snapshot.CreatedAt) {
		return validationDomainError("assignment no longer matches the filter snapshot", map[string]any{
			"assignment_id": assignment.ID,
			"snapshot_id":   snapshot.ID,
			"field":         "snapshot_id",
			"reason_code":   "snapshot_scope_changed",
		})
	}
	if strings.TrimSpace(snapshot.Filter.ReviewState) != "" {
		matched := b.applyReviewStateFilter(ctx, []TranslationAssignment{assignment}, snapshot.Filter.ReviewState, channel)
		if len(matched) == 0 {
			return validationDomainError("assignment no longer matches the filter snapshot review state", map[string]any{
				"assignment_id": assignment.ID,
				"snapshot_id":   snapshot.ID,
				"field":         "snapshot_id",
				"review_state":  normalizeTranslationQueueReviewState(snapshot.Filter.ReviewState),
				"reason_code":   "snapshot_review_state_changed",
			})
		}
	}
	return nil
}

func translationQueueSnapshotSelectionsFromQuery(items []TranslationAssignmentSnapshotSelection) []translationQueueBulkActionSelection {
	out := make([]translationQueueBulkActionSelection, 0, len(items))
	for idx, item := range items {
		position := item.OriginalPosition
		if position < 0 {
			position = idx
		}
		out = append(out, translationQueueBulkActionSelection{
			AssignmentID:     strings.TrimSpace(item.AssignmentID),
			ExpectedVersion:  item.ExpectedVersion,
			OriginalPosition: position,
		})
	}
	return out
}

func cloneTranslationQueueBulkSelections(items []translationQueueBulkActionSelection) []translationQueueBulkActionSelection {
	out := make([]translationQueueBulkActionSelection, len(items))
	copy(out, items)
	return out
}

func translationQueueSnapshotFilterPayload(filter translationAssignmentListFilter) map[string]any {
	payload := map[string]any{}
	if filter.Status != "" {
		payload["status"] = filter.Status
	}
	if filter.AssigneeID != "" {
		payload["assignee_id"] = filter.AssigneeID
	}
	if filter.ReviewerID != "" {
		payload["reviewer_id"] = filter.ReviewerID
	}
	if filter.DueState != "" {
		payload["due_state"] = filter.DueState
	}
	if filter.Locale != "" {
		payload["locale"] = filter.Locale
	}
	if filter.Priority != "" {
		payload["priority"] = filter.Priority
	}
	if filter.EntityType != "" {
		payload["entity_type"] = filter.EntityType
	}
	if filter.TitleContains != "" {
		payload["title__ilike"] = filter.TitleContains
	}
	if filter.PathContains != "" {
		payload["path__ilike"] = filter.PathContains
	}
	if filter.FamilyID != "" {
		payload["family_id"] = filter.FamilyID
	}
	if filter.ReviewState != "" {
		payload["review_state"] = filter.ReviewState
	}
	if filter.SortBy != "" {
		payload["sort"] = filter.SortBy
		if filter.SortDesc {
			payload["order"] = "desc"
		} else {
			payload["order"] = "asc"
		}
	}
	return payload
}

func translationQueueSnapshotFilterSummary(filter translationAssignmentListFilter) []string {
	summary := []string{}
	if filter.Status != "" {
		summary = append(summary, "Status: "+strings.ReplaceAll(filter.Status, ",", ", "))
	}
	if filter.AssigneeID != "" {
		summary = append(summary, "Assignee: "+filter.AssigneeID)
	}
	if filter.ReviewerID != "" {
		summary = append(summary, "Reviewer: "+filter.ReviewerID)
	}
	if filter.DueState != "" {
		summary = append(summary, "Due: "+strings.ReplaceAll(filter.DueState, ",", ", "))
	}
	if filter.Locale != "" {
		summary = append(summary, "Locale: "+strings.ReplaceAll(filter.Locale, ",", ", "))
	}
	if filter.Priority != "" {
		summary = append(summary, "Priority: "+strings.ReplaceAll(filter.Priority, ",", ", "))
	}
	if filter.EntityType != "" {
		summary = append(summary, "Type: "+strings.ReplaceAll(filter.EntityType, ",", ", "))
	}
	if filter.TitleContains != "" {
		summary = append(summary, "Title contains: "+filter.TitleContains)
	}
	if filter.PathContains != "" {
		summary = append(summary, "Path contains: "+filter.PathContains)
	}
	if filter.FamilyID != "" {
		summary = append(summary, "Family: "+filter.FamilyID)
	}
	if filter.ReviewState != "" {
		summary = append(summary, "Review: "+filter.ReviewState)
	}
	if filter.SortBy != "" {
		order := "ascending"
		if filter.SortDesc {
			order = "descending"
		}
		summary = append(summary, "Sort: "+filter.SortBy+" "+order)
	}
	if len(summary) == 0 {
		summary = append(summary, "All visible assignments")
	}
	return summary
}

func (s translationQueueFilterSnapshot) assignmentBulkSnapshotContract() map[string]any {
	return map[string]any{
		"selection_scope": "filter_snapshot",
		"snapshot_id":     s.ID,
		"requested":       len(s.Selections),
		"filters":         primitives.CloneAnyMap(s.FilterPayload),
		"filter_summary":  append([]string{}, s.FilterSummary...),
		"created_at":      s.CreatedAt,
		"expires_at":      s.ExpiresAt,
	}
}

func (b *translationQueueBinding) storeAssignmentBulkSnapshot(snapshot translationQueueFilterSnapshot) {
	b.snapshotMu.Lock()
	defer b.snapshotMu.Unlock()
	if b.snapshots == nil {
		b.snapshots = map[string]translationQueueFilterSnapshot{}
	}
	now := snapshot.CreatedAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	for id, existing := range b.snapshots {
		if !existing.ExpiresAt.IsZero() && !existing.ExpiresAt.After(now) {
			delete(b.snapshots, id)
		}
	}
	snapshot.Selections = cloneTranslationQueueBulkSelections(snapshot.Selections)
	b.snapshots[snapshot.ID] = snapshot
}

func (b *translationQueueBinding) lookupAssignmentBulkSnapshot(identity translationTransportIdentity, channel string, body map[string]any, now time.Time) (*translationQueueFilterSnapshot, error) {
	snapshotID := strings.TrimSpace(toString(body["snapshot_id"]))
	if snapshotID == "" {
		snapshotID = strings.TrimSpace(toString(extractMap(body["filter_snapshot"])["snapshot_id"]))
	}
	if snapshotID == "" {
		return nil, requiredFieldDomainError("snapshot_id", map[string]any{
			"field": "snapshot_id",
		})
	}
	b.snapshotMu.Lock()
	defer b.snapshotMu.Unlock()
	snapshot, ok := b.snapshots[snapshotID]
	if !ok {
		return nil, validationDomainError("filter snapshot is missing or expired", map[string]any{
			"field":       "snapshot_id",
			"snapshot_id": snapshotID,
		})
	}
	if !snapshot.ExpiresAt.IsZero() && !snapshot.ExpiresAt.After(now) {
		delete(b.snapshots, snapshotID)
		return nil, validationDomainError("filter snapshot is expired", map[string]any{
			"field":       "snapshot_id",
			"snapshot_id": snapshotID,
			"expires_at":  snapshot.ExpiresAt,
		})
	}
	if !strings.EqualFold(snapshot.ActorID, identity.ActorID) ||
		!strings.EqualFold(snapshot.TenantID, identity.TenantID) ||
		!strings.EqualFold(snapshot.OrgID, identity.OrgID) ||
		!strings.EqualFold(snapshot.Channel, channel) {
		return nil, NewDomainError(string(translationcore.ErrorPermissionDenied), "filter snapshot scope does not match the current request", map[string]any{
			"field":       "snapshot_id",
			"snapshot_id": snapshotID,
		})
	}
	snapshot.Selections = cloneTranslationQueueBulkSelections(snapshot.Selections)
	snapshot.FilterPayload = primitives.CloneAnyMap(snapshot.FilterPayload)
	snapshot.FilterSummary = append([]string{}, snapshot.FilterSummary...)
	return &snapshot, nil
}

func (b *translationQueueBinding) filterAssignments(ctx context.Context, assignments []TranslationAssignment, filter translationAssignmentListFilter, page, perPage int, environment string, now time.Time) ([]TranslationAssignment, int) {
	matched := b.matchAssignments(assignments, filter, now)
	if filter.ReviewState != "" {
		matched = b.applyReviewStateFilter(ctx, matched, filter.ReviewState, environment)
	}
	sortAssignments(matched, filter.SortBy, filter.SortDesc, now)
	total := len(matched)
	page, perPage = normalizeTranslationAssignmentPagination(page, perPage, total, 25)
	start := (page - 1) * perPage
	if start >= total {
		return []TranslationAssignment{}, total
	}
	end := min(start+perPage, total)
	return matched[start:end], total
}

func (b *translationQueueBinding) assignmentPage(ctx context.Context, repo TranslationAssignmentRepository, filter translationAssignmentListFilter, page, perPage int, environment string, now time.Time) ([]TranslationAssignment, int, bool, error) {
	if queryStore, ok := repo.(TranslationAssignmentPageQueryStore); ok && queryStore != nil {
		result, supported, err := listAssignmentPageFromQueryStore(ctx, queryStore, filter, page, perPage, environment, now)
		if err != nil {
			return nil, 0, false, err
		}
		if supported {
			return result.Items, result.Total, true, nil
		}
	}
	if translationQueueRequiresOptimizedPageQuery(filter) {
		return nil, 0, false, validationDomainError("assignment repository cannot evaluate the requested queue predicates", map[string]any{
			"field":       "filters",
			"reason_code": "queue_predicate_query_unsupported",
		})
	}
	allAssignments, err := b.listAssignmentsForSummary(ctx, repo, filter.SortBy, nil)
	if err != nil {
		return nil, 0, false, err
	}
	assignments, total := b.filterAssignments(ctx, allAssignments, filter, page, perPage, environment, now)
	return assignments, total, false, nil
}

func translationQueueRequiresOptimizedPageQuery(filter translationAssignmentListFilter) bool {
	return strings.TrimSpace(filter.EntityType) != "" ||
		strings.TrimSpace(filter.TitleContains) != "" ||
		strings.TrimSpace(filter.PathContains) != ""
}

func listAssignmentPageFromQueryStore(ctx context.Context, queryStore TranslationAssignmentPageQueryStore, filter translationAssignmentListFilter, page, perPage int, environment string, now time.Time) (TranslationAssignmentPageQueryResult, bool, error) {
	result, err := queryStore.ListAssignmentPage(ctx, TranslationAssignmentPageQueryInput{
		Filter:      filter,
		Page:        page,
		PerPage:     perPage,
		Environment: environment,
		Now:         now,
	})
	if errors.Is(err, ErrTranslationAssignmentQueryUnsupported) {
		return TranslationAssignmentPageQueryResult{}, false, nil
	}
	if err != nil {
		return TranslationAssignmentPageQueryResult{}, false, err
	}

	normalizedPage, normalizedPerPage := normalizeTranslationAssignmentPagination(page, perPage, result.Total, 50)
	if result.Total <= 0 || (normalizedPage == page && normalizedPerPage == perPage) {
		return result, true, nil
	}

	result, err = queryStore.ListAssignmentPage(ctx, TranslationAssignmentPageQueryInput{
		Filter:      filter,
		Page:        normalizedPage,
		PerPage:     normalizedPerPage,
		Environment: environment,
		Now:         now,
	})
	if err != nil {
		return TranslationAssignmentPageQueryResult{}, false, err
	}
	return result, true, nil
}

func (b *translationQueueBinding) matchAssignments(assignments []TranslationAssignment, filter translationAssignmentListFilter, now time.Time) []TranslationAssignment {
	matched := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if !matchesAssignmentListFilter(assignment, filter, now) {
			continue
		}
		matched = append(matched, assignment)
	}
	return matched
}

func (b *translationQueueBinding) applyReviewStateFilter(ctx context.Context, assignments []TranslationAssignment, reviewState, environment string) []TranslationAssignment {
	reviewState = normalizeTranslationQueueReviewState(reviewState)
	if reviewState == "" || len(assignments) == 0 {
		return assignments
	}
	switch reviewState {
	case translationQueueReviewStateQABlocked:
		blocked := b.reviewBlockedAssignments(ctx, assignments, environment)
		if len(blocked) == 0 {
			return []TranslationAssignment{}
		}
		filtered := make([]TranslationAssignment, 0, len(assignments))
		for _, assignment := range assignments {
			if _, ok := blocked[strings.TrimSpace(assignment.ID)]; ok {
				filtered = append(filtered, assignment)
			}
		}
		return filtered
	default:
		return assignments
	}
}

func matchesAssignmentListFilter(assignment TranslationAssignment, filter translationAssignmentListFilter, now time.Time) bool {
	if filter.AssigneeID == translationQueueMissingActorFilterToken || filter.ReviewerID == translationQueueMissingActorFilterToken {
		return false
	}
	if !translationQueueListFilterMatches(filter.Status, string(assignment.Status), normalizeTranslationQueueState) {
		return false
	}
	if filter.AssigneeID != "" && !strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), filter.AssigneeID) {
		return false
	}
	if filter.ReviewerID != "" && !strings.EqualFold(strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID)), filter.ReviewerID) {
		return false
	}
	if !translationQueueListFilterMatches(filter.DueState, translationQueueDueState(assignment.DueDate, now), normalizeTranslationQueueDueState) {
		return false
	}
	if !translationQueueListFilterMatches(filter.Locale, assignment.TargetLocale, normalizeTranslationQueueLocaleFilterValue) {
		return false
	}
	if !translationQueueListFilterMatches(filter.Priority, string(assignment.Priority), normalizeTranslationQueuePriorityFilterValue) {
		return false
	}
	if !translationQueueListFilterMatches(filter.EntityType, assignment.EntityType, normalizeTranslationQueueEntityTypeFilterValue) {
		return false
	}
	if !translationQueueContainsFold(assignment.SourceTitle, filter.TitleContains) {
		return false
	}
	if !translationQueueContainsFold(assignment.SourcePath, filter.PathContains) {
		return false
	}
	return translationQueueAssignmentScopeMatches(assignment, filter)
}

func translationQueueContainsFold(candidate, predicate string) bool {
	predicate = strings.TrimSpace(strings.ToLower(predicate))
	return predicate == "" || strings.Contains(strings.ToLower(candidate), predicate)
}

func translationQueueAssignmentScopeMatches(assignment TranslationAssignment, filter translationAssignmentListFilter) bool {
	if filter.FamilyID != "" && !strings.EqualFold(strings.TrimSpace(assignment.FamilyID), strings.TrimSpace(filter.FamilyID)) {
		return false
	}
	if filter.TenantID != "" && !strings.EqualFold(strings.TrimSpace(assignment.TenantID), filter.TenantID) {
		return false
	}
	return filter.OrgID == "" || strings.EqualFold(strings.TrimSpace(assignment.OrgID), filter.OrgID)
}

func translationQueueListFilterMatches(filterValue, candidate string, normalize func(string) string) bool {
	return translationqueue.ListFilterMatches(filterValue, candidate, normalize)
}

func normalizeTranslationQueuePriorityFilterValue(value string) string {
	return translationqueue.NormalizePriorityFilterValue(value)
}

func normalizeTranslationQueueLocaleFilterValue(value string) string {
	return translationqueue.NormalizeLocaleFilterValue(value)
}

func normalizeTranslationQueueEntityTypeFilterValue(value string) string {
	return translationqueue.NormalizeEntityTypeFilterValue(value)
}

func normalizeTranslationQueueReviewState(value string) string {
	return translationqueue.NormalizeReviewState(value)
}

func sortAssignments(assignments []TranslationAssignment, sortBy string, sortDesc bool, now time.Time) {
	sortBy = strings.TrimSpace(strings.ToLower(sortBy))
	if sortBy == "" {
		sortBy = "updated_at"
		sortDesc = true
	}
	sort.SliceStable(assignments, func(i, j int) bool {
		left := assignments[i]
		right := assignments[j]
		var comparison int
		switch sortBy {
		case "status":
			comparison = strings.Compare(normalizeTranslationQueueState(string(left.Status)), normalizeTranslationQueueState(string(right.Status)))
		case "assignee_id":
			comparison = strings.Compare(strings.ToLower(strings.TrimSpace(left.AssigneeID)), strings.ToLower(strings.TrimSpace(right.AssigneeID)))
		case "reviewer_id":
			comparison = strings.Compare(
				strings.ToLower(strings.TrimSpace(firstNonEmpty(left.ReviewerID, left.LastReviewerID))),
				strings.ToLower(strings.TrimSpace(firstNonEmpty(right.ReviewerID, right.LastReviewerID))),
			)
		case "locale", "target_locale":
			comparison = strings.Compare(strings.ToLower(strings.TrimSpace(left.TargetLocale)), strings.ToLower(strings.TrimSpace(right.TargetLocale)))
		case "priority":
			comparison = compareTranslationQueuePriority(left.Priority, right.Priority)
		case "due_state":
			comparison = compareTranslationQueueDueState(translationQueueDueState(left.DueDate, now), translationQueueDueState(right.DueDate, now))
		case "due_date":
			comparison = compareTimePtr(left.DueDate, right.DueDate)
		case "created_at":
			comparison = compareTime(left.CreatedAt, right.CreatedAt)
		default:
			comparison = compareTime(left.UpdatedAt, right.UpdatedAt)
		}
		if comparison == 0 {
			return strings.ToLower(strings.TrimSpace(left.ID)) < strings.ToLower(strings.TrimSpace(right.ID))
		}
		if sortDesc {
			return comparison > 0
		}
		return comparison < 0
	})
}

func compareTimePtr(left, right *time.Time) int {
	switch {
	case left == nil && right == nil:
		return 0
	case left == nil:
		return 1
	case right == nil:
		return -1
	default:
		return compareTime(*left, *right)
	}
}

func compareTime(left, right time.Time) int {
	switch {
	case left.Equal(right):
		return 0
	case left.Before(right):
		return -1
	default:
		return 1
	}
}

func compareTranslationQueuePriority(left, right Priority) int {
	return compareTranslationQueueSortRank(
		translationQueuePriorityRank(string(left)),
		translationQueuePriorityRank(string(right)),
	)
}

func compareTranslationQueueDueState(left, right string) int {
	return compareTranslationQueueSortRank(
		translationQueueDueStateRank(left),
		translationQueueDueStateRank(right),
	)
}

func compareTranslationQueueSortRank(left, right int) int {
	switch {
	case left == right:
		return 0
	case left < right:
		return -1
	default:
		return 1
	}
}

func translationQueuePriorityRank(value string) int {
	if rank, ok := translationQueuePrioritySortRank[strings.TrimSpace(strings.ToLower(value))]; ok {
		return rank
	}
	return -1
}

func translationQueueDueStateRank(value string) int {
	if rank, ok := translationQueueDueStateSortRank[normalizeTranslationQueueDueState(value)]; ok {
		return rank
	}
	return -1
}

func (b *translationQueueBinding) ensureAssignmentScope(identity translationTransportIdentity, assignment TranslationAssignment) error {
	if identity.TenantID != "" && assignment.TenantID != "" && !strings.EqualFold(identity.TenantID, assignment.TenantID) {
		return NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment scope does not match current tenant", map[string]any{
			"assignment_id":  assignment.ID,
			ScopeTenantIDKey: assignment.TenantID,
		})
	}
	if identity.OrgID != "" && assignment.OrgID != "" && !strings.EqualFold(identity.OrgID, assignment.OrgID) {
		return NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment scope does not match current organization", map[string]any{
			"assignment_id": assignment.ID,
			ScopeOrgIDKey:   assignment.OrgID,
		})
	}
	return nil
}

func (b *translationQueueBinding) requireAssignmentActionPermission(adminCtx AdminContext, action string, assignment TranslationAssignment) error {
	switch action {
	case "claim":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsClaim, "translations"); err != nil {
			return err
		}
		return validateClaimAssignmentPermission(adminCtx, assignment)
	case "release":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsAssign, "translations"); err != nil {
			return err
		}
		return validateReleaseAssignmentPermission(assignment)
	case "submit_review":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsEdit, "translations"); err != nil {
			return err
		}
		return validateSubmitReviewAssignmentPermission(assignment)
	case "approve", "reject":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsApprove, "translations"); err != nil {
			return err
		}
		return validateReviewAssignmentPermission(adminCtx, assignment)
	case "archive":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsManage, "translations"); err != nil {
			return err
		}
		return validateArchiveAssignmentPermission(assignment)
	default:
		return validationDomainError("unsupported assignment action", map[string]any{
			"field":  "action",
			"action": action,
		})
	}
}

func (b *translationQueueBinding) requireAssignmentBulkActionPermission(adminCtx AdminContext, action string, assignment TranslationAssignment) error {
	switch action {
	case "assign":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsAssign, "translations"); err != nil {
			return err
		}
		if assignment.Status == AssignmentStatusOpen || assignment.Status == AssignmentStatusAssigned || assignment.Status == AssignmentStatusChangesRequested {
			return nil
		}
		return invalidQueueTransitionError(assignment.Status, "assign", assignment)
	case "release":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsAssign, "translations"); err != nil {
			return err
		}
		return validateReleaseAssignmentPermission(assignment)
	case "priority":
		return b.admin.requirePermission(adminCtx, PermAdminTranslationsManage, "translations")
	case "archive":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsManage, "translations"); err != nil {
			return err
		}
		return validateArchiveAssignmentPermission(assignment)
	default:
		return validationDomainError("unsupported bulk assignment action", map[string]any{
			"field":  "action",
			"action": action,
		})
	}
}

func normalizeTranslationQueueBulkAction(action string) string {
	switch strings.TrimSpace(strings.ToLower(action)) {
	case "bulk_assign", "assign":
		return "assign"
	case "bulk_release", "release":
		return "release"
	case "bulk_priority", "priority", "set_priority":
		return "priority"
	case "bulk_archive", "archive":
		return "archive"
	default:
		return strings.TrimSpace(strings.ToLower(action))
	}
}

func translationQueueBulkActionSupported(action string) bool {
	switch normalizeTranslationQueueBulkAction(action) {
	case "assign", "release", "priority", "archive":
		return true
	default:
		return false
	}
}

func normalizeTranslationQueueBulkSelectionScope(body map[string]any) string {
	scope := strings.TrimSpace(strings.ToLower(toString(body["selection_scope"])))
	if scope == "" {
		scope = strings.TrimSpace(strings.ToLower(toString(body["scope"])))
	}
	switch scope {
	case "", "current_page", "page":
		if strings.TrimSpace(toString(body["snapshot_id"])) != "" {
			return "filter_snapshot"
		}
		return "current_page"
	case "filter_snapshot", "snapshot", "all_matching_filter", "all_matching":
		return "filter_snapshot"
	default:
		return scope
	}
}

func translationQueueBulkActionSelections(body map[string]any) ([]translationQueueBulkActionSelection, error) {
	raw := body["assignments"]
	if raw == nil {
		raw = body["selected_assignments"]
	}
	items, ok := raw.([]any)
	if !ok || len(items) == 0 {
		return nil, requiredFieldDomainError("assignments", map[string]any{
			"expected": "array of {assignment_id, expected_version}",
		})
	}
	if len(items) > 200 {
		return nil, validationDomainError("bulk assignment actions support current-page selections only", map[string]any{
			"field":     "assignments",
			"max_items": 200,
		})
	}
	selections := make([]translationQueueBulkActionSelection, 0, len(items))
	seen := map[string]struct{}{}
	for idx, item := range items {
		record, ok := item.(map[string]any)
		if !ok {
			return nil, validationDomainError("assignment selection must be an object", map[string]any{
				"field": "assignments",
				"index": idx,
			})
		}
		selection := translationQueueBulkActionSelection{
			AssignmentID:     strings.TrimSpace(toString(record["assignment_id"])),
			ExpectedVersion:  queueExpectedVersion(record),
			OriginalPosition: idx,
		}
		if selection.AssignmentID == "" {
			return nil, requiredFieldDomainError("assignment_id", map[string]any{
				"field": "assignments.assignment_id",
				"index": idx,
			})
		}
		if selection.ExpectedVersion <= 0 {
			return nil, validationDomainError("expected_version must be > 0", map[string]any{
				"field":         "assignments.expected_version",
				"index":         idx,
				"assignment_id": selection.AssignmentID,
			})
		}
		if _, ok := seen[selection.AssignmentID]; ok {
			continue
		}
		seen[selection.AssignmentID] = struct{}{}
		selections = append(selections, selection)
	}
	return selections, nil
}

func translationQueueBulkActionError(selection translationQueueBulkActionSelection, err error) map[string]any {
	if mapped, _, ok := mapTranslationQueueErrors(err); ok {
		err = mapped
	}
	errorBody := map[string]any{
		"message": err.Error(),
	}
	var richErr *goerrors.Error
	if errors.As(err, &richErr) {
		if richErr.TextCode != "" {
			errorBody["code"] = richErr.TextCode
		}
		if len(richErr.Metadata) > 0 {
			errorBody["metadata"] = primitives.CloneAnyMap(richErr.Metadata)
		}
	}
	return map[string]any{
		"assignment_id":     selection.AssignmentID,
		"requested_version": selection.ExpectedVersion,
		"index":             selection.OriginalPosition,
		"error":             errorBody,
	}
}

func validateClaimAssignmentPermission(adminCtx AdminContext, assignment TranslationAssignment) error {
	actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
	switch assignment.Status {
	case AssignmentStatusOpen:
		if assignment.AssignmentType == AssignmentTypeOpenPool {
			return nil
		}
	case AssignmentStatusAssigned, AssignmentStatusChangesRequested:
		if actorID != "" && strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), actorID) {
			return nil
		}
		return NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment is assigned to a different translator", map[string]any{
			"assignment_id":        assignment.ID,
			"assignee_id":          actorID,
			"expected_assignee_id": assignment.AssigneeID,
			"status":               assignment.Status,
		})
	}
	return NewDomainError(string(translationcore.ErrorInvalidStatus), "assignment must be open pool or already assigned to you before it can be claimed", map[string]any{
		"assignment_id": assignment.ID,
		"status":        assignment.Status,
	})
}

func validateReleaseAssignmentPermission(assignment TranslationAssignment) error {
	if assignment.Status == AssignmentStatusAssigned || assignment.Status == AssignmentStatusInProgress || assignment.Status == AssignmentStatusChangesRequested {
		return nil
	}
	return NewDomainError(string(translationcore.ErrorInvalidStatus), "assignment must be assigned or in progress before it can be released", map[string]any{
		"assignment_id": assignment.ID,
		"status":        assignment.Status,
	})
}

func validateSubmitReviewAssignmentPermission(assignment TranslationAssignment) error {
	if assignment.Status == AssignmentStatusInProgress {
		return nil
	}
	return NewDomainError(string(translationcore.ErrorInvalidStatus), "assignment must be in progress before it can be submitted", map[string]any{
		"assignment_id": assignment.ID,
		"status":        assignment.Status,
	})
}

func validateReviewAssignmentPermission(adminCtx AdminContext, assignment TranslationAssignment) error {
	if assignment.Status != AssignmentStatusInReview {
		return NewDomainError(string(translationcore.ErrorInvalidStatus), "assignment must be in review before review actions can run", map[string]any{
			"assignment_id": assignment.ID,
			"status":        assignment.Status,
		})
	}
	actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
	expectedReviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
	if expectedReviewerID == "" || actorID == "" || strings.EqualFold(expectedReviewerID, actorID) {
		return nil
	}
	return NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment is assigned to a different reviewer", map[string]any{
		"assignment_id":        assignment.ID,
		"reviewer_id":          actorID,
		"expected_reviewer_id": expectedReviewerID,
	})
}

func validateArchiveAssignmentPermission(assignment TranslationAssignment) error {
	if assignment.Status != AssignmentStatusArchived {
		return nil
	}
	return NewDomainError(string(translationcore.ErrorInvalidStatus), "archived assignments cannot be archived again", map[string]any{
		"assignment_id": assignment.ID,
		"status":        assignment.Status,
	})
}

func (b *translationQueueBinding) lookupActionReplay(actorID, assignmentID, action, idempotencyKey string, payload map[string]any) (map[string]any, bool, error) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if b == nil || idempotencyKey == "" {
		return nil, false, nil
	}
	recordKey := b.actionReplayKey(actorID, assignmentID, action, idempotencyKey)
	payloadHash := actionReplayPayloadHash(payload)
	now := b.now().UTC()

	b.idempotencyMu.Lock()
	defer b.idempotencyMu.Unlock()
	record, ok := b.idempotency[recordKey]
	if !ok {
		return nil, false, nil
	}
	if now.Sub(record.StoredAt) > 24*time.Hour {
		delete(b.idempotency, recordKey)
		return nil, false, nil
	}
	if record.PayloadHash != payloadHash {
		return nil, false, NewDomainError(string(translationcore.ErrorVersionConflict), "idempotency key was already used with a different assignment action payload", map[string]any{
			"assignment_id":   assignmentID,
			"action":          action,
			"idempotency_key": idempotencyKey,
		})
	}
	return primitives.CloneAnyMap(record.Response), true, nil
}

func (b *translationQueueBinding) storeActionReplay(actorID, assignmentID, action, idempotencyKey string, payload map[string]any, response map[string]any) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if b == nil || idempotencyKey == "" {
		return
	}
	b.idempotencyMu.Lock()
	defer b.idempotencyMu.Unlock()
	b.idempotency[b.actionReplayKey(actorID, assignmentID, action, idempotencyKey)] = translationQueueActionReplay{
		PayloadHash: actionReplayPayloadHash(payload),
		Response:    primitives.CloneAnyMap(response),
		StoredAt:    b.now().UTC(),
	}
}

func (b *translationQueueBinding) actionReplayKey(actorID, assignmentID, action, idempotencyKey string) string {
	return strings.Join([]string{
		strings.TrimSpace(actorID),
		strings.TrimSpace(assignmentID),
		strings.TrimSpace(strings.ToLower(action)),
		strings.TrimSpace(idempotencyKey),
	}, "::")
}

func actionReplayPayloadHash(payload map[string]any) string {
	if len(payload) == 0 {
		return ""
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
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
	seen := b.collectEntityTypeOptions(adminCtx)
	options := make([]map[string]any, 0, len(seen))
	for _, option := range seen {
		if !translationQueueOptionMatchesSearch(option, search) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return translationQueuePaginatedOptions(c, options), nil
}

func (b *translationQueueBinding) collectEntityTypeOptions(adminCtx AdminContext) map[string]map[string]any {
	seen := b.collectEntityTypeOptionsFromRegistry()
	b.collectEntityTypeOptionsFromAssignments(adminCtx, seen)
	return seen
}

func (b *translationQueueBinding) collectEntityTypeOptionsFromRegistry() map[string]map[string]any {
	seen := map[string]map[string]any{}
	if b == nil || b.admin == nil || b.admin.registry == nil {
		return seen
	}
	for panelName, panel := range b.admin.registry.Panels() {
		if panel == nil || !panelSupportsTranslationQueueTab(panelName, panel) {
			continue
		}
		addTranslationQueueEntityTypeOption(seen, panelName)
	}
	return seen
}

func (b *translationQueueBinding) collectEntityTypeOptionsFromAssignments(adminCtx AdminContext, seen map[string]map[string]any) {
	repo, err := b.assignmentRepository()
	if err != nil || repo == nil {
		return
	}
	if store, ok := repo.(TranslationAssignmentOptionStore); ok && store != nil {
		entityTypes, listErr := store.DistinctAssignmentEntityTypes(adminCtx.Context)
		if listErr != nil {
			return
		}
		for _, entityType := range entityTypes {
			addTranslationQueueEntityTypeOption(seen, entityType)
		}
		return
	}
	assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", nil)
	if listErr != nil {
		return
	}
	for _, assignment := range assignments {
		addTranslationQueueEntityTypeOption(seen, assignment.EntityType)
	}
}

func addTranslationQueueEntityTypeOption(seen map[string]map[string]any, raw string) {
	entityType := normalizeTranslationQueueEntityType(raw)
	if entityType == "" {
		return
	}
	if _, ok := seen[entityType]; ok {
		return
	}
	seen[entityType] = map[string]any{
		"value": entityType,
		"label": translationQueueEntityTypeLabel(entityType),
	}
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

	if selected := strings.TrimSpace(c.Query("source_record_id")); selected != "" {
		return selectedSourceRecordOptions(adminCtx, panel, panelName, selected), nil
	}

	search := translationQueueOptionsSearch(c)
	perPage := clampInt(atoiDefault(c.Query(adminkeys.QueryPerPage), 25), 1, 200)
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

func selectedSourceRecordOptions(adminCtx AdminContext, panel *Panel, panelName, selected string) []map[string]any {
	options := make([]map[string]any, 0, 1)
	for id := range strings.SplitSeq(selected, ",") {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		record, err := panel.Get(adminCtx, id)
		if err != nil || len(record) == 0 {
			continue
		}
		option := translationQueueSourceRecordOption(record, panelName)
		if option == nil {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options
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
	addTranslationLocale(localeSet, b.admin.config.DefaultLocale)
	sourceRecord := b.collectLocaleOptionsSourceRecord(adminCtx, entityType, sourceRecordID, localeSet)
	b.collectAssignmentLocales(adminCtx.Context, entityType, sourceRecordID, localeSet)
	collectReadinessRequiredLocales(localeSet, sourceRecord)
	normalizeLocaleSet(localeSet, excludeLocale)

	if selected := translationQueueOptionsSelected(c, "locale", "target_locale"); selected != "" {
		options := selectedTranslationQueueLocaleOptions(selected)
		sortTranslationQueueOptions(options)
		return options, nil
	}

	search := strings.ToLower(strings.TrimSpace(translationQueueOptionsSearch(c)))
	options := translationQueueLocaleOptions(localeSet, search)
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
	selected := translationQueueOptionsSelected(c, "family_id")
	selectedValues := translationQueueSelectedValues(selected)
	page, perPage := translationQueueOptionPagination(c)

	optionsByValue := map[string]map[string]any{}
	if selected != "" {
		b.collectSourceTranslationGroup(adminCtx, entityType, sourceRecordID, optionsByValue)
	}
	if b.collectBoundedAssignmentTranslationGroups(adminCtx.Context, entityType, sourceRecordID, search, selectedValues, page, perPage, optionsByValue) {
		if selected != "" {
			return selectedTranslationGroupOptions(selected, optionsByValue), nil
		}
		options := translationQueueOptionsFromMap(optionsByValue)
		sortTranslationQueueOptions(options)
		if len(options) > perPage {
			options = options[:perPage]
		}
		return options, nil
	}

	b.collectAssignmentTranslationGroups(adminCtx.Context, entityType, sourceRecordID, optionsByValue)
	if selected != "" {
		return selectedTranslationGroupOptions(selected, optionsByValue), nil
	}

	options := make([]map[string]any, 0, len(optionsByValue))
	for _, option := range optionsByValue {
		if !translationQueueOptionMatchesSearch(option, search) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return translationQueuePaginatedOptions(c, options), nil
}

func addTranslationLocale(localeSet map[string]struct{}, locale string) {
	if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
		localeSet[normalized] = struct{}{}
	}
}

func (b *translationQueueBinding) collectLocaleOptionsSourceRecord(adminCtx AdminContext, entityType, sourceRecordID string, localeSet map[string]struct{}) map[string]any {
	if entityType == "" || sourceRecordID == "" {
		return nil
	}
	panel, panelName, ok := b.panelForEntityType(entityType, adminCtx.Environment)
	if !ok || panel == nil {
		return nil
	}
	record, err := panel.Get(adminCtx, sourceRecordID)
	if err != nil || len(record) == 0 {
		return nil
	}
	for _, locale := range translationReadinessAvailableLocales(record) {
		addTranslationLocale(localeSet, locale)
	}
	for _, locale := range []string{
		toString(record["locale"]),
		toString(record["source_locale"]),
		toString(record["target_locale"]),
		toString(record["requested_locale"]),
		toString(record["resolved_locale"]),
	} {
		addTranslationLocale(localeSet, locale)
	}
	b.collectPolicyLocales(adminCtx, panel, panelName, record, localeSet)
	return record
}

func (b *translationQueueBinding) collectPolicyLocales(adminCtx AdminContext, panel *Panel, panelName string, record map[string]any, localeSet map[string]struct{}) {
	policy := b.translationPolicyForPanel(panel)
	if policy == nil {
		return
	}
	requiredLocales, _, resolved, _ := resolveReadinessRequirements(
		adminCtx.Context,
		policy,
		panelName,
		record,
		map[string]any{"channel": adminCtx.Environment},
	)
	if !resolved {
		return
	}
	for _, locale := range requiredLocales {
		addTranslationLocale(localeSet, locale)
	}
}

func (b *translationQueueBinding) collectAssignmentLocales(ctx context.Context, entityType, sourceRecordID string, localeSet map[string]struct{}) {
	repo, err := b.assignmentRepository()
	if err != nil || repo == nil {
		return
	}
	if store, ok := repo.(TranslationAssignmentOptionStore); ok && store != nil {
		locales, listErr := store.DistinctAssignmentLocales(ctx, translationQueueSummaryFilters(entityType, sourceRecordID))
		if listErr != nil {
			return
		}
		for _, locale := range locales {
			addTranslationLocale(localeSet, locale)
		}
		return
	}
	assignments, err := b.listAssignmentsForSummary(ctx, repo, "updated_at", translationQueueSummaryFilters(entityType, sourceRecordID))
	if err != nil {
		return
	}
	for _, assignment := range assignments {
		addTranslationLocale(localeSet, assignment.SourceLocale)
		addTranslationLocale(localeSet, assignment.TargetLocale)
	}
}

func collectReadinessRequiredLocales(localeSet map[string]struct{}, sourceRecord map[string]any) {
	if sourceRecord == nil {
		return
	}
	readiness := extractMap(sourceRecord["translation_readiness"])
	for _, locale := range toStringSlice(readiness["required_locales"]) {
		addTranslationLocale(localeSet, locale)
	}
}

func normalizeLocaleSet(localeSet map[string]struct{}, excludeLocale string) {
	delete(localeSet, "")
	if excludeLocale != "" {
		delete(localeSet, excludeLocale)
	}
}

func translationQueueLocaleOptions(localeSet map[string]struct{}, search string) []map[string]any {
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
	return options
}

func selectedTranslationQueueLocaleOptions(selected string) []map[string]any {
	options := []map[string]any{}
	seen := map[string]struct{}{}
	for locale := range strings.SplitSeq(selected, ",") {
		locale = strings.TrimSpace(strings.ToLower(locale))
		if locale == "" {
			continue
		}
		if _, exists := seen[locale]; exists {
			continue
		}
		seen[locale] = struct{}{}
		options = append(options, map[string]any{
			"value": locale,
			"label": strings.ToUpper(locale),
		})
	}
	return options
}

func translationQueueAppendDescribedOption(optionsByValue map[string]map[string]any, value, label, description string) {
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

func (b *translationQueueBinding) collectSourceTranslationGroup(adminCtx AdminContext, entityType, sourceRecordID string, optionsByValue map[string]map[string]any) {
	if entityType == "" || sourceRecordID == "" {
		return
	}
	panel, panelName, ok := b.panelForEntityType(entityType, adminCtx.Environment)
	if !ok || panel == nil {
		return
	}
	record, err := panel.Get(adminCtx, sourceRecordID)
	if err != nil || len(record) == 0 {
		return
	}
	groupID := strings.TrimSpace(translationFamilyIDFromRecord(record))
	if groupID == "" {
		groupID = strings.TrimSpace(toString(record["family_id"]))
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
	translationQueueAppendDescribedOption(optionsByValue, groupID, label, description)
}

func (b *translationQueueBinding) collectAssignmentTranslationGroups(ctx context.Context, entityType, sourceRecordID string, optionsByValue map[string]map[string]any) {
	repo, err := b.assignmentRepository()
	if err != nil || repo == nil {
		return
	}
	if store, ok := repo.(TranslationAssignmentOptionStore); ok && store != nil {
		options, listErr := store.DistinctAssignmentTranslationGroups(ctx, translationQueueSummaryFilters(entityType, sourceRecordID))
		if listErr != nil {
			return
		}
		for _, option := range options {
			description := strings.TrimSpace(primitives.FirstNonEmptyRaw(
				option.SourcePath,
				option.EntityType,
			))
			label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
				option.SourceTitle,
				option.FamilyID,
			))
			translationQueueAppendDescribedOption(optionsByValue, option.FamilyID, label, description)
		}
		return
	}
	assignments, err := b.listAssignmentsForSummary(ctx, repo, "updated_at", translationQueueSummaryFilters(entityType, sourceRecordID))
	if err != nil {
		return
	}
	for _, assignment := range assignments {
		description := strings.TrimSpace(primitives.FirstNonEmptyRaw(
			assignment.SourcePath,
			assignment.EntityType,
		))
		label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
			assignment.SourceTitle,
			assignment.FamilyID,
		))
		translationQueueAppendDescribedOption(optionsByValue, assignment.FamilyID, label, description)
	}
}

func (b *translationQueueBinding) collectBoundedAssignmentTranslationGroups(ctx context.Context, entityType, sourceRecordID, search string, selectedValues []string, page, perPage int, optionsByValue map[string]map[string]any) bool {
	repo, err := b.assignmentRepository()
	if err != nil || repo == nil {
		return false
	}
	store, ok := repo.(TranslationAssignmentFamilyOptionQueryStore)
	if !ok || store == nil {
		return false
	}
	now := time.Time{}
	if b != nil && b.now != nil {
		now = b.now()
	}
	result, listErr := store.ListAssignmentFamilyOptions(ctx, TranslationAssignmentFamilyOptionQueryInput{
		Filters:           translationQueueSummaryFilters(entityType, sourceRecordID),
		Search:            search,
		SelectedFamilyIDs: selectedValues,
		Page:              page,
		PerPage:           perPage,
		Now:               now,
	})
	if listErr != nil {
		return true
	}
	for _, option := range result.Options {
		description := strings.TrimSpace(primitives.FirstNonEmptyRaw(
			option.SourcePath,
			option.EntityType,
		))
		label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
			option.SourceTitle,
			option.FamilyID,
		))
		translationQueueAppendDescribedOption(optionsByValue, option.FamilyID, label, description)
	}
	return true
}

func translationQueueOptionsFromMap(optionsByValue map[string]map[string]any) []map[string]any {
	options := make([]map[string]any, 0, len(optionsByValue))
	for _, option := range optionsByValue {
		options = append(options, option)
	}
	return options
}

func selectedTranslationGroupOptions(selected string, optionsByValue map[string]map[string]any) []map[string]any {
	selectedValues := translationQueueSelectedValues(selected)
	for _, selectedValue := range selectedValues {
		if _, ok := optionsByValue[selectedValue]; ok {
			continue
		}
		translationQueueAppendDescribedOption(optionsByValue, selectedValue, selectedValue, "")
	}
	options := make([]map[string]any, 0, len(selectedValues))
	for _, selectedValue := range selectedValues {
		if option, ok := optionsByValue[selectedValue]; ok {
			options = append(options, option)
		}
	}
	sortTranslationQueueOptions(options)
	return options
}

func translationQueueSummaryFilters(entityType, sourceRecordID string) map[string]any {
	filters := map[string]any{}
	if entityType != "" {
		filters["entity_type"] = entityType
	}
	if sourceRecordID != "" {
		filters["source_record_id"] = sourceRecordID
	}
	return filters
}

func translationQueueOptionsSelected(c router.Context, aliases ...string) string {
	if c == nil {
		return ""
	}
	keys := []string{"selected", "value"}
	keys = append(keys, aliases...)
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if value := strings.TrimSpace(c.Query(key)); value != "" {
			return value
		}
	}
	return ""
}

func translationQueueSelectedValues(selected string) []string {
	values := []string{}
	seen := map[string]struct{}{}
	for value := range strings.SplitSeq(selected, ",") {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		values = append(values, value)
	}
	return values
}

func translationQueuePaginatedOptions(c router.Context, options []map[string]any) []map[string]any {
	if len(options) == 0 {
		return options
	}
	page, perPage := translationQueueOptionPagination(c)
	start := (page - 1) * perPage
	if start >= len(options) {
		return []map[string]any{}
	}
	end := min(start+perPage, len(options))
	return options[start:end]
}

func translationQueueOptionPagination(c router.Context) (int, int) {
	page := 1
	perPage := 25
	if c != nil {
		page = clampInt(atoiDefault(c.Query(adminkeys.QueryPage), 1), 1, 10_000)
		perPage = clampInt(atoiDefault(c.Query(adminkeys.QueryPerPage), 25), 1, 200)
	}
	return page, perPage
}

func translationQueueOptionQuery(c router.Context, adminCtx AdminContext, purpose TranslationActorOptionPurpose, selectedAliases ...string) TranslationActorOptionQuery {
	page, perPage := translationQueueOptionPagination(c)
	query := TranslationActorOptionQuery{
		Purpose:      purpose,
		Search:       translationQueueOptionsSearch(c),
		SelectedIDs:  translationQueueSelectedValues(translationQueueOptionsSelected(c, selectedAliases...)),
		Page:         page,
		PerPage:      perPage,
		AdminContext: adminCtx,
	}
	if c != nil {
		query.Channel = strings.TrimSpace(c.Query("channel"))
		query.EntityType = normalizeTranslationQueueEntityType(c.Query("entity_type"))
		query.SourceRecordID = strings.TrimSpace(c.Query("source_record_id"))
		query.FamilyID = strings.TrimSpace(c.Query("family_id"))
		query.TargetLocale = strings.TrimSpace(firstNonEmpty(c.Query("target_locale"), c.Query("locale")))
	}
	if query.Channel == "" {
		query.Channel = adminCtx.Environment
	}
	return query
}

func (b *translationQueueBinding) translationActorOptionProvider() TranslationActorOptionProvider {
	if b != nil && b.admin != nil {
		if provider := b.admin.TranslationActorOptionProvider(); provider != nil {
			return provider
		}
	}
	return defaultTranslationActorOptionProvider{binding: b}
}

type defaultTranslationActorOptionProvider struct {
	binding *translationQueueBinding
}

func (p defaultTranslationActorOptionProvider) ListTranslationActorOptions(_ context.Context, input TranslationActorOptionQuery) ([]TranslationActorOption, error) {
	if p.binding == nil {
		return nil, nil
	}
	searchKey := strings.ToLower(strings.TrimSpace(input.Search))
	optionsByValue := map[string]map[string]any{}
	if len(input.SelectedIDs) > 0 {
		p.binding.appendAssigneeSelectedUserOptions(input.AdminContext, strings.Join(input.SelectedIDs, ","), optionsByValue)
		options := translationQueueFilteredOptions(optionsByValue, searchKey)
		sortTranslationQueueOptions(options)
		return translationActorOptionsFromMaps(options), nil
	}
	p.binding.appendAssigneeUserOptions(input.AdminContext, input.Search, input.PerPage, optionsByValue)
	options := translationQueueFilteredOptions(optionsByValue, searchKey)
	sortTranslationQueueOptions(options)
	options = paginateTranslationQueueOptionMaps(options, input.Page, input.PerPage)
	return translationActorOptionsFromMaps(options), nil
}

func translationActorOptionsFromMaps(options []map[string]any) []TranslationActorOption {
	out := make([]TranslationActorOption, 0, len(options))
	for _, option := range options {
		value := strings.TrimSpace(toString(option["value"]))
		if value == "" {
			continue
		}
		out = append(out, TranslationActorOption{
			Value:       value,
			Label:       strings.TrimSpace(firstNonEmpty(toString(option["label"]), value)),
			Description: strings.TrimSpace(toString(option["description"])),
			DisplayName: strings.TrimSpace(toString(option["display_name"])),
			AvatarURL:   strings.TrimSpace(toString(option["avatar_url"])),
		})
	}
	return out
}

func translationActorOptionsToMaps(options []TranslationActorOption) []map[string]any {
	out := make([]map[string]any, 0, len(options))
	for _, option := range options {
		value := strings.TrimSpace(option.Value)
		if value == "" {
			continue
		}
		payload := maps.Clone(option.Metadata)
		if payload == nil {
			payload = map[string]any{}
		}
		payload["value"] = value
		payload["label"] = strings.TrimSpace(firstNonEmpty(option.Label, value))
		if description := strings.TrimSpace(option.Description); description != "" {
			payload["description"] = description
		}
		if displayName := strings.TrimSpace(option.DisplayName); displayName != "" {
			payload["display_name"] = displayName
		}
		if avatarURL := strings.TrimSpace(option.AvatarURL); avatarURL != "" {
			payload["avatar_url"] = avatarURL
		}
		out = append(out, payload)
	}
	return out
}

func translationActorOptionsWithSelectedFallback(options []TranslationActorOption, selectedIDs []string) []TranslationActorOption {
	if len(selectedIDs) == 0 {
		return options
	}
	seen := map[string]struct{}{}
	for _, option := range options {
		value := strings.TrimSpace(option.Value)
		if value != "" {
			seen[value] = struct{}{}
		}
	}
	out := append([]TranslationActorOption(nil), options...)
	for _, id := range selectedIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, TranslationActorOption{Value: id, Label: id})
	}
	return out
}

func boundTranslationActorOptionsForResponse(options []TranslationActorOption, input TranslationActorOptionQuery) []TranslationActorOption {
	if len(options) == 0 || len(input.SelectedIDs) > 0 {
		return options
	}
	perPage := input.PerPage
	if perPage <= 0 {
		perPage = 25
	}
	perPage = clampInt(perPage, 1, 200)
	if len(options) <= perPage {
		return options
	}
	return append([]TranslationActorOption(nil), options[:perPage]...)
}

func paginateTranslationQueueOptionMaps(options []map[string]any, page, perPage int) []map[string]any {
	if len(options) == 0 {
		return options
	}
	page = clampInt(page, 1, 10_000)
	perPage = clampInt(perPage, 1, 200)
	start := (page - 1) * perPage
	if start >= len(options) {
		return []map[string]any{}
	}
	end := min(start+perPage, len(options))
	return options[start:end]
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

	input := translationQueueOptionQuery(c, adminCtx, TranslationActorOptionPurposeAssignee, "assignee_id", "reviewer_id")
	options, err := b.translationActorOptionProvider().ListTranslationActorOptions(adminCtx.Context, input)
	if err != nil {
		return nil, err
	}
	options = translationActorOptionsWithSelectedFallback(options, input.SelectedIDs)
	options = boundTranslationActorOptionsForResponse(options, input)
	return translationActorOptionsToMaps(options), nil
}

func (b *translationQueueBinding) ReviewersOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	input := translationQueueOptionQuery(c, adminCtx, TranslationActorOptionPurposeReviewer, "reviewer_id")
	options, err := b.translationActorOptionProvider().ListTranslationActorOptions(adminCtx.Context, input)
	if err != nil {
		return nil, err
	}
	options = translationActorOptionsWithSelectedFallback(options, input.SelectedIDs)
	options = boundTranslationActorOptionsForResponse(options, input)
	return translationActorOptionsToMaps(options), nil
}

func appendAssigneeOption(optionsByValue map[string]map[string]any, option map[string]any) {
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

func (b *translationQueueBinding) appendAssigneeSelectedUserOptions(adminCtx AdminContext, selected string, optionsByValue map[string]map[string]any) {
	if b.admin == nil {
		return
	}
	for id := range strings.SplitSeq(selected, ",") {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if b.appendAssigneeSelectedUserOption(adminCtx, id, optionsByValue) {
			continue
		}
		if appendAssigneeSelectedUserPanelOption(adminCtx, b.admin, id, optionsByValue) {
			continue
		}
		appendAssigneeOption(optionsByValue, map[string]any{
			"value": id,
			"label": id,
		})
	}
}

func (b *translationQueueBinding) appendAssigneeSelectedUserOption(adminCtx AdminContext, id string, optionsByValue map[string]map[string]any) bool {
	if b == nil || b.admin == nil || b.admin.users == nil || b.admin.users.users == nil {
		return false
	}
	user, err := b.admin.users.users.Get(adminCtx.Context, id)
	if err != nil {
		return false
	}
	appendAssigneeOption(optionsByValue, translationQueueAssigneeOption(userToRecord(user)))
	return true
}

func appendAssigneeSelectedUserPanelOption(adminCtx AdminContext, adm *Admin, id string, optionsByValue map[string]map[string]any) bool {
	if adm == nil || adm.registry == nil {
		return false
	}
	usersPanel, ok := adm.registry.Panel(usersModuleID)
	if !ok || usersPanel == nil {
		return false
	}
	record, err := usersPanel.Get(adminCtx, id)
	if err != nil {
		return false
	}
	appendAssigneeOption(optionsByValue, translationQueueAssigneeOption(record))
	return true
}

func (b *translationQueueBinding) appendAssigneeUserOptions(adminCtx AdminContext, search string, perPage int, optionsByValue map[string]map[string]any) {
	if b == nil || b.admin == nil {
		return
	}
	if b != nil && b.admin != nil && b.admin.users != nil && b.admin.users.users != nil {
		users, err := b.admin.users.users.Search(adminCtx.Context, search, perPage)
		if err == nil {
			for _, user := range users {
				appendAssigneeOption(optionsByValue, translationQueueAssigneeOption(userToRecord(user)))
			}
		}
		return
	}
	if b.admin.registry == nil {
		return
	}
	usersPanel, ok := b.admin.registry.Panel(usersModuleID)
	if !ok || usersPanel == nil {
		return
	}
	records, _, err := usersPanel.List(adminCtx, ListOptions{
		Page:    1,
		PerPage: perPage,
		Search:  search,
	})
	if err != nil {
		return
	}
	for _, record := range records {
		appendAssigneeOption(optionsByValue, translationQueueAssigneeOption(record))
	}
}

func translationQueueFilteredOptions(optionsByValue map[string]map[string]any, searchKey string) []map[string]any {
	options := make([]map[string]any, 0, len(optionsByValue))
	for _, option := range optionsByValue {
		if !translationQueueOptionMatchesSearch(option, searchKey) {
			continue
		}
		options = append(options, option)
	}
	return options
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

func (b *translationQueueBinding) reviewerAggregateCounts(ctx context.Context, assignments []TranslationAssignment, filter translationAssignmentListFilter, actorID, environment string, now time.Time) (map[string]int, error) {
	counts := map[string]int{}
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		counts[key] = 0
	}
	if strings.TrimSpace(actorID) == "" {
		return counts, nil
	}
	scopeFilter := translationAssignmentListFilter{
		TenantID: strings.TrimSpace(filter.TenantID),
		OrgID:    strings.TrimSpace(filter.OrgID),
	}
	reviewAssignments := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if !matchesAssignmentListFilter(assignment, scopeFilter, now) {
			continue
		}
		reviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
		if reviewerID == "" || !strings.EqualFold(reviewerID, actorID) {
			continue
		}
		switch assignment.Status {
		case AssignmentStatusInReview:
			reviewAssignments = append(reviewAssignments, assignment)
			counts["review_inbox"]++
			if translationQueueDueState(assignment.DueDate, now) == translationQueueDueStateOverdue {
				counts["review_overdue"]++
			}
		case AssignmentStatusChangesRequested:
			counts["review_changes_requested"]++
		}
	}
	for assignmentID := range b.reviewBlockedAssignments(ctx, reviewAssignments, environment) {
		if assignmentID != "" {
			counts["review_blocked"]++
		}
	}
	return counts, nil
}

func (b *translationQueueBinding) reviewBlockedAssignments(ctx context.Context, assignments []TranslationAssignment, environment string) map[string]struct{} {
	blocked := map[string]struct{}{}
	if !b.translationQAEnabled() || len(assignments) == 0 {
		return blocked
	}
	familyBinding := &translationFamilyBinding{admin: b.admin}
	runtime, err := familyBinding.runtime(ctx, environment)
	if err != nil || runtime == nil || runtime.service == nil {
		return blocked
	}
	assignmentsByFamily := map[string][]TranslationAssignment{}
	for _, assignment := range assignments {
		familyID := strings.TrimSpace(assignment.FamilyID)
		if familyID == "" {
			continue
		}
		assignmentsByFamily[familyID] = append(assignmentsByFamily[familyID], assignment)
	}
	for familyID, familyAssignments := range assignmentsByFamily {
		if len(familyAssignments) == 0 {
			continue
		}
		scope := translationservices.Scope{
			TenantID: strings.TrimSpace(primitives.FirstNonEmptyRaw(familyAssignments[0].TenantID, tenantIDFromContext(ctx))),
			OrgID:    strings.TrimSpace(primitives.FirstNonEmptyRaw(familyAssignments[0].OrgID, orgIDFromContext(ctx))),
		}
		family, ok, detailErr := runtime.service.Detail(ctx, translationservices.GetFamilyInput{
			Scope:       scope,
			Environment: environment,
			FamilyID:    familyID,
		})
		if detailErr != nil || !ok {
			continue
		}
		for _, assignment := range familyAssignments {
			if b.assignmentHasQABlockersForFamily(assignment, family, environment) {
				blocked[strings.TrimSpace(assignment.ID)] = struct{}{}
			}
		}
	}
	return blocked
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

func (b *translationQueueBinding) assignmentContractRow(ctx context.Context, assignment TranslationAssignment, now time.Time, environment string, actorLabels map[string]string) map[string]any {
	row := translationQueueAssignmentContractRow(assignment, now)
	assigneeID := strings.TrimSpace(assignment.AssigneeID)
	assigneeLabel := strings.TrimSpace(actorLabels[assigneeID])
	if assigneeLabel != "" {
		row["assignee_label"] = assigneeLabel
	}
	if displayAssignee := strings.TrimSpace(firstNonEmpty(assigneeLabel, assigneeID)); displayAssignee != "" {
		row["display_assignee"] = displayAssignee
	}
	reviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
	reviewerLabel := strings.TrimSpace(actorLabels[reviewerID])
	if reviewerLabel != "" {
		row["reviewer_label"] = reviewerLabel
	}
	if displayReviewer := strings.TrimSpace(firstNonEmpty(reviewerLabel, reviewerID)); displayReviewer != "" {
		row["display_reviewer"] = displayReviewer
	}
	row["actions"] = b.assignmentActionStates(ctx, assignment)
	row["review_actions"] = b.reviewActionStates(ctx, assignment)
	if feedback := translationAssignmentReviewFeedbackPayload(assignment); len(feedback) > 0 {
		row["review_feedback"] = feedback
		row["last_rejection_reason"] = feedback["last_rejection_reason"]
	}
	if summary := b.assignmentQASummary(ctx, assignment, environment); len(summary) > 0 {
		row["qa_summary"] = summary
	}
	return row
}

func (b *translationQueueBinding) assignmentListRows(ctx context.Context, assignments []TranslationAssignment, now time.Time, environment string, grouping translationQueueGroupingRequest) []map[string]any {
	actorLabels := b.newAssignmentActorLabelResolver().labelsForAssignments(ctx, assignments)
	rows := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		rows = append(rows, b.assignmentContractRow(ctx, assignment, now, environment, actorLabels))
	}
	if !grouping.Enabled || grouping.Mode != "family_id" {
		return rows
	}
	return translationQueueFamilyGroupedRows(rows)
}

func (b *translationQueueBinding) newAssignmentActorLabelResolver() *translationQueueActorLabelResolver {
	return &translationQueueActorLabelResolver{
		binding: b,
		labels:  map[string]string{},
		misses:  map[string]struct{}{},
	}
}

type translationQueueActorLabelResolver struct {
	binding *translationQueueBinding
	labels  map[string]string
	misses  map[string]struct{}
}

func (r *translationQueueActorLabelResolver) labelsForAssignments(ctx context.Context, assignments []TranslationAssignment) map[string]string {
	labels := map[string]string{}
	if r == nil || len(assignments) == 0 {
		return labels
	}
	ids := map[string]struct{}{}
	for _, assignment := range assignments {
		if id := strings.TrimSpace(assignment.AssigneeID); id != "" {
			ids[id] = struct{}{}
		}
		if id := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID)); id != "" {
			ids[id] = struct{}{}
		}
	}
	for id := range ids {
		if label, ok := r.labels[id]; ok {
			labels[id] = label
			continue
		}
		if _, missed := r.misses[id]; missed {
			continue
		}
		label := r.resolveLabel(ctx, id)
		if label == "" {
			r.misses[id] = struct{}{}
			continue
		}
		r.labels[id] = label
		labels[id] = label
	}
	return labels
}

func (r *translationQueueActorLabelResolver) resolveLabel(ctx context.Context, id string) string {
	id = strings.TrimSpace(id)
	if r == nil || r.binding == nil || r.binding.admin == nil || id == "" {
		return ""
	}
	if r.binding.admin.users != nil {
		user, err := r.binding.admin.users.GetUser(ctx, id)
		if err == nil && strings.TrimSpace(user.ID) != "" {
			return translationQueueActorLabelFromRecord(userToRecord(user))
		}
	}
	if r.binding.admin.registry != nil {
		usersPanel, ok := r.binding.admin.registry.Panel(usersModuleID)
		if ok && usersPanel != nil && usersPanel.repo != nil {
			record, err := usersPanel.repo.Get(ctx, id)
			if err == nil && len(record) > 0 {
				return translationQueueActorLabelFromRecord(record)
			}
		}
	}
	return ""
}

func translationQueueActorLabelFromRecord(record map[string]any) string {
	option := translationQueueAssigneeOption(record)
	return strings.TrimSpace(toString(option["label"]))
}

func translationQueueFamilyGroupedRows(rows []map[string]any) []map[string]any {
	groupRows := make([]map[string]any, 0, len(rows))
	groupIndex := map[string]int{}
	for _, row := range rows {
		familyID := strings.TrimSpace(toString(row["family_id"]))
		if familyID == "" {
			ungrouped := primitives.CloneAnyMap(row)
			ungrouped["_group"] = map[string]any{
				"row_type":             "ungrouped",
				"id":                   strings.TrimSpace(toString(row["id"])),
				adminkeys.QueryGroupBy: "family_id",
			}
			groupRows = append(groupRows, ungrouped)
			continue
		}
		idx, exists := groupIndex[familyID]
		if !exists {
			groupIndex[familyID] = len(groupRows)
			groupRows = append(groupRows, translationQueueFamilyGroupRow(familyID, row, nil))
			continue
		}
		children := translationQueueMapSliceValue(groupRows[idx]["records"])
		children = append(children, primitives.CloneAnyMap(row))
		groupRows[idx] = translationQueueFamilyGroupRow(familyID, extractMap(groupRows[idx]["parent"]), children)
	}
	return groupRows
}

func translationQueueFamilyGroupRow(familyID string, parent map[string]any, children []map[string]any) map[string]any {
	if len(children) == 0 && len(parent) > 0 {
		children = []map[string]any{primitives.CloneAnyMap(parent)}
	}
	parent = primitives.CloneAnyMap(parent)
	summary := translationQueueFamilyGroupSummary(children)
	label := translationQueueFamilyGroupLabel(familyID, parent, children)
	parent["target_locales"] = summary["target_locales"]
	parent["queue_states"] = summary["status_counts"]
	parent["priority_counts"] = summary["priority_counts"]
	parentActionState := map[string]any{
		"scope":   "children",
		"message": "Family group actions are derived from child assignment rows.",
	}
	parent["action_state"] = parentActionState
	row := map[string]any{
		"id":                   "family:" + familyID,
		"row_type":             "group",
		"family_id":            familyID,
		adminkeys.QueryGroupBy: "family_id",
		"family_label":         label,
		"family_summary":       summary,
		"parent":               parent,
		"records":              children,
		"children":             children,
		"action_state":         parentActionState,
		"_group": map[string]any{
			"row_type":             "group",
			"id":                   familyID,
			"label":                label,
			adminkeys.QueryGroupBy: "family_id",
			"child_count":          len(children),
			"mode":                 "page_local",
			"page_local":           true,
			"expanded":             false,
		},
	}
	return row
}

func translationQueueMapSliceValue(raw any) []map[string]any {
	items, ok := raw.([]map[string]any)
	if ok {
		out := make([]map[string]any, 0, len(items))
		for _, item := range items {
			out = append(out, primitives.CloneAnyMap(item))
		}
		return out
	}
	generic, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(generic))
	for _, item := range generic {
		if mapped := extractMap(item); len(mapped) > 0 {
			out = append(out, primitives.CloneAnyMap(mapped))
		}
	}
	return out
}

func translationQueueFamilyGroupSummary(children []map[string]any) map[string]any {
	statusCounts := map[string]int{}
	availableLocales := map[string]struct{}{}
	dueCounts := map[string]int{}
	priorityCounts := map[string]int{}
	for _, child := range children {
		if status := strings.TrimSpace(toString(child["status"])); status != "" {
			statusCounts[status]++
		}
		if locale := strings.TrimSpace(strings.ToLower(toString(child["target_locale"]))); locale != "" {
			availableLocales[locale] = struct{}{}
		}
		if dueState := strings.TrimSpace(toString(child["due_state"])); dueState != "" {
			dueCounts[dueState]++
		}
		if priority := strings.TrimSpace(toString(child["priority"])); priority != "" {
			priorityCounts[priority]++
		}
	}
	return map[string]any{
		"total_items":       len(children),
		"child_count":       len(children),
		"available_locales": sortedStringSet(availableLocales),
		"target_locales":    sortedStringSet(availableLocales),
		"missing_locales":   []string{},
		"status_counts":     statusCounts,
		"due_state_counts":  dueCounts,
		"priority_counts":   priorityCounts,
	}
}

//nolint:funlen,gocyclo // Group derivation is kept inline to preserve deterministic family summary fields.
func translationAssignmentFamilyGroupsFromAssignments(assignments []TranslationAssignment, now time.Time) []TranslationAssignmentFamilyGroup {
	byFamily := map[string][]TranslationAssignment{}
	for _, assignment := range assignments {
		familyID := strings.TrimSpace(assignment.FamilyID)
		if familyID == "" {
			familyID = strings.TrimSpace(assignment.ID)
		}
		byFamily[familyID] = append(byFamily[familyID], assignment)
	}
	groups := make([]TranslationAssignmentFamilyGroup, 0, len(byFamily))
	for familyID, children := range byFamily {
		group := TranslationAssignmentFamilyGroup{
			FamilyID:                    familyID,
			AssignmentCount:             len(children),
			StatusCounts:                map[string]int{},
			DueStateCounts:              map[string]int{},
			PriorityCounts:              map[string]int{},
			FamilyBlockerCountAvailable: false,
			FamilyBlockerCountReason:    "persisted_blockers_unavailable",
			ActionHints:                 map[string]int{},
		}
		locales := map[string]struct{}{}
		var priorityRank int
		prioritySet := false
		for idx, assignment := range children {
			if idx == 0 {
				group.EntityType = strings.TrimSpace(assignment.EntityType)
				group.SourceRecordID = strings.TrimSpace(assignment.SourceRecordID)
				group.SourceLocale = strings.TrimSpace(assignment.SourceLocale)
				group.SourceTitle = strings.TrimSpace(assignment.SourceTitle)
				group.SourcePath = strings.TrimSpace(assignment.SourcePath)
				group.FamilyLabel = translationQueueFamilyLabelFromAssignment(assignment, familyID)
				group.CreatedAt = assignment.CreatedAt
				group.UpdatedAt = assignment.UpdatedAt
				group.DueDate = cloneTimePtr(assignment.DueDate)
				group.DueState = translationQueueDueState(assignment.DueDate, now)
				group.Priority = assignment.Priority
				priorityRank = translationQueuePriorityRank(string(assignment.Priority))
				prioritySet = true
			}
			if assignment.CreatedAt.Before(group.CreatedAt) || group.CreatedAt.IsZero() {
				group.CreatedAt = assignment.CreatedAt
			}
			if assignment.UpdatedAt.After(group.UpdatedAt) {
				group.UpdatedAt = assignment.UpdatedAt
			}
			if compareTimePtr(assignment.DueDate, group.DueDate) < 0 {
				group.DueDate = cloneTimePtr(assignment.DueDate)
			}
			dueState := translationQueueDueState(assignment.DueDate, now)
			if translationQueueDueStateRank(dueState) > translationQueueDueStateRank(group.DueState) {
				group.DueState = dueState
			}
			currentPriorityRank := translationQueuePriorityRank(string(assignment.Priority))
			if !prioritySet || currentPriorityRank > priorityRank {
				group.Priority = assignment.Priority
				priorityRank = currentPriorityRank
				prioritySet = true
			}
			if status := normalizeTranslationQueueState(string(assignment.Status)); status != "" {
				group.StatusCounts[status]++
			}
			if dueState != "" {
				group.DueStateCounts[dueState]++
			}
			if priority := normalizeTranslationQueuePriorityFilterValue(string(assignment.Priority)); priority != "" {
				group.PriorityCounts[priority]++
			}
			if locale := normalizeTranslationQueueLocaleFilterValue(assignment.TargetLocale); locale != "" {
				locales[locale] = struct{}{}
			}
			if assignment.Status == AssignmentStatusOpen {
				group.ActionHints["claimable_count"]++
			}
			if assignment.Status == AssignmentStatusInReview {
				group.ActionHints["reviewable_count"]++
			}
		}
		group.TargetLocales = sortedStringSet(locales)
		group.LocaleCount = len(group.TargetLocales)
		groups = append(groups, group)
	}
	return groups
}

func translationQueueFamilyLabelFromAssignment(assignment TranslationAssignment, familyID string) string {
	for _, candidate := range []string{assignment.SourceTitle, assignment.SourcePath, assignment.SourceRecordID, familyID} {
		if trimmed := strings.TrimSpace(candidate); trimmed != "" {
			return trimmed
		}
	}
	return familyID
}

func sortTranslationAssignmentFamilyGroups(groups []TranslationAssignmentFamilyGroup, sortBy string, sortDesc bool) {
	sortBy = strings.TrimSpace(strings.ToLower(sortBy))
	if sortBy == "" {
		sortBy = "updated_at"
		sortDesc = true
	}
	sort.SliceStable(groups, func(i, j int) bool {
		left := groups[i]
		right := groups[j]
		var comparison int
		switch sortBy {
		case "created_at":
			comparison = compareTime(left.CreatedAt, right.CreatedAt)
		case "due_date":
			comparison = compareTimePtr(left.DueDate, right.DueDate)
		case "due_state":
			comparison = compareTranslationQueueDueState(left.DueState, right.DueState)
		case "priority":
			comparison = compareTranslationQueuePriority(left.Priority, right.Priority)
		default:
			comparison = compareTime(left.UpdatedAt, right.UpdatedAt)
		}
		if comparison == 0 {
			return strings.ToLower(strings.TrimSpace(left.FamilyID)) < strings.ToLower(strings.TrimSpace(right.FamilyID))
		}
		if sortDesc {
			return comparison > 0
		}
		return comparison < 0
	})
}

func translationQueueFamilyGroupLabel(familyID string, parent map[string]any, children []map[string]any) string {
	for _, candidate := range []string{
		toString(parent["source_title"]),
		toString(parent["source_path"]),
		toString(parent["source_record_id"]),
	} {
		if trimmed := strings.TrimSpace(candidate); trimmed != "" {
			return trimmed
		}
	}
	for _, child := range children {
		for _, candidate := range []string{
			toString(child["source_title"]),
			toString(child["source_path"]),
			toString(child["source_record_id"]),
		} {
			if trimmed := strings.TrimSpace(candidate); trimmed != "" {
				return trimmed
			}
		}
	}
	return familyID
}

func translationQueueGroupingContract(grouping translationQueueGroupingRequest, rowCount, assignmentCount int, serverFamilySupported bool) map[string]any {
	mode := firstNonEmpty(grouping.Mode, "flat")
	strategy := ""
	if grouping.Enabled {
		strategy = firstNonEmpty(grouping.Strategy, "page_local")
	}
	return map[string]any{
		"enabled":              grouping.Enabled,
		"mode":                 mode,
		adminkeys.QueryGroupBy: grouping.Mode,
		"scope":                "current_page",
		"row_count":            rowCount,
		"group_count":          rowCount,
		"assignment_count":     assignmentCount,
		"supported_modes":      []string{"family_id"},
		"capabilities": map[string]any{
			"server_family": map[string]any{
				"supported": serverFamilySupported,
				"reason_code": func() string {
					if serverFamilySupported {
						return ""
					}
					return "grouped_query_unsupported"
				}(),
			},
		},
		"strategy":     strategy,
		"pagination":   "Assignment filters, sorting, and pagination are applied before page-local family grouping.",
		"sorting":      "Group order follows the first child assignment in the sorted current page.",
		"filtering":    "Filters remain assignment filters; groups contain only matching child assignments from the current page.",
		"expansion":    "Parent rows expose children and records arrays; clients control expanded state.",
		"action_state": "Child assignment rows retain existing action states; parent action state is informational only.",
	}
}

func translationQueueServerFamilyGroupingContract(familyTotal, assignmentTotal, rowCount int) map[string]any {
	return map[string]any{
		"enabled":              true,
		"mode":                 "family_id",
		adminkeys.QueryGroupBy: "family_id",
		"scope":                "filtered_queue",
		"strategy":             "server_family",
		"row_count":            rowCount,
		"group_count":          rowCount,
		"family_total":         familyTotal,
		"assignment_total":     assignmentTotal,
		"supported_modes":      []string{"family_id"},
		"supported_sort_keys":  translationQueueServerFamilySupportedSortKeys(),
		"capabilities": map[string]any{
			"server_family": map[string]any{
				"supported": true,
			},
		},
		"pagination":   "Top-level page, per_page, and total describe parent family pagination.",
		"sorting":      "Parent family rows use aggregate semantics; expanded child rows use normal assignment-row sorting.",
		"filtering":    "Filters remain assignment filters and aggregate counts include all matching assignments in each family.",
		"expansion":    "Parent rows provide an expansion href and structured request for the family child assignments endpoint.",
		"action_state": "Child assignment rows retain executable action states; parent action state is informational only.",
	}
}

func translationQueueServerFamilySupportedSortKeys() []string {
	return []string{"updated_at", "created_at", "due_date", "due_state", "priority"}
}

func validateServerFamilySort(sortBy string, explicit bool) error {
	sortBy = strings.TrimSpace(strings.ToLower(sortBy))
	if sortBy == "" {
		return nil
	}
	if slices.Contains(translationQueueServerFamilySupportedSortKeys(), sortBy) {
		return nil
	}
	if !explicit {
		return nil
	}
	return validationDomainError("unsupported server-family assignment queue sort", map[string]any{
		"field":                      adminkeys.QuerySort,
		adminkeys.QuerySort:          sortBy,
		adminkeys.QueryGroupStrategy: "server_family",
		"supported":                  translationQueueServerFamilySupportedSortKeys(),
		"reason_code":                "server_family_sort_unsupported",
	})
}

func translationQueueRepositorySupportsServerFamily(repo TranslationAssignmentRepository) bool {
	store, ok := repo.(TranslationAssignmentFamilyGroupingStore)
	return ok && store != nil
}

func translationQueueGroupingUnsupportedError(reason, message string, meta map[string]any) error {
	if meta == nil {
		meta = map[string]any{}
	}
	meta["reason_code"] = strings.TrimSpace(reason)
	meta["code"] = "TRANSLATION_QUEUE_GROUPING_UNSUPPORTED"
	return validationDomainError(message, meta)
}

func translationQueueFamilyGroupingError(err error) error {
	switch {
	case errors.Is(err, ErrTranslationAssignmentQueryUnsupported):
		return translationQueueGroupingUnsupportedError("grouped_query_unsupported", "server-side family grouping is not supported for this repository", map[string]any{
			"field":                      adminkeys.QueryGroupStrategy,
			adminkeys.QueryGroupStrategy: "server_family",
			"fallback_modes":             []string{"flat", "page_local_family"},
		})
	case errors.Is(err, ErrTranslationAssignmentFamilyBlockersUnavailable):
		return translationQueueGroupingUnsupportedError("persisted_blockers_unavailable", "persisted family blocker aggregates are unavailable for this query", map[string]any{
			"field":                      "review_state",
			"review_state":               translationQueueReviewStateQABlocked,
			adminkeys.QueryGroupStrategy: "server_family",
		})
	default:
		return err
	}
}

func (b *translationQueueBinding) serverFamilyParentRow(family TranslationAssignmentFamilyGroup, filter translationAssignmentListFilter, page, perPage int, channel string) map[string]any {
	query := translationQueueExpansionQuery(filter, channel, 1, 25)
	href := b.serverFamilyExpansionHref(family.FamilyID, query)
	row := map[string]any{
		"id":                             "family:" + strings.TrimSpace(family.FamilyID),
		"row_type":                       "family",
		"family_id":                      strings.TrimSpace(family.FamilyID),
		"family_label":                   strings.TrimSpace(firstNonEmpty(family.FamilyLabel, family.SourceTitle, family.SourcePath, family.SourceRecordID, family.FamilyID)),
		"entity_type":                    strings.TrimSpace(family.EntityType),
		"source_record_id":               strings.TrimSpace(family.SourceRecordID),
		"source_locale":                  strings.TrimSpace(family.SourceLocale),
		"source_title":                   strings.TrimSpace(family.SourceTitle),
		"source_path":                    strings.TrimSpace(family.SourcePath),
		"assignment_count":               family.AssignmentCount,
		"locale_count":                   family.LocaleCount,
		"target_locales":                 append([]string{}, family.TargetLocales...),
		"status_counts":                  cloneStringIntMap(family.StatusCounts),
		"due_state_counts":               cloneStringIntMap(family.DueStateCounts),
		"priority_counts":                cloneStringIntMap(family.PriorityCounts),
		"family_blocker_count_available": family.FamilyBlockerCountAvailable,
		"family_blocker_count_reason":    strings.TrimSpace(family.FamilyBlockerCountReason),
		"action_state": map[string]any{
			"scope":   "children",
			"message": "Family actions are available on child assignment rows.",
		},
		"expansion": map[string]any{
			"href":   href,
			"route":  "translations.assignments.family_assignments",
			"params": map[string]any{"family_id": strings.TrimSpace(family.FamilyID)},
			"query":  query,
		},
	}
	if family.FamilyBlockerCount != nil {
		row["family_blocker_count"] = *family.FamilyBlockerCount
	} else {
		row["family_blocker_count"] = nil
	}
	if len(family.ActionHints) > 0 {
		row["action_hints"] = cloneStringIntMap(family.ActionHints)
	}
	row["_group"] = map[string]any{
		"row_type":             "family",
		"id":                   strings.TrimSpace(family.FamilyID),
		"label":                row["family_label"],
		adminkeys.QueryGroupBy: "family_id",
		"child_count":          family.AssignmentCount,
		"mode":                 "server_family",
		"page_local":           false,
		"expanded":             false,
	}
	return row
}

func (b *translationQueueBinding) serverFamilyExpansionHref(familyID string, query map[string]any) string {
	base := ""
	if b != nil && b.admin != nil {
		base = adminAPIRoutePath(b.admin, "translations.assignments.family_assignments")
	}
	if strings.TrimSpace(base) == "" {
		base = "/admin/api/translations/families/:family_id/assignments"
	}
	base = strings.ReplaceAll(base, ":family_id", url.PathEscape(strings.TrimSpace(familyID)))
	values := url.Values{}
	for key, raw := range query {
		value := strings.TrimSpace(toString(raw))
		if key == "" || value == "" {
			continue
		}
		values.Set(key, value)
	}
	if encoded := values.Encode(); encoded != "" {
		return base + "?" + encoded
	}
	return base
}

func translationQueueExpansionQuery(filter translationAssignmentListFilter, channel string, page, perPage int) map[string]any {
	query := translationQueueSnapshotFilterPayload(filter)
	if filter.TenantID != "" {
		query[ScopeTenantIDKey] = filter.TenantID
	}
	if filter.OrgID != "" {
		query[ScopeOrgIDKey] = filter.OrgID
	}
	if channel = strings.TrimSpace(channel); channel != "" {
		query["channel"] = channel
	}
	query["page"] = page
	query["per_page"] = perPage
	return query
}

func translationQueueSortOrder(desc bool) string {
	if desc {
		return "desc"
	}
	return "asc"
}

func cloneStringIntMap(input map[string]int) map[string]int {
	if len(input) == 0 {
		return map[string]int{}
	}
	out := make(map[string]int, len(input))
	maps.Copy(out, input)
	return out
}

func translationQueueAssignmentContractRow(assignment TranslationAssignment, now time.Time) map[string]any {
	queueState := normalizeTranslationQueueState(string(assignment.Status))
	contentState := translationQueueContentState(assignment.Status)
	row := map[string]any{
		"id":               strings.TrimSpace(assignment.ID),
		"family_id":        strings.TrimSpace(assignment.FamilyID),
		"variant_id":       strings.TrimSpace(assignment.VariantID),
		"entity_type":      strings.TrimSpace(assignment.EntityType),
		"source_record_id": strings.TrimSpace(assignment.SourceRecordID),
		"target_record_id": strings.TrimSpace(assignment.TargetRecordID),
		"source_locale":    strings.TrimSpace(assignment.SourceLocale),
		"target_locale":    strings.TrimSpace(assignment.TargetLocale),
		"work_scope":       normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
		"source_title":     strings.TrimSpace(assignment.SourceTitle),
		"source_path":      strings.TrimSpace(assignment.SourcePath),
		"assignee_id":      strings.TrimSpace(assignment.AssigneeID),
		"assigner_id":      strings.TrimSpace(assignment.AssignerID),
		"reviewer_id":      strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID)),
		"assignment_type":  strings.TrimSpace(string(assignment.AssignmentType)),
		"content_state":    contentState,
		"queue_state":      queueState,
		"status":           queueState,
		"priority":         strings.TrimSpace(string(assignment.Priority)),
		"due_state":        translationQueueDueState(assignment.DueDate, now),
		"row_version":      assignment.Version,
		"version":          assignment.Version,
		"updated_at":       assignment.UpdatedAt,
		"created_at":       assignment.CreatedAt,
	}
	if assignment.AssignedAt != nil {
		row["assigned_at"] = assignment.AssignedAt
	}
	if assignment.DueDate != nil {
		row["due_date"] = assignment.DueDate
	}
	return row
}

func translationAssignmentReviewFeedbackPayload(assignment TranslationAssignment) map[string]any {
	reason := strings.TrimSpace(assignment.LastRejectionReason)
	if reason == "" {
		return nil
	}
	return map[string]any{
		"last_rejection_reason": reason,
		"last_reviewer_id":      strings.TrimSpace(firstNonEmpty(assignment.LastReviewerID, assignment.ReviewerID)),
	}
}

func (b *translationQueueBinding) assignmentActionStates(ctx context.Context, assignment TranslationAssignment) map[string]any {
	return map[string]any{
		"claim":   b.claimActionState(ctx, assignment),
		"release": b.releaseActionState(ctx, assignment),
	}
}

func (b *translationQueueBinding) claimActionState(ctx context.Context, assignment TranslationAssignment) map[string]any {
	actorID := strings.TrimSpace(actorFromContext(ctx))
	switch assignment.Status {
	case AssignmentStatusOpen:
		return b.queueActionState(ctx, assignment.AssignmentType == AssignmentTypeOpenPool, PermAdminTranslationsClaim, "assignment must be open pool or already assigned to you before it can be claimed")
	case AssignmentStatusAssigned, AssignmentStatusChangesRequested:
		if actorID != "" && strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), actorID) {
			return b.queueActionState(ctx, true, PermAdminTranslationsClaim, "")
		}
		state := b.queueActionState(ctx, false, PermAdminTranslationsClaim, "assignment is assigned to a different translator")
		state["reason_code"] = ActionDisabledReasonCodePermissionDenied
		return state
	default:
		return b.queueActionState(ctx, false, PermAdminTranslationsClaim, "assignment must be open pool or already assigned to you before it can be claimed")
	}
}

func (b *translationQueueBinding) releaseActionState(ctx context.Context, assignment TranslationAssignment) map[string]any {
	statusAllowed := assignment.Status == AssignmentStatusAssigned || assignment.Status == AssignmentStatusInProgress || assignment.Status == AssignmentStatusChangesRequested
	return b.queueActionState(ctx, statusAllowed, PermAdminTranslationsAssign, "assignment must be assigned or in progress before it can be released")
}

func (b *translationQueueBinding) reviewActionStates(ctx context.Context, assignment TranslationAssignment) map[string]any {
	return map[string]any{
		"submit_review": b.queueActionState(ctx, assignment.Status == AssignmentStatusInProgress, PermAdminTranslationsEdit, "assignment must be in progress"),
		"approve":       b.reviewLifecycleActionState(ctx, assignment, PermAdminTranslationsApprove, "assignment must be in review"),
		"reject":        b.reviewLifecycleActionState(ctx, assignment, PermAdminTranslationsApprove, "assignment must be in review"),
		"archive":       b.queueActionState(ctx, assignment.Status != AssignmentStatusArchived, PermAdminTranslationsManage, "archived assignments cannot be archived again"),
	}
}

func (b *translationQueueBinding) reviewLifecycleActionState(ctx context.Context, assignment TranslationAssignment, permission, statusReason string) map[string]any {
	state := b.queueActionState(ctx, assignment.Status == AssignmentStatusInReview, permission, statusReason)
	if enabled := toBool(state["enabled"]); !enabled {
		return state
	}
	actorID := strings.TrimSpace(actorFromContext(ctx))
	expectedReviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
	if expectedReviewerID == "" || actorID == "" || strings.EqualFold(actorID, expectedReviewerID) {
		return state
	}
	state["enabled"] = false
	state["reason"] = "assignment is assigned to a different reviewer"
	state["reason_code"] = ActionDisabledReasonCodePermissionDenied
	state["expected_reviewer_id"] = expectedReviewerID
	return state
}

func (b *translationQueueBinding) assignmentQASummary(ctx context.Context, assignment TranslationAssignment, environment string) map[string]any {
	if !b.translationQAEnabled() || strings.TrimSpace(assignment.TargetRecordID) == "" {
		return nil
	}
	editorCtx, err := b.loadAssignmentEditorContext(ctx, assignment, environment)
	if err != nil {
		return nil
	}
	return translationQASummaryPayload(b.translationQAResults(editorCtx))
}

func (b *translationQueueBinding) assignmentQASummaryForFamily(assignment TranslationAssignment, family translationservices.FamilyRecord, environment string) map[string]any {
	if !b.translationQAEnabled() || strings.TrimSpace(assignment.TargetRecordID) == "" {
		return nil
	}
	editorCtx, ok := translationEditorContextFromFamily(family, assignment, environment)
	if !ok {
		return nil
	}
	return translationQASummaryPayload(b.translationQAResults(editorCtx))
}

func (b *translationQueueBinding) assignmentHasQABlockersForFamily(assignment TranslationAssignment, family translationservices.FamilyRecord, environment string) bool {
	summary := b.assignmentQASummaryForFamily(assignment, family, environment)
	return intValue(summary["blocker_count"]) > 0
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
	case string(AssignmentStatusInReview):
		return translationQueueContentStateReview
	case string(AssignmentStatusApproved):
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
	return translationqueue.SourceRecordOption(record, panelName)
}

func translationQueueAssigneeOption(record map[string]any) map[string]any {
	return translationqueue.AssigneeOption(record)
}

func translationQueueOptionsSearch(c router.Context) string {
	if c == nil {
		return ""
	}
	return translationqueue.OptionsSearch(func(key string) string { return c.Query(key) })
}

func translationQueueFilterOptionsBySearch(options []map[string]any, search string) []map[string]any {
	return translationqueue.FilterOptionsBySearch(options, search)
}

func translationQueueOptionMatchesSearch(option map[string]any, search string) bool {
	return translationqueue.OptionMatchesSearch(option, search)
}

func sortTranslationQueueOptions(options []map[string]any) {
	translationqueue.SortOptions(options)
}

func normalizeTranslationQueueEntityType(raw string) string {
	return translationqueue.NormalizeEntityType(raw)
}

func translationQueueEntityTypeLabel(entityType string) string {
	return translationqueue.EntityTypeLabel(entityType)
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
