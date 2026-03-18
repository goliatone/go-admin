package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"maps"
	"sort"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
)

const (
	exampleTranslationQueueSourceSlug   = "translation-demo-exchange"
	exampleTranslationQueuePostSource   = "translation-demo-queue-active"
	exampleTranslationQueueOpenPoolSlug = "translation-exchange-ready"
	exampleTranslationQueueTargetLocale = "fr"
	exampleTranslationQueueFallbackUser = "translator.demo"
	exampleTranslationQAAssignmentID    = "tqa_editor"
)

type exampleTranslationExchangeStore struct {
	resolveContentService func() coreadmin.CMSContentService
}

func newExampleTranslationExchangeStore(resolve func() coreadmin.CMSContentService) *exampleTranslationExchangeStore {
	if resolve == nil {
		resolve = func() coreadmin.CMSContentService { return nil }
	}
	return &exampleTranslationExchangeStore{resolveContentService: resolve}
}

func (s *exampleTranslationExchangeStore) ExportRows(ctx context.Context, filter coreadmin.TranslationExportFilter) ([]coreadmin.TranslationExchangeRow, error) {
	contentSvc := s.contentService()
	if contentSvc == nil {
		return nil, fmt.Errorf("translation exchange store content service unavailable")
	}

	resources := normalizeExchangeResources(filter.Resources)
	targetLocales := normalizeLocalesOrDefault(filter.TargetLocales, []string{"es", "fr"})
	fieldPaths := normalizeFieldPathsOrDefault(filter.FieldPaths, []string{"title"})
	entityIDs := stringSet(filter.EntityIDs)
	sourceLocale := strings.ToLower(strings.TrimSpace(filter.SourceLocale))

	rows := make([]coreadmin.TranslationExchangeRow, 0, len(targetLocales)*len(fieldPaths))

	includePages := resources["pages"]
	includePosts := resources["posts"]

	if includePages {
		pages, err := contentSvc.Pages(ctx, sourceLocale)
		if err != nil {
			return nil, err
		}
		for _, page := range pages {
			if len(entityIDs) > 0 {
				if _, ok := entityIDs[strings.TrimSpace(page.ID)]; !ok {
					continue
				}
			}
			source := strings.ToLower(strings.TrimSpace(page.Locale))
			if source == "" {
				source = sourceLocale
			}
			groupID := normalizeFamilyID(page.FamilyID, page.ID)
			if groupID == "" {
				continue
			}
			for _, target := range targetLocales {
				if target == "" || target == source {
					continue
				}
				for _, fieldPath := range fieldPaths {
					sourceText, ok := exchangePageFieldValue(page, fieldPath)
					if !ok {
						continue
					}
					rows = append(rows, coreadmin.TranslationExchangeRow{
						Resource:     "pages",
						EntityID:     strings.TrimSpace(page.ID),
						FamilyID:     groupID,
						SourceLocale: source,
						TargetLocale: target,
						FieldPath:    fieldPath,
						SourceText:   sourceText,
						SourceHash:   exchangeRowSourceHash(sourceText),
					})
				}
			}
		}
	}

	if includePosts {
		contents, err := contentSvc.Contents(ctx, sourceLocale)
		if err != nil {
			return nil, err
		}
		for _, content := range contents {
			if !strings.EqualFold(strings.TrimSpace(content.ContentTypeSlug), "posts") &&
				!strings.EqualFold(strings.TrimSpace(content.ContentType), "posts") {
				continue
			}
			if len(entityIDs) > 0 {
				if _, ok := entityIDs[strings.TrimSpace(content.ID)]; !ok {
					continue
				}
			}
			source := strings.ToLower(strings.TrimSpace(content.Locale))
			if source == "" {
				source = sourceLocale
			}
			groupID := normalizeFamilyID(content.FamilyID, content.ID)
			if groupID == "" {
				continue
			}
			for _, target := range targetLocales {
				if target == "" || target == source {
					continue
				}
				for _, fieldPath := range fieldPaths {
					sourceText, ok := exchangeContentFieldValue(content, fieldPath)
					if !ok {
						continue
					}
					rows = append(rows, coreadmin.TranslationExchangeRow{
						Resource:     "posts",
						EntityID:     strings.TrimSpace(content.ID),
						FamilyID:     groupID,
						SourceLocale: source,
						TargetLocale: target,
						FieldPath:    fieldPath,
						SourceText:   sourceText,
						SourceHash:   exchangeRowSourceHash(sourceText),
					})
				}
			}
		}
	}

	return rows, nil
}

func (s *exampleTranslationExchangeStore) ResolveLinkage(ctx context.Context, key coreadmin.TranslationExchangeLinkageKey) (coreadmin.TranslationExchangeLinkage, error) {
	contentSvc := s.contentService()
	if contentSvc == nil {
		return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
	}

	resource := normalizeExchangeResource(key.Resource)
	fieldPath := normalizeFieldPath(key.FieldPath)
	targetLocale := strings.ToLower(strings.TrimSpace(key.TargetLocale))
	if resource == "" || fieldPath == "" || targetLocale == "" {
		return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
	}

	switch resource {
	case "pages":
		page, err := contentSvc.Page(ctx, strings.TrimSpace(key.EntityID), "")
		if err != nil || page == nil {
			return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		sourceText, ok := exchangePageFieldValue(*page, fieldPath)
		if !ok {
			return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		groupID := normalizeFamilyID(page.FamilyID, page.ID)
		if groupID == "" || !matchesTranslationGroup(groupID, key.FamilyID) {
			return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		targetExists, err := pageLocaleVariantExistsForSource(ctx, contentSvc, page, groupID, targetLocale)
		if err != nil {
			return coreadmin.TranslationExchangeLinkage{}, err
		}
		return coreadmin.TranslationExchangeLinkage{
			Key: coreadmin.TranslationExchangeLinkageKey{
				Resource:     resource,
				EntityID:     strings.TrimSpace(page.ID),
				FamilyID:     groupID,
				TargetLocale: targetLocale,
				FieldPath:    fieldPath,
			},
			SourceHash:   exchangeRowSourceHash(sourceText),
			TargetExists: targetExists,
		}, nil
	case "posts":
		content, err := contentSvc.Content(ctx, strings.TrimSpace(key.EntityID), "")
		if err != nil || content == nil {
			return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		if !strings.EqualFold(strings.TrimSpace(content.ContentTypeSlug), "posts") &&
			!strings.EqualFold(strings.TrimSpace(content.ContentType), "posts") {
			return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		sourceText, ok := exchangeContentFieldValue(*content, fieldPath)
		if !ok {
			return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		groupID := normalizeFamilyID(content.FamilyID, content.ID)
		if groupID == "" || !matchesTranslationGroup(groupID, key.FamilyID) {
			return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		targetExists, err := postLocaleVariantExists(ctx, contentSvc, groupID, targetLocale)
		if err != nil {
			return coreadmin.TranslationExchangeLinkage{}, err
		}
		return coreadmin.TranslationExchangeLinkage{
			Key: coreadmin.TranslationExchangeLinkageKey{
				Resource:     resource,
				EntityID:     strings.TrimSpace(content.ID),
				FamilyID:     groupID,
				TargetLocale: targetLocale,
				FieldPath:    fieldPath,
			},
			SourceHash:   exchangeRowSourceHash(sourceText),
			TargetExists: targetExists,
		}, nil
	default:
		return coreadmin.TranslationExchangeLinkage{}, coreadmin.ErrTranslationExchangeLinkageNotFound
	}
}

func (s *exampleTranslationExchangeStore) ApplyTranslation(ctx context.Context, req coreadmin.TranslationExchangeApplyRequest) error {
	contentSvc := s.contentService()
	if contentSvc == nil {
		return coreadmin.ErrTranslationExchangeLinkageNotFound
	}

	resource := normalizeExchangeResource(req.Key.Resource)
	fieldPath := normalizeFieldPath(req.Key.FieldPath)
	targetLocale := strings.ToLower(strings.TrimSpace(req.Key.TargetLocale))
	translatedText := strings.TrimSpace(req.TranslatedText)
	if resource == "" || fieldPath == "" || targetLocale == "" {
		return coreadmin.ErrTranslationExchangeLinkageNotFound
	}

	workflowStatus := strings.TrimSpace(req.WorkflowStatus)
	if workflowStatus == "" {
		workflowStatus = "draft"
	}

	switch resource {
	case "pages":
		source, err := contentSvc.Page(ctx, strings.TrimSpace(req.Key.EntityID), "")
		if err != nil || source == nil {
			return coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		groupID := normalizeFamilyID(source.FamilyID, source.ID)
		if groupID == "" || !matchesTranslationGroup(groupID, req.Key.FamilyID) {
			return coreadmin.ErrTranslationExchangeLinkageNotFound
		}

		variant, err := findPageLocaleVariantForSource(ctx, contentSvc, source, groupID, targetLocale)
		if err != nil {
			return err
		}
		if variant == nil {
			if !req.CreateTranslation {
				return coreadmin.ErrTranslationExchangeLinkageNotFound
			}
			created := cloneCMSPage(*source)
			created.ID = ""
			created.Locale = targetLocale
			created.Status = workflowStatus
			created.FamilyID = groupID
			created.Slug = ensureLocaleSlug(created.Slug, targetLocale)
			applyPagePathFallback(&created, targetLocale)
			setPageFieldValue(&created, fieldPath, translatedText)
			_, err = contentSvc.CreatePage(ctx, created)
			return err
		}

		updated := cloneCMSPage(*variant)
		updated.Status = workflowStatus
		updated.FamilyID = groupID
		setPageFieldValue(&updated, fieldPath, translatedText)
		_, err = contentSvc.UpdatePage(ctx, updated)
		return err
	case "posts":
		source, err := contentSvc.Content(ctx, strings.TrimSpace(req.Key.EntityID), "")
		if err != nil || source == nil {
			return coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		if !strings.EqualFold(strings.TrimSpace(source.ContentTypeSlug), "posts") &&
			!strings.EqualFold(strings.TrimSpace(source.ContentType), "posts") {
			return coreadmin.ErrTranslationExchangeLinkageNotFound
		}
		groupID := normalizeFamilyID(source.FamilyID, source.ID)
		if groupID == "" || !matchesTranslationGroup(groupID, req.Key.FamilyID) {
			return coreadmin.ErrTranslationExchangeLinkageNotFound
		}

		variant, err := findPostLocaleVariant(ctx, contentSvc, groupID, targetLocale)
		if err != nil {
			return err
		}
		if variant == nil {
			if !req.CreateTranslation {
				return coreadmin.ErrTranslationExchangeLinkageNotFound
			}
			created := cloneCMSContent(*source)
			created.ID = ""
			created.Locale = targetLocale
			created.Status = workflowStatus
			created.FamilyID = groupID
			created.Slug = ensureLocaleSlug(created.Slug, targetLocale)
			setContentFieldValue(&created, fieldPath, translatedText)
			_, err = contentSvc.CreateContent(ctx, created)
			return err
		}

		updated := cloneCMSContent(*variant)
		updated.Status = workflowStatus
		updated.FamilyID = groupID
		setContentFieldValue(&updated, fieldPath, translatedText)
		_, err = contentSvc.UpdateContent(ctx, updated)
		return err
	default:
		return coreadmin.ErrTranslationExchangeLinkageNotFound
	}
}

func (s *exampleTranslationExchangeStore) contentService() coreadmin.CMSContentService {
	if s == nil || s.resolveContentService == nil {
		return nil
	}
	return s.resolveContentService()
}

func seedExampleTranslationQueueFixture(
	ctx context.Context,
	repo coreadmin.TranslationAssignmentRepository,
	contentSvc coreadmin.CMSContentService,
	tenantID string,
	orgID string,
	assigneeIDs ...string,
) error {
	return seedExampleTranslationQueueFixtureWithFamilySync(ctx, repo, contentSvc, tenantID, orgID, nil, assigneeIDs...)
}

func seedExampleTranslationQueueFixtureWithFamilySync(
	ctx context.Context,
	repo coreadmin.TranslationAssignmentRepository,
	contentSvc coreadmin.CMSContentService,
	tenantID string,
	orgID string,
	syncFamilies func(context.Context) error,
	assigneeIDs ...string,
) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if repo == nil {
		return fmt.Errorf("translation queue fixture repository is required")
	}
	if contentSvc == nil {
		return fmt.Errorf("translation queue fixture content service is required")
	}

	assignees := normalizeQueueFixtureAssignees(assigneeIDs)
	if len(assignees) == 0 {
		assignees = []string{exampleTranslationQueueFallbackUser}
	}
	if _, bunRepo := repo.(*coreadmin.BunTranslationAssignmentRepository); bunRepo {
		return seedPersistentQueueFixture(ctx, repo, contentSvc, tenantID, orgID, syncFamilies, assigneeIDs...)
	}

	sourcePage, err := findPageBySlug(ctx, contentSvc, exampleTranslationQueueSourceSlug)
	if err != nil {
		return fmt.Errorf("translation queue fixture source page lookup failed: %w", err)
	}
	if sourcePage == nil {
		return fmt.Errorf("translation queue fixture source page %q not found", exampleTranslationQueueSourceSlug)
	}
	sourcePage, err = ensureScopedPageFamily(ctx, contentSvc, sourcePage, tenantID, orgID)
	if err != nil {
		return fmt.Errorf("translation queue fixture source page scope update failed: %w", err)
	}

	now := time.Now().UTC()
	primaryGroupID := normalizeFamilyID(sourcePage.FamilyID, sourcePage.ID)
	if strings.TrimSpace(primaryGroupID) == "" {
		return fmt.Errorf("translation queue fixture source page %q missing family_id", exampleTranslationQueueSourceSlug)
	}
	primarySourceLocale := strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(sourcePage.Locale, "en")))
	primarySourcePath := strings.TrimSpace(exchangePagePath(*sourcePage))
	primaryTitle := strings.TrimSpace(sourcePage.Title)

	if _, bunRepo := repo.(*coreadmin.BunTranslationAssignmentRepository); !bunRepo {
		editorSource, err := findPageBySlug(ctx, contentSvc, "home")
		if err != nil {
			return fmt.Errorf("translation editor qa source page lookup failed: %w", err)
		}
		if editorSource != nil {
			editorSource, err = ensureScopedPageFamily(ctx, contentSvc, editorSource, tenantID, orgID)
			if err != nil {
				return fmt.Errorf("translation editor qa source page scope update failed: %w", err)
			}
			editorGroupID := normalizeFamilyID(editorSource.FamilyID, editorSource.ID)
			editorTarget, targetErr := findPageLocaleVariantForSource(ctx, contentSvc, editorSource, editorGroupID, "fr")
			if targetErr != nil {
				return fmt.Errorf("translation editor qa target page lookup failed: %w", targetErr)
			}
			if editorTarget != nil && !matchesTranslationGroup(editorGroupID, editorTarget.FamilyID) {
				repairedTarget := cloneCMSPage(*editorTarget)
				repairedTarget.FamilyID = editorGroupID
				editorTarget, err = contentSvc.UpdatePage(ctx, repairedTarget)
				if err != nil {
					return fmt.Errorf("translation editor qa target page family repair failed: %w", err)
				}
			}
			if editorTarget == nil && strings.TrimSpace(editorGroupID) != "" {
				createdTarget, createErr := contentSvc.CreatePage(ctx, coreadmin.CMSPage{
					ID:       ensureLocaleSlug(strings.TrimSpace(editorSource.ID), "fr"),
					Title:    "Guide d'accueil",
					Slug:     ensureLocaleSlug(strings.TrimSpace(editorSource.Slug), "fr"),
					Locale:   "fr",
					FamilyID: editorGroupID,
					Status:   "draft",
					Data: map[string]any{
						"path": ensureLocaleSlug(strings.TrimSpace(exchangePagePath(*editorSource)), "fr"),
						"body": "Publier la traduction depuis l'accueil.",
					},
					Metadata: map[string]any{
						"tenant_id": strings.TrimSpace(tenantID),
						"org_id":    strings.TrimSpace(orgID),
					},
				})
				if createErr != nil {
					return fmt.Errorf("translation editor qa target page create failed: %w", createErr)
				}
				editorTarget = createdTarget
			}
			if editorTarget != nil {
				editorTarget, err = ensureScopedPage(ctx, contentSvc, editorTarget, tenantID, orgID)
				if err != nil {
					return fmt.Errorf("translation editor qa target page scope update failed: %w", err)
				}
			}
			if editorTarget != nil && strings.TrimSpace(editorGroupID) != "" {
				staleSourceFields := map[string]string{
					"title": strings.TrimSpace(editorSource.Title),
					"path":  strings.TrimSpace(exchangePagePath(*editorSource)),
					"body":  "Older home page source snapshot.",
				}
				sourceFields := fixtureTranslationFields(editorSource.Title, editorSource.Slug, editorSource.Data)
				editorTargetMetadata := cloneAnyMap(editorTarget.Metadata)
				if editorTargetMetadata == nil {
					editorTargetMetadata = map[string]any{}
				}
				editorTargetMetadata["attachments"] = []any{
					map[string]any{
						"id":          "asset-qa-1",
						"kind":        "reference",
						"filename":    "homepage-brief.pdf",
						"byte_size":   2048,
						"uploaded_at": now.Add(-2 * time.Hour).Format(time.RFC3339),
						"description": "Homepage localization brief",
						"url":         "/media/homepage-brief.pdf",
					},
					map[string]any{
						"id":          "asset-qa-2",
						"kind":        "terminology",
						"filename":    "glossary.csv",
						"byte_size":   1024,
						"uploaded_at": now.Add(-26 * time.Hour).Format(time.RFC3339),
						"description": "Approved glossary extract",
						"url":         "/media/glossary.csv",
					},
				}
				editorTargetMetadata["translation_editor"] = map[string]any{
					"row_version":               3,
					"source_hash_at_last_sync":  translationEditorHashFields(staleSourceFields),
					"last_synced_source_fields": cloneStringMapToAny(staleSourceFields),
					"last_saved_at":             now.Add(-15 * time.Minute).Format(time.RFC3339),
					"last_saved_by":             assignees[0],
				}
				editorTargetMetadata["source_hash_at_last_sync"] = translationEditorHashFields(staleSourceFields)
				editorTargetUpdated := cloneCMSPage(*editorTarget)
				editorTargetUpdated.Metadata = editorTargetMetadata
				editorTargetUpdated.Title = strings.TrimSpace(firstNonEmpty(editorTargetUpdated.Title, "Guide d'accueil"))
				if editorTargetUpdated.Data == nil {
					editorTargetUpdated.Data = map[string]any{}
				}
				if strings.TrimSpace(fmt.Sprint(editorTargetUpdated.Data["body"])) == "" {
					editorTargetUpdated.Data["body"] = "Publier la traduction depuis l'accueil."
				}
				if _, updateErr := contentSvc.UpdatePage(ctx, editorTargetUpdated); updateErr != nil {
					return fmt.Errorf("translation editor qa target page metadata update failed: %w", updateErr)
				}
				editorAssignment := coreadmin.TranslationAssignment{
					ID:                  exampleTranslationQAAssignmentID,
					FamilyID:            editorGroupID,
					EntityType:          "pages",
					TenantID:            strings.TrimSpace(tenantID),
					OrgID:               strings.TrimSpace(orgID),
					SourceRecordID:      strings.TrimSpace(editorSource.ID),
					SourceLocale:        strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(editorSource.Locale, "en"))),
					TargetLocale:        "fr",
					TargetRecordID:      strings.TrimSpace(editorTarget.ID),
					AssignmentType:      coreadmin.AssignmentTypeDirect,
					Status:              coreadmin.AssignmentStatusReview,
					Priority:            coreadmin.PriorityHigh,
					AssigneeID:          assignees[0],
					ReviewerID:          assignees[0],
					SourceTitle:         strings.TrimSpace(firstNonEmpty(editorSource.Title, sourceFields["title"])),
					SourcePath:          strings.TrimSpace(firstNonEmpty(exchangePagePath(*editorSource), sourceFields["path"])),
					LastRejectionReason: "Please tighten the CTA tone.",
					ClaimedAt:           fixtureTimePtr(now.Add(-90 * time.Minute)),
					SubmittedAt:         fixtureTimePtr(now.Add(-45 * time.Minute)),
				}
				if err := seedOrRefreshQueueAssignment(ctx, repo, editorAssignment); err != nil {
					return err
				}
			}
		}
	}

	inProgress := coreadmin.TranslationAssignment{
		FamilyID:       primaryGroupID,
		EntityType:     "pages",
		TenantID:       strings.TrimSpace(tenantID),
		OrgID:          strings.TrimSpace(orgID),
		SourceRecordID: strings.TrimSpace(sourcePage.ID),
		SourceLocale:   primarySourceLocale,
		TargetLocale:   exampleTranslationQueueTargetLocale,
		SourceTitle:    primaryTitle,
		SourcePath:     primarySourcePath,
		AssignmentType: coreadmin.AssignmentTypeDirect,
		Status:         coreadmin.AssignmentStatusInProgress,
		Priority:       coreadmin.PriorityHigh,
		AssigneeID:     assignees[0],
		ClaimedAt:      fixtureTimePtr(now),
	}
	if err := seedOrRefreshQueueAssignment(ctx, repo, inProgress); err != nil {
		return err
	}

	postSource, postErr := findPostBySlug(ctx, contentSvc, exampleTranslationQueuePostSource)
	if postErr != nil {
		return fmt.Errorf("translation queue fixture review post lookup failed: %w", postErr)
	}
	if postSource == nil {
		return fmt.Errorf("translation queue fixture review post %q not found", exampleTranslationQueuePostSource)
	}
	reviewDueDate := now.Add(36 * time.Hour)
	postAssignment := coreadmin.TranslationAssignment{
		FamilyID:       normalizeFamilyID(postSource.FamilyID, postSource.ID),
		EntityType:     "posts",
		TenantID:       strings.TrimSpace(tenantID),
		OrgID:          strings.TrimSpace(orgID),
		SourceRecordID: strings.TrimSpace(postSource.ID),
		SourceLocale:   strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(postSource.Locale, "en"))),
		TargetLocale:   "fr",
		SourceTitle:    strings.TrimSpace(postSource.Title),
		SourcePath:     strings.TrimSpace(fmt.Sprint(postSource.Data["path"])),
		AssignmentType: coreadmin.AssignmentTypeDirect,
		Status:         coreadmin.AssignmentStatusReview,
		Priority:       coreadmin.PriorityHigh,
		AssigneeID:     assignees[0],
		ReviewerID:     assignees[0],
		DueDate:        &reviewDueDate,
		ClaimedAt:      fixtureTimePtr(now),
		SubmittedAt:    fixtureTimePtr(now.Add(-2 * time.Hour)),
	}
	if strings.TrimSpace(postAssignment.SourcePath) == "" || postAssignment.SourcePath == "<nil>" {
		postAssignment.SourcePath = strings.TrimSpace("/posts/" + strings.Trim(strings.TrimSpace(postSource.Slug), "/"))
	}
	if strings.TrimSpace(postAssignment.FamilyID) == "" {
		return fmt.Errorf("translation queue fixture review post %q missing family_id", exampleTranslationQueuePostSource)
	}
	if err := seedOrRefreshQueueAssignment(ctx, repo, postAssignment); err != nil {
		return err
	}

	assignedAssignee := assignees[0]
	if len(assignees) > 1 {
		assignedAssignee = assignees[1]
	}
	assignedDueDate := now.Add(72 * time.Hour)
	assignedQueueItem := coreadmin.TranslationAssignment{
		FamilyID:       normalizeFamilyID(postSource.FamilyID, postSource.ID),
		EntityType:     "posts",
		TenantID:       strings.TrimSpace(tenantID),
		OrgID:          strings.TrimSpace(orgID),
		SourceRecordID: strings.TrimSpace(postSource.ID),
		SourceLocale:   strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(postSource.Locale, "en"))),
		TargetLocale:   "es",
		SourceTitle:    strings.TrimSpace(postSource.Title),
		SourcePath:     strings.TrimSpace(postAssignment.SourcePath),
		AssignmentType: coreadmin.AssignmentTypeDirect,
		Status:         coreadmin.AssignmentStatusAssigned,
		Priority:       coreadmin.PriorityNormal,
		AssigneeID:     assignedAssignee,
		ReviewerID:     assignees[0],
		DueDate:        &assignedDueDate,
	}
	if err := seedOrRefreshQueueAssignment(ctx, repo, assignedQueueItem); err != nil {
		return err
	}

	overdueDueDate := now.Add(-6 * time.Hour)
	overdueQueueItem := coreadmin.TranslationAssignment{
		FamilyID:       primaryGroupID,
		EntityType:     "pages",
		TenantID:       strings.TrimSpace(tenantID),
		OrgID:          strings.TrimSpace(orgID),
		SourceRecordID: strings.TrimSpace(sourcePage.ID),
		SourceLocale:   primarySourceLocale,
		TargetLocale:   "es",
		SourceTitle:    primaryTitle,
		SourcePath:     primarySourcePath,
		AssignmentType: coreadmin.AssignmentTypeDirect,
		Status:         coreadmin.AssignmentStatusInProgress,
		Priority:       coreadmin.PriorityUrgent,
		AssigneeID:     assignees[0],
		DueDate:        &overdueDueDate,
		ClaimedAt:      fixtureTimePtr(now.Add(-24 * time.Hour)),
	}
	if err := seedOrRefreshQueueAssignment(ctx, repo, overdueQueueItem); err != nil {
		return err
	}

	openPoolSource := sourcePage
	if candidate, candidateErr := findPageBySlug(ctx, contentSvc, exampleTranslationQueueOpenPoolSlug); candidateErr == nil && candidate != nil {
		if scopedCandidate, scopeErr := ensureScopedPageFamily(ctx, contentSvc, candidate, tenantID, orgID); scopeErr == nil && scopedCandidate != nil {
			openPoolSource = scopedCandidate
		} else if scopeErr != nil {
			return fmt.Errorf("translation queue fixture open-pool source scope update failed: %w", scopeErr)
		} else {
			openPoolSource = candidate
		}
	}
	openPool := coreadmin.TranslationAssignment{
		FamilyID:       normalizeFamilyID(openPoolSource.FamilyID, openPoolSource.ID),
		EntityType:     "pages",
		TenantID:       strings.TrimSpace(tenantID),
		OrgID:          strings.TrimSpace(orgID),
		SourceRecordID: strings.TrimSpace(openPoolSource.ID),
		SourceLocale:   strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(openPoolSource.Locale, "en"))),
		TargetLocale:   "fr",
		SourceTitle:    strings.TrimSpace(openPoolSource.Title),
		SourcePath:     strings.TrimSpace(exchangePagePath(*openPoolSource)),
		AssignmentType: coreadmin.AssignmentTypeOpenPool,
		Status:         coreadmin.AssignmentStatusPending,
		Priority:       coreadmin.PriorityNormal,
		AssigneeID:     "",
	}
	if strings.TrimSpace(openPool.FamilyID) != "" {
		if err := seedOrRefreshQueueAssignment(ctx, repo, openPool); err != nil {
			return err
		}
	}

	return nil
}

func seedPersistentQueueFixture(
	ctx context.Context,
	repo coreadmin.TranslationAssignmentRepository,
	contentSvc coreadmin.CMSContentService,
	tenantID string,
	orgID string,
	syncFamilies func(context.Context) error,
	assigneeIDs ...string,
) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if repo == nil {
		return fmt.Errorf("translation queue fixture repository is required")
	}
	if contentSvc == nil {
		return fmt.Errorf("translation queue fixture content service is required")
	}

	assignees := normalizeQueueFixtureAssignees(assigneeIDs)
	if len(assignees) == 0 {
		assignees = []string{exampleTranslationQueueFallbackUser}
	}
	persistAssignment := func(assignment coreadmin.TranslationAssignment) error {
		if syncFamilies == nil {
			return fmt.Errorf("persistent queue fixture family sync callback is required")
		}
		if err := syncFamilies(ctx); err != nil {
			return fmt.Errorf("persistent queue fixture family sync failed: %w", err)
		}
		return seedOrRefreshQueueAssignment(ctx, repo, assignment)
	}

	sourcePage, err := findPageBySlug(ctx, contentSvc, exampleTranslationQueueSourceSlug)
	if err != nil {
		return fmt.Errorf("persistent queue fixture source page lookup failed: %w", err)
	}
	if sourcePage == nil {
		return fmt.Errorf("persistent queue fixture source page %q not found", exampleTranslationQueueSourceSlug)
	}
	sourcePage, err = ensureScopedPageFamily(ctx, contentSvc, sourcePage, tenantID, orgID)
	if err != nil {
		return fmt.Errorf("persistent queue fixture source page scope update failed: %w", err)
	}

	now := time.Now().UTC()
	primaryGroupID := strings.TrimSpace(normalizeFamilyID(sourcePage.FamilyID, sourcePage.ID))
	if primaryGroupID == "" {
		return fmt.Errorf("persistent queue fixture source page %q missing family_id", exampleTranslationQueueSourceSlug)
	}
	primarySourceLocale := strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(sourcePage.Locale, "en")))
	primarySourcePath := strings.TrimSpace(exchangePagePath(*sourcePage))
	primaryTitle := strings.TrimSpace(sourcePage.Title)

	editorSource, err := findPageBySlug(ctx, contentSvc, "home")
	if err != nil {
		return fmt.Errorf("persistent translation editor qa source page lookup failed: %w", err)
	}
	if editorSource == nil {
		return fmt.Errorf("persistent translation editor qa source page %q not found", "home")
	}
	editorSource, err = ensureScopedPageFamily(ctx, contentSvc, editorSource, tenantID, orgID)
	if err != nil {
		return fmt.Errorf("persistent translation editor qa source page scope update failed: %w", err)
	}
	editorGroupID := strings.TrimSpace(normalizeFamilyID(editorSource.FamilyID, editorSource.ID))
	if editorGroupID == "" {
		return fmt.Errorf("persistent translation editor qa source page %q missing family_id", "home")
	}
	editorTarget, err := ensureQueuePageTargetVariant(ctx, contentSvc, editorSource, editorGroupID, "fr", tenantID, orgID)
	if err != nil {
		return fmt.Errorf("persistent translation editor qa target page ensure failed: %w", err)
	}
	if editorTarget == nil {
		return fmt.Errorf("persistent translation editor qa target page %q unavailable", "home-fr")
	}
	staleSourceFields := map[string]string{
		"title": strings.TrimSpace(editorSource.Title),
		"path":  strings.TrimSpace(exchangePagePath(*editorSource)),
		"body":  "Older home page source snapshot.",
	}
	sourceFields := fixtureTranslationFields(editorSource.Title, editorSource.Slug, editorSource.Data)
	editorTargetMetadata := cloneAnyMap(editorTarget.Metadata)
	if editorTargetMetadata == nil {
		editorTargetMetadata = map[string]any{}
	}
	editorTargetMetadata["attachments"] = []any{
		map[string]any{
			"id":          "asset-qa-1",
			"kind":        "reference",
			"filename":    "homepage-brief.pdf",
			"byte_size":   2048,
			"uploaded_at": now.Add(-2 * time.Hour).Format(time.RFC3339),
			"description": "Homepage localization brief",
			"url":         "/media/homepage-brief.pdf",
		},
		map[string]any{
			"id":          "asset-qa-2",
			"kind":        "terminology",
			"filename":    "glossary.csv",
			"byte_size":   1024,
			"uploaded_at": now.Add(-26 * time.Hour).Format(time.RFC3339),
			"description": "Approved glossary extract",
			"url":         "/media/glossary.csv",
		},
	}
	editorTargetMetadata["translation_editor"] = map[string]any{
		"row_version":               3,
		"source_hash_at_last_sync":  translationEditorHashFields(staleSourceFields),
		"last_synced_source_fields": cloneStringMapToAny(staleSourceFields),
		"last_saved_at":             now.Add(-15 * time.Minute).Format(time.RFC3339),
		"last_saved_by":             assignees[0],
	}
	editorTargetMetadata["source_hash_at_last_sync"] = translationEditorHashFields(staleSourceFields)
	editorTargetUpdated := cloneCMSPage(*editorTarget)
	editorTargetUpdated.Metadata = editorTargetMetadata
	editorTargetUpdated.Title = strings.TrimSpace(firstNonEmpty(editorTargetUpdated.Title, "Guide d'accueil"))
	if editorTargetUpdated.Data == nil {
		editorTargetUpdated.Data = map[string]any{}
	}
	if strings.TrimSpace(fmt.Sprint(editorTargetUpdated.Data["body"])) == "" {
		editorTargetUpdated.Data["body"] = "Publier la traduction depuis l'accueil."
	}
	if _, err := contentSvc.UpdatePage(ctx, editorTargetUpdated); err != nil {
		return fmt.Errorf("persistent translation editor qa target page metadata update failed: %w", err)
	}
	editorAssignment := coreadmin.TranslationAssignment{
		ID:                  exampleTranslationQAAssignmentID,
		FamilyID:            editorGroupID,
		EntityType:          "pages",
		TenantID:            strings.TrimSpace(tenantID),
		OrgID:               strings.TrimSpace(orgID),
		SourceRecordID:      strings.TrimSpace(editorSource.ID),
		SourceLocale:        strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(editorSource.Locale, "en"))),
		TargetLocale:        "fr",
		TargetRecordID:      strings.TrimSpace(editorTarget.ID),
		AssignmentType:      coreadmin.AssignmentTypeDirect,
		Status:              coreadmin.AssignmentStatusInReview,
		Priority:            coreadmin.PriorityHigh,
		AssigneeID:          assignees[0],
		ReviewerID:          assignees[0],
		SourceTitle:         strings.TrimSpace(firstNonEmpty(editorSource.Title, sourceFields["title"])),
		SourcePath:          strings.TrimSpace(firstNonEmpty(exchangePagePath(*editorSource), sourceFields["path"])),
		LastRejectionReason: "Please tighten the CTA tone.",
		ClaimedAt:           fixtureTimePtr(now.Add(-90 * time.Minute)),
		SubmittedAt:         fixtureTimePtr(now.Add(-45 * time.Minute)),
	}
	if err := persistAssignment(editorAssignment); err != nil {
		return err
	}

	primaryTarget, err := ensureQueuePageTargetVariant(
		ctx,
		contentSvc,
		sourcePage,
		primaryGroupID,
		exampleTranslationQueueTargetLocale,
		tenantID,
		orgID,
	)
	if err != nil {
		return fmt.Errorf("persistent queue fixture primary target page ensure failed: %w", err)
	}
	if primaryTarget == nil {
		return fmt.Errorf("persistent queue fixture primary target page %q unavailable", ensureLocaleSlug(strings.TrimSpace(sourcePage.Slug), exampleTranslationQueueTargetLocale))
	}
	inProgress := coreadmin.TranslationAssignment{
		FamilyID:       primaryGroupID,
		EntityType:     "pages",
		TenantID:       strings.TrimSpace(tenantID),
		OrgID:          strings.TrimSpace(orgID),
		SourceRecordID: strings.TrimSpace(sourcePage.ID),
		SourceLocale:   primarySourceLocale,
		TargetLocale:   exampleTranslationQueueTargetLocale,
		TargetRecordID: strings.TrimSpace(primaryTarget.ID),
		SourceTitle:    primaryTitle,
		SourcePath:     primarySourcePath,
		AssignmentType: coreadmin.AssignmentTypeDirect,
		Status:         coreadmin.AssignmentStatusInProgress,
		Priority:       coreadmin.PriorityHigh,
		AssigneeID:     assignees[0],
		ClaimedAt:      fixtureTimePtr(now),
	}
	if err := persistAssignment(inProgress); err != nil {
		return err
	}

	openPoolPageSource := sourcePage
	if candidate, candidateErr := findPageBySlug(ctx, contentSvc, exampleTranslationQueueOpenPoolSlug); candidateErr == nil && candidate != nil {
		openPoolPageSource, err = ensureScopedPageFamily(ctx, contentSvc, candidate, tenantID, orgID)
		if err != nil {
			return fmt.Errorf("persistent queue fixture open-pool page scope update failed: %w", err)
		}
	} else if candidateErr != nil {
		return fmt.Errorf("persistent queue fixture open-pool page lookup failed: %w", candidateErr)
	}
	openPoolPageFamilyID := strings.TrimSpace(normalizeFamilyID(openPoolPageSource.FamilyID, openPoolPageSource.ID))
	if openPoolPageFamilyID != "" {
		openPoolPageTarget, err := ensureQueuePageTargetVariant(ctx, contentSvc, openPoolPageSource, openPoolPageFamilyID, "fr", tenantID, orgID)
		if err != nil {
			return fmt.Errorf("persistent queue fixture open-pool page target ensure failed: %w", err)
		}
		if openPoolPageTarget != nil {
			openPoolPage := coreadmin.TranslationAssignment{
				FamilyID:       openPoolPageFamilyID,
				EntityType:     "pages",
				TenantID:       strings.TrimSpace(tenantID),
				OrgID:          strings.TrimSpace(orgID),
				SourceRecordID: strings.TrimSpace(openPoolPageSource.ID),
				SourceLocale:   strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(openPoolPageSource.Locale, "en"))),
				TargetLocale:   "fr",
				TargetRecordID: strings.TrimSpace(openPoolPageTarget.ID),
				SourceTitle:    strings.TrimSpace(openPoolPageSource.Title),
				SourcePath:     strings.TrimSpace(exchangePagePath(*openPoolPageSource)),
				AssignmentType: coreadmin.AssignmentTypeOpenPool,
				Status:         coreadmin.AssignmentStatusPending,
				Priority:       coreadmin.PriorityNormal,
			}
			if err := persistAssignment(openPoolPage); err != nil {
				return err
			}
		}
	}

	overduePageTarget, err := ensureQueuePageTargetVariant(ctx, contentSvc, sourcePage, primaryGroupID, "es", tenantID, orgID)
	if err != nil {
		return fmt.Errorf("persistent queue fixture overdue page target ensure failed: %w", err)
	}
	if overduePageTarget != nil {
		overduePageDueDate := now.Add(-6 * time.Hour)
		overduePage := coreadmin.TranslationAssignment{
			FamilyID:       primaryGroupID,
			EntityType:     "pages",
			TenantID:       strings.TrimSpace(tenantID),
			OrgID:          strings.TrimSpace(orgID),
			SourceRecordID: strings.TrimSpace(sourcePage.ID),
			SourceLocale:   primarySourceLocale,
			TargetLocale:   "es",
			TargetRecordID: strings.TrimSpace(overduePageTarget.ID),
			SourceTitle:    primaryTitle,
			SourcePath:     primarySourcePath,
			AssignmentType: coreadmin.AssignmentTypeDirect,
			Status:         coreadmin.AssignmentStatusInProgress,
			Priority:       coreadmin.PriorityUrgent,
			AssigneeID:     assignees[0],
			DueDate:        &overduePageDueDate,
			ClaimedAt:      fixtureTimePtr(now.Add(-24 * time.Hour)),
		}
		if err := persistAssignment(overduePage); err != nil {
			return err
		}
	}
	return nil
}

func ensureQueuePageTargetVariant(
	ctx context.Context,
	contentSvc coreadmin.CMSContentService,
	source *coreadmin.CMSPage,
	groupID string,
	targetLocale string,
	tenantID string,
	orgID string,
) (*coreadmin.CMSPage, error) {
	if source == nil || contentSvc == nil {
		return nil, nil
	}
	variant, err := findPageLocaleVariantForSource(ctx, contentSvc, source, groupID, targetLocale)
	if err != nil {
		return nil, err
	}
	if variant == nil {
		if candidate, candidateErr := findPageBySlug(ctx, contentSvc, ensureLocaleSlug(strings.TrimSpace(source.Slug), targetLocale)); candidateErr == nil && candidate != nil {
			variant = candidate
		} else if candidateErr != nil {
			return nil, candidateErr
		}
	}
	if variant == nil {
		created := cloneCMSPage(*source)
		created.ID = ""
		created.Locale = targetLocale
		created.Status = "draft"
		created.FamilyID = groupID
		created.Slug = ensureLocaleSlug(created.Slug, targetLocale)
		if created.Data == nil {
			created.Data = map[string]any{}
		}
		created.Data["path"] = ensureLocaleSlug(strings.TrimSpace(exchangePagePath(*source)), targetLocale)
		createdPage, err := contentSvc.CreatePage(ctx, created)
		if err != nil {
			return nil, err
		}
		variant = createdPage
	}
	if variant != nil && !matchesTranslationGroup(groupID, variant.FamilyID) {
		repaired := cloneCMSPage(*variant)
		repaired.FamilyID = groupID
		saved, err := contentSvc.UpdatePage(ctx, repaired)
		if err != nil {
			return nil, err
		}
		variant = saved
	}
	return ensureScopedPage(ctx, contentSvc, variant, tenantID, orgID)
}

func ensureQueuePostTargetVariant(
	ctx context.Context,
	contentSvc coreadmin.CMSContentService,
	source *coreadmin.CMSContent,
	groupID string,
	targetLocale string,
	tenantID string,
	orgID string,
) (*coreadmin.CMSContent, error) {
	if source == nil || contentSvc == nil {
		return nil, nil
	}
	variant, err := findPostLocaleVariant(ctx, contentSvc, groupID, targetLocale)
	if err != nil {
		return nil, err
	}
	if variant == nil {
		if candidate, candidateErr := findPostBySlug(ctx, contentSvc, ensureLocaleSlug(strings.TrimSpace(source.Slug), targetLocale)); candidateErr == nil && candidate != nil {
			variant = candidate
		} else if candidateErr != nil {
			return nil, candidateErr
		}
	}
	if variant == nil {
		created := cloneCMSContent(*source)
		created.ID = ""
		created.Locale = targetLocale
		created.Status = "draft"
		created.FamilyID = groupID
		created.Slug = ensureLocaleSlug(created.Slug, targetLocale)
		if created.Data == nil {
			created.Data = map[string]any{}
		}
		path := strings.TrimSpace(fmt.Sprint(created.Data["path"]))
		if path == "" || path == "<nil>" {
			path = "/posts/" + strings.Trim(strings.TrimSpace(created.Slug), "/")
		}
		created.Data["path"] = ensureLocaleSlug(path, targetLocale)
		createdContent, err := contentSvc.CreateContent(ctx, created)
		if err != nil {
			return nil, err
		}
		variant = createdContent
	}
	if variant != nil && !matchesTranslationGroup(groupID, variant.FamilyID) {
		repaired := cloneCMSContent(*variant)
		repaired.FamilyID = groupID
		saved, err := contentSvc.UpdateContent(ctx, repaired)
		if err != nil {
			return nil, err
		}
		variant = saved
	}
	return ensureScopedContent(ctx, contentSvc, variant, tenantID, orgID)
}

func seedOrRefreshQueueAssignment(ctx context.Context, repo coreadmin.TranslationAssignmentRepository, assignment coreadmin.TranslationAssignment) error {
	persisted, inserted, err := repo.CreateOrReuseActive(ctx, assignment)
	if err != nil {
		return fmt.Errorf(
			"queue assignment create_or_reuse failed family=%s entity=%s source_record=%s source_locale=%s target_locale=%s target_record=%s status=%s: %w",
			strings.TrimSpace(assignment.FamilyID),
			strings.TrimSpace(assignment.EntityType),
			strings.TrimSpace(assignment.SourceRecordID),
			strings.TrimSpace(assignment.SourceLocale),
			strings.TrimSpace(assignment.TargetLocale),
			strings.TrimSpace(assignment.TargetRecordID),
			string(assignment.Status),
			err,
		)
	}
	if inserted {
		return nil
	}

	updated := persisted
	changed := false
	if updated.Status != assignment.Status {
		updated.Status = assignment.Status
		changed = true
	}
	if updated.AssignmentType != assignment.AssignmentType {
		updated.AssignmentType = assignment.AssignmentType
		changed = true
	}
	if strings.TrimSpace(updated.AssigneeID) != strings.TrimSpace(assignment.AssigneeID) {
		updated.AssigneeID = strings.TrimSpace(assignment.AssigneeID)
		changed = true
	}
	if updated.Priority != assignment.Priority {
		updated.Priority = assignment.Priority
		changed = true
	}
	if !fixtureTimesEqual(updated.ClaimedAt, assignment.ClaimedAt) {
		updated.ClaimedAt = fixtureTimePtrValue(assignment.ClaimedAt)
		changed = true
	}
	if !fixtureTimesEqual(updated.SubmittedAt, assignment.SubmittedAt) {
		updated.SubmittedAt = fixtureTimePtrValue(assignment.SubmittedAt)
		changed = true
	}
	if !fixtureTimesEqual(updated.DueDate, assignment.DueDate) {
		updated.DueDate = fixtureTimePtrValue(assignment.DueDate)
		changed = true
	}
	if !changed {
		return nil
	}
	_, err = repo.Update(ctx, updated, updated.Version)
	if err != nil {
		return fmt.Errorf(
			"queue assignment update failed id=%s family=%s entity=%s source_record=%s source_locale=%s target_locale=%s target_record=%s status=%s: %w",
			strings.TrimSpace(updated.ID),
			strings.TrimSpace(updated.FamilyID),
			strings.TrimSpace(updated.EntityType),
			strings.TrimSpace(updated.SourceRecordID),
			strings.TrimSpace(updated.SourceLocale),
			strings.TrimSpace(updated.TargetLocale),
			strings.TrimSpace(updated.TargetRecordID),
			string(updated.Status),
			err,
		)
	}
	return nil
}

func normalizeQueueFixtureAssignees(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		normalized := strings.ToLower(trimmed)
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func ensureScopedPageFamily(
	ctx context.Context,
	contentSvc coreadmin.CMSContentService,
	page *coreadmin.CMSPage,
	tenantID string,
	orgID string,
) (*coreadmin.CMSPage, error) {
	if page == nil {
		return nil, nil
	}
	groupID := normalizeFamilyID(page.FamilyID, page.ID)
	if strings.TrimSpace(groupID) == "" {
		return ensureScopedPage(ctx, contentSvc, page, tenantID, orgID)
	}
	pages, err := contentSvc.Pages(ctx, "")
	if err != nil {
		return nil, err
	}
	for _, candidate := range pages {
		if !matchesTranslationGroup(groupID, candidate.FamilyID) && !matchesTranslationGroup(groupID, candidate.ID) {
			continue
		}
		candidateCopy := cloneCMSPage(candidate)
		if _, err := ensureScopedPage(ctx, contentSvc, &candidateCopy, tenantID, orgID); err != nil {
			return nil, err
		}
	}
	return ensureScopedPage(ctx, contentSvc, page, tenantID, orgID)
}

func ensureScopedPage(
	ctx context.Context,
	contentSvc coreadmin.CMSContentService,
	page *coreadmin.CMSPage,
	tenantID string,
	orgID string,
) (*coreadmin.CMSPage, error) {
	if page == nil || contentSvc == nil {
		return page, nil
	}
	updated := cloneCMSPage(*page)
	if !applyFixtureScopeMetadata(&updated.Metadata, &updated.Data, tenantID, orgID) {
		copy := cloneCMSPage(*page)
		return &copy, nil
	}
	saved, err := contentSvc.UpdatePage(ctx, updated)
	if err != nil {
		return nil, err
	}
	if saved == nil {
		copy := updated
		return &copy, nil
	}
	return saved, nil
}

func ensureScopedContentFamily(
	ctx context.Context,
	contentSvc coreadmin.CMSContentService,
	content *coreadmin.CMSContent,
	tenantID string,
	orgID string,
) (*coreadmin.CMSContent, error) {
	if content == nil {
		return nil, nil
	}
	groupID := normalizeFamilyID(content.FamilyID, content.ID)
	if strings.TrimSpace(groupID) == "" {
		return ensureScopedContent(ctx, contentSvc, content, tenantID, orgID)
	}
	items, err := contentSvc.Contents(ctx, "")
	if err != nil {
		return nil, err
	}
	for _, candidate := range items {
		if !matchesTranslationGroup(groupID, candidate.FamilyID) && !matchesTranslationGroup(groupID, candidate.ID) {
			continue
		}
		candidateCopy := cloneCMSContent(candidate)
		if _, err := ensureScopedContent(ctx, contentSvc, &candidateCopy, tenantID, orgID); err != nil {
			return nil, err
		}
	}
	return ensureScopedContent(ctx, contentSvc, content, tenantID, orgID)
}

func ensureScopedContent(
	ctx context.Context,
	contentSvc coreadmin.CMSContentService,
	content *coreadmin.CMSContent,
	tenantID string,
	orgID string,
) (*coreadmin.CMSContent, error) {
	if content == nil || contentSvc == nil {
		return content, nil
	}
	updated := cloneCMSContent(*content)
	if !applyFixtureScopeMetadata(&updated.Metadata, &updated.Data, tenantID, orgID) {
		copy := cloneCMSContent(*content)
		return &copy, nil
	}
	saved, err := contentSvc.UpdateContent(ctx, updated)
	if err != nil {
		return nil, err
	}
	if saved == nil {
		copy := updated
		return &copy, nil
	}
	return saved, nil
}

func applyFixtureScopeMetadata(metadata *map[string]any, data *map[string]any, tenantID string, orgID string) bool {
	tenantID = strings.TrimSpace(tenantID)
	orgID = strings.TrimSpace(orgID)
	if tenantID == "" && orgID == "" {
		return false
	}
	if metadata == nil && data == nil {
		return false
	}
	changed := false
	for _, target := range []*map[string]any{metadata, data} {
		if target == nil {
			continue
		}
		if *target == nil {
			*target = map[string]any{}
		}
		if tenantID != "" && strings.TrimSpace(fmt.Sprint((*target)["tenant_id"])) != tenantID {
			(*target)["tenant_id"] = tenantID
			changed = true
		}
		if orgID != "" && strings.TrimSpace(fmt.Sprint((*target)["org_id"])) != orgID {
			(*target)["org_id"] = orgID
			changed = true
		}
	}
	return changed
}

func fixtureTimePtr(value time.Time) *time.Time {
	copied := value
	return &copied
}

func fixtureTimePtrValue(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	copied := *value
	return &copied
}

func fixtureTimesEqual(left, right *time.Time) bool {
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}
	return left.UTC().Equal(right.UTC())
}

func findPostBySlug(ctx context.Context, contentSvc coreadmin.CMSContentService, slug string) (*coreadmin.CMSContent, error) {
	if contentSvc == nil {
		return nil, nil
	}
	target := strings.ToLower(strings.TrimSpace(slug))
	if target == "" {
		return nil, nil
	}
	items, err := contentSvc.Contents(ctx, "")
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		if !strings.EqualFold(strings.TrimSpace(item.ContentTypeSlug), "posts") &&
			!strings.EqualFold(strings.TrimSpace(item.ContentTypeSlug), "post") &&
			!strings.EqualFold(strings.TrimSpace(item.ContentType), "posts") &&
			!strings.EqualFold(strings.TrimSpace(item.ContentType), "post") {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(item.Slug), target) && strings.EqualFold(strings.TrimSpace(item.Locale), "en") {
			copy := cloneCMSContent(item)
			return &copy, nil
		}
	}
	for _, item := range items {
		if !strings.EqualFold(strings.TrimSpace(item.ContentTypeSlug), "posts") &&
			!strings.EqualFold(strings.TrimSpace(item.ContentTypeSlug), "post") &&
			!strings.EqualFold(strings.TrimSpace(item.ContentType), "posts") &&
			!strings.EqualFold(strings.TrimSpace(item.ContentType), "post") {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(item.Slug), target) {
			copy := cloneCMSContent(item)
			return &copy, nil
		}
	}
	return nil, nil
}

func seedLegacyTranslationQueueFixture(ctx context.Context, repo coreadmin.TranslationAssignmentRepository, sourcePage *coreadmin.CMSPage, now time.Time) error {
	assignment := coreadmin.TranslationAssignment{
		FamilyID:       normalizeFamilyID(sourcePage.FamilyID, sourcePage.ID),
		EntityType:     "pages",
		SourceRecordID: strings.TrimSpace(sourcePage.ID),
		SourceLocale:   strings.ToLower(strings.TrimSpace(fixtureFirstNonEmptyString(sourcePage.Locale, "en"))),
		TargetLocale:   exampleTranslationQueueTargetLocale,
		SourceTitle:    strings.TrimSpace(sourcePage.Title),
		SourcePath:     strings.TrimSpace(exchangePagePath(*sourcePage)),
		AssignmentType: coreadmin.AssignmentTypeDirect,
		Status:         coreadmin.AssignmentStatusInProgress,
		Priority:       coreadmin.PriorityHigh,
		AssigneeID:     "translator.demo",
		ClaimedAt:      &now,
	}
	if strings.TrimSpace(assignment.FamilyID) == "" {
		return nil
	}

	return seedOrRefreshQueueAssignment(ctx, repo, assignment)
}

func findPageBySlug(ctx context.Context, contentSvc coreadmin.CMSContentService, slug string) (*coreadmin.CMSPage, error) {
	if contentSvc == nil {
		return nil, nil
	}
	target := strings.ToLower(strings.TrimSpace(slug))
	if target == "" {
		return nil, nil
	}
	pages, err := contentSvc.Pages(ctx, "")
	if err != nil {
		return nil, err
	}
	for _, page := range pages {
		if strings.EqualFold(strings.TrimSpace(page.Slug), target) && strings.EqualFold(strings.TrimSpace(page.Locale), "en") {
			copy := cloneCMSPage(page)
			return &copy, nil
		}
	}
	for _, page := range pages {
		if strings.EqualFold(strings.TrimSpace(page.Slug), target) {
			copy := cloneCMSPage(page)
			return &copy, nil
		}
	}
	return nil, nil
}

func pageLocaleVariantExists(ctx context.Context, contentSvc coreadmin.CMSContentService, groupID, targetLocale string) (bool, error) {
	variant, err := findPageLocaleVariant(ctx, contentSvc, groupID, targetLocale)
	if err != nil {
		return false, err
	}
	return variant != nil, nil
}

func pageLocaleVariantExistsForSource(ctx context.Context, contentSvc coreadmin.CMSContentService, source *coreadmin.CMSPage, groupID, targetLocale string) (bool, error) {
	variant, err := findPageLocaleVariantForSource(ctx, contentSvc, source, groupID, targetLocale)
	if err != nil {
		return false, err
	}
	return variant != nil, nil
}

func findPageLocaleVariant(ctx context.Context, contentSvc coreadmin.CMSContentService, groupID, targetLocale string) (*coreadmin.CMSPage, error) {
	return findPageLocaleVariantForSource(ctx, contentSvc, nil, groupID, targetLocale)
}

func findPageLocaleVariantForSource(
	ctx context.Context,
	contentSvc coreadmin.CMSContentService,
	source *coreadmin.CMSPage,
	groupID, targetLocale string,
) (*coreadmin.CMSPage, error) {
	if contentSvc == nil {
		return nil, nil
	}
	pages, err := contentSvc.Pages(ctx, "")
	if err != nil {
		return nil, err
	}
	targetLocale = strings.ToLower(strings.TrimSpace(targetLocale))
	expectedSlug, sourceID := "", ""
	if source != nil {
		sourceSlug := strings.TrimSpace(source.Slug)
		if sourceSlug != "" {
			expectedSlug = strings.ToLower(strings.TrimSpace(ensureLocaleSlug(sourceSlug, targetLocale)))
		}
		sourceID = strings.ToLower(strings.TrimSpace(source.ID))
	}
	for _, page := range pages {
		if !matchesTranslationGroup(groupID, page.FamilyID) && !matchesTranslationGroup(groupID, page.ID) {
			continue
		}
		if sourceID != "" && strings.EqualFold(strings.TrimSpace(page.ID), sourceID) {
			continue
		}
		localeMatch := strings.EqualFold(strings.TrimSpace(page.Locale), targetLocale)
		slugMatch := expectedSlug != "" && strings.EqualFold(strings.TrimSpace(page.Slug), expectedSlug)
		if localeMatch || slugMatch {
			copy := cloneCMSPage(page)
			return &copy, nil
		}
	}
	if expectedSlug != "" {
		for _, page := range pages {
			if sourceID != "" && strings.EqualFold(strings.TrimSpace(page.ID), sourceID) {
				continue
			}
			if strings.EqualFold(strings.TrimSpace(page.Slug), expectedSlug) {
				copy := cloneCMSPage(page)
				return &copy, nil
			}
		}
	}
	return nil, nil
}

func postLocaleVariantExists(ctx context.Context, contentSvc coreadmin.CMSContentService, groupID, targetLocale string) (bool, error) {
	variant, err := findPostLocaleVariant(ctx, contentSvc, groupID, targetLocale)
	if err != nil {
		return false, err
	}
	return variant != nil, nil
}

func findPostLocaleVariant(ctx context.Context, contentSvc coreadmin.CMSContentService, groupID, targetLocale string) (*coreadmin.CMSContent, error) {
	if contentSvc == nil {
		return nil, nil
	}
	items, err := contentSvc.Contents(ctx, "")
	if err != nil {
		return nil, err
	}
	targetLocale = strings.ToLower(strings.TrimSpace(targetLocale))
	for _, item := range items {
		if !strings.EqualFold(strings.TrimSpace(item.ContentTypeSlug), "posts") &&
			!strings.EqualFold(strings.TrimSpace(item.ContentType), "posts") {
			continue
		}
		if !matchesTranslationGroup(groupID, item.FamilyID) && !matchesTranslationGroup(groupID, item.ID) {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(item.Locale), targetLocale) {
			copy := cloneCMSContent(item)
			return &copy, nil
		}
	}
	return nil, nil
}

func normalizeExchangeResources(resources []string) map[string]bool {
	out := map[string]bool{}
	for _, resource := range resources {
		normalized := normalizeExchangeResource(resource)
		if normalized == "" {
			continue
		}
		out[normalized] = true
	}
	if len(out) == 0 {
		out["pages"] = true
		out["posts"] = true
	}
	return out
}

func normalizeExchangeResource(resource string) string {
	switch strings.ToLower(strings.TrimSpace(resource)) {
	case "page", "pages":
		return "pages"
	case "post", "posts", "content", "contents":
		return "posts"
	default:
		return ""
	}
}

func normalizeLocalesOrDefault(locales []string, defaults []string) []string {
	set := map[string]struct{}{}
	for _, locale := range locales {
		normalized := strings.ToLower(strings.TrimSpace(locale))
		if normalized == "" {
			continue
		}
		set[normalized] = struct{}{}
	}
	if len(set) == 0 {
		for _, locale := range defaults {
			normalized := strings.ToLower(strings.TrimSpace(locale))
			if normalized == "" {
				continue
			}
			set[normalized] = struct{}{}
		}
	}
	out := make([]string, 0, len(set))
	for locale := range set {
		out = append(out, locale)
	}
	return out
}

func normalizeFieldPathsOrDefault(paths []string, defaults []string) []string {
	out := make([]string, 0, len(paths))
	seen := map[string]struct{}{}
	for _, fieldPath := range paths {
		normalized := normalizeFieldPath(fieldPath)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		for _, fieldPath := range defaults {
			normalized := normalizeFieldPath(fieldPath)
			if normalized == "" {
				continue
			}
			if _, ok := seen[normalized]; ok {
				continue
			}
			seen[normalized] = struct{}{}
			out = append(out, normalized)
		}
	}
	return out
}

func normalizeFieldPath(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func stringSet(values []string) map[string]struct{} {
	out := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		out[trimmed] = struct{}{}
	}
	return out
}

func normalizeFamilyID(groupID, fallback string) string {
	groupID = strings.TrimSpace(groupID)
	if groupID != "" {
		return groupID
	}
	return strings.TrimSpace(fallback)
}

func matchesTranslationGroup(expected, candidate string) bool {
	expected = strings.TrimSpace(expected)
	candidate = strings.TrimSpace(candidate)
	if expected == "" || candidate == "" {
		return false
	}
	return strings.EqualFold(expected, candidate)
}

func exchangePageFieldValue(page coreadmin.CMSPage, fieldPath string) (string, bool) {
	switch normalizeFieldPath(fieldPath) {
	case "title":
		return strings.TrimSpace(page.Title), true
	case "path":
		return exchangePagePath(page), true
	case "summary", "excerpt":
		if page.Data == nil {
			return "", true
		}
		if value := strings.TrimSpace(fmt.Sprint(page.Data["summary"])); value != "" && value != "<nil>" {
			return value, true
		}
		if value := strings.TrimSpace(fmt.Sprint(page.Data["excerpt"])); value != "" && value != "<nil>" {
			return value, true
		}
		return "", true
	case "content", "body":
		if page.Data == nil {
			return "", true
		}
		if value := strings.TrimSpace(fmt.Sprint(page.Data["content"])); value != "" && value != "<nil>" {
			return value, true
		}
		if value := strings.TrimSpace(fmt.Sprint(page.Data["body"])); value != "" && value != "<nil>" {
			return value, true
		}
		return "", true
	default:
		return "", false
	}
}

func exchangeContentFieldValue(content coreadmin.CMSContent, fieldPath string) (string, bool) {
	switch normalizeFieldPath(fieldPath) {
	case "title":
		return strings.TrimSpace(content.Title), true
	case "path":
		if content.Data == nil {
			return "", true
		}
		value := strings.TrimSpace(fmt.Sprint(content.Data["path"]))
		if value == "<nil>" {
			value = ""
		}
		return value, true
	case "excerpt", "summary":
		if content.Data == nil {
			return "", true
		}
		if value := strings.TrimSpace(fmt.Sprint(content.Data["excerpt"])); value != "" && value != "<nil>" {
			return value, true
		}
		if value := strings.TrimSpace(fmt.Sprint(content.Data["summary"])); value != "" && value != "<nil>" {
			return value, true
		}
		return "", true
	case "content", "body":
		if content.Data == nil {
			return "", true
		}
		if value := strings.TrimSpace(fmt.Sprint(content.Data["content"])); value != "" && value != "<nil>" {
			return value, true
		}
		if value := strings.TrimSpace(fmt.Sprint(content.Data["body"])); value != "" && value != "<nil>" {
			return value, true
		}
		return "", true
	default:
		return "", false
	}
}

func setPageFieldValue(page *coreadmin.CMSPage, fieldPath, translated string) {
	if page == nil {
		return
	}
	switch normalizeFieldPath(fieldPath) {
	case "title":
		page.Title = translated
	case "path":
		if page.Data == nil {
			page.Data = map[string]any{}
		}
		page.Data["path"] = translated
		page.PreviewURL = translated
	case "summary", "excerpt":
		if page.Data == nil {
			page.Data = map[string]any{}
		}
		page.Data["summary"] = translated
		page.Data["excerpt"] = translated
	case "content", "body":
		if page.Data == nil {
			page.Data = map[string]any{}
		}
		page.Data["content"] = translated
		page.Data["body"] = translated
	}
}

func setContentFieldValue(content *coreadmin.CMSContent, fieldPath, translated string) {
	if content == nil {
		return
	}
	switch normalizeFieldPath(fieldPath) {
	case "title":
		content.Title = translated
	case "path":
		if content.Data == nil {
			content.Data = map[string]any{}
		}
		content.Data["path"] = translated
	case "excerpt", "summary":
		if content.Data == nil {
			content.Data = map[string]any{}
		}
		content.Data["excerpt"] = translated
		content.Data["summary"] = translated
	case "content", "body":
		if content.Data == nil {
			content.Data = map[string]any{}
		}
		content.Data["content"] = translated
		content.Data["body"] = translated
	}
}

func cloneCMSPage(page coreadmin.CMSPage) coreadmin.CMSPage {
	out := page
	out.AvailableLocales = append([]string{}, page.AvailableLocales...)
	out.Blocks = append([]string{}, page.Blocks...)
	out.EmbeddedBlocks = cloneAnySlice(page.EmbeddedBlocks)
	out.Data = primitives.CloneAnyMapNilOnEmpty(page.Data)
	out.Metadata = primitives.CloneAnyMapNilOnEmpty(page.Metadata)
	out.SEO = primitives.CloneAnyMapNilOnEmpty(page.SEO)
	return out
}

func cloneCMSContent(content coreadmin.CMSContent) coreadmin.CMSContent {
	out := content
	out.AvailableLocales = append([]string{}, content.AvailableLocales...)
	out.Blocks = append([]string{}, content.Blocks...)
	out.EmbeddedBlocks = cloneAnySlice(content.EmbeddedBlocks)
	out.Data = fixtureCloneAnyMap(content.Data)
	out.Metadata = fixtureCloneAnyMap(content.Metadata)
	return out
}

func fixtureCloneAnyMap(input map[string]any) map[string]any {
	if input == nil {
		return map[string]any{}
	}
	out := make(map[string]any, len(input))
	maps.Copy(out, input)
	return out
}

func fixtureFirstNonEmptyString(values ...string) string {
	for _, v := range values {
		if trimmed := strings.TrimSpace(v); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func cloneAnySlice(input []map[string]any) []map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(input))
	for _, item := range input {
		out = append(out, primitives.CloneAnyMapNilOnEmpty(item))
	}
	return out
}

func ensureLocaleSlug(slug, locale string) string {
	slug = strings.TrimSpace(slug)
	locale = strings.ToLower(strings.TrimSpace(locale))
	if slug == "" {
		return locale
	}
	if locale == "" {
		return slug
	}
	suffix := "-" + locale
	if strings.HasSuffix(strings.ToLower(slug), suffix) {
		return slug
	}
	return slug + suffix
}

func applyPagePathFallback(page *coreadmin.CMSPage, locale string) {
	if page == nil {
		return
	}
	if page.Data == nil {
		page.Data = map[string]any{}
	}
	if strings.TrimSpace(fmt.Sprint(page.Data["path"])) != "" {
		return
	}
	base := exchangePagePath(*page)
	base = strings.TrimSpace(base)
	if base == "" {
		base = "/" + strings.Trim(strings.TrimSpace(page.Slug), "/")
	}
	if strings.EqualFold(base, "/") {
		base = "/" + strings.ToLower(strings.TrimSpace(locale))
	} else {
		base = strings.TrimRight(base, "/") + "-" + strings.ToLower(strings.TrimSpace(locale))
	}
	page.Data["path"] = base
	page.PreviewURL = base
}

func exchangePagePath(page coreadmin.CMSPage) string {
	if page.Data != nil {
		if path := strings.TrimSpace(fmt.Sprint(page.Data["path"])); path != "" && path != "<nil>" {
			return path
		}
	}
	if preview := strings.TrimSpace(page.PreviewURL); preview != "" {
		return preview
	}
	slug := strings.Trim(strings.TrimSpace(page.Slug), "/")
	if slug == "" {
		return "/"
	}
	return "/" + slug
}

func exchangeRowSourceHash(value string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(value)))
	return hex.EncodeToString(sum[:])
}

func fixtureTranslationFields(title, slug string, data map[string]any) map[string]string {
	out := map[string]string{
		"title": strings.TrimSpace(title),
		"path":  strings.TrimSpace(firstNonEmpty(fmt.Sprint(data["path"]), "/"+strings.Trim(strings.TrimSpace(slug), "/"))),
	}
	if strings.TrimSpace(slug) != "" {
		out["slug"] = strings.Trim(strings.TrimSpace(slug), "/")
	}
	if data != nil {
		for _, key := range []string{"body", "summary", "excerpt", "description", "meta_title", "meta_description"} {
			value := strings.TrimSpace(fmt.Sprint(data[key]))
			if value != "" && value != "<nil>" {
				out[key] = value
			}
		}
	}
	return out
}

func cloneAnyMap(input map[string]any) map[string]any {
	return primitives.CloneAnyMap(input)
}

func cloneStringMapToAny(input map[string]string) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = strings.TrimSpace(value)
	}
	return out
}

func translationEditorHashFields(fields map[string]string) string {
	if len(fields) == 0 {
		return ""
	}
	keys := make([]string, 0, len(fields))
	for key := range fields {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	payload := make(map[string]string, len(keys))
	for _, key := range keys {
		payload[key] = strings.TrimSpace(fields[key])
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}
