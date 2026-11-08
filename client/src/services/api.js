/**
 * Central API client.
 * Every request goes through one function so loading/error semantics are
 * consistent across the app. The backend is the only holder of the LLM key.
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, details, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details || [];
    this.code = code;
  }
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the API server. Is the Express backend running?', 0);
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}.`,
      response.status,
      payload?.details,
      payload?.code
    );
  }

  return payload;
}

const encodeId = (id) => encodeURIComponent(id);

export const systemApi = {
  health: () => request('/health'),
};

export const dashboardApi = {
  stats: (options = {}) => request('/dashboard/stats', options),
};

export const projectsApi = {
  list: (params = {}, options = {}) => request(`/projects${buildQuery(params)}`, options),
  get: (id, options = {}) => request(`/projects/${encodeId(id)}`, options),
  create: (data) => request('/projects', { method: 'POST', body: data }),
  update: (id, data) => request(`/projects/${encodeId(id)}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/projects/${encodeId(id)}`, { method: 'DELETE' }),
};

export const tasksApi = {
  list: (params = {}, options = {}) => request(`/tasks${buildQuery(params)}`, options),
  get: (id, options = {}) => request(`/tasks/${encodeId(id)}`, options),
  create: (data) => request('/tasks', { method: 'POST', body: data }),
  update: (id, data) => request(`/tasks/${encodeId(id)}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/tasks/${encodeId(id)}`, { method: 'DELETE' }),
};

export const aiApi = {
  generatePlan: (data) => request('/ai/generate-plan', { method: 'POST', body: data }),
  chat: (messages) => request('/ai/chat', { method: 'POST', body: { messages } }),
  savePlan: (data) => request('/ai/save-plan', { method: 'POST', body: data }),
};

export const isAbortError = (error) => error?.name === 'AbortError';
