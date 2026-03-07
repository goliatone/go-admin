package main

import (
	"testing"

	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
)

func TestParseArgsSupportsFlagsBeforeAndAfterCommand(t *testing.T) {
	opts, err := parseArgs([]string{"--timeout", "45s", "status", "--config", "examples/esign/config/app.json"})
	if err != nil {
		t.Fatalf("parseArgs: %v", err)
	}
	if opts.Command != commandStatus {
		t.Fatalf("expected command %q, got %q", commandStatus, opts.Command)
	}
	if opts.ConfigPath != "examples/esign/config/app.json" {
		t.Fatalf("expected config path to be parsed")
	}
	if opts.Timeout.String() != "45s" {
		t.Fatalf("expected timeout 45s, got %s", opts.Timeout)
	}
}

func TestParseArgsRejectsUnsupportedCommand(t *testing.T) {
	_, err := parseArgs([]string{"nuke"})
	if err == nil {
		t.Fatalf("expected parseArgs to fail for unsupported command")
	}
}

func TestRedactDSNMasksPassword(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "url dsn",
			in:   "postgres://user:secret@localhost:5432/esign?sslmode=disable",
			want: "postgres://user:%2A%2A%2A@localhost:5432/esign?sslmode=disable",
		},
		{
			name: "kv dsn",
			in:   "host=localhost user=admin password=secret dbname=esign sslmode=disable",
			want: "host=localhost user=admin password=*** dbname=esign sslmode=disable",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := redactDSN(tc.in)
			if got != tc.want {
				t.Fatalf("unexpected redaction\nwant: %s\ngot:  %s", tc.want, got)
			}
		})
	}
}

func TestAssertRollbackSafetyBlocksSQLite(t *testing.T) {
	err := assertRollbackSafety(&esignpersistence.ClientHandles{Dialect: esignpersistence.DialectSQLite})
	if err == nil {
		t.Fatalf("expected sqlite rollback safety check to fail")
	}
}
