package admin

import (
	"context"
	"sort"
	"strings"

	translationservices "github.com/goliatone/go-admin/translations/services"
)

// SyncTranslationFamilyStore rebuilds the canonical family/variant tables from the CMS content service.
func SyncTranslationFamilyStore(ctx context.Context, adm *Admin, environment string) error {
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
	if err := saveTranslationFamilies(ctx, adm, families, translationFamilyAssignmentsByFamily(binding.collectAssignments(ctx))); err != nil {
		return err
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
	seenVariants := map[string]struct{}{}
	for _, locale := range locales {
		if err := appendTranslationFamilyLocaleVariants(ctx, adm, families, seenVariants, locale, defaultLocale); err != nil {
			return nil, err
		}
	}
	return families, nil
}

func appendTranslationFamilyLocaleVariants(ctx context.Context, adm *Admin, families map[string]translationservices.FamilyRecord, seenVariants map[string]struct{}, locale, defaultLocale string) error {
	pages, err := adm.contentSvc.Pages(ctx, locale)
	if err != nil {
		return err
	}
	for _, page := range pages {
		if err := appendPageFamilyVariant(families, seenVariants, page, locale, defaultLocale); err != nil {
			return err
		}
	}
	contents, err := adm.contentSvc.Contents(ctx, locale)
	if err != nil {
		return err
	}
	for _, content := range contents {
		if err := appendContentFamilyVariant(families, seenVariants, content, locale, defaultLocale); err != nil {
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

func appendPageFamilyVariant(families map[string]translationservices.FamilyRecord, seen map[string]struct{}, page CMSPage, locale, defaultLocale string) error {
	familyID := strings.TrimSpace(page.FamilyID)
	if familyID == "" {
		return validationDomainError("translation-enabled page missing canonical family_id", map[string]any{
			"record_id": page.ID,
			"locale":    page.Locale,
			"entity":    "pages",
		})
	}
	key := familyID + "::" + strings.TrimSpace(page.ID)
	if _, ok := seen[key]; ok {
		return nil
	}
	seen[key] = struct{}{}
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
	if strings.EqualFold(translationFamilyLocale(page.Locale, locale), strings.TrimSpace(strings.ToLower(defaultLocale))) {
		family.SourceVariantID = strings.TrimSpace(page.ID)
	}
	family.Variants = append(family.Variants, translationFamilyVariantRecord(
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
	))
	families[familyID] = family
	return nil
}

func appendContentFamilyVariant(families map[string]translationservices.FamilyRecord, seen map[string]struct{}, content CMSContent, locale, defaultLocale string) error {
	contentType := strings.TrimSpace(strings.ToLower(firstNonEmpty(content.ContentTypeSlug, content.ContentType)))
	if contentType == "" || contentType == "page" {
		return nil
	}
	familyID := strings.TrimSpace(content.FamilyID)
	if familyID == "" {
		return validationDomainError("translation-enabled content missing canonical family_id", map[string]any{
			"record_id": content.ID,
			"locale":    content.Locale,
			"entity":    contentType,
		})
	}
	key := familyID + "::" + strings.TrimSpace(content.ID)
	if _, ok := seen[key]; ok {
		return nil
	}
	seen[key] = struct{}{}
	family := families[familyID]
	scope := translationScopeFromMaps(content.Metadata, content.Data)
	if family.ID == "" {
		family = translationservices.FamilyRecord{
			ID:          familyID,
			TenantID:    scope.TenantID,
			OrgID:       scope.OrgID,
			ContentType: contentType,
			SourceLocale: translationFamilyLocale(
				defaultLocale,
				content.Locale,
			),
		}
	}
	if strings.TrimSpace(family.SourceLocale) == "" {
		family.SourceLocale = translationFamilyLocale(defaultLocale, content.Locale)
	}
	if strings.EqualFold(translationFamilyLocale(content.Locale, locale), strings.TrimSpace(strings.ToLower(defaultLocale))) {
		family.SourceVariantID = strings.TrimSpace(content.ID)
	}
	family.Variants = append(family.Variants, translationFamilyVariantRecord(
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
	))
	families[familyID] = family
	return nil
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
