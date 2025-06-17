import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { appViewStore, type AppView } from '~/lib/stores/appView';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { Form } from '@remix-run/react';

export function LogoutButton() {
  return (
    <Form method="post" action="/logout" className="inline">
      <button
        type="submit"
        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
      >
        Logout
      </button>
    </Form>
  );
}

function AppSwitcher() {
  const currentView = useStore(appViewStore);
  
  const handleViewChange = (view: AppView) => {
    appViewStore.set(view);
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleViewChange('builder')}
        className={classNames(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          {
            'bg-white text-gray-900 shadow-sm': currentView === 'builder',
            'text-gray-600 hover:text-gray-900': currentView !== 'builder',
          }
        )}
      >
        Builder
      </button>
      <button
        onClick={() => handleViewChange('optimizer')}
        className={classNames(
          'px-4 py-2 text-sm font-medium rounded-md transition-colors',
          {
            'bg-white text-gray-900 shadow-sm': currentView === 'optimizer',
            'text-gray-600 hover:text-gray-900': currentView !== 'optimizer',
          }
        )}
      >
        Optimizer
      </button>
    </div>
  );
}

export function Header() {
  const chat = useStore(chatStore);
  
  return (
    <header
      className={classNames(
        'flex items-center bg-bolt-elements-background-depth-1 p-5 border-b h-[var(--header-height)]',
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,
        },
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-bolt-elements-textPrimary cursor-pointer">
          <div className="i-ph:sidebar-simple-duotone text-xl" />
          <a href="/" className="text-2xl font-semibold text-accent flex items-center">
            Empromptu
          </a>
        </div>
        <LogoutButton />
        
        {/* App Switcher */}
        <AppSwitcher />
        
        <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
          <ClientOnly>{() => <ChatDescription />}</ClientOnly>
        </span>
      </div>
      {chat.started && (
        <ClientOnly>
          {() => (
            <div className="mr-1">
              <HeaderActionButtons />
            </div>
          )}
        </ClientOnly>
      )}
    </header>
  );
}















// import { useStore } from '@nanostores/react';
// import { ClientOnly } from 'remix-utils/client-only';
// import { chatStore } from '~/lib/stores/chat';
// import { classNames } from '~/utils/classNames';
// import { HeaderActionButtons } from './HeaderActionButtons.client';
// import { ChatDescription } from '~/lib/persistence/ChatDescription.client';


// import { Form } from '@remix-run/react';

// export function LogoutButton() {
//   return (
//     <Form method="post" action="/logout" className="inline">
//       <button
//         type="submit"
//         className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
//       >
//         Logout
//       </button>
//     </Form>
//   );
// }

// export function Header() {
//   const chat = useStore(chatStore);

//   return (
//     <header
//       className={classNames(
//         'flex items-center bg-bolt-elements-background-depth-1 p-5 border-b h-[var(--header-height)]',
//         {
//           'border-transparent': !chat.started,
//           'border-bolt-elements-borderColor': chat.started,
//         },
//       )}
//     >
//       <div className="flex items-center gap-4">
//         <div className="flex items-center gap-2 text-bolt-elements-textPrimary cursor-pointer">
//           <div className="i-ph:sidebar-simple-duotone text-xl" />
//           <a href="/" className="text-2xl font-semibold text-accent flex items-center">
//             {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
//             Empromptu 
//           </a>
//         </div>
//         <LogoutButton />
//         <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
//           <ClientOnly>{() => <ChatDescription />}</ClientOnly>
//         </span>
//       </div>
//       {chat.started && (
//         <ClientOnly>
//           {() => (
//             <div className="mr-1">
//               <HeaderActionButtons />
//             </div>
//           )}
//         </ClientOnly>
//       )}
//     </header>
//   );
// }
