package admin

import (
	"github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
)

type iconsBinding struct {
	admin *Admin
}

func newIconsBinding(a *Admin) boot.IconsBinding {
	if a == nil || a.iconService == nil {
		return nil
	}
	return &iconsBinding{admin: a}
}

func (i *iconsBinding) Libraries(c router.Context) (map[string]any, error) {
	libraries := i.admin.iconService.Libraries()
	result := make([]map[string]any, len(libraries))
	for idx, lib := range libraries {
		result[idx] = map[string]any{
			"id":          lib.ID,
			"name":        lib.Name,
			"description": lib.Description,
			"version":     lib.Version,
			"cdn":         lib.CDN,
			"css_class":   lib.CSSClass,
			"render_mode": lib.RenderMode,
			"priority":    lib.Priority,
			"categories":  lib.Categories,
		}
	}
	defaults := i.admin.iconService.Defaults()
	return map[string]any{
		"libraries": result,
		"default":   defaults.DefaultLibrary,
	}, nil
}

func (i *iconsBinding) Library(c router.Context, id string) (map[string]any, error) {
	lib, ok := i.admin.iconService.Library(id)
	if !ok {
		return nil, notFoundDomainError("icon library not found", map[string]any{"id": id})
	}
	return map[string]any{
		"id":          lib.ID,
		"name":        lib.Name,
		"description": lib.Description,
		"version":     lib.Version,
		"cdn":         lib.CDN,
		"css_class":   lib.CSSClass,
		"render_mode": lib.RenderMode,
		"priority":    lib.Priority,
		"categories":  i.admin.iconService.Categories(id),
		"icon_count":  len(lib.Icons),
	}, nil
}

func (i *iconsBinding) LibraryIcons(c router.Context, libraryID, category string) ([]map[string]any, error) {
	icons := i.admin.iconService.LibraryIcons(libraryID, category)
	result := make([]map[string]any, len(icons))
	for idx, icon := range icons {
		result[idx] = map[string]any{
			"id":       icon.ID,
			"name":     icon.Name,
			"label":    icon.Label,
			"type":     icon.Type,
			"library":  icon.Library,
			"keywords": icon.Keywords,
			"category": icon.Category,
		}
	}
	return result, nil
}

func (i *iconsBinding) Search(c router.Context, query string, limit int) ([]map[string]any, error) {
	icons := i.admin.iconService.Search(c.Context(), query, limit)
	result := make([]map[string]any, len(icons))
	for idx, icon := range icons {
		result[idx] = map[string]any{
			"id":       icon.ID,
			"name":     icon.Name,
			"label":    icon.Label,
			"type":     icon.Type,
			"library":  icon.Library,
			"keywords": icon.Keywords,
			"category": icon.Category,
		}
	}
	return result, nil
}

func (i *iconsBinding) Resolve(c router.Context, value string) (map[string]any, error) {
	ref := ParseIconReference(value)
	def, err := i.admin.iconService.Resolve(ref)
	if err != nil {
		return nil, err
	}
	result := map[string]any{
		"raw":           ref.Raw,
		"type":          ref.Type,
		"library":       ref.Library,
		"value":         ref.Value,
		"qualified":     ref.Qualified,
		"legacy_mapped": ref.LegacyMapped,
	}
	if def != nil {
		result["definition"] = map[string]any{
			"id":       def.ID,
			"name":     def.Name,
			"label":    def.Label,
			"type":     def.Type,
			"library":  def.Library,
			"keywords": def.Keywords,
			"category": def.Category,
		}
	}
	return result, nil
}

func (i *iconsBinding) Render(c router.Context, value, variant string) (map[string]any, error) {
	ref := ParseIconReference(value)
	opts := RenderOptionsForAPI(false) // Untrusted by default for API requests
	if variant != "" {
		opts.Variant = variant
	}
	html := i.admin.iconService.Render(ref, opts)
	return map[string]any{
		"value":   value,
		"variant": variant,
		"html":    html,
		"type":    ref.Type,
		"library": ref.Library,
	}, nil
}
