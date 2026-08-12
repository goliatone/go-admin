package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	usersactivity "github.com/goliatone/go-users/activity"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

// ActivityDisplayHintPolicy decides whether a stored display hint may be used
// when current resolution does not return a display value. A nil policy denies
// all stored hints.
type ActivityDisplayHintPolicy interface {
	AllowStoredDisplayHint(context.Context, ActivityReadContext, userstypes.ActivityRecord, string, string) bool
}

// ActivityDisplayHintPolicyFunc adapts a function into an ActivityDisplayHintPolicy.
type ActivityDisplayHintPolicyFunc func(context.Context, ActivityReadContext, userstypes.ActivityRecord, string, string) bool

// AllowStoredDisplayHint implements ActivityDisplayHintPolicy.
func (f ActivityDisplayHintPolicyFunc) AllowStoredDisplayHint(ctx context.Context, readCtx ActivityReadContext, record userstypes.ActivityRecord, field, value string) bool {
	return f(ctx, readCtx, record, field, value)
}

// ResolverActivityPageEnricherConfig wires generic batch resolvers into the
// Activity page enrichment contract.
type ResolverActivityPageEnricherConfig struct {
	ActorResolver  usersactivity.ActorResolver
	ObjectResolver usersactivity.ObjectResolver
	HintPolicy     ActivityDisplayHintPolicy
	ActionLabels   map[string]string
}

type resolverActivityPageEnricher struct {
	actorResolver  usersactivity.ActorResolver
	objectResolver usersactivity.ObjectResolver
	hintPolicy     ActivityDisplayHintPolicy
	actionLabels   map[string]string
}

// NewResolverActivityPageEnricher builds a generic, repository-agnostic page
// enricher. Resolver calls receive only the trusted request scope.
func NewResolverActivityPageEnricher(cfg ResolverActivityPageEnricherConfig) ActivityPageEnricher {
	actionLabels := make(map[string]string, len(cfg.ActionLabels))
	for key, value := range cfg.ActionLabels {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key != "" && value != "" {
			actionLabels[key] = value
		}
	}
	return &resolverActivityPageEnricher{
		actorResolver:  cfg.ActorResolver,
		objectResolver: cfg.ObjectResolver,
		hintPolicy:     cfg.HintPolicy,
		actionLabels:   actionLabels,
	}
}

func (e *resolverActivityPageEnricher) EnrichActivityPage(ctx context.Context, readCtx ActivityReadContext, page userstypes.ActivityPage) (userstypes.ActivityPage, error) {
	out := cloneActivityPage(page)
	actorIDs, objectsByType := collectActivityReferences(out.Records)
	resolveCtx := usersactivity.ResolveContext{
		TenantID:       readCtx.Scope.TenantID,
		OrganizationID: readCtx.Scope.OrgID,
	}

	actors := map[uuid.UUID]usersactivity.ActorInfo{}
	if e != nil && e.actorResolver != nil && len(actorIDs) > 0 {
		resolved, err := e.actorResolver.ResolveActors(ctx, actorIDs, resolveCtx)
		if err != nil {
			return page, err
		}
		actors = resolved
	}

	objects := make(map[string]map[string]usersactivity.ObjectInfo, len(objectsByType))
	if e != nil && e.objectResolver != nil {
		for objectType, ids := range objectsByType {
			resolved, err := e.objectResolver.ResolveObjects(ctx, objectType, ids, resolveCtx)
			if err != nil {
				return page, err
			}
			objects[objectType] = resolved
		}
	}

	for i := range out.Records {
		e.applyResolvedDisplays(ctx, readCtx, &out.Records[i], actors, objects)
	}
	return out, nil
}

func cloneActivityPage(page userstypes.ActivityPage) userstypes.ActivityPage {
	out := page
	if page.Records == nil {
		return out
	}
	out.Records = make([]userstypes.ActivityRecord, len(page.Records))
	for i, record := range page.Records {
		out.Records[i] = record
		out.Records[i].Data = primitives.CloneAnyMap(record.Data)
	}
	return out
}

func collectActivityReferences(records []userstypes.ActivityRecord) ([]uuid.UUID, map[string][]string) {
	actorSeen := make(map[uuid.UUID]struct{})
	actorIDs := make([]uuid.UUID, 0, len(records))
	objectSeen := make(map[string]map[string]struct{})
	objects := make(map[string][]string)
	for _, record := range records {
		actorID := canonicalActivityActorID(record)
		if actorID != uuid.Nil {
			if _, ok := actorSeen[actorID]; !ok {
				actorSeen[actorID] = struct{}{}
				actorIDs = append(actorIDs, actorID)
			}
		}
		objectType := normalizeActivityObjectType(record.ObjectType)
		objectID := strings.TrimSpace(record.ObjectID)
		if objectType == "" || objectID == "" {
			continue
		}
		if objectSeen[objectType] == nil {
			objectSeen[objectType] = make(map[string]struct{})
		}
		if _, ok := objectSeen[objectType][objectID]; ok {
			continue
		}
		objectSeen[objectType][objectID] = struct{}{}
		objects[objectType] = append(objects[objectType], objectID)
	}
	return actorIDs, objects
}

func (e *resolverActivityPageEnricher) applyResolvedDisplays(
	ctx context.Context,
	readCtx ActivityReadContext,
	record *userstypes.ActivityRecord,
	actors map[uuid.UUID]usersactivity.ActorInfo,
	objects map[string]map[string]usersactivity.ObjectInfo,
) {
	if record.Data == nil {
		record.Data = map[string]any{}
	}
	delete(record.Data, usersactivity.DataKeyActionDisplay)
	if actionDisplay := strings.TrimSpace(e.actionLabels[strings.TrimSpace(record.Verb)]); actionDisplay != "" {
		record.Data[usersactivity.DataKeyActionDisplay] = actionDisplay
	}
	actorHint := strings.TrimSpace(toString(record.Data[usersactivity.DataKeyActorDisplay]))
	keepActorHint := e.allowHint(ctx, readCtx, *record, usersactivity.DataKeyActorDisplay, actorHint)
	if !keepActorHint {
		delete(record.Data, usersactivity.DataKeyActorDisplay)
	}
	actorID := canonicalActivityActorID(*record)
	if actorID != uuid.Nil {
		if info, ok := actors[actorID]; ok && strings.TrimSpace(info.Display) != "" {
			record.Data[usersactivity.DataKeyActorDisplay] = strings.TrimSpace(info.Display)
		} else if !keepActorHint {
			record.Data[usersactivity.DataKeyActorDisplay] = "User:" + actorID.String()
		}
	}

	objectHint := strings.TrimSpace(toString(record.Data[usersactivity.DataKeyObjectDisplay]))
	keepObjectHint := e.allowHint(ctx, readCtx, *record, usersactivity.DataKeyObjectDisplay, objectHint)
	if !keepObjectHint {
		delete(record.Data, usersactivity.DataKeyObjectDisplay)
	}
	objectType := normalizeActivityObjectType(record.ObjectType)
	objectID := strings.TrimSpace(record.ObjectID)
	if objectType == "" || objectID == "" {
		return
	}
	if info, ok := objects[objectType][objectID]; ok {
		if display := strings.TrimSpace(info.Display); display != "" {
			record.Data[usersactivity.DataKeyObjectDisplay] = display
		} else if !keepObjectHint {
			record.Data[usersactivity.DataKeyObjectDisplay] = safeObjectDisplay(objectType, objectID)
		}
		record.Data[usersactivity.DataKeyObjectDeleted] = info.Deleted
		return
	}
	if !keepObjectHint {
		record.Data[usersactivity.DataKeyObjectDisplay] = safeObjectDisplay(objectType, objectID)
	}
}

func (e *resolverActivityPageEnricher) allowHint(ctx context.Context, readCtx ActivityReadContext, record userstypes.ActivityRecord, field, value string) bool {
	return e != nil && e.hintPolicy != nil && value != "" && e.hintPolicy.AllowStoredDisplayHint(ctx, readCtx, record, field, value)
}

func canonicalActivityActorID(record userstypes.ActivityRecord) uuid.UUID {
	if record.ActorID != uuid.Nil {
		return record.ActorID
	}
	return record.UserID
}

func normalizeActivityObjectType(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizeActivityActorIDs(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(ids))
	out := make([]uuid.UUID, 0, len(ids))
	for _, id := range ids {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func safeActivityReadFallbackPage(page userstypes.ActivityPage) userstypes.ActivityPage {
	out := cloneActivityPage(page)
	for i := range out.Records {
		if out.Records[i].Data == nil {
			continue
		}
		delete(out.Records[i].Data, usersactivity.DataKeyActorDisplay)
		delete(out.Records[i].Data, usersactivity.DataKeyObjectDisplay)
		delete(out.Records[i].Data, usersactivity.DataKeyActionDisplay)
	}
	return out
}
