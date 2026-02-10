package admin

import (
	"context"
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
	RoleDisplay string
	RoleLabels  []string
	Permissions []string
	Metadata    map[string]any
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// RoleRecord captures custom roles and their permissions.
type RoleRecord struct {
	ID          string
	Name        string
	RoleKey     string
	Description string
	Permissions []string
	Metadata    map[string]any
	IsSystem    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// BulkRoleChangeRequest captures inputs for bulk role assignment operations.
type BulkRoleChangeRequest struct {
	UserIDs []string
	RoleID  string
	Assign  bool
	Replace bool
}

// BulkRoleChangeSummary aggregates per-user execution status for bulk role changes.
type BulkRoleChangeSummary struct {
	Processed int `json:"processed"`
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
	Skipped   int `json:"skipped"`
}

// BulkRoleChangeResult captures per-user execution details for bulk role changes.
type BulkRoleChangeResult struct {
	UserID string `json:"user_id"`
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

// BulkRoleChangeResponse is the public API contract returned by bulk role endpoints.
type BulkRoleChangeResponse struct {
	Summary BulkRoleChangeSummary  `json:"summary"`
	Results []BulkRoleChangeResult `json:"results"`
	RoleID  string                 `json:"role_id"`
	Action  string                 `json:"action"`
	Replace bool                   `json:"replace"`
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
	users      UserRepository
	roles      RoleRepository
	roleLookup RoleAssignmentLookup
	activity   ActivitySink
	timeNow    func() time.Time
	idBuilder  func() string
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
	service := &UserManagementService{
		users:     users,
		roles:     roles,
		timeNow:   time.Now,
		idBuilder: func() string { return uuid.NewString() },
	}
	if lookup := defaultRoleAssignmentLookup(roles); lookup != nil {
		service.roleLookup = lookup
	}
	return service
}

// WithActivitySink wires activity emission for user and role mutations.
func (s *UserManagementService) WithActivitySink(sink ActivitySink) {
	if s != nil && sink != nil {
		s.activity = sink
	}
}

// WithRoleAssignmentLookup sets the lookup used to validate custom role assignments.
func (s *UserManagementService) WithRoleAssignmentLookup(lookup RoleAssignmentLookup) *UserManagementService {
	if s != nil && lookup != nil {
		s.roleLookup = lookup
	}
	return s
}

// ListUsers returns users with role assignments populated.
func (s *UserManagementService) ListUsers(ctx context.Context, opts ListOptions) ([]UserRecord, int, error) {
	if s == nil || s.users == nil {
		return nil, 0, serviceNotConfiguredDomainError("user service", nil)
	}
	users, total, err := s.users.List(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	for i := range users {
		s.hydrateUserRoles(ctx, &users[i])
	}
	return users, total, nil
}

// GetUser fetches a user and attached roles.
func (s *UserManagementService) GetUser(ctx context.Context, id string) (UserRecord, error) {
	if s == nil || s.users == nil {
		return UserRecord{}, serviceNotConfiguredDomainError("user service", nil)
	}
	user, err := s.users.Get(ctx, id)
	if err != nil {
		return UserRecord{}, err
	}
	s.hydrateUserRoles(ctx, &user)
	return user, nil
}

// BulkRoleChange applies assign/unassign role mutations for multiple users.
func (s *UserManagementService) BulkRoleChange(ctx context.Context, req BulkRoleChangeRequest) (BulkRoleChangeResponse, error) {
	if s == nil || s.roles == nil {
		return BulkRoleChangeResponse{}, serviceNotConfiguredDomainError("role service", nil)
	}
	roleID := strings.TrimSpace(req.RoleID)
	if roleID == "" {
		return BulkRoleChangeResponse{}, validationDomainError("invalid role id", map[string]any{"field": "role_id"})
	}
	userIDs := dedupeNonEmptyStrings(req.UserIDs)
	if len(userIDs) == 0 {
		return BulkRoleChangeResponse{}, validationDomainError("invalid user ids", map[string]any{"field": "ids"})
	}

	response := BulkRoleChangeResponse{
		Summary: BulkRoleChangeSummary{Processed: len(userIDs)},
		Results: make([]BulkRoleChangeResult, 0, len(userIDs)),
		RoleID:  roleID,
		Action:  "unassign",
		Replace: req.Replace,
	}
	if req.Assign {
		response.Action = "assign"
	}

	for _, userID := range userIDs {
		result := BulkRoleChangeResult{
			UserID: userID,
			Status: "skipped",
		}

		if req.Assign && req.Replace {
			existing, err := s.RolesForUser(ctx, userID)
			if err != nil {
				result.Status = "failed"
				result.Error = err.Error()
				response.Summary.Failed++
				response.Results = append(response.Results, result)
				continue
			}
			replaceFailed := false
			for _, role := range existing {
				if strings.TrimSpace(role.ID) == roleID {
					continue
				}
				if err := s.UnassignRole(ctx, userID, role.ID); err != nil {
					result.Status = "failed"
					result.Error = err.Error()
					response.Summary.Failed++
					response.Results = append(response.Results, result)
					replaceFailed = true
					break
				}
			}
			if replaceFailed {
				continue
			}
		}

		var execErr error
		if req.Assign {
			execErr = s.AssignRole(ctx, userID, roleID)
		} else {
			execErr = s.UnassignRole(ctx, userID, roleID)
		}
		if execErr != nil {
			result.Status = "failed"
			result.Error = execErr.Error()
			response.Summary.Failed++
		} else {
			result.Status = "success"
			response.Summary.Succeeded++
		}
		response.Results = append(response.Results, result)
	}

	response.Summary.Skipped = response.Summary.Processed - response.Summary.Succeeded - response.Summary.Failed
	return response, nil
}

// SaveUser creates or updates a user and syncs role assignments.
func (s *UserManagementService) SaveUser(ctx context.Context, user UserRecord) (UserRecord, error) {
	if s == nil || s.users == nil {
		return UserRecord{}, serviceNotConfiguredDomainError("user service", nil)
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
	if s != nil {
		if filtered, err := s.filterAssignableRoles(ctx, user.Roles); err != nil {
			return UserRecord{}, err
		} else {
			user.Roles = filtered
		}
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
		return serviceNotConfiguredDomainError("user service", nil)
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
		return UserRecord{}, serviceNotConfiguredDomainError("user service", nil)
	}
	next := normalizeLifecycleState(status)
	if next == "" {
		return UserRecord{}, validationDomainError("invalid status", map[string]any{"field": "status"})
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
		return nil, 0, serviceNotConfiguredDomainError("role service", nil)
	}
	return s.roles.List(ctx, opts)
}

// GetRole fetches a role by ID.
func (s *UserManagementService) GetRole(ctx context.Context, id string) (RoleRecord, error) {
	if s == nil || s.roles == nil {
		return RoleRecord{}, serviceNotConfiguredDomainError("role service", nil)
	}
	return s.roles.Get(ctx, id)
}

// SaveRole creates or updates a role.
func (s *UserManagementService) SaveRole(ctx context.Context, role RoleRecord) (RoleRecord, error) {
	if s == nil || s.roles == nil {
		return RoleRecord{}, serviceNotConfiguredDomainError("role service", nil)
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
		return serviceNotConfiguredDomainError("role service", nil)
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

// RolesForUser returns assigned roles for the given user.
func (s *UserManagementService) RolesForUser(ctx context.Context, userID string) ([]RoleRecord, error) {
	if s == nil || s.roles == nil {
		return nil, serviceNotConfiguredDomainError("role service", nil)
	}
	return s.roles.RolesForUser(ctx, userID)
}

// AssignRole assigns a role to a user.
func (s *UserManagementService) AssignRole(ctx context.Context, userID, roleID string) error {
	if s == nil || s.roles == nil {
		return serviceNotConfiguredDomainError("role service", nil)
	}
	if err := s.roles.Assign(ctx, userID, roleID); err != nil {
		return err
	}
	s.recordActivity(ctx, "role.assign", "user:"+userID, map[string]any{
		"user_id": userID,
		"role_id": roleID,
	})
	return nil
}

// UnassignRole removes a role assignment from a user.
func (s *UserManagementService) UnassignRole(ctx context.Context, userID, roleID string) error {
	if s == nil || s.roles == nil {
		return serviceNotConfiguredDomainError("role service", nil)
	}
	if err := s.roles.Unassign(ctx, userID, roleID); err != nil {
		return err
	}
	s.recordActivity(ctx, "role.unassign", "user:"+userID, map[string]any{
		"user_id": userID,
		"role_id": roleID,
	})
	return nil
}

// SearchUsers performs a keyword search against users.
func (s *UserManagementService) SearchUsers(ctx context.Context, query string, limit int) ([]UserRecord, error) {
	if s == nil || s.users == nil {
		return nil, serviceNotConfiguredDomainError("user service", nil)
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

func (s *UserManagementService) filterAssignableRoles(ctx context.Context, roles []string) ([]string, error) {
	if s == nil || s.roleLookup == nil {
		return dedupeStrings(roles), nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(roles))
	for _, roleID := range roles {
		roleID = strings.TrimSpace(roleID)
		if roleID == "" || seen[roleID] {
			continue
		}
		ok, err := s.roleLookup.IsAssignable(ctx, roleID)
		if err != nil {
			return nil, err
		}
		if ok {
			seen[roleID] = true
			out = append(out, roleID)
		}
	}
	return out, nil
}

func (s *UserManagementService) hydrateUserRoles(ctx context.Context, user *UserRecord) {
	if s == nil || s.roles == nil || user == nil {
		return
	}
	userID := strings.TrimSpace(user.ID)
	if userID == "" {
		return
	}
	roles, err := s.roles.RolesForUser(ctx, userID)
	if err != nil || len(roles) == 0 {
		return
	}
	user.Roles = roleIDs(roles)
	user.RoleLabels = roleLabels(roles)
	if len(user.RoleLabels) > 0 {
		user.RoleDisplay = strings.Join(user.RoleLabels, ", ")
	}
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
		return nil, 0, serviceNotConfiguredDomainError("user inventory", nil)
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
		return UserRecord{}, serviceNotConfiguredDomainError("auth repository", nil)
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
		return UserRecord{}, serviceNotConfiguredDomainError("auth repository", nil)
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
		return UserRecord{}, serviceNotConfiguredDomainError("auth repository", nil)
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
		return serviceNotConfiguredDomainError("auth repository", nil)
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
		return nil, 0, serviceNotConfiguredDomainError("role registry", nil)
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
	includeSystem := true
	if raw, ok := opts.Filters["include_system"]; ok {
		includeSystem = toBool(raw)
	}
	includeGlobal := true
	if raw, ok := opts.Filters["include_global"]; ok {
		includeGlobal = toBool(raw)
	}
	scope := r.scope(ctx)
	filter := users.RoleFilter{
		Actor:         users.ActorRef{ID: actor},
		Scope:         scope,
		Keyword:       opts.Search,
		IncludeSystem: includeSystem,
		Pagination:    users.Pagination{Limit: limit, Offset: offset},
	}
	if roleKey := strings.TrimSpace(toString(opts.Filters["role_key"])); roleKey != "" {
		filter.RoleKey = roleKey
	}

	// If scoped, optionally merge global roles (scope-less).
	if includeGlobal && (scope.TenantID != uuid.Nil || scope.OrgID != uuid.Nil) {
		scopedFilter := filter
		scopedFilter.Pagination = users.Pagination{Limit: 200, Offset: 0}
		scopedRoles, err := r.listAllRoles(ctx, scopedFilter)
		if err != nil {
			return nil, 0, err
		}
		globalFilter := filter
		globalFilter.Scope = users.ScopeFilter{}
		globalFilter.Pagination = users.Pagination{Limit: 200, Offset: 0}
		globalRoles, err := r.listAllRoles(ctx, globalFilter)
		if err != nil {
			return nil, 0, err
		}

		merged := make([]users.RoleDefinition, 0, len(scopedRoles)+len(globalRoles))
		seen := map[uuid.UUID]bool{}
		for _, role := range scopedRoles {
			if role.ID == uuid.Nil || seen[role.ID] {
				continue
			}
			seen[role.ID] = true
			merged = append(merged, role)
		}
		for _, role := range globalRoles {
			if role.ID == uuid.Nil || seen[role.ID] {
				continue
			}
			seen[role.ID] = true
			merged = append(merged, role)
		}

		sort.SliceStable(merged, func(i, j int) bool {
			if merged[i].Order != merged[j].Order {
				return merged[i].Order < merged[j].Order
			}
			return strings.ToLower(merged[i].Name) < strings.ToLower(merged[j].Name)
		})

		total := len(merged)
		start := offset
		if start < 0 {
			start = 0
		}
		if start > total {
			start = total
		}
		end := start + limit
		if end > total {
			end = total
		}
		pageSlice := merged[start:end]
		roles := make([]RoleRecord, 0, len(pageSlice))
		for _, role := range pageSlice {
			roles = append(roles, fromUsersRole(role))
		}
		return roles, total, nil
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

func (r *GoUsersRoleRepository) listAllRoles(ctx context.Context, filter users.RoleFilter) ([]users.RoleDefinition, error) {
	if r == nil || r.registry == nil {
		return nil, serviceNotConfiguredDomainError("role registry", nil)
	}
	limit := filter.Pagination.Limit
	if limit <= 0 || limit > 200 {
		limit = 200
	}
	offset := filter.Pagination.Offset
	if offset < 0 {
		offset = 0
	}
	filter.Pagination = users.Pagination{Limit: limit, Offset: offset}
	out := []users.RoleDefinition{}
	for {
		page, err := r.registry.ListRoles(ctx, filter)
		if err != nil {
			return nil, err
		}
		if len(page.Roles) > 0 {
			out = append(out, page.Roles...)
		}
		if !page.HasMore {
			break
		}
		filter.Pagination.Offset = page.NextOffset
	}
	return out, nil
}

// Get role by ID.
func (r *GoUsersRoleRepository) Get(ctx context.Context, id string) (RoleRecord, error) {
	if r == nil || r.registry == nil {
		return RoleRecord{}, serviceNotConfiguredDomainError("role registry", nil)
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
		return RoleRecord{}, serviceNotConfiguredDomainError("role registry", nil)
	}
	actor := uuidFromContext(ctx)
	if actor == uuid.Nil {
		return RoleRecord{}, ErrForbidden
	}
	input := users.RoleMutation{
		Name:        role.Name,
		RoleKey:     role.RoleKey,
		Description: role.Description,
		Permissions: role.Permissions,
		Metadata:    cloneAnyMap(role.Metadata),
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
		return RoleRecord{}, serviceNotConfiguredDomainError("role registry", nil)
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
		RoleKey:     role.RoleKey,
		Description: role.Description,
		Permissions: role.Permissions,
		Metadata:    cloneAnyMap(role.Metadata),
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
		return serviceNotConfiguredDomainError("role registry", nil)
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
		return serviceNotConfiguredDomainError("role registry", nil)
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
		return serviceNotConfiguredDomainError("role registry", nil)
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
		return nil, serviceNotConfiguredDomainError("role registry", nil)
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
		RoleKey:     role.RoleKey,
		Description: role.Description,
		Permissions: append([]string{}, role.Permissions...),
		Metadata:    cloneAnyMap(role.Metadata),
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

func roleLabels(roles []RoleRecord) []string {
	out := make([]string, 0, len(roles))
	for _, role := range roles {
		label := strings.TrimSpace(role.Name)
		if label == "" {
			label = strings.TrimSpace(role.RoleKey)
		}
		if label == "" {
			label = strings.TrimSpace(role.ID)
		}
		if label != "" {
			out = append(out, label)
		}
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
		RoleDisplay: u.RoleDisplay,
		RoleLabels:  append([]string{}, u.RoleLabels...),
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
		RoleKey:     r.RoleKey,
		Description: r.Description,
		Permissions: append([]string{}, r.Permissions...),
		Metadata:    cloneAnyMap(r.Metadata),
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

func dedupeNonEmptyStrings(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		out = append(out, trimmed)
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
