package stores

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

// User model backed by bun/sqlite.
type User struct {
	bun.BaseModel `bun:"table:users"`
	ID            uuid.UUID `bun:"id,pk,notnull" json:"id"`
	Username      string    `bun:"username,notnull" json:"username"`
	Email         string    `bun:"email,notnull" json:"email"`
	Role          string    `bun:"role,notnull" json:"role"`
	Status        string    `bun:"status,notnull" json:"status"`
	CreatedAt     time.Time `bun:"created_at,notnull" json:"created_at"`
	LastLogin     time.Time `bun:"last_login,notnull" json:"last_login"`
}

// UserStore manages user data via go-crud repository.
type UserStore struct {
	repo repository.Repository[*User]
}

// NewUserStore creates a new user store with SQLite backend.
func NewUserStore() (*UserStore, error) {
	db, err := sql.Open("sqlite3", "file:admin-users.db?cache=shared&mode=memory")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	bundb := bun.NewDB(db, sqlitedialect.New())
	ctx := context.Background()
	if _, err := bundb.NewCreateTable().Model((*User)(nil)).IfNotExists().Exec(ctx); err != nil {
		return nil, fmt.Errorf("create users table: %w", err)
	}

	handlers := repository.ModelHandlers[*User]{
		NewRecord:          func() *User { return &User{} },
		GetID:              func(u *User) uuid.UUID { return u.ID },
		SetID:              func(u *User, id uuid.UUID) { u.ID = id },
		GetIdentifier:      func() string { return "Email" },
		GetIdentifierValue: func(u *User) string { return u.Email },
	}

	repo := repository.NewRepository(bundb, handlers)
	return &UserStore{repo: repo}, nil
}

// Repository returns the underlying go-crud repository for UserStore.
func (s *UserStore) Repository() repository.Repository[*User] {
	return s.repo
}

// Seed populates the store with sample data.
func (s *UserStore) Seed() {
	ctx := context.Background()
	now := time.Now()
	users := []*User{
		{ID: uuid.New(), Username: "admin", Email: "admin@example.com", Role: "admin", Status: "active", CreatedAt: now.Add(-365 * 24 * time.Hour), LastLogin: now.Add(-2 * time.Hour)},
		{ID: uuid.New(), Username: "jane.smith", Email: "jane@example.com", Role: "editor", Status: "active", CreatedAt: now.Add(-180 * 24 * time.Hour), LastLogin: now.Add(-5 * time.Hour)},
		{ID: uuid.New(), Username: "john.doe", Email: "john@example.com", Role: "editor", Status: "active", CreatedAt: now.Add(-90 * 24 * time.Hour), LastLogin: now.Add(-24 * time.Hour)},
		{ID: uuid.New(), Username: "viewer", Email: "viewer@example.com", Role: "viewer", Status: "active", CreatedAt: now.Add(-30 * 24 * time.Hour), LastLogin: now.Add(-3 * 24 * time.Hour)},
		{ID: uuid.New(), Username: "inactive.user", Email: "inactive@example.com", Role: "viewer", Status: "inactive", CreatedAt: now.Add(-200 * 24 * time.Hour), LastLogin: now.Add(-120 * time.Hour)},
	}
	for _, u := range users {
		if _, err := s.repo.Create(ctx, u); err != nil {
			log.Printf("seed user %s failed: %v", u.Username, err)
		}
	}
}

// List returns all users with optional search filtering.
func (s *UserStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	users, total, err := s.repo.List(ctx)
	if err != nil {
		return nil, 0, err
	}

	if search, ok := opts.Filters["_search"].(string); ok && strings.TrimSpace(search) != "" {
		searchLower := strings.ToLower(search)
		filtered := make([]*User, 0, len(users))
		for _, u := range users {
			if strings.Contains(strings.ToLower(u.Username), searchLower) || strings.Contains(strings.ToLower(u.Email), searchLower) {
				filtered = append(filtered, u)
			}
		}
		users = filtered
		total = len(filtered)
	}

	results := make([]map[string]any, 0, len(users))
	for _, u := range users {
		results = append(results, userToMap(u))
	}
	return results, total, nil
}

// Get returns a single user by ID.
func (s *UserStore) Get(ctx context.Context, id string) (map[string]any, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return userToMap(user), nil
}

// Create adds a new user.
func (s *UserStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	user := mapToUser(record)
	user.ID = uuid.New()
	user.CreatedAt = time.Now()
	user.LastLogin = time.Now()

	user, err := s.repo.Create(ctx, user)
	if err != nil {
		return nil, err
	}
	return userToMap(user), nil
}

// Update modifies an existing user.
func (s *UserStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	user.Username = asString(record["username"], user.Username)
	user.Email = asString(record["email"], user.Email)
	user.Role = asString(record["role"], user.Role)
	user.Status = asString(record["status"], user.Status)

	updated, err := s.repo.Update(ctx, user)
	if err != nil {
		return nil, err
	}
	return userToMap(updated), nil
}

// Delete removes a user.
func (s *UserStore) Delete(ctx context.Context, id string) error {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, user)
}

func userToMap(u *User) map[string]any {
	return map[string]any{
		"id":         u.ID.String(),
		"username":   u.Username,
		"email":      u.Email,
		"role":       u.Role,
		"status":     u.Status,
		"created_at": u.CreatedAt.Format(time.RFC3339),
		"last_login": u.LastLogin.Format(time.RFC3339),
	}
}

func mapToUser(record map[string]any) *User {
	return &User{
		Username: asString(record["username"], ""),
		Email:    asString(record["email"], ""),
		Role:     asString(record["role"], "viewer"),
		Status:   asString(record["status"], "active"),
	}
}

func asString(val any, def string) string {
	if val == nil {
		return def
	}
	if s, ok := val.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", val)
}
