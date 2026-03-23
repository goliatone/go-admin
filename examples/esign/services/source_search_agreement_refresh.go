package services

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

type SourceSearchAgreementRefreshService struct {
	agreements stores.AgreementStore
	documents  stores.DocumentStore
	lineage    stores.LineageStore
	search     SourceSearchService
}

func NewSourceSearchAgreementRefreshService(
	agreements stores.AgreementStore,
	documents stores.DocumentStore,
	lineage stores.LineageStore,
	search SourceSearchService,
) SourceSearchAgreementRefreshService {
	return SourceSearchAgreementRefreshService{
		agreements: agreements,
		documents:  documents,
		lineage:    lineage,
		search:     search,
	}
}

func (s SourceSearchAgreementRefreshService) RefreshAgreement(ctx context.Context, scope stores.Scope, agreementID string) error {
	if s.agreements == nil || s.documents == nil || s.lineage == nil || s.search == nil {
		return nil
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil
	}
	agreement, err := s.agreements.GetAgreement(ctx, scope, agreementID)
	if err != nil {
		observability.ObserveSourceAgreementTitleRefresh(ctx, false)
		observability.ObserveSourceSearchFreshness(ctx, "agreement_title", false)
		return err
	}
	sourceDocumentID := ""
	if revisionID := strings.TrimSpace(agreement.SourceRevisionID); revisionID != "" {
		if revision, revisionErr := s.lineage.GetSourceRevision(ctx, scope, revisionID); revisionErr == nil {
			sourceDocumentID = strings.TrimSpace(revision.SourceDocumentID)
		}
	}
	if sourceDocumentID == "" && strings.TrimSpace(agreement.DocumentID) != "" {
		document, documentErr := s.documents.Get(ctx, scope, agreement.DocumentID)
		if documentErr == nil {
			sourceDocumentID = strings.TrimSpace(document.SourceDocumentID)
		}
	}
	if sourceDocumentID == "" {
		return nil
	}
	_, err = s.search.ReindexSourceDocument(ctx, scope, sourceDocumentID)
	observability.ObserveSourceAgreementTitleRefresh(ctx, err == nil)
	observability.ObserveSourceSearchFreshness(ctx, "agreement_title", err == nil)
	return err
}
