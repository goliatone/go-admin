package stores

import (
	"context"
	"sort"
	"strings"
)

// DraftUpgradeIssue captures unmet v2 invariants discovered during upgrade.
type DraftUpgradeIssue struct {
	Field   string
	Message string
}

// DraftUpgradeReport captures normalization actions and residual issues.
type DraftUpgradeReport struct {
	AgreementID string
	Upgraded    bool
	Actions     []string
	Issues      []DraftUpgradeIssue
}

// UpgradeDraftAgreementToV2 normalizes draft records to v2 participant/field invariants.
func UpgradeDraftAgreementToV2(ctx context.Context, agreements AgreementStore, scope Scope, agreementID string) (DraftUpgradeReport, error) {
	report := DraftUpgradeReport{AgreementID: strings.TrimSpace(agreementID)}
	if agreements == nil {
		report.Issues = append(report.Issues, DraftUpgradeIssue{Field: "store", Message: "agreement store is required"})
		return report, nil
	}
	if strings.TrimSpace(report.AgreementID) == "" {
		report.Issues = append(report.Issues, DraftUpgradeIssue{Field: "agreement_id", Message: "required"})
		return report, nil
	}

	agreement, err := agreements.GetAgreement(ctx, scope, report.AgreementID)
	if err != nil {
		return report, err
	}
	if agreement.Status != AgreementStatusDraft {
		report.Issues = append(report.Issues, DraftUpgradeIssue{Field: "status", Message: "only draft agreements can be upgraded"})
		return report, nil
	}

	participants, err := agreements.ListParticipants(ctx, scope, report.AgreementID)
	if err != nil {
		return report, err
	}
	if len(participants) == 0 {
		report.Issues = append(report.Issues, DraftUpgradeIssue{Field: "participants", Message: "at least one participant is required"})
		return report, nil
	}

	signers := make([]ParticipantRecord, 0, len(participants))
	for _, participant := range participants {
		if participant.Role == RecipientRoleSigner {
			signers = append(signers, participant)
		}
	}
	if len(signers) == 0 {
		report.Issues = append(report.Issues, DraftUpgradeIssue{Field: "participants.role", Message: "at least one signer is required"})
	}
	sort.Slice(signers, func(i, j int) bool {
		if signers[i].SigningStage == signers[j].SigningStage {
			if signers[i].CreatedAt.Equal(signers[j].CreatedAt) {
				return signers[i].ID < signers[j].ID
			}
			return signers[i].CreatedAt.Before(signers[j].CreatedAt)
		}
		return signers[i].SigningStage < signers[j].SigningStage
	})
	for i, signer := range signers {
		expectedStage := i + 1
		if signer.SigningStage == expectedStage {
			continue
		}
		stage := expectedStage
		if _, err := agreements.UpsertParticipantDraft(ctx, scope, report.AgreementID, ParticipantDraftPatch{ID: signer.ID, SigningStage: &stage}, signer.Version); err != nil {
			return report, err
		}
		report.Actions = append(report.Actions, "updated participant signing_stage to contiguous ordering")
	}

	definitions, err := agreements.ListFieldDefinitions(ctx, scope, report.AgreementID)
	if err != nil {
		return report, err
	}
	instances, err := agreements.ListFieldInstances(ctx, scope, report.AgreementID)
	if err != nil {
		return report, err
	}

	instancesByDefinition := map[string][]FieldInstanceRecord{}
	for _, instance := range instances {
		instancesByDefinition[instance.FieldDefinitionID] = append(instancesByDefinition[instance.FieldDefinitionID], instance)
		pageNumber := instance.PageNumber
		if pageNumber <= 0 {
			pageNumber = 1
		}
		x := instance.X
		y := instance.Y
		width := instance.Width
		if width <= 0 {
			width = 150
		}
		height := instance.Height
		if height <= 0 {
			height = 32
		}
		if pageNumber == instance.PageNumber && width == instance.Width && height == instance.Height {
			continue
		}
		if _, err := agreements.UpsertFieldInstanceDraft(ctx, scope, report.AgreementID, FieldInstanceDraftPatch{
			ID:                instance.ID,
			FieldDefinitionID: &instance.FieldDefinitionID,
			PageNumber:        &pageNumber,
			X:                 &x,
			Y:                 &y,
			Width:             &width,
			Height:            &height,
		}); err != nil {
			return report, err
		}
		report.Actions = append(report.Actions, "normalized invalid field instance geometry")
	}

	for _, definition := range definitions {
		if !definition.Required {
			continue
		}
		if len(instancesByDefinition[definition.ID]) > 0 {
			continue
		}
		page := 1
		x := 10.0
		y := 10.0
		width := 150.0
		height := 32.0
		if _, err := agreements.UpsertFieldInstanceDraft(ctx, scope, report.AgreementID, FieldInstanceDraftPatch{
			FieldDefinitionID: &definition.ID,
			PageNumber:        &page,
			X:                 &x,
			Y:                 &y,
			Width:             &width,
			Height:            &height,
		}); err != nil {
			return report, err
		}
		report.Actions = append(report.Actions, "created default field instance for required definition")
	}

	report.Upgraded = len(report.Actions) > 0
	return report, nil
}

// UpgradeDraftAgreementsToV2 upgrades a scoped batch of draft agreements.
func UpgradeDraftAgreementsToV2(ctx context.Context, agreements AgreementStore, scope Scope, agreementIDs []string) ([]DraftUpgradeReport, error) {
	out := make([]DraftUpgradeReport, 0, len(agreementIDs))
	for _, agreementID := range agreementIDs {
		report, err := UpgradeDraftAgreementToV2(ctx, agreements, scope, agreementID)
		if err != nil {
			return nil, err
		}
		out = append(out, report)
	}
	return out, nil
}
