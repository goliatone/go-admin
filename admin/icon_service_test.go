package admin

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewIconService(t *testing.T) {
	svc := NewIconService()

	assert.NotNil(t, svc)
	assert.NotNil(t, svc.renderer)
	assert.Equal(t, DefaultIconLibrary, svc.defaults.DefaultLibrary)
}

func TestNewIconService_WithOptions(t *testing.T) {
	svc := NewIconService(
		WithDefaultLibrary("lucide"),
		WithFallbackIcon("question-mark"),
		WithDefaultVariant("dark"),
	)

	assert.Equal(t, "lucide", svc.defaults.DefaultLibrary)
	assert.Equal(t, "question-mark", svc.defaults.FallbackIcon)
	assert.Equal(t, "dark", svc.defaults.DefaultVariant)
}

func TestIconService_RegisterLibrary(t *testing.T) {
	svc := NewIconService()

	lib := IconLibrary{
		ID:      "test-lib",
		Name:    "Test Library",
		Trusted: true,
		Icons: []IconDefinition{
			{Name: "icon1", Label: "Icon 1"},
			{Name: "icon2", Label: "Icon 2"},
		},
	}

	err := svc.RegisterLibrary(lib)
	require.NoError(t, err)

	// Verify library is registered
	result, ok := svc.Library("test-lib")
	assert.True(t, ok)
	assert.Equal(t, "Test Library", result.Name)
	assert.Len(t, result.Icons, 2)
}

func TestIconService_RegisterLibrary_EmptyID(t *testing.T) {
	svc := NewIconService()

	lib := IconLibrary{Name: "No ID"}
	err := svc.RegisterLibrary(lib)

	assert.Error(t, err)
}

func TestIconService_RegisterIcon(t *testing.T) {
	svc := NewIconService()

	icon := IconDefinition{
		Name:     "my-icon",
		Label:    "My Icon",
		Type:     IconTypeLibrary,
		Category: "custom",
	}

	err := svc.RegisterIcon(icon)
	require.NoError(t, err)

	// Icon should be indexed
	def, err := svc.ResolveString("custom:my-icon")
	require.NoError(t, err)
	assert.NotNil(t, def)
	assert.Equal(t, "my-icon", def.Name)
}

func TestIconService_RegisterIcon_EmptyName(t *testing.T) {
	svc := NewIconService()

	icon := IconDefinition{Label: "No Name"}
	err := svc.RegisterIcon(icon)

	assert.Error(t, err)
}

func TestIconService_UnregisterLibrary(t *testing.T) {
	svc := NewIconService()

	lib := IconLibrary{
		ID:   "temp-lib",
		Name: "Temporary",
		Icons: []IconDefinition{
			{Name: "temp-icon"},
		},
	}
	_ = svc.RegisterLibrary(lib)

	err := svc.UnregisterLibrary("temp-lib")
	require.NoError(t, err)

	_, ok := svc.Library("temp-lib")
	assert.False(t, ok)
}

func TestIconService_UnregisterLibrary_NotFound(t *testing.T) {
	svc := NewIconService()

	err := svc.UnregisterLibrary("nonexistent")
	assert.Error(t, err)
}

func TestIconService_Resolve_LibraryIcon(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(IconLibrary{
		ID: "iconoir",
		Icons: []IconDefinition{
			{Name: "home", Label: "Home"},
		},
	})

	ref := IconReference{Type: IconTypeLibrary, Library: "iconoir", Value: "home", Raw: "iconoir:home"}
	def, err := svc.Resolve(ref)

	require.NoError(t, err)
	require.NotNil(t, def, "Resolve should return a definition for registered icons")
	assert.Equal(t, "home", def.Name)
}

func TestIconService_Resolve_LibraryIconNotInIndex(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(IconLibrary{
		ID:    "iconoir",
		Icons: []IconDefinition{},
	})

	// Resolve an icon that's not in the index (CSS library pattern)
	ref := IconReference{Type: IconTypeLibrary, Library: "iconoir", Value: "unknown-icon", Raw: "iconoir:unknown-icon"}
	def, err := svc.Resolve(ref)

	// Should not error, but def may be nil for CSS-only libraries
	assert.NoError(t, err)
	assert.Nil(t, def)
}

func TestIconService_Resolve_EmptyRef(t *testing.T) {
	svc := NewIconService()

	ref := IconReference{}
	def, err := svc.Resolve(ref)

	assert.NoError(t, err)
	assert.Nil(t, def)
}

func TestIconService_Resolve_SyntheticDefinition(t *testing.T) {
	svc := NewIconService()

	ref := IconReference{Type: IconTypeEmoji, Value: "🏠", Raw: "🏠"}
	def, err := svc.Resolve(ref)

	require.NoError(t, err)
	assert.NotNil(t, def)
	assert.Equal(t, IconTypeEmoji, def.Type)
	assert.Equal(t, "🏠", def.Name)
}

func TestIconService_Render_LibraryIcon(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(IconLibrary{
		ID:       "iconoir",
		CSSClass: "iconoir",
		Icons: []IconDefinition{
			{Name: "home"},
		},
	})

	ref := IconReference{Type: IconTypeLibrary, Library: "iconoir", Value: "home", Raw: "iconoir:home"}
	html := svc.Render(ref, IconRenderOptions{})

	assert.Contains(t, html, "iconoir-home")
	assert.Contains(t, html, "<i ")
}

func TestIconService_Render_Emoji(t *testing.T) {
	svc := NewIconService()

	ref := IconReference{Type: IconTypeEmoji, Value: "🏠", Raw: "emoji:🏠"}
	html := svc.Render(ref, IconRenderOptions{})

	assert.Contains(t, html, "🏠")
	assert.Contains(t, html, "<span")
}

func TestIconService_RenderString(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(BuiltinIconoirLibrary())

	html := svc.RenderString("home", IconRenderOptions{})
	assert.Contains(t, html, "iconoir-home")
}

func TestIconService_RenderFromString(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(BuiltinIconoirLibrary())

	html := svc.RenderFromString("iconoir:home", false, "light")
	assert.Contains(t, html, "iconoir-home")
}

func TestIconService_Libraries(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(IconLibrary{ID: "lib-a", Priority: 20})
	_ = svc.RegisterLibrary(IconLibrary{ID: "lib-b", Priority: 10})
	_ = svc.RegisterLibrary(IconLibrary{ID: "lib-c", Priority: 30})

	libs := svc.Libraries()

	require.Len(t, libs, 3)
	// Should be sorted by priority
	assert.Equal(t, "lib-b", libs[0].ID)
	assert.Equal(t, "lib-a", libs[1].ID)
	assert.Equal(t, "lib-c", libs[2].ID)
}

func TestIconService_LibraryIcons(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(IconLibrary{
		ID: "test",
		Icons: []IconDefinition{
			{Name: "icon1", Category: "nav"},
			{Name: "icon2", Category: "nav"},
			{Name: "icon3", Category: "action"},
		},
	})

	// All icons
	all := svc.LibraryIcons("test", "")
	assert.Len(t, all, 3)

	// Filtered by category
	nav := svc.LibraryIcons("test", "nav")
	assert.Len(t, nav, 2)
}

func TestIconService_Search(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(IconLibrary{
		ID: "test",
		Icons: []IconDefinition{
			{Name: "home", Label: "Home", Keywords: []string{"house", "building"}},
			{Name: "user", Label: "User", Keywords: []string{"person", "account"}},
			{Name: "settings", Label: "Settings", Keywords: []string{"gear", "config"}},
		},
	})

	ctx := context.Background()

	// Search by name
	results := svc.Search(ctx, "home", 10)
	assert.Len(t, results, 1)
	assert.Equal(t, "home", results[0].Name)

	// Search by keyword
	results = svc.Search(ctx, "gear", 10)
	assert.Len(t, results, 1)
	assert.Equal(t, "settings", results[0].Name)

	// Search by label
	results = svc.Search(ctx, "user", 10)
	assert.Len(t, results, 1)
}

func TestIconService_Search_Limit(t *testing.T) {
	svc := NewIconService()
	icons := make([]IconDefinition, 20)
	for i := range icons {
		icons[i] = IconDefinition{Name: "icon", Label: "Icon"}
	}
	_ = svc.RegisterLibrary(IconLibrary{ID: "test", Icons: icons})

	ctx := context.Background()
	results := svc.Search(ctx, "icon", 5)

	assert.Len(t, results, 5)
}

func TestIconService_Categories(t *testing.T) {
	svc := NewIconService()
	_ = svc.RegisterLibrary(IconLibrary{
		ID: "test",
		Categories: []IconCategory{
			{ID: "nav", Label: "Navigation"},
			{ID: "action", Label: "Actions"},
		},
		Icons: []IconDefinition{
			{Name: "home", Category: "nav"},
			{Name: "user", Category: "nav"},
			{Name: "save", Category: "action"},
		},
	})

	cats := svc.Categories("test")

	require.Len(t, cats, 2)
	assert.Equal(t, "nav", cats[0].ID)
	assert.Equal(t, 2, cats[0].Count)
	assert.Equal(t, "action", cats[1].ID)
	assert.Equal(t, 1, cats[1].Count)
}

func TestIconService_Defaults(t *testing.T) {
	svc := NewIconService(
		WithDefaultLibrary("lucide"),
		WithDefaultVariant("dark"),
	)

	defaults := svc.Defaults()

	assert.Equal(t, "lucide", defaults.DefaultLibrary)
	assert.Equal(t, "dark", defaults.DefaultVariant)
}

func TestIconService_SecurityPolicy(t *testing.T) {
	customPolicy := IconSecurityPolicy{
		AllowUntrustedCustom: true,
		MaxSVGBytes:          1024,
	}

	svc := NewIconService(WithIconSecurityPolicy(customPolicy))
	policy := svc.SecurityPolicy()

	assert.True(t, policy.AllowUntrustedCustom)
	assert.Equal(t, 1024, policy.MaxSVGBytes)
}
