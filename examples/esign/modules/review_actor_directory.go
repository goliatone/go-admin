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
	info.Name, info.Email = d.resolveProfileActor(ctx, info.ActorID)
	info.Name, info.Email = d.resolveAccountActor(ctx, info.ActorID, info.Name, info.Email)
	if info.Name == "" && info.Email == "" {
		return services.ReviewActorInfo{}, false
	}
	return info, true
}

func (d reviewActorDirectory) resolveProfileActor(ctx context.Context, actorID string) (string, string) {
	if d.profiles == nil {
		return "", ""
	}
	profile, err := d.profiles.Get(ctx, actorID)
	if err != nil {
		return "", ""
	}
	return firstNonEmptyReviewActorValue(profile.DisplayName, profile.Email), strings.TrimSpace(profile.Email)
}

func (d reviewActorDirectory) resolveAccountActor(ctx context.Context, actorID, name, email string) (string, string) {
	if d.users == nil {
		return name, email
	}
	user, err := d.users.GetUser(ctx, actorID)
	if err != nil {
		return name, email
	}
	if name == "" {
		name = firstNonEmptyReviewActorValue(reviewActorUserDisplayName(user), user.Email, user.Username)
	}
	if email == "" {
		email = strings.TrimSpace(user.Email)
	}
	return name, email
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
