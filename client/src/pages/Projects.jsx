import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderKanban, FolderPlus, Search, SlidersHorizontal, X } from 'lucide-react';
import ProjectCard from '../components/ProjectCard.jsx';
import ProjectFormModal from '../components/ProjectFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { SkeletonCards } from '../components/Loader.jsx';
import { projectsApi, isAbortError } from '../services/api.js';
import { useDebounce, useDocumentTitle } from '../hooks/useDebounce.js';
import { useToast } from '../hooks/useToast.jsx';

const STATUSES = ['Planning', 'In Progress', 'Completed', 'On Hold'];
const SORTS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'deadline', label: 'Deadline soonest' },
];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const debouncedSearch = useDebounce(search);
  const { toast } = useToast();
  useDocumentTitle('Projects');

  // Dashboard/quick-action deep link: /projects?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingProject(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /** Fetch filtered projects whenever filters change. */
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    projectsApi
      .list({ search: debouncedSearch, status, sort }, { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setProjects(response.data);
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
  }, [debouncedSearch, status, sort, refreshKey]);

  const openCreate = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    setDeleting(true);
    try {
      await projectsApi.remove(deletingProject._id);
      toast.success('Project deleted', `${deletingProject.name} and its tasks were removed.`);
      setDeletingProject(null);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      toast.error('Could not delete project', requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = Boolean(search || status || sort !== '-createdAt');
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setSort('-createdAt');
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow"><FolderKanban size={13} /> Workspace</p>
          <h1>Projects</h1>
          <p className="page-subtitle">
            {loading ? 'Loading projects…' : `${projects.length} project${projects.length === 1 ? '' : 's'} found`}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={openCreate}>
            <FolderPlus size={15} /> New project
          </button>
        </div>
      </header>

      <section className="toolbar card">
        <div className="toolbar__search">
          <Search size={16} className="toolbar__search-icon" />
          <input
            className="toolbar__input"
            placeholder="Search projects, descriptions or tech…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search projects"
          />
          {search && (
            <button className="toolbar__clear" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="toolbar__filters">
          <span className="toolbar__filter-label"><SlidersHorizontal size={14} /> Filter</span>
          <select className="select select--sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select className="select select--sm" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort projects">
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button className="btn btn--ghost btn--xs" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
      </section>

      {error && (
        <ErrorAlert
          title="Could not load projects"
          message={error.message}
          details={error.details}
          onRetry={() => setRefreshKey((key) => key + 1)}
        />
      )}

      {loading && projects.length === 0 ? (
        <SkeletonCards count={6} />
      ) : projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FolderKanban}
            title={hasFilters ? 'No projects match your filters' : 'No projects yet'}
            description={
              hasFilters
                ? 'Try a different search term or clear the filters to see everything.'
                : 'Create your first project or let the AI planner turn an idea into a full task breakdown.'
            }
            action={
              hasFilters ? (
                <button className="btn btn--ghost" onClick={clearFilters}>Clear filters</button>
              ) : (
                <button className="btn btn--primary" onClick={openCreate}>
                  <FolderPlus size={15} /> Create project
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className={`projects-grid ${loading ? 'is-refreshing' : ''}`}>
          {projects.map((project) => (
            <ProjectCard key={project._id} project={project} onEdit={openEdit} onDelete={setDeletingProject} />
          ))}
        </div>
      )}

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        project={editingProject}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />

      <ConfirmDialog
        open={Boolean(deletingProject)}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete project?"
        message={`“${deletingProject?.name}” and all of its tasks will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete project"
      />
    </div>
  );
}
