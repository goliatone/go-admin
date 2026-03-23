package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
)

var sourceCommentNamespace = uuid.MustParse("f5713d6d-7396-4a77-8f59-c1e2092ce3e3")

type DefaultSourceCommentSyncService struct {
	lineage stores.LineageStore
	search  SourceSearchService
}

func NewDefaultSourceCommentSyncService(lineage stores.LineageStore, opts ...SourceCommentSyncServiceOption) DefaultSourceCommentSyncService {
	svc := DefaultSourceCommentSyncService{lineage: lineage}
	for _, opt := range opts {
		if opt != nil {
			opt(&svc)
		}
	}
	return svc
}

type SourceCommentSyncServiceOption func(*DefaultSourceCommentSyncService)

func WithSourceCommentSyncSearchService(service SourceSearchService) SourceCommentSyncServiceOption {
	return func(s *DefaultSourceCommentSyncService) {
		if s == nil || service == nil {
			return
		}
		s.search = service
	}
}

func (s DefaultSourceCommentSyncService) SyncSourceRevisionComments(ctx context.Context, scope stores.Scope, input SourceCommentSyncInput) (SourceCommentSyncResult, error) {
	if s.lineage == nil {
		return SourceCommentSyncResult{}, domainValidationError("source_comment_sync", "lineage", "not configured")
	}
	providerKind := firstNonEmpty(strings.TrimSpace(input.ProviderKind), stores.SourceProviderKindGoogleDrive)
	result := SourceCommentSyncResult{}
	err := s.withLineageWriteTx(ctx, func(lineage stores.LineageStore) error {
		var innerErr error
		result, innerErr = s.syncSourceRevisionCommentsWithLineage(ctx, lineage, scope, input)
		return innerErr
	})
	if err != nil {
		observability.ObserveSourceCommentSync(ctx, providerKind, false, sourceCommentSyncFailureCode(err))
		return SourceCommentSyncResult{}, err
	}
	if s.search != nil {
		_, _ = s.search.ReindexSourceRevision(ctx, scope, result.SourceRevisionID)
		_, _ = s.search.ReindexSourceDocument(ctx, scope, result.SourceDocumentID)
	}
	observability.ObserveSourceCommentSync(ctx, providerKind, true, "")
	return result, nil
}

func (s DefaultSourceCommentSyncService) syncSourceRevisionCommentsWithLineage(ctx context.Context, lineage stores.LineageStore, scope stores.Scope, input SourceCommentSyncInput) (SourceCommentSyncResult, error) {
	sourceRevisionID := strings.TrimSpace(input.SourceRevisionID)
	if sourceRevisionID == "" {
		return SourceCommentSyncResult{}, domainValidationError("source_comment_sync", "source_revision_id", "required")
	}
	revision, err := lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	sourceDocumentID := firstNonEmpty(strings.TrimSpace(input.SourceDocumentID), strings.TrimSpace(revision.SourceDocumentID))
	if sourceDocumentID == "" {
		return SourceCommentSyncResult{}, domainValidationError("source_comment_sync", "source_document_id", "required")
	}
	sourceDocument, err := lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	providerKind := firstNonEmpty(strings.TrimSpace(input.ProviderKind), strings.TrimSpace(sourceDocument.ProviderKind))
	if providerKind == "" {
		providerKind = stores.SourceProviderKindGoogleDrive
	}
	payloadJSON, payloadSHA, err := sourceCommentSyncPayload(input)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}

	now := time.Now().UTC()
	threads := make([]SourceCommentThreadSummary, 0, len(input.Threads))
	threadCount := 0
	messageCount := 0
	incomingThreadIDs := make(map[string]struct{}, len(input.Threads))
	for _, threadInput := range input.Threads {
		incomingThreadIDs[deterministicSourceCommentThreadID(revision.ID, providerKind, threadInput.ProviderCommentID)] = struct{}{}
	}
	existingThreads, err := lineage.ListSourceCommentThreads(ctx, scope, stores.SourceCommentThreadQuery{
		SourceRevisionID: revision.ID,
		ProviderKind:     providerKind,
		IncludeDeleted:   true,
	})
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	if err := s.reconcileDeletedThreads(ctx, lineage, scope, existingThreads, input, incomingThreadIDs, now); err != nil {
		return SourceCommentSyncResult{}, err
	}
	for _, threadInput := range input.Threads {
		threadRecord, messageRecords, err := s.upsertThread(ctx, lineage, scope, sourceDocument, revision, providerKind, input, threadInput)
		if err != nil {
			return SourceCommentSyncResult{}, err
		}
		threadCount++
		messageCount += len(messageRecords)
		threads = append(threads, buildSourceCommentThreadSummary(sourceDocument, revision, threadRecord, messageRecords))
	}

	state, err := s.upsertSyncState(ctx, lineage, scope, sourceDocument, revision, providerKind, input, payloadJSON, payloadSHA, threadCount, messageCount, now)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	return SourceCommentSyncResult{
		SourceDocumentID: strings.TrimSpace(sourceDocument.ID),
		SourceRevisionID: strings.TrimSpace(revision.ID),
		Sync:             sourceCommentSyncSummaryFromRecord(state),
		Threads:          threads,
	}, nil
}

func (s DefaultSourceCommentSyncService) withLineageWriteTx(ctx context.Context, fn func(stores.LineageStore) error) error {
	if fn == nil {
		return nil
	}
	txManager, ok := any(s.lineage).(stores.TransactionManager)
	if !ok {
		return fn(s.lineage)
	}
	return txManager.WithTx(ctx, func(tx stores.TxStore) error {
		lineage, ok := any(tx).(stores.LineageStore)
		if !ok {
			return domainValidationError("source_comment_sync", "lineage", "transaction store does not expose lineage contracts")
		}
		return fn(lineage)
	})
}

func (s DefaultSourceCommentSyncService) ReplaySourceRevisionCommentSync(ctx context.Context, scope stores.Scope, sourceRevisionID string) (SourceCommentSyncResult, error) {
	if s.lineage == nil {
		return SourceCommentSyncResult{}, domainValidationError("source_comment_sync", "lineage", "not configured")
	}
	sourceRevisionID = strings.TrimSpace(sourceRevisionID)
	if sourceRevisionID == "" {
		return SourceCommentSyncResult{}, domainValidationError("source_comment_sync", "source_revision_id", "required")
	}
	states, err := s.lineage.ListSourceCommentSyncStates(ctx, scope, stores.SourceCommentSyncStateQuery{
		SourceRevisionID: sourceRevisionID,
	})
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	if len(states) == 0 {
		return SourceCommentSyncResult{}, debugLineageNotFound("source_comment_sync_states", sourceRevisionID)
	}
	sortSourceCommentSyncStates(states)
	state, input, err := replayableSourceCommentSyncInput(states)
	if err != nil {
		observability.ObserveSourceCommentReplay(ctx, stores.SourceProviderKindGoogleDrive, false)
		return SourceCommentSyncResult{}, err
	}
	input.SourceDocumentID = firstNonEmpty(strings.TrimSpace(input.SourceDocumentID), strings.TrimSpace(state.SourceDocumentID))
	input.SourceRevisionID = firstNonEmpty(strings.TrimSpace(input.SourceRevisionID), strings.TrimSpace(state.SourceRevisionID))
	input.ProviderKind = firstNonEmpty(strings.TrimSpace(input.ProviderKind), strings.TrimSpace(state.ProviderKind))
	input.SyncStatus = firstNonEmpty(strings.TrimSpace(input.SyncStatus), strings.TrimSpace(state.SyncStatus))
	input.AttemptedAt = cloneSourceTimePtr(state.LastAttemptAt)
	input.SyncedAt = cloneSourceTimePtr(state.LastSyncedAt)
	input.ErrorCode = firstNonEmpty(strings.TrimSpace(input.ErrorCode), strings.TrimSpace(state.ErrorCode))
	input.ErrorMessage = firstNonEmpty(strings.TrimSpace(input.ErrorMessage), strings.TrimSpace(state.ErrorMessage))
	result, replayErr := s.SyncSourceRevisionComments(ctx, scope, input)
	observability.ObserveSourceCommentReplay(ctx, firstNonEmpty(strings.TrimSpace(input.ProviderKind), strings.TrimSpace(state.ProviderKind), stores.SourceProviderKindGoogleDrive), replayErr == nil)
	return result, replayErr
}

func (s DefaultSourceCommentSyncService) RecordSourceRevisionCommentSyncFailure(ctx context.Context, scope stores.Scope, input SourceCommentSyncFailureInput) (SourceCommentSyncResult, error) {
	if s.lineage == nil {
		return SourceCommentSyncResult{}, domainValidationError("source_comment_sync", "lineage", "not configured")
	}
	providerKind := firstNonEmpty(strings.TrimSpace(input.ProviderKind), stores.SourceProviderKindGoogleDrive)
	result := SourceCommentSyncResult{}
	err := s.withLineageWriteTx(ctx, func(lineage stores.LineageStore) error {
		var innerErr error
		result, innerErr = s.recordSourceRevisionCommentSyncFailureWithLineage(ctx, lineage, scope, input)
		return innerErr
	})
	observability.ObserveSourceCommentSync(ctx, providerKind, false, firstNonEmpty(strings.TrimSpace(input.ErrorCode), sourceCommentSyncFailureCode(err)))
	return result, err
}

func (s DefaultSourceCommentSyncService) upsertThread(
	ctx context.Context,
	lineage stores.LineageStore,
	scope stores.Scope,
	sourceDocument stores.SourceDocumentRecord,
	revision stores.SourceRevisionRecord,
	providerKind string,
	input SourceCommentSyncInput,
	threadInput SourceCommentProviderThread,
) (stores.SourceCommentThreadRecord, []stores.SourceCommentMessageRecord, error) {
	threadID := deterministicSourceCommentThreadID(revision.ID, providerKind, threadInput.ProviderCommentID)
	anchorJSON, err := json.Marshal(threadInput.Anchor)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, nil, err
	}
	authorJSON, err := json.Marshal(threadInput.Author)
	if err != nil {
		return stores.SourceCommentThreadRecord{}, nil, err
	}
	messagesInput := threadInput.Messages
	if len(messagesInput) == 0 && strings.TrimSpace(threadInput.BodyText) != "" {
		messagesInput = []SourceCommentProviderMessage{{
			ProviderMessageID: threadInput.ProviderCommentID,
			MessageKind:       stores.SourceCommentMessageKindComment,
			BodyText:          threadInput.BodyText,
			Author:            threadInput.Author,
			CreatedAt:         threadInput.LastActivityAt,
			UpdatedAt:         threadInput.LastActivityAt,
		}}
	}
	threadRecord := stores.SourceCommentThreadRecord{
		ID:                threadID,
		SourceDocumentID:  sourceDocument.ID,
		SourceRevisionID:  revision.ID,
		ProviderKind:      providerKind,
		ProviderCommentID: strings.TrimSpace(threadInput.ProviderCommentID),
		ThreadID:          firstNonEmpty(strings.TrimSpace(threadInput.ThreadID), strings.TrimSpace(threadInput.ProviderCommentID)),
		Status:            strings.TrimSpace(threadInput.Status),
		AnchorKind:        firstNonEmpty(strings.TrimSpace(threadInput.Anchor.Kind), stores.SourceCommentAnchorKindDocument),
		AnchorJSON:        string(anchorJSON),
		AuthorJSON:        string(authorJSON),
		BodyPreview:       sourceCommentPreview(firstNonEmpty(strings.TrimSpace(threadInput.BodyText), firstThreadMessageBody(messagesInput))),
		MessageCount:      len(messagesInput),
		ReplyCount:        maxInt(len(messagesInput)-1, 0),
		SyncStatus:        firstNonEmpty(strings.TrimSpace(input.SyncStatus), SourceManagementCommentSyncSynced),
		ResolvedAt:        cloneSourceTimePtr(threadInput.ResolvedAt),
		LastSyncedAt:      cloneSourceTimePtr(input.SyncedAt),
		LastActivityAt:    cloneSourceTimePtr(firstNonNilTime(threadInput.LastActivityAt, latestProviderMessageTime(messagesInput))),
	}
	if existing, err := lineage.GetSourceCommentThread(ctx, scope, threadID); err == nil {
		threadRecord.CreatedAt = existing.CreatedAt
		threadRecord.UpdatedAt = time.Now().UTC()
		threadRecord, err = lineage.SaveSourceCommentThread(ctx, scope, threadRecord)
		if err != nil {
			return stores.SourceCommentThreadRecord{}, nil, err
		}
	} else if !isNotFound(err) {
		return stores.SourceCommentThreadRecord{}, nil, err
	} else {
		threadRecord.CreatedAt = time.Now().UTC()
		threadRecord.UpdatedAt = threadRecord.CreatedAt
		threadRecord, err = lineage.CreateSourceCommentThread(ctx, scope, threadRecord)
		if err != nil {
			return stores.SourceCommentThreadRecord{}, nil, err
		}
	}
	if err := lineage.DeleteSourceCommentMessages(ctx, scope, stores.SourceCommentMessageQuery{
		SourceCommentThreadID: threadRecord.ID,
	}); err != nil {
		return stores.SourceCommentThreadRecord{}, nil, err
	}

	messageRecords := make([]stores.SourceCommentMessageRecord, 0, len(messagesInput))
	for _, messageInput := range messagesInput {
		messageRecord, err := s.upsertMessage(ctx, lineage, scope, revision, threadRecord, messageInput)
		if err != nil {
			return stores.SourceCommentThreadRecord{}, nil, err
		}
		messageRecords = append(messageRecords, messageRecord)
	}
	sort.SliceStable(messageRecords, func(i, j int) bool {
		if messageRecords[i].CreatedAt.Equal(messageRecords[j].CreatedAt) {
			return messageRecords[i].ID < messageRecords[j].ID
		}
		return messageRecords[i].CreatedAt.Before(messageRecords[j].CreatedAt)
	})
	return threadRecord, messageRecords, nil
}

func (s DefaultSourceCommentSyncService) upsertSyncState(
	ctx context.Context,
	lineage stores.LineageStore,
	scope stores.Scope,
	sourceDocument stores.SourceDocumentRecord,
	revision stores.SourceRevisionRecord,
	providerKind string,
	input SourceCommentSyncInput,
	payloadJSON string,
	payloadSHA string,
	threadCount int,
	messageCount int,
	now time.Time,
) (stores.SourceCommentSyncStateRecord, error) {
	status := firstNonEmpty(strings.TrimSpace(input.SyncStatus), SourceManagementCommentSyncSynced)
	stateRecord := stores.SourceCommentSyncStateRecord{
		ID:               deterministicSourceCommentSyncStateID(revision.ID, providerKind),
		SourceDocumentID: sourceDocument.ID,
		SourceRevisionID: revision.ID,
		ProviderKind:     providerKind,
		SyncStatus:       status,
		ThreadCount:      threadCount,
		MessageCount:     messageCount,
		PayloadSHA256:    payloadSHA,
		PayloadJSON:      payloadJSON,
		LastAttemptAt:    cloneSourceTimePtr(firstNonNilTime(input.AttemptedAt, &now)),
		LastSyncedAt:     cloneSourceTimePtr(input.SyncedAt),
		ErrorCode:        strings.TrimSpace(input.ErrorCode),
		ErrorMessage:     strings.TrimSpace(input.ErrorMessage),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if stateRecord.LastSyncedAt == nil && status == SourceManagementCommentSyncSynced {
		stateRecord.LastSyncedAt = &now
	}
	if existing, err := lineage.GetSourceCommentSyncState(ctx, scope, stateRecord.ID); err == nil {
		if stateRecord.LastSyncedAt == nil && existing.LastSyncedAt != nil {
			stateRecord.LastSyncedAt = cloneSourceTimePtr(existing.LastSyncedAt)
		}
		if strings.TrimSpace(existing.PayloadSHA256) == payloadSHA && strings.TrimSpace(existing.SyncStatus) == strings.TrimSpace(stateRecord.SyncStatus) {
			stateRecord.CreatedAt = existing.CreatedAt
		} else {
			stateRecord.CreatedAt = existing.CreatedAt
		}
		return lineage.SaveSourceCommentSyncState(ctx, scope, stateRecord)
	} else if !isNotFound(err) {
		return stores.SourceCommentSyncStateRecord{}, err
	}
	return lineage.CreateSourceCommentSyncState(ctx, scope, stateRecord)
}

func (s DefaultSourceCommentSyncService) upsertMessage(ctx context.Context, lineage stores.LineageStore, scope stores.Scope, revision stores.SourceRevisionRecord, thread stores.SourceCommentThreadRecord, input SourceCommentProviderMessage) (stores.SourceCommentMessageRecord, error) {
	authorJSON, err := json.Marshal(input.Author)
	if err != nil {
		return stores.SourceCommentMessageRecord{}, err
	}
	messageID := deterministicSourceCommentMessageID(revision.ID, thread.ID, input.ProviderMessageID)
	record := stores.SourceCommentMessageRecord{
		ID:                      messageID,
		SourceCommentThreadID:   thread.ID,
		SourceRevisionID:        revision.ID,
		ProviderMessageID:       strings.TrimSpace(input.ProviderMessageID),
		ProviderParentMessageID: strings.TrimSpace(input.ProviderParentMessageID),
		MessageKind:             firstNonEmpty(strings.TrimSpace(input.MessageKind), stores.SourceCommentMessageKindComment),
		BodyText:                strings.TrimSpace(input.BodyText),
		BodyPreview:             sourceCommentPreview(input.BodyText),
		AuthorJSON:              string(authorJSON),
	}
	if ts := firstNonNilTime(input.UpdatedAt, input.CreatedAt); ts != nil {
		record.UpdatedAt = ts.UTC()
	}
	if record.UpdatedAt.IsZero() {
		record.UpdatedAt = time.Now().UTC()
	}
	if input.CreatedAt != nil {
		record.CreatedAt = input.CreatedAt.UTC()
	}
	if record.CreatedAt.IsZero() {
		record.CreatedAt = record.UpdatedAt
	}
	return lineage.CreateSourceCommentMessage(ctx, scope, record)
}

func (s DefaultSourceCommentSyncService) reconcileDeletedThreads(ctx context.Context, lineage stores.LineageStore, scope stores.Scope, existing []stores.SourceCommentThreadRecord, input SourceCommentSyncInput, incomingThreadIDs map[string]struct{}, now time.Time) error {
	for _, thread := range existing {
		if _, ok := incomingThreadIDs[strings.TrimSpace(thread.ID)]; ok {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(thread.Status), stores.SourceCommentThreadStatusDeleted) {
			continue
		}
		thread.Status = stores.SourceCommentThreadStatusDeleted
		thread.SyncStatus = firstNonEmpty(strings.TrimSpace(input.SyncStatus), SourceManagementCommentSyncSynced)
		thread.LastSyncedAt = cloneSourceTimePtr(firstNonNilTime(input.SyncedAt, &now))
		thread.UpdatedAt = now
		if _, err := lineage.SaveSourceCommentThread(ctx, scope, thread); err != nil {
			return err
		}
	}
	return nil
}

func sourceCommentSyncPayload(input SourceCommentSyncInput) (string, string, error) {
	payload, err := json.Marshal(input)
	if err != nil {
		return "", "", err
	}
	sum := sha256.Sum256(payload)
	return string(payload), hex.EncodeToString(sum[:]), nil
}

func deterministicSourceCommentThreadID(sourceRevisionID, providerKind, providerCommentID string) string {
	return uuid.NewSHA1(sourceCommentNamespace, []byte(strings.Join([]string{"thread", strings.TrimSpace(sourceRevisionID), strings.TrimSpace(providerKind), strings.TrimSpace(providerCommentID)}, "|"))).String()
}

func deterministicSourceCommentMessageID(sourceRevisionID, threadID, providerMessageID string) string {
	return uuid.NewSHA1(sourceCommentNamespace, []byte(strings.Join([]string{"message", strings.TrimSpace(sourceRevisionID), strings.TrimSpace(threadID), strings.TrimSpace(providerMessageID)}, "|"))).String()
}

func deterministicSourceCommentSyncStateID(sourceRevisionID, providerKind string) string {
	return uuid.NewSHA1(sourceCommentNamespace, []byte(strings.Join([]string{"sync", strings.TrimSpace(sourceRevisionID), strings.TrimSpace(providerKind)}, "|"))).String()
}

func buildSourceCommentThreadSummary(sourceDocument stores.SourceDocumentRecord, revision stores.SourceRevisionRecord, thread stores.SourceCommentThreadRecord, messages []stores.SourceCommentMessageRecord) SourceCommentThreadSummary {
	return SourceCommentThreadSummary{
		ID:                strings.TrimSpace(thread.ID),
		ProviderCommentID: strings.TrimSpace(thread.ProviderCommentID),
		ThreadID:          strings.TrimSpace(thread.ThreadID),
		Status:            strings.TrimSpace(thread.Status),
		Source:            sourceLineageReference(sourceDocument),
		Revision:          sourceRevisionSummaryFromRecord(revision),
		Anchor:            sourceCommentAnchorSummaryFromRecord(thread),
		AuthorName:        sourceCommentAuthorDisplayName(thread.AuthorJSON),
		Author:            sourceCommentAuthorSummary(thread.AuthorJSON),
		BodyPreview:       strings.TrimSpace(thread.BodyPreview),
		MessageCount:      thread.MessageCount,
		ReplyCount:        thread.ReplyCount,
		Messages:          sourceCommentMessageSummaries(messages),
		ResolvedAt:        cloneSourceTimePtr(thread.ResolvedAt),
		LastSyncedAt:      cloneSourceTimePtr(thread.LastSyncedAt),
		SyncStatus:        strings.TrimSpace(thread.SyncStatus),
		Links:             SourceManagementLinks{Self: sourceManagementRevisionCommentsPath(revision.ID)},
	}
}

func sourceCommentMessageSummaries(records []stores.SourceCommentMessageRecord) []SourceCommentMessageSummary {
	out := make([]SourceCommentMessageSummary, 0, len(records))
	for _, record := range records {
		out = append(out, SourceCommentMessageSummary{
			ID:                strings.TrimSpace(record.ID),
			ProviderMessageID: strings.TrimSpace(record.ProviderMessageID),
			MessageKind:       strings.TrimSpace(record.MessageKind),
			BodyPreview:       strings.TrimSpace(record.BodyPreview),
			Author:            sourceCommentAuthorSummary(record.AuthorJSON),
			CreatedAt:         cloneSourceTimePtr(&record.CreatedAt),
		})
	}
	return out
}

func (s DefaultSourceCommentSyncService) recordSourceRevisionCommentSyncFailureWithLineage(ctx context.Context, lineage stores.LineageStore, scope stores.Scope, input SourceCommentSyncFailureInput) (SourceCommentSyncResult, error) {
	sourceRevisionID := strings.TrimSpace(input.SourceRevisionID)
	if sourceRevisionID == "" {
		return SourceCommentSyncResult{}, domainValidationError("source_comment_sync", "source_revision_id", "required")
	}
	revision, err := lineage.GetSourceRevision(ctx, scope, sourceRevisionID)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	sourceDocumentID := firstNonEmpty(strings.TrimSpace(input.SourceDocumentID), strings.TrimSpace(revision.SourceDocumentID))
	if sourceDocumentID == "" {
		return SourceCommentSyncResult{}, domainValidationError("source_comment_sync", "source_document_id", "required")
	}
	sourceDocument, err := lineage.GetSourceDocument(ctx, scope, sourceDocumentID)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	providerKind := firstNonEmpty(strings.TrimSpace(input.ProviderKind), strings.TrimSpace(sourceDocument.ProviderKind), stores.SourceProviderKindGoogleDrive)
	threadCount, messageCount, err := sourceCommentRevisionCounts(ctx, lineage, scope, revision.ID)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	attemptedAt := cloneSourceTimePtr(firstNonNilTime(input.AttemptedAt, new(time.Time)))
	if attemptedAt == nil {
		now := time.Now().UTC()
		attemptedAt = &now
	}
	failurePayload := SourceCommentSyncInput{
		SourceDocumentID: sourceDocument.ID,
		SourceRevisionID: revision.ID,
		ProviderKind:     providerKind,
		SyncStatus:       SourceManagementCommentSyncFailed,
		AttemptedAt:      cloneSourceTimePtr(attemptedAt),
		ErrorCode:        strings.TrimSpace(input.ErrorCode),
		ErrorMessage:     strings.TrimSpace(input.ErrorMessage),
	}
	payloadJSON, payloadSHA, err := sourceCommentSyncPayload(failurePayload)
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	state, err := s.upsertSyncState(ctx, lineage, scope, sourceDocument, revision, providerKind, SourceCommentSyncInput{
		SourceDocumentID: sourceDocument.ID,
		SourceRevisionID: revision.ID,
		ProviderKind:     providerKind,
		SyncStatus:       SourceManagementCommentSyncFailed,
		AttemptedAt:      cloneSourceTimePtr(attemptedAt),
		ErrorCode:        strings.TrimSpace(input.ErrorCode),
		ErrorMessage:     strings.TrimSpace(input.ErrorMessage),
	}, payloadJSON, payloadSHA, threadCount, messageCount, attemptedAt.UTC())
	if err != nil {
		return SourceCommentSyncResult{}, err
	}
	return SourceCommentSyncResult{
		SourceDocumentID: sourceDocument.ID,
		SourceRevisionID: revision.ID,
		Sync:             sourceCommentSyncSummaryFromRecord(state),
	}, nil
}

func replayableSourceCommentSyncInput(states []stores.SourceCommentSyncStateRecord) (stores.SourceCommentSyncStateRecord, SourceCommentSyncInput, error) {
	if len(states) == 0 {
		return stores.SourceCommentSyncStateRecord{}, SourceCommentSyncInput{}, debugLineageNotFound("source_comment_sync_states", "")
	}
	for idx := len(states) - 1; idx >= 0; idx-- {
		state := states[idx]
		input := SourceCommentSyncInput{}
		if err := json.Unmarshal([]byte(strings.TrimSpace(state.PayloadJSON)), &input); err != nil {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(state.SyncStatus), SourceManagementCommentSyncFailed) && len(input.Threads) == 0 {
			continue
		}
		return state, input, nil
	}
	state := states[len(states)-1]
	input := SourceCommentSyncInput{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(state.PayloadJSON)), &input); err != nil {
		return stores.SourceCommentSyncStateRecord{}, SourceCommentSyncInput{}, err
	}
	return state, input, nil
}

func sourceCommentRevisionCounts(ctx context.Context, lineage stores.LineageStore, scope stores.Scope, sourceRevisionID string) (int, int, error) {
	threads, err := lineage.ListSourceCommentThreads(ctx, scope, stores.SourceCommentThreadQuery{
		SourceRevisionID: sourceRevisionID,
	})
	if err != nil {
		return 0, 0, err
	}
	messages, err := lineage.ListSourceCommentMessages(ctx, scope, stores.SourceCommentMessageQuery{
		SourceRevisionID: sourceRevisionID,
	})
	if err != nil {
		return 0, 0, err
	}
	return len(threads), len(messages), nil
}

func sourceCommentSyncFailureCode(err error) string {
	if err == nil {
		return ""
	}
	return strings.TrimSpace(strings.ReplaceAll(strings.ToLower(err.Error()), " ", "_"))
}

func sourceCommentSyncSummaryFromRecord(record stores.SourceCommentSyncStateRecord) SourceCommentSyncSummary {
	return SourceCommentSyncSummary{
		Status:        strings.TrimSpace(record.SyncStatus),
		ThreadCount:   record.ThreadCount,
		MessageCount:  record.MessageCount,
		LastAttemptAt: cloneSourceTimePtr(record.LastAttemptAt),
		LastSyncedAt:  cloneSourceTimePtr(record.LastSyncedAt),
		ErrorCode:     strings.TrimSpace(record.ErrorCode),
		ErrorMessage:  strings.TrimSpace(record.ErrorMessage),
	}
}

func sourceCommentAnchorSummaryFromRecord(record stores.SourceCommentThreadRecord) *SourceCommentAnchorSummary {
	decoded := SourceCommentProviderAnchor{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(record.AnchorJSON)), &decoded); err != nil {
		return &SourceCommentAnchorSummary{
			Kind:  strings.TrimSpace(record.AnchorKind),
			Label: strings.TrimSpace(record.AnchorKind),
		}
	}
	label := strings.TrimSpace(decoded.Label)
	if label == "" {
		label = strings.TrimSpace(record.AnchorKind)
	}
	return &SourceCommentAnchorSummary{
		Kind:  firstNonEmpty(strings.TrimSpace(decoded.Kind), strings.TrimSpace(record.AnchorKind)),
		Label: label,
	}
}

func sourceCommentAuthorSummary(raw string) *SourceCommentAuthorSummary {
	decoded := SourceCommentProviderAuthor{}
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &decoded); err != nil {
		return nil
	}
	return &SourceCommentAuthorSummary{
		DisplayName: strings.TrimSpace(decoded.DisplayName),
		Email:       strings.TrimSpace(decoded.Email),
		Type:        strings.TrimSpace(decoded.Type),
	}
}

func sourceCommentAuthorDisplayName(raw string) string {
	if author := sourceCommentAuthorSummary(raw); author != nil {
		return firstNonEmpty(strings.TrimSpace(author.DisplayName), strings.TrimSpace(author.Email))
	}
	return ""
}

func sortSourceCommentSyncStates(states []stores.SourceCommentSyncStateRecord) {
	sort.SliceStable(states, func(i, j int) bool {
		if states[i].UpdatedAt.Equal(states[j].UpdatedAt) {
			return states[i].ID < states[j].ID
		}
		return states[i].UpdatedAt.Before(states[j].UpdatedAt)
	})
}

func latestProviderMessageTime(messages []SourceCommentProviderMessage) *time.Time {
	var latest *time.Time
	for _, message := range messages {
		candidate := firstNonNilTime(message.UpdatedAt, message.CreatedAt)
		if candidate == nil {
			continue
		}
		if latest == nil || candidate.After(*latest) {
			ts := candidate.UTC()
			latest = &ts
		}
	}
	return latest
}

func firstThreadMessageBody(messages []SourceCommentProviderMessage) string {
	for _, message := range messages {
		if value := strings.TrimSpace(message.BodyText); value != "" {
			return value
		}
	}
	return ""
}

func firstNonNilTime(values ...*time.Time) *time.Time {
	for _, value := range values {
		if value != nil && !value.IsZero() {
			ts := value.UTC()
			return &ts
		}
	}
	return nil
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func sourceCommentPreview(value string) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= 240 {
		return trimmed
	}
	return strings.TrimSpace(trimmed[:240])
}
