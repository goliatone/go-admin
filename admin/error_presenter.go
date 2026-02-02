package admin

import (
	"net/http"
	"sync/atomic"
	"time"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type ErrorPresenter struct {
	Config  ErrorConfig
	Mappers []goerrors.ErrorMapper
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
	defaultErrorPresenter.Store(presenter)
}

// DefaultErrorPresenter returns the presenter used by writeError.
func DefaultErrorPresenter() ErrorPresenter {
	if stored := defaultErrorPresenter.Load(); stored != nil {
		if presenter, ok := stored.(ErrorPresenter); ok {
			return presenter
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
