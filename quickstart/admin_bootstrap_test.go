package quickstart

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type stubActivitySink struct {
	entries []admin.ActivityEntry
}

func (s *stubActivitySink) Record(ctx context.Context, entry admin.ActivityEntry) error {
	_ = ctx
	s.entries = append(s.entries, entry)
	return nil
}

func (s *stubActivitySink) List(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityEntry, error) {
	_, _ = ctx, filters
	if limit <= 0 || limit > len(s.entries) {
		limit = len(s.entries)
	}
	out := make([]admin.ActivityEntry, limit)
	copy(out, s.entries[:limit])
	return out, nil
}

type stubUserRepo struct{}

func (stubUserRepo) List(ctx context.Context, opts admin.ListOptions) ([]admin.UserRecord, int, error) {
	_, _ = ctx, opts
	return nil, 0, nil
}
func (stubUserRepo) Get(ctx context.Context, id string) (admin.UserRecord, error) {
	_, _ = ctx, id
	return admin.UserRecord{}, nil
}
func (stubUserRepo) Create(ctx context.Context, user admin.UserRecord) (admin.UserRecord, error) {
	_, _ = ctx, user
	return admin.UserRecord{}, nil
}
func (stubUserRepo) Update(ctx context.Context, user admin.UserRecord) (admin.UserRecord, error) {
	_, _ = ctx, user
	return admin.UserRecord{}, nil
}
func (stubUserRepo) Delete(ctx context.Context, id string) error {
	_, _ = ctx, id
	return nil
}
func (stubUserRepo) Search(ctx context.Context, query string, limit int) ([]admin.UserRecord, error) {
	_, _, _ = ctx, query, limit
	return nil, nil
}

func TestNewAdminAdapterHooksSuccess(t *testing.T) {
	t.Setenv("USE_PERSISTENT_CMS", "true")
	t.Setenv("USE_GO_OPTIONS", "true")
	t.Setenv("USE_GO_USERS_ACTIVITY", "true")

	cfg := NewAdminConfig("", "", "")
	cmsContainer := admin.NewNoopCMSContainer()
	activitySink := &stubActivitySink{}
	var persistentCalled bool
	var optionsCalled bool
	var activityCalled bool
	var localeSeen string

	hooks := AdapterHooks{
		PersistentCMS: func(ctx context.Context, defaultLocale string) (admin.CMSOptions, string, error) {
			_ = ctx
			persistentCalled = true
			localeSeen = defaultLocale
			return admin.CMSOptions{Container: cmsContainer}, "persistent CMS", nil
		},
		GoOptions: func(adm *admin.Admin) (string, error) {
			if adm == nil {
				return "", errors.New("admin missing")
			}
			optionsCalled = true
			return "go-options", nil
		},
		GoUsersActivity: func() admin.ActivitySink {
			activityCalled = true
			return activitySink
		},
	}

	adm, result, err := NewAdmin(cfg, hooks)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm == nil {
		t.Fatalf("expected admin instance")
	}
	if !persistentCalled || !optionsCalled || !activityCalled {
		t.Fatalf("expected hooks called, got persistent=%v options=%v activity=%v", persistentCalled, optionsCalled, activityCalled)
	}
	if localeSeen != "en" {
		t.Fatalf("expected default locale en, got %q", localeSeen)
	}
	if !result.Flags.UsePersistentCMS || !result.Flags.UseGoOptions || !result.Flags.UseGoUsersActivity {
		t.Fatalf("expected adapter flags enabled, got %+v", result.Flags)
	}
	if !result.PersistentCMSSet || result.CMSBackend != "persistent CMS" {
		t.Fatalf("expected persistent CMS applied, got %+v", result)
	}
	if result.Config.CMS.Container != cmsContainer {
		t.Fatalf("expected CMS container override applied")
	}
	if result.SettingsBackend != "go-options" {
		t.Fatalf("expected settings backend go-options, got %q", result.SettingsBackend)
	}
	if result.ActivityBackend != "go-users activity sink" || result.ActivitySink != activitySink {
		t.Fatalf("expected activity sink wired, got backend=%q sink=%v", result.ActivityBackend, result.ActivitySink)
	}
}

func TestNewAdminInvalidDependencies(t *testing.T) {
	cfg := NewAdminConfig("", "", "")
	deps := admin.Dependencies{
		UserRepository: stubUserRepo{},
	}

	_, _, err := NewAdmin(cfg, AdapterHooks{}, WithAdminDependencies(deps))
	if err == nil {
		t.Fatalf("expected dependency validation error")
	}
	if !errors.Is(err, admin.ErrInvalidDependencies) {
		t.Fatalf("expected invalid dependencies error, got %v", err)
	}
}

func TestNewAdminAdapterHookErrors(t *testing.T) {
	t.Setenv("USE_PERSISTENT_CMS", "true")
	t.Setenv("USE_GO_OPTIONS", "true")

	cfg := NewAdminConfig("", "", "")
	hooks := AdapterHooks{
		PersistentCMS: func(ctx context.Context, defaultLocale string) (admin.CMSOptions, string, error) {
			_, _ = ctx, defaultLocale
			return admin.CMSOptions{}, "", errors.New("cms error")
		},
		GoOptions: func(adm *admin.Admin) (string, error) {
			_ = adm
			return "", errors.New("options error")
		},
	}

	_, result, err := NewAdmin(cfg, hooks)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PersistentCMSSet || result.CMSBackend != "in-memory CMS" {
		t.Fatalf("expected persistent CMS not set, got %+v", result)
	}
	if result.SettingsBackend != "in-memory settings" {
		t.Fatalf("expected settings backend fallback, got %q", result.SettingsBackend)
	}
}
