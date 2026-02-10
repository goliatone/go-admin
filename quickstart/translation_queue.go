package quickstart

import (
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// ErrTranslationQueueConfig indicates invalid quickstart queue wiring.
var ErrTranslationQueueConfig = errors.New("translation queue config invalid")

// TranslationQueueConfig configures optional translation queue wiring in quickstart.
type TranslationQueueConfig struct {
	Enabled             bool     `json:"enabled,omitempty"`
	EnableOpenPool      bool     `json:"enable_open_pool"`
	EnableDashboard     bool     `json:"enable_dashboard_widget"`
	EnableNotifications bool     `json:"enable_notifications"`
	DefaultPriority     string   `json:"default_priority,omitempty"`
	SupportedLocales    []string `json:"supported_locales,omitempty"`

	Repository admin.TranslationAssignmentRepository `json:"-"`
	Service    admin.TranslationQueueService         `json:"-"`

	PermissionRegister PermissionRegisterFunc `json:"-"`
}

type translationQueueConfigError struct {
	Missing []string
	Reason  string
}

func (e translationQueueConfigError) Error() string {
	if len(e.Missing) > 0 {
		return fmt.Sprintf("%s (missing: %s)", ErrTranslationQueueConfig.Error(), strings.Join(e.Missing, ", "))
	}
	if strings.TrimSpace(e.Reason) != "" {
		return fmt.Sprintf("%s (%s)", ErrTranslationQueueConfig.Error(), strings.TrimSpace(e.Reason))
	}
	return ErrTranslationQueueConfig.Error()
}

func (e translationQueueConfigError) Unwrap() error {
	return ErrTranslationQueueConfig
}

// WithTranslationQueueConfig configures opt-in translation queue feature and command/panel wiring.
func WithTranslationQueueConfig(cfg TranslationQueueConfig) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		opts.translationQueueConfig = cfg
		opts.translationQueueConfigSet = true
		if opts.featureDefaults == nil {
			opts.featureDefaults = map[string]bool{}
		}
		opts.featureDefaults[string(admin.FeatureTranslationQueue)] = cfg.Enabled
	}
}

// RegisterTranslationQueueWiring wires queue panels, commands, and optional permissions.
func RegisterTranslationQueueWiring(adm *admin.Admin, cfg TranslationQueueConfig, policyCfg TranslationPolicyConfig, hasPolicyCfg bool) error {
	if adm == nil || !cfg.Enabled {
		return nil
	}

	if strings.TrimSpace(cfg.DefaultPriority) != "" {
		priority := admin.Priority(strings.ToLower(strings.TrimSpace(cfg.DefaultPriority)))
		if !priority.IsValid() {
			return translationQueueConfigError{Reason: fmt.Sprintf("invalid default_priority %q", cfg.DefaultPriority)}
		}
	}

	if _, err := resolveTranslationQueueSupportedLocales(cfg.SupportedLocales, policyCfg, hasPolicyCfg); err != nil {
		return err
	}

	repo := cfg.Repository
	if repo == nil {
		repo = admin.NewInMemoryTranslationAssignmentRepository()
	}
	if _, err := admin.RegisterTranslationQueuePanel(adm, repo); err != nil {
		return err
	}

	service := cfg.Service
	if service == nil {
		service = &admin.DefaultTranslationQueueService{
			Repository:    repo,
			Activity:      adm.ActivityFeed(),
			Notifications: adm.NotificationService(),
			URLs:          adm.URLs(),
		}
	}
	if err := admin.RegisterTranslationQueueCommands(adm.Commands(), service); err != nil {
		return err
	}
	if cfg.PermissionRegister != nil {
		if err := RegisterTranslationQueuePermissions(cfg.PermissionRegister); err != nil {
			return err
		}
	}

	return nil
}

func resolveTranslationQueueSupportedLocales(configured []string, policyCfg TranslationPolicyConfig, hasPolicyCfg bool) ([]string, error) {
	locales := normalizeQueueLocales(configured)
	if len(locales) > 0 {
		policyLocales := []string{}
		if hasPolicyCfg {
			policyLocales = translationPolicyLocales(policyCfg)
		}
		if len(policyLocales) > 0 && !sameLocaleSet(locales, policyLocales) {
			return nil, translationQueueConfigError{
				Reason: fmt.Sprintf(
					"supported_locales mismatch queue=%s policy=%s",
					strings.Join(locales, ","),
					strings.Join(policyLocales, ","),
				),
			}
		}
		return locales, nil
	}

	if hasPolicyCfg {
		policyLocales := translationPolicyLocales(policyCfg)
		if len(policyLocales) > 0 {
			return policyLocales, nil
		}
	}

	return nil, translationQueueConfigError{
		Missing: []string{"supported_locales (or active translation policy locale requirements)"},
	}
}

func translationPolicyLocales(cfg TranslationPolicyConfig) []string {
	set := map[string]struct{}{}
	for _, entityCfg := range cfg.Required {
		for _, transition := range entityCfg {
			for _, locale := range transition.Locales {
				normalized := normalizeQueueLocale(locale)
				if normalized != "" {
					set[normalized] = struct{}{}
				}
			}
			for locale := range transition.RequiredFields {
				normalized := normalizeQueueLocale(locale)
				if normalized != "" {
					set[normalized] = struct{}{}
				}
			}
			for _, env := range transition.Environments {
				for _, locale := range env.Locales {
					normalized := normalizeQueueLocale(locale)
					if normalized != "" {
						set[normalized] = struct{}{}
					}
				}
				for locale := range env.RequiredFields {
					normalized := normalizeQueueLocale(locale)
					if normalized != "" {
						set[normalized] = struct{}{}
					}
				}
			}
		}
	}
	return sortQueueLocales(set)
}

func sameLocaleSet(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	leftSet := map[string]struct{}{}
	for _, value := range left {
		leftSet[normalizeQueueLocale(value)] = struct{}{}
	}
	for _, value := range right {
		if _, ok := leftSet[normalizeQueueLocale(value)]; !ok {
			return false
		}
	}
	return true
}

func normalizeQueueLocales(locales []string) []string {
	set := map[string]struct{}{}
	for _, locale := range locales {
		normalized := normalizeQueueLocale(locale)
		if normalized == "" {
			continue
		}
		set[normalized] = struct{}{}
	}
	return sortQueueLocales(set)
}

func normalizeQueueLocale(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func sortQueueLocales(set map[string]struct{}) []string {
	if len(set) == 0 {
		return nil
	}
	out := make([]string, 0, len(set))
	for locale := range set {
		out = append(out, locale)
	}
	sort.Strings(out)
	return out
}
