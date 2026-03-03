package setup

import (
	"time"

	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-auth"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/goliatone/go-cms/pages"
	"github.com/goliatone/go-cms/themes"
	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/goliatone/go-users/registry"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// SeedUserProfile mirrors the user_profiles table for fixture loading.
type SeedUserProfile struct {
	bun.BaseModel `bun:"table:user_profiles"`

	UserID      uuid.UUID      `bun:"user_id,pk,type:uuid"`
	DisplayName string         `bun:"display_name"`
	AvatarURL   string         `bun:"avatar_url"`
	Locale      string         `bun:"locale"`
	Timezone    string         `bun:"timezone"`
	Bio         string         `bun:"bio"`
	Contact     map[string]any `bun:"contact,type:jsonb"`
	Metadata    map[string]any `bun:"metadata,type:jsonb"`
	TenantID    uuid.UUID      `bun:"tenant_id,type:uuid"`
	OrgID       uuid.UUID      `bun:"org_id,type:uuid"`
	CreatedAt   time.Time      `bun:"created_at"`
	CreatedBy   uuid.UUID      `bun:"created_by,type:uuid"`
	UpdatedAt   time.Time      `bun:"updated_at"`
	UpdatedBy   uuid.UUID      `bun:"updated_by,type:uuid"`
}

// ContentType mirrors cms content_types for environment-scoped fixture loading.
type ContentType struct {
	bun.BaseModel `bun:"table:content_types"`

	ID            uuid.UUID      `bun:",pk,type:uuid"`
	Name          string         `bun:"name"`
	Slug          string         `bun:"slug"`
	Description   string         `bun:"description"`
	Schema        map[string]any `bun:"schema,type:jsonb"`
	Capabilities  map[string]any `bun:"capabilities,type:jsonb"`
	Status        string         `bun:"status"`
	EnvironmentID uuid.UUID      `bun:"environment_id,type:uuid"`
	CreatedAt     time.Time      `bun:"created_at"`
	UpdatedAt     time.Time      `bun:"updated_at"`
}

// Content mirrors cms contents for environment-scoped fixture loading.
type Content struct {
	bun.BaseModel `bun:"table:contents"`

	ID               uuid.UUID `bun:",pk,type:uuid"`
	ContentTypeID    uuid.UUID `bun:"content_type_id,type:uuid"`
	CurrentVersion   int       `bun:"current_version"`
	PublishedVersion int       `bun:"published_version"`
	Status           string    `bun:"status"`
	Slug             string    `bun:"slug"`
	EnvironmentID    uuid.UUID `bun:"environment_id,type:uuid"`
	CreatedBy        uuid.UUID `bun:"created_by,type:uuid"`
	UpdatedBy        uuid.UUID `bun:"updated_by,type:uuid"`
	CreatedAt        time.Time `bun:"created_at"`
	UpdatedAt        time.Time `bun:"updated_at"`
}

// Page mirrors cms pages for environment-scoped fixture loading.
type Page struct {
	bun.BaseModel `bun:"table:pages"`

	ID               uuid.UUID `bun:",pk,type:uuid"`
	ContentID        uuid.UUID `bun:"content_id,type:uuid"`
	CurrentVersion   int       `bun:"current_version"`
	PublishedVersion int       `bun:"published_version"`
	TemplateID       uuid.UUID `bun:"template_id,type:uuid"`
	Slug             string    `bun:"slug"`
	Status           string    `bun:"status"`
	EnvironmentID    uuid.UUID `bun:"environment_id,type:uuid"`
	CreatedBy        uuid.UUID `bun:"created_by,type:uuid"`
	UpdatedBy        uuid.UUID `bun:"updated_by,type:uuid"`
	CreatedAt        time.Time `bun:"created_at"`
	UpdatedAt        time.Time `bun:"updated_at"`
}

// RegisterSeedModels registers Bun models used by fixture files.
func RegisterSeedModels() {
	persistence.RegisterModel(
		(*auth.User)(nil),
		(*registry.CustomRole)(nil),
		(*registry.RoleAssignment)(nil),
		(*SeedUserProfile)(nil),
		(*stores.MediaRecord)(nil),
		(*cmscontent.Locale)(nil),
		(*themes.Theme)(nil),
		(*themes.Template)(nil),
		(*ContentType)(nil),
		(*Content)(nil),
		(*cmscontent.ContentTranslation)(nil),
		(*cmscontent.ContentVersion)(nil),
		(*Page)(nil),
		(*pages.PageTranslation)(nil),
		(*pages.PageVersion)(nil),
	)
}

// RegisterSeedModelsOnDB ensures seed models are registered for a specific Bun DB.
func RegisterSeedModelsOnDB(db *bun.DB) {
	if db == nil {
		return
	}
	db.RegisterModel(
		(*auth.User)(nil),
		(*registry.CustomRole)(nil),
		(*registry.RoleAssignment)(nil),
		(*SeedUserProfile)(nil),
		(*stores.MediaRecord)(nil),
		(*cmscontent.Locale)(nil),
		(*themes.Theme)(nil),
		(*themes.Template)(nil),
		(*ContentType)(nil),
		(*Content)(nil),
		(*cmscontent.ContentTranslation)(nil),
		(*cmscontent.ContentVersion)(nil),
		(*Page)(nil),
		(*pages.PageTranslation)(nil),
		(*pages.PageVersion)(nil),
	)
}
