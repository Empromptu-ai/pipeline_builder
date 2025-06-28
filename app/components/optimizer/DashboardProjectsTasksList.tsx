import { Card } from '~/components/ui/card';
import { CardHeader } from '~/components/ui/card';
import { CardTitle } from '~/components/ui/card';
import { CardContent } from '~/components/ui/card';
import { TableHeader, TableHead, TableBody, TableRow, TableCell, Table } from '~/components/ui/table';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { ArrowUpRight } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';

interface OverviewAnalytics {
  initial_accuracy: number;
  current_accuracy: number;
  task_scores: Array<{
    task_id: string;
    initial_accuracy: number;
    current_accuracy: number;
  }>;
}

interface Task {
  id: string;
  name: string;
  initialAccuracy?: number | null;
  currentAccuracy?: number | null;
}

interface DashboardProjectsTasksListProps {
  analytics: OverviewAnalytics;
  handleNavigateToProject: (projectId: string) => void;
  handleNavigateToTask: (projectId: string, taskId: string) => void;
}

import { useProjectList } from '~/hooks/useOptimizer';

const DashboardProjectsTasksList = ({
  analytics,
  handleNavigateToProject,
  handleNavigateToTask,
}: DashboardProjectsTasksListProps) => {
  const {
    query: { data: projectsList, isLoading },
  } = useProjectList();

  const projectsAnalytics = useMemo(() => {
    if (isLoading || !projectsList || !analytics || projectsList.length === 0) {
      return [];
    }

    return projectsList.map((proj) => {
      const missingTaskData = {
        initial_accuracy: null,
        current_accuracy: null,
      };
      const tasks = proj.tasks.map((task) => {
        const data = analytics.task_scores.find((t) => t.task_id === task.id) || missingTaskData;
        return {
          ...task,
          initialAccuracy: data.initial_accuracy,
          currentAccuracy: data.current_accuracy,
        };
      });

      const initialAccuracyValues = tasks.filter((t) => t.initialAccuracy != null);
      const initialAccuracy =
        initialAccuracyValues.length > 0
          ? initialAccuracyValues.reduce((acc, val) => acc + (val.initialAccuracy || 0), 0) /
            initialAccuracyValues.length
          : 0;

      const currentAccuracyValues = tasks.filter((t) => t.currentAccuracy != null);
      const currentAccuracy =
        currentAccuracyValues.length > 0
          ? currentAccuracyValues.reduce((acc, val) => acc + (val.currentAccuracy || 0), 0) /
            currentAccuracyValues.length
          : 0;

      return {
        ...proj,
        initialAccuracy,
        currentAccuracy,
        tasks,
      };
    });
  }, [isLoading, projectsList, analytics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Projects & Tasks</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Projects & Tasks</h2>
      <div className="space-y-6">
        {projectsAnalytics.map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Current Accuracy:</span>
                    <span className="font-semibold text-green-600">
                      {project.currentAccuracy != null ? project.currentAccuracy.toFixed(2) : 'N/A'}%
                    </span>
                    <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      {project.initialAccuracy != null && project.currentAccuracy != null
                        ? (project.currentAccuracy - project.initialAccuracy).toFixed(2)
                        : 'N/A'}
                      %
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleNavigateToProject(project.id.toString())}>
                    Project Details
                  </Button>
                </div>
              </div>
              <Progress value={project.currentAccuracy != null ? project.currentAccuracy : 0} className="h-2 mt-2" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right">Initial Accuracy</TableHead>
                    <TableHead className="text-right">Current Accuracy</TableHead>
                    <TableHead className="text-right">Improvement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.name}</TableCell>
                      <TableCell className="text-right">
                        {task.initialAccuracy != null ? task.initialAccuracy.toFixed(2) : 'N/A'}%
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {task.currentAccuracy != null ? task.currentAccuracy.toFixed(2) : 'N/A'}%
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full inline-flex items-center">
                          <ArrowUpRight className="h-3 w-3 mr-0.5" />
                          {task.initialAccuracy != null && task.currentAccuracy != null
                            ? (task.currentAccuracy - task.initialAccuracy).toFixed(2)
                            : 'N/A'}
                          %
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNavigateToTask(project.id.toString(), task.id)}
                        >
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
        ))}
      </div>
    </div>
  );
};

export default DashboardProjectsTasksList;
