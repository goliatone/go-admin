package admin

import (
	"bytes"
	"context"
	"encoding/json"
	htmltemplate "html/template"
	"net/url"
	"strings"
	"time"

	"github.com/goliatone/go-admin/data"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
)

// Application preview presentation. The Data module wraps every HTML view a
// host renders for a preview session in this chrome: preview and read-only
// state, the exact pinned dataset/scenario/target/receipt identity, expiry,
// Close and Return controls, and navigation that stays on the session's
// registered preview routes. Hosts render only their application view (an
// HTML fragment); they cannot omit or restyle the chrome. The page is built
// as bytes before the module's final delivery validation, like every surface
// response, and its script (console/data-preview-page) only enhances it:
// without script the Return link still works and the session still expires.

// dataPreviewChromeRoutes are the module routes a preview page links to.
type dataPreviewChromeRoutes struct {
	urls DataPreviewURLs
	// Data page path; the return link adds the exact selection.
	page string
	// Admin asset base path (the layout's asset_base_path).
	assets string
}

// DataPreviewPage is the input of one preview page: the delivered session,
// the host's view fragment and the module routes the chrome links to. Custom
// preview transports render HTML surfaces through RenderDataPreviewPage too.
type DataPreviewPage struct {
	Session data.ApplicationPreviewSession
	// Title names the application view; it defaults to the surface ID.
	Title string
	// ScenarioTitle and DatasetTitle are the declared human names of the pinned
	// selection; they default to its identifiers.
	ScenarioTitle, DatasetTitle string
	// Routes are the module's resolved preview route templates.
	Routes DataPreviewURLs
	// DataPage is the Data page path; the Return link adds the exact selection.
	DataPage string
	// AssetBase is the admin asset base path (the layout's asset_base_path).
	AssetBase string
	// CSRFToken is the page's CSRF form token; Close sends it.
	CSRFToken string
	// Now is the server clock, so the page can show expiry on it.
	Now time.Time
	// Body is trusted host-rendered HTML from an escaping template.
	// Never pass raw user input or unescaped model values here.
	Body []byte
}

type dataPreviewPage struct {
	Title           string
	ScenarioTitle   string
	DatasetTitle    string
	SessionID       string
	Surface         string
	Dataset         data.DatasetRef
	Scenario        data.ScenarioRef
	TargetID        string
	ReceiptID       string
	ContentRevision uint64
	ExpiresISO      string
	ExpiresLabel    string
	ServerNowISO    string
	SelectionJSON   string
	ViewURL         string
	DataURL         string
	SessionURL      string
	CloseURL        string
	ReturnURL       string
	Styles          []string
	Script          string
	CSRFToken       string
	Body            htmltemplate.HTML
}

var dataPreviewPageTemplate = htmltemplate.Must(htmltemplate.New("data-preview-page").Parse(`<!doctype html>
<html lang="en" class="data-preview-document">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="same-origin">
  {{- if .CSRFToken}}
  <meta name="csrf-token" content="{{.CSRFToken}}">
  {{- end}}
  <title>{{.Title}} · Application preview</title>
  {{- range .Styles}}
  <link rel="stylesheet" href="{{.}}">
  {{- end}}
</head>
<body class="data-preview-body">
  <a class="data-preview-skip" href="#data-preview-main">Skip to the previewed view</a>
  <div class="console-root data-preview" data-preview-page data-preview-session="{{.SessionID}}" data-preview-session-url="{{.SessionURL}}" data-preview-close-url="{{.CloseURL}}" data-preview-return-url="{{.ReturnURL}}" data-preview-surface="{{.Surface}}" data-preview-expires="{{.ExpiresISO}}" data-preview-server-now="{{.ServerNowISO}}" data-preview-selection="{{.SelectionJSON}}">
    <header class="data-preview__chrome">
      <div class="data-preview__bar">
        <div class="data-preview__flags">
          <span class="console-badge console-badge--warning">Preview</span>
          <span class="console-badge console-badge--info">Read-only</span>
          <p class="data-preview__flag-text">Prepared data, not what {{.TargetID}} serves. Nothing you do here changes it.</p>
        </div>
        <nav class="data-preview__controls" aria-label="Preview controls">
          <a class="console-btn console-btn--sm" href="{{.ReturnURL}}" data-preview-return>Return to Data</a>
          <button type="button" class="console-btn console-btn--sm" data-preview-close hidden>Close preview</button>
        </nav>
      </div>
      <p class="data-preview__identity-line">Previewing <strong class="data-preview__value">{{.ScenarioTitle}}</strong> <span class="data-preview__meta">· {{.DatasetTitle}} · prepared for {{.TargetID}}</span> <span class="data-preview__meta">· Expires <time datetime="{{.ExpiresISO}}" data-preview-expiry>{{.ExpiresLabel}}</time> <span data-preview-remaining></span></span></p>
      <details class="data-preview__identity-details">
        <summary>Details</summary>
        <dl class="data-preview__identity">
          <div><dt>Dataset</dt><dd><span class="data-preview__value">{{.Dataset.ID}}</span> <span class="data-preview__meta">v{{.Dataset.Version}} · {{.Dataset.Provider}}</span></dd></div>
          <div><dt>Scenario</dt><dd><span class="data-preview__value">{{.Scenario.ID}}</span> <span class="data-preview__meta">v{{.Scenario.Version}}</span></dd></div>
          <div><dt>Target</dt><dd><span class="data-preview__value">{{.TargetID}}</span></dd></div>
          <div><dt>Prepared receipt</dt><dd><code class="data-preview__value">{{.ReceiptID}}</code> <span class="data-preview__meta">content revision {{.ContentRevision}}</span></dd></div>
        </dl>
      </details>
      <nav class="data-preview__views" aria-label="{{.Title}} views">
        <a href="{{.ViewURL}}" aria-current="page">View</a>
        <a href="{{.DataURL}}">View data (JSON)</a>
      </nav>
      <p class="data-preview__status" role="status" data-preview-status></p>
    </header>
    <main class="data-preview__surface" id="data-preview-main" tabindex="-1" data-preview-main>
      {{.Body}}
    </main>
  </div>
  <script type="module" src="{{.Script}}"></script>
</body>
</html>
`))

var dataPreviewFailureTemplate = htmltemplate.Must(htmltemplate.New("data-preview-failure").Parse(`<!doctype html>
<html lang="en" class="data-preview-document">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="referrer" content="same-origin">
  <title>Preview unavailable · Application preview</title>
  {{- range .Styles}}
  <link rel="stylesheet" href="{{.}}">
  {{- end}}
</head>
<body class="data-preview-body">
  <div class="console-root data-preview" data-preview-failure-page data-preview-status="{{.Status}}">
    <header class="data-preview__chrome">
      <div class="data-preview__bar">
        <div class="data-preview__flags">
          <span class="console-badge console-badge--warning">Preview</span>
          <p class="data-preview__flag-text">This preview cannot be shown.</p>
        </div>
        <nav class="data-preview__controls" aria-label="Preview controls">
          <a class="console-btn console-btn--sm" href="{{.DataPage}}">Return to Data</a>
        </nav>
      </div>
    </header>
    <main class="data-preview__surface" id="data-preview-main">
      <div class="console-callout data-preview__ended" data-tone="warning" role="alert"><p>{{.Message}}</p></div>
    </main>
  </div>
</body>
</html>
`))

// dataPreviewFailureMessage explains a refused preview page by its HTTP class,
// never by anything the refused session would have shown.
func dataPreviewFailureMessage(status int) string {
	switch status {
	case 400:
		return "This preview link is not valid. Start the preview again from Data."
	case 401:
		return "Your session expired. Sign in again, then start the preview from Data."
	case 403:
		return "You do not have access to this preview."
	case 404, 410:
		return "This preview is no longer available. It was closed, it expired or its data changed. Start a new preview from Data."
	case 409:
		return "The prepared data changed, so this preview ended. Start a new preview from Data."
	default:
		return "This preview cannot be shown right now. Return to Data and try again."
	}
}

// renderDataPreviewFailurePage is the HTML answer to a refused preview page
// navigation: the status class and a way back to Data, nothing else.
func renderDataPreviewFailurePage(status int, routes dataPreviewChromeRoutes) ([]byte, error) {
	if !safePreviewURL(routes.page) {
		return nil, data.Error(data.CodeProvider)
	}
	assets := strings.TrimRight(strings.TrimSpace(routes.assets), "/")
	view := struct {
		Status   int
		Message  string
		DataPage string
		Styles   []string
	}{Status: status, Message: dataPreviewFailureMessage(status), DataPage: routes.page, Styles: []string{assets + "/assets/output.css", assets + "/assets/dist/styles/console.css"}}
	var out bytes.Buffer
	if err := dataPreviewFailureTemplate.Execute(&out, view); err != nil {
		return nil, data.Error(data.CodeProvider)
	}
	return out.Bytes(), nil
}

// previewAcceptsHTML is true for browser navigations to a preview page.
func previewAcceptsHTML(c router.Context) bool {
	return strings.Contains(strings.ToLower(c.Header("Accept")), "text/html")
}

// previewCSRFToken is the request's CSRF form token, when the CSRF middleware
// issued one for this page; the page script sends it with Close.
func previewCSRFToken(c router.Context) string {
	if c == nil {
		return ""
	}
	helpers, ok := c.Locals(csrfmw.DefaultTemplateHelpersKey).(map[string]any)
	if !ok {
		return ""
	}
	token, ok := helpers["csrf_token"].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(token)
}

// previewReturnURL is the Data page with the session's exact selection.
func previewReturnURL(page string, selection data.ExploreSelection) (string, error) {
	encoded, err := json.Marshal(selection)
	if err != nil {
		return "", data.Error(data.CodeProvider)
	}
	return page + "?" + url.Values{"selection": {string(encoded)}}.Encode(), nil
}

// renderDataPreviewPage wraps a host's view fragment in the preview chrome.
func renderDataPreviewPage(c router.Context, routes dataPreviewChromeRoutes, read data.PreviewReadContext, title string, names dataPreviewNames, body []byte, now time.Time) ([]byte, error) {
	return RenderDataPreviewPage(DataPreviewPage{Session: read.Session, Title: title, ScenarioTitle: names.scenario, DatasetTitle: names.dataset, Routes: routes.urls, DataPage: routes.page,
		AssetBase: routes.assets, CSRFToken: previewCSRFToken(c), Now: now, Body: body})
}

// dataPreviewNames are the declared human names of a pinned selection.
type dataPreviewNames struct{ scenario, dataset string }

// previewNames resolves the pinned selection's declared titles from the
// catalog the actor may already read; identifiers remain the fallback and a
// failed lookup never fails the page.
func (m *DataModule) previewNames(ctx context.Context, selection data.ExploreSelection) dataPreviewNames {
	descriptor, err := m.config.Service.Describe(ctx, selection.Dataset, selection.TargetID)
	if err != nil {
		return dataPreviewNames{}
	}
	return dataPreviewNames{scenario: descriptor.ScenarioTitle(selection.Scenario.ID), dataset: descriptor.Title()}
}

// RenderDataPreviewPage wraps a host's view fragment in the preview chrome:
// preview and read-only flags, the exact pinned identity, expiry, Close and
// Return controls and navigation on the session's preview routes. Every link
// must resolve to a same-origin path.
func RenderDataPreviewPage(in DataPreviewPage) ([]byte, error) {
	session := in.Session
	selection := session.Selection
	if session.SessionID == "" || selection.Context != data.ExplorePrepared || strings.TrimSpace(in.DataPage) == "" {
		return nil, data.Error(data.CodeProvider)
	}
	returnURL, err := previewReturnURL(in.DataPage, selection)
	if err != nil {
		return nil, err
	}
	title, body, now := in.Title, in.Body, in.Now
	encoded, err := json.Marshal(selection)
	if err != nil {
		return nil, data.Error(data.CodeProvider)
	}
	if strings.TrimSpace(title) == "" {
		title = session.SurfaceID
	}
	scenarioTitle := strings.TrimSpace(in.ScenarioTitle)
	if scenarioTitle == "" {
		scenarioTitle = selection.Scenario.ID + " v" + selection.Scenario.Version
	}
	datasetTitle := strings.TrimSpace(in.DatasetTitle)
	if datasetTitle == "" {
		datasetTitle = selection.Dataset.Provider + "/" + selection.Dataset.ID + " v" + selection.Dataset.Version
	}
	assets := strings.TrimRight(strings.TrimSpace(in.AssetBase), "/")
	page := dataPreviewPage{
		Title:           title,
		ScenarioTitle:   scenarioTitle,
		DatasetTitle:    datasetTitle,
		SessionID:       session.SessionID,
		Surface:         session.SurfaceID,
		Dataset:         selection.Dataset,
		Scenario:        selection.Scenario,
		TargetID:        selection.TargetID,
		ReceiptID:       selection.ReceiptID,
		ContentRevision: selection.ContentRevision,
		// Full precision: the page ends the view on the server's expiry instant, not a second early.
		ExpiresISO:    session.ExpiresAt.UTC().Format(time.RFC3339Nano),
		ExpiresLabel:  session.ExpiresAt.UTC().Format("15:04") + " UTC",
		ServerNowISO:  now.UTC().Format(time.RFC3339Nano),
		SelectionJSON: string(encoded),
		ViewURL:       previewLocatorURL(in.Routes.Surface, session),
		DataURL:       previewLocatorURL(in.Routes.API, session),
		SessionURL:    previewLocatorURL(in.Routes.Session, session),
		CloseURL:      previewLocatorURL(in.Routes.Close, session),
		ReturnURL:     returnURL,
		Styles:        []string{assets + "/assets/output.css", assets + "/assets/dist/styles/console.css"},
		Script:        assets + "/assets/dist/console/data-preview-page.js",
		CSRFToken:     strings.TrimSpace(in.CSRFToken),
		// The host renders its fragment with its own escaping template engine.
		Body: htmltemplate.HTML(body), // #nosec G203 -- Trusted host template output; the host escapes model values before composition.
	}
	for _, path := range []string{page.ViewURL, page.DataURL, page.SessionURL, page.CloseURL, page.ReturnURL} {
		if !safePreviewURL(path) {
			return nil, data.Error(data.CodeProvider)
		}
	}
	var out bytes.Buffer
	if err := dataPreviewPageTemplate.Execute(&out, page); err != nil {
		return nil, data.Error(data.CodeProvider)
	}
	return out.Bytes(), nil
}
