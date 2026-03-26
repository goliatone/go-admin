package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/stores"
	glog "github.com/goliatone/go-logger/glog"
)

func main() {
	logger := glog.NewLogger(
		glog.WithName("esign.issue_signing_token"),
		glog.WithLoggerTypeConsole(),
	)

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
		logger.Fatal("tenant-id, org-id, agreement-id, and recipient-id are required")
	}

	cfg, err := appcfg.Load()
	if err != nil {
		logger.Fatal("load runtime config failed", "error", err)
	}
	store, cleanup, err := esignpersistence.OpenStore(context.Background(), cfg)
	if err != nil {
		logger.Fatal("initialize runtime store failed", "error", err)
	}
	defer func() {
		if cleanup != nil {
			_ = cleanup()
		}
	}()

	tokens := stores.NewTokenService(store)
	issued, err := tokens.Issue(context.Background(), scope, agreement, recipient)
	if err != nil {
		logger.Fatal("issue signing token failed", "error", err)
	}
	_, _ = fmt.Fprintln(os.Stdout, strings.TrimSpace(issued.Token))
}
