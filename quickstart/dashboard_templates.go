package quickstart

import (
	"io/fs"

	client "github.com/goliatone/go-admin/pkg/client"
)

// DashboardTemplatesFS returns the canonical packaged admin template set.
// The legacy compact quickstart dashboard document is no longer a fallback.
func DashboardTemplatesFS() fs.FS {
	return client.Templates()
}
