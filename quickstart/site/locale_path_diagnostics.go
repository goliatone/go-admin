package site

import "sync"

type LocalePathBridgeDiagnostic struct {
	StoredPath     string `json:"stored_path"`
	TargetLocale   string `json:"target_locale"`
	DetectedLocale string `json:"detected_locale,omitempty"`
	Reason         string `json:"reason"`
}

var localePathBridgeDiagnosticSink struct {
	sync.RWMutex
	record func(LocalePathBridgeDiagnostic)
}

func SetLocalePathBridgeDiagnosticSink(record func(LocalePathBridgeDiagnostic)) func() {
	localePathBridgeDiagnosticSink.Lock()
	previous := localePathBridgeDiagnosticSink.record
	localePathBridgeDiagnosticSink.record = record
	localePathBridgeDiagnosticSink.Unlock()
	return func() {
		localePathBridgeDiagnosticSink.Lock()
		localePathBridgeDiagnosticSink.record = previous
		localePathBridgeDiagnosticSink.Unlock()
	}
}

func emitLocalePathBridgeDiagnostic(diag LocalePathBridgeDiagnostic) {
	localePathBridgeDiagnosticSink.RLock()
	record := localePathBridgeDiagnosticSink.record
	localePathBridgeDiagnosticSink.RUnlock()
	if record != nil {
		record(diag)
	}
}
