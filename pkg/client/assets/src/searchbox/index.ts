/**
 * SearchBox Module
 * Generic reusable typeahead search component with pluggable resolvers and renderers
 */

// Main component
export { SearchBox } from './search-box.js';

// Resolvers
export { ApiResolver, createCrudResolver } from './resolvers/api-resolver.js';
export { StaticResolver, createStaticResolver } from './resolvers/static-resolver.js';

// Renderers
export { SimpleRenderer } from './renderers/simple-renderer.js';
export { UserRenderer } from './renderers/user-renderer.js';
export { EntityRenderer } from './renderers/entity-renderer.js';

// Types
export type {
  SearchResult,
  SearchResolver,
  ResultRenderer,
  SearchBoxConfig,
  SearchBoxState,
  ApiResolverConfig,
  StaticResolverConfig,
  SimpleRendererConfig,
  UserRendererConfig,
  EntityRendererConfig,
} from './types.js';
