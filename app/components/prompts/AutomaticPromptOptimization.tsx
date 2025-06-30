import React, { useState, useMemo } from 'react';
import { useParams } from '@remix-run/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Search, ListChecks, Zap } from 'lucide-react';
import { useUser } from '~/hooks/useUser';
import { getRecentEventsForTask } from '~/lib/services/optimizer';

interface Project {
  id: number;
  name: string;
  code?: boolean;
}

interface Task {
  id: number;
  name: string;
  any_events: boolean;
}

interface UserInput {
  event_id: string;
  created_at: string;
  inputs: Record<string, any>;
  response: string;
  prompt_text?: string;
  eval_scores?: any;
  eval_score?: number;
}

interface EndUserInputLogProps {
  inputs: UserInput[];
  isLoading: boolean;
}

const EndUserInputLog: React.FC<EndUserInputLogProps> = ({ inputs, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { projectId, taskId } = useParams();

  const filteredInputs = inputs?.filter((input) => input.response?.toLowerCase().includes(searchTerm.toLowerCase()));

  const inputHeaders = inputs?.length > 0 ? Object.keys(inputs[0].inputs) : [];
  inputHeaders?.sort();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatInputValue = (value: any) => {
    if (typeof value === 'object') {
      if ('length' in value) {
        return value.flatMap((v: any) => v.content).join(' ');
      }

      return JSON.stringify(value);
    }

    if (typeof value === 'string') {
      return value.substring(0, 400);
    }

    return value;
  };

  const handleSendToOptimizer = (input: UserInput) => {
    sessionStorage.setItem(
      'optimizerInput',
      JSON.stringify({
        input: input.response,
        response: input.response,
        source: 'user-input-log',
      }),
    );

    // Navigate to prompts page - this would need to be implemented
    console.log('Navigate to optimizer with input:', input);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <ListChecks className="h-5 w-5 mr-2" />
          Event Log
        </CardTitle>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search inputs..."
              className="pl-8 w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {inputs.length === 0 && (
          <p>No end user data available. Please follow instructions to start sending data to Empromptu.</p>
        )}
        {inputs.length > 0 && (
          <>
            {/* Desktop Table View - Hidden on mobile */}
            <div className="hidden lg:block w-full overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Timestamp</TableHead>
                    {inputHeaders.map((key) => (
                      <TableHead key={`${key}-header`} className="min-w-[150px]">
                        {key}
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[200px]">Response</TableHead>
                    <TableHead className="min-w-[150px]">Delivered Prompt</TableHead>
                    <TableHead className="min-w-[150px]">Score Reasoning</TableHead>
                    <TableHead className="min-w-[80px]">Score</TableHead>
                    <TableHead className="min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInputs.map((input) => (
                    <TableRow key={`${input.event_id}-row`}>
                      <TableCell className="font-mono text-xs">{formatDate(input.created_at)}</TableCell>
                      {inputHeaders.map((key) => (
                        <TableCell key={`${input.event_id}-${key}-cell`} className="max-w-[200px]">
                          <div className="line-clamp-2 overflow-hidden text-ellipsis">
                            {formatInputValue(input.inputs[key])}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="max-w-[300px]">
                        <div className="line-clamp-2 overflow-hidden text-ellipsis">
                          {formatInputValue(input.response)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="line-clamp-2 overflow-hidden text-ellipsis">
                          {formatInputValue(input.prompt_text) || '<none>'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="line-clamp-2 overflow-hidden text-ellipsis">
                          {formatInputValue(input.eval_scores) || '<none>'}
                        </div>
                      </TableCell>
                      <TableCell>{input.eval_score || '<none>'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleSendToOptimizer(input)}>
                          <Zap className="h-4 w-4 mr-1" />
                          Optimize
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View - Shown on mobile and tablet */}
            <div className="lg:hidden space-y-4">
              {filteredInputs.map((input) => (
                <div key={`${input.event_id}-card`} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="font-mono text-xs text-muted-foreground">{formatDate(input.created_at)}</div>
                    <div className="flex items-center space-x-2">
                      {input.eval_score && <span className="text-sm font-medium">{input.eval_score}</span>}
                      <Button size="sm" variant="outline" onClick={() => handleSendToOptimizer(input)}>
                        <Zap className="h-4 w-4 mr-1" />
                        Optimize
                      </Button>
                    </div>
                  </div>

                  {/* Input fields */}
                  {inputHeaders.map((key) => (
                    <div key={`${input.event_id}-${key}-mobile`} className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">{key}</div>
                      <div className="text-sm line-clamp-3">{formatInputValue(input.inputs[key])}</div>
                    </div>
                  ))}

                  {/* Response */}
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Response</div>
                    <div className="text-sm line-clamp-3">{formatInputValue(input.response)}</div>
                  </div>

                  {/* Prompt and scores - collapsed by default on mobile */}
                  {(input.prompt_text || input.eval_scores) && (
                    <details className="space-y-2">
                      <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
                        Additional Details
                      </summary>
                      {input.prompt_text && (
                        <div className="space-y-1 pl-4">
                          <div className="text-xs font-medium text-muted-foreground">Delivered Prompt</div>
                          <div className="text-xs line-clamp-2">{formatInputValue(input.prompt_text)}</div>
                        </div>
                      )}
                      {input.eval_scores && (
                        <div className="space-y-1 pl-4">
                          <div className="text-xs font-medium text-muted-foreground">Score Reasoning</div>
                          <div className="text-xs line-clamp-2">{formatInputValue(input.eval_scores)}</div>
                        </div>
                      )}
                    </details>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface AutomaticPromptOptimizationProps {
  project: Project;
  task: Task;
}

const AutomaticPromptOptimization: React.FC<AutomaticPromptOptimizationProps> = ({ project, task }) => {
  const { projectId, taskId } = useParams();
  const { uid: userId } = useUser();
  const [inputs, setInputs] = useState<UserInput[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const showEmptyState = useMemo(() => {
    if (!project) {
      return true;
    }

    return task.any_events === false;
  }, [project, task.any_events]);

  React.useEffect(() => {
    const fetchRecentEvents = async () => {
      if (!showEmptyState && userId && taskId) {
        setIsLoading(true);

        try {
          const events = await getRecentEventsForTask(userId, taskId);

          if (events) {
            const transformedInputs: UserInput[] = events.map((event: any) => ({
              event_id: event.event_id || event.id,
              created_at: event.created_at,
              inputs: event.inputs || {},
              response: event.response || '',
              prompt_text: event.prompt_text,
              eval_scores: event.eval_scores,
              eval_score: event.eval_score,
            }));

            setInputs(transformedInputs);
          } else {
            setInputs([]);
          }
        } catch (error) {
          console.error('Error fetching recent events:', error);
          setInputs([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchRecentEvents();
  }, [showEmptyState, userId, taskId]);

  const CodeInstallInstructions = () => (
    <Card>
      <CardHeader>
        <CardTitle>Get Started with Code Integration</CardTitle>
        <CardDescription>
          Install our SDK to start collecting user interaction data for automatic prompt optimization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-md">
            <code className="text-sm">npm install @empromptu/sdk</code>
          </div>
          <p className="text-sm text-muted-foreground">
            Once installed, user interactions will automatically appear in the Event Log above for analysis and
            optimization.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {!showEmptyState ? (
        <div className="space-y-6">
          <EndUserInputLog inputs={inputs} isLoading={isLoading} />
        </div>
      ) : (
        <CodeInstallInstructions />
      )}
    </>
  );
};

export default AutomaticPromptOptimization;
