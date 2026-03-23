package main

import (
	"net/url"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
)

func TestTranslateSourceManagementAPIPathToRuntimePathFallsBackToDetailWhenWorkspaceRouteMissing(t *testing.T) {
	got := translateSourceManagementAPIPathToRuntimePath(
		"/admin/api/v1/esign/sources/src-123/workspace?panel=comments&anchor=thread:1",
		map[string]string{
			"source_detail": "/admin/esign/sources/:source_document_id",
		},
	)
	assertEquivalentRuntimeHref(t, got, "/admin/esign/sources/src-123", url.Values{
		"panel":  []string{"comments"},
		"anchor": []string{"thread:1"},
	})
}

func TestTranslateSourceManagementAPIPathToRuntimePathUsesWorkspaceRouteWhenRegistered(t *testing.T) {
	got := translateSourceManagementAPIPathToRuntimePath(
		"/admin/api/v1/esign/sources/src-123/workspace?panel=comments&anchor=thread:1",
		map[string]string{
			"source_detail":    "/admin/esign/sources/:source_document_id",
			"source_workspace": "/admin/esign/sources/:source_document_id/workspace",
		},
	)
	assertEquivalentRuntimeHref(t, got, "/admin/esign/sources/src-123/workspace", url.Values{
		"panel":  []string{"comments"},
		"anchor": []string{"thread:1"},
	})
}

func TestSourceSearchResultRuntimeLinkPrefersBackendDrillInAndEmitsReachableWorkspaceHref(t *testing.T) {
	routes := map[string]string{
		"source_browser":            "/admin/esign/sources",
		"source_search":             "/admin/esign/source-search",
		"source_detail":             "/admin/esign/sources/:source_document_id",
		"source_workspace":          "/admin/esign/sources/:source_document_id/workspace",
		"source_revision":           "/admin/esign/source-revisions/:source_revision_id",
		"source_comment_inspector":  "/admin/esign/source-revisions/:source_revision_id/comments",
		"source_artifact_inspector": "/admin/esign/source-revisions/:source_revision_id/artifacts",
	}
	link := sourceSearchResultRuntimeLink(routes, "tenant_id=tenant-1&user_id=ops-user", services.SourceSearchResultSummary{
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

	assertEquivalentRuntimeHref(t, link.Href, "/admin/esign/sources/src-123/workspace", url.Values{
		"panel":     []string{"comments"},
		"anchor":    []string{"thread:1"},
		"tenant_id": []string{"tenant-1"},
		"user_id":   []string{"ops-user"},
	})
	if !runtimeHrefReachable(link.Href, routes) {
		t.Fatalf("expected drill-in href to match a registered runtime route, got %q", link.Href)
	}
}

func assertEquivalentRuntimeHref(t *testing.T, got, wantPath string, wantQuery url.Values) {
	t.Helper()

	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatalf("parse runtime href %q: %v", got, err)
	}
	if parsed.Path != wantPath {
		t.Fatalf("expected runtime href path %q, got %q", wantPath, parsed.Path)
	}
	if encodedGot, encodedWant := parsed.Query().Encode(), wantQuery.Encode(); encodedGot != encodedWant {
		t.Fatalf("expected runtime href query %q, got %q", encodedWant, encodedGot)
	}
}
