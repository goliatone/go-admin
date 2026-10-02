package admin

import (
	"context"
	"encoding/json"
	"errors"
	gerrors "github.com/goliatone/go-errors"
	"net/http"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
)

type dataSnapshotKey struct{}
type dataSnapshotProjection struct {
	owner   *DataModule
	model   dataModuleReadModel
	choices []DataActionChoice
}

func (m *DataModule) projection(ctx context.Context) *dataSnapshotProjection {
	p, _ := ctx.Value(dataSnapshotKey{}).(*dataSnapshotProjection)
	if p != nil && p.owner == m {
		return p
	}
	return nil
}

// Every invocation gets its own detached data. No grant, provider-owned map or
// mutable projection is shared with another snapshot or an action request.
func (m *DataModule) prepareSnapshot(ctx context.Context, _ console.Identity) (context.Context, error) {
	ctx = context.WithValue(ctx, dataSnapshotKey{}, (*dataSnapshotProjection)(nil))
	model, err := m.readModel(ctx)
	if ctx.Err() != nil {
		return ctx, ctx.Err()
	}
	if err != nil {
		return ctx, dataConsoleReadError(err)
	}
	copy := struct {
		Catalog    []data.Descriptor
		State      data.ActiveState
		Operations []data.Operation
		Receipts   []*data.PreparationReceipt
	}{model.catalog, model.state, model.ops, model.receipts}
	encoded, err := json.Marshal(copy)
	if err != nil {
		return ctx, err
	}
	if err = json.Unmarshal(encoded, &copy); err != nil {
		return ctx, err
	}
	model = dataModuleReadModel{copy.Catalog, copy.State, copy.Operations, copy.Receipts}
	projection := &dataSnapshotProjection{owner: m, model: model}
	for _, descriptor := range model.catalog {
		projection.choices = append(projection.choices, m.datasetChoices(descriptor, model)...)
	}
	for _, op := range model.ops {
		if !op.Result.State.Terminal() && !op.Result.DryRun && op.Result.Kind.Writes() {
			projection.choices = append(projection.choices, DataActionChoice{Kind: data.Recover, Label: "Recover " + op.Result.OperationID, Input: data.Input{TargetID: m.config.TargetID, OperationID: op.Result.OperationID}})
		}
	}
	return context.WithValue(ctx, dataSnapshotKey{}, projection), nil
}

func dataConsoleReadError(err error) error {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err
	}
	if code, known := data.SafeErrorCode(err); known {
		switch code {
		case data.CodeDenied:
			return ErrForbidden
		case data.CodeProvider, data.CodeUnavailable:
			return gerrors.Wrap(err, gerrors.CategoryExternal, "Console data is unavailable. Retry the request.").WithCode(http.StatusServiceUnavailable).WithTextCode("CONSOLE_PROVIDER_FAILED")
		}
	}
	return err
}

func (model dataModuleReadModel) receipt(id string) *data.PreparationReceipt {
	for _, receipt := range model.receipts {
		if receipt.ID == id {
			return receipt
		}
	}
	return nil
}
func (model dataModuleReadModel) operation(id string) *data.Operation {
	for i := range model.ops {
		if model.ops[i].Result.OperationID == id {
			return &model.ops[i]
		}
	}
	return nil
}

func (m *DataModule) permittedProjectedChoice(ctx context.Context, model dataModuleReadModel, choice DataActionChoice, capabilities map[data.Kind]data.Capability) bool {
	if !capabilities[choice.Kind].Supported {
		return false
	}
	a := data.AccessRequest{Action: string(choice.Kind), Target: model.state.Target}
	if !choice.ReceiptInput && (choice.Kind == data.Verify || choice.Kind == data.Activate) {
		a.Receipt = model.receipt(choice.Input.ReceiptID)
		if a.Receipt == nil {
			return false
		}
	}
	return m.config.Service.AuthorizeProjection(ctx, a) == nil
}

func (m *DataModule) permittedRecovery(ctx context.Context, model dataModuleReadModel, input data.Input) bool {
	if m.projection(ctx) == nil {
		return m.config.Service.AuthorizeInput(ctx, data.Recover, input) == nil
	}
	op := model.operation(input.OperationID)
	return op != nil && m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: string(data.Recover), Target: model.state.Target, Operation: op}) == nil
}

func (m *DataModule) allowProjectedRecord(ctx context.Context, model dataModuleReadModel, panel string, record console.Record) bool {
	if record.TargetID != "" && record.TargetID != m.config.TargetID {
		return false
	}
	if m.config.Service.AuthorizeView(ctx, m.config.TargetID) != nil {
		return false
	}
	row, _ := record.Data.(map[string]any)
	opID, _ := row["operation_id"].(string)
	if panel == DataPanelOperations {
		opID = record.Key
	}
	if opID != "" {
		op := model.operation(opID)
		if op == nil || m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: "view", Target: model.state.Target, Operation: op}) != nil {
			return false
		}
	}
	receiptID, _ := row["receipt_id"].(string)
	// Operation rows are historical outcomes, authorized by operation policy.
	if receiptID != "" && panel != DataPanelOperations {
		r := model.receipt(receiptID)
		if r == nil || m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: "view", Target: model.state.Target, Receipt: r}) != nil {
			return false
		}
	}

	return true
}

// Re-render capability summaries with current action grants, without changing
// the loaded lifecycle state. The host has already detached the outgoing row.
func (m *DataModule) projectDataRecord(ctx context.Context, _ console.Identity, panel string, record console.Record) console.Record {
	p := m.projection(ctx)
	if p == nil {
		return record
	}
	if panel == DataPanelOverview {
		model := p.model
		model.ops = nil
		model.receipts = nil
		for _, op := range p.model.ops {
			if m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: "view", Target: model.state.Target, Operation: &op}) == nil {
				model.ops = append(model.ops, op)
			}
		}
		for _, receipt := range p.model.receipts {
			if m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: "view", Target: model.state.Target, Receipt: receipt}) == nil {
				model.receipts = append(model.receipts, receipt)
			}
		}
		view := model.overview()
		view.Capabilities = m.currentCapabilities(ctx, view.Capabilities)
		record.Data = DataOverviewRecord(view, record.Revision).Data
		return record
	}
	if panel == DataPanelDatasets {
		for _, descriptor := range p.model.catalog {
			if DataDatasetRecord(descriptor, record.Revision).Key != record.Key {
				continue
			}
			row, _ := record.Data.(map[string]any)
			row["actions"], row["unavailable"] = dataCapabilitySummary(m.currentCapabilities(ctx, descriptor.Capabilities))
			break
		}
	}
	return record
}

func (m *DataModule) currentCapabilities(ctx context.Context, source map[data.Kind]data.Capability) map[data.Kind]data.Capability {
	caps := make(map[data.Kind]data.Capability, len(source))
	for kind, capability := range source {
		capability.Permitted = capability.Supported && m.config.Service.AuthorizeAction(ctx, kind, m.config.TargetID) == nil
		caps[kind] = capability
	}
	return caps
}

func (m *DataModule) projectedChoices(ctx context.Context, projection *dataSnapshotProjection) ([]DataActionChoice, error) {
	out := []DataActionChoice{}
	for _, choice := range projection.choices {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		if choice.Kind == data.Recover {
			if m.permittedRecovery(ctx, projection.model, choice.Input) {
				out = append(out, choice)
			}
			continue
		}
		for _, descriptor := range projection.model.catalog {
			if descriptor.Dataset == choice.Input.Dataset && m.permittedProjectedChoice(ctx, projection.model, choice, descriptor.Capabilities) {
				out = append(out, choice)
				break
			}
		}
	}
	return out, nil
}
