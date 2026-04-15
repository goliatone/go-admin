package admin

import (
	"errors"
	"fmt"

	translationservices "github.com/goliatone/go-admin/translations/services"
	cmdrpc "github.com/goliatone/go-command/rpc"
	"github.com/goliatone/go-featuregate/catalog"
	fggate "github.com/goliatone/go-featuregate/gate"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/command"
	"github.com/goliatone/go-users/pkg/types"
)

// Dependencies captures host-provided integrations and storage adapters.
// Optional dependencies fall back to in-memory defaults when omitted.
type Dependencies struct {
	Router AdminRouter `json:"router"`
	Logger Logger      `json:"logger"`

	LoggerProvider LoggerProvider `json:"logger_provider"`

	CMSContainer        CMSContainer        `json:"cms_container"`
	CMSContainerBuilder CMSContainerBuilder `json:"cms_container_builder"`

	Registry             *Registry            `json:"registry"`
	CommandBus           *CommandBus          `json:"command_bus"`
	RPCServer            *cmdrpc.Server       `json:"rpc_server"`
	RPCCommandPolicyHook RPCCommandPolicyHook `json:"rpc_command_policy_hook"`
	JobRegistry          *JobRegistry         `json:"job_registry"`
	URLManager           *urlkit.RouteManager `json:"url_manager"`

	Authorizer                     Authorizer                      `json:"authorizer"`
	Authenticator                  Authenticator                   `json:"authenticator"`
	Translator                     Translator                      `json:"translator"`
	Workflow                       WorkflowEngine                  `json:"workflow"`
	WorkflowRuntime                WorkflowRuntime                 `json:"workflow_runtime"`
	TranslationPolicy              TranslationPolicy               `json:"translation_policy"`
	TranslationFamilyStore         translationservices.FamilyStore `json:"translation_family_store"`
	ActivitySink                   ActivitySink                    `json:"activity_sink"`
	ActivityRepository             types.ActivityRepository        `json:"activity_repository"`
	ActivityAccessPolicy           activity.ActivityAccessPolicy   `json:"activity_access_policy"`
	ActivityFeedQuery              ActivityFeedQuerier             `json:"activity_feed_query"`
	ActivityService                ActivityFeedQuerier             `json:"activity_service"`
	ActivityEnricher               activity.ActivityEnricher       `json:"activity_enricher"`
	ActivityEnrichmentErrorHandler activity.EnrichmentErrorHandler `json:"activity_enrichment_error_handler"`
	ActivityEnrichmentWriteMode    activity.EnrichmentWriteMode    `json:"activity_enrichment_write_mode"`
	ActivitySessionIDProvider      activity.SessionIDProvider      `json:"activity_session_id_provider"`
	ActivitySessionIDKey           string                          `json:"activity_session_id_key"`
	DebugREPLSessionStore          DebugREPLSessionStore           `json:"debug_repl_session_store"`
	DebugUserSessionStore          DebugUserSessionStore           `json:"debug_user_session_store"`

	NotificationService NotificationService    `json:"notification_service"`
	ExportRegistry      ExportRegistry         `json:"export_registry"`
	ExportRegistrar     ExportHTTPRegistrar    `json:"export_registrar"`
	ExportMetadata      ExportMetadataProvider `json:"export_metadata"`
	BulkService         BulkService            `json:"bulk_service"`
	MediaLibrary        MediaLibrary           `json:"media_library"`
	MediaActivityHook   MediaActivityHook      `json:"media_activity_hook"`

	PreferencesStore PreferencesStore `json:"preferences_store"`
	ProfileStore     ProfileStore     `json:"profile_store"`

	UserRepository         UserRepository                 `json:"user_repository"`
	RoleRepository         RoleRepository                 `json:"role_repository"`
	TenantRepository       TenantRepository               `json:"tenant_repository"`
	OrganizationRepository OrganizationRepository         `json:"organization_repository"`
	BulkUserImport         *command.BulkUserImportCommand `json:"bulk_user_import"`

	SettingsService *SettingsService `json:"settings_service"`

	IconService *IconService `json:"icon_service"`

	FeatureGate            fggate.FeatureGate      `json:"feature_gate"`
	FeatureCatalog         catalog.Catalog         `json:"feature_catalog"`
	FeatureCatalogResolver catalog.MessageResolver `json:"feature_catalog_resolver"`
}

type dependencyIssue struct {
	Field  string `json:"field"`
	Reason string `json:"reason"`
}

func (i dependencyIssue) Error() string {
	if i.Field == "" {
		return i.Reason
	}
	return fmt.Sprintf("%s: %s", i.Field, i.Reason)
}

// InvalidDependenciesError aggregates one or more dependency validation failures.
var ErrInvalidDependencies = errors.New("invalid dependencies")

type InvalidDependenciesError struct {
	Issues []error `json:"issues"`
}

func (e InvalidDependenciesError) Error() string {
	if len(e.Issues) == 0 {
		return ErrInvalidDependencies.Error()
	}
	return fmt.Sprintf("%s (%d issues)", ErrInvalidDependencies.Error(), len(e.Issues))
}

func (e InvalidDependenciesError) Unwrap() error {
	return ErrInvalidDependencies
}

func (d Dependencies) validate(cfg Config) error {
	_ = cfg
	issues := []error{}

	if (d.UserRepository == nil) != (d.RoleRepository == nil) {
		issues = append(issues, dependencyIssue{
			Field:  "UserRepository/RoleRepository",
			Reason: "must be provided together (or both omitted)",
		})
	}

	if len(issues) == 0 {
		return nil
	}
	return InvalidDependenciesError{Issues: issues}
}
