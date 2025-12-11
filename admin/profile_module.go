package admin

import (
	"context"
	"errors"
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
		return errors.New("admin is nil")
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

	repo := NewProfileRepository(ctx.Admin.profile, m.defaultLocale)
	avatarHidden := !ctx.Admin.gates.Enabled(FeatureMedia)
	builder := ctx.Admin.Panel(profileModuleID).
		WithRepository(repo).
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
	if locale == "" {
		locale = m.defaultLocale
	}
	path := joinPath(m.basePath, profileModuleID)
	return []MenuItem{
		{
			Label:       "Profile",
			LabelKey:    "menu.profile",
			Icon:        "user",
			Target:      map[string]any{"type": "url", "path": path, "key": profileModuleID},
			Permissions: []string{m.viewPermission},
			Menu:        m.menuCode,
			Locale:      locale,
			Position:    55,
			ParentID:    m.menuParent,
		},
	}
}

// WithMenuParent nests the profile navigation under a parent menu item ID.
func (m *ProfileModule) WithMenuParent(parent string) *ProfileModule {
	m.menuParent = parent
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
	if profile.Locale == "" {
		profile.Locale = r.defaultLocale
	}
	return profile
}

func (r *ProfileRepository) recordFromProfile(profile UserProfile) map[string]any {
	record := map[string]any{
		"id":                  profile.UserID,
		profileKeyDisplayName: profile.DisplayName,
		profileKeyEmail:       profile.Email,
		profileKeyAvatarURL:   profile.AvatarURL,
		profileKeyLocale:      profile.Locale,
		profileKeyTimezone:    profile.Timezone,
		profileKeyBio:         profile.Bio,
	}
	if len(profile.Contact) > 0 {
		record["contact"] = cloneAnyMap(profile.Contact)
	}
	if len(profile.Metadata) > 0 {
		record["metadata"] = cloneAnyMap(profile.Metadata)
		if avatar := extractMap(profile.Metadata[profileKeyAvatar]); len(avatar) > 0 {
			record[profileKeyAvatar] = cloneAnyMap(avatar)
		}
	}
	return record
}

func (r *ProfileRepository) profileFromRecord(record map[string]any) UserProfile {
	profile := UserProfile{
		Raw: cloneAnyMap(record),
	}
	if val, ok := record[profileKeyDisplayName]; ok {
		profile.DisplayName = toString(val)
	}
	if val, ok := record[profileKeyEmail]; ok {
		profile.Email = toString(val)
	}
	if val, ok := record[profileKeyAvatarURL]; ok {
		profile.AvatarURL = toString(val)
	}
	if val, ok := record[profileKeyLocale]; ok {
		profile.Locale = toString(val)
	}
	if val, ok := record[profileKeyTimezone]; ok {
		profile.Timezone = toString(val)
	}
	if val, ok := record[profileKeyBio]; ok {
		profile.Bio = toString(val)
	}
	if contact := extractMap(record["contact"]); len(contact) > 0 {
		profile.Contact = cloneAnyMap(contact)
	}
	if metadata := extractMap(record["metadata"]); len(metadata) > 0 {
		profile.Metadata = cloneAnyMap(metadata)
	}
	if avatar := extractMap(record[profileKeyAvatar]); len(avatar) > 0 {
		if profile.Metadata == nil {
			profile.Metadata = map[string]any{}
		}
		profile.Metadata[profileKeyAvatar] = cloneAnyMap(avatar)
	}
	return profile
}
