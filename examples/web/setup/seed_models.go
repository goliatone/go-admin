package setup

import (
	"time"

	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-auth"
	"github.com/goliatone/go-cms/content"
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

// RegisterSeedModels registers Bun models used by fixture files.
func RegisterSeedModels() {
	persistence.RegisterModel(
		(*auth.User)(nil),
		(*registry.CustomRole)(nil),
		(*registry.RoleAssignment)(nil),
		(*SeedUserProfile)(nil),
		(*stores.MediaRecord)(nil),
		(*content.Locale)(nil),
		(*themes.Theme)(nil),
		(*themes.Template)(nil),
		(*content.ContentType)(nil),
		(*content.Content)(nil),
		(*content.ContentTranslation)(nil),
		(*content.ContentVersion)(nil),
		(*pages.Page)(nil),
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
		(*content.Locale)(nil),
		(*themes.Theme)(nil),
		(*themes.Template)(nil),
		(*content.ContentType)(nil),
		(*content.Content)(nil),
		(*content.ContentTranslation)(nil),
		(*content.ContentVersion)(nil),
		(*pages.Page)(nil),
		(*pages.PageTranslation)(nil),
		(*pages.PageVersion)(nil),
	)
}
