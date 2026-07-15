package site

import (
	"encoding/json"
	"strconv"
	"strings"

	router "github.com/goliatone/go-router"
)

const (
	DeliveryProvenanceRequestHeader = "X-Site-Delivery-Provenance"

	deliveryProvenanceRouteFamilyHeader       = "X-Site-Delivery-Route-Family"
	deliveryProvenanceOwnerKindHeader         = "X-Site-Delivery-Owner-Kind"
	deliveryProvenanceModeHeader              = "X-Site-Delivery-Mode"
	deliveryProvenanceRequestedTemplateHeader = "X-Site-Delivery-Requested-Template"
	deliveryProvenanceSelectedTemplateHeader  = "X-Site-Delivery-Selected-Template"
	deliveryProvenanceTemplateAttemptsHeader  = "X-Site-Delivery-Template-Attempts"
	deliveryProvenanceFallbackHeader          = "X-Site-Delivery-Fallback-Used"
	deliveryProvenanceCacheStatusHeader       = "X-Site-Delivery-Cache-Status"
	deliveryProvenanceRenderVersionHeader     = "X-Site-Delivery-Render-Version"
	deliveryProvenanceSemanticIdentityHeader  = "X-Site-Delivery-Semantic-Identity"
	deliveryProvenanceTextCodeHeader          = "X-Site-Delivery-Text-Code"
)

// DeliveryTemplateAttempt is a sanitized record of one template attempt.
// It intentionally excludes rendered data, filesystem paths, and raw errors.
type DeliveryTemplateAttempt struct {
	Template string `json:"template"`
	Outcome  string `json:"outcome"`
}

// DeliveryProvenance describes how a public-site response was resolved and
// rendered. It is safe for operational diagnostics and contains no content
// payload or record identifiers.
type DeliveryProvenance struct {
	RouteFamily       string                    `json:"route_family,omitempty"`
	OwnerKind         string                    `json:"owner_kind,omitempty"`
	Mode              string                    `json:"mode,omitempty"`
	RequestedTemplate string                    `json:"requested_template,omitempty"`
	SelectedTemplate  string                    `json:"selected_template,omitempty"`
	TemplateAttempts  []DeliveryTemplateAttempt `json:"template_attempts,omitempty"`
	FallbackUsed      bool                      `json:"fallback_used"`
	CacheStatus       string                    `json:"cache_status,omitempty"`
	RenderVersion     string                    `json:"render_version,omitempty"`
	SemanticIdentity  string                    `json:"semantic_identity,omitempty"`
	TextCode          string                    `json:"text_code,omitempty"`
}

func deliveryProvenanceForResolution(resolution *deliveryResolution, cacheStatus, renderVersion string) DeliveryProvenance {
	if resolution == nil {
		return DeliveryProvenance{CacheStatus: strings.TrimSpace(cacheStatus), RenderVersion: strings.TrimSpace(renderVersion)}
	}
	routeFamily := strings.ToLower(strings.TrimSpace(resolution.Capability.TypeSlug))
	mode := strings.ToLower(strings.TrimSpace(resolution.Mode))
	return DeliveryProvenance{
		RouteFamily:       routeFamily,
		OwnerKind:         "content_type",
		Mode:              mode,
		RequestedTemplate: firstTemplate(resolution.TemplateCandidates),
		CacheStatus:       strings.TrimSpace(cacheStatus),
		RenderVersion:     strings.TrimSpace(renderVersion),
		SemanticIdentity:  strings.Trim(strings.Join([]string{routeFamily, mode}, ":"), ":"),
	}
}

func cloneDeliveryProvenance(input DeliveryProvenance) DeliveryProvenance {
	input.TemplateAttempts = append([]DeliveryTemplateAttempt{}, input.TemplateAttempts...)
	return input
}

func appendDeliveryTemplateAttempt(provenance *DeliveryProvenance, templateName, outcome string) {
	if provenance == nil {
		return
	}
	templateName = strings.TrimSpace(templateName)
	if templateName == "" {
		return
	}
	provenance.TemplateAttempts = append(provenance.TemplateAttempts, DeliveryTemplateAttempt{
		Template: templateName,
		Outcome:  strings.TrimSpace(outcome),
	})
}

func finalizeDeliveryProvenance(provenance *DeliveryProvenance, selectedTemplate, textCode string) {
	if provenance == nil {
		return
	}
	provenance.SelectedTemplate = strings.TrimSpace(selectedTemplate)
	provenance.TextCode = strings.TrimSpace(textCode)
	provenance.FallbackUsed = provenance.SelectedTemplate != "" &&
		provenance.RequestedTemplate != "" &&
		provenance.SelectedTemplate != provenance.RequestedTemplate
}

func deliveryProvenanceRequested(c router.Context) bool {
	if c == nil {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(c.Header(DeliveryProvenanceRequestHeader))) {
	case "1", "true", "yes":
		return true
	default:
		return false
	}
}

func writeDeliveryProvenanceHeaders(c router.Context, provenance DeliveryProvenance) {
	if !deliveryProvenanceRequested(c) {
		return
	}
	set := func(name, value string) {
		if value = strings.TrimSpace(value); value != "" {
			c.SetHeader(name, value)
		}
	}
	set(deliveryProvenanceRouteFamilyHeader, provenance.RouteFamily)
	set(deliveryProvenanceOwnerKindHeader, provenance.OwnerKind)
	set(deliveryProvenanceModeHeader, provenance.Mode)
	set(deliveryProvenanceRequestedTemplateHeader, provenance.RequestedTemplate)
	set(deliveryProvenanceSelectedTemplateHeader, provenance.SelectedTemplate)
	set(deliveryProvenanceCacheStatusHeader, provenance.CacheStatus)
	set(deliveryProvenanceRenderVersionHeader, provenance.RenderVersion)
	set(deliveryProvenanceSemanticIdentityHeader, provenance.SemanticIdentity)
	set(deliveryProvenanceTextCodeHeader, provenance.TextCode)
	if provenance.FallbackUsed {
		set(deliveryProvenanceFallbackHeader, strconv.FormatBool(true))
	}
	if len(provenance.TemplateAttempts) > 0 {
		if raw, err := json.Marshal(provenance.TemplateAttempts); err == nil {
			set(deliveryProvenanceTemplateAttemptsHeader, string(raw))
		}
	}
}
