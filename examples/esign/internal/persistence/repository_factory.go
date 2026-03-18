package persistence

import (
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin/txoutbox"
	"github.com/goliatone/go-admin/examples/esign/stores"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// OutboxMessageRecord represents durable outbox rows.
type OutboxMessageRecord struct {
	bun.BaseModel `bun:"table:outbox_messages,alias:obx"`
	txoutbox.Message
}

// IntegrationMutationClaimRecord represents idempotency claim rows for integration mutations.
type IntegrationMutationClaimRecord struct {
	bun.BaseModel  `bun:"table:integration_mutation_claims,alias:imc"`
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	OrgID          string    `json:"org_id"`
	IdempotencyKey string    `json:"idempotency_key"`
	FirstSeenAt    time.Time `json:"first_seen_at"`
	CreatedAt      time.Time `json:"created_at"`
}

// RepositoryFactory builds Bun-backed repositories for e-sign aggregates.
type RepositoryFactory struct {
	db *bun.DB

	repositoryDBOptions []repository.Option

	documents                 repository.Repository[*stores.DocumentRecord]
	drafts                    repository.Repository[*stores.DraftRecord]
	agreements                repository.Repository[*stores.AgreementRecord]
	recipients                repository.Repository[*stores.RecipientRecord]
	participants              repository.Repository[*stores.ParticipantRecord]
	fields                    repository.Repository[*stores.FieldRecord]
	fieldDefinitions          repository.Repository[*stores.FieldDefinitionRecord]
	fieldInstances            repository.Repository[*stores.FieldInstanceRecord]
	signingTokens             repository.Repository[*stores.SigningTokenRecord]
	fieldValues               repository.Repository[*stores.FieldValueRecord]
	draftAuditEvents          repository.Repository[*stores.DraftAuditEventRecord]
	auditEvents               repository.Repository[*stores.AuditEventRecord]
	signatureArtifacts        repository.Repository[*stores.SignatureArtifactRecord]
	signerProfiles            repository.Repository[*stores.SignerProfileRecord]
	savedSignerSignatures     repository.Repository[*stores.SavedSignerSignatureRecord]
	agreementArtifacts        repository.Repository[*stores.AgreementArtifactRecord]
	emailLogs                 repository.Repository[*stores.EmailLogRecord]
	jobRuns                   repository.Repository[*stores.JobRunRecord]
	googleImportRuns          repository.Repository[*stores.GoogleImportRunRecord]
	agreementReminderStates   repository.Repository[*stores.AgreementReminderStateRecord]
	outboxMessages            repository.Repository[*OutboxMessageRecord]
	integrationCredentials    repository.Repository[*stores.IntegrationCredentialRecord]
	mappingSpecs              repository.Repository[*stores.MappingSpecRecord]
	integrationBindings       repository.Repository[*stores.IntegrationBindingRecord]
	integrationSyncRuns       repository.Repository[*stores.IntegrationSyncRunRecord]
	integrationCheckpoints    repository.Repository[*stores.IntegrationCheckpointRecord]
	integrationConflicts      repository.Repository[*stores.IntegrationConflictRecord]
	integrationChangeEvents   repository.Repository[*stores.IntegrationChangeEventRecord]
	integrationMutationClaims repository.Repository[*IntegrationMutationClaimRecord]
	placementRuns             repository.Repository[*stores.PlacementRunRecord]
}

type RepositoryFactoryOption func(*RepositoryFactory)

// WithRepositoryDBOptions configures go-repository-bun DB options used for all repositories.
func WithRepositoryDBOptions(opts ...repository.Option) RepositoryFactoryOption {
	return func(factory *RepositoryFactory) {
		if factory == nil {
			return
		}
		filtered := make([]repository.Option, 0, len(opts))
		for _, opt := range opts {
			if opt != nil {
				filtered = append(filtered, opt)
			}
		}
		factory.repositoryDBOptions = append(factory.repositoryDBOptions, filtered...)
	}
}

// NewRepositoryFactory returns an uninitialized repository factory.
func NewRepositoryFactory(opts ...RepositoryFactoryOption) *RepositoryFactory {
	factory := &RepositoryFactory{}
	for _, opt := range opts {
		if opt != nil {
			opt(factory)
		}
	}
	return factory
}

// NewRepositoryFactoryFromDB builds repository wiring from an existing Bun DB.
func NewRepositoryFactoryFromDB(db *bun.DB, opts ...RepositoryFactoryOption) (*RepositoryFactory, error) {
	factory := NewRepositoryFactory(opts...)
	factory.db = db
	_, err := factory.Build(db)
	if err != nil {
		return nil, err
	}
	return factory, nil
}

// NewRepositoryFactoryFromPersistence builds repository wiring from a persistence candidate that exposes DB().
func NewRepositoryFactoryFromPersistence(candidate any, opts ...RepositoryFactoryOption) (*RepositoryFactory, error) {
	factory := NewRepositoryFactory(opts...)
	_, err := factory.Build(candidate)
	if err != nil {
		return nil, err
	}
	return factory, nil
}

// Build resolves DB wiring and initializes all e-sign repositories.
func (f *RepositoryFactory) Build(candidate any) (*RepositoryFactory, error) {
	if f == nil {
		return nil, fmt.Errorf("esign persistence: repository factory is nil")
	}
	if f.db == nil {
		db, err := resolveRepositoryFactoryBunDB(candidate)
		if err != nil {
			return nil, err
		}
		f.db = db
	}
	if f.documents != nil {
		return f, nil
	}
	f.initRepositories()
	return f, nil
}

func (f *RepositoryFactory) initRepositories() {
	f.documents = newRepositoryWithFactoryConfig(f.db, documentHandlers(), f.repositoryDBOptions)
	f.drafts = newRepositoryWithFactoryConfig(f.db, draftHandlers(), f.repositoryDBOptions)
	f.agreements = newRepositoryWithFactoryConfig(f.db, agreementHandlers(), f.repositoryDBOptions)
	f.recipients = newRepositoryWithFactoryConfig(f.db, recipientHandlers(), f.repositoryDBOptions)
	f.participants = newRepositoryWithFactoryConfig(f.db, participantHandlers(), f.repositoryDBOptions)
	f.fields = newRepositoryWithFactoryConfig(f.db, fieldHandlers(), f.repositoryDBOptions)
	f.fieldDefinitions = newRepositoryWithFactoryConfig(f.db, fieldDefinitionHandlers(), f.repositoryDBOptions)
	f.fieldInstances = newRepositoryWithFactoryConfig(f.db, fieldInstanceHandlers(), f.repositoryDBOptions)
	f.signingTokens = newRepositoryWithFactoryConfig(f.db, signingTokenHandlers(), f.repositoryDBOptions)
	f.fieldValues = newRepositoryWithFactoryConfig(f.db, fieldValueHandlers(), f.repositoryDBOptions)
	f.draftAuditEvents = newRepositoryWithFactoryConfig(f.db, draftAuditEventHandlers(), f.repositoryDBOptions)
	f.auditEvents = newRepositoryWithFactoryConfig(f.db, auditEventHandlers(), f.repositoryDBOptions)
	f.signatureArtifacts = newRepositoryWithFactoryConfig(f.db, signatureArtifactHandlers(), f.repositoryDBOptions)
	f.signerProfiles = newRepositoryWithFactoryConfig(f.db, signerProfileHandlers(), f.repositoryDBOptions)
	f.savedSignerSignatures = newRepositoryWithFactoryConfig(f.db, savedSignerSignatureHandlers(), f.repositoryDBOptions)
	f.agreementArtifacts = newRepositoryWithFactoryConfig(f.db, agreementArtifactHandlers(), f.repositoryDBOptions)
	f.emailLogs = newRepositoryWithFactoryConfig(f.db, emailLogHandlers(), f.repositoryDBOptions)
	f.jobRuns = newRepositoryWithFactoryConfig(f.db, jobRunHandlers(), f.repositoryDBOptions)
	f.googleImportRuns = newRepositoryWithFactoryConfig(f.db, googleImportRunHandlers(), f.repositoryDBOptions)
	f.agreementReminderStates = newRepositoryWithFactoryConfig(f.db, agreementReminderStateHandlers(), f.repositoryDBOptions)
	f.outboxMessages = newRepositoryWithFactoryConfig(f.db, outboxMessageHandlers(), f.repositoryDBOptions)
	f.integrationCredentials = newRepositoryWithFactoryConfig(f.db, integrationCredentialHandlers(), f.repositoryDBOptions)
	f.mappingSpecs = newRepositoryWithFactoryConfig(f.db, mappingSpecHandlers(), f.repositoryDBOptions)
	f.integrationBindings = newRepositoryWithFactoryConfig(f.db, integrationBindingHandlers(), f.repositoryDBOptions)
	f.integrationSyncRuns = newRepositoryWithFactoryConfig(f.db, integrationSyncRunHandlers(), f.repositoryDBOptions)
	f.integrationCheckpoints = newRepositoryWithFactoryConfig(f.db, integrationCheckpointHandlers(), f.repositoryDBOptions)
	f.integrationConflicts = newRepositoryWithFactoryConfig(f.db, integrationConflictHandlers(), f.repositoryDBOptions)
	f.integrationChangeEvents = newRepositoryWithFactoryConfig(f.db, integrationChangeEventHandlers(), f.repositoryDBOptions)
	f.integrationMutationClaims = newRepositoryWithFactoryConfig(f.db, integrationMutationClaimHandlers(), f.repositoryDBOptions)
	f.placementRuns = newRepositoryWithFactoryConfig(f.db, placementRunHandlers(), f.repositoryDBOptions)
}

// DB returns the Bun DB used by the repository factory.
func (f *RepositoryFactory) DB() *bun.DB {
	if f == nil {
		return nil
	}
	return f.db
}

func (f *RepositoryFactory) Documents() repository.Repository[*stores.DocumentRecord] {
	if f == nil {
		return nil
	}
	return f.documents
}

func (f *RepositoryFactory) Drafts() repository.Repository[*stores.DraftRecord] {
	if f == nil {
		return nil
	}
	return f.drafts
}

func (f *RepositoryFactory) Agreements() repository.Repository[*stores.AgreementRecord] {
	if f == nil {
		return nil
	}
	return f.agreements
}

func (f *RepositoryFactory) Recipients() repository.Repository[*stores.RecipientRecord] {
	if f == nil {
		return nil
	}
	return f.recipients
}

func (f *RepositoryFactory) Participants() repository.Repository[*stores.ParticipantRecord] {
	if f == nil {
		return nil
	}
	return f.participants
}

func (f *RepositoryFactory) Fields() repository.Repository[*stores.FieldRecord] {
	if f == nil {
		return nil
	}
	return f.fields
}

func (f *RepositoryFactory) FieldDefinitions() repository.Repository[*stores.FieldDefinitionRecord] {
	if f == nil {
		return nil
	}
	return f.fieldDefinitions
}

func (f *RepositoryFactory) FieldInstances() repository.Repository[*stores.FieldInstanceRecord] {
	if f == nil {
		return nil
	}
	return f.fieldInstances
}

func (f *RepositoryFactory) SigningTokens() repository.Repository[*stores.SigningTokenRecord] {
	if f == nil {
		return nil
	}
	return f.signingTokens
}

func (f *RepositoryFactory) FieldValues() repository.Repository[*stores.FieldValueRecord] {
	if f == nil {
		return nil
	}
	return f.fieldValues
}

func (f *RepositoryFactory) DraftAuditEvents() repository.Repository[*stores.DraftAuditEventRecord] {
	if f == nil {
		return nil
	}
	return f.draftAuditEvents
}

func (f *RepositoryFactory) AuditEvents() repository.Repository[*stores.AuditEventRecord] {
	if f == nil {
		return nil
	}
	return f.auditEvents
}

func (f *RepositoryFactory) SignatureArtifacts() repository.Repository[*stores.SignatureArtifactRecord] {
	if f == nil {
		return nil
	}
	return f.signatureArtifacts
}

func (f *RepositoryFactory) SignerProfiles() repository.Repository[*stores.SignerProfileRecord] {
	if f == nil {
		return nil
	}
	return f.signerProfiles
}

func (f *RepositoryFactory) SavedSignerSignatures() repository.Repository[*stores.SavedSignerSignatureRecord] {
	if f == nil {
		return nil
	}
	return f.savedSignerSignatures
}

func (f *RepositoryFactory) AgreementArtifacts() repository.Repository[*stores.AgreementArtifactRecord] {
	if f == nil {
		return nil
	}
	return f.agreementArtifacts
}

func (f *RepositoryFactory) EmailLogs() repository.Repository[*stores.EmailLogRecord] {
	if f == nil {
		return nil
	}
	return f.emailLogs
}

func (f *RepositoryFactory) JobRuns() repository.Repository[*stores.JobRunRecord] {
	if f == nil {
		return nil
	}
	return f.jobRuns
}

func (f *RepositoryFactory) GoogleImportRuns() repository.Repository[*stores.GoogleImportRunRecord] {
	if f == nil {
		return nil
	}
	return f.googleImportRuns
}

func (f *RepositoryFactory) AgreementReminderStates() repository.Repository[*stores.AgreementReminderStateRecord] {
	if f == nil {
		return nil
	}
	return f.agreementReminderStates
}

func (f *RepositoryFactory) OutboxMessages() repository.Repository[*OutboxMessageRecord] {
	if f == nil {
		return nil
	}
	return f.outboxMessages
}

func (f *RepositoryFactory) IntegrationCredentials() repository.Repository[*stores.IntegrationCredentialRecord] {
	if f == nil {
		return nil
	}
	return f.integrationCredentials
}

func (f *RepositoryFactory) MappingSpecs() repository.Repository[*stores.MappingSpecRecord] {
	if f == nil {
		return nil
	}
	return f.mappingSpecs
}

func (f *RepositoryFactory) IntegrationBindings() repository.Repository[*stores.IntegrationBindingRecord] {
	if f == nil {
		return nil
	}
	return f.integrationBindings
}

func (f *RepositoryFactory) IntegrationSyncRuns() repository.Repository[*stores.IntegrationSyncRunRecord] {
	if f == nil {
		return nil
	}
	return f.integrationSyncRuns
}

func (f *RepositoryFactory) IntegrationCheckpoints() repository.Repository[*stores.IntegrationCheckpointRecord] {
	if f == nil {
		return nil
	}
	return f.integrationCheckpoints
}

func (f *RepositoryFactory) IntegrationConflicts() repository.Repository[*stores.IntegrationConflictRecord] {
	if f == nil {
		return nil
	}
	return f.integrationConflicts
}

func (f *RepositoryFactory) IntegrationChangeEvents() repository.Repository[*stores.IntegrationChangeEventRecord] {
	if f == nil {
		return nil
	}
	return f.integrationChangeEvents
}

func (f *RepositoryFactory) IntegrationMutationClaims() repository.Repository[*IntegrationMutationClaimRecord] {
	if f == nil {
		return nil
	}
	return f.integrationMutationClaims
}

func (f *RepositoryFactory) PlacementRuns() repository.Repository[*stores.PlacementRunRecord] {
	if f == nil {
		return nil
	}
	return f.placementRuns
}

func resolveRepositoryFactoryBunDB(candidate any) (*bun.DB, error) {
	switch typed := candidate.(type) {
	case nil:
		return nil, fmt.Errorf("esign persistence: persistence client is required")
	case *bun.DB:
		if typed == nil {
			return nil, fmt.Errorf("esign persistence: bun db is required")
		}
		return typed, nil
	case interface{ DB() *bun.DB }:
		db := typed.DB()
		if db == nil {
			return nil, fmt.Errorf("esign persistence: persistence client returned nil bun db")
		}
		return db, nil
	default:
		return nil, fmt.Errorf("esign persistence: unsupported persistence client type %T", candidate)
	}
}

func newRepositoryWithFactoryConfig[T any](
	db *bun.DB,
	handlers repository.ModelHandlers[T],
	dbOpts []repository.Option,
) repository.Repository[T] {
	return repository.MustNewRepositoryWithConfig[T](db, handlers, dbOpts)
}

func documentHandlers() repository.ModelHandlers[*stores.DocumentRecord] {
	return newStringIDModelHandlers(
		func() *stores.DocumentRecord { return &stores.DocumentRecord{} },
		func(record *stores.DocumentRecord) string { return record.ID },
		func(record *stores.DocumentRecord, id string) { record.ID = id },
		"id",
	)
}

func draftHandlers() repository.ModelHandlers[*stores.DraftRecord] {
	return newStringIDModelHandlers(
		func() *stores.DraftRecord { return &stores.DraftRecord{} },
		func(record *stores.DraftRecord) string { return record.ID },
		func(record *stores.DraftRecord, id string) { record.ID = id },
		"id",
	)
}

func agreementHandlers() repository.ModelHandlers[*stores.AgreementRecord] {
	return newStringIDModelHandlers(
		func() *stores.AgreementRecord { return &stores.AgreementRecord{} },
		func(record *stores.AgreementRecord) string { return record.ID },
		func(record *stores.AgreementRecord, id string) { record.ID = id },
		"id",
	)
}

func recipientHandlers() repository.ModelHandlers[*stores.RecipientRecord] {
	return newStringIDModelHandlers(
		func() *stores.RecipientRecord { return &stores.RecipientRecord{} },
		func(record *stores.RecipientRecord) string { return record.ID },
		func(record *stores.RecipientRecord, id string) { record.ID = id },
		"id",
	)
}

func participantHandlers() repository.ModelHandlers[*stores.ParticipantRecord] {
	return newStringIDModelHandlers(
		func() *stores.ParticipantRecord { return &stores.ParticipantRecord{} },
		func(record *stores.ParticipantRecord) string { return record.ID },
		func(record *stores.ParticipantRecord, id string) { record.ID = id },
		"id",
	)
}

func fieldHandlers() repository.ModelHandlers[*stores.FieldRecord] {
	return newStringIDModelHandlers(
		func() *stores.FieldRecord { return &stores.FieldRecord{} },
		func(record *stores.FieldRecord) string { return record.ID },
		func(record *stores.FieldRecord, id string) { record.ID = id },
		"id",
	)
}

func fieldDefinitionHandlers() repository.ModelHandlers[*stores.FieldDefinitionRecord] {
	return newStringIDModelHandlers(
		func() *stores.FieldDefinitionRecord { return &stores.FieldDefinitionRecord{} },
		func(record *stores.FieldDefinitionRecord) string { return record.ID },
		func(record *stores.FieldDefinitionRecord, id string) { record.ID = id },
		"id",
	)
}

func fieldInstanceHandlers() repository.ModelHandlers[*stores.FieldInstanceRecord] {
	return newStringIDModelHandlers(
		func() *stores.FieldInstanceRecord { return &stores.FieldInstanceRecord{} },
		func(record *stores.FieldInstanceRecord) string { return record.ID },
		func(record *stores.FieldInstanceRecord, id string) { record.ID = id },
		"id",
	)
}

func signingTokenHandlers() repository.ModelHandlers[*stores.SigningTokenRecord] {
	return newStringIDModelHandlers(
		func() *stores.SigningTokenRecord { return &stores.SigningTokenRecord{} },
		func(record *stores.SigningTokenRecord) string { return record.ID },
		func(record *stores.SigningTokenRecord, id string) { record.ID = id },
		"id",
	)
}

func fieldValueHandlers() repository.ModelHandlers[*stores.FieldValueRecord] {
	return newStringIDModelHandlers(
		func() *stores.FieldValueRecord { return &stores.FieldValueRecord{} },
		func(record *stores.FieldValueRecord) string { return record.ID },
		func(record *stores.FieldValueRecord, id string) { record.ID = id },
		"id",
	)
}

func draftAuditEventHandlers() repository.ModelHandlers[*stores.DraftAuditEventRecord] {
	return newStringIDModelHandlers(
		func() *stores.DraftAuditEventRecord { return &stores.DraftAuditEventRecord{} },
		func(record *stores.DraftAuditEventRecord) string { return record.ID },
		func(record *stores.DraftAuditEventRecord, id string) { record.ID = id },
		"id",
	)
}

func auditEventHandlers() repository.ModelHandlers[*stores.AuditEventRecord] {
	return newStringIDModelHandlers(
		func() *stores.AuditEventRecord { return &stores.AuditEventRecord{} },
		func(record *stores.AuditEventRecord) string { return record.ID },
		func(record *stores.AuditEventRecord, id string) { record.ID = id },
		"id",
	)
}

func signatureArtifactHandlers() repository.ModelHandlers[*stores.SignatureArtifactRecord] {
	return newStringIDModelHandlers(
		func() *stores.SignatureArtifactRecord { return &stores.SignatureArtifactRecord{} },
		func(record *stores.SignatureArtifactRecord) string { return record.ID },
		func(record *stores.SignatureArtifactRecord, id string) { record.ID = id },
		"id",
	)
}

func signerProfileHandlers() repository.ModelHandlers[*stores.SignerProfileRecord] {
	return newStringIDModelHandlers(
		func() *stores.SignerProfileRecord { return &stores.SignerProfileRecord{} },
		func(record *stores.SignerProfileRecord) string { return record.ID },
		func(record *stores.SignerProfileRecord, id string) { record.ID = id },
		"id",
	)
}

func savedSignerSignatureHandlers() repository.ModelHandlers[*stores.SavedSignerSignatureRecord] {
	return newStringIDModelHandlers(
		func() *stores.SavedSignerSignatureRecord { return &stores.SavedSignerSignatureRecord{} },
		func(record *stores.SavedSignerSignatureRecord) string { return record.ID },
		func(record *stores.SavedSignerSignatureRecord, id string) { record.ID = id },
		"id",
	)
}

func agreementArtifactHandlers() repository.ModelHandlers[*stores.AgreementArtifactRecord] {
	return newStringIDModelHandlers(
		func() *stores.AgreementArtifactRecord { return &stores.AgreementArtifactRecord{} },
		func(record *stores.AgreementArtifactRecord) string { return record.AgreementID },
		func(record *stores.AgreementArtifactRecord, id string) { record.AgreementID = id },
		"agreement_id",
	)
}

func emailLogHandlers() repository.ModelHandlers[*stores.EmailLogRecord] {
	return newStringIDModelHandlers(
		func() *stores.EmailLogRecord { return &stores.EmailLogRecord{} },
		func(record *stores.EmailLogRecord) string { return record.ID },
		func(record *stores.EmailLogRecord, id string) { record.ID = id },
		"id",
	)
}

func jobRunHandlers() repository.ModelHandlers[*stores.JobRunRecord] {
	return newStringIDModelHandlers(
		func() *stores.JobRunRecord { return &stores.JobRunRecord{} },
		func(record *stores.JobRunRecord) string { return record.ID },
		func(record *stores.JobRunRecord, id string) { record.ID = id },
		"id",
	)
}

func googleImportRunHandlers() repository.ModelHandlers[*stores.GoogleImportRunRecord] {
	return newStringIDModelHandlers(
		func() *stores.GoogleImportRunRecord { return &stores.GoogleImportRunRecord{} },
		func(record *stores.GoogleImportRunRecord) string { return record.ID },
		func(record *stores.GoogleImportRunRecord, id string) { record.ID = id },
		"id",
	)
}

func agreementReminderStateHandlers() repository.ModelHandlers[*stores.AgreementReminderStateRecord] {
	return newStringIDModelHandlers(
		func() *stores.AgreementReminderStateRecord { return &stores.AgreementReminderStateRecord{} },
		func(record *stores.AgreementReminderStateRecord) string { return record.ID },
		func(record *stores.AgreementReminderStateRecord, id string) { record.ID = id },
		"id",
	)
}

func outboxMessageHandlers() repository.ModelHandlers[*OutboxMessageRecord] {
	return newStringIDModelHandlers(
		func() *OutboxMessageRecord { return &OutboxMessageRecord{} },
		func(record *OutboxMessageRecord) string { return record.ID },
		func(record *OutboxMessageRecord, id string) { record.ID = id },
		"id",
	)
}

func integrationCredentialHandlers() repository.ModelHandlers[*stores.IntegrationCredentialRecord] {
	return newStringIDModelHandlers(
		func() *stores.IntegrationCredentialRecord { return &stores.IntegrationCredentialRecord{} },
		func(record *stores.IntegrationCredentialRecord) string { return record.ID },
		func(record *stores.IntegrationCredentialRecord, id string) { record.ID = id },
		"id",
	)
}

func mappingSpecHandlers() repository.ModelHandlers[*stores.MappingSpecRecord] {
	return newStringIDModelHandlers(
		func() *stores.MappingSpecRecord { return &stores.MappingSpecRecord{} },
		func(record *stores.MappingSpecRecord) string { return record.ID },
		func(record *stores.MappingSpecRecord, id string) { record.ID = id },
		"id",
	)
}

func integrationBindingHandlers() repository.ModelHandlers[*stores.IntegrationBindingRecord] {
	return newStringIDModelHandlers(
		func() *stores.IntegrationBindingRecord { return &stores.IntegrationBindingRecord{} },
		func(record *stores.IntegrationBindingRecord) string { return record.ID },
		func(record *stores.IntegrationBindingRecord, id string) { record.ID = id },
		"id",
	)
}

func integrationSyncRunHandlers() repository.ModelHandlers[*stores.IntegrationSyncRunRecord] {
	return newStringIDModelHandlers(
		func() *stores.IntegrationSyncRunRecord { return &stores.IntegrationSyncRunRecord{} },
		func(record *stores.IntegrationSyncRunRecord) string { return record.ID },
		func(record *stores.IntegrationSyncRunRecord, id string) { record.ID = id },
		"id",
	)
}

func integrationCheckpointHandlers() repository.ModelHandlers[*stores.IntegrationCheckpointRecord] {
	return newStringIDModelHandlers(
		func() *stores.IntegrationCheckpointRecord { return &stores.IntegrationCheckpointRecord{} },
		func(record *stores.IntegrationCheckpointRecord) string { return record.ID },
		func(record *stores.IntegrationCheckpointRecord, id string) { record.ID = id },
		"id",
	)
}

func integrationConflictHandlers() repository.ModelHandlers[*stores.IntegrationConflictRecord] {
	return newStringIDModelHandlers(
		func() *stores.IntegrationConflictRecord { return &stores.IntegrationConflictRecord{} },
		func(record *stores.IntegrationConflictRecord) string { return record.ID },
		func(record *stores.IntegrationConflictRecord, id string) { record.ID = id },
		"id",
	)
}

func integrationChangeEventHandlers() repository.ModelHandlers[*stores.IntegrationChangeEventRecord] {
	return newStringIDModelHandlers(
		func() *stores.IntegrationChangeEventRecord { return &stores.IntegrationChangeEventRecord{} },
		func(record *stores.IntegrationChangeEventRecord) string { return record.ID },
		func(record *stores.IntegrationChangeEventRecord, id string) { record.ID = id },
		"id",
	)
}

func integrationMutationClaimHandlers() repository.ModelHandlers[*IntegrationMutationClaimRecord] {
	return newStringIDModelHandlers(
		func() *IntegrationMutationClaimRecord { return &IntegrationMutationClaimRecord{} },
		func(record *IntegrationMutationClaimRecord) string { return record.ID },
		func(record *IntegrationMutationClaimRecord, id string) { record.ID = id },
		"id",
	)
}

func placementRunHandlers() repository.ModelHandlers[*stores.PlacementRunRecord] {
	return newStringIDModelHandlers(
		func() *stores.PlacementRunRecord { return &stores.PlacementRunRecord{} },
		func(record *stores.PlacementRunRecord) string { return record.ID },
		func(record *stores.PlacementRunRecord, id string) { record.ID = id },
		"id",
	)
}

func newStringIDModelHandlers[T any](
	newRecord func() T,
	getID func(T) string,
	setID func(T, string),
	identifierColumn string,
) repository.ModelHandlers[T] {
	column := strings.TrimSpace(identifierColumn)
	if column == "" {
		column = "id"
	}
	return repository.ModelHandlers[T]{
		NewRecord: newRecord,
		GetID: func(record T) uuid.UUID {
			return parseUUID(strings.TrimSpace(getID(record)))
		},
		SetID: func(record T, id uuid.UUID) {
			if id == uuid.Nil {
				id = uuid.New()
			}
			setID(record, id.String())
		},
		GetIdentifier: func() string {
			return column
		},
		GetIdentifierValue: func(record T) string {
			return strings.TrimSpace(getID(record))
		},
	}
}

func parseUUID(value string) uuid.UUID {
	id, err := uuid.Parse(strings.TrimSpace(value))
	if err != nil {
		return uuid.Nil
	}
	return id
}

func (*OutboxMessageRecord) TableName() string {
	return "outbox_messages"
}

func (*IntegrationMutationClaimRecord) TableName() string {
	return "integration_mutation_claims"
}
