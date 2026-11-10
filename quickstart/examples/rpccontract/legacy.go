package rpccontract

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command"
)

// The legacy command is intentionally not selected for typed export.
const LegacyCommandID = "resources.legacy"

type legacyMessage struct{ Message }

func (legacyMessage) Type() string { return LegacyCommandID }

type legacyHandler struct{ service *Service }

func (h legacyHandler) Execute(ctx context.Context, m legacyMessage) error {
	out, err := h.service.Update(ctx, m.Message)
	if err != nil {
		return err
	}
	command.ResultFromContext[Result](ctx).Store(out)
	return nil
}
func registerLegacy(set *admin.CommandRegistrationSet, h *Host) error {
	if err := admin.RegisterSetCommand(set, legacyHandler{h.Service}); err != nil {
		return err
	}
	return admin.RegisterSetContextMessageResultFactory[legacyMessage, Result](set, LegacyCommandID, func(ctx context.Context, payload map[string]any, ids []string) (legacyMessage, error) {
		// This is an existing-style factory: transport numbers are float64 and alias
		// normalization has already produced dry_run. Typed hosts preserve that view.
		if _, ok := payload["count"].(float64); !ok {
			return legacyMessage{}, fmt.Errorf("legacy count is not float64")
		}
		if _, ok := payload["dryRun"]; ok {
			return legacyMessage{}, fmt.Errorf("legacy alias was not normalized")
		}
		raw, err := json.Marshal(payload)
		if err != nil {
			return legacyMessage{}, err
		}
		var input Input
		if err = json.Unmarshal(raw, &input); err != nil {
			return legacyMessage{}, err
		}
		input.DryRun, _ = payload["dry_run"].(bool)
		if err = h.Service.Authorize(ctx, input.ResourceID); err != nil {
			return legacyMessage{}, err
		}
		return legacyMessage{Message{Input: input, IDs: ids}}, nil
	})
}
