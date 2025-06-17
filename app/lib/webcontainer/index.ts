
import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';

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

// Function to extract all files from WebContainer and download as ZIP
export async function extractAndDownloadFiles(container: WebContainer) {
  try {
    console.log('Starting file extraction...');
    
    // Get all files recursively from the work directory
    // const files = await container.fs.readdir(`/${WORK_DIR_NAME}`, { recursive: true, withFileTypes: true });
    // const files = await container.fs.readdir('/', { recursive: true, withFileTypes: true });
    // const files = await container.fs.readdir('/home/project', { recursive: true, withFileTypes: true });
    // const files = await container.fs.readdir('.', { recursive: true, withFileTypes: true });
    const files = await container.fs.readdir(process.cwd(), { recursive: true, withFileTypes: true });
    // Filter out directories, keep only files
    // const fileList = files.filter(file => file.isFile());
    // Filter out directories, keep only files, and exclude undefined paths
    const fileList = files.filter(file => file.isFile() && file.path);
    console.log(`Found ${fileList.length} files to extract`);
    
    // Create a map to store file contents
    const fileContents = new Map<string, string | Uint8Array>();
    
    // Read all files
    for (const file of fileList) {
      if (!file.path) continue; // Skip if path is undefined
      try {
        const content = await container.fs.readFile(file.path, 'utf8');
        fileContents.set(file.path, content);
        console.log(`Read file: ${file.path}`);
      } catch (error) {
        // Try reading as binary if UTF8 fails
        try {
          const content = await container.fs.readFile(file.path);
          fileContents.set(file.path, content);

          console.log(`Read binary file: ${file.path}`);
        } catch (binaryError) {
          console.warn(`Failed to read file: ${file.path}`, binaryError);
        }
      }
    }
    
    // Use JSZip if available, otherwise download individual files
    if (typeof window !== 'undefined' && (window as any).JSZip) {
      const JSZip = (window as any).JSZip;
      const zip = new JSZip();
      
      fileContents.forEach((content, path) => {
        // Remove work directory prefix and leading slash for ZIP structure
        const cleanPath = path.replace(`/${WORK_DIR_NAME}/`, '').replace(/^\//, '');
        zip.file(cleanPath, content);
      });
      
      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'bolt-project.zip');
      
    } else {
      // Fallback: download individual files
      console.warn('JSZip not available, downloading individual files');
      fileContents.forEach((content, path) => {
        const filename = path.split('/').pop() || 'file';
        const blob = new Blob([content], { type: 'text/plain' });
        downloadBlob(blob, filename);
      });
    }
    
    console.log(`Successfully extracted ${fileContents.size} files`);
    return fileContents;
    
  } catch (error) {
    console.error('Failed to extract files:', error);
    throw error;
  }
}

// Function to create and add deploy button to the page
export function createDeployButton() {
  if (typeof window === 'undefined') return; // SSR check
  
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

// Auto-create deploy button when WebContainer is loaded
if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({ workdirName: WORK_DIR_NAME });
      })
      .then((webcontainer) => {
        webcontainerContext.loaded = true;
        
        // Create deploy button once WebContainer is ready
        setTimeout(() => {
          createDeployButton();
        }, 1000); // Small delay to ensure DOM is ready
        
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


















// import { WebContainer } from '@webcontainer/api';
// import { WORK_DIR_NAME } from '~/utils/constants';

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

// if (!import.meta.env.SSR) {
//   webcontainer =
//     import.meta.hot?.data.webcontainer ??
//     Promise.resolve()
//       .then(() => {
//         return WebContainer.boot({ workdirName: WORK_DIR_NAME });
//       })
//       .then((webcontainer) => {
//         webcontainerContext.loaded = true;
//         return webcontainer;
//       });

//   if (import.meta.hot) {
//     import.meta.hot.data.webcontainer = webcontainer;
//   }
// }
