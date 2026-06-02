package debugcollector

func mustAs[T any](v any) T {
	out, ok := v.(T)
	if !ok {
		panic("unexpected test fixture type")
	}
	return out
}
