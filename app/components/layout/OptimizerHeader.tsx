import React from 'react';
import { useStore } from '@nanostores/react';
import { optimizerContextStore } from '~/lib/stores/appView';
import { Button } from '~/components/ui/button';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';

export function OptimizerHeader() {
  const { projectName } = useStore(optimizerContextStore);

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b transition-colors bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor text-bolt-elements-textPrimary">
      {/* Context */}
      <div className="flex items-center">
        <span className="font-medium text-bolt-elements-textPrimary">
          Optimization: {projectName || 'No Project Selected'}
        </span>
      </div>

      {/* Action Button */}
      <div className="flex items-center space-x-4">
        <ThemeSwitch />
        <Button className="bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text">
          Run Optimization
        </Button>
      </div>
    </header>
  );
}
