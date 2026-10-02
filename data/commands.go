package data

import (
	"context"
	gocommand "github.com/goliatone/go-command"
)

type Message interface {
	Type() string
	Validate() error
	OperationKind() Kind
	OperationInput() Input
}

type ValidateRequest struct{ Input }

func (ValidateRequest) Type() string            { return Validate.CommandID() }
func (m ValidateRequest) Validate() error       { return m.Input.Validate(Validate) }
func (ValidateRequest) OperationKind() Kind     { return Validate }
func (m ValidateRequest) OperationInput() Input { return m.Input }

type PrepareRequest struct{ Input }

func (PrepareRequest) Type() string            { return Prepare.CommandID() }
func (m PrepareRequest) Validate() error       { return m.Input.Validate(Prepare) }
func (PrepareRequest) OperationKind() Kind     { return Prepare }
func (m PrepareRequest) OperationInput() Input { return m.Input }

type RefreshRequest struct{ Input }

func (RefreshRequest) Type() string            { return Refresh.CommandID() }
func (m RefreshRequest) Validate() error       { return m.Input.Validate(Refresh) }
func (RefreshRequest) OperationKind() Kind     { return Refresh }
func (m RefreshRequest) OperationInput() Input { return m.Input }

type VerifyRequest struct{ Input }

func (VerifyRequest) Type() string            { return Verify.CommandID() }
func (m VerifyRequest) Validate() error       { return m.Input.Validate(Verify) }
func (VerifyRequest) OperationKind() Kind     { return Verify }
func (m VerifyRequest) OperationInput() Input { return m.Input }

type ActivateRequest struct{ Input }

func (ActivateRequest) Type() string            { return Activate.CommandID() }
func (m ActivateRequest) Validate() error       { return m.Input.Validate(Activate) }
func (ActivateRequest) OperationKind() Kind     { return Activate }
func (m ActivateRequest) OperationInput() Input { return m.Input }

type ResetRequest struct{ Input }

func (ResetRequest) Type() string            { return Reset.CommandID() }
func (m ResetRequest) Validate() error       { return m.Input.Validate(Reset) }
func (ResetRequest) OperationKind() Kind     { return Reset }
func (m ResetRequest) OperationInput() Input { return m.Input }

type GenerateRequest struct{ Input }

func (GenerateRequest) Type() string            { return Generate.CommandID() }
func (m GenerateRequest) Validate() error       { return m.Input.Validate(Generate) }
func (GenerateRequest) OperationKind() Kind     { return Generate }
func (m GenerateRequest) OperationInput() Input { return m.Input }

type CancelRequest struct{ Input }

func (CancelRequest) Type() string            { return Cancel.CommandID() }
func (m CancelRequest) Validate() error       { return m.Input.Validate(Cancel) }
func (CancelRequest) OperationKind() Kind     { return Cancel }
func (m CancelRequest) OperationInput() Input { return m.Input }

// Command adapts each distinct typed message to the shared lifecycle service.
type Command[T Message] struct{ Service *Service }

func (c *Command[T]) Run(ctx context.Context, msg T) (Result, error) {
	if c == nil || c.Service == nil {
		return Result{}, Error(CodeUnavailable)
	}
	if err := msg.Validate(); err != nil {
		return Result{}, err
	}
	return c.Service.Run(ctx, msg.OperationKind(), msg.OperationInput())
}
func (c *Command[T]) Execute(ctx context.Context, msg T) error {
	result, err := c.Run(ctx, msg)
	if collector := gocommand.ResultFromContext[Result](ctx); collector != nil {
		if err != nil {
			collector.StoreError(err)
		} else {
			collector.Store(result)
		}
	}
	return err
}
