import React, { useState } from 'react';
import { useParams, useNavigate } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useManualInputs } from '~/hooks/useOptimizer';

export default function TaskInputs() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { data: inputs, isLoading, error } = useManualInputs(taskId);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading inputs...</div>
          <div className="text-sm text-muted-foreground mt-2">Please wait while we fetch your data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Error loading inputs</div>
          <div className="text-sm text-muted-foreground mt-2">{error}</div>
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
          <h1 className="text-2xl font-bold">Test Inputs</h1>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Input
        </Button>
      </div>

      {inputs && inputs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Manual Test Inputs ({inputs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Input Variables</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inputs.map((input) => (
                  <TableRow key={input.id}>
                    <TableCell>
                      <div className="space-y-1">
                        {Object.entries(input.inputs).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(input.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium">No test inputs yet</h3>
              <p className="text-muted-foreground mt-2">
                Create test inputs to evaluate your prompts and track performance.
              </p>
              <Button onClick={() => setShowCreateForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Input
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Test Input</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">Input creation form would go here</p>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="mt-4">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
