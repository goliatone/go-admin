package quickstart

import (
	"slices"

	fiber3 "github.com/gofiber/fiber/v3"
	router "github.com/goliatone/go-router"
)

// FiberV3ServerConfig holds the native inputs shared by v3 host composition and
// presentation. Its zero value supplies no quickstart defaults. Config owns Views
// and ErrorHandler; AdapterConfig owns the listener settings used by Serve.
// Callers starting WrappedRouter directly must pass ListenConfig themselves.
// This contract does not construct or start a host.
type FiberV3ServerConfig struct {
	Config        fiber3.Config
	AdapterConfig router.FiberV3AdapterConfig
	Middleware    []fiber3.Handler
	EnableLogger  bool
}

// FiberV3ServerOption configures explicit v3 inputs. Apply options in order;
// scalar overrides use the last value and middleware options append in order.
type FiberV3ServerOption func(*FiberV3ServerConfig)

// WithFiberV3Config changes native app configuration, including presentation ports.
func WithFiberV3Config(mutator func(*fiber3.Config)) FiberV3ServerOption {
	return func(opts *FiberV3ServerConfig) {
		if opts != nil && mutator != nil {
			mutator(&opts.Config)
		}
	}
}

// WithFiberV3Views supplies a native v3 view engine without building defaults.
func WithFiberV3Views(views fiber3.Views) FiberV3ServerOption {
	return WithFiberV3Config(func(cfg *fiber3.Config) { cfg.Views = views })
}

// WithFiberV3ErrorHandler supplies native v3 error presentation.
func WithFiberV3ErrorHandler(handler fiber3.ErrorHandler) FiberV3ServerOption {
	return WithFiberV3Config(func(cfg *fiber3.Config) { cfg.ErrorHandler = handler })
}

// WithFiberV3Middleware appends native middleware. It snapshots the supplied slice
// so later caller changes do not alter this option. Nil handlers are ignored.
func WithFiberV3Middleware(handlers ...fiber3.Handler) FiberV3ServerOption {
	handlers = slices.Clone(handlers)
	return func(opts *FiberV3ServerConfig) {
		if opts == nil {
			return
		}
		for _, handler := range handlers {
			if handler != nil {
				opts.Middleware = append(opts.Middleware, handler)
			}
		}
	}
}

// WithFiberV3AdapterConfig changes shared routing and native listen settings.
func WithFiberV3AdapterConfig(mutator func(*router.FiberV3AdapterConfig)) FiberV3ServerOption {
	return func(opts *FiberV3ServerConfig) {
		if opts != nil && mutator != nil {
			mutator(&opts.AdapterConfig)
		}
	}
}

// WithFiberV3Logger selects whether host composition installs its default logger.
func WithFiberV3Logger(enabled bool) FiberV3ServerOption {
	return func(opts *FiberV3ServerConfig) {
		if opts != nil {
			opts.EnableLogger = enabled
		}
	}
}
