package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestRuntimeSourceManagementPagesBootWithSeededContracts(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("newESignRuntimeWebFixtureForTestsWithGoogleEnabled: %v", err)
	}

	_, urls, err := seedESignRuntimeFixtures(context.Background(), "/admin", fixture.Module, fixture.Bootstrap)
	if err != nil {
		t.Fatalf("seedESignRuntimeFixtures: %v", err)
	}
	authCookie := loginESignRuntimeAdmin(t, fixture.App)

	cases := []struct {
		name         string
		endpoint     string
		expectedPage string
		expectedText []string
		assertModel  func(t *testing.T, payload map[string]any)
	}{
		{
			name:         "source browser",
			endpoint:     urls.SourceBrowserURL,
			expectedPage: eSignPageSourceBrowser,
			expectedText: []string{"Source Browser", "/admin/esign/source-search"},
			assertModel: func(t *testing.T, payload map[string]any) {
				t.Helper()
				if got := strings.TrimSpace(rawToString(payload["surface"])); got != "source_browser" {
					t.Fatalf("expected source_browser surface, got %q", got)
				}
			},
		},
		{
			name:         "source detail",
			endpoint:     urls.SourceDetailURL,
			expectedPage: eSignPageSourceDetail,
			expectedText: []string{"Source Browser", "Latest Revision", "Pending Candidates"},
			assertModel: func(t *testing.T, payload map[string]any) {
				t.Helper()
				if got := strings.TrimSpace(rawToString(payload["surface"])); got != "source_detail" {
					t.Fatalf("expected source_detail surface, got %q", got)
				}
				if strings.TrimSpace(rawToString(payload["resource_id"])) == "" {
					t.Fatalf("expected source detail resource id, got %+v", payload)
				}
			},
		},
		{
			name:         "revision inspector",
			endpoint:     urls.SourceRevisionURL,
			expectedPage: eSignPageSourceRevision,
			expectedText: []string{"Revision Inspector", "Comment Inspector", "Artifact Inspector"},
			assertModel: func(t *testing.T, payload map[string]any) {
				t.Helper()
				if got := strings.TrimSpace(rawToString(payload["surface"])); got != "source_revision" {
					t.Fatalf("expected source_revision surface, got %q", got)
				}
			},
		},
		{
			name:         "comment inspector",
			endpoint:     urls.SourceCommentsURL,
			expectedPage: eSignPageSourceComments,
			expectedText: []string{"Comment Inspector", "Revision Inspector", "Sync Status"},
			assertModel: func(t *testing.T, payload map[string]any) {
				t.Helper()
				if got := strings.TrimSpace(rawToString(payload["surface"])); got != "source_comments" {
					t.Fatalf("expected source_comments surface, got %q", got)
				}
			},
		},
		{
			name:         "artifact inspector",
			endpoint:     urls.SourceArtifactsURL,
			expectedPage: eSignPageSourceArtifacts,
			expectedText: []string{"Artifact Inspector", "Revision Inspector", "Artifacts"},
			assertModel: func(t *testing.T, payload map[string]any) {
				t.Helper()
				if got := strings.TrimSpace(rawToString(payload["surface"])); got != "source_artifacts" {
					t.Fatalf("expected source_artifacts surface, got %q", got)
				}
			},
		},
		{
			name:         "source search",
			endpoint:     urls.SourceSearchURL,
			expectedPage: eSignPageSourceSearch,
			expectedText: []string{"Source Search", "Search Drill-Ins", "/admin/esign/sources"},
			assertModel: func(t *testing.T, payload map[string]any) {
				t.Helper()
				if got := strings.TrimSpace(rawToString(payload["surface"])); got != "source_search" {
					t.Fatalf("expected source_search surface, got %q", got)
				}
				links, ok := payload["result_links"].([]any)
				if !ok || len(links) == 0 {
					t.Fatalf("expected search result drill-ins, got %+v", payload["result_links"])
				}
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := doRequestWithCookie(t, fixture.App, http.MethodGet, tc.endpoint, authCookie)
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				body, _ := io.ReadAll(resp.Body)
				t.Fatalf("expected %s status 200, got %d body=%s", tc.name, resp.StatusCode, strings.TrimSpace(string(body)))
			}
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("read %s body: %v", tc.name, err)
			}
			html := string(body)
			for _, snippet := range tc.expectedText {
				if !strings.Contains(html, snippet) {
					t.Fatalf("expected %s html to contain %q", tc.name, snippet)
				}
			}

			pageConfig := extractESignPageConfigFromHTML(t, html)
			if got := strings.TrimSpace(rawToString(pageConfig["page"])); got != tc.expectedPage {
				t.Fatalf("expected page config %q, got %q", tc.expectedPage, got)
			}
			routes, ok := pageConfig["routes"].(map[string]any)
			if !ok || routes == nil {
				t.Fatalf("expected runtime routes in page config, got %+v", pageConfig["routes"])
			}
			if strings.TrimSpace(rawToString(routes["source_browser"])) == "" || strings.TrimSpace(rawToString(routes["source_search"])) == "" {
				t.Fatalf("expected source browser/search routes in page config, got %+v", routes)
			}

			pageModel := extractJSONScriptPayloadFromHTML(t, html, "source-management-page-model")
			tc.assertModel(t, pageModel)
		})
	}
}

func TestRuntimeSourceManagementPagesAreDiscoverableFromAdminRuntimeNavigation(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("newESignRuntimeWebFixtureForTestsWithGoogleEnabled: %v", err)
	}

	_, urls, err := seedESignRuntimeFixtures(context.Background(), "/admin", fixture.Module, fixture.Bootstrap)
	if err != nil {
		t.Fatalf("seedESignRuntimeFixtures: %v", err)
	}
	authCookie := loginESignRuntimeAdmin(t, fixture.App)

	landingResp := doRequestWithCookie(t, fixture.App, http.MethodGet, "/admin", authCookie)
	defer landingResp.Body.Close()
	if landingResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(landingResp.Body)
		t.Fatalf("expected landing page status 200, got %d body=%s", landingResp.StatusCode, strings.TrimSpace(string(body)))
	}
	landingBody, err := io.ReadAll(landingResp.Body)
	if err != nil {
		t.Fatalf("read landing page body: %v", err)
	}
	for _, snippet := range []string{"/admin/esign/sources", "/admin/esign/source-search"} {
		if !strings.Contains(string(landingBody), snippet) {
			t.Fatalf("expected landing runtime navigation to contain %q", snippet)
		}
	}

	detailResp := doRequestWithCookie(t, fixture.App, http.MethodGet, urls.SourceDetailURL, authCookie)
	defer detailResp.Body.Close()
	if detailResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(detailResp.Body)
		t.Fatalf("expected source detail page status 200, got %d body=%s", detailResp.StatusCode, strings.TrimSpace(string(body)))
	}
	detailBody, err := io.ReadAll(detailResp.Body)
	if err != nil {
		t.Fatalf("read source detail body: %v", err)
	}
	for _, snippet := range []string{"Source Browser", "/admin/esign/sources", "Latest Revision"} {
		if !strings.Contains(string(detailBody), snippet) {
			t.Fatalf("expected source detail runtime shell to contain %q", snippet)
		}
	}
}

func TestRuntimeSourceSearchUsesGoSearchWhenLegacySearchStoreIsUnavailable(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithOptions(t, false, eSignRuntimeWebFixtureOptions{
		StoreWrap: func(store stores.Store) stores.Store {
			lineageStore, _ := store.(stores.LineageStore)
			return legacySourceSearchFailingRuntimeStore{
				Store:        store,
				LineageStore: lineageStore,
			}
		},
	})
	if err != nil {
		t.Fatalf("newESignRuntimeWebFixtureForTestsWithOptions: %v", err)
	}

	_, urls, err := seedESignRuntimeFixtures(context.Background(), "/admin", fixture.Module, fixture.Bootstrap)
	if err != nil {
		t.Fatalf("seedESignRuntimeFixtures: %v", err)
	}
	authCookie := loginESignRuntimeAdmin(t, fixture.App)

	resp := doRequestWithCookie(t, fixture.App, http.MethodGet, urls.SourceSearchURL, authCookie)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected source search status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read source search body: %v", err)
	}
	html := string(body)
	for _, snippet := range []string{"Source Search", "fixture-google-file-legacy", "Search Drill-Ins"} {
		if !strings.Contains(html, snippet) {
			t.Fatalf("expected source search html to contain %q", snippet)
		}
	}
}

type legacySourceSearchFailingRuntimeStore struct {
	stores.Store
	stores.LineageStore
}

func (s legacySourceSearchFailingRuntimeStore) ListSourceSearchDocuments(context.Context, stores.Scope, stores.SourceSearchDocumentQuery) ([]stores.SourceSearchDocumentRecord, error) {
	return nil, fmt.Errorf("legacy source_search_documents should not be used by runtime search")
}
