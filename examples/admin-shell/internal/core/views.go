package core

import (
	"embed"
	"io/fs"
)

//go:embed templates/**
var viewTemplates embed.FS

func embeddedTemplatesFS() fs.FS {
	return viewTemplates
}
