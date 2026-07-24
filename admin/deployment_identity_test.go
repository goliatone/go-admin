package admin

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"sync"
	"testing"
	"time"

	deploymentidentity "github.com/goliatone/go-admin/pkg/go-deployment-identity"
	"github.com/goliatone/go-admin/pkg/go-deployment-identity/identicon"
)

func TestResolveDeploymentIdentityPrecedenceAndBuildFallback(t *testing.T) {
	now := time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC)
	values := map[string]string{
		"APP_ID":            "env-id",
		"APP_NAME":          "env-name",
		"APP_VERSION":       "env-version",
		"APP_ENV":           "prod",
		"APP_COMMIT_SHA":    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		"APP_GIT_REF":       "refs/heads/main",
		"APP_BUILD_TIME":    "2026-07-22T10:00:00Z",
		"APP_ENV_COLOR":     "#ffffff",
		"UNSAFE_SECRET":     "must-not-leak",
		"APP_INSTANCE_NAME": "configured-otter",
		"APP_INSTANCE_ID":   "instance-123",
	}
	identity := ResolveDeploymentIdentity(Config{
		Deployment: DeploymentIdentityConfig{
			AppID:             "explicit-id",
			EnvironmentColors: map[string]string{"production": defaultProductionColor},
		},
		Debug:  DebugConfig{AppID: "legacy-id", AppName: "legacy-name"},
		Errors: ErrorConfig{AppVersion: "legacy-version"},
	}, resolverTestOptions(now, values, DeploymentBuildInfo{
		MainVersion: "v1.2.3", GoVersion: "go1.test", VCSRevision: strings.Repeat("b", 40),
		VCSTime: "2026-07-21T10:00:00Z", VCSModified: true,
	}, bytes.NewReader(make([]byte, 64)))...)

	if identity.AppID != "explicit-id" || identity.AppName != "legacy-name" || identity.AppVersion != "legacy-version" {
		t.Fatalf("unexpected config precedence: %+v", identity)
	}
	if identity.Environment != "production" || identity.EnvironmentColor != defaultProductionColor {
		t.Fatalf("unexpected environment: %+v", identity)
	}
	if identity.CommitSHA != values["APP_COMMIT_SHA"] || identity.BuildSource != "environment" {
		t.Fatalf("unexpected commit: %+v", identity)
	}
	if identity.GoVersion != "go1.test" || !identity.BuildModified {
		t.Fatalf("missing build metadata: %+v", identity)
	}
	encoded, err := json.Marshal(identity)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), values["UNSAFE_SECRET"]) {
		t.Fatal("arbitrary environment value leaked into identity")
	}
}

func TestNormalizeCommitAcceptsBoundedHex(t *testing.T) {
	if got := normalizeCommit("abcdef0"); got != "abcdef0" {
		t.Fatalf("expected seven-character commit, got %q", got)
	}
	if got := normalizeCommit("abcdefg"); got != "" {
		t.Fatalf("expected invalid hex to be rejected, got %q", got)
	}
}

func TestResolveDeploymentIdentityReportsMixedInstanceProvenance(t *testing.T) {
	now := time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC)
	identity := ResolveDeploymentIdentity(Config{
		Deployment: DeploymentIdentityConfig{InstanceName: "configured-name"},
	}, resolverTestOptions(now, nil, DeploymentBuildInfo{}, bytes.NewReader(make([]byte, 64)))...)
	if identity.InstanceSource != "mixed" || identity.InstanceID == "" {
		t.Fatalf("expected mixed configured/generated provenance: %+v", identity)
	}
}

func TestResolveDeploymentIdentityBoundsDisplayTextAndCopiesBuildTime(t *testing.T) {
	now := time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC)
	identity := ResolveDeploymentIdentity(Config{
		Deployment: DeploymentIdentityConfig{
			AppName:   strings.Repeat("a", 400),
			BuildTime: "2026-07-23T11:00:00Z",
		},
	}, resolverTestOptions(now, nil, DeploymentBuildInfo{}, bytes.NewReader(make([]byte, 64)))...)
	if len(identity.AppName) != 128 || identity.BuildTime == nil {
		t.Fatalf("expected bounded text and build time: %+v", identity)
	}
	snapshot := identity.Snapshot(now)
	*snapshot.BuildTime = snapshot.BuildTime.Add(time.Hour)
	if snapshot.BuildTime.Equal(*identity.BuildTime) {
		t.Fatal("snapshot build time pointer aliases immutable identity")
	}
}

func TestResolveDeploymentIdentityBuildInfoAndInvalidSources(t *testing.T) {
	now := time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC)
	values := map[string]string{
		"APP_COMMIT_SHA": "not-a-commit",
		"GITHUB_SHA":     "also-invalid",
		"APP_BUILD_TIME": "yesterday",
	}
	commit := strings.Repeat("c", 40)
	identity := ResolveDeploymentIdentity(Config{}, resolverTestOptions(now, values, DeploymentBuildInfo{
		MainVersion: "v2.0.0", GoVersion: "go1.test", VCSRevision: commit, VCSTime: "2026-07-20T09:00:00Z",
	}, bytes.NewReader(make([]byte, 64)))...)
	if identity.CommitSHA != commit || identity.CommitShort != commit[:12] || identity.BuildSource != "go_build_info" {
		t.Fatalf("unexpected build commit fallback: %+v", identity)
	}
	if identity.AppVersion != "v2.0.0" || identity.BuildTime == nil || identity.BuildTime.IsZero() {
		t.Fatalf("unexpected build fallback: %+v", identity)
	}
}

func TestResolveDeploymentIdentityNamingColorsAndRandomFailure(t *testing.T) {
	now := time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC)
	cfg := Config{Deployment: DeploymentIdentityConfig{
		Environment:       "DEV",
		EnvironmentColors: map[string]string{"development": "#abc", "staging": "url(bad)"},
	}}
	identity := ResolveDeploymentIdentity(cfg, resolverTestOptions(now, nil, DeploymentBuildInfo{}, bytes.NewReader(make([]byte, 64)))...)
	if identity.Environment != "development" || identity.EnvironmentColor != "#aabbcc" {
		t.Fatalf("unexpected color normalization: %+v", identity)
	}
	if identity.InstanceName != "brisk-badger" || identity.InstanceID == "" {
		t.Fatalf("unexpected generated identity: %+v", identity)
	}

	failed := ResolveDeploymentIdentity(Config{Deployment: DeploymentIdentityConfig{
		Environment: "qa", FallbackColor: "#123456",
	}}, resolverTestOptions(now, nil, DeploymentBuildInfo{}, errReader{})...)
	if failed.InstanceName == "" || failed.InstanceID == "" || failed.InstanceSource != "fallback" {
		t.Fatalf("random failure did not use safe fallback: %+v", failed)
	}
	if failed.EnvironmentColor != "#123456" {
		t.Fatalf("unexpected fallback color: %+v", failed)
	}
}

func TestResolveDeploymentIdentityConcurrentAndSnapshotStable(t *testing.T) {
	now := time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC)
	const count = 16
	var wg sync.WaitGroup
	ids := make(chan string, count)
	for i := range count {
		wg.Add(1)
		go func(seed byte) {
			defer wg.Done()
			source := bytes.NewReader(bytes.Repeat([]byte{seed}, 64))
			identity := ResolveDeploymentIdentity(Config{}, resolverTestOptions(now, nil, DeploymentBuildInfo{}, source)...)
			ids <- identity.InstanceID
			snapshot := identity.Snapshot(now.Add(5 * time.Second))
			if snapshot.InstanceID != identity.InstanceID || snapshot.Uptime != "5s" {
				t.Errorf("unstable snapshot: %+v", snapshot)
			}
		}(byte(i))
	}
	wg.Wait()
	close(ids)
	seen := map[string]bool{}
	for id := range ids {
		if seen[id] {
			t.Fatalf("duplicate instance id %q", id)
		}
		seen[id] = true
	}
}

func TestResolveDeploymentPersonaSeedPrecedenceAndNamespace(t *testing.T) {
	now := time.Date(2026, 7, 23, 12, 0, 0, 0, time.UTC)
	commit := strings.Repeat("a", 40)
	var captured deploymentidentity.Input
	generator := deploymentidentity.GeneratorFunc(func(input deploymentidentity.Input) (deploymentidentity.Persona, error) {
		captured = input
		return validTestPersona("custom"), nil
	})
	namespace := "stable-space"
	cfg := Config{Deployment: DeploymentIdentityConfig{
		AppID: "app", CommitSHA: commit,
		Persona: DeploymentPersonaConfig{Enabled: true, Seed: "typed", Namespace: &namespace, Name: "release-blue"},
	}}
	options := resolverTestOptions(now, map[string]string{"APP_DEPLOYMENT_SEED": "environment"}, DeploymentBuildInfo{}, nil)
	options = append(options, WithDeploymentPersonaGenerator(generator))
	identity := ResolveDeploymentIdentity(cfg, options...)
	if captured.Seed != "typed" || captured.Namespace != namespace || identity.Persona == nil {
		t.Fatalf("unexpected persona resolution: input=%+v identity=%+v", captured, identity)
	}
	if identity.Persona.Name != "release-blue" || identity.Persona.Source != "custom" {
		t.Fatalf("unexpected custom persona: %+v", identity.Persona)
	}

	cfg.Deployment.Persona.Seed = ""
	options = resolverTestOptions(now, map[string]string{"APP_DEPLOYMENT_SEED": "environment"}, DeploymentBuildInfo{}, nil)
	options = append(options, WithDeploymentPersonaGenerator(generator))
	ResolveDeploymentIdentity(cfg, options...)
	if captured.Seed != "environment" {
		t.Fatalf("environment seed precedence failed: %+v", captured)
	}

	options = resolverTestOptions(now, nil, DeploymentBuildInfo{}, nil)
	options = append(options, WithDeploymentPersonaGenerator(generator))
	ResolveDeploymentIdentity(cfg, options...)
	if captured.Seed != commit {
		t.Fatalf("commit seed fallback failed: %+v", captured)
	}
}

func TestResolveDeploymentPersonaOptInFallbackAndCopies(t *testing.T) {
	cfg := Config{Deployment: DeploymentIdentityConfig{
		AppID: "app", Persona: DeploymentPersonaConfig{Enabled: true, Seed: "seed"},
	}}
	failing := deploymentidentity.GeneratorFunc(func(deploymentidentity.Input) (deploymentidentity.Persona, error) {
		return deploymentidentity.Persona{}, errors.New("unavailable")
	})
	identity := ResolveDeploymentIdentity(cfg, WithDeploymentPersonaGenerator(failing))
	if identity.Persona == nil || identity.Persona.Source != "fallback" {
		t.Fatalf("expected safe default fallback: %+v", identity.Persona)
	}
	snapshot := identity.Snapshot(time.Now())
	snapshot.Persona.Name = "mutated"
	if identity.Persona.Name == "mutated" {
		t.Fatal("snapshot aliases identity persona")
	}
	disabled := ResolveDeploymentIdentity(Config{Deployment: DeploymentIdentityConfig{CommitSHA: strings.Repeat("b", 40)}})
	if disabled.Persona != nil {
		t.Fatalf("zero-value configuration enabled persona: %+v", disabled.Persona)
	}
	missing := ResolveDeploymentIdentity(Config{Deployment: DeploymentIdentityConfig{
		Persona: DeploymentPersonaConfig{Enabled: true},
	}}, resolverTestOptions(time.Now(), nil, DeploymentBuildInfo{}, nil)...)
	if missing.Persona != nil {
		t.Fatalf("missing stable seed produced persona: %+v", missing.Persona)
	}
}

func TestResolveDeploymentPersonaFallsBackFromIncompletePNG(t *testing.T) {
	generator, err := identicon.New()
	if err != nil {
		t.Fatal(err)
	}
	incomplete, err := generator.Generate(deploymentidentity.Input{Seed: "source", Namespace: "app"})
	if err != nil {
		t.Fatal(err)
	}
	const pngHeaderAndIHDRBytes = 33
	incomplete.Visual.Data = append([]byte(nil), incomplete.Visual.Data[:pngHeaderAndIHDRBytes]...)

	identity := ResolveDeploymentIdentity(Config{Deployment: DeploymentIdentityConfig{
		AppID: "app", Persona: DeploymentPersonaConfig{Enabled: true, Seed: "seed"},
	}}, WithDeploymentPersonaGenerator(deploymentidentity.GeneratorFunc(
		func(deploymentidentity.Input) (deploymentidentity.Persona, error) {
			return incomplete, nil
		},
	)))
	if identity.Persona == nil || identity.Persona.Source != "fallback" {
		t.Fatalf("expected fallback from incomplete PNG, got %+v", identity.Persona)
	}
	if identity.Persona.Visual.Kind != deploymentidentity.VisualKindMonogram {
		t.Fatalf("expected validated default visual, got %+v", identity.Persona.Visual)
	}
}

func TestResolveDeploymentPersonaFallsBackFromNilGeneratorFunc(t *testing.T) {
	identity := ResolveDeploymentIdentity(Config{Deployment: DeploymentIdentityConfig{
		AppID: "app", Persona: DeploymentPersonaConfig{Enabled: true, Seed: "seed"},
	}}, WithDeploymentPersonaGenerator(deploymentidentity.GeneratorFunc(nil)))
	if identity.Persona == nil || identity.Persona.Source != "fallback" {
		t.Fatalf("expected fallback from nil generator function, got %+v", identity.Persona)
	}
}

func TestDeploymentPersonaImageIsImmutableAcrossResolutionAndAccess(t *testing.T) {
	identiconGenerator, err := identicon.New()
	if err != nil {
		t.Fatal(err)
	}
	source, err := identiconGenerator.Generate(deploymentidentity.Input{Seed: "source", Namespace: "app"})
	if err != nil {
		t.Fatal(err)
	}
	generator := deploymentidentity.GeneratorFunc(func(deploymentidentity.Input) (deploymentidentity.Persona, error) {
		return source, nil
	})
	identity := ResolveDeploymentIdentity(Config{Deployment: DeploymentIdentityConfig{
		Persona: DeploymentPersonaConfig{Enabled: true, Seed: "seed"},
	}}, WithDeploymentPersonaGenerator(generator))
	if identity.Persona == nil || len(identity.Persona.Visual.Data) == 0 {
		t.Fatalf("missing resolved image persona: %+v", identity.Persona)
	}
	want := identity.Persona.Visual.Data[0]
	source.Visual.Data[0] ^= 0xff
	if identity.Persona.Visual.Data[0] != want {
		t.Fatal("resolved persona aliases generator output")
	}
	snapshot := identity.Snapshot(time.Now())
	snapshot.Persona.Visual.Data[0] ^= 0xff
	if identity.Persona.Visual.Data[0] != want {
		t.Fatal("snapshot aliases resolved persona image")
	}
}

func validTestPersona(name string) deploymentidentity.Persona {
	return deploymentidentity.Persona{
		Name: name, Algorithm: "test", Version: "v1",
		Visual: deploymentidentity.Visual{
			Kind: deploymentidentity.VisualKindMonogram, Text: "T", Alt: name,
			Background: "#000000", Foreground: "#ffffff",
		},
	}
}

func resolverTestOptions(now time.Time, env map[string]string, build DeploymentBuildInfo, randomSource io.Reader) []DeploymentIdentityResolverOption {
	var source io.Reader = randomSource
	if randomSource == nil {
		source = bytes.NewReader(make([]byte, 64))
	}
	return []DeploymentIdentityResolverOption{
		WithDeploymentClock(func() time.Time { return now }),
		WithDeploymentEnvironmentLookup(func(key string) (string, bool) {
			value, ok := env[key]
			return value, ok
		}),
		WithDeploymentHostnameLookup(func() (string, error) { return "host.example", nil }),
		WithDeploymentBuildInfo(func() (DeploymentBuildInfo, bool) {
			return build, build != (DeploymentBuildInfo{})
		}),
		WithDeploymentRandomSource(source),
	}
}

type errReader struct{}

func (errReader) Read([]byte) (int, error) { return 0, errors.New("random unavailable") }
