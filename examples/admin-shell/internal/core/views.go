package core

import (
	"io/fs"

	"github.com/goliatone/go-admin/examples/admin-shell/data"
)

func embeddedTemplatesFS() fs.FS {
	return data.TemplatesFS
}
