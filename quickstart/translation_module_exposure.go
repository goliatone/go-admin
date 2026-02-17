package quickstart

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type translationModuleExposure struct {
	Module            string
	CapabilityEnabled bool
	EntryEnabled      bool
	Reason            string
	ReasonCode        string
}

type translationModuleExposureSnapshot struct {
	Queue    translationModuleExposure
	Exchange translationModuleExposure
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
	modules, _ := caps["modules"].(map[string]any)
	out.CapabilityEnabled = translationModuleEnabled(modules, module)
	out.EntryEnabled = out.CapabilityEnabled

	rawModule, _ := modules[module].(map[string]any)
	if len(rawModule) == 0 {
		return out
	}
	entry, _ := rawModule["entry"].(map[string]any)
	if len(entry) == 0 {
		return out
	}
	if enabled, ok := entry["enabled"].(bool); ok {
		out.EntryEnabled = enabled
	}
	if !out.EntryEnabled {
		out.Reason = normalizeCapabilityReason(entry["reason"])
		out.ReasonCode = normalizeCapabilityReason(entry["reason_code"])
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
