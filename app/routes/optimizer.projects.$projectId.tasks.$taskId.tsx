import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

import { ArrowLeft, Settings, Play, BarChart3, SquarePen } from 'lucide-react';
import { Progress } from '~/components/ui/progress';
import { getProject, getTask } from '~/lib/services/optimizer';
import { useUser } from '~/hooks/useUser';
import { useOverallStats } from '~/hooks/useOptimizer';
import { optimizerContextStore } from '~/lib/stores/appView';
import type { Project, Task } from '~/lib/services/optimizer';

interface TaskWithAccuracy extends Task {
  initialAccuracy?: number | null;
  currentAccuracy?: number | null;
  projectName?: string;
}

export default function TaskDetails() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { uid: userId } = useUser();
  const { data: analytics } = useOverallStats();
  const [task, setTask] = useState<TaskWithAccuracy | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !taskId || !userId) return;
      
      try {
        setLoading(true);
        const [projectData, taskData] = await Promise.all([
          getProject(userId, projectId),
          getTask(userId, taskId)
        ]);
        
        if (projectData && taskData) {
          setProject(projectData);
          
          // Update optimizer context store with project and task info
          optimizerContextStore.set({
            projectId: projectId,
            projectName: projectData.name,
            taskId: taskId,
          });
          
          // Merge task with analytics data
          const taskAnalytics = analytics?.task_scores.find((t) => t.task_id === taskId);
          const taskWithAccuracy: TaskWithAccuracy = {
            ...taskData,
            initialAccuracy: taskAnalytics?.initial_accuracy || null,
            currentAccuracy: taskAnalytics?.current_accuracy || null,
            projectName: projectData.name,
          };
          
          setTask(taskWithAccuracy);
          setTaskName(taskData.name);
          setTaskDescription(taskData.description || '');
        }
      } catch (error) {
        console.error('Error fetching task data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, taskId, userId, analytics]);

  const handleSaveChanges = async () => {
    // TODO: Implement task update functionality
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading task details...</div>
          <div className="text-sm text-muted-foreground mt-2">Please wait while we fetch your data</div>
        </div>
      </div>
    );
  }

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



  return (
    <div className="min-h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/optimizer/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {task.projectName || 'Project'}
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
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      className="text-2xl font-bold h-auto py-1"
                    />
                    <div className="space-y-2">
                      <textarea
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        className="w-full p-2 border rounded-md resize-none"
                        rows={3}
                        placeholder="Task description..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveChanges}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTaskName(task.name);
                          setTaskDescription(task.description || '');
                          setIsEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {task.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsEditing(true)}
                      >
                        <SquarePen className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <p className="text-muted-foreground">{task.description || 'No description'}</p>
                  </div>
                )}
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {task.initialAccuracy != null ? `${task.initialAccuracy.toFixed(2)}%` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Initial Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {task.currentAccuracy != null ? `${task.currentAccuracy.toFixed(2)}%` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Current Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {task.initialAccuracy != null && task.currentAccuracy != null
                    ? `+${(task.currentAccuracy - task.initialAccuracy).toFixed(2)}%`
                    : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Improvement</div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{task.currentAccuracy != null ? `${task.currentAccuracy.toFixed(2)}%` : 'N/A'}</span>
              </div>
              <Progress value={task.currentAccuracy || 0} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Inputs</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">-</div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  pending
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Prompts</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">-</div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  pending
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Evaluations</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">-</div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  pending
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Edge Cases</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">-</div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  pending
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Task Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Task ID</div>
                  <div className="font-medium">{task.id}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{new Date(task.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Has Events</div>
                <div className="font-medium">{task.any_events ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
