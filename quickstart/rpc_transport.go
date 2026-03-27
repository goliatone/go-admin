package quickstart

import (
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-router/rpcfiber"
)

// RPCTransportConfig configures optional RPC transport endpoint mounting.
type RPCTransportConfig struct {
	Enabled bool `json:"enabled,omitempty"`

	InvokePath string `json:"invoke_path,omitempty"`

	RequireAuth          bool `json:"require_auth,omitempty"`
	AllowUnauthenticated bool `json:"allow_unauthenticated,omitempty"`
	DiscoveryEnabled     bool `json:"discovery_enabled,omitempty"`

	CommandRules map[string]admin.RPCCommandRule `json:"command_rules,omitempty"`
	Authorize    admin.RPCCommandPolicyHook      `json:"-"`

	MetaExtractor rpcfiber.MetaExtractor    `json:"-"`
	BeforeInvoke  rpcfiber.BeforeInvokeHook `json:"-"`
	AfterInvoke   rpcfiber.AfterInvokeHook  `json:"-"`
}

// WithRPCTransport mounts go-router RPC transport routes for the admin RPC server.
func WithRPCTransport(cfg RPCTransportConfig) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.rpcTransportConfig = cfg
		opts.rpcTransportConfigSet = true
	}
}

func applyRPCTransportPolicyConfig(cfg *admin.Config, opts *adminOptions) {
	if cfg == nil || opts == nil || !opts.rpcTransportConfigSet || !opts.rpcTransportConfig.Enabled {
		return
	}
	transport := normalizeRPCTransportConfig(nil, opts.rpcTransportConfig)
	cfg.Commands.RPC.DiscoveryEnabled = transport.DiscoveryEnabled
	if transport.CommandRules != nil {
		cfg.Commands.RPC.Commands = cloneQuickstartRPCCommandRules(transport.CommandRules)
	}
	if transport.Authorize != nil {
		opts.deps.RPCCommandPolicyHook = transport.Authorize
	}
}

func configureRPCTransport(adm *admin.Admin, opts adminOptions) error {
	if adm == nil || !opts.rpcTransportConfigSet {
		return nil
	}
	config := opts.rpcTransportConfig
	if !config.Enabled {
		return nil
	}
	rpcServer := adm.RPCServer()
	if rpcServer == nil {
		return fmt.Errorf("rpc transport enabled but rpc server is not configured")
	}
	cfg := normalizeRPCTransportConfig(adm, config)
	if err := validateRPCTransportExposureConfig(cfg); err != nil {
		return err
	}

	mount := func(r admin.AdminRouter) error {
		if r == nil {
			return nil
		}
		if cfg.RequireAuth && !adm.HasAuthenticator() {
			return fmt.Errorf("rpc transport requires authenticator")
		}
		rt, ok := r.(router.Router[*fiber.App])
		if !ok {
			if opts.rpcTransportConfigSet {
				return fmt.Errorf("rpc transport requires Fiber router")
			}
			return nil
		}

		rpcOpts := []rpcfiber.Option{
			rpcfiber.WithInvokePath(cfg.InvokePath),
			rpcfiber.WithDiscoveryEnabled(cfg.DiscoveryEnabled),
			rpcfiber.WithMetaMergePolicy(rpcfiber.MetaMergePolicyTransportOverrides),
		}
		if cfg.DiscoveryEnabled {
			rpcOpts = append(rpcOpts, rpcfiber.WithEndpointsPath(path.Join(cfg.InvokePath, "endpoints")))
		}
		if cfg.RequireAuth {
			wrapper := adm.AuthWrapper()
			authMiddleware := router.MiddlewareFunc(func(next router.HandlerFunc) router.HandlerFunc {
				if wrapper == nil {
					return next
				}
				return wrapper(next)
			})
			rpcOpts = append(rpcOpts,
				rpcfiber.WithInvokeMiddlewares(authMiddleware),
				rpcfiber.WithDiscoveryMiddlewares(authMiddleware),
			)
		}
		if cfg.MetaExtractor != nil {
			rpcOpts = append(rpcOpts, rpcfiber.WithMetaExtractor(cfg.MetaExtractor))
		}
		if cfg.BeforeInvoke != nil {
			rpcOpts = append(rpcOpts, rpcfiber.WithBeforeInvokeHook(cfg.BeforeInvoke))
		}
		if cfg.AfterInvoke != nil {
			rpcOpts = append(rpcOpts, rpcfiber.WithAfterInvokeHook(cfg.AfterInvoke))
		}
		return rpcfiber.MountFiber(rt, rpcServer, rpcOpts...)
	}
	if r := adm.PublicRouter(); r != nil {
		return mount(r)
	}
	adm.AddInitHook(func(_ admin.AdminRouter) error {
		return mount(adm.PublicRouter())
	})
	return nil
}

func normalizeRPCTransportConfig(adm *admin.Admin, cfg RPCTransportConfig) RPCTransportConfig {
	apiBase := ""
	if adm != nil {
		apiBase = strings.TrimSpace(adm.AdminAPIBasePath())
	}
	if apiBase == "" {
		apiBase = "/api"
	}
	cfg.InvokePath = normalizeRPCPath(cfg.InvokePath, path.Join(apiBase, "rpc"))
	cfg.RequireAuth = resolveRPCTransportRequireAuth(cfg)
	cfg.CommandRules = cloneQuickstartRPCCommandRules(cfg.CommandRules)
	return cfg
}

func validateRPCTransportExposureConfig(cfg RPCTransportConfig) error {
	if !cfg.Enabled || !cfg.AllowUnauthenticated {
		return nil
	}
	if cfg.DiscoveryEnabled {
		return fmt.Errorf("rpc transport unauthenticated mode does not allow discovery")
	}
	for _, rule := range cfg.CommandRules {
		if rule.AllowUnauthenticated {
			return nil
		}
	}
	return fmt.Errorf("rpc transport unauthenticated mode requires at least one command rule with allow_unauthenticated")
}

func resolveRPCTransportRequireAuth(cfg RPCTransportConfig) bool {
	if cfg.AllowUnauthenticated {
		return false
	}
	if cfg.RequireAuth {
		return true
	}
	return true
}

func cloneQuickstartRPCCommandRules(in map[string]admin.RPCCommandRule) map[string]admin.RPCCommandRule {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]admin.RPCCommandRule, len(in))
	for rawName, rawRule := range in {
		name := strings.TrimSpace(rawName)
		if name == "" {
			continue
		}
		out[name] = admin.RPCCommandRule{
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

func normalizeRPCPath(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		value = strings.TrimSpace(fallback)
	}
	if value == "" {
		value = "/"
	}
	value = path.Join("/", value)
	return value
}
