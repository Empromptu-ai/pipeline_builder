import React from 'react';
import { useStore } from '@nanostores/react';
import { appModeStore, builderContextStore } from '~/lib/stores/appView';
import { Button } from '~/components/ui/button';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { DeployButtons } from './DeployButtons';

export function BuilderHeader() {
  const { projectId, projectName } = useStore(builderContextStore);

  const handleOptimizeClick = () => {
    appModeStore.set('optimizer');
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor">
      {/* Breadcrumb */}
      <div className="text-sm text-bolt-elements-textSecondary">
        {projectId ? (
          <>
            Projects &gt; <span className="font-medium">{projectName}</span> &gt;{' '}
            <span className="font-medium">Builder</span>
          </>
        ) : (
          'Projects'
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-4">
        <ThemeSwitch />
        {projectId && (
          <div className="flex items-center space-x-2">
            <Button onClick={handleOptimizeClick} className="bg-purple-600 hover:bg-purple-700 text-white">
              Optimize
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Publish / Re-build</Button>
            <DeployButtons />
          </div>
        )}
      </div>
    </header>
  );
}
