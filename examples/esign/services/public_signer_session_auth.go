package services

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

type publicSignerSessionTokenIssuer interface {
	IssueForSigning(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (stores.IssuedPublicSignerSessionToken, error)
	IssueForReview(ctx context.Context, scope stores.Scope, token stores.ReviewSessionTokenRecord) (stores.IssuedPublicSignerSessionToken, error)
	Validate(ctx context.Context, scope stores.Scope, rawToken string) (stores.PublicSignerSessionTokenRecord, error)
	Revoke(ctx context.Context, scope stores.Scope, agreementID, recipientID, participantID string) error
}

type publicSignerSigningTokenReader interface {
	GetSigningToken(ctx context.Context, scope stores.Scope, id string) (stores.SigningTokenRecord, error)
}

type publicSignerReviewTokenReader interface {
	GetReviewSessionToken(ctx context.Context, scope stores.Scope, id string) (stores.ReviewSessionTokenRecord, error)
}

type PublicSignerSessionPrincipal struct {
	Session     stores.PublicSignerSessionTokenRecord `json:"session"`
	PublicToken PublicReviewToken                     `json:"public_token"`
}

type PublicSignerSessionAuthService struct {
	sessions      publicSignerSessionTokenIssuer
	signingTokens publicSignerSigningTokenReader
	reviewTokens  publicSignerReviewTokenReader
	now           func() time.Time
}

type PublicSignerSessionAuthOption func(*PublicSignerSessionAuthService)

func WithPublicSignerSessionAuthClock(now func() time.Time) PublicSignerSessionAuthOption {
	return func(s *PublicSignerSessionAuthService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

func NewPublicSignerSessionAuthService(
	sessions publicSignerSessionTokenIssuer,
	signingTokens publicSignerSigningTokenReader,
	reviewTokens publicSignerReviewTokenReader,
	opts ...PublicSignerSessionAuthOption,
) PublicSignerSessionAuthService {
	svc := PublicSignerSessionAuthService{
		sessions:      sessions,
		signingTokens: signingTokens,
		reviewTokens:  reviewTokens,
		now:           func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

func (s PublicSignerSessionAuthService) Issue(ctx context.Context, scope stores.Scope, token PublicReviewToken) (stores.IssuedPublicSignerSessionToken, error) {
	switch strings.TrimSpace(token.Kind) {
	case "", PublicReviewTokenKindSigning:
		if token.SigningToken == nil {
			return stores.IssuedPublicSignerSessionToken{}, publicSignerTokenInvalidError()
		}
		if err := s.ensureSigningTokenActive(*token.SigningToken); err != nil {
			return stores.IssuedPublicSignerSessionToken{}, err
		}
		return s.sessions.IssueForSigning(ctx, scope, *token.SigningToken)
	case PublicReviewTokenKindReview:
		if token.ReviewToken == nil {
			return stores.IssuedPublicSignerSessionToken{}, publicSignerTokenInvalidError()
		}
		if err := s.ensureReviewTokenActive(*token.ReviewToken); err != nil {
			return stores.IssuedPublicSignerSessionToken{}, err
		}
		return s.sessions.IssueForReview(ctx, scope, *token.ReviewToken)
	default:
		return stores.IssuedPublicSignerSessionToken{}, publicSignerTokenInvalidError()
	}
}

func (s PublicSignerSessionAuthService) Resolve(ctx context.Context, scope stores.Scope, rawToken string) (PublicSignerSessionPrincipal, error) {
	record, err := s.sessions.Validate(ctx, scope, rawToken)
	if err != nil {
		return PublicSignerSessionPrincipal{}, err
	}
	switch strings.TrimSpace(record.SubjectKind) {
	case stores.PublicSignerSessionSubjectKindSigning:
		if s.signingTokens == nil {
			return PublicSignerSessionPrincipal{}, publicSignerTokenInvalidError()
		}
		signingToken, err := s.signingTokens.GetSigningToken(ctx, scope, record.SigningTokenID)
		if err != nil {
			_ = s.sessions.Revoke(ctx, scope, record.AgreementID, record.RecipientID, "")
			return PublicSignerSessionPrincipal{}, publicSignerTokenInvalidError()
		}
		if err := s.ensureSigningTokenActive(signingToken); err != nil {
			_ = s.sessions.Revoke(ctx, scope, record.AgreementID, record.RecipientID, "")
			return PublicSignerSessionPrincipal{}, err
		}
		if strings.TrimSpace(record.AgreementID) != strings.TrimSpace(signingToken.AgreementID) ||
			strings.TrimSpace(record.RecipientID) != strings.TrimSpace(signingToken.RecipientID) {
			_ = s.sessions.Revoke(ctx, scope, record.AgreementID, record.RecipientID, "")
			return PublicSignerSessionPrincipal{}, publicSignerTokenInvalidError()
		}
		return PublicSignerSessionPrincipal{
			Session:     record,
			PublicToken: PublicReviewTokenFromSigning(signingToken),
		}, nil
	case stores.PublicSignerSessionSubjectKindReview:
		if s.reviewTokens == nil {
			return PublicSignerSessionPrincipal{}, publicSignerTokenInvalidError()
		}
		reviewToken, err := s.reviewTokens.GetReviewSessionToken(ctx, scope, record.ReviewTokenID)
		if err != nil {
			_ = s.sessions.Revoke(ctx, scope, record.AgreementID, "", record.ParticipantID)
			return PublicSignerSessionPrincipal{}, publicSignerTokenInvalidError()
		}
		if err := s.ensureReviewTokenActive(reviewToken); err != nil {
			_ = s.sessions.Revoke(ctx, scope, record.AgreementID, "", record.ParticipantID)
			return PublicSignerSessionPrincipal{}, err
		}
		if strings.TrimSpace(record.AgreementID) != strings.TrimSpace(reviewToken.AgreementID) ||
			strings.TrimSpace(record.ReviewID) != strings.TrimSpace(reviewToken.ReviewID) ||
			strings.TrimSpace(record.ParticipantID) != strings.TrimSpace(reviewToken.ParticipantID) {
			_ = s.sessions.Revoke(ctx, scope, record.AgreementID, "", record.ParticipantID)
			return PublicSignerSessionPrincipal{}, publicSignerTokenInvalidError()
		}
		return PublicSignerSessionPrincipal{
			Session: record,
			PublicToken: PublicReviewToken{
				Kind:        PublicReviewTokenKindReview,
				ReviewToken: &reviewToken,
			},
		}, nil
	default:
		return PublicSignerSessionPrincipal{}, publicSignerTokenInvalidError()
	}
}

func (s PublicSignerSessionAuthService) RevokeSigner(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error {
	return s.sessions.Revoke(ctx, scope, agreementID, recipientID, "")
}

func (s PublicSignerSessionAuthService) RevokeReviewer(ctx context.Context, scope stores.Scope, agreementID, participantID string) error {
	return s.sessions.Revoke(ctx, scope, agreementID, "", participantID)
}

func (s PublicSignerSessionAuthService) ensureSigningTokenActive(token stores.SigningTokenRecord) error {
	if token.RevokedAt != nil || strings.TrimSpace(token.Status) == stores.SigningTokenStatusRevoked {
		return publicSignerTokenRevokedError(token.ID)
	}
	if strings.TrimSpace(token.Status) == stores.SigningTokenStatusExpired || s.now().UTC().After(token.ExpiresAt) {
		return publicSignerTokenExpiredError(token.ID)
	}
	if strings.TrimSpace(token.Status) != stores.SigningTokenStatusActive {
		return publicSignerTokenInvalidError()
	}
	return nil
}

func (s PublicSignerSessionAuthService) ensureReviewTokenActive(token stores.ReviewSessionTokenRecord) error {
	if token.RevokedAt != nil || strings.TrimSpace(token.Status) == stores.ReviewSessionTokenStatusRevoked {
		return publicSignerTokenRevokedError(token.ID)
	}
	if s.now().UTC().After(token.ExpiresAt) {
		return publicSignerTokenExpiredError(token.ID)
	}
	if strings.TrimSpace(token.Status) != stores.ReviewSessionTokenStatusActive {
		return publicSignerTokenInvalidError()
	}
	return nil
}

func publicSignerTokenInvalidError() error {
	return goerrors.New("invalid signing token", goerrors.CategoryAuthz).
		WithCode(http.StatusUnauthorized).
		WithTextCode(string(ErrorCodeTokenInvalid))
}

func publicSignerTokenExpiredError(tokenID string) error {
	return goerrors.New("signing token expired", goerrors.CategoryAuthz).
		WithCode(http.StatusGone).
		WithTextCode(string(ErrorCodeTokenExpired)).
		WithMetadata(map[string]any{"token_id": strings.TrimSpace(tokenID)})
}

func publicSignerTokenRevokedError(tokenID string) error {
	return goerrors.New("signing token revoked", goerrors.CategoryAuthz).
		WithCode(http.StatusGone).
		WithTextCode(string(ErrorCodeTokenRevoked)).
		WithMetadata(map[string]any{"token_id": strings.TrimSpace(tokenID)})
}
