package admin

import (
	"context"
	"errors"
	"sort"
	"sync"

	users "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

const (
	profileKeyDisplayName = "display_name"
	profileKeyEmail       = "email"
	profileKeyAvatarURL   = "avatar_url"
	profileKeyAvatar      = "avatar"
	profileKeyLocale      = "locale"
	profileKeyTimezone    = "timezone"
	profileKeyBio         = "bio"
)

// UserProfile mirrors the go-users profile model using string IDs for admin context.
type UserProfile struct {
	UserID      string
	DisplayName string
	Email       string
	AvatarURL   string
	Locale      string
	Timezone    string
	Bio         string
	Contact     map[string]any
	Metadata    map[string]any
	Raw         map[string]any
}

// ProfileStore persists profile data.
type ProfileStore interface {
	Get(ctx context.Context, userID string) (UserProfile, error)
	Save(ctx context.Context, profile UserProfile) (UserProfile, error)
}

// InMemoryProfileStore stores profiles keyed by user ID.
type InMemoryProfileStore struct {
	mu      sync.RWMutex
	records map[string]UserProfile
}

// NewInMemoryProfileStore constructs an empty profile store.
func NewInMemoryProfileStore() *InMemoryProfileStore {
	return &InMemoryProfileStore{records: map[string]UserProfile{}}
}

// Get returns the stored profile for a user.
func (s *InMemoryProfileStore) Get(ctx context.Context, userID string) (UserProfile, error) {
	_ = ctx
	if s == nil {
		return UserProfile{}, errors.New("profile store not configured")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if profile, ok := s.records[userID]; ok {
		return cloneProfile(profile), nil
	}
	return UserProfile{
		UserID:   userID,
		Contact:  map[string]any{},
		Metadata: map[string]any{},
		Raw:      map[string]any{},
	}, nil
}

// Save upserts the stored profile for a user.
func (s *InMemoryProfileStore) Save(ctx context.Context, profile UserProfile) (UserProfile, error) {
	_ = ctx
	if s == nil {
		return UserProfile{}, errors.New("profile store not configured")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records[profile.UserID] = cloneProfile(profile)
	return cloneProfile(profile), nil
}

// ProfileService orchestrates profile retrieval and persistence.
type ProfileService struct {
	store    ProfileStore
	activity ActivitySink
}

// NewProfileService constructs a service with the provided store (or in-memory fallback).
func NewProfileService(store ProfileStore) *ProfileService {
	if store == nil {
		store = NewInMemoryProfileStore()
	}
	return &ProfileService{store: store}
}

// WithActivitySink wires activity emission on profile updates.
func (s *ProfileService) WithActivitySink(sink ActivitySink) {
	if s != nil && sink != nil {
		s.activity = sink
	}
}

// Store exposes the underlying profile store (useful for adapters).
func (s *ProfileService) Store() ProfileStore {
	if s == nil {
		return nil
	}
	return s.store
}

// Get returns the profile for a user, applying defaults.
func (s *ProfileService) Get(ctx context.Context, userID string) (UserProfile, error) {
	if s == nil {
		return UserProfile{}, errors.New("profile service not configured")
	}
	profile, err := s.store.Get(ctx, userID)
	if err != nil {
		return UserProfile{}, err
	}
	if profile.UserID == "" {
		profile.UserID = userID
	}
	return ensureProfileMaps(profile), nil
}

// Save merges and persists a profile for a user.
func (s *ProfileService) Save(ctx context.Context, userID string, profile UserProfile) (UserProfile, error) {
	if s == nil {
		return UserProfile{}, errors.New("profile service not configured")
	}
	if userID == "" {
		return UserProfile{}, ErrForbidden
	}
	profile.UserID = userID
	profile = ensureProfileMaps(profile)
	current, err := s.store.Get(ctx, userID)
	if err != nil {
		return UserProfile{}, err
	}
	merged := mergeProfiles(current, profile)
	merged.UserID = userID
	updated, err := s.store.Save(ctx, merged)
	if err != nil {
		return UserProfile{}, err
	}
	s.recordActivity(ctx, updated, profileChangeKeys(profile))
	return ensureProfileMaps(updated), nil
}

func (s *ProfileService) recordActivity(ctx context.Context, profile UserProfile, keys []string) {
	if s == nil || s.activity == nil {
		return
	}
	sort.Strings(keys)
	actor := actorFromContext(ctx)
	if actor == "" {
		actor = profile.UserID
	}
	meta := map[string]any{
		"user_id": profile.UserID,
		"keys":    keys,
	}
	if profile.DisplayName != "" {
		meta[profileKeyDisplayName] = profile.DisplayName
	}
	if profile.Email != "" {
		meta[profileKeyEmail] = profile.Email
	}
	if profile.Locale != "" {
		meta[profileKeyLocale] = profile.Locale
	}
	if profile.AvatarURL != "" {
		meta[profileKeyAvatarURL] = profile.AvatarURL
	}
	_ = s.activity.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   "profile.update",
		Object:   "profile:" + profile.UserID,
		Metadata: meta,
	})
}

func mergeProfiles(base, update UserProfile) UserProfile {
	base = ensureProfileMaps(base)
	update = ensureProfileMaps(update)
	merged := cloneProfile(base)
	for k, v := range update.Raw {
		merged.Raw[k] = v
	}
	if shouldOverride(update.Raw, profileKeyDisplayName) {
		merged.DisplayName = update.DisplayName
	}
	if shouldOverride(update.Raw, profileKeyEmail) {
		merged.Email = update.Email
	}
	if shouldOverride(update.Raw, profileKeyAvatarURL) {
		merged.AvatarURL = update.AvatarURL
	}
	if shouldOverride(update.Raw, profileKeyLocale) {
		merged.Locale = update.Locale
	}
	if shouldOverride(update.Raw, profileKeyTimezone) {
		merged.Timezone = update.Timezone
	}
	if shouldOverride(update.Raw, profileKeyBio) {
		merged.Bio = update.Bio
	}
	if update.Contact != nil {
		merged.Contact = mergeAnyMaps(merged.Contact, update.Contact)
	}
	if update.Metadata != nil {
		merged.Metadata = mergeAnyMaps(merged.Metadata, update.Metadata)
	}
	return merged
}

func profileChangeKeys(update UserProfile) []string {
	keys := map[string]bool{}
	for k := range update.Raw {
		keys[k] = true
	}
	for k := range update.Contact {
		keys["contact."+k] = true
	}
	for k := range update.Metadata {
		keys["metadata."+k] = true
	}
	out := make([]string, 0, len(keys))
	for k := range keys {
		out = append(out, k)
	}
	return out
}

func shouldOverride(raw map[string]any, key string) bool {
	_, ok := raw[key]
	return ok
}

func ensureProfileMaps(profile UserProfile) UserProfile {
	if profile.Contact == nil {
		profile.Contact = map[string]any{}
	}
	if profile.Metadata == nil {
		profile.Metadata = map[string]any{}
	}
	if profile.Raw == nil {
		profile.Raw = map[string]any{}
	}
	return profile
}

func mergeAnyMaps(base, override map[string]any) map[string]any {
	if len(base) == 0 && len(override) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for k, v := range base {
		out[k] = v
	}
	for k, v := range override {
		out[k] = v
	}
	return out
}

func cloneProfile(profile UserProfile) UserProfile {
	return UserProfile{
		UserID:      profile.UserID,
		DisplayName: profile.DisplayName,
		Email:       profile.Email,
		AvatarURL:   profile.AvatarURL,
		Locale:      profile.Locale,
		Timezone:    profile.Timezone,
		Bio:         profile.Bio,
		Contact:     cloneAnyMap(profile.Contact),
		Metadata:    cloneAnyMap(profile.Metadata),
		Raw:         cloneAnyMap(profile.Raw),
	}
}

// GoUsersProfileStore adapts a go-users ProfileRepository to the admin profile store contract.
type GoUsersProfileStore struct {
	repo   users.ProfileRepository
	scopes func(context.Context) users.ScopeFilter
}

// NewGoUsersProfileStore builds an adapter for go-users profile repositories.
func NewGoUsersProfileStore(repo users.ProfileRepository, scopeResolver func(context.Context) users.ScopeFilter) *GoUsersProfileStore {
	resolver := scopeResolver
	if resolver == nil {
		resolver = func(context.Context) users.ScopeFilter { return users.ScopeFilter{} }
	}
	return &GoUsersProfileStore{repo: repo, scopes: resolver}
}

// Get returns a user profile via the go-users repository.
func (s *GoUsersProfileStore) Get(ctx context.Context, userID string) (UserProfile, error) {
	if s == nil || s.repo == nil {
		return UserProfile{}, errors.New("profile repository not configured")
	}
	id, err := uuid.Parse(userID)
	if err != nil {
		return UserProfile{}, err
	}
	scope := s.scopes(ctx)
	profile, err := s.repo.GetProfile(ctx, id, scope)
	if err != nil {
		return UserProfile{}, err
	}
	if profile == nil {
		return UserProfile{
			UserID:   userID,
			Contact:  map[string]any{},
			Metadata: map[string]any{},
			Raw:      map[string]any{},
		}, nil
	}
	return fromUsersProfile(userID, *profile), nil
}

// Save upserts a user profile via the go-users repository.
func (s *GoUsersProfileStore) Save(ctx context.Context, profile UserProfile) (UserProfile, error) {
	if s == nil || s.repo == nil {
		return UserProfile{}, errors.New("profile repository not configured")
	}
	if profile.UserID == "" {
		return UserProfile{}, ErrForbidden
	}
	id, err := uuid.Parse(profile.UserID)
	if err != nil {
		return UserProfile{}, err
	}
	scope := s.scopes(ctx)
	upstream := toUsersProfile(id, profile, scope)
	updated, err := s.repo.UpsertProfile(ctx, upstream)
	if err != nil {
		return UserProfile{}, err
	}
	return fromUsersProfile(profile.UserID, *updated), nil
}

func fromUsersProfile(userID string, p users.UserProfile) UserProfile {
	email := ""
	if val, ok := p.Contact["email"]; ok {
		email = toString(val)
	}
	return UserProfile{
		UserID:      userID,
		DisplayName: p.DisplayName,
		AvatarURL:   p.AvatarURL,
		Locale:      p.Locale,
		Timezone:    p.Timezone,
		Bio:         p.Bio,
		Contact:     cloneAnyMap(p.Contact),
		Metadata:    cloneAnyMap(p.Metadata),
		Email:       email,
		Raw: map[string]any{
			profileKeyDisplayName: p.DisplayName,
			profileKeyAvatarURL:   p.AvatarURL,
			profileKeyLocale:      p.Locale,
			profileKeyTimezone:    p.Timezone,
			profileKeyBio:         p.Bio,
			profileKeyEmail:       email,
		},
	}
}

func toUsersProfile(id uuid.UUID, profile UserProfile, scope users.ScopeFilter) users.UserProfile {
	return users.UserProfile{
		UserID:      id,
		DisplayName: profile.DisplayName,
		AvatarURL:   profile.AvatarURL,
		Locale:      profile.Locale,
		Timezone:    profile.Timezone,
		Bio:         profile.Bio,
		Contact:     mergeAnyMaps(profile.Contact, map[string]any{profileKeyEmail: profile.Email}),
		Metadata:    cloneAnyMap(profile.Metadata),
		Scope:       scope,
	}
}
