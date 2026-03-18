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

	UserID      uuid.UUID      `bun:"user_id,pk,type:uuid" json:"user_id"`
	DisplayName string         `bun:"display_name" json:"display_name"`
	AvatarURL   string         `bun:"avatar_url" json:"avatar_url"`
	Locale      string         `bun:"locale" json:"locale"`
	Timezone    string         `bun:"timezone" json:"timezone"`
	Bio         string         `bun:"bio" json:"bio"`
	Contact     map[string]any `bun:"contact,type:jsonb" json:"contact"`
	Metadata    map[string]any `bun:"metadata,type:jsonb" json:"metadata"`
	TenantID    uuid.UUID      `bun:"tenant_id,type:uuid" json:"tenant_id"`
	OrgID       uuid.UUID      `bun:"org_id,type:uuid" json:"org_id"`
	CreatedAt   time.Time      `bun:"created_at" json:"created_at"`
	CreatedBy   uuid.UUID      `bun:"created_by,type:uuid" json:"created_by"`
	UpdatedAt   time.Time      `bun:"updated_at" json:"updated_at"`
	UpdatedBy   uuid.UUID      `bun:"updated_by,type:uuid" json:"updated_by"`
}

// ContentType mirrors cms content_types for environment-scoped fixture loading.
type ContentType struct {
	bun.BaseModel `bun:"table:content_types"`

	ID            uuid.UUID      `bun:",pk,type:uuid" json:"id"`
	Name          string         `bun:"name" json:"name"`
	Slug          string         `bun:"slug" json:"slug"`
	Description   string         `bun:"description" json:"description"`
	Schema        map[string]any `bun:"schema,type:jsonb" json:"schema"`
	Capabilities  map[string]any `bun:"capabilities,type:jsonb" json:"capabilities"`
	Status        string         `bun:"status" json:"status"`
	EnvironmentID uuid.UUID      `bun:"environment_id,type:uuid" json:"environment_id"`
	CreatedAt     time.Time      `bun:"created_at" json:"created_at"`
	UpdatedAt     time.Time      `bun:"updated_at" json:"updated_at"`
}

// Content mirrors cms contents for environment-scoped fixture loading.
type Content struct {
	bun.BaseModel `bun:"table:contents"`

	ID               uuid.UUID `bun:",pk,type:uuid" json:"id"`
	ContentTypeID    uuid.UUID `bun:"content_type_id,type:uuid" json:"content_type_id"`
	CurrentVersion   int       `bun:"current_version" json:"current_version"`
	PublishedVersion int       `bun:"published_version" json:"published_version"`
	Status           string    `bun:"status" json:"status"`
	Slug             string    `bun:"slug" json:"slug"`
	EnvironmentID    uuid.UUID `bun:"environment_id,type:uuid" json:"environment_id"`
	CreatedBy        uuid.UUID `bun:"created_by,type:uuid" json:"created_by"`
	UpdatedBy        uuid.UUID `bun:"updated_by,type:uuid" json:"updated_by"`
	CreatedAt        time.Time `bun:"created_at" json:"created_at"`
	UpdatedAt        time.Time `bun:"updated_at" json:"updated_at"`
}

// Page mirrors cms pages for environment-scoped fixture loading.
type Page struct {
	bun.BaseModel `bun:"table:pages"`

	ID               uuid.UUID `bun:",pk,type:uuid" json:"id"`
	ContentID        uuid.UUID `bun:"content_id,type:uuid" json:"content_id"`
	CurrentVersion   int       `bun:"current_version" json:"current_version"`
	PublishedVersion int       `bun:"published_version" json:"published_version"`
	TemplateID       uuid.UUID `bun:"template_id,type:uuid" json:"template_id"`
	Slug             string    `bun:"slug" json:"slug"`
	Status           string    `bun:"status" json:"status"`
	EnvironmentID    uuid.UUID `bun:"environment_id,type:uuid" json:"environment_id"`
	CreatedBy        uuid.UUID `bun:"created_by,type:uuid" json:"created_by"`
	UpdatedBy        uuid.UUID `bun:"updated_by,type:uuid" json:"updated_by"`
	CreatedAt        time.Time `bun:"created_at" json:"created_at"`
	UpdatedAt        time.Time `bun:"updated_at" json:"updated_at"`
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
