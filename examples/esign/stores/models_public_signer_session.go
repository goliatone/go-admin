package stores

import (
	"time"

	"github.com/uptrace/bun"
)

const (
	PublicSignerSessionSubjectKindSigning = "signing"
	PublicSignerSessionSubjectKindReview  = "review"
)

const (
	PublicSignerSessionTokenStatusActive  = "active"
	PublicSignerSessionTokenStatusRevoked = "revoked"
)

type PublicSignerSessionTokenRecord struct {
	bun.BaseModel  `bun:"table:public_signer_session_tokens,alias:pst"`
	ID             string     `json:"id"`
	TenantID       string     `json:"tenant_id"`
	OrgID          string     `json:"org_id"`
	SubjectKind    string     `json:"subject_kind"`
	AgreementID    string     `json:"agreement_id"`
	RecipientID    string     `json:"recipient_id"`
	ReviewID       string     `json:"review_id"`
	ParticipantID  string     `json:"participant_id"`
	SigningTokenID string     `json:"signing_token_id"`
	ReviewTokenID  string     `json:"review_token_id"`
	TokenHash      string     `json:"token_hash"`
	Status         string     `json:"status"`
	ExpiresAt      time.Time  `json:"expires_at"`
	RevokedAt      *time.Time `json:"revoked_at"`
	CreatedAt      time.Time  `json:"created_at"`
}
