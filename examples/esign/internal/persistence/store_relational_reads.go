package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/guardedeffects"
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

func loadAgreementRevisionRequestRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.AgreementRevisionRequestRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return stores.AgreementRevisionRequestRecord{}, relationalInvalidRecordError("agreement_revision_requests", "id", "required")
	}
	record := stores.AgreementRevisionRequestRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		return stores.AgreementRevisionRequestRecord{}, mapSQLNotFound(err, "agreement_revision_requests", id)
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

func loadSigningTokenRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SigningTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SigningTokenRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.SigningTokenRecord{}, relationalInvalidRecordError("signing_tokens", "id", "required")
	}
	record := stores.SigningTokenRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.SigningTokenRecord{}, mapSQLNotFound(err, "signing_tokens", id)
	}
	return record, nil
}

func listSigningTokenRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, recipientID string) ([]stores.SigningTokenRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("signing_tokens", "agreement_id", "required")
	}
	if recipientID == "" {
		return nil, relationalInvalidRecordError("signing_tokens", "recipient_id", "required")
	}
	records := make([]stores.SigningTokenRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", recipientID).
		OrderExpr("created_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
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

func listDraftAuditEventRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, draftID string, query stores.DraftAuditEventQuery) ([]stores.DraftAuditEventRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	draftID = strings.TrimSpace(draftID)
	if draftID == "" {
		return nil, relationalInvalidRecordError("draft_audit_events", "draft_id", "required")
	}
	records := make([]stores.DraftAuditEventRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("draft_id = ?", draftID)
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

func listFieldValueRecordsByRecipient(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, recipientID string) ([]stores.FieldValueRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeRelationalID(agreementID)
	recipientID = normalizeRelationalID(recipientID)
	if agreementID == "" || recipientID == "" {
		return nil, relationalInvalidRecordError("field_values", "agreement_id|recipient_id", "required")
	}
	records := make([]stores.FieldValueRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("recipient_id = ?", recipientID).
		OrderExpr("updated_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func loadSignatureArtifactRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.SignatureArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SignatureArtifactRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.SignatureArtifactRecord{}, relationalInvalidRecordError("signature_artifacts", "id", "required")
	}
	record := stores.SignatureArtifactRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.SignatureArtifactRecord{}, mapSQLNotFound(err, "signature_artifacts", id)
	}
	return record, nil
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

func parseRelationalCursorOffset(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return 0
	}
	return value
}

func normalizeRelationalProviderAndEntity(provider, entityKind string) (string, string) {
	return strings.ToLower(strings.TrimSpace(provider)), strings.ToLower(strings.TrimSpace(entityKind))
}

func relationalMappingSpecSortKey(record stores.MappingSpecRecord) string {
	return strings.Join([]string{
		strings.ToLower(strings.TrimSpace(record.Provider)),
		strings.ToLower(strings.TrimSpace(record.Name)),
		strconv.FormatInt(record.Version, 10),
		strings.TrimSpace(record.ID),
	}, "|")
}

func loadRemediationDispatchRecord(ctx context.Context, idb bun.IDB, dispatchID string) (stores.RemediationDispatchRecord, error) {
	dispatchID = normalizeRelationalID(dispatchID)
	if dispatchID == "" {
		return stores.RemediationDispatchRecord{}, relationalInvalidRecordError("remediation_dispatches", "dispatch_id", "required")
	}
	record := relationalRemediationDispatchModel{}
	if err := idb.NewSelect().
		Model(&record).
		Where("dispatch_id = ?", dispatchID).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.RemediationDispatchRecord{}, mapSQLNotFound(err, "remediation_dispatches", dispatchID)
	}
	return record.RemediationDispatchRecord, nil
}

func loadRemediationDispatchByIdempotencyKeyRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, key string) (stores.RemediationDispatchRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.RemediationDispatchRecord{}, err
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return stores.RemediationDispatchRecord{}, relationalInvalidRecordError("remediation_dispatches", "idempotency_key", "required")
	}
	record := relationalRemediationDispatchModel{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("idempotency_key = ?", key).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.RemediationDispatchRecord{}, mapSQLNotFound(err, "remediation_dispatches", key)
	}
	return record.RemediationDispatchRecord, nil
}

func loadGuardedEffectRecord(ctx context.Context, idb bun.IDB, effectID string) (guardedeffects.Record, error) {
	effectID = normalizeRelationalID(effectID)
	if effectID == "" {
		return guardedeffects.Record{}, relationalInvalidRecordError("guarded_effects", "effect_id", "required")
	}
	record := stores.GuardedEffectRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("effect_id = ?", effectID).
		Limit(1).
		Scan(ctx); err != nil {
		return guardedeffects.Record{}, mapSQLNotFound(err, "guarded_effects", effectID)
	}
	return record.Record, nil
}

func loadGuardedEffectByIdempotencyKeyRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, key string) (guardedeffects.Record, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return guardedeffects.Record{}, err
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return guardedeffects.Record{}, relationalInvalidRecordError("guarded_effects", "idempotency_key", "required")
	}
	record := stores.GuardedEffectRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("idempotency_key = ?", key).
		Limit(1).
		Scan(ctx); err != nil {
		return guardedeffects.Record{}, mapSQLNotFound(err, "guarded_effects", key)
	}
	return record.Record, nil
}

func listGuardedEffectRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.GuardedEffectQuery) ([]guardedeffects.Record, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	models := make([]stores.GuardedEffectRecord, 0)
	sel := idb.NewSelect().
		Model(&models).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if subjectType := strings.TrimSpace(query.SubjectType); subjectType != "" {
		sel = sel.Where("subject_type = ?", subjectType)
	}
	if subjectID := normalizeRelationalID(query.SubjectID); subjectID != "" {
		sel = sel.Where("subject_id = ?", subjectID)
	}
	if groupType := strings.TrimSpace(query.GroupType); groupType != "" {
		sel = sel.Where("group_type = ?", groupType)
	}
	if groupID := normalizeRelationalID(query.GroupID); groupID != "" {
		sel = sel.Where("group_id = ?", groupID)
	}
	if kind := strings.TrimSpace(query.Kind); kind != "" {
		sel = sel.Where("kind = ?", kind)
	}
	if status := strings.TrimSpace(query.Status); status != "" {
		sel = sel.Where("status = ?", status)
	}
	if query.SortDesc {
		sel = sel.OrderExpr("created_at DESC, effect_id DESC")
	} else {
		sel = sel.OrderExpr("created_at ASC, effect_id ASC")
	}
	if query.Limit > 0 {
		sel = sel.Limit(query.Limit)
	}
	if query.Offset > 0 {
		sel = sel.Offset(query.Offset)
	}
	if err := sel.Scan(ctx); err != nil {
		return nil, err
	}
	records := make([]guardedeffects.Record, 0, len(models))
	for _, model := range models {
		records = append(records, model.Record)
	}
	return records, nil
}

func loadSignerProfileRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, subject, key string, now time.Time) (stores.SignerProfileRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.SignerProfileRecord{}, err
	}
	subject = strings.ToLower(strings.TrimSpace(subject))
	key = strings.TrimSpace(key)
	if subject == "" {
		return stores.SignerProfileRecord{}, relationalInvalidRecordError("signer_profiles", "subject", "required")
	}
	if key == "" {
		return stores.SignerProfileRecord{}, relationalInvalidRecordError("signer_profiles", "key", "required")
	}
	if now.IsZero() {
		now = time.Now().UTC()
	} else {
		now = now.UTC()
	}
	record := stores.SignerProfileRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("subject = ?", subject).
		Where("profile_key = ?", key).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.SignerProfileRecord{}, mapSQLNotFound(err, "signer_profiles", subject+"|"+key)
	}
	if !record.ExpiresAt.IsZero() && now.After(record.ExpiresAt.UTC()) {
		return stores.SignerProfileRecord{}, relationalNotFoundError("signer_profiles", subject+"|"+key)
	}
	return record, nil
}

func listSavedSignerSignatureRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, subject, signatureType string) ([]stores.SavedSignerSignatureRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	subject = strings.ToLower(strings.TrimSpace(subject))
	signatureType = strings.ToLower(strings.TrimSpace(signatureType))
	if subject == "" {
		return nil, relationalInvalidRecordError("saved_signatures", "subject", "required")
	}
	if signatureType == "" {
		return nil, relationalInvalidRecordError("saved_signatures", "type", "required")
	}
	records := make([]stores.SavedSignerSignatureRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("LOWER(subject) = ?", subject).
		Where("LOWER(signature_type) = ?", signatureType).
		Scan(ctx, &records); err != nil {
		return nil, err
	}
	sort.Slice(records, func(i, j int) bool {
		if records[i].CreatedAt.Equal(records[j].CreatedAt) {
			return records[i].ID > records[j].ID
		}
		return records[i].CreatedAt.After(records[j].CreatedAt)
	})
	return records, nil
}

func countSavedSignerSignatureRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, subject, signatureType string) (int, error) {
	records, err := listSavedSignerSignatureRecords(ctx, idb, scope, subject, signatureType)
	if err != nil {
		return 0, err
	}
	return len(records), nil
}

func loadAgreementArtifactRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) (stores.AgreementArtifactRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementArtifactRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	if agreementID == "" {
		return stores.AgreementArtifactRecord{}, relationalInvalidRecordError("agreement_artifacts", "agreement_id", "required")
	}
	record := stores.AgreementArtifactRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Scan(ctx); err != nil {
		return stores.AgreementArtifactRecord{}, mapSQLNotFound(err, "agreement_artifacts", agreementID)
	}
	return record, nil
}

func loadGoogleImportRunRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.GoogleImportRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.GoogleImportRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.GoogleImportRunRecord{}, relationalInvalidRecordError("google_import_runs", "id", "required")
	}
	record := stores.GoogleImportRunRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.GoogleImportRunRecord{}, mapSQLNotFound(err, "google_import_runs", id)
	}
	return record, nil
}

func listGoogleImportRunRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.GoogleImportRunQuery) ([]stores.GoogleImportRunRecord, string, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, "", err
	}
	userID := normalizeRelationalID(query.UserID)
	if userID == "" {
		return nil, "", relationalInvalidRecordError("google_import_runs", "user_id", "required")
	}
	limit := query.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	offset := parseRelationalCursorOffset(query.Cursor)
	records := make([]stores.GoogleImportRunRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("user_id = ?", userID)
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

func listOutboxMessageRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, query stores.OutboxQuery) ([]stores.OutboxMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	query.Topic = strings.ToLower(strings.TrimSpace(query.Topic))
	query.Status = strings.ToLower(strings.TrimSpace(query.Status))
	rows := make([]OutboxMessageRecord, 0)
	sel := idb.NewSelect().
		Model(&rows).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if query.Topic != "" {
		sel = sel.Where("LOWER(topic) = ?", query.Topic)
	}
	if query.Status != "" {
		sel = sel.Where("LOWER(status) = ?", query.Status)
	}
	if query.SortDesc {
		sel = sel.OrderExpr("created_at DESC, id ASC")
	} else {
		sel = sel.OrderExpr("created_at ASC, id ASC")
	}
	if query.Offset > 0 {
		sel = sel.Offset(query.Offset)
	}
	if query.Limit > 0 {
		sel = sel.Limit(query.Limit)
	}
	if err := sel.Scan(ctx, &rows); err != nil {
		return nil, err
	}
	out := make([]stores.OutboxMessageRecord, 0, len(rows))
	for _, row := range rows {
		out = append(out, cloneRelationalOutboxMessageRecord(row.Message))
	}
	return out, nil
}

func loadIntegrationCredentialRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, provider, userID string) (stores.IntegrationCredentialRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationCredentialRecord{}, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	userID = normalizeRelationalID(userID)
	if provider == "" {
		return stores.IntegrationCredentialRecord{}, relationalInvalidRecordError("integration_credentials", "provider", "required")
	}
	if userID == "" {
		return stores.IntegrationCredentialRecord{}, relationalInvalidRecordError("integration_credentials", "user_id", "required")
	}
	record := stores.IntegrationCredentialRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("provider = ?", provider).
		Where("user_id = ?", userID).
		Limit(1).
		Scan(ctx); err != nil {
		return stores.IntegrationCredentialRecord{}, mapSQLNotFound(err, "integration_credentials", provider+"|"+userID)
	}
	return record, nil
}

func listIntegrationCredentialRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, provider, baseUserIDPrefix string) ([]stores.IntegrationCredentialRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	if provider == "" {
		return nil, relationalInvalidRecordError("integration_credentials", "provider", "required")
	}
	baseUserIDPrefix = normalizeRelationalID(baseUserIDPrefix)
	records := make([]stores.IntegrationCredentialRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("provider = ?", provider).
		Scan(ctx, &records); err != nil {
		return nil, err
	}
	if baseUserIDPrefix != "" {
		filtered := make([]stores.IntegrationCredentialRecord, 0, len(records))
		for _, record := range records {
			if record.UserID == baseUserIDPrefix || strings.HasPrefix(record.UserID, baseUserIDPrefix+"#") {
				filtered = append(filtered, record)
			}
		}
		records = filtered
	}
	sort.Slice(records, func(i, j int) bool {
		return records[i].CreatedAt.After(records[j].CreatedAt)
	})
	return records, nil
}

func loadMappingSpecRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.MappingSpecRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.MappingSpecRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.MappingSpecRecord{}, relationalInvalidRecordError("integration_mapping_specs", "id", "required")
	}
	record := stores.MappingSpecRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.MappingSpecRecord{}, mapSQLNotFound(err, "integration_mapping_specs", id)
	}
	return record, nil
}

func listMappingSpecRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, provider string) ([]stores.MappingSpecRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	records := make([]stores.MappingSpecRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if provider != "" {
		sel = sel.Where("LOWER(provider) = ?", provider)
	}
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	sort.Slice(records, func(i, j int) bool {
		return relationalMappingSpecSortKey(records[i]) < relationalMappingSpecSortKey(records[j])
	})
	return records, nil
}

func listIntegrationBindingRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, provider, entityKind, internalID string) ([]stores.IntegrationBindingRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	provider, entityKind = normalizeRelationalProviderAndEntity(provider, entityKind)
	internalID = normalizeRelationalID(internalID)
	records := make([]stores.IntegrationBindingRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if provider != "" {
		sel = sel.Where("provider = ?", provider)
	}
	if entityKind != "" {
		sel = sel.Where("entity_kind = ?", entityKind)
	}
	if internalID != "" {
		sel = sel.Where("internal_id = ?", internalID)
	}
	if err := sel.OrderExpr("updated_at ASC, id ASC").Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadIntegrationSyncRunRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.IntegrationSyncRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationSyncRunRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.IntegrationSyncRunRecord{}, relationalInvalidRecordError("integration_sync_runs", "id", "required")
	}
	record := stores.IntegrationSyncRunRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.IntegrationSyncRunRecord{}, mapSQLNotFound(err, "integration_sync_runs", id)
	}
	return record, nil
}

func listIntegrationSyncRunRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, provider string) ([]stores.IntegrationSyncRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	provider = strings.ToLower(strings.TrimSpace(provider))
	records := make([]stores.IntegrationSyncRunRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if provider != "" {
		sel = sel.Where("provider = ?", provider)
	}
	if err := sel.OrderExpr("started_at DESC, id ASC").Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func listIntegrationCheckpointRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, runID string) ([]stores.IntegrationCheckpointRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	runID = normalizeRelationalID(runID)
	if runID == "" {
		return nil, relationalInvalidRecordError("integration_checkpoints", "run_id", "required")
	}
	records := make([]stores.IntegrationCheckpointRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("run_id = ?", runID).
		OrderExpr("updated_at ASC, id ASC").
		Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadIntegrationConflictRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, id string) (stores.IntegrationConflictRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.IntegrationConflictRecord{}, err
	}
	id = normalizeRelationalID(id)
	if id == "" {
		return stores.IntegrationConflictRecord{}, relationalInvalidRecordError("integration_conflicts", "id", "required")
	}
	record := stores.IntegrationConflictRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Scan(ctx); err != nil {
		return stores.IntegrationConflictRecord{}, mapSQLNotFound(err, "integration_conflicts", id)
	}
	return record, nil
}

func listIntegrationConflictRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, runID, status string) ([]stores.IntegrationConflictRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	runID = normalizeRelationalID(runID)
	status = strings.ToLower(strings.TrimSpace(status))
	records := make([]stores.IntegrationConflictRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if runID != "" {
		sel = sel.Where("run_id = ?", runID)
	}
	if status != "" {
		sel = sel.Where("status = ?", status)
	}
	if err := sel.OrderExpr("updated_at ASC, id ASC").Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func listIntegrationChangeEventRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.IntegrationChangeEventRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeRelationalID(agreementID)
	records := make([]stores.IntegrationChangeEventRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if agreementID != "" {
		sel = sel.Where("agreement_id = ?", agreementID)
	}
	if err := sel.OrderExpr("emitted_at ASC, id ASC").Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func loadPlacementRunRecord(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID, runID string) (stores.PlacementRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.PlacementRunRecord{}, err
	}
	agreementID = normalizeRelationalID(agreementID)
	runID = normalizeRelationalID(runID)
	if agreementID == "" {
		return stores.PlacementRunRecord{}, relationalInvalidRecordError("placement_runs", "agreement_id", "required")
	}
	if runID == "" {
		return stores.PlacementRunRecord{}, relationalInvalidRecordError("placement_runs", "id", "required")
	}
	record := stores.PlacementRunRecord{}
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Where("id = ?", runID).
		Scan(ctx); err != nil {
		return stores.PlacementRunRecord{}, mapSQLNotFound(err, "placement_runs", runID)
	}
	return record, nil
}

func listPlacementRunRecords(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) ([]stores.PlacementRunRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeRelationalID(agreementID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("placement_runs", "agreement_id", "required")
	}
	records := make([]stores.PlacementRunRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		OrderExpr("created_at ASC, id ASC").
		Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}
