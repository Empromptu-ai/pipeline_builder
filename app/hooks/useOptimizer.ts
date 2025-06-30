import { useState, useEffect } from 'react';
import { useUser } from '~/hooks/useUser';
import * as optimizerService from '~/lib/services/optimizer';
import { ENABLE_MOCK_DATA } from '~/lib/config';

const mockProjects: optimizerService.ProjectDetail[] = [
  {
    id: 1,
    name: 'Chatbots',
    description: 'AI-powered chatbot optimization',
    code: true,
    created_at: '2024-01-01T00:00:00Z',
    tasks: [
      {
        id: 'travel-chatbot',
        name: 'Travel_Chatbot',
        description: 'Optimize travel booking chatbot responses',
      },
    ],
  },
  {
    id: 2,
    name: 'Data Extraction',
    description: 'Extract structured data from documents',
    code: false,
    created_at: '2024-01-02T00:00:00Z',
    tasks: [
      {
        id: 'data-extraction',
        name: 'Data Extraction Task',
        description: 'Extract structured data from unstructured documents',
      },
    ],
  },
];

export function useProjectList() {
  const user = useUser();
  const [data, setData] = useState<optimizerService.ProjectDetail[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        console.log('ENABLE_MOCK_DATA', ENABLE_MOCK_DATA);

        if (ENABLE_MOCK_DATA) {
          setData(mockProjects);
          setError(null);
        } else {
          const projects = await optimizerService.getProjectDetails(user.uid);
          setData(projects);
          setError(null);
        }
      } catch (err) {
        if (ENABLE_MOCK_DATA) {
          setData(mockProjects);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch projects');
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user.uid]);

  return {
    query: {
      data,
      isLoading,
      error,
    },
    refetch: () => {
      const fetchProjects = async () => {
        try {
          setIsLoading(true);

          if (ENABLE_MOCK_DATA) {
            setData(mockProjects);
            setError(null);
          } else {
            const projects = await optimizerService.getProjectDetails(user.uid);
            setData(projects);
            setError(null);
          }
        } catch (err) {
          if (ENABLE_MOCK_DATA) {
            setData(mockProjects);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects');
            setData(null);
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchProjects();
    },
  };
}

export function useProject(projectId: string | undefined) {
  const user = useUser();
  const [data, setData] = useState<optimizerService.Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setData(null);
      setIsLoading(false);

      return;
    }

    const fetchProject = async () => {
      try {
        setIsLoading(true);

        const project = await optimizerService.getProject(user.uid, projectId);
        setData(project);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch project');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [user.uid, projectId]);

  return {
    data,
    isLoading,
    error,
  };
}

export function useTask(taskId: string | undefined) {
  const user = useUser();
  const [data, setData] = useState<optimizerService.Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setData(null);
      setIsLoading(false);

      return;
    }

    const fetchTask = async () => {
      try {
        setIsLoading(true);

        const task = await optimizerService.getTask(user.uid, taskId);
        setData(task);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch task');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [user.uid, taskId]);

  return {
    data,
    isLoading,
    error,
  };
}

const mockAnalytics: optimizerService.OverviewAnalytics = {
  initial_accuracy: 91,
  current_accuracy: 97,
  task_scores: [
    {
      task_id: 'travel-chatbot',
      initial_accuracy: 87,
      current_accuracy: 98.18,
    },
    {
      task_id: 'data-extraction',
      initial_accuracy: 95,
      current_accuracy: 96,
    },
  ],
};

export function useOverallStats() {
  const user = useUser();
  const [data, setData] = useState<optimizerService.OverviewAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        if (ENABLE_MOCK_DATA) {
          setData(mockAnalytics);
          setError(null);
        } else {
          const stats = await optimizerService.getOverallStats(user.uid);
          setData(stats);
          setError(null);
        }
      } catch (err) {
        if (ENABLE_MOCK_DATA) {
          setData(mockAnalytics);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user.uid]);

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      const fetchStats = async () => {
        try {
          setIsLoading(true);

          if (ENABLE_MOCK_DATA) {
            setData(mockAnalytics);
            setError(null);
          } else {
            const stats = await optimizerService.getOverallStats(user.uid);
            setData(stats);
            setError(null);
          }
        } catch (err) {
          if (ENABLE_MOCK_DATA) {
            setData(mockAnalytics);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
            setData(null);
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchStats();
    },
  };
}

export function usePrompts(taskId: string | undefined) {
  const user = useUser();
  const [data, setData] = useState<optimizerService.Prompt[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setData(null);
      setIsLoading(false);

      return;
    }

    const fetchPrompts = async () => {
      try {
        setIsLoading(true);

        const prompts = await optimizerService.getPromptsForTask(user.uid, taskId);
        setData(prompts);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch prompts');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, [user.uid, taskId]);

  return {
    data,
    isLoading,
    error,
  };
}

export function useEvaluations(taskId: string | undefined) {
  const user = useUser();
  const [data, setData] = useState<optimizerService.Evaluation[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setData(null);
      setIsLoading(false);

      return;
    }

    const fetchEvaluations = async () => {
      try {
        setIsLoading(true);

        const evaluations = await optimizerService.getEvalsAvailableForTask(user.uid, taskId);
        setData(evaluations);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch evaluations');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluations();
  }, [user.uid, taskId]);

  return {
    data,
    isLoading,
    error,
  };
}

export function useManualInputs(taskId: string | undefined) {
  const user = useUser();
  const [data, setData] = useState<optimizerService.ManualInput[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInputs = async () => {
    if (!taskId) {
      setData(null);
      setIsLoading(false);

      return;
    }

    try {
      setIsLoading(true);

      const inputs = await optimizerService.getManualInputsForTask(user.uid, taskId);
      setData(inputs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inputs');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInputs();
  }, [user.uid, taskId]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchInputs,
  };
}

export function useCreateProject() {
  const user = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (name: string, description: string | null) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await optimizerService.createProject(user.uid, name, description);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createProject,
    isLoading,
    error,
  };
}

export function useCreateTask() {
  const user = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = async (projectId: string, name: string, description: string | null) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await optimizerService.createTask(user.uid, projectId, name, description);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createTask,
    isLoading,
    error,
  };
}

export function useRecentEvents(taskId: string | undefined) {
  const user = useUser();
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setData(null);
      setIsLoading(false);

      return;
    }

    const fetchRecentEvents = async () => {
      try {
        setIsLoading(true);

        const events = await optimizerService.getRecentEventsForTask(user.uid, taskId);
        setData(events);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch recent events');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentEvents();
  }, [user.uid, taskId]);

  return {
    data,
    isLoading,
    error,
  };
}

export function useOptimization() {
  const user = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOptimization = async (
    taskId: string,
    optimizeType: 'experiment' | 'live',
    eventIds: string[],
    evalIds: string[],
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await optimizerService.runOptimization(
        user.uid,
        user.apiKey,
        taskId,
        optimizeType,
        eventIds,
        evalIds,
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run optimization';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getOptimizationResults = async (taskId: string, runId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await optimizerService.getResultsOfOptimizeRun(user.uid, taskId, runId);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get optimization results';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    runOptimization,
    getOptimizationResults,
    isLoading,
    error,
  };
}
