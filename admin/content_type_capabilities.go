package admin

import (
	"context"
	"reflect"

	cmscontent "github.com/goliatone/go-cms/content"
)

// ContentTypeCapabilityContracts captures normalized capability payloads and
// validation metadata used by admin and quickstart callers.
type ContentTypeCapabilityContracts struct {
	Normalized           map[string]any    `json:"normalized"`
	Delivery             map[string]any    `json:"delivery"`
	Navigation           map[string]any    `json:"navigation"`
	Search               map[string]any    `json:"search"`
	Validation           map[string]string `json:"validation"`
	MigratedDeliveryMenu bool              `json:"migrated_delivery_menu"`
}

// ReadContentTypeCapabilityContracts resolves normalized capability contracts
// from a full CMS content type payload.
func ReadContentTypeCapabilityContracts(contentType CMSContentType) ContentTypeCapabilityContracts {
	return ParseContentTypeCapabilityContracts(contentType.Capabilities)
}

// ParseContentTypeCapabilityContracts resolves normalized capability contracts
// from a raw capabilities payload.
func ParseContentTypeCapabilityContracts(capabilities map[string]any) ContentTypeCapabilityContracts {
	return convertCapabilityContracts(cmscontent.ParseContentTypeCapabilityContracts(capabilities))
}

// NormalizeContentTypeCapabilities returns canonical capability objects and
// validation metadata without mutating the input payload.
func NormalizeContentTypeCapabilities(capabilities map[string]any) (map[string]any, map[string]string) {
	return cmscontent.NormalizeContentTypeCapabilities(capabilities)
}

// ValidateAndNormalizeContentTypeCapabilities validates and normalizes
// capabilities via the canonical go-cms implementation.
func ValidateAndNormalizeContentTypeCapabilities(capabilities map[string]any) (map[string]any, error) {
	return cmscontent.ValidateAndNormalizeContentTypeCapabilities(capabilities)
}

// BackfillContentTypeNavigationDefaults updates existing content types so
// canonical navigation defaults are persisted for legacy capability payloads.
func BackfillContentTypeNavigationDefaults(ctx context.Context, service CMSContentTypeService) (int, error) {
	if service == nil {
		return 0, ErrNotFound
	}
	types, err := service.ContentTypes(ctx)
	if err != nil {
		return 0, err
	}
	updated := 0
	for _, item := range types {
		normalized, validation := NormalizeContentTypeCapabilities(item.Capabilities)
		if len(validation) > 0 {
			return updated, contentTypeValidationError(validation)
		}
		if reflect.DeepEqual(normalized, item.Capabilities) {
			continue
		}
		next := item
		next.Capabilities = normalized
		next.ReplaceCapabilities = true
		if _, err := service.UpdateContentType(ctx, next); err != nil {
			return updated, err
		}
		updated++
	}
	return updated, nil
}

func convertCapabilityContracts(in cmscontent.ContentTypeCapabilityContracts) ContentTypeCapabilityContracts {
	return ContentTypeCapabilityContracts{
		Normalized:           in.Normalized,
		Delivery:             in.Delivery,
		Navigation:           in.Navigation,
		Search:               in.Search,
		Validation:           in.Validation,
		MigratedDeliveryMenu: in.MigratedDeliveryMenu,
	}
}
