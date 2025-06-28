import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { builderContextStore } from '~/lib/stores/appView';
import { webcontainer, extractAndDownloadFiles, deployToGitHub, deployToNetlify } from '~/lib/webcontainer';

export function DeployButtons() {
  const { projectId } = useStore(builderContextStore);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployingNetlify, setIsDeployingNetlify] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const container = await webcontainer;
      await extractAndDownloadFiles(container);
    } catch (e: any) {
      const error = e as Error;
      console.error('Download failed:', error);
      alert(`Download failed: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);

    try {
      const container = await webcontainer;
      const repo: any = await deployToGitHub(container);
      alert(`Successfully deployed to GitHub!\n\nOpen repository: ${repo.html_url}`);
      window.open(repo.html_url, '_blank');
    } catch (e: any) {
      const error = e as Error;
      console.error('GitHub deploy failed:', error);
      alert(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleNetlifyDeploy = async () => {
    setIsDeployingNetlify(true);

    try {
      const container = await webcontainer;
      const result: any = await deployToNetlify(container);

      const netlifyUrl = result.netlify.ssl_url || result.netlify.url;
      const message = `Successfully deployed!\n\nGitHub: ${result.github.html_url}\nNetlify: ${netlifyUrl}\n\nYour site is now live! GitHub integration is set up for future deployments.\n\nOpen live site?`;

      if (confirm(message)) {
        window.open(netlifyUrl, '_blank');
      }
    } catch (e: any) {
      const error = e as Error;
      console.error('Netlify deploy failed:', error);
      alert(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeployingNetlify(false);
    }
  };

  if (!projectId) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col space-y-2">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
      >
        {isDownloading ? 'Downloading...' : 'Download Project'}
      </button>
      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:bg-gray-600"
      >
        {isDeploying ? 'Deploying...' : 'Deploy to GitHub'}
      </button>
      <button
        onClick={handleNetlifyDeploy}
        disabled={isDeployingNetlify}
        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-md hover:from-teal-700 hover:to-teal-800 disabled:from-teal-400 disabled:to-teal-500 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        {isDeployingNetlify ? (
          <span className="flex items-center space-x-2">
            <span>⏳</span>
            <span>Deploying...</span>
          </span>
        ) : (
          <span className="flex items-center space-x-2">
            <span>🌐</span>
            <span>Deploy to Netlify</span>
          </span>
        )}
      </button>
    </div>
  );
}
