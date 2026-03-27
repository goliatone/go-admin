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
	current, err := s.repo.Get(ctx, tenantID)
	if err != nil {
		return TenantRecord{}, err
	}
	member.UserID = strings.TrimSpace(member.UserID)
	if member.UserID == "" {
		return TenantRecord{}, requiredFieldDomainError("user id", nil)
	}
	member.Roles = dedupeStrings(member.Roles)
	member.Permissions = dedupeStrings(member.Permissions)
	updatedMembers := []TenantMember{}
	found := false
	for _, m := range current.Members {
		if m.UserID == member.UserID {
			m.Roles = member.Roles
			m.Permissions = member.Permissions
			found = true
		}
		updatedMembers = append(updatedMembers, normalizeTenantMember(m))
	}
	if !found {
		updatedMembers = append(updatedMembers, normalizeTenantMember(member))
	}
	current.Members = updatedMembers
	return s.SaveTenant(ctx, current)
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
	return createInMemoryRecord(s.tenants, tenant, inMemoryCreateConfig[TenantRecord]{
		clone: cloneTenant,
		id: func(record TenantRecord) string {
			return record.ID
		},
		setID: func(record *TenantRecord, id string) {
			record.ID = id
		},
		prepare: func(record *TenantRecord, now time.Time) {
			if record.CreatedAt.IsZero() {
				record.CreatedAt = now
			}
			if record.UpdatedAt.IsZero() {
				record.UpdatedAt = record.CreatedAt
			}
			record.Members = normalizeTenantMembers(record.Members)
		},
	})
}

// Update modifies a tenant.
func (s *InMemoryTenantStore) Update(ctx context.Context, tenant TenantRecord) (TenantRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	return updateInMemoryRecord(s.tenants, tenant.ID, tenant, inMemoryUpdateConfig[TenantRecord]{
		clone: cloneTenant,
		merge: func(existing *TenantRecord, update TenantRecord, now time.Time) error {
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
			if len(update.Members) > 0 {
				existing.Members = normalizeTenantMembers(update.Members)
			}
			if update.Metadata != nil {
				existing.Metadata = mergeMapInto(existing.Metadata, update.Metadata)
			}
			existing.UpdatedAt = now
			return nil
		},
	})
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
