package helpers

import (
	"fmt"
	"path"
	"strings"
)

// ResourceRoutes builds CRUD-style URLs for a resource.
type ResourceRoutes struct {
	BasePath string
	Resource string
}

// NewResourceRoutes normalizes base path/resource and returns a route builder.
func NewResourceRoutes(basePath, resource string) ResourceRoutes {
	return ResourceRoutes{
		BasePath: normalizeBase(basePath),
		Resource: strings.Trim(strings.TrimSpace(resource), "/"),
	}
}

// Index returns the collection URL (e.g., /admin/users).
func (r ResourceRoutes) Index() string {
	return path.Join(r.BasePath, r.Resource)
}

// New returns the create form URL (e.g., /admin/users/new).
func (r ResourceRoutes) New() string {
	return path.Join(r.BasePath, r.Resource, "new")
}

// Show returns the detail URL for a record.
func (r ResourceRoutes) Show(id any) string {
	return path.Join(r.BasePath, r.Resource, fmt.Sprint(id))
}

// Edit returns the edit form URL for a record.
func (r ResourceRoutes) Edit(id any) string {
	return path.Join(r.BasePath, r.Resource, fmt.Sprint(id), "edit")
}

// Delete returns the delete action URL for a record.
func (r ResourceRoutes) Delete(id any) string {
	return path.Join(r.BasePath, r.Resource, fmt.Sprint(id), "delete")
}

// RoutesMap returns a map suitable for templates.
func (r ResourceRoutes) RoutesMap() map[string]string {
	return map[string]string{
		"index": r.Index(),
		"new":   r.New(),
	}
}

// ActionsMap builds action URLs for a specific record id.
func (r ResourceRoutes) ActionsMap(id any) map[string]string {
	return map[string]string{
		"view":   r.Show(id),
		"edit":   r.Edit(id),
		"delete": r.Delete(id),
	}
}

func normalizeBase(base string) string {
	if strings.TrimSpace(base) == "" {
		return "/"
	}
	if !strings.HasPrefix(base, "/") {
		base = "/" + base
	}
	return strings.TrimSuffix(base, "/")
}
