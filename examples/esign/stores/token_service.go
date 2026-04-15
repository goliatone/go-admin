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
	"sync"
	"time"

	goerrors "github.com/goliatone/go-errors"
)

const defaultSignerTokenTTL = 72 * time.Hour

// TokenServiceOption customizes token service behavior.
type TokenServiceOption func(*TokenService)

// IssuedSigningToken contains the opaque token value and persisted metadata.
type IssuedSigningToken struct {
	Token  string             `json:"token"`
	Record SigningTokenRecord `json:"record"`
}

// SigningTokenObserver receives successfully issued raw signer tokens.
type SigningTokenObserver func(scope Scope, agreementID, recipientID, token string)

var signingTokenObserver = struct {
	mu sync.RWMutex
	fn SigningTokenObserver
}{}

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

// SetSigningTokenObserver configures an optional observer used by tests that
// need deterministic access to freshly issued raw signer tokens.
func SetSigningTokenObserver(observer SigningTokenObserver) {
	signingTokenObserver.mu.Lock()
	defer signingTokenObserver.mu.Unlock()
	signingTokenObserver.fn = observer
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

// ForTx returns a copy of the token service bound to the provided tx store.
// The returned service does not open nested transactions.
func (s TokenService) ForTx(tx TxStore) TokenService {
	if tx == nil {
		return s
	}
	s.store = tx
	s.tx = nil
	return s
}

func (s TokenService) Issue(ctx context.Context, scope Scope, agreementID, recipientID string) (IssuedSigningToken, error) {
	return s.issueWithStatus(ctx, scope, agreementID, recipientID, SigningTokenStatusActive)
}

func (s TokenService) IssuePending(ctx context.Context, scope Scope, agreementID, recipientID string) (IssuedSigningToken, error) {
	return s.issueWithStatus(ctx, scope, agreementID, recipientID, SigningTokenStatusPending)
}

func (s TokenService) issueWithStatus(ctx context.Context, scope Scope, agreementID, recipientID, status string) (IssuedSigningToken, error) {
	if s.tx != nil {
		var issued IssuedSigningToken
		if err := s.tx.WithTx(ctx, func(tx TxStore) error {
			var err error
			issued, err = s.issueWithStore(ctx, tx, scope, agreementID, recipientID, status)
			return err
		}); err != nil {
			return IssuedSigningToken{}, err
		}
		return issued, nil
	}
	return s.issueWithStore(ctx, s.store, scope, agreementID, recipientID, status)
}

func (s TokenService) issueWithStore(ctx context.Context, store SigningTokenStore, scope Scope, agreementID, recipientID, status string) (IssuedSigningToken, error) {
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
		Status:      status,
		ExpiresAt:   now.Add(s.ttl),
		CreatedAt:   now,
	})
	if err != nil {
		return IssuedSigningToken{}, err
	}
	notifySigningTokenIssued(scope, agreementID, recipientID, rawToken)

	return IssuedSigningToken{Token: rawToken, Record: record}, nil
}

func notifySigningTokenIssued(scope Scope, agreementID, recipientID, token string) {
	signingTokenObserver.mu.RLock()
	observer := signingTokenObserver.fn
	signingTokenObserver.mu.RUnlock()
	if observer != nil {
		observer(scope, agreementID, recipientID, token)
	}
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
			issued, err = s.issueWithStore(ctx, tx, scope, agreementID, recipientID, SigningTokenStatusActive)
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
	return s.issueWithStore(ctx, s.store, scope, agreementID, recipientID, SigningTokenStatusActive)
}

func (s TokenService) Revoke(ctx context.Context, scope Scope, agreementID, recipientID string) error {
	if s.store == nil {
		return invalidRecordError("signing_tokens", "store", "not configured")
	}
	revoke := func(store SigningTokenStore) error {
		validatedScope, err := validateScope(scope)
		if err != nil {
			return err
		}
		agreementID = normalizeID(agreementID)
		recipientID = normalizeID(recipientID)
		if agreementID == "" {
			return invalidRecordError("signing_tokens", "agreement_id", "required")
		}
		if recipientID == "" {
			return invalidRecordError("signing_tokens", "recipient_id", "required")
		}
		now := s.now().UTC()
		_, revokeErr := store.RevokeActiveSigningTokens(ctx, validatedScope, agreementID, recipientID, now)
		if revokeErr != nil {
			return revokeErr
		}
		tokens, err := store.ListSigningTokens(ctx, validatedScope, agreementID, recipientID)
		if err != nil {
			return err
		}
		for _, record := range tokens {
			if record.RevokedAt != nil {
				continue
			}
			switch record.Status {
			case SigningTokenStatusPending:
				record.Status = SigningTokenStatusAborted
				record.RevokedAt = tokenTimePtr(now)
				record.ActivatedAt = nil
			case SigningTokenStatusActive:
				record.Status = SigningTokenStatusRevoked
				record.RevokedAt = tokenTimePtr(now)
			default:
				continue
			}
			if _, err := store.SaveSigningToken(ctx, scope, record); err != nil {
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

// ResolveRawToken loads the persisted token record for a raw token without enforcing token status.
func (s TokenService) ResolveRawToken(ctx context.Context, scope Scope, rawToken string) (SigningTokenRecord, error) {
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
	return record, nil
}

func (s TokenService) PromotePending(ctx context.Context, scope Scope, tokenID string) (SigningTokenRecord, error) {
	if s.store == nil {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "store", "not configured")
	}
	scope, err := validateScope(scope)
	if err != nil {
		return SigningTokenRecord{}, err
	}
	tokenID = normalizeID(tokenID)
	if tokenID == "" {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "id", "required")
	}
	promote := func(store SigningTokenStore) (SigningTokenRecord, error) {
		record, err := store.GetSigningToken(ctx, scope, tokenID)
		if err != nil {
			return SigningTokenRecord{}, err
		}
		if record.Status == SigningTokenStatusActive {
			return record, nil
		}
		if record.Status != SigningTokenStatusPending {
			return SigningTokenRecord{}, invalidRecordError("signing_tokens", "status", "token is not pending")
		}
		now := s.now().UTC()
		tokens, err := store.ListSigningTokens(ctx, scope, record.AgreementID, record.RecipientID)
		if err != nil {
			return SigningTokenRecord{}, err
		}
		for _, candidate := range tokens {
			switch candidate.Status {
			case SigningTokenStatusActive:
				candidate.Status = SigningTokenStatusSuperseded
				candidate.RevokedAt = tokenTimePtr(now)
				if _, err := store.SaveSigningToken(ctx, scope, candidate); err != nil {
					return SigningTokenRecord{}, err
				}
			}
		}
		record.Status = SigningTokenStatusActive
		record.ActivatedAt = tokenTimePtr(now)
		record.RevokedAt = nil
		return store.SaveSigningToken(ctx, scope, record)
	}
	if s.tx != nil {
		var promoted SigningTokenRecord
		err := s.tx.WithTx(ctx, func(tx TxStore) error {
			var innerErr error
			promoted, innerErr = promote(tx)
			return innerErr
		})
		return promoted, err
	}
	return promote(s.store)
}

func (s TokenService) AbortPending(ctx context.Context, scope Scope, tokenID string) (SigningTokenRecord, error) {
	if s.store == nil {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "store", "not configured")
	}
	scope, err := validateScope(scope)
	if err != nil {
		return SigningTokenRecord{}, err
	}
	tokenID = normalizeID(tokenID)
	if tokenID == "" {
		return SigningTokenRecord{}, invalidRecordError("signing_tokens", "id", "required")
	}
	abort := func(store SigningTokenStore) (SigningTokenRecord, error) {
		record, err := store.GetSigningToken(ctx, scope, tokenID)
		if err != nil {
			return SigningTokenRecord{}, err
		}
		if record.Status == SigningTokenStatusAborted {
			return record, nil
		}
		if record.Status != SigningTokenStatusPending {
			return SigningTokenRecord{}, invalidRecordError("signing_tokens", "status", "token is not pending")
		}
		now := s.now().UTC()
		record.Status = SigningTokenStatusAborted
		record.RevokedAt = tokenTimePtr(now)
		record.ActivatedAt = nil
		return store.SaveSigningToken(ctx, scope, record)
	}
	if s.tx != nil {
		var aborted SigningTokenRecord
		err := s.tx.WithTx(ctx, func(tx TxStore) error {
			var innerErr error
			aborted, innerErr = abort(tx)
			return innerErr
		})
		return aborted, err
	}
	return abort(s.store)
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

func tokenTimePtr(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	normalized := value.UTC()
	return &normalized
}
