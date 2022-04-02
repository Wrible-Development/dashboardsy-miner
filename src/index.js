const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const si = require('systeminformation');
const fs = require('fs');
const { execSync, spawn } = require('child_process')
const axios = require('axios');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

let minerIsRunning = false;
let minerProcess;

const configFile = path.join(app.getPath('userData'), 'config.json');


const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (process.env.NODE_ENV == 'development') {
    try {
      require('electron-reloader')(module)
    } catch (_) { }
  }

  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify({
      configs: []
    }));
  }

  const win = mainWindow;

  ipcMain.handle('get-configs', async () => {
    const configs = await fs.readFileSync(configFile, 'utf8');
    return JSON.parse(configs);
  })
  ipcMain.on('add-config', async (event, config) => {
    const configs = await fs.readFileSync(configFile, 'utf8');
    const configsJson = JSON.parse(configs);
    configsJson.configs.push(config);
    await fs.writeFileSync(configFile, JSON.stringify(configsJson));
    return true;
  })
  ipcMain.on('remove-config', async (event, config) => {
    const configs = await fs.readFileSync(configFile, 'utf8');
    const configsJson = JSON.parse(configs);
    configsJson.configs = configsJson.configs.filter(c => c.name !== config.name);
    await fs.writeFileSync(configFile, JSON.stringify(configsJson));
    return true;
  })
  ipcMain.handle('get-gpus', async () => {
    const gpus = await si.graphics();
    return gpus;
  })

  ipcMain.on('start-miner', async (event, config) => {
    const os = await process.platform;
    if (!fs.existsSync(path.join(app.getPath('userData'), 'miners'))) {
      await fs.mkdirSync(path.join(app.getPath('userData'), 'miners'));
    }
    const configs = await fs.readFileSync(configFile, 'utf8');
    const configJson = JSON.parse(configs);
    const configToUse = configJson.configs.find(c => c.name === config.config.name);
    switch (os) {
      case 'win32':
        const ifMinerExists = fs.existsSync(path.join((app.getPath('userData')), 'miners', 'xmrig.exe'));
        if (!ifMinerExists) {
          const jstoexec = "document.querySelector('#isMining').innerText = 'Downloading Miner';"
          await win.webContents.executeJavaScript(jstoexec)
          await download('https://github.com/Wrible-Development/dashboardsy-miner/releases/download/miners/xmrig.exe', {
            directory: path.join(app.getPath('userData'), 'miners'),
            filename: 'xmrig.exe'
          })
          await download('https://github.com/Wrible-Development/dashboardsy-miner/releases/download/miners/WinRing0x64.sys', {
            directory: path.join(app.getPath('userData'), 'miners'),
            filename: 'WinRing0x64.sys'
          })
          await download('https://github.com/Wrible-Development/dashboardsy-miner/releases/download/miners/PhoenixMiner.exe', {
            directory: path.join(app.getPath('userData'), 'miners'),
            filename: 'PhoenixMiner.exe'
          })
          const jstoexec2 = "document.querySelector('#isMining').innerText = 'Finished downloading miner! Starting it now.';"
          await win.webContents.executeJavaScript(jstoexec2)
        }
      case 'linux':
        const ifMinerExists2 = fs.existsSync(path.join((app.getPath('userData')), 'miners', 'xmrig'));
        if (!ifMinerExists2) {
          const jstoexec = "document.querySelector('#isMining').innerText = 'Downloading Miner';"
          await win.webContents.executeJavaScript(jstoexec)
          await download('https://github.com/Wrible-Development/dashboardsy-miner/releases/download/miners/xmrig-linux', {
            directory: path.join(app.getPath('userData'), 'miners'),
            filename: 'xmrig'
          })
          await download('https://github.com/Wrible-Development/dashboardsy-miner/releases/download/miners/PhoenixMiner', {
            directory: path.join(app.getPath('userData'), 'miners'),
            filename: 'PhoenixMiner'
          })
          await execSync('chmod +x ' + path.join((app.getPath('userData')), 'miners', 'xmrig'))
          await execSync('chmod +x ' + path.join((app.getPath('userData')), 'miners', 'PhoenixMiner'))
          const jstoexec2 = "document.querySelector('#isMining').innerText = 'Finished downloading miner! Starting it now.';"
          await win.webContents.executeJavaScript(jstoexec2)
        }
        break;
      case 'darwin':
        const ifMinerExists3 = fs.existsSync(path.join((app.getPath('userData')), 'miners', 'xmrig'));
        if (!ifMinerExists3) {
          const jstoexec = "document.querySelector('#isMining').innerText = 'Downloading Miner';"
          await win.webContents.executeJavaScript(jstoexec)
          await download('https://github.com/Wrible-Development/dashboardsy-miner/releases/download/miners/xmrig-macos', {
            directory: path.join(app.getPath('userData'), 'miners'),
            filename: 'xmrig'
          })
          await execSync('chmod +x ' + path.join((app.getPath('userData')), 'miners', 'xmrig'))
          const jstoexec2 = "document.querySelector('#isMining').innerText = 'Finished downloading miner! Starting it now.';"
          await win.webContents.executeJavaScript(jstoexec2)
        }
        break;
      default:
        break;
    }
    if (config.type == "cpu") {
      switch (os) {
        case 'win32':
          minerProcess = spawn(path.join((app.getPath('userData')), 'miners', 'xmrig.exe'), [
            '-o', 'stratum+tcp://randomxmonero.eu-north.nicehash.com:3380', '--nicehash', '-u', `${configToUse.address}.${configToUse.username}`, '-p', 'x', '-a', 'rx'
          ]);
          minerIsRunning = true;
          break;
        case 'linux':
          minerProcess = spawn(path.join((app.getPath('userData')), 'miners', 'xmrig'), [
            '-o', 'stratum+tcp://randomxmonero.eu-north.nicehash.com:3380', '--nicehash', '-u', `${configToUse.address}.${configToUse.username}`, '-p', 'x', '-a', 'rx'
          ]);
          minerIsRunning = true;
          break;
        case 'darwin':
          minerProcess = spawn(path.join((app.getPath('userData')), 'miners', 'xmrig'), [
            '-o', 'stratum+tcp://randomxmonero.eu-north.nicehash.com:3380', '--nicehash', '-u', `${configToUse.address}.${configToUse.username}`, '-p', 'x', '-a', 'rx'
          ]);
          minerIsRunning = true;
          break;
        default:
          break;
      }
    } else if (config.type == "gpu") {
      switch (os) {
        case 'win32':
          minerProcess = spawn(path.join((app.getPath('userData')), 'miners', 'PhoenixMiner.exe'), [
            '-pool', 'stratum+tcp://daggerhashimoto.eu.nicehash.com:3353', '-wal', `${configToUse.address}.${configToUse.username}`, '-pass', 'x', '-proto', '4'
          ]);
          minerIsRunning = true;
          break;
        case 'linux':
          minerProcess = spawn(path.join((app.getPath('userData')), 'miners', 'PhoenixMiner'), [
            '-pool', 'stratum+tcp://daggerhashimoto.eu.nicehash.com:3353', '-wal', `${configToUse.address}.${configToUse.username}`, '-pass', 'x', '-proto', '4'
          ]);
          minerIsRunning = true;
          break;
        default:
          break;
      }
    }
  })

  ipcMain.handle('stop-miner', async () => {

    if (!minerIsRunning) return;
    await minerProcess.kill();
    minerIsRunning = false;
    const jstoexec = "document.querySelector('#isMining').innerText = 'Stopped Miner';"
    await win.webContents.executeJavaScript(jstoexec)
  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (minerIsRunning) {
      minerProcess.kill();
      minerIsRunning = false;
    }
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.


const download = async(fileUrl, options) => {
  console.log(`Downloading ${fileUrl}`);
  const downloadFolder = options.directory;
  const fileName = options.filename;
  const filePath = path.resolve(downloadFolder, fileName);
  const response = await axios({
    method: 'GET',
    url: fileUrl,
    responseType: 'stream',
  });
  const w = response.data.pipe(fs.createWriteStream(filePath));
  return new Promise((resolve, reject) => {
    w.on('finish', () => {
      resolve(filePath);
    });
    w.on('error', (err) => {
      reject(err);
    });
  });
}; 
