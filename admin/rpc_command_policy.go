package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-command"
)

const (
	defaultRPCCommandResource = "commands"
)

var defaultRPCMetadataAllowlist = []string{"request_id", "correlation_id"}

// RPCCommandRule maps a command id to the permission/resource required for RPC dispatch.
type RPCCommandRule struct {
	Permission           string `json:"permission,omitempty"`
	Resource             string `json:"resource,omitempty"`
	AllowUnauthenticated bool   `json:"allow_unauthenticated,omitempty"`
}

// RPCCommandConfig controls command RPC exposure and authorization behavior.
type RPCCommandConfig struct {
	DiscoveryEnabled  bool                      `json:"discovery_enabled,omitempty"`
	Commands          map[string]RPCCommandRule `json:"commands,omitempty"`
	MetadataAllowlist []string                  `json:"metadata_allowlist,omitempty"`
}

// RPCCommandPolicyInput contains trusted request data used by host business-rule checks.
type RPCCommandPolicyInput struct {
	Method         string                  `json:"method,omitempty"`
	CommandName    string                  `json:"command_name,omitempty"`
	Payload        map[string]any          `json:"payload,omitempty"`
	IDs            []string                `json:"ids,omitempty"`
	Rule           RPCCommandRule          `json:"rule"`
	Dispatch       command.DispatchOptions `json:"dispatch"`
	ActorID        string                  `json:"actor_id,omitempty"`
	Subject        string                  `json:"subject,omitempty"`
	TenantID       string                  `json:"tenant_id,omitempty"`
	OrganizationID string                  `json:"organization_id,omitempty"`
	RequestID      string                  `json:"request_id,omitempty"`
	CorrelationID  string                  `json:"correlation_id,omitempty"`
	Metadata       map[string]any          `json:"metadata,omitempty"`
}

// RPCCommandPolicyHook runs host-level business rule checks for allowed RPC commands.
type RPCCommandPolicyHook func(context.Context, RPCCommandPolicyInput) error

func applyRPCCommandConfigDefaults(cfg RPCCommandConfig) RPCCommandConfig {
	cfg.Commands = cloneRPCCommandRules(cfg.Commands)
	if cfg.Commands == nil {
		cfg.Commands = map[string]RPCCommandRule{}
	}
	cfg.MetadataAllowlist = normalizeRPCMetadataAllowlist(cfg.MetadataAllowlist)
	if len(cfg.MetadataAllowlist) == 0 {
		cfg.MetadataAllowlist = append([]string(nil), defaultRPCMetadataAllowlist...)
	}
	return cfg
}

func normalizeRPCCommandConfig(cfg RPCCommandConfig) (RPCCommandConfig, error) {
	normalized := applyRPCCommandConfigDefaults(cfg)
	normalized.Commands = map[string]RPCCommandRule{}

	for rawName, rawRule := range cfg.Commands {
		name := strings.TrimSpace(rawName)
		if name == "" {
			return RPCCommandConfig{}, validationDomainError("rpc command rule name required", map[string]any{
				"field": "commands.rpc.commands",
			})
		}
		rule := RPCCommandRule{
			Permission:           strings.TrimSpace(rawRule.Permission),
			Resource:             strings.TrimSpace(rawRule.Resource),
			AllowUnauthenticated: rawRule.AllowUnauthenticated,
		}
		if rule.Permission == "" && !rule.AllowUnauthenticated {
			return RPCCommandConfig{}, validationDomainError("rpc command rule permission required", map[string]any{
				"field":        "commands.rpc.commands.permission",
				"command_name": name,
			})
		}
		if rule.Resource == "" {
			rule.Resource = defaultRPCCommandResource
		}
		normalized.Commands[name] = rule
	}

	return normalized, nil
}

// ResolveRule returns the configured rule for the given command id.
func (c RPCCommandConfig) ResolveRule(commandName string) (RPCCommandRule, bool) {
	commandName = strings.TrimSpace(commandName)
	if commandName == "" || len(c.Commands) == 0 {
		return RPCCommandRule{}, false
	}
	rule, ok := c.Commands[commandName]
	if !ok {
		return RPCCommandRule{}, false
	}
	return RPCCommandRule{
		Permission:           strings.TrimSpace(rule.Permission),
		Resource:             strings.TrimSpace(rule.Resource),
		AllowUnauthenticated: rule.AllowUnauthenticated,
	}, true
}

func normalizeRPCMetadataAllowlist(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		key := strings.ToLower(strings.TrimSpace(value))
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, key)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneRPCCommandRules(in map[string]RPCCommandRule) map[string]RPCCommandRule {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]RPCCommandRule, len(in))
	for rawName, rawRule := range in {
		name := strings.TrimSpace(rawName)
		if name == "" {
			continue
		}
		out[name] = RPCCommandRule{
			Permission:           strings.TrimSpace(rawRule.Permission),
			Resource:             strings.TrimSpace(rawRule.Resource),
			AllowUnauthenticated: rawRule.AllowUnauthenticated,
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
