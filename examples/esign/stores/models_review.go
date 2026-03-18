package stores

import (
	"time"

	"github.com/uptrace/bun"
)

const (
	AgreementReviewStatusNone             = "none"
	AgreementReviewStatusInReview         = "in_review"
	AgreementReviewStatusChangesRequested = "changes_requested"
	AgreementReviewStatusApproved         = "approved"
	AgreementReviewStatusClosed           = "closed"
)

const (
	AgreementReviewGateNone              = "none"
	AgreementReviewGateApproveBeforeSend = "approve_before_send"
	AgreementReviewGateApproveBeforeSign = "approve_before_sign"
)

const (
	AgreementReviewParticipantRoleReviewer = "reviewer"
)

const (
	AgreementReviewParticipantTypeRecipient = "recipient"
	AgreementReviewParticipantTypeExternal  = "external"
)

const (
	AgreementReviewDecisionPending          = "pending"
	AgreementReviewDecisionApproved         = "approved"
	AgreementReviewDecisionChangesRequested = "changes_requested"
	AgreementReviewDecisionDismissed        = "dismissed"
)

const (
	AgreementCommentVisibilityShared   = "shared"
	AgreementCommentVisibilityInternal = "internal"
)

const (
	AgreementCommentAnchorAgreement = "agreement"
	AgreementCommentAnchorPage      = "page"
	AgreementCommentAnchorField     = "field"
)

const (
	AgreementCommentThreadStatusOpen     = "open"
	AgreementCommentThreadStatusResolved = "resolved"
)

const (
	AgreementCommentMessageKindComment = "comment"
	AgreementCommentMessageKindReply   = "reply"
	AgreementCommentMessageKindSystem  = "system"
)

type AgreementReviewRecord struct {
	bun.BaseModel     `bun:"table:agreement_reviews,alias:arv"`
	ID                string     `json:"id"`
	TenantID          string     `json:"tenant_id"`
	OrgID             string     `json:"org_id"`
	AgreementID       string     `json:"agreement_id"`
	Status            string     `json:"status"`
	Gate              string     `json:"gate"`
	RequestedByUserID string     `json:"requested_by_user_id"`
	OpenedAt          *time.Time `json:"opened_at"`
	ClosedAt          *time.Time `json:"closed_at"`
	LastActivityAt    *time.Time `json:"last_activity_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type AgreementReviewParticipantRecord struct {
	bun.BaseModel   `bun:"table:agreement_review_participants,alias:arp"`
	ID              string     `json:"id"`
	TenantID        string     `json:"tenant_id"`
	OrgID           string     `json:"org_id"`
	ReviewID        string     `json:"review_id"`
	ParticipantType string     `json:"participant_type"`
	RecipientID     string     `bun:"recipient_id,nullzero" json:"recipient_id"`
	Email           string     `json:"email"`
	DisplayName     string     `json:"display_name"`
	Role            string     `json:"role"`
	CanComment      bool       `json:"can_comment"`
	CanApprove      bool       `json:"can_approve"`
	DecisionStatus  string     `json:"decision_status"`
	DecisionAt      *time.Time `json:"decision_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type AgreementCommentThreadRecord struct {
	bun.BaseModel  `bun:"table:agreement_comment_threads,alias:act"`
	ID             string     `json:"id"`
	TenantID       string     `json:"tenant_id"`
	OrgID          string     `json:"org_id"`
	AgreementID    string     `json:"agreement_id"`
	ReviewID       string     `json:"review_id"`
	DocumentID     string     `json:"document_id"`
	Visibility     string     `json:"visibility"`
	AnchorType     string     `json:"anchor_type"`
	PageNumber     int        `json:"page_number"`
	FieldID        string     `json:"field_id"`
	AnchorX        float64    `bun:"anchor_x" json:"anchor_x"`
	AnchorY        float64    `bun:"anchor_y" json:"anchor_y"`
	Status         string     `json:"status"`
	CreatedByType  string     `json:"created_by_type"`
	CreatedByID    string     `json:"created_by_id"`
	ResolvedByType string     `json:"resolved_by_type"`
	ResolvedByID   string     `json:"resolved_by_id"`
	ResolvedAt     *time.Time `json:"resolved_at"`
	LastActivityAt *time.Time `json:"last_activity_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type AgreementCommentMessageRecord struct {
	bun.BaseModel `bun:"table:agreement_comment_messages,alias:acm"`
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	OrgID         string    `json:"org_id"`
	ThreadID      string    `json:"thread_id"`
	Body          string    `json:"body"`
	MessageKind   string    `json:"message_kind"`
	CreatedByType string    `json:"created_by_type"`
	CreatedByID   string    `json:"created_by_id"`
	CreatedAt     time.Time `json:"created_at"`
}

type AgreementCommentThreadQuery struct {
	ReviewID   string `json:"review_id"`
	Visibility string `json:"visibility"`
	Status     string `json:"status"`
	Limit      int    `json:"limit"`
	Offset     int    `json:"offset"`
	SortDesc   bool   `json:"sort_desc"`
}

const (
	ReviewSessionTokenStatusActive  = "active"
	ReviewSessionTokenStatusRevoked = "revoked"
)

type ReviewSessionTokenRecord struct {
	bun.BaseModel `bun:"table:review_session_tokens,alias:rst"`
	ID            string     `json:"id"`
	TenantID      string     `json:"tenant_id"`
	OrgID         string     `json:"org_id"`
	AgreementID   string     `json:"agreement_id"`
	ReviewID      string     `json:"review_id"`
	ParticipantID string     `json:"participant_id"`
	TokenHash     string     `json:"token_hash"`
	Status        string     `json:"status"`
	ExpiresAt     time.Time  `json:"expires_at"`
	RevokedAt     *time.Time `json:"revoked_at"`
	CreatedAt     time.Time  `json:"created_at"`
}
