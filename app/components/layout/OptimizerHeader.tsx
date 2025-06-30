import React from 'react';
import { useStore } from '@nanostores/react';
import { optimizerContextStore } from '~/lib/stores/appView';
import { Button } from '~/components/ui/button';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';

export function OptimizerHeader() {
  const { projectName, taskId } = useStore(optimizerContextStore);

  const getHeaderText = () => {
    if (!projectName) {
      return 'Optimization: No Project Selected';
    }

    if (taskId) {
      return `Optimization: ${projectName} > Task Details`;
    }

    return `Optimization: ${projectName}`;
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b transition-colors bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor text-bolt-elements-textPrimary">
      {/* Context */}
      <div className="flex items-center">
        <span className="font-medium text-bolt-elements-textPrimary">{getHeaderText()}</span>
      </div>

      {/* Action Button */}
      <div className="flex items-center space-x-4">
        <ThemeSwitch />
        {/* <Button 
          className="bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text"
          onClick={() => {
            console.log('Run Optimization clicked');
            
            // TODO: Implement optimization logic
          }}
        >
          Run Optimization
        </Button> */}
      </div>
    </header>
  );
}
