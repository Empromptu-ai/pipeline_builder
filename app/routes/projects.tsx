import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { AppLayout } from '~/components/layout/AppLayout';
import { Projects } from '~/components/projects/Projects';
import { LoadingDots } from '~/components/ui/LoadingDots';

function ProjectsFallback() {
  return (
    <div className="p-6 min-h-full transition-colors bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary">
      <h1 className="text-2xl font-bold mb-4 text-bolt-elements-textPrimary">Projects</h1>
      <LoadingDots text="Loading Projects..." />
    </div>
  );
}

export default function ProjectsRoute() {
  return (
    <AppLayout>
      <ClientOnly fallback={<ProjectsFallback />}>{() => <Projects />}</ClientOnly>
    </AppLayout>
  );
}
