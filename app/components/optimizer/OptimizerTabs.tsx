import React from 'react';
import { NavLink } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { optimizerContextStore } from '~/lib/stores/appView';
import { cn } from '~/lib/utils';

const tabItems = [
  { id: 'inputs', label: 'Inputs' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'evaluations', label: 'Evaluations' },
  { id: 'edge-cases', label: 'Edge Cases' },
];

export function OptimizerTabs() {
  const { projectId, taskId } = useStore(optimizerContextStore);

  if (!projectId || !taskId) {
    return (
      <aside className="w-48 border-r flex-shrink-0 transition-colors bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor">
        <div className="p-4 text-sm text-bolt-elements-textSecondary">
          Please select a project and task to see optimization options.
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-48 border-r flex-shrink-0 transition-colors bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor">
      <nav className="mt-4 space-y-1">
        {tabItems.map((tab) => (
          <NavLink
            key={tab.id}
            to={`/optimizer/projects/${projectId}/tasks/${taskId}/${tab.id}`}
            className={({ isActive }) =>
              cn(
                'w-full text-left block px-4 py-2 transition-colors text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary',
                isActive && 'bg-bolt-elements-background-depth-3 font-medium text-bolt-elements-textPrimary',
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
