package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"github.com/goliatone/go-admin/data"
	"io"
)

// RegisterDataCommands owns the sole lifecycle handler/factory generation. The
// service resolves current trusted actor and delegated identity for every call.
func RegisterDataCommands(bus *CommandBus, service *data.Service) (CommandRegistrationHandle, error) {
	if bus == nil || service == nil {
		return nil, data.Error(data.CodeUnavailable)
	}
	set, err := bus.NewRegistrationSet("admin.data")
	if err != nil {
		return nil, err
	}
	if err = registerDataCommand[data.ValidateRequest](set, service); err != nil {
		return nil, err
	}
	if err = registerDataCommand[data.PrepareRequest](set, service); err != nil {
		return nil, err
	}
	if err = registerDataCommand[data.RefreshRequest](set, service); err != nil {
		return nil, err
	}
	if err = registerDataCommand[data.VerifyRequest](set, service); err != nil {
		return nil, err
	}
	if err = registerDataCommand[data.ActivateRequest](set, service); err != nil {
		return nil, err
	}
	if err = registerDataCommand[data.ResetRequest](set, service); err != nil {
		return nil, err
	}
	if err = registerDataCommand[data.GenerateRequest](set, service); err != nil {
		return nil, err
	}
	if err = registerDataCommand[data.CancelRequest](set, service); err != nil {
		return nil, err
	}
	return set.Commit()
}
func registerDataCommand[T data.Message](set *CommandRegistrationSet, service *data.Service) error {
	var msg T
	if err := RegisterSetCommand(set, &data.Command[T]{Service: service}); err != nil {
		return err
	}
	return RegisterSetContextMessageResultFactory[T, data.Result](set, msg.Type(), func(ctx context.Context, payload map[string]any, ids []string) (T, error) {
		var input T
		if len(ids) != 0 {
			return input, data.Error(data.CodeInvalid)
		}
		encoded, err := json.Marshal(payload)
		if err != nil || len(encoded) > 64<<10 {
			return input, data.Error(data.CodeInvalid)
		}
		decoder := json.NewDecoder(bytes.NewReader(encoded))
		decoder.DisallowUnknownFields()
		if err = decoder.Decode(&input); err != nil {
			return input, data.Error(data.CodeInvalid)
		}
		var extra any
		if err = decoder.Decode(&extra); !errors.Is(err, io.EOF) {
			return input, data.Error(data.CodeInvalid)
		}
		if err = input.Validate(); err != nil {
			return input, err
		}
		if err = service.AuthorizeInput(ctx, input.OperationKind(), input.OperationInput()); err != nil {
			return input, err
		}
		return input, nil
	})
}
