package modules

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const defaultLandingRecentLimit = 5

func landingAgreementPresentationStatus(agreement stores.AgreementRecord) string {
	status := strings.ToLower(strings.TrimSpace(agreement.Status))
	if status != stores.AgreementStatusDraft {
		return status
	}

	switch stores.NormalizeAgreementReviewStatus(agreement.ReviewStatus) {
	case stores.AgreementReviewStatusInReview:
		return stores.AgreementReviewStatusInReview
	case stores.AgreementReviewStatusChangesRequested:
		return stores.AgreementReviewStatusChangesRequested
	case stores.AgreementReviewStatusApproved:
		return "review_approved"
	default:
		return status
	}
}

func agreementRequiresAction(agreement stores.AgreementRecord) bool {
	switch strings.ToLower(strings.TrimSpace(agreement.Status)) {
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress, stores.AgreementStatusDeclined:
		return true
	case stores.AgreementStatusDraft:
		return stores.NormalizeAgreementReviewStatus(agreement.ReviewStatus) == stores.AgreementReviewStatusChangesRequested
	default:
		return false
	}
}

// LandingOverview builds landing-page stats and recent agreement rows.
func (m *ESignModule) LandingOverview(ctx context.Context, scope stores.Scope, recentLimit int) (map[string]int, []map[string]any, error) {
	stats := map[string]int{
		"draft":           0,
		"pending":         0,
		"completed":       0,
		"action_required": 0,
		"total":           0,
	}
	recent := []map[string]any{}
	if m == nil || m.store == nil {
		return stats, recent, nil
	}
	if recentLimit <= 0 {
		recentLimit = defaultLandingRecentLimit
	}

	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return stats, recent, err
	}
	populateLandingOverviewStats(stats, agreements)

	sort.Slice(agreements, func(i, j int) bool {
		left := agreements[i].UpdatedAt
		if left.IsZero() {
			left = agreements[i].CreatedAt
		}
		right := agreements[j].UpdatedAt
		if right.IsZero() {
			right = agreements[j].CreatedAt
		}
		if left.Equal(right) {
			return strings.TrimSpace(agreements[i].ID) < strings.TrimSpace(agreements[j].ID)
		}
		return left.After(right)
	})

	if recentLimit > len(agreements) {
		recentLimit = len(agreements)
	}
	recent = make([]map[string]any, 0, recentLimit)
	for i := 0; i < recentLimit; i++ {
		row, err := m.buildLandingOverviewRecentRow(ctx, scope, agreements[i])
		if err != nil {
			return stats, nil, err
		}
		recent = append(recent, row)
	}

	return stats, recent, nil
}

func populateLandingOverviewStats(stats map[string]int, agreements []stores.AgreementRecord) {
	if stats == nil {
		return
	}
	stats["total"] = len(agreements)
	byStatus := map[string]int{}
	actionRequired := 0
	for _, agreement := range agreements {
		status := strings.ToLower(strings.TrimSpace(agreement.Status))
		if status == "" {
			continue
		}
		byStatus[status] = byStatus[status] + 1
		if agreementRequiresAction(agreement) {
			actionRequired++
		}
	}
	stats["draft"] = byStatus[stores.AgreementStatusDraft]
	stats["pending"] = byStatus[stores.AgreementStatusSent] + byStatus[stores.AgreementStatusInProgress]
	stats["completed"] = byStatus[stores.AgreementStatusCompleted]
	stats["action_required"] = actionRequired
}

func (m *ESignModule) buildLandingOverviewRecentRow(ctx context.Context, scope stores.Scope, agreement stores.AgreementRecord) (map[string]any, error) {
	recipients, err := m.store.ListRecipients(ctx, scope, agreement.ID)
	if err != nil {
		return nil, err
	}
	title := strings.TrimSpace(agreement.Title)
	if title == "" {
		title = "Untitled"
	}
	return map[string]any{
		"id":                  strings.TrimSpace(agreement.ID),
		"title":               title,
		"status":              strings.TrimSpace(agreement.Status),
		"review_status":       strings.TrimSpace(agreement.ReviewStatus),
		"presentation_status": landingAgreementPresentationStatus(agreement),
		"recipient_count":     len(recipients),
		"updated_at":          landingAgreementUpdatedAt(agreement),
	}, nil
}

func landingAgreementUpdatedAt(agreement stores.AgreementRecord) string {
	if agreement.UpdatedAt.IsZero() {
		return agreement.CreatedAt.UTC().Format(time.RFC3339Nano)
	}
	return agreement.UpdatedAt.UTC().Format(time.RFC3339Nano)
}
