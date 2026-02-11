package admin

import (
	"context"
	"errors"
	"fmt"
	"go/parser"
	"io"
	"reflect"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

const (
	debugREPLAppPathSuffix       = "repl/app/ws"
	debugREPLAppCommandEval      = "eval"
	debugREPLAppCommandClose     = "close"
	debugREPLAppEventResult      = "result"
	debugREPLAppEventError       = "error"
	debugREPLAppCloseReasonError = "error"
	debugREPLAppCloseReasonIdle  = "timeout"
	debugREPLAppCloseReasonUser  = "client"
)

var debugREPLAppDefaultPackages = []string{
	"context",
	"encoding/json",
	"fmt",
	"math",
	"strconv",
	"strings",
	"time",
}

type debugREPLAppCommand struct {
	Type string `json:"type"`
	Code string `json:"code,omitempty"`
}

type debugREPLAppEvent struct {
	Type   string `json:"type"`
	Output string `json:"output,omitempty"`
}

func (m *DebugModule) registerDebugREPLAppWebSocket(admin *Admin) {
	if admin == nil || admin.router == nil || m == nil {
		return
	}
	ws, ok := admin.router.(debugWebSocketRouter)
	if !ok {
		return
	}
	basePath := m.basePath
	if basePath == "" {
		basePath = normalizeDebugConfig(m.config, admin.config.BasePath).BasePath
	}
	cfg := router.DefaultWebSocketConfig()
	cfg.OnPreUpgrade = func(c router.Context) (router.UpgradeData, error) {
		if c == nil {
			return nil, ErrForbidden
		}
		var adminCtx AdminContext
		wrap := admin.authWrapper()
		err := wrap(func(c router.Context) error {
			ctx, err := debugREPLAuthorizeRequest(admin, m.config, DebugREPLKindApp, false, c)
			if err != nil {
				return err
			}
			adminCtx = ctx
			return nil
		})(c)
		if err != nil {
			return nil, err
		}
		return router.UpgradeData{
			debugREPLUpgradeAdminContext: adminCtx,
			debugREPLUpgradeIP:           strings.TrimSpace(c.IP()),
			debugREPLUpgradeUserAgent:    strings.TrimSpace(c.Header("User-Agent")),
		}, nil
	}
	path := debugRoutePath(admin, m.config, "admin.debug", "repl.app")
	if path == "" {
		path = joinBasePath(basePath, debugREPLAppPathSuffix)
	}
	ws.WebSocket(path, cfg, func(c router.WebSocketContext) error {
		return handleDebugREPLAppWebSocket(admin, m.config, c)
	})
}

func handleDebugREPLAppWebSocket(admin *Admin, cfg DebugConfig, c router.WebSocketContext) error {
	if admin == nil || c == nil {
		return ErrForbidden
	}
	replCfg := normalizeDebugREPLConfig(cfg.Repl)
	adminCtx, ok := debugREPLAdminContextFromUpgrade(c)
	if !ok {
		adminCtx = AdminContext{Context: c.Context()}
	}
	if adminCtx.Context == nil {
		adminCtx.Context = c.Context()
	}
	if adminCtx.UserID == "" {
		adminCtx.UserID = userIDFromContext(adminCtx.Context)
	}
	sessionManager := admin.DebugREPLSessionManager()
	if sessionManager == nil {
		return ErrForbidden
	}
	session := DebugREPLSession{
		UserID:    adminCtx.UserID,
		IP:        debugREPLUpgradeString(c, debugREPLUpgradeIP),
		UserAgent: debugREPLUpgradeString(c, debugREPLUpgradeUserAgent),
		Kind:      DebugREPLKindApp,
		ReadOnly:  replCfg.ReadOnlyEnabled(),
	}
	session, err := sessionManager.Start(adminCtx.Context, session)
	if err != nil {
		return err
	}
	sessionObject := debugREPLActivityObject(session.ID)
	baseMeta := debugREPLActivityMetadata(session)
	recordDebugREPLActivity(admin, adminCtx.Context, debugREPLActivityActionOpen, sessionObject, baseMeta)

	closeReason := debugREPLAppCloseReasonUser
	defer func() {
		_ = sessionManager.Close(adminCtx.Context, session.ID, time.Now())
		closeMeta := cloneAnyMap(baseMeta)
		closeMeta["reason"] = closeReason
		recordDebugREPLActivity(admin, adminCtx.Context, debugREPLActivityActionClose, sessionObject, closeMeta)
	}()

	interpreter, err := debugREPLAppInterpreter(admin, adminCtx, replCfg)
	if err != nil {
		admin.loggerFor("admin.debug.repl.app").Error("app console initialization failed",
			"error", err)
		initErr := err
		fallback, fallbackErr := debugREPLAppFallbackInterpreter(replCfg)
		if fallbackErr != nil {
			admin.loggerFor("admin.debug.repl.app").Error("app console fallback initialization failed",
				"error", fallbackErr)
			_ = debugREPLAppWriteError(admin, adminCtx, session, c, "", serviceUnavailableDomainError("app console unavailable", map[string]any{
				"component": "debug_repl_app",
				"error":     initErr.Error(),
			}))
		} else {
			interpreter = fallback
			_ = debugREPLAppWriteError(admin, adminCtx, session, c, "", serviceUnavailableDomainError("app console started without admin helpers", map[string]any{
				"component": "debug_repl_app",
				"error":     initErr.Error(),
			}))
		}
	}

	commandCh := make(chan debugREPLAppCommand, 16)
	commandErrCh := make(chan error, 1)
	go func() {
		defer close(commandCh)
		for {
			var cmd debugREPLAppCommand
			if err := c.ReadJSON(&cmd); err != nil {
				commandErrCh <- err
				return
			}
			commandCh <- cmd
		}
	}()

	var timeoutCh <-chan time.Time
	if replCfg.MaxSessionSeconds > 0 {
		timer := time.NewTimer(time.Duration(replCfg.MaxSessionSeconds) * time.Second)
		defer timer.Stop()
		timeoutCh = timer.C
	}

	for {
		select {
		case <-c.Context().Done():
			closeReason = debugREPLAppCloseReasonUser
			return nil
		case err := <-commandErrCh:
			if err != nil && !errors.Is(err, io.EOF) {
				closeReason = debugREPLAppCloseReasonError
				return err
			}
			closeReason = debugREPLAppCloseReasonUser
			return nil
		case cmd, ok := <-commandCh:
			if !ok {
				closeReason = debugREPLAppCloseReasonUser
				return nil
			}
			if err := handleDebugREPLAppCommand(admin, adminCtx, replCfg, session, interpreter, c, cmd); err != nil {
				switch {
				case errors.Is(err, errDebugREPLAppClose):
					closeReason = debugREPLAppCloseReasonUser
					return nil
				case errors.Is(err, errDebugREPLAppTimeout):
					closeReason = debugREPLAppCloseReasonIdle
					return nil
				default:
					closeReason = debugREPLAppCloseReasonError
					return err
				}
			}
		case <-timeoutCh:
			closeReason = debugREPLAppCloseReasonIdle
			return nil
		}
	}
}

var errDebugREPLAppClose = errors.New("app repl close requested")
var errDebugREPLAppTimeout = errors.New("app repl eval timeout")

func handleDebugREPLAppCommand(admin *Admin, adminCtx AdminContext, cfg DebugREPLConfig, session DebugREPLSession, interpreter *interp.Interpreter, c router.WebSocketContext, cmd debugREPLAppCommand) error {
	if admin == nil || c == nil {
		return ErrForbidden
	}
	if interpreter == nil {
		_ = debugREPLAppWriteError(admin, adminCtx, session, c, "", serviceUnavailableDomainError("app console unavailable", map[string]any{
			"component": "debug_repl_app",
		}))
		return nil
	}
	switch strings.ToLower(strings.TrimSpace(cmd.Type)) {
	case debugREPLAppCommandEval:
		code := strings.TrimSpace(cmd.Code)
		if code == "" {
			return nil
		}
		requiresExec := debugREPLAppRequiresExec(code)
		if requiresExec {
			if cfg.ReadOnlyEnabled() {
				return debugREPLAppWriteError(admin, adminCtx, session, c, code, NewDomainError(TextCodeReplReadOnly, "app console is read-only", map[string]any{
					"component": "debug_repl_app",
				}))
			}
			if err := admin.requirePermission(adminCtx, cfg.ExecPermission, debugReplResource); err != nil {
				return debugREPLAppWriteError(admin, adminCtx, session, c, code, err)
			}
		}
		output, err, timedOut := debugREPLAppEval(interpreter, code, time.Duration(cfg.AppEvalTimeoutMs)*time.Millisecond)
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) && timedOut {
				_ = debugREPLAppWriteError(admin, adminCtx, session, c, code, err)
				return errDebugREPLAppTimeout
			}
			return debugREPLAppWriteError(admin, adminCtx, session, c, code, err)
		}
		if err := c.WriteJSON(debugREPLAppEvent{Type: debugREPLAppEventResult, Output: output}); err != nil {
			return err
		}
		debugREPLAppRecordEval(admin, adminCtx.Context, session, code, output, nil)
	case debugREPLAppCommandClose:
		return errDebugREPLAppClose
	}
	return nil
}

func debugREPLAppInterpreter(admin *Admin, adminCtx AdminContext, cfg DebugREPLConfig) (*interp.Interpreter, error) {
	if admin == nil {
		return nil, ErrForbidden
	}
	i := interp.New(interp.Options{})
	if err := i.Use(debugREPLAppSymbolTable(cfg)); err != nil {
		return nil, err
	}
	if err := i.Use(debugREPLAppHelperSymbols(admin, adminCtx)); err != nil {
		return nil, err
	}
	if _, err := i.Eval(`import "repl"`); err != nil {
		return nil, err
	}
	bootstrap := `
var adm = repl.Adm
var cfg = repl.Cfg
var ctx = repl.Ctx
var services = repl.Services
`
	if _, err := i.Eval(bootstrap); err != nil {
		return nil, err
	}
	return i, nil
}

func debugREPLAppFallbackInterpreter(cfg DebugREPLConfig) (*interp.Interpreter, error) {
	i := interp.New(interp.Options{})
	if err := i.Use(debugREPLAppSymbolTable(cfg)); err != nil {
		return nil, err
	}
	return i, nil
}

func debugREPLAppHelperSymbols(admin *Admin, adminCtx AdminContext) interp.Exports {
	ctx := adminCtx.Context
	if ctx == nil {
		ctx = context.Background()
	}
	return interp.Exports{
		"repl/repl": map[string]reflect.Value{
			"Adm":      reflect.ValueOf(admin),
			"Cfg":      reflect.ValueOf(admin.config),
			"Ctx":      reflect.ValueOf(ctx),
			"Services": reflect.ValueOf(admin.Registry()),
		},
	}
}

func debugREPLAppSymbolTable(cfg DebugREPLConfig) interp.Exports {
	allowed := normalizeDebugREPLList(cfg.AppAllowedPackages)
	if len(allowed) == 0 {
		allowed = debugREPLAppDefaultPackages
	}
	symbols := interp.Exports{}
	seen := map[string]bool{}
	for _, pkg := range allowed {
		pkg = strings.TrimSpace(pkg)
		if pkg == "" || seen[pkg] {
			continue
		}
		seen[pkg] = true
		if table, ok := stdlib.Symbols[pkg]; ok {
			symbols[pkg] = table
		}
	}
	return symbols
}

func debugREPLAppRequiresExec(code string) bool {
	code = strings.TrimSpace(code)
	if code == "" {
		return false
	}
	if _, err := parser.ParseExpr(code); err == nil {
		return false
	}
	return true
}

type debugREPLAppEvalResult struct {
	value reflect.Value
	err   error
}

type debugREPLAppEvalWithContext interface {
	EvalWithContext(context.Context, string) (reflect.Value, error)
}

func debugREPLAppEval(interpreter *interp.Interpreter, code string, timeout time.Duration) (string, error, bool) {
	if interpreter == nil {
		return "", ErrForbidden, false
	}
	if timeout <= 0 {
		value, err := interpreter.Eval(code)
		return debugREPLAppFormatValue(value), err, false
	}
	if evaler, ok := any(interpreter).(debugREPLAppEvalWithContext); ok {
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		value, err := evaler.EvalWithContext(ctx, code)
		return debugREPLAppFormatValue(value), err, false
	}
	resultCh := make(chan debugREPLAppEvalResult, 1)
	go func() {
		value, err := interpreter.Eval(code)
		resultCh <- debugREPLAppEvalResult{value: value, err: err}
	}()
	select {
	case result := <-resultCh:
		return debugREPLAppFormatValue(result.value), result.err, false
	case <-time.After(timeout):
		return "", context.DeadlineExceeded, true
	}
}

func debugREPLAppFormatValue(value reflect.Value) string {
	if !value.IsValid() {
		return ""
	}
	if value.CanInterface() {
		return fmt.Sprintf("%#v", value.Interface())
	}
	return fmt.Sprintf("%v", value)
}

func debugREPLAppWriteError(admin *Admin, adminCtx AdminContext, session DebugREPLSession, c router.WebSocketContext, input string, err error) error {
	if err == nil {
		return nil
	}
	if writeErr := c.WriteJSON(debugREPLAppEvent{Type: debugREPLAppEventError, Output: err.Error()}); writeErr != nil {
		return writeErr
	}
	debugREPLAppRecordEval(admin, adminCtx.Context, session, input, "", err)
	return nil
}

func debugREPLAppRecordEval(admin *Admin, ctx context.Context, session DebugREPLSession, input, output string, err error) {
	meta := debugREPLActivityMetadata(session)
	meta["input"] = input
	if err != nil {
		meta["error"] = err.Error()
	} else {
		meta["output"] = output
	}
	recordDebugREPLActivity(admin, ctx, debugREPLActivityActionEval, debugREPLActivityObject(session.ID), meta)
}
