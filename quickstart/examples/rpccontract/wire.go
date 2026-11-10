package rpccontract

import (
	"context"
	"reflect"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

const ReceiptCommandID = "resources.touch"
const WireMethod = "resources.wire"

// The receipt-only variant deliberately makes no promise of a domain result.
func ReceiptDeclaration() cmdrpc.CommandContract {
	return cmdrpc.CommandContract{ID: ReceiptCommandID, Input: reflect.TypeFor[Input]()}
}

type receiptMessage struct{ Message }

func (receiptMessage) Type() string { return ReceiptCommandID }

type receiptHandler struct{ service *Service }

func (h receiptHandler) Execute(ctx context.Context, m receiptMessage) error {
	_, err := h.service.Update(ctx, m.Message)
	return err
}
func registerReceipt(set *admin.CommandRegistrationSet, h *Host) error {
	binding, err := admin.NewRPCCommandBinding[Input, any](ReceiptDeclaration(), WirePolicy())
	if err != nil {
		return err
	}
	if err = admin.RegisterSetCommand(set, receiptHandler{h.Service}); err != nil {
		return err
	}
	return admin.RegisterSetTypedRPCCommand(set, binding, func(ctx context.Context, input Input, ids []string) (receiptMessage, error) {
		if err := h.Service.Authorize(ctx, input.ResourceID); err != nil {
			return receiptMessage{}, err
		}
		return receiptMessage{Message{Input: input, IDs: ids}}, nil
	})
}

type WireRequest struct {
	Case string `json:"case"`
}

// Wire cases are synthetic serialization fixtures behind the same authentication
// boundary. They exercise values the minimal object-result service does not emit.
func wireEndpoint(h *Host) cmdrpc.EndpointDefinition {
	return cmdrpc.NewEndpoint[WireRequest, any](cmdrpc.EndpointSpec{Method: WireMethod, Kind: cmdrpc.MethodKindQuery}, func(ctx context.Context, req cmdrpc.RequestEnvelope[WireRequest]) (cmdrpc.ResponseEnvelope[any], error) {
		if err := h.Service.Authorize(ctx, "resource-a"); err != nil {
			return cmdrpc.ResponseEnvelope[any]{}, err
		}
		var value any
		switch req.Data.Case {
		case "absent":
			value = nil
		case "null":
			value = (*bool)(nil)
		case "false":
			value = false
		case "zero":
			value = 0
		case "empty":
			value = ""
		case "array":
			value = []string{}
		case "object":
			value = map[string]any{}
		case "domain":
			value = map[string]any{"data": "business", "result": false}
		case "status":
			value = command.CommandDispatchResponse{Receipt: command.DispatchReceipt{Accepted: true, Mode: command.ExecutionModeQueued, CommandID: CommandID, DispatchID: "status-example"}, StatusReference: "jobs/status-example", ValidationErrors: []command.CommandDispatchValidationError{{Path: "resource.displayName", Code: "example", Message: "public validation fixture", Details: map[string]any{"limit": 3}}}}
		default:
			return cmdrpc.ResponseEnvelope[any]{}, admin.ErrNotFound
		}
		return cmdrpc.ResponseEnvelope[any]{Data: value}, nil
	})
}
