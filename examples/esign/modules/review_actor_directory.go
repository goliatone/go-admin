package modules

import (
	"context"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

type reviewActorDirectory struct {
	users    *coreadmin.UserManagementService
	profiles *coreadmin.ProfileService
}

func newReviewActorDirectory(adm *coreadmin.Admin) services.ReviewActorDirectory {
	if adm == nil {
		return nil
	}
	users := adm.UserService()
	profiles := adm.ProfileService()
	if users == nil && profiles == nil {
		return nil
	}
	return reviewActorDirectory{
		users:    users,
		profiles: profiles,
	}
}

func (d reviewActorDirectory) ResolveReviewActors(ctx context.Context, scope stores.Scope, refs []services.ReviewActorRef) ([]services.ReviewActorInfo, error) {
	_ = scope
	if len(refs) == 0 {
		return nil, nil
	}
	out := make([]services.ReviewActorInfo, 0, len(refs))
	seen := make(map[string]struct{}, len(refs))
	for _, ref := range refs {
		actorID := strings.TrimSpace(ref.ActorID)
		if actorID == "" {
			continue
		}
		actorType := strings.ToLower(strings.TrimSpace(ref.ActorType))
		if actorType == "sender" {
			actorType = "user"
		}
		if actorType != "user" {
			continue
		}
		key := actorType + ":" + actorID
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		actor, ok := d.resolveUserActor(ctx, actorID)
		if !ok {
			continue
		}
		out = append(out, actor)
	}
	return out, nil
}

func (d reviewActorDirectory) resolveUserActor(ctx context.Context, actorID string) (services.ReviewActorInfo, bool) {
	info := services.ReviewActorInfo{
		ActorType: "user",
		ActorID:   strings.TrimSpace(actorID),
		Role:      "sender",
	}
	if info.ActorID == "" {
		return services.ReviewActorInfo{}, false
	}
	if d.profiles != nil {
		if profile, err := d.profiles.Get(ctx, info.ActorID); err == nil {
			info.Name = firstNonEmptyReviewActorValue(profile.DisplayName, profile.Email)
			info.Email = strings.TrimSpace(profile.Email)
		}
	}
	if d.users != nil {
		if user, err := d.users.GetUser(ctx, info.ActorID); err == nil {
			if info.Name == "" {
				info.Name = firstNonEmptyReviewActorValue(reviewActorUserDisplayName(user), user.Email, user.Username)
			}
			if info.Email == "" {
				info.Email = strings.TrimSpace(user.Email)
			}
		}
	}
	if info.Name == "" && info.Email == "" {
		return services.ReviewActorInfo{}, false
	}
	return info, true
}

func reviewActorUserDisplayName(user coreadmin.UserRecord) string {
	return firstNonEmptyReviewActorValue(strings.TrimSpace(strings.Join([]string{
		strings.TrimSpace(user.FirstName),
		strings.TrimSpace(user.LastName),
	}, " ")), user.Username, user.Email)
}

func firstNonEmptyReviewActorValue(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
