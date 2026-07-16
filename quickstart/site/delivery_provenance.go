package site

import (
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"

	router "github.com/goliatone/go-router"
)

const (
	DeliveryProvenanceRequestHeader = "X-Site-Delivery-Provenance"
	DeliveryTextCodeRendered        = "PUBLIC_SITE_DELIVERY_RENDERED"
	DeliveryTextCodeRenderFailed    = "PUBLIC_TEMPLATE_RENDER_FAILED"
	DeliveryCacheStatusBypass       = "bypass"
	DeliveryCacheStatusMiss         = "miss"
	DeliveryCacheStatusHit          = "hit"
	DeliveryCacheStatusStale        = "stale"

	DeliveryProvenanceRouteFamilyHeader       = "X-Site-Delivery-Route-Family"
	DeliveryProvenanceOwnerKindHeader         = "X-Site-Delivery-Owner-Kind"
	DeliveryProvenanceModeHeader              = "X-Site-Delivery-Mode"
	DeliveryProvenanceRequestedTemplateHeader = "X-Site-Delivery-Requested-Template"
	DeliveryProvenanceSelectedTemplateHeader  = "X-Site-Delivery-Selected-Template"
	DeliveryProvenanceTemplateAttemptsHeader  = "X-Site-Delivery-Template-Attempts"
	DeliveryProvenanceFallbackHeader          = "X-Site-Delivery-Fallback-Used"
	DeliveryProvenanceCacheStatusHeader       = "X-Site-Delivery-Cache-Status"
	DeliveryProvenanceRenderVersionHeader     = "X-Site-Delivery-Render-Version"
	DeliveryProvenanceSemanticIdentityHeader  = "X-Site-Delivery-Semantic-Identity"
	DeliveryProvenanceTextCodeHeader          = "X-Site-Delivery-Text-Code"
)

// Retain the package-private names for source compatibility with internal
// tests while exposing one transport contract to host probe adapters.
const (
	deliveryProvenanceRouteFamilyHeader       = DeliveryProvenanceRouteFamilyHeader
	deliveryProvenanceOwnerKindHeader         = DeliveryProvenanceOwnerKindHeader
	deliveryProvenanceModeHeader              = DeliveryProvenanceModeHeader
	deliveryProvenanceRequestedTemplateHeader = DeliveryProvenanceRequestedTemplateHeader
	deliveryProvenanceSelectedTemplateHeader  = DeliveryProvenanceSelectedTemplateHeader
	deliveryProvenanceTemplateAttemptsHeader  = DeliveryProvenanceTemplateAttemptsHeader
	deliveryProvenanceFallbackHeader          = DeliveryProvenanceFallbackHeader
	deliveryProvenanceCacheStatusHeader       = DeliveryProvenanceCacheStatusHeader
	deliveryProvenanceRenderVersionHeader     = DeliveryProvenanceRenderVersionHeader
	deliveryProvenanceSemanticIdentityHeader  = DeliveryProvenanceSemanticIdentityHeader
	deliveryProvenanceTextCodeHeader          = DeliveryProvenanceTextCodeHeader
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

// ParseDeliveryProvenanceHeaders decodes the sanitized delivery transport
// contract. Malformed attempt data is returned as an error instead of being
// silently discarded by host diagnostics.
func ParseDeliveryProvenanceHeaders(headers http.Header) (DeliveryProvenance, error) {
	if headers == nil {
		return DeliveryProvenance{}, nil
	}
	provenance := DeliveryProvenance{
		RouteFamily:       strings.TrimSpace(headers.Get(DeliveryProvenanceRouteFamilyHeader)),
		OwnerKind:         strings.TrimSpace(headers.Get(DeliveryProvenanceOwnerKindHeader)),
		Mode:              strings.TrimSpace(headers.Get(DeliveryProvenanceModeHeader)),
		RequestedTemplate: strings.TrimSpace(headers.Get(DeliveryProvenanceRequestedTemplateHeader)),
		SelectedTemplate:  strings.TrimSpace(headers.Get(DeliveryProvenanceSelectedTemplateHeader)),
		FallbackUsed:      strings.EqualFold(strings.TrimSpace(headers.Get(DeliveryProvenanceFallbackHeader)), "true"),
		CacheStatus:       strings.TrimSpace(headers.Get(DeliveryProvenanceCacheStatusHeader)),
		RenderVersion:     strings.TrimSpace(headers.Get(DeliveryProvenanceRenderVersionHeader)),
		SemanticIdentity:  strings.TrimSpace(headers.Get(DeliveryProvenanceSemanticIdentityHeader)),
		TextCode:          strings.TrimSpace(headers.Get(DeliveryProvenanceTextCodeHeader)),
	}
	rawAttempts := strings.TrimSpace(headers.Get(DeliveryProvenanceTemplateAttemptsHeader))
	if rawAttempts != "" {
		if err := json.Unmarshal([]byte(rawAttempts), &provenance.TemplateAttempts); err != nil {
			return DeliveryProvenance{}, fmt.Errorf("decode site delivery template attempts: %w", err)
		}
	}
	return provenance, nil
}

// ValidateFinalized verifies that a finalized delivery observation contains
// enough information to be authoritative. Render failures may omit a selected
// template, but successful observations must identify the selected attempt.
func (p DeliveryProvenance) ValidateFinalized() error {
	missing := make([]string, 0, 8)
	for name, value := range map[string]string{
		"route_family":       p.RouteFamily,
		"owner_kind":         p.OwnerKind,
		"mode":               p.Mode,
		"requested_template": p.RequestedTemplate,
		"cache_status":       p.CacheStatus,
		"render_version":     p.RenderVersion,
		"semantic_identity":  p.SemanticIdentity,
		"text_code":          p.TextCode,
	} {
		if strings.TrimSpace(value) == "" {
			missing = append(missing, name)
		}
	}
	if len(p.TemplateAttempts) == 0 {
		missing = append(missing, "template_attempts")
	}
	if len(missing) > 0 {
		slices.Sort(missing)
		return fmt.Errorf("site delivery provenance is incomplete: missing %s", strings.Join(missing, ", "))
	}
	switch strings.TrimSpace(p.CacheStatus) {
	case DeliveryCacheStatusBypass, DeliveryCacheStatusMiss, DeliveryCacheStatusHit, DeliveryCacheStatusStale:
	default:
		return fmt.Errorf("site delivery provenance has invalid cache status %q", p.CacheStatus)
	}
	last := p.TemplateAttempts[len(p.TemplateAttempts)-1]
	switch strings.TrimSpace(p.TextCode) {
	case DeliveryTextCodeRendered:
		if strings.TrimSpace(p.SelectedTemplate) == "" {
			return fmt.Errorf("site delivery provenance is incomplete: missing selected_template")
		}
		if strings.TrimSpace(last.Template) != strings.TrimSpace(p.SelectedTemplate) || strings.TrimSpace(last.Outcome) != "selected" {
			return fmt.Errorf("site delivery provenance selected template does not match the final selected attempt")
		}
	case DeliveryTextCodeRenderFailed:
		if strings.TrimSpace(p.SelectedTemplate) != "" {
			return fmt.Errorf("site delivery provenance render failure unexpectedly selected template %q", p.SelectedTemplate)
		}
		if strings.TrimSpace(last.Template) == "" || strings.TrimSpace(last.Outcome) != "failed" {
			return fmt.Errorf("site delivery provenance render failure does not end with a failed attempt")
		}
	default:
		return fmt.Errorf("site delivery provenance has invalid text code %q", p.TextCode)
	}
	return nil
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
