package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func main() {
	tenantID := flag.String("tenant-id", "", "tenant scope id")
	orgID := flag.String("org-id", "", "org scope id")
	agreementID := flag.String("agreement-id", "", "agreement id")
	recipientID := flag.String("recipient-id", "", "recipient id")
	flag.Parse()

	scope := stores.Scope{
		TenantID: strings.TrimSpace(*tenantID),
		OrgID:    strings.TrimSpace(*orgID),
	}
	agreement := strings.TrimSpace(*agreementID)
	recipient := strings.TrimSpace(*recipientID)
	if scope.TenantID == "" || scope.OrgID == "" || agreement == "" || recipient == "" {
		flag.Usage()
		log.Fatal("tenant-id, org-id, agreement-id, and recipient-id are required")
	}

	cfg, err := appcfg.Load()
	if err != nil {
		log.Fatalf("load runtime config: %v", err)
	}
	bootstrap, err := esignpersistence.Bootstrap(context.Background(), cfg)
	if err != nil {
		log.Fatalf("bootstrap persistence: %v", err)
	}
	defer func() {
		_ = bootstrap.Close()
	}()
	store, cleanup, err := esignpersistence.NewStoreAdapter(bootstrap)
	if err != nil {
		log.Fatalf("initialize runtime store: %v", err)
	}
	defer func() {
		if cleanup != nil {
			_ = cleanup()
		}
	}()

	tokens := stores.NewTokenService(store)
	issued, err := tokens.Issue(context.Background(), scope, agreement, recipient)
	if err != nil {
		log.Fatalf("issue signing token: %v", err)
	}
	_, _ = fmt.Fprintln(os.Stdout, strings.TrimSpace(issued.Token))
}
