package setup

import (
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
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
			admin.Action{Name: "activate", CommandName: "users.activate", Permission: "admin.users.edit"},
			admin.Action{Name: "suspend", CommandName: "users.suspend", Permission: "admin.users.edit"},
			admin.Action{Name: "disable", CommandName: "users.disable", Permission: "admin.users.edit"},
			admin.Action{Name: "archive", CommandName: "users.archive", Permission: "admin.users.delete"},
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
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", Type: "text"},
			admin.Field{Name: "path", Label: "Path", Type: "text"},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "published", Label: "Published"},
				{Value: "draft", Label: "Draft"},
				{Value: "scheduled", Label: "Scheduled"},
			}},
			admin.Field{Name: "parent_id", Label: "Parent", Type: "text"},
			admin.Field{Name: "template_id", Label: "Template", Type: "text"},
			admin.Field{Name: "locale", Label: "Locale", Type: "text"},
			admin.Field{Name: "updated_at", Label: "Updated", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			admin.Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			admin.Field{Name: "path", Label: "Path", Type: "text", Required: true},
			admin.Field{Name: "content", Label: "Content", Type: "textarea"},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "published", Label: "Published"},
				{Value: "draft", Label: "Draft"},
				{Value: "scheduled", Label: "Scheduled"},
			}},
			admin.Field{Name: "locale", Label: "Locale", Type: "text"},
			admin.Field{Name: "parent_id", Label: "Parent Page", Type: "text"},
			admin.Field{Name: "template_id", Label: "Template", Type: "text"},
			admin.Field{Name: "meta_title", Label: "SEO Title", Type: "text"},
			admin.Field{Name: "meta_description", Label: "SEO Description", Type: "textarea"},
			admin.Field{Name: "blocks", Label: "Blocks", Type: "textarea", ReadOnly: true},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", Type: "text"},
			admin.Field{Name: "content", Label: "Content", Type: "textarea"},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
			admin.Field{Name: "path", Label: "Path", Type: "text"},
			admin.Field{Name: "locale", Label: "Locale", Type: "text"},
			admin.Field{Name: "template_id", Label: "Template", Type: "text"},
			admin.Field{Name: "blocks", Label: "Blocks", Type: "textarea"},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime", ReadOnly: true},
			admin.Field{Name: "updated_at", Label: "Updated", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "locale", Type: "text"},
			admin.Filter{Name: "status", Type: "select"},
			admin.Filter{Name: "template_id", Type: "text"},
		).
		Actions(
			admin.Action{Name: "publish", CommandName: "pages.publish", Permission: "admin.pages.publish"},
			admin.Action{Name: "unpublish", CommandName: "pages.bulk_unpublish", Permission: "admin.pages.publish"},
		).
		BulkActions(
			admin.Action{Name: "publish", CommandName: "pages.bulk_publish", Permission: "admin.pages.publish"},
			admin.Action{Name: "unpublish", CommandName: "pages.bulk_unpublish", Permission: "admin.pages.publish"},
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
			admin.Field{Name: "id", Label: "ID", Type: "text"},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "slug", Label: "Slug", Type: "text"},
			admin.Field{Name: "author", Label: "Author", Type: "text"},
			admin.Field{Name: "category", Label: "Category", Type: "select", Options: []admin.Option{
				{Value: "news", Label: "News"},
				{Value: "blog", Label: "Blog"},
				{Value: "tutorial", Label: "Tutorial"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Options: []admin.Option{
				{Value: "published", Label: "Published"},
				{Value: "draft", Label: "Draft"},
				{Value: "scheduled", Label: "Scheduled"},
				{Value: "archived", Label: "Archived"},
			}},
			admin.Field{Name: "path", Label: "Path", Type: "text"},
			admin.Field{Name: "published_at", Label: "Published", Type: "datetime"},
		).
		FormFields(
			admin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			admin.Field{Name: "slug", Label: "Slug", Type: "text", Required: true},
			admin.Field{Name: "content", Label: "Content", Type: "textarea", Required: true},
			admin.Field{Name: "excerpt", Label: "Excerpt", Type: "textarea"},
			admin.Field{Name: "category", Label: "Category", Type: "select", Required: true, Options: []admin.Option{
				{Value: "news", Label: "News"},
				{Value: "blog", Label: "Blog"},
				{Value: "tutorial", Label: "Tutorial"},
			}},
			admin.Field{Name: "status", Label: "Status", Type: "select", Required: true, Options: []admin.Option{
				{Value: "published", Label: "Published"},
				{Value: "draft", Label: "Draft"},
				{Value: "scheduled", Label: "Scheduled"},
				{Value: "archived", Label: "Archived"},
			}},
			admin.Field{Name: "published_at", Label: "Publish Date", Type: "datetime"},
			admin.Field{Name: "path", Label: "Path", Type: "text"},
			admin.Field{Name: "featured_image", Label: "Featured Image", Type: "media"},
			admin.Field{Name: "tags", Label: "Tags", Type: "text"},
			admin.Field{Name: "meta_title", Label: "SEO Title", Type: "text"},
			admin.Field{Name: "meta_description", Label: "SEO Description", Type: "textarea"},
		).
		DetailFields(
			admin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			admin.Field{Name: "title", Label: "Title", Type: "text"},
			admin.Field{Name: "content", Label: "Content", Type: "textarea"},
			admin.Field{Name: "author", Label: "Author", Type: "text", ReadOnly: true},
			admin.Field{Name: "status", Label: "Status", Type: "text"},
			admin.Field{Name: "featured_image", Label: "Featured Image", Type: "media"},
			admin.Field{Name: "path", Label: "Path", Type: "text"},
			admin.Field{Name: "meta_title", Label: "SEO Title", Type: "text"},
			admin.Field{Name: "meta_description", Label: "SEO Description", Type: "textarea"},
			admin.Field{Name: "created_at", Label: "Created", Type: "datetime", ReadOnly: true},
			admin.Field{Name: "published_at", Label: "Publish Date", Type: "datetime", ReadOnly: true},
		).
		Filters(
			admin.Filter{Name: "category", Type: "select"},
			admin.Filter{Name: "status", Type: "select"},
			admin.Filter{Name: "author", Type: "text"},
		).
		Actions(
			admin.Action{Name: "publish", CommandName: "posts.bulk_publish", Permission: "admin.posts.publish"},
			admin.Action{Name: "unpublish", CommandName: "posts.bulk_unpublish", Permission: "admin.posts.edit"},
			admin.Action{Name: "schedule", CommandName: "posts.bulk_schedule", Permission: "admin.posts.publish"},
		).
		BulkActions(
			admin.Action{Name: "publish", CommandName: "posts.bulk_publish", Permission: "admin.posts.publish"},
			admin.Action{Name: "unpublish", CommandName: "posts.bulk_unpublish", Permission: "admin.posts.edit"},
			admin.Action{Name: "schedule", CommandName: "posts.bulk_schedule", Permission: "admin.posts.publish"},
			admin.Action{Name: "archive", CommandName: "posts.bulk_archive", Permission: "admin.posts.edit"},
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
