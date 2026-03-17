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
	locales := map[string]struct{}{strings.ToLower(defaultLocale): {}}
	pagesDefault, err := adm.contentSvc.Pages(ctx, defaultLocale)
	if err != nil {
		return err
	}
	for _, page := range pagesDefault {
		addRecordLocales(locales, page.AvailableLocales)
	}
	contentsDefault, err := adm.contentSvc.Contents(ctx, defaultLocale)
	if err != nil {
		return err
	}
	for _, content := range contentsDefault {
		addRecordLocales(locales, content.AvailableLocales)
	}
	binding := &translationFamilyBinding{admin: adm}
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

	families := map[string]translationservices.FamilyRecord{}
	seenVariants := map[string]struct{}{}
	for _, locale := range orderedLocales {
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
	}

	for _, family := range families {
		if err := adm.translationFamilyStore.SaveFamily(ctx, family); err != nil {
			return err
		}
	}
	if replacer, ok := adm.translationFamilyStore.(interface {
		ReplaceAssignments([]translationservices.FamilyAssignment) error
	}); ok {
		if err := replacer.ReplaceAssignments(binding.collectAssignments(ctx)); err != nil {
			return err
		}
	}
	service := translationservices.FamilyService{
		Store: adm.translationFamilyStore,
		Policies: translationservices.PolicyService{
			Resolver: translationFamilyPolicyResolver{admin: adm},
		},
	}
	if _, err := service.RecomputeAll(ctx, environment); err != nil {
		return err
	}
	return nil
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
	family.Variants = append(family.Variants, translationservices.FamilyVariant{
		ID:             strings.TrimSpace(page.ID),
		FamilyID:       familyID,
		TenantID:       scope.TenantID,
		OrgID:          scope.OrgID,
		Locale:         translationFamilyLocale(page.Locale, locale),
		Status:         translationFamilyVariantStatus(page.Status),
		IsSource:       strings.EqualFold(translationFamilyLocale(page.Locale, locale), strings.TrimSpace(strings.ToLower(defaultLocale))),
		Fields:         translationFamilyFields(page.Title, page.Slug, page.Data),
		Metadata:       cloneAnyMap(page.Metadata),
		SourceRecordID: strings.TrimSpace(page.ID),
		SourceHashAtLastSync: strings.TrimSpace(firstNonEmpty(
			toString(page.Metadata[translationEditorSourceHashAtLastSyncKey]),
			translationEditorSourceHashFromMetadata(page.Metadata),
		)),
	})
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
	family.Variants = append(family.Variants, translationservices.FamilyVariant{
		ID:             strings.TrimSpace(content.ID),
		FamilyID:       familyID,
		TenantID:       scope.TenantID,
		OrgID:          scope.OrgID,
		Locale:         translationFamilyLocale(content.Locale, locale),
		Status:         translationFamilyVariantStatus(content.Status),
		IsSource:       strings.EqualFold(translationFamilyLocale(content.Locale, locale), strings.TrimSpace(strings.ToLower(defaultLocale))),
		Fields:         translationFamilyFields(content.Title, content.Slug, content.Data),
		Metadata:       cloneAnyMap(content.Metadata),
		SourceRecordID: strings.TrimSpace(content.ID),
		SourceHashAtLastSync: strings.TrimSpace(firstNonEmpty(
			toString(content.Metadata[translationEditorSourceHashAtLastSyncKey]),
			translationEditorSourceHashFromMetadata(content.Metadata),
		)),
	})
	families[familyID] = family
	return nil
}
