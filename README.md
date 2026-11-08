# DevPilot AI

**Smart AI-powered developer task manager.** DevPilot AI is a full-stack MERN application that helps developers plan projects, manage tasks on a Kanban board, track progress with live dashboard analytics, and turn rough ideas into validated project plans using a server-side LLM.

The UI is a premium dark SaaS dashboard built with React, Vite, plain CSS, React Router DOM and Lucide icons. Every number, chart, project and task is read from MongoDB — there are no fake dashboard statistics or hardcoded task lists. AI features call the Express backend, which owns the API key, builds structured prompts, validates the model's JSON, and persists only clean data.

**Assessment documentation:** [PRD.md](PRD.md) · [HLD.md](HLD.md) · [LLD.md](LLD.md) · [GitHub setup guide](GITHUB_SETUP.md)

---

## Table of contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [System architecture](#system-architecture)
4. [Folder structure](#folder-structure)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Environment variables](#environment-variables)
8. [MongoDB setup](#mongodb-setup)
9. [AI provider setup](#ai-provider-setup)
10. [Running the app](#running-the-app)
11. [Seed data](#seed-data)
12. [API documentation](#api-documentation)
13. [Degraded mode and configuration errors](#degraded-mode-and-configuration-errors)
14. [23 mandatory concept checklist](#23-mandatory-concept-checklist)
15. [Git workflow](#git-workflow)
16. [Verification performed](#verification-performed)
17. [Troubleshooting](#troubleshooting)

---

## Features

### Dashboard (`/`)
- Greeting, live API status and workspace date.
- Total projects, total tasks, completed, in-progress, pending and completion percentage.
- Task status donut chart and priority mix bars, both computed from aggregation results.
- Recent projects with progress, and recent tasks with deadline state.
- Quick actions that navigate to real create flows.
- Loading skeletons, empty state, error alert and retry.

### Projects (`/projects`, `/projects/:id`)
- Full CRUD with validated forms.
- Search by name, description or technology; filter by status; sort by newest, name, deadline or status.
- Project cards with stack chips, deadline state and task progress.
- Project details page with hero, completion ring, task filters, per-task completion controls, progress bar, edit and delete.
- Deleting a project also deletes its tasks through a Mongoose cascade hook.

### Task Manager (`/tasks`)
- Kanban board with **To Do**, **In Progress** and **Completed** columns.
- Drag-and-drop between columns persists the new status to MongoDB.
- List view, search, priority filter, project filter, status filter and deadline sorting.
- Create, edit, view details, complete/reopen and delete tasks.
- Task details modal with project, priority, due date and timestamps.

### AI Project Planner (`/ai-planner`)
- Describe an idea and optional difficulty level.
- Server-side prompt engineering returns structured JSON: title, description, technologies, phases, tasks, priorities, difficulty and day estimates.
- Backend validates and normalizes every field before returning the preview.
- Edit phase names, task titles, descriptions, priorities, difficulty and day estimates.
- Select/deselect tasks, choose a start date, preview the estimated end date.
- **Save plan** creates a real project and real task documents in MongoDB, with rollback if task insertion fails.
- Clear error states for missing AI configuration, upstream failures and malformed model output.

### AI Assistant (`/assistant`)
- Multi-turn chat with user/assistant bubbles, code-block rendering and inline code.
- Session-only history (cleared from `sessionStorage` when the tab closes).
- Suggested prompts, loading indicator, retryable errors and clear-conversation confirmation.
- Model name displayed from the backend response metadata.

### JavaScript Lab (`/lab`)
- Executes the four mandatory JavaScript demonstrations live in the browser.
- Closures: interactive task filter and private counter.
- Event loop: real sync → microtask → macrotask execution order with timestamps.
- Hoisting: `var`, `let`/`const` TDZ, function declarations and function expressions.
- Promises vs callbacks: error-first callback, promise/async-await and promisification.

---

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, JavaScript (no TypeScript), React Router DOM 7 |
| Styling | Plain CSS3 design system (no Tailwind), Inter + JetBrains Mono |
| Icons | Lucide React |
| Backend | Node.js, Express 4, REST API |
| Database | MongoDB, Mongoose 8 ODM |
| AI | OpenAI-compatible `/v1/chat/completions` API, server-side only |
| HTTP client | Native `fetch` with `AbortController` |
| Configuration | `dotenv`, `.env` files, `.env.example` template |
| Tooling | npm, nodemon, concurrently, Git |

The AI client is provider-agnostic: OpenAI, OpenRouter, Groq, DeepSeek, Together, Ollama or LM Studio all work as long as they expose an OpenAI-compatible chat completions endpoint.

---

## System architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│ Browser — React + Vite                                           │
│                                                                  │
│  Pages: Dashboard · Projects · Tasks · AI Planner · Assistant    │
│  Router: client/src/App.jsx + BrowserRouter                      │
│  API client: client/src/services/api.js (fetch, AbortController) │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP JSON
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Express API — server/server.js                                   │
│                                                                  │
│  CORS → JSON body parser → request logger                        │
│  Routes → validation middleware → controllers → services         │
│  Centralized 404 + error handler                                 │
└───────────────┬───────────────────────────────┬─────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────────┐   ┌──────────────────────────────┐
│ MongoDB + Mongoose            │   │ LLM provider                 │
│                               │   │                              │
│ Project schema                │   │ aiService.js                 │
│ Task schema (ObjectId ref)    │   │ prompts.js                   │
│ Aggregations for dashboard    │   │ planValidator.js             │
│ Cascade delete hook           │   │ JSON → validate → normalize  │
└───────────────────────────────┘   └──────────────────────────────┘
```

**Request flow for AI plan generation**

1. User submits an idea in `/ai-planner`.
2. Frontend calls `POST /api/ai/generate-plan`.
3. Backend validates the request (`validators.js`).
4. `prompts.js` builds a system + user prompt that demands strict JSON.
5. `aiService.js` calls the provider with the secret API key from `server/.env`.
6. `planValidator.js` parses the response, strips markdown fences, normalizes values and rejects invalid output.
7. The frontend previews the validated plan. Nothing is saved yet.
8. `POST /api/ai/save-plan` revalidates the edited plan and creates the Project + Tasks. If task insertion fails, the project is rolled back.

---

## Folder structure

```text
devpilot-ai/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/      # Sidebar, Navbar, Modal, cards, forms, badges
│   │   ├── pages/           # Dashboard, Projects, ProjectDetails, Tasks, AI pages
│   │   ├── layouts/         # AppLayout with sidebar + navbar + health banner
│   │   ├── hooks/           # toast, health polling, debounce/document title
│   │   ├── services/        # fetch-based API client
│   │   ├── utils/           # formatters + jsConceptsDemo.js
│   │   ├── styles/          # global, layout, components, pages CSS
│   │   ├── App.jsx          # React Router routes
│   │   └── main.jsx         # BrowserRouter + ToastProvider
│   ├── index.html
│   └── package.json
├── server/
│   ├── config/              # env loading, MongoDB connection
│   ├── controllers/         # project, task, dashboard, AI handlers
│   ├── middleware/          # logger, validation, asyncHandler, errors
│   ├── models/              # Project, Task Mongoose schemas
│   ├── routes/              # REST route definitions
│   ├── services/            # LLM calls + task statistics
│   ├── utils/               # prompts, plan validator, validators, seed
│   ├── server.js            # Express app and boot
│   └── package.json
├── .env.example
├── .gitignore
├── package.json             # root scripts
├── PRD.md                   # product requirements
├── HLD.md                   # high-level design
├── LLD.md                   # low-level design
├── GITHUB_SETUP.md          # repository publishing guide
└── README.md
```

---

## Prerequisites

- **Node.js 18+** (verified with Node 22/26; the project uses native `fetch` on the server if needed and modern ESM).
- **npm 9+**.
- **MongoDB 6+** locally, or a MongoDB Atlas connection string.
- An **OpenAI-compatible LLM API key**, or a local provider such as Ollama/LM Studio.

---

## Installation

From the project root:

```bash
cd devpilot-ai
npm run install:all
```

This installs:
- root tooling (`concurrently`),
- server dependencies,
- client dependencies.

If you prefer manual installation:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

---

## Environment variables

Create the server environment file:

```bash
cp .env.example server/.env
```

Then edit `server/.env`:

```env
# Server
NODE_ENV=development
PORT=5000

# Frontend origin allowed by CORS
CLIENT_ORIGIN=http://localhost:5173

# MongoDB — local or Atlas
MONGODB_URI=mongodb://127.0.0.1:27017/devpilot

# OpenAI-compatible provider
AI_API_KEY=your_real_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=60000
```

Notes:

- The frontend never receives `AI_API_KEY`. All model calls are made by the Express server.
- `.env` files are ignored by Git. Only `.env.example` is committed.
- `CLIENT_ORIGIN` accepts a comma-separated list of origins.
- If `MONGODB_URI` is missing or unreachable, the API still boots and returns helpful `503` errors instead of crashing.
- If `AI_API_KEY` is missing, AI endpoints return `503 AI_NOT_CONFIGURED` while CRUD and dashboard features continue to work.

---

## MongoDB setup

### Local MongoDB

Start MongoDB with your normal service manager, or directly:

```bash
mongod --dbpath /path/to/mongodb-data --port 27017 --bind_ip 127.0.0.1
```

The default database name used by the example URI is `devpilot`.

### MongoDB Atlas

1. Create a free cluster.
2. Create a database user.
3. Allow your IP address.
4. Copy the connection string into `MONGODB_URI`, replacing the database name with `devpilot` if desired:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/devpilot?retryWrites=true&w=majority
```

The server retries the connection in the background every 15 seconds after a failure, and the UI health pill switches from **API offline/degraded** to **API online** when the connection recovers.

---

## AI provider setup

The backend uses the OpenAI Chat Completions format. Configure any compatible provider.

### OpenAI

```env
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-...
```

### OpenRouter

```env
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=openai/gpt-4o-mini
AI_API_KEY=sk-or-...
```

### Groq

```env
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AI_API_KEY=gsk_...
```

### DeepSeek

```env
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
AI_API_KEY=sk-...
```

### Ollama (local)

```env
AI_BASE_URL=http://127.0.0.1:11434/v1
AI_MODEL=llama3.1
AI_API_KEY=ollama
```

Ollama must be running and the model must be pulled. Any non-empty key is acceptable for local providers that ignore authentication.

---

## Running the app

### Development (frontend + backend together)

```bash
# from devpilot-ai/
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:5000>
- Vite proxies `/api` requests to the backend (see `client/vite.config.js`).

### Run services separately

```bash
npm run dev:server   # nodemon server/server.js → http://localhost:5000
npm run dev:client   # Vite dev server → http://localhost:5173
```

### Production-style build

```bash
npm run build        # builds client/dist
npm start            # Express serves the API and client/dist on PORT
```

When `client/dist` exists, `server/server.js` serves the built React app for all non-API routes, so React Router deep links work.

### Health check

```bash
curl http://localhost:5000/api/health
```

Example response:

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

---

## Seed data

The app starts empty and works with real CRUD. For a quick demo dataset:

```bash
npm run seed
```

The seed script (`server/utils/seed.js`) clears the `devpilot` database and inserts 2 sample projects with 10 tasks. This is a development helper only — the running application never injects fake records.

---

## API documentation

Base URL: `http://localhost:5000`

All responses are JSON. Successful responses include `success: true`; errors include `success: false`, a `message`, and optionally `details` or `code`.

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | API status, database connection, AI configuration, model name and uptime. |

### Projects

| Method | Endpoint | Body / query | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/projects` | `?search=&status=&sort=` (`sort`: `createdAt`, `-createdAt`, `name`, `deadline`, `status`) | `200` | `400`, `503` |
| GET | `/api/projects/:id` | — | `200` (project + tasks + stats + progress) | `400`, `404`, `503` |
| POST | `/api/projects` | `{ name, description?, technologies?, status?, startDate?, deadline? }` | `201` | `400`, `503` |
| PUT | `/api/projects/:id` | Any subset of project fields | `200` | `400`, `404`, `503` |
| DELETE | `/api/projects/:id` | — | `200` (project + tasks deleted) | `400`, `404`, `503` |

Project statuses: `Planning`, `In Progress`, `Completed`, `On Hold`.

Example:

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DevPilot Mobile",
    "description": "Companion app for the DevPilot workspace.",
    "technologies": ["React Native", "Express", "MongoDB"],
    "status": "Planning",
    "deadline": "2026-12-31"
  }'
```

### Tasks

| Method | Endpoint | Body / query | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/tasks` | `?search=&status=&priority=&project=&sort=` (`sort`: `dueDate`, `createdAt`, `title`, `priority`) | `200` | `400`, `503` |
| GET | `/api/tasks/:id` | — | `200` (populated project) | `400`, `404`, `503` |
| POST | `/api/tasks` | `{ title, description?, project, priority?, status?, dueDate? }` | `201` | `400`, `404` (unknown project), `503` |
| PUT | `/api/tasks/:id` | Any subset of task fields | `200` | `400`, `404`, `503` |
| DELETE | `/api/tasks/:id` | — | `200` | `400`, `404`, `503` |

Task statuses: `To Do`, `In Progress`, `Completed`.<br>
Task priorities: `Low`, `Medium`, `High`, `Critical`.

Example:

```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement refresh-token rotation",
    "description": "Rotate refresh tokens on every use.",
    "project": "<project ObjectId>",
    "priority": "High",
    "status": "To Do",
    "dueDate": "2026-11-20"
  }'
```

### AI

| Method | Endpoint | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| POST | `/api/ai/generate-plan` | `{ idea, difficulty? }` (`difficulty`: `Easy`, `Medium`, `Hard`) | `200` with validated plan preview | `400`, `502`, `503`, `504` |
| POST | `/api/ai/chat` | `{ messages: [{ role: "user"\|"assistant", content }] }` | `200` with assistant reply | `400`, `502`, `503`, `504` |
| POST | `/api/ai/save-plan` | `{ plan, startDate?, deadline? }` | `201` with project and tasks | `400`, `500`, `503` |

AI status codes:

- `200` — generated successfully.
- `201` — plan saved as Project + Tasks.
- `400` — invalid request or invalid edited plan.
- `502` — provider returned malformed JSON or an upstream error.
- `503` — AI is not configured, or MongoDB is unavailable for saving.

Example:

```bash
curl -X POST http://localhost:5000/api/ai/generate-plan \
  -H "Content-Type: application/json" \
  -d '{
    "idea": "A habit tracker with streaks, reminders and weekly insights",
    "difficulty": "Medium"
  }'
```

Structured plan shape:

```json
{
  "projectTitle": "Habit Tracker",
  "description": "A mobile-friendly habit tracker with streaks and reminders.",
  "technologies": ["React", "Express", "MongoDB"],
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
}
```

### Dashboard

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/dashboard/stats` | Totals, completion percentage, status/priority distributions, recent projects/tasks, upcoming tasks, overdue count. |

All dashboard values are produced by MongoDB counts and aggregations in `server/controllers/dashboardController.js`.

### Common error shape

```json
{
  "success": false,
  "message": "Validation failed.",
  "details": ["Project name must be at least 2 characters."]
}
```

### HTTP status codes used

| Code | Meaning in this API |
| --- | --- |
| `200` | Successful read/update/delete, AI generation, health check |
| `201` | Project, task or saved plan created |
| `400` | Invalid JSON, validation failure, bad ObjectId/filter value |
| `404` | Route, project or task not found |
| `409` | Duplicate key (reserved for future unique constraints) |
| `500` | Unexpected server/database failure |
| `502` | LLM returned malformed JSON or failed upstream |
| `503` | MongoDB or AI not configured/available, or provider rate limit |
| `504` | LLM request timed out (`AI_TIMEOUT_MS`) |

---

## Degraded mode and configuration errors

DevPilot AI is designed to stay diagnosable when infrastructure is missing:

- The server boots even if MongoDB is unreachable.
- `/api/health` reports `database.configured`, `database.connected`, `ai.configured` and the model name.
- The navbar shows **API online**, **Degraded** or **API offline**.
- A persistent banner explains missing MongoDB or AI configuration.
- CRUD endpoints return `503 DATABASE_NOT_CONFIGURED` with actionable text when MongoDB is down.
- AI endpoints return `503 AI_NOT_CONFIGURED` when the key is missing.
- The UI shows error alerts with retry buttons instead of blank pages.

---

## 23 mandatory concept checklist

Legend: **File(s)** = where the concept is implemented. **Demonstration** = how to show it during a review or recording.

### AI and backend

| # | Concept | File(s) | Demonstration |
| --- | --- | --- | --- |
| 1 | **LLM API Integration** | `server/services/aiService.js`, `server/controllers/aiController.js` | Open **AI Planner**, generate a plan. Show `aiService.js` calling `${AI_BASE_URL}/chat/completions` with a server-only key. Open **Assistant** and send a message to show the second LLM integration. |
| 2 | **Prompt Engineering** | `server/utils/prompts.js` | Show the plan system prompt (role, strict JSON schema, phase/task constraints, difficulty) and the assistant system prompt. Generate a plan and point out the phase/task structure that follows the prompt. |
| 3 | **Structured Outputs** | `server/utils/planValidator.js`, `server/utils/validators.js`, `server/controllers/aiController.js` | Generate a plan, then show that the backend strips markdown fences, parses JSON, normalizes technologies/priorities/days and rejects invalid output with `502`. The save path revalidates the edited plan before MongoDB writes. |
| 4 | **HTTP Status Codes** | `server/routes/*.js`, `server/controllers/*.js`, `server/middleware/errorHandler.js` | Use curl: create → `201`; read → `200`; bad id/body → `400`; missing id → `404`; missing Mongo → `503`; malformed AI JSON → `502`. |
| 5 | **Middleware** | `server/middleware/logger.js`, `validate.js`, `errorHandler.js`, `asyncHandler.js`, `server/server.js` | Show the request log lines, validation middleware rejecting a short name, centralized error handler formatting the response, and `asyncHandler` forwarding async errors. |
| 6 | **Problem Modeling** | `server/models/Project.js`, `server/models/Task.js`, `server/utils/constants.js`, `server/services/taskStatsService.js` | Explain entities: Project owns metadata; Task belongs to one Project via ObjectId; statuses/priorities are enums; progress is derived from task counts. |
| 7 | **RESTful Endpoint Design** | `server/routes/projectRoutes.js`, `taskRoutes.js`, `dashboardRoutes.js`, `aiRoutes.js` | Walk through `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`, the equivalent task routes and `GET /api/dashboard/stats`. |
| 8 | **Server-side Error Handling** | `server/middleware/errorHandler.js`, `server/utils/ApiError.js`, `server/middleware/asyncHandler.js` | Send malformed JSON and an invalid ObjectId; show the normalized JSON error response and appropriate status code. |
| 9 | **System Design Basics** | `client/`, `server/`, `server/config/db.js`, `server/services/aiService.js`, `README.md` | Use the architecture diagram above: React client → Express REST API → MongoDB/Mongoose and LLM provider, with health/configuration feedback. |
| 10 | **Environment Variables** | `server/config/env.js`, `.env.example`, `.gitignore` | Show `server/.env` (not committed) supplying `MONGODB_URI`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `PORT`, `CLIENT_ORIGIN`; show `.env.example` as the committed template. |
| 11 | **Git Workflow** | Repository history | Show feature branches and meaningful commits (see [Git workflow](#git-workflow)). |

### Frontend and JavaScript

| # | Concept | File(s) | Demonstration |
| --- | --- | --- | --- |
| 12 | **Async Data Fetching** | `client/src/services/api.js`, `client/src/hooks/useSystemHealth.js`, all pages | Open DevTools Network and reload the dashboard. Show `/api/dashboard/stats` and `/api/health` requests. `api.js` wraps `fetch`, JSON parsing, timeouts and errors; pages handle loading/empty/error states. |
| 13 | **Client-side Routing** | `client/src/App.jsx`, `client/src/main.jsx`, `client/src/components/Sidebar.jsx` | Click Dashboard → Projects → project details → Tasks → AI Planner → Assistant → JS Lab. Deep-link `/projects/:id` and show the 404 page. |
| 14 | **JavaScript Async/Await** | `client/src/services/api.js`, `server/controllers/*.js`, `client/src/pages/*.jsx` | Show `async function request(...) { const response = await fetch(...); }`, `await createProject(...)`, and `try/catch/finally` blocks in form submissions. |
| 15 | **JavaScript Closures** | `client/src/utils/jsConceptsDemo.js`, used by `client/src/pages/ProjectDetails.jsx` | Open **JS Lab → Closures**. Click priority chips to run `createTaskFilter`, then use the private counter. Point out that the returned filter still sees captured criteria after the factory returns. |
| 16 | **JavaScript Event Loop** | `client/src/utils/jsConceptsDemo.js` (`runEventLoopDemo`), `client/src/pages/JsLab.jsx` | Open **JS Lab → Event Loop** and click **Run event loop demo**. The real order is sync start → sync end → Promise microtask → `setTimeout` macrotask, with timestamps. |
| 17 | **JavaScript Hoisting** | `client/src/utils/jsConceptsDemo.js` (`runHoistingDemo`), `client/src/pages/JsLab.jsx` | Open **JS Lab → Hoisting** and click run. Output shows `var` as `undefined` before assignment, a function declaration callable early, a function expression failing early, and the `let` TDZ error. |
| 18 | **JavaScript Promises vs Callbacks** | `client/src/utils/jsConceptsDemo.js` (`fetchTasksWithCallback`, `fetchTasksWithPromise`, `promisifyCallback`, `runCallbacksDemo`, `runPromisesDemo`), `client/src/pages/JsLab.jsx` | Open **JS Lab → Promises vs Callbacks** and run the demo. Show the error-first callback path, the async/await promise path and the promisified callback path. |
| 19 | **React Component Composition** | `client/src/components/` (Sidebar, Navbar, TaskCard, ProjectCard, Modal, StatCard, etc.), `client/src/layouts/AppLayout.jsx` | Show `AppLayout` composing Sidebar + Navbar + HealthBanner + `<Outlet />`. Show `ProjectFormModal`/`TaskFormModal` composing `Modal`, `ErrorAlert`, `Spinner` and form fields. |
| 20 | **useEffect** | `client/src/pages/Dashboard.jsx`, `client/src/hooks/useSystemHealth.js`, `client/src/pages/Tasks.jsx`, `client/src/pages/ProjectDetails.jsx` | Dashboard runs `useEffect` on mount/refresh, fetches stats, aborts on unmount. Health status loads on mount and can be refreshed from the configuration banner. Task/project pages refetch when filters or `refreshKey` change. |
| 21 | **useState** | Forms, filters, modals and AI pages | Open a project/task modal, type, change filters, open/close modals, generate an AI plan, send a chat message, toggle a generated task. All are `useState`-driven. |
| 22 | **MongoDB CRUD Operations** | `server/controllers/projectController.js`, `taskController.js`, `server/models/*.js` | Create a project → edit it → add a task → mark it complete → drag it on the Kanban → delete the task → delete the project. Confirm each step in the UI and through `/api/projects` / `/api/tasks`. Project deletion cascades tasks. |
| 23 | **MongoDB Schema Modeling** | `server/models/Project.js`, `server/models/Task.js` | Show field types, required/min/max validation, enums, timestamps, indexes, the `Task.project` ObjectId reference, the Project `tasks` virtual, and the `pre('findOneAndDelete')` cascade hook. |

---

## Git workflow

The repository uses a small feature-branch workflow. Example commands:

```bash
# Initialize (already done for this project)
git init
git add .
git commit -m "chore: bootstrap DevPilot AI workspace"

# Work on a feature
git checkout -b feature/project-crud
git add server client
git commit -m "feat(projects): add validated project CRUD and cascade delete"
git checkout master
git merge --no-ff feature/project-crud

# Continue with the next slice
git checkout -b feature/ai-planner
git commit -am "feat(ai): add structured plan generation, validation and save flow"
git checkout master
git merge --no-ff feature/ai-planner
```

Suggested branch slices used by this build:

- `feature/backend-foundation` — env, database, models, middleware, routes.
- `feature/project-task-crud` — project/task controllers, validation, cascade delete, dashboard stats.
- `feature/ai-integration` — AI service, prompts, plan validation, save-plan.
- `feature/react-dashboard` — layout, design system, dashboard, projects, tasks.
- `feature/ai-frontend` — AI Planner, Assistant, JS Lab.
- `docs/readme` — documentation and concept checklist.

Meaningful commit message prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `chore:`.

---

## Verification performed

The build was verified end to end:

- Express API boots with MongoDB connected; `/api/health` reports database and AI status.
- Project and task CRUD verified through the UI and curl: create, read, update, status move, delete.
- Project deletion verified to cascade and remove associated tasks.
- AI plan generation verified with an OpenAI-compatible mock provider: preview, selection, save to MongoDB, project + 3 tasks created, then cleanup.
- Assistant chat verified: user message, streamed-style loading state, markdown/code rendering, message counter, session history and clear conversation.
- Malformed AI JSON verified to return `502`; missing AI configuration verified to return `503`.
- Kanban drag-and-drop verified to persist the new status to the API.
- No browser console or runtime errors across all routes.
- `vite build` succeeds; Express serves the built client for production-style use.
- Automated headless Chrome checks passed for CRUD, cascade delete, AI planner save and assistant chat.

---

## Troubleshooting

### “API offline” in the navbar

- Confirm the server is running on `PORT` (default `5000`).
- Check `curl http://localhost:5000/api/health`.
- Confirm the Vite proxy target matches the server port.

### “MongoDB is not connected” / `503 DATABASE_NOT_CONFIGURED`

- Start MongoDB locally or fix `MONGODB_URI`.
- For Atlas, verify the user, password, IP allowlist and database name.
- The server retries every 15 seconds; watch the server logs for `MongoDB connection restored`.

### “AI features are not configured” / `503 AI_NOT_CONFIGURED`

- Set `AI_API_KEY` in `server/.env`.
- Confirm `AI_BASE_URL` ends with `/v1` (or the provider's equivalent base path).
- Restart the server after changing `.env`.

### `502` from the AI planner

- The provider returned non-JSON or an upstream error.
- Check the server log for the provider status/message.
- Try a model with reliable JSON output, or lower the prompt complexity.

### Vite proxy / CORS errors

- Set `CLIENT_ORIGIN=http://localhost:5173` for development.
- If you use another dev port, add it to `CLIENT_ORIGIN` (comma-separated).
- In production, the Express server serves the built client, so CORS is only relevant for separate origins.

### Port already in use

```bash
# Find the process
lsof -i :5000
# or change PORT in server/.env
```

### Production deep links return 404

Run the built app through Express (`npm run build && npm start`). `server/server.js` serves `client/dist/index.html` for non-API routes, so React Router handles deep links.

---

## Academic note

This project intentionally keeps the four pure-JavaScript demonstrations in one dedicated, commented file (`client/src/utils/jsConceptsDemo.js`) as required, while the remaining concepts are implemented in the real application code rather than only described in documentation. The **JavaScript Lab** page makes the four JavaScript demonstrations executable and observable in the browser.
