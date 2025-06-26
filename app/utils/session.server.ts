import { createCookieSessionStorage, redirect } from '@remix-run/node';
import { getUser, refreshAccessToken } from '~/lib/workos.server';
// import { getUserSecret } from '~/lib/secrets.server';

// if (!process.env.SESSION_SECRET) {
//   throw new Error('SESSION_SECRET is required');
// }

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
    // secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
  },
});

export interface UserSession {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  accessToken: string;
  refreshToken: string;
  // Analytics fields for backward compatibility
  analyticsUid?: string;
  analyticsApiKey?: string;
  analyticsUsername?: string;
}

export async function createUserSession(
  userSession: UserSession,
  redirectTo: string = '/'
) {
  const session = await sessionStorage.getSession();
  session.set('userSession', userSession);
  
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request): Promise<UserSession | null> {
  const cookie = request.headers.get('Cookie');
  const session = await sessionStorage.getSession(cookie);
  const userSession = session.get('userSession') as UserSession | undefined;
  
  if (!userSession) {
    return null;
  }

  // If this is a WorkOS session, enhance it with analytics data
  if (userSession.userId && !userSession.userId.startsWith('analytics_')) {
    try {
      // Try to refresh the user data from WorkOS
      const user = await getUser(userSession.userId);
      
      // Get analytics credentials from secrets
      // const analyticsUid = await getUserSecret(userSession.userId, 'analytics_uid');
      // const analyticsApiKey = await getUserSecret(userSession.userId, 'analytics_api_key');
      // const analyticsUsername = await getUserSecret(userSession.userId, 'analytics_username');
      
      // Update session with fresh user data and analytics info
      const updatedSession: UserSession = {
        ...userSession,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        // analyticsUid: analyticsUid || undefined,
        // analyticsApiKey: analyticsApiKey || undefined,
        // analyticsUsername: analyticsUsername || undefined,
      };

      return updatedSession;
    } catch (error) {
      // If user fetch fails, try to refresh the access token
      try {
        const { accessToken, refreshToken } = await refreshAccessToken(userSession.refreshToken);
        
        // Get analytics credentials from secrets
        // const analyticsUid = await getUserSecret(userSession.userId, 'analytics_uid');
        // const analyticsApiKey = await getUserSecret(userSession.userId, 'analytics_api_key');
        // const analyticsUsername = await getUserSecret(userSession.userId, 'analytics_username');
        
        const updatedSession: UserSession = {
          ...userSession,
          accessToken,
          refreshToken,
          // analyticsUid: analyticsUid || undefined,
          // analyticsApiKey: analyticsApiKey || undefined,
          // analyticsUsername: analyticsUsername || undefined,
        };

        return updatedSession;
      } catch (refreshError) {
        // If refresh also fails, clear the session
        console.error('Failed to refresh user session:', refreshError);
        return null;
      }
    }
  }

  // For analytics-only sessions (legacy), return as-is
  return userSession;
}

export async function requireUserSession(request: Request): Promise<UserSession> {
  const userSession = await getUserSession(request);
  
  if (!userSession) {
    throw redirect('/login');
  }
  
  return userSession;
}

export async function logout(request: Request) {
  const cookie = request.headers.get('Cookie');
  const session = await sessionStorage.getSession(cookie);
  
  return redirect('/login', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}
