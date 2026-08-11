package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"path"
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	AdminPartialShellSidebar    = "admin.shell.sidebar"
	AdminPartialPageBreadcrumbs = "admin.page.breadcrumbs"
	AdminPartialShellFooter     = "admin.shell.footer"

	AdminPartialInvalidIdentifier = "invalid_identifier"
	AdminPartialUnavailable       = "template_unavailable"
	AdminPartialUnsupportedKey    = "unsupported_admin_key"

	maxAdminStructuralDiagnostics        = 8
	maxAdminStructuralDiagnosticKeyRunes = 96
)

const (
	defaultAdminSidebarPartial    = "partials/sidebar.html"
	defaultAdminBreadcrumbPartial = "partials/breadcrumbs.html"
	defaultAdminFooterPartial     = "partials/admin-footer.html"
)

// AdminTemplateLookup reports whether an identifier is present in the exact
// registered admin view stack. Implementations must not interpret URLs.
type AdminTemplateLookup interface {
	TemplateExists(identifier string) bool
}

// AdminTemplateLookupFunc adapts a function to AdminTemplateLookup.
type AdminTemplateLookupFunc func(identifier string) bool

func (fn AdminTemplateLookupFunc) TemplateExists(identifier string) bool {
	return fn != nil && fn(identifier)
}

// AdminStructuralPartialDiagnostic is safe to project into a debug/view
// context. Candidate values are represented only by a bounded basename and a
// stable fingerprint.
type AdminStructuralPartialDiagnostic struct {
	Key                  string `json:"key"`
	ReasonCode           string `json:"reason_code"`
	CandidateFingerprint string `json:"candidate_fingerprint"`
	CandidateBasename    string `json:"candidate_basename,omitempty"`
}

// AdminStructuralDiagnosticSink receives the same bounded records projected
// to the view context.
type AdminStructuralDiagnosticSink interface {
	RecordAdminStructuralPartialDiagnostics(context.Context, []AdminStructuralPartialDiagnostic)
}

// AdminStructuralDiagnosticSinkFunc adapts a function to the optional sink.
type AdminStructuralDiagnosticSinkFunc func(context.Context, []AdminStructuralPartialDiagnostic)

func (fn AdminStructuralDiagnosticSinkFunc) RecordAdminStructuralPartialDiagnostics(ctx context.Context, diagnostics []AdminStructuralPartialDiagnostic) {
	if fn != nil {
		fn(ctx, diagnostics)
	}
}

// AdminStructuralPartials is the immutable request-scoped structural
// selection shared by ordinary views and dashboard chrome.
type AdminStructuralPartials struct {
	Sidebar     string                             `json:"sidebar"`
	Breadcrumbs string                             `json:"breadcrumbs"`
	Footer      string                             `json:"footer"`
	Diagnostics []AdminStructuralPartialDiagnostic `json:"diagnostics,omitempty"`
}

// AdminPageHeader is the presentation-only model for handlers that need a
// typed page-header boundary. Action markup remains template-owned.
type AdminPageHeader struct {
	Title           string                      `json:"title,omitempty"`
	Pretitle        string                      `json:"pretitle,omitempty"`
	Subtitle        string                      `json:"subtitle,omitempty"`
	Breadcrumbs     []AdminPageHeaderBreadcrumb `json:"breadcrumbs,omitempty"`
	HideHeader      bool                        `json:"hide_header,omitempty"`
	HideBreadcrumbs bool                        `json:"hide_breadcrumbs,omitempty"`
	Hooks           map[string]string           `json:"hooks,omitempty"`
}

// AdminPageChrome is the presentation-only page contract used by authenticated
// route authors. Request/session/theme state is added by the layout enrichment
// boundary, while arbitrary action markup remains template-owned.
type AdminPageChrome struct {
	Header      AdminPageHeader `json:"header"`
	Active      string          `json:"active,omitempty"`
	BodyClasses string          `json:"body_classes,omitempty"`
}

// Clone returns an independent page-chrome value suitable for request storage.
func (chrome AdminPageChrome) Clone() AdminPageChrome {
	chrome.Header.Breadcrumbs = append([]AdminPageHeaderBreadcrumb(nil), chrome.Header.Breadcrumbs...)
	chrome.Header.Hooks = cloneStringMap(chrome.Header.Hooks)
	return chrome
}

// Empty reports whether no page presentation has been supplied.
func (chrome AdminPageChrome) Empty() bool {
	return strings.TrimSpace(chrome.Header.Title) == "" &&
		strings.TrimSpace(chrome.Header.Pretitle) == "" &&
		strings.TrimSpace(chrome.Header.Subtitle) == "" &&
		len(chrome.Header.Breadcrumbs) == 0 && len(chrome.Header.Hooks) == 0 &&
		!chrome.Header.HideHeader && !chrome.Header.HideBreadcrumbs &&
		strings.TrimSpace(chrome.Active) == "" && strings.TrimSpace(chrome.BodyClasses) == ""
}

// AdminPageHeaderBreadcrumb is already-resolved breadcrumb presentation data.
type AdminPageHeaderBreadcrumb struct {
	Label   string `json:"label"`
	Href    string `json:"href,omitempty"`
	Current bool   `json:"current,omitempty"`
}

// DefaultAdminStructuralPartials returns a fresh packaged-default selection.
func DefaultAdminStructuralPartials() AdminStructuralPartials {
	return AdminStructuralPartials{
		Sidebar:     defaultAdminSidebarPartial,
		Breadcrumbs: defaultAdminBreadcrumbPartial,
		Footer:      defaultAdminFooterPartial,
	}
}

// Clone returns an independent selection suitable for request/view storage.
func (selection AdminStructuralPartials) Clone() AdminStructuralPartials {
	selection.Diagnostics = append([]AdminStructuralPartialDiagnostic(nil), selection.Diagnostics...)
	return selection
}

// TemplateContext returns the serialized, lowercase view contract consumed by
// Pongo templates. Using the JSON-shaped map here keeps direct view rendering
// and router-serialized rendering identical.
func (selection AdminStructuralPartials) TemplateContext() map[string]any {
	selection = selection.Clone()
	return map[string]any{
		"sidebar":     selection.Sidebar,
		"breadcrumbs": selection.Breadcrumbs,
		"footer":      selection.Footer,
		"diagnostics": selection.Diagnostics,
	}
}

// WithAdminTemplateLookup installs the configuration-time availability lookup
// used by StructuralPartials. Replacing it while serving is unsupported.
func (a *Admin) WithAdminTemplateLookup(lookup AdminTemplateLookup) *Admin {
	if a != nil {
		a.adminTemplateLookup = lookup
	}
	return a
}

// WithAdminStructuralDiagnosticSink installs an optional safe diagnostic sink.
func (a *Admin) WithAdminStructuralDiagnosticSink(sink AdminStructuralDiagnosticSink) *Admin {
	if a != nil {
		a.adminStructuralDiagnosticSink = sink
	}
	return a
}

// StructuralPartials resolves the bounded admin structural registry. Without
// a filesystem-aware lookup, raw manifest metadata is deliberately ignored.
func (a *Admin) StructuralPartials(ctx context.Context) AdminStructuralPartials {
	defaults := DefaultAdminStructuralPartials()
	if a == nil || a.adminTemplateLookup == nil {
		return defaults
	}
	if ctx == nil {
		ctx = context.Background()
	}

	selection := defaults
	theme := a.resolveTheme(ctx)
	partials := theme.Partials
	diagnostics := make([]AdminStructuralPartialDiagnostic, 0)
	for key, candidate := range partials {
		fallback, supported := adminStructuralFallback(key)
		if !supported {
			if isReservedAdminPartialKey(key) {
				diagnostics = append(diagnostics, newAdminStructuralDiagnostic(key, AdminPartialUnsupportedKey, candidate))
			}
			continue
		}
		normalized, ok := normalizeAdminTemplateIdentifier(candidate)
		if !ok {
			diagnostics = append(diagnostics, newAdminStructuralDiagnostic(key, AdminPartialInvalidIdentifier, candidate))
			continue
		}
		if !a.adminTemplateLookup.TemplateExists(normalized) {
			diagnostics = append(diagnostics, newAdminStructuralDiagnostic(key, AdminPartialUnavailable, candidate))
			continue
		}
		switch key {
		case AdminPartialShellSidebar:
			selection.Sidebar = normalized
		case AdminPartialPageBreadcrumbs:
			selection.Breadcrumbs = normalized
		case AdminPartialShellFooter:
			selection.Footer = normalized
		default:
			_ = fallback
		}
	}
	selection.Diagnostics = normalizeAdminStructuralDiagnostics(diagnostics)
	if a.adminStructuralDiagnosticSink != nil && len(selection.Diagnostics) > 0 {
		a.adminStructuralDiagnosticSink.RecordAdminStructuralPartialDiagnostics(ctx, append([]AdminStructuralPartialDiagnostic(nil), selection.Diagnostics...))
	}
	return selection.Clone()
}

func adminStructuralFallback(key string) (string, bool) {
	switch key {
	case AdminPartialShellSidebar:
		return defaultAdminSidebarPartial, true
	case AdminPartialPageBreadcrumbs:
		return defaultAdminBreadcrumbPartial, true
	case AdminPartialShellFooter:
		return defaultAdminFooterPartial, true
	default:
		return "", false
	}
}

func isReservedAdminPartialKey(key string) bool {
	key = strings.TrimSpace(key)
	return strings.HasPrefix(key, "admin.shell.") || strings.HasPrefix(key, "admin.page.")
}

func normalizeAdminTemplateIdentifier(candidate string) (string, bool) {
	normalized := strings.TrimSpace(candidate)
	if normalized == "" || !utf8.ValidString(normalized) || normalized != candidate {
		return "", false
	}
	if strings.ContainsAny(normalized, `\?#`) || strings.HasPrefix(normalized, "/") || path.Ext(normalized) != ".html" {
		return "", false
	}
	if !hasValidAdminTemplateIdentifierRunes(normalized) {
		return "", false
	}
	cleaned := path.Clean(normalized)
	if cleaned != normalized || cleaned == "." || cleaned == ".." || strings.HasPrefix(cleaned, "../") {
		return "", false
	}
	if !hasValidAdminTemplateIdentifierSegments(cleaned) {
		return "", false
	}
	return cleaned, true
}

func hasValidAdminTemplateIdentifierRunes(identifier string) bool {
	for _, r := range identifier {
		if unicode.IsControl(r) || !isAdminTemplateIdentifierRune(r) {
			return false
		}
	}
	return true
}

func hasValidAdminTemplateIdentifierSegments(identifier string) bool {
	for segment := range strings.SplitSeq(identifier, "/") {
		if segment == "" || segment == "." || segment == ".." || strings.HasPrefix(segment, ".") {
			return false
		}
	}
	return true
}

func isAdminTemplateIdentifierRune(r rune) bool {
	return r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' ||
		r == '/' || r == '.' || r == '-' || r == '_'
}

func newAdminStructuralDiagnostic(key, reason, candidate string) AdminStructuralPartialDiagnostic {
	sum := sha256.Sum256([]byte(candidate))
	basename := path.Base(strings.ReplaceAll(candidate, `\`, "/"))
	basename = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, basename)
	basenameRunes := []rune(basename)
	if len(basenameRunes) > 64 {
		basename = string(basenameRunes[:64])
	}
	return AdminStructuralPartialDiagnostic{
		Key:                  safeAdminStructuralDiagnosticKey(key),
		ReasonCode:           reason,
		CandidateFingerprint: hex.EncodeToString(sum[:8]),
		CandidateBasename:    basename,
	}
}

func safeAdminStructuralDiagnosticKey(key string) string {
	trimmed := strings.TrimSpace(key)
	if isSafeAdminStructuralDiagnosticKey(trimmed) {
		return trimmed
	}
	sum := sha256.Sum256([]byte(key))
	return "unsafe-admin-key-" + hex.EncodeToString(sum[:8])
}

func isSafeAdminStructuralDiagnosticKey(key string) bool {
	if !utf8.ValidString(key) {
		return false
	}
	runes := []rune(key)
	if len(runes) == 0 || len(runes) > maxAdminStructuralDiagnosticKeyRunes {
		return false
	}
	for _, r := range runes {
		if r == '/' || !isAdminTemplateIdentifierRune(r) {
			return false
		}
	}
	return true
}

func normalizeAdminStructuralDiagnostics(input []AdminStructuralPartialDiagnostic) []AdminStructuralPartialDiagnostic {
	sort.Slice(input, func(i, j int) bool {
		if input[i].Key != input[j].Key {
			return input[i].Key < input[j].Key
		}
		if input[i].ReasonCode != input[j].ReasonCode {
			return input[i].ReasonCode < input[j].ReasonCode
		}
		return input[i].CandidateFingerprint < input[j].CandidateFingerprint
	})
	out := make([]AdminStructuralPartialDiagnostic, 0, min(len(input), maxAdminStructuralDiagnostics))
	seen := map[string]struct{}{}
	for _, diagnostic := range input {
		identity := diagnostic.Key + "\x00" + diagnostic.ReasonCode + "\x00" + diagnostic.CandidateFingerprint
		if _, ok := seen[identity]; ok {
			continue
		}
		seen[identity] = struct{}{}
		out = append(out, diagnostic)
		if len(out) == maxAdminStructuralDiagnostics {
			break
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
