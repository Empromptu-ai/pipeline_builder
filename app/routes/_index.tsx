// import { json, type MetaFunction } from '@remix-run/cloudflare';
// import { ClientOnly } from 'remix-utils/client-only';
// import { BaseChat } from '~/components/chat/BaseChat';
// import { Chat } from '~/components/chat/Chat.client';
// import { Header } from '~/components/header/Header';

// export const meta: MetaFunction = () => {
//   return [{ title: 'Emp2' }, { name: 'description', content: 'Talk with the AI assistant' }];
// };

// export const loader = () => json({});

// export default function Index() {
//   return (
//     <div className="flex flex-col h-full w-full">
//       <Header />
//       <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
//     </div>
//   );
// }

import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { useLoaderData } from '@remix-run/react';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { requireUserSession } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Emp2' }, { name: 'description', content: 'Talk with the AI assistant' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // This will redirect to /login if user is not authenticated
  const userSession = await requireUserSession(request);
  
  return json({
    user: userSession
  });
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}