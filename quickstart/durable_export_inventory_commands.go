package quickstart

import (
	"context"
	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-export/export"
)

const InventoryLegacyExportsCommand = "admin.export.legacy.inventory.v1"

type InventoryLegacyExports struct {
	Actor export.Actor               `json:"-"`
	Query LegacyExportInventoryQuery `json:"query"`
}

func (InventoryLegacyExports) Type() string { return InventoryLegacyExportsCommand }
func (m InventoryLegacyExports) Validate() error {
	if m.Actor.ID == "" {
		return durableExportDenied()
	}
	return m.Query.Validate()
}

type LegacyExportInventoryService interface {
	InventoryLegacyExports(context.Context, export.Actor, LegacyExportInventoryQuery) (LegacyExportInventoryResult, error)
}

type InventoryLegacyExportsHandler struct{ Service LegacyExportInventoryService }

func (h *InventoryLegacyExportsHandler) Run(ctx context.Context, m InventoryLegacyExports) (LegacyExportInventoryResult, error) {
	if err := m.Validate(); err != nil {
		return LegacyExportInventoryResult{}, err
	}
	if h == nil || h.Service == nil {
		return LegacyExportInventoryResult{}, durableExportInvalid("legacy inventory service required")
	}
	return h.Service.InventoryLegacyExports(ctx, m.Actor, m.Query)
}
func (h *InventoryLegacyExportsHandler) Execute(ctx context.Context, m InventoryLegacyExports) error {
	result, err := h.Run(ctx, m)
	if err != nil {
		return err
	}
	if out := command.ResultFromContext[LegacyExportInventoryResult](ctx); out != nil {
		out.Store(result)
	}
	return nil
}
