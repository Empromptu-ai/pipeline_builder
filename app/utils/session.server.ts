// app/utils/session.server.ts
import { redirect } from '@remix-run/node';

// Simple in-memory storage for development
// NOTE: This will not persist across server restarts
const sessions = new Map<string, {
  username: string;
  uid: string;
  apiKey: string;
}>();

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function createUserSession(
  username: string,
  uid: string,
  apiKey: string,
  redirectTo: string = '/'
) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, { username, uid, apiKey });
  
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': `session=${sessionId}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}`,
    },
  });
}

export async function getUserSession(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return { username: null, uid: null, apiKey: null };
  }

  const sessionMatch = cookieHeader.match(/session=([^;]+)/);
  if (!sessionMatch) {
    return { username: null, uid: null, apiKey: null };
  }

  const sessionId = sessionMatch[1];
  const session = sessions.get(sessionId);
  
  if (!session) {
    return { username: null, uid: null, apiKey: null };
  }

  return session;
}

export async function requireUserSession(request: Request) {
  const userSession = await getUserSession(request);
  
  if (!userSession.username || !userSession.uid || !userSession.apiKey) {
    throw redirect('/login');
  }
  
  return userSession;
}

export async function logout(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      sessions.delete(sessionId);
    }
  }
  
  return redirect('/login', {
    headers: {
      'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0',
    },
  });
}