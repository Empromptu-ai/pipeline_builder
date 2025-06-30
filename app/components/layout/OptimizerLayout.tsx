import React, { type ReactNode } from 'react';
import { OptimizerTabs } from '~/components/optimizer/OptimizerTabs';

interface OptimizerLayoutProps {
  children: ReactNode;
}

export function OptimizerLayout({ children }: OptimizerLayoutProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1">
        {/* <OptimizerTabs /> */}
        <div className="flex-1 overflow-auto transition-colors bg-bolt-elements-background-depth-2">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
