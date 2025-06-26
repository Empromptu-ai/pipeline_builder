import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useState } from 'react';
import { getAuthorizationUrl } from '~/lib/workos.server';
import { getUserSession, createUserSession } from '~/utils/session.server';
import { redirect } from '@remix-run/node';

export const meta: MetaFunction = () => {
  return [
    { title: 'Login - Emp2' },
    { name: 'description', content: 'Sign in to your account' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // If user is already logged in, redirect to home
  const userSession = await getUserSession(request);
  if (userSession) {
    return redirect('/');
  }

  // Get the authorization URL for Google OAuth
  const authorizationUrl = getAuthorizationUrl();
  
  return { authorizationUrl };
}

// Helper functions for analytics API integration
async function registerWithAnalytics(username: string, password: string, email: string) {
  try {
    const registerResponse = await fetch('http://analytics.empromptu.ai:5000/api/register_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    
    const [success, msg] = await registerResponse.json();
    if (!success) {
      throw new Error(msg || 'Registration failed');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Analytics registration error:', error);
    throw error;
  }
}

async function loginWithAnalytics(username: string, password: string) {
  try {
    const loginResponse = await fetch('http://analytics.empromptu.ai:5000/api/verify_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const [isGoodAccount, uid, apiKey] = await loginResponse.json();
    if (!isGoodAccount) {
      throw new Error('Invalid username or password');
    }
    
    return { uid, apiKey };
  } catch (error) {
    console.error('Analytics login error:', error);
    throw error;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('_action');
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const email = formData.get('email') as string;

  if (!username || !password) {
    return json({ error: 'Username and password are required' }, { status: 400 });
  }

  try {
    if (action === 'register') {
      if (!email) {
        return json({ error: 'Email is required for registration' }, { status: 400 });
      }

      // Register with analytics system
      await registerWithAnalytics(username, password, email);

      // After successful registration, automatically log in to analytics
      const { uid, apiKey } = await loginWithAnalytics(username, password);

      // Create a user session with analytics credentials
      // Note: This creates a session with analytics data, but WorkOS will handle the main auth
      const userSession = {
        userId: `analytics_${uid}`, // Temporary ID until WorkOS auth
        email,
        firstName: username,
        lastName: undefined,
        accessToken: 'temp', // Will be replaced by WorkOS
        refreshToken: 'temp', // Will be replaced by WorkOS
        analyticsUid: uid,
        analyticsApiKey: apiKey,
        analyticsUsername: username,
      };

      return createUserSession(userSession);

    } else if (action === 'login') {
      // Login with analytics system
      const { uid, apiKey } = await loginWithAnalytics(username, password);

      // Create a user session with analytics credentials
      const userSession = {
        userId: `analytics_${uid}`, // Temporary ID until WorkOS auth
        email: email || `${username}@analytics.local`, // Fallback email
        firstName: username,
        lastName: undefined,
        accessToken: 'temp', // Will be replaced by WorkOS
        refreshToken: 'temp', // Will be replaced by WorkOS
        analyticsUid: uid,
        analyticsApiKey: apiKey,
        analyticsUsername: username,
      };

      return createUserSession(userSession);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
    return json({ error: errorMessage }, { status: 500 });
  }

  return json({ error: 'Invalid action' }, { status: 400 });
}

export default function Login() {
  const { authorizationUrl } = useLoaderData<typeof loader>();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showTraditionalLogin, setShowTraditionalLogin] = useState(false);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showTraditionalLogin 
              ? (isRegistering ? 'Create Account' : 'Sign In')
              : 'Sign in to your account'
            }
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome to Emp2
          </p>
        </div>
        
        {!showTraditionalLogin ? (
          // Google OAuth Section
          <div className="mt-8 space-y-6">
            <div>
              <a
                href={authorizationUrl}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </span>
                Sign in with Google
              </a>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or</span>
              </div>
            </div>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowTraditionalLogin(true)}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                Sign in with existing analytics account
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        ) : (
          // Traditional Login Form Section
          <div className="mt-8 space-y-6">
            <Form method="post" className="space-y-6">
              <input
                type="hidden"
                name="_action"
                value={isRegistering ? 'register' : 'login'}
              />
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {isRegistering && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              {actionData?.error && (
                <div className="text-red-600 text-sm text-center">
                  {actionData.error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSubmitting
                  ? (isRegistering ? 'Creating Account...' : 'Signing In...')
                  : (isRegistering ? 'Create Account' : 'Sign In')
                }
              </button>
            </Form>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-indigo-600 hover:text-indigo-500 text-sm"
              >
                {isRegistering
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"
                }
              </button>
              
              <div>
                <button
                  type="button"
                  onClick={() => setShowTraditionalLogin(false)}
                  className="text-gray-600 hover:text-gray-500 text-sm"
                >
                  ← Back to Google sign in
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
