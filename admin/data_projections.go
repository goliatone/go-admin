package admin

import (
	"crypto/sha256"
	"encoding/hex"
	"maps"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/console"
	admindata "github.com/goliatone/go-admin/data"
)

// Data console projections. They turn lifecycle read models into the display
// records the Data views bind to: human titles first, lifecycle state as
// server-computed tones and steps, identifiers shortened and copyable. They
// apply no authorization and never copy principals, idempotency keys,
// fingerprints, stage IDs or provider component paths into a record.

// DataTargetView is one managed target from the service's safe ActiveState
// read model. Receipt is the target's active receipt when known; a receipt
// that is not the active one is ignored. Titles and Actions are optional
// presentation supplied by the module.
type DataTargetView struct {
	State   admindata.ActiveState
	Receipt *admindata.PreparationReceipt
	// ScenarioTitle and DatasetTitle name the active receipt for people.
	ScenarioTitle, DatasetTitle string
	// Actions are this target's declared action references (recover, reset).
	Actions []console.PanelUIActionRef
}

// DataOverviewCounts are totals over records the current actor may read.
type DataOverviewCounts struct {
	Datasets  int
	Scenarios int
	Running   int
	Failed    int
}

// DataOverviewView supplies the overview's single record: managed targets,
// the scenarios waiting on a step, the most recent operations and anything
// that needs attention, which the projection derives from those.
type DataOverviewView struct {
	Targets         []DataTargetView
	Capabilities    map[admindata.Kind]admindata.Capability
	LatestOperation *admindata.Operation
	Counts          DataOverviewCounts
	// UpNext are the scenarios waiting on a lifecycle step, most ready first.
	UpNext []DataScenarioView
	// Recent are the most recent operations the actor may read, newest first.
	Recent []DataOperationView
}

// DataScenarioView is one scenario, optionally with its latest preparation on
// a target. Active reports that the receipt is the target's active receipt.
type DataScenarioView struct {
	Scenario admindata.ScenarioRef
	TargetID string
	Receipt  *admindata.PreparationReceipt
	Active   bool
	// Title, Summary and DatasetTitle are the declared names; empty falls back
	// to identifiers.
	Title, Summary, DatasetTitle string
	// UpdatedAt is the latest operation on this scenario and target, if known.
	UpdatedAt time.Time
	// Actions are the scenario's declared action references for its panel.
	Actions []console.PanelUIActionRef
}

// DataOperationView is one operation with optional presentation.
type DataOperationView struct {
	Operation                   admindata.Operation
	ScenarioTitle, DatasetTitle string
	Actions                     []console.PanelUIActionRef
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
	Scenario       admindata.ScenarioRef
	ScenarioTitle  string
}

// DataCoverageView is one verified sample period.
type DataCoverageView struct {
	VerificationID string
	ReceiptID      string
	Coverage       admindata.Coverage
	Scenario       admindata.ScenarioRef
	ScenarioTitle  string
}

// Revisions passed to the projections must be at least 1 and increase whenever
// a row's projected data changes; the console host drops revision 0.

// DataOverviewRecord projects the overview summary record.
func DataOverviewRecord(view DataOverviewView, revision uint64) console.Record {
	targets := make([]map[string]any, 0, len(view.Targets))
	for _, target := range view.Targets {
		targets = append(targets, dataTargetRow(target))
	}
	recent := make([]map[string]any, 0, len(view.Recent))
	for _, operation := range view.Recent {
		recent = append(recent, dataOperationRow(operation))
	}
	upNext := make([]map[string]any, 0, len(view.UpNext))
	for _, scenario := range view.UpNext {
		if scenario.Active {
			continue
		}
		upNext = append(upNext, dataScenarioRow(scenario))
	}
	data := map[string]any{
		"targets":      targets,
		"capabilities": dataCapabilityRows(view.Capabilities),
		"attention":    dataAttentionRows(view),
		"up_next":      upNext,
		"recent":       recent,
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
		data["latest_operation"] = dataOperationRow(DataOperationView{Operation: *view.LatestOperation})
	}
	return console.Record{Key: DataOverviewRecordKey, Revision: revision, Data: data}
}

// dataAttentionRows lists what needs an operator: targets that need recovery
// or are switching, and recent operations that failed or paused.
func dataAttentionRows(view DataOverviewView) []map[string]any {
	rows := []map[string]any{}
	for _, target := range view.Targets {
		state := target.State
		id := state.Target.TargetID
		switch {
		case state.RecoveryRequired:
			rows = append(rows, map[string]any{"key": "target-" + id, "title": id + " needs recovery", "subtitle": "Writes are paused until the interrupted operation is recovered.",
				"status_label": "Recovery required", "tone": console.PanelToneError, "actions": console.NormalizePanelActionRefs(target.Actions)})
		case state.Transitioning:
			rows = append(rows, map[string]any{"key": "target-" + id, "title": id + " is switching datasets", "subtitle": "An activation is in progress; the target is not ready yet.",
				"status_label": "Switching", "tone": console.PanelToneWarning})
		}
	}
	for _, operation := range view.Recent {
		result := operation.Operation.Result
		row := dataOperationRow(operation)
		switch {
		case result.State == admindata.Failed:
			rows = append(rows, map[string]any{"key": "operation-" + result.OperationID, "title": dataText(row["title"]) + " failed", "subtitle": dataText(row["subtitle"]),
				"status_label": row["outcome"], "tone": console.PanelToneError, "updated_at": row["updated_at"], "actions": row["actions"]})
		case result.State == admindata.Running && result.Phase == "recovering":
			rows = append(rows, map[string]any{"key": "operation-" + result.OperationID, "title": dataText(row["title"]) + " is recovering", "subtitle": dataText(row["subtitle"]),
				"status_label": row["outcome"], "tone": console.PanelToneWarning, "updated_at": row["updated_at"], "actions": row["actions"]})
		}
	}
	return rows
}

// DataDatasetRecord projects one catalog dataset version for the Explore panel.
func DataDatasetRecord(descriptor admindata.Descriptor, revision uint64) console.Record {
	ref := descriptor.Dataset
	key := dataDatasetKey(ref)
	origin := dataOriginSource
	if descriptor.Synthetic {
		origin = dataOriginSynthetic
	}
	label := dataDatasetLabel(ref)
	title := descriptor.Title()
	if title == "" {
		title = label
	}
	return console.Record{Key: key, Revision: revision, Data: map[string]any{
		"key":                     key,
		"label":                   title,
		"title":                   title,
		"summary":                 descriptor.Summary(),
		"dataset_ref":             label,
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
	}}
}

// DataScenarioRecord projects one scenario row.
func DataScenarioRecord(view DataScenarioView, revision uint64) console.Record {
	ref := view.Scenario
	key := dataRecordKey("scenario", ref.Dataset.Digest, ref.ID, ref.Version, ref.ProfileHash, view.TargetID)
	return console.Record{Key: key, TargetID: view.TargetID, Revision: revision, Data: dataScenarioRow(view)}
}

func dataScenarioRow(view DataScenarioView) map[string]any {
	ref := view.Scenario
	key := dataRecordKey("scenario", ref.Dataset.Digest, ref.ID, ref.Version, ref.ProfileHash, view.TargetID)
	receipt := view.Receipt
	if receipt != nil && receipt.Scenario != ref {
		receipt = nil
	}
	status := dataScenarioStatus(receipt, view.Active)
	title := dataScenarioTitle(view.Title, ref)
	datasetTitle := dataDatasetTitle(view.DatasetTitle, ref.Dataset)
	row := map[string]any{
		"key":            key,
		"label":          title,
		"title":          title,
		"summary":        view.Summary,
		"scenario_id":    ref.ID,
		"version":        ref.Version,
		"scenario_label": dataScenarioLabel(ref),
		"dataset_label":  datasetTitle,
		"dataset_ref":    dataDatasetLabel(ref.Dataset),
		"subtitle":       datasetTitle + " · " + dataScenarioLabel(ref),
		"target_id":      view.TargetID,
		"status":         status,
		"status_label":   dataScenarioStatusLabels[status],
		"status_tone":    dataScenarioStatusTones[status],
		"active":         view.Active,
		"lifecycle":      dataLifecycleSteps(status, view),
		"next_step":      dataNextStepLabel(status),
	}
	if receipt != nil {
		row["receipt_id"] = receipt.ID
		row["content_revision"] = receipt.ContentRevision
	}
	if !view.UpdatedAt.IsZero() {
		row["updated_at"] = view.UpdatedAt.UTC().Format(time.RFC3339)
	}
	if refs := console.NormalizePanelActionRefs(view.Actions); len(refs) > 0 {
		row["actions"] = refs
	}
	dataExploreRow(row, view, receipt)
	return row
}

// dataLifecycleSteps renders the scenario's position as generic ordered steps.
func dataLifecycleSteps(status string, view DataScenarioView) []console.PanelUIStep {
	prepared := console.PanelUIStep{Label: "Prepared", State: console.PanelStepPending}
	verified := console.PanelUIStep{Label: "Verified", State: console.PanelStepPending}
	active := console.PanelUIStep{Label: "Active", State: console.PanelStepPending}
	switch status {
	case "not_prepared":
		prepared.State = console.PanelStepCurrent
	case "prepared":
		prepared.State, prepared.Tone = console.PanelStepDone, console.PanelToneInfo
		verified.State = console.PanelStepCurrent
	case "stale_verification":
		prepared.State, prepared.Tone = console.PanelStepDone, console.PanelToneInfo
		verified.Label, verified.State, verified.Tone = "Changed since verification", console.PanelStepWarning, console.PanelToneWarning
	case "verification_failed":
		prepared.State, prepared.Tone = console.PanelStepDone, console.PanelToneInfo
		verified.Label, verified.State, verified.Tone = "Verification failed", console.PanelStepFailed, console.PanelToneError
	case "verified":
		prepared.State, prepared.Tone = console.PanelStepDone, console.PanelToneInfo
		verified.State, verified.Tone = console.PanelStepDone, console.PanelToneSuccess
		active.State = console.PanelStepCurrent
	case "active":
		prepared.State, prepared.Tone = console.PanelStepDone, console.PanelToneInfo
		verified.State, verified.Tone = console.PanelStepDone, console.PanelToneSuccess
		active.State, active.Tone = console.PanelStepDone, console.PanelToneSuccess
	}
	return console.NormalizePanelSteps([]console.PanelUIStep{prepared, verified, active})
}

// dataNextStepLabel names the lifecycle step a scenario waits on.
func dataNextStepLabel(status string) string {
	switch status {
	case "not_prepared":
		return "Prepare"
	case "prepared", "stale_verification", "verification_failed":
		return "Verify"
	case "verified":
		return "Activate"
	default:
		return ""
	}
}

// DataOperationRecord projects one operation; its revision is the operation's.
func DataOperationRecord(operation admindata.Operation) console.Record {
	return DataOperationViewRecord(DataOperationView{Operation: operation})
}

// DataOperationViewRecord projects one operation with its presentation.
func DataOperationViewRecord(view DataOperationView) console.Record {
	operation := view.Operation
	return console.Record{
		Key:      operation.Result.OperationID,
		TargetID: operation.Target.TargetID,
		Revision: operation.Result.Revision,
		Data:     dataOperationRow(view),
	}
}

// DataCheckRecord projects one check row.
func DataCheckRecord(view DataCheckView, revision uint64) console.Record {
	key := dataRecordKey("check", view.VerificationID, view.OperationID, view.Check.ID)
	label := strings.TrimSpace(view.Check.Label)
	if label == "" {
		label = view.Check.ID
	}
	result := dataCheckResult(view)
	source := dataCheckSource(view)
	row := map[string]any{
		"key":             key,
		"check_id":        view.Check.ID,
		"label":           label,
		"status":          view.Check.Status,
		"result":          result,
		"result_tone":     dataCheckTones[result],
		"failed":          result == dataCheckFailed,
		"expected":        dataShortValue(view.Check.Expected),
		"actual":          dataShortValue(view.Check.Actual),
		"evidence_ref":    view.Check.EvidenceRef,
		"source":          source,
		"dry_run":         view.DryRun,
		"operation_id":    view.OperationID,
		"verification_id": view.VerificationID,
		"receipt_id":      view.ReceiptID,
	}
	if view.Scenario.ID != "" {
		row["scenario_label"] = dataScenarioTitle(view.ScenarioTitle, view.Scenario)
		row["context"] = source + dataContextSuffix(view.ReceiptID, view.OperationID)
	} else {
		row["context"] = source + dataContextSuffix(view.ReceiptID, view.OperationID)
	}
	return console.Record{Key: key, Revision: revision, Data: row}
}

// dataContextSuffix names the receipt or operation a check belongs to, shortened.
func dataContextSuffix(receiptID, operationID string) string {
	switch {
	case receiptID != "":
		return " · receipt " + dataShortID(receiptID)
	case operationID != "":
		return " · operation " + dataShortID(operationID)
	}
	return ""
}

// DataCoverageRecord projects one coverage period row.
func DataCoverageRecord(view DataCoverageView, revision uint64) console.Record {
	sample := view.Coverage.Sample
	key := dataRecordKey("coverage", view.VerificationID, sample.LocalDay, sample.Timezone)
	label, ok := dataCoverageLabels[view.Coverage.Status]
	if !ok {
		label = view.Coverage.Status
	}
	row := map[string]any{
		"key":             key,
		"local_day":       sample.LocalDay,
		"timezone":        sample.Timezone,
		"status":          view.Coverage.Status,
		"coverage":        label,
		"coverage_tone":   dataCoverageTones[view.Coverage.Status],
		"evidence_ref":    sample.EvidenceRef,
		"verification_id": view.VerificationID,
		"receipt_id":      view.ReceiptID,
	}
	if view.ReceiptID != "" {
		row["receipt_short"] = "receipt " + dataShortID(view.ReceiptID)
	}
	if view.Scenario.ID != "" {
		row["scenario_label"] = dataScenarioTitle(view.ScenarioTitle, view.Scenario)
	}
	return console.Record{Key: key, Revision: revision, Data: row}
}

const (
	dataOriginSynthetic = "Synthetic"
	dataOriginSource    = "Source-backed"

	dataCheckPassed      = "Passed"
	dataCheckFailed      = "Failed"
	dataCheckPlanned     = "Planned, not executed"
	dataCheckUnavailable = "Unavailable"

	dataSourceValidation   = "Validation"
	dataSourceVerification = "Verification"
	dataSourcePlan         = "Dry-run plan"
)

var dataCheckTones = map[string]string{
	dataCheckPassed:      console.PanelToneSuccess,
	dataCheckFailed:      console.PanelToneError,
	dataCheckPlanned:     console.PanelTonePlanned,
	dataCheckUnavailable: console.PanelToneNeutral,
}

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

// Scenario statuses keep preparation, verification and activation distinct;
// the tone and lifecycle steps carry what the old "— not active" suffix said.
var dataScenarioStatusLabels = map[string]string{
	"active":              "Active",
	"verified":            "Verified",
	"stale_verification":  "Changed since verification",
	"verification_failed": "Verification failed",
	"prepared":            "Prepared",
	"not_prepared":        "Not prepared",
}

var dataScenarioStatusTones = map[string]string{
	"active":              console.PanelToneSuccess,
	"verified":            console.PanelToneInfo,
	"stale_verification":  console.PanelToneWarning,
	"verification_failed": console.PanelToneError,
	"prepared":            console.PanelToneNeutral,
	"not_prepared":        console.PanelToneNeutral,
}

var dataTargetStatusLabels = map[string]string{
	"recovery_required": "Recovery required",
	"switching":         "Switching",
	"inactive":          "No active dataset",
	"active":            "Active",
	"not_ready":         "Active, not ready",
}

var dataTargetStatusTones = map[string]string{
	"recovery_required": console.PanelToneError,
	"switching":         console.PanelToneWarning,
	"inactive":          console.PanelToneNeutral,
	"active":            console.PanelToneSuccess,
	"not_ready":         console.PanelToneWarning,
}

var dataCoverageOrder = []string{"covered", admindata.CoveredEmpty, admindata.Partial, admindata.Uncovered, admindata.PolicySuppressed, admindata.Unavailable}

var dataCoverageLabels = map[string]string{
	"covered":                  "Covered",
	admindata.CoveredEmpty:     "Covered, no records",
	admindata.Partial:          "Partially covered",
	admindata.Uncovered:        "Not covered",
	admindata.PolicySuppressed: "Suppressed by policy",
	admindata.Unavailable:      "Unavailable",
}

var dataCoverageTones = map[string]string{
	"covered":                  console.PanelToneSuccess,
	admindata.CoveredEmpty:     console.PanelToneInfo,
	admindata.Partial:          console.PanelToneWarning,
	admindata.Uncovered:        console.PanelToneWarning,
	admindata.PolicySuppressed: console.PanelToneNeutral,
	admindata.Unavailable:      console.PanelToneNeutral,
}

// dataFailureOutcomes present safe failure codes; unknown codes read as a
// provider failure, matching data.ErrorCode.
var dataFailureOutcomes = map[string]string{
	admindata.CodeInvalid:     "Failed: invalid request",
	admindata.CodeDenied:      "Failed: denied",
	admindata.CodeConflict:    "Failed: request reused with different input",
	admindata.CodeBusy:        "Failed: target busy",
	admindata.CodeStale:       "Failed: active dataset changed",
	admindata.CodeUnavailable: "Failed: unavailable",
	admindata.CodeCanceled:    "Canceled",
	admindata.CodeRecovery:    "Recovery required",
	admindata.CodeLeaseLost:   "Stopped: lease lost",
	admindata.CodeGone:        "Failed: no longer available",
	admindata.CodeProvider:    "Failed: provider error",
}

var dataFailureTones = map[string]string{
	admindata.CodeCanceled: console.PanelToneNeutral,
	admindata.CodeRecovery: console.PanelToneWarning,
	admindata.CodeBusy:     console.PanelToneWarning,
}

var dataStateLabels = map[admindata.State]string{
	admindata.Queued:    "Queued",
	admindata.Running:   "Running",
	admindata.Succeeded: "Succeeded",
	admindata.Failed:    "Failed",
	admindata.Canceled:  "Canceled",
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
		"status_tone":  dataTargetStatusTones[status],
		"generation":   activation.Generation,
		"ready":        activation.Ready,
		"receipt_id":   activation.ReceiptID,
		"title":        "No active dataset",
		"subtitle":     "Prepare and verify a scenario, then activate it.",
	}
	if receipt := target.Receipt; receipt != nil && receipt.ID != "" && receipt.ID == activation.ReceiptID {
		row["dataset_label"] = dataDatasetTitle(target.DatasetTitle, receipt.Dataset)
		row["scenario_label"] = dataScenarioTitle(target.ScenarioTitle, receipt.Scenario)
		row["title"] = row["scenario_label"]
		row["subtitle"] = dataText(row["dataset_label"]) + " · " + dataScenarioLabel(receipt.Scenario)
	} else if activation.ReceiptID != "" {
		row["title"] = "Active dataset"
		row["subtitle"] = "Receipt " + dataShortID(activation.ReceiptID)
	}
	switch status {
	case "recovery_required":
		row["note"] = "Writes are paused until recovery completes."
	case "switching":
		row["note"] = "An activation is in progress."
	case "not_ready":
		row["note"] = "The activation committed; the target is not ready yet."
	}
	if refs := console.NormalizePanelActionRefs(target.Actions); len(refs) > 0 {
		row["actions"] = refs
	}
	dataExploreActive(row, target)
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
			"reason":       dataCapabilityReason(capability.Capability),
		})
	}
	return rows
}

// dataCapabilityReasons translate the service's capability codes. Provider
// reasons are already sentences and pass through.
var dataCapabilityReasons = map[string]string{
	"durable_write_gate":       "Writes are disabled on this installation.",
	"generation_unavailable":   "This provider cannot generate datasets.",
	"safe_reset_unavailable":   "This target has no safe reset.",
	"cancellation_unavailable": "This target cannot cancel running work.",
}

// dataCapabilityReason is the human explanation of an unavailable capability.
func dataCapabilityReason(capability admindata.Capability) string {
	reason := strings.TrimSpace(capability.Reason)
	if translated, ok := dataCapabilityReasons[reason]; ok {
		return translated
	}
	if reason == "" && !capability.Supported {
		return "Not supported by this provider or target."
	}
	if reason == "" && !capability.Permitted {
		return "You do not have permission to run this action."
	}
	return reason
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

func dataOperationRow(view DataOperationView) map[string]any {
	operation := view.Operation
	result := operation.Result
	outcome, tone := dataOperationOutcome(operation)
	scenarioTitle := ""
	if operation.Input.Scenario.ID != "" {
		scenarioTitle = dataScenarioTitle(view.ScenarioTitle, operation.Input.Scenario)
	}
	row := map[string]any{
		"key":              result.OperationID,
		"operation_id":     result.OperationID,
		"short_id":         dataShortID(result.OperationID),
		"kind":             string(result.Kind),
		"action":           dataKindLabel(result.Kind),
		"title":            dataOperationTitle(result.Kind, scenarioTitle),
		"subtitle":         dataOperationSubtitle(view),
		"state":            string(result.State),
		"state_label":      dataStateLabels[result.State],
		"phase":            result.Phase,
		"revision":         result.Revision,
		"outcome":          outcome,
		"outcome_tone":     tone,
		"attention":        result.State == admindata.Failed || result.State == admindata.Running || result.State == admindata.Queued,
		"attention_tone":   dataAttentionTone(result.State),
		"dry_run":          result.DryRun,
		"active":           result.Active,
		"cancel_requested": operation.CancelRequested,
		"target_id":        operation.Target.TargetID,
		"progress":         dataProgressLabel(result.Progress),
	}
	if progress := dataProgressValue(result); progress != nil {
		row["progress_bar"] = progress
	}
	if label := dataDatasetLabel(operation.Input.Dataset); label != "" {
		row["dataset_label"] = dataDatasetTitle(view.DatasetTitle, operation.Input.Dataset)
		row["dataset_ref"] = label
	}
	if scenarioTitle != "" {
		row["scenario_label"] = scenarioTitle
		row["scenario_ref"] = dataScenarioLabel(operation.Input.Scenario)
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
	if refs := console.NormalizePanelActionRefs(view.Actions); len(refs) > 0 {
		row["actions"] = refs
	}
	return row
}

func dataAttentionTone(state admindata.State) string {
	switch state {
	case admindata.Failed:
		return console.PanelToneError
	case admindata.Running, admindata.Queued:
		return console.PanelToneInfo
	default:
		return ""
	}
}

// dataOperationTitle names an operation by what it does to whom: "Prepare Ready".
func dataOperationTitle(kind admindata.Kind, scenarioTitle string) string {
	label := dataKindLabel(kind)
	switch kind {
	case admindata.Cancel:
		label = "Cancellation"
	case admindata.Recover:
		label = "Recovery"
	}
	if scenarioTitle == "" || kind == admindata.Cancel || kind == admindata.Recover {
		return label
	}
	return label + " " + scenarioTitle
}

func dataOperationSubtitle(view DataOperationView) string {
	parts := []string{}
	if view.Operation.Input.Dataset.ID != "" {
		parts = append(parts, dataDatasetTitle(view.DatasetTitle, view.Operation.Input.Dataset))
	}
	if target := view.Operation.Target.TargetID; target != "" {
		parts = append(parts, target)
	}
	if view.Operation.Result.DryRun {
		parts = append(parts, "dry run")
	}
	return strings.Join(parts, " · ")
}

// dataProgressValue is the bounded progress of a running operation, or nil.
func dataProgressValue(result admindata.Result) map[string]any {
	progress := result.Progress
	if result.State != admindata.Running || (progress.Total == 0 && progress.Completed == 0 && progress.Stage == "") {
		return nil
	}
	value := map[string]any{"completed": progress.Completed, "total": progress.Total}
	if label := dataProgressLabel(progress); label != "" {
		value["label"] = label
	}
	return value
}

// dataOperationOutcome keeps transport acceptance, preparation, verification
// and activation distinct; only an activation reports an active dataset. The
// tone is server-computed so planned work never looks executed.
func dataOperationOutcome(operation admindata.Operation) (string, string) {
	result := operation.Result
	if result.Failure != nil && result.State != admindata.Succeeded {
		return dataFailureOutcome(result.Failure.Code)
	}
	switch result.State {
	case admindata.Queued:
		if result.DryRun {
			return "Plan queued", console.PanelTonePlanned
		}
		return "Queued", console.PanelToneNeutral
	case admindata.Running:
		return dataRunningOutcome(operation)
	case admindata.Succeeded:
		return dataSucceededOutcome(result)
	case admindata.Canceled:
		return "Canceled", console.PanelToneNeutral
	case admindata.Failed:
		return dataFailureOutcomes[admindata.CodeProvider], console.PanelToneError
	default:
		return "Unknown", console.PanelToneNeutral
	}
}

// dataFailureOutcome labels a safe failure code with its tone.
func dataFailureOutcome(code string) (string, string) {
	outcome, ok := dataFailureOutcomes[code]
	if !ok {
		return dataFailureOutcomes[admindata.CodeProvider], console.PanelToneError
	}
	if tone, ok := dataFailureTones[code]; ok {
		return outcome, tone
	}
	return outcome, console.PanelToneError
}

// dataRunningOutcome names what a running operation is doing right now.
func dataRunningOutcome(operation admindata.Operation) (string, string) {
	result := operation.Result
	switch {
	case result.Phase == "recovering":
		return "Recovering, writes paused", console.PanelToneWarning
	case operation.CancelRequested || result.Phase == "cancel_requested":
		return "Cancel requested", console.PanelToneWarning
	case result.DryRun:
		return "Planning", console.PanelTonePlanned
	case result.Phase != "" && result.Phase != "accepted" && result.Phase != string(admindata.Running):
		return "Running · " + result.Phase, console.PanelToneInfo
	default:
		return "Running", console.PanelToneInfo
	}
}

func dataSucceededOutcome(result admindata.Result) (string, string) {
	if result.DryRun {
		return "Plan ready, nothing changed", console.PanelTonePlanned
	}
	switch result.Kind {
	case admindata.Validate:
		if slices.ContainsFunc(result.Checks, func(check admindata.Check) bool { return check.Status != admindata.CheckPassed }) {
			return "Validation found problems", console.PanelToneWarning
		}
		return "Validated", console.PanelToneSuccess
	case admindata.Prepare, admindata.Refresh:
		return "Prepared", console.PanelToneInfo
	case admindata.Verify:
		switch {
		case result.Verification == nil:
			return "Verification finished", console.PanelToneNeutral
		case result.Verification.Passed():
			return "Verified", console.PanelToneSuccess
		default:
			return "Verification failed", console.PanelToneError
		}
	case admindata.Activate:
		return dataActivationOutcome(result)
	case admindata.Reset:
		return "Reset complete", console.PanelToneSuccess
	case admindata.Generate:
		return "Generated", console.PanelToneInfo
	case admindata.Cancel:
		return "Cancellation recorded", console.PanelToneNeutral
	default:
		return "Succeeded", console.PanelToneSuccess
	}
}

func dataActivationOutcome(result admindata.Result) (string, string) {
	if result.Active && result.Activation != nil && result.Activation.Ready {
		return "Active · generation " + strconv.FormatUint(result.Activation.Generation, 10), console.PanelToneSuccess
	}
	return "Activation committed, not ready", console.PanelToneWarning
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

// dataDatasetLabel is the technical dataset reference: provider/id vN.
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

// dataDatasetTitle prefers the declared title and falls back to the reference.
func dataDatasetTitle(title string, ref admindata.DatasetRef) string {
	if title = strings.TrimSpace(title); title != "" {
		return title
	}
	return dataDatasetLabel(ref)
}

// dataScenarioLabel is the technical scenario reference: id vN.
func dataScenarioLabel(ref admindata.ScenarioRef) string {
	if ref.ID == "" {
		return ""
	}
	if ref.Version == "" {
		return ref.ID
	}
	return ref.ID + " v" + ref.Version
}

// dataScenarioTitle prefers the declared title and falls back to the reference.
func dataScenarioTitle(title string, ref admindata.ScenarioRef) string {
	if title = strings.TrimSpace(title); title != "" {
		return title
	}
	return dataScenarioLabel(ref)
}

func dataShortDigest(digest string) string {
	if len(digest) > 12 {
		return digest[:12]
	}
	return digest
}

// dataShortID shortens a long identifier for prose; the row keeps the full
// ID. It prefers the first run of hex digits (the distinctive part of
// "receipt-1071a4f9-…" or a UUID) over a shared word prefix.
func dataShortID(id string) string {
	if len(id) <= 12 {
		return id
	}
	run := 0
	for index, ch := range id {
		if (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F') {
			run++
			if run == 8 {
				return id[index-7:index+1] + "…"
			}
			continue
		}
		run = 0
	}
	return id[:8] + "…"
}

// dataShortValue shortens hex digests inside check values; other text passes through.
func dataShortValue(value string) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) < 32 {
		return value
	}
	for _, ch := range trimmed {
		if (ch < '0' || ch > '9') && (ch < 'a' || ch > 'f') && (ch < 'A' || ch > 'F') {
			return value
		}
	}
	return trimmed[:12] + "…"
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

// dataCountsLabel reads "3 orders, 120 people".
func dataCountsLabel(counts map[string]uint64) string {
	entries := make([]string, 0, len(counts))
	for _, name := range slices.Sorted(maps.Keys(counts)) {
		entries = append(entries, strconv.FormatUint(counts[name], 10)+" "+name)
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

func dataText(value any) string {
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return text
}
