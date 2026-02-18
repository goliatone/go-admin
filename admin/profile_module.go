package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"

	urlkit "github.com/goliatone/go-urlkit"
)

const profileModuleID = "profile"

// ProfileModule registers a user profile panel and navigation entry.
// Feature-gated via FeatureProfile and backed by ProfileService.
type ProfileModule struct {
	basePath         string
	menuCode         string
	defaultLocale    string
	viewPermission   string
	updatePermission string
	menuParent       string
	skipMenu         bool
	urls             urlkit.Resolver
}

// NewProfileModule constructs the default profile module.
func NewProfileModule() *ProfileModule {
	return &ProfileModule{}
}

func (m *ProfileModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             profileModuleID,
		NameKey:        "modules.profile.name",
		DescriptionKey: "modules.profile.description",
		FeatureFlags:   []string{string(FeatureProfile)},
	}
}

func (m *ProfileModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceNotConfiguredDomainError("admin", map[string]any{"component": "profile_module"})
	}
	if ctx.Admin.profile == nil {
		return FeatureDisabledError{Feature: string(FeatureProfile)}
	}
	if m.basePath == "" {
		m.basePath = ctx.Admin.config.BasePath
	}
	if m.menuCode == "" {
		m.menuCode = ctx.Admin.navMenuCode
	}
	if m.defaultLocale == "" {
		m.defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if m.viewPermission == "" {
		m.viewPermission = ctx.Admin.config.ProfilePermission
	}
	if m.updatePermission == "" {
		m.updatePermission = ctx.Admin.config.ProfileUpdatePermission
	}
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}

	repo := NewProfileRepository(ctx.Admin.profile, m.defaultLocale)
	avatarHidden := !featureEnabled(ctx.Admin.featureGate, FeatureMedia)
	builder := ctx.Admin.Panel(profileModuleID).
		WithRepository(repo).
		WithEntryMode(PanelEntryModeDetailCurrentUser).
		ListFields(
			Field{Name: profileKeyDisplayName, Label: "Name", Type: "text"},
			Field{Name: profileKeyEmail, Label: "Email", Type: "email"},
			Field{Name: profileKeyLocale, Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: profileKeyDisplayName, Label: "Name", Type: "text", Required: true},
			Field{Name: profileKeyEmail, Label: "Email", Type: "email", Required: true},
			Field{Name: profileKeyAvatarURL, Label: "Avatar URL", Type: "text"},
			Field{Name: profileKeyAvatar, Label: "Avatar", Type: "media", Hidden: avatarHidden},
			Field{Name: profileKeyLocale, Label: "Locale", Type: "text"},
			Field{Name: profileKeyTimezone, Label: "Timezone", Type: "text"},
			Field{Name: profileKeyBio, Label: "Bio", Type: "textarea"},
		).
		DetailFields(
			Field{Name: profileKeyDisplayName, Label: "Name", Type: "text"},
			Field{Name: profileKeyEmail, Label: "Email", Type: "email"},
			Field{Name: profileKeyAvatarURL, Label: "Avatar URL", Type: "text"},
			Field{Name: profileKeyLocale, Label: "Locale", Type: "text"},
			Field{Name: profileKeyTimezone, Label: "Timezone", Type: "text"},
			Field{Name: profileKeyBio, Label: "Bio", Type: "textarea"},
		).
		Permissions(PanelPermissions{
			View:   m.viewPermission,
			Create: m.updatePermission,
			Edit:   m.updatePermission,
			Delete: m.updatePermission,
		})

	if _, err := ctx.Admin.RegisterPanel(profileModuleID, builder); err != nil {
		return err
	}
	return nil
}

func (m *ProfileModule) MenuItems(locale string) []MenuItem {
	if m.skipMenu {
		return nil
	}
	if locale == "" {
		locale = m.defaultLocale
	}
	path := resolveURLWith(m.urls, "admin", profileModuleID, nil, nil)
	return []MenuItem{
		{
			Label:       "Profile",
			LabelKey:    "menu.profile",
			Icon:        "user",
			Target:      map[string]any{"type": "url", "path": path, "key": profileModuleID},
			Permissions: []string{m.viewPermission},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    primitives.Int(55),
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the profile navigation under a parent menu item ID.
func (m *ProfileModule) WithMenuParent(parent string) *ProfileModule {
	m.menuParent = parent
	return m
}

// WithSkipMenu suppresses navigation menu contribution while keeping panel registration.
func (m *ProfileModule) WithSkipMenu(skip bool) *ProfileModule {
	m.skipMenu = skip
	return m
}

// ProfileRepository adapts ProfileService to the panel Repository contract.
type ProfileRepository struct {
	service       *ProfileService
	defaultLocale string
}

// NewProfileRepository constructs a repository backed by ProfileService.
func NewProfileRepository(service *ProfileService, defaultLocale string) *ProfileRepository {
	return &ProfileRepository{service: service, defaultLocale: defaultLocale}
}

func (r *ProfileRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	_ = opts
	userID := userIDFromContext(ctx)
	if r.service == nil {
		return nil, 0, FeatureDisabledError{Feature: string(FeatureProfile)}
	}
	if userID == "" {
		return nil, 0, ErrForbidden
	}
	profile, err := r.service.Get(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	return []map[string]any{r.recordFromProfile(r.applyDefaults(profile))}, 1, nil
}

func (r *ProfileRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	userID := userIDFromContext(ctx)
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureProfile)}
	}
	if userID == "" || (id != "" && id != userID) {
		return nil, ErrForbidden
	}
	profile, err := r.service.Get(ctx, userID)
	if err != nil {
		return nil, err
	}
	return r.recordFromProfile(r.applyDefaults(profile)), nil
}

func (r *ProfileRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.Update(ctx, userIDFromContext(ctx), record)
}

func (r *ProfileRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	userID := userIDFromContext(ctx)
	if r.service == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureProfile)}
	}
	if userID == "" || (id != "" && id != userID) {
		return nil, ErrForbidden
	}
	profile := r.profileFromRecord(record)
	updated, err := r.service.Save(ctx, userID, profile)
	if err != nil {
		return nil, err
	}
	return r.recordFromProfile(r.applyDefaults(updated)), nil
}

func (r *ProfileRepository) Delete(ctx context.Context, id string) error {
	_ = ctx
	_ = id
	return ErrForbidden
}

func (r *ProfileRepository) applyDefaults(profile UserProfile) UserProfile {
	return applyUserProfileDefaults(profile, r.defaultLocale)
}

func (r *ProfileRepository) recordFromProfile(profile UserProfile) map[string]any {
	return userProfileToRecord(profile)
}

func (r *ProfileRepository) profileFromRecord(record map[string]any) UserProfile {
	return userProfileFromRecord(record)
}
