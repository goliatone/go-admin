package admin

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

// V1 compatibility note: this audit/rewrite layer exists only for the bridge
// rollout while apps migrate off locale-prefixed stored paths and missing
// route_key values. Remove it in V2 once migrated datasets are proven and
// path-based identity fallback is gone.

type LocalePathRecordClassification string

const (
	LocalePathRecordCanonicalUnprefixed LocalePathRecordClassification = "canonical_unprefixed"
	LocalePathRecordLegacyPrefixed      LocalePathRecordClassification = "legacy_prefixed"
	LocalePathRecordTranslatedLocalized LocalePathRecordClassification = "translated_localized"
	LocalePathRecordAmbiguousLocaleLike LocalePathRecordClassification = "ambiguous_locale_like"
	LocalePathRecordMissing             LocalePathRecordClassification = "missing"
)

type LocalePathRouteKeyReadiness string

const (
	LocalePathRouteKeyPresentConsistent LocalePathRouteKeyReadiness = "present_consistent"
	LocalePathRouteKeyMissingDerivable  LocalePathRouteKeyReadiness = "missing_derivable"
	LocalePathRouteKeyAmbiguous         LocalePathRouteKeyReadiness = "ambiguous"
)

type LocalePathMigrationOptions struct {
	SupportedLocales []string
	DefaultLocale    string
	IncludePages     bool
	IncludeContents  bool
}

type LocalePathMigrationReport struct {
	Options  LocalePathMigrationOptions      `json:"options"`
	Summary  LocalePathMigrationSummary      `json:"summary"`
	Families []LocalePathMigrationFamilyPlan `json:"families"`
}

type LocalePathMigrationSummary struct {
	TotalFamilies             int `json:"total_families"`
	LegacyPrefixedRecords     int `json:"legacy_prefixed_records"`
	TranslatedLocalizedPaths  int `json:"translated_localized_paths"`
	AmbiguousRecords          int `json:"ambiguous_records"`
	MissingRouteKeyFamilies   int `json:"missing_route_key_families"`
	AmbiguousRouteKeyFamilies int `json:"ambiguous_route_key_families"`
	ProposedRewrites          int `json:"proposed_rewrites"`
}

type LocalePathMigrationFamilyPlan struct {
	ResourceKind      string                          `json:"resource_kind"`
	ContentType       string                          `json:"content_type,omitempty"`
	IdentityKey       string                          `json:"identity_key"`
	FamilyID          string                          `json:"family_id,omitempty"`
	RouteKeyReadiness LocalePathRouteKeyReadiness     `json:"route_key_readiness"`
	ProposedRouteKey  string                          `json:"proposed_route_key,omitempty"`
	Records           []LocalePathMigrationRecordPlan `json:"records"`
	Rewrites          []LocalePathMigrationRewrite    `json:"rewrites,omitempty"`
	Warnings          []string                        `json:"warnings,omitempty"`
}

type LocalePathMigrationRecordPlan struct {
	ID              string                         `json:"id"`
	Locale          string                         `json:"locale"`
	Path            string                         `json:"path,omitempty"`
	RouteKey        string                         `json:"route_key,omitempty"`
	Classification  LocalePathRecordClassification `json:"classification"`
	ProposedPath    string                         `json:"proposed_path,omitempty"`
	DerivedRouteKey string                         `json:"derived_route_key,omitempty"`
}

type LocalePathMigrationRewrite struct {
	ResourceKind string   `json:"resource_kind"`
	ContentType  string   `json:"content_type,omitempty"`
	ID           string   `json:"id"`
	Locale       string   `json:"locale"`
	PathFrom     string   `json:"path_from,omitempty"`
	PathTo       string   `json:"path_to,omitempty"`
	RouteKeyFrom string   `json:"route_key_from,omitempty"`
	RouteKeyTo   string   `json:"route_key_to,omitempty"`
	Reasons      []string `json:"reasons,omitempty"`
}

type LocalePathMigrationApplyResult struct {
	Updated []LocalePathMigrationRewrite `json:"updated"`
	Skipped []LocalePathMigrationRewrite `json:"skipped,omitempty"`
}

type localePathMigrationSubject struct {
	ResourceKind string
	ContentType  string
	ID           string
	Locale       string
	FamilyID     string
	Slug         string
	Path         string
	RouteKey     string
	Page         *CMSPage
	Content      *CMSContent
}

func AuditLocalePathMigration(ctx context.Context, svc CMSContentService, opts LocalePathMigrationOptions) (LocalePathMigrationReport, error) {
	if svc == nil {
		return LocalePathMigrationReport{}, ErrNotFound
	}
	opts = normalizeLocalePathMigrationOptions(opts)
	subjects, err := collectLocalePathMigrationSubjects(ctx, svc, opts)
	if err != nil {
		return LocalePathMigrationReport{}, err
	}
	report := LocalePathMigrationReport{
		Options: opts,
	}
	families := groupLocalePathMigrationSubjects(subjects)
	keys := make([]string, 0, len(families))
	for key := range families {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	report.Families = make([]LocalePathMigrationFamilyPlan, 0, len(keys))
	for _, key := range keys {
		plan := buildLocalePathMigrationFamilyPlan(families[key], opts)
		report.Families = append(report.Families, plan)
		rollupLocalePathMigrationSummary(&report.Summary, plan)
	}
	report.Summary.TotalFamilies = len(report.Families)
	return report, nil
}

func ApplyLocalePathMigration(ctx context.Context, svc CMSContentService, report LocalePathMigrationReport) (LocalePathMigrationApplyResult, error) {
	if svc == nil {
		return LocalePathMigrationApplyResult{}, ErrNotFound
	}
	result := LocalePathMigrationApplyResult{}
	for _, family := range report.Families {
		for _, rewrite := range family.Rewrites {
			if rewrite.PathTo == "" && rewrite.RouteKeyTo == "" {
				continue
			}
			if err := applyLocalePathMigrationRewrite(ctx, svc, rewrite); err != nil {
				return result, err
			}
			result.Updated = append(result.Updated, rewrite)
		}
	}
	return result, nil
}

func normalizeLocalePathMigrationOptions(opts LocalePathMigrationOptions) LocalePathMigrationOptions {
	opts.DefaultLocale = strings.ToLower(strings.TrimSpace(opts.DefaultLocale))
	if len(opts.SupportedLocales) > 0 {
		normalized := make([]string, 0, len(opts.SupportedLocales))
		for _, locale := range opts.SupportedLocales {
			locale = strings.ToLower(strings.TrimSpace(locale))
			if locale == "" {
				continue
			}
			normalized = append(normalized, locale)
		}
		opts.SupportedLocales = dedupeStrings(normalized)
	}
	if !opts.IncludePages && !opts.IncludeContents {
		opts.IncludePages = true
		opts.IncludeContents = true
	}
	return opts
}

func collectLocalePathMigrationSubjects(ctx context.Context, svc CMSContentService, opts LocalePathMigrationOptions) ([]localePathMigrationSubject, error) {
	out := []localePathMigrationSubject{}
	if opts.IncludePages {
		pages, err := svc.Pages(ctx, "")
		if err != nil {
			return nil, err
		}
		for i := range pages {
			page := pages[i]
			out = append(out, localePathMigrationSubject{
				ResourceKind: "page",
				ContentType:  "page",
				ID:           strings.TrimSpace(page.ID),
				Locale:       normalizeCreateTranslationLocale(page.Locale),
				FamilyID:     strings.TrimSpace(page.FamilyID),
				Slug:         strings.TrimSpace(page.Slug),
				Path:         normalizeCMSLocalizedPath(ExtractContentPath(page.Data, page.Metadata, "")),
				RouteKey:     strings.TrimSpace(primitives.FirstNonEmptyRaw(page.RouteKey, toString(page.Data["route_key"]), toString(page.Metadata["route_key"]))),
				Page:         &page,
			})
		}
	}
	if opts.IncludeContents {
		contents, err := svc.Contents(ctx, "")
		if err != nil {
			return nil, err
		}
		for i := range contents {
			content := contents[i]
			contentType := strings.TrimSpace(primitives.FirstNonEmptyRaw(content.ContentTypeSlug, content.ContentType))
			out = append(out, localePathMigrationSubject{
				ResourceKind: "content",
				ContentType:  contentType,
				ID:           strings.TrimSpace(content.ID),
				Locale:       normalizeCreateTranslationLocale(content.Locale),
				FamilyID:     strings.TrimSpace(content.FamilyID),
				Slug:         strings.TrimSpace(content.Slug),
				Path:         normalizeCMSLocalizedPath(ExtractContentPath(content.Data, content.Metadata, "")),
				RouteKey:     strings.TrimSpace(primitives.FirstNonEmptyRaw(content.RouteKey, toString(content.Data["route_key"]), toString(content.Metadata["route_key"]))),
				Content:      &content,
			})
		}
	}
	return out, nil
}

func groupLocalePathMigrationSubjects(subjects []localePathMigrationSubject) map[string][]localePathMigrationSubject {
	groups := map[string][]localePathMigrationSubject{}
	for _, subject := range subjects {
		key := localePathMigrationFamilyKey(subject)
		groups[key] = append(groups[key], subject)
	}
	return groups
}

func localePathMigrationFamilyKey(subject localePathMigrationSubject) string {
	contentType := strings.TrimSpace(primitives.FirstNonEmptyRaw(subject.ContentType, subject.ResourceKind))
	if familyID := strings.TrimSpace(subject.FamilyID); familyID != "" {
		return subject.ResourceKind + ":" + contentType + ":family:" + strings.ToLower(familyID)
	}
	if routeKey := strings.TrimSpace(subject.RouteKey); routeKey != "" {
		return subject.ResourceKind + ":" + contentType + ":route:" + strings.ToLower(routeKey)
	}
	return subject.ResourceKind + ":" + contentType + ":orphan:" + strings.ToLower(strings.TrimSpace(subject.ID))
}

func buildLocalePathMigrationFamilyPlan(subjects []localePathMigrationSubject, opts LocalePathMigrationOptions) LocalePathMigrationFamilyPlan {
	plan := LocalePathMigrationFamilyPlan{}
	if len(subjects) == 0 {
		return plan
	}
	sort.SliceStable(subjects, func(i, j int) bool {
		if subjects[i].Locale == subjects[j].Locale {
			return subjects[i].ID < subjects[j].ID
		}
		return subjects[i].Locale < subjects[j].Locale
	})
	first := subjects[0]
	plan.ResourceKind = first.ResourceKind
	plan.ContentType = first.ContentType
	plan.IdentityKey = localePathMigrationFamilyKey(first)
	plan.FamilyID = first.FamilyID
	anchored := localePathMigrationFamilyAnchored(subjects)
	plan.ProposedRouteKey, plan.RouteKeyReadiness = deriveLocalePathMigrationRouteKey(subjects, opts)
	if !anchored {
		plan.Warnings = append(plan.Warnings, "missing family_id/route_key; route_key backfill requires manual review")
	}
	defaultCanonicalPath := localePathFamilyDefaultPath(subjects, opts)
	hasExplicitRoot := localePathFamilyHasExplicitRootEvidence(subjects, opts)
	plan.Records = make([]LocalePathMigrationRecordPlan, 0, len(subjects))
	plan.Rewrites = make([]LocalePathMigrationRewrite, 0, len(subjects))
	for _, subject := range subjects {
		record := classifyLocalePathMigrationRecord(subject, defaultCanonicalPath, hasExplicitRoot, opts)
		record.DerivedRouteKey = plan.ProposedRouteKey
		plan.Records = append(plan.Records, record)
		if record.Classification == LocalePathRecordAmbiguousLocaleLike {
			plan.Warnings = append(plan.Warnings, fmt.Sprintf("record %s requires manual review for locale-like path %q", subject.ID, subject.Path))
		}
		rewrite := localePathMigrationRewriteForRecord(subject, record, plan.ProposedRouteKey, plan.RouteKeyReadiness)
		if rewrite.ID != "" {
			plan.Rewrites = append(plan.Rewrites, rewrite)
		}
	}
	if plan.RouteKeyReadiness == LocalePathRouteKeyAmbiguous {
		plan.Warnings = append(plan.Warnings, "route_key derivation is ambiguous; no automatic backfill will be applied")
	}
	return plan
}

func rollupLocalePathMigrationSummary(summary *LocalePathMigrationSummary, plan LocalePathMigrationFamilyPlan) {
	if summary == nil {
		return
	}
	if plan.RouteKeyReadiness == LocalePathRouteKeyMissingDerivable {
		summary.MissingRouteKeyFamilies++
	}
	if plan.RouteKeyReadiness == LocalePathRouteKeyAmbiguous {
		summary.AmbiguousRouteKeyFamilies++
	}
	summary.ProposedRewrites += len(plan.Rewrites)
	for _, record := range plan.Records {
		switch record.Classification {
		case LocalePathRecordLegacyPrefixed:
			summary.LegacyPrefixedRecords++
		case LocalePathRecordTranslatedLocalized:
			summary.TranslatedLocalizedPaths++
		case LocalePathRecordAmbiguousLocaleLike:
			summary.AmbiguousRecords++
		}
	}
}

func deriveLocalePathMigrationRouteKey(subjects []localePathMigrationSubject, opts LocalePathMigrationOptions) (string, LocalePathRouteKeyReadiness) {
	if !localePathMigrationFamilyAnchored(subjects) {
		return "", LocalePathRouteKeyAmbiguous
	}
	values := map[string]struct{}{}
	missing := false
	for _, subject := range subjects {
		routeKey := strings.TrimSpace(subject.RouteKey)
		if routeKey == "" {
			missing = true
			continue
		}
		values[strings.ToLower(routeKey)] = struct{}{}
	}
	if len(values) > 1 {
		return "", LocalePathRouteKeyAmbiguous
	}
	if len(values) == 1 {
		for routeKey := range values {
			if missing {
				return routeKey, LocalePathRouteKeyMissingDerivable
			}
			return routeKey, LocalePathRouteKeyPresentConsistent
		}
	}
	derived := deriveLocalePathFamilyRouteKey(subjects, opts)
	if derived == "" {
		return "", LocalePathRouteKeyAmbiguous
	}
	return derived, LocalePathRouteKeyMissingDerivable
}

func localePathMigrationFamilyAnchored(subjects []localePathMigrationSubject) bool {
	for _, subject := range subjects {
		if strings.TrimSpace(subject.FamilyID) != "" {
			return true
		}
		if strings.TrimSpace(subject.RouteKey) != "" {
			return true
		}
	}
	return false
}

func deriveLocalePathFamilyRouteKey(subjects []localePathMigrationSubject, opts LocalePathMigrationOptions) string {
	if len(subjects) == 0 {
		return ""
	}
	defaultLocale := normalizeCreateTranslationLocale(opts.DefaultLocale)
	if defaultLocale != "" {
		for _, subject := range subjects {
			if subject.Locale != defaultLocale {
				continue
			}
			if derived := deriveLocalePathRecordRouteKey(subject); derived != "" {
				return derived
			}
		}
	}
	for _, subject := range subjects {
		if derived := deriveLocalePathRecordRouteKey(subject); derived != "" {
			return derived
		}
	}
	return ""
}

func deriveLocalePathRecordRouteKey(subject localePathMigrationSubject) string {
	contentType := strings.TrimSpace(primitives.FirstNonEmptyRaw(subject.ContentType, subject.ResourceKind))
	slug := strings.Trim(strings.ToLower(strings.TrimSpace(subject.Slug)), "/")
	if slug != "" {
		return strings.Trim(contentType+"/"+slug, "/")
	}
	path := strings.Trim(strings.ToLower(strings.TrimSpace(subject.Path)), "/")
	if path == "" {
		return strings.Trim(contentType+"/home", "/")
	}
	return strings.Trim(contentType+"/"+path, "/")
}

func localePathFamilyDefaultPath(subjects []localePathMigrationSubject, opts LocalePathMigrationOptions) string {
	defaultLocale := normalizeCreateTranslationLocale(opts.DefaultLocale)
	if defaultLocale != "" {
		for _, subject := range subjects {
			if subject.Locale != defaultLocale || subject.Path == "" {
				continue
			}
			canonical, _ := localePathStripSupportedPrefix(subject.Path, opts.SupportedLocales)
			if canonical != "" {
				return canonical
			}
		}
	}
	for _, subject := range subjects {
		if subject.Path == "" {
			continue
		}
		canonical, _ := localePathStripSupportedPrefix(subject.Path, opts.SupportedLocales)
		if canonical != "" {
			return canonical
		}
	}
	return ""
}

func classifyLocalePathMigrationRecord(subject localePathMigrationSubject, defaultCanonicalPath string, hasExplicitRoot bool, opts LocalePathMigrationOptions) LocalePathMigrationRecordPlan {
	record := LocalePathMigrationRecordPlan{
		ID:       subject.ID,
		Locale:   subject.Locale,
		Path:     subject.Path,
		RouteKey: subject.RouteKey,
	}
	if subject.Path == "" {
		record.Classification = LocalePathRecordMissing
		return record
	}
	canonical, prefixLocale := localePathStripSupportedPrefix(subject.Path, opts.SupportedLocales)
	if prefixLocale != "" {
		if prefixLocale != subject.Locale {
			record.Classification = LocalePathRecordAmbiguousLocaleLike
			return record
		}
		if canonical == "/" && !hasExplicitRoot {
			record.Classification = LocalePathRecordAmbiguousLocaleLike
			return record
		}
		record.Classification = LocalePathRecordLegacyPrefixed
		record.ProposedPath = canonical
		return record
	}
	if defaultCanonicalPath != "" && subject.Locale != normalizeCreateTranslationLocale(opts.DefaultLocale) && subject.Path != defaultCanonicalPath {
		record.Classification = LocalePathRecordTranslatedLocalized
		return record
	}
	record.Classification = LocalePathRecordCanonicalUnprefixed
	return record
}

func localePathFamilyHasExplicitRootEvidence(subjects []localePathMigrationSubject, opts LocalePathMigrationOptions) bool {
	defaultLocale := normalizeCreateTranslationLocale(opts.DefaultLocale)
	for _, subject := range subjects {
		if subject.Path == "/" {
			return true
		}
		if defaultLocale == "" || subject.Locale != defaultLocale {
			continue
		}
		canonical, prefixLocale := localePathStripSupportedPrefix(subject.Path, opts.SupportedLocales)
		if prefixLocale == subject.Locale && canonical == "/" {
			return true
		}
	}
	return false
}

func localePathMigrationRewriteForRecord(
	subject localePathMigrationSubject,
	record LocalePathMigrationRecordPlan,
	proposedRouteKey string,
	readiness LocalePathRouteKeyReadiness,
) LocalePathMigrationRewrite {
	rewrite := LocalePathMigrationRewrite{
		ResourceKind: subject.ResourceKind,
		ContentType:  subject.ContentType,
		ID:           subject.ID,
		Locale:       subject.Locale,
	}
	if record.Classification == LocalePathRecordLegacyPrefixed && record.ProposedPath != "" && record.ProposedPath != subject.Path {
		rewrite.PathFrom = subject.Path
		rewrite.PathTo = record.ProposedPath
		rewrite.Reasons = append(rewrite.Reasons, "strip legacy locale prefix from stored public path")
	}
	if readiness == LocalePathRouteKeyMissingDerivable && proposedRouteKey != "" && strings.TrimSpace(subject.RouteKey) == "" {
		rewrite.RouteKeyFrom = ""
		rewrite.RouteKeyTo = proposedRouteKey
		rewrite.Reasons = append(rewrite.Reasons, "backfill derivable route_key")
	}
	if rewrite.PathTo == "" && rewrite.RouteKeyTo == "" {
		return LocalePathMigrationRewrite{}
	}
	return rewrite
}

func applyLocalePathMigrationRewrite(ctx context.Context, svc CMSContentService, rewrite LocalePathMigrationRewrite) error {
	switch rewrite.ResourceKind {
	case "page":
		page, err := svc.Page(ctx, rewrite.ID, "")
		if err != nil {
			return err
		}
		if page == nil {
			return ErrNotFound
		}
		if page.Data == nil {
			page.Data = map[string]any{}
		}
		if page.Metadata == nil {
			page.Metadata = map[string]any{}
		}
		if rewrite.PathTo != "" {
			page.Data["path"] = rewrite.PathTo
			page.Metadata["path"] = rewrite.PathTo
			page.PreviewURL = rewrite.PathTo
		}
		if rewrite.RouteKeyTo != "" {
			page.RouteKey = rewrite.RouteKeyTo
			page.Data["route_key"] = rewrite.RouteKeyTo
			page.Metadata["route_key"] = rewrite.RouteKeyTo
		}
		_, err = svc.UpdatePage(ctx, *page)
		return err
	default:
		content, err := svc.Content(ctx, rewrite.ID, "")
		if err != nil {
			return err
		}
		if content == nil {
			return ErrNotFound
		}
		if content.Data == nil {
			content.Data = map[string]any{}
		}
		if content.Metadata == nil {
			content.Metadata = map[string]any{}
		}
		if rewrite.PathTo != "" {
			content.Data["path"] = rewrite.PathTo
			content.Metadata["path"] = rewrite.PathTo
		}
		if rewrite.RouteKeyTo != "" {
			content.RouteKey = rewrite.RouteKeyTo
			content.Data["route_key"] = rewrite.RouteKeyTo
			content.Metadata["route_key"] = rewrite.RouteKeyTo
		}
		_, err = svc.UpdateContent(ctx, *content)
		return err
	}
}

func localePathStripSupportedPrefix(path string, supported []string) (string, string) {
	path = normalizeCMSLocalizedPath(path)
	if path == "" || path == "/" {
		return path, ""
	}
	segments := strings.Split(strings.Trim(path, "/"), "/")
	if len(segments) == 0 {
		return path, ""
	}
	first := normalizeCreateTranslationLocale(segments[0])
	if first == "" || !slices.Contains(supported, first) {
		return path, ""
	}
	if len(segments) == 1 {
		return "/", first
	}
	return "/" + strings.Join(segments[1:], "/"), first
}
