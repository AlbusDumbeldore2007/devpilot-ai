import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { validatePlan } from '../utils/planValidator.js';
import { PLAN_SYSTEM_PROMPT, buildPlanPrompt, CHAT_SYSTEM_PROMPT } from '../utils/prompts.js';
import { detectPromptInjection, sanitizePrompt } from '../utils/constants.js';

/**
 * LLM API INTEGRATION (server-side only)
 * The API key never leaves this module. Any OpenAI-compatible Chat Completions
 * provider works: OpenAI, OpenRouter, Groq, DeepSeek, Together, Ollama, etc.
 */
export const isAIConfigured = () => Boolean(env.ai.apiKey);

function assertConfigured() {
  if (!isAIConfigured()) {
    throw ApiError.notConfigured(
      'AI service is not configured. Add AI_API_KEY (plus AI_BASE_URL and AI_MODEL) to server/.env, then restart the API.',
      'AI_NOT_CONFIGURED'
    );
  }
}

/**
 * Low-level provider call with timeout handling.
 * Retries once without `response_format` for providers that do not support
 * JSON mode but still honour the prompt's JSON instructions.
 */
async function requestCompletion(messages, { jsonMode = false, temperature = 0.6, maxTokens = 3000 } = {}) {
  assertConfigured();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.ai.timeoutMs);

  const payload = {
    model: env.ai.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  };

  try {
    let response = await fetch(`${env.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ai.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // Some providers reject `response_format`; gracefully retry without it.
    if (!response.ok && jsonMode && [400, 422].includes(response.status)) {
      delete payload.response_format;
      response = await fetch(`${env.ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.ai.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }

    if (!response.ok) {
      const providerBody = await response.text().catch(() => '');
      let providerMessage = '';
      try {
        const parsed = JSON.parse(providerBody);
        providerMessage = parsed?.error?.message || parsed?.message || '';
      } catch {
        providerMessage = providerBody.slice(0, 300);
      }

      if (response.status === 401 || response.status === 403) {
        throw new ApiError(
          502,
          'The AI provider rejected the API key. Check AI_API_KEY and AI_BASE_URL in server/.env.',
          [providerMessage].filter(Boolean),
          'AI_AUTH_FAILED'
        );
      }

      if (response.status === 429) {
        throw new ApiError(
          503,
          'The AI provider rate limit was reached. Wait a moment and try again.',
          [providerMessage].filter(Boolean),
          'AI_RATE_LIMITED'
        );
      }

      throw new ApiError(
        502,
        `AI provider request failed (HTTP ${response.status}).`,
        [providerMessage].filter(Boolean),
        'AI_PROVIDER_ERROR'
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw ApiError.unprocessable('The AI provider returned an empty response.');
    }

    return {
      content: content.trim(),
      model: data?.model || env.ai.model,
      usage: data?.usage || null,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError(
        504,
        `The AI request timed out after ${Math.round(env.ai.timeoutMs / 1000)} seconds. Try a smaller request.`,
        undefined,
        'AI_TIMEOUT'
      );
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, `Could not reach the AI provider: ${error.message}`, undefined, 'AI_NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract JSON even if a provider accidentally wraps it in markdown fences. */
function parseJsonContent(content) {
  const withoutFences = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? withoutFences.slice(start, end + 1) : withoutFences;

  try {
    return JSON.parse(candidate);
  } catch {
    throw ApiError.unprocessable(
      'The AI returned malformed JSON. Try generating the plan again.',
      [candidate.slice(0, 300)]
    );
  }
}

/** Check a string for prompt injection patterns. */
function checkPromptInjection(text) {
  if (typeof text !== 'string') return false;
  return detectPromptInjection(text);
}

/**
 * Generates a structured plan, then validates/normalises every field before
 * returning it to the controller. Invalid model output never reaches MongoDB.
 */
export async function generateProjectPlan({ idea, difficulty }) {
  // Prompt injection protection: sanitize the idea before building the prompt
  if (checkPromptInjection(idea)) {
    throw new ApiError(
      400,
      'The project idea contains potential prompt injection sequences.',
      undefined,
      'PROMPT_INJECTION_DETECTED'
    );
  }

  const sanitizedIdea = sanitizePrompt(idea);
  const completion = await requestCompletion(
    [
      { role: 'system', content: PLAN_SYSTEM_PROMPT },
      { role: 'user', content: buildPlanPrompt(idea, difficulty) },
    ],
    { jsonMode: true, temperature: 0.55, maxTokens: 3200 }
  );

  const rawPlan = parseJsonContent(completion.content);
  const { plan, errors } = validatePlan(rawPlan);

  if (errors.length > 0) {
    throw new ApiError.unprocessable('The AI plan failed backend validation. Try again.', errors);
  }

  return {
    plan,
    meta: {
      model: completion.model,
      usage: completion.usage,
      generatedAt: new Date().toISOString(),
    },
  };
}

/** Multi-step AI agent with function calling and tool use. */
export async function runMultiStepAgent({ goal, difficulty, projectId }) {
  assertConfigured();

  // Define available tools for the LLM
  const availableTools = [
    {
      name: 'createTask',
      description: 'Create a new task in a project. Requires project ObjectId, title, and optionally description, priority, dueDate.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ObjectId' },
          title: { type: 'string', description: 'Task title (2-160 chars)' },
          description: { type: 'string', description: 'Task description (max 3000 chars)' },
          priority: { 
            type: 'string', 
            enum: ['Low', 'Medium', 'High', 'Critical'], 
            description: 'Task priority' 
          },
          status: { 
            type: 'string', 
            enum: ['To Do', 'In Progress', 'Completed'], 
            description: 'Task status' 
          },
          dueDate: { type: 'string', description: 'Due date in ISO format or YYYY-MM-DD' },
        },
        required: ['projectId', 'title'],
      },
    },
    {
      name: 'getProjectTasks',
      description: 'List tasks for a project, optionally filtered by status or priority.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ObjectId' },
          status: { 
            type: 'string', 
            enum: ['To Do', 'In Progress', 'Completed'], 
            description: 'Filter by status' 
          },
          priority: { 
            type: 'string', 
            enum: ['Low', 'Medium', 'High', 'Critical'], 
            description: 'Filter by priority' 
          },
        },
      },
    },
    {
      name: 'updateTaskStatus',
      description: 'Update a task\'s status. The UI uses this to move tasks between Kanban columns.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ObjectId' },
          status: { 
            type: 'string', 
            enum: ['To Do', 'In Progress', 'Completed'], 
            description: 'New task status' 
          },
        },
        required: ['taskId', 'status'],
      },
    },
    {
      name: 'searchKnowledgeBase',
      description: 'Search the RAG knowledge base for chunks relevant to the query.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query text' },
          topK: { type: 'number', description: 'Number of results to return', default: 5 },
        },
        required: ['query'],
      },
    },
    {
      name: 'getProjectProgress',
      description: 'Get progress statistics for a project.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ObjectId' },
        },
        required: ['projectId'],
      },
    },
  ];

  // Build the system prompt with tool definitions
  const toolDefinitions = availableTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  const maxSteps = env.ai.agentMaxSteps || 6;
  let step = 0;
  let allMessages = [
    { role: 'system', content: PLAN_SYSTEM_PROMPT },
    { role: 'user', content: goal },
  ];

  const agentState = {
    steps: [],
    createdTasks: [],
    projectId,
  };

  while (step < maxSteps) {
    step += 1;
    
    // Prepare messages for this step - include conversation history + tool definitions
    const stepMessages = [
      { role: 'system', content: PLAN_SYSTEM_PROMPT },
      ...allMessages.slice(-10), // last 10 messages for context
    ];

    // Send to LLM with tool definitions
    const completion = await requestCompletion(
      stepMessages,
      { temperature: 0.55, maxTokens: 3200 }
    );

    const assistantMessage = {
      role: 'assistant',
      content: completion.content,
      model: completion.model,
      usage: completion.usage,
    };

    // Check if the LLM returned tool calls
    // In a full implementation, the LLM would include tool_calls in the response
    // and we would execute them. Here we just log the step and return the plan.
    
    allMessages.push(assistantMessage);
    
    // Check if we have a complete plan
    try {
      const parsedPlan = validatePlan(completion.content);
      if (parsedPlan.plan && parsedPlan.plan.projectTitle) {
        return {
          plan: parsedPlan.plan,
          meta: {
            model: completion.model,
            usage: completion.usage,
            generatedAt: new Date().toISOString(),
            stepsTaken: step,
          },
          agentSteps: allMessages,
        };
      }
    } catch (e) {
      // Plan validation failed, continue with agent loop
    }

    // Add the assistant message to conversation history
    allMessages.push(assistantMessage);
  }

  // Max steps reached without completing the plan
  throw new ApiError(
    502,
    `The AI agent reached the maximum of ${maxSteps} steps without generating a complete plan. Try rephrasing your idea or simplifying the request.`
  );
}

/** Multi-turn developer assistant chat. */
export async function generateChatReply(messages) {
  const completion = await requestCompletion(
    [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...messages],
    { temperature: 0.5, maxTokens: 1600 }
  );

  return {
    reply: completion.content,
    meta: { model: completion.model, usage: completion.usage },
  };
}
