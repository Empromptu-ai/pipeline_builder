import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';
import { AppLayout } from '~/components/layout/AppLayout';
import { Projects } from '~/components/projects/Projects';
import { LoadingDots } from '~/components/ui/LoadingDots';

function ProjectsFallback() {
  const theme = useStore(themeStore);

  return (
    <div
      className={`p-6 min-h-full transition-colors ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
    >
      <h1 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Projects</h1>
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
