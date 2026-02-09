package admin

func applyUserProfileDefaults(profile UserProfile, defaultLocale string) UserProfile {
	if profile.Locale == "" {
		profile.Locale = defaultLocale
	}
	return profile
}

func userProfileToRecord(profile UserProfile) map[string]any {
	record := map[string]any{
		"id":                  profile.UserID,
		profileKeyDisplayName: profile.DisplayName,
		profileKeyEmail:       profile.Email,
		profileKeyAvatarURL:   profile.AvatarURL,
		profileKeyLocale:      profile.Locale,
		profileKeyTimezone:    profile.Timezone,
		profileKeyBio:         profile.Bio,
	}
	if len(profile.Contact) > 0 {
		record["contact"] = cloneAnyMap(profile.Contact)
	}
	if len(profile.Metadata) > 0 {
		record["metadata"] = cloneAnyMap(profile.Metadata)
		if avatar := extractMap(profile.Metadata[profileKeyAvatar]); len(avatar) > 0 {
			record[profileKeyAvatar] = cloneAnyMap(avatar)
		}
	}
	return record
}

func userProfileFromRecord(record map[string]any) UserProfile {
	profile := UserProfile{
		Raw: cloneAnyMap(record),
	}
	if val, ok := record[profileKeyDisplayName]; ok {
		profile.DisplayName = toString(val)
	}
	if val, ok := record[profileKeyEmail]; ok {
		profile.Email = toString(val)
	}
	if val, ok := record[profileKeyAvatarURL]; ok {
		profile.AvatarURL = toString(val)
	}
	if val, ok := record[profileKeyLocale]; ok {
		profile.Locale = toString(val)
	}
	if val, ok := record[profileKeyTimezone]; ok {
		profile.Timezone = toString(val)
	}
	if val, ok := record[profileKeyBio]; ok {
		profile.Bio = toString(val)
	}
	if contact := extractMap(record["contact"]); len(contact) > 0 {
		profile.Contact = cloneAnyMap(contact)
	}
	if metadata := extractMap(record["metadata"]); len(metadata) > 0 {
		profile.Metadata = cloneAnyMap(metadata)
	}
	if avatar := extractMap(record[profileKeyAvatar]); len(avatar) > 0 {
		if profile.Metadata == nil {
			profile.Metadata = map[string]any{}
		}
		profile.Metadata[profileKeyAvatar] = cloneAnyMap(avatar)
	}
	return profile
}
