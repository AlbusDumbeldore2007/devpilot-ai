import { useState } from 'react';
import {
  ArrowRight,
  Braces,
  Check,
  FlaskConical,
  GitCompareArrows,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Terminal,
  Timer,
  ArrowUpFromLine,
} from 'lucide-react';
import {
  createCounter,
  createTaskFilter,
  runCallbacksDemo,
  runEventLoopDemo,
  runHoistingDemo,
  runPromisesDemo,
} from '../utils/jsConceptsDemo.js';
import { useDocumentTitle } from '../hooks/useDebounce.js';

const SAMPLE_TASKS = [
  { title: 'Build authentication', priority: 'High', status: 'In Progress' },
  { title: 'Write API tests', priority: 'Low', status: 'To Do' },
  { title: 'Deploy to staging', priority: 'Critical', status: 'To Do' },
  { title: 'Design dashboard', priority: 'Medium', status: 'Completed' },
  { title: 'Fix login redirect bug', priority: 'High', status: 'To Do' },
];

const CLOSURE_SNIPPET = `function createTaskFilter({ priority = '' }) {
  const selectedPriority = priority;      // captured
  return function filterTask(task) {      // closure
    return !selectedPriority || task.priority === selectedPriority;
  };
}

const onlyHigh = createTaskFilter({ priority: 'High' });
tasks.filter(onlyHigh);`;

const EVENT_LOOP_SNIPPET = `console.log('start');              // 1 sync
setTimeout(() => log('timeout'), 0);   // 4 macrotask
Promise.resolve().then(() => log('promise')); // 3 microtask
console.log('end');              // 2 sync`;

const HOISTING_SNIPPET = `console.log(value); // undefined (var is hoisted)
var value = 'ready';

shipped(); // works (function declaration is hoisted)
function shipped() { return 'yes'; }

console.log(temp); // ReferenceError (TDZ for let/const)
let temp = 'initialised';`;

const ASYNC_SNIPPET = `// Callback (error-first)
fetchTasks('High', (error, tasks) => { ... });

// Promise (composable with async/await)
const tasks = await fetchTasks('High');

// Convert callback → promise
const promisified = promisify(fetchTasks);`;

function ConsoleBox({ title = 'console', children, empty = 'Run the demo to see live output.' }) {
  return (
    <div className="lab-console">
      <div className="lab-console__header">
        <span className="lab-console__dots"><i /><i /><i /></span>
        <span>{title}</span>
        <Terminal size={13} />
      </div>
      <div className="lab-console__body">
        {children || <span className="lab-console__empty">{empty}</span>}
      </div>
    </div>
  );
}

function ConceptCard({ number, icon: Icon, title, concept, description, code, children }) {
  return (
    <article className="card lab-card">
      <header className="lab-card__header">
        <span className="lab-card__number">{number}</span>
        <span className="lab-card__icon"><Icon size={18} /></span>
        <div>
          <h2>{title}</h2>
          <span className="lab-card__concept">{concept}</span>
        </div>
      </header>
      <p className="lab-card__description">{description}</p>
      <pre className="lab-code"><code>{code}</code></pre>
      {children}
    </article>
  );
}

export default function JsLab() {
  const [priority, setPriority] = useState('All');
  const [counter] = useState(() => createCounter(0));
  const [countValue, setCountValue] = useState(0);
  const [eventEvents, setEventEvents] = useState([]);
  const [eventRunning, setEventRunning] = useState(false);
  const [hoistingLogs, setHoistingLogs] = useState(null);
  const [callbackLogs, setCallbackLogs] = useState(null);
  const [promiseLogs, setPromiseLogs] = useState(null);
  const [callbackRunning, setCallbackRunning] = useState(false);
  const [promiseRunning, setPromiseRunning] = useState(false);
  useDocumentTitle('JavaScript Lab');

  // Closure usage: the returned filter remembers the selected priority.
  const closureFilter = createTaskFilter({ priority: priority === 'All' ? '' : priority });
  const filteredTasks = SAMPLE_TASKS.filter(closureFilter);

  const runEventLoop = async () => {
    setEventRunning(true);
    setEventEvents([]);
    const collected = [];
    await runEventLoopDemo((event) => {
      collected.push(event);
      setEventEvents([...collected]);
    });
    setEventRunning(false);
  };

  const runCallbackDemo = async () => {
    setCallbackRunning(true);
    setCallbackLogs(null);
    const logs = await runCallbacksDemo();
    setCallbackLogs(logs);
    setCallbackRunning(false);
  };

  const runPromiseDemo = async () => {
    setPromiseRunning(true);
    setPromiseLogs(null);
    const logs = await runPromisesDemo();
    setPromiseLogs(logs);
    setPromiseRunning(false);
  };

  return (
    <div className="page lab-page">
      <header className="page-header">
        <div>
          <p className="eyebrow"><FlaskConical size={13} /> Academy</p>
          <h1>JavaScript Lab</h1>
          <p className="page-subtitle">
            Four core JavaScript concepts, executed live in the browser. Source:{' '}
            <code className="inline-code">client/src/utils/jsConceptsDemo.js</code>
          </p>
        </div>
      </header>

      <div className="lab-note">
        <span className="lab-note__icon"><Terminal size={17} /></span>
        <p>
          Every output below comes from real execution — no static text. Click each run button and watch the
          console update with the actual result or execution order.
        </p>
      </div>

      <div className="lab-grid">
        <ConceptCard
          number="15"
          icon={Braces}
          title="Closures"
          concept="Lexical scope · private state"
          description="A closure is a function that remembers variables from the scope in which it was created. The filter below is recreated with a captured priority, and the counter keeps private state."
          code={CLOSURE_SNIPPET}
        >
          <div className="lab-controls">
            {['All', 'Low', 'Medium', 'High', 'Critical'].map((option) => (
              <button
                key={option}
                className={`lab-chip ${priority === option ? 'is-active' : ''}`}
                onClick={() => setPriority(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <ConsoleBox title="closure output">
            <div className="lab-lines">
              <p><span className="lab-prompt">›</span> filter = createTaskFilter({'{'} priority: '{priority}' {'}'})</p>
              {filteredTasks.map((task) => (
                <p key={task.title} className="lab-line--success">
                  <Check size={12} /> {task.title} <span className="lab-muted">[{task.priority}]</span>
                </p>
              ))}
              {filteredTasks.length === 0 && <p className="lab-muted">No tasks matched.</p>}
            </div>
          </ConsoleBox>
          <div className="counter-demo">
            <div>
              <strong>Private counter</strong>
              <span>State lives inside the closure, not in a global.</span>
            </div>
            <div className="counter-demo__controls">
              <button className="icon-btn icon-btn--sm" onClick={() => setCountValue(counter.decrement())} aria-label="Decrement counter"><Minus size={14} /></button>
              <span className="counter-demo__value">{countValue}</span>
              <button className="icon-btn icon-btn--sm" onClick={() => setCountValue(counter.increment())} aria-label="Increment counter"><Plus size={14} /></button>
            </div>
          </div>
        </ConceptCard>

        <ConceptCard
          number="16"
          icon={Timer}
          title="Event Loop"
          concept="Call stack · microtasks · macrotasks"
          description="Synchronous code runs to completion first. Promise callbacks are microtasks and run before setTimeout callbacks, which are macrotasks. Run it to see the real order and timestamps."
          code={EVENT_LOOP_SNIPPET}
        >
          <div className="lab-controls">
            <button className="btn btn--primary btn--sm" onClick={runEventLoop} disabled={eventRunning}>
              {eventRunning ? <span className="spinner" /> : <Play size={14} />}
              {eventRunning ? 'Running…' : 'Run event loop demo'}
            </button>
          </div>
          <ConsoleBox title="execution order">
            {eventEvents.length > 0 && (
              <div className="lab-lines">
                {eventEvents.map((event) => (
                  <p key={`${event.step}-${event.at}`} className={`lab-line--${event.kind}`}>
                    <span className="lab-step">{event.step}</span>
                    {event.label}
                    <span className="lab-muted">+{event.at}ms</span>
                  </p>
                ))}
                {!eventRunning && (
                  <p className="lab-line--success"><Check size={12} /> Final order: 1 → 2 → 3 → 4</p>
                )}
              </div>
            )}
          </ConsoleBox>
        </ConceptCard>

        <ConceptCard
          number="17"
          icon={ArrowUpFromLine}
          title="Hoisting"
          concept="var · let/const TDZ · function declarations"
          description="Declarations are moved to the top of their scope during compilation. `var` starts as undefined, let/const stay in the Temporal Dead Zone, and function declarations are fully callable early."
          code={HOISTING_SNIPPET}
        >
          <div className="lab-controls">
            <button className="btn btn--primary btn--sm" onClick={() => setHoistingLogs(runHoistingDemo())}>
              <Play size={14} /> Run hoisting demo
            </button>
            {hoistingLogs && (
              <button className="btn btn--ghost btn--sm" onClick={() => setHoistingLogs(null)}>
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>
          <ConsoleBox title="hoisting output">
            {hoistingLogs && (
              <div className="lab-lines">
                {hoistingLogs.map((line, index) => (
                  <p key={index} className={line.includes('ReferenceError') ? 'lab-line--error' : ''}>
                    <span className="lab-prompt">{String(index + 1).padStart(2, '0')}</span> {line}
                  </p>
                ))}
              </div>
            )}
          </ConsoleBox>
        </ConceptCard>

        <ConceptCard
          number="18"
          icon={GitCompareArrows}
          title="Promises vs Callbacks"
          concept="Error-first callbacks · async/await · promisification"
          description="Both utilities fetch the same mock task data. Callbacks use an error-first signature; promises are composable with async/await. The third demo converts a callback API into a promise."
          code={ASYNC_SNIPPET}
        >
          <div className="lab-controls">
            <button className="btn btn--primary btn--sm" onClick={runCallbackDemo} disabled={callbackRunning}>
              {callbackRunning ? <span className="spinner" /> : <Play size={14} />}
              {callbackRunning ? 'Running…' : 'Run callback version'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={runPromiseDemo} disabled={promiseRunning}>
              {promiseRunning ? <span className="spinner" /> : <ArrowRight size={14} />}
              {promiseRunning ? 'Running…' : 'Run promise version'}
            </button>
          </div>

          <div className="lab-async-grid">
            <ConsoleBox title="callback pattern">
              {callbackLogs && (
                <div className="lab-lines">
                  {callbackLogs.map((line, index) => (
                    <p key={index}><span className="lab-prompt">{String(index + 1).padStart(2, '0')}</span> {line}</p>
                  ))}
                  <p className="lab-line--success"><Check size={12} /> Error-first callback resolved</p>
                </div>
              )}
            </ConsoleBox>
            <ConsoleBox title="promise / async-await">
              {promiseLogs && (
                <div className="lab-lines">
                  {promiseLogs.map((line, index) => (
                    <p key={index}><span className="lab-prompt">{String(index + 1).padStart(2, '0')}</span> {line}</p>
                  ))}
                  <p className="lab-line--success"><Check size={12} /> Promise chain + promisify resolved</p>
                </div>
              )}
            </ConsoleBox>
          </div>
          <p className="lab-card__footnote">
            <code className="inline-code">promisifyCallback(fetchTasksWithCallback)</code> is exported from the demo file —
            callbacks and promises wrap the same asynchronous operation.
          </p>
        </ConceptCard>
      </div>
    </div>
  );
}
