import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import path from 'node:path';
import JSZip from 'jszip';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

// GitHub API configuration
interface GitHubConfig {
  token: string;
  username: string;
  repoName: string;
}

// Helper function to download a blob
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Function to check if a file should be excluded from GitHub deployment
function shouldExcludeFromGitHub(filePath: string): boolean {
  const excludePatterns = [
    'node_modules',
    '.git',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    '.env',
    '.env.local',
    '.env.production',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    '.cache',
    '.temp',
    '.tmp'
  ];
  
  return excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

// Function to extract all files from WebContainer (your existing logic)
export async function extractFiles(container: WebContainer, forGitHub: boolean = false): Promise<Map<string, string | Uint8Array>> {
  try {
    console.log('Starting file extraction...');
    
    // Recursively collect all file paths
    const allFilePaths = [];
    async function collectFiles(dirPath) {
      const entries = await container.fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile()) {
          // Filter out large/unnecessary files for GitHub deployment
          if (forGitHub && shouldExcludeFromGitHub(fullPath)) {
            console.log(`Skipping file for GitHub: ${fullPath}`);
            continue;
          }
          allFilePaths.push(fullPath);
        } else if (entry.isDirectory()) {
          // Skip excluded directories entirely for GitHub
          if (forGitHub && shouldExcludeFromGitHub(fullPath)) {
            console.log(`Skipping directory for GitHub: ${fullPath}`);
            continue;
          }
          await collectFiles(fullPath);
        }
      }
    }
    await collectFiles(process.cwd());
    
    console.log(`Found ${allFilePaths.length} files to process`);
    
    // Create a map to store file contents
    const fileContents = new Map<string, string | Uint8Array>();

    // Read all files
    for (const file_path of allFilePaths) {    
      console.log(`Processing File Path: ${file_path}`);
      if (!file_path) continue;

      try {
        const content = await container.fs.readFile(file_path, 'utf8');
        
        // Check file size for GitHub (GitHub has a 100MB limit per file, but let's be conservative)
        if (forGitHub && typeof content === 'string' && content.length > 1000000) { // 1MB limit for text files
          console.warn(`Skipping large file for GitHub: ${file_path} (${content.length} chars)`);
          continue;
        }
        
        fileContents.set(file_path, content);
        console.log(`Read text file: ${file_path} (${content.length} chars)`);
      } catch (error) {
        // Try reading as binary if UTF8 fails
        try {
          const content = await container.fs.readFile(file_path);
          
          // Check binary file size for GitHub
          if (forGitHub && content.length > 1000000) { // 1MB limit for binary files
            console.warn(`Skipping large binary file for GitHub: ${file_path} (${content.length} bytes)`);
            continue;
          }
          
          fileContents.set(file_path, content);
          console.log(`Read binary file: ${file_path} (${content.length} bytes)`);
        } catch (binaryError) {
          console.warn(`Failed to read file: ${file_path}`, binaryError);
        }
      }
    }
    
    console.log(`Successfully extracted ${fileContents.size} files`);
    return fileContents;
    
  } catch (error) {
    console.error('Failed to extract files:', error);
    throw error;
  }
}

// Function to extract all files from WebContainer and download as ZIP (your existing function)
export async function extractAndDownloadFiles(container: WebContainer) {
  const fileContents = await extractFiles(container, false);
  
  const zip = new JSZip();
  
  fileContents.forEach((content, path) => {
    // Remove work directory prefix and leading slash for ZIP structure
    const cleanPath = path.replace(`/${WORK_DIR_NAME}/`, '').replace(/^\//, '');
    zip.file(cleanPath, content);
  });
  
  // Generate ZIP and download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, 'bolt-project.zip');
  
  return fileContents;
}

// Function to create GitHub repository and upload files
export async function deployToGitHub(container: WebContainer, config?: Partial<GitHubConfig>) {
  try {
    console.log('Starting GitHub deployment...');
    
    // Get configuration from environment variables or user input
    const finalConfig = await getGitHubConfig(config);
    if (!finalConfig) {
      throw new Error('GitHub deployment cancelled');
    }
    
    // Extract files using existing logic, but filter for GitHub
    const fileContents = await extractFiles(container, true);
    
    console.log(`Deploying ${fileContents.size} files to GitHub...`);
    
    // Create repository
    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: finalConfig.repoName,
        description: 'Project deployed from WebContainer',
        private: false,
        auto_init: true,
      }),
    });

    if (!createRepoResponse.ok) {
      const error = await createRepoResponse.json();
      throw new Error(`Failed to create repository: ${error.message}`);
    }

    const repo = await createRepoResponse.json();
    console.log(`Repository created: ${repo.html_url}`);

    // Wait a moment for repo to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the main branch SHA (needed for creating commits)
    const branchResponse = await fetch(`https://api.github.com/repos/${finalConfig.username}/${finalConfig.repoName}/git/refs/heads/main`, {
      headers: {
        'Authorization': `Bearer ${finalConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!branchResponse.ok) {
      throw new Error(`Failed to get branch info: ${branchResponse.statusText}`);
    }

    const branchData = await branchResponse.json();
    const baseSha = branchData.object.sha;

    // Create tree with all files
    const tree = [];
    let processedFiles = 0;
    
    for (const [filePath, content] of fileContents) {
      const cleanPath = filePath.replace(`/${WORK_DIR_NAME}/`, '').replace(/^\//, '');
      
      if (!cleanPath || cleanPath === '') {
        console.warn(`Skipping file with empty path: ${filePath}`);
        continue;
      }

      console.log(`Processing file for GitHub: ${cleanPath}`);
      
      try {
        // Convert content to base64 for GitHub API
        let base64Content: string;
        if (typeof content === 'string') {
          base64Content = btoa(unescape(encodeURIComponent(content)));
        } else {
          // For binary content
          const binaryString = Array.from(content, byte => String.fromCharCode(byte)).join('');
          base64Content = btoa(binaryString);
        }

        tree.push({
          path: cleanPath,
          mode: '100644',
          type: 'blob',
          content: base64Content,
          encoding: 'base64',
        });
        
        processedFiles++;
        
        // GitHub API has limits, so let's batch if we have too many files
        if (tree.length > 100) {
          console.warn('Too many files for single commit, truncating to first 100 files');
          break;
        }
        
      } catch (error) {
        console.warn(`Failed to process file ${cleanPath}:`, error);
      }
    }

    console.log(`Created tree with ${tree.length} files`);

    if (tree.length === 0) {
      throw new Error('No files to deploy - all files may have been filtered out or failed to process');
    }

    // Create tree
    const treeResponse = await fetch(`https://api.github.com/repos/${finalConfig.username}/${finalConfig.repoName}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tree,
        base_tree: baseSha,
      }),
    });

    if (!treeResponse.ok) {
      const error = await treeResponse.json();
      throw new Error(`Failed to create tree: ${error.message}`);
    }

    const treeData = await treeResponse.json();

    // Create commit
    const commitResponse = await fetch(`https://api.github.com/repos/${finalConfig.username}/${finalConfig.repoName}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Deploy project from WebContainer (${processedFiles} files)`,
        tree: treeData.sha,
        parents: [baseSha],
      }),
    });

    if (!commitResponse.ok) {
      const error = await commitResponse.json();
      throw new Error(`Failed to create commit: ${error.message}`);
    }

    const commitData = await commitResponse.json();

    // Update main branch to point to new commit
    const updateRefResponse = await fetch(`https://api.github.com/repos/${finalConfig.username}/${finalConfig.repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${finalConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: commitData.sha,
      }),
    });

    if (!updateRefResponse.ok) {
      const error = await updateRefResponse.json();
      throw new Error(`Failed to update branch: ${error.message}`);
    }

    console.log(`Successfully deployed ${processedFiles} files to GitHub: ${repo.html_url}`);
    return repo;

  } catch (error) {
    console.error('Failed to deploy to GitHub:', error);
    throw error;
  }
}

// New function to get GitHub config from environment or user input
async function getGitHubConfig(providedConfig?: Partial<GitHubConfig>): Promise<GitHubConfig | null> {
  // Try to get values from environment variables first
  const envToken = process.env.REACT_APP_GITHUB_TOKEN;
  const envUsername = process.env.REACT_APP_GITHUB_USERNAME;
  const envRepoName = process.env.REACT_APP_GITHUB_REPO_NAME;

  // If all required values are provided via environment or config, use them
  if ((envToken || providedConfig?.token) && 
      (envUsername || providedConfig?.username)) {
    return {
      token: providedConfig?.token || envToken!,
      username: providedConfig?.username || envUsername!,
      repoName: providedConfig?.repoName || envRepoName || `webcontainer-project-${Date.now()}`,
    };
  }

  // Otherwise, show the modal for missing values
  return showGitHubConfigModal({
    token: envToken,
    username: envUsername,
    repoName: envRepoName,
  });
}

// Modified function to show GitHub config modal with pre-filled values
function showGitHubConfigModal(prefilledValues?: Partial<GitHubConfig>): Promise<GitHubConfig | null> {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 90%;
    `;

    modalContent.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333;">Deploy to GitHub</h3>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #555;">GitHub Token:</label>
        <input type="password" id="github-token" placeholder="ghp_..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" ${prefilledValues?.token ? 'disabled' : ''}>
        <small style="color: #666;">${prefilledValues?.token ? 'Token loaded from environment' : 'Create at: Settings → Developer settings → Personal access tokens'}</small>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #555;">Username:</label>
        <input type="text" id="github-username" placeholder="your-username" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" ${prefilledValues?.username ? 'disabled' : ''}>
        <small style="color: #666;">${prefilledValues?.username ? 'Username loaded from environment' : ''}</small>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #555;">Repository Name:</label>
        <input type="text" id="github-repo" placeholder="my-project" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="cancel-btn" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="deploy-btn" style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">Deploy</button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    const tokenInput = modalContent.querySelector('#github-token') as HTMLInputElement;
    const usernameInput = modalContent.querySelector('#github-username') as HTMLInputElement;
    const repoInput = modalContent.querySelector('#github-repo') as HTMLInputElement;
    const cancelBtn = modalContent.querySelector('#cancel-btn') as HTMLButtonElement;
    const deployBtn = modalContent.querySelector('#deploy-btn') as HTMLButtonElement;

    // Pre-fill values from environment or provided config
    if (prefilledValues?.token) {
      tokenInput.value = '••••••••••••••••'; // Show masked token
      tokenInput.style.color = '#999';
    }
    if (prefilledValues?.username) {
      usernameInput.value = prefilledValues.username;
      usernameInput.style.color = '#999';
    }
    
    // Pre-fill repo name with provided value or timestamp
    repoInput.value = prefilledValues?.repoName || `webcontainer-project-${Date.now()}`;

    cancelBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(null);
    };

    deployBtn.onclick = () => {
      const token = prefilledValues?.token || tokenInput.value.trim();
      const username = prefilledValues?.username || usernameInput.value.trim();
      const repoName = repoInput.value.trim();

      if (!token || !username || !repoName) {
        alert('Please fill in all fields');
        return;
      }

      document.body.removeChild(modal);
      resolve({ token, username, repoName });
    };

    // Focus the first non-disabled input
    if (!prefilledValues?.token) {
      tokenInput.focus();
    } else if (!prefilledValues?.username) {
      usernameInput.focus();
    } else {
      repoInput.focus();
    }
  });
}

// Type definition (add this if not already present)
interface GitHubConfig {
  token: string;
  username: string;
  repoName: string;
}

// Function to create and add GitHub deploy button to the page
export function createGitHubDeployButton() {
  if (typeof document === 'undefined') return;
  
  // Remove existing button if it exists
  const existingButton = document.getElementById('github-deploy-btn');
  if (existingButton) {
    existingButton.remove();
  }
  
  const button = document.createElement('button');
  button.id = 'github-deploy-btn';
  button.textContent = '🚀 Deploy to GitHub';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 180px;
    z-index: 9999;
    padding: 12px 16px;
    background: linear-gradient(135deg, #24292e 0%, #586069 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  `;
  
  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
  };
  
  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
  };
  
  button.onclick = async () => {
    try {
      // Show configuration modal
      const config = await showGitHubConfigModal();
      if (!config) return; // User cancelled
      
      button.textContent = '⏳ Deploying...';
      button.disabled = true;
      
      const container = await webcontainer;
      const repo = await deployToGitHub(container, config);
      
      button.textContent = '✅ Deployed!';
      
      // Show success message with link
      setTimeout(() => {
        if (confirm(`Successfully deployed to GitHub!\n\nOpen repository: ${repo.html_url}?`)) {
          window.open(repo.html_url, '_blank');
        }
        button.textContent = '🚀 Deploy to GitHub';
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('GitHub deploy failed:', error);
      button.textContent = '❌ Failed';
      alert(`Deployment failed: ${error.message}`);
      setTimeout(() => {
        button.textContent = '🚀 Deploy to GitHub';
        button.disabled = false;
      }, 2000);
    }
  };
  
  document.body.appendChild(button);
  return button;
}

// Function to create and add deploy button to the page (your existing function)
export function createDeployButton() {
  if (typeof document === 'undefined') return;
  
  // Remove existing button if it exists
  const existingButton = document.getElementById('webcontainer-deploy-btn');
  if (existingButton) {
    existingButton.remove();
  }
  
  const button = document.createElement('button');
  button.id = 'webcontainer-deploy-btn';
  button.textContent = '📦 Download Project';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  `;
  
  button.onmouseover = () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
  };
  
  button.onmouseout = () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
  };
  
  button.onclick = async () => {
    try {
      button.textContent = '⏳ Extracting...';
      button.disabled = true;
      
      const container = await webcontainer;
      await extractAndDownloadFiles(container);
      
      button.textContent = '✅ Downloaded!';
      setTimeout(() => {
        button.textContent = '📦 Download Project';
        button.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Deploy failed:', error);
      button.textContent = '❌ Failed';
      setTimeout(() => {
        button.textContent = '📦 Download Project';
        button.disabled = false;
      }, 2000);
    }
  };
  
  document.body.appendChild(button);
  return button;
}

// Auto-create both buttons when WebContainer is loaded
if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({ workdirName: WORK_DIR_NAME });
      })
      .then((webcontainer) => {
        webcontainerContext.loaded = true;
        
        // Create both buttons once WebContainer is ready
        setTimeout(() => {
          createDeployButton();
          createGitHubDeployButton();
        }, 1000);
        
        return webcontainer;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}

// Utility function to manually trigger download (can be called from other components)
export async function downloadProject() {
  const container = await webcontainer;
  return extractAndDownloadFiles(container);
}

// Utility function to manually trigger GitHub deployment
export async function deployProjectToGitHub(config: GitHubConfig) {
  const container = await webcontainer;
  return deployToGitHub(container, config);
}












// import { WebContainer } from '@webcontainer/api';
// import { WORK_DIR_NAME } from '~/utils/constants';
// import path from 'node:path';
// import JSZip from 'jszip';

// interface WebContainerContext {
//   loaded: boolean;
// }

// export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
//   loaded: false,
// };

// if (import.meta.hot) {
//   import.meta.hot.data.webcontainerContext = webcontainerContext;
// }

// export let webcontainer: Promise<WebContainer> = new Promise(() => {
//   // noop for ssr
// });

// // GitHub API configuration
// interface GitHubConfig {
//   token: string;
//   username: string;
//   repoName: string;
// }

// // Helper function to download a blob
// function downloadBlob(blob: Blob, filename: string) {
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   document.body.removeChild(a);
//   URL.revokeObjectURL(url);
// }

// // Function to check if a file should be excluded from GitHub deployment
// function shouldExcludeFromGitHub(filePath: string): boolean {
//   const excludePatterns = [
//     'node_modules',
//     '.git',
//     '.DS_Store',
//     'Thumbs.db',
//     '*.log',
//     '.env',
//     '.env.local',
//     '.env.production',
//     'dist',
//     'build',
//     '.next',
//     '.nuxt',
//     'coverage',
//     '.nyc_output',
//     '.cache',
//     '.temp',
//     '.tmp'
//   ];
  
//   return excludePatterns.some(pattern => {
//     if (pattern.includes('*')) {
//       const regex = new RegExp(pattern.replace('*', '.*'));
//       return regex.test(filePath);
//     }
//     return filePath.includes(pattern);
//   });
// }

// // Function to extract all files from WebContainer (your existing logic)
// export async function extractFiles(container: WebContainer, forGitHub: boolean = false): Promise<Map<string, string | Uint8Array>> {
//   try {
//     console.log('Starting file extraction...');
    
//     // Recursively collect all file paths
//     const allFilePaths = [];
//     async function collectFiles(dirPath) {
//       const entries = await container.fs.readdir(dirPath, { withFileTypes: true });
//       for (const entry of entries) {
//         const fullPath = path.join(dirPath, entry.name);
//         if (entry.isFile()) {
//           // Filter out large/unnecessary files for GitHub deployment
//           if (forGitHub && shouldExcludeFromGitHub(fullPath)) {
//             console.log(`Skipping file for GitHub: ${fullPath}`);
//             continue;
//           }
//           allFilePaths.push(fullPath);
//         } else if (entry.isDirectory()) {
//           // Skip excluded directories entirely for GitHub
//           if (forGitHub && shouldExcludeFromGitHub(fullPath)) {
//             console.log(`Skipping directory for GitHub: ${fullPath}`);
//             continue;
//           }
//           await collectFiles(fullPath);
//         }
//       }
//     }
//     await collectFiles(process.cwd());
    
//     console.log(`Found ${allFilePaths.length} files to process`);
    
//     // Create a map to store file contents
//     const fileContents = new Map<string, string | Uint8Array>();

//     // Read all files
//     for (const file_path of allFilePaths) {    
//       console.log(`Processing File Path: ${file_path}`);
//       if (!file_path) continue;

//       try {
//         const content = await container.fs.readFile(file_path, 'utf8');
        
//         // Check file size for GitHub (GitHub has a 100MB limit per file, but let's be conservative)
//         if (forGitHub && typeof content === 'string' && content.length > 1000000) { // 1MB limit for text files
//           console.warn(`Skipping large file for GitHub: ${file_path} (${content.length} chars)`);
//           continue;
//         }
        
//         fileContents.set(file_path, content);
//         console.log(`Read text file: ${file_path} (${content.length} chars)`);
//       } catch (error) {
//         // Try reading as binary if UTF8 fails
//         try {
//           const content = await container.fs.readFile(file_path);
          
//           // Check binary file size for GitHub
//           if (forGitHub && content.length > 1000000) { // 1MB limit for binary files
//             console.warn(`Skipping large binary file for GitHub: ${file_path} (${content.length} bytes)`);
//             continue;
//           }
          
//           fileContents.set(file_path, content);
//           console.log(`Read binary file: ${file_path} (${content.length} bytes)`);
//         } catch (binaryError) {
//           console.warn(`Failed to read file: ${file_path}`, binaryError);
//         }
//       }
//     }
    
//     console.log(`Successfully extracted ${fileContents.size} files`);
//     return fileContents;
    
//   } catch (error) {
//     console.error('Failed to extract files:', error);
//     throw error;
//   }
// }

// // Function to extract all files from WebContainer and download as ZIP (your existing function)
// export async function extractAndDownloadFiles(container: WebContainer) {
//   const fileContents = await extractFiles(container, false);
  
//   const zip = new JSZip();
  
//   fileContents.forEach((content, path) => {
//     // Remove work directory prefix and leading slash for ZIP structure
//     const cleanPath = path.replace(`/${WORK_DIR_NAME}/`, '').replace(/^\//, '');
//     zip.file(cleanPath, content);
//   });
  
//   // Generate ZIP and download
//   const zipBlob = await zip.generateAsync({ type: 'blob' });
//   downloadBlob(zipBlob, 'bolt-project.zip');
  
//   return fileContents;
// }

// // Function to create GitHub repository and upload files
// export async function deployToGitHub(container: WebContainer, config: GitHubConfig) {
//   try {
//     console.log('Starting GitHub deployment...');
    
//     // Extract files using existing logic, but filter for GitHub
//     const fileContents = await extractFiles(container, true);
    
//     console.log(`Deploying ${fileContents.size} files to GitHub...`);
    
//     // Create repository
//     const createRepoResponse = await fetch('https://api.github.com/user/repos', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${config.token}`,
//         'Accept': 'application/vnd.github.v3+json',
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         name: config.repoName,
//         description: 'Project deployed from WebContainer',
//         private: false,
//         auto_init: true,
//       }),
//     });

//     if (!createRepoResponse.ok) {
//       const error = await createRepoResponse.json();
//       throw new Error(`Failed to create repository: ${error.message}`);
//     }

//     const repo = await createRepoResponse.json();
//     console.log(`Repository created: ${repo.html_url}`);

//     // Wait a moment for repo to be fully initialized
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     // Get the main branch SHA (needed for creating commits)
//     const branchResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repoName}/git/refs/heads/main`, {
//       headers: {
//         'Authorization': `Bearer ${config.token}`,
//         'Accept': 'application/vnd.github.v3+json',
//       },
//     });

//     if (!branchResponse.ok) {
//       throw new Error(`Failed to get branch info: ${branchResponse.statusText}`);
//     }

//     const branchData = await branchResponse.json();
//     const baseSha = branchData.object.sha;

//     // Create tree with all files
//     const tree = [];
//     let processedFiles = 0;
    
//     for (const [filePath, content] of fileContents) {
//       const cleanPath = filePath.replace(`/${WORK_DIR_NAME}/`, '').replace(/^\//, '');
      
//       if (!cleanPath || cleanPath === '') {
//         console.warn(`Skipping file with empty path: ${filePath}`);
//         continue;
//       }

//       console.log(`Processing file for GitHub: ${cleanPath}`);
      
//       try {
//         // Convert content to base64 for GitHub API
//         let base64Content: string;
//         if (typeof content === 'string') {
//           base64Content = btoa(unescape(encodeURIComponent(content)));
//         } else {
//           // For binary content
//           const binaryString = Array.from(content, byte => String.fromCharCode(byte)).join('');
//           base64Content = btoa(binaryString);
//         }

//         tree.push({
//           path: cleanPath,
//           mode: '100644',
//           type: 'blob',
//           content: base64Content,
//           encoding: 'base64',
//         });
        
//         processedFiles++;
        
//         // GitHub API has limits, so let's batch if we have too many files
//         if (tree.length > 100) {
//           console.warn('Too many files for single commit, truncating to first 100 files');
//           break;
//         }
        
//       } catch (error) {
//         console.warn(`Failed to process file ${cleanPath}:`, error);
//       }
//     }

//     console.log(`Created tree with ${tree.length} files`);

//     if (tree.length === 0) {
//       throw new Error('No files to deploy - all files may have been filtered out or failed to process');
//     }

//     // Create tree
//     const treeResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repoName}/git/trees`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${config.token}`,
//         'Accept': 'application/vnd.github.v3+json',
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         tree,
//         base_tree: baseSha,
//       }),
//     });

//     if (!treeResponse.ok) {
//       const error = await treeResponse.json();
//       throw new Error(`Failed to create tree: ${error.message}`);
//     }

//     const treeData = await treeResponse.json();

//     // Create commit
//     const commitResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repoName}/git/commits`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${config.token}`,
//         'Accept': 'application/vnd.github.v3+json',
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         message: `Deploy project from WebContainer (${processedFiles} files)`,
//         tree: treeData.sha,
//         parents: [baseSha],
//       }),
//     });

//     if (!commitResponse.ok) {
//       const error = await commitResponse.json();
//       throw new Error(`Failed to create commit: ${error.message}`);
//     }

//     const commitData = await commitResponse.json();

//     // Update main branch to point to new commit
//     const updateRefResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repoName}/git/refs/heads/main`, {
//       method: 'PATCH',
//       headers: {
//         'Authorization': `Bearer ${config.token}`,
//         'Accept': 'application/vnd.github.v3+json',
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         sha: commitData.sha,
//       }),
//     });

//     if (!updateRefResponse.ok) {
//       const error = await updateRefResponse.json();
//       throw new Error(`Failed to update branch: ${error.message}`);
//     }

//     console.log(`Successfully deployed ${processedFiles} files to GitHub: ${repo.html_url}`);
//     return repo;

//   } catch (error) {
//     console.error('Failed to deploy to GitHub:', error);
//     throw error;
//   }
// }

// // Function to show GitHub config modal
// function showGitHubConfigModal(): Promise<GitHubConfig | null> {
//   return new Promise((resolve) => {
//     const modal = document.createElement('div');
//     modal.style.cssText = `
//       position: fixed;
//       top: 0;
//       left: 0;
//       width: 100%;
//       height: 100%;
//       background: rgba(0, 0, 0, 0.5);
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       z-index: 10000;
//     `;

//     const modalContent = document.createElement('div');
//     modalContent.style.cssText = `
//       background: white;
//       padding: 24px;
//       border-radius: 12px;
//       box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
//       max-width: 400px;
//       width: 90%;
//     `;

//     modalContent.innerHTML = `
//       <h3 style="margin: 0 0 16px 0; color: #333;">Deploy to GitHub</h3>
//       <div style="margin-bottom: 12px;">
//         <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #555;">GitHub Token:</label>
//         <input type="password" id="github-token" placeholder="ghp_..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
//         <small style="color: #666;">Create at: Settings → Developer settings → Personal access tokens</small>
//       </div>
//       <div style="margin-bottom: 12px;">
//         <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #555;">Username:</label>
//         <input type="text" id="github-username" placeholder="your-username" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
//       </div>
//       <div style="margin-bottom: 16px;">
//         <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #555;">Repository Name:</label>
//         <input type="text" id="github-repo" placeholder="my-project" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
//       </div>
//       <div style="display: flex; gap: 8px; justify-content: flex-end;">
//         <button id="cancel-btn" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
//         <button id="deploy-btn" style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">Deploy</button>
//       </div>
//     `;

//     modal.appendChild(modalContent);
//     document.body.appendChild(modal);

//     const tokenInput = modalContent.querySelector('#github-token') as HTMLInputElement;
//     const usernameInput = modalContent.querySelector('#github-username') as HTMLInputElement;
//     const repoInput = modalContent.querySelector('#github-repo') as HTMLInputElement;
//     const cancelBtn = modalContent.querySelector('#cancel-btn') as HTMLButtonElement;
//     const deployBtn = modalContent.querySelector('#deploy-btn') as HTMLButtonElement;

//     // Pre-fill repo name with timestamp
//     repoInput.value = `webcontainer-project-${Date.now()}`;

//     cancelBtn.onclick = () => {
//       document.body.removeChild(modal);
//       resolve(null);
//     };

//     deployBtn.onclick = () => {
//       const token = tokenInput.value.trim();
//       const username = usernameInput.value.trim();
//       const repoName = repoInput.value.trim();

//       if (!token || !username || !repoName) {
//         alert('Please fill in all fields');
//         return;
//       }

//       document.body.removeChild(modal);
//       resolve({ token, username, repoName });
//     };

//     // Focus first input
//     tokenInput.focus();
//   });
// }

// // Function to create and add GitHub deploy button to the page
// export function createGitHubDeployButton() {
//   if (typeof document === 'undefined') return;
  
//   // Remove existing button if it exists
//   const existingButton = document.getElementById('github-deploy-btn');
//   if (existingButton) {
//     existingButton.remove();
//   }
  
//   const button = document.createElement('button');
//   button.id = 'github-deploy-btn';
//   button.textContent = '🚀 Deploy to GitHub';
//   button.style.cssText = `
//     position: fixed;
//     top: 20px;
//     right: 180px;
//     z-index: 9999;
//     padding: 12px 16px;
//     background: linear-gradient(135deg, #24292e 0%, #586069 100%);
//     color: white;
//     border: none;
//     border-radius: 8px;
//     cursor: pointer;
//     font-weight: 600;
//     font-size: 14px;
//     box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
//     transition: all 0.3s ease;
//   `;
  
//   button.onmouseover = () => {
//     button.style.transform = 'translateY(-2px)';
//     button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
//   };
  
//   button.onmouseout = () => {
//     button.style.transform = 'translateY(0)';
//     button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
//   };
  
//   button.onclick = async () => {
//     try {
//       // Show configuration modal
//       const config = await showGitHubConfigModal();
//       if (!config) return; // User cancelled
      
//       button.textContent = '⏳ Deploying...';
//       button.disabled = true;
      
//       const container = await webcontainer;
//       const repo = await deployToGitHub(container, config);
      
//       button.textContent = '✅ Deployed!';
      
//       // Show success message with link
//       setTimeout(() => {
//         if (confirm(`Successfully deployed to GitHub!\n\nOpen repository: ${repo.html_url}?`)) {
//           window.open(repo.html_url, '_blank');
//         }
//         button.textContent = '🚀 Deploy to GitHub';
//         button.disabled = false;
//       }, 2000);
      
//     } catch (error) {
//       console.error('GitHub deploy failed:', error);
//       button.textContent = '❌ Failed';
//       alert(`Deployment failed: ${error.message}`);
//       setTimeout(() => {
//         button.textContent = '🚀 Deploy to GitHub';
//         button.disabled = false;
//       }, 2000);
//     }
//   };
  
//   document.body.appendChild(button);
//   return button;
// }

// // Function to create and add deploy button to the page (your existing function)
// export function createDeployButton() {
//   if (typeof document === 'undefined') return;
  
//   // Remove existing button if it exists
//   const existingButton = document.getElementById('webcontainer-deploy-btn');
//   if (existingButton) {
//     existingButton.remove();
//   }
  
//   const button = document.createElement('button');
//   button.id = 'webcontainer-deploy-btn';
//   button.textContent = '📦 Download Project';
//   button.style.cssText = `
//     position: fixed;
//     top: 20px;
//     right: 20px;
//     z-index: 9999;
//     padding: 12px 16px;
//     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//     color: white;
//     border: none;
//     border-radius: 8px;
//     cursor: pointer;
//     font-weight: 600;
//     font-size: 14px;
//     box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
//     transition: all 0.3s ease;
//   `;
  
//   button.onmouseover = () => {
//     button.style.transform = 'translateY(-2px)';
//     button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
//   };
  
//   button.onmouseout = () => {
//     button.style.transform = 'translateY(0)';
//     button.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
//   };
  
//   button.onclick = async () => {
//     try {
//       button.textContent = '⏳ Extracting...';
//       button.disabled = true;
      
//       const container = await webcontainer;
//       await extractAndDownloadFiles(container);
      
//       button.textContent = '✅ Downloaded!';
//       setTimeout(() => {
//         button.textContent = '📦 Download Project';
//         button.disabled = false;
//       }, 2000);
      
//     } catch (error) {
//       console.error('Deploy failed:', error);
//       button.textContent = '❌ Failed';
//       setTimeout(() => {
//         button.textContent = '📦 Download Project';
//         button.disabled = false;
//       }, 2000);
//     }
//   };
  
//   document.body.appendChild(button);
//   return button;
// }

// // Auto-create both buttons when WebContainer is loaded
// if (!import.meta.env.SSR) {
//   webcontainer =
//     import.meta.hot?.data.webcontainer ??
//     Promise.resolve()
//       .then(() => {
//         return WebContainer.boot({ workdirName: WORK_DIR_NAME });
//       })
//       .then((webcontainer) => {
//         webcontainerContext.loaded = true;
        
//         // Create both buttons once WebContainer is ready
//         setTimeout(() => {
//           createDeployButton();
//           createGitHubDeployButton();
//         }, 1000);
        
//         return webcontainer;
//       });

//   if (import.meta.hot) {
//     import.meta.hot.data.webcontainer = webcontainer;
//   }
// }

// // Utility function to manually trigger download (can be called from other components)
// export async function downloadProject() {
//   const container = await webcontainer;
//   return extractAndDownloadFiles(container);
// }

// // Utility function to manually trigger GitHub deployment
// export async function deployProjectToGitHub(config: GitHubConfig) {
//   const container = await webcontainer;
//   return deployToGitHub(container, config);
// }


