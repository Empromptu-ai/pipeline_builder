// app/routes/login.tsx
import { json, type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Form, useActionData, useNavigation } from '@remix-run/react';
import { useState } from 'react';
import { createUserSession, getUserSession } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await getUserSession(request);
  
  // If user is already logged in, redirect to main page
  if (userSession.username && userSession.uid && userSession.apiKey) {
    return redirect('/');
  }
  
  return json({});
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

      const registerResponse = await fetch('http://analytics.empromptu.ai:5000/api/register_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email }),
      });

      const [success, msg] = await registerResponse.json();
      
      if (!success) {
        return json({ error: msg || 'Registration failed' }, { status: 400 });
      }

      // After successful registration, automatically log in
      const loginResponse = await fetch('http://analytics.empromptu.ai:5000/api/verify_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const [isGoodAccount, uid, apiKey] = await loginResponse.json();
      
      if (!isGoodAccount) {
        return json({ error: 'Account created but login failed' }, { status: 400 });
      }

      return createUserSession(username, uid, apiKey);
      
    } else if (action === 'login') {
      const loginResponse = await fetch('http://analytics.empromptu.ai:5000/api/verify_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const [isGoodAccount, uid, apiKey] = await loginResponse.json();
      
      if (!isGoodAccount) {
        return json({ error: 'Invalid username or password' }, { status: 400 });
      }

      return createUserSession(username, uid, apiKey);
    }
  } catch (error) {
    return json({ error: 'Network error. Please try again.' }, { status: 500 });
  }

  return json({ error: 'Invalid action' }, { status: 400 });
}

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            {isRegistering ? 'Create Account' : 'Sign In'}
          </h2>
        </div>
        
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting 
              ? (isRegistering ? 'Creating Account...' : 'Signing In...') 
              : (isRegistering ? 'Create Account' : 'Sign In')
            }
          </button>
        </Form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-600 hover:text-blue-500 text-sm"
          >
            {isRegistering 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Create one"
            }
          </button>
        </div>
      </div>
    </div>
  );
}