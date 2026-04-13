package admin

// CMSContentServiceUnwrapper allows wrappers to expose their underlying content
// service so optional capabilities remain discoverable.
type CMSContentServiceUnwrapper interface {
	UnwrapCMSContentService() CMSContentService
}

// CMSContainerUnwrapper allows wrapped CMS containers to expose the underlying
// container for optional capability discovery.
type CMSContainerUnwrapper interface {
	UnwrapCMSContainer() CMSContainer
}

func resolveCMSContentTranslationCreator(service CMSContentService) (CMSContentTranslationCreator, bool) {
	for depth := 0; depth < 8 && service != nil; depth++ {
		if creator, ok := service.(CMSContentTranslationCreator); ok && creator != nil {
			return creator, true
		}
		unwrapper, ok := service.(CMSContentServiceUnwrapper)
		if !ok || unwrapper == nil {
			break
		}
		service = unwrapper.UnwrapCMSContentService()
	}
	return nil, false
}

func resolveCMSContentListOptionsService(service CMSContentService) (cmsContentListOptionsService, bool) {
	for depth := 0; depth < 8 && service != nil; depth++ {
		if reader, ok := service.(cmsContentListOptionsService); ok && reader != nil {
			return reader, true
		}
		unwrapper, ok := service.(CMSContentServiceUnwrapper)
		if !ok || unwrapper == nil {
			break
		}
		service = unwrapper.UnwrapCMSContentService()
	}
	return nil, false
}

func resolveCMSPageListOptionsService(service CMSContentService) (cmsPageListOptionsService, bool) {
	for depth := 0; depth < 8 && service != nil; depth++ {
		if reader, ok := service.(cmsPageListOptionsService); ok && reader != nil {
			return reader, true
		}
		unwrapper, ok := service.(CMSContentServiceUnwrapper)
		if !ok || unwrapper == nil {
			break
		}
		service = unwrapper.UnwrapCMSContentService()
	}
	return nil, false
}

func resolveCMSContentTypeCapability(service CMSContentService) CMSContentTypeService {
	for depth := 0; depth < 8 && service != nil; depth++ {
		if typed, ok := service.(CMSContentTypeService); ok && typed != nil {
			return typed
		}
		unwrapper, ok := service.(CMSContentServiceUnwrapper)
		if !ok || unwrapper == nil {
			break
		}
		service = unwrapper.UnwrapCMSContentService()
	}
	return nil
}

func resolveAdminLocaleCatalog(container CMSContainer) adminLocaleCatalog {
	for depth := 0; depth < 8 && container != nil; depth++ {
		if provider, ok := container.(adminLocaleCatalog); ok && provider != nil {
			return provider
		}
		unwrapper, ok := container.(CMSContainerUnwrapper)
		if !ok || unwrapper == nil {
			break
		}
		container = unwrapper.UnwrapCMSContainer()
	}
	return nil
}
