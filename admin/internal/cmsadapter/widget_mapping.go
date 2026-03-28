package cmsadapter

import (
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	"github.com/goliatone/go-admin/internal/primitives"
	cmswidgets "github.com/goliatone/go-cms/widgets"
	"github.com/google/uuid"
)

func WidgetPlacementMetadata(instance dashinternal.WidgetInstance) map[string]any {
	meta := map[string]any{}
	if pageID := strings.TrimSpace(instance.PageID); pageID != "" {
		meta["page_id"] = pageID
	}
	if locale := strings.TrimSpace(instance.Locale); locale != "" {
		meta["locale"] = locale
	}
	if len(meta) == 0 {
		return nil
	}
	return meta
}

func ConvertGoCMSWidgetInstance(val *cmswidgets.Instance) dashinternal.WidgetInstance {
	if val == nil {
		return dashinternal.WidgetInstance{}
	}
	inst := dashinternal.WidgetInstance{
		ID:             val.ID.String(),
		DefinitionCode: val.DefinitionID.String(),
		Config:         primitives.CloneAnyMap(val.Configuration),
		Position:       val.Position,
	}
	if val.AreaCode != nil {
		inst.Area = strings.TrimSpace(*val.AreaCode)
	}
	if val.Placement != nil {
		if pageID, ok := val.Placement["page_id"].(string); ok {
			inst.PageID = pageID
		}
		if locale, ok := val.Placement["locale"].(string); ok {
			inst.Locale = locale
		}
	}
	return inst
}

func ConvertGoCMSResolvedWidget(entry *cmswidgets.ResolvedWidget) dashinternal.WidgetInstance {
	if entry == nil {
		return dashinternal.WidgetInstance{}
	}
	inst := ConvertGoCMSWidgetInstance(entry.Instance)
	if entry.Placement != nil {
		inst.Area = primitives.FirstNonEmptyRaw(entry.Placement.AreaCode, inst.Area)
		inst.Position = entry.Placement.Position
		if entry.Placement.Metadata != nil {
			if inst.PageID == "" {
				if pageID, ok := entry.Placement.Metadata["page_id"].(string); ok {
					inst.PageID = pageID
				}
			}
			if inst.Locale == "" {
				if locale, ok := entry.Placement.Metadata["locale"].(string); ok {
					inst.Locale = locale
				}
			}
		}
	}
	return inst
}

func FilterWidgetInstances(instances []dashinternal.WidgetInstance, filter dashinternal.WidgetInstanceFilter) []dashinternal.WidgetInstance {
	if len(instances) == 0 {
		return instances
	}
	pageID := strings.TrimSpace(filter.PageID)
	locale := strings.TrimSpace(filter.Locale)
	if pageID == "" && locale == "" {
		return instances
	}
	out := make([]dashinternal.WidgetInstance, 0, len(instances))
	for _, inst := range instances {
		if pageID != "" && inst.PageID != pageID {
			continue
		}
		if locale != "" && inst.Locale != "" && !strings.EqualFold(inst.Locale, locale) {
			continue
		}
		out = append(out, inst)
	}
	return out
}

func PlacementPositionForInstance(placements []*cmswidgets.AreaPlacement, instanceID uuid.UUID) int {
	for _, placement := range placements {
		if placement == nil {
			continue
		}
		if placement.InstanceID == instanceID {
			return placement.Position
		}
	}
	return -1
}
