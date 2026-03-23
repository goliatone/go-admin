package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	translationcore "github.com/goliatone/go-admin/translations/core"
)

type FamilyPolicy struct {
	ContentType             string              `json:"content_type"`
	Environment             string              `json:"environment,omitempty"`
	SourceLocale            string              `json:"source_locale,omitempty"`
	RequiredLocales         []string            `json:"required_locales,omitempty"`
	RequiredFields          map[string][]string `json:"required_fields,omitempty"`
	ReviewRequired          bool                `json:"review_required"`
	AllowPublishOverride    bool                `json:"allow_publish_override"`
	AssignmentLifecycleMode string              `json:"assignment_lifecycle_mode,omitempty"`
	DefaultWorkScope        string              `json:"default_work_scope,omitempty"`
}

type FamilyVariant struct {
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
	SourceRecordID       string            `json:"source_record_id,omitempty"`
	UpdatedAt            time.Time         `json:"updated_at"`
	CreatedAt            time.Time         `json:"created_at"`
	PublishedAt          *time.Time        `json:"published_at,omitempty"`
}

type FamilyAssignment struct {
	ID           string     `json:"id"`
	FamilyID     string     `json:"family_id"`
	VariantID    string     `json:"variant_id,omitempty"`
	TenantID     string     `json:"tenant_id,omitempty"`
	OrgID        string     `json:"org_id,omitempty"`
	SourceLocale string     `json:"source_locale,omitempty"`
	TargetLocale string     `json:"target_locale"`
	WorkScope    string     `json:"work_scope,omitempty"`
	Status       string     `json:"status"`
	AssigneeID   string     `json:"assignee_id,omitempty"`
	ReviewerID   string     `json:"reviewer_id,omitempty"`
	Priority     string     `json:"priority,omitempty"`
	DueDate      *time.Time `json:"due_date,omitempty"`
	UpdatedAt    time.Time  `json:"updated_at"`
	CreatedAt    time.Time  `json:"created_at"`
}

type FamilyBlocker struct {
	ID          string         `json:"id"`
	FamilyID    string         `json:"family_id"`
	TenantID    string         `json:"tenant_id,omitempty"`
	OrgID       string         `json:"org_id,omitempty"`
	BlockerCode string         `json:"blocker_code"`
	Locale      string         `json:"locale,omitempty"`
	FieldPath   string         `json:"field_path,omitempty"`
	Details     map[string]any `json:"details,omitempty"`
}

type FamilyRecord struct {
	ID                         string             `json:"id"`
	TenantID                   string             `json:"tenant_id,omitempty"`
	OrgID                      string             `json:"org_id,omitempty"`
	ContentType                string             `json:"content_type"`
	SourceLocale               string             `json:"source_locale"`
	SourceVariantID            string             `json:"source_variant_id,omitempty"`
	ReadinessState             string             `json:"readiness_state"`
	MissingRequiredLocaleCount int                `json:"missing_required_locale_count"`
	PendingReviewCount         int                `json:"pending_review_count"`
	OutdatedLocaleCount        int                `json:"outdated_locale_count"`
	BlockerCodes               []string           `json:"blocker_codes,omitempty"`
	Variants                   []FamilyVariant    `json:"variants,omitempty"`
	Assignments                []FamilyAssignment `json:"assignments,omitempty"`
	Blockers                   []FamilyBlocker    `json:"blockers,omitempty"`
	Policy                     FamilyPolicy       `json:"policy"`
	CreatedAt                  time.Time          `json:"created_at"`
	UpdatedAt                  time.Time          `json:"updated_at"`
}

type ListFamiliesInput struct {
	Scope          Scope  `json:"scope"`
	Environment    string `json:"environment"`
	FamilyID       string `json:"family_id"`
	ContentType    string `json:"content_type"`
	ReadinessState string `json:"readiness_state"`
	BlockerCode    string `json:"blocker_code"`
	MissingLocale  string `json:"missing_locale"`
	Page           int    `json:"page"`
	PerPage        int    `json:"per_page"`
}

type ListFamiliesResult struct {
	Items   []FamilyRecord `json:"items"`
	Total   int            `json:"total"`
	Page    int            `json:"page"`
	PerPage int            `json:"per_page"`
}

type GetFamilyInput struct {
	Scope       Scope  `json:"scope"`
	Environment string `json:"environment"`
	FamilyID    string `json:"family_id"`
}

type FamilyPolicyResolver interface {
	ResolvePolicy(context.Context, string, string) (FamilyPolicy, bool, error)
}

type StaticPolicyResolver struct {
	Policies map[string]FamilyPolicy `json:"policies"`
}

func (r StaticPolicyResolver) ResolvePolicy(_ context.Context, contentType, environment string) (FamilyPolicy, bool, error) {
	key := strings.ToLower(strings.TrimSpace(contentType))
	policy, ok := r.Policies[key]
	if !ok {
		return FamilyPolicy{}, false, nil
	}
	if policy.Environment == "" {
		policy.Environment = strings.TrimSpace(environment)
	}
	return normalizeFamilyPolicy(policy), true, nil
}

type PolicyService struct {
	Resolver FamilyPolicyResolver `json:"resolver"`
}

func (s PolicyService) ResolvePolicy(ctx context.Context, contentType, environment string) (FamilyPolicy, bool, error) {
	if s.Resolver == nil {
		return FamilyPolicy{}, false, nil
	}
	policy, found, err := s.Resolver.ResolvePolicy(ctx, contentType, environment)
	if err != nil || !found {
		return FamilyPolicy{}, found, err
	}
	return normalizeFamilyPolicy(policy), true, nil
}

type FamilyStore interface {
	Families(context.Context) ([]FamilyRecord, error)
	Family(context.Context, string) (FamilyRecord, bool, error)
	SaveFamily(context.Context, FamilyRecord) error
}

type InMemoryFamilyStore struct {
	mu       sync.RWMutex
	families map[string]FamilyRecord
}

func NewInMemoryFamilyStore() *InMemoryFamilyStore {
	return &InMemoryFamilyStore{
		families: map[string]FamilyRecord{},
	}
}

func (s *InMemoryFamilyStore) Families(_ context.Context) ([]FamilyRecord, error) {
	if s == nil {
		return nil, fmt.Errorf("family store not configured")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]FamilyRecord, 0, len(s.families))
	for _, family := range s.families {
		out = append(out, cloneFamilyRecord(family))
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := strings.TrimSpace(out[i].ID)
		right := strings.TrimSpace(out[j].ID)
		if left == right {
			return out[i].UpdatedAt.Before(out[j].UpdatedAt)
		}
		return left < right
	})
	return out, nil
}

func (s *InMemoryFamilyStore) Family(_ context.Context, id string) (FamilyRecord, bool, error) {
	if s == nil {
		return FamilyRecord{}, false, fmt.Errorf("family store not configured")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return FamilyRecord{}, false, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	family, ok := s.families[id]
	if !ok {
		return FamilyRecord{}, false, nil
	}
	return cloneFamilyRecord(family), true, nil
}

func (s *InMemoryFamilyStore) SaveFamily(_ context.Context, family FamilyRecord) error {
	if s == nil {
		return fmt.Errorf("family store not configured")
	}
	family.ID = strings.TrimSpace(family.ID)
	if family.ID == "" {
		return fmt.Errorf("family id is required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.families[family.ID] = cloneFamilyRecord(family)
	return nil
}

type FamilyService struct {
	Store    FamilyStore   `json:"store"`
	Policies PolicyService `json:"policies"`
	Clock    Clock         `json:"clock"`
}

func (s *FamilyService) Recompute(ctx context.Context, familyID, environment string) (FamilyRecord, error) {
	if s == nil || s.Store == nil {
		return FamilyRecord{}, fmt.Errorf("family service not configured")
	}
	family, ok, err := s.Store.Family(ctx, familyID)
	if err != nil {
		return FamilyRecord{}, err
	}
	if !ok {
		return FamilyRecord{}, fmt.Errorf("family %s not found", strings.TrimSpace(familyID))
	}
	recomputed, err := s.recomputeFamily(ctx, family, environment)
	if err != nil {
		return FamilyRecord{}, err
	}
	if err := s.Store.SaveFamily(ctx, recomputed); err != nil {
		return FamilyRecord{}, err
	}
	return recomputed, nil
}

func (s *FamilyService) RecomputeAll(ctx context.Context, environment string) ([]FamilyRecord, error) {
	if s == nil || s.Store == nil {
		return nil, fmt.Errorf("family service not configured")
	}
	families, err := s.Store.Families(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]FamilyRecord, 0, len(families))
	for _, family := range families {
		recomputed, recomputeErr := s.recomputeFamily(ctx, family, environment)
		if recomputeErr != nil {
			return nil, recomputeErr
		}
		if saveErr := s.Store.SaveFamily(ctx, recomputed); saveErr != nil {
			return nil, saveErr
		}
		out = append(out, recomputed)
	}
	return out, nil
}

func (s *FamilyService) List(ctx context.Context, input ListFamiliesInput) (ListFamiliesResult, error) {
	if s == nil || s.Store == nil {
		return ListFamiliesResult{}, fmt.Errorf("family service not configured")
	}
	page := clampPositive(input.Page, 1)
	perPage := min(clampPositive(input.PerPage, 50), 200)
	families, err := s.RecomputeAll(ctx, input.Environment)
	if err != nil {
		return ListFamiliesResult{}, err
	}
	filtered := make([]FamilyRecord, 0, len(families))
	for _, family := range families {
		if !familyMatchesScope(family, input.Scope) {
			continue
		}
		if input.FamilyID != "" && !strings.EqualFold(strings.TrimSpace(family.ID), strings.TrimSpace(input.FamilyID)) {
			continue
		}
		if input.ContentType != "" && !strings.EqualFold(strings.TrimSpace(family.ContentType), strings.TrimSpace(input.ContentType)) {
			continue
		}
		if input.ReadinessState != "" && !strings.EqualFold(strings.TrimSpace(family.ReadinessState), strings.TrimSpace(input.ReadinessState)) {
			continue
		}
		if input.BlockerCode != "" && !familyHasBlockerCode(family, input.BlockerCode) {
			continue
		}
		if input.MissingLocale != "" && !familyMissingLocale(family, input.MissingLocale) {
			continue
		}
		filtered = append(filtered, family)
	}
	sort.SliceStable(filtered, func(i, j int) bool {
		left := filtered[i]
		right := filtered[j]
		if left.UpdatedAt.Equal(right.UpdatedAt) {
			return left.ID < right.ID
		}
		return left.UpdatedAt.After(right.UpdatedAt)
	})
	total := len(filtered)
	start := min((page-1)*perPage, total)
	end := min(start+perPage, total)
	items := filtered[start:end]
	return ListFamiliesResult{
		Items:   cloneFamilies(items),
		Total:   total,
		Page:    page,
		PerPage: perPage,
	}, nil
}

func (s *FamilyService) Detail(ctx context.Context, input GetFamilyInput) (FamilyRecord, bool, error) {
	if s == nil || s.Store == nil {
		return FamilyRecord{}, false, fmt.Errorf("family service not configured")
	}
	family, ok, err := s.Store.Family(ctx, input.FamilyID)
	if err != nil || !ok {
		return FamilyRecord{}, ok, err
	}
	if !familyMatchesScope(family, input.Scope) {
		return FamilyRecord{}, false, nil
	}
	recomputed, err := s.recomputeFamily(ctx, family, input.Environment)
	if err != nil {
		return FamilyRecord{}, false, err
	}
	if err := s.Store.SaveFamily(ctx, recomputed); err != nil {
		return FamilyRecord{}, false, err
	}
	return recomputed, true, nil
}

func (s *FamilyService) recomputeFamily(ctx context.Context, family FamilyRecord, environment string) (FamilyRecord, error) {
	family = cloneFamilyRecord(family)
	family.ContentType = strings.TrimSpace(strings.ToLower(family.ContentType))
	policy, found, err := s.Policies.ResolvePolicy(ctx, family.ContentType, environment)
	if err != nil {
		return FamilyRecord{}, err
	}
	if found {
		family.Policy = policy
	}
	source := selectSourceVariant(family, policy)
	if source.Locale != "" {
		family.SourceLocale = source.Locale
		family.SourceVariantID = source.ID
	}
	for i := range family.Variants {
		family.Variants[i].Locale = strings.TrimSpace(strings.ToLower(family.Variants[i].Locale))
		family.Variants[i].Status = normalizeVariantStatus(family.Variants[i].Status)
		family.Variants[i].IsSource = strings.EqualFold(strings.TrimSpace(family.Variants[i].ID), strings.TrimSpace(family.SourceVariantID))
	}
	blockers := make([]FamilyBlocker, 0)
	if !found {
		blockers = append(blockers, FamilyBlocker{
			ID:          DeterministicBlockerID(Scope{TenantID: family.TenantID, OrgID: family.OrgID}, family.ID, string(translationcore.FamilyBlockerPolicyDenied), "", ""),
			FamilyID:    family.ID,
			TenantID:    family.TenantID,
			OrgID:       family.OrgID,
			BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
			Details: map[string]any{
				"content_type": family.ContentType,
				"environment":  strings.TrimSpace(environment),
			},
		})
	} else {
		blockers = append(blockers, recomputeLocaleBlockers(family, policy, source)...)
		blockers = append(blockers, recomputePendingReviewBlockers(family, policy)...)
		blockers = append(blockers, recomputeOutdatedSourceBlockers(family, source)...)
	}
	sortFamilyBlockers(blockers)
	family.Blockers = blockers
	family.BlockerCodes = familyBlockerCodes(blockers)
	family.MissingRequiredLocaleCount = countBlockers(blockers, string(translationcore.FamilyBlockerMissingLocale))
	family.PendingReviewCount = countBlockers(blockers, string(translationcore.FamilyBlockerPendingReview))
	family.OutdatedLocaleCount = countBlockers(blockers, string(translationcore.FamilyBlockerOutdatedSource))
	if len(blockers) == 0 {
		family.ReadinessState = string(translationcore.FamilyReadinessReady)
	} else {
		family.ReadinessState = string(translationcore.FamilyReadinessBlocked)
	}
	family.UpdatedAt = familyUpdatedAt(family, s.now())
	return family, nil
}

func normalizeFamilyPolicy(policy FamilyPolicy) FamilyPolicy {
	policy.ContentType = strings.TrimSpace(strings.ToLower(policy.ContentType))
	policy.Environment = strings.TrimSpace(policy.Environment)
	policy.SourceLocale = strings.TrimSpace(strings.ToLower(policy.SourceLocale))
	if policy.SourceLocale == "" {
		policy.SourceLocale = "en"
	}
	policy.RequiredLocales = normalizedStringSlice(policy.RequiredLocales)
	if len(policy.RequiredLocales) == 0 {
		policy.RequiredLocales = normalizedStringSlice(requiredLocalesFromRequiredFields(policy.RequiredFields))
	}
	policy.RequiredFields = normalizedRequiredFields(policy.RequiredFields)
	policy.DefaultWorkScope = normalizeWorkScope(policy.DefaultWorkScope)
	return policy
}

func selectSourceVariant(family FamilyRecord, policy FamilyPolicy) FamilyVariant {
	locales := make([]FamilyVariant, 0, len(family.Variants))
	for _, variant := range family.Variants {
		locales = append(locales, variant)
	}
	sort.SliceStable(locales, func(i, j int) bool {
		left := locales[i]
		right := locales[j]
		if left.Locale == right.Locale {
			if left.CreatedAt.Equal(right.CreatedAt) {
				return left.ID < right.ID
			}
			return left.CreatedAt.Before(right.CreatedAt)
		}
		return left.Locale < right.Locale
	})
	target := strings.TrimSpace(strings.ToLower(policy.SourceLocale))
	if target == "" {
		target = strings.TrimSpace(strings.ToLower(family.SourceLocale))
	}
	for _, variant := range locales {
		if strings.EqualFold(strings.TrimSpace(variant.Locale), target) {
			return variant
		}
	}
	for _, variant := range locales {
		if variant.IsSource {
			return variant
		}
	}
	if len(locales) > 0 {
		return locales[0]
	}
	return FamilyVariant{}
}

func recomputeLocaleBlockers(family FamilyRecord, policy FamilyPolicy, source FamilyVariant) []FamilyBlocker {
	scope := Scope{TenantID: family.TenantID, OrgID: family.OrgID}
	blockers := []FamilyBlocker{}
	variantsByLocale := map[string]FamilyVariant{}
	existingMissingLocaleBlockers := map[string]FamilyBlocker{}
	for _, variant := range family.Variants {
		variantsByLocale[strings.TrimSpace(strings.ToLower(variant.Locale))] = variant
	}
	for _, blocker := range family.Blockers {
		if !strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerMissingLocale)) {
			continue
		}
		locale := strings.TrimSpace(strings.ToLower(blocker.Locale))
		if locale == "" {
			continue
		}
		existingMissingLocaleBlockers[locale] = blocker
	}
	requiredLocales := normalizedStringSlice(policy.RequiredLocales)
	if len(requiredLocales) == 0 && source.Locale != "" {
		requiredLocales = []string{source.Locale}
	}
	for _, locale := range requiredLocales {
		variant, ok := variantsByLocale[locale]
		if !ok {
			blocker := FamilyBlocker{
				ID:          DeterministicBlockerID(scope, family.ID, string(translationcore.FamilyBlockerMissingLocale), locale, ""),
				FamilyID:    family.ID,
				TenantID:    family.TenantID,
				OrgID:       family.OrgID,
				BlockerCode: string(translationcore.FamilyBlockerMissingLocale),
				Locale:      locale,
			}
			if existing, ok := existingMissingLocaleBlockers[locale]; ok && len(existing.Details) > 0 {
				blocker.Details = primitives.CloneAnyMapNilOnEmpty(existing.Details)
			}
			blockers = append(blockers, blocker)
			continue
		}
		for _, field := range normalizedStringSlice(policy.RequiredFields[locale]) {
			if strings.TrimSpace(variant.Fields[field]) != "" {
				continue
			}
			blockers = append(blockers, FamilyBlocker{
				ID:          DeterministicBlockerID(scope, family.ID, string(translationcore.FamilyBlockerMissingField), locale, field),
				FamilyID:    family.ID,
				TenantID:    family.TenantID,
				OrgID:       family.OrgID,
				BlockerCode: string(translationcore.FamilyBlockerMissingField),
				Locale:      locale,
				FieldPath:   field,
			})
		}
	}
	return blockers
}

func recomputePendingReviewBlockers(family FamilyRecord, policy FamilyPolicy) []FamilyBlocker {
	if !policy.ReviewRequired {
		return nil
	}
	scope := Scope{TenantID: family.TenantID, OrgID: family.OrgID}
	requiredLocales := normalizedStringSlice(policy.RequiredLocales)
	blockers := []FamilyBlocker{}
	for _, variant := range family.Variants {
		locale := strings.TrimSpace(strings.ToLower(variant.Locale))
		if locale == "" || locale == strings.TrimSpace(strings.ToLower(family.SourceLocale)) {
			continue
		}
		if len(requiredLocales) > 0 && !containsString(requiredLocales, locale) {
			continue
		}
		if variantReadyForReview(variant.Status) {
			continue
		}
		blockers = append(blockers, FamilyBlocker{
			ID:          DeterministicBlockerID(scope, family.ID, string(translationcore.FamilyBlockerPendingReview), locale, ""),
			FamilyID:    family.ID,
			TenantID:    family.TenantID,
			OrgID:       family.OrgID,
			BlockerCode: string(translationcore.FamilyBlockerPendingReview),
			Locale:      locale,
			Details: map[string]any{
				"status": strings.TrimSpace(strings.ToLower(variant.Status)),
			},
		})
	}
	return blockers
}

func recomputeOutdatedSourceBlockers(family FamilyRecord, source FamilyVariant) []FamilyBlocker {
	sourceHash := hashVariantFields(source.Fields)
	if sourceHash == "" {
		return nil
	}
	scope := Scope{TenantID: family.TenantID, OrgID: family.OrgID}
	blockers := []FamilyBlocker{}
	for _, variant := range family.Variants {
		locale := strings.TrimSpace(strings.ToLower(variant.Locale))
		if locale == "" || locale == strings.TrimSpace(strings.ToLower(source.Locale)) {
			continue
		}
		lastSync := strings.TrimSpace(variant.SourceHashAtLastSync)
		if lastSync == "" || strings.EqualFold(lastSync, sourceHash) {
			continue
		}
		blockers = append(blockers, FamilyBlocker{
			ID:          DeterministicBlockerID(scope, family.ID, string(translationcore.FamilyBlockerOutdatedSource), locale, ""),
			FamilyID:    family.ID,
			TenantID:    family.TenantID,
			OrgID:       family.OrgID,
			BlockerCode: string(translationcore.FamilyBlockerOutdatedSource),
			Locale:      locale,
			Details: map[string]any{
				"current_source_hash": sourceHash,
				"last_sync_hash":      lastSync,
			},
		})
	}
	return blockers
}

func variantReadyForReview(status string) bool {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case string(translationcore.VariantStatusApproved), string(translationcore.VariantStatusPublished):
		return true
	default:
		return false
	}
}

func sortFamilyBlockers(blockers []FamilyBlocker) {
	sort.SliceStable(blockers, func(i, j int) bool {
		left := blockers[i]
		right := blockers[j]
		leftRank := blockerRank(left.BlockerCode)
		rightRank := blockerRank(right.BlockerCode)
		if leftRank != rightRank {
			return leftRank < rightRank
		}
		if left.Locale != right.Locale {
			return left.Locale < right.Locale
		}
		if left.FieldPath != right.FieldPath {
			return left.FieldPath < right.FieldPath
		}
		return left.ID < right.ID
	})
}

func blockerRank(code string) int {
	switch strings.TrimSpace(strings.ToLower(code)) {
	case string(translationcore.FamilyBlockerMissingLocale):
		return 0
	case string(translationcore.FamilyBlockerMissingField):
		return 1
	case string(translationcore.FamilyBlockerPendingReview):
		return 2
	case string(translationcore.FamilyBlockerOutdatedSource):
		return 3
	case string(translationcore.FamilyBlockerPolicyDenied):
		return 4
	default:
		return 99
	}
}

func familyBlockerCodes(blockers []FamilyBlocker) []string {
	if len(blockers) == 0 {
		return nil
	}
	set := map[string]struct{}{}
	out := make([]string, 0, len(blockers))
	for _, blocker := range blockers {
		code := strings.TrimSpace(strings.ToLower(blocker.BlockerCode))
		if code == "" {
			continue
		}
		if _, ok := set[code]; ok {
			continue
		}
		set[code] = struct{}{}
		out = append(out, code)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return blockerRank(out[i]) < blockerRank(out[j])
	})
	return out
}

func countBlockers(blockers []FamilyBlocker, code string) int {
	code = strings.TrimSpace(strings.ToLower(code))
	count := 0
	for _, blocker := range blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), code) {
			count++
		}
	}
	return count
}

func familyMatchesScope(family FamilyRecord, scope Scope) bool {
	tenant := strings.TrimSpace(scope.TenantID)
	org := strings.TrimSpace(scope.OrgID)
	if tenant != "" && !strings.EqualFold(strings.TrimSpace(family.TenantID), tenant) {
		return false
	}
	if tenant == "" && strings.TrimSpace(family.TenantID) != "" {
		return false
	}
	if org != "" && !strings.EqualFold(strings.TrimSpace(family.OrgID), org) {
		return false
	}
	if org == "" && strings.TrimSpace(family.OrgID) != "" {
		return false
	}
	return true
}

func familyHasBlockerCode(family FamilyRecord, code string) bool {
	code = strings.TrimSpace(strings.ToLower(code))
	if code == "" {
		return true
	}
	for _, blocker := range family.Blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), code) {
			return true
		}
	}
	return false
}

func familyMissingLocale(family FamilyRecord, locale string) bool {
	locale = strings.TrimSpace(strings.ToLower(locale))
	if locale == "" {
		return true
	}
	for _, blocker := range family.Blockers {
		if !strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerMissingLocale)) {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(blocker.Locale), locale) {
			return true
		}
	}
	return false
}

func familyUpdatedAt(family FamilyRecord, fallback time.Time) time.Time {
	latest := family.UpdatedAt
	for _, variant := range family.Variants {
		if variant.UpdatedAt.After(latest) {
			latest = variant.UpdatedAt
		}
	}
	for _, assignment := range family.Assignments {
		if assignment.UpdatedAt.After(latest) {
			latest = assignment.UpdatedAt
		}
	}
	if latest.IsZero() {
		latest = fallback
	}
	return latest
}

func requiredLocalesFromRequiredFields(fields map[string][]string) []string {
	if len(fields) == 0 {
		return nil
	}
	locales := make([]string, 0, len(fields))
	for locale := range fields {
		locales = append(locales, locale)
	}
	return locales
}

func hashVariantFields(fields map[string]string) string {
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

func cloneFamilyRecord(family FamilyRecord) FamilyRecord {
	family.BlockerCodes = append([]string{}, family.BlockerCodes...)
	family.Variants = cloneFamilyVariants(family.Variants)
	family.Assignments = cloneFamilyAssignments(family.Assignments)
	family.Blockers = cloneFamilyBlockers(family.Blockers)
	family.Policy = normalizeFamilyPolicy(family.Policy)
	return family
}

func cloneFamilyVariants(items []FamilyVariant) []FamilyVariant {
	if len(items) == 0 {
		return nil
	}
	out := make([]FamilyVariant, 0, len(items))
	for _, item := range items {
		clone := item
		clone.Fields = primitives.CloneStringMapNilOnEmpty(item.Fields)
		if len(item.Metadata) > 0 {
			clone.Metadata = primitives.CloneAnyMapNilOnEmpty(item.Metadata)
		}
		out = append(out, clone)
	}
	return out
}

func cloneFamilyAssignments(items []FamilyAssignment) []FamilyAssignment {
	if len(items) == 0 {
		return nil
	}
	out := make([]FamilyAssignment, 0, len(items))
	for _, item := range items {
		out = append(out, item)
	}
	return out
}

func cloneFamilyBlockers(items []FamilyBlocker) []FamilyBlocker {
	if len(items) == 0 {
		return nil
	}
	out := make([]FamilyBlocker, 0, len(items))
	for _, item := range items {
		clone := item
		if len(item.Details) > 0 {
			clone.Details = primitives.CloneAnyMapNilOnEmpty(item.Details)
		}
		out = append(out, clone)
	}
	return out
}

func cloneFamilies(items []FamilyRecord) []FamilyRecord {
	if len(items) == 0 {
		return nil
	}
	out := make([]FamilyRecord, 0, len(items))
	for _, item := range items {
		out = append(out, cloneFamilyRecord(item))
	}
	return out
}

func normalizeWorkScope(scope string) string {
	scope = strings.TrimSpace(scope)
	if scope == "" {
		return translationcore.DefaultWorkScope
	}
	return scope
}

func containsString(values []string, candidate string) bool {
	candidate = strings.TrimSpace(strings.ToLower(candidate))
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), candidate) {
			return true
		}
	}
	return false
}

func clampPositive(value, fallback int) int {
	if value <= 0 {
		return fallback
	}
	return value
}

func (s *FamilyService) now() time.Time {
	if s != nil && s.Clock != nil {
		return time.Unix(s.Clock.NowUnix(), 0).UTC()
	}
	return time.Now().UTC()
}
