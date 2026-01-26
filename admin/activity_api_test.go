package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"strings"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	usersactivity "github.com/goliatone/go-users/activity"
	usertypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
)

type captureActivityFeedQuery struct {
	lastFilter usertypes.ActivityFilter
	page       usertypes.ActivityPage
	err        error
}

func (c *captureActivityFeedQuery) Query(ctx context.Context, filter usertypes.ActivityFilter) (usertypes.ActivityPage, error) {
	c.lastFilter = filter
	if c.err != nil {
		return usertypes.ActivityPage{}, c.err
	}
	return c.page, nil
}

type stubActivityRepository struct {
	records    []usertypes.ActivityRecord
	page       usertypes.ActivityPage
	err        error
	lastFilter usertypes.ActivityFilter
}

func (s *stubActivityRepository) ListActivity(ctx context.Context, filter usertypes.ActivityFilter) (usertypes.ActivityPage, error) {
	s.lastFilter = filter
	if s.err != nil {
		return usertypes.ActivityPage{}, s.err
	}
	if s.page.Records != nil || s.page.Total != 0 || s.page.NextOffset != 0 || s.page.HasMore {
		return s.page, nil
	}
	records := s.records
	if filter.MachineActivityEnabled != nil && !*filter.MachineActivityEnabled {
		records = filterMachineRecords(records, filter.MachineActorTypes, filter.MachineDataKeys)
	}
	return usertypes.ActivityPage{
		Records:    records,
		Total:      len(records),
		NextOffset: filter.Pagination.Offset + len(records),
		HasMore:    false,
	}, nil
}

func (s *stubActivityRepository) ActivityStats(ctx context.Context, filter usertypes.ActivityStatsFilter) (usertypes.ActivityStats, error) {
	return usertypes.ActivityStats{}, nil
}

type activityListResponse struct {
	Entries    []ActivityEntry `json:"entries"`
	Total      int             `json:"total"`
	NextOffset int             `json:"next_offset"`
	HasMore    bool            `json:"has_more"`
}

func setupActivityServer(t *testing.T, deps Dependencies) router.Server[*httprouter.Router] {
	t.Helper()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, deps)
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("init: %v", err)
	}
	return server
}

func decodeActivityResponse(t *testing.T, rr *httptest.ResponseRecorder) activityListResponse {
	t.Helper()
	var body activityListResponse
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return body
}

func decodeErrorField(t *testing.T, rr *httptest.ResponseRecorder) string {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	errBody, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	meta, _ := errBody["metadata"].(map[string]any)
	if meta == nil {
		return ""
	}
	field, _ := meta["field"].(string)
	return field
}

func filterMachineRecords(records []usertypes.ActivityRecord, actorTypes, dataKeys []string) []usertypes.ActivityRecord {
	if len(records) == 0 {
		return records
	}
	out := make([]usertypes.ActivityRecord, 0, len(records))
	for _, record := range records {
		if isMachineRecord(record.Data, actorTypes, dataKeys) {
			continue
		}
		out = append(out, record)
	}
	return out
}

func isMachineRecord(data map[string]any, actorTypes, dataKeys []string) bool {
	if len(data) == 0 {
		return false
	}
	if len(actorTypes) > 0 {
		if raw, ok := data[ActivityActorTypeKey]; ok && containsNormalized(actorTypes, stringValue(raw)) {
			return true
		}
		if raw, ok := data[ActivityActorTypeKeyLegacy]; ok && containsNormalized(actorTypes, stringValue(raw)) {
			return true
		}
		if actor, ok := data["actor"].(map[string]any); ok {
			if raw, ok := actor["type"]; ok && containsNormalized(actorTypes, stringValue(raw)) {
				return true
			}
		}
	}
	if len(dataKeys) == 0 {
		return false
	}
	for key, value := range data {
		if !containsNormalized(dataKeys, key) {
			continue
		}
		if isTruthy(value) {
			return true
		}
	}
	return false
}

func containsNormalized(list []string, value string) bool {
	value = normalizeIdentifier(value)
	for _, item := range list {
		if normalizeIdentifier(item) == value {
			return true
		}
	}
	return false
}

func normalizeIdentifier(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func stringValue(value any) string {
	if value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return text
	}
	return ""
}

func isTruthy(value any) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		return normalizeIdentifier(v) == "true"
	default:
		return false
	}
}

func TestActivityRouteRequiresActorContext(t *testing.T) {
	feed := &captureActivityFeedQuery{}
	server := setupActivityServer(t, Dependencies{
		Authorizer:        allowAuthorizer{},
		ActivityFeedQuery: feed,
	})

	req := httptest.NewRequest("GET", "/admin/api/activity", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestActivityRouteRequiresPermission(t *testing.T) {
	feed := &captureActivityFeedQuery{}
	server := setupActivityServer(t, Dependencies{
		Authorizer:        denyAll{},
		ActivityFeedQuery: feed,
	})

	req := httptest.NewRequest("GET", "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: uuid.NewString()}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestActivityRoutePaginationMetadata(t *testing.T) {
	feed := &captureActivityFeedQuery{
		page: usertypes.ActivityPage{
			Records:    []usertypes.ActivityRecord{},
			Total:      12,
			NextOffset: 50,
			HasMore:    true,
		},
	}
	server := setupActivityServer(t, Dependencies{
		Authorizer:        allowAuthorizer{},
		ActivityFeedQuery: feed,
	})

	req := httptest.NewRequest("GET", "/admin/api/activity?limit=1", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: uuid.NewString()}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("activity status: %d body=%s", rr.Code, rr.Body.String())
	}

	body := decodeActivityResponse(t, rr)
	if body.Total != 12 {
		t.Fatalf("expected total 12, got %d", body.Total)
	}
	if body.NextOffset != 50 {
		t.Fatalf("expected next_offset 50, got %d", body.NextOffset)
	}
	if !body.HasMore {
		t.Fatalf("expected has_more true")
	}
}

func TestActivityRouteFeatureDisabledWhenNoFeed(t *testing.T) {
	server := setupActivityServer(t, Dependencies{
		Authorizer: allowAuthorizer{},
	})

	req := httptest.NewRequest("GET", "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: uuid.NewString()}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestActivityRouteParsesActivityFilter(t *testing.T) {
	feed := &captureActivityFeedQuery{}
	server := setupActivityServer(t, Dependencies{
		Authorizer:        allowAuthorizer{},
		ActivityFeedQuery: feed,
	})

	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	userID := uuid.New()
	actorFilterID := uuid.New()
	since := time.Date(2024, 1, 2, 10, 0, 0, 0, time.UTC)
	until := since.Add(2 * time.Hour)

	values := url.Values{}
	values.Set("user_id", userID.String())
	values.Set("actor_id", actorFilterID.String())
	values.Add("verb", "login")
	values.Add("verb", "logout")
	values.Add("verb", "login")
	values.Set("object_type", "item")
	values.Set("object_id", "item-1")
	values.Set("channels", "admin,system,admin")
	values.Set("channel_denylist", "internal,system,internal")
	values.Set("since", since.Format(time.RFC3339))
	values.Set("until", until.Format(time.RFC3339))
	values.Set("q", "search")
	values.Set("limit", "25")
	values.Set("offset", "10")

	req := httptest.NewRequest("GET", "/admin/api/activity?"+values.Encode(), nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID:        actorID.String(),
		Role:           "member",
		TenantID:       tenantID.String(),
		OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("activity status: %d body=%s", rr.Code, rr.Body.String())
	}

	filter := feed.lastFilter
	if filter.Actor.ID != actorID {
		t.Fatalf("expected actor %s, got %s", actorID, filter.Actor.ID)
	}
	if filter.Actor.Type != "member" {
		t.Fatalf("expected actor type member, got %s", filter.Actor.Type)
	}
	if filter.Scope.TenantID != tenantID {
		t.Fatalf("expected tenant scope %s, got %s", tenantID, filter.Scope.TenantID)
	}
	if filter.Scope.OrgID != orgID {
		t.Fatalf("expected org scope %s, got %s", orgID, filter.Scope.OrgID)
	}
	if filter.UserID != userID {
		t.Fatalf("expected user_id %s, got %s", userID, filter.UserID)
	}
	if filter.ActorID != actorFilterID {
		t.Fatalf("expected actor_id %s, got %s", actorFilterID, filter.ActorID)
	}
	if !reflect.DeepEqual(filter.Verbs, []string{"login", "logout"}) {
		t.Fatalf("expected verbs [login logout], got %v", filter.Verbs)
	}
	if filter.ObjectType != "item" {
		t.Fatalf("expected object_type item, got %s", filter.ObjectType)
	}
	if filter.ObjectID != "item-1" {
		t.Fatalf("expected object_id item-1, got %s", filter.ObjectID)
	}
	if filter.Channel != "" {
		t.Fatalf("expected empty channel, got %s", filter.Channel)
	}
	if !reflect.DeepEqual(filter.Channels, []string{"admin", "system"}) {
		t.Fatalf("expected channels [admin system], got %v", filter.Channels)
	}
	if !reflect.DeepEqual(filter.ChannelDenylist, []string{"internal", "system"}) {
		t.Fatalf("expected channel denylist [internal system], got %v", filter.ChannelDenylist)
	}
	if filter.Since == nil || !filter.Since.Equal(since) {
		t.Fatalf("expected since %s, got %v", since, filter.Since)
	}
	if filter.Until == nil || !filter.Until.Equal(until) {
		t.Fatalf("expected until %s, got %v", until, filter.Until)
	}
	if filter.Keyword != "search" {
		t.Fatalf("expected keyword search, got %s", filter.Keyword)
	}
	if filter.Pagination.Limit != 25 {
		t.Fatalf("expected limit 25, got %d", filter.Pagination.Limit)
	}
	if filter.Pagination.Offset != 10 {
		t.Fatalf("expected offset 10, got %d", filter.Pagination.Offset)
	}
}

func TestActivityRoutePaginationDefaultsAndClamp(t *testing.T) {
	actorCtx := &auth.ActorContext{ActorID: uuid.NewString()}
	cases := []struct {
		name  string
		query string
		want  int
	}{
		{name: "default limit", query: "", want: 50},
		{name: "clamp limit", query: "limit=500", want: 200},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			feed := &captureActivityFeedQuery{}
			server := setupActivityServer(t, Dependencies{
				Authorizer:        allowAuthorizer{},
				ActivityFeedQuery: feed,
			})

			path := "/admin/api/activity"
			if tc.query != "" {
				path += "?" + tc.query
			}
			req := httptest.NewRequest("GET", path, nil)
			req = req.WithContext(auth.WithActorContext(req.Context(), actorCtx))
			rr := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(rr, req)

			if rr.Code != http.StatusOK {
				t.Fatalf("activity status: %d body=%s", rr.Code, rr.Body.String())
			}
			if feed.lastFilter.Pagination.Limit != tc.want {
				t.Fatalf("expected limit %d, got %d", tc.want, feed.lastFilter.Pagination.Limit)
			}
		})
	}
}

func TestActivityRouteRejectsInvalidQueryParams(t *testing.T) {
	actorCtx := &auth.ActorContext{ActorID: uuid.NewString()}
	cases := []struct {
		name  string
		query string
		field string
	}{
		{name: "channel and channels", query: "channel=admin&channels=admin", field: "channel"},
		{name: "invalid since", query: "since=not-a-time", field: "since"},
		{name: "negative offset", query: "offset=-1", field: "offset"},
		{name: "invalid uuid", query: "user_id=not-a-uuid", field: "user_id"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			feed := &captureActivityFeedQuery{}
			server := setupActivityServer(t, Dependencies{
				Authorizer:        allowAuthorizer{},
				ActivityFeedQuery: feed,
			})

			req := httptest.NewRequest("GET", "/admin/api/activity?"+tc.query, nil)
			req = req.WithContext(auth.WithActorContext(req.Context(), actorCtx))
			rr := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(rr, req)

			if rr.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
			}
			if field := decodeErrorField(t, rr); field != tc.field {
				t.Fatalf("expected field %s, got %s", tc.field, field)
			}
		})
	}
}

func TestActivityPolicyScopingSanitizerAndMachineFiltering(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	now := time.Now().UTC()

	repo := &stubActivityRepository{
		records: []usertypes.ActivityRecord{
			{
				ID:         uuid.New(),
				ActorID:    actorID,
				UserID:     actorID,
				Verb:       "login",
				ObjectType: "user",
				ObjectID:   "user-1",
				Data:       map[string]any{"token": "abcd1234"},
				OccurredAt: now,
			},
			{
				ID:         uuid.New(),
				ActorID:    actorID,
				UserID:     actorID,
				Verb:       "job.run",
				ObjectType: "job",
				ObjectID:   "job-1",
				Data:       map[string]any{ActivityActorTypeKey: ActivityActorTypeSystem, "token": "secret2"},
				OccurredAt: now.Add(-1 * time.Minute),
			},
		},
	}
	policy := usersactivity.NewDefaultAccessPolicy(
		usersactivity.WithPolicyFilterOptions(usersactivity.WithMachineActivityEnabled(false)),
	)
	server := setupActivityServer(t, Dependencies{
		Authorizer:           allowAuthorizer{},
		ActivityRepository:   repo,
		ActivityAccessPolicy: policy,
	})

	req := httptest.NewRequest("GET", "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID:        actorID.String(),
		Role:           "member",
		TenantID:       tenantID.String(),
		OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("activity status: %d body=%s", rr.Code, rr.Body.String())
	}

	body := decodeActivityResponse(t, rr)
	if len(body.Entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(body.Entries))
	}
	if token := body.Entries[0].Metadata["token"]; token == "abcd1234" {
		t.Fatalf("expected token to be masked, got %v", token)
	}

	filter := repo.lastFilter
	if filter.UserID != actorID {
		t.Fatalf("expected policy user_id %s, got %s", actorID, filter.UserID)
	}
	if filter.ActorID != actorID {
		t.Fatalf("expected policy actor_id %s, got %s", actorID, filter.ActorID)
	}
	if filter.Scope.TenantID != tenantID {
		t.Fatalf("expected policy tenant scope %s, got %s", tenantID, filter.Scope.TenantID)
	}
	if filter.Scope.OrgID != orgID {
		t.Fatalf("expected policy org scope %s, got %s", orgID, filter.Scope.OrgID)
	}
	if filter.MachineActivityEnabled == nil || *filter.MachineActivityEnabled {
		t.Fatalf("expected machine activity disabled, got %v", filter.MachineActivityEnabled)
	}
	if !containsNormalized(filter.MachineActorTypes, "system") {
		t.Fatalf("expected machine actor types to include system, got %v", filter.MachineActorTypes)
	}
}

func TestSessionIDFromContextUsesActorMetadata(t *testing.T) {
	sessionID := "session-456"
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID:  uuid.NewString(),
		Metadata: map[string]any{"session_id": sessionID},
	})

	got, ok := sessionIDFromContext(ctx)
	if !ok {
		t.Fatalf("expected session id from actor metadata")
	}
	if got != sessionID {
		t.Fatalf("expected session id %q, got %q", sessionID, got)
	}
}
