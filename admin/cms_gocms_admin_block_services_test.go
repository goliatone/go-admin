package admin

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin/internal/cmsadapter"
	auth "github.com/goliatone/go-auth"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

type stubGoCMSAdminBlockReadService struct {
	definitions []cms.AdminBlockDefinitionRecord
	versions    []cms.AdminBlockDefinitionVersionRecord
	blocks      []cms.AdminBlockRecord
	defOpts     cms.AdminBlockDefinitionListOptions
	blockOpts   cms.AdminBlockListOptions
	versionsID  string
	defCnt      int
	blockCnt    int
	versionCnt  int
	defErr      error
	blockErr    error
	versionErr  error
}

func (s *stubGoCMSAdminBlockReadService) ListDefinitions(_ context.Context, opts cms.AdminBlockDefinitionListOptions) ([]cms.AdminBlockDefinitionRecord, int, error) {
	s.defCnt++
	s.defOpts = opts
	if s.defErr != nil {
		return nil, 0, s.defErr
	}
	return append([]cms.AdminBlockDefinitionRecord{}, s.definitions...), len(s.definitions), nil
}

func (s *stubGoCMSAdminBlockReadService) GetDefinition(_ context.Context, _ string, _ cms.AdminBlockDefinitionGetOptions) (*cms.AdminBlockDefinitionRecord, error) {
	return nil, nil
}

func (s *stubGoCMSAdminBlockReadService) ListDefinitionVersions(_ context.Context, definitionID string) ([]cms.AdminBlockDefinitionVersionRecord, error) {
	s.versionCnt++
	s.versionsID = definitionID
	if s.versionErr != nil {
		return nil, s.versionErr
	}
	return append([]cms.AdminBlockDefinitionVersionRecord{}, s.versions...), nil
}

func (s *stubGoCMSAdminBlockReadService) ListContentBlocks(_ context.Context, _ string, opts cms.AdminBlockListOptions) ([]cms.AdminBlockRecord, error) {
	s.blockCnt++
	s.blockOpts = opts
	if s.blockErr != nil {
		return nil, s.blockErr
	}
	return append([]cms.AdminBlockRecord{}, s.blocks...), nil
}

type stubGoCMSAdminBlockWriteService struct {
	createDefinitionResp *cms.AdminBlockDefinitionRecord
	updateDefinitionResp *cms.AdminBlockDefinitionRecord
	saveBlockResp        *cms.AdminBlockRecord
	createDefinitionReq  cms.AdminBlockDefinitionCreateRequest
	updateDefinitionReq  cms.AdminBlockDefinitionUpdateRequest
	deleteDefinitionReq  cms.AdminBlockDefinitionDeleteRequest
	saveBlockReq         cms.AdminBlockSaveRequest
	deleteBlockReq       cms.AdminBlockDeleteRequest
	createDefinitionCnt  int
	updateDefinitionCnt  int
	deleteDefinitionCnt  int
	saveBlockCnt         int
	deleteBlockCnt       int
	createDefinitionErr  error
	updateDefinitionErr  error
	deleteDefinitionErr  error
	saveBlockErr         error
	deleteBlockErr       error
}

func (s *stubGoCMSAdminBlockWriteService) CreateDefinition(_ context.Context, req cms.AdminBlockDefinitionCreateRequest) (*cms.AdminBlockDefinitionRecord, error) {
	s.createDefinitionCnt++
	s.createDefinitionReq = req
	if s.createDefinitionErr != nil {
		return nil, s.createDefinitionErr
	}
	if s.createDefinitionResp == nil {
		return nil, nil
	}
	record := *s.createDefinitionResp
	return &record, nil
}

func (s *stubGoCMSAdminBlockWriteService) UpdateDefinition(_ context.Context, req cms.AdminBlockDefinitionUpdateRequest) (*cms.AdminBlockDefinitionRecord, error) {
	s.updateDefinitionCnt++
	s.updateDefinitionReq = req
	if s.updateDefinitionErr != nil {
		return nil, s.updateDefinitionErr
	}
	if s.updateDefinitionResp == nil {
		return nil, nil
	}
	record := *s.updateDefinitionResp
	return &record, nil
}

func (s *stubGoCMSAdminBlockWriteService) DeleteDefinition(_ context.Context, req cms.AdminBlockDefinitionDeleteRequest) error {
	s.deleteDefinitionCnt++
	s.deleteDefinitionReq = req
	return s.deleteDefinitionErr
}

func (s *stubGoCMSAdminBlockWriteService) SaveBlock(_ context.Context, req cms.AdminBlockSaveRequest) (*cms.AdminBlockRecord, error) {
	s.saveBlockCnt++
	s.saveBlockReq = req
	if s.saveBlockErr != nil {
		return nil, s.saveBlockErr
	}
	if s.saveBlockResp == nil {
		return nil, nil
	}
	record := *s.saveBlockResp
	return &record, nil
}

func (s *stubGoCMSAdminBlockWriteService) DeleteBlock(_ context.Context, req cms.AdminBlockDeleteRequest) error {
	s.deleteBlockCnt++
	s.deleteBlockReq = req
	return s.deleteBlockErr
}

func TestGoCMSContentAdapterContentUsesAdminBlockReadServiceForLegacyFallback(t *testing.T) {
	ctx := WithEnvironment(context.Background(), "preview")
	contentID := uuid.New()
	definitionID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{
		getResp: &cms.AdminContentRecord{
			ID:              contentID,
			Title:           "Hello",
			Slug:            "hello",
			Locale:          "en",
			ContentType:     "post",
			ContentTypeSlug: "post",
			Status:          "draft",
			Data:            map[string]any{"body": "hello"},
		},
	}
	adminBlocks := &stubGoCMSAdminBlockReadService{
		blocks: []cms.AdminBlockRecord{{
			ID:             uuid.New(),
			DefinitionID:   definitionID,
			ContentID:      contentID,
			Region:         "main",
			Locale:         "en",
			Status:         "draft",
			Data:           map[string]any{"headline": "Hero"},
			Position:       1,
			BlockType:      "hero",
			BlockSchemaKey: "hero/v1",
		}},
	}

	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, adminRead, nil, adminBlocks, nil)
	adapter := svc.(*GoCMSContentAdapter)

	item, err := adapter.Content(ctx, contentID.String(), "en")
	if err != nil {
		t.Fatalf("content failed: %v", err)
	}
	if item == nil {
		t.Fatal("expected content")
	}
	if adminBlocks.blockCnt != 1 {
		t.Fatalf("expected one admin block read call, got %d", adminBlocks.blockCnt)
	}
	if adminBlocks.blockOpts.EnvironmentKey != "preview" {
		t.Fatalf("expected preview environment, got %q", adminBlocks.blockOpts.EnvironmentKey)
	}
	if len(item.EmbeddedBlocks) != 1 {
		t.Fatalf("expected one embedded block, got %d", len(item.EmbeddedBlocks))
	}
	if item.EmbeddedBlocks[0]["headline"] != "Hero" {
		t.Fatalf("expected embedded block data to be preserved, got %+v", item.EmbeddedBlocks[0])
	}
}

func TestGoCMSContentAdapterBlocksForContentUsesAdminBlockReadService(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	adminBlocks := &stubGoCMSAdminBlockReadService{
		blocks: []cms.AdminBlockRecord{{
			ID:             uuid.New(),
			DefinitionID:   uuid.New(),
			ContentID:      contentID,
			Region:         "sidebar",
			Locale:         "fr",
			Status:         "published",
			Data:           map[string]any{"headline": "Salut"},
			Position:       3,
			BlockType:      "promo",
			BlockSchemaKey: "promo/v1",
		}},
	}

	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, nil, adminBlocks, nil)
	adapter := svc.(*GoCMSContentAdapter)

	blocks, err := adapter.LegacyBlocksForContent(ctx, contentID.String(), "fr")
	if err != nil {
		t.Fatalf("legacy blocks failed: %v", err)
	}
	if len(blocks) != 1 {
		t.Fatalf("expected one block, got %d", len(blocks))
	}
	if blocks[0].BlockType != "promo" || blocks[0].BlockSchemaKey != "promo/v1" {
		t.Fatalf("expected block type/schema key to be preserved, got %+v", blocks[0])
	}
	if blocks[0].Data["headline"] != "Salut" {
		t.Fatalf("expected block data to be preserved, got %+v", blocks[0].Data)
	}
}

func TestGoCMSContentAdapterBlockDefinitionsUseAdminBlockReadService(t *testing.T) {
	ctx := WithContentChannel(context.Background(), "preview")
	description := "Reusable hero"
	icon := "hero"
	adminBlocks := &stubGoCMSAdminBlockReadService{
		definitions: []cms.AdminBlockDefinitionRecord{{
			ID:              uuid.New(),
			Name:            "Hero",
			Slug:            "hero",
			Type:            "hero",
			Description:     &description,
			Icon:            &icon,
			Category:        "marketing",
			Status:          "active",
			Channel:         "preview",
			Schema:          map[string]any{"type": "object"},
			UISchema:        map[string]any{"ui:order": []string{"headline"}},
			SchemaVersion:   "hero/v2",
			MigrationStatus: "current",
			Locale:          "en",
		}},
	}

	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, nil, adminBlocks, nil)
	adapter := svc.(*GoCMSContentAdapter)

	defs, err := adapter.BlockDefinitions(ctx)
	if err != nil {
		t.Fatalf("block definitions failed: %v", err)
	}
	if adminBlocks.defCnt != 1 {
		t.Fatalf("expected one admin definition read call, got %d", adminBlocks.defCnt)
	}
	if adminBlocks.defOpts.EnvironmentKey != "preview" {
		t.Fatalf("expected preview environment, got %q", adminBlocks.defOpts.EnvironmentKey)
	}
	if len(defs) != 1 {
		t.Fatalf("expected one definition, got %d", len(defs))
	}
	if defs[0].Name != "Hero" || cmsadapter.BlockDefinitionChannel(defs[0]) != "preview" {
		t.Fatalf("expected mapped definition, got %+v", defs[0])
	}
}

func TestGoCMSContentAdapterBlockDefinitionVersionsUseAdminBlockReadService(t *testing.T) {
	ctx := context.Background()
	definitionID := uuid.New()
	now := time.Now().UTC().Truncate(time.Second)
	adminBlocks := &stubGoCMSAdminBlockReadService{
		versions: []cms.AdminBlockDefinitionVersionRecord{{
			ID:              uuid.New(),
			DefinitionID:    definitionID,
			SchemaVersion:   "hero/v2",
			Schema:          map[string]any{"type": "object"},
			Defaults:        map[string]any{"headline": "Default"},
			MigrationStatus: "current",
			CreatedAt:       &now,
			UpdatedAt:       &now,
		}},
	}

	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, nil, adminBlocks, nil)
	adapter := svc.(*GoCMSContentAdapter)

	versions, err := adapter.BlockDefinitionVersions(ctx, definitionID.String())
	if err != nil {
		t.Fatalf("block definition versions failed: %v", err)
	}
	if adminBlocks.versionCnt != 1 || adminBlocks.versionsID != definitionID.String() {
		t.Fatalf("expected version lookup by %s, got count=%d id=%q", definitionID, adminBlocks.versionCnt, adminBlocks.versionsID)
	}
	if len(versions) != 1 {
		t.Fatalf("expected one version, got %d", len(versions))
	}
	if versions[0].DefinitionID != definitionID.String() || versions[0].SchemaVersion != "hero/v2" {
		t.Fatalf("expected mapped version, got %+v", versions[0])
	}
}

func TestGoCMSContentAdapterCreateBlockDefinitionUsesAdminBlockWriteService(t *testing.T) {
	ctx := WithEnvironment(context.Background(), "preview")
	definitionID := uuid.New()
	adminBlockW := &stubGoCMSAdminBlockWriteService{
		createDefinitionResp: &cms.AdminBlockDefinitionRecord{
			ID:            definitionID,
			Name:          "Hero",
			Slug:          "hero",
			Type:          "hero",
			Category:      "marketing",
			Status:        "active",
			Channel:       "preview",
			Schema:        map[string]any{"type": "object"},
			SchemaVersion: "hero/v1",
		},
	}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, nil, nil, adminBlockW)
	adapter := svc.(*GoCMSContentAdapter)

	created, err := adapter.CreateBlockDefinition(ctx, CMSBlockDefinition{
		Name:        "Hero",
		Slug:        "hero",
		Type:        "hero",
		Category:    "marketing",
		CategorySet: true,
		Status:      "active",
		Schema:      map[string]any{"type": "object"},
	})
	if err != nil {
		t.Fatalf("create block definition failed: %v", err)
	}
	if adminBlockW.createDefinitionCnt != 1 {
		t.Fatalf("expected one admin block write call, got %d", adminBlockW.createDefinitionCnt)
	}
	if adminBlockW.createDefinitionReq.EnvironmentKey != "preview" {
		t.Fatalf("expected preview environment, got %q", adminBlockW.createDefinitionReq.EnvironmentKey)
	}
	if created == nil || created.ID != definitionID.String() || created.Channel != "preview" {
		t.Fatalf("expected mapped created definition, got %+v", created)
	}
}

func TestGoCMSContentAdapterUpdateBlockDefinitionUsesAdminBlockWriteService(t *testing.T) {
	ctx := context.Background()
	definitionID := uuid.New()
	adminBlockW := &stubGoCMSAdminBlockWriteService{
		updateDefinitionResp: &cms.AdminBlockDefinitionRecord{
			ID:            definitionID,
			Name:          "Hero",
			Slug:          "hero",
			Type:          "hero",
			Category:      "",
			Status:        "inactive",
			Schema:        map[string]any{"type": "object"},
			SchemaVersion: "hero/v2",
		},
	}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, nil, nil, adminBlockW)
	adapter := svc.(*GoCMSContentAdapter)

	updated, err := adapter.UpdateBlockDefinition(ctx, CMSBlockDefinition{
		ID:          definitionID.String(),
		Name:        "Hero",
		Category:    "",
		CategorySet: true,
		Status:      "inactive",
	})
	if err != nil {
		t.Fatalf("update block definition failed: %v", err)
	}
	if adminBlockW.updateDefinitionCnt != 1 {
		t.Fatalf("expected one admin block update call, got %d", adminBlockW.updateDefinitionCnt)
	}
	if adminBlockW.updateDefinitionReq.ID != definitionID {
		t.Fatalf("expected definition id %s, got %+v", definitionID, adminBlockW.updateDefinitionReq)
	}
	if adminBlockW.updateDefinitionReq.Category == nil || *adminBlockW.updateDefinitionReq.Category != "" {
		t.Fatalf("expected explicit empty category clear, got %+v", adminBlockW.updateDefinitionReq.Category)
	}
	if updated == nil || !updated.CategorySet || updated.Category != "" {
		t.Fatalf("expected mapped updated definition with cleared category and preserved explicit category flag, got %+v", updated)
	}
}

func TestGoCMSContentAdapterSaveBlockUsesAdminBlockWriteService(t *testing.T) {
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: uuid.NewString()})
	definitionID := uuid.New()
	contentID := uuid.New()
	blockID := uuid.New()
	adminBlockW := &stubGoCMSAdminBlockWriteService{
		saveBlockResp: &cms.AdminBlockRecord{
			ID:             blockID,
			DefinitionID:   definitionID,
			ContentID:      contentID,
			Region:         "main",
			Locale:         "en",
			Status:         "draft",
			Data:           map[string]any{"headline": "Hero"},
			Position:       1,
			BlockType:      "hero",
			BlockSchemaKey: "hero/v1",
		},
	}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, nil, nil, adminBlockW)
	adapter := svc.(*GoCMSContentAdapter)

	created, err := adapter.SaveBlock(ctx, CMSBlock{
		DefinitionID: definitionID.String(),
		ContentID:    contentID.String(),
		Region:       "main",
		Locale:       "en",
		Status:       "draft",
		Data:         map[string]any{"headline": "Hero"},
		Position:     1,
	})
	if err != nil {
		t.Fatalf("save block failed: %v", err)
	}
	if adminBlockW.saveBlockCnt != 1 {
		t.Fatalf("expected one admin block save call, got %d", adminBlockW.saveBlockCnt)
	}
	if adminBlockW.saveBlockReq.DefinitionID != definitionID || adminBlockW.saveBlockReq.ContentID != contentID {
		t.Fatalf("expected definition/content ids to be preserved, got %+v", adminBlockW.saveBlockReq)
	}
	if created == nil || created.ID != blockID.String() || created.Data["headline"] != "Hero" {
		t.Fatalf("expected mapped saved block, got %+v", created)
	}
}

func TestGoCMSContentAdapterDeleteBlockUsesAdminBlockWriteService(t *testing.T) {
	actorID := uuid.New()
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: actorID.String()})
	blockID := uuid.New()
	adminBlockW := &stubGoCMSAdminBlockWriteService{}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, nil, nil, adminBlockW)
	adapter := svc.(*GoCMSContentAdapter)

	if err := adapter.DeleteBlock(ctx, blockID.String()); err != nil {
		t.Fatalf("delete block failed: %v", err)
	}
	if adminBlockW.deleteBlockCnt != 1 {
		t.Fatalf("expected one admin block delete call, got %d", adminBlockW.deleteBlockCnt)
	}
	if adminBlockW.deleteBlockReq.ID != blockID || adminBlockW.deleteBlockReq.DeletedBy != actorID || !adminBlockW.deleteBlockReq.HardDelete {
		t.Fatalf("expected hard delete with actor, got %+v", adminBlockW.deleteBlockReq)
	}
}
