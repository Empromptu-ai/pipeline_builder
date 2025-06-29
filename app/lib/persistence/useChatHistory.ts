import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { atom } from 'nanostores';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { getMessages, getNextId, getUrlId, openDatabase, setMessages } from './db';

// import { sessionUid  } from '~/lib/.server/llm/prompts';
import { sessionUid } from '~/lib/stores/session';

export const projectId = atom<number | undefined>(undefined);

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const db = persistenceEnabled ? await openDatabase() : undefined;

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

export function useChatHistory() {
  const { id: mixedId, user } = useLoaderData<{ id?: string; user?: any }>();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!db) {
      setReady(true);

      if (persistenceEnabled) {
        toast.error(`Chat persistence is unavailable`);
      }

      return;
    }

    if (mixedId) {
      getMessages(db, mixedId)
        .then((storedMessages) => {
          if (storedMessages && storedMessages.messages.length > 0) {
            setInitialMessages(storedMessages.messages);
            setUrlId(storedMessages.urlId);
            description.set(storedMessages.description);
            chatId.set(storedMessages.id);
          } else {
            navigate(`/`, { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    }
  }, []);

  return {
    ready: !mixedId || ready,
    initialMessages,
    storeMessageHistory: async (messages: Message[]) => {
      if (!db || messages.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;

      if (!urlId && firstArtifact?.id) {
        const urlId = await getUrlId(db, firstArtifact.id);

        navigateChat(urlId);
        setUrlId(urlId);
      }

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);

        // NOTE: This is where the project title gets set, so we need to 
        // make a corrresponding project in the Optimizer.

        try {
          // Call projects API
          const response = await fetch('https://analytics.empromptu.ai/api/projects/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${user.analyticsUid}`,
            },
            body: JSON.stringify({
              name: firstArtifact.title,
              description: '',
              code: true,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            // Store the project_id from the returned array
            if (result && result.length > 0 && result[0].project_id) {
              projectId.set(result[0].project_id);
              console.log('Project created with ID:', result[0].project_id);
            }
          } else {
            console.error('API call failed:', response.status, response.statusText);
            toast.error('Failed to create project');
          }
        } catch (error) {
          console.error('API call error:', error);
          toast.error('Error creating project');
        }
        console.log('getting sessionId');
        const currentsessionUid = sessionUid.get();
        console.log('got sessionId:', currentsessionUid);

        // Call project/user logger API
        const response_rp = await fetch('https://staging.impromptu-labs.com/api_tools/record_project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.analyticsUid}`,
          },
          body: JSON.stringify({
            project_name: firstArtifact.title,
            project_id: projectId.get(),
            session_uid: currentsessionUid,
            user_api_key: user.analyticsApiKey,
            user_name: user.analyticsUsername,
            user_id: user.analyticsUid,
          }),
        });

        if (response_rp.ok) {
          const result_rp = await response_rp.json();
          // Store the project_id from the returned array
          if (result_rp && result_rp.length > 0) {
            console.log('Project and user details recorded:', result_rp);
          }
        } else {
          console.error('API call failed:', response_rp.status, response_rp.statusText);
          toast.error('Failed to create project');
        }
      }

        /*
         * NEW - Also add to URL -
         * const url = new URL(window.location.href);
         * url.searchParams.set('desc', firstArtifact.title);
         * window.history.replaceState({}, '', url);
         */
      //}

      if (initialMessages.length === 0 && !chatId.get()) {
        const nextId = await getNextId(db);

        chatId.set(nextId);

        if (!urlId) {
          navigateChat(nextId);
        }
      }

      await setMessages(db, chatId.get() as string, messages, urlId, description.get());
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
