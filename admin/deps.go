package admin

import (
	"errors"
	"fmt"

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
	Router AdminRouter
	Logger Logger

	LoggerProvider LoggerProvider

	CMSContainer        CMSContainer
	CMSContainerBuilder CMSContainerBuilder

	Registry    *Registry
	CommandBus  *CommandBus
	JobRegistry *JobRegistry
	URLManager  *urlkit.RouteManager

	Authorizer                     Authorizer
	Authenticator                  Authenticator
	Translator                     Translator
	Workflow                       WorkflowEngine
	TranslationPolicy              TranslationPolicy
	ActivitySink                   ActivitySink
	ActivityRepository             types.ActivityRepository
	ActivityAccessPolicy           activity.ActivityAccessPolicy
	ActivityFeedQuery              ActivityFeedQuerier
	ActivityService                ActivityFeedQuerier
	ActivityEnricher               activity.ActivityEnricher
	ActivityEnrichmentErrorHandler activity.EnrichmentErrorHandler
	ActivityEnrichmentWriteMode    activity.EnrichmentWriteMode
	ActivitySessionIDProvider      activity.SessionIDProvider
	ActivitySessionIDKey           string
	DebugREPLSessionStore          DebugREPLSessionStore
	DebugUserSessionStore          DebugUserSessionStore

	NotificationService NotificationService
	ExportRegistry      ExportRegistry
	ExportRegistrar     ExportHTTPRegistrar
	ExportMetadata      ExportMetadataProvider
	BulkService         BulkService
	MediaLibrary        MediaLibrary

	PreferencesStore PreferencesStore
	ProfileStore     ProfileStore

	UserRepository         UserRepository
	RoleRepository         RoleRepository
	TenantRepository       TenantRepository
	OrganizationRepository OrganizationRepository
	BulkUserImport         *command.BulkUserImportCommand

	SettingsService *SettingsService

	FeatureGate            fggate.FeatureGate
	FeatureCatalog         catalog.Catalog
	FeatureCatalogResolver catalog.MessageResolver
}

type dependencyIssue struct {
	Field  string
	Reason string
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
	Issues []error
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
