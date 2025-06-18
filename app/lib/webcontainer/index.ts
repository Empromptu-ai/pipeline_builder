
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

// Function to extract all files from WebContainer (your existing logic)
export async function extractFiles(container: WebContainer): Promise<Map<string, string | Uint8Array>> {
  try {
    console.log('Starting file extraction...');
    
    // Recursively collect all file paths
    const allFilePaths = [];
    async function collectFiles(dirPath) {
      const entries = await container.fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile()) {
          allFilePaths.push(fullPath);
        } else if (entry.isDirectory()) {
          await collectFiles(fullPath);
        }
      }
    }
    await collectFiles(process.cwd());
    
    // Create a map to store file contents
    const fileContents = new Map<string, string | Uint8Array>();

    // Read all files
    for (const file_path of allFilePaths) {    
      console.log(`Found File Path: ${file_path} `);
      if (!file_path) continue;

      try {
        const content = await container.fs.readFile(file_path, 'utf8');
        fileContents.set(file_path, content);
        console.log(`Read file Path: ${file_path}`);
      } catch (error) {
        // Try reading as binary if UTF8 fails
        try {
          const content = await container.fs.readFile(file_path);
          fileContents.set(file_path, content);
          console.log(`Read binary file: ${file_path}`);
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
  const fileContents = await extractFiles(container);
  
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
export async function deployToGitHub(container: WebContainer, config: GitHubConfig) {
  try {
    console.log('Starting GitHub deployment...');
    
    // Extract files using existing logic
    const fileContents = await extractFiles(container);
    
    // Create repository
    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.repoName,
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

    // Get the main branch SHA (needed for creating commits)
    const branchResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repoName}/git/refs/heads/main`, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const branchData = await branchResponse.json();
    const baseSha = branchData.object.sha;

    // Create tree with all files
    const tree = [];
    for (const [filePath, content] of fileContents) {
      const cleanPath = filePath.replace(`/${WORK_DIR_NAME}/`, '').replace(/^\//, '');
      
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
    }

    // Create tree
    const treeResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repoName}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tree,
        base_tree: baseSha,
      }),
    });

    const treeData = await treeResponse.json();

    // Create commit
    const commitResponse = await fetch(`https://api.github.com/repos/${config.username}/${config.repoName}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Deploy project from WebContainer',
        tree: treeData.sha,
        parents: [baseSha],
      }),
    });

    const commitData = await commitResponse.json();

    // Update main branch to point to new commit
    await fetch(`https://api.github.com/repos/${config.username}/${config.repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: commitData.sha,
      }),
    });

    console.log(`Successfully deployed to GitHub: ${repo.html_url}`);
    return repo;

  } catch (error) {
    console.error('Failed to deploy to GitHub:', error);
    throw error;
  }
}

// Function to show GitHub config modal
function showGitHubConfigModal(): Promise<GitHubConfig | null> {
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
        <input type="password" id="github-token" placeholder="ghp_..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
        <small style="color: #666;">Create at: Settings → Developer settings → Personal access tokens</small>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #555;">Username:</label>
        <input type="text" id="github-username" placeholder="your-username" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
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

    // Pre-fill repo name with timestamp
    repoInput.value = `webcontainer-project-${Date.now()}`;

    cancelBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(null);
    };

    deployBtn.onclick = () => {
      const token = tokenInput.value.trim();
      const username = usernameInput.value.trim();
      const repoName = repoInput.value.trim();

      if (!token || !username || !repoName) {
        alert('Please fill in all fields');
        return;
      }

      document.body.removeChild(modal);
      resolve({ token, username, repoName });
    };

    // Focus first input
    tokenInput.focus();
  });
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

// // Function to extract all files from WebContainer and download as ZIP
// export async function extractAndDownloadFiles(container: WebContainer) {
//   try {
//     console.log('Starting file extraction...');
    
    
    
    
//     // // Get all files recursively from the work directory
//     // const files = await container.fs.readdir(process.cwd(), { recursive: true, withFileTypes: true });
//     // console.log(`Found files: ${files} `);
//     // // Filter out directories, keep only files
//     // const fileList = files.filter(file => file.isFile());
//     // console.log(`Found ${fileList.length} files to extract`);
    
//     // // Create a map to store file contents
//     // const fileContents = new Map<string, string | Uint8Array>();
    
//     // // Read all files
//     // for (const file of fileList) {
//     //   console.log(`Found File: ${file} `);
//     //   console.log(`Found File Name: ${file.name} `);
//     //   const file_path = path.join(process.cwd(), file.name);



//   // Recursively collect all file paths
//   const allFilePaths = [];
//   async function collectFiles(dirPath) {
//     const entries = await container.fs.readdir(dirPath, { withFileTypes: true });
//     for (const entry of entries) {
//       const fullPath = path.join(dirPath, entry.name);
//       if (entry.isFile()) {
//         allFilePaths.push(fullPath);
//       } else if (entry.isDirectory()) {
//         await collectFiles(fullPath);
//       }
//     }
//   }
//   await collectFiles(process.cwd());
//   // Create a map to store file contents
//   const fileContents = new Map<string, string | Uint8Array>();

//   // Read all files
//   for (const file_path of allFilePaths) {    
//       // Use the file's parentPath + name to get full path
//       // const file_path = file.parentPath ? path.join(file.parentPath, file.name) : file.name;
//       console.log(`Found File Path: ${file_path} `);
//       if (!file_path) continue; // Skip if path is undefined

//       try {
//         const content = await container.fs.readFile(file_path, 'utf8');
//         fileContents.set(file_path, content);
//         console.log(`Read file Path: ${file_path}`);
//       } catch (error) {
//         // Try reading as binary if UTF8 fails
//         try {
//           const content = await container.fs.readFile(file_path);
//           fileContents.set(file_path, content);

//           console.log(`Read binary file: ${file_path}`);
//         } catch (binaryError) {
//           console.warn(`Failed to read file: ${file_path}`, binaryError);
//         }
//       }
//     }
    
//     // Use JSZip if available, otherwise download individual files
//     // if (typeof window !== 'undefined') {      // } && (window as any).JSZip) {
//     const zip = new JSZip();
    
//     fileContents.forEach((content, path) => {
//       // Remove work directory prefix and leading slash for ZIP structure
//       const cleanPath = path.replace(`/${WORK_DIR_NAME}/`, '').replace(/^\//, '');
//       zip.file(cleanPath, content);
//     });
    
//     // Generate ZIP and download
//     const zipBlob = await zip.generateAsync({ type: 'blob' });
//     downloadBlob(zipBlob, 'bolt-project.zip');
      
//     // } else {
//     //   // Fallback: download individual files
//     //   console.warn('JSZip not available, downloading individual files');
//     //   fileContents.forEach((content, path) => {
//     //     const filename = path.split('/').pop() || 'file';
//     //     const blob = new Blob([content], { type: 'text/plain' });
//     //     downloadBlob(blob, filename);
//     //   });
//     // }
    
//     console.log(`Successfully extracted ${fileContents.size} files`);
//     return fileContents;
    
//   } catch (error) {
//     console.error('Failed to extract files:', error);
//     throw error;
//   }
// }

// // Function to create and add deploy button to the page
// export function createDeployButton() {
//   // if (typeof window === 'undefined') return; // SSR check
//   if (typeof document === 'undefined') return; // Better check for browser
  
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

// // Auto-create deploy button when WebContainer is loaded
// if (!import.meta.env.SSR) {
//   webcontainer =
//     import.meta.hot?.data.webcontainer ??
//     Promise.resolve()
//       .then(() => {
//         return WebContainer.boot({ workdirName: WORK_DIR_NAME });
//       })
//       .then((webcontainer) => {
//         webcontainerContext.loaded = true;
        
//         // Create deploy button once WebContainer is ready
//         setTimeout(() => {
//           createDeployButton();
//         }, 1000); // Small delay to ensure DOM is ready
        
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


