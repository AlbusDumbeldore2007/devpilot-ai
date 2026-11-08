/**
 * ─────────────────────────────────────────────────────────────────────────────
 * JAVASCRIPT CONCEPTS — PRACTICAL DEMONSTRATIONS
 * ─────────────────────────────────────────────────────────────────────────────
 * Every function in this file is executed live by the "JS Lab" page
 * (client/src/pages/JsLab.jsx). Comments below explain the academic concept
 * behind each implementation.
 */

/* ═══════════════════════════════════════════════════════════════════════════
 * 15. CLOSURES
 * A closure is a function bundled with its lexical environment. `filterTask`
 * below keeps references to the normalised criteria after `createTaskFilter`
 * has returned — those variables stay alive inside the closure.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function createTaskFilter({ search = '', priority = '', status = '' } = {}) {
  const term = search.trim().toLowerCase();
  const selectedPriority = priority;
  const selectedStatus = status;

  return function filterTask(task) {
    const matchesSearch =
      !term ||
      [task.title, task.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    const matchesPriority = !selectedPriority || task.priority === selectedPriority;
    const matchesStatus = !selectedStatus || task.status === selectedStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  };
}

/** A second closure example: private state that cannot be mutated externally. */
export function createCounter(initial = 0) {
  let count = initial;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 16. EVENT LOOP
 * Synchronous code runs first, then microtasks (Promise callbacks), then
 * macrotasks (setTimeout). The events are emitted as they actually happen,
 * so the UI shows the real execution order rather than a static list.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function runEventLoopDemo(onEvent = () => {}) {
  const events = [];
  const emit = (step, label, kind) => {
    const event = { step, label, kind, at: performance.now().toFixed(1) };
    events.push(event);
    onEvent(event);
  };

  emit(1, 'Synchronous: console.log("start")', 'sync');

  setTimeout(() => {
    emit(4, 'Macrotask: setTimeout callback', 'macro');
  }, 60);

  Promise.resolve().then(() => {
    emit(3, 'Microtask: Promise.then callback', 'micro');
  });

  emit(2, 'Synchronous: console.log("end")', 'sync');

  // Resolve after the macrotask has had time to run.
  return new Promise((resolve) => setTimeout(() => resolve(events), 120));
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 17. HOISTING
 * `var` declarations are hoisted and initialised with `undefined`; `let` and
 * `const` are hoisted but remain in the Temporal Dead Zone until initialised.
 * Function declarations are fully hoisted; function expressions are not.
 * ═══════════════════════════════════════════════════════════════════════════ */
export function runHoistingDemo() {
  const logs = [];

  // `status` is hoisted to the top of the function scope as undefined.
  logs.push(`var before assignment → ${String(status)}`);
  // eslint-disable-next-line no-var
  var status = 'ready';
  logs.push(`var after assignment → ${status}`);

  // Function declarations are callable before their line of definition.
  logs.push(`function declaration before definition → ${shipped()}`);

  function shipped() {
    return 'declaration was hoisted';
  }

  // Function expressions are assigned at runtime, so calling early fails.
  try {
    notYetDefined();
  } catch (error) {
    logs.push(`function expression before definition → ${error.name}: ${error.message}`);
  }
  // eslint-disable-next-line no-var
  var notYetDefined = function notYetDefined() {
    return 'now callable';
  };
  logs.push(`function expression after definition → ${notYetDefined()}`);

  // `let` is hoisted but inaccessible before initialisation (TDZ).
  try {
    // eslint-disable-next-line no-use-before-define
    logs.push(`let before declaration → ${temporalValue}`);
  } catch (error) {
    logs.push(`let before declaration → ${error.name}: ${error.message}`);
  }
  const temporalValue = 'initialised';
  logs.push(`let after declaration → ${temporalValue}`);

  return logs;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 18. PROMISES vs CALLBACKS
 * Both utilities fetch the same mock task data asynchronously. The callback
 * version uses an error-first callback; the promise version resolves/rejects.
 * `promisify` shows how one can be converted into the other.
 * ═══════════════════════════════════════════════════════════════════════════ */
const DEMO_TASKS = [
  { id: 't1', title: 'Build authentication', priority: 'High', status: 'In Progress' },
  { id: 't2', title: 'Design dashboard', priority: 'Medium', status: 'Completed' },
  { id: 't3', title: 'Write API tests', priority: 'Low', status: 'To Do' },
  { id: 't4', title: 'Deploy to staging', priority: 'Critical', status: 'To Do' },
];

/** Callback-style API: error-first signature, executed after a timer. */
export function fetchTasksWithCallback(priority, callback) {
  setTimeout(() => {
    try {
      const result = priority ? DEMO_TASKS.filter((task) => task.priority === priority) : DEMO_TASKS;
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  }, 220);
}

/** Promise-style API: same data, composable with async/await. */
export function fetchTasksWithPromise(priority) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (priority === 'Invalid') {
        reject(new Error('Unknown priority filter'));
        return;
      }
      const result = priority ? DEMO_TASKS.filter((task) => task.priority === priority) : DEMO_TASKS;
      resolve(result);
    }, 220);
  });
}

/** Convert an error-first callback API into a promise-returning API. */
export function promisifyCallback(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
}

export async function runCallbacksDemo() {
  const logs = [];
  logs.push('callback: request started');

  const result = await new Promise((resolve, reject) => {
    fetchTasksWithCallback('High', (error, tasks) => {
      if (error) reject(error);
      else resolve(tasks);
    });
  });

  logs.push(`callback: received ${result.length} task(s) → ${result.map((task) => task.title).join(', ')}`);
  return logs;
}

export async function runPromisesDemo() {
  const logs = [];
  logs.push('promise: request started');

  const tasks = await fetchTasksWithPromise('High');
  logs.push(`promise/await: received ${tasks.length} task(s) → ${tasks.map((task) => task.title).join(', ')}`);

  const promisified = promisifyCallback(fetchTasksWithCallback);
  const promisifiedTasks = await promisified('Critical');
  logs.push(`promisified callback: ${promisifiedTasks.map((task) => task.title).join(', ')}`);

  return logs;
}

/**
 * Used by ProjectDetails to filter its task list with a closure instead of
 * re-querying the server for a purely local view.
 */
export const filterTasksLocally = (tasks, criteria) => tasks.filter(createTaskFilter(criteria));
