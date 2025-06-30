import React from 'react';
import { NavLink } from '@remix-run/react';
import { cn } from '~/lib/utils';

const navigationItems = [
  // { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'projects', label: 'Projects', href: '/projects' },
  { id: 'builder', label: 'Builder', href: '/' },
  { id: 'optimization', label: 'Optimization', href: '/optimizer' },
  { id: 'settings', label: 'Settings', href: '/settings' },
];

export function MainNavigation() {
  return (
    <nav className="w-64 bg-bolt-elements-background-depth-1 border-r border-bolt-elements-borderColor flex-shrink-0">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center px-6 font-bold text-xl text-bolt-elements-textPrimary">
        <img src="/logo.svg" alt="Logo" className="h-8 w-auto mr-3" />
        Empromptu
      </div>

      {/* Navigation Items */}
      <ul className="mt-6 space-y-2">
        {navigationItems.map((item) => (
          <li key={item.id}>
            <NavLink
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'block px-6 py-2 text-bolt-elements-textSecondary hover:bg-purple-50 hover:text-black-700 transition-colors',
                  isActive && 'bg-purple-100 text-black-700 font-medium',
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
