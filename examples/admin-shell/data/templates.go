package data

import "embed"

// TemplatesFS contains application-owned template overlays.
//
//go:embed templates/**
var TemplatesFS embed.FS
