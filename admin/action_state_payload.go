package admin

func actionStateEnvelope(raw any) map[string]map[string]any {
	switch typed := raw.(type) {
	case nil:
		return nil
	case map[string]map[string]any:
		return cloneActionStateEnvelope(typed)
	case map[string]any:
		if len(typed) == 0 {
			return nil
		}
		out := make(map[string]map[string]any, len(typed))
		for actionName, value := range typed {
			entry, ok := value.(map[string]any)
			if !ok {
				continue
			}
			out[actionName] = cloneActionStateEntry(entry)
		}
		if len(out) == 0 {
			return nil
		}
		return out
	default:
		return nil
	}
}

func cloneActionStateEnvelope(in map[string]map[string]any) map[string]map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]map[string]any, len(in))
	for actionName, entry := range in {
		out[actionName] = cloneActionStateEntry(entry)
	}
	return out
}

func cloneActionStateEntry(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		out[key] = cloneActionStateValue(value)
	}
	return out
}

func cloneActionStateValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return cloneActionStateEntry(typed)
	case map[string]map[string]any:
		return cloneActionStateEnvelope(typed)
	case []string:
		return append([]string{}, typed...)
	case []any:
		out := make([]any, len(typed))
		for index, item := range typed {
			out[index] = cloneActionStateValue(item)
		}
		return out
	default:
		return typed
	}
}
