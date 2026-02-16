package main

import (
	"strings"
	"testing"
	"testing/fstest"
)

func TestValidateESignTemplateOwnership(t *testing.T) {
	if err := validateESignTemplateOwnership(); err != nil {
		t.Fatalf("expected ownership validation to pass, got %v", err)
	}
}

func TestValidateTemplateOwnershipRejectsDuplicateTemplatePath(t *testing.T) {
	sharedFS := fstest.MapFS{
		"esign-admin/landing.html": {Data: []byte("shared")},
	}
	overrideFS := fstest.MapFS{
		"esign-admin/landing.html": {Data: []byte("override")},
	}

	err := validateTemplateOwnership(
		sharedFS,
		overrideFS,
		map[string]struct{}{"esign-admin/landing.html": {}},
		map[string]struct{}{},
	)
	if err == nil {
		t.Fatal("expected duplicate path validation failure")
	}
	if !strings.Contains(err.Error(), "duplicate template path") {
		t.Fatalf("expected duplicate template ownership error, got %v", err)
	}
}

func TestValidateTemplateOwnershipRejectsMissingCanonicalTemplate(t *testing.T) {
	sharedFS := fstest.MapFS{
		"esign-admin/other.html": {Data: []byte("shared")},
	}
	overrideFS := fstest.MapFS{}

	err := validateTemplateOwnership(
		sharedFS,
		overrideFS,
		map[string]struct{}{"esign-admin/landing.html": {}},
		map[string]struct{}{},
	)
	if err == nil {
		t.Fatal("expected missing canonical template validation failure")
	}
	if !strings.Contains(err.Error(), "canonical shared template missing") {
		t.Fatalf("expected missing canonical template error, got %v", err)
	}
}
