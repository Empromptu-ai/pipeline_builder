// app/hooks/useUser.ts
import { useRouteLoaderData } from '@remix-run/react';

type UserSession = {
  username: string;
  uid: string;
  apiKey: string;
};

type IndexLoaderData = {
  user: UserSession;
};

export function useUser(): UserSession {
  // Development override - provide mock user data
  if (import.meta.env.VITE_USE_DEV_OVERRIDE === 'true') {
    return {
      username: 'user',
      uid: 'user',
      apiKey: 'test',
    };
  }

  const data = useRouteLoaderData<IndexLoaderData>('root') || useRouteLoaderData<IndexLoaderData>('routes/_index');

  if (!data?.user) {
    throw new Error('User session not found. Make sure you are authenticated.');
  }

  return data.user;
}

// Alternative: Direct hook if you pass user data through the root loader
export function useOptionalUser(): UserSession | null {
  // Development override - provide mock user data
  if (import.meta.env.VITE_USE_DEV_OVERRIDE === 'true') {
    return {
      username: 'Dev User',
      uid: 'user_dev',
      apiKey: 'dev_api_key',
    };
  }

  const data = useRouteLoaderData<IndexLoaderData>('root') || useRouteLoaderData<IndexLoaderData>('routes/_index');

  return data?.user || null;
}
