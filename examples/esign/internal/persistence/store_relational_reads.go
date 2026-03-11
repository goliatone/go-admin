package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	repository "github.com/goliatone/go-repository-bun"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/uptrace/bun"
)

func normalizedStoreScope(scope stores.Scope) (stores.Scope, error) {
	scope.TenantID = strings.TrimSpace(scope.TenantID)
	scope.OrgID = strings.TrimSpace(scope.OrgID)
	if scope.TenantID == "" || scope.OrgID == "" {
		return stores.Scope{}, goerrors.New("tenant_id and org_id are required", goerrors.CategoryValidation).
			WithCode(400).
			WithTextCode("SCOPE_DENIED")
	}
	return scope, nil
}

func relationalInvalidRecordError(entity, field, reason string) error {
	meta := map[string]any{"entity": entity, "field": field}
	if strings.TrimSpace(reason) != "" {
		meta["reason"] = strings.TrimSpace(reason)
	}
	return goerrors.New("invalid record", goerrors.CategoryValidation).
		WithCode(400).
		WithTextCode("MISSING_REQUIRED_FIELDS").
		WithMetadata(meta)
}

func relationalNotFoundError(entity, id string) error {
	return goerrors.New(fmt.Sprintf("%s not found", entity), goerrors.CategoryNotFound).
		WithCode(404).
		WithTextCode("NOT_FOUND").
		WithMetadata(map[string]any{"entity": entity, "id": strings.TrimSpace(id)})
}

func relationalScopeDeniedError() error {
	return goerrors.New("tenant or org scope denied", goerrors.CategoryAuthz).
		WithCode(403).
		WithTextCode("SCOPE_DENIED")
}

func mapSQLNotFound(err error, entity, id string) error {
	if err == nil {
		return nil
	}
	if err == sql.ErrNoRows || strings.Contains(strings.ToLower(err.Error()), "no rows") {
		return relationalNotFoundError(entity, id)
	}
	return err
}

func requireAdapterIDB(s *StoreAdapter) (bun.IDB, error) {
	if s == nil || s.bunDB == nil {
		return nil, fmt.Errorf("store adapter: store is not configured")
	}
	return s.bunDB, nil
}

func loadAgreementRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.AgreementRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.AgreementRecord{}, relationalInvalidRecordError("agreements", "id", "required")
	}
	record := stores.AgreementRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return stores.AgreementRecord{}, mapSQLNotFound(err, "agreements", id)
	}
	return record, nil
}

func listAgreementRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.AgreementQuery) ([]stores.AgreementRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	records := make([]stores.AgreementRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if status := strings.TrimSpace(query.Status); status != "" {
		sel = sel.Where("status = ?", status)
	}
	if query.SortDesc {
		sel = sel.OrderExpr("created_at DESC, id DESC")
	} else {
		sel = sel.OrderExpr("created_at ASC, id ASC")
	}
	if query.Limit > 0 {
		sel = sel.Limit(query.Limit)
	}
	if query.Offset > 0 {
		sel = sel.Offset(query.Offset)
	}
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func listParticipantRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.ParticipantRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("participants", "agreement_id", "required")
	}
	records := make([]stores.ParticipantRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		OrderExpr("signing_stage ASC, created_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func listRecipientRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.RecipientRecord, error) {
	participants, err := listParticipantRecords(ctx, idb, scope, agreementID)
	if err != nil {
		return nil, err
	}
	out := make([]stores.RecipientRecord, 0, len(participants))
	for _, record := range participants {
		out = append(out, stores.RecipientRecord{
			ID:            record.ID,
			TenantID:      record.TenantID,
			OrgID:         record.OrgID,
			AgreementID:   record.AgreementID,
			Email:         record.Email,
			Name:          record.Name,
			Role:          record.Role,
			Notify:        record.Notify,
			SigningOrder:  record.SigningStage,
			FirstViewAt:   record.FirstViewAt,
			LastViewAt:    record.LastViewAt,
			DeclinedAt:    record.DeclinedAt,
			DeclineReason: record.DeclineReason,
			CompletedAt:   record.CompletedAt,
			Version:       record.Version,
			CreatedAt:     record.CreatedAt,
			UpdatedAt:     record.UpdatedAt,
		})
	}
	return out, nil
}

func listFieldDefinitionRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.FieldDefinitionRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("field_definitions", "agreement_id", "required")
	}
	records := make([]stores.FieldDefinitionRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		OrderExpr("created_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func listFieldInstanceRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.FieldInstanceRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("field_instances", "agreement_id", "required")
	}
	records := make([]stores.FieldInstanceRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		OrderExpr("page_number ASC, tab_index ASC, created_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func listFieldRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.FieldRecord, error) {
	definitions, err := listFieldDefinitionRecords(ctx, idb, scope, agreementID)
	if err != nil {
		return nil, err
	}
	instances, err := listFieldInstanceRecords(ctx, idb, scope, agreementID)
	if err != nil {
		return nil, err
	}
	defByID := make(map[string]stores.FieldDefinitionRecord, len(definitions))
	for _, definition := range definitions {
		defByID[strings.TrimSpace(definition.ID)] = definition
	}
	out := make([]stores.FieldRecord, 0, len(instances))
	for _, instance := range instances {
		definition, ok := defByID[strings.TrimSpace(instance.FieldDefinitionID)]
		if !ok {
			continue
		}
		out = append(out, stores.FieldRecord{
			ID:                instance.ID,
			FieldDefinitionID: definition.ID,
			TenantID:          instance.TenantID,
			OrgID:             instance.OrgID,
			AgreementID:       instance.AgreementID,
			RecipientID:       definition.ParticipantID,
			Type:              definition.Type,
			PageNumber:        instance.PageNumber,
			PosX:              instance.X,
			PosY:              instance.Y,
			Width:             instance.Width,
			Height:            instance.Height,
			PlacementSource:   instance.PlacementSource,
			LinkGroupID:       instance.LinkGroupID,
			LinkedFromFieldID: instance.LinkedFromFieldID,
			IsUnlinked:        instance.IsUnlinked,
			Required:          definition.Required,
			CreatedAt:         instance.CreatedAt,
			UpdatedAt:         instance.UpdatedAt,
		})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].PageNumber == out[j].PageNumber {
			return out[i].CreatedAt.Before(out[j].CreatedAt)
		}
		return out[i].PageNumber < out[j].PageNumber
	})
	return out, nil
}

func loadDraftRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.DraftRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.DraftRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.DraftRecord{}, relationalInvalidRecordError("drafts", "id", "required")
	}
	record := stores.DraftRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return stores.DraftRecord{}, mapSQLNotFound(err, "drafts", id)
	}
	if !record.ExpiresAt.IsZero() && !record.ExpiresAt.After(time.Now().UTC()) {
		return stores.DraftRecord{}, relationalNotFoundError("drafts", id)
	}
	return record, nil
}

func listDraftRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.DraftQuery) ([]stores.DraftRecord, string, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, "", err
	}
	userID := strings.TrimSpace(query.CreatedByUserID)
	if userID == "" {
		return nil, "", relationalInvalidRecordError("drafts", "created_by_user_id", "required")
	}
	limit := query.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	offset := 0
	if cursor := strings.TrimSpace(query.Cursor); cursor != "" {
		parsed, parseErr := strconv.Atoi(cursor)
		if parseErr == nil && parsed > 0 {
			offset = parsed
		}
	}
	records := make([]stores.DraftRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("created_by = ?", userID).
		Where("expires_at > ?", time.Now().UTC())
	if wizardID := strings.TrimSpace(query.WizardID); wizardID != "" {
		sel = sel.Where("wizard_id = ?", wizardID)
	}
	if query.SortDesc {
		sel = sel.OrderExpr("updated_at DESC, id DESC")
	} else {
		sel = sel.OrderExpr("updated_at ASC, id ASC")
	}
	if err := sel.Limit(limit+1).Offset(offset).Scan(ctx, &records); err != nil {
		return nil, "", err
	}
	nextCursor := ""
	if len(records) > limit {
		records = records[:limit]
		nextCursor = strconv.Itoa(offset + limit)
	}
	return records, nextCursor, nil
}

func loadSigningTokenByHashRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, tokenHash string) (stores.SigningTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SigningTokenRecord{}, err
	}
	tokenHash = strings.TrimSpace(tokenHash)
	if tokenHash == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "token_hash", "required")
	}
	record := stores.SigningTokenRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("token_hash = ?", tokenHash).
		Scan(ctx)
	if err != nil {
		return stores.SigningTokenRecord{}, mapSQLNotFound(err, "signing_tokens", tokenHash)
	}
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return stores.SigningTokenRecord{}, relationalScopeDeniedError()
	}
	return record, nil
}

func listAuditEventRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string, query stores.AuditEventQuery) ([]stores.AuditEventRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("audit_events", "agreement_id", "required")
	}
	records := make([]stores.AuditEventRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID)
	if query.SortDesc {
		sel = sel.OrderExpr("created_at DESC, id DESC")
	} else {
		sel = sel.OrderExpr("created_at ASC, id ASC")
	}
	if query.Limit > 0 {
		sel = sel.Limit(query.Limit)
	}
	if query.Offset > 0 {
		sel = sel.Offset(query.Offset)
	}
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func listEmailLogRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.EmailLogRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("email_logs", "agreement_id", "required")
	}
	records := make([]stores.EmailLogRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		OrderExpr("created_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func getJobRunByDedupeRecord(ctx context.Context, repo repository.Repository[*stores.JobRunRecord], scope stores.Scope, jobName, dedupeKey string) (stores.JobRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.JobRunRecord{}, err
	}
	jobName = strings.TrimSpace(jobName)
	dedupeKey = strings.TrimSpace(dedupeKey)
	if jobName == "" || dedupeKey == "" {
		return stores.JobRunRecord{}, relationalInvalidRecordError("job_runs", "job_name|dedupe_key", "required")
	}
	record, err := repo.Get(ctx,
		repository.SelectBy("tenant_id", "=", scope.TenantID),
		repository.SelectBy("org_id", "=", scope.OrgID),
		repository.SelectBy("job_name", "=", jobName),
		repository.SelectBy("dedupe_key", "=", dedupeKey),
	)
	if err != nil {
		return stores.JobRunRecord{}, mapSQLNotFound(err, "job_runs", dedupeKey)
	}
	if record == nil {
		return stores.JobRunRecord{}, relationalNotFoundError("job_runs", dedupeKey)
	}
	return *record, nil
}

func listJobRunRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.JobRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("job_runs", "agreement_id", "required")
	}
	records := make([]stores.JobRunRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		OrderExpr("updated_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func loadAgreementReminderStateRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	agreementID = strings.TrimSpace(agreementID)
	recipientID = strings.TrimSpace(recipientID)
	if agreementID == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "agreement_id", "required")
	}
	if recipientID == "" {
		return stores.AgreementReminderStateRecord{}, relationalInvalidRecordError("agreement_reminder_states", "recipient_id", "required")
	}
	record := stores.AgreementReminderStateRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", recipientID).
		Scan(ctx)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, mapSQLNotFound(err, "agreement_reminder_states", agreementID+"|"+recipientID)
	}
	return record, nil
}
