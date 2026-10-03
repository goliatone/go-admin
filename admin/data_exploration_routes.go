package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"strconv"
	"time"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/console"
	"github.com/goliatone/go-admin/data"
	gocommand "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
)

type DataExplorationURLs struct {
	Insights string `json:"-"`
	Compare  string `json:"-"`
	Metadata string `json:"metadata"`
	Samples  string `json:"samples"`
	Related  string `json:"related"`
}

func (m *DataModule) explorationContract(contract routing.ModuleContract) routing.ModuleContract {
	for _, key := range []string{"metadata", "samples", "related", "insights", "compare"} {
		contract.UIRouteDeclarations["data.explore."+key] = routing.RouteDeclaration{Method: router.GET, Path: "api/explore/" + key}
	}
	return contract
}
func (m *DataModule) resolveExplorationRoutes(ctx ModuleContext) (DataExplorationURLs, error) {
	paths := DataExplorationURLs{Insights: ctx.Routing.RoutePath(routing.SurfaceUI, "data.explore.insights"), Compare: ctx.Routing.RoutePath(routing.SurfaceUI, "data.explore.compare"), Metadata: ctx.Routing.RoutePath(routing.SurfaceUI, "data.explore.metadata"), Samples: ctx.Routing.RoutePath(routing.SurfaceUI, "data.explore.samples"), Related: ctx.Routing.RoutePath(routing.SurfaceUI, "data.explore.related")}
	if paths.Insights == "" || paths.Compare == "" || paths.Metadata == "" || paths.Samples == "" || paths.Related == "" {
		return paths, data.Error(data.CodeInvalid)
	}
	return paths, nil
}
func (m *DataModule) registerExplorationRoutes(ctx ModuleContext, urls DataExplorationURLs) {
	ctx.ProtectedRouter.Get(urls.Insights, m.host.guard(func(c router.Context) error { return m.handleInsights(c, false) }))
	ctx.ProtectedRouter.Get(urls.Compare, m.host.guard(func(c router.Context) error { return m.handleInsights(c, true) }))
	ctx.ProtectedRouter.Get(urls.Metadata, m.host.guard(func(c router.Context) error { return m.handleExplore(c, "metadata") }))
	ctx.ProtectedRouter.Get(urls.Samples, m.host.guard(func(c router.Context) error { return m.handleExplore(c, "samples") }))
	ctx.ProtectedRouter.Get(urls.Related, m.host.guard(func(c router.Context) error { return m.handleExplore(c, "related") }))
}
func decodeExploreSelection(raw string) (data.ExploreSelection, error) {
	var selection data.ExploreSelection
	if len(raw) == 0 || len(raw) > data.ExploreMaxSelectionBytes {
		return selection, data.Error(data.CodeInvalid)
	}
	dec := json.NewDecoder(bytes.NewBufferString(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&selection); err != nil {
		return selection, data.Error(data.CodeInvalid)
	}
	var extra any
	if err := dec.Decode(&extra); !errors.Is(err, io.EOF) {
		return selection, data.Error(data.CodeInvalid)
	}
	return selection, selection.Validate()
}
func (m *DataModule) handleExplore(c router.Context, kind string) error {
	ctx, identity, err := m.host.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	selection, err := decodeExploreSelection(c.Query("selection"))
	if err != nil {
		return writeConsoleError(c, err)
	}
	if selection.TargetID != m.config.TargetID {
		return writeConsoleError(c, data.Error(data.CodeGone))
	}
	var query exploreQuery = data.ExploreMetadataQuery{Selection: selection}
	if kind != "metadata" {
		limit := 0
		if value := c.Query("limit"); value != "" {
			limit, err = strconv.Atoi(value)
			if err != nil {
				return writeConsoleError(c, data.Error(data.CodeInvalid))
			}
		}
		samples := data.ExploreSamplesQuery{Selection: selection, EntityID: c.Query("entity_id"), Cursor: c.Query("cursor"), Limit: limit}
		if kind == "related" {
			query = data.ExploreRelatedQuery{ExploreSamplesQuery: samples, RecordKey: c.Query("record_key"), RelationshipID: c.Query("relationship_id")}
		} else {
			query = samples
		}
	}
	if err = query.Validate(); err != nil {
		return writeConsoleError(c, err)
	}
	encoded, err := json.Marshal(query)
	if err != nil {
		return writeConsoleError(c, data.Error(data.CodeInvalid))
	}
	payload := map[string]any{}
	if err = json.Unmarshal(encoded, &payload); err != nil {
		return writeConsoleError(c, data.Error(data.CodeInvalid))
	}
	if m.bus == nil {
		return writeConsoleError(c, data.Error(data.CodeUnavailable))
	}
	outcome, err := m.bus.DispatchByNameWithOutcome(ctx, query.Type(), payload, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	if err != nil {
		return writeConsoleError(c, dataConsoleReadError(err))
	}
	// Host identity/feature revocation is independent of service/domain grants.
	if ctx, _, err = m.host.current(ctx, identity); err != nil {
		return writeConsoleError(c, err)
	}
	if err = m.authorizeExplorationResult(ctx, outcome.Result, query); err != nil {
		return writeConsoleError(c, dataConsoleReadError(err))
	}
	// Domain authorization can perform I/O. Refresh the trusted session after
	// that work, then check the feature/shutdown gate without another callback.
	if _, _, err = m.host.current(ctx, identity); err != nil {
		return writeConsoleError(c, err)
	}
	if !m.host.acceptsIdentity(identity) {
		return writeConsoleError(c, ErrForbidden)
	}
	return writeJSON(c, outcome.Result)
}
func (m *DataModule) explorationPageRenderer(adm *Admin, urls DataExplorationURLs) func(router.Context, console.Bootstrap) error {
	renderer := ConsolePageRenderer(adm, DataPageTemplate, AdminPageChrome{})
	return func(c router.Context, bootstrap console.Bootstrap) error {
		if bootstrap.Extensions == nil {
			bootstrap.Extensions = map[string]any{}
		}
		bootstrap.Extensions["data_explorer"] = urls
		if urls.Insights != "" && urls.Compare != "" {
			bootstrap.Extensions["data_insights"] = DataInsightsURLs{Insights: urls.Insights, Compare: urls.Compare}
		}
		return renderer(c, bootstrap)
	}
}

func (m *DataModule) authorizeExplorationResult(ctx context.Context, result any, query exploreQuery) error {
	switch out := result.(type) {
	case data.ExploreMetadata:
		access := data.ExploreAccess{Selection: out.Selection}
		for _, usage := range out.Usages {
			access.SurfaceIDs = append(access.SurfaceIDs, usage.SurfaceID)
		}
		accesses := []data.ExploreAccess{access}
		for _, entity := range out.Entities {
			entityAccess := data.ExploreAccess{Selection: out.Selection, EntityID: entity.ID, SurfaceIDs: access.SurfaceIDs}
			for _, field := range entity.Fields {
				entityAccess.Fields = append(entityAccess.Fields, field.ID)
			}
			accesses = append(accesses, entityAccess)
		}
		return m.config.Service.AuthorizeExploration(ctx, accesses[0], accesses[1:]...)
	case data.ExploreSamples:
		access := data.ExploreAccess{Selection: out.Selection, EntityID: out.EntityID}
		if related, ok := query.(data.ExploreRelatedQuery); ok {
			access.SourceEntityID = related.EntityID
			access.RecordKey = related.RecordKey
			access.RelationshipID = related.RelationshipID
		}
		for _, field := range out.Columns {
			access.Fields = append(access.Fields, field.ID)
		}
		for _, row := range out.Rows {
			access.RecordKeys = append(access.RecordKeys, row.RecordKey)
		}
		return m.config.Service.AuthorizeExploration(ctx, access)
	default:
		return data.Error(data.CodeProvider)
	}
}
