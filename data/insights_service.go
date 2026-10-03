package data

import (
	"context"
	"math"
	"reflect"
	"slices"
	"time"
)

func (s *Service) ExploreInsights(ctx context.Context, q ExploreInsightsQuery) (ExploreInsights, error) {
	if err := q.Validate(); err != nil {
		return ExploreInsights{}, err
	}
	if ctx == nil {
		return ExploreInsights{}, Error(CodeDenied)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	q.Selection = cloneExploreSelection(q.Selection)
	fence, err := s.beginInsightAuthorization(ctx, q.Selection)
	if err != nil {
		return ExploreInsights{}, err
	}
	b, err := s.bindExplore(ctx, q.Selection)
	if err != nil {
		return ExploreInsights{}, err
	}
	budget := InsightWork{Queries: InsightsMaxQueries, Records: InsightsMaxRecords}
	fence.bind(b)
	out, access, err := s.readInsights(ctx, b, q, &budget, fence != nil)
	if err != nil {
		return ExploreInsights{}, err
	}
	if err = s.deliverInsightGroup(ctx, []exploreBinding{b}, []ExploreAccess{access}); err != nil {
		return ExploreInsights{}, err
	}
	out.authorization = fence
	if err = s.ValidateInsightsDelivery(ctx, []ExploreInsights{out}); err != nil {
		return ExploreInsights{}, err
	}
	if err = ctx.Err(); err != nil {
		return ExploreInsights{}, err
	}
	return out, nil
}

func insightAccess(q ExploreInsightsQuery, metrics []InsightMetricDefinition) ExploreAccess {
	a := ExploreAccess{Selection: q.Selection, MetricSetID: q.MetricSetID, Coverage: true}
	for _, m := range metrics {
		a.MetricIDs = append(a.MetricIDs, m.ID)
	}
	return a
}
func (s *Service) readInsights(ctx context.Context, b exploreBinding, q ExploreInsightsQuery, budget *InsightWork, fenced bool) (ExploreInsights, ExploreAccess, error) {
	a := insightAccess(q, nil)
	empty := ExploreInsights{ExploreEnvelope: exploreEnvelope(b, ExploreUnsupported, "unknown", "unknown"), MetricSetID: q.MetricSetID, Metrics: []InsightMetric{}, Coverage: []InsightCoverage{}}
	if err := s.authorizeExplore(ctx, b, a); err != nil {
		return ExploreInsights{}, a, err
	}
	provider := s.insightProvider(q.Selection.Dataset.Provider, fenced)
	if provider == nil {
		return empty, a, nil
	}
	set, err := loadInsightSet(ctx, provider, b, q.MetricSetID)
	if err != nil {
		return ExploreInsights{}, a, err
	}
	if set == nil {
		return empty, a, nil
	}
	// An omitted set resolved to the provider's default: grants, the provider
	// query and the delivered result all name the set actually read.
	q.MetricSetID = set.ID
	a = insightAccess(q, set.Metrics)
	if err = s.authorizeExplore(ctx, b, a); err != nil {
		return ExploreInsights{}, a, err
	}
	q, err = resolveInsightWindow(q, *set)
	if err != nil {
		return ExploreInsights{}, a, err
	}
	if set.MaxQueries > budget.Queries || set.MaxRecords > budget.Records {
		return ExploreInsights{}, a, Error(CodeUnavailable)
	}
	allowance := InsightWork{Queries: set.MaxQueries, Records: set.MaxRecords}
	budget.Queries -= allowance.Queries
	budget.Records -= allowance.Records
	providerQuery := q
	providerQuery.Selection = cloneExploreSelection(q.Selection)
	out, err := provider.ExploreInsights(ctx, b.principal, b.providerRead(), providerQuery, allowance)
	if err != nil {
		return ExploreInsights{}, a, readFailure(ctx, err)
	}
	if err = ctx.Err(); err != nil {
		return ExploreInsights{}, a, err
	}
	if err = validateInsights(out, *set, q, b, allowance); err != nil {
		return ExploreInsights{}, a, err
	}
	out.ExploreEnvelope, err = providerEnvelope(b, out.ExploreEnvelope)
	if err != nil {
		return ExploreInsights{}, a, err
	}
	if err = normalizeInsights(&out, *set, q); err != nil {
		return ExploreInsights{}, a, err
	}
	return out, a, nil
}
func (s *Service) insightProvider(id string, fenced bool) InsightsProvider {
	provider, ok := s.config.Providers[id].(InsightsProvider)
	if !ok || nilValue(provider) || !fenced {
		return nil
	}
	return provider
}
func loadInsightSet(ctx context.Context, p InsightsProvider, b exploreBinding, id string) (*InsightMetricSet, error) {
	sets, err := p.InsightMetricSets(ctx, b.principal, b.providerRead())
	if err != nil {
		return nil, readFailure(ctx, err)
	}
	if len(sets) > 16 || boundedExplore(sets, ExploreMaxMetadataBytes) != nil {
		return nil, Error(CodeProvider)
	}
	var result *InsightMetricSet
	ids := map[string]bool{}
	for i := range sets {
		if !exploreID(sets[i].ID) || ids[sets[i].ID] {
			return nil, Error(CodeProvider)
		}
		ids[sets[i].ID] = true
		if sets[i].ID == id {
			result = &sets[i]
		}
	}
	if id == "" && len(sets) > 0 {
		result = &sets[0]
	}
	if result != nil {
		if err = validateMetricSet(*result); err != nil {
			return nil, err
		}
	}
	return result, nil
}
func resolveInsightWindow(q ExploreInsightsQuery, set InsightMetricSet) (ExploreInsightsQuery, error) {
	if q.From == "" {
		q.From = set.Period.Start
		q.To = set.Period.End
	}
	if q.Limit == 0 {
		q.Limit = InsightsMaxCategories
	}
	if q.InsightWindow.Validate() != nil || q.From < set.Period.Start || q.To > set.Period.End {
		return q, Error(CodeInvalid)
	}
	return q, nil
}
func normalizeInsights(out *ExploreInsights, set InsightMetricSet, q ExploreInsightsQuery) error {
	out.MetricSetID = q.MetricSetID
	out.EquivalentSchema = set.EquivalentSchema
	if out.Metrics == nil {
		out.Metrics = []InsightMetric{}
	}
	if out.Coverage == nil {
		out.Coverage = []InsightCoverage{}
	}
	if out.State == ExploreAvailable || out.State == ExploreEmpty {
		if err := fillMissingInsights(out, set, q); err != nil {
			return err
		}
	}
	if insightSuppressed(*out) {
		suppressInsights(out)
	}
	return boundedExplore(out, ExploreMaxResponseBytes)
}
func fillMissingInsights(out *ExploreInsights, set InsightMetricSet, q ExploreInsightsQuery) error {
	// Omitted values are unknown; never infer zero from a missing provider summary.
	for _, def := range set.Metrics {
		if !slices.ContainsFunc(out.Metrics, func(m InsightMetric) bool { return m.ID == def.ID }) {
			out.Metrics = append(out.Metrics, InsightMetric{InsightMetricDefinition: def, TimeScope: ExplorePeriod{Start: q.From, End: q.To, Timezone: set.Period.Timezone}, Status: "unknown", Buckets: []InsightBucket{}, SamplingMethod: "unknown"})
		}
	}
	day, err := time.Parse("2006-01-02", q.From)
	if err != nil {
		return Error(CodeInvalid)
	}
	for ; day.Format("2006-01-02") <= q.To; day = day.AddDate(0, 0, 1) {
		key := day.Format("2006-01-02")
		if !slices.ContainsFunc(out.Coverage, func(c InsightCoverage) bool { return c.LocalDay == key }) {
			out.Coverage = append(out.Coverage, InsightCoverage{LocalDay: key, Timezone: set.Period.Timezone, Status: Unavailable, Reason: "missing_coverage"})
		}
	}
	return nil
}
func insightSuppressed(out ExploreInsights) bool {
	return out.State == ExploreSuppressed || slices.ContainsFunc(out.Metrics, func(m InsightMetric) bool { return m.Status == "suppressed" }) || slices.ContainsFunc(out.Coverage, func(c InsightCoverage) bool { return c.Status == PolicySuppressed })
}
func suppressInsights(out *ExploreInsights) {
	out.State = ExploreSuppressed
	out.Reason = "policy_suppressed"
	out.Completeness = "unknown"
	out.Metrics = []InsightMetric{}
	out.Coverage = []InsightCoverage{}
	out.Work = InsightWork{}
}
func validateMetricSet(set InsightMetricSet) error {
	if len(set.Metrics) == 0 || len(set.Metrics) > InsightsMaxMetrics || set.MaxQueries < 1 || set.MaxQueries > InsightsMaxQueries {
		return Error(CodeProvider)
	}
	if set.MaxRecords < 0 || set.MaxRecords > InsightsMaxRecords || set.WorkEvidence == "" || !validInsightPeriod(set.Period) {
		return Error(CodeProvider)
	}
	ids := map[string]bool{}
	for _, m := range set.Metrics {
		if !validMetricDefinition(m) || ids[m.ID] {
			return Error(CodeProvider)
		}
		ids[m.ID] = true
	}
	return nil
}
func validMetricDefinition(m InsightMetricDefinition) bool {
	return exploreID(m.ID) && m.Label != "" && m.Unit != "" && m.Population != "" && slices.Contains([]string{"count", "sum", "distribution"}, m.Kind)
}
func validInsightPeriod(p ExplorePeriod) bool {
	if p.Start == "" || p.End == "" || p.Timezone == "" {
		return false
	}
	if (InsightWindow{From: p.Start, To: p.End}).Validate() != nil {
		return false
	}
	loc, err := time.LoadLocation(p.Timezone)
	if err != nil {
		return false
	}
	_, e1 := time.ParseInLocation("2006-01-02", p.Start, loc)
	_, e2 := time.ParseInLocation("2006-01-02", p.End, loc)
	return e1 == nil && e2 == nil
}
func insightNumber(v *float64) bool {
	return v == nil || !math.IsNaN(*v) && !math.IsInf(*v, 0) && math.Abs(*v) <= float64(MaxWireCounter)
}
func insightValue(status string, v *float64) bool {
	return slices.Contains([]string{"known", "unknown", "suppressed", "unavailable"}, status) && insightNumber(v) && ((status == "known") == (v != nil))
}
func validateInsights(out ExploreInsights, set InsightMetricSet, q ExploreInsightsQuery, b exploreBinding, allowance InsightWork) error {
	if len(out.Metrics) > InsightsMaxMetrics || len(out.Coverage) > InsightsMaxDays || !validInsightWork(out.Work, allowance) {
		return Error(CodeProvider)
	}
	if !validExploreState(out.State) || !validCompleteness(out.Completeness) || !exploreID(out.PresentationRevision) {
		return Error(CodeProvider)
	}
	if !validInsightContents(out) {
		return Error(CodeProvider)
	}
	if err := validateInsightMetrics(out, set, q); err != nil {
		return err
	}
	if err := validateInsightCoverage(out.Coverage, set, q, b); err != nil {
		return err
	}
	return boundedExplore(out, ExploreMaxResponseBytes)
}
func validInsightWork(work, allowance InsightWork) bool {
	return work.Queries >= 0 && work.Records >= 0 && work.Queries <= allowance.Queries && work.Records <= allowance.Records
}
func validateInsightMetrics(out ExploreInsights, set InsightMetricSet, q ExploreInsightsQuery) error {
	ids := map[string]bool{}
	period := ExplorePeriod{Start: q.From, End: q.To, Timezone: set.Period.Timezone}
	for _, m := range out.Metrics {
		i := slices.IndexFunc(set.Metrics, func(def InsightMetricDefinition) bool { return def.ID == m.ID })
		if i < 0 || ids[m.ID] {
			return Error(CodeProvider)
		}
		if m.InsightMetricDefinition != set.Metrics[i] || m.TimeScope != period || !validMetricValue(m, out.State) {
			return Error(CodeProvider)
		}
		if err := validateInsightBuckets(m, q.Limit); err != nil {
			return err
		}
		ids[m.ID] = true
	}
	return nil
}
func validMetricValue(m InsightMetric, state string) bool {
	if !insightValue(m.Status, m.Value) || !insightNumber(m.Denominator) || m.SamplingMethod == "" {
		return false
	}
	if m.Denominator != nil && *m.Denominator < 0 {
		return false
	}
	if state == ExploreEmpty && m.Value != nil && *m.Value != 0 {
		return false
	}
	return validCountMetric(m)
}
func validCountMetric(m InsightMetric) bool {
	return m.Kind != "count" || m.Value == nil || (*m.Value >= 0 && math.Trunc(*m.Value) == *m.Value)
}
func validateInsightBuckets(m InsightMetric, limit int) error {
	if len(m.Buckets) > limit {
		return Error(CodeProvider)
	}
	if m.Status != "known" && (m.Denominator != nil || len(m.Buckets) > 0) {
		return Error(CodeProvider)
	}
	if m.Kind != "distribution" && len(m.Buckets) > 0 {
		return Error(CodeProvider)
	}
	ids := map[string]bool{}
	for _, bucket := range m.Buckets {
		if !validInsightBucket(bucket) || ids[bucket.ID] {
			return Error(CodeProvider)
		}
		ids[bucket.ID] = true
	}
	return nil
}
func validInsightBucket(b InsightBucket) bool {
	return exploreID(b.ID) && insightValue(b.Status, b.Value) && b.Status != "suppressed" && (b.Value == nil || *b.Value >= 0)
}
func validateInsightCoverage(coverage []InsightCoverage, set InsightMetricSet, q ExploreInsightsQuery, b exploreBinding) error {
	days := map[string]bool{}
	for _, c := range coverage {
		if !validInsightDay(c, set, q) || days[c.LocalDay] {
			return Error(CodeProvider)
		}
		days[c.LocalDay] = true
		if err := validateInsightEvidence(c, b); err != nil {
			return err
		}
	}
	return nil
}
func validInsightDay(c InsightCoverage, set InsightMetricSet, q ExploreInsightsQuery) bool {
	_, err := time.Parse("2006-01-02", c.LocalDay)
	return err == nil && c.LocalDay >= q.From && c.LocalDay <= q.To && c.Timezone == set.Period.Timezone && slices.Contains([]string{"covered", CoveredEmpty, Uncovered, Partial, PolicySuppressed, Unavailable}, c.Status)
}
func validateInsightEvidence(c InsightCoverage, b exploreBinding) error {
	if !validInsightEvidenceSelection(c.Evidence, b.read.Selection) {
		return Error(CodeProvider)
	}
	if (c.Status == "covered" || c.Status == CoveredEmpty || c.Status == Partial) && c.Evidence == nil {
		return Error(CodeProvider)
	}
	if c.Status == PolicySuppressed && c.Evidence != nil {
		return Error(CodeProvider)
	}
	if c.Status == CoveredEmpty || c.Evidence != nil && c.Evidence.VerificationID != "" {
		return validateInsightVerification(c, b)
	}
	return nil
}
func validateInsightVerification(c InsightCoverage, b exploreBinding) error {
	if b.read.Receipt == nil || b.read.Receipt.Verification == nil || c.Evidence == nil {
		return Error(CodeProvider)
	}
	v := b.read.Receipt.Verification
	if !v.Passed() || v.ContentRevision != b.read.Selection.ContentRevision || c.Evidence.VerificationID != v.ID {
		return Error(CodeProvider)
	}
	if !slices.ContainsFunc(v.Coverage, func(cov Coverage) bool {
		return cov.Status == c.Status && cov.Sample.LocalDay == c.LocalDay && cov.Sample.Timezone == c.Timezone && cov.Sample.EvidenceRef == c.Evidence.Ref
	}) {
		return Error(CodeProvider)
	}
	return nil
}

// AuthorizeInsights checks the whole group's current metric/declaration grants
// after host work and validates the original read's source and policy fence.
// Transports pass their final host check to ValidateInsightsDelivery for sealing.
func (s *Service) AuthorizeInsights(ctx context.Context, results []ExploreInsights, declarations ...ExploreAccess) error {
	if ctx == nil {
		return Error(CodeDenied)
	}
	if len(results) < 1 || len(results) > 2 || len(declarations) > 2 {
		return Error(CodeInvalid)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	bindings := []exploreBinding{}
	accesses := []ExploreAccess{}
	for _, out := range results {
		// Only a result that read no set (unsupported provider, or none
		// registered) may omit it; it delivers no metrics or coverage.
		named := exploreID(out.MetricSetID) || out.MetricSetID == "" && len(out.Metrics) == 0 && len(out.Coverage) == 0
		if !named || len(out.Metrics) > InsightsMaxMetrics {
			return Error(CodeInvalid)
		}
		b, err := s.bindExplore(ctx, out.Selection)
		if err != nil {
			return err
		}
		a, err := deliveredInsightAccess(out, declarations)
		if err != nil {
			return err
		}
		bindings = append(bindings, b)
		accesses = append(accesses, a)
	}
	if err := s.deliverInsightGroup(ctx, bindings, accesses); err != nil {
		return err
	}
	return s.ValidateInsightsDelivery(ctx, results)
}
func deliveredInsightAccess(out ExploreInsights, declarations []ExploreAccess) (ExploreAccess, error) {
	a := ExploreAccess{Selection: out.Selection, MetricSetID: out.MetricSetID, Coverage: true}
	// Reauthorize exactly what was loaded, not a new capability list that might
	// omit a metric removed during host policy work.
	for _, m := range out.Metrics {
		a.MetricIDs = append(a.MetricIDs, m.ID)
	}
	seen := map[string]bool{}
	for _, declaration := range declarations {
		if declaration.Selection.Equal(out.Selection) {
			for _, id := range declaration.SurfaceIDs {
				if !exploreID(id) {
					return ExploreAccess{}, Error(CodeInvalid)
				}
				if !seen[id] {
					seen[id] = true
					a.SurfaceIDs = append(a.SurfaceIDs, id)
					if len(a.SurfaceIDs) > 32 {
						return ExploreAccess{}, Error(CodeInvalid)
					}
				}
			}
		}
	}
	return a, nil
}
func (s *Service) deliverInsightGroup(ctx context.Context, bindings []exploreBinding, accesses []ExploreAccess) error {
	for i, b := range bindings {
		current, err := s.bindExplore(ctx, b.read.Selection)
		if err != nil {
			return err
		}
		if current.principal != b.principal {
			return Error(CodeDenied)
		}
		if !reflect.DeepEqual(current.read.Receipt, b.read.Receipt) {
			return Error(CodeStale)
		}
		if err = s.authorizeExplore(ctx, current, accesses[i]); err != nil {
			return err
		}
	}
	for _, b := range bindings {
		if err := s.validateExploreBinding(ctx, b); err != nil {
			return err
		}
	}
	return ctx.Err()
}

func validInsightContents(out ExploreInsights) bool {
	return (out.State != ExploreSuppressed && out.State != ExploreUnsupported) || (len(out.Metrics) == 0 && len(out.Coverage) == 0)
}

func validInsightEvidenceSelection(e *InsightEvidence, selection ExploreSelection) bool {
	return e == nil || (selection.Context != ExploreCatalog && e.Selection.Equal(selection) && e.Ref != "")
}
