import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { AppLayout } from '~/components/layout/AppLayout';
import { requireUserSession } from '~/utils/session.server';

// import { getUserSecret, storeApiResponseAsSecrets } from '~/lib/secrets.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Emp2' }, { name: 'description', content: 'Talk with the AI assistant' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // This will redirect to /login if user is not authenticated
  await requireUserSession(request);
  return json({});
}

export default function Index() {
  return (
    <AppLayout>
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </AppLayout>
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
