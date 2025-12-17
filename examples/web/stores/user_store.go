package stores

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/admin"
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

// userFilterExtensions holds advanced search filters not in the base types.UserInventoryFilter
type userFilterExtensions struct {
	UsernameFilters []string // Support multiple values for OR logic
	EmailFilters    []string
	RoleFilters     []string
}

type contextKey string

const userFilterExtensionsKey contextKey = "user_filter_extensions"

// applyExtendedFilters applies in-memory filtering for role, username, and email filters with OR logic
func applyExtendedFilters(users []types.AuthUser, ext userFilterExtensions) []types.AuthUser {
	if len(ext.RoleFilters) == 0 && len(ext.UsernameFilters) == 0 && len(ext.EmailFilters) == 0 {
		return users
	}

	filtered := make([]types.AuthUser, 0, len(users))
	for _, user := range users {
		// Apply role filter (OR logic within the same filter)
		if len(ext.RoleFilters) > 0 {
			lowerRole := strings.ToLower(user.Role)
			match := false
			for _, filter := range ext.RoleFilters {
				if strings.EqualFold(lowerRole, filter) || strings.Contains(lowerRole, strings.ToLower(filter)) {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}

		// Apply username filter (OR logic)
		if len(ext.UsernameFilters) > 0 {
			lowerUsername := strings.ToLower(user.Username)
			match := false
			for _, filter := range ext.UsernameFilters {
				if strings.Contains(lowerUsername, strings.ToLower(filter)) {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}

		// Apply email filter (OR logic)
		if len(ext.EmailFilters) > 0 {
			lowerEmail := strings.ToLower(user.Email)
			match := false
			for _, filter := range ext.EmailFilters {
				if strings.Contains(lowerEmail, strings.ToLower(filter)) {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}

		filtered = append(filtered, user)
	}
	return filtered
}

var (
	allowedUserRoles = map[string]struct{}{
		"admin":  {},
		"editor": {},
		"viewer": {},
		"member": {},
		"guest":  {},
		"owner":  {},
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
	Label         string    `json:"label" bun:"-"`
	Role          string    `json:"role" bun:"role"`
	Status        string    `json:"status" bun:"status"`
	CreatedAt     time.Time `json:"created_at" bun:"created_at"`
	LastLogin     time.Time `json:"last_login" bun:"last_login"`
}

// goUsersRepo captures the methods used by the store and go-users service.
type goUsersRepo interface {
	types.AuthRepository
	types.UserInventoryRepository
	Delete(ctx context.Context, id uuid.UUID) error
	LastLogin(id uuid.UUID) time.Time
	SetLastLogin(id uuid.UUID, ts time.Time) error
	Reset()
}

// UserStore manages user data through a go-users-compatible repository.
type UserStore struct {
	repo     goUsersRepo
	activity admin.ActivitySink
	crudRepo repository.Repository[*User]
	users    auth.Users
}

// NewUserStore provisions a DB-backed go-users repository for the example.
func NewUserStore(deps UserDependencies) (*UserStore, error) {
	if deps.AuthRepo == nil || deps.InventoryRepo == nil || deps.RepoManager == nil {
		return nil, fmt.Errorf("user dependencies incomplete")
	}
	repo := &goUsersDBRepo{
		authRepo:      deps.AuthRepo,
		inventoryRepo: deps.InventoryRepo,
		usersRepo:     deps.RepoManager.Users(),
	}
	store := &UserStore{repo: repo, users: deps.RepoManager.Users()}
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
		existing, _ := s.repo.GetByIdentifier(context.Background(), sample.Username)
		if existing != nil && existing.ID != uuid.Nil {
			continue
		}
		user := &types.AuthUser{
			ID:        uuid.New(),
			Username:  sample.Username,
			Email:     sample.Email,
			Role:      normalizeRoleValue(sample.Role),
			Status:    sample.Status,
			CreatedAt: ptrTime(sample.CreatedAt),
		}
		created, err := s.repo.Create(context.Background(), user)
		if err != nil {
			continue
		}
		if !sample.LastLogin.IsZero() {
			_ = s.repo.SetLastLogin(created.ID, sample.LastLogin)
		}
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

func normalizeRoleValue(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "editor":
		return "member"
	case "viewer":
		return "guest"
	default:
		return strings.ToLower(strings.TrimSpace(role))
	}
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
	if raw, ok := opts.Filters["id"].(string); ok {
		id := strings.TrimSpace(raw)
		if id != "" {
			user, err := s.Get(ctx, id)
			if err != nil {
				return nil, 0, err
			}
			return []map[string]any{user}, 1, nil
		}
	}

	ctx, filter := userInventoryFilterFromOptions(ctx, opts)
	page, err := s.repo.ListUsers(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	// Apply post-filtering for advanced filters stored in context
	filteredUsers := page.Users
	if ext, ok := ctx.Value(userFilterExtensionsKey).(userFilterExtensions); ok {
		filteredUsers = applyExtendedFilters(page.Users, ext)
	}

	results := make([]map[string]any, 0, len(filteredUsers))
	for _, user := range filteredUsers {
		results = append(results, userToMap(&user, lastLoginFromUser(&user, s.repo)))
	}

	// Apply sorting if specified
	if opts.SortBy != "" {
		sortUserResults(results, opts.SortBy, opts.SortDesc)
	}

	return results, len(results), nil
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
	return userToMap(user, lastLoginFromUser(user, s.repo)), nil
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
	if hash := resolvePasswordHash(record, created.Username); hash != "" {
		_ = s.repo.ResetPassword(ctx, created.ID, hash)
	}
	if !lastLogin.IsZero() {
		_ = s.repo.SetLastLogin(created.ID, lastLogin)
	}

	result := userToMap(created, lastLoginFromUser(created, s.repo))
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
	if hash := resolvePasswordHash(record, saved.Username); hash != "" {
		_ = s.repo.ResetPassword(ctx, saved.ID, hash)
	}

	result := userToMap(saved, lastLoginFromUser(saved, s.repo))
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
		Actor:   resolveActivityActor(ctx),
		Action:  verb,
		Object:  object,
		Channel: "users",
		Metadata: map[string]any{
			"email":    user.Email,
			"username": user.Username,
			"role":     user.Role,
			"status":   statusToOutput(user.Status),
		},
	}
	_ = s.activity.Record(ctx, entry)
}

// sortUserResults sorts user results in-place by the specified field and direction
func sortUserResults(results []map[string]any, sortBy string, sortDesc bool) {
	if len(results) == 0 {
		return
	}

	sort.SliceStable(results, func(i, j int) bool {
		vi := results[i][sortBy]
		vj := results[j][sortBy]

		// Handle nil values
		if vi == nil && vj == nil {
			return false
		}
		if vi == nil {
			return !sortDesc
		}
		if vj == nil {
			return sortDesc
		}

		// Compare based on type
		switch v1 := vi.(type) {
		case string:
			if v2, ok := vj.(string); ok {
				if sortDesc {
					return v1 > v2
				}
				return v1 < v2
			}
		case int:
			if v2, ok := vj.(int); ok {
				if sortDesc {
					return v1 > v2
				}
				return v1 < v2
			}
		case float64:
			if v2, ok := vj.(float64); ok {
				if sortDesc {
					return v1 > v2
				}
				return v1 < v2
			}
		case time.Time:
			if v2, ok := vj.(time.Time); ok {
				if sortDesc {
					return v1.After(v2)
				}
				return v1.Before(v2)
			}
		}

		// Default: convert to string and compare
		s1 := fmt.Sprintf("%v", vi)
		s2 := fmt.Sprintf("%v", vj)
		if sortDesc {
			return s1 > s2
		}
		return s1 < s2
	})
}

func userInventoryFilterFromOptions(ctx context.Context, opts admin.ListOptions) (context.Context, types.UserInventoryFilter) {
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
	role = normalizeRoleValue(role)

	// Extract field-specific ILIKE filters for advanced search
	// Support comma-separated values for OR logic (e.g., "editor,admin")
	var usernameFilters []string
	if u, ok := opts.Filters["username__ilike"].(string); ok {
		u = strings.TrimSpace(u)
		if u != "" {
			usernameFilters = strings.Split(u, ",")
			for i := range usernameFilters {
				usernameFilters[i] = strings.TrimSpace(usernameFilters[i])
			}
		}
	}

	var emailFilters []string
	if e, ok := opts.Filters["email__ilike"].(string); ok {
		e = strings.TrimSpace(e)
		if e != "" {
			emailFilters = strings.Split(e, ",")
			for i := range emailFilters {
				emailFilters[i] = strings.TrimSpace(emailFilters[i])
			}
		}
	}

	var roleFilters []string
	// Support both __ilike and __in for role filters
	if r, ok := opts.Filters["role__ilike"].(string); ok {
		r = strings.TrimSpace(r)
		if r != "" {
			roleFilters = strings.Split(r, ",")
			for i := range roleFilters {
				roleFilters[i] = strings.TrimSpace(roleFilters[i])
			}
		}
	}
	// Also check for __in (exact match OR)
	if r, ok := opts.Filters["role__in"].(string); ok {
		r = strings.TrimSpace(r)
		if r != "" {
			values := strings.Split(r, ",")
			for _, v := range values {
				v = strings.TrimSpace(v)
				if v != "" {
					roleFilters = append(roleFilters, v)
				}
			}
		}
	}

	statuses := parseStatusFilter(opts.Filters["status"])
	// Also check for status__in
	if s, ok := opts.Filters["status__in"].(string); ok && s != "" {
		values := strings.Split(s, ",")
		for _, v := range values {
			v = strings.TrimSpace(v)
			if v != "" {
				state := statusFromInput(v)
				// Only add if not already in list
				found := false
				for _, existing := range statuses {
					if existing == state {
						found = true
						break
					}
				}
				if !found {
					statuses = append(statuses, state)
				}
			}
		}
	}
	limit := opts.PerPage
	if limit <= 0 {
		limit = defaultUserPageSize
	}
	page := opts.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	// Store field-specific filters in context
	if len(usernameFilters) > 0 || len(emailFilters) > 0 || len(roleFilters) > 0 {
		extensions := userFilterExtensions{
			UsernameFilters: usernameFilters,
			EmailFilters:    emailFilters,
			RoleFilters:     roleFilters,
		}
		ctx = context.WithValue(ctx, userFilterExtensionsKey, extensions)
	}

	return ctx, types.UserInventoryFilter{
		Actor:    helpers.ActorRefFromContext(ctx),
		Scope:    helpers.ScopeFromContext(ctx),
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

	var (
		phoneNumber    string
		profilePicture string
		emailVerified  bool
	)
	if raw, ok := user.Raw.(*auth.User); ok && raw != nil {
		phoneNumber = raw.Phone
		profilePicture = raw.ProfilePicture
		emailVerified = raw.EmailValidated
	}

	return map[string]any{
		"id":                user.ID.String(),
		"first_name":        user.FirstName,
		"last_name":         user.LastName,
		"username":          user.Username,
		"email":             user.Email,
		"phone_number":      phoneNumber,
		"profile_picture":   profilePicture,
		"is_email_verified": emailVerified,
		"role":              user.Role,
		"status":            statusToOutput(user.Status),
		"metadata":          user.Metadata,
		"created_at":        created,
		"last_login":        last,
	}
}

func mapToAuthUser(record map[string]any) (*types.AuthUser, time.Time) {
	user := &types.AuthUser{
		ID:       parseUUID(asString(record["id"], "")),
		Username: asString(record["username"], ""),
		Email:    asString(record["email"], ""),
		Role:     normalizeRoleValue(asString(record["role"], "viewer")),
		Status:   statusFromInput(asString(record["status"], "active")),
		FirstName: func() string {
			first, _ := trimmedField(record, "first_name")
			return first
		}(),
		LastName: func() string {
			last, _ := trimmedField(record, "last_name")
			return last
		}(),
	}
	if created := parseTimeValue(record["created_at"]); !created.IsZero() {
		user.CreatedAt = ptrTime(created)
	}
	if meta, ok := parseMetadataValue(record["metadata"]); ok {
		user.Metadata = meta
	}

	raw := &auth.User{}
	if phone, ok := trimmedField(record, "phone_number"); ok {
		raw.Phone = phone
	}
	if picture, ok := trimmedField(record, "profile_picture"); ok {
		raw.ProfilePicture = picture
	}
	if verified, ok := parseBoolValue(record["is_email_verified"]); ok {
		raw.EmailValidated = verified
	}
	if user.Metadata != nil {
		raw.Metadata = user.Metadata
	}
	user.Raw = raw

	return user, extractLastLogin(record)
}

func applyUserPatch(existing *types.AuthUser, record map[string]any) *types.AuthUser {
	clone := cloneAuthUser(existing)

	if first, ok := trimmedField(record, "first_name"); ok {
		clone.FirstName = first
	}
	if last, ok := trimmedField(record, "last_name"); ok {
		clone.LastName = last
	}
	if username := asString(record["username"], ""); username != "" {
		clone.Username = username
	}
	if email := asString(record["email"], ""); email != "" {
		clone.Email = email
	}
	if role := asString(record["role"], ""); role != "" {
		clone.Role = normalizeRoleValue(role)
	}
	if status := asString(record["status"], ""); status != "" {
		clone.Status = statusFromInput(status)
	}
	if created := parseTimeValue(record["created_at"]); !created.IsZero() {
		clone.CreatedAt = ptrTime(created)
	}
	if meta, ok := parseMetadataValue(record["metadata"]); ok {
		clone.Metadata = meta
	}
	raw, _ := clone.Raw.(*auth.User)
	if raw == nil {
		raw = &auth.User{}
		clone.Raw = raw
	}
	if phone, ok := trimmedField(record, "phone_number"); ok {
		raw.Phone = phone
	}
	if picture, ok := trimmedField(record, "profile_picture"); ok {
		raw.ProfilePicture = picture
	}
	if verified, ok := parseBoolValue(record["is_email_verified"]); ok {
		raw.EmailValidated = verified
	}
	if clone.Metadata != nil {
		raw.Metadata = clone.Metadata
	}
	return clone
}

func resolvePasswordHash(record map[string]any, username string) string {
	password := strings.TrimSpace(asString(record["password"], ""))
	if password != "" {
		if hash, err := auth.HashPassword(password); err == nil {
			return hash
		}
		return ""
	}

	username = strings.TrimSpace(username)
	if username == "" {
		return ""
	}
	if hash, err := auth.HashPassword(fmt.Sprintf("%s.pwd", username)); err == nil {
		return hash
	}
	return ""
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
	case types.LifecycleStateSuspended:
		return "suspended"
	case types.LifecycleStateDisabled:
		return "disabled"
	case types.LifecycleStateArchived:
		return "archived"
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

func parseBoolValue(val any) (bool, bool) {
	switch v := val.(type) {
	case bool:
		return v, true
	case string:
		trimmed := strings.ToLower(strings.TrimSpace(v))
		if trimmed == "" {
			return false, true
		}
		switch trimmed {
		case "1", "true", "yes", "on":
			return true, true
		case "0", "false", "no", "off":
			return false, true
		default:
			return false, false
		}
	default:
		return false, false
	}
}

func parseMetadataValue(val any) (map[string]any, bool) {
	switch typed := val.(type) {
	case nil:
		return nil, false
	case map[string]any:
		return typed, true
	case string:
		trimmed := strings.TrimSpace(typed)
		if trimmed == "" {
			return map[string]any{}, true
		}
		var out map[string]any
		if err := json.Unmarshal([]byte(trimmed), &out); err != nil {
			return nil, false
		}
		if out == nil {
			out = map[string]any{}
		}
		return out, true
	default:
		data, err := json.Marshal(typed)
		if err != nil {
			return nil, false
		}
		var out map[string]any
		if err := json.Unmarshal(data, &out); err != nil {
			return nil, false
		}
		if out == nil {
			out = map[string]any{}
		}
		return out, true
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

// goUsersDBRepo implements go-users repositories backed by Bun/SQLite.
type goUsersDBRepo struct {
	authRepo      types.AuthRepository
	inventoryRepo types.UserInventoryRepository
	usersRepo     auth.Users
}

func (r *goUsersDBRepo) LastLogin(id uuid.UUID) time.Time {
	if r == nil || r.usersRepo == nil {
		return time.Time{}
	}
	user, err := r.usersRepo.GetByID(context.Background(), id.String())
	if err != nil || user == nil || user.LoggedInAt == nil {
		return time.Time{}
	}
	return *user.LoggedInAt
}

func (r *goUsersDBRepo) SetLastLogin(id uuid.UUID, ts time.Time) error {
	if r == nil || r.usersRepo == nil {
		return errors.New("users repo not configured")
	}
	user, err := r.usersRepo.GetByID(context.Background(), id.String())
	if err != nil {
		return err
	}
	user.LoggedInAt = &ts
	_, err = r.usersRepo.Update(context.Background(), user)
	return err
}

func (r *goUsersDBRepo) GetByID(ctx context.Context, id uuid.UUID) (*types.AuthUser, error) {
	if r == nil || r.authRepo == nil {
		return nil, fmt.Errorf("user repo not configured")
	}
	return r.authRepo.GetByID(ctx, id)
}

func (r *goUsersDBRepo) GetByIdentifier(ctx context.Context, identifier string) (*types.AuthUser, error) {
	if r == nil || r.authRepo == nil {
		return nil, fmt.Errorf("user repo not configured")
	}
	return r.authRepo.GetByIdentifier(ctx, identifier)
}

func (r *goUsersDBRepo) Create(ctx context.Context, input *types.AuthUser) (*types.AuthUser, error) {
	if r == nil || r.authRepo == nil {
		return nil, fmt.Errorf("user repo not configured")
	}
	return r.authRepo.Create(ctx, input)
}

func (r *goUsersDBRepo) Update(ctx context.Context, input *types.AuthUser) (*types.AuthUser, error) {
	if r == nil || r.authRepo == nil {
		return nil, fmt.Errorf("user repo not configured")
	}
	return r.authRepo.Update(ctx, input)
}

func (r *goUsersDBRepo) UpdateStatus(ctx context.Context, actor types.ActorRef, id uuid.UUID, next types.LifecycleState, opts ...types.TransitionOption) (*types.AuthUser, error) {
	if r == nil || r.authRepo == nil {
		return nil, fmt.Errorf("user repo not configured")
	}
	return r.authRepo.UpdateStatus(ctx, actor, id, next, opts...)
}

func (r *goUsersDBRepo) AllowedTransitions(ctx context.Context, id uuid.UUID) ([]types.LifecycleTransition, error) {
	if r == nil || r.authRepo == nil {
		return nil, fmt.Errorf("user repo not configured")
	}
	return r.authRepo.AllowedTransitions(ctx, id)
}

func (r *goUsersDBRepo) ResetPassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	if r == nil || r.authRepo == nil {
		return fmt.Errorf("user repo not configured")
	}
	return r.authRepo.ResetPassword(ctx, id, passwordHash)
}

func (r *goUsersDBRepo) ListUsers(ctx context.Context, filter types.UserInventoryFilter) (types.UserInventoryPage, error) {
	if r == nil || r.inventoryRepo == nil {
		return types.UserInventoryPage{}, fmt.Errorf("inventory repo not configured")
	}
	return r.inventoryRepo.ListUsers(ctx, filter)
}

func (r *goUsersDBRepo) Delete(ctx context.Context, id uuid.UUID) error {
	if r == nil || r.usersRepo == nil {
		return fmt.Errorf("user repo not configured")
	}
	user, err := r.usersRepo.GetByID(ctx, id.String())
	if err != nil {
		return err
	}
	return r.usersRepo.Delete(ctx, user)
}

func (r *goUsersDBRepo) Reset() {
	if r == nil || r.usersRepo == nil {
		return
	}
	users, _, err := r.usersRepo.List(context.Background())
	if err != nil {
		return
	}
	for _, user := range users {
		if user == nil {
			continue
		}
		_ = r.usersRepo.Delete(context.Background(), user)
	}
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

func lastLoginFromUser(user *types.AuthUser, repo goUsersRepo) time.Time {
	if user != nil && user.Raw != nil {
		if raw, ok := user.Raw.(*auth.User); ok && raw != nil && raw.LoggedInAt != nil {
			return *raw.LoggedInAt
		}
	}
	if repo != nil && user != nil {
		return repo.LastLogin(user.ID)
	}
	return time.Time{}
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

	// Parse ORDER BY for sorting (go-crud uses order criteria, but our in-memory store needs SortBy/SortDesc)
	if sortBy, sortDesc := extractOrderBy(queryStr); sortBy != "" {
		opts.SortBy = sortBy
		opts.SortDesc = sortDesc
	}

	// Parse WHERE conditions for filters
	if strings.Contains(queryStr, "WHERE") {
		// Extract id filter (exact match)
		if strings.Contains(queryStr, `"id" = `) {
			idMatch := extractWhereValue(queryStr, "id")
			if idMatch != "" {
				opts.Filters["id"] = idMatch
			}
		}

		// Extract role filter (exact match)
		if strings.Contains(queryStr, `"role" = `) {
			roleMatch := extractWhereValue(queryStr, "role")
			if roleMatch != "" {
				opts.Filters["role"] = roleMatch
			}
		}
		// Extract status filter (exact match)
		if strings.Contains(queryStr, `"status" = `) {
			statusMatch := extractWhereValue(queryStr, "status")
			if statusMatch != "" {
				opts.Filters["status"] = statusMatch
			}
		}

		// Extract ILIKE patterns - handle multiple fields and multiple values per field
		queryUpper := strings.ToUpper(queryStr)
		if strings.Contains(queryUpper, "ILIKE") {
			var (
				usernameTerms []string
				emailTerms    []string
				roleTerms     []string
			)

			// Check for username ILIKE (support multiple values)
			if strings.Contains(queryUpper, `USERNAME`) && strings.Contains(queryUpper, `ILIKE`) {
				usernameTerms = extractAllILikeValuesForField(queryStr, "username")
				fmt.Printf("[DEBUG] Extracted username ILIKE: %v\n", usernameTerms)
				if len(usernameTerms) > 0 {
					opts.Filters["username__ilike"] = strings.Join(usernameTerms, ",")
				}
			}
			// Check for email ILIKE (support multiple values)
			if strings.Contains(queryUpper, `EMAIL`) && strings.Contains(queryUpper, `ILIKE`) {
				emailTerms = extractAllILikeValuesForField(queryStr, "email")
				fmt.Printf("[DEBUG] Extracted email ILIKE: %v\n", emailTerms)
				if len(emailTerms) > 0 {
					opts.Filters["email__ilike"] = strings.Join(emailTerms, ",")
				}
			}
			// Check for role ILIKE (support multiple values)
			if strings.Contains(queryUpper, `ROLE`) && strings.Contains(queryUpper, `ILIKE`) {
				roleTerms = extractAllILikeValuesForField(queryStr, "role")
				fmt.Printf("[DEBUG] Extracted role ILIKE: %v\n", roleTerms)
				if len(roleTerms) > 0 {
					opts.Filters["role__ilike"] = strings.Join(roleTerms, ",")
				}
			}

			// Treat matching username/email ILIKE patterns as a single global search.
			// go-crud builds these as separate WHERE clauses, but for go-users inventory
			// the expected behavior is a keyword search across multiple fields.
			if len(usernameTerms) == 1 && len(emailTerms) == 1 && usernameTerms[0] != "" && usernameTerms[0] == emailTerms[0] {
				opts.Filters["_search"] = usernameTerms[0]
				delete(opts.Filters, "username__ilike")
				delete(opts.Filters, "email__ilike")
			}

			// Fallback: if only one ILIKE without field-specific matches, use as _search
			if len(opts.Filters) == 0 {
				searchTerm := extractILikeValue(queryStr)
				fmt.Printf("[DEBUG] Extracted generic ILIKE search term: '%s'\n", searchTerm)
				if searchTerm != "" {
					opts.Filters["_search"] = searchTerm
				}
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
	// Extract value from ILIKE '%value%' or ilike '%value%'
	queryUpper := strings.ToUpper(query)
	if idx := strings.Index(queryUpper, "ILIKE '%"); idx >= 0 {
		start := idx + 8
		if endIdx := strings.Index(query[start:], "%'"); endIdx >= 0 {
			return query[start : start+endIdx]
		}
	}
	return ""
}

func extractILikeValueForField(query, field string) string {
	// Extract value from pattern: field ilike 'value' or field ilike '%value%'
	queryUpper := strings.ToUpper(query)
	fieldUpper := strings.ToUpper(field)

	// Look for: field ILIKE 'value' or "field" ILIKE 'value'
	patterns := []string{
		fieldUpper + ` ILIKE '`,
		`"` + fieldUpper + `" ILIKE '`,
	}

	for _, pattern := range patterns {
		if idx := strings.Index(queryUpper, pattern); idx >= 0 {
			start := idx + len(pattern)
			// Find end quote
			if endIdx := strings.Index(query[start:], "'"); endIdx >= 0 {
				value := query[start : start+endIdx]
				// Remove % wildcards if present
				value = strings.TrimPrefix(value, "%")
				value = strings.TrimSuffix(value, "%")
				return value
			}
		}
	}

	return ""
}

// extractAllILikeValuesForField extracts ALL occurrences of a field ILIKE pattern
// to support OR logic (e.g., role ILIKE 'editor' AND role ILIKE 'admin')
func extractAllILikeValuesForField(query, field string) []string {
	queryUpper := strings.ToUpper(query)
	fieldUpper := strings.ToUpper(field)
	var values []string

	// Look for: field ILIKE 'value' or "field" ILIKE 'value'
	patterns := []string{
		fieldUpper + ` ILIKE '`,
		`"` + fieldUpper + `" ILIKE '`,
	}

	searchPos := 0
	for {
		foundAny := false
		minIdx := -1
		matchedPattern := ""

		// Find the earliest occurrence of any pattern
		for _, pattern := range patterns {
			if idx := strings.Index(queryUpper[searchPos:], pattern); idx >= 0 {
				absoluteIdx := searchPos + idx
				if minIdx == -1 || absoluteIdx < minIdx {
					minIdx = absoluteIdx
					matchedPattern = pattern
					foundAny = true
				}
			}
		}

		if !foundAny || minIdx == -1 {
			break
		}

		// Extract the value
		start := minIdx + len(matchedPattern)
		if endIdx := strings.Index(query[start:], "'"); endIdx >= 0 {
			value := query[start : start+endIdx]
			// Remove % wildcards if present
			value = strings.TrimPrefix(value, "%")
			value = strings.TrimSuffix(value, "%")
			if value != "" {
				values = append(values, value)
			}
			// Move search position past this match
			searchPos = start + endIdx + 1
		} else {
			break
		}
	}

	return values
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
	if user.Username != "" || user.Email != "" {
		switch {
		case user.Username != "" && user.Email != "":
			user.Label = user.Username + " <" + user.Email + ">"
		case user.Username != "":
			user.Label = user.Username
		default:
			user.Label = user.Email
		}
	}
	if created := parseTimeValue(record["created_at"]); !created.IsZero() {
		user.CreatedAt = created
	}
	if last := parseTimeValue(record["last_login"]); !last.IsZero() {
		user.LastLogin = last
	}
	return user
}
