package main

import (
	"fmt"
	"io/fs"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	quicksite "github.com/goliatone/go-admin/quickstart/site"
	router "github.com/goliatone/go-router"
	gotheme "github.com/goliatone/go-theme"
)

const (
	defaultEmbeddedSiteThemeName = "garchen-archive-site"
	embeddedSiteThemesRoot       = "site_themes"
)

type embeddedSiteThemePackage struct {
	Name     string
	Manifest *gotheme.Manifest
	RootFS   fs.FS
	StaticFS fs.FS
}

func loadEmbeddedSiteThemePackage(name string) (*embeddedSiteThemePackage, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		name = defaultEmbeddedSiteThemeName
	}

	rootFS, err := fs.Sub(webFS, path.Join(embeddedSiteThemesRoot, name))
	if err != nil {
		return nil, fmt.Errorf("open embedded site theme %s: %w", name, err)
	}

	manifest, err := gotheme.LoadDir(rootFS, ".")
	if err != nil {
		return nil, fmt.Errorf("load embedded site theme manifest %s: %w", name, err)
	}

	staticFS, err := fs.Sub(rootFS, "static")
	if err != nil {
		return nil, fmt.Errorf("open embedded site theme static dir %s: %w", name, err)
	}

	return &embeddedSiteThemePackage{
		Name:     name,
		Manifest: manifest,
		RootFS:   rootFS,
		StaticFS: staticFS,
	}, nil
}

func registerEmbeddedSiteTheme(registry gotheme.Registry, pkg *embeddedSiteThemePackage) error {
	if registry == nil {
		return fmt.Errorf("site theme registry is nil")
	}
	if pkg == nil || pkg.Manifest == nil {
		return fmt.Errorf("site theme package is nil")
	}
	return registry.Register(pkg.Manifest)
}

func mountEmbeddedSiteThemeAssets(r router.Router[*fiber.App], pkg *embeddedSiteThemePackage) error {
	if r == nil {
		return fmt.Errorf("site theme router is nil")
	}
	if pkg == nil || pkg.Manifest == nil {
		return fmt.Errorf("site theme package is nil")
	}

	prefix := strings.TrimSpace(pkg.Manifest.Assets.Prefix)
	if prefix == "" {
		return fmt.Errorf("site theme %s has no assets prefix", pkg.Name)
	}

	r.Static(path.Join(prefix, "static"), ".", router.Static{
		FS:   pkg.StaticFS,
		Root: ".",
	})
	return nil
}

func attachEmbeddedSiteThemeTemplateFS(siteCfg quicksite.SiteConfig, pkg *embeddedSiteThemePackage) quicksite.SiteConfig {
	if pkg == nil || pkg.RootFS == nil {
		return siteCfg
	}
	views := siteCfg.Views
	views.TemplateFS = append(views.TemplateFS, pkg.RootFS)
	siteCfg.Views = views
	return siteCfg
}
