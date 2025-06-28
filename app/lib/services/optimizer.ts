import { request } from '~/lib/fetch';
import { SERVER_LOCATION } from '~/lib/config';

const API_BASE_URL = SERVER_LOCATION;

function createSecureFetch(userId: string) {
  //TODO FIXME
  //test userID for dev
  userId = '22c3d153c7f536d80c3c384fb6ddc93c';

  return async (method: string, endpoint: string, body?: any) => {
    console.log(`[API] Request: ${method} ${endpoint}`);
    console.log(`[API] User ID: ${userId}`);

    const url = `${API_BASE_URL}${endpoint}`;
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${userId}`,
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
      console.log('[API] Body:', body);
    }

    return request(url, options);
  };
}

export type ProjectDetailTask = {
  id: string;
  name: string;
  description: string | null;
};

export type ProjectDetail = {
  id: number;
  name: string;
  description: string | null;
  code: boolean;
  created_at: string;
  tasks: ProjectDetailTask[];
};

export type OverviewAnalytics = {
  initial_accuracy: number;
  current_accuracy: number;
  task_scores: Array<{
    task_id: string;
    initial_accuracy: number;
    current_accuracy: number;
  }>;
};

export type Task = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  any_events: boolean;
  any_experimental_events: boolean;
};

export type Project = {
  id: number;
  name: string;
  description: string | null;
  code: boolean;
  created_at?: string;
  tasks: Task[];
};

export type Prompt = {
  id: string;
  text: string;
  model_name: string;
  temperature: number;
  created_at: string;
  active: boolean;
};

export type Evaluation = {
  id: string;
  name: string;
  text: string;
  creator: 'system' | 'user';
  created_at: string;
  active: boolean;
};

export type ManualInput = {
  id: string;
  inputs: Record<string, string>;
  created_at: string;
};

export type EvaluateEvent = {
  event_id: string;
  input_id: string;
  prompt_id: string;
  response: string;
  score: number | string;
  score_explained: string | null;
};

export type EvaluateResults = {
  run_id: string;
  status: 'running' | 'completed' | 'failed';
  events: EvaluateEvent[];
};

export type OptimizeEvent = {
  event_id: string;
  input_id: string;
  prompt_id: string;
  matching_event_id?: string;
  response: string;
  score: number | string;
  score_explained?: {
    extracted_completeness: number;
    extracted_completeness_reasoning: string;
    extracted_value: number;
    extracted_value_reasoning: string;
  };
};

type OptimizePrompt = {
  prompt_id: string;
  text: string;
  model_name: string;
  temperature: number;
  created_at: string;
  summary: string;
};

export type OptimizeResults = {
  run_id: string;
  status: 'generating_prompt' | 'evaluating_prompt' | 'running' | 'completed' | 'failed';
  prompt?: OptimizePrompt;
  events?: OptimizeEvent[];
  num_expected_events?: number;
  summary?: string;
};

export type Model = {
  name: string;
  provider: string;
  model_type: string;
  available_for_evals: boolean;
};

export async function getProjectDetails(userId: string): Promise<ProjectDetail[] | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('GET', '/api/projects/details/');

    if (!response.ok) {
      return null;
    }

    const results = (await response.json()) as { projects: ProjectDetail[] };

    return results.projects;
  } catch (error) {
    console.error('Error fetching projects', error);
    return null;
  }
}

export async function createProject(
  userId: string,
  name: string,
  description: string | null,
): Promise<{ projectId: number } | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', '/api/projects/', {
      name,
      description,
    });

    if (!response.ok) {
      return null;
    }

    const arrayResult = (await response.json()) as { project_id: number }[];

    if (arrayResult.length === 0) {
      return null;
    }

    const result = arrayResult[0];
    const { project_id: projectId } = result;

    return { projectId };
  } catch (error) {
    console.error('Error creating project', error);
    return null;
  }
}

export async function createTask(
  userId: string,
  projectId: string,
  name: string,
  description: string | null,
): Promise<{ taskId: string } | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', '/api/tasks/', {
      projectId,
      name,
      description,
    });

    if (!response.ok) {
      return null;
    }

    const { task_id: taskId } = (await response.json()) as { task_id: string };

    return { taskId };
  } catch (error) {
    console.error('Error creating task', error);
    return null;
  }
}

export async function getProject(userId: string, projectId: string): Promise<Project | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('GET', '/api/projects/' + projectId);

    if (!response.ok) {
      return null;
    }

    const project = (await response.json()) as Project;

    return project;
  } catch (error) {
    console.error('Error fetching project', error);
    return null;
  }
}

export async function getTask(userId: string, taskId: string): Promise<Task | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('GET', '/api/tasks/' + taskId);

    if (!response.ok) {
      return null;
    }

    const task = (await response.json()) as Task;

    return task;
  } catch (error) {
    console.error('Error fetching task', error);
    return null;
  }
}

export async function updateTask(
  userId: string,
  taskId: string,
  name: string,
  description: string | null,
): Promise<Task | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('PUT', '/api/tasks/' + taskId, {
      name,
      description,
    });

    if (!response.ok) {
      return null;
    }

    const task = (await response.json()) as Task;

    return task;
  } catch (error) {
    console.error('Error updating task', error);
    return null;
  }
}

export async function getPromptsForTask(userId: string, taskId: string): Promise<Prompt[] | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('GET', `/api/tasks/${taskId}/prompts/`);

    if (!response.ok) {
      return null;
    }

    const prompts = (await response.json()) as { prompts: Prompt[] };

    return prompts.prompts;
  } catch (error) {
    console.error('Error fetching prompts', error);
    return null;
  }
}

export async function createPromptForTask(
  userId: string,
  taskId: string,
  promptText: string,
  modelName: string,
  temperature: number,
): Promise<Prompt | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/prompts/`, {
      taskId,
      promptText,
      modelName,
      temperature,
    });

    if (!response.ok) {
      return null;
    }

    const prompt = (await response.json()) as Prompt;

    return prompt;
  } catch (error) {
    console.error('Error saving prompt', error);
    return null;
  }
}

export async function getEvalsAvailableForTask(userId: string, taskId: string): Promise<Evaluation[] | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('GET', `/api/tasks/${taskId}/list_all_evals/`);

    if (!response.ok) {
      return null;
    }

    const evals = (await response.json()) as { evals: Evaluation[] };

    return evals.evals;
  } catch (error) {
    console.error('Error fetching evaluations', error);
    return null;
  }
}

export async function setEvalAvailableForTask(userId: string, taskId: string, evalId: string, isActive: boolean) {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('PUT', `/api/tasks/${taskId}/evals/${evalId}/active/`, {
      isActive,
    });

    if (!response.ok) {
      return null;
    }

    const evaluation = (await response.json()) as Evaluation;

    return evaluation;
  } catch (error) {
    console.error('Error updating evaluation', error);
    return null;
  }
}

export async function createEvalForTask(
  userId: string,
  taskId: string,
  name: string,
  text: string,
): Promise<Evaluation | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/evals/`, {
      name,
      text,
    });

    if (!response.ok) {
      return null;
    }

    const evaluation = (await response.json()) as Evaluation;

    return evaluation;
  } catch (error) {
    console.error('Error saving evaluation', error);
    return null;
  }
}

export async function getManualInputsForTask(userId: string, taskId: string): Promise<ManualInput[] | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('GET', `/api/tasks/${taskId}/test_inputs/`);

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { inputs: ManualInput[] };

    return result.inputs;
  } catch (error) {
    console.error('Error fetching inputs', error);
    return null;
  }
}

export async function createManualInputForTask(
  userId: string,
  taskId: string,
  inputs: Record<string, string>,
): Promise<{ id: string } | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/test_inputs/`, {
      inputs,
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { id: string };

    return result;
  } catch (error) {
    console.error('Error saving input', error);
    return null;
  }
}

export async function evaluateExperiment(
  userId: string,
  userApiKey: string,
  taskId: string,
  promptIds: string[],
  testInputIds: string[],
  evalIds: string[],
): Promise<{ run_id: string } | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/test_inputs/evaluate/`, {
      userApiKey,
      promptIds,
      testInputIds,
      evalIds,
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { run_id: string };

    return result;
  } catch (error) {
    console.error('Error starting evaluate run', error);
    return null;
  }
}

export async function getResultsOfEvaluateRun(
  userId: string,
  taskId: string,
  runId: string,
): Promise<EvaluateResults | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/test_inputs/evaluate/${runId}`);

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as EvaluateResults;

    return result;
  } catch (error) {
    console.error('Error getting evaluate results', error);
    return null;
  }
}

export async function runOptimization(
  userId: string,
  userApiKey: string,
  taskId: string,
  optimizeType: 'experiment' | 'live',
  eventIds: string[],
  evalIds: string[],
): Promise<{ run_id: string } | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/events/optimize/`, {
      userApiKey,
      optimizeType,
      eventIds,
      evalIds,
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { run_id: string };

    return result;
  } catch (error) {
    console.error('Error starting optimization run', error);
    return null;
  }
}

export async function getResultsOfOptimizeRun(
  userId: string,
  taskId: string,
  runId: string,
): Promise<OptimizeResults | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/events/optimize/${runId}`);

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as OptimizeResults;

    return result;
  } catch (error) {
    console.error('Error getting optimize results', error);
    return null;
  }
}

export async function getOverallStats(userId: string): Promise<OverviewAnalytics | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('GET', '/api/projects/stats/');

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as OverviewAnalytics;

    return result;
  } catch (error) {
    console.error('Error fetching Overview Analytics', error);
    return null;
  }
}

export async function getModels(userId: string): Promise<Model[] | null> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('GET', '/api/models/');

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as { models: Model[] };

    return result.models;
  } catch (error) {
    console.error('Error fetching models', error);
    return null;
  }
}

export async function deleteProject(userId: string, projectId: number): Promise<boolean> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/projects/${projectId}/delete/`);

    return response.ok;
  } catch (error) {
    console.error('Error deleting project', error);
    return false;
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/delete_task/`);

    return response.ok;
  } catch (error) {
    console.error('Error deleting task', error);
    return false;
  }
}

export async function deletePrompt(userId: string, taskId: string, promptId: string): Promise<boolean> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/delete_prompt/`, {
      promptId,
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting prompt', error);
    return false;
  }
}

export async function deleteEval(userId: string, taskId: string, evalId: string): Promise<boolean> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/delete_eval/`, {
      evalId,
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting eval', error);
    return false;
  }
}

export async function deleteInput(userId: string, taskId: string, inputId: string): Promise<boolean> {
  try {
    const secureFetch = createSecureFetch(userId);
    const response = await secureFetch('POST', `/api/tasks/${taskId}/delete_input/`, {
      inputId,
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting input', error);
    return false;
  }
}
