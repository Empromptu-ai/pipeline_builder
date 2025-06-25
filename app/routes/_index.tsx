import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { ClientOnly } from 'remix-utils/client-only';
import { useLoaderData } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { appViewStore } from '~/lib/stores/appView';
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

function OptimizerView() {
  return (
    <div className="flex-1 relative">
      <iframe
        src="https://analytics.empromptu.ai/"
        className="w-full h-full border-0"
        title="Optimizer App"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
      />
    </div>
  );
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  const currentView = useStore(appViewStore);
  
  return (
    <div className="flex flex-col h-full w-full">
      <Header />
      {currentView === 'builder' ? (
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      ) : (
        <OptimizerView />
      )}
    </div>
  );
}

// // app/routes/_index.tsx
// import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
// import { ClientOnly } from 'remix-utils/client-only';
// import { useLoaderData } from '@remix-run/react';
// import { BaseChat } from '~/components/chat/BaseChat';
// import { Chat } from '~/components/chat/Chat.client';
// import { Header } from '~/components/header/Header';
// import { requireUserSession } from '~/utils/session.server';

// export const meta: MetaFunction = () => {
//   return [{ title: 'Emp2' }, { name: 'description', content: 'Talk with the AI assistant' }];
// };

// export async function loader({ request }: LoaderFunctionArgs) {
//   // This will redirect to /login if user is not authenticated
//   const userSession = await requireUserSession(request);
  
//   return json({
//     user: userSession
//   });
// }

// export default function Index() {
//   const { user } = useLoaderData<typeof loader>();
  
//   return (
//     <div className="flex flex-col h-full w-full">
//       <Header />
//       <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
//     </div>
//   );
// }
