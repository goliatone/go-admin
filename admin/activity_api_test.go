package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
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

type captureActivityPageEnricher struct {
	calls   int
	readCtx ActivityReadContext
	page    usertypes.ActivityPage
	result  usertypes.ActivityPage
	err     error
}

func (c *captureActivityPageEnricher) EnrichActivityPage(_ context.Context, readCtx ActivityReadContext, page usertypes.ActivityPage) (usertypes.ActivityPage, error) {
	c.calls++
	c.readCtx = readCtx
	c.page = page
	if c.err != nil {
		return c.result, c.err
	}
	if c.result.Records != nil || c.result.Total != 0 || c.result.NextOffset != 0 || c.result.HasMore {
		return c.result, nil
	}
	return page, nil
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
	Entries    []ActivityReadEntry `json:"entries"`
	Total      int                 `json:"total"`
	NextOffset int                 `json:"next_offset"`
	HasMore    bool                `json:"has_more"`
}

func setupActivityServer(t *testing.T, deps Dependencies) router.Server[*httprouter.Router] {
	t.Helper()
	return setupActivityServerWithConfig(t, Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}, deps)
}

func setupActivityServerWithConfig(t *testing.T, cfg Config, deps Dependencies) router.Server[*httprouter.Router] {
	t.Helper()
	adm := mustNewAdmin(t, cfg, deps)
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("init: %v", err)
	}
	return server
}

type activityPermissionAuthorizer bool

func (a activityPermissionAuthorizer) Can(context.Context, string, string) bool {
	return bool(a)
}

func decodeActivityFilterOptionsResponse(t *testing.T, rr *httptest.ResponseRecorder) ActivityFilterOptions {
	t.Helper()
	var body ActivityFilterOptions
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode filter options response: %v", err)
	}
	return body
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
	errBody := decodeErrorPayload(t, rr)
	meta := mustAs[map[string]any](errBody["metadata"])
	if meta == nil {
		return ""
	}
	field := mustAs[string](meta["field"])
	return field
}

func decodeErrorPayload(t *testing.T, rr *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	errBody, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	return errBody
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestActivityRouteRequiresPermission(t *testing.T) {
	feed := &captureActivityFeedQuery{}
	enricher := &captureActivityPageEnricher{}
	navigationCalls := 0
	server := setupActivityServer(t, Dependencies{
		Authorizer:           denyAll{},
		ActivityFeedQuery:    feed,
		ActivityPageEnricher: enricher,
		ActivityNavigationResolver: ActivityNavigationResolverFunc(func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
			navigationCalls++
			return nil, nil
		}),
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: uuid.NewString()}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rr.Code, rr.Body.String())
	}
	if enricher.calls != 0 {
		t.Fatalf("expected unauthorized request not to call enricher, got %d calls", enricher.calls)
	}
	if navigationCalls != 0 {
		t.Fatalf("expected unauthorized request not to resolve navigation, got %d calls", navigationCalls)
	}
}

func TestActivityRouteEnrichesAuthorizedPageOnceWithTrustedScope(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	recordID := uuid.New()
	original := usertypes.ActivityPage{
		Records: []usertypes.ActivityRecord{{
			ID: recordID, ActorID: actorID, TenantID: tenantID, OrgID: orgID,
			Verb: "audience.update", ObjectType: "audience", ObjectID: "aud-1",
		}},
		Total: 7, NextOffset: 4, HasMore: true,
	}
	enriched := original
	enriched.Records = append([]usertypes.ActivityRecord(nil), original.Records...)
	enriched.Records[0].Data = map[string]any{
		usersactivity.DataKeyActorDisplay:  "Owner",
		usersactivity.DataKeyObjectDisplay: "VIP",
		usersactivity.DataKeyActionDisplay: "Updated audience",
	}
	enricher := &captureActivityPageEnricher{result: enriched}
	server := setupActivityServer(t, Dependencies{
		Authorizer:           allowAuthorizer{},
		ActivityFeedQuery:    &captureActivityFeedQuery{page: original},
		ActivityPageEnricher: enricher,
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID: actorID.String(), Role: "owner", TenantID: tenantID.String(), OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
	if enricher.calls != 1 {
		t.Fatalf("expected one enrichment call, got %d", enricher.calls)
	}
	if enricher.readCtx.Actor.ID != actorID || enricher.readCtx.Scope.TenantID != tenantID || enricher.readCtx.Scope.OrgID != orgID {
		t.Fatalf("unexpected trusted read context: %+v", enricher.readCtx)
	}
	body := decodeActivityResponse(t, rr)
	if body.Total != original.Total || body.NextOffset != original.NextOffset || body.HasMore != original.HasMore {
		t.Fatalf("pagination changed: %+v", body)
	}
	if len(body.Entries) != 1 || body.Entries[0].Actor != "Owner" || body.Entries[0].Object != "VIP" {
		t.Fatalf("unexpected enriched entries: %+v", body.Entries)
	}
	if body.Entries[0].Action != "Updated audience" || body.Entries[0].ActionKey != "audience.update" {
		t.Fatalf("unexpected action contract: %+v", body.Entries[0])
	}
}

func TestActivityRouteProjectsCRMNavigationAfterEnrichment(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	customerID := uuid.New()
	record := usertypes.ActivityRecord{
		ID: uuid.New(), ActorID: actorID, TenantID: tenantID, OrgID: orgID,
		Verb: "customer.consent.capture", ObjectType: "customer", ObjectID: customerID.String(),
	}
	enriched := usertypes.ActivityPage{Records: []usertypes.ActivityRecord{record}}
	enriched.Records[0].Data = map[string]any{
		usersactivity.DataKeyActorDisplay:  "Owner User",
		usersactivity.DataKeyObjectDisplay: "customer:" + customerID.String(),
	}
	navigationCalls := 0
	server := setupActivityServer(t, Dependencies{
		Authorizer:           allowAuthorizer{},
		ActivityFeedQuery:    &captureActivityFeedQuery{page: usertypes.ActivityPage{Records: []usertypes.ActivityRecord{record}}},
		ActivityPageEnricher: &captureActivityPageEnricher{result: enriched},
		ActivityNavigationResolver: ActivityNavigationResolverFunc(func(_ context.Context, readCtx ActivityReadContext, records []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
			navigationCalls++
			got := records[0]
			if readCtx.Actor.ID != actorID || readCtx.Scope.TenantID != tenantID || readCtx.Scope.OrgID != orgID {
				t.Fatalf("unexpected trusted navigation context: %+v", readCtx)
			}
			if got.Data[usersactivity.DataKeyActorDisplay] != "Owner User" || got.ObjectID != customerID.String() {
				t.Fatalf("navigation did not receive enriched canonical record: %+v", got)
			}
			return []ActivityNavigation{{
				ActorHref:  "/admin/users/" + actorID.String(),
				ObjectHref: "/admin/customers/" + customerID.String(),
			}}, nil
		}),
	})
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID: actorID.String(), Role: "owner", TenantID: tenantID.String(), OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	body := decodeActivityResponse(t, rr)
	if rr.Code != http.StatusOK || navigationCalls != 1 || len(body.Entries) != 1 {
		t.Fatalf("expected one CRM navigation projection, status=%d calls=%d body=%s", rr.Code, navigationCalls, rr.Body.String())
	}
	entry := body.Entries[0]
	if entry.Actor != "Owner User" || entry.ActorHref != "/admin/users/"+actorID.String() ||
		entry.Object != "customer:"+customerID.String() || entry.ObjectHref != "/admin/customers/"+customerID.String() {
		t.Fatalf("unexpected navigable Activity entry: %+v", entry)
	}
}

func TestActivityRouteNavigationFailureAndUnsafeHrefFailOpen(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	record := usertypes.ActivityRecord{ID: uuid.New(), ActorID: actorID, TenantID: tenantID, OrgID: orgID, Verb: "updated"}
	for _, tc := range []struct {
		name    string
		resolve ActivityNavigationResolverFunc
	}{
		{name: "resolver error", resolve: func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
			return nil, errors.New("route registry unavailable")
		}},
		{name: "unsafe href", resolve: func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
			return []ActivityNavigation{{ActorHref: "javascript:alert(1)"}}, nil
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			observed := 0
			readErrors := 0
			server := setupActivityServer(t, Dependencies{
				Authorizer:                 allowAuthorizer{},
				ActivityFeedQuery:          &captureActivityFeedQuery{page: usertypes.ActivityPage{Records: []usertypes.ActivityRecord{record}}},
				ActivityNavigationResolver: tc.resolve,
				ActivityNavigationErrorHandler: func(_ context.Context, _ ActivityReadContext, got ActivityNavigationError) {
					observed++
					if got.Target != ActivityNavigationTargetResolver && got.ActivityID != record.ID {
						t.Errorf("unexpected activity navigation error: %+v", got)
					}
				},
				ActivityReadErrorHandler: func(context.Context, ActivityReadContext, error) {
					readErrors++
				},
			})
			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
			req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
				ActorID: actorID.String(), TenantID: tenantID.String(), OrganizationID: orgID.String(),
			}))
			rr := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(rr, req)

			body := decodeActivityResponse(t, rr)
			if rr.Code != http.StatusOK || observed != 1 || readErrors != 0 || len(body.Entries) != 1 || body.Entries[0].ActorHref != "" || body.Entries[0].ObjectHref != "" {
				t.Fatalf("navigation failure must keep plain authorized entry: status=%d observed=%d read_errors=%d entries=%+v", rr.Code, observed, readErrors, body.Entries)
			}
		})
	}
}

func TestActivityRouteInvalidScopeFailsOpenBeforeEnricher(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	foreignOrgID := uuid.New()
	record := usertypes.ActivityRecord{
		ID: uuid.New(), ActorID: actorID, TenantID: tenantID, OrgID: foreignOrgID,
		Verb: "audience.update", ObjectType: "audience", ObjectID: "aud-1",
	}
	enricher := &captureActivityPageEnricher{}
	navigationCalls := 0
	observed := 0
	server := setupActivityServer(t, Dependencies{
		Authorizer:           allowAuthorizer{},
		ActivityFeedQuery:    &captureActivityFeedQuery{page: usertypes.ActivityPage{Records: []usertypes.ActivityRecord{record}}},
		ActivityPageEnricher: enricher,
		ActivityNavigationResolver: ActivityNavigationResolverFunc(func(context.Context, ActivityReadContext, []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
			navigationCalls++
			return nil, nil
		}),
		ActivityReadErrorHandler: func(_ context.Context, readCtx ActivityReadContext, err error) {
			observed++
			if readCtx.Scope.OrgID != orgID || !errors.Is(err, errInvalidActivityReadScope) {
				t.Errorf("unexpected enrichment error: scope=%+v err=%v", readCtx.Scope, err)
			}
		},
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID: actorID.String(), TenantID: tenantID.String(), OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK || enricher.calls != 0 || navigationCalls != 0 || observed != 1 {
		t.Fatalf("expected fail-open without enrichment or navigation, status=%d enrichment_calls=%d navigation_calls=%d observed=%d body=%s", rr.Code, enricher.calls, navigationCalls, observed, rr.Body.String())
	}
	body := decodeActivityResponse(t, rr)
	if len(body.Entries) != 1 || body.Entries[0].Actor != actorID.String() {
		t.Fatalf("expected original UUID fallback, got %+v", body.Entries)
	}
}

func TestActivityRouteInvalidEnrichedScopeFallsBackBeforeNavigation(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	record := usertypes.ActivityRecord{
		ID: uuid.New(), ActorID: actorID, TenantID: tenantID, OrgID: orgID,
		Verb: "customer.read", ObjectType: "customer", ObjectID: uuid.NewString(),
	}
	foreign := record
	foreign.ID = uuid.New()
	foreign.OrgID = uuid.New()
	foreign.Data = map[string]any{usersactivity.DataKeyActorDisplay: "Foreign Actor"}
	navigationCalls := 0
	observed := 0
	server := setupActivityServer(t, Dependencies{
		Authorizer:        allowAuthorizer{},
		ActivityFeedQuery: &captureActivityFeedQuery{page: usertypes.ActivityPage{Records: []usertypes.ActivityRecord{record}}},
		ActivityPageEnricher: &captureActivityPageEnricher{result: usertypes.ActivityPage{
			Records: []usertypes.ActivityRecord{foreign},
		}},
		ActivityNavigationResolver: ActivityNavigationResolverFunc(func(_ context.Context, _ ActivityReadContext, records []usertypes.ActivityRecord) ([]ActivityNavigation, error) {
			navigationCalls++
			return make([]ActivityNavigation, len(records)), nil
		}),
		ActivityReadErrorHandler: func(_ context.Context, _ ActivityReadContext, err error) {
			observed++
			if !errors.Is(err, errInvalidActivityReadScope) {
				t.Errorf("unexpected enrichment scope error: %v", err)
			}
		},
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID: actorID.String(), TenantID: tenantID.String(), OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	body := decodeActivityResponse(t, rr)
	if rr.Code != http.StatusOK || observed != 1 || navigationCalls != 1 || len(body.Entries) != 1 {
		t.Fatalf("invalid enriched scope must fall back to the original scoped page: status=%d observed=%d navigation=%d entries=%+v", rr.Code, observed, navigationCalls, body.Entries)
	}
	if body.Entries[0].ID != record.ID.String() || body.Entries[0].Actor != actorID.String() {
		t.Fatalf("foreign enriched record escaped fallback: %+v", body.Entries[0])
	}
}

func TestActivityRouteEnrichmentErrorReturnsOriginalPage(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	record := usertypes.ActivityRecord{
		ID: uuid.New(), ActorID: actorID, TenantID: tenantID, OrgID: orgID,
		Verb: "audience.update", ObjectType: "audience", ObjectID: "aud-1",
		Data: map[string]any{
			usersactivity.DataKeyActorDisplay:  "Forged Actor",
			usersactivity.DataKeyObjectDisplay: "Forged Customer PII",
			usersactivity.DataKeyActionDisplay: "Forged action",
		},
	}
	enricherErr := errors.New("resolver unavailable")
	enricher := &captureActivityPageEnricher{
		result: usertypes.ActivityPage{Records: []usertypes.ActivityRecord{{Data: map[string]any{usersactivity.DataKeyActorDisplay: "unsafe partial"}}}},
		err:    enricherErr,
	}
	observed := 0
	server := setupActivityServer(t, Dependencies{
		Authorizer:           allowAuthorizer{},
		ActivityFeedQuery:    &captureActivityFeedQuery{page: usertypes.ActivityPage{Records: []usertypes.ActivityRecord{record}}},
		ActivityPageEnricher: enricher,
		ActivityReadErrorHandler: func(_ context.Context, _ ActivityReadContext, err error) {
			observed++
			if !errors.Is(err, enricherErr) {
				t.Errorf("unexpected enrichment error: %v", err)
			}
		},
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID: actorID.String(), TenantID: tenantID.String(), OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	body := decodeActivityResponse(t, rr)
	if rr.Code != http.StatusOK || enricher.calls != 1 || observed != 1 || len(body.Entries) != 1 || body.Entries[0].Actor != actorID.String() {
		t.Fatalf("expected original fail-open page, status=%d calls=%d observed=%d entries=%+v", rr.Code, enricher.calls, observed, body.Entries)
	}
	if body.Entries[0].Object != "audience:aud-1" || body.Entries[0].Action != "audience.update" || body.Entries[0].ActionKey != "audience.update" {
		t.Fatalf("expected safe canonical fail-open presentation, got %+v", body.Entries[0])
	}
}

func TestActivityRouteRejectsNonUUIDActorID(t *testing.T) {
	feed := &captureActivityFeedQuery{}
	server := setupActivityServer(t, Dependencies{
		Authorizer:        allowAuthorizer{},
		ActivityFeedQuery: feed,
	})
	tenantID := uuid.New()
	orgID := uuid.New()

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID:        "system-admin",
		Role:           "admin",
		TenantID:       tenantID.String(),
		OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
	errBody := decodeErrorPayload(t, rr)
	if textCode := mustAs[string](errBody["text_code"]); textCode != TextCodeActivityActorContextInvalid {
		t.Fatalf("expected text code %s, got %v", TextCodeActivityActorContextInvalid, errBody["text_code"])
	}
	msg := mustAs[string](errBody["message"])
	if !strings.Contains(msg, "actor_id") || !strings.Contains(msg, "UUID") {
		t.Fatalf("expected clear actor_id/UUID message, got %q", msg)
	}
	meta := mustAs[map[string]any](errBody["metadata"])
	if meta == nil {
		t.Fatalf("expected metadata in error payload")
	}
	if got := mustAs[string](meta["actor_id"]); got != "system-admin" {
		t.Fatalf("expected actor_id metadata system-admin, got %q", got)
	}
	if got := mustAs[string](meta["field"]); got != "actor_id" {
		t.Fatalf("expected field metadata actor_id, got %q", got)
	}
	if got := mustAs[string](meta["source_text_code"]); got != "ACTOR_CONTEXT_INVALID" {
		t.Fatalf("expected source text code ACTOR_CONTEXT_INVALID, got %q", got)
	}
}

func TestActivityRouteRejectsNonUUIDActorIDWithDefaultPolicy(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	repo := &stubActivityRepository{
		records: []usertypes.ActivityRecord{
			{
				ID:         uuid.New(),
				Verb:       "login",
				ObjectType: "user",
				ObjectID:   "user-1",
				OccurredAt: time.Now().UTC(),
			},
		},
	}
	server := setupActivityServer(t, Dependencies{
		Authorizer:         allowAuthorizer{},
		ActivityRepository: repo,
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID:        "system-admin",
		Role:           "admin",
		TenantID:       tenantID.String(),
		OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
	errBody := decodeErrorPayload(t, rr)
	if textCode := mustAs[string](errBody["text_code"]); textCode != TextCodeActivityActorContextInvalid {
		t.Fatalf("expected text code %s, got %v", TextCodeActivityActorContextInvalid, errBody["text_code"])
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity?limit=1", nil)
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: uuid.NewString()}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestActivityFilterOptionsRouteReturnsAuthorizedSnapshot(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	providerCalls := 0
	var captured ActivityFilterOptionsQuery
	server := setupActivityServerWithConfig(t, Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		ActivityFilterOptions: ActivityFilterOptionsConfig{
			MaxOptions: 4,
			Verbs:      []ActivityFilterOption{{Value: "created", Label: "Created"}},
		},
	}, Dependencies{
		Authorizer:        allowAuthorizer{},
		ActivityFeedQuery: &captureActivityFeedQuery{},
		ActivityFilterOptionsProvider: ActivityFilterOptionsProviderFunc(func(_ context.Context, query ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
			providerCalls++
			captured = query
			return ActivityFilterOptions{
				Channels: []ActivityFilterOption{{Value: "audit", Label: "Audit"}},
				Revision: "catalog-2",
			}, nil
		}),
	})

	values := url.Values{}
	values.Add("verb", "created,stale")
	values.Add("verb", "updated")
	values.Add("channels", "audit")
	values.Set("object_type", "user")
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity/filter-options?"+values.Encode(), nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID: actorID.String(), Role: "member", TenantID: tenantID.String(), OrganizationID: orgID.String(),
	}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("filter options status: %d body=%s", rr.Code, rr.Body.String())
	}
	if got := rr.Header().Get("Cache-Control"); got != "private, no-store" {
		t.Fatalf("Cache-Control = %q", got)
	}
	got := decodeActivityFilterOptionsResponse(t, rr)
	if providerCalls != 1 || got.Revision != "catalog-2" {
		t.Fatalf("provider calls/revision = %d/%q", providerCalls, got.Revision)
	}
	if captured.ReadContext.Actor.ID != actorID || captured.EffectiveFilter.Scope.TenantID != tenantID || captured.EffectiveFilter.Scope.OrgID != orgID {
		t.Fatalf("trusted provider context = %#v", captured)
	}
	if captured.EffectiveFilter.UserID != actorID || captured.EffectiveFilter.ActorID != actorID {
		t.Fatalf("member self-only filter = %#v", captured.EffectiveFilter)
	}
	if len(captured.EffectiveFilter.Verbs) != 0 || captured.EffectiveFilter.ObjectType != "" {
		t.Fatalf("selection narrowed effective filter: %#v", captured.EffectiveFilter)
	}
	if len(captured.Selected.Verbs) != 3 || captured.Selected.ObjectType != "user" {
		t.Fatalf("normalized selections = %#v", captured.Selected)
	}
	if len(got.Verbs) != 3 || len(got.Channels) != 1 || len(got.ObjectTypes) != 1 {
		t.Fatalf("response options = %#v", got)
	}
}

func TestActivityFilterOptionsRouteRejectsNonSelectionQueryBeforeProvider(t *testing.T) {
	for _, field := range []string{"actor_id", "user_id", "tenant_id", "org_id", "scope", "role", "channel", "channel_denylist", "object_id", "q", "since", "until", "limit", "offset"} {
		t.Run(field, func(t *testing.T) {
			calls := 0
			server := setupActivityServer(t, Dependencies{
				Authorizer:        allowAuthorizer{},
				ActivityFeedQuery: &captureActivityFeedQuery{},
				ActivityFilterOptionsProvider: ActivityFilterOptionsProviderFunc(func(context.Context, ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
					calls++
					return ActivityFilterOptions{}, nil
				}),
			})
			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity/filter-options?"+field+"=supplied", nil)
			req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: uuid.NewString()}))
			rr := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(rr, req)
			if rr.Code != http.StatusBadRequest || calls != 0 {
				t.Fatalf("status/calls = %d/%d body=%s", rr.Code, calls, rr.Body.String())
			}
			if got := rr.Header().Get("Cache-Control"); got != "private, no-store" {
				t.Fatalf("error Cache-Control = %q", got)
			}
		})
	}
}

func TestActivityFilterOptionsRoutePermissionAndFeatureDisabled(t *testing.T) {
	reqFor := func() *http.Request {
		req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity/filter-options", nil)
		return req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: uuid.NewString()}))
	}

	denied := setupActivityServer(t, Dependencies{
		Authorizer:        activityPermissionAuthorizer(false),
		ActivityFeedQuery: &captureActivityFeedQuery{},
	})
	rr := httptest.NewRecorder()
	denied.WrappedRouter().ServeHTTP(rr, reqFor())
	if rr.Code != http.StatusForbidden || rr.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("denied status/cache = %d/%q body=%s", rr.Code, rr.Header().Get("Cache-Control"), rr.Body.String())
	}

	disabled := setupActivityServer(t, Dependencies{Authorizer: allowAuthorizer{}})
	rr = httptest.NewRecorder()
	disabled.WrappedRouter().ServeHTTP(rr, reqFor())
	if rr.Code != http.StatusNotFound || rr.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("disabled status/cache = %d/%q body=%s", rr.Code, rr.Header().Get("Cache-Control"), rr.Body.String())
	}
}

func TestActivityFilterOptionsRoutePolicyErrors(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		status int
	}{
		{name: "permission denial", err: goerrors.New("options denied", goerrors.CategoryAuthz).WithCode(http.StatusForbidden), status: http.StatusForbidden},
		{name: "policy failure", err: errors.New("policy failed"), status: http.StatusInternalServerError},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			server := setupActivityServer(t, Dependencies{
				Authorizer:        allowAuthorizer{},
				ActivityFeedQuery: &captureActivityFeedQuery{},
				ActivityFilterOptionsPolicy: ActivityFilterOptionsPolicyFunc(func(context.Context, ActivityFilterOptionsQuery, ActivityFilterOptions) (ActivityFilterOptions, error) {
					return ActivityFilterOptions{}, tc.err
				}),
			})
			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity/filter-options", nil)
			req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: uuid.NewString()}))
			rr := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(rr, req)
			if rr.Code != tc.status || rr.Header().Get("Cache-Control") != "private, no-store" {
				t.Fatalf("status/cache = %d/%q want %d body=%s", rr.Code, rr.Header().Get("Cache-Control"), tc.status, rr.Body.String())
			}
		})
	}
}

func TestActivityFilterOptionsRoutePassesChannelAndMachinePolicyToProvider(t *testing.T) {
	actorID := uuid.New()
	var captured ActivityFilterOptionsQuery
	policy := newDefaultActivityAccessPolicy(usersactivity.WithPolicyFilterOptions(
		usersactivity.WithChannelAllowlist("audit", "security"),
		usersactivity.WithChannelDenylist("security"),
		usersactivity.WithMachineActivityEnabled(false),
	))
	server := setupActivityServer(t, Dependencies{
		Authorizer:           allowAuthorizer{},
		ActivityFeedQuery:    &captureActivityFeedQuery{},
		ActivityAccessPolicy: policy,
		ActivityFilterOptionsProvider: ActivityFilterOptionsProviderFunc(func(_ context.Context, query ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
			captured = query
			return ActivityFilterOptions{}, nil
		}),
	})
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity/filter-options?channels=browser-selection", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: actorID.String(), Role: "member"}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if !reflect.DeepEqual(captured.EffectiveFilter.Channels, []string{"audit"}) || !reflect.DeepEqual(captured.EffectiveFilter.ChannelDenylist, []string{"security"}) {
		t.Fatalf("channel policy filter = %#v", captured.EffectiveFilter)
	}
	if captured.EffectiveFilter.MachineActivityEnabled == nil || *captured.EffectiveFilter.MachineActivityEnabled {
		t.Fatalf("machine policy filter = %#v", captured.EffectiveFilter)
	}
	if !reflect.DeepEqual(captured.Selected.Channels, []string{"browser-selection"}) {
		t.Fatalf("selected channels = %#v", captured.Selected.Channels)
	}
}

func TestActivityFilterOptionsRouteAdminIsNotSelfScoped(t *testing.T) {
	actorID := uuid.New()
	var captured ActivityFilterOptionsQuery
	server := setupActivityServer(t, Dependencies{
		Authorizer:        allowAuthorizer{},
		ActivityFeedQuery: &captureActivityFeedQuery{},
		ActivityFilterOptionsProvider: ActivityFilterOptionsProviderFunc(func(_ context.Context, query ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
			captured = query
			return ActivityFilterOptions{}, nil
		}),
	})
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity/filter-options", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{ActorID: actorID.String(), Role: "admin"}))
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s", rr.Code, rr.Body.String())
	}
	if captured.EffectiveFilter.UserID != uuid.Nil || captured.EffectiveFilter.ActorID != uuid.Nil {
		t.Fatalf("admin unexpectedly self-scoped: %#v", captured.EffectiveFilter)
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity?"+values.Encode(), nil)
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
			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, nil)
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

			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity?"+tc.query, nil)
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
	policy := newDefaultActivityAccessPolicy(
		usersactivity.WithPolicyFilterOptions(usersactivity.WithMachineActivityEnabled(false)),
	)
	server := setupActivityServer(t, Dependencies{
		Authorizer:           allowAuthorizer{},
		ActivityRepository:   repo,
		ActivityAccessPolicy: policy,
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
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

func TestActivityPolicyMasksActorEmailAndSessionID(t *testing.T) {
	actorID := uuid.New()
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
				Data: map[string]any{
					usersactivity.DataKeyActorEmail: "admin@example.com",
					usersactivity.DataKeySessionID:  "session-12345",
				},
				OccurredAt: now,
			},
		},
	}

	server := setupActivityServer(t, Dependencies{
		Authorizer:         allowAuthorizer{},
		ActivityRepository: repo,
	})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/api/activity", nil)
	req = req.WithContext(auth.WithActorContext(req.Context(), &auth.ActorContext{
		ActorID: actorID.String(),
		Role:    "member",
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

	meta := body.Entries[0].Metadata
	email := mustAs[string](meta[usersactivity.DataKeyActorEmail])
	if email == "admin@example.com" || strings.TrimSpace(email) == "" {
		t.Fatalf("expected actor_email to be masked, got %q", email)
	}
	sessionID := mustAs[string](meta[usersactivity.DataKeySessionID])
	if sessionID == "session-12345" || strings.TrimSpace(sessionID) == "" {
		t.Fatalf("expected session_id to be masked, got %q", sessionID)
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

func TestSessionIDFromContextPrefersJWTID(t *testing.T) {
	jti := "jwt-123"
	claims := &auth.JWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{ID: jti},
		Metadata:         map[string]any{"session_id": "meta-1"},
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	ctx = auth.WithActorContext(ctx, &auth.ActorContext{
		ActorID:  uuid.NewString(),
		Metadata: map[string]any{"session_id": "actor-1"},
	})

	got, ok := sessionIDFromContext(ctx)
	if !ok {
		t.Fatalf("expected session id from jwt id")
	}
	if got != jti {
		t.Fatalf("expected session id %q, got %q", jti, got)
	}
}

func TestSessionIDFromContextPrefersClaimsMetadata(t *testing.T) {
	metaID := "meta-123"
	claims := &auth.JWTClaims{
		Metadata: map[string]any{"session_id": metaID},
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	ctx = auth.WithActorContext(ctx, &auth.ActorContext{
		ActorID:  uuid.NewString(),
		Metadata: map[string]any{"session_id": "actor-1"},
	})

	got, ok := sessionIDFromContext(ctx)
	if !ok {
		t.Fatalf("expected session id from claims metadata")
	}
	if got != metaID {
		t.Fatalf("expected session id %q, got %q", metaID, got)
	}
}
