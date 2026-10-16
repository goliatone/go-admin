package data

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"
)

const (
	MaintenanceDisabled         = "disabled"
	MaintenanceDue              = "due"
	MaintenanceReady            = "ready"
	MaintenancePaused           = "paused"
	MaintenancePreparing        = "preparing"
	MaintenanceFailed           = "failed"
	MaintenanceRecoveryRequired = "recovery_required"
)

// MaintenanceIdentity describes a verified time-bound dataset. Anchor and
// timezone are optional provider-owned coverage metadata, never platform clocks.
type MaintenanceIdentity struct {
	Dataset    DatasetRef `json:"dataset"`
	Generation uint64     `json:"generation,omitempty"`
	Anchor     string     `json:"anchor"`
	Timezone   string     `json:"timezone"`
	PreparedAt string     `json:"prepared_at,omitempty"`
}

// MaintenanceRecord stores policy and resumable references; it grants no
// lifecycle lease or activation authority. Keep storage encoding host-owned.
type MaintenanceRecord struct {
	Revision                          uint64
	Enabled                           bool
	Owner, Principal, RecipeDigest    string
	Generation                        uint64
	Active                            *MaintenanceIdentity
	Due, ExpiresAt                    time.Time
	State, Reason, Epoch, EpochPrefix string
	Input                             Input
	Step                              Kind
	OperationID                       string
	Attempts                          int
	FailureWindow                     time.Time
	Failures                          int
	OriginActor, TriggerKey           string
}
type MaintenanceProfile struct {
	Digest    string
	Principal string
	// ReplaceDrift requires host-enforced immutable automatic data. Manual
	// activation generation changes pause regardless of this capability.
	ReplaceDrift bool
}
type MaintenanceObservation struct{ Fresh, Changed bool }

// MaintenanceBackend supplies domain policy and persistence. Acquire serializes
// ALL coordinators for this scope/target, across processes, honors cancellation,
// and releases on process death (e.g. the host's exclusive durable owner lock).
// Configure atomically CASes Revision and fingerprints actor/request replay.
// Save rejects changed/disabled policy revisions. Delegate binds the revision;
// lifecycle BeforeEffects must revalidate it through the host's policy/store.
// Observe and Load are read-only. Plan/Generated/Complete use domain services.
type MaintenanceBackend interface {
	Acquire(context.Context) (func(), error)
	Authorize(context.Context, bool) (Principal, error)
	AuthorizePolicy(context.Context, MaintenanceRecord) error
	Delegate(context.Context, MaintenanceRecord) context.Context
	Load(context.Context) (MaintenanceRecord, TargetState, error)
	Save(context.Context, MaintenanceRecord) error
	Configure(context.Context, Principal, MaintenanceConfigureRequest, MaintenanceRecord) (MaintenanceRecord, error)
	Profile(context.Context) (MaintenanceProfile, error)
	Observe(context.Context, MaintenanceRecord, TargetState) (MaintenanceObservation, error)
	Plan(context.Context, MaintenanceRecord) (Input, error)
	Generated(context.Context, DatasetRef) (ScenarioRef, error)
	Complete(context.Context, MaintenanceRecord, TargetState) (MaintenanceIdentity, time.Time, time.Time, error)
	Prune(context.Context) error
}

type MaintenanceLifecycle interface {
	Run(context.Context, Kind, Input) (Result, error)
	Recover(context.Context, string) (Result, error)
}

type MaintenanceService struct {
	backend   MaintenanceBackend
	lifecycle MaintenanceLifecycle
	now       func() time.Time
}

func NewMaintenanceService(backend MaintenanceBackend, lifecycle MaintenanceLifecycle, now func() time.Time) (*MaintenanceService, error) {
	if backend == nil || lifecycle == nil {
		return nil, Error(CodeInvalid)
	}
	if now == nil {
		now = time.Now
	}
	return &MaintenanceService{backend, lifecycle, now}, nil
}

type MaintenanceResult struct {
	Record MaintenanceRecord `json:"maintenance"`
	Target TargetState       `json:"target"`
	DryRun bool              `json:"dry_run"`
}

func (r MaintenanceResult) CommandResultMetadata() map[string]any {
	return map[string]any{"state": r.Record.State, "policy_revision": r.Record.Revision, "generation": r.Target.Activation.Generation, "dry_run": r.DryRun}
}
func (s *MaintenanceService) Authorize(ctx context.Context, manage bool) error {
	_, err := s.backend.Authorize(ctx, manage)
	return err
}
func (s *MaintenanceService) Status(ctx context.Context) (MaintenanceResult, error) {
	if err := s.Authorize(ctx, false); err != nil {
		return MaintenanceResult{}, err
	}
	r, t, err := s.backend.Load(ctx)
	if err != nil {
		return MaintenanceResult{}, err
	}
	if !r.Enabled {
		return MaintenanceResult{Record: r, Target: t}, nil
	}
	if err = s.backend.AuthorizePolicy(ctx, r); err != nil {
		return MaintenanceResult{}, err
	}
	if t.Activation.Generation != r.Generation {
		r.State = MaintenancePaused
		r.Reason = "A manual activation paused automatic replacement."
	} else if r.State == MaintenanceReady {
		observation, observeErr := s.backend.Observe(ctx, r, t)
		if observeErr != nil {
			return MaintenanceResult{}, observeErr
		}
		if !observation.Fresh || observation.Changed || !r.Due.After(s.now()) {
			r.State = MaintenanceDue
			r.Reason = "The dataset needs renewal."
		}
	}
	return MaintenanceResult{Record: r, Target: t}, nil
}
func (s *MaintenanceService) Configure(ctx context.Context, in MaintenanceConfigureRequest) (MaintenanceResult, error) {
	if e := in.Validate(); e != nil {
		return MaintenanceResult{}, e
	}
	p, e := s.backend.Authorize(ctx, true)
	if e != nil {
		return MaintenanceResult{}, e
	}
	old, t, e := s.backend.Load(ctx)
	if e != nil {
		return MaintenanceResult{}, e
	}
	profile, e := s.backend.Profile(ctx)
	if e != nil {
		return MaintenanceResult{}, e
	}
	if p.ActorID == profile.Principal {
		return MaintenanceResult{}, Error(CodeDenied)
	}
	next := old
	next.Revision++
	next.Enabled = in.Enabled
	next.Owner = p.ActorID
	next.Principal = profile.Principal
	next.RecipeDigest = profile.Digest
	next.Generation = t.Activation.Generation
	next.State = MaintenanceDisabled
	next.Reason = ""
	if in.Enabled {
		next.State = MaintenanceDue
		next.Attempts = 0
		next.Due = time.Time{}
		// An explicit resume changes policy authority, never replays an old epoch.
		// Unfinished platform operations must be recovered before new work instead.
		if old.State != MaintenancePaused && old.State != MaintenanceFailed && old.Active != nil && old.Active.Generation == t.Activation.Generation && old.Due.After(s.now()) {
			next.State = MaintenanceReady
			next.Due = old.Due
		}
		if e = s.backend.AuthorizePolicy(ctx, next); e != nil {
			return MaintenanceResult{}, e
		}
	}
	if in.DryRun {
		if in.ExpectedRevision != old.Revision {
			return MaintenanceResult{}, Error(CodeStale)
		}
		return MaintenanceResult{next, t, true}, nil
	}
	next, e = s.backend.Configure(ctx, p, in, next)
	return MaintenanceResult{next, t, false}, e
}
func (s *MaintenanceService) NextRequest(ctx context.Context, key string) (MaintenanceEnsureRequest, error) {
	r, t, e := s.backend.Load(ctx)
	return MaintenanceEnsureRequest{PolicyRevision: r.Revision, ExpectedGeneration: t.Activation.Generation, RequestKey: key}, e
}
func (s *MaintenanceService) finish(ctx context.Context, r *MaintenanceRecord, t TargetState) error {
	identity, due, expiry, e := s.backend.Complete(ctx, *r, t)
	if e == nil && (!due.After(s.now()) || expiry.Before(due) || !expiry.After(s.now()) || identity.Generation != t.Activation.Generation) {
		e = Error(CodeStale)
	}
	if e != nil {
		// Physical activation is already platform authority. If its data expired
		// across a clock boundary, reconcile that generation and schedule NEW work;
		// repeatedly completing the same old receipt cannot restore freshness.
		if t.Activation.Ready && r.Input.ReceiptID != "" && t.Activation.ReceiptID == r.Input.ReceiptID {
			r.Generation = t.Activation.Generation
			r.Active = nil
			r.Epoch = ""
			r.Step = ""
			r.OperationID = ""
			r.State = MaintenanceFailed
			r.Reason = "Activated data is not currently fresh; another renewal is scheduled."
			r.Attempts++
			r.Due = s.now().Add(maintenanceBackoff(r.Attempts))
			if saveErr := s.backend.Save(ctx, *r); saveErr != nil {
				return saveErr
			}
		}
		return e
	}
	r.Generation = t.Activation.Generation
	r.Active = &identity
	r.Due = due
	r.ExpiresAt = expiry
	r.State = MaintenanceReady
	r.Reason = ""
	r.Epoch = ""
	r.Step = ""
	r.OperationID = ""
	r.Attempts = 0
	if e = s.backend.Save(ctx, *r); e != nil {
		return e
	}
	return s.backend.Prune(ctx)
}
func (s *MaintenanceService) Ensure(ctx context.Context, in MaintenanceEnsureRequest) (MaintenanceResult, error) {
	if err := in.Validate(); err != nil {
		return MaintenanceResult{}, err
	}
	caller, err := s.backend.Authorize(ctx, true)
	if err != nil {
		return MaintenanceResult{}, err
	}
	release, err := s.backend.Acquire(ctx)
	if err != nil {
		return MaintenanceResult{}, err
	}
	defer release()
	r, target, err := s.backend.Load(ctx)
	if err != nil {
		return MaintenanceResult{}, err
	}
	if r.Revision != in.PolicyRevision {
		return MaintenanceResult{}, Error(CodeStale)
	}
	if !r.Enabled {
		return MaintenanceResult{r, target, in.DryRun}, nil
	}
	if err = s.backend.AuthorizePolicy(ctx, r); err != nil {
		return MaintenanceResult{}, err
	}
	profile, err := s.backend.Profile(ctx)
	if err != nil {
		return MaintenanceResult{}, err
	}
	return s.ensureMaintenanceProfile(ctx, in, caller, profile, r, target)
}

func (s *MaintenanceService) ensureMaintenanceProfile(ctx context.Context, in MaintenanceEnsureRequest, caller Principal, profile MaintenanceProfile, r MaintenanceRecord, target TargetState) (MaintenanceResult, error) {
	result := func() MaintenanceResult { return MaintenanceResult{r, target, in.DryRun} }
	if profile.Digest != r.RecipeDigest {
		r.State = MaintenancePaused
		r.Reason = "The installed maintenance profile changed; explicitly resume to authorize it."
		if err := s.saveMaintenanceUnlessDryRun(ctx, r, in.DryRun); err != nil {
			return MaintenanceResult{}, err
		}
		return result(), Error(CodeStale)
	}
	if r.Step == Activate && r.Input.ReceiptID != "" && target.Activation.ReceiptID == r.Input.ReceiptID && target.Activation.Ready {
		if in.DryRun {
			return result(), nil
		}
		err := s.finish(ctx, &r, target)
		return result(), err
	}
	if target.Activation.Generation != r.Generation {
		r.State = MaintenancePaused
		r.Reason = "A manual activation paused automatic replacement."
		err := s.saveMaintenanceUnlessDryRun(ctx, r, in.DryRun)
		return result(), err
	}
	if in.ExpectedGeneration != target.Activation.Generation {
		return MaintenanceResult{}, Error(CodeStale)
	}
	return s.ensureMaintenanceFreshness(ctx, in, caller, profile, r, target)
}

func (s *MaintenanceService) saveMaintenanceUnlessDryRun(ctx context.Context, r MaintenanceRecord, dryRun bool) error {
	if dryRun {
		return nil
	}
	return s.backend.Save(ctx, r)
}

func (s *MaintenanceService) ensureMaintenanceFreshness(ctx context.Context, in MaintenanceEnsureRequest, caller Principal, profile MaintenanceProfile, r MaintenanceRecord, target TargetState) (MaintenanceResult, error) {
	result := func() MaintenanceResult { return MaintenanceResult{r, target, in.DryRun} }
	if r.State == MaintenancePaused && !profile.ReplaceDrift {
		return result(), nil
	}
	stop, err := s.observeMaintenance(ctx, &r, target, profile, in.DryRun)
	if stop {
		return result(), err
	}
	if err != nil {
		return MaintenanceResult{}, err
	}
	if r.State == MaintenanceFailed && r.Due.After(s.now()) {
		return result(), nil
	}
	if in.DryRun {
		r.State = MaintenanceDue
		return result(), nil
	}
	if r.Epoch == "" {
		if err = s.startMaintenanceEpoch(ctx, &r, caller, in.RequestKey); err != nil {
			return MaintenanceResult{}, err
		}
	}
	err = s.runMaintenance(ctx, &r, &target)
	return result(), err
}

func (s *MaintenanceService) observeMaintenance(ctx context.Context, r *MaintenanceRecord, target TargetState, profile MaintenanceProfile, dryRun bool) (bool, error) {
	if r.Epoch != "" || r.Active == nil || (r.State == MaintenanceDue && r.Due.IsZero()) {
		return false, nil
	}
	observation, err := s.backend.Observe(ctx, *r, target)
	if err != nil {
		return false, err
	}
	if observation.Changed && !profile.ReplaceDrift {
		r.State = MaintenancePaused
		r.Reason = "The active dataset changed after verification; explicitly resume maintenance to replace it."
		return true, s.saveMaintenanceUnlessDryRun(ctx, *r, dryRun)
	}
	return r.State == MaintenanceReady && observation.Fresh && !observation.Changed && r.Due.After(s.now()), nil
}

func (s *MaintenanceService) startMaintenanceEpoch(ctx context.Context, r *MaintenanceRecord, caller Principal, requestKey string) error {
	if err := s.backend.Prune(ctx); err != nil {
		return err
	}
	input, err := s.backend.Plan(ctx, *r)
	if err != nil {
		return err
	}
	var entropy [16]byte
	if _, err = rand.Read(entropy[:]); err != nil {
		return err
	}
	r.Epoch = hex.EncodeToString(entropy[:])
	r.EpochPrefix = "maintenance-"
	r.Input = input
	r.Step = Generate
	r.OperationID = ""
	r.State = MaintenancePreparing
	r.Reason = ""
	r.OriginActor = caller.ActorID
	r.TriggerKey = requestKey
	if caller.ActorID == r.Principal {
		r.OriginActor = r.Owner
	}
	return s.backend.Save(ctx, *r)
}

func (s *MaintenanceService) runMaintenance(ctx context.Context, r *MaintenanceRecord, target *TargetState) (err error) {
	delegated := s.backend.Delegate(ctx, *r)
	defer func() {
		if err != nil {
			err = s.persistMaintenanceFailure(ctx, r, *target, err)
		}
	}()
	for range 4 {
		value, stepErr := s.runMaintenanceStep(ctx, delegated, r)
		if stepErr != nil {
			return stepErr
		}
		if r.Step == Activate {
			_, *target, err = s.backend.Load(ctx)
			if err != nil {
				return err
			}
			return s.finish(ctx, r, *target)
		}
		if err = s.advanceMaintenanceStep(ctx, r, value); err != nil {
			return err
		}
		if err = s.backend.Save(ctx, *r); err != nil {
			return err
		}
	}
	return Error(CodeUnavailable)
}

func (s *MaintenanceService) runMaintenanceStep(ctx, delegated context.Context, r *MaintenanceRecord) (Result, error) {
	if err := s.backend.AuthorizePolicy(delegated, *r); err != nil {
		return Result{}, err
	}
	current, _, err := s.backend.Load(ctx)
	if err != nil {
		return Result{}, err
	}
	if current.Revision != r.Revision || !current.Enabled {
		return Result{}, Error(CodeDenied)
	}
	if r.EpochPrefix == "" {
		r.EpochPrefix = "maintenance-"
	}
	r.Input.IdempotencyKey = r.EpochPrefix + r.Epoch + "-" + string(r.Step)
	if err = s.backend.Save(ctx, *r); err != nil {
		return Result{}, err
	}
	value, err := s.lifecycle.Run(delegated, r.Step, r.Input)
	r.OperationID = value.OperationID
	if persistErr := s.backend.Save(ctx, *r); persistErr != nil {
		return Result{}, persistErr
	}
	if err == nil && !value.State.Terminal() {
		value, err = s.lifecycle.Recover(delegated, value.OperationID)
	}
	if err == nil {
		err = value.CommandResultFailure()
	}
	if err != nil {
		// Terminal failures need a fresh epoch; ambiguous work retains exact keys.
		if value.State.Terminal() {
			clearMaintenanceEpoch(r)
		}
		return Result{}, err
	}
	if value.State != Succeeded {
		return Result{}, Error(CodeUnavailable)
	}
	return value, nil
}

func clearMaintenanceEpoch(r *MaintenanceRecord) {
	r.Epoch = ""
	r.Step = ""
	r.OperationID = ""
}

func (s *MaintenanceService) advanceMaintenanceStep(ctx context.Context, r *MaintenanceRecord, value Result) error {
	switch r.Step {
	case Generate:
		if value.Dataset == nil {
			return Error(CodeUnavailable)
		}
		scenario, err := s.backend.Generated(ctx, *value.Dataset)
		if err != nil {
			if ErrorCode(err) == CodeStale {
				clearMaintenanceEpoch(r)
			}
			return err
		}
		r.Input.Dataset = *value.Dataset
		r.Input.Scenario = scenario
		r.Step = Prepare
	case Prepare:
		if value.Receipt == nil {
			return Error(CodeUnavailable)
		}
		r.Input.ReceiptID = value.Receipt.ID
		r.Step = Verify
	case Verify:
		r.Step = Activate
		generation := r.Generation
		r.Input.ExpectedGeneration = &generation
	default:
		return Error(CodeInvalid)
	}
	return nil
}

func (s *MaintenanceService) persistMaintenanceFailure(ctx context.Context, r *MaintenanceRecord, target TargetState, cause error) error {
	// Cleanup after committed completion cannot downgrade freshness or replay an
	// expired activation that has already been reconciled into a new retry.
	if r.State == MaintenanceReady && r.Epoch == "" {
		return cause
	}
	if r.Epoch == "" && r.Step == "" && r.Input.ReceiptID != "" && r.Input.ReceiptID == target.Activation.ReceiptID && r.Generation == target.Activation.Generation && r.Active == nil {
		return cause
	}
	// Preserve resumable input and exact request keys even on cancellation.
	r.State = MaintenanceFailed
	r.Reason = "Dataset renewal failed (" + ErrorCode(cause) + "); prior activation retained."
	r.Attempts++
	r.Failures++
	r.Due = s.now().Add(maintenanceBackoff(r.Attempts))
	if ctx.Err() != nil || r.Epoch != "" {
		r.State = MaintenanceRecoveryRequired
		r.Reason = "Interrupted renewal will be reconciled on the next attempt."
	}
	cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	if err := s.backend.Save(cleanup, *r); err != nil {
		return errors.Join(cause, err)
	}
	return cause
}

func maintenanceBackoff(attempt int) time.Duration {
	delay := time.Minute
	for i := 1; i < attempt && delay < 15*time.Minute; i++ {
		delay *= 2
	}
	return min(delay, 15*time.Minute)
}

// FreshForServing is a read-only admission check. Hosts hold their delivery/
// handover gate around it and serving. Retained artifacts must use their own
// authority; a manual activation is independent of automatic maintenance.
func (s *MaintenanceService) FreshForServing(ctx context.Context, generation uint64) (bool, error) {
	if e := s.Authorize(ctx, false); e != nil {
		return false, e
	}
	r, target, e := s.backend.Load(ctx)
	if e != nil {
		return false, e
	}
	if target.Activation.Generation != generation {
		return false, Error(CodeStale)
	}
	if target.RecoveryRequired || target.Pending != nil || !target.Activation.Ready {
		return false, Error(CodeRecovery)
	}
	if !r.Enabled || r.Generation != generation {
		return true, nil
	}
	observation, e := s.backend.Observe(ctx, r, target)
	if e != nil {
		return false, e
	}
	return observation.Fresh && !observation.Changed && (r.ExpiresAt.IsZero() || r.ExpiresAt.After(s.now())), nil
}
