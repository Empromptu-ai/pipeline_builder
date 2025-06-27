import { WorkOS } from '@workos-inc/node';

if (!process.env.WORKOS_API_KEY) {
  throw new Error('WORKOS_API_KEY is required');
}

if (!process.env.WORKOS_CLIENT_ID) {
  throw new Error('WORKOS_CLIENT_ID is required');
}

export const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID;
export const WORKOS_REDIRECT_URI = process.env.WORKOS_REDIRECT_URI || 'http://localhost:3000/auth/callback';

// const clientId = process.env.WORKOS_CLIENT_ID!;
// const redirectUri = `${process.env.APP_ORIGIN}/auth/workos/callback`;

// export function getAuthorizationUrl() {
//   return workos.userManagement.getAuthorizationUrl({
//     clientId,
//     redirectUri,
//     provider: 'GoogleOAuth', // exact value WorkOS expects
//   });
// }


//export function getAuthorizationUrl() {
//  return workos.userManagement.getAuthorizationUrl({
//    // existing params…
//    clientId,
//    redirectUri: `${process.env.APP_ORIGIN}/auth/workos/callback`,
//    provider: 'google-oauth',
//  });
//}


// Helper function to get authorization URL for Google OAuth
export function getAuthorizationUrl() {
  return workos.userManagement.getAuthorizationUrl({
    provider: 'GoogleOAuth',
    clientId: WORKOS_CLIENT_ID,
    redirectUri: WORKOS_REDIRECT_URI,
  });
}

// Helper function to authenticate user with code
export async function authenticateUser(code: string) {
  try {
    const { user, accessToken, refreshToken } = await workos.userManagement.authenticateWithCode({
      code,
      clientId: WORKOS_CLIENT_ID,
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Helper function to get user by ID
export async function getUser(userId: string) {
  try {
    return await workos.userManagement.getUser(userId);
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

// Helper function to refresh access token
export async function refreshAccessToken(refreshToken: string) {
  try {
    const { accessToken, refreshToken: newRefreshToken } = await workos.userManagement.refreshAccessToken({
      refreshToken,
      clientId: WORKOS_CLIENT_ID,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    console.error('Refresh token error:', error);
    throw error;
  }
}
