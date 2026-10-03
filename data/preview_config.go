package data

import (
	"slices"
	"strings"
	"time"
)

type previewAuthorization struct {
	service   *Service
	record    PreviewRecord
	binding   exploreBinding
	revisions []insightRevision
	// True only when this launch allocated its requested UUID, never on replay.
	newAllocation bool
}

func normalizePreviewConfig(c *ApplicationPreviewConfig, policy Policy) error {
	if c.Lifetime == 0 {
		c.Lifetime = PreviewDefaultLifetime
	}
	if c.Now == nil {
		c.Now = time.Now
	}
	if c.Lifetime < time.Second || c.Lifetime > PreviewMaxLifetime || len(c.Surfaces) > PreviewMaxSurfaces {
		return Error(CodeInvalid)
	}
	if err := validatePreviewAdapterConfig(c); err != nil {
		return err
	}
	if c.Enabled {
		if revision, ok := policy.(InsightAuthorizationRevision); !ok || nilValue(revision) {
			return Error(CodeUnavailable)
		}
	}
	ids := map[string]bool{}
	for _, surface := range c.Surfaces {
		if ids[surface.ID] {
			return Error(CodeInvalid)
		}
		if err := validatePreviewSurface(surface); err != nil {
			return err
		}
		ids[surface.ID] = true
	}
	c.Surfaces = append([]PreviewSurface(nil), c.Surfaces...)
	for i := range c.Surfaces {
		c.Surfaces[i].Fields = append([]string(nil), c.Surfaces[i].Fields...)
	}
	return nil
}

func validatePreviewSurface(surface PreviewSurface) error {
	if !exploreID(surface.ID) || strings.TrimSpace(surface.Label) == "" || len(surface.Label) > 128 || !slices.Contains([]string{"screen", "report"}, surface.Kind) {
		return Error(CodeInvalid)
	}
	if len(surface.Fields) > 32 || surface.EntityID != "" && !exploreID(surface.EntityID) {
		return Error(CodeInvalid)
	}
	for _, field := range surface.Fields {
		if !exploreID(field) {
			return Error(CodeInvalid)
		}
	}
	return nil
}

func validatePreviewAdapterConfig(c *ApplicationPreviewConfig) error {
	if !nilValue(c.Adapter) && (!exploreID(c.ApplicationID) || !exploreID(c.EnvironmentID)) {
		return Error(CodeInvalid)
	}
	if c.Enabled && (nilValue(c.Adapter) || !c.Adapter.PreviewGuarantees().Safe()) {
		return Error(CodeUnavailable)
	}
	return nil
}
