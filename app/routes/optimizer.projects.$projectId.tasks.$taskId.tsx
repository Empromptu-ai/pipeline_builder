import React from 'react';
import { useParams, useNavigate } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ArrowLeft, Settings, Play, BarChart3 } from 'lucide-react';
import { Progress } from '~/components/ui/progress';

const mockTaskData = {
  'travel-chatbot': {
    id: 'travel-chatbot',
    name: 'Travel_Chatbot',
    description: 'Optimize travel booking chatbot responses',
    projectId: '1',
    projectName: 'Chatbots',
    initialAccuracy: 87,
    currentAccuracy: 98.18,
    status: 'Active',
    lastOptimized: '2 hours ago',
    totalRuns: 156,
    successfulRuns: 153,
    categories: [
      { name: 'Inputs', count: 45, status: 'optimized' },
      { name: 'Prompts', count: 12, status: 'optimized' },
      { name: 'Evaluations', count: 8, status: 'active' },
      { name: 'Edge Cases', count: 23, status: 'detected' },
    ],
  },
  'data-extraction': {
    id: 'data-extraction',
    name: 'Data Extraction Task',
    description: 'Extract structured data from unstructured documents',
    projectId: '2',
    projectName: 'Data Extraction',
    initialAccuracy: 95,
    currentAccuracy: 96,
    status: 'Active',
    lastOptimized: '1 day ago',
    totalRuns: 89,
    successfulRuns: 85,
    categories: [
      { name: 'Inputs', count: 32, status: 'optimized' },
      { name: 'Prompts', count: 6, status: 'active' },
      { name: 'Evaluations', count: 4, status: 'pending' },
      { name: 'Edge Cases', count: 12, status: 'detected' },
    ],
  },
};

export default function TaskDetails() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();

  const task = mockTaskData[taskId as keyof typeof mockTaskData];

  if (!task) {
    return (
      <div className="min-h-full p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Task Not Found</h1>
          <p className="mt-2 text-muted-foreground">The requested task could not be found.</p>
          <Button onClick={() => navigate('/optimizer')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const improvement = task.currentAccuracy - task.initialAccuracy;
  const successRate = (task.successfulRuns / task.totalRuns) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimized': {
        return 'bg-green-100 text-green-800';
      }
      case 'active': {
        return 'bg-blue-100 text-blue-800';
      }
      case 'pending': {
        return 'bg-yellow-100 text-yellow-800';
      }
      case 'detected': {
        return 'bg-orange-100 text-orange-800';
      }
      default: {
        return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const handleNavigateToCategory = (category: string) => {
    navigate(`/optimizer/projects/${projectId}/tasks/${taskId}/${category.toLowerCase()}`);
  };

  return (
    <div className="min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/optimizer/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {task.projectName}
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button size="sm">
            <Play className="h-4 w-4 mr-2" />
            Run Optimization
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{task.name}</CardTitle>
                <p className="text-muted-foreground">{task.description}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {task.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{task.initialAccuracy}%</div>
                <div className="text-sm text-muted-foreground">Initial Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{task.currentAccuracy}%</div>
                <div className="text-sm text-muted-foreground">Current Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">+{improvement.toFixed(2)}%</div>
                <div className="text-sm text-muted-foreground">Improvement</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{successRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{task.currentAccuracy}%</span>
              </div>
              <Progress value={task.currentAccuracy} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {task.categories.map((category) => (
            <Card
              key={category.name}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleNavigateToCategory(category.name)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{category.count}</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(category.status)}`}>
                    {category.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <div className="font-medium">Optimization completed</div>
                  <div className="text-sm text-muted-foreground">Accuracy improved by +1.2%</div>
                </div>
                <div className="text-sm text-muted-foreground">{task.lastOptimized}</div>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <div className="font-medium">New edge cases detected</div>
                  <div className="text-sm text-muted-foreground">5 new edge cases identified</div>
                </div>
                <div className="text-sm text-muted-foreground">4 hours ago</div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">Evaluation metrics updated</div>
                  <div className="text-sm text-muted-foreground">Performance benchmarks refreshed</div>
                </div>
                <div className="text-sm text-muted-foreground">1 day ago</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
