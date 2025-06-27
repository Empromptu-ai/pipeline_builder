import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { WorkOS } from '@workos-inc/node';
import { createUserSession } from '~/utils/session.server';
import {
  registerWithAnalytics,
  loginWithAnalytics,
} from '~/routes/login';

// env vars you already have in lib/workos.server.ts
const workos = new WorkOS(process.env.WORKOS_API_KEY!);
const clientId = process.env.WORKOS_CLIENT_ID!;
const redirectUri = `${process.env.APP_ORIGIN}/auth/workos/callback`;




import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { WorkOS } from '@workos-inc/node';
import { createUserSession } from '~/utils/session.server';
import {
  registerWithAnalytics,
  loginWithAnalytics,
} from '~/routes/login';

export async function loader({ request }: LoaderFunctionArgs) {
  const url  = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) {
    throw json({ error: 'Missing code param' }, { status: 400 });
  }

  // 1 . Exchange code for profile and WorkOS tokens
  const { user, accessToken, refreshToken } =
    await workos.userManagement.authenticateWithCode({
      code,
      clientId,
      redirectUri,
    });

  const email    = user.email;
  const username =
    user.firstName?.trim()
      ? user.firstName.toLowerCase()
      : email.split('@')[0];

  // Stable throw-away password for analytics
  const pseudoPassword = `${email}-oauth`;

  // 2 . Try straight login first (user may already exist)
  let uid: string | undefined;
  let apiKey: string | undefined;
  try {
    ({ uid, apiKey } = await loginWithAnalytics(username, pseudoPassword));
  } catch {
    /* will handle below */
  }

  // 3 . If login failed, register then attempt again
  if (!uid || !apiKey) {
    const reg = await registerWithAnalytics(username, pseudoPassword, email);
    uid    = reg.uid;
    apiKey = reg.apiKey;

    // register did not return creds? retry verify_user a few times
    if (!uid || !apiKey) {
      for (const wait of [250, 750, 1500]) {
        await new Promise(r => setTimeout(r, wait));
        try {
          ({ uid, apiKey } = await loginWithAnalytics(username, pseudoPassword));
          if (uid && apiKey) break;
        } catch { /* keep trying */ }
      }
    }
  }

  if (!uid || !apiKey) {
    throw json(
      { error: 'Analytics account created but login failed (uid or apiKey still undefined)' },
      { status: 500 },
    );
  }

  console.log('userId:', user.id);
  // 4 . Build one session that contains both WorkOS and analytics info
  return createUserSession(
    {
      userId:        user.id,
      email,
      firstName:     user.firstName,
      lastName:      user.lastName,
      accessToken,
      refreshToken,
      analyticsUid:   uid,
      analyticsApiKey: apiKey,
      analyticsUsername: username,
    },
    '/',   // redirect home
  );
}














// export async function loader({ request }: LoaderFunctionArgs) {
//   const code = new URL(request.url).searchParams.get('code');
//  if (!code) throw json({ error: 'Missing code param' }, { status: 400 });
//
//  // 1. Exchange code for profile + tokens
//  const { user, accessToken, refreshToken } =
//    await workos.userManagement.authenticateWithCode({
//      code,
//      clientId,
//      redirectUri,
//    });          // :contentReference[oaicite:0]{index=0}

//  const email = user.email;
//  const username = user.firstName
//    ? user.firstName.toLowerCase()
//    : email.split('@')[0];

//  // 2. Give analytics a deterministic throw-away password
//  const pseudoPassword = `${email}-oauth`; // stable but never shown to user

//  let analyticsUid: string, analyticsApiKey: string;
//  try {
//    ({ uid: analyticsUid, apiKey: analyticsApiKey } =
//      await loginWithAnalytics(username, pseudoPassword));
//  } catch {
//    await registerWithAnalytics(username, pseudoPassword, email);
//    ({ uid: analyticsUid, apiKey: analyticsApiKey } =
//      await loginWithAnalytics(username, pseudoPassword));
//  }

//  // 3. One session to rule them all
//  return createUserSession(
//    {
//      userId: user.id,
//      email,
//      firstName: user.firstName,
//      lastName: user.lastName,
//      accessToken,
//      refreshToken,
//      analyticsUid,
//      analyticsApiKey,
//      analyticsUsername: username,
//    },
//    '/',    // land on the home page
//  );
//}
