import React from 'react';
import { useStore } from '@nanostores/react';
import { optimizerContextStore } from '~/lib/stores/appView';
import { themeStore } from '~/lib/stores/theme';
import { Button } from '~/components/ui/button';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';

export function OptimizerHeader() {
  const { projectName } = useStore(optimizerContextStore);
  const theme = useStore(themeStore);

  return (
    <header
      className={`h-16 px-6 flex items-center justify-between border-b transition-colors ${
        theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}
    >
      {/* Context */}
      <div className="flex items-center">
        <span className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
          Optimization: {projectName || 'No Project Selected'}
        </span>
      </div>

      {/* Action Button */}
      <div className="flex items-center space-x-4">
        <ThemeSwitch />
        <Button className="bg-green-600 hover:bg-green-700 text-white">Run Optimization</Button>
      </div>
    </header>
  );
}
