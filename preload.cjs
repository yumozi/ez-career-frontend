const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded.');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer to Main (one-way)
  sendNotification: (title, body) => {
    console.log('Preload: Sending notification via IPC');
    ipcRenderer.send('notify', { title, body });
  },

  // Renderer to Main (two-way)
  getVersion: () => {
    console.log('Preload: Requesting app version via IPC');
    return ipcRenderer.invoke('get-app-version');
  },

  // Main to Renderer
  onUpdateCounter: (callback) => {
    console.log('Preload: Setting up listener for update-counter');
    // Deliberately strip event as it includes `sender`
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('update-counter', subscription);

    // Return a cleanup function to remove the listener
    return () => {
      console.log('Preload: Cleaning up listener for update-counter');
      ipcRenderer.removeListener('update-counter', subscription);
    };
  },
  // You can expose other Node.js modules or custom functions here safely
  // For example:
  // nodeVersion: () => process.versions.node,
});

console.log('electronAPI exposed on window object.'); 