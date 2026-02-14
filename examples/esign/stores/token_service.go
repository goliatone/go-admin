package stores

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"strings"
	"time"

	goerrors "github.com/goliatone/go-errors"
)

const defaultSignerTokenTTL = 72 * time.Hour

// TokenServiceOption customizes token service behavior.
type TokenServiceOption func(*TokenService)

// IssuedSigningToken contains the opaque token value and persisted metadata.
type IssuedSigningToken struct {
	Token  string
	Record SigningTokenRecord
}

// TokenService issues and validates signer tokens with hash-only persistence.
type TokenService struct {
	store  SigningTokenStore
	tx     TransactionManager
	now    func() time.Time
	ttl    time.Duration
	random io.Reader
	pepper string
}

func NewTokenService(store SigningTokenStore, opts ...TokenServiceOption) TokenService {
	svc := TokenService{
		store:  store,
		now:    func() time.Time { return time.Now().UTC() },
		ttl:    defaultSignerTokenTTL,
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

func WithTokenTTL(ttl time.Duration) TokenServiceOption {
	return func(s *TokenService) {
		if s == nil || ttl <= 0 {
			return
		}
		s.ttl = ttl
	}
}

func WithTokenClock(now func() time.Time) TokenServiceOption {
	return func(s *TokenService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

func WithTokenEntropySource(source io.Reader) TokenServiceOption {
	return func(s *TokenService) {
		if s == nil || source == nil {
			return
		}
		s.random = source
	}
}

func WithTokenPepper(pepper string) TokenServiceOption {
	return func(s *TokenService) {
		if s == nil {
			return
		}
		s.pepper = strings.TrimSpace(pepper)
	}
}

func (s TokenService) Issue(ctx context.Context, scope Scope, agreementID, recipientID string) (IssuedSigningToken, error) {
	if s.tx != nil {
		var issued IssuedSigningToken
		if err := s.tx.WithTx(ctx, func(tx TxStore) error {
			var err error
			issued, err = s.issueWithStore(ctx, tx, scope, agreementID, recipientID)
			return err
		}); err != nil {
			return IssuedSigningToken{}, err
		}
		return issued, nil
	}
	return s.issueWithStore(ctx, s.store, scope, agreementID, recipientID)
}

func (s TokenService) issueWithStore(ctx context.Context, store SigningTokenStore, scope Scope, agreementID, recipientID string) (IssuedSigningToken, error) {
	if store == nil {
		return IssuedSigningToken{}, invalidRecordError("signing_tokens", "store", "not configured")
	}
	scope, err := validateScope(scope)
	if err != nil {
		return IssuedSigningToken{}, err
	}
	agreementID = normalizeID(agreementID)
	recipientID = normalizeID(recipientID)
	if agreementID == "" {
		return IssuedSigningToken{}, invalidRecordError("signing_tokens", "agreement_id", "required")
	}
	if recipientID == "" {
		return IssuedSigningToken{}, invalidRecordError("signing_tokens", "recipient_id", "required")
	}

	rawToken, err := generateOpaqueToken(s.random)
	if err != nil {
		return IssuedSigningToken{}, err
	}
	now := s.now()
	record, err := store.CreateSigningToken(ctx, scope, SigningTokenRecord{
		AgreementID: agreementID,
		RecipientID: recipientID,
		TokenHash:   s.hashToken(rawToken),
		Status:      SigningTokenStatusActive,
		ExpiresAt:   now.Add(s.ttl),
		CreatedAt:   now,
	})
	if err != nil {
		return IssuedSigningToken{}, err
	}

	return IssuedSigningToken{Token: rawToken, Record: record}, nil
}

func (s TokenService) Rotate(ctx context.Context, scope Scope, agreementID, recipientID string) (IssuedSigningToken, error) {
	if s.store == nil {
		return IssuedSigningToken{}, invalidRecordError("signing_tokens", "store", "not configured")
	}
	if s.tx != nil {
		var issued IssuedSigningToken
		if err := s.tx.WithTx(ctx, func(tx TxStore) error {
			now := s.now()
			if _, err := tx.RevokeActiveSigningTokens(ctx, scope, agreementID, recipientID, now); err != nil {
				return err
			}
			var err error
			issued, err = s.issueWithStore(ctx, tx, scope, agreementID, recipientID)
			return err
		}); err != nil {
			return IssuedSigningToken{}, err
		}
		return issued, nil
	}
	now := s.now()
	if _, err := s.store.RevokeActiveSigningTokens(ctx, scope, agreementID, recipientID, now); err != nil {
		return IssuedSigningToken{}, err
	}
	return s.issueWithStore(ctx, s.store, scope, agreementID, recipientID)
}

func (s TokenService) Revoke(ctx context.Context, scope Scope, agreementID, recipientID string) error {
	if s.store == nil {
		return invalidRecordError("signing_tokens", "store", "not configured")
	}
	if s.tx != nil {
		return s.tx.WithTx(ctx, func(tx TxStore) error {
			_, err := tx.RevokeActiveSigningTokens(ctx, scope, agreementID, recipientID, s.now())
			return err
		})
	}
	_, err := s.store.RevokeActiveSigningTokens(ctx, scope, agreementID, recipientID, s.now())
	return err
}

func (s TokenService) Validate(ctx context.Context, scope Scope, rawToken string) (SigningTokenRecord, error) {
	if s.store == nil {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "store", "not configured")
	}
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return SigningTokenRecord{}, invalidTokenError()
	}
	hash := s.hashToken(rawToken)
	record, err := s.store.GetSigningTokenByHash(ctx, scope, hash)
	if err != nil {
		var coded *goerrors.Error
		if errors.As(err, &coded) {
			switch coded.TextCode {
			case "NOT_FOUND":
				return SigningTokenRecord{}, invalidTokenError()
			case "SCOPE_DENIED":
				return SigningTokenRecord{}, scopeDeniedError()
			}
		}
		return SigningTokenRecord{}, err
	}

	if record.Status == SigningTokenStatusRevoked || record.RevokedAt != nil {
		return SigningTokenRecord{}, tokenRevokedError(record.ID)
	}
	if record.Status == SigningTokenStatusExpired || s.now().After(record.ExpiresAt) {
		return SigningTokenRecord{}, tokenExpiredError(record.ID)
	}
	if record.Status != SigningTokenStatusActive {
		return SigningTokenRecord{}, invalidTokenError()
	}

	return record, nil
}

func (s TokenService) hashToken(rawToken string) string {
	payload := strings.TrimSpace(rawToken)
	if payload == "" {
		return ""
	}
	if s.pepper != "" {
		payload += ":" + s.pepper
	}
	sum := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(sum[:])
}

func generateOpaqueToken(source io.Reader) (string, error) {
	if source == nil {
		source = rand.Reader
	}
	buf := make([]byte, 32)
	if _, err := io.ReadFull(source, buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
