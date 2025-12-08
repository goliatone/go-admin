package stores

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

const (
	defaultUserPageSize = 50
)

var (
	allowedUserRoles = map[string]struct{}{
		"admin":  {},
		"editor": {},
		"viewer": {},
	}
	allowedUserStatuses = map[string]struct{}{
		"active":    {},
		"inactive":  {},
		"pending":   {},
		"suspended": {},
		"disabled":  {},
		"archived":  {},
	}
)

// User mirrors the JSON shape expected by go-crud.
type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`
	ID            uuid.UUID `json:"id" bun:"id,pk,type:uuid"`
	Username      string    `json:"username" bun:"username"`
	Email         string    `json:"email" bun:"email"`
	Role          string    `json:"role" bun:"role"`
	Status        string    `json:"status" bun:"status"`
	CreatedAt     time.Time `json:"created_at" bun:"created_at"`
	LastLogin     time.Time `json:"last_login" bun:"last_login"`
}

// UserStore manages user data through a go-users-compatible repository.
type UserStore struct {
	repo     *goUsersMemoryRepo
	activity admin.ActivitySink
	crudRepo repository.Repository[*User]
}

// NewUserStore provisions an in-memory go-users repository for the example.
func NewUserStore() (*UserStore, error) {
	repo := newGoUsersMemoryRepo()
	store := &UserStore{repo: repo}
	store.crudRepo = &userRepositoryAdapter{store: store}
	return store, nil
}

// WithActivitySink enables activity emission on create/update/delete operations.
func (s *UserStore) WithActivitySink(sink admin.ActivitySink) {
	s.activity = sink
}

// Repository exposes a go-crud compatible repository adapter.
func (s *UserStore) Repository() repository.Repository[*User] {
	return s.crudRepo
}

// Teardown clears all user records (used by tests/fixtures).
func (s *UserStore) Teardown() {
	s.repo.Reset()
}

// Seed populates the store with sample data.
func (s *UserStore) Seed() {
	now := time.Now().UTC()
	samples := []struct {
		Username  string
		Email     string
		Role      string
		Status    types.LifecycleState
		CreatedAt time.Time
		LastLogin time.Time
	}{
		{
			Username:  "admin",
			Email:     "admin@example.com",
			Role:      "admin",
			Status:    types.LifecycleStateActive,
			CreatedAt: now.Add(-365 * 24 * time.Hour),
			LastLogin: now.Add(-2 * time.Hour),
		},
		{
			Username:  "jane.smith",
			Email:     "jane@example.com",
			Role:      "editor",
			Status:    types.LifecycleStateActive,
			CreatedAt: now.Add(-180 * 24 * time.Hour),
			LastLogin: now.Add(-5 * time.Hour),
		},
		{
			Username:  "john.doe",
			Email:     "john@example.com",
			Role:      "editor",
			Status:    types.LifecycleStateActive,
			CreatedAt: now.Add(-90 * 24 * time.Hour),
			LastLogin: now.Add(-24 * time.Hour),
		},
		{
			Username:  "viewer",
			Email:     "viewer@example.com",
			Role:      "viewer",
			Status:    types.LifecycleStateActive,
			CreatedAt: now.Add(-30 * 24 * time.Hour),
			LastLogin: now.Add(-3 * 24 * time.Hour),
		},
		{
			Username:  "inactive.user",
			Email:     "inactive@example.com",
			Role:      "viewer",
			Status:    types.LifecycleStateSuspended,
			CreatedAt: now.Add(-200 * 24 * time.Hour),
			LastLogin: now.Add(-120 * time.Hour),
		},
	}

	for _, sample := range samples {
		user := &types.AuthUser{
			ID:        uuid.New(),
			Username:  sample.Username,
			Email:     sample.Email,
			Role:      sample.Role,
			Status:    sample.Status,
			CreatedAt: ptrTime(sample.CreatedAt),
		}
		_ = s.repo.SetLastLogin(user.ID, sample.LastLogin)
		_, _ = s.repo.Create(context.Background(), user)
	}
}

func validateUserPayload(record map[string]any, requireCoreFields bool) error {
	if record == nil {
		record = map[string]any{}
	}

	username, hasUsername := trimmedField(record, "username")
	email, hasEmail := trimmedField(record, "email")
	role, hasRole := trimmedField(record, "role")
	status, hasStatus := trimmedField(record, "status")

	missing := []string{}
	if requireCoreFields || hasUsername {
		if username == "" {
			missing = append(missing, "username")
		}
	}
	if requireCoreFields || hasEmail {
		if email == "" {
			missing = append(missing, "email")
		}
	}

	if len(missing) > 0 {
		return newValidationError("missing required fields", map[string]any{
			"fields": missing,
		})
	}

	if email != "" && !strings.Contains(email, "@") {
		return newValidationError("email must be valid", map[string]any{
			"email": email,
		})
	}

	if hasRole && role != "" {
		if _, ok := allowedUserRoles[strings.ToLower(role)]; !ok {
			return newValidationError("invalid role", map[string]any{
				"role": role,
			})
		}
	}

	if hasStatus && status != "" {
		if _, ok := allowedUserStatuses[strings.ToLower(status)]; !ok {
			return newValidationError("invalid status", map[string]any{
				"status": status,
			})
		}
	}

	return nil
}

func trimmedField(record map[string]any, key string) (string, bool) {
	if record == nil {
		return "", false
	}
	val, ok := record[key]
	if !ok {
		return "", false
	}
	return strings.TrimSpace(asString(val, "")), true
}

func newValidationError(message string, metadata map[string]any) error {
	err := goerrors.New(message, goerrors.CategoryValidation).
		WithCode(goerrors.CodeBadRequest).
		WithTextCode("VALIDATION_ERROR")
	if len(metadata) > 0 {
		err = err.WithMetadata(metadata)
	}
	return err
}

// List returns users honoring search/filters/pagination.
func (s *UserStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	filter := userInventoryFilterFromOptions(opts)
	page, err := s.repo.ListUsers(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	results := make([]map[string]any, 0, len(page.Users))
	for _, user := range page.Users {
		results = append(results, userToMap(&user, s.repo.LastLogin(user.ID)))
	}
	return results, page.Total, nil
}

// Get returns a single user by ID.
func (s *UserStore) Get(ctx context.Context, id string) (map[string]any, error) {
	userID, err := uuid.Parse(id)
	if err != nil {
		return nil, invalidUserIDError(id)
	}
	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return userToMap(user, s.repo.LastLogin(user.ID)), nil
}

// Create adds a new user.
func (s *UserStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if err := validateUserPayload(record, true); err != nil {
		return nil, err
	}

	user, lastLogin := mapToAuthUser(record)
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.CreatedAt == nil {
		now := time.Now().UTC()
		user.CreatedAt = &now
	}

	created, err := s.repo.Create(ctx, user)
	if err != nil {
		return nil, err
	}
	if !lastLogin.IsZero() {
		_ = s.repo.SetLastLogin(created.ID, lastLogin)
	}

	result := userToMap(created, s.repo.LastLogin(created.ID))
	s.emitActivity(ctx, "created", created)
	return result, nil
}

// Update modifies an existing user.
func (s *UserStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := validateUserPayload(record, false); err != nil {
		return nil, err
	}

	userID, err := uuid.Parse(id)
	if err != nil {
		return nil, invalidUserIDError(id)
	}
	existing, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	updated := applyUserPatch(existing, record)
	saved, err := s.repo.Update(ctx, updated)
	if err != nil {
		return nil, err
	}
	if last := extractLastLogin(record); !last.IsZero() {
		_ = s.repo.SetLastLogin(saved.ID, last)
	}

	result := userToMap(saved, s.repo.LastLogin(saved.ID))
	s.emitActivity(ctx, "updated", saved)
	return result, nil
}

// Delete removes a user.
func (s *UserStore) Delete(ctx context.Context, id string) error {
	userID, err := uuid.Parse(id)
	if err != nil {
		return invalidUserIDError(id)
	}

	user, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, userID); err != nil {
		return err
	}
	s.emitActivity(ctx, "deleted", user)
	return nil
}

func (s *UserStore) emitActivity(ctx context.Context, verb string, user *types.AuthUser) {
	if s.activity == nil || user == nil {
		return
	}

	object := fmt.Sprintf("user: %s", user.ID.String())
	entry := admin.ActivityEntry{
		Actor:  resolveActivityActor(ctx),
		Action: verb,
		Object: object,
		Metadata: map[string]any{
			"email":    user.Email,
			"username": user.Username,
			"role":     user.Role,
			"status":   statusToOutput(user.Status),
		},
	}
	_ = s.activity.Record(ctx, entry)
}

func userInventoryFilterFromOptions(opts admin.ListOptions) types.UserInventoryFilter {
	keyword := strings.TrimSpace(opts.Search)
	if keyword == "" {
		if search, ok := opts.Filters["_search"].(string); ok {
			keyword = strings.TrimSpace(search)
		}
	}

	role := ""
	if r, ok := opts.Filters["role"].(string); ok {
		role = strings.TrimSpace(r)
	}

	statuses := parseStatusFilter(opts.Filters["status"])
	limit := opts.PerPage
	if limit <= 0 {
		limit = defaultUserPageSize
	}
	page := opts.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	return types.UserInventoryFilter{
		Keyword:  keyword,
		Role:     role,
		Statuses: statuses,
		Pagination: types.Pagination{
			Limit:  limit,
			Offset: offset,
		},
	}
}

func userToMap(user *types.AuthUser, lastLogin time.Time) map[string]any {
	created := ""
	if user.CreatedAt != nil {
		created = user.CreatedAt.Format(time.RFC3339)
	}
	last := ""
	if !lastLogin.IsZero() {
		last = lastLogin.Format(time.RFC3339)
	}

	return map[string]any{
		"id":         user.ID.String(),
		"username":   user.Username,
		"email":      user.Email,
		"role":       user.Role,
		"status":     statusToOutput(user.Status),
		"created_at": created,
		"last_login": last,
	}
}

func mapToAuthUser(record map[string]any) (*types.AuthUser, time.Time) {
	user := &types.AuthUser{
		ID:       parseUUID(asString(record["id"], "")),
		Username: asString(record["username"], ""),
		Email:    asString(record["email"], ""),
		Role:     asString(record["role"], "viewer"),
		Status:   statusFromInput(asString(record["status"], "active")),
	}
	if created := parseTimeValue(record["created_at"]); !created.IsZero() {
		user.CreatedAt = ptrTime(created)
	}

	return user, extractLastLogin(record)
}

func applyUserPatch(existing *types.AuthUser, record map[string]any) *types.AuthUser {
	clone := cloneAuthUser(existing)

	if username := asString(record["username"], ""); username != "" {
		clone.Username = username
	}
	if email := asString(record["email"], ""); email != "" {
		clone.Email = email
	}
	if role := asString(record["role"], ""); role != "" {
		clone.Role = role
	}
	if status := asString(record["status"], ""); status != "" {
		clone.Status = statusFromInput(status)
	}
	if created := parseTimeValue(record["created_at"]); !created.IsZero() {
		clone.CreatedAt = ptrTime(created)
	}
	return clone
}

func parseUUID(val string) uuid.UUID {
	id, _ := uuid.Parse(strings.TrimSpace(val))
	return id
}

func invalidUserIDError(id string) error {
	message := "invalid user id"
	if trimmed := strings.TrimSpace(id); trimmed != "" {
		message = fmt.Sprintf("invalid user id: %s", trimmed)
	}
	return goerrors.New(message, goerrors.CategoryBadInput).
		WithCode(goerrors.CodeBadRequest).
		WithTextCode("INVALID_ID")
}

func parseStatusFilter(val any) []types.LifecycleState {
	switch v := val.(type) {
	case string:
		if strings.TrimSpace(v) == "" {
			return nil
		}
		return []types.LifecycleState{statusFromInput(v)}
	case []string:
		out := make([]types.LifecycleState, 0, len(v))
		for _, item := range v {
			out = append(out, statusFromInput(item))
		}
		return out
	default:
		return nil
	}
}

func statusFromInput(status string) types.LifecycleState {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "active":
		return types.LifecycleStateActive
	case "inactive":
		return types.LifecycleStateSuspended
	case "":
		return types.LifecycleStateSuspended
	default:
		return types.LifecycleState(status)
	}
}

func statusToOutput(state types.LifecycleState) string {
	switch state {
	case types.LifecycleStateActive:
		return "active"
	case types.LifecycleStatePending:
		return "pending"
	case types.LifecycleStateSuspended, types.LifecycleStateDisabled, types.LifecycleStateArchived:
		return "inactive"
	default:
		if state == "" {
			return "inactive"
		}
		return strings.ToLower(string(state))
	}
}

func parseTimeValue(val any) time.Time {
	switch v := val.(type) {
	case time.Time:
		return v
	case *time.Time:
		if v != nil {
			return *v
		}
	case string:
		if t, err := time.Parse(time.RFC3339, strings.TrimSpace(v)); err == nil {
			return t
		}
	}
	return time.Time{}
}

func extractLastLogin(record map[string]any) time.Time {
	if record == nil {
		return time.Time{}
	}
	if ts := parseTimeValue(record["last_login"]); !ts.IsZero() {
		return ts
	}
	return time.Time{}
}

func asString(val any, def string) string {
	if val == nil {
		return def
	}
	switch v := val.(type) {
	case string:
		if strings.TrimSpace(v) == "" {
			return def
		}
		return v
	case fmt.Stringer:
		return v.String()
	default:
		return fmt.Sprintf("%v", v)
	}
}

func resolveActivityActor(ctx context.Context) string {
	if ctx == nil {
		return "system"
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if actor.ActorID != "" {
			return actor.ActorID
		}
		if actor.Subject != "" {
			return actor.Subject
		}
	}
	return "system"
}

func ptrTime(t time.Time) *time.Time {
	return &t
}

// goUsersMemoryRepo implements go-users repositories for the example.
type goUsersMemoryRepo struct {
	mu        sync.RWMutex
	users     map[uuid.UUID]*types.AuthUser
	lastLogin map[uuid.UUID]time.Time
}

func newGoUsersMemoryRepo() *goUsersMemoryRepo {
	return &goUsersMemoryRepo{
		users:     make(map[uuid.UUID]*types.AuthUser),
		lastLogin: make(map[uuid.UUID]time.Time),
	}
}

func (r *goUsersMemoryRepo) Reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users = make(map[uuid.UUID]*types.AuthUser)
	r.lastLogin = make(map[uuid.UUID]time.Time)
}

func (r *goUsersMemoryRepo) LastLogin(id uuid.UUID) time.Time {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.lastLogin[id]
}

func (r *goUsersMemoryRepo) SetLastLogin(id uuid.UUID, ts time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if ts.IsZero() {
		delete(r.lastLogin, id)
		return nil
	}
	r.lastLogin[id] = ts
	return nil
}

func (r *goUsersMemoryRepo) GetByID(_ context.Context, id uuid.UUID) (*types.AuthUser, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	user, ok := r.users[id]
	if !ok {
		return nil, fmt.Errorf("user not found")
	}
	return cloneAuthUser(user), nil
}

func (r *goUsersMemoryRepo) GetByIdentifier(_ context.Context, identifier string) (*types.AuthUser, error) {
	id := strings.TrimSpace(strings.ToLower(identifier))
	r.mu.RLock()
	defer r.mu.RUnlock()

	if parsed, err := uuid.Parse(id); err == nil {
		if user, ok := r.users[parsed]; ok {
			return cloneAuthUser(user), nil
		}
	}

	for _, user := range r.users {
		if strings.EqualFold(user.Email, id) || strings.EqualFold(user.Username, id) {
			return cloneAuthUser(user), nil
		}
	}
	return nil, fmt.Errorf("user not found")
}

func (r *goUsersMemoryRepo) Create(_ context.Context, input *types.AuthUser) (*types.AuthUser, error) {
	if input == nil {
		return nil, fmt.Errorf("user is nil")
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	user := cloneAuthUser(input)
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.CreatedAt == nil {
		now := time.Now().UTC()
		user.CreatedAt = &now
	}
	if user.Status == "" {
		user.Status = types.LifecycleStateActive
	}

	r.users[user.ID] = user
	return cloneAuthUser(user), nil
}

func (r *goUsersMemoryRepo) Update(_ context.Context, input *types.AuthUser) (*types.AuthUser, error) {
	if input == nil || input.ID == uuid.Nil {
		return nil, fmt.Errorf("user is nil")
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.users[input.ID]
	if !ok {
		return nil, fmt.Errorf("user not found")
	}
	if input.CreatedAt == nil {
		input.CreatedAt = existing.CreatedAt
	}
	now := time.Now().UTC()
	input.UpdatedAt = &now
	r.users[input.ID] = cloneAuthUser(input)
	return cloneAuthUser(input), nil
}

func (r *goUsersMemoryRepo) UpdateStatus(ctx context.Context, actor types.ActorRef, id uuid.UUID, next types.LifecycleState, opts ...types.TransitionOption) (*types.AuthUser, error) {
	user, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	_ = actor
	_ = opts
	user.Status = next
	return r.Update(ctx, user)
}

func (r *goUsersMemoryRepo) AllowedTransitions(context.Context, uuid.UUID) ([]types.LifecycleTransition, error) {
	return []types.LifecycleTransition{
		{From: types.LifecycleStatePending, To: types.LifecycleStateActive},
		{From: types.LifecycleStateActive, To: types.LifecycleStateSuspended},
		{From: types.LifecycleStateSuspended, To: types.LifecycleStateActive},
		{From: types.LifecycleStateActive, To: types.LifecycleStateDisabled},
	}, nil
}

func (r *goUsersMemoryRepo) ResetPassword(context.Context, uuid.UUID, string) error {
	return nil
}

func (r *goUsersMemoryRepo) ListUsers(_ context.Context, filter types.UserInventoryFilter) (types.UserInventoryPage, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	users := make([]types.AuthUser, 0, len(r.users))
	keyword := strings.ToLower(strings.TrimSpace(filter.Keyword))
	role := strings.ToLower(strings.TrimSpace(filter.Role))

	statusMap := make(map[types.LifecycleState]struct{})
	for _, status := range filter.Statuses {
		statusMap[status] = struct{}{}
	}

	for _, user := range r.users {
		if len(statusMap) > 0 {
			if _, ok := statusMap[user.Status]; !ok {
				continue
			}
		}
		if role != "" && !strings.EqualFold(user.Role, role) {
			continue
		}
		if len(filter.UserIDs) > 0 && !containsUUID(filter.UserIDs, user.ID) {
			continue
		}
		if keyword != "" &&
			!strings.Contains(strings.ToLower(user.Email), keyword) &&
			!strings.Contains(strings.ToLower(user.Username), keyword) &&
			!strings.Contains(strings.ToLower(user.Role), keyword) {
			continue
		}
		users = append(users, *user)
	}

	sort.Slice(users, func(i, j int) bool {
		return compareTimes(users[i].CreatedAt, users[j].CreatedAt)
	})

	limit := filter.Pagination.Limit
	if limit <= 0 {
		limit = defaultUserPageSize
	}
	offset := filter.Pagination.Offset
	if offset < 0 {
		offset = 0
	}
	if offset > len(users) {
		offset = len(users)
	}
	end := offset + limit
	if end > len(users) {
		end = len(users)
	}

	return types.UserInventoryPage{
		Users:      append([]types.AuthUser{}, users[offset:end]...),
		Total:      len(users),
		NextOffset: end,
		HasMore:    end < len(users),
	}, nil
}

func (r *goUsersMemoryRepo) Delete(_ context.Context, id uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.users[id]; !ok {
		return fmt.Errorf("user not found")
	}
	delete(r.users, id)
	delete(r.lastLogin, id)
	return nil
}

func containsUUID(list []uuid.UUID, target uuid.UUID) bool {
	for _, id := range list {
		if id == target {
			return true
		}
	}
	return false
}

func compareTimes(a, b *time.Time) bool {
	switch {
	case a == nil && b == nil:
		return false
	case a == nil:
		return false
	case b == nil:
		return true
	default:
		return a.Before(*b)
	}
}

func cloneAuthUser(user *types.AuthUser) *types.AuthUser {
	if user == nil {
		return nil
	}
	copy := *user
	if user.Metadata != nil {
		copy.Metadata = map[string]any{}
		for k, v := range user.Metadata {
			copy.Metadata[k] = v
		}
	}
	return &copy
}

// extractListOptionsFromCriteria extracts query parameters from SelectCriteria for the in-memory store.
// It creates a mock bun query and applies criteria to extract filter parameters.
func extractListOptionsFromCriteria(ctx context.Context, criteria []repository.SelectCriteria) admin.ListOptions {
	opts := admin.ListOptions{
		Filters: make(map[string]any),
	}

	if len(criteria) == 0 {
		return opts
	}

	db := newMockBunDB()
	if db == nil {
		return opts
	}
	defer db.DB.Close()

	mockQuery := db.NewSelect().Model((*User)(nil))

	// Apply all criteria to the mock query
	for _, criterion := range criteria {
		if criterion != nil {
			mockQuery = criterion(mockQuery)
		}
	}

	// Extract query string to parse parameters
	queryStr := mockQuery.String()

	// Debug: log the generated query
	fmt.Printf("[DEBUG] Generated query: %s\n", queryStr)

	// Parse LIMIT and OFFSET
	if idx := strings.Index(queryStr, "LIMIT "); idx >= 0 {
		limitStr := queryStr[idx+6:]
		// Extract just the number part
		var limit int
		if _, err := fmt.Sscanf(limitStr, "%d", &limit); err == nil && limit > 0 {
			opts.PerPage = limit
		}
	}
	if idx := strings.Index(queryStr, "OFFSET "); idx >= 0 {
		offsetStr := queryStr[idx+7:]
		var offset int
		if _, err := fmt.Sscanf(offsetStr, "%d", &offset); err == nil && opts.PerPage > 0 {
			opts.Page = (offset / opts.PerPage) + 1
		}
	}

	// Parse WHERE conditions for filters
	if strings.Contains(queryStr, "WHERE") {
		// Extract role filter
		if strings.Contains(queryStr, `"role"`) {
			roleMatch := extractWhereValue(queryStr, "role")
			if roleMatch != "" {
				opts.Filters["role"] = roleMatch
			}
		}
		// Extract status filter
		if strings.Contains(queryStr, `"status"`) {
			statusMatch := extractWhereValue(queryStr, "status")
			if statusMatch != "" {
				opts.Filters["status"] = statusMatch
			}
		}
		// Extract search (ILIKE patterns)
		if strings.Contains(queryStr, "ILIKE") {
			searchTerm := extractILikeValue(queryStr)
			if searchTerm != "" {
				opts.Filters["_search"] = searchTerm
			}
		}
	}

	return opts
}

// newMockBunDB creates a minimal in-memory bun DB for query building/parsing.
// It never hits disk and is only used to stringify queries from criteria.
func newMockBunDB() *bun.DB {
	sqlDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		return nil
	}
	return bun.NewDB(sqlDB, sqlitedialect.New())
}

func extractWhereValue(query, column string) string {
	// Try with quotes first: "column" = 'value'
	if idx := strings.Index(query, `"`+column+`" = '`); idx >= 0 {
		valueStart := idx + len(column) + 6 // length of "column" = '
		if endIdx := strings.Index(query[valueStart:], "'"); endIdx >= 0 {
			return query[valueStart : valueStart+endIdx]
		}
	}
	// Try without quotes: column = 'value'
	if idx := strings.Index(query, column+` = '`); idx >= 0 {
		valueStart := idx + len(column) + 4 // length of column = '
		if endIdx := strings.Index(query[valueStart:], "'"); endIdx >= 0 {
			return query[valueStart : valueStart+endIdx]
		}
	}
	return ""
}

func extractILikeValue(query string) string {
	// Extract value from ILIKE '%value%'
	if idx := strings.Index(query, "ILIKE '%"); idx >= 0 {
		start := idx + 8
		if endIdx := strings.Index(query[start:], "%'"); endIdx >= 0 {
			return query[start : start+endIdx]
		}
	}
	return ""
}

// userRepositoryAdapter bridges the go-users store to the go-crud controller.
type userRepositoryAdapter struct {
	store         *UserStore
	scopeDefaults repository.ScopeDefaults
}

var _ repository.Repository[*User] = (*userRepositoryAdapter)(nil)

func (r *userRepositoryAdapter) Raw(context.Context, string, ...any) ([]*User, error) {
	return nil, r.unsupported("Raw")
}

func (r *userRepositoryAdapter) RawTx(context.Context, bun.IDB, string, ...any) ([]*User, error) {
	return nil, r.unsupported("RawTx")
}

func (r *userRepositoryAdapter) Get(ctx context.Context, _ ...repository.SelectCriteria) (*User, error) {
	users, _, err := r.List(ctx)
	if err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, fmt.Errorf("user not found")
	}
	return users[0], nil
}

func (r *userRepositoryAdapter) GetTx(ctx context.Context, _ bun.IDB, criteria ...repository.SelectCriteria) (*User, error) {
	return r.Get(ctx, criteria...)
}

func (r *userRepositoryAdapter) GetByID(ctx context.Context, id string, _ ...repository.SelectCriteria) (*User, error) {
	data, err := r.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return mapToUserRecord(data), nil
}

func (r *userRepositoryAdapter) GetByIDTx(ctx context.Context, _ bun.IDB, id string, criteria ...repository.SelectCriteria) (*User, error) {
	return r.GetByID(ctx, id, criteria...)
}

func (r *userRepositoryAdapter) List(ctx context.Context, criteria ...repository.SelectCriteria) ([]*User, int, error) {
	fmt.Printf("[DEBUG] List called with %d criteria\n", len(criteria))
	opts := extractListOptionsFromCriteria(ctx, criteria)
	fmt.Printf("[DEBUG] Extracted options: PerPage=%d, Page=%d, Filters=%+v\n", opts.PerPage, opts.Page, opts.Filters)
	records, total, err := r.store.List(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	fmt.Printf("[DEBUG] Store returned %d records, total=%d\n", len(records), total)
	results := make([]*User, 0, len(records))
	for _, record := range records {
		results = append(results, mapToUserRecord(record))
	}
	return results, total, nil
}

func (r *userRepositoryAdapter) ListTx(ctx context.Context, _ bun.IDB, criteria ...repository.SelectCriteria) ([]*User, int, error) {
	return r.List(ctx, criteria...)
}

func (r *userRepositoryAdapter) Count(ctx context.Context, _ ...repository.SelectCriteria) (int, error) {
	_, total, err := r.List(ctx)
	return total, err
}

func (r *userRepositoryAdapter) CountTx(ctx context.Context, _ bun.IDB, criteria ...repository.SelectCriteria) (int, error) {
	return r.Count(ctx, criteria...)
}

func (r *userRepositoryAdapter) Create(ctx context.Context, record *User, _ ...repository.InsertCriteria) (*User, error) {
	if record == nil {
		return nil, fmt.Errorf("user is nil")
	}
	created, err := r.store.Create(ctx, userRecordToMap(record))
	if err != nil {
		return nil, err
	}
	return mapToUserRecord(created), nil
}

func (r *userRepositoryAdapter) CreateTx(ctx context.Context, _ bun.IDB, record *User, criteria ...repository.InsertCriteria) (*User, error) {
	return r.Create(ctx, record, criteria...)
}

func (r *userRepositoryAdapter) CreateMany(ctx context.Context, records []*User, _ ...repository.InsertCriteria) ([]*User, error) {
	out := make([]*User, 0, len(records))
	for _, rec := range records {
		created, err := r.Create(ctx, rec)
		if err != nil {
			return nil, err
		}
		out = append(out, created)
	}
	return out, nil
}

func (r *userRepositoryAdapter) CreateManyTx(ctx context.Context, _ bun.IDB, records []*User, criteria ...repository.InsertCriteria) ([]*User, error) {
	return r.CreateMany(ctx, records, criteria...)
}

func (r *userRepositoryAdapter) GetOrCreate(ctx context.Context, record *User) (*User, error) {
	if record == nil {
		return nil, fmt.Errorf("user is nil")
	}
	if record.ID != uuid.Nil {
		if existing, err := r.GetByID(ctx, record.ID.String()); err == nil {
			return existing, nil
		}
	}
	return r.Create(ctx, record)
}

func (r *userRepositoryAdapter) GetOrCreateTx(ctx context.Context, tx bun.IDB, record *User) (*User, error) {
	return r.GetOrCreate(ctx, record)
}

func (r *userRepositoryAdapter) GetByIdentifier(ctx context.Context, identifier string, _ ...repository.SelectCriteria) (*User, error) {
	records, _, err := r.store.List(ctx, admin.ListOptions{
		Filters: map[string]any{"_search": identifier},
		PerPage: 1,
	})
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("user not found")
	}
	return mapToUserRecord(records[0]), nil
}

func (r *userRepositoryAdapter) GetByIdentifierTx(ctx context.Context, _ bun.IDB, identifier string, criteria ...repository.SelectCriteria) (*User, error) {
	return r.GetByIdentifier(ctx, identifier, criteria...)
}

func (r *userRepositoryAdapter) Update(ctx context.Context, record *User, _ ...repository.UpdateCriteria) (*User, error) {
	if record == nil {
		return nil, fmt.Errorf("user is nil")
	}
	updated, err := r.store.Update(ctx, record.ID.String(), userRecordToMap(record))
	if err != nil {
		return nil, err
	}
	return mapToUserRecord(updated), nil
}

func (r *userRepositoryAdapter) UpdateTx(ctx context.Context, _ bun.IDB, record *User, criteria ...repository.UpdateCriteria) (*User, error) {
	return r.Update(ctx, record, criteria...)
}

func (r *userRepositoryAdapter) UpdateMany(ctx context.Context, records []*User, _ ...repository.UpdateCriteria) ([]*User, error) {
	out := make([]*User, 0, len(records))
	for _, rec := range records {
		updated, err := r.Update(ctx, rec)
		if err != nil {
			return nil, err
		}
		out = append(out, updated)
	}
	return out, nil
}

func (r *userRepositoryAdapter) UpdateManyTx(ctx context.Context, _ bun.IDB, records []*User, criteria ...repository.UpdateCriteria) ([]*User, error) {
	return r.UpdateMany(ctx, records, criteria...)
}

func (r *userRepositoryAdapter) Upsert(ctx context.Context, record *User, criteria ...repository.UpdateCriteria) (*User, error) {
	if record == nil {
		return nil, fmt.Errorf("user is nil")
	}
	if record.ID != uuid.Nil {
		if _, err := r.store.Get(ctx, record.ID.String()); err == nil {
			return r.Update(ctx, record, criteria...)
		}
	}
	return r.Create(ctx, record)
}

func (r *userRepositoryAdapter) UpsertTx(ctx context.Context, _ bun.IDB, record *User, criteria ...repository.UpdateCriteria) (*User, error) {
	return r.Upsert(ctx, record, criteria...)
}

func (r *userRepositoryAdapter) UpsertMany(ctx context.Context, records []*User, criteria ...repository.UpdateCriteria) ([]*User, error) {
	out := make([]*User, 0, len(records))
	for _, rec := range records {
		saved, err := r.Upsert(ctx, rec, criteria...)
		if err != nil {
			return nil, err
		}
		out = append(out, saved)
	}
	return out, nil
}

func (r *userRepositoryAdapter) UpsertManyTx(ctx context.Context, _ bun.IDB, records []*User, criteria ...repository.UpdateCriteria) ([]*User, error) {
	return r.UpsertMany(ctx, records, criteria...)
}

func (r *userRepositoryAdapter) Delete(ctx context.Context, record *User) error {
	if record == nil {
		return fmt.Errorf("user is nil")
	}
	return r.store.Delete(ctx, record.ID.String())
}

func (r *userRepositoryAdapter) DeleteTx(ctx context.Context, _ bun.IDB, record *User) error {
	return r.Delete(ctx, record)
}

func (r *userRepositoryAdapter) DeleteMany(context.Context, ...repository.DeleteCriteria) error {
	return r.unsupported("DeleteMany")
}

func (r *userRepositoryAdapter) DeleteManyTx(context.Context, bun.IDB, ...repository.DeleteCriteria) error {
	return r.unsupported("DeleteManyTx")
}

func (r *userRepositoryAdapter) DeleteWhere(context.Context, ...repository.DeleteCriteria) error {
	return r.unsupported("DeleteWhere")
}

func (r *userRepositoryAdapter) DeleteWhereTx(context.Context, bun.IDB, ...repository.DeleteCriteria) error {
	return r.unsupported("DeleteWhereTx")
}

func (r *userRepositoryAdapter) ForceDelete(ctx context.Context, record *User) error {
	return r.Delete(ctx, record)
}

func (r *userRepositoryAdapter) ForceDeleteTx(ctx context.Context, tx bun.IDB, record *User) error {
	return r.ForceDelete(ctx, record)
}

func (r *userRepositoryAdapter) Handlers() repository.ModelHandlers[*User] {
	return repository.ModelHandlers[*User]{
		NewRecord: func() *User { return &User{} },
		GetID: func(u *User) uuid.UUID {
			if u == nil {
				return uuid.Nil
			}
			return u.ID
		},
		SetID: func(u *User, id uuid.UUID) {
			if u != nil {
				u.ID = id
			}
		},
		GetIdentifier: func() string {
			return "Email"
		},
		GetIdentifierValue: func(u *User) string {
			if u == nil {
				return ""
			}
			return u.Email
		},
		ResolveIdentifier: func(identifier string) []repository.IdentifierOption {
			trimmed := strings.TrimSpace(identifier)
			if trimmed == "" {
				return nil
			}
			return []repository.IdentifierOption{
				{Column: "Email", Value: trimmed},
				{Column: "Username", Value: trimmed},
				{Column: "ID", Value: trimmed},
			}
		},
	}
}

func (r *userRepositoryAdapter) RegisterScope(name string, scope repository.ScopeDefinition) {
	_ = name
	_ = scope
}

func (r *userRepositoryAdapter) SetScopeDefaults(defaults repository.ScopeDefaults) error {
	r.scopeDefaults = defaults
	return nil
}

func (r *userRepositoryAdapter) GetScopeDefaults() repository.ScopeDefaults {
	return r.scopeDefaults
}

func (r *userRepositoryAdapter) unsupported(op string) error {
	return errors.New("user repository adapter: " + op + " not supported in example")
}

func userRecordToMap(u *User) map[string]any {
	if u == nil {
		return nil
	}
	record := map[string]any{
		"id":       u.ID.String(),
		"username": u.Username,
		"email":    u.Email,
		"role":     u.Role,
		"status":   u.Status,
	}
	if !u.CreatedAt.IsZero() {
		record["created_at"] = u.CreatedAt.Format(time.RFC3339)
	}
	if !u.LastLogin.IsZero() {
		record["last_login"] = u.LastLogin.Format(time.RFC3339)
	}
	return record
}

func mapToUserRecord(record map[string]any) *User {
	if record == nil {
		return &User{}
	}
	user := &User{
		ID:       parseUUID(asString(record["id"], "")),
		Username: asString(record["username"], ""),
		Email:    asString(record["email"], ""),
		Role:     asString(record["role"], "viewer"),
		Status:   asString(record["status"], "active"),
	}
	if created := parseTimeValue(record["created_at"]); !created.IsZero() {
		user.CreatedAt = created
	}
	if last := parseTimeValue(record["last_login"]); !last.IsZero() {
		user.LastLogin = last
	}
	return user
}
