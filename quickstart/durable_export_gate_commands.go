package quickstart

import (
	"context"
	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-export/export"
)

const SealDurableExportsCommand = "admin.export.recovery.seal.v1"
const ResumeDurableExportsCommand = "admin.export.recovery.resume.v1"

// Trusted operator adapters supply Actor; no public route/factory is installed.
type SealDurableExports struct {
	Actor export.Actor `json:"-"`
}

func (SealDurableExports) Type() string { return SealDurableExportsCommand }
func (m SealDurableExports) Validate() error {
	if m.Actor.ID == "" {
		return durableExportDenied()
	}
	return nil
}

type ResumeDurableExports struct {
	Actor      export.Actor             `json:"-"`
	Checkpoint ExportRecoveryCheckpoint `json:"checkpoint"`
}

func (ResumeDurableExports) Type() string { return ResumeDurableExportsCommand }
func (m ResumeDurableExports) Validate() error {
	if m.Actor.ID == "" {
		return durableExportDenied()
	}
	return m.Checkpoint.Validate()
}

type SealDurableExportsHandler struct{ Gate *DurableExportRecoveryGate }

func (h *SealDurableExportsHandler) Run(ctx context.Context, m SealDurableExports) (ExportRecoveryGateState, error) {
	if e := m.Validate(); e != nil {
		return ExportRecoveryGateState{}, e
	}
	if h == nil || h.Gate == nil {
		return ExportRecoveryGateState{}, durableExportInvalid("recovery gate required")
	}
	if e := h.Gate.Seal(ctx, m.Actor); e != nil {
		return ExportRecoveryGateState{}, e
	}
	return h.Gate.State(), nil
}
func (h *SealDurableExportsHandler) Execute(ctx context.Context, m SealDurableExports) error {
	r, e := h.Run(ctx, m)
	if e != nil {
		return e
	}
	if out := command.ResultFromContext[ExportRecoveryGateState](ctx); out != nil {
		out.Store(r)
	}
	return nil
}

type ResumeDurableExportsHandler struct{ Gate *DurableExportRecoveryGate }

func (h *ResumeDurableExportsHandler) Run(ctx context.Context, m ResumeDurableExports) (ExportRecoveryGateState, error) {
	if e := m.Validate(); e != nil {
		return ExportRecoveryGateState{}, e
	}
	if h == nil || h.Gate == nil {
		return ExportRecoveryGateState{}, durableExportInvalid("recovery gate required")
	}
	if e := h.Gate.Resume(ctx, m.Actor, m.Checkpoint); e != nil {
		return ExportRecoveryGateState{}, e
	}
	return h.Gate.State(), nil
}
func (h *ResumeDurableExportsHandler) Execute(ctx context.Context, m ResumeDurableExports) error {
	r, e := h.Run(ctx, m)
	if e != nil {
		return e
	}
	if out := command.ResultFromContext[ExportRecoveryGateState](ctx); out != nil {
		out.Store(r)
	}
	return nil
}
