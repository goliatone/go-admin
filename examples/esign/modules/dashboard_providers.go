package modules

import (
	"context"
	"path"
	"sort"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func (m *ESignModule) registerDashboardProviders(adm *coreadmin.Admin) {
	if m == nil || adm == nil {
		return
	}
	dash := adm.Dashboard()
	if dash == nil {
		return
	}

	dash.RegisterProvider(coreadmin.DashboardProviderSpec{
		Code:        "esign.widget.agreement_stats",
		Name:        "E-Sign Agreement Stats",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx coreadmin.AdminContext, _ map[string]any) (map[string]any, error) {
			return m.agreementStatsWidgetData(ctx.Context)
		},
	})
	dash.RegisterProvider(coreadmin.DashboardProviderSpec{
		Code:        "esign.widget.signing_activity",
		Name:        "E-Sign Signing Activity",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx coreadmin.AdminContext, _ map[string]any) (map[string]any, error) {
			return m.signingActivityWidgetData(ctx.Context)
		},
	})
	dash.RegisterProvider(coreadmin.DashboardProviderSpec{
		Code:        "esign.widget.delivery_health",
		Name:        "E-Sign Delivery Health",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx coreadmin.AdminContext, _ map[string]any) (map[string]any, error) {
			return m.deliveryHealthWidgetData(ctx.Context)
		},
	})
	dash.RegisterProvider(coreadmin.DashboardProviderSpec{
		Code:        "esign.widget.pending_signatures",
		Name:        "E-Sign Pending Signatures",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx coreadmin.AdminContext, _ map[string]any) (map[string]any, error) {
			return m.pendingSignaturesWidgetData(ctx.Context)
		},
	})
}

func (m *ESignModule) agreementStatsWidgetData(ctx context.Context) (map[string]any, error) {
	scope := m.defaultScope
	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return nil, err
	}
	out := map[string]any{
		"total":     len(agreements),
		"pending":   0,
		"completed": 0,
		"voided":    0,
		"declined":  0,
		"expired":   0,
		"list_url":  m.panelListURL(esignAgreementsPanelID),
	}
	for _, agreement := range agreements {
		switch strings.TrimSpace(agreement.Status) {
		case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
			out["pending"] = out["pending"].(int) + 1
		case stores.AgreementStatusCompleted:
			out["completed"] = out["completed"].(int) + 1
		case stores.AgreementStatusVoided:
			out["voided"] = out["voided"].(int) + 1
		case stores.AgreementStatusDeclined:
			out["declined"] = out["declined"].(int) + 1
		case stores.AgreementStatusExpired:
			out["expired"] = out["expired"].(int) + 1
		}
	}
	return out, nil
}

func (m *ESignModule) signingActivityWidgetData(ctx context.Context) (map[string]any, error) {
	scope := m.defaultScope
	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return nil, err
	}

	type activityEntry struct {
		CreatedAt      string
		CreatedAtSort  string
		Type           string
		Actor          string
		AgreementTitle string
		AgreementURL   string
	}

	items := make([]activityEntry, 0)
	for _, agreement := range agreements {
		events, err := m.store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{SortDesc: true, Limit: 5})
		if err != nil {
			return nil, err
		}
		for _, event := range events {
			items = append(items, activityEntry{
				CreatedAt:      formatTimePtr(&event.CreatedAt),
				CreatedAtSort:  event.CreatedAt.UTC().Format("20060102150405.000000000"),
				Type:           normalizeEventType(event.EventType),
				Actor:          firstNonEmpty(strings.TrimSpace(event.ActorID), strings.TrimSpace(event.ActorType), "system"),
				AgreementTitle: firstNonEmpty(strings.TrimSpace(agreement.Title), "Agreement"),
				AgreementURL:   m.panelItemURL(esignAgreementsPanelID, agreement.ID),
			})
		}
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAtSort > items[j].CreatedAtSort
	})
	if len(items) > 10 {
		items = items[:10]
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, map[string]any{
			"type":            item.Type,
			"actor":           item.Actor,
			"timestamp":       item.CreatedAt,
			"agreement_title": item.AgreementTitle,
			"agreement_url":   item.AgreementURL,
		})
	}
	return map[string]any{
		"activities":   out,
		"activity_url": m.panelListURL(esignAgreementsPanelID),
	}, nil
}

func (m *ESignModule) deliveryHealthWidgetData(ctx context.Context) (map[string]any, error) {
	scope := m.defaultScope
	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return nil, err
	}

	pendingRetries := 0
	for _, agreement := range agreements {
		runs, err := m.store.ListJobRuns(ctx, scope, agreement.ID)
		if err != nil {
			return nil, err
		}
		for _, run := range runs {
			if strings.TrimSpace(run.Status) == stores.JobRunStatusRetrying {
				pendingRetries++
			}
		}
	}

	snapshot := observability.Snapshot()
	alerts := observability.EvaluateAlerts(snapshot, observability.DefaultAlertPolicy())
	slo := observability.EvaluateSLO(snapshot)
	payload := observability.BuildSLODashboard(snapshot, slo, alerts)
	payload["pending_retries"] = pendingRetries
	return payload, nil
}

func (m *ESignModule) pendingSignaturesWidgetData(ctx context.Context) (map[string]any, error) {
	scope := m.defaultScope
	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return nil, err
	}
	rows := make([]map[string]any, 0)
	for _, agreement := range agreements {
		status := strings.TrimSpace(agreement.Status)
		if status != stores.AgreementStatusSent && status != stores.AgreementStatusInProgress {
			continue
		}
		recipients, err := m.store.ListRecipients(ctx, scope, agreement.ID)
		if err != nil {
			return nil, err
		}
		pendingRecipients := make([]map[string]any, 0)
		totalSigners := 0
		for _, recipient := range recipients {
			if strings.TrimSpace(recipient.Role) != stores.RecipientRoleSigner {
				continue
			}
			totalSigners++
			if recipient.CompletedAt != nil || recipient.DeclinedAt != nil {
				continue
			}
			pendingRecipients = append(pendingRecipients, map[string]any{
				"name":  strings.TrimSpace(recipient.Name),
				"email": strings.TrimSpace(recipient.Email),
			})
		}
		if len(pendingRecipients) == 0 {
			continue
		}
		rows = append(rows, map[string]any{
			"title":              firstNonEmpty(strings.TrimSpace(agreement.Title), "Untitled"),
			"url":                m.panelItemURL(esignAgreementsPanelID, agreement.ID),
			"pending_count":      len(pendingRecipients),
			"total_recipients":   totalSigners,
			"pending_recipients": pendingRecipients,
		})
	}
	return map[string]any{
		"agreements": rows,
		"list_url":   m.panelListURL(esignAgreementsPanelID),
	}, nil
}

func (m *ESignModule) panelListURL(panelID string) string {
	basePath := "/" + strings.Trim(strings.TrimSpace(m.basePath), "/")
	if basePath == "/" {
		basePath = "/admin"
	}
	return path.Join(basePath, "resources", strings.TrimSpace(panelID))
}

func (m *ESignModule) panelItemURL(panelID, id string) string {
	return path.Join(m.panelListURL(panelID), strings.TrimSpace(id))
}

func normalizeEventType(eventType string) string {
	eventType = strings.TrimSpace(strings.ToLower(eventType))
	if eventType == "" {
		return "event"
	}
	eventType = strings.TrimPrefix(eventType, "agreement.")
	eventType = strings.TrimPrefix(eventType, "signer.")
	eventType = strings.TrimPrefix(eventType, "job.")
	return strings.ReplaceAll(eventType, "_", " ")
}
