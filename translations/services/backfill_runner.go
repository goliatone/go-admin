package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	translationcore "github.com/goliatone/go-admin/translations/core"
)

type BackfillSourceVariant struct {
	Scope              Scope             `json:"scope"`
	ContentType        string            `json:"content_type"`
	SourceRecordID     string            `json:"source_record_id"`
	TranslationGroupID string            `json:"translation_group_id,omitempty"`
	Locale             string            `json:"locale"`
	Fields             map[string]string `json:"fields,omitempty"`
	Metadata           map[string]any    `json:"metadata,omitempty"`
	Status             string            `json:"status,omitempty"`
	CreatedAt          time.Time         `json:"created_at"`
	UpdatedAt          time.Time         `json:"updated_at"`
}

type BackfillPolicy struct {
	SourceLocale            string              `json:"source_locale,omitempty"`
	RequiredLocales         []string            `json:"required_locales,omitempty"`
	RequiredFields          map[string][]string `json:"required_fields,omitempty"`
	ReviewRequired          bool                `json:"review_required,omitempty"`
	AllowPublishOverride    bool                `json:"allow_publish_override,omitempty"`
	AssignmentLifecycleMode string              `json:"assignment_lifecycle_mode,omitempty"`
	DefaultWorkScope        string              `json:"default_work_scope,omitempty"`
}

type BackfillInput struct {
	Variants []BackfillSourceVariant   `json:"variants"`
	Policies map[string]BackfillPolicy `json:"policies,omitempty"`
}

type BackfillWarning struct {
	Code     string `json:"code"`
	FamilyID string `json:"family_id,omitempty"`
	Message  string `json:"message"`
}

type BackfillBlocker struct {
	ID          string `json:"id"`
	FamilyID    string `json:"family_id"`
	TenantID    string `json:"tenant_id,omitempty"`
	OrgID       string `json:"org_id,omitempty"`
	BlockerCode string `json:"blocker_code"`
	Locale      string `json:"locale,omitempty"`
	FieldPath   string `json:"field_path,omitempty"`
}

type BackfillVariant struct {
	ID                   string            `json:"id"`
	FamilyID             string            `json:"family_id"`
	TenantID             string            `json:"tenant_id,omitempty"`
	OrgID                string            `json:"org_id,omitempty"`
	Locale               string            `json:"locale"`
	Status               string            `json:"status"`
	IsSource             bool              `json:"is_source"`
	SourceHashAtLastSync string            `json:"source_hash_at_last_sync,omitempty"`
	Fields               map[string]string `json:"fields,omitempty"`
	Metadata             map[string]any    `json:"metadata,omitempty"`
	SourceRecordID       string            `json:"source_record_id"`
	TranslationGroupID   string            `json:"translation_group_id,omitempty"`
	CreatedAt            time.Time         `json:"created_at"`
	UpdatedAt            time.Time         `json:"updated_at"`
}

type BackfillAssignment struct {
	ID           string `json:"id"`
	FamilyID     string `json:"family_id"`
	VariantID    string `json:"variant_id,omitempty"`
	TenantID     string `json:"tenant_id,omitempty"`
	OrgID        string `json:"org_id,omitempty"`
	SourceLocale string `json:"source_locale"`
	TargetLocale string `json:"target_locale"`
	WorkScope    string `json:"work_scope"`
	Status       string `json:"status"`
	Priority     string `json:"priority"`
}

type BackfillFamily struct {
	ID                         string               `json:"id"`
	TenantID                   string               `json:"tenant_id,omitempty"`
	OrgID                      string               `json:"org_id,omitempty"`
	ContentType                string               `json:"content_type"`
	SourceLocale               string               `json:"source_locale"`
	SourceVariantID            string               `json:"source_variant_id,omitempty"`
	ReadinessState             string               `json:"readiness_state"`
	MissingRequiredLocaleCount int                  `json:"missing_required_locale_count"`
	PendingReviewCount         int                  `json:"pending_review_count"`
	OutdatedLocaleCount        int                  `json:"outdated_locale_count"`
	BlockerCodes               []string             `json:"blocker_codes"`
	Variants                   []BackfillVariant    `json:"variants"`
	Assignments                []BackfillAssignment `json:"assignments"`
	Blockers                   []BackfillBlocker    `json:"blockers"`
}

type BackfillPlan struct {
	Families []BackfillFamily  `json:"families"`
	Warnings []BackfillWarning `json:"warnings,omitempty"`
	Checksum string            `json:"checksum"`
}

type BackfillRunner struct{}

func NewBackfillRunner() *BackfillRunner {
	return &BackfillRunner{}
}

func (r *BackfillRunner) BuildPlan(_ context.Context, input BackfillInput) (BackfillPlan, error) {
	groups := map[string][]BackfillSourceVariant{}
	order := []string{}
	for _, raw := range input.Variants {
		record := normalizeSourceVariant(raw)
		if record.ContentType == "" || record.SourceRecordID == "" || record.Locale == "" {
			return BackfillPlan{}, fmt.Errorf("backfill variant requires content_type, source_record_id, and locale")
		}
		familyID := strings.TrimSpace(record.TranslationGroupID)
		if familyID == "" {
			familyID = DeterministicFamilyID(record.Scope, record.ContentType, record.SourceRecordID)
		}
		if _, ok := groups[familyID]; !ok {
			order = append(order, familyID)
		}
		record.TranslationGroupID = familyID
		groups[familyID] = append(groups[familyID], record)
	}
	sort.Strings(order)

	plan := BackfillPlan{
		Families: make([]BackfillFamily, 0, len(order)),
	}
	for _, familyID := range order {
		records := groups[familyID]
		if len(records) == 0 {
			continue
		}
		family, warnings := buildFamilyPlan(familyID, records, input.Policies[strings.ToLower(records[0].ContentType)])
		plan.Families = append(plan.Families, family)
		plan.Warnings = append(plan.Warnings, warnings...)
	}

	checksum, err := checksumBackfillPlan(plan)
	if err != nil {
		return BackfillPlan{}, err
	}
	plan.Checksum = checksum
	return plan, nil
}

func normalizeSourceVariant(record BackfillSourceVariant) BackfillSourceVariant {
	record.ContentType = strings.TrimSpace(strings.ToLower(record.ContentType))
	record.SourceRecordID = strings.TrimSpace(record.SourceRecordID)
	record.TranslationGroupID = strings.TrimSpace(record.TranslationGroupID)
	record.Locale = strings.TrimSpace(strings.ToLower(record.Locale))
	record.Status = normalizeVariantStatus(record.Status)
	if record.Fields == nil {
		record.Fields = map[string]string{}
	}
	normalizedFields := make(map[string]string, len(record.Fields))
	for key, value := range record.Fields {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		normalizedFields[key] = strings.TrimSpace(value)
	}
	record.Fields = normalizedFields
	record.Metadata = cloneAnyMap(record.Metadata)
	return record
}

func normalizeVariantStatus(status string) string {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case string(translationcore.VariantStatusDraft):
		return string(translationcore.VariantStatusDraft)
	case string(translationcore.VariantStatusInProgress):
		return string(translationcore.VariantStatusInProgress)
	case string(translationcore.VariantStatusInReview):
		return string(translationcore.VariantStatusInReview)
	case string(translationcore.VariantStatusApproved):
		return string(translationcore.VariantStatusApproved)
	case string(translationcore.VariantStatusPublished):
		return string(translationcore.VariantStatusPublished)
	case string(translationcore.VariantStatusArchived):
		return string(translationcore.VariantStatusArchived)
	default:
		return string(translationcore.VariantStatusDraft)
	}
}

func buildFamilyPlan(familyID string, records []BackfillSourceVariant, policy BackfillPolicy) (BackfillFamily, []BackfillWarning) {
	sort.SliceStable(records, func(i, j int) bool {
		if records[i].Locale == records[j].Locale {
			if records[i].UpdatedAt.Equal(records[j].UpdatedAt) {
				return records[i].CreatedAt.Before(records[j].CreatedAt)
			}
			return records[i].UpdatedAt.Before(records[j].UpdatedAt)
		}
		return records[i].Locale < records[j].Locale
	})

	tenantID := strings.TrimSpace(records[0].Scope.TenantID)
	orgID := strings.TrimSpace(records[0].Scope.OrgID)
	contentType := records[0].ContentType
	mergedByLocale := map[string]BackfillSourceVariant{}
	warnings := []BackfillWarning{}

	for _, record := range records {
		existing, ok := mergedByLocale[record.Locale]
		if !ok {
			mergedByLocale[record.Locale] = record
			continue
		}
		merged := existing
		for key, value := range record.Fields {
			if value == "" && strings.TrimSpace(existing.Fields[key]) != "" {
				continue
			}
			merged.Fields[key] = value
		}
		if record.UpdatedAt.After(existing.UpdatedAt) {
			merged.Status = record.Status
			merged.SourceRecordID = record.SourceRecordID
			merged.UpdatedAt = record.UpdatedAt
		}
		mergedByLocale[record.Locale] = merged
		warnings = append(warnings, BackfillWarning{
			Code:     "merged_duplicate_locale",
			FamilyID: familyID,
			Message:  fmt.Sprintf("merged duplicate locale %s for %s", record.Locale, familyID),
		})
	}

	locales := make([]string, 0, len(mergedByLocale))
	for locale := range mergedByLocale {
		locales = append(locales, locale)
	}
	sort.Strings(locales)

	sourceLocale := strings.TrimSpace(strings.ToLower(policy.SourceLocale))
	if sourceLocale == "" {
		sourceLocale = "en"
	}
	sourceRecord, ok := mergedByLocale[sourceLocale]
	if !ok {
		sourceRecord = mergedByLocale[locales[0]]
		sourceLocale = sourceRecord.Locale
		warnings = append(warnings, BackfillWarning{
			Code:     "ambiguous_source_locale",
			FamilyID: familyID,
			Message:  fmt.Sprintf("policy source locale missing for %s, selected %s", familyID, sourceLocale),
		})
	}

	requiredLocales := normalizedStringSlice(policy.RequiredLocales)
	requiredLocaleSet := map[string]struct{}{}
	for _, locale := range requiredLocales {
		requiredLocaleSet[locale] = struct{}{}
	}

	requiredFields := normalizedRequiredFields(policy.RequiredFields)
	family := BackfillFamily{
		ID:           familyID,
		TenantID:     tenantID,
		OrgID:        orgID,
		ContentType:  contentType,
		SourceLocale: sourceLocale,
		Variants:     make([]BackfillVariant, 0, len(locales)),
	}

	for _, locale := range locales {
		record := mergedByLocale[locale]
		variantID := DeterministicVariantID(record.Scope, familyID, locale)
		variant := BackfillVariant{
			ID:                 variantID,
			FamilyID:           familyID,
			TenantID:           tenantID,
			OrgID:              orgID,
			Locale:             locale,
			Status:             record.Status,
			IsSource:           locale == sourceLocale,
			Fields:             record.Fields,
			Metadata:           cloneAnyMap(record.Metadata),
			SourceRecordID:     record.SourceRecordID,
			TranslationGroupID: record.TranslationGroupID,
			CreatedAt:          record.CreatedAt,
			UpdatedAt:          record.UpdatedAt,
		}
		if variant.IsSource {
			family.SourceVariantID = variantID
		}
		family.Variants = append(family.Variants, variant)

		fields := requiredFields[locale]
		for _, fieldPath := range fields {
			if strings.TrimSpace(variant.Fields[fieldPath]) != "" {
				continue
			}
			family.Blockers = append(family.Blockers, BackfillBlocker{
				ID:          DeterministicBlockerID(record.Scope, familyID, string(translationcore.FamilyBlockerMissingField), locale, fieldPath),
				FamilyID:    familyID,
				TenantID:    tenantID,
				OrgID:       orgID,
				BlockerCode: string(translationcore.FamilyBlockerMissingField),
				Locale:      locale,
				FieldPath:   fieldPath,
			})
		}
	}

	for _, locale := range requiredLocales {
		if _, ok := mergedByLocale[locale]; ok {
			continue
		}
		family.Blockers = append(family.Blockers, BackfillBlocker{
			ID:          DeterministicBlockerID(records[0].Scope, familyID, string(translationcore.FamilyBlockerMissingLocale), locale, ""),
			FamilyID:    familyID,
			TenantID:    tenantID,
			OrgID:       orgID,
			BlockerCode: string(translationcore.FamilyBlockerMissingLocale),
			Locale:      locale,
		})
		family.Assignments = append(family.Assignments, BackfillAssignment{
			ID:           DeterministicAssignmentID(records[0].Scope, familyID, locale, translationcore.DefaultWorkScope),
			FamilyID:     familyID,
			TenantID:     tenantID,
			OrgID:        orgID,
			SourceLocale: sourceLocale,
			TargetLocale: locale,
			WorkScope:    translationcore.DefaultWorkScope,
			Status:       string(translationcore.AssignmentStatusOpen),
			Priority:     "normal",
		})
		family.MissingRequiredLocaleCount++
	}

	blockerCodes := map[string]struct{}{}
	for _, blocker := range family.Blockers {
		blockerCodes[blocker.BlockerCode] = struct{}{}
	}
	family.BlockerCodes = make([]string, 0, len(blockerCodes))
	for code := range blockerCodes {
		family.BlockerCodes = append(family.BlockerCodes, code)
	}
	sort.Strings(family.BlockerCodes)
	if len(family.Blockers) > 0 {
		family.ReadinessState = string(translationcore.FamilyReadinessBlocked)
	} else {
		family.ReadinessState = string(translationcore.FamilyReadinessReady)
	}
	return family, warnings
}

func normalizedStringSlice(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	set := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, raw := range values {
		value := strings.TrimSpace(strings.ToLower(raw))
		if value == "" {
			continue
		}
		if _, ok := set[value]; ok {
			continue
		}
		set[value] = struct{}{}
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}

func normalizedRequiredFields(input map[string][]string) map[string][]string {
	if len(input) == 0 {
		return map[string][]string{}
	}
	out := make(map[string][]string, len(input))
	for locale, fields := range input {
		out[strings.TrimSpace(strings.ToLower(locale))] = normalizedStringSlice(fields)
	}
	return out
}

func checksumBackfillPlan(plan BackfillPlan) (string, error) {
	clone := plan
	clone.Checksum = ""
	raw, err := json.Marshal(clone)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}
