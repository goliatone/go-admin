package admin

import (
	"maps"
	"strings"

	"github.com/goliatone/go-command"
)

// CommandConfig controls command subsystem behavior.
type CommandConfig struct {
	Execution CommandExecutionPolicy `json:"execution"`
	RPC       RPCCommandConfig       `json:"rpc"`
}

// CommandExecutionPolicy controls dispatch mode resolution for name-based command dispatch.
type CommandExecutionPolicy struct {
	DefaultMode command.ExecutionMode            `json:"default_mode"`
	PerCommand  map[string]command.ExecutionMode `json:"per_command"`
}

// Resolve returns the configured mode for a command id.
func (p CommandExecutionPolicy) Resolve(commandID string) (command.ExecutionMode, bool) {
	commandID = strings.TrimSpace(commandID)
	if commandID == "" || len(p.PerCommand) == 0 {
		return "", false
	}
	mode, ok := p.PerCommand[commandID]
	if !ok {
		return "", false
	}
	mode = command.NormalizeExecutionMode(mode)
	if mode == "" {
		return "", false
	}
	return mode, true
}

// Clone returns a deep copy of the policy.
func (p CommandExecutionPolicy) Clone() CommandExecutionPolicy {
	cloned := CommandExecutionPolicy{
		DefaultMode: command.NormalizeExecutionMode(p.DefaultMode),
		PerCommand:  map[string]command.ExecutionMode{},
	}
	maps.Copy(cloned.PerCommand, p.PerCommand)
	return cloned
}

func normalizeCommandExecutionPolicy(policy CommandExecutionPolicy) (CommandExecutionPolicy, error) {
	normalized := CommandExecutionPolicy{
		DefaultMode: command.NormalizeExecutionMode(policy.DefaultMode),
		PerCommand:  map[string]command.ExecutionMode{},
	}
	if normalized.DefaultMode == "" {
		normalized.DefaultMode = command.ExecutionModeInline
	}
	if err := command.ValidateExecutionMode(normalized.DefaultMode); err != nil {
		return CommandExecutionPolicy{}, err
	}

	for rawKey, rawMode := range policy.PerCommand {
		key := strings.TrimSpace(rawKey)
		if key == "" {
			return CommandExecutionPolicy{}, validationDomainError("command execution policy key required", map[string]any{
				"field": "commands.execution.per_command",
			})
		}
		mode := command.NormalizeExecutionMode(rawMode)
		if mode == "" {
			continue
		}
		if err := command.ValidateExecutionMode(mode); err != nil {
			return CommandExecutionPolicy{}, err
		}
		normalized.PerCommand[key] = mode
	}

	return normalized, nil
}
