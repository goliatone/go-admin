package admin

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/goliatone/go-auth"
	usertypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestNormalizeActivityFilterOptionsConfigDefaultsAndClamps(t *testing.T) {
	got := normalizeActivityFilterOptionsConfig(ActivityFilterOptionsConfig{})
	if got.MaxOptions != activityFilterOptionsDefaultMax {
		t.Fatalf("MaxOptions = %d, want %d", got.MaxOptions, activityFilterOptionsDefaultMax)
	}
	if got.Verbs == nil || got.Channels == nil || got.ObjectTypes == nil {
		t.Fatal("zero-value config must normalize to non-nil empty option lists")
	}

	got = normalizeActivityFilterOptionsConfig(ActivityFilterOptionsConfig{MaxOptions: activityFilterOptionsHardMax + 1})
	if got.MaxOptions != activityFilterOptionsHardMax {
		t.Fatalf("MaxOptions = %d, want hard maximum %d", got.MaxOptions, activityFilterOptionsHardMax)
	}
}

func TestNormalizeActivityFilterOptionsConfigValues(t *testing.T) {
	overlong := strings.Repeat("x", activityFilterOptionMaxBytes+1)
	invalidUTF8 := string([]byte{0xff})
	cfg := normalizeActivityFilterOptionsConfig(ActivityFilterOptionsConfig{
		Verbs: []ActivityFilterOption{
			{Value: "  User.Created  ", Label: "  User created  "},
			{Value: "User.Created", Label: "duplicate must lose"},
			{Value: "deleted", Label: "  "},
			{Value: " "},
			{Value: overlong, Label: "long value"},
			{Value: "long-label", Label: overlong},
			{Value: invalidUTF8, Label: "invalid value"},
			{Value: "invalid-label", Label: invalidUTF8},
		},
	})

	want := []ActivityFilterOption{
		{Value: "User.Created", Label: "User created"},
		{Value: "deleted", Label: "deleted"},
	}
	if len(cfg.Verbs) != len(want) {
		t.Fatalf("Verbs = %#v, want %#v", cfg.Verbs, want)
	}
	for i := range want {
		if cfg.Verbs[i] != want[i] {
			t.Fatalf("Verbs[%d] = %#v, want %#v", i, cfg.Verbs[i], want[i])
		}
	}
}

func TestNormalizeActivityFilterOptionsConfigBoundsEachCategory(t *testing.T) {
	options := make([]ActivityFilterOption, activityFilterOptionsHardMax+10)
	for i := range options {
		options[i] = ActivityFilterOption{Value: strings.Repeat("v", i%3+1) + string(rune(i+1000))}
	}
	cfg := normalizeActivityFilterOptionsConfig(ActivityFilterOptionsConfig{
		Verbs:       options,
		Channels:    options,
		ObjectTypes: options,
	})
	for name, values := range map[string][]ActivityFilterOption{
		"verbs": cfg.Verbs, "channels": cfg.Channels, "object types": cfg.ObjectTypes,
	} {
		if len(values) != activityFilterOptionsHardMax {
			t.Fatalf("%s length = %d, want %d", name, len(values), activityFilterOptionsHardMax)
		}
	}
}

func TestApplyConfigDefaultsNormalizesActivityFilterOptions(t *testing.T) {
	cfg := applyConfigDefaults(Config{ActivityFilterOptions: ActivityFilterOptionsConfig{
		MaxOptions: -1,
		Channels:   []ActivityFilterOption{{Value: "  audit  "}},
	}})
	if cfg.ActivityFilterOptions.MaxOptions != activityFilterOptionsDefaultMax {
		t.Fatalf("MaxOptions = %d, want %d", cfg.ActivityFilterOptions.MaxOptions, activityFilterOptionsDefaultMax)
	}
	if got := cfg.ActivityFilterOptions.Channels; len(got) != 1 || got[0].Value != "audit" || got[0].Label != "audit" {
		t.Fatalf("Channels = %#v, want normalized audit option", got)
	}
}

type captureActivityOptionsAccessPolicy struct {
	got usertypes.ActivityFilter
}

func (p *captureActivityOptionsAccessPolicy) Apply(_ *auth.ActorContext, _ string, filter usertypes.ActivityFilter) (usertypes.ActivityFilter, error) {
	p.got = cloneActivityFilter(filter)
	filter.UserID = filter.Actor.ID
	filter.Channels = []string{"allowed"}
	enabled := false
	filter.MachineActivityEnabled = &enabled
	return filter, nil
}

func (*captureActivityOptionsAccessPolicy) Sanitize(_ *auth.ActorContext, _ string, records []usertypes.ActivityRecord) []usertypes.ActivityRecord {
	return records
}

func TestResolveActivityFilterOptionsMergesPolicyAndSelection(t *testing.T) {
	actorID := uuid.New()
	tenantID := uuid.New()
	orgID := uuid.New()
	accessPolicy := &captureActivityOptionsAccessPolicy{}
	providerCalls := 0
	adm := &Admin{
		config: applyConfigDefaults(Config{ActivityFilterOptions: ActivityFilterOptionsConfig{
			MaxOptions: 3,
			Verbs: []ActivityFilterOption{
				{Value: "updated", Label: "Curated update"},
				{Value: "created", Label: "Created"},
			},
		}}),
		activityPolicy: accessPolicy,
		activityFilterOptionsProvider: ActivityFilterOptionsProviderFunc(func(_ context.Context, query ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
			providerCalls++
			if len(query.EffectiveFilter.Verbs) != 0 || query.EffectiveFilter.ObjectType != "" {
				t.Fatalf("selected values leaked into effective filter: %#v", query.EffectiveFilter)
			}
			if query.EffectiveFilter.UserID != actorID || len(query.EffectiveFilter.Channels) != 1 {
				t.Fatalf("effective policy filter not passed to provider: %#v", query.EffectiveFilter)
			}
			query.EffectiveFilter.Channels[0] = "mutated"
			return ActivityFilterOptions{
				Verbs: []ActivityFilterOption{
					{Value: "updated", Label: "Provider label loses"},
					{Value: "deleted", Label: "Deleted"},
				},
				Revision: "rev-1",
			}, nil
		}),
		activityFilterOptionsPolicy: ActivityFilterOptionsPolicyFunc(func(_ context.Context, query ActivityFilterOptionsQuery, options ActivityFilterOptions) (ActivityFilterOptions, error) {
			if query.EffectiveFilter.Channels[0] != "allowed" {
				t.Fatal("provider mutation escaped into policy query")
			}
			return options, nil
		}),
	}

	readCtx := ActivityReadContext{
		Actor: usertypes.ActorRef{ID: actorID},
		Scope: usertypes.ScopeFilter{TenantID: tenantID, OrgID: orgID},
	}
	selection := ActivityFilterSelection{Verbs: []string{"stale"}}
	got, err := adm.resolveActivityFilterOptions(context.Background(), &auth.ActorContext{ActorID: actorID.String(), Role: "member"}, readCtx, selection)
	if err != nil {
		t.Fatalf("resolveActivityFilterOptions() error = %v", err)
	}
	if providerCalls != 1 || got.Revision != "rev-1" {
		t.Fatalf("provider calls/revision = %d/%q, want 1/rev-1", providerCalls, got.Revision)
	}
	if len(accessPolicy.got.Verbs) != 0 || accessPolicy.got.ObjectType != "" || len(accessPolicy.got.Channels) != 0 {
		t.Fatalf("authority-only base filter = %#v", accessPolicy.got)
	}
	if len(got.Verbs) != 3 {
		t.Fatalf("verbs = %#v, want bounded 3 entries", got.Verbs)
	}
	labels := map[string]string{}
	for _, option := range got.Verbs {
		labels[option.Value] = option.Label
	}
	if labels["updated"] != "Curated update" || labels["stale"] != "stale" {
		t.Fatalf("merge/fallback labels = %#v", labels)
	}
	if _, ok := labels["stale"]; !ok {
		t.Fatal("selected fallback did not receive bound priority")
	}
	if adm.config.ActivityFilterOptions.Verbs[0].Label != "Curated update" {
		t.Fatal("callback mutation changed Admin config")
	}
}

func TestResolveActivityFilterOptionsProviderFailureDegradesToConfig(t *testing.T) {
	adm := activityFilterOptionsTestAdmin(ActivityFilterOptionsConfig{
		Verbs: []ActivityFilterOption{{Value: "created", Label: "Created"}},
	})
	adm.activityFilterOptionsProvider = ActivityFilterOptionsProviderFunc(func(context.Context, ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
		return ActivityFilterOptions{}, errors.New("provider unavailable")
	})
	got, err := adm.resolveActivityFilterOptions(context.Background(), nil, ActivityReadContext{}, ActivityFilterSelection{})
	if err != nil {
		t.Fatalf("provider failure should degrade: %v", err)
	}
	if len(got.Verbs) != 1 || got.Verbs[0].Value != "created" || got.Revision != "" {
		t.Fatalf("degraded options = %#v", got)
	}
}

func TestResolveActivityFilterOptionsReadsProviderSnapshotPerRequest(t *testing.T) {
	revision := "rev-1"
	adm := activityFilterOptionsTestAdmin(ActivityFilterOptionsConfig{})
	adm.activityFilterOptionsProvider = ActivityFilterOptionsProviderFunc(func(context.Context, ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
		return ActivityFilterOptions{
			Verbs:    []ActivityFilterOption{{Value: revision, Label: revision}},
			Revision: revision,
		}, nil
	})
	first, err := adm.resolveActivityFilterOptions(context.Background(), nil, ActivityReadContext{}, ActivityFilterSelection{})
	if err != nil {
		t.Fatalf("first resolve: %v", err)
	}
	revision = "rev-2"
	second, err := adm.resolveActivityFilterOptions(context.Background(), nil, ActivityReadContext{}, ActivityFilterSelection{})
	if err != nil {
		t.Fatalf("second resolve: %v", err)
	}
	if first.Revision != "rev-1" || second.Revision != "rev-2" || second.Verbs[0].Value != "rev-2" {
		t.Fatalf("snapshots = %#v then %#v", first, second)
	}
}

func TestResolveActivityFilterOptionsValidatesBeforeProvider(t *testing.T) {
	calls := 0
	adm := activityFilterOptionsTestAdmin(ActivityFilterOptionsConfig{MaxOptions: 1})
	adm.activityFilterOptionsProvider = ActivityFilterOptionsProviderFunc(func(context.Context, ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
		calls++
		return ActivityFilterOptions{}, nil
	})
	_, err := adm.resolveActivityFilterOptions(context.Background(), nil, ActivityReadContext{}, ActivityFilterSelection{Verbs: []string{"one", "two"}})
	if err == nil {
		t.Fatal("expected excess selection error")
	}
	if calls != 0 {
		t.Fatalf("provider calls = %d, want 0", calls)
	}
}

func TestResolveActivityFilterOptionsPolicyIsFinal(t *testing.T) {
	adm := activityFilterOptionsTestAdmin(ActivityFilterOptionsConfig{
		Verbs: []ActivityFilterOption{{Value: "created", Label: "Created"}},
	})
	adm.activityFilterOptionsPolicy = ActivityFilterOptionsPolicyFunc(func(_ context.Context, _ ActivityFilterOptionsQuery, options ActivityFilterOptions) (ActivityFilterOptions, error) {
		options.Verbs = nil
		return options, nil
	})
	got, err := adm.resolveActivityFilterOptions(context.Background(), nil, ActivityReadContext{}, ActivityFilterSelection{Verbs: []string{"created", "stale"}})
	if err != nil {
		t.Fatalf("resolveActivityFilterOptions() error = %v", err)
	}
	if len(got.Verbs) != 0 {
		t.Fatalf("policy-removed selections were re-added: %#v", got.Verbs)
	}

	policyErr := errors.New("policy unavailable")
	adm.activityFilterOptionsPolicy = ActivityFilterOptionsPolicyFunc(func(context.Context, ActivityFilterOptionsQuery, ActivityFilterOptions) (ActivityFilterOptions, error) {
		return ActivityFilterOptions{}, policyErr
	})
	if _, err = adm.resolveActivityFilterOptions(context.Background(), nil, ActivityReadContext{}, ActivityFilterSelection{}); !errors.Is(err, policyErr) {
		t.Fatalf("policy error = %v, want %v", err, policyErr)
	}
}

func TestResolveActivityFilterOptionsCallbackBounds(t *testing.T) {
	oversized := make([]ActivityFilterOption, activityFilterOptionsHardMax+1)
	for i := range oversized {
		oversized[i] = ActivityFilterOption{Value: string(rune(i + 1000))}
	}
	adm := activityFilterOptionsTestAdmin(ActivityFilterOptionsConfig{Verbs: []ActivityFilterOption{{Value: "configured"}}})
	adm.activityFilterOptionsProvider = ActivityFilterOptionsProviderFunc(func(context.Context, ActivityFilterOptionsQuery) (ActivityFilterOptions, error) {
		return ActivityFilterOptions{Verbs: oversized, Revision: "too-large"}, nil
	})
	got, err := adm.resolveActivityFilterOptions(context.Background(), nil, ActivityReadContext{}, ActivityFilterSelection{})
	if err != nil || len(got.Verbs) != 1 || got.Revision != "" {
		t.Fatalf("oversized provider should degrade to Config, got %#v, err %v", got, err)
	}

	policyOversized := make([]ActivityFilterOption, activityFilterOptionsSafetyMax+1)
	for i := range policyOversized {
		policyOversized[i] = ActivityFilterOption{Value: string(rune(i + 1000))}
	}
	adm.activityFilterOptionsProvider = nil
	adm.activityFilterOptionsPolicy = ActivityFilterOptionsPolicyFunc(func(context.Context, ActivityFilterOptionsQuery, ActivityFilterOptions) (ActivityFilterOptions, error) {
		return ActivityFilterOptions{Verbs: policyOversized}, nil
	})
	if _, err = adm.resolveActivityFilterOptions(context.Background(), nil, ActivityReadContext{}, ActivityFilterSelection{}); err == nil {
		t.Fatal("oversized policy output must fail closed")
	}
}

func activityFilterOptionsTestAdmin(cfg ActivityFilterOptionsConfig) *Admin {
	return &Admin{config: applyConfigDefaults(Config{ActivityFilterOptions: cfg})}
}
