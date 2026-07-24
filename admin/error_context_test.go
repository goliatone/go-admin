package admin

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	goerrors "github.com/goliatone/go-errors"
)

func TestWithStackPreservesExistingStackCarriers(t *testing.T) {
	base := errors.New("database failed")
	first := WithStack(base)
	wrapped := fmt.Errorf("route boundary: %w", first)
	second := WithStack(wrapped)

	if second == nil {
		t.Fatal("expected wrapped error")
	}
	if !errors.Is(wrapped, second) {
		t.Fatalf("expected wrapper with existing stack carrier to be returned unchanged")
	}
	if !errors.Is(second, base) {
		t.Fatalf("expected errors.Is to reach base error")
	}
}

func TestWithStackPreservesGoErrorsStackTrace(t *testing.T) {
	ge := goerrors.New("missing", goerrors.CategoryNotFound).WithCode(http.StatusNotFound).WithStackTrace()
	wrapped := fmt.Errorf("route boundary: %w", ge)

	got := WithStack(wrapped)
	if !errors.Is(got, wrapped) {
		t.Fatalf("expected wrapped go-errors stack to be preserved")
	}
	if stack := stackFromError(got); len(stack) != len(ge.StackTrace) {
		t.Fatalf("expected original go-errors stack, got %d frames want %d", len(stack), len(ge.StackTrace))
	}
}

func TestWrappedControlFlowErrorsKeepStatusMapping(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantStatus int
		wantMsg    string
	}{
		{name: "not found", err: ErrNotFound, wantStatus: http.StatusNotFound, wantMsg: ErrNotFound.Error()},
		{name: "forbidden", err: ErrForbidden, wantStatus: http.StatusForbidden, wantMsg: ErrForbidden.Error()},
		{name: "fiber", err: fiber.NewError(http.StatusBadRequest, "bad request"), wantStatus: http.StatusBadRequest, wantMsg: "bad request"},
	}

	presenter := NewErrorPresenter(ErrorConfig{DevMode: true})
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			wrapped := WithStack(&testRouteBoundaryError{context: "route boundary", err: tc.err})
			mapped, status := presenter.Present(wrapped)
			if status != tc.wantStatus {
				t.Fatalf("status = %d, want %d", status, tc.wantStatus)
			}
			if mapped == nil || mapped.Code != tc.wantStatus {
				t.Fatalf("mapped code = %#v, want %d", mapped, tc.wantStatus)
			}
			if mapped.Message != tc.wantMsg {
				t.Fatalf("mapped message = %q, want %q", mapped.Message, tc.wantMsg)
			}
			if !errors.Is(wrapped, tc.err) && tc.name != "fiber" {
				t.Fatalf("expected errors.Is to reach %v", tc.err)
			}
			var fiberErr *fiber.Error
			if tc.name == "fiber" && !errors.As(wrapped, &fiberErr) {
				t.Fatalf("expected errors.As to reach fiber error")
			}
		})
	}
}

func TestWrappedControlFlowErrorsKeepCustomMessagesOutsideRouteBoundaries(t *testing.T) {
	err := WithStack(fmt.Errorf("custom user lookup failed: %w", ErrNotFound))

	mapped, status := NewErrorPresenter(ErrorConfig{DevMode: true}).Present(err)
	if status != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", status, http.StatusNotFound)
	}
	want := "custom user lookup failed: not found"
	if mapped.Message != want {
		t.Fatalf("mapped message = %q, want %q", mapped.Message, want)
	}
}

func TestBuildDevErrorContextIncludesAttachedDeploymentIdentity(t *testing.T) {
	startedAt := time.Now().Add(-5 * time.Minute).UTC()
	identity := DeploymentIdentity{
		AppName:          "Admin",
		AppVersion:       "v1.2.3",
		Environment:      "staging",
		EnvironmentColor: defaultStagingColor,
		InstanceName:     "brisk-otter",
		InstanceID:       "instance-a",
		CommitSHA:        "abcdef0123456789",
		StartedAt:        startedAt,
		GoVersion:        "go1.test",
	}
	presenter := NewErrorPresenter(ErrorConfig{DevMode: true, ShowEnvironment: true}).
		WithDeploymentIdentity(identity)
	ctx := presenter.BuildDevErrorContext(errors.New("boom"), nil)
	if ctx == nil || ctx.EnvironmentInfo == nil || ctx.EnvironmentInfo.Deployment == nil {
		t.Fatalf("expected deployment environment context: %+v", ctx)
	}
	got := ctx.EnvironmentInfo.Deployment
	if got.InstanceID != identity.InstanceID || got.InstanceName != identity.InstanceName || got.CommitSHA != identity.CommitSHA {
		t.Fatalf("deployment context mismatch: got=%+v want=%+v", got, identity)
	}
	if got.Uptime == "0s" || ctx.EnvironmentInfo.AppVersion != identity.AppVersion || ctx.EnvironmentInfo.Environment != "staging" {
		t.Fatalf("missing derived deployment context: %+v", ctx.EnvironmentInfo)
	}
}

func TestWithDeploymentIdentityNormalizesProvenance(t *testing.T) {
	presenter := NewErrorPresenter(ErrorConfig{}).WithDeploymentIdentity(DeploymentIdentity{
		InstanceName:   "instance",
		InstanceID:     "instance-id",
		BuildSource:    "GO_BUILD_INFO",
		InstanceSource: "MIXED",
	})
	identity := presenter.DeploymentIdentity()
	if identity.BuildSource != "go_build_info" || identity.InstanceSource != "mixed" {
		t.Fatalf("expected canonical provenance, got %+v", identity)
	}

	presenter = presenter.WithDeploymentIdentity(DeploymentIdentity{
		InstanceName:   "instance",
		InstanceID:     "instance-id",
		BuildSource:    strings.Repeat("x", 200),
		InstanceSource: "custom<script>",
	})
	identity = presenter.DeploymentIdentity()
	if identity.BuildSource != "" || identity.InstanceSource != "" {
		t.Fatalf("unexpected untrusted provenance: %+v", identity)
	}
}

func TestWithDeploymentIdentityRejectsMalformedAttachedPersona(t *testing.T) {
	presenter := NewErrorPresenter(ErrorConfig{}).WithDeploymentIdentity(DeploymentIdentity{
		InstanceName: "instance",
		InstanceID:   "instance-id",
		Persona: &DeploymentPersona{
			Name: "unsafe", Algorithm: "custom", Version: "v1",
			Visual: DeploymentPersonaVisual{
				Kind: DeploymentPersonaVisualImage, Alt: "unsafe",
				MediaType: DeploymentPersonaMediaTypePNG, Data: []byte("<script>"),
			},
		},
	})
	if got := presenter.DeploymentIdentity().Persona; got != nil {
		t.Fatalf("malformed externally attached persona survived normalization: %+v", got)
	}
}

func TestDefaultErrorPresenterCopiesMutableState(t *testing.T) {
	previous := DefaultErrorPresenter()
	t.Cleanup(func() { SetDefaultErrorPresenter(previous) })

	presenter := NewErrorPresenter(ErrorConfig{AppRoots: []string{"/app"}})
	SetDefaultErrorPresenter(presenter)
	presenter.Config.AppRoots[0] = "/mutated-source"

	first := DefaultErrorPresenter()
	first.Config.AppRoots[0] = "/mutated-copy"
	second := DefaultErrorPresenter()
	if got := second.Config.AppRoots[0]; got != "/app" {
		t.Fatalf("default presenter shared mutable config: %q", got)
	}
}

func TestBuildDevErrorContextDoesNotExposeDeploymentOutsideDevMode(t *testing.T) {
	presenter := NewErrorPresenter(ErrorConfig{ShowEnvironment: true}).
		WithDeploymentIdentity(DeploymentIdentity{InstanceName: "hidden", InstanceID: "hidden"})
	if ctx := presenter.BuildDevErrorContext(errors.New("boom"), nil); ctx != nil {
		t.Fatalf("production presenter returned developer context: %+v", ctx)
	}
	response := presenter.ErrorResponse(goerrors.New("boom", goerrors.CategoryInternal))
	encoded := fmt.Sprintf("%+v", response)
	if strings.Contains(encoded, "hidden") {
		t.Fatalf("generic production response exposed deployment identity: %s", encoded)
	}
}

type testRouteBoundaryError struct {
	context string
	err     error
}

func (e *testRouteBoundaryError) Error() string {
	return e.context + ": " + e.err.Error()
}

func (e *testRouteBoundaryError) Unwrap() error {
	return e.err
}

func (e *testRouteBoundaryError) RouteBoundaryContext() string {
	return e.context
}
