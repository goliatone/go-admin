package admin

// BuiltinIconoirLibrary returns the default Iconoir library configuration
// with a curated set of sidebar/navigation icons.
func BuiltinIconoirLibrary() IconLibrary {
	return IconLibrary{
		ID:          "iconoir",
		Name:        "Iconoir",
		Description: "A high-quality selection of free icons",
		Version:     "7.0.0",
		CDN:         "https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css",
		CSSClass:    "iconoir-{name}",
		RenderMode:  IconRenderModeCSS,
		Priority:    0,
		Trusted:     true,
		Categories: []IconCategory{
			{ID: "content", Label: "Content"},
			{ID: "objects", Label: "Objects"},
			{ID: "people", Label: "People"},
			{ID: "business", Label: "Business"},
			{ID: "media", Label: "Media"},
			{ID: "communication", Label: "Communication"},
			{ID: "system", Label: "System"},
			{ID: "misc", Label: "Miscellaneous"},
		},
		Icons: iconoirSidebarIcons(),
	}
}

// BuiltinLucideLibrary returns the Lucide icon library configuration.
func BuiltinLucideLibrary() IconLibrary {
	return IconLibrary{
		ID:          "lucide",
		Name:        "Lucide",
		Description: "Beautiful & consistent icon toolkit",
		Version:     "0.300.0",
		CDN:         "https://cdn.jsdelivr.net/npm/lucide-static@latest/font/lucide.css",
		CSSClass:    "lucide-{name}",
		RenderMode:  IconRenderModeCSS,
		Priority:    10,
		Trusted:     true,
		Categories: []IconCategory{
			{ID: "arrows", Label: "Arrows"},
			{ID: "brands", Label: "Brands"},
			{ID: "charts", Label: "Charts"},
			{ID: "communication", Label: "Communication"},
			{ID: "devices", Label: "Devices"},
			{ID: "files", Label: "Files"},
			{ID: "layout", Label: "Layout"},
			{ID: "maps", Label: "Maps"},
			{ID: "nature", Label: "Nature"},
			{ID: "security", Label: "Security"},
			{ID: "shapes", Label: "Shapes"},
			{ID: "text", Label: "Text"},
			{ID: "weather", Label: "Weather"},
		},
		// Lucide has 1000+ icons; we include a curated subset for sidebar use
		Icons: lucideSidebarIcons(),
	}
}

// BuiltinEmojiLibrary returns the emoji "library" configuration.
// Emojis are detected automatically; this library provides metadata.
func BuiltinEmojiLibrary() IconLibrary {
	return IconLibrary{
		ID:          "emoji",
		Name:        "Emoji",
		Description: "Unicode emoji characters",
		RenderMode:  IconRenderModeSpan,
		Priority:    100,
		Trusted:     true,
		Categories: []IconCategory{
			{ID: "smileys", Label: "Smileys"},
			{ID: "people", Label: "People"},
			{ID: "animals-nature", Label: "Nature"},
			{ID: "food", Label: "Food"},
			{ID: "travel", Label: "Travel"},
			{ID: "activities", Label: "Activities"},
			{ID: "objects", Label: "Objects"},
			{ID: "symbols", Label: "Symbols"},
		},
		// Emoji icons are detected by the parser; this is for discovery
		Icons: curatedEmojiIcons(),
	}
}

// RegisterBuiltinIconLibraries registers all built-in icon libraries.
func RegisterBuiltinIconLibraries(svc *IconService) error {
	if err := svc.RegisterLibrary(BuiltinIconoirLibrary()); err != nil {
		return err
	}
	if err := svc.RegisterLibrary(BuiltinLucideLibrary()); err != nil {
		return err
	}
	if err := svc.RegisterLibrary(BuiltinEmojiLibrary()); err != nil {
		return err
	}
	return nil
}

// iconoirSidebarIcons returns a curated list of Iconoir icons for sidebar/navigation.
func iconoirSidebarIcons() []IconDefinition {
	return []IconDefinition{
		// Content & Documents
		{Name: "page", Label: "Page", Keywords: []string{"document", "paper"}, Category: "content"},
		{Name: "page-edit", Label: "Page Edit", Keywords: []string{"document", "write"}, Category: "content"},
		{Name: "journal", Label: "Journal", Keywords: []string{"book", "notebook", "blog"}, Category: "content"},
		{Name: "book", Label: "Book", Keywords: []string{"read", "documentation"}, Category: "content"},
		{Name: "clipboard", Label: "Clipboard", Keywords: []string{"copy", "paste", "list"}, Category: "content"},
		{Name: "clipboard-check", Label: "Clipboard Check", Keywords: []string{"agreement", "approved", "signed", "complete"}, Category: "content"},
		{Name: "edit-pencil", Label: "Edit", Keywords: []string{"write", "pencil", "compose"}, Category: "content"},
		{Name: "post", Label: "Post", Keywords: []string{"article", "blog", "entry"}, Category: "content"},
		{Name: "design-nib", Label: "Design Nib", Keywords: []string{"pen", "signature", "sign", "write", "esign"}, Category: "content"},

		// Objects & Layout
		{Name: "cube", Label: "Cube", Keywords: []string{"box", "3d", "model", "block"}, Category: "objects"},
		{Name: "view-grid", Label: "Grid", Keywords: []string{"layout", "blocks", "tiles"}, Category: "objects"},
		{Name: "dashboard", Label: "Dashboard", Keywords: []string{"home", "overview", "panel"}, Category: "objects"},
		{Name: "folder", Label: "Folder", Keywords: []string{"directory", "files"}, Category: "objects"},
		{Name: "archive", Label: "Archive", Keywords: []string{"box", "storage"}, Category: "objects"},
		{Name: "table-rows", Label: "Table", Keywords: []string{"list", "rows", "data"}, Category: "objects"},
		{Name: "puzzle", Label: "Puzzle", Keywords: []string{"piece", "component", "module"}, Category: "objects"},

		// People & Auth
		{Name: "user", Label: "User", Keywords: []string{"person", "account", "profile"}, Category: "people"},
		{Name: "users", Label: "Users", Keywords: []string{"people", "group", "team"}, Category: "people"},
		{Name: "user-circle", Label: "User Circle", Keywords: []string{"profile", "avatar"}, Category: "people"},
		{Name: "shield", Label: "Shield", Keywords: []string{"security", "auth", "role"}, Category: "people"},
		{Name: "community", Label: "Community", Keywords: []string{"group", "organization"}, Category: "people"},
		{Name: "lock", Label: "Lock", Keywords: []string{"secure", "private"}, Category: "people"},

		// Commerce & Business
		{Name: "building", Label: "Building", Keywords: []string{"office", "company", "tenant"}, Category: "business"},
		{Name: "briefcase", Label: "Briefcase", Keywords: []string{"work", "business"}, Category: "business"},
		{Name: "cart", Label: "Cart", Keywords: []string{"shop", "ecommerce", "buy"}, Category: "business"},
		{Name: "credit-card", Label: "Credit Card", Keywords: []string{"payment", "money"}, Category: "business"},
		{Name: "gift", Label: "Gift", Keywords: []string{"present", "reward"}, Category: "business"},
		{Name: "shop", Label: "Shop", Keywords: []string{"store", "ecommerce"}, Category: "business"},

		// Media
		{Name: "media-image", Label: "Image", Keywords: []string{"photo", "picture"}, Category: "media"},
		{Name: "camera", Label: "Camera", Keywords: []string{"photo", "picture"}, Category: "media"},
		{Name: "play", Label: "Play", Keywords: []string{"video", "media"}, Category: "media"},
		{Name: "music-note", Label: "Music", Keywords: []string{"audio", "song"}, Category: "media"},
		{Name: "attachment", Label: "Attachment", Keywords: []string{"file", "clip"}, Category: "media"},

		// Communication
		{Name: "bell", Label: "Bell", Keywords: []string{"notification", "alert"}, Category: "communication"},
		{Name: "chat-bubble", Label: "Chat", Keywords: []string{"message", "comment"}, Category: "communication"},
		{Name: "mail", Label: "Mail", Keywords: []string{"email", "message"}, Category: "communication"},
		{Name: "megaphone", Label: "Megaphone", Keywords: []string{"announce", "broadcast"}, Category: "communication"},
		{Name: "send", Label: "Send", Keywords: []string{"share", "submit"}, Category: "communication"},

		// System & Settings
		{Name: "settings", Label: "Settings", Keywords: []string{"config", "gear", "cog"}, Category: "system"},
		{Name: "switch-on", Label: "Toggle", Keywords: []string{"switch", "feature", "flag"}, Category: "system"},
		{Name: "bug", Label: "Bug", Keywords: []string{"debug", "error", "issue"}, Category: "system"},
		{Name: "clock", Label: "Clock", Keywords: []string{"time", "schedule", "activity"}, Category: "system"},
		{Name: "database", Label: "Database", Keywords: []string{"storage", "data"}, Category: "system"},
		{Name: "code", Label: "Code", Keywords: []string{"developer", "programming"}, Category: "system"},
		{Name: "terminal", Label: "Terminal", Keywords: []string{"console", "command", "line"}, Category: "system"},

		// Misc & Navigation
		{Name: "star", Label: "Star", Keywords: []string{"favorite", "bookmark", "rating"}, Category: "misc"},
		{Name: "heart", Label: "Heart", Keywords: []string{"love", "favorite"}, Category: "misc"},
		{Name: "bookmark", Label: "Bookmark", Keywords: []string{"save", "favorite"}, Category: "misc"},
		{Name: "pin-alt", Label: "Pin", Keywords: []string{"location", "map"}, Category: "misc"},
		{Name: "link", Label: "Link", Keywords: []string{"url", "chain", "href"}, Category: "misc"},
		{Name: "search", Label: "Search", Keywords: []string{"find", "magnifier"}, Category: "misc"},
		{Name: "download", Label: "Download", Keywords: []string{"save", "get", "export"}, Category: "misc"},
		{Name: "cloud", Label: "Cloud", Keywords: []string{"upload", "sync"}, Category: "misc"},
		{Name: "flash", Label: "Flash", Keywords: []string{"lightning", "bolt", "fast"}, Category: "misc"},
		{Name: "calendar", Label: "Calendar", Keywords: []string{"date", "event", "schedule"}, Category: "misc"},
		{Name: "graph-up", Label: "Analytics", Keywords: []string{"chart", "statistics"}, Category: "misc"},
		{Name: "color-picker", Label: "Theme", Keywords: []string{"color", "palette", "style"}, Category: "misc"},
		{Name: "globe", Label: "Globe", Keywords: []string{"world", "international", "web"}, Category: "misc"},
		{Name: "rocket", Label: "Rocket", Keywords: []string{"launch", "deploy", "fast"}, Category: "misc"},
		{Name: "flag", Label: "Flag", Keywords: []string{"mark", "milestone", "report"}, Category: "misc"},
		{Name: "trash", Label: "Trash", Keywords: []string{"delete", "remove"}, Category: "misc"},
	}
}

// lucideSidebarIcons returns a curated list of Lucide icons for sidebar/navigation.
func lucideSidebarIcons() []IconDefinition {
	return []IconDefinition{
		// Common navigation icons
		{Name: "home", Label: "Home", Keywords: []string{"house", "main"}, Category: "layout"},
		{Name: "layout-dashboard", Label: "Dashboard", Keywords: []string{"overview", "panel"}, Category: "layout"},
		{Name: "file", Label: "File", Keywords: []string{"document", "page"}, Category: "files"},
		{Name: "file-text", Label: "File Text", Keywords: []string{"document", "content"}, Category: "files"},
		{Name: "folder", Label: "Folder", Keywords: []string{"directory"}, Category: "files"},
		{Name: "folder-open", Label: "Folder Open", Keywords: []string{"directory", "expanded"}, Category: "files"},
		{Name: "user", Label: "User", Keywords: []string{"person", "account"}, Category: "security"},
		{Name: "users", Label: "Users", Keywords: []string{"people", "group"}, Category: "security"},
		{Name: "shield", Label: "Shield", Keywords: []string{"security", "protection"}, Category: "security"},
		{Name: "lock", Label: "Lock", Keywords: []string{"secure", "private"}, Category: "security"},
		{Name: "unlock", Label: "Unlock", Keywords: []string{"open", "access"}, Category: "security"},
		{Name: "settings", Label: "Settings", Keywords: []string{"config", "preferences"}, Category: "layout"},
		{Name: "cog", Label: "Cog", Keywords: []string{"settings", "gear"}, Category: "layout"},
		{Name: "bell", Label: "Bell", Keywords: []string{"notification", "alert"}, Category: "communication"},
		{Name: "mail", Label: "Mail", Keywords: []string{"email", "message"}, Category: "communication"},
		{Name: "message-square", Label: "Message", Keywords: []string{"chat", "comment"}, Category: "communication"},
		{Name: "calendar", Label: "Calendar", Keywords: []string{"date", "schedule"}, Category: "layout"},
		{Name: "clock", Label: "Clock", Keywords: []string{"time"}, Category: "layout"},
		{Name: "search", Label: "Search", Keywords: []string{"find"}, Category: "layout"},
		{Name: "plus", Label: "Plus", Keywords: []string{"add", "new"}, Category: "shapes"},
		{Name: "minus", Label: "Minus", Keywords: []string{"remove", "subtract"}, Category: "shapes"},
		{Name: "x", Label: "Close", Keywords: []string{"remove", "delete", "cancel"}, Category: "shapes"},
		{Name: "check", Label: "Check", Keywords: []string{"done", "complete", "success"}, Category: "shapes"},
		{Name: "star", Label: "Star", Keywords: []string{"favorite", "rating"}, Category: "shapes"},
		{Name: "heart", Label: "Heart", Keywords: []string{"love", "favorite"}, Category: "shapes"},
		{Name: "bookmark", Label: "Bookmark", Keywords: []string{"save"}, Category: "layout"},
		{Name: "tag", Label: "Tag", Keywords: []string{"label", "category"}, Category: "layout"},
		{Name: "image", Label: "Image", Keywords: []string{"photo", "picture"}, Category: "files"},
		{Name: "video", Label: "Video", Keywords: []string{"movie", "media"}, Category: "files"},
		{Name: "music", Label: "Music", Keywords: []string{"audio", "song"}, Category: "files"},
		{Name: "download", Label: "Download", Keywords: []string{"save", "export"}, Category: "arrows"},
		{Name: "upload", Label: "Upload", Keywords: []string{"import"}, Category: "arrows"},
		{Name: "external-link", Label: "External Link", Keywords: []string{"open", "new tab"}, Category: "arrows"},
		{Name: "link", Label: "Link", Keywords: []string{"url", "chain"}, Category: "layout"},
		{Name: "globe", Label: "Globe", Keywords: []string{"world", "web"}, Category: "maps"},
		{Name: "map-pin", Label: "Map Pin", Keywords: []string{"location"}, Category: "maps"},
		{Name: "building", Label: "Building", Keywords: []string{"office", "company"}, Category: "layout"},
		{Name: "briefcase", Label: "Briefcase", Keywords: []string{"work", "business"}, Category: "layout"},
		{Name: "credit-card", Label: "Credit Card", Keywords: []string{"payment"}, Category: "layout"},
		{Name: "shopping-cart", Label: "Shopping Cart", Keywords: []string{"buy", "commerce"}, Category: "layout"},
		{Name: "package", Label: "Package", Keywords: []string{"box", "delivery"}, Category: "layout"},
		{Name: "truck", Label: "Truck", Keywords: []string{"delivery", "shipping"}, Category: "maps"},
		{Name: "database", Label: "Database", Keywords: []string{"storage", "data"}, Category: "devices"},
		{Name: "server", Label: "Server", Keywords: []string{"hosting", "backend"}, Category: "devices"},
		{Name: "cloud", Label: "Cloud", Keywords: []string{"hosting", "storage"}, Category: "weather"},
		{Name: "terminal", Label: "Terminal", Keywords: []string{"console", "command"}, Category: "devices"},
		{Name: "code", Label: "Code", Keywords: []string{"programming", "developer"}, Category: "text"},
		{Name: "git-branch", Label: "Git Branch", Keywords: []string{"version", "control"}, Category: "layout"},
		{Name: "activity", Label: "Activity", Keywords: []string{"pulse", "health"}, Category: "charts"},
		{Name: "bar-chart", Label: "Bar Chart", Keywords: []string{"analytics", "statistics"}, Category: "charts"},
		{Name: "pie-chart", Label: "Pie Chart", Keywords: []string{"analytics", "statistics"}, Category: "charts"},
		{Name: "trending-up", Label: "Trending Up", Keywords: []string{"growth", "increase"}, Category: "charts"},
		{Name: "zap", Label: "Zap", Keywords: []string{"lightning", "fast", "flash"}, Category: "weather"},
		{Name: "rocket", Label: "Rocket", Keywords: []string{"launch", "fast"}, Category: "maps"},
		{Name: "flag", Label: "Flag", Keywords: []string{"report", "mark"}, Category: "shapes"},
		{Name: "trash", Label: "Trash", Keywords: []string{"delete", "remove"}, Category: "layout"},
		{Name: "edit", Label: "Edit", Keywords: []string{"pencil", "write"}, Category: "text"},
		{Name: "eye", Label: "Eye", Keywords: []string{"view", "visible"}, Category: "layout"},
		{Name: "eye-off", Label: "Eye Off", Keywords: []string{"hide", "invisible"}, Category: "layout"},
	}
}

// curatedEmojiIcons returns a curated list of emoji icons for the picker.
func curatedEmojiIcons() []IconDefinition {
	return []IconDefinition{
		// Common UI emojis
		{Name: "star", Label: "Star", Content: "⭐", Keywords: []string{"favorite", "rating"}, Category: "symbols"},
		{Name: "check", Label: "Check Mark", Content: "✅", Keywords: []string{"done", "complete", "yes"}, Category: "symbols"},
		{Name: "cross", Label: "Cross Mark", Content: "❌", Keywords: []string{"no", "wrong", "delete"}, Category: "symbols"},
		{Name: "warning", Label: "Warning", Content: "⚠️", Keywords: []string{"caution", "alert"}, Category: "symbols"},
		{Name: "info", Label: "Information", Content: "ℹ️", Keywords: []string{"help", "about"}, Category: "symbols"},
		{Name: "question", Label: "Question", Content: "❓", Keywords: []string{"help", "what"}, Category: "symbols"},
		{Name: "fire", Label: "Fire", Content: "🔥", Keywords: []string{"hot", "popular"}, Category: "symbols"},
		{Name: "sparkles", Label: "Sparkles", Content: "✨", Keywords: []string{"new", "magic", "shiny"}, Category: "symbols"},
		{Name: "zap", Label: "Zap", Content: "⚡", Keywords: []string{"lightning", "fast", "power"}, Category: "symbols"},
		{Name: "rocket", Label: "Rocket", Content: "🚀", Keywords: []string{"launch", "fast"}, Category: "travel"},
		{Name: "globe", Label: "Globe", Content: "🌍", Keywords: []string{"world", "earth"}, Category: "travel"},
		{Name: "house", Label: "House", Content: "🏠", Keywords: []string{"home", "building"}, Category: "travel"},
		{Name: "office", Label: "Office", Content: "🏢", Keywords: []string{"building", "work"}, Category: "travel"},
		{Name: "lock", Label: "Lock", Content: "🔒", Keywords: []string{"secure", "private"}, Category: "objects"},
		{Name: "key", Label: "Key", Content: "🔑", Keywords: []string{"unlock", "access"}, Category: "objects"},
		{Name: "gear", Label: "Gear", Content: "⚙️", Keywords: []string{"settings", "config"}, Category: "objects"},
		{Name: "wrench", Label: "Wrench", Content: "🔧", Keywords: []string{"tool", "fix"}, Category: "objects"},
		{Name: "magnifier", Label: "Magnifier", Content: "🔍", Keywords: []string{"search", "find"}, Category: "objects"},
		{Name: "bell", Label: "Bell", Content: "🔔", Keywords: []string{"notification", "alert"}, Category: "objects"},
		{Name: "chart", Label: "Chart", Content: "📊", Keywords: []string{"analytics", "data"}, Category: "objects"},
		{Name: "calendar", Label: "Calendar", Content: "📅", Keywords: []string{"date", "schedule"}, Category: "objects"},
		{Name: "folder", Label: "Folder", Content: "📁", Keywords: []string{"directory", "files"}, Category: "objects"},
		{Name: "document", Label: "Document", Content: "📄", Keywords: []string{"file", "page"}, Category: "objects"},
		{Name: "memo", Label: "Memo", Content: "📝", Keywords: []string{"note", "write"}, Category: "objects"},
		{Name: "books", Label: "Books", Content: "📚", Keywords: []string{"read", "library"}, Category: "objects"},
		{Name: "laptop", Label: "Laptop", Content: "💻", Keywords: []string{"computer", "device"}, Category: "objects"},
		{Name: "phone", Label: "Phone", Content: "📱", Keywords: []string{"mobile", "device"}, Category: "objects"},
		{Name: "email", Label: "Email", Content: "📧", Keywords: []string{"mail", "message"}, Category: "objects"},
		{Name: "package", Label: "Package", Content: "📦", Keywords: []string{"box", "delivery"}, Category: "objects"},
		{Name: "gift", Label: "Gift", Content: "🎁", Keywords: []string{"present", "reward"}, Category: "objects"},
		{Name: "money", Label: "Money", Content: "💰", Keywords: []string{"cash", "finance"}, Category: "objects"},
		{Name: "card", Label: "Credit Card", Content: "💳", Keywords: []string{"payment"}, Category: "objects"},
		{Name: "cart", Label: "Cart", Content: "🛒", Keywords: []string{"shopping", "buy"}, Category: "objects"},
		{Name: "user", Label: "User", Content: "👤", Keywords: []string{"person", "account"}, Category: "people"},
		{Name: "users", Label: "Users", Content: "👥", Keywords: []string{"people", "group"}, Category: "people"},
		{Name: "handshake", Label: "Handshake", Content: "🤝", Keywords: []string{"deal", "agreement"}, Category: "people"},
		{Name: "thumbsup", Label: "Thumbs Up", Content: "👍", Keywords: []string{"like", "approve"}, Category: "people"},
		{Name: "clap", Label: "Clap", Content: "👏", Keywords: []string{"applause", "congrats"}, Category: "people"},
		{Name: "heart", Label: "Heart", Content: "❤️", Keywords: []string{"love", "favorite"}, Category: "symbols"},
		{Name: "lightbulb", Label: "Light Bulb", Content: "💡", Keywords: []string{"idea", "thought"}, Category: "objects"},
	}
}
