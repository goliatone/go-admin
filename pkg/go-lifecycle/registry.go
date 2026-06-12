package lifecycle

import (
	"fmt"
	"sort"
	"sync"
)

// Registry collects lifecycle tasks before a Runner is built.
type Registry struct {
	mu    sync.Mutex
	seq   int
	tasks []registeredTask
	names map[string]struct{}
}

type registeredTask struct {
	task Task
	seq  int
}

// NewRegistry returns an empty lifecycle registry.
func NewRegistry() *Registry {
	return &Registry{names: map[string]struct{}{}}
}

// Register adds a task to the registry.
func (r *Registry) Register(task Task) error {
	if r == nil {
		return fmt.Errorf("lifecycle: registry is nil")
	}
	normalized, err := task.normalize()
	if err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.names[normalized.Name]; ok {
		return fmt.Errorf("lifecycle: task %q already registered", normalized.Name)
	}
	r.seq++
	r.tasks = append(r.tasks, registeredTask{task: normalized, seq: r.seq})
	r.names[normalized.Name] = struct{}{}
	return nil
}

// MustRegister adds a task and panics on error.
func (r *Registry) MustRegister(task Task) {
	if err := r.Register(task); err != nil {
		panic(err)
	}
}

// Tasks returns registered tasks in deterministic phase/priority order.
func (r *Registry) Tasks() []Task {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]registeredTask, len(r.tasks))
	copy(out, r.tasks)
	sortRegistered(out)
	tasks := make([]Task, 0, len(out))
	for _, rt := range out {
		tasks = append(tasks, rt.task)
	}
	return tasks
}

func (r *Registry) registeredTasks() []registeredTask {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]registeredTask, len(r.tasks))
	copy(out, r.tasks)
	sortRegistered(out)
	return out
}

func sortRegistered(tasks []registeredTask) {
	sort.SliceStable(tasks, func(i, j int) bool {
		if tasks[i].task.Phase != tasks[j].task.Phase {
			return phaseRank(tasks[i].task.Phase) < phaseRank(tasks[j].task.Phase)
		}
		if tasks[i].task.Priority != tasks[j].task.Priority {
			return tasks[i].task.Priority > tasks[j].task.Priority
		}
		return tasks[i].seq < tasks[j].seq
	})
}

func phaseRank(phase Phase) int {
	switch phase {
	case PhasePreBind:
		return 10
	case PhaseBind:
		return 20
	case PhasePostBind:
		return 30
	case PhaseReady:
		return 40
	case PhaseBackground:
		return 50
	case PhaseShutdown:
		return 60
	default:
		return 100
	}
}
