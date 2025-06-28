import React, { type ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';
import { OptimizerTabs } from '~/components/optimizer/OptimizerTabs';

interface OptimizerLayoutProps {
  children: ReactNode;
}

export function OptimizerLayout({ children }: OptimizerLayoutProps) {
  const theme = useStore(themeStore);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <OptimizerTabs />
        <div className={`flex-1 p-6 overflow-auto transition-colors ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
