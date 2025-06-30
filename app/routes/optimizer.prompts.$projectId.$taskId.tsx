import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@remix-run/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { useUser } from '~/hooks/useUser';
import {
  getProject,
  getTask,
  getPromptsForTask,
  getEvalsAvailableForTask,
  getManualInputsForTask,
  createPromptForTask,
  createEvalForTask,
  createManualInputForTask,
  getModels,
  type Project,
  type Task,
  type Prompt,
  type Evaluation,
  type ManualInput,
  type Model,
} from '~/lib/services/optimizer';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PromptFamily from '~/components/prompts/PromptFamily';
import ManualPromptOptimization from '~/components/prompts/ManualPromptOptimization';
import AutomaticPromptOptimization from '~/components/prompts/AutomaticPromptOptimization';
import CreatePromptDialog from '~/components/prompts/CreatePromptDialog';
import CreateEvaluationDialog from '~/components/prompts/CreateEvaluationDialog';
import CreateInputDialog from '~/components/prompts/CreateInputDialog';

export default function PromptOptimization() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { uid: userId } = useUser();

  const [project, setProject] = useState<Project | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [inputs, setInputs] = useState<ManualInput[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  const [createPromptOpen, setCreatePromptOpen] = useState(false);
  const [createEvalOpen, setCreateEvalOpen] = useState(false);
  const [createInputOpen, setCreateInputOpen] = useState(false);

  const extractVarNames = (promptText: string): string[] => {
    const matches = promptText.match(/\{(\w+)\}/g);
    return matches ? matches.map((match) => match.slice(1, -1)) : [];
  };

  const varNames = prompts.length > 0 ? extractVarNames(prompts[0].text) : ['input'];

  useEffect(() => {
    const decodedProjectId = projectId ? decodeURIComponent(projectId) : projectId;
    const decodedTaskId = taskId ? decodeURIComponent(taskId) : taskId;

    const fetchData = async () => {
      if (!decodedProjectId || !decodedTaskId || !userId) {
        return;
      }

      try {
        setLoading(true);

        const startTime = Date.now();

        const [projectData, taskData, promptsData, evaluationsData, inputsData, modelsData] = await Promise.all([
          getProject(userId, decodedProjectId),
          getTask(userId, decodedTaskId),
          getPromptsForTask(userId, decodedTaskId),
          getEvalsAvailableForTask(userId, decodedTaskId),
          getManualInputsForTask(userId, decodedTaskId),
          getModels(userId),
        ]);

        const endTime = Date.now();

        setProject(projectData);
        setTask(taskData);
        setPrompts(promptsData || []);
        setEvaluations(evaluationsData || []);
        setInputs(inputsData || []);
        setModels(modelsData || []);
      } catch (error) {
        console.error('Error fetching full page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, taskId, userId]);

  const handleCreatePrompt = async (text: string, modelName: string, temperature: number) => {
    if (!userId || !taskId) {
      return;
    }

    try {
      const newPrompt = await createPromptForTask(userId, taskId, text, modelName, temperature);

      if (newPrompt) {
        setPrompts((prev) => [...prev, newPrompt]);
      }
    } catch (error) {
      console.error('Error creating prompt:', error);
    }
  };

  const handleCreateEvaluation = async (name: string, text: string) => {
    if (!userId || !taskId) {
      return;
    }

    try {
      const newEval = await createEvalForTask(userId, taskId, name, text);

      if (newEval) {
        setEvaluations((prev) => [...prev, newEval]);
      }
    } catch (error) {
      console.error('Error creating evaluation:', error);
    }
  };

  const handleCreateInput = async (inputData: Record<string, string>) => {
    if (!userId || !taskId) {
      return;
    }

    try {
      const result = await createManualInputForTask(userId, taskId, inputData);

      if (result?.id) {
        const inputsData = await getManualInputsForTask(userId, taskId);
        setInputs(inputsData || []);
      }
    } catch (error) {
      console.error('Error creating input:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg font-medium">Loading prompt optimization...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/optimizer/projects/${projectId}/tasks/${taskId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Task
          </Button>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold mb-2">Prompt Optimization: {task?.name || 'Loading...'}</h1>
          <p className="text-muted-foreground">Fine-tune your prompts to achieve better AI responses</p>
        </div>
      </div>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="family" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
            Prompt Family
          </TabsTrigger>
          <TabsTrigger value="manual" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
            Manual Optimization
          </TabsTrigger>
          <TabsTrigger
            value="automatic"
            className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
          >
            Automatic Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="family" className="space-y-6">
          <PromptFamily prompts={prompts} onCreatePrompt={() => setCreatePromptOpen(true)} loading={loading} />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <ManualPromptOptimization
            project={project}
            task={task}
            prompts={prompts}
            evaluations={evaluations}
            inputs={inputs}
            models={models}
            onCreatePrompt={() => setCreatePromptOpen(true)}
            onCreateEvaluation={() => setCreateEvalOpen(true)}
            onCreateInput={() => setCreateInputOpen(true)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="automatic" className="space-y-6">
          {project && task ? (
            <AutomaticPromptOptimization
              project={{
                id: typeof project.id === 'string' ? parseInt(project.id) : project.id,
                name: project.name,
                code: project.code,
              }}
              task={{
                id: typeof task.id === 'string' ? parseInt(task.id) : task.id,
                name: task.name,
                any_events: task.any_events,
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Automatic Optimization</CardTitle>
                <CardDescription>Loading automatic prompt optimization...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreatePromptDialog
        open={createPromptOpen}
        onOpenChange={setCreatePromptOpen}
        onCreatePrompt={handleCreatePrompt}
        models={models}
      />

      <CreateEvaluationDialog
        open={createEvalOpen}
        onOpenChange={setCreateEvalOpen}
        onCreateEval={handleCreateEvaluation}
      />

      <CreateInputDialog
        open={createInputOpen}
        onOpenChange={setCreateInputOpen}
        onCreateInput={handleCreateInput}
        varNames={varNames}
      />
    </div>
  );
}
