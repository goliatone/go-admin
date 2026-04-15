package jobs

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"net/mail"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
)

const (
	EnvEmailTransport    = "APP_EMAIL__TRANSPORT"
	EnvEmailSMTPHost     = "APP_EMAIL__SMTP__HOST"
	EnvEmailSMTPPort     = "APP_EMAIL__SMTP__PORT"
	EnvEmailSMTPUsername = "APP_EMAIL__SMTP__USERNAME"
	// #nosec G101 -- configuration key name, not an embedded credential.
	EnvEmailSMTPPassword        = "APP_EMAIL__SMTP__PASSWORD"
	EnvEmailDefaultFromName     = "APP_EMAIL__SMTP__FROM_NAME"
	EnvEmailDefaultFromAddress  = "APP_EMAIL__SMTP__FROM_ADDRESS"
	EnvEmailSMTPTimeoutSeconds  = "APP_EMAIL__SMTP__TIMEOUT_SECONDS"
	EnvEmailSMTPDisableSTARTTLS = "APP_EMAIL__SMTP__DISABLE_STARTTLS"
	EnvEmailSMTPInsecureTLS     = "APP_EMAIL__SMTP__INSECURE_TLS"
)

// SMTPEmailProviderConfig captures SMTP transport settings.
type SMTPEmailProviderConfig struct {
	Host            string        `json:"host"`
	Port            int           `json:"port"`
	Username        string        `json:"username"`
	Password        string        `json:"password"`
	FromName        string        `json:"from_name"`
	FromAddress     string        `json:"from_address"`
	Timeout         time.Duration `json:"timeout"`
	DisableSTARTTLS bool          `json:"disable_starttls"`
	InsecureTLS     bool          `json:"insecure_tls"`
}

// DefaultSMTPEmailProviderConfig returns Mailpit-friendly defaults for local runtime.
func DefaultSMTPEmailProviderConfig() SMTPEmailProviderConfig {
	return SMTPEmailProviderConfig{
		Host:        "localhost",
		Port:        1025,
		FromName:    "E-Sign",
		FromAddress: "no-reply@example.test",
		Timeout:     10 * time.Second,
	}
}

// SMTPEmailProviderConfigFromEnv resolves SMTP config from environment variables.
func SMTPEmailProviderConfigFromEnv() SMTPEmailProviderConfig {
	return SMTPEmailProviderConfigFromRuntime(appcfg.Active())
}

// SMTPEmailProviderConfigFromRuntime resolves SMTP config from runtime config.
func SMTPEmailProviderConfigFromRuntime(runtimeCfg appcfg.Config) SMTPEmailProviderConfig {
	cfg := DefaultSMTPEmailProviderConfig()
	if value := strings.TrimSpace(runtimeCfg.Email.SMTP.Host); value != "" {
		cfg.Host = value
	}
	if runtimeCfg.Email.SMTP.Port > 0 {
		cfg.Port = runtimeCfg.Email.SMTP.Port
	}
	if value := strings.TrimSpace(runtimeCfg.Email.SMTP.Username); value != "" {
		cfg.Username = value
	}
	if value := strings.TrimSpace(runtimeCfg.Email.SMTP.Password); value != "" {
		cfg.Password = value
	}
	if value := strings.TrimSpace(runtimeCfg.Email.SMTP.FromName); value != "" {
		cfg.FromName = value
	}
	if value := strings.TrimSpace(runtimeCfg.Email.SMTP.FromAddress); value != "" {
		cfg.FromAddress = value
	}
	if runtimeCfg.Email.SMTP.TimeoutSeconds > 0 {
		cfg.Timeout = time.Duration(runtimeCfg.Email.SMTP.TimeoutSeconds) * time.Second
	}
	cfg.DisableSTARTTLS = runtimeCfg.Email.SMTP.DisableSTARTTLS
	cfg.InsecureTLS = runtimeCfg.Email.SMTP.InsecureTLS

	transport := strings.ToLower(strings.TrimSpace(runtimeCfg.Email.Transport))
	if transport == "mailpit" {
		cfg.DisableSTARTTLS = true
	}
	return cfg
}

// EmailProviderFromEnv resolves the runtime email provider.
// Default transport is deterministic unless explicitly set to SMTP.
func EmailProviderFromEnv() EmailProvider {
	runtimeCfg := appcfg.Active()
	transport := strings.ToLower(strings.TrimSpace(runtimeCfg.Email.Transport))
	switch transport {
	case "smtp", "mailpit":
		return NewSMTPEmailProvider(SMTPEmailProviderConfigFromRuntime(runtimeCfg))
	case "":
		return DeterministicEmailProvider{}
	case "deterministic", "mock":
		return DeterministicEmailProvider{}
	default:
		return DeterministicEmailProvider{}
	}
}

// SMTPEmailProvider dispatches outgoing messages via SMTP.
type SMTPEmailProvider struct {
	cfg SMTPEmailProviderConfig
}

// NewSMTPEmailProvider builds an SMTP-backed email provider.
func NewSMTPEmailProvider(cfg SMTPEmailProviderConfig) SMTPEmailProvider {
	if cfg.Port <= 0 {
		cfg.Port = DefaultSMTPEmailProviderConfig().Port
	}
	if strings.TrimSpace(cfg.Host) == "" {
		cfg.Host = DefaultSMTPEmailProviderConfig().Host
	}
	if strings.TrimSpace(cfg.FromAddress) == "" {
		cfg.FromAddress = DefaultSMTPEmailProviderConfig().FromAddress
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = DefaultSMTPEmailProviderConfig().Timeout
	}
	return SMTPEmailProvider{cfg: cfg}
}

func (p SMTPEmailProvider) Send(ctx context.Context, input EmailSendInput) (string, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	to := strings.TrimSpace(input.Recipient.Email)
	if to == "" {
		return "", fmt.Errorf("recipient email is required")
	}
	host := strings.TrimSpace(p.cfg.Host)
	if host == "" {
		return "", fmt.Errorf("smtp host is required")
	}
	from := strings.TrimSpace(p.cfg.FromAddress)
	if from == "" {
		return "", fmt.Errorf("smtp from address is required")
	}

	providerMessageID := p.providerMessageID(input, host)
	subject := subjectForTemplate(input)
	textBody := textBodyForTemplate(input)
	htmlBody := htmlBodyForTemplate(input)
	fromHeader := formatFromHeader(p.cfg.FromName, from)
	toHeader := cleanHeaderValue(to)
	subjectHeader := cleanHeaderValue(subject)
	boundary := "esign-boundary-" + providerMessageID

	message := strings.Join([]string{
		"From: " + fromHeader,
		"To: " + toHeader,
		"Subject: " + subjectHeader,
		"Date: " + time.Now().UTC().Format(time.RFC1123Z),
		"Message-ID: <" + providerMessageID + "@" + host + ">",
		"MIME-Version: 1.0",
		"Content-Type: multipart/alternative; boundary=\"" + boundary + "\"",
		"",
		"--" + boundary,
		"Content-Type: text/plain; charset=UTF-8",
		"",
		textBody,
		"",
		"--" + boundary,
		"Content-Type: text/html; charset=UTF-8",
		"",
		htmlBody,
		"",
		"--" + boundary + "--",
	}, "\r\n")

	addr := fmt.Sprintf("%s:%d", host, p.cfg.Port)

	sendErr := make(chan error, 1)
	go func() {
		sendErr <- p.sendMail(addr, host, from, to, []byte(message))
	}()

	timeout := p.cfg.Timeout
	if timeout <= 0 {
		timeout = DefaultSMTPEmailProviderConfig().Timeout
	}
	timer := time.NewTimer(timeout)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return "", ctx.Err()
	case <-timer.C:
		return "", fmt.Errorf("smtp send timed out after %s", timeout)
	case err := <-sendErr:
		if err != nil {
			return "", err
		}
		CaptureRecipientLink(input)
		return providerMessageID, nil
	}
}

func (p SMTPEmailProvider) sendMail(addr, host, from, to string, message []byte) error {
	client, err := smtp.Dial(addr)
	if err != nil {
		return err
	}
	defer client.Close()

	if !p.cfg.DisableSTARTTLS {
		if ok, _ := client.Extension("STARTTLS"); ok {
			tlsConfig := &tls.Config{
				ServerName: host,
				// #nosec G402 -- explicitly configurable for local/dev SMTP endpoints that terminate TLS upstream.
				InsecureSkipVerify: p.cfg.InsecureTLS,
			}
			startTLSErr := client.StartTLS(tlsConfig)
			if startTLSErr != nil {
				return startTLSErr
			}
		}
	}

	if p.cfg.Username != "" || p.cfg.Password != "" {
		if ok, _ := client.Extension("AUTH"); !ok {
			return fmt.Errorf("smtp server does not support AUTH")
		}
		auth := smtp.PlainAuth("", p.cfg.Username, p.cfg.Password, host)
		authErr := client.Auth(auth)
		if authErr != nil {
			return authErr
		}
	}

	mailErr := client.Mail(from)
	if mailErr != nil {
		return mailErr
	}
	rcptErr := client.Rcpt(to)
	if rcptErr != nil {
		return rcptErr
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}
	if err := client.Quit(); err != nil {
		return err
	}
	return nil
}

func (p SMTPEmailProvider) providerMessageID(input EmailSendInput, host string) string {
	payload := strings.Join([]string{
		strings.TrimSpace(input.TemplateCode),
		strings.TrimSpace(input.Agreement.ID),
		strings.TrimSpace(input.Recipient.ID),
		strings.TrimSpace(input.Recipient.Email),
		strings.TrimSpace(input.CorrelationID),
		strings.TrimSpace(host),
		strconv.FormatInt(time.Now().UTC().UnixNano(), 10),
	}, "|")
	sum := sha256.Sum256([]byte(payload))
	return "smtp_" + hex.EncodeToString(sum[:8])
}

func subjectForTemplate(input EmailSendInput) string {
	title := strings.TrimSpace(input.Agreement.Title)
	if title == "" {
		title = strings.TrimSpace(input.Agreement.ID)
	}
	switch strings.TrimSpace(input.TemplateCode) {
	case completionCCTemplate:
		return "Agreement Completed: " + title
	case defaultSigningReminderTemplate:
		return "Reminder: Signature Requested: " + title
	case reviewInvitationTemplate:
		return "Review Requested: " + title
	default:
		return "Signature Requested: " + title
	}
}

func textBodyForTemplate(input EmailSendInput) string {
	name := strings.TrimSpace(input.Recipient.Name)
	if name == "" {
		name = strings.TrimSpace(input.Recipient.Email)
	}
	agreementTitle := strings.TrimSpace(input.Agreement.Title)
	if agreementTitle == "" {
		agreementTitle = strings.TrimSpace(input.Agreement.ID)
	}
	switch strings.TrimSpace(input.TemplateCode) {
	case completionCCTemplate:
		lines := []string{
			fmt.Sprintf("Hello %s,", name),
			"",
			"An agreement has been completed. Your completion package is ready.",
			fmt.Sprintf("Agreement: %s", agreementTitle),
		}
		if completionURL := strings.TrimSpace(input.CompletionURL); completionURL != "" {
			lines = append(lines, fmt.Sprintf("Completion Package Link: %s", completionURL))
		}
		if correlationID := strings.TrimSpace(input.CorrelationID); correlationID != "" {
			lines = append(lines, "", fmt.Sprintf("Correlation ID: %s", correlationID))
		}
		return strings.Join(lines, "\n")
	case defaultSigningReminderTemplate:
		lines := []string{
			fmt.Sprintf("Hello %s,", name),
			"",
			"This is a reminder that an agreement is waiting for your signature.",
			fmt.Sprintf("Agreement: %s", agreementTitle),
		}
		if signURL := strings.TrimSpace(input.SignURL); signURL != "" {
			lines = append(lines, fmt.Sprintf("Sign Now: %s", signURL))
		}
		if correlationID := strings.TrimSpace(input.CorrelationID); correlationID != "" {
			lines = append(lines, "", fmt.Sprintf("Correlation ID: %s", correlationID))
		}
		return strings.Join(lines, "\n")
	case reviewInvitationTemplate:
		lines := []string{
			fmt.Sprintf("Hello %s,", name),
			"",
			"You have been invited to review an agreement.",
			fmt.Sprintf("Agreement: %s", agreementTitle),
		}
		if reviewURL := strings.TrimSpace(input.ReviewURL); reviewURL != "" {
			lines = append(lines, fmt.Sprintf("Review Agreement: %s", reviewURL))
		}
		if correlationID := strings.TrimSpace(input.CorrelationID); correlationID != "" {
			lines = append(lines, "", fmt.Sprintf("Correlation ID: %s", correlationID))
		}
		return strings.Join(lines, "\n")
	default:
		lines := []string{
			fmt.Sprintf("Hello %s,", name),
			"",
			"You have a new agreement waiting for your signature.",
			fmt.Sprintf("Agreement: %s", agreementTitle),
		}
		if signURL := strings.TrimSpace(input.SignURL); signURL != "" {
			lines = append(lines, fmt.Sprintf("Sign Now: %s", signURL))
		}
		if correlationID := strings.TrimSpace(input.CorrelationID); correlationID != "" {
			lines = append(lines, "", fmt.Sprintf("Correlation ID: %s", correlationID))
		}
		return strings.Join(lines, "\n")
	}
}

func htmlBodyForTemplate(input EmailSendInput) string {
	name := htmlEscape(strings.TrimSpace(input.Recipient.Name))
	if name == "" {
		name = htmlEscape(strings.TrimSpace(input.Recipient.Email))
	}
	agreementTitle := htmlEscape(strings.TrimSpace(input.Agreement.Title))
	if agreementTitle == "" {
		agreementTitle = htmlEscape(strings.TrimSpace(input.Agreement.ID))
	}
	correlation := htmlEscape(strings.TrimSpace(input.CorrelationID))

	switch strings.TrimSpace(input.TemplateCode) {
	case completionCCTemplate:
		completionURL := htmlEscape(strings.TrimSpace(input.CompletionURL))
		lines := []string{
			"<html><body>",
			fmt.Sprintf("<p>Hello %s,</p>", name),
			"<p>An agreement has been completed. Your completion package is ready.</p>",
			fmt.Sprintf("<p><strong>Agreement:</strong> %s</p>", agreementTitle),
		}
		if completionURL != "" {
			lines = append(lines, fmt.Sprintf("<p><a href=\"%s\">Open Completion Package</a></p>", completionURL))
		}
		if correlation != "" {
			lines = append(lines, fmt.Sprintf("<p><small>Correlation ID: %s</small></p>", correlation))
		}
		lines = append(lines, "</body></html>")
		return strings.Join(lines, "")
	case defaultSigningReminderTemplate:
		signURL := htmlEscape(strings.TrimSpace(input.SignURL))
		lines := []string{
			"<html><body>",
			fmt.Sprintf("<p>Hello %s,</p>", name),
			"<p>This is a reminder that an agreement is waiting for your signature.</p>",
			fmt.Sprintf("<p><strong>Agreement:</strong> %s</p>", agreementTitle),
		}
		if signURL != "" {
			lines = append(lines, fmt.Sprintf("<p><a href=\"%s\">Review and Sign</a></p>", signURL))
		}
		if correlation != "" {
			lines = append(lines, fmt.Sprintf("<p><small>Correlation ID: %s</small></p>", correlation))
		}
		lines = append(lines, "</body></html>")
		return strings.Join(lines, "")
	case reviewInvitationTemplate:
		reviewURL := htmlEscape(strings.TrimSpace(input.ReviewURL))
		lines := []string{
			"<html><body>",
			fmt.Sprintf("<p>Hello %s,</p>", name),
			"<p>You have been invited to review an agreement.</p>",
			fmt.Sprintf("<p><strong>Agreement:</strong> %s</p>", agreementTitle),
		}
		if reviewURL != "" {
			lines = append(lines, fmt.Sprintf("<p><a href=\"%s\">Open Review</a></p>", reviewURL))
		}
		if correlation != "" {
			lines = append(lines, fmt.Sprintf("<p><small>Correlation ID: %s</small></p>", correlation))
		}
		lines = append(lines, "</body></html>")
		return strings.Join(lines, "")
	default:
		signURL := htmlEscape(strings.TrimSpace(input.SignURL))
		lines := []string{
			"<html><body>",
			fmt.Sprintf("<p>Hello %s,</p>", name),
			"<p>You have a new agreement waiting for your signature.</p>",
			fmt.Sprintf("<p><strong>Agreement:</strong> %s</p>", agreementTitle),
		}
		if signURL != "" {
			lines = append(lines, fmt.Sprintf("<p><a href=\"%s\">Review and Sign</a></p>", signURL))
		}
		if correlation != "" {
			lines = append(lines, fmt.Sprintf("<p><small>Correlation ID: %s</small></p>", correlation))
		}
		lines = append(lines, "</body></html>")
		return strings.Join(lines, "")
	}
}

func formatFromHeader(name, address string) string {
	name = cleanHeaderValue(name)
	address = strings.TrimSpace(address)
	if address == "" {
		return ""
	}
	if name == "" {
		return address
	}
	parsed := mail.Address{Name: name, Address: address}
	return parsed.String()
}

func cleanHeaderValue(value string) string {
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, "\r", " ")
	value = strings.ReplaceAll(value, "\n", " ")
	return strings.TrimSpace(value)
}

func htmlEscape(value string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		"\"", "&quot;",
		"'", "&#39;",
	)
	return replacer.Replace(strings.TrimSpace(value))
}
