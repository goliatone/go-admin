package quickstart

import (
	"io"
	"io/fs"
	"testing"

	"github.com/flosch/pongo2/v6"
	client "github.com/goliatone/go-admin/pkg/client"
)

// rootFSLoader resolves every template name from the FS root, matching how the
// admin templates author their references ({% extends "layout.html" %},
// {% include "partials/..." %}). The stock pongo2 FSLoader resolves extends/include
// relative to the current template's directory, which does not match these
// root-relative paths.
type rootFSLoader struct{ fsys fs.FS }

func (l rootFSLoader) Abs(_ /* base */, name string) string { return name }

func (l rootFSLoader) Get(path string) (io.Reader, error) {
	return l.fsys.Open(path)
}

// TestContentModelingTemplatesCompile guards the content-modeling admin templates
// against Pongo2 syntax regressions. These templates are rendered at runtime, so a
// malformed tag would only surface as a 500 in the browser. Compiling them through a
// real Pongo2 set over the embedded template FS (with the custom filter aliases
// registered) validates the full {% extends %}/{% include %} chain at build time.
//
// Added alongside the T13 shared Content Types/Blocks switch, which edited both
// page headers.
func TestContentModelingTemplatesCompile(t *testing.T) {
	registerTemplateFilterAliases()

	set := pongo2.NewSet("content-modeling-compile-check", rootFSLoader{fsys: client.Templates()})

	for _, name := range []string{
		"resources/content-types/editor.html",
		"resources/block-definitions/index.html",
	} {
		if _, err := set.FromFile(name); err != nil {
			t.Fatalf("template %s failed to compile: %v", name, err)
		}
	}
}
