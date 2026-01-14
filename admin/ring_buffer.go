package admin

import "sync"

// RingBuffer stores the most recent values up to a fixed capacity.
type RingBuffer[T any] struct {
	mu     sync.RWMutex
	values []T
	start  int
	count  int
}

// NewRingBuffer creates a ring buffer with the provided capacity.
func NewRingBuffer[T any](capacity int) *RingBuffer[T] {
	if capacity < 0 {
		capacity = 0
	}
	return &RingBuffer[T]{values: make([]T, capacity)}
}

// Add appends a value, overwriting the oldest when full.
func (r *RingBuffer[T]) Add(value T) {
	if r == nil || len(r.values) == 0 {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.count < len(r.values) {
		idx := (r.start + r.count) % len(r.values)
		r.values[idx] = value
		r.count++
		return
	}
	r.values[r.start] = value
	r.start = (r.start + 1) % len(r.values)
}

// Values returns the buffered values ordered from oldest to newest.
func (r *RingBuffer[T]) Values() []T {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.count == 0 {
		return nil
	}
	out := make([]T, r.count)
	for i := 0; i < r.count; i++ {
		idx := (r.start + i) % len(r.values)
		out[i] = r.values[idx]
	}
	return out
}

// Clear removes all buffered values.
func (r *RingBuffer[T]) Clear() {
	if r == nil {
		return
	}
	r.mu.Lock()
	r.start = 0
	r.count = 0
	r.mu.Unlock()
}

// Len returns the current number of stored values.
func (r *RingBuffer[T]) Len() int {
	if r == nil {
		return 0
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.count
}

// Cap returns the buffer capacity.
func (r *RingBuffer[T]) Cap() int {
	if r == nil {
		return 0
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.values)
}
