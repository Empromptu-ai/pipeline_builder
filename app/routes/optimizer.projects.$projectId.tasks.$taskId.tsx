import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

import {
  ArrowLeft,
  Settings,
  Play,
  SquarePen,
  Bot,
  LineChart,
  PanelLeftOpen,
  Boxes,
  BadgeAlert,
  Code,
  Copy,
  Check,
} from 'lucide-react';
import { Progress } from '~/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/Dialog';
import { getProject, getTask, deleteTask, getTaskCodeSnippet } from '~/lib/services/optimizer';
import { useUser } from '~/hooks/useUser';
import { useOverallStats } from '~/hooks/useOptimizer';
import { optimizerContextStore } from '~/lib/stores/appView';
import type { Project, Task } from '~/lib/services/optimizer';
import { toast } from 'react-toastify';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeCollapsed, setCodeCollapsed] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !taskId || !userId) {
        return;
      }

      try {
        setLoading(true);

        const [projectData, taskData] = await Promise.all([getProject(userId, projectId), getTask(userId, taskId)]);

        if (projectData && taskData) {
          setProject(projectData);

          // Update optimizer context store with project and task info
          optimizerContextStore.set({
            projectId,
            projectName: projectData.name,
            taskId,
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

  const handleDelete = async () => {
    try {
      if (!taskId || !userId) {
        return;
      }

      await deleteTask(userId, taskId);
      setShowDeleteConfirm(false);

      setTimeout(() => {
        navigate(`/optimizer/projects/${projectId}`);
      }, 300);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const copyCodeSnippet = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    toast.success('Code copied to clipboard', {
      position: 'bottom-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchCodeSnippet = async () => {
      if (!userId || !taskId) {
        return;
      }

      try {
        // TODO: to do replace with real api key for prod
        const mockApiKey = 'your-api-key';
        const result = await getTaskCodeSnippet(userId, taskId, mockApiKey);

        if (result?.text) {
          setCodeSnippet(result.text);
        } else {
          setCodeSnippet('// No code snippet available');
        }
      } catch (error) {
        console.error('Failed to load code snippet:', error);
        setCodeSnippet('// Error loading code snippet');
      }
    };

    fetchCodeSnippet();
  }, [userId, taskId]);

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
          {/* <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button size="sm">
            <Play className="h-4 w-4 mr-2" />
            Run Optimization
          </Button> */}
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
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                        <SquarePen className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <p className="text-muted-foreground">{task.description || 'No description'}</p>
                  </div>
                )}
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
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

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center py-3 px-3 hover:bg-purple-50 hover:border-purple-300 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                asChild
              >
                <Link to={`/optimizer/prompts/${projectId}/${taskId}`}>
                  <Bot className="h-6 w-6 mb-2" />
                  <span className="text-xs whitespace-normal text-center">Prompt Optimization</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center py-3 px-3 hover:bg-purple-50 hover:border-purple-300 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                asChild
              >
                <Link to={`/optimizer/projects/${projectId}/tasks/${taskId}/inputs`}>
                  <PanelLeftOpen className="h-6 w-6 mb-2" />
                  <span className="text-xs whitespace-normal text-center">Input Optimization</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center py-3 px-3 hover:bg-purple-50 hover:border-purple-300 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                asChild
              >
                <Link to={`/optimizer/projects/${projectId}/tasks/${taskId}/models`}>
                  <Boxes className="h-6 w-6 mb-2" />
                  <span className="text-xs whitespace-normal text-center">Model Optimization</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center py-3 px-3 hover:bg-purple-50 hover:border-purple-300 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                asChild
              >
                <Link to={`/optimizer/projects/${projectId}/tasks/${taskId}/edge-cases`}>
                  <BadgeAlert className="h-6 w-6 mb-2" />
                  <span className="text-xs whitespace-normal text-center">Edge Case Detection</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center py-3 px-3 hover:bg-purple-50 hover:border-purple-300 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                asChild
              >
                <Link to={`/optimizer/projects/${projectId}/tasks/${taskId}/evaluations`}>
                  <LineChart className="h-6 w-6 mb-2" />
                  <span className="text-xs whitespace-normal text-center">Evaluations</span>
                </Link>
              </Button>
            </div>
            <div className="pt-4 flex justify-center">
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Task
              </Button>
            </div>
          </CardContent>
        </Card>

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

        <div className="mt-6 pt-4">
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setCodeCollapsed(!codeCollapsed)}
                >
                  <Code className="h-4 w-4 text-primary" />
                  <span className="font-medium">Integration Code</span>
                </div>
                <Button variant="ghost" size="icon" onClick={copyCodeSnippet} className="h-8 w-8">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div
                className={`transition-all duration-700 ease-in-out overflow-hidden ${!codeCollapsed ? 'max-h-[2000px]' : 'max-h-0'}`}
              >
                <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                  <pre>{codeSnippet}</pre>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Add this code to your application to connect with Empromptu
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the task and all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
