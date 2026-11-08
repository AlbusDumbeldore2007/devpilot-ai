# DevPilot AI — Low-Level Design (LLD)

**Project:** DevPilot AI
**Document type:** Low-Level Design
**Related documents:** `PRD.md`, `HLD.md`, `README.md`
**Implementation source of truth:** the files under `client/src` and `server/`

---

## 1. Purpose

This document describes the concrete implementation of DevPilot AI at file, module, component, endpoint, schema and function level. Every item below exists in the repository. Where behaviour is limited, the limitation is stated rather than inferred.

---

## 2. Repository structure

```text
devpilot-ai/
├── client/
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx                 React root, BrowserRouter, ToastProvider
│       ├── App.jsx                  Route table
│       ├── components/
│       │   ├── Badge.jsx            Status/Priority/Difficulty/Tech badges
│       │   ├── ConfirmDialog.jsx    Confirmation modal
│       │   ├── EmptyState.jsx       Empty-view placeholder
│       │   ├── ErrorAlert.jsx       Error message + retry/details
│       │   ├── HealthBanner.jsx     Database/AI/API warnings
│       │   ├── Loader.jsx           Spinner + skeleton components
│       │   ├── Logo.jsx             Brand mark
│       │   ├── Modal.jsx            Portal dialog with focus trap
│       │   ├── Navbar.jsx           Breadcrumb, health pill, CTA
│       │   ├── ProgressBar.jsx      Progress indicator
│       │   ├── ProjectCard.jsx      Project summary card
│       │   ├── ProjectFormModal.jsx Project create/edit form
│       │   ├── Sidebar.jsx          Grouped navigation + status
│       │   ├── StatCard.jsx         Dashboard metric card
│       │   ├── TaskCard.jsx         Kanban card / list row
│       │   ├── TaskDetailsModal.jsx Task detail dialog
│       │   └── TaskFormModal.jsx    Task create/edit form
│       ├── hooks/
│       │   ├── useDebounce.js       useDebounce + useDocumentTitle
│       │   ├── useSystemHealth.js   /api/health loader
│       │   └── useToast.jsx         Toast context/provider
│       ├── layouts/
│       │   └── AppLayout.jsx        Sidebar + Navbar + HealthBanner + Outlet
│       ├── pages/
│       │   ├── Dashboard.jsx        Live analytics
│       │   ├── Projects.jsx         Project list + CRUD
│       │   ├── ProjectDetails.jsx   Project workspace
│       │   ├── Tasks.jsx            Kanban + list
│       │   ├── AIPlanner.jsx        Plan generation/edit/save
│       │   ├── Assistant.jsx        Multi-turn chat
│       │   ├── JsLab.jsx            Executable JS demos
│       │   └── NotFound.jsx         404 page
│       ├── services/
│       │   └── api.js               fetch wrapper + endpoint groups
│       ├── styles/
│       │   ├── global.css
│       │   ├── layout.css
│       │   ├── components.css
│       │   ├── pages.css
│       │   └── index.css
│       └── utils/
│           ├── format.js            Date/deadline/tech formatting
│           └── jsConceptsDemo.js    Mandatory JS demonstrations
├── server/
│   ├── config/
│   │   ├── env.js                   dotenv + typed config
│   │   └── db.js                    Mongoose connection/retry
│   ├── controllers/
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   ├── dashboardController.js
│   │   └── aiController.js
│   ├── middleware/
│   │   ├── asyncHandler.js
│   │   ├── errorHandler.js
│   │   ├── logger.js
│   │   └── validate.js
│   ├── models/
│   │   ├── Project.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── projectRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── aiRoutes.js
│   ├── services/
│   │   ├── aiService.js
│   │   └── taskStatsService.js
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── constants.js
│   │   ├── planValidator.js
│   │   ├── prompts.js
│   │   ├── query.js
│   │   ├── seed.js
│   │   └── validators.js
│   ├── .env                         Local only; gitignored
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── PRD.md
├── HLD.md
├── LLD.md
├── GITHUB_SETUP.md
└── README.md
```

Generated directories (`node_modules/`, `client/dist/`) and `server/.env` are excluded by `.gitignore`.

---

## 3. Frontend design

### 3.1 Entry points

#### `client/src/main.jsx`

- Creates the React root on `#root`.
- Wraps the app in `React.StrictMode`, `BrowserRouter` and `ToastProvider`.
- Imports font packages and `styles/index.css`.

#### `client/src/App.jsx`

Declares the route table inside `AppLayout`:

```jsx
<Routes>
  <Route element={<AppLayout />}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/projects" element={<Projects />} />
    <Route path="/projects/:id" element={<ProjectDetails />} />
    <Route path="/tasks" element={<Tasks />} />
    <Route path="/ai-planner" element={<AIPlanner />} />
    <Route path="/assistant" element={<Assistant />} />
    <Route path="/lab" element={<JsLab />} />
    <Route path="*" element={<NotFound />} />
  </Route>
</Routes>
```

#### `client/vite.config.js`

- React plugin.
- Dev server on port `5173`, `strictPort: true`.
- Proxies `/api` to `http://localhost:5000` with `changeOrigin: true`.
- Builds to `dist` with source maps disabled.

### 3.2 Layout

#### `AppLayout.jsx`

Responsibilities:

- Owns sidebar open/close state.
- Calls `useSystemHealth()` and passes `health`, `error`, `loading`, `refresh` to children.
- Closes the sidebar and scrolls to the top on pathname change.
- Toggles the `nav-open` body class while the mobile sidebar is open.
- Renders `Sidebar`, `Navbar`, `HealthBanner` and `<Outlet />`.

#### `Sidebar.jsx`

- Navigation sections: **Workspace** (Dashboard, Projects, Task Manager), **AI Copilot** (AI Project Planner, AI Assistant), **Academy** (JavaScript Lab).
- Uses `NavLink` for active styling.
- Derives a status label:
  - `API offline` when health request failed.
  - `Checking API…` before the first response.
  - `Database offline` when `database.connected` is false.
  - `AI key missing` when `ai.configured` is false.
  - `All systems operational` otherwise.
- Displays the configured model name when available.

#### `Navbar.jsx`

- Breadcrumb derived from pathname (`/projects/:id` → “Project Details”).
- Health pill: `API online`, `Degraded`, or `API offline`.
- “New task” button navigates to `/tasks?new=1`.
- Decorative local developer avatar.

#### `HealthBanner.jsx`

- Renders nothing while loading.
- Shows:
  - API unreachable warning when `error` exists.
  - MongoDB warning when `health.database.connected` is false.
  - AI warning when `health.ai.configured` is false.
- Each banner can be dismissed for the current mounted view.
- Database/API banners expose a retry button.

### 3.3 Pages

#### `Dashboard.jsx`

State: `stats`, `loading`, `error`, `refreshKey`.

Effects: fetch `dashboardApi.stats()` when `refreshKey` changes; abort on cleanup.

Derived data:

- `totals` fallback object when stats are absent.
- `buildDonut(statusDistribution)` creates a `conic-gradient` string from real counts.
- Priority bars scale each count against the maximum count.
- `hasData` drives the onboarding strip.

Rendering:

- Six `StatCard`s: projects, tasks, completed, in progress, pending, completion percentage.
- Donut chart with legend and counts.
- Priority mix bars.
- Recent tasks (with project name, priority, deadline state, age).
- Quick actions to `/projects?new=1`, `/tasks?new=1`, `/ai-planner`, `/assistant`.
- Recent projects with progress bars.
- Skeleton while first loading; `ErrorAlert` with retry on failure; `EmptyState` for empty lists.

#### `Projects.jsx`

State: `projects`, `loading`, `error`, search/status/sort filters, `refreshKey`, modal state.

Behaviour:

- `useDebounce(search)` delays the search request by 350 ms.
- `useEffect` fetches `projectsApi.list({ search, status, sort })` whenever filters or `refreshKey` change; aborts on cleanup.
- `?new=1` opens the create modal and removes the query parameter.
- `openEdit(project)` opens `ProjectFormModal` in edit mode.
- `handleDelete()` calls `projectsApi.remove`, shows a toast, closes the dialog and refreshes.
- Empty-state copy differs when filters are active.
- `is-refreshing` class keeps existing cards visible during refetch.

#### `ProjectDetails.jsx`

State: project, loading, error, refresh key, status filter tab, local search, modal/delete state.

Behaviour:

- Fetches `projectsApi.get(id)`.
- `visibleTasks` uses `filterTasksLocally(project.tasks, { status, search })`, which is built on the closure-based filter from `jsConceptsDemo.js`. This is a local view filter, not an API call.
- `handleStatusChange()` calls `tasksApi.update(task._id, { status })`.
- `handleDeleteTask()` and `handleDeleteProject()` call the corresponding delete endpoints.
- Renders hero metadata, technology chips, completion ring, four mini stats, task tabs with counts, local search, `TaskCard` rows and a progress bar.
- Handles 404 with a dedicated empty state.
- Opens `ProjectFormModal`, `TaskFormModal`, `TaskDetailsModal` and confirmation dialogs.

#### `Tasks.jsx`

State: tasks, projects (for filters/forms), loading/error, search, priority, project, status, sort, view (`board`/`list`), drag state, modals.

Behaviour:

- Loads project options with `projectsApi.list({ sort: 'name' })` for the filter and task form.
- Handles `?new=1` (open create) and `?task=<id>` (fetch and open details).
- Fetches tasks with all active filters. In board view the status filter is cleared (`effectiveStatus = ''`) because columns represent statuses; list view can filter by status.
- `updateTaskStatus()` applies an optimistic local change, sends `PUT /api/tasks/:id`, replaces the task on success, and restores the previous task on failure.
- Drag-and-drop:
  - `onDragStart` stores the task id.
  - Column `onDragOver` prevents default and sets `dragOver`.
  - Column `onDrop` calls `handleDrop(status)`.
- Board columns are computed client-side from the fetched tasks.
- List view renders the same `TaskCard` in `row` variant.
- Supports create, edit, details, complete/reopen and delete.

#### `AIPlanner.jsx`

State: idea, difficulty, generating, error, plan, selected map, start date, saving, saved result, save error.

Generation flow:

- Requires `idea.trim().length >= 10`.
- Calls `aiApi.generatePlan({ idea, difficulty })`.
- Adds internal `_key` values to phases and tasks for stable React keys and selection.
- Initially selects all generated tasks.
- Displays `GeneratingPanel` with rotating progress copy while the request is pending.

Editing:

- `updatePhaseName`, `updateTaskField`, `addTask`, `removeTask` update nested immutable state.
- `toggleTask` and `toggleAll` manage the selection map.
- `totalDays` sums selected `estimatedDays`.
- `estimatedDeadline` = start date + `max(totalDays, 1)` days.
- `buildSelectedPlan()` strips UI-only `_key` fields, removes unselected tasks and empty phases, and normalises numbers via `stripTask`.

Saving:

- Validates at least one selected task, phase name length and task title length.
- Calls `aiApi.savePlan({ plan, startDate })`.
- Shows a success card with the created project name, task count and links.
- Disables repeat saving once saved.

Errors:

- `AI_NOT_CONFIGURED` gets a dedicated title.
- Other failures show provider/validation details.
- Save errors render a separate `ErrorAlert`.

#### `Assistant.jsx`

State: messages, input, loading, error, model, clear-dialog state.

Behaviour:

- Initialises messages from `sessionStorage['devpilot-chat']` with a safe parse fallback.
- Persists the latest 40 messages on every change.
- Auto-scrolls the message container on messages/loading/error changes.
- Auto-resizes the composer up to 168 px.
- `sendMessage()` appends the user message, clears the input and requests a reply.
- `requestReply()` sends the latest 20 messages as `{ role, content }` to `aiApi.chat`.
- Appends the assistant reply and records the model name from `meta`.
- `retry()` re-sends the last conversation snapshot.
- `clearConversation()` removes state and session storage after confirmation.
- `MessageContent` renders fenced code blocks, inline code and bold text without a Markdown package.
- Suggested prompts are available in the empty state.

#### `JsLab.jsx`

Renders four `ConceptCard`s and executes `jsConceptsDemo.js` functions:

- **Closures:** priority chips rebuild `createTaskFilter`, filter `SAMPLE_TASKS`, and a private counter demonstrates captured state.
- **Event loop:** `runEventLoopDemo` emits real events and timestamps.
- **Hoisting:** `runHoistingDemo` returns log lines, including caught errors.
- **Promises vs callbacks:** separate buttons run the callback and promise demos.

All output is produced by function execution; there are no static result arrays in the page.

#### `NotFound.jsx`

Renders a 404 state with a link back to the dashboard.

### 3.4 Components

| Component | Description |
| --- | --- |
| `Badge.jsx` | Exports `StatusBadge`, `PriorityBadge`, `DifficultyBadge` and `TechChip`. Class names are derived from lowercased values so CSS can style each state. |
| `ConfirmDialog.jsx` | Wraps `Modal` with destructive-action copy, a loading state and configurable confirm label/tone. |
| `EmptyState.jsx` | Icon, title, description and optional action for empty views. |
| `ErrorAlert.jsx` | Displays title, message, optional details list and retry/action buttons. |
| `HealthBanner.jsx` | Renders dismissible configuration warnings from the health payload. |
| `Loader.jsx` | Exports `Spinner`, `PageLoader`, `Skeleton`, `SkeletonStatGrid` and `SkeletonCards`. |
| `Logo.jsx` | Brand mark and optional wordmark. |
| `Modal.jsx` | Portal dialog rendered into `document.body`. Handles Escape, backdrop click, body scroll lock, initial focus, a minimal Tab focus trap and focus restoration. |
| `Navbar.jsx` | Breadcrumb, health pill, new-task CTA and avatar. |
| `ProgressBar.jsx` | Label/value progress bar with tone and size variants. |
| `ProjectCard.jsx` | Clickable project card with status badge, stack chips, task progress, deadline state and edit/delete actions. Keyboard accessible. |
| `ProjectFormModal.jsx` | Create/edit project. Validates name and date order, converts comma-separated technologies to an array, calls create/update, toasts and invokes `onSaved`. |
| `Sidebar.jsx` | Grouped navigation, active states, mobile overlay and system status. |
| `StatCard.jsx` | Dashboard metric tile with icon, value, hint, tone and optional progress. |
| `TaskCard.jsx` | Two variants: draggable Kanban card and compact list row. Supports open, edit, delete, complete/reopen and drag start. |
| `TaskDetailsModal.jsx` | Read-only task detail with status, priority, overdue badge, project, due date, timestamps and actions. |
| `TaskFormModal.jsx` | Create/edit task. Loads project options, defaults the project/status, validates title/project, sends create/update and toasts. |

### 3.5 Hooks

| Hook | File | Behaviour |
| --- | --- | --- |
| `useDebounce(value, delay = 350)` | `useDebounce.js` | Returns a delayed copy of a rapidly changing value; clears the previous timer. |
| `useDocumentTitle(title)` | `useDebounce.js` | Sets `document.title` to `"{title} · DevPilot AI"` or the default title. |
| `useToast()` | `useToast.jsx` | Reads the toast context. `ToastProvider` stores up to four recent toasts, auto-dismisses after 4.2 s (success/info) or 6.5 s (error), and exposes `success`, `error`, `info`. Throws if used outside the provider. |
| `useSystemHealth()` | `useSystemHealth.js` | Fetches `/api/health` on mount with an abort controller; exposes `health`, `loading`, `error` and `refresh()`. |

### 3.6 API client

`client/src/services/api.js`:

```js
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  // parse text → JSON, throw ApiError on non-2xx
}
```

Exports:

```js
systemApi.health()
dashboardApi.stats()
projectsApi.list(params, options) / get(id, options) / create(data) / update(id, data) / remove(id)
tasksApi.list(params, options) / get(id, options) / create(data) / update(id, data) / remove(id)
aiApi.generatePlan(data) / chat(messages) / savePlan(data)
isAbortError(error)
```

`ApiError` carries `message`, `status`, `details` and `code`. Network failures use status `0`.

### 3.7 Formatting utilities

`client/src/utils/format.js`:

- `formatDate`, `formatShortDate`, `formatDateTime`, `formatRelativeTime`.
- `daysUntil` uses midnight-normalised dates to avoid rounding errors.
- `getDeadlineMeta` returns `{ label, tone }` for overdue/today/tomorrow/soon/future/no date.
- `isOverdue(value, status)` returns false for completed tasks.
- `getGreeting` selects morning/afternoon/evening.
- `techColor` hashes the technology string into a fixed colour palette.
- `toDateInput`, `todayInput`, `addDaysToInput` support `<input type="date">`.

---

## 4. Backend design

### 4.1 `server/server.js`

Responsibilities:

1. Build the Express app.
2. Apply CORS, JSON/urlencoded parsing and request logging.
3. Register `GET /api/health`.
4. Mount routers.
5. Optionally serve `client/dist` and SPA fallback.
6. Register 404 and error middleware.
7. Listen on `env.port`.
8. Connect to MongoDB asynchronously and start the retry watcher on failure.
9. Handle `SIGINT`/`SIGTERM` and unhandled rejections.

Health payload:

```json
{
  "success": true,
  "status": "ok",
  "database": { "configured": true, "connected": true },
  "ai": { "configured": true, "model": "gpt-4o-mini" },
  "environment": "development",
  "uptimeSeconds": 73,
  "timestamp": "2026-11-08T06:17:05.481Z"
}
```

### 4.2 `config/env.js`

- Loads `server/.env`, then a root `.env` as fallback.
- Builds a typed `env` object:
  - `nodeEnv`, `isProduction`, `port`
  - `mongoUri`
  - `clientOrigins` (comma-separated, trimmed, filtered)
  - `ai.apiKey`, `ai.baseUrl` (trailing slashes removed), `ai.model`, `ai.timeoutMs`
- `asNumber()` falls back when a value is not a positive finite number.
- `getConfigStatus()` exposes only non-secret state.
- `logConfigurationHints()` prints actionable guidance for missing MongoDB/AI configuration.

### 4.3 `config/db.js`

- `connectDB({ silent })`:
  - Returns `false` when `MONGODB_URI` is absent.
  - Sets `strictQuery`.
  - Connects with `serverSelectionTimeoutMS: 8000`.
  - Returns `true`/`false`; never throws to the caller.
- `isDatabaseReady()` returns `mongoose.connection.readyState === 1`.
- `watchDatabaseConnection({ intervalMs = 15000 })`:
  - Returns `null` when no URI is configured.
  - Retries every 15 seconds while disconnected.
  - Logs once when it starts waiting and once when restored.
  - Clears the interval on success and unrefs the timer.

### 4.4 Models

#### `models/Project.js`

Schema fields:

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, trimmed, 2–120 chars |
| `description` | String | trimmed, default `''`, max 2000 |
| `technologies` | [String] | default `[]` |
| `status` | String | enum `Planning`, `In Progress`, `Completed`, `On Hold`; default `Planning`; indexed |
| `startDate` | Date | default `Date.now` |
| `deadline` | Date | default `null` |

Options: `timestamps: true`, virtuals enabled for JSON/object conversion.

Virtual:

```js
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
});
```

Index: `{ createdAt: -1 }`.

Cascade hook:

```js
projectSchema.pre('findOneAndDelete', async function cascadeDeleteTasks() {
  const projectId = this.getQuery()._id;
  if (projectId) {
    await Task.deleteMany({ project: projectId });
  }
});
```

#### `models/Task.js`

Schema fields:

| Field | Type | Rules |
| --- | --- | --- |
| `title` | String | required, trimmed, 2–160 chars |
| `description` | String | trimmed, default `''`, max 3000 |
| `project` | ObjectId | ref `Project`, required, indexed |
| `priority` | String | enum `Low`, `Medium`, `High`, `Critical`; default `Medium`; indexed |
| `status` | String | enum `To Do`, `In Progress`, `Completed`; default `To Do`; indexed |
| `dueDate` | Date | default `null` |

Options: `timestamps: true`, virtuals enabled.

Indexes:

- `{ project: 1, status: 1 }`
- `{ dueDate: 1 }`
- field-level indexes on `project`, `priority`, `status`

### 4.5 Routes

#### `routes/projectRoutes.js`

```text
router.use(requireDatabase)

GET    /            getProjects
POST   /            validateBody(validateProjectPayload) → createProject
GET    /:id         validateObjectIdParam('id') → getProject
PUT    /:id         validateObjectIdParam('id') → validateBody(validateProjectPayload, { partial:true }) → updateProject
DELETE /:id         validateObjectIdParam('id') → deleteProject
```

#### `routes/taskRoutes.js`

```text
router.use(requireDatabase)

GET    /            getTasks
POST   /            validateBody(validateTaskPayload) → createTask
GET    /:id         validateObjectIdParam('id') → getTask
PUT    /:id         validateObjectIdParam('id') → validateBody(validateTaskPayload, { partial:true }) → updateTask
DELETE /:id         validateObjectIdParam('id') → deleteTask
```

#### `routes/aiRoutes.js`

```text
POST /generate-plan  validateBody(validatePlanRequestPayload) → generatePlanHandler
POST /chat           validateBody(validateChatPayload) → chatHandler
POST /save-plan      requireDatabase → validateBody(validateSavePlanPayload) → savePlanHandler
```

Generation and chat do not require MongoDB. Saving does.

#### `routes/dashboardRoutes.js`

```text
GET /stats  requireDatabase → getDashboardStats
```

### 4.6 Controllers

#### `projectController.js`

- `getProjects`
  - Reads `search`, `status`, `sort` from query.
  - Validates status against `PROJECT_STATUSES`.
  - Escapes search input and builds a case-insensitive regex over name, description and technologies.
  - Resolves sort through `PROJECT_SORTS`.
  - Uses `.lean()`.
  - Fetches aggregated task stats for all project IDs.
  - Returns `{ success, count, data }` with `taskStats` and `progress`.

- `getProject`
  - Finds by id; `404` when missing.
  - Fetches tasks sorted by `status`, `dueDate`, `createdAt`.
  - Computes `taskStats` and `progress`.
  - Returns `{ success, data: { ...project, tasks, taskStats, progress } }`.

- `createProject`
  - Creates using sanitised `req.body`.
  - Returns `201` with zeroed stats/progress.

- `updateProject`
  - `findByIdAndUpdate` with `new: true`, `runValidators: true`.
  - `404` when missing.
  - Returns the updated project with aggregated stats.

- `deleteProject`
  - `findByIdAndDelete` (triggering the cascade hook).
  - `404` when missing.
  - Returns `{ success, message, data: { id } }`.

#### `taskController.js`

- `getTasks`
  - Filters by status/priority with enum validation, project with ObjectId validation, and escaped title/description search.
  - Default sort is `{ dueDate: 1, createdAt: -1 }`; other sorts use the allow-list.
  - Populates `project` with `name status deadline`; `.lean()`.
- `getTask`
  - Populates project; `404` when missing.
- `createTask`
  - Verifies the project exists (`404` if not), creates the task, populates the project and returns `201`.
- `updateTask`
  - Re-verifies a changed project reference, updates with validators, populates project, `404` when missing.
- `deleteTask`
  - Deletes by id; `404` when missing.

#### `dashboardController.js`

Runs two `Promise.all` groups:

1. Counts: projects, tasks, completed, in progress, pending.
2. Aggregations/queries: status distribution, priority distribution, recent projects (4), recent tasks (6, populated), upcoming tasks (5, non-completed with due date).
3. Task stats for recent projects.
4. Overdue count.

Response shape:

```json
{
  "success": true,
  "data": {
    "totals": {
      "projects": 2,
      "tasks": 10,
      "completed": 3,
      "inProgress": 3,
      "pending": 4,
      "overdue": 0,
      "completionPercentage": 30
    },
    "statusDistribution": [
      { "status": "To Do", "count": 4 },
      { "status": "In Progress", "count": 3 },
      { "status": "Completed", "count": 3 }
    ],
    "priorityDistribution": [
      { "priority": "Low", "count": 2 },
      { "priority": "Medium", "count": 3 },
      { "priority": "High", "count": 3 },
      { "priority": "Critical", "count": 2 }
    ],
    "recentProjects": [],
    "recentTasks": [],
    "upcomingTasks": [],
    "generatedAt": "2026-11-08T06:17:05.481Z"
  }
}
```

The example counts illustrate shape only; the API returns live values.

#### `aiController.js`

- `generatePlanHandler`
  - Reads `idea` and `difficulty` (already validated/sanitised).
  - Calls `generateProjectPlan`.
  - Returns `200` with `{ success, message, data: plan, meta }`.

- `chatHandler`
  - Calls `generateChatReply(messages)`.
  - Returns `200` with `{ success, data: { role:'assistant', content }, meta }`.

- `savePlanHandler`
  - Computes total estimated days across all phases/tasks.
  - Start date defaults to now; deadline defaults to start + `max(totalEstimatedDays, 1)` days.
  - Creates a project with status `Planning`.
  - Builds one task per plan task with status `To Do`, priority from the plan, description fallback `Phase: {name}`, and cumulative due dates.
  - Inserts tasks with `insertMany`.
  - On insertion failure, deletes the project (cascade hook removes partial tasks) and throws `500`.
  - Returns `201` with the project (with zeroed stats) and tasks.

### 4.7 Services

#### `services/aiService.js`

Exports:

- `isAIConfigured()`
- `generateProjectPlan({ idea, difficulty })`
- `generateChatReply(messages)`

Internal functions:

- `assertConfigured()` throws `503 AI_NOT_CONFIGURED`.
- `requestCompletion(messages, options)`:
  - Builds the provider payload.
  - Uses `AbortController` with `env.ai.timeoutMs`.
  - Sends `POST {baseUrl}/chat/completions`.
  - Retries once without `response_format` on `400`/`422` in JSON mode.
  - Maps `401`/`403` → `502 AI_AUTH_FAILED`, `429` → `503 AI_RATE_LIMITED`, other non-2xx → `502 AI_PROVIDER_ERROR`, timeout → `504 AI_TIMEOUT`, network failure → `502 AI_NETWORK_ERROR`.
  - Rejects empty content with `502 AI_INVALID_RESPONSE`.
- `parseJsonContent(content)`:
  - Strips leading/trailing markdown fences.
  - Extracts from the first `{` to the last `}`.
  - Parses JSON; malformed input → `502 AI_INVALID_RESPONSE` with a 300-character excerpt.
- `generateProjectPlan`:
  - Calls the provider in JSON mode with the plan prompt.
  - Parses and validates.
  - Throws `502` if validation fails.
  - Returns `{ plan, meta }`.
- `generateChatReply`:
  - Prepends the assistant system prompt.
  - Uses no JSON mode.
  - Returns `{ reply, meta }`.

#### `services/taskStatsService.js`

- `getTaskStatsForProjects(projectIds)`:
  - Returns an empty Map for no IDs.
  - Runs one aggregation:
    - `$match` on project IDs.
    - `$group` with total, completed, inProgress and todo conditional sums.
  - Returns a Map keyed by project id string.
- `withTaskProgress(project, statsMap)`:
  - Falls back to zero stats.
  - Computes `progress = round(completed / total * 100)` or `0`.
  - Returns the project plus `taskStats` and `progress`.

### 4.8 Middleware

#### `logger.js`

- Records a high-resolution start time.
- On response `finish`, logs timestamp, colour-coded status, method, original URL and duration.

#### `validate.js`

```js
export function validateBody(validator, options = {}) {
  return (req, res, next) => {
    const { values, errors } = validator(req.body ?? {}, options);
    if (errors.length > 0) {
      return next(ApiError.badRequest('Validation failed.', errors));
    }
    req.body = values;
    return next();
  };
}
```

- `validateObjectIdParam(param)` checks `/^[a-f\d]{24}$/i`.
- `requireDatabase` returns `503 DATABASE_NOT_CONFIGURED` when `isDatabaseReady()` is false.

#### `asyncHandler.js`

```js
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
```

Forwards rejected promises to the centralized error handler.

#### `errorHandler.js`

- `notFoundHandler` creates a `404` for unmatched routes.
- `errorHandler`:
  - Returns early if headers were already sent.
  - Defaults to the error's status/message or `500`.
  - Maps Mongoose `ValidationError` → `400` with field messages.
  - Maps `CastError` → `400` with the invalid value.
  - Maps duplicate key `11000` → `409 DUPLICATE_KEY`.
  - Maps body-parser `SyntaxError` → `400` “Malformed JSON in request body.”
  - Logs 5xx errors.
  - Responds with `{ success:false, message, code?, details? }`.
  - Adds `stack` only for non-operational 5xx errors outside production.

### 4.9 Utilities

#### `utils/ApiError.js`

- `ApiError(statusCode, message, details, code)` marks the error as operational.
- Static helpers: `badRequest`, `unauthorized`, `notFound`, `conflict`, `unprocessable` (`502 AI_INVALID_RESPONSE`), `notConfigured` (`503`).

#### `utils/constants.js`

```js
export const PROJECT_STATUSES = ['Planning', 'In Progress', 'Completed', 'On Hold'];
export const TASK_STATUSES = ['To Do', 'In Progress', 'Completed'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export const DEFAULT_PROJECT_STATUS = 'Planning';
export const DEFAULT_TASK_STATUS = 'To Do';
export const DEFAULT_PRIORITY = 'Medium';
```

#### `utils/query.js`

- `escapeRegex(value)` escapes MongoDB regex metacharacters.
- `parseSort(sortParam, allowed, fallback)` supports a `-` prefix and resolves only allow-listed fields.

#### `utils/validators.js`

- `validateProjectPayload(body, { partial })`:
  - Name required on create, 2–120 chars.
  - Description optional string, max 2000.
  - Technologies normalised from array/string, de-duplicated, max 30.
  - Status enum.
  - Dates parsed; invalid values rejected.
  - Deadline must not precede start date when both exist.
- `validateTaskPayload(body, { partial })`:
  - Title required on create, 2–160 chars.
  - Description optional, max 3000.
  - Project required on create and must be a valid ObjectId.
  - Priority/status enums.
  - Due date parsed or null.
- `validateChatPayload(body)`:
  - 1–30 messages.
  - Roles limited to `user`/`assistant`.
  - Content trimmed, 1–6000 chars.
  - Optional `idea` max 4000.
- `validatePlanRequestPayload(body)`:
  - Idea 10–4000 chars.
  - Optional difficulty matched case-insensitively against `DIFFICULTIES`.
- `validateSavePlanPayload(body)`:
  - Runs `validatePlan` on the edited plan.
  - Parses optional start/deadline.
  - Rejects deadline earlier than start.
- `isValidObjectId(value)` wraps `mongoose.isValidObjectId`.

#### `utils/planValidator.js`

- Rejects non-object/array input.
- Normalises:
  - `projectTitle`: trimmed, 2–120.
  - `description`: trimmed, 10–2000.
  - `technologies`: unique trimmed strings, max 30.
  - `difficulty`: case-insensitive enum or `Medium`.
  - `phases`: max 8; each needs a name (≥2) and 1–15 tasks.
  - Each task: title (≥2, truncated to 160), description (truncated to 3000), priority enum or `Medium`, difficulty enum or plan difficulty, `estimatedDays` clamped to 1–60.
- Rejects zero valid tasks or more than 60 tasks.
- Returns `{ errors, plan }`; on errors `plan` is `null`.

#### `utils/prompts.js`

Contains `PLAN_SYSTEM_PROMPT`, `buildPlanPrompt(idea, difficulty)` and `CHAT_SYSTEM_PROMPT`. Details are in section 9.

#### `utils/seed.js`

- Connects to MongoDB; exits with an error if unavailable.
- Deletes all tasks and projects.
- Inserts 2 projects (`Orbis Analytics`, `Relay CLI`) and 10 tasks.
- Logs the result and closes the connection.

---

## 5. REST API specification

Base URL:

- Development direct: `http://localhost:5000`
- Through Vite: `http://localhost:5173/api`
- Production: same origin as the Express server

All responses are JSON.

Success envelope:

```json
{ "success": true, "data": {}, "message": "optional", "meta": {}, "count": 0 }
```

Error envelope:

```json
{ "success": false, "message": "Human-readable message", "code": "OPTIONAL_CODE", "details": ["optional"] }
```

### 5.1 Health

| Method | Path | Auth | DB required |
| --- | --- | --- | --- |
| GET | `/api/health` | none | no |

Response `200`:

```json
{
  "success": true,
  "status": "ok",
  "database": { "configured": true, "connected": true },
  "ai": { "configured": true, "model": "gpt-4o-mini" },
  "environment": "development",
  "uptimeSeconds": 73,
  "timestamp": "2026-11-08T06:17:05.481Z"
}
```

### 5.2 Projects

#### `GET /api/projects`

Query:

| Parameter | Values | Default |
| --- | --- | --- |
| `search` | string, max 80 chars used | `''` |
| `status` | `Planning`, `In Progress`, `Completed`, `On Hold` | `''` |
| `sort` | `createdAt`, `-createdAt`, `name`, `deadline`, `status`, with optional `-` | `-createdAt` |

Response `200`:

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6712f0c1a1b2c3d4e5f60718",
      "name": "Orbis Analytics",
      "description": "Real-time product analytics platform.",
      "technologies": ["React", "Express", "MongoDB"],
      "status": "In Progress",
      "startDate": "2026-10-21T00:00:00.000Z",
      "deadline": "2026-12-02T00:00:00.000Z",
      "createdAt": "2026-10-21T09:12:00.000Z",
      "updatedAt": "2026-11-01T13:40:00.000Z",
      "taskStats": { "total": 6, "completed": 2, "inProgress": 2, "todo": 2 },
      "progress": 33
    }
  ]
}
```

Errors: `400` invalid status; `503` database unavailable. Unsupported `sort` values fall back to `-createdAt` rather than failing.

#### `GET /api/projects/:id`

Response `200`:

```json
{
  "success": true,
  "data": {
    "_id": "6712f0c1a1b2c3d4e5f60718",
    "name": "Orbis Analytics",
    "description": "Real-time product analytics platform.",
    "technologies": ["React", "Express", "MongoDB"],
    "status": "In Progress",
    "startDate": "2026-10-21T00:00:00.000Z",
    "deadline": "2026-12-02T00:00:00.000Z",
    "createdAt": "2026-10-21T09:12:00.000Z",
    "updatedAt": "2026-11-01T13:40:00.000Z",
    "tasks": [
      {
        "_id": "6712f0c1a1b2c3d4e5f60720",
        "title": "Build authentication flow",
        "description": "Email/password auth with JWT.",
        "project": "6712f0c1a1b2c3d4e5f60718",
        "priority": "High",
        "status": "Completed",
        "dueDate": "2026-10-31T00:00:00.000Z",
        "createdAt": "2026-10-22T08:00:00.000Z",
        "updatedAt": "2026-10-30T17:00:00.000Z"
      }
    ],
    "taskStats": { "total": 1, "completed": 1, "inProgress": 0, "todo": 0 },
    "progress": 100
  }
}
```

Errors: `400` invalid ObjectId; `404` not found; `503` database unavailable.

#### `POST /api/projects`

Request:

```json
{
  "name": "DevPilot Mobile",
  "description": "Companion app for the workspace.",
  "technologies": ["React Native", "Express", "MongoDB"],
  "status": "Planning",
  "startDate": "2026-11-08",
  "deadline": "2026-12-31"
}
```

Validation:

- `name` required, 2–120 after trimming.
- `description` optional string, max 2000.
- `technologies` array or comma-separated string; trimmed, unique, max 30.
- `status` optional enum.
- `startDate`/`deadline` optional valid dates; deadline cannot precede start.

Response `201`:

```json
{
  "success": true,
  "message": "Project created successfully.",
  "data": {
    "_id": "6712f0c1a1b2c3d4e5f60730",
    "name": "DevPilot Mobile",
    "description": "Companion app for the workspace.",
    "technologies": ["React Native", "Express", "MongoDB"],
    "status": "Planning",
    "startDate": "2026-11-08T00:00:00.000Z",
    "deadline": "2026-12-31T00:00:00.000Z",
    "createdAt": "2026-11-08T10:00:00.000Z",
    "updatedAt": "2026-11-08T10:00:00.000Z",
    "taskStats": { "total": 0, "completed": 0, "inProgress": 0, "todo": 0 },
    "progress": 0
  }
}
```

Errors: `400` validation; `503` database unavailable.

#### `PUT /api/projects/:id`

Request: any subset of project fields (partial validation).

Response `200`:

```json
{
  "success": true,
  "message": "Project updated successfully.",
  "data": { "...project fields": "...", "taskStats": {}, "progress": 0 }
}
```

Errors: `400` invalid id/body; `404` not found; `503` database unavailable.

#### `DELETE /api/projects/:id`

Response `200`:

```json
{
  "success": true,
  "message": "Project and all associated tasks were deleted.",
  "data": { "id": "6712f0c1a1b2c3d4e5f60730" }
}
```

Errors: `400` invalid id; `404` not found; `503` database unavailable.

### 5.3 Tasks

#### `GET /api/tasks`

Query:

| Parameter | Values | Default |
| --- | --- | --- |
| `search` | string, max 80 chars used | `''` |
| `status` | `To Do`, `In Progress`, `Completed` | `''` |
| `priority` | `Low`, `Medium`, `High`, `Critical` | `''` |
| `project` | valid ObjectId | `''` |
| `sort` | `dueDate`, `deadline` (alias), `createdAt`, `title`, `priority`, optional `-` | `dueDate` |

The default `dueDate` sort is `{ dueDate: 1, createdAt: -1 }`; tasks without a due date sort after dated tasks in MongoDB.

Response `200`:

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6712f0c1a1b2c3d4e5f60720",
      "title": "Build authentication flow",
      "description": "Email/password auth with JWT.",
      "project": {
        "_id": "6712f0c1a1b2c3d4e5f60718",
        "name": "Orbis Analytics",
        "status": "In Progress",
        "deadline": "2026-12-02T00:00:00.000Z"
      },
      "priority": "High",
      "status": "Completed",
      "dueDate": "2026-10-31T00:00:00.000Z",
      "createdAt": "2026-10-22T08:00:00.000Z",
      "updatedAt": "2026-10-30T17:00:00.000Z"
    }
  ]
}
```

Errors: `400` invalid status/priority/project ObjectId; `503` database unavailable.

#### `GET /api/tasks/:id`

Same task shape with populated project. Errors: `400`, `404`, `503`.

#### `POST /api/tasks`

Request:

```json
{
  "title": "Implement refresh-token rotation",
  "description": "Rotate refresh tokens on every use.",
  "project": "6712f0c1a1b2c3d4e5f60718",
  "priority": "High",
  "status": "To Do",
  "dueDate": "2026-11-20"
}
```

Validation:

- `title` required, 2–160.
- `description` optional, max 3000.
- `project` required, valid ObjectId, must exist.
- `priority` optional enum.
- `status` optional enum.
- `dueDate` optional date or null.

Response `201`:

```json
{
  "success": true,
  "message": "Task created successfully.",
  "data": {
    "_id": "6712f0c1a1b2c3d4e5f60740",
    "title": "Implement refresh-token rotation",
    "description": "Rotate refresh tokens on every use.",
    "project": {
      "_id": "6712f0c1a1b2c3d4e5f60718",
      "name": "Orbis Analytics",
      "status": "In Progress",
      "deadline": "2026-12-02T00:00:00.000Z"
    },
    "priority": "High",
    "status": "To Do",
    "dueDate": "2026-11-20T00:00:00.000Z",
    "createdAt": "2026-11-08T10:10:00.000Z",
    "updatedAt": "2026-11-08T10:10:00.000Z"
  }
}
```

Errors: `400` validation; `404` project not found; `503` database unavailable.

#### `PUT /api/tasks/:id`

Request: any subset of task fields. A changed `project` must exist. Used by the Kanban board to send `{ "status": "In Progress" }`.

Response `200`:

```json
{
  "success": true,
  "message": "Task updated successfully.",
  "data": { "...task with populated project": "..." }
}
```

Errors: `400`, `404`, `503`.

#### `DELETE /api/tasks/:id`

Response `200`:

```json
{
  "success": true,
  "message": "Task deleted successfully.",
  "data": { "id": "6712f0c1a1b2c3d4e5f60740" }
}
```

Errors: `400`, `404`, `503`.

### 5.4 Dashboard

#### `GET /api/dashboard/stats`

Response `200`: see section 4.6. Errors: `503` database unavailable.

### 5.5 AI

#### `POST /api/ai/generate-plan`

Request:

```json
{
  "idea": "A habit tracker with streaks, reminders and weekly insights",
  "difficulty": "Medium"
}
```

Validation:

- `idea`: 10–4000 characters.
- `difficulty`: optional `Easy`/`Medium`/`Hard`, matched case-insensitively.

Response `200`:

```json
{
  "success": true,
  "message": "Plan generated successfully. Review and save it when ready.",
  "data": {
    "projectTitle": "Habit Tracker",
    "description": "A mobile-friendly habit tracker with streaks, reminders and weekly insights.",
    "technologies": ["React", "Express", "MongoDB", "Chart.js"],
    "difficulty": "Medium",
    "phases": [
      {
        "name": "Foundation",
        "tasks": [
          {
            "title": "Model habits and check-ins",
            "description": "Create Mongoose schemas for habits and daily check-ins.",
            "priority": "High",
            "difficulty": "Medium",
            "estimatedDays": 2
          }
        ]
      }
    ]
  },
  "meta": {
    "model": "gpt-4o-mini",
    "usage": { "prompt_tokens": 410, "completion_tokens": 900, "total_tokens": 1310 },
    "generatedAt": "2026-11-08T10:20:00.000Z"
  }
}
```

Errors:

- `400` invalid request.
- `502` malformed JSON, failed validation, auth failure, provider error or network error.
- `503` AI not configured or rate limited.
- `504` timeout.

#### `POST /api/ai/chat`

Request:

```json
{
  "messages": [
    { "role": "user", "content": "Explain JavaScript closures." }
  ]
}
```

Validation:

- 1–30 messages.
- Roles `user`/`assistant` only.
- Content 1–6000 characters each.

Response `200`:

```json
{
  "success": true,
  "data": { "role": "assistant", "content": "A closure is ..." },
  "meta": {
    "model": "gpt-4o-mini",
    "usage": { "prompt_tokens": 120, "completion_tokens": 260, "total_tokens": 380 }
  }
}
```

Errors: `400`, `502`, `503`, `504`.

#### `POST /api/ai/save-plan`

Request:

```json
{
  "plan": {
    "projectTitle": "Habit Tracker",
    "description": "A mobile-friendly habit tracker.",
    "technologies": ["React", "Express", "MongoDB"],
    "difficulty": "Medium",
    "phases": [
      {
        "name": "Foundation",
        "tasks": [
          {
            "title": "Model habits and check-ins",
            "description": "Create Mongoose schemas.",
            "priority": "High",
            "difficulty": "Medium",
            "estimatedDays": 2
          }
        ]
      }
    ]
  },
  "startDate": "2026-11-10",
  "deadline": "2026-12-01"
}
```

Validation:

- `plan` must pass `validatePlan` (same rules as generation).
- `startDate`/`deadline` optional valid dates; deadline cannot precede start.

Response `201`:

```json
{
  "success": true,
  "message": "Plan saved: 1 project and 1 tasks created.",
  "data": {
    "project": {
      "_id": "6712f0c1a1b2c3d4e5f60750",
      "name": "Habit Tracker",
      "description": "A mobile-friendly habit tracker.",
      "technologies": ["React", "Express", "MongoDB"],
      "status": "Planning",
      "startDate": "2026-11-10T00:00:00.000Z",
      "deadline": "2026-12-01T00:00:00.000Z",
      "taskStats": { "total": 1, "completed": 0, "inProgress": 0, "todo": 1 },
      "progress": 0
    },
    "tasks": [
      {
        "_id": "6712f0c1a1b2c3d4e5f60751",
        "title": "Model habits and check-ins",
        "description": "Create Mongoose schemas.",
        "project": "6712f0c1a1b2c3d4e5f60750",
        "priority": "High",
        "status": "To Do",
        "dueDate": "2026-11-12T00:00:00.000Z",
        "createdAt": "2026-11-08T10:30:00.000Z",
        "updatedAt": "2026-11-08T10:30:00.000Z"
      }
    ]
  }
}
```

Errors:

- `400` invalid plan/dates.
- `500` task insertion failure (project rolled back).
- `503` database unavailable.

### 5.6 Status code summary

| Code | Used for |
| --- | --- |
| `200` | Reads, updates, deletes, health, AI generation/chat |
| `201` | Project/task creation and plan saving |
| `400` | Validation failure, malformed JSON, invalid ObjectId/filter |
| `404` | Unknown route, project or task |
| `409` | Duplicate key mapping (reserved; no unique business key currently) |
| `500` | Unexpected server error or plan save failure |
| `502` | AI provider/auth/network/malformed-output failure |
| `503` | Database unavailable, AI unconfigured, AI rate limit |
| `504` | AI timeout |

---

## 6. MongoDB schema definitions

### 6.1 Projects collection

```json
{
  "_id": "ObjectId",
  "name": "String (required, trimmed, 2–120)",
  "description": "String (default '', max 2000)",
  "technologies": ["String"],
  "status": "Planning | In Progress | Completed | On Hold",
  "startDate": "Date (default now)",
  "deadline": "Date | null",
  "createdAt": "Date (timestamps)",
  "updatedAt": "Date (timestamps)"
}
```

Virtual:

```json
{ "tasks": ["Task references where Task.project === Project._id"] }
```

### 6.2 Tasks collection

```json
{
  "_id": "ObjectId",
  "title": "String (required, trimmed, 2–160)",
  "description": "String (default '', max 3000)",
  "project": "ObjectId (ref Project, required, indexed)",
  "priority": "Low | Medium | High | Critical",
  "status": "To Do | In Progress | Completed",
  "dueDate": "Date | null",
  "createdAt": "Date (timestamps)",
  "updatedAt": "Date (timestamps)"
}
```

### 6.3 Index summary

```text
projects: { status: 1 }, { createdAt: -1 }
tasks:    { project: 1 }, { priority: 1 }, { status: 1 },
          { project: 1, status: 1 }, { dueDate: 1 }
```

### 6.4 Referential integrity

- `Task.project` is required and validated as an ObjectId at the API layer.
- Task create/update verifies the referenced project exists.
- Project deletion runs `Task.deleteMany({ project })` in a `pre('findOneAndDelete')` hook.
- Plan saving rolls back the project if task insertion fails.

---

## 7. Middleware implementation details

### 7.1 Validation middleware

`validateBody(validator, options)` is a factory. The validator returns sanitised values and errors. On success `req.body` is replaced, so controllers never receive unnormalised input.

`validateObjectIdParam('id')` prevents Mongoose cast errors for malformed route IDs and returns a clear `400`.

`requireDatabase` is applied at router level for projects/tasks/dashboard and specifically for `save-plan`. It returns:

```json
{
  "success": false,
  "message": "Database is not connected. Set MONGODB_URI in server/.env, start MongoDB, then restart the API.",
  "code": "DATABASE_NOT_CONFIGURED"
}
```

with status `503`.

### 7.2 Async wrapper

`asyncHandler` converts rejected promises into `next(error)`, so async controller failures reach `errorHandler` instead of producing unhandled rejections.

### 7.3 Logging

`requestLogger` attaches a `finish` listener. It logs after the response is sent, so the status code and duration are accurate. Colour selection:

- `5xx` red
- `4xx` yellow
- `3xx` cyan
- other green

### 7.4 Error middleware

`errorHandler` is the single response formatter for failures. It handles:

- Operational `ApiError` values (status, code, details).
- Mongoose validation errors.
- Mongoose cast errors.
- Duplicate key errors.
- Body-parser JSON syntax errors.
- Unknown 500s (stack in non-production only).

`notFoundHandler` runs before it and creates a `404` `ApiError`.

---

## 8. Error handling strategy

### 8.1 Layers

| Layer | Strategy |
| --- | --- |
| Client forms | Inline validation + disable while saving |
| Client API client | Parse JSON, throw `ApiError` with status/details/code |
| Client pages | `ErrorAlert` with retry; toasts for mutations |
| Route middleware | Reject invalid IDs/bodies before controllers |
| Controllers | Throw `ApiError` for not-found/validation conditions |
| Services | Throw typed errors for AI/provider failures |
| Database | Mongoose validation + centralized mapping |
| Process | Log unhandled rejections; graceful shutdown |

### 8.2 Common scenarios

| Scenario | Response |
| --- | --- |
| Short project name | `400`, `details: ["Project name must be at least 2 characters."]` |
| Invalid ObjectId | `400`, “Invalid id: expected a 24-character MongoDB ObjectId.” |
| Project not found | `404`, “Project not found.” |
| Task references unknown project | `404`, “Project not found. A task must belong to an existing project.” |
| MongoDB offline | `503 DATABASE_NOT_CONFIGURED` |
| AI key missing | `503 AI_NOT_CONFIGURED` |
| AI returns non-JSON | `502 AI_INVALID_RESPONSE` |
| AI plan fails schema validation | `502 AI_INVALID_RESPONSE` with validation details |
| AI provider auth failure | `502 AI_AUTH_FAILED` |
| AI rate limit | `503 AI_RATE_LIMITED` |
| AI timeout | `504 AI_TIMEOUT` |
| Malformed request JSON | `400`, “Malformed JSON in request body.” |
| Unknown route | `404`, “Route not found: METHOD /path” |

### 8.3 Degraded mode

The API always starts. Missing infrastructure is surfaced through `/api/health`, UI banners and endpoint-specific `503` responses. AI generation/chat can work without MongoDB; only saving a plan and all CRUD/dashboard routes require it.

---

## 9. AI prompt and structured-output design

### 9.1 Plan system prompt

`PLAN_SYSTEM_PROMPT` defines the model as a senior software architect and requires **only** a JSON object with this schema:

```json
{
  "projectTitle": "string (2-120 chars)",
  "description": "string (2-4 sentences describing the product and its goal)",
  "technologies": ["4-8 specific technology names"],
  "difficulty": "Easy | Medium | Hard",
  "phases": [
    {
      "name": "phase name",
      "tasks": [
        {
          "title": "concise, action-oriented task title",
          "description": "1-2 sentences explaining exactly what to build",
          "priority": "Low | Medium | High | Critical",
          "difficulty": "Easy | Medium | Hard",
          "estimatedDays": 1
        }
      ]
    }
  ]
}
```

Constraints in the prompt:

- 3–5 phases in logical build order.
- 3–5 tasks per phase, 12–20 total.
- Tasks must be concrete and independently completable.
- `estimatedDays` integer 1–14.
- Exact priority/difficulty values.
- Do not invent budget, team or client requirements.
- Keep the plan achievable for a single developer.
- No markdown fences or commentary.

### 9.2 Plan user prompt

`buildPlanPrompt(idea, difficulty)`:

```text
Project idea:
"""${idea}"""

Requested difficulty level: ${difficulty || 'not specified'}.
Tailor the scope and task depth to this difficulty. Return the JSON plan now.
```

### 9.3 Assistant system prompt

`CHAT_SYSTEM_PROMPT` defines the assistant as a senior software engineer and mentor. It should:

- Explain concepts with small examples.
- Debug code and interpret errors.
- Review architecture and suggest realistic improvements.
- Recommend technologies with trade-offs.
- Break large tasks into concrete steps.
- Be direct, technical and practical.
- Use short paragraphs, bullets and fenced code blocks.
- State assumptions instead of inventing facts.
- Never claim to have run code.
- Aim for under 400 words unless the question requires more.

### 9.4 JSON extraction

Provider output is normalised before parsing:

```js
const withoutFences = content
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/\s*```$/i, '')
  .trim();

const start = withoutFences.indexOf('{');
const end = withoutFences.lastIndexOf('}');
const candidate = start >= 0 && end > start ? withoutFences.slice(start, end + 1) : withoutFences;
```

Parse failure returns `502` with a 300-character excerpt.

### 9.5 Normalisation and validation rules

| Field | Rule |
| --- | --- |
| `projectTitle` | Trimmed; 2–120 chars |
| `description` | Trimmed; 10–2000 chars |
| `technologies` | Array; trimmed strings; unique; max 30 |
| `difficulty` | Matched case-insensitively; fallback `Medium` |
| `phases` | Array; 1–8 entries |
| Phase name | Trimmed; at least 2 chars; truncated to 120 |
| Phase tasks | 1–15 per phase |
| Task title | At least 2 chars; truncated to 160 |
| Task description | Trimmed; truncated to 3000 |
| Task priority | Case-insensitive enum; fallback `Medium` |
| Task difficulty | Case-insensitive enum; fallback plan difficulty |
| `estimatedDays` | Numeric; rounded; clamped 1–60 |
| Total tasks | At least 1; at most 60 |

If any errors exist, the validated plan is discarded and the endpoint returns `502` with the error list.

### 9.6 Save transformation

`savePlanHandler` converts a validated plan into database documents:

```text
Project:
  name         = plan.projectTitle
  description  = plan.description
  technologies = plan.technologies
  status       = "Planning"
  startDate    = supplied startDate or now
  deadline     = supplied deadline or start + max(totalEstimatedDays, 1)

For each phase, for each task:
  title       = task.title
  description = task.description or "Phase: <phase.name>"
  project     = created project id
  priority    = task.priority
  status      = "To Do"
  dueDate     = cumulative cursor + task.estimatedDays
```

Tasks are inserted with `Task.insertMany`. On failure, the project is deleted, which also invokes the cascade hook.

### 9.7 Provider compatibility and retry

- `response_format: { type: 'json_object' }` is used only for plan generation.
- If a provider rejects it with `400` or `422`, the request is retried once without that field.
- The prompt itself still demands JSON, so providers without JSON mode can work.
- Errors are mapped to actionable client messages; provider response bodies are included as details where available.

---

## 10. JavaScript concept implementations

The 23 mandatory concepts and their actual implementation locations:

| # | Concept | Implementation |
| --- | --- | --- |
| 1 | LLM API Integration | `server/services/aiService.js` calls `${AI_BASE_URL}/chat/completions` with a server-only key; `aiController.js` exposes generation/chat/save endpoints. |
| 2 | Prompt Engineering | `server/utils/prompts.js` holds the plan system prompt, plan user prompt builder and assistant system prompt. |
| 3 | Structured Outputs | `server/utils/planValidator.js` parses/normalises plan JSON; `validators.js` revalidates edited plans; malformed output returns `502`. |
| 4 | HTTP Status Codes | Routes/controllers return `200`, `201`, `400`, `404`, `500`, `502`, `503`, `504`; `errorHandler.js` maps database/parser errors. |
| 5 | Middleware | `logger.js`, `validate.js` (`validateBody`, `validateObjectIdParam`, `requireDatabase`), `asyncHandler.js`, `errorHandler.js`, plus global middleware in `server.js`. |
| 6 | Problem Modeling | `Project` and `Task` models, shared enums in `constants.js`, derived stats in `taskStatsService.js`. |
| 7 | RESTful Endpoint Design | `projectRoutes.js`, `taskRoutes.js`, `dashboardRoutes.js`, `aiRoutes.js`. |
| 8 | Server-side Error Handling | `ApiError.js`, `asyncHandler.js`, `errorHandler.js`; consistent JSON error envelope. |
| 9 | System Design Basics | React SPA → Express REST API → MongoDB + external LLM provider, with health/degraded mode. |
| 10 | Environment Variables | `server/config/env.js`, `.env.example`, `.gitignore`; secrets stay server-side. |
| 11 | Git Workflow | Feature branches and conventional commit history; see `README.md` and `GITHUB_SETUP.md`. |
| 12 | Async Data Fetching | `client/src/services/api.js`, `useSystemHealth.js`, page `useEffect` fetches with `AbortController`. |
| 13 | Client-side Routing | `main.jsx` (`BrowserRouter`), `App.jsx` route table, `Sidebar.jsx` `NavLink`s, 404 route. |
| 14 | JavaScript Async/Await | `api.js` `request()`, controller `async` functions, page form submissions with `try/catch/finally`. |
| 15 | JavaScript Closures | `client/src/utils/jsConceptsDemo.js` (`createTaskFilter`, `createCounter`), used by `ProjectDetails.jsx` and `JsLab.jsx`. |
| 16 | JavaScript Event Loop | `runEventLoopDemo` in `jsConceptsDemo.js`, executed by `JsLab.jsx`. |
| 17 | JavaScript Hoisting | `runHoistingDemo` in `jsConceptsDemo.js`, executed by `JsLab.jsx`. |
| 18 | JavaScript Promises vs Callbacks | `fetchTasksWithCallback`, `fetchTasksWithPromise`, `promisifyCallback`, `runCallbacksDemo`, `runPromisesDemo`, executed by `JsLab.jsx`. |
| 19 | React Component Composition | `AppLayout` composes Sidebar/Navbar/HealthBanner/Outlet; forms compose Modal/ErrorAlert/Spinner; cards compose Badge/ProgressBar. |
| 20 | useEffect | Dashboard, Projects, ProjectDetails, Tasks, Assistant, `useSystemHealth`, `useDebounce`, `useDocumentTitle`, `Modal`. |
| 21 | useState | Forms, filters, modals, AI planner selection/editing, chat messages, lab outputs. |
| 22 | MongoDB CRUD Operations | Controllers use `create`, `find`, `findById`, `findByIdAndUpdate`, `findByIdAndDelete`, `insertMany`, `deleteMany`, `countDocuments`, `aggregate`. |
| 23 | MongoDB Schema Modeling | `Project.js` and `Task.js`: types, required/min/max, enums, timestamps, indexes, ObjectId ref, virtual, cascade hook. |

### 10.1 Closures (#15)

```js
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

export function createCounter(initial = 0) {
  let count = initial;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}
```

The returned filter closes over `term`, `selectedPriority` and `selectedStatus` after the factory returns. `ProjectDetails.jsx` uses it through `filterTasksLocally`; `JsLab.jsx` uses it for the interactive priority filter and the private counter.

### 10.2 Event loop (#16)

```js
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

  return new Promise((resolve) => setTimeout(() => resolve(events), 120));
}
```

The emitted order is deterministic: synchronous start, synchronous end, promise microtask, timeout macrotask.

### 10.3 Hoisting (#17)

```js
export function runHoistingDemo() {
  const logs = [];

  logs.push(`var before assignment → ${String(status)}`);
  var status = 'ready';
  logs.push(`var after assignment → ${status}`);

  logs.push(`function declaration before definition → ${shipped()}`);
  function shipped() {
    return 'declaration was hoisted';
  }

  try {
    notYetDefined();
  } catch (error) {
    logs.push(`function expression before definition → ${error.name}: ${error.message}`);
  }
  var notYetDefined = function notYetDefined() {
    return 'now callable';
  };
  logs.push(`function expression after definition → ${notYetDefined()}`);

  try {
    logs.push(`let before declaration → ${temporalValue}`);
  } catch (error) {
    logs.push(`let before declaration → ${error.name}: ${error.message}`);
  }
  const temporalValue = 'initialised';
  logs.push(`let after declaration → ${temporalValue}`);

  return logs;
}
```

This demonstrates `var` hoisting with `undefined`, function-declaration hoisting, function-expression timing and the `let` temporal dead zone (`ReferenceError`).

### 10.4 Promises vs callbacks (#18)

```js
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
  const logs = ['callback: request started'];
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
  const logs = ['promise: request started'];
  const tasks = await fetchTasksWithPromise('High');
  logs.push(`promise/await: received ${tasks.length} task(s) → ${tasks.map((task) => task.title).join(', ')}`);

  const promisified = promisifyCallback(fetchTasksWithCallback);
  const promisifiedTasks = await promisified('Critical');
  logs.push(`promisified callback: ${promisifiedTasks.map((task) => task.title).join(', ')}`);
  return logs;
}
```

Both utilities use the same `DEMO_TASKS` array and asynchronous timer. The callback version uses an error-first signature; the promise version resolves/rejects; `promisifyCallback` adapts the callback API to a promise.

### 10.5 Async/await and fetch (#12, #14, #20, #21)

Representative implementation in `client/src/services/api.js`:

```js
async function request(path, { method = 'GET', body, signal } = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) throw new ApiError(payload?.message, response.status, payload?.details, payload?.code);
    return payload;
  } catch (error) {
    // network/abort handling
  }
}
```

Representative `useEffect` pattern:

```js
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
```

---

## 11. Consistency notes

- The running application never injects demo statistics or tasks. Seed data exists only in `server/utils/seed.js` and runs on demand.
- Chat history is tab-scoped (`sessionStorage`), not persisted in MongoDB.
- The AI planner previews model output and requires an explicit save action.
- `AI_API_KEY` is read only by the server and never exposed through `VITE_*` variables.
- The API intentionally boots without MongoDB or AI so configuration errors can be surfaced in the UI.
- There is no authentication layer in the current implementation.
- Documentation files in the repository root describe only the implemented behaviour.
