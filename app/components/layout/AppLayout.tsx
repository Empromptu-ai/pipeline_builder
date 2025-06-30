import React, { type ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { appModeStore, type AppMode } from '~/lib/stores/appView';
import { MainNavigation } from './MainNavigation';
import { BuilderHeader } from './BuilderHeader';
import { OptimizerHeader } from './OptimizerHeader';

interface AppLayoutProps {
  children: ReactNode;
  mode?: AppMode;
}

export function AppLayout({ children, mode }: AppLayoutProps) {
  const currentMode = useStore(appModeStore);
  const activeMode = mode || currentMode;

  return (
    <div className="min-h-screen flex bg-bolt-elements-background-depth-2">
      {/* Left Navigation - Always Visible */}
      <MainNavigation />

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col">
        {/* Dynamic Header based on mode */}
        {activeMode === 'builder' ? <BuilderHeader /> : <OptimizerHeader />}

        {/* Main Content Area */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
