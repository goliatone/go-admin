package setup

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/google/uuid"
)

type optionCapableBridgeContentServiceStub struct {
	listOpts             []bridgeOptionToken
	getOpts              []bridgeOptionToken
	createTranslationReq bridgeCreateTranslationRequestStub
	createTranslationRes *optionCapableBridgeContentRecordStub
	createTranslationErr error
	createTranslationCnt int
}

type optionCapableBridgeContentRecordStub struct {
	ID           uuid.UUID
	Slug         string
	Status       string
	Translations []optionCapableBridgeTranslationStub
}

type optionCapableBridgeTranslationStub struct {
	LocaleCode         string
	Title              string
	Content            map[string]any
	TranslationGroupID *uuid.UUID
}

type bridgeOptionToken string

type bridgeCreateTranslationRequestStub struct {
	ContentID       uuid.UUID
	SourceID        uuid.UUID
	ID              uuid.UUID
	Locale          string
	TargetLocale    string
	EnvironmentKey  string
	ContentType     string
	ContentTypeSlug string
	Status          string
}

func (s *optionCapableBridgeContentServiceStub) List(_ context.Context, opts ...bridgeOptionToken) ([]optionCapableBridgeContentRecordStub, error) {
	s.listOpts = append([]bridgeOptionToken{}, opts...)
	return []optionCapableBridgeContentRecordStub{}, nil
}

func (s *optionCapableBridgeContentServiceStub) Get(_ context.Context, id uuid.UUID, opts ...bridgeOptionToken) (*optionCapableBridgeContentRecordStub, error) {
	s.getOpts = append([]bridgeOptionToken{}, opts...)
	return &optionCapableBridgeContentRecordStub{ID: id}, nil
}

func (s *optionCapableBridgeContentServiceStub) CreateTranslation(_ context.Context, req bridgeCreateTranslationRequestStub) (*optionCapableBridgeContentRecordStub, error) {
	s.createTranslationCnt++
	s.createTranslationReq = req
	if s.createTranslationErr != nil {
		return nil, s.createTranslationErr
	}
	if s.createTranslationRes != nil {
		return s.createTranslationRes, nil
	}
	return nil, admin.ErrNotFound
}

type optionCapableBridgeContentServiceNoTranslationStub struct {
	listOpts []bridgeOptionToken
	getOpts  []bridgeOptionToken
}

func (s *optionCapableBridgeContentServiceNoTranslationStub) List(_ context.Context, opts ...bridgeOptionToken) ([]optionCapableBridgeContentRecordStub, error) {
	s.listOpts = append([]bridgeOptionToken{}, opts...)
	return []optionCapableBridgeContentRecordStub{}, nil
}

func (s *optionCapableBridgeContentServiceNoTranslationStub) Get(_ context.Context, id uuid.UUID, opts ...bridgeOptionToken) (*optionCapableBridgeContentRecordStub, error) {
	s.getOpts = append([]bridgeOptionToken{}, opts...)
	return &optionCapableBridgeContentRecordStub{ID: id}, nil
}

type legacyBridgeContentServiceStub struct{}

func (s *legacyBridgeContentServiceStub) List(_ context.Context, locale string) ([]optionCapableBridgeContentRecordStub, error) {
	return []optionCapableBridgeContentRecordStub{}, nil
}

func (s *legacyBridgeContentServiceStub) Get(_ context.Context, id uuid.UUID, locale string) (*optionCapableBridgeContentRecordStub, error) {
	return &optionCapableBridgeContentRecordStub{ID: id}, nil
}

func TestNewGoCMSContentBridgeRejectsLegacyContentServiceSignatures(t *testing.T) {
	bridge := newGoCMSContentBridge(&legacyBridgeContentServiceStub{}, nil, nil, uuid.Nil, nil, nil)
	if bridge != nil {
		t.Fatalf("expected bridge to be disabled for legacy non-option signatures")
	}
}

func TestNewGoCMSContentBridgeAcceptsOptionCapableContentServiceSignatures(t *testing.T) {
	bridge := newGoCMSContentBridge(&optionCapableBridgeContentServiceStub{}, nil, nil, uuid.Nil, nil, nil)
	if bridge == nil {
		t.Fatalf("expected bridge for option-capable signatures")
	}
}

func TestGoCMSContentBridgeAddsDerivedProjectionWhenTranslationsAreRequested(t *testing.T) {
	ctx := context.Background()
	contentSvc := &optionCapableBridgeContentServiceStub{}
	bridge := newGoCMSContentBridge(contentSvc, nil, nil, uuid.Nil, nil, nil)
	if bridge == nil {
		t.Fatalf("expected bridge for option-capable signatures")
	}

	_, err := bridge.Pages(ctx, "en")
	if err != nil {
		t.Fatalf("pages list failed: %v", err)
	}
	if len(contentSvc.listOpts) != 2 {
		t.Fatalf("expected two list options, got %#v", contentSvc.listOpts)
	}
	if string(contentSvc.listOpts[0]) != string(admin.WithTranslations()) {
		t.Fatalf("expected translations option first, got %#v", contentSvc.listOpts)
	}
	if string(contentSvc.listOpts[1]) != string(admin.WithDerivedFields()) {
		t.Fatalf("expected derived-fields projection option, got %#v", contentSvc.listOpts)
	}
}

func TestGoCMSContentBridgeContentAlwaysRequestsTranslationsAndDerivedProjection(t *testing.T) {
	ctx := context.Background()
	contentSvc := &optionCapableBridgeContentServiceStub{}
	bridge := newGoCMSContentBridge(contentSvc, nil, nil, uuid.Nil, nil, nil)
	if bridge == nil {
		t.Fatalf("expected bridge for option-capable signatures")
	}

	_, err := bridge.Content(ctx, uuid.NewString(), "en")
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	if len(contentSvc.getOpts) != 2 {
		t.Fatalf("expected two get options, got %#v", contentSvc.getOpts)
	}
	if string(contentSvc.getOpts[0]) != string(admin.WithTranslations()) {
		t.Fatalf("expected translations option first, got %#v", contentSvc.getOpts)
	}
	if string(contentSvc.getOpts[1]) != string(admin.WithDerivedFields()) {
		t.Fatalf("expected derived-fields projection option, got %#v", contentSvc.getOpts)
	}
}

func TestGoCMSContentBridgeCreateTranslationUsesOptionalCommand(t *testing.T) {
	ctx := context.Background()
	sourceID := uuid.New()
	groupID := uuid.New()
	contentSvc := &optionCapableBridgeContentServiceStub{
		createTranslationRes: &optionCapableBridgeContentRecordStub{
			ID:     uuid.New(),
			Slug:   "post-fr",
			Status: "draft",
			Translations: []optionCapableBridgeTranslationStub{
				{
					LocaleCode:         "en",
					Title:              "Hello",
					Content:            map[string]any{"body": "hello"},
					TranslationGroupID: &groupID,
				},
				{
					LocaleCode:         "fr",
					Title:              "Bonjour",
					Content:            map[string]any{"body": "bonjour"},
					TranslationGroupID: &groupID,
				},
			},
		},
	}
	bridge := newGoCMSContentBridge(contentSvc, nil, nil, uuid.Nil, nil, nil)
	if bridge == nil {
		t.Fatalf("expected bridge for option-capable signatures")
	}
	creator, ok := bridge.(admin.CMSContentTranslationCreator)
	if !ok {
		t.Fatalf("expected bridge to implement CMSContentTranslationCreator")
	}

	created, err := creator.CreateTranslation(ctx, admin.TranslationCreateInput{
		SourceID:    sourceID.String(),
		Locale:      "fr",
		Environment: "staging",
		ContentType: "posts",
		Status:      "draft",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if contentSvc.createTranslationCnt != 1 {
		t.Fatalf("expected one create translation call, got %d", contentSvc.createTranslationCnt)
	}
	if contentSvc.createTranslationReq.ContentID != sourceID {
		t.Fatalf("expected source id %s, got %s", sourceID.String(), contentSvc.createTranslationReq.ContentID.String())
	}
	if contentSvc.createTranslationReq.Locale != "fr" {
		t.Fatalf("expected locale fr, got %q", contentSvc.createTranslationReq.Locale)
	}
	if contentSvc.createTranslationReq.EnvironmentKey != "staging" {
		t.Fatalf("expected environment staging, got %q", contentSvc.createTranslationReq.EnvironmentKey)
	}
	if created == nil {
		t.Fatalf("expected created record")
	}
	if created.Locale != "fr" {
		t.Fatalf("expected locale fr, got %q", created.Locale)
	}
	if len(created.AvailableLocales) != 2 {
		t.Fatalf("expected available locales hydrated, got %#v", created.AvailableLocales)
	}
}

func TestGoCMSContentBridgeCreateTranslationReturnsUnsupportedWhenCommandMissing(t *testing.T) {
	ctx := context.Background()
	contentSvc := &optionCapableBridgeContentServiceNoTranslationStub{}
	bridge := newGoCMSContentBridge(contentSvc, nil, nil, uuid.Nil, nil, nil)
	if bridge == nil {
		t.Fatalf("expected bridge for option-capable signatures")
	}
	creator, ok := bridge.(admin.CMSContentTranslationCreator)
	if !ok {
		t.Fatalf("expected bridge to implement CMSContentTranslationCreator")
	}
	_, err := creator.CreateTranslation(ctx, admin.TranslationCreateInput{
		SourceID: uuid.NewString(),
		Locale:   "fr",
	})
	if !errors.Is(err, admin.ErrTranslationCreateUnsupported) {
		t.Fatalf("expected ErrTranslationCreateUnsupported, got %v", err)
	}
}
