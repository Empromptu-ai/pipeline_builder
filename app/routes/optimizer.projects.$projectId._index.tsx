import React from 'react';
import { useParams, useNavigate } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '~/components/ui/table';

const mockProjectData = {
  '1': {
    id: 1,
    name: 'Chatbots',
    description: 'AI-powered chatbot optimization project',
    tasks: [
      {
        id: 'travel-chatbot',
        name: 'Travel_Chatbot',
        description: 'Optimize travel booking chatbot responses',
        initialAccuracy: 87,
        currentAccuracy: 98.18,
        status: 'Active',
      },
    ],
  },
  '2': {
    id: 2,
    name: 'Data Extraction',
    description: 'Document processing and data extraction optimization',
    tasks: [
      {
        id: 'data-extraction',
        name: 'Data Extraction Task',
        description: 'Extract structured data from unstructured documents',
        initialAccuracy: 95,
        currentAccuracy: 96,
        status: 'Active',
      },
    ],
  },
};

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const project = mockProjectData[projectId as keyof typeof mockProjectData];

  if (!project) {
    return (
      <div className="min-h-full p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Project Not Found</h1>
          <p className="mt-2 text-muted-foreground">The requested project could not be found.</p>
          <Button onClick={() => navigate('/optimizer')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleNavigateToTask = (taskId: string) => {
    navigate(`/optimizer/projects/${projectId}/tasks/${taskId}`);
  };

  return (
    <div className="min-h-full p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/optimizer')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{project.name}</CardTitle>
            <p className="text-muted-foreground">{project.description}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {project.tasks.reduce((acc, task) => acc + task.initialAccuracy, 0) / project.tasks.length}%
                </div>
                <div className="text-sm text-muted-foreground">Average Initial Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {project.tasks.reduce((acc, task) => acc + task.currentAccuracy, 0) / project.tasks.length}%
                </div>
                <div className="text-sm text-muted-foreground">Average Current Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{project.tasks.length}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Initial Accuracy</TableHead>
                  <TableHead className="text-right">Current Accuracy</TableHead>
                  <TableHead className="text-right">Improvement</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>{task.description}</TableCell>
                    <TableCell className="text-right">{task.initialAccuracy}%</TableCell>
                    <TableCell className="text-right text-green-600">{task.currentAccuracy}%</TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600 font-medium">
                        +{(task.currentAccuracy - task.initialAccuracy).toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{task.status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleNavigateToTask(task.id)}>
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">View task details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
