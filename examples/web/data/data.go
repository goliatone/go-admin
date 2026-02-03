package data

import (
	"embed"
	"io/fs"
)

//go:embed sql/seeds
var embeddedSeeds embed.FS

// SeedsFS returns the embedded fixtures filesystem rooted at sql/seeds.
func SeedsFS() fs.FS {
	sub, err := fs.Sub(embeddedSeeds, "sql/seeds")
	if err != nil {
		return embeddedSeeds
	}
	return sub
}
