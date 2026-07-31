package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/goliatone/go-admin/internal/releasecheck"
	"golang.org/x/mod/module"
)

const modulePath = "github.com/goliatone/go-admin"

func main() {
	moduleRoot := flag.String("module-root", ".", "root directory of the committed module source")
	moduleVersion := flag.String("version", "v0.0.0", "module version used for ZIP construction")
	flag.Parse()

	version := module.Version{Path: modulePath, Version: *moduleVersion}
	if err := releasecheck.CheckModuleArchive(
		*moduleRoot,
		version,
		releasecheck.RequiredClientArchivePaths,
	); err != nil {
		fmt.Fprintf(os.Stderr, "release module archive validation failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf(
		"release module archive contains %d required client assets\n",
		len(releasecheck.RequiredClientArchivePaths),
	)
}
