package quickstart

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type stubPreferenceRepo struct {
	records   map[string]types.PreferenceRecord
	upserts   []types.PreferenceRecord
	upsertErr error
}

func newStubPreferenceRepo() *stubPreferenceRepo {
	return &stubPreferenceRepo{
		records: map[string]types.PreferenceRecord{},
	}
}

func (s *stubPreferenceRepo) ListPreferences(_ context.Context, filter types.PreferenceFilter) ([]types.PreferenceRecord, error) {
	out := []types.PreferenceRecord{}
	for _, record := range s.records {
		if !matchesPreferenceFilter(record, filter) {
			continue
		}
		out = append(out, record)
	}
	return out, nil
}

func (s *stubPreferenceRepo) UpsertPreference(_ context.Context, record types.PreferenceRecord) (*types.PreferenceRecord, error) {
	if s.upsertErr != nil {
		return nil, s.upsertErr
	}
	if existing, ok := s.records[recordKey(record)]; ok {
		record.ID = existing.ID
		if record.Version == 0 {
			record.Version = existing.Version + 1
		}
	}
	if record.ID == uuid.Nil {
		record.ID = uuid.New()
	}
	if record.Version == 0 {
		record.Version = 1
	}
	s.records[recordKey(record)] = record
	s.upserts = append(s.upserts, record)
	return &record, nil
}

func (s *stubPreferenceRepo) DeletePreference(_ context.Context, userID uuid.UUID, scope types.ScopeFilter, level types.PreferenceLevel, key string) error {
	record := types.PreferenceRecord{UserID: userID, Scope: scope, Level: level, Key: key}
	delete(s.records, recordKey(record))
	return nil
}

func (s *stubPreferenceRepo) getRecord(userID uuid.UUID, level types.PreferenceLevel, key string) (types.PreferenceRecord, bool) {
	record, ok := s.records[recordKey(types.PreferenceRecord{UserID: userID, Level: level, Key: key})]
	return record, ok
}

func recordKey(record types.PreferenceRecord) string {
	scope := record.Scope
	return record.UserID.String() + "|" + scope.TenantID.String() + "|" + scope.OrgID.String() + "|" + string(record.Level) + "|" + record.Key
}

func keyInList(key string, keys []string) bool {
	for _, candidate := range keys {
		if candidate == key {
			return true
		}
	}
	return false
}

func matchesPreferenceFilter(record types.PreferenceRecord, filter types.PreferenceFilter) bool {
	if filter.Level != "" && record.Level != filter.Level {
		return false
	}
	switch filter.Level {
	case types.PreferenceLevelUser:
		if filter.UserID == uuid.Nil || record.UserID != filter.UserID {
			return false
		}
	case types.PreferenceLevelTenant:
		if filter.Scope.TenantID == uuid.Nil || record.Scope.TenantID != filter.Scope.TenantID {
			return false
		}
		if record.UserID != uuid.Nil {
			return false
		}
	case types.PreferenceLevelOrg:
		if filter.Scope.OrgID == uuid.Nil || record.Scope.OrgID != filter.Scope.OrgID {
			return false
		}
		if record.UserID != uuid.Nil {
			return false
		}
	case types.PreferenceLevelSystem:
		if record.UserID != uuid.Nil || record.Scope.TenantID != uuid.Nil || record.Scope.OrgID != uuid.Nil {
			return false
		}
	}
	if len(filter.Keys) > 0 && !keyInList(record.Key, filter.Keys) {
		return false
	}
	return true
}

func TestNewGoUsersPreferencesStoreRequiresRepo(t *testing.T) {
	if _, err := NewGoUsersPreferencesStore(nil); err == nil {
		t.Fatalf("expected error for nil repository")
	}
}

func TestGoUsersPreferencesStoreResolveFlattensValues(t *testing.T) {
	repo := newStubPreferenceRepo()
	uid := uuid.New()
	tenantID := uuid.New()
	repo.records[recordKey(types.PreferenceRecord{
		Level: types.PreferenceLevelSystem,
		Key:   "feature.flag",
	})] = types.PreferenceRecord{
		Level:   types.PreferenceLevelSystem,
		Key:     "feature.flag",
		Value:   map[string]any{"value": true},
		Version: 1,
	}
	repo.records[recordKey(types.PreferenceRecord{
		Scope: types.ScopeFilter{TenantID: tenantID},
		Level: types.PreferenceLevelTenant,
		Key:   "theme",
	})] = types.PreferenceRecord{
		Scope:   types.ScopeFilter{TenantID: tenantID},
		Level:   types.PreferenceLevelTenant,
		Key:     "theme",
		Value:   map[string]any{"value": "tenant"},
		Version: 2,
	}
	repo.records[recordKey(types.PreferenceRecord{
		UserID: uid,
		Scope:  types.ScopeFilter{TenantID: tenantID},
		Level:  types.PreferenceLevelUser,
		Key:    "theme",
	})] = types.PreferenceRecord{
		UserID:  uid,
		Scope:   types.ScopeFilter{TenantID: tenantID},
		Level:   types.PreferenceLevelUser,
		Key:     "theme",
		Value:   map[string]any{"value": "user"},
		Version: 3,
	}

	store, err := NewGoUsersPreferencesStore(repo)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	snap, err := store.Resolve(context.Background(), admin.PreferencesResolveInput{
		Scope: admin.PreferenceScope{
			UserID:   uid.String(),
			TenantID: tenantID.String(),
		},
	})
	if err != nil {
		t.Fatalf("resolve preferences: %v", err)
	}
	if snap.Effective["theme"] != "user" {
		t.Fatalf("expected flattened theme override, got %v", snap.Effective["theme"])
	}
	if snap.Effective["feature.flag"] != true {
		t.Fatalf("expected system flag, got %v", snap.Effective["feature.flag"])
	}
}

func TestGoUsersPreferencesStoreResolveInvalidUserID(t *testing.T) {
	store, err := NewGoUsersPreferencesStore(newStubPreferenceRepo())
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	_, err = store.Resolve(context.Background(), admin.PreferencesResolveInput{
		Scope: admin.PreferenceScope{UserID: "not-a-uuid"},
	})
	if err == nil {
		t.Fatalf("expected error for invalid user id")
	}
}

func TestGoUsersPreferencesStoreResolveIncludesTracesAndVersions(t *testing.T) {
	repo := newStubPreferenceRepo()
	uid := uuid.New()
	orgID := uuid.New()
	repo.records[recordKey(types.PreferenceRecord{
		Level: types.PreferenceLevelSystem,
		Key:   "theme",
	})] = types.PreferenceRecord{
		Level:   types.PreferenceLevelSystem,
		Key:     "theme",
		Value:   map[string]any{"value": "system"},
		Version: 1,
	}
	repo.records[recordKey(types.PreferenceRecord{
		Scope: types.ScopeFilter{OrgID: orgID},
		Level: types.PreferenceLevelOrg,
		Key:   "theme",
	})] = types.PreferenceRecord{
		Scope:   types.ScopeFilter{OrgID: orgID},
		Level:   types.PreferenceLevelOrg,
		Key:     "theme",
		Value:   map[string]any{"value": "org"},
		Version: 2,
	}
	repo.records[recordKey(types.PreferenceRecord{
		UserID: uid,
		Scope:  types.ScopeFilter{OrgID: orgID},
		Level:  types.PreferenceLevelUser,
		Key:    "theme",
	})] = types.PreferenceRecord{
		UserID:  uid,
		Scope:   types.ScopeFilter{OrgID: orgID},
		Level:   types.PreferenceLevelUser,
		Key:     "theme",
		Value:   map[string]any{"value": "user"},
		Version: 4,
	}

	store, err := NewGoUsersPreferencesStore(repo)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	snap, err := store.Resolve(context.Background(), admin.PreferencesResolveInput{
		Scope: admin.PreferenceScope{
			UserID: uid.String(),
			OrgID:  orgID.String(),
		},
		Keys:           []string{"theme"},
		IncludeTraces:  true,
		IncludeVersion: true,
	})
	if err != nil {
		t.Fatalf("resolve preferences: %v", err)
	}
	if snap.Versions["theme"] != 4 {
		t.Fatalf("expected version 4, got %v", snap.Versions["theme"])
	}
	if len(snap.Traces) != 1 {
		t.Fatalf("expected one trace, got %d", len(snap.Traces))
	}
	last := snap.Traces[0].Layers[len(snap.Traces[0].Layers)-1]
	if last.Level != admin.PreferenceLevelUser || !last.Found {
		t.Fatalf("expected user layer, got %+v", last)
	}
	if last.Version != 4 {
		t.Fatalf("expected trace version 4, got %d", last.Version)
	}
}

func TestGoUsersPreferencesStoreUpsertAndDelete(t *testing.T) {
	repo := newStubPreferenceRepo()
	uid := uuid.New()
	tenantID := uuid.New()
	repo.records[recordKey(types.PreferenceRecord{
		Scope: types.ScopeFilter{TenantID: tenantID},
		Level: types.PreferenceLevelTenant,
		Key:   "theme",
	})] = types.PreferenceRecord{
		Scope:   types.ScopeFilter{TenantID: tenantID},
		Level:   types.PreferenceLevelTenant,
		Key:     "theme",
		Value:   map[string]any{"value": "tenant"},
		Version: 2,
	}

	store, err := NewGoUsersPreferencesStore(repo)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	if _, err := store.Upsert(context.Background(), admin.PreferencesUpsertInput{
		Scope: admin.PreferenceScope{
			UserID:   uid.String(),
			TenantID: tenantID.String(),
		},
		Level:  admin.PreferenceLevelUser,
		Values: map[string]any{"Theme": "user"},
	}); err != nil {
		t.Fatalf("upsert: %v", err)
	}

	resolved, err := store.Resolve(context.Background(), admin.PreferencesResolveInput{
		Scope: admin.PreferenceScope{
			UserID:   uid.String(),
			TenantID: tenantID.String(),
		},
		Keys: []string{"theme"},
	})
	if err != nil {
		t.Fatalf("resolve after upsert: %v", err)
	}
	if resolved.Effective["theme"] != "user" {
		t.Fatalf("expected user override, got %v", resolved.Effective["theme"])
	}

	if err := store.Delete(context.Background(), admin.PreferencesDeleteInput{
		Scope: admin.PreferenceScope{
			UserID:   uid.String(),
			TenantID: tenantID.String(),
		},
		Level: admin.PreferenceLevelUser,
		Keys:  []string{"theme"},
	}); err != nil {
		t.Fatalf("delete: %v", err)
	}

	fallback, err := store.Resolve(context.Background(), admin.PreferencesResolveInput{
		Scope: admin.PreferenceScope{
			UserID:   uid.String(),
			TenantID: tenantID.String(),
		},
		Keys: []string{"theme"},
	})
	if err != nil {
		t.Fatalf("resolve after delete: %v", err)
	}
	if fallback.Effective["theme"] != "tenant" {
		t.Fatalf("expected tenant fallback, got %v", fallback.Effective["theme"])
	}
}

func TestGoUsersPreferencesStoreUpsertSurfacesErrors(t *testing.T) {
	repo := newStubPreferenceRepo()
	repo.upsertErr = errors.New("upsert failed")
	store, err := NewGoUsersPreferencesStore(repo)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	uid := uuid.New()
	if _, err := store.Upsert(context.Background(), admin.PreferencesUpsertInput{
		Scope:  admin.PreferenceScope{UserID: uid.String()},
		Level:  admin.PreferenceLevelUser,
		Values: map[string]any{"theme": "dark"},
	}); err == nil {
		t.Fatalf("expected error from upsert")
	}
}

func TestNewAdminWithGoUsersPreferencesRegistersRoutes(t *testing.T) {
	repo := newStubPreferenceRepo()
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}

	adm, err := NewAdminWithGoUsersPreferences(cfg, repo, EnablePreferences())
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	userID := uuid.New().String()
	payload := map[string]any{"theme": "teal"}
	body, _ := json.Marshal(payload)

	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "POST", method: "POST", path: "/admin/api/preferences"},
		{name: "PUT", method: "PUT", path: "/admin/api/preferences/" + userID},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", userID)
			rr := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(rr, req)
			if rr.Code != 200 {
				t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
			}
		})
	}

	uid, _ := uuid.Parse(userID)
	if _, ok := repo.getRecord(uid, types.PreferenceLevelUser, "theme"); !ok {
		t.Fatalf("expected preference record to be stored")
	}
}
