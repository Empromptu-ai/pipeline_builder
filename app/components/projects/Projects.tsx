import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { themeStore } from '~/lib/stores/theme';
import type { ChatHistoryItem } from '~/lib/persistence';

export function Projects() {
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const navigate = useNavigate();
  const theme = useStore(themeStore);

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
    <div className={`p-6 min-h-full transition-colors ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <h1 className={`text-2xl font-bold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Projects</h1>
      <div className="space-y-2">
        {list.map((item) => (
          <button
            key={item.id}
            onClick={() => handleProjectSelect(item)}
            className={`w-full text-left p-4 border rounded-lg transition-colors ${
              theme === 'dark'
                ? 'border-gray-700 bg-gray-800 hover:bg-gray-700 text-white'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            <div className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
              {item.description}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Last updated: {new Date(item.timestamp).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
