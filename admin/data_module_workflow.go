package admin

import (
	"context"
	"errors"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	gerrors "github.com/goliatone/go-errors"
)

// Data workflow binding: the module derives every offered action from
// authorized reads and current capabilities, names it for people, references
// it from the rows it concerns and answers the receipt picker and
// pending-request lookups. Lifecycle authority stays in the service.

// dataRetryCandidates bounds Try again descriptors per read.
const dataRetryCandidates = 10

// dataActionRefs are the per-panel action references rows carry.
type dataActionRefs struct {
	scenario  map[string][]console.PanelUIActionRef
	operation map[string][]console.PanelUIActionRef
	target    []console.PanelUIActionRef
}

func dataScenarioRefKey(input data.Input) string {
	return dataRecordKey("scenario", input.Dataset.Digest, input.Scenario.ID, input.Scenario.Version, input.Scenario.ProfileHash, input.TargetID)
}

// dataNextStepKind is the lifecycle kind a scenario status waits on.
func dataNextStepKind(status string) data.Kind {
	switch status {
	case "not_prepared":
		return data.Prepare
	case "prepared", "stale_verification", "verification_failed":
		return data.Verify
	case "verified":
		return data.Activate
	default:
		return ""
	}
}

// dataRefs builds row references for one panel from the offered choices.
// Emphasis is presentation only: the next lifecycle step is primary, routine
// work sits in the overflow menu.
func (model dataModuleReadModel) dataRefs(choices []DataActionChoice, panel, target string) dataActionRefs {
	refs := dataActionRefs{scenario: map[string][]console.PanelUIActionRef{}, operation: map[string][]console.PanelUIActionRef{}}
	statuses := map[string]string{}
	for _, choice := range choices {
		if !slices.Contains(dataChoicePanels(choice), panel) {
			continue
		}
		ref := console.PanelUIActionRef{PanelID: panel, ActionID: dataActionID(choice)}
		switch {
		case choice.Kind == data.Recover || choice.RetryOf != "":
			ref.Emphasis = console.PanelActionEmphasisPrimary
			id := choice.Input.OperationID
			if choice.RetryOf != "" {
				id = choice.RetryOf
			}
			refs.operation[id] = append(refs.operation[id], ref)
		case choice.Kind == data.Cancel:
			refs.operation[choice.Input.OperationID] = append(refs.operation[choice.Input.OperationID], ref)
		case choice.Kind == data.Reset || choice.Kind == data.Generate:
			ref.Emphasis = console.PanelActionEmphasisMenu
			refs.target = append(refs.target, ref)
		default:
			key := dataScenarioRefKey(choice.Input)
			status, known := statuses[key]
			if !known {
				view := model.scenario(choice.Input.Scenario, choice.Input.TargetID)
				status = dataScenarioStatus(view.Receipt, view.Active)
				statuses[key] = status
			}
			ref.Emphasis = dataRefEmphasis(choice.Kind, status)
			refs.scenario[key] = append(refs.scenario[key], ref)
		}
	}
	if pending := model.state.PendingOperationID; pending != "" {
		refs.target = append(refs.operation[pending], refs.target...)
	}
	if model.state.RecoveryRequired {
		for _, op := range model.ops {
			if op.Result.OperationID != model.state.PendingOperationID && !op.Result.State.Terminal() {
				refs.target = append(refs.operation[op.Result.OperationID], refs.target...)
			}
		}
	}
	refs.target = console.NormalizePanelActionRefs(refs.target)
	_ = target
	return refs
}

func dataRefEmphasis(kind data.Kind, status string) string {
	if kind == dataNextStepKind(status) {
		return console.PanelActionEmphasisPrimary
	}
	if kind == data.Refresh && status == "active" {
		return ""
	}
	return console.PanelActionEmphasisMenu
}

// descriptorFor finds the catalog entry of a dataset reference.
func (model dataModuleReadModel) descriptorFor(ref data.DatasetRef) (data.Descriptor, bool) {
	for _, descriptor := range model.catalog {
		if descriptor.Dataset == ref || (descriptor.Dataset.Provider == ref.Provider && descriptor.Dataset.ID == ref.ID && descriptor.Dataset.Version == ref.Version) {
			return descriptor, true
		}
	}
	return data.Descriptor{}, false
}

// titles are the declared human names of a dataset and one of its scenarios.
func (model dataModuleReadModel) titles(scenario data.ScenarioRef) (datasetTitle, scenarioTitle string) {
	descriptor, ok := model.descriptorFor(scenario.Dataset)
	if !ok {
		return "", ""
	}
	return descriptor.Title(), descriptor.ScenarioTitle(scenario.ID)
}

// latestReceipt is the newest retained receipt of a scenario, optionally only
// one whose verification passed on its current content.
func (model dataModuleReadModel) latestReceipt(scenario data.ScenarioRef, verified bool) *data.PreparationReceipt {
	for _, receipt := range model.receipts {
		if receipt.Scenario != scenario {
			continue
		}
		if verified && (receipt.Verification == nil || !receipt.Verification.Passed() || receipt.Verification.ContentRevision != receipt.ContentRevision) {
			continue
		}
		return receipt
	}
	return nil
}

// targetSummary is the target's current activation, named for confirmations.
func (model dataModuleReadModel) targetSummary() *DataTargetSummary {
	activation := model.state.Activation
	summary := &DataTargetSummary{TargetID: model.state.Target.TargetID, ReceiptID: activation.ReceiptID, Generation: activation.Generation, Ready: activation.Ready}
	if receipt := model.receipt(activation.ReceiptID); receipt != nil {
		_, title := model.titles(receipt.Scenario)
		summary.ScenarioTitle = dataScenarioTitle(title, receipt.Scenario)
	}
	return summary
}

// datasetChoices offers each scenario its applicable lifecycle work: Validate,
// Prepare or Refresh, Verify when a receipt exists and Activate when a verified
// receipt exists, plus dataset-level Generate and target-level Reset.
// Unsupported kinds are omitted; not-permitted ones stay visible and disabled.
func (m *DataModule) datasetChoices(descriptor data.Descriptor, model dataModuleReadModel) []DataActionChoice {
	out := []DataActionChoice{}
	add := func(kind data.Kind, choice DataActionChoice) {
		capability, declared := descriptor.Capabilities[kind]
		if !declared || !capability.Supported {
			return
		}
		choice.Kind = kind
		choice.Label = dataKindLabel(kind)
		if !capability.Permitted {
			choice.Availability, choice.Reason = console.PanelActionNotPermitted, dataCapabilityReason(capability)
		}
		out = append(out, choice)
	}
	for _, scenario := range descriptor.Scenarios {
		view := model.scenario(scenario, m.config.TargetID)
		status := dataScenarioStatus(view.Receipt, view.Active)
		base := DataActionChoice{Input: data.Input{Dataset: descriptor.Dataset, Scenario: scenario, TargetID: m.config.TargetID},
			Title: dataScenarioTitle(view.Title, scenario), DatasetTitle: descriptor.Title(), Steps: dataLifecycleSteps(status, view)}
		add(data.Validate, base)
		if view.Receipt == nil {
			add(data.Prepare, base)
		} else {
			add(data.Refresh, base)
		}
		// Receipts are chosen from the target's retained receipts through the
		// paginated picker, so retained work beyond the bounded window stays
		// reachable; the newest matching receipt is preselected. Submitted IDs
		// are selectors, never authorization claims.
		verify := base
		verify.ReceiptInput = true
		if latest := model.latestReceipt(scenario, false); latest != nil {
			verify.DefaultReceiptID = latest.ID
		}
		add(data.Verify, verify)
		generation := model.state.Activation.Generation
		activate := base
		activate.ReceiptInput, activate.Current = true, model.targetSummary()
		activate.Input.ExpectedGeneration = &generation
		if verified := model.latestReceipt(scenario, true); verified != nil && verified.ID != model.state.Activation.ReceiptID {
			activate.DefaultReceiptID = verified.ID
		}
		add(data.Activate, activate)
	}
	if len(descriptor.Scenarios) > 0 {
		input := data.Input{Dataset: descriptor.Dataset, Scenario: descriptor.Scenarios[0], TargetID: m.config.TargetID}
		add(data.Generate, DataActionChoice{Input: input, Title: dataDatasetTitle(descriptor.Title(), descriptor.Dataset), DatasetTitle: descriptor.Title()})
		if active := model.receipt(model.state.Activation.ReceiptID); active != nil && active.Dataset == descriptor.Dataset {
			generation := model.state.Activation.Generation
			reset := DataActionChoice{Input: input, Title: m.config.TargetID, DatasetTitle: descriptor.Title(), Current: model.targetSummary()}
			reset.Input.ExpectedGeneration = &generation
			add(data.Reset, reset)
		}
	}
	return out
}

// operationCandidates are the cancel and recover controls the operation window
// may offer; policy filters them before they are declared.
func (m *DataModule) operationCandidates(model dataModuleReadModel) []DataActionChoice {
	out := []DataActionChoice{}
	for _, op := range model.ops {
		result := op.Result
		if result.State.Terminal() {
			continue
		}
		datasetTitle, scenarioTitle := model.titles(op.Input.Scenario)
		base := DataActionChoice{Input: data.Input{TargetID: m.config.TargetID, OperationID: result.OperationID}, DatasetTitle: datasetTitle}
		if op.Input.Scenario.ID != "" {
			base.Title = dataScenarioTitle(scenarioTitle, op.Input.Scenario)
		}
		if !result.DryRun && result.Kind.Writes() {
			recover := base
			recover.Kind, recover.Label = data.Recover, "Recover"
			out = append(out, recover)
		}
		if descriptor, ok := model.descriptorFor(op.Input.Dataset); ok && descriptor.Capabilities[data.Cancel].Supported && descriptor.Capabilities[data.Cancel].Permitted && !op.CancelRequested && result.Kind != data.Cancel && result.Kind != data.Recover {
			cancel := base
			cancel.Kind, cancel.Label = data.Cancel, "Cancel"
			out = append(out, cancel)
		}
	}
	return out
}

// retryChoices offers Try again for the actor's own recent terminal failed or
// canceled operations whose exact retained input is still available. The
// service authorizes each descriptor under current policy; unavailable or
// denied ones are simply not offered, while cancellation and backend failures
// abort the read.
func (m *DataModule) retryChoices(ctx context.Context, model dataModuleReadModel) ([]DataActionChoice, error) {
	out := []DataActionChoice{}
	considered := 0
	for _, op := range model.ops {
		result := op.Result
		if (result.State != data.Failed && result.State != data.Canceled) || result.Kind == data.Cancel || result.Kind == data.Recover {
			continue
		}
		if considered >= dataRetryCandidates {
			break
		}
		considered++
		descriptor, err := m.config.Service.RetryDescriptor(ctx, result.OperationID)
		if err != nil {
			if dataRetryUnavailable(err) {
				continue
			}
			return nil, dataConsoleReadError(err)
		}
		out = append(out, m.retryChoice(model, result.OperationID, descriptor))
	}
	return out, nil
}

// dataRetryUnavailable reports a descriptor the actor simply cannot use now;
// cancellation and backend failures must abort the read instead.
func dataRetryUnavailable(err error) bool {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false
	}
	code, known := data.SafeErrorCode(err)
	return known && (code == data.CodeDenied || code == data.CodeUnavailable || code == data.CodeInvalid || code == data.CodeGone)
}

// retryChoice presents a retained descriptor as explicit new work.
func (m *DataModule) retryChoice(model dataModuleReadModel, operationID string, descriptor data.RetryDescriptor) DataActionChoice {
	datasetTitle, scenarioTitle := model.titles(descriptor.Input.Scenario)
	choice := DataActionChoice{Kind: descriptor.Kind, Label: "Try again", Input: descriptor.Input, RetryOf: operationID,
		Title: dataScenarioTitle(scenarioTitle, descriptor.Input.Scenario), DatasetTitle: datasetTitle}
	choice.Input.TargetID = m.config.TargetID
	view := model.scenario(descriptor.Input.Scenario, m.config.TargetID)
	choice.Steps = dataLifecycleSteps(dataScenarioStatus(view.Receipt, view.Active), view)
	if descriptor.Kind == data.Activate || descriptor.Kind == data.Reset {
		generation := model.state.Activation.Generation
		choice.Input.ExpectedGeneration = &generation
		choice.Current = model.targetSummary()
	}
	return choice
}

func (m *DataModule) permittedChoice(ctx context.Context, choice DataActionChoice, capabilities map[data.Kind]data.Capability) bool {
	if projection := m.projection(ctx); projection != nil {
		allowed, err := m.authorizeProjectedChoice(ctx, projection.model, choice, capabilities)
		return allowed && err == nil
	}
	capability := capabilities[choice.Kind]
	if choice.ReceiptInput {
		return capability.Supported && capability.Permitted
	}
	input := choice.Input
	input.IdempotencyKey = "permission-check"
	return capability.Supported && capability.Permitted && m.config.Service.AuthorizeInput(ctx, choice.Kind, input) == nil
}

// choices are the actions offered to the current actor: each scenario's
// applicable lifecycle work, controls for the operations in the window and
// Try again for recent failures. Visible unavailable choices carry a reason.
func (m *DataModule) choices(ctx context.Context) ([]DataActionChoice, error) {
	if projection := m.projection(ctx); projection != nil {
		return m.projectedChoices(ctx, projection)
	}
	model, err := m.readModel(ctx)
	if err != nil {
		return nil, err
	}
	out := []DataActionChoice{}
	for _, descriptor := range model.catalog {
		for _, choice := range m.datasetChoices(descriptor, model) {
			if choice.Availability != "" || m.permittedChoice(ctx, choice, descriptor.Capabilities) {
				out = append(out, choice)
			}
		}
	}
	for _, choice := range m.operationCandidates(model) {
		switch choice.Kind {
		case data.Recover:
			if m.permittedRecovery(ctx, model, choice.Input) {
				out = append(out, choice)
			}
		case data.Cancel:
			if op := model.operation(choice.Input.OperationID); op != nil && m.config.Service.AuthorizeProjection(ctx, data.AccessRequest{Action: string(op.Result.Kind), Target: model.state.Target, Operation: op}) == nil {
				out = append(out, choice)
			}
		}
	}
	retries, err := m.retryChoices(ctx, model)
	if err != nil {
		return nil, err
	}
	return append(out, retries...), nil
}

func (m *DataModule) allowAction(ctx context.Context, _ console.Identity, panel, action string) bool {
	kind, valid := DataActionKind(action)
	if !valid || !slices.Contains(dataActionPanels, panel) {
		return false
	}
	// The registry has just resolved exact choices and their record policy.
	// Recheck target grants without reloading the entire read model per control.
	// Cancel uses its original operation's grant rather than a separate cancel grant.
	if kind != data.Cancel {
		return m.config.Service.AuthorizeAction(ctx, kind, m.config.TargetID) == nil
	}
	choices, err := m.choices(ctx)
	if err != nil {
		return false
	}
	for _, choice := range choices {
		if dataActionID(choice) == action {
			return true
		}
	}
	return false
}

// records projects one panel's rows from the authorized read model.
func (m *DataModule) records(ctx context.Context, _ console.Identity, panel string) ([]console.Record, error) {
	model, err := m.readModel(ctx)
	if err != nil {
		return nil, err
	}
	// The host owns presentation revisions; a bounded operation window must
	// never make summary/catalog/scenario revisions decrease when rows expire.
	m.mu.Lock()
	if m.revision == console.MaxWireCounter {
		m.mu.Unlock()
		return nil, data.Error(data.CodeUnavailable)
	}
	m.revision++
	revision := m.revision
	m.mu.Unlock()
	switch panel {
	case DataPanelVerification:
		return model.checkRecords(revision), nil
	case DataPanelCoverage:
		return model.coverageRecords(revision), nil
	case DataPanelExplore:
		out := []console.Record{}
		for _, descriptor := range model.catalog {
			out = append(out, DataDatasetRecord(descriptor, revision))
		}
		return out, nil
	}
	if !slices.Contains(dataActionPanels, panel) {
		return []console.Record{}, nil
	}
	// Action panels reference the offered work from their rows.
	choices, err := m.choices(ctx)
	if err != nil {
		return nil, err
	}
	refs := model.dataRefs(choices, panel, m.config.TargetID)
	out := []console.Record{}
	switch panel {
	case DataPanelOverview:
		out = append(out, DataOverviewRecord(model.overview(refs), revision))
	case DataPanelScenarios:
		for _, view := range model.scenarioViews(m.config.TargetID, refs) {
			out = append(out, DataScenarioRecord(view, revision))
		}
	case DataPanelOperations:
		for _, op := range model.ops {
			out = append(out, DataOperationViewRecord(model.operationView(op, refs)))
		}
	}
	return out, nil
}

// scenarioViews lists every catalog scenario on the target with its names,
// latest activity and declared actions.
func (model dataModuleReadModel) scenarioViews(target string, refs dataActionRefs) []DataScenarioView {
	views := []DataScenarioView{}
	for _, descriptor := range model.catalog {
		for _, scenario := range descriptor.Scenarios {
			view := model.scenario(scenario, target)
			view.Actions = refs.scenario[dataScenarioRefKey(data.Input{Dataset: scenario.Dataset, Scenario: scenario, TargetID: target})]
			views = append(views, view)
		}
	}
	return views
}

func (model dataModuleReadModel) operationView(op data.Operation, refs dataActionRefs) DataOperationView {
	datasetTitle, scenarioTitle := model.titles(op.Input.Scenario)
	return DataOperationView{Operation: op, DatasetTitle: datasetTitle, ScenarioTitle: scenarioTitle, Actions: refs.operation[op.Result.OperationID]}
}

func (model dataModuleReadModel) overview(refs dataActionRefs) DataOverviewView {
	target := DataTargetView{State: model.state, Actions: refs.target}
	for _, receipt := range model.receipts {
		if receipt.ID == model.state.Activation.ReceiptID {
			target.Receipt = receipt
			target.DatasetTitle, target.ScenarioTitle = model.titles(receipt.Scenario)
		}
	}
	view := DataOverviewView{Targets: []DataTargetView{target}, Counts: DataOverviewCounts{Datasets: len(model.catalog)}}
	if len(model.catalog) > 0 {
		view.Capabilities = model.catalog[0].Capabilities
	}
	for _, descriptor := range model.catalog {
		view.Counts.Scenarios += len(descriptor.Scenarios)
	}
	if len(model.ops) > 0 {
		view.LatestOperation = &model.ops[0]
	}
	for index, op := range model.ops {
		if op.Result.State == data.Running || op.Result.State == data.Queued {
			view.Counts.Running++
		}
		if op.Result.State == data.Failed {
			view.Counts.Failed++
		}
		if index < 5 {
			view.Recent = append(view.Recent, model.operationView(op, refs))
		}
	}
	for _, scenario := range model.scenarioViews(model.state.Target.TargetID, refs) {
		if scenario.Active || dataNextStepKind(dataScenarioStatus(scenario.Receipt, scenario.Active)) == "" {
			continue
		}
		view.UpNext = append(view.UpNext, scenario)
	}
	slices.SortStableFunc(view.UpNext, func(left, right DataScenarioView) int {
		order := func(view DataScenarioView) int {
			return slices.Index(dataScenarioStatusOrder, dataScenarioStatus(view.Receipt, view.Active))
		}
		return order(left) - order(right)
	})
	return view
}

// scenario is the scenario's row view on a target: its newest matching
// receipt (the active one wins), declared names and latest activity.
func (model dataModuleReadModel) scenario(scenario data.ScenarioRef, target string) DataScenarioView {
	view := DataScenarioView{Scenario: scenario, TargetID: target}
	view.DatasetTitle, view.Title = model.titles(scenario)
	if descriptor, ok := model.descriptorFor(scenario.Dataset); ok {
		view.Summary = descriptor.ScenarioSummary(scenario.ID)
	}
	for _, receipt := range model.receipts {
		if receipt.Scenario == scenario && (view.Receipt == nil || receipt.ID == model.state.Activation.ReceiptID) {
			view.Receipt = receipt
			view.Active = receipt.ID == model.state.Activation.ReceiptID
			if view.Active {
				break
			}
		}
	}
	for _, op := range model.ops {
		if op.Input.Scenario == scenario && op.Target.TargetID == target && op.UpdatedAt.After(view.UpdatedAt) {
			view.UpdatedAt = op.UpdatedAt
		}
	}
	return view
}

func (model dataModuleReadModel) checkRecords(revision uint64) []console.Record {
	out := []console.Record{}
	for _, op := range model.ops {
		_, title := model.titles(op.Input.Scenario)
		for _, check := range op.Result.Checks {
			out = append(out, DataCheckRecord(DataCheckView{Origin: op.Result.Kind, OperationID: op.Result.OperationID, DryRun: op.Result.DryRun, Check: check,
				Scenario: op.Input.Scenario, ScenarioTitle: title}, revision))
		}
	}
	for _, receipt := range model.receipts {
		if receipt.Verification == nil {
			continue
		}
		_, title := model.titles(receipt.Scenario)
		for _, check := range receipt.Verification.Checks {
			out = append(out, DataCheckRecord(DataCheckView{Origin: data.Verify, VerificationID: receipt.Verification.ID, ReceiptID: receipt.ID, Check: check,
				Scenario: receipt.Scenario, ScenarioTitle: title}, revision))
		}
	}
	return out
}

func (model dataModuleReadModel) coverageRecords(revision uint64) []console.Record {
	out := []console.Record{}
	for _, receipt := range model.receipts {
		if receipt.Verification == nil {
			continue
		}
		_, title := model.titles(receipt.Scenario)
		for _, coverage := range receipt.Verification.Coverage {
			out = append(out, DataCoverageRecord(DataCoverageView{VerificationID: receipt.Verification.ID, ReceiptID: receipt.ID, Coverage: coverage,
				Scenario: receipt.Scenario, ScenarioTitle: title}, revision))
		}
	}
	return out
}

// receiptOptions serves the receipt picker: bounded pages of the target's
// retained receipts for the action's scenario, newest first, independent of
// the operation window. Already-selected values resolve through exact lookups.
func (m *DataModule) receiptOptions(ctx context.Context, query console.PanelOptionQuery) (console.PanelOptionPage, error) {
	choice, err := m.receiptChoice(ctx, query)
	if err != nil {
		return console.PanelOptionPage{}, err
	}
	page, err := m.config.Service.Receipts(ctx, m.config.TargetID, data.ReceiptQuery{Limit: query.Limit, Cursor: query.Cursor})
	if err != nil {
		return console.PanelOptionPage{}, dataConsoleReadError(err)
	}
	out := console.PanelOptionPage{Items: []console.PanelUIActionOption{}, NextCursor: page.NextCursor}
	search := strings.ToLower(query.Search)
	for _, receipt := range page.Receipts {
		option, ok := dataReceiptOption(choice, receipt)
		if !ok || (search != "" && !strings.Contains(strings.ToLower(option.Label+" "+option.Value), search)) {
			continue
		}
		out.Items = append(out.Items, option)
	}
	out.Selected, err = m.receiptSelections(ctx, choice, query.Values)
	if err != nil {
		return console.PanelOptionPage{}, err
	}
	return out, nil
}

// receiptChoice is the executable receipt-input choice an options query names.
func (m *DataModule) receiptChoice(ctx context.Context, query console.PanelOptionQuery) (DataActionChoice, error) {
	if query.Field != "receipt_id" {
		return DataActionChoice{}, ErrNotFound
	}
	choices, err := m.choices(ctx)
	if err != nil {
		return DataActionChoice{}, dataConsoleReadError(err)
	}
	index := slices.IndexFunc(choices, func(choice DataActionChoice) bool {
		return choice.ReceiptInput && choice.Availability == "" && dataActionID(choice) == query.ActionID && slices.Contains(dataChoicePanels(choice), query.PanelID)
	})
	if index < 0 {
		return DataActionChoice{}, ErrNotFound
	}
	return choices[index], nil
}

// receiptSelections resolves already-selected receipts exactly, so a pinned
// receipt beyond the page stays selectable; gone or denied ones are omitted.
func (m *DataModule) receiptSelections(ctx context.Context, choice DataActionChoice, values []string) ([]console.PanelUIActionOption, error) {
	selected := []console.PanelUIActionOption{}
	for _, value := range values {
		receipt, err := m.config.Service.LookupReceipt(ctx, m.config.TargetID, value)
		if err != nil {
			if code, known := data.SafeErrorCode(err); known && (code == data.CodeGone || code == data.CodeDenied || code == data.CodeInvalid) {
				continue
			}
			return nil, dataConsoleReadError(err)
		}
		if option, ok := dataReceiptOption(choice, receipt); ok {
			selected = append(selected, option)
		}
	}
	return selected, nil
}

// dataReceiptOption labels a retained receipt for the picker; receipts of
// other scenarios are never offered, and activation lists unverified
// receipts disabled with the reason.
func dataReceiptOption(choice DataActionChoice, receipt data.PreparationReceipt) (console.PanelUIActionOption, bool) {
	if receipt.Scenario != choice.Input.Scenario {
		return console.PanelUIActionOption{}, false
	}
	status := dataScenarioStatus(&receipt, false)
	label := dataChoiceTitle(choice) + " · revision " + strconv.FormatUint(receipt.ContentRevision, 10) + " · " + dataScenarioStatusLabels[status]
	option := console.PanelUIActionOption{Value: receipt.ID, Label: label + " · " + dataShortID(receipt.ID), Description: receipt.ID}
	if choice.Kind == data.Activate && status != "verified" {
		option.Disabled = true
		option.Description = "Activation requires a passed verification of the current content."
	}
	return option, true
}

// requestStatus answers the pending-request lookup for the actor's own
// generated request ID (ADR-0003). It never claims or restarts work.
func (m *DataModule) requestStatus(ctx context.Context, query console.PanelRequestQuery) (console.PanelRequestStatus, error) {
	kind, ok := DataActionKind(query.ActionID)
	if !ok || kind == data.Recover {
		return console.PanelRequestStatus{}, ErrNotFound
	}
	status, err := m.config.Service.RequestStatus(ctx, kind, m.config.TargetID, query.RequestID, query.SubmittedAt)
	if err != nil {
		return console.PanelRequestStatus{}, dataConsoleReadError(err)
	}
	out := console.PanelRequestStatus{}
	if !status.RetryUntil.IsZero() {
		out.RetryUntil = status.RetryUntil.UTC().Format(time.RFC3339)
	}
	switch status.State {
	case data.RequestClaimed:
		if status.Operation == nil {
			return console.PanelRequestStatus{}, gerrors.New("claimed request without operation", gerrors.CategoryInternal).WithCode(http.StatusInternalServerError)
		}
		labels := DataActionLabels{Target: m.config.TargetID}
		if model, modelErr := m.readModel(ctx); modelErr == nil {
			_, title := model.titles(status.Operation.Input.Scenario)
			labels.Scenario = dataScenarioTitle(title, status.Operation.Input.Scenario)
		}
		result, presentErr := DataActionResultFor(kind, status.Operation.Result, nil, labels)
		if presentErr != nil {
			return console.PanelRequestStatus{}, presentErr
		}
		out.Status, out.Result = console.PanelRequestClaimed, &result
		out.Message = "This request was received."
	case data.RequestUnclaimed:
		out.Status = console.PanelRequestUnclaimed
		out.Message = "No request with this ID was received. Resubmitting the unchanged request is safe until the retry window ends."
	default:
		out.Status = console.PanelRequestExpired
		out.Message = "This request can no longer be resumed. Start a new request."
	}
	return out, nil
}
