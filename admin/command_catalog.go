package admin

import (
	"sort"

	"github.com/goliatone/go-command"
)

type commandCatalogProviderSet struct {
	providers []command.CatalogProvider
}

func commandCatalogProviders(providers ...command.CatalogProvider) command.CatalogProvider {
	filtered := make([]command.CatalogProvider, 0, len(providers))
	for _, provider := range providers {
		if isNilRegistrationValue(provider) {
			continue
		}
		filtered = append(filtered, provider)
	}
	if len(filtered) == 0 {
		return nil
	}
	if len(filtered) == 1 {
		return filtered[0]
	}
	return commandCatalogProviderSet{providers: filtered}
}

func (p commandCatalogProviderSet) CommandDescriptors() []command.CommandDescriptor {
	var out []command.CommandDescriptor
	for _, provider := range p.providers {
		if isNilRegistrationValue(provider) {
			continue
		}
		out = append(out, provider.CommandDescriptors()...)
	}
	return out
}

// CommandDescriptors returns the deterministic catalog snapshot contributed by
// all currently committed owner generations.
func (b *CommandBus) CommandDescriptors() []command.CommandDescriptor {
	if b == nil {
		return nil
	}
	b.mu.RLock()
	owners := make([]string, 0, len(b.owned))
	generations := make(map[string]*ownedCommandGeneration, len(b.owned))
	for owner, generation := range b.owned {
		owners = append(owners, owner)
		generations[owner] = generation
	}
	b.mu.RUnlock()
	sort.Strings(owners)

	var out []command.CommandDescriptor
	for _, owner := range owners {
		generation := generations[owner]
		if generation == nil || generation.registry == nil {
			continue
		}
		descriptors := generation.registry.CatalogDescriptors()
		sort.SliceStable(descriptors, func(i, j int) bool {
			return descriptors[i].ID < descriptors[j].ID
		})
		out = append(out, descriptors...)
	}
	return out
}
