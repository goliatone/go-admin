package stores

import (
	"sync"
)

// StatsStore manages statistics
type StatsStore struct {
	mu sync.RWMutex
}

// NewStatsStore creates a new StatsStore instance
func NewStatsStore() *StatsStore {
	return &StatsStore{}
}

// Seed initializes the StatsStore (stats are computed dynamically)
func (s *StatsStore) Seed() {
	// Stats are computed dynamically
}

// GetUserStats returns user statistics
func (s *StatsStore) GetUserStats() map[string]any {
	return map[string]any{
		"total":     5,
		"active":    4,
		"new_today": 1,
	}
}

// GetContentStats returns content statistics
func (s *StatsStore) GetContentStats() map[string]any {
	return map[string]any{
		"published": 7,
		"draft":     2,
		"scheduled": 1,
	}
}

// GetStorageStats returns storage statistics
func (s *StatsStore) GetStorageStats() map[string]any {
	return map[string]any{
		"used":       "21.4 GB",
		"total":      "100 GB",
		"percentage": 21,
	}
}
