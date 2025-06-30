import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { ArrowLeft, ExternalLink, Plus } from 'lucide-react';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '~/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/Dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { getProject, createTask } from '~/lib/services/optimizer';
import { useUser } from '~/hooks/useUser';
import { useOverallStats } from '~/hooks/useOptimizer';
import { optimizerContextStore } from '~/lib/stores/appView';
import type { Project } from '~/lib/services/optimizer';

interface TaskWithAccuracy {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  initialAccuracy?: number | null;
  currentAccuracy?: number | null;
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { uid: userId } = useUser();
  const [project, setProject] = useState<Project | null>(null);
  const [tasksWithAccuracy, setTasksWithAccuracy] = useState<TaskWithAccuracy[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createTaskLoading, setCreateTaskLoading] = useState(false);
  const { data: analytics } = useOverallStats();

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !userId) {
        return;
      }

      try {
        setLoading(true);

        const projectData = await getProject(userId, projectId);
        setProject(projectData);

        // Update optimizer context store with project info
        if (projectData) {
          optimizerContextStore.set({
            projectId,
            projectName: projectData.name,
          });
        }

        // Merge project tasks with analytics data
        if (projectData && analytics) {
          const tasksWithAccuracyData = projectData.tasks.map((task) => {
            const taskAnalytics = analytics.task_scores.find((t) => t.task_id === task.id);
            return {
              ...task,
              initialAccuracy: taskAnalytics?.initial_accuracy || null,
              currentAccuracy: taskAnalytics?.current_accuracy || null,
            };
          });
          setTasksWithAccuracy(tasksWithAccuracyData);
        } else {
          setTasksWithAccuracy(projectData?.tasks || []);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, userId, analytics]);

  if (loading) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading project details...</div>
          <div className="text-sm text-muted-foreground mt-2">Please wait while we fetch your data</div>
        </div>
      </div>
    );
  }

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

  const handleCreateTask = async () => {
    if (!newTaskName.trim() || !projectId || !userId) {
      return;
    }

    try {
      setCreateTaskLoading(true);

      const result = await createTask(userId, projectId, newTaskName.trim(), newTaskDescription.trim() || null);

      if (result) {
        setNewTaskName('');
        setNewTaskDescription('');
        setDialogOpen(false);

        const updatedProject = await getProject(userId, projectId);

        if (updatedProject) {
          setProject(updatedProject);

          if (analytics) {
            const tasksWithAccuracyData = updatedProject.tasks.map((task) => {
              const taskAnalytics = analytics.task_scores.find((t) => t.task_id === task.id);
              return {
                ...task,
                initialAccuracy: taskAnalytics?.initial_accuracy || null,
                currentAccuracy: taskAnalytics?.current_accuracy || null,
              };
            });
            setTasksWithAccuracy(tasksWithAccuracyData);
          } else {
            setTasksWithAccuracy(updatedProject.tasks);
          }
        }
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setCreateTaskLoading(false);
    }
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(() => {
                    const validTasks = tasksWithAccuracy.filter((task) => task.initialAccuracy != null);

                    if (validTasks.length === 0) {
                      return '0.00%';
                    }

                    const average =
                      validTasks.reduce((acc, task) => acc + (task.initialAccuracy || 0), 0) / validTasks.length;

                    return isNaN(average) ? '0.00%' : `${average.toFixed(2)}%`;
                  })()}
                </div>
                <div className="text-sm text-muted-foreground">Average Initial Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(() => {
                    const validTasks = tasksWithAccuracy.filter((task) => task.currentAccuracy != null);

                    if (validTasks.length === 0) {
                      return '0.00%';
                    }

                    const average =
                      validTasks.reduce((acc, task) => acc + (task.currentAccuracy || 0), 0) / validTasks.length;

                    return isNaN(average) ? '0.00%' : `${average.toFixed(2)}%`;
                  })()}
                </div>
                <div className="text-sm text-muted-foreground">Average Current Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{tasksWithAccuracy.length}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Progress</span>
                <span className="text-sm font-medium">
                  {(() => {
                    const validTasks = tasksWithAccuracy.filter((task) => task.currentAccuracy != null);

                    if (validTasks.length === 0) {
                      return '0.00%';
                    }

                    const average =
                      validTasks.reduce((acc, task) => acc + (task.currentAccuracy || 0), 0) / validTasks.length;

                    return isNaN(average) ? '0.00%' : `${average.toFixed(2)}%`;
                  })()}
                </span>
              </div>
              <Progress
                value={(() => {
                  const validTasks = tasksWithAccuracy.filter((task) => task.currentAccuracy != null);

                  if (validTasks.length === 0) {
                    return 0;
                  }

                  const average =
                    validTasks.reduce((acc, task) => acc + (task.currentAccuracy || 0), 0) / validTasks.length;

                  return isNaN(average) ? 0 : average;
                })()}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tasks</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1 bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Add a new task to {project?.name}.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="task-name">Task Name</Label>
                      <Input
                        id="task-name"
                        placeholder="Enter task name"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-desc">Description (optional)</Label>
                      <Input
                        id="task-desc"
                        placeholder="Brief description of the task"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateTask}
                      disabled={!newTaskName.trim() || createTaskLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {createTaskLoading ? 'Creating...' : 'Create Task'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
                {tasksWithAccuracy.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>{task.description || 'No description'}</TableCell>
                    <TableCell className="text-right">
                      {task.initialAccuracy != null ? `${task.initialAccuracy.toFixed(2)}%` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {task.currentAccuracy != null ? `${task.currentAccuracy.toFixed(2)}%` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {task.initialAccuracy != null && task.currentAccuracy != null ? (
                        <span className="text-green-600 font-medium">
                          +{(task.currentAccuracy - task.initialAccuracy).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Active</span>
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
