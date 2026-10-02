package admin

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/data"
	"github.com/goliatone/go-admin/data/examples/sqlitestore"
	gocommand "github.com/goliatone/go-command"
)

type dataRegistrationPrincipalKey struct{}
type dataRegistrationProvider struct {
	descriptor data.Descriptor
	checks     []data.Check
}

func (p *dataRegistrationProvider) Describe(context.Context, data.Principal, data.DatasetRef) (data.Descriptor, error) {
	return p.descriptor, nil
}
func (p *dataRegistrationProvider) Validate(context.Context, data.Principal, data.Input) ([]data.Check, error) {
	if p.checks != nil {
		return p.checks, nil
	}
	return []data.Check{{ID: "source", Status: data.CheckPassed}}, nil
}
func (*dataRegistrationProvider) Plan(context.Context, data.Principal, data.Kind, data.Input) ([]data.Check, error) {
	return []data.Check{{ID: "source", Status: data.CheckPlanned}}, nil
}
func (*dataRegistrationProvider) Prepare(context.Context, data.Work) (data.PreparationReceipt, error) {
	panic("transport wrote provider")
}
func (*dataRegistrationProvider) Refresh(context.Context, data.Work) (data.PreparationReceipt, error) {
	panic("transport refreshed provider")
}
func (*dataRegistrationProvider) Verify(context.Context, data.Work, data.PreparationReceipt) (data.VerificationResult, error) {
	panic("transport verified provider")
}

type dataRegistrationTarget struct{}

func (dataRegistrationTarget) Capabilities() data.TargetCapabilities {
	return data.TargetCapabilities{}
}
func (dataRegistrationTarget) Allocate(context.Context, data.Work) error {
	panic("dry-run allocated target")
}
func (dataRegistrationTarget) InspectReceipt(context.Context, data.PreparationReceipt) error {
	panic("unexpected receipt")
}
func (dataRegistrationTarget) Commit(context.Context, data.Work, data.Intent) error {
	panic("dry-run committed target")
}
func (dataRegistrationTarget) InspectIntent(context.Context, data.Intent) (data.Observation, error) {
	panic("unexpected intent")
}
func (dataRegistrationTarget) DrainCleanup(context.Context, data.Work, string) error {
	panic("dry-run cleanup")
}

type dataRegistrationPolicy struct{}

func (dataRegistrationPolicy) Authorize(_ context.Context, p data.Principal, r data.AccessRequest) error {
	if p.ActorID != "operator" || r.Target.ScopeKey != "org" {
		return errors.New("denied")
	}
	return nil
}
func dataRegistrationService(t *testing.T) (*data.Service, data.Input, context.Context) {
	t.Helper()
	return dataRegistrationServiceWithChecks(t, nil)
}

func dataRegistrationServiceWithChecks(t *testing.T, checks []data.Check) (*data.Service, data.Input, context.Context) {
	t.Helper()
	store, err := sqlitestore.Open(filepath.Join(t.TempDir(), "ops.db"), sqlitestore.Options{})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := store.Close(); closeErr != nil {
			t.Errorf("close store: %v", closeErr)
		}
	})
	h := strings.Repeat("a", 64)
	d := data.Descriptor{Dataset: data.DatasetRef{Provider: "sample", ID: "a", Version: "1"}, Components: []data.Component{{Path: "records.json", Digest: h}}, SourceContractHash: h, SourceContractVersion: "1", PolicyHash: h, Capabilities: map[data.Kind]data.Capability{data.Validate: {Supported: true}, data.Prepare: {Supported: true}}}
	d.Scenarios = []data.ScenarioRef{{Dataset: d.Dataset, ID: "ready", Version: "1", ProfileHash: h}}
	digest, digestErr := d.CompositeDigest()
	if digestErr != nil {
		t.Fatal(digestErr)
	}
	d.Dataset.Digest = digest
	d.Scenarios[0].Dataset = d.Dataset
	in := data.Input{Dataset: d.Dataset, Scenario: data.ScenarioRef{Dataset: d.Dataset, ID: "ready", Version: "1", ProfileHash: h}, TargetID: "preview", IdempotencyKey: "shared"}
	p := data.Principal{ActorID: "operator", ScopeKey: "org", ExecutionID: "scheduled-worker", ModuleHash: h, PolicyHash: h, PermissionHash: h}
	ctx := context.WithValue(context.Background(), dataRegistrationPrincipalKey{}, p)
	service, err := data.NewService(data.ServiceConfig{Providers: map[string]data.Provider{"sample": &dataRegistrationProvider{descriptor: d, checks: checks}}, Store: store, Target: dataRegistrationTarget{}, Policy: dataRegistrationPolicy{}, Resolve: func(ctx context.Context) (data.Principal, error) {
		p, ok := ctx.Value(dataRegistrationPrincipalKey{}).(data.Principal)
		if !ok {
			return data.Principal{}, errors.New("missing trusted context")
		}
		return p, nil
	}})
	if err != nil {
		t.Fatal(err)
	}
	return service, in, ctx
}

func TestDataValidationEvidenceSurvivesCommandDispatchAndPresentation(t *testing.T) {
	check := data.Check{ID: "source", Status: data.CheckFailed, Expected: "available", Actual: "missing", EvidenceRef: "source-check"}
	service, input, ctx := dataRegistrationServiceWithChecks(t, []data.Check{check})
	bus := NewCommandBus(true)
	handle, err := RegisterDataCommands(bus, service)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := handle.Close(); closeErr != nil {
			t.Errorf("close data commands: %v", closeErr)
		}
	})
	encoded, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err = json.Unmarshal(encoded, &payload); err != nil {
		t.Fatal(err)
	}
	outcome, err := bus.DispatchByNameWithOutcome(ctx, data.Validate.CommandID(), payload, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	if err != nil {
		t.Fatal(err)
	}
	result, ok := outcome.Result.(data.Result)
	if !ok || result.State != data.Failed || len(result.Checks) != 1 || result.Checks[0] != check || data.ErrorCode(CommandResultFailure(result)) != data.CodeInvalid {
		t.Fatal("dispatch lost failed validation evidence", outcome)
	}
	presented, err := DataActionResult(data.Validate, result, nil)
	if err != nil || presented.OK || !presented.Refresh {
		t.Fatal("failed validation presented as success", presented, err)
	}
	op, err := service.LookupOperation(ctx, result.OperationID)
	if err != nil || len(op.Result.Checks) != 1 || op.Result.Checks[0] != check {
		t.Fatal("lookup lost evidence for panel refresh", op, err)
	}
	record := DataCheckRecord(DataCheckView{Origin: data.Validate, OperationID: result.OperationID, Check: op.Result.Checks[0]}, op.Result.Revision)
	row := dataPanelRecordJSON(t, record)
	if row["result"] != "Failed" || row["expected"] != check.Expected || row["actual"] != check.Actual || row["evidence_ref"] != check.EvidenceRef {
		t.Fatal("verification panel lost source evidence", row)
	}
	// The CLI/job/schedule typed seam retries the same durable outcome.
	again, err := (&data.Command[data.ValidateRequest]{Service: service}).Run(ctx, data.ValidateRequest{Input: input})
	if err != nil || again.OperationID != result.OperationID || again.Revision != result.Revision || len(again.Checks) != 1 || again.Checks[0] != check {
		t.Fatal("typed retry changed failed evidence", again, err)
	}
}
func TestDataOwnedCommandsShareTypedPayloadAndTrustedContext(t *testing.T) {
	service, input, ctx := dataRegistrationService(t)
	bus := NewCommandBus(true)
	handle, err := RegisterDataCommands(bus, service)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if closeErr := handle.Close(); closeErr != nil {
			t.Errorf("close command registration: %v", closeErr)
		}
	}()
	encoded, encodeErr := json.Marshal(input)
	if encodeErr != nil {
		t.Fatal(encodeErr)
	}
	payload := map[string]any{}
	if decodeErr := json.Unmarshal(encoded, &payload); decodeErr != nil {
		t.Fatal(decodeErr)
	}
	opts := gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline}
	ui, err := bus.DispatchByNameWithOutcome(ctx, data.Validate.CommandID(), payload, nil, opts)
	if err != nil {
		t.Fatal(err)
	}
	result, ok := ui.Result.(data.Result)
	if !ok || result.State != data.Succeeded {
		t.Fatalf("result missing %+v", ui)
	}
	for _, source := range []string{"cli", "job", "schedule"} {
		t.Run(source, func(t *testing.T) {
			direct, directErr := (&data.Command[data.ValidateRequest]{Service: service}).Run(ctx, data.ValidateRequest{Input: input})
			if directErr != nil || direct.OperationID != result.OperationID || direct.Revision != result.Revision {
				t.Fatal("transport duplicated lifecycle", direct, directErr)
			}
		})
	}
	for _, key := range []string{"actor_id", "scope_key", "execution_id", "principal", "dsn"} {
		forged := map[string]any{}
		if decodeErr := json.Unmarshal(encoded, &forged); decodeErr != nil {
			t.Fatal(decodeErr)
		}
		forged[key] = "admin"
		if _, dispatchErr := bus.DispatchByNameWithOutcome(ctx, data.Validate.CommandID(), forged, nil, opts); data.ErrorCode(dispatchErr) != data.CodeInvalid {
			t.Fatal("forged metadata", key, dispatchErr)
		}
	}
	if _, dispatchErr := bus.DispatchByNameWithOutcome(context.Background(), data.Validate.CommandID(), payload, nil, opts); data.ErrorCode(dispatchErr) != data.CodeDenied {
		t.Fatal("missing trusted principal accepted", dispatchErr)
	}
	input.DryRun = true
	input.IdempotencyKey = "dry"
	encoded, encodeErr = json.Marshal(input)
	if encodeErr != nil {
		t.Fatal(encodeErr)
	}
	if decodeErr := json.Unmarshal(encoded, &payload); decodeErr != nil {
		t.Fatal(decodeErr)
	}
	planned, err := bus.DispatchByNameWithOutcome(ctx, data.Prepare.CommandID(), payload, nil, opts)
	if err != nil {
		t.Fatal(err)
	}
	if r, ok := planned.Result.(data.Result); !ok || r.Phase != "planned" {
		t.Fatal(planned)
	}
	for _, kind := range []data.Kind{data.Validate, data.Prepare, data.Refresh, data.Verify, data.Activate, data.Reset, data.Generate, data.Cancel, data.Recover} {
		if !bus.CommandRegistration(kind.CommandID()).Registered() {
			t.Fatal("unregistered", kind)
		}
	}
	if err = handle.Close(); err != nil {
		t.Fatal(err)
	}
	if err = handle.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err = bus.DispatchByNameWithOutcome(ctx, data.Validate.CommandID(), payload, nil, opts); !errors.Is(err, ErrNotFound) {
		t.Fatal("closed owner still dispatchable", err)
	}
}
