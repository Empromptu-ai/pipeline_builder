import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { ClientOnly } from 'remix-utils/client-only';
import { useLoaderData } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { appViewStore } from '~/lib/stores/appView';
import { requireUserSession, type UserSession } from '~/utils/session.server';
import { setSessionUid } from '~/lib/stores/session';
import { useEffect } from "react"; 
// import { getUserSecret, storeApiResponseAsSecrets } from '~/lib/secrets.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'Emp2' }, 
    { name: 'description', content: 'Talk with the AI assistant' }
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // This will redirect to /login if user is not authenticated
  const userSession = await requireUserSession(request);
  console.log('Now in the Loader, UserSession = ', userSession);
  // Example: Get some stored secrets for the user
  // const apiKey = await getUserSecret(userSession.userId, 'api_key');
  // const customSetting = await getUserSecret(userSession.userId, 'custom_setting');

  // Generate the session UID here (for app disambiguation)
  const sessionUid = Math.random().toString(36).substring(2) + Date.now().toString(36);

  // also add this to the session in case we can't get it any other way
  userSession.sessionUid = sessionUid

  setSessionUid(sessionUid); // Set it globally (or as globally as a trashfire like remix can manage, this is server-side)
  
  //better send it in a cookie too because apparently remix declared multiple server environments that also can't communicate
  const cookieHeader = request.headers.get('Cookie');
  const cookies = cookie.parse(cookieHeader || '');

  return json({
    user: userSession,
    sessionUid // This is for sending the same value to the client side, since remix cannot do both at the same time.
    // userSecrets: {
    //  apiKey,
    //  customSetting,
    //}
  },
  //and here's the cookie too, because remix can't comminicate betweeen any of its dozen-odd layers, or with 
  // any of its many dozens of libraries.
  {
    headers: {
      'Set-Cookie': cookie.serialize('sessionUid', sessionUid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 24 hours
      })
    }
  }

);
}

interface OptimizerViewProps {
  userSession: UserSession;
}

function OptimizerView({ userSession }: OptimizerViewProps) {
  // Build the iframe URL with authentication parameters
  console.log('Finally, time to auto-login, UserSession:', userSession.userId);
  // const iframeSrc = `https://analytics.empromptu.ai/?autoLogin=true&username=${encodeURIComponent(userSession.email)}&uid=${encodeURIComponent(userSession.userId)}&email=${encodeURIComponent(userSession.email)}`;
  const iframeSrc = `https://analytics.empromptu.ai/?autoLogin=true&username=${encodeURIComponent(userSession.analyticsUsername)}&uid=${encodeURIComponent(userSession.analyticsUid)}&&apiKey=${encodeURIComponent(userSession.analyticsApiKey)}`;
  
  return (
    <div className="flex-1 relative">
      <iframe
        src={iframeSrc}
        className="w-full h-full border-0"
        title="Optimizer App"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
      />
    </div>
  );
}

export default function Index() {
  const { user, sessionUid } = useLoaderData<typeof loader>();
  // Set it once when the component mounts
  useEffect(() => {
    setSessionUid(sessionUid);
  }, [sessionUid]);
  console.log('Back from the loader, sessionUid is:', sessionUid);
  console.log('Back from the loader, user is:', user.userId);
  console.log('Back from the loader, appViewStore is:', appViewStore);
  const currentView = useStore(appViewStore);
  console.log('Made current View:', currentView);


  console.log('Now in the Index function, UserSession:', user.userId);
  console.log('And the whole UserSession:', user);

  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      {currentView === 'builder' ? (
        <ClientOnly fallback={<BaseChat />}>
          {() => <Chat />}
        </ClientOnly>
      ) : (
        <OptimizerView userSession={user} />
      )}
    </div>
  );
}

// Example action to demonstrate calling external API and storing secrets
// export async function action({ request }: LoaderFunctionArgs) {
//   const userSession = await requireUserSession(request);
//   const formData = await request.formData();
//   const action = formData.get('action');
// 
//   if (action === 'fetch-and-store-api-data') {
//     try {
//       // Example: Call external API
//       const response = await fetch('https://jsonplaceholder.typicode.com/users/1');
//       const apiData = await response.json();
//       
//       // Store the API response as secrets
//       const results = await storeApiResponseAsSecrets(
//         userSession.userId,
//         apiData,
//         'user_profile'
//       );
//       
//       return json({ success: true, results });
//     } catch (error) {
//       return json({ success: false, error: error.message }, { status: 500 });
//     }
//   }
//   
//   return json({ success: false, error: 'Unknown action' }, { status: 400 });
// }
