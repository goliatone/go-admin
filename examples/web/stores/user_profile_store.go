package stores

import (
	"context"
	"database/sql"
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
	usersprofile "github.com/goliatone/go-users/profile"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

const defaultProfilePageSize = 50

// UserProfile mirrors the JSON shape expected by go-crud/DataGrid.
// Note: bun tags are used by go-crud query parsing; the store does not rely on Bun scans for this model.
type UserProfile struct {
	bun.BaseModel `bun:"table:user_profiles,alias:up"`

	ID          uuid.UUID `json:"id" bun:"user_id,pk,type:uuid"`
	DisplayName string    `json:"display_name" bun:"display_name"`
	AvatarURL   string    `json:"avatar_url" bun:"avatar_url"`
	Email       string    `json:"email" bun:"email"`
	Locale      string    `json:"locale" bun:"locale"`
	Timezone    string    `json:"timezone" bun:"timezone"`
	Bio         string    `json:"bio" bun:"bio"`
	CreatedAt   time.Time `json:"created_at" bun:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" bun:"updated_at"`
}

type userProfileDBRepo interface {
	repository.Repository[*usersprofile.Record]
}

// UserProfileStore manages profile data through the go-users profile repository.
type UserProfileStore struct {
	db       *bun.DB
	repo     types.ProfileRepository
	dbRepo   userProfileDBRepo
	users    auth.Users
	crudRepo repository.Repository[*UserProfile]
}

// NewUserProfileStore provisions a DB-backed profile store for the example.
func NewUserProfileStore(deps UserDependencies) (*UserProfileStore, error) {
	if deps.ProfileRepo == nil || deps.RepoManager == nil {
		return nil, fmt.Errorf("user profile dependencies incomplete")
	}
	dbRepo, ok := deps.ProfileRepo.(userProfileDBRepo)
	if !ok {
		return nil, fmt.Errorf("profile repo does not support list/delete operations")
	}

	store := &UserProfileStore{
		db:     deps.DB,
		repo:   deps.ProfileRepo,
		dbRepo: dbRepo,
		users:  deps.RepoManager.Users(),
	}
	store.crudRepo = &userProfileRepositoryAdapter{store: store}
	return store, nil
}

// Repository exposes a go-crud compatible repository adapter.
func (s *UserProfileStore) Repository() repository.Repository[*UserProfile] {
	return s.crudRepo
}

// List returns user profiles honoring search/filters/pagination.
func (s *UserProfileStore) List(ctx context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	if s == nil || s.dbRepo == nil {
		return nil, 0, fmt.Errorf("profile store not configured")
	}

	recs, err := listAllUserProfileRecords(ctx, s.dbRepo)
	if err != nil {
		return nil, 0, err
	}

	scope := helpers.ScopeFromContext(ctx)
	filtered := make([]*usersprofile.Record, 0, len(recs))
	for _, rec := range recs {
		if rec == nil {
			continue
		}
		if scope.TenantID != uuid.Nil && rec.TenantID != scope.TenantID {
			continue
		}
		if scope.OrgID != uuid.Nil && rec.OrgID != scope.OrgID {
			continue
		}
		filtered = append(filtered, rec)
	}

	filtered = applyProfileFilters(filtered, opts.Filters)

	if opts.SortBy != "" {
		sortProfileRecords(filtered, opts.SortBy, opts.SortDesc)
	}

	total := len(filtered)
	pageSize := opts.PerPage
	if pageSize <= 0 {
		pageSize = defaultProfilePageSize
	}
	page := opts.Page
	if page <= 0 {
		page = 1
	}
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}

	results := make([]map[string]any, 0, end-start)
	for _, rec := range filtered[start:end] {
		results = append(results, userProfileRecordToMap(rec))
	}
	return results, total, nil
}

func listAllUserProfileRecords(ctx context.Context, repo userProfileDBRepo) ([]*usersprofile.Record, error) {
	if repo == nil {
		return nil, nil
	}
	const pageSize = 200
	offset := 0
	out := make([]*usersprofile.Record, 0, pageSize)
	for {
		records, total, err := repo.List(
			ctx,
			repository.SelectOrderAsc("user_id"),
			repository.SelectPaginate(pageSize, offset),
		)
		if err != nil {
			return nil, err
		}
		if len(records) == 0 {
			break
		}
		out = append(out, records...)
		offset += len(records)
		if total > 0 && offset >= total {
			break
		}
		if len(records) < pageSize {
			break
		}
	}
	return out, nil
}

// Get returns a single profile by user id (record id).
func (s *UserProfileStore) Get(ctx context.Context, id string) (map[string]any, error) {
	userID, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return nil, invalidProfileIDError(id)
	}
	scope := helpers.ScopeFromContext(ctx)
	profile, err := s.repo.GetProfile(ctx, userID, scope)
	if err != nil {
		return nil, err
	}
	if profile == nil {
		return nil, goerrors.New("profile not found", goerrors.CategoryNotFound).
			WithCode(goerrors.CodeNotFound).
			WithTextCode("NOT_FOUND")
	}
	return usersProfileToMap(*profile), nil
}

// Create adds a new profile (keyed by the user id).
func (s *UserProfileStore) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	input, err := mapToUserProfileInput(record)
	if err != nil {
		return nil, err
	}
	if err := validateUserProfileInput(input, true); err != nil {
		return nil, err
	}

	if err := s.ensureUserExists(ctx, input.UserID); err != nil {
		return nil, err
	}

	scope := helpers.ScopeFromContext(ctx)
	existing, err := s.repo.GetProfile(ctx, input.UserID, scope)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, newProfileValidationError("profile already exists for user", map[string]any{"id": input.UserID.String()})
	}

	upstream := input.ToUsersProfile(scope, helpers.ActorRefFromContext(ctx))
	created, err := s.repo.UpsertProfile(ctx, upstream)
	if err != nil {
		return nil, err
	}
	return usersProfileToMap(*created), nil
}

// Update modifies an existing profile (user id is immutable).
func (s *UserProfileStore) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	userID, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return nil, invalidProfileIDError(id)
	}
	input, err := mapToUserProfileInput(record)
	if err != nil {
		return nil, err
	}
	if err := validateUserProfileInput(input, false); err != nil {
		return nil, err
	}
	if input.UserID != uuid.Nil && input.UserID != userID {
		return nil, newProfileValidationError("user id is immutable", map[string]any{"id": id})
	}

	scope := helpers.ScopeFromContext(ctx)
	existing, err := s.repo.GetProfile(ctx, userID, scope)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, goerrors.New("profile not found", goerrors.CategoryNotFound).
			WithCode(goerrors.CodeNotFound).
			WithTextCode("NOT_FOUND")
	}

	merged := mergeUsersProfile(*existing, input)
	actor := helpers.ActorRefFromContext(ctx)
	if actor.ID != uuid.Nil {
		merged.UpdatedBy = actor.ID
	}
	updated, err := s.repo.UpsertProfile(ctx, merged)
	if err != nil {
		return nil, err
	}
	return usersProfileToMap(*updated), nil
}

// Delete removes a profile by user id.
func (s *UserProfileStore) Delete(ctx context.Context, id string) error {
	userID, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return invalidProfileIDError(id)
	}

	scope := helpers.ScopeFromContext(ctx)
	existing, err := s.repo.GetProfile(ctx, userID, scope)
	if err != nil {
		return err
	}
	if existing == nil {
		return goerrors.New("profile not found", goerrors.CategoryNotFound).
			WithCode(goerrors.CodeNotFound).
			WithTextCode("NOT_FOUND")
	}

	if s.db == nil {
		return errors.New("profile store missing database connection")
	}

	query := s.db.NewDelete().
		Model((*usersprofile.Record)(nil)).
		Where("user_id = ?", userID)
	if scope.TenantID != uuid.Nil {
		query = query.Where("tenant_id = ?", scope.TenantID)
	}
	if scope.OrgID != uuid.Nil {
		query = query.Where("org_id = ?", scope.OrgID)
	}

	result, err := query.Exec(ctx)
	if err != nil {
		return err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return goerrors.New("profile not found", goerrors.CategoryNotFound).
			WithCode(goerrors.CodeNotFound).
			WithTextCode("NOT_FOUND")
	}
	return nil
}

func (s *UserProfileStore) ensureUserExists(ctx context.Context, id uuid.UUID) error {
	if s == nil || s.users == nil {
		return nil
	}
	if id == uuid.Nil {
		return newProfileValidationError("invalid user id", map[string]any{"id": ""})
	}
	user, err := s.users.GetByID(ctx, id.String())
	if err != nil {
		if repository.IsRecordNotFound(err) {
			return newProfileValidationError("user not found", map[string]any{"id": id.String()})
		}
		return err
	}
	if user == nil || user.ID == uuid.Nil {
		return newProfileValidationError("user not found", map[string]any{"id": id.String()})
	}
	return nil
}

type userProfileInput struct {
	UserID      uuid.UUID
	DisplayName string
	DisplaySet  bool
	AvatarURL   string
	AvatarSet   bool
	Email       string
	EmailSet    bool
	Locale      string
	LocaleSet   bool
	Timezone    string
	TimezoneSet bool
	Bio         string
	BioSet      bool
}

func (p userProfileInput) ToUsersProfile(scope types.ScopeFilter, actor types.ActorRef) types.UserProfile {
	userID := p.UserID
	if userID == uuid.Nil {
		userID = actor.ID
	}
	contact := map[string]any{}
	if strings.TrimSpace(p.Email) != "" {
		contact["email"] = strings.TrimSpace(p.Email)
	}
	return types.UserProfile{
		UserID:      userID,
		DisplayName: strings.TrimSpace(p.DisplayName),
		AvatarURL:   strings.TrimSpace(p.AvatarURL),
		Locale:      strings.TrimSpace(p.Locale),
		Timezone:    strings.TrimSpace(p.Timezone),
		Bio:         strings.TrimSpace(p.Bio),
		Contact:     contact,
		Metadata:    map[string]any{},
		Scope:       scope,
		CreatedBy:   actor.ID,
		UpdatedBy:   actor.ID,
	}
}

func mapToUserProfileInput(record map[string]any) (userProfileInput, error) {
	if record == nil {
		record = map[string]any{}
	}

	id := strings.TrimSpace(asString(record["id"], ""))
	if id == "" {
		id = strings.TrimSpace(asString(record["user_id"], ""))
	}

	var userID uuid.UUID
	if id != "" {
		parsed, err := uuid.Parse(id)
		if err != nil {
			return userProfileInput{}, invalidProfileIDError(id)
		}
		userID = parsed
	}

	_, displaySet := record["display_name"]
	_, avatarSet := record["avatar_url"]
	_, emailSet := record["email"]
	_, localeSet := record["locale"]
	_, tzSet := record["timezone"]
	_, bioSet := record["bio"]

	return userProfileInput{
		UserID:      userID,
		DisplayName: strings.TrimSpace(asString(record["display_name"], "")),
		DisplaySet:  displaySet,
		AvatarURL:   strings.TrimSpace(asString(record["avatar_url"], "")),
		AvatarSet:   avatarSet,
		Email:       strings.TrimSpace(asString(record["email"], "")),
		EmailSet:    emailSet,
		Locale:      strings.TrimSpace(asString(record["locale"], "")),
		LocaleSet:   localeSet,
		Timezone:    strings.TrimSpace(asString(record["timezone"], "")),
		TimezoneSet: tzSet,
		Bio:         strings.TrimSpace(asString(record["bio"], "")),
		BioSet:      bioSet,
	}, nil
}

func mergeUsersProfile(existing types.UserProfile, patch userProfileInput) types.UserProfile {
	merged := existing
	if patch.DisplaySet {
		merged.DisplayName = strings.TrimSpace(patch.DisplayName)
	}
	if patch.AvatarSet {
		merged.AvatarURL = strings.TrimSpace(patch.AvatarURL)
	}
	if patch.LocaleSet {
		merged.Locale = strings.TrimSpace(patch.Locale)
	}
	if patch.TimezoneSet {
		merged.Timezone = strings.TrimSpace(patch.Timezone)
	}
	if patch.BioSet {
		merged.Bio = strings.TrimSpace(patch.Bio)
	}

	if merged.Contact == nil {
		merged.Contact = map[string]any{}
	}
	if patch.EmailSet {
		// Empty email clears the contact email.
		email := strings.TrimSpace(patch.Email)
		if email == "" {
			delete(merged.Contact, "email")
		} else {
			merged.Contact["email"] = email
		}
	}

	return merged
}

func usersProfileToMap(profile types.UserProfile) map[string]any {
	email := ""
	if profile.Contact != nil {
		email = strings.TrimSpace(asString(profile.Contact["email"], ""))
	}
	out := map[string]any{
		"id":           profile.UserID.String(),
		"display_name": profile.DisplayName,
		"avatar_url":   profile.AvatarURL,
		"email":        email,
		"locale":       profile.Locale,
		"timezone":     profile.Timezone,
		"bio":          profile.Bio,
	}
	if !profile.CreatedAt.IsZero() {
		out["created_at"] = profile.CreatedAt.Format(time.RFC3339)
	}
	if !profile.UpdatedAt.IsZero() {
		out["updated_at"] = profile.UpdatedAt.Format(time.RFC3339)
	}
	return out
}

func userProfileRecordToMap(rec *usersprofile.Record) map[string]any {
	if rec == nil {
		return map[string]any{}
	}
	email := ""
	if rec.Contact != nil {
		email = strings.TrimSpace(asString(rec.Contact["email"], ""))
	}
	out := map[string]any{
		"id":           rec.UserID.String(),
		"display_name": rec.DisplayName,
		"avatar_url":   rec.AvatarURL,
		"email":        email,
		"locale":       rec.Locale,
		"timezone":     rec.Timezone,
		"bio":          rec.Bio,
		"created_at":   rec.CreatedAt.Format(time.RFC3339),
		"updated_at":   rec.UpdatedAt.Format(time.RFC3339),
	}
	return out
}

func invalidProfileIDError(raw string) error {
	return goerrors.New("invalid profile id", goerrors.CategoryValidation).
		WithCode(goerrors.CodeBadRequest).
		WithTextCode("VALIDATION_ERROR").
		WithMetadata(map[string]any{"id": raw})
}

func newProfileValidationError(message string, metadata map[string]any) error {
	err := goerrors.New(message, goerrors.CategoryValidation).
		WithCode(goerrors.CodeBadRequest).
		WithTextCode("VALIDATION_ERROR")
	if len(metadata) > 0 {
		err = err.WithMetadata(metadata)
	}
	return err
}

func validateUserProfileInput(input userProfileInput, requireID bool) error {
	missing := []string{}
	if requireID && input.UserID == uuid.Nil {
		missing = append(missing, "id")
	}
	if requireID || input.DisplaySet {
		if strings.TrimSpace(input.DisplayName) == "" {
			missing = append(missing, "display_name")
		}
	}
	if requireID || input.LocaleSet {
		if strings.TrimSpace(input.Locale) == "" {
			missing = append(missing, "locale")
		}
	}
	if len(missing) > 0 {
		return newProfileValidationError("missing required fields", map[string]any{"fields": missing})
	}
	if input.EmailSet {
		email := strings.TrimSpace(input.Email)
		if email != "" && (!strings.Contains(email, "@") || strings.ContainsAny(email, " \t\r\n")) {
			return newProfileValidationError("email must be valid", map[string]any{"email": email})
		}
	}
	return nil
}

func applyProfileFilters(records []*usersprofile.Record, filters map[string]any) []*usersprofile.Record {
	if len(records) == 0 || len(filters) == 0 {
		return records
	}

	idFilters := normalizeFilterList(filters["id"], filters["user_id"])
	displayILikeFilters := normalizeFilterList(filters["display_name__ilike"])
	emailILikeFilters := normalizeFilterList(filters["email__ilike"])
	displayFilters := normalizeFilterList(filters["display_name__ilike"], filters["display_name"])
	bioFilters := normalizeFilterList(filters["bio__ilike"], filters["bio"])
	emailFilters := normalizeFilterList(filters["email__ilike"], filters["email"])
	localeFilters := normalizeFilterList(filters["locale__in"], filters["locale"], filters["locale__ilike"])
	timezoneFilters := normalizeFilterList(filters["timezone__in"], filters["timezone"], filters["timezone__ilike"])

	globalSearch := []string{}
	if len(normalizeFilterList(filters["display_name"])) == 0 && len(normalizeFilterList(filters["email"])) == 0 {
		if len(displayILikeFilters) > 0 && len(emailILikeFilters) > 0 && strings.Join(displayILikeFilters, ",") == strings.Join(emailILikeFilters, ",") {
			globalSearch = displayILikeFilters
		}
	}

	matchAny := func(haystack string, needles []string) bool {
		if len(needles) == 0 {
			return true
		}
		hs := strings.ToLower(haystack)
		for _, needle := range needles {
			n := strings.ToLower(strings.Trim(needle, "%"))
			if n == "" {
				continue
			}
			if strings.Contains(hs, n) {
				return true
			}
		}
		return false
	}

	out := make([]*usersprofile.Record, 0, len(records))
	for _, rec := range records {
		if rec == nil {
			continue
		}

		if len(idFilters) > 0 {
			ok := false
			for _, val := range idFilters {
				if strings.EqualFold(strings.TrimSpace(val), rec.UserID.String()) {
					ok = true
					break
				}
			}
			if !ok {
				continue
			}
		}

		if len(globalSearch) == 0 {
			if len(displayFilters) > 0 && !matchAny(rec.DisplayName, displayFilters) {
				continue
			}
		}

		if len(bioFilters) > 0 && !matchAny(rec.Bio, bioFilters) {
			continue
		}

		email := ""
		if rec.Contact != nil {
			email = asString(rec.Contact["email"], "")
		}
		if len(globalSearch) > 0 {
			if !(matchAny(rec.DisplayName, globalSearch) || matchAny(email, globalSearch) || matchAny(rec.Bio, globalSearch)) {
				continue
			}
		} else {
			if !matchAny(email, emailFilters) {
				continue
			}
		}

		if len(localeFilters) > 0 {
			ok := false
			for _, val := range localeFilters {
				if strings.EqualFold(strings.TrimSpace(val), rec.Locale) {
					ok = true
					break
				}
			}
			if !ok {
				continue
			}
		}

		if len(timezoneFilters) > 0 {
			ok := false
			for _, val := range timezoneFilters {
				if strings.EqualFold(strings.TrimSpace(val), rec.Timezone) {
					ok = true
					break
				}
			}
			if !ok {
				continue
			}
		}

		out = append(out, rec)
	}
	return out
}

func sortProfileRecords(records []*usersprofile.Record, sortBy string, sortDesc bool) {
	if len(records) == 0 {
		return
	}
	key := strings.ToLower(strings.TrimSpace(sortBy))
	if key == "" {
		return
	}
	if key == "user_id" {
		key = "id"
	}

	valueFor := func(rec *usersprofile.Record) (string, time.Time) {
		if rec == nil {
			return "", time.Time{}
		}
		switch key {
		case "id":
			return rec.UserID.String(), time.Time{}
		case "display_name":
			return rec.DisplayName, time.Time{}
		case "email":
			if rec.Contact == nil {
				return "", time.Time{}
			}
			return asString(rec.Contact["email"], ""), time.Time{}
		case "locale":
			return rec.Locale, time.Time{}
		case "timezone":
			return rec.Timezone, time.Time{}
		case "bio":
			return rec.Bio, time.Time{}
		case "created_at":
			return "", rec.CreatedAt
		case "updated_at":
			return "", rec.UpdatedAt
		default:
			return "", time.Time{}
		}
	}

	sort.SliceStable(records, func(i, j int) bool {
		si, ti := valueFor(records[i])
		sj, tj := valueFor(records[j])

		if !ti.IsZero() || !tj.IsZero() {
			switch {
			case ti.IsZero() && tj.IsZero():
				return false
			case ti.IsZero():
				return !sortDesc
			case tj.IsZero():
				return sortDesc
			default:
				if sortDesc {
					return ti.After(tj)
				}
				return ti.Before(tj)
			}
		}

		lsi := strings.ToLower(strings.TrimSpace(si))
		lsj := strings.ToLower(strings.TrimSpace(sj))
		if sortDesc {
			return lsi > lsj
		}
		return lsi < lsj
	})
}

func normalizeFilterList(values ...any) []string {
	out := []string{}
	for _, value := range values {
		if value == nil {
			continue
		}
		switch typed := value.(type) {
		case string:
			parts := strings.Split(typed, ",")
			for _, part := range parts {
				part = strings.TrimSpace(part)
				if part != "" {
					out = append(out, part)
				}
			}
		default:
			str := strings.TrimSpace(fmt.Sprint(value))
			if str != "" {
				out = append(out, str)
			}
		}
	}
	return out
}

// userProfileRepositoryAdapter bridges UserProfileStore to the go-crud controller.
type userProfileRepositoryAdapter struct {
	store         *UserProfileStore
	scopeDefaults repository.ScopeDefaults
}

var _ repository.Repository[*UserProfile] = (*userProfileRepositoryAdapter)(nil)

func (r *userProfileRepositoryAdapter) Raw(context.Context, string, ...any) ([]*UserProfile, error) {
	return nil, r.unsupported("Raw")
}

func (r *userProfileRepositoryAdapter) RawTx(context.Context, bun.IDB, string, ...any) ([]*UserProfile, error) {
	return nil, r.unsupported("RawTx")
}

func (r *userProfileRepositoryAdapter) Get(ctx context.Context, _ ...repository.SelectCriteria) (*UserProfile, error) {
	profiles, _, err := r.List(ctx)
	if err != nil {
		return nil, err
	}
	if len(profiles) == 0 {
		return nil, fmt.Errorf("profile not found")
	}
	return profiles[0], nil
}

func (r *userProfileRepositoryAdapter) GetTx(ctx context.Context, _ bun.IDB, criteria ...repository.SelectCriteria) (*UserProfile, error) {
	return r.Get(ctx, criteria...)
}

func (r *userProfileRepositoryAdapter) GetByID(ctx context.Context, id string, _ ...repository.SelectCriteria) (*UserProfile, error) {
	data, err := r.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return mapToUserProfileRecord(data), nil
}

func (r *userProfileRepositoryAdapter) GetByIDTx(ctx context.Context, _ bun.IDB, id string, criteria ...repository.SelectCriteria) (*UserProfile, error) {
	return r.GetByID(ctx, id, criteria...)
}

func (r *userProfileRepositoryAdapter) List(ctx context.Context, criteria ...repository.SelectCriteria) ([]*UserProfile, int, error) {
	opts := extractProfileListOptionsFromCriteria(criteria)
	records, total, err := r.store.List(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]*UserProfile, 0, len(records))
	for _, rec := range records {
		out = append(out, mapToUserProfileRecord(rec))
	}
	return out, total, nil
}

func (r *userProfileRepositoryAdapter) ListTx(ctx context.Context, _ bun.IDB, criteria ...repository.SelectCriteria) ([]*UserProfile, int, error) {
	return r.List(ctx, criteria...)
}

func (r *userProfileRepositoryAdapter) Count(ctx context.Context, _ ...repository.SelectCriteria) (int, error) {
	_, total, err := r.List(ctx)
	return total, err
}

func (r *userProfileRepositoryAdapter) CountTx(ctx context.Context, _ bun.IDB, criteria ...repository.SelectCriteria) (int, error) {
	return r.Count(ctx, criteria...)
}

func (r *userProfileRepositoryAdapter) Create(ctx context.Context, record *UserProfile, _ ...repository.InsertCriteria) (*UserProfile, error) {
	if record == nil {
		return nil, fmt.Errorf("profile is nil")
	}
	created, err := r.store.Create(ctx, userProfileRecordToInputMap(record))
	if err != nil {
		return nil, err
	}
	return mapToUserProfileRecord(created), nil
}

func (r *userProfileRepositoryAdapter) CreateTx(ctx context.Context, _ bun.IDB, record *UserProfile, criteria ...repository.InsertCriteria) (*UserProfile, error) {
	return r.Create(ctx, record, criteria...)
}

func (r *userProfileRepositoryAdapter) CreateMany(ctx context.Context, records []*UserProfile, _ ...repository.InsertCriteria) ([]*UserProfile, error) {
	out := make([]*UserProfile, 0, len(records))
	for _, rec := range records {
		created, err := r.Create(ctx, rec)
		if err != nil {
			return nil, err
		}
		out = append(out, created)
	}
	return out, nil
}

func (r *userProfileRepositoryAdapter) CreateManyTx(ctx context.Context, _ bun.IDB, records []*UserProfile, criteria ...repository.InsertCriteria) ([]*UserProfile, error) {
	return r.CreateMany(ctx, records, criteria...)
}

func (r *userProfileRepositoryAdapter) GetOrCreate(ctx context.Context, record *UserProfile) (*UserProfile, error) {
	if record == nil {
		return nil, fmt.Errorf("profile is nil")
	}
	if record.ID != uuid.Nil {
		if existing, err := r.GetByID(ctx, record.ID.String()); err == nil {
			return existing, nil
		}
	}
	return r.Create(ctx, record)
}

func (r *userProfileRepositoryAdapter) GetOrCreateTx(ctx context.Context, _ bun.IDB, record *UserProfile) (*UserProfile, error) {
	return r.GetOrCreate(ctx, record)
}

func (r *userProfileRepositoryAdapter) GetByIdentifier(ctx context.Context, identifier string, _ ...repository.SelectCriteria) (*UserProfile, error) {
	records, _, err := r.store.List(ctx, admin.ListOptions{
		Filters: map[string]any{"display_name__ilike": identifier},
		PerPage: 1,
	})
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("profile not found")
	}
	return mapToUserProfileRecord(records[0]), nil
}

func (r *userProfileRepositoryAdapter) GetByIdentifierTx(ctx context.Context, _ bun.IDB, identifier string, criteria ...repository.SelectCriteria) (*UserProfile, error) {
	return r.GetByIdentifier(ctx, identifier, criteria...)
}

func (r *userProfileRepositoryAdapter) Update(ctx context.Context, record *UserProfile, _ ...repository.UpdateCriteria) (*UserProfile, error) {
	if record == nil {
		return nil, fmt.Errorf("profile is nil")
	}
	updated, err := r.store.Update(ctx, record.ID.String(), userProfileRecordToInputMap(record))
	if err != nil {
		return nil, err
	}
	return mapToUserProfileRecord(updated), nil
}

func (r *userProfileRepositoryAdapter) UpdateTx(ctx context.Context, _ bun.IDB, record *UserProfile, criteria ...repository.UpdateCriteria) (*UserProfile, error) {
	return r.Update(ctx, record, criteria...)
}

func (r *userProfileRepositoryAdapter) UpdateMany(ctx context.Context, records []*UserProfile, _ ...repository.UpdateCriteria) ([]*UserProfile, error) {
	out := make([]*UserProfile, 0, len(records))
	for _, rec := range records {
		updated, err := r.Update(ctx, rec)
		if err != nil {
			return nil, err
		}
		out = append(out, updated)
	}
	return out, nil
}

func (r *userProfileRepositoryAdapter) UpdateManyTx(ctx context.Context, _ bun.IDB, records []*UserProfile, criteria ...repository.UpdateCriteria) ([]*UserProfile, error) {
	return r.UpdateMany(ctx, records, criteria...)
}

func (r *userProfileRepositoryAdapter) Upsert(ctx context.Context, record *UserProfile, criteria ...repository.UpdateCriteria) (*UserProfile, error) {
	if record == nil {
		return nil, fmt.Errorf("profile is nil")
	}
	if record.ID != uuid.Nil {
		if _, err := r.store.Get(ctx, record.ID.String()); err == nil {
			return r.Update(ctx, record, criteria...)
		}
	}
	return r.Create(ctx, record)
}

func (r *userProfileRepositoryAdapter) UpsertTx(ctx context.Context, _ bun.IDB, record *UserProfile, criteria ...repository.UpdateCriteria) (*UserProfile, error) {
	return r.Upsert(ctx, record, criteria...)
}

func (r *userProfileRepositoryAdapter) UpsertMany(ctx context.Context, records []*UserProfile, criteria ...repository.UpdateCriteria) ([]*UserProfile, error) {
	out := make([]*UserProfile, 0, len(records))
	for _, rec := range records {
		saved, err := r.Upsert(ctx, rec, criteria...)
		if err != nil {
			return nil, err
		}
		out = append(out, saved)
	}
	return out, nil
}

func (r *userProfileRepositoryAdapter) UpsertManyTx(ctx context.Context, _ bun.IDB, records []*UserProfile, criteria ...repository.UpdateCriteria) ([]*UserProfile, error) {
	return r.UpsertMany(ctx, records, criteria...)
}

func (r *userProfileRepositoryAdapter) Delete(ctx context.Context, record *UserProfile) error {
	if record == nil {
		return fmt.Errorf("profile is nil")
	}
	return r.store.Delete(ctx, record.ID.String())
}

func (r *userProfileRepositoryAdapter) DeleteTx(ctx context.Context, _ bun.IDB, record *UserProfile) error {
	return r.Delete(ctx, record)
}

func (r *userProfileRepositoryAdapter) DeleteMany(context.Context, ...repository.DeleteCriteria) error {
	return r.unsupported("DeleteMany")
}

func (r *userProfileRepositoryAdapter) DeleteManyTx(context.Context, bun.IDB, ...repository.DeleteCriteria) error {
	return r.unsupported("DeleteManyTx")
}

func (r *userProfileRepositoryAdapter) DeleteWhere(context.Context, ...repository.DeleteCriteria) error {
	return r.unsupported("DeleteWhere")
}

func (r *userProfileRepositoryAdapter) DeleteWhereTx(context.Context, bun.IDB, ...repository.DeleteCriteria) error {
	return r.unsupported("DeleteWhereTx")
}

func (r *userProfileRepositoryAdapter) ForceDelete(ctx context.Context, record *UserProfile) error {
	return r.Delete(ctx, record)
}

func (r *userProfileRepositoryAdapter) ForceDeleteTx(ctx context.Context, tx bun.IDB, record *UserProfile) error {
	return r.ForceDelete(ctx, record)
}

func (r *userProfileRepositoryAdapter) Handlers() repository.ModelHandlers[*UserProfile] {
	return repository.ModelHandlers[*UserProfile]{
		NewRecord: func() *UserProfile { return &UserProfile{} },
		GetID: func(p *UserProfile) uuid.UUID {
			if p == nil {
				return uuid.Nil
			}
			return p.ID
		},
		SetID: func(p *UserProfile, id uuid.UUID) {
			if p != nil {
				p.ID = id
			}
		},
		GetIdentifier: func() string { return "DisplayName" },
		GetIdentifierValue: func(p *UserProfile) string {
			if p == nil {
				return ""
			}
			if strings.TrimSpace(p.Email) != "" {
				return p.Email
			}
			return p.DisplayName
		},
		ResolveIdentifier: func(identifier string) []repository.IdentifierOption {
			trimmed := strings.TrimSpace(identifier)
			if trimmed == "" {
				return nil
			}
			return []repository.IdentifierOption{
				{Column: "Email", Value: trimmed},
				{Column: "DisplayName", Value: trimmed},
				{Column: "ID", Value: trimmed},
			}
		},
	}
}

func (r *userProfileRepositoryAdapter) RegisterScope(name string, scope repository.ScopeDefinition) {
	_ = name
	_ = scope
}

func (r *userProfileRepositoryAdapter) SetScopeDefaults(defaults repository.ScopeDefaults) error {
	r.scopeDefaults = defaults
	return nil
}

func (r *userProfileRepositoryAdapter) GetScopeDefaults() repository.ScopeDefaults {
	return r.scopeDefaults
}

func (r *userProfileRepositoryAdapter) unsupported(op string) error {
	return errors.New("user profile repository adapter: " + op + " not supported in example")
}

func userProfileRecordToInputMap(p *UserProfile) map[string]any {
	if p == nil {
		return nil
	}
	return map[string]any{
		"id":           p.ID.String(),
		"display_name": p.DisplayName,
		"email":        p.Email,
		"locale":       p.Locale,
		"timezone":     p.Timezone,
		"bio":          p.Bio,
	}
}

func mapToUserProfileRecord(record map[string]any) *UserProfile {
	if record == nil {
		return &UserProfile{}
	}
	out := &UserProfile{
		ID:          parseUUID(asString(record["id"], "")),
		DisplayName: asString(record["display_name"], ""),
		AvatarURL:   asString(record["avatar_url"], ""),
		Email:       asString(record["email"], ""),
		Locale:      asString(record["locale"], ""),
		Timezone:    asString(record["timezone"], ""),
		Bio:         asString(record["bio"], ""),
	}
	if created := parseTimeValue(record["created_at"]); !created.IsZero() {
		out.CreatedAt = created
	}
	if updated := parseTimeValue(record["updated_at"]); !updated.IsZero() {
		out.UpdatedAt = updated
	}
	return out
}

// extractProfileListOptionsFromCriteria extracts limit/offset and filters by parsing a mock Bun query.
func extractProfileListOptionsFromCriteria(criteria []repository.SelectCriteria) admin.ListOptions {
	opts := admin.ListOptions{
		Filters: make(map[string]any),
	}
	if len(criteria) == 0 {
		return opts
	}

	db := newMockProfileBunDB()
	if db == nil {
		return opts
	}
	defer db.DB.Close()

	mockQuery := db.NewSelect().Model((*UserProfile)(nil))
	for _, criterion := range criteria {
		if criterion != nil {
			mockQuery = criterion(mockQuery)
		}
	}
	queryStr := mockQuery.String()

	if orderKey, desc := extractOrderBy(queryStr); orderKey != "" {
		opts.SortBy = orderKey
		opts.SortDesc = desc
	}

	if idx := strings.Index(queryStr, "LIMIT "); idx >= 0 {
		limitStr := queryStr[idx+6:]
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

	if strings.Contains(queryStr, "WHERE") {
		for _, field := range []string{"id", "user_id", "display_name", "email", "locale", "timezone", "bio"} {
			if strings.Contains(queryStr, `"`+field+`" = `) {
				if match := extractWhereValue(queryStr, field); match != "" {
					opts.Filters[field] = match
				}
			}

			if strings.Contains(strings.ToUpper(queryStr), "ILIKE") {
				terms := extractAllILikeValuesForField(queryStr, field)
				if len(terms) > 0 {
					opts.Filters[field+"__ilike"] = strings.Join(terms, ",")
				}
			}

			if inVals := extractINValuesForField(queryStr, field); len(inVals) > 0 {
				opts.Filters[field+"__in"] = strings.Join(inVals, ",")
			}
		}
	}

	return opts
}

func extractOrderBy(query string) (string, bool) {
	upper := strings.ToUpper(query)
	idx := strings.Index(upper, "ORDER BY ")
	if idx < 0 {
		return "", false
	}
	clause := query[idx+len("ORDER BY "):]
	end := len(clause)
	for _, token := range []string{" LIMIT ", " OFFSET "} {
		if tidx := strings.Index(strings.ToUpper(clause), token); tidx >= 0 && tidx < end {
			end = tidx
		}
	}
	clause = strings.TrimSpace(clause[:end])
	if clause == "" {
		return "", false
	}
	first := clause
	if comma := strings.Index(first, ","); comma >= 0 {
		first = first[:comma]
	}
	first = strings.TrimSpace(first)
	if first == "" {
		return "", false
	}
	parts := strings.Fields(first)
	if len(parts) == 0 {
		return "", false
	}
	field := parts[0]
	desc := false
	for _, part := range parts[1:] {
		if strings.EqualFold(part, "DESC") {
			desc = true
			break
		}
		if strings.EqualFold(part, "ASC") {
			desc = false
			break
		}
	}
	if dot := strings.LastIndex(field, "."); dot >= 0 {
		field = field[dot+1:]
	}
	field = strings.Trim(field, "\"`")
	if strings.EqualFold(field, "user_id") {
		return "id", desc
	}
	return field, desc
}

func newMockProfileBunDB() *bun.DB {
	registerSQLiteDrivers("sqlite3")
	sqlDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		return nil
	}
	return bun.NewDB(sqlDB, sqlitedialect.New())
}

func extractINValuesForField(query, field string) []string {
	queryUpper := strings.ToUpper(query)
	fieldUpper := strings.ToUpper(field)
	patterns := []string{
		`"` + fieldUpper + `" IN (`,
		fieldUpper + ` IN (`,
	}
	startIdx := -1
	matched := ""
	for _, pat := range patterns {
		if idx := strings.Index(queryUpper, pat); idx >= 0 {
			startIdx = idx
			matched = pat
			break
		}
	}
	if startIdx == -1 {
		return nil
	}
	start := startIdx + len(matched)
	end := strings.Index(query[start:], ")")
	if end == -1 {
		return nil
	}
	inner := query[start : start+end]
	parts := strings.Split(inner, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		part = strings.Trim(part, "'")
		part = strings.Trim(part, "\"")
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}
