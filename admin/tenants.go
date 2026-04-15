package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// TenantMember captures membership assignments for a tenant, including scoped roles/permissions.
type TenantMember struct {
	UserID      string   `json:"user_id"`
	Roles       []string `json:"roles,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

// TenantRecord represents a managed tenant.
type TenantRecord struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Slug      string         `json:"slug,omitempty"`
	Domain    string         `json:"domain,omitempty"`
	Status    string         `json:"status,omitempty"`
	Members   []TenantMember `json:"members,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

// TenantRepository exposes CRUD/search operations for tenants with membership awareness.
type TenantRepository interface {
	List(ctx context.Context, opts ListOptions) ([]TenantRecord, int, error)
	Get(ctx context.Context, id string) (TenantRecord, error)
	Create(ctx context.Context, tenant TenantRecord) (TenantRecord, error)
	Update(ctx context.Context, tenant TenantRecord) (TenantRecord, error)
	Delete(ctx context.Context, id string) error
	Search(ctx context.Context, query string, limit int) ([]TenantRecord, error)
}

// TenantService orchestrates tenant management and activity emission.
type TenantService struct {
	repo      TenantRepository
	activity  ActivitySink
	timeNow   func() time.Time
	idBuilder func() string
}

// NewTenantService constructs a service with the provided repository or an in-memory fallback.
func NewTenantService(repo TenantRepository) *TenantService {
	if repo == nil {
		repo = NewInMemoryTenantStore()
	}
	return &TenantService{
		repo:      repo,
		timeNow:   time.Now,
		idBuilder: func() string { return uuid.NewString() },
	}
}

// WithActivitySink wires activity emission for tenant mutations.
func (s *TenantService) WithActivitySink(sink ActivitySink) {
	if s != nil {
		assignActivitySink(&s.activity, sink)
	}
}

// ListTenants returns tenants with filters applied.
func (s *TenantService) ListTenants(ctx context.Context, opts ListOptions) ([]TenantRecord, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, serviceNotConfiguredDomainError("tenant service", nil)
	}
	return s.repo.List(ctx, opts)
}

// GetTenant fetches a tenant by ID.
func (s *TenantService) GetTenant(ctx context.Context, id string) (TenantRecord, error) {
	if s == nil || s.repo == nil {
		return TenantRecord{}, serviceNotConfiguredDomainError("tenant service", nil)
	}
	return s.repo.Get(ctx, id)
}

// SaveTenant creates or updates a tenant record.
func (s *TenantService) SaveTenant(ctx context.Context, tenant TenantRecord) (TenantRecord, error) {
	if s == nil || s.repo == nil {
		return TenantRecord{}, serviceNotConfiguredDomainError("tenant service", nil)
	}
	isCreate := strings.TrimSpace(tenant.ID) == ""
	if tenant.ID == "" {
		tenant.ID = s.idBuilder()
	}
	tenant.Status = primitives.FirstNonEmptyRaw(strings.ToLower(strings.TrimSpace(tenant.Status)), "active")
	if tenant.Slug == "" {
		tenant.Slug = slugify(tenant.Name)
	}
	tenant.Members = normalizeTenantMembers(tenant.Members)

	var (
		result TenantRecord
		err    error
	)
	if isCreate {
		if tenant.CreatedAt.IsZero() {
			tenant.CreatedAt = s.timeNow()
		}
		if tenant.UpdatedAt.IsZero() {
			tenant.UpdatedAt = tenant.CreatedAt
		}
		result, err = s.repo.Create(ctx, tenant)
	} else {
		tenant.UpdatedAt = s.timeNow()
		result, err = s.repo.Update(ctx, tenant)
	}
	if err != nil {
		return TenantRecord{}, err
	}
	action := "tenant.update"
	if isCreate {
		action = "tenant.create"
	}
	s.recordActivity(ctx, action, result, map[string]any{
		"tenant_id":    result.ID,
		"name":         result.Name,
		"status":       result.Status,
		"member_count": len(result.Members),
	})
	return result, nil
}

// DeleteTenant removes a tenant by ID.
func (s *TenantService) DeleteTenant(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return serviceNotConfiguredDomainError("tenant service", nil)
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.recordActivity(ctx, "tenant.delete", TenantRecord{ID: id}, map[string]any{"tenant_id": id})
	return nil
}

// AssignMember adds or updates a tenant membership.
func (s *TenantService) AssignMember(ctx context.Context, tenantID string, member TenantMember) (TenantRecord, error) {
	if s == nil || s.repo == nil {
		return TenantRecord{}, serviceNotConfiguredDomainError("tenant service", nil)
	}
	return assignScopedRecordMember(ctx, tenantID, s.repo.Get, s.SaveTenant, tenantMembersRef, member, prepareTenantMember, tenantMemberUserID, normalizeTenantMember, applyTenantMemberUpdate)
}

// RemoveMember detaches a user from a tenant.
func (s *TenantService) RemoveMember(ctx context.Context, tenantID, userID string) (TenantRecord, error) {
	if s == nil || s.repo == nil {
		return TenantRecord{}, serviceNotConfiguredDomainError("tenant service", nil)
	}
	current, err := s.repo.Get(ctx, tenantID)
	if err != nil {
		return TenantRecord{}, err
	}
	userID = strings.TrimSpace(userID)
	filtered := []TenantMember{}
	for _, m := range current.Members {
		if m.UserID == "" || m.UserID == userID {
			continue
		}
		filtered = append(filtered, normalizeTenantMember(m))
	}
	current.Members = filtered
	return s.SaveTenant(ctx, current)
}

// SearchTenants performs a keyword search against tenants.
func (s *TenantService) SearchTenants(ctx context.Context, query string, limit int) ([]TenantRecord, error) {
	if s == nil || s.repo == nil {
		return nil, serviceNotConfiguredDomainError("tenant service", nil)
	}
	return s.repo.Search(ctx, query, limit)
}

func (s *TenantService) recordActivity(ctx context.Context, action string, tenant TenantRecord, metadata map[string]any) {
	if s == nil {
		return
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadata["tenant_id"] = tenant.ID
	recordEntityActivity(ctx, s.activity, action, "tenant:"+tenant.ID, metadata)
}

// InMemoryTenantStore keeps tenants and memberships in memory.
type InMemoryTenantStore struct {
	mu      sync.RWMutex
	tenants map[string]TenantRecord
}

// NewInMemoryTenantStore builds an empty tenant store.
func NewInMemoryTenantStore() *InMemoryTenantStore {
	return &InMemoryTenantStore{
		tenants: map[string]TenantRecord{},
	}
}

// List returns tenants with search and status filtering.
func (s *InMemoryTenantStore) List(ctx context.Context, opts ListOptions) ([]TenantRecord, int, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	items, total := listInMemoryRecords(s.tenants, opts, inMemoryListConfig[TenantRecord]{
		clone: cloneTenant,
		include: func(tenant TenantRecord, search string, filters map[string]any) bool {
			filterStatus := strings.ToLower(toString(filters["status"]))
			if filterStatus != "" && strings.ToLower(tenant.Status) != filterStatus {
				return false
			}
			if search == "" {
				return true
			}
			return strings.Contains(strings.ToLower(tenant.Name), search) ||
				strings.Contains(strings.ToLower(tenant.Slug), search) ||
				strings.Contains(strings.ToLower(tenant.Domain), search)
		},
		less: func(left, right TenantRecord) bool {
			return strings.ToLower(left.Name) < strings.ToLower(right.Name)
		},
		defaultPerPage: 10,
	})
	return items, total, nil
}

// Get returns a tenant by ID.
func (s *InMemoryTenantStore) Get(ctx context.Context, id string) (TenantRecord, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	return getInMemoryRecord(s.tenants, id, cloneTenant)
}

// Create inserts a tenant.
func (s *InMemoryTenantStore) Create(ctx context.Context, tenant TenantRecord) (TenantRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	return createInMemoryRecord(s.tenants, tenant, newScopedMemberRecordCreateConfig(cloneTenant, tenantRecordID, setTenantRecordID, tenantCreatedAtRef, tenantUpdatedAtRef, tenantMembersRef, normalizeTenantMembers))
}

// Update modifies a tenant.
func (s *InMemoryTenantStore) Update(ctx context.Context, tenant TenantRecord) (TenantRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	return updateInMemoryRecord(s.tenants, tenant.ID, tenant, newScopedRecordUpdateConfig(cloneTenant, mergeTenantRecord))
}

// Delete removes a tenant.
func (s *InMemoryTenantStore) Delete(ctx context.Context, id string) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	return deleteInMemoryRecord(s.tenants, id)
}

// Search performs a simple keyword search.
func (s *InMemoryTenantStore) Search(ctx context.Context, query string, limit int) ([]TenantRecord, error) {
	tenants, _, err := s.List(ctx, listOptionsForSearch(query, limit, 5))
	return tenants, err
}

func normalizeTenantMembers(members []TenantMember) []TenantMember {
	return normalizeScopedMembers(members, func(member TenantMember) string {
		return member.UserID
	}, normalizeTenantMember)
}

func mergeTenantRecord(existing *TenantRecord, update TenantRecord, now time.Time) error {
	return mergeScopedRecord(existing, update, now, applyTenantRecordUpdate, tenantMembersRef, normalizeTenantMembers, tenantMetadataRef, setTenantUpdatedAt, update.Members, update.Metadata)
}

func upsertScopedMembers[Member any](
	members []Member,
	candidate Member,
	userID func(Member) string,
	normalize func(Member) Member,
	update func(*Member, Member),
) []Member {
	candidateID := strings.TrimSpace(userID(candidate))
	out := make([]Member, 0, len(members)+1)
	found := false
	for _, member := range members {
		next := member
		if strings.TrimSpace(userID(next)) == candidateID {
			update(&next, candidate)
			found = true
		}
		out = append(out, normalize(next))
	}
	if !found {
		out = append(out, normalize(candidate))
	}
	return out
}

func assignScopedRecordMember[Record any, Member any](
	ctx context.Context,
	recordID string,
	get func(context.Context, string) (Record, error),
	save func(context.Context, Record) (Record, error),
	members func(*Record) *[]Member,
	candidate Member,
	prepare func(*Member),
	userID func(Member) string,
	normalize func(Member) Member,
	update func(*Member, Member),
) (Record, error) {
	current, err := get(ctx, recordID)
	if err != nil {
		var zero Record
		return zero, err
	}
	prepare(&candidate)
	if strings.TrimSpace(userID(candidate)) == "" {
		var zero Record
		return zero, requiredFieldDomainError("user id", nil)
	}
	currentMembers := members(&current)
	*currentMembers = upsertScopedMembers(*currentMembers, candidate, userID, normalize, update)
	return save(ctx, current)
}

func mergeScopedRecord[Record any, Member any](
	existing *Record,
	update Record,
	now time.Time,
	apply func(*Record, Record),
	members func(*Record) *[]Member,
	normalizeMembers func([]Member) []Member,
	metadata func(*Record) *map[string]any,
	setUpdatedAt func(*Record, time.Time),
	updateMembers []Member,
	updateMetadata map[string]any,
) error {
	apply(existing, update)
	if len(updateMembers) > 0 {
		*members(existing) = normalizeMembers(updateMembers)
	}
	if updateMetadata != nil {
		*metadata(existing) = mergeMapInto(*metadata(existing), updateMetadata)
	}
	setUpdatedAt(existing, now)
	return nil
}

func newScopedRecordCreateConfig[T any](
	clone func(T) T,
	id func(T) string,
	setID func(*T, string),
	prepare func(*T, time.Time),
) inMemoryCreateConfig[T] {
	return inMemoryCreateConfig[T]{
		clone:   clone,
		id:      id,
		setID:   setID,
		prepare: prepare,
	}
}

func newScopedRecordUpdateConfig[T any](
	clone func(T) T,
	merge func(*T, T, time.Time) error,
) inMemoryUpdateConfig[T] {
	return inMemoryUpdateConfig[T]{clone: clone, merge: merge}
}

func newScopedMemberRecordCreateConfig[T any, Member any](
	clone func(T) T,
	id func(T) string,
	setID func(*T, string),
	createdAt func(*T) *time.Time,
	updatedAt func(*T) *time.Time,
	members func(*T) *[]Member,
	normalizeMembers func([]Member) []Member,
) inMemoryCreateConfig[T] {
	return newScopedRecordCreateConfig(clone, id, setID, func(record *T, now time.Time) {
		if createdAt(record).IsZero() {
			*createdAt(record) = now
		}
		if updatedAt(record).IsZero() {
			*updatedAt(record) = *createdAt(record)
		}
		*members(record) = normalizeMembers(*members(record))
	})
}

func normalizeTenantMember(member TenantMember) TenantMember {
	member.UserID = strings.TrimSpace(member.UserID)
	member.Roles = dedupeStrings(member.Roles)
	member.Permissions = dedupeStrings(member.Permissions)
	return member
}

func cloneTenant(record TenantRecord) TenantRecord {
	cloned := TenantRecord{
		ID:        record.ID,
		Name:      record.Name,
		Slug:      record.Slug,
		Domain:    record.Domain,
		Status:    record.Status,
		CreatedAt: record.CreatedAt,
		UpdatedAt: record.UpdatedAt,
	}
	if len(record.Members) > 0 {
		cloned.Members = cloneTenantMembers(record.Members)
	}
	if record.Metadata != nil {
		cloned.Metadata = primitives.CloneAnyMap(record.Metadata)
	}
	return cloned
}

func tenantMembersRef(record *TenantRecord) *[]TenantMember { return &record.Members }

func tenantMetadataRef(record *TenantRecord) *map[string]any { return &record.Metadata }

func tenantRecordID(record TenantRecord) string { return record.ID }

func setTenantRecordID(record *TenantRecord, id string) { record.ID = id }

func tenantCreatedAtRef(record *TenantRecord) *time.Time { return &record.CreatedAt }

func tenantUpdatedAtRef(record *TenantRecord) *time.Time { return &record.UpdatedAt }

func tenantMemberUserID(member TenantMember) string { return member.UserID }

func prepareTenantMember(member *TenantMember) {
	member.UserID = strings.TrimSpace(member.UserID)
	member.Roles = dedupeStrings(member.Roles)
	member.Permissions = dedupeStrings(member.Permissions)
}

func applyTenantMemberUpdate(existing *TenantMember, updated TenantMember) {
	existing.Roles = updated.Roles
	existing.Permissions = updated.Permissions
}

func applyTenantRecordUpdate(existing *TenantRecord, update TenantRecord) {
	if update.Name != "" {
		existing.Name = update.Name
	}
	if update.Slug != "" {
		existing.Slug = update.Slug
	}
	if update.Domain != "" {
		existing.Domain = update.Domain
	}
	if update.Status != "" {
		existing.Status = update.Status
	}
}

func setTenantUpdatedAt(record *TenantRecord, updatedAt time.Time) { record.UpdatedAt = updatedAt }

func cloneTenantMembers(members []TenantMember) []TenantMember {
	return cloneScopedMembers(members, cloneTenantMember)
}

func cloneTenantMember(member TenantMember) TenantMember {
	return TenantMember{
		UserID:      member.UserID,
		Roles:       append([]string{}, member.Roles...),
		Permissions: append([]string{}, member.Permissions...),
	}
}

func slugify(value string) string {
	slug := strings.ToLower(strings.TrimSpace(value))
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = strings.ToLower(strings.TrimSpace(uuid.NewString()))
	}
	return slug
}
