package admin

import (
	"context"
	"strings"
	"time"

	auth "github.com/goliatone/go-auth"
	usersactivity "github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/pkg/authctx"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/goliatone/go-users/query"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// ActivityIngestionOptions opts into a complete durable ingestion/read bundle.
// Scope comes exclusively from the Admin's normalized Config, including quickstart
// scope options. Migrate DB explicitly before configuring. ReadPolicy defaults to
// the Admin's Activity policy; Authorizer and ActivityPermission are mandatory.
type ActivityIngestionOptions struct {
	Enabled             bool
	DB                  *bun.DB
	Verifier            ActivityProducerVerifier
	AttributionVerifier ActivityAttributionVerifier
	Policy              ActivityIngestionPolicy
	ReadPolicy          usersactivity.ActivityAccessPolicy
	Issuer              string
	Audience            string
	MaxEnvelopeBytes    int
	MaxMetadataBytes    int
	MaxFutureSkew       time.Duration
	ValidateEvent       ActivityIngestionValidation
	Disclose            ActivityIngestionDisclosure
	Observe             func(context.Context, ActivityIngestionObservation)
}

// ActivityIngestionRuntime exposes the durable service and HTTP registration
// options after readiness. Feed and Sink share the same guarded policy query;
// Sink.Record preserves the previously configured legacy write behavior.
type ActivityIngestionRuntime struct {
	Service *ActivityIngestionService
	Store   *BunActivityIngestionStore
	Feed    ActivityFeedQuerier
	Sink    ActivitySink
	HTTP    ActivityIngestionHTTPOptions
}

// ConfigureActivityIngestion composes the optional feature before Initialize or
// serving requests. It checks schema, shared scope, reader/producer policy and
// named URL readiness, registers the command, and replaces both read surfaces.
// It performs no migrations. Disabled options leave legacy hosts unchanged.
func (a *Admin) ConfigureActivityIngestion(ctx context.Context, opts ActivityIngestionOptions) (*ActivityIngestionRuntime, error) {
	if !opts.Enabled {
		return nil, nil
	}
	if a == nil || a.activityIngestion != nil || activityIngestionNil(a.authorizer) || strings.TrimSpace(a.config.ActivityPermission) == "" || activityIngestionNil(opts.Verifier) {
		return nil, ErrActivityIngestionUnavailable
	}
	scope := ScopePolicy{Mode: ScopePolicyMode(strings.ToLower(strings.TrimSpace(a.config.ScopeMode))), DefaultTenantID: a.config.DefaultTenantID, DefaultOrgID: a.config.DefaultOrgID}
	if err := validateActivityIngestionScopePolicy(scope); err != nil {
		return nil, err
	}
	if _, err := a.ActivityIngestionURL(); err != nil {
		return nil, err
	}
	store, err := NewBunActivityIngestionStore(opts.DB)
	if err != nil {
		return nil, err
	}
	svc, err := NewActivityIngestionService(ActivityIngestionConfig{Store: store, Policy: opts.Policy, ScopePolicy: scope, Issuer: opts.Issuer, Audience: opts.Audience, MaxEnvelopeBytes: opts.MaxEnvelopeBytes, MaxMetadataBytes: opts.MaxMetadataBytes, MaxFutureSkew: opts.MaxFutureSkew, ValidateEvent: opts.ValidateEvent, Disclose: opts.Disclose, Observe: opts.Observe})
	if err != nil {
		return nil, err
	}
	if err = svc.CheckReady(ctx); err != nil {
		return nil, err
	}
	policy := opts.ReadPolicy
	if activityIngestionNil(policy) {
		policy = a.activityPolicy
	}
	if activityIngestionNil(policy) {
		return nil, ErrActivityIngestionUnavailable
	}
	repository := &activityIngestionReadRepository{store: store}
	feed := &activityIngestionFeed{admin: a, query: query.NewActivityFeedQuery(repository, nil, query.WithActivityAccessPolicy(policy))}
	sink := &activityIngestionReadSink{admin: a, feed: feed, legacy: a.activity}
	if _, err = RegisterActivityIngestionCommand(a.Commands(), svc); err != nil {
		return nil, err
	}
	runtime := &ActivityIngestionRuntime{Service: svc, Store: store, Feed: feed, Sink: sink, HTTP: ActivityIngestionHTTPOptions{Enabled: true, Service: svc, Verifier: opts.Verifier, AttributionVerifier: opts.AttributionVerifier}}
	a.activityIngestion = runtime
	a.activityReadIdentityResolver = store
	a.activityFeed = feed
	a.activityPolicy = policy
	a.applyActivitySink(sink)
	return runtime, nil
}

// ActivityIngestion returns the configured runtime, or nil for legacy hosts.
func (a *Admin) ActivityIngestion() *ActivityIngestionRuntime {
	if a == nil {
		return nil
	}
	return a.activityIngestion
}

type activityIngestionReadScopeKey struct{}
type activityIngestionReadRepository struct{ store *BunActivityIngestionStore }

func (r *activityIngestionReadRepository) ListActivity(ctx context.Context, filter types.ActivityFilter) (types.ActivityPage, error) {
	expected, ok := ctx.Value(activityIngestionReadScopeKey{}).(types.ScopeFilter)
	if !ok || filter.Scope.TenantID != expected.TenantID || filter.Scope.OrgID != expected.OrgID || len(filter.Scope.Labels) != 0 {
		return types.ActivityPage{}, ErrActivityIngestionForbidden
	}
	// The go-users model scans JSON with UseNumber at the first persistence
	// boundary. Do not re-decode legacy rows through the new ingestion limits:
	// policies still sanitize the exact data before either read projection.
	return r.store.repository.ListActivity(ctx, filter)
}
func (r *activityIngestionReadRepository) ActivityStats(context.Context, types.ActivityStatsFilter) (types.ActivityStats, error) {
	return types.ActivityStats{}, ErrActivityIngestionForbidden
}

type activityIngestionFeed struct {
	admin *Admin
	query ActivityFeedQuerier
}

func (f *activityIngestionFeed) Query(ctx context.Context, filter types.ActivityFilter) (types.ActivityPage, error) {
	trusted, readCtx, err := f.admin.activityIngestionReader(ctx)
	if err != nil {
		return types.ActivityPage{}, err
	}
	if (filter.Actor.ID != uuid.Nil && filter.Actor.ID != readCtx.Actor.ID) || (filter.Scope.TenantID != uuid.Nil && filter.Scope.TenantID != readCtx.Scope.TenantID) || (filter.Scope.OrgID != uuid.Nil && filter.Scope.OrgID != readCtx.Scope.OrgID) || len(filter.Scope.Labels) != 0 {
		return types.ActivityPage{}, ErrActivityIngestionForbidden
	}
	filter.Actor = readCtx.Actor
	filter.Scope = readCtx.Scope
	return f.query.Query(context.WithValue(trusted, activityIngestionReadScopeKey{}, readCtx.Scope), filter)
}
func (a *Admin) activityIngestionReader(ctx context.Context) (context.Context, ActivityReadContext, error) {
	if ctx == nil {
		return ctx, ActivityReadContext{}, ErrActivityIngestionForbidden
	}
	actor, err := authctx.ResolveActorContext(ctx)
	if err != nil || actor == nil {
		return ctx, ActivityReadContext{}, ErrActivityIngestionForbidden
	}
	ref, err := authctx.ActorRefFromActorContext(actor)
	if err != nil || ref.ID == uuid.Nil {
		return ctx, ActivityReadContext{}, ErrActivityIngestionForbidden
	}
	if err = a.requirePermission(AdminContext{Context: ctx}, a.config.ActivityPermission, "activity"); err != nil {
		return ctx, ActivityReadContext{}, err
	}
	// Actor scope is trusted; request/query/event metadata is never consulted.
	if _, err = activityIngestionScope(ScopeInput{TenantID: actor.TenantID, OrgID: actor.OrganizationID}, true); err != nil {
		return ctx, ActivityReadContext{}, ErrActivityIngestionForbidden
	}
	original := authctx.ScopeFromActorContext(actor)
	if len(original.Labels) != 0 {
		return ctx, ActivityReadContext{}, ErrActivityIngestionForbidden
	}
	resolved, err := ResolveActivityIngestionScope(a.ScopePolicy(), ScopeInput{TenantID: uuidString(original.TenantID), OrgID: uuidString(original.OrgID)}, ScopeInput{})
	if err != nil {
		return ctx, ActivityReadContext{}, ErrActivityIngestionForbidden
	}
	scope := types.ScopeFilter{TenantID: uuid.MustParse(resolved.TenantID), OrgID: uuid.MustParse(resolved.OrgID)}
	clone := *actor
	clone.TenantID = resolved.TenantID
	clone.OrganizationID = resolved.OrgID
	return auth.WithActorContext(ctx, &clone), ActivityReadContext{Actor: ref, Scope: scope}, nil
}

type activityIngestionReadSink struct {
	admin  *Admin
	feed   ActivityFeedQuerier
	legacy ActivitySink
}

func (s *activityIngestionReadSink) Record(ctx context.Context, entry ActivityEntry) error {
	if s.legacy == nil {
		return ErrActivityIngestionUnavailable
	}
	return s.legacy.Record(ctx, entry)
}
func (s *activityIngestionReadSink) List(ctx context.Context, limit int, filters ...ActivityFilter) ([]ActivityEntry, error) {
	trusted, readCtx, err := s.admin.activityIngestionReader(ctx)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = activityDefaultLimit
	}
	if limit > activityMaxLimit {
		limit = activityMaxLimit
	}
	filter := types.ActivityFilter{Actor: readCtx.Actor, Scope: readCtx.Scope, Pagination: types.Pagination{Limit: limit}}
	for _, legacy := range filters {
		if legacy.Actor != "" {
			id, parseErr := uuid.Parse(legacy.Actor)
			if parseErr != nil {
				return nil, ErrActivityIngestionInvalid
			}
			filter.ActorID = id
		}
		if legacy.Action != "" {
			filter.Verbs = append(filter.Verbs, legacy.Action)
		}
		if legacy.Channel != "" {
			filter.Channels = append(filter.Channels, legacy.Channel)
		}
		if legacy.Object != "" {
			filter.ObjectType, filter.ObjectID, _ = strings.Cut(legacy.Object, ":")
		}
	}
	page, err := s.feed.Query(trusted, filter)
	if err != nil {
		return nil, err
	}
	readCtx, err = s.admin.resolveActivityReadIdentities(trusted, readCtx, page)
	if err != nil {
		return nil, err
	}
	page = s.admin.enrichActivityReadPage(trusted, readCtx, page)
	return entriesFromUsersRecords(page.Records, readCtx.Identities), nil
}
func (a *Admin) resolveActivityReadIdentities(ctx context.Context, readCtx ActivityReadContext, page types.ActivityPage) (ActivityReadContext, error) {
	if a == nil || a.activityReadIdentityResolver == nil {
		return readCtx, nil
	}
	identities, err := a.activityReadIdentityResolver.ResolveActivityReadIdentities(ctx, readCtx, page.Records)
	if err != nil {
		return readCtx, ErrActivityIngestionUnavailable
	}
	readCtx.Identities = identities
	return readCtx, nil
}
func activityReadMachineKind(identities map[uuid.UUID]ActivityReadIdentity, id uuid.UUID) string {
	kind := identities[id].ActorKind
	if kind == "system" || kind == "job" {
		return kind
	}
	return ""
}
func activityReadMachineLabel(kind string) string {
	if kind == "job" {
		return "Job"
	}
	return "System"
}

// The scope guard runs before the canonical repository and policy sanitization.
var _ types.ActivityRepository = (*activityIngestionReadRepository)(nil)
