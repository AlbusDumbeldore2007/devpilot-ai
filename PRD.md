# DevPilot AI — Product Requirements Document (PRD)

**Project:** DevPilot AI — AI-powered developer task and project manager
**Document type:** Product Requirements Document
**Implementation:** MERN stack (React + Vite, Express, MongoDB/Mongoose, OpenAI-compatible LLM)
**Assessment context:** Kalvium academic project
**Status:** Implemented and locally verified

---

## 1. Project overview

DevPilot AI is a full-stack web application for developers who need to turn an idea into an executable plan and then manage the resulting work. The application combines three capabilities in one workspace:

1. **Project and task management** — real CRUD operations against MongoDB, with a dashboard, project detail pages, a task list and a Kanban board.
2. **AI project planning** — an idea is sent to a server-side LLM, which returns a structured project plan. The backend validates and normalises the model output before the user can save it as real projects and tasks.
3. **AI developer assistant** — a multi-turn chat that explains concepts, reviews architecture and helps debug code.

A dedicated **JavaScript Lab** page executes four mandatory JavaScript demonstrations in the browser: closures, the event loop, hoisting, and promises versus callbacks.

The product is intentionally a single-user, local-first developer workspace. It does not implement authentication, teams, billing, notifications or file uploads. All project, task and dashboard data shown in the UI is read from MongoDB; there are no hardcoded statistics or fake task lists. The only demo data in the repository is the optional seed script (`server/utils/seed.js`), which is run manually and is not injected by the running application.

---

## 2. Problem statement

Developers often have a clear product idea but struggle with the transition from idea to structured execution. Common problems are:

- **Planning overhead.** Breaking an idea into phases, tasks, priorities and estimates takes time and experience.
- **Scattered tracking.** Notes, spreadsheets and issue trackers are disconnected from the actual plan.
- **Weak visibility.** It is difficult to see completion, overdue work, task distribution and project progress in one place.
- **Context switching.** When work stalls, developers need quick explanations, debugging help and architecture advice.
- **AI output trust.** LLMs produce useful text but unreliable JSON; blindly persisting generated output can corrupt application data.

DevPilot AI addresses these problems by putting AI-assisted planning next to real project and task persistence, with server-side validation acting as a trust boundary between the model and the database.

---

## 3. Proposed solution

DevPilot AI provides one workspace with five connected surfaces:

| Surface | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/` | Live workspace totals, task distribution, priority mix, recent projects and tasks, quick actions |
| Projects | `/projects` | Searchable, filterable project CRUD |
| Project details | `/projects/:id` | Project metadata, progress, task filters and task management |
| Task Manager | `/tasks` | Kanban board, list view, filtering, drag-and-drop status updates |
| AI Project Planner | `/ai-planner` | Idea → validated structured plan → editable preview → saved project and tasks |
| AI Assistant | `/assistant` | Multi-turn developer chat with code rendering |
| JavaScript Lab | `/lab` | Executable demonstrations of four core JavaScript concepts |

The AI planner is not a text generator that writes directly to the database. The flow is deliberately split:

1. **Generate:** the backend prompts the LLM, extracts JSON, validates and normalises it, and returns a preview.
2. **Review:** the user edits phase names, task details, priorities, difficulty and estimates, and selects which tasks to keep.
3. **Save:** the backend validates the edited plan again and only then creates MongoDB documents.

If the LLM is misconfigured, unreachable, slow, rate-limited or returns malformed JSON, the API returns an actionable error instead of writing partial data or failing silently.

---

## 4. Target users

### Primary persona — individual developer / student

- Builds side projects, coursework or portfolio applications.
- Needs to convert an idea into a realistic task breakdown quickly.
- Wants a lightweight alternative to a full issue tracker.
- Values concrete technical help when blocked.

### Secondary persona — early-career developer

- Learns architecture and debugging patterns.
- Needs explanations of JavaScript and backend concepts.
- Benefits from seeing real request validation, error handling and database modelling.

### Evaluator persona — academic assessor

- Reviews whether the mandatory full-stack concepts are implemented, not merely described.
- Needs to trace a feature from UI → API → validation → controller → database/model → response.
- Needs executable demonstrations and clear documentation (PRD, HLD, LLD).

### Explicit non-users

The current implementation is not designed for teams, organisations or public multi-tenant use. There are no user accounts, roles, permissions or per-user data isolation.

---

## 5. Scope

### 5.1 In scope (implemented)

- Single-user developer workspace.
- Project CRUD with validation, search, status filtering and sorting.
- Task CRUD with project association, priorities, statuses, due dates and filtering.
- Project detail view with task statistics, progress and local filtering.
- Kanban board with drag-and-drop status persistence.
- Dashboard analytics computed from MongoDB counts and aggregations.
- AI plan generation through an OpenAI-compatible Chat Completions endpoint.
- Server-side structured-output validation and normalisation.
- Plan editing, task selection, start-date selection and save to MongoDB with rollback.
- Multi-turn AI assistant with session-only chat history.
- Health endpoint and degraded-mode UI banners.
- Optional seed script for demonstration data.
- Root documentation: `README.md`, `PRD.md`, `HLD.md`, `LLD.md`, `GITHUB_SETUP.md`.

### 5.2 Out of scope (not implemented)

- Authentication, authorisation, sessions or user accounts.
- Multi-user collaboration, comments, mentions or shared workspaces.
- Email, push or in-app notifications and reminders.
- File attachments, images or avatar uploads.
- Billing, subscriptions or usage metering.
- Real-time updates via WebSockets or server-sent events.
- Calendar integration or external issue-tracker sync.
- Automated CI/CD pipelines, Dockerfiles or cloud deployment manifests.
- Automated unit/integration test suites in the repository.
- Streaming LLM responses (the client shows a loading state, not token streaming).

These exclusions are stated so the documentation does not imply functionality that does not exist.

---

## 6. Functional requirements

Requirements are grouped by surface. Each requirement describes behaviour that exists in the current codebase.

### 6.1 System and health

| ID | Requirement |
| --- | --- |
| FR-SYS-01 | The Express server must boot even when `MONGODB_URI` or `AI_API_KEY` is missing. |
| FR-SYS-02 | `GET /api/health` must report database configuration/connection state, AI configuration, model name, environment and uptime. |
| FR-SYS-03 | The UI must show one of three API states: **API online**, **Degraded** (database or AI unavailable) or **API offline**. |
| FR-SYS-04 | The UI must show actionable banners when MongoDB is disconnected or AI is not configured, with a retry action where applicable. |
| FR-SYS-05 | Database-dependent endpoints must return `503 DATABASE_NOT_CONFIGURED` when Mongoose is not connected. |
| FR-SYS-06 | AI endpoints must return `503 AI_NOT_CONFIGURED` when no API key is configured. |
| FR-SYS-07 | The server must attempt to reconnect to MongoDB in the background every 15 seconds after a failed connection. |
| FR-SYS-08 | The server must shut down gracefully on `SIGINT` and `SIGTERM`, closing the HTTP server and Mongoose connection. |

### 6.2 Dashboard

| ID | Requirement |
| --- | --- |
| FR-DASH-01 | The dashboard must show total projects, total tasks, completed, in-progress, pending and completion percentage. |
| FR-DASH-02 | The dashboard must show overdue task count as part of the totals payload. |
| FR-DASH-03 | Task status distribution and priority distribution must be generated by MongoDB aggregation, not hardcoded arrays. |
| FR-DASH-04 | Recent projects (latest 4) and recent tasks (latest 6) must be read from MongoDB. |
| FR-DASH-05 | Upcoming tasks (non-completed tasks with a due date, sorted ascending, limit 5) must be returned. |
| FR-DASH-06 | The dashboard must show a donut chart and priority bars derived from the API response. |
| FR-DASH-07 | The dashboard must show an onboarding strip when there are no projects and no tasks. |
| FR-DASH-08 | The dashboard must show loading skeletons, an error alert with retry, and empty states. |

### 6.3 Projects

| ID | Requirement |
| --- | --- |
| FR-PROJ-01 | Users must be able to create a project with name, description, technologies, status, start date and deadline. |
| FR-PROJ-02 | Project name is required, trimmed, 2–120 characters. Description is optional, maximum 2000 characters. |
| FR-PROJ-03 | Project status must be one of `Planning`, `In Progress`, `Completed`, `On Hold`. |
| FR-PROJ-04 | Deadline must not be earlier than the start date when both are provided. |
| FR-PROJ-05 | Technologies may be supplied as an array or a comma-separated string; values are trimmed, de-duplicated and capped at 30. |
| FR-PROJ-06 | Users must be able to list projects with `search`, `status` and `sort` query parameters. |
| FR-PROJ-07 | Search must match project name, description or technologies using a case-insensitive, escaped regex. |
| FR-PROJ-08 | Sort must be restricted to an allow-list: `createdAt`, `name`, `deadline`, `status`, with `-` prefix for descending. |
| FR-PROJ-09 | Project list responses must include aggregated `taskStats` and computed `progress`. |
| FR-PROJ-10 | Users must be able to open a project detail page showing tasks, task statistics and progress. |
| FR-PROJ-11 | Users must be able to edit a project using a pre-filled modal. |
| FR-PROJ-12 | Users must be able to delete a project after a confirmation dialog; all associated tasks must be deleted by a Mongoose cascade hook. |
| FR-PROJ-13 | The Projects page must support a `?new=1` deep link that opens the create modal. |
| FR-PROJ-14 | Search input must be debounced (350 ms) before a request is sent. |

### 6.4 Tasks

| ID | Requirement |
| --- | --- |
| FR-TASK-01 | Users must be able to create a task with title, description, project, priority, status and due date. |
| FR-TASK-02 | Task title is required, trimmed, 2–160 characters. Description is optional, maximum 3000 characters. |
| FR-TASK-03 | Every task must reference an existing project; create and update must verify the project exists. |
| FR-TASK-04 | Task status must be one of `To Do`, `In Progress`, `Completed`. Priority must be one of `Low`, `Medium`, `High`, `Critical`. |
| FR-TASK-05 | Users must be able to list tasks with `search`, `status`, `priority`, `project` and `sort` query parameters. |
| FR-TASK-06 | Task list responses must populate the referenced project with `name`, `status` and `deadline`. |
| FR-TASK-07 | The Task Manager must provide a Kanban board with columns for the three statuses. |
| FR-TASK-08 | Dragging a task to another column must optimistically update the UI and persist the new status through `PUT /api/tasks/:id`. The UI must roll back on failure. |
| FR-TASK-09 | The Task Manager must provide a list view with search, priority, project, status and sort controls. |
| FR-TASK-10 | Users must be able to open a task details modal, edit a task, mark it complete/reopen it, and delete it after confirmation. |
| FR-TASK-11 | The Task Manager must support `?new=1` and `?task=<id>` deep links. |
| FR-TASK-12 | Project details must allow local task filtering by status tab and text search without additional network requests, using the closure-based filter utility. |

### 6.5 AI Project Planner

| ID | Requirement |
| --- | --- |
| FR-AI-01 | Users must provide a project idea of 10–4000 characters and an optional difficulty (`Easy`, `Medium`, `Hard`). |
| FR-AI-02 | The backend must call a configurable OpenAI-compatible `/chat/completions` endpoint using a server-only API key. |
| FR-AI-03 | The plan prompt must request a strict JSON object containing project title, description, technologies, difficulty and 3–5 phases with tasks. |
| FR-AI-04 | The backend must extract JSON even if the provider wraps it in markdown fences. |
| FR-AI-05 | The backend must validate and normalise the plan: title and description lengths, technology list, difficulty enum, phase/task counts, titles, priorities, task difficulties and estimated days. |
| FR-AI-06 | Invalid model output must return `502` and must never reach MongoDB. |
| FR-AI-07 | The generated plan must be returned as a preview; nothing is persisted during generation. |
| FR-AI-08 | Users must be able to edit phase names, task titles, descriptions, priorities, difficulties and day estimates before saving. |
| FR-AI-09 | Users must be able to select or deselect individual tasks and select/deselect all. |
| FR-AI-10 | Users must be able to choose a start date; the UI previews the estimated end date from selected task estimates. |
| FR-AI-11 | Saving must revalidate the edited plan and create one `Project` plus one `Task` per selected task. |
| FR-AI-12 | The saved project status must be `Planning`; saved tasks must start in `To Do`. Task due dates are assigned cumulatively from the selected start date using each task's `estimatedDays`. |
| FR-AI-13 | If task insertion fails, the created project must be rolled back. |
| FR-AI-14 | A successful save must link to the created project and allow the user to start another plan. |
| FR-AI-15 | The UI must distinguish missing AI configuration (`AI_NOT_CONFIGURED`) from other generation failures. |

### 6.6 AI Assistant

| ID | Requirement |
| --- | --- |
| FR-CHAT-01 | Users must be able to send multi-turn messages with roles `user` and `assistant`. |
| FR-CHAT-02 | Each request may contain 1–30 messages; each message content is 1–6000 characters. |
| FR-CHAT-03 | The backend must prepend the assistant system prompt and forward the conversation to the LLM. |
| FR-CHAT-04 | The client must send the latest 20 messages and persist at most the latest 40 in `sessionStorage`. |
| FR-CHAT-05 | The UI must render fenced code blocks, inline code and bold text without a Markdown dependency. |
| FR-CHAT-06 | The UI must show a typing indicator while waiting, an error alert with retry, and a clear-conversation confirmation. |
| FR-CHAT-07 | Chat history must be scoped to the browser tab session and cleared when the user confirms. |
| FR-CHAT-08 | The model name returned in response metadata must be displayed when available. |

### 6.7 JavaScript Lab

| ID | Requirement |
| --- | --- |
| FR-LAB-01 | The lab must execute closures, event loop, hoisting and promises-vs-callbacks demonstrations live in the browser. |
| FR-LAB-02 | The closure demonstration must include an interactive task filter and a private counter. |
| FR-LAB-03 | The event loop demonstration must emit real events in sync → microtask → macrotask order with timestamps. |
| FR-LAB-04 | The hoisting demonstration must show `var` before assignment, early function declaration calls, early function expression failure and the `let` temporal dead zone error. |
| FR-LAB-05 | The async demonstration must show an error-first callback, a promise with `async/await`, and promisification of the callback API. |
| FR-LAB-06 | The lab must display real execution output, not pre-written static output. |

### 6.8 Configuration and data setup

| ID | Requirement |
| --- | --- |
| FR-CFG-01 | Environment values must be loaded from `server/.env`, falling back to a root `.env` if present. Only `VITE_*` values may reach the client bundle. |
| FR-CFG-02 | `.env` files must be ignored by Git; `.env.example` must be committed. |
| FR-CFG-03 | The AI base URL, model, API key and timeout must be configurable. |
| FR-CFG-04 | CORS must allow a configurable, comma-separated list of client origins. |
| FR-CFG-05 | The optional seed command must clear and recreate 2 demo projects with 10 tasks. |
| FR-CFG-06 | The root scripts must support combined development, server-only, client-only, build, start and seed workflows. |

---

## 7. Non-functional requirements

### 7.1 Usability

- NFR-USE-01: Every asynchronous view must show a loading state (skeleton or spinner) and an empty state where applicable.
- NFR-USE-02: Every failed mutation must produce a toast or inline error alert; failed views must offer retry.
- NFR-USE-03: Destructive actions (delete project, delete task, clear chat) must require a confirmation dialog.
- NFR-USE-04: Forms must show inline field errors and disable submit buttons while saving.
- NFR-USE-05: Navigation must expose the active route and adapt to small screens with a collapsible sidebar.
- NFR-USE-06: Interactive elements must have accessible labels; modals must trap focus, close on Escape and restore focus.

### 7.2 Reliability

- NFR-REL-01: The API must start independently of MongoDB and AI availability.
- NFR-REL-02: Database queries must not hang an endpoint when MongoDB is unavailable; `requireDatabase` returns an immediate `503`.
- NFR-REL-03: AI calls must time out after `AI_TIMEOUT_MS` (default 60 000 ms) and return `504`.
- NFR-REL-04: AI provider failures must be mapped to meaningful status codes (`502` for upstream/auth/malformed output, `503` for rate limits or missing configuration).
- NFR-REL-05: Project deletion must be atomic from the caller's perspective: the model hook removes dependent tasks.
- NFR-REL-06: Plan saving must roll back the project if task insertion fails.

### 7.3 Security and data protection

- NFR-SEC-01: `AI_API_KEY` must never be sent to the browser or included in the Vite bundle.
- NFR-SEC-02: CORS must be restricted to configured origins.
- NFR-SEC-03: User search input must be escaped before building MongoDB regexes.
- NFR-SEC-04: Sort fields must be resolved through allow-lists to prevent arbitrary field injection.
- NFR-SEC-05: Request bodies must be validated and sanitised by dedicated validators before controllers run.
- NFR-SEC-06: JSON request bodies are limited to 1 MB.
- NFR-SEC-07: `.env` files and build output must be excluded from Git.

The project has no authentication; this is a documented product limitation, not an oversight in the security model. It is intended for local/single-user use and assessment.

### 7.4 Performance

- NFR-PERF-01: Project progress for list views must use one aggregation for all projects rather than N+1 queries.
- NFR-PERF-02: Dashboard totals and distributions must use counts and aggregations, not loading full collections into the API process.
- NFR-PERF-03: Search inputs must be debounced to avoid a request per keystroke.
- NFR-PERF-04: In-flight page requests must be aborted on unmount or filter change.
- NFR-PERF-05: Indexes must support common filters: task `project`, `status`, `priority`, `project + status`, `dueDate`; project `status` and `createdAt`.
- NFR-PERF-06: Production assets must be built by Vite and served by Express with a single-page fallback.

### 7.5 Maintainability

- NFR-MNT-01: The backend must separate configuration, models, middleware, validators, controllers, services and routes.
- NFR-MNT-02: Prompts, constants and validation rules must live in dedicated reusable modules.
- NFR-MNT-03: The frontend must use reusable components and a single API client.
- NFR-MNT-04: The codebase must use ES modules and modern JavaScript consistently.
- NFR-MNT-05: Documentation must describe the implementation and be updated when behaviour changes.

### 7.6 Compatibility

- NFR-COMP-01: Node.js 18 or later.
- NFR-COMP-02: MongoDB 6 or later, locally or Atlas.
- NFR-COMP-03: Modern evergreen browsers that support `fetch`, `AbortController`, CSS custom properties and `conic-gradient`.
- NFR-COMP-04: Any provider exposing an OpenAI-compatible chat completions API.

### 7.7 Observability

- NFR-OBS-01: Every HTTP request must log timestamp, status, method, path and duration.
- NFR-OBS-02: Server startup must print the listening URL and configuration hints for missing MongoDB or AI settings.
- NFR-OBS-03: Server-side 5xx errors must be logged with the error object.
- NFR-OBS-04: `/api/health` must expose non-secret configuration state for diagnostics.

---

## 8. Features and scope summary

| Feature | User value | Implementation status |
| --- | --- | --- |
| Live dashboard | Immediate visibility into workload and completion | Implemented |
| Project CRUD | Organise development work | Implemented |
| Project detail + progress | Inspect a project and its tasks | Implemented |
| Task CRUD + filters | Manage work items at scale | Implemented |
| Kanban drag-and-drop | Fast workflow status changes | Implemented |
| AI plan generation | Convert an idea into phases and tasks | Implemented |
| Plan editing and selection | Keep control over AI output | Implemented |
| Plan persistence | Turn a preview into real MongoDB data | Implemented |
| AI assistant | On-demand technical help | Implemented |
| Health/degraded mode | Diagnose missing infrastructure | Implemented |
| JavaScript Lab | Demonstrate four core JS concepts | Implemented |
| Seed script | Fast demo dataset | Implemented |
| Authentication/teams | Multi-user access control | Not implemented |
| Notifications/reminders | Time-based alerts | Not implemented |
| Streaming AI responses | Incremental text output | Not implemented |
| Automated tests/CI | Regression safety | Not implemented |

---

## 9. User workflows

### 9.1 First run

1. The developer copies `.env.example` to `server/.env` and sets `MONGODB_URI` plus AI variables.
2. The developer runs `npm run install:all` and `npm run dev`.
3. The browser opens the dashboard at `http://localhost:5173`.
4. `/api/health` is requested. If MongoDB or AI is missing, the navbar shows **Degraded** and the banner explains what to fix.
5. With both services available, the dashboard shows live totals (or an onboarding strip if the workspace is empty).

### 9.2 Create and manage a project manually

1. The user opens **Projects** and clicks **New project**.
2. The modal collects name, description, comma-separated technologies, status, start date and deadline.
3. The client validates the name and date order, then calls `POST /api/projects`.
4. The backend validator sanitises the payload; the controller creates the document.
5. A success toast appears and the list refreshes.
6. Opening the project shows its tasks, stats and progress ring.
7. Editing sends `PUT /api/projects/:id`; deleting opens a confirmation and sends `DELETE /api/projects/:id`, which cascades tasks.

### 9.3 Create and move a task

1. The user opens **Task Manager** and clicks **New task**, or uses **Add task** inside a project.
2. The form requires a title and a project; priority, status and due date are optional.
3. `POST /api/tasks` verifies the project exists and creates the task.
4. On the Kanban board, the task appears in its status column.
5. Dragging the card to another column updates the card immediately, then sends `PUT /api/tasks/:id` with the new status. On failure the card returns to its previous column and an error toast appears.
6. The task details modal supports edit, complete/reopen and delete.

### 9.4 Generate and save an AI plan

1. The user opens **AI Project Planner** and describes an idea (at least 10 characters), optionally choosing difficulty.
2. The client calls `POST /api/ai/generate-plan`.
3. The server validates the idea, builds the plan prompt, calls the LLM in JSON mode, strips fences, parses JSON and validates the plan.
4. The validated plan is shown as an editable preview.
5. The user edits phases and tasks, deselects unwanted tasks and chooses a start date.
6. The client builds a plan containing only selected tasks and calls `POST /api/ai/save-plan`.
7. The backend revalidates the plan and the dates, creates the project, inserts tasks with cumulative due dates, and returns the created records.
8. The UI shows a success card with a link to the new project.

### 9.5 Ask the assistant for help

1. The user opens **AI Assistant**.
2. A message is appended locally and the conversation (latest 20 messages) is sent to `POST /api/ai/chat`.
3. The backend validates message count/roles/content, prepends the assistant prompt and calls the LLM.
4. The reply is appended with code-block rendering; the model name is displayed.
5. Errors offer retry. Clearing the conversation requires confirmation and removes session storage.

### 9.6 Demonstrate JavaScript concepts

1. The user opens **JavaScript Lab**.
2. **Closures:** selecting a priority re-runs `createTaskFilter`, and the private counter demonstrates state captured in a closure.
3. **Event loop:** running the demo emits real sync, microtask and macrotask events with timestamps.
4. **Hoisting:** running the demo prints `var` behaviour, early function declaration success, early function expression failure and the TDZ error.
5. **Promises vs callbacks:** separate runs show the error-first callback path, the async/await promise path and promisified callbacks.

---

## 10. Expected outcomes

### 10.1 Product outcomes

- A developer can go from a rough idea to a persisted, editable project plan in one session.
- Project and task state is always real MongoDB data; reloading the page preserves work.
- Dashboard metrics change immediately when projects and tasks change.
- AI output is reviewable and editable before it affects stored data.
- Missing infrastructure produces actionable guidance rather than blank screens or crashes.
- The JavaScript Lab makes the four required language concepts observable at runtime.

### 10.2 Academic outcomes

The implementation demonstrates all 23 mandatory concepts in working code. `LLD.md` maps each numbered concept to its file and implementation, and `README.md` provides a viva demonstration checklist.

| Outcome | Evidence |
| --- | --- |
| Full-stack request lifecycle | React page → API client → Express route → validation → controller → Mongoose → MongoDB → JSON response |
| Real database CRUD | Project/task create, read, update, delete plus cascade delete |
| AI integration | Server-side LLM calls for plan generation and chat |
| Prompt engineering | Versioned plan and assistant prompts with explicit constraints |
| Structured outputs | JSON extraction, validation, normalisation and rejection path |
| Error handling | Typed `ApiError`, Mongoose mapping, malformed JSON handling, degraded-mode 503s |
| JavaScript fundamentals | Executable closures, event loop, hoisting and async patterns |
| Documentation | PRD, HLD, LLD, README and GitHub setup guide in the repository root |

### 10.3 Acceptance criteria

The build is considered acceptable when:

1. `npm run install:all`, `npm run dev`, `npm run build`, `npm start` and `npm run seed` work as documented.
2. `/api/health` reports the real state of MongoDB and AI configuration.
3. Project and task CRUD work through the UI and return documented status codes.
4. Deleting a project removes its tasks.
5. Kanban drag-and-drop persists the new status.
6. A valid AI plan can be generated, edited, selected and saved to MongoDB.
7. Malformed AI output returns `502`; missing AI configuration returns `503`.
8. The assistant returns a rendered reply and preserves history for the tab session.
9. The JavaScript Lab runs all four demonstrations with live output.
10. `PRD.md`, `HLD.md` and `LLD.md` exist in the repository root and match the implementation.

### 10.4 Known limitations and future work

- Add authentication and per-user data ownership before any shared deployment.
- Add automated tests (API integration and component tests) and CI.
- Add pagination for very large project/task collections.
- Add streaming responses for the assistant.
- Add reminders/notifications for deadlines.
- Add provider-specific retry/backoff policies and token-usage dashboards.
- Add export/import for plans and projects.

These are explicitly future work; none are claimed as implemented.
