import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ListTodo, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { StatusBadge } from './Badge.jsx';
import ProgressBar from './ProgressBar.jsx';
import { formatRelativeTime, getDeadlineMeta, techColor } from '../utils/format.js';

export default function ProjectCard({ project, onEdit, onDelete }) {
  const navigate = useNavigate();
  const deadline = getDeadlineMeta(project.deadline);
  const totalTasks = project.taskStats?.total ?? 0;
  const completed = project.taskStats?.completed ?? 0;
  const visibleTech = project.technologies?.slice(0, 3) || [];
  const extraTech = (project.technologies?.length || 0) - visibleTech.length;

  const openProject = () => navigate(`/projects/${project._id}`);

  return (
    <article
      className="project-card"
      onClick={openProject}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProject();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Open project ${project.name}`}
    >
      <div className={`project-card__glow project-card__glow--${project.status.toLowerCase().replace(/\s+/g, '-')}`} />

      <div className="project-card__top">
        <span className="project-card__icon">
          <ListTodo size={19} strokeWidth={1.9} />
        </span>
        <StatusBadge status={project.status} />
        <div className="project-card__menu">
          <button
            className="icon-btn icon-btn--sm"
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.(project);
            }}
            aria-label={`Edit ${project.name}`}
            title="Edit project"
          >
            <Pencil size={14} />
          </button>
          <button
            className="icon-btn icon-btn--sm icon-btn--danger"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(project);
            }}
            aria-label={`Delete ${project.name}`}
            title="Delete project"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 className="project-card__title">{project.name}</h3>
      <p className="project-card__description">{project.description || 'No description yet.'}</p>

      <div className="project-card__techs">
        {visibleTech.map((tech) => (
          <span key={tech} className={`tech-chip tech-chip--${techColor(tech)}`}>
            {tech}
          </span>
        ))}
        {extraTech > 0 && <span className="tech-chip tech-chip--more">+{extraTech}</span>}
        {visibleTech.length === 0 && <span className="tech-chip tech-chip--more">No stack added</span>}
      </div>

      <div className="project-card__progress">
        <ProgressBar
          value={project.progress || 0}
          label={`${completed}/${totalTasks} tasks`}
          showValue
          tone={project.progress === 100 && totalTasks > 0 ? 'green' : 'violet'}
        />
      </div>

      <div className="project-card__footer">
        <span className={`deadline deadline--${deadline.tone}`}>
          <CalendarDays size={13} />
          {deadline.label}
        </span>
        <span className="project-card__updated">
          <CheckCircle2 size={13} />
          {formatRelativeTime(project.updatedAt || project.createdAt)}
        </span>
        <Link
          to={`/projects/${project._id}`}
          className="project-card__open"
          onClick={(event) => event.stopPropagation()}
        >
          Open
          <MoreHorizontal size={14} />
        </Link>
      </div>
    </article>
  );
}
