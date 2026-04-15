package admin

import (
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/creack/pty"
	"github.com/goliatone/go-admin/internal/primitives"
	router "github.com/goliatone/go-router"
	"golang.org/x/sys/execabs"
)

const (
	debugREPLShellPathSuffix       = "repl/shell/ws"
	debugREPLUpgradeAdminContext   = "repl_admin_ctx"
	debugREPLUpgradeIP             = "repl_ip"
	debugREPLUpgradeUserAgent      = "repl_user_agent"
	debugREPLActivityChannel       = "debug"
	debugREPLActivityObjectPrefix  = "repl_session:"
	debugREPLActivityActionOpen    = "debug.repl.open"
	debugREPLActivityActionEval    = "debug.repl.eval"
	debugREPLActivityActionClose   = "debug.repl.close"
	debugREPLShellCommandInput     = "input"
	debugREPLShellCommandResize    = "resize"
	debugREPLShellCommandClose     = "close"
	debugREPLShellEventOutput      = "output"
	debugREPLShellEventExit        = "exit"
	debugREPLShellCloseReasonError = "error"
	debugREPLShellCloseReasonIdle  = "timeout"
	debugREPLShellCloseReasonUser  = "client"
)

type debugREPLShellCommand struct {
	Type string `json:"type"`
	Data string `json:"data,omitempty"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
}

type debugREPLShellEvent struct {
	Type string `json:"type"`
	Data string `json:"data,omitempty"`
	Code int    `json:"code,omitempty"`
}

type debugREPLSessionRuntime struct {
	adminCtx      AdminContext
	sessionManger *DebugREPLSessionManager
	session       DebugREPLSession
	sessionObject string
	baseMeta      map[string]any
}

func (m *DebugModule) registerDebugREPLShellWebSocket(admin *Admin) {
	if admin == nil || admin.router == nil || m == nil {
		return
	}
	ws, ok := admin.router.(debugWebSocketRouter)
	if !ok {
		return
	}
	basePath := m.basePath
	if basePath == "" {
		basePath = normalizeDebugConfig(m.config, adminBasePath(admin.config)).BasePath
	}
	cfg := router.DefaultWebSocketConfig()
	cfg.OnPreUpgrade = func(c router.Context) (router.UpgradeData, error) {
		if c == nil {
			return nil, ErrForbidden
		}
		var adminCtx AdminContext
		wrap := admin.authWrapper()
		err := wrap(func(c router.Context) error {
			ctx, err := debugREPLAuthorizeRequest(admin, m.config, DebugREPLKindShell, true, c)
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
	wsPath := debugRoutePath(admin, m.config, "admin.debug", "repl.shell")
	if wsPath == "" {
		wsPath = joinBasePath(basePath, debugREPLShellPathSuffix)
	}
	ws.WebSocket(wsPath, cfg, func(c router.WebSocketContext) error {
		return handleDebugREPLShellWebSocket(admin, m.config, c)
	})
}

func handleDebugREPLShellWebSocket(admin *Admin, cfg DebugConfig, c router.WebSocketContext) error {
	if admin == nil || c == nil {
		return ErrForbidden
	}
	replCfg := normalizeDebugREPLConfig(cfg.Repl)
	runtime, err := debugREPLStartSession(admin, c, DebugREPLKindShell, replCfg.ReadOnlyEnabled())
	if err != nil {
		return err
	}
	closeReason := debugREPLShellCloseReasonUser
	defer debugREPLFinishSession(admin, runtime, &closeReason)

	cmd, ptmx, err := debugREPLStartShell(replCfg)
	if err != nil {
		closeReason = debugREPLShellCloseReasonError
		return err
	}
	defer debugREPLStopShell(cmd, ptmx)

	commandCh, commandErrCh := debugREPLShellCommandReader(c)

	outputCh, ptyErrCh, done := debugREPLShellOutputReader(ptmx)
	defer close(done)

	cmdErrCh := make(chan error, 1)
	go func() {
		cmdErrCh <- cmd.Wait()
	}()

	timeoutCh, stopTimeout := debugREPLTimeoutChannel(replCfg.MaxSessionSeconds)
	defer stopTimeout()

	for {
		select {
		case <-c.Context().Done():
			closeReason = debugREPLShellCloseReasonUser
			return nil
		case err := <-commandErrCh:
			if err != nil && !errors.Is(err, io.EOF) {
				closeReason = debugREPLShellCloseReasonError
				return err
			}
			closeReason = debugREPLShellCloseReasonUser
			return nil
		case cmd, ok := <-commandCh:
			if !ok {
				closeReason = debugREPLShellCloseReasonUser
				return nil
			}
			if err := handleDebugREPLShellCommand(admin, runtime.adminCtx.Context, replCfg, runtime.session, ptmx, cmd); err != nil {
				if errors.Is(err, errDebugREPLShellClose) {
					closeReason = debugREPLShellCloseReasonUser
					return nil
				}
				closeReason = debugREPLShellCloseReasonError
				return err
			}
		case out, ok := <-outputCh:
			if !ok {
				outputCh = nil
				continue
			}
			if err := c.WriteJSON(debugREPLShellEvent{Type: debugREPLShellEventOutput, Data: string(out)}); err != nil {
				closeReason = debugREPLShellCloseReasonError
				return err
			}
		case err := <-cmdErrCh:
			exitCode := debugREPLShellExitCode(err)
			_ = c.WriteJSON(debugREPLShellEvent{Type: debugREPLShellEventExit, Code: exitCode})
			closeReason = debugREPLShellCloseReasonUser
			return nil
		case <-ptyErrCh:
			closeReason = debugREPLShellCloseReasonUser
			return nil
		case <-timeoutCh:
			closeReason = debugREPLShellCloseReasonIdle
			return nil
		}
	}
}

func debugREPLStartSession(admin *Admin, c router.WebSocketContext, kind string, readOnly bool) (debugREPLSessionRuntime, error) {
	if admin == nil || c == nil {
		return debugREPLSessionRuntime{}, ErrForbidden
	}
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
		return debugREPLSessionRuntime{}, ErrForbidden
	}
	session := DebugREPLSession{
		UserID:    adminCtx.UserID,
		IP:        debugREPLUpgradeString(c, debugREPLUpgradeIP),
		UserAgent: debugREPLUpgradeString(c, debugREPLUpgradeUserAgent),
		Kind:      kind,
		ReadOnly:  readOnly,
	}
	session, err := sessionManager.Start(adminCtx.Context, session)
	if err != nil {
		return debugREPLSessionRuntime{}, err
	}
	runtime := debugREPLSessionRuntime{
		adminCtx:      adminCtx,
		sessionManger: sessionManager,
		session:       session,
		sessionObject: debugREPLActivityObject(session.ID),
		baseMeta:      debugREPLActivityMetadata(session),
	}
	recordDebugREPLActivity(admin, adminCtx.Context, debugREPLActivityActionOpen, runtime.sessionObject, runtime.baseMeta)
	return runtime, nil
}

func debugREPLFinishSession(admin *Admin, runtime debugREPLSessionRuntime, closeReason *string) {
	if runtime.sessionManger == nil {
		return
	}
	_ = runtime.sessionManger.Close(runtime.adminCtx.Context, runtime.session.ID, time.Now())
	closeMeta := primitives.CloneAnyMap(runtime.baseMeta)
	if closeReason != nil {
		closeMeta["reason"] = *closeReason
	}
	recordDebugREPLActivity(admin, runtime.adminCtx.Context, debugREPLActivityActionClose, runtime.sessionObject, closeMeta)
}

func debugREPLTimeoutChannel(maxSessionSeconds int) (<-chan time.Time, func()) {
	if maxSessionSeconds <= 0 {
		return nil, func() {}
	}
	timer := time.NewTimer(time.Duration(maxSessionSeconds) * time.Second)
	return timer.C, func() { timer.Stop() }
}

func debugREPLShellCommandReader(c router.WebSocketContext) (<-chan debugREPLShellCommand, <-chan error) {
	commandCh := make(chan debugREPLShellCommand, 16)
	commandErrCh := make(chan error, 1)
	go func() {
		defer close(commandCh)
		for {
			var cmd debugREPLShellCommand
			if err := c.ReadJSON(&cmd); err != nil {
				commandErrCh <- err
				return
			}
			commandCh <- cmd
		}
	}()
	return commandCh, commandErrCh
}

func debugREPLShellOutputReader(ptmx *os.File) (<-chan []byte, <-chan error, chan struct{}) {
	outputCh := make(chan []byte, 16)
	ptyErrCh := make(chan error, 1)
	done := make(chan struct{})
	go func() {
		defer close(outputCh)
		defer close(ptyErrCh)
		buf := make([]byte, 4096)
		for {
			n, err := ptmx.Read(buf)
			if n > 0 {
				chunk := make([]byte, n)
				copy(chunk, buf[:n])
				select {
				case outputCh <- chunk:
				case <-done:
					return
				}
			}
			if err != nil {
				select {
				case ptyErrCh <- err:
				case <-done:
				}
				return
			}
		}
	}()
	return outputCh, ptyErrCh, done
}

var errDebugREPLShellClose = errors.New("shell repl close requested")

func handleDebugREPLShellCommand(admin *Admin, ctx context.Context, cfg DebugREPLConfig, session DebugREPLSession, ptmx *os.File, cmd debugREPLShellCommand) error {
	if admin == nil || ptmx == nil {
		return ErrForbidden
	}
	switch strings.ToLower(strings.TrimSpace(cmd.Type)) {
	case debugREPLShellCommandInput:
		if cfg.ReadOnlyEnabled() {
			return nil
		}
		if cmd.Data == "" {
			return nil
		}
		if _, err := ptmx.Write([]byte(cmd.Data)); err != nil {
			return err
		}
		meta := debugREPLActivityMetadata(session)
		meta["input"] = cmd.Data
		recordDebugREPLActivity(admin, ctx, debugREPLActivityActionEval, debugREPLActivityObject(session.ID), meta)
	case debugREPLShellCommandResize:
		if cmd.Cols <= 0 || cmd.Rows <= 0 {
			return nil
		}
		cols, ok := primitives.Uint16FromInt(cmd.Cols)
		if !ok {
			return nil
		}
		rows, ok := primitives.Uint16FromInt(cmd.Rows)
		if !ok {
			return nil
		}
		if err := pty.Setsize(ptmx, &pty.Winsize{Cols: cols, Rows: rows}); err != nil {
			return err
		}
	case debugREPLShellCommandClose:
		return errDebugREPLShellClose
	}
	return nil
}

func debugREPLStartShell(cfg DebugREPLConfig) (*exec.Cmd, *os.File, error) {
	shellCommand, err := execabs.LookPath(strings.TrimSpace(cfg.ShellCommand))
	if err != nil {
		return nil, nil, err
	}
	// #nosec G204 -- shellCommand is resolved to an absolute local executable before launch.
	cmd := execabs.Command(shellCommand, cfg.ShellArgs...)
	if strings.TrimSpace(cfg.WorkingDir) != "" {
		cmd.Dir = filepath.Clean(cfg.WorkingDir)
	}
	if len(cfg.Environment) > 0 {
		cmd.Env = append(os.Environ(), cfg.Environment...)
	}
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return nil, nil, err
	}
	return cmd, ptmx, nil
}

func debugREPLStopShell(cmd *exec.Cmd, ptmx *os.File) {
	if ptmx != nil {
		_ = ptmx.Close()
	}
	if cmd == nil || cmd.Process == nil {
		return
	}
	_ = cmd.Process.Kill()
}

func debugREPLShellExitCode(err error) int {
	if err == nil {
		return 0
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		if status, ok := exitErr.Sys().(syscall.WaitStatus); ok {
			return status.ExitStatus()
		}
	}
	return 1
}

func debugREPLAdminContextFromUpgrade(c router.WebSocketContext) (AdminContext, bool) {
	if c == nil {
		return AdminContext{}, false
	}
	raw, ok := c.UpgradeData(debugREPLUpgradeAdminContext)
	if !ok {
		return AdminContext{}, false
	}
	adminCtx, ok := raw.(AdminContext)
	return adminCtx, ok
}

func debugREPLUpgradeString(c router.WebSocketContext, key string) string {
	if c == nil {
		return ""
	}
	if raw, ok := c.UpgradeData(key); ok {
		if value, ok := raw.(string); ok {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func debugREPLActivityObject(sessionID string) string {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return debugREPLActivityObjectPrefix
	}
	return debugREPLActivityObjectPrefix + sessionID
}

func debugREPLActivityMetadata(session DebugREPLSession) map[string]any {
	return map[string]any{
		"session_id": session.ID,
		"kind":       session.Kind,
		"read_only":  session.ReadOnly,
		"ip":         session.IP,
		"user_agent": session.UserAgent,
	}
}

func recordDebugREPLActivity(admin *Admin, ctx context.Context, action, object string, metadata map[string]any) {
	if admin == nil || admin.activity == nil {
		return
	}
	actor := actorFromContext(ctx)
	if actor == "" {
		actor = ActivityActorTypeSystem
		metadata = tagActivityActorType(metadata, ActivityActorTypeSystem)
	}
	_ = admin.activity.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   object,
		Channel:  debugREPLActivityChannel,
		Metadata: metadata,
	})
}
