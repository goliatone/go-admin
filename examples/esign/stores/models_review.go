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
	ID                string
	TenantID          string
	OrgID             string
	AgreementID       string
	Status            string
	Gate              string
	RequestedByUserID string
	OpenedAt          *time.Time
	ClosedAt          *time.Time
	LastActivityAt    *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type AgreementReviewParticipantRecord struct {
	bun.BaseModel  `bun:"table:agreement_review_participants,alias:arp"`
	ID             string
	TenantID       string
	OrgID          string
	ReviewID       string
	RecipientID    string
	Role           string
	CanComment     bool
	CanApprove     bool
	DecisionStatus string
	DecisionAt     *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type AgreementCommentThreadRecord struct {
	bun.BaseModel  `bun:"table:agreement_comment_threads,alias:act"`
	ID             string
	TenantID       string
	OrgID          string
	AgreementID    string
	ReviewID       string
	DocumentID     string
	Visibility     string
	AnchorType     string
	PageNumber     int
	FieldID        string
	AnchorX        float64
	AnchorY        float64
	Status         string
	CreatedByType  string
	CreatedByID    string
	ResolvedByType string
	ResolvedByID   string
	ResolvedAt     *time.Time
	LastActivityAt *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type AgreementCommentMessageRecord struct {
	bun.BaseModel `bun:"table:agreement_comment_messages,alias:acm"`
	ID            string
	TenantID      string
	OrgID         string
	ThreadID      string
	Body          string
	MessageKind   string
	CreatedByType string
	CreatedByID   string
	CreatedAt     time.Time
}

type AgreementCommentThreadQuery struct {
	ReviewID   string
	Visibility string
	Status     string
	Limit      int
	Offset     int
	SortDesc   bool
}
