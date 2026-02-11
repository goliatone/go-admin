package jobs

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestSMTPEmailProviderConfigFromEnvDefaults(t *testing.T) {
	t.Setenv(EnvEmailSMTPHost, "")
	t.Setenv(EnvEmailSMTPPort, "")
	t.Setenv(EnvEmailDefaultFromName, "")
	t.Setenv(EnvEmailDefaultFromAddress, "")
	t.Setenv(EnvEmailSMTPTimeoutSeconds, "")
	t.Setenv(EnvEmailSMTPDisableSTARTTLS, "")
	t.Setenv(EnvEmailSMTPInsecureTLS, "")

	cfg := SMTPEmailProviderConfigFromEnv()
	if cfg.Host != "localhost" {
		t.Fatalf("expected default host localhost, got %q", cfg.Host)
	}
	if cfg.Port != 1025 {
		t.Fatalf("expected default port 1025, got %d", cfg.Port)
	}
	if cfg.FromAddress != "no-reply@example.test" {
		t.Fatalf("expected default from address, got %q", cfg.FromAddress)
	}
	if cfg.DisableSTARTTLS {
		t.Fatalf("expected disable STARTTLS to default false")
	}
	if cfg.InsecureTLS {
		t.Fatalf("expected insecure TLS to default false")
	}
}

func TestSMTPEmailProviderConfigFromEnvTLSFlags(t *testing.T) {
	t.Setenv(EnvEmailSMTPDisableSTARTTLS, "true")
	t.Setenv(EnvEmailSMTPInsecureTLS, "1")

	cfg := SMTPEmailProviderConfigFromEnv()
	if !cfg.DisableSTARTTLS {
		t.Fatalf("expected disable STARTTLS true")
	}
	if !cfg.InsecureTLS {
		t.Fatalf("expected insecure TLS true")
	}
}

func TestEmailProviderFromEnvDeterministic(t *testing.T) {
	t.Setenv(EnvEmailTransport, "deterministic")
	provider := EmailProviderFromEnv()
	if _, ok := provider.(DeterministicEmailProvider); !ok {
		t.Fatalf("expected deterministic provider, got %T", provider)
	}
}

func TestEmailProviderFromEnvDefaultDeterministic(t *testing.T) {
	t.Setenv(EnvEmailTransport, "")
	provider := EmailProviderFromEnv()
	if _, ok := provider.(DeterministicEmailProvider); !ok {
		t.Fatalf("expected deterministic provider by default, got %T", provider)
	}
}

func TestSMTPEmailProviderSendHonorsContextCancel(t *testing.T) {
	provider := NewSMTPEmailProvider(SMTPEmailProviderConfig{
		Host:        "localhost",
		Port:        1025,
		FromName:    "E-Sign",
		FromAddress: "no-reply@example.test",
		Timeout:     time.Second,
	})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := provider.Send(ctx, EmailSendInput{
		Agreement: stores.AgreementRecord{
			ID:    "agreement-1",
			Title: "Agreement",
		},
		Recipient: stores.RecipientRecord{
			ID:    "recipient-1",
			Email: "recipient@example.test",
		},
	})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context canceled, got %v", err)
	}
}

func TestTextBodyForTemplateIncludesSignLinkAndCorrelation(t *testing.T) {
	body := textBodyForTemplate(EmailSendInput{
		TemplateCode: defaultSigningReminderTemplate,
		Agreement: stores.AgreementRecord{
			ID:    "agreement-1",
			Title: "Mutual NDA",
		},
		Recipient: stores.RecipientRecord{
			ID:    "recipient-1",
			Name:  "Taylor",
			Email: "taylor@example.test",
		},
		SignURL:       "https://example.test/sign/token-1",
		CorrelationID: "corr-123",
	})

	if !strings.Contains(body, "Sign Now: https://example.test/sign/token-1") {
		t.Fatalf("expected sign link in body, got %q", body)
	}
	if !strings.Contains(body, "Correlation ID: corr-123") {
		t.Fatalf("expected correlation id in body, got %q", body)
	}
}

func TestCompletionTemplateUsesCompletionLink(t *testing.T) {
	body := textBodyForTemplate(EmailSendInput{
		TemplateCode: completionCCTemplate,
		Agreement: stores.AgreementRecord{
			ID:    "agreement-1",
			Title: "Mutual NDA",
		},
		Recipient: stores.RecipientRecord{
			ID:    "recipient-cc",
			Name:  "Casey",
			Email: "casey@example.test",
		},
		CompletionURL: "https://example.test/api/v1/esign/signing/assets/token-cc",
	})
	if !strings.Contains(body, "Completion Package Link: https://example.test/api/v1/esign/signing/assets/token-cc") {
		t.Fatalf("expected completion link in body, got %q", body)
	}
}
