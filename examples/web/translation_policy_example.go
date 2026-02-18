package main

import (
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
)

func exampleTranslationPolicyConfig() quickstart.TranslationPolicyConfig {
	return quickstart.TranslationPolicyConfig{
		RequiredFieldsStrategy: admin.RequiredFieldsValidationError,
		PageEntities:           []string{"pages"},
		Required: map[string]quickstart.TranslationPolicyEntityConfig{
			"pages": {
				"publish": {
					Locales: []string{"en", "es", "fr"},
					RequiredFields: map[string][]string{
						"en": {"title", "path"},
						"es": {"title", "path"},
						"fr": {"title", "path"},
					},
					Environments: map[string]quickstart.TranslationCriteria{
						"staging": {
							Locales: []string{"en", "es"},
							RequiredFields: map[string][]string{
								"en": {"title", "path"},
								"es": {"title", "path"},
							},
						},
						"production": {
							Locales: []string{"en", "es", "fr"},
							RequiredFields: map[string][]string{
								"en": {"title", "path"},
								"es": {"title", "path"},
								"fr": {"title", "path"},
							},
						},
					},
				},
			},
			"posts": {
				"publish": {
					Locales: []string{"en", "es", "fr"},
					RequiredFields: map[string][]string{
						"en": {"title", "path", "excerpt"},
						"es": {"title", "path", "excerpt"},
						"fr": {"title", "path", "excerpt"},
					},
					Environments: map[string]quickstart.TranslationCriteria{
						"staging": {
							Locales: []string{"en", "es"},
							RequiredFields: map[string][]string{
								"en": {"title", "path", "excerpt"},
								"es": {"title", "path", "excerpt"},
							},
						},
						"production": {
							Locales: []string{"en", "es", "fr"},
							RequiredFields: map[string][]string{
								"en": {"title", "path", "excerpt"},
								"es": {"title", "path", "excerpt"},
								"fr": {"title", "path", "excerpt"},
							},
						},
					},
				},
			},
		},
	}
}

func exampleTranslationPolicyValidationCatalog() quickstart.TranslationPolicyValidationCatalog {
	return quickstart.TranslationPolicyValidationCatalog{
		Entities: map[string]quickstart.TranslationPolicyEntityCatalog{
			"pages": {
				Transitions: map[string]quickstart.TranslationPolicyTransitionCatalog{
					"publish": {
						RequiredFields: []string{
							"title",
							"slug",
							"path",
							"content",
							"template_id",
							"parent_id",
							"meta_title",
							"meta_description",
							"blocks",
						},
					},
				},
			},
			"posts": {
				Transitions: map[string]quickstart.TranslationPolicyTransitionCatalog{
					"publish": {
						RequiredFields: []string{
							"title",
							"slug",
							"path",
							"content",
							"excerpt",
							"category",
							"featured_image",
							"tags",
							"meta_title",
							"meta_description",
							"author",
						},
					},
				},
			},
		},
	}
}
