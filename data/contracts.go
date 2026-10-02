package data

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io/fs"
	"sort"
	"strings"
	"time"

	gerrors "github.com/goliatone/go-errors"
)

// WireVersion freezes the lifecycle wire contract independently of host routes.
const WireVersion = "v1"
const MaxWireCounter uint64 = 1<<53 - 1

type Kind string

const (
	Validate Kind = "validate"
	Prepare  Kind = "prepare"
	Refresh  Kind = "refresh"
	Verify   Kind = "verify"
	Activate Kind = "activate"
	Reset    Kind = "reset"
	Generate Kind = "generate"
	Cancel   Kind = "cancel"
)

func (k Kind) CommandID() string { return "admin.data." + string(k) + ".v1" }
func (k Kind) Valid() bool {
	switch k {
	case Validate, Prepare, Refresh, Verify, Activate, Reset, Generate, Cancel:
		return true
	}
	return false
}
func (k Kind) Writes() bool { return k != Validate && k != Cancel }

type State string

const (
	Queued    State = "queued"
	Running   State = "running"
	Succeeded State = "succeeded"
	Failed    State = "failed"
	Canceled  State = "canceled"
)

func (s State) Terminal() bool { return s == Succeeded || s == Failed || s == Canceled }

// Failure contains only safe codes; provider errors are never serialized verbatim.
type Failure struct {
	Code   string            `json:"code"`
	Fields map[string]string `json:"fields,omitempty"`
}

const (
	CodeInvalid     = "invalid_input"
	CodeDenied      = "denied"
	CodeConflict    = "fingerprint_conflict"
	CodeBusy        = "busy"
	CodeStale       = "stale_generation"
	CodeUnavailable = "unavailable"
	CodeCanceled    = "canceled"
	CodeRecovery    = "recovery_required"
	CodeLeaseLost   = "lease_lost"
	CodeGone        = "gone"
	CodeProvider    = "provider_failed"
)

func Error(code string) error {
	category, status := gerrors.CategoryOperation, 500
	switch code {
	case CodeInvalid:
		category, status = gerrors.CategoryBadInput, 400
	case CodeDenied:
		category, status = gerrors.CategoryAuthz, 403
	case CodeConflict, CodeBusy, CodeStale, CodeLeaseLost, CodeRecovery:
		category, status = gerrors.CategoryConflict, 409
	case CodeUnavailable:
		status = 503
	case CodeGone:
		status = 404
	}
	return gerrors.New("data operation "+code, category).WithTextCode(code).WithCode(status)
}
func ErrorCode(err error) string {
	for err != nil {
		if structured, ok := errors.AsType[*gerrors.Error](err); ok {
			switch structured.TextCode {
			case CodeInvalid, CodeDenied, CodeConflict, CodeBusy, CodeStale, CodeUnavailable, CodeCanceled, CodeRecovery, CodeLeaseLost, CodeGone:
				return structured.TextCode
			}
		}
		if joined, ok := err.(interface{ Unwrap() []error }); ok {
			for _, cause := range joined.Unwrap() {
				if code := ErrorCode(cause); code != CodeProvider {
					return code
				}
			}
			return CodeProvider
		}
		err = errors.Unwrap(err)
	}
	return CodeProvider
}

type DatasetRef struct {
	Provider string `json:"provider"`
	ID       string `json:"id"`
	Version  string `json:"version"`
	Digest   string `json:"digest"`
}

func (r DatasetRef) Valid() bool {
	return identifier(r.Provider) && identifier(r.ID) && identifier(r.Version) && digestValid(r.Digest)
}

type ScenarioRef struct {
	Dataset     DatasetRef `json:"dataset"`
	ID          string     `json:"id"`
	Version     string     `json:"version"`
	ProfileHash string     `json:"profile_hash"`
}

func (r ScenarioRef) Valid() bool {
	return r.Dataset.Valid() && identifier(r.ID) && identifier(r.Version) && digestValid(r.ProfileHash)
}

type Component struct {
	Path   string `json:"path"`
	Digest string `json:"digest"`
}
type SamplePeriod struct {
	LocalDay    string `json:"local_day"`
	Timezone    string `json:"timezone"`
	EvidenceRef string `json:"evidence_ref"`
}
type Descriptor struct {
	Dataset               DatasetRef          `json:"dataset"`
	Components            []Component         `json:"components"`
	SourceContractHash    string              `json:"source_contract_hash"`
	SourceContractVersion string              `json:"source_contract_version"`
	PolicyHash            string              `json:"policy_hash"`
	AudienceHashes        map[string]string   `json:"audience_hashes"`
	Attribution           []string            `json:"attribution"`
	Timezone              string              `json:"timezone"`
	Samples               []SamplePeriod      `json:"samples"`
	GeneratorVersion      string              `json:"generator_version,omitempty"`
	Seed                  string              `json:"seed,omitempty"`
	GeneratorOptions      map[string]string   `json:"generator_options,omitempty"`
	Synthetic             bool                `json:"synthetic"`
	Counts                map[string]uint64   `json:"counts"`
	Prerequisites         []string            `json:"prerequisites"`
	Scenarios             []ScenarioRef       `json:"scenarios"`
	Capabilities          map[Kind]Capability `json:"capabilities"`
}

// CompositeDigest canonicalizes path order and JSON map keys. Digest, scenario
// back-references and current permission/capability discovery are excluded.
// Counts, evidence, samples and source/policy/generator metadata remain bound.
func (d Descriptor) CompositeDigest() (string, error) {
	if !identifier(d.Dataset.Provider) || !identifier(d.Dataset.ID) || !identifier(d.Dataset.Version) || !digestValid(d.SourceContractHash) || !digestValid(d.PolicyHash) || d.SourceContractVersion == "" {
		return "", Error(CodeInvalid)
	}
	copyComponents, err := canonicalComponents(d.Components)
	if err != nil {
		return "", err
	}
	for _, v := range d.AudienceHashes {
		if !digestValid(v) {
			return "", Error(CodeInvalid)
		}
	}
	d.Components = copyComponents
	d.Dataset.Digest = ""
	d.Capabilities = nil
	d.Scenarios = append([]ScenarioRef(nil), d.Scenarios...)
	sort.Slice(d.Scenarios, func(i, j int) bool {
		if d.Scenarios[i].ID == d.Scenarios[j].ID {
			return d.Scenarios[i].Version < d.Scenarios[j].Version
		}
		return d.Scenarios[i].ID < d.Scenarios[j].ID
	})
	for i := range d.Scenarios {
		d.Scenarios[i].Dataset.Digest = ""
	}
	return hashJSON(d)
}
func canonicalComponents(components []Component) ([]Component, error) {
	copyComponents := append([]Component(nil), components...)
	sort.Slice(copyComponents, func(i, j int) bool { return copyComponents[i].Path < copyComponents[j].Path })
	for i, c := range copyComponents {
		if !fs.ValidPath(c.Path) || c.Path == "." || strings.Contains(c.Path, "\\") || !digestValid(c.Digest) || (i > 0 && copyComponents[i-1].Path == c.Path) {
			return nil, Error(CodeInvalid)
		}
	}
	return copyComponents, nil
}

func (d Descriptor) ValidateIdentity() error {
	got, err := d.CompositeDigest()
	if err != nil {
		return err
	}
	if !d.Dataset.Valid() || got != d.Dataset.Digest {
		return Error(CodeConflict)
	}
	for _, s := range d.Scenarios {
		if !s.Valid() || s.Dataset != d.Dataset {
			return Error(CodeInvalid)
		}
	}
	return nil
}

type Capability struct {
	Supported bool   `json:"supported"`
	Permitted bool   `json:"permitted"`
	Reason    string `json:"reason,omitempty"`
}
type Check struct {
	ID          string `json:"id"`
	Status      string `json:"status"`
	Expected    string `json:"expected,omitempty"`
	Actual      string `json:"actual,omitempty"`
	EvidenceRef string `json:"evidence_ref,omitempty"`
}

const (
	CheckPassed      = "passed"
	CheckFailed      = "failed"
	CheckPlanned     = "planned"
	CheckUnavailable = "unavailable"
)

type Coverage struct {
	Status string       `json:"status"`
	Sample SamplePeriod `json:"sample"`
}

const (
	CoveredEmpty     = "covered_empty"
	Uncovered        = "uncovered"
	Partial          = "partial"
	PolicySuppressed = "policy_suppressed"
	Unavailable      = "unavailable"
)

// Input is shared by UI, CLI, jobs and schedules. It deliberately has no actor,
// scope, principal, filesystem or credential fields. Zero generation is meaningful.
type Input struct {
	Dataset            DatasetRef  `json:"dataset"`
	Scenario           ScenarioRef `json:"scenario"`
	TargetID           string      `json:"target_id"`
	IdempotencyKey     string      `json:"idempotency_key"`
	ReceiptID          string      `json:"receipt_id,omitempty"`
	ExpectedGeneration *uint64     `json:"expected_generation,omitempty"`
	OperationID        string      `json:"operation_id,omitempty"`
	DryRun             bool        `json:"dry_run"`
	BatchLimit         int         `json:"batch_limit"`
	PageLimit          int         `json:"page_limit"`
	TimeoutSeconds     int         `json:"timeout_seconds"`
}

func (in Input) Normalize() Input {
	if in.BatchLimit == 0 {
		in.BatchLimit = 100
	}
	if in.PageLimit == 0 {
		in.PageLimit = 10
	}
	if in.TimeoutSeconds == 0 {
		in.TimeoutSeconds = 60
	}
	return in
}
func (in Input) Validate(k Kind) error {
	in = in.Normalize()
	if in.ExpectedGeneration != nil && *in.ExpectedGeneration > MaxWireCounter {
		return Error(CodeInvalid)
	}
	if !k.Valid() || !in.validBounds() {
		return Error(CodeInvalid)
	}
	if k == Cancel {
		if !identifier(in.OperationID) || in.DryRun {
			return Error(CodeInvalid)
		}
		return nil
	}
	if !in.Dataset.Valid() || !in.Scenario.Valid() || in.Scenario.Dataset != in.Dataset {
		return Error(CodeInvalid)
	}
	return in.validateOperationFields(k)
}

func (in Input) validBounds() bool {
	return identifier(in.TargetID) && identifier(in.IdempotencyKey) &&
		in.BatchLimit >= 1 && in.BatchLimit <= 10000 &&
		in.PageLimit >= 1 && in.PageLimit <= 1000 &&
		in.TimeoutSeconds >= 1 && in.TimeoutSeconds <= 3600
}

func (in Input) validateOperationFields(k Kind) error {
	requiresReceipt := k == Activate || k == Verify
	if requiresReceipt && !identifier(in.ReceiptID) || !requiresReceipt && in.ReceiptID != "" {
		return Error(CodeInvalid)
	}
	requiresGeneration := k == Activate || k == Reset
	if requiresGeneration != (in.ExpectedGeneration != nil) || in.OperationID != "" {
		return Error(CodeInvalid)
	}
	return nil
}
func (in Input) Fingerprint(k Kind) (string, error) {
	if err := in.Validate(k); err != nil {
		return "", err
	}
	return hashJSON(struct {
		Kind  Kind  `json:"kind"`
		Input Input `json:"input"`
	}{k, in.Normalize()})
}
func hashJSON(value any) (string, error) {
	b, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:]), nil
}
func digestValid(v string) bool {
	if len(v) != 64 || strings.ToLower(v) != v {
		return false
	}
	_, err := hex.DecodeString(v)
	return err == nil
}
func identifier(v string) bool {
	return v != "" && len(v) <= 256 && strings.TrimSpace(v) == v && !strings.ContainsAny(v, "\x00\r\n")
}

// Principal is supplied by a host resolver consulting current trusted state.
// It is not embedded in Input or accepted from JSON.
type Principal struct {
	ActorID        string `json:"actor_id"`
	ScopeKey       string `json:"scope_key"`
	ExecutionID    string `json:"execution_id"`
	CorrelationID  string `json:"correlation_id,omitempty"`
	ModuleHash     string `json:"module_hash"`
	PolicyHash     string `json:"policy_hash"`
	PermissionHash string `json:"permission_hash"`
}

func (p Principal) Valid() bool {
	return identifier(p.ActorID) && identifier(p.ScopeKey) && identifier(p.ExecutionID) && digestValid(p.ModuleHash) && digestValid(p.PolicyHash) && digestValid(p.PermissionHash)
}

type TargetKey struct {
	ScopeKey string `json:"scope_key"`
	TargetID string `json:"target_id"`
}
type PreparationReceipt struct {
	ID                string              `json:"id"`
	Target            TargetKey           `json:"target"`
	StageID           string              `json:"stage_id"`
	Dataset           DatasetRef          `json:"dataset"`
	Scenario          ScenarioRef         `json:"scenario"`
	ModuleHash        string              `json:"module_hash"`
	PolicyHash        string              `json:"policy_hash"`
	PermissionHash    string              `json:"permission_hash"`
	ContentRevision   uint64              `json:"content_revision"`
	SourceCheckpoint  string              `json:"source_checkpoint"`
	DerivedCheckpoint string              `json:"derived_checkpoint"`
	RequesterID       string              `json:"requester_id"`
	Verification      *VerificationResult `json:"verification,omitempty"`
}
type VerificationResult struct {
	ID              string        `json:"id"`
	ContentRevision uint64        `json:"content_revision"`
	Checks          []Check       `json:"checks"`
	Coverage        []Coverage    `json:"coverage"`
	Artifacts       []ArtifactRef `json:"artifacts,omitempty"`
}

func (v VerificationResult) Passed() bool {
	if v.ID == "" || v.ContentRevision == 0 || len(v.Checks) == 0 {
		return false
	}
	for _, c := range v.Checks {
		if c.ID == "" || c.Status != CheckPassed {
			return false
		}
	}
	return true
}

type ArtifactRef struct {
	Provider    string    `json:"provider"`
	ID          string    `json:"id"`
	Target      TargetKey `json:"target"`
	Generation  uint64    `json:"generation"`
	RequesterID string    `json:"requester_id"`
	ExpiresAt   time.Time `json:"expires_at"`
}
type Activation struct {
	ReceiptID  string `json:"receipt_id,omitempty"`
	Generation uint64 `json:"generation"`
	Ready      bool   `json:"ready"`
}
type Progress struct {
	Stage     string `json:"stage"`
	Completed uint64 `json:"completed"`
	Total     uint64 `json:"total"`
}
type Result struct {
	OperationID  string              `json:"operation_id"`
	Kind         Kind                `json:"kind"`
	State        State               `json:"state"`
	Revision     uint64              `json:"revision"`
	Phase        string              `json:"phase"`
	DryRun       bool                `json:"dry_run"`
	Active       bool                `json:"active"`
	Receipt      *PreparationReceipt `json:"receipt,omitempty"`
	Verification *VerificationResult `json:"verification,omitempty"`
	Activation   *Activation         `json:"activation,omitempty"`
	Checks       []Check             `json:"checks,omitempty"`
	Progress     Progress            `json:"progress"`
	Dataset      *DatasetRef         `json:"dataset,omitempty"`
	Failure      *Failure            `json:"failure,omitempty"`
}

func (r Result) CommandResultFailure() error {
	if r.Failure != nil {
		return Error(r.Failure.Code)
	}
	return nil
}

// ActiveState is the safe read model; physical intent IDs and fence/delegation
// metadata remain in OperationStore. Transitioning never claims a ready route.
type ActiveState struct {
	Target           TargetKey  `json:"target"`
	Activation       Activation `json:"activation"`
	Transitioning    bool       `json:"transitioning"`
	RecoveryRequired bool       `json:"recovery_required"`
}
