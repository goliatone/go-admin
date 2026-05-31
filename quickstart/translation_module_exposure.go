package quickstart

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type translationModuleExposure struct {
	Module            string `json:"module"`
	CapabilityEnabled bool   `json:"capability_enabled"`
	EntryEnabled      bool   `json:"entry_enabled"`
	Reason            string `json:"reason"`
	ReasonCode        string `json:"reason_code"`
	MissingPermission string `json:"missing_permission"`
}

type translationModuleExposureSnapshot struct {
	Queue    translationModuleExposure `json:"queue"`
	Exchange translationModuleExposure `json:"exchange"`
}

func resolveTranslationModuleExposureSnapshot(adm *admin.Admin, reqCtx context.Context) translationModuleExposureSnapshot {
	caps := translationCapabilitiesForContext(adm, reqCtx)
	return translationModuleExposureSnapshot{
		Queue:    translationModuleExposureFromCapabilities(caps, "queue"),
		Exchange: translationModuleExposureFromCapabilities(caps, "exchange"),
	}
}

func (s translationModuleExposureSnapshot) module(name string) (translationModuleExposure, bool) {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "queue":
		return s.Queue, true
	case "exchange":
		return s.Exchange, true
	default:
		return translationModuleExposure{}, false
	}
}

func translationModuleExposureFromCapabilities(caps map[string]any, module string) translationModuleExposure {
	module = strings.ToLower(strings.TrimSpace(module))
	if module == "" {
		return translationModuleExposure{}
	}

	out := translationModuleExposure{
		Module: module,
	}
	modules, ok := caps["modules"].(map[string]any)
	if !ok {
		modules = nil
	}
	out.CapabilityEnabled = translationModuleEnabled(modules, module)
	out.EntryEnabled = out.CapabilityEnabled

	rawModule, ok := modules[module].(map[string]any)
	if !ok || len(rawModule) == 0 {
		return out
	}
	entry, ok := rawModule["entry"].(map[string]any)
	if !ok || len(entry) == 0 {
		return out
	}
	if enabled, ok := entry["enabled"].(bool); ok {
		out.EntryEnabled = enabled
	}
	if !out.EntryEnabled {
		out.Reason = normalizeCapabilityReason(entry["reason"])
		out.ReasonCode = normalizeCapabilityReason(entry["reason_code"])
		if out.ReasonCode == admin.ActionDisabledReasonCodePermissionDenied {
			out.MissingPermission = normalizeCapabilityReason(entry["missing_permission"])
			if out.MissingPermission == "" {
				out.MissingPermission = normalizeCapabilityReason(entry["permission"])
			}
		}
	}
	return out
}

func normalizeCapabilityReason(value any) string {
	reason := strings.TrimSpace(fmt.Sprint(value))
	if reason == "<nil>" {
		return ""
	}
	return reason
}
