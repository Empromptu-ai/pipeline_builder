import React from 'react';

export default function Settings() {
  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-0 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-2">Settings</h1>
          <p className="text-bolt-elements-textSecondary">Configure your Empromptu settings</p>
        </div>

        {/* Settings Card */}
        <div className="bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">Settings</h2>
            <p className="text-bolt-elements-textSecondary mb-6">Customize your Empromptu experience</p>
          </div>

          <p className="text-blue-600">This page is under construction. Check back soon for more features!</p>
        </div>
      </div>
    </div>
  );
}
