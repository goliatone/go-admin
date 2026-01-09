package quickstart

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type stubPreferenceRepo struct {
	records map[string]types.PreferenceRecord
	upserts []types.PreferenceRecord
}

func newStubPreferenceRepo() *stubPreferenceRepo {
	return &stubPreferenceRepo{
		records: map[string]types.PreferenceRecord{},
	}
}

func (s *stubPreferenceRepo) ListPreferences(_ context.Context, filter types.PreferenceFilter) ([]types.PreferenceRecord, error) {
	out := []types.PreferenceRecord{}
	for _, record := range s.records {
		if filter.UserID != uuid.Nil && record.UserID != filter.UserID {
			continue
		}
		if filter.Level != "" && record.Level != filter.Level {
			continue
		}
		if len(filter.Keys) > 0 && !keyInList(record.Key, filter.Keys) {
			continue
		}
		out = append(out, record)
	}
	return out, nil
}

func (s *stubPreferenceRepo) UpsertPreference(_ context.Context, record types.PreferenceRecord) (*types.PreferenceRecord, error) {
	if record.ID == uuid.Nil {
		record.ID = uuid.New()
	}
	s.records[recordKey(record)] = record
	s.upserts = append(s.upserts, record)
	return &record, nil
}

func (s *stubPreferenceRepo) DeletePreference(_ context.Context, userID uuid.UUID, _ types.ScopeFilter, level types.PreferenceLevel, key string) error {
	record := types.PreferenceRecord{UserID: userID, Level: level, Key: key}
	delete(s.records, recordKey(record))
	return nil
}

func (s *stubPreferenceRepo) getRecord(userID uuid.UUID, level types.PreferenceLevel, key string) (types.PreferenceRecord, bool) {
	record, ok := s.records[recordKey(types.PreferenceRecord{UserID: userID, Level: level, Key: key})]
	return record, ok
}

func recordKey(record types.PreferenceRecord) string {
	return record.UserID.String() + "|" + string(record.Level) + "|" + record.Key
}

func keyInList(key string, keys []string) bool {
	for _, candidate := range keys {
		if candidate == key {
			return true
		}
	}
	return false
}

func TestNewGoUsersPreferencesStoreRequiresRepo(t *testing.T) {
	if _, err := NewGoUsersPreferencesStore(nil); err == nil {
		t.Fatalf("expected error for nil repository")
	}
}

func TestGoUsersPreferencesStoreGetFlattensValues(t *testing.T) {
	repo := newStubPreferenceRepo()
	uid := uuid.New()
	repo.records[recordKey(types.PreferenceRecord{
		UserID: uid,
		Level:  types.PreferenceLevelUser,
		Key:    "theme",
	})] = types.PreferenceRecord{
		UserID: uid,
		Level:  types.PreferenceLevelUser,
		Key:    "theme",
		Value:  map[string]any{"value": "dark"},
	}

	store, err := NewGoUsersPreferencesStore(repo)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	out, err := store.Get(context.Background(), uid.String())
	if err != nil {
		t.Fatalf("get preferences: %v", err)
	}
	if out["theme"] != "dark" {
		t.Fatalf("expected flattened theme, got %v", out["theme"])
	}
}

func TestGoUsersPreferencesStoreGetInvalidUserID(t *testing.T) {
	store, err := NewGoUsersPreferencesStore(newStubPreferenceRepo())
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	out, err := store.Get(context.Background(), "not-a-uuid")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("expected empty map, got %v", out)
	}
}

func TestGoUsersPreferencesStoreSaveUpsertsLowercaseKey(t *testing.T) {
	repo := newStubPreferenceRepo()
	store, err := NewGoUsersPreferencesStore(repo)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	uid := uuid.New()
	if err := store.Save(context.Background(), uid.String(), map[string]any{"Theme": "dark"}); err != nil {
		t.Fatalf("save: %v", err)
	}

	if len(repo.upserts) != 1 {
		t.Fatalf("expected one upsert, got %d", len(repo.upserts))
	}
	record := repo.upserts[0]
	if record.Key != "theme" {
		t.Fatalf("expected lowercase key, got %q", record.Key)
	}
	if record.Value["value"] != "dark" {
		t.Fatalf("expected value persisted, got %v", record.Value["value"])
	}
}

func TestGoUsersPreferencesStoreSaveRequiresValidUserID(t *testing.T) {
	store, err := NewGoUsersPreferencesStore(newStubPreferenceRepo())
	if err != nil {
		t.Fatalf("new store: %v", err)
	}

	if err := store.Save(context.Background(), "invalid-id", map[string]any{"theme": "dark"}); err == nil {
		t.Fatalf("expected error for invalid user id")
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
