import { type LoaderFunctionArgs } from '@remix-run/node';
import { authenticateUser } from '~/lib/workos.server';
import { createUserSession } from '~/utils/session.server';
// import { storeUserSecret } from '~/lib/secrets.server';

// Helper functions for analytics API integration
async function createAnalyticsAccount(email: string, workosUserId: string) {
  try {
    // Generate a username based on email and WorkOS ID
    // const username = `${email.split('@')[0]}_${workosUserId.slice(-8)}`;
    // const password = `temp_${workosUserId}_${Date.now()}`; // Temporary password
    const username = `${email.split('@')[0]}_${workosUserId.slice(-8)}`.toLowerCase();
    const password = `temp_${workosUserId}`.toLowerCase();    

    console.log('Registering user...');
    console.log('Registration request payload:', { username, password, email });

    const registerResponse = await fetch('http://analytics.empromptu.ai:5000/api/register_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    
    console.log('Register response status:', registerResponse.status);
   



    //  const [success, msg] = await registerResponse.json();
    const registerData = await registerResponse.json();
    console.log('Raw register response JSON:', registerData);
    console.log('Type of registerData:', typeof registerData);
    console.log('Is array?', Array.isArray(registerData));

    // Try the same pattern as traditional login:
    const [success, ...rest] = registerData;
    console.log('Registration success:', success);
    console.log('Registration rest:', rest);





    if (!success) {
      throw new Error(msg || 'Analytics registration failed');
    }


    // Check if UID and API key were returned directly from registration:
    if (rest.length >= 2) {
      const [uid, apiKey] = rest;
      console.log('Got UID and API key from registration:', uid, apiKey);
      return { uid, apiKey, username, password };
    }

    // If not, continue with login attempt...
    console.log('No UID/API key from registration, attempting login...');

    
    
    // Now login to get the UID and API key
    console.log('Logging in...');
    console.log('Login request payload:', { username, password });
    const loginResponse = await fetch('http://analytics.empromptu.ai:5000/api/verify_user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });


    console.log('Login response status:', loginResponse.status);

    const loginData = await loginResponse.json();
    console.log('Raw login response JSON:', loginData);
    console.log('Type of loginData:', typeof loginData);
    console.log('Is array?', Array.isArray(loginData));

    const [isGoodAccount, uid, apiKey] = loginData;
    console.log('Destructured values -> isGoodAccount:', isGoodAccount, 'uid:', uid, 'apiKey:', apiKey);
    // const [isGoodAccount, uid, apiKey] = await loginResponse.json();
    
    console.log('UID:', uid);
    console.log('API Key:', apiKey);
    if (!isGoodAccount) {
      throw new Error('Analytics account created but login failed');
    }
    
    return { uid, apiKey, username, password };
  } catch (error) {
    console.error('Analytics account creation error:', error);
    throw error;
  }
}

async function findExistingAnalyticsAccount(email: string) {
  try {
    // Try to find existing account by attempting login with common patterns
    // This is a simplified approach - you might need to adjust based on your analytics API
    const commonUsernames = [
      email.split('@')[0],
      email,
      email.replace('@', '_at_').replace('.', '_')
    ];
    
    for (const username of commonUsernames) {
      try {
        // We can't verify without password, so this is a limitation
        // You might need to add an API endpoint to check if username/email exists
        // For now, we'll create a new account if user came via WorkOS
        break;
      } catch (error) {
        continue;
      }
    }
    
    return null; // No existing account found
  } catch (error) {
    console.error('Error finding existing analytics account:', error);
    return null;
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    throw new Response('Authentication failed', { status: 400 });
  }

  if (!code) {
    throw new Response('Missing authorization code', { status: 400 });
  }

  try {
    // Authenticate user with WorkOS
    const { user, accessToken, refreshToken } = await authenticateUser(code);
    
    console.log('WorkOS user authenticated:', user.email);

    // Try to find or create analytics account
    let analyticsData;
    try {
      // For new WorkOS users, create analytics account automatically
      analyticsData = await createAnalyticsAccount(user.email, user.id);
      console.log('Analytics account created for new user:', analyticsData.username);
      console.log('UserId is:', user.id);
      console.log('User Email is:', user.email);

    } catch (analyticsError) {
      console.error('Failed to create analytics account:', analyticsError);
      // Continue without analytics integration - user can set it up later
      analyticsData = null;
    }

    console.log('userId about to become session:', user.id);
    // Create user session
    const userSession = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      accessToken,
      refreshToken,
      analyticsUid: analyticsData.uid,
      analyticsApiKey: analyticsData.apiKey,
      analyticsUsername: analyticsData.username,
      //analyticsPassword: analyticsData.password
    };

    console.log('WE MADE A SESSION:', user.email);

    // Store analytics credentials as secrets if successful
    // Edit: turns out there is no secrets vault in Ba Sing Se. Just keep stuff in the session.
    // if (analyticsData) {
    //  try {
    //    // await storeUserSecret(user.id, 'analytics_uid', analyticsData.uid, 'Analytics system user ID');
    //    // await storeUserSecret(user.id, 'analytics_api_key', analyticsData.apiKey, 'Analytics system API key');
    //    // await storeUserSecret(user.id, 'analytics_username', analyticsData.username, 'Analytics system username');
    //    // await storeUserSecret(user.id, 'analytics_password', analyticsData.password, 'Analytics system password');
    //    
    //    console.log('Analytics credentials not stored for user, consider remaking this:', user.email);
    //  } catch (secretError) {
    //    console.error('Failed to store analytics credentials:', secretError);
    //  }
    //}

    // Create session and redirect to home
    // return createUserSession(userSession, '/');
    return createUserSession(userSession);
  } catch (error) {
    console.error('Authentication failed:', error);
    throw new Response('Authentication failed', { status: 500 });
  }
}

// This component should never render since we always redirect
export default function AuthCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
        <p className="mt-2 text-sm text-gray-500">Setting up your analytics account...</p>
      </div>
    </div>
  );
}
