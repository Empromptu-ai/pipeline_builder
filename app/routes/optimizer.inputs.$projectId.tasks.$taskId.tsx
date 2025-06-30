import React, { useState } from 'react';
import { useParams } from '@remix-run/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Tabs, TabsContent } from '~/components/ui/tabs';
import { OptimizerLayout } from '~/components/layout/OptimizerLayout';
import InputOptimizationNav from '~/components/optimizer/InputOptimizationNav';
import CreateInputDialog from '~/components/prompts/CreateInputDialog';
import { PilcrowRight, Users2, Search, ListChecks } from 'lucide-react';
import { useManualInputs, useRecentEvents, usePrompts } from '~/hooks/useOptimizer';
import { varNamesFromPrompt } from '~/lib/helpers/var-names';
import { createManualInputForTask, deleteInput } from '~/lib/services/optimizer';
import { useUser } from '~/hooks/useUser';
import { toast } from 'react-toastify';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const formatInputValue = (value: any) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
};

export default function TaskInputs() {
  const { taskId } = useParams();
  const { uid: userId } = useUser();
  const { data: manualInputs, isLoading: manualInputsLoading, refetch: refetchInputs } = useManualInputs(taskId);
  const { data: recentEvents, isLoading: recentEventsLoading } = useRecentEvents(taskId);
  const { data: prompts } = usePrompts(taskId);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract variable names from the active prompt
  const activePrompt = prompts?.find((prompt) => prompt.active) || prompts?.[0];
  const varNames = activePrompt ? varNamesFromPrompt(activePrompt.text) : [];

  const handleCreateInputs = () => {
    window.location.hash = 'manual';
  };

  const handleViewEndUserInputs = () => {
    window.location.hash = 'end-user';
  };

  const handleCreateInput = async (inputs: Record<string, string>) => {
    if (!userId || !taskId) {
      return;
    }

    try {
      await createManualInputForTask(userId, taskId, inputs);
      toast.success('Input created successfully');
      refetchInputs();
    } catch (error) {
      toast.error('Failed to create input');
      console.error('Error creating input:', error);
    }
  };

  const handleDeleteInput = async (inputId: string, inputPreview: string) => {
    if (!userId || !taskId) {
      return;
    }

    if (!confirm(`Are you sure you want to delete this input: "${inputPreview}"?`)) {
      return;
    }

    try {
      await deleteInput(userId, taskId, inputId);
      toast.success('Input deleted successfully');
      refetchInputs();
    } catch (error) {
      toast.error('Failed to delete input');
      console.error('Error deleting input:', error);
    }
  };

  const filteredEvents = recentEvents?.filter(
    (event) =>
      event.response?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(event.inputs || {}).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Inputs</h1>
        <p className="text-muted-foreground">Inputs are inserted into your prompt before running it.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PilcrowRight className="h-5 w-5 mr-2" />
              Manual Inputs
            </CardTitle>
            <CardDescription>Create test or example inputs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create inputs you can use to test out, experiment with, and optimize your prompt — even before you have
              end users.
            </p>
            <Button onClick={handleCreateInputs} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              Create Inputs
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users2 className="h-5 w-5 mr-2" />
              End User Inputs
            </CardTitle>
            <CardDescription>View and analyze inputs from your end users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Review the raw inputs coming from your users through your deployed application.
            </p>
            <Button onClick={handleViewEndUserInputs} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              View End User Inputs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const ManualInputsTab = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manual Inputs</h1>
        <p className="text-muted-foreground">
          Create inputs you can use to test out, experiment with, and optimize your prompt — even before you have end
          users.
        </p>
      </div>

      {manualInputsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-lg font-medium">Loading inputs...</div>
            <div className="text-sm text-muted-foreground mt-2">Please wait while we fetch your data</div>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">Inputs</CardTitle>
            <CreateInputDialog onCreateInput={handleCreateInput} varNames={varNames} />
          </CardHeader>
          <CardContent>
            {manualInputs && manualInputs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Input Variables</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualInputs.map((input) => (
                    <TableRow key={input.id}>
                      <TableCell className="font-mono text-xs">{formatDate(input.created_at)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {Object.entries(input.inputs).map(([key, value]) => (
                            <div key={key} className="text-sm max-w-[250px]">
                              <span className="font-medium">{key}:</span>{' '}
                              <div className="line-clamp-3">{formatInputValue(value)}</div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const inputPreview = Object.entries(input.inputs)
                              .map(([key, value]) => `${key}: ${String(value).substring(0, 50)}`)
                              .join(', ');
                            handleDeleteInput(input.id, inputPreview);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No manual inputs created yet. Create your first input to get started.
                </p>
                <CreateInputDialog onCreateInput={handleCreateInput} varNames={varNames} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const EndUserInputsTab = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">End User Inputs</h1>
        <p className="text-muted-foreground">View and analyze inputs coming from your end users</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <ListChecks className="h-5 w-5 mr-2" />
            Input Log
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
          {recentEventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-lg font-medium">Loading events...</div>
                <div className="text-sm text-muted-foreground mt-2">Please wait while we fetch your data</div>
              </div>
            </div>
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Input Variables</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.event_id}>
                    <TableCell className="font-mono text-xs">{formatDate(event.created_at)}</TableCell>
                    <TableCell className="max-w-prose">
                      <div className="space-y-1">
                        {Object.entries(event.inputs || {}).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium">{key}:</span>{' '}
                            <div className="line-clamp-2">{formatInputValue(value)}</div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-prose">
                      <div className="line-clamp-2">{formatInputValue(event.response)}</div>
                    </TableCell>
                    <TableCell>{event.eval_score || '<none>'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No end user data available. Please follow instructions to start sending data to Empromptu.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <OptimizerLayout>
      <div className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <InputOptimizationNav />

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="manual">
            <ManualInputsTab />
          </TabsContent>

          <TabsContent value="end-user">
            <EndUserInputsTab />
          </TabsContent>
        </Tabs>
      </div>
    </OptimizerLayout>
  );
}
