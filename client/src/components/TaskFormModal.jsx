import { useEffect, useState } from 'react';
import { ListPlus, Save } from 'lucide-react';
import Modal from './Modal.jsx';
import ErrorAlert from './ErrorAlert.jsx';
import { Spinner } from './Loader.jsx';
import { projectsApi, tasksApi } from '../services/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { toDateInput } from '../utils/format.js';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['To Do', 'In Progress', 'Completed'];

export default function TaskFormModal({
  open,
  onClose,
  task = null,
  defaultProjectId = '',
  defaultStatus = 'To Do',
  onSaved,
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    project: '',
    priority: 'Medium',
    status: 'To Do',
    dueDate: '',
  });
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const editing = Boolean(task);

  useEffect(() => {
    if (!open) return undefined;

    setErrors({});
    setRequestError(null);

    const projectId =
      typeof task?.project === 'object' ? task.project?._id : task?.project || defaultProjectId || '';

    setForm({
      title: task?.title || '',
      description: task?.description || '',
      project: projectId,
      priority: task?.priority || 'Medium',
      status: task?.status || defaultStatus || 'To Do',
      dueDate: toDateInput(task?.dueDate),
    });

    let active = true;
    setLoadingProjects(true);
    projectsApi
      .list({ sort: 'name' })
      .then((response) => {
        if (!active) return;
        setProjects(response.data);
        setProjectsError(null);
        if (!projectId && response.data.length > 0) {
          setForm((current) => ({ ...current, project: response.data[0]._id }));
        }
      })
      .catch((error) => {
        if (active) setProjectsError(error.message);
      })
      .finally(() => active && setLoadingProjects(false));

    return () => {
      active = false;
    };
  }, [open, task, defaultProjectId, defaultStatus]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.title.trim().length < 2) nextErrors.title = 'Task title must be at least 2 characters.';
    if (!form.project) nextErrors.project = 'Choose the project this task belongs to.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      project: form.project,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate || null,
    };

    setSaving(true);
    setRequestError(null);
    try {
      const response = editing ? await tasksApi.update(task._id, payload) : await tasksApi.create(payload);
      toast.success(editing ? 'Task updated' : 'Task created', response.data.title);
      onSaved?.(response.data);
      onClose();
    } catch (error) {
      setRequestError({ message: error.message, details: error.details });
      toast.error('Could not save task', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Edit task' : 'New task'}
      subtitle={editing ? 'Adjust the task details and workflow state.' : 'Add a concrete unit of work to a project.'}
      icon={ListPlus}
      closeOnOverlay={!saving}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            className="btn btn--primary"
            disabled={saving || loadingProjects || projects.length === 0}
          >
            {saving ? <Spinner size={15} /> : <Save size={15} />}
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create task'}
          </button>
        </>
      }
    >
      <form id="task-form" className="form" onSubmit={handleSubmit}>
        {requestError && (
          <ErrorAlert
            title={editing ? 'Update failed' : 'Creation failed'}
            message={requestError.message}
            details={requestError.details}
          />
        )}
        {projectsError && <ErrorAlert title="Could not load projects" message={projectsError} />}
        {!loadingProjects && projects.length === 0 && (
          <ErrorAlert
            title="No projects yet"
            message="Create a project first, then add tasks to it."
          />
        )}

        <div className="field">
          <label htmlFor="task-title">
            Task title <span className="required">*</span>
          </label>
          <input
            id="task-title"
            className={`input ${errors.title ? 'is-invalid' : ''}`}
            value={form.title}
            onChange={update('title')}
            placeholder="e.g. Implement authentication middleware"
            maxLength={160}
            data-autofocus
          />
          {errors.title && <p className="field__error">{errors.title}</p>}
        </div>

        <div className="field">
          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            className="textarea"
            rows={3}
            value={form.description}
            onChange={update('description')}
            placeholder="What exactly needs to be done?"
            maxLength={3000}
          />
        </div>

        <div className="field">
          <label htmlFor="task-project">
            Project <span className="required">*</span>
          </label>
          <select
            id="task-project"
            className={`select ${errors.project ? 'is-invalid' : ''}`}
            value={form.project}
            onChange={update('project')}
            disabled={loadingProjects}
          >
            <option value="">{loadingProjects ? 'Loading projects…' : 'Select a project'}</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.project && <p className="field__error">{errors.project}</p>}
        </div>

        <div className="form-grid form-grid--3">
          <div className="field">
            <label htmlFor="task-priority">Priority</label>
            <select id="task-priority" className="select" value={form.priority} onChange={update('priority')}>
              {PRIORITIES.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-status">Status</label>
            <select id="task-status" className="select" value={form.status} onChange={update('status')}>
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-due">Due date</label>
            <input id="task-due" type="date" className="input" value={form.dueDate} onChange={update('dueDate')} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
