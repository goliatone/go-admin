package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
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
		assertHTML   func(t *testing.T, app *fiber.App, authCookie *http.Cookie, html string)
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
			assertHTML: func(t *testing.T, _ *fiber.App, _ *http.Cookie, html string) {
				t.Helper()
				rendered := stripScriptsFromHTML(html)
				if strings.Contains(rendered, "E-Sign Sources") {
					t.Fatal("expected source browser header to avoid bespoke section pretitle")
				}
				assertRenderedHeaderActionClass(t, html, "/admin/esign/source-search", "btn btn-primary")
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
				assertCanonicalWorkspaceContract(t, payload)
			},
			assertHTML: func(t *testing.T, app *fiber.App, authCookie *http.Cookie, html string) {
				t.Helper()
				detailModel := extractJSONScriptPayloadFromHTML(t, html, "source-management-page-model")
				detailContract := assertCanonicalWorkspaceContract(t, detailModel)

				resp := doRequestWithCookie(t, app, http.MethodGet, urls.SourceWorkspaceURL, authCookie)
				defer closeHTTPResponseBody(t, resp)
				if resp.StatusCode != http.StatusOK {
					body, _ := io.ReadAll(resp.Body)
					t.Fatalf("expected source workspace page status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
				}
				body, err := io.ReadAll(resp.Body)
				if err != nil {
					t.Fatalf("read source workspace alias comparison body: %v", err)
				}
				workspaceModel := extractJSONScriptPayloadFromHTML(t, string(body), "source-management-page-model")
				workspaceContract := assertCanonicalWorkspaceContract(t, workspaceModel)

				detailSource, _ := detailContract["source"].(map[string]any)
				workspaceSource, _ := workspaceContract["source"].(map[string]any)
				if got, want := strings.TrimSpace(rawToString(detailSource["id"])), strings.TrimSpace(rawToString(workspaceSource["id"])); got != want {
					t.Fatalf("expected detail alias source id %q to match workspace source id %q", got, want)
				}
				detailRevision, _ := detailContract["latest_revision"].(map[string]any)
				workspaceRevision, _ := workspaceContract["latest_revision"].(map[string]any)
				if got, want := strings.TrimSpace(rawToString(detailRevision["id"])), strings.TrimSpace(rawToString(workspaceRevision["id"])); got != want {
					t.Fatalf("expected detail alias latest revision %q to match workspace latest revision %q", got, want)
				}
				if got, want := strings.TrimSpace(rawToString(detailContract["active_panel"])), strings.TrimSpace(rawToString(workspaceContract["active_panel"])); got != want {
					t.Fatalf("expected detail alias active panel %q to match workspace active panel %q", got, want)
				}
			},
		},
		{
			name:         "source workspace",
			endpoint:     urls.SourceWorkspaceURL,
			expectedPage: eSignPageSourceWorkspace,
			expectedText: []string{"Status", "Confidence", "Latest Revision"},
			assertModel: func(t *testing.T, payload map[string]any) {
				t.Helper()
				if got := strings.TrimSpace(rawToString(payload["surface"])); got != "source_workspace" {
					t.Fatalf("expected source_workspace surface, got %q", got)
				}
				if strings.TrimSpace(rawToString(payload["resource_id"])) == "" {
					t.Fatalf("expected source workspace resource id, got %+v", payload)
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
			expectedText: []string{"Artifact Inspector", "Revision Inspector", "Total Pages"},
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
			expectedText: []string{"Source Search", "/admin/esign/sources"},
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
			assertHTML: func(t *testing.T, app *fiber.App, authCookie *http.Cookie, html string) {
				t.Helper()
				rendered := stripScriptsFromHTML(html)
				if strings.Contains(rendered, "E-Sign Sources") || strings.Contains(rendered, "Search Drill-Ins") {
					t.Fatal("expected source search header to match shared heading contract without bespoke section/summary copy")
				}
				pageModel := extractJSONScriptPayloadFromHTML(t, html, "source-management-page-model")
				rawLinks, ok := pageModel["result_links"].([]any)
				if !ok || len(rawLinks) == 0 {
					t.Fatalf("expected search result drill-ins, got %+v", pageModel["result_links"])
				}
				for _, rawLink := range rawLinks {
					link, ok := rawLink.(map[string]any)
					if !ok {
						continue
					}
					href := strings.TrimSpace(rawToString(link["href"]))
					if href == "" {
						t.Fatalf("expected reachable result link href, got %+v", link)
					}
					resp := doRequestWithCookie(t, app, http.MethodGet, href, authCookie)
					defer closeHTTPResponseBody(t, resp)
					if resp.StatusCode != http.StatusOK {
						body, _ := io.ReadAll(resp.Body)
						t.Fatalf("expected translated result link %q to return 200, got %d body=%s", href, resp.StatusCode, strings.TrimSpace(string(body)))
					}
				}
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := doRequestWithCookie(t, fixture.App, http.MethodGet, tc.endpoint, authCookie)
			defer closeHTTPResponseBody(t, resp)
			if resp.StatusCode != http.StatusOK {
				body, _ := io.ReadAll(resp.Body)
				t.Fatalf("expected %s status 200, got %d body=%s", tc.name, resp.StatusCode, strings.TrimSpace(string(body)))
			}
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("read %s body: %v", tc.name, err)
			}
			html := string(body)
			visibleHTML := stripScriptsFromHTML(html)
			for _, snippet := range tc.expectedText {
				if !strings.Contains(visibleHTML, snippet) {
					t.Fatalf("expected %s rendered html to contain %q", tc.name, snippet)
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
			if strings.TrimSpace(rawToString(routes["source_detail"])) == "" || strings.TrimSpace(rawToString(routes["source_revision"])) == "" {
				t.Fatalf("expected source detail/revision route ownership in page config, got %+v", routes)
			}

			pageModel := extractJSONScriptPayloadFromHTML(t, html, "source-management-page-model")
			tc.assertModel(t, pageModel)
			assertSourceManagementShellMatchesModel(t, html, pageModel)
			if tc.assertHTML != nil {
				tc.assertHTML(t, fixture.App, authCookie, html)
			}
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
	defer closeHTTPResponseBody(t, landingResp)
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
	defer closeHTTPResponseBody(t, detailResp)
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
	defer closeHTTPResponseBody(t, resp)
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected source search status 200, got %d body=%s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read source search body: %v", err)
	}
	html := string(body)
	for _, snippet := range []string{"Source Search", "fixture-google-file-legacy", "/admin/esign/sources"} {
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

func stripScriptsFromHTML(html string) string {
	re := regexp.MustCompile(`(?is)<script\b[^>]*>.*?</script>`)
	return re.ReplaceAllString(html, "")
}

func assertRenderedHeaderActionClass(t *testing.T, html, hrefPath, classToken string) {
	t.Helper()

	pattern := regexp.MustCompile(`(?is)<a\b[^>]*href="` + regexp.QuoteMeta(hrefPath) + `(?:\?[^"]*)?"[^>]*class="[^"]*` + regexp.QuoteMeta(classToken) + `[^"]*"`)
	if !pattern.MatchString(html) {
		t.Fatalf("expected rendered header action %q to use class token %q", hrefPath, classToken)
	}
}

func assertCanonicalWorkspaceContract(t *testing.T, payload map[string]any) map[string]any {
	t.Helper()

	contract, ok := payload["contract"].(map[string]any)
	if !ok || contract == nil {
		t.Fatalf("expected canonical workspace contract object, got %+v", payload["contract"])
	}
	if strings.TrimSpace(rawToString(contract["active_panel"])) == "" {
		t.Fatalf("expected canonical workspace contract to publish active_panel, got %+v", contract)
	}
	if panels, ok := contract["panels"].([]any); !ok || len(panels) == 0 {
		t.Fatalf("expected canonical workspace contract to publish panel summaries, got %+v", contract["panels"])
	}
	for _, key := range []string{"timeline", "agreements", "artifacts", "comments", "handles", "continuity"} {
		if _, ok := contract[key].(map[string]any); !ok {
			t.Fatalf("expected canonical workspace contract to publish %q section, got %+v", key, contract[key])
		}
	}
	return contract
}

func assertSourceManagementShellMatchesModel(t *testing.T, html string, pageModel map[string]any) {
	t.Helper()

	rendered := stripScriptsFromHTML(html)
	surface := strings.TrimSpace(rawToString(pageModel["surface"]))

	if navLinks, ok := pageModel["nav_links"].([]any); ok {
		for _, raw := range navLinks {
			link, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			label := strings.TrimSpace(rawToString(link["label"]))
			href := strings.TrimSpace(rawToString(link["href"]))
			if label != "" && !strings.Contains(rendered, label) {
				t.Fatalf("expected rendered source-management shell to include nav label %q for surface %q", label, surface)
			}
			hrefPath := strings.TrimSpace(strings.SplitN(href, "?", 2)[0])
			if hrefPath != "" && !strings.Contains(rendered, `href="`+hrefPath) {
				t.Fatalf("expected rendered source-management shell to include nav href path %q for surface %q", hrefPath, surface)
			}
		}
		if len(navLinks) > 2 && !strings.Contains(rendered, `data-admin-action-menu`) {
			t.Fatalf("expected rendered source-management shell to include overflow action menu for surface %q with %d nav links", surface, len(navLinks))
		}
	}

	switch surface {
	case "source_detail", "source_revision", "source_comments", "source_artifacts":
		for _, shellClass := range []string{"lg:w-80 xl:w-96", "lg:sticky lg:top-6"} {
			if !strings.Contains(rendered, shellClass) {
				t.Fatalf("expected rendered source-management shell to include detail shell class %q for surface %q", shellClass, surface)
			}
		}

		quickActions, _ := pageModel["quick_action_links"].([]any)
		if len(quickActions) > 0 {
			if !strings.Contains(rendered, "Quick Actions") {
				t.Fatalf("expected rendered source-management shell to include Quick Actions heading for surface %q", surface)
			}
			for _, raw := range quickActions {
				link, ok := raw.(map[string]any)
				if !ok {
					continue
				}
				label := strings.TrimSpace(rawToString(link["label"]))
				href := strings.TrimSpace(rawToString(link["href"]))
				if label != "" && !strings.Contains(rendered, label) {
					t.Fatalf("expected rendered source-management shell to include quick action label %q for surface %q", label, surface)
				}
				hrefPath := strings.TrimSpace(strings.SplitN(href, "?", 2)[0])
				if hrefPath != "" && !strings.Contains(rendered, `href="`+hrefPath) {
					t.Fatalf("expected rendered source-management shell to include quick action href path %q for surface %q", hrefPath, surface)
				}
			}
		} else if strings.Contains(rendered, "Quick Actions") {
			t.Fatalf("expected rendered source-management shell to omit Quick Actions heading when no quick actions exist for surface %q", surface)
		}

		if highlights, ok := pageModel["highlights"].([]any); ok {
			for _, raw := range highlights {
				highlight, ok := raw.(map[string]any)
				if !ok {
					continue
				}
				label := strings.TrimSpace(rawToString(highlight["label"]))
				value := strings.TrimSpace(rawToString(highlight["value"]))
				if label != "" && !strings.Contains(rendered, label) {
					t.Fatalf("expected rendered source-management shell to include highlight label %q for surface %q", label, surface)
				}
				if value != "" && !strings.Contains(rendered, value) {
					t.Fatalf("expected rendered source-management shell to include highlight value %q for surface %q", value, surface)
				}
			}
		}

		if resultLinks, ok := pageModel["result_links"].([]any); ok {
			for _, raw := range resultLinks {
				link, ok := raw.(map[string]any)
				if !ok {
					continue
				}
				label := strings.TrimSpace(rawToString(link["label"]))
				href := strings.TrimSpace(rawToString(link["href"]))
				if label != "" && !strings.Contains(rendered, label) {
					t.Fatalf("expected rendered source-management shell to include result label %q for surface %q", label, surface)
				}
				hrefPath := strings.TrimSpace(strings.SplitN(href, "?", 2)[0])
				if hrefPath != "" && !strings.Contains(rendered, `href="`+hrefPath) {
					t.Fatalf("expected rendered source-management shell to include result href path %q for surface %q", hrefPath, surface)
				}
			}
		}
	}
}

func TestNonExternalRuntimeLinksFiltersExternalLinks(t *testing.T) {
	links := nonExternalRuntimeLinks(
		sourceManagementRuntimeLink("Open in Provider", "https://example.com/provider", "external"),
		sourceManagementRuntimeLink("Source", "/admin/esign/sources/source-1", "secondary"),
		sourceManagementRuntimeLink("Revision", "/admin/esign/source-revisions/rev-1", "primary"),
	)

	if len(links) != 2 {
		t.Fatalf("expected 2 non-external runtime links, got %d: %+v", len(links), links)
	}
	for _, link := range links {
		if strings.EqualFold(strings.TrimSpace(link.Kind), "external") {
			t.Fatalf("expected external links to be filtered out, got %+v", links)
		}
	}
}

func TestPartitionRuntimeHeaderLinksPromotesSingleVisibleActionToPrimary(t *testing.T) {
	visible, overflow := partitionRuntimeHeaderLinks([]eSignSourceManagementRuntimeLink{
		sourceManagementRuntimeLink("Search", "/admin/esign/source-search", "secondary"),
	}, 2)

	if len(overflow) != 0 {
		t.Fatalf("expected no overflow links, got %+v", overflow)
	}
	if len(visible) != 1 {
		t.Fatalf("expected one visible link, got %+v", visible)
	}
	if got := strings.TrimSpace(visible[0].Kind); got != "primary" {
		t.Fatalf("expected single visible action to be promoted to primary, got %q", got)
	}
}
