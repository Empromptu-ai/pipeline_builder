import { useState, useMemo } from 'react';
import { useParams } from '@remix-run/react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '~/components/ui/card';
import { toast } from 'react-toastify';
import { Zap, Loader2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import Spinner from '~/components/ui/spinner';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Checkbox } from '~/components/ui/checkbox';
import type { CheckedState } from '@radix-ui/react-checkbox';
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
  type EvaluateEvent,
  type OptimizeEvent,
} from '~/lib/services/optimizer';
import { useUser } from '~/hooks/useUser';
import CreatePromptDialog from '~/components/prompts/CreatePromptDialog';
import CreateInputDialog from '~/components/prompts/CreateInputDialog';
import { varNamesFromPrompt } from '~/lib/helpers/var-names';
import ViewPromptDialogLink from '~/components/prompts/ViewPromptDialogLink';
import ViewInputDialogLink from '~/components/inputs/ViewInputDialogLink';
import ViewEvaluationDialogLink from '~/components/evaluations/ViewEvaluationDialogLink';
import CreateEvaluationDialog from '~/components/prompts/CreateEvaluationDialog';
import ViewEventDialogLink from '~/components/events/ViewEventDialogLink';
import ViewEventCompareDialogLink from '~/components/events/ViewEventCompareDialogLink';

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
  onRefreshPrompts?: () => void;
  loading: boolean;
}

const ManualPromptOptimization: React.FC<ManualPromptOptimizationProps> = ({
  project: _project,
  task,
  prompts,
  evaluations,
  inputs,
  models,
  onCreatePrompt,
  onCreateEvaluation,
  onCreateInput,
  onRefreshPrompts,
  loading,
}) => {
  const { projectId, taskId } = useParams();
  const { uid: userId } = useUser();
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedInputs, setSelectedInputs] = useState<string[]>([]);
  const [selectedEvaluations, setSelectedEvaluations] = useState<string[]>([]);
  const [selectedEvaluationEvents, setSelectedEvaluationEvents] = useState<string[]>([]);

  const readyForEvaluation = selectedPrompt && selectedInputs.length > 0 && selectedEvaluations.length > 0;

  const areAnyPrompts = prompts && prompts.length > 0;
  const areAnyInputs = inputs && inputs.length > 0;
  const areAnyEvaluations = evaluations && evaluations.length > 0;

  const [evaluateRun, setEvaluateRun] = useState<EvaluateResults | null>(null);
  const [optimizeRun, setOptimizeRun] = useState<OptimizeResults | null>(null);
  const [evaluateIsRunning, setEvaluateIsRunning] = useState(false);
  const [optimizeIsRunning, setOptimizeIsRunning] = useState(false);
  const [stateAtLastEvaluate, setStateAtLastEvaluate] = useState<{
    promptId: string;
    evaluationIds: string[];
  } | null>(null);

  const areAnyEvaluateEvents = evaluateRun?.events && evaluateRun.events.length > 0;
  const areAnyOptimizeEvents = optimizeRun?.events && optimizeRun.events.length > 0;
  const areAnyOptimizeResults = optimizeRun?.prompt || areAnyOptimizeEvents;

  const userApiKey = 'todo';

  const availableVarNames = useMemo(() => {
    if (!areAnyPrompts) {
      return [];
    }

    if (selectedPrompt) {
      return varNamesFromPrompt(prompts.find((p) => p.id === selectedPrompt)?.text);
    }

    return varNamesFromPrompt(prompts[0]?.text);
  }, [prompts, selectedPrompt, areAnyPrompts]);

  const allUsedVarNames = useMemo(() => {
    if (!areAnyPrompts) {
      return [];
    }

    const varNameSet = new Set<string>();
    prompts.forEach((prompt) => {
      varNamesFromPrompt(prompt.text).forEach((varName) => {
        varNameSet.add(varName);
      });
    });

    return Array.from(varNameSet);
  }, [prompts, areAnyPrompts]);

  const mapOptimizeEventToEvaluateEvent = useMemo(() => {
    if (!optimizeRun?.events || !evaluateRun?.events || !optimizeRun?.events?.length || !evaluateRun?.events?.length) {
      return {};
    }

    const mapping: Record<string, Partial<EvaluateEvent>> = {};
    optimizeRun.events.forEach((oEvent) => {
      const eMatch = evaluateRun.events.find((eEvent) => eEvent.input_id === oEvent.input_id);

      if (eMatch) {
        mapping[oEvent.event_id] = eMatch;
      } else {
        mapping[oEvent.event_id] = { response: '<none>', score: 0 };
      }
    });

    return mapping;
  }, [optimizeRun?.events, evaluateRun?.events]);

  const recommendation = useMemo(() => {
    if (
      evaluateIsRunning ||
      optimizeIsRunning ||
      !optimizeRun?.events ||
      !evaluateRun?.events ||
      !optimizeRun?.events?.length ||
      !evaluateRun?.events?.length
    ) {
      return null;
    }

    if (selectedInputs.length === 0) {
      return null;
    }

    const origPromptData: Record<string, number> = {};
    const newPromptData: Record<string, number> = {};

    selectedInputs.forEach((inputId) => {
      const evalEvent = evaluateRun.events.find((event) => event.input_id === inputId);
      const optiEvent = optimizeRun.events.find((event) => event.input_id === inputId);

      if (evalEvent && !optiEvent) {
        origPromptData[inputId] = Number(evalEvent.score);
      } else if (evalEvent && optiEvent) {
        if (Number(evalEvent.score) > Number(optiEvent.score)) {
          origPromptData[inputId] = Number(evalEvent.score);
        } else {
          newPromptData[inputId] = Number(optiEvent.score);
        }
      }
    });

    const origCount = Object.keys(origPromptData).length;
    const origAvg = Object.values(origPromptData).reduce((val, sum) => val + sum, 0) / origCount;
    const origRec = origCount > 0 && origAvg > 7;
    const newCount = Object.keys(newPromptData).length;
    const newAvg = Object.values(newPromptData).reduce((val, sum) => val + sum, 0) / newCount;
    const newRec = newCount > 0 && newAvg > 7;

    if (origRec && newRec) {
      return 'both' as const;
    }

    if (newRec) {
      return 'new' as const;
    }

    if (origRec) {
      return 'orig' as const;
    }

    return 'none' as const;
  }, [selectedInputs, optimizeRun?.events, evaluateRun?.events, evaluateIsRunning, optimizeIsRunning]);

  const readyForOptimize = selectedEvaluationEvents.length > 0;

  const clearOptimize = () => {
    setOptimizeRun(null);
    setSelectedEvaluationEvents([]);
  };

  const onEvaluateReset = () => {
    clearOptimize();
  };

  const startEvaluate = async () => {
    if (!readyForEvaluation || !userId || !task?.id || !selectedPrompt) {
      return;
    }

    setEvaluateIsRunning(true);
    setStateAtLastEvaluate({
      promptId: selectedPrompt,
      evaluationIds: selectedEvaluations,
    });

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
            setEvaluateRun(evalResult);
            setEvaluateIsRunning(false);
          } else if (evalResult?.status === 'failed') {
            setEvaluateIsRunning(false);
          } else {
            setTimeout(pollResults, 2000);
          }
        };
        setTimeout(pollResults, 1000);
      } else {
        setEvaluateIsRunning(false);
      }
    } catch (error) {
      console.error('Error evaluating:', error);
      setEvaluateIsRunning(false);
    }
  };

  const startOptimize = async () => {
    if (!readyForOptimize || !userId || !task?.id) {
      return;
    }

    setOptimizeIsRunning(true);

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
            setOptimizeRun(optResult);
            setOptimizeIsRunning(false);
          } else if (optResult?.status === 'failed') {
            setOptimizeIsRunning(false);
          } else {
            setTimeout(pollResults, 2000);
          }
        };
        setTimeout(pollResults, 1000);
      } else {
        setOptimizeIsRunning(false);
      }
    } catch (error) {
      console.error('Error optimizing:', error);
      setOptimizeIsRunning(false);
    }
  };

  const handlePromotePrompts = async (choice: 'original' | 'new' | 'both') => {
    if (!userId || !task?.id || !evaluateRun || !optimizeRun || !selectedPrompt || !stateAtLastEvaluate) {
      return;
    }

    try {
      let runIds: string[] = [];
      let promptIds: string[] = [];

      switch (choice) {
        case 'original': {
          runIds = [evaluateRun.run_id];
          promptIds = [stateAtLastEvaluate.promptId];
          break;
        }
        case 'new': {
          if (optimizeRun.prompt) {
            runIds = [optimizeRun.run_id];
            promptIds = [optimizeRun.prompt.prompt_id];
          }

          break;
        }
        case 'both': {
          if (optimizeRun.prompt) {
            runIds = [evaluateRun.run_id, optimizeRun.run_id];
            promptIds = [stateAtLastEvaluate.promptId, optimizeRun.prompt.prompt_id];
          }

          break;
        }
      }

      const result = await promoteExperiment(
        userId,
        userApiKey,
        task.id,
        runIds,
        promptIds,
        stateAtLastEvaluate.evaluationIds,
      );

      if (!result || result.status !== 'success') {
        toast.error('Unable to promote this experiment', {
          position: 'bottom-right',
          autoClose: 3000,
        });
        return;
      }

      toast.success('You have promoted this experiment.', {
        position: 'bottom-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error promoting experiment:', error);
      toast.error('Unable to promote this experiment', {
        position: 'bottom-right',
        autoClose: 3000,
      });
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
                  <CreatePromptDialog onCreate={onCreatePrompt} models={models} onRefresh={onRefreshPrompts} />
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
                        className={`p-3 border rounded-md ${
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
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="font-medium">Prompt-{index + 1}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {prompt.text.substring(0, 200)}
                            </div>
                          </div>
                          <ViewPromptDialogLink prompt={prompt} onDelete={onRefreshPrompts}>
                            {(openDialog) => (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDialog();
                                }}
                                className="text-xs"
                              >
                                Modify
                              </Button>
                            )}
                          </ViewPromptDialogLink>
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
                    <CreateInputDialog onCreateInput={() => onCreateInput()} varNames={availableVarNames} />
                  </div>
                </CardHeader>
                <CardContent>
                  {inputs.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-4">
                        No test inputs available. Create your first test input.
                      </p>
                      <CreateInputDialog onCreateInput={() => onCreateInput()} varNames={availableVarNames} />
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
                                <ViewInputDialogLink key={key} input={input}>
                                  <div className="cursor-pointer hover:text-purple-600">
                                    {key}: {value.substring(0, 100)}...
                                  </div>
                                </ViewInputDialogLink>
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
                  <CreateEvaluationDialog onCreateEval={() => onCreateEvaluation()} />
                </div>
              </CardHeader>
              <CardContent>
                {evaluations.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      No evaluations available. Create your first evaluation.
                    </p>
                    <CreateEvaluationDialog onCreateEval={() => onCreateEvaluation()} />
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
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
                            <ViewEvaluationDialogLink evaluation={evaluation}>
                              <div className="cursor-pointer hover:text-purple-600">
                                <div className="font-medium">{evaluation.name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {evaluation.text.substring(0, 200)}
                                </div>
                              </div>
                            </ViewEvaluationDialogLink>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button
                onClick={startEvaluate}
                disabled={!readyForEvaluation || evaluateIsRunning}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400"
              >
                {evaluateIsRunning ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Evaluate this Prompt
                  </>
                )}
              </Button>
              {!readyForEvaluation && (
                <p className="text-sm text-red-500">Please select a prompt, input, and evaluation to continue</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {areAnyEvaluateEvents && (
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
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-48">Messages</TableHead>
                        <TableHead className="w-64">AI Response</TableHead>
                        <TableHead className="w-24 text-center">Score</TableHead>
                        <TableHead className="w-80">Score Explanation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluateRun!.events.map((event) => {
                        const input = inputs.find((i) => i.id === event.input_id);
                        const inputText = input ? Object.values(input.inputs).join(', ') : 'N/A';

                        let scoreExplained;
                        let scoreExplanationText = 'No explanation available';

                        if (event.score_explained) {
                          if (typeof event.score_explained === 'string') {
                            try {
                              scoreExplained = JSON.parse(event.score_explained);
                              scoreExplanationText = Object.entries(scoreExplained)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ');
                            } catch {
                              scoreExplained = undefined;
                              scoreExplanationText = String(event.score_explained);
                            }
                          } else if (typeof event.score_explained === 'object') {
                            scoreExplained = event.score_explained;
                            scoreExplanationText = Object.entries(event.score_explained)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ');
                          }
                        }

                        return (
                          <TableRow key={event.event_id} className="hover:bg-accent/50">
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
                              <ViewEventDialogLink
                                event={{
                                  inputs: input?.inputs || {},
                                  response: event.response,
                                  score: event.score,
                                  score_explained: scoreExplained,
                                }}
                              >
                                <div className="max-w-xs truncate cursor-pointer hover:text-purple-600">
                                  {inputText}
                                </div>
                              </ViewEventDialogLink>
                            </TableCell>
                            <TableCell>
                              <ViewEventDialogLink
                                event={{
                                  inputs: input?.inputs || {},
                                  response: event.response,
                                  score: event.score,
                                  score_explained: scoreExplained,
                                }}
                              >
                                <div className="max-w-xs truncate cursor-pointer hover:text-purple-600">
                                  {event.response}
                                </div>
                              </ViewEventDialogLink>
                            </TableCell>
                            <TableCell>
                              <Badge variant={Number(event.score) > 7 ? 'default' : 'destructive'}>
                                {Number(event.score).toFixed(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <ViewEventDialogLink
                                event={{
                                  inputs: input?.inputs || {},
                                  response: event.response,
                                  score: event.score,
                                  score_explained: scoreExplained,
                                }}
                              >
                                <div className="max-w-xs truncate text-sm text-muted-foreground cursor-pointer hover:text-purple-600">
                                  {scoreExplanationText}
                                </div>
                              </ViewEventDialogLink>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex items-center gap-3">
                <Button onClick={startOptimize} disabled={!readyForOptimize || optimizeIsRunning}>
                  {optimizeIsRunning ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Optimize this Prompt
                    </>
                  )}
                </Button>
                {!readyForOptimize && (
                  <p className="text-sm text-red-500">Please select low-performing results to optimize</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {areAnyOptimizeResults && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Compare and Promote</CardTitle>
            <CardDescription>
              Compare the performance of the new prompt with your original prompt. Promote the best one!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {optimizeRun?.prompt && (
                <Card className="border border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">New Prompt</CardTitle>
                    <CardDescription>
                      We've generated this new prompt to improve the quality of AI responses.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-slate-100 rounded-md">
                      <div className="text-sm">{optimizeRun.prompt.text}</div>
                    </div>
                    {optimizeRun.summary && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Analysis</h4>
                        <div className="p-4 bg-blue-50 rounded-md">
                          <div className="text-sm">{optimizeRun.summary}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {areAnyOptimizeEvents && (
                <Card className="border border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Comparison Results</CardTitle>
                    <CardDescription>
                      Compare how the original and new prompts performed on the same inputs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px] max-w-[200px]">Messages</TableHead>
                            <TableHead className="min-w-[200px] max-w-[300px]">Original AI Response</TableHead>
                            <TableHead className="min-w-[200px] max-w-[300px]">New AI Response</TableHead>
                            <TableHead className="w-32 text-center">Original Score</TableHead>
                            <TableHead className="w-32 text-center">New Score</TableHead>
                            <TableHead className="w-32 text-center">Better Prompt</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {optimizeRun!.events!.map((optimizeEvent) => {
                            const evaluateEvent = mapOptimizeEventToEvaluateEvent[optimizeEvent.event_id];
                            const input = inputs.find((i) => i.id === optimizeEvent.input_id);
                            const inputText = input ? Object.values(input.inputs).join(', ') : 'N/A';
                            const originalScore = evaluateEvent?.score ? Number(evaluateEvent.score) : 0;
                            const newScore = Number(optimizeEvent.score);
                            const betterPrompt =
                              newScore > originalScore ? 'New' : originalScore > newScore ? 'Original' : 'Tie';

                            return (
                              <TableRow key={optimizeEvent.event_id} className="hover:bg-accent/50">
                                <TableCell>
                                  <ViewEventCompareDialogLink
                                    event={{
                                      inputs: input?.inputs || {},
                                      response: optimizeEvent.response,
                                      score: optimizeEvent.score,
                                      origResponse: evaluateEvent?.response || 'N/A',
                                      origScore: evaluateEvent?.score || 0,
                                    }}
                                  >
                                    <div className="max-w-xs truncate cursor-pointer hover:text-purple-600">
                                      {inputText}
                                    </div>
                                  </ViewEventCompareDialogLink>
                                </TableCell>
                                <TableCell>
                                  <ViewEventCompareDialogLink
                                    event={{
                                      inputs: input?.inputs || {},
                                      response: optimizeEvent.response,
                                      score: optimizeEvent.score,
                                      origResponse: evaluateEvent?.response || 'N/A',
                                      origScore: evaluateEvent?.score || 0,
                                    }}
                                  >
                                    <div className="max-w-xs truncate cursor-pointer hover:text-purple-600">
                                      {evaluateEvent?.response || 'N/A'}
                                    </div>
                                  </ViewEventCompareDialogLink>
                                </TableCell>
                                <TableCell>
                                  <ViewEventCompareDialogLink
                                    event={{
                                      inputs: input?.inputs || {},
                                      response: optimizeEvent.response,
                                      score: optimizeEvent.score,
                                      origResponse: evaluateEvent?.response || 'N/A',
                                      origScore: evaluateEvent?.score || 0,
                                    }}
                                  >
                                    <div className="max-w-xs truncate cursor-pointer hover:text-purple-600">
                                      {optimizeEvent.response}
                                    </div>
                                  </ViewEventCompareDialogLink>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={originalScore > 7 ? 'default' : 'destructive'}>
                                    {originalScore.toFixed(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={newScore > 7 ? 'default' : 'destructive'}>
                                    {newScore.toFixed(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      betterPrompt === 'New'
                                        ? 'default'
                                        : betterPrompt === 'Original'
                                          ? 'secondary'
                                          : 'outline'
                                    }
                                    className={betterPrompt === 'New' ? 'bg-green-600 text-white' : ''}
                                  >
                                    {betterPrompt}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Compare Results and Promote</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Check out how your new prompt is performing, compared with the original prompt.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-3">
                    <Button
                      onClick={() => handlePromotePrompts('original')}
                      className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                    >
                      Promote Original Prompt
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Start using the Original Prompt as the primary prompt for this Task.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Choose this option if you think your original prompt is showing good performance, but you do not
                      like the performance of the optimized prompt.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Button
                        onClick={() => handlePromotePrompts('new')}
                        className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                      >
                        Promote New Prompt
                      </Button>
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        Recommended
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Start using the New Prompt as the primary prompt for this Task.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Choose this option if you think the new prompt is showing good performance, but you do not like
                      the performance of the original prompt.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => handlePromotePrompts('both')}
                      className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                    >
                      Promote Both Prompts
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Start using both prompts, and Empromptu will choose the best prompt for each input.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sometimes your original prompt does great, but sometimes the new prompt does better. Combine the
                      two into a Prompt Family, and Empromptu will help you get the most out of both!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        setEvaluateRun(null);
                        setOptimizeRun(null);
                        setSelectedEvaluationEvents([]);
                        setSelectedPrompt(null);
                        setSelectedInputs([]);
                        setSelectedEvaluations([]);
                      }}
                      className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-medium"
                    >
                      Start Over
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Choose this option if neither prompt is producing good enough results for it to be a solid
                      foundation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManualPromptOptimization;
