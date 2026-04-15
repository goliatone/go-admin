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

const defaultPublicSignerSessionTokenTTL = time.Hour

type PublicSignerSessionTokenServiceOption func(*PublicSignerSessionTokenService)

type IssuedPublicSignerSessionToken struct {
	Token  string                         `json:"token"`
	Record PublicSignerSessionTokenRecord `json:"record"`
}

type PublicSignerSessionTokenService struct {
	store  PublicSignerSessionTokenStore
	tx     TransactionManager
	now    func() time.Time
	ttl    time.Duration
	random io.Reader
	pepper string
}

func NewPublicSignerSessionTokenService(store PublicSignerSessionTokenStore, opts ...PublicSignerSessionTokenServiceOption) PublicSignerSessionTokenService {
	svc := PublicSignerSessionTokenService{
		store:  store,
		now:    func() time.Time { return time.Now().UTC() },
		ttl:    defaultPublicSignerSessionTokenTTL,
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

func WithPublicSignerSessionTokenTTL(ttl time.Duration) PublicSignerSessionTokenServiceOption {
	return func(s *PublicSignerSessionTokenService) {
		if s == nil || ttl <= 0 {
			return
		}
		s.ttl = ttl
	}
}

func WithPublicSignerSessionTokenClock(now func() time.Time) PublicSignerSessionTokenServiceOption {
	return func(s *PublicSignerSessionTokenService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

func WithPublicSignerSessionTokenEntropySource(source io.Reader) PublicSignerSessionTokenServiceOption {
	return func(s *PublicSignerSessionTokenService) {
		if s == nil || source == nil {
			return
		}
		s.random = source
	}
}

func WithPublicSignerSessionTokenPepper(pepper string) PublicSignerSessionTokenServiceOption {
	return func(s *PublicSignerSessionTokenService) {
		if s == nil {
			return
		}
		s.pepper = strings.TrimSpace(pepper)
	}
}

func (s PublicSignerSessionTokenService) ForTx(tx TxStore) PublicSignerSessionTokenService {
	if tx == nil {
		return s
	}
	s.store = tx
	s.tx = nil
	return s
}

func (s PublicSignerSessionTokenService) IssueForSigning(ctx context.Context, scope Scope, token SigningTokenRecord) (IssuedPublicSignerSessionToken, error) {
	return s.issue(ctx, scope, PublicSignerSessionTokenRecord{
		SubjectKind:    PublicSignerSessionSubjectKindSigning,
		AgreementID:    strings.TrimSpace(token.AgreementID),
		RecipientID:    strings.TrimSpace(token.RecipientID),
		SigningTokenID: strings.TrimSpace(token.ID),
	})
}

func (s PublicSignerSessionTokenService) IssueForReview(ctx context.Context, scope Scope, token ReviewSessionTokenRecord) (IssuedPublicSignerSessionToken, error) {
	return s.issue(ctx, scope, PublicSignerSessionTokenRecord{
		SubjectKind:   PublicSignerSessionSubjectKindReview,
		AgreementID:   strings.TrimSpace(token.AgreementID),
		ReviewID:      strings.TrimSpace(token.ReviewID),
		ParticipantID: strings.TrimSpace(token.ParticipantID),
		ReviewTokenID: strings.TrimSpace(token.ID),
	})
}

func (s PublicSignerSessionTokenService) issue(ctx context.Context, scope Scope, record PublicSignerSessionTokenRecord) (IssuedPublicSignerSessionToken, error) {
	if s.tx != nil {
		var issued IssuedPublicSignerSessionToken
		if err := s.tx.WithTx(ctx, func(tx TxStore) error {
			var err error
			issued, err = s.issueWithStore(ctx, tx, scope, record)
			return err
		}); err != nil {
			return IssuedPublicSignerSessionToken{}, err
		}
		return issued, nil
	}
	return s.issueWithStore(ctx, s.store, scope, record)
}

func (s PublicSignerSessionTokenService) issueWithStore(ctx context.Context, store PublicSignerSessionTokenStore, scope Scope, record PublicSignerSessionTokenRecord) (IssuedPublicSignerSessionToken, error) {
	if store == nil {
		return IssuedPublicSignerSessionToken{}, invalidRecordError("public_signer_session_tokens", "store", "not configured")
	}
	scope, err := validateScope(scope)
	if err != nil {
		return IssuedPublicSignerSessionToken{}, err
	}
	rawToken, err := generateOpaqueToken(s.random)
	if err != nil {
		return IssuedPublicSignerSessionToken{}, err
	}
	now := s.now().UTC()
	record.TokenHash = s.hashToken(rawToken)
	record.Status = PublicSignerSessionTokenStatusActive
	record.ExpiresAt = now.Add(s.ttl)
	record.CreatedAt = now
	created, err := store.CreatePublicSignerSessionToken(ctx, scope, record)
	if err != nil {
		return IssuedPublicSignerSessionToken{}, err
	}
	return IssuedPublicSignerSessionToken{Token: rawToken, Record: created}, nil
}

func (s PublicSignerSessionTokenService) Validate(ctx context.Context, scope Scope, rawToken string) (PublicSignerSessionTokenRecord, error) {
	if s.store == nil {
		return PublicSignerSessionTokenRecord{}, invalidRecordError("public_signer_session_tokens", "store", "not configured")
	}
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return PublicSignerSessionTokenRecord{}, invalidTokenError()
	}
	record, err := s.store.GetPublicSignerSessionTokenByHash(ctx, scope, s.hashToken(rawToken))
	if err != nil {
		var coded *goerrors.Error
		if errors.As(err, &coded) {
			switch coded.TextCode {
			case "NOT_FOUND":
				return PublicSignerSessionTokenRecord{}, invalidTokenError()
			case "SCOPE_DENIED":
				return PublicSignerSessionTokenRecord{}, scopeDeniedError()
			}
		}
		return PublicSignerSessionTokenRecord{}, err
	}
	if record.Status == PublicSignerSessionTokenStatusRevoked || record.RevokedAt != nil {
		return PublicSignerSessionTokenRecord{}, tokenRevokedError(record.ID)
	}
	if s.now().UTC().After(record.ExpiresAt) {
		return PublicSignerSessionTokenRecord{}, tokenExpiredError(record.ID)
	}
	return record, nil
}

func (s PublicSignerSessionTokenService) Revoke(ctx context.Context, scope Scope, agreementID, recipientID, participantID string) error {
	if s.store == nil {
		return invalidRecordError("public_signer_session_tokens", "store", "not configured")
	}
	revoke := func(store PublicSignerSessionTokenStore) error {
		validatedScope, err := validateScope(scope)
		if err != nil {
			return err
		}
		agreementID = normalizeID(agreementID)
		recipientID = normalizeID(recipientID)
		participantID = normalizeID(participantID)
		if agreementID == "" {
			return invalidRecordError("public_signer_session_tokens", "agreement_id", "required")
		}
		if recipientID == "" && participantID == "" {
			return invalidRecordError("public_signer_session_tokens", "recipient_id|participant_id", "required")
		}
		now := s.now().UTC()
		_, revokeErr := store.RevokeActivePublicSignerSessionTokens(ctx, validatedScope, agreementID, recipientID, participantID, now)
		if revokeErr != nil {
			return revokeErr
		}
		tokens, err := store.ListPublicSignerSessionTokens(ctx, validatedScope, agreementID, recipientID, participantID)
		if err != nil {
			return err
		}
		for _, record := range tokens {
			if record.RevokedAt != nil || record.Status == PublicSignerSessionTokenStatusRevoked {
				continue
			}
			record.Status = PublicSignerSessionTokenStatusRevoked
			record.RevokedAt = tokenTimePtr(now)
			if _, err := store.SavePublicSignerSessionToken(ctx, scope, record); err != nil {
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

func (s PublicSignerSessionTokenService) hashToken(rawToken string) string {
	payload := strings.TrimSpace(rawToken)
	if s.pepper != "" {
		payload = s.pepper + ":" + payload
	}
	sum := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(sum[:])
}
