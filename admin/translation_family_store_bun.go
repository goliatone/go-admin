package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	translationservices "github.com/goliatone/go-admin/translations/services"
	"github.com/uptrace/bun"
)

type bunTranslationFamilyRecord struct {
	bun.BaseModel `bun:"table:content_families,alias:cf"`

	FamilyID                   string         `bun:"family_id,pk" json:"family_id"`
	TenantID                   string         `bun:"tenant_id" json:"tenant_id"`
	OrgID                      string         `bun:"org_id" json:"org_id"`
	ContentType                string         `bun:"content_type" json:"content_type"`
	SourceLocale               string         `bun:"source_locale" json:"source_locale"`
	SourceVariantID            sql.NullString `bun:"source_variant_id" json:"source_variant_id"`
	ReadinessState             string         `bun:"readiness_state" json:"readiness_state"`
	BlockerCodesJSON           string         `bun:"blocker_codes_json" json:"blocker_codes_json"`
	MissingRequiredLocaleCount int            `bun:"missing_required_locale_count" json:"missing_required_locale_count"`
	PendingReviewCount         int            `bun:"pending_review_count" json:"pending_review_count"`
	OutdatedLocaleCount        int            `bun:"outdated_locale_count" json:"outdated_locale_count"`
	CreatedAt                  time.Time      `bun:"created_at" json:"created_at"`
	UpdatedAt                  time.Time      `bun:"updated_at" json:"updated_at"`
}

type bunTranslationLocaleVariantRecord struct {
	bun.BaseModel `bun:"table:locale_variants,alias:lv"`

	VariantID            string     `bun:"variant_id,pk" json:"variant_id"`
	TenantID             string     `bun:"tenant_id" json:"tenant_id"`
	OrgID                string     `bun:"org_id" json:"org_id"`
	FamilyID             string     `bun:"family_id" json:"family_id"`
	Locale               string     `bun:"locale" json:"locale"`
	Status               string     `bun:"status" json:"status"`
	IsSource             bool       `bun:"is_source" json:"is_source"`
	SourceHashAtLastSync string     `bun:"source_hash_at_last_sync" json:"source_hash_at_last_sync"`
	FieldsJSON           string     `bun:"fields_json" json:"fields_json"`
	RowVersion           int64      `bun:"row_version" json:"row_version"`
	SourceRecordID       string     `bun:"source_record_id" json:"source_record_id"`
	CreatedAt            time.Time  `bun:"created_at" json:"created_at"`
	UpdatedAt            time.Time  `bun:"updated_at" json:"updated_at"`
	PublishedAt          *time.Time `bun:"published_at,nullzero" json:"published_at"`
}

type bunTranslationFamilyBlockerRecord struct {
	bun.BaseModel `bun:"table:family_blockers,alias:fb"`

	FamilyID    string    `bun:"family_id" json:"family_id"`
	TenantID    string    `bun:"tenant_id" json:"tenant_id"`
	OrgID       string    `bun:"org_id" json:"org_id"`
	BlockerCode string    `bun:"blocker_code" json:"blocker_code"`
	Locale      string    `bun:"locale" json:"locale"`
	FieldPath   string    `bun:"field_path" json:"field_path"`
	DetailsJSON string    `bun:"details_json" json:"details_json"`
	CreatedAt   time.Time `bun:"created_at" json:"created_at"`
	UpdatedAt   time.Time `bun:"updated_at" json:"updated_at"`
}

type bunFamilyListVariantProjection struct {
	FamilyID       string `bun:"family_id"`
	VariantID      string `bun:"variant_id"`
	TenantID       string `bun:"tenant_id"`
	OrgID          string `bun:"org_id"`
	Locale         string `bun:"locale"`
	Status         string `bun:"status"`
	IsSource       bool   `bun:"is_source"`
	SourceRecordID string `bun:"source_record_id"`
	FieldsJSON     string `bun:"fields_json"`
}

type bunFamilyListBlockerProjection struct {
	FamilyID    string `bun:"family_id"`
	BlockerCode string `bun:"blocker_code"`
	Locale      string `bun:"locale"`
}

type BunTranslationFamilyStore struct {
	db *bun.DB
}

type TranslationDashboardFamilyMetricsStore interface {
	TranslationDashboardFamilyMetrics(context.Context, TranslationDashboardFamilyMetricsInput) (TranslationDashboardFamilyMetrics, error)
}

type TranslationDashboardFamilyMetricsInput struct {
	TenantID     string
	OrgID        string
	BlockedLimit int
}

type TranslationDashboardFamilyMetrics struct {
	BlockedFamilies         int
	MissingRequiredFamilies int
	TopBlocked              []translationservices.FamilyRecord
}

func NewBunTranslationFamilyStore(db *bun.DB) *BunTranslationFamilyStore {
	if db == nil {
		return nil
	}
	return &BunTranslationFamilyStore{db: db}
}

func (s *BunTranslationFamilyStore) Families(ctx context.Context) ([]translationservices.FamilyRecord, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("family store not configured")
	}
	familyRows := []bunTranslationFamilyRecord{}
	if err := s.db.NewSelect().Model(&familyRows).Scan(ctx); err != nil {
		return nil, err
	}
	return s.familiesFromRows(ctx, familyRows)
}

func (s *BunTranslationFamilyStore) ListFamiliesQuery(ctx context.Context, input translationservices.ListFamiliesInput) (translationservices.ListFamiliesResult, error) {
	if s == nil || s.db == nil {
		return translationservices.ListFamiliesResult{}, errors.New("family store not configured")
	}
	page := input.Page
	if page <= 0 {
		page = 1
	}
	perPage := input.PerPage
	if perPage <= 0 {
		perPage = 50
	}
	if perPage > 200 {
		perPage = 200
	}
	countQuery := s.db.NewSelect().Model((*bunTranslationFamilyRecord)(nil))
	applyBunFamilyListFilters(countQuery, input)
	total, err := countQuery.Count(ctx)
	if err != nil {
		return translationservices.ListFamiliesResult{}, err
	}
	rows := []bunTranslationFamilyRecord{}
	query := s.db.NewSelect().Model(&rows)
	applyBunFamilyListFilters(query, input)
	query.OrderExpr("updated_at DESC").OrderExpr("family_id ASC").Limit(perPage).Offset((page - 1) * perPage)
	if err := query.Scan(ctx); err != nil {
		return translationservices.ListFamiliesResult{}, err
	}
	families, err := s.familyListProjectionRowsFromRows(ctx, rows)
	if err != nil {
		return translationservices.ListFamiliesResult{}, err
	}
	return translationservices.ListFamiliesResult{
		Items:   families,
		Total:   total,
		Page:    page,
		PerPage: perPage,
	}, nil
}

func applyBunFamilyListFilters(query *bun.SelectQuery, input translationservices.ListFamiliesInput) {
	if query == nil {
		return
	}
	tenantID := strings.TrimSpace(input.Scope.TenantID)
	orgID := strings.TrimSpace(input.Scope.OrgID)
	if tenantID != "" {
		query.Where("tenant_id = ?", tenantID)
	} else {
		query.Where("(tenant_id IS NULL OR tenant_id = '')")
	}
	if orgID != "" {
		query.Where("org_id = ?", orgID)
	} else {
		query.Where("(org_id IS NULL OR org_id = '')")
	}
	if familyID := strings.TrimSpace(input.FamilyID); familyID != "" {
		query.Where("family_id = ?", familyID)
	}
	if contentType := strings.TrimSpace(strings.ToLower(input.ContentType)); contentType != "" {
		query.Where("LOWER(content_type) = ?", contentType)
	}
	if readiness := strings.TrimSpace(strings.ToLower(input.ReadinessState)); readiness != "" {
		query.Where("LOWER(readiness_state) = ?", readiness)
	}
	if blockerCode := strings.TrimSpace(strings.ToLower(input.BlockerCode)); blockerCode != "" {
		query.Where("EXISTS (SELECT 1 FROM family_blockers fb WHERE fb.family_id = cf.family_id AND LOWER(fb.blocker_code) = ?)", blockerCode)
	}
	if missingLocale := strings.TrimSpace(strings.ToLower(input.MissingLocale)); missingLocale != "" {
		query.Where("EXISTS (SELECT 1 FROM family_blockers fb WHERE fb.family_id = cf.family_id AND LOWER(fb.blocker_code) = 'missing_locale' AND LOWER(fb.locale) = ?)", missingLocale)
	}
}

func (s *BunTranslationFamilyStore) familyListRowsFromRows(ctx context.Context, familyRows []bunTranslationFamilyRecord) ([]translationservices.FamilyRecord, error) {
	if len(familyRows) == 0 {
		return nil, nil
	}
	familyIDs := make([]string, 0, len(familyRows))
	for _, row := range familyRows {
		familyIDs = append(familyIDs, row.FamilyID)
	}
	variantRows := []bunTranslationLocaleVariantRecord{}
	if err := s.db.NewSelect().
		Model(&variantRows).
		Where("family_id IN (?)", bun.List(familyIDs)).
		Scan(ctx); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	blockerRows := []bunTranslationFamilyBlockerRecord{}
	if err := s.db.NewSelect().
		Model(&blockerRows).
		Where("family_id IN (?)", bun.List(familyIDs)).
		Scan(ctx); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	variantsByFamily, err := bunFamilyVariantsByFamily(variantRows)
	if err != nil {
		return nil, err
	}
	blockersByFamily, err := bunFamilyBlockersByFamily(blockerRows)
	if err != nil {
		return nil, err
	}
	out := make([]translationservices.FamilyRecord, 0, len(familyRows))
	for _, row := range familyRows {
		family, err := familyModelFromBunRecord(row)
		if err != nil {
			return nil, err
		}
		family.Variants = variantsByFamily[row.FamilyID]
		family.Blockers = blockersByFamily[row.FamilyID]
		out = append(out, family)
	}
	return out, nil
}

func (s *BunTranslationFamilyStore) familyListProjectionRowsFromRows(ctx context.Context, familyRows []bunTranslationFamilyRecord) ([]translationservices.FamilyRecord, error) {
	if len(familyRows) == 0 {
		return nil, nil
	}
	familyIDs := make([]string, 0, len(familyRows))
	for _, row := range familyRows {
		familyIDs = append(familyIDs, row.FamilyID)
	}
	variantRows := []bunFamilyListVariantProjection{}
	if err := s.db.NewSelect().
		Table("locale_variants").
		Column("family_id", "variant_id", "tenant_id", "org_id", "locale", "status", "is_source", "source_record_id", "fields_json").
		Where("family_id IN (?)", bun.List(familyIDs)).
		OrderExpr("family_id ASC").
		OrderExpr("is_source DESC").
		OrderExpr("locale ASC").
		Scan(ctx, &variantRows); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	blockerRows := []bunFamilyListBlockerProjection{}
	if err := s.db.NewSelect().
		Table("family_blockers").
		Column("family_id", "blocker_code", "locale").
		Where("family_id IN (?)", bun.List(familyIDs)).
		OrderExpr("family_id ASC").
		OrderExpr("blocker_code ASC").
		OrderExpr("locale ASC").
		Scan(ctx, &blockerRows); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	variantsByFamily, err := bunFamilyListVariantsByFamily(variantRows)
	if err != nil {
		return nil, err
	}
	blockersByFamily := bunFamilyListBlockersByFamily(blockerRows)
	out := make([]translationservices.FamilyRecord, 0, len(familyRows))
	for _, row := range familyRows {
		family, err := familyModelFromBunRecord(row)
		if err != nil {
			return nil, err
		}
		family.Variants = variantsByFamily[row.FamilyID]
		family.Blockers = blockersByFamily[row.FamilyID]
		out = append(out, family)
	}
	return out, nil
}

func bunFamilyListVariantsByFamily(rows []bunFamilyListVariantProjection) (map[string][]translationservices.FamilyVariant, error) {
	out := map[string][]translationservices.FamilyVariant{}
	for _, row := range rows {
		fields := map[string]string{}
		if strings.TrimSpace(row.FieldsJSON) != "" {
			if err := json.Unmarshal([]byte(row.FieldsJSON), &fields); err != nil {
				return nil, err
			}
		}
		out[row.FamilyID] = append(out[row.FamilyID], translationservices.FamilyVariant{
			ID:             strings.TrimSpace(row.VariantID),
			FamilyID:       strings.TrimSpace(row.FamilyID),
			TenantID:       strings.TrimSpace(row.TenantID),
			OrgID:          strings.TrimSpace(row.OrgID),
			Locale:         strings.TrimSpace(strings.ToLower(row.Locale)),
			Status:         strings.TrimSpace(strings.ToLower(row.Status)),
			IsSource:       row.IsSource,
			SourceRecordID: strings.TrimSpace(row.SourceRecordID),
			Fields:         fields,
		})
	}
	return out, nil
}

func bunFamilyListBlockersByFamily(rows []bunFamilyListBlockerProjection) map[string][]translationservices.FamilyBlocker {
	out := map[string][]translationservices.FamilyBlocker{}
	for _, row := range rows {
		code := strings.TrimSpace(strings.ToLower(row.BlockerCode))
		locale := strings.TrimSpace(strings.ToLower(row.Locale))
		out[row.FamilyID] = append(out[row.FamilyID], translationservices.FamilyBlocker{
			ID:          strings.TrimSpace(row.FamilyID + ":" + code + ":" + locale),
			FamilyID:    strings.TrimSpace(row.FamilyID),
			BlockerCode: code,
			Locale:      locale,
			Details:     map[string]any{},
		})
	}
	return out
}

func (s *BunTranslationFamilyStore) TranslationDashboardFamilyMetrics(ctx context.Context, input TranslationDashboardFamilyMetricsInput) (TranslationDashboardFamilyMetrics, error) {
	if s == nil || s.db == nil {
		return TranslationDashboardFamilyMetrics{}, errors.New("family store not configured")
	}
	scope := translationservices.Scope{TenantID: strings.TrimSpace(input.TenantID), OrgID: strings.TrimSpace(input.OrgID)}
	blockedCountQuery := s.db.NewSelect().Model((*bunTranslationFamilyRecord)(nil))
	applyBunFamilyListFilters(blockedCountQuery, translationservices.ListFamiliesInput{Scope: scope, ReadinessState: "blocked"})
	blocked, err := blockedCountQuery.Count(ctx)
	if err != nil {
		return TranslationDashboardFamilyMetrics{}, err
	}
	missingCountQuery := s.db.NewSelect().Model((*bunTranslationFamilyRecord)(nil)).Where("missing_required_locale_count > 0")
	applyBunFamilyListFilters(missingCountQuery, translationservices.ListFamiliesInput{Scope: scope})
	missing, err := missingCountQuery.Count(ctx)
	if err != nil {
		return TranslationDashboardFamilyMetrics{}, err
	}
	limit := input.BlockedLimit
	if limit <= 0 {
		limit = translationDashboardDefaultBlockedLimit
	}
	topRows := []bunTranslationFamilyRecord{}
	topQuery := s.db.NewSelect().Model(&topRows)
	applyBunFamilyListFilters(topQuery, translationservices.ListFamiliesInput{Scope: scope, ReadinessState: "blocked"})
	topQuery.
		OrderExpr("missing_required_locale_count DESC").
		OrderExpr("pending_review_count DESC").
		OrderExpr("updated_at DESC").
		OrderExpr("family_id ASC").
		Limit(limit)
	if err := topQuery.Scan(ctx); err != nil {
		return TranslationDashboardFamilyMetrics{}, err
	}
	topFamilies, err := familyModelsFromBunRows(topRows)
	if err != nil {
		return TranslationDashboardFamilyMetrics{}, err
	}
	blockersByFamily, err := s.dashboardFamilyBlockersForFamilies(ctx, topFamilies)
	if err != nil {
		return TranslationDashboardFamilyMetrics{}, err
	}
	for idx := range topFamilies {
		topFamilies[idx].Blockers = blockersByFamily[topFamilies[idx].ID]
	}
	return TranslationDashboardFamilyMetrics{
		BlockedFamilies:         blocked,
		MissingRequiredFamilies: missing,
		TopBlocked:              topFamilies,
	}, nil
}

func (s *BunTranslationFamilyStore) dashboardFamilyBlockersForFamilies(ctx context.Context, families []translationservices.FamilyRecord) (map[string][]translationservices.FamilyBlocker, error) {
	out := map[string][]translationservices.FamilyBlocker{}
	if s == nil || s.db == nil || len(families) == 0 {
		return out, nil
	}
	familyIDs := make([]string, 0, len(families))
	for _, family := range families {
		if id := strings.TrimSpace(family.ID); id != "" {
			familyIDs = append(familyIDs, id)
		}
	}
	if len(familyIDs) == 0 {
		return out, nil
	}
	blockerRows := []bunTranslationFamilyBlockerRecord{}
	err := s.db.NewSelect().
		Model(&blockerRows).
		Where("family_id IN (?)", bun.List(familyIDs)).
		OrderExpr("family_id ASC").
		OrderExpr("blocker_code ASC").
		OrderExpr("locale ASC").
		OrderExpr("field_path ASC").
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) || isMissingFamilyBlockersTableError(err) {
		return out, nil
	}
	if err != nil {
		return nil, err
	}
	return bunFamilyBlockersByFamily(blockerRows)
}

func isMissingFamilyBlockersTableError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "no such table: family_blockers") ||
		strings.Contains(message, `relation "family_blockers" does not exist`) ||
		strings.Contains(message, "table family_blockers does not exist")
}

func familyModelsFromBunRows(rows []bunTranslationFamilyRecord) ([]translationservices.FamilyRecord, error) {
	if len(rows) == 0 {
		return nil, nil
	}
	out := make([]translationservices.FamilyRecord, 0, len(rows))
	for _, row := range rows {
		family, err := familyModelFromBunRecord(row)
		if err != nil {
			return nil, err
		}
		out = append(out, family)
	}
	return out, nil
}

func (s *BunTranslationFamilyStore) Family(ctx context.Context, id string) (translationservices.FamilyRecord, bool, error) {
	if s == nil || s.db == nil {
		return translationservices.FamilyRecord{}, false, errors.New("family store not configured")
	}
	record := bunTranslationFamilyRecord{}
	err := s.db.NewSelect().Model(&record).Where("family_id = ?", strings.TrimSpace(id)).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return translationservices.FamilyRecord{}, false, nil
	}
	if err != nil {
		return translationservices.FamilyRecord{}, false, err
	}
	families, err := s.familiesFromRows(ctx, []bunTranslationFamilyRecord{record})
	if err != nil || len(families) == 0 {
		return translationservices.FamilyRecord{}, false, err
	}
	return families[0], true, nil
}

func (s *BunTranslationFamilyStore) SaveFamily(ctx context.Context, family translationservices.FamilyRecord) error {
	if s == nil || s.db == nil {
		return errors.New("family store not configured")
	}
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		record, err := bunTranslationFamilyRecordFromModel(family)
		if err != nil {
			return err
		}
		sourceVariantID := record.SourceVariantID
		record.SourceVariantID = sql.NullString{}
		if saveErr := upsertTranslationFamilyRecordTx(ctx, tx, &record); saveErr != nil {
			return saveErr
		}
		if saveErr := clearFamilySourceVariants(ctx, tx, family); saveErr != nil {
			return saveErr
		}
		if saveErr := renameFamilyLocaleVariants(ctx, tx, family); saveErr != nil {
			return saveErr
		}
		if saveErr := upsertFamilyLocaleVariantsTx(ctx, tx, family); saveErr != nil {
			return saveErr
		}
		if saveErr := updateFamilySourceVariantTx(ctx, tx, family.ID, sourceVariantID); saveErr != nil {
			return saveErr
		}
		if saveErr := deleteStaleFamilyVariants(ctx, tx, family); saveErr != nil {
			return saveErr
		}
		return replaceFamilyBlockersTx(ctx, tx, family)
	})
}

func upsertTranslationFamilyRecordTx(ctx context.Context, tx bun.Tx, record *bunTranslationFamilyRecord) error {
	_, err := tx.NewInsert().
		Model(record).
		On("CONFLICT (family_id) DO UPDATE").
		Set("tenant_id = EXCLUDED.tenant_id").
		Set("org_id = EXCLUDED.org_id").
		Set("content_type = EXCLUDED.content_type").
		Set("source_locale = EXCLUDED.source_locale").
		Set("source_variant_id = EXCLUDED.source_variant_id").
		Set("readiness_state = EXCLUDED.readiness_state").
		Set("blocker_codes_json = EXCLUDED.blocker_codes_json").
		Set("missing_required_locale_count = EXCLUDED.missing_required_locale_count").
		Set("pending_review_count = EXCLUDED.pending_review_count").
		Set("outdated_locale_count = EXCLUDED.outdated_locale_count").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	return err
}

func upsertFamilyLocaleVariantsTx(ctx context.Context, tx bun.Tx, family translationservices.FamilyRecord) error {
	for _, variant := range family.Variants {
		row, err := bunTranslationLocaleVariantRecordFromModel(family, variant)
		if err != nil {
			return err
		}
		if _, err := tx.NewInsert().
			Model(&row).
			On("CONFLICT (variant_id) DO UPDATE").
			Set("tenant_id = EXCLUDED.tenant_id").
			Set("org_id = EXCLUDED.org_id").
			Set("family_id = EXCLUDED.family_id").
			Set("locale = EXCLUDED.locale").
			Set("status = EXCLUDED.status").
			Set("is_source = EXCLUDED.is_source").
			Set("source_hash_at_last_sync = EXCLUDED.source_hash_at_last_sync").
			Set("fields_json = EXCLUDED.fields_json").
			Set("row_version = EXCLUDED.row_version").
			Set("source_record_id = EXCLUDED.source_record_id").
			Set("updated_at = EXCLUDED.updated_at").
			Set("published_at = EXCLUDED.published_at").
			Exec(ctx); err != nil {
			return err
		}
	}
	return nil
}

func updateFamilySourceVariantTx(ctx context.Context, tx bun.Tx, familyID string, sourceVariantID sql.NullString) error {
	_, err := tx.NewUpdate().
		Model((*bunTranslationFamilyRecord)(nil)).
		Set("source_variant_id = ?", sourceVariantID).
		Where("family_id = ?", strings.TrimSpace(familyID)).
		Exec(ctx)
	return err
}

func replaceFamilyBlockersTx(ctx context.Context, tx bun.Tx, family translationservices.FamilyRecord) error {
	if _, err := tx.NewDelete().
		Model((*bunTranslationFamilyBlockerRecord)(nil)).
		Where("family_id = ?", strings.TrimSpace(family.ID)).
		Exec(ctx); err != nil {
		return err
	}
	if len(family.Blockers) == 0 {
		return nil
	}
	rows := make([]bunTranslationFamilyBlockerRecord, 0, len(family.Blockers))
	for _, blocker := range family.Blockers {
		row, err := bunTranslationFamilyBlockerRecordFromModel(family, blocker)
		if err != nil {
			return err
		}
		rows = append(rows, row)
	}
	_, err := tx.NewInsert().Model(&rows).Exec(ctx)
	return err
}

func (s *BunTranslationFamilyStore) familiesFromRows(ctx context.Context, familyRows []bunTranslationFamilyRecord) ([]translationservices.FamilyRecord, error) {
	if len(familyRows) == 0 {
		return nil, nil
	}
	familyIDs := make([]string, 0, len(familyRows))
	for _, row := range familyRows {
		familyIDs = append(familyIDs, row.FamilyID)
	}
	variantRows := []bunTranslationLocaleVariantRecord{}
	if err := s.db.NewSelect().
		Model(&variantRows).
		Where("family_id IN (?)", bun.List(familyIDs)).
		Scan(ctx); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	blockerRows := []bunTranslationFamilyBlockerRecord{}
	if err := s.db.NewSelect().
		Model(&blockerRows).
		Where("family_id IN (?)", bun.List(familyIDs)).
		Scan(ctx); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	assignmentRows := []bunTranslationAssignmentRecord{}
	if err := s.db.NewSelect().
		Model(&assignmentRows).
		Where("family_id IN (?)", bun.List(familyIDs)).
		Scan(ctx); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	variantsByFamily, err := bunFamilyVariantsByFamily(variantRows)
	if err != nil {
		return nil, err
	}
	blockersByFamily, err := bunFamilyBlockersByFamily(blockerRows)
	if err != nil {
		return nil, err
	}
	assignmentsByFamily := map[string][]translationservices.FamilyAssignment{}
	for _, row := range assignmentRows {
		assignmentsByFamily[row.FamilyID] = append(assignmentsByFamily[row.FamilyID], familyAssignmentFromAssignment(translationAssignmentFromBunRecord(row)))
	}
	out := make([]translationservices.FamilyRecord, 0, len(familyRows))
	for _, row := range familyRows {
		family, err := familyModelFromBunRecord(row)
		if err != nil {
			return nil, err
		}
		family.Variants = variantsByFamily[row.FamilyID]
		family.Blockers = blockersByFamily[row.FamilyID]
		family.Assignments = assignmentsByFamily[row.FamilyID]
		out = append(out, family)
	}
	return out, nil
}

func bunFamilyVariantsByFamily(rows []bunTranslationLocaleVariantRecord) (map[string][]translationservices.FamilyVariant, error) {
	out := map[string][]translationservices.FamilyVariant{}
	for _, row := range rows {
		variant, err := familyVariantFromBunRecord(row)
		if err != nil {
			return nil, err
		}
		out[row.FamilyID] = append(out[row.FamilyID], variant)
	}
	return out, nil
}

func bunFamilyBlockersByFamily(rows []bunTranslationFamilyBlockerRecord) (map[string][]translationservices.FamilyBlocker, error) {
	out := map[string][]translationservices.FamilyBlocker{}
	for _, row := range rows {
		blocker, err := familyBlockerFromBunRecord(row)
		if err != nil {
			return nil, err
		}
		out[row.FamilyID] = append(out[row.FamilyID], blocker)
	}
	return out, nil
}

func bunTranslationFamilyRecordFromModel(family translationservices.FamilyRecord) (bunTranslationFamilyRecord, error) {
	blockerCodesJSON, err := json.Marshal(append([]string{}, family.BlockerCodes...))
	if err != nil {
		return bunTranslationFamilyRecord{}, err
	}
	return bunTranslationFamilyRecord{
		FamilyID:                   strings.TrimSpace(family.ID),
		TenantID:                   strings.TrimSpace(family.TenantID),
		OrgID:                      strings.TrimSpace(family.OrgID),
		ContentType:                strings.TrimSpace(strings.ToLower(family.ContentType)),
		SourceLocale:               strings.TrimSpace(strings.ToLower(family.SourceLocale)),
		SourceVariantID:            nullString(strings.TrimSpace(family.SourceVariantID)),
		ReadinessState:             normalizeStoredFamilyReadinessState(family),
		BlockerCodesJSON:           string(blockerCodesJSON),
		MissingRequiredLocaleCount: family.MissingRequiredLocaleCount,
		PendingReviewCount:         family.PendingReviewCount,
		OutdatedLocaleCount:        family.OutdatedLocaleCount,
		CreatedAt:                  family.CreatedAt,
		UpdatedAt:                  family.UpdatedAt,
	}, nil
}

func normalizeStoredFamilyReadinessState(family translationservices.FamilyRecord) string {
	state := strings.TrimSpace(strings.ToLower(family.ReadinessState))
	switch state {
	case "ready", "blocked":
		return state
	}
	if len(family.Blockers) > 0 ||
		len(family.BlockerCodes) > 0 ||
		family.MissingRequiredLocaleCount > 0 ||
		family.PendingReviewCount > 0 ||
		family.OutdatedLocaleCount > 0 {
		return "blocked"
	}
	return "ready"
}

func familyModelFromBunRecord(record bunTranslationFamilyRecord) (translationservices.FamilyRecord, error) {
	blockerCodes := []string{}
	if strings.TrimSpace(record.BlockerCodesJSON) != "" {
		if err := json.Unmarshal([]byte(record.BlockerCodesJSON), &blockerCodes); err != nil {
			return translationservices.FamilyRecord{}, err
		}
	}
	return translationservices.FamilyRecord{
		ID:                         strings.TrimSpace(record.FamilyID),
		TenantID:                   strings.TrimSpace(record.TenantID),
		OrgID:                      strings.TrimSpace(record.OrgID),
		ContentType:                strings.TrimSpace(strings.ToLower(record.ContentType)),
		SourceLocale:               strings.TrimSpace(strings.ToLower(record.SourceLocale)),
		SourceVariantID:            nullStringValue(record.SourceVariantID),
		ReadinessState:             strings.TrimSpace(strings.ToLower(record.ReadinessState)),
		MissingRequiredLocaleCount: record.MissingRequiredLocaleCount,
		PendingReviewCount:         record.PendingReviewCount,
		OutdatedLocaleCount:        record.OutdatedLocaleCount,
		BlockerCodes:               append([]string{}, blockerCodes...),
		CreatedAt:                  record.CreatedAt,
		UpdatedAt:                  record.UpdatedAt,
	}, nil
}

func clearFamilySourceVariants(ctx context.Context, tx bun.Tx, family translationservices.FamilyRecord) error {
	familyID := strings.TrimSpace(family.ID)
	if familyID == "" || len(family.Variants) == 0 {
		return nil
	}
	_, err := tx.NewUpdate().
		Model((*bunTranslationLocaleVariantRecord)(nil)).
		Set("is_source = ?", false).
		Where("family_id = ?", familyID).
		Exec(ctx)
	return err
}

func deleteStaleFamilyVariants(ctx context.Context, tx bun.Tx, family translationservices.FamilyRecord) error {
	familyID := strings.TrimSpace(family.ID)
	if familyID == "" || len(family.Variants) == 0 {
		return nil
	}
	ids := make([]string, 0, len(family.Variants))
	for _, variant := range family.Variants {
		if id := strings.TrimSpace(variant.ID); id != "" {
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	_, err := tx.NewDelete().
		Model((*bunTranslationLocaleVariantRecord)(nil)).
		Where("family_id = ?", familyID).
		Where("variant_id NOT IN (?)", bun.List(ids)).
		Exec(ctx)
	return err
}

func renameFamilyLocaleVariants(ctx context.Context, tx bun.Tx, family translationservices.FamilyRecord) error {
	familyID := strings.TrimSpace(family.ID)
	if familyID == "" || len(family.Variants) == 0 {
		return nil
	}
	for _, variant := range family.Variants {
		variantID := strings.TrimSpace(variant.ID)
		locale := strings.TrimSpace(strings.ToLower(variant.Locale))
		if variantID == "" || locale == "" {
			continue
		}
		if _, err := tx.NewUpdate().
			Model((*bunTranslationLocaleVariantRecord)(nil)).
			Set("variant_id = ?", variantID).
			Where("family_id = ?", familyID).
			Where("locale = ?", locale).
			Where("variant_id <> ?", variantID).
			Exec(ctx); err != nil {
			return err
		}
	}
	return nil
}

func nullString(value string) sql.NullString {
	value = strings.TrimSpace(value)
	return sql.NullString{String: value, Valid: value != ""}
}

func nullStringValue(value sql.NullString) string {
	if !value.Valid {
		return ""
	}
	return strings.TrimSpace(value.String)
}

func bunTranslationLocaleVariantRecordFromModel(family translationservices.FamilyRecord, variant translationservices.FamilyVariant) (bunTranslationLocaleVariantRecord, error) {
	fieldsJSON, err := json.Marshal(variant.Fields)
	if err != nil {
		return bunTranslationLocaleVariantRecord{}, err
	}
	return bunTranslationLocaleVariantRecord{
		VariantID:            strings.TrimSpace(variant.ID),
		TenantID:             strings.TrimSpace(firstNonEmpty(variant.TenantID, family.TenantID)),
		OrgID:                strings.TrimSpace(firstNonEmpty(variant.OrgID, family.OrgID)),
		FamilyID:             strings.TrimSpace(family.ID),
		Locale:               strings.TrimSpace(strings.ToLower(variant.Locale)),
		Status:               strings.TrimSpace(strings.ToLower(variant.Status)),
		IsSource:             variant.IsSource,
		SourceHashAtLastSync: strings.TrimSpace(variant.SourceHashAtLastSync),
		FieldsJSON:           string(fieldsJSON),
		RowVersion:           1,
		SourceRecordID:       strings.TrimSpace(variant.SourceRecordID),
		CreatedAt:            variant.CreatedAt,
		UpdatedAt:            variant.UpdatedAt,
		PublishedAt:          cloneTimePtr(variant.PublishedAt),
	}, nil
}

func familyVariantFromBunRecord(record bunTranslationLocaleVariantRecord) (translationservices.FamilyVariant, error) {
	fields := map[string]string{}
	if strings.TrimSpace(record.FieldsJSON) != "" {
		if err := json.Unmarshal([]byte(record.FieldsJSON), &fields); err != nil {
			return translationservices.FamilyVariant{}, err
		}
	}
	return translationservices.FamilyVariant{
		ID:                   strings.TrimSpace(record.VariantID),
		FamilyID:             strings.TrimSpace(record.FamilyID),
		TenantID:             strings.TrimSpace(record.TenantID),
		OrgID:                strings.TrimSpace(record.OrgID),
		Locale:               strings.TrimSpace(strings.ToLower(record.Locale)),
		Status:               strings.TrimSpace(strings.ToLower(record.Status)),
		IsSource:             record.IsSource,
		SourceHashAtLastSync: strings.TrimSpace(record.SourceHashAtLastSync),
		Fields:               fields,
		SourceRecordID:       strings.TrimSpace(record.SourceRecordID),
		CreatedAt:            record.CreatedAt,
		UpdatedAt:            record.UpdatedAt,
		PublishedAt:          cloneTimePtr(record.PublishedAt),
	}, nil
}

func bunTranslationFamilyBlockerRecordFromModel(family translationservices.FamilyRecord, blocker translationservices.FamilyBlocker) (bunTranslationFamilyBlockerRecord, error) {
	detailsJSON, err := json.Marshal(blocker.Details)
	if err != nil {
		return bunTranslationFamilyBlockerRecord{}, err
	}
	return bunTranslationFamilyBlockerRecord{
		FamilyID:    strings.TrimSpace(family.ID),
		TenantID:    strings.TrimSpace(firstNonEmpty(blocker.TenantID, family.TenantID)),
		OrgID:       strings.TrimSpace(firstNonEmpty(blocker.OrgID, family.OrgID)),
		BlockerCode: strings.TrimSpace(strings.ToLower(blocker.BlockerCode)),
		Locale:      strings.TrimSpace(strings.ToLower(blocker.Locale)),
		FieldPath:   strings.TrimSpace(blocker.FieldPath),
		DetailsJSON: string(detailsJSON),
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}, nil
}

func familyBlockerFromBunRecord(record bunTranslationFamilyBlockerRecord) (translationservices.FamilyBlocker, error) {
	details := map[string]any{}
	if strings.TrimSpace(record.DetailsJSON) != "" {
		if err := json.Unmarshal([]byte(record.DetailsJSON), &details); err != nil {
			return translationservices.FamilyBlocker{}, err
		}
	}
	return translationservices.FamilyBlocker{
		ID:          strings.TrimSpace(record.FamilyID + ":" + record.BlockerCode + ":" + record.Locale + ":" + record.FieldPath),
		FamilyID:    strings.TrimSpace(record.FamilyID),
		TenantID:    strings.TrimSpace(record.TenantID),
		OrgID:       strings.TrimSpace(record.OrgID),
		BlockerCode: strings.TrimSpace(strings.ToLower(record.BlockerCode)),
		Locale:      strings.TrimSpace(strings.ToLower(record.Locale)),
		FieldPath:   strings.TrimSpace(record.FieldPath),
		Details:     details,
	}, nil
}

func familyAssignmentFromAssignment(assignment TranslationAssignment) translationservices.FamilyAssignment {
	return translationservices.FamilyAssignment{
		ID:           strings.TrimSpace(assignment.ID),
		FamilyID:     strings.TrimSpace(assignment.FamilyID),
		VariantID:    assignmentStorageVariantID(assignment),
		TenantID:     strings.TrimSpace(assignment.TenantID),
		OrgID:        strings.TrimSpace(assignment.OrgID),
		SourceLocale: strings.TrimSpace(strings.ToLower(assignment.SourceLocale)),
		TargetLocale: strings.TrimSpace(strings.ToLower(assignment.TargetLocale)),
		WorkScope:    normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
		Status:       strings.TrimSpace(strings.ToLower(string(assignment.Status))),
		AssigneeID:   strings.TrimSpace(assignment.AssigneeID),
		ReviewerID:   strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID)),
		Priority:     strings.TrimSpace(strings.ToLower(string(assignment.Priority))),
		DueDate:      cloneTimePtr(assignment.DueDate),
		CreatedAt:    assignment.CreatedAt,
		UpdatedAt:    assignment.UpdatedAt,
	}
}
