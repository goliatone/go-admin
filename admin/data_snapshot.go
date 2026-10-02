package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	gerrors "github.com/goliatone/go-errors"
)

type dataSnapshotKey struct{}
type dataSnapshotProjection struct {
	owner   *DataModule
	model   dataModuleReadModel
	choices []DataActionChoice
	// Selectors are derived from canonical inputs, never from mutable outgoing
	// Data. A masking callback cannot remove receipt_id to bypass record policy.
	recordRefs map[string]map[string]dataRecordPolicyRefs
}

type dataRecordPolicyRefs struct{ operationID, receiptID string }

func (m *DataModule) projection(ctx context.Context) *dataSnapshotProjection {
	p, ok := ctx.Value(dataSnapshotKey{}).(*dataSnapshotProjection)
	if ok && p != nil && p.owner == m {
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
	projection.recordRefs = map[string]map[string]dataRecordPolicyRefs{}
	refs := map[string][]console.Record{DataPanelVerification: model.checkRecords(1), DataPanelCoverage: model.coverageRecords(1)}
	for _, descriptor := range model.catalog {
		for _, scenario := range descriptor.Scenarios {
			refs[DataPanelScenarios] = append(refs[DataPanelScenarios], DataScenarioRecord(model.scenario(scenario, m.config.TargetID), 1))
		}
	}
	for panel, records := range refs {
		projection.recordRefs[panel] = map[string]dataRecordPolicyRefs{}
		for _, record := range records {
			row, ok := record.Data.(map[string]any)
			if !ok {
				return ctx, dataConsoleReadError(data.Error(data.CodeProvider))
			}
			projection.recordRefs[panel][record.Key] = dataRecordPolicyRefs{dataRecordReference(row, "operation_id"), dataRecordReference(row, "receipt_id")}
		}
	}
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

func (m *DataModule) authorizeProjectedChoice(ctx context.Context, model dataModuleReadModel, choice DataActionChoice, capabilities map[data.Kind]data.Capability) (bool, error) {
	if !capabilities[choice.Kind].Supported {
		return false, nil
	}
	a := data.AccessRequest{Action: string(choice.Kind), Target: model.state.Target}
	if !choice.ReceiptInput && (choice.Kind == data.Verify || choice.Kind == data.Activate) {
		a.Receipt = model.receipt(choice.Input.ReceiptID)
		if a.Receipt == nil {
			return false, nil
		}
	}
	return dataDisplayAccess(m.config.Service.AuthorizeProjection(ctx, a))
}

func (m *DataModule) permittedRecovery(ctx context.Context, model dataModuleReadModel, input data.Input) bool {
	if m.projection(ctx) == nil {
		return m.config.Service.AuthorizeInput(ctx, data.Recover, input) == nil
	}
	op := model.operation(input.OperationID)
	return op != nil && m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: string(data.Recover), Target: model.state.Target, Operation: op}) == nil
}

// Display denial hides metadata. Backend/cancellation failures abort delivery;
// a failed authorization check must never become a successful empty projection.
func dataDisplayAccess(err error) (bool, error) {
	if err == nil {
		return true, nil
	}
	if code, known := data.SafeErrorCode(err); known && (code == data.CodeDenied || code == data.CodeGone) {
		return false, nil
	}
	return false, dataConsoleReadError(err)
}

func (m *DataModule) authorizeProjectedRecord(ctx context.Context, model dataModuleReadModel, panel string, record console.Record) (bool, error) {
	if record.TargetID != "" && record.TargetID != m.config.TargetID {
		return false, nil
	}
	if allowed, err := dataDisplayAccess(m.config.Service.AuthorizeView(ctx, m.config.TargetID)); !allowed {
		return false, err
	}
	row, ok := record.Data.(map[string]any)
	if !ok {
		return false, nil
	}
	opID := dataRecordReference(row, "operation_id")
	receiptID := dataRecordReference(row, "receipt_id")
	if projection := m.projection(ctx); projection != nil {
		if references, indexed := projection.recordRefs[panel]; indexed {
			ref, exists := references[record.Key]
			if !exists {
				return false, nil
			}
			opID, receiptID = ref.operationID, ref.receiptID
		}
	}
	if panel == DataPanelOperations {
		opID = record.Key
	}
	if panel == DataPanelOperations {
		receiptID = ""
	}
	return m.authorizeRecordReferences(ctx, model, opID, receiptID)
}

func (m *DataModule) authorizeRecordReferences(ctx context.Context, model dataModuleReadModel, opID, receiptID string) (bool, error) {
	if opID != "" {
		op := model.operation(opID)
		if op == nil {
			return false, nil
		}
		if allowed, err := dataDisplayAccess(m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: "view", Target: model.state.Target, Operation: op})); !allowed {
			return false, err
		}
	}
	// Operation rows are historical outcomes, authorized by operation policy.
	if receiptID != "" {
		receipt := model.receipt(receiptID)
		if receipt == nil {
			return false, nil
		}
		if allowed, err := dataDisplayAccess(m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: "view", Target: model.state.Target, Receipt: receipt})); !allowed {
			return false, err
		}
	}
	return true, nil
}

func (m *DataModule) deliverDataRecord(ctx context.Context, identity console.Identity, panel string, record console.Record) (console.Record, bool, error) {
	if m.projection(ctx) == nil {
		// A direct live record uses the same authorized projection as snapshots and
		// lookups. Data's own events are invalidations, so they reload via Snapshot.
		var err error
		ctx, err = m.prepareSnapshot(ctx, identity)
		if err != nil {
			return console.Record{}, false, err
		}
	}
	allowed, err := m.authorizeProjectedRecord(ctx, m.projection(ctx).model, panel, record)
	if !allowed {
		return console.Record{}, false, err
	}
	record, err = m.projectDataRecordForDelivery(ctx, identity, panel, record)
	return record, err == nil, err
}

// Re-render capability summaries with current action grants, without changing
// the loaded lifecycle state. The host has already detached the outgoing row.
func (m *DataModule) projectDataRecord(ctx context.Context, identity console.Identity, panel string, record console.Record) console.Record {
	// Sources have already rendered the loaded model. Policy redaction happens
	// only at delivery, after every host Project callback has finished.
	return record
}

func (m *DataModule) projectDataRecordForDelivery(ctx context.Context, _ console.Identity, panel string, record console.Record) (console.Record, error) {
	p := m.projection(ctx)
	if p == nil {
		return record, nil
	}
	if panel == DataPanelOverview {
		return m.projectDataOverview(ctx, p, record)
	}
	if panel == DataPanelDatasets {
		for _, descriptor := range p.model.catalog {
			if DataDatasetRecord(descriptor, record.Revision).Key != record.Key {
				continue
			}
			row, ok := record.Data.(map[string]any)
			if !ok || row == nil {
				return console.Record{}, validationDomainError("data dataset record has no row", nil)
			}
			capabilities, err := m.currentCapabilities(ctx, descriptor.Capabilities)
			if err != nil {
				return console.Record{}, err
			}
			row["actions"], row["unavailable"] = dataCapabilitySummary(capabilities)
			break
		}
	}
	return record, nil
}

func (m *DataModule) currentCapabilities(ctx context.Context, source map[data.Kind]data.Capability) (map[data.Kind]data.Capability, error) {
	caps := make(map[data.Kind]data.Capability, len(source))
	for kind, capability := range source {
		capability.Permitted = false
		if capability.Supported {
			allowed, err := dataDisplayAccess(m.config.Service.AuthorizeAction(ctx, kind, m.config.TargetID))
			if err != nil {
				return nil, err
			}
			capability.Permitted = allowed
		}
		caps[kind] = capability
	}
	return caps, nil
}

func (m *DataModule) projectedChoices(ctx context.Context, projection *dataSnapshotProjection) ([]DataActionChoice, error) {
	out := []DataActionChoice{}
	for _, choice := range projection.choices {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		if choice.Kind == data.Recover {
			op := projection.model.operation(choice.Input.OperationID)
			if op == nil {
				continue
			}
			accessErr := m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: string(data.Recover), Target: projection.model.state.Target, Operation: op})
			// A missing durable recovery capability is display unavailability.
			// Policy backend outages are categorized as external by the service.
			var structured *gerrors.Error
			if data.ErrorCode(accessErr) == data.CodeUnavailable && errors.As(accessErr, &structured) && structured.Category != gerrors.CategoryExternal {
				continue
			}
			allowed, err := dataDisplayAccess(accessErr)
			if err != nil {
				return nil, err
			}
			if allowed {
				out = append(out, choice)
			}
			continue
		}
		for _, descriptor := range projection.model.catalog {
			if descriptor.Dataset != choice.Input.Dataset {
				continue
			}
			allowed, err := m.authorizeProjectedChoice(ctx, projection.model, choice, descriptor.Capabilities)
			if err != nil {
				return nil, err
			}
			if allowed {
				out = append(out, choice)
				break
			}
		}
	}
	return out, nil
}

func dataRecordReference(row map[string]any, key string) string {
	value, ok := row[key].(string)
	if !ok {
		return ""
	}
	return value
}

func (m *DataModule) projectDataOverview(ctx context.Context, p *dataSnapshotProjection, record console.Record) (console.Record, error) {
	// Definition filters have a legacy no-error callback. Validate their
	// current choice policy here too, so backend failure cannot be delivered
	// as an apparently successful console with withdrawn controls.
	if _, err := m.projectedChoices(ctx, p); err != nil {
		return console.Record{}, err
	}
	model := p.model
	model.ops = nil
	model.receipts = nil
	for _, op := range p.model.ops {
		allowed, err := dataDisplayAccess(m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: "view", Target: model.state.Target, Operation: &op}))
		if err != nil {
			return console.Record{}, err
		}
		if allowed {
			model.ops = append(model.ops, op)
		}
	}
	for _, receipt := range p.model.receipts {
		allowed, err := dataDisplayAccess(m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: "view", Target: model.state.Target, Receipt: receipt}))
		if err != nil {
			return console.Record{}, err
		}
		if allowed {
			model.receipts = append(model.receipts, receipt)
		}
	}
	view := model.overview()
	var err error
	view.Capabilities, err = m.currentCapabilities(ctx, view.Capabilities)
	if err != nil {
		return console.Record{}, err
	}
	record.Data = DataOverviewRecord(view, record.Revision).Data
	return record, nil
}
