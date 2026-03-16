package primitives

//go:fix inline
func Int(value int) *int {
	return new(value)
}
