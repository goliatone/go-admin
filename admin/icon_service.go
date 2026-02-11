package admin

import (
	"context"
	"sort"
	"strings"
	"sync"
)

// IconService manages icon libraries and provides icon resolution and rendering.
type IconService struct {
	mu        sync.RWMutex
	libraries map[string]*IconLibrary
	iconIndex map[string]IconDefinition // "library:name" -> definition
	defaults  IconServiceDefaults
	renderer  *DefaultIconRenderer
	policy    IconSecurityPolicy
	logger    Logger
	enabled   bool
}

// IconServiceDefaults configures fallback behavior for icon resolution.
type IconServiceDefaults struct {
	// DefaultLibrary is used when no library prefix is specified.
	DefaultLibrary string
	// FallbackIcon is rendered when an icon cannot be resolved.
	FallbackIcon string
	// DefaultVariant is the default theme variant.
	DefaultVariant string
}

// IconServiceOption configures the icon service.
type IconServiceOption func(*IconService)

// NewIconService creates a new IconService with optional configuration.
func NewIconService(opts ...IconServiceOption) *IconService {
	svc := &IconService{
		libraries: make(map[string]*IconLibrary),
		iconIndex: make(map[string]IconDefinition),
		defaults: IconServiceDefaults{
			DefaultLibrary: DefaultIconLibrary,
			DefaultVariant: "light",
		},
		policy:  DefaultIconSecurityPolicy(),
		logger:  ensureLogger(nil),
		enabled: true,
	}

	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}

	// Create renderer with the configured policy
	svc.renderer = NewDefaultIconRenderer(svc.policy)

	return svc
}

// WithIconServiceLogger sets the logger for the icon service.
func WithIconServiceLogger(logger Logger) IconServiceOption {
	return func(s *IconService) {
		s.logger = ensureLogger(logger)
	}
}

// WithDefaultLibrary sets the default library for bare icon names.
func WithDefaultLibrary(library string) IconServiceOption {
	return func(s *IconService) {
		s.defaults.DefaultLibrary = library
	}
}

// WithFallbackIcon sets the fallback icon for unresolved references.
func WithFallbackIcon(icon string) IconServiceOption {
	return func(s *IconService) {
		s.defaults.FallbackIcon = icon
	}
}

// WithIconSecurityPolicy sets the security policy.
func WithIconSecurityPolicy(policy IconSecurityPolicy) IconServiceOption {
	return func(s *IconService) {
		s.policy = policy
	}
}

// WithDefaultVariant sets the default theme variant.
func WithDefaultVariant(variant string) IconServiceOption {
	return func(s *IconService) {
		s.defaults.DefaultVariant = variant
	}
}

// RegisterLibrary adds an icon library to the service.
func (s *IconService) RegisterLibrary(lib IconLibrary) error {
	if lib.ID == "" {
		return requiredFieldDomainError("icon library id", nil)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Store the library
	s.libraries[lib.ID] = &lib

	// Index all icons in the library
	for _, icon := range lib.Icons {
		key := lib.ID + ":" + icon.Name
		indexed := icon
		indexed.Library = lib.ID
		indexed.Trusted = lib.Trusted
		if indexed.ID == "" {
			indexed.ID = key
		}
		s.iconIndex[key] = indexed
	}

	s.logger.Debug("registered icon library",
		"id", lib.ID,
		"name", lib.Name,
		"icon_count", len(lib.Icons))

	return nil
}

// RegisterIcon adds a single icon definition, using the "custom" library if no library is specified.
func (s *IconService) RegisterIcon(icon IconDefinition) error {
	if icon.Name == "" {
		return requiredFieldDomainError("icon name", nil)
	}

	library := icon.Library
	if library == "" {
		library = "custom"
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Ensure the library exists
	if _, ok := s.libraries[library]; !ok {
		s.libraries[library] = &IconLibrary{
			ID:       library,
			Name:     strings.Title(library),
			Trusted:  true,
			Priority: 100,
		}
	}

	// Update the icon with library info
	icon.Library = library
	if icon.ID == "" {
		icon.ID = library + ":" + icon.Name
	}

	// Index the icon
	key := library + ":" + icon.Name
	s.iconIndex[key] = icon

	// Add to library's icon list
	lib := s.libraries[library]
	lib.Icons = append(lib.Icons, icon)

	return nil
}

// UnregisterLibrary removes a library and its icons from the service.
func (s *IconService) UnregisterLibrary(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	lib, ok := s.libraries[id]
	if !ok {
		return notFoundDomainError("icon library not found", map[string]any{"id": id})
	}

	// Remove all indexed icons from this library
	for _, icon := range lib.Icons {
		delete(s.iconIndex, id+":"+icon.Name)
	}

	delete(s.libraries, id)
	return nil
}

// Resolve returns the icon definition for a reference.
func (s *IconService) Resolve(ref IconReference) (*IconDefinition, error) {
	if ref.IsEmpty() {
		return nil, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	// For library icons, look up in the index
	if ref.Type == IconTypeLibrary {
		library := ref.Library
		if library == "" {
			library = s.defaults.DefaultLibrary
		}

		key := library + ":" + ref.Value
		if def, ok := s.iconIndex[key]; ok {
			return &def, nil
		}

		// Icon not found in index, but this doesn't mean it's invalid
		// (CSS libraries like Iconoir have icons we don't explicitly list)
		return nil, nil
	}

	// For other types, create a synthetic definition
	return &IconDefinition{
		ID:      ref.Raw,
		Name:    ref.Value,
		Type:    ref.Type,
		Content: ref.Value,
	}, nil
}

// ResolveString parses and resolves an icon string.
func (s *IconService) ResolveString(value string) (*IconDefinition, error) {
	ref := ParseIconReference(value)
	return s.Resolve(ref)
}

// Render produces HTML for the given icon reference.
func (s *IconService) Render(ref IconReference, opts IconRenderOptions) string {
	if ref.IsEmpty() {
		return ""
	}

	// Set default variant if not specified
	if opts.Variant == "" {
		opts.Variant = s.defaults.DefaultVariant
	}

	// Look up definition for metadata
	def, _ := s.Resolve(ref)

	return s.renderer.Render(ref, def, opts)
}

// RenderString parses and renders an icon string.
func (s *IconService) RenderString(value string, opts IconRenderOptions) string {
	ref := ParseIconReference(value)
	return s.Render(ref, opts)
}

// RenderFromString parses and renders an icon string with explicit trust and variant.
// This method satisfies the quickstart.TemplateIconRenderer interface for template integration.
func (s *IconService) RenderFromString(rawRef string, trusted bool, variant string) string {
	ref := ParseIconReference(rawRef)
	opts := IconRenderOptions{
		TrustedInput: trusted,
		Variant:      variant,
	}
	if opts.Variant == "" {
		opts.Variant = s.defaults.DefaultVariant
	}
	return s.Render(ref, opts)
}

// Libraries returns all registered libraries sorted by priority then ID.
func (s *IconService) Libraries() []IconLibrary {
	s.mu.RLock()
	defer s.mu.RUnlock()

	libs := make([]IconLibrary, 0, len(s.libraries))
	for _, lib := range s.libraries {
		libs = append(libs, *lib)
	}

	sort.Slice(libs, func(i, j int) bool {
		if libs[i].Priority != libs[j].Priority {
			return libs[i].Priority < libs[j].Priority
		}
		return libs[i].ID < libs[j].ID
	})

	return libs
}

// Library returns a library by ID.
func (s *IconService) Library(id string) (IconLibrary, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	lib, ok := s.libraries[id]
	if !ok {
		return IconLibrary{}, false
	}
	return *lib, true
}

// LibraryIcons returns icons from a specific library, optionally filtered by category.
func (s *IconService) LibraryIcons(libraryID, category string) []IconDefinition {
	s.mu.RLock()
	defer s.mu.RUnlock()

	lib, ok := s.libraries[libraryID]
	if !ok {
		return nil
	}

	if category == "" {
		return lib.Icons
	}

	// Filter by category
	filtered := make([]IconDefinition, 0)
	for _, icon := range lib.Icons {
		if icon.Category == category {
			filtered = append(filtered, icon)
		}
	}
	return filtered
}

// Search finds icons matching a query across all or specified libraries.
func (s *IconService) Search(ctx context.Context, query string, limit int, libraryIDs ...string) []IconDefinition {
	if query == "" {
		return nil
	}

	query = strings.ToLower(strings.TrimSpace(query))
	if limit <= 0 {
		limit = 50
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	results := make([]IconDefinition, 0, limit)

	// Determine which libraries to search
	var searchLibs []*IconLibrary
	if len(libraryIDs) > 0 {
		for _, id := range libraryIDs {
			if lib, ok := s.libraries[id]; ok {
				searchLibs = append(searchLibs, lib)
			}
		}
	} else {
		for _, lib := range s.libraries {
			searchLibs = append(searchLibs, lib)
		}
	}

	// Search each library
	for _, lib := range searchLibs {
		for _, icon := range lib.Icons {
			if len(results) >= limit {
				return results
			}

			// Check for context cancellation
			select {
			case <-ctx.Done():
				return results
			default:
			}

			// Match against name, label, and keywords
			if matchesQuery(icon, query) {
				results = append(results, icon)
			}
		}
	}

	return results
}

// Categories returns the categories for a library with icon counts.
func (s *IconService) Categories(libraryID string) []IconCategory {
	s.mu.RLock()
	defer s.mu.RUnlock()

	lib, ok := s.libraries[libraryID]
	if !ok {
		return nil
	}

	// Build category counts
	counts := make(map[string]int)
	for _, icon := range lib.Icons {
		if icon.Category != "" {
			counts[icon.Category]++
		}
	}

	// Update categories with counts
	categories := make([]IconCategory, len(lib.Categories))
	for i, cat := range lib.Categories {
		categories[i] = cat
		categories[i].Count = counts[cat.ID]
	}

	return categories
}

// Defaults returns the current default settings.
func (s *IconService) Defaults() IconServiceDefaults {
	return s.defaults
}

// SecurityPolicy returns the current security policy.
func (s *IconService) SecurityPolicy() IconSecurityPolicy {
	return s.policy
}

// Renderer returns the icon renderer.
func (s *IconService) Renderer() *DefaultIconRenderer {
	return s.renderer
}

// matchesQuery checks if an icon matches a search query.
func matchesQuery(icon IconDefinition, query string) bool {
	// Check name
	if strings.Contains(strings.ToLower(icon.Name), query) {
		return true
	}

	// Check label
	if strings.Contains(strings.ToLower(icon.Label), query) {
		return true
	}

	// Check keywords
	for _, keyword := range icon.Keywords {
		if strings.Contains(strings.ToLower(keyword), query) {
			return true
		}
	}

	return false
}
