package admin

import (
	"errors"
	"net/http"
	"runtime"
	"slices"
	"strings"
	"sync/atomic"
	"time"

	deploymentidentity "github.com/goliatone/go-admin/pkg/go-deployment-identity"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type ErrorPresenter struct {
	Config     ErrorConfig            `json:"config"`
	Mappers    []goerrors.ErrorMapper `json:"mappers"`
	deployment DeploymentIdentity
}

func (p ErrorPresenter) clone() ErrorPresenter {
	p.Config.AppRoots = append([]string{}, p.Config.AppRoots...)
	if p.Mappers != nil {
		p.Mappers = append([]goerrors.ErrorMapper{}, p.Mappers...)
	}
	p.deployment = p.deployment.clone()
	return p
}

// WithDeploymentIdentity returns a presenter carrying the already-resolved
// process identity. It does not perform metadata discovery.
func (p ErrorPresenter) WithDeploymentIdentity(identity DeploymentIdentity) ErrorPresenter {
	identity = identity.clone()
	identity.AppID = boundedPrintable(identity.AppID, 128)
	identity.AppName = boundedPrintable(identity.AppName, 128)
	identity.AppVersion = boundedPrintable(identity.AppVersion, 128)
	identity.Environment = normalizeEnvironment(identity.Environment)
	identity.EnvironmentColor = normalizeHexColor(identity.EnvironmentColor)
	if identity.EnvironmentColor == "" {
		identity.EnvironmentColor = defaultEnvironmentColor
	}
	identity.InstanceName = boundedPrintable(identity.InstanceName, 128)
	identity.InstanceID = boundedPrintable(identity.InstanceID, 128)
	identity.Hostname = boundedPrintable(identity.Hostname, 255)
	identity.CommitSHA = normalizeCommit(identity.CommitSHA)
	identity.CommitShort = shortCommit(identity.CommitSHA)
	identity.GitRef = boundedPrintable(identity.GitRef, 256)
	identity.GoVersion = boundedPrintable(identity.GoVersion, 64)
	identity.BuildSource = normalizeDeploymentSource(identity.BuildSource,
		"config", "environment", "provider_environment", "go_build_info")
	identity.InstanceSource = normalizeDeploymentSource(identity.InstanceSource,
		"configured", "generated", "mixed", "fallback")
	if identity.Persona != nil {
		if persona, err := deploymentidentity.Validate(identity.Persona.Clone()); err == nil {
			identity.Persona = &persona
		} else {
			identity.Persona = nil
		}
	}
	p.deployment = identity
	return p
}

func normalizeDeploymentSource(value string, allowed ...string) string {
	value = strings.ToLower(boundedPrintable(value, 32))
	if slices.Contains(allowed, value) {
		return value
	}
	return ""
}

// DeploymentIdentity returns the identity attached to this presenter.
func (p ErrorPresenter) DeploymentIdentity() DeploymentIdentity {
	return p.deployment.clone()
}

var defaultErrorPresenter atomic.Value

// NewErrorPresenter constructs an error presenter with default mappers.
func NewErrorPresenter(cfg ErrorConfig, mappers ...goerrors.ErrorMapper) ErrorPresenter {
	cfg = normalizeErrorConfig(cfg, DebugConfig{})
	if len(mappers) == 0 {
		mappers = goerrors.DefaultErrorMappers()
	}
	return ErrorPresenter{
		Config:  cfg,
		Mappers: mappers,
	}
}

// SetDefaultErrorPresenter overrides the package-level presenter used by helpers.
func SetDefaultErrorPresenter(presenter ErrorPresenter) {
	defaultErrorPresenter.Store(presenter.clone())
}

// DefaultErrorPresenter returns the presenter used by writeError.
func DefaultErrorPresenter() ErrorPresenter {
	if stored := defaultErrorPresenter.Load(); stored != nil {
		if presenter, ok := stored.(ErrorPresenter); ok {
			return presenter.clone()
		}
	}
	return NewErrorPresenter(ErrorConfig{})
}

// Present maps an error to a go-errors error and status code.
func (p ErrorPresenter) Present(err error) (*goerrors.Error, int) {
	return presentError(nil, err, p)
}

// PresentWithContext maps an error and enriches it with request metadata.
func (p ErrorPresenter) PresentWithContext(c router.Context, err error) (*goerrors.Error, int) {
	return presentError(c, err, p)
}

// IncludeStackTrace returns whether stack traces should be included in responses.
func (p ErrorPresenter) IncludeStackTrace() bool {
	return p.Config.includeStackTrace()
}

func presentError(c router.Context, err error, presenter ErrorPresenter) (*goerrors.Error, int) {
	mapped, status := mapToGoError(err, presenter.Mappers)
	if mapped == nil {
		mapped = goerrors.New(presenter.Config.InternalMessage, goerrors.CategoryInternal).
			WithCode(http.StatusInternalServerError).
			WithTextCode(goerrors.HTTPStatusToTextCode(http.StatusInternalServerError))
		status = http.StatusInternalServerError
	}

	if mapped.Code == 0 {
		mapped.Code = status
	}
	if mapped.TextCode == "" {
		mapped.TextCode = goerrors.HTTPStatusToTextCode(mapped.Code)
	}
	if mapped.Category == "" {
		mapped.Category = goerrors.CategoryInternal
	}
	if mapped.Timestamp.IsZero() {
		mapped.Timestamp = time.Now()
	}
	if c != nil {
		if mapped.Metadata == nil {
			mapped.Metadata = map[string]any{}
		}
		mapped.Metadata["path"] = c.Path()
		mapped.Metadata["method"] = c.Method()
	}

	mapped = AttachErrorContext(err, mapped)
	mapped = applyErrorPresentation(presenter.Config, mapped)
	return mapped, status
}

func applyErrorPresentation(cfg ErrorConfig, mapped *goerrors.Error) *goerrors.Error {
	if mapped == nil {
		return nil
	}
	if mapped.Category == goerrors.CategoryInternal && !cfg.ExposeInternalMessages {
		mapped.Message = cfg.InternalMessage
	}
	return mapped
}

// BuildDevErrorContext creates an enriched error context for developer error pages.
func (p ErrorPresenter) BuildDevErrorContext(err error, reqInfo *RequestInfo) *DevErrorContext {
	if !p.Config.DevMode {
		return nil
	}

	mapped, _ := p.Present(err)
	if mapped == nil {
		return nil
	}

	ctx := &DevErrorContext{
		ErrorMessage: mapped.Message,
		TextCode:     mapped.TextCode,
		Category:     string(mapped.Category),
		Metadata:     mapped.Metadata,
		RequestInfo:  reqInfo,
	}

	// Extract error type name
	if err != nil {
		ctx.ErrorType = extractErrorTypeName(err)
	}

	// Build enriched stack frames
	if p.IncludeStackTrace() && len(mapped.StackTrace) > 0 {
		ctx.StackFrames = buildStackFrames(mapped.StackTrace, p.Config)
		ctx.PrimarySource = selectPrimarySource(ctx.StackFrames, p.Config)
	}

	// Add environment info
	if p.Config.ShowEnvironment {
		ctx.EnvironmentInfo = p.buildEnvironmentInfo()
	}

	return ctx
}

func (p ErrorPresenter) buildEnvironmentInfo() *EnvironmentInfo {
	environment := &EnvironmentInfo{
		GoVersion:  runtime.Version(),
		AppVersion: p.Config.AppVersion,
		Debug:      p.Config.DevMode,
	}
	if p.deployment.InstanceID == "" && p.deployment.InstanceName == "" {
		return environment
	}
	snapshot := p.deployment.Snapshot(time.Now())
	environment.Deployment = &snapshot
	environment.Environment = p.deployment.Environment
	if p.deployment.AppVersion != "" {
		environment.AppVersion = p.deployment.AppVersion
	}
	if p.deployment.GoVersion != "" {
		environment.GoVersion = p.deployment.GoVersion
	}
	return environment
}

// buildStackFrames converts go-errors stack trace to enriched StackFrameInfo.
func buildStackFrames(trace goerrors.StackTrace, cfg ErrorConfig) []StackFrameInfo {
	if len(trace) == 0 {
		return nil
	}

	frames := make([]StackFrameInfo, 0, len(trace))
	for _, frame := range trace {
		frames = append(frames, StackFrameInfo{
			File:     frame.File,
			Line:     frame.Line,
			Function: frame.Function,
		})
	}

	return EnrichStackFramesWithConfig(frames, cfg)
}

// extractErrorTypeName returns the type name of an error.
func extractErrorTypeName(err error) string {
	if err == nil {
		return ""
	}

	var mapped *goerrors.Error
	if errors.As(err, &mapped) {
		return "goerrors.Error"
	}
	if unwrapper, ok := err.(interface{ Unwrap() error }); ok {
		if inner := unwrapper.Unwrap(); inner != nil {
			return extractErrorTypeName(inner)
		}
	}
	return "error"
}
