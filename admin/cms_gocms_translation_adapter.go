package admin

import (
	"context"

	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

// CreateTranslation attempts to use a first-class go-cms translation command when available.
func (a *GoCMSContentAdapter) CreateTranslation(ctx context.Context, input TranslationCreateInput) (*CMSContent, error) {
	if a == nil || a.content == nil {
		return nil, ErrNotFound
	}
	input = normalizeTranslationCreateInput(input)
	if input.SourceID == "" {
		return nil, validationDomainError("translation requires a single id", map[string]any{
			"field": "id",
		})
	}
	if input.Locale == "" {
		return nil, validationDomainError("translation locale required", map[string]any{
			"field": "locale",
		})
	}
	if a.adminWrite != nil && shouldUseAdminContentTranslationCreate(input) {
		sourceID := cmsadapter.UUIDFromString(input.SourceID)
		if sourceID == uuid.Nil {
			return nil, ErrNotFound
		}
		record, err := a.adminWrite.CreateTranslation(ctx, cms.AdminContentCreateTranslationRequest{
			SourceID:       sourceID,
			TargetLocale:   input.Locale,
			FamilyID:       cmsadapter.UUIDPointerFromString(toString(input.Metadata["family_id"])),
			EnvironmentKey: input.Environment,
			ActorID:        actorUUID(ctx),
			Status:         input.Status,
			Path:           input.Path,
			RouteKey:       input.RouteKey,
			Metadata:       cloneAnyMap(input.Metadata),
		})
		if err != nil {
			return nil, normalizeGoCMSTranslationCreateError(err, input)
		}
		if record == nil {
			return nil, ErrNotFound
		}
		converted := a.convertAdminContentRecord(ctx, *record)
		return &converted, nil
	}
	record, err := a.createTranslationRecordViaLegacyReflection(ctx, input)
	if err != nil {
		return nil, err
	}
	converted := a.convertContent(ctx, record, input.Locale)
	return &converted, nil
}

func shouldUseAdminContentTranslationCreate(TranslationCreateInput) bool {
	return true
}
