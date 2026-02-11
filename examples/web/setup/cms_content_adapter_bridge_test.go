package setup

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/google/uuid"
)

type optionCapableBridgeContentServiceStub struct {
	listOpts []bridgeOptionToken
	getOpts  []bridgeOptionToken
}

type optionCapableBridgeContentRecordStub struct {
	ID           uuid.UUID
	Translations []optionCapableBridgeTranslationStub
}

type optionCapableBridgeTranslationStub struct {
	LocaleCode string
	Title      string
	Content    map[string]any
}

type bridgeOptionToken string

func (s *optionCapableBridgeContentServiceStub) List(_ context.Context, opts ...bridgeOptionToken) ([]optionCapableBridgeContentRecordStub, error) {
	s.listOpts = append([]bridgeOptionToken{}, opts...)
	return []optionCapableBridgeContentRecordStub{}, nil
}

func (s *optionCapableBridgeContentServiceStub) Get(_ context.Context, id uuid.UUID, opts ...bridgeOptionToken) (*optionCapableBridgeContentRecordStub, error) {
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
