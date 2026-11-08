import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Circle,
  Clock,
  FileJson,
  FolderKanban,
  Gauge,
  Layers,
  Lightbulb,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { DifficultyBadge, TechChip } from '../components/Badge.jsx';
import { Spinner } from '../components/Loader.jsx';
import { aiApi } from '../services/api.js';
import { useDocumentTitle } from '../hooks/useDebounce.js';
import { useToast } from '../hooks/useToast.jsx';
import { addDaysToInput, formatDate, techColor, todayInput } from '../utils/format.js';

const DIFFICULTIES = [
  { value: 'Easy', label: 'Easy', hint: 'Weekend build' },
  { value: 'Medium', label: 'Medium', hint: '1–3 weeks' },
  { value: 'Hard', label: 'Hard', hint: 'Production grade' },
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TASK_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const IDEAS = [
  'A habit tracker with streaks, reminders and weekly insights',
  'A REST API for a support ticketing system with SLAs',
  'A developer portfolio with a blog, analytics and contact form',
];

const GENERATION_STEPS = [
  'Analysing the idea and scope',
  'Choosing a realistic technology stack',
  'Structuring development phases',
  'Estimating task effort and priorities',
];

let keyCounter = 0;
const makeKey = (prefix) => {
  keyCounter += 1;
  return `${prefix}-${Date.now()}-${keyCounter}`;
};

const stripTask = (task) => ({
  title: task.title.trim(),
  description: task.description.trim(),
  priority: task.priority,
  difficulty: task.difficulty,
  estimatedDays: Math.min(60, Math.max(1, Number(task.estimatedDays) || 1)),
});

function GeneratingPanel() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setStep((current) => Math.min(current + 1, GENERATION_STEPS.length - 1)), 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ai-generating card">
      <div className="ai-generating__orb">
        <Sparkles size={24} />
        <span className="ai-generating__pulse" />
      </div>
      <h3>Designing your project plan</h3>
      <p className="ai-generating__sub">The backend is prompting the LLM and validating its structured JSON response.</p>
      <ul className="generating-steps">
        {GENERATION_STEPS.map((label, index) => (
          <li key={label} className={index < step ? 'is-done' : index === step ? 'is-active' : ''}>
            <span className="generating-steps__marker">
              {index < step ? <Check size={12} /> : index === step ? <Spinner size={12} /> : <Circle size={10} />}
            </span>
            {label}
          </li>
        ))}
      </ul>
      <div className="generating-bar"><span /></div>
      <p className="ai-generating__note">This can take 10–30 seconds depending on the model.</p>
    </div>
  );
}

export default function AIPlanner() {
  const [idea, setIdea] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [selected, setSelected] = useState({});
  const [startDate, setStartDate] = useState(todayInput());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  useDocumentTitle('AI Project Planner');

  const allTasks = useMemo(() => plan?.phases.flatMap((phase) => phase.tasks) || [], [plan]);
  const selectedTasks = useMemo(() => allTasks.filter((task) => selected[task._key]), [allTasks, selected]);
  const allSelected = allTasks.length > 0 && selectedTasks.length === allTasks.length;
  const totalDays = selectedTasks.reduce((sum, task) => sum + (Number(task.estimatedDays) || 1), 0);
  const estimatedDeadline = addDaysToInput(startDate, Math.max(totalDays, 1));

  const resetPlan = () => {
    setPlan(null);
    setSelected({});
    setSaved(null);
    setSaveError(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (idea.trim().length < 10) {
      toast.error('Idea too short', 'Describe the project in at least 10 characters.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSaved(null);
    setSaveError(null);

    try {
      const response = await aiApi.generatePlan({ idea: idea.trim(), difficulty });
      const generated = {
        ...response.data,
        phases: response.data.phases.map((phase) => ({
          ...phase,
          _key: makeKey('phase'),
          tasks: phase.tasks.map((task) => ({ ...task, _key: makeKey('task') })),
        })),
      };

      const selection = {};
      generated.phases.forEach((phase) => {
        phase.tasks.forEach((task) => {
          selection[task._key] = true;
        });
      });
      const generatedTaskCount = generated.phases.reduce((total, phase) => total + phase.tasks.length, 0);

      setPlan(generated);
      setSelected(selection);
      toast.success(
        'Plan generated',
        `${generated.phases.length} phases · ${generatedTaskCount} tasks ready for review.`
      );
    } catch (requestError) {
      setError({ message: requestError.message, details: requestError.details, code: requestError.code });
      toast.error('Plan generation failed', requestError.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = (key) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }
    const next = {};
    allTasks.forEach((task) => {
      next[task._key] = true;
    });
    setSelected(next);
  };

  /* ── Plan editing ─────────────────────────────────────────────────── */
  const updateTaskField = (phaseKey, taskKey, field, value) => {
    setPlan((current) => ({
      ...current,
      phases: current.phases.map((phase) =>
        phase._key === phaseKey
          ? {
              ...phase,
              tasks: phase.tasks.map((task) => (task._key === taskKey ? { ...task, [field]: value } : task)),
            }
          : phase
      ),
    }));
  };

  const updatePhaseName = (phaseKey, name) => {
    setPlan((current) => ({
      ...current,
      phases: current.phases.map((phase) => (phase._key === phaseKey ? { ...phase, name } : phase)),
    }));
  };

  const addTask = (phaseKey) => {
    const newTask = {
      _key: makeKey('task'),
      title: 'New task',
      description: 'Describe the work to be done.',
      priority: 'Medium',
      difficulty: plan.difficulty || 'Medium',
      estimatedDays: 1,
    };
    setPlan((current) => ({
      ...current,
      phases: current.phases.map((phase) =>
        phase._key === phaseKey ? { ...phase, tasks: [...phase.tasks, newTask] } : phase
      ),
    }));
    setSelected((current) => ({ ...current, [newTask._key]: true }));
    setSaved(null);
  };

  const removeTask = (phaseKey, taskKey) => {
    setPlan((current) => ({
      ...current,
      phases: current.phases.map((phase) =>
        phase._key === phaseKey ? { ...phase, tasks: phase.tasks.filter((task) => task._key !== taskKey) } : phase
      ),
    }));
    setSelected((current) => {
      const next = { ...current };
      delete next[taskKey];
      return next;
    });
    setSaved(null);
  };

  const buildSelectedPlan = () => ({
    projectTitle: plan.projectTitle,
    description: plan.description,
    technologies: plan.technologies,
    difficulty: plan.difficulty,
    phases: plan.phases
      .map((phase) => ({
        name: phase.name.trim(),
        tasks: phase.tasks.filter((task) => selected[task._key]).map(stripTask),
      }))
      .filter((phase) => phase.tasks.length > 0),
  });

  const handleSave = async () => {
    const selectedPlan = buildSelectedPlan();
    if (selectedPlan.phases.length === 0) {
      toast.error('No tasks selected', 'Select at least one generated task to save the plan.');
      return;
    }

    const invalidPhase = selectedPlan.phases.find((phase) => phase.name.length < 2);
    if (invalidPhase) {
      toast.error('Phase name required', 'Every selected phase needs a name with at least 2 characters.');
      return;
    }

    const invalidTask = selectedPlan.phases.flatMap((phase) => phase.tasks).find((task) => task.title.length < 2);
    if (invalidTask) {
      toast.error('Task title required', 'Every selected task needs a title with at least 2 characters.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const response = await aiApi.savePlan({ plan: selectedPlan, startDate: startDate || undefined });
      setSaved(response.data);
      toast.success('Plan saved to MongoDB', response.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (requestError) {
      setSaveError({ message: requestError.message, details: requestError.details });
      toast.error('Could not save plan', requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page ai-page">
      <section className="ai-hero">
        <div className="ai-hero__glow" />
        <span className="ai-badge"><Sparkles size={13} /> AI Project Planner</span>
        <h1>
          Turn a rough idea into a <span className="gradient-text">shipped plan</span>
        </h1>
        <p>
          Describe what you want to build. DevPilot AI returns a structured architecture, phase-by-phase
          task breakdown, priorities and effort estimates — validated by the backend before anything is saved.
        </p>
      </section>

      <div className="ai-input-grid">
        <form
          className="card ai-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleGenerate();
          }}
        >
          <div className="ai-form__header">
            <span className="ai-form__icon"><Wand2 size={17} /></span>
            <div>
              <h2>Describe your project</h2>
              <p>Be specific about the product, users and core features.</p>
            </div>
          </div>

          <div className="field">
            <div className="field__label-row">
              <label htmlFor="ai-idea">Project idea <span className="required">*</span></label>
              <span className="field__counter">{idea.length}/4000</span>
            </div>
            <textarea
              id="ai-idea"
              className="textarea ai-textarea"
              rows={6}
              value={idea}
              onChange={(event) => setIdea(event.target.value.slice(0, 4000))}
              placeholder="e.g. Build a SaaS dashboard where freelance developers can track clients, invoices and project deadlines, with email reminders and a revenue chart…"
              maxLength={4000}
            />
            <p className="field__hint">Minimum 10 characters. The more context, the better the plan.</p>
          </div>

          <div className="idea-chips">
            <span><Lightbulb size={13} /> Try:</span>
            {IDEAS.map((example) => (
              <button type="button" key={example} onClick={() => setIdea(example)}>
                {example}
              </button>
            ))}
          </div>

          <div className="field">
            <label>Difficulty level</label>
            <div className="segmented segmented--difficulty">
              {DIFFICULTIES.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={difficulty === option.value ? 'is-active' : ''}
                  onClick={() => setDifficulty(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--lg ai-generate" disabled={generating || idea.trim().length < 10}>
            {generating ? <Spinner size={17} /> : <Sparkles size={17} />}
            {generating ? 'Generating plan…' : 'Generate plan'}
            {!generating && <ArrowRight size={16} />}
          </button>
        </form>

        <aside className="ai-side">
          <div className="card ai-side__card">
            <h3>What you get</h3>
            <ul className="ai-outcomes">
              <li><span><FileJson size={15} /></span><div><strong>Structured output</strong><p>A project title, description and suggested stack.</p></div></li>
              <li><span><Layers size={15} /></span><div><strong>Development phases</strong><p>3–5 logical stages in the right build order.</p></div></li>
              <li><span><ListChecks size={15} /></span><div><strong>Actionable tasks</strong><p>Priorities, difficulty and per-task day estimates.</p></div></li>
              <li><span><ShieldCheck size={15} /></span><div><strong>Backend validation</strong><p>JSON is validated before it can touch MongoDB.</p></div></li>
            </ul>
          </div>

          <div className="card ai-engine">
            <span className="ai-engine__icon"><Gauge size={17} /></span>
            <div>
              <p>LLM API integration</p>
              <span>Prompt engineering · JSON mode · server-side key</span>
            </div>
          </div>
        </aside>
      </div>

      {generating && <GeneratingPanel />}

      {error && !generating && (
        <ErrorAlert
          title={error.code === 'AI_NOT_CONFIGURED' ? 'AI features are not configured' : 'Plan generation failed'}
          message={error.message}
          details={error.details}
          onRetry={handleGenerate}
        />
      )}

      {saved && (
        <div className="save-success card">
          <span className="save-success__icon"><BadgeCheck size={22} /></span>
          <div>
            <h3>Plan saved to MongoDB</h3>
            <p>
              <strong>{saved.project.name}</strong> was created with{' '}
              <strong>{saved.tasks.length} tasks</strong>. You can now manage it like any other project.
            </p>
          </div>
          <div className="save-success__actions">
            <Link to={`/projects/${saved.project._id}`} className="btn btn--primary btn--sm">
              <FolderKanban size={14} /> Open project
            </Link>
            <button className="btn btn--ghost btn--sm" onClick={resetPlan}>
              <RotateCcw size={14} /> Plan another
            </button>
          </div>
        </div>
      )}

      {plan && !generating && (
        <section className="plan">
          <div className="card plan-header">
            <div className="plan-header__main">
              <span className="plan-header__eyebrow"><Sparkles size={13} /> Generated plan</span>
              <h2>{plan.projectTitle}</h2>
              <p>{plan.description}</p>
              <div className="plan-header__techs">
                {plan.technologies.map((tech) => (
                  <TechChip key={tech}><span className={`tech-dot tech-dot--${techColor(tech)}`} />{tech}</TechChip>
                ))}
                <DifficultyBadge difficulty={plan.difficulty} />
              </div>
            </div>
            <div className="plan-header__stats">
              <div><span>Phases</span><strong>{plan.phases.length}</strong></div>
              <div><span>Tasks</span><strong>{allTasks.length}</strong></div>
              <div><span>Effort</span><strong>{totalDays}d</strong></div>
            </div>
          </div>

          <div className="card plan-toolbar">
            <label className="checkbox-row">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span>Select all tasks</span>
            </label>
            <span className="plan-toolbar__count">
              {selectedTasks.length} of {allTasks.length} selected · {totalDays} estimated days
            </span>
            <div className="plan-toolbar__controls">
              <label className="date-field">
                <CalendarDays size={14} />
                <span>Start</span>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>
              <span className="plan-toolbar__deadline">
                <Clock size={13} /> Ends {formatDate(estimatedDeadline ? `${estimatedDeadline}T00:00:00` : null)}
              </span>
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving || selectedTasks.length === 0 || Boolean(saved)}
              >
                {saving ? <Spinner size={15} /> : <Save size={15} />}
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save plan'}
              </button>
            </div>
          </div>

          {saveError && (
            <ErrorAlert title="Could not save plan" message={saveError.message} details={saveError.details} />
          )}

          <div className="phases">
            {plan.phases.map((phase, phaseIndex) => {
              const phaseSelectedCount = phase.tasks.filter((task) => selected[task._key]).length;
              return (
                <article className="card phase-card" key={phase._key}>
                  <header className="phase-card__header">
                    <span className="phase-card__index">{String(phaseIndex + 1).padStart(2, '0')}</span>
                    <input
                      className="phase-card__name"
                      value={phase.name}
                      onChange={(event) => updatePhaseName(phase._key, event.target.value)}
                      aria-label={`Phase ${phaseIndex + 1} name`}
                    />
                    <span className="phase-card__meta">
                      {phaseSelectedCount}/{phase.tasks.length} selected
                    </span>
                  </header>

                  <div className="plan-tasks">
                    {phase.tasks.map((task) => (
                      <div className={`plan-task ${selected[task._key] ? 'is-selected' : ''}`} key={task._key}>
                        <label className="plan-task__check">
                          <input
                            type="checkbox"
                            checked={Boolean(selected[task._key])}
                            onChange={() => toggleTask(task._key)}
                            aria-label={`Select ${task.title}`}
                          />
                        </label>

                        <div className="plan-task__content">
                          <input
                            className="plan-task__title"
                            value={task.title}
                            onChange={(event) => updateTaskField(phase._key, task._key, 'title', event.target.value)}
                            aria-label="Task title"
                          />
                          <textarea
                            className="plan-task__description"
                            rows={2}
                            value={task.description}
                            onChange={(event) => updateTaskField(phase._key, task._key, 'description', event.target.value)}
                            aria-label="Task description"
                            placeholder="Describe the task…"
                          />
                        </div>

                        <div className="plan-task__meta">
                          <label>
                            <span>Priority</span>
                            <select
                              className="select select--xs"
                              value={task.priority}
                              onChange={(event) => updateTaskField(phase._key, task._key, 'priority', event.target.value)}
                            >
                              {PRIORITIES.map((option) => <option key={option}>{option}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>Difficulty</span>
                            <select
                              className="select select--xs"
                              value={task.difficulty}
                              onChange={(event) => updateTaskField(phase._key, task._key, 'difficulty', event.target.value)}
                            >
                              {TASK_DIFFICULTIES.map((option) => <option key={option}>{option}</option>)}
                            </select>
                          </label>
                          <label>
                            <span>Days</span>
                            <input
                              className="input input--xs"
                              type="number"
                              min={1}
                              max={60}
                              value={task.estimatedDays}
                              onChange={(event) =>
                                updateTaskField(phase._key, task._key, 'estimatedDays', Math.max(1, Number(event.target.value) || 1))
                              }
                            />
                          </label>
                          <button
                            className="icon-btn icon-btn--sm icon-btn--danger plan-task__delete"
                            onClick={() => removeTask(phase._key, task._key)}
                            aria-label={`Remove ${task.title}`}
                            title="Remove task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {selected[task._key] && (
                          <span className="plan-task__selected">
                            <Check size={11} /> Included
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <footer className="phase-card__footer">
                    <button className="btn btn--ghost btn--xs" onClick={() => addTask(phase._key)}>
                      <Plus size={14} /> Add task to phase
                    </button>
                    <div className="phase-card__footer-meta">
                      <span>{phase.tasks.reduce((sum, task) => sum + (Number(task.estimatedDays) || 1), 0)} days total</span>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>

          <div className="plan-actions">
            <button className="btn btn--ghost" onClick={() => { resetPlan(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <RefreshCw size={15} /> Start over
            </button>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || selectedTasks.length === 0 || Boolean(saved)}>
              {saving ? <Spinner size={15} /> : <Save size={15} />}
              {saving ? 'Saving…' : `Save ${selectedTasks.length} selected task${selectedTasks.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
