import React, { type ReactNode } from 'react';
import { OptimizerTabs } from '~/components/optimizer/OptimizerTabs';

interface OptimizerLayoutProps {
  children: ReactNode;
}

export function OptimizerLayout({ children }: OptimizerLayoutProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <OptimizerTabs />
        <div className="flex-1 p-6 overflow-auto transition-colors bg-bolt-elements-background-depth-2">{children}</div>
      </div>
    </div>
  );
}
