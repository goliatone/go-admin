package admin

func menuValidationCycleError(meta map[string]any) error {
	return NewDomainError(TextCodeMenuValidationCycle, "menu tree contains a cycle", meta)
}

func menuValidationDepthError(maxDepth int, meta map[string]any) error {
	if meta == nil {
		meta = map[string]any{}
	}
	if maxDepth > 0 {
		meta["max_depth"] = maxDepth
	}
	return NewDomainError(TextCodeMenuValidationDepth, "menu tree exceeds maximum depth", meta)
}

func menuValidationInvalidTargetError(meta map[string]any) error {
	return NewDomainError(TextCodeMenuValidationInvalidTarget, "menu item target is invalid", meta)
}
