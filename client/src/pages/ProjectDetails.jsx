import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock,
  FolderKanban,
  ListPlus,
  ListTodo,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { StatusBadge } from '../components/Badge.jsx';
import TaskCard from '../components/TaskCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ProjectFormModal from '../components/ProjectFormModal.jsx';
import TaskFormModal from '../components/TaskFormModal.jsx';
import TaskDetailsModal from '../components/TaskDetailsModal.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { Skeleton } from '../components/Loader.jsx';
import { projectsApi, tasksApi, isAbortError } from '../services/api.js';
import { filterTasksLocally } from '../utils/jsConceptsDemo.js';
import { useDocumentTitle } from '../hooks/useDebounce.js';
import { useToast } from '../hooks/useToast.jsx';
import { formatDate, formatRelativeTime, getDeadlineMeta, techColor } from '../utils/format.js';

const FILTERS = ['All', 'To Do', 'In Progress', 'Completed'];

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailsTask, setDetailsTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deletingTaskLoading, setDeletingTaskLoading] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  useDocumentTitle(project?.name || 'Project');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    projectsApi
      .get(id, { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setProject(response.data);
        setError(null);
      })
      .catch((requestError) => {
        if (active && !isAbortError(requestError)) {
          setError({ message: requestError.message, details: requestError.details, status: requestError.status });
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
      controller.abort();
    };
  }, [id, refreshKey]);

  /**
   * Local filtering uses the closure-based `filterTasksLocally` utility from
   * jsConceptsDemo.js — no extra network request for a view-only filter.
   */
  const visibleTasks = useMemo(
    () => filterTasksLocally(project?.tasks || [], { status: filter === 'All' ? '' : filter, search }),
    [project?.tasks, filter, search]
  );

  const refresh = () => setRefreshKey((key) => key + 1);

  const handleStatusChange = async (task, status) => {
    try {
      await tasksApi.update(task._id, { status });
      toast.success('Task updated', `${task.title} moved to ${status}.`);
      setDetailsTask(null);
      refresh();
    } catch (requestError) {
      toast.error('Could not update task', requestError.message);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    setDeletingTaskLoading(true);
    try {
      await tasksApi.remove(deletingTask._id);
      toast.success('Task deleted', deletingTask.title);
      setDeletingTask(null);
      setDetailsTask(null);
      refresh();
    } catch (requestError) {
      toast.error('Could not delete task', requestError.message);
    } finally {
      setDeletingTaskLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeletingProject(true);
    try {
      await projectsApi.remove(id);
      toast.success('Project deleted', `${project.name} and its tasks were removed.`);
      navigate('/projects');
    } catch (requestError) {
      toast.error('Could not delete project', requestError.message);
      setDeletingProject(false);
    }
  };

  if (loading && !project) {
    return (
      <div className="page">
        <Skeleton width={160} height={14} />
        <div className="card" style={{ padding: 28, marginTop: 18 }}>
          <Skeleton width="45%" height={32} />
          <Skeleton width="75%" height={14} style={{ marginTop: 16 }} />
          <Skeleton width="100%" height={110} style={{ marginTop: 26 }} />
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="page">
        <Link to="/projects" className="back-link"><ArrowLeft size={15} /> Back to projects</Link>
        <div className="card" style={{ marginTop: 20 }}>
          <EmptyState
            icon={FolderKanban}
            title={error.status === 404 ? 'Project not found' : 'Could not load project'}
            description={error.message}
            action={<Link to="/projects" className="btn btn--primary">Back to projects</Link>}
          />
        </div>
      </div>
    );
  }

  if (!project) return null;

  const taskStats = project.taskStats || { total: 0, completed: 0, inProgress: 0, todo: 0 };
  const deadline = getDeadlineMeta(project.deadline);

  const filterCounts = {
    All: project.tasks?.length || 0,
    'To Do': taskStats.todo,
    'In Progress': taskStats.inProgress,
    Completed: taskStats.completed,
  };

  return (
    <div className="page">
      <div className="details-topbar">
        <Link to="/projects" className="back-link"><ArrowLeft size={15} /> Back to projects</Link>
        <div className="details-topbar__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => setEditProjectOpen(true)}>
            <Pencil size={14} /> Edit project
          </button>
          <button className="btn btn--ghost btn--sm btn--danger-text" onClick={() => setDeleteProjectOpen(true)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <section className="project-hero card">
        <div className="project-hero__main">
          <div className="project-hero__badges">
            <span className="eyebrow eyebrow--plain"><FolderKanban size={13} /> Project</span>
            <StatusBadge status={project.status} />
          </div>
          <h1>{project.name}</h1>
          <p className="project-hero__description">{project.description || 'No description has been added yet.'}</p>

          <div className="project-hero__techs">
            {(project.technologies || []).map((tech) => (
              <span key={tech} className={`tech-chip tech-chip--${techColor(tech)}`}>{tech}</span>
            ))}
            {(!project.technologies || project.technologies.length === 0) && (
              <span className="tech-chip tech-chip--more">No stack added</span>
            )}
          </div>

          <div className="project-hero__meta">
            <span><CalendarDays size={14} /> Start <strong>{formatDate(project.startDate)}</strong></span>
            <span className={project.deadline ? `deadline deadline--${deadline.tone}` : ''}>
              <Clock size={14} /> Deadline <strong>{formatDate(project.deadline)}</strong> · {deadline.label}
            </span>
            <span><CalendarDays size={14} /> Created <strong>{formatRelativeTime(project.createdAt)}</strong></span>
          </div>
        </div>

        <div className="project-hero__progress">
          <div
            className="progress-ring"
            style={{
              background: `conic-gradient(#7C5CFF 0% ${project.progress}%, #222838 ${project.progress}% 100%)`,
            }}
          >
            <div className="progress-ring__hole">
              <strong>{project.progress}%</strong>
              <span>complete</span>
            </div>
          </div>
          <p>{taskStats.completed} of {taskStats.total} tasks completed</p>
        </div>
      </section>

      <section className="mini-stats">
        <article className="mini-stat">
          <span className="mini-stat__icon mini-stat__icon--blue"><ListTodo size={17} /></span>
          <div><strong>{taskStats.total}</strong><p>Total tasks</p></div>
        </article>
        <article className="mini-stat">
          <span className="mini-stat__icon mini-stat__icon--green"><CheckCircle2 size={17} /></span>
          <div><strong>{taskStats.completed}</strong><p>Completed</p></div>
        </article>
        <article className="mini-stat">
          <span className="mini-stat__icon mini-stat__icon--amber"><Clock size={17} /></span>
          <div><strong>{taskStats.inProgress}</strong><p>In progress</p></div>
        </article>
        <article className="mini-stat">
          <span className="mini-stat__icon mini-stat__icon--rose"><CircleDashed size={17} /></span>
          <div><strong>{taskStats.todo}</strong><p>To do</p></div>
        </article>
      </section>

      <section className="card tasks-section">
        <div className="card__header tasks-section__header">
          <div>
            <h2>Tasks</h2>
            <p>Every work item associated with this project</p>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
            <ListPlus size={15} /> Add task
          </button>
        </div>

        <div className="tasks-toolbar">
          <div className="filter-tabs" role="tablist" aria-label="Filter tasks by status">
            {FILTERS.map((option) => (
              <button
                key={option}
                className={`filter-tab ${filter === option ? 'is-active' : ''}`}
                onClick={() => setFilter(option)}
                role="tab"
                aria-selected={filter === option}
              >
                {option}
                <span>{filterCounts[option] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="tasks-toolbar__search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter these tasks…"
              aria-label="Search tasks in project"
            />
          </div>
        </div>

        {visibleTasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={taskStats.total === 0 ? 'No tasks in this project yet' : 'No tasks match this view'}
            description={
              taskStats.total === 0
                ? 'Add a task manually or generate a full plan with the AI Project Planner.'
                : 'Try a different status tab or clear your local search.'
            }
            action={
              taskStats.total === 0 ? (
                <button className="btn btn--primary" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
                  <Plus size={15} /> Add first task
                </button>
              ) : (
                <button className="btn btn--ghost" onClick={() => { setFilter('All'); setSearch(''); }}>Reset filters</button>
              )
            }
          />
        ) : (
          <div className="task-rows">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                variant="row"
                onOpen={setDetailsTask}
                onEdit={(item) => { setEditingTask(item); setTaskFormOpen(true); }}
                onDelete={setDeletingTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        <div className="tasks-section__footer">
          <ProgressBar
            value={project.progress}
            label={`Project progress`}
            showValue
            tone={project.progress === 100 && taskStats.total > 0 ? 'green' : 'violet'}
          />
        </div>
      </section>

      <ProjectFormModal
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        project={project}
        onSaved={refresh}
      />

      <TaskFormModal
        open={taskFormOpen}
        onClose={() => { setTaskFormOpen(false); setEditingTask(null); }}
        task={editingTask}
        defaultProjectId={id}
        onSaved={refresh}
      />

      <TaskDetailsModal
        task={detailsTask}
        onClose={() => setDetailsTask(null)}
        onEdit={(task) => { setDetailsTask(null); setEditingTask(task); setTaskFormOpen(true); }}
        onDelete={(task) => { setDetailsTask(null); setDeletingTask(task); }}
        onStatusChange={handleStatusChange}
      />

      <ConfirmDialog
        open={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        loading={deletingTaskLoading}
        title="Delete task?"
        message={`“${deletingTask?.title}” will be permanently removed from this project.`}
        confirmLabel="Delete task"
      />

      <ConfirmDialog
        open={deleteProjectOpen}
        onClose={() => setDeleteProjectOpen(false)}
        onConfirm={handleDeleteProject}
        loading={deletingProject}
        title="Delete project?"
        message={`“${project.name}” and all ${taskStats.total} associated tasks will be permanently deleted.`}
        confirmLabel="Delete project"
      />
    </div>
  );
}
