// app/utils/session.server.ts
import { redirect } from '@remix-run/node';

// Try to import the appropriate session storage based on environment
let createCookieSessionStorage: any;

try {
  // For Cloudflare deployment
  createCookieSessionStorage = require('@remix-run/cloudflare').createCookieSessionStorage;
} catch {
  // For Node.js development
  createCookieSessionStorage = require('@remix-run/node').createCookieSessionStorage;
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    secrets: ['your-secret-key-here'], // Change this to a secure secret
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

export async function createUserSession(
  username: string,
  uid: string,
  apiKey: string,
  redirectTo: string = '/'
) {
  const session = await sessionStorage.getSession();
  session.set('username', username);
  session.set('uid', uid);
  session.set('apiKey', apiKey);
  
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  
  return {
    username: session.get('username'),
    uid: session.get('uid'),
    apiKey: session.get('apiKey'),
  };
}

export async function requireUserSession(request: Request) {
  const userSession = await getUserSession(request);
  
  if (!userSession.username || !userSession.uid || !userSession.apiKey) {
    throw redirect('/login');
  }
  
  return userSession;
}

export async function logout(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  
  return redirect('/login', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}