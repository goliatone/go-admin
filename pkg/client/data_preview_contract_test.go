package client_test

import (
	"encoding/json"
	"net/url"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	admindata "github.com/goliatone/go-admin/data"
)

// dataPreviewContractFixture holds application preview capability and session
// replies built from the frozen data.Preview* and session wire types for the
// prepared receipts the Data console golden projects (Ready rcpt-ready-1 and
// Quiet rcpt-empty-1 on the preview target), plus the bootstrap route set.
// The client preview suites answer their requests with them. Regenerate with
// UPDATE_CONSOLE_CONTRACT=1 after a reviewed change.
const dataPreviewContractFixture = "assets/tests/fixtures/data-preview-contract.json"

const dataPreviewSurfaceID = "synthetic-orders-report"

var dataPreviewExpiresAt = time.Date(2026, 10, 3, 12, 15, 0, 0, time.UTC)

type dataPreviewCapabilityCase struct {
	Name      string                      `json:"name"`
	Selection admindata.ExploreSelection  `json:"selection"`
	Response  admindata.PreviewCapability `json:"response"`
}

type dataPreviewSessionCase struct {
	Name     string                                `json:"name"`
	Request  admindata.OpenApplicationPreviewInput `json:"request"`
	Response admindata.ApplicationPreviewSession   `json:"response"`
}

func dataPreviewGuarantees() admindata.PreviewGuarantees {
	return admindata.PreviewGuarantees{Durable: true, Isolation: true, ReadOnly: true, Retention: true, Cleanup: true}
}

// dataPreviewRoutes are the named management and surface routes the Data page
// bootstrap declares (`extensions.data_preview`) under the default base path.
func dataPreviewRoutes() admin.DataPreviewURLs {
	return admin.DataPreviewURLs{
		Capabilities: "/admin/data/api/preview/capabilities",
		Open:         "/admin/data/api/preview/sessions",
		Session:      "/admin/data/api/preview/sessions/:session",
		Close:        "/admin/data/api/preview/sessions/:session/close",
		Surface:      "/admin/data/preview/:session/surfaces/:surface",
		API:          "/admin/data/preview/:session/surfaces/:surface/api/report",
	}
}

// dataPreviewSession mirrors the HTTP reply: a ready session carries the
// resolved launch URL; every session carries the Data return URL with its
// exact selection.
func dataPreviewSession(t *testing.T, id string, selection admindata.ExploreSelection, state string) admindata.ApplicationPreviewSession {
	t.Helper()
	encoded, err := json.Marshal(selection)
	if err != nil {
		t.Fatalf("marshal preview selection: %v", err)
	}
	session := admindata.ApplicationPreviewSession{SessionID: id, Selection: selection, SurfaceID: dataPreviewSurfaceID, State: state,
		ExpiresAt: dataPreviewExpiresAt, ReadOnly: true,
		ReturnURL: "/admin/data?" + url.Values{"selection": {string(encoded)}}.Encode()}
	if state == admindata.PreviewReady {
		session.LaunchURL = "/admin/data/preview/" + url.PathEscape(id) + "/surfaces/" + dataPreviewSurfaceID
	}
	return session
}

func dataPreviewContractDocument(t *testing.T) map[string]any {
	t.Helper()
	s := newDataInsightsSelections(newDataConsoleFixtures())
	report := admindata.PreviewSurface{ID: dataPreviewSurfaceID, Label: "Synthetic orders report", Kind: "report"}
	screen := admindata.PreviewSurface{ID: "orders-screen", Label: "Orders screen", Kind: "screen"}
	hostile := admindata.PreviewSurface{ID: "hostile-report", Label: `<img src=x onerror="window.__previewXSS=1">"quoted" & 'single'`, Kind: "report"}
	unsupported := func(reason string, guarantees admindata.PreviewGuarantees) admindata.PreviewCapability {
		return admindata.PreviewCapability{Reason: reason, Surfaces: []admindata.PreviewSurface{}, Guarantees: guarantees}
	}
	capabilities := []dataPreviewCapabilityCase{
		{Name: "supported", Selection: s.readyPrepared, Response: admindata.PreviewCapability{Supported: true, Surfaces: []admindata.PreviewSurface{report, screen}, Guarantees: dataPreviewGuarantees()}},
		{Name: "quiet_supported", Selection: s.quietPrepared, Response: admindata.PreviewCapability{Supported: true, Surfaces: []admindata.PreviewSurface{report}, Guarantees: dataPreviewGuarantees()}},
		{Name: "not_supported", Selection: s.readyPrepared, Response: unsupported("not_supported", admindata.PreviewGuarantees{})},
		{Name: "runtime_unavailable", Selection: s.readyPrepared, Response: unsupported("runtime_unavailable", admindata.PreviewGuarantees{})},
		{Name: "no_readable_surfaces", Selection: s.readyPrepared, Response: unsupported("no_readable_surfaces", dataPreviewGuarantees())},
		{Name: "hostile", Selection: s.readyPrepared, Response: admindata.PreviewCapability{Supported: true, Surfaces: []admindata.PreviewSurface{hostile}, Guarantees: dataPreviewGuarantees()}},
	}
	open := func(selection admindata.ExploreSelection, request string) admindata.OpenApplicationPreviewInput {
		return admindata.OpenApplicationPreviewInput{Selection: selection, SurfaceID: dataPreviewSurfaceID, RequestID: request}
	}
	sessions := []dataPreviewSessionCase{
		{Name: "ready", Request: open(s.readyPrepared, "00000000-0000-4000-8000-000000000001"), Response: dataPreviewSession(t, "preview-ready-1", s.readyPrepared, admindata.PreviewReady)},
		{Name: "quiet", Request: open(s.quietPrepared, "00000000-0000-4000-8000-000000000002"), Response: dataPreviewSession(t, "preview-quiet-1", s.quietPrepared, admindata.PreviewReady)},
		{Name: "closed", Request: open(s.readyPrepared, "00000000-0000-4000-8000-000000000001"), Response: dataPreviewSession(t, "preview-ready-1", s.readyPrepared, admindata.PreviewClosed)},
		{Name: "expired", Request: open(s.readyPrepared, "00000000-0000-4000-8000-000000000001"), Response: dataPreviewSession(t, "preview-ready-1", s.readyPrepared, admindata.PreviewExpired)},
		{Name: "unavailable", Request: open(s.readyPrepared, "00000000-0000-4000-8000-000000000001"), Response: dataPreviewSession(t, "preview-ready-1", s.readyPrepared, admindata.PreviewUnavailable)},
	}
	for _, item := range sessions {
		if err := item.Request.Validate(); err != nil {
			t.Fatalf("fixture open request %s invalid: %v", item.Name, err)
		}
		if err := (admindata.ApplicationPreviewSessionQuery{SessionID: item.Response.SessionID}).Validate(); err != nil {
			t.Fatalf("fixture session %s locator invalid: %v", item.Name, err)
		}
	}
	for _, item := range capabilities {
		if err := (admindata.PreviewCapabilitiesQuery{Selection: item.Selection}).Validate(); err != nil {
			t.Fatalf("fixture capability %s selection invalid: %v", item.Name, err)
		}
	}
	return map[string]any{
		"routes":       dataPreviewRoutes(),
		"capabilities": capabilities,
		"sessions":     sessions,
		"limits": map[string]any{
			"surfaces":         admindata.PreviewMaxSurfaces,
			"sessions":         admindata.PreviewMaxSessions,
			"default_lifetime": admindata.PreviewDefaultLifetime.String(),
			"max_lifetime":     admindata.PreviewMaxLifetime.String(),
		},
	}
}

// dataPreviewPageFixture is the preview session page the Data module renders
// around a host view (admin.RenderDataPreviewPage) for the Ready session of the
// contract fixture. The page script suite mounts on it.
const dataPreviewPageFixture = "assets/tests/fixtures/data-preview-page.html"

func TestDataPreviewPageFixtureMatchesChrome(t *testing.T) {
	s := newDataInsightsSelections(newDataConsoleFixtures())
	session := dataPreviewSession(t, "preview-ready-1", s.readyPrepared, admindata.PreviewReady)
	session.LaunchURL, session.ReturnURL = "", ""
	page, err := admin.RenderDataPreviewPage(admin.DataPreviewPage{Session: session, Title: "Synthetic orders report", Routes: dataPreviewRoutes(),
		DataPage: "/admin/data", AssetBase: "/admin", CSRFToken: "csrf-1", Now: time.Date(2026, 10, 3, 12, 0, 0, 0, time.UTC),
		Body: []byte(`<section class="orders-report" data-orders-report><h1>Synthetic orders report</h1><p data-report-order-count>3</p></section>`)})
	if err != nil {
		t.Fatal(err)
	}
	assertDataConsoleGolden(t, dataPreviewPageFixture, page)
}

func TestDataPreviewContractFixtureMatchesGoTypes(t *testing.T) {
	encoded, err := json.MarshalIndent(dataPreviewContractDocument(t), "", "  ")
	if err != nil {
		t.Fatalf("marshal data preview contract: %v", err)
	}
	assertDataConsoleGolden(t, dataPreviewContractFixture, append(encoded, '\n'))
}
