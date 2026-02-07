package handlers

import "github.com/goliatone/go-admin/examples/web/helpers"

// UserDataGridColumns exposes the users column allowlist for reuse.
func UserDataGridColumns() []helpers.DataGridColumn {
	return userDataGridColumns()
}

// UserProfileDataGridColumns exposes the user profiles column allowlist for reuse.
func UserProfileDataGridColumns() []helpers.DataGridColumn {
	return userProfileDataGridColumns()
}

// PageDataGridColumns exposes the pages column allowlist for reuse.
func PageDataGridColumns() []helpers.DataGridColumn {
	return pageDataGridColumns()
}

// PostDataGridColumns exposes the posts column allowlist for reuse.
func PostDataGridColumns() []helpers.DataGridColumn {
	return postDataGridColumns()
}

// MediaDataGridColumns exposes the media column allowlist for reuse.
func MediaDataGridColumns() []helpers.DataGridColumn {
	return mediaDataGridColumns()
}

// TenantDataGridColumns exposes the tenants column allowlist for reuse.
func TenantDataGridColumns() []helpers.DataGridColumn {
	return tenantDataGridColumns()
}

// RoleDataGridColumns exposes the roles column allowlist for reuse.
func RoleDataGridColumns() []helpers.DataGridColumn {
	return roleDataGridColumns()
}

func pageDataGridColumns() []helpers.DataGridColumn {
	return []helpers.DataGridColumn{
		{Field: "title", Label: "Title", Sortable: true, Filterable: true, Default: true},
		{Field: "slug", Label: "Slug", Sortable: true, Filterable: true, Default: true},
		{Field: "status", Label: "Status", Sortable: true, Filterable: true, Default: true},
		{Field: "published_at", Label: "Published", Sortable: true, Filterable: true, Default: true},
		{Field: "created_at", Label: "Created", Sortable: true, Filterable: true, Default: true},
	}
}

func postDataGridColumns() []helpers.DataGridColumn {
	return []helpers.DataGridColumn{
		{Field: "title", Label: "Title", Sortable: true, Filterable: true, Default: true},
		{Field: "slug", Label: "Slug", Sortable: true, Filterable: true, Default: true},
		{Field: "status", Label: "Status", Sortable: true, Filterable: true, Default: true},
		{Field: "published_at", Label: "Published", Sortable: true, Filterable: true, Default: true},
		{Field: "created_at", Label: "Created", Sortable: true, Filterable: true, Default: true},
	}
}

func mediaDataGridColumns() []helpers.DataGridColumn {
	return []helpers.DataGridColumn{
		{Field: "filename", Label: "Filename"},
		{Field: "mime_type", Label: "Type"},
		{Field: "size", Label: "Size"},
		{Field: "created_at", Label: "Uploaded"},
	}
}

func tenantDataGridColumns() []helpers.DataGridColumn {
	return []helpers.DataGridColumn{
		{Field: "name", Label: "Name"},
		{Field: "slug", Label: "Slug"},
		{Field: "status", Label: "Status"},
		{Field: "created_at", Label: "Created"},
	}
}

func roleDataGridColumns() []helpers.DataGridColumn {
	return []helpers.DataGridColumn{
		{Field: "name", Label: "Name", Sortable: true, Filterable: true, Default: true},
		{Field: "role_key", Label: "Role Key", Sortable: true, Filterable: true, Default: true},
		{Field: "description", Label: "Description", Sortable: true, Filterable: true, Default: true},
		{Field: "permissions", Label: "Permissions", Sortable: false, Filterable: false, Default: false},
		{Field: "is_system", Label: "System", Sortable: true, Filterable: false, Default: true},
		{Field: "created_at", Label: "Created", Sortable: true, Filterable: false, Default: true},
		{Field: "updated_at", Label: "Updated", Sortable: true, Filterable: false, Default: false},
	}
}
