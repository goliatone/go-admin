package main

import (
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/pkg/client"
)

var canonicalESignSharedTemplates = map[string]struct{}{
	"esign-admin/landing.html": {},
}

var allowedESignDuplicateTemplates = map[string]struct{}{}

func validateESignTemplateOwnership() error {
	overrideFS, err := fs.Sub(eSignTemplatesFS, "templates")
	if err != nil {
		return fmt.Errorf("esign template ownership: resolve override templates fs: %w", err)
	}
	return validateTemplateOwnership(
		client.Templates(),
		overrideFS,
		canonicalESignSharedTemplates,
		allowedESignDuplicateTemplates,
	)
}

func validateTemplateOwnership(
	sharedFS fs.FS,
	overrideFS fs.FS,
	canonicalShared map[string]struct{},
	allowedDuplicates map[string]struct{},
) error {
	sharedTemplates, err := collectTemplatePaths(sharedFS)
	if err != nil {
		return fmt.Errorf("esign template ownership: collect shared templates: %w", err)
	}
	overrideTemplates, err := collectTemplatePaths(overrideFS)
	if err != nil {
		return fmt.Errorf("esign template ownership: collect override templates: %w", err)
	}

	duplicatePaths := []string{}
	for path := range overrideTemplates {
		if _, exists := sharedTemplates[path]; !exists {
			continue
		}
		if _, allowed := allowedDuplicates[path]; allowed {
			continue
		}
		duplicatePaths = append(duplicatePaths, path)
	}
	sort.Strings(duplicatePaths)
	if len(duplicatePaths) > 0 {
		return fmt.Errorf(
			"esign template ownership: duplicate template path(s) across shared and override sources: %s",
			strings.Join(duplicatePaths, ", "),
		)
	}

	for path := range canonicalShared {
		if _, exists := sharedTemplates[path]; !exists {
			return fmt.Errorf("esign template ownership: canonical shared template missing: %s", path)
		}
		if _, exists := overrideTemplates[path]; exists {
			return fmt.Errorf("esign template ownership: canonical shared template overridden: %s", path)
		}
	}
	return nil
}

func collectTemplatePaths(templatesFS fs.FS) (map[string]struct{}, error) {
	out := map[string]struct{}{}
	if templatesFS == nil {
		return out, nil
	}
	err := fs.WalkDir(templatesFS, ".", func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d == nil || d.IsDir() {
			return nil
		}
		trimmedPath := strings.TrimSpace(path)
		if trimmedPath == "" {
			return nil
		}
		out[trimmedPath] = struct{}{}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}
