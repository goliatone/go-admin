package admin

import (
	"context"
	"io"
	"testing"
	"time"

	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type stubWebSocketContext struct {
	*router.MockContext
	writes []any
}

func newStubWebSocketContext() *stubWebSocketContext {
	mockCtx := router.NewMockContext()
	mockCtx.On("Context").Return(context.Background())
	return &stubWebSocketContext{MockContext: mockCtx}
}

func (s *stubWebSocketContext) IsWebSocket() bool                  { return true }
func (s *stubWebSocketContext) WebSocketUpgrade() error            { return nil }
func (s *stubWebSocketContext) WriteMessage(_ int, _ []byte) error { return nil }
func (s *stubWebSocketContext) ReadMessage() (int, []byte, error)  { return 0, nil, io.EOF }
func (s *stubWebSocketContext) WriteJSON(v any) error {
	s.writes = append(s.writes, v)
	return nil
}
func (s *stubWebSocketContext) ReadJSON(_ any) error                                { return io.EOF }
func (s *stubWebSocketContext) WritePing(_ []byte) error                            { return nil }
func (s *stubWebSocketContext) WritePong(_ []byte) error                            { return nil }
func (s *stubWebSocketContext) Close() error                                        { return nil }
func (s *stubWebSocketContext) CloseWithStatus(_ int, _ string) error               { return nil }
func (s *stubWebSocketContext) SetReadDeadline(_ time.Time) error                   { return nil }
func (s *stubWebSocketContext) SetWriteDeadline(_ time.Time) error                  { return nil }
func (s *stubWebSocketContext) SetPingHandler(_ func(data []byte) error)            {}
func (s *stubWebSocketContext) SetPongHandler(_ func(data []byte) error)            {}
func (s *stubWebSocketContext) SetCloseHandler(_ func(code int, text string) error) {}
func (s *stubWebSocketContext) Subprotocol() string                                 { return "" }
func (s *stubWebSocketContext) Extensions() []string                                { return nil }
func (s *stubWebSocketContext) RemoteAddr() string                                  { return "" }
func (s *stubWebSocketContext) LocalAddr() string                                   { return "" }
func (s *stubWebSocketContext) IsConnected() bool                                   { return true }
func (s *stubWebSocketContext) ConnectionID() string                                { return "stub-conn" }
func (s *stubWebSocketContext) UpgradeData(_ string) (any, bool)                    { return nil, false }

func TestDebugDashboardRendersTemplate(t *testing.T) {
	cfg := DebugConfig{
		Enabled:       true,
		MaxLogEntries: 10,
		MaxSQLQueries: 5,
		Panels:        []string{DebugPanelRequests},
	}
	mod := NewDebugModule(cfg)
	mod.config = normalizeDebugConfig(cfg, "/admin")
	mod.basePath = "/admin/debug"
	mod.adminBasePath = "/admin"

	mockCtx := router.NewMockContext()
	mockCtx.On("Render", "resources/debug/index", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		return viewCtx["debug_path"] == "/admin/debug"
	})).Return(nil)

	if err := mod.handleDebugDashboard(nil, mockCtx); err != nil {
		t.Fatalf("handle debug dashboard: %v", err)
	}
	mockCtx.AssertExpectations(t)
}

func TestDebugWebSocketWritesSnapshot(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL:  true,
		CaptureLogs: true,
		Panels:      []string{DebugPanelTemplate, DebugPanelCustom},
	}
	mod := NewDebugModule(cfg)
	mod.collector = NewDebugCollector(cfg)

	ws := newStubWebSocketContext()
	if err := mod.handleDebugWebSocket(ws); err != nil {
		t.Fatalf("handle debug websocket: %v", err)
	}
	if len(ws.writes) == 0 {
		t.Fatalf("expected websocket snapshot write")
	}
	event, ok := ws.writes[0].(DebugEvent)
	if !ok || event.Type != debugEventSnapshot {
		t.Fatalf("expected snapshot event, got %+v", ws.writes[0])
	}
}
