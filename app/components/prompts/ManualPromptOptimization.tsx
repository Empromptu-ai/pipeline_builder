import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Checkbox } from '~/components/ui/checkbox';
import { useUser } from '~/hooks/useUser';
import {
  evaluateExperiment,
  getResultsOfEvaluateRun,
  runOptimization,
  getResultsOfOptimizeRun,
  promoteExperiment,
  type Project,
  type Task,
  type Prompt,
  type Evaluation,
  type ManualInput,
  type EvaluateResults,
  type OptimizeResults,
  type Model,
} from '~/lib/services/optimizer';
import { Zap, Plus, Loader2 } from 'lucide-react';

interface ManualPromptOptimizationProps {
  project: Project | null;
  task: Task | null;
  prompts: Prompt[];
  evaluations: Evaluation[];
  inputs: ManualInput[];
  models: Model[];
  onCreatePrompt: () => void;
  onCreateEvaluation: () => void;
  onCreateInput: () => void;
  loading: boolean;
}

const ManualPromptOptimization: React.FC<ManualPromptOptimizationProps> = ({
  project: _project,
  task,
  prompts,
  evaluations,
  inputs,
  models: _models,
  onCreatePrompt,
  onCreateEvaluation,
  onCreateInput,
  loading,
}) => {
  const { uid: userId } = useUser();
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [selectedEvaluations, setSelectedEvaluations] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [evaluateResults, setEvaluateResults] = useState<EvaluateResults | null>(null);
  const [optimizeResults, setOptimizeResults] = useState<OptimizeResults | null>(null);
  const [selectedEvaluationEvents, setSelectedEvaluationEvents] = useState<string[]>([]);

  const canEvaluate = selectedPrompt && selectedInputs.length > 0 && selectedEvaluations.length > 0;
  const canOptimize = selectedEvaluationEvents.length > 0;

  //TODO: to-do tie in the real auth..
  const userApiKey = 'placeholder';

  const handleEvaluate = async () => {
    if (!canEvaluate || !userId || !task?.id) {
      return;
    }

    setIsEvaluating(true);

    try {
      const result = await evaluateExperiment(
        userId,
        userApiKey,
        task.id,
        [selectedPrompt],
        selectedInputs,
        selectedEvaluations,
      );

      if (result?.run_id) {
        const pollResults = async () => {
          const evalResult = await getResultsOfEvaluateRun(userId, task.id, result.run_id);

          if (evalResult?.status === 'completed') {
            setEvaluateResults(evalResult);
          } else if (evalResult?.status !== 'failed') {
            setTimeout(pollResults, 2000);
          }
        };
        setTimeout(pollResults, 1000);
      }
    } catch (error) {
      console.error('Error evaluating:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleOptimize = async () => {
    if (!canOptimize || !userId || !task?.id) {
      return;
    }

    setIsOptimizing(true);

    try {
      const result = await runOptimization(
        userId,
        userApiKey,
        task.id,
        'experiment',
        selectedEvaluationEvents,
        selectedEvaluations,
      );

      if (result?.run_id) {
        const pollResults = async () => {
          const optResult = await getResultsOfOptimizeRun(userId, task.id, result.run_id);

          if (optResult?.status === 'completed') {
            setOptimizeResults(optResult);
          } else if (optResult?.status !== 'failed') {
            setTimeout(pollResults, 2000);
          }
        };
        setTimeout(pollResults, 1000);
      }
    } catch (error) {
      console.error('Error optimizing:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handlePromoteExperiment = async (choice: 'original' | 'new' | 'both') => {
    if (!userId || !task?.id || !evaluateResults || !optimizeResults) {
      return;
    }

    try {
      let runIds: string[] = [];
      let promptIds: string[] = [];

      switch (choice) {
        case 'original': {
          runIds = [evaluateResults.run_id];
          promptIds = [selectedPrompt];
          break;
        }
        case 'new': {
          if (optimizeResults.prompt) {
            runIds = [optimizeResults.run_id];
            promptIds = [optimizeResults.prompt.prompt_id];
          }

          break;
        }
        case 'both': {
          if (optimizeResults.prompt) {
            runIds = [evaluateResults.run_id, optimizeResults.run_id];
            promptIds = [selectedPrompt, optimizeResults.prompt.prompt_id];
          }

          break;
        }
      }

      await promoteExperiment(userId, userApiKey, task.id, runIds, promptIds, selectedEvaluations);
    } catch (error) {
      console.error('Error promoting experiment:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Set up and run your experiment</CardTitle>
          <CardDescription>
            We start by evaluating how effective your current prompt is. Next, we can use that data to make
            improvements!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Card className="border border-muted">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Select a Prompt</CardTitle>
                    <CardDescription>Which prompt do you want to evaluate and optimize?</CardDescription>
                  </div>
                  <Button onClick={onCreatePrompt} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Prompt
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {prompts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      No prompts available. Create your first prompt to get started.
                    </p>
                    <Button onClick={onCreatePrompt}>Create First Prompt</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prompts.map((prompt, index) => (
                      <div
                        key={prompt.id}
                        className={`p-3 border rounded-md cursor-pointer ${
                          selectedPrompt === prompt.id ? 'border-purple-400 bg-purple-50' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedPrompt(prompt.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={selectedPrompt === prompt.id}
                            onChange={() => setSelectedPrompt(prompt.id)}
                            className="h-4 w-4 text-purple-600 border-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium">Prompt-{index + 1}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {prompt.text.substring(0, 200)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {prompts.length > 0 && (
              <Card className="border border-muted">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">Select which Inputs to test</CardTitle>
                      <CardDescription>
                        We'll score your prompt for each input you select, then optimize to improve those scores!
                      </CardDescription>
                    </div>
                    <Button onClick={onCreateInput} className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Input
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {inputs.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-4">
                        No test inputs available. Create your first test input.
                      </p>
                      <Button onClick={onCreateInput}>Create First Input</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inputs.map((input, index) => (
                        <div key={input.id} className="flex items-center space-x-2 p-3 border rounded-md">
                          <Checkbox
                            checked={selectedInputs.includes(input.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedInputs((prev) => [...prev, input.id]);
                              } else {
                                setSelectedInputs((prev) => prev.filter((id) => id !== input.id));
                              }
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium">Input-{index + 1}</div>
                            <div className="text-sm text-muted-foreground">
                              {Object.entries(input.inputs).map(([key, value]) => (
                                <div key={key}>
                                  {key}: {value.substring(0, 100)}...
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border border-muted">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">How to evaluate the AI response?</CardTitle>
                    <CardDescription>
                      Choose evaluations to capture everything you expect from a great AI response.
                    </CardDescription>
                  </div>
                  <Button onClick={onCreateEvaluation} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Evaluation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {evaluations.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      No evaluations available. Create your first evaluation.
                    </p>
                    <Button onClick={onCreateEvaluation}>Create First Evaluation</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evaluations.map((evaluation) => (
                      <div key={evaluation.id} className="flex items-center space-x-2 p-3 border rounded-md">
                        <Checkbox
                          checked={selectedEvaluations.includes(evaluation.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEvaluations((prev) => [...prev, evaluation.id]);
                            } else {
                              setSelectedEvaluations((prev) => prev.filter((id) => id !== evaluation.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{evaluation.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {evaluation.text.substring(0, 200)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleEvaluate}
                disabled={!canEvaluate || isEvaluating}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Evaluate this Prompt
                  </>
                )}
              </Button>
              {!canEvaluate && (
                <p className="text-sm text-red-500">Please select a prompt, input, and evaluation to continue</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {evaluateResults && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Optimize</CardTitle>
            <CardDescription>Next, we use these results to make a better prompt.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Card className="border border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Evaluation Results</CardTitle>
                  <CardDescription>
                    Select the responses you're not satisfied with, then click "Optimize Prompt"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Input</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluateResults.events.map((event) => (
                        <TableRow key={event.event_id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedEvaluationEvents.includes(event.event_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEvaluationEvents((prev) => [...prev, event.event_id]);
                                } else {
                                  setSelectedEvaluationEvents((prev) => prev.filter((id) => id !== event.event_id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">
                              {inputs.find((i) => i.id === event.input_id)?.inputs?.input || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">{event.response}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={Number(event.score) > 7 ? 'default' : 'destructive'}>
                              {Number(event.score).toFixed(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex items-center gap-3">
                <Button onClick={handleOptimize} disabled={!canOptimize || isOptimizing}>
                  {isOptimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Optimize this Prompt
                    </>
                  )}
                </Button>
                {!canOptimize && (
                  <p className="text-sm text-red-500">Please select low-performing results to optimize</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {optimizeResults && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Compare and Promote</CardTitle>
            <CardDescription>
              Compare the performance of the new prompt with your original prompt. Promote the best one!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {optimizeResults.prompt && (
                <Card className="border border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">New Prompt</CardTitle>
                    <CardDescription>
                      We've generated this new prompt to improve the quality of AI responses.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-slate-100 rounded-md">
                      <div className="text-sm">{optimizeResults.prompt.text}</div>
                    </div>
                    {optimizeResults.summary && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Analysis</h4>
                        <div className="p-4 bg-blue-50 rounded-md">
                          <div className="text-sm">{optimizeResults.summary}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <Button onClick={() => handlePromoteExperiment('original')} className="w-full">
                      Promote Original Prompt
                    </Button>
                    <CardDescription>
                      Start using the Original Prompt as the primary prompt for this Task.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <Button onClick={() => handlePromoteExperiment('new')} className="w-full">
                      Promote New Prompt
                    </Button>
                    <CardDescription>Start using the New Prompt as the primary prompt for this Task.</CardDescription>
                  </CardHeader>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <Button onClick={() => handlePromoteExperiment('both')} className="w-full">
                      Promote Both Prompts
                    </Button>
                    <CardDescription>
                      Use both prompts, and let the system choose the best one for each input.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManualPromptOptimization;
