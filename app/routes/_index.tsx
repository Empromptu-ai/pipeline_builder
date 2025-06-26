import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { ClientOnly } from 'remix-utils/client-only';
import { useLoaderData } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { appViewStore } from '~/lib/stores/appView';
import { requireUserSession, type UserSession } from '~/utils/session.server';
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
  
  // Example: Get some stored secrets for the user
  // const apiKey = await getUserSecret(userSession.userId, 'api_key');
  // const customSetting = await getUserSecret(userSession.userId, 'custom_setting');
  
  return json({
    user: userSession,
    // userSecrets: {
    //  apiKey,
    //  customSetting,
    //}
  });
}

interface OptimizerViewProps {
  userSession: UserSession;
}

function OptimizerView({ userSession }: OptimizerViewProps) {
  // Build the iframe URL with authentication parameters
  const iframeSrc = `https://analytics.empromptu.ai/?autoLogin=true&username=${encodeURIComponent(userSession.email)}&uid=${encodeURIComponent(userSession.userId)}&email=${encodeURIComponent(userSession.email)}`;
  
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
  const { user, userSecrets } = useLoaderData<typeof loader>();
  const currentView = useStore(appViewStore);

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
