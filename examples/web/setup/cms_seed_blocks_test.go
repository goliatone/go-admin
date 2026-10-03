package setup

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	cmsblocks "github.com/goliatone/go-cms/blocks"
	goerrors "github.com/goliatone/go-errors"
)

type seedBlockService struct {
	admin.CMSContentService
	definitions      []admin.CMSBlockDefinition
	createErr        error
	updateErr        error
	publishConflict  bool
	creates, updates int
}

func (s *seedBlockService) BlockDefinitions(context.Context) ([]admin.CMSBlockDefinition, error) {
	return s.definitions, nil
}
func (s *seedBlockService) CreateBlockDefinition(_ context.Context, def admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	s.creates++
	if s.publishConflict || s.createErr == nil {
		s.definitions = append(s.definitions, def)
	}
	return &def, s.createErr
}
func (s *seedBlockService) UpdateBlockDefinition(_ context.Context, def admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	s.updates++
	return &def, s.updateErr
}

func TestSeedCMSBlockDefinitionsPropagatesRecoveryFailures(t *testing.T) {
	updateFailure := errors.New("database is locked")
	wrappedConflict := goerrors.Wrap(cmsblocks.ErrDefinitionExists, goerrors.CategoryOperation, "create failed")
	for _, tc := range []struct {
		name    string
		svc     seedBlockService
		want    error
		updates int
	}{
		{"failed update", seedBlockService{createErr: wrappedConflict, publishConflict: true, updateErr: updateFailure}, updateFailure, 1},
		{"unresolved duplicate", seedBlockService{createErr: wrappedConflict}, cmsblocks.ErrDefinitionExists, 0},
		{"unrelated create", seedBlockService{createErr: updateFailure}, updateFailure, 0},
		{"mixed conflict and cancellation", seedBlockService{createErr: errors.Join(wrappedConflict, context.Canceled), publishConflict: true}, context.Canceled, 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := seedCMSBlockDefinitions(context.Background(), &tc.svc, "en")
			if !errors.Is(err, tc.want) {
				t.Fatalf("lost failure: got %v, want %v", err, tc.want)
			}
			if tc.svc.updates != tc.updates {
				t.Fatalf("unexpected recovery calls: %d", tc.svc.updates)
			}
		})
	}
}

func TestSeedCMSBlockDefinitionsRecoversWrappedConflict(t *testing.T) {
	svc := &seedBlockService{createErr: goerrors.Wrap(cmsblocks.ErrDefinitionSlugExists, goerrors.CategoryOperation, "create failed"), publishConflict: true}
	if err := seedCMSBlockDefinitions(context.Background(), svc, "en"); err != nil {
		t.Fatal(err)
	}
	if svc.creates == 0 || svc.creates != svc.updates {
		t.Fatalf("incomplete conflict recovery: creates=%d updates=%d", svc.creates, svc.updates)
	}
}

func TestSeedCMSBlockDefinitionsMissingUpdateCreatesReplacement(t *testing.T) {
	svc := &seedBlockService{definitions: []admin.CMSBlockDefinition{{ID: "hero", Name: "Hero", Environment: "default"}}, updateErr: goerrors.Wrap(admin.ErrNotFound, goerrors.CategoryNotFound, "definition disappeared")}
	if err := seedCMSBlockDefinitions(context.Background(), svc, "en"); err != nil {
		t.Fatal(err)
	}
	if svc.updates != 1 || svc.creates == 0 {
		t.Fatalf("missing target was not replaced: %+v", svc)
	}
}
