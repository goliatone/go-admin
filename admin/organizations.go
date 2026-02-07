package admin

import (
	"context"
	"sort"
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
	CreatedAt time.Time            `json:"created_at,omitempty"`
	UpdatedAt time.Time            `json:"updated_at,omitempty"`
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
	if s != nil && sink != nil {
		s.activity = sink
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
	org.Status = firstNonEmpty(strings.ToLower(strings.TrimSpace(org.Status)), "active")
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
	current, err := s.repo.Get(ctx, orgID)
	if err != nil {
		return OrganizationRecord{}, err
	}
	member.UserID = strings.TrimSpace(member.UserID)
	if member.UserID == "" {
		return OrganizationRecord{}, requiredFieldDomainError("user id", nil)
	}
	member.Roles = dedupeStrings(member.Roles)
	member.Permissions = dedupeStrings(member.Permissions)
	updatedMembers := []OrganizationMember{}
	found := false
	for _, m := range current.Members {
		if m.UserID == member.UserID {
			m.Roles = member.Roles
			m.Permissions = member.Permissions
			found = true
		}
		updatedMembers = append(updatedMembers, normalizeOrganizationMember(m))
	}
	if !found {
		updatedMembers = append(updatedMembers, normalizeOrganizationMember(member))
	}
	current.Members = updatedMembers
	return s.SaveOrganization(ctx, current)
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
	if s == nil || s.activity == nil {
		return
	}
	actor := actorFromContext(ctx)
	if actor == "" {
		actor = userIDFromContext(ctx)
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadata["organization_id"] = org.ID
	if org.TenantID != "" {
		metadata["tenant_id"] = org.TenantID
	}
	_ = s.activity.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   "organization:" + org.ID,
		Metadata: metadata,
	})
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
	out := make([]OrganizationRecord, 0, len(s.orgs))
	search := strings.ToLower(strings.TrimSpace(opts.Search))
	if search == "" {
		if term, ok := opts.Filters["_search"].(string); ok {
			search = strings.ToLower(strings.TrimSpace(term))
		}
	}
	filterStatus := strings.ToLower(toString(opts.Filters["status"]))
	filterTenant := strings.ToLower(toString(opts.Filters["tenant_id"]))
	for _, org := range s.orgs {
		if filterStatus != "" && strings.ToLower(org.Status) != filterStatus {
			continue
		}
		if filterTenant != "" && strings.ToLower(org.TenantID) != filterTenant {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(org.Name), search) && !strings.Contains(strings.ToLower(org.Slug), search) {
			continue
		}
		out = append(out, cloneOrganization(org))
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	total := len(out)
	page := opts.Page
	if page <= 0 {
		page = 1
	}
	per := opts.PerPage
	if per <= 0 {
		per = 10
	}
	start := (page - 1) * per
	if start > len(out) {
		start = len(out)
	}
	end := start + per
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

// Get returns an organization by ID.
func (s *InMemoryOrganizationStore) Get(ctx context.Context, id string) (OrganizationRecord, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	if org, ok := s.orgs[id]; ok {
		return cloneOrganization(org), nil
	}
	return OrganizationRecord{}, ErrNotFound
}

// Create inserts an organization.
func (s *InMemoryOrganizationStore) Create(ctx context.Context, org OrganizationRecord) (OrganizationRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	if org.ID == "" {
		org.ID = uuid.NewString()
	}
	if org.CreatedAt.IsZero() {
		org.CreatedAt = time.Now()
	}
	if org.UpdatedAt.IsZero() {
		org.UpdatedAt = org.CreatedAt
	}
	org.Members = normalizeOrganizationMembers(org.Members)
	s.orgs[org.ID] = cloneOrganization(org)
	return cloneOrganization(org), nil
}

// Update modifies an organization.
func (s *InMemoryOrganizationStore) Update(ctx context.Context, org OrganizationRecord) (OrganizationRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	existing, ok := s.orgs[org.ID]
	if !ok {
		return OrganizationRecord{}, ErrNotFound
	}
	if org.Name != "" {
		existing.Name = org.Name
	}
	if org.Slug != "" {
		existing.Slug = org.Slug
	}
	if org.Status != "" {
		existing.Status = org.Status
	}
	if org.TenantID != "" {
		existing.TenantID = org.TenantID
	}
	if len(org.Members) > 0 {
		existing.Members = normalizeOrganizationMembers(org.Members)
	}
	if org.Metadata != nil {
		if existing.Metadata == nil {
			existing.Metadata = map[string]any{}
		}
		for k, v := range org.Metadata {
			existing.Metadata[k] = v
		}
	}
	existing.UpdatedAt = time.Now()
	s.orgs[existing.ID] = cloneOrganization(existing)
	return cloneOrganization(existing), nil
}

// Delete removes an organization.
func (s *InMemoryOrganizationStore) Delete(ctx context.Context, id string) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.orgs[id]; !ok {
		return ErrNotFound
	}
	delete(s.orgs, id)
	return nil
}

// Search performs a simple keyword search.
func (s *InMemoryOrganizationStore) Search(ctx context.Context, query string, limit int) ([]OrganizationRecord, error) {
	opts := ListOptions{Search: query, Page: 1, PerPage: limit}
	if opts.PerPage <= 0 {
		opts.PerPage = 5
	}
	orgs, _, err := s.List(ctx, opts)
	return orgs, err
}

func normalizeOrganizationMembers(members []OrganizationMember) []OrganizationMember {
	out := []OrganizationMember{}
	for _, m := range members {
		if strings.TrimSpace(m.UserID) == "" {
			continue
		}
		out = append(out, normalizeOrganizationMember(m))
	}
	return out
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
		cloned.Metadata = cloneAnyMap(record.Metadata)
	}
	return cloned
}

func cloneOrganizationMembers(members []OrganizationMember) []OrganizationMember {
	out := make([]OrganizationMember, 0, len(members))
	for _, m := range members {
		out = append(out, OrganizationMember{
			UserID:      m.UserID,
			Roles:       append([]string{}, m.Roles...),
			Permissions: append([]string{}, m.Permissions...),
		})
	}
	return out
}
