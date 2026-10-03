package data

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"reflect"
	"slices"
	"time"
)

func previewContext(ctx context.Context) (context.Context, context.CancelFunc, error) {
	if ctx == nil {
		return nil, nil, Error(CodeDenied)
	}
	c, cancel := context.WithTimeout(ctx, 10*time.Second)
	return c, cancel, nil
}
func (s *Service) previewEnabled() bool {
	c := s.config.Preview
	return c.Enabled && !nilValue(c.Adapter) && c.Adapter.PreviewGuarantees().Safe()
}
func (s *Service) previewSurface(id string) (PreviewSurface, bool) {
	for _, surface := range s.config.Preview.Surfaces {
		if surface.ID == id {
			return surface, true
		}
	}
	return PreviewSurface{}, false
}
func (s *Service) beginPreview(ctx context.Context, selection ExploreSelection) (*previewAuthorization, error) {
	if err := (PreviewCapabilitiesQuery{Selection: selection}).Validate(); err != nil {
		return nil, err
	}
	p, err := s.principal(ctx)
	if err != nil {
		return nil, err
	}
	f := &previewAuthorization{service: s}
	var sources []InsightAuthorizationRevision
	if s.previewEnabled() {
		sources = append(sources, s.config.Preview.Adapter)
	}
	if revision, ok := s.config.Policy.(InsightAuthorizationRevision); ok {
		sources = append(sources, revision)
	}
	if revision, ok := s.config.Providers[selection.Dataset.Provider].(InsightAuthorizationRevision); ok {
		sources = append(sources, revision)
	}
	for _, source := range sources {
		value, e := insightRevisionValue(ctx, source, p)
		if e != nil {
			return nil, e
		}
		f.revisions = append(f.revisions, insightRevision{source: source, value: value})
	}
	b, err := s.bindExplore(ctx, selection)
	if err != nil {
		if ErrorCode(err) == CodeConflict {
			err = Error(CodeStale)
		}
		return nil, err
	}
	if b.principal != p {
		return nil, Error(CodeDenied)
	}
	f.binding = b
	return f, nil
}
func (s *Service) previewGrant(ctx context.Context, f *previewAuthorization, surface string) error {
	registered, ok := s.previewSurface(surface)
	if !ok {
		return Error(CodeGone)
	}
	return s.authorizeExplore(ctx, f.binding, ExploreAccess{SurfaceIDs: []string{surface}, EntityID: registered.EntityID, Fields: registered.Fields})
}
func (f *previewAuthorization) seal(ctx context.Context) error {
	if err := f.service.validateExploreStoreBinding(ctx, f.binding); err != nil {
		return err
	}
	if f.record.Session.State == PreviewReady {
		if err := f.service.config.Preview.Adapter.InspectPreview(ctx, f.record); err != nil {
			return readFailure(ctx, err)
		}
	}
	for _, revision := range f.revisions {
		value, err := insightRevisionValue(ctx, revision.source, f.binding.principal)
		if err != nil {
			return err
		}
		if value != revision.value {
			return Error(CodeDenied)
		}
	}
	return ctx.Err()
}
func (s *Service) PreviewCapabilities(ctx context.Context, q PreviewCapabilitiesQuery) (PreviewCapability, error) {
	ctx, cancel, err := previewContext(ctx)
	if err != nil {
		return PreviewCapability{}, err
	}
	defer cancel()
	f, err := s.beginPreview(ctx, q.Selection)
	if err != nil {
		return PreviewCapability{}, err
	}
	out, err := s.availablePreviewSurfaces(ctx, f)
	if err != nil {
		return PreviewCapability{}, err
	}
	access := ExploreAccess{}
	for _, surface := range out.Surfaces {
		if err = s.previewGrant(ctx, f, surface.ID); err != nil {
			return PreviewCapability{}, err
		}
		access.SurfaceIDs = append(access.SurfaceIDs, surface.ID)
	}
	if err = s.deliverExplore(ctx, f.binding, access); err != nil {
		return PreviewCapability{}, err
	}
	if err = f.seal(ctx); err != nil {
		return PreviewCapability{}, err
	}
	out.authorization = f
	return out, nil
}
func previewFingerprint(q OpenApplicationPreviewInput) (string, error) {
	q.RequestID = ""
	b, err := json.Marshal(q)
	if err != nil {
		return "", Error(CodeInvalid)
	}
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:]), nil
}
func (s *Service) OpenApplicationPreview(ctx context.Context, q OpenApplicationPreviewInput) (ApplicationPreviewSession, error) {
	ctx, cancel, err := previewContext(ctx)
	if err != nil {
		return ApplicationPreviewSession{}, err
	}
	defer cancel()
	if err = q.Validate(); err != nil {
		return ApplicationPreviewSession{}, err
	}
	f, err := s.beginPreview(ctx, q.Selection)
	if err != nil {
		return ApplicationPreviewSession{}, err
	}
	if !s.previewEnabled() {
		return ApplicationPreviewSession{}, Error(CodeUnavailable)
	}
	if err = s.previewGrant(ctx, f, q.SurfaceID); err != nil {
		return ApplicationPreviewSession{}, err
	}
	if err = s.config.Preview.Adapter.PreviewReadiness(ctx, f.binding.principal, f.binding.providerRead()); err != nil {
		return ApplicationPreviewSession{}, readFailure(ctx, err)
	}
	fingerprint, err := previewFingerprint(q)
	if err != nil {
		return ApplicationPreviewSession{}, err
	}
	c := s.config.Preview
	want := PreviewRecord{Session: ApplicationPreviewSession{SessionID: uuid.NewString(), Selection: q.Selection, SurfaceID: q.SurfaceID, State: PreviewReady, ExpiresAt: c.Now().UTC().Add(c.Lifetime), ReadOnly: true}, Principal: f.binding.principal, ApplicationID: c.ApplicationID, EnvironmentID: c.EnvironmentID, RequestID: q.RequestID, Fingerprint: fingerprint, Receipt: *f.binding.providerRead().Receipt, AuthorizationRevisions: previewRevisionValues(f)}
	record, err := c.Adapter.OpenPreview(ctx, want, PreviewMaxSessions)
	if err != nil {
		return ApplicationPreviewSession{}, s.failedPreviewOpen(ctx, want, record, readFailure(ctx, err))
	}
	f.record = record
	f.newAllocation = record.Session.SessionID == want.Session.SessionID
	if err = s.validatePreviewRecord(want, record); err != nil {
		return ApplicationPreviewSession{}, s.failedPreviewOpen(ctx, want, record, err)
	}
	if err = s.ValidatePreviewDelivery(ctx, withPreviewAuthorization(record.Session, f)); err != nil {
		return ApplicationPreviewSession{}, s.failedPreviewOpen(ctx, want, record, err)
	}
	return withPreviewAuthorization(record.Session, f), nil
}

// Capability discovery is also fenced through the transport's final host check.
func (s *Service) ValidatePreviewCapabilitiesDelivery(ctx context.Context, out PreviewCapability, finalCheck ...InsightDeliveryCheck) error {
	ctx, cancel, err := previewContext(ctx)
	if err != nil {
		return err
	}
	defer cancel()
	base := ctx
	f := out.authorization
	if f == nil || f.service != s || len(finalCheck) > 1 || len(out.Surfaces) > PreviewMaxSurfaces {
		return Error(CodeDenied)
	}
	access := ExploreAccess{}
	for _, surface := range out.Surfaces {
		if _, ok := s.previewSurface(surface.ID); !ok {
			return Error(CodeDenied)
		}
		if err = s.previewGrant(ctx, f, surface.ID); err != nil {
			return err
		}
		access.SurfaceIDs = append(access.SurfaceIDs, surface.ID)
	}
	if err = s.deliverExplore(ctx, f.binding, access); err != nil {
		return err
	}
	if ctx, err = previewFinalCheck(ctx, finalCheck); err != nil {
		return err
	}
	p, err := s.principal(ctx)
	if err != nil {
		return err
	}
	if p != f.binding.principal {
		return Error(CodeDenied)
	}
	if err = f.seal(ctx); err != nil {
		return err
	}
	return base.Err()
}
func withPreviewAuthorization(session ApplicationPreviewSession, f *previewAuthorization) ApplicationPreviewSession {
	session.authorization = f
	return session
}
func (s *Service) validatePreviewRecord(want, record PreviewRecord) error {
	if !slices.Equal(want.AuthorizationRevisions, record.AuthorizationRevisions) {
		return Error(CodeDenied)
	}
	x := record.Session
	if !record.Authorizes(want.Principal) || record.ApplicationID != want.ApplicationID || record.EnvironmentID != want.EnvironmentID || record.RequestID != want.RequestID || record.Fingerprint != want.Fingerprint || !x.Selection.Equal(want.Session.Selection) || x.SurfaceID != want.Session.SurfaceID || !reflect.DeepEqual(record.Receipt, want.Receipt) {
		return Error(CodeProvider)
	}
	return s.validatePreviewSessionShape(x)
}
func (s *Service) validatePreviewSessionShape(x ApplicationPreviewSession) error {
	if !exploreID(x.SessionID) || !x.ReadOnly || x.LaunchURL != "" || x.ReturnURL != "" || x.ExpiresAt.IsZero() || x.ExpiresAt.After(s.config.Preview.Now().Add(s.config.Preview.Lifetime)) || !slices.Contains([]string{PreviewReady, PreviewExpired, PreviewClosed, PreviewUnavailable}, x.State) {
		return Error(CodeProvider)
	}
	if x.State != PreviewReady || !s.config.Preview.Now().Before(x.ExpiresAt) {
		return Error(CodeGone)
	}
	return nil
}
func (s *Service) loadPreview(ctx context.Context, id string) (*previewAuthorization, error) {
	if !s.previewEnabled() {
		return nil, Error(CodeUnavailable)
	}
	if err := (ApplicationPreviewSessionQuery{SessionID: id}).Validate(); err != nil {
		return nil, err
	}
	p, err := s.principal(ctx)
	if err != nil {
		return nil, err
	}
	record, err := s.config.Preview.Adapter.LookupPreview(ctx, id)
	if err != nil {
		return nil, readFailure(ctx, err)
	}
	c := s.config.Preview
	if err = s.validatePreviewOwner(ctx, id, record, p); err != nil {
		return nil, err
	}
	f, err := s.beginPreview(ctx, record.Session.Selection)
	if err == nil {
		err = s.previewGrant(ctx, f, record.Session.SurfaceID)
	}
	if err != nil {
		return nil, s.previewReadFailure(ctx, id, err)
	}
	f.record = record
	if !slices.Equal(record.AuthorizationRevisions, previewRevisionValues(f)) {
		return nil, errors.Join(Error(CodeDenied), s.endPreview(ctx, id, PreviewUnavailable))
	}
	if !reflect.DeepEqual(record.Receipt, *f.binding.providerRead().Receipt) {
		return nil, errors.Join(Error(CodeStale), s.endPreview(ctx, id, PreviewUnavailable))
	}
	if record.Session.State == PreviewReady && !c.Now().Before(record.Session.ExpiresAt) {
		if err = s.endPreview(ctx, id, PreviewExpired); err != nil {
			return nil, err
		}
		f.record.Session.State = PreviewExpired
	}
	return f, nil
}
func (s *Service) endPreview(ctx context.Context, id, state string) error {
	cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), s.config.CleanupTimeout)
	defer cancel()
	return s.config.Preview.Adapter.EndPreview(cleanup, id, state)
}
func (s *Service) ApplicationPreviewSession(ctx context.Context, q ApplicationPreviewSessionQuery) (ApplicationPreviewSession, error) {
	ctx, cancel, err := previewContext(ctx)
	if err != nil {
		return ApplicationPreviewSession{}, err
	}
	defer cancel()
	f, err := s.loadPreview(ctx, q.SessionID)
	if err != nil {
		return ApplicationPreviewSession{}, err
	}
	out := withPreviewAuthorization(f.record.Session, f)
	if err = s.ValidatePreviewDelivery(ctx, out); err != nil {
		return ApplicationPreviewSession{}, err
	}
	return out, nil
}
func (s *Service) CloseApplicationPreview(ctx context.Context, q CloseApplicationPreviewCommand) (ApplicationPreviewSession, error) {
	ctx, cancel, err := previewContext(ctx)
	if err != nil {
		return ApplicationPreviewSession{}, err
	}
	defer cancel()
	f, err := s.loadPreview(ctx, q.SessionID)
	if err != nil {
		return ApplicationPreviewSession{}, err
	}
	if err = s.endPreview(ctx, q.SessionID, PreviewClosed); err != nil {
		return ApplicationPreviewSession{}, err
	}
	f.record.Session.State = PreviewClosed
	out := withPreviewAuthorization(f.record.Session, f)
	if err = s.ValidatePreviewDelivery(ctx, out); err != nil {
		return ApplicationPreviewSession{}, err
	}
	return out, nil
}
func (s *Service) ApplicationPreviewRead(ctx context.Context, q ApplicationPreviewSessionQuery, surface string) (PreviewReadContext, error) {
	out, err := s.ApplicationPreviewSession(ctx, q)
	if err != nil {
		return PreviewReadContext{}, err
	}
	if out.State != PreviewReady {
		return PreviewReadContext{}, Error(CodeGone)
	}
	if out.SurfaceID != surface {
		return PreviewReadContext{}, Error(CodeGone)
	}
	f := out.authorization
	return PreviewReadContext{Session: out, Principal: f.binding.principal, Read: f.binding.providerRead()}, nil
}

// Custom transports must run their LAST current host check in finalCheck. The
// private original fence prevents JSON, forged selections and late revocation
// from manufacturing authority after application query/render work.
func (s *Service) ValidatePreviewDelivery(ctx context.Context, out ApplicationPreviewSession, finalCheck ...InsightDeliveryCheck) (err error) {
	ctx, cancel, err := previewContext(ctx)
	if err != nil {
		return err
	}
	defer cancel()
	base := ctx
	if len(finalCheck) > 1 {
		return Error(CodeInvalid)
	}
	f, err := s.previewSessionFence(out)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil && f.record.Session.State == PreviewReady {
			err = s.previewReadFailure(base, out.SessionID, err)
		}
	}()
	if err = s.previewGrant(ctx, f, out.SurfaceID); err != nil {
		return err
	}
	registered, _ := s.previewSurface(out.SurfaceID)
	if err = s.deliverExplore(ctx, f.binding, ExploreAccess{SurfaceIDs: []string{out.SurfaceID}, EntityID: registered.EntityID, Fields: registered.Fields}); err != nil {
		return err
	}
	if ctx, err = previewFinalCheck(ctx, finalCheck); err != nil {
		return err
	}
	if err = s.validatePreviewCurrent(ctx, f, out); err != nil {
		return err
	}
	if err = f.seal(ctx); err != nil {
		return err
	}
	return base.Err()
}

func previewFinalCheck(ctx context.Context, checks []InsightDeliveryCheck) (context.Context, error) {
	next, err := insightFinalCheck(ctx, checks)
	if err != nil {
		return nil, authorizationFailure(ctx, err)
	}
	before, limited := ctx.Deadline()
	after, retained := next.Deadline()
	if limited && (!retained || after.After(before)) {
		return nil, Error(CodeDenied)
	}
	return next, nil
}

func (s *Service) availablePreviewSurfaces(ctx context.Context, f *previewAuthorization) (PreviewCapability, error) {
	out := PreviewCapability{Reason: "not_supported", Surfaces: []PreviewSurface{}}
	if !s.previewEnabled() {
		return out, nil
	}
	err := s.config.Preview.Adapter.PreviewReadiness(ctx, f.binding.principal, f.binding.providerRead())
	if err != nil {
		if ErrorCode(err) != CodeUnavailable {
			return PreviewCapability{}, readFailure(ctx, err)
		}
		out.Reason = "runtime_unavailable"
		return out, nil
	}
	for _, surface := range s.config.Preview.Surfaces {
		if err = s.previewGrant(ctx, f, surface.ID); err != nil {
			if ErrorCode(err) == CodeDenied {
				continue
			}
			return PreviewCapability{}, err
		}
		surface.EntityID = ""
		surface.Fields = nil
		out.Surfaces = append(out.Surfaces, surface)
	}
	out.Supported = len(out.Surfaces) > 0
	out.Guarantees = s.config.Preview.Adapter.PreviewGuarantees()
	out.Reason = "no_readable_surfaces"
	if out.Supported {
		out.Reason = ""
	}
	return out, nil
}

func (s *Service) failedPreviewOpen(ctx context.Context, want, record PreviewRecord, err error) error {
	if record.Session.SessionID != "" && record.Authorizes(want.Principal) && record.RequestID == want.RequestID {
		if record.Session.SessionID == want.Session.SessionID {
			return errors.Join(err, s.endPreview(ctx, record.Session.SessionID, PreviewUnavailable))
		}
		return s.previewReadFailure(ctx, record.Session.SessionID, err)
	}
	return err
}

// Request failures deny delivery, but do not withdraw a previously live session.
// Newly allocated launch resources are rolled back separately by their owner.
func (s *Service) previewReadFailure(ctx context.Context, id string, err error) error {
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err
	}
	switch ErrorCode(err) {
	case CodeDenied, CodeGone, CodeStale, CodeUnavailable:
		return errors.Join(err, s.endPreview(ctx, id, PreviewUnavailable))
	default:
		return err
	}
}

// DiscardPreviewLaunch rolls back a launch that its transport could not deliver.
// Replayed sessions and ordinary read/query results never own that allocation.
func (s *Service) DiscardPreviewLaunch(ctx context.Context, out ApplicationPreviewSession) error {
	if ctx == nil {
		return Error(CodeDenied)
	}
	f, err := s.previewSessionFence(out)
	if err != nil {
		return err
	}
	if !f.newAllocation {
		return nil
	}
	return s.endPreview(ctx, out.SessionID, PreviewUnavailable)
}

func (s *Service) validatePreviewOwner(ctx context.Context, id string, record PreviewRecord, p Principal) error {
	c := s.config.Preview
	if record.Principal.ActorID != p.ActorID || record.ApplicationID != c.ApplicationID || record.EnvironmentID != c.EnvironmentID || record.Session.SessionID != id {
		return Error(CodeGone)
	}
	if !record.Authorizes(p) {
		return errors.Join(Error(CodeDenied), s.endPreview(ctx, id, PreviewUnavailable))
	}
	return nil
}

func (s *Service) previewSessionFence(out ApplicationPreviewSession) (*previewAuthorization, error) {
	f := out.authorization
	if f == nil || f.service != s || !out.Selection.Equal(f.record.Session.Selection) || out.SessionID != f.record.Session.SessionID || out.SurfaceID != f.record.Session.SurfaceID || out.State != f.record.Session.State || out.ExpiresAt != f.record.Session.ExpiresAt || !out.ReadOnly {
		return nil, Error(CodeDenied)
	}
	return f, nil
}

func (s *Service) validatePreviewCurrent(ctx context.Context, f *previewAuthorization, out ApplicationPreviewSession) error {
	if out.State == PreviewReady && !s.previewEnabled() {
		return Error(CodeUnavailable)
	}
	p, err := s.principal(ctx)
	if err != nil {
		return err
	}
	if p != f.binding.principal {
		return Error(CodeDenied)
	}
	if out.State == PreviewReady && !s.config.Preview.Now().Before(out.ExpiresAt) {
		return Error(CodeGone)
	}
	return nil
}

func previewRevisionValues(f *previewAuthorization) []string {
	values := make([]string, 0, len(f.revisions))
	for _, r := range f.revisions {
		values = append(values, r.value)
	}
	return values
}
