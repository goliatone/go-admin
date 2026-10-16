package quickstart

import (
	"context"
	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-export/export"
)

const AdoptLegacyExportCommand = "admin.export.legacy.adopt.v1"

// AdoptLegacyExport contains reviewed references, never endpoint credentials.
// The operator adapter must supply Actor from trusted current authentication.
// It is deliberately not installed in public HTTP/RPC message factories.
type AdoptLegacyExport struct {
	Actor   export.Actor                `json:"-"`
	Request LegacyExportAdoptionRequest `json:"request"`
}

func (AdoptLegacyExport) Type() string { return AdoptLegacyExportCommand }
func (m AdoptLegacyExport) Validate() error {
	if m.Actor.ID == "" {
		return durableExportDenied()
	}
	return m.Request.Validate()
}

type LegacyExportAdoptionService interface {
	AdoptLegacyExport(context.Context, export.Actor, LegacyExportAdoptionRequest) (LegacyExportAdoptionResult, error)
}
type AdoptLegacyExportHandler struct{ Service LegacyExportAdoptionService }

func (h *AdoptLegacyExportHandler) Run(ctx context.Context, m AdoptLegacyExport) (LegacyExportAdoptionResult, error) {
	if e := m.Validate(); e != nil {
		return LegacyExportAdoptionResult{}, e
	}
	if h == nil || h.Service == nil {
		return LegacyExportAdoptionResult{}, durableExportInvalid("legacy adoption service required")
	}
	return h.Service.AdoptLegacyExport(ctx, m.Actor, m.Request)
}
func (h *AdoptLegacyExportHandler) Execute(ctx context.Context, m AdoptLegacyExport) error {
	result, e := h.Run(ctx, m)
	if e != nil {
		return e
	}
	if out := command.ResultFromContext[LegacyExportAdoptionResult](ctx); out != nil {
		out.Store(result)
	}
	return nil
}
