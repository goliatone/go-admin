package admin

import (
	"errors"
	"fmt"
)

// Dependencies captures host-provided integrations and storage adapters.
// Optional dependencies fall back to in-memory defaults when omitted.
type Dependencies struct {
	Router AdminRouter

	CMSContainer        CMSContainer
	CMSContainerBuilder CMSContainerBuilder

	Registry    *Registry
	CommandBus  *CommandBus
	JobRegistry *JobRegistry

	Authorizer    Authorizer
	Authenticator Authenticator
	Translator    Translator
	ActivitySink  ActivitySink

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

	SettingsService *SettingsService

	Gates *FeatureGates
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
