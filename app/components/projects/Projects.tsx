import React from 'react';
import { useNavigate } from '@remix-run/react';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { useProjectList } from '~/hooks/useOptimizer';
import { deleteProject } from '~/lib/services/optimizer';
import { useUser } from '~/hooks/useUser';
import { toast } from 'react-toastify';
import { Plus, FolderOpen, ClipboardList, Folder } from 'lucide-react';

export function Projects() {
  const navigate = useNavigate();
  const user = useUser();
  const {
    query: { data: projectsList, isLoading, error },
    refetch,
  } = useProjectList();

  const handleOpenProject = (projectId: number) => {
    navigate(`/optimizer/projects/${projectId}`);
  };

  const handleNavigateToTask = (projectId: number, taskId: string) => {
    navigate(`/optimizer/projects/${projectId}/tasks/${taskId}`);
  };

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    if (!confirm(`Are you sure you want to delete the project "${projectName}"?`)) {
      return;
    }

    try {
      const success = await deleteProject(user.uid, projectId);

      if (success) {
        toast.success(`Project "${projectName}" deleted successfully`);
        refetch();
      } else {
        toast.error('Failed to delete project');
      }
    } catch (error) {
      toast.error('Failed to delete project');
      console.error('Error deleting project:', error);
    }
  };

  const handleCreateNoCodeProject = () => {
    toast.info('Create No Code Project functionality coming soon');
  };

  const handleCreateCodeProject = () => {
    toast.info('Create Code Project functionality coming soon');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `Created: ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}Z`;
  };

  if (isLoading) {
    return (
      <div className="p-6 min-h-full transition-colors bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary">
        <h1 className="text-2xl font-bold mb-2 text-bolt-elements-textPrimary">Projects</h1>
        <p className="text-bolt-elements-textSecondary mb-6">Manage your AI projects and their tasks</p>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-bolt-elements-textSecondary">Loading projects...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 min-h-full transition-colors bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary">
        <h1 className="text-2xl font-bold mb-2 text-bolt-elements-textPrimary">Projects</h1>
        <p className="text-bolt-elements-textSecondary mb-6">Manage your AI projects and their tasks</p>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-red-500">Error loading projects: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full transition-colors bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-bolt-elements-textPrimary">Projects</h1>
          <p className="text-bolt-elements-textSecondary">Manage your AI projects and their tasks</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleCreateNoCodeProject}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New No Code Project
          </Button>
          <Button
            onClick={handleCreateCodeProject}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Code Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {!projectsList || projectsList.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-bolt-elements-textSecondary mb-4">No projects found</p>
            <p className="text-sm text-bolt-elements-textSecondary">Create your first project to get started</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsList.map((project) => (
            <Card key={project.id} className="bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-bolt-elements-textPrimary">{project.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProject(project.id, project.name)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 h-auto text-xs"
                  >
                    Delete
                  </Button>
                </div>
                <p className="text-sm text-bolt-elements-textSecondary mt-1">
                  {project.description || 'No description provided'}
                </p>
                <p className="text-xs text-bolt-elements-textSecondary mt-2">{formatDate(project.created_at)}</p>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Tasks Section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="h-4 w-4 text-bolt-elements-textPrimary" />
                    <span className="text-sm font-medium text-bolt-elements-textPrimary">Tasks</span>
                  </div>
                  {project.tasks && project.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {project.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleNavigateToTask(project.id, task.id)}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-bolt-elements-background-depth-2 p-2 rounded transition-colors"
                        >
                          <ClipboardList className="h-3 w-3 text-blue-500" />
                          <span className="text-bolt-elements-textPrimary flex-1">{task.name}</span>
                          <Folder className="h-3 w-3 text-bolt-elements-textSecondary" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-bolt-elements-textSecondary italic">
                      No tasks yet. Create one to get started.
                    </p>
                  )}
                </div>

                {/* Open Project Button */}
                <Button
                  onClick={() => handleOpenProject(project.id)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  Open Project
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
