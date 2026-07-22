package admin

import "context"

// CommandRunStore persists the complete current projection independently from
// transient transport delivery. Implementations must return isolated records.
type CommandRunStore interface {
	Apply(context.Context, CommandRunUpdate) (CommandRunRecord, bool, error)
	List(context.Context, CommandRunSelector) ([]CommandRunRecord, error)
	Clear(context.Context, CommandRunSelector) error
}

// CommandRunProjection applies one update and returns a complete row when the
// update changed current state.
type CommandRunProjection interface {
	ProjectCommandRun(context.Context, CommandRunUpdate) (CommandRunRecord, bool, error)
}

// CommandRunProjectionFunc adapts a function into CommandRunProjection.
type CommandRunProjectionFunc func(context.Context, CommandRunUpdate) (CommandRunRecord, bool, error)

func (f CommandRunProjectionFunc) ProjectCommandRun(ctx context.Context, update CommandRunUpdate) (CommandRunRecord, bool, error) {
	if f == nil {
		return CommandRunRecord{}, false, nil
	}
	return f(ctx, update)
}

// CommandRunScopeResolver derives trusted scope before an update crosses a
// transport boundary. Implementations must not trust command payload fields.
type CommandRunScopeResolver interface {
	ResolveCommandRunScope(context.Context, CommandRunUpdate) (CommandRunScope, error)
}

// CommandRunScopeResolverFunc adapts a function into CommandRunScopeResolver.
type CommandRunScopeResolverFunc func(context.Context, CommandRunUpdate) (CommandRunScope, error)

func (f CommandRunScopeResolverFunc) ResolveCommandRunScope(ctx context.Context, update CommandRunUpdate) (CommandRunScope, error) {
	if f == nil {
		return CommandRunScope{}, nil
	}
	return f(ctx, update)
}

// CommandRunScopeAuthorizer resolves one authenticated request selector and
// authorizes live event scopes through the same policy.
type CommandRunScopeAuthorizer interface {
	CommandRunSelector(context.Context) (CommandRunSelector, error)
	AuthorizeCommandRun(context.Context, CommandRunScope) (bool, error)
}

// CommandRunScopeAuthorizerFuncs adapts request-scoped functions into an authorizer.
type CommandRunScopeAuthorizerFuncs struct {
	Selector  func(context.Context) (CommandRunSelector, error)
	Authorize func(context.Context, CommandRunScope) (bool, error)
}

func (f CommandRunScopeAuthorizerFuncs) CommandRunSelector(ctx context.Context) (CommandRunSelector, error) {
	if f.Selector == nil {
		return CommandRunSelector{}, nil
	}
	return f.Selector(ctx)
}

func (f CommandRunScopeAuthorizerFuncs) AuthorizeCommandRun(ctx context.Context, scope CommandRunScope) (bool, error) {
	if f.Authorize == nil {
		return false, nil
	}
	return f.Authorize(ctx, scope)
}
