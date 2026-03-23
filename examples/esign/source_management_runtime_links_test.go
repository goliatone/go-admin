package main

import (
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
)

func TestTranslateSourceManagementAPIPathToRuntimePath(t *testing.T) {
	got := translateSourceManagementAPIPathToRuntimePath(
		"/admin",
		"/admin/api/v1/esign/sources/src-123/workspace?panel=comments&anchor=thread:1",
	)
	want := "/admin/esign/sources/src-123/workspace?panel=comments&anchor=thread:1"
	if got != want {
		t.Fatalf("expected translated runtime path %q, got %q", want, got)
	}
}

func TestSourceSearchResultRuntimeLinkPrefersBackendDrillIn(t *testing.T) {
	link := sourceSearchResultRuntimeLink("/admin", "tenant_id=tenant-1&user_id=ops-user", services.SourceSearchResultSummary{
		ResultKind: "source_revision",
		Source: &services.LineageReference{
			ID:    "src-123",
			Label: "Contract",
		},
		Revision: &services.SourceRevisionSummary{
			ID: "rev-123",
		},
		MatchedFields: []string{"artifact_hash"},
		DrillIn: &services.SourceWorkspaceDrillIn{
			Panel:  services.SourceWorkspacePanelComments,
			Anchor: "thread:1",
			Href:   "/admin/api/v1/esign/sources/src-123/workspace?panel=comments&anchor=thread:1",
		},
		Links: services.SourceManagementLinks{
			Anchor:    "/admin/api/v1/esign/sources/src-123/workspace?panel=comments&anchor=thread:1",
			Artifacts: "/admin/api/v1/esign/source-revisions/rev-123/artifacts",
		},
	})

	want := "/admin/esign/sources/src-123/workspace?panel=comments&anchor=thread:1&tenant_id=tenant-1&user_id=ops-user"
	if link.Href != want {
		t.Fatalf("expected backend drill-in href %q, got %q", want, link.Href)
	}
}
