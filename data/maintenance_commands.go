package data

import (
	"context"
	gocommand "github.com/goliatone/go-command"
	"strings"
)

const (
	MaintenanceConfigureCommandID = "admin.data.maintenance.configure.v1"
	MaintenanceEnsureCommandID    = "admin.data.maintenance.ensure.v1"
	MaintenanceStatusQueryID      = "admin.data.maintenance.status.v1"
)

type MaintenanceConfigureRequest struct {
	Enabled          bool   `json:"enabled"`
	ExpectedRevision uint64 `json:"expected_revision"`
	RequestKey       string `json:"request_key"`
	DryRun           bool   `json:"dry_run"`
}

func (MaintenanceConfigureRequest) Type() string { return MaintenanceConfigureCommandID }
func (r MaintenanceConfigureRequest) Validate() error {
	if r.ExpectedRevision >= MaxWireCounter {
		return Error(CodeInvalid)
	}
	return maintenanceRequestKey(r.RequestKey)
}

type MaintenanceEnsureRequest struct {
	PolicyRevision     uint64 `json:"policy_revision"`
	ExpectedGeneration uint64 `json:"expected_generation"`
	RequestKey         string `json:"request_key"`
	DryRun             bool   `json:"dry_run"`
}

func (MaintenanceEnsureRequest) Type() string { return MaintenanceEnsureCommandID }
func (r MaintenanceEnsureRequest) Validate() error {
	if r.PolicyRevision == 0 || r.PolicyRevision > MaxWireCounter || r.ExpectedGeneration > MaxWireCounter {
		return Error(CodeInvalid)
	}
	return maintenanceRequestKey(r.RequestKey)
}
func maintenanceRequestKey(key string) error {
	if strings.TrimSpace(key) != key || len(key) < 1 || len(key) > 128 {
		return Error(CodeInvalid)
	}
	for _, c := range key {
		if c < 33 || c > 126 {
			return Error(CodeInvalid)
		}
	}
	return nil
}

type MaintenanceConfigureCommand struct{ Service *MaintenanceService }

func (c *MaintenanceConfigureCommand) Run(ctx context.Context, r MaintenanceConfigureRequest) (MaintenanceResult, error) {
	if c == nil || c.Service == nil {
		return MaintenanceResult{}, Error(CodeUnavailable)
	}
	return c.Service.Configure(ctx, r)
}
func (c *MaintenanceConfigureCommand) Execute(ctx context.Context, r MaintenanceConfigureRequest) error {
	out, e := c.Run(ctx, r)
	return collectMaintenance(ctx, out, e)
}

type MaintenanceEnsureCommand struct{ Service *MaintenanceService }

func (c *MaintenanceEnsureCommand) Run(ctx context.Context, r MaintenanceEnsureRequest) (MaintenanceResult, error) {
	if c == nil || c.Service == nil {
		return MaintenanceResult{}, Error(CodeUnavailable)
	}
	return c.Service.Ensure(ctx, r)
}
func (c *MaintenanceEnsureCommand) Execute(ctx context.Context, r MaintenanceEnsureRequest) error {
	out, e := c.Run(ctx, r)
	return collectMaintenance(ctx, out, e)
}
func collectMaintenance(ctx context.Context, out MaintenanceResult, e error) error {
	if collector := gocommand.ResultFromContext[MaintenanceResult](ctx); collector != nil {
		if e != nil {
			collector.StoreError(e)
		} else {
			collector.Store(out)
		}
	}
	return e
}

type MaintenanceStatusQuery struct{}

func (MaintenanceStatusQuery) Type() string { return MaintenanceStatusQueryID }

type MaintenanceStatusHandler struct{ Service *MaintenanceService }

func (h *MaintenanceStatusHandler) Query(ctx context.Context, _ MaintenanceStatusQuery) (MaintenanceResult, error) {
	if h == nil || h.Service == nil {
		return MaintenanceResult{}, Error(CodeUnavailable)
	}
	return h.Service.Status(ctx)
}

func (h *MaintenanceStatusHandler) Execute(ctx context.Context, q MaintenanceStatusQuery) error {
	out, e := h.Query(ctx, q)
	return collectMaintenance(ctx, out, e)
}
