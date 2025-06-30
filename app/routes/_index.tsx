import { json, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { AppLayout } from '~/components/layout/AppLayout';
import { Header } from '~/components/header/Header';
import { appViewStore } from '~/lib/stores/appView';
import { requireUserSession, type UserSession } from '~/utils/session.server';
import { setSessionUid } from '~/lib/stores/session';
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';

export const meta: MetaFunction = () => {
  return [{ title: 'Emp2' }, { name: 'description', content: 'Talk with the AI assistant' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  // This will redirect to /login if user is not authenticated

  const userSession = await requireUserSession(request);

  //console.log('Now in the Loader, UserSession = ', userSession);

  const sessionUid = userSession.sessionUid;

  setSessionUid(sessionUid); // Global set for sessionUid (TODO: prune this if not strictly necessary)

  return json({
    user: userSession,
    sessionUid, // This is for sending the same value to the client side, since remix cannot do both at the same time.
  });
}

// for an iframe-based auto-login to the Optimizer (now deprecated)
interface OptimizerViewProps {
  userSession: UserSession;
}

function OptimizerView({ userSession }: OptimizerViewProps) {
  // Build the iframe URL with authentication parameters
  console.log('Time to auto-login, UserSession:', userSession.userId);

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

  // console.log('Back from the loader, sessionUid is:', sessionUid);

  const currentView = useStore(appViewStore);

  return (
    <AppLayout>
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </AppLayout>
  );
}
