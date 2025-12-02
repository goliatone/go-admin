package admin

import "context"

// Command represents a basic go-command style handler.
type Command interface {
	Name() string
	Execute(ctx context.Context) error
}

// CLIOptions describes optional CLI metadata for a command.
type CLIOptions struct {
	Path        []string
	Description string
	Group       string
	Aliases     []string
}

// CommandWithCLI allows a command to expose CLI metadata.
type CommandWithCLI interface {
	Command
	CLIOptions() *CLIOptions
}

// CommandWithCron allows a command to expose cron scheduling metadata.
type CommandWithCron interface {
	Command
	CronSpec() string
	CronHandler() func() error
}

// CommandRegistry stores command registrations for multiple transports.
type CommandRegistry struct {
	enabled    bool
	commands   []Command
	commandMap map[string]Command
	cliOptions []CLIOptions
	cronHooks  []CronHook
}

// CronHook represents cron metadata tied to a command handler.
type CronHook struct {
	Spec    string
	Handler func() error
	Name    string
}

// NewCommandRegistry constructs a registry that can be toggled off.
func NewCommandRegistry(enabled bool) *CommandRegistry {
	return &CommandRegistry{enabled: enabled, commandMap: make(map[string]Command)}
}

// Register adds a command to the registry if enabled.
func (r *CommandRegistry) Register(cmd Command) {
	if r == nil || !r.enabled || cmd == nil {
		return
	}
	r.commands = append(r.commands, cmd)
	r.commandMap[cmd.Name()] = cmd
	if withCLI, ok := cmd.(CommandWithCLI); ok {
		if opts := withCLI.CLIOptions(); opts != nil {
			r.cliOptions = append(r.cliOptions, *opts)
		}
	}
	if withCron, ok := cmd.(CommandWithCron); ok {
		if handler := withCron.CronHandler(); handler != nil {
			r.cronHooks = append(r.cronHooks, CronHook{
				Spec:    withCron.CronSpec(),
				Handler: handler,
				Name:    cmd.Name(),
			})
		}
	}
}

// Commands returns all registered commands.
func (r *CommandRegistry) Commands() []Command {
	return r.commands
}

// CLI returns all CLI metadata for registered commands.
func (r *CommandRegistry) CLI() []CLIOptions {
	return r.cliOptions
}

// Cron returns cron hooks for registered commands.
func (r *CommandRegistry) Cron() []CronHook {
	return r.cronHooks
}

// Dispatch executes a registered command by name.
func (r *CommandRegistry) Dispatch(ctx context.Context, name string) error {
	if r == nil || !r.enabled {
		return FeatureDisabledError{Feature: string(FeatureCommands)}
	}
	cmd, ok := r.commandMap[name]
	if !ok {
		return ErrNotFound
	}
	return cmd.Execute(ctx)
}
