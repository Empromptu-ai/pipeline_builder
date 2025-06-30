import React, { useState, useEffect } from 'react';
import { Card } from '~/components/ui/card';
import { CardHeader } from '~/components/ui/card';
import { CardTitle } from '~/components/ui/card';
import { CardContent } from '~/components/ui/card';
import { CardDescription } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ArrowLeft, Plus, FolderOpen, ListChecks } from 'lucide-react';
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

interface Task {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  tasks: Task[];
}

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);

        const response = await fetch(`/api/project/details?projectId=${projectId}`);
        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error('Error fetching project details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  const handleCreateTask = async () => {
    if (newTaskName.trim() && projectId) {
      // This would be connected to your task creation API
      console.log('Creating task:', { name: newTaskName, description: newTaskDescription });

      setNewTaskName('');
      setNewTaskDescription('');
      setDialogOpen(false);
    }
  };

  const handleOpenTask = (taskId: string) => {
    console.log('Opening task:', taskId);

    // Navigate to task details
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading project details...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Project Not Found</h1>
          <p>The requested project could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-muted-foreground">{project.description}</p>
        {project.created_at && (
          <p className="text-sm text-muted-foreground mt-1">
            Created: {new Date(project.created_at).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task to {project.name}.</DialogDescription>
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
              <Button onClick={handleCreateTask}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {project.tasks.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-lg">
          <ListChecks className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">No tasks yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by creating your first task for this project.
          </p>
          <Button className="mt-4 gap-1" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.tasks.map((task) => (
            <Card
              key={task.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleOpenTask(task.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ListChecks className="h-5 w-5 mr-2 text-primary" />
                  {task.name}
                </CardTitle>
                {task.description && <CardDescription>{task.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Button variant="default" className="w-full gap-1">
                  <FolderOpen className="h-4 w-4" />
                  Open Task
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
