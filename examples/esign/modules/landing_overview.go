package modules

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const defaultLandingRecentLimit = 5

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
	stats["total"] = len(agreements)

	byStatus := map[string]int{}
	for _, agreement := range agreements {
		status := strings.ToLower(strings.TrimSpace(agreement.Status))
		if status == "" {
			continue
		}
		byStatus[status] = byStatus[status] + 1
	}
	stats["draft"] = byStatus[stores.AgreementStatusDraft]
	stats["pending"] = byStatus[stores.AgreementStatusSent] + byStatus[stores.AgreementStatusInProgress]
	stats["completed"] = byStatus[stores.AgreementStatusCompleted]
	stats["action_required"] = stats["pending"] + byStatus[stores.AgreementStatusDeclined]

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
		agreement := agreements[i]
		recipients, err := m.store.ListRecipients(ctx, scope, agreement.ID)
		if err != nil {
			return stats, nil, err
		}
		title := strings.TrimSpace(agreement.Title)
		if title == "" {
			title = "Untitled"
		}
		status := strings.TrimSpace(agreement.Status)
		updatedAt := agreement.UpdatedAt.UTC().Format(time.RFC3339Nano)
		if agreement.UpdatedAt.IsZero() {
			updatedAt = agreement.CreatedAt.UTC().Format(time.RFC3339Nano)
		}
		recent = append(recent, map[string]any{
			"id":              strings.TrimSpace(agreement.ID),
			"title":           title,
			"status":          status,
			"recipient_count": len(recipients),
			"updated_at":      updatedAt,
		})
	}

	return stats, recent, nil
}
