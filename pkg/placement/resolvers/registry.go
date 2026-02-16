package resolvers

import "strings"

// RegisteredResolver binds resolver implementation and advertised capability metadata.
type RegisteredResolver struct {
	Resolver   PlacementResolver
	Capability ResolverCapability
}

// Registry stores ordered resolver registrations.
type Registry struct {
	ordered []string
	entries map[string]RegisteredResolver
}

// NewRegistry creates an empty resolver registry.
func NewRegistry() *Registry {
	return &Registry{
		ordered: make([]string, 0),
		entries: map[string]RegisteredResolver{},
	}
}

// Register appends or replaces a resolver by ID while preserving insertion order.
func (r *Registry) Register(resolver PlacementResolver, capability ResolverCapability) {
	if r == nil || resolver == nil {
		return
	}
	id := normalizeResolverID(resolver.ID())
	if id == "" {
		return
	}
	if r.entries == nil {
		r.entries = map[string]RegisteredResolver{}
	}
	if _, exists := r.entries[id]; !exists {
		r.ordered = append(r.ordered, id)
	}
	r.entries[id] = RegisteredResolver{
		Resolver:   resolver,
		Capability: capability,
	}
}

// Resolve returns a registered resolver by ID.
func (r *Registry) Resolve(id string) (RegisteredResolver, bool) {
	if r == nil {
		return RegisteredResolver{}, false
	}
	entry, ok := r.entries[normalizeResolverID(id)]
	return entry, ok
}

// Ordered returns registered resolvers in insertion order.
func (r *Registry) Ordered() []RegisteredResolver {
	if r == nil {
		return nil
	}
	out := make([]RegisteredResolver, 0, len(r.ordered))
	for _, id := range r.ordered {
		entry, ok := r.entries[id]
		if !ok {
			continue
		}
		out = append(out, entry)
	}
	return out
}

// OrderedIDs returns ordered registered IDs.
func (r *Registry) OrderedIDs() []string {
	if r == nil {
		return nil
	}
	out := make([]string, 0, len(r.ordered))
	for _, id := range r.ordered {
		if _, ok := r.entries[id]; !ok {
			continue
		}
		out = append(out, id)
	}
	return out
}

func normalizeResolverID(id string) string {
	return strings.ToLower(strings.TrimSpace(id))
}
