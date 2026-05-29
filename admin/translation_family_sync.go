package admin

import (
	"context"
	"sort"
	"strings"

	translationservices "github.com/goliatone/go-admin/translations/services"
)

// SyncTranslationFamilyStore rebuilds the canonical family/variant tables from the CMS content service.
func SyncTranslationFamilyStore(ctx context.Context, adm *Admin, environment string) error {
	return SyncTranslationFamilyStoreForFamily(ctx, adm, environment, "")
}

// SyncTranslationFamilyStoreForFamily rebuilds the canonical family/variant tables from the CMS content service.
// When familyID is non-empty, only that family is saved and recomputed.
func SyncTranslationFamilyStoreForFamily(ctx context.Context, adm *Admin, environment string, familyID string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if adm == nil || adm.contentSvc == nil || adm.translationFamilyStore == nil {
		return serviceNotConfiguredDomainError("translation family sync", map[string]any{"component": "translation_family_sync"})
	}
	defaultLocale := strings.TrimSpace(adm.config.DefaultLocale)
	if defaultLocale == "" {
		defaultLocale = "en"
	}
	binding := &translationFamilyBinding{admin: adm}
	orderedLocales, err := translationFamilySyncLocales(ctx, adm, binding, defaultLocale, environment)
	if err != nil {
		return err
	}
	families, err := translationFamilySyncFamilies(ctx, adm, orderedLocales, defaultLocale)
	if err != nil {
		return err
	}
	if familyID = strings.TrimSpace(familyID); familyID != "" {
		family, ok := families[familyID]
		if !ok {
			return validationDomainError("translation family not found during sync", map[string]any{
				"family_id":   familyID,
				"environment": strings.TrimSpace(environment),
			})
		}
		families = map[string]translationservices.FamilyRecord{familyID: family}
	}
	if err := saveTranslationFamilies(ctx, adm, families, translationFamilyAssignmentsByFamily(binding.collectAssignments(ctx))); err != nil {
		return err
	}
	if familyID != "" {
		return recomputeTranslationFamily(ctx, adm, familyID, environment)
	}
	return recomputeTranslationFamilies(ctx, adm, environment)
}

func translationFamilySyncLocales(ctx context.Context, adm *Admin, binding *translationFamilyBinding, defaultLocale, environment string) ([]string, error) {
	locales := map[string]struct{}{strings.ToLower(defaultLocale): {}}
	pagesDefault, err := adm.contentSvc.Pages(ctx, defaultLocale)
	if err != nil {
		return nil, err
	}
	for _, page := range pagesDefault {
		addRecordLocales(locales, page.AvailableLocales)
	}
	contentsDefault, err := adm.contentSvc.Contents(ctx, defaultLocale)
	if err != nil {
		return nil, err
	}
	for _, content := range contentsDefault {
		addRecordLocales(locales, content.AvailableLocales)
	}
	for _, locale := range adm.activeLocales(ctx) {
		locales[strings.ToLower(strings.TrimSpace(locale))] = struct{}{}
	}
	for _, locale := range binding.policyLocales(ctx, environment) {
		locales[strings.ToLower(strings.TrimSpace(locale))] = struct{}{}
	}
	orderedLocales := make([]string, 0, len(locales))
	for locale := range locales {
		if locale = strings.TrimSpace(strings.ToLower(locale)); locale != "" {
			orderedLocales = append(orderedLocales, locale)
		}
	}
	sort.Strings(orderedLocales)
	return orderedLocales, nil
}

func translationFamilyAssignmentsByFamily(assignments []translationservices.FamilyAssignment) map[string][]translationservices.FamilyAssignment {
	assignmentsByFamily := map[string][]translationservices.FamilyAssignment{}
	for _, assignment := range assignments {
		familyID := strings.TrimSpace(assignment.FamilyID)
		if familyID == "" {
			continue
		}
		assignmentsByFamily[familyID] = append(assignmentsByFamily[familyID], assignment)
	}
	return assignmentsByFamily
}

func translationFamilySyncFamilies(ctx context.Context, adm *Admin, locales []string, defaultLocale string) (map[string]translationservices.FamilyRecord, error) {
	families := map[string]translationservices.FamilyRecord{}
	state := newTranslationFamilySyncState()
	for _, locale := range locales {
		if err := appendTranslationFamilyLocaleVariants(ctx, adm, families, state, locale, defaultLocale); err != nil {
			return nil, err
		}
	}
	return families, nil
}

type translationFamilySyncState struct {
	seenLocaleVariants map[string]struct{}
	recordLocales      map[string]map[string]string
}

func newTranslationFamilySyncState() *translationFamilySyncState {
	return &translationFamilySyncState{
		seenLocaleVariants: map[string]struct{}{},
		recordLocales:      map[string]map[string]string{},
	}
}

func appendTranslationFamilyLocaleVariants(ctx context.Context, adm *Admin, families map[string]translationservices.FamilyRecord, state *translationFamilySyncState, locale, defaultLocale string) error {
	pages, err := adm.contentSvc.Pages(ctx, locale)
	if err != nil {
		return err
	}
	for _, page := range pages {
		appendErr := appendPageFamilyVariant(families, state, page, locale, defaultLocale)
		if appendErr != nil {
			return appendErr
		}
	}
	contents, err := adm.contentSvc.Contents(ctx, locale)
	if err != nil {
		return err
	}
	for _, content := range contents {
		if err := appendContentFamilyVariant(ctx, adm, families, state, content, locale, defaultLocale); err != nil {
			return err
		}
	}
	return nil
}

func saveTranslationFamilies(ctx context.Context, adm *Admin, families map[string]translationservices.FamilyRecord, assignmentsByFamily map[string][]translationservices.FamilyAssignment) error {
	for familyID, family := range families {
		family.Assignments = append([]translationservices.FamilyAssignment{}, assignmentsByFamily[familyID]...)
		if err := adm.translationFamilyStore.SaveFamily(ctx, family); err != nil {
			return err
		}
	}
	return nil
}

func recomputeTranslationFamilies(ctx context.Context, adm *Admin, environment string) error {
	service := translationservices.FamilyService{
		Store: adm.translationFamilyStore,
		Policies: translationservices.PolicyService{
			Resolver: translationFamilyPolicyResolver{admin: adm},
		},
	}
	_, err := service.RecomputeAll(ctx, environment)
	return err
}

func recomputeTranslationFamily(ctx context.Context, adm *Admin, familyID string, environment string) error {
	service := translationservices.FamilyService{
		Store: adm.translationFamilyStore,
		Policies: translationservices.PolicyService{
			Resolver: translationFamilyPolicyResolver{admin: adm},
		},
	}
	_, err := service.Recompute(ctx, familyID, environment)
	return err
}

func appendPageFamilyVariant(families map[string]translationservices.FamilyRecord, state *translationFamilySyncState, page CMSPage, locale, defaultLocale string) error {
	familyID := strings.TrimSpace(page.FamilyID)
	if familyID == "" {
		return validationDomainError("translation-enabled page missing canonical family_id", map[string]any{
			"record_id": page.ID,
			"locale":    page.Locale,
			"entity":    "pages",
		})
	}
	resolvedLocale := translationFamilyLocale(page.Locale, locale)
	if state.seenLocaleVariant(familyID, page.ID, resolvedLocale) {
		return nil
	}
	family := families[familyID]
	scope := translationScopeFromMaps(page.Metadata, page.Data)
	if family.ID == "" {
		family = translationservices.FamilyRecord{
			ID:          familyID,
			TenantID:    scope.TenantID,
			OrgID:       scope.OrgID,
			ContentType: "pages",
			SourceLocale: translationFamilyLocale(
				defaultLocale,
				page.Locale,
			),
		}
	}
	if strings.TrimSpace(family.SourceLocale) == "" {
		family.SourceLocale = translationFamilyLocale(defaultLocale, page.Locale)
	}
	variant := translationFamilyVariantRecord(
		familyID,
		scope,
		page.ID,
		page.Locale,
		page.Status,
		page.Title,
		page.Slug,
		page.Data,
		page.Metadata,
		locale,
		defaultLocale,
	)
	variant.ID = state.variantIDForRecord(&family, variant.SourceRecordID, variant.Locale)
	if variant.IsSource {
		family.SourceVariantID = strings.TrimSpace(variant.ID)
	}
	family.Variants = append(family.Variants, variant)
	families[familyID] = family
	return nil
}

func appendContentFamilyVariant(ctx context.Context, adm *Admin, families map[string]translationservices.FamilyRecord, state *translationFamilySyncState, content CMSContent, locale, defaultLocale string) error {
	contentType := strings.TrimSpace(strings.ToLower(firstNonEmpty(content.ContentTypeSlug, content.ContentType)))
	if contentType == "" || contentType == "page" {
		return nil
	}
	familyContentType := translationFamilySyncContentType(ctx, adm, contentType)
	familyID := strings.TrimSpace(content.FamilyID)
	if familyID == "" {
		return validationDomainError("translation-enabled content missing canonical family_id", map[string]any{
			"record_id": content.ID,
			"locale":    content.Locale,
			"entity":    contentType,
		})
	}
	resolvedLocale := translationFamilyLocale(content.Locale, locale)
	if state.seenLocaleVariant(familyID, content.ID, resolvedLocale) {
		return nil
	}
	family := families[familyID]
	scope := translationScopeFromMaps(content.Metadata, content.Data)
	if family.ID == "" {
		family = translationservices.FamilyRecord{
			ID:          familyID,
			TenantID:    scope.TenantID,
			OrgID:       scope.OrgID,
			ContentType: familyContentType,
			SourceLocale: translationFamilyLocale(
				defaultLocale,
				content.Locale,
			),
		}
	}
	if strings.TrimSpace(family.SourceLocale) == "" {
		family.SourceLocale = translationFamilyLocale(defaultLocale, content.Locale)
	}
	variant := translationFamilyVariantRecord(
		familyID,
		scope,
		content.ID,
		content.Locale,
		content.Status,
		content.Title,
		content.Slug,
		content.Data,
		content.Metadata,
		locale,
		defaultLocale,
	)
	variant.ID = state.variantIDForRecord(&family, variant.SourceRecordID, variant.Locale)
	if variant.IsSource {
		family.SourceVariantID = strings.TrimSpace(variant.ID)
	}
	family.Variants = append(family.Variants, variant)
	families[familyID] = family
	return nil
}

func translationFamilySyncContentType(ctx context.Context, adm *Admin, contentType string) string {
	contentType = strings.TrimSpace(strings.ToLower(contentType))
	if adm == nil || adm.contentTypeSvc == nil || contentType == "" {
		return contentType
	}
	record, err := adm.contentTypeSvc.ContentTypeBySlug(ctx, contentType)
	if err != nil || record == nil {
		record, err = adm.contentTypeSvc.ContentType(ctx, contentType)
	}
	if err != nil || record == nil {
		return contentType
	}
	if panelSlug := strings.TrimSpace(toString(record.Capabilities["panel_slug"])); panelSlug != "" {
		return strings.TrimSpace(strings.ToLower(panelSlug))
	}
	return contentType
}

func (s *translationFamilySyncState) seenLocaleVariant(familyID, recordID, locale string) bool {
	if s == nil {
		return false
	}
	key := strings.Join([]string{
		strings.TrimSpace(familyID),
		strings.TrimSpace(recordID),
		strings.TrimSpace(strings.ToLower(locale)),
	}, "::")
	if _, ok := s.seenLocaleVariants[key]; ok {
		return true
	}
	s.seenLocaleVariants[key] = struct{}{}
	return false
}

func (s *translationFamilySyncState) variantIDForRecord(family *translationservices.FamilyRecord, recordID, locale string) string {
	recordID = strings.TrimSpace(recordID)
	locale = strings.TrimSpace(strings.ToLower(locale))
	if s == nil || family == nil || recordID == "" {
		return recordID
	}
	recordKey := strings.TrimSpace(family.ID) + "::" + recordID
	locales := s.recordLocales[recordKey]
	if locales == nil {
		locales = map[string]string{}
		s.recordLocales[recordKey] = locales
	}
	if len(locales) == 0 {
		locales[locale] = recordID
		return recordID
	}
	if existing := strings.TrimSpace(locales[locale]); existing != "" {
		return existing
	}
	for i := range family.Variants {
		variantLocale := strings.TrimSpace(strings.ToLower(family.Variants[i].Locale))
		if strings.TrimSpace(family.Variants[i].SourceRecordID) != recordID || variantLocale == "" {
			continue
		}
		localizedID := translationFamilyLocaleVariantID(recordID, variantLocale)
		if strings.TrimSpace(family.Variants[i].ID) == recordID {
			family.Variants[i].ID = localizedID
			if family.Variants[i].IsSource && strings.TrimSpace(family.SourceVariantID) == recordID {
				family.SourceVariantID = localizedID
			}
		}
		locales[variantLocale] = strings.TrimSpace(family.Variants[i].ID)
	}
	localizedID := translationFamilyLocaleVariantID(recordID, locale)
	locales[locale] = localizedID
	return localizedID
}

func translationFamilyLocaleVariantID(recordID, locale string) string {
	recordID = strings.TrimSpace(recordID)
	locale = strings.TrimSpace(strings.ToLower(locale))
	if recordID == "" || locale == "" {
		return recordID
	}
	return recordID + "::" + locale
}

func translationFamilyVariantRecord(
	familyID string,
	scope translationservices.Scope,
	recordID string,
	recordLocale string,
	status string,
	title string,
	slug string,
	data map[string]any,
	metadata map[string]any,
	locale string,
	defaultLocale string,
) translationservices.FamilyVariant {
	resolvedLocale := translationFamilyLocale(recordLocale, locale)
	return translationservices.FamilyVariant{
		ID:             strings.TrimSpace(recordID),
		FamilyID:       familyID,
		TenantID:       scope.TenantID,
		OrgID:          scope.OrgID,
		Locale:         resolvedLocale,
		Status:         translationFamilyVariantStatus(status),
		IsSource:       strings.EqualFold(resolvedLocale, strings.TrimSpace(strings.ToLower(defaultLocale))),
		Fields:         translationFamilyFields(title, slug, data),
		Metadata:       cloneAnyMap(metadata),
		SourceRecordID: strings.TrimSpace(recordID),
		SourceHashAtLastSync: strings.TrimSpace(firstNonEmpty(
			toString(metadata[translationEditorSourceHashAtLastSyncKey]),
			translationEditorSourceHashFromMetadata(metadata),
		)),
	}
}
