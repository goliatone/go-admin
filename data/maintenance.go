package data

import (
	"context"
	"crypto/rand"
	"encoding/hex"
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
	if r.Enabled {
		if err = s.backend.AuthorizePolicy(ctx, r); err != nil {
			return MaintenanceResult{}, err
		}
		if t.Activation.Generation != r.Generation {
			r.State = MaintenancePaused
			r.Reason = "A manual activation paused automatic replacement."
		} else if r.State == MaintenanceReady {
			o, e := s.backend.Observe(ctx, r, t)
			if e != nil {
				return MaintenanceResult{}, e
			}
			if !o.Fresh || o.Changed || !r.Due.After(s.now()) {
				r.State = MaintenanceDue
				r.Reason = "The dataset needs renewal."
			}
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
func (s *MaintenanceService) Ensure(ctx context.Context, in MaintenanceEnsureRequest) (out MaintenanceResult, err error) {
	if e := in.Validate(); e != nil {
		return out, e
	}
	caller, e := s.backend.Authorize(ctx, true)
	if e != nil {
		return out, e
	}
	release, e := s.backend.Acquire(ctx)
	if e != nil {
		return out, e
	}
	defer release()
	r, t, e := s.backend.Load(ctx)
	if e != nil {
		return out, e
	}
	result := func() MaintenanceResult { return MaintenanceResult{r, t, in.DryRun} }
	if r.Revision != in.PolicyRevision {
		return out, Error(CodeStale)
	}
	if !r.Enabled {
		return result(), nil
	}
	if e = s.backend.AuthorizePolicy(ctx, r); e != nil {
		return out, e
	}
	profile, e := s.backend.Profile(ctx)
	if e != nil {
		return out, e
	}
	if profile.Digest != r.RecipeDigest {
		r.State = MaintenancePaused
		r.Reason = "The installed maintenance profile changed; explicitly resume to authorize it."
		if !in.DryRun {
			if e = s.backend.Save(ctx, r); e != nil {
				return out, e
			}
		}
		return result(), Error(CodeStale)
	}
	if r.Step == Activate && r.Input.ReceiptID != "" && t.Activation.ReceiptID == r.Input.ReceiptID && t.Activation.Ready {
		if in.DryRun {
			return result(), nil
		}
		e = s.finish(ctx, &r, t)
		return result(), e
	}
	if t.Activation.Generation != r.Generation {
		r.State = MaintenancePaused
		r.Reason = "A manual activation paused automatic replacement."
		if !in.DryRun {
			e = s.backend.Save(ctx, r)
		}
		return result(), e
	}
	if in.ExpectedGeneration != t.Activation.Generation {
		return out, Error(CodeStale)
	}
	if r.State == MaintenancePaused && !profile.ReplaceDrift {
		return result(), nil
	}
	if r.Epoch == "" && r.Active != nil && !(r.State == MaintenanceDue && r.Due.IsZero()) {
		o, e := s.backend.Observe(ctx, r, t)
		if e != nil {
			return out, e
		}
		if o.Changed && !profile.ReplaceDrift {
			r.State = MaintenancePaused
			r.Reason = "The active dataset changed after verification; explicitly resume maintenance to replace it."
			if !in.DryRun {
				e = s.backend.Save(ctx, r)
			}
			return result(), e
		}
		if r.State == MaintenanceReady && o.Fresh && !o.Changed && r.Due.After(s.now()) {
			r.State = MaintenanceReady
			return result(), nil
		}
	}
	if r.State == MaintenanceFailed && r.Due.After(s.now()) {
		return result(), nil
	}
	if in.DryRun {
		r.State = MaintenanceDue
		return result(), nil
	}
	if r.Epoch == "" {
		if e = s.backend.Prune(ctx); e != nil {
			return out, e
		}
		input, e := s.backend.Plan(ctx, r)
		if e != nil {
			return out, e
		}
		var entropy [16]byte
		if _, e = rand.Read(entropy[:]); e != nil {
			return out, e
		}
		r.Epoch = hex.EncodeToString(entropy[:])
		r.EpochPrefix = "maintenance-"
		r.Input = input
		r.Step = Generate
		r.OperationID = ""
		r.State = MaintenancePreparing
		r.Reason = ""
		r.OriginActor = caller.ActorID
		r.TriggerKey = in.RequestKey
		if caller.ActorID == r.Principal {
			r.OriginActor = r.Owner
		}
		if e = s.backend.Save(ctx, r); e != nil {
			return out, e
		}
	}
	delegated := s.backend.Delegate(ctx, r)
	defer func() {
		if err == nil {
			return
		}
		// Cleanup after a committed completion cannot downgrade freshness or
		// turn the activation into a failed retry epoch.
		if r.State == MaintenanceReady && r.Epoch == "" {
			out = result()
			return
		}
		if r.Epoch == "" && r.Step == "" && r.Input.ReceiptID != "" && r.Input.ReceiptID == t.Activation.ReceiptID && r.Generation == t.Activation.Generation && r.Active == nil {
			out = result()
			return
		}
		// Preserve resumable input and exact request keys even on cancellation.
		r.State = MaintenanceFailed
		r.Reason = "Dataset renewal failed (" + ErrorCode(err) + "); prior activation retained."
		r.Attempts++
		r.Failures++
		r.Due = s.now().Add(maintenanceBackoff(r.Attempts))
		if ctx.Err() != nil || r.Epoch != "" {
			r.State = MaintenanceRecoveryRequired
			r.Reason = "Interrupted renewal will be reconciled on the next attempt."
		}
		cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer cancel()
		_ = s.backend.Save(cleanup, r)
		out = result()
	}()
	for range 4 {
		if e = s.backend.AuthorizePolicy(delegated, r); e != nil {
			return out, e
		}
		current, _, e := s.backend.Load(ctx)
		if e != nil {
			return out, e
		}
		if current.Revision != r.Revision || !current.Enabled {
			return out, Error(CodeDenied)
		}
		if r.EpochPrefix == "" {
			r.EpochPrefix = "maintenance-"
		}
		r.Input.IdempotencyKey = r.EpochPrefix + r.Epoch + "-" + string(r.Step)
		if e = s.backend.Save(ctx, r); e != nil {
			return out, e
		}
		value, e := s.lifecycle.Run(delegated, r.Step, r.Input)
		r.OperationID = value.OperationID
		if persistErr := s.backend.Save(ctx, r); persistErr != nil {
			return out, persistErr
		}
		if e == nil && !value.State.Terminal() {
			value, e = s.lifecycle.Recover(delegated, value.OperationID)
		}
		if e == nil {
			e = value.CommandResultFailure()
		}
		if e != nil {
			// Terminal failures need a fresh epoch; nonterminal/ambiguous work retains
			// exact keys and is recovered, never duplicated after restart.
			if value.State.Terminal() {
				r.Epoch = ""
				r.Step = ""
				r.OperationID = ""
			}
			return out, e
		}
		if value.State != Succeeded {
			return out, Error(CodeUnavailable)
		}
		switch r.Step {
		case Generate:
			if value.Dataset == nil {
				return out, Error(CodeUnavailable)
			}
			scenario, e := s.backend.Generated(ctx, *value.Dataset)
			if e != nil {
				if ErrorCode(e) == CodeStale {
					r.Epoch = ""
					r.Step = ""
					r.OperationID = ""
				}
				return out, e
			}
			r.Input.Dataset = *value.Dataset
			r.Input.Scenario = scenario
			r.Step = Prepare
		case Prepare:
			if value.Receipt == nil {
				return out, Error(CodeUnavailable)
			}
			r.Input.ReceiptID = value.Receipt.ID
			r.Step = Verify
		case Verify:
			r.Step = Activate
			generation := r.Generation
			r.Input.ExpectedGeneration = &generation
		case Activate:
			_, t, e = s.backend.Load(ctx)
			if e != nil {
				return out, e
			}
			e = s.finish(ctx, &r, t)
			return result(), e
		default:
			return out, Error(CodeInvalid)
		}
		if e = s.backend.Save(ctx, r); e != nil {
			return out, e
		}
	}
	return out, Error(CodeUnavailable)
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
