package admin

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"github.com/goliatone/go-admin/data"
	gocommand "github.com/goliatone/go-command"
	router "github.com/goliatone/go-router"
)

type DataInsightsURLs struct {
	Insights string `json:"insights"`
	Compare  string `json:"compare"`
}

func (m *DataModule) handleInsights(c router.Context, compare bool) error {
	ctx, identity, err := m.host.request(c)
	if err != nil {
		return writeConsoleError(c, err)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	query, _, err := m.parseInsightsQuery(c, compare)
	if err != nil {
		return writeConsoleError(c, err)
	}
	if m.bus == nil {
		return writeConsoleError(c, data.Error(data.CodeUnavailable))
	}
	wire, err := json.Marshal(query)
	if err != nil {
		return writeConsoleError(c, data.Error(data.CodeInvalid))
	}
	payload := map[string]any{}
	if err = json.Unmarshal(wire, &payload); err != nil {
		return writeConsoleError(c, data.Error(data.CodeInvalid))
	}
	outcome, err := m.bus.DispatchByNameWithOutcome(ctx, query.Type(), payload, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
	if err != nil {
		return writeConsoleError(c, dataConsoleReadError(err))
	}
	if ctx, _, err = m.host.current(ctx, identity); err != nil {
		return writeConsoleError(c, err)
	}
	if err = m.authorizeInsightsResult(ctx, outcome.Result); err != nil {
		return writeConsoleError(c, dataConsoleReadError(err))
	}
	if err = m.validateInsightsDelivery(ctx, outcome.Result, func(finalCtx context.Context) (context.Context, error) {
		resolvedCtx, _, hostErr := m.host.current(finalCtx, identity)
		if hostErr != nil {
			return resolvedCtx, hostErr
		}
		if !m.host.acceptsIdentity(identity) {
			return resolvedCtx, ErrForbidden
		}
		return resolvedCtx, nil
	}); err != nil {
		return writeConsoleError(c, dataConsoleReadError(err))
	}
	return writeJSON(c, outcome.Result)
}
func (m *DataModule) validateInsightsDelivery(ctx context.Context, result any, finalCheck data.InsightDeliveryCheck) error {
	switch out := result.(type) {
	case data.ExploreInsights:
		return m.config.Service.ValidateInsightsDelivery(ctx, []data.ExploreInsights{out}, finalCheck)
	case data.SelectionComparison:
		return m.config.Service.ValidateInsightsDelivery(ctx, []data.ExploreInsights{out.Left, out.Right}, finalCheck)
	default:
		return data.Error(data.CodeProvider)
	}
}
func (m *DataModule) authorizeInsightsResult(ctx context.Context, result any) error {
	switch out := result.(type) {
	case data.ExploreInsights:
		return m.config.Service.AuthorizeInsights(ctx, []data.ExploreInsights{out})
	case data.SelectionComparison:
		left := data.ExploreAccess{Selection: out.Left.Selection}
		right := data.ExploreAccess{Selection: out.Right.Selection}
		for _, usage := range out.LeftDeclarations.Usages {
			left.SurfaceIDs = append(left.SurfaceIDs, usage.SurfaceID)
		}
		for _, usage := range out.RightDeclarations.Usages {
			right.SurfaceIDs = append(right.SurfaceIDs, usage.SurfaceID)
		}
		return m.config.Service.AuthorizeInsights(ctx, []data.ExploreInsights{out.Left, out.Right}, left, right)
	default:
		return data.Error(data.CodeProvider)
	}
}

func (m *DataModule) parseInsightsQuery(c router.Context, compare bool) (exploreQuery, string, error) {
	window := data.InsightWindow{From: c.Query("from"), To: c.Query("to")}
	if raw := c.Query("limit"); raw != "" {
		limit, err := strconv.Atoi(raw)
		if err != nil {
			return nil, "", data.Error(data.CodeInvalid)
		}
		window.Limit = limit
	}
	keys := []string{"selection"}
	if compare {
		keys = []string{"left", "right"}
	}
	selections, err := m.parseInsightSelections(c, keys)
	if err != nil {
		return nil, "", err
	}
	metricSet := c.Query("metric_set_id")
	var query exploreQuery = data.ExploreInsightsQuery{Selection: selections[0], MetricSetID: metricSet, InsightWindow: window}
	if compare {
		query = data.CompareSelectionsQuery{Left: selections[0], Right: selections[1], MetricSetID: metricSet, InsightWindow: window}
	}
	return query, metricSet, query.Validate()
}
func (m *DataModule) parseInsightSelections(c router.Context, keys []string) ([]data.ExploreSelection, error) {
	selections := []data.ExploreSelection{}
	for _, key := range keys {
		selection, err := decodeExploreSelection(c.Query(key))
		if err != nil {
			return nil, err
		}
		if selection.TargetID != m.config.TargetID {
			return nil, data.Error(data.CodeGone)
		}
		selections = append(selections, selection)
	}
	return selections, nil
}
