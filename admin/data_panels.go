package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"maps"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/console"
	admindata "github.com/goliatone/go-admin/data"
	gerrors "github.com/goliatone/go-errors"
)

// Data console presentation. The Data module owns routes, policy, services and
// which records an actor may read; this file only declares the panel views and
// projects lifecycle read models into the display records those views bind to.
// Projections apply no authorization and never copy principals, idempotency
// keys, fingerprints, stage IDs or provider component paths into a record.

// DataPageTemplate is the packaged Data console page. It extends the neutral
// console shell, so the module renders it with ConsolePageRenderer.
const DataPageTemplate = "resources/data/index"

// Data console panel IDs. Each panel declares Order so the overview leads
// wherever declared order is honored.
const (
	DataPanelOverview     = "overview"
	DataPanelDatasets     = "datasets"
	DataPanelScenarios    = "scenarios"
	DataPanelOperations   = "operations"
	DataPanelVerification = "verification"
	DataPanelCoverage     = "coverage"
)

// DataOverviewRecordKey identifies the overview's single summary record.
const DataOverviewRecordKey = "summary"

// DataPanelIDs returns the Data panels in display order.
func DataPanelIDs() []string {
	return []string{DataPanelOverview, DataPanelDatasets, DataPanelScenarios, DataPanelOperations, DataPanelVerification, DataPanelCoverage}
}

// RegisterDataPanels declares the Data views on a registry owned by the Data
// module. The module's snapshot source supplies records built with the
// Data*Record projections after its read and record policy selected them.
// Without DataPanelActions every panel is read-only.
func RegisterDataPanels(registry *console.PanelRegistry, actions ...DataPanelActions) error {
	if registry == nil {
		return validationDomainError("data panels require a console registry", nil)
	}
	var bound DataPanelActions
	if len(actions) > 0 {
		bound = actions[0]
	}
	panels := []struct {
		id, label, icon string
		ui              *console.PanelUI
	}{
		{DataPanelOverview, "Overview", "iconoir-home", dataOverviewUI()},
		{DataPanelDatasets, "Datasets", "iconoir-database", dataDatasetsUI()},
		{DataPanelScenarios, "Scenarios", "iconoir-list", dataScenariosUI()},
		{DataPanelOperations, "Operations", "iconoir-flash", dataOperationsUI()},
		{DataPanelVerification, "Verification", "iconoir-shield-check", dataVerificationUI()},
		{DataPanelCoverage, "Coverage", "iconoir-calendar", dataCoverageUI()},
	}
	for index, panel := range panels {
		config := console.PanelConfig{
			Label:           panel.label,
			Icon:            panel.icon,
			Category:        "data",
			Order:           (index + 1) * 10,
			Span:            12,
			SupportsToolbar: new(false),
			UI:              panel.ui,
		}
		if bound.Choices != nil && bound.Dispatch != nil && (panel.id == DataPanelOverview || panel.id == DataPanelOperations) {
			config.Definition = bound.definition(panel.id)
			config.ActionResolver = bound.resolver(panel.id)
		}
		if err := registry.Register(panel.id, config); err != nil {
			return err
		}
	}
	return nil
}

// DataActionChoice is one lifecycle action the current actor may start. The
// module derives choices from authorized reads and current capabilities;
// Input binds the selected work; the operator supplies request options and an
// optional receipt selector. Generation is captured in the action payload.
// Cancel and Recover choices appear on operations; other kinds on overview.
type DataActionChoice struct {
	Kind  admindata.Kind
	Label string
	Input admindata.Input
	// ReceiptInput lets an operator select a retained receipt beyond the bounded
	// overview. Service policy and receipt identity remain authoritative.
	ReceiptInput bool
}

// DataPanelActions binds module dispatch to the Data presentation. Choices is
// called for every authorized definition and again before dispatch, so a
// choice that is no longer offered cannot run. Dispatch runs the registered
// typed command for the current trusted actor.
type DataPanelActions struct {
	Choices  func(context.Context) ([]DataActionChoice, error)
	Dispatch func(context.Context, admindata.Kind, admindata.Input) (admindata.Result, error)
}

// DataActionKind returns the lifecycle kind of a Data action ID so module
// policy can authorize declared actions by kind.
func DataActionKind(actionID string) (admindata.Kind, bool) {
	kind, _, found := strings.Cut(actionID, "-")
	if !found || !admindata.Kind(kind).Valid() {
		return "", false
	}
	return admindata.Kind(kind), true
}

func dataActionID(choice DataActionChoice) string {
	in := choice.Input
	// The action identifies selected work. Generation is a request precondition,
	// captured in the payload so old pages remain stale and retries stay reachable.
	return string(choice.Kind) + "-" + strings.TrimPrefix(dataRecordKey("action", in.Dataset.Digest, in.Scenario.ID, in.Scenario.Version,
		in.Scenario.ProfileHash, in.TargetID, in.ReceiptID, in.OperationID), "action-")
}

func dataChoicePanel(kind admindata.Kind) string {
	if kind == admindata.Cancel || kind == admindata.Recover {
		return DataPanelOperations
	}
	return DataPanelOverview
}

func (a DataPanelActions) choices(ctx context.Context, panelID string) map[string]DataActionChoice {
	choices, err := a.Choices(ctx)
	if err != nil {
		return nil
	}
	out := map[string]DataActionChoice{}
	for _, choice := range choices {
		if choice.Kind.Valid() && dataChoicePanel(choice.Kind) == panelID {
			out[dataActionID(choice)] = choice
		}
	}
	return out
}

func (a DataPanelActions) definition(panelID string) console.PanelDefinitionFilter {
	return func(ctx context.Context, def console.PanelDefinition) console.PanelDefinition {
		if def.UI == nil {
			return def
		}
		ui := *def.UI
		ui.Actions = nil
		choices := a.choices(ctx, panelID)
		ids := slices.Collect(maps.Keys(choices))
		slices.SortFunc(ids, func(left, right string) int {
			byKind := slices.Index(dataKindOrder, string(choices[left].Kind)) - slices.Index(dataKindOrder, string(choices[right].Kind))
			if byKind != 0 {
				return byKind
			}
			return strings.Compare(choices[left].Label+left, choices[right].Label+right)
		})
		for _, id := range ids {
			ui.Actions = append(ui.Actions, dataActionControl(id, choices[id]))
		}
		if len(ui.Actions) > 0 {
			ui.ActionLayout = &console.PanelUIActionLayout{Mode: console.PanelActionLayoutSelect, PickerLabel: "Action", EmptyText: "Choose an action"}
		}
		def.UI = &ui
		return def
	}
}

func dataActionControl(id string, choice DataActionChoice) console.PanelUIAction {
	label := choice.Label
	if label == "" {
		label = dataKindLabel(choice.Kind)
	}
	fields := []console.PanelUIActionField{{
		Name: "idempotency_key", Label: "Request key", Kind: "text", Required: true,
		Placeholder: "New key for new work",
		Help:        "Reuse the same key to retry this request; a new key starts new work.",
	}}
	if choice.Kind == admindata.Recover {
		fields = nil
	}
	if choice.ReceiptInput {
		fields = append(fields, console.PanelUIActionField{Name: "receipt_id", Label: "Receipt ID", Kind: "text", Required: true, Help: "Use a retained receipt for this scenario and target. Activation requires successful verification."})
	}
	if choice.Kind != admindata.Cancel && choice.Kind != admindata.Recover {
		fields = append(fields, console.PanelUIActionField{Name: "dry_run", Label: "Dry run (plan only, no changes)", Kind: "checkbox"})
	}
	if choice.Kind == admindata.Prepare || choice.Kind == admindata.Refresh || choice.Kind == admindata.Generate {
		fields = append(fields, console.PanelUIActionField{Name: "batch_limit", Label: "Batch limit", Kind: "integer", Placeholder: "100"})
	}
	action := console.PanelUIAction{ID: id, Label: label, SubmitLabel: dataKindLabel(choice.Kind), Kind: string(choice.Kind), Fields: fields, Refresh: true}
	switch choice.Kind {
	case admindata.Activate, admindata.Reset:
		if choice.Input.ExpectedGeneration != nil {
			action.Payload = map[string]any{"expected_generation": *choice.Input.ExpectedGeneration}
		}
		action.RequiresConfirm = true
		action.ConfirmText = label + "? This changes the active dataset on target " + choice.Input.TargetID + "."
	case admindata.Cancel:
		action.RequiresConfirm = true
		action.ConfirmText = label + "? Work stops at the next safe point; a committed activation is not undone."
	case admindata.Recover:
		action.RequiresConfirm = true
		action.ConfirmText = label + "? Recovery waits for lease expiry and reconciles existing work without repeating provider effects."
	}
	return action
}

func (a DataPanelActions) resolver(panelID string) console.PanelActionHandlerResolver {
	return func(_ context.Context, actionID string) console.PanelActionHandler {
		return func(ctx context.Context, request console.PanelActionRequest) (console.PanelActionResult, error) {
			choice, ok := a.choices(ctx, panelID)[actionID]
			if !ok {
				return console.PanelActionResult{OK: false, Message: "This action is no longer available. The panels were refreshed.", Refresh: true}, nil
			}
			input, fields := dataActionInput(choice, request.Payload)
			if len(fields) > 0 {
				return dataFailureResult(admindata.CodeInvalid, fields), nil
			}
			result, err := a.Dispatch(ctx, choice.Kind, input)
			return DataActionResult(choice.Kind, result, err)
		}
	}
}

// dataActionInput applies only the operator-supplied request fields to the
// server-side choice; submitted lifecycle identities are ignored.
func dataActionInput(choice DataActionChoice, payload map[string]any) (admindata.Input, map[string]string) {
	input := choice.Input
	fields := map[string]string{}
	if choice.Kind == admindata.Recover {
		return input, fields
	}
	if choice.ReceiptInput {
		input.ReceiptID = ""
		if id, ok := payload["receipt_id"].(string); ok {
			input.ReceiptID = strings.TrimSpace(id)
		}
		if input.ReceiptID == "" {
			fields["receipt_id"] = "Enter a retained receipt ID."
		}
	}
	input.IdempotencyKey = ""
	if key, ok := payload["idempotency_key"].(string); ok {
		input.IdempotencyKey = strings.TrimSpace(key)
	}
	if input.IdempotencyKey == "" {
		fields["idempotency_key"] = "Enter a request key."
	}
	if choice.Kind == admindata.Activate || choice.Kind == admindata.Reset {
		dataActionGeneration(&input, payload, fields)
	}
	dataActionOptions(&input, choice.Kind, payload, fields)
	return input, fields
}

func dataActionGeneration(input *admindata.Input, payload map[string]any, fields map[string]string) {
	generation, ok := payload["expected_generation"].(float64)
	if !ok || generation < 0 || generation > float64(admindata.MaxWireCounter) || generation != float64(uint64(generation)) {
		fields["expected_generation"] = "Refresh the panels to load the target generation."
		return
	}
	value := uint64(generation)
	input.ExpectedGeneration = &value
}

func dataActionOptions(input *admindata.Input, kind admindata.Kind, payload map[string]any, fields map[string]string) {
	if value, present := payload["dry_run"]; present && kind != admindata.Cancel {
		dryRun, ok := value.(bool)
		if !ok {
			fields["dry_run"] = "Dry run must be on or off."
		}
		input.DryRun = dryRun
	}
	if value, present := payload["batch_limit"]; present {
		limit, ok := value.(float64)
		if !ok || limit != float64(int(limit)) || limit < 1 || limit > 10000 {
			fields["batch_limit"] = "Enter a whole number from 1 to 10000."
		} else {
			input.BatchLimit = int(limit)
		}
	}
}

func dataColumn(label, bind string, format ...string) map[string]any {
	column := map[string]any{"label": label, "bind": bind}
	if len(format) > 0 {
		column["format"] = format[0]
	}
	return column
}

func dataField(label, bind string, format ...string) map[string]any {
	field := dataColumn(label, bind, format...)
	field["empty"] = "None"
	return field
}

// dataTable binds a table to rows that carry their record key as `key`.
func dataTable(title, bind string, columns ...map[string]any) *console.PanelUIView {
	view := console.TableView(bind)
	view.Title = title
	view.Options = map[string]any{"key_bind": "key", "columns": columns}
	return view
}

func dataSelectFilter(id, label, bind string, options ...string) console.PanelUIFilter {
	return console.PanelUIFilter{ID: id, Label: label, Kind: console.PanelFilterSelect, Bind: bind, Options: options}
}

func dataOverviewUI() *console.PanelUI {
	active := console.IdentityView("primary")
	active.Title = "Active dataset"
	active.Options = map[string]any{
		"eyebrow_bind":        "status_label",
		"title_bind":          "scenario_label",
		"title_fallback_bind": "target_id",
		"subtitle_bind":       "dataset_label",
		"empty":               "Nothing active",
		"chips": []map[string]any{
			dataField("Target", "target_id"),
			dataField("Generation", "generation", "number"),
			dataField("Receipt", "receipt_id", "mono"),
		},
	}
	summary := console.MetricsView("counts")
	summary.Title = "Summary"
	summary.Options = map[string]any{"metrics": []map[string]any{
		dataColumn("Datasets", "datasets", "number"),
		dataColumn("Scenarios", "scenarios", "number"),
		dataColumn("Running operations", "running", "number"),
		dataColumn("Failed operations", "failed", "number"),
	}}
	targets := dataTable("Managed targets", "targets",
		dataColumn("Target", "target_id"), dataColumn("Status", "status_label"),
		dataColumn("Scenario", "scenario_label"), dataColumn("Dataset", "dataset_label"),
		dataColumn("Generation", "generation", "number"), dataColumn("Receipt", "receipt_id"))
	actions := dataTable("Actions", "capabilities",
		dataColumn("Action", "action"), dataColumn("Availability", "availability"), dataColumn("Reason", "reason"))
	latest := console.KeyValueView("latest_operation")
	latest.Title = "Latest operation"
	latest.Options = map[string]any{"fields": []map[string]any{
		dataField("Operation", "operation_id", "mono"), dataField("Action", "action"),
		dataField("Outcome", "outcome", "badge"), dataField("Target", "target_id"),
		dataField("Progress", "progress"), dataField("Updated", "updated_at", "datetime"),
	}}
	ui := console.NewPanelUI(console.StackView(*active, *summary, *targets, *actions, *latest), nil)
	ui.Count = &console.PanelUICount{Bind: "targets", Mode: console.PanelCountArrayLength}
	return ui
}

func dataDatasetsUI() *console.PanelUI {
	ui := console.NewPanelUI(dataTable("Dataset catalog", "",
		dataColumn("Dataset", "label"), dataColumn("Digest", "digest"), dataColumn("Origin", "origin"),
		dataColumn("Timezone", "timezone"), dataColumn("Scenarios", "scenarios", "number"),
		dataColumn("Records", "records"), dataColumn("Prerequisites", "prerequisites"),
		dataColumn("Available actions", "actions"), dataColumn("Unavailable", "unavailable")), nil)
	ui.Filters = []console.PanelUIFilter{dataSelectFilter("origin", "Origin", "origin", dataOriginSynthetic, dataOriginSource)}
	return ui
}

func dataScenariosUI() *console.PanelUI {
	ui := console.NewPanelUI(dataTable("Scenario catalog", "",
		dataColumn("Scenario", "label"), dataColumn("Dataset", "dataset_label"), dataColumn("Target", "target_id"),
		dataColumn("Status", "status_label"), dataColumn("Receipt", "receipt_id"), dataColumn("Profile", "profile")), nil)
	ui.Filters = []console.PanelUIFilter{
		dataSelectFilter("status", "Status", "status_label", dataLabelValues(dataScenarioStatusLabels, dataScenarioStatusOrder)...),
	}
	return ui
}

func dataOperationsUI() *console.PanelUI {
	ui := console.NewPanelUI(dataTable("Operation history", "",
		dataColumn("Operation", "operation_id"), dataColumn("Action", "action"), dataColumn("Outcome", "outcome"),
		dataColumn("State", "state"), dataColumn("Progress", "progress"), dataColumn("Target", "target_id"),
		dataColumn("Dry run", "dry_run", "boolean"), dataColumn("Updated", "updated_at", "datetime")), nil)
	states := []string{string(admindata.Queued), string(admindata.Running), string(admindata.Succeeded), string(admindata.Failed), string(admindata.Canceled)}
	ui.Filters = []console.PanelUIFilter{
		dataSelectFilter("state", "State", "state", states...),
		dataSelectFilter("action", "Action", "action", dataLabelValues(dataKindLabels, dataKindOrder)...),
	}
	return ui
}

func dataVerificationUI() *console.PanelUI {
	ui := console.NewPanelUI(dataTable("Verification evidence", "",
		dataColumn("Check", "check_id"), dataColumn("Result", "result"), dataColumn("Expected", "expected"),
		dataColumn("Actual", "actual"), dataColumn("Evidence", "evidence_ref"), dataColumn("Source", "source"),
		dataColumn("Operation", "operation_id"), dataColumn("Receipt", "receipt_id")), nil)
	ui.Filters = []console.PanelUIFilter{
		dataSelectFilter("result", "Result", "result", dataCheckPassed, dataCheckFailed, dataCheckPlanned, dataCheckUnavailable),
		dataSelectFilter("source", "Source", "source", dataSourceValidation, dataSourceVerification, dataSourcePlan),
	}
	return ui
}

func dataCoverageUI() *console.PanelUI {
	ui := console.NewPanelUI(dataTable("Coverage periods", "",
		dataColumn("Local day", "local_day"), dataColumn("Timezone", "timezone"), dataColumn("Coverage", "coverage"),
		dataColumn("Evidence", "evidence_ref"), dataColumn("Verification", "verification_id")), nil)
	ui.Filters = []console.PanelUIFilter{
		dataSelectFilter("coverage", "Coverage", "coverage", dataLabelValues(dataCoverageLabels, dataCoverageOrder)...),
	}
	return ui
}

// DataTargetView is one managed target from the service's safe ActiveState
// read model. Receipt is the target's active receipt when known; a receipt
// that is not the active one is ignored.
type DataTargetView struct {
	State   admindata.ActiveState
	Receipt *admindata.PreparationReceipt
}

// DataOverviewCounts are totals over records the current actor may read.
type DataOverviewCounts struct {
	Datasets  int
	Scenarios int
	Running   int
	Failed    int
}

// DataOverviewView supplies the overview's single record. The first target is
// presented as the primary one.
type DataOverviewView struct {
	Targets         []DataTargetView
	Capabilities    map[admindata.Kind]admindata.Capability
	LatestOperation *admindata.Operation
	Counts          DataOverviewCounts
}

// DataScenarioView is one scenario, optionally with its latest preparation on
// a target. Active reports that the receipt is the target's active receipt.
type DataScenarioView struct {
	Scenario admindata.ScenarioRef
	TargetID string
	Receipt  *admindata.PreparationReceipt
	Active   bool
}

// DataCheckView is one check from a validation, verification or dry-run plan.
// Checks from a dry run are always presented as planned, never as executed.
type DataCheckView struct {
	Origin         admindata.Kind
	OperationID    string
	VerificationID string
	ReceiptID      string
	DryRun         bool
	Check          admindata.Check
}

// DataCoverageView is one verified sample period.
type DataCoverageView struct {
	VerificationID string
	ReceiptID      string
	Coverage       admindata.Coverage
}

// Revisions passed to the projections must be at least 1 and increase whenever
// a row's projected data changes; the console host drops revision 0.

// DataOverviewRecord projects the overview summary record.
func DataOverviewRecord(view DataOverviewView, revision uint64) console.Record {
	targets := make([]map[string]any, 0, len(view.Targets))
	for _, target := range view.Targets {
		targets = append(targets, dataTargetRow(target))
	}
	data := map[string]any{
		"targets":      targets,
		"capabilities": dataCapabilityRows(view.Capabilities),
		"counts": map[string]any{
			"targets":   len(targets),
			"datasets":  view.Counts.Datasets,
			"scenarios": view.Counts.Scenarios,
			"running":   view.Counts.Running,
			"failed":    view.Counts.Failed,
		},
	}
	if len(targets) > 0 {
		data["primary"] = targets[0]
	}
	if view.LatestOperation != nil {
		data["latest_operation"] = dataOperationRow(*view.LatestOperation)
	}
	return console.Record{Key: DataOverviewRecordKey, Revision: revision, Data: data}
}

// DataDatasetRecord projects one catalog dataset version.
func DataDatasetRecord(descriptor admindata.Descriptor, revision uint64) console.Record {
	ref := descriptor.Dataset
	key := dataRecordKey("dataset", ref.Provider, ref.ID, ref.Version, ref.Digest)
	origin := dataOriginSource
	if descriptor.Synthetic {
		origin = dataOriginSynthetic
	}
	available, unavailable := dataCapabilitySummary(descriptor.Capabilities)
	return console.Record{Key: key, Revision: revision, Data: map[string]any{
		"key":                     key,
		"label":                   dataDatasetLabel(ref),
		"provider":                ref.Provider,
		"dataset_id":              ref.ID,
		"version":                 ref.Version,
		"digest":                  dataShortDigest(ref.Digest),
		"origin":                  origin,
		"synthetic":               descriptor.Synthetic,
		"timezone":                descriptor.Timezone,
		"source_contract_version": descriptor.SourceContractVersion,
		"components":              len(descriptor.Components),
		"scenarios":               len(descriptor.Scenarios),
		"samples":                 len(descriptor.Samples),
		"records":                 dataCountsLabel(descriptor.Counts),
		"prerequisites":           dataListLabel(descriptor.Prerequisites),
		"actions":                 available,
		"unavailable":             unavailable,
	}}
}

// DataScenarioRecord projects one scenario row.
func DataScenarioRecord(view DataScenarioView, revision uint64) console.Record {
	ref := view.Scenario
	key := dataRecordKey("scenario", ref.Dataset.Digest, ref.ID, ref.Version, ref.ProfileHash, view.TargetID)
	receipt := view.Receipt
	if receipt != nil && receipt.Scenario != ref {
		receipt = nil
	}
	status := dataScenarioStatus(receipt, view.Active)
	row := map[string]any{
		"key":           key,
		"label":         dataScenarioLabel(ref),
		"scenario_id":   ref.ID,
		"version":       ref.Version,
		"dataset_label": dataDatasetLabel(ref.Dataset),
		"profile":       dataShortDigest(ref.ProfileHash),
		"target_id":     view.TargetID,
		"status":        status,
		"status_label":  dataScenarioStatusLabels[status],
		"active":        view.Active,
	}
	if receipt != nil {
		row["receipt_id"] = receipt.ID
		row["content_revision"] = receipt.ContentRevision
	}
	return console.Record{Key: key, TargetID: view.TargetID, Revision: revision, Data: row}
}

// DataOperationRecord projects one operation; its revision is the operation's.
func DataOperationRecord(operation admindata.Operation) console.Record {
	return console.Record{
		Key:      operation.Result.OperationID,
		TargetID: operation.Target.TargetID,
		Revision: operation.Result.Revision,
		Data:     dataOperationRow(operation),
	}
}

// DataCheckRecord projects one check row.
func DataCheckRecord(view DataCheckView, revision uint64) console.Record {
	key := dataRecordKey("check", view.VerificationID, view.OperationID, view.Check.ID)
	return console.Record{Key: key, Revision: revision, Data: map[string]any{
		"key":             key,
		"check_id":        view.Check.ID,
		"status":          view.Check.Status,
		"result":          dataCheckResult(view),
		"expected":        view.Check.Expected,
		"actual":          view.Check.Actual,
		"evidence_ref":    view.Check.EvidenceRef,
		"source":          dataCheckSource(view),
		"dry_run":         view.DryRun,
		"operation_id":    view.OperationID,
		"verification_id": view.VerificationID,
		"receipt_id":      view.ReceiptID,
	}}
}

// DataCoverageRecord projects one coverage period row.
func DataCoverageRecord(view DataCoverageView, revision uint64) console.Record {
	sample := view.Coverage.Sample
	key := dataRecordKey("coverage", view.VerificationID, sample.LocalDay, sample.Timezone)
	label, ok := dataCoverageLabels[view.Coverage.Status]
	if !ok {
		label = view.Coverage.Status
	}
	return console.Record{Key: key, Revision: revision, Data: map[string]any{
		"key":             key,
		"local_day":       sample.LocalDay,
		"timezone":        sample.Timezone,
		"status":          view.Coverage.Status,
		"coverage":        label,
		"evidence_ref":    sample.EvidenceRef,
		"verification_id": view.VerificationID,
		"receipt_id":      view.ReceiptID,
	}}
}

// DataActionResult presents the outcome of dispatching kind on the console
// action route. Denials and errors outside the Data contract stay errors, so
// the host answers with their status and the client revalidates access; every
// other typed failure becomes a safe, field-addressable result. Success wording
// never calls accepted, prepared or verified work active, and every outcome
// refreshes the panels so the operation row and active state come from the
// read model. Cancel results describe the target operation, not the request.
func DataActionResult(kind admindata.Kind, result admindata.Result, err error) (console.PanelActionResult, error) {
	if err != nil {
		code, known := admindata.SafeErrorCode(err)
		if !known {
			return console.PanelActionResult{}, err
		}
		if code == admindata.CodeDenied {
			// Dispatcher wrappers must not turn a revoked action into HTTP 500;
			// the console clears its cached state on the explicit 403 response.
			return console.PanelActionResult{}, gerrors.Wrap(err, gerrors.CategoryAuthz, "data operation denied").WithCode(403).WithTextCode(admindata.CodeDenied)
		}
		return dataFailureResult(code, nil), nil
	}
	if kind == admindata.Cancel {
		return console.PanelActionResult{OK: true, Message: dataCancelMessage(result), Refresh: true}, nil
	}
	switch {
	case result.Failure != nil && result.State != admindata.Succeeded:
		return dataFailureResult(result.Failure.Code, result.Failure.Fields), nil
	case result.State == admindata.Failed:
		return dataFailureResult(admindata.CodeProvider, nil), nil
	case result.State == admindata.Canceled:
		return dataFailureResult(admindata.CodeCanceled, nil), nil
	}
	return console.PanelActionResult{OK: true, Message: dataActionMessage(result), Refresh: true}, nil
}

func dataFailureResult(code string, fields map[string]string) console.PanelActionResult {
	message, ok := dataFailureMessages[code]
	if !ok {
		message = dataFailureMessages[admindata.CodeProvider]
	}
	failure := console.PanelActionResult{OK: false, Message: message, Refresh: true}
	if len(fields) > 0 {
		failure.Errors = map[string]any{}
		for field, problem := range fields {
			failure.Errors[field] = problem
		}
		failure.Message += " Check the highlighted fields."
	}
	return failure
}

func dataCancelMessage(result admindata.Result) string {
	if result.State.Terminal() {
		return "Operation " + result.OperationID + " already finished as " + string(result.State) + "; nothing was canceled."
	}
	return "Cancellation requested for operation " + result.OperationID + ". It stops at the next safe point; a committed activation is not undone."
}

var dataFailureMessages = map[string]string{
	admindata.CodeInvalid:     "The request is invalid.",
	admindata.CodeDenied:      "You are not allowed to continue this operation.",
	admindata.CodeConflict:    "This request key was already used with different input. Use a new request key to start new work.",
	admindata.CodeBusy:        "Another write is running on this target. Retry after it finishes.",
	admindata.CodeStale:       "The active dataset changed since this page loaded. Review the current generation and retry.",
	admindata.CodeUnavailable: "This action is unavailable for this target.",
	admindata.CodeCanceled:    "The operation was canceled.",
	admindata.CodeRecovery:    "The target needs recovery. New writes are blocked until recovery completes.",
	admindata.CodeLeaseLost:   "The operation stopped after losing its lease and made no further changes.",
	admindata.CodeGone:        "The operation, receipt or artifact is no longer available.",
	admindata.CodeProvider:    "The provider failed. Check the operation history for its recorded state.",
}

// dataActionMessage reports the operation's actual state first; an in-flight
// dry run (including a same-key replay) has not produced its plan yet.
func dataActionMessage(result admindata.Result) string {
	label := dataKindLabel(result.Kind)
	switch {
	case result.State == admindata.Queued && result.DryRun:
		return "Accepted dry run for " + strings.ToLower(label) + " operation " + result.OperationID + ". Planning has not run yet; nothing will change."
	case result.State == admindata.Queued:
		return "Accepted " + strings.ToLower(label) + " operation " + result.OperationID + ". It has not run yet; the active dataset is unchanged."
	case result.State == admindata.Running && result.DryRun:
		return label + " dry run " + result.OperationID + " is planning. Nothing will change."
	case result.State == admindata.Running:
		return label + " operation " + result.OperationID + " is running. The active dataset is unchanged until an activation completes."
	case result.State == admindata.Succeeded && result.DryRun:
		return "Dry run planned for " + strings.ToLower(label) + " " + result.OperationID + ". Nothing changed; " + strconv.Itoa(len(result.Checks)) + " checks are planned, not executed."
	case result.State == admindata.Succeeded:
		return dataSucceededMessage(result)
	default:
		return label + " operation " + result.OperationID + " is " + string(result.State) + "."
	}
}

func dataSucceededMessage(result admindata.Result) string {
	receipt := ""
	switch {
	case result.Receipt != nil:
		receipt = result.Receipt.ID
	case result.Activation != nil:
		receipt = result.Activation.ReceiptID
	}
	switch result.Kind {
	case admindata.Validate:
		failed := 0
		for _, check := range result.Checks {
			if check.Status != admindata.CheckPassed {
				failed++
			}
		}
		if failed > 0 {
			return "Validation found problems in " + strconv.Itoa(failed) + " of " + strconv.Itoa(len(result.Checks)) + " checks."
		}
		return "Validation passed " + strconv.Itoa(len(result.Checks)) + " checks."
	case admindata.Prepare, admindata.Refresh:
		return "Prepared receipt " + receipt + ". Verify and activate it to change the active dataset."
	case admindata.Verify:
		switch {
		case result.Verification == nil:
			return "Verification finished for receipt " + receipt + "; it is not active."
		case result.Verification.Passed():
			return "Verified receipt " + receipt + ". Activate it to change the active dataset."
		default:
			return "Verification failed for receipt " + receipt + "; it cannot be activated."
		}
	case admindata.Activate, admindata.Reset:
		return dataActivationMessage(result, receipt)
	case admindata.Generate:
		if label := dataDatasetLabel(dataGeneratedDataset(result)); label != "" {
			return "Generated dataset " + label + ". Prepare it before use."
		}
		return "Generated a dataset. Prepare it before use."
	default:
		return dataKindLabel(result.Kind) + " operation " + result.OperationID + " succeeded."
	}
}

func dataActivationMessage(result admindata.Result, receipt string) string {
	if result.Activation == nil {
		return dataKindLabel(result.Kind) + " operation " + result.OperationID + " finished without an activation record."
	}
	generation := strconv.FormatUint(result.Activation.Generation, 10)
	switch {
	case result.Kind == admindata.Reset:
		return "Reset completed at generation " + generation + "."
	case result.Active && result.Activation.Ready:
		return "Activated receipt " + receipt + " at generation " + generation + "."
	default:
		return "Activation committed at generation " + generation + "; the target is not ready yet."
	}
}

func dataGeneratedDataset(result admindata.Result) admindata.DatasetRef {
	if result.Dataset == nil {
		return admindata.DatasetRef{}
	}
	return *result.Dataset
}

const (
	dataOriginSynthetic = "Synthetic"
	dataOriginSource    = "Source-backed"

	dataCheckPassed      = "Passed"
	dataCheckFailed      = "Failed"
	dataCheckPlanned     = "Planned — not executed"
	dataCheckUnavailable = "Unavailable"

	dataSourceValidation   = "Validation"
	dataSourceVerification = "Verification"
	dataSourcePlan         = "Dry-run plan"
)

var dataKindOrder = []string{
	string(admindata.Validate), string(admindata.Prepare), string(admindata.Refresh), string(admindata.Verify),
	string(admindata.Activate), string(admindata.Reset), string(admindata.Generate), string(admindata.Cancel),
	string(admindata.Recover),
}

var dataKindLabels = map[string]string{
	string(admindata.Validate): "Validate",
	string(admindata.Prepare):  "Prepare",
	string(admindata.Refresh):  "Refresh",
	string(admindata.Verify):   "Verify",
	string(admindata.Activate): "Activate",
	string(admindata.Reset):    "Reset",
	string(admindata.Generate): "Generate",
	string(admindata.Cancel):   "Cancel",
	string(admindata.Recover):  "Recover",
}

var dataScenarioStatusOrder = []string{"active", "verified", "stale_verification", "verification_failed", "prepared", "not_prepared"}

var dataScenarioStatusLabels = map[string]string{
	"active":              "Active",
	"verified":            "Verified — not active",
	"stale_verification":  "Changed since verification",
	"verification_failed": "Verification failed — not active",
	"prepared":            "Prepared — not verified",
	"not_prepared":        "Not prepared",
}

var dataTargetStatusLabels = map[string]string{
	"recovery_required": "Recovery required",
	"switching":         "Switch in progress",
	"inactive":          "Nothing active",
	"active":            "Active",
	"not_ready":         "Active — not ready",
}

var dataCoverageOrder = []string{"covered", admindata.CoveredEmpty, admindata.Partial, admindata.Uncovered, admindata.PolicySuppressed, admindata.Unavailable}

var dataCoverageLabels = map[string]string{
	"covered":                  "Covered",
	admindata.CoveredEmpty:     "Covered — no records",
	admindata.Partial:          "Partially covered",
	admindata.Uncovered:        "Not covered",
	admindata.PolicySuppressed: "Suppressed by policy",
	admindata.Unavailable:      "Unavailable",
}

// dataFailureOutcomes present safe failure codes; unknown codes read as a
// provider failure, matching data.ErrorCode.
var dataFailureOutcomes = map[string]string{
	admindata.CodeInvalid:     "Failed — invalid request",
	admindata.CodeDenied:      "Failed — denied",
	admindata.CodeConflict:    "Failed — key reused with different input",
	admindata.CodeBusy:        "Failed — target busy",
	admindata.CodeStale:       "Failed — stale generation",
	admindata.CodeUnavailable: "Failed — unavailable",
	admindata.CodeCanceled:    "Canceled",
	admindata.CodeRecovery:    "Recovery required — writes blocked",
	admindata.CodeLeaseLost:   "Stopped — lease lost",
	admindata.CodeGone:        "Failed — no longer available",
	admindata.CodeProvider:    "Failed — provider error",
}

func dataLabelValues(labels map[string]string, order []string) []string {
	values := make([]string, 0, len(order))
	for _, key := range order {
		values = append(values, labels[key])
	}
	return values
}

// dataRecordKey derives a stable opaque key. Lifecycle identifiers may contain
// any printable character, so they never appear raw in a record key.
func dataRecordKey(kind string, parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(append([]string{kind}, parts...), "\x00")))
	return kind + "-" + hex.EncodeToString(sum[:12])
}

func dataTargetRow(target DataTargetView) map[string]any {
	activation := target.State.Activation
	status := "not_ready"
	switch {
	case target.State.RecoveryRequired:
		status = "recovery_required"
	case target.State.Transitioning:
		status = "switching"
	case activation.ReceiptID == "":
		status = "inactive"
	case activation.Ready:
		status = "active"
	}
	targetID := target.State.Target.TargetID
	row := map[string]any{
		"key":          targetID,
		"target_id":    targetID,
		"status":       status,
		"status_label": dataTargetStatusLabels[status],
		"generation":   activation.Generation,
		"ready":        activation.Ready,
		"receipt_id":   activation.ReceiptID,
	}
	if receipt := target.Receipt; receipt != nil && receipt.ID != "" && receipt.ID == activation.ReceiptID {
		row["dataset_label"] = dataDatasetLabel(receipt.Dataset)
		row["scenario_label"] = dataScenarioLabel(receipt.Scenario)
	}
	return row
}

const dataAvailable = "Available"

type dataCapability struct {
	kind, availability string
	admindata.Capability
}

// dataCapabilities orders declared capabilities. Unsupported wins over a
// missing grant so an operator is not told to request access to a no-op.
func dataCapabilities(capabilities map[admindata.Kind]admindata.Capability) []dataCapability {
	out := make([]dataCapability, 0, len(capabilities))
	for _, kind := range dataKindOrder {
		capability, ok := capabilities[admindata.Kind(kind)]
		if !ok {
			continue
		}
		availability := dataAvailable
		switch {
		case !capability.Supported:
			availability = "Unsupported"
		case !capability.Permitted:
			availability = "Not permitted"
		}
		out = append(out, dataCapability{kind: kind, availability: availability, Capability: capability})
	}
	return out
}

func dataCapabilityRows(capabilities map[admindata.Kind]admindata.Capability) []map[string]any {
	rows := []map[string]any{}
	for _, capability := range dataCapabilities(capabilities) {
		rows = append(rows, map[string]any{
			"key":          capability.kind,
			"kind":         capability.kind,
			"action":       dataKindLabels[capability.kind],
			"availability": capability.availability,
			"supported":    capability.Supported,
			"permitted":    capability.Permitted,
			"reason":       capability.Reason,
		})
	}
	return rows
}

// dataCapabilitySummary lists available actions and explains unavailable ones.
func dataCapabilitySummary(capabilities map[admindata.Kind]admindata.Capability) (string, string) {
	available, unavailable := []string{}, []string{}
	for _, capability := range dataCapabilities(capabilities) {
		action := dataKindLabels[capability.kind]
		if capability.availability == dataAvailable {
			available = append(available, action)
			continue
		}
		entry := action + ": " + strings.ToLower(capability.availability)
		if capability.Reason != "" {
			entry += " (" + capability.Reason + ")"
		}
		unavailable = append(unavailable, entry)
	}
	return dataJoin(available, "None"), dataJoin(unavailable, "None")
}

func dataScenarioStatus(receipt *admindata.PreparationReceipt, active bool) string {
	switch {
	case active:
		return "active"
	case receipt == nil:
		return "not_prepared"
	case receipt.Verification == nil:
		return "prepared"
	case receipt.Verification.ContentRevision != receipt.ContentRevision:
		return "stale_verification"
	case receipt.Verification.Passed():
		return "verified"
	default:
		return "verification_failed"
	}
}

func dataOperationRow(operation admindata.Operation) map[string]any {
	result := operation.Result
	row := map[string]any{
		"key":              result.OperationID,
		"operation_id":     result.OperationID,
		"kind":             string(result.Kind),
		"action":           dataKindLabel(result.Kind),
		"state":            string(result.State),
		"phase":            result.Phase,
		"revision":         result.Revision,
		"outcome":          dataOperationOutcome(operation),
		"dry_run":          result.DryRun,
		"active":           result.Active,
		"cancel_requested": operation.CancelRequested,
		"target_id":        operation.Target.TargetID,
		"progress":         dataProgressLabel(result.Progress),
	}
	if label := dataDatasetLabel(operation.Input.Dataset); label != "" {
		row["dataset_label"] = label
	}
	if label := dataScenarioLabel(operation.Input.Scenario); label != "" {
		row["scenario_label"] = label
	}
	if result.Failure != nil {
		row["failure_code"] = result.Failure.Code
	}
	switch {
	case result.Activation != nil:
		row["generation"] = result.Activation.Generation
		row["receipt_id"] = result.Activation.ReceiptID
	case result.Receipt != nil:
		row["receipt_id"] = result.Receipt.ID
	}
	if !operation.CreatedAt.IsZero() {
		row["created_at"] = operation.CreatedAt.UTC().Format(time.RFC3339)
	}
	if !operation.UpdatedAt.IsZero() {
		row["updated_at"] = operation.UpdatedAt.UTC().Format(time.RFC3339)
	}
	return row
}

// dataOperationOutcome keeps transport acceptance, preparation, verification
// and activation distinct; only an activation reports an active dataset.
func dataOperationOutcome(operation admindata.Operation) string {
	result := operation.Result
	if result.Failure != nil && result.State != admindata.Succeeded {
		if outcome, ok := dataFailureOutcomes[result.Failure.Code]; ok {
			return outcome
		}
		return dataFailureOutcomes[admindata.CodeProvider]
	}
	switch result.State {
	case admindata.Queued:
		return "Accepted — not started"
	case admindata.Running:
		switch {
		case result.Phase == "recovering":
			return "Recovering — writes paused"
		case operation.CancelRequested || result.Phase == "cancel_requested":
			return "Cancel requested"
		case result.Phase != "" && result.Phase != "accepted" && result.Phase != string(admindata.Running):
			return "Running — " + result.Phase
		default:
			return "Running"
		}
	case admindata.Succeeded:
		return dataSucceededOutcome(result)
	case admindata.Canceled:
		return "Canceled"
	case admindata.Failed:
		return dataFailureOutcomes[admindata.CodeProvider]
	default:
		return "Unknown"
	}
}

func dataSucceededOutcome(result admindata.Result) string {
	if result.DryRun {
		return "Dry run planned — nothing changed"
	}
	switch result.Kind {
	case admindata.Validate:
		if slices.ContainsFunc(result.Checks, func(check admindata.Check) bool { return check.Status != admindata.CheckPassed }) {
			return "Validation found problems"
		}
		return "Validated"
	case admindata.Prepare, admindata.Refresh:
		return "Prepared — not verified or active"
	case admindata.Verify:
		switch {
		case result.Verification == nil:
			return "Verification finished — not active"
		case result.Verification.Passed():
			return "Verified — not active"
		default:
			return "Verification failed — not active"
		}
	case admindata.Activate:
		return dataActivationOutcome(result)
	case admindata.Reset:
		return "Reset complete"
	case admindata.Generate:
		return "Generated — not prepared"
	case admindata.Cancel:
		return "Cancellation recorded"
	default:
		return "Succeeded"
	}
}

func dataActivationOutcome(result admindata.Result) string {
	if result.Active && result.Activation != nil && result.Activation.Ready {
		return "Active — generation " + strconv.FormatUint(result.Activation.Generation, 10)
	}
	return "Activation committed — not ready"
}

func dataCheckResult(view DataCheckView) string {
	switch {
	case view.Check.Status == admindata.CheckUnavailable:
		return dataCheckUnavailable
	case view.DryRun || view.Check.Status == admindata.CheckPlanned:
		return dataCheckPlanned
	case view.Check.Status == admindata.CheckPassed:
		return dataCheckPassed
	case view.Check.Status == admindata.CheckFailed:
		return dataCheckFailed
	default:
		return "Unknown"
	}
}

func dataCheckSource(view DataCheckView) string {
	switch {
	case view.DryRun:
		return dataSourcePlan
	case view.Origin == admindata.Validate:
		return dataSourceValidation
	case view.Origin == admindata.Verify:
		return dataSourceVerification
	default:
		return dataKindLabel(view.Origin)
	}
}

func dataKindLabel(kind admindata.Kind) string {
	if label, ok := dataKindLabels[string(kind)]; ok {
		return label
	}
	return string(kind)
}

func dataDatasetLabel(ref admindata.DatasetRef) string {
	if ref.ID == "" {
		return ""
	}
	label := ref.ID
	if ref.Provider != "" {
		label = ref.Provider + "/" + label
	}
	if ref.Version != "" {
		label += " v" + ref.Version
	}
	return label
}

func dataScenarioLabel(ref admindata.ScenarioRef) string {
	if ref.ID == "" {
		return ""
	}
	if ref.Version == "" {
		return ref.ID
	}
	return ref.ID + " v" + ref.Version
}

func dataShortDigest(digest string) string {
	if len(digest) > 12 {
		return digest[:12]
	}
	return digest
}

func dataProgressLabel(progress admindata.Progress) string {
	label := ""
	if progress.Total > 0 {
		label = strconv.FormatUint(progress.Completed, 10) + " of " + strconv.FormatUint(progress.Total, 10)
	}
	if progress.Stage != "" {
		if label != "" {
			label += " · "
		}
		label += progress.Stage
	}
	return label
}

func dataCountsLabel(counts map[string]uint64) string {
	entries := make([]string, 0, len(counts))
	for _, name := range slices.Sorted(maps.Keys(counts)) {
		entries = append(entries, name+" "+strconv.FormatUint(counts[name], 10))
	}
	return dataJoin(entries, "None")
}

func dataListLabel(values []string) string {
	return dataJoin(values, "None")
}

func dataJoin(values []string, empty string) string {
	if len(values) == 0 {
		return empty
	}
	return strings.Join(values, ", ")
}
