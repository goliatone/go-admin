package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// OrganizationMember captures membership assignments for an organization.
type OrganizationMember struct {
	UserID      string   `json:"user_id"`
	Roles       []string `json:"roles,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

// OrganizationRecord represents an organization managed by the admin.
type OrganizationRecord struct {
	ID        string               `json:"id"`
	Name      string               `json:"name"`
	Slug      string               `json:"slug,omitempty"`
	Status    string               `json:"status,omitempty"`
	TenantID  string               `json:"tenant_id,omitempty"`
	Members   []OrganizationMember `json:"members,omitempty"`
	Metadata  map[string]any       `json:"metadata,omitempty"`
	CreatedAt time.Time            `json:"created_at"`
	UpdatedAt time.Time            `json:"updated_at"`
}

// OrganizationRepository exposes CRUD/search operations for organizations with membership awareness.
type OrganizationRepository interface {
	List(ctx context.Context, opts ListOptions) ([]OrganizationRecord, int, error)
	Get(ctx context.Context, id string) (OrganizationRecord, error)
	Create(ctx context.Context, org OrganizationRecord) (OrganizationRecord, error)
	Update(ctx context.Context, org OrganizationRecord) (OrganizationRecord, error)
	Delete(ctx context.Context, id string) error
	Search(ctx context.Context, query string, limit int) ([]OrganizationRecord, error)
}

// OrganizationService orchestrates organization management and activity emission.
type OrganizationService struct {
	repo      OrganizationRepository
	activity  ActivitySink
	timeNow   func() time.Time
	idBuilder func() string
}

// NewOrganizationService constructs a service with the provided repository or an in-memory fallback.
func NewOrganizationService(repo OrganizationRepository) *OrganizationService {
	if repo == nil {
		repo = NewInMemoryOrganizationStore()
	}
	return &OrganizationService{
		repo:      repo,
		timeNow:   time.Now,
		idBuilder: func() string { return uuid.NewString() },
	}
}

// WithActivitySink wires activity emission for organization mutations.
func (s *OrganizationService) WithActivitySink(sink ActivitySink) {
	if s != nil {
		assignActivitySink(&s.activity, sink)
	}
}

// ListOrganizations returns organizations with filters applied.
func (s *OrganizationService) ListOrganizations(ctx context.Context, opts ListOptions) ([]OrganizationRecord, int, error) {
	if s == nil || s.repo == nil {
		return nil, 0, serviceNotConfiguredDomainError("organization service", nil)
	}
	return s.repo.List(ctx, opts)
}

// GetOrganization fetches an organization by ID.
func (s *OrganizationService) GetOrganization(ctx context.Context, id string) (OrganizationRecord, error) {
	if s == nil || s.repo == nil {
		return OrganizationRecord{}, serviceNotConfiguredDomainError("organization service", nil)
	}
	return s.repo.Get(ctx, id)
}

// SaveOrganization creates or updates an organization record.
func (s *OrganizationService) SaveOrganization(ctx context.Context, org OrganizationRecord) (OrganizationRecord, error) {
	if s == nil || s.repo == nil {
		return OrganizationRecord{}, serviceNotConfiguredDomainError("organization service", nil)
	}
	isCreate := strings.TrimSpace(org.ID) == ""
	if org.ID == "" {
		org.ID = s.idBuilder()
	}
	org.Status = primitives.FirstNonEmptyRaw(strings.ToLower(strings.TrimSpace(org.Status)), "active")
	if org.Slug == "" {
		org.Slug = slugify(org.Name)
	}
	org.Members = normalizeOrganizationMembers(org.Members)

	var (
		result OrganizationRecord
		err    error
	)
	if isCreate {
		if org.CreatedAt.IsZero() {
			org.CreatedAt = s.timeNow()
		}
		if org.UpdatedAt.IsZero() {
			org.UpdatedAt = org.CreatedAt
		}
		result, err = s.repo.Create(ctx, org)
	} else {
		org.UpdatedAt = s.timeNow()
		result, err = s.repo.Update(ctx, org)
	}
	if err != nil {
		return OrganizationRecord{}, err
	}
	action := "organization.update"
	if isCreate {
		action = "organization.create"
	}
	s.recordActivity(ctx, action, result, map[string]any{
		"organization_id": result.ID,
		"name":            result.Name,
		"status":          result.Status,
		"tenant_id":       result.TenantID,
		"member_count":    len(result.Members),
	})
	return result, nil
}

// DeleteOrganization removes an organization by ID.
func (s *OrganizationService) DeleteOrganization(ctx context.Context, id string) error {
	if s == nil || s.repo == nil {
		return serviceNotConfiguredDomainError("organization service", nil)
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.recordActivity(ctx, "organization.delete", OrganizationRecord{ID: id}, map[string]any{
		"organization_id": id,
	})
	return nil
}

// AssignMember adds or updates an organization membership.
func (s *OrganizationService) AssignMember(ctx context.Context, orgID string, member OrganizationMember) (OrganizationRecord, error) {
	if s == nil || s.repo == nil {
		return OrganizationRecord{}, serviceNotConfiguredDomainError("organization service", nil)
	}
	return assignScopedRecordMember(ctx, orgID, s.repo.Get, s.SaveOrganization, organizationMembersRef, member, prepareOrganizationMember, organizationMemberUserID, normalizeOrganizationMember, applyOrganizationMemberUpdate)
}

// RemoveMember detaches a user from an organization.
func (s *OrganizationService) RemoveMember(ctx context.Context, orgID, userID string) (OrganizationRecord, error) {
	if s == nil || s.repo == nil {
		return OrganizationRecord{}, serviceNotConfiguredDomainError("organization service", nil)
	}
	current, err := s.repo.Get(ctx, orgID)
	if err != nil {
		return OrganizationRecord{}, err
	}
	userID = strings.TrimSpace(userID)
	filtered := []OrganizationMember{}
	for _, m := range current.Members {
		if m.UserID == "" || m.UserID == userID {
			continue
		}
		filtered = append(filtered, normalizeOrganizationMember(m))
	}
	current.Members = filtered
	return s.SaveOrganization(ctx, current)
}

// SearchOrganizations performs a keyword search against organizations.
func (s *OrganizationService) SearchOrganizations(ctx context.Context, query string, limit int) ([]OrganizationRecord, error) {
	if s == nil || s.repo == nil {
		return nil, serviceNotConfiguredDomainError("organization service", nil)
	}
	return s.repo.Search(ctx, query, limit)
}

func (s *OrganizationService) recordActivity(ctx context.Context, action string, org OrganizationRecord, metadata map[string]any) {
	if s == nil {
		return
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadata["organization_id"] = org.ID
	if org.TenantID != "" {
		metadata["tenant_id"] = org.TenantID
	}
	recordEntityActivity(ctx, s.activity, action, "organization:"+org.ID, metadata)
}

// InMemoryOrganizationStore keeps organizations and memberships in memory.
type InMemoryOrganizationStore struct {
	mu   sync.RWMutex
	orgs map[string]OrganizationRecord
}

// NewInMemoryOrganizationStore builds an empty org store.
func NewInMemoryOrganizationStore() *InMemoryOrganizationStore {
	return &InMemoryOrganizationStore{
		orgs: map[string]OrganizationRecord{},
	}
}

// List returns organizations with search and status filtering.
func (s *InMemoryOrganizationStore) List(ctx context.Context, opts ListOptions) ([]OrganizationRecord, int, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	items, total := listInMemoryRecords(s.orgs, opts, inMemoryListConfig[OrganizationRecord]{
		clone: cloneOrganization,
		include: func(org OrganizationRecord, search string, filters map[string]any) bool {
			filterStatus := strings.ToLower(toString(filters["status"]))
			filterTenant := strings.ToLower(toString(filters["tenant_id"]))
			if filterStatus != "" && strings.ToLower(org.Status) != filterStatus {
				return false
			}
			if filterTenant != "" && strings.ToLower(org.TenantID) != filterTenant {
				return false
			}
			if search == "" {
				return true
			}
			return strings.Contains(strings.ToLower(org.Name), search) ||
				strings.Contains(strings.ToLower(org.Slug), search)
		},
		less: func(left, right OrganizationRecord) bool {
			return strings.ToLower(left.Name) < strings.ToLower(right.Name)
		},
		defaultPerPage: 10,
	})
	return items, total, nil
}

// Get returns an organization by ID.
func (s *InMemoryOrganizationStore) Get(ctx context.Context, id string) (OrganizationRecord, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	return getInMemoryRecord(s.orgs, id, cloneOrganization)
}

// Create inserts an organization.
func (s *InMemoryOrganizationStore) Create(ctx context.Context, org OrganizationRecord) (OrganizationRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	return createInMemoryRecord(s.orgs, org, newScopedMemberRecordCreateConfig(cloneOrganization, organizationRecordID, setOrganizationRecordID, organizationCreatedAtRef, organizationUpdatedAtRef, organizationMembersRef, normalizeOrganizationMembers))
}

// Update modifies an organization.
func (s *InMemoryOrganizationStore) Update(ctx context.Context, org OrganizationRecord) (OrganizationRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	return updateInMemoryRecord(s.orgs, org.ID, org, newScopedRecordUpdateConfig(cloneOrganization, mergeOrganizationRecord))
}

// Delete removes an organization.
func (s *InMemoryOrganizationStore) Delete(ctx context.Context, id string) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	return deleteInMemoryRecord(s.orgs, id)
}

// Search performs a simple keyword search.
func (s *InMemoryOrganizationStore) Search(ctx context.Context, query string, limit int) ([]OrganizationRecord, error) {
	orgs, _, err := s.List(ctx, listOptionsForSearch(query, limit, 5))
	return orgs, err
}

func normalizeOrganizationMembers(members []OrganizationMember) []OrganizationMember {
	return normalizeScopedMembers(members, func(member OrganizationMember) string {
		return member.UserID
	}, normalizeOrganizationMember)
}

func mergeOrganizationRecord(existing *OrganizationRecord, update OrganizationRecord, now time.Time) error {
	return mergeScopedRecord(existing, update, now, applyOrganizationRecordUpdate, organizationMembersRef, normalizeOrganizationMembers, organizationMetadataRef, setOrganizationUpdatedAt, update.Members, update.Metadata)
}

func normalizeOrganizationMember(member OrganizationMember) OrganizationMember {
	member.UserID = strings.TrimSpace(member.UserID)
	member.Roles = dedupeStrings(member.Roles)
	member.Permissions = dedupeStrings(member.Permissions)
	return member
}

func cloneOrganization(record OrganizationRecord) OrganizationRecord {
	cloned := OrganizationRecord{
		ID:        record.ID,
		Name:      record.Name,
		Slug:      record.Slug,
		Status:    record.Status,
		TenantID:  record.TenantID,
		CreatedAt: record.CreatedAt,
		UpdatedAt: record.UpdatedAt,
	}
	if len(record.Members) > 0 {
		cloned.Members = cloneOrganizationMembers(record.Members)
	}
	if record.Metadata != nil {
		cloned.Metadata = primitives.CloneAnyMap(record.Metadata)
	}
	return cloned
}

func organizationMembersRef(record *OrganizationRecord) *[]OrganizationMember { return &record.Members }

func organizationMetadataRef(record *OrganizationRecord) *map[string]any { return &record.Metadata }

func organizationRecordID(record OrganizationRecord) string { return record.ID }

func setOrganizationRecordID(record *OrganizationRecord, id string) { record.ID = id }

func organizationCreatedAtRef(record *OrganizationRecord) *time.Time { return &record.CreatedAt }

func organizationUpdatedAtRef(record *OrganizationRecord) *time.Time { return &record.UpdatedAt }

func organizationMemberUserID(member OrganizationMember) string { return member.UserID }

func prepareOrganizationMember(member *OrganizationMember) {
	member.UserID = strings.TrimSpace(member.UserID)
	member.Roles = dedupeStrings(member.Roles)
	member.Permissions = dedupeStrings(member.Permissions)
}

func applyOrganizationMemberUpdate(existing *OrganizationMember, updated OrganizationMember) {
	existing.Roles = updated.Roles
	existing.Permissions = updated.Permissions
}

func applyOrganizationRecordUpdate(existing *OrganizationRecord, update OrganizationRecord) {
	if update.Name != "" {
		existing.Name = update.Name
	}
	if update.Slug != "" {
		existing.Slug = update.Slug
	}
	if update.Status != "" {
		existing.Status = update.Status
	}
	if update.TenantID != "" {
		existing.TenantID = update.TenantID
	}
}

func setOrganizationUpdatedAt(record *OrganizationRecord, updatedAt time.Time) {
	record.UpdatedAt = updatedAt
}

func cloneOrganizationMembers(members []OrganizationMember) []OrganizationMember {
	return cloneScopedMembers(members, cloneOrganizationMember)
}

func cloneOrganizationMember(member OrganizationMember) OrganizationMember {
	return OrganizationMember{
		UserID:      member.UserID,
		Roles:       append([]string{}, member.Roles...),
		Permissions: append([]string{}, member.Permissions...),
	}
}
