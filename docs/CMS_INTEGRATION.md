# go-admin CMS Integration Guide

This guide shows how to wire a real go-cms container into go-admin, replacing the in-memory NoopCMSContainer used by default.

## Steps
1) **Instantiate go-cms container** in your host app (repository/storage, widget/menu services, i18n).
2) **Pass it to admin** before `Initialize`:
```go
cmsContainer := buildCMSContainer(...) // your go-cms wiring
adm, err := admin.New(admin.Config{
    BasePath:      "/admin",
    DefaultLocale: "en",
    CMS: admin.CMSOptions{GoCMSConfig: cmsCfg}, // or CMS.Container when you already built it
}, admin.Dependencies{
    FeatureGate: resolver.New(resolver.WithDefaults(configadapter.NewDefaultsFromBools(map[string]bool{
        string(admin.FeatureCMS):       true,
        string(admin.FeatureDashboard): true,
    }))),
})
if err != nil {
    return err
}
adm.UseCMS(cmsContainer)
// optional: adm.WithTranslator(goi18nTranslator)
// register modules, then Initialize
```
3) **Menu & widget resolution**: navigation (`/api/navigation`) and dashboard widgets resolve via go-cms services. Modules contributing menus will call `CMSMenuService.AddMenuItem` on the real service. When the container exposes a raw go-cms menu service (`GoCMSMenuProvider`), admin wraps it with `GoCMSMenuAdapter` so menu metadata (icons/badges/styles/permissions/targets) flows through unchanged.
4) **Widget persistence**: `GoCMSWidgetAdapter` uses reflection to register definitions/areas and instances against go-cms, keeping the same Dashboard resolution path while defaulting to in-memory when the service isn’t present.
5) **Templates/pages**: go-cms page/block/widget routes should reuse the same authenticator/authorizer as admin; mount them under your router alongside admin.

## Testing the integration path
- Use the provided `UseCMS` setter with a stub container in tests to assert navigation/widget resolution uses CMS services.
- Example pattern:
```go
stub := &stubCMSContainer{menu: stubMenuService{items: ...}, widgets: stubWidgetService{}}
adm, err := admin.New(admin.Config{
    DefaultLocale: "en",
}, admin.Dependencies{
    FeatureGate: resolver.New(resolver.WithDefaults(configadapter.NewDefaultsFromBools(map[string]bool{
        string(admin.FeatureCMS): true,
    }))),
})
if err != nil {
    return err
}
adm.UseCMS(stub)
adm.Initialize(router)
// assert navigation comes from stub.menu
```
