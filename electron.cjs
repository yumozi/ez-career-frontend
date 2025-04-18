const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), 
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  // Load the index.html of the app.
  if (isDev) {
    // Point to the Vite dev server URL in development
    // Make sure the port matches your Vite config (default is 5173)
    mainWindow.loadURL('http://localhost:8080'); 
    // Uncomment this line if you want to manually open dev tools in dev mode
    // mainWindow.webContents.openDevTools();
  } else {
    // Load the built index.html file for production
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

// IPC Handlers (typically added after app.whenReady)
function setupIpcHandlers() {
  // Handle 'notify' message from renderer
  ipcMain.on('notify', (event, { title, body }) => {
    console.log('Main: Received notification request', { title, body });
    new Notification({ title, body }).show();
  });

  // Handle 'get-app-version' request from renderer
  ipcMain.handle('get-app-version', (event) => {
    console.log('Main: Received version request');
    return app.getVersion();
  });

  // Example: Send a message from Main to Renderer periodically
  let counter = 0;
  setInterval(() => {
    // Need to check if mainWindow still exists
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      // console.log('Main: Sending update-counter', counter);
      windows[0].webContents.send('update-counter', counter++);
    } else {
      // console.log('Main: No window to send update-counter to.');
    }
  }, 5000); // Send every 5 seconds

  console.log('Main: IPC Handlers set up.');
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers(); // <-- Call the setup function

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here. 