# DevPilot AI — High-Level Design (HLD)

**Project:** DevPilot AI
**Document type:** High-Level Design
**Related documents:** `PRD.md`, `LLD.md`, `README.md`
**Implementation:** React 19 + Vite 6 · Express 4 · MongoDB + Mongoose 8 · OpenAI-compatible LLM

---

## 1. Purpose and scope

This document describes the high-level architecture of the implemented DevPilot AI system: its frontend, backend, database, AI integration, runtime topology, data flows and component interactions. It reflects the code in this repository and does not describe planned or unimplemented features.

The system is a single-page React application backed by a stateless Express REST API. MongoDB is the only persistent data store. AI capabilities are provided through an external OpenAI-compatible Chat Completions API, called exclusively from the backend.

---

## 2. System architecture

### 2.1 Architecture overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser                                                                   │
│                                                                           │
│  React 19 + Vite 6 SPA                                                    │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ AppLayout                                                          │   │
│  │  Sidebar · Navbar · HealthBanner · <Outlet />                      │   │
│  │                                                                    │   │
│  │ Pages: Dashboard · Projects · ProjectDetails · Tasks ·             │   │
│  │        AIPlanner · Assistant · JsLab · NotFound                    │   │
│  │                                                                    │   │
│  │ Shared: components/ · hooks/ · services/api.js · utils/            │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP + JSON
                                │ dev: Vite proxy /api → :5000
                                │ prod: same origin, Express serves client/dist
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Express API (server/server.js)                                            │
│                                                                           │
│  CORS → express.json → requestLogger                                      │
│  /api/health                                                              │
│  /api/projects  → projectRoutes  → validation → projectController         │
│  /api/tasks     → taskRoutes     → validation → taskController            │
│  /api/dashboard → dashboardRoutes             → dashboardController       │
│  /api/ai        → aiRoutes       → validation → aiController              │
│  static client/dist + SPA fallback                                        │
│  notFoundHandler → errorHandler                                           │
└──────────────┬──────────────────────────────────────┬────────────────────┘
               │                                      │
               │ Mongoose 8                           │ HTTPS (native fetch)
               ▼                                      ▼
┌──────────────────────────────┐        ┌───────────────────────────────────┐
│ MongoDB                      │        │ OpenAI-compatible LLM provider    │
│  projects collection         │        │  POST {AI_BASE_URL}/chat/         │
│  tasks collection            │        │       completions                 │
│  indexes + aggregation       │        │  JSON mode where supported        │
└──────────────────────────────┘        └───────────────────────────────────┘
```

### 2.2 Architectural style

- **Client–server separation:** the browser never talks to MongoDB or the LLM provider directly.
- **Layered backend:** routes → middleware → controllers → services/models → database/provider.
- **Stateless API:** the server keeps no session state; every request is self-contained.
- **Single-page application:** React Router handles all client routes; Express serves `index.html` for non-API paths in production.
- **Provider abstraction:** AI calls use the OpenAI Chat Completions contract, so any compatible provider can be configured through environment variables.
- **Trust boundary at the backend:** request payloads and model output are validated before persistence.

---

## 3. Technology stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| UI runtime | React 19 | Component rendering and state |
| Build/dev server | Vite 6 | Bundling, HMR, `/api` proxy |
| Routing | React Router DOM 7 | Client-side routes and deep links |
| Styling | Plain CSS3 design system | Layout, components, pages, responsive behaviour |
| Icons | Lucide React | Interface iconography |
| Fonts | Inter Variable, JetBrains Mono | UI and code typography |
| HTTP client | Native `fetch` + `AbortController` | API requests, cancellation, error mapping |
| Server runtime | Node.js 18+ with ES modules | API execution |
| Web framework | Express 4 | Routing, middleware, static serving |
| ODM | Mongoose 8 | Schemas, validation, hooks, aggregation |
| Database | MongoDB 6+ | Persistent projects and tasks |
| AI provider | OpenAI-compatible `/v1/chat/completions` | Plan generation and assistant replies |
| Configuration | `dotenv` | Environment loading and secrets |
| Dev tooling | nodemon, concurrently, npm | Reload, parallel scripts, dependency management |
| Version control | Git | Feature-branch workflow |

---

## 4. Frontend architecture

### 4.1 Bootstrap and routing

`client/src/main.jsx` creates the React root, wraps the app in `BrowserRouter` and `ToastProvider`, and imports global styles and fonts.

`client/src/App.jsx` declares the route tree under a single `AppLayout`:

| Path | Page | Purpose |
| --- | --- | --- |
| `/` | `Dashboard` | Workspace overview and analytics |
| `/projects` | `Projects` | Project list, search, filters, CRUD |
| `/projects/:id` | `ProjectDetails` | Single project, tasks and progress |
| `/tasks` | `Tasks` | Kanban/list task management |
| `/ai-planner` | `AIPlanner` | Generate, edit and save AI plans |
| `/assistant` | `Assistant` | Multi-turn AI chat |
| `/lab` | `JsLab` | Executable JavaScript demonstrations |
| `*` | `NotFound` | 404 page |

### 4.2 Layout and navigation

`client/src/layouts/AppLayout.jsx` renders:

```text
AppLayout
├── Sidebar            — grouped navigation + system-status footer
└── app-main
    ├── Navbar         — breadcrumb, health pill, "New task", avatar
    └── app-content
        ├── HealthBanner — API/MongoDB/AI configuration warning
        └── <Outlet />   — active route
```

- The sidebar collapses into an overlay on small screens.
- `useSystemHealth()` loads `/api/health` on mount; `refresh()` re-fetches it.
- `Navbar` and `Sidebar` derive **API online / Degraded / API offline** from the health payload.
- `HealthBanner` renders dismissible, actionable messages for a disconnected database or missing AI key.
- Navigation closes and the window scrolls to the top when the pathname changes.

### 4.3 State management

There is no global state library. State is local to pages and components:

- `useState` for data, filters, modals, form fields and loading flags.
- `useEffect` for fetching and syncing side effects.
- `useMemo` for derived client-side lists (for example filtered project tasks).
- `useRef` for timers, scroll containers, conversation snapshots and focus restoration.
- React Context only for toasts (`ToastProvider` / `useToast`).
- `sessionStorage` only for assistant chat history.

Data is always fetched from the API; there is no mock data layer in the running application.

### 4.4 API access

`client/src/services/api.js` is the single HTTP client.

- `API_BASE = import.meta.env.VITE_API_URL || '/api'`.
- `request()` wraps `fetch`, sets `Content-Type` when a body exists, parses JSON safely and throws a typed `ApiError` for non-2xx responses.
- Network failures become `ApiError` with status `0`.
- `AbortError` is re-thrown and ignored by pages on unmount.
- `buildQuery()` removes empty values.
- `encodeId()` encodes route parameters.
- Exported API groups: `systemApi`, `dashboardApi`, `projectsApi`, `tasksApi`, `aiApi`.
- `isAbortError()` is shared by callers.

### 4.5 Rendering states

Every data-driven page implements a subset of:

- **Loading:** skeletons (`Loader.jsx`) or spinners.
- **Refreshing:** existing content stays visible with an `is-refreshing` class.
- **Empty:** `EmptyState` with a contextual action.
- **Error:** `ErrorAlert` with message, details and retry.
- **Success:** toast notifications and optimistic local updates where appropriate.

### 4.6 Styling

Styles are split by responsibility:

- `styles/global.css` — reset, tokens, typography, base elements.
- `styles/layout.css` — app shell, sidebar, navbar, page layout.
- `styles/components.css` — buttons, cards, badges, modals, forms, tasks, toasts.
- `styles/pages.css` — dashboard, projects, details, Kanban, AI pages, lab.
- `styles/index.css` — imports the style layers and fonts.

The design system is plain CSS with custom properties, responsive breakpoints and `conic-gradient` donut/ring visualisations.

---

## 5. Backend architecture

### 5.1 Layered structure

```text
server/
├── server.js                 Express app, middleware order, boot, shutdown
├── config/
│   ├── env.js                dotenv loading + typed env object
│   └── db.js                 Mongoose connect, readiness, retry watcher
├── middleware/
│   ├── logger.js             request/response logging
│   ├── validate.js           body/ObjectId validation + DB guard
│   ├── asyncHandler.js       async error forwarding
│   └── errorHandler.js       404 + centralized error mapping
├── routes/                   REST endpoint definitions
├── controllers/              request/response orchestration
├── services/
│   ├── aiService.js          provider calls, JSON parsing, validation
│   └── taskStatsService.js   aggregation + progress calculation
├── models/
│   ├── Project.js            schema, virtual, cascade hook
│   └── Task.js               schema, enums, indexes
└── utils/
    ├── constants.js          shared enums/defaults
    ├── validators.js         request payload sanitisation
    ├── planValidator.js      AI structured-output validation
    ├── prompts.js            versioned system/user prompts
    ├── query.js              regex escaping + sort allow-list
    ├── ApiError.js           operational HTTP error type
    └── seed.js               optional demo dataset
```

### 5.2 Middleware order

`server/server.js` applies middleware in this order:

1. `cors({ origin: env.clientOrigins, credentials: true })`
2. `express.json({ limit: '1mb' })`
3. `express.urlencoded({ extended: true })`
4. `requestLogger`
5. `GET /api/health`
6. API routers (`/api/projects`, `/api/tasks`, `/api/ai`, `/api/dashboard`)
7. Static `client/dist` + SPA fallback (only when the build directory exists)
8. `notFoundHandler`
9. `errorHandler`

The ordering ensures CORS and body parsing happen before routes, logging covers every request, and the 404/error handlers are last.

### 5.3 Request lifecycle

```text
HTTP request
  → CORS
  → body parser
  → request logger (start timer)
  → route match
      → requireDatabase (DB routes / save-plan)
      → validateObjectIdParam (/:id routes)
      → validateBody (payload routes)
      → controller (asyncHandler)
          → model / service / AI provider
          → JSON response
  → (on error) next(error)
  → errorHandler
      → mapped status + { success:false, message, code?, details? }
  → logger records status + duration
```

### 5.4 Boot and degraded mode

- The HTTP server starts listening immediately.
- `connectDB()` runs asynchronously; failure does not exit the process.
- When the first connection fails, `watchDatabaseConnection()` retries every 15 seconds.
- Missing `MONGODB_URI` returns `false` without attempting a connection.
- `logConfigurationHints()` prints actionable console guidance for missing configuration.
- `/api/health` remains available at all times.
- Database routes fail fast with `503 DATABASE_NOT_CONFIGURED`.
- AI routes fail fast with `503 AI_NOT_CONFIGURED` when no key is configured.

This design makes configuration errors visible in the UI instead of producing a server crash or a hanging request.

### 5.5 Static serving and production mode

When `client/dist` exists, Express:

1. Serves the built assets with `express.static`.
2. Returns `index.html` for every non-`/api` GET route using a negative-lookahead route pattern.

This supports React Router deep links in production without a separate web server.

### 5.6 Graceful shutdown

`SIGINT` and `SIGTERM` call `server.close()`, close the Mongoose connection, and exit. A 5-second fallback timer forces exit if shutdown stalls. Unhandled promise rejections are logged.

---

## 6. Database architecture

### 6.1 Collections

| Collection | Model | Purpose |
| --- | --- | --- |
| `projects` | `Project` | Project metadata, status and timeline |
| `tasks` | `Task` | Work items linked to a project |

### 6.2 Relationship model

```text
Project (1) ────< Task (many)
   _id               project: ObjectId ref "Project"
```

- The foreign key lives on `Task.project`.
- `Project` exposes a virtual `tasks` field using `localField: _id`, `foreignField: project`.
- Controllers generally query tasks directly with `Task.find({ project })`; the virtual documents the relationship and supports population.
- `Task.project` is required and indexed.
- Project deletion cascades through `projectSchema.pre('findOneAndDelete')`, which calls `Task.deleteMany({ project: projectId })`.

### 6.3 Indexes

| Collection | Index | Reason |
| --- | --- | --- |
| Project | `status` | Status filtering |
| Project | `createdAt: -1` | Newest-first listing |
| Task | `project` | Project task lists, cascade, stats |
| Task | `priority` | Priority filtering |
| Task | `status` | Status filtering and dashboard counts |
| Task | `{ project: 1, status: 1 }` | Per-project status views |
| Task | `dueDate` | Deadline sort and upcoming tasks |

### 6.4 Derived data

The following values are computed, never stored:

- `taskStats.total`, `.completed`, `.inProgress`, `.todo`
- `progress` = `round(completed / total * 100)`, or `0` when there are no tasks
- Dashboard totals, completion percentage and overdue count
- Status/priority distributions
- Upcoming tasks

`taskStatsService.js` uses one aggregation (`$match` + `$group` with conditional sums) for a set of project IDs, avoiding N+1 queries.

### 6.5 Data integrity

- API-level validators sanitise payloads before controllers.
- Mongoose schema validation runs on create and on updates with `runValidators: true`.
- Enums are shared between API validation and schema definitions via `utils/constants.js`.
- Task creation/update checks that the referenced project exists.
- Plan saving inserts tasks in one `insertMany`; on failure the project is deleted (and the cascade hook removes any partial tasks).

---

## 7. AI integration architecture

### 7.1 Components

```text
AIPlanner / Assistant (React)
        │ JSON request
        ▼
POST /api/ai/generate-plan | /api/ai/chat | /api/ai/save-plan
        │
        ▼
aiController
        │
        ├── aiService.generateProjectPlan()
        │     ├── prompts.PLAN_SYSTEM_PROMPT + buildPlanPrompt()
        │     ├── requestCompletion() → fetch(provider)
        │     ├── parseJsonContent()
        │     └── planValidator.validatePlan()
        │
        └── aiService.generateChatReply()
              ├── prompts.CHAT_SYSTEM_PROMPT
              └── requestCompletion()

save-plan → validators.validateSavePlanPayload()
          → Project.create()
          → Task.insertMany()
          → rollback on failure
```

### 7.2 Provider abstraction

`server/services/aiService.js` calls:

```text
POST {AI_BASE_URL}/chat/completions
Authorization: Bearer {AI_API_KEY}
Content-Type: application/json
```

Payload:

```json
{
  "model": "{AI_MODEL}",
  "messages": [{ "role": "system|user|assistant", "content": "..." }],
  "temperature": 0.55,
  "max_tokens": 3200,
  "response_format": { "type": "json_object" }
}
```

- `response_format` is sent only for plan generation (`jsonMode: true`).
- If the provider rejects it with `400` or `422`, the request is retried once without `response_format`.
- `AbortController` enforces `AI_TIMEOUT_MS`.
- Temperature is `0.55` for plans and `0.5` for chat.
- Plan `max_tokens` is `3200`; chat `max_tokens` is `1600`.

### 7.3 Trust boundary

The LLM is treated as an untrusted external service:

1. Raw content is stripped of markdown fences.
2. The first `{` to the last `}` is extracted when present.
3. `JSON.parse` failure becomes `502 AI_INVALID_RESPONSE`.
4. `validatePlan()` checks structure, lengths, counts and enums.
5. Values are normalised (casing, trimming, numeric clamping, de-duplication).
6. Only the normalised plan is returned to the client.
7. `save-plan` runs the same validation again on the edited plan before writing.

The model never receives the API key, and the key never reaches the browser.

### 7.4 Error mapping

| Condition | Status | Code |
| --- | --- | --- |
| Missing AI key | `503` | `AI_NOT_CONFIGURED` |
| Provider `401`/`403` | `502` | `AI_AUTH_FAILED` |
| Provider `429` | `503` | `AI_RATE_LIMITED` |
| Other provider non-2xx | `502` | `AI_PROVIDER_ERROR` |
| Empty model content | `502` | `AI_INVALID_RESPONSE` |
| Malformed JSON / failed plan validation | `502` | `AI_INVALID_RESPONSE` |
| Timeout | `504` | `AI_TIMEOUT` |
| Network failure | `502` | `AI_NETWORK_ERROR` |
| Invalid client request | `400` | — |

---

## 8. Data flow diagrams

### 8.1 Project CRUD

```text
User action
  → Projects page
  → projectsApi.create/update/remove
  → api.js request()
  → POST/PUT/DELETE /api/projects[/:id]
  → requireDatabase
  → validateObjectIdParam (mutations by id)
  → validateBody(validateProjectPayload)
  → projectController
  → Project.create / findByIdAndUpdate / findByIdAndDelete
  → MongoDB
  → JSON response
  → toast + list refresh
```

Read path for the list:

```text
GET /api/projects?search=&status=&sort=
  → filter construction (status allow-list, escaped regex, sort allow-list)
  → Project.find(filter).sort(...).lean()
  → getTaskStatsForProjects(ids)  [one aggregation]
  → withTaskProgress(project, statsMap)
  → { success, count, data }
```

### 8.2 Tasks and Kanban

```text
GET /api/tasks?search=&status=&priority=&project=&sort=
  → Task.find(filter).sort(...).populate('project','name status deadline').lean()
  → { success, count, data }
  → Tasks page splits data into three columns client-side

Drag card to another column
  → optimistic local status change
  → PUT /api/tasks/:id { status }
  → validation + controller + MongoDB
  → success: replace task + toast
  → failure: restore previous task + error toast
```

### 8.3 Dashboard

```text
GET /api/dashboard/stats
  ├── Promise.all: Project.countDocuments, Task.countDocuments ×4
  ├── Promise.all: status aggregation, priority aggregation,
  │                recent projects (4), recent tasks (6), upcoming tasks (5)
  ├── getTaskStatsForProjects(recent project ids)
  ├── overdue count
  └── response:
      totals, statusDistribution, priorityDistribution,
      recentProjects, recentTasks, upcomingTasks, generatedAt
```

### 8.4 AI plan generation and saving

```text
AIPlanner (idea, difficulty)
  → POST /api/ai/generate-plan
  → validatePlanRequestPayload
  → aiService.generateProjectPlan
      → PLAN_SYSTEM_PROMPT + buildPlanPrompt
      → requestCompletion(jsonMode)
      → parseJsonContent
      → validatePlan
  → { success, data: plan, meta }

User edits + selects tasks + start date
  → POST /api/ai/save-plan
  → requireDatabase
  → validateSavePlanPayload (validatePlan + dates)
  → projectController... (aiController.savePlanHandler)
      → compute total estimated days
      → Project.create({ status:'Planning', ... })
      → build tasks with cumulative due dates
      → Task.insertMany()
      → on failure: delete project (cascade)
  → { success, message, data: { project, tasks } }
```

### 8.5 AI assistant

```text
Assistant page
  → append user message
  → POST /api/ai/chat { messages: latest 20 }
  → validateChatPayload (1–30 messages, roles, lengths)
  → aiService.generateChatReply
      → CHAT_SYSTEM_PROMPT + messages
      → requestCompletion (no JSON mode)
  → { success, data: { role:'assistant', content }, meta }
  → render message + model name
  → sessionStorage updated (latest 40)
```

### 8.6 Health and degraded mode

```text
AppLayout mounts
  → useSystemHealth → GET /api/health
  → { database:{configured,connected}, ai:{configured,model}, environment, uptimeSeconds }
  → Navbar pill: API online / Degraded / API offline
  → HealthBanner: database warning / AI warning / API unreachable
  → Retry calls refresh()
```

---

## 9. Component interactions

### 9.1 Frontend interaction map

```text
main.jsx
└── BrowserRouter
    └── ToastProvider
        └── App
            └── AppLayout
                ├── Sidebar
                ├── Navbar
                ├── HealthBanner ← useSystemHealth
                └── Outlet
                    ├── Dashboard → StatCard, ProgressBar, ErrorAlert, EmptyState, Loader
                    ├── Projects → ProjectCard, ProjectFormModal, ConfirmDialog, EmptyState, Loader
                    ├── ProjectDetails → TaskCard, TaskFormModal, TaskDetailsModal,
                    │                    ProjectFormModal, ConfirmDialog, ProgressBar
                    ├── Tasks → TaskCard, TaskFormModal, TaskDetailsModal, ConfirmDialog
                    ├── AIPlanner → ErrorAlert, Badge, Loader
                    ├── Assistant → ErrorAlert, ConfirmDialog
                    ├── JsLab → ConceptCard, ConsoleBox (local components)
                    └── NotFound
```

### 9.2 Shared component contract

| Component | Inputs | Responsibility |
| --- | --- | --- |
| `Modal` | `open`, `onClose`, `title`, `subtitle`, `icon`, `footer`, `size`, `closeOnOverlay` | Portal-based dialog, Escape/overlay close, scroll lock, focus trap and restore |
| `ConfirmDialog` | `open`, `onClose`, `onConfirm`, `loading`, `title`, `message`, `confirmLabel`, `tone` | Destructive-action confirmation built on `Modal` |
| `ProjectFormModal` | `open`, `project`, `onSaved`, `onClose` | Create/edit project, client validation, API call, toast |
| `TaskFormModal` | `open`, `task`, `defaultProjectId`, `defaultStatus`, `onSaved`, `onClose` | Create/edit task, project selection, API call, toast |
| `TaskDetailsModal` | `task`, `onClose`, `onEdit`, `onDelete`, `onStatusChange` | Read-only task detail view with actions |
| `TaskCard` | `task`, `variant`, `draggable`, handlers | Kanban card or list row, complete/reopen, edit/delete |
| `ProjectCard` | `project`, `onEdit`, `onDelete` | Project summary card with progress and stack chips |
| `StatCard` | `icon`, `label`, `value`, `hint`, `tone`, `progress` | Dashboard metric tile |
| `ProgressBar` | `value`, `tone`, `label`, `showValue`, `size` | Accessible progress indicator |
| `Badge` exports | `StatusBadge`, `PriorityBadge`, `DifficultyBadge`, `TechChip` | Consistent status/priority/stack labels |
| `ErrorAlert` | `title`, `message`, `details`, `onRetry`, `action` | Error surface with optional retry |
| `EmptyState` | `icon`, `title`, `description`, `action` | Empty view with optional CTA |
| `Loader` exports | `Spinner`, `PageLoader`, `Skeleton`, `SkeletonStatGrid`, `SkeletonCards` | Loading states |
| `HealthBanner` | `health`, `error`, `loading`, `onRetry` | Configuration warnings |

### 9.3 Backend interaction map

```text
server.js
├── config/env.js ────────────── used by server, db, aiService
├── config/db.js ─────────────── connectDB, isDatabaseReady, watchDatabaseConnection
├── middleware/logger.js
├── middleware/errorHandler.js
├── middleware/validate.js ───── used by routes
├── routes/projectRoutes.js ──── projectController ── Project, Task, taskStatsService
├── routes/taskRoutes.js ─────── taskController ───── Task, Project
├── routes/dashboardRoutes.js ── dashboardController ─ Project, Task, taskStatsService
├── routes/aiRoutes.js ───────── aiController ─────── aiService, Project, Task
└── services/aiService.js ────── env, ApiError, prompts, planValidator
```

---

## 10. Runtime topology

### 10.1 Development

```text
Browser :5173
  │ /api/* proxied by Vite
  ▼
Express :5000 ── MongoDB :27017
      │
      └── AI provider (HTTPS or local :11434/:4010)
```

- `npm run dev` runs Express (nodemon) and Vite concurrently.
- Vite's proxy avoids browser CORS for API calls.
- `CLIENT_ORIGIN` still allows direct cross-origin calls if needed.

### 10.2 Production-style single process

```text
Browser :5000
  ▼
Express :5000
  ├── /api/* → REST API
  ├── /*     → client/dist/index.html (SPA fallback)
  ├── MongoDB
  └── AI provider
```

- `npm run build` produces `client/dist`.
- `npm start` runs `server/server.js`.
- The client uses relative `/api` requests because it is served from the same origin.

---

## 11. Cross-cutting concerns

### 11.1 Validation

- **Request validation:** `utils/validators.js` returns `{ values, errors }`.
- **Middleware enforcement:** `validateBody()` rejects with `400` and replaces `req.body` with sanitised values.
- **Route parameter validation:** `validateObjectIdParam()` rejects malformed IDs before queries.
- **Database validation:** Mongoose schemas enforce required fields, min/max lengths and enums.
- **AI output validation:** `planValidator.js` enforces structure and normalises values.
- **Client validation:** forms check required fields and date order before sending.

### 11.2 Error handling

- Controllers throw `ApiError` or let errors propagate through `asyncHandler`.
- `errorHandler` maps Mongoose validation, cast errors, duplicate keys and malformed JSON to consistent JSON.
- Unknown failures return `500`; non-operational 5xx errors include a stack only outside production.
- The client converts non-2xx responses into `ApiError` with `status`, `details` and `code`.
- Pages render `ErrorAlert`; mutations also emit toasts.

### 11.3 Security

- API keys stay server-side in `server/.env` and are never bundled.
- `.env` files are gitignored.
- CORS uses an explicit origin list.
- Regex search input is escaped; sort keys use allow-lists.
- JSON body size is capped at 1 MB.
- No authentication is implemented; the application is intended for local/single-user use.

### 11.4 Performance

- Aggregations replace N+1 queries for task statistics.
- Dashboard counts and distributions are computed in MongoDB.
- Indexes cover common filters and sorts.
- Search is debounced client-side.
- In-flight requests are aborted on unmount/filter change.
- `lean()` is used for read-only queries.

### 11.5 Observability

- Request logs include status, method, URL and duration.
- Startup logs print the API URL and configuration hints.
- 5xx errors are logged with the error object.
- `/api/health` provides non-secret runtime state for the UI and operators.

---

## 12. Design decisions and trade-offs

| Decision | Rationale | Trade-off |
| --- | --- | --- |
| Server-side LLM calls | Protects the API key and enables validation | Requires a backend round trip |
| Preview → save workflow | Prevents unreviewed AI output from polluting data | One extra user step |
| Strict JSON prompt + backend validation | Increases reliability across providers | Invalid provider output is rejected rather than repaired |
| OpenAI-compatible contract | Works with many providers and local models | Provider-specific features are unavailable |
| Task foreign key on `Task` | Tasks are independently queryable and indexed | Project task lists require a second query or population |
| Cascade delete hook | Guarantees no orphaned tasks | Two writes are not a transaction; a crash between them is theoretically possible |
| Derived progress | Always consistent with task state | Recomputed on every read |
| Degraded-mode API | Configuration problems are diagnosable | Some requests return `503` until fixed |
| Local component state | Keeps the app small and explicit | No global cache or cross-page state sharing |
| Plain CSS | Full control, no build-time CSS dependency | More manual style maintenance |
| No authentication | Appropriate for a local academic build | Not safe for public multi-user deployment |

---

## 13. Known limitations

- No authentication, authorisation or user-scoped data.
- No automated tests or CI pipeline in the repository.
- No pagination; lists return all matching documents.
- Cascade delete uses a Mongoose middleware hook rather than a MongoDB transaction.
- AI replies are not streamed.
- Chat history is browser-tab scoped only.
- No rate limiting, request quotas or audit log.
- No deployment manifests or container configuration.

These limitations are consistent with the product scope in `PRD.md` and are not represented as implemented features.
