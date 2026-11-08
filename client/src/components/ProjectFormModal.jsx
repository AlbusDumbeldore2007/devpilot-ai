import { useEffect, useState } from 'react';
import { FolderPlus, Save } from 'lucide-react';
import Modal from './Modal.jsx';
import ErrorAlert from './ErrorAlert.jsx';
import { Spinner } from './Loader.jsx';
import { projectsApi } from '../services/api.js';
import { useToast } from '../hooks/useToast.jsx';
import { toDateInput, todayInput } from '../utils/format.js';

const PROJECT_STATUSES = ['Planning', 'In Progress', 'Completed', 'On Hold'];

const emptyForm = () => ({
  name: '',
  description: '',
  technologies: '',
  status: 'Planning',
  startDate: todayInput(),
  deadline: '',
});

export default function ProjectFormModal({ open, onClose, project = null, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const editing = Boolean(project);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setRequestError(null);
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        technologies: (project.technologies || []).join(', '),
        status: project.status || 'Planning',
        startDate: toDateInput(project.startDate),
        deadline: toDateInput(project.deadline),
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, project]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Project name must be at least 2 characters.';
    if (form.startDate && form.deadline && form.deadline < form.startDate) {
      nextErrors.deadline = 'Deadline must be later than the start date.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      technologies: form.technologies
        .split(',')
        .map((tech) => tech.trim())
        .filter(Boolean),
      status: form.status,
      ...(form.startDate && { startDate: form.startDate }),
      deadline: form.deadline || null,
    };

    setSaving(true);
    setRequestError(null);
    try {
      const response = editing ? await projectsApi.update(project._id, payload) : await projectsApi.create(payload);
      toast.success(editing ? 'Project updated' : 'Project created', response.data.name);
      onSaved?.(response.data);
      onClose();
    } catch (error) {
      setRequestError({ message: error.message, details: error.details });
      toast.error('Could not save project', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Edit project' : 'Create project'}
      subtitle={editing ? 'Update project details, stack and timeline.' : 'Set up a new development workspace.'}
      icon={FolderPlus}
      closeOnOverlay={!saving}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="project-form" className="btn btn--primary" disabled={saving}>
            {saving ? <Spinner size={15} /> : <Save size={15} />}
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
          </button>
        </>
      }
    >
      <form id="project-form" className="form" onSubmit={handleSubmit}>
        {requestError && (
          <ErrorAlert
            title={editing ? 'Update failed' : 'Creation failed'}
            message={requestError.message}
            details={requestError.details}
          />
        )}

        <div className="field">
          <label htmlFor="project-name">
            Project name <span className="required">*</span>
          </label>
          <input
            id="project-name"
            className={`input ${errors.name ? 'is-invalid' : ''}`}
            value={form.name}
            onChange={update('name')}
            placeholder="e.g. Orbis Analytics Platform"
            maxLength={120}
            data-autofocus
          />
          {errors.name && <p className="field__error">{errors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="project-description">Description</label>
          <textarea
            id="project-description"
            className="textarea"
            rows={3}
            value={form.description}
            onChange={update('description')}
            placeholder="What are you building, and for whom?"
            maxLength={2000}
          />
          <p className="field__hint">{form.description.length}/2000 characters</p>
        </div>

        <div className="field">
          <label htmlFor="project-technologies">Technologies</label>
          <input
            id="project-technologies"
            className="input"
            value={form.technologies}
            onChange={update('technologies')}
            placeholder="React, Node.js, MongoDB"
          />
          <p className="field__hint">Comma-separated stack items.</p>
        </div>

        <div className="form-grid form-grid--3">
          <div className="field">
            <label htmlFor="project-status">Status</label>
            <select id="project-status" className="select" value={form.status} onChange={update('status')}>
              {PROJECT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="project-start">Start date</label>
            <input id="project-start" type="date" className="input" value={form.startDate} onChange={update('startDate')} />
          </div>
          <div className="field">
            <label htmlFor="project-deadline">Deadline</label>
            <input
              id="project-deadline"
              type="date"
              className={`input ${errors.deadline ? 'is-invalid' : ''}`}
              value={form.deadline}
              onChange={update('deadline')}
            />
            {errors.deadline && <p className="field__error">{errors.deadline}</p>}
          </div>
        </div>
      </form>
    </Modal>
  );
}
