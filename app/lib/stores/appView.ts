import { atom } from 'nanostores';

export type AppView = 'builder' | 'optimizer';

export const appViewStore = atom<AppView>('builder');
