package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type routeRegistrar struct {
	router     coreadmin.AdminRouter
	middleware router.MiddlewareFunc
}

func wrapRouteRegistrar(r coreadmin.AdminRouter, mw router.MiddlewareFunc) routeRegistrar {
	return routeRegistrar{router: r, middleware: mw}
}

func (r routeRegistrar) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) {
	if r.router == nil {
		return
	}
	r.router.Get(path, handler, r.withMiddleware(mw)...)
}

func (r routeRegistrar) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) {
	if r.router == nil {
		return
	}
	r.router.Post(path, handler, r.withMiddleware(mw)...)
}

func (r routeRegistrar) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) {
	if r.router == nil {
		return
	}
	r.router.Put(path, handler, r.withMiddleware(mw)...)
}

func (r routeRegistrar) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) {
	if r.router == nil {
		return
	}
	r.router.Delete(path, handler, r.withMiddleware(mw)...)
}

func (r routeRegistrar) withMiddleware(mw []router.MiddlewareFunc) []router.MiddlewareFunc {
	if r.middleware == nil {
		return mw
	}
	out := make([]router.MiddlewareFunc, 0, len(mw)+1)
	out = append(out, r.middleware)
	out = append(out, mw...)
	return out
}

// Register attaches baseline phase-0 routes for admin and signer entry points.

// Register attaches baseline phase-0 routes for admin and signer entry points.
func Register(r coreadmin.AdminRouter, routes RouteSet, options ...RegisterOption) error {
	if r == nil {
		return fmt.Errorf("esign handlers: router is nil")
	}
	cfg, err := buildRegisterConfig(options)
	if err != nil {
		return fmt.Errorf("esign handlers: invalid registration config: %w", err)
	}
	adminRoutes := wrapRouteRegistrar(r, cfg.adminRouteAuth)

	registerAdminCoreRoutes(adminRoutes, routes, cfg)
	registerDraftRoutes(adminRoutes, routes, cfg)
	registerAgreementAuthoringRoutes(adminRoutes, routes, cfg)
	registerGoogleRoutes(adminRoutes, routes, cfg)
	registerIntegrationRoutes(adminRoutes, routes, cfg)
	registerSignerRoutes(r, routes, cfg)

	return nil
}

func resolveAdminUserID(c router.Context) string {
	if c == nil {
		return ""
	}
	userID := stableString(c.Query("user_id"))
	if userID == "" {
		userID = stableString(c.Header("X-User-ID"))
	}
	if userID == "" {
		if actor, ok := auth.ActorFromRouterContext(c); ok && actor != nil {
			userID = firstNonEmpty(strings.TrimSpace(actor.Subject), strings.TrimSpace(actor.ActorID))
		}
	}
	if userID == "" {
		if claims, ok := auth.GetClaims(c.Context()); ok && claims != nil {
			userID = firstNonEmpty(strings.TrimSpace(claims.UserID()), strings.TrimSpace(claims.Subject()))
		}
	}
	if userID == "" {
		if claims, ok := auth.GetRouterClaims(c, ""); ok && claims != nil {
			userID = firstNonEmpty(strings.TrimSpace(claims.UserID()), strings.TrimSpace(claims.Subject()))
		}
	}
	return stableString(userID)
}

func parsePageSize(raw string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	var parsed int
	if _, err := fmt.Sscan(raw, &parsed); err != nil {
		return 0
	}
	return parsed
}

func firstIntPointer(values ...*int) *int {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func firstFloatPointer(values ...*float64) *float64 {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func formatTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func nullableString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}

func draftRecordToSummaryMap(record stores.DraftRecord) map[string]any {
	return map[string]any{
		"id":           strings.TrimSpace(record.ID),
		"wizard_id":    strings.TrimSpace(record.WizardID),
		"title":        strings.TrimSpace(record.Title),
		"current_step": record.CurrentStep,
		"document_id":  nullableString(record.DocumentID),
		"created_at":   record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":   record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"expires_at":   record.ExpiresAt.UTC().Format(time.RFC3339Nano),
		"revision":     record.Revision,
	}
}

func draftRecordToDetailMap(record stores.DraftRecord) map[string]any {
	out := draftRecordToSummaryMap(record)
	out["wizard_state"] = decodeDraftWizardState(record.WizardStateJSON)
	return out
}

func decodeDraftWizardState(raw string) map[string]any {
	decoded := map[string]any{}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return decoded
	}
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil || decoded == nil {
		return map[string]any{}
	}
	return decoded
}

func normalizeDraftMutationError(err error) error {
	if err == nil {
		return nil
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return err
	}

	text := strings.TrimSpace(strings.ToLower(coded.TextCode))
	switch text {
	case "version_conflict":
		currentRevision := extractCurrentRevision(coded.Metadata)
		return goerrors.New("stale revision", goerrors.CategoryConflict).
			WithCode(http.StatusConflict).
			WithTextCode("stale_revision").
			WithMetadata(map[string]any{"current_revision": currentRevision})
	case "missing_required_fields":
		return goerrors.New("validation failed", goerrors.CategoryValidation).
			WithCode(http.StatusUnprocessableEntity).
			WithTextCode("validation_failed").
			WithMetadata(copyAnyMap(coded.Metadata))
	}
	return err
}

func extractCurrentRevision(metadata map[string]any) int64 {
	if len(metadata) == 0 {
		return 0
	}
	if raw, ok := metadata["current_revision"]; ok {
		if parsed, ok := coerceInt64(raw); ok {
			return parsed
		}
	}
	if raw, ok := metadata["actual"]; ok {
		if parsed, ok := coerceInt64(raw); ok {
			return parsed
		}
	}
	return 0
}

func coerceInt64(value any) (int64, bool) {
	switch typed := value.(type) {
	case int:
		return int64(typed), true
	case int8:
		return int64(typed), true
	case int16:
		return int64(typed), true
	case int32:
		return int64(typed), true
	case int64:
		return typed, true
	case uint:
		return int64(typed), true
	case uint8:
		return int64(typed), true
	case uint16:
		return int64(typed), true
	case uint32:
		return int64(typed), true
	case uint64:
		return int64(typed), true
	case float32:
		return int64(typed), true
	case float64:
		return int64(typed), true
	case string:
		var parsed int64
		if _, err := fmt.Sscan(strings.TrimSpace(typed), &parsed); err == nil {
			return parsed, true
		}
	}
	return 0, false
}

func copyAnyMap(source map[string]any) map[string]any {
	if len(source) == 0 {
		return nil
	}
	out := make(map[string]any, len(source))
	for key, value := range source {
		out[key] = value
	}
	return out
}

func participantRecordToMap(record stores.ParticipantRecord) map[string]any {
	return map[string]any{
		"id":             strings.TrimSpace(record.ID),
		"agreement_id":   strings.TrimSpace(record.AgreementID),
		"email":          strings.TrimSpace(record.Email),
		"name":           strings.TrimSpace(record.Name),
		"role":           strings.TrimSpace(record.Role),
		"signing_stage":  record.SigningStage,
		"first_view_at":  formatTime(record.FirstViewAt),
		"last_view_at":   formatTime(record.LastViewAt),
		"declined_at":    formatTime(record.DeclinedAt),
		"decline_reason": strings.TrimSpace(record.DeclineReason),
		"completed_at":   formatTime(record.CompletedAt),
		"version":        record.Version,
		"created_at":     record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":     record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func fieldDefinitionRecordToMap(record stores.FieldDefinitionRecord) map[string]any {
	return map[string]any{
		"id":              strings.TrimSpace(record.ID),
		"agreement_id":    strings.TrimSpace(record.AgreementID),
		"participant_id":  strings.TrimSpace(record.ParticipantID),
		"field_type":      strings.TrimSpace(record.Type),
		"type":            strings.TrimSpace(record.Type),
		"required":        record.Required,
		"validation_json": strings.TrimSpace(record.ValidationJSON),
		"created_at":      record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":      record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func fieldInstanceRecordToMap(record stores.FieldInstanceRecord) map[string]any {
	return map[string]any{
		"id":                  strings.TrimSpace(record.ID),
		"agreement_id":        strings.TrimSpace(record.AgreementID),
		"field_definition_id": strings.TrimSpace(record.FieldDefinitionID),
		"page_number":         record.PageNumber,
		"page":                record.PageNumber,
		"x":                   record.X,
		"y":                   record.Y,
		"width":               record.Width,
		"height":              record.Height,
		"tab_index":           record.TabIndex,
		"label":               strings.TrimSpace(record.Label),
		"appearance_json":     strings.TrimSpace(record.AppearanceJSON),
		"placement_source":    strings.TrimSpace(record.PlacementSource),
		"resolver_id":         strings.TrimSpace(record.ResolverID),
		"confidence":          record.Confidence,
		"placement_run_id":    strings.TrimSpace(record.PlacementRunID),
		"manual_override":     record.ManualOverride,
		"created_at":          record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":          record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func placementRunRecordToMap(record stores.PlacementRunRecord) map[string]any {
	return map[string]any{
		"id":                        strings.TrimSpace(record.ID),
		"agreement_id":              strings.TrimSpace(record.AgreementID),
		"status":                    strings.TrimSpace(record.Status),
		"reason_code":               strings.TrimSpace(record.ReasonCode),
		"resolver_order":            append([]string{}, record.ResolverOrder...),
		"executed_resolvers":        append([]string{}, record.ExecutedResolvers...),
		"resolver_scores":           record.ResolverScores,
		"suggestions":               record.Suggestions,
		"selected_suggestion_ids":   append([]string{}, record.SelectedSuggestionIDs...),
		"unresolved_definition_ids": append([]string{}, record.UnresolvedDefinitionIDs...),
		"selected_source":           strings.TrimSpace(record.SelectedSource),
		"policy_json":               strings.TrimSpace(record.PolicyJSON),
		"max_budget":                record.MaxBudget,
		"budget_used":               record.BudgetUsed,
		"max_time_ms":               record.MaxTimeMS,
		"elapsed_ms":                record.ElapsedMS,
		"manual_override_count":     record.ManualOverrideCount,
		"created_by_user_id":        strings.TrimSpace(record.CreatedByUserID),
		"version":                   record.Version,
		"created_at":                record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":                record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"completed_at":              formatTime(record.CompletedAt),
	}
}

func mappingSpecRecordToMap(record stores.MappingSpecRecord) map[string]any {
	return map[string]any{
		"id":                 strings.TrimSpace(record.ID),
		"provider":           strings.TrimSpace(record.Provider),
		"name":               strings.TrimSpace(record.Name),
		"version":            record.Version,
		"status":             strings.TrimSpace(record.Status),
		"external_schema":    record.ExternalSchema,
		"rules":              record.Rules,
		"compiled_json":      strings.TrimSpace(record.CompiledJSON),
		"compiled_hash":      strings.TrimSpace(record.CompiledHash),
		"published_at":       formatTime(record.PublishedAt),
		"created_by_user_id": strings.TrimSpace(record.CreatedByUserID),
		"updated_by_user_id": strings.TrimSpace(record.UpdatedByUserID),
		"created_at":         record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":         record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func integrationSyncRunRecordToMap(record stores.IntegrationSyncRunRecord) map[string]any {
	return map[string]any{
		"id":                 strings.TrimSpace(record.ID),
		"provider":           strings.TrimSpace(record.Provider),
		"direction":          strings.TrimSpace(record.Direction),
		"mapping_spec_id":    strings.TrimSpace(record.MappingSpecID),
		"status":             strings.TrimSpace(record.Status),
		"cursor":             strings.TrimSpace(record.Cursor),
		"last_error":         strings.TrimSpace(record.LastError),
		"attempt_count":      record.AttemptCount,
		"version":            record.Version,
		"started_at":         record.StartedAt.UTC().Format(time.RFC3339Nano),
		"completed_at":       formatTime(record.CompletedAt),
		"created_by_user_id": strings.TrimSpace(record.CreatedByUserID),
		"created_at":         record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":         record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func integrationCheckpointRecordToMap(record stores.IntegrationCheckpointRecord) map[string]any {
	return map[string]any{
		"id":             strings.TrimSpace(record.ID),
		"run_id":         strings.TrimSpace(record.RunID),
		"checkpoint_key": strings.TrimSpace(record.CheckpointKey),
		"cursor":         strings.TrimSpace(record.Cursor),
		"payload_json":   strings.TrimSpace(record.PayloadJSON),
		"version":        record.Version,
		"created_at":     record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":     record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func integrationConflictRecordToMap(record stores.IntegrationConflictRecord) map[string]any {
	return map[string]any{
		"id":                  strings.TrimSpace(record.ID),
		"run_id":              strings.TrimSpace(record.RunID),
		"binding_id":          strings.TrimSpace(record.BindingID),
		"provider":            strings.TrimSpace(record.Provider),
		"entity_kind":         strings.TrimSpace(record.EntityKind),
		"external_id":         strings.TrimSpace(record.ExternalID),
		"internal_id":         strings.TrimSpace(record.InternalID),
		"status":              strings.TrimSpace(record.Status),
		"reason":              strings.TrimSpace(record.Reason),
		"payload_json":        strings.TrimSpace(record.PayloadJSON),
		"resolution_json":     strings.TrimSpace(record.ResolutionJSON),
		"resolved_by_user_id": strings.TrimSpace(record.ResolvedByUserID),
		"resolved_at":         formatTime(record.ResolvedAt),
		"version":             record.Version,
		"created_at":          record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":          record.UpdatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func integrationChangeEventRecordToMap(record stores.IntegrationChangeEventRecord) map[string]any {
	return map[string]any{
		"id":              strings.TrimSpace(record.ID),
		"agreement_id":    strings.TrimSpace(record.AgreementID),
		"provider":        strings.TrimSpace(record.Provider),
		"event_type":      strings.TrimSpace(record.EventType),
		"source_event_id": strings.TrimSpace(record.SourceEventID),
		"idempotency_key": strings.TrimSpace(record.IdempotencyKey),
		"payload_json":    strings.TrimSpace(record.PayloadJSON),
		"emitted_at":      record.EmittedAt.UTC().Format(time.RFC3339Nano),
		"created_at":      record.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func googleImportRunDedupeKey(userID, accountID, googleFileID, sourceVersionHint string) string {
	parts := []string{
		strings.TrimSpace(strings.ToLower(userID)),
		strings.TrimSpace(strings.ToLower(googleFileID)),
		strings.TrimSpace(strings.ToLower(sourceVersionHint)),
	}
	if normalizedAccountID := strings.TrimSpace(strings.ToLower(accountID)); normalizedAccountID != "" {
		parts = append(parts, normalizedAccountID)
	}
	joined := strings.Join(parts, "|")
	sum := sha256.Sum256([]byte(joined))
	return hex.EncodeToString(sum[:])
}

func googleImportRunRecordToMap(record stores.GoogleImportRunRecord) map[string]any {
	out := map[string]any{
		"import_run_id":       strings.TrimSpace(record.ID),
		"id":                  strings.TrimSpace(record.ID),
		"status":              strings.TrimSpace(record.Status),
		"user_id":             strings.TrimSpace(record.UserID),
		"google_file_id":      strings.TrimSpace(record.GoogleFileID),
		"source_version_hint": strings.TrimSpace(record.SourceVersionHint),
		"dedupe_key":          strings.TrimSpace(record.DedupeKey),
		"document_title":      strings.TrimSpace(record.DocumentTitle),
		"agreement_title":     strings.TrimSpace(record.AgreementTitle),
		"created_by_user_id":  strings.TrimSpace(record.CreatedByUserID),
		"correlation_id":      strings.TrimSpace(record.CorrelationID),
		"source_mime_type":    strings.TrimSpace(record.SourceMimeType),
		"ingestion_mode":      strings.TrimSpace(record.IngestionMode),
		"created_at":          record.CreatedAt.UTC().Format(time.RFC3339Nano),
		"updated_at":          record.UpdatedAt.UTC().Format(time.RFC3339Nano),
		"started_at":          formatTime(record.StartedAt),
		"completed_at":        formatTime(record.CompletedAt),
	}
	if strings.TrimSpace(record.DocumentID) != "" {
		out["document"] = map[string]any{"id": strings.TrimSpace(record.DocumentID)}
	}
	if strings.TrimSpace(record.AgreementID) != "" {
		out["agreement"] = map[string]any{"id": strings.TrimSpace(record.AgreementID), "document_id": strings.TrimSpace(record.DocumentID)}
	}
	if strings.TrimSpace(record.ErrorCode) != "" || strings.TrimSpace(record.ErrorMessage) != "" {
		errPayload := map[string]any{
			"code":    strings.TrimSpace(record.ErrorCode),
			"message": strings.TrimSpace(record.ErrorMessage),
		}
		if details := decodeJSONMap(record.ErrorDetailsJSON); len(details) > 0 {
			errPayload["details"] = details
		}
		out["error"] = errPayload
	}
	return out
}

func decodeJSONMap(raw string) map[string]any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	out := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

func apiCorrelationID(c router.Context, candidates ...string) string {
	if c == nil {
		return observability.ResolveCorrelationID(candidates...)
	}
	values := []string{
		c.Header("X-Correlation-ID"),
		c.Header("Idempotency-Key"),
	}
	values = append(values, candidates...)
	return observability.ResolveCorrelationID(values...)
}

func isUnifiedFlowRequest(c router.Context) bool {
	return c != nil
}

func buildSignerAssetLinks(contract services.SignerAssetContract, contractURL, sessionURL string) map[string]any {
	assets := map[string]any{
		"contract_url": strings.TrimSpace(contractURL),
		"session_url":  strings.TrimSpace(sessionURL),
	}
	if contract.SourceDocumentAvailable {
		assets["source_url"] = strings.TrimSpace(contractURL) + "?asset=source"
	}
	if contract.ExecutedArtifactAvailable {
		assets["executed_url"] = strings.TrimSpace(contractURL) + "?asset=executed"
	}
	if contract.CertificateAvailable {
		assets["certificate_url"] = strings.TrimSpace(contractURL) + "?asset=certificate"
	}
	return assets
}

func normalizeSignerAssetType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "source":
		return "source"
	case "executed":
		return "executed"
	case "certificate":
		return "certificate"
	default:
		return ""
	}
}

func signerAssetAvailable(contract services.SignerAssetContract, assetType string) bool {
	switch normalizeSignerAssetType(assetType) {
	case "source":
		return contract.SourceDocumentAvailable
	case "executed":
		return contract.ExecutedArtifactAvailable
	case "certificate":
		return contract.CertificateAvailable
	default:
		return false
	}
}

func signerRoleCanAccessAsset(role, assetType string) bool {
	role = strings.ToLower(strings.TrimSpace(role))
	assetType = normalizeSignerAssetType(assetType)
	if assetType == "" {
		return false
	}
	switch role {
	case stores.RecipientRoleSigner, stores.RecipientRoleCC:
		return true
	default:
		return false
	}
}

func resolveSignerAssetDisposition(raw string) string {
	if strings.EqualFold(strings.TrimSpace(raw), "attachment") {
		return "attachment"
	}
	return "inline"
}

func signerAssetFilename(contract services.SignerAssetContract, assetType string) string {
	baseID := strings.TrimSpace(contract.AgreementID)
	if baseID == "" {
		baseID = "agreement"
	}
	assetType = normalizeSignerAssetType(assetType)
	if assetType == "" {
		assetType = "asset"
	}
	return fmt.Sprintf("%s-%s.pdf", baseID, assetType)
}

func signerAssetObjectKey(contract services.SignerAssetContract, assetType string) string {
	switch normalizeSignerAssetType(assetType) {
	case "source":
		return strings.TrimSpace(contract.SourceObjectKey)
	case "executed":
		return strings.TrimSpace(contract.ExecutedObjectKey)
	case "certificate":
		return strings.TrimSpace(contract.CertificateObjectKey)
	default:
		return ""
	}
}

func logAPIOperation(ctx context.Context, operation, correlationID string, startedAt time.Time, err error, fields map[string]any) {
	outcome := "success"
	level := slog.LevelInfo
	if err != nil {
		outcome = "error"
		level = slog.LevelWarn
	}
	duration := time.Since(startedAt)
	if fields == nil {
		fields = map[string]any{}
	}
	if raw, ok := fields["outcome"].(string); ok {
		trimmed := strings.TrimSpace(raw)
		if trimmed != "" {
			outcome = trimmed
			if trimmed == "error" && err == nil {
				level = slog.LevelWarn
			}
		}
	}
	observability.LogOperation(ctx, level, "api", strings.TrimSpace(operation), outcome, strings.TrimSpace(correlationID), duration, err, fields)
}
