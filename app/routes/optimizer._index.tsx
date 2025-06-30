import React, { useState, useEffect } from 'react';
import DashboardView from '~/components/optimizer/DashboardView';
import { DashboardProjectsTasksList } from '~/components/optimizer/DashboardProjectsTasksList';
import { useNavigate } from '@remix-run/react';
import { useOverallStats } from '~/hooks/useOptimizer';
import { optimizerContextStore } from '~/lib/stores/appView';

export default function OptimizerDashboard() {
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const navigate = useNavigate();
  const { data: analytics, isLoading, error } = useOverallStats();

  useEffect(() => {
    optimizerContextStore.set({});
  }, []);

  const handleNavigateToProject = (projectId: string) => {
    navigate(`/optimizer/projects/${projectId}`);
  };

  const handleNavigateToTask = (projectId: string, taskId: string) => {
    navigate(`/optimizer/projects/${projectId}/tasks/${taskId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">Loading analytics...</div>
          <div className="text-sm text-muted-foreground mt-2">Please wait while we fetch your data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Error loading analytics</div>
          <div className="text-sm text-muted-foreground mt-2">{error}</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">No analytics data available</div>
          <div className="text-sm text-muted-foreground mt-2">Please check your configuration</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 space-y-8">
      <DashboardView
        analytics={analytics}
        onboardingOpen={onboardingOpen}
        handleNavigateToProject={handleNavigateToProject}
        handleNavigateToTask={handleNavigateToTask}
        setOnboardingOpen={setOnboardingOpen}
      />
      <DashboardProjectsTasksList
        analytics={analytics}
        handleNavigateToProject={handleNavigateToProject}
        handleNavigateToTask={handleNavigateToTask}
      />
    </div>
  );
}
