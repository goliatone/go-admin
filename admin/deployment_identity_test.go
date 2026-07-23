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
	if identity.AppVersion != "v2.0.0" || identity.BuildTime.IsZero() {
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
	for i := 0; i < count; i++ {
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
