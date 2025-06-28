import { atom } from 'nanostores';

export type AppMode = 'builder' | 'optimizer';
export type OptimizerTab = 'inputs' | 'prompts' | 'evaluations' | 'edge-cases';

export const appModeStore = atom<AppMode>('builder');

export const builderContextStore = atom<{
  projectId?: string;
  projectName?: string;
}>({});

export const optimizerContextStore = atom<{
  projectId?: string;
  projectName?: string;
  taskId?: string;
  activeTab?: OptimizerTab;
}>({});

// Legacy export for backward compatibility
export const appViewStore = appModeStore;
export type AppView = AppMode;
