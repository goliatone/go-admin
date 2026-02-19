package modules

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"path"
	"sort"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

type agreementStatsWidgetPayload struct {
	Total     int    `json:"total"`
	Pending   int    `json:"pending"`
	Completed int    `json:"completed"`
	Voided    int    `json:"voided"`
	Declined  int    `json:"declined"`
	Expired   int    `json:"expired"`
	ListURL   string `json:"list_url"`
}

type signingActivityItemPayload struct {
	Type           string `json:"type"`
	Actor          string `json:"actor"`
	Timestamp      string `json:"timestamp"`
	AgreementTitle string `json:"agreement_title"`
	AgreementURL   string `json:"agreement_url"`
}

type signingActivityWidgetPayload struct {
	Activities  []signingActivityItemPayload `json:"activities"`
	ActivityURL string                       `json:"activity_url"`
}

type pendingRecipientPayload struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type pendingAgreementPayload struct {
	Title             string                    `json:"title"`
	URL               string                    `json:"url"`
	PendingCount      int                       `json:"pending_count"`
	TotalRecipients   int                       `json:"total_recipients"`
	PendingRecipients []pendingRecipientPayload `json:"pending_recipients"`
}

type pendingSignaturesWidgetPayload struct {
	Agreements []pendingAgreementPayload `json:"agreements"`
	ListURL    string                    `json:"list_url"`
}

type deliveryHealthWidgetPayload struct {
	SLOOverallPass                 bool                            `json:"slo_overall_pass"`
	SLOTargets                     []observability.SLOTargetStatus `json:"slo_targets"`
	Alerts                         []observability.Alert           `json:"alerts"`
	EmailSuccessRate               float64                         `json:"email_success_rate"`
	EmailsSent                     int64                           `json:"emails_sent"`
	EmailsFailed                   int64                           `json:"emails_failed"`
	JobSuccessRate                 float64                         `json:"job_success_rate"`
	JobsCompleted                  int64                           `json:"jobs_completed"`
	JobsFailed                     int64                           `json:"jobs_failed"`
	GoogleImportSuccesses          int64                           `json:"google_import_successes"`
	GoogleImportFailures           int64                           `json:"google_import_failures"`
	GoogleAuthChurnTotal           int64                           `json:"google_auth_churn_total"`
	SignerLinkOpenRate             float64                         `json:"signer_link_open_rate"`
	SignerSubmitConversionRate     float64                         `json:"signer_submit_conversion_rate"`
	UnifiedViewerLoadP95MS         float64                         `json:"unified_viewer_load_p95_ms"`
	UnifiedFieldSaveP95MS          float64                         `json:"unified_field_save_p95_ms"`
	UnifiedSignatureAttachP95MS    float64                         `json:"unified_signature_attach_p95_ms"`
	UnifiedSubmitConversionRate    float64                         `json:"unified_submit_conversion_rate"`
	CompletionDeliverySuccessRate  float64                         `json:"completion_delivery_success_rate"`
	SignerLinkOpenSuccessTotal     int64                           `json:"signer_link_open_success_total"`
	SignerLinkOpenFailureTotal     int64                           `json:"signer_link_open_failure_total"`
	CompletionDeliverySuccessTotal int64                           `json:"completion_delivery_success_total"`
	CompletionDeliveryFailureTotal int64                           `json:"completion_delivery_failure_total"`
	Period                         string                          `json:"period"`
	PendingRetries                 int                             `json:"pending_retries"`
}

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
		Handler: func(ctx coreadmin.AdminContext, _ map[string]any) (coreadmin.WidgetPayload, error) {
			return m.agreementStatsWidgetData(ctx.Context)
		},
	})
	dash.RegisterProvider(coreadmin.DashboardProviderSpec{
		Code:        "esign.widget.signing_activity",
		Name:        "E-Sign Signing Activity",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx coreadmin.AdminContext, _ map[string]any) (coreadmin.WidgetPayload, error) {
			return m.signingActivityWidgetData(ctx.Context)
		},
	})
	dash.RegisterProvider(coreadmin.DashboardProviderSpec{
		Code:        "esign.widget.delivery_health",
		Name:        "E-Sign Delivery Health",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx coreadmin.AdminContext, _ map[string]any) (coreadmin.WidgetPayload, error) {
			return m.deliveryHealthWidgetData(ctx.Context)
		},
	})
	dash.RegisterProvider(coreadmin.DashboardProviderSpec{
		Code:        "esign.widget.pending_signatures",
		Name:        "E-Sign Pending Signatures",
		DefaultArea: "admin.dashboard.sidebar",
		Handler: func(ctx coreadmin.AdminContext, _ map[string]any) (coreadmin.WidgetPayload, error) {
			return m.pendingSignaturesWidgetData(ctx.Context)
		},
	})
}

func (m *ESignModule) agreementStatsWidgetData(ctx context.Context) (coreadmin.WidgetPayload, error) {
	scope := m.defaultScope
	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return coreadmin.WidgetPayload{}, err
	}
	out := agreementStatsWidgetPayload{
		Total:     len(agreements),
		Pending:   0,
		Completed: 0,
		Voided:    0,
		Declined:  0,
		Expired:   0,
		ListURL:   m.panelListURL(esignAgreementsPanelID),
	}
	for _, agreement := range agreements {
		switch strings.TrimSpace(agreement.Status) {
		case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
			out.Pending++
		case stores.AgreementStatusCompleted:
			out.Completed++
		case stores.AgreementStatusVoided:
			out.Voided++
		case stores.AgreementStatusDeclined:
			out.Declined++
		case stores.AgreementStatusExpired:
			out.Expired++
		}
	}
	return coreadmin.WidgetPayloadOf(out), nil
}

func (m *ESignModule) signingActivityWidgetData(ctx context.Context) (coreadmin.WidgetPayload, error) {
	scope := m.defaultScope
	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return coreadmin.WidgetPayload{}, err
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
			return coreadmin.WidgetPayload{}, err
		}
		for _, event := range events {
			items = append(items, activityEntry{
				CreatedAt:      formatTimePtr(&event.CreatedAt),
				CreatedAtSort:  event.CreatedAt.UTC().Format("20060102150405.000000000"),
				Type:           normalizeEventType(event.EventType),
				Actor:          primitives.FirstNonEmpty(strings.TrimSpace(event.ActorID), strings.TrimSpace(event.ActorType), "system"),
				AgreementTitle: primitives.FirstNonEmpty(strings.TrimSpace(agreement.Title), "Agreement"),
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
	out := make([]signingActivityItemPayload, 0, len(items))
	for _, item := range items {
		out = append(out, signingActivityItemPayload{
			Type:           item.Type,
			Actor:          item.Actor,
			Timestamp:      item.CreatedAt,
			AgreementTitle: item.AgreementTitle,
			AgreementURL:   item.AgreementURL,
		})
	}
	return coreadmin.WidgetPayloadOf(signingActivityWidgetPayload{
		Activities:  out,
		ActivityURL: m.panelListURL(esignAgreementsPanelID),
	}), nil
}

func (m *ESignModule) deliveryHealthWidgetData(ctx context.Context) (coreadmin.WidgetPayload, error) {
	scope := m.defaultScope
	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return coreadmin.WidgetPayload{}, err
	}

	pendingRetries := 0
	for _, agreement := range agreements {
		runs, err := m.store.ListJobRuns(ctx, scope, agreement.ID)
		if err != nil {
			return coreadmin.WidgetPayload{}, err
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
	return coreadmin.WidgetPayloadOf(deliveryHealthWidgetPayload{
		SLOOverallPass:                 slo.OverallPass,
		SLOTargets:                     slo.Targets,
		Alerts:                         alerts,
		EmailSuccessRate:               snapshot.EmailSuccessRatePercent(),
		EmailsSent:                     snapshot.EmailSuccessTotal,
		EmailsFailed:                   snapshot.EmailFailureTotal,
		JobSuccessRate:                 snapshot.JobSuccessRatePercent(),
		JobsCompleted:                  snapshot.JobSuccessTotal,
		JobsFailed:                     snapshot.JobFailureTotal,
		GoogleImportSuccesses:          snapshot.GoogleImportSuccessTotal,
		GoogleImportFailures:           snapshot.GoogleImportFailureTotal,
		GoogleAuthChurnTotal:           snapshot.GoogleAuthChurnTotal,
		SignerLinkOpenRate:             snapshot.SignerLinkOpenRatePercent(),
		SignerSubmitConversionRate:     snapshot.SignerSubmitConversionPercent(),
		UnifiedViewerLoadP95MS:         snapshot.UnifiedViewerLoadP95MS,
		UnifiedFieldSaveP95MS:          snapshot.UnifiedFieldSaveP95MS,
		UnifiedSignatureAttachP95MS:    snapshot.UnifiedSignatureP95MS,
		UnifiedSubmitConversionRate:    snapshot.UnifiedSubmitConversionPercent(),
		CompletionDeliverySuccessRate:  snapshot.CompletionDeliverySuccessRatePercent(),
		SignerLinkOpenSuccessTotal:     snapshot.SignerLinkOpenSuccessTotal,
		SignerLinkOpenFailureTotal:     snapshot.SignerLinkOpenFailureTotal,
		CompletionDeliverySuccessTotal: snapshot.CompletionDeliverySuccessTotal,
		CompletionDeliveryFailureTotal: snapshot.CompletionDeliveryFailureTotal,
		Period:                         "rolling window",
		PendingRetries:                 pendingRetries,
	}), nil
}

func (m *ESignModule) pendingSignaturesWidgetData(ctx context.Context) (coreadmin.WidgetPayload, error) {
	scope := m.defaultScope
	agreements, err := m.store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		return coreadmin.WidgetPayload{}, err
	}
	rows := make([]pendingAgreementPayload, 0)
	for _, agreement := range agreements {
		status := strings.TrimSpace(agreement.Status)
		if status != stores.AgreementStatusSent && status != stores.AgreementStatusInProgress {
			continue
		}
		recipients, err := m.store.ListRecipients(ctx, scope, agreement.ID)
		if err != nil {
			return coreadmin.WidgetPayload{}, err
		}
		pendingRecipients := make([]pendingRecipientPayload, 0)
		totalSigners := 0
		for _, recipient := range recipients {
			if strings.TrimSpace(recipient.Role) != stores.RecipientRoleSigner {
				continue
			}
			totalSigners++
			if recipient.CompletedAt != nil || recipient.DeclinedAt != nil {
				continue
			}
			pendingRecipients = append(pendingRecipients, pendingRecipientPayload{
				Name:  strings.TrimSpace(recipient.Name),
				Email: strings.TrimSpace(recipient.Email),
			})
		}
		if len(pendingRecipients) == 0 {
			continue
		}
		rows = append(rows, pendingAgreementPayload{
			Title:             primitives.FirstNonEmpty(strings.TrimSpace(agreement.Title), "Untitled"),
			URL:               m.panelItemURL(esignAgreementsPanelID, agreement.ID),
			PendingCount:      len(pendingRecipients),
			TotalRecipients:   totalSigners,
			PendingRecipients: pendingRecipients,
		})
	}
	return coreadmin.WidgetPayloadOf(pendingSignaturesWidgetPayload{
		Agreements: rows,
		ListURL:    m.panelListURL(esignAgreementsPanelID),
	}), nil
}

func (m *ESignModule) panelListURL(panelID string) string {
	basePath := "/" + strings.Trim(strings.TrimSpace(m.basePath), "/")
	if basePath == "/" {
		basePath = "/admin"
	}
	return path.Join(basePath, "content", strings.TrimSpace(panelID))
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
