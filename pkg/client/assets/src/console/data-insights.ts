// Data insights entry: composition, coverage and two-side comparison views
// for the Data console's explorer details. The Data console entry loads this
// module on demand, so a Data page that never opens insights does not pay
// for it. Values come only from bounded, server-authorized reads; this module
// never derives a domain difference itself.

export {
  COVERAGE_STATUSES,
  INSIGHT_LIMITS,
  parseComparison,
  parseInsights,
  parseMetric,
  type CoverageStatus,
  type ExploreInsights,
  type InsightBucket,
  type InsightCompatibility,
  type InsightCoverage,
  type InsightDeclarations,
  type InsightEvidence,
  type InsightKind,
  type InsightMetric,
  type InsightMetricComparison,
  type InsightPeriod,
  type InsightStatus,
  type InsightWork,
  type SelectionComparison,
} from './data-insights/contract.js';
export {
  coverageDays,
  provenanceText,
  renderComposition,
  renderCoverage,
  renderDisplayToggle,
  renderInsights,
  renderInsightsFailure,
  type InsightsDisplay,
  type InsightsEntry,
  type InsightsModel,
} from './data-insights/view.js';
export {
  CONTEXT_LABELS,
  catalogTitle,
  compareCandidates,
  defaultPair,
  describeSelection,
  renderCompare,
  type CompareCandidate,
  type CompareEntry,
  type CompareModel,
  type ComparePair,
  type ComparePrerequisite,
  type CompareSide,
  type SelectionTitle,
  type SideDescription,
} from './data-insights/compare.js';
export {
  DataInsights,
  createDataInsights,
  type DataInsightsOptions,
  type InsightsHost,
  type InsightsSection,
} from './data-insights/controller.js';
export {
  createHTTPInsightsTransport,
  type InsightsRoutes,
  type InsightsTransport,
} from './data-insights/transport.js';
export {
  CompareSession,
  InsightsSession,
  WITHDRAWING,
  pairKey,
  type CompareRead,
  type InsightsRead,
} from './data-insights/session.js';
