package admin

// ensureRepositoryAdapterConfigured is the shared Phase 1 backend-availability
// guard for repository adapters.
//
// Current intentional differences between the repository adapters remain:
//   - CRUD preserves legacy query-context mutation so downstream go-crud services
//     can still inspect translated query values directly.
//   - Bun translates predicates into repository criteria and maps repository-layer
//     errors through mapBunError.
func ensureRepositoryAdapterConfigured(configured bool) error {
	if !configured {
		return ErrNotFound
	}
	return nil
}
