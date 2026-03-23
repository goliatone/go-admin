export {
  SourceDetailPageController,
  bootstrapSourceDetailPage,
  registerPageController,
  type SourceDetailPageConfig,
} from '../source-management-pages.js';

export {
  adaptSourceDetail,
  type SourceDetailViewModel,
} from '../source-management-adapters.js';

export {
  resolveSourceDetailRenderingState,
  type PageRenderingStateKind,
  type RenderingStateMetadata,
  type LoadingStateViewModel,
  type PartialDataStateViewModel,
  type ErrorStateViewModel,
  type UnauthorizedStateViewModel,
  type DegradedStateViewModel,
} from '../source-management-rendering-states.js';
