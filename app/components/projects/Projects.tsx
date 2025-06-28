import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from '@remix-run/react';
import type { ChatHistoryItem } from '~/lib/persistence';

export function Projects() {
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Dynamically import persistence logic only on the client
    import('~/lib/persistence').then(({ db, getAll }) => {
      if (db) {
        getAll(db)
          .then((list) => list.filter((item) => item.urlId && item.description))
          .then(setList)
          .catch((error) => toast.error(error.message));
      }
    });
  }, []);

  const handleProjectSelect = (item: ChatHistoryItem) => {
    // Dynamically import stores to set context
    import('~/lib/stores/appView').then(({ builderContextStore, optimizerContextStore }) => {
      builderContextStore.set({
        projectId: item.id,
        projectName: item.description,
      });
      optimizerContextStore.set({
        projectId: item.id,
        projectName: item.description,
        taskId: '1', // Default task ID
      });
      navigate(`/chat/${item.urlId}`);
    });
  };

  return (
    <div className="p-6 min-h-full transition-colors bg-bolt-elements-background-depth-2">
      <h1 className="text-2xl font-bold mb-4 text-bolt-elements-textPrimary">Projects</h1>
      <div className="space-y-2">
        {list.map((item) => (
          <button
            key={item.id}
            onClick={() => handleProjectSelect(item)}
            className="w-full text-left p-4 border rounded-lg transition-colors border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary"
          >
            <div className="font-semibold text-bolt-elements-textPrimary">{item.description}</div>
            <div className="text-sm text-bolt-elements-textSecondary">
              Last updated: {new Date(item.timestamp).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
