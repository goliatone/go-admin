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

	InvokePath    string `json:"invoke_path,omitempty"`
	EndpointsPath string `json:"endpoints_path,omitempty"`

	// RequireFiber fails startup when mounted router is not Fiber-backed.
	RequireFiber bool `json:"require_fiber,omitempty"`

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

func configureRPCTransport(adm *admin.Admin, opts adminOptions) error {
	if adm == nil || !opts.rpcTransportConfigSet || !opts.rpcTransportConfig.Enabled {
		return nil
	}
	rpcServer := adm.RPCServer()
	if rpcServer == nil {
		return fmt.Errorf("rpc transport enabled but rpc server is not configured")
	}
	cfg := normalizeRPCTransportConfig(adm, opts.rpcTransportConfig)
	mount := func(r admin.AdminRouter) error {
		if r == nil {
			return nil
		}
		rt, ok := r.(router.Router[*fiber.App])
		if !ok {
			if cfg.RequireFiber {
				return fmt.Errorf("rpc transport requires Fiber router")
			}
			return nil
		}
		rpcOpts := []rpcfiber.Option{
			rpcfiber.WithInvokePath(cfg.InvokePath),
			rpcfiber.WithEndpointsPath(cfg.EndpointsPath),
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
	adm.AddInitHook(mount)
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
	cfg.EndpointsPath = normalizeRPCPath(cfg.EndpointsPath, path.Join(cfg.InvokePath, "endpoints"))
	return cfg
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
