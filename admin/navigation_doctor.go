package admin

import (
	"context"
	"strings"

	navcontract "github.com/goliatone/go-admin/internal/navigation"
)

const (
	NavigationClassificationRendered              = navcontract.ClassificationRendered
	NavigationClassificationPersistedMissing      = navcontract.ClassificationPersistedMissing
	NavigationClassificationRawPresentNotRendered = navcontract.ClassificationRawPresentNotRendered
	NavigationClassificationPermissionFiltered    = navcontract.ClassificationPermissionFiltered
	NavigationClassificationCapabilityOmitted     = navcontract.ClassificationCapabilityOmitted
	NavigationClassificationRouteMissing          = navcontract.ClassificationRouteMissing
	NavigationClassificationStaleFields           = navcontract.ClassificationStaleFields
	NavigationClassificationAmbiguousDuplicate    = navcontract.ClassificationAmbiguousDuplicate
	NavigationClassificationRetired               = navcontract.ClassificationRetired
	NavigationClassificationCustom                = navcontract.ClassificationCustom
	NavigationClassificationUnsafeBroadMatch      = navcontract.ClassificationUnsafeBroadMatch
)

type NavigationClassification = navcontract.Classification
type NavigationOwner = navcontract.Owner

const (
	NavigationOwnerQuickstart = navcontract.OwnerQuickstart
	NavigationOwnerModule     = navcontract.OwnerModule
	NavigationOwnerHost       = navcontract.OwnerHost
	NavigationOwnerUser       = navcontract.OwnerUser
)

type NavigationDoctorExpectedItem struct {
	Item               MenuItem
	Owner              NavigationOwner
	OwnerID            string
	Retired            bool
	RouteMissing       bool
	CapabilityOmitted  bool
	PermissionFiltered bool
}

type NavigationDoctorOptions struct {
	MenuCode string
	Locale   string
	Expected []NavigationDoctorExpectedItem
}

type NavigationDoctorItem = navcontract.ClassifiedItem

type NavigationDoctorReport = navcontract.ClassificationReport

func NavigationClassifications() []NavigationClassification {
	return navcontract.AllClassifications()
}

func ClassifyNavigation(expected []NavigationDoctorExpectedItem, rendered, raw []MenuItem) NavigationDoctorReport {
	return navcontract.Classify(navigationExpectedContractItems(expected), navigationContractItems(rendered), navigationContractItems(raw))
}

func (a *Admin) DiagnoseNavigation(ctx context.Context, opts NavigationDoctorOptions) (NavigationDoctorReport, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if a == nil || a.menuSvc == nil {
		return NavigationDoctorReport{
			EngineIdentity: navcontract.EngineIdentity,
			EngineVersion:  navcontract.EngineVersion,
		}, nil
	}
	menuCode := strings.TrimSpace(opts.MenuCode)
	if menuCode == "" {
		menuCode = a.navMenuCode
	}
	if menuCode == "" {
		menuCode = NormalizeMenuSlug("admin.main")
	}
	locale := strings.TrimSpace(opts.Locale)
	if locale == "" {
		locale = a.config.DefaultLocale
	}
	rendered := []MenuItem{}
	if menu, err := a.menuSvc.Menu(ctx, menuCode, locale); err == nil && menu != nil {
		rendered = flattenPersistedMenuItems(menu.Items)
	} else if err != nil {
		return NavigationDoctorReport{}, err
	}
	raw := []MenuItem{}
	if provider, ok := a.menuSvc.(rawMenuItemsProvider); ok && provider != nil {
		items, err := provider.RawMenuItems(ctx, menuCode)
		if err != nil {
			return NavigationDoctorReport{}, err
		}
		raw = flattenPersistedMenuItems(items)
	}
	return ClassifyNavigation(opts.Expected, rendered, raw), nil
}

func navigationExpectedContractItems(items []NavigationDoctorExpectedItem) []navcontract.ExpectedItem {
	out := make([]navcontract.ExpectedItem, 0, len(items))
	for _, item := range items {
		out = append(out, navcontract.ExpectedItem{
			Item:               navigationContractItem(item.Item),
			Owner:              item.Owner,
			OwnerID:            item.OwnerID,
			Retired:            item.Retired,
			RouteMissing:       item.RouteMissing,
			CapabilityOmitted:  item.CapabilityOmitted,
			PermissionFiltered: item.PermissionFiltered,
		})
	}
	return out
}
