package admin

import (
	"sort"
	"strings"
	"sync"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

const debugREPLCommandResolverKey = "admin.debug.repl.commands"

// DebugREPLCommand describes a CLI command exposed to the REPL UI.
type DebugREPLCommand struct {
	Command     string   `json:"command"`
	Path        []string `json:"path,omitempty"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Aliases     []string `json:"aliases,omitempty"`
	Mutates     bool     `json:"mutates"`
	Permissions []string `json:"-"`
	Roles       []string `json:"-"`
	MessageType string   `json:"-"`
}

// DebugREPLCommandCatalog collects exposed CLI commands via go-command resolvers.
type DebugREPLCommandCatalog struct {
	mu       sync.RWMutex
	commands map[string]DebugREPLCommand
}

var replCommandCatalogOnce sync.Once
var replCommandCatalog *DebugREPLCommandCatalog

func debugREPLCommandCatalog() *DebugREPLCommandCatalog {
	replCommandCatalogOnce.Do(func() {
		replCommandCatalog = NewDebugREPLCommandCatalog()
	})
	return replCommandCatalog
}

// NewDebugREPLCommandCatalog constructs a catalog and attaches its resolver.
func NewDebugREPLCommandCatalog() *DebugREPLCommandCatalog {
	catalog := &DebugREPLCommandCatalog{
		commands: map[string]DebugREPLCommand{},
	}
	catalog.attachResolver()
	return catalog
}

func (c *DebugREPLCommandCatalog) attachResolver() {
	if c == nil || registry.HasResolver(debugREPLCommandResolverKey) {
		return
	}
	_ = registry.AddResolver(debugREPLCommandResolverKey, c.commandResolver())
}

func (c *DebugREPLCommandCatalog) commandResolver() command.Resolver {
	return func(cmd any, meta command.CommandMeta, _ *command.Registry) error {
		cliCmd, ok := cmd.(command.CLICommand)
		if !ok {
			return nil
		}
		exposable, ok := cmd.(command.ExposableCommand)
		if !ok {
			return nil
		}
		exposure := exposable.Exposure()
		if !exposure.ExposeInAdmin {
			return nil
		}
		opts := cliCmd.CLIOptions()
		path := normalizeDebugREPLCommandPath(opts.Path)
		if len(path) == 0 {
			return nil
		}
		commandName := strings.Join(path, " ")
		command := DebugREPLCommand{
			Command:     commandName,
			Path:        path,
			Description: strings.TrimSpace(opts.Description),
			Tags:        normalizeDebugREPLList(exposure.Tags),
			Aliases:     normalizeDebugREPLCommandPath(opts.Aliases),
			Mutates:     exposure.Mutates,
			Permissions: normalizeDebugREPLList(exposure.Permissions),
			Roles:       normalizeDebugREPLList(exposure.Roles),
			MessageType: strings.TrimSpace(meta.MessageType),
		}
		c.mu.Lock()
		if c.commands == nil {
			c.commands = map[string]DebugREPLCommand{}
		}
		c.commands[commandName] = command
		c.mu.Unlock()
		return nil
	}
}

// List returns all captured commands sorted by command path.
func (c *DebugREPLCommandCatalog) List() []DebugREPLCommand {
	if c == nil {
		return nil
	}
	c.mu.RLock()
	out := make([]DebugREPLCommand, 0, len(c.commands))
	for _, cmd := range c.commands {
		out = append(out, cmd)
	}
	c.mu.RUnlock()
	sort.Slice(out, func(i, j int) bool {
		return out[i].Command < out[j].Command
	})
	return out
}

// VisibleCommands filters commands for a specific admin context + REPL config.
func (c *DebugREPLCommandCatalog) VisibleCommands(admin *Admin, adminCtx AdminContext, cfg DebugREPLConfig) []DebugREPLCommand {
	if c == nil || admin == nil {
		return nil
	}
	cfg = normalizeDebugREPLConfig(cfg)
	if !cfg.Enabled || !cfg.AppEnabled {
		return nil
	}
	if !debugREPLRoleAllowed(adminCtx.Context, cfg.AllowedRoles) {
		return nil
	}
	if err := admin.requirePermission(adminCtx, cfg.Permission, debugReplResource); err != nil {
		return nil
	}
	commands := c.List()
	visible := make([]DebugREPLCommand, 0, len(commands))
	for _, cmd := range commands {
		if debugREPLCommandAllowed(admin, adminCtx, cfg, cmd) {
			visible = append(visible, cmd)
		}
	}
	return visible
}

func debugREPLCommandAllowed(admin *Admin, adminCtx AdminContext, cfg DebugREPLConfig, cmd DebugREPLCommand) bool {
	if admin == nil {
		return false
	}
	if len(cmd.Roles) > 0 && !debugREPLRoleAllowed(adminCtx.Context, cmd.Roles) {
		return false
	}
	for _, permission := range cmd.Permissions {
		if err := admin.requirePermission(adminCtx, permission, debugReplResource); err != nil {
			return false
		}
	}
	if !cmd.Mutates {
		return true
	}
	if cfg.ReadOnlyEnabled() {
		return false
	}
	if err := admin.requirePermission(adminCtx, cfg.ExecPermission, debugReplResource); err != nil {
		return false
	}
	return true
}

func normalizeDebugREPLCommandPath(segments []string) []string {
	if len(segments) == 0 {
		return nil
	}
	out := make([]string, 0, len(segments))
	for _, segment := range segments {
		segment = strings.TrimSpace(segment)
		if segment == "" {
			continue
		}
		out = append(out, segment)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func debugREPLCommandsForRequest(admin *Admin, cfg DebugConfig, c router.Context) []DebugREPLCommand {
	if admin == nil || c == nil || admin.replCommandCatalog == nil {
		return nil
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = admin.config.DefaultLocale
	}
	adminCtx := admin.adminContextFromRequest(c, locale)
	if adminCtx.Context == nil {
		adminCtx.Context = c.Context()
	}
	return admin.replCommandCatalog.VisibleCommands(admin, adminCtx, cfg.Repl)
}
