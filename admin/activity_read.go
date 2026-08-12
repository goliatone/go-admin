package admin

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	usersactivity "github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

const (
	activityDefaultLimit = 50
	activityMaxLimit     = 200
)

// ActivityFeedQuerier represents the go-users activity feed query contract.
type ActivityFeedQuerier interface {
	Query(context.Context, types.ActivityFilter) (types.ActivityPage, error)
}

// ActivityReadContext carries trusted request authority into page enrichment.
// Scope is derived from the authenticated request and must never be inferred
// from activity metadata.
type ActivityReadContext struct {
	Actor types.ActorRef
	Scope types.ScopeFilter
}

// ActivityPageEnricher enriches one authorized and sanitized activity page.
type ActivityPageEnricher interface {
	EnrichActivityPage(context.Context, ActivityReadContext, types.ActivityPage) (types.ActivityPage, error)
}

// ActivityPageEnricherFunc adapts a function into an ActivityPageEnricher.
type ActivityPageEnricherFunc func(context.Context, ActivityReadContext, types.ActivityPage) (types.ActivityPage, error)

// EnrichActivityPage implements ActivityPageEnricher.
func (f ActivityPageEnricherFunc) EnrichActivityPage(ctx context.Context, readCtx ActivityReadContext, page types.ActivityPage) (types.ActivityPage, error) {
	return f(ctx, readCtx, page)
}

// ActivityNavigation contains optional host-owned navigation targets for one
// Activity record. Hrefs are presentation-only and are never persisted.
type ActivityNavigation struct {
	ActorHref  string
	ObjectHref string
}

// ActivityReadEntry is the read-only API projection of an ActivityEntry.
// Navigation fields are deliberately excluded from the write-side entry so
// presentation state cannot cross a persistence boundary.
type ActivityReadEntry struct {
	ActivityEntry
	ActorHref  string `json:"actor_href,omitempty"`
	ObjectHref string `json:"object_href,omitempty"`
}

// ActivityNavigationResolver derives host-specific navigation for one
// authorized canonical Activity page. The result must preserve record order.
// Implementations must not treat record metadata as URL authority and should
// batch any request-level permission policy evaluation.
type ActivityNavigationResolver interface {
	ResolveActivityNavigation(context.Context, ActivityReadContext, []types.ActivityRecord) ([]ActivityNavigation, error)
}

// ActivityNavigationResolverFunc adapts a function into an
// ActivityNavigationResolver.
type ActivityNavigationResolverFunc func(context.Context, ActivityReadContext, []types.ActivityRecord) ([]ActivityNavigation, error)

// ResolveActivityNavigation implements ActivityNavigationResolver.
func (f ActivityNavigationResolverFunc) ResolveActivityNavigation(ctx context.Context, readCtx ActivityReadContext, records []types.ActivityRecord) ([]ActivityNavigation, error) {
	return f(ctx, readCtx, records)
}

// ActivityNavigationTarget identifies the navigation projection stage that
// failed while preserving fail-open Activity reads.
type ActivityNavigationTarget string

const (
	ActivityNavigationTargetResolver ActivityNavigationTarget = "resolver"
	ActivityNavigationTargetActor    ActivityNavigationTarget = "actor"
	ActivityNavigationTargetObject   ActivityNavigationTarget = "object"
)

// ActivityNavigationError describes one fail-open navigation projection
// failure without conflating it with Activity page enrichment errors.
type ActivityNavigationError struct {
	ActivityID uuid.UUID
	Target     ActivityNavigationTarget
	Err        error
}

// Error implements error.
func (e ActivityNavigationError) Error() string {
	if e.ActivityID == uuid.Nil {
		return fmt.Sprintf("activity %s navigation failed: %v", e.Target, e.Err)
	}
	return fmt.Sprintf("activity %s navigation failed for %s: %v", e.Target, e.ActivityID.String(), e.Err)
}

// Unwrap exposes the underlying resolver or href validation error.
func (e ActivityNavigationError) Unwrap() error {
	return e.Err
}

// ActivityNavigationErrorHandler observes fail-open navigation projection
// errors independently of page enrichment observability.
type ActivityNavigationErrorHandler func(context.Context, ActivityReadContext, ActivityNavigationError)

// ActivityReadErrorHandler observes fail-open read-enrichment errors.
type ActivityReadErrorHandler func(context.Context, ActivityReadContext, error)

var errInvalidActivityReadScope = errors.New("activity read enrichment requires exact tenant and organization scope")

var errUnsafeActivityNavigationHref = errors.New("activity navigation href must be a safe local absolute path")

var errInvalidActivityNavigationResult = errors.New("activity navigation result count must match the authorized record count")

func validateActivityReadPage(readCtx ActivityReadContext, page types.ActivityPage) error {
	if readCtx.Scope.TenantID == uuid.Nil || readCtx.Scope.OrgID == uuid.Nil {
		return errInvalidActivityReadScope
	}
	for _, record := range page.Records {
		if record.TenantID != readCtx.Scope.TenantID || record.OrgID != readCtx.Scope.OrgID {
			return fmt.Errorf("%w: activity page contains a record outside the trusted scope", errInvalidActivityReadScope)
		}
	}
	return nil
}

func parseActivityFilter(c router.Context, actor types.ActorRef, scope types.ScopeFilter) (types.ActivityFilter, error) {
	limit, offset, err := parseActivityPagination(c)
	if err != nil {
		return types.ActivityFilter{}, err
	}

	userID, err := parseUUIDParam(c.Query("user_id"), "user_id")
	if err != nil {
		return types.ActivityFilter{}, err
	}
	actorID, err := parseUUIDParam(c.Query("actor_id"), "actor_id")
	if err != nil {
		return types.ActivityFilter{}, err
	}

	channel := strings.TrimSpace(c.Query("channel"))
	channels := parseCSVParams(queryValuesFallback(c, "channels"))
	if channel != "" && len(channels) > 0 {
		return types.ActivityFilter{}, activityQueryError("channel", "channel and channels are mutually exclusive")
	}

	since, err := parseTimeParam(c.Query("since"), "since")
	if err != nil {
		return types.ActivityFilter{}, err
	}
	until, err := parseTimeParam(c.Query("until"), "until")
	if err != nil {
		return types.ActivityFilter{}, err
	}

	return types.ActivityFilter{
		Actor:           actor,
		Scope:           scope,
		UserID:          userID,
		ActorID:         actorID,
		Verbs:           parseCSVParams(queryValuesFallback(c, "verb")),
		ObjectType:      strings.TrimSpace(c.Query("object_type")),
		ObjectID:        strings.TrimSpace(c.Query("object_id")),
		Channel:         channel,
		Channels:        channels,
		ChannelDenylist: parseCSVParams(queryValuesFallback(c, "channel_denylist")),
		Since:           since,
		Until:           until,
		Keyword:         strings.TrimSpace(c.Query("q")),
		Pagination:      types.Pagination{Limit: limit, Offset: offset},
	}, nil
}

func parseActivityPagination(c router.Context) (int, int, error) {
	limit := activityDefaultLimit
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return 0, 0, activityQueryError("limit", "limit must be an integer")
		}
		if parsed > 0 {
			limit = parsed
		}
	}
	if limit <= 0 {
		limit = activityDefaultLimit
	}
	if limit > activityMaxLimit {
		limit = activityMaxLimit
	}

	offset := 0
	if raw := strings.TrimSpace(c.Query("offset")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return 0, 0, activityQueryError("offset", "offset must be an integer")
		}
		if parsed < 0 {
			return 0, 0, activityQueryError("offset", "offset cannot be negative")
		}
		offset = parsed
	}
	return limit, offset, nil
}

func parseTimeParam(raw string, field string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	if parsed, err := time.Parse(time.RFC3339Nano, raw); err == nil {
		return &parsed, nil
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return &parsed, nil
	}
	return nil, activityQueryError(field, "timestamp must be RFC3339 or RFC3339Nano")
}

func parseUUIDParam(raw string, field string) (uuid.UUID, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return uuid.Nil, nil
	}
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, activityQueryError(field, "invalid UUID")
	}
	return parsed, nil
}

func queryValuesFallback(c router.Context, key string) []string {
	values := c.QueryValues(key)
	if len(values) == 0 {
		if raw := strings.TrimSpace(c.Query(key)); raw != "" {
			values = []string{raw}
		}
	}
	return values
}

func parseCSVParams(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, value := range values {
		for part := range strings.SplitSeq(value, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			if _, ok := seen[part]; ok {
				continue
			}
			seen[part] = struct{}{}
			out = append(out, part)
		}
	}
	return out
}

func activityQueryError(field, message string) error {
	err := goerrors.New(message, goerrors.CategoryValidation).WithCode(goerrors.CodeBadRequest)
	if field == "" {
		return err
	}
	return err.WithMetadata(map[string]any{"field": field})
}

func entriesFromUsersRecords(records []types.ActivityRecord) []ActivityEntry {
	if len(records) == 0 {
		return []ActivityEntry{}
	}
	entries := make([]ActivityEntry, 0, len(records))
	for _, record := range records {
		entries = append(entries, entryFromUsersRecord(record))
	}
	return entries
}

func entryFromUsersRecord(record types.ActivityRecord) ActivityEntry {
	metadata := primitives.CloneAnyMap(record.Data)
	actorDisplay := strings.TrimSpace(toString(metadata[usersactivity.DataKeyActorDisplay]))
	objectDisplay := strings.TrimSpace(toString(metadata[usersactivity.DataKeyObjectDisplay]))
	actionDisplay := strings.TrimSpace(toString(metadata[usersactivity.DataKeyActionDisplay]))
	actorID := primitives.FirstNonEmptyRaw(uuidString(record.ActorID), uuidString(record.UserID))
	objectRef := joinObject(strings.TrimSpace(record.ObjectType), strings.TrimSpace(record.ObjectID))
	return ActivityEntry{
		ID:        uuidString(record.ID),
		Actor:     primitives.FirstNonEmptyRaw(actorDisplay, actorID),
		Action:    primitives.FirstNonEmptyRaw(actionDisplay, strings.TrimSpace(record.Verb)),
		ActionKey: strings.TrimSpace(record.Verb),
		Object:    primitives.FirstNonEmptyRaw(objectDisplay, objectRef),
		Channel:   strings.TrimSpace(record.Channel),
		Metadata:  metadata,
		CreatedAt: record.OccurredAt,
	}
}

func (a *Admin) entriesFromActivityRecords(ctx context.Context, readCtx ActivityReadContext, records []types.ActivityRecord) []ActivityReadEntry {
	baseEntries := entriesFromUsersRecords(records)
	entries := make([]ActivityReadEntry, len(baseEntries))
	for index := range baseEntries {
		entries[index].ActivityEntry = baseEntries[index]
	}
	if a == nil || a.activityNavigationResolver == nil {
		return entries
	}
	if err := validateActivityReadPage(readCtx, types.ActivityPage{Records: records}); err != nil {
		return entries
	}
	detached := make([]types.ActivityRecord, len(records))
	for index := range records {
		detached[index] = records[index]
		detached[index].Data = primitives.CloneAnyMapDeep(records[index].Data)
	}
	navigations, err := a.activityNavigationResolver.ResolveActivityNavigation(ctx, readCtx, detached)
	if err == nil && len(navigations) != len(records) {
		err = fmt.Errorf("%w: got %d results for %d records", errInvalidActivityNavigationResult, len(navigations), len(records))
	}
	if err != nil {
		a.reportActivityNavigationError(ctx, readCtx, ActivityNavigationError{
			Target: ActivityNavigationTargetResolver,
			Err:    err,
		})
		return entries
	}
	for index, navigation := range navigations {
		record := records[index]
		actorHref, actorErr := safeActivityNavigationHref(navigation.ActorHref)
		if actorErr != nil {
			a.reportActivityNavigationError(ctx, readCtx, ActivityNavigationError{
				ActivityID: record.ID,
				Target:     ActivityNavigationTargetActor,
				Err:        actorErr,
			})
		} else {
			entries[index].ActorHref = actorHref
		}
		objectHref, objectErr := safeActivityNavigationHref(navigation.ObjectHref)
		if objectErr != nil {
			a.reportActivityNavigationError(ctx, readCtx, ActivityNavigationError{
				ActivityID: record.ID,
				Target:     ActivityNavigationTargetObject,
				Err:        objectErr,
			})
		} else {
			entries[index].ObjectHref = objectHref
		}
	}
	return entries
}

func safeActivityNavigationHref(raw string) (string, error) {
	href := strings.TrimSpace(raw)
	if href == "" {
		return "", nil
	}
	if !strings.HasPrefix(href, "/") || strings.HasPrefix(href, "//") || strings.ContainsRune(href, '\\') || strings.IndexFunc(href, isActivityNavigationControl) >= 0 {
		return "", errUnsafeActivityNavigationHref
	}
	parsed, err := url.Parse(href)
	if err != nil || parsed.IsAbs() || parsed.Host != "" || parsed.Opaque != "" || parsed.Path == "" || !strings.HasPrefix(parsed.Path, "/") {
		return "", errUnsafeActivityNavigationHref
	}
	if !safeActivityNavigationEncoding(parsed.EscapedPath()) || !safeActivityNavigationEncoding(href) {
		return "", errUnsafeActivityNavigationHref
	}
	return href, nil
}

func safeActivityNavigationEncoding(value string) bool {
	decoded, err := url.PathUnescape(value)
	if err != nil {
		return false
	}
	for {
		if strings.ContainsRune(decoded, '\\') || strings.IndexFunc(decoded, isActivityNavigationControl) >= 0 {
			return false
		}
		if !containsActivityNavigationEscape(decoded) {
			return true
		}
		next, err := url.PathUnescape(decoded)
		if err != nil {
			return false
		}
		decoded = next
	}
}

func containsActivityNavigationEscape(value string) bool {
	for index := 0; index+2 < len(value); index++ {
		if value[index] == '%' && isActivityNavigationHex(value[index+1]) && isActivityNavigationHex(value[index+2]) {
			return true
		}
	}
	return false
}

func isActivityNavigationHex(value byte) bool {
	return value >= '0' && value <= '9' || value >= 'a' && value <= 'f' || value >= 'A' && value <= 'F'
}

func isActivityNavigationControl(value rune) bool {
	return value < 0x20 || value == 0x7f
}

func uuidString(id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	return id.String()
}
