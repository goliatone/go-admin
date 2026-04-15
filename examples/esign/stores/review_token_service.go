package stores

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"strings"
	"time"

	goerrors "github.com/goliatone/go-errors"
)

const defaultReviewSessionTokenTTL = 7 * 24 * time.Hour

type ReviewSessionTokenServiceOption func(*ReviewSessionTokenService)

type IssuedReviewSessionToken struct {
	Token  string                   `json:"token"`
	Record ReviewSessionTokenRecord `json:"record"`
}

type ReviewSessionTokenService struct {
	store  ReviewSessionTokenStore
	tx     TransactionManager
	now    func() time.Time
	ttl    time.Duration
	random io.Reader
	pepper string
}

func NewReviewSessionTokenService(store ReviewSessionTokenStore, opts ...ReviewSessionTokenServiceOption) ReviewSessionTokenService {
	svc := ReviewSessionTokenService{
		store:  store,
		now:    func() time.Time { return time.Now().UTC() },
		ttl:    defaultReviewSessionTokenTTL,
		random: rand.Reader,
	}
	if tx, ok := store.(TransactionManager); ok {
		svc.tx = tx
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

func WithReviewSessionTokenTTL(ttl time.Duration) ReviewSessionTokenServiceOption {
	return func(s *ReviewSessionTokenService) {
		if s == nil || ttl <= 0 {
			return
		}
		s.ttl = ttl
	}
}

func WithReviewSessionTokenClock(now func() time.Time) ReviewSessionTokenServiceOption {
	return func(s *ReviewSessionTokenService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

func WithReviewSessionTokenEntropySource(source io.Reader) ReviewSessionTokenServiceOption {
	return func(s *ReviewSessionTokenService) {
		if s == nil || source == nil {
			return
		}
		s.random = source
	}
}

func WithReviewSessionTokenPepper(pepper string) ReviewSessionTokenServiceOption {
	return func(s *ReviewSessionTokenService) {
		if s == nil {
			return
		}
		s.pepper = strings.TrimSpace(pepper)
	}
}

func (s ReviewSessionTokenService) ForTx(tx TxStore) ReviewSessionTokenService {
	if tx == nil {
		return s
	}
	s.store = tx
	s.tx = nil
	return s
}

func (s ReviewSessionTokenService) Issue(ctx context.Context, scope Scope, agreementID, reviewID, participantID string) (IssuedReviewSessionToken, error) {
	return s.issue(ctx, scope, agreementID, reviewID, participantID)
}

func (s ReviewSessionTokenService) issue(ctx context.Context, scope Scope, agreementID, reviewID, participantID string) (IssuedReviewSessionToken, error) {
	if s.tx != nil {
		var issued IssuedReviewSessionToken
		if err := s.tx.WithTx(ctx, func(tx TxStore) error {
			var err error
			issued, err = s.issueWithStore(ctx, tx, scope, agreementID, reviewID, participantID)
			return err
		}); err != nil {
			return IssuedReviewSessionToken{}, err
		}
		return issued, nil
	}
	return s.issueWithStore(ctx, s.store, scope, agreementID, reviewID, participantID)
}

func (s ReviewSessionTokenService) issueWithStore(ctx context.Context, store ReviewSessionTokenStore, scope Scope, agreementID, reviewID, participantID string) (IssuedReviewSessionToken, error) {
	if store == nil {
		return IssuedReviewSessionToken{}, invalidRecordError("review_session_tokens", "store", "not configured")
	}
	scope, err := validateScope(scope)
	if err != nil {
		return IssuedReviewSessionToken{}, err
	}
	agreementID = normalizeID(agreementID)
	reviewID = normalizeID(reviewID)
	participantID = normalizeID(participantID)
	if agreementID == "" {
		return IssuedReviewSessionToken{}, invalidRecordError("review_session_tokens", "agreement_id", "required")
	}
	if reviewID == "" {
		return IssuedReviewSessionToken{}, invalidRecordError("review_session_tokens", "review_id", "required")
	}
	if participantID == "" {
		return IssuedReviewSessionToken{}, invalidRecordError("review_session_tokens", "participant_id", "required")
	}
	rawToken, err := generateOpaqueToken(s.random)
	if err != nil {
		return IssuedReviewSessionToken{}, err
	}
	now := s.now().UTC()
	record, err := store.CreateReviewSessionToken(ctx, scope, ReviewSessionTokenRecord{
		AgreementID:   agreementID,
		ReviewID:      reviewID,
		ParticipantID: participantID,
		TokenHash:     s.hashToken(rawToken),
		Status:        ReviewSessionTokenStatusActive,
		ExpiresAt:     now.Add(s.ttl),
		CreatedAt:     now,
	})
	if err != nil {
		return IssuedReviewSessionToken{}, err
	}
	return IssuedReviewSessionToken{Token: rawToken, Record: record}, nil
}

func (s ReviewSessionTokenService) Rotate(ctx context.Context, scope Scope, agreementID, reviewID, participantID string) (IssuedReviewSessionToken, error) {
	if s.store == nil {
		return IssuedReviewSessionToken{}, invalidRecordError("review_session_tokens", "store", "not configured")
	}
	if s.tx != nil {
		var issued IssuedReviewSessionToken
		if err := s.tx.WithTx(ctx, func(tx TxStore) error {
			now := s.now().UTC()
			if _, err := tx.RevokeActiveReviewSessionTokens(ctx, scope, agreementID, participantID, now); err != nil {
				return err
			}
			var err error
			issued, err = s.issueWithStore(ctx, tx, scope, agreementID, reviewID, participantID)
			return err
		}); err != nil {
			return IssuedReviewSessionToken{}, err
		}
		return issued, nil
	}
	now := s.now().UTC()
	if _, err := s.store.RevokeActiveReviewSessionTokens(ctx, scope, agreementID, participantID, now); err != nil {
		return IssuedReviewSessionToken{}, err
	}
	return s.issueWithStore(ctx, s.store, scope, agreementID, reviewID, participantID)
}

func (s ReviewSessionTokenService) Revoke(ctx context.Context, scope Scope, agreementID, participantID string) error {
	if s.store == nil {
		return invalidRecordError("review_session_tokens", "store", "not configured")
	}
	revoke := func(store ReviewSessionTokenStore) error {
		validatedScope, err := validateScope(scope)
		if err != nil {
			return err
		}
		agreementID = normalizeID(agreementID)
		participantID = normalizeID(participantID)
		if agreementID == "" {
			return invalidRecordError("review_session_tokens", "agreement_id", "required")
		}
		if participantID == "" {
			return invalidRecordError("review_session_tokens", "participant_id", "required")
		}
		now := s.now().UTC()
		_, revokeErr := store.RevokeActiveReviewSessionTokens(ctx, validatedScope, agreementID, participantID, now)
		if revokeErr != nil {
			return revokeErr
		}
		tokens, err := store.ListReviewSessionTokens(ctx, validatedScope, agreementID, participantID)
		if err != nil {
			return err
		}
		for _, record := range tokens {
			if record.RevokedAt != nil || record.Status == ReviewSessionTokenStatusRevoked {
				continue
			}
			record.Status = ReviewSessionTokenStatusRevoked
			record.RevokedAt = tokenTimePtr(now)
			if _, err := store.SaveReviewSessionToken(ctx, scope, record); err != nil {
				return err
			}
		}
		return nil
	}
	if s.tx != nil {
		return s.tx.WithTx(ctx, func(tx TxStore) error {
			return revoke(tx)
		})
	}
	return revoke(s.store)
}

func (s ReviewSessionTokenService) Validate(ctx context.Context, scope Scope, rawToken string) (ReviewSessionTokenRecord, error) {
	if s.store == nil {
		return ReviewSessionTokenRecord{}, invalidRecordError("review_session_tokens", "store", "not configured")
	}
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return ReviewSessionTokenRecord{}, invalidTokenError()
	}
	record, err := s.store.GetReviewSessionTokenByHash(ctx, scope, s.hashToken(rawToken))
	if err != nil {
		var coded *goerrors.Error
		if errors.As(err, &coded) {
			switch coded.TextCode {
			case "NOT_FOUND":
				return ReviewSessionTokenRecord{}, invalidTokenError()
			case "SCOPE_DENIED":
				return ReviewSessionTokenRecord{}, scopeDeniedError()
			}
		}
		return ReviewSessionTokenRecord{}, err
	}
	if record.Status == ReviewSessionTokenStatusRevoked || record.RevokedAt != nil {
		return ReviewSessionTokenRecord{}, tokenRevokedError(record.ID)
	}
	if s.now().After(record.ExpiresAt) {
		return ReviewSessionTokenRecord{}, tokenExpiredError(record.ID)
	}
	if record.Status != ReviewSessionTokenStatusActive {
		return ReviewSessionTokenRecord{}, invalidTokenError()
	}
	return record, nil
}

func (s ReviewSessionTokenService) hashToken(rawToken string) string {
	payload := strings.TrimSpace(rawToken)
	if payload == "" {
		return ""
	}
	if s.pepper != "" {
		payload = s.pepper + ":" + payload
	}
	sum := sha256Digest(payload)
	return sum
}

func sha256Digest(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
