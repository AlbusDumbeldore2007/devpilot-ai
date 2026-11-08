import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  FolderPlus,
  ListTodo,
  MessageSquare,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { Skeleton, SkeletonStatGrid } from '../components/Loader.jsx';
import { PriorityBadge, StatusBadge } from '../components/Badge.jsx';
import { dashboardApi, isAbortError } from '../services/api.js';
import { useDocumentTitle } from '../hooks/useDebounce.js';
import {
  formatRelativeTime,
  formatShortDate,
  getDeadlineMeta,
  getGreeting,
  isOverdue,
} from '../utils/format.js';

const STATUS_COLORS = {
  'To Do': '#7D879B',
  'In Progress': '#5B8CFF',
  Completed: '#35D6A4',
};

const PRIORITY_COLORS = {
  Low: '#7D879B',
  Medium: '#F3B64B',
  High: '#FF8A4C',
  Critical: '#FF5C7A',
};

function buildDonut(distribution) {
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return { total, gradient: 'conic-gradient(#232838 0% 100%)' };

  let cursor = 0;
  const stops = distribution.map((item) => {
    const start = cursor;
    cursor += (item.count / total) * 100;
    return `${STATUS_COLORS[item.status]} ${start}% ${cursor}%`;
  });
  return { total, gradient: `conic-gradient(${stops.join(', ')})` };
}

function DashboardSkeleton() {
  return (
    <div className="page">
      <Skeleton width={220} height={14} />
      <Skeleton width={380} height={34} style={{ marginTop: 14 }} />
      <Skeleton width={420} height={14} style={{ marginTop: 14 }} />
      <SkeletonStatGrid />
      <div className="dash-grid dash-grid--main" style={{ marginTop: 22 }}>
        <div className="card" style={{ padding: 24 }}>
          <Skeleton width={180} height={18} />
          <Skeleton width="100%" height={190} style={{ marginTop: 22 }} />
        </div>
        <div className="card" style={{ padding: 24 }}>
          <Skeleton width={140} height={18} />
          <Skeleton width="100%" height={60} style={{ marginTop: 20 }} />
          <Skeleton width="100%" height={60} style={{ marginTop: 12 }} />
          <Skeleton width="100%" height={60} style={{ marginTop: 12 }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  useDocumentTitle('Dashboard');

  /**
   * useEffect + async data fetching: re-runs whenever refreshKey changes,
   * and aborts the in-flight request when the component unmounts.
   */
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    dashboardApi
      .stats({ signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setStats(response.data);
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
  }, [refreshKey]);

  if (loading && !stats) return <DashboardSkeleton />;

  if (error && !stats) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <p className="eyebrow"><Sparkles size={13} /> Workspace overview</p>
            <h1>Dashboard</h1>
          </div>
        </div>
        <ErrorAlert
          title="Could not load dashboard statistics"
          message={error.message}
          details={error.details}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      </div>
    );
  }

  const totals = stats?.totals || {
    projects: 0,
    tasks: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    completionPercentage: 0,
    overdue: 0,
  };
  const statusDistribution = stats?.statusDistribution || [];
  const priorityDistribution = stats?.priorityDistribution || [];
  const recentProjects = stats?.recentProjects || [];
  const recentTasks = stats?.recentTasks || [];
  const donut = buildDonut(statusDistribution);
  const maxPriority = Math.max(1, ...priorityDistribution.map((item) => item.count));
  const hasData = totals.projects > 0 || totals.tasks > 0;

  const statCards = [
    { label: 'Total projects', value: totals.projects, hint: 'Active workspaces', icon: FolderKanban, tone: 'violet' },
    { label: 'Total tasks', value: totals.tasks, hint: 'Tracked work items', icon: ListTodo, tone: 'blue' },
    { label: 'Completed', value: totals.completed, hint: 'Shipped tasks', icon: CheckCircle2, tone: 'green' },
    { label: 'In progress', value: totals.inProgress, hint: 'Actively in flight', icon: Activity, tone: 'amber' },
    { label: 'Pending', value: totals.pending, hint: 'Waiting in backlog', icon: CircleDashed, tone: 'rose' },
    {
      label: 'Completion',
      value: `${totals.completionPercentage}%`,
      hint: `${totals.completed} of ${totals.tasks} tasks complete`,
      icon: Target,
      tone: 'cyan',
      progress: totals.completionPercentage,
    },
  ];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            <Sparkles size={13} /> AI-powered workspace
          </p>
          <h1>
            {getGreeting()}, <span className="gradient-text">Developer</span>
          </h1>
          <p className="page-subtitle">
            Here is what is moving across your projects today
            <span className="page-subtitle__date">
              <CalendarDays size={13} />
              {formatShortDate(new Date())}
            </span>
          </p>
        </div>
        <div className="page-header__actions">
          <Link className="btn btn--ghost" to="/assistant">
            <MessageSquare size={15} /> Ask assistant
          </Link>
          <Link className="btn btn--primary" to="/ai-planner">
            <Sparkles size={15} /> Generate plan
          </Link>
        </div>
      </header>

      {!hasData && (
        <div className="onboarding-strip">
          <span className="onboarding-strip__icon"><Sparkles size={20} /></span>
          <div>
            <p>Your workspace is empty — let&apos;s build something.</p>
            <span>Create a project manually, or describe an idea and let the AI planner generate a complete task breakdown.</span>
          </div>
          <div className="onboarding-strip__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => navigate('/projects?new=1')}>
              <FolderPlus size={14} /> New project
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => navigate('/ai-planner')}>
              <Sparkles size={14} /> Plan with AI
            </button>
          </div>
        </div>
      )}

      <section className="stats-grid" aria-label="Workspace statistics">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <div className="dash-grid dash-grid--main">
        <div className="dash-col">
          <section className="card analytics-card">
            <div className="card__header">
              <div>
                <h2>Task distribution</h2>
                <p>Live status breakdown across every project</p>
              </div>
              <span className="card__meta">{totals.tasks} total</span>
            </div>

            <div className="distribution">
              <div className="donut-wrap">
                <div className="donut" style={{ background: donut.gradient }}>
                  <div className="donut__hole">
                    <span className="donut__value">{donut.total}</span>
                    <span className="donut__label">tasks</span>
                  </div>
                </div>
              </div>

              <ul className="donut-legend">
                {statusDistribution.map((item) => {
                  const pct = donut.total ? Math.round((item.count / donut.total) * 100) : 0;
                  return (
                    <li key={item.status}>
                      <span className="donut-legend__dot" style={{ background: STATUS_COLORS[item.status] }} />
                      <span className="donut-legend__name">{item.status}</span>
                      <span className="donut-legend__count">{item.count}</span>
                      <span className="donut-legend__pct">{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="priority-mix">
              <p className="section-label">Priority mix</p>
              {priorityDistribution.map((item) => (
                <div className="priority-bar" key={item.priority}>
                  <span className="priority-bar__label">{item.priority}</span>
                  <div className="priority-bar__track">
                    <span
                      className="priority-bar__fill"
                      style={{
                        width: `${Math.round((item.count / maxPriority) * 100)}%`,
                        background: PRIORITY_COLORS[item.priority],
                      }}
                    />
                  </div>
                  <span className="priority-bar__count">{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card list-card">
            <div className="card__header">
              <div>
                <h2>Recent tasks</h2>
                <p>The latest work items added to your workspace</p>
              </div>
              <Link className="link-arrow" to="/tasks">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="No tasks yet"
                description="Create your first task or generate a plan with AI."
              />
            ) : (
              <ul className="recent-tasks">
                {recentTasks.map((task) => {
                  const deadline = getDeadlineMeta(task.dueDate);
                  const overdue = isOverdue(task.dueDate, task.status);
                  const projectName = typeof task.project === 'object' ? task.project?.name : '';
                  return (
                    <li key={task._id}>
                      <Link className="recent-task" to={`/tasks?task=${task._id}`}>
                        <span className={`task-dot task-dot--${task.status.toLowerCase().replace(/\s+/g, '-')}`} />
                        <div className="recent-task__main">
                          <p>{task.title}</p>
                          <span>{projectName || 'Unassigned project'}</span>
                        </div>
                        <PriorityBadge priority={task.priority} withIcon={false} />
                        <span className={`deadline deadline--${overdue ? 'danger' : deadline.tone}`}>
                          {deadline.label}
                        </span>
                        <span className="recent-task__age">{formatRelativeTime(task.createdAt)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="dash-col dash-col--side">
          <section className="card quick-card">
            <div className="card__header">
              <div>
                <h2>Quick actions</h2>
                <p>Start your next move</p>
              </div>
            </div>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => navigate('/projects?new=1')}>
                <span className="quick-action__icon quick-action__icon--violet"><FolderPlus size={17} /></span>
                <span className="quick-action__text"><strong>New project</strong><small>Create a workspace</small></span>
                <ArrowRight size={14} className="quick-action__arrow" />
              </button>
              <button className="quick-action" onClick={() => navigate('/tasks?new=1')}>
                <span className="quick-action__icon quick-action__icon--blue"><Plus size={17} /></span>
                <span className="quick-action__text"><strong>Add task</strong><small>Track a work item</small></span>
                <ArrowRight size={14} className="quick-action__arrow" />
              </button>
              <button className="quick-action" onClick={() => navigate('/ai-planner')}>
                <span className="quick-action__icon quick-action__icon--cyan"><Sparkles size={17} /></span>
                <span className="quick-action__text"><strong>Generate a plan</strong><small>Idea → tasks in seconds</small></span>
                <ArrowRight size={14} className="quick-action__arrow" />
              </button>
              <button className="quick-action" onClick={() => navigate('/assistant')}>
                <span className="quick-action__icon quick-action__icon--amber"><MessageSquare size={17} /></span>
                <span className="quick-action__text"><strong>Ask the assistant</strong><small>Debug or explain code</small></span>
                <ArrowRight size={14} className="quick-action__arrow" />
              </button>
            </div>
          </section>

          <section className="card list-card">
            <div className="card__header">
              <div>
                <h2>Recent projects</h2>
                <p>Your most recently created workspaces</p>
              </div>
              <Link className="link-arrow" to="/projects">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No projects yet" description="Create a project to get started." />
            ) : (
              <ul className="recent-projects">
                {recentProjects.map((project) => (
                  <li key={project._id}>
                    <Link className="recent-project" to={`/projects/${project._id}`}>
                      <div className="recent-project__top">
                        <span className="recent-project__icon"><FolderKanban size={15} /></span>
                        <div className="recent-project__title">
                          <p>{project.name}</p>
                          <span>{project.technologies?.slice(0, 2).join(' · ') || 'No stack yet'}</span>
                        </div>
                        <StatusBadge status={project.status} withDot={false} />
                      </div>
                      <ProgressBar
                        value={project.progress}
                        label={`${project.taskStats?.completed || 0}/${project.taskStats?.total || 0} tasks`}
                        showValue
                        size="sm"
                        tone={project.progress === 100 && project.taskStats?.total > 0 ? 'green' : 'violet'}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
