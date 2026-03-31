package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func capabilityFromContentType(contentType admin.CMSContentType) (deliveryCapability, bool) {
	slug := deliveryCapabilityTypeSlug(contentType)
	if slug == "" {
		return deliveryCapability{}, false
	}

	delivery := deliveryCapabilityContract(contentType)
	if len(delivery) == 0 || !deliveryCapabilityContractEnabled(delivery) {
		return deliveryCapability{}, false
	}

	return deliveryCapabilityFromContract(slug, delivery), true
}

func deliveryCapabilityTypeSlug(contentType admin.CMSContentType) string {
	slug := strings.TrimSpace(contentType.Slug)
	if slug == "" {
		slug = strings.TrimSpace(contentType.Name)
	}
	if slug == "" {
		return ""
	}
	return strings.ToLower(slug)
}

func deliveryCapabilityContract(contentType admin.CMSContentType) map[string]any {
	contracts := admin.ReadContentTypeCapabilityContracts(contentType)
	return anyMap(contracts.Delivery)
}

func deliveryCapabilityContractEnabled(delivery map[string]any) bool {
	if len(delivery) == 0 {
		return false
	}
	if raw, ok := delivery["enabled"]; ok {
		return anyBool(raw)
	}
	return true
}

func deliveryCapabilityRoutes(delivery map[string]any) map[string]any {
	return anyMap(delivery["routes"])
}

func deliveryCapabilityTemplates(delivery map[string]any) map[string]any {
	return anyMap(delivery["templates"])
}

func deliveryCapabilityFromContract(slug string, delivery map[string]any) deliveryCapability {
	routes := deliveryCapabilityRoutes(delivery)
	templates := deliveryCapabilityTemplates(delivery)
	out := deliveryCapability{
		TypeSlug:       strings.TrimSpace(slug),
		Kind:           strings.ToLower(strings.TrimSpace(anyString(delivery["kind"]))),
		ListRoute:      strings.TrimSpace(anyString(routes["list"])),
		DetailRoute:    strings.TrimSpace(anyString(routes["detail"])),
		ListTemplate:   strings.TrimSpace(anyString(templates["list"])),
		DetailTemplate: strings.TrimSpace(anyString(templates["detail"])),
	}
	out.PathPolicy = deliveryPathPolicyFromContract(delivery, out)
	return out
}
