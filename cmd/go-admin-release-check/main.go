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
	moduleProxy := flag.String("module-proxy", "", "optional output directory for a local Go module proxy")
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
	if *moduleProxy != "" {
		if err := releasecheck.WriteModuleProxy(*moduleRoot, *moduleProxy, version); err != nil {
			fmt.Fprintf(os.Stderr, "release module proxy generation failed: %v\n", err)
			os.Exit(1)
		}
	}
	fmt.Printf(
		"release module archive contains %d required client assets\n",
		len(releasecheck.RequiredClientArchivePaths),
	)
	if *moduleProxy != "" {
		fmt.Printf("release module proxy written to %s\n", *moduleProxy)
	}
}
