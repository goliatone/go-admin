package setup

import (
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
)

// NewUserPanelBuilder creates a panel builder for users
func NewUserPanelBuilder(store *stores.UserStore) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "username", Label: "Username", Type: "text"},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "role", Label: "Role", Type: "select", Options: []admin.Option{
				{Value: "admin", Label: "Administrator"},
				{Value: "editor", Label: "Editor"},
				{Value: "viewer", Label: "Viewer"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "active", Label: "Active"},
				{Value: "pending", Label: "Pending"},
				{Value: "suspended", Label: "Suspended"},
				{Value: "disabled", Label: "Disabled"},
				{Value: "archived", Label: "Archived"},
			}},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "username", Label: "Username", Type: "text", Required: true},
			admin.Field{Name: "email", Label: "Email", Type: "email", Required: true},
			admin.Field{Name: "role", Label: "Role", Type: "select", Required: true, Options: []admin.Option{
				{Value: "admin", Label: "Administrator"},
				{Value: "editor", Label: "Editor"},
				{Value: "viewer", Label: "Viewer"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "active", Label: "Active"},
				{Value: "pending", Label: "Pending"},
				{Value: "suspended", Label: "Suspended"},
				{Value: "disabled", Label: "Disabled"},
				{Value: "archived", Label: "Archived"},
			}},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "username", Label: "Username", Type: "text"},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "role", Label: "Role", Type: "text"},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime", ReadOnly: true},
			admin.Field{Name: "last_login", Label: "Last Login", Type: "datetime", ReadOnly: true},
		).
		Tabs(
			admin.PanelTab{
				ID:         "details",
				Label:      "Details",
				Icon:       "user",
				Position:   0,
				Scope:      admin.PanelTabScopeDetail,
				Permission: "admin.users.view",
				Target:     admin.PanelTabTarget{Type: "panel", Panel: "users"},
			},
		).
		Filters(
			admin.Filter{Name: "role", Type: "select"},
			admin.Filter{Name: "status", Type: "select"},
		).
		Actions(
			admin.Action{Name: "activate", CommandName: "users.activate", Permission: "admin.users.edit"},
			admin.Action{Name: "suspend", CommandName: "users.suspend", Permission: "admin.users.edit"},
			admin.Action{Name: "disable", CommandName: "users.disable", Permission: "admin.users.edit"},
			admin.Action{Name: "archive", CommandName: "users.archive", Permission: "admin.users.delete"},
		).
		BulkActions(
			admin.Action{Name: "activate", Label: "Activate", Icon: "check-circle", Confirm: "Activate {count} user(s)?", CommandName: "users.activate", Permission: "admin.users.edit"},
			admin.Action{Name: "suspend", Label: "Suspend", Icon: "pause", Confirm: "Suspend {count} user(s)?", CommandName: "users.suspend", Permission: "admin.users.edit"},
			admin.Action{Name: "disable", Label: "Disable", Icon: "x-circle", Confirm: "Disable {count} user(s)?", Variant: "danger", CommandName: "users.disable", Permission: "admin.users.edit", Overflow: true},
			admin.Action{Name: "archive", Label: "Archive", Icon: "archive", Confirm: "Archive {count} user(s)?", Variant: "danger", CommandName: "users.archive", Permission: "admin.users.delete", Overflow: true},
		).
		Permissions(admin.PanelPermissions{
			View:   "admin.users.view",
			Create: "admin.users.create",
			Edit:   "admin.users.edit",
			Delete: "admin.users.delete",
		})
	return builder
}

// NewUserProfilesPanelBuilder creates a panel builder for user profiles.
func NewUserProfilesPanelBuilder(store *stores.UserProfileStore) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "User ID", Type: "text"},
			admin.Field{Name: "display_name", Label: "Display Name", Type: "text"},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "locale", Label: "Locale", Type: "text"},
			admin.Field{Name: "timezone", Label: "Timezone", Type: "text"},
			admin.Field{Name: "updated_at", Label: "Updated", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "id", Label: "User ID", Type: "text", Required: true},
			admin.Field{Name: "display_name", Label: "Display Name", Type: "text", Required: true},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "avatar_url", Label: "Avatar URL", Type: "text"},
			admin.Field{Name: "locale", Label: "Locale", Type: "text"},
			admin.Field{Name: "timezone", Label: "Timezone", Type: "text"},
			admin.Field{Name: "bio", Label: "Bio", Type: "textarea"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "User ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "display_name", Label: "Display Name", Type: "text"},
			admin.Field{Name: "email", Label: "Email", Type: "email"},
			admin.Field{Name: "avatar_url", Label: "Avatar URL", Type: "text"},
			admin.Field{Name: "locale", Label: "Locale", Type: "text"},
			admin.Field{Name: "timezone", Label: "Timezone", Type: "text"},
			admin.Field{Name: "bio", Label: "Bio", Type: "textarea"},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime", ReadOnly: true},
			admin.Field{Name: "updated_at", Label: "Updated", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "display_name", Label: "Display Name", Type: "text"},
			admin.Filter{Name: "email", Label: "Email", Type: "text"},
			admin.Filter{Name: "locale", Label: "Locale", Type: "text"},
			admin.Filter{Name: "timezone", Label: "Timezone", Type: "text"},
		).
		Permissions(admin.PanelPermissions{
			View:   "admin.users.view",
			Create: "admin.users.create",
			Edit:   "admin.users.edit",
			Delete: "admin.users.delete",
		})
	return builder
}

// NewPagesPanelBuilder creates a panel builder for pages
func NewPagesPanelBuilder(store stores.PageRepository) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "ID", LabelKey: "fields.id", Type: "text"},
			admin.Field{Name: "translation_group_id", Label: "Translation Group", LabelKey: "fields.translation_group", Type: "text", Hidden: true, ReadOnly: true},
			admin.Field{Name: "title", Label: "Title", LabelKey: "fields.title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", LabelKey: "fields.slug", Type: "text"},
			admin.Field{Name: "path", Label: "Path", LabelKey: "fields.path", Type: "text"},
			admin.Field{Name: "status", Label: "Status", LabelKey: "fields.status", Type: "select", Options: []admin.Option{
				{Value: "published", Label: "Published", LabelKey: "status.published"},
				{Value: "draft", Label: "Draft", LabelKey: "status.draft"},
				{Value: "pending_approval", Label: "Pending Approval", LabelKey: "status.pending_approval"},
				{Value: "scheduled", Label: "Scheduled", LabelKey: "status.scheduled"},
			}},
			admin.Field{Name: "parent_id", Label: "Parent", LabelKey: "fields.parent", Type: "text"},
			admin.Field{Name: "template_id", Label: "Template", LabelKey: "fields.template", Type: "text"},
			admin.Field{Name: "locale", Label: "Locale", LabelKey: "fields.locale", Type: "text"},
			admin.Field{Name: "updated_at", Label: "Updated", LabelKey: "fields.updated_at", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "title", Label: "Title", LabelKey: "fields.title", Type: "text", Required: true},
			admin.Field{Name: "slug", Label: "Slug", LabelKey: "fields.slug", Type: "text", Required: true},
			admin.Field{Name: "path", Label: "Path", LabelKey: "fields.path", Type: "text", Required: true},
			admin.Field{Name: "content", Label: "Content", LabelKey: "fields.content", Type: "textarea"},
			admin.Field{Name: "translation_group_id", Label: "Translation Group", LabelKey: "fields.translation_group", Type: "text", Hidden: true, ReadOnly: true},
			admin.Field{Name: "status", Label: "Status", LabelKey: "fields.status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "published", Label: "Published", LabelKey: "status.published"},
				{Value: "draft", Label: "Draft", LabelKey: "status.draft"},
				{Value: "pending_approval", Label: "Pending Approval", LabelKey: "status.pending_approval"},
				{Value: "scheduled", Label: "Scheduled", LabelKey: "status.scheduled"},
			}},
			admin.Field{Name: "locale", Label: "Locale", LabelKey: "fields.locale", Type: "text"},
			admin.Field{Name: "parent_id", Label: "Parent Page", LabelKey: "fields.parent", Type: "text"},
			admin.Field{Name: "template_id", Label: "Template", LabelKey: "fields.template", Type: "text"},
			admin.Field{Name: "meta_title", Label: "SEO Title", LabelKey: "fields.seo_title", Type: "text"},
			admin.Field{Name: "meta_description", Label: "SEO Description", LabelKey: "fields.seo_description", Type: "textarea"},
			admin.Field{Name: "blocks", Label: "Blocks", LabelKey: "fields.blocks", Type: "block-library-picker"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", LabelKey: "fields.id", Type: "text", ReadOnly: true},
			admin.Field{Name: "translation_group_id", Label: "Translation Group", LabelKey: "fields.translation_group", Type: "text", Hidden: true, ReadOnly: true},
			admin.Field{Name: "title", Label: "Title", LabelKey: "fields.title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", LabelKey: "fields.slug", Type: "text"},
			admin.Field{Name: "content", Label: "Content", LabelKey: "fields.content", Type: "textarea"},
			admin.Field{Name: "status", Label: "Status", LabelKey: "fields.status", Type: "text"},
			admin.Field{Name: "path", Label: "Path", LabelKey: "fields.path", Type: "text"},
			admin.Field{Name: "locale", Label: "Locale", LabelKey: "fields.locale", Type: "text"},
			admin.Field{Name: "template_id", Label: "Template", LabelKey: "fields.template", Type: "text"},
			admin.Field{Name: "blocks", Label: "Blocks", LabelKey: "fields.blocks", Type: "textarea"},
			admin.Field{Name: "created_at", Label: "Created", LabelKey: "fields.created_at", Type: "datetime", ReadOnly: true},
			admin.Field{Name: "updated_at", Label: "Updated", LabelKey: "fields.updated_at", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "locale", Label: "Locale", LabelKey: "fields.locale", Type: "text"},
			admin.Filter{Name: "status", Label: "Status", LabelKey: "fields.status", Type: "select"},
			admin.Filter{Name: "template_id", Label: "Template", LabelKey: "fields.template", Type: "text"},
		).
		Actions(
			admin.Action{Name: "create_translation", Label: "Add Translation", LabelKey: "actions.add_translation", Permission: "admin.pages.edit"},
			admin.Action{Name: "request_approval", Label: "Request Approval", LabelKey: "actions.request_approval", Permission: "admin.pages.edit"},
			admin.Action{Name: "approve", Label: "Approve", LabelKey: "actions.approve", Permission: "admin.pages.publish"},
			admin.Action{Name: "reject", Label: "Reject", LabelKey: "actions.reject", Permission: "admin.pages.publish"},
			admin.Action{Name: "publish", Label: "Publish", LabelKey: "actions.publish", CommandName: "pages.publish", Permission: "admin.pages.publish"},
			admin.Action{Name: "unpublish", Label: "Unpublish", LabelKey: "actions.unpublish", CommandName: "pages.bulk_unpublish", Permission: "admin.pages.publish"},
		).
		BulkActions(
			admin.Action{Name: "publish", Label: "Publish", LabelKey: "actions.publish", Icon: "check-circle", Confirm: "Publish {count} page(s)?", CommandName: "pages.bulk_publish", Permission: "admin.pages.publish"},
			admin.Action{Name: "unpublish", Label: "Unpublish", LabelKey: "actions.unpublish", Icon: "pause", Confirm: "Unpublish {count} page(s)?", CommandName: "pages.bulk_unpublish", Permission: "admin.pages.publish"},
		).
		UseBlocks(true).
		UseSEO(true).
		TreeView(true).
		Permissions(admin.PanelPermissions{
			View:   "admin.pages.view",
			Create: "admin.pages.create",
			Edit:   "admin.pages.edit",
			Delete: "admin.pages.delete",
		})
	return builder
}

// NewPostsPanelBuilder creates a panel builder for posts
func NewPostsPanelBuilder(store stores.PostRepository) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "ID", LabelKey: "fields.id", Type: "text"},
			admin.Field{Name: "translation_group_id", Label: "Translation Group", LabelKey: "fields.translation_group", Type: "text", Hidden: true, ReadOnly: true},
			admin.Field{Name: "title", Label: "Title", LabelKey: "fields.title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", LabelKey: "fields.slug", Type: "text"},
			admin.Field{Name: "author", Label: "Author", LabelKey: "fields.author", Type: "text"},
			admin.Field{Name: "category", Label: "Category", LabelKey: "fields.category", Type: "select", Options: []admin.Option{
				{Value: "news", Label: "News", LabelKey: "category.news"},
				{Value: "blog", Label: "Blog", LabelKey: "category.blog"},
				{Value: "tutorial", Label: "Tutorial", LabelKey: "category.tutorial"},
			}},
			admin.Field{Name: "status", Label: "Status", LabelKey: "fields.status", Type: "select", Options: []admin.Option{
				{Value: "published", Label: "Published", LabelKey: "status.published"},
				{Value: "draft", Label: "Draft", LabelKey: "status.draft"},
				{Value: "pending_approval", Label: "Pending Approval", LabelKey: "status.pending_approval"},
				{Value: "scheduled", Label: "Scheduled", LabelKey: "status.scheduled"},
				{Value: "archived", Label: "Archived", LabelKey: "status.archived"},
			}},
			admin.Field{Name: "path", Label: "Path", LabelKey: "fields.path", Type: "text"},
			admin.Field{Name: "published_at", Label: "Published", LabelKey: "fields.published_at", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "title", Label: "Title", LabelKey: "fields.title", Type: "text", Required: true},
			admin.Field{Name: "slug", Label: "Slug", LabelKey: "fields.slug", Type: "text", Required: true},
			admin.Field{Name: "content", Label: "Content", LabelKey: "fields.content", Type: "textarea", Required: true},
			admin.Field{Name: "excerpt", Label: "Excerpt", LabelKey: "fields.excerpt", Type: "textarea"},
			admin.Field{Name: "translation_group_id", Label: "Translation Group", LabelKey: "fields.translation_group", Type: "text", Hidden: true, ReadOnly: true},
			admin.Field{Name: "category", Label: "Category", LabelKey: "fields.category", Type: "select", Required: true, Options: []admin.Option{
				{Value: "news", Label: "News", LabelKey: "category.news"},
				{Value: "blog", Label: "Blog", LabelKey: "category.blog"},
				{Value: "tutorial", Label: "Tutorial", LabelKey: "category.tutorial"},
			}},
			admin.Field{Name: "status", Label: "Status", LabelKey: "fields.status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "published", Label: "Published", LabelKey: "status.published"},
				{Value: "draft", Label: "Draft", LabelKey: "status.draft"},
				{Value: "pending_approval", Label: "Pending Approval", LabelKey: "status.pending_approval"},
				{Value: "scheduled", Label: "Scheduled", LabelKey: "status.scheduled"},
				{Value: "archived", Label: "Archived", LabelKey: "status.archived"},
			}},
			admin.Field{Name: "published_at", Label: "Publish Date", LabelKey: "fields.published_at", Type: "datetime"},
			admin.Field{Name: "path", Label: "Path", LabelKey: "fields.path", Type: "text"},
			admin.Field{Name: "featured_image", Label: "Featured Image", LabelKey: "fields.featured_image", Type: "media"},
			admin.Field{Name: "tags", Label: "Tags", LabelKey: "fields.tags", Type: "text"},
			admin.Field{Name: "meta_title", Label: "SEO Title", LabelKey: "fields.seo_title", Type: "text"},
			admin.Field{Name: "meta_description", Label: "SEO Description", LabelKey: "fields.seo_description", Type: "textarea"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", LabelKey: "fields.id", Type: "text", ReadOnly: true},
			admin.Field{Name: "translation_group_id", Label: "Translation Group", LabelKey: "fields.translation_group", Type: "text", Hidden: true, ReadOnly: true},
			admin.Field{Name: "title", Label: "Title", LabelKey: "fields.title", Type: "text"},
			admin.Field{Name: "content", Label: "Content", LabelKey: "fields.content", Type: "textarea"},
			admin.Field{Name: "author", Label: "Author", LabelKey: "fields.author", Type: "text", ReadOnly: true},
			admin.Field{Name: "status", Label: "Status", LabelKey: "fields.status", Type: "text"},
			admin.Field{Name: "featured_image", Label: "Featured Image", LabelKey: "fields.featured_image", Type: "media"},
			admin.Field{Name: "path", Label: "Path", LabelKey: "fields.path", Type: "text"},
			admin.Field{Name: "meta_title", Label: "SEO Title", LabelKey: "fields.seo_title", Type: "text"},
			admin.Field{Name: "meta_description", Label: "SEO Description", LabelKey: "fields.seo_description", Type: "textarea"},
			admin.Field{Name: "created_at", Label: "Created", LabelKey: "fields.created_at", Type: "datetime", ReadOnly: true},
			admin.Field{Name: "published_at", Label: "Publish Date", LabelKey: "fields.published_at", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "category", Label: "Category", LabelKey: "fields.category", Type: "select"},
			admin.Filter{Name: "status", Label: "Status", LabelKey: "fields.status", Type: "select"},
			admin.Filter{Name: "author", Label: "Author", LabelKey: "fields.author", Type: "text"},
		).
		Actions(
			admin.Action{Name: "create_translation", Label: "Add Translation", LabelKey: "actions.add_translation", Permission: "admin.posts.edit"},
			admin.Action{Name: "request_approval", Label: "Request Approval", LabelKey: "actions.request_approval", Permission: "admin.posts.edit"},
			admin.Action{Name: "approve", Label: "Approve", LabelKey: "actions.approve", Permission: "admin.posts.publish"},
			admin.Action{Name: "reject", Label: "Reject", LabelKey: "actions.reject", Permission: "admin.posts.publish"},
			admin.Action{Name: "publish", Label: "Publish", LabelKey: "actions.publish", CommandName: "posts.bulk_publish", Permission: "admin.posts.publish"},
			admin.Action{Name: "unpublish", Label: "Unpublish", LabelKey: "actions.unpublish", CommandName: "posts.bulk_unpublish", Permission: "admin.posts.edit"},
			admin.Action{Name: "schedule", Label: "Schedule", LabelKey: "actions.schedule", CommandName: "posts.bulk_schedule", Permission: "admin.posts.publish"},
		).
		BulkActions(
			admin.Action{Name: "publish", Label: "Publish", LabelKey: "actions.publish", Icon: "check-circle", Confirm: "Publish {count} post(s)?", CommandName: "posts.bulk_publish", Permission: "admin.posts.publish"},
			admin.Action{Name: "unpublish", Label: "Unpublish", LabelKey: "actions.unpublish", Icon: "pause", Confirm: "Unpublish {count} post(s)?", CommandName: "posts.bulk_unpublish", Permission: "admin.posts.edit"},
			admin.Action{Name: "schedule", Label: "Schedule", LabelKey: "actions.schedule", Icon: "calendar", Confirm: "Schedule {count} post(s)?", CommandName: "posts.bulk_schedule", Permission: "admin.posts.publish", Overflow: true},
			admin.Action{Name: "archive", Label: "Archive", LabelKey: "actions.archive", Icon: "archive", Confirm: "Archive {count} post(s)?", Variant: "danger", CommandName: "posts.bulk_archive", Permission: "admin.posts.edit", Overflow: true},
		).
		UseSEO(true).
		Permissions(admin.PanelPermissions{
			View:   "admin.posts.view",
			Create: "admin.posts.create",
			Edit:   "admin.posts.edit",
			Delete: "admin.posts.delete",
		})
	return builder
}

// NewMediaPanelBuilder creates a panel builder for media
func NewMediaPanelBuilder(store *stores.MediaStore) *admin.PanelBuilder {
	builder := &admin.PanelBuilder{}
	builder.
		WithRepository(store).
		ListFields(
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "filename", Label: "Filename", Type: "text"},
			admin.Field{Name: "url", Label: "URL", Type: "text"},
			admin.Field{Name: "type", Label: "Type", Type: "select", Options: []admin.Option{
				{Value: "image", Label: "Image"},
				{Value: "document", Label: "Document"},
				{Value: "video", Label: "Video"},
				{Value: "audio", Label: "Audio"},
			}},
			admin.Field{Name: "size", Label: "Size", Type: "text"},
			admin.Field{Name: "uploaded_by", Label: "Uploaded By", Type: "text"},
			admin.Field{Name: "uploaded_at", Label: "Uploaded", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "filename", Label: "Filename", Type: "text", Required: true, ReadOnly: true},
			admin.Field{Name: "alt_text", Label: "Alt Text", Type: "text"},
			admin.Field{Name: "caption", Label: "Caption", Type: "textarea"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "filename", Label: "Filename", Type: "text", ReadOnly: true},
			admin.Field{Name: "type", Label: "Type", Type: "text", ReadOnly: true},
			admin.Field{Name: "mime_type", Label: "MIME Type", Type: "text", ReadOnly: true},
			admin.Field{Name: "size", Label: "Size", Type: "text", ReadOnly: true},
			admin.Field{Name: "url", Label: "URL", Type: "text", ReadOnly: true},
			admin.Field{Name: "uploaded_at", Label: "Uploaded", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "type", Type: "select"},
		).
		BulkActions(
			admin.Action{Name: "delete", CommandName: "media.bulk_delete", Permission: "admin.media.delete"},
		).
		Permissions(admin.PanelPermissions{
			View:   "admin.media.view",
			Create: "admin.media.create",
			Edit:   "admin.media.edit",
			Delete: "admin.media.delete",
		})
	return builder
}
