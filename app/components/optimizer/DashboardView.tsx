import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Activity, Target } from 'lucide-react';
import MetricCard from './MetricCard';
import { type FC } from 'react';

interface OverviewAnalytics {
  initial_accuracy: number;
  current_accuracy: number;
  task_scores: Array<{
    task_id: string;
    initial_accuracy: number;
    current_accuracy: number;
  }>;
}

interface DashboardViewProps {
  analytics: OverviewAnalytics | null;
  onboardingOpen: boolean;
  handleNavigateToProject: (projectId: string) => void;
  handleNavigateToTask: (projectId: string, taskId: string) => void;
  setOnboardingOpen: (open: boolean) => void;
}

const DashboardView: FC<DashboardViewProps> = ({
  onboardingOpen: _onboardingOpen,
  handleNavigateToProject: _handleNavigateToProject,
  handleNavigateToTask: _handleNavigateToTask,
  setOnboardingOpen: _setOnboardingOpen,
  analytics,
}) => {
  const averageImprovement = analytics ? analytics.current_accuracy - analytics.initial_accuracy : 0;
  return (
    <div className="space-y-6">
      {/* Section 1: Overall Metrics */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Overall Performance</h2>

        {/* Top Row: Initial Accuracy and Current Accuracy only */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Initial Accuracy"
            value={`${analytics?.initial_accuracy.toFixed(0)}%`}
            description="baseline performance"
            icon={<Target className="h-4 w-4" />}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800/30"
          />
          <MetricCard
            title="Current Accuracy"
            value={`${analytics?.current_accuracy.toFixed(0)}%`}
            description="across all projects"
            icon={<Activity className="h-4 w-4" />}
            change={Math.round(averageImprovement)}
            trend="up"
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800/30"
          />
        </div>

        {/* Second Row: Average Improvement and Next Recommended Task */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Average Improvement Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Average Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 flex items-center">
                  +{averageImprovement?.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Across all your projects</div>
              </div>
            </CardContent>
          </Card>
          {/* Next Recommended Task Card */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="text-base">Next Recommended Task</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-start justify-center py-4">
                <div className="text-xl font-semibold mb-1">
                  Optimize RAG System
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  Estimated +10% potential improvement
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full flex items-center"
                  onClick={() => setOnboardingOpen(true)}
                >
                  View details <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
