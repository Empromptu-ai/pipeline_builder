import React from 'react';
import { TabsList, TabsTrigger } from '~/components/ui/tabs';
import { PilcrowRight, Users2 } from 'lucide-react';

export default function InputOptimizationNav() {
  return (
    <TabsList className="grid w-full grid-cols-3">
      <TabsTrigger value="overview" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
        Overview
      </TabsTrigger>
      <TabsTrigger
        value="manual"
        className="flex items-center gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
      >
        <PilcrowRight className="h-4 w-4" />
        Manual Inputs
      </TabsTrigger>
      <TabsTrigger
        value="end-user"
        className="flex items-center gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
      >
        <Users2 className="h-4 w-4" />
        End User Inputs
      </TabsTrigger>
    </TabsList>
  );
}
