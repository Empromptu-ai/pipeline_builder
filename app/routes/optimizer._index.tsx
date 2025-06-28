import React from 'react';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';

export default function OptimizerDashboard() {
  const theme = useStore(themeStore);

  return (
    <div
      className={`min-h-full p-6 transition-colors ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
    >
      <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
        Optimization Dashboard
      </h1>
      <p className={`mt-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
        Welcome to the optimization workspace. Select a project to get started.
      </p>
    </div>
  );
}
