package services

import (
	"context"
	"fmt"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func (s GoogleIntegrationService) SyncSourceRevisionComments(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceCommentSyncResult, error) {
	return syncGoogleSourceRevisionComments(ctx, scope, googleSourceCommentSyncDeps{
		now:            s.now,
		provider:       s.provider,
		lineage:        s.lineage,
		comments:       s.sourceComments,
		resolveToken:   s.resolveAccessTokenForAccount,
		providerKind:   stores.SourceProviderKindGoogleDrive,
		providerStatus: s.ProviderHealth(ctx),
	}, sourceRevisionID)
}

func (s GoogleServicesIntegrationService) SyncSourceRevisionComments(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceCommentSyncResult, error) {
	return syncGoogleSourceRevisionComments(ctx, scope, googleSourceCommentSyncDeps{
		now:            s.now,
		provider:       s.provider,
		lineage:        s.lineage,
		comments:       s.sourceComments,
		resolveToken:   s.resolveAccessTokenForAccount,
		providerKind:   stores.SourceProviderKindGoogleDrive,
		providerStatus: s.ProviderHealth(ctx),
	}, sourceRevisionID)
}

type googleSourceCommentSyncDeps struct {
	now            func() time.Time
	provider       GoogleProvider
	lineage        stores.LineageStore
	comments       SourceCommentSyncService
	resolveToken   func(context.Context, stores.Scope, string) (string, error)
	providerKind   string
	providerStatus GoogleProviderHealthStatus
}

func syncGoogleSourceRevisionComments(ctx context.Context, scope stores.Scope, deps googleSourceCommentSyncDeps, sourceRevisionID string) (SourceCommentSyncResult, error) {
	if deps.lineage == nil {
		return SourceCommentSyncResult{}, domainValidationError("google_source_comment_sync", "lineage", "not configured")
	}
	if deps.comments == nil {
		return SourceCommentSyncResult{}, domainValidationError("google_source_comment_sync", "comments", "not configured")
	}
	if deps.provider == nil {
		return SourceCommentSyncResult{}, domainValidationError("google_source_comment_sync", "provider", "not configured")
	}
	if deps.resolveToken == nil {
		return SourceCommentSyncResult{}, domainValidationError("google_source_comment_sync", "credentials", "not configured")
	}
	sourceRevisionID = strings.TrimSpace(sourceRevisionID)
	if sourceRevisionID == "" {
		return SourceCommentSyncResult{}, domainValidationError("google_source_comment_sync", "source_revision_id", "required")
	}
	if !deps.providerStatus.Healthy {
		err := domainValidationError("google_source_comment_sync", "provider", "degraded")
		_, _ = deps.comments.RecordSourceRevisionCommentSyncFailure(ctx, scope, SourceCommentSyncFailureInput{
			SourceRevisionID: sourceRevisionID,
			ProviderKind:     deps.providerKind,
			AttemptedAt:      googleSourceSyncAttemptedAt(deps.now),
			ErrorCode:        "google_provider_degraded",
			ErrorMessage:     firstNonEmpty(strings.TrimSpace(deps.providerStatus.Reason), err.Error()),
		})
		return SourceCommentSyncResult{}, err
	}

	revision, err := deps.lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	sourceDocument, err := deps.lineage.GetSourceDocument(ctx, scope, revision.SourceDocumentID)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	if !strings.EqualFold(strings.TrimSpace(sourceDocument.ProviderKind), stores.SourceProviderKindGoogleDrive) {
		return SourceCommentSyncResult{}, domainValidationError("google_source_comment_sync", "provider_kind", "unsupported")
	}
	handle, err := deps.lineage.GetSourceHandle(ctx, scope, revision.SourceHandleID)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	fileID := strings.TrimSpace(handle.ExternalFileID)
	if fileID == "" {
		return SourceCommentSyncResult{}, domainValidationError("google_source_comment_sync", "external_file_id", "required")
	}
	attemptedAt := googleSourceSyncAttemptedAt(deps.now)
	accessToken, err := deps.resolveToken(ctx, scope, handle.AccountID)
	if err != nil {
		_, _ = deps.comments.RecordSourceRevisionCommentSyncFailure(ctx, scope, SourceCommentSyncFailureInput{
			SourceDocumentID: sourceDocument.ID,
			SourceRevisionID: revision.ID,
			ProviderKind:     deps.providerKind,
			AttemptedAt:      attemptedAt,
			ErrorCode:        "google_access_revoked",
			ErrorMessage:     err.Error(),
		})
		return SourceCommentSyncResult{}, err
	}

	comments, err := deps.provider.ListComments(ctx, accessToken, fileID)
	if err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		_, _ = deps.comments.RecordSourceRevisionCommentSyncFailure(ctx, scope, SourceCommentSyncFailureInput{
			SourceDocumentID: sourceDocument.ID,
			SourceRevisionID: revision.ID,
			ProviderKind:     deps.providerKind,
			AttemptedAt:      attemptedAt,
			ErrorCode:        "google_comment_sync_failed",
			ErrorMessage:     err.Error(),
		})
		return SourceCommentSyncResult{}, MapGoogleProviderError(err)
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)

	result, err := deps.comments.SyncSourceRevisionComments(ctx, scope, SourceCommentSyncInput{
		SourceDocumentID: sourceDocument.ID,
		SourceRevisionID: revision.ID,
		ProviderKind:     deps.providerKind,
		SyncStatus:       SourceManagementCommentSyncSynced,
		AttemptedAt:      attemptedAt,
		SyncedAt:         attemptedAt,
		Threads:          googleCommentsToSourceThreads(comments),
	})
	observability.ObserveSourceSearchFreshness(ctx, "comment_sync", err == nil)
	return result, err
}

func googleSourceSyncAttemptedAt(now func() time.Time) *time.Time {
	if now == nil {
		current := time.Now().UTC()
		return &current
	}
	current := now().UTC()
	return &current
}

func googleCommentsToSourceThreads(comments []GoogleDriveComment) []SourceCommentProviderThread {
	out := make([]SourceCommentProviderThread, 0, len(comments))
	sort.SliceStable(comments, func(i, j int) bool {
		if comments[i].CreatedTime.Equal(comments[j].CreatedTime) {
			return comments[i].ID < comments[j].ID
		}
		return comments[i].CreatedTime.Before(comments[j].CreatedTime)
	})
	for _, comment := range comments {
		messages := make([]SourceCommentProviderMessage, 0, 1+len(comment.Replies))
		messages = append(messages, SourceCommentProviderMessage{
			ProviderMessageID: comment.ID,
			MessageKind:       stores.SourceCommentMessageKindComment,
			BodyText:          strings.TrimSpace(comment.Content),
			Author:            googleCommentAuthorSummary(comment.Author),
			CreatedAt:         cloneGoogleCommentTimePtr(comment.CreatedTime),
			UpdatedAt:         cloneGoogleCommentTimePtr(comment.ModifiedTime),
		})
		for _, reply := range comment.Replies {
			messages = append(messages, SourceCommentProviderMessage{
				ProviderMessageID:       strings.TrimSpace(reply.ID),
				ProviderParentMessageID: strings.TrimSpace(comment.ID),
				MessageKind:             googleReplyMessageKind(reply),
				BodyText:                firstNonEmpty(strings.TrimSpace(reply.Content), strings.TrimSpace(reply.Action)),
				Author:                  googleCommentAuthorSummary(reply.Author),
				CreatedAt:               cloneGoogleCommentTimePtr(reply.CreatedTime),
				UpdatedAt:               cloneGoogleCommentTimePtr(reply.ModifiedTime),
			})
		}
		out = append(out, SourceCommentProviderThread{
			ProviderCommentID: strings.TrimSpace(comment.ID),
			ThreadID:          strings.TrimSpace(comment.ID),
			Status:            googleCommentThreadStatus(comment),
			Anchor:            googleCommentAnchor(comment),
			Author:            googleCommentAuthorSummary(comment.Author),
			BodyText:          strings.TrimSpace(comment.Content),
			ResolvedAt:        googleCommentResolvedAt(comment),
			LastActivityAt:    googleCommentLastActivityAt(comment),
			Messages:          messages,
		})
	}
	return out
}

func googleCommentThreadStatus(comment GoogleDriveComment) string {
	switch {
	case comment.Deleted:
		return stores.SourceCommentThreadStatusDeleted
	case comment.Resolved:
		return stores.SourceCommentThreadStatusResolved
	default:
		return stores.SourceCommentThreadStatusOpen
	}
}

func googleCommentAnchor(comment GoogleDriveComment) SourceCommentProviderAnchor {
	label := strings.TrimSpace(comment.QuotedFileContent.Value)
	kind := stores.SourceCommentAnchorKindDocument
	if label != "" {
		kind = stores.SourceCommentAnchorKindTextRange
	}
	if label == "" {
		label = "Document"
	}
	metadata := map[string]any{}
	if value := strings.TrimSpace(comment.Anchor); value != "" {
		metadata["provider_anchor"] = value
	}
	if value := strings.TrimSpace(comment.QuotedFileContent.MimeType); value != "" {
		metadata["quoted_mime_type"] = value
	}
	return SourceCommentProviderAnchor{
		Kind:      kind,
		Label:     label,
		TextQuote: strings.TrimSpace(comment.QuotedFileContent.Value),
		Metadata:  metadata,
	}
}

func googleCommentAuthorSummary(author GoogleDriveCommentAuthor) SourceCommentProviderAuthor {
	authorType := stores.SourceCommentAuthorTypeUser
	if strings.TrimSpace(author.DisplayName) == "" && strings.TrimSpace(author.EmailAddress) == "" {
		authorType = stores.SourceCommentAuthorTypeUnknown
	}
	return SourceCommentProviderAuthor{
		DisplayName: strings.TrimSpace(author.DisplayName),
		Email:       strings.TrimSpace(author.EmailAddress),
		Type:        authorType,
	}
}

func googleReplyMessageKind(reply GoogleDriveReply) string {
	if strings.TrimSpace(reply.Action) != "" {
		return stores.SourceCommentMessageKindSystem
	}
	return stores.SourceCommentMessageKindReply
}

func googleCommentResolvedAt(comment GoogleDriveComment) *time.Time {
	if !comment.Resolved {
		return nil
	}
	return cloneGoogleCommentTimePtr(comment.ModifiedTime)
}

func googleCommentLastActivityAt(comment GoogleDriveComment) *time.Time {
	last := comment.ModifiedTime.UTC()
	for _, reply := range comment.Replies {
		if reply.ModifiedTime.After(last) {
			last = reply.ModifiedTime.UTC()
		}
	}
	return &last
}

func cloneGoogleCommentTimePtr(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	cloned := value.UTC()
	return &cloned
}

func (s GoogleIntegrationService) resolveAccessTokenForAccount(ctx context.Context, scope stores.Scope, accountID string) (string, error) {
	scopedUserID, err := s.resolveScopedUserIDForAccount(ctx, scope, accountID)
	if err != nil {
		return "", err
	}
	accessToken, _, err := s.resolveAccessToken(ctx, scope, scopedUserID)
	return accessToken, err
}

func (s GoogleIntegrationService) resolveScopedUserIDForAccount(ctx context.Context, scope stores.Scope, accountID string) (string, error) {
	if s.credentials == nil {
		return "", domainValidationError("google_source_comment_sync", "credentials", "not configured")
	}
	credentials, err := s.credentials.ListIntegrationCredentials(ctx, scope, GoogleProviderName, "")
	if err != nil {
		return "", err
	}
	return scopedGoogleCredentialUserID(credentials, accountID)
}

func (s GoogleServicesIntegrationService) resolveAccessTokenForAccount(ctx context.Context, scope stores.Scope, accountID string) (string, error) {
	scopedUserID, err := s.resolveScopedUserIDForAccount(ctx, scope, accountID)
	if err != nil {
		return "", err
	}
	accessToken, _, err := s.resolveAccessToken(ctx, scope, scopedUserID)
	return accessToken, err
}

func (s GoogleServicesIntegrationService) resolveScopedUserIDForAccount(ctx context.Context, scope stores.Scope, accountID string) (string, error) {
	db := s.servicesDB()
	if db == nil {
		return "", domainValidationError("google_source_comment_sync", "credentials", "services db unavailable")
	}
	prefixSegments := []string{}
	if tenantID := strings.TrimSpace(scope.TenantID); tenantID != "" {
		prefixSegments = append(prefixSegments, "tenant", tenantID)
	}
	if orgID := strings.TrimSpace(scope.OrgID); orgID != "" {
		prefixSegments = append(prefixSegments, "org", orgID)
	}
	pattern := path.Join(append(prefixSegments, "user")...) + "/%"
	rows := []googleServicesConnectionRecord{}
	if err := db.NewSelect().
		Model(&rows).
		Where("provider_id = ?", s.googleProviderID()).
		Where("scope_type = 'user'").
		Where("scope_id LIKE ?", pattern).
		Order("updated_at DESC").
		Scan(ctx); err != nil {
		return "", err
	}
	return scopedGoogleConnectionUserID(rows, accountID)
}

func scopedGoogleCredentialUserID(credentials []stores.IntegrationCredentialRecord, accountID string) (string, error) {
	accountID = normalizeGoogleAccountID(accountID)
	for _, credential := range credentials {
		_, candidateAccountID := ParseGoogleScopedUserID(credential.UserID)
		if normalizeGoogleAccountID(candidateAccountID) == accountID {
			return strings.TrimSpace(credential.UserID), nil
		}
	}
	if accountID == "" && len(credentials) == 1 {
		return strings.TrimSpace(credentials[0].UserID), nil
	}
	return "", fmt.Errorf("google integration credential not found for account %q", accountID)
}

func scopedGoogleConnectionUserID(rows []googleServicesConnectionRecord, accountID string) (string, error) {
	accountID = normalizeGoogleAccountID(accountID)
	for _, row := range rows {
		scopedUserID := parseScopedUserIDFromScopeID(row.ScopeID)
		_, candidateAccountID := ParseGoogleScopedUserID(scopedUserID)
		if normalizeGoogleAccountID(candidateAccountID) == accountID {
			return strings.TrimSpace(scopedUserID), nil
		}
	}
	if accountID == "" && len(rows) == 1 {
		return strings.TrimSpace(parseScopedUserIDFromScopeID(rows[0].ScopeID)), nil
	}
	return "", fmt.Errorf("google services connection not found for account %q", accountID)
}
