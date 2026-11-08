import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  KanbanSquare,
  LayoutGrid,
  List,
  ListPlus,
  ListTodo,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import TaskCard from '../components/TaskCard.jsx';
import TaskFormModal from '../components/TaskFormModal.jsx';
import TaskDetailsModal from '../components/TaskDetailsModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { Skeleton } from '../components/Loader.jsx';
import { tasksApi, projectsApi, isAbortError } from '../services/api.js';
import { useDebounce, useDocumentTitle } from '../hooks/useDebounce.js';
import { useToast } from '../hooks/useToast.jsx';

const STATUSES = ['To Do', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const SORTS = [
  { value: 'dueDate', label: 'Deadline · soonest' },
  { value: '-dueDate', label: 'Deadline · latest' },
  { value: '-createdAt', label: 'Newest created' },
  { value: 'title', label: 'Title A–Z' },
];

const COLUMN_META = {
  'To Do': { icon: CircleDashed, tone: 'todo' },
  'In Progress': { icon: Clock, tone: 'progress' },
  Completed: { icon: CheckCircle2, tone: 'done' },
};

function BoardSkeleton() {
  return (
    <div className="kanban">
      {STATUSES.map((status) => (
        <div className="kanban-column" key={status}>
          <div className="kanban-column__header"><Skeleton width={110} height={16} /></div>
          {[0, 1, 2].map((item) => (
            <div className="task-card" key={item} style={{ cursor: 'default' }}>
              <Skeleton width="80%" height={15} />
              <Skeleton width="100%" height={10} style={{ marginTop: 14 }} />
              <Skeleton width="60%" height={10} style={{ marginTop: 8 }} />
              <Skeleton width="45%" height={12} style={{ marginTop: 18 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('dueDate');
  const [view, setView] = useState('board');
  const [dragOver, setDragOver] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formDefaults, setFormDefaults] = useState({ status: 'To Do', projectId: '' });
  const [detailsTask, setDetailsTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const debouncedSearch = useDebounce(search);
  const { toast } = useToast();
  useDocumentTitle('Task Manager');

  const effectiveStatus = view === 'list' ? statusFilter : '';

  /* Load project options for the filter + task form. */
  useEffect(() => {
    let active = true;
    projectsApi
      .list({ sort: 'name' })
      .then((response) => active && setProjects(response.data))
      .catch((requestError) => {
        if (active) toast.error('Could not load projects', requestError.message);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  /* Deep links: /tasks?new=1 and /tasks?task=<id> */
  useEffect(() => {
    const shouldCreate = searchParams.get('new') === '1';
    const taskId = searchParams.get('task');

    if (shouldCreate) {
      setEditingTask(null);
      setFormDefaults((current) => ({ ...current, projectId: projectFilter || current.projectId }));
      setFormOpen(true);
    }

    if (taskId) {
      tasksApi
        .get(taskId)
        .then((response) => setDetailsTask(response.data))
        .catch((requestError) => toast.error('Could not open task', requestError.message));
    }

    if (shouldCreate || taskId) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      next.delete('task');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, projectFilter, toast]);

  /** Server-side search, filters and sorting — refetched on every change. */
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    tasksApi
      .list(
        {
          search: debouncedSearch,
          priority,
          project: projectFilter,
          status: effectiveStatus,
          sort,
        },
        { signal: controller.signal }
      )
      .then((response) => {
        if (!active) return;
        setTasks(response.data);
        setError(null);
      })
      .catch((requestError) => {
        if (active && !isAbortError(requestError)) {
          setError({ message: requestError.message, details: requestError.details });
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedSearch, priority, projectFilter, effectiveStatus, sort, refreshKey]);

  const replaceTask = (updatedTask) => {
    setTasks((current) => current.map((task) => (task._id === updatedTask._id ? updatedTask : task)));
    setDetailsTask((current) => (current?._id === updatedTask._id ? updatedTask : current));
  };

  const updateTaskStatus = async (task, status) => {
    if (task.status === status) return;
    const previous = task;

    // Optimistic UI update for a snappy Kanban drag experience.
    setTasks((current) => current.map((item) => (item._id === task._id ? { ...item, status } : item)));
    try {
      const response = await tasksApi.update(task._id, { status });
      replaceTask(response.data);
      toast.success('Task moved', `${task.title} → ${status}`);
    } catch (requestError) {
      setTasks((current) => current.map((item) => (item._id === previous._id ? previous : item)));
      toast.error('Could not move task', requestError.message);
    }
  };

  const handleDrop = (status) => {
    setDragOver(null);
    const task = tasks.find((item) => item._id === draggingId);
    setDraggingId(null);
    if (task) updateTaskStatus(task, status);
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    setDeletingLoading(true);
    try {
      await tasksApi.remove(deletingTask._id);
      setTasks((current) => current.filter((item) => item._id !== deletingTask._id));
      toast.success('Task deleted', deletingTask.title);
      setDeletingTask(null);
      setDetailsTask(null);
    } catch (requestError) {
      toast.error('Could not delete task', requestError.message);
    } finally {
      setDeletingLoading(false);
    }
  };

  const openCreate = (defaultStatus = 'To Do') => {
    setEditingTask(null);
    setFormDefaults({ status: defaultStatus, projectId: projectFilter });
    setFormOpen(true);
  };

  const openEdit = (task) => {
    setDetailsTask(null);
    setEditingTask(task);
    setFormOpen(true);
  };

  const clearFilters = () => {
    setSearch('');
    setPriority('');
    setProjectFilter('');
    setStatusFilter('');
    setSort('dueDate');
  };

  const hasFilters = Boolean(search || priority || projectFilter || statusFilter || sort !== 'dueDate');

  const columns = STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  }));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow"><KanbanSquare size={13} /> Workflow</p>
          <h1>Task Manager</h1>
          <p className="page-subtitle">
            {loading ? 'Loading tasks…' : `${tasks.length} task${tasks.length === 1 ? '' : 's'} in the current view`}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => openCreate('To Do')}>
            <ListPlus size={15} /> New task
          </button>
        </div>
      </header>

      <section className="toolbar card toolbar--tasks">
        <div className="toolbar__search">
          <Search size={16} className="toolbar__search-icon" />
          <input
            className="toolbar__input"
            placeholder="Search tasks by title or description…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search tasks"
          />
          {search && (
            <button className="toolbar__clear" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="toolbar__filters">
          <span className="toolbar__filter-label"><SlidersHorizontal size={14} /></span>

          <select className="select select--sm" value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {PRIORITIES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>

          <select className="select select--sm" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} aria-label="Filter by project">
            <option value="">All projects</option>
            {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
          </select>

          {view === 'list' && (
            <select className="select select--sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          )}

          <select className="select select--sm" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort tasks">
            {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>

          {hasFilters && (
            <button className="btn btn--ghost btn--xs" onClick={clearFilters}>Clear</button>
          )}

          <div className="view-switch" role="group" aria-label="Switch view">
            <button
              className={view === 'board' ? 'is-active' : ''}
              onClick={() => { setView('board'); setStatusFilter(''); }}
              aria-label="Board view"
              title="Board view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={view === 'list' ? 'is-active' : ''}
              onClick={() => setView('list')}
              aria-label="List view"
              title="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </section>

      {error && (
        <ErrorAlert
          title="Could not load tasks"
          message={error.message}
          details={error.details}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      )}

      {loading && tasks.length === 0 ? (
        <BoardSkeleton />
      ) : tasks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ListTodo}
            title={hasFilters ? 'No tasks match your filters' : 'No tasks yet'}
            description={
              hasFilters
                ? 'Adjust the search or filters to see more work items.'
                : 'Create a task manually, or let the AI Project Planner break down a whole idea.'
            }
            action={
              hasFilters ? (
                <button className="btn btn--ghost" onClick={clearFilters}>Clear filters</button>
              ) : (
                <button className="btn btn--primary" onClick={() => openCreate('To Do')}>
                  <Plus size={15} /> Create task
                </button>
              )
            }
          />
        </div>
      ) : view === 'board' ? (
        <div className={`kanban ${loading ? 'is-refreshing' : ''}`}>
          {columns.map(({ status, tasks: columnTasks }) => {
            const meta = COLUMN_META[status];
            const Icon = meta.icon;
            return (
              <section
                className={`kanban-column kanban-column--${meta.tone} ${dragOver === status ? 'is-dragover' : ''}`}
                key={status}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setDragOver(status);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(status);
                }}
              >
                <header className="kanban-column__header">
                  <span className="kanban-column__title">
                    <Icon size={15} />
                    {status}
                    <span className="kanban-column__count">{columnTasks.length}</span>
                  </span>
                  <button className="icon-btn icon-btn--sm" onClick={() => openCreate(status)} aria-label={`Add task to ${status}`} title={`Add task to ${status}`}>
                    <Plus size={15} />
                  </button>
                </header>

                <div className="kanban-column__body">
                  {columnTasks.length === 0 ? (
                    <button className="kanban-empty" onClick={() => openCreate(status)}>
                      <Plus size={16} />
                      <span>Drop a task here or add one</span>
                    </button>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        draggable
                        onDragStart={(item) => setDraggingId(item._id)}
                        onOpen={setDetailsTask}
                        onEdit={openEdit}
                        onDelete={setDeletingTask}
                        onStatusChange={updateTaskStatus}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card list-card task-list-card">
          <div className="task-rows">
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                variant="row"
                onOpen={setDetailsTask}
                onEdit={openEdit}
                onDelete={setDeletingTask}
                onStatusChange={updateTaskStatus}
              />
            ))}
          </div>
        </div>
      )}

      <TaskFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTask(null); }}
        task={editingTask}
        defaultProjectId={formDefaults.projectId}
        defaultStatus={formDefaults.status}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />

      <TaskDetailsModal
        task={detailsTask}
        onClose={() => setDetailsTask(null)}
        onEdit={openEdit}
        onDelete={(task) => { setDetailsTask(null); setDeletingTask(task); }}
        onStatusChange={updateTaskStatus}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        loading={deletingLoading}
        title="Delete task?"
        message={`“${deletingTask?.title}” will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete task"
      />
    </div>
  );
}
