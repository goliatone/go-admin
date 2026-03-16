package services

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

const (
	PublicReviewTokenKindSigning = "signing"
	PublicReviewTokenKindReview  = "review"
)

type PublicReviewToken struct {
	Kind         string
	SigningToken *stores.SigningTokenRecord
	ReviewToken  *stores.ReviewSessionTokenRecord
}

type signingTokenValidator interface {
	Validate(ctx context.Context, scope stores.Scope, rawToken string) (stores.SigningTokenRecord, error)
}

type reviewSessionTokenValidator interface {
	Validate(ctx context.Context, scope stores.Scope, rawToken string) (stores.ReviewSessionTokenRecord, error)
}

type PublicReviewTokenResolver struct {
	signing signingTokenValidator
	review  reviewSessionTokenValidator
}

func NewPublicReviewTokenResolver(signing signingTokenValidator, review reviewSessionTokenValidator) PublicReviewTokenResolver {
	return PublicReviewTokenResolver{
		signing: signing,
		review:  review,
	}
}

func (r PublicReviewTokenResolver) Validate(ctx context.Context, scope stores.Scope, rawToken string) (PublicReviewToken, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return PublicReviewToken{}, publicReviewInvalidTokenError()
	}
	var primaryErr error
	if r.signing != nil {
		record, err := r.signing.Validate(ctx, scope, rawToken)
		if err == nil {
			return PublicReviewToken{
				Kind:         PublicReviewTokenKindSigning,
				SigningToken: &record,
			}, nil
		}
		primaryErr = err
		if !isPublicReviewTokenFallbackCandidate(err) || r.review == nil {
			return PublicReviewToken{}, err
		}
	}
	if r.review != nil {
		record, err := r.review.Validate(ctx, scope, rawToken)
		if err == nil {
			return PublicReviewToken{
				Kind:        PublicReviewTokenKindReview,
				ReviewToken: &record,
			}, nil
		}
		if primaryErr != nil && !isPublicReviewTokenFallbackCandidate(primaryErr) {
			return PublicReviewToken{}, primaryErr
		}
		return PublicReviewToken{}, err
	}
	if primaryErr != nil {
		return PublicReviewToken{}, primaryErr
	}
	return PublicReviewToken{}, publicReviewInvalidTokenError()
}

func PublicReviewTokenFromSigning(token stores.SigningTokenRecord) PublicReviewToken {
	return PublicReviewToken{
		Kind:         PublicReviewTokenKindSigning,
		SigningToken: &token,
	}
}

func isPublicReviewTokenFallbackCandidate(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return false
	}
	switch strings.TrimSpace(coded.TextCode) {
	case "TOKEN_INVALID", "TOKEN_EXPIRED", "TOKEN_REVOKED", "NOT_FOUND":
		return true
	default:
		return false
	}
}

func publicReviewInvalidTokenError() error {
	return goerrors.New("invalid signing token", goerrors.CategoryAuthz).
		WithCode(http.StatusUnauthorized).
		WithTextCode("TOKEN_INVALID")
}
