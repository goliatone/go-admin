package admin

import (
	"context"
	"maps"
	"slices"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/console"
	admindata "github.com/goliatone/go-admin/data"
	gerrors "github.com/goliatone/go-errors"
)

// Data console presentation. The Data module owns routes, policy, services and
// which records an actor may read; this file declares the panel views and the
// drawer-based action controls those views reference. Lifecycle meaning and
// authorization stay on the server: the browser renders what it is given and
// never derives availability.

// DataPageTemplate is the packaged Data console page. It extends the neutral
// console shell, so the module renders it with ConsolePageRenderer.
const DataPageTemplate = "resources/data/index"

// Data console panel IDs, in tab order. The dataset catalog is the Explore
// panel's record set, so there is no separate Datasets tab.
const (
	DataPanelOverview     = "overview"
	DataPanelScenarios    = "scenarios"
	DataPanelOperations   = "operations"
	DataPanelVerification = "verification"
	DataPanelCoverage     = "coverage"
	// DataPanelDatasets names the panel that serves the dataset catalog records.
	//
	// Deprecated: the catalog is served by DataPanelExplore.
	DataPanelDatasets = DataPanelExplore
)

// DataOverviewRecordKey identifies the overview's single summary record.
const DataOverviewRecordKey = "summary"

// DataPanelIDs returns the Data panels in display order.
func DataPanelIDs() []string {
	return []string{DataPanelOverview, DataPanelScenarios, DataPanelOperations, DataPanelVerification, DataPanelCoverage, DataPanelExplore}
}

// dataActionPanels declare lifecycle actions. Overview references every
// action its lists show; Scenarios carries the per-scenario workflow;
// Operations carries cancel, recover and try again.
var dataActionPanels = []string{DataPanelOverview, DataPanelScenarios, DataPanelOperations}

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
		if bound.Choices != nil && bound.Dispatch != nil && slices.Contains(dataActionPanels, panel.id) {
			config.Definition = bound.definition(panel.id)
			config.ActionResolver = bound.resolver(panel.id)
			config.Options = bound.Options
			config.Requests = bound.Requests
		}
		if err := registry.Register(panel.id, config); err != nil {
			return err
		}
	}
	// Explore is read-only: it declares no lifecycle actions.
	return registry.Register(DataPanelExplore, dataExplorePanelConfig())
}

// DataActionChoice is one lifecycle action the current actor may start, or a
// visible unavailable one. The module derives choices from authorized reads
// and current capabilities; Input binds the selected work; the operator
// supplies request options and, for ReceiptInput actions, a retained receipt.
// Generation is captured in the action payload. The presentation fields are
// optional: they name the work for people and feed drawers and confirmations.
type DataActionChoice struct {
	Kind  admindata.Kind
	Label string
	Input admindata.Input
	// ReceiptInput lets an operator choose a retained receipt from a paginated
	// picker. Service policy and receipt identity remain authoritative.
	ReceiptInput bool
	// DefaultReceiptID preselects the picker (the scenario's latest receipt).
	DefaultReceiptID string
	// Title and DatasetTitle are the human names of the selected scenario and dataset.
	Title, DatasetTitle string
	// Availability marks a visible, disabled declaration (not permitted or
	// unsupported) explained by Reason. Empty means executable.
	Availability, Reason string
	// RetryOf is the terminal failed or canceled operation Try again repeats
	// as new work with the same input.
	RetryOf string
	// Steps are the scenario's lifecycle position shown in the drawer.
	Steps []console.PanelUIStep
	// Current is the target's current activation, for before/after confirmations.
	Current *DataTargetSummary
}

// DataTargetSummary is the safe current state of a target for confirmations.
type DataTargetSummary struct {
	TargetID      string
	ScenarioTitle string
	ReceiptID     string
	Generation    uint64
	Ready         bool
}

// DataPanelActions binds module dispatch to the Data presentation. Choices is
// called for every authorized definition and again before dispatch, so a
// choice that is no longer offered cannot run. Dispatch runs the registered
// typed command for the current trusted actor. Options and Requests are the
// module's receipt picker and pending-request resolvers.
type DataPanelActions struct {
	Choices  func(context.Context) ([]DataActionChoice, error)
	Dispatch func(context.Context, admindata.Kind, admindata.Input) (admindata.Result, error)
	Options  console.PanelOptionResolver
	Requests console.PanelRequestResolver
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

// DataActionID is the stable action ID the Data panels declare for a choice,
// so projections and hosts can reference declared actions from rows.
func DataActionID(choice DataActionChoice) string { return dataActionID(choice) }

func dataActionID(choice DataActionChoice) string {
	in := choice.Input
	// The action identifies selected work. Generation is a request precondition,
	// captured in the payload so old pages remain stale and retries stay reachable.
	return string(choice.Kind) + "-" + strings.TrimPrefix(dataRecordKey("action", in.Dataset.Digest, in.Scenario.ID, in.Scenario.Version,
		in.Scenario.ProfileHash, in.TargetID, in.ReceiptID, in.OperationID, choice.RetryOf), "action-")
}

// dataChoicePanels are the panels that declare a choice. Operation controls
// (cancel, recover, try again) live on Operations; scenario work on
// Scenarios; Overview declares both for its lists.
func dataChoicePanels(choice DataActionChoice) []string {
	if choice.Kind == admindata.Cancel || choice.Kind == admindata.Recover || choice.RetryOf != "" {
		return []string{DataPanelOverview, DataPanelOperations}
	}
	return []string{DataPanelOverview, DataPanelScenarios}
}

func (a DataPanelActions) choices(ctx context.Context, panelID string) map[string]DataActionChoice {
	choices, err := a.Choices(ctx)
	if err != nil {
		return nil
	}
	out := map[string]DataActionChoice{}
	for _, choice := range choices {
		if choice.Kind.Valid() && slices.Contains(dataChoicePanels(choice), panelID) {
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
			ui.ActionLayout = &console.PanelUIActionLayout{Mode: console.PanelActionLayoutDrawer}
		}
		def.UI = &ui
		return def
	}
}

const dataRequestIDHelp = "Generated for this request. Submitting the same input again reuses it; Preview plan and new work get their own."

// dataActionControl declares one action: a drawer that states its effect, a
// generated request ID under Advanced, a receipt picker where a receipt is
// chosen, Preview plan as a separate submitter and a structured confirmation
// for activation, reset, cancel and recovery.
func dataActionControl(id string, choice DataActionChoice) console.PanelUIAction {
	label := choice.Label
	if label == "" {
		label = dataKindLabel(choice.Kind)
	}
	action := console.PanelUIAction{ID: id, Label: label, SubmitLabel: dataSubmitLabel(choice), Kind: string(choice.Kind), Refresh: true, Drawer: dataActionDrawer(choice)}
	if choice.Availability != "" {
		action.Availability = choice.Availability
		action.Reason = choice.Reason
		return action
	}
	action.RequestScope = string(choice.Kind) + ":" + choice.Input.TargetID
	fields := []console.PanelUIActionField{}
	if choice.ReceiptInput {
		field := console.PanelUIActionField{Name: "receipt_id", Label: "Receipt", Kind: "select", Required: true,
			Help:         "Retained receipts of " + dataChoiceTitle(choice) + " on " + choice.Input.TargetID + ".",
			OptionSource: &console.PanelUIActionOptionSource{ID: "receipts", Label: "Retained receipts", Paginated: true, Searchable: true}}
		if choice.DefaultReceiptID != "" {
			field.Default = choice.DefaultReceiptID
		}
		fields = append(fields, field)
	}
	if choice.Kind == admindata.Prepare || choice.Kind == admindata.Refresh || choice.Kind == admindata.Generate {
		limit := 100
		if choice.Input.BatchLimit > 0 {
			limit = choice.Input.BatchLimit
		}
		fields = append(fields, console.PanelUIActionField{Name: "batch_limit", Label: "Batch size", Kind: "integer", Advanced: true, Default: limit,
			Help: "Records written per batch, from 1 to 10,000.", Min: new(float64(1)), Max: new(float64(10000))})
	}
	if dataSupportsPlan(choice.Kind) {
		fields = append(fields, console.PanelUIActionField{Name: "dry_run", Label: "Dry run", Kind: console.PanelFieldKindHidden, Default: choice.Input.DryRun})
		action.Secondary = &console.PanelUIActionSubmit{Label: "Preview plan", Field: "dry_run", Value: true}
	}
	if choice.Kind != admindata.Recover {
		fields = append(fields, console.PanelUIActionField{Name: "idempotency_key", Label: "Request ID", Kind: "text", Advanced: true,
			Generate: console.PanelFieldGenerateRequestID, Help: dataRequestIDHelp})
	}
	action.Fields = fields
	switch choice.Kind {
	case admindata.Activate, admindata.Reset:
		if choice.Input.ExpectedGeneration != nil {
			action.Payload = map[string]any{"expected_generation": *choice.Input.ExpectedGeneration}
		}
		action.RequiresConfirm = true
		action.Confirmation = dataActivationConfirmation(choice)
		action.ConfirmText = action.Confirmation.Title + " " + action.Confirmation.Message
	case admindata.Cancel:
		action.RequiresConfirm = true
		action.Confirmation = &console.PanelUIActionConfirmation{Title: "Cancel " + dataChoiceWork(choice) + "?",
			Message: "Work stops at the next safe point. A committed activation is not undone.", ConfirmLabel: "Cancel the operation", Tone: console.PanelToneWarning}
		action.ConfirmText = action.Confirmation.Title + " " + action.Confirmation.Message
	case admindata.Recover:
		action.RequiresConfirm = true
		action.Confirmation = &console.PanelUIActionConfirmation{Title: "Recover " + dataChoiceWork(choice) + "?",
			Message: "Recovery waits for the previous lease to expire, then reconciles the interrupted work without repeating provider effects.", ConfirmLabel: "Recover", Tone: console.PanelToneWarning}
		action.ConfirmText = action.Confirmation.Title + " " + action.Confirmation.Message
	}
	return action
}

// dataSupportsPlan reports whether a kind offers a dry run as Preview plan.
func dataSupportsPlan(kind admindata.Kind) bool {
	switch kind {
	case admindata.Prepare, admindata.Refresh, admindata.Verify, admindata.Activate, admindata.Reset, admindata.Generate:
		return true
	}
	return false
}

func dataSubmitLabel(choice DataActionChoice) string {
	if choice.RetryOf != "" {
		return "Try again"
	}
	if choice.Kind == admindata.Cancel {
		return "Cancel the operation"
	}
	return dataKindLabel(choice.Kind)
}

// dataChoiceTitle is the human name of the scenario a choice works on.
func dataChoiceTitle(choice DataActionChoice) string {
	if choice.Title != "" {
		return choice.Title
	}
	if label := dataScenarioLabel(choice.Input.Scenario); label != "" {
		return label
	}
	return "this scenario"
}

// dataChoiceWork names an operation control's subject: "the refresh of Ready".
func dataChoiceWork(choice DataActionChoice) string {
	if choice.Title != "" {
		return "the work on " + choice.Title
	}
	return "the operation"
}

// dataActionDrawer states what an action does to the target before it runs.
func dataActionDrawer(choice DataActionChoice) *console.PanelUIActionDrawer {
	target := choice.Input.TargetID
	title := dataChoiceTitle(choice)
	kindLabel := dataKindLabel(choice.Kind)
	drawer := &console.PanelUIActionDrawer{Eyebrow: kindLabel + " · " + target, Title: kindLabel + " " + title, Steps: choice.Steps}
	drawer.Effect, drawer.EffectTone = dataActionEffect(choice, title, target)
	if choice.RetryOf != "" {
		drawer.Eyebrow = "Try again · " + target
		drawer.Title = "Try again: " + kindLabel + " " + title
		drawer.Effect = "Starts new work with the same input as the failed " + strings.ToLower(kindLabel) + " of " + title + ". " + drawer.Effect
	}
	drawer.Details = dataActionDetails(choice)
	if dataSupportsPlan(choice.Kind) && choice.Availability == "" {
		drawer.Note = "Preview plan runs a dry run with its own request. Nothing changes on " + target + "."
	}
	return drawer
}

// dataActionEffect states what a kind does to the target, with the tone of
// its consequence: informational for staged work, warning for routing changes.
func dataActionEffect(choice DataActionChoice, title, target string) (string, string) {
	switch choice.Kind {
	case admindata.Validate:
		return "Checks " + title + " against the catalog and " + target + ". Nothing is written.", console.PanelToneInfo
	case admindata.Prepare:
		return "Writes an isolated stage for " + title + " on " + target + ". What " + target + " serves does not change.", console.PanelToneInfo
	case admindata.Refresh:
		return "Writes a new isolated stage for " + title + " on " + target + "; the current receipt stays retained. What " + target + " serves does not change.", console.PanelToneInfo
	case admindata.Verify:
		return "Runs the provider's checks against the chosen prepared receipt. Verification never changes what " + target + " serves.", console.PanelToneInfo
	case admindata.Activate:
		return "Switches " + target + " to the chosen prepared receipt as soon as the activation completes.", console.PanelToneWarning
	case admindata.Reset:
		return "Stops " + target + " from serving any dataset.", console.PanelToneWarning
	case admindata.Generate:
		return "Asks the provider to generate a new dataset version. Prepare it before use.", console.PanelToneInfo
	case admindata.Cancel:
		return "Asks the running operation to stop at its next safe point. A committed activation is not undone.", console.PanelToneWarning
	case admindata.Recover:
		return "Reconciles the interrupted operation after its lease expires, without repeating provider effects. Writes stay paused until it completes.", console.PanelToneWarning
	default:
		return "", console.PanelToneInfo
	}
}

// dataActionDetails names the selected dataset, scenario, target and operation.
func dataActionDetails(choice DataActionChoice) []console.PanelUIDetail {
	details := []console.PanelUIDetail{}
	if choice.Input.Dataset.ID != "" {
		details = append(details,
			console.PanelUIDetail{Label: "Dataset", Value: dataDatasetTitle(choice.DatasetTitle, choice.Input.Dataset)},
			console.PanelUIDetail{Label: "Scenario", Value: dataScenarioLabel(choice.Input.Scenario), Format: console.PanelFormatMono})
	}
	if choice.Input.TargetID != "" {
		details = append(details, console.PanelUIDetail{Label: "Target", Value: choice.Input.TargetID})
	}
	if choice.Input.OperationID != "" {
		details = append(details, console.PanelUIDetail{Label: "Operation", Value: choice.Input.OperationID, Format: console.PanelFormatMono})
	}
	return details
}

// dataActivationConfirmation shows the before and after state of an
// activation or reset, including the generation change.
func dataActivationConfirmation(choice DataActionChoice) *console.PanelUIActionConfirmation {
	target := choice.Input.TargetID
	title := dataChoiceTitle(choice)
	current := DataTargetSummary{TargetID: target}
	if choice.Current != nil {
		current = *choice.Current
	}
	before := current.ScenarioTitle
	if before == "" {
		before = "No active dataset"
	}
	generation := strconv.FormatUint(current.Generation, 10)
	next := strconv.FormatUint(current.Generation+1, 10)
	confirmation := &console.PanelUIActionConfirmation{Tone: console.PanelToneWarning}
	if choice.Kind == admindata.Reset {
		confirmation.Title = "Reset " + target + "?"
		confirmation.Message = target + " stops serving " + before + " and returns to no active dataset."
		confirmation.ConfirmLabel = "Reset " + target
		confirmation.Changes = []console.PanelUIChange{
			{Label: "Scenario", Before: before, After: "No active dataset"},
			{Label: "Generation", Before: generation, After: next, Format: console.PanelFormatNumber},
		}
		return confirmation
	}
	confirmation.Title = "Activate " + title + " on " + target + "?"
	confirmation.Message = target + " switches to this prepared data as soon as the activation completes. Until then it keeps serving what it serves now."
	confirmation.ConfirmLabel = "Activate " + title
	confirmation.Changes = []console.PanelUIChange{{Label: "Scenario", Before: before, After: title}}
	receipt := choice.Input.ReceiptID
	if receipt == "" {
		receipt = choice.DefaultReceiptID
	}
	if receipt != "" || current.ReceiptID != "" {
		confirmation.Changes = append(confirmation.Changes, console.PanelUIChange{Label: "Receipt", Before: dataShortID(current.ReceiptID), After: dataShortID(receipt), Format: console.PanelFormatMono})
	}
	confirmation.Changes = append(confirmation.Changes, console.PanelUIChange{Label: "Generation", Before: generation, After: next, Format: console.PanelFormatNumber})
	if current.ScenarioTitle != "" {
		confirmation.Note = "To switch back later, activate " + current.ScenarioTitle + " again. That creates generation " + strconv.FormatUint(current.Generation+2, 10) + "."
	}
	return confirmation
}

func (a DataPanelActions) resolver(panelID string) console.PanelActionHandlerResolver {
	return func(_ context.Context, actionID string) console.PanelActionHandler {
		return func(ctx context.Context, request console.PanelActionRequest) (console.PanelActionResult, error) {
			choice, ok := a.choices(ctx, panelID)[actionID]
			if !ok || choice.Availability != "" {
				return console.PanelActionResult{OK: false, Message: "This action is no longer available. The panels were refreshed.", Refresh: true, Tone: console.PanelToneWarning}, nil
			}
			input, fields := dataActionInput(choice, request.Payload)
			if len(fields) > 0 {
				return dataFailureResult(admindata.CodeInvalid, fields), nil
			}
			result, err := a.Dispatch(ctx, choice.Kind, input)
			return DataActionResultFor(choice.Kind, result, err, DataActionLabels{Scenario: choice.Title, Target: choice.Input.TargetID})
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
			fields["receipt_id"] = "Choose a retained receipt."
		}
	}
	input.IdempotencyKey = ""
	if key, ok := payload["idempotency_key"].(string); ok {
		input.IdempotencyKey = strings.TrimSpace(key)
	}
	if input.IdempotencyKey == "" {
		fields["idempotency_key"] = "Reopen the form to generate a new request ID."
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

func dataRichColumn(label, bind string, options map[string]any) map[string]any {
	column := dataColumn(label, bind)
	maps.Copy(column, options)
	return column
}

// dataTable binds a table to rows that carry their record key as `key` and
// their action references as `actions`.
func dataTable(title, bind string, columns ...map[string]any) *console.PanelUIView {
	view := dataReadOnlyTable(title, bind, columns...)
	view.Options["actions_bind"] = "actions"
	return view
}

// dataReadOnlyTable binds an evidence table whose rows carry no actions.
func dataReadOnlyTable(title, bind string, columns ...map[string]any) *console.PanelUIView {
	view := console.TableView(bind)
	view.Title = title
	view.Options = map[string]any{"key_bind": "key", "columns": columns}
	return view
}

func dataListView(title, bind string, options map[string]any) *console.PanelUIView {
	view := console.PanelView(console.PanelRendererList, bind)
	view.Title = title
	merged := map[string]any{"key_bind": "key", "title_bind": "title", "subtitle_bind": "subtitle", "status_bind": "status_label", "tone_bind": "status_tone", "time_bind": "updated_at", "actions_bind": "actions"}
	maps.Copy(merged, options)
	view.Options = merged
	return view
}

func dataSelectFilter(id, label, bind string, options ...string) console.PanelUIFilter {
	return console.PanelUIFilter{ID: id, Label: label, Kind: console.PanelFilterSelect, Bind: bind, Options: options}
}

var dataIDColumn = map[string]any{"format": console.PanelFormatCopy, "truncate": 12, "empty": "—"}

func dataOverviewUI() *console.PanelUI {
	attention := dataListView("Needs attention", "attention", map[string]any{"tone_bind": "tone", "hide_empty": true})
	targets := console.PanelView(console.PanelRendererCards, "targets")
	targets.Title = "Managed targets"
	targets.Empty = "No managed targets."
	targets.Options = map[string]any{
		"key_bind": "key", "eyebrow_bind": "target_id", "title_bind": "title", "subtitle_bind": "subtitle",
		"status_bind": "status_label", "tone_bind": "status_tone", "note_bind": "note", "actions_bind": "actions", "max_cards": 4,
		"fields": []map[string]any{
			dataColumn("Generation", "generation", console.PanelFormatNumber),
			dataRichColumn("Receipt", "receipt_id", dataIDColumn),
		},
		"columns": []map[string]any{
			dataColumn("Target", "target_id"),
			dataRichColumn("Status", "status_label", map[string]any{"format": console.PanelFormatBadge, "tone_bind": "status_tone"}),
			dataColumn("Scenario", "title"),
			dataRichColumn("Dataset", "dataset_label", map[string]any{"empty": "—"}),
			dataColumn("Generation", "generation", console.PanelFormatNumber),
			dataRichColumn("Receipt", "receipt_id", dataIDColumn),
		},
	}
	upNext := dataListView("Up next", "up_next", map[string]any{"limit": 8})
	upNext.Description = "Scenarios waiting on a lifecycle step."
	upNext.Empty = "Nothing is waiting on a step. Prepare a scenario to start."
	recent := dataListView("Recent operations", "recent", map[string]any{"status_bind": "outcome", "tone_bind": "outcome_tone", "progress_bind": "progress_bar", "limit": 5})
	recent.Empty = "No operations yet."
	recent.Link = &console.PanelUILink{Label: "All operations", PanelID: DataPanelOperations}
	ui := console.NewPanelUI(console.StackView(*attention, *targets, *upNext, *recent), nil)
	ui.Count = &console.PanelUICount{Mode: console.PanelCountNone}
	return ui
}

func dataScenariosUI() *console.PanelUI {
	table := dataTable("Scenarios", "",
		dataRichColumn("Scenario", "label", map[string]any{"secondary_bind": "subtitle"}),
		dataColumn("Lifecycle", "lifecycle", console.PanelFormatSteps),
		dataRichColumn("Status", "status_label", map[string]any{"format": console.PanelFormatBadge, "tone_bind": "status_tone"}),
		dataRichColumn("Receipt", "receipt_id", dataIDColumn),
		dataRichColumn("Last activity", "updated_at", map[string]any{"format": console.PanelFormatRelative, "empty": "—"}),
	)
	table.Description = "Prepare, verify and activate each scenario from its row. Preparing or verifying never changes what a target serves."
	table.Empty = "No scenarios yet. Datasets appear here once a provider publishes them."
	ui := console.NewPanelUI(table, nil)
	ui.Filters = []console.PanelUIFilter{
		dataSelectFilter("status", "Status", "status_label", dataLabelValues(dataScenarioStatusLabels, dataScenarioStatusOrder)...),
	}
	return ui
}

func dataOperationsUI() *console.PanelUI {
	table := dataTable("Operations", "",
		dataRichColumn("Operation", "title", map[string]any{"secondary_bind": "subtitle"}),
		dataRichColumn("Outcome", "outcome", map[string]any{"format": console.PanelFormatBadge, "tone_bind": "outcome_tone"}),
		dataRichColumn("Progress", "progress_bar", map[string]any{"format": console.PanelFormatProgress, "empty": "—"}),
		dataRichColumn("Updated", "updated_at", map[string]any{"format": console.PanelFormatRelative, "empty": "—"}),
		dataRichColumn("Reference", "operation_id", map[string]any{"format": console.PanelFormatCopy, "truncate": 8}),
	)
	table.Empty = "No operations yet. Prepare a scenario to start."
	ui := console.NewPanelUI(table, nil)
	states := []string{}
	for _, state := range []admindata.State{admindata.Queued, admindata.Running, admindata.Succeeded, admindata.Failed, admindata.Canceled} {
		states = append(states, dataStateLabels[state])
	}
	ui.Filters = []console.PanelUIFilter{
		dataSelectFilter("state", "State", "state_label", states...),
		dataSelectFilter("action", "Action", "action", dataLabelValues(dataKindLabels, dataKindOrder)...),
	}
	ui.Count = &console.PanelUICount{Bind: "attention", Mode: console.PanelCountMatchingRows, ToneBind: "attention_tone"}
	return ui
}

func dataVerificationUI() *console.PanelUI {
	table := dataReadOnlyTable("Verification", "",
		dataRichColumn("Check", "label", map[string]any{"secondary_bind": "check_id"}),
		dataRichColumn("Result", "result", map[string]any{"format": console.PanelFormatBadge, "tone_bind": "result_tone"}),
		dataRichColumn("Expected", "expected", map[string]any{"empty": "—"}),
		dataRichColumn("Actual", "actual", map[string]any{"empty": "—"}),
		dataRichColumn("Scenario", "scenario_label", map[string]any{"secondary_bind": "context", "empty": "—"}),
		dataRichColumn("Evidence", "evidence_ref", map[string]any{"format": console.PanelFormatMono, "empty": "—"}),
	)
	table.Description = "Planned checks come from dry runs and were never executed."
	table.Empty = "No checks yet. Validation and verification results appear here."
	ui := console.NewPanelUI(table, nil)
	ui.Filters = []console.PanelUIFilter{
		dataSelectFilter("result", "Result", "result", dataCheckPassed, dataCheckFailed, dataCheckPlanned, dataCheckUnavailable),
		dataSelectFilter("source", "Source", "source", dataSourceValidation, dataSourceVerification, dataSourcePlan),
	}
	ui.Count = &console.PanelUICount{Bind: "failed", Mode: console.PanelCountMatchingRows, Tone: console.PanelToneError}
	return ui
}

func dataCoverageUI() *console.PanelUI {
	table := dataReadOnlyTable("Coverage", "",
		dataColumn("Day", "local_day"),
		dataColumn("Timezone", "timezone"),
		dataRichColumn("Coverage", "coverage", map[string]any{"format": console.PanelFormatBadge, "tone_bind": "coverage_tone"}),
		dataRichColumn("Scenario", "scenario_label", map[string]any{"secondary_bind": "receipt_short", "empty": "—"}),
		dataRichColumn("Evidence", "evidence_ref", map[string]any{"format": console.PanelFormatMono, "empty": "—"}),
	)
	table.Empty = "No verified coverage yet. Verify a prepared receipt to see which days it covers."
	ui := console.NewPanelUI(table, nil)
	ui.Filters = []console.PanelUIFilter{
		dataSelectFilter("coverage", "Coverage", "coverage", dataLabelValues(dataCoverageLabels, dataCoverageOrder)...),
	}
	return ui
}

// DataActionLabels name the work an outcome describes, for people.
type DataActionLabels struct {
	Scenario string
	Target   string
}

// DataActionResult presents the outcome of dispatching kind on the console
// action route. See DataActionResultFor.
func DataActionResult(kind admindata.Kind, result admindata.Result, err error) (console.PanelActionResult, error) {
	return DataActionResultFor(kind, result, err, DataActionLabels{})
}

// DataActionResultFor presents the outcome of dispatching kind on the console
// action route. Denials and errors outside the Data contract stay errors, so
// the host answers with their status and the client revalidates access; every
// other typed failure becomes a safe, field-addressable result. Success
// wording never calls accepted, prepared or verified work active, and every
// outcome refreshes the panels so the operation row and active state come
// from the read model. Outcomes link to their operation row and carry a tone;
// planned outcomes are marked so they never read as executed.
func DataActionResultFor(kind admindata.Kind, result admindata.Result, err error, labels DataActionLabels) (console.PanelActionResult, error) {
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
	record := dataOperationRecordRef(result)
	if kind == admindata.Cancel {
		return console.PanelActionResult{OK: true, Message: dataCancelMessage(result, labels), Refresh: true, Tone: console.PanelToneInfo, Record: record}, nil
	}
	switch {
	case result.Failure != nil && result.State != admindata.Succeeded:
		failure := dataFailureResult(result.Failure.Code, result.Failure.Fields)
		failure.Record = record
		return failure, nil
	case result.State == admindata.Failed:
		failure := dataFailureResult(admindata.CodeProvider, nil)
		failure.Record = record
		return failure, nil
	case result.State == admindata.Canceled:
		failure := dataFailureResult(admindata.CodeCanceled, nil)
		failure.Record = record
		return failure, nil
	}
	message, tone := dataActionMessage(result, labels)
	return console.PanelActionResult{OK: true, Message: message, Refresh: true, Tone: tone, Planned: result.DryRun, Record: record}, nil
}

func dataOperationRecordRef(result admindata.Result) *console.PanelUIRecordRef {
	if result.OperationID == "" {
		return nil
	}
	return &console.PanelUIRecordRef{PanelID: DataPanelOperations, RecordKey: result.OperationID}
}

func dataFailureResult(code string, fields map[string]string) console.PanelActionResult {
	message, ok := dataFailureMessages[code]
	if !ok {
		message = dataFailureMessages[admindata.CodeProvider]
		code = admindata.CodeProvider
	}
	tone := console.PanelToneError
	if code == admindata.CodeCanceled {
		tone = console.PanelToneNeutral
	}
	if code == admindata.CodeBusy || code == admindata.CodeRecovery {
		tone = console.PanelToneWarning
	}
	failure := console.PanelActionResult{OK: false, Message: message, Refresh: true, Tone: tone, Code: code}
	if len(fields) > 0 {
		failure.Errors = map[string]any{}
		for field, problem := range fields {
			failure.Errors[field] = problem
		}
		failure.Message += " Check the highlighted fields."
	}
	return failure
}

// dataWorkLabel is "Prepare Ready" or, without a title, "Prepare".
func dataWorkLabel(kind admindata.Kind, labels DataActionLabels) string {
	label := dataKindLabel(kind)
	if labels.Scenario != "" {
		return label + " " + labels.Scenario
	}
	return label
}

func dataTargetPhrase(labels DataActionLabels) string {
	if labels.Target != "" {
		return labels.Target
	}
	return "the target"
}

func dataCancelMessage(result admindata.Result, labels DataActionLabels) string {
	work := "the " + strings.ToLower(dataKindLabel(result.Kind)) + " operation"
	sentence := "The " + strings.ToLower(dataKindLabel(result.Kind)) + " operation"
	if labels.Scenario != "" {
		work = dataKindLabel(result.Kind) + " of " + labels.Scenario
		sentence = work
	}
	if result.State.Terminal() {
		return sentence + " already finished (" + strings.ToLower(dataStateLabels[result.State]) + "); nothing was canceled."
	}
	return "Cancellation requested for " + work + ". It stops at the next safe point; a committed activation is not undone."
}

var dataFailureMessages = map[string]string{
	admindata.CodeInvalid:     "The request is invalid.",
	admindata.CodeDenied:      "You are not allowed to continue this operation.",
	admindata.CodeConflict:    "This request was already used with different input. Start a new request to run the changed work.",
	admindata.CodeBusy:        "Another write is running on this target. Retry after it finishes.",
	admindata.CodeStale:       "The active dataset changed since this page loaded. Review the current state and confirm again.",
	admindata.CodeUnavailable: "This action is unavailable for this target.",
	admindata.CodeCanceled:    "The operation was canceled.",
	admindata.CodeRecovery:    "The target needs recovery. New writes are blocked until recovery completes.",
	admindata.CodeLeaseLost:   "The operation stopped after losing its lease and made no further changes.",
	admindata.CodeGone:        "The operation, receipt or artifact is no longer available.",
	admindata.CodeProvider:    "The provider failed. Check the operation history for its recorded state.",
}

// dataActionMessage reports the operation's actual state first; an in-flight
// dry run (including a same-key replay) has not produced its plan yet.
func dataActionMessage(result admindata.Result, labels DataActionLabels) (string, string) {
	work := dataWorkLabel(result.Kind, labels)
	target := dataTargetPhrase(labels)
	switch {
	case result.State == admindata.Queued && result.DryRun:
		return "Plan for " + work + " queued. Planning has not run yet; nothing will change.", console.PanelTonePlanned
	case result.State == admindata.Queued:
		return work + " accepted. It has not run yet; what " + target + " serves is unchanged.", console.PanelToneInfo
	case result.State == admindata.Running && result.DryRun:
		return "Planning " + work + ". Nothing will change.", console.PanelTonePlanned
	case result.State == admindata.Running:
		return work + " is running. What " + target + " serves is unchanged until an activation completes.", console.PanelToneInfo
	case result.State == admindata.Succeeded && result.DryRun:
		return "Plan ready for " + work + ". Nothing changed; " + dataPlural(len(result.Checks), "check is", "checks are") + " planned, not executed.", console.PanelTonePlanned
	case result.State == admindata.Succeeded:
		return dataSucceededMessage(result, labels)
	default:
		return work + " is " + strings.ToLower(dataStateLabels[result.State]) + ".", console.PanelToneNeutral
	}
}

func dataSucceededMessage(result admindata.Result, labels DataActionLabels) (string, string) {
	named := labels.Scenario != ""
	subject := labels.Scenario
	target := dataTargetPhrase(labels)
	switch result.Kind {
	case admindata.Validate:
		failed := 0
		for _, check := range result.Checks {
			if check.Status != admindata.CheckPassed {
				failed++
			}
		}
		validation := "Validation"
		if named {
			validation = "Validation of " + subject
		}
		if failed > 0 {
			return validation + " found problems in " + strconv.Itoa(failed) + " of " + dataPlural(len(result.Checks), "check", "checks") + ".", console.PanelToneWarning
		}
		return validation + " passed " + dataPlural(len(result.Checks), "check", "checks") + ".", console.PanelToneSuccess
	case admindata.Prepare, admindata.Refresh:
		if !named {
			subject = "a new receipt"
		}
		return "Prepared " + subject + ". Verify it, then activate it to change what " + target + " serves.", console.PanelToneInfo
	case admindata.Verify:
		if !named {
			subject = "the receipt"
		}
		switch {
		case result.Verification == nil:
			return "Verification of " + subject + " finished; it is not active.", console.PanelToneNeutral
		case result.Verification.Passed():
			return "Verified " + subject + ". Activate it to change what " + target + " serves.", console.PanelToneSuccess
		default:
			return "Verification of " + subject + " failed; it cannot be activated.", console.PanelToneError
		}
	case admindata.Activate, admindata.Reset:
		return dataActivationMessage(result, labels)
	case admindata.Generate:
		if label := dataDatasetLabel(dataGeneratedDataset(result)); label != "" {
			return "Generated dataset " + label + ". Prepare it before use.", console.PanelToneInfo
		}
		return "Generated a dataset. Prepare it before use.", console.PanelToneInfo
	default:
		return dataWorkLabel(result.Kind, labels) + " succeeded.", console.PanelToneSuccess
	}
}

func dataActivationMessage(result admindata.Result, labels DataActionLabels) (string, string) {
	work := dataWorkLabel(result.Kind, labels)
	target := dataTargetPhrase(labels)
	if result.Activation == nil {
		return work + " finished without an activation record.", console.PanelToneWarning
	}
	generation := strconv.FormatUint(result.Activation.Generation, 10)
	subject := labels.Scenario
	if subject == "" {
		subject = "the chosen receipt"
	}
	switch {
	case result.Kind == admindata.Reset:
		return "Reset " + target + " at generation " + generation + ". It serves no dataset now.", console.PanelToneSuccess
	case result.Active && result.Activation.Ready:
		return "Activated " + subject + " on " + target + " at generation " + generation + ".", console.PanelToneSuccess
	default:
		return "Activation of " + subject + " committed at generation " + generation + "; " + target + " is not ready yet.", console.PanelToneWarning
	}
}

// dataPlural counts with the right noun: "1 check", "2 checks".
func dataPlural(count int, singular, plural string) string {
	if count == 1 {
		return "1 " + singular
	}
	return strconv.Itoa(count) + " " + plural
}

func dataGeneratedDataset(result admindata.Result) admindata.DatasetRef {
	if result.Dataset == nil {
		return admindata.DatasetRef{}
	}
	return *result.Dataset
}
