import React from 'react';
import { NavLink } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { optimizerContextStore } from '~/lib/stores/appView';
import { themeStore } from '~/lib/stores/theme';
import { cn } from '~/lib/utils';

const tabItems = [
  { id: 'inputs', label: 'Inputs' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'evaluations', label: 'Evaluations' },
  { id: 'edge-cases', label: 'Edge Cases' },
];

export function OptimizerTabs() {
  const { projectId, taskId } = useStore(optimizerContextStore);
  const theme = useStore(themeStore);

  if (!projectId || !taskId) {
    return (
      <aside
        className={`w-48 border-r flex-shrink-0 transition-colors ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className={`p-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Please select a project and task to see optimization options.
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`w-48 border-r flex-shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <nav className="mt-4 space-y-1">
        {tabItems.map((tab) => (
          <NavLink
            key={tab.id}
            to={`/optimizer/projects/${projectId}/tasks/${taskId}/${tab.id}`}
            className={({ isActive }) =>
              cn(
                'w-full text-left block px-4 py-2 transition-colors',
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100',
                isActive &&
                  (theme === 'dark' ? 'bg-gray-700 font-medium text-white' : 'bg-gray-100 font-medium text-gray-900'),
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
