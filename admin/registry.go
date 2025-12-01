package admin

// Registry is a placeholder for future registrations (panels, modules, etc.).
// It exists to keep the orchestrator API stable as we add vertical slices.
type Registry struct{}

// NewRegistry creates an empty registry.
func NewRegistry() *Registry {
	return &Registry{}
}
