package admin

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	users "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

// UserRecord captures the fields managed by the user administration module.
type UserRecord struct {
	ID          string
	Email       string
	Username    string
	FirstName   string
	LastName    string
	Status      string
	Role        string
	Roles       []string
	Permissions []string
	Metadata    map[string]any
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// RoleRecord captures custom roles and their permissions.
type RoleRecord struct {
	ID          string
	Name        string
	Description string
	Permissions []string
	IsSystem    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// UserRepository exposes CRUD operations for auth users.
type UserRepository interface {
	List(ctx context.Context, opts ListOptions) ([]UserRecord, int, error)
	Get(ctx context.Context, id string) (UserRecord, error)
	Create(ctx context.Context, user UserRecord) (UserRecord, error)
	Update(ctx context.Context, user UserRecord) (UserRecord, error)
	Delete(ctx context.Context, id string) error
	Search(ctx context.Context, query string, limit int) ([]UserRecord, error)
}

// RoleRepository exposes CRUD and assignment helpers for custom roles.
type RoleRepository interface {
	List(ctx context.Context, opts ListOptions) ([]RoleRecord, int, error)
	Get(ctx context.Context, id string) (RoleRecord, error)
	Create(ctx context.Context, role RoleRecord) (RoleRecord, error)
	Update(ctx context.Context, role RoleRecord) (RoleRecord, error)
	Delete(ctx context.Context, id string) error
	Assign(ctx context.Context, userID, roleID string) error
	Unassign(ctx context.Context, userID, roleID string) error
	RolesForUser(ctx context.Context, userID string) ([]RoleRecord, error)
}

// UserManagementService orchestrates user/role management and activity emission.
type UserManagementService struct {
	users     UserRepository
	roles     RoleRepository
	activity  ActivitySink
	timeNow   func() time.Time
	idBuilder func() string
}

// NewUserManagementService constructs a service with the provided repositories or in-memory defaults.
func NewUserManagementService(users UserRepository, roles RoleRepository) *UserManagementService {
	store := NewInMemoryUserStore()
	if users == nil {
		users = &inMemoryUserRepoAdapter{store: store}
	}
	if roles == nil {
		roles = &inMemoryRoleRepoAdapter{store: store}
	}
	return &UserManagementService{
		users:     users,
		roles:     roles,
		timeNow:   time.Now,
		idBuilder: func() string { return uuid.NewString() },
	}
}

// WithActivitySink wires activity emission for user and role mutations.
func (s *UserManagementService) WithActivitySink(sink ActivitySink) {
	if s != nil && sink != nil {
		s.activity = sink
	}
}

// ListUsers returns users with role assignments populated.
func (s *UserManagementService) ListUsers(ctx context.Context, opts ListOptions) ([]UserRecord, int, error) {
	if s == nil || s.users == nil {
		return nil, 0, errors.New("user service not configured")
	}
	users, total, err := s.users.List(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	for i, u := range users {
		if len(u.Roles) == 0 && s.roles != nil {
			if roles, err := s.roles.RolesForUser(ctx, u.ID); err == nil {
				users[i].Roles = roleIDs(roles)
			}
		}
	}
	return users, total, nil
}

// GetUser fetches a user and attached roles.
func (s *UserManagementService) GetUser(ctx context.Context, id string) (UserRecord, error) {
	if s == nil || s.users == nil {
		return UserRecord{}, errors.New("user service not configured")
	}
	user, err := s.users.Get(ctx, id)
	if err != nil {
		return UserRecord{}, err
	}
	if s.roles != nil {
		if roles, err := s.roles.RolesForUser(ctx, id); err == nil {
			user.Roles = roleIDs(roles)
		}
	}
	return user, nil
}

// SaveUser creates or updates a user and syncs role assignments.
func (s *UserManagementService) SaveUser(ctx context.Context, user UserRecord) (UserRecord, error) {
	if s == nil || s.users == nil {
		return UserRecord{}, errors.New("user service not configured")
	}
	isCreate := strings.TrimSpace(user.ID) == ""
	if user.ID == "" {
		user.ID = s.idBuilder()
	}
	if normalized := normalizeLifecycleState(user.Status); normalized != "" {
		user.Status = string(normalized)
	}
	if user.Status == "" {
		user.Status = "active"
	}
	if user.Role == "" && len(user.Roles) > 0 {
		user.Role = user.Roles[0]
	}
	var (
		result UserRecord
		err    error
	)
	if isCreate {
		result, err = s.users.Create(ctx, user)
	} else {
		result, err = s.users.Update(ctx, user)
	}
	if err != nil {
		return UserRecord{}, err
	}
	result.Roles = dedupeStrings(result.Roles)
	if len(user.Roles) > 0 {
		result.Roles = dedupeStrings(user.Roles)
	}
	if s.roles != nil {
		if err := s.syncAssignments(ctx, result.ID, result.Roles); err != nil {
			return UserRecord{}, err
		}
	}
	action := "user.update"
	if isCreate {
		action = "user.create"
	}
	s.recordActivity(ctx, action, "user:"+result.ID, map[string]any{
		"user_id":      result.ID,
		"email":        result.Email,
		"role":         result.Role,
		"roles":        result.Roles,
		"status":       result.Status,
		"display_name": strings.TrimSpace(result.FirstName + " " + result.LastName),
	})
	return result, nil
}

// DeleteUser removes a user and related assignments.
func (s *UserManagementService) DeleteUser(ctx context.Context, id string) error {
	if s == nil || s.users == nil {
		return errors.New("user service not configured")
	}
	if err := s.users.Delete(ctx, id); err != nil {
		return err
	}
	if s.roles != nil {
		if roles, err := s.roles.RolesForUser(ctx, id); err == nil {
			for _, role := range roles {
				_ = s.roles.Unassign(ctx, id, role.ID)
			}
		}
	}
	s.recordActivity(ctx, "user.delete", "user:"+id, map[string]any{"user_id": id})
	return nil
}

// TransitionUser updates the lifecycle state for a user and records activity.
func (s *UserManagementService) TransitionUser(ctx context.Context, id string, status string) (UserRecord, error) {
	if s == nil || s.users == nil {
		return UserRecord{}, errors.New("user service not configured")
	}
	next := normalizeLifecycleState(status)
	if next == "" {
		return UserRecord{}, errors.New("invalid status")
	}
	current, err := s.GetUser(ctx, id)
	if err != nil {
		return UserRecord{}, err
	}
	prev := current.Status
	current.Status = string(next)

	updated, err := s.SaveUser(ctx, current)
	if err != nil {
		return UserRecord{}, err
	}
	s.recordActivity(ctx, "user.status."+string(next), "user:"+updated.ID, map[string]any{
		"user_id": id,
		"from":    prev,
		"to":      string(next),
	})
	return updated, nil
}

// ListRoles returns registered roles.
func (s *UserManagementService) ListRoles(ctx context.Context, opts ListOptions) ([]RoleRecord, int, error) {
	if s == nil || s.roles == nil {
		return nil, 0, errors.New("role service not configured")
	}
	return s.roles.List(ctx, opts)
}

// SaveRole creates or updates a role.
func (s *UserManagementService) SaveRole(ctx context.Context, role RoleRecord) (RoleRecord, error) {
	if s == nil || s.roles == nil {
		return RoleRecord{}, errors.New("role service not configured")
	}
	isCreate := strings.TrimSpace(role.ID) == ""
	if role.ID == "" {
		role.ID = s.idBuilder()
	}
	role.Permissions = dedupeStrings(role.Permissions)
	var (
		result RoleRecord
		err    error
	)
	if isCreate {
		result, err = s.roles.Create(ctx, role)
	} else {
		result, err = s.roles.Update(ctx, role)
	}
	if err != nil {
		return RoleRecord{}, err
	}
	action := "role.update"
	if isCreate {
		action = "role.create"
	}
	s.recordActivity(ctx, action, "role:"+result.ID, map[string]any{
		"role_id":     result.ID,
		"permissions": result.Permissions,
		"is_system":   result.IsSystem,
	})
	return result, nil
}

// DeleteRole removes a role and related assignments.
func (s *UserManagementService) DeleteRole(ctx context.Context, id string) error {
	if s == nil || s.roles == nil {
		return errors.New("role service not configured")
	}
	role, _ := s.roles.Get(ctx, id)
	if role.IsSystem {
		return ErrForbidden
	}
	if err := s.roles.Delete(ctx, id); err != nil {
		return err
	}
	s.recordActivity(ctx, "role.delete", "role:"+id, map[string]any{
		"role_id": id,
	})
	return nil
}

// SearchUsers performs a keyword search against users.
func (s *UserManagementService) SearchUsers(ctx context.Context, query string, limit int) ([]UserRecord, error) {
	if s == nil || s.users == nil {
		return nil, errors.New("user service not configured")
	}
	return s.users.Search(ctx, query, limit)
}

func (s *UserManagementService) syncAssignments(ctx context.Context, userID string, desired []string) error {
	if s == nil || s.roles == nil {
		return nil
	}
	existing, err := s.roles.RolesForUser(ctx, userID)
	if err != nil {
		return err
	}
	current := map[string]bool{}
	for _, role := range existing {
		current[role.ID] = true
	}
	target := map[string]bool{}
	for _, id := range desired {
		if id == "" {
			continue
		}
		target[id] = true
		if !current[id] {
			if err := s.roles.Assign(ctx, userID, id); err != nil {
				return err
			}
			s.recordActivity(ctx, "role.assign", "user:"+userID, map[string]any{
				"user_id": userID,
				"role_id": id,
			})
		}
	}
	for id := range current {
		if !target[id] {
			if err := s.roles.Unassign(ctx, userID, id); err != nil {
				return err
			}
			s.recordActivity(ctx, "role.unassign", "user:"+userID, map[string]any{
				"user_id": userID,
				"role_id": id,
			})
		}
	}
	return nil
}

func (s *UserManagementService) recordActivity(ctx context.Context, action, object string, metadata map[string]any) {
	if s == nil || s.activity == nil {
		return
	}
	actor := actorFromContext(ctx)
	if actor == "" {
		actor = userIDFromContext(ctx)
	}
	_ = s.activity.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   object,
		Channel:  "users",
		Metadata: metadata,
	})
}

// InMemoryUserStore provides an in-memory implementation for users and roles.
type InMemoryUserStore struct {
	mu          sync.RWMutex
	users       map[string]UserRecord
	roles       map[string]RoleRecord
	assignments map[string]map[string]time.Time
}

// NewInMemoryUserStore constructs an empty in-memory store.
func NewInMemoryUserStore() *InMemoryUserStore {
	return &InMemoryUserStore{
		users:       map[string]UserRecord{},
		roles:       map[string]RoleRecord{},
		assignments: map[string]map[string]time.Time{},
	}
}

// ListUsers returns paginated users with simple search/filter support (implements UserRepository.List).
func (s *InMemoryUserStore) ListUsers(ctx context.Context, opts ListOptions) ([]UserRecord, int, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]UserRecord, 0, len(s.users))
	search := strings.ToLower(strings.TrimSpace(opts.Search))
	if search == "" {
		if term, ok := opts.Filters["_search"].(string); ok && strings.TrimSpace(term) != "" {
			search = strings.ToLower(strings.TrimSpace(term))
		}
	}
	filterStatus := strings.ToLower(toString(opts.Filters["status"]))
	filterRole := strings.ToLower(toString(opts.Filters["role"]))
	for _, user := range s.users {
		if filterStatus != "" && strings.ToLower(user.Status) != filterStatus {
			continue
		}
		if filterRole != "" && !containsStringInsensitive(user.Roles, filterRole) && strings.ToLower(user.Role) != filterRole {
			continue
		}
		if search != "" {
			if !strings.Contains(strings.ToLower(user.Email), search) &&
				!strings.Contains(strings.ToLower(user.Username), search) &&
				!strings.Contains(strings.ToLower(user.FirstName), search) &&
				!strings.Contains(strings.ToLower(user.LastName), search) {
				continue
			}
		}
		out = append(out, cloneUser(user))
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Email < out[j].Email
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

// GetUser returns a user by ID (implements UserRepository.Get).
func (s *InMemoryUserStore) GetUser(ctx context.Context, id string) (UserRecord, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	if user, ok := s.users[id]; ok {
		user.Roles = s.roleIDsForUserLocked(id)
		return cloneUser(user), nil
	}
	return UserRecord{}, ErrNotFound
}

// CreateUser inserts a new user (implements UserRepository.Create).
func (s *InMemoryUserStore) CreateUser(ctx context.Context, user UserRecord) (UserRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	if user.ID == "" {
		user.ID = uuid.NewString()
	}
	now := time.Now()
	if user.CreatedAt.IsZero() {
		user.CreatedAt = now
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = now
	}
	user.Roles = dedupeStrings(user.Roles)
	s.users[user.ID] = cloneUser(user)
	for _, role := range user.Roles {
		s.assignNoLock(user.ID, role)
	}
	return cloneUser(user), nil
}

// UpdateUser modifies an existing user (implements UserRepository.Update).
func (s *InMemoryUserStore) UpdateUser(ctx context.Context, user UserRecord) (UserRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	existing, ok := s.users[user.ID]
	if !ok {
		return UserRecord{}, ErrNotFound
	}
	if user.Email != "" {
		existing.Email = user.Email
	}
	if user.Username != "" {
		existing.Username = user.Username
	}
	if user.FirstName != "" {
		existing.FirstName = user.FirstName
	}
	if user.LastName != "" {
		existing.LastName = user.LastName
	}
	if user.Status != "" {
		existing.Status = user.Status
	}
	if user.Role != "" {
		existing.Role = user.Role
	}
	if len(user.Permissions) > 0 {
		existing.Permissions = dedupeStrings(user.Permissions)
	}
	if len(user.Metadata) > 0 {
		if existing.Metadata == nil {
			existing.Metadata = map[string]any{}
		}
		for k, v := range user.Metadata {
			existing.Metadata[k] = v
		}
	}
	if len(user.Roles) > 0 {
		existing.Roles = dedupeStrings(user.Roles)
		s.assignments[user.ID] = map[string]time.Time{}
		for _, role := range existing.Roles {
			s.assignNoLock(user.ID, role)
		}
	}
	existing.UpdatedAt = time.Now()
	s.users[user.ID] = cloneUser(existing)
	return cloneUser(existing), nil
}

// DeleteUser removes a user (implements UserRepository.Delete).
func (s *InMemoryUserStore) DeleteUser(ctx context.Context, id string) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[id]; !ok {
		return ErrNotFound
	}
	delete(s.users, id)
	delete(s.assignments, id)
	return nil
}

// Search performs a simple keyword search across users.
func (s *InMemoryUserStore) Search(ctx context.Context, query string, limit int) ([]UserRecord, error) {
	opts := ListOptions{Search: query, Page: 1, PerPage: limit}
	if opts.PerPage <= 0 {
		opts.PerPage = 5
	}
	users, _, err := s.ListUsers(ctx, opts)
	return users, err
}

// List roles (implements RoleRepository.List).
func (s *InMemoryUserStore) List(ctx context.Context, opts ListOptions) ([]RoleRecord, int, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]RoleRecord, 0, len(s.roles))
	search := strings.ToLower(strings.TrimSpace(opts.Search))
	for _, role := range s.roles {
		if search != "" && !strings.Contains(strings.ToLower(role.Name), search) {
			continue
		}
		out = append(out, cloneRole(role))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
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

// Get returns a role by ID (implements RoleRepository.Get).
func (s *InMemoryUserStore) Get(ctx context.Context, id string) (RoleRecord, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	role, ok := s.roles[id]
	if !ok {
		return RoleRecord{}, ErrNotFound
	}
	return cloneRole(role), nil
}

// Create inserts a role (implements RoleRepository.Create).
func (s *InMemoryUserStore) Create(ctx context.Context, role RoleRecord) (RoleRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	if role.ID == "" {
		role.ID = uuid.NewString()
	}
	now := time.Now()
	if role.CreatedAt.IsZero() {
		role.CreatedAt = now
	}
	if role.UpdatedAt.IsZero() {
		role.UpdatedAt = now
	}
	role.Permissions = dedupeStrings(role.Permissions)
	s.roles[role.ID] = cloneRole(role)
	return cloneRole(role), nil
}

// Update updates an existing role (implements RoleRepository.Update).
func (s *InMemoryUserStore) Update(ctx context.Context, role RoleRecord) (RoleRecord, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	existing, ok := s.roles[role.ID]
	if !ok {
		return RoleRecord{}, ErrNotFound
	}
	if existing.IsSystem && !role.IsSystem {
		role.IsSystem = true
	}
	if role.Name != "" {
		existing.Name = role.Name
	}
	if role.Description != "" {
		existing.Description = role.Description
	}
	if len(role.Permissions) > 0 {
		existing.Permissions = dedupeStrings(role.Permissions)
	}
	existing.IsSystem = existing.IsSystem || role.IsSystem
	existing.UpdatedAt = time.Now()
	s.roles[role.ID] = cloneRole(existing)
	return cloneRole(existing), nil
}

// Delete removes a role if not system-protected (implements RoleRepository.Delete).
func (s *InMemoryUserStore) Delete(ctx context.Context, id string) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	role, ok := s.roles[id]
	if !ok {
		return ErrNotFound
	}
	if role.IsSystem {
		return ErrForbidden
	}
	delete(s.roles, id)
	for userID := range s.assignments {
		delete(s.assignments[userID], id)
	}
	return nil
}

// Assign adds a role assignment for a user.
func (s *InMemoryUserStore) Assign(ctx context.Context, userID, roleID string) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[userID]; !ok {
		return ErrNotFound
	}
	if _, ok := s.roles[roleID]; !ok {
		return ErrNotFound
	}
	s.assignNoLock(userID, roleID)
	return nil
}

// Unassign removes a role assignment.
func (s *InMemoryUserStore) Unassign(ctx context.Context, userID, roleID string) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.users[userID]; !ok {
		return ErrNotFound
	}
	if _, ok := s.roles[roleID]; !ok {
		return ErrNotFound
	}
	if roles, ok := s.assignments[userID]; ok {
		delete(roles, roleID)
	}
	return nil
}

// RolesForUser lists assigned roles.
func (s *InMemoryUserStore) RolesForUser(ctx context.Context, userID string) ([]RoleRecord, error) {
	_ = ctx
	s.mu.RLock()
	defer s.mu.RUnlock()
	if _, ok := s.users[userID]; !ok {
		return nil, ErrNotFound
	}
	ids := s.roleIDsForUserLocked(userID)
	roles := []RoleRecord{}
	for _, id := range ids {
		if role, ok := s.roles[id]; ok {
			roles = append(roles, cloneRole(role))
		}
	}
	return roles, nil
}

func (s *InMemoryUserStore) assignNoLock(userID, roleID string) {
	if userID == "" || roleID == "" {
		return
	}
	if s.assignments[userID] == nil {
		s.assignments[userID] = map[string]time.Time{}
	}
	s.assignments[userID][roleID] = time.Now()
}

func (s *InMemoryUserStore) roleIDsForUserLocked(userID string) []string {
	ids := []string{}
	for id := range s.assignments[userID] {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return ids
}

// inMemoryUserRepoAdapter adapts InMemoryUserStore to UserRepository.
type inMemoryUserRepoAdapter struct {
	store *InMemoryUserStore
}

func (a *inMemoryUserRepoAdapter) List(ctx context.Context, opts ListOptions) ([]UserRecord, int, error) {
	return a.store.ListUsers(ctx, opts)
}

func (a *inMemoryUserRepoAdapter) Get(ctx context.Context, id string) (UserRecord, error) {
	return a.store.GetUser(ctx, id)
}

func (a *inMemoryUserRepoAdapter) Create(ctx context.Context, user UserRecord) (UserRecord, error) {
	return a.store.CreateUser(ctx, user)
}

func (a *inMemoryUserRepoAdapter) Update(ctx context.Context, user UserRecord) (UserRecord, error) {
	return a.store.UpdateUser(ctx, user)
}

func (a *inMemoryUserRepoAdapter) Delete(ctx context.Context, id string) error {
	return a.store.DeleteUser(ctx, id)
}

func (a *inMemoryUserRepoAdapter) Search(ctx context.Context, query string, limit int) ([]UserRecord, error) {
	return a.store.Search(ctx, query, limit)
}

// inMemoryRoleRepoAdapter adapts InMemoryUserStore to RoleRepository.
type inMemoryRoleRepoAdapter struct {
	store *InMemoryUserStore
}

func (a *inMemoryRoleRepoAdapter) List(ctx context.Context, opts ListOptions) ([]RoleRecord, int, error) {
	return a.store.List(ctx, opts)
}

func (a *inMemoryRoleRepoAdapter) Get(ctx context.Context, id string) (RoleRecord, error) {
	return a.store.Get(ctx, id)
}

func (a *inMemoryRoleRepoAdapter) Create(ctx context.Context, role RoleRecord) (RoleRecord, error) {
	return a.store.Create(ctx, role)
}

func (a *inMemoryRoleRepoAdapter) Update(ctx context.Context, role RoleRecord) (RoleRecord, error) {
	return a.store.Update(ctx, role)
}

func (a *inMemoryRoleRepoAdapter) Delete(ctx context.Context, id string) error {
	return a.store.Delete(ctx, id)
}

func (a *inMemoryRoleRepoAdapter) Assign(ctx context.Context, userID, roleID string) error {
	return a.store.Assign(ctx, userID, roleID)
}

func (a *inMemoryRoleRepoAdapter) Unassign(ctx context.Context, userID, roleID string) error {
	return a.store.Unassign(ctx, userID, roleID)
}

func (a *inMemoryRoleRepoAdapter) RolesForUser(ctx context.Context, userID string) ([]RoleRecord, error) {
	return a.store.RolesForUser(ctx, userID)
}

// Interface assertions for adapters.
var (
	_ UserRepository = (*inMemoryUserRepoAdapter)(nil)
	_ RoleRepository = (*inMemoryRoleRepoAdapter)(nil)
)

// GoUsersUserRepository adapts go-users auth/inventory repositories to the admin contract.
type GoUsersUserRepository struct {
	authRepo     users.AuthRepository
	inventory    users.UserInventoryRepository
	scopeBuilder func(context.Context) users.ScopeFilter
}

// NewGoUsersUserRepository builds a repository using go-users collaborators.
func NewGoUsersUserRepository(auth users.AuthRepository, inventory users.UserInventoryRepository, scopeResolver func(context.Context) users.ScopeFilter) *GoUsersUserRepository {
	return &GoUsersUserRepository{authRepo: auth, inventory: inventory, scopeBuilder: scopeResolver}
}

// List delegates to the go-users inventory repository.
func (r *GoUsersUserRepository) List(ctx context.Context, opts ListOptions) ([]UserRecord, int, error) {
	if r == nil || r.inventory == nil {
		return nil, 0, errors.New("user inventory not configured")
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return nil, 0, ErrForbidden
	}
	scope := r.scope(ctx)
	limit := opts.PerPage
	if limit <= 0 {
		limit = 10
	}
	offset := (opts.Page - 1) * limit
	filter := users.UserInventoryFilter{
		Actor: users.ActorRef{ID: actor},
		Scope: scope,
		Keyword: func() string {
			if opts.Search != "" {
				return opts.Search
			}
			if term, ok := opts.Filters["_search"].(string); ok {
				return term
			}
			return ""
		}(),
		Pagination: users.Pagination{Limit: limit, Offset: offset},
	}
	if role, ok := opts.Filters["role"].(string); ok && role != "" {
		filter.Role = role
	}
	if statuses := lifecycleStatesFromFilter(opts.Filters["status"]); len(statuses) > 0 {
		filter.Statuses = statuses
	}
	page, err := r.inventory.ListUsers(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	usersOut := make([]UserRecord, 0, len(page.Users))
	for _, u := range page.Users {
		usersOut = append(usersOut, fromUsersAuthUser(u))
	}
	return usersOut, page.Total, nil
}

// Get fetches a user by ID.
func (r *GoUsersUserRepository) Get(ctx context.Context, id string) (UserRecord, error) {
	if r == nil || r.authRepo == nil {
		return UserRecord{}, errors.New("auth repository not configured")
	}
	uid, err := uuid.Parse(id)
	if err != nil {
		return UserRecord{}, ErrNotFound
	}
	user, err := r.authRepo.GetByID(ctx, uid)
	if err != nil || user == nil {
		return UserRecord{}, ErrNotFound
	}
	return fromUsersAuthUser(*user), nil
}

// Create inserts a new user via go-users.
func (r *GoUsersUserRepository) Create(ctx context.Context, user UserRecord) (UserRecord, error) {
	if r == nil || r.authRepo == nil {
		return UserRecord{}, errors.New("auth repository not configured")
	}
	input := toUsersAuthUser(user)
	created, err := r.authRepo.Create(ctx, &input)
	if err != nil {
		return UserRecord{}, err
	}
	return fromUsersAuthUser(*created), nil
}

// Update modifies a user via go-users.
func (r *GoUsersUserRepository) Update(ctx context.Context, user UserRecord) (UserRecord, error) {
	if r == nil || r.authRepo == nil {
		return UserRecord{}, errors.New("auth repository not configured")
	}
	input := toUsersAuthUser(user)
	updated, err := r.authRepo.Update(ctx, &input)
	if err != nil {
		return UserRecord{}, err
	}
	return fromUsersAuthUser(*updated), nil
}

// Delete marks a user as disabled (go-users does not hard delete via AuthRepository).
func (r *GoUsersUserRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.authRepo == nil {
		return errors.New("auth repository not configured")
	}
	userID, err := uuid.Parse(id)
	if err != nil {
		return ErrNotFound
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return ErrForbidden
	}
	_, err = r.authRepo.UpdateStatus(ctx, users.ActorRef{ID: actor}, userID, users.LifecycleStateDisabled)
	return err
}

// Search proxies to List with a keyword.
func (r *GoUsersUserRepository) Search(ctx context.Context, query string, limit int) ([]UserRecord, error) {
	opts := ListOptions{Search: query, Page: 1, PerPage: limit}
	users, _, err := r.List(ctx, opts)
	return users, err
}

func (r *GoUsersUserRepository) scope(ctx context.Context) users.ScopeFilter {
	if r.scopeBuilder != nil {
		return r.scopeBuilder(ctx)
	}
	return users.ScopeFilter{}
}

// GoUsersRoleRepository adapts a go-users RoleRegistry to the admin contract.
type GoUsersRoleRepository struct {
	registry     users.RoleRegistry
	scopeBuilder func(context.Context) users.ScopeFilter
}

// NewGoUsersRoleRepository constructs a role adapter.
func NewGoUsersRoleRepository(registry users.RoleRegistry, scopeResolver func(context.Context) users.ScopeFilter) *GoUsersRoleRepository {
	return &GoUsersRoleRepository{registry: registry, scopeBuilder: scopeResolver}
}

// List roles via go-users.
func (r *GoUsersRoleRepository) List(ctx context.Context, opts ListOptions) ([]RoleRecord, int, error) {
	if r == nil || r.registry == nil {
		return nil, 0, errors.New("role registry not configured")
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return nil, 0, ErrForbidden
	}
	limit := opts.PerPage
	if limit <= 0 {
		limit = 10
	}
	offset := (opts.Page - 1) * limit
	filter := users.RoleFilter{
		Actor:      users.ActorRef{ID: actor},
		Scope:      r.scope(ctx),
		Keyword:    opts.Search,
		Pagination: users.Pagination{Limit: limit, Offset: offset},
	}
	page, err := r.registry.ListRoles(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	roles := make([]RoleRecord, 0, len(page.Roles))
	for _, role := range page.Roles {
		roles = append(roles, fromUsersRole(role))
	}
	return roles, page.Total, nil
}

// Get role by ID.
func (r *GoUsersRoleRepository) Get(ctx context.Context, id string) (RoleRecord, error) {
	if r == nil || r.registry == nil {
		return RoleRecord{}, errors.New("role registry not configured")
	}
	roleID, err := uuid.Parse(id)
	if err != nil {
		return RoleRecord{}, ErrNotFound
	}
	role, err := r.registry.GetRole(ctx, roleID, r.scope(ctx))
	if err != nil || role == nil {
		return RoleRecord{}, ErrNotFound
	}
	return fromUsersRole(*role), nil
}

// Create inserts a role.
func (r *GoUsersRoleRepository) Create(ctx context.Context, role RoleRecord) (RoleRecord, error) {
	if r == nil || r.registry == nil {
		return RoleRecord{}, errors.New("role registry not configured")
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return RoleRecord{}, ErrForbidden
	}
	input := users.RoleMutation{
		Name:        role.Name,
		Description: role.Description,
		Permissions: role.Permissions,
		IsSystem:    role.IsSystem,
		Scope:       r.scope(ctx),
		ActorID:     actor,
	}
	created, err := r.registry.CreateRole(ctx, input)
	if err != nil {
		return RoleRecord{}, err
	}
	return fromUsersRole(*created), nil
}

// Update modifies a role.
func (r *GoUsersRoleRepository) Update(ctx context.Context, role RoleRecord) (RoleRecord, error) {
	if r == nil || r.registry == nil {
		return RoleRecord{}, errors.New("role registry not configured")
	}
	roleID, err := uuid.Parse(role.ID)
	if err != nil {
		return RoleRecord{}, ErrNotFound
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return RoleRecord{}, ErrForbidden
	}
	input := users.RoleMutation{
		Name:        role.Name,
		Description: role.Description,
		Permissions: role.Permissions,
		IsSystem:    role.IsSystem,
		Scope:       r.scope(ctx),
		ActorID:     actor,
	}
	updated, err := r.registry.UpdateRole(ctx, roleID, input)
	if err != nil {
		return RoleRecord{}, err
	}
	return fromUsersRole(*updated), nil
}

// Delete removes a role via go-users registry.
func (r *GoUsersRoleRepository) Delete(ctx context.Context, id string) error {
	if r == nil || r.registry == nil {
		return errors.New("role registry not configured")
	}
	roleID, err := uuid.Parse(id)
	if err != nil {
		return ErrNotFound
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return ErrForbidden
	}
	return r.registry.DeleteRole(ctx, roleID, r.scope(ctx), actor)
}

// Assign a role to a user.
func (r *GoUsersRoleRepository) Assign(ctx context.Context, userID, roleID string) error {
	if r == nil || r.registry == nil {
		return errors.New("role registry not configured")
	}
	uID, err := uuid.Parse(userID)
	if err != nil {
		return ErrNotFound
	}
	rID, err := uuid.Parse(roleID)
	if err != nil {
		return ErrNotFound
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return ErrForbidden
	}
	return r.registry.AssignRole(ctx, uID, rID, r.scope(ctx), actor)
}

// Unassign removes a role assignment.
func (r *GoUsersRoleRepository) Unassign(ctx context.Context, userID, roleID string) error {
	if r == nil || r.registry == nil {
		return errors.New("role registry not configured")
	}
	uID, err := uuid.Parse(userID)
	if err != nil {
		return ErrNotFound
	}
	rID, err := uuid.Parse(roleID)
	if err != nil {
		return ErrNotFound
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return ErrForbidden
	}
	return r.registry.UnassignRole(ctx, uID, rID, r.scope(ctx), actor)
}

// RolesForUser lists assignments.
func (r *GoUsersRoleRepository) RolesForUser(ctx context.Context, userID string) ([]RoleRecord, error) {
	if r == nil || r.registry == nil {
		return nil, errors.New("role registry not configured")
	}
	uID, err := uuid.Parse(userID)
	if err != nil {
		return nil, ErrNotFound
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return nil, ErrForbidden
	}
	assignments, err := r.registry.ListAssignments(ctx, users.RoleAssignmentFilter{
		Actor: users.ActorRef{ID: actor},
		Scope: r.scope(ctx),
		UserID: func() uuid.UUID {
			return uID
		}(),
	})
	if err != nil {
		return nil, err
	}
	roleIDs := []uuid.UUID{}
	for _, assignment := range assignments {
		roleIDs = append(roleIDs, assignment.RoleID)
	}
	if len(roleIDs) == 0 {
		return nil, nil
	}
	filter := users.RoleFilter{
		Actor:      users.ActorRef{ID: actor},
		Scope:      r.scope(ctx),
		RoleIDs:    roleIDs,
		Pagination: users.Pagination{Limit: len(roleIDs), Offset: 0},
	}
	page, err := r.registry.ListRoles(ctx, filter)
	if err != nil {
		return nil, err
	}
	roles := make([]RoleRecord, 0, len(page.Roles))
	for _, role := range page.Roles {
		roles = append(roles, fromUsersRole(role))
	}
	return roles, nil
}

func (r *GoUsersRoleRepository) scope(ctx context.Context) users.ScopeFilter {
	if r.scopeBuilder != nil {
		return r.scopeBuilder(ctx)
	}
	return users.ScopeFilter{}
}

func uuidFromContext(ctx context.Context) uuid.UUID {
	if ctx == nil {
		return uuid.Nil
	}
	if actor := actorFromContext(ctx); actor != "" {
		if id, err := uuid.Parse(actor); err == nil {
			return id
		}
	}
	if id := userIDFromContext(ctx); id != "" {
		if parsed, err := uuid.Parse(id); err == nil {
			return parsed
		}
	}
	return uuid.Nil
}

func lifecycleStatesFromFilter(val any) []users.LifecycleState {
	switch v := val.(type) {
	case string:
		if state := normalizeLifecycleState(v); state != "" {
			return []users.LifecycleState{state}
		}
	case []string:
		states := []users.LifecycleState{}
		for _, item := range v {
			if state := normalizeLifecycleState(item); state != "" {
				states = append(states, state)
			}
		}
		if len(states) > 0 {
			return states
		}
	case []any:
		states := []users.LifecycleState{}
		for _, item := range v {
			if state := normalizeLifecycleState(toString(item)); state != "" {
				states = append(states, state)
			}
		}
		if len(states) > 0 {
			return states
		}
	}
	return nil
}

func normalizeLifecycleState(status string) users.LifecycleState {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "active":
		return users.LifecycleStateActive
	case "pending":
		return users.LifecycleStatePending
	case "suspended", "inactive":
		return users.LifecycleStateSuspended
	case "disabled":
		return users.LifecycleStateDisabled
	case "archived":
		return users.LifecycleStateArchived
	default:
		return ""
	}
}

func fromUsersAuthUser(u users.AuthUser) UserRecord {
	return UserRecord{
		ID:        u.ID.String(),
		Email:     u.Email,
		Username:  u.Username,
		Status:    string(u.Status),
		Role:      u.Role,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Metadata:  cloneAnyMap(u.Metadata),
	}
}

func toUsersAuthUser(u UserRecord) users.AuthUser {
	id, _ := uuid.Parse(u.ID)
	return users.AuthUser{
		ID:        id,
		Email:     u.Email,
		Username:  u.Username,
		Status:    users.LifecycleState(u.Status),
		Role:      u.Role,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Metadata:  cloneAnyMap(u.Metadata),
	}
}

func fromUsersRole(role users.RoleDefinition) RoleRecord {
	return RoleRecord{
		ID:          role.ID.String(),
		Name:        role.Name,
		Description: role.Description,
		Permissions: append([]string{}, role.Permissions...),
		IsSystem:    role.IsSystem,
		CreatedAt:   role.CreatedAt,
		UpdatedAt:   role.UpdatedAt,
	}
}

func roleIDs(roles []RoleRecord) []string {
	out := make([]string, 0, len(roles))
	for _, role := range roles {
		out = append(out, role.ID)
	}
	return out
}

func cloneUser(u UserRecord) UserRecord {
	return UserRecord{
		ID:          u.ID,
		Email:       u.Email,
		Username:    u.Username,
		FirstName:   u.FirstName,
		LastName:    u.LastName,
		Status:      u.Status,
		Role:        u.Role,
		Roles:       append([]string{}, u.Roles...),
		Permissions: append([]string{}, u.Permissions...),
		Metadata:    cloneAnyMap(u.Metadata),
		CreatedAt:   u.CreatedAt,
		UpdatedAt:   u.UpdatedAt,
	}
}

func cloneRole(r RoleRecord) RoleRecord {
	return RoleRecord{
		ID:          r.ID,
		Name:        r.Name,
		Description: r.Description,
		Permissions: append([]string{}, r.Permissions...),
		IsSystem:    r.IsSystem,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}

func dedupeStrings(values []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, v := range values {
		if v == "" {
			continue
		}
		key := strings.TrimSpace(v)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, key)
	}
	return out
}

func containsStringInsensitive(values []string, candidate string) bool {
	for _, v := range values {
		if strings.EqualFold(v, candidate) {
			return true
		}
	}
	return false
}
